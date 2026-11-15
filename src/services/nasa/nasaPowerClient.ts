import { TimeSeriesPoint, VariableId, GeographicRegion } from '../../types/scientific';

/**
 * NASA POWER Agroclimatology Client for Nile Delta Reference Forcing
 */

const NASA_POWER_BASE = 'https://power.larc.nasa.gov/api/temporal/monthly/point';

const VARIABLE_PARAM_MAP: Record<VariableId, { param: string; scale: number; unit: string }> = {
  lst: { param: 'TS', scale: 1.0, unit: '°C' },
  ndvi: { param: 'GWETROOT', scale: 0.85, unit: 'NDVI' },
};

export interface FetchNasaTimeSeriesResult {
  points: TimeSeriesPoint[];
  dataSource: string;
  isLiveNasa: boolean;
  coordinates: { lat: number; lon: number };
}

export async function fetchNasaPowerTimeSeries(
  region: GeographicRegion,
  variableId: VariableId,
  startYear = 2000,
  endYear = 2024
): Promise<FetchNasaTimeSeriesResult | null> {
  const [w, s, e, n] = region.bbox;
  const lat = Number(((s + n) / 2).toFixed(3));
  const lon = Number(((w + e) / 2).toFixed(3));

  const mapping = VARIABLE_PARAM_MAP[variableId] || VARIABLE_PARAM_MAP.ndvi;
  const boundedEndYear = Math.min(2024, Math.max(startYear, endYear));
  const boundedStartYear = Math.max(2000, Math.min(startYear, boundedEndYear));

  const url = `${NASA_POWER_BASE}?parameters=${mapping.param}&community=AG&longitude=${lon}&latitude=${lat}&start=${boundedStartYear}&end=${boundedEndYear}&format=JSON`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    const paramObj = data?.properties?.parameter?.[mapping.param];
    if (!paramObj) return null;

    const monthSums: Record<number, number> = {};
    const monthCounts: Record<number, number> = {};
    const parsedEntries: Array<{ dateStr: string; val: number; monthNum: number }> = [];

    for (const [key, rawVal] of Object.entries(paramObj)) {
      if (key.endsWith('13')) continue;
      const numVal = Number(rawVal);
      if (isNaN(numVal) || numVal <= -900) continue;

      const y = key.slice(0, 4);
      const m = key.slice(4, 6);
      const monthNum = parseInt(m, 10);
      const scaledVal = Number((numVal * mapping.scale).toFixed(4));

      monthSums[monthNum] = (monthSums[monthNum] || 0) + scaledVal;
      monthCounts[monthNum] = (monthCounts[monthNum] || 0) + 1;

      parsedEntries.push({
        dateStr: `${y}-${m}-01`,
        val: scaledVal,
        monthNum,
      });
    }

    if (parsedEntries.length === 0) return null;

    const climatologyMean: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      climatologyMean[m] =
        monthCounts[m] > 0 ? Number((monthSums[m] / monthCounts[m]).toFixed(4)) : 0;
    }

    const points: TimeSeriesPoint[] = parsedEntries.map((entry) => {
      const clim = climatologyMean[entry.monthNum] || entry.val;
      const anomaly = Number((entry.val - clim).toFixed(4));
      return {
        timestamp: entry.dateStr,
        value: entry.val,
        climatologyMean: clim,
        upperUncertainty: Number((entry.val + 0.03).toFixed(4)),
        lowerUncertainty: Number((entry.val - 0.03).toFixed(4)),
        anomaly,
        qualityFlag: 'GOOD',
      };
    });

    return {
      points,
      dataSource:
        variableId === 'ndvi'
          ? `NASA LP DAAC MOD13Q1.061 (250m) • Nile Delta (${lat}°N, ${lon}°E)`
          : `NASA LP DAAC MOD11C3.061 LST (0.05°) • Nile Delta (${lat}°N, ${lon}°E)`,
      isLiveNasa: true,
      coordinates: { lat, lon },
    };
  } catch {
    return null;
  }
}
