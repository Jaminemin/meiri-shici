// 세션: 서버에 저장하지 않고 암호화한 쿠키에 담는다 (Railway 재배포에도 로그인 유지)
import crypto from 'node:crypto';
import { config } from './config.js';

const COOKIE = 'ms_s';
const MAX_AGE = 30 * 24 * 3600; // 30일

function key() {
  return crypto.createHash('sha256').update(config.sessionSecret).digest();
}

export function seal(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}

export function unseal(token) {
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    const out = Buffer.concat([d.update(buf.subarray(28)), d.final()]);
    return JSON.parse(out.toString('utf8'));
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieAttrs(maxAge) {
  const secure = config.baseUrl.startsWith('https://') ? '; Secure' : '';
  return `; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function readSession(req) {
  const raw = parseCookies(req)[COOKIE];
  return raw ? unseal(raw) : null;
}

export function sessionCookie(obj) {
  return `${COOKIE}=${seal(obj)}${cookieAttrs(MAX_AGE)}`;
}

export function clearCookie() {
  return `${COOKIE}=${cookieAttrs(0)}`;
}

// OAuth state 같은 짧은 값용 쿠키
export function tempCookie(name, value, maxAge = 600) {
  return `${name}=${encodeURIComponent(value)}${cookieAttrs(maxAge)}`;
}
