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
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
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
        <div
          className={cn(
            'flex items-center gap-1 p-1.5',
            'rounded-2xl',
            'bg-[#11141c]/95 backdrop-blur-md',
            'border border-[#eef0f5]/[0.09]',
            'shadow-[0_12px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]'
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
                className="relative"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={cn(
                    'relative flex items-center justify-center gap-2',
                    'h-9 px-3 rounded-[10px]',
                    'text-xs font-sans transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer',
                    isActive
                      ? 'bg-[#1a1e28] border-[#eef0f5]/[0.12] text-[#eef0f5] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                      : 'bg-transparent border-transparent text-[#7a8296] hover:text-[#eef0f5] hover:bg-[#1a1e28]/60',
                    'border'
                  )}
                  title={label}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-150',
                      isActive ? 'text-[#38bdf8]' : 'text-[#7a8296]'
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="hidden sm:inline whitespace-nowrap">{label}</span>

                  {isActive && (
                    <span className="sm:hidden absolute bottom-1 w-1 h-1 rounded-full bg-[#38bdf8]" />
                  )}
                </button>

                {/* Mobile Tooltip */}
                <div
                  className={cn(
                    'sm:hidden absolute -top-9 left-1/2 -translate-x-1/2',
                    'px-2.5 py-1 rounded-md',
                    'bg-[#11141c] border border-[#eef0f5]/[0.1]',
                    'text-[#eef0f5] text-xs font-sans font-normal',
                    'shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
                    'transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none whitespace-nowrap',
                    isHovered
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-1'
                  )}
                >
                  <span>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

