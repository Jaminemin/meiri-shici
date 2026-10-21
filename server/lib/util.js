// 공통 도우미: 응답, 본문 읽기, 오류, 날짜, 텍스트 처리
import crypto from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'error';
  }
}

export function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

export function redirect(res, location, headers = {}) {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
}

const MAX_BODY = 40 * 1024 * 1024; // 40MB (base64로 보낸 원문 파일 포함)

export async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, '파일이 너무 큽니다. 30MB 이하의 파일만 올릴 수 있습니다.', 'too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, '요청 형식이 올바르지 않습니다.', 'bad_json');
  }
}

export function newId(prefix) {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}_${ymd}_${crypto.randomBytes(4).toString('hex')}`;
}

export const nowIso = () => new Date().toISOString();

export function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function stamp() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}_${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

// 파일·폴더 이름에 쓸 수 없는 문자 정리
export function safeName(name, max = 80) {
  const s = String(name || '').replace(/[\\/:*?"<>|#^\[\]\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  return (s || '제목없음').slice(0, max).trim();
}

export function clampStr(v, max) {
  return String(v ?? '').slice(0, max);
}

export function toArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
