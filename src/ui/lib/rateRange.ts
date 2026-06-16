/**
 * Rolling-range presets for the exchange-rate chart. All math is UTC so the
 * window never shifts with the viewer's timezone (mirrors `datePeriod.ts` and
 * the API's window helpers).
 */
import { parseISODate, toISODate } from './datePeriod.ts';

export type RatePreset = '1m' | '3m' | '6m' | 'ytd' | '1y';

export const RATE_PRESETS: RatePreset[] = ['1m', '3m', '6m', 'ytd', '1y'];

export const DEFAULT_RATE_PRESET: RatePreset = '3m';

export function isRatePreset(value: string | null): value is RatePreset {
  return value !== null && (RATE_PRESETS as string[]).includes(value);
}

/** Inclusive `{ from, to }` ISO range for a preset, anchored at today (UTC). */
export function presetRange(
  preset: RatePreset,
  now: Date = new Date(),
): {
  from: string;
  to: string;
} {
  const to = toISODate(now);
  if (preset === 'ytd') {
    return { from: `${to.slice(0, 4)}-01-01`, to };
  }
  const monthsBack: Record<Exclude<RatePreset, 'ytd'>, number> = {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '1y': 12,
  };
  const anchor = parseISODate(to);
  // eslint-disable-next-line security/detect-object-injection -- preset is a typed literal
  anchor.setUTCMonth(anchor.getUTCMonth() - monthsBack[preset]);
  return { from: toISODate(anchor), to };
}
