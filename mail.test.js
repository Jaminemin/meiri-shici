// 가입 알림 메일: 가짜 SMTP 서버로 주고받기와 본문 인코딩을 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { sendMail } from './server/lib/mail.js';

test('SMTP로 한글 제목·본문을 보낸다', async () => {
  const got = [];
  const server = net.createServer((c) => {
    c.setEncoding('utf8');
    let data = false, buf = '';
    c.write('220 fake ESMTP\r\n');
    c.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        got.push(line);
        if (data) { if (line === '.') { data = false; c.write('250 queued\r\n'); } continue; }
        if (line.startsWith('EHLO')) c.write('250-fake\r\n250 AUTH LOGIN\r\n');
        else if (line === 'AUTH LOGIN') c.write('334 VXNlcm5hbWU6\r\n');
        else if (got.length === 3) c.write('334 UGFzc3dvcmQ6\r\n');
        else if (got.length === 4) c.write('235 ok\r\n');
        else if (line === 'DATA') { data = true; c.write('354 go\r\n'); }
        else if (line === 'QUIT') { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  await sendMail({ to: ['admin@example.com'], subject: '새 가입 신청: 홍길동', text: '이름: 홍길동\n이메일: hong@example.com' },
    { host: '127.0.0.1', port, secure: false, user: 'me@example.com', pass: 'pw', from: 'me@example.com' });
  server.close();
  const all = got.join('\n');
  assert.match(all, /MAIL FROM:<me@example.com>/);
  assert.match(all, /RCPT TO:<admin@example.com>/);
  assert.equal(got[2], Buffer.from('me@example.com').toString('base64'));
  const subj = got.find((l) => l.startsWith('Subject: '));
  const enc = /=\?UTF-8\?B\?(.+)\?=/.exec(subj)[1];
  assert.equal(Buffer.from(enc, 'base64').toString('utf8'), '새 가입 신청: 홍길동');
  const bodyStart = got.indexOf('') + 1, bodyEnd = got.indexOf('.');
  assert.equal(Buffer.from(got.slice(bodyStart, bodyEnd).join(''), 'base64').toString('utf8'), '이름: 홍길동\n이메일: hong@example.com');
});
