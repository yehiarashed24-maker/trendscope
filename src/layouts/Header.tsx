import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Search, PlusCircle, Compass, Radio } from 'lucide-react';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { DemoDataBadge } from '../components/common/DemoDataBadge';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [utcTime, setUtcTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explorer?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-obsidian-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Real-time UTC Mission Clock */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-slate-300">{utcTime || 'UTC 00:00:00'}</span>
        </div>
      </div>

      {/* Global Quick Geospatial Search */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('explorer.geoPanel.searchPlaceholder')}
          className="w-full h-8 ps-8 pe-3 rounded bg-obsidian-950/80 border border-slate-800 focus:border-satellite-500 focus:outline-none text-xs text-slate-200 placeholder-slate-500 font-mono"
        />
      </form>

      {/* Action items: Badge, Language Switcher, New Investigation */}
      <div className="flex items-center gap-3">
        <DemoDataBadge status="VERIFIED" size="sm" className="hidden sm:inline-flex" />

        <LanguageSwitcher />

        <button
          type="button"
          onClick={() => navigate('/explorer')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-satellite-600 hover:bg-satellite-500 text-white text-xs font-medium font-sans shadow-sm transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('nav.startInvestigation')}</span>
        </button>
      </div>
    </header>
  );
};

