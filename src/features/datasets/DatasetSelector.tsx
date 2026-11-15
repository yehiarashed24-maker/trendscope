import React from 'react';
import { useTranslation } from 'react-i18next';
import { Database, ExternalLink, CheckCircle } from 'lucide-react';
import { DatasetId, VariableId } from '../../types/scientific';
import { NASA_DATASETS } from '../../services/nasa/constants';
import { DemoDataBadge } from '../../components/common/DemoDataBadge';
import { cn } from '../../utils/cn';

interface DatasetSelectorProps {
  selectedId: DatasetId;
  onSelect: (id: DatasetId) => void;
  variableId?: VariableId;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  selectedId,
  onSelect,
  variableId,
}) => {
  const { t } = useTranslation();

  const filteredDatasets = variableId
    ? NASA_DATASETS.filter((d) => d.variableId === variableId)
    : NASA_DATASETS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
          {t('explorer.datasetPanel.title')}
        </label>
        <span className="text-[10px] font-mono text-slate-500">
          {filteredDatasets.length} MISSION ARCHIVES AVAILABLE
        </span>
      </div>

      <div className="space-y-2">
        {filteredDatasets.map((ds) => {
          const isSelected = selectedId === ds.id;

          return (
            <div
              key={ds.id}
              onClick={() => onSelect(ds.id)}
              className={cn(
                'p-3 rounded border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                isSelected
                  ? 'border-satellite-500 bg-satellite-950/25 ring-1 ring-satellite-500/40'
                  : 'border-slate-800 bg-obsidian-900/50 hover:border-slate-700 hover:bg-obsidian-900'
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Database className={cn('w-3.5 h-3.5', isSelected ? 'text-satellite-400' : 'text-slate-500')} />
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    {ds.shortName}
                  </span>
                  <DemoDataBadge
                    status={ds.availabilityStatus === 'ONLINE' ? 'VERIFIED' : 'DEMO_DATA'}
                    size="sm"
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-sans">
                  Provider: <span className="text-slate-300 font-mono">{ds.provider}</span> • DOI:{' '}
                  <span className="text-slate-500 font-mono">{ds.doi}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                <div>
                  <div className="text-slate-500 uppercase">Coverage</div>
                  <div className="text-slate-300">{ds.timeCoverage.split('to')[0]}...</div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase">Res</div>
                  <div className="text-slate-300">{ds.spatialResolution}</div>
                </div>
                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-satellite-400 ms-2 hidden sm:block" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

