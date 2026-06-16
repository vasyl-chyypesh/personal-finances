import { useI18n } from '../i18n/i18nContext.ts';
import type { MessageKey } from '../i18n/messages.ts';
import { RATE_PRESETS, type RatePreset } from '../lib/rateRange.ts';

export interface RangePresetsProps {
  value: RatePreset;
  onChange: (preset: RatePreset) => void;
}

const LABEL_KEY: Record<RatePreset, MessageKey> = {
  '1m': 'currencies.range1m',
  '3m': 'currencies.range3m',
  '6m': 'currencies.range6m',
  ytd: 'currencies.rangeYtd',
  '1y': 'currencies.range1y',
};

const chipBase =
  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

/** Rolling-range preset chips for the rate-history chart. */
export function RangePresets({ value, onChange }: RangePresetsProps) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t('currencies.rangeLabel')} className="flex flex-wrap gap-1">
      {RATE_PRESETS.map((preset) => {
        const active = preset === value;
        return (
          <button
            key={preset}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(preset)}
            className={`${chipBase} ${
              active
                ? 'bg-primary text-white'
                : 'bg-surface-muted text-fg-muted hover:bg-surface-muted hover:text-fg'
            }`}
          >
            {/* eslint-disable-next-line security/detect-object-injection -- preset is a typed literal */}
            {t(LABEL_KEY[preset])}
          </button>
        );
      })}
    </div>
  );
}
