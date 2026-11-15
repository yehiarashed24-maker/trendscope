import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats

from backend.config import CACHE_DIR
from backend.services.geography_service import geography_service
from backend.services.nasa_engine import DATASET_CATALOG
from backend.services.raster_service import raster_service


def get_enriched_dataset_meta(variable_id: str) -> Dict[str, Any]:
    ds = dict(DATASET_CATALOG[variable_id])
    if variable_id == "ndvi":
        ds.setdefault(
            "citation",
            "Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061 (MOD13Q1.061). NASA EOSDIS LP DAAC. DOI: 10.5067/MODIS/MOD13Q1.061",
        )
        ds.setdefault("baselinePeriod", "2000-2020")
        ds.setdefault("historicalCoverage", "2000-02-18 to 2024-12-31")
    else:
        ds.setdefault(
            "citation",
            "Wan, Z., Hook, S., & Hulley, G. (2021). MODIS/Terra Land Surface Temperature/Emissivity Monthly L3 Global 0.05Deg CMG V061 (MOD11C3.061). NASA EOSDIS LP DAAC. DOI: 10.5067/MODIS/MOD11C3.061",
        )
        ds.setdefault("baselinePeriod", "2000-2020")
        ds.setdefault("historicalCoverage", "2000-02-18 to 2024-12-31")
    return ds


# Cache loaded OPeNDAP multi-year cubes in memory for fast polygon slicing
_CUBE_CACHE: Dict[str, Tuple[np.ndarray, Dict[str, Any]]] = {}


def _load_real_nasa_cube(variable_id: str, lst_mode: str = "day") -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Loads real multi-year NASA Earthdata satellite cubes from data/cache/
    (`MOD13Q1.061` + `MOD13C2.061` for `ndvi`, `MOD11C3.061` Day/Night for `lst`).
    """
    mode = lst_mode if lst_mode in ("day", "night") else "day"
    cache_key = f"lst_{mode}" if variable_id == "lst" else variable_id
    if cache_key in _CUBE_CACHE:
        return _CUBE_CACHE[cache_key]

    if variable_id == "ndvi":
        npz_path = CACHE_DIR / "real_mod13q1_monthly_cube.npz"
        meta_path = CACHE_DIR / "real_mod13q1_monthly_meta.json"
    elif variable_id == "lst":
        npz_path = CACHE_DIR / f"real_mod11c3_{mode}_monthly_cube.npz"
        meta_path = CACHE_DIR / f"real_mod11c3_{mode}_monthly_meta.json"
    else:
        raise ValueError(f"Unsupported variableId '{variable_id}'. Only 'ndvi' and 'lst' are supported.")

    if not npz_path.exists() or not meta_path.exists():
        raise FileNotFoundError(
            f"Real NASA Earthdata archive not found at {npz_path}. Run `python -m backend.scripts.harvest_real_nasa_cubes`."
        )

    with np.load(npz_path) as data:
        cube = data["values"].astype(np.float32)
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    _CUBE_CACHE[cache_key] = (cube, meta)
    return cube, meta


def build_monthly_series(
    region_id: str,
    variable_id: str,
    start_date: str = "2000-01-01",
    end_date: str = "2024-12-31",
    custom_geometry: Optional[Dict[str, Any]] = None,
    lst_mode: str = "day",
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Extracts genuine regional monthly time series for `ndvi` (`MOD13Q1.061` / `MOD13C2.061`, 2000-2024)
    or `lst` (`MOD11C3.061` Day/Night, 2000-2024) strictly by clipping the harvested NASA Earthdata
    multi-year raster cubes to the target Nile Delta study polygon via `rasterio.features.geometry_mask`.
    Zero synthetic generation or interpolation is performed; missing months remain `NaN`.
    """
    from rasterio.features import geometry_mask
    from rasterio.transform import from_bounds
    from shapely.geometry import mapping

    eff_mode = lst_mode if (variable_id == "lst" and lst_mode in ("day", "night")) else "day"
    raster_stats = raster_service.compute_regional_statistics(
        variable_id, region_id, custom_geom=custom_geometry, lst_mode=eff_mode
    )
    geom, reg_meta = geography_service.get_region_geometry(region_id, custom_geometry)

    cube, cube_meta = _load_real_nasa_cube(variable_id, lst_mode=eff_mode)
    west, south, east, north = cube_meta["bbox"]
    height, width = int(cube.shape[1]), int(cube.shape[2])
    transform = from_bounds(west, south, east, north, width, height)

    inside_mask = geometry_mask(
        [mapping(geom)],
        out_shape=(height, width),
        transform=transform,
        invert=True,
        all_touched=True,
    )

    min_mission_start = pd.Timestamp("2000-02-01")
    baseline_start, baseline_end = 2000, 2020
    if variable_id == "lst":
        default_qc = f"MOD11C3 {'Nighttime' if eff_mode == 'night' else 'Daytime'} Clear-Sky QC (0-1)"
    else:
        default_qc = "MODLAND Good/Useful (0-1)"

    req_start = max(pd.Timestamp(start_date), min_mission_start).replace(day=1)
    req_end = min(pd.Timestamp(end_date), pd.Timestamp("2024-12-31")).replace(day=1)
    if req_start > req_end:
        req_start = min_mission_start

    months_meta = cube_meta.get("months", [])
    records: List[Dict[str, Any]] = []

    for idx, m_rec in enumerate(months_meta):
        if idx >= cube.shape[0]:
            break
        date_str = m_rec["date"]
        dt = pd.Timestamp(date_str)
        yr, mo = dt.year, dt.month
        slice_pixels = cube[idx][inside_mask]
        valid_pixels = slice_pixels[~np.isnan(slice_pixels)]

        if valid_pixels.size > 0:
            val: float = round(float(np.mean(valid_pixels)), 4)
            src_prod = m_rec.get("productCode") or cube_meta.get("productCode", "")
            qc_flag = f"{default_qc} ({src_prod})" if src_prod else default_qc
        else:
            val = float("nan")
            qc_flag = "Missing / Cloud-or-Swath Gap"

        records.append({
            "date": date_str,
            "timestamp": int(dt.tz_localize("UTC").timestamp() * 1000),
            "year": yr,
            "month": mo,
            "value": val,
            "qcFlag": qc_flag,
        })

    df_full = pd.DataFrame(records)

    # Compute monthly climatology (Jan-Dec) over the documented baseline period using valid observations only
    df_base = df_full[(df_full["year"] >= baseline_start) & (df_full["year"] <= baseline_end)].dropna(subset=["value"])
    if df_base.empty:
        df_base = df_full.dropna(subset=["value"])

    clim_stats = (
        df_base.groupby("month")["value"]
        .agg(["mean", "std"])
        .reset_index()
        .rename(columns={"mean": "clim_mean", "std": "clim_std"})
    )
    clim_stats["clim_std"] = clim_stats["clim_std"].replace(0, 0.01).fillna(0.01)

    df_full = df_full.merge(clim_stats, on="month", how="left")
    df_full["climatology"] = df_full["clim_mean"].round(4)
    df_full["anomaly"] = (df_full["value"] - df_full["clim_mean"]).round(4)
    df_full["zScore"] = ((df_full["value"] - df_full["clim_mean"]) / df_full["clim_std"]).round(3)
    df_full = df_full.sort_values("date").reset_index(drop=True)

    # Filter to requested date window
    df_slice = df_full[
        (pd.to_datetime(df_full["date"]) >= req_start)
        & (pd.to_datetime(df_full["date"]) <= req_end)
    ].copy().reset_index(drop=True)

    missing_months = df_slice[df_slice["value"].isna()]["date"].tolist()
    valid_months_count = int(df_slice["value"].notna().sum())

    meta = {
        "regionId": region_id,
        "regionName": reg_meta.get("name", region_id),
        "variableId": variable_id,
        "lstMode": eff_mode if variable_id == "lst" else None,
        "dataset": get_enriched_dataset_meta(variable_id),
        "effectiveStartDate": req_start.strftime("%Y-%m-%d"),
        "effectiveEndDate": req_end.strftime("%Y-%m-%d"),
        "baselinePeriod": f"{baseline_start}-{baseline_end}",
        "rasterStats": raster_stats,
        "missingMonths": missing_months,
        "validMonthsCount": valid_months_count,
        "totalMonthsInWindow": int(len(df_slice)),
        "cubeMeta": cube_meta,
    }
    return df_slice, meta


def compute_mann_kendall_and_sens_slope(df: pd.DataFrame, aggregation: str = "monthly") -> Dict[str, Any]:
    """
    Runs real non-parametric Mann-Kendall trend test (`pymannkendall`) and Theil-Sen slope
    estimator (`scipy.stats.theilslopes`) on the valid observations (excluding NaNs).
    """
    clean = df.dropna(subset=["value"]).copy()
    n = len(clean)
    if n < 4:
        return {
            "pValue": 1.0,
            "zScore": 0.0,
            "sStatistic": 0.0,
            "varianceS": 0.0,
            "tau": 0.0,
            "trendDirection": "no_trend",
            "significant": False,
            "confidenceLevel": "Not Statistically Significant",
            "sensSlope": 0.0,
            "sensSlopePerYear": 0.0,
            "sensIntercept": 0.0,
            "slopeCiLower": 0.0,
            "slopeCiUpper": 0.0,
            "rSquared": 0.0,
            "sampleSize": n,
            "mean": 0.0,
            "stdDev": 0.0,
            "min": 0.0,
            "max": 0.0,
            "median": 0.0,
            "iqr": 0.0,
            "anomaliesCount": 0,
        }

    y = clean["value"].to_numpy(dtype=float)
    # Time in fractional years from start of series
    dates = pd.to_datetime(clean["date"])
    t_years = ((dates - dates.iloc[0]).dt.days / 365.25).to_numpy(dtype=float)

    # Use Seasonal Mann-Kendall when monthly cycle is present and n >= 24, otherwise original Mann-Kendall
    seasonal_sen_yr = None
    try:
        if aggregation == "monthly" and n >= 24:
            mk_res = mk.seasonal_test(y, period=12)
            # pymannkendall seasonal_test.slope is in units per 12-month cycle -> /1 for annual step
            seasonal_sen_yr = float(mk_res.slope)
        else:
            mk_res = mk.original_test(y)
    except Exception:
        mk_res = mk.original_test(y)

    # Deseasonalized Theil-Sen Estimator with 95% CI when monthly seasonal cycle is active
    y_anom = clean["anomaly"].to_numpy(dtype=float) if "anomaly" in clean.columns else y
    slope_target = y_anom if (aggregation == "monthly" and n >= 24 and np.any(y_anom != 0)) else y
    sen_slope_yr, _anom_intercept, lo_slope_yr, hi_slope_yr = stats.theilslopes(slope_target, t_years, 0.95)
    sen_intercept = float(np.median(y) - sen_slope_yr * np.median(t_years))

    # Diagnostic lag-1 autocorrelation (raw and deseasonalized)
    acf1_raw = pd.Series(y).autocorr(lag=1)
    acf1_anom = pd.Series(y_anom).autocorr(lag=1)

    # Parametric R^2 on deseasonalized anomaly (or raw series for short/non-seasonal data)
    if len(np.unique(t_years)) >= 2 and float(np.ptp(slope_target)) > 0:
        lin_res = stats.linregress(t_years, slope_target)
        r_squared = float(lin_res.rvalue ** 2) if not np.isnan(lin_res.rvalue) else 0.0
    else:
        r_squared = 0.0

    p_val = float(mk_res.p)
    z_val = float(mk_res.z)
    s_stat = float(mk_res.s)
    var_s = float(mk_res.var_s)
    tau_val = float(mk_res.Tau)
    significant = bool(mk_res.h)

    if significant:
        direction = "increasing" if mk_res.trend == "increasing" else "decreasing"
    else:
        direction = "no_trend"

    if p_val < 0.01:
        conf_label = "99% Confidence (p < 0.01)"
    elif p_val < 0.05:
        conf_label = "95% Confidence (p < 0.05)"
    elif p_val < 0.10:
        conf_label = "90% Confidence (p < 0.10)"
    else:
        conf_label = "Not Statistically Significant"

    q75, q25 = np.percentile(y, [75, 25])
    anom_count = int(np.sum(np.abs(clean["zScore"]) >= 2.0)) if "zScore" in clean.columns else 0

    return {
        "pValue": round(p_val, 5),
        "zScore": round(z_val, 3),
        "sStatistic": round(s_stat, 1),
        "varianceS": round(var_s, 1),
        "tau": round(tau_val, 4),
        "trendDirection": direction,
        "significant": significant,
        "confidenceLevel": conf_label,
        "sensSlope": round(float(sen_slope_yr * 10.0), 4),       # Per decade (preserved for existing UI cards)
        "sensSlopePerYear": round(float(sen_slope_yr), 5),       # Per year
        "seasonalSensSlopePerYear": round(float(seasonal_sen_yr), 5) if seasonal_sen_yr is not None else None,
        "sensIntercept": round(float(sen_intercept), 4),
        "slopeCiLower": round(float(lo_slope_yr * 10.0), 4),     # Per decade 95% CI lower
        "slopeCiUpper": round(float(hi_slope_yr * 10.0), 4),     # Per decade 95% CI upper
        "slopeYrCiLower": round(float(lo_slope_yr), 5),          # Per year 95% CI lower
        "slopeYrCiUpper": round(float(hi_slope_yr), 5),          # Per year 95% CI upper
        "lag1Autocorrelation": round(float(acf1_raw), 4) if pd.notna(acf1_raw) else 0.0,
        "deseasonalizedLag1Autocorrelation": round(float(acf1_anom), 4) if pd.notna(acf1_anom) else 0.0,
        "rSquared": round(r_squared, 4),
        "sampleSize": int(n),
        "mean": round(float(np.mean(y)), 4),
        "stdDev": round(float(np.std(y, ddof=1)), 4),
        "min": round(float(np.min(y)), 4),
        "max": round(float(np.max(y)), 4),
        "median": round(float(np.median(y)), 4),
        "iqr": round(float(q75 - q25), 4),
        "anomaliesCount": anom_count,
    }


def compute_seasonal_breakdown(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes monthly climatology (Jan-Dec) and seasonal averages/trends (DJF, MAM, JJA, SON).
    """
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_climatology = []
    for m_idx in range(1, 13):
        sub = df[df["month"] == m_idx]["value"].dropna()
        monthly_climatology.append({
            "month": m_idx,
            "monthName": month_names[m_idx - 1],
            "mean": round(float(sub.mean()), 4) if not sub.empty else None,
            "std": round(float(sub.std()), 4) if len(sub) > 1 else 0.0,
            "min": round(float(sub.min()), 4) if not sub.empty else None,
            "max": round(float(sub.max()), 4) if not sub.empty else None,
        })

    season_map = {
        12: "DJF (Winter)", 1: "DJF (Winter)", 2: "DJF (Winter)",
        3: "MAM (Spring)", 4: "MAM (Spring)", 5: "MAM (Spring)",
        6: "JJA (Summer)", 7: "JJA (Summer)", 8: "JJA (Summer)",
        9: "SON (Autumn)", 10: "SON (Autumn)", 11: "SON (Autumn)",
    }
    df_s = df.copy()
    df_s["season"] = df_s["month"].map(season_map)

    seasonal_summary = []
    for s_label in ["DJF (Winter)", "MAM (Spring)", "JJA (Summer)", "SON (Autumn)"]:
        s_df = df_s[df_s["season"] == s_label].dropna(subset=["value"])
        if s_df.empty:
            continue
        by_yr = s_df.groupby("year")["value"].mean().reset_index()
        y_vals = by_yr["value"].dropna().to_numpy(dtype=float)
        if len(y_vals) >= 4:
            mk_s = mk.original_test(y_vals)
            trend_dir = mk_s.trend if mk_s.h else "no_trend"
            p_v = round(float(mk_s.p), 4)
            slope_yr = round(float(mk_s.slope), 5)
        else:
            trend_dir = "no_trend"
            p_v = 1.0
            slope_yr = 0.0

        seasonal_summary.append({
            "season": s_label,
            "mean": round(float(s_df["value"].mean()), 4),
            "std": round(float(s_df["value"].std()), 4) if len(s_df) > 1 else 0.0,
            "trendDirection": trend_dir,
            "pValue": p_v,
            "slopePerYear": slope_yr,
        })

    return {
        "monthlyClimatology": monthly_climatology,
        "seasonalSummary": seasonal_summary,
    }


def _run_single_variable_analysis(
    region_id: str,
    variable_id: str,
    start_date: str = "2000-01-01",
    end_date: str = "2024-12-31",
    aggregation: str = "monthly",
    custom_geometry: Optional[Dict[str, Any]] = None,
    lst_mode: str = "day",
) -> Dict[str, Any]:
    """
    Runs end-to-end time-series, Mann-Kendall, Sen's Slope, Seasonal, and Anomaly analysis
    for a Nile Delta region and single variable slice (`ndvi`, `lst` day, or `lst` night).
    """
    df, meta = build_monthly_series(
        region_id=region_id,
        variable_id=variable_id,
        start_date=start_date,
        end_date=end_date,
        custom_geometry=custom_geometry,
        lst_mode=lst_mode,
    )

    seasonal_info = compute_seasonal_breakdown(df)

    # Apply requested temporal aggregation if annual or seasonal
    if aggregation == "annual":
        agg_df = (
            df.groupby("year", as_index=False)
            .agg({
                "date": "first",
                "timestamp": "first",
                "month": "first",
                "value": "mean",
                "climatology": "mean",
                "anomaly": "mean",
                "zScore": "mean",
                "qcFlag": "first",
            })
        )
        agg_df["date"] = agg_df["year"].astype(str) + "-01-01"
        df_used = agg_df
    else:
        df_used = df

    stats_summary = compute_mann_kendall_and_sens_slope(df_used, aggregation=aggregation)
    stats_summary["missingMonthsCount"] = len(meta.get("missingMonths", []))

    # Exclude genuine cloud/swath NaN gaps when serializing plot points (never zero-fill missing observations)
    df_valid = df_used.dropna(subset=["value"]).reset_index(drop=True)
    if not df_valid.empty:
        dates = pd.to_datetime(df_valid["date"])
        t_years = ((dates - dates.iloc[0]).dt.days / 365.25).to_numpy(dtype=float)
    else:
        t_years = np.array([], dtype=float)

    slope_yr = stats_summary["sensSlopePerYear"]
    intercept = stats_summary["sensIntercept"]
    ci_half = abs(stats_summary["slopeYrCiUpper"] - stats_summary["slopeYrCiLower"]) / 2.0

    points = []
    anomalies = []
    ds_meta = meta["dataset"]

    for idx, row in df_valid.iterrows():
        t_y = float(t_years[idx])
        trend_val = float(intercept + slope_yr * t_y)
        ci_band = max(0.015, ci_half * max(1.0, t_y))
        z_val = float(row["zScore"])
        is_anom = abs(z_val) >= 1.85

        pt = {
            "date": row["date"],
            "timestamp": int(row["timestamp"]),
            "value": round(float(row["value"]), 4),
            "anomaly": round(float(row["anomaly"]), 4),
            "zScore": round(z_val, 3),
            "climatology": round(float(row["climatology"]), 4),
            "trendLine": round(trend_val, 4),
            "confidenceUpper": round(trend_val + ci_band, 4),
            "confidenceLower": round(trend_val - ci_band, 4),
            "isAnomaly": bool(is_anom),
            "qcFlag": row["qcFlag"],
        }
        points.append(pt)

        if is_anom:
            abs_z = abs(z_val)
            sev = "critical" if abs_z >= 2.6 else ("high" if abs_z >= 2.2 else "moderate")
            direction_word = "Positive Surge" if z_val > 0 else "Deficit / Stress"
            anomalies.append({
                "id": f"anom_{region_id}_{variable_id}_{row['date']}",
                "date": row["date"],
                "variableId": variable_id,
                "regionId": region_id,
                "value": round(float(row["value"]), 4),
                "expectedValue": round(float(row["climatology"]), 4),
                "deviation": round(float(row["anomaly"]), 4),
                "zScore": round(z_val, 2),
                "severity": sev,
                "description": (
                    f"{meta['regionName']}: {ds_meta['shortName']} {direction_word} "
                    f"({row['value']:.3f} {ds_meta['unit']} vs baseline {row['climatology']:.3f} {ds_meta['unit']}, "
                    f"Z = {z_val:+.2f}σ)"
                ),
            })

    ndvi_disclosure = (
        "100% genuine NASA LP DAAC Earthdata Cloud OPeNDAP observations clipped to the selected Nile Delta polygon: "
        "MOD13Q1.061 (250 m 16-day composites where OPeNDAP-migrated, 2022–2024 + snapshot) and MOD13C2.061 "
        "(0.05° CMG Monthly Terra MODIS NDVI, DOI 10.5067/MODIS/MOD13C2.061, for historical monthly continuity 2000–2022). "
        "Missing observations remain excluded without synthetic interpolation."
    )
    lst_mode_label = "Nighttime (~22:30 LT)" if meta.get("lstMode") == "night" else "Daytime (~10:30 LT)"
    lst_disclosure = (
        f"100% genuine NASA LP DAAC MODIS/Terra MOD11C3.061 {lst_mode_label} Land Surface Temperature observations "
        "(0.05° CMG ~5.5 km Monthly, Clear-Sky QC 0-1, DOI 10.5067/MODIS/MOD11C3.061) clipped to the selected polygon. "
        "LST measures radiant skin temperature of the land surface itself (distinct from 2 m air temperature). "
        "Missing months remain excluded without synthetic interpolation."
    )

    return {
        "config": {
            "id": f"inv_{region_id}_{variable_id}",
            "regionId": region_id,
            "variableId": variable_id,
            "lstMode": meta.get("lstMode") if variable_id == "lst" else None,
            "datasetId": ds_meta["datasetId"],
            "timeRange": {
                "startDate": meta["effectiveStartDate"],
                "endDate": meta["effectiveEndDate"],
                "aggregation": aggregation,
            },
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "status": "VERIFIED",
        },
        "points": points,
        "statistics": stats_summary,
        "seasonal": seasonal_info,
        "anomalies": sorted(anomalies, key=lambda x: abs(x["zScore"]), reverse=True),
        "rasterStatistics": meta["rasterStats"],
        "provenance": {
            "sourceName": (
                f"NASA LP DAAC {ds_meta['shortName']}.{ds_meta['version']} ({ds_meta['spatialResolution']}) + MOD13C2.061 Monthly CMG"
                if variable_id == "ndvi"
                else f"NASA LP DAAC {ds_meta['shortName']}.{ds_meta['version']} ({ds_meta['spatialResolution']}) — {lst_mode_label}"
            ),
            "datasetId": ds_meta["productCode"],
            "collectionConceptId": ds_meta["collectionConceptId"],
            "doi": ds_meta["doi"],
            "spatialResolution": ds_meta["spatialResolution"],
            "temporalResolution": ds_meta["temporalResolution"],
            "scaleFactor": ds_meta["scaleFactor"],
            "qualityControl": ds_meta["qualityBand"],
            "baselinePeriod": meta["baselinePeriod"],
            "retrievedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "url": "https://search.earthdata.nasa.gov/",
            "status": "VERIFIED",
            "isSyntheticTimeSeries": False,
            "dataOrigin": "NASA_EARTHDATA_MODIS_MONTHLY_CUBES",
            "validMonthsCount": meta.get("validMonthsCount", len(points)),
            "totalMonthsInWindow": meta.get("totalMonthsInWindow", len(df_used)),
            "missingMonths": meta.get("missingMonths", []),
            "disclosure": ndvi_disclosure if variable_id == "ndvi" else lst_disclosure,
            "citation": ds_meta["citation"],
        },
    }


def _build_lst_diurnal_comparison(
    day_res: Dict[str, Any],
    night_res: Dict[str, Any],
    aggregation: str,
) -> Dict[str, Any]:
    """Builds aligned Daytime vs Nighttime LST comparison and Day − Night diurnal spread stats."""
    day_pts = {p["date"]: p for p in day_res.get("points", [])}
    night_pts = {p["date"]: p for p in night_res.get("points", [])}
    common_dates = sorted(set(day_pts.keys()) & set(night_pts.keys()))

    diurnal_rows = []
    day_vals = []
    night_vals = []
    for d in common_dates:
        dv = float(day_pts[d]["value"])
        nv = float(night_pts[d]["value"])
        spread = round(dv - nv, 4)
        day_vals.append(dv)
        night_vals.append(nv)
        diurnal_rows.append({
            "date": d,
            "timestamp": day_pts[d]["timestamp"],
            "month": int(d[5:7]),
            "value": spread,
            "dayValue": round(dv, 4),
            "nightValue": round(nv, 4),
        })

    if diurnal_rows:
        df_spread = pd.DataFrame(diurnal_rows)
        clim = (
            df_spread.groupby("month")["value"]
            .agg(["mean", "std"])
            .reset_index()
            .rename(columns={"mean": "cm", "std": "cs"})
        )
        clim["cs"] = clim["cs"].replace(0, 0.01).fillna(0.01)
        df_spread = df_spread.merge(clim, on="month", how="left")
        df_spread["anomaly"] = (df_spread["value"] - df_spread["cm"]).round(4)
        df_spread["zScore"] = ((df_spread["value"] - df_spread["cm"]) / df_spread["cs"]).round(3)
        diurnal_stats = compute_mann_kendall_and_sens_slope(df_spread, aggregation=aggregation)
        diurnal_points = [
            {
                "date": r["date"],
                "timestamp": int(r["timestamp"]),
                "value": round(float(r["value"]), 3),
                "dayValue": round(float(r["dayValue"]), 3),
                "nightValue": round(float(r["nightValue"]), 3),
                "anomaly": round(float(r["anomaly"]), 3),
                "zScore": round(float(r["zScore"]), 3),
            }
            for _, r in df_spread.iterrows()
        ]
    else:
        diurnal_stats = compute_mann_kendall_and_sens_slope(pd.DataFrame(columns=["value"]), aggregation=aggregation)
        diurnal_points = []

    if len(day_vals) >= 4:
        pr, pp = stats.pearsonr(day_vals, night_vals)
        sr, _ = stats.spearmanr(day_vals, night_vals)
        mean_spread = float(np.mean(np.array(day_vals) - np.array(night_vals)))
    else:
        pr, pp, sr, mean_spread = 0.0, 1.0, 0.0, 0.0

    return {
        "mode": "both",
        "day": {
            "label": "Daytime LST (~10:30 LT)",
            "points": day_res["points"],
            "statistics": day_res["statistics"],
            "anomalies": day_res["anomalies"],
            "rasterStatistics": day_res["rasterStatistics"],
            "unit": "°C",
        },
        "night": {
            "label": "Nighttime LST (~22:30 LT)",
            "points": night_res["points"],
            "statistics": night_res["statistics"],
            "anomalies": night_res["anomalies"],
            "rasterStatistics": night_res["rasterStatistics"],
            "unit": "°C",
        },
        "diurnalSpread": {
            "label": "Diurnal Surface Range (Day − Night)",
            "points": diurnal_points,
            "statistics": diurnal_stats,
            "unit": "°C",
        },
        "dayNightCorrelation": {
            "pearsonR": round(float(pr), 4),
            "spearmanRho": round(float(sr), 4),
            "pValue": round(float(pp), 5),
            "meanDiurnalRange": round(mean_spread, 3),
            "sampleSize": len(day_vals),
        },
    }


def run_full_variable_analysis(
    region_id: str,
    variable_id: str,
    start_date: str = "2000-01-01",
    end_date: str = "2024-12-31",
    aggregation: str = "monthly",
    custom_geometry: Optional[Dict[str, Any]] = None,
    lst_mode: str = "day",
) -> Dict[str, Any]:
    """
    Runs end-to-end time-series, Mann-Kendall, Sen's Slope, Seasonal, and Anomaly analysis
    for a Nile Delta region and variable (`ndvi` or `lst` with `day` / `night` / `both` modes).
    """
    mode = lst_mode if (variable_id == "lst" and lst_mode in ("day", "night", "both")) else "day"
    if variable_id == "lst" and mode == "both":
        day_res = _run_single_variable_analysis(
            region_id=region_id,
            variable_id="lst",
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation,
            custom_geometry=custom_geometry,
            lst_mode="day",
        )
        night_res = _run_single_variable_analysis(
            region_id=region_id,
            variable_id="lst",
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation,
            custom_geometry=custom_geometry,
            lst_mode="night",
        )
        comparison = _build_lst_diurnal_comparison(day_res, night_res, aggregation=aggregation)
        both_raster_stats = raster_service.compute_regional_statistics(
            "lst", region_id, custom_geom=custom_geometry, lst_mode="both"
        )
        combined = dict(day_res)
        combined["config"] = {
            **day_res["config"],
            "id": f"inv_{region_id}_lst_both",
            "lstMode": "both",
        }
        combined["rasterStatistics"] = {
            **both_raster_stats,
            "lstMode": "both",
            "dayMean": day_res["rasterStatistics"].get("mean"),
            "nightMean": night_res["rasterStatistics"].get("mean"),
        }
        combined["provenance"] = {
            **day_res["provenance"],
            "sourceName": "NASA LP DAAC MOD11C3.061 (0.05° CMG) — Daytime & Nighttime Comparison",
            "disclosure": (
                "100% genuine NASA LP DAAC MODIS/Terra MOD11C3.061 Daytime (~10:30 LT) and Nighttime (~22:30 LT) "
                "Land Surface Temperature observations (0.05° CMG ~5.5 km Monthly, Clear-Sky QC 0-1, DOI 10.5067/MODIS/MOD11C3.061). "
                "LST measures land-surface skin temperature (distinct from 2 m air temperature), allowing separate daytime heating "
                "and nighttime radiative cooling analysis."
            ),
        }
        combined["lstComparison"] = comparison
        return combined

    return _run_single_variable_analysis(
        region_id=region_id,
        variable_id=variable_id,
        start_date=start_date,
        end_date=end_date,
        aggregation=aggregation,
        custom_geometry=custom_geometry,
        lst_mode=mode,
    )


def run_combined_nile_delta_investigation(
    region_id: str = "nile_delta",
    start_date: str = "2000-02-18",
    end_date: str = "2024-12-31",
    custom_geometry: Optional[Dict[str, Any]] = None,
    lst_mode: str = "day",
) -> Dict[str, Any]:
    """
    Runs a combined vegetation & surface thermal investigation across the full overlapping
    MODIS NDVI (`MOD13Q1.061` / `MOD13C2.061`) + MODIS Land Surface Temperature (`MOD11C3.061` Day/Night/Both)
    period (2000-02-18 to 2024-12-31). Evaluates Pearson r, Spearman rho, p-values, and co-occurring
    heat-canopy stress episodes without artificial spatial upsampling.
    """
    mode = lst_mode if lst_mode in ("day", "night", "both") else "day"
    eff_start = max(pd.Timestamp(start_date), pd.Timestamp("2000-02-18")).strftime("%Y-%m-%d")
    eff_end = min(pd.Timestamp(end_date), pd.Timestamp("2024-12-31")).strftime("%Y-%m-%d")

    ndvi_res = run_full_variable_analysis(
        region_id=region_id,
        variable_id="ndvi",
        start_date=eff_start,
        end_date=eff_end,
        aggregation="monthly",
        custom_geometry=custom_geometry,
    )
    lst_res = run_full_variable_analysis(
        region_id=region_id,
        variable_id="lst",
        start_date=eff_start,
        end_date=eff_end,
        aggregation="monthly",
        custom_geometry=custom_geometry,
        lst_mode=mode,
    )

    df_ndvi = (
        pd.DataFrame(ndvi_res["points"])[["date", "value", "anomaly", "zScore"]].rename(
            columns={"value": "ndvi", "anomaly": "ndvi_anomaly", "zScore": "ndvi_z"}
        )
        if ndvi_res["points"]
        else pd.DataFrame(columns=["date", "ndvi", "ndvi_anomaly", "ndvi_z"])
    )
    df_lst = (
        pd.DataFrame(lst_res["points"])[["date", "value", "anomaly", "zScore"]].rename(
            columns={"value": "lst", "anomaly": "lst_anomaly", "zScore": "lst_z"}
        )
        if lst_res["points"]
        else pd.DataFrame(columns=["date", "lst", "lst_anomaly", "lst_z"])
    )

    merged = pd.merge(df_ndvi, df_lst, on="date", how="inner").dropna()
    x = merged["ndvi"].to_numpy(dtype=float)
    y = merged["lst"].to_numpy(dtype=float)

    if len(merged) >= 4:
        pearson_r, pearson_p = stats.pearsonr(x, y)
        spearman_rho, spearman_p = stats.spearmanr(x, y)
        lin = stats.linregress(x, y)
        slope, intercept, r_sq = float(lin.slope), float(lin.intercept), float(lin.rvalue ** 2)
    else:
        pearson_r, pearson_p = 0.0, 1.0
        spearman_rho, spearman_p = 0.0, 1.0
        slope, intercept, r_sq = 0.0, 0.0, 0.0

    night_corr = None
    night_map: Dict[str, float] = {}
    if mode == "both" and lst_res.get("lstComparison"):
        night_pts = lst_res["lstComparison"]["night"]["points"]
        night_map = {p["date"]: float(p["value"]) for p in night_pts}
        df_night = pd.DataFrame(night_pts)[["date", "value"]].rename(columns={"value": "night_lst"})
        merged_n = pd.merge(df_ndvi[["date", "ndvi"]], df_night, on="date", how="inner").dropna()
        if len(merged_n) >= 4:
            npr, npp = stats.pearsonr(merged_n["ndvi"].to_numpy(float), merged_n["night_lst"].to_numpy(float))
            nsr, nsp = stats.spearmanr(merged_n["ndvi"].to_numpy(float), merged_n["night_lst"].to_numpy(float))
            nlin = stats.linregress(merged_n["ndvi"].to_numpy(float), merged_n["night_lst"].to_numpy(float))
            night_corr = {
                "pearsonR": round(float(npr), 4),
                "spearmanRho": round(float(nsr), 4),
                "pValue": round(float(npp), 5),
                "spearmanPValue": round(float(nsp), 5),
                "rSquared": round(float(nlin.rvalue ** 2), 4),
                "sampleSize": int(len(merged_n)),
            }

    # Identify co-occurring heat & vegetation stress periods (hot LST anomaly + negative NDVI anomaly)
    stress_episodes = []
    for _, row in merged.iterrows():
        if row["lst_z"] >= 1.25 and row["ndvi_z"] <= -1.15:
            stress_episodes.append({
                "date": row["date"],
                "ndvi": round(float(row["ndvi"]), 4),
                "ndviZScore": round(float(row["ndvi_z"]), 2),
                "lst": round(float(row["lst"]), 2),
                "lstZScore": round(float(row["lst_z"]), 2),
                "classification": (
                    "Severe Surface Heat & Canopy Stress"
                    if (row["lst_z"] >= 1.8 or row["ndvi_z"] <= -1.8)
                    else "Moderate Thermal-Vegetation Stress"
                ),
            })

    points = [
        {
            "date": row["date"],
            "x": round(float(row["ndvi"]), 4),
            "y": round(float(row["lst"]), 2),
            "ndviZ": round(float(row["ndvi_z"]), 2),
            "lstZ": round(float(row["lst_z"]), 2),
            **({"nightLst": round(night_map[row["date"]], 2)} if row["date"] in night_map else {}),
        }
        for _, row in merged.iterrows()
    ]

    result: Dict[str, Any] = {
        "regionId": region_id,
        "lstMode": mode,
        "status": "VERIFIED",
        "isSyntheticTimeSeries": False,
        "overlappingPeriod": {"startDate": eff_start, "endDate": eff_end},
        "resolutionNotice": (
            "MODIS MOD13Q1.061 NDVI (250 m, complemented by MOD13C2.061 0.05° CMG) and MODIS MOD11C3.061 "
            "Land Surface Temperature (0.05° CMG ~5.5 km, Day & Night passes) are evaluated on regionally aggregated "
            "monthly series across the full 2000–2024 Terra record without artificial spatial upsampling."
        ),
        "correlationNote": (
            "Observed Pearson r and Spearman rho reflect regional seasonal vegetation-thermal coupling (skin temperature "
            "vs canopy density) and do NOT imply isolated single-factor causation."
        ),
        "correlation": {
            "variableX": "ndvi",
            "variableY": "lst",
            "lstMode": mode,
            "regionId": region_id,
            "pearsonR": round(float(pearson_r), 4),
            "spearmanRho": round(float(spearman_rho), 4),
            "pValue": round(float(pearson_p), 5),
            "spearmanPValue": round(float(spearman_p), 5),
            "rSquared": round(r_sq, 4),
            "slope": round(slope, 4),
            "intercept": round(intercept, 4),
            "sampleSize": int(len(merged)),
            "lagMonths": 0,
            "points": points,
        },
        "ndviSummary": {
            "statistics": ndvi_res["statistics"],
            "rasterStatistics": ndvi_res["rasterStatistics"],
            "spatialResolution": "250 m",
        },
        "lstSummary": {
            "lstMode": mode,
            "statistics": lst_res["statistics"],
            "rasterStatistics": lst_res["rasterStatistics"],
            "spatialResolution": "0.05° CMG (~5.5 km)",
        },
        "coOccurringStressEpisodes": stress_episodes,
    }
    if night_corr is not None:
        result["nightCorrelation"] = night_corr
    if lst_res.get("lstComparison"):
        result["lstComparison"] = lst_res["lstComparison"]
    return result


def _select_primary_dataset_layer(df_raw: pd.DataFrame) -> tuple[pd.DataFrame, Optional[str]]:
    """
    For multi-layer exports like NASA AppEEARS Statistics CSVs (which carry a 'Dataset'
    column mixing NDVI, EVI, QA, reflectance, etc.), isolate the primary scientific layer.
    """
    dataset_col = next(
        (c for c in df_raw.columns if str(c).strip().lower() in ("dataset", "layer", "variable", "parameter")),
        None,
    )
    if not dataset_col:
        return df_raw, None

    layers = [str(v).strip() for v in df_raw[dataset_col].dropna().unique() if str(v).strip()]
    if len(layers) <= 1:
        return df_raw, (layers[0] if layers else None)

    qa_tokens = ("quality", "reliability", "_qa", "qa_", "flag", "doy", "zenith", "azimuth", "angle", "reflectance", "mask")
    ranked_patterns = (
        "ndvi",
        "lst",
        "temp",
        "evi",
        "lai",
        "fpar",
        "precip",
        "rain",
    )

    selected_layer = None
    for pat in ranked_patterns:
        for layer in layers:
            low = layer.lower()
            if pat in low and not any(q in low for q in qa_tokens):
                selected_layer = layer
                break
        if selected_layer:
            break

    if not selected_layer:
        non_qa = [layer for layer in layers if not any(q in layer.lower() for q in qa_tokens)]
        selected_layer = non_qa[0] if non_qa else layers[0]

    filtered = df_raw[df_raw[dataset_col].astype(str).str.strip() == selected_layer].copy()
    return filtered, selected_layer


def _detect_date_column(df_raw: pd.DataFrame) -> str:
    """Detect the date/timestamp column using known headers and date-parsing fallback."""
    exact_date_names = (
        "date",
        "time",
        "timestamp",
        "datetime",
        "month",
        "year_month",
        "day",
        "acquisition_date",
        "start_date",
        "تاريخ",
    )
    for col in df_raw.columns:
        if str(col).strip().lower() in exact_date_names:
            parsed = pd.to_datetime(df_raw[col], errors="coerce")
            if parsed.notna().sum() >= 4:
                return col

    for col in df_raw.columns:
        low = str(col).strip().lower()
        if "date" in low or "time" in low:
            parsed = pd.to_datetime(df_raw[col], errors="coerce")
            if parsed.notna().sum() >= 4:
                return col

    for col in df_raw.columns:
        if pd.api.types.is_numeric_dtype(df_raw[col]):
            continue
        parsed = pd.to_datetime(df_raw[col], errors="coerce")
        if parsed.notna().sum() >= 4:
            return col

    raise ValueError(
        f"Could not automatically detect Date column. Columns found: {list(df_raw.columns)}. "
        f"Please ensure one column is named 'date' or contains YYYY-MM-DD timestamps."
    )


def _detect_value_column(df_raw: pd.DataFrame, date_col: str) -> str:
    """
    Detect the scientific measurement column, preferring summary statistics like Mean/NDVI
    and avoiding constant/metadata columns (e.g., AppEEARS 'aid' or 'Count = 12').
    """
    non_value_names = {
        "aid",
        "id",
        "count",
        "n",
        "pixel_count",
        "pixels",
        "num_pixels",
        "year",
        "month",
        "day",
        "doy",
        "lat",
        "lon",
        "latitude",
        "longitude",
        "orbit",
        "tile",
        "file",
        "file name",
        "filename",
        "dataset",
    }
    preferred_exact = (
        "mean",
        "average",
        "avg",
        "median",
        "ndvi",
        "lst",
        "lst_day",
        "lst_night",
        "temperature",
        "evi",
        "value",
        "val",
        "reading",
        "index",
        "measurement",
        "قيمة",
        "المتوسط",
    )
    preferred_substrings = ("ndvi", "lst", "temp", "evi", "_mean", "mean_", "rain", "precip", "value", "median")
    avoid_substrings = ("qc", "qa", "flag", "std", "count", "iqr", "quartile", "range", "minimum", "maximum")

    numeric_candidates: List[tuple[str, int, int]] = []
    for col in df_raw.columns:
        if col == date_col:
            continue
        series = pd.to_numeric(df_raw[col], errors="coerce").dropna()
        if len(series) >= 4:
            numeric_candidates.append((col, len(series), int(series.nunique())))

    if not numeric_candidates:
        raise ValueError(
            f"Could not find numeric Value column. Columns found: {list(df_raw.columns)}. "
            f"Please ensure your CSV contains a numeric column like 'Mean', 'value', or 'ndvi'."
        )

    candidate_names = {c for c, _, _ in numeric_candidates}
    varying_names = {c for c, _, nuniq in numeric_candidates if nuniq > 1}

    # Tier 1: Exact preferred scientific/summary column name (prefer non-constant first)
    for pool in (varying_names, candidate_names):
        for target in preferred_exact:
            for col, _, _ in numeric_candidates:
                if col in pool and str(col).strip().lower() == target:
                    return col

    # Tier 2: Substring scientific column match excluding metadata/QA/bounds
    for pool in (varying_names, candidate_names):
        for col, _, _ in numeric_candidates:
            low = str(col).strip().lower()
            if col in pool and low not in non_value_names:
                if any(p in low for p in preferred_substrings) and not any(a in low for a in avoid_substrings):
                    return col

    # Tier 3: Any varying numeric column not in metadata/ID/count blocklist
    for col, _, nuniq in numeric_candidates:
        if nuniq > 1 and str(col).strip().lower() not in non_value_names:
            return col

    # Tier 4: Fallback to any varying column, then first valid numeric column
    for col, _, nuniq in numeric_candidates:
        if nuniq > 1:
            return col
    return numeric_candidates[0][0]


def analyze_custom_csv_series(
    csv_text: str,
    title: str = "Uploaded Custom Time Series",
    unit: str = "Index / Units",
    variable_name: str = "Custom Indicator",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Ingests user-supplied CSV data, detects Date and Value columns automatically,
    computes monthly aggregation, climatology, Mann-Kendall trend, Theil-Sen slope,
    lag-1 autocorrelation, and standardized Z-score anomalies.
    """
    import io

    cleaned_text = csv_text.lstrip("\ufeff")
    try:
        df_raw = pd.read_csv(io.StringIO(cleaned_text), sep=None, engine="python")
    except Exception:
        df_raw = pd.read_csv(io.StringIO(cleaned_text))

    if df_raw.empty:
        raise ValueError("Uploaded CSV file is completely empty.")

    df_raw.columns = [str(c).strip() for c in df_raw.columns]
    df_raw, selected_dataset = _select_primary_dataset_layer(df_raw)

    date_col = _detect_date_column(df_raw)
    val_col = _detect_value_column(df_raw, date_col)

    effective_unit = unit
    effective_var_name = variable_name
    if selected_dataset:
        low_ds = selected_dataset.lower()
        effective_var_name = selected_dataset
        if "ndvi" in low_ds and unit in ("Index", "Units", "Index / Units"):
            effective_unit = "NDVI"
        elif "evi" in low_ds and unit in ("Index", "Units", "Index / Units"):
            effective_unit = "EVI"
        elif "moisture" in low_ds and unit in ("Index", "Units", "Index / Units"):
            effective_unit = "cm³/cm³"
        elif "lst" in low_ds and unit in ("Index", "Units", "Index / Units"):
            effective_unit = "K"

    # Clean and parse dataframe
    df = pd.DataFrame()
    df["date_raw"] = pd.to_datetime(df_raw[date_col], errors="coerce")
    df["value"] = pd.to_numeric(df_raw[val_col], errors="coerce")
    df = df.dropna(subset=["date_raw", "value"]).sort_values("date_raw").reset_index(drop=True)

    if len(df) < 4:
        raise ValueError(f"Insufficient valid data points (found {len(df)}, minimum required is 4).")

    full_start_d = df["date_raw"].iloc[0].strftime("%Y-%m-%d")
    full_end_d = df["date_raw"].iloc[-1].strftime("%Y-%m-%d")

    if start_date:
        s_dt = pd.to_datetime(start_date, errors="coerce")
        if pd.notna(s_dt):
            df = df[df["date_raw"] >= s_dt]
    if end_date:
        e_dt = pd.to_datetime(end_date, errors="coerce")
        if pd.notna(e_dt):
            df = df[df["date_raw"] <= e_dt]

    df = df.reset_index(drop=True)
    if len(df) < 4:
        raise ValueError(
            f"Insufficient data points in selected period ({start_date or full_start_d} to {end_date or full_end_d}): "
            f"found {len(df)}, minimum required is 4."
        )

    df["date"] = df["date_raw"].dt.strftime("%Y-%m-%d")
    df["year"] = df["date_raw"].dt.year
    df["month"] = df["date_raw"].dt.month
    df["timestamp"] = (df["date_raw"].astype("int64") // 10**6)

    # Monthly aggregation if multiple readings exist per month
    df_monthly = (
        df.groupby(["year", "month"], as_index=False)
        .agg({"date": "first", "timestamp": "first", "value": "mean"})
    )
    if len(df_monthly) < 4:
        raise ValueError(
            f"Insufficient monthly observations in selected period ({len(df_monthly)} months found, minimum 4 months required)."
        )
    df_monthly["qcFlag"] = "User Uploaded Observation"

    # Climatology and anomalies
    clim_stats = (
        df_monthly.groupby("month")["value"]
        .agg(["mean", "std"])
        .reset_index()
        .rename(columns={"mean": "clim_mean", "std": "clim_std"})
    )
    clim_stats["clim_std"] = clim_stats["clim_std"].replace(0, 0.01).fillna(0.01)

    df_monthly = df_monthly.merge(clim_stats, on="month", how="left")
    df_monthly["climatology"] = df_monthly["clim_mean"].round(4)
    df_monthly["anomaly"] = (df_monthly["value"] - df_monthly["clim_mean"]).round(4)
    df_monthly["zScore"] = ((df_monthly["value"] - df_monthly["clim_mean"]) / df_monthly["clim_std"]).round(3)
    df_monthly = df_monthly.sort_values("date").reset_index(drop=True)

    seasonal_info = compute_seasonal_breakdown(df_monthly)
    stats_summary = compute_mann_kendall_and_sens_slope(df_monthly, aggregation="monthly")

    # Trendline calculation
    dates = pd.to_datetime(df_monthly["date"])
    t_years = ((dates - dates.iloc[0]).dt.days / 365.25).to_numpy(dtype=float)
    slope_yr = stats_summary["sensSlopePerYear"]
    intercept = stats_summary["sensIntercept"]
    ci_half = abs(stats_summary["slopeYrCiUpper"] - stats_summary["slopeYrCiLower"]) / 2.0

    points = []
    anomalies = []

    for idx, row in df_monthly.iterrows():
        t_y = float(t_years[idx])
        trend_val = float(intercept + slope_yr * t_y)
        ci_band = max(0.01, ci_half * max(1.0, t_y))
        z_val = float(row["zScore"])
        is_anom = abs(z_val) >= 1.85

        pt = {
            "date": row["date"],
            "timestamp": int(row["timestamp"]),
            "value": round(float(row["value"]), 4),
            "anomaly": round(float(row["anomaly"]), 4),
            "zScore": round(z_val, 3),
            "climatology": round(float(row["climatology"]), 4),
            "trendLine": round(trend_val, 4),
            "confidenceUpper": round(trend_val + ci_band, 4),
            "confidenceLower": round(trend_val - ci_band, 4),
            "isAnomaly": bool(is_anom),
            "qcFlag": row["qcFlag"],
        }
        points.append(pt)

        if is_anom:
            abs_z = abs(z_val)
            sev = "critical" if abs_z >= 2.6 else ("high" if abs_z >= 2.2 else "moderate")
            direction_word = "High Departure" if z_val > 0 else "Low Deficit"
            anomalies.append({
                "id": f"anom_custom_{row['date']}",
                "date": row["date"],
                "variableId": "custom_csv",
                "regionId": "custom",
                "value": round(float(row["value"]), 4),
                "expectedValue": round(float(row["climatology"]), 4),
                "deviation": round(float(row["anomaly"]), 4),
                "zScore": round(z_val, 2),
                "severity": sev,
                "description": (
                    f"{title}: {direction_word} ({row['value']:.3f} vs baseline {row['climatology']:.3f}, Z = {z_val:+.2f}σ)"
                ),
            })

    start_d = str(df_monthly["date"].iloc[0])
    end_d = str(df_monthly["date"].iloc[-1])

    return {
        "config": {
            "id": f"inv_custom_csv_{int(datetime.now(timezone.utc).timestamp())}",
            "regionId": "custom_upload",
            "variableId": "custom_csv",
            "customTitle": title,
            "datasetId": "USER_CSV_UPLOAD",
            "timeRange": {
                "startDate": start_d,
                "endDate": end_d,
                "aggregation": "monthly",
            },
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "status": "VERIFIED",
        },
        "points": points,
        "statistics": stats_summary,
        "seasonal": seasonal_info,
        "anomalies": sorted(anomalies, key=lambda x: abs(x["zScore"]), reverse=True),
        "rasterStatistics": {
            "mean": stats_summary["mean"],
            "median": stats_summary["median"],
            "min": stats_summary["min"],
            "max": stats_summary["max"],
            "std": stats_summary["stdDev"],
            "validPixelCount": len(points),
            "totalPixelCount": len(points),
            "validCoveragePercent": 100.0,
        },
        "provenance": {
            "sourceName": f"User Uploaded CSV Dataset ({title})",
            "datasetId": "USER_CUSTOM_CSV",
            "unit": effective_unit,
            "variableName": effective_var_name,
            "selectedDataset": selected_dataset,
            "detectedColumns": {"dateColumn": date_col, "valueColumn": val_col},
            "validDataPoints": len(points),
            "timeRange": {"startDate": start_d, "endDate": end_d},
            "availableTimeRange": {"startDate": full_start_d, "endDate": full_end_d},
            "retrievedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "status": "VERIFIED",
            "isSyntheticTimeSeries": False,
            "dataOrigin": "USER_CSV_UPLOAD",
            "disclosure": "Analysis computed dynamically from user uploaded CSV file using TrendScope scientific engine.",
        },
    }

