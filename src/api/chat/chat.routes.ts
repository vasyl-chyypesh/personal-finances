import { Router } from 'express';
import db from '../shared/database.js';
import { CategoriesRepository } from '../categories/categories.repository.js';
import { requestValidator } from '../shared/middlewares/requestValidator.js';
import { ChatService } from './chat.service.js';
import { createLedgerExtractor } from './chat.llm.js';
import { ExtractSchema } from './chat.schema.js';

const service = new ChatService(createLedgerExtractor(), new CategoriesRepository(db));

const router = Router();

router.get('/status', (_req, res) => {
  res.json(service.status());
});

router.post('/extract', requestValidator(ExtractSchema), (req, res, next) => {
  service
    .extract((res.locals.body as { message: string }).message)
    .then((result) => res.json(result))
    .catch(next);
});

export default router;
