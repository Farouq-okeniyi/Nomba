import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
  NOMBA_PARENT_ACCOUNT_ID: z.string(),
  NOMBA_SUB_ACCOUNT_ID: z.string(),
  NOMBA_CLIENT_ID: z.string(),
  NOMBA_PRIVATE_KEY: z.string(),
  NOMBA_WEBHOOK_SIGNING_KEY: z.string(),
  NOMBA_API_BASE_URL: z.string().default('https://api.nomba.com/v1'),
});

const config = configSchema.parse(process.env);
export { config };
