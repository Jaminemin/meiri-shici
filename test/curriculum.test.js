import test from 'node:test';
import assert from 'node:assert/strict';
import { WEEKS, weekData } from '../server/curriculum.js';

test('15주, 주마다 단어 10개·예문 3개·미션', () => {
  assert.equal(WEEKS.length, 15);
  WEEKS.forEach((w, i) => {
    assert.equal(w.week, i + 1);
    assert.equal(w.words.length, 10, `${w.week}주차 단어 수`);
    assert.equal(w.examples.length, 3);
    assert.ok(w.mission && w.pattern.form && w.goal);
    for (const [h, p, m] of w.words) assert.ok(h && p && m, `${w.week}주차 빈 칸`);
    assert.equal(new Set(w.words.map((x) => x[0])).size, 10, `${w.week}주차 중복 단어`);
  });
});

test('전체 150단어가 서로 겹치지 않음', () => {
  const all = WEEKS.flatMap((w) => w.words.map((x) => x[0]));
  assert.equal(new Set(all).size, 150);
});

test('병음에 성조 표시가 있음(경성 단어 제외)', () => {
  const neutral = new Set(['过']);
  for (const w of WEEKS) for (const [h, p] of w.words) if (!neutral.has(h)) assert.match(p, /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/, `${h} ${p}`);
});

test('weekData 형식', () => {
  const d = weekData(1);
  assert.equal(d.words[0].id, '1-1');
  assert.equal(weekData(99), null);
});
