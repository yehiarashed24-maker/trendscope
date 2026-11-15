import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataIntegrityStatus } from '../../types/scientific';
import { cn } from '../../utils/cn';

interface DemoDataBadgeProps {
  status?: DataIntegrityStatus;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export const DemoDataBadge: React.FC<DemoDataBadgeProps> = ({
  status = 'VERIFIED',
  size = 'md',
  className,
}) => {
  const { t } = useTranslation();

  const configs: Record<
    DataIntegrityStatus,
    { label: string; tooltip: string; text: string; dot: string }
  > = {
    DEMO_DATA: {
      label: t('status.demoData'),
      tooltip: t('status.demoTooltip'),
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    VERIFIED: {
      label: t('status.verified'),
      tooltip: 'Directly verified from peer-reviewed NASA mission archive.',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
    PENDING_BACKEND: {
      label: t('status.pendingBackend'),
      tooltip: 'Data endpoint awaiting connection with Python scientific service.',
      text: 'text-sky-400',
      dot: 'bg-sky-400',
    },
    UNAVAILABLE: {
      label: t('status.unavailable'),
      tooltip: 'Telemetry stream masked or unavailable for this temporal window.',
      text: 'text-rose-400',
      dot: 'bg-rose-400',
    },
  };

  const current = configs[status] || configs.VERIFIED;

  return (
    <span
      title={current.tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-semibold cursor-help select-none text-[10px]',
        current.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />
      <span>{current.label}</span>
    </span>
  );
};
