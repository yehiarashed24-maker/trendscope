from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.schemas import (
    CustomRegionRequest,
    RasterStatsRequest,
    TrendAnalysisRequest,
    CorrelationRequest,
    AnomalyRequest,
    CombinedInvestigationRequest,
    AiExplainRequest,
)
from backend.services.geography_service import geography_service
from backend.services.nasa_engine import DATASET_CATALOG, nasa_engine
from backend.services.raster_service import raster_service
from backend.services.stats_engine import (
    get_enriched_dataset_meta,
    run_full_variable_analysis,
    run_combined_nile_delta_investigation,
    analyze_custom_csv_series,
)
from backend.services.ai_service import generate_ai_scientific_explanation
from backend.services.investigation_store import (
    init_db,
    list_investigations,
    get_investigation,
    save_investigation,
    delete_investigation,
)
from backend.services.report_generator import generate_scientific_pdf_report

NILE_DELTA_CENTER = {"lat": 30.85, "lng": 31.05}


def _validate_custom_region_or_422(raw_geom: Dict[str, Any], name: str = "Custom Nile Delta Area") -> Dict[str, Any]:
    try:
        res = geography_service.validate_and_clip_custom_geometry(raw_geom, name=name)
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "valid": False,
                "error": str(exc),
                "message": str(exc),
            },
        ) from exc

    orig_area = max(0.01, float(res.get("originalAreaKm2") or res.get("areaKm2") or 0.01))
    cov_pct = min(100.0, round((float(res["areaKm2"]) / orig_area) * 100.0, 1))
    res["clippedFeature"] = res["feature"]
    res["clippedCoveragePercent"] = cov_pct
    return res


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    # Pre-warm georeferenced Nile Delta GeoTIFF rasters (MODIS NDVI 250m & MOD11C3 LST Day/Night)
    try:
        raster_service.ensure_geotiff("ndvi")
        raster_service.ensure_geotiff("lst", lst_mode="day")
        raster_service.ensure_geotiff("lst", lst_mode="night")
    except Exception:
        pass
    yield


app = FastAPI(
    title="TRENDSCOPE AI — NILE DELTA EDITION Scientific Backend",
    description=(
        "Full-Stack Geospatial, NASA Earth Observation (MOD13Q1.061 NDVI & MOD11C3.061 Day/Night LST), "
        "Statistical Trend & Grounded AI Interpretation API restricted to the Nile Delta, Egypt."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

ALLOWED_CORS_ORIGINS = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.hf\.space",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ==========================================
# 1. HEALTH & CREDENTIAL STATUS
# ==========================================
@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check() -> Dict[str, Any]:
    token_status = settings.inspect_earthdata_token()
    return {
        "status": "healthy",
        "project": "TRENDSCOPE AI — NILE DELTA EDITION",
        "studyArea": "Nile Delta, Egypt",
        "supportedVariables": ["ndvi", "lst"],
        "credentials": {
            "earthdataToken": {
                "configured": token_status.get("valid_format", False) and token_status.get("configured", False),
                "expired": token_status.get("expired", True),
                "uid": token_status.get("uid"),
                "expiresAt": token_status.get("expires_at"),
            },
            "geminiApi": {
                "configured": bool(settings.GEMINI_API_KEY),
                "model": settings.GEMINI_MODEL,
            },
            "nasaOpenApi": {
                "configured": bool(settings.NASA_API_KEY),
            },
        },
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


# ==========================================
# 2. GEOGRAPHY & NILE DELTA BOUNDARIES
# ==========================================
@app.get("/api/geography/nile-delta")
def get_nile_delta_boundary() -> Dict[str, Any]:
    return geography_service.get_boundary_geojson()


@app.get("/api/geography/subregions")
def get_nile_delta_subregions(format: str = Query("geojson", description="geojson or list")) -> Any:
    if format == "list":
        return {"subregions": geography_service.list_regions()}
    return geography_service.get_subregions_geojson()


@app.post("/api/geography/custom-region")
def validate_and_clip_custom_region(req: CustomRegionRequest) -> Dict[str, Any]:
    return _validate_custom_region_or_422(req.geometry, name=req.name or "Custom Nile Delta Area")


# ==========================================
# 3. NASA DATASETS & GRANULE DISCOVERY
# ==========================================
@app.get("/api/datasets/variables")
def get_supported_variables() -> Dict[str, Any]:
    variables = []
    for var_id in ("ndvi", "lst"):
        meta = get_enriched_dataset_meta(var_id)
        meta["id"] = meta["variableId"]
        variables.append(meta)
    return {
        "studyArea": "Nile Delta, Egypt",
        "bbox": nasa_engine.NILE_DELTA_BBOX,
        "center": NILE_DELTA_CENTER,
        "variables": variables,
    }


@app.get("/api/datasets/availability")
def dataset_availability() -> Dict[str, Any]:
    return nasa_engine.verify_services_status()


@app.get("/api/datasets/search")
def search_nasa_granules(
    variable: str = Query("ndvi", description="ndvi or lst"),
    start_date: str = Query("2024-01-01"),
    end_date: str = Query("2024-12-31"),
    limit: int = Query(15, ge=1, le=50),
) -> Dict[str, Any]:
    if variable not in ("ndvi", "lst"):
        raise HTTPException(status_code=400, detail="Only 'ndvi' and 'lst' are supported.")
    res = nasa_engine.search_cmr_granules(variable, start_date=start_date, end_date=end_date, page_size=limit)
    granules = res.get("granules", [])
    return {
        "variable": variable,
        "dataset": get_enriched_dataset_meta(variable),
        "studyArea": "Nile Delta, Egypt",
        "count": len(granules),
        "granules": granules,
    }


@app.post("/api/datasets/ingest")
def ingest_nile_delta_granule(payload: Dict[str, Any]) -> Dict[str, Any]:
    variable = payload.get("variableId", "ndvi")
    if variable not in ("ndvi", "lst"):
        raise HTTPException(status_code=400, detail="Only 'ndvi' and 'lst' are supported.")
    lst_mode = payload.get("lstMode") or payload.get("lst_mode") or "day"
    force_refresh = bool(payload.get("forceRefresh", False))
    tif_path, ingest_meta = raster_service.ensure_geotiff(variable, lst_mode=lst_mode, force_refresh=force_refresh)
    stats = raster_service.compute_regional_statistics(variable, "nile_delta", lst_mode=lst_mode)
    return {
        "status": "INGESTED",
        "variableId": variable,
        "lstMode": lst_mode if variable == "lst" else None,
        "geotiffPath": str(tif_path.name),
        "crs": "EPSG:4326",
        "spatialResolution": DATASET_CATALOG[variable]["spatialResolution"],
        "acquisition": {k: v for k, v in ingest_meta.items() if k not in ("values", "qualityFlags", "lats", "lons")},
        "rasterStatistics": stats,
    }


# ==========================================
# 4. RASTER STATISTICS, PIXEL INSPECT & TILES
# ==========================================
@app.post("/api/raster/statistics")
def get_raster_statistics(req: RasterStatsRequest) -> Dict[str, Any]:
    if req.customGeometry:
        _validate_custom_region_or_422(req.customGeometry)
    return raster_service.compute_regional_statistics(
        variable_id=req.variableId,
        region_id=req.regionId,
        custom_geom=req.customGeometry,
        lst_mode=req.lstMode,
    )


@app.get("/api/raster/inspect")
def inspect_raster_pixel(
    variable: str = Query("ndvi"),
    lat: float = Query(..., description="Latitude in EPSG:4326"),
    lng: float = Query(..., description="Longitude in EPSG:4326"),
    lst_mode: str = Query("day", description="day, night, or both for LST"),
    lstMode: Optional[str] = Query(None),
) -> Dict[str, Any]:
    if variable not in ("ndvi", "lst"):
        raise HTTPException(status_code=400, detail="Only 'ndvi' and 'lst' are supported.")
    mode = lstMode or lst_mode
    res = raster_service.inspect_pixel(variable, lat=lat, lng=lng, lst_mode=mode)
    res["insideNileDelta"] = bool(res.get("insideStudyArea", False))
    return res


@app.get("/api/raster/overlay/{variable_id}.png")
def get_raster_overlay_png(
    variable_id: str,
    lst_mode: str = Query("day"),
    lstMode: Optional[str] = Query(None),
) -> Response:
    if variable_id not in ("ndvi", "lst"):
        raise HTTPException(status_code=400, detail="Only 'ndvi' and 'lst' are supported.")
    mode = lstMode or lst_mode
    png_bytes, _bounds = raster_service.render_overlay_png(variable_id, lst_mode=mode)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/api/raster/tiles/{variable_id}/{z}/{x}/{y}")
def get_raster_xyz_tile(
    variable_id: str,
    z: int,
    x: int,
    y: str,
    lst_mode: str = Query("day"),
    lstMode: Optional[str] = Query(None),
) -> Response:
    if variable_id not in ("ndvi", "lst"):
        raise HTTPException(status_code=400, detail="Only 'ndvi' and 'lst' are supported.")
    if z < 0 or z > 18 or x < 0:
        raise HTTPException(status_code=400, detail="Tile coordinates (z, x) out of valid range.")
    try:
        y_clean = int(y.replace(".png", ""))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid tile y index.") from exc
    if y_clean < 0:
        raise HTTPException(status_code=400, detail="Tile coordinate y must be non-negative.")
    mode = lstMode or lst_mode
    png_bytes = raster_service.render_xyz_tile_png(variable_id, z=z, x=x, y=y_clean, lst_mode=mode)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ==========================================
# 5. STATISTICAL & ENVIRONMENTAL ANALYSIS
# ==========================================
@app.post("/api/analysis/ndvi")
def analyze_ndvi(payload: Dict[str, Any]) -> Dict[str, Any]:
    region_id = payload.get("regionId", "nile_delta")
    tr = payload.get("timeRange") or {}
    custom_geom = payload.get("customGeometry") or payload.get("customGeoJson")
    if custom_geom:
        _validate_custom_region_or_422(custom_geom)
    return run_full_variable_analysis(
        region_id=region_id,
        variable_id="ndvi",
        start_date=tr.get("startDate", "2000-02-18"),
        end_date=tr.get("endDate", "2024-12-31"),
        aggregation=tr.get("aggregation", "monthly"),
        custom_geometry=custom_geom,
    )


@app.post("/api/analysis/lst")
def analyze_lst(payload: Dict[str, Any]) -> Dict[str, Any]:
    region_id = payload.get("regionId", "nile_delta")
    tr = payload.get("timeRange") or {}
    lst_mode = payload.get("lstMode") or payload.get("lst_mode") or "day"
    custom_geom = payload.get("customGeometry") or payload.get("customGeoJson")
    if custom_geom:
        _validate_custom_region_or_422(custom_geom)
    return run_full_variable_analysis(
        region_id=region_id,
        variable_id="lst",
        start_date=tr.get("startDate", "2000-02-18"),
        end_date=tr.get("endDate", "2024-12-31"),
        aggregation=tr.get("aggregation", "monthly"),
        custom_geometry=custom_geom,
        lst_mode=lst_mode,
    )


@app.post("/api/analysis/upload-csv")
async def upload_and_analyze_csv(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    unit: Optional[str] = Form("Units"),
    variableName: Optional[str] = Form("Custom Observation"),
    startDate: Optional[str] = Form(None),
    endDate: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """
    Dynamically receives a user-uploaded CSV file, parses dates and values,
    computes Mann-Kendall trend, Theil-Sen slope, anomalies, and returns full TrendScope analysis.
    """
    if not file.filename or not file.filename.lower().endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .csv file.")
    try:
        content_bytes = await file.read()
        csv_text = content_bytes.decode("utf-8-sig", errors="ignore")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV file content: {exc}")

    display_title = title.strip() if title else file.filename.rsplit(".", 1)[0]
    try:
        analysis_result = analyze_custom_csv_series(
            csv_text=csv_text,
            title=display_title,
            unit=unit or "Units",
            variable_name=variableName or "Custom Observation",
            start_date=startDate,
            end_date=endDate,
        )
        return analysis_result
    except ValueError as val_err:
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal statistical processing error: {exc}")


@app.post("/api/analysis/trend")
@app.post("/api/v1/analysis/trend")
def analyze_trend(req: TrendAnalysisRequest) -> Dict[str, Any]:
    cfg = req.config
    var_id = cfg.variableId if cfg.variableId in ("ndvi", "lst") else "ndvi"
    if cfg.customGeoJson:
        _validate_custom_region_or_422(cfg.customGeoJson)
    return run_full_variable_analysis(
        region_id=cfg.regionId,
        variable_id=var_id,
        start_date=cfg.timeRange.startDate,
        end_date=cfg.timeRange.endDate,
        aggregation=cfg.timeRange.aggregation,
        custom_geometry=cfg.customGeoJson,
        lst_mode=cfg.lstMode,
    )


@app.post("/api/analysis/correlation")
@app.post("/api/v1/analysis/correlation")
def analyze_correlation(req: CorrelationRequest) -> Dict[str, Any]:
    if req.customGeometry:
        _validate_custom_region_or_422(req.customGeometry)
    combined = run_combined_nile_delta_investigation(
        region_id=req.regionId,
        start_date=req.timeRange.startDate,
        end_date=req.timeRange.endDate,
        custom_geometry=req.customGeometry,
        lst_mode=req.lstMode,
    )
    return combined["correlation"]


@app.post("/api/analysis/anomaly")
def analyze_anomalies(req: AnomalyRequest) -> Dict[str, Any]:
    tr = req.timeRange
    start_d = tr.startDate if tr else "2000-02-18"
    end_d = tr.endDate if tr else "2024-12-31"

    anomalies = []
    vars_to_check = [req.variableId] if req.variableId in ("ndvi", "lst") else ["ndvi", "lst"]
    for v_id in vars_to_check:
        res = run_full_variable_analysis(
            region_id=req.regionId,
            variable_id=v_id,
            start_date=start_d,
            end_date=end_d,
            aggregation="monthly",
            lst_mode=req.lstMode if v_id == "lst" else "day",
        )
        anomalies.extend(res["anomalies"])

    anomalies.sort(key=lambda a: abs(a["zScore"]), reverse=True)
    return {
        "regionId": req.regionId,
        "status": "VERIFIED",
        "count": len(anomalies),
        "anomalies": anomalies[:25],
    }


@app.post("/api/analysis/combined-investigation")
def combined_agricultural_investigation(req: CombinedInvestigationRequest) -> Dict[str, Any]:
    if req.customGeometry:
        _validate_custom_region_or_422(req.customGeometry)
    return run_combined_nile_delta_investigation(
        region_id=req.regionId,
        start_date=req.timeRange.startDate,
        end_date=req.timeRange.endDate,
        custom_geometry=req.customGeometry,
        lst_mode=req.lstMode,
    )


# ==========================================
# 6. INVESTIGATIONS PERSISTENCE (CRUD)
# ==========================================
@app.get("/api/investigations")
def get_all_investigations() -> Dict[str, Any]:
    items = list_investigations()
    return {"count": len(items), "investigations": items}


@app.get("/api/investigations/{inv_id}")
def get_single_investigation(inv_id: str) -> Dict[str, Any]:
    inv = get_investigation(inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation '{inv_id}' not found.")
    return inv


@app.post("/api/investigations")
def create_or_update_investigation(payload: Dict[str, Any]) -> Dict[str, Any]:
    return save_investigation(payload)


@app.delete("/api/investigations/{inv_id}")
def remove_investigation(inv_id: str) -> Dict[str, Any]:
    deleted = delete_investigation(inv_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Investigation '{inv_id}' not found.")
    return {"deleted": True, "id": inv_id}


# ==========================================
# 7. GROUNDED AI SCIENTIST
# ==========================================
@app.post("/api/ai-scientist/explain")
@app.post("/api/v1/ai-scientist/explain")
def explain_with_ai_scientist(req: AiExplainRequest) -> Dict[str, Any]:
    tr = req.timeRange
    start_d = tr.startDate if tr else "2000-02-18"
    end_d = tr.endDate if tr else "2024-12-31"
    return generate_ai_scientific_explanation(
        prompt=req.prompt,
        language=req.language,
        region_id=req.regionId,
        variable_id=req.variableId,
        start_date=start_d,
        end_date=end_d,
        context_metrics=req.contextMetrics,
        lst_mode=req.lstMode,
    )


# ==========================================
# 8. SCIENTIFIC PDF REPORT GENERATOR
# ==========================================
@app.post("/api/reports/generate")
@app.post("/api/v1/reports/export-pdf")
def export_scientific_pdf(payload: Dict[str, Any]) -> Response:
    pdf_bytes = generate_scientific_pdf_report(payload)
    custom_csv = payload.get("customCsvFileName")
    if custom_csv:
        safe_stem = "".join(c if c.isalnum() or c in ("_", "-") else "_" for c in Path(str(custom_csv)).stem).strip("_") or "CustomCSV"
        filename = f"TrendScope_{safe_stem}_Assessment_Report.pdf"
    else:
        region_id = (payload.get("config") or {}).get("regionId") or payload.get("regionId") or "nile_delta"
        filename = f"TrendScope_NileDelta_{region_id}_Scientific_Dossier.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


# ==========================================
# 9. UNIFIED FRONTEND SPA & STATIC ASSETS
# ==========================================
DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
if (DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="frontend-assets")


@app.api_route(
    "/api/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    include_in_schema=False,
)
def api_not_found(full_path: str) -> None:
    raise HTTPException(status_code=404, detail=f"API endpoint '/api/{full_path}' not found.")


@app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
def serve_unified_frontend(full_path: str) -> FileResponse:
    """
    Serves built Vite/React production assets (`dist/`) and SPA client routes from the single FastAPI server.
    """
    normalized = full_path.lstrip("/")
    if normalized == "api" or normalized.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found.")

    if not DIST_DIR.is_dir():
        raise HTTPException(
            status_code=503,
            detail="Frontend build directory `dist/` not found. Run `npm run build` first.",
        )

    dist_root = DIST_DIR.resolve()
    if normalized:
        candidate = (DIST_DIR / normalized).resolve()
        if candidate.is_relative_to(dist_root) and candidate.is_file():
            return FileResponse(str(candidate))

    index_file = DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(str(index_file))
    raise HTTPException(status_code=404, detail="Frontend index.html not found.")

