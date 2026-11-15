import React from 'react';
import { useTranslation } from 'react-i18next';
import { VariableId, LstMode } from '../../types/scientific';
import { cn } from '../../utils/cn';

interface MapLegendProps {
  variableId: VariableId;
  lstMode?: LstMode;
  unit: string;
  className?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  variableId,
  lstMode = 'day',
  unit,
  className,
}) => {
  const { t } = useTranslation();

  const lstConfig =
    lstMode === 'both'
      ? {
          title: `${t('variables.lst.name')} (Δ Day–Night)`,
          resolution: 'Source: NASA Terra MODIS (MOD11C3.061) • Diurnal Spread',
          gradient: 'from-sky-400 via-amber-400 to-orange-600',
          low: '4°C',
          mid: '14°C',
          high: '24°C',
        }
      : lstMode === 'night'
      ? {
          title: `${t('variables.lst.name')} (${t('lstModes.night')})`,
          resolution: 'Source: NASA Terra MODIS (MOD11C3.061) • 0.05° Night',
          gradient: 'from-sky-500 via-amber-400 to-red-700',
          low: '6°C',
          mid: '18°C',
          high: '30°C',
        }
      : {
          title: `${t('variables.lst.name')} (${t('lstModes.day')})`,
          resolution: 'Source: NASA Terra MODIS (MOD11C3.061) • 0.05° Day',
          gradient: 'from-sky-400 via-yellow-400 via-orange-600 to-red-800',
          low: '12°C',
          mid: '31°C',
          high: '50°C',
        };

  const scales: Record<
    VariableId,
    { title: string; resolution: string; gradient: string; low: string; mid: string; high: string }
  > = {
    ndvi: {
      title: t('variables.ndvi.name'),
      resolution: 'Source: NASA Terra MODIS (MOD13Q1.061) • 250 m',
      gradient: 'from-amber-200 via-lime-500 to-emerald-700',
      low: '0.05',
      mid: '0.45',
      high: '0.85',
    },
    lst: lstConfig,
  };

  const current = scales[variableId] || scales.ndvi;

  return (
    <div
      className={cn(
        'p-3.5 rounded-xl bg-[#11141c]/95 border border-[#eef0f5]/[0.1] backdrop-blur-md text-xs font-mono tabular-nums select-none shadow-[0_12px_32px_rgba(0,0,0,0.55)]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs text-[#eef0f5] font-sans font-medium mb-1">
        <span className="truncate">{current.title}</span>
        <span className="text-[#7a8296] font-mono shrink-0">[{unit}]</span>
      </div>

      <div className="text-xs text-[#7a8296] mb-2">{current.resolution}</div>

      <div className={cn('h-2 w-full rounded-sm bg-gradient-to-r mb-1.5', current.gradient)} />

      <div className="flex justify-between text-xs text-[#a3a9b8] font-mono tabular-nums">
        <span>{current.low}</span>
        <span>{current.mid}</span>
        <span>{current.high}</span>
      </div>
    </div>
  );
};
