// 화면 이동
import { state, esc, get, post, fail, toast, speak, GOOGLE_G } from './core.js';
import { renderLanding, renderPending } from './landing.js';
import { renderPreview } from './preview.js';
import { renderCommonApps } from './common.js';
import { renderHome, renderCourse, renderMyWritings, renderTrack } from './home.js';
import { renderWeek } from './week.js';
import { renderAdmin, renderAdminUsers, renderAdminUser, renderAdminWritings, renderAdminVideos } from './admin.js';
import { renderGrades, renderProject, renderTalk, renderTalkSession } from './lms.js';
import { renderAdminGrading, renderAdminGrade, renderAdminGradebook, renderAdminTeams, renderAdminContent, renderAdminReport } from './adminlms.js';
import { renderPrivacy, renderGuide } from './info.js';
import { renderCheckin, renderAdminAttendance } from './attendance.js';
import { renderLab, renderComments, renderCommentPost, renderDecode, renderMyWords } from './ailab.js';

const app = document.getElementById('app');

export async function loadMe() {
  state.me = await get('/api/me');
  return state.me;
}

function navLinks(active) {
  const u = state.me?.user;
  if (!u || u.status !== 'approved') return [];
  const links = [
    ['course', '📖 수업'],
    ['lab', '✨ AI 실습'],
    ['writings', '✏️ 내 작문<small class="nav-sub">AI 첨삭 작문 연습</small>'],
    ['project', '👥 팀 프로젝트'],
    ['home', '🧑‍🎓 내 학습'],
    ['grades', '📊 내 성적'],
  ];
  if (u.role === 'admin') links.push(['admin', '관리자']);
  return links.map(([k, l]) => `<a href="#/${k}" class="${active === k ? 'on' : ''}">${l}${k === 'admin' && state.pendingCount ? `<span class="count">${state.pendingCount}</span>` : ''}</a>`).join('');
}

// 집 모양 아이콘: 과목 선택 메인으로 돌아가기
const HOME_ICON = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M5 19 L20 6 L35 19" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 18 V34 Q9 36 11 36 H29 Q31 36 31 34 V18" fill="var(--accent-soft, #eef0ff)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M17 36 V27 Q17 25 19 25 H21 Q23 25 23 27 V36" fill="#fff" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
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
    // 로그인 전: 오른쪽 위에 구글 로그인 + 둘러보기
    box.innerHTML = state.me?.googleReady
      ? `<a class="btn primary small hdr-login" href="/auth/google">${GOOGLE_G}<span>구글 계정으로 로그인하기</span></a><a class="btn small hdr-browse" href="#/preview">로그인 없이 1주차 둘러보기</a>`
      : `<span class="btn small hdr-login" aria-disabled="true" style="opacity:.6">${GOOGLE_G}<span>구글 로그인 준비 중</span></span><a class="btn small hdr-browse" href="#/preview">로그인 없이 1주차 둘러보기</a>`;
    return;
  }
  box.innerHTML = `<a class="home-btn" href="#/welcome" title="초급~고급 과목 선택 메인으로" aria-label="메인페이지로 돌아가기">${HOME_ICON}</a><span class="avatar">${u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc((u.name || '?').slice(0, 1))}</span><span class="nm">${esc(u.name)}</span>${u.role === 'admin' ? '<span class="badge accent">관리자</span>' : ''}<button class="btn small" id="logout">로그아웃</button>`;
  box.querySelector('#logout').onclick = async () => {
    await post('/auth/logout').catch(() => {});
    state.me.user = null;
    location.hash = '#/';
  };
}

// 왼쪽 하단 고정 둥근 뒤로가기 버튼 (메인 화면에서는 숨김)
let navCount = 0;
const backFab = document.createElement('button');
backFab.id = 'back-fab';
backFab.type = 'button';
backFab.title = '뒤로가기';
backFab.setAttribute('aria-label', '뒤로가기');
backFab.hidden = true;
backFab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
backFab.onclick = () => {
  if (navCount > 0) history.back();
  else location.hash = '#/';
};
document.body.appendChild(backFab);

async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [pathPart, query] = hash.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  window.scrollTo(0, 0);
  document.body.classList.remove('on-landing');
  backFab.hidden = !parts.length || parts[0] === 'welcome';
  try {
    await loadMe();
    const u = state.me.user;
    if (params.get('login') === 'fail') toast('로그인하지 못했습니다. 다시 시도해 주세요.', 'bad');
    if (params.get('login') === 'nodb') toast('데이터베이스가 연결되지 않아 로그인할 수 없습니다. 관리자에게 알려 주세요.', 'bad');
    if (params.get('login') === 'cancel') toast('로그인을 취소했습니다.');
    if (u && u.status === 'approved' && parts[0] !== 'checkin') {
      let pend = null;
      try { pend = sessionStorage.getItem('ms_checkin'); } catch { /* 무시 */ }
      if (pend) { location.hash = `#/checkin/${pend}`; return; }
    }
    if (u?.role === 'admin') {
      get('/api/admin/overview')
        .then((o) => {
          state.pendingCount = o.counts.pending;
          renderChrome(parts[0] || '');
        })
        .catch(() => {});
    }
    renderChrome(['comments', 'decode', 'mywords', 'talk'].includes(parts[0]) ? 'lab' : parts[0] || '');
    if (!parts.length) return renderLanding(app);
    if (parts[0] === 'welcome') return renderLanding(app, { browse: true });
    if (parts[0] === 'preview') return renderPreview(app, parts[1] || '');
    if (parts[0] === 'common') return renderCommonApps(app);
    if (parts[0] === 'checkin') return renderCheckin(app, parts[1]);
    if (parts[0] === 'privacy') return renderPrivacy(app);
    if (parts[0] === 'guide') return renderGuide(app);
    if (!u) {
      location.hash = '#/';
      return;
    }
    if (parts[0] === 'pending' || u.status !== 'approved') return renderPending(app);
    const ctx = { params, rerender: route };
    if (parts[0] === 'home') return renderHome(app, { ...ctx, course: parts[1] || '' });
    if (parts[0] === 'course') return renderCourse(app, ctx);
    if (parts[0] === 'track') return renderTrack(app, parts[1]);
    if (parts[0] === 'writings') return renderMyWritings(app, ctx);
    if (parts[0] === 'grades') return renderGrades(app);
    if (parts[0] === 'project') return renderProject(app);
    if (parts[0] === 'lab') return renderLab(app);
    if (parts[0] === 'comments' && parts[1]) return renderCommentPost(app, Number(parts[1]));
    if (parts[0] === 'comments') return renderComments(app);
    if (parts[0] === 'decode') return renderDecode(app, parts[1] ? Number(parts[1]) : null);
    if (parts[0] === 'mywords') return renderMyWords(app);
    if (parts[0] === 'talk' && parts[1]) return renderTalkSession(app, Number(parts[1]));
    if (parts[0] === 'talk') return renderTalk(app);
    if (parts[0] === 'week' && parts[1]) return renderWeek(app, { ...ctx, week: Number(parts[1]), tab: parts[2] || '' });
    if (parts[0] === 'admin') {
      if (u.role !== 'admin') return (location.hash = '#/home');
      if (parts[1] === 'attendance') return renderAdminAttendance(app);
      if (parts[1] === 'users' && parts[2]) return renderAdminUser(app, { ...ctx, id: parts[2] });
      if (parts[1] === 'users') return renderAdminUsers(app, ctx);
      if (parts[1] === 'writings') return renderAdminWritings(app, ctx);
      if (parts[1] === 'videos') return renderAdminVideos(app, ctx);
      if (parts[1] === 'grading' && parts[2] && parts[3]) return renderAdminGrade(app, { ...ctx, week: Number(parts[2]), uid: Number(parts[3]) });
      if (parts[1] === 'grading') return renderAdminGrading(app, { ...ctx, week: parts[2] ? Number(parts[2]) : null });
      if (parts[1] === 'gradebook') return renderAdminGradebook(app, ctx);
      if (parts[1] === 'teams') return renderAdminTeams(app, ctx);
      if (parts[1] === 'report') return renderAdminReport(app);
      if (parts[1] === 'content') return renderAdminContent(app, { ...ctx, week: parts[2] ? Number(parts[2]) : null });
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

// 좌우 스와이프로 위쪽 탭(수업 · AI 실습 · 내 작문 · 팀 프로젝트 · 내 학습 · 내 성적) 사이를 이동한다
// 입력칸, 영상, 가로로 스크롤되는 영역 안에서 시작한 동작은 건드리지 않는다.
(() => {
  let t0 = null;
  const blocked = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.matches?.('input, textarea, select, video, audio, [contenteditable], .ak-full, #mobile-tabs, .tabs')) return true;
      const cs = getComputedStyle(n);
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true;
    }
    return false;
  };
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || blocked(e.target) || window.getSelection?.().toString()) { t0 = null; return; }
    const t = e.touches[0];
    t0 = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!t0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - t0.x, dy = t.clientY - t0.y, dt = Date.now() - t0.at;
    t0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || dt > 700) return;
    const tabs = [...document.querySelectorAll('#mobile-tabs a')];
    const i = tabs.findIndex((a) => a.classList.contains('on'));
    if (i < 0) return;
    const next = tabs[i + (dx < 0 ? 1 : -1)];
    if (!next) return;
    location.hash = next.getAttribute('href');
    setTimeout(() => {
      app.animate([{ transform: `translateX(${dx < 0 ? 28 : -28}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
      document.querySelector('#mobile-tabs a.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }, 80);
  }, { passive: true });
})();

window.addEventListener('hashchange', () => {
  navCount += 1;
  route();
});
route();
