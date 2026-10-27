// 사용자 대시보드, 15주 과정, 내 작문
import { esc, get, post, fmtDate, ago, toast } from './core.js';
import { feedbackHtml } from './fb.js';

export const TRACKS = {
  listen: { name: '듣기 수업', tab: 'listen', icon: '🎧', desc: '문장을 듣고 단어 카드를 올바른 순서로 배열합니다. 글자 없이 귀로 익힙니다.' },
  writing: { name: '쓰기 수업', tab: 'writing', icon: '✍️', desc: '문장의 빈칸을 순서대로 채우고, 직접 쓴 문장을 AI 선생님께 첨삭받습니다.' },
  speak: { name: '말하기 수업', tab: 'speak', icon: '🗣️', desc: '뜻을 보고 문장을 떠올려, 섞인 단어 카드를 순서대로 맞힙니다.' },
};

export function weekCards(weeks, currentGid, { link = true, tab = '' } = {}) {
  return `<div class="week-grid">${weeks
    .map(
      (w) => `<${link ? `a href="#/week/${w.gid}${tab ? `/${tab}` : ''}"` : 'div'} class="week-card ${w.done ? 'done' : ''} ${w.gid === currentGid ? 'current' : ''}">
      <div class="wn">${w.week}주차 · HSK ${w.hsk}</div><div class="wt">${esc(w.title)}</div><div class="wz zh">${esc(w.titleZh)}</div>
      <div class="steps3" title="단어 · 퀴즈 · 작문"><span class="${w.words >= 15 ? 'on' : ''}"></span><span class="${w.quiz !== null && w.quiz >= 8 ? 'on' : ''}"></span><span class="${w.writing ? 'on' : ''}"></span></div>
      <div class="muted" style="font-size:12px;margin-top:6px">단어 ${w.words}/15 · 퀴즈 ${w.quiz ?? '–'}/10 · 작문 ${w.writing ? '✓' : '–'}</div>
    </${link ? 'a' : 'div'}>`,
    )
    .join('')}</div>`;
}

export function heatmap(days) {
  const set = new Set(days || []);
  const cells = [];
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const k = d.toISOString().slice(0, 10);
    cells.push(`<i class="${set.has(k) ? 'on' : ''}" title="${k}${set.has(k) ? ' 학습함' : ''}"></i>`);
  }
  return `<div class="heat">${cells.join('')}</div><div class="row between muted" style="font-size:11px;margin-top:4px"><span>4주 전</span><span>오늘</span></div>`;
}

export function calendar(days) {
  const set = new Set(days || []);
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const today = kst.toISOString().slice(0, 10);
  const first = new Date(Date.UTC(y, m, 1));
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < first.getUTCDay(); i++) cells.push('<span></span>');
  for (let day = 1; day <= count; day++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cls = [set.has(k) ? 'on' : '', k === today ? 'today' : ''].join(' ');
    cells.push(`<span class="${cls}" title="${k}${set.has(k) ? ' · 출석' : ''}">${day}${set.has(k) ? '<i>✓</i>' : ''}</span>`);
  }
  const week = ['일', '월', '화', '수', '목', '금', '토'].map((w) => `<span class="dow">${w}</span>`).join('');
  const done = [...set].filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length;
  return `<div class="row between" style="margin-bottom:8px"><b>${y}년 ${m + 1}월</b><span class="muted" style="font-size:13px">이번 달 출석 ${done}일</span></div>
    <div class="cal">${week}${cells.join('')}</div>`;
}

export async function renderTrack(app, key) {
  const t = TRACKS[key];
  if (!t) {
    app.innerHTML = '<div class="page"><div class="empty">없는 수업입니다. <a href="#/home">처음으로</a></div></div>';
    return;
  }
  const d = await get('/api/dashboard');
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><a href="#/home" class="muted" style="text-decoration:none">← 홈</a><h1 style="margin-top:6px">${t.icon} ${t.name}</h1><p>${t.desc}</p></div></div>
    <div class="card"><div class="card-head"><h2>15주 중 고르기</h2><span class="muted" style="font-size:13px">주차를 누르면 ${t.name} 화면으로 이동합니다</span></div>${weekCards(d.weeks, d.current.gid, { tab: t.tab })}</div>
  </div>`;
}

// 과목(여행·HSK·사회자) 고르기 카드
export function coursePicker(courses, current) {
  return `<div class="section-title">과목 고르기</div>
    <div class="grid3 course-pick">${courses
      .map((c) => `<a class="card course-card ${c.key === current ? 'on' : ''} ${c.ready ? '' : 'soon'}" href="#/home/${c.key}"><span class="course-level">${esc(c.level)}</span><h3>${esc(c.name)}</h3><span class="muted" style="font-size:13px">${c.ready ? `${c.weeks}주 과정` : '준비 중'}</span></a>`)
      .join('')}</div>`;
}

export async function renderHome(app, ctx = {}) {
  const course = ctx.course || 'travel';
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get(`/api/dashboard?course=${encodeURIComponent(course)}`);
  if (d.notReady) {
    app.innerHTML = `<div class="page">${coursePicker(d.courses, d.course.key)}
      <div class="card" style="text-align:center;padding:40px 20px"><h2>${esc(d.course.name)} · 준비 중</h2><p class="muted">이 과목의 자료를 만들고 있어요. 준비되면 여기에서 바로 시작할 수 있습니다.</p></div></div>`;
    return;
  }
  const s = d.summary;
  const tw = d.todayWord;
  app.innerHTML = `
  <div class="page">
    ${coursePicker(d.courses, d.course.key)}
    <div class="page-head"><div><h1>${esc(d.user.name)}님, 加油！</h1><p>${s.attendedToday ? '오늘 출석했어요. 잘하고 있어요!' : '오늘 아직 출석 전이에요. 출석체크를 하고 시작해 볼까요?'}</p></div>
      <a class="btn primary big" href="#/week/${d.current.gid}">${d.current.week}주차 ${esc(d.current.title)} 이어 하기 →</a></div>
    <div class="card attend-card">
      <div><div class="ai-label">오늘의 출석</div><b style="font-size:18px">${s.attendedToday ? '✓ 출석 완료' : '아직 출석체크 전'}</b><div class="muted" style="font-size:13px">출석은 달력에 표시되고 연속 학습일에 더해집니다.</div></div>
      <button class="btn ${s.attendedToday ? '' : 'primary'}" id="attend-btn" ${s.attendedToday ? 'disabled' : ''}>${s.attendedToday ? '출석 완료' : '출석체크 하기'}</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="label">완료한 주차</div><div class="value">${s.doneWeeks}<small class="muted" style="font-size:16px"> / ${s.totalWeeks}</small></div><div class="progress" style="margin-top:6px"><div style="width:${(s.doneWeeks / s.totalWeeks) * 100}%"></div></div></div>
      <div class="stat"><div class="label">외운 단어</div><div class="value">${s.wordsLearned}<small class="muted" style="font-size:16px"> / ${s.totalWords}</small></div><div class="progress" style="margin-top:6px"><div style="width:${(s.wordsLearned / s.totalWords) * 100}%"></div></div></div>
      <div class="stat"><div class="label">연속 학습일</div><div class="value">${s.streak}<small class="muted" style="font-size:16px">일</small></div><div class="sub">지금까지 ${s.totalDays}일 공부</div></div>
      <div class="stat"><div class="label">퀴즈 평균 · 작문</div><div class="value">${s.quizAvg ?? '–'}<small class="muted" style="font-size:16px">점</small></div><div class="sub">AI 첨삭 ${s.writings}회</div></div>
    </div>
    <div class="section-title">수업 고르기</div>
    <div class="grid3">
      ${Object.entries(TRACKS)
        .map(([k, t]) => `<a class="card track-card" href="#/track/${k}"><div class="track-icon">${t.icon}</div><h3>${t.name}</h3><p class="muted" style="font-size:14px">${t.desc}</p><span class="track-go">15주 보기 →</span></a>`)
        .join('')}
    </div>
    <div class="grid2" style="gap:16px">
      <div class="card today-word"><div class="ai-label">오늘의 단어 · ${d.current.week}주차</div>
        <div class="row" style="align-items:flex-end"><span class="hz zh">${esc(tw.hanzi)}</span><button class="speak" data-speak="${esc(tw.hanzi)}" aria-label="발음 듣기">🔊</button></div>
        <div class="py" style="font-size:18px">${esc(tw.pinyin)}</div><div>${esc(tw.meaning)}</div></div>
      <div class="card"><h3>출석 달력</h3>${calendar(s.days)}</div>
    </div>
    <div class="card"><div class="card-head"><h2>15주 진도</h2><span class="muted" style="font-size:13px">막대 3칸 = 단어 · 퀴즈 · 작문</span></div>${weekCards(d.weeks, d.current.gid)}</div>
    <div class="card"><div class="card-head"><h3>최근 작문</h3><a href="#/writings">전체 보기 →</a></div>
      ${d.recentWritings.map((w) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span><span class="badge">${w.week}주차</span> <span class="zh">${esc(w.preview)}</span></span><span><b>${w.score ?? '–'}</b>점 <small class="muted">${ago(w.created_at)}</small></span></div>`).join('') || '<div class="empty" style="padding:16px">아직 작문이 없어요. 주차마다 작문 미션이 있어요.</div>'}
    </div>
  </div>`;
  const attend = app.querySelector('#attend-btn');
  if (attend)
    attend.onclick = async () => {
      attend.disabled = true;
      try {
        await post('/api/attendance', {});
        toast('출석체크 완료! 오늘도 화이팅 🎉');
        renderHome(app);
      } catch (e) {
        attend.disabled = false;
        toast(e.message, 'bad');
      }
    };
}

export async function renderCourse(app) {
  const d = await get('/api/dashboard');
  app.innerHTML = `<div class="page"><div class="page-head"><div><h1>15주 과정</h1><p>HSK 1급(1~6주) → 2급(7~12주) → 3급 맛보기(13~15주). 순서대로 공부하길 권하지만 어느 주차든 열어 볼 수 있어요.</p></div></div>
    ${weekCards(d.weeks, d.current.gid)}</div>`;
}

export async function renderMyWritings(app) {
  const d = await get('/api/writings');
  app.innerHTML = `<div class="page"><div class="page-head"><div><h1>내 작문</h1><p>AI 선생님의 첨삭 기록입니다. 🔊를 누르면 고친 문장을 들을 수 있어요.</p></div></div>
    ${d.writings.map((w) => feedbackHtml(w)).join('') || '<div class="empty">아직 작문이 없습니다. <a href="#/home">학습하러 가기</a></div>'}</div>`;
}

export { fmtDate };
