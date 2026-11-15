import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ambientSound } from '../../utils/ambientSound';
import { useAppStore } from '../../store/useAppStore';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openOnboardingIfAllowed } = useAppStore();
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartInvestigation = () => {
    openOnboardingIfAllowed();
    navigate('/explorer');
  };

  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  const toggleSound = async () => {
    try {
      const active = await ambientSound.toggle();
      setIsMuted(!active);
      if (videoRef.current) {
        videoRef.current.muted = !active;
      }
    } catch (e) {
      console.warn('Audio toggle error', e);
    }
  };

  return (
    <section className="relative w-full h-screen overflow-hidden select-none">
      {/* 1. Background Video */}
      <video
        ref={videoRef}
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* 2. Dark Overlay */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* 3. Fixed Navbar: Clean & Minimal (Brand + Language + Start Investigation only) */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3.5 sm:px-6 md:px-12 py-3 sm:py-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-md border-b border-white/[0.06]">
        {/* Left: Project Brand Name in Dancing Script + NASA Tag */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-baseline gap-1.5 sm:gap-2.5 text-white group focus:outline-none shrink-0 cursor-pointer"
        >
          <span
            className="text-xl sm:text-2xl md:text-3xl tracking-normal text-[#38BDF8] drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
            style={{ fontFamily: "'Dancing Script', cursive" }}
          >
            TrendScope
          </span>
          <span className="text-[9px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-[#60A5FA] hidden xs:inline">
            NASA EOSDIS
          </span>
        </button>

        {/* Right: Language Switcher + Primary Start Investigation CTA */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={handleStartInvestigation}
            className="bg-white text-black px-3.5 sm:px-7 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm tracking-wide hover:bg-white/90 active:scale-[0.98] transition-all duration-200 button-glow cursor-pointer"
          >
            {t('landing.hero.ctaPrimary')}
          </button>
        </div>
      </header>

      {/* 4. Center Hero Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-16 sm:pt-20 z-10 pointer-events-none">
        <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#38BDF8] font-medium mb-4 pointer-events-auto font-sans">
          {t('landing.hero.eyebrow')} · MODIS MOD13Q1 · MOD11C3
        </p>

        <h1 className="font-instrument text-white text-[36px] md:text-7xl lg:text-[106px] leading-[0.92] tracking-tight text-center text-glow max-w-5xl">
          {t('landing.hero.heading')}
        </h1>

        <p className="text-white/75 text-sm md:text-base text-center mt-5 md:mt-7 max-w-xl font-inter leading-relaxed">
          {t('landing.hero.subheading')}
        </p>

        <div className="mt-6 md:mt-9 flex items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={handleStartInvestigation}
            className="bg-white text-black px-8 py-3.5 rounded-full font-medium text-sm tracking-wide hover:bg-white/90 transition-colors duration-200 button-glow cursor-pointer"
          >
            {t('landing.hero.ctaPrimary')}
          </button>
        </div>
      </div>

      {/* 5. Sound Indicator (Desktop Only) */}
      <button
        type="button"
        onClick={toggleSound}
        className="hidden md:flex items-center gap-3 absolute bottom-8 left-8 rtl:left-auto rtl:right-8 z-20 group focus:outline-none"
      >
        <div className="w-10 h-10 rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center transition-colors">
          {isMuted ? (
            <span className="w-3.5 h-[1.5px] bg-white/80 block" />
          ) : (
            <div className="flex items-end gap-[2px] h-3">
              <span className="w-[1.5px] h-2 bg-white animate-pulse" />
              <span className="w-[1.5px] h-3 bg-white animate-pulse" />
              <span className="w-[1.5px] h-1.5 bg-white animate-pulse" />
            </div>
          )}
        </div>
        <div className="text-start text-white/60 group-hover:text-white/90 text-xs leading-tight transition-colors">
          <div>Experience</div>
          <div>{isMuted ? 'with sound' : 'Cosmic audio ON'}</div>
        </div>
      </button>
    </section>
  );
};
