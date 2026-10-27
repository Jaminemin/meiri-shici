// 듣기·말하기·쓰기 연습 문제를 주차 단어와 예문으로 만든다. (저장하지 않는 연습)

export const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);

const byLengthDesc = (words) => [...words].sort((a, b) => b.hanzi.length - a.hanzi.length);

// 문장을 단어 단위로 자른다. 주차 단어에 있으면 한 덩어리, 없으면 한 글자씩.
export function tokenize(zh, words) {
  const s = zh.replace(/[，。！？、,.!?\s“”"'：:；;（）()]/g, '');
  const sorted = byLengthDesc(words);
  const out = [];
  let i = 0;
  while (i < s.length) {
    const hit = sorted.find((w) => s.startsWith(w.hanzi, i));
    const len = hit ? hit.hanzi.length : 1;
    out.push(s.slice(i, i + len));
    i += len;
  }
  return out;
}

// 듣기·말하기: 문장 단어 카드를 올바른 순서로 배열
export function arrangeItems(W) {
  return W.examples
    .map((e) => ({ zh: e.zh, py: e.py, ko: e.ko, tokens: tokenize(e.zh, W.words) }))
    .filter((x) => x.tokens.length >= 2)
    .map((x) => ({ ...x, pool: shuffle(x.tokens.map((t, i) => ({ t, i }))) }));
}

// 쓰기: 한 문장에 빈칸 2~3개(주차 단어가 충분하면 3개), 빈칸마다 보기 4개 중 고르기(순서대로)
export function fillItems(W) {
  const sorted = byLengthDesc(W.words);
  const items = [];
  for (const e of W.examples) {
    const zh = e.zh;
    const marks = [];
    let i = 0;
    while (i < zh.length) {
      const hit = sorted.find((w) => zh.startsWith(w.hanzi, i));
      if (hit) {
        marks.push({ start: i, len: hit.hanzi.length, word: hit });
        i += hit.hanzi.length;
      } else i++;
    }
    if (marks.length < 2) continue;
    const chosen = shuffle(marks).slice(0, 3).sort((a, b) => a.start - b.start);
    // 문장 조각: 빈칸 사이의 일반 글자
    const pieces = [];
    let pos = 0;
    chosen.forEach((m, k) => {
      pieces.push({ text: zh.slice(pos, m.start) });
      pieces.push({ blank: k });
      pos = m.start + m.len;
    });
    pieces.push({ text: zh.slice(pos) });
    const blanks = chosen.map((m) => {
      const inSentence = (w) => zh.includes(w.hanzi);
      const pool = W.words.filter((w) => w.hanzi !== m.word.hanzi && !inSentence(w));
      const fallback = W.words.filter((w) => w.hanzi !== m.word.hanzi && inSentence(w));
      const others = shuffle([...shuffle(pool), ...shuffle(fallback)]).slice(0, 3);
      return { answer: m.word.hanzi, opts: shuffle([m.word, ...others]).map((w) => w.hanzi) };
    });
    items.push({ zh, py: e.py, ko: e.ko, pieces, blanks });
  }
  return items;
}
