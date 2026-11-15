import { SupportedLanguage } from '../types/scientific';

const LOCALE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-US',
  ar: 'ar-EG',
  de: 'de-DE',
  fr: 'fr-FR',
};

export function formatNumber(
  value: number,
  lang: SupportedLanguage = 'en',
  options: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }
): string {
  try {
    return new Intl.NumberFormat(LOCALE_MAP[lang] || 'en-US', options).format(value);
  } catch {
    return value.toFixed(options.maximumFractionDigits ?? 2);
  }
}

export function formatScientificPValue(pValue: number, lang: SupportedLanguage = 'en'): string {
  if (pValue < 0.0001) {
    return `< ${formatNumber(0.0001, lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  }
  return formatNumber(pValue, lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function formatSignedRate(
  value: number,
  unit: string,
  lang: SupportedLanguage = 'en',
  decimals = 2
): string {
  const sign = value > 0 ? '+' : '';
  const formatted = formatNumber(value, lang, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${formatted} ${unit}`;
}

export function formatDate(
  isoDate: string,
  lang: SupportedLanguage = 'en',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return new Intl.DateTimeFormat(LOCALE_MAP[lang] || 'en-US', options).format(date);
  } catch {
    return isoDate;
  }
}

export function formatCoordinate(lat: number, lng: number, lang: SupportedLanguage = 'en'): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const latStr = formatNumber(Math.abs(lat), lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lngStr = formatNumber(Math.abs(lng), lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${latStr}°${latDir}, ${lngStr}°${lngDir}`;
}

