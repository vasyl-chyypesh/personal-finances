import { writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import type { CellObject } from 'xlsx';

/**
 * Builds a small .xls (BIFF8) workbook mirroring the real layout — a title row,
 * an expense table and an income table, each with a 1..N day header plus РАЗОМ/%
 * columns, and a few cell comments — then writes it to `filePath`.
 */
export function writeFixtureXls(filePath: string): void {
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

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Квітень 26');
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'biff8',
  }) as Buffer;
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is a test-controlled temp path
  writeFileSync(filePath, buffer);
}
