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

  const sheet = parseXls(filePath);
  const service = new ImportService(db, new LedgerRepository(db), new CategoriesRepository(db));
  const summary = service.import(sheet, locale);

  Logger.log(
    `Imported ${summary.month}: ${summary.entriesInserted} entries inserted, ` +
      `${summary.entriesDeleted} removed, ${summary.categoriesCreated} categories created.`,
  );
}

main();
