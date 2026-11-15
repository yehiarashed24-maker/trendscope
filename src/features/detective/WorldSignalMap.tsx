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

          {/* Interactive Global NASA Trend Signal Pills */}
          <div className="absolute inset-0 z-10">
            {GLOBAL_TREND_SIGNALS.map((sig, index) => {
              const isInc = sig.direction === 'increasing';
              const isSelected = selectedSignal?.id === sig.id;

              const dotElement = (
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border border-[#0b0d14]',
                    isInc ? 'bg-[#e5484d]' : 'bg-[#38bdf8]'
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#eef0f5]" />
                </span>
              );

              return (
                <motion.div
                  key={sig.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.04,
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    left: `${sig.xPercent}%`,
                    top: `${sig.yPercent}%`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                >
                  <button
                    type="button"
                    onClick={() => handleSignalClick(sig)}
                    className="group flex items-center gap-2 focus:outline-none active:scale-[0.98] transition-transform duration-150"
                  >
                    {sig.dotPosition === 'left' && dotElement}

                    <div
                      className={cn(
                        'h-7 px-2.5 rounded-lg transition-colors duration-150 flex items-center gap-1.5 text-xs font-normal whitespace-nowrap border cursor-pointer',
                        isSelected
                          ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border-[#38bdf8]/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)]'
                          : 'bg-[#11141c]/90 hover:bg-[#1a1e28] text-[#a3a9b8] hover:text-[#eef0f5] border-[#eef0f5]/[0.1] backdrop-blur-sm'
                      )}
                    >
                      {isInc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#e5484d]" strokeWidth={1.5} />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
                      )}
                      <span>{sig.label[lang]}</span>
                    </div>

                    {sig.dotPosition === 'right' && dotElement}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Selected Signal Interactive Evidence Drawer (Mobile Bottom Sheet / Desktop Floating Card) */}
          <AnimatePresence>
            {selectedSignal && (
              <motion.div
                key={selectedSignal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-3 bottom-20 sm:bottom-auto sm:inset-auto sm:top-4 sm:end-4 z-30 sm:w-[360px] text-start bg-[#11141c]/95 backdrop-blur-md border border-[#eef0f5]/[0.1] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          selectedSignal.direction === 'increasing'
                            ? 'bg-[#e5484d]'
                            : 'bg-[#38bdf8]'
                        )}
                      />
                      <span className="text-xs font-mono text-[#7a8296]">
                        {selectedSignal.satellite}
                      </span>
                    </div>
                    <h4 className="text-[15px] font-medium text-[#eef0f5]">
                      {selectedSignal.label[lang]}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSignal(null)}
                    className="w-8 h-8 rounded-lg border border-[#eef0f5]/[0.08] bg-[#1a1e28] hover:bg-[#232836] text-[#7a8296] hover:text-[#eef0f5] flex items-center justify-center transition-colors duration-150 cursor-pointer"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>

                <p className="text-[13px] text-[#a3a9b8] leading-5 mb-4 line-clamp-2 sm:line-clamp-none">
                  {selectedSignal.summary[lang]}
                </p>

                {/* Mini Sparkline & Telemetry Readout */}
                <div className="p-3.5 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.08] mb-4">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-2">
                    <span className="font-medium text-sm text-[#eef0f5]">
                      {selectedSignal.rateText}
                    </span>
                    <span className="text-xs text-[#4cc38a]">
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
                          ? '#e5484d'
                          : '#38bdf8'
                      }
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0, opacity: 0.3 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
                  <div className="flex justify-between text-xs font-mono tabular-nums text-[#7a8296] mt-1">
                    <span>2000</span>
                    <span>25-year series</span>
                    <span>2024</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <DemoDataBadge status="VERIFIED" size="sm" />
                  <button
                    type="button"
                    onClick={() => handleInvestigateSignal(selectedSignal)}
                    className="h-9 px-4 rounded-lg bg-[#eef0f5] hover:bg-white text-[#0b0d14] font-medium text-xs flex items-center gap-2 transition-colors duration-150 cursor-pointer active:scale-[0.98]"
                  >
                    <span>{labels.investigateSignal}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.5} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom-Left Legend Card */}
          <div className="absolute bottom-16 sm:bottom-6 start-3 sm:start-5 z-20 w-[220px] sm:w-[280px] text-start bg-[#11141c]/95 backdrop-blur-md border border-[#eef0f5]/[0.1] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.55)] p-3.5">
            <div className="text-xs font-medium text-[#eef0f5] mb-2">
              {labels.legendTitle}
            </div>

            <div className="space-y-1.5 text-xs text-[#a3a9b8] mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e5484d] shrink-0" />
                <ArrowUp className="w-3.5 h-3.5 text-[#e5484d]" strokeWidth={1.5} />
                <span>{labels.increasing}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
                <ArrowDown className="w-3.5 h-3.5 text-[#38bdf8]" strokeWidth={1.5} />
                <span>{labels.decreasing}</span>
              </div>
            </div>

            <p className="text-xs text-[#7a8296] leading-4 hidden sm:block">
              {labels.legendFootnote}
            </p>
          </div>
        </div>
      )}

      {/* Bottom-Right Map View Switcher */}
      <div className="absolute bottom-16 sm:bottom-6 end-3 sm:end-5 z-20 bg-[#11141c]/95 backdrop-blur-md border border-[#eef0f5]/[0.1] rounded-xl p-1 flex items-center gap-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={() => setMapMode('signals')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-normal flex items-center gap-2 transition-colors duration-150 cursor-pointer active:scale-[0.98]',
            mapMode === 'signals'
              ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#eef0f5]/[0.1]'
              : 'text-[#7a8296] hover:text-[#eef0f5] border border-transparent'
          )}
        >
          <Globe2 className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
          <span>{labels.viewModeSignals}</span>
        </button>

        <button
          type="button"
          onClick={() => setMapMode('gis')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-normal flex items-center gap-2 transition-colors duration-150 cursor-pointer active:scale-[0.98]',
            mapMode === 'gis'
              ? 'bg-[#1a1e28] text-[#eef0f5] font-medium border border-[#eef0f5]/[0.1]'
              : 'text-[#7a8296] hover:text-[#eef0f5] border border-transparent'
          )}
        >
          <MapIcon className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />
          <span>{labels.viewModeGis}</span>
        </button>
      </div>
    </div>
  );
};
