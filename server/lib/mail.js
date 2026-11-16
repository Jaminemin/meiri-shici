// 가입 신청 알림 메일. 외부 패키지 없이 SMTP(SSL, 465)로 보낸다.
// Railway Variables: SMTP_HOST, SMTP_PORT(기본 465), SMTP_USER, SMTP_PASS, SMTP_FROM(선택), SIGNUP_NOTIFY_TO
import net from 'node:net';
import tls from 'node:tls';
import { config } from './config.js';

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const headerWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

export const mailReady = () => Boolean(config.smtp.host && config.smtp.user && config.smtp.pass && config.notifyTo.length);

// SMTP 한 번 주고받기: 응답 코드가 기대한 값이 아니면 멈춘다.
function smtpSession(socket) {
  let buf = '';
  const waiters = [];
  socket.setEncoding('utf8');
  socket.on('data', (d) => {
    buf += d;
    let m;
    // 여러 줄 응답(250-...)은 마지막 줄(250 ...)이 올 때까지 모은다
    while ((m = /^(\d{3}) .*\r?\n/m.exec(buf))) {
      const end = m.index + m[0].length;
      const text = buf.slice(0, end);
      buf = buf.slice(end);
      const w = waiters.shift();
      if (w) w.resolve({ code: Number(m[1]), text });
    }
  });
  const fail = (e) => { while (waiters.length) waiters.shift().reject(e); };
  socket.on('error', fail);
  socket.on('close', () => fail(new Error('SMTP 연결이 끊겼습니다.')));
  const read = () => new Promise((resolve, reject) => waiters.push({ resolve, reject }));
  return async function step(line, expect) {
    const p = read();
    if (line != null) socket.write(line + '\r\n');
    const r = await p;
    if (!expect.includes(r.code)) throw new Error(`SMTP ${r.code}: ${r.text.trim().slice(0, 200)}`);
    return r;
  };
}

export async function sendMail({ to, subject, text }, opts = {}) {
  const s = { ...config.smtp, ...opts };
  const socket = await new Promise((resolve, reject) => {
    const sock = s.secure === false
      ? net.connect({ host: s.host, port: s.port }, () => resolve(sock))
      : tls.connect({ host: s.host, port: s.port, servername: s.host }, () => resolve(sock));
    sock.setTimeout(20_000, () => sock.destroy(new Error('SMTP 응답이 없습니다.')));
    sock.once('error', reject);
  });
  const step = smtpSession(socket);
  const from = s.from || s.user;
  const rcpts = (Array.isArray(to) ? to : [to]).filter(Boolean);
  try {
    await step(null, [220]);
    await step('EHLO meiri-shici', [250]);
    await step('AUTH LOGIN', [334]);
    await step(b64(s.user), [334]);
    await step(b64(s.pass), [235]);
    await step(`MAIL FROM:<${from}>`, [250]);
    for (const r of rcpts) await step(`RCPT TO:<${r}>`, [250, 251]);
    await step('DATA', [354]);
    const body = b64(text).replace(/.{1,76}/g, '$&\r\n');
    const msg = [
      `From: ${headerWord('每日十五词')} <${from}>`,
      `To: ${rcpts.join(', ')}`,
      `Subject: ${headerWord(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      body,
    ].join('\r\n');
    await step(`${msg}\r\n.`, [250]);
    await step('QUIT', [221]).catch(() => {});
  } finally {
    socket.end();
  }
}

// 새 학습자가 승인 대기로 가입하면 관리자에게 알린다. 실패해도 가입은 그대로 진행한다.
export async function notifySignup(u) {
  if (!mailReady()) return false;
  const when = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  await sendMail({
    to: config.notifyTo,
    subject: `[每日十五词] 새 가입 신청: ${u.name} (${u.email})`,
    text: `새 학습자가 가입을 신청했습니다.\n\n이름: ${u.name}\n이메일: ${u.email}\n신청 시각: ${when} (한국 시간)\n\n관리자 화면에서 승인하거나 거절해 주세요.\n${config.baseUrl}/#/admin\n`,
  });
  return true;
}
