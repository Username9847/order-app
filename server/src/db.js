import pg from "pg";

const { Pool } = pg;

/** Render 등 원격 PG는 SSL 필요. 로컬은 비활성화. migrate-db.js 와 동일 정책. */
function getPgSslForUrl(connectionString) {
  try {
    const u = new URL(connectionString);
    const host = u.hostname;
    if (host === "localhost" || host === "127.0.0.1") return false;
  } catch {
    // ignore
  }
  if (process.env.DATABASE_SSL === "0") return false;
  return { rejectUnauthorized: false };
}

function getPoolConfig() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const ssl = getPgSslForUrl(url);
    return ssl
      ? { connectionString: url, ssl }
      : { connectionString: url };
  }

  // Support split env vars (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;

  if (!host || !database || !user) {
    return { connectionString: undefined };
  }

  const isLocal = host === "localhost" || host === "127.0.0.1";
  const ssl =
    !isLocal && process.env.DATABASE_SSL !== "0"
      ? { rejectUnauthorized: false }
      : false;

  return {
    host,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database,
    user,
    password: process.env.DB_PASSWORD,
    ...(ssl ? { ssl } : {}),
  };
}

export const pool = new Pool(getPoolConfig());

