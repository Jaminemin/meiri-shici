// 수업 운영 기능: 교수자 평가·성적, 팀 프로젝트(개인 대본 + 팀 영상), 콘텐츠 편집·학생 수준, AI 회화.
// 원칙: AI 결과는 참고 자료로만 따로 저장하고, 점수는 교수자가 확정한다. 학생은 자기 기록과 자기 팀 것만 본다.
import { HttpError, sendJson, clampStr } from './lib/util.js';
import { db, dbReady, log } from './lib/db.js';
import { checkQuota, correctWriting, convoTurn, convoFeedback } from './lib/ai.js';
import { COURSES, DEFAULT_COURSE, ASSESS, CONVO, LEVELS, TEAM_ROLES, EDITABLE, weekData, curriculumSummary, isClassWeek, localWeek, setCourseWeek, baseClassWeek, hasOverride, setCover } from './curriculum.js';

const C = () => COURSES[DEFAULT_COURSE];
const gidOf = (local) => C().offset + local;
const STATUS = { submitted: '평가 대기', resubmitted: '재제출 · 평가 대기', graded: '평가 완료', revise: '수정 요청' };
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const r1 = (v) => Math.round(v * 10) / 10;

// 주차별 평가 기준: 8주차 중간평가, 15주차 최종평가, 나머지는 주차 과제
export function rubricFor(gid) {
  const local = localWeek(gid);
  if (local === ASSESS.midterm.week) return { kind: 'midterm', items: ASSESS.midterm.items };
  if (local === ASSESS.final.week) return { kind: 'final', items: ASSESS.final.items };
  return { kind: 'weekly', items: ASSESS.weekly };
}
const maxOf = (items) => items.reduce((a, [, , m]) => a + m, 0);
// 항목별 점수를 배점 안으로 자르고 합계를 낸다 (빈 칸은 저장하지 않음)
function cleanScores(items, raw) {
  const out = {};
  let total = 0;
  let any = false;
  for (const [k, , max] of items) {
    const v = num(raw?.[k]);
    if (v === null || Number.isNaN(v)) continue;
    const c = Math.max(0, Math.min(max, Math.round(v * 2) / 2));
    out[k] = c;
    total += c;
    any = true;
  }
  return { scores: out, total: any ? total : null };
}

export async function getLevel(userId) {
  if (!dbReady()) return '';
  const [e] = await db()`SELECT level FROM enrollments WHERE user_id = ${userId} AND course = ${DEFAULT_COURSE}`;
  return e?.level || '';
}

// 학생이 과제를 내면 평가 상태를 '평가 대기'(또는 수정 요청 뒤 '재제출')로 둔다
export async function markSubmitted(userId, gid) {
  if (!isClassWeek(gid)) return;
  await db()`INSERT INTO week_grades (user_id, week, status) VALUES (${userId}, ${gid}, 'submitted')
    ON CONFLICT (user_id, week) DO UPDATE SET status = CASE WHEN week_grades.status = 'revise' THEN 'resubmitted' ELSE week_grades.status END, updated_at = now()`;
}

export async function weekGradeFor(userId, gid) {
  const [g] = await db()`SELECT status, scores, total, comment, graded_at FROM week_grades WHERE user_id = ${userId} AND week = ${gid}`;
  if (!g) return null;
  const visible = g.status === 'graded' || g.status === 'revise';
  return { status: g.status, label: STATUS[g.status] || g.status, total: visible && g.total !== null ? Number(g.total) : null, scores: visible ? g.scores : {}, comment: visible ? g.comment : '', gradedAt: g.graded_at };
}

// 성적 계산: 출석·참여 10 + 주차 과제 20 + 중간 25 + 프로젝트 30 + 최종 15
async function computeGrades(userIds) {
  if (!userIds.length) return {};
  const lo = gidOf(1);
  const hi = gidOf(C().weeks.length);
  const wg = await db()`SELECT user_id, week, status, total FROM week_grades WHERE user_id IN ${db()(userIds)} AND week BETWEEN ${lo} AND ${hi}`;
  const ex = await db()`SELECT user_id, participation FROM grade_extras WHERE user_id IN ${db()(userIds)}`;
  const pg = await db()`SELECT user_id, scores FROM project_grades WHERE user_id IN ${db()(userIds)}`;
  const tm = await db()`SELECT m.user_id, t.scores FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id IN ${db()(userIds)}`;
  const weeklyLocals = C().weeks.map((w) => w.week).filter((w) => w !== ASSESS.midterm.week && w !== ASSESS.final.week);
  const out = {};
  for (const id of userIds) {
    const mine = wg.filter((x) => x.user_id === id && x.status === 'graded' && x.total !== null);
    const at = (local) => mine.find((x) => x.week === gidOf(local));
    const weeklyScored = weeklyLocals.map(at).filter(Boolean);
    const weeklySum = weeklyScored.reduce((a, x) => a + Number(x.total), 0);
    const mid = at(ASSESS.midterm.week);
    const fin = at(ASSESS.final.week);
    const part = ex.find((x) => x.user_id === id)?.participation;
    const ind = pg.find((x) => x.user_id === id)?.scores || {};
    const team = tm.find((x) => x.user_id === id)?.scores || {};
    const sumOf = (items, s) => items.reduce((a, [k]) => a + (num(s[k]) || 0), 0);
    const hasAny = (items, s) => items.some(([k]) => num(s[k]) !== null);
    const project = hasAny(ASSESS.projectIndividual, ind) || hasAny(ASSESS.projectTeam, team) ? sumOf(ASSESS.projectIndividual, ind) + sumOf(ASSESS.projectTeam, team) : null;
    const comp = {
      participation: part === null || part === undefined ? null : Number(part),
      weekly: weeklyScored.length ? r1((weeklySum / (weeklyLocals.length * maxOf(ASSESS.weekly))) * 20) : null,
      midterm: mid ? r1((Number(mid.total) / maxOf(ASSESS.midterm.items)) * 25) : null,
      project,
      final: fin ? Number(fin.total) : null,
    };
    out[id] = { components: comp, total: r1(Object.values(comp).reduce((a, v) => a + (v || 0), 0)), weeklyGraded: weeklyScored.length, weeklyCount: weeklyLocals.length };
  }
  return out;
}

const studentsQuery = () => db()`SELECT u.id, u.name, u.email, u.picture, COALESCE(e.level, '') AS level FROM users u LEFT JOIN enrollments e ON e.user_id = u.id AND e.course = ${DEFAULT_COURSE} WHERE u.status = 'approved' AND u.role = 'student' ORDER BY u.name`;

export function registerLms({ route, requireUser, requireAdmin, weekNo }) {
  // ================= 학생: 성적 =================
  route('GET', '/api/my/grades', async (req, res) => {
    const u = await requireUser(req);
    const g = (await computeGrades([u.id]))[u.id];
    const rows = await db()`SELECT week, status, scores, total, comment, graded_at FROM week_grades WHERE user_id = ${u.id}`;
    const subs = await db()`SELECT week, count(*)::int AS n, max(created_at) AS last FROM writings WHERE user_id = ${u.id} GROUP BY week`;
    const weeks = curriculumSummary(DEFAULT_COURSE)
      .filter((w) => w.published !== false)
      .map((w) => {
        const r = rows.find((x) => x.week === w.gid);
        const s = subs.find((x) => x.week === w.gid);
        const visible = r && (r.status === 'graded' || r.status === 'revise');
        const rb = rubricFor(w.gid);
        return { gid: w.gid, week: w.week, title: w.title, dueAt: w.dueAt, kind: rb.kind, max: maxOf(rb.items), items: rb.items, submissions: s?.n || 0, lastAt: s?.last || null, status: r ? r.status : s ? 'submitted' : 'none', label: r ? STATUS[r.status] : s ? STATUS.submitted : '미제출', total: visible && r.total !== null ? Number(r.total) : null, scores: visible ? r.scores : {}, comment: visible ? r.comment : '' };
      });
    const [pgr] = await db()`SELECT scores, comment FROM project_grades WHERE user_id = ${u.id}`;
    const [team] = await db()`SELECT t.name, t.scores, t.comment FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id = ${u.id}`;
    sendJson(res, 200, { assess: ASSESS, grades: g, weeks, level: await getLevel(u.id), project: { individual: pgr?.scores || {}, individualComment: pgr?.comment || '', team: team?.scores || {}, teamName: team?.name || '', teamComment: team?.comment || '' } });
  });

  // ================= 관리자: 과제 평가 =================
  route('GET', '/api/admin/grading', async (req, res, { url }) => {
    await requireAdmin(req);
    const gid = weekNo(url.searchParams.get('week') || gidOf(1));
    const students = await studentsQuery();
    const rows = await db()`SELECT user_id, status, total, graded_at FROM week_grades WHERE week = ${gid}`;
    const subs = await db()`SELECT user_id, count(*)::int AS n, max(created_at) AS last FROM writings WHERE week = ${gid} GROUP BY user_id`;
    const w = weekData(gid);
    const rb = rubricFor(gid);
    const list = students.map((s) => {
      const r = rows.find((x) => x.user_id === s.id);
      const sub = subs.find((x) => x.user_id === s.id);
      const status = r ? r.status : sub ? 'submitted' : 'none';
      return { ...s, submissions: sub?.n || 0, lastAt: sub?.last || null, late: Boolean(w.dueAt && sub?.last && new Date(sub.last) > new Date(w.dueAt)), status, label: status === 'none' ? '미제출' : STATUS[status], total: r?.total !== null && r?.total !== undefined ? Number(r.total) : null };
    });
    const count = (k) => list.filter((x) => (k === 'waiting' ? ['submitted', 'resubmitted'].includes(x.status) : x.status === k)).length;
    sendJson(res, 200, { week: { gid, week: w.week, title: w.title, titleZh: w.titleZh, dueAt: w.dueAt, published: w.published }, weeks: curriculumSummary(DEFAULT_COURSE), rubric: rb, max: maxOf(rb.items), students: list, counts: { none: count('none'), waiting: count('waiting'), graded: count('graded'), revise: count('revise') } });
  });

  route('GET', '/api/admin/grading/:week/:uid', async (req, res, { p }) => {
    await requireAdmin(req);
    const gid = weekNo(p.week);
    const uid = Number(p.uid);
    const [s] = await db()`SELECT u.id, u.name, u.email, u.picture, COALESCE(e.level, '') AS level FROM users u LEFT JOIN enrollments e ON e.user_id = u.id AND e.course = ${DEFAULT_COURSE} WHERE u.id = ${uid}`;
    if (!s) throw new HttpError(404, '학생을 찾지 못했습니다.', 'no_user');
    const writings = await db()`SELECT id, content, feedback, score, created_at FROM writings WHERE user_id = ${uid} AND week = ${gid} ORDER BY created_at ASC`;
    const [g] = await db()`SELECT status, scores, total, comment, final_writing_id, graded_at FROM week_grades WHERE user_id = ${uid} AND week = ${gid}`;
    const w = weekData(gid);
    const rb = rubricFor(gid);
    sendJson(res, 200, { student: s, week: { gid, week: w.week, title: w.title, titleZh: w.titleZh, tasks: w.tasks, assess: w.assess, dueAt: w.dueAt }, rubric: rb, max: maxOf(rb.items), writings, grade: g || null });
  });

  route('PUT', '/api/admin/grading/:week/:uid', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const gid = weekNo(p.week);
    const uid = Number(p.uid);
    const status = body.status === 'revise' ? 'revise' : 'graded';
    const rb = rubricFor(gid);
    const { scores, total } = cleanScores(rb.items, body.scores);
    if (status === 'graded' && total === null) throw new HttpError(400, '점수를 하나 이상 넣어 주세요.', 'no_score');
    const comment = clampStr(body.comment, 2000).trim();
    const fw = num(body.finalWritingId);
    await db()`INSERT INTO week_grades (user_id, week, status, scores, total, comment, final_writing_id, graded_by, graded_at, updated_at)
      VALUES (${uid}, ${gid}, ${status}, ${db().json(scores)}, ${total}, ${comment}, ${fw}, ${admin.id}, now(), now())
      ON CONFLICT (user_id, week) DO UPDATE SET status = EXCLUDED.status, scores = EXCLUDED.scores, total = EXCLUDED.total, comment = EXCLUDED.comment, final_writing_id = EXCLUDED.final_writing_id, graded_by = EXCLUDED.graded_by, graded_at = now(), updated_at = now()`;
    await log(uid, status === 'revise' ? '수정 요청' : '과제 평가', `${localWeek(gid)}주차${total !== null ? ` ${total}/${maxOf(rb.items)}점` : ''}`);
    sendJson(res, 200, { ok: true, status, total });
  });

  // ================= 관리자: 성적부 · 참여 점수 · 학생 수준 =================
  route('GET', '/api/admin/gradebook', async (req, res) => {
    await requireAdmin(req);
    const students = await studentsQuery();
    const g = await computeGrades(students.map((s) => s.id));
    const ex = students.length ? await db()`SELECT user_id, participation, note FROM grade_extras WHERE user_id IN ${db()(students.map((s) => s.id))}` : [];
    const att = students.length ? await db()`SELECT user_id, count(*)::int AS days FROM attendance_records WHERE status IN ('present', 'late', 'excused') AND user_id IN ${db()(students.map((s) => s.id))} GROUP BY user_id` : [];
    const teams = await db()`SELECT m.user_id, t.name FROM team_members m JOIN teams t ON t.id = m.team_id`;
    sendJson(res, 200, {
      assess: ASSESS,
      levels: LEVELS,
      students: students.map((s) => ({ ...s, ...g[s.id], note: ex.find((x) => x.user_id === s.id)?.note || '', attendDays: att.find((x) => x.user_id === s.id)?.days || 0, team: teams.find((x) => x.user_id === s.id)?.name || '' })),
    });
  });

  route('PUT', '/api/admin/students/:uid', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const uid = Number(p.uid);
    if ('level' in body) {
      const level = LEVELS.includes(body.level) ? body.level : '';
      await db()`INSERT INTO enrollments (user_id, course, level) VALUES (${uid}, ${DEFAULT_COURSE}, ${level}) ON CONFLICT (user_id, course) DO UPDATE SET level = EXCLUDED.level`;
      await log(admin.id, '수준 지정', `${uid}번 학생 → ${level || '미정'}`);
    }
    if ('participation' in body) {
      const v = num(body.participation);
      const part = v === null || Number.isNaN(v) ? null : Math.max(0, Math.min(10, Math.round(v * 2) / 2));
      await db()`INSERT INTO grade_extras (user_id, participation, note) VALUES (${uid}, ${part}, ${clampStr(body.note, 300)}) ON CONFLICT (user_id) DO UPDATE SET participation = EXCLUDED.participation, note = EXCLUDED.note, updated_at = now()`;
    }
    sendJson(res, 200, { ok: true });
  });

  route('GET', '/api/admin/gradebook.csv', async (req, res) => {
    await requireAdmin(req);
    const students = await studentsQuery();
    const g = await computeGrades(students.map((s) => s.id));
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['이름', '이메일', '수준', ...ASSESS.components.map(([, n, m]) => `${n}(${m})`), '합계(100)'];
    const lines = [head.map(esc).join(',')];
    for (const s of students) {
      const c = g[s.id].components;
      lines.push([s.name, s.email, s.level, ...ASSESS.components.map(([k]) => c[k] ?? ''), g[s.id].total].map(esc).join(','));
    }
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="gradebook.csv"' });
    res.end('﻿' + lines.join('\n'));
  });

  // ================= 팀 프로젝트 (학생) =================
  async function myTeam(uid) {
    const [m] = await db()`SELECT m.team_id, m.roles, t.* FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id = ${uid}`;
    if (!m) return null;
    const members = await db()`SELECT u.id, u.name, u.picture, m.roles, COALESCE(s.status, 'none') AS script_status, s.content, s.updated_at
      FROM team_members m JOIN users u ON u.id = m.user_id LEFT JOIN scripts s ON s.user_id = m.user_id WHERE m.team_id = ${m.team_id} ORDER BY u.name`;
    return { id: m.team_id, name: m.name, topic: m.topic, topicStatus: m.topic_status, videoUrl: m.video_url, videoKind: m.video_kind, videoNote: m.video_note, videoAt: m.video_at, comment: m.comment, myRoles: m.roles, members };
  }

  route('GET', '/api/my/project', async (req, res) => {
    const u = await requireUser(req);
    const [s] = await db()`SELECT content, status, ai_feedback, comment, submitted_at, updated_at FROM scripts WHERE user_id = ${u.id}`;
    sendJson(res, 200, { team: await myTeam(u.id), script: s || null, roles: TEAM_ROLES, level: await getLevel(u.id), week14: weekData(gidOf(14)) });
  });

  // 개인 대본 저장(draft) · 제출(submitted). 승인된 대본은 교수자가 수정 요청해야 다시 고칠 수 있다.
  route('POST', '/api/my/script', async (req, res, { body }) => {
    const u = await requireUser(req);
    const content = clampStr(body.content, 3000).trim();
    const [cur] = await db()`SELECT status FROM scripts WHERE user_id = ${u.id}`;
    if (cur?.status === 'approved') throw new HttpError(400, '승인된 대본은 고칠 수 없습니다. 고쳐야 하면 교수자에게 수정 요청을 받으세요.', 'approved');
    const submit = Boolean(body.submit);
    if (submit && content.length < 10) throw new HttpError(400, '대본을 조금 더 써 주세요.', 'too_short');
    const status = submit ? 'submitted' : cur?.status === 'revise' ? 'revise' : 'draft';
    await db()`INSERT INTO scripts (user_id, content, status, submitted_at, updated_at) VALUES (${u.id}, ${content}, ${status}, ${submit ? new Date() : null}, now())
      ON CONFLICT (user_id) DO UPDATE SET content = EXCLUDED.content, status = EXCLUDED.status, submitted_at = COALESCE(EXCLUDED.submitted_at, scripts.submitted_at), updated_at = now()`;
    if (submit) await log(u.id, '대본 제출', `${content.length}자`);
    sendJson(res, 200, { ok: true, status });
  });

  // 대본 AI 첨삭: 원문은 그대로 두고 결과만 따로 저장한다
  route('POST', '/api/my/script/ai', async (req, res) => {
    const u = await requireUser(req);
    const [s] = await db()`SELECT content FROM scripts WHERE user_id = ${u.id}`;
    if (!s || s.content.trim().length < 4) throw new HttpError(400, '먼저 대본을 쓰고 저장해 주세요.', 'too_short');
    const quota = checkQuota(u.id);
    const fb = await correctWriting(weekData(gidOf(14)), s.content.slice(0, 1500), await getLevel(u.id));
    await db()`UPDATE scripts SET ai_feedback = ${db().json(fb)}, updated_at = now() WHERE user_id = ${u.id}`;
    await log(u.id, '대본 AI 첨삭', '');
    sendJson(res, 200, { feedback: fb, quota });
  });

  route('PUT', '/api/my/roles', async (req, res, { body }) => {
    const u = await requireUser(req);
    const names = TEAM_ROLES.map(([n]) => n);
    const roles = (Array.isArray(body.roles) ? body.roles : []).filter((r) => names.includes(r)).join(',');
    const r = await db()`UPDATE team_members SET roles = ${roles} WHERE user_id = ${u.id} RETURNING team_id`;
    if (!r.length) throw new HttpError(400, '아직 팀이 배정되지 않았습니다.', 'no_team');
    sendJson(res, 200, { ok: true, roles });
  });

  route('PUT', '/api/my/team', async (req, res, { body }) => {
    const u = await requireUser(req);
    const t = await myTeam(u.id);
    if (!t) throw new HttpError(400, '아직 팀이 배정되지 않았습니다.', 'no_team');
    if ('topic' in body) {
      if (t.topicStatus === 'approved') throw new HttpError(400, '승인된 주제는 교수자만 바꿀 수 있습니다.', 'approved');
      const topic = clampStr(body.topic, 300).trim();
      await db()`UPDATE teams SET topic = ${topic}, topic_status = ${topic ? 'proposed' : 'none'} WHERE id = ${t.id}`;
      await log(u.id, '팀 주제 제안', topic.slice(0, 80));
    }
    if ('videoUrl' in body) {
      const url = clampStr(body.videoUrl, 1000).trim();
      if (url && !/^https?:\/\//i.test(url)) throw new HttpError(400, '영상 주소는 http:// 또는 https://로 시작해야 합니다.', 'bad_url');
      const kind = body.videoKind === 'final' ? 'final' : 'draft';
      await db()`UPDATE teams SET video_url = ${url}, video_kind = ${url ? kind : ''}, video_note = ${clampStr(body.videoNote, 500).trim()}, video_at = ${url ? new Date() : null} WHERE id = ${t.id}`;
      await log(u.id, kind === 'final' ? '팀 영상 최종 제출' : '팀 영상 초안 제출', url.slice(0, 120));
    }
    sendJson(res, 200, { ok: true });
  });

  // ================= 팀 프로젝트 (관리자) =================
  route('GET', '/api/admin/teams', async (req, res) => {
    await requireAdmin(req);
    const teams = await db()`SELECT * FROM teams ORDER BY id`;
    const members = await db()`SELECT m.team_id, m.roles, u.id, u.name, u.email, COALESCE(e.level, '') AS level, COALESCE(s.status, 'none') AS script_status, s.content, s.comment AS script_comment, s.ai_feedback, s.updated_at AS script_at, pg.scores AS ind_scores, pg.comment AS ind_comment
      FROM team_members m JOIN users u ON u.id = m.user_id LEFT JOIN enrollments e ON e.user_id = u.id AND e.course = ${DEFAULT_COURSE}
      LEFT JOIN scripts s ON s.user_id = u.id LEFT JOIN project_grades pg ON pg.user_id = u.id ORDER BY u.name`;
    const students = await studentsQuery();
    const assigned = new Set(members.map((m) => m.id));
    sendJson(res, 200, { assess: ASSESS, roles: TEAM_ROLES, teams: teams.map((t) => ({ ...t, members: members.filter((m) => m.team_id === t.id) })), unassigned: students.filter((s) => !assigned.has(s.id)) });
  });

  route('POST', '/api/admin/teams', async (req, res, { body }) => {
    const admin = await requireAdmin(req);
    const name = clampStr(body.name, 60).trim();
    if (!name) throw new HttpError(400, '팀 이름을 넣어 주세요.', 'no_name');
    const [t] = await db()`INSERT INTO teams (name) VALUES (${name}) RETURNING *`;
    await log(admin.id, '팀 만들기', name);
    sendJson(res, 200, { team: t });
  });

  route('PUT', '/api/admin/teams/:id', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const id = Number(p.id);
    const [t] = await db()`SELECT * FROM teams WHERE id = ${id}`;
    if (!t) throw new HttpError(404, '팀을 찾지 못했습니다.', 'no_team');
    if ('name' in body && clampStr(body.name, 60).trim()) await db()`UPDATE teams SET name = ${clampStr(body.name, 60).trim()} WHERE id = ${id}`;
    if ('topicStatus' in body) await db()`UPDATE teams SET topic_status = ${['approved', 'proposed', 'revise', 'none'].includes(body.topicStatus) ? body.topicStatus : t.topic_status} WHERE id = ${id}`;
    if ('scores' in body) await db()`UPDATE teams SET scores = ${db().json(cleanScores(ASSESS.projectTeam, body.scores).scores)} WHERE id = ${id}`;
    if ('comment' in body) await db()`UPDATE teams SET comment = ${clampStr(body.comment, 2000)} WHERE id = ${id}`;
    await log(admin.id, '팀 수정', t.name);
    sendJson(res, 200, { ok: true });
  });

  route('DELETE', '/api/admin/teams/:id', async (req, res, { p }) => {
    const admin = await requireAdmin(req);
    const [t] = await db()`DELETE FROM teams WHERE id = ${Number(p.id)} RETURNING name`;
    if (!t) throw new HttpError(404, '팀을 찾지 못했습니다.', 'no_team');
    await log(admin.id, '팀 삭제', t.name);
    sendJson(res, 200, { ok: true });
  });

  // 팀원 배정·이동(teamId) · 빼기(teamId 없음). 학생은 직접 팀을 바꿀 수 없다.
  route('PUT', '/api/admin/members/:uid', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const uid = Number(p.uid);
    const teamId = num(body.teamId);
    if (teamId) {
      const [t] = await db()`SELECT id, name FROM teams WHERE id = ${teamId}`;
      if (!t) throw new HttpError(404, '팀을 찾지 못했습니다.', 'no_team');
      await db()`INSERT INTO team_members (user_id, team_id) VALUES (${uid}, ${teamId}) ON CONFLICT (user_id) DO UPDATE SET team_id = EXCLUDED.team_id`;
      await log(admin.id, '팀원 배정', `${uid}번 학생 → ${t.name}`);
    } else {
      await db()`DELETE FROM team_members WHERE user_id = ${uid}`;
      await log(admin.id, '팀원 빼기', `${uid}번 학생`);
    }
    sendJson(res, 200, { ok: true });
  });

  route('PUT', '/api/admin/scripts/:uid', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const uid = Number(p.uid);
    const status = ['approved', 'revise'].includes(body.status) ? body.status : null;
    if (!status) throw new HttpError(400, '승인 또는 수정 요청을 골라 주세요.', 'bad_status');
    const r = await db()`UPDATE scripts SET status = ${status}, comment = ${clampStr(body.comment, 2000)}, updated_at = now() WHERE user_id = ${uid} RETURNING user_id`;
    if (!r.length) throw new HttpError(404, '대본을 찾지 못했습니다.', 'no_script');
    await log(uid, status === 'approved' ? '대본 승인' : '대본 수정 요청', '');
    await log(admin.id, status === 'approved' ? '대본 승인' : '대본 수정 요청', `${uid}번 학생`);
    sendJson(res, 200, { ok: true });
  });

  route('PUT', '/api/admin/project-grades/:uid', async (req, res, { p, body }) => {
    await requireAdmin(req);
    const uid = Number(p.uid);
    const { scores } = cleanScores(ASSESS.projectIndividual, body.scores);
    await db()`INSERT INTO project_grades (user_id, scores, comment) VALUES (${uid}, ${db().json(scores)}, ${clampStr(body.comment, 2000)})
      ON CONFLICT (user_id) DO UPDATE SET scores = EXCLUDED.scores, comment = EXCLUDED.comment, updated_at = now()`;
    sendJson(res, 200, { ok: true });
  });

  // ================= 콘텐츠 편집 (관리자) =================
  route('GET', '/api/admin/content/:week', async (req, res, { p }) => {
    await requireAdmin(req);
    const gid = weekNo(p.week);
    if (!isClassWeek(gid)) throw new HttpError(400, '숏폼 과정 주차만 고칠 수 있습니다.', 'not_class');
    const base = baseClassWeek(gid);
    const w = weekData(gid);
    // 편집 화면에는 문형을 [문형, 설명, 예문, 뜻, 병음] 원래 형식으로 준다
    const current = Object.fromEntries(EDITABLE.map((k) => [k, k === 'patterns' ? (w.patterns || []).map((x) => [x.form, x.explain, x.zh, x.ko, x.py]) : k === 'creator' ? (w.creator || []).map((x) => [x.zh, x.py, x.ko, x.use]) : (w[k] ?? (k === 'caution' ? '' : null))]));
    const videos = await db()`SELECT id, url, title, creator, note, transcript, permission FROM week_videos WHERE week = ${gid} ORDER BY id`;
    sendJson(res, 200, { gid, week: localWeek(gid), current, base: { title: base.title }, edited: hasOverride(gid), dueAt: w.dueAt, published: w.published, cover: w.cover, weeks: curriculumSummary(DEFAULT_COURSE), videos });
  });

  route('PUT', '/api/admin/content/:week', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const gid = weekNo(p.week);
    if (!isClassWeek(gid)) throw new HttpError(400, '숏폼 과정 주차만 고칠 수 있습니다.', 'not_class');
    const base = baseClassWeek(gid);
    const s = (v, n) => clampStr(v, n).trim();
    const lines = (v, n = 20) => (Array.isArray(v) ? v : []).map((x) => s(x, 300)).filter(Boolean).slice(0, n);
    let data = {};
    if (!body.reset) {
      const d = body.data || {};
      const next = {
        title: s(d.title, 80) || base.title,
        titleZh: s(d.titleZh, 80) || base.titleZh,
        goal: s(d.goal, 300) || base.goal,
        goals: lines(d.goals, 8),
        focus: s(d.focus, 200),
        videos: lines(d.videos, 10),
        keywords: lines(d.keywords, 10).map((k) => k.slice(0, 30)),
        patterns: (Array.isArray(d.patterns) ? d.patterns : []).slice(0, 12).map((x) => [s(x?.[0], 80), s(x?.[1], 300), s(x?.[2], 200), s(x?.[3], 200), s(x?.[4], 300)]).filter((x) => x[0]),
        creator: (Array.isArray(d.creator) ? d.creator : []).slice(0, 15).map((x) => [s(x?.[0], 80), s(x?.[1], 120), s(x?.[2], 200), s(x?.[3], 300)]).filter((x) => x[0]),
        plan: (Array.isArray(d.plan) ? d.plan : []).slice(0, 15).map((x) => [s(x?.[0], 30), s(x?.[1], 200)]).filter((x) => x[0] && x[1]),
        tasks: { basic: s(d.tasks?.basic, 500) || base.tasks.basic, inter: s(d.tasks?.inter, 500) || base.tasks.inter },
        assess: s(d.assess, 300),
        caution: s(d.caution, 400),
      };
      // 원래 내용과 같은 항목은 저장하지 않는다 (나중에 기본 내용이 바뀌어도 따라가게)
      for (const k of EDITABLE) if (JSON.stringify(next[k] ?? '') !== JSON.stringify(base[k] ?? '')) data[k] = next[k];
    }
    let due = null;
    if (body.dueAt) {
      const d = new Date(body.dueAt);
      if (Number.isNaN(d.getTime())) throw new HttpError(400, '마감일 형식이 올바르지 않습니다.', 'bad_due');
      due = d;
    }
    const published = body.published !== false;
    await db()`INSERT INTO course_weeks (gid, data, due_at, published, updated_at) VALUES (${gid}, ${db().json(data)}, ${due}, ${published}, now())
      ON CONFLICT (gid) DO UPDATE SET data = EXCLUDED.data, due_at = EXCLUDED.due_at, published = EXCLUDED.published, updated_at = now()`;
    setCourseWeek(gid, { data, dueAt: due, published });
    await log(admin.id, body.reset ? '주차 내용 되돌리기' : '주차 내용 수정', `${localWeek(gid)}주차`);
    sendJson(res, 200, { ok: true, edited: Object.keys(data).length > 0 });
  });

  route('PUT', '/api/admin/videos/:id', async (req, res, { p, body }) => {
    await requireAdmin(req);
    const r = await db()`UPDATE week_videos SET transcript = ${clampStr(body.transcript, 6000)}, permission = ${clampStr(body.permission, 200).trim()} WHERE id = ${Number(p.id)} RETURNING id`;
    if (!r.length) throw new HttpError(404, '영상을 찾지 못했습니다.', 'no_video');
    sendJson(res, 200, { ok: true });
  });

  // ================= 주차 대표 이미지 =================
  route('GET', '/api/covers/:week', async (req, res, { p }) => {
    const [c] = await db()`SELECT mime, data, updated_at FROM week_covers WHERE gid = ${Number(p.week)}`;
    if (!c) throw new HttpError(404, '이미지가 없습니다.', 'no_cover');
    res.writeHead(200, { 'Content-Type': c.mime, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    res.end(c.data);
  });

  route('PUT', '/api/admin/content/:week/cover', async (req, res, { p, body }) => {
    const admin = await requireAdmin(req);
    const gid = weekNo(p.week);
    if (!isClassWeek(gid)) throw new HttpError(400, '숏폼 과정 주차만 고칠 수 있습니다.', 'not_class');
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ''));
    if (!m) throw new HttpError(400, 'JPG·PNG·WebP 이미지만 올릴 수 있습니다.', 'bad_image');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 2.5 * 1024 * 1024) throw new HttpError(413, '이미지가 너무 큽니다. 2.5MB 이하로 올려 주세요.', 'too_large');
    const source = clampStr(body.source, 100).trim();
    const sourceUrl = clampStr(body.sourceUrl, 500).trim();
    if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) throw new HttpError(400, '출처 주소는 http:// 또는 https://로 시작해야 합니다.', 'bad_url');
    const [c] = await db()`INSERT INTO week_covers (gid, mime, data, source, source_url, updated_at) VALUES (${gid}, ${m[1]}, ${buf}, ${source}, ${sourceUrl}, now())
      ON CONFLICT (gid) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, source = EXCLUDED.source, source_url = EXCLUDED.source_url, updated_at = now() RETURNING updated_at`;
    setCover(gid, { updatedAt: c.updated_at, source, sourceUrl });
    await log(admin.id, '대표 이미지 변경', `${localWeek(gid)}주차${source ? ` · ${source}` : ''}`);
    sendJson(res, 200, { ok: true });
  });

  route('DELETE', '/api/admin/content/:week/cover', async (req, res, { p }) => {
    const admin = await requireAdmin(req);
    const gid = weekNo(p.week);
    await db()`DELETE FROM week_covers WHERE gid = ${gid}`;
    setCover(gid, null);
    await log(admin.id, '대표 이미지 삭제', `${localWeek(gid)}주차`);
    sendJson(res, 200, { ok: true });
  });

  // ================= AI 회화 =================
  const scenario = (local) => CONVO.find((x) => x.week === Number(local));
  const MAX_TURNS = 12;

  route('GET', '/api/talk', async (req, res) => {
    const u = await requireUser(req);
    const sessions = await db()`SELECT id, week, level, jsonb_array_length(messages)::int AS n, feedback IS NOT NULL AS done, created_at FROM ai_sessions WHERE user_id = ${u.id} AND kind = 'conversation' ORDER BY created_at DESC LIMIT 30`;
    const weeks = curriculumSummary(DEFAULT_COURSE);
    sendJson(res, 200, { level: await getLevel(u.id), scenarios: CONVO.map((c) => ({ ...c, gid: gidOf(c.week), title: weeks.find((w) => w.week === c.week)?.title || '' })), sessions: sessions.map((s) => ({ ...s, week: localWeek(s.week) })) });
  });

  route('GET', '/api/talk/:id', async (req, res, { p }) => {
    const u = await requireUser(req);
    const [s] = await db()`SELECT * FROM ai_sessions WHERE id = ${Number(p.id)} AND user_id = ${u.id} AND kind = 'conversation'`;
    if (!s) throw new HttpError(404, '대화를 찾지 못했습니다.', 'no_session');
    sendJson(res, 200, { session: { ...s, week: localWeek(s.week) }, scenario: scenario(localWeek(s.week)), maxTurns: MAX_TURNS });
  });

  // 새 대화: AI가 상황에 맞는 첫마디를 건넨다 (AI 호출 없음)
  route('POST', '/api/talk', async (req, res, { body }) => {
    const u = await requireUser(req);
    const sc = scenario(body.week);
    if (!sc) throw new HttpError(404, '이 주차에는 회화 상황이 없습니다.', 'no_scenario');
    const level = (await getLevel(u.id)) || '초급';
    const first = [{ role: 'ai', text: sc.opener, at: new Date().toISOString() }];
    const [s] = await db()`INSERT INTO ai_sessions (user_id, week, kind, level, messages) VALUES (${u.id}, ${gidOf(sc.week)}, 'conversation', ${level}, ${db().json(first)}) RETURNING id`;
    await log(u.id, 'AI 회화 시작', `${sc.week}주차 · ${sc.situation}`);
    sendJson(res, 200, { id: s.id });
  });

  route('POST', '/api/talk/:id/say', async (req, res, { p, body }) => {
    const u = await requireUser(req);
    const [s] = await db()`SELECT * FROM ai_sessions WHERE id = ${Number(p.id)} AND user_id = ${u.id} AND kind = 'conversation'`;
    if (!s) throw new HttpError(404, '대화를 찾지 못했습니다.', 'no_session');
    if (s.feedback) throw new HttpError(400, '이미 끝난 대화입니다. 새 대화를 시작해 주세요.', 'ended');
    const text = clampStr(body.text, 300).trim();
    if (!text) throw new HttpError(400, '할 말을 입력해 주세요.', 'empty');
    const turns = s.messages.filter((m) => m.role === 'me').length;
    if (turns >= MAX_TURNS) throw new HttpError(400, `한 대화에서는 ${MAX_TURNS}번까지 말할 수 있어요. '대화 마치고 피드백 받기'를 눌러 주세요.`, 'too_long');
    const quota = checkQuota(u.id);
    const sc = scenario(localWeek(s.week));
    const msgs = [...s.messages, { role: 'me', text, at: new Date().toISOString() }];
    const r = await convoTurn(sc, s.level, msgs);
    const ai = { role: 'ai', text: String(r.reply || '').trim(), pinyin: r.pinyin || '', ko: r.ko || '', hint: r.hint || '', at: new Date().toISOString() };
    msgs[msgs.length - 1].correction = String(r.correction || '').trim();
    msgs.push(ai);
    await db()`UPDATE ai_sessions SET messages = ${db().json(msgs)}, updated_at = now() WHERE id = ${s.id}`;
    sendJson(res, 200, { messages: msgs, quota, turnsLeft: MAX_TURNS - turns - 1 });
  });

  route('POST', '/api/talk/:id/end', async (req, res, { p }) => {
    const u = await requireUser(req);
    const [s] = await db()`SELECT * FROM ai_sessions WHERE id = ${Number(p.id)} AND user_id = ${u.id} AND kind = 'conversation'`;
    if (!s) throw new HttpError(404, '대화를 찾지 못했습니다.', 'no_session');
    if (s.feedback) return sendJson(res, 200, { feedback: s.feedback });
    if (!s.messages.some((m) => m.role === 'me')) throw new HttpError(400, '먼저 한마디라도 해 보세요.', 'empty');
    const quota = checkQuota(u.id);
    const fb = await convoFeedback(scenario(localWeek(s.week)), s.level, s.messages);
    await db()`UPDATE ai_sessions SET feedback = ${db().json(fb)}, updated_at = now() WHERE id = ${s.id}`;
    await log(u.id, 'AI 회화 피드백', `${localWeek(s.week)}주차`);
    sendJson(res, 200, { feedback: fb, quota });
  });
}

// 서버 시작 때 교수자가 고친 주차 내용을 읽어 둔다
export async function loadCourseWeeks() {
  if (!dbReady()) return;
  const rows = await db()`SELECT gid, data, due_at, published FROM course_weeks`;
  for (const r of rows) setCourseWeek(r.gid, { data: r.data, dueAt: r.due_at, published: r.published });
  const covers = await db()`SELECT gid, source, source_url, updated_at FROM week_covers`;
  for (const c of covers) setCover(c.gid, { updatedAt: c.updated_at, source: c.source, sourceUrl: c.source_url });
  if (rows.length) console.log(`[수업] 교수자가 고친 주차 ${rows.length}개를 불러왔습니다.`);
}
