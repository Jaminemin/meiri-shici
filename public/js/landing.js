// 대문 페이지(처음 화면). 로그인한 사용자는 바로 대시보드로 보낸다.
import { state, esc, get } from './core.js';

// 옷 종류별 색: 한푸(도포)는 청록, 치파오는 붉은색. 띠와 단추는 금색.
const OUTFIT = {
  hanfu: { main: '#2f8f7c', trim: '#f3c85a' },
  qipao: { main: '#c8312b', trim: '#f3c85a' },
};

// 대문에서 고르는 과목 (준비 중인 과목은 ready=false)
const LEVELS = [
  { key: 'travel', name: '여행 중국어', level: '초급', icon: '✈️', ready: true },
  { key: 'hsk', name: 'HSK 중국어', level: '중급', icon: '📘', ready: false },
  { key: 'emcee', name: '사회자 중국어', level: '고급', icon: '🎤', ready: false },
];

// 귀여운 판다 한 마리 (로컬 좌표 100x130, 발은 y=130에 닿음)
function panda(x, y, s, flip, animate, outfit) {
  const o = OUTFIT[outfit];
  const tx = flip ? x + 100 * s : x;
  const sx = flip ? -s : s;
  const hanfu = outfit === 'hanfu';
  const armFill = hanfu ? o.main : '#1d1d1d';
  const wave = animate
    ? '<animateTransform attributeName="transform" type="rotate" values="0 76 74;-62 76 74;0 76 74" dur="1.8s" repeatCount="indefinite"/>'
    : '';
  const robe = hanfu
    ? `<path d="M36 70 Q50 64 64 70 L78 124 Q50 129 22 124 Z" fill="${o.main}"/>
       <path d="M42 70 L50 88 L58 70 Z" fill="#fff"/>
       <rect x="30" y="97" width="40" height="6" rx="3" fill="${o.trim}"/>`
    : `<path d="M37 68 Q50 63 63 68 L67 124 Q50 129 33 124 Z" fill="${o.main}"/>
       <rect x="41" y="60" width="18" height="9" rx="4" fill="${o.trim}"/>
       <circle cx="50" cy="80" r="2.4" fill="${o.trim}"/><circle cx="50" cy="91" r="2.4" fill="${o.trim}"/><circle cx="50" cy="102" r="2.4" fill="${o.trim}"/>`;
  return `<g transform="translate(${tx} ${y}) scale(${sx} ${s})">
    <ellipse cx="41" cy="126" rx="9" ry="6" fill="#1d1d1d"/>
    <ellipse cx="59" cy="126" rx="9" ry="6" fill="#1d1d1d"/>
    <ellipse cx="50" cy="92" rx="28" ry="30" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/>
    ${robe}
    <ellipse cx="20" cy="92" rx="${hanfu ? 10 : 7}" ry="${hanfu ? 17 : 12}" fill="${armFill}"/>
    <g>${wave}
      <ellipse cx="80" cy="92" rx="${hanfu ? 10 : 7}" ry="${hanfu ? 17 : 12}" fill="${armFill}"/>
      ${hanfu ? '' : '<circle cx="80" cy="102" r="5" fill="#fff"/>'}
    </g>
    <circle cx="25" cy="14" r="11" fill="#1d1d1d"/>
    <circle cx="75" cy="14" r="11" fill="#1d1d1d"/>
    <circle cx="50" cy="40" r="30" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/>
    <ellipse cx="37" cy="42" rx="9" ry="11" fill="#1d1d1d" transform="rotate(-20 37 42)"/>
    <ellipse cx="63" cy="42" rx="9" ry="11" fill="#1d1d1d" transform="rotate(20 63 42)"/>
    <circle cx="38" cy="40" r="4.5" fill="#fff"/>
    <circle cx="62" cy="40" r="4.5" fill="#fff"/>
    <circle cx="39" cy="41" r="2.4" fill="#1d1d1d"/>
    <circle cx="63" cy="41" r="2.4" fill="#1d1d1d"/>
    <circle cx="40" cy="39" r="1" fill="#fff"/>
    <circle cx="64" cy="39" r="1" fill="#fff"/>
    <ellipse cx="50" cy="50" rx="3.6" ry="2.6" fill="#1d1d1d"/>
    <path d="M45 55 Q47.5 58 50 55 Q52.5 58 55 55" fill="none" stroke="#1d1d1d" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="29" cy="51" r="4" fill="#f7a8a8" opacity=".8"/>
    <circle cx="71" cy="51" r="4" fill="#f7a8a8" opacity=".8"/>
  </g>`;
}

// 대나무 한 그루 (밑동 base, 높이 h)
function bamboo(x, base, h) {
  const top = base - h;
  let g = `<rect x="${x - 5}" y="${top}" width="10" height="${h}" rx="4" fill="#6fae5d"/>`;
  for (let yy = base - 26; yy > top + 12; yy -= 26) g += `<rect x="${x - 6}" y="${yy}" width="12" height="3" rx="1.5" fill="#3f7d3a"/>`;
  g += `<path d="M${x} ${top + 14} q 30 -12 46 6 q -28 10 -46 -6 z" fill="#86c46e"/>`;
  g += `<path d="M${x} ${top + 34} q -30 -12 -44 6 q 28 10 44 -6 z" fill="#7ab864"/>`;
  return `<g>${g}</g>`;
}

// 고궁 정문 그림: 붉은 성벽, 두 겹 지붕, 열리는 문, 그 앞의 판다 네 마리
function palaceSvg(animate) {
  const s = 0.92;
  const gy = 306; // 땅 높이
  const py = gy - 130 * s;
  const studs = (cx, ys) => ys.map((cy) => `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#e0a92e"/>`).join('');
  return `<svg viewBox="0 0 640 360" role="img" aria-label="중국 고궁 문 앞에서 판다 네 마리가 손을 흔들며 인사하는 그림">
    <defs>
      <linearGradient id="pal-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf1de"/><stop offset="1" stop-color="#f6dcbb"/></linearGradient>
      <radialGradient id="pal-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe2a0"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="360" fill="url(#pal-sky)"/>
    <circle cx="540" cy="72" r="24" fill="#fbd38d" opacity=".85"/>
    <rect x="0" y="236" width="640" height="72" fill="#d9bb8c" opacity=".55"/>
    <rect x="40" y="208" width="560" height="100" fill="#9d2433"/>
    <rect x="40" y="208" width="560" height="10" fill="#6f1826"/>
    <path d="M205 150 Q320 80 435 150 Z" fill="#1d3f66"/>
    <rect x="196" y="150" width="248" height="10" fill="#e0a92e"/>
    <path d="M180 172 Q320 128 460 172 L452 184 L188 184 Z" fill="#24507d"/>
    <rect x="232" y="184" width="176" height="24" fill="#7b1c2a"/>
    <rect x="300" y="118" width="40" height="10" fill="#e0a92e"/>
    <line x1="250" y1="184" x2="250" y2="196" stroke="#6f1826" stroke-width="2"/>
    <ellipse cx="250" cy="204" rx="8" ry="10" fill="#e0412e"/>
    <line x1="390" y1="184" x2="390" y2="196" stroke="#6f1826" stroke-width="2"/>
    <ellipse cx="390" cy="204" rx="8" ry="10" fill="#e0412e"/>
    <rect x="275" y="208" width="90" height="100" fill="#3a0d15"/>
    <ellipse class="gate-glow" cx="320" cy="262" rx="44" ry="52" fill="url(#pal-glow)"/>
    <g class="door door-l">
      <rect x="277" y="210" width="40" height="98" fill="#7b1c2a"/>
      ${studs(290, [228, 256, 284])}
    </g>
    <g class="door door-r">
      <rect x="323" y="210" width="40" height="98" fill="#7b1c2a"/>
      ${studs(350, [228, 256, 284])}
    </g>
    <rect x="268" y="302" width="104" height="8" fill="#c8b48e"/>
    <rect x="0" y="${gy}" width="640" height="${360 - gy}" fill="#e6d5b5"/>
    ${bamboo(22, 306, 250)}${bamboo(44, 306, 190)}${bamboo(612, 306, 240)}${bamboo(596, 306, 180)}
    ${panda(56, py, s, false, animate, 'hanfu')}
    ${panda(150, py, s, false, animate, 'qipao')}
    ${panda(394, py, s, true, animate, 'qipao')}
    ${panda(488, py, s, true, animate, 'hanfu')}
  </svg>`;
}

export async function renderLanding(app) {
  const me = state.me;
  const u = me.user;
  // 이미 로그인한 사용자는 대문을 건너뛰고 대시보드로
  if (u) {
    location.hash = u.status !== 'approved' ? '#/pending' : '#/home';
    return;
  }
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const loginBtn = me.googleReady
    ? `<a class="btn primary big" href="/auth/google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#fff" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></svg> 구글 계정으로 로그인하기</a>`
    : '<span class="btn big" aria-disabled="true" style="opacity:.6">구글 로그인 준비 중</span>';

  app.innerHTML = `
  <div class="page">
    <section class="gate-hero${reduced ? ' reduced' : ''}">
      <h1 class="gate-title zh">每日十五词</h1>
      <p class="gate-sub hook">HSK 막막했나요? 수업하면서 같이 배워봐요.</p>
      <div class="gate-scene">${palaceSvg(!reduced)}</div>
      <div class="level-pick">
        ${LEVELS.map((c) => `<a class="level-card ${c.ready ? '' : 'soon'}" href="#/preview/${c.key}"><span class="level-tag">${esc(c.level)}</span><span class="level-icon">${c.icon}</span><b>${esc(c.name)}</b><span class="muted" style="font-size:12px">${c.ready ? '1주차 맛보기 →' : '준비 중'}</span></a>`).join('')}
      </div>
      <div class="gate-panel">
        <div class="cta">${loginBtn}<a class="btn big" href="#/preview">로그인 없이 1주차 둘러보기</a></div>
        <p class="muted" style="margin:12px 0 0;font-size:13px">처음 가입하면 관리자가 승인한 뒤부터 학습할 수 있습니다.</p>
      </div>
    </section>

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
