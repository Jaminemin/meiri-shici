// 每日十五词 15주 학습 내용 (HSK 1~3급 수준). 한 주에 단어 10개 + 핵심 문형 + 예문 + 작문 미션.
// 단어 형식: [한자, 병음, 뜻]

import { EXTRA_EXAMPLES } from './examples15.js';
import { EXTRA_WORDS, PATTERNS } from './vocab15.js';
import { TRAVEL_DRAFT_WEEKS } from './travel.js';
import { HSK_DRAFT_WEEKS } from './hsk.js';
import { EMCEE_DRAFT_WEEKS } from './emcee.js';

export const WORDS_PER_WEEK = 15;

export const WEEKS = [
  {
    week: 1, hsk: 1, title: '인사와 자기소개', titleZh: '你好！',
    goal: '이름과 국적을 말하고 처음 만난 사람과 인사할 수 있다.',
    words: [
      ['你', 'nǐ', '너, 당신'], ['好', 'hǎo', '좋다, 안녕하다'], ['我', 'wǒ', '나, 저'], ['是', 'shì', '~이다'],
      ['叫', 'jiào', '(이름을) ~라고 부르다'], ['名字', 'míngzi', '이름'], ['什么', 'shénme', '무엇, 무슨'],
      ['韩国人', 'Hánguórén', '한국인'], ['中国人', 'Zhōngguórén', '중국인'], ['认识', 'rènshi', '(사람을) 알다'],
    ],
    pattern: { form: '我叫 + 이름 / 我是 + 국적', explain: '“叫”는 이름을 말할 때, “是”는 신분·국적을 말할 때 쓴다. 의문문은 문장 끝에 “吗”를 붙이거나 “什么”를 쓴다.' },
    examples: [
      ['你叫什么名字？', 'Nǐ jiào shénme míngzi?', '이름이 뭐예요?'],
      ['我叫李明，我是中国人。', 'Wǒ jiào Lǐ Míng, wǒ shì Zhōngguórén.', '저는 리밍이고, 중국인이에요.'],
      ['认识你很高兴。', 'Rènshi nǐ hěn gāoxìng.', '만나서 반가워요.'],
    ],
    mission: '중국어로 자기소개를 2~3문장 써 보세요. (이름, 국적, 인사)',
  },
  {
    week: 2, hsk: 1, title: '가족', titleZh: '我的家',
    goal: '가족 수와 가족 구성원을 소개할 수 있다.',
    words: [
      ['家', 'jiā', '집, 가정'], ['爸爸', 'bàba', '아빠'], ['妈妈', 'māma', '엄마'], ['哥哥', 'gēge', '형, 오빠'],
      ['姐姐', 'jiějie', '누나, 언니'], ['弟弟', 'dìdi', '남동생'], ['妹妹', 'mèimei', '여동생'],
      ['有', 'yǒu', '있다, 가지고 있다'], ['几', 'jǐ', '몇'], ['口', 'kǒu', '식구(가족 수를 세는 단위)'],
    ],
    pattern: { form: '你家有几口人？/ 我家有 + 숫자 + 口人', explain: '가족 수를 물을 때는 “几口人”을 쓴다. 사람을 셀 때는 “个”를 쓴다: 一个姐姐.' },
    examples: [
      ['你家有几口人？', 'Nǐ jiā yǒu jǐ kǒu rén?', '가족이 몇 명이에요?'],
      ['我家有四口人。', 'Wǒ jiā yǒu sì kǒu rén.', '우리 가족은 네 명이에요.'],
      ['我有一个姐姐和一个弟弟。', 'Wǒ yǒu yí ge jiějie hé yí ge dìdi.', '저는 누나(언니) 한 명과 남동생 한 명이 있어요.'],
    ],
    mission: '우리 가족을 중국어로 소개해 보세요. (가족 수, 누가 있는지)',
  },
  {
    week: 3, hsk: 1, title: '날짜와 나이', titleZh: '今天几号？',
    goal: '날짜·요일·생일·나이를 묻고 답할 수 있다.',
    words: [
      ['今天', 'jīntiān', '오늘'], ['明天', 'míngtiān', '내일'], ['昨天', 'zuótiān', '어제'], ['年', 'nián', '해, 년'],
      ['月', 'yuè', '달, 월'], ['号', 'hào', '일(날짜)'], ['星期', 'xīngqī', '주, 요일'], ['生日', 'shēngrì', '생일'],
      ['多大', 'duō dà', '몇 살, 얼마나 큰'], ['岁', 'suì', '살, 세'],
    ],
    pattern: { form: '今天几月几号？/ 今天星期几？', explain: '날짜는 “년-월-일(号)” 순서로 말한다. 요일은 “星期 + 숫자”이고 일요일은 “星期天”이다.' },
    examples: [
      ['今天几月几号？', 'Jīntiān jǐ yuè jǐ hào?', '오늘은 몇 월 며칠이에요?'],
      ['我的生日是五月八号。', 'Wǒ de shēngrì shì wǔ yuè bā hào.', '제 생일은 5월 8일이에요.'],
      ['你今年多大？我二十五岁。', 'Nǐ jīnnián duō dà? Wǒ èrshíwǔ suì.', '올해 몇 살이에요? 스물다섯 살이에요.'],
    ],
    mission: '오늘 날짜와 요일, 내 생일을 중국어로 써 보세요.',
  },
  {
    week: 4, hsk: 1, title: '시간과 하루 일과', titleZh: '现在几点？',
    goal: '시각을 말하고 하루 일과를 설명할 수 있다.',
    words: [
      ['现在', 'xiànzài', '지금'], ['点', 'diǎn', '시(시각)'], ['分', 'fēn', '분'], ['半', 'bàn', '반, 30분'],
      ['早上', 'zǎoshang', '아침'], ['中午', 'zhōngwǔ', '점심때, 정오'], ['晚上', 'wǎnshang', '저녁, 밤'],
      ['起床', 'qǐchuáng', '일어나다'], ['睡觉', 'shuìjiào', '잠자다'], ['上班', 'shàngbān', '출근하다'],
    ],
    pattern: { form: '주어 + 시간 + 동사', explain: '중국어는 시간을 동사 앞에 둔다: 我七点起床(나는 7시에 일어난다).' },
    examples: [
      ['现在几点？', 'Xiànzài jǐ diǎn?', '지금 몇 시예요?'],
      ['我早上七点起床。', 'Wǒ zǎoshang qī diǎn qǐchuáng.', '저는 아침 7시에 일어나요.'],
      ['我晚上十一点半睡觉。', 'Wǒ wǎnshang shíyī diǎn bàn shuìjiào.', '저는 밤 11시 반에 자요.'],
    ],
    mission: '나의 하루 일과를 시간과 함께 3문장 이상 써 보세요.',
  },
  {
    week: 5, hsk: 1, title: '음식과 주문', titleZh: '你想吃什么？',
    goal: '먹고 싶은 것을 말하고 음식을 주문할 수 있다.',
    words: [
      ['吃', 'chī', '먹다'], ['喝', 'hē', '마시다'], ['米饭', 'mǐfàn', '쌀밥'], ['面条', 'miàntiáo', '국수'],
      ['茶', 'chá', '차'], ['咖啡', 'kāfēi', '커피'], ['水', 'shuǐ', '물'], ['想', 'xiǎng', '~하고 싶다, 생각하다'],
      ['要', 'yào', '원하다, ~하려고 하다'], ['好吃', 'hǎochī', '맛있다'],
    ],
    pattern: { form: '我想 + 동사 + 목적어 / 我要 + 명사', explain: '“想”은 바람, “要”는 분명한 의지·주문을 나타낸다. 식당에서는 “我要…”를 많이 쓴다.' },
    examples: [
      ['你想吃什么？', 'Nǐ xiǎng chī shénme?', '뭐 먹고 싶어요?'],
      ['我要一碗面条和一杯茶。', 'Wǒ yào yì wǎn miàntiáo hé yì bēi chá.', '국수 한 그릇과 차 한 잔 주세요.'],
      ['这个菜很好吃。', 'Zhège cài hěn hǎochī.', '이 요리 정말 맛있어요.'],
    ],
    mission: '식당에서 음식과 음료를 주문하는 문장을 써 보세요.',
  },
  {
    week: 6, hsk: 1, title: '쇼핑과 가격', titleZh: '多少钱？',
    goal: '가격을 묻고 비싸다·싸다를 표현할 수 있다.',
    words: [
      ['买', 'mǎi', '사다'], ['东西', 'dōngxi', '물건'], ['多少', 'duōshao', '얼마, 몇'], ['钱', 'qián', '돈'],
      ['块', 'kuài', '위안(돈의 단위, 구어)'], ['贵', 'guì', '비싸다'], ['便宜', 'piányi', '싸다'],
      ['衣服', 'yīfu', '옷'], ['商店', 'shāngdiàn', '상점, 가게'], ['太', 'tài', '너무'],
    ],
    pattern: { form: '这个多少钱？/ 太 + 형용사 + 了', explain: '“太…了”는 정도가 지나침을 나타낸다: 太贵了(너무 비싸요).' },
    examples: [
      ['这件衣服多少钱？', 'Zhè jiàn yīfu duōshao qián?', '이 옷은 얼마예요?'],
      ['三百块，太贵了！', 'Sānbǎi kuài, tài guì le!', '300위안이요? 너무 비싸요!'],
      ['我去商店买东西。', 'Wǒ qù shāngdiàn mǎi dōngxi.', '저는 가게에 물건을 사러 가요.'],
    ],
    mission: '가게에서 물건값을 묻고 흥정하는 대화를 써 보세요.',
  },
  {
    week: 7, hsk: 2, title: '장소와 위치', titleZh: '在哪儿？',
    goal: '장소가 어디에 있는지 묻고 위치를 설명할 수 있다.',
    words: [
      ['在', 'zài', '~에 있다'], ['哪儿', 'nǎr', '어디'], ['这儿', 'zhèr', '여기'], ['那儿', 'nàr', '거기, 저기'],
      ['前面', 'qiánmian', '앞'], ['后面', 'hòumian', '뒤'], ['左边', 'zuǒbian', '왼쪽'], ['右边', 'yòubian', '오른쪽'],
      ['医院', 'yīyuàn', '병원'], ['学校', 'xuéxiào', '학교'],
    ],
    pattern: { form: 'A 在 B + 방위사', explain: '“在”는 존재 위치를 나타낸다: 医院在学校前面(병원은 학교 앞에 있다).' },
    examples: [
      ['医院在哪儿？', 'Yīyuàn zài nǎr?', '병원은 어디에 있어요?'],
      ['医院在学校前面。', 'Yīyuàn zài xuéxiào qiánmian.', '병원은 학교 앞에 있어요.'],
      ['洗手间在右边。', 'Xǐshǒujiān zài yòubian.', '화장실은 오른쪽에 있어요.'],
    ],
    mission: '우리 집 근처에 무엇이 어디에 있는지 써 보세요.',
  },
  {
    week: 8, hsk: 2, title: '교통', titleZh: '怎么去？',
    goal: '교통수단과 거리를 말할 수 있다.',
    words: [
      ['坐', 'zuò', '앉다, (탈것을) 타다'], ['开车', 'kāichē', '운전하다'], ['出租车', 'chūzūchē', '택시'],
      ['飞机', 'fēijī', '비행기'], ['火车', 'huǒchē', '기차'], ['地铁', 'dìtiě', '지하철'], ['去', 'qù', '가다'],
      ['来', 'lái', '오다'], ['远', 'yuǎn', '멀다'], ['近', 'jìn', '가깝다'],
    ],
    pattern: { form: '坐 + 교통수단 + 去 + 장소 / A 离 B + 远/近', explain: '이동 수단은 동사 “去” 앞에 둔다. 거리는 “离”로 기준점을 나타낸다.' },
    examples: [
      ['我坐地铁去学校。', 'Wǒ zuò dìtiě qù xuéxiào.', '저는 지하철을 타고 학교에 가요.'],
      ['你家离公司远吗？', 'Nǐ jiā lí gōngsī yuǎn ma?', '집이 회사에서 멀어요?'],
      ['不远，很近。', 'Bù yuǎn, hěn jìn.', '멀지 않아요, 아주 가까워요.'],
    ],
    mission: '나는 학교나 회사에 어떻게 가는지 중국어로 써 보세요.',
  },
  {
    week: 9, hsk: 2, title: '날씨와 계절', titleZh: '天气怎么样？',
    goal: '날씨를 묻고 좋아하는 계절을 말할 수 있다.',
    words: [
      ['天气', 'tiānqì', '날씨'], ['冷', 'lěng', '춥다'], ['热', 'rè', '덥다'], ['下雨', 'xià yǔ', '비가 오다'],
      ['下雪', 'xià xuě', '눈이 오다'], ['晴', 'qíng', '맑다'], ['春天', 'chūntiān', '봄'], ['夏天', 'xiàtiān', '여름'],
      ['秋天', 'qiūtiān', '가을'], ['冬天', 'dōngtiān', '겨울'],
    ],
    pattern: { form: '…怎么样？/ 会 + 동사(가능성)', explain: '“怎么样”은 상태를 묻는다. “会”는 앞으로 일어날 가능성을 나타낸다: 明天会下雨.' },
    examples: [
      ['今天天气怎么样？', 'Jīntiān tiānqì zěnmeyàng?', '오늘 날씨 어때요?'],
      ['今天很冷，明天会下雪。', 'Jīntiān hěn lěng, míngtiān huì xià xuě.', '오늘은 춥고, 내일은 눈이 올 거예요.'],
      ['我最喜欢秋天。', 'Wǒ zuì xǐhuan qiūtiān.', '저는 가을을 제일 좋아해요.'],
    ],
    mission: '오늘 날씨와 내가 좋아하는 계절, 그 이유를 써 보세요.',
  },
  {
    week: 10, hsk: 2, title: '취미와 여가', titleZh: '你喜欢做什么？',
    goal: '취미를 말하고 함께 하자고 제안할 수 있다.',
    words: [
      ['喜欢', 'xǐhuan', '좋아하다'], ['看', 'kàn', '보다'], ['电影', 'diànyǐng', '영화'], ['听', 'tīng', '듣다'],
      ['音乐', 'yīnyuè', '음악'], ['唱歌', 'chànggē', '노래하다'], ['跳舞', 'tiàowǔ', '춤추다'],
      ['运动', 'yùndòng', '운동(하다)'], ['游泳', 'yóuyǒng', '수영하다'], ['一起', 'yìqǐ', '함께'],
    ],
    pattern: { form: '我们一起 + 동사 + 吧 / 会 + 동사(능력)', explain: '“吧”는 제안을 나타낸다. “会”는 배워서 할 줄 아는 능력을 나타낸다: 你会游泳吗?' },
    examples: [
      ['我喜欢听音乐。', 'Wǒ xǐhuan tīng yīnyuè.', '저는 음악 듣는 것을 좋아해요.'],
      ['周末我们一起去看电影吧。', 'Zhōumò wǒmen yìqǐ qù kàn diànyǐng ba.', '주말에 같이 영화 보러 가요.'],
      ['你会游泳吗？', 'Nǐ huì yóuyǒng ma?', '수영할 줄 알아요?'],
    ],
    mission: '내 취미를 소개하고, 친구에게 함께 하자고 제안하는 문장을 써 보세요.',
  },
  {
    week: 11, hsk: 2, title: '학교와 공부', titleZh: '学习汉语',
    goal: '공부하는 내용과 어려움을 비교해 말할 수 있다.',
    words: [
      ['学习', 'xuéxí', '공부하다, 배우다'], ['汉语', 'Hànyǔ', '중국어'], ['老师', 'lǎoshī', '선생님'],
      ['学生', 'xuésheng', '학생'], ['同学', 'tóngxué', '학우, 반 친구'], ['上课', 'shàngkè', '수업하다'],
      ['考试', 'kǎoshì', '시험(을 보다)'], ['作业', 'zuòyè', '숙제'], ['难', 'nán', '어렵다'], ['容易', 'róngyì', '쉽다'],
    ],
    pattern: { form: 'A 比 B + 형용사', explain: '“比”는 비교를 나타낸다: 汉语比英语难吗?(중국어가 영어보다 어려워요?) 부정은 “A 没有 B + 형용사”.' },
    examples: [
      ['我在学校学习汉语。', 'Wǒ zài xuéxiào xuéxí Hànyǔ.', '저는 학교에서 중국어를 공부해요.'],
      ['汉语比英语难吗？', 'Hànyǔ bǐ Yīngyǔ nán ma?', '중국어가 영어보다 어려워요?'],
      ['明天有考试，今天要做作业。', 'Míngtiān yǒu kǎoshì, jīntiān yào zuò zuòyè.', '내일 시험이 있어서 오늘 숙제를 해야 해요.'],
    ],
    mission: '중국어 공부에서 쉬운 점과 어려운 점을 “比”를 써서 비교해 보세요.',
  },
  {
    week: 12, hsk: 2, title: '직장과 일', titleZh: '工作很忙',
    goal: '하루 업무와 완료된 일을 말할 수 있다.',
    words: [
      ['工作', 'gōngzuò', '일(하다), 직업'], ['公司', 'gōngsī', '회사'], ['忙', 'máng', '바쁘다'], ['累', 'lèi', '피곤하다'],
      ['开会', 'kāihuì', '회의하다'], ['同事', 'tóngshì', '동료'], ['电脑', 'diànnǎo', '컴퓨터'], ['手机', 'shǒujī', '휴대전화'],
      ['已经', 'yǐjīng', '이미, 벌써'], ['下班', 'xiàbān', '퇴근하다'],
    ],
    pattern: { form: '已经 + 동사 + 了', explain: '“了”는 동작의 완료나 상황의 변화를 나타낸다: 我已经下班了(저는 이미 퇴근했어요).' },
    examples: [
      ['今天工作很忙，我很累。', 'Jīntiān gōngzuò hěn máng, wǒ hěn lèi.', '오늘 일이 바빠서 피곤해요.'],
      ['我们下午三点开会。', 'Wǒmen xiàwǔ sān diǎn kāihuì.', '우리는 오후 3시에 회의해요.'],
      ['我已经下班了。', 'Wǒ yǐjīng xiàbān le.', '저는 이미 퇴근했어요.'],
    ],
    mission: '오늘 한 일을 “了”를 써서 3문장 이상 써 보세요.',
  },
  {
    week: 13, hsk: 3, title: '건강과 병원', titleZh: '我不舒服',
    goal: '몸 상태를 설명하고 조언할 수 있다.',
    words: [
      ['身体', 'shēntǐ', '몸, 건강'], ['生病', 'shēngbìng', '병이 나다'], ['头疼', 'tóuténg', '머리가 아프다'],
      ['感冒', 'gǎnmào', '감기(에 걸리다)'], ['医生', 'yīshēng', '의사'], ['药', 'yào', '약'], ['休息', 'xiūxi', '쉬다'],
      ['觉得', 'juéde', '~라고 느끼다, 생각하다'], ['舒服', 'shūfu', '편안하다'], ['应该', 'yīnggāi', '마땅히 ~해야 한다'],
    ],
    pattern: { form: '我觉得 + 상태 / 你应该 + 동사', explain: '“觉得”는 느낌·의견을, “应该”는 당위·조언을 나타낸다.' },
    examples: [
      ['我觉得不舒服，好像感冒了。', 'Wǒ juéde bù shūfu, hǎoxiàng gǎnmào le.', '몸이 안 좋아요. 감기에 걸린 것 같아요.'],
      ['你应该去医院看医生。', 'Nǐ yīnggāi qù yīyuàn kàn yīshēng.', '병원에 가서 진찰을 받아야 해요.'],
      ['吃药以后要多休息。', 'Chī yào yǐhòu yào duō xiūxi.', '약을 먹은 뒤에는 푹 쉬어야 해요.'],
    ],
    mission: '아픈 친구에게 상태를 묻고 조언하는 문장을 써 보세요.',
  },
  {
    week: 14, hsk: 3, title: '여행과 경험', titleZh: '你去过中国吗？',
    goal: '여행 경험과 여행 계획을 말할 수 있다.',
    words: [
      ['旅游', 'lǚyóu', '여행(하다)'], ['过', 'guo', '~한 적이 있다(경험)'], ['打算', 'dǎsuan', '~할 계획이다'],
      ['机场', 'jīchǎng', '공항'], ['酒店', 'jiǔdiàn', '호텔'], ['护照', 'hùzhào', '여권'], ['照片', 'zhàopiàn', '사진'],
      ['地方', 'dìfang', '곳, 장소'], ['有名', 'yǒumíng', '유명하다'], ['景色', 'jǐngsè', '경치'],
    ],
    pattern: { form: '동사 + 过 / 打算 + 동사', explain: '“过”는 과거의 경험을 나타낸다: 我去过北京. 부정은 “没 + 동사 + 过”.' },
    examples: [
      ['你去过北京吗？', 'Nǐ qù guo Běijīng ma?', '베이징에 가 본 적 있어요?'],
      ['我去过两次，那儿的景色很美。', 'Wǒ qù guo liǎng cì, nàr de jǐngsè hěn měi.', '두 번 가 봤어요. 그곳 경치가 아름다워요.'],
      ['我打算明年去上海旅游。', 'Wǒ dǎsuan míngnián qù Shànghǎi lǚyóu.', '저는 내년에 상하이로 여행 갈 계획이에요.'],
    ],
    mission: '가 본 곳 한 군데와 가 보고 싶은 곳을 “过”와 “打算”을 써서 소개해 보세요.',
  },
  {
    week: 15, hsk: 3, title: '마음 전하기·총정리', titleZh: '谢谢你的帮助',
    goal: '이유와 조건을 연결해 생각과 감사를 전할 수 있다.',
    words: [
      ['因为', 'yīnwèi', '왜냐하면, ~때문에'], ['所以', 'suǒyǐ', '그래서'], ['但是', 'dànshì', '그러나'],
      ['如果', 'rúguǒ', '만약'], ['就', 'jiù', '곧, 바로(결과를 이음)'], ['希望', 'xīwàng', '희망(하다)'],
      ['帮助', 'bāngzhù', '돕다, 도움'], ['感谢', 'gǎnxiè', '감사하다'], ['高兴', 'gāoxìng', '기쁘다'], ['朋友', 'péngyou', '친구'],
    ],
    pattern: { form: '因为…，所以… / 如果…，就…', explain: '“因为…所以…”는 원인과 결과를, “如果…就…”는 조건과 결과를 잇는다.' },
    examples: [
      ['因为下雨，所以我没去。', 'Yīnwèi xià yǔ, suǒyǐ wǒ méi qù.', '비가 와서 저는 가지 않았어요.'],
      ['如果你有时间，就来我家吧。', 'Rúguǒ nǐ yǒu shíjiān, jiù lái wǒ jiā ba.', '시간이 있으면 우리 집에 와요.'],
      ['谢谢你的帮助，我很高兴认识你。', 'Xièxie nǐ de bāngzhù, wǒ hěn gāoxìng rènshi nǐ.', '도와줘서 고마워요. 당신을 알게 되어 기뻐요.'],
    ],
    mission: '15주 동안 배운 표현을 활용해 중국인 친구에게 감사 편지를 5문장 이상 써 보세요.',
  },
];

// 과정 목록. 주차 번호(gid)는 과정마다 다르게 준다: 여행 1~15, HSK 101~115, 사회자 201~215.
// 기존 진도와 저장 기록은 여행 과정(1~15) 번호를 그대로 쓴다.
export const COURSES = {
  travel: { key: 'travel', name: '여행 중국어', level: '초급', offset: 0, ready: true, weeks: TRAVEL_DRAFT_WEEKS },
  hsk: { key: 'hsk', name: 'HSK 중국어', level: '중급', offset: 100, ready: true, weeks: HSK_DRAFT_WEEKS },
  emcee: { key: 'emcee', name: '사회자 중국어', level: '고급', offset: 200, ready: true, weeks: EMCEE_DRAFT_WEEKS },
};

export function courseOf(gid) {
  const n = Number(gid);
  return Object.values(COURSES).find((c) => n > c.offset && n <= c.offset + c.weeks.length) || null;
}

export function weekData(gid) {
  const n = Number(gid);
  const course = courseOf(n);
  if (!course) return null;
  const local = n - course.offset;
  const w = course.weeks.find((x) => x.week === local);
  // 여행 과정(travel.js)은 주차마다 단어·문형·예문 15개를 직접 갖는다.
  // 그 밖의 과정은 기존 방식(기본 + 추가 목록)으로 합친다.
  const draft = Array.isArray(w.patterns);
  const examples = draft ? w.examples : [...w.examples, ...(EXTRA_EXAMPLES[w.week] || [])].slice(0, 15);
  const allWords = draft ? w.words : [...w.words, ...(EXTRA_WORDS[w.week] || [])];
  const rawPatterns = draft ? w.patterns : (PATTERNS[w.week] || [[w.pattern.form, w.pattern.explain, '', '']]);
  const patterns = rawPatterns.map(([form, explain, zh, ko]) => ({ form, explain, zh, ko }));
  return {
    ...w,
    gid: n,
    week: local,
    course: course.key,
    words: allWords.map(([hanzi, pinyin, meaning], i) => ({ id: `${n}-${i + 1}`, hanzi, pinyin, meaning })),
    patterns,
    examples: examples.map(([zh, py, ko]) => ({ zh, py, ko })),
  };
}

// 과정의 주차 목록 (gid 포함)
export function curriculumSummary(courseKey = 'travel') {
  const c = COURSES[courseKey] || COURSES.travel;
  return c.weeks.map((w) => ({ gid: c.offset + w.week, week: w.week, hsk: w.hsk, title: w.title, titleZh: w.titleZh, goal: w.goal, sample: w.words.slice(0, 3).map((x) => x[0]) }));
}

// 주차 번호(gid)를 과정 안의 주차 번호로
export function localWeek(gid) {
  const c = courseOf(gid);
  return c ? Number(gid) - c.offset : Number(gid);
}
