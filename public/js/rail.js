// 왼쪽 학습 메뉴(레일): 주차 화면을 섹션별로 나눠 한 화면씩 보여 준다.
// 맛보기(preview.js)와 로그인 후 숏폼 주차(week.js)가 같이 쓴다.
import { esc } from './core.js';

let lastY = 0; // 직전 강조 위치 — 다시 그려도 표시 막대가 미끄러지듯 움직이게

export function railHtml({ title = '', sub = '', items, active, doneCount = 0, attr = 'data-rail', foot = '', label = '진행', total: tot = 0, track = true }) {
  const total = tot || items.filter((i) => !i.locked).length || 1;
  const pct = Math.round((doneCount / total) * 100);
  return `<nav class="rail" aria-label="${esc(title)} 학습 메뉴">
    <div class="rail-head" aria-hidden="false">
      <i class="rail-blob b1"></i><i class="rail-blob b2"></i>
      <div class="rail-title">${esc(title)}</div>
      ${sub ? `<div class="rail-sub zh">${esc(sub)}</div>` : ''}
      ${track ? `<div class="rail-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${doneCount}" aria-label="${esc(label)}"><i style="--p:${pct}%"></i></div>
      <div class="rail-prog-t">${esc(label)} <b>${doneCount}</b>/${total}</div>` : ''}
    </div>
    <div class="rail-list" role="tablist" aria-orientation="vertical">
      <span class="rail-ind" aria-hidden="true"></span>
      ${items
        .map(
          (it, i) => `<button type="button" role="tab" class="rail-i${it.key === active ? ' on' : ''}${it.done ? ' done' : ''}${it.locked ? ' lock' : ''}" ${attr}="${esc(it.go || it.key)}" data-key="${esc(it.key)}" aria-selected="${it.key === active}" style="--i:${i}">
          <span class="rail-ic" aria-hidden="true">${it.icon}</span>
          <span class="rail-tx"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
          <span class="rail-ck" aria-hidden="true">${it.locked ? '🔒' : '✓'}</span>
        </button>`,
        )
        .join('')}
    </div>
    ${foot ? `<div class="rail-foot">${foot}</div>` : ''}
  </nav>`;
}

// 강조 막대를 활성 항목 위치로 옮긴다 (이전 위치에서 미끄러짐)
export function placeIndicator(root) {
  const list = root.querySelector('.rail-list');
  const on = list?.querySelector('.rail-i.on');
  const ind = list?.querySelector('.rail-ind');
  if (!on || !ind) return;
  const y = on.offsetTop;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const horizontal = getComputedStyle(list).flexDirection === 'row';
  if (horizontal) {
    ind.style.cssText = `transform:translateX(${on.offsetLeft}px);width:${on.offsetWidth}px;height:${on.offsetHeight}px;top:0`;
    on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    return;
  }
  ind.style.cssText = `height:${on.offsetHeight}px;transition:none;transform:translateY(${reduce ? y : lastY}px)`;
  void ind.offsetWidth;
  ind.style.transition = '';
  ind.style.transform = `translateY(${y}px)`;
  lastY = y;
}

// 이전·다음 이동 줄
export function pagerHtml(items, key, attr = 'data-rail-go') {
  const i = items.findIndex((x) => x.key === key);
  const prev = items[i - 1];
  const next = items.slice(i + 1).find((x) => !x.locked);
  return `<div class="rail-pn">${prev && !prev.locked ? `<button type="button" class="btn" ${attr}="${esc(prev.go || prev.key)}">← ${esc(prev.label)}</button>` : '<span></span>'}${next ? `<button type="button" class="btn primary" ${attr}="${esc(next.go || next.key)}">다음: ${esc(next.label)} →</button>` : ''}</div>`;
}

// 맛보기용: 패널 전환. root 안의 [data-panel]을 하나씩 보여 준다.
export function mountRail(root, { onShow, keys, track = true }) {
  const seen = new Set();
  const show = (key, { focus = false } = {}) => {
    root.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== key; });
    root.querySelectorAll('.rail-i').forEach((b) => {
      const on = b.dataset.key === key;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    seen.add(key);
    if (track) {
    const real = keys.filter((k) => k.real);
    const n = real.filter((k) => seen.has(k.key)).length;
    const pbar = root.querySelector('.rail-prog i');
    if (pbar) pbar.style.setProperty('--p', `${Math.round((n / real.length) * 100)}%`);
    const pt = root.querySelector('.rail-prog-t b');
    if (pt) pt.textContent = n;
    root.querySelectorAll('.rail-i').forEach((b) => b.classList.toggle('done', seen.has(b.dataset.key) && !b.classList.contains('lock')));
    }
    placeIndicator(root);
    onShow?.(key);
    if (focus) {
      const top = root.querySelector('.rail-shell')?.getBoundingClientRect().top + scrollY - 72;
      if (scrollY > top) scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rail],[data-rail-go]');
    if (b) show(b.dataset.rail || b.dataset.railGo, { focus: true });
  });
  root.querySelector('.rail-list')?.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const btns = [...root.querySelectorAll('.rail-i')];
    const i = btns.findIndex((b) => b.classList.contains('on'));
    const j = Math.max(0, Math.min(btns.length - 1, i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1)));
    e.preventDefault();
    btns[j].focus();
    show(btns[j].dataset.key);
  });
  window.addEventListener('resize', () => placeIndicator(root), { passive: true });
  show(keys[0].key);
}
