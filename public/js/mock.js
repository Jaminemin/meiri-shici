// HSK 모의고사 데이터 도우미: 주차의 듣기·문법·독해 문항을 한 줄로 펴고, 섹션별로 채점한다.
export const MOCK_SECTIONS = [
  { key: 'listen', label: '듣기' },
  { key: 'grammar', label: '문법' },
  { key: 'reading', label: '독해' },
];

// mock: { listening: [...], grammar: [...], reading: { passage: {zh, ko}, questions: [...] } }
export function mockItems(mock) {
  if (!mock) return [];
  const out = [];
  (mock.listening || []).forEach((x) => out.push({ sec: 'listen', ...x }));
  (mock.grammar || []).forEach((x) => out.push({ sec: 'grammar', ...x }));
  const r = mock.reading;
  if (r) (r.questions || []).forEach((x) => out.push({ sec: 'reading', passage: r.passage, ...x }));
  return out;
}

// picks[i]: i번째 문항에서 고른 선택지 번호
export function scoreMock(items, picks) {
  const res = {};
  MOCK_SECTIONS.forEach((s) => (res[s.key] = { ok: 0, total: 0 }));
  items.forEach((it, i) => {
    res[it.sec].total++;
    if (picks[i] === it.answer) res[it.sec].ok++;
  });
  return res;
}
