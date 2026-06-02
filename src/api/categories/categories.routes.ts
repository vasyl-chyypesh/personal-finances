import { Router } from 'express';
import db from '../shared/database.js';
import { CategoriesRepository } from './categories.repository.js';
import { CategoriesService } from './categories.service.js';
import { requestValidator, RequestSource } from '../shared/middlewares/requestValidator.js';
import { UpdateNamesSchema, IdParamSchema } from './categories.schema.js';
import type { LocalizedName } from './categories.types.js';

const service = new CategoriesService(new CategoriesRepository(db));

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    res.json(service.list());
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

export default router;
