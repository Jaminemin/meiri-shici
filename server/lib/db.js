// 데이터베이스(PostgreSQL). Railway에서 Postgres를 추가하면 DATABASE_URL이 생긴다.
import postgres from 'postgres';
import { config } from './config.js';
import { HttpError } from './util.js';

let sql = null;

export function db() {
  if (!sql) throw new HttpError(503, '데이터베이스가 연결되지 않았습니다. Railway에서 Postgres를 추가하고 DATABASE_URL을 연결해 주세요.', 'no_db');
  return sql;
}

export const dbReady = () => Boolean(sql);

function sslFor(url) {
  if (/sslmode=/.test(url)) return undefined; // 주소에 적힌 설정을 따른다
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.railway.internal')) return false;
  return 'require';
}

export async function initDb() {
  if (!config.databaseUrl) {
    console.warn('[설정] DATABASE_URL이 없습니다. 회원 기능을 쓰려면 Railway에서 Postgres를 연결하세요.');
    return false;
  }
  sql = postgres(config.databaseUrl, { ssl: sslFor(config.databaseUrl), max: 5, idle_timeout: 30, onnotice: () => {} });
  try {
    await migrate();
  } catch (e) {
    sql = null;
    throw e;
  }
  console.log('[DB] 연결과 표 준비 완료');
  return true;
}

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_sub TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      picture TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'student',
      status TEXT NOT NULL DEFAULT 'pending',
      memo TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      approved_at TIMESTAMPTZ,
      last_login_at TIMESTAMPTZ,
      last_active_at TIMESTAMPTZ
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS progress (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INT NOT NULL,
      words_learned INT NOT NULL DEFAULT 0,
      quiz_best INT,
      quiz_count INT NOT NULL DEFAULT 0,
      writing_done BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, week)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS writings (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INT NOT NULL,
      content TEXT NOT NULL,
      feedback JSONB,
      score INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS activity (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS activity_at_idx ON activity (at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS activity_user_idx ON activity (user_id, at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS writings_user_idx ON writings (user_id, created_at DESC)`;
}

export async function log(userId, action, detail = '') {
  try {
    await db()`INSERT INTO activity (user_id, action, detail) VALUES (${userId}, ${action}, ${String(detail).slice(0, 300)})`;
  } catch (e) {
    console.error('[활동 기록 실패]', e.message);
  }
}

export async function getSetting(key, def) {
  const [r] = await db()`SELECT value FROM settings WHERE key = ${key}`;
  return r ? r.value : def;
}

export async function setSetting(key, value) {
  await db()`INSERT INTO settings (key, value) VALUES (${key}, ${String(value)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}
