/**
 * Database adapter
 * - Uses PostgreSQL when available and configured
 * - Falls back to SQLite (sql.js) automatically for development without PostgreSQL
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// ─── PostgreSQL config ────────────────────────────────────────────────────────
const pgConfig: PoolConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sourav_homoeopathic',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max:                   20,
  idleTimeoutMillis:     30000,
  connectionTimeoutMillis: 10000,  // increased from 3s → 10s for ts-node startup
};

let pgPool: Pool | null = null;
let useSQLite = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqliteQueryFn: ((sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqliteClientFn: (() => Promise<any>) | null = null;

// ─── Initialise: try PG with retries, fall back to SQLite ────────────────────
const dbReady: Promise<void> = (async () => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // ms

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (pgPool) { try { await pgPool.end(); } catch { /* ignore */ } }
      pgPool = new Pool(pgConfig);
      await pgPool.query('SELECT 1');
      logger.info('✓ PostgreSQL connected');
      useSQLite = false;
      return; // success — exit
    } catch (err: any) {
      logger.warn(`PostgreSQL connection attempt ${attempt}/${MAX_RETRIES} failed: ${err?.code || err?.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      }
    }
  }

  // All retries exhausted — use SQLite
  logger.warn('PostgreSQL unavailable after retries. Using SQLite fallback for development.');
  try { await pgPool?.end(); } catch { /* ignore */ }
  pgPool = null;
  useSQLite = true;

  const adapter = await import('./sqliteAdapter');
  sqliteQueryFn  = adapter.sqliteQuery;
  sqliteClientFn = adapter.getSqliteClient;
  logger.info('✓ SQLite (dev mode) ready');
})();

// ─── query() — primary interface used by all routes ──────────────────────────
export const query = async (
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: unknown[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ rows: any[] }> => {
  await dbReady;

  if (useSQLite && sqliteQueryFn) {
    return sqliteQueryFn(text, params);
  }

  const start = Date.now();
  try {
    const res = await pgPool!.query(text, params as unknown[]);
    const ms = Date.now() - start;
    if (ms > 1000) logger.warn(`Slow query (${ms}ms): ${text.substring(0, 80)}`);
    return res as { rows: Record<string, unknown>[] };
  } catch (err: any) {
    // If PG suddenly drops, fall back to SQLite if available
    if ((err?.code === 'ECONNREFUSED' || err?.code === '57P01') && sqliteQueryFn) {
      logger.warn('PostgreSQL disconnected — switching to SQLite fallback');
      useSQLite = true;
      return sqliteQueryFn(text, params);
    }
    logger.error('DB query error:', { text: text.substring(0, 80), message: err?.message });
    throw err;
  }
};

// ─── getClient() — for transactions ──────────────────────────────────────────
export const getClient = async (): Promise<PoolClient | any> => {
  await dbReady;
  if (useSQLite && sqliteClientFn) {
    return sqliteClientFn();
  }
  return pgPool!.connect();
};

/** Returns true when connected to PostgreSQL (not SQLite fallback) */
export const isPg = () => !useSQLite;

export default pgPool;
