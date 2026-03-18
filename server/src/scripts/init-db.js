import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getMaintenanceConfig() {
  // Prefer DATABASE_URL if provided.
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }

  return {
    host: requireEnv("DB_HOST"),
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    user: requireEnv("DB_USER"),
    password: process.env.DB_PASSWORD,
    database: "postgres",
  };
}

function getTargetDbName() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return url.pathname.replace(/^\//, "") || "order_app";
  }
  return requireEnv("DB_NAME");
}

async function ensureDatabaseExists() {
  const cfg = getMaintenanceConfig();
  const targetDb = getTargetDbName();

  const client = new Client(cfg);
  await client.connect();
  try {
    const exists = await client.query(
      "select 1 from pg_database where datname = $1",
      [targetDb],
    );
    if (exists.rowCount === 0) {
      await client.query(`create database "${targetDb}"`);
    }
  } finally {
    await client.end();
  }

  return targetDb;
}

async function applySchema(targetDb) {
  let cfg = getMaintenanceConfig();

  // If using DATABASE_URL, we should connect to the target DB (not postgres).
  if (cfg.connectionString) {
    const url = new URL(cfg.connectionString);
    url.pathname = `/${targetDb}`;
    cfg = { connectionString: url.toString() };
  } else {
    cfg = { ...cfg, database: targetDb };
  }

  const schemaPath = path.resolve("sql", "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");

  const client = new Client(cfg);
  await client.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    await client.end();
  }
}

const targetDb = await ensureDatabaseExists();
await applySchema(targetDb);
// Seed basic menu/option data if empty
{
  let cfg = getMaintenanceConfig();
  if (cfg.connectionString) {
    const url = new URL(cfg.connectionString);
    url.pathname = `/${targetDb}`;
    cfg = { connectionString: url.toString() };
  } else {
    cfg = { ...cfg, database: targetDb };
  }

  const client = new Client(cfg);
  await client.connect();
  try {
    const { rows } = await client.query("select count(*)::int as c from menus");
    if ((rows[0]?.c ?? 0) === 0) {
      const seedPath = path.resolve("sql", "seed.sql");
      const seedSql = await fs.readFile(seedPath, "utf8");
      await client.query("begin");
      await client.query(seedSql);
      await client.query("commit");
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
console.log(`DB ready: ${targetDb}`);

