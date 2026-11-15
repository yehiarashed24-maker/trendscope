import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe2,
  TrendingUp,
  FlaskConical,
  Bot,
  FileText,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface DockNavItem {
  id: string;
  to: string;
  exact?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  defaultLabel: string;
}

export const FeaturesBottomDock: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const items: DockNavItem[] = [
    {
      id: 'explorer',
      to: '/explorer',
      icon: Globe2,
      labelKey: 'nav.explorer',
      defaultLabel: 'Earth Explorer',
    },
    {
      id: 'analysis',
      to: '/analysis',
      icon: TrendingUp,
      labelKey: 'nav.analysis',
      defaultLabel: 'Trend Analysis',
    },
    {
      id: 'intelligence',
      to: '/intelligence',
      icon: FlaskConical,
      labelKey: 'nav.intelligence',
      defaultLabel: 'Intelligence Lab',
    },
    {
      id: 'workspace',
      to: '/workspace',
      icon: Bot,
      labelKey: 'nav.workspace',
      defaultLabel: 'AI Scientist',
    },
    {
      id: 'reports',
      to: '/reports',
      icon: FileText,
      labelKey: 'nav.reports',
      defaultLabel: 'Reports',
    },
  ];

  return (
    <nav
      aria-label="Features navigation dock"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none"
    >
      <div className="relative pointer-events-auto">
        {/* Main Dock Container */}
        <div
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5',
            'rounded-2xl',
            'bg-[#08080A]/85 backdrop-blur-xl',
            'border border-sky-500/25',
            'shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_24px_rgba(56,189,248,0.18)]',
            'transition-all duration-300 ease-out'
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            const isHovered = hoveredId === item.id;
            const label = t(item.labelKey) || item.defaultLabel;

            return (
              <div
                key={item.id}
                className="relative group"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={cn(
                    'relative flex items-center justify-center',
                    'w-10 h-10 sm:w-11 sm:h-11 rounded-xl',
                    'transition-all duration-300 ease-out cursor-pointer',
                    isActive
                      ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.4)]'
                      : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20',
                    'border',
                    isHovered && '-translate-y-1.5 scale-110 shadow-lg',
                    isHovered && isActive && 'shadow-[0_0_24px_rgba(56,189,248,0.6)]',
                    isHovered && !isActive && 'shadow-[0_4px_20px_rgba(255,255,255,0.12)]'
                  )}
                  title={label}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300',
                      isHovered && 'scale-110',
                      isActive && 'text-sky-300'
                    )}
                  />

                  {/* Active Indicator Pip */}
                  {isActive && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]" />
                  )}
                </button>

                {/* Floating Tooltip */}
                <div
                  className={cn(
                    'absolute -top-10 left-1/2 -translate-x-1/2',
                    'px-2.5 py-1 rounded-md',
                    'bg-[#0a0a0e]/95 backdrop-blur-md',
                    'text-zinc-200 text-xs font-sans font-medium tracking-normal',
                    'border border-sky-500/30',
                    'shadow-[0_4px_16px_rgba(0,0,0,0.6)]',
                    'transition-all duration-200 pointer-events-none whitespace-nowrap',
                    isHovered
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-1'
                  )}
                >
                  <span>{label}</span>
                  {/* Arrow pip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="w-2 h-2 bg-[#0a0a0e]/95 rotate-45 border-r border-b border-sky-500/30" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtle Bottom Reflection Effect */}
        <div className="absolute top-full left-0 right-0 h-4 overflow-hidden pointer-events-none opacity-25">
          <div className="w-full h-full bg-gradient-to-b from-sky-500/20 to-transparent blur-sm" />
        </div>
      </div>
    </nav>
  );
};

