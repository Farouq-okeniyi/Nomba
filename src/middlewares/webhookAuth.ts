import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { ApiError } from './apiError';
import crypto from 'crypto';

// Verifies the nomba-signature header using HMAC-SHA256
export const verifyWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['nomba-signature'] as string;
  const timestamp = req.headers['nomba-timestamp'] as string;

  if (!signature || !timestamp) {
    return next(new ApiError(401, 'Missing Nomba webhook headers', false));
  }

  const payload = req.body;
  const data = payload?.data || {};
  const merchant = data?.merchant || {};
  const transaction = data?.transaction || {};

  let responseCode = String(transaction.responseCode ?? '');
  if (responseCode === 'null') responseCode = '';

  const hashingPayload = [
    payload.event_type ?? '',
    payload.requestId ?? '',
    merchant.userId ?? '',
    merchant.walletId ?? '',
    transaction.transactionId ?? '',
    transaction.type ?? '',
    transaction.time ?? '',
    responseCode,
    timestamp,
  ].join(':');

  const expected = crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SIGNING_KEY)
    .update(hashingPayload)
    .digest('base64');

  if (expected.toLowerCase() !== signature.toLowerCase()) {
    return next(new ApiError(401, 'Invalid webhook signature', false));
  }

  next();
};
