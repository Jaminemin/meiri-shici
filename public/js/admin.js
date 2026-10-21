// 관리자: 대시보드, 회원 승인·관리, 회원 상세, 작문 모아 보기
import { state, esc, get, post, put, del, fail, toast, busy, confirmBox, fmtDate, ago } from './core.js';
import { feedbackHtml } from './fb.js';
import { weekCards, heatmap } from './home.js';

const ST = { approved: ['승인', 'accent'], pending: ['승인 대기', 'warn'], rejected: ['거절', 'bad'], suspended: ['정지', 'bad'] };
const badge = (s) => `<span class="badge ${ST[s]?.[1] || ''}">${ST[s]?.[0] || esc(s)}</span>`;
const avatar = (u) => `<span class="avatar">${u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc((u.name || '?').slice(0, 1))}</span>`;

function adminTabs(active) {
  return `<div class="tabs">${[
    ['', '대시보드'],
    ['users', '회원 관리'],
    ['writings', '작문·첨삭'],
  ]
    .map(([k, l]) => `<button onclick="location.hash='#/admin${k ? '/' + k : ''}'" class="${active === k ? 'on' : ''}">${l}</button>`)
    .join('')}</div>`;
}

function vbars(entries, { height = 150, unit = '명' } = {}) {
  const w = 480;
  const pad = { l: 6, r: 6, t: 18, b: 24 };
  const max = Math.max(1, ...entries.map((e) => e[1]));
  const bw = (w - pad.l - pad.r) / Math.max(1, entries.length);
  const barW = Math.max(6, Math.min(34, bw - 6));
  const ih = height - pad.t - pad.b;
  return `<svg viewBox="0 0 ${w} ${height}" style="width:100%;height:auto" role="img">${entries
    .map(([k, v], i) => {
      const x = pad.l + i * bw + (bw - barW) / 2;
      const h = v ? Math.max(3, (v / max) * ih) : 0;
      const y = pad.t + ih - h;
      return `<g><title>${esc(k)}: ${v}${unit}</title><rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="var(--bar)"/>${v ? `<text x="${x + barW / 2}" y="${y - 4}" text-anchor="middle" font-size="11" fill="var(--ink)" font-weight="700">${v}</text>` : ''}<text x="${x + barW / 2}" y="${height - 8}" text-anchor="middle" font-size="11" fill="var(--ink-2)">${esc(k)}</text></g>`;
    })
    .join('')}<line x1="${pad.l}" x2="${w - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}" stroke="var(--line)"/></svg>`;
}

async function act(id, action, extra = {}) {
  await post(`/api/admin/users/${id}`, { action, ...extra });
}

export async function renderAdmin(app) {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  const o = await get('/api/admin/overview');
  state.pendingCount = o.counts.pending;
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() + 9 * 3600 * 1000);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const daily = days.map((d) => [d.slice(8), o.daily.find((x) => x.d === d)?.n || 0]);
  app.innerHTML = `<div class="page">
    <div class="page-head"><div><h1>관리자 대시보드</h1><p>회원 승인과 학습 현황을 한눈에 봅니다.</p></div>
      <div class="row"><span class="muted" style="font-size:13px">가입 방식</span>
        <div class="switch" role="group" aria-label="가입 방식"><button data-mode="manual" class="${o.approvalMode === 'manual' ? 'on' : ''}">관리자 승인</button><button data-mode="auto" class="${o.approvalMode === 'auto' ? 'on' : ''}">자동 승인(개방형)</button></div></div></div>
    ${adminTabs('')}
    <div class="stats">
      <div class="stat"><div class="label">전체 회원</div><div class="value">${o.counts.total}</div><div class="sub">승인 ${o.counts.approved} · 거절 ${o.counts.rejected} · 정지 ${o.counts.suspended}</div></div>
      <div class="stat" style="${o.counts.pending ? 'border-color:var(--accent)' : ''}"><div class="label">승인 대기 🔔</div><div class="value" style="${o.counts.pending ? 'color:var(--accent)' : ''}">${o.counts.pending}</div><div class="sub">새 가입 신청</div></div>
      <div class="stat"><div class="label">최근 7일 활동 회원</div><div class="value">${o.counts.active7}</div></div>
      <div class="stat"><div class="label">AI 첨삭</div><div class="value">${o.writings.n}</div><div class="sub">평균 ${o.writings.avg ?? '–'}점</div></div>
    </div>
    <div class="card"><div class="card-head"><h2>가입 승인 대기 ${o.pending.length ? `<span class="badge warn">${o.pending.length}</span>` : ''}</h2>${o.pending.length > 1 ? '<button class="btn small primary" id="approve-all">모두 승인</button>' : ''}</div>
      ${o.pending.map((u) => `<div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="user-row">${avatar(u)}<div><b>${esc(u.name)}</b><div class="muted" style="font-size:13px">${esc(u.email)} · ${ago(u.created_at)} 신청</div></div></div>
        <div class="row"><button class="btn small primary" data-act="approve" data-id="${u.id}">승인</button><button class="btn small danger" data-act="reject" data-id="${u.id}">거절</button></div></div>`).join('') || '<div class="empty" style="padding:16px">대기 중인 가입 신청이 없습니다.</div>'}
    </div>
    <div class="charts">
      <div class="card"><h3>주차별 완료 인원</h3>${vbars(o.weekDone.map((w) => [String(w.week), w.done]))}<small class="muted">막대 위 숫자 = 그 주차를 모두 마친 회원 수</small></div>
      <div class="card"><h3>최근 14일 학습한 회원 수</h3>${vbars(daily)}<small class="muted">날짜(일) 기준 · 단어·퀴즈·작문 중 하나라도 한 회원</small></div>
    </div>
    <div class="card"><h3>최근 활동</h3>${o.recent.map((a) => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line);font-size:14px"><span><b>${esc(a.action)}</b> · ${esc(a.name || '')} <span class="muted">${esc(a.detail)}</span></span><span class="muted" style="font-size:12px">${ago(a.at)}</span></div>`).join('') || '<div class="empty">기록이 없습니다.</div>'}</div>
  </div>`;
  app.querySelectorAll('[data-act]').forEach(
    (b) =>
      (b.onclick = () =>
        busy(b, async () => {
          await act(b.dataset.id, b.dataset.act);
          toast(b.dataset.act === 'approve' ? '승인했습니다.' : '거절했습니다.');
          renderAdmin(app);
        }).catch(fail)),
  );
  const aa = app.querySelector('#approve-all');
  if (aa)
    aa.onclick = () =>
      busy(aa, async () => {
        for (const u of o.pending) await act(u.id, 'approve');
        toast(`${o.pending.length}명을 승인했습니다.`);
        renderAdmin(app);
      }).catch(fail);
  app.querySelectorAll('[data-mode]').forEach(
    (b) =>
      (b.onclick = async () => {
        if (b.dataset.mode === o.approvalMode) return;
        if (b.dataset.mode === 'auto' && !(await confirmBox('자동 승인(개방형)으로 바꿀까요?\n앞으로 구글로 가입하는 누구나 바로 학습할 수 있습니다. 이미 대기 중인 신청은 그대로 남습니다.'))) return;
        await put('/api/admin/settings', { approvalMode: b.dataset.mode }).catch(fail);
        toast(b.dataset.mode === 'auto' ? '자동 승인(개방형)으로 바꿨습니다.' : '관리자 승인 방식으로 바꿨습니다.');
        renderAdmin(app);
      }),
  );
}

let filter = 'all';
let q = '';
export async function renderAdminUsers(app) {
  const d = await get('/api/admin/users');
  const draw = () => {
    const list = d.users.filter((u) => (filter === 'all' || u.status === filter) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())));
    const cnt = (s) => d.users.filter((u) => s === 'all' || u.status === s).length;
    app.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>회원 관리</h1><p>승인·거절·정지와 관리자 지정을 할 수 있습니다. 이름을 누르면 학습 기록을 봅니다.</p></div><a class="btn" href="/api/admin/export.csv">엑셀(CSV)로 내려받기</a></div>
      ${adminTabs('users')}
      <div class="row between" style="margin-bottom:12px"><div class="switch">${[['all', '전체'], ['pending', '승인 대기'], ['approved', '승인'], ['suspended', '정지'], ['rejected', '거절']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l} ${cnt(k)}</button>`).join('')}</div>
        <input type="search" id="q" placeholder="이름·이메일 검색" value="${esc(q)}" style="max-width:240px"></div>
      <div class="table-wrap"><table class="list"><thead><tr><th>회원</th><th>상태</th><th class="num">완료 주차</th><th class="num hide-sm">외운 단어</th><th class="num hide-sm">작문</th><th class="hide-sm">가입</th><th class="hide-sm">최근 활동</th><th>관리</th></tr></thead>
      <tbody>${list
        .map(
          (u) => `<tr><td><a class="user-row" href="#/admin/users/${u.id}" style="text-decoration:none;color:inherit">${avatar(u)}<div><b>${esc(u.name)}</b> ${u.role === 'admin' ? '<span class="badge accent">관리자</span>' : ''}<div class="muted" style="font-size:12px">${esc(u.email)}</div></div></a></td>
          <td>${badge(u.status)}</td><td class="num">${u.done_weeks}/${d.totalWeeks}</td><td class="num hide-sm">${u.words}</td><td class="num hide-sm">${u.writings}</td>
          <td class="hide-sm muted" style="font-size:12px">${fmtDate(u.created_at)}</td><td class="hide-sm muted" style="font-size:12px">${ago(u.last_active_at) || '–'}</td>
          <td><div class="row" style="gap:4px;flex-wrap:nowrap">${actions(u)}</div></td></tr>`,
        )
        .join('') || '<tr><td colspan="8" class="empty">해당하는 회원이 없습니다.</td></tr>'}</tbody></table></div></div>`;
    app.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => ((filter = b.dataset.f), draw())));
    const qi = app.querySelector('#q');
    qi.oninput = () => {
      q = qi.value;
      const pos = qi.selectionStart;
      draw();
      const n = app.querySelector('#q');
      n.focus();
      n.setSelectionRange(pos, pos);
    };
    bindActions(app, () => renderAdminUsers(app));
  };
  draw();
}

function actions(u) {
  const me = state.me.user.id === u.id;
  const b = (a, l, cls = '') => `<button class="btn small ${cls}" data-act="${a}" data-id="${u.id}" data-name="${esc(u.name)}">${l}</button>`;
  if (u.status === 'pending') return b('approve', '승인', 'primary') + b('reject', '거절', 'danger');
  if (me) return '<span class="muted" style="font-size:12px">나</span>';
  const out = [];
  if (u.status === 'approved') out.push(b('suspend', '정지', 'danger'));
  if (u.status === 'suspended' || u.status === 'rejected') out.push(b('restore', '승인', 'primary'));
  out.push(u.role === 'admin' ? b('make_student', '관리자 해제') : b('make_admin', '관리자로'));
  out.push(b('delete', '삭제', 'ghost danger'));
  return out.join('');
}

function bindActions(app, after) {
  app.querySelectorAll('[data-act]').forEach(
    (btn) =>
      (btn.onclick = async () => {
        const a = btn.dataset.act;
        const name = btn.dataset.name;
        const ask = { suspend: `${name}님의 이용을 정지할까요?`, make_admin: `${name}님을 관리자로 지정할까요?\n관리자는 회원 승인·삭제를 할 수 있습니다.`, delete: `${name}님을 삭제할까요?\n학습 기록과 작문이 모두 지워지며 되돌릴 수 없습니다.`, reject: `${name}님의 가입을 거절할까요?` }[a];
        if (ask && !(await confirmBox(ask, { ok: '확인', danger: ['suspend', 'delete', 'reject'].includes(a) }))) return;
        try {
          if (a === 'delete') await del(`/api/admin/users/${btn.dataset.id}`);
          else await act(btn.dataset.id, a);
          toast('처리했습니다.');
          after();
        } catch (e) {
          fail(e);
        }
      }),
  );
}

export async function renderAdminUser(app, ctx) {
  const d = await get(`/api/admin/users/${ctx.id}`);
  const u = d.user;
  const current = d.weeks.find((w) => !w.done)?.week;
  app.innerHTML = `<div class="page">
    <a href="#/admin/users" class="muted" style="text-decoration:none">← 회원 관리</a>
    <div class="page-head" style="margin-top:8px"><div class="user-row">${avatar(u).replace('avatar', 'avatar" style="width:48px;height:48px;font-size:20px')}<div><h1 style="margin:0">${esc(u.name)} ${badge(u.status)} ${u.role === 'admin' ? '<span class="badge accent">관리자</span>' : ''}</h1><p>${esc(u.email)} · 가입 ${fmtDate(u.createdAt)} · 최근 로그인 ${ago(u.lastLoginAt) || '–'}</p></div></div>
      <div class="row">${actions({ ...u, created_at: u.createdAt })}</div></div>
    <div class="stats">
      <div class="stat"><div class="label">완료 주차</div><div class="value">${d.weeks.filter((w) => w.done).length}/${d.weeks.length}</div></div>
      <div class="stat"><div class="label">외운 단어</div><div class="value">${d.weeks.reduce((a, w) => a + w.words, 0)}</div></div>
      <div class="stat"><div class="label">연속 학습일</div><div class="value">${d.streak.streak}일</div><div class="sub">총 ${d.streak.totalDays}일</div></div>
      <div class="stat"><div class="label">작문</div><div class="value">${d.writings.length}</div></div>
    </div>
    <div class="grid2" style="gap:16px"><div class="card"><h3>최근 4주 학습</h3>${heatmap(d.streak.days)}</div>
      <div class="card"><h3>관리자 메모</h3><textarea id="memo" rows="3" placeholder="이 회원에 대한 메모(회원에게는 보이지 않음)">${esc(u.memo || '')}</textarea><div class="row end" style="margin-top:8px"><button class="btn small" id="memo-save">메모 저장</button></div></div></div>
    <div class="card"><h3>15주 진도</h3>${weekCards(d.weeks, current, { link: false })}</div>
    <h3>작문과 AI 첨삭</h3>${d.writings.map((w) => feedbackHtml(w)).join('') || '<div class="empty">작문이 없습니다.</div>'}
    <div class="card"><h3>활동 기록</h3>${d.activity.map((a) => `<div class="row between" style="padding:6px 0;border-bottom:1px solid var(--line);font-size:14px"><span><b>${esc(a.action)}</b> <span class="muted">${esc(a.detail)}</span></span><span class="muted" style="font-size:12px">${fmtDate(a.at, true)}</span></div>`).join('') || '<div class="empty">기록이 없습니다.</div>'}</div>
  </div>`;
  bindActions(app, () => renderAdminUser(app, ctx));
  app.querySelector('#memo-save').onclick = (e) =>
    busy(e.currentTarget, async () => {
      await act(u.id, 'memo', { memo: app.querySelector('#memo').value });
      toast('메모를 저장했습니다.');
    }).catch(fail);
}

export async function renderAdminWritings(app) {
  const d = await get('/api/admin/writings');
  app.innerHTML = `<div class="page"><div class="page-head"><div><h1>작문·첨삭 모아 보기</h1><p>회원들이 제출한 작문과 AI 첨삭 결과(최근 100건)입니다.</p></div></div>
    ${adminTabs('writings')}
    ${d.writings.map((w) => `<div><a href="#/admin/users/${w.user_id}" class="muted" style="font-size:13px">${esc(w.name)} (${esc(w.email)}) →</a>${feedbackHtml(w)}</div>`).join('') || '<div class="empty">아직 작문이 없습니다.</div>'}</div>`;
}
