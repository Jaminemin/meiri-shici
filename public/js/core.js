// 화면 공통 도우미
export const state = { me: null, project: null, view: null };

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function api(method, path, body, { raw = false } = {}) {
  const init = { method, headers: { 'x-ms': '1' }, credentials: 'same-origin' };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['content-type'] = 'application/json';
  }
  let r;
  try {
    r = await fetch(path, init);
  } catch {
    throw new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.');
  }
  if (raw) {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `오류 ${r.status}`);
    return r;
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && data.code === 'login') {
    location.hash = '#/';
    throw new Error('로그인이 필요합니다.');
  }
  if (r.status === 403 && ['pending', 'rejected', 'suspended'].includes(data.code)) {
    location.hash = '#/pending';
    throw new Error(data.error);
  }
  if (!r.ok) {
    const e = new Error(data.error || `오류가 났습니다 (${r.status}).`);
    e.code = data.code;
    throw e;
  }
  return data;
}

export const get = (p) => api('GET', p);
export const post = (p, b = {}) => api('POST', p, b);
export const patch = (p, b) => api('PATCH', p, b);
export const put = (p, b) => api('PUT', p, b);
export const del = (p) => api('DELETE', p);

export function toast(msg, kind = '') {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 7000 : 3500);
}

export function fail(e) {
  console.error(e);
  toast(e.message || String(e), 'bad');
}

// 버튼을 누르는 동안 돌아가는 표시
export async function busy(btn, fn, label) {
  if (!btn) return fn();
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin"></span>${esc(label || '처리 중…')}`;
  try {
    return await fn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = old;
  }
}

export function modal(html, { wide = false, onClose } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => {
    bg.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  bg.addEventListener('mousedown', (e) => e.target === bg && close());
  bg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.body.append(bg);
  bg.querySelector('input,textarea,select,button.primary')?.focus();
  return { el: bg.querySelector('.modal'), close };
}

export function confirmBox(message, { ok = '확인', danger = false } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal(`<p style="white-space:pre-wrap">${esc(message)}</p><div class="row end"><button class="btn" data-close>취소</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button></div>`, {
      onClose: () => !done && resolve(false),
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => {
      done = true;
      m.close();
      resolve(true);
    });
  });
}

const loaded = new Map();
export function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = res;
        s.onerror = () => {
          loaded.delete(src);
          rej(new Error('필요한 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'));
        };
        document.head.append(s);
      }),
    );
  }
  return loaded.get(src);
}

// 중국 본토(zh-CN) 음성 중 자연스럽다고 알려진 것을 우선 고른다.
const PREFERRED_ZH = [/Xiaoxiao|Yunxi|Yunyang|Xiaoyi|Yunjian|Xiaochen|Xiaomo|Xiaohan|Xiaorui|Xiaoshuang|Xiaoyou/i, /Google 普通话|Google.*Mandarin/i, /Ting-Ting|Tingting/i];
let zhVoice = null;
function pickZhVoice() {
  const all = speechSynthesis.getVoices();
  const zh = all.filter((x) => /^zh[-_]CN/i.test(x.lang));
  const pool = zh.length ? zh : all.filter((x) => /^zh/i.test(x.lang));
  if (!pool.length) return null;
  for (const re of PREFERRED_ZH) {
    const hit = pool.find((x) => re.test(x.name));
    if (hit) return hit;
  }
  return pool[0];
}
// 음성 목록은 비동기로 로드되므로, 로드되면 한 번 골라 둔다.
try {
  if ('speechSynthesis' in window) {
    zhVoice = pickZhVoice();
    speechSynthesis.addEventListener('voiceschanged', () => (zhVoice = pickZhVoice()));
  }
} catch {
  /* 무시 */
}

export function speak(text) {
  try {
    if (!('speechSynthesis' in window)) throw new Error('no speech');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    u.pitch = 1;
    zhVoice = zhVoice || pickZhVoice();
    if (zhVoice) u.voice = zhVoice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    if (!zhVoice) toast('이 기기에는 중국어 음성이 없어 기본 음성으로 읽습니다.', 'bad');
  } catch {
    toast('이 브라우저에서는 발음 듣기를 쓸 수 없습니다.', 'bad');
  }
}

export const LIBS = {
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  jszip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
  gapi: 'https://apis.google.com/js/api.js',
};

export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  const o = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' };
  if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('ko-KR', o).replace(/\.\s?$/, '');
}

export function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}일 전`;
  return fmtDate(iso);
}

export function relDots(n) {
  n = Number(n) || 0;
  if (!n) return '<span class="muted" style="font-size:12px">미평가</span>';
  return `<span class="rel" title="내 논문과의 관련도 ${n}/5" aria-label="관련도 ${n}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span> <small class="rel-n">${n}/5</small>`;
}

export function chars(s) {
  return String(s || '').replace(/^#+\s.*$/gm, '').replace(/\s/g, '').length;
}

export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(new Error('파일을 읽지 못했습니다.'));
    r.readAsDataURL(file);
  });
}

export function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function downloadFile(path, name) {
  const r = await api('GET', path, undefined, { raw: true });
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name || 'download';
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

export function driveLink(link, label = '드라이브에서 열기') {
  if (!link) return state.me?.user?.demo ? '<span class="muted" style="font-size:12px">체험 모드(드라이브 없음)</span>' : '';
  return `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
}

export const ICONS = {
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  collect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
  library: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 14-4-1"/></svg>',
  ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l2.2 5.3L20 10l-5.8 1.7L12 17l-2.2-5.3L4 10l5.8-1.7z"/><path d="M19 17l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>',
  write: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
};
