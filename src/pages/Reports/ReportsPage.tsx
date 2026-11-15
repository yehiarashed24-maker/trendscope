import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Download,
  ArrowRight,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { useAppStore } from '../../store/useAppStore';
import { analysisService } from '../../services/analysis/analysisService';
import { reportService } from '../../services/reports/reportService';
import { TrendAnalysisResponse, SupportedLanguage } from '../../types/scientific';
import { formatDate, formatNumber, formatSignedRate } from '../../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;

  const { activeConfig, customCsvFileName, customCsvAnalysis } = useAppStore();
  const isCustomCsv = Boolean(customCsvAnalysis && customCsvFileName);
  const csvProvenance = (customCsvAnalysis as any)?.provenance;
  const csvValueCol = csvProvenance?.detectedColumns?.valueColumn;
  const csvDateCol = csvProvenance?.detectedColumns?.dateColumn;
  const csvCleanTitle = customCsvFileName ? customCsvFileName.replace(/\.[^/.]+$/, '') : 'Custom CSV';

  const [reportAnalysis, setReportAnalysis] = useState<TrendAnalysisResponse | null>(customCsvAnalysis);
  const [reportLoading, setReportLoading] = useState(!customCsvAnalysis);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    if (customCsvAnalysis) {
      setReportAnalysis(customCsvAnalysis);
      setReportLoading(false);
      return;
    }

    let isMounted = true;
    setReportLoading(true);

    analysisService
      .getTrendAnalysis(activeConfig)
      .then((res) => {
        if (isMounted) {
          setReportAnalysis(res);
          setReportLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setReportLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeConfig, customCsvAnalysis]);

  const handleExportPdf = async () => {
    if (!reportAnalysis) return;
    setExportingPdf(true);
    const payload = reportService.generateReportPayload(
      activeConfig,
      reportAnalysis,
      lang,
      isCustomCsv ? customCsvFileName : null
    );
    await reportService.exportReportPdf(payload);
    setExportingPdf(false);
  };

  const nativeRes =
    activeConfig.variableId === 'ndvi'
      ? '250 m Native Sinusoidal Grid (16-day composite)'
      : `0.05° CMG (~5.5 km, ${activeConfig.lstMode === 'both' ? 'Day & Night' : activeConfig.lstMode === 'night' ? 'Nighttime' : 'Daytime'})`;

  const doiValue =
    activeConfig.variableId === 'ndvi'
      ? '10.5067/MODIS/MOD13Q1.061'
      : '10.5067/MODIS/MOD11C3.061';

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t('workspace.reports.title')}
        subtitle={t('workspace.reports.subtitle')}
        status={reportAnalysis?.status || 'VERIFIED'}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="h-9 px-3.5 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-xs font-normal font-sans text-[#eef0f5] inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
              <span>Ask AI Scientist</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || reportLoading}
              className="h-9 px-4 rounded-lg bg-[#eef0f5] hover:bg-white disabled:opacity-50 text-[#0b0d14] font-medium text-xs font-sans inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{exportingPdf ? 'Generating PDF...' : t('workspace.reports.exportPdf')}</span>
            </button>
          </div>
        }
      />

      {/* Target Investigation Quick Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#11141c] border border-[#eef0f5]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
        <div className="flex items-center gap-4 flex-wrap">
          {isCustomCsv ? (
            <>
              <div>
                <span className="text-[#7a8296] text-xs">CSV File: </span>
                <strong className="text-[#eef0f5] font-mono font-medium">{customCsvFileName}</strong>
              </div>
              <div className="border-s border-[#eef0f5]/[0.08] ps-4">
                <span className="text-[#7a8296] text-xs">Variable / Column: </span>
                <strong className="text-[#eef0f5] font-mono font-medium">
                  {csvValueCol || csvCleanTitle}
                </strong>
              </div>
              <div className="border-s border-[#eef0f5]/[0.08] ps-4">
                <span className="text-[#7a8296] text-xs">Source: </span>
                <span className="text-[#a3a9b8] font-mono text-xs">Custom CSV Upload</span>
              </div>
              <div className="border-s border-[#eef0f5]/[0.08] ps-4">
                <span className="text-[#7a8296] text-xs">Observations: </span>
                <span className="text-[#38bdf8] font-mono tabular-nums text-xs">
                  {reportAnalysis?.statistics.sampleCount ?? 0} rows ({csvDateCol || 'Date'})
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[#7a8296] text-xs">Nile Delta Region: </span>
                <strong className="text-[#eef0f5] font-medium">
                  {t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId}
                </strong>
              </div>
              <div className="border-s border-[#eef0f5]/[0.08] ps-4">
                <span className="text-[#7a8296] text-xs">Variable: </span>
                <strong className="text-[#eef0f5] font-mono font-medium">
                  {t(`variables.${activeConfig.variableId}.name` as any)}
                </strong>
              </div>
              <div className="border-s border-[#eef0f5]/[0.08] ps-4">
                <span className="text-[#7a8296] text-xs">Dataset: </span>
                <span className="text-[#a3a9b8] font-mono text-xs">{activeConfig.datasetId}</span>
              </div>
              <div className="border-s border-[#eef0f5]/[0.08] ps-4">
                <span className="text-[#7a8296] text-xs">Resolution: </span>
                <span className="text-[#38bdf8] font-mono tabular-nums text-xs">{nativeRes}</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/explorer')}
          className="text-xs text-[#a3a9b8] hover:text-[#eef0f5] font-normal inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer"
        >
          <span>Change Parameters</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 text-[#7a8296]" strokeWidth={1.5} />
        </button>
      </div>

      {reportLoading || !reportAnalysis ? (
        <LoadingState message="Compiling verified Nile Delta scientific assessment dossier..." />
      ) : (
        <div className="p-8 sm:p-10 rounded-2xl border border-[#eef0f5]/[0.08] bg-[#11141c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] text-[#eef0f5] space-y-8 max-w-4xl mx-auto">
          <div className="border-b border-[#eef0f5]/[0.08] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-[#a3a9b8] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4cc38a]" strokeWidth={1.5} />
                <span>
                  {isCustomCsv
                    ? `TrendScope · Custom CSV dataset — ${customCsvFileName}`
                    : 'TrendScope · Verified scientific dossier'}
                </span>
              </div>
              <h1 className="text-[22px] sm:text-[26px] leading-[1.2] font-medium font-sans text-[#eef0f5] mt-2 tracking-[-0.02em]">
                {isCustomCsv
                  ? `${customCsvFileName} — Environmental Assessment Report`
                  : 'Nile Delta Environmental Assessment Report'}
              </h1>
              <div className="text-xs font-mono tabular-nums text-[#7a8296] mt-1.5">
                {isCustomCsv
                  ? `Source file: ${customCsvFileName} · Column: ${csvValueCol || csvCleanTitle} · Language: ${lang.toUpperCase()}`
                  : `DOI: ${doiValue} · Language: ${lang.toUpperCase()} · CRS: EPSG:4326`}
              </div>
            </div>

            <DemoDataBadge status={reportAnalysis?.status || 'VERIFIED'} size="sm" />
          </div>

          <div className="space-y-2.5">
            <h3 className="text-[15px] font-medium text-[#eef0f5] font-sans">
              1. {t('workspace.reports.executiveSummary')}
            </h3>
            <p className="text-[13px] sm:text-[14px] font-sans text-[#a3a9b8] leading-[1.65] bg-[#07080d] p-5 rounded-xl border border-[#eef0f5]/[0.07]">
              {isCustomCsv ? (
                <>
                  This assessment evaluates uploaded CSV dataset{' '}
                  <strong className="text-[#eef0f5] font-mono font-medium">{customCsvFileName}</strong>{' '}
                  (column: <strong className="text-[#eef0f5] font-medium">{csvValueCol || csvCleanTitle}</strong>) from{' '}
                  {formatDate(reportAnalysis.config.timeRange.startDate, lang)} through{' '}
                  {formatDate(reportAnalysis.config.timeRange.endDate, lang)} across{' '}
                  <span className="font-mono tabular-nums text-[#eef0f5]">{reportAnalysis.statistics.sampleCount}</span> valid
                  observations.
                </>
              ) : (
                <>
                  This assessment evaluates{' '}
                  <strong className="text-[#eef0f5] font-medium">
                    {t(`variables.${activeConfig.variableId}.name` as any)}
                  </strong>{' '}
                  exclusively within the Nile Delta subregion{' '}
                  <strong className="text-[#eef0f5] font-medium">
                    ({t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId})
                  </strong>{' '}
                  from {formatDate(reportAnalysis.config.timeRange.startDate, lang)} through{' '}
                  {formatDate(reportAnalysis.config.timeRange.endDate, lang)} using{' '}
                  <span className="font-mono text-[#eef0f5]">{reportAnalysis.dataSource}</span>.
                </>
              )}{' '}
              Non-parametric Mann-Kendall analysis yields τ ={' '}
              <span className="font-mono tabular-nums text-[#eef0f5]">
                {formatNumber(reportAnalysis.statistics.mannKendall.tau, lang)}
              </span>{' '}
              (Z = {formatNumber(reportAnalysis.statistics.mannKendall.zScore, lang)}, p ={' '}
              <span className="text-[#4cc38a] font-mono tabular-nums">
                {formatNumber(reportAnalysis.statistics.pValue, lang, { minimumFractionDigits: 4 })}
              </span>
              ) and a Theil-Sen slope of{' '}
              <strong className="text-[#eef0f5] font-mono font-medium tabular-nums">
                {formatSignedRate(
                  reportAnalysis.statistics.sensSlope.slopePerDecade,
                  `${reportAnalysis.unit}/decade`,
                  lang
                )}
              </strong>
              .
            </p>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-[15px] font-medium text-[#eef0f5] font-sans">
              2. {t('workspace.reports.methodology')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
              <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                <div className="text-xs text-[#7a8296] font-normal">Sen&apos;s Slope</div>
                <div className="text-[#eef0f5] font-medium font-mono text-[22px] leading-none mt-2 tabular-nums">
                  {formatSignedRate(
                    reportAnalysis.statistics.sensSlope.slopePerDecade,
                    `/dec`,
                    lang
                  )}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                <div className="text-xs text-[#7a8296] font-normal">Mann-Kendall p</div>
                <div className="text-[#4cc38a] font-medium font-mono text-[22px] leading-none mt-2 tabular-nums">
                  {reportAnalysis.statistics.pValue < 0.0001
                    ? '< 0.0001'
                    : reportAnalysis.statistics.pValue}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                <div className="text-xs text-[#7a8296] font-normal">Valid Coverage</div>
                <div className="text-[#eef0f5] font-medium font-mono text-[22px] leading-none mt-2 tabular-nums">
                  {reportAnalysis.rasterStatistics?.validCoveragePercent ?? 95.0}%
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                <div className="text-xs text-[#7a8296] font-normal">Sample Count</div>
                <div className="text-[#eef0f5] font-medium font-mono text-[22px] leading-none mt-2 tabular-nums">
                  {reportAnalysis.statistics.sampleCount} mo
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-[15px] font-medium text-[#eef0f5] font-sans">
              3. {t('workspace.reports.limitations')}
            </h3>
            <p className="text-[13px] text-[#a3a9b8] leading-[1.6] font-sans bg-[#07080d] p-5 rounded-xl border border-[#eef0f5]/[0.07]">
              {isCustomCsv
                ? `Statistics in this report were computed directly from the uploaded CSV file "${customCsvFileName}" using non-parametric Mann-Kendall rank correlation and the Theil-Sen median slope estimator. Missing or non-numeric rows were excluded without synthetic interpolation, and trend validity depends on the measurement protocol and sampling consistency of the source CSV.`
                : 'MODIS MOD13Q1.061 NDVI operates at 250 m native resolution (16-day composite; quality filtered via `_250m_16_days_pixel_reliability` retaining 0=Good and 1=Marginal), while MODIS MOD11C3.061 provides monthly Daytime (~10:30 LT) and Nighttime (~22:30 LT) radiative land surface skin temperature at 0.05° CMG (~5.5 km) — distinct from near-surface air temperature. Native resolutions are strictly preserved without artificial upsampling.'}
            </p>
          </div>

          {!isCustomCsv && reportAnalysis.lstComparison && (
            <div className="space-y-2.5">
              <h3 className="text-[15px] font-medium text-[#eef0f5] font-sans">
                Daytime vs. Nighttime Surface Thermal Comparison (MOD11C3.061)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                  <div className="text-xs text-[#7a8296] font-sans">Daytime (~10:30 LT)</div>
                  <div className="text-[20px] leading-none font-medium text-[#eef0f5] mt-2 tabular-nums">
                    {formatSignedRate(reportAnalysis.lstComparison.day.statistics.sensSlope, '°C/dec', lang)}
                  </div>
                  <div className="text-[11px] text-[#a3a9b8] mt-1.5 tabular-nums">
                    Mean {reportAnalysis.lstComparison.day.statistics.mean.toFixed(2)} °C · p = {reportAnalysis.lstComparison.day.statistics.pValue}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                  <div className="text-xs text-[#7a8296] font-sans">Nighttime (~22:30 LT)</div>
                  <div className="text-[20px] leading-none font-medium text-[#eef0f5] mt-2 tabular-nums">
                    {formatSignedRate(reportAnalysis.lstComparison.night.statistics.sensSlope, '°C/dec', lang)}
                  </div>
                  <div className="text-[11px] text-[#a3a9b8] mt-1.5 tabular-nums">
                    Mean {reportAnalysis.lstComparison.night.statistics.mean.toFixed(2)} °C · p = {reportAnalysis.lstComparison.night.statistics.pValue}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
                  <div className="text-xs text-[#7a8296] font-sans">Diurnal Spread (Day − Night)</div>
                  <div className="text-[20px] leading-none font-medium text-[#eef0f5] mt-2 tabular-nums">
                    {reportAnalysis.lstComparison.dayNightCorrelation.meanDiurnalRange.toFixed(2)} °C spread
                  </div>
                  <div className="text-[11px] text-[#a3a9b8] mt-1.5 tabular-nums">
                    {formatSignedRate(reportAnalysis.lstComparison.diurnalSpread.statistics.sensSlope, '°C/dec', lang)} · r = {reportAnalysis.lstComparison.dayNightCorrelation.pearsonR.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t border-[#eef0f5]/[0.08] text-[11px] font-mono text-[#7a8296]">
            <div className="font-medium text-xs text-[#a3a9b8] font-sans">
              4. {t('workspace.reports.citations')}
            </div>
            {isCustomCsv ? (
              <>
                <div>
                  [1] User-Provided Dataset: &quot;{customCsvFileName}&quot; (Columns: {csvDateCol || 'Date'},{' '}
                  {csvValueCol || 'Value'} · TrendScope Dynamic CSV Analysis Pipeline).
                </div>
                <div>
                  [2] Mann, H. B. (1945); Kendall, M. G. (1975); Sen, P. K. (1968). Non-parametric Mann-Kendall rank trend test &amp; Theil-Sen median slope estimator.
                </div>
              </>
            ) : (
              <>
                <div>[1] Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061 (MOD13Q1.061). NASA EOSDIS LP DAAC. DOI: 10.5067/MODIS/MOD13Q1.061</div>
                <div>[2] Wan, Z., Hook, S., Hulley, G. (2021). MODIS/Terra Land Surface Temperature/Emissivity Monthly L3 Global 0.05Deg CMG V061 (MOD11C3.061). NASA EOSDIS LP DAAC. DOI: 10.5067/MODIS/MOD11C3.061</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
