import os
import json
import math
import time
import hashlib
import datetime
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from backend.config import settings, CACHE_DIR, RASTERS_DIR
from backend.services.geography_service import geography_service

DATASET_CATALOG: Dict[str, Dict[str, Any]] = {
    "ndvi": {
        "variableId": "ndvi",
        "datasetId": "MODIS_MOD13Q1",
        "shortName": "MOD13Q1",
        "version": "061",
        "productCode": "MOD13Q1.061",
        "collectionConceptId": "C1748066515-LPCLOUD",
        "title": "MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061",
        "provider": "NASA LP DAAC / EOSDIS",
        "doi": "10.5067/MODIS/MOD13Q1.061",
        "sourceUrl": "https://doi.org/10.5067/MODIS/MOD13Q1.061",
        "documentationUrl": "https://modis.gsfc.nasa.gov/data/dataprod/mod13.php",
        "unit": "NDVI",
        "spatialResolution": "250 m (Sinusoidal Grid h20v05)",
        "spatialResolutionMeters": 250,
        "temporalResolution": "16-day composite (aggregated to monthly/seasonal/annual)",
        "startDate": "2000-02-18",
        "endDate": "2024-12-31",
        "scaleFactor": 0.0001,
        "validRange": [-2000, 10000],
        "scaledValidRange": [-0.2, 1.0],
        "noDataValue": -3000,
        "qualityBand": "_250m_16_days_pixel_reliability (0=Good, 1=Marginal; 2=Snow/Ice, 3=Cloud masked)",
        "limitations": (
            "250 m optical reflectance composite; winter cloud cover in northern coastal delta "
            "is masked using _250m_16_days_pixel_reliability."
        ),
    },
    "lst": {
        "variableId": "lst",
        "datasetId": "MODIS_MOD11C3",
        "shortName": "MOD11C3",
        "version": "061",
        "productCode": "MOD11C3.061",
        "collectionConceptId": "C2565788897-LPCLOUD",
        "title": "MODIS/Terra Land Surface Temperature/Emissivity Monthly L3 Global 0.05Deg CMG V061",
        "provider": "NASA LP DAAC / EOSDIS",
        "doi": "10.5067/MODIS/MOD11C3.061",
        "sourceUrl": "https://doi.org/10.5067/MODIS/MOD11C3.061",
        "documentationUrl": "https://lpdaac.usgs.gov/products/mod11c3v061/",
        "unit": "°C",
        "spatialResolution": "0.05° CMG (~5.5 km; Day & Night passes)",
        "spatialResolutionMeters": 5500,
        "temporalResolution": "Monthly clear-sky Day (~10:30 LT) & Night (~22:30 LT) composites",
        "startDate": "2000-02-18",
        "endDate": "2024-12-31",
        "scaleFactor": 0.02,
        "validRange": [7500, 65535],
        "scaledValidRange": [-10.0, 75.0],
        "noDataValue": -9999.0,
        "qualityBand": "QC_Day / QC_Night (Bits 0-1: 00=Good, 01=Other Valid; Cloud pixels masked)",
        "modes": ["day", "night", "both"],
        "limitations": (
            "Measures radiometric land skin temperature (NOT 2 m shelter air temperature) under clear-sky conditions "
            "during Terra daytime (~10:30 LT) and nighttime (~22:30 LT) overpasses."
        ),
    },
}


def compute_cache_key(
    dataset: str,
    variable: str,
    geometry_wkt_or_id: str,
    start_date: str,
    end_date: str,
    version: str,
    aggregation: str,
) -> str:
    raw = f"{dataset}|{variable}|{geometry_wkt_or_id}|{start_date}|{end_date}|{version}|{aggregation}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


class NasaAcquisitionEngine:
    """
    Retrieves real NASA MODIS Vegetation (MOD13Q1.061) and Land Surface Temperature (MOD11C3.061)
    metadata, granules, and OPeNDAP spatial subsets over the Nile Delta in Egypt.
    """

    NILE_DELTA_BBOX = [29.85, 30.12, 32.32, 31.58]  # [west, south, east, north]

    def get_variables_metadata(self) -> List[Dict[str, Any]]:
        return [DATASET_CATALOG["ndvi"], DATASET_CATALOG["lst"]]

    def verify_services_status(self) -> Dict[str, Any]:
        token_info = settings.inspect_earthdata_token()
        gemini_ok = bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 20)
        nasa_key_ok = bool(settings.NASA_API_KEY and len(settings.NASA_API_KEY) > 10)
        maptiler_ok = bool(settings.MAPTILER_API_KEY and len(settings.MAPTILER_API_KEY) >= 10)

        return {
            "earthdata": {
                "status": "CONNECTED" if (token_info["valid_format"] and not token_info["expired"]) else "INVALID_OR_EXPIRED",
                "uid": token_info["uid"],
                "expiresAt": token_info["expires_at"],
                "message": token_info["message"],
            },
            "gemini": {
                "status": "CONFIGURED" if gemini_ok else "MISSING",
                "model": settings.GEMINI_MODEL,
            },
            "nasaOpenApi": {
                "status": "CONFIGURED" if nasa_key_ok else "PUBLIC_FALLBACK",
            },
            "maptiler": {
                "status": "CONFIGURED" if maptiler_ok else "MISSING",
            },
        }

    def search_cmr_granules(
        self,
        variable_id: str,
        start_date: str = "2024-01-01",
        end_date: str = "2024-12-31",
        bbox: Optional[List[float]] = None,
        page_size: int = 10,
    ) -> Dict[str, Any]:
        meta = DATASET_CATALOG.get(variable_id, DATASET_CATALOG["ndvi"])
        b = bbox or self.NILE_DELTA_BBOX
        bbox_str = f"{b[0]},{b[1]},{b[2]},{b[3]}"

        cache_file = CACHE_DIR / f"cmr_{meta['shortName']}_{meta['version']}_{start_date}_{end_date}_{page_size}.json"
        if cache_file.exists() and (time.time() - cache_file.stat().st_mtime < 86400):
            try:
                return json.loads(cache_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        url = (
            f"https://cmr.earthdata.nasa.gov/search/granules.json?"
            f"short_name={meta['shortName']}&version={meta['version']}"
            f"&bounding_box={bbox_str}"
            f"&temporal={start_date}T00:00:00Z,{end_date}T23:59:59Z"
            f"&page_size={page_size}&sort_key=-start_date"
        )
        headers = {}
        if settings.EARTHDATA_TOKEN:
            headers["Authorization"] = f"Bearer {settings.EARTHDATA_TOKEN}"

        granules = []
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                entries = data.get("feed", {}).get("entry", [])
                for e in entries:
                    # For MOD13Q1, prefer tile h20v05 which covers the Nile Delta
                    title = e.get("title", "")
                    if meta["shortName"] == "MOD13Q1" and "h20v05" not in title and len(entries) > 1:
                        continue
                    links = e.get("links", [])
                    data_link = next(
                        (l.get("href") for l in links if l.get("href", "").endswith((".hdf", ".h5", ".nc"))),
                        None,
                    )
                    opendap_link = next(
                        (l.get("href") for l in links if "opendap.earthdata.nasa.gov" in l.get("href", "")),
                        None,
                    )
                    granules.append(
                        {
                            "id": e.get("id"),
                            "title": title,
                            "timeStart": e.get("time_start"),
                            "timeEnd": e.get("time_end"),
                            "SizeMB": e.get("granule_size"),
                            "dataUrl": data_link,
                            "opendapUrl": opendap_link,
                            "collectionConceptId": e.get("collection_concept_id", meta["collectionConceptId"]),
                        }
                    )
        except Exception as exc:
            return {
                "variableId": variable_id,
                "productCode": meta["productCode"],
                "count": 0,
                "granules": [],
                "error": str(exc),
            }

        result = {
            "variableId": variable_id,
            "productCode": meta["productCode"],
            "doi": meta["doi"],
            "spatialResolution": meta["spatialResolution"],
            "temporalResolution": meta["temporalResolution"],
            "count": len(granules),
            "granules": granules,
            "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        try:
            cache_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
        except Exception:
            pass
        return result

    def _parse_dap4_csv_2d(self, csv_text: str, var_suffix: str) -> List[List[float]]:
        """Parses OPeNDAP DAP4 CSV output for a 2D array slice."""
        rows: List[List[float]] = []
        for line in csv_text.splitlines():
            line = line.strip()
            if not line or var_suffix not in line:
                continue
            parts = line.split(",")
            if len(parts) < 2:
                continue
            vals = []
            for p in parts[1:]:
                p = p.strip()
                if p == "":
                    continue
                try:
                    vals.append(float(p))
                except ValueError:
                    pass
            if vals:
                rows.append(vals)
        return rows

    def fetch_live_modis_ndvi_grid(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches a real MODIS/Terra MOD13Q1.061 250m NDVI & Pixel Reliability subset over the Nile Delta
        from NASA LP DAAC Earthdata Cloud OPeNDAP (tile h20v05), applies the official 0.0001 scale factor
        and quality mask, and caches the resulting grid.
        """
        cache_path = CACHE_DIR / "live_mod13q1_061_nile_delta_grid.json"
        if cache_path.exists() and not force_refresh:
            try:
                return json.loads(cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass

        # Discover latest MOD13Q1.061 h20v05 granule from CMR
        search_res = self.search_cmr_granules("ndvi", "2024-11-01", "2024-12-31", page_size=6)
        granule_title = "MOD13Q1.A2024353.h20v05.061.2025004013120"
        obs_date = "2024-12-18"
        for g in search_res.get("granules", []):
            if "h20v05" in g.get("title", ""):
                granule_title = g["title"]
                obs_date = (g.get("timeStart") or "2024-12-18")[:10]
                break

        # Sinusoidal tile h20v05 bounds for Nile Delta:
        # lat 31.58N -> y=4041, lat 30.12N -> y=4742 (step 10 -> 71 rows, ~2.5km sampling of 250m grid)
        # lon 29.85E..32.32E at ~30.85N -> x=2680..3740 (step 12 -> 89 cols)
        y_start, y_step, y_end = 4041, 10, 4741
        x_start, x_step, x_end = 2680, 12, 3736

        ce = urllib.parse.quote(
            f"/MODIS_Grid_16DAY_250m_500m_VI/Data_Fields/_250m_16_days_NDVI[{y_start}:{y_step}:{y_end}][{x_start}:{x_step}:{x_end}];"
            f"/MODIS_Grid_16DAY_250m_500m_VI/Data_Fields/_250m_16_days_pixel_reliability[{y_start}:{y_step}:{y_end}][{x_start}:{x_step}:{x_end}]",
            safe="/,:;",
        )
        dap_url = (
            f"https://opendap.earthdata.nasa.gov/collections/C1748066515-LPCLOUD/granules/"
            f"{granule_title}.dap.csv?dap4.ce={ce}"
        )

        headers = {}
        if settings.EARTHDATA_TOKEN:
            headers["Authorization"] = f"Bearer {settings.EARTHDATA_TOKEN}"

        req = urllib.request.Request(dap_url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            csv_text = resp.read().decode("utf-8", errors="ignore")

        raw_ndvi = np.array(self._parse_dap4_csv_2d(csv_text, "_250m_16_days_NDVI"), dtype=np.float64)
        raw_qa = np.array(self._parse_dap4_csv_2d(csv_text, "_250m_16_days_pixel_reliability"), dtype=np.float64)

        if raw_ndvi.size == 0:
            raise RuntimeError("Empty NDVI array returned from OPeNDAP")

        nrows_sin, ncols_sin = raw_ndvi.shape
        sin_ys = np.arange(y_start, y_start + nrows_sin * y_step, y_step)
        sin_xs = np.arange(x_start, x_start + ncols_sin * x_step, x_step)

        # Reproject from MODIS Sinusoidal (h20v05) onto a regular EPSG:4326 grid over Nile Delta bbox
        west, south, east, north = self.NILE_DELTA_BBOX
        out_rows, out_cols = 72, 96
        lats = np.linspace(north, south, out_rows)
        lons = np.linspace(west, east, out_cols)

        wgs_ndvi = np.full((out_rows, out_cols), -9999.0, dtype=np.float64)
        wgs_qa = np.full((out_rows, out_cols), -1, dtype=np.int16)

        for r_idx, lat in enumerate(lats):
            y_exact = (40.0 - lat) / 10.0 * 4800.0
            s_r = int(round((y_exact - y_start) / y_step))
            if s_r < 0 or s_r >= nrows_sin:
                continue
            cos_lat = math.cos(math.radians(lat))
            for c_idx, lon in enumerate(lons):
                x_exact = (lon * cos_lat - 20.0) / 10.0 * 4800.0
                s_c = int(round((x_exact - x_start) / x_step))
                if 0 <= s_c < ncols_sin:
                    val = raw_ndvi[s_r, s_c]
                    qa = int(raw_qa[s_r, s_c]) if raw_qa.shape == raw_ndvi.shape else 0
                    wgs_qa[r_idx, c_idx] = qa
                    # Official MOD13Q1 valid range [-2000, 10000] and pixel_reliability in (0=Good, 1=Marginal)
                    if -2000 <= val <= 10000 and qa in (0, 1):
                        scaled = round(float(val) * 0.0001, 4)
                        # Mask open water pixels (< 0.02)
                        if scaled >= 0.02:
                            wgs_ndvi[r_idx, c_idx] = scaled

        payload = {
            "variableId": "ndvi",
            "productCode": "MOD13Q1.061",
            "granuleTitle": granule_title,
            "observationDate": obs_date,
            "source": "NASA LP DAAC Earthdata Cloud OPeNDAP (C1748066515-LPCLOUD)",
            "doi": "10.5067/MODIS/MOD13Q1.061",
            "nativeResolution": "250 m",
            "gridSampling": "Display/analysis raster subsampled from MOD13Q1.061 h20v05 (step 10x12, ~2.5 km spacing on EPSG:4326)",
            "bbox": self.NILE_DELTA_BBOX,
            "rows": out_rows,
            "cols": out_cols,
            "lats": [round(float(x), 4) for x in lats],
            "lons": [round(float(x), 4) for x in lons],
            "values": wgs_ndvi.tolist(),
            "qualityFlags": wgs_qa.tolist(),
            "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        cache_path.write_text(json.dumps(payload), encoding="utf-8")
        return payload

    def fetch_live_modis_lst_grid(
        self, lst_mode: str = "day", force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Loads the latest real MODIS/Terra MOD11C3.061 Land Surface Temperature grid (°C)
        over the Nile Delta for 'day' (LST_Day_CMG), 'night' (LST_Night_CMG),
        or 'both' (diurnal amplitude Day - Night in °C).
        """
        mode = lst_mode if lst_mode in ("day", "night", "both") else "day"
        cache_path = CACHE_DIR / f"live_mod11c3_061_nile_delta_{mode}_grid.json"
        if cache_path.exists() and not force_refresh:
            try:
                return json.loads(cache_path.read_text(encoding="utf-8"))
            except Exception:
                pass

        day_npz = CACHE_DIR / "real_mod11c3_day_monthly_cube.npz"
        day_meta_path = CACHE_DIR / "real_mod11c3_day_monthly_meta.json"
        night_npz = CACHE_DIR / "real_mod11c3_night_monthly_cube.npz"
        night_meta_path = CACHE_DIR / "real_mod11c3_night_monthly_meta.json"

        with np.load(day_npz) as d_f:
            day_cube = d_f["values"].astype(np.float32)
        with np.load(night_npz) as n_f:
            night_cube = n_f["values"].astype(np.float32)

        day_meta = json.loads(day_meta_path.read_text(encoding="utf-8"))
        night_meta = json.loads(night_meta_path.read_text(encoding="utf-8"))

        # Pick most recent month with strong coverage (preferring 2024 annual/recent composite or latest month)
        idx = len(day_meta["months"]) - 1
        while idx > 0 and int(day_meta["months"][idx].get("validPixels", 0)) == 0:
            idx -= 1

        if mode == "night":
            arr = night_cube[idx]
            rec = night_meta["months"][idx]
            layer_label = "LST_Night_CMG (~22:30 LT)"
        elif mode == "both":
            arr = day_cube[idx] - night_cube[idx]
            rec = day_meta["months"][idx]
            layer_label = "Diurnal Spread (LST_Day − LST_Night)"
        else:
            arr = day_cube[idx]
            rec = day_meta["months"][idx]
            layer_label = "LST_Day_CMG (~10:30 LT)"

        out_vals = np.where(np.isnan(arr), -9999.0, np.round(arr, 2))
        payload = {
            "variableId": "lst",
            "lstMode": mode,
            "layer": layer_label,
            "productCode": "MOD11C3.061",
            "granuleTitle": rec.get("granuleTitle", "MOD11C3.A2024336.061"),
            "observationDate": rec.get("observationDate", "2024-12-01"),
            "source": "NASA LP DAAC Earthdata Cloud OPeNDAP (C2565788897-LPCLOUD)",
            "doi": "10.5067/MODIS/MOD11C3.061",
            "nativeResolution": "0.05° CMG (~5.5 km)",
            "bbox": day_meta["bbox"],
            "rows": int(arr.shape[0]),
            "cols": int(arr.shape[1]),
            "lats": day_meta["lats"],
            "lons": day_meta["lons"],
            "values": out_vals.tolist(),
            "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        cache_path.write_text(json.dumps(payload), encoding="utf-8")
        return payload


nasa_engine = NasaAcquisitionEngine()

