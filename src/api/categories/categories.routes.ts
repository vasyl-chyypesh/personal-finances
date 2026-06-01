import { Router } from 'express';
import type { CategoriesService } from './categories.service.js';

export function createCategoriesRouter(service: CategoriesService): Router {
  const router = Router();

  router.get('/', (_req, res, next) => {
    try {
      res.json(service.list());
    } catch (err) {
      next(err);
    }
  });

  return router;
}
