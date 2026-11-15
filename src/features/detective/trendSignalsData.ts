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
    id: 'sig_kafr_el_sheikh_lst',
    label: {
      en: 'Kafr El-Sheikh Surface Temp (LST)',
      ar: 'حرارة سطح الأرض — كفر الشيخ',
      de: 'Kafr asch-Schaich Oberflächentemperatur (LST)',
      fr: 'Température de surface (LST) — Kafr el-Cheikh',
    },
    direction: 'increasing',
    dotPosition: 'left',
    xPercent: 45.0,
    yPercent: 25.0,
    coordinates: [30.92, 31.25],
    variableId: 'lst',
    datasetId: 'MODIS_MOD11C3',
    regionId: 'kafr_el_sheikh',
    satellite: 'NASA MODIS MOD11C3.061 (Day & Night)',
    spatialResolution: '0.05° (~5.6 km CMG)',
    rateText: '+0.34 °C / dec (Day)',
    pValue: 'p = 0.0042',
    summary: {
      en: 'Northern Delta skin-temperature warming across coastal rice & fish-farm margins (2000–2024 Day & Night).',
      ar: 'ارتفاع حرارة سطح الأرض في الحزام الشمالي وزراعات الأرز قرب البرلس نهاراً وليلاً (2000–2024).',
      de: 'Erwärmung der Landoberfläche im nördlichen Küsten- und Reisgürtel (Tag & Nacht, 2000–2024).',
      fr: 'Réchauffement de surface dans la ceinture rizicole côtière nord (Jour & Nuit, 2000–2024).',
    },
    sparkline: [27.4, 27.6, 27.9, 27.8, 28.2, 28.4, 28.5, 28.7, 29.0, 29.2],
  },
  {
    id: 'sig_damietta_ndvi',
    label: {
      en: 'Damietta Estuary NDVI',
      ar: 'الغطاء النباتي — دمياط',
      de: 'Damiette-Mündung NDVI',
      fr: 'NDVI Estuaire de Damiette',
    },
    direction: 'decreasing',
    dotPosition: 'right',
    xPercent: 68.0,
    yPercent: 22.0,
    coordinates: [31.72, 31.36],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'damietta',
    satellite: 'NASA MODIS MOD13Q1.061',
    spatialResolution: '250 m Native Grid',
    rateText: '-0.019 NDVI / dec',
    pValue: 'p = 0.0038',
    summary: {
      en: 'Coastal soil salinity pressure and urban-estuarine fringe compression near Damietta branch mouth.',
      ar: 'ضغوط الملوحة الساحلية وتقلص الهامش الزراعي قرب مصب فرع دمياط.',
      de: 'Küstenversalzung und Flächenverdichtung an der Mündung des Damiette-Nilarms.',
      fr: 'Pression saline côtière et rétrécissement périurbain à l’embouchure de Damiette.',
    },
    sparkline: [58, 57, 56, 55, 55, 53, 52, 51, 50, 49],
  },
  {
    id: 'sig_beheira_reclamation',
    label: {
      en: 'Beheira / West Delta Greening',
      ar: 'اخضرار غرب الدلتا — البحيرة',
      de: 'Westdelta (al-Buhaira) NDVI',
      fr: 'Verdissement Ouest-Delta (Beheira)',
    },
    direction: 'increasing',
    dotPosition: 'left',
    xPercent: 25.0,
    yPercent: 45.0,
    coordinates: [30.42, 30.82],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'beheira_delta',
    satellite: 'NASA MODIS MOD13Q1.061',
    spatialResolution: '250 m Native Grid',
    rateText: '+0.038 NDVI / dec',
    pValue: 'p = 0.0002',
    summary: {
      en: 'Sustained canopy greening across West Nubariya and Beheira reclaimed agricultural lands (2000–2024).',
      ar: 'زيادة مستدامة في كثافة الغطاء النباتي في أراضي الاستصلاح غرب النوبارية والبحيرة (2000–2024).',
      de: 'Anhaltende Vegetationszunahme auf Neulandflächen in West-Nubariya und al-Buhaira (2000–2024).',
      fr: 'Progression durable du couvert végétal sur les terres bonifiées de Beheira et Noubariya (2000–2024).',
    },
    sparkline: [34, 36, 39, 41, 43, 46, 48, 50, 53, 56],
  },
  {
    id: 'sig_gharbia_core',
    label: {
      en: 'Gharbia Alluvial Core NDVI',
      ar: 'قلب الدلتا الزراعي — الغربية',
      de: 'Zentraldelta (al-Gharbiyya)',
      fr: 'Cœur alluvial — Gharbia',
    },
    direction: 'increasing',
    dotPosition: 'left',
    xPercent: 48.0,
    yPercent: 46.0,
    coordinates: [31.02, 30.86],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'gharbia',
    satellite: 'NASA MODIS MOD13Q1.061',
    spatialResolution: '250 m Native Grid',
    rateText: '+0.008 NDVI / dec',
    pValue: 'p = 0.0184',
    summary: {
      en: 'High-intensity double-cropping stability between the Rosetta and Damietta Nile branches.',
      ar: 'استقرار زراعي مكثف ثنائي المواسم بين فرعي رشيد ودمياط.',
      de: 'Stabile intensive Zweifachernte zwischen Rosetta- und Damiette-Nilarm.',
      fr: 'Stabilité agricole intensive à double récolte entre les branches de Rosette et Damiette.',
    },
    sparkline: [58, 59, 60, 59, 61, 60, 62, 61, 62, 63],
  },
  {
    id: 'sig_dakahlia_lst',
    label: {
      en: 'Dakahlia Nighttime Heat Retention',
      ar: 'حرارة السطح الليلية — الدقهلية',
      de: 'ad-Daqahliyya Nacht-LST',
      fr: 'Température nocturne (LST) — Dakahlia',
    },
    direction: 'increasing',
    dotPosition: 'right',
    xPercent: 62.0,
    yPercent: 38.0,
    coordinates: [31.52, 31.05],
    variableId: 'lst',
    datasetId: 'MODIS_MOD11C3',
    regionId: 'dakahlia',
    satellite: 'NASA MODIS MOD11C3.061 (Night)',
    spatialResolution: '0.05° (~5.6 km CMG)',
    rateText: '+0.41 °C / dec (Night)',
    pValue: 'p = 0.0014',
    summary: {
      en: 'Faster nighttime surface warming than daytime cooling decline across the East-Central Damietta Basin (2000–2024).',
      ar: 'تسارع ارتفاع حرارة سطح الأرض ليلاً مقارنة بالنهار في حوض الدقهلية وشرق فرع دمياط (2000–2024).',
      de: 'Stärkere nächtliche Oberflächentemperatur-Zunahme im östlichen Zentraldelta (2000–2024).',
      fr: 'Hausse nocturne marquée de la température de surface dans le bassin de Dakahlia (2000–2024).',
    },
    sparkline: [17.1, 17.3, 17.5, 17.6, 17.8, 17.9, 18.1, 18.2, 18.4, 18.6],
  },
  {
    id: 'sig_ismailia_canal',
    label: {
      en: 'Ismailia Canal Expansion',
      ar: 'ممر ترعة الإسماعيلية',
      de: 'Ismailia-Kanal Korridor',
      fr: 'Corridor Canal d’Ismaïlia',
    },
    direction: 'increasing',
    dotPosition: 'right',
    xPercent: 79.0,
    yPercent: 58.0,
    coordinates: [32.02, 30.56],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'ismailia_canal',
    satellite: 'NASA MODIS MOD13Q1.061',
    spatialResolution: '250 m Native Grid',
    rateText: '+0.042 NDVI / dec',
    pValue: 'p = 0.0001',
    summary: {
      en: 'Strong irrigation-driven biomass increase along the Eastern Delta Ismailia Canal corridor.',
      ar: 'نمو متسارع للكتلة الحيوية الزراعية بفضل مشاريع الري على طول ممر ترعة الإسماعيلية.',
      de: 'Starker bewässerungsbedingter Vegetationszuwachs entlang des Ismailia-Kanals im Ostdelta.',
      fr: 'Forte hausse de biomasse irriguée le long du corridor du canal d’Ismaïlia (Delta oriental).',
    },
    sparkline: [26, 28, 31, 33, 36, 38, 40, 42, 45, 48],
  },
  {
    id: 'sig_qalyubia_apex',
    label: {
      en: 'Qalyubia Southern Apex',
      ar: 'رأس الدلتا — القليوبية',
      de: 'Südlicher Deltascheitel (Qalyubiyya)',
      fr: 'Apex Sud — Qalyubia',
    },
    direction: 'decreasing',
    dotPosition: 'left',
    xPercent: 51.0,
    yPercent: 74.0,
    coordinates: [31.22, 30.30],
    variableId: 'ndvi',
    datasetId: 'MODIS_MOD13Q1',
    regionId: 'qalyubia',
    satellite: 'NASA MODIS MOD13Q1.061',
    spatialResolution: '250 m Native Grid',
    rateText: '-0.024 NDVI / dec',
    pValue: 'p = 0.0008',
    summary: {
      en: 'Peri-urban encroachment reducing vegetated cropland cover near the southern Nile Delta bifurcation.',
      ar: 'تأثير التمدد العمراني على تقلص الغطاء الزراعي عند رأس الدلتا الجنوبي في القليوبية.',
      de: 'Periurbane Versiegelung reduziert Ackerflächen am südlichen Deltascheitel.',
      fr: 'L’expansion périurbaine réduit le couvert cultivé à l’apex sud du Delta du Nil.',
    },
    sparkline: [58, 56, 55, 54, 52, 51, 50, 48, 47, 45],
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
      en: 'Select a Nile Delta subregion or draw polygon',
      ar: 'حدد إحدى محافظات دلتا النيل أو ارسم مضلعاً',
      de: 'Nildelta-Teilregion oder Polygon wählen',
      fr: 'Choisir une sous-région du Delta du Nil',
    },
    description: {
      en: 'Pick from the 9 agricultural Nile Delta subregions, draw a custom polygon directly on the map, or upload a Nile Delta GeoJSON.',
      ar: 'اختر من بين 9 مناطق زراعية داخل دلتا النيل، أو ارسم نطاقك المخصص على الخريطة التفاعلية.',
      de: 'Wählen Sie eine der 9 Nildelta-Subregionen, zeichnen Sie ein Polygon oder laden Sie ein Nildelta-GeoJSON hoch.',
      fr: 'Choisissez parmi 9 sous-régions agricoles du Delta du Nil ou dessinez un polygone sur la carte.',
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
      en: 'Inspect pixels & raster layers across the Nile Delta',
      ar: 'افحص البكسل والطبقات الفضائية عبر دلتا النيل',
      de: 'Pixel & Rasterebenen im Nildelta prüfen',
      fr: 'Inspecter les pixels et couches dans le Delta du Nil',
    },
    description: {
      en: 'Click any Nile Delta hotspot or switch to Interactive GIS MapLibre to inspect live pixel values and draw custom polygons.',
      ar: 'اضغط على أي إشارة في الدلتا أو انتقل لخريطة GIS التفاعلية لفحص قيم البكسل الحقيقية ورسم المضلعات.',
      de: 'Klicken Sie auf ein Nildelta-Signal oder wechseln Sie zur GIS-Karte für Live-Pixelinspektion.',
      fr: 'Cliquez sur un signal du Delta ou ouvrez la carte SIG pour inspecter les pixels en direct.',
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
    heroTitle: 'Nile Delta Environmental Explorer',
    heroSubtitle: 'Monitor MODIS NDVI (250 m) and MODIS Land Surface Temperature (Day & Night) across Egypt’s Nile Delta.',
    step1Label: 'Variable',
    step1Placeholder: 'Choose a variable',
    step2Label: 'Nile Delta Region',
    step2Placeholder: 'Choose Nile Delta subregion',
    step3Label: 'Period',
    analyzeBtn: 'Analyze trend',
    myCases: 'My cases',
    signIn: 'Sign in',
    skipTour: 'Skip tour',
    back: 'Back',
    next: 'Next',
    finish: 'Start exploring',
    legendTitle: 'Nile Delta Signals (2000–2024)',
    increasing: 'Increasing / Warming Trend',
    decreasing: 'Decreasing / Stress',
    legendFootnote: 'NASA MOD13Q1 (250 m NDVI) & MOD11C3 (Day/Night LST) strictly scoped to Nile Delta, Egypt.',
    uploadGeoJson: 'Upload Nile Delta GeoJSON',
    investigateSignal: 'Analyze this Nile Delta signal',
    viewModeSignals: 'Nile Delta Signals',
    viewModeGis: 'Interactive GIS MapLibre',
  },
  ar: {
    heroTitle: 'مستكشف دلتا النيل البيئي',
    heroSubtitle: 'راقب مؤشر الغطاء النباتي MODIS (250م) ودرجة حرارة سطح الأرض (نهاراً وليلاً) عبر دلتا النيل في مصر.',
    step1Label: 'المتغير البيئي',
    step1Placeholder: 'اختر متغير',
    step2Label: 'منطقة دلتا النيل',
    step2Placeholder: 'اختر محافظة في الدلتا',
    step3Label: 'الفترة الزمنية',
    analyzeBtn: 'تحليل الاتجاه',
    myCases: 'حالاتي البحثية',
    signIn: 'تسجيل الدخول',
    skipTour: 'تخطي الجولة',
    back: 'السابق',
    next: 'التالي',
    finish: 'ابدأ الاستكشاف',
    legendTitle: 'إشارات دلتا النيل (2000–2024)',
    increasing: 'اتجاه متزايد / ارتفاع حرارة',
    decreasing: 'انخفاض / إجهاد نباتي',
    legendFootnote: 'بيانات ناسا MOD13Q1 (250 م) و MOD11C3 (نهار وليل) مقيدة بنطاق دلتا النيل.',
    uploadGeoJson: 'رفع ملف GeoJSON داخل الدلتا',
    investigateSignal: 'تحليل إشارة دلتا النيل',
    viewModeSignals: 'إشارات دلتا النيل',
    viewModeGis: 'خريطة GIS التفاعلية',
  },
  de: {
    heroTitle: 'Nildelta Umwelt-Explorer',
    heroSubtitle: 'Analysieren Sie MODIS NDVI (250 m) und MODIS Landoberflächentemperatur (Tag & Nacht) im ägyptischen Nildelta.',
    step1Label: 'Variable',
    step1Placeholder: 'Variable wählen',
    step2Label: 'Nildelta-Region',
    step2Placeholder: 'Teilregion im Nildelta wählen',
    step3Label: 'Zeitraum',
    analyzeBtn: 'Trend analysieren',
    myCases: 'Meine Fälle',
    signIn: 'Anmelden',
    skipTour: 'Tour überspringen',
    back: 'Zurück',
    next: 'Weiter',
    finish: 'Erkundung starten',
    legendTitle: 'Nildelta-Signale (2000–2024)',
    increasing: 'Steigender Trend / Erwärmung',
    decreasing: 'Sinkend / Vegetationsstress',
    legendFootnote: 'NASA MOD13Q1 (250 m) & MOD11C3 (Tag/Nacht LST) strikt für das Nildelta.',
    uploadGeoJson: 'Nildelta-GeoJSON laden',
    investigateSignal: 'Dieses Nildelta-Signal analysieren',
    viewModeSignals: 'Nildelta-Signale',
    viewModeGis: 'Interaktive GIS-Karte',
  },
  fr: {
    heroTitle: 'Explorateur du Delta du Nil',
    heroSubtitle: 'Surveillez le NDVI MODIS (250 m) et la température de surface MODIS (Jour & Nuit) dans le Delta du Nil.',
    step1Label: 'Variable',
    step1Placeholder: 'Choisir une variable',
    step2Label: 'Sous-région du Delta',
    step2Placeholder: 'Choisir une zone du Delta',
    step3Label: 'Période',
    analyzeBtn: 'Analyser la tendance',
    myCases: 'Mes études',
    signIn: 'Connexion',
    skipTour: 'Passer le guide',
    back: 'Retour',
    next: 'Suivant',
    finish: 'Explorer',
    legendTitle: 'Signaux Delta du Nil (2000–2024)',
    increasing: 'Hausse / Réchauffement',
    decreasing: 'Baisse / Stress végétal',
    legendFootnote: 'Données NASA MOD13Q1 (250 m) & MOD11C3 (Jour/Nuit) limitées au Delta du Nil.',
    uploadGeoJson: 'Importer GeoJSON Delta du Nil',
    investigateSignal: 'Analyser ce signal du Delta',
    viewModeSignals: 'Signaux Delta du Nil',
    viewModeGis: 'Carte SIG interactive',
  },
};
