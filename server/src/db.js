import pg from "pg";

const { Pool } = pg;

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  // Support split env vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;

  if (!host || !database || !user) {
    return { connectionString: undefined };
  }

  return {
    host,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database,
    user,
    password: process.env.DB_PASSWORD,
  };
}

export const pool = new Pool(getPoolConfig());

