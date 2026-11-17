// AI 실습: 댓글창 시뮬레이터 · 유행어 해독기 · 교수자용 학습 리포트
// 설명은 모두 한국어, 병음은 성조 부호를 붙인다. 결과는 학습 참고용이다.
import { callClaudeJson } from './ai.js';

const str = (d) => ({ type: 'string', description: d });
const zhLine = (d) => ({ type: 'object', properties: { zh: str(`${d}(중국어)`), py: str('병음(성조 부호 포함)'), ko: str('한국어 뜻') }, required: ['zh', 'py', 'ko'] });

// ---------- 1) 댓글창 시뮬레이터 ----------
// 학생이 올린 숏폼 대본·캡션에 성격이 다른 중국 네티즌 댓글을 단다
export async function genComments({ content, weekTitle, level }) {
  return callClaudeJson({
    system: `너는 도우인(抖音) 댓글창을 재현하는 중국어 교육 도우미다. 한국인 중국어 학습자(${level || '초급'})가 올린 숏폼 대본이나 캡션에 실제 중국 네티즌처럼 댓글을 단다.
- 댓글은 6개. 성격을 모두 다르게: 칭찬·응원(夸), 장난스러운 吐槽, 내용에 대한 질문, 밈·유행어를 섞은 말(玩梗), 중국어 표현을 친절하게 짚어 주는 말, 한국 문화에 관심 있는 말.
- 실제 도우인 댓글처럼 짧고 구어체로 쓴다(한 댓글 8~30자). 이모지나 [赞] 같은 표정 문자는 가끔만.
- ${level === '중급' ? '중급 학습자이므로 유행어·생략 표현을 자연스럽게 섞는다.' : '초급 학습자이므로 어려운 유행어는 1~2개만 쓰고 나머지는 쉬운 말로 쓴다.'}
- 욕설·비하·외모 평가·정치 이야기는 쓰지 않는다. 吐槽도 가볍고 귀엽게.
- 닉네임은 중국 네티즌 스타일로 지어낸다(실존 인물 이름 금지).
- 학습자가 쓴 글이 중국어가 아니어도 내용을 이해해 중국어로 댓글을 단다.`,
    user: `[이번 주 주제] ${weekTitle || '자유 주제'}\n\n[학습자가 올린 글]\n${content}\n\nanswer 도구로 댓글을 제출하라.`,
    maxTokens: 2500,
    schema: {
      type: 'object',
      properties: {
        reaction: str('이 글을 본 중국 시청자들의 전체 반응 요약(한국어 1~2문장)'),
        comments: {
          type: 'array',
          description: '댓글 6개',
          items: {
            type: 'object',
            properties: {
              nick: str('네티즌 닉네임(중국어, 지어낸 것)'),
              persona: str('댓글 성격(한국어 2~6자, 예: 응원, 장난, 질문, 밈, 표현 팁, 한국 문화)'),
              text: str('댓글(중국어)'),
              py: str('댓글 병음'),
              ko: str('댓글의 자연스러운 한국어 뜻'),
              learn: str('이 댓글에서 배울 표현 하나와 설명(한국어, 짧게). 없으면 빈 문자열'),
              likes: { type: 'integer', minimum: 0, maximum: 999, description: '좋아요 수(재미로 보여 줄 숫자)' },
            },
            required: ['nick', 'persona', 'text', 'py', 'ko', 'learn', 'likes'],
          },
        },
      },
      required: ['reaction', 'comments'],
    },
  });
}

// 학생 답글을 평가하고, 원 댓글러가 다시 답한다
export async function judgeReply({ content, comment, reply, level }) {
  return callClaudeJson({
    system: `너는 한국인 중국어 학습자(${level || '초급'})가 도우인 댓글에 단 답글을 봐 주는 중국어 선생님이자, 그 댓글을 쓴 중국 네티즌 역할이다.
- 평가는 한국어로 쉽게. 문법·어휘뿐 아니라 댓글창 말투(너무 딱딱한지, 예의·친근함)가 자연스러운지도 본다.
- 틀린 곳만 고치고 맞게 쓴 부분은 그대로 둔다.
- 학습자가 한국어로 썼으면 중국어로 옮긴 답글을 corrected에 쓰고 다음엔 중국어로 써 보라고 권한다.
- followUp은 원 댓글러(${comment.nick}, 성격: ${comment.persona})가 학습자 답글을 보고 다시 다는 짧은 답글이다. 자연스러운 중국어 구어체로.`,
    user: `[학습자의 원글]\n${content}\n\n[네티즌 댓글] ${comment.nick}: ${comment.text}\n\n[학습자의 답글]\n${reply}\n\nanswer 도구로 제출하라.`,
    maxTokens: 1500,
    schema: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100, description: '자연스러움·정확성 점수' },
        verdict: { type: 'string', enum: ['good', 'fix', 'rewrite'], description: 'good: 자연스러움, fix: 조금 고치면 됨, rewrite: 다시 쓰는 게 좋음' },
        corrected: str('고친 답글(중국어). 고칠 곳이 없으면 원문 그대로'),
        correctedPy: str('고친 답글의 병음'),
        translation: str('고친 답글의 한국어 뜻'),
        comment: str('평가(한국어 2~3문장: 잘한 점 먼저, 고칠 점, 댓글 말투 팁)'),
        better: { type: 'array', description: '같은 뜻의 더 자연스러운 댓글 말투 표현 2개', items: zhLine('표현') },
        followUp: { type: 'object', description: '원 댓글러의 재답글', properties: { text: str('재답글(중국어)'), py: str('병음'), ko: str('한국어 뜻') }, required: ['text', 'py', 'ko'] },
      },
      required: ['score', 'verdict', 'corrected', 'correctedPy', 'translation', 'comment', 'better', 'followUp'],
    },
  });
}

// ---------- 2) 유행어 해독기 ----------
export async function decodeText({ text, level }) {
  return callClaudeJson({
    system: `너는 한국인 중국어 학습자(${level || '초급'})에게 중국 SNS·숏폼(도우인, 샤오훙슈, 빌리빌리, 웨이보) 속 중국어를 풀어 주는 선생님이다.
- 학습자가 붙여 넣은 댓글·자막·캡션·제목을 해설한다. 설명은 모두 한국어로 쉽게.
- 글자 그대로의 뜻과 실제로 쓰이는 뜻(화용적 의미)을 구분한다. 유행어·밈·줄임말·병음 약자(yyds 등)·말장난(谐音)은 특히 자세히.
- 확실하지 않은 유래는 단정하지 말고 "~로 알려져 있다"처럼 쓴다.
- items에는 학습자가 단어장에 넣을 만한 핵심 표현만 2~6개 고른다(아주 쉬운 단어는 빼도 됨).
- 붙여 넣은 글이 중국어가 아니면 summary에 그렇게 알려 주고 items는 빈 배열로 둔다.`,
    user: `[학습자가 붙여 넣은 글]\n${text}\n\nanswer 도구로 해설을 제출하라.`,
    maxTokens: 2500,
    schema: {
      type: 'object',
      properties: {
        summary: str('한 줄 요약: 이 글이 무슨 말인지(한국어)'),
        pinyin: str('원문 전체 병음'),
        literal: str('글자 그대로 옮긴 뜻(한국어)'),
        natural: str('실제 뜻을 살린 자연스러운 한국어 번역'),
        tone: str('말투·뉘앙스(예: 장난스러운 자랑, 비꼬는 말, 친근한 응원)와 어디서 주로 쓰이는지'),
        items: {
          type: 'array',
          description: '핵심 표현 2~6개',
          items: {
            type: 'object',
            properties: {
              term: str('표현(중국어)'),
              py: str('병음'),
              meaning: str('뜻(한국어, 짧게)'),
              usage: str('쓰임·유래·뉘앙스 설명(한국어 1~2문장)'),
              example: str('이 표현을 쓴 새 예문(중국어)'),
              examplePy: str('예문 병음'),
              exampleKo: str('예문 뜻'),
              slang: { type: 'boolean', description: '인터넷 유행어·밈이면 true' },
            },
            required: ['term', 'py', 'meaning', 'usage', 'example', 'examplePy', 'exampleKo', 'slang'],
          },
        },
        similar: { type: 'array', description: '비슷한 뜻의 다른 표현 0~3개', items: zhLine('표현') },
        caution: str('쓸 때 주의할 점(무례하게 들릴 수 있는 상황 등). 없으면 빈 문자열'),
      },
      required: ['summary', 'pinyin', 'literal', 'natural', 'tone', 'items', 'similar', 'caution'],
    },
  });
}

// ---------- 3) 교수자용 학습 리포트 ----------
export async function classReport({ scope, students }) {
  return callClaudeJson({
    system: `너는 대학 중국어 수업 「숏폼 중국어」의 교수를 돕는 수업 분석 조교다.
- 학생별 학습 기록(퀴즈 점수, AI 첨삭에서 나온 오류, 회화·댓글 답글의 오류, 해독기로 찾아본 표현)을 보고 수업에 바로 쓸 수 있게 정리한다.
- 기록에 있는 것만 근거로 쓰고, 없는 사실을 지어내지 않는다. 기록이 적은 학생은 "기록이 적어 판단이 어려움"이라고 쓴다.
- 오류는 유형으로 묶는다(예: 了의 위치, 양사, 어순, 성조 표기, 是의 남용, 구어체 부족).
- 설명은 한국어. 중국어 예시는 병음을 붙인다.
- 학생을 낮추는 표현은 쓰지 않는다. 다음 걸음을 구체적으로 제안한다.`,
    user: `[분석 범위] ${scope}\n\n[학생별 기록(JSON)]\n${JSON.stringify(students)}\n\nanswer 도구로 리포트를 제출하라.`,
    maxTokens: 5000,
    schema: {
      type: 'object',
      properties: {
        summary: str('반 전체 학습 상황 요약(한국어 3~4문장)'),
        commonErrors: {
          type: 'array',
          description: '반에서 자주 나온 오류 유형 최대 6개',
          items: { type: 'object', properties: { type: str('오류 유형'), example: str('학생 기록에 나온 예(원문 → 고친 문장)'), tip: str('수업에서 짚을 방법(한국어 1문장)'), count: { type: 'integer', description: '대략 몇 번 나왔는지' } }, required: ['type', 'example', 'tip', 'count'] },
        },
        topExpressions: {
          type: 'array',
          description: '다음 수업에서 다룰 표현 TOP 5',
          items: { type: 'object', properties: { zh: str('표현(중국어)'), py: str('병음'), ko: str('뜻'), why: str('고른 이유(한국어 1문장)') }, required: ['zh', 'py', 'ko', 'why'] },
        },
        students: {
          type: 'array',
          description: '학생별 메모(기록이 있는 학생만)',
          items: { type: 'object', properties: { name: str('학생 이름(기록에 있는 그대로)'), strength: str('잘하는 점'), weakness: str('보완할 점'), next: str('다음에 해 볼 것(구체적으로)') }, required: ['name', 'strength', 'weakness', 'next'] },
        },
        nextClass: str('다음 수업 활동 제안 2~3가지(한국어)'),
      },
      required: ['summary', 'commonErrors', 'topExpressions', 'students', 'nextClass'],
    },
  });
}
