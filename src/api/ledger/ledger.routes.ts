import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../shared/errors/httpError.js';
import { CODES } from '../shared/errors/codes.js';
import type { LedgerService } from './ledger.service.js';

const CreateSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.enum(['UAH', 'USD', 'EUR']),
  categoryId: z.number().int().positive(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const UpdateSchema = CreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field required' },
);

const ListQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('month'),
});

const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

function validationError(issues: z.ZodIssue[]): HttpError {
  return new HttpError(issues[0]?.message ?? 'Validation error', CODES.BAD_REQUEST, 400);
}

export function createLedgerRouter(service: LedgerService): Router {
  const router = Router();

  router.post('/', (req, res, next) => {
    try {
      const parsed = CreateSchema.safeParse(req.body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      res.status(201).json(service.create(parsed.data));
    } catch (err) {
      next(err);
    }
  });

  router.get('/', (req, res, next) => {
    try {
      const parsed = ListQuerySchema.safeParse(req.query);
      if (!parsed.success) throw validationError(parsed.error.issues);
      res.json(service.list(parsed.data.period));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', (req, res, next) => {
    try {
      const idParsed = IdParamSchema.safeParse(req.params);
      if (!idParsed.success) throw new HttpError('Invalid id', CODES.BAD_REQUEST, 400);
      const bodyParsed = UpdateSchema.safeParse(req.body);
      if (!bodyParsed.success) throw validationError(bodyParsed.error.issues);
      res.json(service.update(idParsed.data.id, bodyParsed.data));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const idParsed = IdParamSchema.safeParse(req.params);
      if (!idParsed.success) throw new HttpError('Invalid id', CODES.BAD_REQUEST, 400);
      service.remove(idParsed.data.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
