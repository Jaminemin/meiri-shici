// 이번 주 문장: 한 줄 두 문장 + 번호(회색 동그라미) + 가리기 / 외우기
import { esc } from './core.js';

const KEY = (k) => `ms_exmem_${k}`;
function load(k) {
  try { return new Set(JSON.parse(localStorage.getItem(KEY(k)) || '[]')); } catch { return new Set(); }
}
function save(k, set) {
  try { localStorage.setItem(KEY(k), JSON.stringify([...set])); } catch { /* 저장 불가여도 화면은 동작 */ }
}

// examples: [{zh,py,ko}], key: 저장용 이름(예: 'w1', 'preview')
export function exGridHtml(examples, key, aria = '듣기') {
  const mem = load(key);
  const items = examples.map((e, i) => `<div class="example${mem.has(i) ? ' mem' : ''}" data-i="${i}"><span class="ex-n">${i + 1}</span>
    <div class="row" style="flex:1;min-width:0;flex-wrap:nowrap;align-items:flex-start"><div class="ex-text" style="flex:1;min-width:0"><div class="zh">${esc(e.zh)}</div><div class="py">${esc(e.py)}</div><div class="muted ko">${esc(e.ko)}</div></div>
      <div class="ex-tools"><button class="speak" data-speak="${esc(e.zh)}" aria-label="${aria}">🔊</button><button class="ex-mem" data-ex-mem="${i}" aria-label="외웠어요" aria-pressed="${mem.has(i)}">✓</button></div></div></div>`).join('');
  return `<div class="ex-wrap" data-exkey="${esc(key)}" data-total="${examples.length}">
    <div class="ex-bar"><button class="btn small" data-ex-hide aria-pressed="false">가리기</button><span class="muted ex-count">외운 문장 <b>${mem.size}</b>/${examples.length}</span></div>
    <div class="ex-grid">${items}</div></div>`;
}

export function bindExGrids(root) {
  root.querySelectorAll('.ex-wrap:not([data-bound])').forEach((w) => {
    w.dataset.bound = '1';
    const key = w.dataset.exkey, total = Number(w.dataset.total);
    const mem = load(key);
    const refresh = () => {
      w.querySelectorAll('.example').forEach((el) => {
        const on = mem.has(Number(el.dataset.i));
        el.classList.toggle('mem', on);
        el.querySelector('.ex-mem')?.setAttribute('aria-pressed', String(on));
      });
      w.querySelector('.ex-count b').textContent = mem.size;
    };
    w.addEventListener('click', (e) => {
      const hide = e.target.closest('[data-ex-hide]');
      if (hide) {
        const on = !w.classList.contains('hide');
        w.classList.toggle('hide', on);
        hide.setAttribute('aria-pressed', String(on));
        hide.textContent = on ? '보이기' : '가리기';
        w.querySelectorAll('.example.peek').forEach((x) => x.classList.remove('peek'));
        return;
      }
      const m = e.target.closest('[data-ex-mem]');
      if (m) {
        const i = Number(m.dataset.exMem);
        mem.has(i) ? mem.delete(i) : mem.add(i);
        save(key, mem);
        refresh();
        return;
      }
      if (e.target.closest('.speak')) return;
      const t = e.target.closest('.example');
      if (t && w.classList.contains('hide')) t.classList.toggle('peek'); // 가린 상태에서 문장을 누르면 그 문장만 보임
    });
  });
}
