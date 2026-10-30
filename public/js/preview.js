// 로그인 없이 보는 1주차 맛보기 (단어·문형·예문만, 저장·퀴즈·작문 없음)
import { state, esc, get, speak } from './core.js';
import { pandaCell } from './panda-art.js';

export async function renderPreview(app, course = 'travel') {
  app.innerHTML = '<div class="page"><div class="empty">불러오는 중…</div></div>';
  let d;
  try {
    d = await get(`/api/preview?course=${encodeURIComponent(course)}`);
  } catch (e) {
    app.innerHTML = `<div class="page"><div class="notice bad">맛보기를 불러오지 못했습니다. (${esc(e.message)})</div><a class="btn" href="#/">처음으로</a></div>`;
    return;
  }
  if (d.notReady) {
    app.innerHTML = `<div class="page"><div class="card" style="text-align:center;padding:40px 20px"><h2>${esc(d.course.name)} · 준비 중</h2><p class="muted">이 과목의 자료를 만들고 있어요. 준비되면 여기에서 맛보기를 볼 수 있습니다.</p><a class="btn" href="#/">처음으로</a></div></div>`;
    return;
  }
  const W = d.week;
  const loginCta = state.me?.googleReady
    ? `<a class="btn primary big" href="/auth/google">구글 계정으로 시작하기</a>`
    : '<span class="btn big" aria-disabled="true" style="opacity:.6">구글 로그인 준비 중</span>';

  app.innerHTML = `
  <div class="page">
    <div class="page-head">
      <div>
        <a href="#/" class="muted" style="text-decoration:none">← 처음으로</a>
        <h1 style="margin-top:6px">맛보기 · ${W.week}주차 ${esc(W.title)} <span class="zh" style="color:var(--accent)">${esc(W.titleZh)}</span></h1>
        <p>🎯 ${esc(W.goal)}</p>
      </div>
      <div class="cta">${loginCta}</div>
    </div>

    <div class="notice info">로그인 없이 1주차 내용을 둘러보는 중입니다. 퀴즈, 작문 첨삭, 학습 기록 저장은 로그인 후에 이용할 수 있습니다. (전체 ${d.total}주 과정)</div>

    <div class="section-title">① 단어 ${W.words.length}개</div>
    <div class="grid2" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">
      ${W.words
        .map(
          (w) => `<div class="card" style="padding:14px">
            <div class="row between" style="align-items:flex-start">
              <div><div class="zh" style="font-size:28px;font-weight:700">${esc(w.hanzi)}</div>
              <div class="py" style="color:var(--muted,#777)">${esc(w.pinyin)}</div></div>
              <button class="btn" data-say="${esc(w.hanzi)}" aria-label="${esc(w.hanzi)} 발음 듣기">🔊</button>
            </div>
            <div style="margin-top:6px">${esc(w.meaning)}</div>
          </div>`,
        )
        .join('')}
      ${pandaCell('hello')}
    </div>

    <div class="section-title">② 핵심 문형 ${W.patterns.length}개</div>
    <div class="grid2">
      ${W.patterns
        .map(
          (p) => `<div class="card">
            <div class="zh" style="font-weight:600">${esc(p.form)}</div>
            <div style="margin-top:4px">${esc(p.explain)}</div>
            ${p.zh ? `<div class="row" style="flex-wrap:nowrap;align-items:flex-start;margin-top:8px"><div style="flex:1"><div class="zh">${esc(p.zh)}</div><div class="muted">${esc(p.ko)}</div></div><button class="btn" data-say="${esc(p.zh)}" aria-label="예문 듣기">🔊</button></div>` : ''}
          </div>`,
        )
        .join('')}
      ${pandaCell('cheer')}
    </div>

    <div class="section-title">예문</div>
    <div class="grid2">
      ${W.examples
        .map(
          (x) => `<div class="card">
            <div class="row" style="flex-wrap:nowrap;align-items:flex-start">
              <div style="flex:1">
                <div class="zh" style="font-size:20px;font-weight:600">${esc(x.zh)}</div>
                <div class="py" style="color:var(--muted,#777)">${esc(x.py)}</div>
                <div style="margin-top:4px">${esc(x.ko)}</div>
              </div>
              <button class="btn" data-say="${esc(x.zh)}" aria-label="예문 듣기">🔊</button>
            </div>
          </div>`,
        )
        .join('')}
      ${pandaCell('smile')}
    </div>

    <div class="section-title">④ 작문 미션 (로그인 후)</div>
    <div class="card">
      <p>${esc(W.mission)}</p>
      <p class="muted" style="font-size:13px">로그인하면 AI 선생님이 문장을 고쳐 주고, 퀴즈와 학습 기록이 저장됩니다.</p>
    </div>

    <div class="row" style="justify-content:center;margin-top:28px">${loginCta}</div>
  </div>`;

  app.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
}
