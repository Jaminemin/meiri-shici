// 출석부: 교수자의 QR 출석 열기·출석부, 학생의 QR 스캔 출석 화면
import { state, esc, get, post, put, del, fail, toast, confirmBox } from './core.js';
import { adminTabs } from './admin.js';
import { qrSvg } from './qr.js';

const MARK = { present: ['○', '출석'], late: ['△', '지각'], excused: ['공', '공결'] };
const NEXT = { '': 'present', present: 'late', late: 'excused', excused: null };
const mmdd = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const hhmm = (t) => new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

// ---------- 학생: QR을 스캔하면 열리는 화면 (#/checkin/<세션>.<토큰>) ----------
export async function renderCheckin(app, code) {
  const [sid, token] = String(code || '').split('.');
  const u = state.me.user;
  const box = (inner) => { app.innerHTML = `<div class="page ck-page"><div class="card ck-card">${inner}</div></div>`; };
  if (!sid || !token) return box('<div class="ck-ico">❓</div><h2>QR 코드를 읽지 못했어요</h2><p class="muted">교실 화면의 QR을 휴대폰 카메라로 다시 스캔해 주세요.</p><a class="btn" href="#/">처음으로</a>');
  if (!u) {
    try { sessionStorage.setItem('ms_checkin', code); } catch { /* 무시 */ }
    return box('<div class="ck-ico">🔐</div><h2>로그인하면 바로 출석돼요</h2><p class="muted">구글 계정으로 로그인한 뒤 자동으로 출석을 기록합니다. QR은 약 1분 안에 쓰세요.</p><a class="btn primary big" href="/auth/google">구글 계정으로 로그인하기</a>');
  }
  try { sessionStorage.removeItem('ms_checkin'); } catch { /* 무시 */ }
  box('<div class="ck-ico">⏳</div><h2>출석을 확인하는 중…</h2>');
  try {
    const r = await post('/api/checkin', { sid: Number(sid), token });
    box(`<div class="ck-ico ok">✅</div><h2>${r.already ? '이미 출석했어요' : '출석 완료!'}</h2>
      <p><b>${esc(r.title)}</b><br><span class="muted">${esc(r.date)} · ${esc(MARK[r.status]?.[1] || '출석')}</span></p>
      <p class="muted" style="font-size:13px">${esc(u.name)}님의 출석이 출석부에 기록되었습니다.</p>
      <a class="btn primary" href="#/home">내 학습으로 가기</a>`);
  } catch (e) {
    box(`<div class="ck-ico">⚠️</div><h2>출석하지 못했어요</h2><p class="muted">${esc(e.message)}</p><a class="btn" href="#/home">내 학습으로 가기</a>`);
  }
}

// ---------- 관리자: 출석부 ----------
export async function renderAdminAttendance(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; };
  async function draw() {
    stop();
    const d = await get('/api/admin/attendance');
    const open = d.sessions.find((s) => s.open);
    const cols = d.sessions.slice(0, 14).reverse(); // 왼쪽이 오래된 수업
    const rec = new Map(d.records.map((r) => [`${r.session_id}:${r.user_id}`, r.status]));
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const totalSessions = d.sessions.length;
    const rows = d.students.map((st) => {
      const mine = d.sessions.map((s) => rec.get(`${s.id}:${st.id}`));
      const came = mine.filter((x) => x === 'present' || x === 'late' || x === 'excused').length;
      return `<tr><td class="ak-name"><b>${esc(st.name)}</b><div class="muted">${esc(st.email)}</div></td>
        ${cols.map((s) => { const v = rec.get(`${s.id}:${st.id}`) || ''; return `<td><button class="ak-cell ${v}" data-s="${s.id}" data-u="${st.id}" data-v="${v}" title="${esc(s.title)} · ${v ? MARK[v][1] : '결석'}">${v ? MARK[v][0] : '–'}</button></td>`; }).join('')}
        <td class="ak-sum"><b>${came}</b>/${totalSessions}</td></tr>`;
    }).join('');
    app.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>관리자</h1><p>수업마다 QR로 출석을 받고, 출석부를 확인합니다.</p></div></div>
      ${adminTabs('attendance')}
      <div class="card ak-open">
        ${open ? `<div class="row between" style="flex-wrap:wrap;gap:8px"><div><span class="badge accent">출석 받는 중</span> <b>${esc(open.title)}</b> <span class="muted">${esc(open.d)}</span></div>
            <div class="row" style="gap:6px"><button class="btn small" id="ak-full">🖥 교실 화면으로 크게 보기</button><button class="btn small danger" id="ak-close">출석 마감</button></div></div>
          <div class="ak-live"><div class="ak-qr" id="ak-qr"><div class="empty">QR 준비 중…</div></div>
            <div class="ak-side"><p class="muted" style="margin:0 0 6px">교실 스크린에 띄우면 학생들이 휴대폰 카메라로 스캔합니다. QR은 <b>30초마다 바뀌어서</b> 사진을 보내 주어도 교실 밖에서는 출석할 수 없어요.</p>
              <div class="ak-count"><b id="ak-n">0</b>명 출석</div><div class="ak-bar"><i id="ak-left"></i></div>
              <div class="ak-who" id="ak-who"></div></div></div>`
        : `<h3 style="margin:0 0 8px">📲 오늘 수업 출석 열기</h3>
          <div class="row" style="gap:8px;flex-wrap:wrap"><input id="ak-title" class="ak-input" maxlength="60" placeholder="수업 이름 (예: 11월 18일 수업)" value="${Number(today.slice(5, 7))}월 ${Number(today.slice(8, 10))}일 수업"><input id="ak-date" type="date" class="ak-input" value="${today}"><button class="btn primary" id="ak-new">출석 열기</button></div>
          <p class="muted" style="font-size:13px;margin:8px 0 0">열면 QR이 만들어집니다. 수업이 끝나면 꼭 마감해 주세요.</p>`}
      </div>
      <div class="card"><div class="row between" style="margin-bottom:10px;flex-wrap:wrap;gap:8px"><h3 style="margin:0">출석부</h3>
          <div class="row" style="gap:6px"><span class="muted" style="font-size:12.5px">칸을 누르면 ○ 출석 → △ 지각 → 공 공결 → – 결석 순서로 바뀝니다.</span><a class="btn small" href="/api/admin/attendance/export">CSV 받기</a></div></div>
        ${cols.length ? `<div class="ak-wrap"><table class="ak-table"><thead><tr><th>학생</th>${cols.map((s) => `<th title="${esc(s.title)}"><div>${mmdd(s.d)}</div><small>${s.n}명</small>${s.open ? '<i class="ak-dot" title="출석 받는 중"></i>' : ''}</th>`).join('')}<th>출석</th></tr></thead><tbody>${rows || `<tr><td colspan="${cols.length + 2}" class="muted">승인된 학생이 없습니다.</td></tr>`}</tbody></table></div>`
          : '<div class="empty">아직 출석을 연 수업이 없습니다. 위에서 첫 수업의 출석을 열어 보세요.</div>'}
      </div>
      ${d.sessions.length ? `<div class="card"><h3 style="margin:0 0 8px">수업 목록</h3>${d.sessions.map((s) => `<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)"><span><b>${esc(s.title)}</b> <span class="muted">${esc(s.d)} · ${s.n}명</span> ${s.open ? '<span class="badge accent">진행 중</span>' : ''}</span><span class="row" style="gap:6px">${s.open ? '' : `<button class="btn small" data-reopen="${s.id}">다시 열기</button>`}<button class="btn small danger" data-del="${s.id}">삭제</button></span></div>`).join('')}</div>` : ''}
    </div>`;
    bind(open);
  }

  function bind(open) {
    app.querySelector('#ak-new')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await post('/api/admin/attendance/sessions', { title: app.querySelector('#ak-title').value, date: app.querySelector('#ak-date').value }); await draw(); } catch (err) { e.target.disabled = false; fail(err); }
    });
    app.querySelector('#ak-close')?.addEventListener('click', async () => {
      if (!(await confirmBox('출석을 마감할까요? 마감하면 더 이상 QR로 출석할 수 없습니다.'))) return;
      try { await post(`/api/admin/attendance/sessions/${open.id}/close`, {}); toast('출석을 마감했어요.'); await draw(); } catch (err) { fail(err); }
    });
    app.querySelectorAll('[data-reopen]').forEach((b) => (b.onclick = async () => { try { await post(`/api/admin/attendance/sessions/${b.dataset.reopen}/reopen`, {}); await draw(); } catch (err) { fail(err); } }));
    app.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox('이 수업의 출석 기록을 모두 삭제할까요?'))) return;
      try { await del(`/api/admin/attendance/sessions/${b.dataset.del}`); await draw(); } catch (err) { fail(err); }
    }));
    app.querySelectorAll('.ak-cell').forEach((b) => (b.onclick = async () => {
      const next = NEXT[b.dataset.v];
      try { await put('/api/admin/attendance/records', { session_id: Number(b.dataset.s), user_id: Number(b.dataset.u), status: next }); await draw(); } catch (err) { fail(err); }
    }));
    if (open) live(open);
  }

  // 교실 화면: 토큰이 바뀔 때마다 QR을 새로 그리고, 출석한 학생을 보여 준다
  function live(open) {
    let shown = '';
    let full = false;
    const tick = async () => {
      if (!document.body.contains(app.querySelector('#ak-qr') || document.body) && !document.querySelector('.ak-full')) return stop();
      try {
        const r = await get(`/api/admin/attendance/sessions/${open.id}/qr`);
        if (!r.open) { stop(); return draw(); }
        const url = `${location.origin}/#/checkin/${r.id}.${r.token}`;
        if (r.token !== shown) {
          shown = r.token;
          app.querySelector('#ak-qr').innerHTML = qrSvg(url, { px: 260 });
          const big = document.querySelector('.ak-full .ak-bigqr');
          if (big) big.innerHTML = qrSvg(url, { px: Math.min(innerHeight - 220, innerWidth - 40, 620) });
        }
        const n = app.querySelector('#ak-n'); if (n) n.textContent = r.count;
        const who = app.querySelector('#ak-who');
        if (who) who.innerHTML = r.who.map((w) => `<span class="ak-chip">${esc(w.name)}<small>${hhmm(w.at)}</small></span>`).join('') || '<span class="muted">아직 아무도 출석하지 않았어요.</span>';
        const bar = app.querySelector('#ak-left'); if (bar) bar.style.width = `${(r.msLeft / 30000) * 100}%`;
        const fn = document.querySelector('.ak-full .ak-fn'); if (fn) fn.textContent = r.count;
      } catch { /* 다음 주기에 다시 */ }
    };
    tick();
    timer = setInterval(tick, 3000);
    app.querySelector('#ak-full')?.addEventListener('click', () => {
      full = true;
      const el = document.createElement('div');
      el.className = 'ak-full';
      el.innerHTML = `<button class="btn ak-x" aria-label="닫기">✕ 닫기</button><h2>${esc(open.title)}</h2><p>휴대폰 카메라로 QR을 스캔하세요</p><div class="ak-bigqr"></div><p class="ak-fcount"><b class="ak-fn">0</b>명 출석 · QR은 30초마다 바뀝니다</p>`;
      document.body.appendChild(el);
      el.querySelector('.ak-x').onclick = () => { el.remove(); full = false; };
      shown = '';
      tick();
    });
  }
  window.addEventListener('hashchange', stop, { once: true });
  await draw();
}
