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
    affiliate: false,
    appliedAt: null, approvedAt: null,
    tagParam: null, tagValue: null,
    note: '체험·투어. 여행 축 후보.',
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

/** 승인된 곳에만 추적 태그를 붙인다 */
export function decorate(url, merchant) {
  if (!isAffiliate(merchant)) return url;
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
