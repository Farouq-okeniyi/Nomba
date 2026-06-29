import { Request, Response, NextFunction } from 'express';
import { config, logger } from '../config';
import { ApiError } from './apiError';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, error.details);
  }

  if (config.NODE_ENV === 'development') {
    logger.error(error.stack || err.stack);
  }

  const responseData: any = {
    status: error.statusCode,
    message: error.message,
    isOperational: error.isOperational,
    details: error.details || null,
  };

  if (config.NODE_ENV === 'development') {
    responseData.stack = error.stack;
  }

  res.status(error.statusCode).json(responseData);
};
