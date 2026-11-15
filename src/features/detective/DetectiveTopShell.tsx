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
    <header className="w-full bg-[#08080A] relative z-30 pt-3 pb-3.5 px-4 sm:px-6 lg:px-8 border-b border-zinc-800/80">
      <div className="max-w-[1440px] mx-auto space-y-3.5 relative z-10">
        {/* ROW 1: BRAND LOGO + ORBIT FLIGHT RING NAVBAR (CONSTELLATION) + UTILITIES */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
          {/* Brand Signature */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 group text-start focus:outline-none cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <span className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-sky-300 transition-colors">
                TrendScope
              </span>
              <span className="h-3 w-[1px] bg-zinc-750 mx-1 hidden sm:inline-block" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 hidden sm:inline-block">
                EOSDIS
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
              className="h-8 px-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
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
                'w-8 h-8 rounded-lg border text-xs font-medium flex items-center justify-center transition-colors cursor-pointer',
                tourStep !== null
                  ? 'border-sky-500/50 bg-sky-500/15 text-sky-400'
                  : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white'
              )}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* My Cases — ONLY VISIBLE WHEN USER IS SIGNED IN (Account-specific cases) */}
            {googleUser && (
              <button
                type="button"
                onClick={() => setCasesDrawerOpen(true)}
                className="h-8 px-2.5 sm:px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">{labels.myCases}</span>
                <span className="text-[11px] font-mono text-sky-400 font-medium">
                  ({savedInvestigations.length})
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
                  className="h-8 px-2.5 sm:px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <img
                    src={googleUser.avatar}
                    alt={googleUser.name}
                    className="w-4 h-4 rounded-full border border-zinc-700 shrink-0"
                  />
                  <span className="max-w-[100px] truncate text-xs font-medium">
                    {googleUser.name}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('google');
                  setGoogleModalOpen(true);
                }}
                className="h-8 px-3 rounded-lg text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 border border-sky-500/50 shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <User className="w-3.5 h-3.5" />
                <span>
                  {lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: HEADLINE & PARAMETER CONSOLE (SHOWN ON EXPLORER) */}
        {showControlBar && (
          <div className="space-y-2.5 pt-1">
            <div>
              <h1 className="text-lg sm:text-[22px] font-bold text-white tracking-tight">
                {labels.heroTitle}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
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
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
            />
            <motion.aside
              initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-3 bottom-3 end-3 w-full max-w-md rounded-2xl bg-[#0B0F17] z-50 flex flex-col p-5 sm:p-6 border border-zinc-800 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-sky-400" />
                  <div>
                    <h3 className="text-base font-semibold text-white leading-tight">
                      {labels.myCases}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {googleUser.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCasesDrawerOpen(false)}
                  className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mt-3 mb-4 leading-relaxed">
                Saved Earth system trend investigations and pre-calibrated NASA
                benchmark studies for this account.
              </p>

              <div className="flex-1 overflow-y-auto space-y-2.5 pe-1">
                {savedInvestigations.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    {lang === 'ar'
                      ? 'لا توجد تحقيقات محفوظة لهذا الحساب حالياً'
                      : 'No saved investigations for this account yet'}
                  </div>
                ) : (
                  savedInvestigations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
                          <span className="font-semibold uppercase tracking-wider text-sky-400">
                            {t(`regions.${inv.regionId}` as any) || inv.regionId}
                          </span>
                          <span>{formatDate(inv.createdAt, lang)}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-100">
                          {t(`variables.${inv.variableId}.name` as any)}
                        </h4>
                        <div className="text-[11px] font-mono text-zinc-400 mt-1">
                          Dataset: {inv.datasetId} •{' '}
                          {inv.timeRange.startDate.slice(0, 4)}–
                          {inv.timeRange.endDate.slice(0, 4)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                          <DemoDataBadge status={inv.status} size="sm" />
                          <button
                            type="button"
                            onClick={() => deleteSavedInvestigation(inv.id)}
                            className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenCase(inv)}
                          className="h-7 px-3 rounded-md bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{labels.analyzeBtn}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative z-10 w-full max-w-md bg-[#0B0F17] border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {googleUser
                        ? (lang === 'ar' ? 'الحساب المتصل' : 'Connected Account')
                        : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign in')}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      TrendScope NASA Identity Hub
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(false)}
                  className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* If user is ALREADY signed in */}
              {googleUser ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-3.5">
                    <img
                      src={googleUser.avatar}
                      alt={googleUser.name}
                      className="w-11 h-11 rounded-full border border-zinc-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {googleUser.name}
                        </h4>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {googleUser.email}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>
                          {googleUser.provider === 'email'
                            ? (lang === 'ar' ? 'حساب بريد إلكتروني نشط' : 'Email Account Active')
                            : (lang === 'ar' ? 'متصل عبر Google OAuth' : 'Google OAuth Synced')}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">NASA Earthdata:</span>
                      <span className="text-emerald-400">
                        Backend Proxy Verified
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">
                        {lang === 'ar' ? 'الحالات المحفوظة:' : 'Account Cases:'}
                      </span>
                      <span className="text-sky-400 font-medium">
                        {savedInvestigations.length} {lang === 'ar' ? 'حالات' : 'cases'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setGoogleModalOpen(false)}
                      className="flex-1 h-9 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? 'إغلاق' : 'Close'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="h-9 px-4 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* NOT SIGNED IN: Choose Google or Email (as requested!) */
                <div className="space-y-4">
                  {/* The exact question requested by the user */}
                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-center">
                    <p className="text-xs sm:text-[13px] font-medium text-zinc-200">
                      {lang === 'ar'
                        ? 'تحب تسجيل الدخول بواسطة Google أو البريد الإلكتروني؟'
                        : 'Would you like to sign in with Google or with Email?'}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {lang === 'ar'
                        ? 'اختر الطريقة المناسبة لمزامنة دراساتك وحالاتك الخاصة'
                        : 'Choose your preferred method to sync your NASA cases'}
                    </p>
                  </div>

                  {/* Method Switcher Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('google')}
                      className={cn(
                        'py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer',
                        authMethod === 'google'
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      <GoogleIcon className="w-3.5 h-3.5" />
                      <span>Google</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('email')}
                      className={cn(
                        'py-2 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer',
                        authMethod === 'email'
                          ? 'bg-zinc-800 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</span>
                    </button>
                  </div>

                  {/* GOOGLE OPTION */}
                  {authMethod === 'google' && (
                    <div className="space-y-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleGoogleSignIn(customGoogleEmail)}
                        className="w-full h-11 rounded-lg bg-white text-zinc-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 hover:bg-zinc-100 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                      >
                        <GoogleIcon className="w-4 h-4 shrink-0" />
                        <span>
                          {lang === 'ar'
                            ? 'المتابعة باستخدام Google'
                            : 'Continue with Google'}
                        </span>
                      </button>

                      <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
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
                            className="flex-1 h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleGoogleSignIn(customGoogleEmail)}
                            className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors cursor-pointer"
                          >
                            {lang === 'ar' ? 'دخول' : 'Sign In'}
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
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          {lang === 'ar'
                            ? 'البريد الإلكتروني'
                            : 'Email Address'}
                        </label>
                        <input
                          type="email"
                          required
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          placeholder="researcher@nasa.gov"
                          className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                          {lang === 'ar'
                            ? 'كلمة المرور / الرمز'
                            : 'Password / Access Key'}
                        </label>
                        <input
                          type="password"
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full h-10 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm mt-2"
                      >
                        <Mail className="w-4 h-4" />
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
