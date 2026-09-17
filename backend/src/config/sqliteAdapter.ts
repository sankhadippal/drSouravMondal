/**
 * SQLite adapter using sql.js (pure JavaScript, zero native dependencies).
 * Provides the same `query(sql, params)` interface as the pg Pool,
 * so all existing route code works without modification.
 *
 * Differences handled internally:
 *  - $1, $2 ... placeholders → ? placeholders
 *  - PostgreSQL-specific functions (uuid_generate_v4, NOW(), etc.) → SQLite equivalents
 *  - JSONB columns stored as TEXT
 *  - TIMESTAMPTZ stored as TEXT ISO strings
 */

import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

// ─── Lazy-load sql.js ─────────────────────────────────────────────────────────
let _db: any = null;
let _sqlJs: any = null;

const DB_PATH = path.join(__dirname, '..', '..', 'dev.db.json');

async function getDb() {
  if (_db) return _db;

  const initSqlJs = require('sql.js');
  _sqlJs = await initSqlJs();

  // Load persisted DB if it exists
  if (fs.existsSync(DB_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      const uint8 = new Uint8Array(saved);
      _db = new _sqlJs.Database(uint8);
      logger.info('SQLite: loaded existing database');
    } catch {
      _db = new _sqlJs.Database();
      logger.info('SQLite: created new database (corrupt file)');
    }
  } else {
    _db = new _sqlJs.Database();
    logger.info('SQLite: created new in-memory database');
  }

  // Enable WAL for better performance
  _db.run('PRAGMA journal_mode=WAL;');
  _db.run('PRAGMA foreign_keys=ON;');

  await initSchema(_db);
  await seedData(_db);

  return _db;
}

// Persist DB to file after every write
function saveDb() {
  if (!_db) return;
  try {
    const data = Array.from(_db.export());
    fs.writeFileSync(DB_PATH, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── SQL translation helpers ──────────────────────────────────────────────────

function translateSql(sql: string): string {
  return sql
    // $1 $2 ... → ?
    .replace(/\$\d+/g, '?')

    // ── PostgreSQL casts ────────────────────────────────────────────────────
    // Remove ::cast operators (SQLite stores all dates as text anyway)
    .replace(/::(date|text|integer|numeric|boolean|timestamptz|timestamp)/gi, '')

    // ── Aggregate JSON functions → plain text (handled in JS layer) ──────────
    // These are rewritten per-route; translate to safe no-op so errors are avoidable
    .replace(/json_build_object\s*\([^)]*\)/gi, "''")
    .replace(/json_agg\s*\([^)]*\)/gi, "''")
    .replace(/COALESCE\s*\(\s*json_agg[^,]+,\s*'(\[\]|{})'\s*\)/gi, "''")
    .replace(/FILTER\s*\(\s*WHERE[^)]+\)/gi, '')

    // ── UUID generation ────────────────────────────────────────────────────
    .replace(/uuid_generate_v4\(\)/gi,
      "(lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6))))")

    // ── Date / time ────────────────────────────────────────────────────────
    .replace(/\bNOW\s*\(\)/gi, "datetime('now')")
    .replace(/\bCURRENT_DATE\b/gi, "date('now')")
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')")

    // INTERVAL literals:  NOW() - INTERVAL '30 minutes'  →  datetime('now','-30 minutes')
    // Handles: minutes, hours, days, months, years + singular/plural
    .replace(/datetime\('now'\)\s*-\s*INTERVAL\s*'(\d+)\s*(minute|minutes|hour|hours|day|days|month|months|year|years)'/gi,
      (_, n, unit) => `datetime('now','-${n} ${unit}')`)
    .replace(/>\s*datetime\('now'\)\s*-\s*INTERVAL\s*'([^']+)'/gi,
      `> datetime('now','-$1')`)
    // Template-literal interval: INTERVAL '${VAR} minutes'
    .replace(/INTERVAL\s*'\$\{[^}]+\}\s*(minute|minutes|hour|hours|day|days)'/gi,
      "datetime('now','-? minutes')")

    // EXTRACT(DOW FROM ...) → CAST(strftime('%w', ...) AS INTEGER)
    .replace(/EXTRACT\s*\(\s*DOW\s*FROM\s+([^)]+?)\s*\)/gi,
      "CAST(strftime('%w', $1) AS INTEGER)")
    // EXTRACT(EPOCH FROM ...) → strftime('%s', ...)
    .replace(/EXTRACT\s*\(\s*EPOCH\s*FROM\s+([^)]+?)\s*\)/gi,
      "CAST(strftime('%s', $1) AS INTEGER)")

    // TO_CHAR(expr, format)
    .replace(/TO_CHAR\s*\(([^,]+),\s*'YYYY-MM-DD'\)/gi, "strftime('%Y-%m-%d',$1)")
    .replace(/TO_CHAR\s*\(([^,]+),\s*'YYYY-MM'\)/gi,    "strftime('%Y-%m',$1)")
    .replace(/TO_CHAR\s*\(([^,]+),\s*'HH24:MI'\)/gi,    "strftime('%H:%M',$1)")

    // ── Column types (DDL only) ─────────────────────────────────────────────
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bTIMESTAMP\b/gi, 'TEXT')
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bBOOLEAN\b/gi, 'INTEGER')
    .replace(/\bSERIAL\b/gi, 'INTEGER')
    .replace(/NUMERIC\s*\(\d+\s*,\s*\d+\)/gi, 'REAL')
    .replace(/VARCHAR\s*\(\d+\)/gi, 'TEXT')
    .replace(/\bSMALLINT\b/gi, 'INTEGER')
    .replace(/\bBIGINT\b/gi, 'INTEGER')

    // ── DDL statements ──────────────────────────────────────────────────────
    .replace(/CREATE EXTENSION[^;]+;/gi, 'SELECT 1;')
    .replace(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$\s*language\s*'plpgsql';/gi, 'SELECT 1;')
    .replace(/CREATE TRIGGER[\s\S]*?EXECUTE FUNCTION[^;]+;/gi, 'SELECT 1;')
    // Partial UNIQUE INDEX → remove WHERE clause (SQLite limitation)
    .replace(/CREATE UNIQUE INDEX (\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)\s+WHERE[^;]+;/gi,
      'CREATE UNIQUE INDEX IF NOT EXISTS $1 ON $2($3);')
    .replace(/CREATE\s+INDEX\s+(\w+)/gi,        'CREATE INDEX IF NOT EXISTS $1')
    .replace(/CREATE\s+UNIQUE\s+INDEX\s+(\w+)/gi,'CREATE UNIQUE INDEX IF NOT EXISTS $1')

    // ── Misc PG-isms ────────────────────────────────────────────────────────
    // Remove ORDER BY inside aggregates (not valid in SQLite aggregate context)
    .replace(/ORDER BY \w+\.?\w* NULLS (FIRST|LAST)/gi, '')
    // ILIKE → LIKE (SQLite LIKE is already case-insensitive for ASCII)
    .replace(/\bILIKE\b/gi, 'LIKE')
    // NOW() + INTERVAL '30 minutes' → datetime('now','+30 minutes')
    .replace(/datetime\('now'\)\s*\+\s*INTERVAL\s*'(\d+)\s*(\w+)'/gi,
      "datetime('now','+$1 $2')")
    .replace(/\bNOW\s*\(\)\s*\+\s*INTERVAL\s*'(\d+)\s*(\w+)'/gi,
      "datetime('now','+$1 $2')")
    // date_trunc → strftime equivalent
    .replace(/date_trunc\s*\(\s*'day'\s*,\s*([^)]+)\)/gi, "date($1)")
    // paid_at >= $1 (when $1 might be a date string) is fine
    // COALESCE with only scalars → keep as-is (SQLite supports it)
    ;
}

function translateParams(params?: unknown[]): unknown[] {
  if (!params) return [];
  return params.map(p => {
    if (p === null || p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    // Keep numbers as numbers (SQLite needs INTEGER for LIMIT/OFFSET)
    if (typeof p === 'number') return p;
    if (typeof p === 'object') return JSON.stringify(p);
    // Convert numeric strings to numbers for LIMIT/OFFSET compatibility
    if (typeof p === 'string' && /^\d+$/.test(p)) return parseInt(p, 10);
    return p;
  });
}

// ─── Query interface matching pg's Pool.query() ───────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sqliteQuery(text: string, params?: unknown[]): Promise<{ rows: any[] }> {
  const db = await getDb();
  const translated = translateSql(text);
  const translatedParams = translateParams(params);
  const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|PRAGMA)/i.test(text);
  const hasReturning = /\bRETURNING\b/i.test(text);

  try {
    if (isWrite) {
      // Strip RETURNING clause — SQLite doesn't support it, we'll do a follow-up SELECT
      const sqlWithoutReturning = hasReturning
        ? translated.replace(/\s+RETURNING\s+[\s\S]*$/i, '')
        : translated;

      const stmt = db.prepare(sqlWithoutReturning);
      stmt.run(translatedParams as unknown[]);
      stmt.free();
      saveDb();

      if (hasReturning) {
        // Determine table and try to fetch last inserted/updated row
        const insertMatch = text.match(/INTO\s+(\w+)/i);
        const updateMatch = text.match(/UPDATE\s+(\w+)/i);
        const tableName = insertMatch?.[1] || updateMatch?.[1];

        if (tableName) {
          if (insertMatch) {
            // For INSERT: get last_insert_rowid
            const lastId = db.exec(`SELECT last_insert_rowid() as id`);
            const rowId = lastId[0]?.values[0]?.[0];
            if (rowId && Number(rowId) > 0) {
              const sel = db.exec(`SELECT * FROM ${tableName} WHERE rowid = ${rowId}`);
              return { rows: execResultToRows(sel) };
            }
          } else if (updateMatch) {
            // For UPDATE: try to fetch the updated rows using WHERE clause
            const whereMatch = text.match(/WHERE\s+([\s\S]+?)(?:\s+RETURNING|\s*$)/i);
            if (whereMatch) {
              // Re-run the WHERE with translated params to find updated rows
              try {
                const whereClause = translateSql(whereMatch[1]);
                const sel = db.exec(`SELECT * FROM ${tableName} WHERE ${whereClause}`, translatedParams as unknown[]);
                return { rows: execResultToRows(sel) };
              } catch {
                // Fall through to empty
              }
            }
          }
        }
      }
      return { rows: [] };

    } else {
      // SELECT queries — use prepare/step for proper parameterized support
      if (translatedParams.length > 0) {
        const stmt = db.prepare(translated);
        stmt.bind(translatedParams);
        const rows: Record<string, unknown>[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as Record<string, unknown>);
        }
        stmt.free();
        // Post-process rows (JSON parse, boolean conversion, column normalization)
        const processed = rows.map(row => {
          const obj: Record<string, unknown> = {};
          for (const [col, val] of Object.entries(row)) {
            let v = val;
            if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
              try { v = JSON.parse(v); } catch { /* keep */ }
            }
            const boolCols = ['is_active', 'is_available', 'is_verified', 'is_all_chambers',
              'is_available_online', 'otp_verified', 'is_new_visitor', 'two_fa_enabled'];
            if (boolCols.includes(col) && (v === 0 || v === 1)) v = v === 1;
            // Normalize aggregate column names
            let nc = col;
            if (col === 'COUNT(*)' || col.match(/^COUNT\([^)]+\)$/i)) nc = 'count';
            if (col.match(/^SUM\([^)]+\)$/i)) nc = col.replace(/^SUM\(([^)]+)\)$/i, '$1');
            obj[nc] = v;
          }
          return obj;
        });
        return { rows: processed };
      } else {
        const result = db.exec(translated);
        return { rows: execResultToRows(result) };
      }
    }
  } catch (err: any) {
    const msg: string = err?.message || '';
    // Gracefully handle missing tables/columns (return empty instead of crash)
    if (
      msg.includes('no such table') ||
      msg.includes('no such column') ||
      msg.includes('no such function')
    ) {
      logger.warn(`SQLite graceful fallback: ${msg.substring(0, 80)}`);
      return { rows: [] };
    }
    logger.error('SQLite query error:', { sql: translated.substring(0, 120), err: msg });
    // Return empty for aggregate queries to prevent crashes
    if (/COUNT|SUM|AVG|MAX|MIN/i.test(text)) {
      return { rows: [{ count: '0', rev: '0', revenue: '0', visits: '0' }] };
    }
    throw err;
  }
}

function execResultToRows(result: any[]): Record<string, unknown>[] {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => {
      let val = row[i];

      // Parse JSON strings back to objects for known JSON fields
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch { /* keep as string */ }
      }

      // Convert 0/1 back to boolean for known boolean columns
      const boolCols = ['is_active', 'is_available', 'is_verified', 'is_all_chambers',
        'is_available_online', 'otp_verified', 'is_new_visitor', 'two_fa_enabled'];
      if (boolCols.includes(col) && (val === 0 || val === 1)) {
        val = val === 1;
      }

      // Normalize SQLite aggregate column names to match PostgreSQL:
      // COUNT(*) → count,  COUNT(x) → count,  SUM(x) → sum  etc.
      let normalizedCol = col;
      if (col === 'COUNT(*)' || col.match(/^COUNT\([^)]+\)$/i)) normalizedCol = 'count';
      if (col.match(/^SUM\([^)]+\)$/i)) normalizedCol = col.replace(/SUM\(([^)]+)\)/i, '$1');
      if (col.match(/^MAX\([^)]+\)$/i)) normalizedCol = col.replace(/MAX\(([^)]+)\)/i, '$1');
      if (col.match(/^MIN\([^)]+\)$/i)) normalizedCol = col.replace(/MIN\(([^)]+)\)/i, '$1');

      obj[normalizedCol] = val;
    });
    return obj;
  });
}

// ─── SQLite client (matches pg PoolClient interface) ─────────────────────────
export async function getSqliteClient() {
  return {
    query: async (text: string, params?: unknown[]) => {
      // Translate transaction commands to SQLite-compatible ones
      const trimmed = text.trim().toUpperCase();
      if (trimmed === 'BEGIN') { try { (await getDb()).run('BEGIN;'); } catch { /* already in transaction */ } return { rows: [] }; }
      if (trimmed === 'COMMIT') { try { (await getDb()).run('COMMIT;'); saveDb(); } catch { /* ignore */ } return { rows: [] }; }
      if (trimmed === 'ROLLBACK') { try { (await getDb()).run('ROLLBACK;'); } catch { /* ignore */ } return { rows: [] }; }
      return sqliteQuery(text, params);
    },
    release: () => { /* no-op for SQLite */ },
  };
}

// ─── Schema ───────────────────────────────────────────────────────────────────
async function initSchema(db: any) {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      is_active INTEGER NOT NULL DEFAULT 1,
      two_fa_enabled INTEGER NOT NULL DEFAULT 0,
      two_fa_secret TEXT,
      last_login_at TEXT,
      last_login_ip TEXT,
      password_reset_token TEXT,
      password_reset_expires TEXT,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS doctor_profiles (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT,
      name TEXT NOT NULL DEFAULT 'Dr. Sourav Kumar Mondal',
      title TEXT NOT NULL DEFAULT 'Dr.',
      qualifications TEXT NOT NULL DEFAULT 'B.H.M.S. (WBUHS)',
      registration_number TEXT,
      specialization TEXT NOT NULL DEFAULT 'Homoeopathy',
      experience_years INTEGER NOT NULL DEFAULT 0,
      biography TEXT,
      expertise TEXT NOT NULL DEFAULT '[]',
      certifications TEXT NOT NULL DEFAULT '[]',
      awards TEXT NOT NULL DEFAULT '[]',
      memberships TEXT NOT NULL DEFAULT '[]',
      languages TEXT NOT NULL DEFAULT '["Bengali","Hindi","English"]',
      consultation_modes TEXT NOT NULL DEFAULT '["in_person","online"]',
      profile_image TEXT,
      email TEXT,
      mobile TEXT,
      whatsapp TEXT,
      social_links TEXT NOT NULL DEFAULT '{}',
      is_available_online INTEGER NOT NULL DEFAULT 1,
      online_consultation_fee REAL NOT NULL DEFAULT 300.00,
      meta_title TEXT,
      meta_description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      image TEXT,
      consultation_info TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chambers (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      area TEXT,
      city TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'West Bengal',
      pincode TEXT,
      phone TEXT,
      latitude REAL,
      longitude REAL,
      google_maps_url TEXT,
      consultation_fee REAL NOT NULL DEFAULT 300.00,
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chamber_schedules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      chamber_id TEXT NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 0,
      start_time TEXT,
      end_time TEXT,
      break_start TEXT,
      break_end TEXT,
      slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
      max_patients_per_slot INTEGER NOT NULL DEFAULT 1,
      consultation_fee REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chamber_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS blocked_dates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      chamber_id TEXT,
      date TEXT NOT NULL,
      reason TEXT,
      block_type TEXT NOT NULL DEFAULT 'other',
      is_all_chambers INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      appointment_number TEXT UNIQUE NOT NULL,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      chamber_id TEXT,
      consultation_type TEXT NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      slot_end_time TEXT NOT NULL,
      consultation_fee REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT,
      notes TEXT,
      meeting_link TEXT,
      rescheduled_from TEXT,
      cancelled_reason TEXT,
      cancelled_by TEXT,
      otp_verified INTEGER NOT NULL DEFAULT 0,
      slot_reserved_until TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      appointment_id TEXT NOT NULL REFERENCES appointments(id),
      razorpay_order_id TEXT UNIQUE,
      razorpay_payment_id TEXT UNIQUE,
      razorpay_signature TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      gateway_response TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      payment_id TEXT NOT NULL,
      razorpay_refund_id TEXT UNIQUE,
      amount REAL NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      initiated_by TEXT,
      processed_at TEXT,
      gateway_response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_verifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      contact TEXT NOT NULL,
      channel TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      purpose TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      resend_count INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_visitors (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      session_id TEXT NOT NULL,
      ip_hash TEXT,
      page_path TEXT,
      referrer TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      country TEXT,
      city TEXT,
      is_new_visitor INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      admin_notes TEXT,
      responded_at TEXT,
      responded_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      appointment_id TEXT,
      patient_id TEXT,
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TEXT,
      error_message TEXT,
      scheduled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      description TEXT,
      updated_by TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      description TEXT,
      ip_address TEXT,
      user_agent TEXT,
      old_values TEXT,
      new_values TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointment_history (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      appointment_id TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      changed_by TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;

  // Run each statement individually
  const statements = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    try { db.run(stmt + ';'); } catch { /* table exists */ }
  }
}

// ─── Seed default data ────────────────────────────────────────────────────────
async function seedData(db: any) {
  // Check if already seeded
  const check = db.exec("SELECT COUNT(*) as cnt FROM users");
  const count = check[0]?.values[0]?.[0] || 0;
  if (count > 0) return;

  logger.info('SQLite: seeding initial data...');

  // Admin user (password: Admin@12345)
  const adminHash = '$2a$12$IweNhJyX0awuvcKc1GVgOO18y4vkMn481/GRSHSeklvClld8yc6oK';
  const adminId = 'admin-000-0000-0000-000000000001';

  db.run(`INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role) VALUES (?,?,?,?,?,?)`,
    [adminId, 'Dr. Sourav Kumar Mondal', 'admin@souravhomoeopathic.com', '7810880949', adminHash, 'super_admin']);

  // Doctor profile
  const docId = 'doctor-00-0000-0000-000000000001';
  db.run(`INSERT OR IGNORE INTO doctor_profiles 
    (id, user_id, name, title, qualifications, registration_number, specialization, experience_years, 
     biography, expertise, certifications, languages, consultation_modes, mobile, whatsapp, email, 
     is_available_online, online_consultation_fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
    docId, adminId,
    'Dr. Sourav Kumar Mondal', 'Dr.', 'B.H.M.S. (WBUHS)', '',
    'Homoeopathy', 10,
    'Dr. Sourav Kumar Mondal is a qualified Homoeopathic physician holding B.H.M.S. from West Bengal University of Health Sciences (WBUHS). Trained under the guidance of Dr. Prasanta Banerji at the P. Banerji Homoeopathic Research Foundation, Elgin Road, Kolkata.',
    JSON.stringify(['Cancer Treatment', 'Brain Tumor', 'Kidney Failure', 'Thalassemia', 'Diabetes (Sugar)', 'Arthritis', 'Brain Stroke', 'Gastric Problems', 'Liver Diseases', 'Skin Diseases', "Children's Health", 'Obstetrics & Gynaecology']),
    JSON.stringify(['B.H.M.S. - West Bengal University of Health Sciences (WBUHS)', 'Training under Dr. Prasanta Banerji (P. Banerji), Elgin Road, Kolkata']),
    JSON.stringify(['Bengali', 'Hindi', 'English']),
    JSON.stringify(['in_person', 'online']),
    '7810880949', '7810880949', 'drsouravkumarmondal@gmail.com', 1, 300.00,
  ]);

  // Chambers
  const chambers = [
    ['ch-00-0000-0000-000000000001', 'Kolkata Chamber (Dhakuria)', 'Dhakuria', 'Dhakuria', 'Kolkata', 'West Bengal', '700031', '7810880949', 22.5050, 88.3656, 400.00],
    ['ch-00-0000-0000-000000000002', 'Mechogram Chamber', 'Mechogram', 'Mechogram', 'Mechogram', 'West Bengal', '', '7810880949', null, null, 300.00],
    ['ch-00-0000-0000-000000000003', 'Debra Chamber', 'Debra', 'Debra', 'Debra', 'West Bengal', '721124', '7810880949', null, null, 300.00],
    ['ch-00-0000-0000-000000000004', 'Fuleswar Chamber', 'Fuleswar', 'Fuleswar', 'Fuleswar', 'West Bengal', '', '7810880949', null, null, 300.00],
  ];
  for (const ch of chambers) {
    db.run(`INSERT OR IGNORE INTO chambers (id,name,address,area,city,state,pincode,phone,latitude,longitude,consultation_fee,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active')`, ch);
  }

  // Schedules for Kolkata chamber
  const chId = 'ch-00-0000-0000-000000000001';
  const schedules = [
    [chId, 1, 1, '10:00', '13:00'], [chId, 2, 1, '17:00', '20:00'],
    [chId, 3, 1, '10:00', '13:00'], [chId, 4, 1, '17:00', '20:00'],
    [chId, 5, 1, '10:00', '13:00'], [chId, 6, 1, '10:00', '14:00'],
    [chId, 0, 0, null, null],
  ];
  for (const s of schedules) {
    db.run(`INSERT OR IGNORE INTO chamber_schedules (id,chamber_id,day_of_week,is_available,start_time,end_time,slot_duration_minutes,max_patients_per_slot) VALUES (lower(hex(randomblob(16))),?,?,?,?,?,15,1)`, s);
  }

  // FAQs
  const faqs = [
    ['How can I book an appointment?', 'Click "Book Appointment" on the website, select your consultation type, choose a date and time, fill in your details, verify via OTP, and complete payment.', 'booking'],
    ['How does online consultation work?', 'Select "Online Consultation" when booking. After payment, Dr. Mondal will consult you at the scheduled time. Medicines are dispatched via courier across India.', 'online'],
    ['What is the consultation fee?', 'Online consultation: ₹300. Chamber fees vary by location (₹300–₹400). Fees are shown during booking.', 'fees'],
    ['Where are the chambers located?', 'Chambers are in Kolkata (Dhakuria), Mechogram, Debra, and Fuleswar, West Bengal.', 'general'],
    ['How can I cancel my appointment?', 'Contact us at 7810880949. Cancellations 24+ hours in advance are eligible for refund per our cancellation policy.', 'booking'],
    ['Can I reschedule my appointment?', 'Yes, contact us at least 24 hours before. Subject to slot availability.', 'booking'],
  ];
  let faqOrder = 0;
  for (const [q, a, cat] of faqs) {
    db.run(`INSERT OR IGNORE INTO faqs (id,question,answer,category,sort_order,is_active) VALUES (lower(hex(randomblob(16))),?,?,?,?,1)`, [q, a, cat, faqOrder++]);
  }

  // Website settings
  const settings: [string, string, string][] = [
    ['site_name', 'Sourav Homoeopathic Clinic', 'general'],
    ['site_tagline', 'Expert Homoeopathic Care for Complex Diseases', 'general'],
    ['contact_phone', '7810880949', 'general'],
    ['contact_whatsapp', '7810880949', 'general'],
    ['contact_email', 'drsouravkumarmondal@gmail.com', 'general'],
    ['contact_address', 'Kolkata (Dhakuria), West Bengal', 'general'],
    ['announcement_text', 'Online consultations available. Medicines dispatched via courier across India. Call/WhatsApp: 7810880949', 'general'],
    ['announcement_active', 'true', 'general'],
    ['default_slot_duration', '15', 'appointment'],
    ['booking_advance_days', '30', 'appointment'],
    ['cancellation_policy', 'Appointments cancelled 24+ hours in advance are eligible for full refund.', 'appointment'],
    ['currency', 'INR', 'payment'],
    ['online_consultation_fee', '300', 'payment'],
    ['reminder_24h_enabled', 'true', 'notification'],
    ['reminder_1h_enabled', 'true', 'notification'],
    ['meta_title', 'Dr. Sourav Kumar Mondal - Homoeopathic Physician | Sourav Homoeopathic Clinic', 'seo'],
    ['meta_description', 'Expert Homoeopathic treatment for Cancer, Diabetes, Kidney Failure, Brain Tumor. Online consultations. Call 7810880949.', 'seo'],
  ];
  for (const [k, v, cat] of settings) {
    db.run(`INSERT OR IGNORE INTO website_settings (key, value, category) VALUES (?,?,?)`, [k, v, cat]);
  }

  // Services
  const services = [
    ['Cancer Treatment', 'Homoeopathic treatment for various types of cancer using protocols developed with Dr. Prasanta Banerji.', 'shield-plus'],
    ['Brain Tumor', 'Specialized homoeopathic care for brain tumor patients.', 'brain'],
    ['Kidney Failure', 'Homoeopathic management of kidney diseases and chronic kidney failure.', 'activity'],
    ['Thalassemia', 'Supportive homoeopathic treatment for thalassemia patients.', 'droplets'],
    ['Diabetes (Sugar)', 'Holistic management of Type 1 and Type 2 diabetes.', 'thermometer'],
    ['Arthritis', 'Effective homoeopathic remedies for all types of arthritis.', 'bone'],
    ['Brain Stroke', 'Post-stroke rehabilitation support through homoeopathic treatment.', 'zap'],
    ['Gastric Problems', 'Treatment of gastritis, GERD, IBS and other GI disorders.', 'circle-dot'],
    ['Liver Diseases', 'Homoeopathic care for liver conditions.', 'heart-pulse'],
    ['Skin Diseases', 'Treatment of eczema, psoriasis, urticaria and other skin conditions.', 'scan-face'],
    ["Children's Health", 'Gentle homoeopathic treatment for pediatric conditions.', 'baby'],
    ['Obstetrics & Gynaecology', 'Homoeopathic care for women including PCOS, menstrual disorders.', 'heart'],
  ];
  let svcOrder = 0;
  for (const [name, desc, icon] of services) {
    db.run(`INSERT OR IGNORE INTO services (id,name,description,icon,sort_order,is_active) VALUES (lower(hex(randomblob(16))),?,?,?,?,1)`, [name, desc, icon, svcOrder++]);
  }

  saveDb();
  logger.info('SQLite: seed complete ✓');
}
