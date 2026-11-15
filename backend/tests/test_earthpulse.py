import json
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.config import settings
from backend.services.geography_service import geography_service
from backend.services.raster_service import raster_service
from backend.services.stats_engine import (
    compute_mann_kendall_and_sens_slope,
    run_full_variable_analysis,
    run_combined_nile_delta_investigation,
)

client = TestClient(app)


# ==========================================
# 1. GEOGRAPHIC & CRS TESTS (NILE DELTA)
# ==========================================
def test_nile_delta_boundary_and_subregions_valid():
    boundary = geography_service.get_boundary_geojson()
    assert boundary["type"] == "FeatureCollection"
    assert len(boundary["features"]) == 1
    props = boundary["features"][0]["properties"]
    assert props["id"] == "nile_delta"
    area_km2 = props.get("areaKm2") or props.get("area_km2") or 0
    assert area_km2 > 15000

    subregions = geography_service.get_subregions_geojson()
    assert subregions["type"] == "FeatureCollection"
    assert len(subregions["features"]) == 9
    for feat in subregions["features"]:
        p = feat["properties"]
        assert "id" in p and ("areaKm2" in p or "area_km2" in p)
        assert (p.get("areaKm2") or p.get("area_km2")) > 0


def test_custom_polygon_validation_clipping_and_rejection():
    # Valid polygon inside Gharbia / Central Nile Delta
    inside_poly = {
        "type": "Polygon",
        "coordinates": [[
            [30.90, 30.75],
            [31.15, 30.75],
            [31.15, 30.95],
            [30.90, 30.95],
            [30.90, 30.75],
        ]],
    }
    res_ok = geography_service.validate_and_clip_custom_geometry(inside_poly, name="Test Gharbia Box")
    assert res_ok["valid"] is True
    assert res_ok["areaKm2"] > 100
    assert res_ok["wasClipped"] is False

    # Invalid polygon in Upper Egypt (Aswan), strictly outside Nile Delta
    outside_poly = {
        "type": "Polygon",
        "coordinates": [[
            [32.70, 23.90],
            [33.10, 23.90],
            [33.10, 24.20],
            [32.70, 24.20],
            [32.70, 23.90],
        ]],
    }
    with pytest.raises(ValueError, match="outside the Nile Delta"):
        geography_service.validate_and_clip_custom_geometry(outside_poly, name="Aswan Box")


# ==========================================
# 2. NASA CREDENTIALS & GEOTIFF RASTER TESTS
# ==========================================
def test_earthdata_token_and_raster_statistics():
    tok_info = settings.inspect_earthdata_token()
    assert tok_info["configured"] is True
    assert tok_info["valid_format"] is True
    assert tok_info["expired"] is False

    ndvi_tif, _ = raster_service.ensure_geotiff("ndvi")
    lst_day_tif, _ = raster_service.ensure_geotiff("lst", lst_mode="day")
    lst_night_tif, _ = raster_service.ensure_geotiff("lst", lst_mode="night")
    assert ndvi_tif.exists()
    assert lst_day_tif.exists()
    assert lst_night_tif.exists()

    ndvi_stats = raster_service.compute_regional_statistics("ndvi", "nile_delta")
    assert "250 m" in ndvi_stats["nativeResolution"]
    assert ndvi_stats["validPixelCount"] > 1000
    assert 0.15 < ndvi_stats["mean"] < 0.85

    lst_day_stats = raster_service.compute_regional_statistics("lst", "nile_delta", lst_mode="day")
    assert "0.05°" in lst_day_stats["nativeResolution"]
    assert lst_day_stats["validPixelCount"] > 20
    assert 12.0 <= lst_day_stats["mean"] <= 52.0

    lst_night_stats = raster_service.compute_regional_statistics("lst", "nile_delta", lst_mode="night")
    assert lst_night_stats["validPixelCount"] > 20
    assert 4.0 <= lst_night_stats["mean"] <= 35.0
    assert lst_day_stats["mean"] > lst_night_stats["mean"]

    px_both = raster_service.inspect_pixel("lst", lat=30.86, lng=31.02, lst_mode="both")
    assert px_both["insideStudyArea"] is True
    assert px_both["dayValue"] is not None and px_both["nightValue"] is not None
    assert abs(px_both["diurnalRange"] - round(px_both["dayValue"] - px_both["nightValue"], 2)) < 0.05

    # Pixel inspection inside Gharbia (30.86N, 31.02E) vs outside Nile Delta (25.0N, 28.0E)
    px_in = raster_service.inspect_pixel("ndvi", lat=30.86, lng=31.02)
    assert px_in["insideStudyArea"] is True
    assert px_in["value"] is not None
    assert "250 m" in px_in["nativeResolution"]

    px_out = raster_service.inspect_pixel("ndvi", lat=25.0, lng=28.0)
    assert px_out["insideStudyArea"] is False
    assert px_out["value"] is None


# ==========================================
# 3. STATISTICAL ENGINE TESTS (SYNTHETIC & REAL)
# ==========================================
def test_mann_kendall_and_sens_slope_on_synthetic_series():
    dates = pd.date_range("2010-01-01", periods=60, freq="MS")
    # Monotonic positive slope: +0.02/year
    t_yrs = np.arange(60) / 12.0
    inc_vals = 0.40 + 0.02 * t_yrs
    df_inc = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "value": inc_vals,
        "anomaly": inc_vals - 0.40,
        "zScore": np.zeros(60),
    })
    res_inc = compute_mann_kendall_and_sens_slope(df_inc, aggregation="monthly")
    assert res_inc["significant"] is True
    assert res_inc["trendDirection"] == "increasing"
    assert res_inc["pValue"] < 0.001
    assert abs(res_inc["sensSlopePerYear"] - 0.02) < 0.002

    # Flat noise-free constant series -> no trend
    flat_vals = np.full(60, 0.50)
    df_flat = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "value": flat_vals,
        "anomaly": np.zeros(60),
        "zScore": np.zeros(60),
    })
    res_flat = compute_mann_kendall_and_sens_slope(df_flat, aggregation="annual")
    assert res_flat["significant"] is False
    assert res_flat["trendDirection"] == "no_trend"
    assert res_flat["sensSlopePerYear"] == 0.0


def test_lst_day_night_comparison_and_combined_coupling():
    lst_day = run_full_variable_analysis("kafr_el_sheikh", "lst", "2000-02-18", "2024-12-31", lst_mode="day")
    assert lst_day["config"]["timeRange"]["startDate"] >= "2000-02-01"
    assert lst_day["provenance"]["isSyntheticTimeSeries"] is False
    assert lst_day["config"]["status"] == "VERIFIED"
    assert 15.0 < lst_day["statistics"]["mean"] < 42.0

    lst_night = run_full_variable_analysis("kafr_el_sheikh", "lst", "2000-02-18", "2024-12-31", lst_mode="night")
    assert 10.0 < lst_night["statistics"]["mean"] < lst_day["statistics"]["mean"]

    lst_both = run_full_variable_analysis("kafr_el_sheikh", "lst", "2000-02-18", "2024-12-31", lst_mode="both")
    comp = lst_both["lstComparison"]
    assert comp["mode"] == "both"
    assert comp["day"]["statistics"]["mean"] > comp["night"]["statistics"]["mean"]
    assert len(comp["diurnalSpread"]["points"]) >= 280
    sample_pt = comp["diurnalSpread"]["points"][0]
    assert abs(sample_pt["value"] - (sample_pt["dayValue"] - sample_pt["nightValue"])) < 0.02

    combined = run_combined_nile_delta_investigation("nile_delta", "2000-02-18", "2024-12-31", lst_mode="both")
    assert "MOD11C3" in combined["resolutionNotice"]
    assert -1.0 <= combined["correlation"]["pearsonR"] <= 1.0
    assert -1.0 <= combined["correlation"]["spearmanRho"] <= 1.0
    assert combined["correlation"]["sampleSize"] >= 280
    assert "nightCorrelation" in combined and combined["nightCorrelation"] is not None


# ==========================================
# 4. END-TO-END FASTAPI INTEGRATION TESTS
# ==========================================
def test_api_endpoints_end_to_end():
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    assert r_health.json()["studyArea"] == "Nile Delta, Egypt"
    assert r_health.json()["supportedVariables"] == ["ndvi", "lst"]

    r_vars = client.get("/api/datasets/variables")
    assert r_vars.status_code == 200
    var_ids = [v["id"] for v in r_vars.json()["variables"]]
    assert var_ids == ["ndvi", "lst"]

    # Reject outside-Nile-Delta custom polygon with 422
    r_bad_poly = client.post(
        "/api/geography/custom-region",
        json={
            "name": "Paris",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[2.2, 48.8], [2.4, 48.8], [2.4, 48.9], [2.2, 48.9], [2.2, 48.8]]],
            },
        },
    )
    assert r_bad_poly.status_code == 422

    # Raster overlay PNG and XYZ tile
    r_png = client.get("/api/raster/overlay/ndvi.png")
    assert r_png.status_code == 200
    assert r_png.headers["content-type"] == "image/png"
    assert r_png.content[:4] == b"\x89PNG"

    r_lst_png = client.get("/api/raster/overlay/lst.png?lst_mode=night")
    assert r_lst_png.status_code == 200
    assert r_lst_png.content[:4] == b"\x89PNG"

    # Investigation CRUD lifecycle
    r_create = client.post(
        "/api/investigations",
        json={
            "id": "inv_pytest_nile_delta",
            "customTitle": "Pytest Gharbia NDVI Monitoring",
            "regionId": "gharbia",
            "variableId": "ndvi",
            "timeRange": {"startDate": "2015-04-01", "endDate": "2024-12-31", "aggregation": "monthly"},
        },
    )
    assert r_create.status_code == 200
    r_list = client.get("/api/investigations")
    assert any(i["id"] == "inv_pytest_nile_delta" for i in r_list.json()["investigations"])
    r_del = client.delete("/api/investigations/inv_pytest_nile_delta")
    assert r_del.status_code == 200

    # Grounded AI Scientist
    r_ai = client.post(
        "/api/ai-scientist/explain",
        json={
            "prompt": "Summarize the NDVI trend and spatial resolution constraints in Beheira.",
            "language": "en",
            "regionId": "beheira_delta",
            "variableId": "ndvi",
        },
    )
    assert r_ai.status_code == 200
    ai_json = r_ai.json()
    assert "summary" in ai_json and "groundedMetrics" in ai_json
    assert "MOD13Q1" in json.dumps(ai_json) or "250" in json.dumps(ai_json)

    # ReportLab PDF Export (LST Day & Night comparison)
    r_pdf = client.post(
        "/api/reports/generate",
        json={
            "regionId": "kafr_el_sheikh",
            "variableId": "lst",
            "lstMode": "both",
            "timeRange": {"startDate": "2000-02-18", "endDate": "2024-12-31", "aggregation": "monthly"},
            "language": "en",
        },
    )
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    assert r_pdf.content.startswith(b"%PDF-")

    # CSV Upload and Statistical Pipeline
    import io
    dummy_csv = "date,value\n2022-01-01,0.50\n2022-02-01,0.55\n2022-03-01,0.60\n2022-04-01,0.52\n2022-05-01,0.48\n2022-06-01,0.45\n"
    r_upload = client.post(
        "/api/analysis/upload-csv",
        files={"file": ("test_upload.csv", io.BytesIO(dummy_csv.encode("utf-8")), "text/csv")},
        data={"title": "Test Sensor Run", "unit": "Index"},
    )
    assert r_upload.status_code == 200
    upload_json = r_upload.json()
    assert upload_json["config"]["status"] == "VERIFIED"
    assert len(upload_json["points"]) == 6
    assert "sensSlopePerYear" in upload_json["statistics"]

    # NASA AppEEARS multi-layer Statistics CSV (must prefer NDVI + Mean over constant Count=12 / aid)
    appeears_csv = (
        "File Name,Dataset,aid,Date,Count,Minimum,Maximum,Range,Mean,Standard Deviation,Median\n"
        "MOD13A3.061_aid0001,_1_km_monthly_VI_Quality,1,2020-01-01,12,2112,2112,0,2112.0,0.0,2112.0\n"
        "MOD13A3.061_aid0001,_1_km_monthly_NDVI,1,2020-01-01,12,0.31,0.52,0.21,0.41,0.05,0.42\n"
        "MOD13A3.061_aid0001,_1_km_monthly_NDVI,1,2020-02-01,12,0.34,0.56,0.22,0.45,0.05,0.46\n"
        "MOD13A3.061_aid0001,_1_km_monthly_NDVI,1,2020-03-01,12,0.38,0.61,0.23,0.49,0.06,0.50\n"
        "MOD13A3.061_aid0001,_1_km_monthly_NDVI,1,2020-04-01,12,0.42,0.66,0.24,0.54,0.06,0.55\n"
        "MOD13A3.061_aid0001,_1_km_monthly_NDVI,1,2020-05-01,12,0.46,0.70,0.24,0.58,0.07,0.59\n"
        "MOD13A3.061_aid0001,_1_km_monthly_NDVI,1,2020-06-01,12,0.50,0.74,0.24,0.62,0.07,0.63\n"
        "MOD13A3.061_aid0001,_1_km_monthly_EVI,1,2020-01-01,12,0.20,0.35,0.15,0.28,0.04,0.29\n"
    )
    r_appeears = client.post(
        "/api/analysis/upload-csv",
        files={"file": ("MOD13A3-061-Statistics.csv", io.BytesIO(appeears_csv.encode("utf-8")), "text/csv")},
        data={"title": "MOD13A3-061-Statistics", "unit": "Index"},
    )
    assert r_appeears.status_code == 200
    app_json = r_appeears.json()
    assert app_json["provenance"]["detectedColumns"]["valueColumn"] == "Mean"
    assert app_json["provenance"]["selectedDataset"] == "_1_km_monthly_NDVI"
    assert app_json["statistics"]["sensSlope"] > 0.1
    assert app_json["statistics"]["trendDirection"] == "increasing"

    # CSV upload with explicit time period slice (startDate / endDate)
    r_slice = client.post(
        "/api/analysis/upload-csv",
        files={"file": ("MOD13A3-061-Statistics.csv", io.BytesIO(appeears_csv.encode("utf-8")), "text/csv")},
        data={
            "title": "MOD13A3-Slice",
            "unit": "Index",
            "startDate": "2020-02-01",
            "endDate": "2020-05-01",
        },
    )
    assert r_slice.status_code == 200
    slice_json = r_slice.json()
    assert len(slice_json["points"]) == 4
    assert slice_json["config"]["timeRange"]["startDate"] == "2020-02-01"
    assert slice_json["config"]["timeRange"]["endDate"] == "2020-05-01"
    assert slice_json["provenance"]["availableTimeRange"] == {
        "startDate": "2020-01-01",
        "endDate": "2020-06-01",
    }
