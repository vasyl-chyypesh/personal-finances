/**
 * Money is stored and transmitted as integer minor units (cents) so amounts are
 * exact. The UI converts to/from the major unit only at input fields and display
 * formatters. All supported currencies (UAH/USD/EUR) use a scale of 100.
 */
export const MINOR_UNIT_SCALE = 100;

/** Cents → major unit (e.g. 15050 → 150.5). */
export function centsToMajor(cents: number): number {
  return cents / MINOR_UNIT_SCALE;
}

/** Major unit → cents, rounded to the nearest cent (e.g. 150.5 → 15050). */
export function majorToCents(major: number): number {
  return Math.round(major * MINOR_UNIT_SCALE);
}
