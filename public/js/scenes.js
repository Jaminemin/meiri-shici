// 주차별 상황 그림과 설명. 그림은 장소 배경 위에 두 사람과 말풍선을 그린 일러스트다.
import { esc } from './core.js';

// 주차별 상황: 장소, 제목, 설명, 말풍선 두 개 [중국어, 뜻]
export const SCENES = {
  1: { place: 'classroom', title: '처음 만난 교실', desc: '개학 첫날, 옆자리에 앉은 친구가 먼저 말을 겁니다. 서로 이름을 묻고 인사를 나눕니다.', bubbles: [['你好！我叫小红。', '안녕! 나는 샤오홍이야.'], ['认识你很高兴！', '만나서 반가워!']] },
  2: { place: 'home', title: '가족 이야기', desc: '친구 집에 놀러 간 날, 거실에서 가족 사진을 보며 가족이 몇 명인지 묻습니다.', bubbles: [['你家有几口人？', '가족이 몇 명이야?'], ['我家有四口人。', '우리 집은 네 식구야.']] },
  3: { place: 'cafe', title: '생일 약속 날짜', desc: '카페에서 친구와 생일 파티 날짜를 정합니다. 오늘이 며칠인지, 생일이 언제인지 묻습니다.', bubbles: [['今天几月几号？', '오늘 며칠이야?'], ['我的生日是五月八号。', '내 생일은 5월 8일이야.']] },
  4: { place: 'home', title: '아침 일과', desc: '아침 침대에서 일어난 학생이 시계를 보고 서둘러 준비합니다. 하루 일과를 시간과 함께 말합니다.', bubbles: [['现在几点？', '지금 몇 시야?'], ['我七点起床。', '나는 7시에 일어나.']] },
  5: { place: 'restaurant', title: '식당에서 주문', desc: '중국 식당에서 메뉴판을 보며 음식을 고릅니다. 종업원에게 먹고 싶은 것을 주문합니다.', bubbles: [['你想吃什么？', '뭐 먹고 싶어요?'], ['我要一碗面条。', '국수 한 그릇 주세요.']] },
  6: { place: 'shop', title: '옷 가게', desc: '마음에 드는 옷을 골랐지만 가격이 궁금합니다. 가격을 묻고 조금 깎아 달라고 부탁합니다.', bubbles: [['这件衣服多少钱？', '이 옷 얼마예요?'], ['太贵了，便宜一点儿吧。', '너무 비싸요, 좀 깎아 주세요.']] },
  7: { place: 'street', title: '길 찾기', desc: '처음 가 보는 동네에서 병원을 찾습니다. 행인에게 길을 묻고 위치를 듣습니다.', bubbles: [['请问，医院在哪儿？', '실례지만, 병원이 어디예요?'], ['在学校右边。', '학교 오른쪽에 있어요.']] },
  8: { place: 'subway', title: '지하철 타기', desc: '지하철 역에서 학교에 가는 길입니다. 어떻게 가는지, 얼마나 걸리는지 확인합니다.', bubbles: [['你怎么去学校？', '학교에 어떻게 가요?'], ['坐地铁，要二十分钟。', '지하철 타고 20분 걸려요.']] },
  9: { place: 'park', title: '봄 공원 산책', desc: '따뜻한 봄날, 공원에서 친구가 날씨를 묻습니다. 날씨가 좋으면 산책하자고 제안합니다.', bubbles: [['今天天气怎么样？', '오늘 날씨 어때?'], ['天气很好，我们去散步吧。', '날씨 좋다, 산책 가자.']] },
  10: { place: 'park', title: '주말 취미', desc: '주말에 무엇을 하는지 묻습니다. 좋아하는 취미를 말하고 함께 하자고 제안합니다.', bubbles: [['你喜欢做什么？', '뭐 하는 걸 좋아해?'], ['我喜欢听音乐，一起去吧。', '음악 듣는 걸 좋아해. 같이 가자.']] },
  11: { place: 'classroom', title: '중국어 수업', desc: '중국어 수업이 끝난 뒤, 중국어와 영어 중 무엇이 더 어려운지 이야기합니다.', bubbles: [['汉语比英语难吗？', '중국어가 영어보다 어려워?'], ['汉语不太难，但是要多练习。', '별로 어렵지 않아, 다만 많이 연습해야 해.']] },
  12: { place: 'office', title: '퇴근 전 회의', desc: '회사에서 오후 회의를 마친 직원이 동료에게 일이 끝났는지 묻습니다. 퇴근 후 저녁을 함께 먹자고 합니다.', bubbles: [['你已经下班了吗？', '벌써 퇴근했어요?'], ['还没，下班以后一起吃饭吧。', '아직요, 퇴근하고 같이 밥 먹어요.']] },
  13: { place: 'hospital', title: '병원 진료', desc: '감기에 걸려 머리가 아픈 친구가 병원에 옵니다. 의사에게 증상을 말하고 조언을 듣습니다.', bubbles: [['我觉得头疼，不舒服。', '머리가 아프고 몸이 안 좋아요.'], ['你应该多休息。', '푹 쉬셔야 해요.']] },
  14: { place: 'airport', title: '공항에서 만난 여행', desc: '공항에서 중국 여행을 떠나는 친구를 만납니다. 중국에 가 본 적 있는지, 어디를 갈 계획인지 묻습니다.', bubbles: [['你去过北京吗？', '베이징에 가 본 적 있어?'], ['没去过，我打算明年去。', '아직 못 가 봤어. 내년에 갈 생각이야.']] },
  15: { place: 'cafe', title: '고마움 전하기', desc: '어려울 때 도와준 친구에게 카페에서 고마움을 전합니다. 도움에 감사하고 앞으로도 친하게 지내자고 말합니다.', bubbles: [['谢谢你的帮助！', '도와줘서 고마워!'], ['不客气，因为我们是朋友。', '천만에, 우리는 친구니까.']] },
};

// 장면 그림: 부드러운 그라데이션 배경 + 둥근 판다 두 마리 + 말풍선. 장소별 소품으로 상황을 보여 준다.
const ACCENT = ['#3b6fd8', '#e0823d'];

function defs(id, a, b) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.18"/></filter></defs>`;
}
const GROUND = (c1, c2) => `<rect x="0" y="176" width="400" height="64" fill="${c1}"/><rect x="0" y="176" width="400" height="6" fill="${c2}" opacity=".6"/>`;

const BACKDROP = {
  airport: (id) => `${defs(id, '#dbeafe', '#f5f9ff')}<rect width="400" height="240" fill="url(#${id})"/>
    <rect x="34" y="34" width="150" height="104" rx="14" fill="#bfdcf7" opacity=".9"/>
    <rect x="216" y="34" width="150" height="104" rx="14" fill="#bfdcf7" opacity=".9"/>
    <path d="M48 110 L130 60 L170 60 L110 110 Z" fill="#fff" opacity=".35"/>
    <g transform="translate(322 74) rotate(-12)" fill="#fff" opacity=".95"><ellipse rx="26" ry="6"/><path d="M-4 -2 L-16 -22 L-10 -22 L8 -2 Z"/><path d="M-4 2 L-16 22 L-10 22 L8 2 Z"/></g>
    ${GROUND('#cdd9e8', '#9fb2cc')}`,
  cafe: (id) => `${defs(id, '#fbe9d6', '#f7d7b7')}<rect width="400" height="240" fill="url(#${id})"/>
    <circle cx="90" cy="42" r="12" fill="#fcd27a" filter="url(#sh)"/><line x1="90" y1="0" x2="90" y2="30" stroke="#b08a5a" stroke-width="2"/>
    <circle cx="310" cy="42" r="12" fill="#fcd27a" filter="url(#sh)"/><line x1="310" y1="0" x2="310" y2="30" stroke="#b08a5a" stroke-width="2"/>
    <rect x="28" y="92" width="86" height="8" rx="4" fill="#a5714a"/>
    <rect x="286" y="92" width="86" height="8" rx="4" fill="#a5714a"/>
    <rect x="34" y="150" width="332" height="26" rx="10" fill="#9a6a45" filter="url(#sh)"/>
    <rect x="170" y="118" width="60" height="32" rx="10" fill="#fff" filter="url(#sh)"/><rect x="176" y="112" width="48" height="8" rx="4" fill="#8b5e3c" opacity=".6"/>
    ${GROUND('#c99d78', '#a77b5a')}`,
  home: (id) => `${defs(id, '#fff0dc', '#fde3c2')}<rect width="400" height="240" fill="url(#${id})"/>
    <rect x="262" y="34" width="104" height="84" rx="14" fill="#bfe6fb" stroke="#fff" stroke-width="6"/>
    <line x1="314" y1="34" x2="314" y2="118" stroke="#fff" stroke-width="4"/>
    <rect x="34" y="132" width="170" height="44" rx="20" fill="#6f9e98" filter="url(#sh)"/>
    <rect x="34" y="112" width="40" height="64" rx="16" fill="#5d8a85" filter="url(#sh)"/>
    <rect x="232" y="144" width="60" height="10" rx="5" fill="#b07a4d"/><rect x="240" y="154" width="6" height="26" fill="#b07a4d"/><rect x="278" y="154" width="6" height="26" fill="#b07a4d"/>
    <circle cx="262" cy="128" r="10" fill="#fcd27a"/>
    ${GROUND('#e6c49a', '#c99d6e')}`,
  hospital: (id) => `${defs(id, '#eefaf7', '#dff3ee')}<rect width="400" height="240" fill="url(#${id})"/>
    <rect x="46" y="38" width="64" height="64" rx="16" fill="#2fb7a4" filter="url(#sh)"/>
    <path d="M78 52 V88 M60 70 H96" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
    <rect x="270" y="50" width="96" height="60" rx="12" fill="#fff" filter="url(#sh)"/>
    <rect x="282" y="62" width="40" height="8" rx="4" fill="#bfe9e0"/><rect x="282" y="78" width="72" height="8" rx="4" fill="#bfe9e0"/>
    ${GROUND('#cfe9e3', '#a9d8ce')}`,
  park: (id) => `${defs(id, '#d5f0fd', '#f4fbff')}<rect width="400" height="240" fill="url(#${id})"/>
    <circle cx="332" cy="48" r="20" fill="#ffe08a"/>
    <path d="M0 160 Q90 118 180 158 T400 150 V240 H0 Z" fill="#a8dba0"/>
    <circle cx="70" cy="98" r="26" fill="#7cc587"/><circle cx="96" cy="88" r="22" fill="#8fd39a"/><rect x="66" y="112" width="8" height="48" rx="3" fill="#8b6b4a"/>
    <circle cx="330" cy="104" r="22" fill="#7cc587"/><rect x="326" y="122" width="8" height="48" rx="3" fill="#8b6b4a"/>
    <rect x="150" y="150" width="78" height="12" rx="6" fill="#c08d5e"/><rect x="156" y="162" width="6" height="18" fill="#8b6b4a"/><rect x="216" y="162" width="6" height="18" fill="#8b6b4a"/>
    ${GROUND('#8fcf88', '#6fb86a')}`,
  restaurant: (id) => `${defs(id, '#fde6d5', '#fbd7bf')}<rect width="400" height="240" fill="url(#${id})"/>
    <line x1="92" y1="0" x2="92" y2="26" stroke="#7a2e2e" stroke-width="2"/><circle cx="92" cy="40" r="18" fill="#e5483a" filter="url(#sh)"/>
    <line x1="308" y1="0" x2="308" y2="26" stroke="#7a2e2e" stroke-width="2"/><circle cx="308" cy="40" r="18" fill="#e5483a" filter="url(#sh)"/>
    <rect x="30" y="134" width="340" height="12" rx="6" fill="#b5523e"/>
    <ellipse cx="200" cy="150" rx="60" ry="10" fill="#fff" opacity=".7"/>
    <rect x="186" y="110" width="28" height="30" rx="6" fill="#fff" filter="url(#sh)"/>
    ${GROUND('#c77e5c', '#a8604a')}`,
  shop: (id) => `${defs(id, '#ecf7ee', '#dff0e3')}<rect width="400" height="240" fill="url(#${id})"/>
    <path d="M30 30 H370 V58 Q356 74 342 58 Q328 74 314 58 Q300 74 286 58 Q272 74 258 58 Q244 74 230 58 Q216 74 202 58 Q188 74 174 58 Q160 74 146 58 Q132 74 118 58 Q104 74 90 58 Q76 74 62 58 Q48 74 30 58 Z" fill="#f08f7a" filter="url(#sh)"/>
    <rect x="46" y="96" width="72" height="56" rx="12" fill="#f5d0c4"/><rect x="134" y="96" width="72" height="56" rx="12" fill="#c7e4f7"/><rect x="222" y="96" width="72" height="56" rx="12" fill="#d5ecc4"/><rect x="310" y="96" width="50" height="56" rx="12" fill="#f8e7a2"/>
    ${GROUND('#c9bda3', '#aa9d7f')}`,
  street: (id) => `${defs(id, '#d9efff', '#f2f9ff')}<rect width="400" height="240" fill="url(#${id})"/>
    <rect x="18" y="62" width="78" height="120" rx="10" fill="#9fb3c9"/><rect x="108" y="40" width="92" height="142" rx="10" fill="#b7c7d8"/>
    <rect x="214" y="78" width="70" height="104" rx="10" fill="#9fb3c9"/><rect x="296" y="50" width="86" height="132" rx="10" fill="#b7c7d8"/>
    <g fill="#fff" opacity=".85"><rect x="32" y="82" width="12" height="12" rx="3"/><rect x="54" y="82" width="12" height="12" rx="3"/><rect x="124" y="60" width="12" height="12" rx="3"/><rect x="146" y="60" width="12" height="12" rx="3"/><rect x="228" y="98" width="12" height="12" rx="3"/><rect x="310" y="72" width="12" height="12" rx="3"/><rect x="332" y="72" width="12" height="12" rx="3"/></g>
    ${GROUND('#c3cbd5', '#9ea9b6')}`,
  subway: (id) => `${defs(id, '#1e293b', '#334155')}<rect width="400" height="240" fill="url(#${id})"/>
    <g fill="#fde68a" opacity=".8"><circle cx="60" cy="40" r="4"/><circle cx="160" cy="40" r="4"/><circle cx="260" cy="40" r="4"/><circle cx="350" cy="40" r="4"/></g>
    <rect x="0" y="62" width="400" height="10" fill="#475569"/>
    <rect x="40" y="96" width="320" height="82" rx="20" fill="#3b82f6" filter="url(#sh)"/>
    <rect x="62" y="110" width="66" height="34" rx="8" fill="#dbeafe"/><rect x="167" y="110" width="66" height="34" rx="8" fill="#dbeafe"/><rect x="272" y="110" width="66" height="34" rx="8" fill="#dbeafe"/>
    <rect x="0" y="176" width="400" height="64" fill="#475569"/><rect x="0" y="176" width="400" height="6" fill="#64748b"/>`,
};
const BASE = { airport: 'airport', cafe: 'cafe', home: 'home', hospital: 'hospital', park: 'park', restaurant: 'restaurant', shop: 'shop', street: 'street', subway: 'subway' };

// 판다 한 마리 (cx: 가운데, F: 발바닥 y). flip이면 좌우 반전. 목에 두른 스카프 색으로 두 판다를 구분한다.
function pandaFig(cx, F, scarf, flip, wave) {
  const s = flip ? -1 : 1;
  const waveArm = wave
    ? `<ellipse cx="${cx + 44}" cy="${F - 74}" rx="11" ry="24" fill="#1f2937" transform="rotate(-38 ${cx + 44} ${F - 74})"/>`
    : `<ellipse cx="${cx + 40}" cy="${F - 46}" rx="11" ry="23" fill="#1f2937" transform="rotate(-12 ${cx + 40} ${F - 46})"/>`;
  return `<g transform="translate(${cx} 0) scale(${s} 1) translate(${-cx} 0)" filter="url(#sh)">
    <ellipse cx="${cx - 15}" cy="${F - 6}" rx="12" ry="9" fill="#1f2937"/><ellipse cx="${cx + 15}" cy="${F - 6}" rx="12" ry="9" fill="#1f2937"/>
    <rect x="${cx - 32}" y="${F - 80}" width="64" height="74" rx="30" fill="#fff"/>
    <ellipse cx="${cx - 38}" cy="${F - 46}" rx="11" ry="23" fill="#1f2937" transform="rotate(12 ${cx - 38} ${F - 46})"/>
    ${waveArm}
    <rect x="${cx - 22}" y="${F - 66}" width="44" height="9" rx="4.5" fill="${scarf}"/>
    <circle cx="${cx}" cy="${F - 100}" r="38" fill="#fff"/>
    <circle cx="${cx - 27}" cy="${F - 128}" r="12" fill="#1f2937"/><circle cx="${cx + 27}" cy="${F - 128}" r="12" fill="#1f2937"/>
    <ellipse cx="${cx - 14}" cy="${F - 102}" rx="10" ry="12" fill="#1f2937" transform="rotate(-18 ${cx - 14} ${F - 102})"/>
    <ellipse cx="${cx + 14}" cy="${F - 102}" rx="10" ry="12" fill="#1f2937" transform="rotate(18 ${cx + 14} ${F - 102})"/>
    <circle cx="${cx - 11}" cy="${F - 106}" r="3" fill="#fff"/><circle cx="${cx + 17}" cy="${F - 106}" r="3" fill="#fff"/>
    <circle cx="${cx - 24}" cy="${F - 88}" r="4.5" fill="#f9a8b8" opacity=".6"/><circle cx="${cx + 24}" cy="${F - 88}" r="4.5" fill="#f9a8b8" opacity=".6"/>
    <ellipse cx="${cx}" cy="${F - 88}" rx="4.5" ry="3.2" fill="#1f2937"/>
    <path d="M${cx - 5} ${F - 81} Q${cx} ${F - 77} ${cx + 5} ${F - 81}" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round"/>
  </g>`;
}

// 말풍선: side l/r, 둥근 모서리와 옅은 그림자, 한 줄 9자
function bubble(side, zh, y) {
  const rows = [];
  for (let i = 0; i < zh.length; i += 9) rows.push(zh.slice(i, i + 9));
  const w = 168, h = 22 + rows.length * 24;
  const x = side === 'l' ? 14 : 218;
  const tx = side === 'l' ? x + 52 : x + w - 52;
  const top = y;
  return `<g filter="url(#sh)">
    <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="16" fill="#fff"/>
    <path d="M${tx - 9} ${top + h - 1} L${tx} ${top + h + 13} L${tx + 9} ${top + h - 1} Z" fill="#fff"/>
    ${rows.map((r, k) => `<text x="${x + w / 2}" y="${top + 26 + k * 24}" font-size="16" text-anchor="middle" fill="#1f2937" font-family="SimSun, 'Noto Serif SC', serif">${esc(r)}</text>`).join('')}
  </g>`;
}

export function sceneSvg(week, scene) {
  const sc = scene || SCENES[week];
  if (!sc) return '';
  const id = `sg${week}${sc.place}`.replace(/[^a-zA-Z0-9]/g, '');
  const back = BACKDROP[BASE[sc.place] || 'home'](id);
  const b1 = sc.bubbles[0] ? bubble('l', sc.bubbles[0][0], 14) : '';
  const b2 = sc.bubbles[1] ? bubble('r', sc.bubbles[1][0], 14) : '';
  return `<svg viewBox="0 0 400 240" role="img" aria-label="${esc(sc.title)}: ${esc(sc.desc)}">
    ${back}
    <g transform="translate(23.6 42) scale(0.8)">${pandaFig(118, 210, ACCENT[0], false, true)}</g>
    <g transform="translate(56.4 42) scale(0.8)">${pandaFig(282, 210, ACCENT[1], true, false)}</g>
    ${b1}${b2}
  </svg>`;
}

// 주차 화면 맨 위에 넣는 상황 카드
export function sceneCard(week, scene) {
  const sc = scene || SCENES[week];
  if (!sc) return '';
  return `<div class="card scene-card">
    <div class="scene-art">${sceneSvg(week, sc)}</div>
    <div class="scene-text">
      <div class="ai-label">${week}주차 상황</div>
      <h3 style="margin:4px 0 6px">${esc(sc.title)}</h3>
      <p style="margin:0 0 10px">${esc(sc.desc)}</p>
      ${sc.bubbles.map(([zh, ko]) => `<div class="scene-line"><span class="zh">${esc(zh)}</span><span class="muted"> ${esc(ko)}</span></div>`).join('')}
    </div>
  </div>`;
}
