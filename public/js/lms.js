// 학생 화면: 내 성적 · 팀 프로젝트(개인 대본 + 팀 영상) · AI 회화
import { state, esc, get, post, put, toast, fmtDate, ago, speak } from './core.js';
import { feedbackHtml } from './fb.js';

const STATUS_CLASS = { none: '', submitted: 'warn', resubmitted: 'warn', graded: 'accent', revise: 'bad' };
export const statusBadge = (status, label) => `<span class="badge ${STATUS_CLASS[status] || ''}">${esc(label)}</span>`;
export const dueText = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const left = Math.ceil((d - Date.now()) / 86400000);
  return `${fmtDate(iso, true)} 마감${left >= 0 ? ` · ${left === 0 ? '오늘' : `${left}일 남음`}` : ' · 지남'}`;
};
const pct = (v, max) => (v === null || v === undefined ? 0 : Math.max(0, Math.min(100, (v / max) * 100)));

// ================= 내 성적 =================
export async function renderGrades(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get('/api/my/grades');
  const C = d.grades.components;
  const proj = d.project;
  const sumItems = (items, s) => items.reduce((a, [k]) => a + (Number(s?.[k]) || 0), 0);
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>📊 내 성적</h1><p>교수님이 확정한 점수만 보여요. AI 첨삭 점수는 연습용 참고 자료라 성적에 들어가지 않아요.${d.level ? ` · 나의 수준: <b>${esc(d.level)}</b>` : ''}</p></div>
      <div class="grade-total"><div class="label">지금까지 합계</div><div class="value">${d.grades.total}<small> / 100</small></div></div></div>
    <div class="card">
      ${d.assess.components
        .map(([k, n, max]) => `<div class="grade-row"><span>${esc(n)}</span><b>${C[k] === null ? '<span class="muted">아직 없음</span>' : `${C[k]} / ${max}`}</b><div class="progress"><div style="width:${pct(C[k], max)}%"></div></div></div>`)
        .join('')}
      <p class="muted" style="font-size:13px;margin:10px 0 0">주차별 과제는 ${d.grades.weeklyCount}개 주차 점수를 모아 20점으로 바꿉니다 (지금 ${d.grades.weeklyGraded}개 주차 평가됨). 중간평가는 100점 만점을 25점으로 바꿉니다.</p>
    </div>
    <div class="section-title">주차별 과제</div>
    <div class="table-wrap"><table class="list"><thead><tr><th>주차</th><th>상태</th><th>점수</th><th>교수님 의견</th></tr></thead><tbody>
      ${d.weeks
        .map(
          (w) => `<tr class="click" onclick="location.hash='#/week/${w.gid}/task'"><td><b>${w.week}주차</b> ${esc(w.title)}${w.kind !== 'weekly' ? ` <span class="badge">${w.kind === 'midterm' ? '중간평가' : '최종평가'}</span>` : ''}${w.dueAt ? `<div class="muted" style="font-size:12px">${esc(dueText(w.dueAt))}</div>` : ''}</td>
          <td>${statusBadge(w.status, w.label)}</td><td>${w.total === null ? '–' : `<b>${w.total}</b> / ${w.max}`}</td><td style="font-size:13px">${esc(w.comment || '')}</td></tr>`,
        )
        .join('')}
    </tbody></table></div>
    <div class="section-title">숏폼 제작 프로젝트</div>
    <div class="grid2 course-two">
      <div class="card"><div class="ai-label">개인 점수 (${sumItems(d.assess.projectIndividual, proj.individual)} / 15)</div>
        ${d.assess.projectIndividual.map(([k, n, m]) => `<div class="grade-row"><span>${esc(n)}</span><b>${proj.individual[k] ?? '–'} / ${m}</b></div>`).join('')}
        ${proj.individualComment ? `<div class="ai-box">${esc(proj.individualComment)}</div>` : ''}</div>
      <div class="card"><div class="ai-label">팀 점수${proj.teamName ? ` · ${esc(proj.teamName)}` : ''} (${sumItems(d.assess.projectTeam, proj.team)} / 15)</div>
        ${d.assess.projectTeam.map(([k, n, m]) => `<div class="grade-row"><span>${esc(n)}</span><b>${proj.team[k] ?? '–'} / ${m}</b></div>`).join('')}
        ${proj.teamComment ? `<div class="ai-box">${esc(proj.teamComment)}</div>` : ''}</div>
    </div>
  </div>`;
}

// ================= 팀 프로젝트 =================
const SCRIPT_LABEL = { none: ['아직 안 씀', ''], draft: ['임시 저장', ''], submitted: ['제출 · 승인 대기', 'warn'], approved: ['승인됨', 'accent'], revise: ['수정 요청', 'bad'] };
const scriptBadge = (s) => `<span class="badge ${SCRIPT_LABEL[s]?.[1] || ''}">${SCRIPT_LABEL[s]?.[0] || esc(s)}</span>`;
const TOPIC_LABEL = { none: '주제 미정', proposed: '주제 제안 · 승인 대기', approved: '주제 승인됨', revise: '주제 수정 요청' };

export async function renderProject(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get('/api/my/project');
  const t = d.team;
  const s = d.script || { content: '', status: 'none' };
  const locked = s.status === 'approved';
  const myRoles = (t?.myRoles || '').split(',').filter(Boolean);
  const w14 = d.week14;
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>👥 팀 프로젝트</h1><p>각자 중국어 대본을 쓰고 교수님 승인을 받은 뒤, 3~4명이 한 팀으로 숏폼 영상을 만듭니다. 개인 대본 점수와 팀 영상 점수는 따로 매깁니다.</p></div></div>
    <ol class="flow-steps"><li class="${s.status !== 'none' ? 'on' : ''}">개인 대본 작성</li><li class="${locked ? 'on' : ''}">교수자 대본 승인</li><li class="${t?.topicStatus === 'approved' ? 'on' : ''}">팀 주제·구성</li><li class="${t?.videoUrl ? 'on' : ''}">영상 제작·초안</li><li class="${t?.videoKind === 'final' ? 'on' : ''}">최종 제출·발표</li></ol>

    <div class="card" id="pj-script">
      <div class="card-head"><h3>✍️ 나의 중국어 대본</h3>${scriptBadge(s.status)}</div>
      <p class="muted" style="font-size:14px;margin-top:0">초급: 30~45초, 기본 문장 8~10개 · 중급: 45~60초, 의견·비교·설명 구조 포함${d.level ? ` (나의 수준: <b>${esc(d.level)}</b>)` : ''}</p>
      ${s.status === 'revise' && s.comment ? `<div class="notice bad">✏️ 교수님 수정 요청: ${esc(s.comment)}</div>` : ''}
      ${s.status === 'approved' && s.comment ? `<div class="notice info">✅ 교수님 의견: ${esc(s.comment)}</div>` : ''}
      ${w14?.patterns?.length ? `<div class="tags" style="margin-bottom:8px">${w14.patterns.map((p) => `<button class="tag zh" style="border:0;cursor:pointer" data-ins="${esc(p.zh)}" title="${esc(p.ko)}">${esc(p.form)}</button>`).join('')}</div>` : ''}
      <textarea id="sc-text" rows="8" class="zh" style="font-size:17px" maxlength="3000" ${locked ? 'readonly' : ''} placeholder="大家好，我是…">${esc(s.content || '')}</textarea>
      <div class="row between" style="margin-top:8px;flex-wrap:wrap;gap:8px"><span class="muted" style="font-size:13px"><span id="sc-n">${(s.content || '').length}</span>/3000자${s.updated_at ? ` · ${ago(s.updated_at)} 저장` : ''}</span>
        ${locked ? '<span class="muted" style="font-size:13px">승인된 대본은 고칠 수 없어요.</span>' : `<div class="row" style="gap:6px"><button class="btn" id="sc-save">임시 저장</button><button class="btn" id="sc-ai" ${state.me.aiReady ? '' : 'disabled'}>✨ AI 첨삭</button><button class="btn primary" id="sc-submit">교수님께 제출</button></div>`}</div>
      <div id="sc-fb">${s.ai_feedback ? `<div class="ai-label" style="margin-top:14px">AI 첨삭 (원문은 그대로 두고 참고만 하세요)</div>${feedbackHtml({ content: s.content, feedback: s.ai_feedback, score: s.ai_feedback.score, created_at: s.updated_at }, { showOriginal: false })}` : ''}</div>
    </div>

    ${
      t
        ? `<div class="card">
      <div class="card-head"><h3>🎬 ${esc(t.name)}</h3><span class="badge ${t.topicStatus === 'approved' ? 'accent' : t.topicStatus === 'revise' ? 'bad' : ''}">${TOPIC_LABEL[t.topicStatus] || ''}</span></div>
      <div class="ai-label">팀 주제</div>
      <div class="row" style="gap:8px;flex-wrap:nowrap"><input id="tm-topic" value="${esc(t.topic)}" placeholder="예: 한국 분식을 중국인에게 소개하기" ${t.topicStatus === 'approved' ? 'readonly' : ''} style="flex:1">${t.topicStatus === 'approved' ? '' : '<button class="btn" id="tm-topic-save">주제 제안</button>'}</div>
      ${t.comment ? `<div class="ai-box" style="margin-top:10px">교수님 의견: ${esc(t.comment)}</div>` : ''}
      <div class="ai-label" style="margin-top:16px">팀원과 대본</div>
      <div class="tm-members">${t.members
        .map(
          (m) => `<div class="tm-member"><div class="row between"><b>${esc(m.name)}</b>${scriptBadge(m.script_status)}</div>
          <div class="muted" style="font-size:13px">역할: ${esc((m.roles || '').split(',').filter(Boolean).join(', ') || '미정')}</div>
          ${m.content ? `<details><summary class="muted" style="font-size:13px;cursor:pointer">대본 보기</summary><div class="zh" style="white-space:pre-wrap;font-size:15px;margin-top:6px">${esc(m.content)}</div></details>` : ''}</div>`,
        )
        .join('')}</div>
      <div class="ai-label" style="margin-top:16px">나의 역할 (여러 개 고를 수 있어요)</div>
      <div class="tm-roles">${d.roles.map(([n, desc]) => `<label class="tm-role"><input type="checkbox" value="${esc(n)}" ${myRoles.includes(n) ? 'checked' : ''}><span><b>${esc(n)}</b><small class="muted">${esc(desc)}</small></span></label>`).join('')}</div>
      <div class="ai-label" style="margin-top:16px">팀 영상 제출 (도우인·유튜브·드라이브 링크)</div>
      ${t.videoUrl ? `<p style="margin:4px 0 8px"><a href="${esc(t.videoUrl)}" target="_blank" rel="noopener noreferrer">${esc(t.videoUrl)}</a> <span class="badge ${t.videoKind === 'final' ? 'accent' : ''}">${t.videoKind === 'final' ? '최종본' : '초안'}</span> <small class="muted">${t.videoAt ? ago(t.videoAt) : ''}</small>${t.videoNote ? `<br><small class="muted">${esc(t.videoNote)}</small>` : ''}</p>` : ''}
      <div class="vform"><label class="wide">영상 링크<input id="tm-url" type="url" placeholder="https://…" value="${esc(t.videoUrl || '')}"></label>
        <label>구분<select id="tm-kind"><option value="draft" ${t.videoKind !== 'final' ? 'selected' : ''}>초안</option><option value="final" ${t.videoKind === 'final' ? 'selected' : ''}>최종본</option></select></label>
        <label>메모<input id="tm-note" maxlength="500" value="${esc(t.videoNote || '')}" placeholder="예: 자막 수정 중"></label>
        <div class="wide row" style="justify-content:flex-end"><button class="btn primary" id="tm-video">영상 제출</button></div></div>
      <p class="muted" style="font-size:12.5px;margin:10px 0 0">영상에 나오는 사람 모두에게 동의를 받았는지 확인하고 올려 주세요. 팀은 교수님만 바꿀 수 있어요.</p>
    </div>`
        : '<div class="card" style="text-align:center;padding:30px"><h3>아직 팀이 배정되지 않았어요</h3><p class="muted">교수님이 3~4명씩 팀을 짜면 여기에서 팀원과 주제, 영상 제출을 볼 수 있어요. 그동안 개인 대본을 먼저 써 두세요.</p></div>'
    }
  </div>`;

  const ta = app.querySelector('#sc-text');
  ta.addEventListener('input', () => (app.querySelector('#sc-n').textContent = ta.value.length));
  app.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => { if (!locked) { ta.value += (ta.value && !ta.value.endsWith('\n') ? '\n' : '') + b.dataset.ins; ta.focus(); } }));
  const saveScript = async (submit) => {
    await post('/api/my/script', { content: ta.value, submit });
  };
  app.querySelector('#sc-save')?.addEventListener('click', async () => {
    try { await saveScript(false); toast('대본을 저장했어요.'); } catch (e) { toast(e.message, 'bad'); }
  });
  app.querySelector('#sc-submit')?.addEventListener('click', async () => {
    try { await saveScript(true); toast('교수님께 대본을 냈어요.'); renderProject(app); } catch (e) { toast(e.message, 'bad'); }
  });
  app.querySelector('#sc-ai')?.addEventListener('click', async (e) => {
    const b = e.target;
    b.disabled = true;
    b.textContent = 'AI가 읽는 중…';
    try { await saveScript(false); await post('/api/my/script/ai', {}); renderProject(app); } catch (err) { toast(err.message, 'bad'); b.disabled = false; b.textContent = '✨ AI 첨삭'; }
  });
  app.querySelector('#tm-topic-save')?.addEventListener('click', async () => {
    try { await put('/api/my/team', { topic: app.querySelector('#tm-topic').value }); toast('주제를 제안했어요.'); renderProject(app); } catch (e) { toast(e.message, 'bad'); }
  });
  app.querySelectorAll('.tm-role input').forEach((c) => (c.onchange = async () => {
    const roles = [...app.querySelectorAll('.tm-role input:checked')].map((x) => x.value);
    try { await put('/api/my/roles', { roles }); toast('역할을 저장했어요.'); } catch (e) { toast(e.message, 'bad'); }
  }));
  app.querySelector('#tm-video')?.addEventListener('click', async () => {
    try {
      await put('/api/my/team', { videoUrl: app.querySelector('#tm-url').value.trim(), videoKind: app.querySelector('#tm-kind').value, videoNote: app.querySelector('#tm-note').value });
      toast('팀 영상을 냈어요.');
      renderProject(app);
    } catch (e) { toast(e.message, 'bad'); }
  });
}

// ================= AI 회화 =================
export async function renderTalk(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get('/api/talk');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>🤖 AI 회화 파트너</h1><p>주차별 상황에서 AI가 중국인 역할을 맡아요. 내가 먼저 중국어로 말하고, 끝나면 틀린 곳과 익혀 둘 표현을 정리해 줘요.${d.level ? ` · 나의 수준: <b>${esc(d.level)}</b>` : ' · 수준이 정해지지 않아 초급으로 연습해요.'}</p></div></div>
    <div class="talk-grid">${d.scenarios
      .map((c) => `<button class="card talk-card" data-week="${c.week}"><span class="badge">${c.week}주차</span><h3>${esc(c.situation)}</h3><p class="muted">AI 역할: ${esc(c.role)}</p><div class="zh muted" style="font-size:14px">“${esc(c.opener)}”</div><span class="track-go">대화 시작 →</span></button>`)
      .join('')}</div>
    ${d.sessions.length ? `<div class="section-title">지난 대화</div><div class="card">${d.sessions.map((s) => `<a class="row between talk-past" href="#/talk/${s.id}"><span><span class="badge">${s.week}주차</span> ${esc(d.scenarios.find((c) => c.week === s.week)?.situation || '')}</span><span class="muted" style="font-size:13px">${Math.floor((s.n - 1) / 2)}번 대화 · ${s.done ? '피드백 받음' : '진행 중'} · ${ago(s.created_at)}</span></a>`).join('')}</div>` : ''}
  </div>`;
  app.querySelectorAll('[data-week]').forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      const r = await post('/api/talk', { week: Number(b.dataset.week) });
      location.hash = `#/talk/${r.id}`;
    } catch (e) { b.disabled = false; toast(e.message, 'bad'); }
  }));
}

export async function startTalkFromWeek(week) {
  const r = await post('/api/talk', { week });
  location.hash = `#/talk/${r.id}`;
}

export async function renderTalkSession(app, id) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get(`/api/talk/${id}`);
  let S = d.session;
  const sc = d.scenario;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  function bubble(m) {
    if (m.role === 'ai')
      return `<div class="bubble ai"><div class="zh">${esc(m.text)} <button class="speak" data-speak="${esc(m.text)}" aria-label="듣기">🔊</button></div>${m.pinyin ? `<div class="py">${esc(m.pinyin)}</div>` : ''}${m.ko ? `<div class="muted" style="font-size:13px">${esc(m.ko)}</div>` : ''}${m.hint ? `<div class="bubble-hint">💡 ${esc(m.hint)}</div>` : ''}</div>`;
    return `<div class="bubble me"><div class="zh">${esc(m.text)}</div>${m.correction ? `<div class="bubble-fix">✏️ ${esc(m.correction)}</div>` : ''}</div>`;
  }
  function draw() {
    const turns = S.messages.filter((m) => m.role === 'me').length;
    const f = S.feedback;
    app.innerHTML = `<div class="page talk-page">
      <div class="page-head"><div><a href="#/talk" class="muted" style="text-decoration:none">← AI 회화</a>
        <h1 style="margin-top:6px">${S.week}주차 · ${esc(sc.situation)}</h1><p>AI 역할: ${esc(sc.role)} · 나의 수준: ${esc(S.level || '초급')}</p></div></div>
      <div class="chat" id="chat">${S.messages.map(bubble).join('')}</div>
      ${
        f
          ? `<div class="card"><div class="ai-label">대화 피드백</div><p>${esc(f.overall)}</p>
          ${(f.errors || []).length ? `<h3>고칠 곳</h3>${f.errors.map((e) => `<div class="err"><span class="zh"><s>${esc(e.original)}</s> → <b>${esc(e.better)}</b></span><br>${esc(e.why)}</div>`).join('')}` : ''}
          ${(f.expressions || []).length ? `<h3>익혀 둘 표현</h3>${f.expressions.map((x) => `<div class="row" style="gap:8px;margin:6px 0"><button class="speak" data-speak="${esc(x.zh)}">🔊</button><div><div class="zh">${esc(x.zh)}</div><div class="py">${esc(x.py)}</div><div class="muted" style="font-size:13px">${esc(x.ko)}</div></div></div>`).join('')}` : ''}
          <div class="row" style="margin-top:12px"><a class="btn primary" href="#/talk">다른 상황 연습하기</a></div></div>`
          : `<div class="card chat-input">
          <textarea id="say" rows="2" class="zh" maxlength="300" placeholder="중국어로 대답해 보세요"></textarea>
          <div class="row between" style="margin-top:8px;flex-wrap:wrap;gap:8px">
            <span class="muted" style="font-size:13px">${turns}/${d.maxTurns}번 말함${Rec ? ' · 🎤로 말해도 돼요' : ''}</span>
            <div class="row" style="gap:6px">${Rec ? '<button class="btn" id="mic" title="말로 입력">🎤</button>' : ''}<button class="btn" id="end" ${turns ? '' : 'disabled'}>대화 마치고 피드백 받기</button><button class="btn primary" id="send">보내기</button></div>
          </div></div>`
      }
    </div>`;
    const chat = app.querySelector('#chat');
    chat.scrollTop = chat.scrollHeight;
    const ta = app.querySelector('#say');
    const send = async () => {
      const text = ta.value.trim();
      if (!text) return;
      const b = app.querySelector('#send');
      b.disabled = true;
      b.textContent = '대답 기다리는 중…';
      try {
        const r = await post(`/api/talk/${S.id}/say`, { text });
        S = { ...S, messages: r.messages };
        draw();
        const last = r.messages[r.messages.length - 1];
        if (last?.role === 'ai') speak(last.text);
        app.querySelector('#say')?.focus();
      } catch (e) { toast(e.message, 'bad'); b.disabled = false; b.textContent = '보내기'; }
    };
    app.querySelector('#send')?.addEventListener('click', send);
    ta?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
    app.querySelector('#end')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = '정리하는 중…';
      try { const r = await post(`/api/talk/${S.id}/end`, {}); S = { ...S, feedback: r.feedback }; draw(); } catch (err) { toast(err.message, 'bad'); e.target.disabled = false; e.target.textContent = '대화 마치고 피드백 받기'; }
    });
    app.querySelector('#mic')?.addEventListener('click', (e) => {
      const rec = new Rec();
      rec.lang = 'zh-CN';
      rec.interimResults = false;
      e.target.textContent = '듣는 중…';
      rec.onresult = (ev) => { ta.value = (ta.value + ' ' + ev.results[0][0].transcript).trim(); };
      rec.onend = () => { e.target.textContent = '🎤'; };
      rec.onerror = () => { e.target.textContent = '🎤'; toast('음성을 알아듣지 못했어요. 다시 해 보거나 글로 써 주세요.', 'bad'); };
      rec.start();
    });
  }
  draw();
}
