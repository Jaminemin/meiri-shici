// 듣기·말하기·쓰기 연습 문제를 주차 단어와 예문으로 만든다. (저장하지 않는 연습)

import { SEG_WORDS } from './segment.js';
import { SEGMENTS } from './segments.js';

export const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

const byLengthDesc = (words) => [...words].sort((a, b) => b.hanzi.length - a.hanzi.length);

// 문장을 단어 단위로 자른다. 주차 단어와 공용 사전(segment.js)에 있으면 한 덩어리, 없으면 한 글자씩.
// clean=false: 사전에 없는 낱말이 글자 여러 개로 쪼개진 문장(예: 趋 势)
export function tokenizeInfo(zh, words) {
  const s = zh.replace(/[，。！？、,.!?\s“”"'：:；;（）()]/g, '');
  if (SEGMENTS[s]) return { tokens: SEGMENTS[s], clean: true };
  const sorted = byLengthDesc([...words, ...SEG_WORDS.map((hanzi) => ({ hanzi }))]);
  const out = [];
  let i = 0;
  let prevSingleMiss = false;
  let clean = true;
  while (i < s.length) {
    const hit = sorted.find((w) => s.startsWith(w.hanzi, i));
    const len = hit ? hit.hanzi.length : 1;
    if (!hit && prevSingleMiss) clean = false;
    prevSingleMiss = !hit;
    out.push(s.slice(i, i + len));
    i += len;
  }
  return { tokens: out, clean };
}
export function tokenize(zh, words) {
  return tokenizeInfo(zh, words).tokens;
}

// 듣기·말하기: 문장 단어 카드를 올바른 순서로 배열
export function arrangeItems(W) {
  return W.examples
    .map((e) => ({ zh: e.zh, py: e.py, ko: e.ko, ...tokenizeInfo(e.zh, W.words) }))
    .filter((x) => x.clean && x.tokens.length >= 2)
    .map((x) => ({ ...x, pool: shuffle(x.tokens.map((t, i) => ({ t, i }))) }));
}

// 문장 고르기 (듣기·쓰기 공용): 정답 문장 1개 + 같은 주차의 다른 예문 보기, 자리는 섞는다.
export function sentenceChoiceItems(W) {
  const all = [...new Set(W.examples.map((e) => e.zh).filter(Boolean))];
  return W.examples
    .filter((e) => e.zh)
    .map((e) => {
      const others = shuffle(all.filter((z) => z !== e.zh)).slice(0, 3);
      const opts = shuffle([e.zh, ...others]);
      return { zh: e.zh, py: e.py, ko: e.ko, opts, answer: opts.indexOf(e.zh) };
    })
    .filter((x) => x.opts.length >= 2);
}
