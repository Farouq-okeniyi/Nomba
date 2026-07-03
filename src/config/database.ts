import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './env';

// Single default export — required by TypeORM CLI
export default new DataSource({
  type: 'postgres',
  url: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: config.DB_SYNC,         // set to false in production — use migrations
  logging: config.NODE_ENV === 'development',
  // Covers both legacy *.entity.ts and new PascalCase entity files
  entities: [__dirname + '/../entities/*.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
});
