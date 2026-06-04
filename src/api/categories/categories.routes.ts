import { Router } from 'express';
import db from '../shared/database.js';
import { CategoriesRepository } from './categories.repository.js';
import { CategoriesService } from './categories.service.js';
import { requestValidator, RequestSource } from '../shared/middlewares/requestValidator.js';
import {
  CreateCategorySchema,
  UpdateNamesSchema,
  ListQuerySchema,
  ReorderSchema,
  IdParamSchema,
} from './categories.schema.js';
import type { LocalizedName } from './categories.types.js';

const service = new CategoriesService(new CategoriesRepository(db));

const router = Router();

router.get('/', requestValidator(ListQuerySchema, RequestSource.query), (req, res, next) => {
  try {
    const { includeDeleted } = res.locals.query as { includeDeleted: boolean };
    res.json(service.list(includeDeleted));
  } catch (err) {
    next(err);
  }
});

router.post('/', requestValidator(CreateCategorySchema), (req, res, next) => {
  try {
    const { names } = res.locals.body as { names: LocalizedName };
    res.status(201).json(service.create(names));
  } catch (err) {
    next(err);
  }
});

router.put('/order', requestValidator(ReorderSchema), (req, res, next) => {
  try {
    const { ids } = res.locals.body as { ids: number[] };
    service.reorder(ids);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id',
  requestValidator(IdParamSchema, RequestSource.params),
  requestValidator(UpdateNamesSchema),
  (req, res, next) => {
    try {
      const { id } = res.locals.params as { id: number };
      const { names } = res.locals.body as { names: LocalizedName };
      res.json(service.updateNames(id, names));
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

router.post(
  '/:id/restore',
  requestValidator(IdParamSchema, RequestSource.params),
  (req, res, next) => {
    try {
      res.json(service.restore((res.locals.params as { id: number }).id));
    } catch (err) {
      next(err);
    }
  },
);

export default router;
