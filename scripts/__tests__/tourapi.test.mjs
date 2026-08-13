/**
 * TourAPI 어댑터 테스트.
 * 2026-08-13 실호출에서 드러난 두 결함(검색 실패·동명이인)의 회귀 방지가 목적이다.
 */
import assert from 'node:assert/strict';
import { keywordVariants, regionOf, normalizeKey, mentionsFilming, stripTags, extractWorkTitles } from '../lib/tourapi.mjs';

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

console.log('\n[5] stripTags 회귀 — 꺾쇠 안의 작품명을 지우지 않는다');
t('작품명을 태그로 오인하지 않는다 (실측: 도깨비가 삭제됐던 건)', () => {
  const out = stripTags('주문진 방파제는 드라마 <도깨비> 촬영지로 유명해졌다.');
  assert.ok(out.includes('<도깨비>'), out);
  assert.ok(!/드라마\s{2,}촬영지/.test(out), '공백 두 칸이 남으면 안 된다');
});
t('영문 작품명도 살아남는다', () => {
  assert.ok(stripTags('드라마 <Winter Sonata> 촬영지').includes('<Winter Sonata>'));
});
t('진짜 태그는 여전히 지운다', () => {
  assert.equal(stripTags('<p class="x">본문</p><!-- 주석 -->'), '본문');
});
t('HTML 엔티티를 되돌린다', () => {
  assert.equal(stripTags('제작사&nbsp;&amp;&nbsp;방송사'), '제작사 & 방송사');
});

console.log('\n[6] 작품명 추출 — 촬영지 정보는 데이터가 이미 말하고 있다');
t('꺾쇠 작품명을 촬영 문맥과 함께 뽑는다', () => {
  const r = extractWorkTitles('주문진 방파제는 드라마 <도깨비> 촬영지로 유명해졌다.');
  assert.deepEqual(r.map((x) => x.title), ['도깨비']);
  assert.ok(r[0].evidence.includes('촬영'));
});
t('여러 괄호 형식을 모두 인식한다', () => {
  const got = (s) => extractWorkTitles(s).map((x) => x.title);
  assert.deepEqual(got('영화 「기생충」 촬영지'), ['기생충']);
  assert.deepEqual(got('드라마 《사랑의 불시착》 로케이션'), ['사랑의 불시착']);
  assert.deepEqual(got("드라마 '오징어 게임' 촬영"), ['오징어 게임']);
});
t('한 문장에 두 작품이 있으면 둘 다 뽑는다', () => {
  const r = extractWorkTitles('드라마 <도깨비> 와 <미스터 션샤인> 의 촬영지다.');
  assert.deepEqual(r.map((x) => x.title), ['도깨비', '미스터 션샤인']);
});
t('촬영 문맥이 없으면 뽑지 않는다 — 오탐 방지가 최우선', () => {
  assert.deepEqual(extractWorkTitles('입장료는 <성인 3000원> 이다.'), []);
  assert.deepEqual(extractWorkTitles('자세한 내용은 <문의처> 참조'), []);
});
t('문맥어 자체는 작품명이 아니다', () => {
  assert.deepEqual(extractWorkTitles('<촬영지> 안내입니다. 드라마 촬영'), []);
});
t('같은 작품이 두 번 나와도 한 번만 센다', () => {
  const r = extractWorkTitles('드라마 <도깨비> 촬영지. <도깨비> 팬들이 찾는다. 촬영');
  assert.equal(r.length, 1);
});
t('실측: 위양지 소개글에서는 아무것도 나오지 않는다', () => {
  assert.deepEqual(extractWorkTitles('위양지는 선량한 백성들을 위해 축조했다고 하여 붙여진 이름이다.'), []);
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
