import { Request, Response } from 'express';
import { MESSAGES } from '../errors/messages.js';

export function notFoundHandler(request: Request, response: Response) {
  return response.status(404).json({ message: MESSAGES.PAGE_NOT_FOUND });
}
