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
    <div className="flex flex-col items-center justify-center p-8 rounded border border-rose-900/50 bg-rose-950/20 text-center min-h-[200px]">
      <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
      <h3 className="text-sm font-semibold text-rose-200 font-sans">
        {message || t('common.error')}
      </h3>
      {details && (
        <p className="text-xs font-mono text-slate-400 max-w-md mt-1.5 leading-relaxed">
          {details}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('common.retry')}
        </button>
      )}
    </div>
  );
};

