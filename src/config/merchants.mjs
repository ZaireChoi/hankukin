/**
 * 제휴사 등록부 — 어떤 링크가 '진짜 제휴 링크' 인지 한 곳에서 정한다.
 *
 * 왜 필요한가 (2026-08-13, 운영자 지적):
 *   도깨비 기사에 Klook·Agoda·Gmarket 링크가 있고 그 아래에
 *   "제휴 링크이며 수수료를 받을 수 있다" 는 고지가 붙어 있었다.
 *   그런데 우리는 어느 곳에도 제휴를 신청하지 않았고 링크에 태그도 없다.
 *   **그 고지는 거짓이었다.**
 *
 *   출처 없는 촬영지를 반려해 놓고, 우리 자신에 대해서는
 *   근거 없는 주장을 페이지에 싣고 있었다. 방향만 반대일 뿐 같은 종류다.
 *
 * 규칙:
 *   affiliate 가 true 인 곳만 제휴 고지를 띄운다.
 *   신청·승인이 끝나기 전에는 절대 true 로 바꾸지 않는다.
 *   승인되면 appliedAt / approvedAt 을 적고 tagParam·tagValue 를 채운다.
 *   그 순간부터 링크에 자동으로 태그가 붙고 고지 문구가 바뀐다. 기사는 손댈 필요가 없다.
 */

export const MERCHANTS = {
  Klook: {
    name: 'Klook',
    /**
     * 2026-08-16 신청. **아직 승인이 아니다.**
     *
     * 계정만 만들어졌고 활성화 메일이 발송된 상태다.
     * appliedAt 은 기록이고 affiliate 는 여전히 false 다 —
     * 이 둘을 헷갈리면 승인도 없이 제휴 고지가 켜진다.
     * 그게 정확히 8월 13일에 걷어냈던 그 거짓말이다.
     *
     * 승인 통보를 **받은 뒤에** 다음 네 가지를 함께 고친다:
     *   affiliate: true · approvedAt · tagParam · tagValue
     * 그러면 링크 태그·rel="sponsored"·푸터 고지가 저절로 따라온다 (시험 완료).
     *
     * 신청서에 적은 것 — 나중에 문의가 오면 이것과 맞아야 한다:
     *   Website Type      콘텐츠/블로그 (쿠폰·캐시백 아님)
     *   Target Audience   United States
     *   Traffic           최소 — 2026-08-14 발행 시작이라고 사실대로 적었다
     *   Promotion         자사 기사 안의 문맥 링크만. 유료검색·쿠폰·리스트메일 없음
     */
    /**
     * 2026-08-16 승인 · 같은 날 켰다.
     *
     * 켜기 전에 **기사에 실제 상품 링크를 먼저 넣었다.** 순서가 중요하다 —
     * 링크 없이 켜면 푸터가 'Some links are affiliate links' 라고 말하는데
     * 그런 링크가 없다. 8월 13일에 걷어낸 거짓말과 방향만 반대인 같은 거짓말이다.
     * **승인이 그 문장을 참으로 만드는 게 아니라 링크가 참으로 만든다.**
     */
    affiliate: true,
    appliedAt: '2026-08-16', approvedAt: '2026-08-16',
    /**
     * 2026-08-16 승인. Klook 은 자동 승인이라 신청 당일 링크 도구가 열렸다.
     *
     * tagValue 는 **추측하지 않고 포털에서 실제로 링크를 만들어 확인했다.**
     *   생성 결과: affiliate.klook.com/redirect?aid=131289&aff_adid=1386321&k_site=...
     *   → aid=131289 가 우리 제휴 ID 다.
     *
     * 파라미터 이름을 추측했다면 링크는 멀쩡히 열리는데 수수료만 안 잡혔을 것이다.
     * 클릭도 되고 페이지도 뜨니 **아무도 몇 달 동안 모른다.** 그런 종류의 실패다.
     *
     * 왜 redirect 형식이 아니라 ?aid= 를 쓰나:
     *   포털 안내문에 '주소 뒤에 ?aid=xxxx 를 붙이기만 하면 된다' 고 적혀 있다.
     *   redirect 형식은 aff_adid 로 **링크별** 실적을 나눠 볼 수 있는 대신
     *   링크를 하나하나 포털에서 만들어야 한다.
     *   지금은 링크가 몇 개뿐이라 단순한 쪽이 낫다.
     *   기사별 전환을 나눠 봐야 할 만큼 트래픽이 붙으면 그때 바꾼다.
     */
    tagParam: 'aid', tagValue: '131289',
    note: '체험·투어 5~6.5%, eSIM 최대 20%. eSIM 이 가장 크고 우리에겐 아직 그 기사가 없다.',
  },
  Agoda: {
    name: 'Agoda',
    affiliate: false,
    /*
     * 2026-08-16 저녁에 신청을 끝냈는데 **여기에 안 적었다.**
     * 이 파일 맨 위 주석에 "appliedAt 은 기록이고 affiliate 는 여전히 false" 라고
     * 적어 놓고, 정작 기록을 안 남겼다. 이틀 뒤면 신청했는지 아닌지 헷갈렸을 것이다.
     * → 등록부를 만든 이유가 기억에 의존하지 않기 위해서다. (2026-08-16 밤 발견)
     */
    appliedAt: '2026-08-16', approvedAt: null,
    tagParam: null, tagValue: null,
    note: '숙박. 도메인 수동 심사 대기 (최대 1주). 승인되면 링크를 먼저 넣고 스위치를 켠다.',
  },
  /*
   * Trip.com — **신청하지 않았다.** 2026-08-16 밤 운영자 문의로 후보에 올렸다.
   *
   * 왜 지금 안 하나.
   *   이미 Klook(체험·교통) 승인, Agoda(숙박) 심사 중이다. Trip.com 은 둘 다와 겹친다.
   *   **제휴처가 하나 더 늘어도 노출이 하루 11회인 것은 변하지 않는다.**
   *   지금 부족한 것은 파는 곳이 아니라 읽는 사람이다.
   *
   * 그런데 겹치지 않는 게 하나 있을 수 있다 — **항공·철도.**
   *   우리 최대 기사가 KTX 이고, 이번 주 축이 "영어 예매가 축소판이다" 이다.
   *   한국 철도 영어 예매가 실제로 불편하다면, **대신 사 주는 곳**이 답이 된다.
   *   그게 사실이면 Trip.com 은 겹치는 제휴가 아니라 기사의 결론이 된다.
   *
   * □ 확인할 것 (신청 전에)
   *   · Trip.com 이 한국 KTX·SRT 승차권을 외국인에게 실제로 파는가
   *   · Klook 도 같은 걸 파는가 (판다면 새 제휴처가 필요 없다 — aid 하나로 끝난다)
   *   · 파트너 프로그램이 개인 사이트를 받는가, 최소 트래픽 요건이 있는가
   *
   * **판단 순서: 기사를 먼저 쓰고, 그 기사에 링크가 필요하면 그때 신청한다.**
   * 반대로 하면 링크를 정당화하려고 기사를 쓰게 된다.
   */
  'Trip.com': {
    name: 'Trip.com',
    affiliate: false,
    appliedAt: null, approvedAt: null,
    tagParam: null, tagValue: null,
    note: '항공·철도·숙박. 미신청. Klook·Agoda 와 겹치지 않는 부분(철도 예매)이 있는지 확인 후 판단.',
  },
  'Gmarket Global': {
    name: 'Gmarket Global',
    affiliate: false,
    appliedAt: null, approvedAt: null,
    tagParam: null, tagValue: null,
    note: '한국 상품 해외배송. 상품 축 후보.',
  },
  Amazon: {
    name: 'Amazon',
    affiliate: false,
    appliedAt: null, approvedAt: null,
    tagParam: 'tag', tagValue: null,
    note: '승인 후 180일 내 주문 3건 필요. 트래픽이 생기기 전에는 신청하지 않는다.',
  },
};

/** 등록되지 않은 상점은 제휴가 아닌 것으로 본다 — 모르면 아니라고 말한다 */
export function isAffiliate(merchant) {
  const m = MERCHANTS[merchant];
  return Boolean(m?.affiliate && m.tagParam && m.tagValue);
}

/**
 * 승인된 곳에만 추적 태그를 붙인다.
 *
 * Klook 경고 (2026-08-16, 포털 안내문에서 확인):
 *   **'s.klook.com' 형식은 추적되지 않는다.** 반드시 'www.klook.com' 이어야 한다.
 *   짧은 주소가 편해 보여서 쓰면 링크는 잘 열리는데 수수료가 0 이 된다.
 *   사람이 기억할 일이 아니므로 빌드가 막는다.
 */
export function decorate(url, merchant) {
  if (!isAffiliate(merchant)) return url;
  /*
   * Klook 은 activity 주소만 추적된다 (2026-08-16 실측).
   *   /transport/ · /rails-6/ 는 열리기는 하는데 리디렉션 과정에서 aid 가 사라진다.
   *   utm_campaign 이 안 붙는 것을 브라우저로 확인했다.
   *   링크는 멀쩡히 작동하고 독자도 아무 이상을 못 느낀다. **수수료만 0 이 된다.**
   *   몇 달 뒤 '왜 수익이 없지' 하고 들여다봐야 알게 되는 종류라서 여기서 막는다.
   */
  /*
   * 언어별 주소도 추적된다 — **추측이 아니라 2026-08-17 실측이다.**
   *
   *   klook.com/ja/activity/100060-...?aid=131289
   *   klook.com/zh-CN/activity/100060-...?aid=131289
   *   klook.com/zh-TW/activity/100060-...?aid=131289
   *
   *   셋 다 최종 주소에 aid=131289 가 남고 utm_campaign=131289 가 붙었다.
   *   영어판에서 확인한 것과 **같은 추적 서명**이다.
   *
   * 그러므로 다국어에서 지켜야 할 것은 언어 세그먼트가 아니라 여전히 /activity/ 다.
   * 아래 검사는 언어와 무관하게 그대로 작동한다 — 손댈 필요가 없다.
   *
   * 다만 **로케일 코드는 Klook 쪽 표기를 쓴다.** 우리 URL 세그먼트와 다르다:
   *   우리 zh-hans → Klook zh-CN
   *   우리 zh-hant → Klook zh-TW
   * 이 대응은 KLOOK_LOCALE 에 있다. 손으로 조합하면 언젠가 어긋난다.
   */
  if (merchant === 'Klook' && /klook\.com/.test(url) && !/\/activity\//.test(url)) {
    throw new Error(
      `Klook 링크는 /activity/ 주소만 추적됩니다:\n  ${url}\n\n` +
      '/transport/ · /rails-6/ 등은 리디렉션에서 aid 가 사라져 수수료가 잡히지 않습니다.\n' +
      '해당 상품의 /activity/ 주소를 찾아 쓰거나, 없으면 링크를 넣지 마십시오.\n',
    );
  }
  if (merchant === 'Klook' && /\/\/s\.klook\.com/.test(url)) {
    throw new Error(
      `s.klook.com 주소는 제휴 추적이 되지 않습니다:\n  ${url}\n\n` +
      'www.klook.com 형식으로 바꾸십시오. 링크는 열리지만 수수료가 잡히지 않습니다.\n',
    );
  }
  const { tagParam, tagValue } = MERCHANTS[merchant];
  try {
    const u = new URL(url);
    u.searchParams.set(tagParam, tagValue);
    return u.toString();
  } catch {
    return url;
  }
}

/** 링크 묶음에 제휴가 하나라도 있는가 */
export function anyAffiliate(links = []) {
  return links.some((l) => isAffiliate(l.merchant));
}

/**
 * 승인된 제휴가 **하나라도** 있는가.
 *
 * 2026-08-16 외부 지적: 푸터는 "Some links are affiliate links" 라고 하는데
 * 본문 모듈은 "제휴가 아니며 수익을 얻지 않는다" 고 한다. 둘이 어긋난다.
 * 그리고 실제로 승인된 제휴가 하나도 없으므로 **푸터 쪽이 거짓이었다.**
 *
 * 이건 8월 13일에 잡았던 것과 **똑같은 종류의 거짓말이 다른 자리에 남아 있던 것**이다.
 * 그때는 기사 본문의 고지를 고쳤고, 푸터는 안 봤다.
 * 한 군데를 고쳤으면 같은 말이 또 어디 있는지 훑어야 한다 — 오늘 네 번째다.
 *
 * 사람이 기억해서 고치는 구조로 두면 반드시 또 어긋난다.
 * **등록부를 보고 문구가 스스로 바뀌게 한다.**
 */
export function hasAnyAffiliate() {
  return Object.keys(MERCHANTS).some(isAffiliate);
}
