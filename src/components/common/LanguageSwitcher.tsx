import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, applyDocumentDirection } from '../../i18n';
import { SupportedLanguage } from '../../types/scientific';
import { cn } from '../../utils/cn';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language?.split('-')[0] || 'en') as SupportedLanguage;
  const activeConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
    applyDocumentDirection(code);
    try {
      localStorage.setItem('earthpulse_language', code);
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={cn(
          'rounded-lg text-zinc-300 text-xs font-medium border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2 cursor-pointer',
          compact ? 'h-8 px-2.5 sm:px-3' : 'h-9 px-3.5'
        )}
      >
        <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span>{activeConfig.nativeLabel}</span>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-zinc-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-48 z-50 bg-[#0D1322] border border-zinc-800 rounded-xl shadow-2xl p-1.5 space-y-0.5"
        >
          <div className="px-3 py-1.5 border-b border-zinc-800/80 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            Select Language
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang;
            return (
              <button
                key={lang.code}
                role="menuitem"
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-start cursor-pointer',
                  isSelected
                    ? 'bg-sky-500/10 text-sky-400 font-medium'
                    : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                )}
              >
                <div className="flex flex-col">
                  <span>{lang.nativeLabel}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {lang.name} ({lang.code.toUpperCase()})
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
