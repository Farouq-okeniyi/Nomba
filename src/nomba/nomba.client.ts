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

  logger.info(`[NombaClient] Request: POST ${config.NOMBA_API_BASE_URL}auth/token/issue`);
  const res = await axios.post(
    `${config.NOMBA_API_BASE_URL}auth/token/issue`,
    {
      grant_type: 'client_credentials',
      client_id: config.NOMBA_CLIENT_ID,
      client_secret: config.NOMBA_PRIVATE_KEY,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        accountId: config.NOMBA_PARENT_ACCOUNT_ID,
      },
    }
  );

  logger.info(`[NombaClient] Response: POST ${config.NOMBA_API_BASE_URL}auth/token/issue - ${res.status}`);

  const tokenData = res.data.data;
  
  tokenCache = {
    token: tokenData.access_token,
    expiresAt: new Date(tokenData.expiresAt).getTime(),
  };

  logger.info('[NombaClient] Access token refreshed');
  return tokenData.access_token;
}

// ─── Axios instance ───────────────────────────────────────────────────────────
export const nombaClient: AxiosInstance = axios.create({
  baseURL: config.NOMBA_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach fresh token before every request
nombaClient.interceptors.request.use(async (reqConfig) => {
  logger.info({
    data: reqConfig.data,
  }, `[NombaClient] Request: ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL}${reqConfig.url}`);
  const token = await getAccessToken();
  reqConfig.headers['Authorization'] = `Bearer ${token}`;
  if (!reqConfig.headers['accountId']) {
    reqConfig.headers['accountId'] = config.NOMBA_PARENT_ACCOUNT_ID;
  }
  return reqConfig;
});

// Log Nomba API responses clearly
nombaClient.interceptors.response.use(
  (res) => {
    logger.info({
      data: res.data,
    }, `[NombaClient] Response: ${res.config.method?.toUpperCase()} ${res.config.baseURL}${res.config.url} - ${res.status}`);
    return res;
  },
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.description || err.response?.data?.message || err.message;
    logger.error({
      data: err.response?.data,
    }, `[NombaClient] Error: ${err.config?.method?.toUpperCase()} ${err.config?.baseURL}${err.config?.url} - ${status} — ${message}`);
    return Promise.reject(err);
  }
);
