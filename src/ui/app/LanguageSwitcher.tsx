import { LOCALES } from '../types.ts';
import { useI18n } from '../i18n/i18nContext.ts';
import { LOCALE_LABELS } from '../i18n/messages.ts';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{t('app.language')}</span>
      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
        {LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              locale === loc ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {/* eslint-disable-next-line security/detect-object-injection -- loc is a typed union */}
            {LOCALE_LABELS[loc]}
          </button>
        ))}
      </div>
    </div>
  );
}
