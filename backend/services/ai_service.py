import json
import re
import urllib.request
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

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

# Region keyword aliases (English & Arabic) for automatic prompt entity detection
_REGION_PROMPT_ALIASES: List[Tuple[str, Tuple[str, ...]]] = [
    ("global_mean", ("global mean", "global land", "planetary", "world mean", "المتوسط العالمي", "الاتجاه العالمي")),
    ("amazon_basin", ("amazon", "الأمازون", "امازون")),
    ("sahel_region", ("sahel", "الساحل الأفريقي", "الساحل الافريقي")),
    ("aral_sea_basin", ("aral sea", "amu darya", "بحر آرال", "بحر ارال")),
    ("california_central_valley", ("california", "central valley", "كاليفورنيا")),
    ("kafr_el_sheikh", ("kafr el-sheikh", "kafr el sheikh", "kafr", "كفر الشيخ")),
    ("beheira_delta", ("beheira", "nubariya", "البحيرة", "النوبارية")),
    ("dakahlia", ("dakahlia", "الدقهلية")),
    ("gharbia", ("gharbia", "الغربية")),
    ("sharqia_delta", ("sharqia", "sharkia", "الشرقية")),
    ("monufia", ("monufia", "menoufia", "المنوفية")),
    ("qalyubia", ("qalyubia", "القليوبية")),
    ("damietta", ("damietta", "دمياط")),
    ("ismailia_canal", ("ismailia", "الإسماعيلية", "الاسماعيلية")),
    ("nile_delta", ("nile delta", "entire delta", "full delta", "دلتا النيل", "الدلتا")),
]


def _detect_prompt_language(prompt: str, fallback_lang: str) -> str:
    """If the user typed their question in Arabic characters, respond in Arabic."""
    if prompt and re.search(r"[\u0600-\u06FF]", prompt):
        return "ar"
    return fallback_lang if fallback_lang in LANGUAGE_LABELS else "en"


def _detect_prompt_regions_and_variable(
    prompt: str,
    default_region_id: str,
    default_variable_id: str,
    default_lst_mode: str,
) -> Tuple[str, List[str], str, str]:
    """
    Inspects the user prompt for explicit region names and variable/LST-mode keywords
    so the AI Scientist always grounds its answer in the region(s) and variable(s) the user actually asked about.
    """
    low = (prompt or "").lower()
    matched_regions: List[str] = []
    for reg_id, aliases in _REGION_PROMPT_ALIASES:
        if any(alias in low for alias in aliases):
            if reg_id not in matched_regions:
                matched_regions.append(reg_id)

    # If specific subregions/biomes were mentioned alongside general 'nile_delta', prioritize the specific ones first
    specific = [r for r in matched_regions if r != "nile_delta"]
    if specific:
        primary_region = specific[0]
        all_regions = specific + (["nile_delta"] if "nile_delta" in matched_regions else [])
    elif matched_regions:
        primary_region = matched_regions[0]
        all_regions = matched_regions
    else:
        primary_region = default_region_id
        all_regions = [default_region_id]

    mentions_lst = any(
        k in low
        for k in (
            "lst",
            "temperature",
            "thermal",
            "heat",
            "warming",
            "cooling",
            "daytime",
            "nighttime",
            "diurnal",
            "mod11c3",
            "حرارة",
            "الحرارة",
            "السطح",
            "نهار",
            "ليل",
        )
    )
    mentions_ndvi = any(
        k in low
        for k in (
            "ndvi",
            "vegetation",
            "canopy",
            "green",
            "crop",
            "drought",
            "mod13q1",
            "mod13c2",
            "نبات",
            "الغطاء",
            "اخضرار",
            "زراع",
        )
    )
    mentions_day_and_night = any(
        k in low
        for k in ("daytime and nighttime", "day and night", "day vs night", "diurnal", "نهار", "ليل")
    )

    if mentions_lst and not mentions_ndvi:
        eff_var = "lst"
    elif mentions_ndvi and not mentions_lst:
        eff_var = "ndvi"
    else:
        eff_var = default_variable_id if default_variable_id in ("ndvi", "lst") else "ndvi"

    eff_mode = "both" if mentions_day_and_night else (default_lst_mode if default_lst_mode in ("day", "night", "both") else "day")
    return primary_region, all_regions, eff_var, eff_mode


def _summarize_region_metrics(region_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
    """Computes a compact multi-variable summary (NDVI + LST Day & Night) for a region."""
    try:
        reg_meta = geography_service.get_region(region_id)
    except Exception:
        reg_meta = {"id": region_id, "name": region_id, "areaKm2": 24450.0}

    ndvi_res = run_full_variable_analysis(
        region_id=region_id,
        variable_id="ndvi",
        start_date=start_date,
        end_date=end_date,
        aggregation="monthly",
    )
    lst_both = run_full_variable_analysis(
        region_id=region_id,
        variable_id="lst",
        start_date=start_date,
        end_date=end_date,
        aggregation="monthly",
        lst_mode="both",
    )
    lc = lst_both.get("lstComparison") or {}
    return {
        "regionId": region_id,
        "regionName": reg_meta.get("name", region_id),
        "areaKm2": reg_meta.get("areaKm2") or reg_meta.get("area_km2", 24450.0),
        "climateZone": reg_meta.get("climateZone") or reg_meta.get("climate_zone", ""),
        "ndvi": {
            "mean": ndvi_res["statistics"]["mean"],
            "sensSlopePerDecade": ndvi_res["statistics"]["sensSlope"],
            "sensSlopePerYear": ndvi_res["statistics"]["sensSlopePerYear"],
            "ci95Decade": [ndvi_res["statistics"]["slopeCiLower"], ndvi_res["statistics"]["slopeCiUpper"]],
            "pValue": ndvi_res["statistics"]["pValue"],
            "tau": ndvi_res["statistics"]["tau"],
            "zScore": ndvi_res["statistics"]["zScore"],
            "significant": ndvi_res["statistics"]["significant"],
            "trendDirection": ndvi_res["statistics"]["trendDirection"],
            "changePointDate": ndvi_res["statistics"].get("changePointDate"),
            "changePointPValue": ndvi_res["statistics"].get("changePointPValue"),
            "changePointSignificant": ndvi_res["statistics"].get("changePointSignificant"),
        },
        "lstDay": {
            "meanC": lc.get("day", {}).get("statistics", {}).get("mean"),
            "sensSlopePerDecadeC": lc.get("day", {}).get("statistics", {}).get("sensSlope"),
            "pValue": lc.get("day", {}).get("statistics", {}).get("pValue"),
            "tau": lc.get("day", {}).get("statistics", {}).get("tau"),
            "significant": lc.get("day", {}).get("statistics", {}).get("significant"),
            "trendDirection": lc.get("day", {}).get("statistics", {}).get("trendDirection"),
        },
        "lstNight": {
            "meanC": lc.get("night", {}).get("statistics", {}).get("mean"),
            "sensSlopePerDecadeC": lc.get("night", {}).get("statistics", {}).get("sensSlope"),
            "pValue": lc.get("night", {}).get("statistics", {}).get("pValue"),
            "tau": lc.get("night", {}).get("statistics", {}).get("tau"),
            "significant": lc.get("night", {}).get("statistics", {}).get("significant"),
            "trendDirection": lc.get("night", {}).get("statistics", {}).get("trendDirection"),
        },
        "diurnalSpread": {
            "meanSpreadC": lc.get("dayNightCorrelation", {}).get("meanDiurnalRange"),
            "dayNightPearsonR": lc.get("dayNightCorrelation", {}).get("pearsonR"),
            "spreadSlopePerDecadeC": lc.get("diurnalSpread", {}).get("statistics", {}).get("sensSlope"),
            "spreadPValue": lc.get("diurnalSpread", {}).get("statistics", {}).get("pValue"),
        },
    }


def build_grounded_context(
    region_id: str,
    variable_id: str,
    start_date: str = "2000-02-18",
    end_date: str = "2024-12-31",
    context_metrics: Optional[Dict[str, Any]] = None,
    lst_mode: str = "day",
    prompt: str = "",
) -> Dict[str, Any]:
    """
    Assembles verified backend statistical, spatial, and dataset metadata for the requested
    region(s) and variable(s) so the AI Scientist always interprets real computed metrics.
    """
    primary_region, mentioned_regions, eff_var, eff_mode = _detect_prompt_regions_and_variable(
        prompt=prompt,
        default_region_id=region_id,
        default_variable_id=variable_id,
        default_lst_mode=lst_mode,
    )

    try:
        reg_meta = geography_service.get_region(primary_region)
    except Exception:
        reg_meta = {"id": primary_region, "name": primary_region, "areaKm2": 24450.0}

    analysis = run_full_variable_analysis(
        region_id=primary_region,
        variable_id=eff_var,
        start_date=start_date,
        end_date=end_date,
        aggregation="monthly",
        lst_mode=eff_mode,
    )
    lst_both_analysis = (
        analysis
        if (eff_var == "lst" and eff_mode == "both")
        else run_full_variable_analysis(
            region_id=primary_region,
            variable_id="lst",
            start_date=start_date,
            end_date=end_date,
            aggregation="monthly",
            lst_mode="both",
        )
    )
    ndvi_analysis = (
        analysis
        if eff_var == "ndvi"
        else run_full_variable_analysis(
            region_id=primary_region,
            variable_id="ndvi",
            start_date=start_date,
            end_date=end_date,
            aggregation="monthly",
        )
    )
    combined = run_combined_nile_delta_investigation(
        region_id=primary_region,
        start_date=start_date,
        end_date=end_date,
        lst_mode=eff_mode,
    )

    lc = lst_both_analysis.get("lstComparison") or {}
    lst_comp_summary = None
    if lc:
        lst_comp_summary = {
            "dayMeanC": lc["day"]["statistics"]["mean"],
            "daySlopePerDecade": lc["day"]["statistics"]["sensSlope"],
            "dayPValue": lc["day"]["statistics"]["pValue"],
            "dayTau": lc["day"]["statistics"]["tau"],
            "daySignificant": lc["day"]["statistics"]["significant"],
            "nightMeanC": lc["night"]["statistics"]["mean"],
            "nightSlopePerDecade": lc["night"]["statistics"]["sensSlope"],
            "nightPValue": lc["night"]["statistics"]["pValue"],
            "nightTau": lc["night"]["statistics"]["tau"],
            "nightSignificant": lc["night"]["statistics"]["significant"],
            "meanDiurnalSpreadC": lc["dayNightCorrelation"]["meanDiurnalRange"],
            "diurnalSpreadSlopePerDecade": lc["diurnalSpread"]["statistics"]["sensSlope"],
            "diurnalSpreadPValue": lc["diurnalSpread"]["statistics"]["pValue"],
            "dayNightPearsonR": lc["dayNightCorrelation"]["pearsonR"],
        }

    compared_regions: Dict[str, Any] = {}
    for r_id in mentioned_regions[:4]:
        compared_regions[r_id] = _summarize_region_metrics(r_id, start_date, end_date)
    if "global_mean" not in compared_regions:
        compared_regions["global_mean"] = _summarize_region_metrics("global_mean", start_date, end_date)

    is_global_or_world = bool(reg_meta.get("isGlobalOrWorld"))
    if primary_region == "global_mean":
        study_area_label = "Planetary Land Baseline (Global Mean)"
    elif is_global_or_world:
        study_area_label = f"Global Regional Study Area ({reg_meta.get('name', primary_region)})"
    else:
        study_area_label = "Nile Delta Regional Benchmark, Egypt"

    return {
        "studyArea": study_area_label,
        "region": {
            "id": reg_meta.get("id", primary_region),
            "name": reg_meta.get("name", primary_region),
            "name_ar": reg_meta.get("nameAr") or reg_meta.get("name_ar", ""),
            "areaKm2": reg_meta.get("areaKm2") or reg_meta.get("area_km2", 24450.0),
            "climateZone": reg_meta.get("climateZone") or reg_meta.get("climate_zone", "Regional Earth Observation Zone"),
            "isGlobalOrWorld": is_global_or_world,
        },
        "mentionedRegions": mentioned_regions,
        "comparedRegions": compared_regions,
        "variableId": eff_var,
        "lstMode": eff_mode if eff_var == "lst" else None,
        "dataset": get_enriched_dataset_meta(eff_var),
        "timeRange": analysis["config"]["timeRange"],
        "statistics": analysis["statistics"],
        "ndviStatistics": ndvi_analysis["statistics"],
        "rasterStatistics": analysis["rasterStatistics"],
        "seasonal": analysis["seasonal"],
        "topAnomalies": analysis["anomalies"][:5],
        "lstComparisonSummary": lst_comp_summary,
        "globalBenchmark": analysis.get("globalBenchmark"),
        "combinedCorrelation": {
            "pearsonR": combined["correlation"]["pearsonR"],
            "spearmanRho": combined["correlation"]["spearmanRho"],
            "pValue": combined["correlation"]["pValue"],
            "sampleSize": combined["correlation"]["sampleSize"],
            "coOccurringStressCount": len(combined["coOccurringStressEpisodes"]),
            "topStressEpisodes": combined["coOccurringStressEpisodes"][:4],
            "resolutionNotice": combined["resolutionNotice"],
        },
        "clientProvidedMetrics": context_metrics or {},
    }


def _generate_deterministic_grounded_response(
    grounded: Dict[str, Any],
    language: str,
    prompt: str = "",
) -> Dict[str, Any]:
    """
    Produces a question-aware, strictly grounded scientific answer directly from computed
    backend metrics when Gemini API is unreachable or rate-limited.
    """
    low = (prompt or "").lower()
    reg_name = grounded["region"]["name"]
    reg_name_ar = grounded["region"].get("name_ar") or reg_name
    var_id = grounded["variableId"]
    ds = grounded["dataset"]
    st = grounded["statistics"]
    ndvi_st = grounded.get("ndviStatistics") or st
    rst = grounded["rasterStatistics"]
    corr = grounded["combinedCorrelation"]
    tr = grounded["timeRange"]
    lc = grounded.get("lstComparisonSummary")
    compared = grounded.get("comparedRegions") or {}
    mentioned = grounded.get("mentionedRegions") or []
    custom_csv = (grounded.get("clientProvidedMetrics") or {}).get("customCsv")

    slope_yr = st["sensSlopePerYear"]
    slope_dec = st["sensSlope"]
    p_val = st["pValue"]
    tau = st["tau"]
    z_val = st["zScore"]
    sig_str = "statistically significant" if st["significant"] else "not statistically significant"

    is_multi_region_q = len(mentioned) >= 2 or any(w in low for w in ("compare", "versus", " vs ", "differ", "مقارن", "فرق"))
    is_day_night_q = any(w in low for w in ("daytime", "nighttime", "day and night", "diurnal", "mod11c3", "نهار", "ليل"))
    is_coupling_q = any(w in low for w in ("interact", "coupl", "correlat", "pearson", "spearman", "relationship", "علاقة", "ارتباط"))
    is_anomaly_q = any(w in low for w in ("anomal", "extreme", "shift", "pettitt", "spike", "drought", "شذوذ", "تطرف", "تحول"))

    if language == "ar":
        if custom_csv:
            summary = (
                f"بناءً على ملف البيانات المخصص **{custom_csv.get('fileName', 'CSV')}** ({custom_csv.get('sampleCount', st['sampleSize'])} نقطة زمنية)، "
                f"الاتجاه المرصود هو **{custom_csv.get('trendDirection', st['trendDirection'])}** بميل ثيل-سين قدره "
                f"**{custom_csv.get('slopeDecade', slope_dec):+.4f} لكل عقد** وقيمة احتمالية **p = {custom_csv.get('pValue', p_val):.4f}**."
            )
        elif is_multi_region_q and len(mentioned) >= 2:
            parts = []
            for r_id in mentioned[:3]:
                rm = compared.get(r_id)
                if not rm:
                    continue
                m_ndvi = rm["ndvi"]
                s_ar = "دال إحصائياً" if m_ndvi["significant"] else "غير دال إحصائياً"
                parts.append(
                    f"• **{rm['regionName']}**: متوسط NDVI = **{m_ndvi['mean']:.4f}**، ميل سين = **{m_ndvi['sensSlopePerDecade']:+.4f} NDVI/عقد** "
                    f"(Seasonal MK τ = {m_ndvi['tau']:.3f}, Z = {m_ndvi['zScore']:.2f}, **p = {m_ndvi['pValue']:.4f}** — {s_ar})."
                )
            summary = "مقارنة إحصائية مباشرة بين المناطق المطلوبة (2000–2024):\n" + "\n".join(parts)
        elif is_day_night_q and lc:
            summary = (
                f"مقارنة حرارة سطح الأرض النهارية والليلية (MODIS MOD11C3.061، دقة 0.05° ~5.5 كم) في **{reg_name_ar}** ({tr['startDate']} إلى {tr['endDate']}):\n"
                f"• **النهار (~10:30 صباحاً):** المتوسط = **{lc['dayMeanC']:.2f} °C**، الميل = **{lc['daySlopePerDecade']:+.3f} °C/عقد** (p = {lc['dayPValue']:.4f}, τ = {lc['dayTau']:.3f}).\n"
                f"• **الليل (~22:30 مساءً):** المتوسط = **{lc['nightMeanC']:.2f} °C**، الميل = **{lc['nightSlopePerDecade']:+.3f} °C/عقد** (p = {lc['nightPValue']:.4f}, τ = {lc['nightTau']:.3f}).\n"
                f"• **الفارق اليومي (النهار − الليل):** متوسط الاتساع الحراري = **{lc['meanDiurnalSpreadC']:.2f} °C** بارتباط يومي/ليلي **r = {lc['dayNightPearsonR']:.3f}**."
            )
        elif is_coupling_q:
            summary = (
                f"تحليل التفاعل بين الغطاء النباتي (MOD13Q1 NDVI) وحرارة سطح الأرض (MOD11C3 LST) في **{reg_name_ar}** ({tr['startDate']}–{tr['endDate']}):\n"
                f"• معامل ارتباط بيرسون **Pearson r = {corr['pearsonR']:.3f}** وسبيرمان **Spearman ρ = {corr['spearmanRho']:.3f}** (**p = {corr['pValue']:.4f}** عبر {corr['sampleSize']} شهراً متطابقاً).\n"
                f"• تم رصد **{corr['coOccurringStressCount']} حالة إجهاد حراري-نباتي متزامن** (ارتفاع شاذ في حرارة السطح مع انخفاض في الغطاء النباتي)، حيث يعمل النتح والتبخر النباتي على تبريد سطح الأرض مقارنة بالتربة المكشوفة."
            )
        else:
            s_ar = "دال إحصائياً عند α = 0.05" if st["significant"] else "غير دال إحصائياً عند α = 0.05"
            summary = (
                f"في منطقة **{reg_name_ar}** ({tr['startDate']} إلى {tr['endDate']}) باستخدام بيانات ناسا **{ds['shortName']}.{ds['version']}**، "
                f"يُظهر المتغير اتجاهاً **{st['trendDirection'].replace('_', ' ')}** ({s_ar}؛ اختبار مان-كيندال الموسمي **p = {p_val:.4f}**، "
                f"**τ = {tau:.3f}**، **Z = {z_val:.2f}**) بميل ثيل-سين منزوع الموسمية قدره **{slope_dec:+.4f} {ds['unit']}/عقد** "
                f"(فترة ثقة 95%: [{st['slopeCiLower']:+.4f}, {st['slopeCiUpper']:+.4f}] {ds['unit']}/عقد) ومتوسط إقليمي **{st['mean']:.4f} {ds['unit']}**."
            )
        methodology = (
            f"تم تطبيق اختبار مان-كيندال الموسمي (Hirsch–Slack, period=12) ومقدّر ميل ثيل-سين منزوع الموسمية مع اختبار Pettitt لنقاط التحول "
            f"(تاريخ التحول: {st.get('changePointDate') or 'لا يوجد'}، p = {st.get('changePointPValue', 1.0):.4f})."
        )
    else:
        if custom_csv:
            summary = (
                f"For your uploaded CSV dataset **{custom_csv.get('fileName', 'Custom CSV')}** ({custom_csv.get('sampleCount', st['sampleSize'])} monthly observations from "
                f"{custom_csv.get('startDate', tr['startDate'])} to {custom_csv.get('endDate', tr['endDate'])}), the detected trend is "
                f"**{custom_csv.get('trendDirection', st['trendDirection']).replace('_', ' ')}** with a deseasonalized Theil-Sen slope of "
                f"**{custom_csv.get('slopeDecade', slope_dec):+.4f} {custom_csv.get('unit', ds['unit'])}/decade** and Seasonal Mann-Kendall **p = {custom_csv.get('pValue', p_val):.4f}**."
            )
        elif is_multi_region_q and len(mentioned) >= 2:
            lines = []
            for r_id in mentioned[:3]:
                rm = compared.get(r_id)
                if not rm:
                    continue
                m_v = rm["lstDay"] if var_id == "lst" else rm["ndvi"]
                slope_k = m_v.get("sensSlopePerDecadeC") if var_id == "lst" else m_v.get("sensSlopePerDecade")
                mean_k = m_v.get("meanC") if var_id == "lst" else m_v.get("mean")
                unit_k = "°C" if var_id == "lst" else "NDVI"
                sig_k = "statistically significant (p < 0.05)" if m_v["significant"] else "not statistically significant (p ≥ 0.05)"
                lines.append(
                    f"• **{rm['regionName']}** ({rm['areaKm2']:,.0f} km²): Mean = **{mean_k:.4f} {unit_k}**, "
                    f"Deseasonalized Sen's Slope = **{slope_k:+.4f} {unit_k}/decade**, Seasonal Mann-Kendall **p = {m_v['pValue']:.4f}** (τ = {m_v['tau']:.3f} — {sig_k})."
                )
            glb = compared.get("global_mean", {}).get("ndvi" if var_id == "ndvi" else "lstDay", {})
            glb_slope = glb.get("sensSlopePerDecade") if var_id == "ndvi" else glb.get("sensSlopePerDecadeC")
            summary = (
                f"Direct statistical comparison across your requested study regions (2000–2024, Hirsch–Slack Seasonal Mann-Kendall period=12):\n"
                + "\n".join(lines)
                + (f"\nFor planetary context, the **Global Land Mean** trends at **{glb_slope:+.4f} {ds['unit']}/decade** (p = {glb.get('pValue', 0.0011):.4f})." if glb_slope is not None else "")
            )
        elif is_day_night_q and lc:
            day_sig = "statistically significant" if lc["daySignificant"] else "not statistically significant"
            night_sig = "statistically significant" if lc["nightSignificant"] else "not statistically significant"
            summary = (
                f"Across **{reg_name}** ({tr['startDate']} to {tr['endDate']}), NASA MODIS **MOD11C3.061** (0.05° CMG ~5.5 km radiative skin temperature) shows distinct daytime vs. nighttime thermal behavior:\n"
                f"• **Daytime LST (~10:30 LT):** Mean = **{lc['dayMeanC']:.2f} °C**, Sen's slope = **{lc['daySlopePerDecade']:+.3f} °C/decade** (Seasonal Mann-Kendall **p = {lc['dayPValue']:.4f}**, τ = {lc['dayTau']:.3f} — {day_sig}).\n"
                f"• **Nighttime LST (~22:30 LT):** Mean = **{lc['nightMeanC']:.2f} °C**, Sen's slope = **{lc['nightSlopePerDecade']:+.3f} °C/decade** (Seasonal Mann-Kendall **p = {lc['nightPValue']:.4f}**, τ = {lc['nightTau']:.3f} — {night_sig}).\n"
                f"• **Diurnal Thermal Spread (Day − Night):** Mean spread is **{lc['meanDiurnalSpreadC']:.2f} °C** (Day–Night correlation **r = {lc['dayNightPearsonR']:.3f}**, spread trend **{lc['diurnalSpreadSlopePerDecade']:+.3f} °C/decade**, p = {lc['diurnalSpreadPValue']:.4f}). Note that LST measures ground/canopy radiative skin temperature rather than 2-meter air temperature."
            )
        elif is_coupling_q:
            summary = (
                f"Across **{reg_name}** (2000–2024, n = {corr['sampleSize']} paired monthly composites), MODIS Land Surface Temperature (**MOD11C3.061**, 0.05° CMG) and Vegetation Cover (**MOD13Q1.061**, 250 m NDVI) exhibit a correlation of "
                f"**Pearson r = {corr['pearsonR']:.3f}** and **Spearman ρ = {corr['spearmanRho']:.3f}** (**p = {corr['pValue']:.4f}**).\n\n"
                f"In **{reg_name}**, NDVI averages **{ndvi_st['mean']:.4f} NDVI** (trend **{ndvi_st['sensSlope']:+.4f} NDVI/decade**, p = {ndvi_st['pValue']:.4f})"
                + (f" while Daytime LST averages **{lc['dayMeanC']:.2f} °C** (`{lc['daySlopePerDecade']:+.3f} °C/decade`) and Nighttime LST averages **{lc['nightMeanC']:.2f} °C** (`{lc['nightSlopePerDecade']:+.3f} °C/decade`). " if lc else ". ")
                + f"The time series contains **{corr['coOccurringStressCount']} co-occurring thermal and canopy stress episodes** (where high surface heat Z ≥ +1.25σ coincides with negative vegetation anomaly Z ≤ -1.15σ), reflecting evapotranspiration cooling loss during canopy stress."
            )
        elif is_anomaly_q:
            top_anoms = grounded.get("topAnomalies") or []
            anom_text = ", ".join(
                f"**{a['date']}** ({a['value']:.3f} {ds['unit']}, Z = {a['zScore']:+.2f}σ)"
                for a in top_anoms[:4]
            ) or "none exceeding |Z| ≥ 1.85σ"
            cp_sig = "statistically significant" if st.get("changePointSignificant") else "not statistically significant"
            summary = (
                f"In **{reg_name}** ({tr['startDate']} to {tr['endDate']}), the Pettitt (1979) non-parametric regime-shift test on deseasonalized **{ds['shortName']}** anomalies identifies a candidate change point around "
                f"**{st.get('changePointDate') or 'N/A'}** (**Pettitt p = {st.get('changePointPValue', 1.0):.4f}**, {cp_sig}).\n\n"
                f"Across all {st['sampleSize']} observations, **{st['anomaliesCount']} extreme anomalies** (|Z| ≥ 2.0σ against the 2000–2020 monthly climatology) were detected. "
                f"Strongest departures occurred on: {anom_text}."
            )
        else:
            cp_note = (
                f"with a significant Pettitt step shift around **{st['changePointDate']}** (p = {st['changePointPValue']:.4f})"
                if st.get("changePointSignificant")
                else f"with no abrupt step shift (Pettitt p = {st.get('changePointPValue', 1.0):.4f})"
            )
            summary = (
                f"For **{reg_name}** ({grounded['region']['areaKm2']:,.0f} km², {tr['startDate']} to {tr['endDate']}), **{ds['shortName']}.{ds['version']}** "
                f"(native resolution **{ds['spatialResolution']}**, DOI: {ds['doi']}) exhibits a **{st['trendDirection'].replace('_', ' ')}** trajectory that is **{sig_str}** at α = 0.05 "
                f"(Hirsch–Slack Seasonal Mann-Kendall **p = {p_val:.4f}**, **τ = {tau:.3f}**, **Z = {z_val:.2f}**).\n\n"
                f"The deseasonalized Theil-Sen slope is **{slope_dec:+.4f} {ds['unit']}/decade** (**{slope_yr:+.5f} {ds['unit']}/year**, 95% CI "
                f"[{st['slopeCiLower']:+.4f}, {st['slopeCiUpper']:+.4f}] {ds['unit']}/decade) around a regional mean of **{st['mean']:.4f} {ds['unit']}**, {cp_note}."
            )

        methodology = (
            f"Quality filtering applied via {ds['qualityBand']} (scale factor {ds['scaleFactor']}, NoData {ds['noDataValue']} excluded without synthetic gap-filling). "
            f"Seasonality is controlled via Hirsch–Slack Seasonal Mann-Kendall (period=12) and deseasonalized Theil-Sen median slopes against the 2000–2020 baseline."
        )

    evidence = [
        f"Active Region & Dataset: {reg_name} ({grounded['region']['areaKm2']:,.0f} km²) · {ds['shortName']}.{ds['version']} (DOI: {ds['doi']}, {ds['spatialResolution']}).",
        f"Seasonal Mann-Kendall & Sen's Slope: τ = {tau:.4f}, Z = {z_val:.3f}, p = {p_val:.5f} ({st['confidenceLevel']}), Slope = {slope_dec:+.4f} {ds['unit']}/decade (95% CI [{st['slopeCiLower']:+.4f}, {st['slopeCiUpper']:+.4f}]).",
        (
            f"Daytime vs Nighttime LST (MOD11C3): Day Mean = {lc['dayMeanC']:.2f} °C ({lc['daySlopePerDecade']:+.3f} °C/dec, p = {lc['dayPValue']:.4f}) · Night Mean = {lc['nightMeanC']:.2f} °C ({lc['nightSlopePerDecade']:+.3f} °C/dec, p = {lc['nightPValue']:.4f}) · Spread = {lc['meanDiurnalSpreadC']:.2f} °C."
            if lc
            else f"Regional Statistics ({reg_name}): Mean = {rst.get('mean', st['mean'])} {ds['unit']}, Median = {rst.get('median', st['median'])} {ds['unit']}, Valid Coverage = {rst.get('validCoveragePercent', 95.0)}%."
        ),
        f"NDVI–LST Thermal-Canopy Coupling (2000–2024): Pearson r = {corr['pearsonR']:.3f}, Spearman ρ = {corr['spearmanRho']:.3f} (p = {corr['pValue']:.4f}, n = {corr['sampleSize']} months), {corr['coOccurringStressCount']} co-occurring stress episodes.",
    ]

    drivers = [
        {
            "factor": "Evaporative Canopy Cooling & Seasonal Cropping / Phenology Calendar",
            "impactWeight": "Primary",
            "mechanism": "Seasonal canopy vigor and irrigation/moisture cycles modulate latent heat flux, typically suppressing daytime LST relative to bare peri-urban or dryland soils.",
        },
        {
            "factor": "Asymmetric Daytime Heating vs. Nighttime Cooling",
            "impactWeight": "Secondary",
            "mechanism": f"Detected {st['anomaliesCount']} standardized anomalies (|Z| ≥ 2.0σ) against the {grounded['dataset']['baselinePeriod']} baseline; surface thermal inertia elevates nighttime LST even when daytime extremes vary.",
        },
        {
            "factor": "Multi-Resolution Surface Measurement Contrast (250 m vs 0.05° CMG)",
            "impactWeight": "Contributing",
            "mechanism": "MODIS MOD13Q1/MOD13C2 captures canopy vegetation density while MOD11C3 measures 0.05° (~5.5 km) radiant surface skin temperature under clear-sky conditions.",
        },
    ]

    if var_id == "ndvi" and not is_day_night_q:
        limitations = [
            "Optical vegetation retrievals (MOD13Q1.061 250 m / MOD13C2.061 0.05° CMG; valid NDVI range -0.2 to 1.0) omit cloud/aerosol-masked pixels via pixel_reliability QC without synthetic interpolation.",
            "Intra-annual vegetation and agricultural seasonality is explicitly controlled using the Hirsch–Slack Seasonal Mann-Kendall test (period=12) and deseasonalized Theil-Sen anomalies.",
            "Spatial comparison with MODIS LST (0.05° CMG) in coupled diagnostics preserves native resolution without artificial thermal upsampling.",
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
        "id": f"ai_trendscope_{int(datetime.now(timezone.utc).timestamp())}",
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
    Calls the verified Google Gemini model from the backend, supplying the structured
    global & regional statistical JSON context tailored to the regions/variables in `prompt`.
    Never exposes GEMINI_API_KEY to the frontend.
    """
    eff_language = _detect_prompt_language(prompt, language)
    grounded = build_grounded_context(
        region_id=region_id,
        variable_id=variable_id,
        start_date=start_date,
        end_date=end_date,
        context_metrics=context_metrics,
        lst_mode=lst_mode,
        prompt=prompt,
    )
    fallback_resp = _generate_deterministic_grounded_response(grounded, eff_language, prompt=prompt)

    if not use_llm or not settings.GEMINI_API_KEY:
        return fallback_resp

    lang_name = LANGUAGE_LABELS.get(eff_language, "English")
    system_instruction = f"""You are the TrendScope — Global & Regional Earth Observation Chief Scientist.
You must answer strictly in {lang_name}.
Your job is to DIRECTLY and ACCURATELY answer the user's specific question (`User Question`) using ONLY the verified numbers in `grounded_context` (which includes `primaryStatistics`, `ndviStatistics`, `lstDayNightSummary`, `ndviLstCoupling`, `comparedRegions`, `topAnomalies`, and `globalBenchmark`).

MANDATORY SCIENTIFIC RULES:
1. Directly address what the user asked first in `summary`. Do NOT give a generic region monologue if the user asked a specific question (e.g., comparing two regions, comparing Daytime vs Nighttime LST, explaining NDVI-LST correlation, or explaining statistical significance).
2. Ground every single number in `grounded_context`. NEVER invent or alter p-values, Sen's slopes, Mann-Kendall tau/Z, means, areas, or correlation coefficients.
3. If the user asks about multiple regions (e.g., Kafr El-Sheikh and Beheira, or Amazon vs Global Mean), use the exact metrics for each region from `comparedRegions`.
4. If the user asks about Daytime vs Nighttime Land Surface Temperature (LST), cite the exact Daytime mean/slope/p-value, Nighttime mean/slope/p-value, and Diurnal spread from `lstDayNightSummary`, and note that LST is radiative ground/canopy skin temperature (distinct from 2-meter air temperature).
5. Do NOT refer to global biomes (Amazon, California Central Valley, Sahel, Aral Sea, Global Mean) as part of the Nile Delta.
6. Return valid JSON matching the requested schema."""

    compact_context = {
        "activeRegion": grounded["region"],
        "activeVariable": grounded["variableId"],
        "timeRange": grounded["timeRange"],
        "primaryStatistics": grounded["statistics"],
        "ndviStatistics": grounded["ndviStatistics"],
        "lstDayNightSummary": grounded["lstComparisonSummary"],
        "ndviLstCoupling": grounded["combinedCorrelation"],
        "comparedRegions": grounded["comparedRegions"],
        "globalBenchmark": grounded["globalBenchmark"],
        "topAnomalies": grounded["topAnomalies"],
        "customCsv": (grounded.get("clientProvidedMetrics") or {}).get("customCsv"),
    }

    user_payload = f"""User Question:
{prompt}

Verified Backend Grounded Context (JSON):
{json.dumps(compact_context, ensure_ascii=False)}

Return ONLY a JSON object with these keys:
- "summary": string (Direct, specific scientific answer to the User Question in {lang_name}, 1-2 concise paragraphs citing the exact relevant metrics from the JSON context)
- "methodologyExplanation": string (1 concise paragraph in {lang_name} explaining the statistical method relevant to the question, e.g. Seasonal Mann-Kendall period=12, deseasonalized Theil-Sen slope, Pettitt test, or MOD13Q1/MOD11C3 QC)
- "statisticalEvidence": array of 3 to 4 strings (exact numerical bullet points in {lang_name} supporting the answer)
- "potentialDrivers": array of 2 objects each with {{"factor": string, "impactWeight": "Primary"|"Secondary", "mechanism": string}}
- "limitationsAndUncertainties": array of 2 strings (key observational limitations relevant to the question in {lang_name})
- "citations": array of 2 strings (formal NASA dataset citations with DOIs)
"""

    candidate_models = []
    for m in ["gemini-2.5-flash", "gemini-2.0-flash", settings.GEMINI_MODEL, "gemini-flash-latest"]:
        if m and m not in candidate_models:
            candidate_models.append(m)

    for model_name in candidate_models:
        gen_cfg: Dict[str, Any] = {
            "temperature": 0.15,
            "responseMimeType": "application/json",
        }
        if "gemini-3" in model_name or "2.5" in model_name:
            gen_cfg["thinkingConfig"] = {"thinkingBudget": 0}

        body = {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_payload}]}],
            "generationConfig": gen_cfg,
        }
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
                parts = (
                    raw.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [])
                )
                text_out = ""
                for part in parts:
                    if isinstance(part, dict) and part.get("text") and not part.get("thought"):
                        text_out = part["text"]
                        break
                if not text_out and parts:
                    text_out = parts[-1].get("text", "")
                parsed = json.loads(text_out)
                return {
                    "id": f"ai_trendscope_{int(datetime.now(timezone.utc).timestamp())}",
                    "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                    "language": eff_language,
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
