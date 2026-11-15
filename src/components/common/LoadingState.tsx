import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, subMessage }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-[#eef0f5]/[0.08] bg-[#11141c] min-h-[240px]">
      <div className="w-9 h-9 rounded-lg border border-[#eef0f5]/[0.08] bg-[#1a1e28] flex items-center justify-center mb-4">
        <Loader2 className="w-4 h-4 text-[#38bdf8] animate-spin" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-sans text-[#eef0f5]">
        {message || t('common.loading')}
      </p>
      {subMessage && (
        <p className="text-xs text-[#7a8296] font-mono mt-1">{subMessage}</p>
      )}
    </div>
  );
};

