import 'reflect-metadata';
import http from 'http';
import app from '../server';
import { logger, config, AppDataSource } from '../config';

const server = http.createServer(app);

const startApp = async () => {
  try {
    // ── Connect to PostgreSQL ────────────────────────────────────────────────
    await AppDataSource.initialize();
    logger.info('\x1b[32mDatabase:\x1b[0m Connected to PostgreSQL');

    server.listen(config.PORT, () => {
      logger.info(`\x1b[36mServer:\x1b[0m  Running on http://localhost:${config.PORT}`);
      logger.info(`\x1b[36mWebhook:\x1b[0m POST http://localhost:${config.PORT}/api/v1/webhooks/nomba`);
      logger.info(`\x1b[35mDocs:\x1b[0m    http://localhost:${config.PORT}/api/v1/docs`);
      logger.info(`\x1b[35mSpec:\x1b[0m    http://localhost:${config.PORT}/api/v1/docs.json`);
    });
  } catch (error: any) {
    logger.error('\x1b[31mError:\x1b[0m Failed to start server:', error);
    process.exit(1);
  }
};


const gracefulShutdown = async () => {
  logger.info('\x1b[33mServer:\x1b[0m Shutting down...');
  server.close(() => {
    logger.info('\x1b[33mServer:\x1b[0m Closed remaining connections');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('unhandledRejection', (err: any) => {
  logger.error('\x1b[31mUnhandled Rejection:\x1b[0m', err);
});
process.on('uncaughtException', (err: any) => {
  logger.error('\x1b[31mUncaught Exception:\x1b[0m', err);
  gracefulShutdown();
});

startApp();
