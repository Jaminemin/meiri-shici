// 화면 이동
import { state, esc, get, post, fail, toast, speak } from './core.js';
import { renderLanding, renderPending } from './landing.js';
import { renderPreview } from './preview.js';
import { renderHome, renderCourse, renderMyWritings, renderTrack } from './home.js';
import { renderWeek } from './week.js';
import { renderAdmin, renderAdminUsers, renderAdminUser, renderAdminWritings } from './admin.js';

const app = document.getElementById('app');

export async function loadMe() {
  state.me = await get('/api/me');
  return state.me;
}

function navLinks(active) {
  const u = state.me?.user;
  if (!u || u.status !== 'approved') return [];
  const links = [
    ['home', '내 학습'],
    ['course', '15주 과정'],
    ['writings', '내 작문'],
  ];
  if (u.role === 'admin') links.push(['admin', '관리자']);
  return links.map(([k, l]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}">${l}${k === 'admin' && state.pendingCount ? `<span class="count">${state.pendingCount}</span>` : ''}</a>`).join('');
}

// 집 모양 안에 판다 얼굴을 넣은 아이콘: 과목 선택 메인으로 돌아가기
const HOME_ICON = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M5 19 L20 6 L35 19" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 18 V34 Q9 36 11 36 H29 Q31 36 31 34 V18" fill="var(--accent-soft, #eef0ff)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="20" cy="27" r="7" fill="#fff"/>
  <circle cx="14.6" cy="20.4" r="2.6" fill="var(--ink, #222)"/>
  <circle cx="25.4" cy="20.4" r="2.6" fill="var(--ink, #222)"/>
  <ellipse cx="16.8" cy="26.4" rx="2" ry="2.5" fill="var(--ink, #222)" transform="rotate(-18 16.8 26.4)"/>
  <ellipse cx="23.2" cy="26.4" rx="2" ry="2.5" fill="var(--ink, #222)" transform="rotate(18 23.2 26.4)"/>
  <circle cx="20" cy="30.6" r="0.9" fill="var(--ink, #222)"/>
</svg>`;

function renderChrome(active) {
  const html = navLinks(active);
  document.getElementById('topnav').innerHTML = html;
  const mt = document.getElementById('mobile-tabs');
  mt.innerHTML = html;
  mt.style.visibility = html ? 'visible' : 'hidden';
  if (!html) mt.style.display = 'none';
  else mt.style.removeProperty('display');
  const box = document.getElementById('user-area');
  const u = state.me?.user;
  if (!u) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `<a class="home-btn" href="#/" title="초급~고급 과목 선택 메인으로" aria-label="메인페이지로 돌아가기">${HOME_ICON}</a><span class="avatar">${u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc((u.name || '?').slice(0, 1))}</span><span class="nm">${esc(u.name)}</span>${u.role === 'admin' ? '<span class="badge accent">관리자</span>' : ''}<button class="btn small" id="logout">로그아웃</button>`;
  box.querySelector('#logout').onclick = async () => {
    await post('/auth/logout').catch(() => {});
    state.me.user = null;
    location.hash = '#/';
  };
}

async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [pathPart, query] = hash.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  window.scrollTo(0, 0);
  try {
    await loadMe();
    const u = state.me.user;
    if (params.get('login') === 'fail') toast('로그인하지 못했습니다. 다시 시도해 주세요.', 'bad');
    if (params.get('login') === 'nodb') toast('데이터베이스가 연결되지 않아 로그인할 수 없습니다. 관리자에게 알려 주세요.', 'bad');
    if (params.get('login') === 'cancel') toast('로그인을 취소했습니다.');
    if (u?.role === 'admin') {
      get('/api/admin/overview')
        .then((o) => {
          state.pendingCount = o.counts.pending;
          renderChrome(parts[0] || '');
        })
        .catch(() => {});
    }
    renderChrome(parts[0] || '');
    if (!parts.length) return renderLanding(app);
    if (parts[0] === 'preview') return renderPreview(app, parts[1] || 'travel');
    if (!u) {
      location.hash = '#/';
      return;
    }
    if (parts[0] === 'pending' || u.status !== 'approved') return renderPending(app);
    const ctx = { params, rerender: route };
    if (parts[0] === 'home') return renderHome(app, { ...ctx, course: parts[1] || 'travel' });
    if (parts[0] === 'course') return renderCourse(app, ctx);
    if (parts[0] === 'track') return renderTrack(app, parts[1]);
    if (parts[0] === 'writings') return renderMyWritings(app, ctx);
    if (parts[0] === 'week' && parts[1]) return renderWeek(app, { ...ctx, week: Number(parts[1]), tab: parts[2] || 'words' });
    if (parts[0] === 'admin') {
      if (u.role !== 'admin') return (location.hash = '#/home');
      if (parts[1] === 'users' && parts[2]) return renderAdminUser(app, { ...ctx, id: parts[2] });
      if (parts[1] === 'users') return renderAdminUsers(app, ctx);
      if (parts[1] === 'writings') return renderAdminWritings(app, ctx);
      return renderAdmin(app, ctx);
    }
    app.innerHTML = '<div class="page"><div class="empty">없는 화면입니다. <a href="#/home">처음으로</a></div></div>';
  } catch (e) {
    if (location.hash.startsWith('#/pending')) return;
    fail(e);
    app.innerHTML = `<div class="page"><div class="notice bad">${esc(e.message)}</div><a class="btn" href="#/">처음으로</a></div>`;
  }
}

document.getElementById('theme-btn').onclick = () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try {
    localStorage.setItem('ms_theme', root.dataset.theme);
  } catch {
    /* 저장 못 해도 괜찮음 */
  }
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-speak]');
  if (b) {
    e.stopPropagation();
    speak(b.dataset.speak);
  }
});

window.addEventListener('hashchange', route);
route();
