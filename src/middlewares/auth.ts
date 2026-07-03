import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config';
import { Merchant, MerchantStatus } from '../entities/Merchant';
import { ApiError } from './apiError';
import { hashApiKey } from '../extension/apiKey';

// Augment Express Request to carry the authenticated merchant
declare global {
  namespace Express {
    interface Request {
      merchant: Merchant;
    }
  }
}

const merchantRepository = AppDataSource.getRepository(Merchant);

/**
 * Bearer API-key authentication middleware.
 *
 * Flow:
 *  1. Extract raw key from "Authorization: Bearer <key>"
 *  2. SHA-256 hash it
 *  3. Look up the hash in merchants where status = ACTIVE
 *  4. If not found → 401
 *  5. Update apiKeyLastUsedAt (fire-and-forget)
 *  6. Attach merchant to req.merchant
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Missing or invalid Authorization header. Expected: Bearer <apiKey>', false));
    }

    const rawKey = authHeader.slice('Bearer '.length).trim();

    if (!rawKey) {
      return next(new ApiError(401, 'API key is empty', false));
    }

    const keyHash = hashApiKey(rawKey);

    const merchant = await merchantRepository.findOne({
      where: { apiKeyHash: keyHash, status: MerchantStatus.ACTIVE },
    });

    if (!merchant) {
      return next(new ApiError(401, 'Invalid or revoked API key', false));
    }

    // Update lastUsedAt in background — do not await to keep the request fast
    merchantRepository.update(merchant.id, { apiKeyLastUsedAt: new Date() }).catch(() => null);

    // Attach merchant to request context — all downstream services use req.merchant.id
    req.merchant = merchant;

    return next();
  } catch (err) {
    return next(err);
  }
};
