// 공통: 중국 여행 필수 앱 정리 (결제 · 교통 · 식당). 로그인 없이 볼 수 있다.
import { esc } from './core.js';

const GROUPS = [
  {
    title: '💳 결제 (필수)',
    desc: '중국에서는 현금보다 모바일 결제가 일반적입니다. 두 앱 중 하나는 꼭 준비하세요.',
    apps: [
      { name: '위챗페이', py: 'Wēixìn Zhīfù', ios: '414478124', android: 'com.tencent.mm', zh: '微信支付', use: '식당·마트·편의점 결제, 친구와 송금. 위챗 앱 안에서 결제 QR을 띄워 씁니다.' },
      { name: '알리페이', py: 'Zhīfùbǎo', ios: '333206289', android: 'com.eg.android.AlipayGphone', zh: '支付宝', use: '위챗페이와 같은 용도의 결제 앱. 두 개를 함께 등록해 두면 편합니다.' },
    ],
  },
  {
    title: '🚕 교통',
    desc: '길찾기와 택시 호출은 중국 앱으로 해결하는 것이 가장 편합니다.',
    apps: [
      { name: '디디추싱', py: 'Dīdī Chūxíng', ios: '554499054', android: null, zh: '滴滴出行', use: '택시 호출. 목적지를 입력하면 요금을 미리 볼 수 있고, 결제는 앱 안에서 됩니다.' },
      { name: '가오더지도', py: 'Gāodé Dìtú', ios: '461703208', android: null, zh: '高德地图', use: '지도·길찾기·대중교통 안내. 지하철 노선과 환승 정보가 정확합니다.' },
      { name: '12306', py: 'Tiělù 12306', ios: '564818797', android: 'com.MobileTicket', zh: '铁路12306', use: '중국 고속철도(기차) 승차권 예매 공식 앱.' },
    ],
  },
  {
    title: '🍜 식당',
    desc: '식당 찾기, 리뷰 확인, 배달까지 한 번에 해결됩니다.',
    apps: [
      { name: '대중점평', py: 'Dàzhòng Diǎnpíng', ios: '351091731', android: null, zh: '大众点评', use: '맛집 검색과 리뷰 확인, 예약과 할인 쿠폰. 중국인이 가장 많이 쓰는 식당 리뷰 앱입니다.' },
      { name: '메이퇀', py: 'Měituán', ios: '423084029', android: null, zh: '美团', use: '음식 배달·예약·할인. 식당 쿠폰도 자주 나옵니다.' },
      { name: '어러머', py: 'È le me', ios: '507161324', android: null, zh: '饿了么', use: '음식 배달 앱. 메이퇀과 함께 설치하면 배달 메뉴를 비교할 수 있습니다.' },
    ],
  },
  {
    title: '🗣️ 통역 (중국 현지 앱)',
    desc: '중국 현지에서 주로 쓰는 앱입니다. 한국 앱스토어에서 검색되지 않으면 중국 앱스토어 계정이 필요할 수 있어요.',
    apps: [
      { name: '더우바오', py: 'Dòubāo', zh: '豆包', ios: '6459478672', android: null, use: '바이트댄스의 AI 도우미. 음성으로 중국어 대화와 번역·통역을 요청할 수 있습니다.' },
      { name: '바이두 번역', py: 'Bǎidù Fānyì', zh: '百度翻译', ios: '605670941', android: null, use: '글자·음성·사진 번역. 메뉴판이나 표지판을 찍어서 번역할 때 편합니다.' },
      { name: '유다오 출국 번역관', py: 'Yǒudào Chūguó Fānyìguān', zh: '有道出国翻译官', ios: '1487446835', android: null, use: '여행용 실시간 음성 통역, 사진 메뉴 번역, 오프라인 번역을 지원합니다.' },
    ],
  },
];

const EMERGENCY = [
  { name: '경찰', zh: '报警', num: '110', use: '도난, 사고, 분쟁 등' },
  { name: '구급차', zh: '急救', num: '120', use: '응급 의료' },
  { name: '소방', zh: '火警', num: '119', use: '화재' },
  { name: '교통사고', zh: '交通事故', num: '122', use: '차량 사고' },
  { name: '국제 응급구조센터 (보험 가입자)', zh: '', num: '800-810-9995', use: '중국 내 무료 전화. 010-88393900도 가능' },
];

const TIPS = [
  '위챗페이와 알리페이는 출국 전에 가입과 해외 카드 등록을 미리 해 두세요. 현지에서 인증이 막히는 경우가 많습니다.',
  '구글 지도, 구글 번역 등 구글 계열 앱은 중국에서 접속이 제한되는 경우가 많습니다. 위 앱으로 대체하세요.',
  '앱 가입 방법과 결제 수단 등록 절차는 업데이트에 따라 달라질 수 있으니 출국 직전에 한 번 더 확인하세요.',
];

export function renderCommonApps(app) {
  app.innerHTML = `
  <div class="page">
    <div class="page-head common-head">
      <button class="back-btn" type="button" aria-label="뒤로가기">←</button>
      <div>
        <h1>중국 방문 필수 앱</h1>
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
              <div class="py">${esc(a.py)}</div>
              <div class="muted common-use">${esc(a.use)}</div>
              <div class="store-links">
                <a class="btn small" href="https://apps.apple.com/app/id${a.ios}" target="_blank" rel="noopener noreferrer">🍎 iPhone</a>
                <a class="btn small" href="${a.android ? `https://play.google.com/store/apps/details?id=${a.android}` : `https://play.google.com/store/search?q=${encodeURIComponent(a.name)}&c=apps`}" target="_blank" rel="noopener noreferrer">🤖 Android</a>
              </div>
            </li>`).join('')}
        </ul>
      </section>`).join('')}
    <section class="card">
      <h2>🛂 중국 입국 전 준비 (전자 입국카드)</h2>
      <p class="muted common-desc">중국 입국 시 QR 코드로 입국 신청을 합니다. 도착 72시간 이내에 작성해야 합니다.</p>
      <ul class="common-list">
        <li class="common-use"><b>신청 방법</b><br>국가이민관리국(NIA) 공식 사이트, NIA 12367 앱(iOS·Android), 위챗·알리페이 미니프로그램 ‘국가이민관리국’ 검색. 한국어로 작성할 수 있습니다.</li>
        <li class="common-use"><b>준비물</b><br>여권 사진 페이지(기계판독영역까지 선명하게), 항공편명, 입국 공항·항구, 중국 첫날 숙소 주소(필수), 국제번호 포함 전화번호, 이메일.</li>
        <li class="common-use"><b>인원</b><br>아이를 포함해 1인당 1장씩 작성합니다.</li>
        <li class="common-use"><b>QR 코드</b><br>제출하면 QR 코드가 생성됩니다. 캡처해 저장하고 이메일로도 보내 두세요. 입국심사대에서 보여주면 되고, 인터넷이 없어도 화면만 보이면 됩니다.</li>
        <li class="common-use"><b>수정</b><br>제출 후에는 수정할 수 없습니다. 바뀌면 새로 작성하거나 공항 기기에서 작성합니다.</li>
        <li class="common-use"><b>주의</b><br>비자 대신이 아닙니다. 무비자 입국자도 작성 대상입니다. 서비스는 무료이며, 돈을 요구하는 대행 사이트는 피하세요. 여권 번호의 O·0, I·1, B·8 같은 글자 오인식 때문에 수동 심사로 넘어갈 수 있으니 입력 값을 꼭 확인하세요.</li>
      </ul>
      <div class="store-links">
        <a class="btn small" href="https://s.nia.gov.cn/ArrivalCardFillingPC/" target="_blank" rel="noopener noreferrer">🌐 NIA 공식 사이트</a>
      </div>
      <p class="muted common-use" style="margin-top:10px">※ 출처: Wego 안내글(2026). 출발 전 국가이민관리국 공식 안내에서 최신 내용을 한 번 더 확인하세요.</p>
    </section>
    <section class="card">
      <h2>🆘 긴급 전화 (중국 현지)</h2>
      <p class="muted common-desc">중국 안에서는 +86 없이 그대로 누르세요.</p>
      <ul class="common-list">
        ${EMERGENCY.map((e) => `
          <li>
            <b>${esc(e.name)}</b> <span class="zh">${esc(e.zh)}</span>
            <div class="emg-num">${esc(e.num)}</div>
            <div class="muted common-use">${esc(e.use)}</div>
          </li>`).join('')}
      </ul>
      <p class="muted common-use" style="margin-top:12px">한국에서 중국의 식당·호텔·회사 등 일반 번호에 전화할 때는 <b>+86</b>을 붙이고, 지역번호 맨 앞 0은 뺍니다. (예: 베이징 010-1234-5678 → +86 10-1234-5678)</p>
    </section>
    <section class="card">
      <h2>📌 여행 전 체크</h2>
      <ul class="common-list">
        ${TIPS.map((t) => `<li class="common-use">${esc(t)}</li>`).join('')}
      </ul>
    </section>
    <a class="btn" href="#/">← 과목 고르기로 돌아가기</a>
  </div>`;
  app.querySelector('.back-btn').onclick = () => {
    if (history.length > 1) history.back();
    else location.hash = '#/';
  };
}
