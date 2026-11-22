import { create } from 'zustand';
import {
  InvestigationConfig,
  GeoJSONFeatureAdapterResult,
  GeographicRegion,
  VariableId,
  LstMode,
  DatasetId,
  TimeRange,
  TrendAnalysisResponse,
} from '../types/scientific';
import {
  FEATURED_INVESTIGATION_TEMPLATES,
  PREDEFINED_REGIONS,
  ENVIRONMENTAL_VARIABLES,
  NASA_DATASETS,
} from '../services/nasa/constants';
import { getDefaultFallbackGeoJSON, adaptIncomingGeoJSON } from '../services/geospatial/geojsonAdapter';

interface AppStoreState {
  activeConfig: InvestigationConfig;
  setActiveConfig: (config: InvestigationConfig) => void;
  updateActiveConfig: (partial: Partial<InvestigationConfig>) => void;

  currentRegion: GeographicRegion;
  setRegion: (regionId: string) => void;

  setVariable: (varId: VariableId) => void;
  setLstMode: (mode: LstMode) => void;
  setDataset: (datasetId: DatasetId) => void;
  setTimeRange: (range: TimeRange) => void;

  geoAdapterResult: GeoJSONFeatureAdapterResult;
  loadCustomGeoJSON: (rawGeoJson: any, fileName?: string) => void;

  savedInvestigations: InvestigationConfig[];
  loadUserInvestigations: (userEmail: string | null) => void;
  saveCurrentInvestigation: () => void;
  deleteSavedInvestigation: (id: string) => void;
  loadSavedInvestigation: (config: InvestigationConfig) => void;

  selectedMapLayer: VariableId;
  setSelectedMapLayer: (layer: VariableId) => void;

  customCsvFile: File | null;
  customCsvFileName: string | null;
  customCsvAnalysis: TrendAnalysisResponse | null;
  customCsvAvailableRange: { startDate: string; endDate: string } | null;
  setCustomCsvSession: (payload: {
    file: File;
    fileName: string;
    analysis: TrendAnalysisResponse;
    availableRange: { startDate: string; endDate: string } | null;
  }) => void;
  clearCustomCsvSession: () => void;

  onboardingOpen: boolean;
  pendingOnboardingAuto: boolean;
  pendingTourOnExplorer: boolean;
  openOnboarding: () => void;
  openOnboardingIfAllowed: () => void;
  closeOnboarding: (dontShowAgain?: boolean) => void;
  setPendingTourOnExplorer: (pending: boolean) => void;
}

const ONBOARDING_HIDDEN_KEY = 'trendscope_onboarding_hidden_v1';
const ONBOARDING_SESSION_KEY = 'trendscope_onboarding_seen_v1';

function isOnboardingAutoAllowed(checkSession = true): boolean {
  try {
    if (localStorage.getItem(ONBOARDING_HIDDEN_KEY) === '1') return false;
    if (checkSession && sessionStorage.getItem(ONBOARDING_SESSION_KEY) === '1') return false;
    return true;
  } catch {
    return false;
  }
}

const STORAGE_KEY = 'earthpulse_nile_delta_investigations_v2';

const getUserStorageKey = (email?: string | null) =>
  email ? `earthpulse_nile_delta_cases_${email.toLowerCase().trim()}` : STORAGE_KEY;

function buildDynamicWorldRegion(regionId: string): GeographicRegion | null {
  if (!regionId.startsWith('world_lat_')) return null;
  try {
    const parts = regionId.replace('world_lat_', '').split('_lon_');
    const lat = Math.max(-85, Math.min(85, parseFloat(parts[0])));
    const lon = Math.max(-179, Math.min(179, parseFloat(parts[1])));
    if (isNaN(lat) || isNaN(lon)) return null;
    const labelCoord = `${lat >= 0 ? '+' : ''}${lat.toFixed(2)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(2)}°`;
    return {
      id: regionId,
      code: `WLD-${Math.abs(Math.round(lat))}${Math.abs(Math.round(lon))}`,
      name: `🌐 Custom World Region (${labelCoord})`,
      name_ar: `🌐 منطقة عالمية مخصصة (${labelCoord})`,
      name_de: `🌐 Weltregion (${labelCoord})`,
      name_fr: `🌐 Région mondiale (${labelCoord})`,
      coordinates: [lon, lat],
      bbox: [lon - 0.5, lat - 0.5, lon + 0.5, lat + 0.5],
      areaKm2: 12100,
      climateZone: `NASA POWER Live Cell (${labelCoord})`,
      countryCode: 'WLD',
    };
  } catch {
    return null;
  }
}

function sanitizeInvestigationConfig(cfg: any): InvestigationConfig {
  const rawVar = cfg?.variableId === 'soil_moisture' ? 'lst' : cfg?.variableId;
  const validVarIds: VariableId[] = ['ndvi', 'lst'];
  const varId: VariableId = validVarIds.includes(rawVar) ? rawVar : 'ndvi';
  const lstMode: LstMode =
    cfg?.lstMode === 'night' || cfg?.lstMode === 'both' ? cfg.lstMode : 'day';
  const validRegionIds = PREDEFINED_REGIONS.map((r) => r.id);
  const regionId =
    validRegionIds.includes(cfg?.regionId) ||
    String(cfg?.regionId || '').startsWith('custom_') ||
    String(cfg?.regionId || '').startsWith('world_lat_')
      ? cfg.regionId
      : 'nile_delta';
  const datasetId: DatasetId = varId === 'lst' ? 'MODIS_MOD11C3' : 'MODIS_MOD13Q1';

  return {
    id: cfg?.id || `inv_${Date.now()}`,
    titleKey: cfg?.titleKey,
    customTitle: cfg?.customTitle,
    regionId,
    variableId: varId,
    lstMode,
    secondaryVariableId: varId === 'ndvi' ? 'lst' : 'ndvi',
    datasetId,
    timeRange: {
      startDate: cfg?.timeRange?.startDate || '2000-02-18',
      endDate: cfg?.timeRange?.endDate || '2024-12-31',
      aggregation: cfg?.timeRange?.aggregation || 'monthly',
    },
    customGeoJson: cfg?.customGeoJson,
    createdAt: cfg?.createdAt || new Date().toISOString(),
    status: 'VERIFIED',
  };
}

function getCasesForEmail(email?: string | null): InvestigationConfig[] {
  try {
    const key = getUserStorageKey(email);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(sanitizeInvestigationConfig);
      }
    }
    localStorage.setItem(key, JSON.stringify(FEATURED_INVESTIGATION_TEMPLATES));
    return [...FEATURED_INVESTIGATION_TEMPLATES];
  } catch {
    return [...FEATURED_INVESTIGATION_TEMPLATES];
  }
}

function getInitialSaved(): InvestigationConfig[] {
  try {
    const stored = localStorage.getItem('earthpulse_google_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.email) {
        return getCasesForEmail(user.email);
      }
    }
  } catch {
    // fallback
  }
  return getCasesForEmail(null);
}

const initialFallbackGeo = getDefaultFallbackGeoJSON();
const initialAdapterResult = adaptIncomingGeoJSON(initialFallbackGeo, 'fallback_boundaries.geojson');

export const useAppStore = create<AppStoreState>((set, get) => ({
  activeConfig: FEATURED_INVESTIGATION_TEMPLATES[0],
  currentRegion: PREDEFINED_REGIONS[0],
  geoAdapterResult: initialAdapterResult,
  selectedMapLayer: 'ndvi',
  savedInvestigations: getInitialSaved(),
  customCsvFile: null,
  customCsvFileName: null,
  customCsvAnalysis: null,
  customCsvAvailableRange: null,
  onboardingOpen: false,
  pendingOnboardingAuto: false,
  pendingTourOnExplorer: false,

  loadUserInvestigations: (userEmail) => {
    const cases = getCasesForEmail(userEmail);
    set({ savedInvestigations: cases });
    fetch('/api/investigations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.investigations && Array.isArray(data.investigations) && data.investigations.length > 0) {
          const sanitized = data.investigations.map(sanitizeInvestigationConfig);
          set({ savedInvestigations: sanitized });
        }
      })
      .catch(() => {});
  },

  setActiveConfig: (config) => {
    const clean = sanitizeInvestigationConfig(config);
    const region =
      get().geoAdapterResult.detectedRegions.find((r) => r.id === clean.regionId) ||
      PREDEFINED_REGIONS.find((r) => r.id === clean.regionId) ||
      buildDynamicWorldRegion(clean.regionId) ||
      PREDEFINED_REGIONS[0];
    set({ activeConfig: clean, currentRegion: region, selectedMapLayer: clean.variableId });
  },

  updateActiveConfig: (partial) => {
    const updated = sanitizeInvestigationConfig({ ...get().activeConfig, ...partial });
    set({ activeConfig: updated });
  },

  setRegion: (regionId) => {
    const region =
      get().geoAdapterResult.detectedRegions.find((r) => r.id === regionId) ||
      PREDEFINED_REGIONS.find((r) => r.id === regionId) ||
      buildDynamicWorldRegion(regionId) ||
      PREDEFINED_REGIONS[0];
    const isCustomGeo = String(region.id).startsWith('custom_');
    const updatedConfig: InvestigationConfig = {
      ...get().activeConfig,
      regionId: region.id,
      customGeoJson: isCustomGeo ? get().activeConfig.customGeoJson : undefined,
    };
    set({
      currentRegion: region,
      activeConfig: updatedConfig,
      customCsvFile: null,
      customCsvFileName: null,
      customCsvAnalysis: null,
      customCsvAvailableRange: null,
    });
  },

  setVariable: (varId) => {
    const variable = ENVIRONMENTAL_VARIABLES.find((v) => v.id === varId) || ENVIRONMENTAL_VARIABLES[0];
    const dataset = NASA_DATASETS.find((d) => d.id === variable.defaultDatasetId) || NASA_DATASETS[0];
    const currentRange = get().activeConfig.timeRange;
    const currentLstMode = get().activeConfig.lstMode || 'day';

    const updatedConfig: InvestigationConfig = {
      ...get().activeConfig,
      variableId: varId,
      lstMode: currentLstMode,
      secondaryVariableId: varId === 'ndvi' ? 'lst' : 'ndvi',
      datasetId: dataset.id,
      timeRange: { ...currentRange },
    };
    set({
      activeConfig: updatedConfig,
      selectedMapLayer: varId,
      customCsvFile: null,
      customCsvFileName: null,
      customCsvAnalysis: null,
      customCsvAvailableRange: null,
    });
  },

  setLstMode: (mode) => {
    set({
      activeConfig: {
        ...get().activeConfig,
        lstMode: mode,
      },
      customCsvFile: null,
      customCsvFileName: null,
      customCsvAnalysis: null,
      customCsvAvailableRange: null,
    });
  },

  setDataset: (datasetId) => {
    const varId: VariableId = datasetId === 'MODIS_MOD11C3' ? 'lst' : 'ndvi';
    get().setVariable(varId);
  },

  setTimeRange: (range) => {
    set({
      activeConfig: {
        ...get().activeConfig,
        timeRange: { ...range },
      },
    });
  },

  loadCustomGeoJSON: (rawGeoJson, fileName) => {
    try {
      const adapted = adaptIncomingGeoJSON(rawGeoJson, fileName);
      const firstRegion = adapted.detectedRegions[0] || PREDEFINED_REGIONS[0];
      set({
        geoAdapterResult: adapted,
        currentRegion: firstRegion,
        activeConfig: {
          ...get().activeConfig,
          regionId: firstRegion.id,
          customGeoJson: rawGeoJson,
        },
      });
    } catch (e: any) {
      console.error('GeoJSON Adapter error:', e.message);
      throw e;
    }
  },

  saveCurrentInvestigation: () => {
    const active = get().activeConfig;
    const existing = get().savedInvestigations;
    const exists = existing.some((i) => i.id === active.id);
    const newId = exists ? `inv_${Date.now()}` : active.id;
    const toSave: InvestigationConfig = {
      ...active,
      id: newId,
      createdAt: new Date().toISOString(),
      status: 'VERIFIED',
    };
    const updated = [toSave, ...existing.filter((i) => i.id !== toSave.id)];
    set({ savedInvestigations: updated });

    fetch('/api/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSave),
    }).catch(() => {});

    try {
      const stored = localStorage.getItem('earthpulse_google_user');
      const user = stored ? JSON.parse(stored) : null;
      const key = getUserStorageKey(user?.email);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  deleteSavedInvestigation: (id) => {
    const updated = get().savedInvestigations.filter((i) => i.id !== id);
    set({ savedInvestigations: updated });

    fetch(`/api/investigations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});

    try {
      const stored = localStorage.getItem('earthpulse_google_user');
      const user = stored ? JSON.parse(stored) : null;
      const key = getUserStorageKey(user?.email);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  loadSavedInvestigation: (config) => {
    get().setActiveConfig(config);
  },

  setSelectedMapLayer: (layer) => {
    set({ selectedMapLayer: layer });
  },

  setCustomCsvSession: ({ file, fileName, analysis, availableRange }) => {
    set({
      customCsvFile: file,
      customCsvFileName: fileName,
      customCsvAnalysis: analysis,
      customCsvAvailableRange: availableRange,
    });
  },

  clearCustomCsvSession: () => {
    set({
      customCsvFile: null,
      customCsvFileName: null,
      customCsvAnalysis: null,
      customCsvAvailableRange: null,
    });
  },

  openOnboarding: () => {
    set({ onboardingOpen: true, pendingOnboardingAuto: false });
  },

  openOnboardingIfAllowed: () => {
    if (isOnboardingAutoAllowed(false)) {
      set({ pendingOnboardingAuto: true });
    }
  },

  closeOnboarding: (dontShowAgain = false) => {
    try {
      sessionStorage.setItem(ONBOARDING_SESSION_KEY, '1');
      if (dontShowAgain) {
        localStorage.setItem(ONBOARDING_HIDDEN_KEY, '1');
      }
    } catch {
      // ignore storage failure
    }
    set({ onboardingOpen: false, pendingOnboardingAuto: false });
  },

  setPendingTourOnExplorer: (pending) => {
    set({ pendingTourOnExplorer: pending });
  },
}));
