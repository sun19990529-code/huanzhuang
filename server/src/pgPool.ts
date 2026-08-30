import { Pool } from 'pg';

export const pgPool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '54321', 10),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'sqm17709021',
  database: process.env.PGDATABASE || 'smart_wardrobe',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pgPool.on('error', (err) => {
  console.error('[PostgreSQL Pool] 数据库连接池错误:', err);
});
