export type Locale = 'en' | 'uk';

/** At least one locale is always present. */
export type LocalizedName = Partial<Record<Locale, string>>;

export interface Category {
  id: number;
  slug: string;
  names: LocalizedName;
}

export const LOCALES: Locale[] = ['en', 'uk'];
