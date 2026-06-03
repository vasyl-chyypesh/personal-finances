import { Router } from 'express';
import db from '../shared/database.js';
import { ExchangeRatesRepository } from './exchangeRates.repository.js';
import { ExchangeRatesService } from './exchangeRates.service.js';

const service = new ExchangeRatesService(new ExchangeRatesRepository(db));

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    res.json(service.getRates());
  } catch (err) {
    next(err);
  }
});

export default router;
