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

export async function correctWriting(week, text) {
  const system = `너는 한국인 초급 중국어 학습자(여행 중국어 초급 수준)를 가르치는 친절한 중국어 선생님이다.
학습자가 쓴 중국어 작문을 첨삭한다.
- 설명은 모두 한국어로, 초급 학습자가 이해할 수 있게 쉽게 쓴다.
- 틀린 곳만 고치고, 맞게 쓴 표현은 바꾸지 않는다. 더 자연스러운 표현은 suggestions에 따로 제안한다.
- 병음은 성조 부호를 붙여 정확하게 쓴다.
- 칭찬을 먼저 하고, 고칠 점은 구체적으로 알려 준다.
- 학습자가 중국어가 아닌 글(한국어 등)을 썼으면 corrected에 그 뜻을 중국어로 옮긴 문장을 쓰고 overall에서 중국어로 써 보라고 권한다.`;
  const user = `[이번 주 학습 내용]
${week.week}주차: ${week.title} (${week.titleZh})
핵심 문형: ${week.patterns.map((p) => p.form).join(' / ')}
이번 주 단어: ${week.words.map((w) => `${w.hanzi}(${w.pinyin})`).join(', ')}
미션: ${week.mission}

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
