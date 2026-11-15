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
  const [hasInteractedPeriod, setHasInteractedPeriod] = useState(false);
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
    setHasInteractedPeriod(true);
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
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="w-[300px] sm:w-[340px] z-50 text-start bg-[#11141c] border border-[#eef0f5]/[0.1] rounded-xl shadow-[0_20px_48px_rgba(0,0,0,0.65)] p-4"
      >
        <div className="text-xs font-mono tabular-nums text-[#7a8296] mb-1.5">
          Step {currentTourObj.stepNumber} of {ONBOARDING_TOUR_STEPS.length}
        </div>
        <h4 className="text-sm font-medium text-[#eef0f5] mb-1.5">
          {currentTourObj.title[lang]}
        </h4>
        <p className="text-[13px] text-[#a3a9b8] leading-5 mb-4">
          {currentTourObj.description[lang]}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-[#eef0f5]/[0.07]">
          <button
            type="button"
            onClick={() => setTourStep(null)}
            className="text-xs text-[#7a8296] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
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
              className="h-8 px-3 text-xs rounded-lg border border-[#eef0f5]/[0.08] bg-[#1a1e28] hover:bg-[#232836] text-[#eef0f5] disabled:opacity-40 transition-colors duration-150 cursor-pointer"
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
              className="h-8 px-3.5 text-xs font-medium rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] transition-colors duration-150 cursor-pointer"
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
      <div className="bg-[#11141c] border border-[#eef0f5]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl p-2 sm:p-3">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
          {/* CHAMBER 01: VARIABLE */}
          <div className="col-span-1 md:col-span-4 relative">
            <button
              type="button"
              onClick={() =>
                setOpenMenu(openMenu === 'variable' ? null : 'variable')
              }
              className={cn(
                'group relative w-full h-[52px] px-3 sm:px-4 rounded-[10px] text-start transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between gap-2 sm:gap-3 border cursor-pointer active:scale-[0.99]',
                openMenu === 'variable' || tourStep === 1
                  ? 'bg-[#1a1e28] border-[#38bdf8]/50'
                  : 'bg-[#07080d] hover:bg-[#1a1e28]/60 border-[#eef0f5]/[0.07] hover:border-[#eef0f5]/[0.14]'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#7a8296] truncate">
                  {labels.step1Label}
                </div>
                <div className="text-[13px] font-medium text-[#eef0f5] truncate mt-0.5">
                  {customCsvFileName
                    ? `CSV: ${customCsvFileName}`
                    : hasInteractedVar || activeConfig.variableId === 'lst'
                    ? t(`variables.${activeConfig.variableId}.name` as any)
                    : labels.step1Placeholder}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-4 h-4 text-[#7a8296] group-hover:text-[#eef0f5] transition-transform duration-150 shrink-0',
                  openMenu === 'variable' && 'rotate-180 text-[#38bdf8]'
                )}
                strokeWidth={1.5}
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
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-x-3 bottom-20 md:absolute md:inset-auto md:start-0 md:end-0 md:w-[440px] md:top-[calc(100%+8px)] z-50 bg-[#11141c] border border-[#eef0f5]/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-3 space-y-2 max-h-[64vh] overflow-y-auto"
                >
                  <div className="px-2 py-1.5 text-xs text-[#7a8296] flex items-center justify-between border-b border-[#eef0f5]/[0.07]">
                    <span>NASA satellite parameters</span>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="md:hidden text-[#7a8296] hover:text-[#eef0f5] p-1"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <span className="hidden md:inline font-mono text-xs text-[#a3a9b8]">EOSDIS calibrated</span>
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
                            'w-full p-3 rounded-xl text-start transition-colors duration-150 flex items-start gap-3 border cursor-pointer active:scale-[0.99]',
                            isSelected
                              ? 'bg-[#1a1e28] border-[#38bdf8]/45 text-[#eef0f5]'
                              : 'bg-[#07080d]/60 border-[#eef0f5]/[0.06] hover:bg-[#1a1e28]/60 hover:border-[#eef0f5]/[0.12] text-[#a3a9b8]'
                          )}
                        >
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg shrink-0 mt-0.5 border flex items-center justify-center',
                              isSelected
                                ? 'bg-[#11141c] text-[#38bdf8] border-[#38bdf8]/35'
                                : 'bg-[#11141c] text-[#7a8296] border-[#eef0f5]/[0.08]'
                            )}
                          >
                            <Icon className="w-4 h-4" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium text-[#eef0f5] truncate">
                                {t(`variables.${v.id}.name` as any)}
                              </span>
                              <span className="text-xs font-mono text-[#7a8296] shrink-0">
                                {v.unit}
                              </span>
                            </div>
                            <p className="text-xs text-[#a3a9b8] mt-1 leading-5">
                              {t(`variables.${v.id}.desc` as any)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono text-[#7a8296]">
                              <span>{providerShort}</span>
                              <span>·</span>
                              <span>{v.code}</span>
                              <span>·</span>
                              <span>{v.spatialResolution.split('(')[0].trim()}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Upload Custom CSV under Variable */}
                  <div className="pt-2 border-t border-[#eef0f5]/[0.07] space-y-1.5">
                    <button
                      type="button"
                      disabled={csvUploading}
                      onClick={() => csvInputRef.current?.click()}
                      className="w-full h-9 rounded-lg bg-[#1a1e28] hover:bg-[#232836] text-xs font-medium text-[#eef0f5] flex items-center justify-center gap-2 transition-colors duration-150 border border-[#eef0f5]/[0.1] cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />
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
                        className="w-full h-8 rounded-lg bg-[#07080d] hover:bg-[#1a1e28] text-xs text-[#a3a9b8] hover:text-[#eef0f5] flex items-center justify-center gap-2 border border-[#eef0f5]/[0.08] cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#7a8296]" strokeWidth={1.5} />
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
                'group relative w-full h-[52px] px-3 sm:px-4 rounded-[10px] text-start transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between gap-2 sm:gap-3 border cursor-pointer active:scale-[0.99]',
                openMenu === 'region' || tourStep === 2
                  ? 'bg-[#1a1e28] border-[#38bdf8]/50'
                  : 'bg-[#07080d] hover:bg-[#1a1e28]/60 border-[#eef0f5]/[0.07] hover:border-[#eef0f5]/[0.14]'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#7a8296] truncate">
                  {labels.step2Label}
                </div>
                <div className="text-[13px] font-medium text-[#eef0f5] truncate mt-0.5">
                  {hasInteractedReg
                    ? t(`regions.${currentRegion.id}` as any) || currentRegion.id
                    : labels.step2Placeholder}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-4 h-4 text-[#7a8296] group-hover:text-[#eef0f5] transition-transform duration-150 shrink-0',
                  openMenu === 'region' && 'rotate-180 text-[#38bdf8]'
                )}
                strokeWidth={1.5}
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
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-x-3 bottom-20 md:absolute md:inset-auto md:start-0 md:end-0 md:w-[380px] md:top-[calc(100%+8px)] z-50 bg-[#11141c] border border-[#eef0f5]/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-3 space-y-2 max-h-[60vh] overflow-y-auto"
                >
                  <div className="px-2 py-1.5 text-xs text-[#7a8296] flex items-center justify-between border-b border-[#eef0f5]/[0.07]">
                    <span>Geographic territory</span>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="md:hidden text-[#7a8296] hover:text-[#eef0f5] p-1"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <span className="hidden md:inline text-xs font-mono text-[#7a8296]">EPSG:4326</span>
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
                            'w-full px-3 py-2.5 rounded-lg text-start transition-colors duration-150 flex items-center justify-between gap-2 border cursor-pointer active:scale-[0.99]',
                            isSelected
                              ? 'bg-[#1a1e28] text-[#eef0f5] border-[#38bdf8]/45'
                              : 'hover:bg-[#1a1e28]/60 border-transparent text-[#a3a9b8]'
                          )}
                        >
                          <div>
                            <div className="text-[13px] font-medium text-[#eef0f5]">
                              {t(`regions.${reg.id}` as any) || reg.id}
                            </div>
                            <div className="text-xs text-[#7a8296]">
                              {reg.climateZone}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-[#7a8296]">
                            {reg.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* GeoJSON Upload */}
                  <div className="pt-2 border-t border-[#eef0f5]/[0.07]">
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
                      className="w-full h-9 rounded-lg bg-[#07080d] hover:bg-[#1a1e28] text-xs text-[#a3a9b8] hover:text-[#eef0f5] flex items-center justify-center gap-2 transition-colors duration-150 border border-[#eef0f5]/[0.08] cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
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
                'group relative w-full h-[52px] px-3 sm:px-4 rounded-[10px] text-start transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex items-center justify-between gap-2 border cursor-pointer active:scale-[0.99]',
                openMenu === 'period' || tourStep === 3
                  ? 'bg-[#1a1e28] border-[#38bdf8]/50'
                  : 'bg-[#07080d] hover:bg-[#1a1e28]/60 border-[#eef0f5]/[0.07] hover:border-[#eef0f5]/[0.14]'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[#7a8296] truncate">
                  {labels.step3Label}
                </div>
                <div
                  className={cn(
                    'text-[13px] font-medium text-[#eef0f5] truncate mt-0.5',
                    hasInteractedPeriod && 'font-mono tabular-nums'
                  )}
                >
                  {hasInteractedPeriod
                    ? `${startYear} – ${endYear}`
                    : labels.step3Placeholder}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-4 h-4 text-[#7a8296] group-hover:text-[#eef0f5] transition-transform duration-150 shrink-0',
                  openMenu === 'period' && 'rotate-180 text-[#38bdf8]'
                )}
                strokeWidth={1.5}
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
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-x-3 bottom-20 md:absolute md:inset-auto md:end-0 md:start-auto md:w-[300px] md:top-[calc(100%+8px)] z-50 bg-[#11141c] border border-[#eef0f5]/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-3 space-y-3 max-h-[60vh] overflow-y-auto"
                >
                  <div className="text-xs text-[#7a8296] border-b border-[#eef0f5]/[0.07] pb-2 flex items-center justify-between">
                    <span>Observation window</span>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(null)}
                      className="md:hidden text-[#7a8296] hover:text-[#eef0f5] p-1"
                    >
                      <X className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {[
                      { start: '2000', end: '2024', tag: 'MODIS 25-year record' },
                      { start: '2015', end: '2024', tag: 'Recent 10-year window' },
                      { start: '2018', end: '2024', tag: 'Recent 7-year window' },
                    ].map((p) => {
                      const active = startYear === p.start && endYear === p.end;
                      return (
                        <button
                          key={p.start + p.end}
                          type="button"
                          onClick={() => handleSelectPeriodPreset(p.start, p.end)}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors duration-150 border cursor-pointer active:scale-[0.99]',
                            active
                              ? 'bg-[#1a1e28] text-[#eef0f5] border-[#38bdf8]/45'
                              : 'hover:bg-[#1a1e28]/60 border-transparent text-[#a3a9b8]'
                          )}
                        >
                          <span className="font-mono tabular-nums font-medium text-[#eef0f5]">
                            {p.start} – {p.end}
                          </span>
                          <span className="text-xs text-[#7a8296]">
                            {p.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Temporal resolution */}
                  <div className="pt-2 border-t border-[#eef0f5]/[0.07]">
                    <div className="text-xs text-[#7a8296] mb-2">
                      Aggregation cadence
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        ['monthly', 'seasonal', 'annual'] as TemporalAggregation[]
                      ).map((agg) => (
                        <button
                          key={agg}
                          type="button"
                          onClick={() => {
                            setTimeRange({
                              ...activeConfig.timeRange,
                              aggregation: agg,
                            });
                            setHasInteractedPeriod(true);
                          }}
                          className={cn(
                            'h-8 rounded-lg text-xs font-mono capitalize transition-colors duration-150 border cursor-pointer',
                            activeConfig.timeRange.aggregation === agg
                              ? 'bg-[#1a1e28] text-[#eef0f5] border-[#38bdf8]/45 font-medium'
                              : 'bg-[#07080d] border-[#eef0f5]/[0.07] text-[#7a8296] hover:text-[#eef0f5]'
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
              className="w-full h-[52px] rounded-[10px] text-[13px] font-medium text-[#0b0d14] bg-[#eef0f5] hover:bg-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>{labels.analyzeBtn}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
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

        {/* Quiet Telemetry & Provenance Footer Strip */}
        <div className="mt-2.5 pt-2.5 border-t border-[#eef0f5]/[0.07] flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#a3a9b8] min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />
            <span className="truncate">
              {customCsvFileName
                ? sourceLabels.customCsvDef
                : t(`variables.${activeConfig.variableId}.desc` as any)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-[#7a8296] shrink-0">
            {customCsvFileName ? (
              <>
                <span className="text-[#4cc38a]">{customCsvFileName}</span>
                {customCsvAnalysis?.series?.length ? (
                  <>
                    <span>·</span>
                    <span>{customCsvAnalysis.series.length} pts</span>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    clearCustomCsvSession();
                    setCsvError(null);
                  }}
                  className="ms-2 px-2.5 py-1 rounded-md bg-[#1a1e28] hover:bg-[#232836] text-[#eef0f5] border border-[#eef0f5]/[0.08] font-sans text-xs inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
                  <span>{sourceLabels.resetNasa}</span>
                </button>
              </>
            ) : (
              <>
                <span className="text-[#a3a9b8]">
                  {activeDatasetMeta?.provider.split('(')[0]?.trim() ||
                    activeVarMeta.primarySource}
                </span>
                <span>·</span>
                <span>{activeVarMeta.code}</span>
                <span>·</span>
                <span>
                  {activeVarMeta.spatialResolution.split('(')[0].trim()} ·{' '}
                  {activeVarMeta.temporalResolution.split('(')[0].trim()}
                </span>
                {activeVarMeta.doi && (
                  <>
                    <span className="hidden sm:inline">·</span>
                    <span className="hidden sm:inline">DOI {activeVarMeta.doi}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* LST Measurement Sub-Selector (Appears ONLY when Land Surface Temperature is active) */}
        {!customCsvFileName && activeConfig.variableId === 'lst' && (
          <div className="mt-2.5 px-3 py-2 rounded-[10px] bg-[#07080d] border border-[#eef0f5]/[0.07] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-[#a3a9b8]">
              <Thermometer className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
              <span className="text-xs text-[#eef0f5] font-medium">
                {t('lstModes.label')}
              </span>
              <span className="text-xs text-[#7a8296] hidden sm:inline">
                · {t('variables.lst.desc')}
              </span>
            </div>

            <div className="inline-flex rounded-lg bg-[#11141c] border border-[#eef0f5]/[0.08] p-0.5 gap-0.5">
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
                      'h-7 px-2.5 rounded-md text-xs font-normal flex items-center gap-1.5 transition-colors duration-150 cursor-pointer',
                      active
                        ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#eef0f5]/[0.1]'
                        : 'text-[#7a8296] hover:text-[#eef0f5] border border-transparent'
                    )}
                  >
                    <MIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>{t(m.labelKey as any)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {csvError && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-[#e5484d]/10 border border-[#e5484d]/30 text-[#eef0f5] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#e5484d] shrink-0" strokeWidth={1.5} />
            <span className="flex-1">{csvError}</span>
          </div>
        )}
      </div>
    </div>
  );
};
