import { useI18n } from '../i18n/i18nContext.ts';
import type { MessageKey } from '../i18n/messages.ts';
import { RATE_PRESETS, type RatePreset } from '../lib/rateRange.ts';
import { SegmentedControl } from './SegmentedControl.tsx';

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

/** Rolling-range preset switcher for the rate-history chart. */
export function RangePresets({ value, onChange }: RangePresetsProps) {
  const { t } = useI18n();
  return (
    <SegmentedControl
      ariaLabel={t('currencies.rangeLabel')}
      value={value}
      onChange={onChange}
      options={RATE_PRESETS.map((preset) => ({
        value: preset,
        // eslint-disable-next-line security/detect-object-injection -- preset is a typed literal
        label: t(LABEL_KEY[preset]),
      }))}
    />
  );
}
