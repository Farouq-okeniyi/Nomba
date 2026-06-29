import { config } from '../config';

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(
    statusCode: number = 500,
    message: string = 'Something went wrong',
    isOperational: boolean = true,
    details?: any,
    stack: string = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): object {
    return {
      status: this.statusCode,
      message: this.message,
      isOperational: this.isOperational,
      ...(this.details && typeof this.details === 'object' ? this.details : {}),
      stack: config.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}
