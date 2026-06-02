import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import type { CellObject, WorkSheet } from 'xlsx';
import type { LedgerEntryType } from '../api/ledger/ledger.types.js';

export interface ParsedRow {
  type: LedgerEntryType;
  category: string;
  day: number;
  amount: number;
  description: string | null;
}

export interface ParsedSheet {
  /** 1-12 */
  month: number;
  year: number;
  rows: ParsedRow[];
}

/** Ukrainian nominative month names, index 0 = January. */
const UA_MONTHS = [
  'січень',
  'лютий',
  'березень',
  'квітень',
  'травень',
  'червень',
  'липень',
  'серпень',
  'вересень',
  'жовтень',
  'листопад',
  'грудень',
];

const EXPENSE_HEADER = 'Стаття витрат';
const INCOME_HEADER = 'Джерело доходу';
const TOTAL_LABEL = 'РАЗОМ';

function parseTitle(title: string): { month: number; year: number } {
  const lower = title.toLowerCase();
  const monthIndex = UA_MONTHS.findIndex((name) => lower.includes(name));
  const yearMatch = lower.match(/\b(\d{4})\b/);
  if (monthIndex === -1 || !yearMatch) {
    throw new Error(`Cannot parse month/year from sheet title: "${title}"`);
  }
  return { month: monthIndex + 1, year: Number(yearMatch[1]) };
}

/** Drops a leading non-letter prefix (e.g. the "-" on sub-rows), trims, and capitalizes. */
function normalizeCategory(label: string): string {
  const cleaned = label.replace(/^[^\p{L}]+/u, '').trim();
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : cleaned;
}

function cellComment(cell: CellObject | undefined): string | null {
  if (!cell?.c) return null;
  const text = cell.c
    .map((note) => note.t ?? '')
    .join(' ')
    .trim();
  return text.length ? text : null;
}

export function parseXls(filePath: string): ParsedSheet {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is the CLI's explicit input argument
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer);
  const sheet: WorkSheet | undefined = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet?.['!ref']) {
    throw new Error('Workbook has no readable sheet');
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const cellAt = (r: number, c: number): CellObject | undefined =>
    sheet[XLSX.utils.encode_cell({ r, c })] as CellObject | undefined;

  const titleCell = cellAt(range.s.r, range.s.c);
  const { month, year } = parseTitle(String(titleCell?.v ?? ''));

  const rows: ParsedRow[] = [];
  let section: LedgerEntryType | null = null;
  // Maps a column index to the day-of-month it represents for the active section.
  let dayColumns = new Map<number, number>();

  for (let r = range.s.r; r <= range.e.r; r++) {
    const label = String(cellAt(r, range.s.c)?.v ?? '').trim();
    if (!label) continue;

    if (label === EXPENSE_HEADER || label === INCOME_HEADER) {
      section = label === EXPENSE_HEADER ? 'expense' : 'income';
      dayColumns = new Map();
      for (let c = range.s.c + 1; c <= range.e.c; c++) {
        const value = cellAt(r, c)?.v;
        if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31) {
          dayColumns.set(c, value);
        }
      }
      continue;
    }

    if (label === TOTAL_LABEL) {
      section = null;
      continue;
    }

    if (!section) continue;

    const category = normalizeCategory(label);
    if (!category) continue;

    for (const [c, day] of dayColumns) {
      const cell = cellAt(r, c);
      const value = cell?.v;
      if (typeof value !== 'number' || !(value > 0)) continue;
      rows.push({ type: section, category, day, amount: value, description: cellComment(cell) });
    }
  }

  return { month, year, rows };
}
