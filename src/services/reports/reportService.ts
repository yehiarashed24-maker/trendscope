import { InvestigationConfig, TrendAnalysisResponse, SupportedLanguage } from '../../types/scientific';
import { formatNumber, formatSignedRate } from '../../utils/formatters';

export interface ScientificReportPayload {
  reportId: string;
  generatedAt: string;
  language: SupportedLanguage;
  title: string;
  config: InvestigationConfig;
  analysis: TrendAnalysisResponse;
  customCsvFileName?: string | null;
  executiveSummary: string;
  dataGovernanceStatement: string;
}

export const reportService = {
  /**
   * Compiles complete scientific report document structure (NASA Nile Delta or Custom CSV)
   */
  generateReportPayload(
    config: InvestigationConfig,
    analysis: TrendAnalysisResponse,
    language: SupportedLanguage = 'en',
    customCsvFileName?: string | null
  ): ScientificReportPayload {
    const pVal = analysis.statistics.pValue;
    const slopeDecade = analysis.statistics.sensSlope.slopePerDecade;
    const slopeYear = analysis.statistics.sensSlope.slopePerYear;
    const tau = analysis.statistics.mannKendall.tau;
    const sigText = analysis.statistics.mannKendall.significant
      ? 'statistically significant at α = 0.05'
      : 'not statistically significant at α = 0.05';

    if (customCsvFileName) {
      const cleanStem = customCsvFileName.replace(/\.[^/.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_');
      return {
        reportId: `TRENDSCOPE-CSV-${cleanStem.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        generatedAt: new Date().toISOString(),
        language,
        title: `TRENDSCOPE AI — Assessment Report: ${customCsvFileName}`,
        config,
        analysis,
        customCsvFileName,
        executiveSummary: `This assessment evaluates uploaded CSV file "${customCsvFileName}" across ${analysis.config.timeRange.startDate} to ${analysis.config.timeRange.endDate}. Non-parametric Mann-Kendall testing yields τ = ${formatNumber(tau, language, { minimumFractionDigits: 3 })}, p = ${formatNumber(pVal, language, { minimumFractionDigits: 4 })} (${sigText}), with a Theil-Sen slope of ${formatSignedRate(slopeYear, `${analysis.unit}/yr`, language)} (${formatSignedRate(slopeDecade, `${analysis.unit}/decade`, language)}).`,
        dataGovernanceStatement: `All statistical metrics in this report originate directly from the user-uploaded CSV dataset "${customCsvFileName}".`,
      };
    }

    return {
      reportId: `EPR-NILEDELTA-${config.regionId.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      generatedAt: new Date().toISOString(),
      language,
      title: `TRENDSCOPE AI — Nile Delta Scientific Dossier: ${config.regionId.toUpperCase()} (${config.variableId.toUpperCase()})`,
      config,
      analysis,
      customCsvFileName: null,
      executiveSummary: `This scientific investigation evaluates ${config.variableId.toUpperCase()}${config.variableId === 'lst' ? ` (${config.lstMode === 'both' ? 'Day & Night' : config.lstMode === 'night' ? 'Nighttime' : 'Daytime'})` : ''} across the Nile Delta subregion (${config.regionId}) using ${analysis.dataSource}. Across ${config.timeRange.startDate} to ${config.timeRange.endDate}, non-parametric Mann-Kendall testing yields τ = ${formatNumber(tau, language, { minimumFractionDigits: 3 })}, p = ${formatNumber(pVal, language, { minimumFractionDigits: 4 })} (${sigText}), with a Theil-Sen slope of ${formatSignedRate(slopeYear, `${analysis.unit}/yr`, language)} (${formatSignedRate(slopeDecade, `${analysis.unit}/decade`, language)}). Native spatial resolutions (250 m for MODIS MOD13Q1.061 NDVI vs 0.05° CMG ~5.5 km for MOD11C3.061 Land Surface Temperature) are strictly preserved.`,
      dataGovernanceStatement:
        'All observational metrics originate from quality-filtered NASA EOSDIS LP DAAC MODIS archives (MOD13Q1.061 NDVI, DOI: 10.5067/MODIS/MOD13Q1.061, and MOD11C3.061 Day/Night Land Surface Temperature, DOI: 10.5067/MODIS/MOD11C3.061) clipped to the Nile Delta study area in Egypt. LST measures land-surface skin temperature (distinct from air temperature).',
    };
  },

  /**
   * Triggers server-side ReportLab PDF generation via `/api/reports/generate`
   */
  async exportReportPdf(payload: ScientificReportPayload): Promise<{ success: boolean; mode: 'server' | 'browser' }> {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: payload.config,
          regionId: payload.config.regionId,
          variableId: payload.config.variableId,
          lstMode: payload.config.lstMode || 'day',
          timeRange: payload.config.timeRange,
          language: payload.language,
          customCsvFileName: payload.customCsvFileName || null,
          analysis: payload.customCsvFileName ? payload.analysis : undefined,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${payload.reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return { success: true, mode: 'server' };
      }
    } catch (err) {
      console.warn('Backend PDF generator error, falling back to print:', err);
    }

    window.print();
    return { success: true, mode: 'browser' };
  },
};
