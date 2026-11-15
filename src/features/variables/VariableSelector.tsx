import React from 'react';
import { useTranslation } from 'react-i18next';
import { Thermometer, Leaf, Sun, Moon, SunMoon } from 'lucide-react';
import { VariableId, LstMode } from '../../types/scientific';
import { ENVIRONMENTAL_VARIABLES } from '../../services/nasa/constants';
import { cn } from '../../utils/cn';

interface VariableSelectorProps {
  selectedId: VariableId;
  onSelect: (id: VariableId) => void;
  lstMode?: LstMode;
  onSelectLstMode?: (mode: LstMode) => void;
  filterIds?: VariableId[];
  label?: string;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({
  selectedId,
  onSelect,
  lstMode = 'day',
  onSelectLstMode,
  filterIds,
  label,
}) => {
  const { t } = useTranslation();

  const variables = filterIds
    ? ENVIRONMENTAL_VARIABLES.filter((v) => filterIds.includes(v.id))
    : ENVIRONMENTAL_VARIABLES;

  const icons: Record<VariableId, any> = {
    lst: Thermometer,
    ndvi: Leaf,
  };

  const modeOptions: Array<{ id: LstMode; icon: any; labelKey: string }> = [
    { id: 'day', icon: Sun, labelKey: 'lstModes.day' },
    { id: 'night', icon: Moon, labelKey: 'lstModes.night' },
    { id: 'both', icon: SunMoon, labelKey: 'lstModes.both' },
  ];

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {variables.map((v) => {
          const isSelected = selectedId === v.id;
          const Icon = icons[v.id] || Leaf;
          const name = t(`variables.${v.id}.name` as any);
          const desc = t(`variables.${v.id}.desc` as any);

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v.id)}
              className={cn(
                'p-3 rounded border text-start transition-all flex flex-col justify-between group cursor-pointer',
                isSelected
                  ? 'border-satellite-500 bg-satellite-950/30 ring-1 ring-satellite-500/50'
                  : 'border-slate-800 bg-obsidian-900/60 hover:border-slate-700 hover:bg-obsidian-900'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2 w-full">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'p-1.5 rounded',
                      isSelected ? 'bg-satellite-500/20 text-satellite-400' : 'bg-slate-800 text-slate-400'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 font-sans group-hover:text-white">
                    {name}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {v.unit}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans mb-2">
                {desc}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-slate-400 pt-1.5 border-t border-slate-800/80 w-full">
                <span>Source: NASA Terra MODIS</span>
                <span>Product: {v.code} • {v.spatialResolution.split('(')[0].trim()}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedId === 'lst' && onSelectLstMode && (
        <div className="p-2.5 rounded border border-slate-800 bg-obsidian-900/70 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            {t('lstModes.label')}
          </span>
          <div className="inline-flex rounded-md bg-[#090D16] border border-slate-800 p-0.5 gap-0.5">
            {modeOptions.map((m) => {
              const MIcon = m.icon;
              const active = lstMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectLstMode(m.id)}
                  className={cn(
                    'px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer',
                    active
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  )}
                >
                  <MIcon className="w-3.5 h-3.5" />
                  <span>{t(m.labelKey as any)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

