import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimiter } from './shared/middlewares/rateLimiter.js';
import { notFoundHandler } from './shared/middlewares/notFoundHandler.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { Logger } from './shared/logger.js';
import db from './shared/database.js';
import { initDb } from './shared/schema.js';
import { CategoriesRepository } from './categories/categories.repository.js';
import { CategoriesService } from './categories/categories.service.js';
import { createCategoriesRouter } from './categories/categories.routes.js';
import { LedgerRepository } from './ledger/ledger.repository.js';
import { LedgerService } from './ledger/ledger.service.js';
import { createLedgerRouter } from './ledger/ledger.routes.js';

initDb(db);

const categoriesRepo = new CategoriesRepository(db);
const categoriesService = new CategoriesService(categoriesRepo);

const ledgerRepo = new LedgerRepository(db);
const ledgerService = new LedgerService(ledgerRepo, categoriesRepo);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(express.json());
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/categories', createCategoriesRouter(categoriesService));
app.use('/api/ledger', createLedgerRouter(ledgerService));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  Logger.log(`API running on port ${PORT}`);
});
