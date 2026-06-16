import { BACKFILL_MONTHS, MAX_HISTORY_MONTHS } from './exchangeRates.catalog.js';

/** Today's date as an ISO `YYYY-MM-DD` string in UTC. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `from` shifted back `months`, clamped against an ISO `YYYY-MM-DD` date in UTC. */
export function monthsAgoIso(months: number, from: string = todayIso()): string {
  const [y, m, d] = from.split('-').map(Number);
  // If the target month is shorter, Date rolls the overflow day forward (e.g. a
  // 31st becomes early next month) rather than clamping — fine here, since these
  // dates are approximate window floors/chunk bounds, not exact calendar months.
  const shifted = new Date(Date.UTC(y, m - 1 - months, d));
  return shifted.toISOString().slice(0, 10);
}

/** `from` shifted forward `months`, as an ISO `YYYY-MM-DD` date in UTC. */
export function addMonthsIso(months: number, from: string): string {
  return monthsAgoIso(-months, from);
}

/** `from` shifted by `days` (may be negative), as an ISO `YYYY-MM-DD` date in UTC. */
export function addDaysIso(days: number, from: string): string {
  const [y, m, d] = from.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Oldest date the startup backfill warms into the DB (today − backfill window). */
export function backfillFloorIso(today: string = todayIso()): string {
  return monthsAgoIso(BACKFILL_MONTHS, today);
}

/** Oldest date a single history read may reach (anchor − max span). */
export function maxSpanFloorIso(anchor: string = todayIso()): string {
  return monthsAgoIso(MAX_HISTORY_MONTHS, anchor);
}
