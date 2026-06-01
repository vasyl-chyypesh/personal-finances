import { Router } from 'express';
import db from '../shared/database.js';
import { LedgerRepository } from './ledger.repository.js';
import { LedgerService } from './ledger.service.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { requestValidator, RequestSource } from '../shared/middlewares/requestValidator.js';
import { CreateSchema, UpdateSchema, ListQuerySchema, IdParamSchema } from './ledger.schema.js';
import type { CreateLedgerEntryDto, UpdateLedgerEntryDto, Period } from './ledger.types.js';

const service = new LedgerService(new LedgerRepository(db), new CategoriesRepository(db));

const router = Router();

router.post('/', requestValidator(CreateSchema), (req, res, next) => {
  try {
    res.status(201).json(service.create(res.locals.body as CreateLedgerEntryDto));
  } catch (err) {
    next(err);
  }
});

router.get('/', requestValidator(ListQuerySchema, RequestSource.query), (req, res, next) => {
  try {
    res.json(service.list((res.locals.query as { period: Period }).period));
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  requestValidator(IdParamSchema, RequestSource.params),
  requestValidator(UpdateSchema),
  (req, res, next) => {
    try {
      const { id } = res.locals.params as { id: number };
      res.json(service.update(id, res.locals.body as UpdateLedgerEntryDto));
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id', requestValidator(IdParamSchema, RequestSource.params), (req, res, next) => {
  try {
    service.remove((res.locals.params as { id: number }).id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
