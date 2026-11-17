// 숏폼 과정(수업 안내형) 주차 화면: 학습 목표 · 크리에이터 표현 · 핵심 문형 · 180분 수업 흐름 · 수준별 과제 · 과제 제출
import { state, esc, post, toast } from './core.js';
import { statusBadge, dueText, startTalkFromWeek } from './lms.js';
import { coverHtml } from './cover.js';
import { feedbackHtml } from './fb.js';

export const STAGE_NAME = { 1: '일상 중국어 적응', 2: '실제 의사소통', 3: '사회문화와 언어 분석', 4: '표현의 생산과 활용' };

// 자막: 한 줄에 「중국어 | 병음 | 한국어」
function transcriptBlock(v) {
  const rows = String(v.transcript || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((r) => r[0]);
  if (!rows.length) return '';
  return `<div class="cw-trans" data-show="zh py ko">
    <div class="cw-trans-tools"><span class="muted">자막 보기</span><button type="button" class="tag on" data-col="zh">중국어</button><button type="button" class="tag on" data-col="py">병음</button><button type="button" class="tag on" data-col="ko">한국어</button></div>
    ${rows.map(([zh, py, ko]) => `<div class="cw-line"><button class="speak" data-speak="${esc(zh)}" aria-label="듣기">🔊</button><div><div class="zh c-zh">${esc(zh)}</div>${py ? `<div class="py c-py">${esc(py)}</div>` : ''}${ko ? `<div class="muted c-ko" style="font-size:14px">${esc(ko)}</div>` : ''}</div></div>`).join('')}
  </div>`;
}

// 이번 주 숏폼 크리에이터 표현 + 만들어 볼 숏폼 + (교수자가 넣었다면) 참고 자료 링크
function creatorBlock(W, videos) {
  const items = (W.creator || [])
    .map((c) => `<div class="cw-cr"><div class="cw-cr-main"><button class="speak" data-speak="${esc(c.zh)}" aria-label="듣기">🔊</button><div><span class="zh cw-cr-zh">${esc(c.zh)}</span>${c.py ? ` <span class="py">${esc(c.py)}</span>` : ''}<div class="cw-cr-ko">${esc(c.ko)}</div></div></div>${c.use ? `<div class="muted cw-cr-use">${esc(c.use)}</div>` : ''}</div>`)
    .join('');
  const refs = (videos || [])
    .map(
      (v) => `<div class="cw-vwrap"><a class="cw-video" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">
        <span class="cw-play" aria-hidden="true">▶</span>
        <span><b>${esc(v.title || '참고 자료')}</b>${v.creator ? `<small class="muted"> · ${esc(v.creator)}</small>` : ''}${v.note ? `<span class="muted cw-note">${esc(v.note)}</span>` : ''}</span>
      </a>${transcriptBlock(v)}</div>`,
    )
    .join('');
  const kws = (W.keywords || []).map((k) => `<span class="tag zh">${esc(k)}</span>`).join('');
  return `<div class="card" id="cw-creator">
    <div class="ai-label">이번 주 크리에이터 표현</div>
    <p class="muted" style="font-size:14px;margin:4px 0 10px">중국 숏폼 크리에이터들이 실제로 많이 쓰는 말이에요. 🔊를 눌러 듣고 따라 해 보세요.</p>
    ${items ? `<div class="cw-crs">${items}</div>` : '<p class="muted">이번 주 표현을 준비 중이에요.</p>'}
    ${(W.videos || []).length ? `<div class="ai-label" style="margin-top:14px">이번 주에 만들어 볼 숏폼</div><ul class="cw-list">${W.videos.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>` : ''}
    ${kws ? `<div class="ai-label" style="margin-top:10px">크리에이터가 자주 찾는 검색어</div><div class="tags">${kws}</div>` : ''}
    ${refs ? `<div class="ai-label" style="margin-top:14px">참고 자료</div><div class="cw-videos">${refs}</div>` : ''}
  </div>`;
}

function patternBlock(W) {
  if (!W.patterns?.length) return '';
  return `<div class="card">
    <div class="ai-label">핵심 표현 · 문형</div>
    <div class="cw-patterns">${W.patterns
      .map(
        (p) => `<div class="cw-pat">
          <div class="cw-form zh">${esc(p.form)}</div>
          <div class="muted cw-explain">${esc(p.explain)}</div>
          <div class="cw-ex"><span class="zh">${esc(p.zh)}</span> <button class="speak" data-speak="${esc(p.zh)}" aria-label="듣기">🔊</button></div>
          ${p.py ? `<div class="py">${esc(p.py)}</div>` : ''}
          <div class="muted" style="font-size:14px">${esc(p.ko)}</div>
        </div>`,
      )
      .join('')}</div>
    ${W.caution ? `<div class="notice info" style="margin-top:12px">⚠️ ${esc(W.caution)}</div>` : ''}
  </div>`;
}

function planBlock(W) {
  return `<div class="card">
    <div class="ai-label">180분 수업 흐름</div>
    <div class="table-wrap"><table class="list cw-plan"><thead><tr><th>시간</th><th>수업 활동</th></tr></thead><tbody>
      ${W.plan.map(([t, a]) => `<tr class="${a === '휴식' ? 'cw-rest' : ''}"><td>${esc(t)}</td><td>${esc(a)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

function taskBlock(W, level) {
  return `<div class="cw-tasks">
    <div class="card cw-task ${level === '초급' ? 'mine' : ''}"><span class="badge">초급</span>${level === '초급' ? ' <small class="muted">내 수준</small>' : ''}<p>${esc(W.tasks.basic)}</p></div>
    <div class="card cw-task ${level === '중급' ? 'mine' : ''}"><span class="badge accent">중급</span>${level === '중급' ? ' <small class="muted">내 수준</small>' : ''}<p>${esc(W.tasks.inter)}</p></div>
  </div>
  ${W.dueAt ? `<p class="cw-due">📅 과제 ${esc(dueText(W.dueAt))}</p>` : ''}
  <p class="muted" style="font-size:14px;margin:6px 2px 0">📝 평가: ${esc(W.assess)}</p>`;
}

// 수업 안내 본문 (맛보기와 학습 화면이 같이 쓴다)
export function classWeekBody(W, videos, level = '') {
  return `
    ${coverHtml({ ...W, caption: W.patterns?.[0]?.zh || W.titleZh })}
    <p class="cw-topic"><b>주제:</b> <span class="zh">${esc(W.titleZh)}</span></p>
    <div class="card">
      <div class="ai-label">학습 목표</div>
      <ol class="cw-goals">${W.goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ol>
      <div class="muted" style="font-size:14px">핵심 언어 학습: <b style="color:var(--ink)">${esc(W.focus)}</b></div>
    </div>
    ${creatorBlock(W, videos)}
    ${patternBlock(W)}
    ${planBlock(W)}
    <div class="section-title" id="cw-task-head">수준별 과제</div>
    ${taskBlock(W, level)}
    ${W.convo && state.me?.user ? `<div class="card cw-convo"><div><div class="ai-label">AI 회화로 연습하기</div><b>${esc(W.convo.situation)}</b><div class="muted" style="font-size:14px">AI 역할: ${esc(W.convo.role)}</div></div><button class="btn" id="cw-talk">🤖 대화 시작</button></div>` : ''}`;
}

export function stageLabel(W) {
  return W.stage ? `${W.stage}단계 · ${STAGE_NAME[W.stage] || ''}` : '';
}

export function renderClassWeek(app, ctx, d) {
  const W = d.week;
  let st = d.state;
  let writings = d.writings || [];

  function head() {
    return `<div class="page-head week-head">
      <div><a href="#/course" class="muted" style="text-decoration:none">← 15주 과정</a>
        <div class="cw-stage">${esc(stageLabel(W))}</div>
        <h1 style="margin-top:4px">${W.week}주차 · ${esc(W.title)} <span class="zh" style="color:var(--accent)">${esc(W.titleZh)}</span></h1>
        <p>🎯 ${esc(W.goal)}</p></div>
      <div style="text-align:right">${st.done ? '<div class="seal">完成</div>' : `<div class="muted" style="font-size:13px">진행 ${st.steps}/2</div><div class="steps3 steps2" style="width:120px"><span class="${st.checked ? 'on' : ''}"></span><span class="${st.writing ? 'on' : ''}"></span></div><div class="muted" style="font-size:12px;margin-top:4px">수업 확인 · 과제 제출</div>`}</div>
    </div>
    ${st.done && st.completedAt ? `<div class="notice info">🎉 이 주차를 마쳤어요! ${W.week < d.total ? `<a href="#/week/${W.gid + 1}">${W.week + 1}주차로 →</a>` : '15주 과정을 모두 마쳤어요. 정말 수고했어요!'}</div>` : ''}`;
  }

  function checkBox() {
    return st.checked
      ? '<div class="notice info">✓ 이번 주 수업 안내를 확인했어요.</div>'
      : '<div class="card cw-check"><div><b>이번 주 수업 안내를 다 봤나요?</b><div class="muted" style="font-size:14px">학습 목표, 크리에이터 표현, 핵심 문형, 수업 흐름을 확인했으면 눌러 주세요.</div></div><button class="btn primary" id="cw-check">✓ 수업 안내 확인</button></div>';
  }

  function gradeBox() {
    const g = d.grade;
    if (!g) return '';
    return `<div class="card cw-grade"><div class="card-head"><h3>교수님 평가</h3>${statusBadge(g.status, g.label)}</div>
      ${g.total !== null ? `<div class="fb-score" style="display:inline-block">${g.total}</div>` : ''}
      ${g.comment ? `<div class="ai-box">${esc(g.comment)}</div>` : g.status === 'submitted' || g.status === 'resubmitted' ? '<p class="muted" style="margin:0">교수님이 아직 평가하지 않았어요.</p>' : ''}
      ${g.status === 'revise' ? '<p style="margin:8px 0 0">✏️ 의견을 보고 아래에서 다시 내 주세요.</p>' : ''}</div>`;
  }

  function submitBox() {
    return `<div class="card" id="cw-task">
      <div class="ai-label">과제 제출</div>
      <p class="muted" style="font-size:14px;margin-top:4px">초급 또는 중급 과제 중 하나를 골라 중국어로 써서 내세요. AI 선생님이 수준에 맞게 첨삭해 줍니다.</p>
      <textarea id="wr" rows="6" class="zh" style="font-size:17px" maxlength="1500" placeholder="여기에 중국어로 써 보세요."></textarea>
      <div class="row between" style="margin-top:8px"><span class="muted" style="font-size:13px"><span id="wc">0</span>/1500자</span>
        <button class="btn primary" id="wr-send" ${state.me.aiReady ? '' : 'disabled title="AI 첨삭이 설정되지 않았습니다"'}>✨ 제출하고 AI 첨삭 받기</button></div>
    </div>
    <div id="fb-out"></div>
    ${writings.length ? `<h3 style="margin-top:20px">이 주차에 낸 과제</h3>${writings.map((w) => feedbackHtml(w)).join('')}` : ''}`;
  }

  function nav() {
    return `<div class="row between" style="margin-top:20px">${W.week > 1 ? `<a class="btn" href="#/week/${W.gid - 1}">← ${W.week - 1}주차</a>` : '<span></span>'}${W.week < d.total ? `<a class="btn" href="#/week/${W.gid + 1}">${W.week + 1}주차 →</a>` : '<span></span>'}</div>`;
  }

  function draw() {
    app.innerHTML = `<div class="page cw-page">${head()}${classWeekBody(W, d.videos, d.level)}${checkBox()}${gradeBox()}${submitBox()}${nav()}</div>`;
    bindClassWeek(app);
    app.querySelector('#cw-talk')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await startTalkFromWeek(W.week); } catch (err) { e.target.disabled = false; toast(err.message, 'bad'); }
    });
    app.querySelector('#cw-check')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        const r = await post(`/api/weeks/${W.gid}/check`, {});
        st = r.state;
        toast(r.justDone ? '🎉 이번 주를 마쳤어요!' : '수업 안내를 확인했어요.');
        draw();
      } catch (err) {
        e.target.disabled = false;
        toast(err.message, 'bad');
      }
    });
    const ta = app.querySelector('#wr');
    ta?.addEventListener('input', () => (app.querySelector('#wc').textContent = ta.value.length));
    app.querySelector('#wr-send')?.addEventListener('click', async (e) => {
      const content = ta.value.trim();
      if (content.length < 4) return toast('과제를 조금 더 써 주세요.', 'bad');
      const btn = e.target;
      btn.disabled = true;
      btn.textContent = 'AI 선생님이 읽는 중…';
      try {
        const r = await post(`/api/weeks/${W.gid}/writing`, { content });
        st = r.state;
        writings = [r.writing, ...writings];
        toast(r.justDone ? '🎉 이번 주를 마쳤어요!' : '과제를 냈어요.');
        draw();
        app.querySelector('#cw-task')?.scrollIntoView({ block: 'start' });
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '✨ 제출하고 AI 첨삭 받기';
        toast(err.message, 'bad');
      }
    });
  }

  draw();
  const target = { videos: '#cw-creator', creator: '#cw-creator', task: '#cw-task', pattern: '.cw-patterns' }[ctx.tab];
  if (target) setTimeout(() => app.querySelector(target)?.scrollIntoView({ block: 'start' }), 0);
}

// 자막 열 켜고 끄기 (중국어·병음·한국어)
export function bindClassWeek(root) {
  root.querySelectorAll('.cw-trans').forEach((box) =>
    box.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => {
      b.classList.toggle('on');
      box.classList.toggle(`hide-${b.dataset.col}`, !b.classList.contains('on'));
    })),
  );
}
