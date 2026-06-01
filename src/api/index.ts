import express from 'express';
import helmet from 'helmet';
import { rateLimiter } from './shared/middlewares/rateLimiter.js';
import { notFoundHandler } from './shared/middlewares/notFoundHandler.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(express.json());

app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on port ${PORT}`);
});
