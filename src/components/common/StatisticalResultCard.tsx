import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatisticalResultCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  isSignificant?: boolean;
  statusBadge?: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'neutral';
}

export const StatisticalResultCard: React.FC<StatisticalResultCardProps> = ({
  label,
  value,
  unit,
  subtext,
  isSignificant,
  statusBadge,
  className,
  direction,
}) => {
  return (
    <div
      className={cn(
        'relative p-3.5 sm:p-4 rounded-xl bg-[#0B0F17] border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col justify-between',
        isSignificant && 'border-emerald-500/30 bg-[#0B0F17]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
        {statusBadge}
      </div>

      <div className="flex items-baseline gap-2 my-1">
        {direction === 'up' && (
          <span className="inline-flex items-center gap-1 text-[#F06449]">
            <ArrowUp className="w-3.5 h-3.5" />
          </span>
        )}
        {direction === 'down' && (
          <span className="inline-flex items-center gap-1 text-[#38BDF8]">
            <ArrowDown className="w-3.5 h-3.5" />
          </span>
        )}
        <span
          className={cn(
            'text-xl font-bold font-mono tracking-tight tabular-nums',
            direction === 'up' && 'text-[#F06449]',
            direction === 'down' && 'text-[#38BDF8]',
            !direction && 'text-white'
          )}
        >
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-zinc-400">{unit}</span>}
      </div>

      {subtext && (
        <span className="text-[11px] text-zinc-400 font-sans leading-tight mt-1">
          {subtext}
        </span>
      )}
    </div>
  );
};
