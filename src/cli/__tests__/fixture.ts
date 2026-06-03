import { writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import type { CellObject } from 'xlsx';

/** Builds the canonical April expense/income worksheet with its cell comments. */
function buildAprilSheet(): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [
    ['Доходи і витрати за квітень 2026'],
    ['Стаття витрат', 1, 2, 3, 'РАЗОМ', '%'],
    ['Благодійність', 800, null, 100, 900, 0.5],
    ['-електроенергія', null, 250.5, null, 250.5, 0.2],
    ['Порожня', null, null, null, 0, 0],
    ['РАЗОМ', 1050, 250.5, 100, 1250, 1],
    ['Джерело доходу', 1, 2, 3, 'РАЗОМ', '%'],
    ['Зарплата', 267325.695, null, null, 267325.695, 1],
    ['РАЗОМ', 267325.695, null, null, 267325.695, 1],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  const comment = (r: number, c: number, text: string): void => {
    const cell = sheet[XLSX.utils.encode_cell({ r, c })] as CellObject;
    cell.c = [{ a: 'tester', t: text }];
  };
  comment(2, 1, 'army'); // Благодійність, day 1
  comment(3, 2, 'April bill'); // -електроенергія, day 2
  comment(7, 1, 'salary\n'); // Зарплата, day 1 (trailing newline trimmed)

  return sheet;
}

/** A smaller May worksheet, used to exercise multi-sheet imports. */
function buildMaySheet(): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [
    ['Доходи і витрати за травень 2026'],
    ['Стаття витрат', 1, 2, 'РАЗОМ', '%'],
    ['Благодійність', 500, null, 500, 1],
    ['РАЗОМ', 500, null, 500, 1],
    ['Джерело доходу', 1, 2, 'РАЗОМ', '%'],
    ['Зарплата', 100000, null, 100000, 1],
    ['РАЗОМ', 100000, null, 100000, 1],
  ];
  return XLSX.utils.aoa_to_sheet(aoa);
}

function writeWorkbook(filePath: string, sheets: { name: string; sheet: XLSX.WorkSheet }[]): void {
  const workbook = XLSX.utils.book_new();
  for (const { name, sheet } of sheets) {
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'biff8',
  }) as Buffer;
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is a test-controlled temp path
  writeFileSync(filePath, buffer);
}

/**
 * Builds a small single-sheet .xls (BIFF8) workbook mirroring the real layout —
 * a title row, an expense table and an income table, each with a 1..N day header
 * plus РАЗОМ/% columns, and a few cell comments — then writes it to `filePath`.
 */
export function writeFixtureXls(filePath: string): void {
  writeWorkbook(filePath, [{ name: 'Квітень 26', sheet: buildAprilSheet() }]);
}

/**
 * Like `writeFixtureXls`, but adds a second budget sheet (May) and a trailing
 * non-budget tab, to exercise multi-sheet import and skip behavior.
 */
export function writeMultiSheetFixtureXls(filePath: string): void {
  const notes = XLSX.utils.aoa_to_sheet([['just some notes'], ['not a budget sheet']]);
  writeWorkbook(filePath, [
    { name: 'Квітень 26', sheet: buildAprilSheet() },
    { name: 'Травень 26', sheet: buildMaySheet() },
    { name: 'Notes', sheet: notes },
  ]);
}
