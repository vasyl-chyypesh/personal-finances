import type { Category, Locale } from '../types.ts';

/** Resolves a category's display name: active locale → other locale → slug. */
export function categoryName(category: Category, locale: Locale): string {
  const other: Locale = locale === 'en' ? 'uk' : 'en';
  // eslint-disable-next-line security/detect-object-injection -- locale keys are a typed union
  const localized = category.names[locale] ?? category.names[other];
  return localized ?? category.slug;
}
