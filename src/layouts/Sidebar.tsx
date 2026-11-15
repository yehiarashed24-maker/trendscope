import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe2,
  TrendingUp,
  FlaskConical,
  Bot,
  FileText,
  Satellite,
  Compass,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/explorer', label: t('nav.explorer'), icon: Globe2 },
    { to: '/analysis', label: t('nav.analysis'), icon: TrendingUp },
    { to: '/intelligence', label: t('nav.intelligence'), icon: FlaskConical },
    { to: '/workspace', label: t('nav.workspace'), icon: Bot },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 z-50 lg:z-20 w-64 bg-obsidian-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out',
          'rtl:border-r-0 rtl:border-l',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 rtl:translate-x-full rtl:lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-satellite-500/10 border border-satellite-500/30 flex items-center justify-center text-satellite-400">
              <Satellite className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider text-white font-mono block">
                {t('nav.brand')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight block">
                NASA SPACE APPS 2026
              </span>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Research Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded text-xs font-medium transition-colors font-sans',
                    isActive
                      ? 'bg-satellite-600/15 text-satellite-300 border border-satellite-500/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-200" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Direct Access
          </div>

          <NavLink
            to="/reports"
            onClick={() => onClose()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded text-xs transition-colors font-sans',
                isActive
                  ? 'bg-satellite-600/15 text-satellite-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              )
            }
          >
            <FileText className="w-4 h-4 shrink-0 text-slate-400" />
            <span className="truncate">{t('nav.reports')}</span>
          </NavLink>
        </nav>

        {/* Satellite Telemetry Footer Status */}
        <div className="p-3.5 border-t border-slate-800/80 bg-obsidian-950/70">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ORBITAL MESH
            </span>
            <span className="text-slate-500">DAAC V4.2</span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 truncate">
            MOD13Q1 • MOD11C3 • NASA
          </div>
        </div>
      </aside>
    </>
  );
};
