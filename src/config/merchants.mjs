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
   * Trip.com — **2026-08-17 승인.** 운영자 통보.
   *
   * 어제 이 자리에 적어 둔 판단은 「기사를 먼저 쓰고, 그 기사에 링크가 필요하면
   * 그때 신청한다」였다. 순서가 지켜졌는지 정직하게 적어 둔다 —
   * 신청은 운영자가 먼저 했고, 기사는 이미 있었다. 경주·거제 편은 8월 중순부터
   * **숙소를 지역별 가격대로만** 쓰고 특정 호텔 이름을 대지 않았다.
   * 그 문장은 「우리가 안 가 본 곳을 좋다고 하지 않는다」는 뜻이었고,
   * 그래서 지금 붙이는 링크도 **특정 호텔이 아니라 도시 검색**이다.
   * 「이 호텔이 좋다」가 아니라 「여기서 찾아보라」다.
   *
   * 파라미터가 둘이다 — Allianceid 와 SID.
   *   **하나만 붙으면 링크는 열리는데 실적이 안 잡힌다.**
   *   그래서 isAffiliate 가 둘 다 차 있을 때만 true 를 돌려준다.
   *   반쯤 켜진 상태로 「제휴 링크입니다」 고지가 뜨는 것을 막기 위해서다.
   *
   * ⚠ 값은 **대시보드에서 실제로 읽은 것만** 넣는다. 추측한 파라미터 이름은
   *   8월 16일에 이미 한 번 사고를 냈고, 오늘도 상품 주소를 추측했다가 404 를 봤다.
   */
  'Trip.com': {
    name: 'Trip.com',
    /*
     * 승인은 났지만 **아직 false 다.** 대시보드에서 Allianceid·SID 를 읽어
     * 아래 tagParams 를 채우는 순간 저절로 켜진다 — 기사는 손댈 필요가 없다.
     * 그때 제휴 고지가 3개 언어에서 함께 바뀐다 (policy.mjs 가 등록부를 읽는다).
     */
    affiliate: false,
    appliedAt: '2026-08-17', approvedAt: '2026-08-17',
    tagParams: { Allianceid: null, SID: null },
    note: '숙박·항공·철도. 2026-08-17 승인. Allianceid·SID 입력 대기 — 채우면 자동으로 켜진다.',
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
  if (!m?.affiliate) return false;
  /*
   * 파라미터가 둘 이상인 제휴처가 생겼다 (2026-08-17, Trip.com).
   *
   * Klook 은 ?aid= 하나면 끝나서 tagParam/tagValue 한 쌍으로 충분했다.
   * Trip.com 은 Allianceid 와 SID 를 함께 요구한다 — 하나만 붙이면
   * **링크는 멀쩡히 열리는데 실적이 우리 것으로 안 잡힌다.**
   * 이 사이트에서 이미 두 번 만난 실패 모양이라, 아예 여러 개를 받게 고쳤다.
   *
   * tagParams 가 있으면 그쪽을 쓰고, 없으면 예전 한 쌍을 쓴다.
   * **값이 하나라도 비어 있으면 제휴로 치지 않는다** — 반쯤 켜진 상태를 만들지 않는다.
   */
  if (m.tagParams) {
    const vals = Object.values(m.tagParams);
    return vals.length > 0 && vals.every((v) => v !== null && v !== undefined && v !== '');
  }
  return Boolean(m.tagParam && m.tagValue);
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
  const m = MERCHANTS[merchant];
  try {
    const u = new URL(url);
    if (m.tagParams) {
      for (const [k, v] of Object.entries(m.tagParams)) u.searchParams.set(k, v);
    } else {
      u.searchParams.set(m.tagParam, m.tagValue);
    }
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
