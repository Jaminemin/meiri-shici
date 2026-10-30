// 주차당 단어 수 (server/curriculum.js의 WORDS_PER_WEEK와 같아야 함)
const WORDS_PER_WEEK = 15;
// 주차 학습: 단어 → 문형·예문 → 퀴즈 → 작문 미션(AI 첨삭)
import { state, esc, get, post, fail, toast, busy, speak, modal } from './core.js';
import { feedbackHtml } from './fb.js';
import { arrangeItems, sentenceChoiceItems } from './practice.js';
import { sceneCard } from './scenes.js';

// 번호 띠 색 (단어·문형 카드)
const NUM_COLORS = ['#2d5bd1', '#1c9a8f', '#7a4fd0', '#e0821a', '#3c9a4e', '#d4456f'];
import { mockItems, scoreMock, MOCK_SECTIONS } from './mock.js';

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

function knownKey(week) {
  return `ms_known_${state.me.user.id}_${week}`;
}
function loadKnown(week, serverCount) {
  try {
    const v = JSON.parse(localStorage.getItem(knownKey(week)) || '[]');
    if (Array.isArray(v) && v.length) return new Set(v);
  } catch {
    /* 무시 */
  }
  return serverCount >= WORDS_PER_WEEK ? new Set(['all']) : new Set();
}
function saveKnown(week, set) {
  try {
    localStorage.setItem(knownKey(week), JSON.stringify([...set]));
  } catch {
    /* 무시 */
  }
}

export async function renderWeek(app, ctx) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  let d = await get(`/api/weeks/${ctx.week}`);
  const W = d.week;
  let tab = ctx.tab;
  let known = loadKnown(W.gid, d.state.words);
  if (known.has('all')) known = new Set(W.words.map((w) => w.id));

  const tabs = [
    ['words', '① 단어'],
    ['pattern', '② 문형·예문'],
    ['listen', '③ 듣기'],
    ['speak', '④ 말하기'],
    ['quiz', '⑤ 퀴즈'],
    ['writing', '⑥ 쓰기'],
  ];
  const MOCK_NAME = W.course === 'emcee' ? '멘트 퀴즈' : '모의고사';
  if (W.mock) tabs.push(['mock', '⑦ ' + MOCK_NAME]);

  function head() {
    const st = d.state;
    return `<div class="page-head week-head">
      <div><a href="#/course" class="muted" style="text-decoration:none">← 15주 과정</a>
        <h1 style="margin-top:6px">${W.week}주차 · ${esc(W.title)} <span class="zh" style="color:var(--accent)">${esc(W.titleZh)}</span></h1>
        <p>🎯 ${esc(W.goal)}</p></div>
      <div style="text-align:right">${st.done ? '<div class="seal">完成</div>' : `<div class="muted" style="font-size:13px">진행 ${st.steps}/3</div><div class="steps3" style="width:140px"><span class="${st.words >= W.words.length ? 'on' : ''}"></span><span class="${st.quiz !== null && st.quiz >= d.passQuiz ? 'on' : ''}"></span><span class="${st.writing ? 'on' : ''}"></span></div>`}</div>
    </div>
    ${st.done && st.completedAt ? `<div class="notice info">🎉 이 주차를 모두 마쳤어요! ${W.week < d.total ? `<a href="#/week/${W.gid + 1}">${W.week + 1}주차로 →</a>` : '15주 과정을 모두 마쳤어요. 정말 수고했어요!'}</div>` : ''}
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}${k === 'words' && st.words >= W.words.length ? ' ✓' : ''}${k === 'quiz' && st.quiz !== null && st.quiz >= d.passQuiz ? ' ✓' : ''}${k === 'writing' && st.writing ? ' ✓' : ''}</button>`).join('')}</div>`;
  }

  function nav() {
    return `<div class="row between" style="margin-top:20px">${W.week > 1 ? `<a class="btn" href="#/week/${W.gid - 1}">← ${W.week - 1}주차</a>` : '<span></span>'}${W.week < d.total ? `<a class="btn" href="#/week/${W.gid + 1}">${W.week + 1}주차 →</a>` : ''}</div>`;
  }

  function draw() {
    let body = '';
    if (tab === 'words') body = wordsTab();
    if (tab === 'pattern') body = patternTab();
    if (tab === 'listen') body = listenTab();
    if (tab === 'speak') body = arrTab('speak');
    if (tab === 'quiz') body = quizIntro();
    if (tab === 'writing') body = writingTab();
    if (tab === 'mock') body = mockIntro();
    app.innerHTML = `<div class="page">${head()}<div id="body">${body}</div>${nav()}</div>`;
    app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), history.replaceState(null, '', `#/week/${W.gid}/${tab}`), draw())));
    bind();
  }

  // ---------- 단어 ----------
  let hideMean = false;
  function wordsTab() {
    return `<div class="row between" style="margin-bottom:12px">
        <span class="muted">외운 단어를 눌러 표시하세요 · <b id="kn">${known.size}</b>/${W.words.length}</span>
        <div class="row"><label class="row" style="font-size:14px"><input type="checkbox" id="hide" ${hideMean ? 'checked' : ''}> 뜻 가리기(외우기 모드)</label>
        <button class="btn small" id="all-known">모두 외웠어요</button></div></div>
      <div class="word-list ${hideMean ? 'hide-mean' : ''}" id="wl">${W.words
        .map(
          (w, i) => `<div class="word ${known.has(w.id) ? 'known' : ''}" data-w="${w.id}" style="--c:${NUM_COLORS[i % NUM_COLORS.length]}">
          <div class="num">${i + 1}</div>
          <div class="body">
            <div class="top"><div class="hz zh${w.hanzi.length >= 3 ? ' long' : ''}">${esc(w.hanzi)}</div>
              <div class="tools"><button class="speak" data-speak="${esc(w.hanzi)}" aria-label="${esc(w.hanzi)} 발음 듣기">🔊</button><button class="btn small ${known.has(w.id) ? 'primary' : ''}" data-know="${w.id}">${known.has(w.id) ? '✓ 외움' : '외웠어요'}</button></div></div>
            <div class="py">${esc(w.pinyin)}</div>
            <div class="mn">${esc(w.meaning)}</div>
          </div></div>`,
        )
        .join('')}</div>
      <div class="row end" style="margin-top:14px"><button class="btn primary" data-go="pattern">다음: 문형·예문 →</button></div>`;
  }

  let sendTimer = null;
  function sendKnown() {
    clearTimeout(sendTimer);
    sendTimer = setTimeout(async () => {
      try {
        const r = await post(`/api/weeks/${W.gid}/words`, { count: known.size });
        d.state = r.state;
        if (r.justDone) toast(`🎉 ${W.week}주차 완료!`);
      } catch (e) {
        fail(e);
      }
    }, 600);
  }

  // ---------- 문형 ----------
  function patternTab() {
    return `${W.course === 'travel' ? sceneCard(W.week, W.scene) : ''}<div class="section-label">핵심 문형 <small>${W.patterns.length}개 · 설명과 예시를 함께 봅니다</small></div>
      <div class="pattern-grid">${W.patterns
        .map(
          (p, i) => `<div class="pattern" style="--c:${NUM_COLORS[i % NUM_COLORS.length]}">
          <div class="phead"><span class="pnum">${i + 1}</span>
            <div><div class="zh ptitle">${esc(p.form)}</div>${p.formPy ? `<div class="py">${esc(p.formPy)}</div>` : ''}<div class="explain">${esc(p.explain)}</div></div></div>
          ${p.zh ? `<div class="ex"><span class="tab">예시 문장</span>
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1"><div class="zh">${esc(p.zh)}</div>${p.py ? `<div class="py">${esc(p.py)}</div>` : ''}<div class="muted">${esc(p.ko)}</div></div><button class="speak" data-speak="${esc(p.zh)}" aria-label="예문 듣기">🔊</button></div></div>` : ''}
        </div>`,
        )
        .join('')}</div>
      <div class="card"><h3>예문</h3>${W.examples
        .map((e) => `<div class="example"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div style="flex:1"><div class="zh">${esc(e.zh)}</div><div class="py">${esc(e.py)}</div><div class="muted">${esc(e.ko)}</div></div><button class="speak" data-speak="${esc(e.zh)}" aria-label="예문 듣기">🔊</button></div></div>`)
        .join('')}</div>
      <div class="row end"><button class="btn primary" data-go="listen">다음: 듣기 연습 →</button></div>`;
  }

  // ---------- 듣기·말하기: 단어 카드를 문장 순서대로 배열 (저장 없음) ----------
  let arr = null; // { mode, list, i, score, picked: [pool 인덱스], miss, wrongMsg, solved, autoplay }
  function arrTab(mode) {
    if (!arr || arr.mode !== mode) {
      arr = { mode, list: arrangeItems(W), i: 0, score: 0, picked: [], miss: false, wrongMsg: false, solved: false, autoplay: true };
      practiceNotice();
    }
    if (!arr.list.length) return '<div class="empty">이 주차는 문장 연습 자료가 아직 없어요.</div>';
    if (arr.i >= arr.list.length) {
      const n = arr.list.length;
      const msg = arr.score === n ? '모두 맞췄습니다! 축하드려요~' : '아쉽지만 복습 후 다시 시도해보세요~';
      return `<div class="card" style="text-align:center;padding:36px 20px"><div class="fb-score">${arr.score}<small class="muted" style="font-size:20px"> / ${n}</small></div><h2 style="margin-top:10px">${msg}</h2><div class="row" style="justify-content:center"><button class="btn primary" id="ar-again">다시 하기</button></div></div>`;
    }
    const it = arr.list[arr.i];
    const isSpeak = mode === 'speak';
    if (arr.autoplay) {
      arr.autoplay = false;
      speak(it.zh);
    }
    const head = `<div class="muted" style="font-size:13px">${isSpeak ? '말하기' : '듣기'} ${arr.i + 1} / ${arr.list.length} · ${isSpeak ? '뜻을 보고 중국어 문장을 단어 순서대로 맞혀 보세요' : '소리를 듣고 단어 카드를 순서대로 눌러 문장을 완성하세요'}</div>`;
    if (arr.solved) {
      return `<div class="card" style="text-align:center;padding:26px 20px">${head}
        <div class="zh" style="font-size:28px;margin:16px 0 4px">${esc(it.zh)}</div>
        <div class="py" style="color:var(--muted,#777)">${esc(it.py)}</div>
        <div style="margin:6px 0 12px">${esc(it.ko)}</div>
        <div class="row" style="justify-content:center"><button class="btn" id="ar-play-again">🔊 다시 듣기</button><button class="btn primary" id="ar-next">${arr.i + 1 < arr.list.length ? '다음' : '결과 보기'}</button></div>
        <div style="margin-top:10px"><span class="${arr.miss ? 'muted' : ''}">${arr.miss ? '정답입니다. 다음에는 한 번에 맞혀 봐요.' : '정답! 👏'}</span></div></div>`;
    }
    const picked = arr.picked.map((k) => esc(it.pool[k].t)).join(' ');
    return `<div class="card" style="text-align:center;padding:26px 20px">${head}
      ${isSpeak ? `<div style="font-size:18px;margin:14px 0 4px">${esc(it.ko)}</div>` : ''}
      <button class="btn primary big" id="ar-play" style="margin:12px 0">🔊 ${isSpeak ? '문장 듣기' : '다시 듣기'}</button>
      <div class="zh" style="min-height:44px;font-size:24px;margin:8px 0">${picked || '<span class="muted" style="font-size:15px">단어를 순서대로 눌러 주세요</span>'}</div>
      <div class="tags" style="justify-content:center">${it.pool
        .map((p, k) => `<button class="wpick zh" data-ar="${k}" ${arr.picked.includes(k) ? 'disabled' : ''}>${esc(p.t)}</button>`)
        .join('')}</div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn small" id="ar-undo">↶ 마지막 지우기</button><button class="btn small" id="ar-reset">처음부터</button></div>
      <div id="ar-msg" style="min-height:28px;margin-top:10px">${arr.wrongMsg ? '<span class="muted">순서가 다릅니다. 다시 맞혀 보세요.</span>' : ''}</div></div>`;
  }

  // ---------- 문장 고르기 (듣기·쓰기 공용): 보기 4개 중 맞는 중국어 문장을 고른다 (저장 없음) ----------
  // st: { list, i, attempt, wrong, solved, score, total, autoplay }
  const choiceState = () => ({ list: sentenceChoiceItems(W), i: 0, attempt: false, wrong: false, bad: [], solved: false, score: 0, total: 0, autoplay: true });
  // 연습 점수는 저장되지 않으므로, 이 주차를 열고 처음 풀기 전에 한 번 안내한다.
  let noticeSeen = false;
  function practiceNotice() {
    if (noticeSeen) return;
    noticeSeen = true;
    queueMicrotask(() =>
      modal('<h2>연습 점수 안내</h2><p style="line-height:1.7">이 연습의 점수는 <b>내 학습 기록에 저장되지 않아요.</b><br>부담 없이 여러 번 풀어 보세요.</p><div class="row end"><button class="btn primary" data-close>확인</button></div>'),
    );
  }
  let lq = null; // 듣기
  let fill = null; // 쓰기 연습
  function choiceTab(st, p, isListen) {
    if (!st.list.length) return '<div class="empty">이 주차는 문장 연습 자료가 아직 없어요.</div>';
    if (st.i >= st.list.length) {
      const msg = st.score === st.total ? '모두 맞췄습니다! 축하드려요~' : '아쉽지만 복습 후 다시 시도해보세요~';
      return `<div style="text-align:center;padding:20px 0"><div class="fb-score">${st.score}<small class="muted" style="font-size:20px"> / ${st.total}</small></div><h2 style="margin-top:8px">${msg}</h2><div class="row" style="justify-content:center"><button class="btn primary" id="${p}-again">다시 하기</button></div></div>`;
    }
    const it = st.list[st.i];
    const n = st.list.length;
    if (isListen && st.autoplay) {
      st.autoplay = false;
      speak(it.zh);
    }
    const head = `<div class="muted" style="font-size:13px">${isListen ? '듣기' : '쓰기'} ${st.i + 1} / ${n} · ${isListen ? '소리를 듣고 맞는 중국어 문장을 고르세요' : '뜻을 보고 맞는 중국어 문장을 고르세요'}</div>`;
    if (st.solved) {
      return `${head}
        <div class="zh" style="font-size:26px;margin:16px 0 4px">${esc(it.zh)}</div>
        <div class="py" style="color:var(--muted,#777)">${esc(it.py)}</div>
        <div style="margin:6px 0 12px">${esc(it.ko)}</div>
        <div class="row" style="justify-content:center">${isListen ? `<button class="btn" id="${p}-play-again">🔊 다시 듣기</button>` : ''}<button class="btn primary" id="${p}-next">${st.i + 1 < n ? '다음' : '결과 보기'}</button></div>
        <div style="margin-top:10px"><span class="${st.wrong ? 'muted' : ''}">${st.wrong ? '정답입니다. 다음에는 한 번에 맞혀 봐요.' : '정답! 👏'}</span></div>`;
    }
    return `${head}
      ${isListen
        ? `<button class="btn primary big" id="${p}-play" style="margin:12px 0">🔊 다시 듣기</button>`
        : `<div style="font-size:20px;margin:14px 0 12px">${esc(it.ko)}</div>`}
      <div class="choices">${it.opts.map((o, k) => `<button class="choice zh ${st.bad.includes(k) ? 'wrong' : ''}" data-${p}="${k}" ${st.bad.includes(k) ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      <div id="${p}-msg" style="min-height:28px;margin-top:10px">${st.wrong ? '<span class="muted">아쉬워요. 다시 골라 보세요.</span>' : ''}</div>`;
  }
  function listenTab() {
    if (!lq) {
      lq = choiceState();
      practiceNotice();
    }
    return `<div class="card" style="text-align:center;padding:26px 20px">${choiceTab(lq, 'lq', true)}</div>`;
  }
  function fillSection() {
    if (!fill) {
      fill = choiceState();
      practiceNotice();
    }
    return `<div class="card" style="margin-bottom:16px"><div class="ai-label">쓰기 연습</div><div style="margin-top:6px">${choiceTab(fill, 'fl', false)}</div></div>`;
  }

  // ---------- 퀴즈 ----------
  let quiz = null;
  function makeQuiz() {
    const words = W.words;
    return shuffle(words).map((w, i) => {
      const type = i % 3;
      const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3);
      const opts = shuffle([w, ...others]);
      if (type === 0) return { q: '이 단어의 뜻은?', prompt: w.hanzi, zh: true, sub: '', opts: opts.map((o) => ({ label: o.meaning, ok: o.id === w.id })), say: w.hanzi };
      if (type === 1) return { q: '이 뜻에 맞는 단어는?', prompt: w.meaning, zh: false, sub: '', opts: opts.map((o) => ({ label: o.hanzi, ok: o.id === w.id, zh: true })), say: w.hanzi };
      return { q: '이 병음에 맞는 한자는?', prompt: w.pinyin, zh: false, py: true, opts: opts.map((o) => ({ label: o.hanzi, ok: o.id === w.id, zh: true })), say: w.hanzi };
    });
  }
  function quizIntro() {
    const st = d.state;
    return `<div class="card" style="text-align:center;padding:36px 20px">
      <div class="seal" style="margin-bottom:14px">测验</div>
      <h2>${W.week}주차 단어 퀴즈 10문제</h2>
      <p class="muted">뜻·한자·병음을 고르는 문제예요. ${d.passQuiz}개 이상 맞히면 통과!</p>
      ${st.quiz !== null ? `<p>최고 점수 <b>${st.quiz}/10</b> · ${st.quizCount}번 풀었어요</p>` : ''}
      <button class="btn primary big" id="q-start">${st.quiz !== null ? '다시 풀기' : '시작하기'}</button></div>`;
  }
  function quizStep() {
    const body = app.querySelector('#body');
    const { list, i, score } = quiz;
    if (i >= list.length) return quizEnd();
    const it = list[i];
    const dots = list.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('');
    body.innerHTML = `
      <div class="q3-top"><span class="muted">${i + 1} / ${list.length}</span><span class="badge accent">맞힘 ${score}</span></div>
      <div class="q3-progress">${dots}</div>
      <div class="q3-wrap">
        <div class="q3-card" id="q3-card">
          <div class="q3-kicker">${esc(it.q)}</div>
          <div class="q3-prompt ${it.zh ? 'zh' : ''} ${it.py ? 'py' : ''}">${esc(it.prompt)}</div>
          <button class="q3-speak" id="q3-speak" aria-label="발음 듣기">🔊 듣기</button>
        </div>
      </div>
      <div class="q3-choices">${it.opts.map((o, k) => `<button class="q3-choice ${o.zh ? 'zh' : ''}" data-k="${k}">${esc(o.label)}</button>`).join('')}</div>
      <div id="q-next" class="q3-feedback" hidden></div>`;

    // 카드가 마우스를 따라 살짝 기울어지는 입체 효과
    const card = body.querySelector('#q3-card');
    card.onpointermove = (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `rotateX(${(-y * 14).toFixed(1)}deg) rotateY(${(x * 18).toFixed(1)}deg)`;
    };
    card.onpointerleave = () => (card.style.transform = '');
    body.querySelector('#q3-speak').onclick = () => speak(it.say);
    speak(it.say);

    body.querySelectorAll('.q3-choice').forEach(
      (b) =>
        (b.onclick = () => {
          const k = Number(b.dataset.k);
          const ok = it.opts[k].ok;
          body.querySelectorAll('.q3-choice').forEach((c, j) => {
            c.disabled = true;
            if (it.opts[j].ok) c.classList.add('right');
          });
          if (!ok) b.classList.add('wrong');
          else quiz.score++;
          const nx = body.querySelector('#q-next');
          nx.hidden = false;
          nx.innerHTML = `<div class="q3-msg ${ok ? 'good' : 'bad'}"><b>${ok ? '정답이에요! 👏' : '아쉬워요'}</b>${ok ? '' : `<span>정답: ${esc(it.opts.find((o) => o.ok).label)}</span>`}</div>
            <button class="btn primary big" id="q3-next">${i + 1 < list.length ? '다음 문제 →' : '결과 보기 →'}</button>`;
          nx.querySelector('#q3-next').onclick = () => {
            quiz.i++;
            quizStep();
          };
          nx.querySelector('#q3-next').focus();
        }),
    );
  }
  async function quizEnd() {
    const body = app.querySelector('#body');
    const score = quiz.score;
    body.innerHTML = '<div class="empty">점수 저장 중…</div>';
    try {
      const r = await post(`/api/weeks/${W.gid}/quiz`, { score });
      d.state = r.state;
      if (r.justDone) toast(`🎉 ${W.week}주차 완료!`);
    } catch (e) {
      fail(e);
    }
    const pass = score >= d.passQuiz;
    body.innerHTML = `<div class="card" style="text-align:center;padding:36px 20px">
      <div class="fb-score">${score}<small class="muted" style="font-size:20px"> / 10</small></div>
      <h2 style="margin-top:10px">${score === 10 ? '모두 맞췄습니다! 축하드려요~ 🎉' : pass ? '통과! 🎉' : '아쉽지만 복습 후 다시 시도해보세요~'}</h2>
      <p class="muted">${pass ? '작문 미션으로 배운 단어를 직접 써 보세요.' : `${d.passQuiz}개 이상 맞히면 통과예요. 단어를 한 번 더 보고 다시 도전해 보세요.`}</p>
      <div class="row" style="justify-content:center"><button class="btn" id="q-retry">다시 풀기</button><button class="btn primary" data-go="${pass ? 'writing' : 'words'}">${pass ? '작문 미션 →' : '단어 다시 보기'}</button></div></div>`;
    body.querySelector('#q-retry').onclick = () => {
      quiz = { list: makeQuiz(), i: 0, score: 0 };
      quizStep();
    };
    body.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => ((tab = b.dataset.go), draw())));
    // 머리 부분 진행 표시 갱신
    const headEl = app.querySelector('.page');
    if (headEl) app.querySelector('.tabs').outerHTML = (() => {
      const tmp = document.createElement('div');
      tmp.innerHTML = head();
      return tmp.querySelector('.tabs').outerHTML;
    })();
    app.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), draw())));
  }

  // ---------- 작문 ----------
  // 사회자(고급) 전용: 궁금한 문장을 바로 AI로 확인 (저장하지 않음)
  function sentenceCheckCard() {
    return `<div class="card" style="border:2px solid var(--accent-2, #c8312b)">
      <div class="ai-label">🎤 사회자 문장 바로 확인</div>
      <h3 style="margin:4px 0 6px">이 문장 맞나요?</h3>
      <p class="muted" style="font-size:14px">행사 중 쓰고 싶은 문장을 넣으면 AI가 맞는지, 사회자 말투에 맞는지 바로 봐 줘요. 저장되지 않아요.</p>
      <textarea id="ck-in" rows="3" class="zh" style="font-size:17px" maxlength="300" placeholder="예: 请各位嘉宾入场就座。"></textarea>
      <div class="row between" style="margin-top:8px"><span class="muted" style="font-size:13px">한국어로 써도 중국어로 옮겨 드려요</span>
      <button class="btn primary" id="ck-send" ${state.me.aiReady ? '' : 'disabled title="AI 확인이 설정되지 않았습니다"'}>✨ AI로 확인하기</button></div>
      <div id="ck-out"></div>
    </div>`;
  }
  function checkResultHtml(r) {
    const label = { good: ['✅', '맞는 문장이에요'], fix: ['✏️', '작은 수정이 필요해요'], rewrite: ['🔄', '다시 쓰는 것이 좋아요'] }[r.verdict] || ['✏️', '확인 결과'];
    const notes = (r.notes || []).length
      ? `<ul style="margin:8px 0 0;padding-left:18px">${r.notes.map((n) => `<li><span class="zh">${esc(n.original)}</span> → <b class="zh">${esc(n.fixed)}</b><br><span class="muted" style="font-size:14px">${esc(n.reason)}</span></li>`).join('')}</ul>`
      : '';
    return `<div class="card" style="margin-top:12px">
      <div class="ai-label">${label[0]} ${label[1]}</div>
      <div class="zh" style="font-size:22px;font-weight:600;margin-top:6px">${esc(r.corrected)} <button class="speak" data-speak="${esc(r.corrected)}" aria-label="문장 듣기">🔊</button></div>
      <div class="py">${esc(r.correctedPinyin)}</div>
      <div style="margin-top:4px">${esc(r.translation)}</div>
      ${notes}
      ${r.mcTip ? `<p style="margin:10px 0 0;font-size:14px"><b>사회자 팁</b> · ${esc(r.mcTip)}</p>` : ''}
    </div>`;
  }
  function writingTab() {
    return `${W.course === 'emcee' ? sentenceCheckCard() : ''}${fillSection()}<div class="card">
      <div class="ai-label">작문 미션</div><h2 style="margin-top:4px">${esc(W.mission)}</h2>
      <p class="muted" style="font-size:14px">배운 단어와 예문을 눌러서 문장을 만들어 보세요. 직접 입력해도 돼요.</p>
      <div class="ai-label" style="margin-top:6px">단어</div>
      <div class="tags" style="margin-bottom:10px">${W.words.map((w) => `<button class="tag zh" style="border:0;cursor:pointer;font-size:15px" data-ins="${esc(w.hanzi)}" title="${esc(w.pinyin)} · ${esc(w.meaning)}">${esc(w.hanzi)}</button>`).join('')}</div>
      <div class="ai-label">예문</div>
      <div class="tags" style="margin-bottom:10px">${W.examples.map((e) => `<button class="tag zh" style="border:0;cursor:pointer;font-size:14px" data-ins="${esc(e.zh)}" title="${esc(e.ko)}">${esc(e.zh)}</button>`).join('')}</div>
      <div class="row" style="margin-bottom:8px"><button class="btn small" id="wr-undo">↶ 마지막 입력 지우기</button><button class="btn small" id="wr-clear">전체 지우기</button></div>
      <textarea id="wr" rows="5" class="zh" style="font-size:18px" maxlength="1500" placeholder="여기에 중국어로 써 보세요. 예: 你好！我叫…"></textarea>
      <div class="row between" style="margin-top:8px"><span class="muted" style="font-size:13px"><span id="wc">0</span>/1500자 · 중국어 입력기가 없으면 병음 없이 한자만 복사해 써도 돼요.</span>
      <button class="btn primary" id="wr-send" ${state.me.aiReady ? '' : 'disabled title="AI 첨삭이 설정되지 않았습니다"'}>✨ AI 선생님께 첨삭 받기</button></div>
    </div>
    <div id="fb-out"></div>
    ${d.writings.length ? `<h3 style="margin-top:20px">이 주차의 지난 작문</h3>${d.writings.map((w) => feedbackHtml(w)).join('')}` : ''}`;
  }

  // ---------- 모의고사: 주차마다 듣기·문법·독해 문항을 퀴즈처럼 풀고 바로 채점 (저장 없음) ----------
  let mock = null; // { i, picks: [선택 번호], ok }
  const SEC_LABEL = { listen: '듣기', grammar: '문법', reading: '독해' };
  function mockIntro() {
    const items = mockItems(W.mock);
    return `<div class="card" style="text-align:center;padding:36px 20px">
      <div class="seal" style="margin-bottom:14px">模拟</div>
      <h2>${W.week}주차 ${MOCK_NAME} ${items.length}문제</h2>
      <p class="muted">듣기 ${W.mock.listening.length} · 문법 ${W.mock.grammar.length} · 독해 ${W.mock.reading.questions.length} 문항이에요. 문제마다 바로 채점돼요.</p>
      <button class="btn primary big" id="m-start">시작하기</button></div>`;
  }
  function mockStep() {
    const body = app.querySelector('#body');
    const items = mockItems(W.mock);
    const { i } = mock;
    if (i >= items.length) return mockEnd(items);
    const it = items[i];
    const dots = items.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('');
    let kicker = '';
    let prompt = '';
    if (it.sec === 'listen') {
      kicker = '듣고 알맞은 답을 고르세요';
      prompt = `<button class="q3-speak" id="m-speak" aria-label="다시 듣기">🔊 다시 듣기</button>`;
    } else if (it.sec === 'grammar') {
      kicker = '빈칸에 알맞은 말은?';
      prompt = `<div class="q3-prompt zh">${esc(it.q)}</div>`;
    } else {
      kicker = '지문을 읽고 답하세요';
      prompt = `<div class="zh" style="text-align:left;line-height:1.8;font-size:16px">${esc(it.passage.zh)}</div><div class="zh" style="margin-top:12px;font-weight:600;text-align:left">${esc(it.q)}</div>`;
    }
    body.innerHTML = `
      <div class="q3-top"><span class="muted">${SEC_LABEL[it.sec]} · ${i + 1} / ${items.length}</span><span class="badge accent">맞힘 ${mock.ok}</span></div>
      <div class="q3-progress">${dots}</div>
      <div class="q3-wrap"><div class="q3-card">
        <div class="q3-kicker">${esc(kicker)}</div>
        ${prompt}
      </div></div>
      ${it.sec === 'listen' ? `<p class="zh" style="text-align:center;margin:6px 0 0;font-weight:600">${esc(it.q)}</p>` : ''}
      <div class="q3-choices">${it.options.map((o, k) => `<button class="q3-choice ${it.sec !== 'listen' && /[\u4e00-\u9fff]/.test(o) ? 'zh' : ''}" data-k="${k}">${esc(o)}</button>`).join('')}</div>
      <div id="q-next" class="q3-feedback" hidden></div>`;

    const speakIt = () => it.sec === 'listen' && speak(it.zh);
    const sp = body.querySelector('#m-speak');
    if (sp) sp.onclick = () => speak(it.zh);
    speakIt();

    body.querySelectorAll('.q3-choice').forEach(
      (b) =>
        (b.onclick = () => {
          const k = Number(b.dataset.k);
          const ok = k === it.answer;
          mock.picks[i] = k;
          if (ok) mock.ok++;
          body.querySelectorAll('.q3-choice').forEach((c, j) => {
            c.disabled = true;
            if (j === it.answer) c.classList.add('right');
          });
          if (!ok) b.classList.add('wrong');
          let extra = '';
          if (it.sec === 'listen') extra = `<span class="zh">${esc(it.zh)}</span>`;
          if (it.sec === 'grammar') extra = `<span>${esc(it.explain)}</span>`;
          if (it.sec === 'reading') extra = `<details><summary>지문 해석 보기</summary><p style="margin:8px 0 0">${esc(it.passage.ko)}</p></details>`;
          const nx = body.querySelector('#q-next');
          nx.hidden = false;
          nx.innerHTML = `<div class="q3-msg ${ok ? 'good' : 'bad'}"><b>${ok ? '정답이에요! 👏' : '아쉬워요'}</b>${ok ? '' : `<span>정답: ${esc(it.options[it.answer])}</span>`}${extra}</div>
            <button class="btn primary big" id="m-next">${i + 1 < items.length ? '다음 문제 →' : '결과 보기 →'}</button>`;
          nx.querySelector('#m-next').onclick = () => {
            mock.i++;
            mockStep();
          };
          nx.querySelector('#m-next').focus();
        }),
    );
  }
  function mockEnd(items) {
    const body = app.querySelector('#body');
    const s = scoreMock(items, mock.picks);
    const total = items.length;
    const rows = MOCK_SECTIONS.map(
      (sec) => `<div class="row between" style="margin:6px 0"><span>${sec.label}</span><b>${s[sec.key].ok} / ${s[sec.key].total}</b></div>`,
    ).join('');
    body.innerHTML = `<div class="card" style="text-align:center;padding:36px 20px">
      <div class="fb-score">${mock.ok}<small class="muted" style="font-size:20px"> / ${total}</small></div>
      <h2 style="margin-top:10px">${mock.ok === total ? '모두 맞췄습니다! 🎉' : mock.ok >= total * 0.6 ? '잘했어요! 틀린 문제를 다시 확인해 보세요.' : '아쉬워요. 단어와 문형을 다시 보고 도전해 보세요.'}</h2>
      <div style="max-width:320px;margin:16px auto 0;text-align:left">${rows}</div>
      <div class="row" style="justify-content:center;margin-top:18px"><button class="btn primary" id="m-retry">다시 풀기</button><button class="btn" data-go="writing">쓰기 미션 →</button></div></div>`;
    body.querySelector('#m-retry').onclick = () => {
      mock = { i: 0, picks: [], ok: 0 };
      mockStep();
    };
    body.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => ((tab = b.dataset.go), draw())));
  }

  function bind() {
    const $ = (s) => app.querySelector(s);
    app.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => ((tab = b.dataset.go), draw())));
    // 단어
    app.querySelectorAll('[data-know]').forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const id = b.dataset.know;
          known.has(id) ? known.delete(id) : known.add(id);
          saveKnown(W.gid, known);
          const card = b.closest('.word');
          card.classList.toggle('known', known.has(id));
          b.classList.toggle('primary', known.has(id));
          b.textContent = known.has(id) ? '✓ 외움' : '외웠어요';
          $('#kn').textContent = known.size;
          sendKnown();
        }),
    );
    if ($('#all-known'))
      $('#all-known').onclick = () => {
        W.words.forEach((w) => known.add(w.id));
        saveKnown(W.gid, known);
        sendKnown();
        draw();
      };
    if ($('#hide'))
      $('#hide').onchange = (e) => {
        hideMean = e.target.checked;
        $('#wl').classList.toggle('hide-mean', hideMean);
      };
    app.querySelectorAll('.word').forEach((c) => (c.onclick = (e) => !e.target.closest('button') && c.classList.toggle('peek')));
    // 듣기·말하기 (단어 카드 배열)
    if ($('#ar-play')) $('#ar-play').onclick = () => speak(arr.list[arr.i].zh);
    if ($('#ar-play-again')) $('#ar-play-again').onclick = () => speak(arr.list[arr.i].zh);
    app.querySelectorAll('[data-ar]').forEach(
      (b) =>
        (b.onclick = () => {
          const it = arr.list[arr.i];
          arr.wrongMsg = false;
          arr.picked.push(Number(b.dataset.ar));
          if (arr.picked.length < it.pool.length) return draw();
          const ok = arr.picked.map((k) => it.pool[k].t).join('') === it.tokens.join('');
          if (ok) {
            arr.solved = true;
            if (!arr.miss) arr.score++;
          } else {
            arr.miss = true;
            arr.picked = [];
            arr.wrongMsg = true;
          }
          draw();
        }),
    );
    if ($('#ar-undo'))
      $('#ar-undo').onclick = () => {
        arr.picked.pop();
        arr.wrongMsg = false;
        draw();
      };
    if ($('#ar-reset'))
      $('#ar-reset').onclick = () => {
        arr.picked = [];
        arr.wrongMsg = false;
        draw();
      };
    if ($('#ar-next'))
      $('#ar-next').onclick = () => {
        arr.i++;
        arr.picked = [];
        arr.miss = false;
        arr.wrongMsg = false;
        arr.solved = false;
        arr.autoplay = true;
        draw();
      };
    if ($('#ar-again'))
      $('#ar-again').onclick = () => {
        arr = null;
        draw();
      };
    // 문장 고르기 (듣기·쓰기 공용)
    const bindChoice = (st, p, isListen, reset) => {
      if (!st) return;
      if (st.i >= st.list.length) {
        if ($(`#${p}-again`)) $(`#${p}-again`).onclick = () => { reset(); draw(); };
        return;
      }
      if ($(`#${p}-play`)) $(`#${p}-play`).onclick = () => speak(st.list[st.i].zh);
      if ($(`#${p}-play-again`)) $(`#${p}-play-again`).onclick = () => speak(st.list[st.i].zh);
      if ($(`#${p}-next`))
        $(`#${p}-next`).onclick = () => {
          st.i++;
          st.attempt = false;
          st.wrong = false;
          st.bad = [];
          st.solved = false;
          st.autoplay = true;
          draw();
        };
      app.querySelectorAll(`[data-${p}]`).forEach(
        (b) =>
          (b.onclick = () => {
            const ok = Number(b.dataset[p]) === st.list[st.i].answer;
            if (!st.attempt) {
              st.attempt = true;
              st.total++;
              if (ok) st.score++;
            }
            if (ok) {
              st.solved = true;
              st.wrong = false;
            } else {
              st.wrong = true;
              st.bad.push(Number(b.dataset[p]));
            }
            draw();
          }),
      );
    };
    bindChoice(lq, 'lq', true, () => (lq = null));
    bindChoice(fill, 'fl', false, () => (fill = null));
    // 모의고사
    if ($('#m-start'))
      $('#m-start').onclick = () => {
        mock = { i: 0, picks: [], ok: 0 };
        mockStep();
      };
    // 퀴즈
    if ($('#q-start'))
      $('#q-start').onclick = () => {
        quiz = { list: makeQuiz(), i: 0, score: 0 };
        quizStep();
      };
    // 작문
    const wr = $('#wr');
    if (wr) {
      try {
        wr.value = localStorage.getItem(`ms_draft_${state.me.user.id}_${W.gid}`) || '';
      } catch {
        /* 무시 */
      }
      $('#wc').textContent = wr.value.length;
      wr.oninput = () => {
        $('#wc').textContent = wr.value.length;
        try {
          localStorage.setItem(`ms_draft_${state.me.user.id}_${W.gid}`, wr.value);
        } catch {
          /* 무시 */
        }
      };
      let lastIns = '';
      app.querySelectorAll('[data-ins]').forEach(
        (b) =>
          (b.onclick = () => {
            const p = wr.selectionStart ?? wr.value.length;
            wr.value = wr.value.slice(0, p) + b.dataset.ins + wr.value.slice(wr.selectionEnd ?? p);
            lastIns = b.dataset.ins;
            wr.focus();
            wr.setSelectionRange(p + b.dataset.ins.length, p + b.dataset.ins.length);
            wr.oninput();
          }),
      );
      $('#wr-undo').onclick = () => {
        if (lastIns && wr.value.endsWith(lastIns)) wr.value = wr.value.slice(0, -lastIns.length);
        else wr.value = wr.value.trimEnd().replace(/[^\s]+$/, '').trimEnd();
        lastIns = '';
        wr.oninput();
      };
      $('#wr-clear').onclick = () => {
        wr.value = '';
        lastIns = '';
        wr.oninput();
      };
      if ($('#ck-send')) {
        $('#ck-send').onclick = (e) =>
          busy(e.currentTarget, async () => {
            const content = $('#ck-in').value.trim();
            if (content.length < 2) return toast('확인할 문장을 입력해 주세요.', 'bad');
            const r = await post('/api/check-sentence', { content });
            $('#ck-out').innerHTML = checkResultHtml(r.result);
          }, 'AI가 문장을 보는 중…').catch(fail);
      }
      $('#wr-send').onclick = (e) =>
        busy(e.currentTarget, async () => {
          const content = wr.value.trim();
          if (content.length < 4) return toast('조금 더 써 주세요.', 'bad');
          const r = await post(`/api/weeks/${W.gid}/writing`, { content });
          d.state = r.state;
          d.writings.unshift(r.writing);
          try {
            localStorage.removeItem(`ms_draft_${state.me.user.id}_${W.gid}`);
          } catch {
            /* 무시 */
          }
          $('#fb-out').innerHTML = `<h3 style="margin-top:16px">AI 선생님의 첨삭</h3>${feedbackHtml(r.writing)}`;
          wr.value = '';
          $('#wc').textContent = 0;
          if (r.justDone) toast(`🎉 ${W.week}주차 완료!`);
          $('#fb-out').scrollIntoView({ behavior: 'smooth' });
        }, 'AI 선생님이 읽는 중…').catch(fail);
    }
  }

  draw();
}
