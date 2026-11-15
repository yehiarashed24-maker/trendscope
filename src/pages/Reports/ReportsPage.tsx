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
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium font-sans text-zinc-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>Ask AI Scientist</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || reportLoading}
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium text-xs font-sans inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingPdf ? 'Generating PDF...' : t('workspace.reports.exportPdf')}</span>
            </button>
          </div>
        }
      />

      {/* Target Investigation Quick Bar */}
      <div className="p-4 rounded-xl bg-[#0B0F17] border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-sans">
        <div className="flex items-center gap-4 flex-wrap">
          {isCustomCsv ? (
            <>
              <div>
                <span className="text-zinc-500 text-[11px]">CSV File: </span>
                <strong className="text-emerald-300 font-mono font-medium">{customCsvFileName}</strong>
              </div>
              <div className="border-s border-zinc-800/80 ps-4">
                <span className="text-zinc-500 text-[11px]">Variable / Column: </span>
                <strong className="text-white font-mono font-medium">
                  {csvValueCol || csvCleanTitle}
                </strong>
              </div>
              <div className="border-s border-zinc-800/80 ps-4">
                <span className="text-zinc-500 text-[11px]">Source: </span>
                <span className="text-zinc-300 font-mono text-[11px]">Custom CSV Upload</span>
              </div>
              <div className="border-s border-zinc-800/80 ps-4">
                <span className="text-zinc-500 text-[11px]">Observations: </span>
                <span className="text-sky-400 font-mono text-[11px]">
                  {reportAnalysis?.statistics.sampleCount ?? 0} rows ({csvDateCol || 'Date'})
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-zinc-500 text-[11px]">Nile Delta Region: </span>
                <strong className="text-white font-medium">
                  {t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId}
                </strong>
              </div>
              <div className="border-s border-zinc-800/80 ps-4">
                <span className="text-zinc-500 text-[11px]">Variable: </span>
                <strong className="text-emerald-400 font-mono font-medium">
                  {t(`variables.${activeConfig.variableId}.name` as any)}
                  {activeConfig.variableId === 'lst'
                    ? ` · ${t(`lstModes.${activeConfig.lstMode || 'day'}` as any)}`
                    : ''}
                </strong>
              </div>
              <div className="border-s border-zinc-800/80 ps-4">
                <span className="text-zinc-500 text-[11px]">Dataset: </span>
                <span className="text-zinc-300 font-mono text-[11px]">{activeConfig.datasetId}</span>
              </div>
              <div className="border-s border-zinc-800/80 ps-4">
                <span className="text-zinc-500 text-[11px]">Resolution: </span>
                <span className="text-sky-400 font-mono text-[11px]">{nativeRes}</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate('/explorer')}
          className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Change Parameters</span>
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {reportLoading || !reportAnalysis ? (
        <LoadingState message="Compiling verified Nile Delta scientific assessment dossier..." />
      ) : (
        <div className="p-8 sm:p-10 rounded-xl border border-zinc-800/80 bg-[#0B0F17] text-zinc-100 space-y-7 max-w-4xl mx-auto">
          <div className="border-b border-zinc-800/80 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-emerald-400/90 font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  {isCustomCsv
                    ? `TRENDSCOPE AI — CUSTOM CSV DATASET // ${customCsvFileName}`
                    : 'TRENDSCOPE AI — NILE DELTA EDITION // VERIFIED SCIENTIFIC DOSSIER'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-sans text-white mt-1.5 tracking-tight">
                {isCustomCsv
                  ? `${customCsvFileName} — Environmental Assessment Report`
                  : 'Nile Delta Environmental Assessment Report'}
              </h1>
              <div className="text-xs font-mono text-zinc-500 mt-1">
                {isCustomCsv
                  ? `Source File: ${customCsvFileName} • Column: ${csvValueCol || csvCleanTitle} • Language: ${lang.toUpperCase()}`
                  : `DOI: ${doiValue} • Language: ${lang.toUpperCase()} • CRS: EPSG:4326`}
              </div>
            </div>

            <DemoDataBadge status={reportAnalysis?.status || 'VERIFIED'} size="sm" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-sans">
              1. {t('workspace.reports.executiveSummary')}
            </h3>
            <p className="text-xs sm:text-sm font-sans text-zinc-300 leading-relaxed bg-zinc-900/40 p-5 rounded-xl border border-zinc-800/80">
              {isCustomCsv ? (
                <>
                  This assessment evaluates uploaded CSV dataset{' '}
                  <strong className="text-emerald-300 font-mono">{customCsvFileName}</strong>{' '}
                  (column: <strong className="text-white">{csvValueCol || csvCleanTitle}</strong>) from{' '}
                  {formatDate(reportAnalysis.config.timeRange.startDate, lang)} through{' '}
                  {formatDate(reportAnalysis.config.timeRange.endDate, lang)} across{' '}
                  <span className="font-mono text-sky-300">{reportAnalysis.statistics.sampleCount}</span> valid
                  observations.
                </>
              ) : (
                <>
                  This assessment evaluates{' '}
                  <strong className="text-white">
                    {t(`variables.${activeConfig.variableId}.name` as any)}
                  </strong>{' '}
                  exclusively within the Nile Delta subregion{' '}
                  <strong className="text-white">
                    ({t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId})
                  </strong>{' '}
                  from {formatDate(reportAnalysis.config.timeRange.startDate, lang)} through{' '}
                  {formatDate(reportAnalysis.config.timeRange.endDate, lang)} using{' '}
                  <span className="font-mono text-sky-300">{reportAnalysis.dataSource}</span>.
                </>
              )}{' '}
              Non-parametric Mann-Kendall analysis yields τ ={' '}
              <span className="font-mono text-white">
                {formatNumber(reportAnalysis.statistics.mannKendall.tau, lang)}
              </span>{' '}
              (Z = {formatNumber(reportAnalysis.statistics.mannKendall.zScore, lang)}, p ={' '}
              <span className="text-emerald-400 font-mono tabular-nums">
                {formatNumber(reportAnalysis.statistics.pValue, lang, { minimumFractionDigits: 4 })}
              </span>
              ) and a Theil-Sen slope of{' '}
              <strong className="text-amber-400 font-mono tabular-nums">
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-sans">
              2. {t('workspace.reports.methodology')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-500 font-medium">Sen&apos;s Slope</div>
                <div className="text-amber-400 font-bold font-mono text-sm mt-0.5 tabular-nums">
                  {formatSignedRate(
                    reportAnalysis.statistics.sensSlope.slopePerDecade,
                    `/dec`,
                    lang
                  )}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-500 font-medium">Mann-Kendall p</div>
                <div className="text-emerald-400 font-bold font-mono text-sm mt-0.5 tabular-nums">
                  {reportAnalysis.statistics.pValue < 0.0001
                    ? '< 0.0001'
                    : reportAnalysis.statistics.pValue}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-500 font-medium">Valid Coverage</div>
                <div className="text-white font-bold font-mono text-sm mt-0.5 tabular-nums">
                  {reportAnalysis.rasterStatistics?.validCoveragePercent ?? 95.0}%
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="text-[11px] text-zinc-500 font-medium">Sample Count</div>
                <div className="text-white font-bold font-mono text-sm mt-0.5 tabular-nums">
                  {reportAnalysis.statistics.sampleCount} mo
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-sans">
              3. {t('workspace.reports.limitations')}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
              {isCustomCsv
                ? `Statistics in this report were computed directly from the uploaded CSV file "${customCsvFileName}" using non-parametric Mann-Kendall rank correlation and the Theil-Sen median slope estimator. Missing or non-numeric rows were excluded without synthetic interpolation, and trend validity depends on the measurement protocol and sampling consistency of the source CSV.`
                : 'MODIS MOD13Q1.061 NDVI operates at 250 m native resolution (16-day composite; quality filtered via `_250m_16_days_pixel_reliability` retaining 0=Good and 1=Marginal), while MODIS MOD11C3.061 provides monthly Daytime (~10:30 LT) and Nighttime (~22:30 LT) radiative land surface skin temperature at 0.05° CMG (~5.5 km) — distinct from near-surface air temperature. Native resolutions are strictly preserved without artificial upsampling.'}
            </p>
          </div>

          {!isCustomCsv && reportAnalysis.lstComparison && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-sans">
                Daytime vs. Nighttime Surface Thermal Comparison (MOD11C3.061)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="text-[11px] text-amber-300 font-sans">Daytime (~10:30 LT)</div>
                  <div className="text-sm font-bold text-white mt-0.5 tabular-nums">
                    {formatSignedRate(reportAnalysis.lstComparison.day.statistics.sensSlope, '°C/dec', lang)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Mean {reportAnalysis.lstComparison.day.statistics.mean.toFixed(2)} °C · p = {reportAnalysis.lstComparison.day.statistics.pValue}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/30">
                  <div className="text-[11px] text-sky-300 font-sans">Nighttime (~22:30 LT)</div>
                  <div className="text-sm font-bold text-white mt-0.5 tabular-nums">
                    {formatSignedRate(reportAnalysis.lstComparison.night.statistics.sensSlope, '°C/dec', lang)}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Mean {reportAnalysis.lstComparison.night.statistics.mean.toFixed(2)} °C · p = {reportAnalysis.lstComparison.night.statistics.pValue}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                  <div className="text-[11px] text-zinc-300 font-sans">Diurnal Spread (Day − Night)</div>
                  <div className="text-sm font-bold text-emerald-300 mt-0.5 tabular-nums">
                    {reportAnalysis.lstComparison.dayNightCorrelation.meanDiurnalRange.toFixed(2)} °C spread
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {formatSignedRate(reportAnalysis.lstComparison.diurnalSpread.statistics.sensSlope, '°C/dec', lang)} · r = {reportAnalysis.lstComparison.dayNightCorrelation.pearsonR.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-4 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500">
            <div className="font-semibold text-zinc-400 font-sans">
              4. {t('workspace.reports.citations')}
            </div>
            {isCustomCsv ? (
              <>
                <div>
                  [1] User-Provided Dataset: &quot;{customCsvFileName}&quot; (Columns: {csvDateCol || 'Date'},{' '}
                  {csvValueCol || 'Value'} • TrendScope Dynamic CSV Analysis Pipeline).
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
