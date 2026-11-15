import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite,
  Globe2,
  TrendingUp,
  FlaskConical,
  Sparkles,
  FileText,
  Home,
  X,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { LIQUID_GLASS_SHADOW } from '../../components/ui/liquid-glass-button';
import { cn } from '../../utils/cn';

interface SatelliteNode {
  to: string;
  exact?: boolean;
  code: string;
  satellite: string;
  orbit: string;
  frequency: string;
  sensor: string;
  labelKey: string;
  descEn: string;
  descAr: string;
  icon: any;
  angleDeg: number;
}

export const ConstellationHaloNav: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isAr = i18n.language?.startsWith('ar');

  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const nodes: SatelliteNode[] = [
    {
      to: '/',
      exact: true,
      code: 'ORB-00',
      satellite: 'ARTEMIS BASE',
      orbit: 'GEO · 35,786 km',
      frequency: '2.2 GHz S-Band',
      sensor: 'Deep Space Network',
      labelKey: 'nav.landing',
      descEn: 'Planetary launchpad & orbital mission overview',
      descAr: 'منصة الإطلاق الرئيسية ونظرة عامة على المهمة الفضائية',
      icon: Home,
      angleDeg: -90,
    },
    {
      to: '/explorer',
      code: 'ORB-01',
      satellite: 'MODIS · TERRA',
      orbit: 'SSO · 705 km',
      frequency: '8.2 GHz X-Band',
      sensor: '36-Band Spectroradiometer',
      labelKey: 'nav.explorer',
      descEn: 'Interactive global satellite signal map & 3D GIS terrain',
      descAr: 'خريطة إشارات الأقمار الصناعية العالمية والتضاريس ثلاثية الأبعاد',
      icon: Globe2,
      angleDeg: -38.5,
    },
    {
      to: '/analysis',
      code: 'ORB-02',
      satellite: 'MOD11C3 · MOD13Q1',
      orbit: 'SSO · 705 km',
      frequency: 'Thermal + NIR',
      sensor: 'Non-Parametric Trend Engine',
      labelKey: 'nav.analysis',
      descEn: "Mann-Kendall significance testing & Sen's slope regressions",
      descAr: 'تحليل الاتجاهات الإحصائية واختبارات مان-كيندال وانحدار سين',
      icon: TrendingUp,
      angleDeg: 13,
    },
    {
      to: '/intelligence',
      code: 'ORB-03',
      satellite: 'NDVI · LST',
      orbit: 'SSO · 705 km',
      frequency: 'Terra Multi-Band',
      sensor: 'Vegetation-Thermal Coupling',
      labelKey: 'nav.intelligence',
      descEn: 'Vegetation cover & land surface temperature coupling lab',
      descAr: 'مختبر الارتباط بين الغطاء النباتي ودرجة حرارة سطح الأرض',
      icon: FlaskConical,
      angleDeg: 64.5,
    },
    {
      to: '/workspace',
      code: 'ORB-04',
      satellite: 'GEMINI · NEURAL',
      orbit: 'L1 · 1.5M km',
      frequency: 'Optical Laser Link',
      sensor: 'AI Earth System Scientist',
      labelKey: 'nav.workspace',
      descEn: 'Live Gemini AI scientific synthesis & hypothesis testing',
      descAr: 'الذكاء الاصطناعي العلمي لتحليل بيانات ناسا واختبار الفرضيات',
      icon: Sparkles,
      angleDeg: 116,
    },
    {
      to: '/reports',
      code: 'ORB-05',
      satellite: 'EOSDIS · ARCHIVE',
      orbit: 'Goddard DAAC',
      frequency: 'HTTPS / NetCDF4',
      sensor: 'Scientific Dossier Generator',
      labelKey: 'nav.reports',
      descEn: 'Export peer-reviewed NASA citations, CSV & JSON records',
      descAr: 'تصدير التقارير العلمية المعتمدة والمراجع وملفات البيانات',
      icon: FileText,
      angleDeg: 180,
    },
  ];

  const activeIndex = nodes.findIndex((item) =>
    item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to.split('?')[0])
  );
  const currentActiveIndex = activeIndex >= 0 ? activeIndex : 1;
  const activeNode = nodes[currentActiveIndex];
  const focusedNode =
    hoveredIndex !== null ? nodes[hoveredIndex] : activeNode;

  // Keyboard shortcut: Escape closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectNode = (to: string) => {
    setIsOpen(false);
    navigate(to);
  };

  // Circle geometry for the radial constellation (matches Image 2)
  const radius = 215; // px from center in desktop radial ring

  return (
    <>
      {/* COMPACT ORBITAL RING TRIGGER BUTTON IN NAVBAR */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-9 px-3.5 rounded-full text-xs font-semibold text-[#38BDF8] border border-[#38BDF8]/45 bg-[#38BDF8]/12 hover:bg-[#38BDF8]/20 shadow-[0_0_20px_rgba(56,189,248,0.28)] shrink-0 group flex items-center gap-2 cursor-pointer transition-all active:scale-95"
      >
        {/* Mini Animated Orbital Halo Icon */}
        <span className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <span className="absolute inset-0 rounded-full border border-dashed border-[#38BDF8]/70 animate-[spin_9s_linear_infinite]" />
          <span className="absolute inset-[3px] rounded-full border border-[#60A5FA]/50 -rotate-45" />
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
        </span>

        <span className="font-mono text-[10px] uppercase tracking-wider text-[#60A5FA] hidden sm:inline">
          {activeNode.code}
        </span>
        <span className="text-[#38BDF8]/40 hidden sm:inline">·</span>
        <span className="font-bold text-[#38BDF8] tracking-wide">
          {t(activeNode.labelKey as any)}
        </span>

        <span className="ms-1 px-1.5 py-0.5 rounded-full bg-[#38BDF8]/20 text-[9px] font-mono text-[#7DD3FC] border border-[#38BDF8]/30">
          ORBIT
        </span>
      </button>

      {/* FULL CONSTELLATION HALO RING OVERLAY (EXACT REPLICA OF IMAGE 2) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Deep Space Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-[#04060C]/85 backdrop-blur-2xl"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.14) 0%, rgba(14, 28, 54, 0.35) 38%, rgba(4, 6, 12, 0.95) 80%)',
              }}
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 3 }}
              transition={{
                type: 'spring',
                damping: 24,
                stiffness: 260,
              }}
              className="relative z-10 w-full max-w-[680px] flex flex-col items-center select-none my-auto"
            >
              {/* Top Telemetry Header Bar */}
              <div className="w-full flex items-center justify-between px-4 py-2.5 mb-2 rounded-full bg-black/50 border border-[#38BDF8]/25 backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-[#38BDF8] animate-pulse" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#38BDF8] font-bold">
                    NASA EOSDIS · CONSTELLATION FLIGHT RING
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#60A5FA] hidden sm:inline">
                    7 SATELLITE STATIONS ONLINE
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="h-7 w-7 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[#38BDF8] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-[#38BDF8]" />
                  </button>
                </div>
              </div>

              {/* DESKTOP / TABLET: 360° RADIAL ORBITAL HALO (EXACTLY AS IN IMAGE 2) */}
              <div className="hidden sm:flex relative w-[560px] h-[560px] items-center justify-center">
                {/* SVG Concentric Orbital Rings & Laser Lock Lines */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="-280 -280 560 560"
                >
                  <defs>
                    <radialGradient id="earthGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                      <stop offset="60%" stopColor="#2563EB" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Ambient Earth Halo */}
                  <circle cx="0" cy="0" r="245" fill="url(#earthGlow)" />

                  {/* Outer Degree Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="252"
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.14)"
                    strokeWidth="1"
                    strokeDasharray="2 8"
                  />

                  {/* Main Satellite Orbit Path (r = 215) */}
                  <circle
                    cx="0"
                    cy="0"
                    r={radius}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.32)"
                    strokeWidth="1.25"
                    strokeDasharray="6 6"
                  />

                  {/* Inner Low-Earth Orbit Ring */}
                  <circle
                    cx="0"
                    cy="0"
                    r="132"
                    fill="none"
                    stroke="rgba(96, 165, 250, 0.18)"
                    strokeWidth="1"
                  />

                  {/* Laser Telemetry Vectors from Center Earth to Each Satellite */}
                  {nodes.map((node, idx) => {
                    const rad = (node.angleDeg * Math.PI) / 180;
                    const x = Math.cos(rad) * radius;
                    const y = Math.sin(rad) * radius;
                    const isFocused =
                      hoveredIndex !== null
                        ? hoveredIndex === idx
                        : currentActiveIndex === idx;

                    return (
                      <g key={node.code}>
                        <line
                          x1="0"
                          y1="0"
                          x2={x}
                          y2={y}
                          stroke={
                            isFocused
                              ? '#38BDF8'
                              : 'rgba(56, 189, 248, 0.12)'
                          }
                          strokeWidth={isFocused ? '2' : '1'}
                          strokeDasharray={isFocused ? 'none' : '3 5'}
                        />
                        {isFocused && (
                          <circle
                            cx={x * 0.55}
                            cy={y * 0.55}
                            r="3"
                            fill="#38BDF8"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* CENTER PLANETARY EARTH CORE & LIVE TELEMETRY HUD (MATCHES IMAGE 2) */}
                <motion.div
                  key={focusedNode.code}
                  initial={{ scale: 0.96, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'relative z-20 w-44 h-44 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center text-center p-4 bg-[#070D1B]/90 border border-[#38BDF8]/50 shadow-[0_0_50px_rgba(56,189,248,0.28)]',
                    LIQUID_GLASS_SHADOW
                  )}
                >
                  {/* Subtle Earth Blue Marble Texture inside Center Core */}
                  <img
                    src="/earth-blue-marble.jpg"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full rounded-full object-cover opacity-35 pointer-events-none"
                  />
                  {/* Rotating Orbital Ring around Earth Core */}
                  <div className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-[#38BDF8]/40 animate-[spin_24s_linear_infinite]" />

                  <div className="relative z-10 flex flex-col items-center">
                    <span className="px-2 py-0.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[9px] font-mono uppercase tracking-widest text-[#38BDF8] mb-1">
                      {focusedNode.code} · {focusedNode.orbit}
                    </span>

                    <h4 className="text-sm sm:text-base font-bold text-[#38BDF8] tracking-tight drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]">
                      {t(focusedNode.labelKey as any)}
                    </h4>

                    <div className="text-[10px] font-mono text-[#60A5FA] mt-0.5">
                      {focusedNode.satellite}
                    </div>

                    <p className="text-[10px] sm:text-[11px] text-[#93C5FD]/90 leading-snug mt-2 line-clamp-2 max-w-[180px]">
                      {isAr ? focusedNode.descAr : focusedNode.descEn}
                    </p>

                    <div className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-mono text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{focusedNode.frequency}</span>
                    </div>
                  </div>
                </motion.div>

                {/* 7 SATELLITE NODES POSITIONED ON THE 360° ORBIT RING */}
                {nodes.map((node, idx) => {
                  const Icon = node.icon;
                  const isActive = idx === currentActiveIndex;
                  const isHovered = idx === hoveredIndex;
                  const rad = (node.angleDeg * Math.PI) / 180;
                  const xPct = Math.cos(rad) * 38.5; // % of container width
                  const yPct = Math.sin(rad) * 38.5;

                  return (
                    <motion.button
                      key={node.to}
                      type="button"
                      initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-50%' }}
                      animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                      transition={{
                        delay: idx * 0.04,
                        type: 'spring',
                        stiffness: 300,
                        damping: 22,
                      }}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => handleSelectNode(node.to)}
                      style={{
                        left: `${50 + xPct}%`,
                        top: `${50 + yPct}%`,
                      }}
                      className={cn(
                        'absolute z-30 group focus:outline-none cursor-pointer'
                      )}
                    >
                      <div
                        className={cn(
                          'px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all duration-300 flex items-center gap-2.5 backdrop-blur-2xl border',
                          LIQUID_GLASS_SHADOW,
                          isActive
                            ? 'bg-[#38BDF8]/25 border-[#38BDF8] text-[#38BDF8] scale-110 shadow-[0_0_28px_rgba(56,189,248,0.55)]'
                            : isHovered
                              ? 'bg-[#38BDF8]/18 border-[#38BDF8]/70 text-[#38BDF8] scale-105 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                              : 'bg-[#070C18]/90 border-[#38BDF8]/30 text-[#93C5FD] hover:text-[#38BDF8]'
                        )}
                      >
                        {/* Satellite Node Orb */}
                        <span
                          className={cn(
                            'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors border',
                            isActive || isHovered
                              ? 'bg-[#38BDF8]/25 border-[#38BDF8] text-[#38BDF8]'
                              : 'bg-[#38BDF8]/10 border-[#38BDF8]/25 text-[#60A5FA]'
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </span>

                        <div className="text-start pe-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono uppercase tracking-wider text-[#60A5FA]">
                              {node.code}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                            )}
                          </div>
                          <div className="text-[11px] sm:text-xs font-bold text-[#38BDF8] whitespace-nowrap leading-tight">
                            {t(node.labelKey as any)}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* MOBILE: FLIGHT CARDS MISSION DECK (SCREENS < SM) */}
              <div className="sm:hidden w-full space-y-2 max-h-[75vh] overflow-y-auto px-1 py-1">
                {/* Active HUD Telemetry Card */}
                <div className="p-3.5 rounded-xl bg-[#070D1B] border border-sky-500/40 text-start space-y-1 mb-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] font-mono text-sky-400">
                    <span>CURRENT TELEMETRY LOCK</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {activeNode.frequency}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {t(activeNode.labelKey as any)} · {activeNode.satellite}
                  </h4>
                  <p className="text-xs text-zinc-400 leading-snug">
                    {isAr ? activeNode.descAr : activeNode.descEn}
                  </p>
                </div>

                {/* 7 Interactive Mission Cards */}
                <div className="space-y-1.5">
                  {nodes.map((node, idx) => {
                    const Icon = node.icon;
                    const isActive = idx === currentActiveIndex;

                    return (
                      <button
                        key={node.to}
                        type="button"
                        onClick={() => handleSelectNode(node.to)}
                        className={cn(
                          'w-full p-2.5 rounded-xl text-start transition-all flex items-center justify-between gap-3 border active:scale-[0.98] cursor-pointer',
                          isActive
                            ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.25)]'
                            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
                              isActive
                                ? 'bg-sky-500/30 border-sky-400 text-sky-300'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-sky-400 font-bold">
                                {node.code}
                              </span>
                              <span className="text-xs font-semibold text-white truncate">
                                {t(node.labelKey as any)}
                              </span>
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 truncate">
                              {node.satellite} · {node.orbit}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0 rtl:rotate-180" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Telemetry Footer (MATCHES IMAGE 2) */}
              <div className="mt-2 px-5 py-2 rounded-full bg-black/50 border border-[#38BDF8]/20 text-[11px] font-mono text-[#93C5FD]/80 flex items-center gap-3">
                <Satellite className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>
                  {isAr
                    ? 'قف على أي قمر صناعي لمعاينة المدار أو اضغط للانتقال الفوري'
                    : 'Hover any satellite station to lock telemetry · Click to enter orbit'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
