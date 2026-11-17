// 교수자 화면: 과제 평가 · 성적부(참여 점수·학생 수준) · 팀 프로젝트 · 주차 콘텐츠 편집
import { esc, get, post, put, del, toast, confirmBox, fmtDate, ago } from './core.js';
import { feedbackHtml } from './fb.js';
import { adminTabs } from './admin.js';
import { statusBadge, dueText } from './lms.js';
import { coverHtml } from './cover.js';

const weekOptions = (weeks, gid) => weeks.map((w) => `<option value="${w.gid}" ${w.gid === gid ? 'selected' : ''}>${w.week}주차 · ${esc(w.title)}${w.published === false ? ' (비공개)' : ''}</option>`).join('');
const scoreInputs = (items, scores = {}) =>
  items.map(([k, n, max]) => `<label class="score-in"><span>${esc(n)}</span><span><input type="number" min="0" max="${max}" step="0.5" data-k="${k}" value="${scores[k] ?? ''}"> / ${max}</span></label>`).join('');
const readScores = (root) => Object.fromEntries([...root.querySelectorAll('[data-k]')].filter((i) => i.value !== '').map((i) => [i.dataset.k, Number(i.value)]));

// ================= 과제 평가: 주차별 학생 목록 =================
export async function renderAdminGrading(app, ctx) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const q = ctx.week ? `?week=${ctx.week}` : sessionStorage.getItem('ms_gweek') ? `?week=${sessionStorage.getItem('ms_gweek')}` : '';
  const d = await get(`/api/admin/grading${q}`);
  const W = d.week;
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>관리자</h1><p>학생이 낸 과제를 보고 항목별 점수와 의견을 남깁니다. AI 점수는 참고용이고, 성적에는 교수님 점수만 들어갑니다.</p></div></div>
    ${adminTabs('grading')}
    <div class="card row between" style="flex-wrap:wrap;gap:10px">
      <label class="row" style="gap:8px">주차 <select id="g-week">${weekOptions(d.weeks, W.gid)}</select></label>
      <span class="muted" style="font-size:14px">${W.dueAt ? `📅 ${esc(dueText(W.dueAt))}` : '마감일 없음'} · <a href="#/admin/content/${W.gid}">마감일·내용 고치기</a></span>
    </div>
    <div class="stats">
      <div class="stat"><div class="label">미제출</div><div class="value">${d.counts.none}</div></div>
      <div class="stat"><div class="label">평가 대기</div><div class="value">${d.counts.waiting}</div></div>
      <div class="stat"><div class="label">평가 완료</div><div class="value">${d.counts.graded}</div></div>
      <div class="stat"><div class="label">수정 요청</div><div class="value">${d.counts.revise}</div></div>
    </div>
    <div class="table-wrap"><table class="list"><thead><tr><th>학생</th><th>수준</th><th>제출</th><th>상태</th><th>점수 (/${d.max})</th></tr></thead><tbody>
      ${d.students
        .map(
          (s) => `<tr class="click" onclick="location.hash='#/admin/grading/${W.gid}/${s.id}'"><td><b>${esc(s.name)}</b><div class="muted" style="font-size:12px">${esc(s.email)}</div></td><td>${esc(s.level || '–')}</td>
          <td>${s.submissions ? `${s.submissions}건 · ${ago(s.lastAt)}${s.late ? ' <span class="badge bad">기한 후</span>' : ''}` : '–'}</td><td>${statusBadge(s.status, s.label)}</td><td>${s.total ?? '–'}</td></tr>`,
        )
        .join('') || '<tr><td colspan="5" class="muted">승인된 학생이 없습니다.</td></tr>'}
    </tbody></table></div>
  </div>`;
  app.querySelector('#g-week').onchange = (e) => {
    sessionStorage.setItem('ms_gweek', e.target.value);
    location.hash = `#/admin/grading/${e.target.value}`;
  };
}

// ================= 과제 평가: 한 학생 =================
export async function renderAdminGrade(app, ctx) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get(`/api/admin/grading/${ctx.week}/${ctx.uid}`);
  const g = d.grade || {};
  const W = d.week;
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><a href="#/admin/grading/${W.gid}" class="muted" style="text-decoration:none">← ${W.week}주차 평가 목록</a>
      <h1 style="margin-top:6px">${esc(d.student.name)} · ${W.week}주차 ${esc(W.title)}</h1>
      <p>${d.student.level ? `수준: <b>${esc(d.student.level)}</b> · ` : ''}${W.dueAt ? esc(dueText(W.dueAt)) : '마감일 없음'}${g.status ? ` · 지금 상태: ${esc({ submitted: '평가 대기', resubmitted: '재제출', graded: '평가 완료', revise: '수정 요청' }[g.status] || g.status)}` : ''}</p></div></div>
    <div class="grid2 course-two"><div class="card cw-task"><span class="badge">초급 과제</span><p>${esc(W.tasks.basic)}</p></div><div class="card cw-task"><span class="badge accent">중급 과제</span><p>${esc(W.tasks.inter)}</p></div></div>
    <div class="section-title">학생 제출 (${d.writings.length}건) — 원문 · AI 첨삭</div>
    ${d.writings
      .map(
        (w, i) => `<div class="g-sub ${W.dueAt && new Date(w.created_at) > new Date(W.dueAt) ? 'late' : ''}"><label class="row" style="gap:6px;margin:0 0 6px"><input type="radio" name="final" value="${w.id}" ${(g.final_writing_id ? g.final_writing_id === w.id : i === d.writings.length - 1) ? 'checked' : ''}> <b>${i + 1}번째 제출</b>${i === d.writings.length - 1 ? ' (최종)' : ''}<small class="muted">${fmtDate(w.created_at, true)}${W.dueAt && new Date(w.created_at) > new Date(W.dueAt) ? ' · 기한 후 제출' : ''}</small></label>${feedbackHtml(w)}</div>`,
      )
      .join('') || '<div class="empty">아직 제출한 과제가 없습니다.</div>'}
    <div class="card g-form" id="g-form">
      <div class="card-head"><h3>교수자 평가 (${d.max}점)</h3><b id="g-sum"></b></div>
      <div class="score-grid">${scoreInputs(d.rubric.items, g.scores)}</div>
      <label class="vlabel">평가 의견 (학생에게 보입니다)<textarea id="g-comment" rows="4" maxlength="2000">${esc(g.comment || '')}</textarea></label>
      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px"><button class="btn" id="g-revise">수정 요청 보내기</button><button class="btn primary" id="g-save">평가 완료</button></div>
    </div>
  </div>`;
  const form = app.querySelector('#g-form');
  const sum = () => {
    const s = readScores(form);
    app.querySelector('#g-sum').textContent = Object.keys(s).length ? `합계 ${Object.values(s).reduce((a, b) => a + b, 0)} / ${d.max}` : '';
  };
  form.querySelectorAll('[data-k]').forEach((i) => (i.oninput = sum));
  sum();
  const save = async (status) => {
    const finalId = app.querySelector('input[name=final]:checked')?.value;
    try {
      await put(`/api/admin/grading/${W.gid}/${d.student.id}`, { status, scores: readScores(form), comment: app.querySelector('#g-comment').value, finalWritingId: finalId ? Number(finalId) : null });
      toast(status === 'revise' ? '수정 요청을 보냈습니다.' : '평가를 저장했습니다.');
      location.hash = `#/admin/grading/${W.gid}`;
    } catch (e) {
      toast(e.message, 'bad');
    }
  };
  app.querySelector('#g-save').onclick = () => save('graded');
  app.querySelector('#g-revise').onclick = () => {
    if (!app.querySelector('#g-comment').value.trim()) return toast('무엇을 고쳐야 하는지 의견을 적어 주세요.', 'bad');
    save('revise');
  };
}

// ================= 성적부 =================
export async function renderAdminGradebook(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get('/api/admin/gradebook');
  const comps = d.assess.components;
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>관리자</h1><p>학생별 성적을 모아 봅니다. 학생 수준(초급·중급)과 출석·참여 점수는 여기에서 바로 넣습니다.</p></div><a class="btn" href="/api/admin/gradebook.csv">CSV 내려받기</a></div>
    ${adminTabs('gradebook')}
    <div class="table-wrap"><table class="list gradebook"><thead><tr><th>학생</th><th>수준</th><th>팀</th>${comps.map(([, n, m]) => `<th>${esc(n)}<br><small>/${m}</small></th>`).join('')}<th>합계<br><small>/100</small></th></tr></thead><tbody>
      ${d.students
        .map(
          (s) => `<tr data-uid="${s.id}"><td><a href="#/admin/users/${s.id}"><b>${esc(s.name)}</b></a><div class="muted" style="font-size:12px">출석 ${s.attendDays}일</div></td>
          <td><select data-level>${['', ...d.levels].map((l) => `<option value="${l}" ${s.level === l ? 'selected' : ''}>${l || '미정'}</option>`).join('')}</select></td>
          <td>${esc(s.team || '–')}</td>
          ${comps
            .map(([k]) =>
              k === 'participation'
                ? `<td><input type="number" min="0" max="10" step="0.5" data-part value="${s.components.participation ?? ''}" style="width:64px"></td>`
                : `<td>${s.components[k] ?? '<span class="muted">–</span>'}${k === 'weekly' ? `<div class="muted" style="font-size:11px">${s.weeklyGraded}/${s.weeklyCount}주</div>` : ''}</td>`,
            )
            .join('')}
          <td><b>${s.total}</b></td></tr>`,
        )
        .join('') || `<tr><td colspan="${comps.length + 4}" class="muted">승인된 학생이 없습니다.</td></tr>`}
    </tbody></table></div>
    <p class="muted" style="font-size:13px">주차별 과제(20점)는 1~7·9~14주(13개 주차) 점수를 모아 바꿉니다. 중간평가는 8주차(100점→25점), 최종평가는 15주차(15점), 프로젝트는 '팀 프로젝트'에서 매긴 개인 15 + 팀 15점입니다.</p>
  </div>`;
  app.querySelectorAll('tr[data-uid]').forEach((tr) => {
    const uid = tr.dataset.uid;
    tr.querySelector('[data-level]').onchange = async (e) => {
      try { await put(`/api/admin/students/${uid}`, { level: e.target.value }); toast('수준을 저장했습니다.'); } catch (err) { toast(err.message, 'bad'); }
    };
    tr.querySelector('[data-part]').onchange = async (e) => {
      try { await put(`/api/admin/students/${uid}`, { participation: e.target.value }); toast('참여 점수를 저장했습니다.'); renderAdminGradebook(app); } catch (err) { toast(err.message, 'bad'); }
    };
  });
}

// ================= 팀 프로젝트 =================
const SCRIPT = { none: ['미작성', ''], draft: ['임시 저장', ''], submitted: ['승인 대기', 'warn'], approved: ['승인', 'accent'], revise: ['수정 요청', 'bad'] };
const TOPIC = { none: '주제 미정', proposed: '주제 제안됨', approved: '주제 승인', revise: '주제 수정 요청' };

export async function renderAdminTeams(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get('/api/admin/teams');
  const A = d.assess;
  const teamOpts = (cur) => `<option value="">팀 빼기</option>${d.teams.map((t) => `<option value="${t.id}" ${t.id === cur ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}`;
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>관리자</h1><p>3~4명씩 팀을 짜고, 개인 대본 승인 · 팀 주제 승인 · 팀 영상 확인 · 점수를 매깁니다. 학생은 팀을 직접 바꿀 수 없습니다.</p></div></div>
    ${adminTabs('teams')}
    <div class="card row" style="gap:8px;flex-wrap:wrap"><input id="t-name" placeholder="새 팀 이름 (예: 판다팀)" maxlength="60" style="flex:1;min-width:180px"><button class="btn primary" id="t-add">＋ 팀 만들기</button></div>
    ${d.unassigned.length ? `<div class="card"><div class="ai-label">팀이 없는 학생 ${d.unassigned.length}명</div><div class="tm-unassigned">${d.unassigned.map((s) => `<label class="row" style="gap:6px"><b>${esc(s.name)}</b><small class="muted">${esc(s.level || '')}</small><select data-assign="${s.id}"><option value="">팀 고르기</option>${d.teams.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>`).join('')}</div></div>` : ''}
    ${d.teams
      .map(
        (t) => `<div class="card team-card" data-team="${t.id}">
        <div class="card-head"><h3>🎬 ${esc(t.name)} <small class="muted">${t.members.length}명</small></h3><button class="btn small danger" data-tdel>팀 삭제</button></div>
        <div class="row between" style="flex-wrap:wrap;gap:8px"><div><span class="ai-label">팀 주제</span><div>${t.topic ? esc(t.topic) : '<span class="muted">아직 없음</span>'} <span class="badge ${t.topic_status === 'approved' ? 'accent' : t.topic_status === 'revise' ? 'bad' : ''}">${TOPIC[t.topic_status] || ''}</span></div></div>
          <div class="row" style="gap:6px">${t.topic ? `<button class="btn small" data-topic="approved">주제 승인</button><button class="btn small" data-topic="revise">주제 수정 요청</button>` : ''}</div></div>
        <div style="margin-top:10px"><span class="ai-label">팀 영상</span> ${t.video_url ? `<a href="${esc(t.video_url)}" target="_blank" rel="noopener noreferrer">${esc(t.video_url)}</a> <span class="badge ${t.video_kind === 'final' ? 'accent' : ''}">${t.video_kind === 'final' ? '최종본' : '초안'}</span> <small class="muted">${t.video_at ? ago(t.video_at) : ''} ${esc(t.video_note || '')}</small>` : '<span class="muted">아직 제출 안 함</span>'}</div>
        <div class="table-wrap" style="margin-top:12px"><table class="list"><thead><tr><th>팀원</th><th>역할</th><th>대본</th><th>개인 점수 (대본 8 · 어휘 4 · 기여 3)</th><th>팀 이동</th></tr></thead><tbody>
          ${t.members
            .map(
              (m) => `<tr data-uid="${m.id}"><td><b>${esc(m.name)}</b><div class="muted" style="font-size:12px">${esc(m.level || '')}</div></td><td style="font-size:13px">${esc((m.roles || '').split(',').filter(Boolean).join(', ') || '–')}</td>
              <td><span class="badge ${SCRIPT[m.script_status]?.[1] || ''}">${SCRIPT[m.script_status]?.[0] || ''}</span>${m.content ? `<details><summary class="muted" style="font-size:12px;cursor:pointer">대본 보기·승인</summary><div class="zh" style="white-space:pre-wrap;font-size:14px;margin:6px 0">${esc(m.content)}</div>${m.ai_feedback?.corrected ? `<div class="muted" style="font-size:12px">AI 수정 제안: <span class="zh">${esc(m.ai_feedback.corrected)}</span></div>` : ''}<textarea rows="2" data-scomment placeholder="의견 (학생에게 보임)">${esc(m.script_comment || '')}</textarea><div class="row" style="gap:6px;margin-top:4px"><button class="btn small primary" data-script="approved">승인</button><button class="btn small" data-script="revise">수정 요청</button></div></details>` : ''}</td>
              <td><div class="score-row">${scoreInputs(A.projectIndividual, m.ind_scores || {})}</div><input data-icomment placeholder="개인 의견" value="${esc(m.ind_comment || '')}" style="margin-top:4px;width:100%"><button class="btn small" data-isave style="margin-top:4px">개인 점수 저장</button></td>
              <td><select data-move>${teamOpts(t.id)}</select></td></tr>`,
            )
            .join('') || '<tr><td colspan="5" class="muted">팀원이 없습니다. 위에서 학생을 배정하세요.</td></tr>'}
        </tbody></table></div>
        <div class="team-score"><div class="ai-label">팀 점수 (팀원 공통, 15점)</div><div class="score-grid">${scoreInputs(A.projectTeam, t.scores || {})}</div>
          <textarea data-tcomment rows="2" placeholder="팀 의견 (팀원에게 보임)">${esc(t.comment || '')}</textarea>
          <div class="row" style="justify-content:flex-end"><button class="btn primary small" data-tsave>팀 점수 저장</button></div></div>
      </div>`,
      )
      .join('') || '<div class="empty">아직 팀이 없습니다. 위에서 팀을 만드세요.</div>'}
  </div>`;
  const reload = () => renderAdminTeams(app);
  const run = async (fn, msg) => { try { await fn(); toast(msg); reload(); } catch (e) { toast(e.message, 'bad'); } };
  app.querySelector('#t-add').onclick = () => run(() => post('/api/admin/teams', { name: app.querySelector('#t-name').value }), '팀을 만들었습니다.');
  app.querySelectorAll('[data-assign]').forEach((s) => (s.onchange = () => s.value && run(() => put(`/api/admin/members/${s.dataset.assign}`, { teamId: Number(s.value) }), '팀에 배정했습니다.')));
  app.querySelectorAll('[data-team]').forEach((card) => {
    const id = card.dataset.team;
    card.querySelector('[data-tdel]').onclick = async () => { if (await confirmBox('이 팀을 지울까요? 팀원은 팀 없음으로 바뀝니다.', { danger: true })) run(() => del(`/api/admin/teams/${id}`), '팀을 지웠습니다.'); };
    card.querySelectorAll('[data-topic]').forEach((b) => (b.onclick = () => run(() => put(`/api/admin/teams/${id}`, { topicStatus: b.dataset.topic }), '주제 상태를 바꿨습니다.')));
    card.querySelector('[data-tsave]').onclick = () => run(() => put(`/api/admin/teams/${id}`, { scores: readScores(card.querySelector('.team-score')), comment: card.querySelector('[data-tcomment]').value }), '팀 점수를 저장했습니다.');
    card.querySelectorAll('tr[data-uid]').forEach((tr) => {
      const uid = tr.dataset.uid;
      tr.querySelector('[data-move]').onchange = (e) => run(() => put(`/api/admin/members/${uid}`, { teamId: e.target.value ? Number(e.target.value) : null }), '팀을 바꿨습니다.');
      tr.querySelector('[data-isave]').onclick = () => run(() => put(`/api/admin/project-grades/${uid}`, { scores: readScores(tr.querySelector('.score-row')), comment: tr.querySelector('[data-icomment]').value }), '개인 점수를 저장했습니다.');
      tr.querySelectorAll('[data-script]').forEach((b) => (b.onclick = () => run(() => put(`/api/admin/scripts/${uid}`, { status: b.dataset.script, comment: tr.querySelector('[data-scomment]').value }), b.dataset.script === 'approved' ? '대본을 승인했습니다.' : '수정 요청을 보냈습니다.')));
    });
  });
}

// ================= 주차 콘텐츠 편집 =================
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
};
export async function renderAdminContent(app, ctx) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const gid = ctx.week || Number(sessionStorage.getItem('ms_cweek')) || 301;
  const d = await get(`/api/admin/content/${gid}`);
  const c = d.current;
  const lines = (a) => (a || []).join('\n');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>관리자</h1><p>코드를 고치지 않고 주차 내용·과제 마감일·공개 여부를 바꿉니다. 비워 둔 칸은 기본 내용을 씁니다.</p></div></div>
    ${adminTabs('content')}
    <div class="card row between" style="flex-wrap:wrap;gap:10px"><label class="row" style="gap:8px">주차 <select id="c-week">${weekOptions(d.weeks, gid)}</select></label>
      <span>${d.edited ? '<span class="badge warn">고친 내용 있음</span>' : '<span class="badge">기본 내용</span>'} <a href="#/week/${gid}" class="muted">학생 화면 보기 →</a></span></div>
    <div class="card c-cover">
      <div class="card-head"><h3>대표 이미지</h3>${d.cover ? '<span class="badge accent">올린 사진</span>' : '<span class="badge">기본 표지</span>'}</div>
      <div class="c-cover-grid">
        <div>${coverHtml({ format: 'class', week: d.week, title: c.title, titleZh: c.titleZh, stage: d.weeks.find((w) => w.gid === gid)?.stage, keywords: c.keywords, caption: c.patterns?.[0]?.[2] || c.titleZh, videos: c.videos, cover: d.cover })}</div>
        <div>
          <p class="muted" style="font-size:13px;margin-top:0">직접 찍은 사진, 사용 허락을 받은 사진, 무료 사용이 허용된 사진만 올려 주세요. 도우인 화면을 캡처한 사진처럼 다른 사람의 얼굴이나 저작물이 담긴 이미지는 허락 없이 올리지 않습니다. 사진이 없으면 숏폼 화면처럼 꾸민 기본 표지가 나옵니다.</p>
          <label class="vlabel">사진 파일 (JPG·PNG·WebP, 자동으로 줄여서 올립니다)<input type="file" id="cv-file" accept="image/jpeg,image/png,image/webp"></label>
          <label class="vlabel">출처 표기 (사진 아래 왼쪽에 보임)<input id="cv-src" maxlength="100" placeholder="예: 직접 촬영 / Unsplash · 작가 이름" value="${esc(d.cover?.source || '')}"></label>
          <label class="vlabel">출처 주소 (선택)<input id="cv-url" type="url" maxlength="500" placeholder="https://…" value="${esc(d.cover?.sourceUrl || '')}"></label>
          <div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px">${d.cover ? '<button class="btn danger" id="cv-del" type="button">사진 지우기</button>' : ''}<button class="btn primary" id="cv-up" type="button">사진 올리기</button></div>
        </div>
      </div>
    </div>
    <form class="card cform" id="c-form">
      <div class="vform">
        <label>제목<input name="title" value="${esc(c.title)}" maxlength="80"></label>
        <label>중국어 제목<input name="titleZh" class="zh" value="${esc(c.titleZh)}" maxlength="80"></label>
        <label class="wide">한 줄 목표<input name="goal" value="${esc(c.goal)}" maxlength="300"></label>
        <label class="wide">학습 목표 (한 줄에 하나)<textarea name="goals" rows="3">${esc(lines(c.goals))}</textarea></label>
        <label class="wide">핵심 언어 학습<input name="focus" value="${esc(c.focus || '')}" maxlength="200"></label>
        <label>만들어 볼 숏폼 (한 줄에 하나)<textarea name="videos" rows="3">${esc(lines(c.videos))}</textarea></label>
        <label>크리에이터 검색어 (한 줄에 하나)<textarea name="keywords" rows="3" class="zh">${esc(lines(c.keywords))}</textarea></label>
        <label class="wide">크리에이터 표현 — 한 줄에 「표현 | 병음 | 뜻 | 쓰는 상황」<textarea name="creator" rows="6" class="zh">${esc((c.creator || []).map((p) => p.join(' | ')).join('\n'))}</textarea></label>
        <label class="wide">핵심 표현·문형 — 한 줄에 「문형 | 설명 | 예문 | 뜻 | 병음」<textarea name="patterns" rows="5" class="zh">${esc((c.patterns || []).map((p) => p.join(' | ')).join('\n'))}</textarea></label>
        <label class="wide">180분 수업 흐름 — 한 줄에 「시간 | 활동」<textarea name="plan" rows="7">${esc((c.plan || []).map((p) => p.join(' | ')).join('\n'))}</textarea></label>
        <label>초급 과제<textarea name="basic" rows="2">${esc(c.tasks?.basic || '')}</textarea></label>
        <label>중급 과제<textarea name="inter" rows="2">${esc(c.tasks?.inter || '')}</textarea></label>
        <label class="wide">평가<input name="assess" value="${esc(c.assess || '')}" maxlength="300"></label>
        <label class="wide">주의 사항 (선택)<input name="caution" value="${esc(c.caution || '')}" maxlength="400"></label>
        <label>과제 마감일<input type="datetime-local" name="dueAt" value="${toLocalInput(d.dueAt)}"></label>
        <label class="row" style="gap:8px;align-self:end"><input type="checkbox" name="published" ${d.published !== false ? 'checked' : ''}> 학생에게 공개</label>
      </div>
      <div class="row" style="justify-content:space-between;margin-top:14px;gap:8px;flex-wrap:wrap"><button type="button" class="btn danger" id="c-reset" ${d.edited ? '' : 'disabled'}>기본 내용으로 되돌리기</button><button class="btn primary" type="submit">저장</button></div>
    </form>
    <div class="card"><div class="card-head"><h3>이 주차 참고 자료의 자막·사용 허가</h3><a href="#/admin/videos">참고 자료 링크 넣기 →</a></div>
      ${d.videos.length ? d.videos.map((v) => `<div class="c-video" data-vid="${v.id}"><b>${esc(v.title || v.url)}</b> <small class="muted">${esc(v.creator || '')}</small>
        <label class="vlabel">사용 허가 기록<input data-perm value="${esc(v.permission || '')}" placeholder="예: 제작자 허락 받음(2026-11-17 DM) / 원본 링크만 연결"></label>
        <label class="vlabel">자막 — 한 줄에 「중국어 | 병음 | 한국어」<textarea data-tr rows="5" class="zh">${esc(v.transcript || '')}</textarea></label>
        <div class="row" style="justify-content:flex-end"><button class="btn small primary" data-vsave>자막 저장</button></div></div>`).join('') : '<p class="muted">아직 넣은 참고 자료가 없습니다. (선택 사항)</p>'}
    </div>
  </div>`;
  app.querySelector('#c-week').onchange = (e) => {
    sessionStorage.setItem('ms_cweek', e.target.value);
    location.hash = `#/admin/content/${e.target.value}`;
  };
  const f = app.querySelector('#c-form');
  const val = (n) => f.elements[n].value;
  const split = (n) => val(n).split('\n').map((x) => x.trim()).filter(Boolean);
  const cols = (n, k) => split(n).map((l) => { const p = l.split('|').map((x) => x.trim()); while (p.length < k) p.push(''); return p.slice(0, k); });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const due = val('dueAt');
    const data = { title: val('title'), titleZh: val('titleZh'), goal: val('goal'), goals: split('goals'), focus: val('focus'), videos: split('videos'), keywords: split('keywords'), creator: cols('creator', 4), patterns: cols('patterns', 5), plan: cols('plan', 2), tasks: { basic: val('basic'), inter: val('inter') }, assess: val('assess'), caution: val('caution') };
    try {
      await put(`/api/admin/content/${gid}`, { data, dueAt: due ? new Date(`${due}:00+09:00`).toISOString() : null, published: f.elements.published.checked });
      toast('저장했습니다.');
      renderAdminContent(app, { week: gid });
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
  app.querySelector('#c-reset').onclick = async () => {
    if (!(await confirmBox('이 주차의 고친 내용을 지우고 기본 내용으로 되돌릴까요? 마감일과 공개 여부는 유지됩니다.', { danger: true }))) return;
    const due = val('dueAt');
    try {
      await put(`/api/admin/content/${gid}`, { reset: true, dueAt: due ? new Date(`${due}:00+09:00`).toISOString() : null, published: f.elements.published.checked });
      toast('기본 내용으로 되돌렸습니다.');
      renderAdminContent(app, { week: gid });
    } catch (err) {
      toast(err.message, 'bad');
    }
  };
  // 사진은 브라우저에서 가로 1280px 이하 JPG로 줄여서 올린다
  const shrink = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1280 / img.width);
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(img.src);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
      img.src = URL.createObjectURL(file);
    });
  app.querySelector('#cv-up').onclick = async () => {
    const file = app.querySelector('#cv-file').files[0];
    if (!file) return toast('올릴 사진을 골라 주세요.', 'bad');
    if (!app.querySelector('#cv-src').value.trim()) return toast('출처를 적어 주세요. 직접 찍었다면 "직접 촬영"이라고 쓰면 됩니다.', 'bad');
    try {
      const data = await shrink(file);
      await put(`/api/admin/content/${gid}/cover`, { data, source: app.querySelector('#cv-src').value, sourceUrl: app.querySelector('#cv-url').value });
      toast('대표 이미지를 올렸습니다.');
      renderAdminContent(app, { week: gid });
    } catch (e) {
      toast(e.message, 'bad');
    }
  };
  app.querySelector('#cv-del')?.addEventListener('click', async () => {
    if (!(await confirmBox('대표 이미지를 지우고 기본 표지로 되돌릴까요?', { danger: true }))) return;
    try { await del(`/api/admin/content/${gid}/cover`); toast('지웠습니다.'); renderAdminContent(app, { week: gid }); } catch (e) { toast(e.message, 'bad'); }
  });
  app.querySelectorAll('[data-vid]').forEach((box) => (box.querySelector('[data-vsave]').onclick = async () => {
    try { await put(`/api/admin/videos/${box.dataset.vid}`, { transcript: box.querySelector('[data-tr]').value, permission: box.querySelector('[data-perm]').value }); toast('자막을 저장했습니다.'); } catch (e) { toast(e.message, 'bad'); }
  }));
}
