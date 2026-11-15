import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DetectiveTopShell } from '../features/detective/DetectiveTopShell';
import { FeaturesBottomDock } from '../components/navigation/FeaturesBottomDock';
import { useAppStore } from '../store/useAppStore';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isExplorer = location.pathname === '/explorer';
  const {
    pendingTourOnExplorer,
    setPendingTourOnExplorer,
    pendingOnboardingAuto,
    openOnboarding,
  } = useAppStore();

  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    if (!isExplorer || pendingTourOnExplorer) return;

    try {
      const hidden = localStorage.getItem('trendscope_onboarding_hidden_v1') === '1';
      if (hidden) return;
      const seen = sessionStorage.getItem('trendscope_onboarding_seen_v1') === '1';
      if (!pendingOnboardingAuto && seen) return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => {
      openOnboarding();
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isExplorer, pendingTourOnExplorer, pendingOnboardingAuto, openOnboarding]);

  useEffect(() => {
    if (!isExplorer && tourStep !== null) {
      setTourStep(null);
    }
    if (isExplorer && pendingTourOnExplorer) {
      setPendingTourOnExplorer(false);
      setTourStep(1);
    }
  }, [location.pathname, isExplorer, pendingTourOnExplorer, setPendingTourOnExplorer, tourStep]);

  return (
    <div className="min-h-screen min-h-dvh bg-[#08080A] text-zinc-100 flex flex-col selection:bg-white/20 selection:text-white">
      <DetectiveTopShell
        tourStep={tourStep}
        setTourStep={setTourStep}
        showControlBar={isExplorer}
      />

      {isExplorer ? (
        <main className="flex-1 w-full flex flex-col overflow-hidden pb-20">
          <Outlet context={{ tourStep, setTourStep }} />
        </main>
      ) : (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet context={{ tourStep, setTourStep }} />
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* Features Bottom Dock (Replaces Globe Halo Nav with minimal bottom dock) */}
      <FeaturesBottomDock />
    </div>
  );
};
