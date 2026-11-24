// AI 실습: 허브 · ① AI 댓글 연습 · ② 유행어 해독기 · 내 단어장(퀴즈)
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
      <a class="card lab-card" href="#/comments"><span class="lab-ico">💬</span><h3>AI 댓글 연습</h3><p class="muted">숏폼 게시물에 중국어로 댓글을 달면, AI가 중국 네티즌이 되어 답글을 달고 자연스러운 말투로 고쳐 줘요.</p><span class="track-go">댓글 달기 →</span></a>
      <a class="card lab-card" href="#/decode"><span class="lab-ico">🔍</span><h3>유행어 해독기</h3><p class="muted">도우인·샤오훙슈에서 본 댓글·자막을 붙여 넣으면 진짜 뜻과 말투를 풀어 줘요.</p><span class="track-go">해독하기 →</span></a>
      <a class="card lab-card" href="#/mywords"><span class="lab-ico">📒</span><h3>내 단어장 <span class="badge accent">${d.wordCount}개</span></h3><p class="muted">해독기에서 저장한 표현을 모아 보고, 나만의 퀴즈로 외워요.</p><span class="track-go">단어장 보기 →</span></a>
      <a class="card lab-card" href="#/talk"><span class="lab-ico">🤖</span><h3>AI 회화</h3><p class="muted">주차별 상황에서 AI가 중국인 역할을 맡아 대화해요.</p><span class="track-go">대화하기 →</span></a>
    </div>
    ${d.posts.length ? `<div class="section-title">댓글 연습 기록</div><div class="card">${d.posts.map((p) => `<a class="row between talk-past" href="#/comments/${p.id}"><span class="zh">${p.week ? `<span class="badge">${p.week}주차</span> ` : ''}${esc(p.preview)}</span><span class="muted" style="font-size:13px">댓글 ${p.n} · ${ago(p.created_at)}</span></a>`).join('')}</div>` : ''}
    ${d.decodes.length ? `<div class="section-title">최근 해독</div><div class="card">${d.decodes.map((x) => `<a class="row between talk-past" href="#/decode/${x.id}"><span class="zh">${esc(x.preview)}</span><span class="muted" style="font-size:13px">${esc(x.summary || '')} · ${ago(x.created_at)}</span></a>`).join('')}</div>` : ''}
  </div>`;
}

// ---------------- ① AI 댓글 연습 ----------------
// 학생이 숏폼 게시물에 중국어 댓글을 달면, AI가 중국 네티즌 역할로 답글을 달고 선생님으로서 고쳐 준다.
const AI_NOTE = '실제 사람이 아니라 AI가 중국 네티즌 역할을 하는 연습이에요.';

export async function renderComments(app) {
  loading(app);
  const d = await get('/api/lab');
  let week = '';
  try { week = sessionStorage.getItem('ms_cm_week') || ''; } catch { /* 무시 */ }
  if (!week && d.practice.length) week = String(d.practice[0].week);
  let mode = 'week';
  function draw() {
    const pp = d.practice.find((x) => String(x.week) === String(week));
    app.innerHTML = `<div class="page">
      <div class="page-head"><div>${back()}<h1 style="margin-top:6px">💬 AI 댓글 연습</h1><p>중국 숏폼에 댓글을 단다고 생각하고 중국어로 써 보세요. <b>AI가 중국 네티즌이 되어 답글을 달고</b>, 내 댓글을 중국 사람들이 실제로 쓰는 말투로 고쳐 줘요.</p><p class="muted" style="font-size:13px;margin-top:4px">ⓘ ${AI_NOTE}</p></div></div>
      <div class="card">
        <div class="cm-modes"><button class="tag ${mode === 'week' ? 'on' : ''}" data-mode="week">주차 연습 게시물</button><button class="tag ${mode === 'custom' ? 'on' : ''}" data-mode="custom">내가 본 영상·게시물</button></div>
        ${mode === 'week' ? `<label class="vlabel" style="margin-top:10px">주차 <select id="cm-week">${d.practice.map((w) => `<option value="${w.week}" ${String(w.week) === String(week) ? 'selected' : ''}>${w.week}주차 · ${esc(w.title)}</option>`).join('')}</select></label>
          ${pp ? `<div class="cm-postcard ${pp.video ? 'has-video' : ''}">${pp.video ? `<div class="dy-thumb ${pp.video.kind === 'image' ? 'img' : ''}"><img src="${esc(pp.video.poster)}" alt="" loading="lazy">${pp.video.kind === 'image' ? '' : '<span class="dy-thumb-play">▶</span>'}</div>` : ''}<div style="min-width:0"><div class="cm-post-tag">${pp.video ? (pp.video.kind === 'image' ? '연습용 숏폼 게시물' : '연습용 숏폼 영상') : '연습용 게시물'}</div><div class="zh cm-post-zh">${esc(pp.zh)} ${say(pp.zh)}</div><div class="muted" style="font-size:14px">${esc(pp.ko)}</div></div></div>` : ''}`
        : `<label class="vlabel" style="margin-top:10px">어떤 영상·게시물에 댓글을 달까요?
            <textarea id="cm-custom" rows="3" maxlength="300" placeholder="예: 상하이 와이탄 야경을 찍은 브이로그. 캡션: 外滩的夜景太美了！ (한국어로 써도 돼요)"></textarea></label>`}
        <div class="row end" style="margin-top:12px"><button class="btn primary" id="cm-go">💬 댓글 연습 시작</button></div>
      </div>
      ${d.posts.length ? `<div class="section-title">이어서 연습하기</div><div class="card">${d.posts.map((p) => `<a class="row between talk-past" href="#/comments/${p.id}"><span class="zh">${p.week ? `<span class="badge">${p.week}주차</span> ` : ''}${esc(p.preview)}</span><span class="muted" style="font-size:13px">댓글 ${p.n} · ${ago(p.created_at)}</span></a>`).join('')}</div>` : ''}
    </div>`;
    app.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; draw(); }));
    app.querySelector('#cm-week')?.addEventListener('change', (e) => {
      week = e.target.value;
      try { sessionStorage.setItem('ms_cm_week', week); } catch { /* 무시 */ }
      draw();
    });
    app.querySelector('#cm-go').onclick = async (e) => {
      const b = e.currentTarget;
      const custom = app.querySelector('#cm-custom')?.value.trim() || '';
      if (mode === 'custom' && custom.length < 4) return toast('영상·게시물 내용을 조금 더 써 주세요.', 'bad');
      b.disabled = true;
      try {
        const r = await post('/api/comments', mode === 'week' ? { week } : { custom, week: null });
        location.hash = `#/comments/${r.id}`;
      } catch (err) { b.disabled = false; toast(err.message, 'bad'); }
    };
  }
  draw();
}

// 내 댓글 → 교정 → AI网友 답글
function myCommentHtml(c) {
  const v = VERDICT[c.eval?.verdict] || VERDICT.fix;
  const changed = c.eval?.corrected && c.eval.corrected !== c.text;
  return `<div class="cm-item">
    <div class="cm-head"><span class="cm-ava me">나</span><div style="flex:1;min-width:0"><div class="cm-nick">내 댓글</div><div class="zh cm-text">${esc(c.text)}</div></div></div>
    <div class="cm-eval">
      <div class="row between"><b>${v[0]} ${v[1]}</b><span class="badge accent">${c.eval?.score ?? '–'}점</span></div>
      ${changed ? `<div class="cm-fix"><span class="muted" style="font-size:12px">이렇게 고치면 자연스러워요</span><div class="zh" style="font-size:17px">${esc(c.eval.corrected)} ${say(c.eval.corrected)}</div><div class="py cm-sub">${esc(c.eval.correctedPy || '')}</div><div class="muted cm-sub" style="font-size:14px">${esc(c.eval.translation || '')}</div></div>` : ''}
      <p style="margin:6px 0 0;font-size:14px">${esc(c.eval?.comment || '')}</p>
      ${(c.eval?.natives || []).length ? `<div class="cm-better"><span class="muted" style="font-size:12px">중국 네티즌이라면 이렇게도 써요</span>${c.eval.natives.map((b) => `<div><span class="zh">${esc(b.zh)}</span> ${say(b.zh)} <span class="py cm-sub">${esc(b.py)}</span> <span class="muted cm-sub">· ${esc(b.ko)}</span></div>`).join('')}</div>` : ''}
    </div>
    ${c.reply?.text ? `<div class="cm-reply"><div class="cm-head"><span class="cm-ava ai">AI</span><div style="flex:1;min-width:0"><div class="cm-nick">AI网友 <span class="badge">AI 답글</span></div><div class="zh cm-text">${esc(c.reply.text)} ${say(c.reply.text)}</div><div class="py cm-sub">${esc(c.reply.py)}</div><div class="muted cm-sub" style="font-size:14px">${esc(c.reply.ko)}</div></div></div></div>` : ''}
  </div>`;
}

// 이전 형식(AI가 먼저 댓글을 달던 기록)은 읽기 전용으로 보여 준다
function legacyHtml(c) {
  return `<div class="cm-item"><div class="cm-head"><span class="cm-ava ai">AI</span><div style="flex:1;min-width:0"><div class="cm-nick">${esc(c.nick || 'AI网友')}</div><div class="zh cm-text">${esc(c.text)}</div><div class="py cm-sub">${esc(c.py || '')}</div><div class="muted cm-sub" style="font-size:14px">${esc(c.ko || '')}</div></div></div>
    ${(c.replies || []).map((r) => myCommentHtml({ text: r.text, eval: { ...r.eval, natives: r.eval?.better }, reply: r.follow })).join('')}</div>`;
}

export async function renderCommentPost(app, id) {
  loading(app);
  const d = await get(`/api/comments/${id}`);
  const P = d.post;
  const V = d.video;
  let pyOn = true;
  let koOn = true;
  let draft = '';
  function draw() {
    const items = P.comments || [];
    const mine = items.filter((c) => c.mine).length;
    const legacy = items.some((c) => !c.mine);
    const comments = `
      ${V ? `<div class="dy-comments-head"><b>评论区</b> <span class="muted">댓글 ${items.filter((c) => c.mine).length * 2}</span></div>` : ''}
      ${V && !items.length ? '<div class="dy-empty"><div class="dy-empty-ico">💬</div><b>아직 댓글이 없어요</b><span>영상을 보고 중국어로 첫 댓글을 남겨 보세요.<br>AI网友가 답글을 달고 내 댓글을 고쳐 줘요.</span></div>' : ''}
      ${items.length ? `<div class="cm-tools"><span class="muted" style="font-size:13px">보기</span><button class="tag ${pyOn ? 'on' : ''}" data-t="py">병음</button><button class="tag ${koOn ? 'on' : ''}" data-t="ko">한국어 뜻</button><span class="spacer"></span><button class="btn small danger" id="cm-del">연습 지우기</button></div>
      <div class="card cm-list ${pyOn ? '' : 'hide-py'} ${koOn ? '' : 'hide-ko'}">${items.map((c) => (c.mine ? myCommentHtml(c) : legacyHtml(c))).join('')}</div>` : ''}
      ${legacy ? '' : mine < d.max ? `<div class="card cm-write">
        <div class="ai-label">${items.length ? '이어서 댓글 달기' : '이 게시물에 중국어로 댓글을 달아 보세요'}</div>
        <div class="cm-form" style="margin:8px 0 0"><input class="zh" id="cm-in" maxlength="200" placeholder="${items.length ? 'AI网友의 답글에 다시 답해 보세요…' : '예: 看起来好好吃！在哪里？'}" value="${esc(draft)}"><button class="btn primary" id="cm-send">댓글 달기</button></div>
        <p class="muted" style="font-size:12px;margin:6px 0 0">${mine}/${d.max}번 · 한국어로 써도 중국어로 바꿔 알려 줘요<br>ⓘ ${AI_NOTE}</p></div>`
        : `<p class="muted" style="text-align:center">이 게시물에서는 ${d.max}번 모두 연습했어요. <a href="#/comments">새 게시물로 연습하기</a></p>`}
`;
    app.innerHTML = `<div class="page cm-page">
      ${V ? `<div class="dy-wrap ${V.kind === 'image' ? 'img' : ''} ${items.length ? 'has-cm' : ''}"><div class="dy-player">
          ${V.kind === 'image'
            ? `<img class="dy-img-main" src="${esc(V.src)}" alt="${esc(P.week)}주차 게시물 그림"><span class="dy-badge">图文</span>`
            : `<video id="dy-video" playsinline loop preload="metadata" poster="${esc(V.poster)}"><source src="${esc(V.src)}" type="video/mp4"></video>
          <button class="dy-big-play" id="dy-play" aria-label="재생">▶</button>`}
        </div>
        <div class="dy-right"><div class="dy-under"><div class="cm-post-tag">${P.week}주차 · ${V.kind === 'image' ? '연습용 숏폼 게시물' : '연습용 숏폼 영상'}</div><div class="dy-author"><span class="dy-ava">短</span><b>@${esc(V.author)}</b><span class="dy-hint">${say(V.caption)}<span class="muted">캡션 듣기 · ${V.kind === 'image' ? '게시물을' : '영상을'} 보고 아래 评论区에 댓글을 달아 보세요</span></span></div><div class="zh cm-post-zh">${esc(V.caption)}</div><div class="py cm-sub" style="font-size:13px;margin-top:6px">${esc(V.captionPy || '')}</div><div class="muted" style="font-size:14px">${esc(V.captionKo || P.reaction || '')}</div></div><div class="dy-cm">${comments}</div></div></div>`
      : `<div class="card cm-postcard"><div class="cm-post-tag">${P.week ? `${P.week}주차 · ` : ''}${P.reaction ? '연습용 게시물' : '내가 본 영상·게시물'}</div><div class="zh cm-post-zh" style="white-space:pre-wrap">${esc(P.content)} ${P.reaction ? say(P.content) : ''}</div>${P.reaction ? `<div class="muted" style="font-size:14px">${esc(P.reaction)}</div>` : ''}</div>`}
      ${V ? '' : comments}
    </div>`;
    const vid = app.querySelector('#dy-video');
    const big = app.querySelector('#dy-play');
    if (vid && big) {
      const sync = () => big.classList.toggle('hide', !vid.paused);
      big.onclick = () => vid.play().catch(() => toast('영상을 재생하지 못했어요.', 'bad'));
      vid.onclick = () => (vid.paused ? vid.play() : vid.pause());
      vid.onplay = sync;
      vid.onpause = sync;
    }
    app.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => {
      if (b.dataset.t === 'py') pyOn = !pyOn;
      else koOn = !koOn;
      draw();
    }));
    app.querySelector('#cm-del')?.addEventListener('click', async () => {
      if (!(await confirmBox('이 연습 기록을 지울까요?'))) return;
      await del(`/api/comments/${P.id}`);
      location.hash = '#/comments';
    });
    const inp = app.querySelector('#cm-in');
    const send = app.querySelector('#cm-send');
    if (!inp) return;
    inp.oninput = () => (draft = inp.value);
    inp.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) send.click(); };
    send.onclick = async () => {
      const text = inp.value.trim();
      if (!text) return toast('댓글을 써 주세요.', 'bad');
      send.disabled = true;
      inp.disabled = true;
      send.textContent = 'AI网友가 읽는 중…';
      try {
        const r = await post(`/api/comments/${P.id}/comment`, { text });
        P.comments = [...(P.comments || []), r.item];
        draft = '';
        draw();
        const all = app.querySelectorAll('.cm-item');
        all[all.length - 1]?.scrollIntoView({ block: 'start' });
        if (r.quota) toast(quotaText(r.quota));
      } catch (err) {
        send.disabled = false;
        inp.disabled = false;
        send.textContent = '댓글 달기';
        toast(err.message, 'bad');
      }
    };
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
  let qn = 10;
  const qOpts = () => { const o = [5, 10, 15, 20, 30].filter((n) => n <= words.length); return o.length ? o : [Math.max(words.length, 1)]; };
  const curQn = () => { const o = qOpts(); return o.includes(qn) ? qn : o.includes(10) ? 10 : o[o.length - 1]; };

  function list() {
    return `<div class="page">
      <div class="page-head"><div>${back()}<h1 style="margin-top:6px">📒 내 단어장 <span class="badge accent">${words.length}개</span></h1><p>유행어 해독기에서 저장한 표현이에요. 4개 이상 모이면 나만의 퀴즈를 풀 수 있어요.</p></div>
        <div class="row" style="gap:6px"><a class="btn" href="#/decode">🔍 더 찾아보기</a><label class="row" style="gap:4px;font-size:13px">문제 수 <select id="mw-qn" aria-label="퀴즈 문제 수">${qOpts().map((n) => `<option value="${n}" ${n === curQn() ? 'selected' : ''}>${n}문제</option>`).join('')}</select></label><button class="btn primary" id="mw-quiz" ${words.length < 4 ? 'disabled title="4개 이상 모이면 열려요"' : ''}>📝 퀴즈 풀기</button></div></div>
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
    app.querySelector('#mw-qn')?.addEventListener('change', (e) => { qn = Number(e.target.value); });
    app.querySelector('#mw-quiz')?.addEventListener('click', () => {
      qn = curQn();
      quiz = { list: makeQuiz(), i: 0, score: 0 };
      step();
    });
  }
  function makeQuiz() {
    return shuffle(words).slice(0, qn).map((w, i) => {
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
