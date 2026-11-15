import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import arTranslation from './locales/ar/translation.json';
import deTranslation from './locales/de/translation.json';
import frTranslation from './locales/fr/translation.json';
import { SupportedLanguage } from '../types/scientific';

export const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  name: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}> = [
  { code: 'en', name: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'German', nativeLabel: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeLabel: 'Français', dir: 'ltr' },
];

export function applyDocumentDirection(langCode: string) {
  const normalized = (langCode?.split('-')[0] || 'en') as SupportedLanguage;
  const dir = normalized === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = normalized;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ar: { translation: arTranslation },
      de: { translation: deTranslation },
      fr: { translation: frTranslation },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'de', 'fr'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'earthpulse_language',
    },
  });

applyDocumentDirection(i18n.language);

i18n.on('languageChanged', (lng) => {
  applyDocumentDirection(lng);
});

export default i18n;

