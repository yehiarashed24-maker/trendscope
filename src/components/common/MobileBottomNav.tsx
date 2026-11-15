import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe2,
  TrendingUp,
  FlaskConical,
  Bot,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../utils/cn';

interface MobileNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { savedInvestigations } = useAppStore();

  const navItems: MobileNavItem[] = [
    {
      to: '/explorer',
      label: t('nav.explorer') || 'Explorer',
      icon: Globe2,
    },
    {
      to: '/analysis',
      label: t('nav.analysis') || 'Analysis',
      icon: TrendingUp,
    },
    {
      to: '/intelligence',
      label: t('nav.intelligence') || 'Intel',
      icon: FlaskConical,
    },
    {
      to: '/workspace',
      label: t('nav.workspace') || 'Scientist',
      icon: Bot,
      badge: savedInvestigations.length > 0 ? savedInvestigations.length : undefined,
    },
    {
      to: '/reports',
      label: t('nav.reports') || 'Reports',
      icon: FileText,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#08080A]/95 backdrop-blur-2xl border-t border-zinc-800/90 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom,8px))]"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={cn(
                'group relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 active:scale-90 cursor-pointer focus:outline-none',
                isActive
                  ? 'text-sky-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {/* Icon container with active glow/indicator */}
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    isActive ? 'scale-110 text-sky-400' : 'text-zinc-400 group-hover:text-zinc-200'
                  )}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -end-2 min-w-[15px] h-[15px] px-1 rounded-full bg-sky-500 text-slate-950 font-mono text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Text Label */}
              <span
                className={cn(
                  'text-[10px] mt-1 tracking-tight truncate max-w-[62px]',
                  isActive ? 'text-sky-400 font-medium' : 'text-zinc-500 font-normal'
                )}
              >
                {item.label}
              </span>

              {/* Active Pip Indicator */}
              {isActive && (
                <span className="absolute -bottom-1 w-3 h-0.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38BDF8]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

