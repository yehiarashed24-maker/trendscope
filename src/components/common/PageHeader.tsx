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
    <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#eef0f5]/[0.08] gap-4 mb-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[28px] sm:text-[32px] leading-[1.15] font-medium tracking-[-0.02em] text-[#eef0f5] font-sans">
            {title}
          </h1>
          {status && <DemoDataBadge status={status} size="sm" />}
          {extraBadge}
          {badgeText && (
            <span className="text-xs font-mono text-[#7a8296] bg-[#11141c] border border-[#eef0f5]/[0.08] px-2 py-0.5 rounded-md">
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[14px] leading-5 text-[#a3a9b8] max-w-3xl">
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
