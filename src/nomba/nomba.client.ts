import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../config';

interface TokenCache {
  token: string;
  expiresAt: number;   // Unix ms timestamp
}

let tokenCache: TokenCache | null = null;

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.token;
  }

  const res = await axios.post(
    `${config.NOMBA_API_BASE_URL}/auth/token`,
    {
      client_id: config.NOMBA_CLIENT_ID,
      grant_type: 'client_credentials',
    },
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.NOMBA_CLIENT_ID}:${config.NOMBA_PRIVATE_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const { access_token, expires_in } = res.data;

  tokenCache = {
    token: access_token,
    expiresAt: now + expires_in * 1000,
  };

  logger.info('[NombaClient] Access token refreshed');
  return access_token;
}

// ─── Axios instance ───────────────────────────────────────────────────────────
export const nombaClient: AxiosInstance = axios.create({
  baseURL: config.NOMBA_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach fresh token before every request
nombaClient.interceptors.request.use(async (reqConfig) => {
  const token = await getAccessToken();
  reqConfig.headers['Authorization'] = `Bearer ${token}`;
  return reqConfig;
});

// Log Nomba API errors clearly
nombaClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message;
    logger.error(`[NombaClient] ${status} — ${message}`);
    return Promise.reject(err);
  }
);
