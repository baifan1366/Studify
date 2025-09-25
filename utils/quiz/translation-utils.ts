import { Translation, CommunityQuizSubject, CommunityQuizGrade } from '@/interface/community/quiz-interface';

/**
 * Get translated text from a translation object based on locale
 * Falls back to English if the requested locale is not available
 * Falls back to the first available translation if English is not available
 */
export function getTranslation(translations: Translation, locale: string = 'en'): string {
  if (!translations || typeof translations !== 'object') {
    return '';
  }

  // Try requested locale first
  if (translations[locale]) {
    return translations[locale];
  }

  // Fall back to English
  if (translations['en']) {
    return translations['en'];
  }

  // Fall back to first available translation
  const firstKey = Object.keys(translations)[0];
  return firstKey ? translations[firstKey] : '';
}

/**
 * Get subject name in the specified locale
 */
export function getSubjectName(subject: CommunityQuizSubject | null | undefined, locale: string = 'en'): string {
  if (!subject) return '';
  return getTranslation(subject.translations, locale);
}

/**
 * Get grade name in the specified locale
 */
export function getGradeName(grade: CommunityQuizGrade | null | undefined, locale: string = 'en'): string {
  if (!grade) return '';
  return getTranslation(grade.translations, locale);
}

/**
 * Get all available locales from a translation object
 */
export function getAvailableLocales(translations: Translation): string[] {
  if (!translations || typeof translations !== 'object') {
    return [];
  }
  return Object.keys(translations);
}

/**
 * Validate translation object structure
 */
export function isValidTranslation(translations: any): translations is Translation {
  if (!translations || typeof translations !== 'object') {
    return false;
  }

  // Check if all values are strings
  for (const key in translations) {
    if (typeof translations[key] !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Create a translation object from a simple string (for backward compatibility)
 */
export function createTranslation(text: string, locale: string = 'en'): Translation {
  return { [locale]: text };
}

/**
 * Merge multiple translation objects
 */
export function mergeTranslations(...translations: Translation[]): Translation {
  return translations.reduce((merged, current) => {
    if (isValidTranslation(current)) {
      return { ...merged, ...current };
    }
    return merged;
  }, {});
}

/**
 * Get supported locales for the quiz system
 */
export const SUPPORTED_LOCALES = ['en', 'zh'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

/**
 * Check if a locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * Get the default locale for the system
 */
export function getDefaultLocale(): SupportedLocale {
  return 'en';
}

/**
 * Format subject and grade for display
 */
export function formatSubjectGrade(
  subject: CommunityQuizSubject | null | undefined,
  grade: CommunityQuizGrade | null | undefined,
  locale: string = 'en',
  separator: string = ' - '
): string {
  const subjectName = getSubjectName(subject, locale);
  const gradeName = getGradeName(grade, locale);
  
  if (subjectName && gradeName) {
    return `${subjectName}${separator}${gradeName}`;
  }
  
  return subjectName || gradeName || '';
}
