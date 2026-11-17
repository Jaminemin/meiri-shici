// 주차 대표 화면: 교수자가 올린 사진(출처 표시)이 있으면 그 사진을, 없으면 숏폼 앱 화면처럼 꾸민 기본 표지를 보여 준다.
// 기본 표지에는 사람·캐릭터를 넣지 않고, 검색창·자막·해시태그·반응 버튼으로 실제 숏폼 화면의 느낌을 낸다.
import { esc } from './core.js';

// 단계별 배경: 1 일상(따뜻한 저녁빛) · 2 거리(도시 야경) · 3 사회문화(푸른 사무실 톤) · 4 제작(보라 스튜디오 톤)
const BG = {
  1: 'linear-gradient(160deg,#3a1f1a 0%,#a2482f 45%,#f2a65a 100%)',
  2: 'linear-gradient(160deg,#0b1430 0%,#26336b 50%,#c2416b 100%)',
  3: 'linear-gradient(160deg,#0f2a3a 0%,#1f5f7a 55%,#7fc1c9 100%)',
  4: 'linear-gradient(160deg,#1d1238 0%,#4b2c8f 55%,#c79bff 100%)',
};

export function coverHtml(w, { small = false } = {}) {
  if (w.cover?.url) {
    return `<figure class="cover ${small ? 'sm' : ''}"><img src="${esc(w.cover.url)}" alt="${esc(`${w.week}주차 ${w.title}`)}" loading="lazy">${w.cover.source ? `<figcaption class="cover-src">${w.cover.sourceUrl && !small ? `<a href="${esc(w.cover.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(w.cover.source)}</a>` : esc(w.cover.source)}</figcaption>` : ''}</figure>`;
  }
  // 숏폼 과정 1~15주차: 주차별 일러스트 표지 (public/img/weeks/wNN.jpg)
  const n = Number(w.week);
  if (w.format === 'class' && n >= 1 && n <= 15) {
    return `<figure class="cover art ${small ? 'sm' : ''}"><img src="/img/weeks/w${String(n).padStart(2, '0')}.jpg" alt="${esc(`${n}주차 ${w.title} 표지`)}" loading="lazy" decoding="async"></figure>`;
  }
  const kw = (w.keywords || []).filter(Boolean);
  const caption = w.caption || w.titleZh || '';
  const seed = Number(w.week) || 1;
  return `<figure class="cover sf ${small ? 'sm' : ''}" style="background:${BG[w.stage] || BG[1]}" aria-label="${esc(`${w.week}주차 ${w.title} 표지`)}">
    <div class="sf-top"><span class="sf-search">⌕ ${esc(kw[0] || w.titleZh || '')}</span>${small ? '' : '<span class="sf-live">关注 · 推荐</span>'}</div>
    <div class="sf-side" aria-hidden="true"><span>♥</span><span>💬</span><span>★</span>${small ? '' : '<span>↗</span>'}</div>
    <div class="sf-bottom">
      <div class="sf-cap zh">${esc(caption)}</div>
      ${small ? '' : `<div class="sf-meta">@短视频与现代汉语学习 · 第${seed}周</div><div class="sf-tags zh">${kw.map((k) => `#${esc(k)}`).join(' ')}</div>`}
    </div>
    <figcaption class="cover-src">${esc(w.week)}주차 · ${esc((w.videos && w.videos[0]) || w.title)}</figcaption>
  </figure>`;
}
