import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const KEY_PREFIX = 'nva_live_';

/**
 * Generates a new API key.
 * Returns:
 *  - raw:    the full key shown ONCE to the user — never stored
 *  - hash:   SHA-256 hex digest stored in the DB for validation
 *  - prefix: first 12 chars of raw key shown in key listings
 */
export const generateApiKey = (): { raw: string; hash: string; prefix: string } => {
  // Combine prefix + UUID (no dashes) to produce a predictable-length key
  const secret = uuidv4().replace(/-/g, '');
  const raw = `${KEY_PREFIX}${secret}`;

  const hash = crypto
    .createHash('sha256')
    .update(raw)
    .digest('hex');

  const prefix = raw.slice(0, 12); // e.g. "nva_live_xxxx"

  return { raw, hash, prefix };
};

/**
 * Hashes a raw API key for DB lookup.
 */
export const hashApiKey = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');
