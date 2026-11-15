import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon: Icon = Inbox,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 rounded-xl border border-dashed border-[#eef0f5]/[0.12] bg-[#07080d] text-center min-h-[200px]">
      <div className="w-9 h-9 rounded-lg border border-[#eef0f5]/[0.08] bg-[#11141c] flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-[#7a8296]" strokeWidth={1.5} />
      </div>
      <h4 className="text-[14px] font-medium text-[#eef0f5] font-sans">{title}</h4>
      {description && (
        <p className="text-[13px] text-[#7a8296] max-w-sm mt-1 leading-5">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

