import { DataSource } from 'typeorm';

const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://neondb_owner:npg_suPKIWAN72QB@ep-little-scene-aty8hq51-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
});

ds.initialize().then(async () => {
  const result = await ds.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
  console.log(result.map((r: any) => r.table_name));
  process.exit(0);
});
