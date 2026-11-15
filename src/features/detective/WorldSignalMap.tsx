import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Globe2,
  Map as MapIcon,
  X,
} from 'lucide-react';
import {
  GLOBAL_TREND_SIGNALS,
  GlobalTrendSignal,
  DETECTIVE_UI_LABELS,
} from './trendSignalsData';
import { MapContainer } from '../maps/MapContainer';
import { useAppStore } from '../../store/useAppStore';
import { ENVIRONMENTAL_VARIABLES } from '../../services/nasa/constants';
import { SupportedLanguage } from '../../types/scientific';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';

import { cn } from '../../utils/cn';

interface WorldSignalMapProps {
  onSelectSignal?: (signal: GlobalTrendSignal) => void;
  highlightTour?: boolean;
}

export const WorldSignalMap: React.FC<WorldSignalMapProps> = ({
  onSelectSignal,
  highlightTour = false,
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const labels = DETECTIVE_UI_LABELS[lang] || DETECTIVE_UI_LABELS.en;

  const {
    activeConfig,
    currentRegion,
    setVariable,
    setRegion,
    setDataset,
    geoAdapterResult,
    saveCurrentInvestigation,
  } = useAppStore();

  const [selectedSignal, setSelectedSignal] =
    useState<GlobalTrendSignal | null>(null);
  const [mapMode, setMapMode] = useState<'signals' | 'gis'>('gis');

  const activeVarObj =
    ENVIRONMENTAL_VARIABLES.find((v) => v.id === activeConfig.variableId) ||
    ENVIRONMENTAL_VARIABLES[0];

  const handleSignalClick = (sig: GlobalTrendSignal) => {
    setSelectedSignal(sig);
    setVariable(sig.variableId);
    setRegion(sig.regionId);
    setDataset(sig.datasetId);
    if (onSelectSignal) onSelectSignal(sig);
  };

  const handleInvestigateSignal = (sig: GlobalTrendSignal) => {
    setVariable(sig.variableId);
    setRegion(sig.regionId);
    setDataset(sig.datasetId);
    saveCurrentInvestigation();
    navigate('/analysis');
  };

  const longitudes = [
    '150°W',
    '120°W',
    '90°W',
    '60°W',
    '30°W',
    '0°',
    '30°E',
    '60°E',
    '90°E',
    '120°E',
    '150°E',
  ];

  const latitudes = [
    { label: '60°N', top: '18%' },
    { label: '30°N', top: '36%' },
    { label: '0°', top: '54%' },
    { label: '30°S', top: '72%' },
  ];

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-[#070709] transition-all duration-300 select-none',
        highlightTour && 'ring-2 ring-white/40'
      )}
      style={{ minHeight: '540px', height: 'calc(100vh - 230px)' }}
    >
      {mapMode === 'gis' ? (
        <div className="absolute inset-0">
          <MapContainer
            region={currentRegion}
            variableId={activeConfig.variableId}
            unit={activeVarObj.unit}
            customGeoJson={geoAdapterResult.featureCollection}
            height="100%"
            showLayerSelect={true}
            onLayerChange={(v) => setVariable(v)}
          />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-[#070709]">
          {/* Local High-Res NASA Blue Marble Satellite Layer */}
          <img
            src="/earth-blue-marble.jpg"
            alt="NASA Earth Satellite Map"
            className="absolute inset-0 w-full h-full object-cover object-[center_40%] pointer-events-none"
            style={{
              filter: 'brightness(0.82) contrast(1.1) saturate(0.82)',
            }}
          />

          {/* Crisp Country Boundaries Overlay */}
          <img
            src="/world-borders.svg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-[center_40%] opacity-75 pointer-events-none"
          />

          {/* Subtle Obsidian Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, transparent 58%, rgba(7, 7, 9, 0.65) 100%)',
            }}
          />

          {/* Dashed Graticule Latitude Lines */}
          {latitudes.map((lat) => (
            <div
              key={lat.label}
              className="absolute inset-x-0 border-t border-dashed border-white/[0.12] pointer-events-none flex items-center"
              style={{ top: lat.top }}
            >
              <span className="ms-3 -mt-5 text-[10px] font-mono text-zinc-400/80">
                {lat.label}
              </span>
            </div>
          ))}

          {/* Dashed Graticule Longitude Lines */}
          <div className="absolute inset-0 grid grid-cols-11 pointer-events-none">
            {longitudes.map((lng) => (
              <div
                key={lng}
                className="h-full border-r border-dashed border-white/[0.1] relative flex items-end justify-center pb-2.5"
              >
                <span className="text-[10px] font-mono text-zinc-400/80">
                  {lng}
                </span>
              </div>
            ))}
          </div>

          {/* Interactive Global NASA Trend Signal Pills — Liquid Glass Capsules */}
          <div className="absolute inset-0 z-10">
            {GLOBAL_TREND_SIGNALS.map((sig, index) => {
              const isInc = sig.direction === 'increasing';
              const isSelected = selectedSignal?.id === sig.id;

              const dotElement = (
                <span
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                    isInc
                      ? 'bg-[#F06449] shadow-[0_0_12px_2px_rgba(240,100,73,0.65)]'
                      : 'bg-[#38BDF8] shadow-[0_0_12px_2px_rgba(56,189,248,0.65)]'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
              );

              return (
                <motion.div
                  key={sig.id}
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: index * 0.04,
                    duration: 0.32,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    left: `${sig.xPercent}%`,
                    top: `${sig.yPercent}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleSignalClick(sig)}
                    className="group flex items-center gap-2 focus:outline-none"
                  >
                    {sig.dotPosition === 'left' && dotElement}

                    <div
                      className={cn(
                        'px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium whitespace-nowrap border cursor-pointer',
                        isSelected
                          ? 'bg-zinc-900 text-white border-sky-500 shadow-md ring-1 ring-sky-500/30'
                          : 'bg-zinc-950/85 hover:bg-zinc-900 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700 backdrop-blur-sm'
                      )}
                    >
                      {isInc ? (
                        <ArrowUp className="w-3 h-3 text-[#F06449] transition-colors" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[#38BDF8] transition-colors" />
                      )}
                      <span>{sig.label[lang]}</span>
                    </div>

                    {sig.dotPosition === 'right' && dotElement}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>

          {/* Selected Signal Interactive Evidence Drawer (Mobile Bottom Sheet / Desktop Floating Card) */}
          <AnimatePresence>
            {selectedSignal && (
              <motion.div
                key={selectedSignal.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-2 bottom-18 sm:bottom-auto sm:inset-auto sm:top-4 sm:end-4 z-30 sm:w-[360px] text-start bg-[#0B0F17]/95 backdrop-blur-md border border-zinc-800 rounded-2xl sm:rounded-xl shadow-2xl p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          selectedSignal.direction === 'increasing'
                            ? 'bg-[#F06449]'
                            : 'bg-[#38BDF8]'
                        )}
                      />
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        {selectedSignal.satellite}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-semibold text-white">
                      {selectedSignal.label[lang]}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSignal(null)}
                    className="w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed mb-3 sm:mb-4 line-clamp-2 sm:line-clamp-none">
                  {selectedSignal.summary[lang]}
                </p>

                {/* Mini Sparkline & Telemetry Readout */}
                <div className="p-3 sm:p-3.5 rounded-lg bg-zinc-900/80 border border-zinc-800 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span
                      className={cn(
                        'font-bold text-sm',
                        selectedSignal.direction === 'increasing'
                          ? 'text-[#F06449]'
                          : 'text-[#38BDF8]'
                      )}
                    >
                      {selectedSignal.rateText}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
                      Mann-Kendall {selectedSignal.pValue}
                    </span>
                  </div>

                  <svg
                    className="w-full h-11 overflow-visible"
                    viewBox="0 0 200 44"
                  >
                    <motion.polyline
                      fill="none"
                      stroke={
                        selectedSignal.direction === 'increasing'
                          ? '#F06449'
                          : '#38BDF8'
                      }
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0.3 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      points={selectedSignal.sparkline
                        .map((val, idx) => {
                          const min = Math.min(...selectedSignal.sparkline);
                          const max = Math.max(...selectedSignal.sparkline);
                          const x =
                            (idx / (selectedSignal.sparkline.length - 1)) *
                              196 +
                            2;
                          const y =
                            38 - ((val - min) / (max - min || 1)) * 32;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                    <span>2000</span>
                    <span>NASA 25-YEAR SERIES</span>
                    <span>2024</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <DemoDataBadge status="VERIFIED" size="sm" />
                  <button
                    type="button"
                    onClick={() => handleInvestigateSignal(selectedSignal)}
                    className="h-8 px-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                  >
                    <span>{labels.investigateSignal}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom-Left Legend Card (Positioned Above Mobile Bottom Bar) */}
          <div className="absolute bottom-16 sm:bottom-6 start-2 sm:start-5 z-20 w-[210px] sm:w-[280px] text-start bg-[#0B0F17]/90 backdrop-blur-md border border-zinc-800 rounded-xl shadow-xl p-2.5 sm:p-3.5">
            <div className="text-[11px] sm:text-xs font-semibold text-zinc-100 mb-1.5 sm:mb-2">
              {labels.legendTitle}
            </div>

            <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-zinc-300 mb-1.5 sm:mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#F06449] shrink-0" />
                <ArrowUp className="w-3 h-3 text-[#F06449]" />
                <span>{labels.increasing}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#38BDF8] shrink-0" />
                <ArrowDown className="w-3 h-3 text-[#38BDF8]" />
                <span>{labels.decreasing}</span>
              </div>
            </div>

            <p className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight sm:leading-relaxed hidden sm:block">
              {labels.legendFootnote}
            </p>
          </div>
        </div>
      )}

      {/* Bottom-Right Map View Switcher (Positioned Above Mobile Bottom Bar) */}
      <div className="absolute bottom-16 sm:bottom-6 end-2 sm:end-5 z-20 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg p-1 flex items-center gap-1 shadow-lg">
        <button
          type="button"
          onClick={() => setMapMode('signals')}
          className={cn(
            'h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95',
            mapMode === 'signals'
              ? 'bg-zinc-800 text-white shadow-xs'
              : 'text-zinc-400 hover:text-white'
          )}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span className="text-[11px] sm:text-xs">{labels.viewModeSignals}</span>
        </button>

        <button
          type="button"
          onClick={() => setMapMode('gis')}
          className={cn(
            'h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95',
            mapMode === 'gis'
              ? 'bg-zinc-800 text-white shadow-xs'
              : 'text-zinc-400 hover:text-white'
          )}
        >
          <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] sm:text-xs">{labels.viewModeGis}</span>
        </button>
      </div>
    </div>
  );
};
