import { Router } from 'express';
import db from '../shared/database.js';
import { RequestSource, requestValidator } from '../shared/middlewares/requestValidator.js';
import { ExchangeRatesRepository } from './exchangeRates.repository.js';
import { ExchangeRatesService } from './exchangeRates.service.js';
import { ExchangeRatesSync } from './exchangeRates.sync.js';
import { createExchangeRatesProvider } from './exchangeRates.provider.js';
import { HistoryQuerySchema, type HistoryQuery } from './exchangeRates.schema.js';

const repository = new ExchangeRatesRepository(db);
// RATES_OFFLINE keeps reads DB-only (no provider calls) — used to run fully
// offline and to keep HTTP tests network-free.
const offline = process.env['RATES_OFFLINE'] === '1' || process.env['RATES_OFFLINE'] === 'true';
const sync = offline ? undefined : new ExchangeRatesSync(repository, createExchangeRatesProvider());
const service = new ExchangeRatesService(repository, sync);

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    res.json(service.getRates());
  } catch (err) {
    next(err);
  }
});

router.get(
  '/history',
  requestValidator(HistoryQuerySchema, RequestSource.query),
  async (_req, res, next) => {
    try {
      res.json(await service.getHistory(res.locals.query as HistoryQuery));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
