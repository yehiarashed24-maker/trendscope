import { GeographicRegion, LstMode, SupportedLanguage, VariableId } from '../../types/scientific';

export type OnboardingQuestionId =
  | 'ndvi_greening'
  | 'lst_surface'
  | 'coupled_compare'
  | 'map_explorer'
  | 'ai_scientist'
  | 'custom_csv';

export type TargetRoute = '/analysis' | '/intelligence' | '/explorer' | '/workspace' | '/reports';

export interface LocalizedText {
  en: string;
  ar: string;
  de: string;
  fr: string;
}

export interface OnboardingQuestionOption {
  id: OnboardingQuestionId;
  variableId: VariableId;
  targetRoute: TargetRoute;
  isCsvFlow?: boolean;
  question: LocalizedText;
  sensorTag: LocalizedText;
  description: LocalizedText;
}

export interface OnboardingLstModeOption {
  id: LstMode;
  label: LocalizedText;
  windowTag: LocalizedText;
  description: LocalizedText;
}

export const LST_MODE_OPTIONS: OnboardingLstModeOption[] = [
  {
    id: 'day',
    label: {
      en: 'Daytime',
      ar: 'أثناء النهار (Daytime)',
      de: 'Tag (Daytime)',
      fr: 'Jour (Daytime)',
    },
    windowTag: {
      en: '~10:30 LT · Terra overpass',
      ar: '~10:30 صباحاً · مرور Terra',
      de: '~10:30 Uhr · Terra-Überflug',
      fr: '~10h30 · passage Terra',
    },
    description: {
      en: 'Surface skin heating under peak solar load',
      ar: 'حرارة سطح الأرض نفسه تحت ذروة الإشعاع الشمسي',
      de: 'Aufheizung der Landoberfläche unter Sonneneinstrahlung',
      fr: 'Échauffement de la surface au maximum solaire',
    },
  },
  {
    id: 'night',
    label: {
      en: 'Nighttime',
      ar: 'أثناء الليل (Nighttime)',
      de: 'Nacht (Nighttime)',
      fr: 'Nuit (Nighttime)',
    },
    windowTag: {
      en: '~22:30 LT · Terra overpass',
      ar: '~10:30 مساءً · مرور Terra',
      de: '~22:30 Uhr · Terra-Überflug',
      fr: '~22h30 · passage Terra',
    },
    description: {
      en: 'Nocturnal cooling and retained urban/soil heat',
      ar: 'تبريد سطح الأرض ليلاً والحرارة المحتبسة بعد الغروب',
      de: 'Nächtliche Abkühlung und gespeicherte Wärme',
      fr: 'Refroidissement nocturne et chaleur retenue',
    },
  },
  {
    id: 'both',
    label: {
      en: 'Day & Night',
      ar: 'نهاراً وليلاً (Day & Night)',
      de: 'Tag & Nacht (Day & Night)',
      fr: 'Jour & Nuit (Day & Night)',
    },
    windowTag: {
      en: 'Diurnal spread · Day − Night',
      ar: 'مقارنة النهار والليل · المدى اليومي',
      de: 'Tag-Nacht-Vergleich · Spreizung',
      fr: 'Comparaison Jour vs Nuit',
    },
    description: {
      en: 'Compare daytime heating against nighttime cooling trends',
      ar: 'مقارنة تسخين النهار بمعدل تبريد الليل في نفس المنطقة',
      de: 'Tageserwärmung und Nachtabkühlung direkt vergleichen',
      fr: 'Comparer réchauffement diurne et refroidissement nocturne',
    },
  },
];

export interface OnboardingTimeSpanOption {
  id: string;
  startDate: string;
  endDate: string;
  yearsLabel: string;
  recommended?: boolean;
  title: LocalizedText;
  description: LocalizedText;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestionOption[] = [
  {
    id: 'ndvi_greening',
    variableId: 'ndvi',
    targetRoute: '/analysis',
    question: {
      en: 'Is cropland greening or declining',
      ar: 'هل الغطاء النباتي يزداد أم يتراجع',
      de: 'Nimmt die Vegetation zu oder ab',
      fr: 'La végétation verdit-elle ou décline-t-elle',
    },
    sensorTag: {
      en: 'NDVI · MODIS 250 m',
      ar: 'NDVI · قمر MODIS 250 م',
      de: 'NDVI · MODIS 250 m',
      fr: 'NDVI · MODIS 250 m',
    },
    description: {
      en: 'Crop vigor and seasonal density across 2000–2024',
      ar: 'كثافة المحاصيل وصحة النبات من 2000 إلى 2024',
      de: 'Pflanzenvitalität von 2000 bis 2024',
      fr: 'Vigueur et densité des cultures sur 2000–2024',
    },
  },
  {
    id: 'lst_surface',
    variableId: 'lst',
    targetRoute: '/analysis',
    question: {
      en: 'Is the land surface heating day or night',
      ar: 'هل ترتفع حرارة سطح الأرض نهاراً أم ليلاً',
      de: 'Erwärmt sich die Landoberfläche tags oder nachts',
      fr: 'La surface terrestre se réchauffe-t-elle jour ou nuit',
    },
    sensorTag: {
      en: 'LST · MODIS MOD11C3',
      ar: 'حرارة السطح · MODIS MOD11C3',
      de: 'LST · MODIS MOD11C3',
      fr: 'LST · MODIS MOD11C3',
    },
    description: {
      en: 'Land surface temperature (not air temp) · Daytime, Nighttime or Both',
      ar: 'درجة حرارة سطح الأرض نفسه (وليس الهواء) · نهاراً أو ليلاً أو مقارنة',
      de: 'Landoberflächentemperatur (nicht Luft) · Tag, Nacht oder beides',
      fr: 'Température de surface du sol (pas l’air) · Jour, Nuit ou les deux',
    },
  },
  {
    id: 'coupled_compare',
    variableId: 'lst',
    targetRoute: '/intelligence',
    question: {
      en: 'Compare vegetation cover and surface heat',
      ar: 'مقارنة الغطاء النباتي بحرارة سطح الأرض',
      de: 'Vegetation und Oberflächentemperatur vergleichen',
      fr: 'Comparer végétation et température de surface',
    },
    sensorTag: {
      en: 'Coupled lab · NDVI vs LST',
      ar: 'مختبر المقارنة · NDVI و LST',
      de: 'Vergleichslabor · NDVI vs LST',
      fr: 'Labo comparatif · NDVI vs LST',
    },
    description: {
      en: 'Track how vegetation cooling couples with daytime/nighttime surface heat',
      ar: 'تحليل الارتباط بين كثافة الغطاء النباتي وحرارة سطح الأرض نهاراً وليلاً',
      de: 'Zusammenspiel von Pflanzendecke und Oberflächentemperatur 2000–2024',
      fr: 'Couplage entre densité végétale et chaleur de surface sur 2000–2024',
    },
  },
  {
    id: 'map_explorer',
    variableId: 'ndvi',
    targetRoute: '/explorer',
    question: {
      en: 'Inspect satellite rasters on the map',
      ar: 'استكشاف طبقات الأقمار على الخريطة',
      de: 'Satellitenraster auf der Karte prüfen',
      fr: 'Inspecter les couches sur la carte',
    },
    sensorTag: {
      en: 'Earth explorer · Pixel inspect',
      ar: 'مستكشف الخريطة · فحص البكسل',
      de: 'Karten-Explorer · Pixelprüfung',
      fr: 'Explorateur carte · Inspection pixel',
    },
    description: {
      en: 'Browse Delta boundaries and click any coordinate',
      ar: 'استعرض محافظات الدلتا واضغط على أي نقطة للقراءة الفعلية',
      de: 'Deltazonen ansehen und Koordinaten abfragen',
      fr: 'Parcourir le Delta et interroger chaque pixel',
    },
  },
  {
    id: 'ai_scientist',
    variableId: 'ndvi',
    targetRoute: '/workspace',
    question: {
      en: 'Review drivers and statistical limits',
      ar: 'تفسير الأسباب والقيود العلمية',
      de: 'Ursachen und Grenzen auswerten',
      fr: 'Analyser causes et limites statistiques',
    },
    sensorTag: {
      en: 'Scientist lab · Grounded Q&A',
      ar: 'مختبر التفسير العلمي',
      de: 'Wissenschaftslabor · Analyse',
      fr: 'Labo scientifique · Synthèse',
    },
    description: {
      en: 'Inspect Mann-Kendall significance, drivers and caveats',
      ar: 'مراجعة الدلالة الإحصائية والمسببات الفيزيائية للبيانات',
      de: 'Mann-Kendall-Signifikanz und Einflussfaktoren prüfen',
      fr: 'Significativité Mann-Kendall et facteurs physiques',
    },
  },
  {
    id: 'custom_csv',
    variableId: 'ndvi',
    targetRoute: '/analysis',
    isCsvFlow: true,
    question: {
      en: 'Analyze a custom CSV time series',
      ar: 'تحليل ملف CSV خاص بك',
      de: 'Eigene CSV-Zeitreihe auswerten',
      fr: 'Analyser un fichier CSV personnel',
    },
    sensorTag: {
      en: 'CSV upload · Trend & PDF',
      ar: 'رفع CSV · تحليل وتقرير PDF',
      de: 'CSV-Import · Trend & PDF',
      fr: 'Import CSV · Tendance & PDF',
    },
    description: {
      en: 'Upload Date and Value columns for instant tests and PDF',
      ar: 'ارفع ملف قياساتك لحساب الاتجاه وتصدير تقرير باسم الملف',
      de: 'Datum/Wert-Tabelle hochladen für Test und PDF-Bericht',
      fr: 'Importer Date et Valeur pour l’analyse et le PDF',
    },
  },
];

export const FEATURED_REGION_IDS = [
  'nile_delta',
  'kafr_el_sheikh',
  'gharbia',
  'beheira_delta',
  'sharqia_delta',
];

export const REGION_SHORT_SUBTITLES: Record<string, LocalizedText> = {
  nile_delta: {
    en: 'Basin-wide baseline across all governorates',
    ar: 'النظرة الشاملة لكامل دلتا النيل',
    de: 'Gesamtüberblick über alle Gouvernements',
    fr: 'Référence globale sur tout le Delta',
  },
  kafr_el_sheikh: {
    en: 'Northern coastal lagoons and rice belt',
    ar: 'البحيرات الشمالية وحزام الأرز',
    de: 'Nördliche Küstenlagunen und Reisgürtel',
    fr: 'Lagunes côtières et ceinture rizicole',
  },
  gharbia: {
    en: 'Central alluvial core between Nile branches',
    ar: 'القلب الزراعي الأوسط بين الفرعين',
    de: 'Zentraler Schwemmlandkern',
    fr: 'Cœur alluvial entre les deux branches',
  },
  beheira_delta: {
    en: 'Western plain and Nubariya reclamation',
    ar: 'غرب الدلتا ومناطق استصلاح النوبارية',
    de: 'Westdelta und Nubariya-Neuland',
    fr: 'Plaine ouest et bonification de Noubariya',
  },
  sharqia_delta: {
    en: 'Eastern basin and Salhia corridor',
    ar: 'الحوض الشرقي وممر الصالحية',
    de: 'Östliches Agrarbecken und Salhia',
    fr: 'Bassin oriental et corridor de Salhia',
  },
};

export function getTimeSpanOptions(
  _variableId?: VariableId
): OnboardingTimeSpanOption[] {
  return [
    {
      id: 'modis_5y',
      startDate: '2020-01-01',
      endDate: '2024-12-31',
      yearsLabel: '2020–2024',
      title: {
        en: '5 years',
        ar: '5 سنوات',
        de: '5 Jahre',
        fr: '5 ans',
      },
      description: {
        en: 'Recent warming and crop anomalies',
        ar: 'التغيرات الحديثة خلال آخر 5 سنوات',
        de: 'Aktuelle Veränderungen der letzten 5 Jahre',
        fr: 'Évolutions récentes sur 5 ans',
      },
    },
    {
      id: 'modis_10y',
      startDate: '2015-01-01',
      endDate: '2024-12-31',
      yearsLabel: '2015–2024',
      title: {
        en: '10 years',
        ar: '10 سنوات',
        de: '10 Jahre',
        fr: '10 ans',
      },
      description: {
        en: 'Decadal balance across NDVI and LST',
        ar: 'توازن عقدي مشترك بين الغطاء النباتي وحرارة السطح',
        de: 'Dekadenvergleich von NDVI und LST',
        fr: 'Bilan décennal NDVI et température de surface',
      },
    },
    {
      id: 'modis_full',
      startDate: '2000-02-18',
      endDate: '2024-12-31',
      yearsLabel: '2000–2024',
      recommended: true,
      title: {
        en: '25 years (full)',
        ar: '25 سنة (السجل الكامل)',
        de: '25 Jahre (voll)',
        fr: '25 ans (complet)',
      },
      description: {
        en: 'Full Terra MODIS overlap for highest test power',
        ar: 'السجل المشترك الكامل لأعلى دقة إحصائية لمان-كيندال',
        de: 'Volle Terra-MODIS-Reihe für höchste Teststärke',
        fr: 'Série Terra MODIS complète pour la meilleure puissance',
      },
    },
  ];
}

export function getRegionDisplayName(region: GeographicRegion, lang: SupportedLanguage): string {
  if (lang === 'ar' && region.name_ar) return region.name_ar;
  if (lang === 'de' && region.name_de) return region.name_de;
  if (lang === 'fr' && region.name_fr) return region.name_fr;
  return region.name || region.code || region.id;
}

export const ONBOARDING_COPY = {
  contextTag: {
    en: 'Nile Delta · MODIS MOD13Q1 & MOD11C3',
    ar: 'دلتا النيل · MODIS MOD13Q1 و MOD11C3',
    de: 'Nildelta · MODIS MOD13Q1 & MOD11C3',
    fr: 'Delta du Nil · MODIS MOD13Q1 & MOD11C3',
  },
  welcomeTitle: {
    en: 'Configure a satellite investigation',
    ar: 'إعداد فحص بيئي لدلتا النيل',
    de: 'Satellitenanalyse einrichten',
    fr: 'Configurer une analyse satellite',
  },
  welcomeSubtitle: {
    en: 'Select a NASA Earth observation metric, a Nile Delta region and a time span to test whether observed changes are statistically real.',
    ar: 'اختر المتغير الفضائي، والمنطقة داخل دلتا النيل، والفترة الزمنية لاختبار هل التغير حقيقي إحصائياً أم تذبذب موسمي.',
    de: 'Wählen Sie eine NASA-Messgröße, eine Nildelta-Region und einen Zeitraum, um echte Trends statistisch zu prüfen.',
    fr: 'Choisissez une variable NASA, une zone du Delta et une période pour tester la significativité des tendances.',
  },
  miniSteps: [
    {
      num: '01',
      label: { en: 'Question', ar: 'السؤال', de: 'Fragestellung', fr: 'Question' },
      detail: {
        en: 'Vegetation (NDVI), surface temp (Day/Night), compare or CSV',
        ar: 'الغطاء النباتي، حرارة السطح (نهار/ليل)، مقارنة أو CSV',
        de: 'Vegetation (NDVI), Oberflächentemperatur (Tag/Nacht), Vergleich oder CSV',
        fr: 'Végétation (NDVI), température de surface (Jour/Nuit), comparaison ou CSV',
      },
    },
    {
      num: '02',
      label: { en: 'Study zone', ar: 'المنطقة', de: 'Gebiet', fr: 'Zone' },
      detail: {
        en: '10 Delta subregions or custom GeoJSON',
        ar: '10 مناطق بالدلتا أو حدود GeoJSON مخصصة',
        de: '10 Deltazonen oder eigenes GeoJSON',
        fr: '10 sous-régions ou GeoJSON personnalisé',
      },
    },
    {
      num: '03',
      label: { en: 'Record span', ar: 'الفترة الزمنية', de: 'Zeitraum', fr: 'Période' },
      detail: {
        en: '3 to 25 years of Mann-Kendall testing',
        ar: 'من 3 إلى 25 سنة مع اختبار مان-كيندال',
        de: '3 bis 25 Jahre Mann-Kendall-Prüfung',
        fr: '3 à 25 ans de tests Mann-Kendall',
      },
    },
  ],
  helpMeStart: {
    en: 'Configure step by step',
    ar: 'إعداد الفحص خطوة بخطوة',
    de: 'Schritt für Schritt einrichten',
    fr: 'Configurer étape par étape',
  },
  showMeAround: {
    en: 'Open explorer tour',
    ar: 'جولة على الخريطة',
    de: 'Kartentour öffnen',
    fr: 'Visite de la carte',
  },
  dontShowAgain: {
    en: "Don't show on startup",
    ar: 'عدم الإظهار عند الدخول',
    de: 'Beim Start ausblenden',
    fr: 'Ne plus afficher au démarrage',
  },
  skipExplore: {
    en: 'Skip setup',
    ar: 'تخطي الإعداد',
    de: 'Überspringen',
    fr: 'Passer',
  },
  skipGuide: {
    en: 'Close',
    ar: 'إغلاق',
    de: 'Schließen',
    fr: 'Fermer',
  },
  back: {
    en: 'Back',
    ar: 'رجوع',
    de: 'Zurück',
    fr: 'Retour',
  },
  stepLabel: {
    en: 'Step {{current}} of 3',
    ar: 'الخطوة {{current}} من 3',
    de: 'Schritt {{current}} von 3',
    fr: 'Étape {{current}} sur 3',
  },
  step1Title: {
    en: 'What do you want to test',
    ar: 'ما الذي تريد فحصه',
    de: 'Was möchten Sie prüfen',
    fr: 'Que souhaitez-vous tester',
  },
  step1Subtitle: {
    en: 'Each choice maps to a verified NASA sensor or analysis view.',
    ar: 'كل اختيار يضبط القمر الصناعي والأداة المناسبة تلقائياً.',
    de: 'Jede Option wählt den passenden NASA-Datensatz.',
    fr: 'Chaque option configure le capteur NASA adapté.',
  },
  step2Title: {
    en: 'Where in the Nile Delta',
    ar: 'أي منطقة في دلتا النيل',
    de: 'Welche Region im Nildelta',
    fr: 'Quelle zone du Delta du Nil',
  },
  step2Subtitle: {
    en: 'Coastal lagoons, central cropland and desert margins follow different trends.',
    ar: 'تختلف المؤشرات بين الساحل الشمالي ووسط الدلتا ومناطق الاستصلاح.',
    de: 'Küstenzone, Kernland und Randgebiete zeigen unterschiedliche Trends.',
    fr: 'Les tendances varient entre côte, cœur alluvial et marges désertiques.',
  },
  searchPlaceholder: {
    en: 'Search governorate',
    ar: 'ابحث عن محافظة',
    de: 'Gouvernement suchen',
    fr: 'Rechercher une zone',
  },
  customGeoTitle: {
    en: 'Custom GeoJSON polygon',
    ar: 'رفع حدود GeoJSON مخصصة',
    de: 'Eigenes GeoJSON-Polygon',
    fr: 'Polygone GeoJSON personnalisé',
  },
  customGeoDesc: {
    en: 'Clip satellite time series to your own boundary',
    ar: 'قص بيانات الأقمار داخل حدود منطقتك الخاصة',
    de: 'Satellitenreihen auf eigenes Gebiet zuschneiden',
    fr: 'Découper les séries selon votre polygone',
  },
  step3Title: {
    en: 'Over what time span',
    ar: 'على أي فترة زمنية',
    de: 'Über welchen Zeitraum',
    fr: 'Sur quelle période',
  },
  step3Subtitle: {
    en: 'Longer series give Mann-Kendall and Theil-Sen tests higher statistical confidence.',
    ar: 'الفترات الأطول تمنح اختبار مان-كيندال قدرة أدق على تأكيد الاتجاه.',
    de: 'Längere Reihen erhöhen die Sicherheit von Mann-Kendall & Theil-Sen.',
    fr: 'Les séries longues renforcent la fiabilité statistique.',
  },
  recommendedBadge: {
    en: 'Longest record',
    ar: 'أطول سجل',
    de: 'Längster Zeitraum',
    fr: 'Série maximale',
  },
  yourCaseLabel: {
    en: 'Configuration',
    ar: 'الإعداد المختار',
    de: 'Auswahl',
    fr: 'Configuration',
  },
  startInvestigating: {
    en: 'Run investigation',
    ar: 'تشغيل التحليل',
    de: 'Analyse starten',
    fr: 'Lancer l’analyse',
  },
  csvStepTitle: {
    en: 'Import custom CSV',
    ar: 'استيراد ملف CSV مخصص',
    de: 'CSV-Datei importieren',
    fr: 'Importer un fichier CSV',
  },
  csvStepSubtitle: {
    en: 'Accepts AppEEARS exports or any comma/semicolon table with date and value columns.',
    ar: 'يقبل ملفات AppEEARS أو أي جدول يحتوي عمودي التاريخ والقيمة.',
    de: 'Unterstützt AppEEARS-Exporte oder Tabellen mit Datum und Wert.',
    fr: 'Compatible avec AppEEARS ou tout tableau Date et Valeur.',
  },
  csvPickButton: {
    en: 'Select CSV file',
    ar: 'اختر ملف CSV',
    de: 'CSV-Datei wählen',
    fr: 'Choisir un fichier CSV',
  },
  csvOrExplorer: {
    en: 'Open map instead',
    ar: 'فتح الخريطة بدلاً من ذلك',
    de: 'Stattdessen Karte öffnen',
    fr: 'Ouvrir la carte plutôt',
  },
  lstWindowTitle: {
    en: 'Choose Land Surface Temperature measurement',
    ar: 'اختر نوع قياس حرارة سطح الأرض',
    de: 'Messzeitraum für Landoberflächentemperatur wählen',
    fr: 'Choisir la mesure de température de surface',
  },
  continueToRegion: {
    en: 'Continue to study zone',
    ar: 'المتابعة لاختيار المنطقة',
    de: 'Weiter zur Region',
    fr: 'Continuer vers la zone',
  },
} as const;
