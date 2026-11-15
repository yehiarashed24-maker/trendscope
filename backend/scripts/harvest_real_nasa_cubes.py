"""
Harvests real multi-year monthly NASA Earthdata Cloud OPeNDAP satellite cubes
over the Nile Delta study area:
1. MODIS/Terra MOD13Q1.061 NDVI (2000-02 to 2024-12) from LP DAAC (C1748066515-LPCLOUD)
2. SMAP Enhanced L3 SPL3SMP_E.006 Soil Moisture (2015-04 to 2024-12) from NSIDC DAAC (C2938664763-NSIDC_CPRD)

Applies official NASA scale factors (MOD13Q1 * 0.0001) and QA bitmasks
(pixel_reliability in {0, 1}; SMAP retrieval_qual_flag != 15 and bit 1 == 0),
stores NaN for cloud/water/fill without synthetic interpolation, and saves compact
georeferenced NumPy + JSON metadata archives in data/cache/.
"""

import json
import math
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from backend.config import CACHE_DIR, settings
from backend.services.nasa_engine import nasa_engine


MODIS_CUBE_NPZ = CACHE_DIR / "real_mod13q1_monthly_cube.npz"
MODIS_CUBE_META = CACHE_DIR / "real_mod13q1_monthly_meta.json"
MODIS_LST_DAY_NPZ = CACHE_DIR / "real_mod11c3_day_monthly_cube.npz"
MODIS_LST_DAY_META = CACHE_DIR / "real_mod11c3_day_monthly_meta.json"
MODIS_LST_NIGHT_NPZ = CACHE_DIR / "real_mod11c3_night_monthly_cube.npz"
MODIS_LST_NIGHT_META = CACHE_DIR / "real_mod11c3_night_monthly_meta.json"
SMAP_CUBE_NPZ = CACHE_DIR / "real_spl3smp_e_monthly_cube.npz"
SMAP_CUBE_META = CACHE_DIR / "real_spl3smp_e_monthly_meta.json"


def _auth_headers() -> Dict[str, str]:
    tok = settings.EARTHDATA_TOKEN.strip()
    return {"Authorization": f"Bearer {tok}"} if tok else {}


def _cmr_search(short_name: str, version: str, start: str, end: str, page_size: int = 2000) -> List[Dict[str, Any]]:
    b = nasa_engine.NILE_DELTA_BBOX
    url = (
        f"https://cmr.earthdata.nasa.gov/search/granules.json?"
        f"short_name={short_name}&version={version}"
        f"&bounding_box={b[0]},{b[1]},{b[2]},{b[3]}"
        f"&temporal={start}T00:00:00Z,{end}T23:59:59Z"
        f"&page_size={page_size}&sort_key=start_date"
    )
    req = urllib.request.Request(url, headers=_auth_headers())
    with urllib.request.urlopen(req, timeout=25) as r:
        data = json.loads(r.read().decode("utf-8"))
    return data.get("feed", {}).get("entry", [])


def _fetch_modis_month_grid(item: Tuple[str, str, str]) -> Tuple[str, str, str, np.ndarray, int]:
    ym, title, obs_date = item
    # 250m Sinusoidal tile h20v05 subsampled (step 20x24 -> ~5km sampling of 250m grid, mapped onto 36x48 WGS84)
    y_start, y_step, y_end = 4041, 20, 4741
    x_start, x_step, x_end = 2680, 24, 3736
    ce = urllib.parse.quote(
        f"/MODIS_Grid_16DAY_250m_500m_VI/Data_Fields/_250m_16_days_NDVI[{y_start}:{y_step}:{y_end}][{x_start}:{x_step}:{x_end}];"
        f"/MODIS_Grid_16DAY_250m_500m_VI/Data_Fields/_250m_16_days_pixel_reliability[{y_start}:{y_step}:{y_end}][{x_start}:{x_step}:{x_end}]",
        safe="/,:;",
    )
    dap_url = (
        f"https://opendap.earthdata.nasa.gov/collections/C1748066515-LPCLOUD/granules/"
        f"{title}.dap.csv?dap4.ce={ce}"
    )

    out_rows, out_cols = 36, 48
    grid = np.full((out_rows, out_cols), np.nan, dtype=np.float32)

    for attempt in range(2):
        try:
            req = urllib.request.Request(dap_url, headers=_auth_headers())
            with urllib.request.urlopen(req, timeout=25) as resp:
                csv_text = resp.read().decode("utf-8", errors="ignore")
            raw_ndvi = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "_250m_16_days_NDVI"), dtype=np.float64)
            raw_qa = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "_250m_16_days_pixel_reliability"), dtype=np.float64)
            if raw_ndvi.size == 0:
                continue

            nrows_sin, ncols_sin = raw_ndvi.shape
            west, south, east, north = nasa_engine.NILE_DELTA_BBOX
            lats = np.linspace(north, south, out_rows)
            lons = np.linspace(west, east, out_cols)

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
                        if -2000 <= val <= 10000 and qa in (0, 1):
                            scaled = float(val) * 0.0001
                            if scaled >= 0.02:
                                grid[r_idx, c_idx] = round(scaled, 4)
            return ym, title, obs_date, grid, int(np.sum(~np.isnan(grid)))
        except Exception:
            time.sleep(0.5 * (attempt + 1))

    return ym, title, obs_date, grid, 0


def harvest_modis_cube(force: bool = False) -> None:
    if MODIS_CUBE_NPZ.exists() and MODIS_CUBE_META.exists() and not force:
        print("MODIS cube already present.")
        return

    t0 = time.time()
    print("Searching CMR for MOD13Q1.061 h20v05 (2000-2024)...")
    entries = _cmr_search("MOD13Q1", "061", "2000-02-01", "2024-12-31", page_size=2000)
    h20_entries = [e for e in entries if "h20v05" in e.get("title", "")]
    print(f"Found {len(h20_entries)} h20v05 granules.")

    # Pick 1 representative composite closest to the 15th of each month
    by_ym: Dict[str, Tuple[int, str, str]] = {}
    for e in h20_entries:
        ts = e.get("time_start", "")
        if len(ts) < 10:
            continue
        ym = ts[:7]
        day = int(ts[8:10])
        dist = abs(day - 15)
        if ym not in by_ym or dist < by_ym[ym][0]:
            by_ym[ym] = (dist, e["title"], ts[:10])

    tasks = [(ym, by_ym[ym][1], by_ym[ym][2]) for ym in sorted(by_ym.keys())]
    print(f"Downloading {len(tasks)} monthly MODIS OPeNDAP subsets via 16 threads...")

    cube = np.full((len(tasks), 36, 48), np.nan, dtype=np.float32)
    records: List[Dict[str, Any]] = [None] * len(tasks)  # type: ignore
    ym_to_idx = {t[0]: i for i, t in enumerate(tasks)}

    done = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        futs = [ex.submit(_fetch_modis_month_grid, t) for t in tasks]
        for fut in as_completed(futs):
            ym, title, obs_date, grid, valid_cnt = fut.result()
            idx = ym_to_idx[ym]
            cube[idx] = grid
            records[idx] = {
                "ym": ym,
                "date": f"{ym}-01",
                "observationDate": obs_date,
                "granuleTitle": title,
                "validPixels": valid_cnt,
            }
            done += 1
            if done % 50 == 0 or done == len(tasks):
                print(f"  MODIS progress: {done}/{len(tasks)} ({time.time() - t0:.1f}s)")

    west, south, east, north = nasa_engine.NILE_DELTA_BBOX
    np.savez_compressed(MODIS_CUBE_NPZ, values=cube)
    meta = {
        "variableId": "ndvi",
        "productCode": "MOD13Q1.061",
        "doi": "10.5067/MODIS/MOD13Q1.061",
        "source": "NASA LP DAAC Earthdata Cloud OPeNDAP (C1748066515-LPCLOUD)",
        "nativeResolution": "250 m",
        "bbox": [west, south, east, north],
        "rows": 36,
        "cols": 48,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "months": records,
    }
    MODIS_CUBE_META.write_text(json.dumps(meta), encoding="utf-8")
    print(f"Saved MODIS cube ({len(tasks)} months) in {time.time() - t0:.1f}s.")


def _fetch_modis_cmg_month_grid(item: Tuple[str, str, str]) -> Tuple[str, str, str, np.ndarray, int]:
    ym, title, obs_date = item
    y0, y1 = 1168, 1197
    x0, x1 = 4197, 4246
    ce = urllib.parse.quote(
        f"/MOD_Grid_monthly_CMG_VI/Data_Fields/CMG_0_05_Deg_Monthly_NDVI[{y0}:1:{y1}][{x0}:1:{x1}];"
        f"/MOD_Grid_monthly_CMG_VI/Data_Fields/CMG_0_05_Deg_Monthly_VI_Quality[{y0}:1:{y1}][{x0}:1:{x1}]",
        safe="/,:;",
    )
    dap_url = (
        f"https://opendap.earthdata.nasa.gov/collections/C2565788914-LPCLOUD/granules/"
        f"{title}.dap.csv?dap4.ce={ce}"
    )

    out_rows, out_cols = 36, 48
    grid = np.full((out_rows, out_cols), np.nan, dtype=np.float32)

    for attempt in range(2):
        try:
            req = urllib.request.Request(dap_url, headers=_auth_headers())
            with urllib.request.urlopen(req, timeout=25) as resp:
                csv_text = resp.read().decode("utf-8", errors="ignore")
            raw_ndvi = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "CMG_0_05_Deg_Monthly_NDVI"), dtype=np.float64)
            raw_qa = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "CMG_0_05_Deg_Monthly_VI_Quality"), dtype=np.float64)
            if raw_ndvi.size == 0:
                continue

            nrows_cmg, ncols_cmg = raw_ndvi.shape
            west, south, east, north = nasa_engine.NILE_DELTA_BBOX
            lats = np.linspace(north, south, out_rows)
            lons = np.linspace(west, east, out_cols)

            for r_idx, lat in enumerate(lats):
                s_r = min(max(int(round((89.975 - lat) / 0.05)) - y0, 0), nrows_cmg - 1)
                for c_idx, lon in enumerate(lons):
                    s_c = min(max(int(round((lon + 179.975) / 0.05)) - x0, 0), ncols_cmg - 1)
                    val = raw_ndvi[s_r, s_c]
                    qa = int(raw_qa[s_r, s_c]) if raw_qa.shape == raw_ndvi.shape else 0
                    # Bits 0-1 MODLAND VI Quality: 00 (good) or 01 (useful); >=2 indicates cloudy/snow/not produced
                    if -2000 <= val <= 10000 and (qa & 0x03) in (0, 1):
                        scaled = float(val) * 0.0001
                        if scaled >= 0.02:
                            grid[r_idx, c_idx] = round(scaled, 4)
            return ym, title, obs_date, grid, int(np.sum(~np.isnan(grid)))
        except Exception:
            time.sleep(0.5 * (attempt + 1))

    return ym, title, obs_date, grid, 0


def backfill_modis_cmg_months() -> None:
    if not MODIS_CUBE_NPZ.exists() or not MODIS_CUBE_META.exists():
        harvest_modis_cube(force=False)

    meta = json.loads(MODIS_CUBE_META.read_text(encoding="utf-8"))
    cube = np.load(MODIS_CUBE_NPZ)["values"].astype(np.float32)
    records = meta.get("months", [])

    missing_indices = [
        i for i, rec in enumerate(records)
        if int(rec.get("validPixels", 0)) == 0
    ]
    for rec in records:
        if int(rec.get("validPixels", 0)) > 0 and "productCode" not in rec:
            rec["productCode"] = "MOD13Q1.061"

    if not missing_indices:
        print(f"All {len(records)} MODIS months already populated.")
        return

    t0 = time.time()
    print(f"Searching CMR for MOD13C2.061 CMG (2000-2024) to backfill {len(missing_indices)} months...")
    entries = _cmr_search("MOD13C2", "061", "2000-02-01", "2024-12-31", page_size=400)
    by_ym: Dict[str, Tuple[str, str]] = {}
    for e in entries:
        ts = e.get("time_start", "")
        if len(ts) >= 10:
            by_ym[ts[:7]] = (e["title"], ts[:10])

    tasks: List[Tuple[str, str, str]] = []
    ym_to_idx: Dict[str, int] = {}
    for idx in missing_indices:
        ym = records[idx]["ym"]
        if ym in by_ym:
            title, obs_date = by_ym[ym]
            tasks.append((ym, title, obs_date))
            ym_to_idx[ym] = idx

    print(f"Downloading {len(tasks)} monthly MOD13C2.061 OPeNDAP subsets via 16 threads...")
    done = 0
    filled = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        futs = [ex.submit(_fetch_modis_cmg_month_grid, t) for t in tasks]
        for fut in as_completed(futs):
            ym, title, obs_date, grid, valid_cnt = fut.result()
            idx = ym_to_idx[ym]
            if valid_cnt > 0:
                cube[idx] = grid
                records[idx] = {
                    "ym": ym,
                    "date": f"{ym}-01",
                    "observationDate": obs_date,
                    "granuleTitle": title,
                    "productCode": "MOD13C2.061",
                    "validPixels": valid_cnt,
                }
                filled += 1
            done += 1
            if done % 50 == 0 or done == len(tasks):
                print(f"  MOD13C2 backfill progress: {done}/{len(tasks)} (filled {filled}, {time.time() - t0:.1f}s)")

    np.savez_compressed(MODIS_CUBE_NPZ, values=cube)
    meta["productComposition"] = {
        "MOD13Q1.061": {
            "count": sum(1 for r in records if r.get("productCode") == "MOD13Q1.061" and int(r.get("validPixels", 0)) > 0),
            "doi": "10.5067/MODIS/MOD13Q1.061",
            "nativeResolution": "250 m",
        },
        "MOD13C2.061": {
            "count": sum(1 for r in records if r.get("productCode") == "MOD13C2.061" and int(r.get("validPixels", 0)) > 0),
            "doi": "10.5067/MODIS/MOD13C2.061",
            "nativeResolution": "0.05 deg CMG (~5.5 km)",
        },
    }
    meta["retrievedAt"] = datetime.now(timezone.utc).isoformat()
    MODIS_CUBE_META.write_text(json.dumps(meta), encoding="utf-8")
    print(f"Backfilled {filled}/{len(tasks)} missing MODIS months in {time.time() - t0:.1f}s.")


def _fetch_smap_month_grid(item: Tuple[str, List[Tuple[str, str]]]) -> Tuple[str, str, str, np.ndarray, int]:
    ym, passes = item
    r_start, r_end = 385, 404
    c_start, c_end = 2247, 2274
    nrows = r_end - r_start + 1
    ncols = c_end - c_start + 1
    ce = urllib.parse.quote(
        f"/Soil_Moisture_Retrieval_Data_AM/soil_moisture[{r_start}:1:{r_end}][{c_start}:1:{c_end}];"
        f"/Soil_Moisture_Retrieval_Data_AM/retrieval_qual_flag[{r_start}:1:{r_end}][{c_start}:1:{c_end}];"
        f"/Soil_Moisture_Retrieval_Data_PM/soil_moisture_pm[{r_start}:1:{r_end}][{c_start}:1:{c_end}];"
        f"/Soil_Moisture_Retrieval_Data_PM/retrieval_qual_flag_pm[{r_start}:1:{r_end}][{c_start}:1:{c_end}]",
        safe="/,:;",
    )

    stack: List[np.ndarray] = []
    used_titles: List[str] = []
    obs_date = f"{ym}-15"

    for title, dt in passes:
        if not title.endswith(".h5"):
            title = f"{title}.h5"
        dap_url = (
            f"https://opendap.earthdata.nasa.gov/collections/C2938664763-NSIDC_CPRD/granules/"
            f"{title}.dap.csv?dap4.ce={ce}"
        )
        for attempt in range(2):
            try:
                req = urllib.request.Request(dap_url, headers=_auth_headers())
                with urllib.request.urlopen(req, timeout=25) as resp:
                    csv_text = resp.read().decode("utf-8", errors="ignore")
                sm_am = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "soil_moisture["), dtype=np.float64)
                qa_am = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "retrieval_qual_flag["), dtype=np.float64)
                sm_pm = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "soil_moisture_pm["), dtype=np.float64)
                qa_pm = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "retrieval_qual_flag_pm["), dtype=np.float64)
                if sm_am.shape == (nrows, ncols):
                    g = np.full((nrows, ncols), np.nan, dtype=np.float32)
                    for r in range(nrows):
                        for c in range(ncols):
                            v_am = sm_am[r, c]
                            q_am = int(qa_am[r, c]) if qa_am.shape == (nrows, ncols) else 0
                            v_pm = sm_pm[r, c] if sm_pm.shape == (nrows, ncols) else -9999.0
                            q_pm = int(qa_pm[r, c]) if qa_pm.shape == (nrows, ncols) else 15
                            if 0.02 <= v_am <= 0.50 and q_am != 15 and (q_am & 2) == 0:
                                g[r, c] = round(float(v_am), 4)
                            elif 0.02 <= v_pm <= 0.50 and q_pm != 15 and (q_pm & 2) == 0:
                                g[r, c] = round(float(v_pm), 4)
                    stack.append(g)
                    used_titles.append(title)
                    if len(used_titles) == 1:
                        obs_date = dt
                    break
            except Exception:
                time.sleep(0.5 * (attempt + 1))

    if stack:
        arr_stack = np.stack(stack, axis=0)
        with np.errstate(all="ignore"):
            mean_grid = np.nanmean(arr_stack, axis=0).astype(np.float32)
    else:
        mean_grid = np.full((nrows, ncols), np.nan, dtype=np.float32)

    valid_cnt = int(np.sum(~np.isnan(mean_grid)))
    return ym, ", ".join(used_titles), obs_date, mean_grid, valid_cnt


def harvest_smap_cube(force: bool = False) -> None:
    if SMAP_CUBE_NPZ.exists() and SMAP_CUBE_META.exists() and not force:
        print("SMAP cube already present.")
        return

    t0 = time.time()
    print("Searching CMR for SPL3SMP_E.006 (2015-2024) by year...")
    all_entries: List[Dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = [
            ex.submit(_cmr_search, "SPL3SMP_E", "006", f"{yr}-01-01", f"{yr}-12-31", 400)
            for yr in range(2015, 2025)
        ]
        for fut in as_completed(futs):
            all_entries.extend(fut.result())

    print(f"Found {len(all_entries)} daily SMAP granules across 2015-2024.")

    # Group by YYYY-MM and pick up to 3 passes spaced across the month (near days 8, 15, 22) for swath fill
    by_ym: Dict[str, List[Dict[str, Any]]] = {}
    for e in all_entries:
        ts = e.get("time_start", "")
        if len(ts) < 10 or ts[:7] < "2015-04":
            continue
        by_ym.setdefault(ts[:7], []).append(e)

    tasks: List[Tuple[str, List[Tuple[str, str]]]] = []
    for ym in sorted(by_ym.keys()):
        cands = sorted(by_ym[ym], key=lambda x: x["time_start"])
        picked: List[Tuple[str, str]] = []
        used_titles = set()
        for target_day in (8, 15, 22):
            best = min(cands, key=lambda x: abs(int(x["time_start"][8:10]) - target_day))
            if best["title"] not in used_titles:
                used_titles.add(best["title"])
                picked.append((best["title"], best["time_start"][:10]))
        if len(picked) < 2 and len(cands) >= 2:
            for c in cands:
                if c["title"] not in used_titles:
                    used_titles.add(c["title"])
                    picked.append((c["title"], c["time_start"][:10]))
                if len(picked) >= 2:
                    break
        tasks.append((ym, picked))

    print(f"Downloading {len(tasks)} monthly SMAP multi-pass OPeNDAP composites via 12 threads...")
    cube = np.full((len(tasks), 20, 28), np.nan, dtype=np.float32)
    records: List[Dict[str, Any]] = [None] * len(tasks)  # type: ignore
    ym_to_idx = {t[0]: i for i, t in enumerate(tasks)}

    done = 0
    with ThreadPoolExecutor(max_workers=12) as ex:
        futs = [ex.submit(_fetch_smap_month_grid, t) for t in tasks]
        for fut in as_completed(futs):
            ym, g_titles, obs_date, grid, valid_cnt = fut.result()
            idx = ym_to_idx[ym]
            cube[idx] = grid
            records[idx] = {
                "ym": ym,
                "date": f"{ym}-01",
                "observationDate": obs_date,
                "granuleTitle": g_titles,
                "validPixels": valid_cnt,
            }
            done += 1
            if done % 20 == 0 or done == len(tasks):
                print(f"  SMAP progress: {done}/{len(tasks)} ({time.time() - t0:.1f}s)")

    r_start, r_end = 385, 404
    c_start, c_end = 2247, 2274
    lats = [
        round(math.degrees(math.asin(max(-1.0, min(1.0, (1.0 - (2.0 * r) / (1624.0 - 1.0)) * math.sin(math.radians(85.0445)))))), 4)
        for r in range(r_start, r_end + 1)
    ]
    lons = [round(((2.0 * c) / (3856.0 - 1.0) - 1.0) * 180.0, 4) for c in range(c_start, c_end + 1)]

    np.savez_compressed(SMAP_CUBE_NPZ, values=cube)
    meta = {
        "variableId": "soil_moisture",
        "productCode": "SPL3SMP_E.006",
        "doi": "10.5067/M20OXIZHY3RJ",
        "source": "NASA NSIDC DAAC Earthdata Cloud OPeNDAP (C2938664763-NSIDC_CPRD)",
        "nativeResolution": "9 km EASE-Grid 2.0",
        "bbox": [min(lons), min(lats), max(lons), max(lats)],
        "rows": 20,
        "cols": 28,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "months": records,
    }
    SMAP_CUBE_META.write_text(json.dumps(meta), encoding="utf-8")
    print(f"Saved SMAP cube ({len(tasks)} months) in {time.time() - t0:.1f}s.")


def _fetch_mod11c3_month_grids(item: Tuple[str, str, str]) -> Tuple[str, str, str, np.ndarray, int, np.ndarray, int]:
    """Fetch monthly MODIS/Terra MOD11C3.061 Daytime and Nighttime LST (Celsius) over Nile Delta."""
    ym, title, obs_date = item
    y0, y1 = 1168, 1197
    x0, x1 = 4197, 4246
    ce = urllib.parse.quote(
        f"/MODIS_MONTHLY_0_05DEG_CMG_LST/Data_Fields/LST_Day_CMG[{y0}:1:{y1}][{x0}:1:{x1}];"
        f"/MODIS_MONTHLY_0_05DEG_CMG_LST/Data_Fields/QC_Day[{y0}:1:{y1}][{x0}:1:{x1}];"
        f"/MODIS_MONTHLY_0_05DEG_CMG_LST/Data_Fields/LST_Night_CMG[{y0}:1:{y1}][{x0}:1:{x1}];"
        f"/MODIS_MONTHLY_0_05DEG_CMG_LST/Data_Fields/QC_Night[{y0}:1:{y1}][{x0}:1:{x1}]",
        safe="/,:;",
    )
    dap_url = (
        f"https://opendap.earthdata.nasa.gov/collections/C2565788897-LPCLOUD/granules/"
        f"{title}.dap.csv?dap4.ce={ce}"
    )

    out_rows, out_cols = 36, 48
    day_grid = np.full((out_rows, out_cols), np.nan, dtype=np.float32)
    night_grid = np.full((out_rows, out_cols), np.nan, dtype=np.float32)

    for attempt in range(3):
        try:
            req = urllib.request.Request(dap_url, headers=_auth_headers())
            with urllib.request.urlopen(req, timeout=25) as resp:
                csv_text = resp.read().decode("utf-8", errors="ignore")
            raw_day = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "LST_Day_CMG"), dtype=np.float64)
            raw_qc_day = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "QC_Day"), dtype=np.float64)
            raw_night = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "LST_Night_CMG"), dtype=np.float64)
            raw_qc_night = np.array(nasa_engine._parse_dap4_csv_2d(csv_text, "QC_Night"), dtype=np.float64)
            if raw_day.size == 0 or raw_night.size == 0:
                continue

            nrows_cmg, ncols_cmg = raw_day.shape
            west, south, east, north = nasa_engine.NILE_DELTA_BBOX
            lats = np.linspace(north, south, out_rows)
            lons = np.linspace(west, east, out_cols)

            for r_idx, lat in enumerate(lats):
                s_r = min(max(int(round((89.975 - lat) / 0.05)) - y0, 0), nrows_cmg - 1)
                for c_idx, lon in enumerate(lons):
                    s_c = min(max(int(round((lon + 179.975) / 0.05)) - x0, 0), ncols_cmg - 1)

                    vd = raw_day[s_r, s_c]
                    qd = int(raw_qc_day[s_r, s_c]) if raw_qc_day.shape == raw_day.shape else 0
                    if 7500 <= vd <= 65535 and (qd & 0x03) in (0, 1):
                        temp_c = float(vd) * 0.02 - 273.15
                        if -20.0 <= temp_c <= 80.0:
                            day_grid[r_idx, c_idx] = round(temp_c, 2)

                    vn = raw_night[s_r, s_c]
                    qn = int(raw_qc_night[s_r, s_c]) if raw_qc_night.shape == raw_night.shape else 0
                    if 7500 <= vn <= 65535 and (qn & 0x03) in (0, 1):
                        temp_c_n = float(vn) * 0.02 - 273.15
                        if -20.0 <= temp_c_n <= 80.0:
                            night_grid[r_idx, c_idx] = round(temp_c_n, 2)

            return (
                ym,
                title,
                obs_date,
                day_grid,
                int(np.sum(~np.isnan(day_grid))),
                night_grid,
                int(np.sum(~np.isnan(night_grid))),
            )
        except Exception:
            time.sleep(0.5 * (attempt + 1))

    return ym, title, obs_date, day_grid, 0, night_grid, 0


def harvest_modis_lst_cubes(force: bool = False) -> None:
    if (
        MODIS_LST_DAY_NPZ.exists()
        and MODIS_LST_DAY_META.exists()
        and MODIS_LST_NIGHT_NPZ.exists()
        and MODIS_LST_NIGHT_META.exists()
        and not force
    ):
        print("MODIS LST Day/Night cubes already present.")
        return

    t0 = time.time()
    print("Searching CMR for MOD11C3.061 (2000-02 to 2024-12)...")
    entries = _cmr_search("MOD11C3", "061", "2000-02-01", "2024-12-31", page_size=500)
    by_ym: Dict[str, Tuple[str, str]] = {}
    for e in entries:
        ts = e.get("time_start", "")
        if len(ts) >= 10:
            by_ym[ts[:7]] = (e["title"], ts[:10])

    tasks = sorted((ym, v[0], v[1]) for ym, v in by_ym.items())
    out_rows, out_cols = 36, 48
    day_cube = np.full((len(tasks), out_rows, out_cols), np.nan, dtype=np.float32)
    night_cube = np.full((len(tasks), out_rows, out_cols), np.nan, dtype=np.float32)
    day_records: List[Dict[str, Any]] = [{} for _ in range(len(tasks))]
    night_records: List[Dict[str, Any]] = [{} for _ in range(len(tasks))]
    ym_to_idx = {ym: i for i, (ym, _, _) in enumerate(tasks)}

    print(f"Downloading {len(tasks)} monthly MOD11C3.061 Day/Night OPeNDAP subsets via 16 threads...")
    done = 0
    with ThreadPoolExecutor(max_workers=16) as ex:
        futs = [ex.submit(_fetch_mod11c3_month_grids, t) for t in tasks]
        for fut in as_completed(futs):
            ym, title, obs_date, d_grid, d_cnt, n_grid, n_cnt = fut.result()
            idx = ym_to_idx[ym]
            day_cube[idx] = d_grid
            night_cube[idx] = n_grid
            day_records[idx] = {
                "ym": ym,
                "date": f"{ym}-01",
                "observationDate": obs_date,
                "granuleTitle": title,
                "productCode": "MOD11C3.061",
                "layer": "LST_Day_CMG",
                "validPixels": d_cnt,
            }
            night_records[idx] = {
                "ym": ym,
                "date": f"{ym}-01",
                "observationDate": obs_date,
                "granuleTitle": title,
                "productCode": "MOD11C3.061",
                "layer": "LST_Night_CMG",
                "validPixels": n_cnt,
            }
            done += 1
            if done % 50 == 0 or done == len(tasks):
                print(f"  MOD11C3 LST progress: {done}/{len(tasks)} ({time.time() - t0:.1f}s)")

    west, south, east, north = nasa_engine.NILE_DELTA_BBOX
    lats = np.linspace(north, south, out_rows).round(4).tolist()
    lons = np.linspace(west, east, out_cols).round(4).tolist()

    np.savez_compressed(MODIS_LST_DAY_NPZ, values=day_cube)
    np.savez_compressed(MODIS_LST_NIGHT_NPZ, values=night_cube)

    day_meta = {
        "variableId": "lst",
        "lstMode": "day",
        "productCode": "MOD11C3.061",
        "doi": "10.5067/MODIS/MOD11C3.061",
        "source": "NASA LP DAAC Earthdata Cloud OPeNDAP (C2565788897-LPCLOUD • LST_Day_CMG)",
        "nativeResolution": "0.05 deg CMG (~5.5 km)",
        "bbox": nasa_engine.NILE_DELTA_BBOX,
        "rows": out_rows,
        "cols": out_cols,
        "lats": lats,
        "lons": lons,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "months": day_records,
    }
    night_meta = {
        "variableId": "lst",
        "lstMode": "night",
        "productCode": "MOD11C3.061",
        "doi": "10.5067/MODIS/MOD11C3.061",
        "source": "NASA LP DAAC Earthdata Cloud OPeNDAP (C2565788897-LPCLOUD • LST_Night_CMG)",
        "nativeResolution": "0.05 deg CMG (~5.5 km)",
        "bbox": nasa_engine.NILE_DELTA_BBOX,
        "rows": out_rows,
        "cols": out_cols,
        "lats": lats,
        "lons": lons,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "months": night_records,
    }
    MODIS_LST_DAY_META.write_text(json.dumps(day_meta), encoding="utf-8")
    MODIS_LST_NIGHT_META.write_text(json.dumps(night_meta), encoding="utf-8")
    print(f"Saved MODIS LST Day & Night cubes ({len(tasks)} months) in {time.time() - t0:.1f}s.")


if __name__ == "__main__":
    harvest_modis_cube(force=False)
    backfill_modis_cmg_months()
    harvest_modis_lst_cubes(force=False)

