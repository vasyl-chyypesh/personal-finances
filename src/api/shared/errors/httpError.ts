import { CODES } from './codes.js';
import { MESSAGES } from './messages.js';

export class HttpError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;

  constructor(description: string, code: string = CODES.INTERNAL_ERROR, httpStatus = 500) {
    super(description || MESSAGES.INTERNAL_SERVER_ERROR);

    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

    this.code = code;
    this.httpStatus = httpStatus;

    Error.captureStackTrace(this);
  }
}
