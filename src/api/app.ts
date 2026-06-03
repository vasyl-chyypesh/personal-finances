import express from 'express';
import helmet from 'helmet';
import { rateLimiter } from './shared/middlewares/rateLimiter.js';
import { requestLogger } from './shared/middlewares/requestLogger.js';
import { notFoundHandler } from './shared/middlewares/notFoundHandler.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import db from './shared/database.js';
import { initDb } from './shared/schema.js';
import categoriesRouter from './categories/categories.routes.js';
import ledgerRouter from './ledger/ledger.routes.js';
import exchangeRatesRouter from './exchange-rates/exchangeRates.routes.js';

initDb(db);

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/categories', categoriesRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/exchange-rates', exchangeRatesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
