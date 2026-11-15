import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Hero } from '../../components/serene/Hero';
import { QuoteSection } from '../../components/serene/QuoteSection';
import { ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openOnboardingIfAllowed } = useAppStore();

  return (
    <div className="bg-[#0a0608] min-h-screen text-white selection:bg-white/20">
      {/* SECTION 1: Full-Screen Serene Luxury Hero with Video & Feature Navbar */}
      <Hero />

      {/* SECTION 2: Full-Screen Parallax Quote Section (Rainbow, Clouds, Lerp smoothing) */}
      <QuoteSection />

      {/* SECTION 3: Minimalist Serene Callout & Footer */}
      <section className="relative bg-[#060913] border-t border-white/10 py-16 px-6 md:px-12">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-start">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#60A5FA] font-mono mb-2">
              NASA SPACE APPS CHALLENGE 2026
            </div>
            <h3 className="font-instrument text-2xl md:text-3xl text-white">
              Ready to investigate Earth&apos;s environmental changes?
            </h3>
            <p className="text-sm text-white/60 mt-1 max-w-xl">
              Launch the Earth Explorer or run parametric regressions and AI-assisted synthesis.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              openOnboardingIfAllowed();
              navigate('/explorer');
            }}
            className="bg-white text-black px-8 py-3.5 rounded-full font-medium text-sm tracking-wide hover:bg-white/90 transition-colors duration-200 button-glow shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>{t('landing.hero.ctaPrimary')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div className="flex items-center gap-3">
            <span
              className="text-white text-2xl"
              style={{ fontFamily: "'Dancing Script', cursive" }}
            >
              TrendScope
            </span>
            <span>•</span>
            <span className="font-mono text-white/80">NASA EARTH OBSERVATION</span>
          </div>

          <div>{t('common.allRightsReserved')}</div>
        </div>
      </section>
    </div>
  );
};
