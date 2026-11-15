export type SupportedLanguage = 'en' | 'ar' | 'de' | 'fr';

export type DataIntegrityStatus = 
  | 'VERIFIED'
  | 'DEMO_DATA'
  | 'UNAVAILABLE'
  | 'PENDING_BACKEND';

export type VariableId =
  | 'ndvi'
  | 'lst';

export type LstMode = 'day' | 'night' | 'both';

export type DatasetId =
  | 'MODIS_MOD13Q1'
  | 'MODIS_MOD11C3';

export type TemporalAggregation = 'daily' | 'monthly' | 'seasonal' | 'annual';

export interface EnvironmentalVariable {
  id: VariableId;
  code: string;
  unit: string;
  temporalResolution: string;
  spatialResolution: string;
  primarySource: string;
  colorScale: 'thermal' | 'precip' | 'soil' | 'veg';
  domainRange: [number, number];
  defaultDatasetId: DatasetId;
  doi?: string;
  historicalCoverage?: string;
  modes?: LstMode[];
}

export interface NasaDataset {
  id: DatasetId;
  shortName: string;
  provider: string;
  variableId: VariableId;
  timeCoverage: string;
  spatialResolution: string;
  temporalResolution: string;
  availabilityStatus: 'ONLINE' | 'DEMO_ARCHIVE' | 'PENDING_INGEST';
  doi: string;
}

export interface GeographicRegion {
  id: string;
  code: string;
  name?: string;
  name_ar?: string;
  name_de?: string;
  name_fr?: string;
  coordinates: [number, number]; // [lng, lat]
  bbox: [number, number, number, number]; // [west, south, east, north]
  areaKm2: number;
  climateZone: string;
  countryCode: string;
}

export interface TimeRange {
  startDate: string;
  endDate: string;
  aggregation: TemporalAggregation;
}

export interface InvestigationConfig {
  id: string;
  titleKey?: string;
  customTitle?: string;
  regionId: string;
  variableId: VariableId;
  lstMode?: LstMode;
  secondaryVariableId?: VariableId;
  datasetId: DatasetId;
  timeRange: TimeRange;
  customGeoJson?: any;
  createdAt: string;
  status: DataIntegrityStatus;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  climatologyMean: number;
  upperUncertainty: number;
  lowerUncertainty: number;
  anomaly: number;
  zScore?: number;
  trendLine?: number;
  qualityFlag: 'GOOD' | 'ESTIMATED' | 'INTERPOLATED';
}

export interface StatisticalMetrics {
  linearRegression: {
    slope: number;
    intercept: number;
    rSquared: number;
    unitPerDecade: number;
  };
  mannKendall: {
    tau: number;
    zScore: number;
    sStatistic?: number;
    varianceS?: number;
    trendDirection: 'INCREASING' | 'DECREASING' | 'NO_TREND';
    significant: boolean;
  };
  sensSlope: {
    slopePerYear: number;
    slopePerDecade: number;
    ciLower: number;
    ciUpper: number;
  };
  pValue: number;
  confidenceInterval95: [number, number];
  sampleCount: number;
  missingDataPercentage: number;
  dataStatus: DataIntegrityStatus;
}

export interface RasterStatisticsSummary {
  regionId: string;
  variableId: VariableId;
  lstMode?: LstMode | null;
  dayMean?: number | null;
  nightMean?: number | null;
  spatialResolution: string;
  unit: string;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
  validPixelCount: number;
  totalPixelCount: number;
  validCoveragePercent: number;
  missingCoveragePercent: number;
}

export interface LstComparisonPass {
  label: string;
  points: Array<{
    date: string;
    timestamp: number;
    value: number;
    anomaly?: number;
    zScore?: number;
    climatology?: number;
    trendLine?: number;
    confidenceUpper?: number;
    confidenceLower?: number;
  }>;
  statistics: {
    mean: number;
    stdDev: number;
    sensSlope: number;
    sensSlopePerYear: number;
    pValue: number;
    tau: number;
    zScore: number;
    significant: boolean;
    trendDirection: string;
    sampleSize: number;
  };
  unit: string;
}

export interface LstComparisonResult {
  mode: 'both';
  day: LstComparisonPass;
  night: LstComparisonPass;
  diurnalSpread: {
    label: string;
    points: Array<{
      date: string;
      timestamp: number;
      value: number;
      dayValue: number;
      nightValue: number;
      anomaly: number;
      zScore: number;
    }>;
    statistics: LstComparisonPass['statistics'];
    unit: string;
  };
  dayNightCorrelation: {
    pearsonR: number;
    spearmanRho: number;
    pValue: number;
    meanDiurnalRange: number;
    sampleSize: number;
  };
}

export interface SeasonalAnalysisSummary {
  monthlyClimatology: Array<{
    month: number;
    monthName: string;
    mean: number | null;
    std: number;
    min: number | null;
    max: number | null;
  }>;
  seasonalSummary: Array<{
    season: string;
    mean: number;
    std: number;
    trendDirection: string;
    pValue: number;
    slopePerYear: number;
  }>;
}

export interface TrendAnalysisResponse {
  config: InvestigationConfig;
  unit: string;
  dataSource: string;
  status: DataIntegrityStatus;
  series: TimeSeriesPoint[];
  statistics: StatisticalMetrics;
  rasterStatistics?: RasterStatisticsSummary;
  seasonal?: SeasonalAnalysisSummary;
  lstComparison?: LstComparisonResult;
  provenance?: Record<string, any>;
  gridCells: Array<{
    id: string;
    lat: number;
    lng: number;
    trendPerDecade: number;
    pValue: number;
    meanVal: number;
  }>;
}

export interface CorrelationPairPoint {
  date: string;
  xValue: number;
  yValue: number;
  season: 'DJF' | 'MAM' | 'JJA' | 'SON';
  ndviZ?: number;
  lstZ?: number;
  nightLst?: number;
}

export interface CorrelationResponse {
  regionId: string;
  varX: VariableId;
  varY: VariableId;
  lstMode?: LstMode;
  timeRange: TimeRange;
  pearsonR: number;
  pearsonPValue: number;
  spearmanRho: number;
  spearmanPValue: number;
  sampleSize: number;
  lagMonths: number;
  points: CorrelationPairPoint[];
  matrix: Record<VariableId, Record<VariableId, number>>;
  resolutionNotice?: string;
  nightCorrelation?: {
    pearsonR: number;
    spearmanRho: number;
    pValue: number;
    spearmanPValue?: number;
    rSquared?: number;
    sampleSize: number;
  } | null;
  lstComparison?: LstComparisonResult;
  coOccurringStressEpisodes?: Array<{
    date: string;
    ndvi: number;
    ndviZScore: number;
    lst: number;
    lstZScore: number;
    classification: string;
  }>;
  status: DataIntegrityStatus;
}

export interface AnomalyEvent {
  id: string;
  date: string;
  variableId: VariableId;
  regionId: string;
  observedValue: number;
  baselineValue: number;
  zScore: number;
  departurePercent: number;
  severity: 'MODERATE' | 'SEVERE' | 'EXTREME';
  spatialExtentKm2: number;
  description?: string;
  status: DataIntegrityStatus;
}

export interface AiScientistMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
  methodologyExplanation?: string;
  statisticalEvidence?: string[];
  potentialDrivers?: Array<{
    factor: string;
    impactWeight: string;
    mechanism: string;
  }>;
  limitationsAndUncertainties?: string[];
  citations?: string[];
  referencedMetrics?: {
    label: string;
    value: string;
    unit: string;
  }[];
  dataStatus: DataIntegrityStatus;
  language: SupportedLanguage;
}

export interface GeoJSONFeatureAdapterResult {
  featureCollection: GeoJSON.FeatureCollection;
  detectedRegions: GeographicRegion[];
  sourceType: 'CUSTOM_TEAM_FILE' | 'FALLBACK_BOUNDARIES';
  featureCount: number;
  bbox: [number, number, number, number];
}
