import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from './middlewares';
import { createSwaggerSpec } from './config';
import apiRouter from './modules/routes';

const app = express();
app.set('trust proxy', 1);

// Extend Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody: Buffer;
    }
  }
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
app.use(morgan('combined'));

// ─── Disable Caching Globally ─────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ─── Raw OpenAPI JSON spec (dynamic — picks up host from request) ─────────────
app.get('/api/v1/docs.json', (req, res) => {
  const serverUrl = `${req.protocol}://${req.get('host')}/api/v1`;
  res.setHeader('Content-Type', 'application/json');
  res.send(createSwaggerSpec(serverUrl));
});

// ─── Swagger UI (fetches spec from relative URL — works on any host) ──────────
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(undefined, {
  customSiteTitle: 'Nomba Webhook API',
  swaggerOptions: {
    url: '/api/v1/docs.json',     // relative → always resolves to the current host
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true,
  },
}));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'nomba-webhook-service', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

app.use(errorHandler);

export default app;

