import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  details?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, details, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-10 rounded-2xl border border-[#e5484d]/30 bg-[#11141c] text-center min-h-[220px]">
      <div className="w-9 h-9 rounded-lg border border-[#e5484d]/30 bg-[#e5484d]/10 flex items-center justify-center mb-3">
        <AlertCircle className="w-4 h-4 text-[#e5484d]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[15px] font-medium text-[#eef0f5] font-sans">
        {message || t('common.error')}
      </h3>
      {details && (
        <p className="text-[13px] text-[#a3a9b8] max-w-md mt-1.5 leading-5">
          {details}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 h-9 inline-flex items-center gap-2 px-4 rounded-lg bg-[#1a1e28] hover:bg-[#232836] text-[#eef0f5] text-xs font-medium border border-[#eef0f5]/[0.08] transition-colors duration-150 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#a3a9b8]" strokeWidth={1.5} />
          <span>{t('common.retry')}</span>
        </button>
      )}
    </div>
  );
};

