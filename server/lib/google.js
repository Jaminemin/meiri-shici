// 구글 로그인(OAuth 2.0). 이름·이메일·사진만 받는다.
import { config } from './config.js';
import { HttpError } from './util.js';

export function authUrl(state) {
  const p = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.google.clientId, client_secret: config.google.clientSecret, code, redirect_uri: config.google.redirectUri, grant_type: 'authorization_code' }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error('[구글 로그인 오류]', r.status, JSON.stringify(data).slice(0, 300));
    throw new HttpError(401, '구글 인증에 실패했습니다. 다시 로그인해 주세요.', 'google_auth');
  }
  return data;
}

export async function fetchUserInfo(accessToken) {
  const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new HttpError(401, '구글 계정 정보를 읽지 못했습니다.', 'google_auth');
  return r.json();
}
