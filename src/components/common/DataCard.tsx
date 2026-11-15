import React from 'react';
import { cn } from '../../utils/cn';

interface DataCardProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  badge,
  headerAction,
  children,
  className,
  footer,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl bg-[#11141c] border border-[#eef0f5]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col',
        className
      )}
    >
      {(title || badge || headerAction) && (
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-[#eef0f5]/[0.07]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-3 flex-wrap">
              {title && (
                <h3 className="text-[15px] leading-5 font-medium text-[#eef0f5] font-sans">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-[13px] leading-5 text-[#7a8296] font-sans">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6 flex-1">{children}</div>
      {footer && (
        <div className="px-5 sm:px-6 py-3 border-t border-[#eef0f5]/[0.07] bg-[#07080d]/50 text-xs text-[#7a8296] font-mono tabular-nums">
          {footer}
        </div>
      )}
    </div>
  );
};
