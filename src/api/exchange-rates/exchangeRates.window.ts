import { BACKFILL_MONTHS, MAX_HISTORY_MONTHS } from './exchangeRates.catalog.js';

/** Today's date as an ISO `YYYY-MM-DD` string in UTC. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `from` shifted back `months`, clamped against an ISO `YYYY-MM-DD` date in UTC. */
export function monthsAgoIso(months: number, from: string = todayIso()): string {
  const [y, m, d] = from.split('-').map(Number);
  // Day-of-month is clamped by Date when the target month is shorter.
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
