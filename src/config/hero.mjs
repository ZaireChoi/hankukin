/**
 * 대표사진 — 번역본은 원문에서 물려받고, 대체텍스트만 자기 것을 쓴다.
 *
 * 왜 (2026-08-22). 자세한 사연은 content.config.mjs 의 heroAlt 주석에 적었다.
 * 요약하면, 규칙은 「사진은 한 곳에만 적는다」였는데 코드가 그 규칙을 실행하지 않았다.
 * 그래서 번역본 18쪽이 두 갈래로 잘못돼 있었다 —
 * 9쪽은 사진이 아예 안 나오고, 9쪽은 같은 사실을 세 군데에 적어 두고 있었다.
 *
 * 무엇을 물려받고 무엇을 안 받는가.
 *
 *   물려받는다  src · license · sourceUrl · credit · isIllustration
 *              → 사실이다. 파일이 무엇이고 누가 찍었고 어떤 라이선스인지는
 *                독자의 언어와 아무 상관이 없다. 한 곳에서만 참이면 된다.
 *
 *   안 받는다   alt
 *              → 글이다. 영어 alt 를 일본어 페이지에 붙이면
 *                화면 낭독기가 일본어 문단 사이에서 갑자기 영어를 읽는다.
 *                ui.mjs 의 t() 가 「영어로 대체하지 않습니다」라고 던지는 것과 같은 이유다.
 *
 * 원문에 사진이 없으면 번역본에도 없다. 번역본이 원문에 없는 사진을 갖는 일은
 * 「같은 기사의 다른 언어판」이라는 전제 자체를 깨는 것이라 허용하지 않는다.
 */

/**
 * 한 컬렉션의 항목 전체를 받아 대표사진 해결 함수를 돌려준다.
 *
 * getStaticPaths 안에서 한 번만 만들어 쓴다 — 페이지마다 컬렉션을 다시 훑지 않기 위해서다.
 *
 * @param entries  그 컬렉션의 항목 전체 (원문 + 번역본)
 * @param section  컬렉션 이름. translation.of 가 'now/foo' 처럼 적히는데
 *                 entry.id 는 'foo' 라서, 앞의 'now/' 를 벗겨 맞춘다.
 */
export function makeHeroResolver(entries, section) {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const prefix = `${section}/`;

  return function heroOf(entry) {
    const ofRaw = entry.data.translation?.of;

    // 원문 — 자기 frontmatter 가 곧 사실이다
    if (!ofRaw) return entry.data.hero ?? null;

    const originId = ofRaw.startsWith(prefix) ? ofRaw.slice(prefix.length) : ofRaw;
    const origin = byId.get(originId);
    const base = origin?.data.hero;
    if (!base) return null;

    /*
     * heroAlt 가 없으면 원문의 영어 alt 로 **떨어뜨리지 않는다.**
     * 번역이 덜 된 것을 조용히 영어로 메우면 아무도 눈치채지 못한다 —
     * 이 저장소가 반복해서 낸 바로 그 실수다. 게이트가 빌드를 세운다.
     */
    return { ...base, alt: entry.data.heroAlt ?? base.alt };
  };
}
