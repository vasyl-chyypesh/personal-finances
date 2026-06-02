import 'dotenv/config';
import { existsSync } from 'node:fs';
import db from '../api/shared/database.js';
import { initDb } from '../api/shared/schema.js';
import { CategoriesRepository } from '../api/categories/categories.repository.js';
import { LedgerRepository } from '../api/ledger/ledger.repository.js';
import { Logger } from '../api/shared/logger.js';
import { parseXls } from './xlsParser.js';
import { ImportService } from './importService.js';

function main(): void {
  const filePath = process.argv[2];
  if (!filePath) {
    Logger.error('Usage: npm run import:xls -- <path-to-file.xls>');
    process.exit(1);
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath is the CLI's explicit input argument
  if (!existsSync(filePath)) {
    Logger.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  initDb(db);

  const sheet = parseXls(filePath);
  const service = new ImportService(db, new LedgerRepository(db), new CategoriesRepository(db));
  const summary = service.import(sheet);

  Logger.log(
    `Imported ${summary.month}: ${summary.entriesInserted} entries inserted, ` +
      `${summary.entriesDeleted} removed, ${summary.categoriesCreated} categories created.`,
  );
}

main();
