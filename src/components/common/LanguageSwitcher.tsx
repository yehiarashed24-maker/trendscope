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
          'rounded-lg text-[#a3a9b8] text-xs font-normal border border-[#eef0f5]/[0.08] bg-[#11141c] hover:bg-[#1a1e28] hover:text-[#eef0f5] transition-colors duration-150 flex items-center gap-2 cursor-pointer',
          compact ? 'h-8 px-3' : 'h-9 px-3.5'
        )}
      >
        <Globe className="w-4 h-4 text-[#7a8296] shrink-0" strokeWidth={1.5} />
        <span>{activeConfig.nativeLabel}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#7a8296] transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
          strokeWidth={1.5}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-48 z-50 bg-[#11141c] border border-[#eef0f5]/[0.1] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.65)] p-1.5 space-y-0.5"
        >
          <div className="px-3 py-1.5 border-b border-[#eef0f5]/[0.07] text-xs text-[#7a8296]">
            Language
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
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors duration-150 text-start cursor-pointer',
                  isSelected
                    ? 'bg-[#1a1e28] text-[#eef0f5] font-medium'
                    : 'text-[#a3a9b8] hover:bg-[#1a1e28]/60 hover:text-[#eef0f5]'
                )}
              >
                <div className="flex flex-col">
                  <span>{lang.nativeLabel}</span>
                  <span className="text-[11px] font-mono text-[#7a8296]">
                    {lang.name} ({lang.code.toUpperCase()})
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#38bdf8]" strokeWidth={1.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
