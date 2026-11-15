import React from 'react';
import { DemoDataBadge } from './DemoDataBadge';
import { DataIntegrityStatus } from '../../types/scientific';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  status?: DataIntegrityStatus;
  badgeText?: string;
  extraBadge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  status = 'VERIFIED',
  badgeText,
  extraBadge,
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-zinc-800/80 gap-4 mb-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            {title}
          </h1>
          {status && <DemoDataBadge status={status} size="sm" />}
          {extraBadge}
          {badgeText && (
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
};
