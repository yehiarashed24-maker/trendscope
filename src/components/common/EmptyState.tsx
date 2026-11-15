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
    <div className="flex flex-col items-center justify-center p-8 rounded border border-dashed border-slate-800 bg-obsidian-900/40 text-center min-h-[180px]">
      <Icon className="w-8 h-8 text-slate-600 mb-2.5" />
      <h4 className="text-xs font-semibold text-slate-300 font-sans">{title}</h4>
      {description && (
        <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
};

