// 대문 페이지(처음 화면). 로그인한 사용자는 바로 대시보드로 보낸다.
import { state, esc } from './core.js';

// 대문에서 고르는 과목 (준비 중인 과목은 ready=false)
const LEVELS = [
  { key: 'shortform', name: '숏폼 중국어', level: '초급~중급', icon: '🎬', ready: true },
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
  const signedIn = Boolean(u);
  const levelHref = (c) => (c.key === 'common' ? '#/common' : signedIn ? `#/home/${c.key}` : `#/preview/${c.key}`);
  app.innerHTML = `
  <section class="gate-full">
    <div class="gate-slides" aria-hidden="true">
      <div class="gate-slide on" style="background-image:url('/img/hero-1.jpg');background-position:42% 30%"></div>
      <div class="gate-slide" style="background-image:url('/img/hero-2.jpg');background-position:46% 25%"></div>
    </div>
    <div class="gate-full-in">
      <span class="gate-photo-tag">抖音 · 15주 과정</span>
      <h1 class="gate-photo-title">숏폼 중국어</h1>
      <p class="gate-photo-zh zh">短视频与现代汉语学习</p>
      <p class="gate-full-hook">도우인(抖音) 숏폼으로 15주 동안 실제 중국어를 듣고, 분석하고, 번역하고, 직접 만들어 봐요!</p>
      <div class="gate-full-cards">
        ${LEVELS.map((c) => `<a class="gate-glass" href="${levelHref(c)}"><span class="level-icon">${c.icon}</span><span><small>${esc(c.level)}</small><b>${esc(c.name)}</b><em>${c.key === 'common' ? '필수 앱 보기 →' : signedIn ? '학습하기 →' : '1주차 맛보기 →'}</em></span></a>`).join('')}
      </div>
      ${signedIn ? '<a class="btn primary" href="#/home" style="margin-top:14px">내 학습으로 돌아가기</a>' : '<p class="gate-full-note">처음 가입하면 관리자가 승인한 뒤부터 학습할 수 있습니다.</p>'}
      <a class="gate-photo-univ" href="https://www.hufs.ac.kr" target="_blank" rel="noopener noreferrer" aria-label="한국외국어대학교 홈페이지로 이동"><img src="/img/hufs-logo.png" alt="한국외국어대학교" /></a>
    </div>
    <div class="gate-dots" aria-hidden="true"><i class="on"></i><i></i></div>
  </section>`;
  // 두 장의 배경을 번갈아 보여 준다 (움직임 줄이기 설정이면 멈춤)
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    let i = 0;
    const tick = () => {
      const slides = app.querySelectorAll('.gate-slide');
      if (!slides.length || !document.body.contains(slides[0])) return clearInterval(t);
      i = (i + 1) % slides.length;
      slides.forEach((el, k) => el.classList.toggle('on', k === i));
      app.querySelectorAll('.gate-dots i').forEach((el, k) => el.classList.toggle('on', k === i));
    };
    const t = setInterval(tick, 6000);
  }
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
