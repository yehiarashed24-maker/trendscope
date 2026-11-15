import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Radio } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, subMessage }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-12 rounded border border-slate-800/80 bg-obsidian-900/60 min-h-[220px]">
      <div className="relative mb-4">
        <Radio className="w-8 h-8 text-satellite-400 animate-pulse" />
        <Loader2 className="w-8 h-8 text-satellite-500/40 animate-spin absolute inset-0" />
      </div>
      <p className="text-xs font-mono text-slate-200 tracking-wide">
        {message || t('common.loading')}
      </p>
      {subMessage && (
        <p className="text-[11px] text-slate-500 font-mono mt-1">{subMessage}</p>
      )}
    </div>
  );
};

