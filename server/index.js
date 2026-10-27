// 每日十五词 서버. Railway에서 npm start로 실행한다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './lib/config.js';
import { HttpError, sendJson, redirect, readJsonBody, nowIso, clampStr } from './lib/util.js';
import { readSession, sessionCookie, clearCookie, tempCookie, parseCookies } from './lib/session.js';
import { authUrl, exchangeCode, fetchUserInfo } from './lib/google.js';
import { initDb, db, dbReady, log, getSetting, setSetting } from './lib/db.js';
import { checkQuota, correctWriting } from './lib/ai.js';
import { WEEKS, COURSES, courseOf, localWeek, weekData, curriculumSummary, WORDS_PER_WEEK } from './curriculum.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const TOTAL_WEEKS = COURSES.travel.weeks.length;
const PASS_QUIZ = 8; // 10문제 중 8개 이상이면 통과

// ---------------- 사용자 ----------------
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, picture: u.picture, role: u.role, status: u.status, createdAt: u.created_at, approvedAt: u.approved_at, lastActiveAt: u.last_active_at };
}

async function currentUser(req) {
  const s = readSession(req);
  if (!s?.uid || !dbReady()) return null;
  const [u] = await db()`SELECT * FROM users WHERE id = ${s.uid}`;
  return u || null;
}

async function requireUser(req, { approved = true } = {}) {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, '로그인이 필요합니다.', 'login');
  if (approved && u.status !== 'approved') throw new HttpError(403, u.status === 'pending' ? '관리자 승인을 기다리고 있습니다.' : '이용이 제한된 계정입니다. 관리자에게 문의하세요.', u.status);
  // 하루 한 번 정도만 마지막 활동 시각 갱신
  if (!u.last_active_at || Date.now() - new Date(u.last_active_at).getTime() > 5 * 60 * 1000) {
    await db()`UPDATE users SET last_active_at = now() WHERE id = ${u.id}`;
  }
  return u;
}

async function requireAdmin(req) {
  const u = await requireUser(req);
  if (u.role !== 'admin') throw new HttpError(403, '관리자만 볼 수 있습니다.', 'not_admin');
  return u;
}

// ---------------- 진도 계산 ----------------
function weekState(p) {
  const words = Math.min(WORDS_PER_WEEK, p?.words_learned || 0);
  const quiz = p?.quiz_best ?? null;
  const writing = Boolean(p?.writing_done);
  const steps = (words >= WORDS_PER_WEEK ? 1 : 0) + (quiz !== null && quiz >= PASS_QUIZ ? 1 : 0) + (writing ? 1 : 0);
  return { words, quiz, quizCount: p?.quiz_count || 0, writing, steps, done: steps === 3, completedAt: p?.completed_at || null };
}

async function refreshCompletion(userId, week) {
  const [p] = await db()`SELECT * FROM progress WHERE user_id = ${userId} AND week = ${week}`;
  const st = weekState(p);
  if (st.done && !p.completed_at) {
    await db()`UPDATE progress SET completed_at = now() WHERE user_id = ${userId} AND week = ${week}`;
    await log(userId, '주차 완료', `${week}주차를 모두 마쳤습니다.`);
    return true;
  }
  return false;
}

async function touchProgress(userId, week, patch) {
  await db()`INSERT INTO progress (user_id, week) VALUES (${userId}, ${week}) ON CONFLICT DO NOTHING`;
  await patch();
  await db()`UPDATE progress SET updated_at = now() WHERE user_id = ${userId} AND week = ${week}`;
  const justDone = await refreshCompletion(userId, week);
  const [p] = await db()`SELECT * FROM progress WHERE user_id = ${userId} AND week = ${week}`;
  return { state: weekState(p), justDone };
}

function kstDate(d) {
  return new Date(new Date(d).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

async function streakOf(userId) {
  const rows = await db()`SELECT DISTINCT to_char(at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS d FROM activity WHERE user_id = ${userId} AND action IN ('단어 학습', '퀴즈', '작문 제출', '출석') ORDER BY d DESC LIMIT 400`;
  const days = new Set(rows.map((r) => r.d));
  let n = 0;
  const today = kstDate(Date.now());
  const cur = new Date(`${today}T00:00:00Z`);
  if (!days.has(today)) cur.setUTCDate(cur.getUTCDate() - 1); // 오늘 아직 안 했으면 어제부터
  while (days.has(cur.toISOString().slice(0, 10))) {
    n++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return { streak: n, studiedToday: days.has(today), totalDays: days.size, days: [...days].slice(0, 120) };
}

// 주차 번호(gid)는 과정이 정한 번호(여행 1~15, HSK 101~115, 사회자 201~215)만 허용
function weekNo(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || !weekData(n)) throw new HttpError(404, '없는 주차입니다.', 'no_week');
  return n;
}
// 과정 정보 (준비 중인 과정은 ready=false)
function courseMeta(c) {
  return { key: c.key, name: c.name, level: c.level, ready: c.ready, weeks: c.weeks.length };
}
// 작문·기록에 저장된 주차 번호를 화면용(과정 안의 주차 번호)으로 바꿔 준다
function withLocalWeek(rows) {
  return rows.map((r) => ({ ...r, course: courseOf(r.week)?.key || 'travel', gid: r.week, week: localWeek(r.week) }));
}

// ---------------- 라우터 ----------------
const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
  routes.push({ method, re, keys, handler });
};

// 로그인
route('GET', '/auth/google', (req, res) => {
  if (!config.googleReady) throw new HttpError(503, '구글 로그인이 아직 설정되지 않았습니다.', 'google_not_ready');
  const state = crypto.randomBytes(16).toString('hex');
  redirect(res, authUrl(state), { 'Set-Cookie': tempCookie('ms_state', state) });
});

route('GET', '/auth/google/callback', async (req, res, { url }) => {
  const clear = tempCookie('ms_state', '', 0);
  if (url.searchParams.get('error')) return redirect(res, '/#/?login=cancel', { 'Set-Cookie': clear });
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || state !== parseCookies(req).ms_state) return redirect(res, '/#/?login=fail', { 'Set-Cookie': clear });
  const t = await exchangeCode(code);
  const g = await fetchUserInfo(t.access_token);
  if (!g.email || g.email_verified === false) return redirect(res, '/#/?login=fail', { 'Set-Cookie': clear });
  const email = String(g.email).toLowerCase();
  const isAdmin = config.adminEmails.includes(email);
  let [u] = await db()`SELECT * FROM users WHERE google_sub = ${g.sub} OR email = ${email} LIMIT 1`;
  if (!u) {
    const mode = await getSetting('approval_mode', 'manual');
    const status = isAdmin || mode === 'auto' ? 'approved' : 'pending';
    [u] = await db()`INSERT INTO users (google_sub, email, name, picture, role, status, approved_at, last_login_at)
      VALUES (${g.sub}, ${email}, ${g.name || email}, ${g.picture || ''}, ${isAdmin ? 'admin' : 'student'}, ${status}, ${status === 'approved' ? new Date() : null}, now())
      RETURNING *`;
    await log(u.id, '회원 가입', `${u.name} (${email}) — ${status === 'approved' ? '자동 승인' : '승인 대기'}`);
  } else {
    [u] = await db()`UPDATE users SET google_sub = ${g.sub}, name = ${g.name || u.name}, picture = ${g.picture || u.picture}, last_login_at = now(),
      role = ${isAdmin ? 'admin' : u.role}, status = ${isAdmin ? 'approved' : u.status}, approved_at = COALESCE(approved_at, ${isAdmin ? new Date() : null})
      WHERE id = ${u.id} RETURNING *`;
    await log(u.id, '로그인', '');
  }
  res.setHeader('Set-Cookie', [sessionCookie({ uid: u.id }), clear]);
  redirect(res, u.role === 'admin' ? '/#/admin' : '/#/home');
});

// 내 PC 시험용 로그인 (DEV_LOGIN=1일 때만. Railway에서는 켜지 말 것)
if (process.env.DEV_LOGIN === '1') {
  console.warn('[주의] DEV_LOGIN이 켜져 있습니다. 시험용으로만 쓰세요.');
  route('GET', '/auth/dev', async (req, res, { url }) => {
    const email = String(url.searchParams.get('email') || 'student@example.com').toLowerCase();
    const isAdmin = config.adminEmails.includes(email);
    let [u] = await db()`SELECT * FROM users WHERE email = ${email}`;
    if (!u) {
      const mode = await getSetting('approval_mode', 'manual');
      const status = isAdmin || mode === 'auto' ? 'approved' : 'pending';
      [u] = await db()`INSERT INTO users (google_sub, email, name, role, status, approved_at) VALUES (${'dev_' + email}, ${email}, ${url.searchParams.get('name') || email.split('@')[0]}, ${isAdmin ? 'admin' : 'student'}, ${status}, ${status === 'approved' ? new Date() : null}) RETURNING *`;
      await log(u.id, '회원 가입', `${u.name} (${email}) — ${status === 'approved' ? '자동 승인' : '승인 대기'}`);
    }
    redirect(res, u.role === 'admin' ? '/#/admin' : '/#/home', { 'Set-Cookie': sessionCookie({ uid: u.id }) });
  });
}

route('POST', '/auth/logout', (req, res) => sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() }));

route('GET', '/api/me', async (req, res) => {
  const u = await currentUser(req).catch(() => null);
  sendJson(res, 200, { user: publicUser(u), googleReady: config.googleReady, dbReady: dbReady(), aiReady: config.aiReady, totalWeeks: TOTAL_WEEKS, passQuiz: PASS_QUIZ });
});

route('GET', '/api/curriculum', (req, res, { url }) => {
  const c = COURSES[url.searchParams.get('course')] || COURSES.travel;
  sendJson(res, 200, { course: courseMeta(c), weeks: curriculumSummary(c.key), courses: Object.values(COURSES).map(courseMeta) });
});
// 로그인 없이 보는 맛보기: 1주차의 단어·문형·예문만 제공(저장·퀴즈·작문은 로그인 후)
route('GET', '/api/preview', (req, res, { url }) => {
  const c = COURSES[url.searchParams.get('course')] || COURSES.travel;
  if (!c.ready) return sendJson(res, 200, { notReady: true, course: courseMeta(c), courses: Object.values(COURSES).map(courseMeta) });
  const w = weekData(c.offset + 1);
  sendJson(res, 200, { course: courseMeta(c), week: { week: w.week, hsk: w.hsk, title: w.title, titleZh: w.titleZh, goal: w.goal, words: w.words, patterns: w.patterns, examples: w.examples, mission: w.mission }, total: c.weeks.length });
});

// ---------------- 학습자 ----------------
route('GET', '/api/dashboard', async (req, res, { url }) => {
  const u = await requireUser(req);
  const c = COURSES[url.searchParams.get('course')] || COURSES.travel;
  if (!c.ready) return sendJson(res, 200, { notReady: true, course: courseMeta(c), courses: Object.values(COURSES).map(courseMeta) });
  const rows = await db()`SELECT * FROM progress WHERE user_id = ${u.id}`;
  const byWeek = Object.fromEntries(rows.map((r) => [r.week, r]));
  const weeks = curriculumSummary(c.key).map((w) => ({ ...w, ...weekState(byWeek[w.gid]) }));
  const done = weeks.filter((w) => w.done).length;
  const current = weeks.find((w) => !w.done) || weeks[weeks.length - 1];
  const s = await streakOf(u.id);
  const [att] = await db()`SELECT 1 FROM activity WHERE user_id = ${u.id} AND action = '출석' AND to_char(at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') = ${kstDate(Date.now())} LIMIT 1`;
  const writings = await db()`SELECT id, week, score, created_at, left(content, 80) AS preview FROM writings WHERE user_id = ${u.id} AND week BETWEEN ${c.offset + 1} AND ${c.offset + c.weeks.length} ORDER BY created_at DESC LIMIT 5`;
  const today = weekData(current.gid);
  const dayIdx = Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000);
  sendJson(res, 200, {
    user: publicUser(u),
    weeks,
    course: courseMeta(c),
    courses: Object.values(COURSES).map(courseMeta),
    summary: {
      doneWeeks: done,
      attendedToday: Boolean(att),
      totalWeeks: weeks.length,
      wordsLearned: weeks.reduce((a, w) => a + w.words, 0),
      totalWords: weeks.length * WORDS_PER_WEEK,
      quizAvg: (() => {
        const q = weeks.filter((w) => w.quiz !== null);
        return q.length ? Math.round((q.reduce((a, w) => a + w.quiz, 0) / q.length) * 10) / 10 : null;
      })(),
      writings: (await db()`SELECT count(*)::int AS n FROM writings WHERE user_id = ${u.id}`)[0].n,
      ...s,
    },
    current: { gid: current.gid, week: current.week, title: current.title },
    todayWord: today.words[dayIdx % today.words.length],
    recentWritings: withLocalWeek(writings),
  });
});

route('GET', '/api/weeks/:n', async (req, res, { p }) => {
  const u = await requireUser(req);
  const n = weekNo(p.n);
  const [row] = await db()`SELECT * FROM progress WHERE user_id = ${u.id} AND week = ${n}`;
  const writings = await db()`SELECT id, content, feedback, score, created_at FROM writings WHERE user_id = ${u.id} AND week = ${n} ORDER BY created_at DESC LIMIT 10`;
  sendJson(res, 200, { week: weekData(n), state: weekState(row), writings: withLocalWeek(writings), total: courseOf(n).weeks.length, passQuiz: PASS_QUIZ });
});

// 출석체크: 하루에 한 번, 활동 기록에 '출석'으로 남긴다 (달력과 연속 학습일에 반영)
route('POST', '/api/attendance', async (req, res) => {
  const u = await requireUser(req);
  const today = kstDate(Date.now());
  const [hit] = await db()`SELECT 1 FROM activity WHERE user_id = ${u.id} AND action = '출석' AND to_char(at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') = ${today} LIMIT 1`;
  if (!hit) await log(u.id, '출석', today);
  sendJson(res, 200, { ok: true, attendedToday: true, already: Boolean(hit) });
});

route('POST', '/api/weeks/:n/words', async (req, res, { p, body }) => {
  const u = await requireUser(req);
  const n = weekNo(p.n);
  const count = Math.max(0, Math.min(WORDS_PER_WEEK, Math.round(Number(body.count) || 0)));
  const r = await touchProgress(u.id, n, () => db()`UPDATE progress SET words_learned = GREATEST(words_learned, ${count}) WHERE user_id = ${u.id} AND week = ${n}`);
  await log(u.id, '단어 학습', `${n}주차 단어 ${count}/${WORDS_PER_WEEK}`);
  sendJson(res, 200, r);
});

route('POST', '/api/weeks/:n/quiz', async (req, res, { p, body }) => {
  const u = await requireUser(req);
  const n = weekNo(p.n);
  const score = Math.max(0, Math.min(10, Math.round(Number(body.score) || 0)));
  const r = await touchProgress(u.id, n, () => db()`UPDATE progress SET quiz_best = GREATEST(COALESCE(quiz_best, 0), ${score}), quiz_count = quiz_count + 1 WHERE user_id = ${u.id} AND week = ${n}`);
  await log(u.id, '퀴즈', `${n}주차 퀴즈 ${score}/10`);
  sendJson(res, 200, r);
});

route('POST', '/api/weeks/:n/writing', async (req, res, { p, body }) => {
  const u = await requireUser(req);
  const n = weekNo(p.n);
  const text = clampStr(body.content, 1500).trim();
  if (text.length < 4) throw new HttpError(400, '작문을 조금 더 써 주세요.', 'too_short');
  const quota = checkQuota(u.id);
  const week = weekData(n);
  let fb;
  try {
    fb = await correctWriting(week, text);
  } catch (e) {
    throw e;
  }
  const score = Math.max(0, Math.min(100, Math.round(Number(fb.score) || 0)));
  const [w] = await db()`INSERT INTO writings (user_id, week, content, feedback, score) VALUES (${u.id}, ${n}, ${text}, ${db().json(fb)}, ${score}) RETURNING id, content, feedback, score, created_at`;
  const r = await touchProgress(u.id, n, () => db()`UPDATE progress SET writing_done = true WHERE user_id = ${u.id} AND week = ${n}`);
  await log(u.id, '작문 제출', `${n}주차 작문 (AI 점수 ${score})`);
  sendJson(res, 200, { writing: w, ...r, quota });
});

route('GET', '/api/writings', async (req, res) => {
  const u = await requireUser(req);
  const rows = await db()`SELECT id, week, content, feedback, score, created_at FROM writings WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 100`;
  sendJson(res, 200, { writings: withLocalWeek(rows) });
});

// ---------------- 관리자 ----------------
route('GET', '/api/admin/overview', async (req, res) => {
  await requireAdmin(req);
  const counts = await db()`SELECT status, count(*)::int AS n FROM users GROUP BY status`;
  const c = Object.fromEntries(counts.map((x) => [x.status, x.n]));
  const pending = await db()`SELECT id, email, name, picture, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50`;
  const weekDone = await db()`SELECT week, count(*)::int AS n FROM progress WHERE completed_at IS NOT NULL GROUP BY week ORDER BY week`;
  const weekStarted = await db()`SELECT week, count(*)::int AS n FROM progress GROUP BY week ORDER BY week`;
  const daily = await db()`SELECT to_char(at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS d, count(DISTINCT user_id)::int AS n FROM activity WHERE at > now() - interval '14 days' AND action IN ('단어 학습', '퀴즈', '작문 제출') GROUP BY d ORDER BY d`;
  const signups = await db()`SELECT to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS d, count(*)::int AS n FROM users WHERE created_at > now() - interval '14 days' GROUP BY d ORDER BY d`;
  const recent = await db()`SELECT a.action, a.detail, a.at, u.name, u.email FROM activity a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.at DESC LIMIT 30`;
  const wr = await db()`SELECT count(*)::int AS n, round(avg(score))::int AS avg FROM writings`;
  const active7 = await db()`SELECT count(*)::int AS n FROM users WHERE last_active_at > now() - interval '7 days'`;
  sendJson(res, 200, {
    counts: { total: Object.values(c).reduce((a, b) => a + b, 0), approved: c.approved || 0, pending: c.pending || 0, rejected: c.rejected || 0, suspended: c.suspended || 0, active7: active7[0].n },
    pending,
    weekDone: Array.from({ length: TOTAL_WEEKS }, (_, i) => ({ week: i + 1, done: weekDone.find((x) => x.week === i + 1)?.n || 0, started: weekStarted.find((x) => x.week === i + 1)?.n || 0 })),
    daily,
    signups,
    writings: wr[0],
    recent,
    approvalMode: await getSetting('approval_mode', 'manual'),
  });
});

route('GET', '/api/admin/users', async (req, res, { url }) => {
  await requireAdmin(req);
  const status = url.searchParams.get('status');
  const rows = await db()`
    SELECT u.id, u.email, u.name, u.picture, u.role, u.status, u.memo, u.created_at, u.approved_at, u.last_login_at, u.last_active_at,
      COALESCE(sum(CASE WHEN p.completed_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS done_weeks,
      COALESCE(sum(LEAST(p.words_learned, 15)), 0)::int AS words,
      (SELECT count(*)::int FROM writings w WHERE w.user_id = u.id) AS writings
    FROM users u LEFT JOIN progress p ON p.user_id = u.id
    ${status && status !== 'all' ? db()`WHERE u.status = ${status}` : db()``}
    GROUP BY u.id ORDER BY (u.status = 'pending') DESC, u.created_at DESC`;
  sendJson(res, 200, { users: rows, totalWeeks: TOTAL_WEEKS });
});

route('GET', '/api/admin/users/:id', async (req, res, { p }) => {
  await requireAdmin(req);
  const [u] = await db()`SELECT * FROM users WHERE id = ${Number(p.id)}`;
  if (!u) throw new HttpError(404, '회원을 찾지 못했습니다.', 'no_user');
  const rows = await db()`SELECT * FROM progress WHERE user_id = ${u.id}`;
  const byWeek = Object.fromEntries(rows.map((r) => [r.week, r]));
  const writings = await db()`SELECT id, week, content, feedback, score, created_at FROM writings WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 50`;
  const activity = await db()`SELECT action, detail, at FROM activity WHERE user_id = ${u.id} ORDER BY at DESC LIMIT 50`;
  sendJson(res, 200, { user: { ...publicUser(u), memo: u.memo, lastLoginAt: u.last_login_at }, weeks: curriculumSummary().map((w) => ({ ...w, ...weekState(byWeek[w.gid]) })), writings: withLocalWeek(writings), activity, streak: await streakOf(u.id) });
});

route('POST', '/api/admin/users/:id', async (req, res, { p, body }) => {
  const admin = await requireAdmin(req);
  const id = Number(p.id);
  const [u] = await db()`SELECT * FROM users WHERE id = ${id}`;
  if (!u) throw new HttpError(404, '회원을 찾지 못했습니다.', 'no_user');
  const a = body.action;
  if (u.id === admin.id && ['reject', 'suspend', 'make_student'].includes(a)) throw new HttpError(400, '자기 자신의 권한은 바꿀 수 없습니다.', 'self');
  const label = { approve: '가입 승인', reject: '가입 거절', suspend: '이용 정지', restore: '정지 해제', make_admin: '관리자 지정', make_student: '학습자로 변경', memo: '메모 수정' }[a];
  if (!label) throw new HttpError(400, '알 수 없는 작업입니다.', 'bad_action');
  if (a === 'approve' || a === 'restore') await db()`UPDATE users SET status = 'approved', approved_at = COALESCE(approved_at, now()) WHERE id = ${id}`;
  if (a === 'reject') await db()`UPDATE users SET status = 'rejected' WHERE id = ${id}`;
  if (a === 'suspend') await db()`UPDATE users SET status = 'suspended' WHERE id = ${id}`;
  if (a === 'make_admin') await db()`UPDATE users SET role = 'admin', status = 'approved', approved_at = COALESCE(approved_at, now()) WHERE id = ${id}`;
  if (a === 'make_student') await db()`UPDATE users SET role = 'student' WHERE id = ${id}`;
  if (a === 'memo') await db()`UPDATE users SET memo = ${clampStr(body.memo, 500)} WHERE id = ${id}`;
  await log(id, label, `관리자 ${admin.name}`);
  const [nu] = await db()`SELECT * FROM users WHERE id = ${id}`;
  sendJson(res, 200, { user: publicUser(nu) });
});

route('DELETE', '/api/admin/users/:id', async (req, res, { p }) => {
  const admin = await requireAdmin(req);
  const id = Number(p.id);
  if (id === admin.id) throw new HttpError(400, '자기 자신은 삭제할 수 없습니다.', 'self');
  const [u] = await db()`DELETE FROM users WHERE id = ${id} RETURNING email`;
  if (!u) throw new HttpError(404, '회원을 찾지 못했습니다.', 'no_user');
  await log(admin.id, '회원 삭제', u.email);
  sendJson(res, 200, { ok: true });
});

route('PUT', '/api/admin/settings', async (req, res, { body }) => {
  const admin = await requireAdmin(req);
  if (['manual', 'auto'].includes(body.approvalMode)) {
    await setSetting('approval_mode', body.approvalMode);
    await log(admin.id, '가입 방식 변경', body.approvalMode === 'auto' ? '자동 승인(개방형)' : '관리자 승인');
  }
  sendJson(res, 200, { approvalMode: await getSetting('approval_mode', 'manual') });
});

route('GET', '/api/admin/writings', async (req, res) => {
  await requireAdmin(req);
  const rows = await db()`SELECT w.id, w.week, w.content, w.feedback, w.score, w.created_at, u.name, u.email, u.id AS user_id FROM writings w JOIN users u ON u.id = w.user_id ORDER BY w.created_at DESC LIMIT 100`;
  rows.splice(0, rows.length, ...withLocalWeek(rows));
  sendJson(res, 200, { writings: rows });
});

route('GET', '/api/admin/export.csv', async (req, res) => {
  await requireAdmin(req);
  const rows = await db()`SELECT u.name, u.email, u.role, u.status, u.created_at, u.last_active_at,
    COALESCE(sum(CASE WHEN p.completed_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS done_weeks,
    (SELECT count(*)::int FROM writings w WHERE w.user_id = u.id) AS writings
    FROM users u LEFT JOIN progress p ON p.user_id = u.id GROUP BY u.id ORDER BY u.created_at`;
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const st = { approved: '승인', pending: '대기', rejected: '거절', suspended: '정지' };
  const lines = [['이름', '이메일', '역할', '상태', '가입일', '최근 활동', `완료 주차(/${TOTAL_WEEKS})`, '작문 수'].map(esc).join(',')];
  for (const r of rows) lines.push([r.name, r.email, r.role === 'admin' ? '관리자' : '학습자', st[r.status] || r.status, r.created_at && kstDate(r.created_at), r.last_active_at && kstDate(r.last_active_at), r.done_weeks, r.writings].map(esc).join(','));
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('每日十五词_회원목록.csv')}`, 'Cache-Control': 'no-store' });
  res.end('﻿' + lines.join('\r\n'));
});

// ---------------- 정적 파일 ----------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return false;
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  const ext = path.extname(file);
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300', 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end(), true;
  fs.createReadStream(file).pipe(res);
  return true;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  const url = new URL(req.url, 'http://local');
  const pathname = url.pathname;
  try {
    if (pathname === '/healthz') return sendJson(res, 200, { ok: true, db: dbReady(), at: nowIso() });
    if ((req.method === 'GET' || req.method === 'HEAD') && !pathname.startsWith('/api/') && !pathname.startsWith('/auth/') && serveStatic(req, res, pathname)) return;
    const r = routes.find((x) => x.method === req.method && x.re.test(pathname));
    if (!r) {
      if (req.method === 'GET' && !pathname.startsWith('/api/')) return serveStatic(req, res, '/') || sendJson(res, 404, { error: '없는 주소입니다.' });
      throw new HttpError(404, '없는 주소입니다.', 'not_found');
    }
    if (!['GET', 'HEAD'].includes(req.method) && req.headers['x-ms'] !== '1') throw new HttpError(403, '허용되지 않은 요청입니다.', 'csrf');
    const m = r.re.exec(pathname);
    const p = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readJsonBody(req) : {};
    await r.handler(req, res, { url, p, body });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error(`[오류] ${req.method} ${pathname}`, e);
    if (res.headersSent) return res.end();
    if (pathname.startsWith('/auth/')) return redirect(res, `/#/?login=${e.code === 'no_db' ? 'nodb' : 'fail'}`);
    sendJson(res, status, { error: status === 500 ? '서버에서 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.' : e.message, code: e.code || 'error' });
  }
});

server.requestTimeout = 120_000;
initDb()
  .catch((e) => console.error('[DB] 연결 실패:', e.message))
  .finally(() => {
    server.listen(config.port, () => {
      console.log(`每日十五词 서버 시작: ${config.baseUrl} (포트 ${config.port})`);
      console.log(`  구글 로그인: ${config.googleReady ? '설정됨' : '미설정'} · DB: ${dbReady() ? '연결됨' : '미연결'} · AI: ${config.aiReady ? '설정됨' : '미설정'} · 관리자: ${config.adminEmails.join(', ') || '(없음)'}`);
    });
  });
process.on('SIGTERM', () => server.close(() => process.exit(0)));
