import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  FileSpreadsheet,
  GitCompareArrows,
  Globe2,
  Leaf,
  Loader2,
  MapPin,
  Moon,
  Search,
  Sun,
  Thermometer,
  Upload,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { PREDEFINED_REGIONS } from '../../services/nasa/constants';
import { analysisService } from '../../services/analysis/analysisService';
import { LstMode, SupportedLanguage } from '../../types/scientific';
import { cn } from '../../utils/cn';
import {
  FEATURED_REGION_IDS,
  getRegionDisplayName,
  getTimeSpanOptions,
  LST_MODE_OPTIONS,
  ONBOARDING_COPY,
  ONBOARDING_QUESTIONS,
  OnboardingQuestionId,
  OnboardingQuestionOption,
  OnboardingTimeSpanOption,
  REGION_SHORT_SUBTITLES,
} from './onboardingData';

type WizardStep = 'welcome' | 'question' | 'csv_upload' | 'region' | 'timespan';

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

function renderQuestionIcon(id: OnboardingQuestionId, active = false) {
  const cls = cn('w-4 h-4 shrink-0', active ? 'text-[#38bdf8]' : 'text-[#a3a9b8]');
  switch (id) {
    case 'ndvi_greening':
      return <Leaf className={cls} strokeWidth={1.5} />;
    case 'lst_surface':
      return <Thermometer className={cls} strokeWidth={1.5} />;
    case 'coupled_compare':
      return <GitCompareArrows className={cls} strokeWidth={1.5} />;
    case 'map_explorer':
      return <Globe2 className={cls} strokeWidth={1.5} />;
    case 'ai_scientist':
      return <BookOpen className={cls} strokeWidth={1.5} />;
    case 'custom_csv':
      return <FileSpreadsheet className={cls} strokeWidth={1.5} />;
  }
}

export const OnboardingModal: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const rawLang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const lang: SupportedLanguage = ['en', 'ar', 'de', 'fr'].includes(rawLang)
    ? rawLang
    : 'en';
  const isRtl = lang === 'ar';

  const {
    onboardingOpen,
    closeOnboarding,
    setVariable,
    setLstMode,
    setRegion,
    setTimeRange,
    loadCustomGeoJSON,
    setCustomCsvSession,
    saveCurrentInvestigation,
    setPendingTourOnExplorer,
  } = useAppStore();

  const [step, setStep] = useState<WizardStep>('welcome');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<OnboardingQuestionOption>(
    ONBOARDING_QUESTIONS[0]
  );
  const [selectedLstMode, setSelectedLstMode] = useState<LstMode>('day');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('nile_delta');
  const [customGeoLabel, setCustomGeoLabel] = useState<string | null>(null);
  const [regionQuery, setRegionQuery] = useState('');
  const [selectedSpan, setSelectedSpan] = useState<OnboardingTimeSpanOption | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const geoInputRef = useRef<HTMLInputElement>(null);

  const spanOptions = useMemo(
    () => getTimeSpanOptions(selectedQuestion.variableId),
    [selectedQuestion]
  );

  useEffect(() => {
    if (onboardingOpen) {
      setStep('welcome');
      setRegionQuery('');
      setUploadError(null);
      setCsvLoading(false);
    }
  }, [onboardingOpen]);

  useEffect(() => {
    const recommended = spanOptions.find((s) => s.recommended) || spanOptions[spanOptions.length - 1];
    setSelectedSpan(recommended);
  }, [spanOptions]);

  useEffect(() => {
    if (!onboardingOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeOnboarding(dontShowAgain);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onboardingOpen, dontShowAgain, closeOnboarding]);

  const filteredRegions = useMemo(() => {
    const q = regionQuery.trim().toLowerCase();
    if (!q) {
      return FEATURED_REGION_IDS.map((id) =>
        PREDEFINED_REGIONS.find((r) => r.id === id)
      ).filter(Boolean) as typeof PREDEFINED_REGIONS;
    }
    return PREDEFINED_REGIONS.filter((r) =>
      [r.name, r.name_ar, r.name_de, r.name_fr, r.code, r.climateZone]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [regionQuery]);

  const selectedRegionObj = useMemo(
    () => PREDEFINED_REGIONS.find((r) => r.id === selectedRegionId) || PREDEFINED_REGIONS[0],
    [selectedRegionId]
  );

  const handleChooseQuestion = (opt: OnboardingQuestionOption) => {
    setSelectedQuestion(opt);
    setUploadError(null);
    if (opt.isCsvFlow) {
      setStep('csv_upload');
      return;
    }
    if (opt.id === 'lst_surface' || opt.id === 'coupled_compare') {
      return;
    }
    setStep('region');
  };

  const handleChooseRegion = (regionId: string) => {
    setCustomGeoLabel(null);
    setSelectedRegionId(regionId);
    setStep('timespan');
  };

  const handleGeoJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      loadCustomGeoJSON(parsed, file.name);
      const latestId = useAppStore.getState().currentRegion.id;
      setSelectedRegionId(latestId);
      setCustomGeoLabel(file.name.replace(/\.(geo)?json$/i, ''));
      setStep('timespan');
    } catch (err: any) {
      setUploadError(err?.message || 'Invalid GeoJSON file');
    } finally {
      e.target.value = '';
    }
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvLoading(true);
    setUploadError(null);
    try {
      const cleanTitle = file.name.replace(/\.[^.]+$/, '');
      const analysis = await analysisService.uploadAndAnalyzeCSV(
        file,
        cleanTitle,
        'Index',
        'Custom Series'
      );
      const avail =
        (analysis as any)?.provenance?.availableTimeRange ||
        analysis.config.timeRange;
      setCustomCsvSession({
        file,
        fileName: file.name,
        analysis,
        availableRange: avail,
      });
      closeOnboarding(dontShowAgain);
      navigate('/analysis');
    } catch (err: any) {
      setUploadError(err?.message || 'Could not parse CSV file');
    } finally {
      setCsvLoading(false);
      e.target.value = '';
    }
  };

  const handleStartInvestigating = () => {
    const activeSpan = selectedSpan || spanOptions[spanOptions.length - 1];
    setVariable(selectedQuestion.variableId);
    setLstMode(selectedLstMode);
    setRegion(selectedRegionId);
    setTimeRange({
      startDate: activeSpan.startDate,
      endDate: activeSpan.endDate,
      aggregation: 'monthly',
    });
    saveCurrentInvestigation();
    closeOnboarding(dontShowAgain);
    navigate(selectedQuestion.targetRoute);
  };

  const handleShowMeAround = () => {
    closeOnboarding(dontShowAgain);
    setPendingTourOnExplorer(true);
    navigate('/explorer');
  };

  const currentStepNumber =
    step === 'question' ? 1 : step === 'region' ? 2 : step === 'timespan' ? 3 : 0;

  if (typeof document === 'undefined') return null;

  const modalContent = (
    <AnimatePresence>
      {onboardingOpen && (
        <motion.div
          key="trendscope-onboarding-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-[#05060a]/80 backdrop-blur-sm"
          onClick={() => closeOnboarding(dontShowAgain)}
          role="dialog"
          aria-modal="true"
          aria-label="TrendScope Setup"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <motion.div
            key="trendscope-onboarding-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative w-full rounded-2xl border border-[#eef0f5]/[0.1] bg-[#0b0d14] shadow-[0_24px_64px_rgba(0,0,0,0.65)] text-[#eef0f5] overflow-hidden',
              step === 'welcome' ? 'max-w-[540px]' : 'max-w-[700px]'
            )}
          >
            {/* Quiet Header Bar */}
            <div className="flex items-center justify-between gap-4 px-6 pt-6 pb-4 border-b border-[#eef0f5]/[0.07]">
              {currentStepNumber > 0 ? (
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#7a8296]">
                    <span className="text-[#a3a9b8]">
                      {ONBOARDING_COPY.stepLabel[lang].replace(
                        '{{current}}',
                        String(currentStepNumber)
                      )}
                    </span>
                    <span>·</span>
                    <span>TrendScope</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-w-[260px]">
                    {[1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'h-1 rounded-sm transition-colors duration-150',
                          idx <= currentStepNumber
                            ? 'bg-[#38bdf8]'
                            : 'bg-[#eef0f5]/[0.08]'
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-[#a3a9b8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                    <span className="font-medium text-[#eef0f5]">TrendScope</span>
                    <span className="text-[#7a8296]">·</span>
                    <span className="text-[#7a8296]">{ONBOARDING_COPY.contextTag[lang]}</span>
                  </div>

                  {/* Compact language toggle */}
                  <div className="flex items-center rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] p-0.5">
                    {(['en', 'ar', 'de', 'fr'] as SupportedLanguage[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => i18n.changeLanguage(code)}
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60',
                          lang === code
                            ? 'bg-[#1a1e28] text-[#eef0f5] font-medium'
                            : 'text-[#7a8296] hover:text-[#eef0f5]'
                        )}
                      >
                        {code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => closeOnboarding(dontShowAgain)}
                aria-label="Close"
                className="w-8 h-8 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-[#7a8296] hover:text-[#eef0f5] flex items-center justify-center transition-colors duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Step Body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 'welcome' && (
                  <motion.div
                    key="step-welcome"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <h2
                        className={cn(
                          'text-[28px] leading-[1.15] text-[#eef0f5] font-normal',
                          isRtl ? 'font-medium' : 'font-instrument'
                        )}
                      >
                        {ONBOARDING_COPY.welcomeTitle[lang]}
                      </h2>
                      <p className="text-sm text-[#a3a9b8] leading-relaxed">
                        {ONBOARDING_COPY.welcomeSubtitle[lang]}
                      </p>
                    </div>

                    {/* Structured 3-row Instrument Pipeline */}
                    <div className="rounded-xl border border-[#eef0f5]/[0.08] bg-[#07080d] divide-y divide-[#eef0f5]/[0.07]">
                      {ONBOARDING_COPY.miniSteps.map((item) => (
                        <div
                          key={item.num}
                          className="grid grid-cols-[28px_100px_1fr] sm:grid-cols-[32px_120px_1fr] items-center gap-3 px-4 py-3 text-sm"
                        >
                          <span className="text-xs font-mono tabular-nums text-[#7a8296]">
                            {item.num}
                          </span>
                          <span className="font-medium text-[#eef0f5] truncate">
                            {item.label[lang]}
                          </span>
                          <span className="text-[13px] text-[#7a8296] truncate">
                            {item.detail[lang]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Primary & Secondary Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setStep('question')}
                        className="w-full h-11 px-5 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-sm flex items-center justify-center gap-2 transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
                      >
                        <span>{ONBOARDING_COPY.helpMeStart[lang]}</span>
                        <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                      </button>

                      <button
                        type="button"
                        onClick={handleShowMeAround}
                        className="w-full h-10 px-5 rounded-lg border border-[#eef0f5]/[0.09] bg-[#11141c] hover:bg-[#1a1e28] text-[#eef0f5] font-normal text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
                      >
                        <Compass className="w-4 h-4 text-[#a3a9b8]" strokeWidth={1.5} />
                        <span>{ONBOARDING_COPY.showMeAround[lang]}</span>
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t border-[#eef0f5]/[0.07] flex items-center justify-between gap-4 flex-wrap">
                      <label className="inline-flex items-center gap-2 text-xs text-[#7a8296] hover:text-[#a3a9b8] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={dontShowAgain}
                          onChange={(e) => setDontShowAgain(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-[#eef0f5]/20 bg-[#11141c] accent-[#38bdf8]"
                        />
                        <span>{ONBOARDING_COPY.dontShowAgain[lang]}</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => closeOnboarding(dontShowAgain)}
                        className="text-xs text-[#a3a9b8] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                      >
                        {ONBOARDING_COPY.skipExplore[lang]}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'question' && (
                  <motion.div
                    key="step-question"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h2
                        className={cn(
                          'text-[26px] leading-[1.15] text-[#eef0f5] font-normal',
                          isRtl ? 'font-medium' : 'font-instrument'
                        )}
                      >
                        {ONBOARDING_COPY.step1Title[lang]}
                      </h2>
                      <p className="text-sm text-[#a3a9b8]">
                        {ONBOARDING_COPY.step1Subtitle[lang]}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ONBOARDING_QUESTIONS.map((opt) => {
                        const active = selectedQuestion.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleChooseQuestion(opt)}
                            className={cn(
                              'group text-start rounded-xl border p-4 transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60',
                              active
                                ? 'border-[#38bdf8]/55 bg-[#1a1e28] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:border-[#eef0f5]/[0.16] hover:bg-[#161a24]'
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {renderQuestionIcon(opt.id, active)}
                                  <span className="text-xs font-mono text-[#7a8296] truncate">
                                    {opt.sensorTag[lang]}
                                  </span>
                                </div>
                                <ArrowRight
                                  className="w-4 h-4 text-[#7a8296] group-hover:text-[#eef0f5] rtl:rotate-180 shrink-0 transition-colors duration-150"
                                  strokeWidth={1.5}
                                />
                              </div>
                              <div className="text-sm font-medium text-[#eef0f5] leading-snug">
                                {opt.question[lang]}
                              </div>
                            </div>
                            <p className="text-[13px] text-[#a3a9b8] leading-snug">
                              {opt.description[lang]}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {(selectedQuestion.id === 'lst_surface' || selectedQuestion.id === 'coupled_compare') && (
                      <div className="rounded-xl border border-[#eef0f5]/[0.1] bg-[#07080d] p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#eef0f5]">
                            {ONBOARDING_COPY.lstWindowTitle[lang]}
                          </span>
                          <span className="text-[11px] font-mono text-[#7a8296]">
                            MODIS MOD11C3.061
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {LST_MODE_OPTIONS.map((modeOpt) => {
                            const activeMode = selectedLstMode === modeOpt.id;
                            const ModeIcon =
                              modeOpt.id === 'day'
                                ? Sun
                                : modeOpt.id === 'night'
                                ? Moon
                                : GitCompareArrows;
                            return (
                              <button
                                key={modeOpt.id}
                                type="button"
                                onClick={() => setSelectedLstMode(modeOpt.id)}
                                className={cn(
                                  'text-start rounded-lg border p-3 transition-[border-color,background-color] duration-150 flex flex-col gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60',
                                  activeMode
                                    ? 'border-[#38bdf8]/60 bg-[#1a1e28]'
                                    : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:border-[#eef0f5]/[0.16]'
                                )}
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#eef0f5]">
                                    <ModeIcon
                                      className={cn(
                                        'w-3.5 h-3.5',
                                        activeMode ? 'text-[#38bdf8]' : 'text-[#a3a9b8]'
                                      )}
                                      strokeWidth={1.5}
                                    />
                                    {modeOpt.label[lang]}
                                  </span>
                                  {activeMode && (
                                    <Check className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" strokeWidth={1.75} />
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-[#7a8296]">
                                  {modeOpt.windowTag[lang]}
                                </span>
                                <span className="text-[12px] text-[#a3a9b8] leading-snug">
                                  {modeOpt.description[lang]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[#eef0f5]/[0.07] flex items-center justify-between gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStep('welcome')}
                        className="h-9 px-3.5 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs font-medium text-[#eef0f5] flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                        <span>{ONBOARDING_COPY.back[lang]}</span>
                      </button>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => closeOnboarding(dontShowAgain)}
                          className="text-xs text-[#7a8296] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                        >
                          {ONBOARDING_COPY.skipGuide[lang]}
                        </button>

                        {(selectedQuestion.id === 'lst_surface' || selectedQuestion.id === 'coupled_compare') && (
                          <button
                            type="button"
                            onClick={() => setStep('region')}
                            className="h-9 px-4 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
                          >
                            <span>{ONBOARDING_COPY.continueToRegion[lang]}</span>
                            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'csv_upload' && (
                  <motion.div
                    key="step-csv"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h2
                        className={cn(
                          'text-[26px] leading-[1.15] text-[#eef0f5] font-normal',
                          isRtl ? 'font-medium' : 'font-instrument'
                        )}
                      >
                        {ONBOARDING_COPY.csvStepTitle[lang]}
                      </h2>
                      <p className="text-sm text-[#a3a9b8]">
                        {ONBOARDING_COPY.csvStepSubtitle[lang]}
                      </p>
                    </div>

                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvFile}
                      className="hidden"
                    />

                    <div className="rounded-xl border border-dashed border-[#eef0f5]/[0.16] bg-[#07080d] p-6 flex flex-col items-center text-center gap-4">
                      <div className="w-10 h-10 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] text-[#a3a9b8] flex items-center justify-center">
                        {csvLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Upload className="w-4 h-4" strokeWidth={1.5} />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          disabled={csvLoading}
                          onClick={() => csvInputRef.current?.click()}
                          className="h-10 px-5 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-sm transition-colors duration-150 cursor-pointer disabled:opacity-60"
                        >
                          {ONBOARDING_COPY.csvPickButton[lang]}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeOnboarding(dontShowAgain);
                            navigate('/explorer');
                          }}
                          className="h-10 px-4 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-[#eef0f5] text-sm transition-colors duration-150 cursor-pointer"
                        >
                          {ONBOARDING_COPY.csvOrExplorer[lang]}
                        </button>
                      </div>

                      {uploadError && (
                        <p className="text-xs text-[#e5484d]">{uploadError}</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#eef0f5]/[0.07] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep('question')}
                        className="h-9 px-3.5 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs font-medium text-[#eef0f5] flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                        <span>{ONBOARDING_COPY.back[lang]}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => closeOnboarding(dontShowAgain)}
                        className="text-xs text-[#7a8296] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                      >
                        {ONBOARDING_COPY.skipGuide[lang]}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'region' && (
                  <motion.div
                    key="step-region"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h2
                        className={cn(
                          'text-[26px] leading-[1.15] text-[#eef0f5] font-normal',
                          isRtl ? 'font-medium' : 'font-instrument'
                        )}
                      >
                        {ONBOARDING_COPY.step2Title[lang]}
                      </h2>
                      <p className="text-sm text-[#a3a9b8]">
                        {ONBOARDING_COPY.step2Subtitle[lang]}
                      </p>
                    </div>

                    {/* Search Governorate */}
                    <div className="relative">
                      <Search
                        className="w-4 h-4 text-[#7a8296] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none"
                        strokeWidth={1.5}
                      />
                      <input
                        type="text"
                        value={regionQuery}
                        onChange={(e) => setRegionQuery(e.target.value)}
                        placeholder={ONBOARDING_COPY.searchPlaceholder[lang]}
                        className="w-full h-10 rounded-lg border border-[#eef0f5]/[0.09] bg-[#07080d] focus:border-[#38bdf8]/55 outline-none ps-10 pe-4 text-sm text-[#eef0f5] placeholder:text-[#7a8296] transition-colors duration-150"
                      />
                    </div>

                    <input
                      ref={geoInputRef}
                      type="file"
                      accept=".geojson,.json"
                      onChange={handleGeoJsonFile}
                      className="hidden"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredRegions.slice(0, regionQuery.trim() ? 9 : 5).map((reg) => {
                        const active = !customGeoLabel && selectedRegionId === reg.id;
                        const customSub = REGION_SHORT_SUBTITLES[reg.id]?.[lang];
                        return (
                          <button
                            key={reg.id}
                            type="button"
                            onClick={() => handleChooseRegion(reg.id)}
                            className={cn(
                              'text-start rounded-xl border p-4 transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60',
                              active
                                ? 'border-[#38bdf8]/55 bg-[#1a1e28] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:border-[#eef0f5]/[0.16] hover:bg-[#161a24]'
                            )}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <MapPin className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
                                  <span className="text-sm font-medium text-[#eef0f5] truncate">
                                    {getRegionDisplayName(reg, lang)}
                                  </span>
                                </div>
                                <span className="text-xs font-mono tabular-nums text-[#7a8296] shrink-0">
                                  {reg.areaKm2.toLocaleString()} km²
                                </span>
                              </div>
                              <p className="text-[13px] text-[#a3a9b8] leading-snug ps-6 line-clamp-1">
                                {customSub || reg.climateZone}
                              </p>
                            </div>
                          </button>
                        );
                      })}

                      {/* 6th slot: Custom GeoJSON */}
                      <button
                        type="button"
                        onClick={() => geoInputRef.current?.click()}
                        className="text-start rounded-xl border border-dashed border-[#eef0f5]/[0.16] bg-[#07080d] hover:border-[#eef0f5]/[0.28] hover:bg-[#11141c] p-4 transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Upload className="w-4 h-4 text-[#a3a9b8] shrink-0" strokeWidth={1.5} />
                              <span className="text-sm font-medium text-[#eef0f5] truncate">
                                {ONBOARDING_COPY.customGeoTitle[lang]}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-[#7a8296] shrink-0">
                              .geojson
                            </span>
                          </div>
                          <p className="text-[13px] text-[#7a8296] leading-snug ps-6 line-clamp-1">
                            {ONBOARDING_COPY.customGeoDesc[lang]}
                          </p>
                        </div>
                      </button>
                    </div>

                    {uploadError && (
                      <p className="text-xs text-[#e5484d]">{uploadError}</p>
                    )}

                    <div className="pt-4 border-t border-[#eef0f5]/[0.07] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep('question')}
                        className="h-9 px-3.5 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs font-medium text-[#eef0f5] flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                        <span>{ONBOARDING_COPY.back[lang]}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => closeOnboarding(dontShowAgain)}
                        className="text-xs text-[#7a8296] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                      >
                        {ONBOARDING_COPY.skipGuide[lang]}
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'timespan' && (
                  <motion.div
                    key="step-timespan"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <h2
                        className={cn(
                          'text-[26px] leading-[1.15] text-[#eef0f5] font-normal',
                          isRtl ? 'font-medium' : 'font-instrument'
                        )}
                      >
                        {ONBOARDING_COPY.step3Title[lang]}
                      </h2>
                      <p className="text-sm text-[#a3a9b8]">
                        {ONBOARDING_COPY.step3Subtitle[lang]}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {spanOptions.map((opt) => {
                        const active = selectedSpan?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedSpan(opt)}
                            className={cn(
                              'text-start rounded-xl border p-4 transition-[border-color,background-color] duration-150 flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60',
                              active
                                ? 'border-[#38bdf8]/60 bg-[#1a1e28] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                                : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:border-[#eef0f5]/[0.16] hover:bg-[#161a24]'
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-[#eef0f5]">
                                  {opt.title[lang]}
                                </span>
                                {active && (
                                  <Check className="w-4 h-4 text-[#38bdf8] shrink-0" strokeWidth={1.75} />
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono tabular-nums text-[#a3a9b8]">
                                  {opt.yearsLabel}
                                </span>
                                {opt.recommended && (
                                  <span className="text-[11px] text-[#4cc38a]">
                                    · {ONBOARDING_COPY.recommendedBadge[lang]}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[13px] text-[#7a8296] leading-snug">
                              {opt.description[lang]}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Instrument Configuration Brief */}
                    <div className="rounded-lg border border-[#eef0f5]/[0.08] bg-[#07080d] px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-xs">
                      <span className="text-[#7a8296]">
                        {ONBOARDING_COPY.yourCaseLabel[lang]}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap font-mono tabular-nums text-[#eef0f5]">
                        <span>
                          {selectedQuestion.sensorTag[lang]}
                          {selectedQuestion.variableId === 'lst'
                            ? ` · ${LST_MODE_OPTIONS.find((m) => m.id === selectedLstMode)?.label[lang] || 'Daytime'}`
                            : ''}
                        </span>
                        <span className="text-[#7a8296]">·</span>
                        <span className="font-sans">
                          {customGeoLabel || getRegionDisplayName(selectedRegionObj, lang)}
                        </span>
                        <span className="text-[#7a8296]">·</span>
                        <span className="text-[#38bdf8]">
                          {selectedSpan?.yearsLabel || spanOptions[spanOptions.length - 1].yearsLabel}
                        </span>
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-4 border-t border-[#eef0f5]/[0.07] flex items-center justify-between gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStep('region')}
                        className="h-9 px-3.5 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs font-medium text-[#eef0f5] flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                        <span>{ONBOARDING_COPY.back[lang]}</span>
                      </button>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => closeOnboarding(dontShowAgain)}
                          className="text-xs text-[#7a8296] hover:text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                        >
                          {ONBOARDING_COPY.skipGuide[lang]}
                        </button>

                        <button
                          type="button"
                          onClick={handleStartInvestigating}
                          className="h-10 px-5 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-sm flex items-center gap-2 transition-colors duration-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/60"
                        >
                          <span>{ONBOARDING_COPY.startInvestigating[lang]}</span>
                          <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
