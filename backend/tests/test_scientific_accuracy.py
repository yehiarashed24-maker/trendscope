import io
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy import stats
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.stats_engine import (
    compute_mann_kendall_and_sens_slope,
    analyze_custom_csv_series,
    run_combined_nile_delta_investigation,
)

client = TestClient(app)


def test_math_ground_truth_mann_kendall_and_theil_sen():
    """Verify stats_engine matches direct pymannkendall + scipy.stats.theilslopes calculations."""
    dates = pd.date_range("2018-01-01", periods=36, freq="MS")
    t_yrs = ((dates - dates[0]).days / 365.25).to_numpy(dtype=float)
    # Exact negative linear trend: -0.04/year + deterministic seasonality
    seasonal = 0.05 * np.sin(2 * np.pi * np.arange(36) / 12.0)
    values = 0.65 - 0.04 * t_yrs + seasonal

    df = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "value": values,
        "anomaly": 0.65 - 0.04 * t_yrs - np.mean(0.65 - 0.04 * t_yrs),
        "zScore": np.zeros(36),
    })

    res = compute_mann_kendall_and_sens_slope(df, aggregation="monthly")
    ref_mk = mk.seasonal_test(values, period=12)
    ref_sen, _, ref_lo, ref_hi = stats.theilslopes(df["anomaly"].to_numpy(), t_yrs, 0.95)
    ref_lin = stats.linregress(t_yrs, df["anomaly"].to_numpy())

    assert abs(res["tau"] - round(float(ref_mk.Tau), 4)) < 1e-4
    assert abs(res["pValue"] - round(float(ref_mk.p), 5)) < 1e-5
    assert abs(res["zScore"] - round(float(ref_mk.z), 3)) < 1e-3
    assert res["significant"] == bool(ref_mk.h)
    assert res["trendDirection"] == "decreasing"
    assert abs(res["sensSlopePerYear"] - round(float(ref_sen), 5)) < 1e-4
    assert abs(res["sensSlope"] - round(float(ref_sen * 10.0), 4)) < 1e-3
    assert abs(res["slopeCiLower"] - round(float(ref_lo * 10.0), 4)) < 1e-3
    assert abs(res["slopeCiUpper"] - round(float(ref_hi * 10.0), 4)) < 1e-3
    assert abs(res["rSquared"] - round(float(ref_lin.rvalue ** 2), 4)) < 1e-4
    assert "Seasonal Mann-Kendall" in res["testMethod"]
    assert res["deseasonalized"] is True
    assert "changePointDate" in res and "changePointPValue" in res

    # Step change at midpoint should trigger significant Pettitt shift
    shift_dates = pd.date_range("2015-01-01", periods=60, freq="MS")
    shift_vals = np.array([0.40 if i < 30 else 0.70 for i in range(60)], dtype=float)
    df_shift = pd.DataFrame({"date": shift_dates.strftime("%Y-%m-%d"), "value": shift_vals, "anomaly": shift_vals})
    res_shift = compute_mann_kendall_and_sens_slope(df_shift, aggregation="monthly")
    assert res_shift["changePointSignificant"] is True
    assert res_shift["changePointPValue"] < 0.05
    assert res_shift["changePointDate"].startswith("2017-0")


def test_global_baseline_and_worldwide_regional_acquisition():
    """Verify Global Land Mean, World Biomes, and dynamic coordinates return valid trends + globalBenchmark."""
    from backend.services.stats_engine import run_full_variable_analysis

    glb = run_full_variable_analysis("global_mean", "ndvi", "2000-02-01", "2024-12-31", aggregation="monthly")
    assert glb["config"]["status"] == "VERIFIED"
    assert glb["statistics"]["significant"] is True
    assert glb["statistics"]["sensSlope"] > 0
    assert glb["globalBenchmark"]["isGlobalRegion"] is True

    amz = run_full_variable_analysis("amazon_basin", "ndvi", "2000-02-01", "2024-12-31", aggregation="monthly")
    assert amz["config"]["status"] == "VERIFIED"
    assert amz["statistics"]["sensSlope"] < 0
    assert amz["globalBenchmark"]["relationship"] == "opposite_to_global"

    dyn = run_full_variable_analysis("world_lat_24.09_lon_32.90", "lst", "2015-01-01", "2024-12-31", aggregation="monthly")
    assert dyn["config"]["status"] == "VERIFIED"
    assert len(dyn["points"]) >= 100
    assert "globalBenchmark" in dyn



def test_short_csv_r_squared_and_semicolon_bom_parsing():
    """Verify short linear CSV returns accurate R^2 (not 0.0) and handles BOM/semicolons/NaNs."""
    csv_text = (
        "\ufeffDate;Value\n"
        "2023-01-01;0.10\n"
        "2023-02-01;0.20\n"
        "2023-03-01;bad\n"
        "2023-04-01;0.40\n"
        "2023-05-01;0.50\n"
        "2023-06-01;0.60\n"
    )
    res = analyze_custom_csv_series(csv_text, title="bom_test.csv")
    assert res["statistics"]["sampleSize"] == 5
    assert res["statistics"]["trendDirection"] == "increasing"
    assert res["statistics"]["rSquared"] > 0.99
    assert res["statistics"]["sensSlopePerYear"] > 1.0


def test_flat_csv_zero_variance_no_nan_json_error():
    """Constant series must never emit NaN values that break JSON serialization."""
    csv_text = "date,value\n2023-01-01,0.5\n2023-02-01,0.5\n2023-03-01,0.5\n2023-04-01,0.5\n"
    r = client.post(
        "/api/analysis/upload-csv",
        files={"file": ("flat.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")},
        data={"title": "flat", "unit": "Index"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["statistics"]["rSquared"] == 0.0
    assert body["statistics"]["trendDirection"] == "no_trend"
    assert body["statistics"]["significant"] is False


def test_combined_correlation_matches_scipy():
    """Verify Pearson r and Spearman rho match direct scipy.stats calculations."""
    combined = run_combined_nile_delta_investigation("nile_delta", "2015-04-01", "2024-12-31")
    pts = combined["correlation"]["points"]
    x = np.array([p["x"] for p in pts], dtype=float)
    y = np.array([p["y"] for p in pts], dtype=float)

    ref_r, _ = stats.pearsonr(x, y)
    ref_rho, _ = stats.spearmanr(x, y)

    assert abs(combined["correlation"]["pearsonR"] - float(ref_r)) < 1e-3
    assert abs(combined["correlation"]["spearmanRho"] - float(ref_rho)) < 1e-3


def test_all_api_endpoints_and_custom_csv_pdf():
    """Check every REST endpoint used across Explorer, Analysis, Intelligence, Workspace & Reports."""
    assert client.get("/api/geography/nile-delta").status_code == 200
    assert client.get("/api/geography/subregions").status_code == 200
    assert client.get("/api/datasets/availability").status_code == 200
    assert client.get("/api/datasets/search?variable=ndvi&limit=5").status_code == 200

    assert client.post("/api/raster/statistics", json={"regionId": "gharbia", "variableId": "ndvi"}).status_code == 200
    assert client.get("/api/raster/inspect?variable=ndvi&lat=30.86&lng=31.02").status_code == 200
    assert client.get("/api/raster/tiles/ndvi/8/150/105.png").status_code == 200

    assert client.post("/api/analysis/ndvi", json={"regionId": "kafr_el_sheikh"}).status_code == 200
    assert client.post("/api/analysis/lst", json={"regionId": "kafr_el_sheikh", "lstMode": "both"}).status_code == 200
    assert client.post(
        "/api/analysis/trend",
        json={"config": {"regionId": "dakahlia", "variableId": "ndvi", "timeRange": {"startDate": "2015-04-01", "endDate": "2024-12-31", "aggregation": "monthly"}}},
    ).status_code == 200
    assert client.post(
        "/api/analysis/correlation",
        json={"regionId": "nile_delta", "timeRange": {"startDate": "2015-04-01", "endDate": "2024-12-31", "aggregation": "monthly"}},
    ).status_code == 200
    assert client.post("/api/analysis/anomaly", json={"regionId": "nile_delta", "variableId": "ndvi"}).status_code == 200

    # Custom CSV PDF report including special XML characters (&, <) in filename
    r_csv_pdf = client.post(
        "/api/reports/generate",
        json={
            "customCsvFileName": "farm_A&B_data<2024>.csv",
            "language": "en",
            "analysis": {
                "unit": "NDVI",
                "config": {"timeRange": {"startDate": "2020-01-01", "endDate": "2024-12-31"}},
                "provenance": {"detectedColumns": {"dateColumn": "Date", "valueColumn": "Mean"}},
                "statistics": {
                    "pValue": 0.004,
                    "sampleSize": 36,
                    "mannKendall": {"trendDirection": "increasing", "significant": True, "tau": 0.38, "zScore": 2.9},
                    "sensSlope": {"slopePerYear": 0.015, "slopePerDecade": 0.15},
                },
                "series": [{"timestamp": "2020-01-01", "value": 0.35}, {"timestamp": "2024-12-01", "value": 0.42}],
            },
        },
    )
    assert r_csv_pdf.status_code == 200
    assert r_csv_pdf.headers["content-type"] == "application/pdf"
    assert r_csv_pdf.content.startswith(b"%PDF-")
    assert "farm_A_B_data_2024" in r_csv_pdf.headers["content-disposition"]

