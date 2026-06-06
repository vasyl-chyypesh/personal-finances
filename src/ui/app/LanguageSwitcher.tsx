import { LOCALES, type Locale } from '../types.ts';
import { useI18n } from '../i18n/i18nContext.ts';
import { LOCALE_LABELS } from '../i18n/messages.ts';
import { SegmentedControl } from '../components/ui/SegmentedControl.tsx';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const options = LOCALES.map((loc) => ({
    value: loc,
    // eslint-disable-next-line security/detect-object-injection -- loc is a typed union
    label: LOCALE_LABELS[loc],
  }));

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{t('app.language')}</span>
      <SegmentedControl<Locale>
        options={options}
        value={locale}
        onChange={setLocale}
        ariaLabel={t('app.language')}
        size="sm"
      />
    </div>
  );
}
