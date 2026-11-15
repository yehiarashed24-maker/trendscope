import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Bot,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Sun,
  Moon,
  SunMoon,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataCard } from '../../components/common/DataCard';
import { StatisticalResultCard } from '../../components/common/StatisticalResultCard';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { ScientificChart } from '../../components/common/ScientificChart';
import { useAppStore } from '../../store/useAppStore';
import { analysisService } from '../../services/analysis/analysisService';
import { LstMode, TrendAnalysisResponse, SupportedLanguage } from '../../types/scientific';
import {
  formatNumber,
  formatScientificPValue,
  formatSignedRate,
  formatDate,
} from '../../utils/formatters';

export const AnalysisPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;

  const {
    activeConfig,
    saveCurrentInvestigation,
    setTimeRange,
    setLstMode,
    customCsvFile,
    customCsvFileName,
    customCsvAnalysis,
    customCsvAvailableRange,
    setCustomCsvSession,
    clearCustomCsvSession,
  } = useAppStore();
  const lstMode: LstMode = activeConfig.lstMode || 'day';

  const [loading, setLoading] = useState(!customCsvAnalysis);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<TrendAnalysisResponse | null>(customCsvAnalysis);

  // Dynamic CSV Time Period Filter State (CSV is uploaded from Map page under Variable)
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const customFileLoaded = customCsvFileName;
  const uploadedFile = customCsvFile;
  const customAvailableRange = customCsvAvailableRange;
  const [draftStartDate, setDraftStartDate] = useState<string>(
    customCsvAnalysis?.config?.timeRange?.startDate || activeConfig.timeRange.startDate
  );
  const [draftEndDate, setDraftEndDate] = useState<string>(
    customCsvAnalysis?.config?.timeRange?.endDate || activeConfig.timeRange.endDate
  );

  const applyTimeRange = async (start: string, end: string) => {
    if (!start || !end) {
      setUploadError(lang === 'ar' ? 'يرجى تحديد تاريخ البداية والنهاية.' : 'Please select both start and end dates.');
      return;
    }
    if (start > end) {
      setUploadError(lang === 'ar' ? 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية.' : 'Start date must be before end date.');
      return;
    }
    setUploadError(null);
    setDraftStartDate(start);
    setDraftEndDate(end);

    if (uploadedFile && customFileLoaded) {
      setUploading(true);
      try {
        const filteredResult = await analysisService.uploadAndAnalyzeCSV(
          uploadedFile,
          uploadedFile.name.replace(/\.[^/.]+$/, ''),
          'Index',
          'Custom Series',
          start,
          end
        );
        setAnalysisData(filteredResult);
        setCustomCsvSession({
          file: uploadedFile,
          fileName: customFileLoaded,
          analysis: filteredResult,
          availableRange: customAvailableRange,
        });
      } catch (err: any) {
        setUploadError(err?.message || 'Failed to analyze selected time period.');
      } finally {
        setUploading(false);
      }
      return;
    }

    setTimeRange({
      ...activeConfig.timeRange,
      startDate: start,
      endDate: end,
    });
  };

  const handleResetToNasa = () => {
    clearCustomCsvSession();
    setUploadError(null);
    setLoading(true);
    setDraftStartDate(activeConfig.timeRange.startDate);
    setDraftEndDate(activeConfig.timeRange.endDate);
    analysisService
      .getTrendAnalysis(activeConfig)
      .then((res) => {
        setAnalysisData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to fetch NASA data');
        setLoading(false);
      });
  };

  useEffect(() => {
    if (customCsvAnalysis) {
      setAnalysisData(customCsvAnalysis);
      setLoading(false);
      setError(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setError(null);

    analysisService
      .getTrendAnalysis(activeConfig)
      .then((res) => {
        if (isMounted) {
          setAnalysisData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve analysis');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeConfig, customCsvAnalysis]);

  useEffect(() => {
    if (analysisData?.config?.timeRange) {
      setDraftStartDate(analysisData.config.timeRange.startDate);
      setDraftEndDate(analysisData.config.timeRange.endDate);
    }
  }, [analysisData?.config?.timeRange?.startDate, analysisData?.config?.timeRange?.endDate]);

  if (loading) {
    return <LoadingState message="Computing Nile Delta Mann-Kendall, Sen's Slope & spatial raster statistics..." />;
  }

  if (error || !analysisData) {
    return (
      <ErrorState
        message="Analysis service currently unavailable"
        details={error || 'Unable to connect to scientific calculation backend.'}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { statistics, series, gridCells, unit, dataSource, status, rasterStatistics, seasonal } = analysisData;
  const isSig = statistics.mannKendall.significant;
  const slopeDecade = statistics.sensSlope.slopePerDecade;
  const slopeYear = statistics.sensSlope.slopePerYear;
  const direction =
    statistics.mannKendall.trendDirection === 'INCREASING'
      ? 'up'
      : statistics.mannKendall.trendDirection === 'DECREASING'
      ? 'down'
      : 'neutral';

  const trendText =
    statistics.mannKendall.trendDirection === 'INCREASING'
      ? t('analysis.summary.increasing')
      : statistics.mannKendall.trendDirection === 'DECREASING'
      ? t('analysis.summary.decreasing')
      : t('analysis.summary.noTrend');

  const nativeRes =
    activeConfig.variableId === 'ndvi'
      ? '250 m (MOD13Q1.061)'
      : '0.05° CMG (~5.5 km, MOD11C3.061)';
  const displayVariable = customFileLoaded
    ? customFileLoaded.replace(/\.[^/.]+$/, '')
    : activeConfig.variableId === 'lst'
    ? `${t('variables.lst.name')} (${t(`lstModes.${lstMode}` as any)})`
    : t(`variables.${activeConfig.variableId}.name` as any);
  const displayRegion = customFileLoaded
    ? 'Custom CSV Upload'
    : t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId;
  const displayResolution = customFileLoaded ? 'Tabular CSV (Monthly)' : nativeRes;

  // Compute Net Change, Most Significant Shift Date ("When"), and Hotspot/Target ("Where")
  const windowSize = Math.min(12, Math.max(1, Math.floor(series.length / 3)));
  const startWindow = series.slice(0, windowSize);
  const endWindow = series.slice(-windowSize);
  const startMean =
    startWindow.length > 0 ? startWindow.reduce((sum, p) => sum + p.value, 0) / startWindow.length : 0;
  const endMean =
    endWindow.length > 0 ? endWindow.reduce((sum, p) => sum + p.value, 0) / endWindow.length : 0;
  const netChange = endMean - startMean;
  const pctChange = startMean !== 0 ? (netChange / Math.abs(startMean)) * 100 : 0;

  let changePointDate = series[0]?.timestamp || analysisData.config.timeRange.startDate;
  if (series.length >= 4) {
    const totalSum = series.reduce((acc, p) => acc + p.value, 0);
    let prefixSum = 0;
    let bestScore = -1;
    for (let k = 1; k < series.length; k++) {
      prefixSum += series[k - 1].value;
      const meanLeft = prefixSum / k;
      const meanRight = (totalSum - prefixSum) / (series.length - k);
      const score = Math.abs(meanRight - meanLeft) * Math.sqrt((k * (series.length - k)) / series.length);
      if (score > bestScore) {
        bestScore = score;
        changePointDate = series[k].timestamp;
      }
    }
  }

  const hotspotCell =
    Array.isArray(gridCells) && gridCells.length > 0
      ? gridCells.reduce((best, curr) =>
          Math.abs(curr.trendPerDecade) > Math.abs(best.trendPerDecade) ? curr : best
        )
      : null;

  const provenanceMeta = (analysisData as any)?.provenance;
  const whereChangedLabel = customFileLoaded
    ? [provenanceMeta?.selectedDataset, provenanceMeta?.detectedColumns?.valueColumn].filter(Boolean).join(' • ') ||
      displayRegion
    : hotspotCell
    ? `${displayRegion} (${hotspotCell.lat.toFixed(2)}°N, ${hotspotCell.lng.toFixed(2)}°E)`
    : displayRegion;

  const significanceBadge = (
    <span
      className={`inline-flex items-center gap-2 text-xs font-mono font-semibold px-3 py-1 rounded-full border transition-all ${
        isSig
          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.45)]'
          : 'bg-red-500/20 text-red-200 border-red-400/70 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full animate-pulse ${
          isSig
            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]'
            : 'bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.95)]'
        }`}
      />
      <span>{isSig ? t('analysis.summary.significant') : t('analysis.summary.notSignificant')}</span>
    </span>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('analysis.title')}
        subtitle={t('analysis.subtitle')}
        status={status}
        extraBadge={significanceBadge}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Reset to NASA archive button if custom CSV was loaded from Map page */}
            {customFileLoaded && (
              <button
                type="button"
                onClick={handleResetToNasa}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium font-sans inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch back to official NASA observations"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Reset to NASA Archive</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                saveCurrentInvestigation();
                navigate('/workspace?tab=assistant');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium font-sans inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>Ask AI Scientist</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium font-sans inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Report</span>
            </button>
          </div>
        }
      />

      {/* CSV Upload Error / Active File Notice */}
      {uploadError && (
        <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/30 flex items-center justify-between gap-3 text-xs text-rose-200 font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-300 hover:text-white text-[11px] font-mono cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {customFileLoaded && (
        <div className="px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-200 font-sans">
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Dynamic CSV mode active: <strong className="font-mono text-white">{customFileLoaded}</strong>
            </span>
            {(analysisData as any)?.provenance?.detectedColumns && (
              <span className="text-[11px] font-mono text-emerald-300/80">
                ({(analysisData as any).provenance.detectedColumns.dateColumn} →{' '}
                {(analysisData as any).provenance.detectedColumns.valueColumn}
                {(analysisData as any).provenance.selectedDataset
                  ? ` • ${(analysisData as any).provenance.selectedDataset}`
                  : ''}
                )
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-emerald-400/90">SciPy + PyMannKendall</span>
        </div>
      )}

      {/* Analysis Summary Banner */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0B0F17] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <div className="text-[11px] text-zinc-500 font-sans">Variable</div>
              <div className="text-xs font-medium text-emerald-400 font-mono">
                {displayVariable} [{unit}]
              </div>
            </div>

            <div className="border-s border-zinc-800/80 ps-4">
              <div className="text-[11px] text-zinc-500 font-sans">
                {customFileLoaded ? 'Dataset Source' : 'Nile Delta Region'}
              </div>
              <div className="text-xs font-medium text-zinc-200 font-sans">
                {displayRegion}
              </div>
            </div>

            <div className="border-s border-zinc-800/80 ps-4">
              <div className="text-[11px] text-zinc-500 font-sans">Effective Period</div>
              <div className="text-xs font-mono text-zinc-300">
                {formatDate(analysisData.config.timeRange.startDate, lang)} –{' '}
                {formatDate(analysisData.config.timeRange.endDate, lang)}
              </div>
            </div>

            <div className="border-s border-zinc-800/80 ps-4">
              <div className="text-[11px] text-zinc-500 font-sans">
                {customFileLoaded ? 'Input Cadence' : 'Native Resolution'}
              </div>
              <div className="text-xs font-mono text-sky-400">{displayResolution}</div>
            </div>
          </div>

          {!customFileLoaded && activeConfig.variableId === 'lst' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-zinc-400 font-sans me-1">
                {t('lstModes.label')}:
              </span>
              {[
                { id: 'day' as LstMode, icon: Sun, key: 'lstModes.day' },
                { id: 'night' as LstMode, icon: Moon, key: 'lstModes.night' },
                { id: 'both' as LstMode, icon: SunMoon, key: 'lstModes.both' },
              ].map((m) => {
                const Icon = m.icon;
                const active = lstMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLstMode(m.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/60'
                        : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t(m.key as any)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Interactive Time Period Selector */}
        {(() => {
          const minBound = customAvailableRange?.startDate || '2000-02-18';
          const maxBound = customAvailableRange?.endDate || '2025-12-31';

          const shiftYearsBack = (years: number) => {
            const endAnchor = new Date(`${maxBound}T00:00:00Z`);
            if (Number.isNaN(endAnchor.getTime())) return minBound;
            const target = new Date(endAnchor);
            target.setUTCFullYear(target.getUTCFullYear() - years);
            const iso = target.toISOString().slice(0, 10);
            return iso < minBound ? minBound : iso;
          };

          return (
            <div className="pt-3 border-t border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-sans">
                <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{lang === 'ar' ? 'تحديد الفترة الزمنية للتحليل:' : 'Select Analysis Time Period:'}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 font-sans">{lang === 'ar' ? 'من' : 'From'}</span>
                  <input
                    type="date"
                    value={draftStartDate}
                    min={minBound}
                    max={draftEndDate || maxBound}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-500 font-sans">{lang === 'ar' ? 'إلى' : 'To'}</span>
                  <input
                    type="date"
                    value={draftEndDate}
                    min={draftStartDate || minBound}
                    max={maxBound}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700/80 text-zinc-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => applyTimeRange(draftStartDate, draftEndDate)}
                  className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium font-sans transition-colors cursor-pointer"
                >
                  {uploading ? (lang === 'ar' ? 'جاري التحليل...' : 'Applying...') : (lang === 'ar' ? 'تطبيق الفترة' : 'Apply Range')}
                </button>

                <div className="flex items-center gap-1 border-s border-zinc-800 ps-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => applyTimeRange(shiftYearsBack(5), maxBound)}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    {lang === 'ar' ? 'آخر 5 سنوات' : '5Y'}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => applyTimeRange(shiftYearsBack(10), maxBound)}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    {lang === 'ar' ? 'آخر 10 سنوات' : '10Y'}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => applyTimeRange(minBound, maxBound)}
                    className="px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-300 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    {lang === 'ar' ? 'كل الفترة' : 'Full'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Scientific Interpretation & Limitations (Above Chart) */}
      <DataCard
        title={t('analysis.interpretation.title')}
        subtitle={
          customFileLoaded
            ? 'Synthesized evaluation strictly grounded in uploaded CSV statistics'
            : 'Synthesized evaluation strictly grounded in computed Nile Delta evidence'
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans text-zinc-300">
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
            <div className="text-[11px] font-medium text-zinc-400 mb-1 font-sans">
              {t('analysis.interpretation.what')}
            </div>
            <p className="leading-relaxed text-zinc-300">
              {displayVariable} in <strong className="text-white">{displayRegion}</strong> shows{' '}
              <strong className="text-white font-medium">{trendText}</strong> across{' '}
              {statistics.sampleCount} monthly observations.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
            <div className="text-[11px] font-medium text-zinc-400 mb-1 font-sans">
              {lang === 'ar' ? 'أين ومتى حدث التغير؟' : 'Where & When it changed'}
            </div>
            <p className="leading-relaxed text-zinc-300">
              <strong className="text-sky-300 font-mono">{whereChangedLabel}</strong> (
              {netChange >= 0 ? '+' : ''}
              {pctChange.toFixed(1)}% net change, strongest structural shift around{' '}
              <strong className="text-white font-mono">{formatDate(changePointDate, lang)}</strong>).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
            <div className="text-[11px] font-medium text-zinc-400 mb-1 font-sans">
              {t('analysis.interpretation.magnitude')} & {t('analysis.interpretation.significance')}
            </div>
            <p className="leading-relaxed text-zinc-300">
              Theil-Sen slope is{' '}
              <strong className="text-white font-mono font-medium tabular-nums">
                {formatSignedRate(slopeDecade, `${unit}/decade`, lang)}
              </strong>{' '}
              (two-tailed Mann-Kendall p ={' '}
              <span className="font-mono text-emerald-400 tabular-nums">
                {formatScientificPValue(statistics.pValue, lang)}
              </span>
              , τ = {formatNumber(statistics.mannKendall.tau, lang)}).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80">
            <div className="text-[11px] font-medium text-amber-400/90 mb-1 flex items-center gap-1.5 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('analysis.interpretation.limitations')}</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
              {customFileLoaded
                ? 'Custom CSV series are resampled to monthly means prior to Mann-Kendall and Theil-Sen estimation. Ensure your date and numeric value columns represent comparable measurement conditions across time.'
                : 'MODIS MOD13Q1.061 operates at 250 m spatial resolution (16-day composite), while MODIS MOD11C3.061 provides 0.05° CMG (~5.5 km) monthly daytime (~10:30 LT) and nighttime (~22:30 LT) land surface skin temperature (distinct from near-surface air temperature).'}
            </p>
          </div>
        </div>
      </DataCard>

      {/* Main Chart ("التحليل") — Full Width */}
      <DataCard
        title={t('analysis.timeSeries.title')}
        subtitle={
          customFileLoaded
            ? 'Monthly aggregated trajectory with non-parametric Theil-Sen trendline & baseline'
            : analysisData.lstComparison
            ? 'Daytime (~10:30 LT) vs Nighttime (~22:30 LT) Land Surface Temperature with independent Theil-Sen slopes'
            : 'Nile Delta monthly trajectory with non-parametric Theil-Sen trendline & baseline'
        }
      >
        <ScientificChart
          series={
            analysisData.lstComparison
              ? analysisData.lstComparison.day.points.map((pt) => ({
                  timestamp: pt.date,
                  value: pt.value,
                  climatologyMean: pt.climatology ?? pt.value,
                  upperUncertainty: pt.confidenceUpper ?? pt.value,
                  lowerUncertainty: pt.confidenceLower ?? pt.value,
                  anomaly: pt.anomaly ?? 0,
                  zScore: pt.zScore,
                  trendLine: pt.trendLine,
                  qualityFlag: 'GOOD' as const,
                }))
              : series
          }
          variableName={displayVariable}
          unit={unit}
          trendSlopeDecade={
            analysisData.lstComparison
              ? analysisData.lstComparison.day.statistics.sensSlope
              : slopeDecade
          }
          height={420}
          dataSource={dataSource}
          primaryLabel={analysisData.lstComparison ? t('lstModes.day') : undefined}
          comparisonSeries={
            analysisData.lstComparison
              ? analysisData.lstComparison.night.points.map((pt) => ({
                  timestamp: pt.date,
                  value: pt.value,
                  climatologyMean: pt.climatology ?? pt.value,
                  upperUncertainty: pt.confidenceUpper ?? pt.value,
                  lowerUncertainty: pt.confidenceLower ?? pt.value,
                  anomaly: pt.anomaly ?? 0,
                  zScore: pt.zScore,
                  trendLine: pt.trendLine,
                  qualityFlag: 'GOOD' as const,
                }))
              : undefined
          }
          comparisonLabel={analysisData.lstComparison ? t('lstModes.night') : undefined}
          comparisonSlopeDecade={
            analysisData.lstComparison
              ? analysisData.lstComparison.night.statistics.sensSlope
              : undefined
          }
        />

        {analysisData.lstComparison && (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-amber-300">
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  {t('lstModes.day')}
                </span>
                <span className="font-mono text-zinc-400">
                  p = {formatScientificPValue(analysisData.lstComparison.day.statistics.pValue, lang)}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-white tabular-nums">
                {formatSignedRate(analysisData.lstComparison.day.statistics.sensSlope, '°C/dec', lang)}
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Mean {analysisData.lstComparison.day.statistics.mean.toFixed(2)} °C · τ = {formatNumber(analysisData.lstComparison.day.statistics.tau, lang)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/30 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-sky-300">
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  {t('lstModes.night')}
                </span>
                <span className="font-mono text-zinc-400">
                  p = {formatScientificPValue(analysisData.lstComparison.night.statistics.pValue, lang)}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-white tabular-nums">
                {formatSignedRate(analysisData.lstComparison.night.statistics.sensSlope, '°C/dec', lang)}
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Mean {analysisData.lstComparison.night.statistics.mean.toFixed(2)} °C · τ = {formatNumber(analysisData.lstComparison.night.statistics.tau, lang)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-300">
                <span className="inline-flex items-center gap-1.5">
                  <SunMoon className="w-3.5 h-3.5 text-emerald-400" />
                  Diurnal Spread (Day − Night)
                </span>
                <span className="font-mono text-zinc-400">
                  r = {analysisData.lstComparison.dayNightCorrelation.pearsonR.toFixed(3)}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-emerald-300 tabular-nums">
                {analysisData.lstComparison.dayNightCorrelation.meanDiurnalRange.toFixed(2)} °C mean spread
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Spread slope {formatSignedRate(analysisData.lstComparison.diurnalSpread.statistics.sensSlope, '°C/dec', lang)} · p = {formatScientificPValue(analysisData.lstComparison.diurnalSpread.statistics.pValue, lang)}
              </div>
            </div>
          </div>
        )}
      </DataCard>

      {/* Unified Statistical Metrics Row Below Chart (No Duplicates) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Direction (Increase or Not) & MK Tau */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0B0F17] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 font-sans">
              {lang === 'ar' ? 'الاتجاه (هل هناك زيادة؟)' : 'Direction (Increase or Not)'}
            </span>
            {direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : direction === 'down' ? (
              <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Minus className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
          </div>
          <div
            className={`text-lg font-bold font-sans ${
              direction === 'up'
                ? 'text-emerald-400'
                : direction === 'down'
                ? 'text-rose-400'
                : 'text-zinc-300'
            }`}
          >
            {direction === 'up'
              ? lang === 'ar'
                ? 'تزايد مستمر (Increase)'
                : 'Increasing'
              : direction === 'down'
              ? lang === 'ar'
                ? 'تناقص مستمر (Decrease)'
                : 'Decreasing'
              : lang === 'ar'
              ? 'لا يوجد اتجاه واضح (Stable)'
              : 'No Trend (Stable)'}
          </div>
          <div className="text-[11px] font-mono text-zinc-400 flex items-center justify-between border-t border-zinc-800/80 pt-2">
            <span>τ = {formatNumber(statistics.mannKendall.tau, lang)}</span>
            <span>Z = {formatNumber(statistics.mannKendall.zScore, lang)}</span>
          </div>
        </div>

        {/* 2. Change Magnitude & Where / When It Changed */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0B0F17] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400 font-sans">
              {lang === 'ar' ? `التغير في ${unit} ومكان/وقت التغير` : `Change in ${unit} & Where/When`}
            </span>
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-lg font-bold font-mono tabular-nums ${
                netChange > 0 ? 'text-emerald-400' : netChange < 0 ? 'text-rose-400' : 'text-zinc-200'
              }`}
            >
              {netChange >= 0 ? '+' : ''}
              {netChange.toFixed(4)} {unit}
            </span>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">
              ({pctChange >= 0 ? '+' : ''}
              {pctChange.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[11px] font-sans text-zinc-400 space-y-1 border-t border-zinc-800/80 pt-2">
            <div className="truncate" title={whereChangedLabel}>
              <span className="text-zinc-500">{lang === 'ar' ? 'المكان / الطبقة: ' : 'Where: '}</span>
              <span className="text-sky-300 font-mono">{whereChangedLabel}</span>
            </div>
            <div>
              <span className="text-zinc-500">{lang === 'ar' ? 'نقطة التحول: ' : 'Shift point: '}</span>
              <span className="text-zinc-200 font-mono">{formatDate(changePointDate, lang)}</span>
            </div>
          </div>
        </div>

        {/* 3. Sen's Slope */}
        <StatisticalResultCard
          label={t('analysis.statistics.sensSlopeDecade')}
          value={formatSignedRate(slopeDecade, unit, lang)}
          unit={`/ decade (${slopeYear >= 0 ? '+' : ''}${slopeYear.toFixed(5)}/yr)`}
          subtext="Non-parametric Theil-Sen median slope"
          direction={direction}
          statusBadge={<span className="text-[11px] font-mono text-amber-400/90">SciPy</span>}
        />

        {/* 4. P-Value + 95% CI, Samples & Spatial Coverage */}
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0B0F17] flex flex-col justify-between gap-2 text-xs font-sans text-zinc-400">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-zinc-400">{t('analysis.statistics.pValueText')}</span>
            <span className="text-[10px] font-mono text-zinc-500">α = 0.05</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {formatScientificPValue(statistics.pValue, lang)}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {statistics.pValue < 0.05 ? 'p < 0.05' : 'p ≥ 0.05'}
            </span>
          </div>
          <div className="space-y-1 border-t border-zinc-800/80 pt-2 text-[11px]">
            <div className="flex justify-between items-center">
              <span>{t('analysis.statistics.ci95')}</span>
              <span className="text-zinc-200 font-mono tabular-nums">
                [{formatNumber(statistics.sensSlope.ciLower, lang)},{' '}
                {formatNumber(statistics.sensSlope.ciUpper, lang)}] /dec
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('analysis.statistics.sampleCount')}</span>
              <span className="text-zinc-200 font-mono tabular-nums">{statistics.sampleCount}</span>
            </div>
            {rasterStatistics && (
              <div className="flex justify-between items-center">
                <span>Spatial Mean / Coverage</span>
                <span className="text-sky-300 font-mono tabular-nums">
                  {rasterStatistics.mean} {unit} ({rasterStatistics.validCoveragePercent}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Breakdown Table */}
      {seasonal?.seasonalSummary && seasonal.seasonalSummary.length > 0 && (
        <DataCard
          title="Seasonal Climatology & Intra-Annual Crop-Cycle Breakdown"
          subtitle={
            customFileLoaded
              ? 'Winter (DJF), Spring (MAM), Summer (JJA), and Autumn (SON) averages from uploaded CSV'
              : 'Nile Delta Winter (DJF), Spring (MAM), Summer (JJA), and Autumn (SON) statistical averages'
          }
          badge={<span className="text-[11px] font-mono text-sky-400">{displayResolution}</span>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {seasonal.seasonalSummary.map((s) => (
              <div
                key={s.season}
                className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1.5 font-mono text-xs"
              >
                <div className="text-zinc-300 font-semibold">{s.season}</div>
                <div className="text-lg font-bold text-white tabular-nums">
                  {s.mean.toFixed(4)} <span className="text-[10px] text-zinc-400">± {s.std.toFixed(3)}</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Slope: {s.slopePerYear >= 0 ? '+' : ''}
                  {s.slopePerYear.toFixed(5)}/yr (p = {s.pValue})
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};
