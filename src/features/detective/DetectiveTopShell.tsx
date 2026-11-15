import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  X,
  ArrowUpRight,
  Trash2,
  HelpCircle,
  Compass,
  LogOut,
  CheckCircle2,
  KeyRound,
  User,
  Mail,
} from 'lucide-react';
import { DetectiveControlBar } from './DetectiveControlBar';
import { ConstellationHaloNav } from './ConstellationHaloNav';
import { DETECTIVE_UI_LABELS } from './trendSignalsData';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';
import {
  googleAuthService,
  GoogleUser,
} from '../../services/auth/googleAuthService';
import { useAppStore } from '../../store/useAppStore';
import { SupportedLanguage } from '../../types/scientific';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

// Official 4-color Google G Icon
export const GoogleIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface DetectiveTopShellProps {
  tourStep: number | null;
  setTourStep: (step: number | null) => void;
  showControlBar?: boolean;
  onAnalyze?: () => void;
}

export const DetectiveTopShell: React.FC<DetectiveTopShellProps> = ({
  tourStep,
  setTourStep,
  showControlBar = true,
  onAnalyze,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const labels = DETECTIVE_UI_LABELS[lang] || DETECTIVE_UI_LABELS.en;

  const {
    savedInvestigations,
    loadSavedInvestigation,
    deleteSavedInvestigation,
    loadUserInvestigations,
    openOnboarding,
  } = useAppStore();

  const [casesDrawerOpen, setCasesDrawerOpen] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(() =>
    googleAuthService.getCurrentUser()
  );
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');

  useEffect(() => {
    const user = googleAuthService.getCurrentUser();
    if (user) {
      setGoogleUser(user);
      loadUserInvestigations(user.email);
    } else {
      loadUserInvestigations(null);
    }
  }, [loadUserInvestigations]);

  const handleOpenCase = (inv: any) => {
    loadSavedInvestigation(inv);
    setCasesDrawerOpen(false);
    navigate('/analysis');
  };

  const handleGoogleSignIn = async (email?: string) => {
    const user = await googleAuthService.signInWithGoogle(email);
    setGoogleUser(user);
    loadUserInvestigations(user.email);
    setGoogleModalOpen(false);
  };

  const handleEmailSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    const user = await googleAuthService.signInWithEmail(
      customEmail,
      customPassword
    );
    setGoogleUser(user);
    loadUserInvestigations(user.email);
    setGoogleModalOpen(false);
  };

  const handleSignOut = () => {
    googleAuthService.signOut();
    setGoogleUser(null);
    loadUserInvestigations(null);
    setCasesDrawerOpen(false);
  };

  return (
    <header className="w-full bg-[#07080d] relative z-30 py-3 px-4 sm:px-6 lg:px-8 border-b border-[#eef0f5]/[0.08]">
      <div className="max-w-[1440px] mx-auto space-y-4 relative z-10">
        {/* ROW 1: BRAND LOGO + UTILITIES */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
          {/* Brand Signature */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 group text-start focus:outline-none cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />
              <span className="text-[17px] leading-none font-medium tracking-[-0.01em] text-[#eef0f5] group-hover:text-white transition-colors duration-150">
                TrendScope
              </span>
              <span className="h-3.5 w-[1px] bg-[#eef0f5]/[0.1] mx-0.5 hidden sm:inline-block" />
              <span className="text-xs font-mono text-[#7a8296] hidden sm:inline-block">
                NASA EOSDIS
              </span>
            </button>
          </div>

          {/* Center space */}
          <div className="flex-1" />

          {/* Right: TOP UTILITY DOCK (Tour + My cases [ONLY if signed in] + Language + Sign In) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Guided Q&A Wizard */}
            <button
              type="button"
              onClick={openOnboarding}
              title={lang === 'ar' ? 'إعداد الفحص خطوة بخطوة' : 'Guided Setup'}
              className="h-8 px-3 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs font-normal text-[#a3a9b8] hover:text-[#eef0f5] flex items-center gap-2 transition-colors duration-150 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
              <span className="hidden md:inline">
                {lang === 'ar' ? 'الدليل' : 'Guide'}
              </span>
            </button>

            {/* Guided Tour (Explorer spotlight tour; falls back to Q&A wizard elsewhere) */}
            <button
              type="button"
              onClick={() => (showControlBar ? setTourStep(tourStep ? null : 1) : openOnboarding())}
              title={showControlBar ? 'Explorer Spotlight Tour' : 'Guided Setup Wizard'}
              className={cn(
                'w-8 h-8 rounded-lg border text-xs font-normal flex items-center justify-center transition-colors duration-150 cursor-pointer',
                tourStep !== null
                  ? 'border-[#38bdf8]/50 bg-[#1a1e28] text-[#38bdf8]'
                  : 'border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-[#7a8296] hover:text-[#eef0f5]'
              )}
            >
              <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
            </button>

            {/* My Cases — ONLY VISIBLE WHEN USER IS SIGNED IN (Account-specific cases) */}
            {googleUser && (
              <button
                type="button"
                onClick={() => setCasesDrawerOpen(true)}
                className="h-8 px-3 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs text-[#a3a9b8] hover:text-[#eef0f5] flex items-center gap-2 transition-colors duration-150 cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
                <span className="hidden sm:inline">{labels.myCases}</span>
                <span className="text-xs font-mono tabular-nums text-[#7a8296]">
                  {savedInvestigations.length}
                </span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="shrink-0">
              <LanguageSwitcher compact />
            </div>

            {/* Sign In Button / User Profile Pill */}
            {googleUser ? (
              <div className="relative group shrink-0">
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="h-8 px-3 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] text-xs text-[#eef0f5] flex items-center gap-2 transition-colors duration-150 cursor-pointer"
                >
                  <img
                    src={googleUser.avatar}
                    alt={googleUser.name}
                    className="w-4 h-4 rounded-full border border-[#eef0f5]/[0.15] shrink-0"
                  />
                  <span className="max-w-[100px] truncate text-xs font-normal">
                    {googleUser.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] shrink-0" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('google');
                  setGoogleModalOpen(true);
                }}
                className="h-8 px-3.5 rounded-lg text-xs font-medium text-[#0b0d14] bg-[#eef0f5] hover:bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] shrink-0 flex items-center gap-2 transition-colors duration-150 cursor-pointer"
              >
                <User className="w-4 h-4" strokeWidth={1.5} />
                <span>
                  {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: HEADLINE & PARAMETER CONSOLE (SHOWN ON EXPLORER) */}
        {showControlBar && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h1 className="text-[20px] sm:text-[24px] leading-[1.2] font-medium text-[#eef0f5] tracking-[-0.01em]">
                {labels.heroTitle}
              </h1>
              <p className="text-[13px] text-[#7a8296]">
                {labels.heroSubtitle}
              </p>
            </div>

            <DetectiveControlBar
              tourStep={tourStep}
              setTourStep={setTourStep}
              onAnalyze={onAnalyze}
            />
          </div>
        )}
      </div>

      {/* SLIDE-OVER DRAWER: "My cases" for Current Logged-in Account */}
      <AnimatePresence>
        {casesDrawerOpen && googleUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCasesDrawerOpen(false)}
              className="fixed inset-0 bg-[#05060a]/80 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-3 bottom-3 end-3 w-full max-w-md rounded-2xl bg-[#11141c] z-50 flex flex-col p-6 border border-[#eef0f5]/[0.1] shadow-[0_24px_64px_rgba(0,0,0,0.7)]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[#eef0f5]/[0.08]">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
                  <div>
                    <h3 className="text-[15px] font-medium text-[#eef0f5] leading-tight">
                      {labels.myCases}
                    </h3>
                    <p className="text-xs text-[#7a8296] font-mono">
                      {googleUser.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCasesDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg border border-[#eef0f5]/[0.08] bg-[#1a1e28] hover:bg-[#232836] text-[#7a8296] hover:text-[#eef0f5] flex items-center justify-center transition-colors duration-150 cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <p className="text-[13px] text-[#a3a9b8] mt-3 mb-4 leading-5">
                Saved Earth system trend investigations and pre-calibrated NASA
                benchmark studies for this account.
              </p>

              <div className="flex-1 overflow-y-auto space-y-2.5 pe-1">
                {savedInvestigations.length === 0 ? (
                  <div className="text-center py-12 text-[#7a8296] text-xs">
                    {lang === 'ar'
                      ? 'لا توجد تحقيقات محفوظة لهذا الحساب حالياً'
                      : 'No saved investigations for this account yet'}
                  </div>
                ) : (
                  savedInvestigations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.08] flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono text-[#7a8296] mb-1">
                          <span className="font-sans font-medium text-[#38bdf8]">
                            {t(`regions.${inv.regionId}` as any) || inv.regionId}
                          </span>
                          <span>{formatDate(inv.createdAt, lang)}</span>
                        </div>
                        <h4 className="text-[13px] font-medium text-[#eef0f5]">
                          {t(`variables.${inv.variableId}.name` as any)}
                        </h4>
                        <div className="text-xs font-mono tabular-nums text-[#7a8296] mt-1">
                          {inv.datasetId} · {inv.timeRange.startDate.slice(0, 4)}–
                          {inv.timeRange.endDate.slice(0, 4)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#eef0f5]/[0.07]">
                        <div className="flex items-center gap-2">
                          <DemoDataBadge status={inv.status} size="sm" />
                          <button
                            type="button"
                            onClick={() => deleteSavedInvestigation(inv.id)}
                            className="p-1 text-[#7a8296] hover:text-[#e5484d] transition-colors duration-150 cursor-pointer"
                            title="Remove case"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenCase(inv)}
                          className="h-8 px-3 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-xs flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                        >
                          <span>{labels.analyzeBtn}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* SIGN IN & ACCOUNT MODAL (GOOGLE OR EMAIL SELECTION) */}
      <AnimatePresence>
        {googleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGoogleModalOpen(false)}
              className="fixed inset-0 bg-[#05060a]/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-md bg-[#11141c] border border-[#eef0f5]/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-6 space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#eef0f5]/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1e28] border border-[#eef0f5]/[0.08] flex items-center justify-center text-[#a3a9b8]">
                    <User className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-medium text-[#eef0f5] leading-tight">
                      {googleUser
                        ? (lang === 'ar' ? 'الحساب المتصل' : 'Connected account')
                        : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign in')}
                    </h3>
                    <p className="text-xs text-[#7a8296]">
                      TrendScope identity hub
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(false)}
                  className="w-8 h-8 rounded-lg border border-[#eef0f5]/[0.08] bg-[#1a1e28] hover:bg-[#232836] text-[#7a8296] hover:text-[#eef0f5] flex items-center justify-center transition-colors duration-150 cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              {/* If user is ALREADY signed in */}
              {googleUser ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.08] flex items-center gap-3.5">
                    <img
                      src={googleUser.avatar}
                      alt={googleUser.name}
                      className="w-11 h-11 rounded-full border border-[#eef0f5]/[0.12] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-[#eef0f5] truncate">
                          {googleUser.name}
                        </h4>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                      </div>
                      <p className="text-xs text-[#7a8296] truncate">
                        {googleUser.email}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#4cc38a] mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>
                          {googleUser.provider === 'email'
                            ? (lang === 'ar' ? 'حساب بريد إلكتروني نشط' : 'Email account active')
                            : (lang === 'ar' ? 'متصل عبر Google OAuth' : 'Google OAuth synced')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs text-[#a3a9b8] space-y-1.5 font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-[#7a8296]">NASA Earthdata</span>
                      <span className="text-[#4cc38a]">
                        Backend proxy verified
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7a8296]">
                        {lang === 'ar' ? 'الحالات المحفوظة' : 'Account cases'}
                      </span>
                      <span className="text-[#eef0f5]">
                        {savedInvestigations.length} {lang === 'ar' ? 'حالات' : 'cases'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setGoogleModalOpen(false)}
                      className="flex-1 h-9 rounded-lg border border-[#eef0f5]/[0.08] bg-[#1a1e28] hover:bg-[#232836] text-[#eef0f5] text-xs font-medium transition-colors duration-150 cursor-pointer"
                    >
                      {lang === 'ar' ? 'إغلاق' : 'Close'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="h-9 px-4 rounded-lg bg-[#e5484d]/10 hover:bg-[#e5484d]/20 border border-[#e5484d]/30 text-[#e5484d] text-xs font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.5} />
                      <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* NOT SIGNED IN: Choose Google or Email */
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.08] text-center">
                    <p className="text-[13px] font-medium text-[#eef0f5]">
                      {lang === 'ar'
                        ? 'تحب تسجيل الدخول بواسطة Google أو البريد الإلكتروني؟'
                        : 'Would you like to sign in with Google or with Email?'}
                    </p>
                    <p className="text-xs text-[#7a8296] mt-1">
                      {lang === 'ar'
                        ? 'اختر الطريقة المناسبة لمزامنة دراساتك وحالاتك الخاصة'
                        : 'Choose your preferred method to sync your NASA cases'}
                    </p>
                  </div>

                  {/* Method Switcher Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08]">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('google')}
                      className={cn(
                        'h-8 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer',
                        authMethod === 'google'
                          ? 'bg-[#1a1e28] text-[#eef0f5]'
                          : 'text-[#7a8296] hover:text-[#eef0f5]'
                      )}
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('email')}
                      className={cn(
                        'h-8 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer',
                        authMethod === 'email'
                          ? 'bg-[#1a1e28] text-[#eef0f5]'
                          : 'text-[#7a8296] hover:text-[#eef0f5]'
                      )}
                    >
                      <Mail className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
                      <span>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                    </button>
                  </div>

                  {/* GOOGLE OPTION */}
                  {authMethod === 'google' && (
                    <div className="space-y-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGoogleSignIn(customGoogleEmail)}
                        className="w-full h-10 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-xs sm:text-sm flex items-center justify-center gap-3 active:scale-[0.99] transition-[background-color,transform] duration-150 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                      >
                        <GoogleIcon className="w-4 h-4 shrink-0" />
                        <span>
                          {lang === 'ar'
                            ? 'المتابعة باستخدام Google'
                            : 'Continue with Google'}
                        </span>
                      </button>

                      <div className="pt-3 border-t border-[#eef0f5]/[0.07] space-y-1.5">
                        <label className="block text-xs text-[#7a8296]">
                          {lang === 'ar'
                            ? 'أو أدخل بريد Google يدوياً'
                            : 'Or specify Google account email'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={customGoogleEmail}
                            onChange={(e) => setCustomGoogleEmail(e.target.value)}
                            placeholder="yehia.amin@gmail.com"
                            className="flex-1 h-9 px-3 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs text-[#eef0f5] placeholder-[#7a8296] focus:border-[#38bdf8]/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleGoogleSignIn(customGoogleEmail)}
                            className="h-9 px-3.5 rounded-lg bg-[#1a1e28] hover:bg-[#232836] border border-[#eef0f5]/[0.08] text-xs font-medium text-[#eef0f5] transition-colors duration-150 cursor-pointer"
                          >
                            {lang === 'ar' ? 'دخول' : 'Sign in'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EMAIL OPTION */}
                  {authMethod === 'email' && (
                    <form
                      onSubmit={handleEmailSignInSubmit}
                      className="space-y-3 pt-1"
                    >
                      <div className="space-y-1">
                        <label className="block text-xs text-[#7a8296]">
                          {lang === 'ar'
                            ? 'البريد الإلكتروني'
                            : 'Email address'}
                        </label>
                        <input
                          type="email"
                          required
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          placeholder="researcher@nasa.gov"
                          className="w-full h-9 px-3 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs text-[#eef0f5] placeholder-[#7a8296] focus:border-[#38bdf8]/50 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs text-[#7a8296]">
                          {lang === 'ar'
                            ? 'كلمة المرور / الرمز'
                            : 'Password or access key'}
                        </label>
                        <input
                          type="password"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-9 px-3 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs text-[#eef0f5] placeholder-[#7a8296] focus:border-[#38bdf8]/50 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full h-10 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] mt-2"
                      >
                        <Mail className="w-4 h-4" strokeWidth={1.5} />
                        <span>
                          {lang === 'ar'
                            ? 'تسجيل الدخول بالبريد'
                            : 'Sign in with Email'}
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
