import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { LOCALES, type Locale } from '../types.ts';
import { MESSAGES } from './messages.ts';
import { I18nContext, type I18nValue } from './i18nContext.ts';

const STORAGE_KEY = 'locale';

function initialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && LOCALES.includes(stored)) {
    return stored;
  }
  return navigator.language.startsWith('uk') ? 'uk' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(() => {
    // eslint-disable-next-line security/detect-object-injection -- locale is a typed union
    const dict = MESSAGES[locale];
    const t = (key: string, vars?: Record<string, string | number>): string => {
      // eslint-disable-next-line security/detect-object-injection -- key indexes a static catalog
      const template = dict[key] ?? key;
      if (!vars) {
        return template;
      }
      return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
        // eslint-disable-next-line security/detect-object-injection -- name comes from the template
        String(vars[name] ?? `{${name}}`),
      );
    };
    return { locale, setLocale, t };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
