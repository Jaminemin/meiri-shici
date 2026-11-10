// 빈칸을 채우는 판다 그림 (포즈: hello 인사, cheer 화이팅, smile 웃음). 카드 격자의 남는 칸에 넣는다.
// 실제 판다의 흑백 무늬와 체형을 살린 그림. 몸과 머리는 그라데이션으로 둥근 입체감을 준다.

const SHADE = `
  <radialGradient id="pfur" cx="40%" cy="30%" r="75%">
    <stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#f1f1ef"/><stop offset="1" stop-color="#d9d9d6"/>
  </radialGradient>
  <radialGradient id="pblack" cx="40%" cy="35%" r="70%">
    <stop offset="0" stop-color="#3a3a3a"/><stop offset="1" stop-color="#121212"/>
  </radialGradient>`;

const POSE = {
  hello: {
    arms: `<path d="M84 82 Q98 70 98 50" fill="none" stroke="url(#pblack)" stroke-width="13" stroke-linecap="round"/>
      <ellipse cx="38" cy="86" rx="7" ry="12" fill="url(#pblack)" transform="rotate(12 38 86)"/>`,
    eyes: `<circle cx="50" cy="40" r="2.6" fill="#fff"/><circle cx="72" cy="40" r="2.6" fill="#fff"/>`,
    mouth: `<path d="M60 56 Q58 60 55 59 M60 56 Q62 60 65 59" fill="none" stroke="#222" stroke-width="1.4" stroke-linecap="round"/>`,
    extra: '',
  },
  cheer: {
    arms: `<path d="M38 80 Q24 64 28 40" fill="none" stroke="url(#pblack)" stroke-width="13" stroke-linecap="round"/>
      <path d="M82 80 Q96 64 92 40" fill="none" stroke="url(#pblack)" stroke-width="13" stroke-linecap="round"/>`,
    eyes: `<circle cx="50" cy="40" r="2.6" fill="#fff"/><circle cx="72" cy="40" r="2.6" fill="#fff"/>`,
    mouth: `<path d="M54 57 Q60 66 66 57 Z" fill="#3b1414"/>`,
    extra: `<path d="M14 26 l4 -6 M106 26 l-4 -6 M60 4 v-6" stroke="#f5b400" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  smile: {
    arms: `<ellipse cx="38" cy="88" rx="7" ry="11" fill="url(#pblack)" transform="rotate(-18 38 88)"/>
      <ellipse cx="82" cy="88" rx="7" ry="11" fill="url(#pblack)" transform="rotate(18 82 88)"/>`,
    eyes: `<path d="M43 42 Q48 36 53 42" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M67 42 Q72 36 77 42" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    mouth: `<path d="M52 57 Q60 70 68 57 Z" fill="#3b1414"/>`,
    extra: `<ellipse cx="39" cy="54" rx="4.5" ry="3" fill="#f4a6b5" opacity=".6"/><ellipse cx="81" cy="54" rx="4.5" ry="3" fill="#f4a6b5" opacity=".6"/>`,
  },
};

const CAPTION = { hello: '안녕하세요!', cheer: '화이팅!', smile: '하하, 함께 웃어요' };

export function pandaSvg(pose) {
  const p = POSE[pose] || POSE.hello;
  return `<svg viewBox="0 0 120 112" aria-hidden="true">
    <defs>${SHADE}</defs>
    <ellipse cx="60" cy="109" rx="30" ry="3.5" fill="#000" opacity=".12"/>
    <ellipse cx="60" cy="88" rx="27" ry="23" fill="url(#pfur)"/>
    <ellipse cx="44" cy="106" rx="10" ry="5.5" fill="url(#pblack)"/>
    <ellipse cx="76" cy="106" rx="10" ry="5.5" fill="url(#pblack)"/>
    ${p.arms}
    <circle cx="36" cy="20" r="10.5" fill="url(#pblack)"/><circle cx="84" cy="20" r="10.5" fill="url(#pblack)"/>
    <circle cx="36" cy="21" r="4.5" fill="#2e2e2e"/><circle cx="84" cy="21" r="4.5" fill="#2e2e2e"/>
    <ellipse cx="60" cy="44" rx="31" ry="27" fill="url(#pfur)"/>
    <path d="M36 30 q4 -3 6 0 M80 30 q-4 -3 -6 0" fill="none" stroke="#ddd" stroke-width="1" opacity=".6"/>
    <path d="M40 36 Q42 30 50 32 Q48 40 44 46 Q38 46 40 36 Z" fill="url(#pblack)" transform="rotate(-8 46 40)"/>
    <path d="M80 36 Q78 30 70 32 Q72 40 76 46 Q82 46 80 36 Z" fill="url(#pblack)" transform="rotate(8 74 40)"/>
    ${p.eyes}
    <ellipse cx="60" cy="52" rx="4.2" ry="3" fill="#161616"/>
    ${p.mouth}
    ${p.extra}
  </svg>`;
}

// 떨어지는 장식: 하트·꽃·네잎클로버 (SVG). 판다마다 하나의 종류가 쏟아지듯 내려온다.
const FALL_SHAPE = {
  heart: `<svg viewBox="0 0 24 24"><path d="M12 21 C4 15 2 11 2 8 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8 C22 11 20 15 12 21 Z" fill="#f28ba8"/></svg>`,
  flower: `<svg viewBox="0 0 24 24"><g fill="#ffb7c9"><circle cx="12" cy="6" r="4.5"/><circle cx="18" cy="10.5" r="4.5"/><circle cx="15.5" cy="17" r="4.5"/><circle cx="8.5" cy="17" r="4.5"/><circle cx="6" cy="10.5" r="4.5"/></g><circle cx="12" cy="12" r="2.8" fill="#f5c542"/></svg>`,
  clover: `<svg viewBox="0 0 24 24"><g fill="#4caf6a"><circle cx="8" cy="8" r="5"/><circle cx="16" cy="8" r="5"/><circle cx="8" cy="16" r="5"/><circle cx="16" cy="16" r="5"/></g><path d="M12 16 L12 23" stroke="#3a8f52" stroke-width="2" stroke-linecap="round"/></svg>`,
};
const FALL_FOR = { hello: 'heart', cheer: 'flower', smile: 'clover' };

function fallingItems(pose) {
  const kind = FALL_SHAPE[FALL_FOR[pose]] ? FALL_FOR[pose] : 'heart';
  // 좌우 위치와 시작 시간을 조금씩 달리해 여러 개가 이어서 내려오게 한다
  const spots = [6, 22, 40, 58, 76, 92];
  return spots
    .map((x, i) => `<span class="fall" style="left:${x}%;animation-delay:${(i * 0.7).toFixed(1)}s;animation-duration:${(3.6 + (i % 3) * 0.5).toFixed(1)}s">${FALL_SHAPE[kind]}</span>`)
    .join('');
}

// 격자 마지막 칸에 넣는 판다 카드 (떨어지는 장식 포함)
export function pandaCell(pose) {
  return `<div class="card panda-cell" role="img" aria-label="${CAPTION[pose] || ''}">${fallingItems(pose)}<div class="panda-figure">${pandaSvg(pose)}</div></div>`;
}
