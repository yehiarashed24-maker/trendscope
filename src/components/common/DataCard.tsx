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
        'rounded-xl bg-[#0B0F17] border border-zinc-800/80 overflow-hidden flex flex-col',
        className
      )}
    >
      {(title || badge || headerAction) && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/40">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {title && (
                <h3 className="text-xs sm:text-sm font-semibold tracking-tight text-white font-sans">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-zinc-400 mt-0.5 font-sans leading-tight">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5 flex-1">{children}</div>
      {footer && (
        <div className="px-4 sm:px-5 py-2.5 border-t border-zinc-800/80 bg-black/20 text-[11px] text-zinc-400 font-mono">
          {footer}
        </div>
      )}
    </div>
  );
};
