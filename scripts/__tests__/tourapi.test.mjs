/**
 * TourAPI 어댑터 테스트.
 * 2026-08-13 실호출에서 드러난 두 결함(검색 실패·동명이인)의 회귀 방지가 목적이다.
 */
import assert from 'node:assert/strict';
import { keywordVariants, regionOf, normalizeKey, mentionsFilming, stripTags } from '../lib/tourapi.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log('  ✓', n); pass++; } catch (e) { console.log('  ✗', n, '\n     ', e.message); fail++; } };

console.log('\n[1] 키워드 변형 — 검색 0건 방어 (실측: 주문진해수욕장)');
t('붙여쓰기 이름에서 띄어쓰기 형태를 만든다', () => {
  const v = keywordVariants('주문진해수욕장');
  assert.ok(v.includes('주문진 해수욕장'), v.join(','));
});
t('해수욕장 ↔ 해변 동의어를 만든다', () => {
  assert.ok(keywordVariants('주문진해수욕장').includes('주문진해변'));
  assert.ok(keywordVariants('정동진해변').includes('정동진해수욕장'));
});
t('원본 키워드가 항상 첫 번째다', () => {
  assert.equal(keywordVariants('경복궁')[0], '경복궁');
});
t('중복 변형을 만들지 않는다', () => {
  const v = keywordVariants('경복궁');
  assert.equal(new Set(v).size, v.length);
});

console.log('\n[2] 지역 판별 — 동명이인 방어 (실측: 경복궁 서울/울산)');
t('서울과 울산을 구분한다', () => {
  assert.equal(regionOf('서울특별시 종로구 사직로 161'), '서울');
  assert.equal(regionOf('울산광역시 남구 산업로 595'), '울산');
});
t('특별자치도 표기를 인식한다', () => {
  assert.equal(regionOf('강원특별자치도 강릉시 주문진읍'), '강원');
  assert.equal(regionOf('전북특별자치도 전주시'), '전북');
});
t('알 수 없는 주소는 null 을 돌려준다', () => {
  assert.equal(regionOf(''), null);
  assert.equal(regionOf('알 수 없는 곳'), null);
});

console.log('\n[3] 인증키 형태 자동 판별');
t('Encoding 키를 디코딩한다', () => {
  assert.equal(normalizeKey('abc%2Fdef%3D%3D').value, 'abc/def==');
});
t('Decoding 키는 그대로 둔다', () => {
  assert.equal(normalizeKey('abc/def==').value, 'abc/def==');
});
t('빈 값이면 명확히 실패한다', () => {
  assert.throws(() => normalizeKey(''), /DATA_GO_KR_KEY/);
});

console.log('\n[4] 촬영지 언급 판정');
t('촬영 관련 단어를 잡아낸다', () => {
  const r = mentionsFilming('드라마 도깨비 촬영지로 알려져 있다');
  assert.equal(r.mentioned, true);
  assert.ok(r.hits.includes('촬영'));
});
t('관광 소개글만 있으면 언급 없음 (실측: 위양지)', () => {
  const r = mentionsFilming('위양지는 선량한 백성들을 위해 축조했다고 하여 붙여진 이름이다. 밀양 팔경의 하나로 꼽힌다.');
  assert.equal(r.mentioned, false);
});
t('HTML 태그를 제거한다', () => {
  assert.equal(stripTags('강릉 <b>주문진</b><br />방파제'), '강릉 주문진\n방파제');
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
