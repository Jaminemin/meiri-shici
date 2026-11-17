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
  // 주차별 도우인 영상 링크 (영상 파일은 저장하지 않고 원본 링크만 둔다)
  await sql`
    CREATE TABLE IF NOT EXISTS week_videos (
      id SERIAL PRIMARY KEY,
      week INT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      creator TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS week_videos_week_idx ON week_videos (week, id)`;
  await sql`ALTER TABLE week_videos ADD COLUMN IF NOT EXISTS transcript TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE week_videos ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT ''`;
  // 교수자가 고친 주차 내용·과제 마감일·공개 여부
  await sql`
    CREATE TABLE IF NOT EXISTS course_weeks (
      gid INT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}',
      due_at TIMESTAMPTZ,
      published BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  // 학생 수준(초급·중급)은 사용자 속성이 아니라 수강 등록에 둔다
  await sql`
    CREATE TABLE IF NOT EXISTS enrollments (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, course)
    )`;
  // 주차 과제 평가 (교수자 점수·의견·상태). AI 점수는 writings.score에 따로 남는다.
  await sql`
    CREATE TABLE IF NOT EXISTS week_grades (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted',
      scores JSONB NOT NULL DEFAULT '{}',
      total NUMERIC,
      comment TEXT NOT NULL DEFAULT '',
      final_writing_id INT,
      graded_by INT,
      graded_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, week)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS grade_extras (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      participation NUMERIC,
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  // 팀 프로젝트: 팀 · 팀원(한 사람은 한 팀) · 개인 대본 · 개인 점수
  await sql`
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      topic_status TEXT NOT NULL DEFAULT 'none',
      video_url TEXT NOT NULL DEFAULT '',
      video_kind TEXT NOT NULL DEFAULT '',
      video_note TEXT NOT NULL DEFAULT '',
      video_at TIMESTAMPTZ,
      scores JSONB NOT NULL DEFAULT '{}',
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      roles TEXT NOT NULL DEFAULT ''
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS scripts (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      ai_feedback JSONB,
      comment TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS project_grades (
      user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      scores JSONB NOT NULL DEFAULT '{}',
      comment TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  // AI 회화 기록 (대화 원문과 AI 피드백을 따로 둔다)
  await sql`
    CREATE TABLE IF NOT EXISTS ai_sessions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week INT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'conversation',
      level TEXT NOT NULL DEFAULT '',
      messages JSONB NOT NULL DEFAULT '[]',
      feedback JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  await sql`CREATE INDEX IF NOT EXISTS ai_sessions_user_idx ON ai_sessions (user_id, created_at DESC)`;
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
