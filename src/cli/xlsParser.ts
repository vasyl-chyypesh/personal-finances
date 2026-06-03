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
  /** The workbook tab name this sheet was parsed from. */
  name: string;
  /** 1-12 */
  month: number;
  year: number;
  rows: ParsedRow[];
}

export interface ParsedWorkbook {
  sheets: ParsedSheet[];
  /** Names of tabs skipped because they were empty or had no parseable title. */
  skipped: string[];
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

function parseTitle(title: string): { month: number; year: number } | null {
  const lower = title.toLowerCase();
  const monthIndex = UA_MONTHS.findIndex((name) => lower.includes(name));
  const yearMatch = lower.match(/\b(\d{4})\b/);
  if (monthIndex === -1 || !yearMatch) {
    return null;
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

/** Parses a single worksheet, or returns null if it isn't a budget sheet. */
function parseSheet(sheet: WorkSheet, name: string): ParsedSheet | null {
  if (!sheet?.['!ref']) return null;

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const cellAt = (r: number, c: number): CellObject | undefined =>
    sheet[XLSX.utils.encode_cell({ r, c })] as CellObject | undefined;

  const titleCell = cellAt(range.s.r, range.s.c);
  const title = parseTitle(String(titleCell?.v ?? ''));
  if (!title) return null;
  const { month, year } = title;

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

  return { name, month, year, rows };
}

export function parseXls(filePath: string): ParsedWorkbook {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is the CLI's explicit input argument
  const buffer = readFileSync(filePath);
  const workbook = XLSX.read(buffer);

  const sheets: ParsedSheet[] = [];
  const skipped: string[] = [];
  for (const name of workbook.SheetNames) {
    // eslint-disable-next-line security/detect-object-injection -- name comes from the workbook's own SheetNames
    const parsed = parseSheet(workbook.Sheets[name], name);
    if (parsed) sheets.push(parsed);
    else skipped.push(name);
  }

  return { sheets, skipped };
}
