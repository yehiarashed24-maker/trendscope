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
        'relative p-5 rounded-xl bg-[#11141c] border border-[#eef0f5]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-2',
        isSignificant && 'border-[#4cc38a]/30',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#a3a9b8] font-normal font-sans">{label}</span>
        {statusBadge}
      </div>

      <div className="flex items-baseline gap-2 my-1">
        {direction === 'up' && (
          <span className="inline-flex items-center gap-1 text-[#4cc38a]">
            <ArrowUp className="w-4 h-4" strokeWidth={1.5} />
          </span>
        )}
        {direction === 'down' && (
          <span className="inline-flex items-center gap-1 text-[#e5484d]">
            <ArrowDown className="w-4 h-4" strokeWidth={1.5} />
          </span>
        )}
        <span className="text-[28px] leading-none font-medium font-mono tabular-nums text-[#eef0f5]">
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-[#7a8296] tabular-nums">{unit}</span>}
      </div>

      {subtext && (
        <span className="text-xs text-[#7a8296] font-sans leading-4 pt-2 border-t border-[#eef0f5]/[0.07]">
          {subtext}
        </span>
      )}
    </div>
  );
};
