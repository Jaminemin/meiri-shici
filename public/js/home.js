// 사용자 대시보드, 15주 과정, 내 작문
import { esc, get, fmtDate, ago } from './core.js';
import { feedbackHtml } from './fb.js';

export function weekCards(weeks, currentWeek, { link = true } = {}) {
  return `<div class="week-grid">${weeks
    .map(
      (w) => `<${link ? `a href="#/week/${w.week}"` : 'div'} class="week-card ${w.done ? 'done' : ''} ${w.week === currentWeek ? 'current' : ''}">
      <div class="wn">${w.week}주차 · HSK ${w.hsk}</div><div class="wt">${esc(w.title)}</div><div class="wz zh">${esc(w.titleZh)}</div>
      <div class="steps3" title="단어 · 퀴즈 · 작문"><span class="${w.words >= 10 ? 'on' : ''}"></span><span class="${w.quiz !== null && w.quiz >= 8 ? 'on' : ''}"></span><span class="${w.writing ? 'on' : ''}"></span></div>
      <div class="muted" style="font-size:12px;margin-top:6px">단어 ${w.words}/10 · 퀴즈 ${w.quiz ?? '–'}/10 · 작문 ${w.writing ? '✓' : '–'}</div>
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

export async function renderHome(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const d = await get('/api/dashboard');
  const s = d.summary;
  const tw = d.todayWord;
  app.innerHTML = `
  <div class="page">
    <div class="page-head"><div><h1>${esc(d.user.name)}님, 加油！</h1><p>${s.studiedToday ? '오늘도 공부했어요. 잘하고 있어요!' : '오늘 아직 공부하지 않았어요. 단어 몇 개만 봐도 좋아요.'}</p></div>
      <a class="btn primary big" href="#/week/${d.current.week}">${d.current.week}주차 ${esc(d.current.title)} 이어 하기 →</a></div>
    <div class="stats">
      <div class="stat"><div class="label">완료한 주차</div><div class="value">${s.doneWeeks}<small class="muted" style="font-size:16px"> / ${s.totalWeeks}</small></div><div class="progress" style="margin-top:6px"><div style="width:${(s.doneWeeks / s.totalWeeks) * 100}%"></div></div></div>
      <div class="stat"><div class="label">외운 단어</div><div class="value">${s.wordsLearned}<small class="muted" style="font-size:16px"> / ${s.totalWords}</small></div><div class="progress" style="margin-top:6px"><div style="width:${(s.wordsLearned / s.totalWords) * 100}%"></div></div></div>
      <div class="stat"><div class="label">연속 학습일</div><div class="value">${s.streak}<small class="muted" style="font-size:16px">일</small></div><div class="sub">지금까지 ${s.totalDays}일 공부</div></div>
      <div class="stat"><div class="label">퀴즈 평균 · 작문</div><div class="value">${s.quizAvg ?? '–'}<small class="muted" style="font-size:16px">점</small></div><div class="sub">AI 첨삭 ${s.writings}회</div></div>
    </div>
    <div class="grid2" style="gap:16px">
      <div class="card today-word"><div class="ai-label">오늘의 단어 · ${d.current.week}주차</div>
        <div class="row" style="align-items:flex-end"><span class="hz zh">${esc(tw.hanzi)}</span><button class="speak" data-speak="${esc(tw.hanzi)}" aria-label="발음 듣기">🔊</button></div>
        <div class="py" style="font-size:18px">${esc(tw.pinyin)}</div><div>${esc(tw.meaning)}</div></div>
      <div class="card"><h3>최근 4주 학습 기록</h3>${heatmap(s.days)}</div>
    </div>
    <div class="card"><div class="card-head"><h2>15주 진도</h2><span class="muted" style="font-size:13px">막대 3칸 = 단어 · 퀴즈 · 작문</span></div>${weekCards(d.weeks, d.current.week)}</div>
    <div class="card"><div class="card-head"><h3>최근 작문</h3><a href="#/writings">전체 보기 →</a></div>
      ${d.recentWritings.map((w) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span><span class="badge">${w.week}주차</span> <span class="zh">${esc(w.preview)}</span></span><span><b>${w.score ?? '–'}</b>점 <small class="muted">${ago(w.created_at)}</small></span></div>`).join('') || '<div class="empty" style="padding:16px">아직 작문이 없어요. 주차마다 작문 미션이 있어요.</div>'}
    </div>
  </div>`;
}

export async function renderCourse(app) {
  const d = await get('/api/dashboard');
  app.innerHTML = `<div class="page"><div class="page-head"><div><h1>15주 과정</h1><p>HSK 1급(1~6주) → 2급(7~12주) → 3급 맛보기(13~15주). 순서대로 공부하길 권하지만 어느 주차든 열어 볼 수 있어요.</p></div></div>
    ${weekCards(d.weeks, d.current.week)}</div>`;
}

export async function renderMyWritings(app) {
  const d = await get('/api/writings');
  app.innerHTML = `<div class="page"><div class="page-head"><div><h1>내 작문</h1><p>AI 선생님의 첨삭 기록입니다. 🔊를 누르면 고친 문장을 들을 수 있어요.</p></div></div>
    ${d.writings.map((w) => feedbackHtml(w)).join('') || '<div class="empty">아직 작문이 없습니다. <a href="#/home">학습하러 가기</a></div>'}</div>`;
}

export { fmtDate };
