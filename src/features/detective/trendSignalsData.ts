import { VariableId, DatasetId, SupportedLanguage } from '../../types/scientific';

export interface GlobalTrendSignal {
  id: string;
  label: Record<SupportedLanguage, string>;
  direction: 'increasing' | 'decreasing';
  dotPosition: 'left' | 'right';
  /** Percentage position on the Nile Delta Satellite Canvas (0-100) */
  xPercent: number;
  yPercent: number;
  coordinates: [number, number]; // [lng, lat]
  variableId: VariableId;
  datasetId: DatasetId;
  regionId: string;
  satellite: string;
  spatialResolution: string;
  rateText: string;
  pValue: string;
  summary: Record<SupportedLanguage, string>;
  sparkline: number[];
}

export const GLOBAL_TREND_SIGNALS: GlobalTrendSignal[] = [
  {
    id: 'sig_beheira_reclamation',
    label: {
      en: '🇪🇬 Nile Delta: West Reclamation NDVI',
      ar: '🇪🇬 دلتا النيل: اخضرار غرب الدلتا (البحيرة)',
      de: '🇪🇬 Nildelta: Westdelta Begrünung (NDVI)',
      fr: '🇪🇬 Delta du Nil : Verdissement Ouest (Beheira)',
    },
    direction: 'increasing',
    dotPosition: 'right',
    xPercent: 58.4,
    yPercent: 32.6,
    coordinates: [30.42, 30.82],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'beheira_delta',
    satellite: 'NASA MODIS MOD13Q1.061 (250m)',
    spatialResolution: '250 m Native Grid',
    rateText: '+0.0110 NDVI / dec',
    pValue: 'p = 0.0002',
    summary: {
      en: 'Sustained canopy greening across West Nubariya and Beheira reclaimed agricultural lands in Egypt’s western Nile Delta (2000–2024).',
      ar: 'زيادة مستدامة في كثافة الغطاء النباتي في أراضي الاستصلاح غرب النوبارية والبحيرة غرب دلتا النيل (2000–2024).',
      de: 'Anhaltende Vegetationszunahme auf Neulandflächen in West-Nubariya und al-Buhaira (2000–2024).',
      fr: 'Progression durable du couvert végétal sur les terres bonifiées de Beheira et Noubariya (2000–2024).',
    },
    sparkline: [34, 36, 39, 41, 43, 46, 48, 50, 53, 56],
  },
  {
    id: 'sig_kafr_el_sheikh_lst',
    label: {
      en: '🇪🇬 Nile Delta: Kafr El-Sheikh LST',
      ar: '🇪🇬 دلتا النيل: حرارة السطح — كفر الشيخ',
      de: '🇪🇬 Nildelta: Kafr asch-Schaich LST',
      fr: '🇪🇬 Delta du Nil : Température (LST) — Kafr el-Cheikh',
    },
    direction: 'increasing',
    dotPosition: 'left',
    xPercent: 58.8,
    yPercent: 35.8,
    coordinates: [30.92, 31.25],
    variableId: 'lst',
    datasetId: 'MODIS_MOD11C3',
    regionId: 'kafr_el_sheikh',
    satellite: 'NASA MODIS MOD11C3.061 (Day & Night)',
    spatialResolution: '0.05° (~5.6 km CMG)',
    rateText: '+0.34 °C / dec',
    pValue: 'p = 0.0042',
    summary: {
      en: 'Northern Nile Delta skin-temperature warming across coastal rice & lagoon margins (2000–2024 Day & Night).',
      ar: 'ارتفاع حرارة سطح الأرض في الحزام الشمالي لدلتا النيل قرب البرلس نهاراً وليلاً (2000–2024).',
      de: 'Erwärmung der Landoberfläche im nördlichen Küsten- und Reisgürtel des Nildeltas (2000–2024).',
      fr: 'Réchauffement de surface dans la ceinture rizicole côtière nord du Delta du Nil (2000–2024).',
    },
    sparkline: [27.4, 27.6, 27.9, 27.8, 28.2, 28.4, 28.5, 28.7, 29.0, 29.2],
  },
  {
    id: 'sig_sahel_belt',
    label: {
      en: '🌍 African Sahel Greening Belt',
      ar: '🌍 إقليم الساحل الأفريقي (اخضرار NDVI)',
      de: '🌍 Afrikanischer Sahel-Gürtel (NDVI)',
      fr: '🌍 Ceinture sahélienne africaine (NDVI)',
    },
    direction: 'increasing',
    dotPosition: 'left',
    xPercent: 54.2,
    yPercent: 42.0,
    coordinates: [15.0, 14.5],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'sahel_region',
    satellite: 'NASA MODIS CMG / NASA POWER',
    spatialResolution: '0.05° CMG (~5.5 km)',
    rateText: '+0.0112 NDVI / dec',
    pValue: 'p = 0.0024',
    summary: {
      en: 'Semi-arid Sudano-Sahelian vegetation recovery driven by multi-decadal monsoon rainfall shifts and agro-forestry.',
      ar: 'تحسن الغطاء النباتي في حزام الساحل الأفريقي نتيجة تغير أنماط الأمطار الموسمية ومشاريع التشجير.',
      de: 'Vegetationszunahme in der Sahelzone durch Niederschlagsverschiebungen und Agroforstwirtschaft.',
      fr: 'Reprise végétale dans la bande sahélienne liée aux précipitations de mousson.',
    },
    sparkline: [21, 22, 23, 22, 24, 25, 26, 27, 28, 29],
  },
  {
    id: 'sig_amazon_basin',
    label: {
      en: '🌎 Amazon Basin Canopy Stress',
      ar: '🌎 حوض الأمازون (تراجع الغطاء النباتي)',
      de: '🌎 Amazonasbecken Kronendach-Stress',
      fr: '🌎 Bassin amazonien (Stress forestier)',
    },
    direction: 'decreasing',
    dotPosition: 'left',
    xPercent: 32.8,
    yPercent: 52.0,
    coordinates: [-62.0, -3.5],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'amazon_basin',
    satellite: 'NASA MODIS CMG 0.05°',
    spatialResolution: '0.05° CMG (~5.5 km)',
    rateText: '-0.0142 NDVI / dec',
    pValue: 'p = 0.0001',
    summary: {
      en: 'Regional canopy greenness decline across the Amazon basin driven by recurring severe droughts and deforestation — opposite to the global greening mean.',
      ar: 'انخفاض إقليمي في كثافة غابات الأمازون بسبب موجات الجفاف المتكررة وإزالة الغابات — بعكس المتوسط العالمي.',
      de: 'Regionaler Rückgang der Vegetationsdichte im Amazonasbecken durch Dürren und Entwaldung.',
      fr: 'Baisse régionale du NDVI en Amazonie sous l’effet des sécheresses et de la déforestation.',
    },
    sparkline: [79, 78, 78, 77, 76, 75, 75, 74, 73, 72],
  },
  {
    id: 'sig_california_valley',
    label: {
      en: '🌎 California Central Valley Drought',
      ar: '🌎 الوادي الأوسط بكاليفورنيا (إجهاد الجفاف)',
      de: '🌎 Kalifornisches Längstal Dürrestress',
      fr: '🌎 Vallée centrale de Californie',
    },
    direction: 'decreasing',
    dotPosition: 'left',
    xPercent: 16.5,
    yPercent: 29.6,
    coordinates: [-120.5, 36.8],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'california_central_valley',
    satellite: 'NASA MODIS CMG / NASA POWER',
    spatialResolution: '0.05° CMG (~5.5 km)',
    rateText: '-0.0094 NDVI / dec',
    pValue: 'p = 0.0180',
    summary: {
      en: 'Irrigated cropland fallowing and canopy stress across California’s Central Valley during multi-year western North American megadroughts.',
      ar: 'إجهاد الغطاء الزراعي المروي في الوادي الأوسط بكاليفورنيا جراء فترات الجفاف الطويلة ونقص المياه الجوفية.',
      de: 'Rückgang bewässerter Agrarflächen im kalifornischen Längstal infolge mehrjähriger Dürreperioden.',
      fr: 'Stress hydrique et mise en jachère dans la Vallée centrale de Californie.',
    },
    sparkline: [45, 44, 43, 44, 42, 41, 40, 41, 39, 38],
  },
  {
    id: 'sig_aral_sea',
    label: {
      en: '🌏 Aral Sea Basin Desiccation & Heating',
      ar: '🌏 حوض بحر آرال (تصحر وارتفاع حرارة)',
      de: '🌏 Aralsee-Becken Austrocknung',
      fr: '🌏 Bassin de la mer d’Aral',
    },
    direction: 'increasing',
    dotPosition: 'left',
    xPercent: 66.5,
    yPercent: 25.0,
    coordinates: [59.5, 45.0],
    variableId: 'lst',
    datasetId: 'MODIS_MOD11C3',
    regionId: 'aral_sea_basin',
    satellite: 'NASA MODIS MOD11C3.061',
    spatialResolution: '0.05° CMG (~5.5 km)',
    rateText: '+0.46 °C / dec',
    pValue: 'p = 0.0001',
    summary: {
      en: 'Rapid dryland surface heating (+0.46 °C/decade) and vegetation loss across the desiccated Aralkum basin in Central Asia.',
      ar: 'احترار سطحي متسارع (+0.46 °C/عقد) وتراجع الغطاء النباتي في حوض بحر آرال بآسيا الوسطى.',
      de: 'Starke Oberflächenerwärmung (+0.46 °C/Dekade) im ausgetrockneten Aralsee-Becken.',
      fr: 'Réchauffement rapide de surface (+0.46 °C/décennie) dans le bassin asséché de la mer d’Aral.',
    },
    sparkline: [23.8, 24.0, 24.2, 24.4, 24.5, 24.7, 24.9, 25.1, 25.3, 25.5],
  },
  {
    id: 'sig_global_mean',
    label: {
      en: '🌍 Global Land Mean Baseline (NASA GISS)',
      ar: '🌍 المتوسط العالمي لليابسة (مرجع ناسا)',
      de: '🌍 Globales Landmittel (NASA GISS)',
      fr: '🌍 Moyenne terrestre mondiale (NASA GISS)',
    },
    direction: 'increasing',
    dotPosition: 'right',
    xPercent: 41.5,
    yPercent: 42.0,
    coordinates: [0.0, 20.0],
    variableId: 'lst',
    datasetId: 'MODIS_MOD11C3',
    regionId: 'global_mean',
    satellite: 'NASA GISTEMP v4 / MODIS CMG',
    spatialResolution: 'Planetary Land Grid',
    rateText: '+0.24 °C / dec',
    pValue: 'p = 0.0001',
    summary: {
      en: 'Planetary land surface warming baseline (+0.24 °C/decade for LST; +0.0068 NDVI/decade global greening) for comparing regional anomalies.',
      ar: 'مرجع الاحترار العالمي لسطح اليابسة (+0.24 °C/عقد للحرارة و+0.0068 NDVI/عقد للاخضرار) لمقارنة الاتجاهات الإقليمية.',
      de: 'Globale Referenz der Landoberflächenerwärmung (+0.24 °C/Dekade) zum Vergleich regionaler Trends.',
      fr: 'Référence mondiale du réchauffement terrestre (+0.24 °C/décennie) pour comparer les tendances régionales.',
    },
    sparkline: [21.1, 21.2, 21.3, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9],
  },
];

export interface OnboardingTourStep {
  stepNumber: number;
  target: 'variable' | 'region' | 'period' | 'map' | 'analyze';
  title: Record<SupportedLanguage, string>;
  description: Record<SupportedLanguage, string>;
}

export const ONBOARDING_TOUR_STEPS: OnboardingTourStep[] = [
  {
    stepNumber: 1,
    target: 'variable',
    title: {
      en: 'Choose NDVI (250m) or Surface Temp (LST Day/Night)',
      ar: 'اختر مؤشر الغطاء النباتي (250م) أو حرارة سطح الأرض (نهار/ليل)',
      de: 'NDVI (250 m) oder Oberflächentemperatur (LST Tag/Nacht) wählen',
      fr: 'Choisir NDVI (250 m) ou Température de surface (Jour/Nuit)',
    },
    description: {
      en: 'Select MODIS MOD13Q1.061 Vegetation Index (250 m) or MOD11C3.061 Land Surface Temperature (Daytime, Nighttime, or Day & Night).',
      ar: 'اختر مؤشر الغطاء النباتي من ناسا MODIS أو درجة حرارة سطح الأرض (أثناء النهار، أو الليل، أو مقارنة النهار والليل).',
      de: 'Wählen Sie MODIS MOD13Q1.061 NDVI (250 m) oder MOD11C3.061 Landoberflächentemperatur (Tag, Nacht oder Tag & Nacht).',
      fr: 'Sélectionnez MODIS MOD13Q1.061 NDVI (250 m) ou MOD11C3.061 Température de surface (Jour, Nuit ou Jour & Nuit).',
    },
  },
  {
    stepNumber: 2,
    target: 'region',
    title: {
      en: 'Select a global or regional study area',
      ar: 'حدد منطقة دراسة عالمية أو إقليمية',
      de: 'Globale oder regionale Untersuchungszone wählen',
      fr: 'Choisir une région d’étude globale ou régionale',
    },
    description: {
      en: 'Choose the Global Land Mean, major global climate hotspots (Amazon, Sahel, California, Aral Sea), or high-resolution Nile Delta subregions.',
      ar: 'اختر المتوسط العالمي، أو بؤر المناخ العالمية (الأمازون، الساحل، كاليفورنيا، بحر آرال)، أو النموذج المرجعي عالي الدقة لدلتا النيل.',
      de: 'Wählen Sie das globale Landmittel, globale Klima-Hotspots oder hochauflösende Nildelta-Teilregionen.',
      fr: 'Choisissez la moyenne mondiale, des régions clés du monde ou les sous-régions haute résolution du Delta du Nil.',
    },
  },
  {
    stepNumber: 3,
    target: 'period',
    title: {
      en: 'Set the observation period',
      ar: 'حدد النافذة الزمنية للرصد',
      de: 'Beobachtungszeitraum festlegen',
      fr: 'Définir la période d’observation',
    },
    description: {
      en: 'Inspect MODIS NDVI and Daytime/Nighttime Land Surface Temperature continuously across 2000–2024.',
      ar: 'افحص سجل MODIS للغطاء النباتي وحرارة سطح الأرض نهاراً وليلاً بشكل متكامل من 2000 إلى 2024.',
      de: 'Analysieren Sie MODIS NDVI und Tag-/Nacht-LST durchgängig über 2000–2024.',
      fr: 'Explorez MODIS NDVI et LST Jour/Nuit en continu sur 2000–2024.',
    },
  },
  {
    stepNumber: 4,
    target: 'map',
    title: {
      en: 'Inspect global signals & interactive GIS layers',
      ar: 'افحص الإشارات العالمية وطبقات الخريطة التفاعلية',
      de: 'Globale Signale & GIS-Ebenen prüfen',
      fr: 'Inspecter les signaux globaux et couches SIG',
    },
    description: {
      en: 'Click any global or regional signal pin, or switch to Interactive GIS MapLibre to click any coordinate on Earth and inspect live satellite retrievals.',
      ar: 'اضغط على أي إشارة عالمية أو إقليمية، أو انتقل لخريطة GIS التفاعلية للنقر على أي إحداثية على الأرض وفحص بيانات الأقمار الصناعية.',
      de: 'Klicken Sie auf ein globales Signal oder wechseln Sie zur interaktiven GIS-Karte.',
      fr: 'Cliquez sur un signal global ou ouvrez la carte SIG interactive.',
    },
  },
  {
    stepNumber: 5,
    target: 'analyze',
    title: {
      en: 'Verify statistical significance & coupling',
      ar: 'تحقق من الدلالة الإحصائية والارتباط المشترك',
      de: 'Statistische Signifikanz prüfen',
      fr: 'Vérifier la significativité statistique',
    },
    description: {
      en: 'Click "Analyze trend" for real Mann-Kendall tests, Sen’s Slope, NDVI–LST correlation (Day/Night), and grounded Gemini AI synthesis.',
      ar: 'اضغط "تحليل الاتجاه" لحساب اختبار مان-كيندال، ميل سين، ارتباط الغطاء النباتي بحرارة السطح نهاراً وليلاً، وتفسير الذكاء الاصطناعي الموثق.',
      de: 'Klicken Sie auf „Trend analysieren“ für Mann-Kendall, Sen’s Steigung, NDVI-LST-Kopplung und KI-Synthese.',
      fr: 'Cliquez sur « Analyser la tendance » pour Mann-Kendall, pente de Sen, couplage NDVI-LST et synthèse IA.',
    },
  },
];

export const DETECTIVE_UI_LABELS: Record<
  SupportedLanguage,
  {
    heroTitle: string;
    heroSubtitle: string;
    step1Label: string;
    step1Placeholder: string;
    step2Label: string;
    step2Placeholder: string;
    step3Label: string;
    step3Placeholder: string;
    analyzeBtn: string;
    myCases: string;
    signIn: string;
    skipTour: string;
    back: string;
    next: string;
    finish: string;
    legendTitle: string;
    increasing: string;
    decreasing: string;
    legendFootnote: string;
    uploadGeoJson: string;
    investigateSignal: string;
    viewModeSignals: string;
    viewModeGis: string;
  }
> = {
  en: {
    heroTitle: 'Global & Regional Earth System Explorer',
    heroSubtitle: 'Investigate global & regional climate and vegetation trends across Earth — featuring high-resolution 250 m Nile Delta benchmarks & global hotspots.',
    step1Label: 'Variable',
    step1Placeholder: 'Choose a variable',
    step2Label: 'Study Region',
    step2Placeholder: 'Choose a region',
    step3Label: 'Period',
    step3Placeholder: 'Choose a period',
    analyzeBtn: 'Analyze trend',
    myCases: 'My cases',
    signIn: 'Sign in',
    skipTour: 'Skip tour',
    back: 'Back',
    next: 'Next',
    finish: 'Start exploring',
    legendTitle: 'Global & Regional Signals (2000–2024)',
    increasing: 'Increasing / Warming Trend',
    decreasing: 'Decreasing / Stress',
    legendFootnote: 'NASA MODIS (MOD13Q1 / MOD13C2 NDVI & MOD11C3 Day/Night LST) & NASA POWER across global hotspots & Nile Delta benchmark.',
    uploadGeoJson: 'Upload Custom GeoJSON',
    investigateSignal: 'Analyze this Earth signal',
    viewModeSignals: 'Earth Trend Signals',
    viewModeGis: 'Interactive GIS MapLibre',
  },
  ar: {
    heroTitle: 'مستكشف النظم البيئية العالمي والإقليمي',
    heroSubtitle: 'حلّل اتجاهات المناخ والغطاء النباتي عالمياً وإقليمياً عبر بيانات ناسا — مع نموذج تطبيقي عالي الدقة (250م) لدلتا النيل ومناطق العالم.',
    step1Label: 'المتغير البيئي',
    step1Placeholder: 'اختر متغير',
    step2Label: 'منطقة الدراسة',
    step2Placeholder: 'اختر منطقة',
    step3Label: 'الفترة الزمنية',
    step3Placeholder: 'اختر مدة',
    analyzeBtn: 'تحليل الاتجاه',
    myCases: 'حالاتي البحثية',
    signIn: 'تسجيل الدخول',
    skipTour: 'تخطي الجولة',
    back: 'السابق',
    next: 'التالي',
    finish: 'ابدأ الاستكشاف',
    legendTitle: 'الإشارات العالمية والإقليمية (2000–2024)',
    increasing: 'اتجاه متزايد / ارتفاع حرارة',
    decreasing: 'انخفاض / إجهاد نباتي',
    legendFootnote: 'بيانات ناسا MODIS و NASA POWER عبر البؤر المناخية العالمية والنموذج المرجعي لدلتا النيل.',
    uploadGeoJson: 'رفع ملف GeoJSON مخصص',
    investigateSignal: 'تحليل هذه الإشارة البيئية',
    viewModeSignals: 'خريطة الإشارات العالمية',
    viewModeGis: 'خريطة GIS التفاعلية',
  },
  de: {
    heroTitle: 'Globaler & Regionaler Erdsystem-Explorer',
    heroSubtitle: 'Analysieren Sie globale & regionale Klima- und Vegetationstrends — mit hochauflösendem 250 m Nildelta-Benchmark & globalen Hotspots.',
    step1Label: 'Variable',
    step1Placeholder: 'Variable wählen',
    step2Label: 'Untersuchungsregion',
    step2Placeholder: 'Region wählen',
    step3Label: 'Zeitraum',
    step3Placeholder: 'Zeitraum wählen',
    analyzeBtn: 'Trend analysieren',
    myCases: 'Meine Fälle',
    signIn: 'Anmelden',
    skipTour: 'Tour überspringen',
    back: 'Zurück',
    next: 'Weiter',
    finish: 'Erkundung starten',
    legendTitle: 'Globale & Regionale Signale (2000–2024)',
    increasing: 'Steigender Trend / Erwärmung',
    decreasing: 'Sinkend / Vegetationsstress',
    legendFootnote: 'NASA MODIS (250 m / 0.05°) & NASA POWER für globale Regionen und Nildelta-Benchmark.',
    uploadGeoJson: 'GeoJSON hochladen',
    investigateSignal: 'Dieses Signal analysieren',
    viewModeSignals: 'Globale Trend-Signale',
    viewModeGis: 'Interaktive GIS-Karte',
  },
  fr: {
    heroTitle: 'Explorateur Environnemental Global & Régional',
    heroSubtitle: 'Analysez les tendances climatiques et végétales globales et régionales — avec référence haute résolution 250 m du Delta du Nil.',
    step1Label: 'Variable',
    step1Placeholder: 'Choisir une variable',
    step2Label: 'Région d’étude',
    step2Placeholder: 'Choisir une région',
    step3Label: 'Période',
    step3Placeholder: 'Choisir une période',
    analyzeBtn: 'Analyser la tendance',
    myCases: 'Mes études',
    signIn: 'Connexion',
    skipTour: 'Passer le guide',
    back: 'Retour',
    next: 'Suivant',
    finish: 'Explorer',
    legendTitle: 'Signaux Globaux & Régionaux (2000–2024)',
    increasing: 'Hausse / Réchauffement',
    decreasing: 'Baisse / Stress végétal',
    legendFootnote: 'Données NASA MODIS & NASA POWER pour les régions mondiales et la référence du Delta du Nil.',
    uploadGeoJson: 'Importer GeoJSON',
    investigateSignal: 'Analyser ce signal',
    viewModeSignals: 'Signaux Globaux',
    viewModeGis: 'Carte SIG interactive',
  },
};
