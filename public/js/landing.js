// 대문 페이지(처음 화면). 로그인한 사용자는 바로 대시보드로 보낸다.
import { state, esc, get } from './core.js';

// 옷 종류별 색: 한푸(도포)는 청록, 치파오는 붉은색. 띠와 단추는 금색.
const OUTFIT = {
  hanfu: { main: '#2f8f7c', trim: '#f3c85a' },
  qipao: { main: '#c8312b', trim: '#f3c85a' },
  travel: { main: '#3b8ea5', trim: '#f3c85a' },
  student: { main: '#3d5a9e', trim: '#ffffff' },
  suit: { main: '#ffffff', trim: '#c8312b' },
};

// 대문에서 고르는 과목 (준비 중인 과목은 ready=false)
const LEVELS = [
  { key: 'travel', name: '여행 중국어', level: '초급', icon: '✈️', ready: true },
  { key: 'hsk', name: 'HSK 중국어', level: '중급', icon: '📘', ready: true },
  { key: 'emcee', name: '사회자 중국어', level: '고급', icon: '🎤', ready: true },
];

// 귀여운 판다 한 마리 (로컬 좌표 100x130, 발은 y=130에 닿음). 큰 머리·둥근 몸의 아기 판다 비율.
function panda(x, y, s, flip, animate, outfit) {
  const o = OUTFIT[outfit];
  const tx = flip ? x + 100 * s : x;
  const sx = flip ? -s : s;
  const hanfu = outfit === 'hanfu';
  const suit = outfit === 'suit';
  const student = outfit === 'student';
  const armFill = '#1d1d1d';
  const wave = animate
    ? '<animateTransform attributeName="transform" type="rotate" values="0 80 84;-50 80 84;0 80 84" dur="1.8s" repeatCount="indefinite"/>'
    : '';
  // 몸통 위에 입히는 옷
  const robe = hanfu
    ? `<path d="M30 80 Q50 72 70 80 L76 124 Q50 128 24 124 Z" fill="${o.main}"/>
       <path d="M42 76 L50 96 L58 76 Z" fill="#fff"/>
       <rect x="26" y="104" width="48" height="6" rx="3" fill="${o.trim}"/>`
    : '';
  const plainRobe = !hanfu && !suit
    ? `<path d="M32 78 Q50 72 68 78 L70 122 Q50 127 30 122 Z" fill="${o.main}"/>
       <rect x="40" y="72" width="20" height="8" rx="4" fill="${o.trim}"/>
       <circle cx="50" cy="88" r="2.2" fill="${o.trim}"/><circle cx="50" cy="99" r="2.2" fill="${o.trim}"/><circle cx="50" cy="110" r="2.2" fill="${o.trim}"/>`
    : '';
  const suitRobe = suit
    ? `<path d="M32 78 Q50 72 68 78 L70 122 Q50 127 30 122 Z" fill="#fff" stroke="#1d1d1d" stroke-width="1.5"/>
       <path d="M42 78 L50 98 L58 78 Z" fill="#e6e6e6" stroke="#1d1d1d" stroke-width="1"/>
       <rect x="47" y="96" width="6" height="22" rx="2" fill="${o.trim}"/>`
    : '';
  const backpack = outfit === 'travel'
    ? '<rect x="2" y="72" width="44" height="52" rx="12" fill="#e07b39" stroke="#1d1d1d" stroke-width="2"/><path d="M14 78 V118 M34 78 V118" stroke="#b85a24" stroke-width="3"/>'
    : '';
  const mic = suit
    ? '<rect x="76" y="100" width="9" height="13" rx="4.5" fill="#555" stroke="#1d1d1d" stroke-width="1"/><line x1="80.5" y1="113" x2="80.5" y2="122" stroke="#1d1d1d" stroke-width="2"/>'
    : '';
  const book = student
    ? '<rect x="66" y="96" width="24" height="17" rx="2" fill="#e8553b" stroke="#1d1d1d" stroke-width="1.5"/><line x1="78" y1="96" x2="78" y2="113" stroke="#fff" stroke-width="2"/>'
    : '';
  const glasses = student
    ? '<circle cx="38" cy="42" r="8" fill="none" stroke="#1d1d1d" stroke-width="1.6"/><circle cx="62" cy="42" r="8" fill="none" stroke="#1d1d1d" stroke-width="1.6"/><line x1="46" y1="42" x2="54" y2="42" stroke="#1d1d1d" stroke-width="1.6"/>'
    : '';
  const bow = suit
    ? '<path d="M72 14 L63 9 V19 Z M72 14 L81 9 V19 Z" fill="#f7a8a8" stroke="#1d1d1d" stroke-width="1"/><circle cx="72" cy="14" r="2.2" fill="#c8312b"/>'
    : '';
  const hand = (cx, cy) => (book || mic || hanfu ? '' : `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#fff" stroke="#1d1d1d" stroke-width="1.2"/>`);
  return `<g transform="translate(${tx} ${y}) scale(${sx} ${s})">
    ${backpack}
    <ellipse cx="38" cy="125" rx="11" ry="6.5" fill="#1d1d1d"/>
    <ellipse cx="62" cy="125" rx="11" ry="6.5" fill="#1d1d1d"/>
    <ellipse cx="38" cy="122" rx="4" ry="2.4" fill="#f7a8a8" opacity=".55"/>
    <ellipse cx="62" cy="122" rx="4" ry="2.4" fill="#f7a8a8" opacity=".55"/>
    <ellipse cx="50" cy="96" rx="31" ry="30" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/>
    ${robe}${plainRobe}${suitRobe}
    <ellipse cx="20" cy="94" rx="${hanfu ? 10 : 8}" ry="${hanfu ? 16 : 13}" fill="${hanfu ? o.main : armFill}" transform="rotate(14 20 94)"/>
    <g>${wave}
      <ellipse cx="80" cy="84" rx="${hanfu ? 10 : 8}" ry="${hanfu ? 16 : 13}" fill="${hanfu ? o.main : armFill}" transform="rotate(-24 80 84)"/>
      ${hand(84, 66)}
      ${book}${mic}
    </g>
    ${bow}
    <circle cx="23" cy="18" r="12" fill="#1d1d1d"/>
    <circle cx="77" cy="18" r="12" fill="#1d1d1d"/>
    <ellipse cx="23" cy="18" rx="5" ry="4" fill="#4a4a4a" opacity=".5"/>
    <ellipse cx="77" cy="18" rx="5" ry="4" fill="#4a4a4a" opacity=".5"/>
    <ellipse cx="50" cy="42" rx="34" ry="30" fill="#fff" stroke="#1d1d1d" stroke-width="2.5"/>
    <ellipse cx="36" cy="40" rx="10" ry="12" fill="#1d1d1d" transform="rotate(-22 36 40)"/>
    <ellipse cx="64" cy="40" rx="10" ry="12" fill="#1d1d1d" transform="rotate(22 64 40)"/>
    <circle cx="38" cy="38" r="4.6" fill="#fff"/>
    <circle cx="62" cy="38" r="4.6" fill="#fff"/>
    <circle cx="39" cy="39" r="2.5" fill="#1d1d1d"/>
    <circle cx="63" cy="39" r="2.5" fill="#1d1d1d"/>
    <circle cx="40" cy="37" r="1" fill="#fff"/>
    <circle cx="64" cy="37" r="1" fill="#fff"/>
    <ellipse cx="50" cy="52" rx="4" ry="2.8" fill="#1d1d1d"/>
    <path d="M45 57 Q47.5 60.5 50 57 Q52.5 60.5 55 57" fill="none" stroke="#1d1d1d" stroke-width="1.7" stroke-linecap="round"/>
    ${glasses}
    <ellipse cx="27" cy="53" rx="5" ry="3.4" fill="#f7a8a8" opacity=".8"/>
    <ellipse cx="73" cy="53" rx="5" ry="3.4" fill="#f7a8a8" opacity=".8"/>
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

// 고궁 정문 그림: 붉은 성벽, 두 겹 지붕, 열리는 문, 그 앞의 판다 세 마리 (여행자·학생·아나운서)
// 고궁 뒤 중국 대도시 건물 실루엣: 상하이 동방명주, 베이징 CCTV 본부, 광저우 전망탑, 선전 평안 금융센터
function skylineSvg() {
  const body = '#8aa3be';
  const lit = '#d5e4f0';
  return `<g class="skyline">
    <g>
      <rect x="69" y="60" width="2" height="62" fill="${body}"/>
      <path d="M62 236 L66 190 L74 190 L78 236 Z" fill="${body}"/>
      <circle cx="70" cy="186" r="13" fill="#b7c9dc" stroke="${body}" stroke-width="2"/>
      <circle cx="70" cy="150" r="9" fill="#b7c9dc" stroke="${body}" stroke-width="2"/>
      <circle cx="70" cy="122" r="6" fill="#b7c9dc" stroke="${body}" stroke-width="2"/>
    </g>
    <g>
      <path d="M116 236 L132 100 L140 100 L126 236 Z" fill="${body}"/>
      <path d="M160 236 L164 100 L172 100 L168 236 Z" fill="${body}"/>
      <rect x="132" y="100" width="40" height="10" fill="${body}"/>
      <rect x="136" y="150" width="30" height="6" fill="${body}"/>
      <rect x="144" y="130" width="14" height="4" fill="${lit}"/>
      <rect x="140" y="160" width="20" height="4" fill="${lit}"/>
    </g>
    <g>
      <path d="M516 236 L526 150 L531 110 L538 110 L543 150 L553 236 Z" fill="${body}"/>
      <ellipse cx="534" cy="110" rx="14" ry="4" fill="${body}"/>
      <line x1="534" y1="110" x2="534" y2="80" stroke="${body}" stroke-width="2"/>
      <line x1="526" y1="150" x2="543" y2="150" stroke="${lit}" stroke-width="2"/>
      <line x1="522" y1="190" x2="547" y2="190" stroke="${lit}" stroke-width="2"/>
    </g>
    <g>
      <rect x="606" y="110" width="28" height="126" fill="${body}"/>
      <path d="M606 110 L620 62 L634 110 Z" fill="${body}"/>
      <rect x="614" y="140" width="4" height="4" fill="${lit}"/>
      <rect x="622" y="170" width="4" height="4" fill="${lit}"/>
    </g>
  </g>`;
}

function palaceSvg(animate) {
  const s = 0.92;
  const gy = 306; // 땅 높이
  const py = gy - 130 * s;
  const studs = (cx, ys) => ys.map((cy) => `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#e0a92e"/>`).join('');
  return `<svg viewBox="0 0 640 360" role="img" aria-label="중국 고궁 문 앞에서 판다 세 마리가 손을 흔들며 인사하는 그림">
    <defs>
      <linearGradient id="pal-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf1de"/><stop offset="1" stop-color="#f6dcbb"/></linearGradient>
      <radialGradient id="pal-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe2a0"/><stop offset="1" stop-color="#ffe2a0" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="640" height="360" fill="url(#pal-sky)"/>
    <circle cx="540" cy="72" r="24" fill="#fbd38d" opacity=".85"/>
    ${skylineSvg()}
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
    ${panda(60, py, s, false, animate, 'travel')}
    ${panda(190, py, s, false, animate, 'student')}
    ${panda(420, py, s, true, animate, 'suit')}
  </svg>`;
}

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
  const levelHref = (c) => (signedIn ? `#/home/${c.key}` : `#/preview/${c.key}`);
  const panel = signedIn
    ? `<a class="btn primary big" href="#/home">내 학습으로 돌아가기</a>`
    : `${loginBtn}<a class="btn big" href="#/preview">로그인 없이 1주차 둘러보기</a>`;

  app.innerHTML = `
  <div class="page">
    <section class="gate-hero${reduced ? ' reduced' : ''}">
      <p class="gate-sub hook">초급부터 고급까지! 15주 동안 매주 15개 단어와 표현을 다양한 시나리오로 함께 배워봐요!</p>
      <div class="gate-scene">${palaceSvg(!reduced)}<h1 class="gate-title zh">每日十五词</h1></div>
      <div class="level-pick">
        ${LEVELS.map((c) => `<a class="level-card ${c.ready ? '' : 'soon'}" href="${levelHref(c)}"><span class="level-tag">${esc(c.level)}</span><span class="level-icon">${c.icon}</span><b>${esc(c.name)}</b><span class="muted" style="font-size:12px">${c.ready ? (signedIn ? '학습하기 →' : '1주차 맛보기 →') : '준비 중'}</span></a>`).join('')}
      </div>
      <div class="gate-panel">
        <div class="cta">${panel}</div>
        ${signedIn ? '' : '<p class="muted" style="margin:12px 0 0;font-size:13px">처음 가입하면 관리자가 승인한 뒤부터 학습할 수 있습니다.</p>'}
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
