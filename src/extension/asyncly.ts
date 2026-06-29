import { NextFunction, Request, Response } from 'express';

// Wraps async route handlers and forwards errors to Express error middleware
export const Asyncly =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(error);
    });
  };
