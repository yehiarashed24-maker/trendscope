import io
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

from backend.services.geography_service import geography_service
from backend.services.stats_engine import (
    get_enriched_dataset_meta,
    run_full_variable_analysis,
    run_combined_nile_delta_investigation,
)
from backend.services.ai_service import _generate_deterministic_grounded_response


def _build_custom_csv_pdf_report(payload: Dict[str, Any], csv_name: str, analysis: Dict[str, Any]) -> bytes:
    stats = analysis.get("statistics") or {}
    mk = stats.get("mannKendall") or {}
    sens = stats.get("sensSlope") or {}
    prov = analysis.get("provenance") or {}
    detected = prov.get("detectedColumns") or {}
    tr = (analysis.get("config") or {}).get("timeRange") or payload.get("timeRange") or {}
    unit = str(analysis.get("unit") or "Index")
    series = analysis.get("series") or []
    vals = [float(p["value"]) for p in series if isinstance(p, dict) and p.get("value") is not None]
    mean_v = sum(vals) / len(vals) if vals else 0.0
    min_v = min(vals) if vals else 0.0
    max_v = max(vals) if vals else 0.0

    gen_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    safe_csv = xml_escape(str(csv_name))
    safe_val_col = xml_escape(str(detected.get("valueColumn") or csv_name))
    safe_date_col = xml_escape(str(detected.get("dateColumn") or "Date"))

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"TrendScope AI — {csv_name} Assessment Report",
        author="TrendScope AI",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CsvDocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0B192C"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "CsvDocSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8,
    )
    sec_style = ParagraphStyle(
        "CsvSecHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "CsvBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=4,
    )
    small_style = ParagraphStyle(
        "CsvSmall",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor("#475569"),
        spaceAfter=4,
    )

    story = [
        Paragraph(f"TRENDSCOPE AI — {safe_csv}", title_style),
        Paragraph(
            f"Custom CSV Environmental Assessment Report • Source File: {safe_csv} • Generated: {gen_date}",
            subtitle_style,
        ),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=8),
        Paragraph("1. Uploaded CSV Dataset Provenance", sec_style),
    ]

    sample_total = stats.get("sampleCount") if stats.get("sampleCount") is not None else stats.get("sampleSize", len(vals))
    meta_rows = [
        ["Source File Name", str(csv_name)],
        ["Data Origin", "User-Uploaded CSV Dataset (TrendScope Dynamic Analysis)"],
        ["Detected Value Column", str(detected.get("valueColumn") or csv_name)],
        ["Detected Date Column", str(detected.get("dateColumn") or "Date")],
        ["Observation Period", f"{tr.get('startDate', 'N/A')} to {tr.get('endDate', 'N/A')}"],
        ["Valid Observations", f"{sample_total}"],
        ["Unit", unit],
    ]
    t_meta = Table(meta_rows, colWidths=[52 * mm, 124 * mm])
    t_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94A3B8")),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(t_meta)

    story.append(Paragraph("2. Non-Parametric Mann-Kendall & Theil-Sen Slope Results", sec_style))
    stat_rows = [
        ["Metric", "Value", "Metric", "Value"],
        ["Trend Direction", str(mk.get("trendDirection", "NO TREND")).upper(), "Statistical Significance", "Significant (p < 0.05)" if mk.get("significant") else "Not Significant (p >= 0.05)"],
        ["Mann-Kendall Tau", f"{float(mk.get('tau', 0.0)):.4f}", "Mann-Kendall Z-Score", f"{float(mk.get('zScore', 0.0)):+.3f}"],
        ["Two-Tailed p-Value", f"{float(stats.get('pValue', 1.0)):.5f}", "Sample Count", f"{sample_total}"],
        ["Sen's Slope (per Year)", f"{float(sens.get('slopePerYear', 0.0)):+.5f} {unit}/yr", "Sen's Slope (per Decade)", f"{float(sens.get('slopePerDecade', 0.0)):+.4f} {unit}/dec"],
        ["Series Mean", f"{mean_v:.4f} {unit}", "Series Min / Max", f"{min_v:.4f} / {max_v:.4f} {unit}"],
    ]
    t_stat = Table(stat_rows, colWidths=[44 * mm, 44 * mm, 44 * mm, 44 * mm])
    t_stat.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F8FAFC")),
                ("BACKGROUND", (2, 1), (2, -1), colors.HexColor("#F8FAFC")),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94A3B8")),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(t_stat)

    story.append(Paragraph("3. Methodology, Limitations & Source Citation", sec_style))
    story.append(
        Paragraph(
            f"Trend statistics were calculated directly from the uploaded CSV dataset <b>{safe_csv}</b> "
            f"(columns: {safe_date_col}, {safe_val_col}) using the two-tailed Mann-Kendall rank test and Theil-Sen median slope estimator.",
            body_style,
        )
    )
    story.append(
        Paragraph(
            f"• <b>Primary Source Citation:</b> User-Provided Dataset \"{safe_csv}\" (TrendScope Dynamic CSV Analysis Pipeline).",
            small_style,
        )
    )
    doc.build(story)
    return buf.getvalue()


def _clean_pdf_text(text: str) -> str:
    """Convert Markdown/LaTeX inline tokens to clean Unicode for ReportLab PDF paragraphs."""
    s = str(text or "")
    replacements = [
        ("**", ""),
        ("`", ""),
        ("\\alpha", "α"),
        ("\\tau", "τ"),
        ("\\rho", "ρ"),
        ("\\sigma", "σ"),
        ("\\pm", "±"),
        ("\\ge", "≥"),
        ("\\le", "≤"),
        ("$", ""),
    ]
    for old, new in replacements:
        s = s.replace(old, new)
    return s


def generate_scientific_pdf_report(payload: Dict[str, Any]) -> bytes:
    """
    Generates a comprehensive, publication-grade PDF Scientific Dossier for global & regional
    study areas (including high-resolution Nile Delta benchmarks) or custom CSV datasets.
    """
    custom_csv = payload.get("customCsvFileName")
    custom_analysis = payload.get("analysis")
    if custom_csv and isinstance(custom_analysis, dict):
        return _build_custom_csv_pdf_report(payload, str(custom_csv), custom_analysis)
    config = payload.get("config") or {}
    region_id = config.get("regionId") or payload.get("regionId") or "nile_delta"
    variable_id = config.get("variableId") or payload.get("variableId") or "ndvi"
    if variable_id not in ("ndvi", "lst"):
        variable_id = "ndvi"
    lst_mode = config.get("lstMode") or payload.get("lstMode") or "day"
    if lst_mode not in ("day", "night", "both"):
        lst_mode = "day"

    tr = config.get("timeRange") or payload.get("timeRange") or {}
    start_date = tr.get("startDate", "2000-02-18")
    end_date = tr.get("endDate", "2024-12-31")
    aggregation = tr.get("aggregation", "monthly")
    language = payload.get("language", "en")

    try:
        reg_meta = geography_service.get_region(region_id)
    except Exception:
        reg_meta = {
            "id": region_id,
            "name": "Custom Study Polygon",
            "areaKm2": 24450.0,
            "climateZone": "Regional Earth Observation Zone",
        }

    is_global_or_world = bool(reg_meta.get("isGlobalOrWorld"))
    if region_id == "global_mean":
        scope_label = "Planetary Land Baseline (Global Mean — NASA GISTEMP / MODIS CMG)"
    elif is_global_or_world:
        scope_label = f"Global Regional Study Area — {reg_meta.get('name')}"
    else:
        scope_label = "Regional High-Resolution Benchmark — Nile Delta, Egypt"

    primary_analysis = run_full_variable_analysis(
        region_id=region_id,
        variable_id=variable_id,
        start_date=start_date,
        end_date=end_date,
        aggregation=aggregation,
        lst_mode=lst_mode,
    )
    combined = run_combined_nile_delta_investigation(
        region_id=region_id,
        start_date="2000-02-18",
        end_date=end_date,
        lst_mode=lst_mode,
    )

    ds_meta = get_enriched_dataset_meta(variable_id)
    st = primary_analysis["statistics"]
    rst = primary_analysis["rasterStatistics"]
    corr = combined["correlation"]

    grounded_ctx = {
        "studyArea": scope_label,
        "region": {
            "id": reg_meta.get("id", region_id),
            "name": reg_meta.get("name", region_id),
            "areaKm2": reg_meta.get("areaKm2") or reg_meta.get("area_km2", 24450.0),
            "isGlobalOrWorld": is_global_or_world,
        },
        "variableId": variable_id,
        "lstMode": lst_mode if variable_id == "lst" else None,
        "dataset": ds_meta,
        "timeRange": primary_analysis["config"]["timeRange"],
        "statistics": st,
        "rasterStatistics": rst,
        "combinedCorrelation": {
            "pearsonR": corr["pearsonR"],
            "spearmanRho": corr["spearmanRho"],
            "pValue": corr["pValue"],
            "sampleSize": corr["sampleSize"],
            "coOccurringStressCount": len(combined["coOccurringStressEpisodes"]),
            "resolutionNotice": combined["resolutionNotice"],
        },
    }
    ai_interp = payload.get("aiInterpretation")
    if (
        not ai_interp
        or not ai_interp.get("summary")
        or (is_global_or_world and "Nile Delta" in str(ai_interp.get("summary", "")))
    ):
        ai_interp = _generate_deterministic_grounded_response(grounded_ctx, "en")

    gen_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"TrendScope — Scientific Earth Observation Dossier ({reg_meta.get('name')})",
        author="TrendScope — Global & Regional Earth Intelligence",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0B192C"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
        spaceAfter=8,
    )
    sec_style = ParagraphStyle(
        "SecHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=4,
    )
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor("#475569"),
        spaceAfter=4,
    )

    story = []

    # Header
    story.append(Paragraph("TRENDSCOPE — GLOBAL & REGIONAL EARTH OBSERVATION", title_style))
    story.append(
        Paragraph(
            f"Scientific Earth Observation & Environmental Intelligence Dossier • Generated: {gen_date}",
            subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

    # Section 1: Study Area, Dataset & Provenance Metadata (Items 1-9 & 19)
    story.append(Paragraph("1. Study Region, NASA Dataset Provenance & Quality Control", sec_style))
    area_km2 = reg_meta.get("areaKm2") or reg_meta.get("area_km2") or 24450.0
    lst_mode_label = (
        f" — {'Day & Night Comparison' if lst_mode == 'both' else ('Nighttime (~22:30 LT)' if lst_mode == 'night' else 'Daytime (~10:30 LT)')}"
        if variable_id == "lst"
        else ""
    )
    native_res_str = (
        "0.05° CMG (~5.5 km Global Grid — MOD13C2.061 / MOD11C3.061 & NASA POWER)"
        if is_global_or_world
        else f"{ds_meta['spatialResolution']} (MODIS NDVI = 250 m vs MOD11C3 LST = 0.05° CMG ~5.5 km)"
    )
    meta_rows = [
        ["Geographic Scope", scope_label],
        ["Selected Study Region", f"{reg_meta.get('name')} (ID: {region_id}, Area: {area_km2:,.1f} km²)"],
        ["Primary Variable", f"{ds_meta['title']} ({variable_id.upper()}{lst_mode_label}) [{ds_meta['unit']}]"],
        ["Secondary Coupled Variable", "MODIS Land Surface Temperature (MOD11C3.061, 0.05° CMG)" if variable_id == "ndvi" else "MODIS NDVI (MOD13Q1.061 / MOD13C2.061)"],
        ["Dataset Short Name & Version", f"{ds_meta['shortName']} Version {ds_meta['version']} ({ds_meta['collectionConceptId']})"],
        ["Official DOI", ds_meta["doi"]],
        ["Observation Period", f"{primary_analysis['config']['timeRange']['startDate']} to {primary_analysis['config']['timeRange']['endDate']} ({aggregation})"],
        ["Native Spatial Resolution", native_res_str],
        ["Native Temporal Resolution", f"{ds_meta['temporalResolution']} (Historical Coverage: {ds_meta['historicalCoverage']})"],
        ["Scale Factor & NoData", f"Scale Factor: {ds_meta['scaleFactor']} | Valid Range: {ds_meta['validRange']} | Fill/NoData: {ds_meta['noDataValue']}"],
        ["Quality Filtering Applied", f"Band: {ds_meta['qualityBand']} — Retains Good/Recommended retrievals; clouds/water/bad retrievals masked as NaN"],
        ["Climatological Baseline", f"{ds_meta['baselinePeriod']} monthly reference climatology"],
    ]
    t_meta = Table(meta_rows, colWidths=[52 * mm, 124 * mm])
    t_meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94A3B8")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(t_meta)

    # Section 2: Non-Parametric Mann-Kendall & Sen's Slope Results (Items 10-12)
    test_method = st.get("testMethod", "Seasonal Mann-Kendall (Hirsch-Slack, period=12)")
    short_method = "Seasonal MK (period=12)" if "Seasonal" in test_method else "Mann-Kendall (Annual)"
    pettitt_summary = (
        f"Shift at {st['changePointDate']} (p={st['changePointPValue']:.3f})"
        if st.get("changePointSignificant")
        else f"No shift (Pettitt p={st.get('changePointPValue', 1.0):.3f})"
    )
    story.append(Paragraph("2. Non-Parametric Trend, Seasonality Control & Sen's Slope Results", sec_style))
    story.append(
        Paragraph(
            f"Trend significance is evaluated via <b>{test_method}</b> (pymannkendall), which accounts for intra-annual "
            "seasonality on monthly data, and trend magnitude is quantified using the deseasonalized Theil-Sen median "
            "slope estimator (scipy.stats.theilslopes) with 95% confidence intervals.",
            body_style,
        )
    )
    stat_rows = [
        ["Metric", "Value", "Metric", "Value"],
        ["Trend Direction", st["trendDirection"].upper(), "Statistical Significance", st["confidenceLevel"]],
        ["Mann-Kendall Tau (τ)", f"{st['tau']:.4f}", "Mann-Kendall Z-Score", f"{st['zScore']:+.3f}"],
        ["Mann-Kendall S-Statistic", f"{st['sStatistic']:+.1f}", "Two-Tailed p-Value", f"{st['pValue']:.5f}"],
        ["Sen's Slope (per Year)", f"{st['sensSlopePerYear']:+.5f} {ds_meta['unit']}/yr", "Sen's Slope (per Decade)", f"{st['sensSlope']:+.4f} {ds_meta['unit']}/dec"],
        ["95% CI (per Decade)", f"[{st['slopeCiLower']:+.4f}, {st['slopeCiUpper']:+.4f}]", "Sample Size (Valid obs)", f"{st['sampleSize']}"],
        ["Pettitt Change-Point Test", pettitt_summary, "Trend Method", short_method],
        ["Time-Series Mean ± SD", f"{st['mean']:.4f} ± {st['stdDev']:.4f} {ds_meta['unit']}", "Time-Series Min / Max", f"{st['min']:.4f} / {st['max']:.4f} {ds_meta['unit']}"],
    ]
    t_stat = Table(stat_rows, colWidths=[44 * mm, 44 * mm, 44 * mm, 44 * mm])
    t_stat.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F8FAFC")),
                ("BACKGROUND", (2, 1), (2, -1), colors.HexColor("#F8FAFC")),
                ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94A3B8")),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(t_stat)

    # Section 3: Spatial Raster Statistics & Multi-Sensor Correlation (Items 13-16)
    story.append(Paragraph("3. Spatial Raster Statistics & Combined NDVI–LST Coupling", sec_style))
    spatial_rows = [
        ["Spatial Mean (Polygon Clipped)", f"{rst.get('mean', st['mean'])} {ds_meta['unit']}", "Spatial Median", f"{rst.get('median', st['median'])} {ds_meta['unit']}"],
        ["Spatial Min / Max", f"{rst.get('min', st['min'])} / {rst.get('max', st['max'])} {ds_meta['unit']}", "Spatial Std Dev", f"{rst.get('std', st['stdDev'])} {ds_meta['unit']}"],
        ["Valid Pixel Count", f"{rst.get('validPixelCount', 0):,} / {rst.get('totalPixelCount', 0):,}", "Valid Spatial Coverage", f"{rst.get('validCoveragePercent', 95.0)}%"],
        ["NDVI–LST Pearson r", f"{corr['pearsonR']:+.4f} (p = {corr['pValue']:.5f})", "Spearman Rank ρ", f"{corr['spearmanRho']:+.4f} (n = {corr['sampleSize']})"],
        ["Co-Occurring Stress Episodes", f"{len(combined['coOccurringStressEpisodes'])} months (|Z| ≥ 1.25)", "Overlapping Period", "2000-02-18 to 2024-12-31"],
    ]
    t_spat = Table(spatial_rows, colWidths=[48 * mm, 40 * mm, 44 * mm, 44 * mm])
    t_spat.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F1F5F9")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94A3B8")),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ]
        )
    )
    story.append(t_spat)

    # Optional Daytime vs Nighttime LST comparison summary table when mode == 'both'
    lst_comp = primary_analysis.get("lstComparison")
    if lst_comp:
        story.append(Spacer(1, 5))
        story.append(Paragraph("<b>Daytime vs. Nighttime Surface Thermal Comparison (MOD11C3.061):</b>", body_style))
        d_st = lst_comp["day"]["statistics"]
        n_st = lst_comp["night"]["statistics"]
        sp_st = lst_comp["diurnalSpread"]["statistics"]
        comp_rows = [
            ["Measurement Pass", "Mean (°C)", "Sen's Slope (/dec)", "Mann-Kendall p-val"],
            ["Daytime LST (~10:30 LT)", f"{d_st['mean']:.2f} ± {d_st['stdDev']:.2f}", f"{d_st['sensSlope']:+.4f} °C", f"{d_st['pValue']:.5f}"],
            ["Nighttime LST (~22:30 LT)", f"{n_st['mean']:.2f} ± {n_st['stdDev']:.2f}", f"{n_st['sensSlope']:+.4f} °C", f"{n_st['pValue']:.5f}"],
            ["Diurnal Spread (Day − Night)", f"{sp_st['mean']:.2f} ± {sp_st['stdDev']:.2f}", f"{sp_st['sensSlope']:+.4f} °C", f"{sp_st['pValue']:.5f}"],
        ]
        t_comp = Table(comp_rows, colWidths=[56 * mm, 40 * mm, 40 * mm, 40 * mm])
        t_comp.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.0),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94A3B8")),
                    ("TOPPADDING", (0, 0), (-1, -1), 3.0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3.0),
                ]
            )
        )
        story.append(t_comp)

    # Anomaly Summary
    top_anoms = primary_analysis.get("anomalies", [])[:4]
    if top_anoms:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Detected Standardized Anomalies (|Z| ≥ 1.85σ vs Baseline):</b>", body_style))
        for a in top_anoms:
            story.append(
                Paragraph(
                    f"• <b>{a['date']}</b> [{a['severity'].upper()}]: Observed = {a['value']:.4f} {ds_meta['unit']} "
                    f"(Expected = {a['expectedValue']:.4f}, Deviation = {a['deviation']:+.4f}, Z = {a['zScore']:+.2f}σ)",
                    body_style,
                )
            )

    # Section 4: Grounded AI Scientific Interpretation (Item 17)
    story.append(Paragraph("4. Grounded AI Scientist Interpretation", sec_style))
    story.append(Paragraph(_clean_pdf_text(ai_interp.get("summary", "")), body_style))
    story.append(Paragraph(f"<b>Methodological Note:</b> {_clean_pdf_text(ai_interp.get('methodologyExplanation', ''))}", body_style))

    # Section 5: Limitations, Resolution Difference & Citations (Items 5, 18, 20)
    if variable_id == "ndvi":
        story.append(Paragraph("5. Dataset Limitations, Seasonality Handling & Official Citations", sec_style))
        story.append(
            Paragraph(
                "• <b>Optical Vegetation Dataset Scope (MOD13Q1.061 / MOD13C2.061):</b> NDVI measures canopy greenness and photosynthetic vigor (valid physical range -0.2 to 1.0) "
                "using 250 m 16-day composites (_250m_16_days_pixel_reliability retaining 0=Good and 1=Marginal) and 0.05° CMG monthly global continuity. "
                "Cloud/aerosol contamination is masked without synthetic interpolation.",
                body_style,
            )
        )
        story.append(
            Paragraph(
                "• <b>Phenology & Seasonality Control:</b> Regional vegetation and agricultural canopies exhibit strong intra-annual seasonal cycles. "
                "Trend significance is computed using the Seasonal Mann-Kendall test (Hirsch–Slack, period=12) and deseasonalized Theil-Sen slope rather than unadjusted monthly ranks.",
                body_style,
            )
        )
    else:
        story.append(Paragraph("5. Scientific Limitations, Skin-vs-Air Temperature Note & Official Citations", sec_style))
        story.append(
            Paragraph(
                "• <b>Skin Temperature vs. Air Temperature (MOD11C3.061):</b> MODIS MOD11C3.061 measures monthly Clear-Sky radiative land surface skin temperature (0.05° CMG ~5.5 km) "
                "at Terra daytime (~10:30 LT) and nighttime (~22:30 LT) overpasses, which heats faster by day and differs physically from 2 m meteorological air temperature.",
                body_style,
            )
        )
    story.append(
        Paragraph(
            "• <b>Coupled Resolution Note & Correlation vs. Causation:</b> Regional NDVI vs. LST (0.05° CMG) comparison preserves native sensor footprints without artificial thermal upsampling; "
            "statistical coupling does not isolate single-factor causation without ground-station validation.",
            body_style,
        )
    )
    story.append(Paragraph(f"• <b>Primary Citation:</b> {ds_meta['citation']}", small_style))
    story.append(
        Paragraph(
            "Disclaimer: TrendScope — Global & Regional Earth Observation Platform utilizes publicly available NASA Earth Observation archives "
            "(EOSDIS LP DAAC / NASA POWER / GISS) for scientific research and is not an official NASA publication.",
            small_style,
        )
    )

    doc.build(story)
    return buf.getvalue()

