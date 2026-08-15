/**
 * 저자 — 한 사람이다.
 *
 * 왜 만드나 (2026-08-16 운영자 승인).
 *
 *   외부 평가와 우리 자체 판단이 같은 것을 최대 약점으로 꼽았다.
 *   "About 페이지에 '한 사람이 운영한다' 고 쓰여 있지만 그 사람이 누구인지 나오지 않는다."
 *   구조화 데이터의 author 도 사람이 아니라 조직(HANKUKIN)이었다.
 *
 *   2026년에 이건 치명적이다. 생성된 여행글이 넘치는데
 *   **뒤에 아무도 없는 사이트**는 그 더미와 구별할 방법이 없다.
 *
 * 여기 적는 것의 한계 — 지어내지 않는다.
 *
 *   운영자가 공개를 승인한 것만 적는다. 실명은 쓰지 않는다.
 *   직업과 소속은 승인받지 않았으므로 쓰지 않는다.
 *   "10년 경력" 같은 수식도 붙이지 않는다 — 확인한 바 없다.
 *
 *   저자 소개에서 거짓말을 하면 그 사이트의 다른 모든 문장이 같이 죽는다.
 *   **적을 게 적어서 짧은 소개는 괜찮다. 부풀린 소개는 안 괜찮다.**
 */
export const AUTHOR = {
  /** 필명. 실명은 공개하지 않는다 (운영자 결정, 2026-08-16). */
  name: 'Suyol',

  /** 한 줄 소개 — 기사 하단 byline 에 쓴다. */
  short: 'Korean, reads the Korean sources this site is built on, and has lived and worked outside Korea.',

  /**
   * 검증된 사실만. 각 줄은 운영자가 직접 말한 것에 근거한다.
   * 근거 없는 줄을 여기 넣지 말 것.
   */
  facts: [
    {
      claim: 'Korean, and reads the Korean-language sources directly',
      why: 'Almost everything on this site comes from Korean government pages, agency notices and press releases that have no English version. Where a figure matters, the Korean sentence it came from is printed on the page next to it, so you can check the translation rather than take it on trust.',
    },
    {
      claim: 'Has lived and worked outside Korea',
      why: 'Which is where the angle of this site comes from. Most Korean travel information is written for people who already know how things work here. The gaps this site tries to fill are the ones that are only visible if you have been the foreigner somewhere.',
    },
  ],

  /** AI 를 어떻게 쓰는지 — 숨기지 않는다. 숨기면 그게 약점이 된다. */
  ai: [
    'Drafting, translation and the charts are done with AI assistance, and this is stated on every article.',
    'Sources are chosen and read by a person. Figures are checked against the primary source, not against a summary of it.',
    'Every photograph in use has been opened and looked at by a person before publication. The build refuses to publish one that has not.',
    'When something turns out to be wrong it is corrected and the correction is listed publicly.',
  ],
};
