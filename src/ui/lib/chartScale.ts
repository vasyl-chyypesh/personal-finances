/**
 * Framework-agnostic helpers for the rate-history chart: "nice" axis ticks,
 * evenly spaced tick indices, and cursor→data-point mapping. Pure functions so
 * they are unit-tested with `node:test` like the other `lib/` utilities.
 */

/** Round a range to a "nice" 1/2/5×10ⁿ number (Heckbert's algorithm). */
function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }
  return niceFraction * 10 ** exponent;
}

export interface NiceScale {
  /** Lower bound of the padded, tick-aligned domain. */
  niceMin: number;
  /** Upper bound of the padded, tick-aligned domain. */
  niceMax: number;
  /** Distance between adjacent ticks. */
  step: number;
  /** Tick values from `niceMin` to `niceMax` inclusive. */
  ticks: number[];
}

/**
 * Build a tick-aligned domain covering `[min, max]` with about `maxTicks`
 * gridlines landing on round values. Handles a flat series (min === max) by
 * opening a small band around the value.
 */
export function niceScale(min: number, max: number, maxTicks = 5): NiceScale {
  let lo = min;
  let hi = max;
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo === hi) {
    const pad = Math.abs(lo) * 0.05 || 1;
    lo = (Number.isFinite(lo) ? lo : 0) - pad;
    hi = (Number.isFinite(hi) ? hi : 0) + pad;
  }
  const range = niceNum(hi - lo, false);
  const step = niceNum(range / Math.max(1, maxTicks - 1), true);
  const niceMin = Math.floor(lo / step) * step;
  const niceMax = Math.ceil(hi / step) * step;

  // Derive label precision from the step so ticks read 41.2, not 41.20000001.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const round = (v: number) => Number(v.toFixed(decimals + 2));

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(round(v));
  return { niceMin: round(niceMin), niceMax: round(niceMax), step, ticks };
}

/**
 * Up to `count` evenly spaced indices spanning `[0, length - 1]` (always
 * including both ends). Used to thin X-axis date labels.
 */
export function tickIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const n = Math.min(count, length);
  const result = new Set<number>();
  for (let i = 0; i < n; i++) {
    result.add(Math.round((i / (n - 1)) * (length - 1)));
  }
  return [...result].sort((a, b) => a - b);
}

/**
 * Index of the first point in each distinct `YYYY-MM` (dates assumed sorted
 * ascending). Used to place month-level X-axis ticks on month boundaries so
 * labels read "Feb Mar Apr" instead of repeating an evenly-spaced month.
 */
export function monthStartIndices(dates: string[]): number[] {
  const result: number[] = [];
  let prev = '';
  dates.forEach((date, i) => {
    const month = date.slice(0, 7);
    if (month !== prev) {
      result.push(i);
      prev = month;
    }
  });
  return result;
}

/**
 * Nearest data index for a horizontal position given as a fraction (0..1) of
 * the plot width. Clamps out-of-range fractions to the ends.
 */
export function nearestIndex(fraction: number, length: number): number {
  if (length <= 1) return 0;
  const clamped = Math.min(1, Math.max(0, fraction));
  return Math.round(clamped * (length - 1));
}
