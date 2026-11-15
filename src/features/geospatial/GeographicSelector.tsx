import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Upload, FileCode, Check, Search, AlertCircle } from 'lucide-react';
import { GeographicRegion, GeoJSONFeatureAdapterResult } from '../../types/scientific';
import { formatNumber, formatCoordinate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

interface GeographicSelectorProps {
  selectedRegionId: string;
  regions: GeographicRegion[];
  onSelectRegion: (id: string) => void;
  onUploadGeoJson: (data: any, fileName: string) => void;
  adapterResult?: GeoJSONFeatureAdapterResult;
}

export const GeographicSelector: React.FC<GeographicSelectorProps> = ({
  selectedRegionId,
  regions,
  onSelectRegion,
  onUploadGeoJson,
  adapterResult,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filteredRegions = regions.filter((r) => {
    const localized = t(`regions.${r.id}` as any);
    return (
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      (localized && localized.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onUploadGeoJson(parsed, file.name);
      } catch (err: any) {
        setUploadError(`Failed to parse GeoJSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3">
      {/* Search and Upload toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute start-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('explorer.geoPanel.searchPlaceholder')}
            className="w-full h-8 ps-8 pe-3 rounded bg-obsidian-950 border border-slate-800 focus:border-satellite-500 focus:outline-none text-xs text-slate-200 placeholder-slate-500 font-mono"
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".geojson,.json"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono inline-flex items-center gap-1.5 transition-colors shrink-0"
          title="Ingest external GeoJSON boundaries from project team"
        >
          <Upload className="w-3.5 h-3.5 text-satellite-400" />
          <span className="hidden sm:inline">{t('explorer.geoPanel.loadGeoJson')}</span>
        </button>
      </div>

      {uploadError && (
        <div className="p-2 rounded bg-rose-950/40 border border-rose-800/80 text-[11px] text-rose-300 font-mono flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {adapterResult?.sourceType === 'CUSTOM_TEAM_FILE' && (
        <div className="p-2 rounded bg-sky-950/30 border border-sky-800/60 text-[11px] text-sky-300 font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('explorer.geoPanel.customAdapterActive')}</span>
          </div>
          <span className="text-[10px] text-sky-400">
            {adapterResult.featureCount} FEATURES DETECTED
          </span>
        </div>
      )}

      {/* Region options */}
      <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pe-1">
        {filteredRegions.map((r) => {
          const isSelected = selectedRegionId === r.id;
          const localizedName = t(`regions.${r.id}` as any) || r.id;

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectRegion(r.id)}
              className={cn(
                'p-2.5 rounded border text-start transition-all flex items-center justify-between gap-3 group',
                isSelected
                  ? 'border-satellite-500 bg-satellite-950/30 ring-1 ring-satellite-500/50'
                  : 'border-slate-800/80 bg-obsidian-900/50 hover:border-slate-700 hover:bg-obsidian-900'
              )}
            >
              <div className="flex items-center gap-2.5">
                <MapPin
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isSelected ? 'text-satellite-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}
                />
                <div>
                  <div className="text-xs font-semibold text-slate-200 font-sans group-hover:text-white">
                    {localizedName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {r.climateZone} • {formatNumber(r.areaKm2)} km²
                  </div>
                </div>
              </div>

              <div className="text-end shrink-0">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {r.code}
                </span>
                <div className="text-[9px] text-slate-500 font-mono mt-1">
                  {formatCoordinate(r.coordinates[1], r.coordinates[0])}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

