// 공통: 중국 여행 필수 앱 정리 (결제 · 교통 · 식당). 로그인 없이 볼 수 있다.
import { esc } from './core.js';

const GROUPS = [
  {
    title: '💳 결제 (필수)',
    desc: '중국에서는 현금보다 모바일 결제가 일반적입니다. 두 앱 중 하나는 꼭 준비하세요.',
    apps: [
      { name: '위챗페이', zh: '微信支付', use: '식당·마트·편의점 결제, 친구와 송금. 위챗 앱 안에서 결제 QR을 띄워 씁니다.' },
      { name: '알리페이', zh: '支付宝', use: '위챗페이와 같은 용도의 결제 앱. 두 개를 함께 등록해 두면 편합니다.' },
    ],
  },
  {
    title: '🚕 교통',
    desc: '길찾기와 택시 호출은 중국 앱으로 해결하는 것이 가장 편합니다.',
    apps: [
      { name: '디디추싱', zh: '滴滴出行', use: '택시 호출. 목적지를 입력하면 요금을 미리 볼 수 있고, 결제는 앱 안에서 됩니다.' },
      { name: '가오더지도', zh: '高德地图', use: '지도·길찾기·대중교통 안내. 지하철 노선과 환승 정보가 정확합니다.' },
      { name: '12306', zh: '铁路12306', use: '중국 고속철도(기차) 승차권 예매 공식 앱.' },
    ],
  },
  {
    title: '🍜 식당',
    desc: '식당 찾기, 리뷰 확인, 배달까지 한 번에 해결됩니다.',
    apps: [
      { name: '대중점평', zh: '大众点评', use: '맛집 검색과 리뷰 확인, 예약과 할인 쿠폰. 중국인이 가장 많이 쓰는 식당 리뷰 앱입니다.' },
      { name: '메이퇀', zh: '美团', use: '음식 배달·예약·할인. 식당 쿠폰도 자주 나옵니다.' },
      { name: '어러머', zh: '饿了么', use: '음식 배달 앱. 메이퇀과 함께 설치하면 배달 메뉴를 비교할 수 있습니다.' },
    ],
  },
];

const TIPS = [
  '위챗페이와 알리페이는 출국 전에 가입과 해외 카드 등록을 미리 해 두세요. 현지에서 인증이 막히는 경우가 많습니다.',
  '구글 지도, 구글 번역 등 구글 계열 앱은 중국에서 접속이 제한되는 경우가 많습니다. 위 앱으로 대체하세요.',
  '앱 가입 방법과 결제 수단 등록 절차는 업데이트에 따라 달라질 수 있으니 출국 직전에 한 번 더 확인하세요.',
];

export function renderCommonApps(app) {
  app.innerHTML = `
  <div class="page">
    <div class="page-head">
      <div>
        <h1>중국 여행 필수 앱</h1>
        <p class="muted">결제 · 교통 · 식당, 여행 전에 꼭 설치해 두면 좋은 앱입니다.</p>
      </div>
    </div>
    ${GROUPS.map((g) => `
      <section class="card common-group">
        <h2>${esc(g.title)}</h2>
        <p class="muted common-desc">${esc(g.desc)}</p>
        <ul class="common-list">
          ${g.apps.map((a) => `
            <li>
              <b>${esc(a.name)}</b> <span class="zh">${esc(a.zh)}</span>
              <div class="muted common-use">${esc(a.use)}</div>
            </li>`).join('')}
        </ul>
      </section>`).join('')}
    <section class="card">
      <h2>📌 여행 전 체크</h2>
      <ul class="common-list">
        ${TIPS.map((t) => `<li class="common-use">${esc(t)}</li>`).join('')}
      </ul>
    </section>
    <a class="btn" href="#/">← 과목 고르기로 돌아가기</a>
  </div>`;
}
