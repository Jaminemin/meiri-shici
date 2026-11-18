// 출석부: 교수자가 수업마다 출석을 열면 교실 화면에 30초마다 바뀌는 QR이 뜨고,
// 그 QR을 스캔한 학생만 출석으로 기록된다. 교수자는 출석부에서 지각·공결을 고치거나 CSV로 받는다.
import crypto from 'node:crypto';
import { HttpError, sendJson, clampStr } from './lib/util.js';
import { db, log } from './lib/db.js';

const SLOT_MS = 30_000;
const GRACE_SLOTS = 2; // 지금 QR과 그 앞 두 개(최대 약 90초)까지 인정
const STATUSES = ['present', 'late', 'excused'];
const STATUS_KO = { present: '출석', late: '지각', excused: '공결' };

const kstDate = (t = Date.now()) => new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
const tokenFor = (secret, slot) => crypto.createHmac('sha256', secret).update(String(slot)).digest('hex').slice(0, 12);
const currentToken = (secret, now = Date.now()) => tokenFor(secret, Math.floor(now / SLOT_MS));
function tokenOk(secret, token, now = Date.now()) {
  const slot = Math.floor(now / SLOT_MS);
  const got = Buffer.from(String(token || ''));
  for (let k = 0; k <= GRACE_SLOTS; k++) {
    const want = Buffer.from(tokenFor(secret, slot - k));
    if (got.length === want.length && crypto.timingSafeEqual(got, want)) return true;
  }
  return false;
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function registerAttendance({ route, requireUser, requireAdmin }) {
  // ---------- 학생: QR 스캔으로 출석 ----------
  route('POST', '/api/checkin', async (req, res, { body }) => {
    const u = await requireUser(req);
    const sid = Number(body?.sid);
    if (!Number.isInteger(sid)) throw new HttpError(400, 'QR 코드가 올바르지 않습니다.');
    const [s] = await db()`SELECT id, title, secret, closed_at, to_char(held_on, 'YYYY-MM-DD') AS d FROM attendance_sessions WHERE id = ${sid}`;
    if (!s) throw new HttpError(404, '출석을 찾을 수 없습니다.');
    if (s.closed_at) throw new HttpError(410, '이 수업의 출석은 마감되었습니다.');
    if (!tokenOk(s.secret, body?.token)) throw new HttpError(410, 'QR 코드가 만료되었습니다. 교실 화면에 새로 뜬 QR을 다시 스캔해 주세요.');
    const rows = await db()`INSERT INTO attendance_records (session_id, user_id) VALUES (${s.id}, ${u.id}) ON CONFLICT DO NOTHING RETURNING at`;
    const [rec] = await db()`SELECT status, at FROM attendance_records WHERE session_id = ${s.id} AND user_id = ${u.id}`;
    if (rows.length) await log(u.id, '출석', s.d);
    sendJson(res, 200, { ok: true, already: !rows.length, title: s.title, date: s.d, status: rec.status, at: rec.at });
  });

  // 학생: 내 출석 기록
  route('GET', '/api/attendance/mine', async (req, res) => {
    const u = await requireUser(req);
    const rows = await db()`SELECT s.id, s.title, to_char(s.held_on, 'YYYY-MM-DD') AS d, r.status FROM attendance_sessions s LEFT JOIN attendance_records r ON r.session_id = s.id AND r.user_id = ${u.id} ORDER BY s.held_on DESC, s.id DESC LIMIT 60`;
    sendJson(res, 200, { sessions: rows.map((r) => ({ ...r, status: r.status || null })) });
  });

  // ---------- 관리자 ----------
  route('GET', '/api/admin/attendance', async (req, res) => {
    await requireAdmin(req);
    const sessions = await db()`SELECT s.id, s.title, to_char(s.held_on, 'YYYY-MM-DD') AS d, s.opened_at, s.closed_at, (s.closed_at IS NULL) AS open,
        (SELECT count(*)::int FROM attendance_records r WHERE r.session_id = s.id) AS n
      FROM attendance_sessions s ORDER BY s.held_on DESC, s.id DESC LIMIT 40`;
    const students = await db()`SELECT id, name, email, picture FROM users WHERE status = 'approved' AND role = 'student' ORDER BY name`;
    const ids = sessions.map((s) => s.id);
    const records = ids.length ? await db()`SELECT session_id, user_id, status, via FROM attendance_records WHERE session_id IN ${db()(ids)}` : [];
    sendJson(res, 200, { sessions, students, records, statuses: STATUS_KO });
  });

  route('POST', '/api/admin/attendance/sessions', async (req, res, { body }) => {
    const a = await requireAdmin(req);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(body?.date || '') ? body.date : kstDate();
    const title = clampStr(body?.title, 60) || `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일 수업`;
    await db()`UPDATE attendance_sessions SET closed_at = now() WHERE closed_at IS NULL`; // 한 번에 하나만 연다
    const [s] = await db()`INSERT INTO attendance_sessions (title, held_on, secret, opened_by) VALUES (${title}, ${d}, ${crypto.randomBytes(24).toString('hex')}, ${a.id}) RETURNING id, title, to_char(held_on, 'YYYY-MM-DD') AS d`;
    sendJson(res, 200, { ok: true, session: s });
  });

  // 교실 화면: 지금 유효한 QR 토큰과 출석한 학생
  route('GET', '/api/admin/attendance/sessions/:id/qr', async (req, res, { p }) => {
    await requireAdmin(req);
    const [s] = await db()`SELECT id, title, secret, closed_at, to_char(held_on, 'YYYY-MM-DD') AS d FROM attendance_sessions WHERE id = ${Number(p.id)}`;
    if (!s) throw new HttpError(404, '출석을 찾을 수 없습니다.');
    const now = Date.now();
    const who = await db()`SELECT u.id, u.name, r.status, r.at FROM attendance_records r JOIN users u ON u.id = r.user_id WHERE r.session_id = ${s.id} ORDER BY r.at DESC`;
    sendJson(res, 200, { id: s.id, title: s.title, d: s.d, open: !s.closed_at, token: currentToken(s.secret, now), msLeft: SLOT_MS - (now % SLOT_MS), count: who.length, who });
  });

  route('POST', '/api/admin/attendance/sessions/:id/close', async (req, res, { p }) => {
    await requireAdmin(req);
    await db()`UPDATE attendance_sessions SET closed_at = COALESCE(closed_at, now()) WHERE id = ${Number(p.id)}`;
    sendJson(res, 200, { ok: true });
  });

  route('POST', '/api/admin/attendance/sessions/:id/reopen', async (req, res, { p }) => {
    await requireAdmin(req);
    await db()`UPDATE attendance_sessions SET closed_at = now() WHERE closed_at IS NULL AND id <> ${Number(p.id)}`;
    await db()`UPDATE attendance_sessions SET closed_at = NULL WHERE id = ${Number(p.id)}`;
    sendJson(res, 200, { ok: true });
  });

  route('DELETE', '/api/admin/attendance/sessions/:id', async (req, res, { p }) => {
    await requireAdmin(req);
    await db()`DELETE FROM attendance_sessions WHERE id = ${Number(p.id)}`;
    sendJson(res, 200, { ok: true });
  });

  // 출석부에서 손으로 고치기: status가 null이면 기록을 지워 결석으로 둔다
  route('PUT', '/api/admin/attendance/records', async (req, res, { body }) => {
    await requireAdmin(req);
    const sid = Number(body?.session_id), uid = Number(body?.user_id);
    if (!Number.isInteger(sid) || !Number.isInteger(uid)) throw new HttpError(400, '대상이 올바르지 않습니다.');
    if (body?.status === null) {
      await db()`DELETE FROM attendance_records WHERE session_id = ${sid} AND user_id = ${uid}`;
    } else {
      if (!STATUSES.includes(body?.status)) throw new HttpError(400, '상태가 올바르지 않습니다.');
      await db()`INSERT INTO attendance_records (session_id, user_id, status, via) VALUES (${sid}, ${uid}, ${body.status}, 'admin')
        ON CONFLICT (session_id, user_id) DO UPDATE SET status = EXCLUDED.status, via = 'admin'`;
    }
    sendJson(res, 200, { ok: true });
  });

  route('GET', '/api/admin/attendance/export', async (req, res) => {
    await requireAdmin(req);
    const sessions = await db()`SELECT id, title, to_char(held_on, 'YYYY-MM-DD') AS d FROM attendance_sessions ORDER BY held_on, id`;
    const students = await db()`SELECT id, name, email FROM users WHERE status = 'approved' AND role = 'student' ORDER BY name`;
    const recs = await db()`SELECT session_id, user_id, status FROM attendance_records`;
    const map = new Map(recs.map((r) => [`${r.session_id}:${r.user_id}`, r.status]));
    const head = ['이름', '이메일', ...sessions.map((s) => `${s.d} ${s.title}`), '출석', '지각', '공결', '결석'];
    const lines = [head.map(csvCell).join(',')];
    for (const st of students) {
      const cells = sessions.map((s) => map.get(`${s.id}:${st.id}`) || '');
      const c = (k) => cells.filter((x) => x === k).length;
      lines.push([st.name, st.email, ...cells.map((x) => (x ? STATUS_KO[x] : '결석')), c('present'), c('late'), c('excused'), cells.filter((x) => !x).length].map(csvCell).join(','));
    }
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('출석부.csv')}`, 'Cache-Control': 'no-store' });
    res.end('﻿' + lines.join('\r\n'));
  });
}
