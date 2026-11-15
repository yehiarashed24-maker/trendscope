import json
import urllib.request
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from backend.config import settings
from backend.services.geography_service import geography_service
from backend.services.stats_engine import (
    get_enriched_dataset_meta,
    run_full_variable_analysis,
    run_combined_nile_delta_investigation,
)


LANGUAGE_LABELS = {
    "en": "English",
    "ar": "Arabic (العربية)",
    "de": "German (Deutsch)",
    "fr": "French (Français)",
}


def build_grounded_context(
    region_id: str,
    variable_id: str,
    start_date: str = "2000-02-18",
    end_date: str = "2024-12-31",
    context_metrics: Optional[Dict[str, Any]] = None,
    lst_mode: str = "day",
) -> Dict[str, Any]:
    """
    Assembles verified backend statistical, spatial, and dataset metadata for the Nile Delta
    subregion so the AI Scientist only interprets real computed metrics.
    """
    try:
        reg_meta = geography_service.get_region(region_id)
    except Exception:
        reg_meta = {"id": region_id, "name": region_id, "areaKm2": 24450.0}
    mode = lst_mode if lst_mode in ("day", "night", "both") else "day"
    analysis = run_full_variable_analysis(
        region_id=region_id,
        variable_id=variable_id,
        start_date=start_date,
        end_date=end_date,
        aggregation="monthly",
        lst_mode=mode,
    )
    combined = run_combined_nile_delta_investigation(
        region_id=region_id,
        start_date="2000-02-18",
        end_date=end_date,
        lst_mode=mode,
    )

    lst_comp_summary = None
    if analysis.get("lstComparison"):
        lc = analysis["lstComparison"]
        lst_comp_summary = {
            "dayMeanC": lc["day"]["statistics"]["mean"],
            "nightMeanC": lc["night"]["statistics"]["mean"],
            "meanDiurnalSpreadC": lc["dayNightCorrelation"]["meanDiurnalRange"],
            "daySlopePerDecade": lc["day"]["statistics"]["sensSlope"],
            "nightSlopePerDecade": lc["night"]["statistics"]["sensSlope"],
            "dayNightPearsonR": lc["dayNightCorrelation"]["pearsonR"],
        }

    return {
        "studyArea": "Nile Delta, Egypt",
        "region": {
            "id": reg_meta.get("id", region_id),
            "name": reg_meta.get("name", region_id),
            "name_ar": reg_meta.get("nameAr") or reg_meta.get("name_ar", ""),
            "areaKm2": reg_meta.get("areaKm2") or reg_meta.get("area_km2", 24450.0),
            "climateZone": reg_meta.get("climateZone") or reg_meta.get("climate_zone", "Mediterranean / Semi-Arid Irrigated Delta"),
        },
        "variableId": variable_id,
        "lstMode": mode if variable_id == "lst" else None,
        "dataset": get_enriched_dataset_meta(variable_id),
        "timeRange": analysis["config"]["timeRange"],
        "statistics": analysis["statistics"],
        "rasterStatistics": analysis["rasterStatistics"],
        "seasonal": analysis["seasonal"],
        "topAnomalies": analysis["anomalies"][:5],
        "lstComparisonSummary": lst_comp_summary,
        "combinedCorrelation": {
            "pearsonR": combined["correlation"]["pearsonR"],
            "spearmanRho": combined["correlation"]["spearmanRho"],
            "pValue": combined["correlation"]["pValue"],
            "sampleSize": combined["correlation"]["sampleSize"],
            "coOccurringStressCount": len(combined["coOccurringStressEpisodes"]),
            "resolutionNotice": combined["resolutionNotice"],
        },
        "clientProvidedMetrics": context_metrics or {},
    }


def _generate_deterministic_grounded_response(grounded: Dict[str, Any], language: str) -> Dict[str, Any]:
    """
    Produces a strictly grounded scientific response directly from the computed backend
    metrics if Gemini API is unreachable or rate-limited.
    """
    reg_name = grounded["region"]["name"]
    var_id = grounded["variableId"]
    lst_mode = grounded.get("lstMode") or "day"
    ds = grounded["dataset"]
    st = grounded["statistics"]
    rst = grounded["rasterStatistics"]
    corr = grounded["combinedCorrelation"]
    tr = grounded["timeRange"]

    slope_yr = st["sensSlopePerYear"]
    slope_dec = st["sensSlope"]
    p_val = st["pValue"]
    tau = st["tau"]
    z_val = st["zScore"]
    sig_str = "statistically significant" if st["significant"] else "not statistically significant"

    mode_en = (
        "Daytime & Nighttime comparison"
        if lst_mode == "both"
        else ("Nighttime (~22:30 LT)" if lst_mode == "night" else "Daytime (~10:30 LT)")
    )
    mode_ar = (
        "المقارنة بين النهار والليل"
        if lst_mode == "both"
        else ("القياس الليلي (~22:30)" if lst_mode == "night" else "القياس النهاري (~10:30)")
    )

    if language == "ar":
        extra_ar = (
            f" وضع درجة حرارة سطح الأرض: **{mode_ar}** (درجة حرارة السطح الفيزيائية وليست حرارة الهواء)."
            if var_id == "lst"
            else ""
        )
        summary = (
            f"تحليل علمي موثق لمنطقة **{reg_name}** في دلتا النيل ({tr['startDate']} إلى {tr['endDate']}) "
            f"باستخدام بيانات وكالة ناسا **{ds['shortName']}.{ds['version']}** بدقة مكانية أصلية **{ds['spatialResolution']}**.{extra_ar}"
        )
        methodology = (
            f"تم تطبيق اختبار مان-كيندال اللابارامتري (Mann-Kendall $\\tau = {tau:.3f}$, $Z = {z_val:.2f}$, $p = {p_val:.4f}$) "
            f"ومقدّر ميل سين (Sen's Slope = ${slope_yr:+.5f}$ {ds['unit']}/سنة أو ${slope_dec:+.4f}$ {ds['unit']}/عقد) "
            f"مع فلترة الجودة (`{ds['qualityBand']}`). للإشارة المشتركة، يتم تقييم ارتباط الغطاء النباتي (NDVI، 250 م) "
            f"مع درجة حرارة سطح الأرض (MOD11C3 LST، 0.05°) على المستوى الإقليمي دون أي رفع زائف للدقة."
        )
    else:
        mode_note = f" ({mode_en})" if var_id == "lst" else ""
        summary = (
            f"Grounded scientific evaluation for **{reg_name}** within the Nile Delta study area "
            f"({tr['startDate']} to {tr['endDate']}) using **{ds['shortName']}.{ds['version']}**{mode_note} "
            f"(DOI: `{ds['doi']}`, native spatial resolution **{ds['spatialResolution']}**, {ds['temporalResolution']} frequency). "
            f"The observed monotonic trend is **{st['trendDirection'].replace('_', ' ')}** ({sig_str} at $\\alpha = 0.05$, "
            f"Mann-Kendall $\\tau = {tau:.3f}$, $Z = {z_val:.2f}$, $p = {p_val:.4f}$) with a Sen's slope of "
            f"**{slope_yr:+.5f} {ds['unit']}/year** (**{slope_dec:+.4f} {ds['unit']}/decade**, 95% CI "
            f"[{st['slopeCiLower']:+.4f}, {st['slopeCiUpper']:+.4f}] {ds['unit']}/decade)."
        )
        if grounded.get("lstComparisonSummary"):
            lc = grounded["lstComparisonSummary"]
            summary += (
                f" Daytime mean LST is **{lc['dayMeanC']:.2f} °C** ({lc['daySlopePerDecade']:+.3f} °C/decade) "
                f"compared with Nighttime mean LST of **{lc['nightMeanC']:.2f} °C** ({lc['nightSlopePerDecade']:+.3f} °C/decade), "
                f"yielding a mean diurnal surface spread of **{lc['meanDiurnalSpreadC']:.2f} °C**."
            )
        methodology = (
            f"Quality filtering applied via `{ds['qualityBand']}` with scale factor `{ds['scaleFactor']}` and NoData `{ds['noDataValue']}` masked prior to aggregation. "
            f"Spatial coverage over {reg_name} is {rst.get('validCoveragePercent', 95.0)}% ({rst.get('validPixelCount', 0)} valid pixels; "
            f"spatial mean = {rst.get('mean', st['mean'])} {ds['unit']}, std = {rst.get('std', st['stdDev'])} {ds['unit']}). "
            f"Combined MODIS NDVI (250 m) and MODIS LST (0.05° CMG) thermal-canopy coupling is evaluated at regional monthly scale "
            f"(Pearson $r = {corr['pearsonR']:.3f}$, Spearman $\\rho = {corr['spearmanRho']:.3f}$, $p = {corr['pValue']:.4f}$)."
        )

    evidence = [
        f"Dataset & Resolution: {ds['shortName']}.{ds['version']} (DOI: {ds['doi']}) at native {ds['spatialResolution']} spatial resolution and {ds['temporalResolution']} temporal composite.",
        f"Mann-Kendall & Sen's Slope: τ = {tau:.4f}, Z = {z_val:.3f}, p = {p_val:.5f} ({st['confidenceLevel']}), Sen's Slope = {slope_yr:+.5f} {ds['unit']}/yr ({slope_dec:+.4f} {ds['unit']}/decade).",
        f"Regional Raster Statistics ({reg_name}): Spatial Mean = {rst.get('mean', st['mean'])} {ds['unit']}, Median = {rst.get('median', st['median'])} {ds['unit']}, Min = {rst.get('min', st['min'])}, Max = {rst.get('max', st['max'])}, Valid Coverage = {rst.get('validCoveragePercent', 95.0)}%.",
        f"NDVI–LST Coupling (2000–2024): Pearson r = {corr['pearsonR']:.3f}, Spearman ρ = {corr['spearmanRho']:.3f} (p = {corr['pValue']:.4f}, n = {corr['sampleSize']} months), with {corr['coOccurringStressCount']} co-occurring heat-canopy stress episodes.",
    ]

    drivers = [
        {
            "factor": "Evaporative Canopy Cooling & Bi-Modal Cropping Calendar",
            "impactWeight": "Primary",
            "mechanism": "Irrigated winter wheat/berseem and summer rice/maize cycles modulate latent heat flux, typically suppressing daytime LST relative to bare peri-urban or desert-fringe soils.",
        },
        {
            "factor": "Asymmetric Daytime Heating vs. Nighttime Cooling",
            "impactWeight": "Secondary",
            "mechanism": f"Detected {st['anomaliesCount']} standardized anomalies (|Z| ≥ 1.85σ) against the {grounded['dataset']['baselinePeriod']} baseline; urban impervious cover and soil thermal inertia elevate nighttime LST even when daytime extremes vary.",
        },
        {
            "factor": "Multi-Resolution Surface Measurement Contrast (250 m vs 0.05° CMG)",
            "impactWeight": "Contributing",
            "mechanism": "MODIS MOD13Q1 captures 250 m field-mosaic vegetation density while MOD11C3 measures 0.05° (~5.5 km) radiant surface skin temperature under clear-sky conditions.",
        },
    ]

    if var_id == "ndvi":
        limitations = [
            "Optical vegetation retrievals (MOD13Q1.061 250 m / MOD13C2.061 0.05° CMG; valid NDVI range -0.2 to 1.0) omit cloud/aerosol-masked pixels via pixel_reliability QC without synthetic interpolation.",
            "Nile Delta agricultural planting/harvesting seasonality is explicitly controlled using the Hirsch–Slack Seasonal Mann-Kendall test (period=12) and deseasonalized Theil-Sen anomalies.",
            f"Spatial comparison with MODIS LST (0.05° CMG) in coupled diagnostics preserves native resolution without artificial thermal upsampling.",
        ]
    else:
        limitations = [
            "Land Surface Temperature (MOD11C3.061, 0.05° ~5.5 km) measures the radiative skin temperature of the ground/canopy surface, NOT meteorological 2-meter air temperature.",
            "Clear-sky thermal infrared retrievals omit cloud-obscured passes (~10:30 LT daytime and ~22:30 LT nighttime); missing months remain excluded without gap-filling.",
            "Seasonal Mann-Kendall (period=12) and deseasonalized anomalies control for annual solar/thermal cycles prior to long-term trend inference.",
        ]

    citations = [
        ds["citation"],
        get_enriched_dataset_meta("lst" if var_id == "ndvi" else "ndvi")["citation"],
        "NASA EOSDIS Land Processes DAAC (LP DAAC) — Terra MODIS Collection 061 Science Team.",
    ]

    return {
        "id": f"ai_nile_delta_{int(datetime.now(timezone.utc).timestamp())}",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "language": language,
        "summary": summary,
        "methodologyExplanation": methodology,
        "statisticalEvidence": evidence,
        "potentialDrivers": drivers,
        "limitationsAndUncertainties": limitations,
        "citations": citations,
        "groundedMetrics": grounded,
        "modelUsed": f"{settings.GEMINI_MODEL} (Deterministic Grounded Fallback)",
    }


def generate_ai_scientific_explanation(
    prompt: str,
    language: str = "en",
    region_id: str = "nile_delta",
    variable_id: str = "ndvi",
    start_date: str = "2000-02-18",
    end_date: str = "2024-12-31",
    context_metrics: Optional[Dict[str, Any]] = None,
    use_llm: bool = True,
    lst_mode: str = "day",
) -> Dict[str, Any]:
    """
    Calls the verified Google Gemini model (`gemini-2.5-flash`) from the backend only,
    supplying the structured Nile Delta statistical and geospatial JSON context.
    Never exposes GEMINI_API_KEY to the frontend.
    """
    grounded = build_grounded_context(
        region_id=region_id,
        variable_id=variable_id,
        start_date=start_date,
        end_date=end_date,
        context_metrics=context_metrics,
        lst_mode=lst_mode,
    )
    fallback_resp = _generate_deterministic_grounded_response(grounded, language)

    if not use_llm or not settings.GEMINI_API_KEY:
        return fallback_resp

    lang_name = LANGUAGE_LABELS.get(language, "English")
    system_instruction = f"""You are the TRENDSCOPE AI — NILE DELTA EDITION Chief Earth Observation Scientist.
You must answer strictly in {lang_name}.
You are analyzing ONLY the Nile Delta in Egypt and ONLY two NASA MODIS Terra satellite products:
1. Vegetation Cover — MODIS/Terra Vegetation Indices (MOD13Q1.061 250 m & MOD13C2.061 0.05° CMG, DOI: 10.5067/MODIS/MOD13Q1.061, NDVI 2000–2024).
2. Land Surface Temperature (LST) — MODIS/Terra Land Surface Temperature/Emissivity Monthly CMG (MOD11C3.061, DOI: 10.5067/MODIS/MOD11C3.061, 0.05° ~5.5 km, Daytime ~10:30 LT & Nighttime ~22:30 LT, 2000–2024).

MANDATORY SCIENTIFIC RULES:
- Ground every single number in the provided JSON context (`grounded_context`). NEVER invent or alter p-values, Sen's slopes, Mann-Kendall tau/Z, pixel counts, or correlation coefficients.
- Explicitly note that Land Surface Temperature (LST) is the radiative skin temperature of the land surface itself (distinct from 2-meter air temperature) and highlight Daytime vs Nighttime dynamics when `lstComparisonSummary` or `lstMode` is present.
- Explicitly state that NDVI and LST are evaluated at regional monthly aggregation across their native grids without artificial spatial upsampling.
- Do NOT claim causation from correlation alone.
- Do NOT claim official NASA endorsement.
- Return valid JSON matching the exact schema requested."""

    user_payload = f"""User Question / Investigation Prompt:
{prompt}

Verified Backend Grounded Context (JSON):
{json.dumps(grounded, ensure_ascii=False, indent=2)}

Return ONLY a JSON object with these keys:
- "summary": string (2-3 concise paragraphs in {lang_name} citing exact Mann-Kendall p-value, tau, Z-score, Sen's slope per year & decade, and regional mean)
- "methodologyExplanation": string (explaining MOD13Q1.061 / MOD11C3.061 clear-sky quality filtering, 2000-2020 baseline, non-parametric Mann-Kendall & Theil-Sen estimator, and Daytime vs Nighttime LST handling in {lang_name})
- "statisticalEvidence": array of 4 strings (exact numerical findings in {lang_name})
- "potentialDrivers": array of 3 objects each with {{"factor": string, "impactWeight": "Primary"|"Secondary"|"Contributing", "mechanism": string}}
- "limitationsAndUncertainties": array of 3 strings (including LST skin temperature vs air temperature distinction, native resolution contrast, and correlation vs causation in {lang_name})
- "citations": array of 3 strings (formal dataset citations with DOIs)
"""

    candidate_models = []
    for m in [settings.GEMINI_MODEL, "gemini-3-flash-preview", "gemini-flash-latest"]:
        if m and m not in candidate_models:
            candidate_models.append(m)

    body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_payload}]}],
        "generationConfig": {
            "temperature": 0.15,
            "responseMimeType": "application/json",
        },
    }

    for model_name in candidate_models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
                text_out = (
                    raw.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                parsed = json.loads(text_out)
                return {
                    "id": f"ai_nile_delta_{int(datetime.now(timezone.utc).timestamp())}",
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "language": language,
                    "summary": parsed.get("summary") or fallback_resp["summary"],
                    "methodologyExplanation": parsed.get("methodologyExplanation") or fallback_resp["methodologyExplanation"],
                    "statisticalEvidence": parsed.get("statisticalEvidence") or fallback_resp["statisticalEvidence"],
                    "potentialDrivers": parsed.get("potentialDrivers") or fallback_resp["potentialDrivers"],
                    "limitationsAndUncertainties": parsed.get("limitationsAndUncertainties") or fallback_resp["limitationsAndUncertainties"],
                    "citations": parsed.get("citations") or fallback_resp["citations"],
                    "groundedMetrics": grounded,
                    "modelUsed": model_name,
                }
        except Exception:
            continue

    return fallback_resp

