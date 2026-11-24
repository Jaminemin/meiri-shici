// 모션 연출 모음: 한자 쓰기 · 정답 터짐/연속 정답 · 숫자 올라가기 · 주차 완료 도장
// '동작 줄이기'를 켠 사용자에게는 움직임 없이 결과만 보여 준다.
import { esc } from './core.js';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6'];

// 한자를 한 글자씩 붓으로 쓰듯 나타낸다(글자마다 왼쪽에서 오른쪽으로 번지며 채워짐). 같은 요소에 다시 부르면 다시 쓴다.
export function writeIn(el, { delay = 0, step = 0.42 } = {}) {
  if (!el) return;
  const text = el.dataset.text || el.textContent;
  el.dataset.text = text;
  if (reduced()) { el.textContent = text; return; }
  el.setAttribute('aria-label', text);
  el.innerHTML = [...text].map((c, i) => `<span class="wi" aria-hidden="true" style="--d:${(delay + i * step).toFixed(2)}s">${esc(c)}</span>`).join('');
}

// 정답일 때 색 조각이 터진다. host는 position이 있는 요소
export function burst(host, { n = 24 } = {}) {
  if (!host || reduced()) return;
  const fx = document.createElement('div');
  fx.className = 'fx';
  fx.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const r = 90 + Math.random() * 130;
    const p = document.createElement('i');
    p.className = 'bp';
    p.style.cssText = `--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r - 40}px;--r:${Math.round(Math.random() * 540 - 270)}deg;--bc:${COLORS[i % COLORS.length]};animation-delay:${(Math.random() * 0.08).toFixed(2)}s`;
    fx.appendChild(p);
  }
  host.appendChild(fx);
  setTimeout(() => fx.remove(), 1300);
}

// 숫자가 0에서 올라가며 세어진다
export function countUp(el, to, ms = 800) {
  if (!el) return;
  to = Number(to) || 0;
  if (reduced() || to <= 0) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 주차 완료: 단계마다 도장이 차례로 찍히고, 마지막에 큰 완성 도장과 색 조각이 터진다
export function celebrate(title, steps = ['단어', '퀴즈', '작문']) {
  document.querySelector('.cele')?.remove();
  const el = document.createElement('div');
  el.className = 'cele';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `${title} 완료`);
  const stamps = steps.map((s, i) => `<span class="cele-st" style="--d:${(0.35 + i * 0.4).toFixed(2)}s">${esc(s)} ✓</span>`).join('');
  const bigAt = 0.35 + steps.length * 0.4 + 0.1;
  el.innerHTML = `<div class="cele-card"><div class="cele-title">${esc(title)}</div><div class="cele-row">${stamps}</div>
    <div class="cele-seal" style="--d:${bigAt.toFixed(2)}s">完成</div><div class="cele-sub">수고했어요! 다음 주차도 이어서 해 봐요</div><button class="btn primary" type="button">닫기</button></div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  el.querySelector('button').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
  if (!reduced()) setTimeout(() => burst(el.querySelector('.cele-card'), { n: 36 }), bigAt * 1000 + 150);
  el.querySelector('button').focus();
  setTimeout(close, 9000);
}
