import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ApiError } from './apiError';
import crypto from 'crypto';

// Verifies the nomba-signature header using HMAC-SHA256
export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['nomba-signature'] as string;

  if (!signature) {
    return next(new ApiError(401, 'Missing Nomba webhook signature', false));
  }

  if (!req.rawBody) {
    return next(new ApiError(400, 'Raw body not captured', false));
  }

  const expected = crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SIGNING_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expected) {
    return next(new ApiError(401, 'bad signature', false));
  }

  next();
};
