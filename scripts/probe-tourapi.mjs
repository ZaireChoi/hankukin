#!/usr/bin/env node
/**
 * TourAPI 실호출 검증.
 *
 * 개발 환경에서는 외부 API 접근이 막혀 있어 어댑터를 실제 응답으로 검증할 수 없다.
 * 이 스크립트를 GitHub Actions 에서 한 번 돌려 무엇이 돌아오는지 눈으로 확인한다.
 * 오늘 하루 반복된 교훈 — 빌드 통과와 테스트 통과는 '작동한다'의 증거가 아니다.
 *
 * 실행: node scripts/probe-tourapi.mjs
 */
import { assertTourApiKey, normalizeKey, searchPlace, fetchOverview, toSource } from './lib/tourapi.mjs';

const log = {
  info: (...a) => console.log('[probe]', ...a),
  warn: (...a) => console.warn('[probe][warn]', ...a),
  error: (...a) => console.error('[probe][error]', ...a),
};

/** 성격이 다른 3가지를 시험한다 */
const CASES = [
  { q: '주문진해수욕장', why: '도깨비 촬영지 인근 — 관광지로 정착한 사례' },
  { q: '경복궁',        why: '오늘 쓴 문화 기사의 장소 — 대표 명소' },
  { q: '위양지',        why: '블로그가 동궁 촬영지라 주장한 곳 — 관광지로는 실재' },
];

async function main() {
  assertTourApiKey();
  const { wasEncoded } = normalizeKey(process.env.DATA_GO_KR_KEY);
  log.info(`인증키 형태: ${wasEncoded ? 'Encoding (자동 디코딩함)' : 'Decoding'}`);

  let ok = 0, fail = 0;
  for (const c of CASES) {
    console.log(`\n───── "${c.q}" — ${c.why}`);
    const items = await searchPlace(c.q, { rows: 3, log });
    if (!items) { fail++; log.error('검색 실패'); continue; }
    if (items.length === 0) { log.warn('결과 0건'); continue; }
    ok++;

    for (const it of items) {
      console.log(`  · ${it.title}`);
      console.log(`      주소: ${it.address ?? '—'}`);
      console.log(`      좌표: ${it.lat ?? '—'}, ${it.lng ?? '—'}`);
      console.log(`      이미지: ${it.image ? '있음' : '없음'} / 수정일: ${it.modifiedAt ?? '—'}`);
    }

    const first = items[0];
    const overview = await fetchOverview(first.contentId, { log });
    if (overview) {
      console.log(`\n  [소개글 발췌] ${overview.slice(0, 220).replace(/\n/g, ' ')}...`);
      // 촬영지 언급이 들어있는지 — 이게 있으면 게이트를 열 근거가 된다
      const mentions = ['촬영', '드라마', '영화'].filter((k) => overview.includes(k));
      console.log(`  [촬영지 언급] ${mentions.length ? `있음 (${mentions.join(', ')})` : '없음'}`);
    } else {
      console.log('  [소개글] 없음');
    }
    console.log(`\n  [출처 형식] ${JSON.stringify(toSource(first), null, 2).replace(/\n/g, '\n  ')}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n결과: 성공 ${ok} / 실패 ${fail}\n`);
  if (ok === 0) throw new Error('TourAPI 호출이 한 건도 성공하지 못했습니다.');
}

main().catch((e) => { log.error(e.message); process.exit(1); });
