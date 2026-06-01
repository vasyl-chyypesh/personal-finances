import { Router } from 'express';
import db from '../shared/database.js';
import { CategoriesRepository } from './categories.repository.js';
import { CategoriesService } from './categories.service.js';

const service = new CategoriesService(new CategoriesRepository(db));

const router = Router();

router.get('/', (_req, res, next) => {
  try {
    res.json(service.list());
  } catch (err) {
    next(err);
  }
});

export default router;
