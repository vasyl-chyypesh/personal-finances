/**
 * Date helpers for the period picker and ledger filtering.
 *
 * All math is done in UTC so period boundaries never shift with the viewer's
 * timezone (a finance app must bucket a transaction into the same month for
 * everyone). Week starts Monday.
 */
import type { Period } from '../types.ts';

/** A `YYYY-MM-DD` string parsed as a UTC midnight Date. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/** UTC `Date` → `YYYY-MM-DD`. */
export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Monday 00:00 UTC of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun … 6 = Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Inclusive [start, end] of the period containing `date`, in UTC. */
export function periodRange(period: Period, date: Date): { start: Date; end: Date } {
  if (period === 'week') {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start, end };
  }
  if (period === 'month') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
    return { start, end };
  }
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  return { start, end };
}

/** Step `date` forward/backward by one unit of `period`. */
export function shiftPeriod(period: Period, date: Date, direction: 1 | -1): Date {
  const d = new Date(date);
  if (period === 'week') {
    d.setUTCDate(d.getUTCDate() + 7 * direction);
  } else if (period === 'month') {
    d.setUTCMonth(d.getUTCMonth() + direction);
  } else {
    d.setUTCFullYear(d.getUTCFullYear() + direction);
  }
  return d;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Human label for the current range, e.g. "Jun 30 – Jul 6" or "July 2025". */
export function formatPeriodLabel(period: Period, date: Date): string {
  const { start, end } = periodRange(period, date);
  if (period === 'year') {
    return String(start.getUTCFullYear());
  }
  if (period === 'month') {
    return `${MONTHS_FULL[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  const startLabel = `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const endLabel =
    start.getUTCMonth() === end.getUTCMonth()
      ? String(end.getUTCDate())
      : `${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `${startLabel} – ${endLabel}`;
}

/** True if the `YYYY-MM-DD` entry date falls inside the period (UTC, inclusive). */
export function isWithinPeriod(entryISO: string, period: Period, date: Date): boolean {
  const { start, end } = periodRange(period, date);
  const t = parseISODate(entryISO).getTime();
  return t >= start.getTime() && t <= end.getTime();
}
