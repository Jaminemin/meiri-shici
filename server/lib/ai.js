// Claude API: 학습자 작문 첨삭. API 키는 서버 환경 변수에만 둔다.
import { config } from './config.js';
import { HttpError, todayKst } from './util.js';

const usage = new Map();
export function checkQuota(userId) {
  if (!config.aiReady) throw new HttpError(503, 'AI 첨삭이 아직 설정되지 않았습니다. 관리자에게 문의하세요.', 'ai_not_ready');
  const key = `${userId}:${todayKst()}`;
  const n = usage.get(key) || 0;
  if (n >= config.aiDailyLimit) throw new HttpError(429, `오늘 AI 첨삭 횟수(${config.aiDailyLimit}회)를 다 썼습니다. 내일 다시 해 주세요.`, 'ai_quota');
  usage.set(key, n + 1);
  if (usage.size > 5000) usage.delete(usage.keys().next().value);
  return { used: n + 1, limit: config.aiDailyLimit };
}

export async function callClaude({ system, messages, maxTokens = 4000, tool }) {
  let r;
  try {
    r = await fetch(`${config.anthropic.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: config.anthropic.model, max_tokens: maxTokens, system, messages, ...(tool ? { tools: [tool], tool_choice: { type: 'auto' } } : {}) }),
      signal: AbortSignal.timeout(280_000),
    });
  } catch (e) {
    console.error('[AI 연결 오류]', e?.name, e?.message, e?.cause?.code || '');
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new HttpError(504, 'AI 응답이 너무 오래 걸려 멈췄습니다. 분량을 줄이거나 다시 시도해 주세요.', 'ai_timeout');
    if (/header|ByteString/i.test(String(e?.message))) throw new HttpError(502, 'AI API 키 형식이 올바르지 않습니다. Railway의 ANTHROPIC_API_KEY를 앞뒤 빈칸 없이 다시 붙여 넣어 주세요.', 'ai_key');
    throw new HttpError(502, `AI 서버에 연결하지 못했습니다 (${e?.cause?.code || e?.name || '연결 오류'}). 잠시 뒤 다시 시도해 주세요.`, 'ai_connect');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || '';
    if (r.status === 401) throw new HttpError(502, 'AI API 키가 올바르지 않습니다. Railway의 ANTHROPIC_API_KEY를 확인해 주세요.', 'ai_key');
    console.error('[AI 오류]', r.status, JSON.stringify(data).slice(0, 500));
    if (r.status === 404 && /model/i.test(msg)) throw new HttpError(502, `AI 모델 이름(${config.anthropic.model})을 찾지 못했습니다. ANTHROPIC_MODEL 값을 확인해 주세요.`, 'ai_model');
    if (/credit balance/i.test(msg)) throw new HttpError(402, 'Anthropic 크레딧이 부족합니다. console.anthropic.com에서 크레딧을 충전해 주세요.', 'ai_credit');
    if (r.status === 429) throw new HttpError(429, 'AI 요청이 많아 잠시 막혔습니다. 1분쯤 뒤 다시 시도해 주세요.', 'ai_rate');
    if (r.status === 529 || r.status >= 500) throw new HttpError(503, 'AI 서버가 바쁩니다. 잠시 뒤 다시 시도해 주세요.', 'ai_busy');
    throw new HttpError(502, `AI 요청이 거절되었습니다 (${r.status}): ${msg || '이유 미상'}`, 'ai_error');
  }
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const json = (data.content || []).find((b) => b.type === 'tool_use')?.input;
  return { text, json, truncated: data.stop_reason === 'max_tokens', usage: data.usage };
}
export async function callClaudeJson({ system, user, schema, name = 'answer', maxTokens = 4000 }) {
  const sys = `${system}\n\n답은 반드시 ${name} 도구를 한 번 호출해 제출한다. 도구 밖에 다른 글을 쓰지 않는다.`;
  const r = await callClaude({ system: sys, messages: [{ role: 'user', content: user }], maxTokens, tool: { name, description: '답을 이 양식으로 제출한다. 반드시 이 도구로만 답한다.', input_schema: schema } });
  if (r.json && typeof r.json === 'object') return r.json;
  if (r.truncated) throw new HttpError(502, 'AI 답이 너무 길어 끊겼습니다. 다시 시도해 주세요.', 'ai_parse');
  try {
    return parseJsonLoose(r.text);
  } catch (e) {
    console.error('[AI 양식 오류]', String(r.text).slice(0, 500));
    throw e;
  }
}
export function parseJsonLoose(text) {
  const t = String(text || '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  const body = fenced ? fenced[1] : t;
  const start = body.search(/[{[]/);
  if (start < 0) throw new HttpError(502, 'AI 응답을 읽지 못했습니다. 다시 시도해 주세요.', 'ai_parse');
  const open = body[start];
  const close = open === '{' ? '}' : ']';
  const end = body.lastIndexOf(close);
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    throw new HttpError(502, 'AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.', 'ai_parse');
  }
}

export async function correctWriting(week, text, level = '') {
  const who = week.format === 'class'
    ? "'숏폼 중국어' 수업(중국 숏폼 크리에이터 표현 학습, 초급·중급 혼합반)의 한국인 학습자"
    : '한국인 초급 중국어 학습자(여행 중국어 초급 수준)';
  const system = `너는 ${who}를 가르치는 친절한 중국어 선생님이다.
학습자가 쓴 중국어 작문을 첨삭한다.
- 설명은 모두 한국어로, 초급 학습자가 이해할 수 있게 쉽게 쓴다.
- 틀린 곳만 고치고, 맞게 쓴 표현은 바꾸지 않는다. 더 자연스러운 표현은 suggestions에 따로 제안한다.
- 병음은 성조 부호를 붙여 정확하게 쓴다.
- 칭찬을 먼저 하고, 고칠 점은 구체적으로 알려 준다.
- 학습자가 중국어가 아닌 글(한국어 등)을 썼으면 corrected에 그 뜻을 중국어로 옮긴 문장을 쓰고 overall에서 중국어로 써 보라고 권한다.`;
  const user = `[이번 주 학습 내용]
${week.week}주차: ${week.title} (${week.titleZh})
핵심 문형: ${week.patterns.map((p) => p.form).join(' / ') || '없음'}
${week.words.length ? `이번 주 단어: ${week.words.map((w) => `${w.hanzi}(${w.pinyin})`).join(', ')}` : `이번 주 언어 학습: ${week.focus || ''}`}
${week.format === 'class' ? '과제' : '미션'}: ${week.mission}${week.format === 'class' ? (level ? `\n학습자 수준: ${level}. ${level === '중급' ? '문장의 자연스러움과 표현의 뉘앙스까지 설명하고, 수정문 말고도 쓸 수 있는 대안 표현을 함께 알려 준다.' : '기본 어순과 문법 오류를 중심으로 쉽게 설명한다.'} 수정문을 유일한 정답처럼 말하지 말고, 원문도 맞는 부분은 맞다고 알려 준다.` : '\n학습자가 초급 과제를 했는지 중급 과제를 했는지 보고, 그 수준에 맞게 첨삭한다.') : ''}

[학습자의 작문]
${text}

answer 도구로 첨삭 결과를 제출하라.`;
  const str = (d) => ({ type: 'string', description: d });
  return callClaudeJson({
    system,
    user,
    maxTokens: 3000,
    schema: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100, description: '문법·어휘·미션 수행을 고려한 점수(0~100)' },
        praise: str('잘한 점 1~2문장'),
        corrected: str('고친 전체 문장(중국어). 틀린 곳이 없으면 원문 그대로'),
        correctedPinyin: str('고친 문장의 병음(성조 부호 포함)'),
        translation: str('고친 문장의 한국어 뜻'),
        errors: {
          type: 'array',
          description: '틀린 부분 목록(없으면 빈 배열)',
          items: {
            type: 'object',
            properties: { original: str('틀린 부분'), fixed: str('고친 표현'), reason: str('왜 틀렸는지 한국어로 쉽게') },
            required: ['original', 'fixed', 'reason'],
          },
        },
        usedWords: { type: 'array', items: { type: 'string' }, description: '이번 주 단어 중 작문에 쓴 단어' },
        suggestions: str('더 자연스러운 표현이나 다음에 써 볼 문장 제안 1~2개'),
        overall: str('종합 한마디(격려 포함)'),
      },
      required: ['score', 'praise', 'corrected', 'correctedPinyin', 'translation', 'errors', 'usedWords', 'suggestions', 'overall'],
    },
  });
}

// 사회자(고급) 전용: 궁금한 문장을 바로 확인한다. 저장하지 않는다.
export async function checkSentence(text) {
  const system = `너는 한국인 고급 중국어 학습자(사회자 중국어)를 돕는 중국어 선생님이다.
학습자가 행사 진행 중 쓰고 싶은 중국어 문장이 맞는지 확인해 준다.
- 문법, 어휘, 어순이 맞는지 본다.
- 행사 사회자 말투에 맞는지 본다. 내빈에게는 您, 各位, 请允许我 같은 존댓말을 쓰는 것이 자연스럽다.
- 틀린 곳만 고치고, 맞는 표현은 바꾸지 않는다.
- 설명은 모두 한국어로 쉽게 쓴다. 병음은 성조 부호를 붙여 정확하게 쓴다.
- 학습자가 중국어가 아닌 글(한국어 등)을 썼으면 그 뜻을 중국어 문장으로 옮겨 corrected에 쓴다.`;
  const user = `[학습자가 확인하려는 문장]
${text}

answer 도구로 확인 결과를 제출하라.`;
  const str = (d) => ({ type: 'string', description: d });
  return callClaudeJson({
    system,
    user,
    maxTokens: 1500,
    schema: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['good', 'fix', 'rewrite'], description: 'good=맞고 자연스러움, fix=작은 수정 필요, rewrite=다시 쓰는 것이 좋음' },
        corrected: str('고친 문장(중국어). 맞으면 원문 그대로'),
        correctedPinyin: str('고친 문장의 병음(성조 부호 포함)'),
        translation: str('고친 문장의 한국어 뜻'),
        notes: {
          type: 'array',
          description: '고친 부분 목록(없으면 빈 배열)',
          items: {
            type: 'object',
            properties: { original: str('원래 표현'), fixed: str('고친 표현'), reason: str('왜 고쳤는지 한국어로 쉽게') },
            required: ['original', 'fixed', 'reason'],
          },
        },
        mcTip: str('행사 사회 상황에서 쓸 때의 한마디 팁(한국어)'),
      },
      required: ['verdict', 'corrected', 'correctedPinyin', 'translation', 'notes', 'mcTip'],
    },
  });
}

// ---------------- AI 회화 파트너 ----------------
// 주차별 상황에서 중국인 역할을 맡아 대화한다. 학생이 먼저 말하게 하고, 틀린 곳은 짧게 바로잡는다.
function convoSystem(sc, level) {
  const basic = level !== '중급';
  return `너는 '숏폼 중국어' 수업의 AI 회화 파트너다. 지금 너는 「${sc.role}」 역할로, 「${sc.situation}」 상황에서 한국인 중국어 학습자와 대화한다.
- 역할에 맞는 사람처럼 자연스럽게 중국어로 말한다. 한 번에 한두 문장만 말하고, 마지막에 학습자가 대답할 질문이나 말할 거리를 하나 남긴다.
- 학습자 대신 학습자의 대답을 만들어 주지 않는다. 학습자가 먼저 표현하게 한다.
- 학습자 문장에 틀린 곳이 있으면 correction에 짧게 바로잡는다. 틀린 곳이 없으면 correction은 빈 문자열로 둔다. 대화는 끊지 않고 이어 간다.
${basic ? '- 학습자는 초급이다. 짧고 쉬운 문장, 기초 어휘만 쓴다. hint에 한국어 뜻과 대답에 쓸 수 있는 짧은 표현을 적어 준다.' : '- 학습자는 중급이다. 자연스러운 구어체로 말하고, 필요하면 후속 질문을 한다. hint는 꼭 필요할 때만 짧게 쓴다.'}
- 정치적으로 민감하거나 개인정보를 묻는 이야기는 하지 않고 상황 안에서 대화한다.
- 병음은 성조 부호를 붙여 정확하게 쓴다.`;
}

export async function convoTurn(sc, level, messages) {
  const history = messages.map((m) => `${m.role === 'ai' ? '너' : '학습자'}: ${m.text}`).join('\n');
  const str = (d) => ({ type: 'string', description: d });
  return callClaudeJson({
    system: convoSystem(sc, level),
    user: `[지금까지의 대화]\n${history}\n\n학습자의 마지막 말에 이어 대답하라. answer 도구로 제출하라.`,
    maxTokens: 900,
    schema: {
      type: 'object',
      properties: {
        reply: str('너의 대답(중국어, 한두 문장)'),
        pinyin: str('대답의 병음'),
        ko: str('대답의 한국어 뜻'),
        correction: str('학습자 문장에서 고칠 점(한국어 설명 + 고친 중국어). 없으면 빈 문자열'),
        hint: str('학습자가 다음에 쓸 수 있는 표현이나 힌트(한국어). 필요 없으면 빈 문자열'),
      },
      required: ['reply', 'pinyin', 'ko', 'correction', 'hint'],
    },
  });
}

export async function convoFeedback(sc, level, messages) {
  const history = messages.map((m) => `${m.role === 'ai' ? '상대' : '학습자'}: ${m.text}`).join('\n');
  const str = (d) => ({ type: 'string', description: d });
  return callClaudeJson({
    system: `너는 한국인 중국어 학습자(${level || '초급'})의 회화 연습을 돌아보는 중국어 선생님이다. 설명은 한국어로 쉽게 쓰고, 병음은 성조 부호를 붙인다. 학습자가 실제로 한 말만 평가하고, 하지 않은 말을 지어내지 않는다.`,
    user: `[상황] ${sc.role} · ${sc.situation}\n\n[대화]\n${history}\n\n이 대화에서 학습자의 중국어를 돌아보라. answer 도구로 제출하라.`,
    maxTokens: 1800,
    schema: {
      type: 'object',
      properties: {
        overall: str('종합 평가 2~3문장(잘한 점 먼저)'),
        errors: {
          type: 'array',
          description: '학습자 문장의 주요 오류(없으면 빈 배열, 최대 5개)',
          items: { type: 'object', properties: { original: str('학습자가 쓴 표현'), better: str('고친 표현'), why: str('이유(한국어)') }, required: ['original', 'better', 'why'] },
        },
        expressions: {
          type: 'array',
          description: '이 상황에서 익혀 두면 좋은 표현 3~5개',
          items: { type: 'object', properties: { zh: str('중국어'), py: str('병음'), ko: str('뜻') }, required: ['zh', 'py', 'ko'] },
        },
      },
      required: ['overall', 'errors', 'expressions'],
    },
  });
}
