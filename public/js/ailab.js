// AI 실습: 허브 · ① 댓글창 시뮬레이터 · ② 유행어 해독기 · 내 단어장(퀴즈)
import { esc, get, post, del, toast, ago, speak, confirmBox } from './core.js';

const VERDICT = { good: ['✅', '자연스러워요'], fix: ['✏️', '조금만 고치면 돼요'], rewrite: ['🔄', '다시 써 보면 좋아요'] };
const say = (zh) => (zh ? `<button class="speak" data-speak="${esc(zh)}" aria-label="듣기">🔊</button>` : '');
const quotaText = (q) => (q ? `오늘 AI 사용 ${q.used}/${q.limit}회` : '');
function loading(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
}
function back(href = '#/lab', label = 'AI 실습') {
  return `<a href="${href}" class="muted" style="text-decoration:none">← ${label}</a>`;
}

// ---------------- 허브 ----------------
export async function renderLab(app) {
  loading(app);
  const d = await get('/api/lab');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>✨ AI 실습</h1><p>책으로는 할 수 없는 연습이에요. 내가 쓴 중국어에 AI가 중국 네티즌처럼 반응하고, 내가 본 진짜 중국어를 풀어 줘요.</p></div></div>
    <div class="lab-grid">
      <a class="card lab-card" href="#/comments"><span class="lab-ico">💬</span><h3>AI 댓글창</h3><p class="muted">내 숏폼 대본·캡션을 올리면 중국 네티즌 6명이 댓글을 달아요. 중국어로 답글을 달고 평가받아요.</p><span class="track-go">글 올리기 →</span></a>
      <a class="card lab-card" href="#/decode"><span class="lab-ico">🔍</span><h3>유행어 해독기</h3><p class="muted">도우인·샤오훙슈에서 본 댓글·자막을 붙여 넣으면 진짜 뜻과 말투를 풀어 줘요.</p><span class="track-go">해독하기 →</span></a>
      <a class="card lab-card" href="#/mywords"><span class="lab-ico">📒</span><h3>내 단어장 <span class="badge accent">${d.wordCount}개</span></h3><p class="muted">해독기에서 저장한 표현을 모아 보고, 나만의 퀴즈로 외워요.</p><span class="track-go">단어장 보기 →</span></a>
      <a class="card lab-card" href="#/talk"><span class="lab-ico">🤖</span><h3>AI 회화</h3><p class="muted">주차별 상황에서 AI가 중국인 역할을 맡아 대화해요.</p><span class="track-go">대화하기 →</span></a>
    </div>
    ${d.posts.length ? `<div class="section-title">내가 올린 글</div><div class="card">${d.posts.map((p) => `<a class="row between talk-past" href="#/comments/${p.id}"><span class="zh">${p.week ? `<span class="badge">${p.week}주차</span> ` : ''}${esc(p.preview)}</span><span class="muted" style="font-size:13px">댓글 ${p.n} · ${ago(p.created_at)}</span></a>`).join('')}</div>` : ''}
    ${d.decodes.length ? `<div class="section-title">최근 해독</div><div class="card">${d.decodes.map((x) => `<a class="row between talk-past" href="#/decode/${x.id}"><span class="zh">${esc(x.preview)}</span><span class="muted" style="font-size:13px">${esc(x.summary || '')} · ${ago(x.created_at)}</span></a>`).join('')}</div>` : ''}
  </div>`;
}

// ---------------- ① 댓글창 ----------------
export async function renderComments(app) {
  loading(app);
  const d = await get('/api/lab');
  let draft = '';
  try { draft = sessionStorage.getItem('ms_cm_draft') || ''; } catch { /* 무시 */ }
  app.innerHTML = `<div class="page">
    <div class="page-head"><div>${back()}<h1 style="margin-top:6px">💬 AI 댓글창</h1><p>내가 만든 숏폼의 대본이나 캡션을 올려 보세요. 성격이 다른 중국 네티즌 6명이 댓글을 달아요. 마음에 드는 댓글에 중국어로 답글을 달면 AI가 댓글 말투까지 평가해 줘요.</p></div></div>
    <div class="card">
      <label class="vlabel">어느 주차 숏폼인가요? (선택)
        <select id="cm-week"><option value="">자유 주제</option>${d.weeks.map((w) => `<option value="${w.week}">${w.week}주차 · ${esc(w.title)}</option>`).join('')}</select></label>
      <label class="vlabel" style="margin-top:10px">대본·캡션 (중국어로 쓰면 더 좋아요)
        <textarea id="cm-text" rows="5" class="zh" maxlength="600" placeholder="예: 大家好，我是智秀！今天带大家去首尔的一家宝藏小店，人均三十块，真的很好吃！">${esc(draft)}</textarea></label>
      <div class="row between" style="margin-top:8px"><span class="muted" style="font-size:13px"><span id="cm-n">${draft.length}</span>/600자</span><button class="btn primary" id="cm-go">💬 올리고 댓글 받기</button></div>
    </div>
    ${d.posts.length ? `<div class="section-title">내가 올린 글</div><div class="card">${d.posts.map((p) => `<a class="row between talk-past" href="#/comments/${p.id}"><span class="zh">${p.week ? `<span class="badge">${p.week}주차</span> ` : ''}${esc(p.preview)}</span><span class="muted" style="font-size:13px">댓글 ${p.n} · ${ago(p.created_at)}</span></a>`).join('')}</div>` : ''}
  </div>`;
  const ta = app.querySelector('#cm-text');
  ta.oninput = () => {
    app.querySelector('#cm-n').textContent = ta.value.length;
    try { sessionStorage.setItem('ms_cm_draft', ta.value); } catch { /* 무시 */ }
  };
  app.querySelector('#cm-go').onclick = async (e) => {
    const content = ta.value.trim();
    if (content.length < 4) return toast('대본이나 캡션을 조금 더 써 주세요.', 'bad');
    const b = e.currentTarget;
    b.disabled = true;
    b.textContent = '중국 네티즌들이 댓글 다는 중…';
    try {
      const r = await post('/api/comments', { content, week: app.querySelector('#cm-week').value || null });
      try { sessionStorage.removeItem('ms_cm_draft'); } catch { /* 무시 */ }
      location.hash = `#/comments/${r.id}`;
    } catch (err) {
      b.disabled = false;
      b.textContent = '💬 올리고 댓글 받기';
      toast(err.message, 'bad');
    }
  };
}

function replyHtml(r) {
  const v = VERDICT[r.eval?.verdict] || VERDICT.fix;
  return `<div class="cm-reply">
    <div class="cm-me"><span class="cm-ava me">나</span><div><div class="zh">${esc(r.text)}</div></div></div>
    <div class="cm-eval">
      <div class="row between"><b>${v[0]} ${v[1]}</b><span class="badge accent">${r.eval?.score ?? '–'}점</span></div>
      ${r.eval?.corrected && r.eval.corrected !== r.text ? `<div class="cm-fix"><span class="muted" style="font-size:12px">고친 답글</span><div class="zh">${esc(r.eval.corrected)} ${say(r.eval.corrected)}</div><div class="py">${esc(r.eval.correctedPy || '')}</div><div class="muted" style="font-size:14px">${esc(r.eval.translation || '')}</div></div>` : ''}
      <p style="margin:6px 0 0;font-size:14px">${esc(r.eval?.comment || '')}</p>
      ${(r.eval?.better || []).length ? `<div class="cm-better"><span class="muted" style="font-size:12px">이렇게도 말해요</span>${r.eval.better.map((b) => `<div><span class="zh">${esc(b.zh)}</span> ${say(b.zh)} <span class="py">${esc(b.py)}</span> <span class="muted">· ${esc(b.ko)}</span></div>`).join('')}</div>` : ''}
    </div>
    ${r.follow?.text ? `<div class="cm-follow"><span class="cm-ava">↩</span><div><div class="zh">${esc(r.follow.text)} ${say(r.follow.text)}</div><div class="py">${esc(r.follow.py)}</div><div class="muted" style="font-size:14px">${esc(r.follow.ko)}</div></div></div>` : ''}
  </div>`;
}

function commentHtml(c, i, max) {
  const left = max - (c.replies || []).length;
  return `<div class="cm-item" data-i="${i}">
    <div class="cm-head"><span class="cm-ava">${esc((c.nick || '网')[0])}</span><div style="flex:1;min-width:0"><div class="cm-nick">${esc(c.nick)} <span class="badge">${esc(c.persona)}</span></div>
      <div class="zh cm-text">${esc(c.text)} ${say(c.text)}</div>
      <div class="py cm-sub">${esc(c.py)}</div><div class="muted cm-sub" style="font-size:14px">${esc(c.ko)}</div>
      ${c.learn ? `<div class="cm-learn">📌 ${esc(c.learn)}</div>` : ''}</div>
      <span class="cm-like" aria-label="좋아요">♥ ${c.likes ?? 0}</span></div>
    ${(c.replies || []).map(replyHtml).join('')}
    ${left > 0 ? `<div class="cm-form"><input class="zh" maxlength="200" placeholder="중국어로 답글 달기…" data-in="${i}"><button class="btn small primary" data-send="${i}">답글</button></div>` : '<p class="muted" style="font-size:13px;margin:6px 0 0 46px">이 댓글에는 답글을 다 달았어요.</p>'}
  </div>`;
}

export async function renderCommentPost(app, id) {
  loading(app);
  const d = await get(`/api/comments/${id}`);
  const P = d.post;
  let pyOn = true;
  let koOn = true;
  function draw() {
    app.innerHTML = `<div class="page cm-page">
      <div class="page-head"><div>${back('#/comments', 'AI 댓글창')}<h1 style="margin-top:6px">💬 댓글 ${P.comments.length}개</h1><p>${esc(P.reaction || '')}</p></div></div>
      <div class="card cm-post"><div class="ai-label">${P.week ? `${P.week}주차 · ` : ''}내가 올린 글</div><div class="zh" style="font-size:18px;white-space:pre-wrap">${esc(P.content)}</div></div>
      <div class="cm-tools"><span class="muted" style="font-size:13px">보기</span><button class="tag ${pyOn ? 'on' : ''}" data-t="py">병음</button><button class="tag ${koOn ? 'on' : ''}" data-t="ko">한국어 뜻</button><span class="spacer"></span><button class="btn small danger" id="cm-del">글 지우기</button></div>
      <div class="card cm-list ${pyOn ? '' : 'hide-py'} ${koOn ? '' : 'hide-ko'}">${P.comments.map((c, i) => commentHtml(c, i, d.maxReplies)).join('')}</div>
    </div>`;
    app.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => {
      if (b.dataset.t === 'py') pyOn = !pyOn;
      else koOn = !koOn;
      draw();
    }));
    app.querySelector('#cm-del').onclick = async () => {
      if (!(await confirmBox('이 글과 댓글을 지울까요?'))) return;
      await del(`/api/comments/${P.id}`);
      location.hash = '#/comments';
    };
    app.querySelectorAll('[data-send]').forEach((b) => {
      const i = Number(b.dataset.send);
      const inp = app.querySelector(`[data-in="${i}"]`);
      inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) b.click(); };
      b.onclick = async () => {
        const text = inp.value.trim();
        if (!text) return toast('답글을 써 주세요.', 'bad');
        b.disabled = true;
        inp.disabled = true;
        b.textContent = '평가 중…';
        try {
          const r = await post(`/api/comments/${P.id}/reply`, { idx: i, text });
          P.comments[i] = r.comment;
          draw();
          app.querySelector(`.cm-item[data-i="${i}"]`)?.scrollIntoView({ block: 'center' });
          if (r.quota) toast(quotaText(r.quota));
        } catch (err) {
          b.disabled = false;
          inp.disabled = false;
          b.textContent = '답글';
          toast(err.message, 'bad');
        }
      };
    });
  }
  draw();
}

// ---------------- ② 유행어 해독기 ----------------
function decodeResultHtml(d, saved) {
  const R = d.result;
  return `<div class="card dc-result">
    <div class="ai-label">원문</div>
    <div class="zh" style="font-size:20px">${esc(d.text)} ${say(d.text)}</div>
    ${R.pinyin ? `<div class="py">${esc(R.pinyin)}</div>` : ''}
    <div class="dc-summary">💡 ${esc(R.summary)}</div>
    <div class="dc-two">
      <div><div class="ai-label">글자 그대로</div><p>${esc(R.literal)}</p></div>
      <div><div class="ai-label">실제 뜻 (자연스러운 번역)</div><p><b>${esc(R.natural)}</b></p></div>
    </div>
    <div class="ai-label">말투·뉘앙스</div><p>${esc(R.tone)}</p>
    ${R.caution ? `<div class="notice warn" style="margin:8px 0">⚠️ ${esc(R.caution)}</div>` : ''}
  </div>
  ${R.items.length ? `<div class="row between" style="margin:16px 2px 8px"><div class="section-title" style="margin:0">핵심 표현 ${R.items.length}개</div><button class="btn small primary" id="dc-all">📒 모두 단어장에 넣기</button></div>
  <div class="dc-items">${R.items.map((x, i) => `<div class="card dc-item">
    <div class="row between" style="align-items:flex-start"><div><span class="zh dc-term">${esc(x.term)}</span> ${say(x.term)} ${x.slang ? '<span class="badge warn">유행어</span>' : ''}<div class="py">${esc(x.py)}</div><b>${esc(x.meaning)}</b></div>
      <button class="btn small ${saved.includes(x.term) ? '' : 'primary'}" data-save="${i}" ${saved.includes(x.term) ? 'disabled' : ''}>${saved.includes(x.term) ? '✓ 저장됨' : '📒 저장'}</button></div>
    <p class="muted" style="font-size:14px;margin:6px 0">${esc(x.usage)}</p>
    <div class="dc-ex"><div class="zh">${esc(x.example)} ${say(x.example)}</div><div class="py">${esc(x.examplePy)}</div><div class="muted" style="font-size:14px">${esc(x.exampleKo)}</div></div>
  </div>`).join('')}</div>` : ''}
  ${R.similar.length ? `<div class="card"><div class="ai-label">비슷한 표현</div>${R.similar.map((s) => `<div style="margin-top:6px"><span class="zh">${esc(s.zh)}</span> ${say(s.zh)} <span class="py">${esc(s.py)}</span> <span class="muted">· ${esc(s.ko)}</span></div>`).join('')}</div>` : ''}`;
}

export async function renderDecode(app, id = null) {
  let current = null;
  let saved = [];
  if (id) {
    loading(app);
    const r = await get(`/api/decode/${id}`);
    current = r;
    saved = r.saved;
  }
  function draw() {
    app.innerHTML = `<div class="page">
      <div class="page-head"><div>${back()}<h1 style="margin-top:6px">🔍 유행어 해독기</h1><p>도우인·샤오훙슈·빌리빌리에서 본 댓글, 자막, 캡션을 그대로 붙여 넣어 보세요. 글자 그대로의 뜻과 실제로 쓰이는 뜻, 말투를 나눠서 풀어 줘요.</p></div></div>
      <div class="card">
        <textarea id="dc-text" rows="3" class="zh" maxlength="400" placeholder="예: 这家店绝绝子，谁懂啊！家人们冲！">${current && !id ? '' : ''}</textarea>
        <div class="row between" style="margin-top:8px;flex-wrap:wrap;gap:6px"><div class="tags">${['yyds', '我真的会谢', '尊嘟假嘟', '这波操作666', '笑不活了'].map((s) => `<button class="tag zh" data-ex="${esc(s)}">${esc(s)}</button>`).join('')}</div><button class="btn primary" id="dc-go">🔍 해독하기</button></div>
      </div>
      <div id="dc-out">${current ? decodeResultHtml(current, saved) : ''}</div>
    </div>`;
    const ta = app.querySelector('#dc-text');
    app.querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => { ta.value = b.dataset.ex; ta.focus(); }));
    app.querySelector('#dc-go').onclick = async (e) => {
      const text = ta.value.trim();
      if (!text) return toast('해석할 중국어를 붙여 넣어 주세요.', 'bad');
      const b = e.currentTarget;
      b.disabled = true;
      b.textContent = '해독 중…';
      try {
        const r = await post('/api/decode', { text });
        current = r;
        saved = r.saved;
        history.replaceState(null, '', `#/decode/${r.id}`);
        draw();
        app.querySelector('#dc-out')?.scrollIntoView({ block: 'start' });
        if (r.quota) toast(quotaText(r.quota));
      } catch (err) {
        b.disabled = false;
        b.textContent = '🔍 해독하기';
        toast(err.message, 'bad');
      }
    };
    bindSave();
  }
  function wordOf(x) {
    return { hanzi: x.term, pinyin: x.py, meaning: x.meaning, note: x.usage, source: current.text.slice(0, 200) };
  }
  function bindSave() {
    if (!current) return;
    const items = current.result.items;
    app.querySelectorAll('[data-save]').forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try {
        await post('/api/my/words', wordOf(items[Number(b.dataset.save)]));
        saved = [...saved, items[Number(b.dataset.save)].term];
        b.textContent = '✓ 저장됨';
        b.classList.remove('primary');
        toast('단어장에 넣었어요.');
      } catch (err) { b.disabled = false; toast(err.message, 'bad'); }
    }));
    const all = app.querySelector('#dc-all');
    if (all) all.onclick = async () => {
      const rest = items.filter((x) => !saved.includes(x.term));
      if (!rest.length) return toast('이미 모두 저장했어요.');
      all.disabled = true;
      try {
        const r = await post('/api/my/words', { words: rest.map(wordOf) });
        saved = items.map((x) => x.term);
        draw();
        toast(`단어장에 ${r.added}개 넣었어요.`);
      } catch (err) { all.disabled = false; toast(err.message, 'bad'); }
    };
  }
  draw();
}

// ---------------- 내 단어장 + 퀴즈 ----------------
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

export async function renderMyWords(app) {
  loading(app);
  let words = (await get('/api/my/words')).words;
  let hide = false;
  let quiz = null;

  function list() {
    return `<div class="page">
      <div class="page-head"><div>${back()}<h1 style="margin-top:6px">📒 내 단어장 <span class="badge accent">${words.length}개</span></h1><p>유행어 해독기에서 저장한 표현이에요. 4개 이상 모이면 나만의 퀴즈를 풀 수 있어요.</p></div>
        <div class="row" style="gap:6px"><a class="btn" href="#/decode">🔍 더 찾아보기</a><button class="btn primary" id="mw-quiz" ${words.length < 4 ? 'disabled title="4개 이상 모이면 열려요"' : ''}>📝 퀴즈 풀기</button></div></div>
      ${words.length ? `<div class="row between" style="margin-bottom:10px"><label class="row" style="font-size:14px;gap:6px"><input type="checkbox" id="mw-hide" ${hide ? 'checked' : ''}> 뜻 가리기(외우기 모드)</label></div>
      <div class="mw-list ${hide ? 'hide-mean' : ''}">${words.map((w) => `<div class="card mw-item"><div class="row between" style="align-items:flex-start"><div><span class="zh mw-hz">${esc(w.hanzi)}</span> ${say(w.hanzi)}<div class="py">${esc(w.pinyin)}</div><div class="mw-mean"><b>${esc(w.meaning)}</b>${w.note ? `<div class="muted" style="font-size:13px;margin-top:4px">${esc(w.note)}</div>` : ''}</div></div><button class="btn small ghost" data-del="${w.id}" aria-label="지우기">✕</button></div>${w.source ? `<div class="muted mw-src zh">“${esc(w.source)}”</div>` : ''}</div>`).join('')}</div>`
        : '<div class="card empty" style="padding:30px">아직 저장한 표현이 없어요. <a href="#/decode">유행어 해독기</a>에서 본 중국어를 풀어 보고 저장해 보세요.</div>'}
    </div>`;
  }
  function draw() {
    app.innerHTML = list();
    app.querySelector('#mw-hide')?.addEventListener('change', (e) => { hide = e.target.checked; draw(); });
    app.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      await del(`/api/my/words/${b.dataset.del}`);
      words = words.filter((w) => String(w.id) !== b.dataset.del);
      draw();
    }));
    app.querySelector('#mw-quiz')?.addEventListener('click', () => {
      quiz = { list: makeQuiz(), i: 0, score: 0 };
      step();
    });
  }
  function makeQuiz() {
    return shuffle(words).slice(0, 10).map((w, i) => {
      const others = shuffle(words.filter((x) => x.id !== w.id)).slice(0, 3);
      const opts = shuffle([w, ...others]);
      return i % 2
        ? { q: '이 뜻에 맞는 표현은?', prompt: w.meaning, zh: false, opts: opts.map((o) => ({ label: o.hanzi, ok: o.id === w.id, zh: true })), say: w.hanzi }
        : { q: '이 표현의 뜻은?', prompt: w.hanzi, zh: true, opts: opts.map((o) => ({ label: o.meaning, ok: o.id === w.id })), say: w.hanzi };
    });
  }
  function step() {
    const { list, i, score } = quiz;
    if (i >= list.length) {
      app.innerHTML = `<div class="page"><div class="card" style="text-align:center;padding:36px 20px"><div class="fb-score">${score}<small class="muted" style="font-size:20px"> / ${list.length}</small></div>
        <h2>${score === list.length ? '모두 맞혔어요! 🎉' : '수고했어요!'}</h2><div class="row" style="justify-content:center"><button class="btn" id="mw-again">다시 풀기</button><button class="btn primary" id="mw-back">단어장으로</button></div></div></div>`;
      app.querySelector('#mw-again').onclick = () => { quiz = { list: makeQuiz(), i: 0, score: 0 }; step(); };
      app.querySelector('#mw-back').onclick = draw;
      return;
    }
    const it = list[i];
    app.innerHTML = `<div class="page"><div class="q3-top"><span class="muted">${i + 1} / ${list.length}</span><span class="badge accent">맞힘 ${score}</span></div>
      <div class="q3-wrap"><div class="q3-card"><div class="q3-kicker">${esc(it.q)}</div><div class="q3-prompt ${it.zh ? 'zh' : ''}">${esc(it.prompt)}</div><button class="q3-speak" id="q-say">🔊 듣기</button></div></div>
      <div class="q3-choices">${it.opts.map((o, k) => `<button class="q3-choice ${o.zh ? 'zh' : ''}" data-k="${k}">${esc(o.label)}</button>`).join('')}</div>
      <div id="q-next" class="q3-feedback" hidden></div></div>`;
    app.querySelector('#q-say').onclick = () => speak(it.say);
    app.querySelectorAll('.q3-choice').forEach((b) => (b.onclick = () => {
      const ok = it.opts[Number(b.dataset.k)].ok;
      app.querySelectorAll('.q3-choice').forEach((c, j) => { c.disabled = true; if (it.opts[j].ok) c.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      else quiz.score++;
      const nx = app.querySelector('#q-next');
      nx.hidden = false;
      nx.innerHTML = `<div class="q3-msg ${ok ? 'good' : 'bad'}"><b>${ok ? '정답이에요! 👏' : '아쉬워요'}</b>${ok ? '' : `<span>정답: ${esc(it.opts.find((o) => o.ok).label)}</span>`}</div><button class="btn primary big" id="q3-next">${i + 1 < list.length ? '다음 문제 →' : '결과 보기 →'}</button>`;
      nx.querySelector('#q3-next').onclick = () => { quiz.i++; step(); };
    }));
  }
  draw();
}
