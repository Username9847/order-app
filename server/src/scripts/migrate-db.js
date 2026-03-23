/**
 * Render 등 원격 PostgreSQL에 스키마만 적용합니다.
 * - DATABASE_URL 필수 (Render 대시보드 → PostgreSQL → Connections → External Database URL)
 * - CREATE DATABASE 는 실행하지 않습니다 (Render는 DB가 이미 제공됨)
 *
 * 사용: cd server && npm run db:migrate
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, "../..");

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

function getClientConfig() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const ssl = getPgSslForUrl(url);
    return ssl
      ? { connectionString: url, ssl }
      : { connectionString: url };
  }

  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  if (!host || !database || !user) {
    throw new Error(
      "DATABASE_URL 이 없으면 DB_HOST, DB_NAME, DB_USER (및 DB_PASSWORD, DB_PORT)를 설정하세요.",
    );
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

async function main() {
  const client = new Client(getClientConfig());

  await client.connect();
  try {
    const schemaPath = path.join(serverRoot, "sql", "schema.sql");
    const sql = await fs.readFile(schemaPath, "utf8");

    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("Schema applied: menus, options, orders, order_items, order_item_options");

    const { rows } = await client.query("select count(*)::int as c from menus");
    if ((rows[0]?.c ?? 0) === 0) {
      const seedPath = path.join(serverRoot, "sql", "seed.sql");
      const seedSql = await fs.readFile(seedPath, "utf8");
      await client.query("begin");
      await client.query(seedSql);
      await client.query("commit");
      console.log("Seed applied: menus + options (empty DB)");
    } else {
      console.log("Seed skipped: menus already has rows");
    }
  } catch (e) {
    try {
      await client.query("rollback");
    } catch {
      // ignore
    }
    throw e;
  } finally {
    await client.end();
  }
}

await main();
console.log("Done.");
