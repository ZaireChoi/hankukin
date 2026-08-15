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
    appliedAt: null, approvedAt: null,
    tagParam: null, tagValue: null,
    note: '숙박. 여행 축 후보.',
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
