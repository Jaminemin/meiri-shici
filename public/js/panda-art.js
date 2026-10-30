// 빈칸을 채우는 판다 그림 (포즈: hello 인사, cheer 화이팅, smile 웃음). 카드 격자의 남는 칸에 넣는다.

const PARTS = {
  hello: {
    arms: `<path d="M34 84 Q26 98 34 104" fill="none" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/>
      <path d="M86 80 Q100 60 94 40" fill="none" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/>`,
    eyes: `<circle cx="49" cy="42" r="3.5" fill="#fff"/><circle cx="71" cy="42" r="3.5" fill="#fff"/>`,
    mouth: `<path d="M54 62 Q60 68 66 62" fill="none" stroke="#2b2b2b" stroke-width="2" stroke-linecap="round"/>`,
    blush: '',
  },
  cheer: {
    arms: `<path d="M34 80 Q18 62 26 40" fill="none" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/>
      <path d="M86 80 Q102 62 94 40" fill="none" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/>
      <path d="M14 26 l4 -6 M104 26 l-4 -6 M60 6 v-6" stroke="#f5b400" stroke-width="2.5" stroke-linecap="round"/>`,
    eyes: `<circle cx="49" cy="42" r="3.5" fill="#fff"/><circle cx="71" cy="42" r="3.5" fill="#fff"/>`,
    mouth: `<path d="M52 60 Q60 72 68 60 Z" fill="#1d1d1d"/>`,
    blush: '',
  },
  smile: {
    arms: `<path d="M34 84 Q28 100 36 102" fill="none" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/>
      <path d="M86 84 Q92 100 84 102" fill="none" stroke="#1d1d1d" stroke-width="11" stroke-linecap="round"/>`,
    eyes: `<path d="M44 44 Q49 38 54 44" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M66 44 Q71 38 76 44" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
    mouth: `<path d="M50 60 Q60 76 70 60 Z" fill="#1d1d1d"/>`,
    blush: `<circle cx="40" cy="56" r="4" fill="#f4a6b5" opacity=".7"/><circle cx="80" cy="56" r="4" fill="#f4a6b5" opacity=".7"/>`,
  },
};

const CAPTION = { hello: '안녕하세요!', cheer: '화이팅!', smile: '하하, 함께 웃어요' };

export function pandaSvg(pose) {
  const p = PARTS[pose] || PARTS.hello;
  return `<svg viewBox="0 0 120 112" aria-hidden="true">
    <rect x="40" y="76" width="40" height="30" rx="14" fill="#fff" stroke="#2b2b2b" stroke-width="2"/>
    <ellipse cx="50" cy="108" rx="7" ry="4" fill="#1d1d1d"/><ellipse cx="70" cy="108" rx="7" ry="4" fill="#1d1d1d"/>
    ${p.arms}
    <circle cx="36" cy="20" r="10" fill="#1d1d1d"/><circle cx="84" cy="20" r="10" fill="#1d1d1d"/>
    <circle cx="60" cy="44" r="30" fill="#fff" stroke="#2b2b2b" stroke-width="2"/>
    <ellipse cx="49" cy="43" rx="9" ry="11" fill="#1d1d1d" transform="rotate(-20 49 43)"/>
    <ellipse cx="71" cy="43" rx="9" ry="11" fill="#1d1d1d" transform="rotate(20 71 43)"/>
    ${p.eyes}
    ${p.blush}
    <ellipse cx="60" cy="54" rx="3.5" ry="2.5" fill="#1d1d1d"/>
    ${p.mouth}
  </svg>`;
}

// 격자 마지막 칸에 넣는 판다 카드
export function pandaCell(pose) {
  return `<div class="card panda-cell" role="img" aria-label="${CAPTION[pose] || ''}">
    ${pandaSvg(pose)}
    <div class="panda-cap">${CAPTION[pose] || ''}</div>
  </div>`;
}
