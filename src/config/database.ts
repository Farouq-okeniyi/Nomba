import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from './env';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: config.DB_SYNC,         // set to false in production — use migrations
  logging: config.NODE_ENV === 'development',
  entities: [__dirname + '/../entities/*.entity.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
});
