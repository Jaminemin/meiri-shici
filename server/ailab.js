// AI 실습 기능: ① AI 댓글 연습 ② 유행어 해독기 + 내 단어장 ③ 교수자용 AI 학습 리포트
// 학생은 자기 기록만 보고, 리포트는 관리자(교수자)만 만든다. AI 호출은 하루 사용 한도(checkQuota)를 함께 쓴다.
import { HttpError, sendJson, clampStr } from './lib/util.js';
import { db, log } from './lib/db.js';
import { checkQuota } from './lib/ai.js';
import { judgeComment, decodeText, classReport } from './lib/ai-lab.js';
import { COURSES, DEFAULT_COURSE, curriculumSummary, localWeek } from './curriculum.js';
import { SHORTFORM_STUDY } from './shortform-study.js';
import { getLevel } from './lms.js';

const C = () => COURSES[DEFAULT_COURSE];
const gidOf = (local) => (local ? C().offset + Number(local) : null);
const validLocal = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= C().weeks.length ? n : null;
};
const MAX_COMMENTS = 10;
const MY_WORDS_MAX = 500;

// 주차별 연습용 게시물: 그 주 문장 두 개를 숏폼 캡션처럼 묶는다 (AI 호출 없음)
function practicePosts() {
  return curriculumSummary(DEFAULT_COURSE).map((w) => {
    const s = SHORTFORM_STUDY[w.week]?.sentences || [];
    return { week: w.week, title: w.title, zh: s.slice(0, 2).map((x) => x[0]).join(''), ko: s.slice(0, 2).map((x) => x[2]).join(' ') };
  });
}

export function registerAiLab({ route, requireUser, requireAdmin }) {
  // AI 실습 첫 화면: 최근 댓글 연습, 최근 해독, 단어장 수
  route('GET', '/api/lab', async (req, res) => {
    const u = await requireUser(req);
    const posts = await db()`SELECT id, week, left(content, 80) AS preview, jsonb_array_length(comments)::int AS n, created_at FROM comment_posts WHERE user_id = ${u.id} ORDER BY updated_at DESC LIMIT 20`;
    const decodes = await db()`SELECT id, left(text, 60) AS preview, result->>'summary' AS summary, created_at FROM decodes WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 10`;
    const [{ n }] = await db()`SELECT count(*)::int AS n FROM my_words WHERE user_id = ${u.id}`;
    const weeks = curriculumSummary(DEFAULT_COURSE).map((w) => ({ week: w.week, title: w.title }));
    sendJson(res, 200, { posts: posts.map((p) => ({ ...p, week: p.week ? localWeek(p.week) : null })), decodes, wordCount: n, weeks, practice: practicePosts(), level: await getLevel(u.id) });
  });

  // ================= ① AI 댓글 연습 =================
  // 연습할 게시물 정하기: 주차 연습 게시물 또는 내가 본 영상·게시물 설명 (AI 호출 없음)
  route('POST', '/api/comments', async (req, res, { body }) => {
    const u = await requireUser(req);
    const local = validLocal(body.week);
    const custom = clampStr(body.custom, 300).trim();
    let content = custom;
    let desc = '';
    if (!custom) {
      const pp = practicePosts().find((x) => x.week === local);
      if (!pp) throw new HttpError(400, '연습할 주차를 고르거나, 내가 본 영상·게시물 내용을 써 주세요.', 'no_post');
      content = pp.zh;
      desc = pp.ko;
    } else if (custom.length < 4) throw new HttpError(400, '영상·게시물 내용을 조금 더 써 주세요.', 'too_short');
    const level = (await getLevel(u.id)) || '초급';
    const [p] = await db()`INSERT INTO comment_posts (user_id, week, level, content, reaction, comments) VALUES (${u.id}, ${gidOf(local)}, ${level}, ${content}, ${desc}, ${db().json([])}) RETURNING id`;
    sendJson(res, 200, { id: p.id });
  });

  route('GET', '/api/comments/:id', async (req, res, { p }) => {
    const u = await requireUser(req);
    const [post] = await db()`SELECT * FROM comment_posts WHERE id = ${Number(p.id)} AND user_id = ${u.id}`;
    if (!post) throw new HttpError(404, '연습을 찾지 못했습니다.', 'no_post');
    sendJson(res, 200, { post: { ...post, week: post.week ? localWeek(post.week) : null }, max: MAX_COMMENTS });
  });

  // 내 댓글 달기 → AI가 중국 네티즌으로 답하고, 선생님으로 고쳐 준다
  route('POST', '/api/comments/:id/comment', async (req, res, { p, body }) => {
    const u = await requireUser(req);
    const [post] = await db()`SELECT * FROM comment_posts WHERE id = ${Number(p.id)} AND user_id = ${u.id}`;
    if (!post) throw new HttpError(404, '연습을 찾지 못했습니다.', 'no_post');
    const mine = (post.comments || []).filter((x) => x.mine);
    if (mine.length >= MAX_COMMENTS) throw new HttpError(400, `한 게시물에는 댓글을 ${MAX_COMMENTS}번까지 연습할 수 있어요. 새 게시물로 이어 가 주세요.`, 'too_many');
    const text = clampStr(body.text, 200).trim();
    if (!text) throw new HttpError(400, '댓글을 써 주세요.', 'empty');
    const quota = checkQuota(u.id);
    const local = post.week ? localWeek(post.week) : null;
    const w = local ? curriculumSummary(DEFAULT_COURSE).find((x) => x.week === local) : null;
    const history = mine.slice(-4).map((x) => `나: ${x.text}\nAI网友: ${x.reply?.text || ''}`).join('\n');
    const r = await judgeComment({ post: post.reaction ? `${post.content}\n(뜻: ${post.reaction})` : post.content, history, text, level: post.level, weekTitle: w ? `${w.week}주차 ${w.title} (${w.titleZh})` : '' });
    const item = {
      mine: true,
      text,
      eval: {
        score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
        verdict: ['good', 'fix', 'rewrite'].includes(r.verdict) ? r.verdict : 'fix',
        corrected: String(r.corrected || '').slice(0, 300),
        correctedPy: String(r.correctedPy || '').slice(0, 500),
        translation: String(r.translation || '').slice(0, 300),
        comment: String(r.comment || '').slice(0, 600),
        natives: (Array.isArray(r.natives) ? r.natives : []).slice(0, 3).map((b) => ({ zh: String(b.zh || ''), py: String(b.py || ''), ko: String(b.ko || '') })).filter((b) => b.zh),
      },
      reply: { text: String(r.reply?.text || '').slice(0, 200), py: String(r.reply?.py || '').slice(0, 400), ko: String(r.reply?.ko || '').slice(0, 300) },
      at: new Date().toISOString(),
    };
    const comments = [...(post.comments || []), item];
    await db()`UPDATE comment_posts SET comments = ${db().json(comments)}, updated_at = now() WHERE id = ${post.id}`;
    await log(u.id, 'AI 댓글 연습', `${text.slice(0, 40)} (${item.eval.score}점)`);
    sendJson(res, 200, { item, count: mine.length + 1, quota });
  });

  route('DELETE', '/api/comments/:id', async (req, res, { p }) => {
    const u = await requireUser(req);
    await db()`DELETE FROM comment_posts WHERE id = ${Number(p.id)} AND user_id = ${u.id}`;
    sendJson(res, 200, { ok: true });
  });

  // ================= ② 유행어 해독기 =================
  route('POST', '/api/decode', async (req, res, { body }) => {
    const u = await requireUser(req);
    const text = clampStr(body.text, 400).trim();
    if (text.length < 1) throw new HttpError(400, '해석할 중국어를 붙여 넣어 주세요.', 'empty');
    const quota = checkQuota(u.id);
    const r = await decodeText({ text, level: (await getLevel(u.id)) || '초급' });
    const result = {
      summary: String(r.summary || ''),
      pinyin: String(r.pinyin || ''),
      literal: String(r.literal || ''),
      natural: String(r.natural || ''),
      tone: String(r.tone || ''),
      caution: String(r.caution || ''),
      items: (Array.isArray(r.items) ? r.items : []).slice(0, 8).map((x) => ({
        term: String(x.term || '').slice(0, 40), py: String(x.py || '').slice(0, 80), meaning: String(x.meaning || '').slice(0, 120), usage: String(x.usage || '').slice(0, 400),
        example: String(x.example || '').slice(0, 120), examplePy: String(x.examplePy || '').slice(0, 300), exampleKo: String(x.exampleKo || '').slice(0, 200), slang: Boolean(x.slang),
      })).filter((x) => x.term),
      similar: (Array.isArray(r.similar) ? r.similar : []).slice(0, 4).map((x) => ({ zh: String(x.zh || ''), py: String(x.py || ''), ko: String(x.ko || '') })).filter((x) => x.zh),
    };
    const [d] = await db()`INSERT INTO decodes (user_id, text, result) VALUES (${u.id}, ${text}, ${db().json(result)}) RETURNING id`;
    await log(u.id, '유행어 해독', text.slice(0, 40));
    const saved = result.items.length ? (await db()`SELECT hanzi FROM my_words WHERE user_id = ${u.id} AND hanzi IN ${db()(result.items.map((x) => x.term))}`).map((x) => x.hanzi) : [];
    sendJson(res, 200, { id: d.id, text, result, saved, quota });
  });

  route('GET', '/api/decode/:id', async (req, res, { p }) => {
    const u = await requireUser(req);
    const [d] = await db()`SELECT * FROM decodes WHERE id = ${Number(p.id)} AND user_id = ${u.id}`;
    if (!d) throw new HttpError(404, '해독 기록을 찾지 못했습니다.', 'no_decode');
    const terms = (d.result.items || []).map((x) => x.term);
    const saved = terms.length ? (await db()`SELECT hanzi FROM my_words WHERE user_id = ${u.id} AND hanzi IN ${db()(terms)}`).map((x) => x.hanzi) : [];
    sendJson(res, 200, { id: d.id, text: d.text, result: d.result, saved });
  });

  // ================= 내 단어장 =================
  route('GET', '/api/my/words', async (req, res) => {
    const u = await requireUser(req);
    const words = await db()`SELECT id, hanzi, pinyin, meaning, note, source, created_at FROM my_words WHERE user_id = ${u.id} ORDER BY created_at DESC`;
    sendJson(res, 200, { words });
  });

  route('POST', '/api/my/words', async (req, res, { body }) => {
    const u = await requireUser(req);
    const list = (Array.isArray(body.words) ? body.words : [body]).slice(0, 20);
    const [{ n }] = await db()`SELECT count(*)::int AS n FROM my_words WHERE user_id = ${u.id}`;
    if (n + list.length > MY_WORDS_MAX) throw new HttpError(400, `단어장에는 ${MY_WORDS_MAX}개까지 넣을 수 있어요.`, 'too_many');
    let added = 0;
    for (const w of list) {
      const hanzi = clampStr(w.hanzi, 40).trim();
      if (!hanzi) continue;
      const r = await db()`INSERT INTO my_words (user_id, hanzi, pinyin, meaning, note, source) VALUES (${u.id}, ${hanzi}, ${clampStr(w.pinyin, 80).trim()}, ${clampStr(w.meaning, 120).trim()}, ${clampStr(w.note, 400).trim()}, ${clampStr(w.source, 200).trim()})
        ON CONFLICT (user_id, hanzi) DO UPDATE SET pinyin = EXCLUDED.pinyin, meaning = EXCLUDED.meaning, note = EXCLUDED.note RETURNING (xmax = 0) AS inserted`;
      if (r[0]?.inserted) added++;
    }
    if (added) await log(u.id, '단어장 저장', `${added}개`);
    sendJson(res, 200, { added });
  });

  route('DELETE', '/api/my/words/:id', async (req, res, { p }) => {
    const u = await requireUser(req);
    await db()`DELETE FROM my_words WHERE id = ${Number(p.id)} AND user_id = ${u.id}`;
    sendJson(res, 200, { ok: true });
  });

  // ================= ③ 교수자용 AI 학습 리포트 =================
  // 학생별 기록을 모은다 (AI에 보내는 양을 줄이려고 학생당 최근 오류만)
  async function collect(local) {
    const gid = gidOf(local);
    const off = C().offset;
    const max = off + C().weeks.length;
    const students = await db()`SELECT id, name, email FROM users WHERE status = 'approved' AND role <> 'admin' ORDER BY name`;
    const ids = students.map((s) => s.id);
    if (!ids.length) return { students: [], stats: { students: 0, active: 0 } };
    const inScope = (w) => (gid ? w === gid : w > off && w <= max);
    const prog = (await db()`SELECT user_id, week, quiz_best, words_learned, writing_done FROM progress WHERE user_id IN ${db()(ids)}`).filter((r) => inScope(r.week));
    const writings = (await db()`SELECT user_id, week, content, feedback, score FROM writings WHERE user_id IN ${db()(ids)} ORDER BY created_at DESC LIMIT 2000`).filter((r) => inScope(r.week));
    const talks = (await db()`SELECT user_id, week, feedback FROM ai_sessions WHERE user_id IN ${db()(ids)} AND kind = 'conversation' AND feedback IS NOT NULL ORDER BY created_at DESC LIMIT 1000`).filter((r) => inScope(r.week));
    const posts = (await db()`SELECT user_id, week, comments FROM comment_posts WHERE user_id IN ${db()(ids)} ORDER BY created_at DESC LIMIT 1000`).filter((r) => !gid || r.week === gid);
    const decodes = gid ? [] : await db()`SELECT user_id, result FROM decodes WHERE user_id IN ${db()(ids)} ORDER BY created_at DESC LIMIT 1000`;
    let active = 0;
    const out = students.map((s) => {
      const p = prog.filter((r) => r.user_id === s.id);
      const quiz = p.filter((r) => r.quiz_best !== null).map((r) => r.quiz_best);
      const errs = [];
      for (const w of writings.filter((r) => r.user_id === s.id)) for (const e of w.feedback?.errors || []) errs.push(`[과제] ${e.original} → ${e.fixed} (${e.reason})`);
      for (const t of talks.filter((r) => r.user_id === s.id)) for (const e of t.feedback?.errors || []) errs.push(`[회화] ${e.original} → ${e.better} (${e.why})`);
      for (const po of posts.filter((r) => r.user_id === s.id))
        for (const c of po.comments || []) {
          if (c.mine && c.eval?.verdict !== 'good') errs.push(`[댓글] ${c.text} → ${c.eval?.corrected}`);
          for (const rp of c.replies || []) if (rp.eval?.verdict !== 'good') errs.push(`[댓글] ${rp.text} → ${rp.eval?.corrected}`);
        }
      const looked = decodes.filter((r) => r.user_id === s.id).flatMap((r) => (r.result?.items || []).map((x) => x.term));
      const sw = writings.filter((r) => r.user_id === s.id);
      const rec = {
        name: s.name || s.email.split('@')[0],
        quizAvg: quiz.length ? Math.round((quiz.reduce((a, b) => a + b, 0) / quiz.length) * 10) / 10 : null,
        wordsLearned: p.reduce((a, r) => a + (r.words_learned || 0), 0),
        tasks: sw.length,
        aiScoreAvg: sw.length ? Math.round(sw.reduce((a, r) => a + (r.score || 0), 0) / sw.length) : null,
        errors: errs.slice(0, 12),
        lookedUp: [...new Set(looked)].slice(0, 10),
      };
      const has = rec.quizAvg !== null || rec.tasks || rec.errors.length || rec.lookedUp.length || rec.wordsLearned;
      if (has) active++;
      return has ? rec : null;
    }).filter(Boolean);
    return { students: out, stats: { students: students.length, active, errors: out.reduce((a, s) => a + s.errors.length, 0) } };
  }

  route('GET', '/api/admin/report', async (req, res, { url }) => {
    await requireAdmin(req);
    const local = validLocal(url.searchParams.get('week'));
    const gid = gidOf(local);
    const [rep] = gid
      ? await db()`SELECT r.*, u.name AS by_name FROM ai_reports r LEFT JOIN users u ON u.id = r.created_by WHERE r.week = ${gid} ORDER BY r.created_at DESC LIMIT 1`
      : await db()`SELECT r.*, u.name AS by_name FROM ai_reports r LEFT JOIN users u ON u.id = r.created_by WHERE r.week IS NULL ORDER BY r.created_at DESC LIMIT 1`;
    const { stats } = await collect(local);
    const weeks = curriculumSummary(DEFAULT_COURSE).map((w) => ({ week: w.week, title: w.title }));
    sendJson(res, 200, { report: rep ? { ...rep, week: rep.week ? localWeek(rep.week) : null } : null, stats, weeks, week: local });
  });

  route('POST', '/api/admin/report', async (req, res, { body }) => {
    const admin = await requireAdmin(req);
    const local = validLocal(body.week);
    const { students, stats } = await collect(local);
    if (!students.length) throw new HttpError(400, '아직 분석할 학생 기록이 없습니다. 학생들이 퀴즈·과제·AI 실습을 한 뒤 다시 만들어 주세요.', 'no_data');
    const quota = checkQuota(admin.id);
    const w = local ? curriculumSummary(DEFAULT_COURSE).find((x) => x.week === local) : null;
    const scope = w ? `${w.week}주차 · ${w.title}` : '15주 전체';
    const data = await classReport({ scope, students: students.slice(0, 60) });
    const [r] = await db()`INSERT INTO ai_reports (week, scope, data, stats, created_by) VALUES (${gidOf(local)}, ${scope}, ${db().json(data)}, ${db().json(stats)}, ${admin.id}) RETURNING id, created_at`;
    await log(admin.id, 'AI 학습 리포트', scope);
    sendJson(res, 200, { report: { id: r.id, week: local, scope, data, stats, created_at: r.created_at, by_name: admin.name }, quota });
  });
}
