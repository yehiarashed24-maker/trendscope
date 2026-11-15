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
import { calculatePettittChangePoint } from '../../services/statistics/trendStatistics';
import { LstMode, TemporalAggregation, TrendAnalysisResponse, SupportedLanguage } from '../../types/scientific';
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
  const ciLower = statistics.sensSlope.ciLower;
  const ciUpper = statistics.sensSlope.ciUpper;
  const isNdviUnit = unit.toUpperCase().includes('NDVI');
  const slopeDecimals = isNdviUnit || (slopeDecade !== 0 && Math.abs(slopeDecade) < 0.05) ? 4 : 2;
  const activeAggregation = analysisData.config?.timeRange?.aggregation || activeConfig.timeRange.aggregation || 'monthly';
  const testMethodLabel =
    statistics.testMethod ||
    (activeAggregation === 'monthly' && statistics.sampleCount >= 24
      ? 'Seasonal Mann-Kendall (Hirsch–Slack, period = 12)'
      : activeAggregation === 'annual'
      ? 'Annual Mann-Kendall (de-seasonalized by year)'
      : 'Two-tailed Mann-Kendall');

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
      ? '250 m (MOD13Q1.061) / 0.05° (MOD13C2.061)'
      : '0.05° CMG (~5.5 km, MOD11C3.061)';
  const displayVariable = customFileLoaded
    ? customFileLoaded.replace(/\.[^/.]+$/, '')
    : t(`variables.${activeConfig.variableId}.name` as any);
  const displayRegion = customFileLoaded
    ? 'Custom CSV Upload'
    : t(`regions.${activeConfig.regionId}` as any) || activeConfig.regionId;
  const displayResolution = customFileLoaded ? 'Tabular CSV (Monthly)' : nativeRes;

  // Compute Theil-Sen period change (sign-consistent with slope & Mann-Kendall tau) & Pettitt change-point test
  const seriesMean =
    typeof statistics.mean === 'number'
      ? statistics.mean
      : series.length > 0
      ? series.reduce((sum, p) => sum + p.value, 0) / series.length
      : 0;
  const startMs = Date.parse(analysisData.config.timeRange.startDate);
  const endMs = Date.parse(analysisData.config.timeRange.endDate);
  const spanYears =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.max(1, (endMs - startMs) / (365.25 * 86400000))
      : Math.max(1, activeAggregation === 'annual' ? statistics.sampleCount : statistics.sampleCount / 12);
  const netChange = slopeYear * spanYears;
  const pctChange = seriesMean !== 0 ? (netChange / Math.abs(seriesMean)) * 100 : 0;
  const pctPerDecade = seriesMean !== 0 ? (slopeDecade / Math.abs(seriesMean)) * 100 : 0;

  const changePoint =
    statistics.changePoint && statistics.changePoint.date
      ? statistics.changePoint
      : calculatePettittChangePoint(
          series.map((p) => p.timestamp),
          series.map((p) => (activeAggregation === 'monthly' && series.length >= 24 ? p.anomaly : p.value))
        );
  const changePointDate = changePoint.date || series[0]?.timestamp || analysisData.config.timeRange.startDate;

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
    <span className="inline-flex items-center gap-2 text-xs font-mono text-[#a3a9b8] px-2.5 py-1 rounded-md bg-[#11141c] border border-[#eef0f5]/[0.08]">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isSig ? 'bg-[#4cc38a]' : 'bg-[#e5484d]'
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
                className="h-9 px-3.5 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] text-[#eef0f5] border border-[#eef0f5]/[0.08] text-xs font-normal font-sans inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer"
                title="Switch back to official NASA observations"
              >
                <RefreshCw className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
                <span>Reset to NASA archive</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                saveCurrentInvestigation();
                navigate('/workspace?tab=assistant');
              }}
              className="h-9 px-3.5 rounded-lg bg-[#11141c] hover:bg-[#1a1e28] text-[#eef0f5] border border-[#eef0f5]/[0.08] text-xs font-normal font-sans inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
              <span>Ask AI Scientist</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="h-9 px-4 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] text-xs font-medium font-sans inline-flex items-center gap-2 transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer"
            >
              <FileText className="w-4 h-4" strokeWidth={1.5} />
              <span>Generate report</span>
            </button>
          </div>
        }
      />

      {/* CSV Upload Error / Active File Notice */}
      {uploadError && (
        <div className="p-4 rounded-xl border border-[#e5484d]/30 bg-[#11141c] flex items-center justify-between gap-3 text-xs text-[#eef0f5] font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#e5484d] shrink-0" strokeWidth={1.5} />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-mono cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {customFileLoaded && (
        <div className="px-4 py-3 rounded-xl border border-[#4cc38a]/30 bg-[#11141c] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#a3a9b8] font-sans">
          <div className="flex items-center gap-2 flex-wrap">
            <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0" strokeWidth={1.5} />
            <span>
              Dynamic CSV mode active: <strong className="font-mono font-medium text-[#eef0f5]">{customFileLoaded}</strong>
            </span>
            {(analysisData as any)?.provenance?.detectedColumns && (
              <span className="text-xs font-mono text-[#7a8296]">
                ({(analysisData as any).provenance.detectedColumns.dateColumn} →{' '}
                {(analysisData as any).provenance.detectedColumns.valueColumn}
                {(analysisData as any).provenance.selectedDataset
                  ? ` · ${(analysisData as any).provenance.selectedDataset}`
                  : ''}
                )
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-[#7a8296]">SciPy · PyMannKendall</span>
        </div>
      )}

      {/* Analysis Summary Banner */}
      <div className="p-5 rounded-2xl border border-[#eef0f5]/[0.08] bg-[#11141c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-wrap">
            <div>
              <div className="text-xs text-[#7a8296] font-sans">Variable</div>
              <div className="text-[13px] font-medium text-[#eef0f5] font-mono mt-0.5">
                {displayVariable} [{unit}]
              </div>
            </div>

            <div className="border-s border-[#eef0f5]/[0.08] ps-5">
              <div className="text-xs text-[#7a8296] font-sans">
                {customFileLoaded ? 'Dataset source' : 'Nile Delta region'}
              </div>
              <div className="text-[13px] font-medium text-[#eef0f5] font-sans mt-0.5">
                {displayRegion}
              </div>
            </div>

            <div className="border-s border-[#eef0f5]/[0.08] ps-5">
              <div className="text-xs text-[#7a8296] font-sans">Effective period</div>
              <div className="text-[13px] font-mono tabular-nums text-[#a3a9b8] mt-0.5">
                {formatDate(analysisData.config.timeRange.startDate, lang)} –{' '}
                {formatDate(analysisData.config.timeRange.endDate, lang)}
              </div>
            </div>

            <div className="border-s border-[#eef0f5]/[0.08] ps-5">
              <div className="text-xs text-[#7a8296] font-sans">
                {customFileLoaded ? 'Input cadence' : 'Native resolution'}
              </div>
              <div className="text-[13px] font-mono tabular-nums text-[#38bdf8] mt-0.5">{displayResolution}</div>
            </div>
          </div>

          {!customFileLoaded && activeConfig.variableId === 'lst' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#7a8296] font-sans">
                {t('lstModes.label')}
              </span>
              <div className="inline-flex rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] p-0.5 gap-0.5">
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
                      className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-sans transition-colors duration-150 cursor-pointer ${
                        active
                          ? 'bg-[#1a1e28] text-[#eef0f5] font-medium'
                          : 'text-[#7a8296] hover:text-[#eef0f5]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{t(m.key as any)}</span>
                    </button>
                  );
                })}
              </div>
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
            <div className="pt-4 border-t border-[#eef0f5]/[0.07] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#a3a9b8] font-sans">
                <Calendar className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
                <span>{lang === 'ar' ? 'تحديد الفترة الزمنية للتحليل' : 'Analysis time period'}</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#7a8296] font-sans">{lang === 'ar' ? 'من' : 'From'}</span>
                  <input
                    type="date"
                    value={draftStartDate}
                    min={minBound}
                    max={draftEndDate || maxBound}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-[#eef0f5] font-mono tabular-nums text-xs focus:outline-none focus:border-[#38bdf8]/50"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#7a8296] font-sans">{lang === 'ar' ? 'إلى' : 'To'}</span>
                  <input
                    type="date"
                    value={draftEndDate}
                    min={draftStartDate || minBound}
                    max={maxBound}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-[#eef0f5] font-mono tabular-nums text-xs focus:outline-none focus:border-[#38bdf8]/50"
                  />
                </div>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => applyTimeRange(draftStartDate, draftEndDate)}
                  className="h-8 px-3.5 rounded-lg bg-[#eef0f5] hover:bg-white disabled:opacity-50 text-[#0b0d14] text-xs font-medium font-sans transition-colors duration-150 cursor-pointer"
                >
                  {uploading ? (lang === 'ar' ? 'جاري التحليل...' : 'Applying...') : (lang === 'ar' ? 'تطبيق الفترة' : 'Apply range')}
                </button>

                <div className="flex items-center gap-1 border-s border-[#eef0f5]/[0.08] ps-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => applyTimeRange(shiftYearsBack(5), maxBound)}
                    className="h-8 px-2.5 rounded-lg bg-[#07080d] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-mono tabular-nums cursor-pointer transition-colors duration-150"
                  >
                    {lang === 'ar' ? '5 سنوات' : '5Y'}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => applyTimeRange(shiftYearsBack(10), maxBound)}
                    className="h-8 px-2.5 rounded-lg bg-[#07080d] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-[#a3a9b8] hover:text-[#eef0f5] text-xs font-mono tabular-nums cursor-pointer transition-colors duration-150"
                  >
                    {lang === 'ar' ? '10 سنوات' : '10Y'}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => applyTimeRange(minBound, maxBound)}
                    className="h-8 px-2.5 rounded-lg bg-[#07080d] hover:bg-[#1a1e28] border border-[#eef0f5]/[0.08] text-[#38bdf8] text-xs font-mono cursor-pointer transition-colors duration-150"
                  >
                    {lang === 'ar' ? 'كامل الفترة' : 'Full'}
                  </button>
                </div>

                {!customFileLoaded && (
                  <div
                    className="inline-flex rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] p-0.5 gap-0.5 border-s ms-1"
                    title="Switch between Monthly Seasonal Mann-Kendall (period=12) and Annual aggregated Mann-Kendall"
                  >
                    {(['monthly', 'annual'] as TemporalAggregation[]).map((agg) => {
                      const active = activeAggregation === agg;
                      return (
                        <button
                          key={agg}
                          type="button"
                          onClick={() =>
                            setTimeRange({
                              ...activeConfig.timeRange,
                              aggregation: agg,
                            })
                          }
                          className={`h-7 px-2.5 rounded-md text-xs font-mono transition-colors duration-150 cursor-pointer ${
                            active
                              ? 'bg-[#1a1e28] text-[#eef0f5] font-medium'
                              : 'text-[#7a8296] hover:text-[#eef0f5]'
                          }`}
                        >
                          {agg === 'monthly'
                            ? lang === 'ar'
                              ? 'شهري (موسمي)'
                              : 'Monthly (Seasonal MK)'
                            : lang === 'ar'
                            ? 'سنوي'
                            : 'Annual MK'}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

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
          <div className="mt-5 pt-5 border-t border-[#eef0f5]/[0.07] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-[#eef0f5]">
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
                  {t('lstModes.day')}
                </span>
                <span className="font-mono tabular-nums text-[#7a8296]">
                  p = {formatScientificPValue(analysisData.lstComparison.day.statistics.pValue, lang)}
                </span>
              </div>
              <div className="text-[20px] leading-none font-mono font-medium text-[#eef0f5] tabular-nums">
                {formatSignedRate(analysisData.lstComparison.day.statistics.sensSlope, '°C/dec', lang)}
              </div>
              <div className="text-xs font-mono tabular-nums text-[#7a8296]">
                Mean {analysisData.lstComparison.day.statistics.mean.toFixed(2)} °C · τ = {formatNumber(analysisData.lstComparison.day.statistics.tau, lang)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-[#eef0f5]">
                <span className="inline-flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
                  {t('lstModes.night')}
                </span>
                <span className="font-mono tabular-nums text-[#7a8296]">
                  p = {formatScientificPValue(analysisData.lstComparison.night.statistics.pValue, lang)}
                </span>
              </div>
              <div className="text-[20px] leading-none font-mono font-medium text-[#eef0f5] tabular-nums">
                {formatSignedRate(analysisData.lstComparison.night.statistics.sensSlope, '°C/dec', lang)}
              </div>
              <div className="text-xs font-mono tabular-nums text-[#7a8296]">
                Mean {analysisData.lstComparison.night.statistics.mean.toFixed(2)} °C · τ = {formatNumber(analysisData.lstComparison.night.statistics.tau, lang)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-[#eef0f5]">
                <span className="inline-flex items-center gap-1.5">
                  <SunMoon className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />
                  Diurnal spread (Day − Night)
                </span>
                <span className="font-mono tabular-nums text-[#7a8296]">
                  r = {analysisData.lstComparison.dayNightCorrelation.pearsonR.toFixed(3)}
                </span>
              </div>
              <div className="text-[20px] leading-none font-mono font-medium text-[#38bdf8] tabular-nums">
                {analysisData.lstComparison.dayNightCorrelation.meanDiurnalRange.toFixed(2)} °C spread
              </div>
              <div className="text-xs font-mono tabular-nums text-[#7a8296]">
                Slope {formatSignedRate(analysisData.lstComparison.diurnalSpread.statistics.sensSlope, '°C/dec', lang)} · p = {formatScientificPValue(analysisData.lstComparison.diurnalSpread.statistics.pValue, lang)}
              </div>
            </div>
          </div>
        )}
      </DataCard>

      {/* Scientific Interpretation & Limitations (Below Chart) */}
      <DataCard
        title={t('analysis.interpretation.title')}
        subtitle={
          customFileLoaded
            ? 'Synthesized evaluation strictly grounded in uploaded CSV statistics'
            : 'Synthesized evaluation strictly grounded in computed Nile Delta evidence'
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans text-[#a3a9b8]">
          <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
            <div className="text-xs font-medium text-[#eef0f5] mb-1.5 font-sans">
              {t('analysis.interpretation.what')}
            </div>
            <p className="leading-5 text-[#a3a9b8]">
              {displayVariable} in <strong className="text-[#eef0f5] font-medium">{displayRegion}</strong> shows{' '}
              <strong className="text-[#eef0f5] font-medium">{trendText}</strong> across{' '}
              <span className="font-mono tabular-nums text-[#eef0f5]">{statistics.sampleCount}</span>{' '}
              {activeAggregation === 'annual' ? 'annual' : 'monthly'} observations ({testMethodLabel}).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
            <div className="text-xs font-medium text-[#eef0f5] mb-1.5 font-sans">
              {lang === 'ar' ? 'الموقع واختبار نقطة التحول' : 'Location & regime-shift test'}
            </div>
            <p className="leading-5 text-[#a3a9b8]">
              <strong className="text-[#38bdf8] font-mono font-normal">{whereChangedLabel}</strong>{' '}
              (<span className="font-mono tabular-nums">{netChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%</span> Theil-Sen
              period change over <span className="font-mono tabular-nums">{spanYears.toFixed(1)}</span> yrs;{' '}
              {changePoint.significant ? (
                <>
                  Pettitt step change around{' '}
                  <strong className="text-[#eef0f5] font-mono font-normal tabular-nums">
                    {formatDate(changePointDate, lang)}
                  </strong>
                  , p = {formatScientificPValue(changePoint.pValue, lang)}
                </>
              ) : (
                <>
                  no significant step change, Pettitt p ={' '}
                  <span className="font-mono tabular-nums text-[#eef0f5]">
                    {formatNumber(changePoint.pValue, lang, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                  </span>
                </>
              )}
              ).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
            <div className="text-xs font-medium text-[#eef0f5] mb-1.5 font-sans">
              {t('analysis.interpretation.magnitude')} · {t('analysis.interpretation.significance')}
            </div>
            <p className="leading-5 text-[#a3a9b8]">
              Deseasonalized Theil-Sen slope is{' '}
              <strong className="text-[#eef0f5] font-mono font-medium tabular-nums">
                {formatSignedRate(slopeDecade, `${unit}/decade`, lang, slopeDecimals)}
              </strong>{' '}
              (<span className="font-mono tabular-nums">{pctPerDecade >= 0 ? '+' : ''}{pctPerDecade.toFixed(1)}%/dec</span>;
              95% CI [{formatNumber(ciLower, lang, { minimumFractionDigits: slopeDecimals, maximumFractionDigits: slopeDecimals })},{' '}
              {formatNumber(ciUpper, lang, { minimumFractionDigits: slopeDecimals, maximumFractionDigits: slopeDecimals })}]) ·{' '}
              {activeAggregation === 'monthly' && statistics.sampleCount >= 24 ? 'Seasonal MK' : 'MK'} p ={' '}
              <span className="font-mono text-[#4cc38a] tabular-nums">
                {formatScientificPValue(statistics.pValue, lang)}
              </span>
              , τ ={' '}
              <span className="font-mono tabular-nums">
                {formatNumber(statistics.mannKendall.tau, lang, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </span>
              .
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07]">
            <div className="text-xs font-medium text-[#eef0f5] mb-1.5 flex items-center gap-1.5 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
              <span>{t('analysis.interpretation.limitations')}</span>
            </div>
            <p className="text-xs text-[#7a8296] leading-5 font-sans">
              {customFileLoaded
                ? 'Custom CSV series are resampled to monthly means and tested with Seasonal Mann-Kendall (when ≥ 24 months) and deseasonalized Theil-Sen estimation. Ensure columns reflect consistent units across time.'
                : activeConfig.variableId === 'ndvi'
                ? 'MODIS MOD13Q1.061 (250 m, 16-day) and MOD13C2.061 (0.05° CMG monthly continuity) measure canopy greenness (valid range -0.2 to 1.0); cloud/aerosol pixels are masked via pixel_reliability without gap-filling, and Nile Delta crop cycles are controlled via Seasonal Mann-Kendall (period = 12).'
                : 'MODIS MOD11C3.061 (0.05° CMG, ~5.5 km) measures monthly clear-sky daytime (~10:30 LT) and nighttime (~22:30 LT) radiative land surface skin temperature (distinct from 2 m air temperature); cloudy passes are masked and annual cycles are controlled via Seasonal Mann-Kendall (period = 12).'}
            </p>
          </div>
        </div>
      </DataCard>

      {/* Unified Statistical Metrics Row Below Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Direction (Increase or Not) & MK Tau */}
        <div className="p-5 rounded-xl border border-[#eef0f5]/[0.08] bg-[#11141c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-[#a3a9b8] font-sans">
              {lang === 'ar' ? 'الاتجاه العام' : 'Trend direction'}
            </span>
            {direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-[#4cc38a] shrink-0" strokeWidth={1.5} />
            ) : direction === 'down' ? (
              <TrendingDown className="w-4 h-4 text-[#e5484d] shrink-0" strokeWidth={1.5} />
            ) : (
              <Minus className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
            )}
          </div>
          <div
            className={`text-[24px] leading-tight font-medium font-sans my-1 ${
              direction === 'up'
                ? 'text-[#4cc38a]'
                : direction === 'down'
                ? 'text-[#e5484d]'
                : 'text-[#eef0f5]'
            }`}
          >
            {direction === 'up'
              ? lang === 'ar'
                ? 'تزايد مستمر'
                : 'Increasing'
              : direction === 'down'
              ? lang === 'ar'
                ? 'تناقص مستمر'
                : 'Decreasing'
              : lang === 'ar'
              ? 'مستقر'
              : 'Stable'}
          </div>
          <div className="text-xs font-mono tabular-nums text-[#7a8296] flex items-center justify-between border-t border-[#eef0f5]/[0.07] pt-2">
            <span>τ = {formatNumber(statistics.mannKendall.tau, lang)}</span>
            <span>Z = {formatNumber(statistics.mannKendall.zScore, lang)}</span>
          </div>
        </div>

        {/* 2. Trend-Implied Change & Pettitt Change-Point */}
        <div className="p-5 rounded-xl border border-[#eef0f5]/[0.08] bg-[#11141c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-[#a3a9b8] font-sans">
              {lang === 'ar' ? `تغير الاتجاه خلال الفترة (${unit})` : `Period trend change (${unit})`}
            </span>
            <MapPin className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap my-1">
            <span
              className={`text-[28px] leading-none font-medium font-mono tabular-nums ${
                !isSig ? 'text-[#eef0f5]' : netChange > 0 ? 'text-[#4cc38a]' : netChange < 0 ? 'text-[#e5484d]' : 'text-[#eef0f5]'
              }`}
            >
              {netChange > 0 ? '+' : ''}
              {netChange.toFixed(slopeDecimals)}
            </span>
            <span className="text-xs font-mono text-[#7a8296] tabular-nums">
              ({pctChange > 0 ? '+' : ''}
              {pctChange.toFixed(1)}% over {spanYears.toFixed(1)} yrs)
            </span>
          </div>
          <div className="text-xs font-sans text-[#7a8296] flex items-center justify-between gap-2 border-t border-[#eef0f5]/[0.07] pt-2">
            <span className="truncate font-mono text-[#a3a9b8]" title={whereChangedLabel}>
              {whereChangedLabel}
            </span>
            <span className="font-mono tabular-nums shrink-0">
              {changePoint.significant
                ? `Shift ${formatDate(changePointDate, lang)}`
                : `No shift (p=${changePoint.pValue.toFixed(2)})`}
            </span>
          </div>
        </div>

        {/* 3. Sen's Slope */}
        <StatisticalResultCard
          label={t('analysis.statistics.sensSlopeDecade')}
          value={formatSignedRate(slopeDecade, unit, lang, slopeDecimals)}
          unit={`/ dec (${pctPerDecade > 0 ? '+' : ''}${pctPerDecade.toFixed(1)}%/dec)`}
          subtext={`Deseasonalized Theil-Sen (${slopeYear >= 0 ? '+' : ''}${slopeYear.toFixed(5)}/yr)`}
          direction={direction}
          statusBadge={
            <span className="text-xs font-mono text-[#7a8296]">
              {activeAggregation === 'monthly' && statistics.sampleCount >= 24 ? 'Seasonal' : 'SciPy'}
            </span>
          }
        />

        {/* 4. P-Value + 95% CI, Samples & Spatial Coverage */}
        <div className="p-5 rounded-xl border border-[#eef0f5]/[0.08] bg-[#11141c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-2 text-xs font-sans text-[#a3a9b8]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-normal text-[#a3a9b8]">
              {activeAggregation === 'monthly' && statistics.sampleCount >= 24
                ? 'Seasonal MK p-value'
                : t('analysis.statistics.pValueText')}
            </span>
            <span className="text-xs font-mono tabular-nums text-[#7a8296]">α = 0.05</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 my-1">
            <span className="text-[28px] leading-none font-medium font-mono text-[#eef0f5] tabular-nums">
              {formatScientificPValue(statistics.pValue, lang)}
            </span>
            <span className="text-xs font-mono tabular-nums text-[#4cc38a]">
              {statistics.pValue < 0.05 ? 'p < 0.05' : 'p ≥ 0.05'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-[#eef0f5]/[0.07] pt-2 text-xs font-mono tabular-nums text-[#7a8296]">
            <span>
              CI [{formatNumber(ciLower, lang, { minimumFractionDigits: slopeDecimals, maximumFractionDigits: slopeDecimals })},{' '}
              {formatNumber(ciUpper, lang, { minimumFractionDigits: slopeDecimals, maximumFractionDigits: slopeDecimals })}]
            </span>
            <span>n = {statistics.sampleCount}</span>
          </div>
        </div>
      </div>

      {/* Seasonal Breakdown Table */}
      {seasonal?.seasonalSummary && seasonal.seasonalSummary.length > 0 && (
        <DataCard
          title="Seasonal climatology & intra-annual crop-cycle breakdown"
          subtitle={
            customFileLoaded
              ? 'Winter (DJF), Spring (MAM), Summer (JJA), and Autumn (SON) averages from uploaded CSV'
              : 'Nile Delta Winter (DJF), Spring (MAM), Summer (JJA), and Autumn (SON) statistical averages'
          }
          badge={<span className="text-xs font-mono text-[#7a8296]">{displayResolution}</span>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {seasonal.seasonalSummary.map((s) => (
              <div
                key={s.season}
                className="p-4 rounded-xl border border-[#eef0f5]/[0.07] bg-[#07080d] space-y-1.5 font-mono text-xs tabular-nums"
              >
                <div className="text-[#a3a9b8] font-sans font-medium">{s.season}</div>
                <div className="text-[22px] leading-none font-medium text-[#eef0f5]">
                  {s.mean.toFixed(4)} <span className="text-xs text-[#7a8296]">± {s.std.toFixed(3)}</span>
                </div>
                <div className="text-xs text-[#7a8296]">
                  Slope {s.slopePerYear >= 0 ? '+' : ''}
                  {s.slopePerYear.toFixed(5)}/yr · p = {s.pValue}
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};
