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

  const expectedHex = crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SIGNING_KEY)
    .update(req.rawBody)
    .digest('hex');

  const expectedBase64 = crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SIGNING_KEY)
    .update(req.rawBody)
    .digest('base64');

  if (signature !== expectedHex && signature !== expectedBase64) {
    console.error(`\n=== [Webhook Auth Error] Signature Mismatch ===`);
    console.error(`Received signature header: ${signature}`);
    console.error(`Calculated signature (Hex): ${expectedHex}`);
    console.error(`Calculated signature (Base64): ${expectedBase64}`);
    console.error(`Raw Body used for hash:\n${req.rawBody.toString('utf8')}`);
    console.error(`===============================================\n`);

    return next(new ApiError(401, 'Invalid signature', false));
  }

  next();
};
