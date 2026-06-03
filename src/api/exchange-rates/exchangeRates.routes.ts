import { Router } from 'express';
import { ExchangeRatesService } from './exchangeRates.service.js';

const service = new ExchangeRatesService();

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    res.json(service.getRates());
  } catch (err) {
    next(err);
  }
});

export default router;
