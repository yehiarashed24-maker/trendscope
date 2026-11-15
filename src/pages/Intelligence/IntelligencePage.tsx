import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GitCompare, Sun, Moon, SunMoon, Flame } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataCard } from '../../components/common/DataCard';
import { LoadingState } from '../../components/common/LoadingState';
import { analysisService } from '../../services/analysis/analysisService';
import { ENVIRONMENTAL_VARIABLES, PREDEFINED_REGIONS } from '../../services/nasa/constants';
import { useAppStore } from '../../store/useAppStore';
import { CorrelationResponse, LstMode, VariableId } from '../../types/scientific';
import { formatNumber } from '../../utils/formatters';

export const IntelligencePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language?.split('-')[0] || 'en') as any;
  const { activeConfig, setLstMode } = useAppStore();

  // Regional Comparison Workspace State
  const [compareRegionA, setCompareRegionA] = useState<string>(activeConfig.regionId || PREDEFINED_REGIONS[1].id);
  const [compareRegionB, setCompareRegionB] = useState<string>(PREDEFINED_REGIONS[4].id);
  const [compareVar, setCompareVar] = useState<VariableId>(activeConfig.variableId || 'ndvi');
  const [compareLstMode, setCompareLstMode] = useState<LstMode>(activeConfig.lstMode || 'day');
  const [compareLoading, setCompareLoading] = useState<boolean>(true);
  const [compareResult, setCompareResult] = useState<{
    regionA: { id: string; trendDecade: number; pValue: number; meanVal: number };
    regionB: { id: string; trendDecade: number; pValue: number; meanVal: number };
  } | null>(null);

  const [couplingData, setCouplingData] = useState<CorrelationResponse | null>(null);
  const [couplingLoading, setCouplingLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setCompareLoading(true);
    analysisService
      .compareRegions(compareRegionA, compareRegionB, compareVar, compareLstMode)
      .then((res) => {
        if (isMounted) {
          setCompareResult(res);
          setCompareLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setCompareLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [compareRegionA, compareRegionB, compareVar, compareLstMode]);

  useEffect(() => {
    let isMounted = true;
    setCouplingLoading(true);
    analysisService
      .getCorrelationAnalysis(compareRegionA, 'ndvi', 'lst', activeConfig.timeRange, compareLstMode)
      .then((res) => {
        if (isMounted) {
          setCouplingData(res);
          setCouplingLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setCouplingLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [compareRegionA, activeConfig.timeRange, compareLstMode]);

  const compareVarObj =
    ENVIRONMENTAL_VARIABLES.find((v) => v.id === compareVar) || ENVIRONMENTAL_VARIABLES[0];

  const regionAObj = PREDEFINED_REGIONS.find((r) => r.id === compareRegionA) || PREDEFINED_REGIONS[0];
  const regionBObj = PREDEFINED_REGIONS.find((r) => r.id === compareRegionB) || PREDEFINED_REGIONS[1];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('intelligence.title')}
        subtitle={t('intelligence.tabs.compare')}
        status="VERIFIED"
        extraBadge={
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/40">
            <GitCompare className="w-3.5 h-3.5" />
            <span>{t('intelligence.tabs.compare')}</span>
          </span>
        }
      />

      {/* Region & Variable Selectors */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-[#0B0F17] grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-sans">
            {t('intelligence.compare.regionA')}
          </label>
          <select
            value={compareRegionA}
            onChange={(e) => setCompareRegionA(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-200 focus:border-sky-500 focus:outline-none transition-colors"
          >
            {PREDEFINED_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {t(`regions.${r.id}` as any) || r.name || r.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-sans">
            {t('intelligence.compare.regionB')}
          </label>
          <select
            value={compareRegionB}
            onChange={(e) => setCompareRegionB(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-200 focus:border-sky-500 focus:outline-none transition-colors"
          >
            {PREDEFINED_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {t(`regions.${r.id}` as any) || r.name || r.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 font-sans">
            {t('intelligence.compare.variable')}
          </label>
          <select
            value={compareVar}
            onChange={(e) => setCompareVar(e.target.value as VariableId)}
            className="w-full h-9 px-3 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-zinc-200 focus:border-sky-500 focus:outline-none transition-colors"
          >
            {ENVIRONMENTAL_VARIABLES.map((v) => (
              <option key={v.id} value={v.id}>
                {t(`variables.${v.id}.name` as any)} ({v.spatialResolution})
              </option>
            ))}
          </select>
        </div>

        {(compareVar === 'lst' || true) && (
          <div className="sm:col-span-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] font-medium text-zinc-400 font-sans">
              MODIS LST {t('lstModes.label')}:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'day' as LstMode, icon: Sun, key: 'lstModes.day' },
                { id: 'night' as LstMode, icon: Moon, key: 'lstModes.night' },
                { id: 'both' as LstMode, icon: SunMoon, key: 'lstModes.both' },
              ].map((m) => {
                const Icon = m.icon;
                const active = compareLstMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setCompareLstMode(m.id);
                      setLstMode(m.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/60'
                        : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t(m.key as any)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Cards */}
      {compareLoading && !compareResult ? (
        <LoadingState message="Computing side-by-side Nile Delta regional trend & mean comparison..." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { tag: 'Region A', region: regionAObj, metrics: compareResult?.regionA },
              { tag: 'Region B', region: regionBObj, metrics: compareResult?.regionB },
            ].map(({ tag, region, metrics }) => (
              <DataCard
                key={tag}
                title={`${tag}: ${t(`regions.${region.id}` as any) || region.name}`}
                subtitle={region.climateZone}
                badge={<span className="text-[11px] font-mono text-zinc-400">{region.code}</span>}
              >
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 flex justify-between items-center">
                    <span className="text-zinc-400 font-sans">Sen&apos;s Slope (per Decade)</span>
                    <span className="text-amber-400 font-mono font-medium tabular-nums">
                      {metrics
                        ? `${metrics.trendDecade >= 0 ? '+' : ''}${metrics.trendDecade} ${compareVarObj.unit}/dec`
                        : '...'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 flex justify-between items-center">
                    <span className="text-zinc-400 font-sans">Mann-Kendall p-value</span>
                    <span
                      className={`font-mono font-medium tabular-nums ${
                        metrics && metrics.pValue < 0.05 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {metrics ? metrics.pValue : '...'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 flex justify-between items-center">
                    <span className="text-zinc-400 font-sans">Spatial Mean / Area</span>
                    <span className="text-zinc-200 font-mono font-medium tabular-nums">
                      {metrics ? `${metrics.meanVal} ${compareVarObj.unit}` : '—'} •{' '}
                      {formatNumber(region.areaKm2, lang)} km²
                    </span>
                  </div>
                </div>
              </DataCard>
            ))}
          </div>

          {/* Coupled Vegetation vs Land Surface Temperature Correlation */}
          <DataCard
            title={`NDVI (MOD13Q1) vs Land Surface Temperature (MOD11C3 · ${t(`lstModes.${compareLstMode}` as any)})`}
            subtitle={`${t(`regions.${regionAObj.id}` as any) || regionAObj.name} · 2000–2024 overlapping MODIS observation window`}
            badge={
              <span className="text-[11px] font-mono text-sky-300">
                {couplingData ? `${couplingData.sampleSize} paired mo` : '2000–2024'}
              </span>
            }
          >
            {couplingLoading || !couplingData ? (
              <div className="py-6 text-xs font-mono text-zinc-400">
                Computing MODIS NDVI–LST thermal coupling...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-[11px] text-zinc-400 font-sans">
                      Pearson r ({compareLstMode === 'night' ? 'Nighttime LST' : 'Daytime LST'})
                    </div>
                    <div className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                      {couplingData.pearsonR.toFixed(3)}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">
                      p = {couplingData.pearsonPValue} · lag {couplingData.lagMonths} mo
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                    <div className="text-[11px] text-zinc-400 font-sans">Spearman ρ (Rank)</div>
                    <div className="text-base font-mono font-bold text-sky-300 mt-0.5 tabular-nums">
                      {couplingData.spearmanRho.toFixed(3)}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400">
                      {couplingData.points?.length || couplingData.sampleSize} aligned months
                    </div>
                  </div>

                  {couplingData.nightCorrelation ? (
                    <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/30">
                      <div className="text-[11px] text-sky-300 font-sans">
                        Nighttime LST Coupling
                      </div>
                      <div className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                        r = {couplingData.nightCorrelation.pearsonR.toFixed(3)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        ρ = {couplingData.nightCorrelation.spearmanRho.toFixed(3)} · p = {couplingData.nightCorrelation.pValue}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80">
                      <div className="text-[11px] text-zinc-400 font-sans">Skin vs Air Note</div>
                      <div className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                        MOD11C3 measures land surface radiative skin temperature; canopy cover cools surface via evapotranspiration.
                      </div>
                    </div>
                  )}
                </div>

                {Array.isArray(couplingData.coOccurringStressEpisodes) &&
                  couplingData.coOccurringStressEpisodes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300 font-sans">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Co-Occurring Thermal &amp; Canopy Stress Episodes</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                        {couplingData.coOccurringStressEpisodes.slice(0, 6).map((ep) => (
                          <div
                            key={ep.date}
                            className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-2"
                          >
                            <span className="text-zinc-200">{ep.date}</span>
                            <span className="text-amber-300">
                              {ep.lst.toFixed(1)} °C ({ep.lstZScore >= 0 ? '+' : ''}{ep.lstZScore.toFixed(2)}σ)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DataCard>
        </div>
      )}
    </div>
  );
};
