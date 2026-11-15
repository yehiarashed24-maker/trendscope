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
      />

      {/* Region & Variable Selectors */}
      <div className="p-5 rounded-2xl border border-[#eef0f5]/[0.08] bg-[#11141c] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[#a3a9b8] mb-1.5 font-sans">
            {t('intelligence.compare.regionA')}
          </label>
          <select
            value={compareRegionA}
            onChange={(e) => setCompareRegionA(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs font-sans text-[#eef0f5] focus:border-[#38bdf8]/50 focus:outline-none transition-colors duration-150"
          >
            {PREDEFINED_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {t(`regions.${r.id}` as any) || r.name || r.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#a3a9b8] mb-1.5 font-sans">
            {t('intelligence.compare.regionB')}
          </label>
          <select
            value={compareRegionB}
            onChange={(e) => setCompareRegionB(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs font-sans text-[#eef0f5] focus:border-[#38bdf8]/50 focus:outline-none transition-colors duration-150"
          >
            {PREDEFINED_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {t(`regions.${r.id}` as any) || r.name || r.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#a3a9b8] mb-1.5 font-sans">
            {t('intelligence.compare.variable')}
          </label>
          <select
            value={compareVar}
            onChange={(e) => setCompareVar(e.target.value as VariableId)}
            className="w-full h-9 px-3 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] text-xs font-sans text-[#eef0f5] focus:border-[#38bdf8]/50 focus:outline-none transition-colors duration-150"
          >
            {ENVIRONMENTAL_VARIABLES.map((v) => (
              <option key={v.id} value={v.id}>
                {t(`variables.${v.id}.name` as any)} ({v.spatialResolution})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 pt-4 border-t border-[#eef0f5]/[0.07] flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-[#a3a9b8] font-sans">
            MODIS LST {t('lstModes.label')}
          </span>
          <div className="inline-flex rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.08] p-0.5 gap-0.5">
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
                  className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-sans transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#1a1e28] text-[#eef0f5] font-medium'
                      : 'text-[#7a8296] hover:text-[#eef0f5]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t(m.key as any)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      {compareLoading && !compareResult ? (
        <LoadingState message="Computing side-by-side global & regional trend comparison..." />
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
                badge={<span className="text-xs font-mono text-[#7a8296]">{region.code}</span>}
              >
                <div className="rounded-xl border border-[#eef0f5]/[0.07] bg-[#07080d] divide-y divide-[#eef0f5]/[0.07] text-xs">
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-[#a3a9b8] font-sans">Sen&apos;s slope (per decade)</span>
                    <span className="text-[#eef0f5] font-mono font-medium tabular-nums">
                      {metrics
                        ? `${metrics.trendDecade >= 0 ? '+' : ''}${metrics.trendDecade} ${compareVarObj.unit}/dec`
                        : '—'}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-[#a3a9b8] font-sans">Mann-Kendall p-value</span>
                    <span
                      className={`font-mono font-medium tabular-nums ${
                        metrics && metrics.pValue < 0.05 ? 'text-[#4cc38a]' : 'text-[#e5484d]'
                      }`}
                    >
                      {metrics ? metrics.pValue : '—'}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-[#a3a9b8] font-sans">Spatial mean · area</span>
                    <span className="text-[#eef0f5] font-mono font-medium tabular-nums">
                      {metrics ? `${metrics.meanVal} ${compareVarObj.unit}` : '—'} ·{' '}
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
              <span className="text-xs font-mono tabular-nums text-[#7a8296]">
                {couplingData ? `${couplingData.sampleSize} paired months` : '2000–2024'}
              </span>
            }
          >
            {couplingLoading || !couplingData ? (
              <div className="py-6 text-xs font-mono text-[#7a8296]">
                Computing MODIS NDVI–LST thermal coupling...
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1">
                    <div className="text-xs text-[#a3a9b8] font-sans">
                      Pearson r ({compareLstMode === 'night' ? 'Nighttime LST' : 'Daytime LST'})
                    </div>
                    <div className="text-[24px] leading-none font-mono font-medium text-[#eef0f5] tabular-nums">
                      {couplingData.pearsonR.toFixed(3)}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#7a8296]">
                      p = {couplingData.pearsonPValue} · lag {couplingData.lagMonths} mo
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1">
                    <div className="text-xs text-[#a3a9b8] font-sans">Spearman ρ (rank)</div>
                    <div className="text-[24px] leading-none font-mono font-medium text-[#38bdf8] tabular-nums">
                      {couplingData.spearmanRho.toFixed(3)}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#7a8296]">
                      {couplingData.points?.length || couplingData.sampleSize} aligned months
                    </div>
                  </div>

                  {couplingData.nightCorrelation ? (
                    <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1">
                      <div className="text-xs text-[#a3a9b8] font-sans">
                        Nighttime LST coupling
                      </div>
                      <div className="text-[24px] leading-none font-mono font-medium text-[#eef0f5] tabular-nums">
                        r = {couplingData.nightCorrelation.pearsonR.toFixed(3)}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-[#7a8296]">
                        ρ = {couplingData.nightCorrelation.spearmanRho.toFixed(3)} · p = {couplingData.nightCorrelation.pValue}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#07080d] border border-[#eef0f5]/[0.07] space-y-1">
                      <div className="text-xs text-[#eef0f5] font-medium font-sans">Skin vs air temperature</div>
                      <div className="text-xs text-[#a3a9b8] leading-5">
                        MOD11C3 measures radiative land surface skin temperature; canopy cover cools surface via evapotranspiration.
                      </div>
                    </div>
                  )}
                </div>

                {Array.isArray(couplingData.coOccurringStressEpisodes) &&
                  couplingData.coOccurringStressEpisodes.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#eef0f5] font-sans">
                        <Flame className="w-4 h-4 text-[#e5484d]" strokeWidth={1.5} />
                        <span>Co-occurring thermal and canopy stress episodes</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
                        {couplingData.coOccurringStressEpisodes.slice(0, 6).map((ep) => (
                          <div
                            key={ep.date}
                            className="px-3.5 py-2.5 rounded-lg bg-[#07080d] border border-[#eef0f5]/[0.07] flex items-center justify-between gap-2"
                          >
                            <span className="text-[#eef0f5]">{ep.date}</span>
                            <span className="text-[#a3a9b8]">
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
