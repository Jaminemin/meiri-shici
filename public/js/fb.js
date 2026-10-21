// AI 첨삭 결과 카드
import { esc, fmtDate } from './core.js';

export function feedbackHtml(w, { showOriginal = true, who = '' } = {}) {
  const f = w.feedback || {};
  return `<div class="card">
    <div class="row between" style="align-items:flex-start">
      <div><div class="ai-label">${who ? `${esc(who)} · ` : ''}${w.week ? `${w.week}주차 · ` : ''}${fmtDate(w.created_at, true)} · AI 첨삭</div>
      ${showOriginal ? `<div style="margin-top:6px"><span class="muted" style="font-size:13px">내가 쓴 글</span><div class="zh" style="font-size:18px">${esc(w.content)}</div></div>` : ''}</div>
      <div style="text-align:center"><div class="fb-score">${esc(w.score ?? f.score ?? '–')}</div><small class="muted">/ 100</small></div>
    </div>
    ${f.praise ? `<p style="margin-top:10px">👍 ${esc(f.praise)}</p>` : ''}
    <div style="margin-top:8px"><span class="muted" style="font-size:13px">고친 문장</span>
      <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="zh fb-corrected" style="flex:1">${esc(f.corrected || '')}</div>${f.corrected ? `<button class="speak" data-speak="${esc(f.corrected)}" title="발음 듣기" aria-label="발음 듣기">🔊</button>` : ''}</div>
      <div class="py">${esc(f.correctedPinyin || '')}</div><div class="muted" style="font-size:14px">${esc(f.translation || '')}</div></div>
    ${(f.errors || []).length ? `<h3 style="margin-top:14px">고칠 곳</h3>${f.errors.map((e) => `<div class="err"><span class="zh"><s>${esc(e.original)}</s> → <b>${esc(e.fixed)}</b></span><br>${esc(e.reason)}</div>`).join('')}` : '<p class="muted" style="margin-top:10px">틀린 곳이 없어요! 🎉</p>'}
    ${(f.usedWords || []).length ? `<p style="font-size:14px">이번 주 단어 사용: ${f.usedWords.map((x) => `<span class="tag zh">${esc(x)}</span>`).join(' ')}</p>` : ''}
    ${f.suggestions ? `<p style="font-size:14px">💡 ${esc(f.suggestions)}</p>` : ''}
    ${f.overall ? `<div class="ai-box">${esc(f.overall)}</div>` : ''}
  </div>`;
}
