import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ArrowRight,
  Thermometer,
  Sun,
  Moon,
  SunMoon,
  Leaf,
  Upload,
  Satellite,
  X,
  RefreshCw,
  FileSpreadsheet,
  Info,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { analysisService } from '../../services/analysis/analysisService';
import {
  ENVIRONMENTAL_VARIABLES,
  NASA_DATASETS,
} from '../../services/nasa/constants';
import {
  ONBOARDING_TOUR_STEPS,
  DETECTIVE_UI_LABELS,
} from './trendSignalsData';
import {
  SupportedLanguage,
  VariableId,
  LstMode,
  TemporalAggregation,
} from '../../types/scientific';
import { cn } from '../../utils/cn';

interface DetectiveControlBarProps {
  tourStep: number | null;
  setTourStep: (step: number | null) => void;
  onAnalyze?: () => void;
}

export const DetectiveControlBar: React.FC<DetectiveControlBarProps> = ({
  tourStep,
  setTourStep,
  onAnalyze,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const labels = DETECTIVE_UI_LABELS[lang] || DETECTIVE_UI_LABELS.en;

  const {
    activeConfig,
    currentRegion,
    setVariable,
    setLstMode,
    setRegion,
    setTimeRange,
    geoAdapterResult,
    loadCustomGeoJSON,
    saveCurrentInvestigation,
    customCsvFileName,
    customCsvAnalysis,
    setCustomCsvSession,
    clearCustomCsvSession,
  } = useAppStore();

  const [openMenu, setOpenMenu] = useState<
    'variable' | 'region' | 'period' | null
  >(null);
  const [hasInteractedVar, setHasInteractedVar] = useState(false);
  const [hasInteractedReg, setHasInteractedReg] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const currentTourObj =
    tourStep !== null
      ? ONBOARDING_TOUR_STEPS.find((s) => s.stepNumber === tourStep) || null
      : null;

  const varIcons: Record<VariableId, any> = {
    lst: Thermometer,
    ndvi: Leaf,
  };
  const lstMode: LstMode = activeConfig.lstMode || 'day';

  const handleSelectVar = (id: VariableId) => {
    setVariable(id);
    setHasInteractedVar(true);
    setOpenMenu(null);
    if (tourStep === 1) setTourStep(2);
  };

  const handleSelectRegion = (id: string) => {
    setRegion(id);
    setHasInteractedReg(true);
    setOpenMenu(null);
    if (tourStep === 2) setTourStep(3);
  };

  const handleSelectPeriodPreset = (startYear: string, endYear: string) => {
    setTimeRange({
      ...activeConfig.timeRange,
      startDate: `${startYear}-01-01`,
      endDate: `${endYear}-12-31`,
    });
    setOpenMenu(null);
    if (tourStep === 3) setTourStep(4);
  };

  const handleGeoJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        loadCustomGeoJSON(parsed, file.name);
        setHasInteractedReg(true);
        setOpenMenu(null);
      } catch (err) {
        console.error('Failed to parse uploaded GeoJSON', err);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    setCsvError(null);
    try {
      const customResult = await analysisService.uploadAndAnalyzeCSV(
        file,
        file.name.replace(/\.[^/.]+$/, ''),
        'Index',
        'Custom Series'
      );
      const avail =
        (customResult as any)?.provenance?.availableTimeRange ||
        customResult.config.timeRange;
      setCustomCsvSession({
        file,
        fileName: file.name,
        analysis: customResult,
        availableRange: avail,
      });
      setHasInteractedVar(true);
      setOpenMenu(null);
    } catch (err: any) {
      setCsvError(err?.message || 'Failed to process CSV file.');
    } finally {
      setCsvUploading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const activeVarMeta =
    ENVIRONMENTAL_VARIABLES.find((v) => v.id === activeConfig.variableId) ||
    ENVIRONMENTAL_VARIABLES[0];
  const activeDatasetMeta = NASA_DATASETS.find(
    (d) => d.id === activeVarMeta.defaultDatasetId
  );

  const sourceLabels =
    lang === 'ar'
      ? {
          definition: 'التعريف البسيط',
          sourcesTitle: 'المصادر الموثّقة',
          source: 'المصدر',
          product: 'المنتج',
          resolution: 'الدقة',
          doi: 'DOI',
          uploadCsv: 'رفع ملف CSV مخصص',
          uploadingCsv: 'جاري قراءة CSV...',
          resetNasa: 'العودة لبيانات ناسا',
          customCsvDef:
            'بيانات جدولية مخصصة قمت برفعها لتحليل الاتجاه الزمني والدلالة الإحصائية فوراً.',
        }
      : {
          definition: 'Simple Definition',
          sourcesTitle: 'Labeled Data Sources',
          source: 'Source',
          product: 'Product',
          resolution: 'Resolution',
          doi: 'DOI',
          uploadCsv: 'Upload Custom CSV',
          uploadingCsv: 'Processing CSV...',
          resetNasa: 'Reset to NASA',
          customCsvDef:
            'Your own uploaded time-series table analyzed with Mann-Kendall trend & Sen’s slope.',
        };

  const handleTriggerAnalyze = () => {
    try {
      saveCurrentInvestigation();
    } catch {
      // ignore
    }
    if (onAnalyze) {
      onAnalyze();
    } else {
      navigate('/analysis');
    }
  };

  const startYear = activeConfig.timeRange.startDate.slice(0, 4);
  const endYear =
    activeConfig.timeRange.endDate.slice(0, 4) === '2025'
      ? '2024'
      : activeConfig.timeRange.endDate.slice(0, 4);

  const renderTourPopover = () => {
    if (!currentTourObj) return null;

    return (
      <motion.div
        key={`tour-step-${currentTourObj.stepNumber}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.18 }}
        className="w-[300px] sm:w-[340px] z-50 text-start bg-[#0D1322] border border-zinc-800 rounded-xl shadow-2xl p-4"
      >
        <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
          STEP 0{currentTourObj.stepNumber} / 0{ONBOARDING_TOUR_STEPS.length}
        </div>
        <h4 className="text-sm font-semibold text-white mb-1.5 tracking-tight">
          {currentTourObj.title[lang]}
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          {currentTourObj.description[lang]}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => setTourStep(null)}
            className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {labels.skipTour}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentTourObj.stepNumber === 1}
              onClick={() =>
                setTourStep(Math.max(1, currentTourObj.stepNumber - 1))
              }
              className="h-7 px-3 text-xs rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {labels.back}
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentTourObj.stepNumber < ONBOARDING_TOUR_STEPS.length) {
                  setTourStep(currentTourObj.stepNumber + 1);
                } else {
                  setTourStep(null);
                }
              }}
              className="h-7 px-3.5 text-xs font-medium rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors cursor-pointer"
            >
              {currentTourObj.stepNumber === ONBOARDING_TOUR_STEPS.length
                ? labels.finish
                : labels.next}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div ref={barRef} className="relative z-30">
      {/* Mobile Touch Backdrop for Dropdowns */}
      {openMenu && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
          onClick={() => setOpenMenu(null)}
        />
      )}

      {/* Clean Architectural Scientific Console Container (Mobile 2x2 Grid, Desktop 1-row) */}
      <div className="bg-[#0B0F17] border border-zinc-800/90 rounded-xl p-2 sm:p-2.5 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-2.5 items-center">
          {/* CHAMBER 01: VARIABLE */}
          <div className="col-span-1 md:col-span-4 relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu(openMenu === 'variable' ? null : 'variable')
              }
              className={cn(
                'group relative w-full h-[50px] sm:h-[54px] px-2.5 sm:px-4 rounded-lg text-start transition-all duration-200 flex items-center justify-between gap-2 sm:gap-3 border cursor-pointer active:scale-[0.98]',
                openMenu === 'variable' || tourStep === 1
                  ? 'bg-zinc-900 border-sky-500/60 ring-1 ring-sky-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850/80 border-zinc-800/80 hover:border-zinc-700'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                  {labels.step1Label}
                </div>
                <div className="text-xs sm:text-[13px] font-medium text-zinc-100 truncate mt-0.5 group-hover:text-white transition-colors">
                  {customCsvFileName
                    ? `CSV: ${customCsvFileName}`
                    : hasInteractedVar || activeConfig.variableId === 'lst'
                    ? activeConfig.variableId === 'lst'
                      ? `${t('variables.lst.name')} · ${t(`lstModes.${lstMode}` as any)}`
                      : t(`variables.${activeConfig.variableId}.name` as any)
                    : labels.step1Placeholder}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 shrink-0',
                  openMenu === 'variable' && 'rotate-180 text-sky-400'
                )}
              />
            </button>

            {/* Tour Popover under Step 1 */}
            <AnimatePresence>
              {tourStep === 1 && !openMenu && (
                <div className="absolute start-0 top-[calc(100%+12px)] z-50">
                  {renderTourPopover()}
                </div>
              )}
            </AnimatePresence>

            {/* Variable Dropdown Menu (Bottom Sheet on Mobile, Popover on Desktop) */}
            <AnimatePresence>
              {openMenu === 'variable' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-x-2 bottom-18 md:absolute md:inset-auto md:start-0 md:end-0 md:w-[440px] md:top-[calc(100%+8px)] z-50 bg-[#0D1322] border border-zinc-800 rounded-2xl shadow-2xl p-3 space-y-1 max-h-[60vh] overflow-y-auto"
                >
                  <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-800/80 mb-1">
                    <span>NASA Satellite Parameters</span>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="md:hidden text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="hidden md:inline text-sky-400 font-medium">EOSDIS Calibrated</span>
                  </div>

                  <div className="space-y-1.5 pt-1 max-h-[340px] overflow-y-auto pe-1">
                    {ENVIRONMENTAL_VARIABLES.map((v) => {
                      const Icon = varIcons[v.id] || Leaf;
                      const isSelected =
                        !customCsvFileName &&
                        hasInteractedVar &&
                        activeConfig.variableId === v.id;
                      const ds = NASA_DATASETS.find(
                        (d) => d.id === v.defaultDatasetId
                      );
                      const providerShort =
                        ds?.provider.split('(')[0]?.trim() || v.primarySource;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVar(v.id)}
                          className={cn(
                            'w-full p-2.5 rounded-lg text-start transition-colors flex items-start gap-3 border cursor-pointer active:scale-[0.99]',
                            isSelected
                              ? 'bg-sky-500/10 border-sky-500/40 text-white'
                              : 'border-transparent hover:bg-zinc-800/60 text-zinc-300'
                          )}
                        >
                          <div
                            className={cn(
                              'p-2 rounded-md shrink-0 mt-0.5 border',
                              isSelected
                                ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                                : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-zinc-100 group-hover:text-white transition-colors truncate">
                                {t(`variables.${v.id}.name` as any)}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                                {v.unit}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                              {t(`variables.${v.id}.desc` as any)}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] font-mono">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/50 text-sky-300">
                                <Satellite className="w-2.5 h-2.5 shrink-0" />
                                <span className="text-zinc-400">{sourceLabels.source}:</span>
                                <span>{providerShort}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-zinc-300">
                                <span className="text-zinc-500">{sourceLabels.product}:</span>
                                <span>{v.code}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-zinc-300">
                                <span className="text-zinc-500">{sourceLabels.resolution}:</span>
                                <span>{v.spatialResolution.split('(')[0].trim()}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Upload Custom CSV under Variable */}
                  <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                    <button
                      type="button"
                      disabled={csvUploading}
                      onClick={() => csvInputRef.current?.click()}
                      className="w-full h-8 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-xs text-emerald-300 hover:text-emerald-200 flex items-center justify-center gap-2 transition-colors border border-emerald-700/60 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{csvUploading ? sourceLabels.uploadingCsv : sourceLabels.uploadCsv}</span>
                    </button>
                    {customCsvFileName && (
                      <button
                        type="button"
                        onClick={() => {
                          clearCustomCsvSession();
                          setCsvError(null);
                          setOpenMenu(null);
                        }}
                        className="w-full h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300 flex items-center justify-center gap-1.5 border border-zinc-800 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-sky-400" />
                        <span>{sourceLabels.resetNasa}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CHAMBER 02: REGION */}
          <div className="col-span-1 md:col-span-4 relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu(openMenu === 'region' ? null : 'region')
              }
              className={cn(
                'group relative w-full h-[50px] sm:h-[54px] px-2.5 sm:px-4 rounded-lg text-start transition-all duration-200 flex items-center justify-between gap-2 sm:gap-3 border cursor-pointer active:scale-[0.98]',
                openMenu === 'region' || tourStep === 2
                  ? 'bg-zinc-900 border-sky-500/60 ring-1 ring-sky-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850/80 border-zinc-800/80 hover:border-zinc-700'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                  {labels.step2Label}
                </div>
                <div className="text-xs sm:text-[13px] font-medium text-zinc-100 truncate mt-0.5 group-hover:text-white transition-colors">
                  {hasInteractedReg
                    ? t(`regions.${currentRegion.id}` as any) || currentRegion.id
                    : labels.step2Placeholder}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 shrink-0',
                  openMenu === 'region' && 'rotate-180 text-sky-400'
                )}
              />
            </button>

            {/* Tour Popover under Step 2 */}
            <AnimatePresence>
              {tourStep === 2 && !openMenu && (
                <div className="absolute start-0 top-[calc(100%+12px)] z-50">
                  {renderTourPopover()}
                </div>
              )}
            </AnimatePresence>

            {/* Region Dropdown Menu */}
            <AnimatePresence>
              {openMenu === 'region' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-x-2 bottom-18 md:absolute md:inset-auto md:start-0 md:end-0 md:w-[380px] md:top-[calc(100%+8px)] z-50 bg-[#0D1322] border border-zinc-800 rounded-2xl shadow-2xl p-3 space-y-1 max-h-[60vh] overflow-y-auto"
                >
                  <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-zinc-800/80 mb-1">
                    <span>Geographic Territory</span>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="md:hidden text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="hidden md:inline text-zinc-500 font-mono">EPSG:4326</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1 py-1 pe-1">
                    {geoAdapterResult.detectedRegions.map((reg) => {
                      const isSelected = currentRegion.id === reg.id;
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={() => handleSelectRegion(reg.id)}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-start transition-colors flex items-center justify-between gap-2 border cursor-pointer active:scale-[0.99]',
                            isSelected
                              ? 'bg-sky-500/10 text-white border-sky-500/40'
                              : 'hover:bg-zinc-800/60 border-transparent text-zinc-300'
                          )}
                        >
                          <div>
                            <div className="text-xs font-semibold text-zinc-100">
                              {t(`regions.${reg.id}` as any) || reg.id}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400">
                              {reg.climateZone}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {reg.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* GeoJSON Upload */}
                  <div className="pt-2 border-t border-zinc-800/80">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".geojson,.json"
                      onChange={handleGeoJsonUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors border border-zinc-800 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{labels.uploadGeoJson}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CHAMBER 03: PERIOD */}
          <div className="col-span-1 md:col-span-2 relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu(openMenu === 'period' ? null : 'period')
              }
              className={cn(
                'group relative w-full h-[50px] sm:h-[54px] px-2.5 sm:px-4 rounded-lg text-start transition-all duration-200 flex items-center justify-between gap-1.5 sm:gap-2 border cursor-pointer active:scale-[0.98]',
                openMenu === 'period' || tourStep === 3
                  ? 'bg-zinc-900 border-sky-500/60 ring-1 ring-sky-500/20'
                  : 'bg-zinc-900/60 hover:bg-zinc-850/80 border-zinc-800/80 hover:border-zinc-700'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                  {labels.step3Label}
                </div>
                <div className="font-mono text-xs sm:text-[13px] font-medium text-zinc-100 truncate mt-0.5 group-hover:text-white transition-colors">
                  {startYear} – {endYear}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 group-hover:text-zinc-200 transition-transform duration-200 shrink-0',
                  openMenu === 'period' && 'rotate-180 text-sky-400'
                )}
              />
            </button>

            {/* Tour Popover under Step 3 */}
            <AnimatePresence>
              {tourStep === 3 && !openMenu && (
                <div className="absolute end-0 md:start-0 top-[calc(100%+12px)] z-50">
                  {renderTourPopover()}
                </div>
              )}
            </AnimatePresence>

            {/* Period Dropdown Menu */}
            <AnimatePresence>
              {openMenu === 'period' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="fixed inset-x-2 bottom-18 md:absolute md:inset-auto md:end-0 md:start-auto md:w-[300px] md:top-[calc(100%+8px)] z-50 bg-[#0D1322] border border-zinc-800 rounded-2xl shadow-2xl p-3 space-y-3 max-h-[60vh] overflow-y-auto"
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 pb-2 flex items-center justify-between">
                    <span>Observation Window</span>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="md:hidden text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {[
                      { start: '2000', end: '2024', tag: 'MODIS Full 25-Yr Record' },
                      { start: '2015', end: '2024', tag: 'Recent 10-Year Window' },
                      { start: '2018', end: '2024', tag: 'Recent 7-Year Window' },
                    ].map((p) => {
                      const active = startYear === p.start && endYear === p.end;
                      return (
                        <button
                          key={p.start + p.end}
                          type="button"
                          onClick={() => handleSelectPeriodPreset(p.start, p.end)}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors border cursor-pointer active:scale-[0.99]',
                            active
                              ? 'bg-sky-500/10 text-white border-sky-500/40'
                              : 'hover:bg-zinc-800/60 border-transparent text-zinc-300'
                          )}
                        >
                          <span className="font-mono font-medium text-zinc-100">
                            {p.start} – {p.end}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {p.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Temporal resolution */}
                  <div className="pt-2 border-t border-zinc-800/80">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                      Aggregation Cadence
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        ['monthly', 'seasonal', 'annual'] as TemporalAggregation[]
                      ).map((agg) => (
                        <button
                          key={agg}
                          type="button"
                          onClick={() =>
                            setTimeRange({
                              ...activeConfig.timeRange,
                              aggregation: agg,
                            })
                          }
                          className={cn(
                            'py-1.5 rounded-md text-[11px] font-mono capitalize transition-colors border cursor-pointer',
                            activeConfig.timeRange.aggregation === agg
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 font-semibold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          )}
                        >
                          {agg}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CHAMBER 04: PRIMARY ACTION BUTTON */}
          <div className="col-span-1 md:col-span-2 relative">
            <button
              type="button"
              onClick={handleTriggerAnalyze}
              className="w-full h-[50px] sm:h-[54px] rounded-lg text-xs sm:text-sm font-semibold tracking-wide text-slate-950 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 transition-colors shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>{labels.analyzeBtn}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:rotate-180" />
            </button>

            {/* Tour Popover under Step 4 / 5 */}
            <AnimatePresence>
              {(tourStep === 4 || tourStep === 5) && !openMenu && (
                <div className="absolute end-0 top-[calc(100%+12px)] z-50">
                  {renderTourPopover()}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hidden CSV input triggered from Variable dropdown */}
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleCsvUpload}
          className="hidden"
        />

        {/* Variable Simple Definition + Labeled Sources + Upload Custom CSV Strip */}
        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start gap-2 text-[11px] sm:text-xs text-zinc-200 leading-relaxed">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-[10px] shrink-0 mt-0.5">
                <Info className="w-3 h-3" />
                <span>{sourceLabels.definition}</span>
              </span>
              <span className="text-zinc-200">
                {customCsvFileName
                  ? sourceLabels.customCsvDef
                  : t(`variables.${activeConfig.variableId}.desc` as any)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider me-0.5">
                {sourceLabels.sourcesTitle}:
              </span>
              {customCsvFileName ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300">
                    <FileSpreadsheet className="w-3 h-3" />
                    <span className="text-zinc-400">{sourceLabels.source}:</span>
                    <span>Custom CSV</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200">
                    <span className="text-zinc-400">{sourceLabels.product}:</span>
                    <span>{customCsvFileName}</span>
                  </span>
                  {customCsvAnalysis?.series?.length ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-200">
                      <span className="text-zinc-400">{sourceLabels.resolution}:</span>
                      <span>{customCsvAnalysis.series.length} pts</span>
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300">
                    <Satellite className="w-3 h-3 shrink-0" />
                    <span className="text-zinc-400">{sourceLabels.source}:</span>
                    <span>
                      {activeDatasetMeta?.provider.split('(')[0]?.trim() ||
                        activeVarMeta.primarySource}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-zinc-200">
                    <span className="text-zinc-400">{sourceLabels.product}:</span>
                    <span>{activeVarMeta.code}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-zinc-200">
                    <span className="text-zinc-400">{sourceLabels.resolution}:</span>
                    <span>
                      {activeVarMeta.spatialResolution.split('(')[0].trim()} •{' '}
                      {activeVarMeta.temporalResolution.split('(')[0].trim()}
                    </span>
                  </span>
                  {activeVarMeta.doi && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700/80 text-zinc-300">
                      <span className="text-zinc-400">{sourceLabels.doi}:</span>
                      <span>{activeVarMeta.doi}</span>
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {customCsvFileName && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  clearCustomCsvSession();
                  setCsvError(null);
                }}
                className="h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>{sourceLabels.resetNasa}</span>
              </button>
            </div>
          )}
        </div>

        {/* LST Measurement Sub-Selector (Appears ONLY when Land Surface Temperature is active) */}
        {!customCsvFileName && activeConfig.variableId === 'lst' && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-[#090D16] border border-zinc-800/90 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                {t('lstModes.label')}:
              </span>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                {t('variables.lst.desc')}
              </span>
            </div>

            <div className="inline-flex rounded-md bg-zinc-900 border border-zinc-800 p-0.5 gap-0.5">
              {[
                { id: 'day' as LstMode, icon: Sun, labelKey: 'lstModes.day' },
                { id: 'night' as LstMode, icon: Moon, labelKey: 'lstModes.night' },
                { id: 'both' as LstMode, icon: SunMoon, labelKey: 'lstModes.both' },
              ].map((m) => {
                const MIcon = m.icon;
                const active = lstMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLstMode(m.id)}
                    className={cn(
                      'px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                      active
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    )}
                  >
                    <MIcon className="w-3.5 h-3.5" />
                    <span>{t(m.labelKey as any)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {csvError && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/70 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="flex-1">{csvError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
