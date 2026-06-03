import 'dotenv/config';
import { existsSync } from 'node:fs';
import db from '../api/shared/database.js';
import { initDb } from '../api/shared/schema.js';
import { CategoriesRepository } from '../api/categories/categories.repository.js';
import { LedgerRepository } from '../api/ledger/ledger.repository.js';
import { Logger } from '../api/shared/logger.js';
import { parseXls } from './xlsParser.js';
import { ImportService } from './importService.js';
import { LOCALES, type Locale } from '../api/categories/categories.types.js';

function main(): void {
  const args = process.argv.slice(2);
  const localeArg = args.find((a) => a.startsWith('--locale='))?.split('=')[1] ?? 'uk';
  const filePath = args.find((a) => !a.startsWith('--'));

  if (!filePath) {
    Logger.error('Usage: npm run import:xls -- <path-to-file.xls> [--locale=uk|en]');
    process.exit(1);
  }
  if (!LOCALES.includes(localeArg as Locale)) {
    Logger.error(`Unsupported locale "${localeArg}". Supported: ${LOCALES.join(', ')}`);
    process.exit(1);
  }
  const locale = localeArg as Locale;

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is the CLI's explicit input argument
  if (!existsSync(filePath)) {
    Logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  initDb(db);

  const { sheets, skipped } = parseXls(filePath);
  for (const name of skipped) {
    Logger.warn(`Skipped sheet "${name}": not a recognizable budget sheet.`);
  }
  if (sheets.length === 0) {
    Logger.error('No importable budget sheets found in the workbook.');
    process.exit(1);
  }

  const service = new ImportService(db, new LedgerRepository(db), new CategoriesRepository(db));

  let totalInserted = 0;
  let totalDeleted = 0;
  let totalCategories = 0;
  for (const sheet of sheets) {
    const summary = service.import(sheet, locale);
    totalInserted += summary.entriesInserted;
    totalDeleted += summary.entriesDeleted;
    totalCategories += summary.categoriesCreated;
    Logger.log(
      `Imported ${summary.month}: ${summary.entriesInserted} entries inserted, ` +
        `${summary.entriesDeleted} removed, ${summary.categoriesCreated} categories created.`,
    );
  }

  Logger.log(
    `Done: ${sheets.length} sheet(s), ${totalInserted} entries inserted, ` +
      `${totalDeleted} removed, ${totalCategories} categories created.`,
  );
}

main();
