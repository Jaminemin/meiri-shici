// 대문 페이지와 승인 대기 화면
import { state, esc, get } from './core.js';

export async function renderLanding(app) {
  const me = state.me;
  const u = me.user;
  let weeks = [];
  try {
    weeks = (await get('/api/curriculum')).weeks;
  } catch {
    /* 목차를 못 불러와도 대문은 보여 준다 */
  }
  const cta = u
    ? `<a class="btn primary big" href="#/${u.status !== 'approved' ? 'pending' : u.role === 'admin' ? 'admin' : 'home'}">${u.status !== 'approved' ? '승인 상태 보기' : '학습 이어 하기'} →</a>`
    : me.googleReady
      ? `<a class="btn primary big" href="/auth/google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg> 구글 계정으로 시작하기</a>`
      : '<span class="btn big" aria-disabled="true" style="opacity:.6">구글 로그인 준비 중</span>';
  app.innerHTML = `
  <div class="page">
    <section class="hero" style="grid-template-columns:1.2fr 1fr">
      <div>
        <span class="badge accent">HSK 1~3급 · 15주 완성</span>
        <div class="hero-zh zh" style="margin:16px 0 8px">每日十词</div>
        <h1 style="font-size:28px">하루 열 단어, 15주면 중국어로 말문이 트입니다</h1>
        <p class="hook">HSK 막막했나요? 수업하면서 같이 배워봐요.</p>
        <p class="lead">한 주에 단어 10개와 핵심 문형 하나. 단어를 외우고, 퀴즈로 확인하고, 직접 쓴 중국어 문장을 AI 선생님이 바로 고쳐 줍니다.</p>
        <div class="skill-pick">
          ${[
            ['listen', '듣기', '听', '🎧', 'listen'],
            ['writing', '쓰기', '写', '✍️', 'writing'],
            ['grammar', '말하기', '说', '🗣️', 'grammar'],
          ]
            .map(([key, ko, zh, icon]) => `<a class="skill-card" href="${u ? `#/track/${key}` : '#/preview'}"><span class="skill-icon">${icon}</span><span class="skill-zh zh">${zh}</span><span class="skill-ko">${ko}</span></a>`)
            .join('')}
        </div>
        <div class="cta">${cta}${!u ? '<a class="btn big" href="#/preview">로그인 없이 1주차 둘러보기</a>' : ''}</div>
        ${!u ? '<p class="muted" style="margin-top:12px;font-size:13px">처음 가입하면 관리자가 승인한 뒤부터 학습할 수 있습니다.</p>' : ''}
      </div>
      <div class="hero-visual" style="text-align:center">
        <div class="seal" style="margin-bottom:10px">每日<br>十词</div>
        <div class="zh" style="font-size:52px;font-weight:700">认识你很高兴</div>
        <div class="py" style="font-size:16px">Rènshi nǐ hěn gāoxìng.</div>
        <div class="muted">만나서 반가워요.</div>
      </div>
    </section>

    <div class="section-title">학습 방법</div>
    <h2>한 주는 이렇게 공부해요</h2>
    <div class="steps">
      <div class="step"><h3>단어 10개</h3><p>한자·병음·뜻을 보고 🔊로 발음을 들은 뒤 외운 단어에 표시합니다.</p></div>
      <div class="step"><h3>문형과 예문</h3><p>그 주의 핵심 문형 하나와 실제로 쓰는 예문을 익힙니다.</p></div>
      <div class="step"><h3>퀴즈 10문제</h3><p>뜻·한자·병음을 고르는 퀴즈에서 8개 이상 맞히면 통과입니다.</p></div>
      <div class="step"><h3>작문 미션 + AI 첨삭</h3><p>배운 표현으로 문장을 쓰면 AI 선생님이 고친 문장과 이유를 알려 줍니다.</p></div>
    </div>

    <div class="section-title">15주 과정</div>
    <h2>무엇을 배우나요</h2>
    <div class="week-grid">${weeks
      .map((w) => `<div class="week-card"><div class="wn">${w.week}주차 · HSK ${w.hsk}</div><div class="wt">${esc(w.title)}</div><div class="wz zh">${esc(w.titleZh)}</div><div class="muted" style="font-size:12px;margin-top:6px">${esc(w.goal)}</div></div>`)
      .join('')}</div>

    <div class="section-title">회원 안내</div>
    <div class="grid2">
      <div class="card"><h3>가입과 승인</h3><p>구글 계정으로 가입하면 관리자에게 가입 알림이 갑니다. 관리자가 승인하면 바로 학습을 시작할 수 있습니다. 운영 방식에 따라 자동 승인(개방형)으로 열릴 수도 있습니다.</p></div>
      <div class="card"><h3>내 학습 기록</h3><p>주차별 진도, 외운 단어 수, 퀴즈 점수, 연속 학습일, AI 첨삭 기록이 내 대시보드에 모입니다.</p></div>
    </div>
    <div class="footer">每日十词 · 한중문화AI데이터분석 과제 · 발음은 브라우저의 중국어 음성을 사용합니다.</div>
  </div>`;
}

export function renderPending(app) {
  const u = state.me.user;
  const msg = {
    pending: ['가입 신청이 접수되었습니다', '관리자가 승인하면 바로 학습을 시작할 수 있습니다. 승인 후 이 화면을 새로 고치거나 다시 로그인해 주세요.'],
    rejected: ['가입이 승인되지 않았습니다', '자세한 내용은 관리자에게 문의해 주세요.'],
    suspended: ['이용이 잠시 정지된 계정입니다', '관리자에게 문의해 주세요.'],
  }[u?.status] || ['로그인이 필요합니다', ''];
  app.innerHTML = `<div class="page" style="max-width:560px;text-align:center;padding-top:60px">
    <div class="seal" style="margin-bottom:18px">${u?.status === 'pending' ? '等待' : '通知'}</div>
    <h1>${msg[0]}</h1>
    <p class="muted">${msg[1]}</p>
    ${u ? `<p style="margin-top:18px"><span class="badge">${esc(u.email)}</span></p>` : ''}
    <div class="row" style="justify-content:center;margin-top:20px"><button class="btn primary" onclick="location.reload()">새로 고침</button><a class="btn" href="#/">처음으로</a></div>
  </div>`;
}
