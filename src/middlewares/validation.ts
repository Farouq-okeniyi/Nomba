import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { ApiError } from './apiError';

export function validateData(
  schema: z.ZodObject<any, any> | z.ZodEffects<any>,
  targets: ('body' | 'query' | 'params')[] = ['body']
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const target of targets) {
        if (req[target]) {
          const validatedData = await schema.parseAsync(req[target]);
          req[target] = validatedData;
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new ApiError(400, 'Validation failed', true, {
            errors: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          })
        );
      }
      return next(error);
    }
  };
}
