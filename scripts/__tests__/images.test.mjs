/**
 * 이미지 저작권 판정 테스트.
 *
 * 지키려는 것 하나: **상업적 이용이 불가한 사진을 절대 통과시키지 않는다.**
 * 사진 한 장 잘못 쓰면 사이트 전체가 문제가 된다.
 */
import assert from 'node:assert/strict';
import { classifyImageLicense, IMAGE_LICENSE } from '../lib/tourapi.mjs';

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log('  ✓', n); pass++; } catch (e) { console.log('  ✗', n, '\n     ', e.message); fail++; } };

console.log('\n[1] 공공누리 유형 판정');
t('1유형은 통과하고 변형이 허용된다', () => {
  const r = classifyImageLicense('Type1');
  assert.equal(r.commercial, true);
  assert.equal(r.canModify, true);
});
t('3유형은 통과하되 변형이 금지된다', () => {
  const r = classifyImageLicense('Type3');
  assert.equal(r.commercial, true);
  assert.equal(r.canModify, false);
});

console.log('\n[2] 통과시키면 안 되는 것들');
t('2유형(상업이용 금지)은 거부', () => assert.equal(classifyImageLicense('Type2'), null));
t('4유형(상업이용·변경 금지)은 거부', () => assert.equal(classifyImageLicense('Type4'), null));
t('값이 없으면 거부 — 모르면 안 쓴다', () => {
  assert.equal(classifyImageLicense(undefined), null);
  assert.equal(classifyImageLicense(null), null);
  assert.equal(classifyImageLicense(''), null);
});
t('알 수 없는 값은 거부', () => {
  assert.equal(classifyImageLicense('Public'), null);
  assert.equal(classifyImageLicense('type1'), null);   // 대소문자도 정확히 일치해야 한다
});
t('허용 목록에 2·4유형이 아예 존재하지 않는다', () => {
  assert.deepEqual(Object.keys(IMAGE_LICENSE).sort(), ['Type1', 'Type3']);
});

console.log('\n[3] 변경금지 사진은 리사이즈 대상이 아니다');
t('canModify 가 false 면 원본 그대로여야 한다', () => {
  // fetch-images.mjs 가 이 값을 보고 리사이즈 여부를 정한다.
  // 유형3을 줄여서 저장하면 라이선스 위반이다.
  assert.equal(classifyImageLicense('Type3').canModify, false);
});

console.log(`\n결과: ${pass} 통과, ${fail} 실패\n`);
process.exit(fail ? 1 : 0);
