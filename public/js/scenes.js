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

const WALL = (c) => `<rect x="0" y="0" width="400" height="170" fill="${c}"/>`;
const FLOOR = (c) => `<rect x="0" y="170" width="400" height="70" fill="${c}"/>`;

const BACKDROP = {
  classroom: () => `${WALL('#f3ead8')}${FLOOR('#d9c8a8')}
    <rect x="80" y="28" width="240" height="96" rx="6" fill="#2f4a3a"/>
    <rect x="100" y="52" width="120" height="6" rx="3" fill="#e8f0e6" opacity=".8"/>
    <rect x="100" y="70" width="180" height="6" rx="3" fill="#e8f0e6" opacity=".6"/>
    <rect x="100" y="88" width="90" height="6" rx="3" fill="#e8f0e6" opacity=".6"/>
    <rect x="40" y="172" width="150" height="12" rx="3" fill="#8b6b4a"/>`,
  home: () => `${WALL('#f6e6d0')}${FLOOR('#c9a77c')}
    <rect x="262" y="34" width="96" height="72" rx="4" fill="#bfe3f5" stroke="#8b6b4a" stroke-width="6"/>
    <rect x="30" y="140" width="160" height="50" rx="14" fill="#6f86ad"/>
    <rect x="22" y="128" width="26" height="62" rx="10" fill="#5b7299"/>
    <rect x="200" y="112" width="12" height="60" fill="#8b6b4a"/>
    <circle cx="206" cy="104" r="16" fill="#f4c96b"/>`,
  cafe: () => `${WALL('#efe3d2')}${FLOOR('#c8a986')}
    <rect x="30" y="150" width="340" height="22" rx="4" fill="#7a5a3c"/>
    <rect x="60" y="100" width="90" height="10" rx="3" fill="#8b6b4a"/>
    <rect x="190" y="112" width="26" height="36" rx="4" fill="#fff"/>
    <rect x="260" y="112" width="26" height="36" rx="4" fill="#fff"/>
    <rect x="150" y="40" width="110" height="30" rx="6" fill="#6b4a2f"/>
    <text x="205" y="61" font-size="16" fill="#f3e2c7" text-anchor="middle" font-family="sans-serif">COFFEE</text>`,
  restaurant: () => `${WALL('#f4d9c4')}${FLOOR('#b98a6a')}
    <rect x="50" y="162" width="300" height="14" rx="4" fill="#9c4a3c"/>
    <circle cx="90" cy="46" r="20" fill="#e0412e"/><circle cx="310" cy="46" r="20" fill="#e0412e"/>
    <line x1="90" y1="20" x2="90" y2="6" stroke="#6f1826" stroke-width="2"/>
    <line x1="310" y1="20" x2="310" y2="6" stroke="#6f1826" stroke-width="2"/>
    <rect x="170" y="30" width="60" height="26" rx="4" fill="#f5c542"/>`,
  shop: () => `${WALL('#e9f1e4')}${FLOOR('#c4b59a')}
    <rect x="40" y="46" width="320" height="8" fill="#9c8358"/>
    <rect x="40" y="96" width="320" height="8" fill="#9c8358"/>
    <circle cx="80" cy="34" r="12" fill="#e0412e"/><circle cx="130" cy="34" r="12" fill="#3f8fd2"/><circle cx="180" cy="34" r="12" fill="#f5c542"/>
    <rect x="60" y="62" width="34" height="34" rx="4" fill="#d9a5a5"/><rect x="110" y="62" width="34" height="34" rx="4" fill="#9fc9e8"/><rect x="160" y="62" width="34" height="34" rx="4" fill="#b8dba0"/>
    <rect x="130" y="172" width="150" height="12" rx="3" fill="#8b6b4a"/>`,
  street: () => `<rect x="0" y="0" width="400" height="150" fill="#cfe8f7"/>
    <rect x="20" y="60" width="70" height="90" fill="#9aa5b3"/><rect x="110" y="40" width="80" height="110" fill="#b3bdc9"/>
    <rect x="210" y="70" width="60" height="80" fill="#9aa5b3"/><rect x="290" y="46" width="90" height="104" fill="#b3bdc9"/>
    <rect x="0" y="150" width="400" height="90" fill="#8a929c"/><rect x="0" y="196" width="400" height="4" fill="#f2f2f2" opacity=".7"/>
    <circle cx="52" cy="128" r="18" fill="#7fbf7a"/>`,
  subway: () => `${WALL('#dfe6ee')}<rect x="0" y="170" width="400" height="70" fill="#b7c2cf"/>
    <rect x="20" y="64" width="360" height="104" rx="10" fill="#3a7bd5"/>
    <rect x="40" y="82" width="70" height="44" rx="6" fill="#dff1ff"/><rect x="130" y="82" width="70" height="44" rx="6" fill="#dff1ff"/><rect x="220" y="82" width="70" height="44" rx="6" fill="#dff1ff"/><rect x="310" y="82" width="50" height="44" rx="6" fill="#dff1ff"/>
    <rect x="0" y="36" width="400" height="16" fill="#f5c542"/>`,
  park: () => `<rect x="0" y="0" width="400" height="170" fill="#d8f0ff"/><circle cx="330" cy="52" r="22" fill="#ffd36b"/>
    <circle cx="70" cy="90" r="34" fill="#7fbf7a"/><circle cx="110" cy="80" r="28" fill="#6aae68"/><rect x="66" y="110" width="8" height="60" fill="#7a5a3c"/>
    <circle cx="330" cy="100" r="30" fill="#7fbf7a"/><rect x="326" y="120" width="8" height="50" fill="#7a5a3c"/>
    <rect x="0" y="170" width="400" height="70" fill="#a8d88a"/>
    <rect x="200" y="176" width="90" height="10" rx="3" fill="#9c7a52"/>`,
  office: () => `${WALL('#e8ecf3')}${FLOOR('#c9ccd3')}
    <rect x="260" y="30" width="110" height="80" rx="4" fill="#c7e4f7"/>
    <rect x="40" y="136" width="200" height="12" rx="3" fill="#8b6b4a"/>
    <rect x="80" y="96" width="110" height="40" rx="4" fill="#2f3b4c"/>
    <rect x="132" y="148" width="10" height="26" fill="#5b6470"/>`,
  hospital: () => `${WALL('#eaf6f4')}${FLOOR('#d6e8e4')}
    <rect x="30" y="26" width="46" height="46" rx="6" fill="#2fa58a"/>
    <rect x="44" y="32" width="18" height="34" fill="#fff"/><rect x="36" y="40" width="34" height="18" fill="#fff"/>
    <rect x="200" y="132" width="170" height="16" rx="6" fill="#dfe6ee"/><rect x="200" y="112" width="50" height="22" rx="6" fill="#fff"/>
    <rect x="240" y="60" width="120" height="40" rx="6" fill="#bfe3dc"/>`,
  airport: () => `${WALL('#e6eef6')}${FLOOR('#cdd6e0')}
    <rect x="30" y="30" width="340" height="110" rx="6" fill="#bfe0f5"/>
    <line x1="30" y1="85" x2="370" y2="85" stroke="#9fc0d8" stroke-width="3"/>
    <path d="M140 60 L240 52 L250 60 L150 74 Z" fill="#ffffff"/>
    <rect x="60" y="162" width="46" height="34" rx="6" fill="#3a6fb0"/><rect x="290" y="162" width="46" height="34" rx="6" fill="#c0392b"/>`,
};

// 판다 한 마리 (가운데 x 기준, 머리 중심 y=100). 조끼 색으로 두 판다를 구분한다.
function pandaFigure(cx, vest, flip) {
  const s = flip ? -1 : 1;
  return `<g transform="translate(${cx} 0) scale(${s} 1) translate(${-cx} 0)">
    <rect x="${cx - 30}" y="132" width="12" height="46" rx="6" fill="#1d1d1d"/>
    <rect x="${cx + 18}" y="132" width="12" height="46" rx="6" fill="#1d1d1d"/>
    <rect x="${cx - 24}" y="128" width="48" height="66" rx="18" fill="#fff" stroke="#2b2b2b" stroke-width="2"/>
    <rect x="${cx - 14}" y="138" width="28" height="30" rx="8" fill="${vest}"/>
    <rect x="${cx - 10}" y="190" width="9" height="20" rx="4" fill="#1d1d1d"/><rect x="${cx + 1}" y="190" width="9" height="20" rx="4" fill="#1d1d1d"/>
    <circle cx="${cx - 17}" cy="80" r="8" fill="#1d1d1d"/><circle cx="${cx + 17}" cy="80" r="8" fill="#1d1d1d"/>
    <circle cx="${cx}" cy="100" r="24" fill="#fff" stroke="#2b2b2b" stroke-width="2"/>
    <ellipse cx="${cx - 9}" cy="100" rx="6.5" ry="7.5" fill="#1d1d1d" transform="rotate(-15 ${cx - 9} 100)"/>
    <ellipse cx="${cx + 9}" cy="100" rx="6.5" ry="7.5" fill="#1d1d1d" transform="rotate(15 ${cx + 9} 100)"/>
    <circle cx="${cx - 8}" cy="100" r="2" fill="#fff"/><circle cx="${cx + 10}" cy="100" r="2" fill="#fff"/>
    <ellipse cx="${cx}" cy="112" rx="3.2" ry="2.4" fill="#1d1d1d"/>
    <path d="M${cx - 4} 118 Q${cx} 121 ${cx + 4} 118" fill="none" stroke="#2b2b2b" stroke-width="1.8" stroke-linecap="round"/>
  </g>`;
}

// 말풍선: 왼쪽(l) 또는 오른쪽(r) 위에 놓는다. 한 줄은 9자까지, 넘으면 다음 줄로 나눈다.
function bubble(side, zh) {
  const rows = [];
  for (let i = 0; i < zh.length; i += 9) rows.push(zh.slice(i, i + 9));
  const w = 150;
  const h = 16 + rows.length * 22;
  const x = side === 'l' ? 8 : 242;
  const y = 8;
  const tx = side === 'l' ? x + 46 : x + 104;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="#fff" stroke="#7b1c2a" stroke-width="2"/>
    <path d="M${tx - 8} ${y + h - 1} L${tx} ${y + h + 12} L${tx + 8} ${y + h - 1} Z" fill="#fff" stroke="#7b1c2a" stroke-width="2" stroke-linejoin="round"/>
    <rect x="${tx - 9}" y="${y + h - 3}" width="18" height="4" fill="#fff"/>
    ${rows.map((r, k) => `<text x="${x + w / 2}" y="${y + 24 + k * 22}" font-size="16" text-anchor="middle" fill="#1d1d1d" font-family="SimSun, 'Noto Serif SC', serif">${esc(r)}</text>`).join('')}
  </g>`;
}

export function sceneSvg(week, scene) {
  const sc = scene || SCENES[week];
  if (!sc) return '';
  const back = BACKDROP[sc.place]();
  const [a, b] = [['#4f7cd6'], ['#e08a5b']];
  const bubbles = sc.bubbles[0] ? bubble('l', sc.bubbles[0][0]) : '';
  const bubbles2 = sc.bubbles[1] ? bubble('r', sc.bubbles[1][0]) : '';
  return `<svg viewBox="0 0 400 240" role="img" aria-label="${esc(sc.title)}: ${esc(sc.desc)}">
    ${back}
    ${pandaFigure(120, a[0], false)}
    ${pandaFigure(280, b[0], true)}
    ${bubbles}${bubbles2}
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
