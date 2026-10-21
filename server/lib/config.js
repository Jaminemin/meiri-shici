// 환경 변수 읽기. Railway의 Variables 탭에서 설정한다.
import crypto from 'node:crypto';

const raw = process.env;
// 붙여 넣을 때 섞인 앞뒤 빈칸·줄바꿈 제거
const env = new Proxy(raw, { get: (t, k) => (typeof t[k] === 'string' ? t[k].trim() : t[k]) });
const port = Number(env.PORT || 3000);

let sessionSecret = env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[설정] SESSION_SECRET이 없어 임시 값을 씁니다. Railway에서는 반드시 설정하세요.');
}
const railwayDomain = env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : '';

export const config = {
  port,
  baseUrl: (env.APP_BASE_URL || railwayDomain || `http://localhost:${port}`).replace(/\/$/, ''),
  sessionSecret,
  databaseUrl: env.DATABASE_URL || '',
  adminEmails: String(env.ADMIN_EMAILS || '').split(/[,\s]+/).map((x) => x.toLowerCase()).filter(Boolean),
  google: { clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '' },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY || '',
    model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    baseUrl: (env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
  },
  aiDailyLimit: Number(env.AI_DAILY_LIMIT || 30),
};
config.google.redirectUri = env.GOOGLE_REDIRECT_URI || `${config.baseUrl}/auth/google/callback`;
config.googleReady = Boolean(config.google.clientId && config.google.clientSecret);
config.aiReady = Boolean(config.anthropic.apiKey);
