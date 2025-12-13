import { Pool, PoolConfig, QueryResult } from "pg";

const connectionString = process.env.DATABASE_URL;

const config: PoolConfig = connectionString
  ? { connectionString }
  : {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
    };

const ssl =
  process.env.NODE_ENV === "production" && process.env.PGSSLMODE !== "disable"
    ? { rejectUnauthorized: false }
    : false;

const globalForPool = global as unknown as { pgPool?: Pool };

const pool = globalForPool.pgPool || new Pool({ ...config, ssl });

if (!globalForPool.pgPool) {
  globalForPool.pgPool = pool;
}

export type DbUserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
};

export const query = async <T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};
