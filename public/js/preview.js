// 로그인 없이 보는 1주차 맛보기 (단어·문형·예문만, 저장·퀴즈·작문 없음)
import { state, esc, get, speak, GOOGLE_G } from './core.js';
import { pandaCell } from './panda-art.js';
import { classWeekBody, stageLabel, bindClassWeek } from './classweek.js';

const NUM_COLORS = ['#2d5bd1', '#1c9a8f', '#7a4fd0', '#e0821a', '#3c9a4e', '#d4456f'];

export async function renderPreview(app, course = '') {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  let d;
  try {
    d = await get(`/api/preview?course=${encodeURIComponent(course)}`);
  } catch (e) {
    app.innerHTML = `<div class="page"><div class="notice bad">맛보기를 불러오지 못했습니다. (${esc(e.message)})</div><a class="btn" href="#/">처음으로</a></div>`;
    return;
  }
  if (d.notReady) {
    app.innerHTML = `<div class="page"><div class="card" style="text-align:center;padding:40px 20px"><h2>${esc(d.course.name)} · 준비 중</h2><p class="muted">이 과목의 자료를 만들고 있어요. 준비되면 여기에서 맛보기를 볼 수 있습니다.</p><a class="btn" href="#/">처음으로</a></div></div>`;
    return;
  }
  const W = d.week;
  if (W.format === 'class') return previewClass(app, d);
  const loginCta = state.me?.googleReady
    ? `<a class="btn primary big" href="/auth/google">${GOOGLE_G} 구글 계정으로 시작하기</a>`
    : '<span class="btn big" aria-disabled="true" style="opacity:.6">구글 로그인 준비 중</span>';

  app.innerHTML = `
  <div class="page">
    <div class="page-head">
      <div>
        <a href="#/" class="muted" style="text-decoration:none">← 처음으로</a>
        <h1 style="margin-top:6px">맛보기 · ${W.week}주차 ${esc(W.title)} <span class="zh" style="color:var(--accent)">${esc(W.titleZh)}</span></h1>
        <p>🎯 ${esc(W.goal)}</p>
      </div>
      <div class="cta">${loginCta}</div>
    </div>

    <div class="notice info">로그인 없이 1주차 내용을 둘러보는 중입니다. 퀴즈, 작문 첨삭, 학습 기록 저장은 로그인 후에 이용할 수 있습니다. (전체 ${d.total}주 과정)</div>

    <div class="section-title">① 단어 ${W.words.length}개</div>
    <div class="word-list">
      ${W.words
        .map(
          (w, i) => `<div class="word" style="--c:${NUM_COLORS[i % NUM_COLORS.length]}">
            <div class="num">${i + 1}</div>
            <div class="body">
              <div class="top"><div class="hz zh${w.hanzi.length >= 3 ? ' long' : ''}">${esc(w.hanzi)}</div>
                <div class="tools"><button class="speak" data-say="${esc(w.hanzi)}" aria-label="${esc(w.hanzi)} 발음 듣기">🔊</button></div></div>
              <div class="py">${esc(w.pinyin)}${w.hanKr ? ` <span class="kr-read">(한국어 발음: ${esc(w.hanKr)})</span>` : ''}</div>
              <div class="mn">${esc(w.meaning)}</div>
            </div>
          </div>`,
        )
        .join('')}
      ${pandaCell('hello')}
    </div>

    <div class="section-title">② 핵심 문형 ${W.patterns.length}개</div>
    <div class="pattern-grid">
      ${W.patterns
        .map(
          (p, i) => `<div class="pattern" style="--c:${NUM_COLORS[i % NUM_COLORS.length]}">
            <div class="phead"><span class="pnum">${i + 1}</span>
              <div><div class="zh ptitle">${esc(p.form)}</div>${p.formKr ? `<div class="kr-read">${esc(p.formKr)}</div>` : ''}<div class="explain">${esc(p.explain)}</div></div></div>
            ${p.zh ? `<div class="ex"><span class="tab">예시 문장</span><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1"><div class="zh">${esc(p.zh)}</div>${p.py ? `<div class="py">${esc(p.py)}</div>` : ''}<div class="muted">${esc(p.ko)}</div></div><button class="speak" data-say="${esc(p.zh)}" aria-label="예문 듣기">🔊</button></div></div>` : ''}
          </div>`,
        )
        .join('')}
      ${pandaCell('cheer')}
    </div>

    <div class="section-title">예문</div>
    <div class="grid2">
      ${W.examples
        .map(
          (x) => `<div class="card">
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start">
              <div style="flex:1">
                <div class="zh" style="font-size:20px;font-weight:600"><span aria-hidden="true">🐼</span> ${esc(x.zh)}</div>
                <div class="py" style="color:var(--muted,#777)">${esc(x.py)}${x.krRead ? `<div class="kr-read">(한국어 발음: ${esc(x.krRead)})</div>` : ''}</div>
                <div style="margin-top:4px">${esc(x.ko)}</div>
              </div>
              <button class="btn" data-say="${esc(x.zh)}" aria-label="예문 듣기">🔊</button>
            </div>
          </div>`,
        )
        .join('')}
      ${pandaCell('smile')}
    </div>

    <div class="section-title">④ 작문 미션 (로그인 후)</div>
    <div class="card">
      <p>${esc(W.mission)}</p>
      <p class="muted" style="font-size:13px">로그인하면 AI 선생님이 문장을 고쳐 주고, 퀴즈와 학습 기록이 저장됩니다.</p>
    </div>

    <div class="row" style="justify-content:center;margin-top:28px">${loginCta}</div>
  </div>`;

  app.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
}

// 숏폼 과정 맛보기: 1주차 수업 안내·단어·문장을 보여 준다 (퀴즈·과제 제출은 로그인 후)
function previewClass(app, d) {
  const W = d.week;
  const loginCta = state.me?.googleReady
    ? `<a class="btn primary big" href="/auth/google">${GOOGLE_G} 구글 계정으로 시작하기</a>`
    : '<span class="btn big" aria-disabled="true" style="opacity:.6">구글 로그인 준비 중</span>';
  app.innerHTML = `<div class="page cw-page">
    <div class="page-head">
      <div><a href="#/" class="muted" style="text-decoration:none">← 처음으로</a>
        <div class="cw-stage">${esc(stageLabel(W))}</div>
        <h1 style="margin-top:4px">맛보기 · ${W.week}주차 ${esc(W.title)} <span class="zh" style="color:var(--accent)">${esc(W.titleZh)}</span></h1>
        <p>🎯 ${esc(W.goal)}</p></div>
      <div class="cta">${loginCta}</div>
    </div>
    <div class="notice info">로그인 없이 1주차를 둘러보는 중입니다. 퀴즈, 과제 제출과 AI 첨삭, 학습 기록 저장은 로그인 후에 이용할 수 있습니다. (전체 ${d.total}주 과정)</div>
    ${classWeekBody(W, d.videos)}
    <div class="card"><h3>① 이번 주 단어 <small class="muted" style="font-weight:400">${(W.words || []).length}개</small></h3>
      <div id="pv-wordbox"></div></div>
    <div class="card"><h3>② 이번 주 문장</h3>${(W.examples || []).map((e) => `<div class="example"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1"><div class="zh">${esc(e.zh)}</div><div class="py">${esc(e.py)}</div><div class="muted">${esc(e.ko)}</div></div><button class="speak" data-speak="${esc(e.zh)}" aria-label="듣기">🔊</button></div></div>`).join('')}</div>
    <div class="card" style="text-align:center;margin-top:16px"><h3 style="margin:0 0 6px">15주 전체 과정이 궁금하다면</h3><p class="muted" style="margin:0 0 12px">로그인하면 15주 과정 소개, 주차별 수업, 과제 제출과 AI 첨삭을 이용할 수 있어요.</p>${loginCta}</div>
  </div>`;
  bindClassWeek(app);
  drawWords(app, W.words || []);
}

// 맛보기 단어: 뜻 가리기와 외웠어요 표시 (저장하지 않고 화면에서만 기억)
function drawWords(app, words) {
  const box = app.querySelector('#pv-wordbox');
  if (!box) return;
  const known = new Set();
  let hide = false;
  const draw = () => {
    box.innerHTML = `<div class="word-bar">
        <span class="wb-count">외운 단어 <b>${known.size}</b>/${words.length}</span>
        <div class="wb-actions"><button class="btn small ${hide ? 'primary' : ''}" id="pv-hide" aria-pressed="${hide}">${hide ? '🙈 뜻 가리는 중' : '🙈 뜻 가리기'}</button>
        <button class="btn small" id="pv-all">✓ 모두 외웠어요</button></div></div>
      ${hide ? '<p class="muted wb-tip">카드를 누르면 가린 뜻이 잠깐 보여요.</p>' : ''}
      <div class="word-list ${hide ? 'hide-mean' : ''}">${words.map((w, i) => `<div class="word ${known.has(i) ? 'known' : ''}" style="--c:${NUM_COLORS[i % NUM_COLORS.length]}">
          <div class="num">${i + 1}</div>
          <div class="body">
            <div class="top"><div class="hz zh${w.hanzi.length >= 3 ? ' long' : ''}${w.hanzi.length >= 4 ? ' xl' : ''}">${esc(w.hanzi)}</div>
              <div class="tools"><button class="speak" data-speak="${esc(w.hanzi)}" aria-label="${esc(w.hanzi)} 발음 듣기">🔊</button><button class="btn small ${known.has(i) ? 'primary' : ''}" data-know="${i}">${known.has(i) ? '✓ 외움' : '외웠어요'}</button></div></div>
            <div class="py">${esc(w.pinyin)}</div>
            <div class="mn">${esc(w.meaning)}</div>
          </div></div>`).join('')}</div>`;
    box.querySelector('#pv-hide').onclick = () => { hide = !hide; draw(); };
    box.querySelector('#pv-all').onclick = () => { words.forEach((_, i) => known.add(i)); draw(); };
    box.querySelectorAll('[data-know]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const k = Number(b.dataset.know); known.has(k) ? known.delete(k) : known.add(k); draw(); }));
    box.querySelectorAll('[data-speak]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.speak); }));
    box.querySelectorAll('.word').forEach((c) => (c.onclick = (e) => !e.target.closest('button') && c.classList.toggle('peek')));
  };
  draw();
}
