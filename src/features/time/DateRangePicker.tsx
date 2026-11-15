import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock } from 'lucide-react';
import { TimeRange, TemporalAggregation } from '../../types/scientific';
import { cn } from '../../utils/cn';

interface DateRangePickerProps {
  timeRange: TimeRange;
  onChange: (range: TimeRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ timeRange, onChange }) => {
  const { t } = useTranslation();

  const aggregations: Array<{ id: TemporalAggregation; label: string }> = [
    { id: 'monthly', label: t('explorer.timePanel.monthly') },
    { id: 'seasonal', label: t('explorer.timePanel.seasonal') },
    { id: 'annual', label: t('explorer.timePanel.annual') },
    { id: 'daily', label: t('explorer.timePanel.daily') },
  ];

  const presets = [
    { label: '2000 – 2025 (Full NASA Baseline)', start: '2000-01-01', end: '2025-01-01' },
    { label: '2015 – 2025 (Recent Decade)', start: '2015-01-01', end: '2025-01-01' },
    { label: '2020 – 2025 (5-Year Rapid)', start: '2020-01-01', end: '2025-01-01' },
  ];

  return (
    <div className="space-y-3">
      {/* Date input controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
            {t('explorer.timePanel.startDate')}
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={timeRange.startDate}
              min="1980-01-01"
              max="2026-12-31"
              onChange={(e) => onChange({ ...timeRange, startDate: e.target.value })}
              className="w-full h-8 ps-8 pe-2 rounded bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 focus:border-satellite-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
            {t('explorer.timePanel.endDate')}
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={timeRange.endDate}
              min="1980-01-01"
              max="2026-12-31"
              onChange={(e) => onChange({ ...timeRange, endDate: e.target.value })}
              className="w-full h-8 ps-8 pe-2 rounded bg-obsidian-950 border border-slate-800 text-xs font-mono text-slate-200 focus:border-satellite-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Temporal Aggregation */}
      <div>
        <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">
          {t('explorer.timePanel.aggregation')}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {aggregations.map((agg) => (
            <button
              key={agg.id}
              type="button"
              onClick={() => onChange({ ...timeRange, aggregation: agg.id })}
              className={cn(
                'px-2 py-1.5 rounded text-xs font-mono border transition-colors',
                timeRange.aggregation === agg.id
                  ? 'bg-satellite-600 border-satellite-500 text-white font-semibold'
                  : 'bg-obsidian-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              )}
            >
              {agg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="text-[10px] font-mono text-slate-500 uppercase mb-1.5">
          Standard Climatology Windows
        </div>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onChange({ ...timeRange, startDate: p.start, endDate: p.end })}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

