import { rateLimit } from 'express-rate-limit';
import { CODES } from '../errors/codes.js';
import { MESSAGES } from '../errors/messages.js';

export const RATE_LIMIT_WINDOW = 1 * 60 * 1000; // 1 minute
const RATE_LIMIT = 60; // limit each IP to 60 requests per `window`

export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  limit: RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: CODES.RATE_LIMIT,
    message: MESSAGES.TOO_MANY_REQUESTS,
  },
});
