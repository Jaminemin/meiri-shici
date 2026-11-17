// 대문 페이지(처음 화면). 로그인한 사용자는 바로 대시보드로 보낸다.
import { state, esc, get } from './core.js';
import { coverHtml } from './cover.js';

// 대문에서 고르는 과목 (준비 중인 과목은 ready=false)
const LEVELS = [
  { key: 'shortform', name: '숏폼으로 배우는 현대중국어', level: '초급~중급', icon: '🎬', ready: true },
  { key: 'common', name: '공통', level: '공통', icon: '📱', ready: true },
];

// browse: 로그인한 사용자가 집 아이콘으로 대문을 다시 볼 때 (대시보드로 튕기지 않는다)
export async function renderLanding(app, { browse = false } = {}) {
  const me = state.me;
  const u = me.user;
  // 이미 로그인한 사용자는 대문을 건너뛰고 대시보드로
  if (u && !browse) {
    location.hash = u.status !== 'approved' ? '#/pending' : '#/home';
    return;
  }
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const loginBtn = me.googleReady
    ? `<a class="btn primary big" href="/auth/google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg> 구글 계정으로 로그인하기</a>`
    : '<span class="btn big" aria-disabled="true" style="opacity:.6">구글 로그인 준비 중</span>';
  const signedIn = Boolean(u);
  const levelHref = (c) => (c.key === 'common' ? '#/common' : signedIn ? `#/home/${c.key}` : `#/preview/${c.key}`);
  const panel = signedIn
    ? `<a class="btn primary big" href="#/home">내 학습으로 돌아가기</a>`
    : `${loginBtn}<a class="btn big" href="#/preview">로그인 없이 1주차 둘러보기</a>`;

  app.innerHTML = `
  <div class="page">
    <section class="gate-hero${reduced ? ' reduced' : ''}">
      <p class="gate-sub hook">도우인(抖音) 숏폼으로 15주 동안 실제 중국어를 듣고, 분석하고, 번역하고, 직접 만들어 봐요!</p>
      <div class="gate-real">
        <h1 class="gate-real-title zh">短视频与现代汉语学习</h1>
        <div class="gate-phones" id="gate-phones" aria-label="수업에서 다루는 숏폼 영상 주제"></div>
        <a class="gate-univ" href="https://www.hufs.ac.kr" target="_blank" rel="noopener noreferrer" aria-label="한국외국어대학교 홈페이지로 이동"><img src="/img/hufs-logo.png" alt="한국외국어대학교" /></a>
      </div>
      <div class="level-pick">
        ${LEVELS.map((c) => `<a class="level-card ${c.ready ? '' : 'soon'}" href="${levelHref(c)}"><span class="level-tag">${esc(c.level)}</span><span class="level-icon">${c.icon}</span><b>${esc(c.name)}</b><span class="muted" style="font-size:12px">${c.key === 'common' ? '필수 앱 보기 →' : c.ready ? (signedIn ? '학습하기 →' : '1주차 맛보기 →') : '준비 중'}</span></a>`).join('')}
      </div>
      <div class="gate-panel">
        <div class="cta">${panel}</div>
        ${signedIn ? '' : '<p class="muted" style="margin:12px 0 0;font-size:13px">처음 가입하면 관리자가 승인한 뒤부터 학습할 수 있습니다.</p>'}
      </div>
    </section>

  </div>`;
  // 실제 숏폼 화면처럼 꾸민 주차 표지 세 장 (먹방·길거리 인터뷰·브이로그)
  get('/api/course-info')
    .then((ci) => {
      const box = app.querySelector('#gate-phones');
      if (!box) return;
      const pick = [3, 6, 2].map((n) => ci.weeks.find((w) => w.week === n)).filter(Boolean);
      box.innerHTML = pick.map((w) => `<div class="gate-phone">${coverHtml(w, { small: true })}<div class="gate-phone-cap"><b>${w.week}주차</b> ${esc(w.title)}</div></div>`).join('');
    })
    .catch(() => {});
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
