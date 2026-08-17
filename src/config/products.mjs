/**
 * 상품 하나에 이름 하나.
 *
 * 왜 만들었나 (2026-08-17, 같은 실수의 **여섯 번째**).
 *
 *   eSIM 편의 Klook 버튼이 「데이터 전용」임을 숨기고 있었다. 그건 고쳤다.
 *   그런데 **똑같은 상품이 Arrival 페이지에도 붙어 있었고**, 거기는 안 고쳤다.
 *   더 나쁜 것은 Arrival 본문이 이렇게 쓰여 있었다는 것이다:
 *     "A data-only Korean eSIM ... gives you a working 010 number."
 *   같은 사이트 안에서, 한 페이지는 「번호 없음」이라 하고
 *   다른 페이지는 「번호 나옴」이라고 했다. 독자에게는 둘 다 우리 말이다.
 *
 *   이 사이트에서 이 모양이 여섯 번 반복됐다:
 *     canonical → hreflang → 내부링크 → 제휴고지 3자리 → CTA note → 그리고 이것.
 *   매번 **한 군데를 고치고 옆을 안 봤다.** 주의력으로 고칠 문제가 아니다.
 *
 * → 상품의 이름과 제약은 **여기에만 적는다.**
 *   페이지는 여기서 가져다 쓰고, 기사 frontmatter 는 게이트가 대조한다
 *   (content-quality.mjs 아홉 번째 게이트).
 *   라벨을 손으로 다시 쓰면 빌드가 선다.
 *
 * 규칙 하나만 지킨다.
 *   **label 은 상품이 못 하는 것을 먼저 적는다.**
 *   독자가 버튼을 누르기 전에 알아야 하는 것은 장점이 아니라 한계다.
 */

export const PRODUCTS = {
  /*
   * 2026-08-17 Klook 상품 페이지에서 직접 확인한 문장:
   *   "This is a Data-only SIM card. Calls, texts, or topping up additional
   *    credits will not be possible."
   *   "Service type  Data only"
   * 통신사 직판 데이터 상품과 다르다 — 그쪽은 010 번호가 나온다.
   * 이것은 재판매 회선이고, 번호가 없다.
   */
  'klook-korea-esim': {
    url: 'https://www.klook.com/en-US/activity/100060-4g-esim-korea/',
    merchant: 'Klook',
    category: 'experience',
    relationship: 'suggested',
    label: 'Korea eSIM, data only — no 010 number, no calls, no SMS',
    labels: { ja: '韓国eSIM（データ専用）— 010番号・通話・SMSなし',
              'zh-hans': '韩国 eSIM（纯流量）—— 无 010 号码、不能通话、不能收发短信' },
    checkedAt: '2026-08-17',
  },

  'skt-esim': {
    url: 'https://www.skroaming.com/esim/esim',
    merchant: 'SK Telecom',
    category: 'experience',
    relationship: 'suggested',
    label: 'LTE eSIM with Data, Call and SMS — buy online, verify passport by voucher (SK Telecom)',
    labels: { ja: 'データ・通話・SMS付きLTE eSIM — オンライン購入、バウチャーで旅券認証（SKテレコム）',
              'zh-hans': '含流量、通话与短信的 LTE eSIM —— 线上购买，用邮件凭证完成护照认证（SK 电讯）' },
    checkedAt: '2026-08-16',
  },

  'kt-esim': {
    url: 'https://roaming.kt.com/eng/esim',
    merchant: 'KT',
    category: 'experience',
    relationship: 'suggested',
    label: 'Voice eSIM — sold at the airport roaming centre only (KT)',
    labels: { ja: '音声eSIM — 空港のローミングセンターのみで販売（KT）',
              'zh-hans': '语音 eSIM —— 仅在机场漫游中心发售（KT）' },
    checkedAt: '2026-08-16',
  },

  /*
   * 2026-08-17 실측. 언어별 경로에서 상품명까지 그 언어로 나오고 aid 가 유지된다.
   *   ja  仁川国際空港鉄道A'REX 直通列車チケットの予約（ソウル）
   *   zh  仁川机场 - 首尔快线直达列车
   */
  'klook-arex-express': {
    url: 'https://www.klook.com/en-US/activity/1163-airport-to-seoul-city-center-arex-train-incheon/',
    merchant: 'Klook',
    category: 'transport',
    relationship: 'suggested',
    label: 'AREX Express train ticket — book ahead on Klook',
    labels: {
      ja: 'A\'REX直通列車のチケット — 出発前にKlookで予約',
      'zh-hans': 'AREX 机场快线直达车票 —— 出发前在 Klook 预订',
    },
    checkedAt: '2026-08-17',
  },

  /*
   * 2026-08-17 실측.
   *   ja  韓服レンタル（慶尚北道）
   *   zh  庆州韩服体验
   */
  /*
   * Trip.com 숙소 — 도시 검색 세 개 (2026-08-17).
   *
   * **특정 호텔이 아니라 도시 검색이다.** 이유는 우리가 이미 쓴 문장 때문이다:
   * 경주·거제 편은 숙소를 「지역별 가격대」로만 적고 이름을 대지 않았고,
   * Arrival 페이지에는 「평가하지 않은 호텔은 링크하지 않는다」고 써 두었다.
   * 특정 호텔을 걸면 그 문장들이 전부 거짓이 된다.
   * 「이 호텔이 좋다」가 아니라 「여기서 찾아보라」 — 그게 우리가 할 수 있는 말이다.
   *
   * 주소는 **셋 다 열어서 확인했다** (2026-08-17).
   *   같은 날 trip.com/hotels/gyeongju-hotels-list-49/ 를 추측했다가 404 를 봤다.
   *   숫자 하나가 다르면 404 다. 생성기도, 짐작도 믿지 않는다.
   *
   * Agoda 승인이 나면 같은 자리에 둘을 나란히 세운다 — 그때 비로소 가격 비교가 된다.
   * 지금은 하나뿐이라 「비교해 보라」고 쓸 수 없다.
   */
  'tripcom-seoul-hotels': {
    url: 'https://www.trip.com/hotels/seoul-hotels-list-274/',
    merchant: 'Trip.com',
    category: 'stay',
    relationship: 'suggested',
    label: 'Search Seoul hotels on Trip.com — by neighbourhood, not by name',
    labels: {
      ja: 'ソウルの宿をTrip.comで探す — エリアから絞る',
      'zh-hans': '在 Trip.com 搜首尔住宿 —— 按区域筛，不按名字',
    },
    checkedAt: '2026-08-17',
  },
  'tripcom-gyeongju-hotels': {
    url: 'https://www.trip.com/hotels/gyeongju-hotels-list-3675/',
    merchant: 'Trip.com',
    category: 'stay',
    relationship: 'suggested',
    label: 'Search Gyeongju stays on Trip.com',
    labels: {
      ja: '慶州の宿をTrip.comで探す',
      'zh-hans': '在 Trip.com 搜庆州住宿',
    },
    checkedAt: '2026-08-17',
  },
  'tripcom-geoje-hotels': {
    url: 'https://www.trip.com/hotels/geoje-si-hotels-list-61331/',
    merchant: 'Trip.com',
    category: 'stay',
    relationship: 'suggested',
    label: 'Search Geoje stays on Trip.com',
    labels: {
      ja: '巨済の宿をTrip.comで探す',
      'zh-hans': '在 Trip.com 搜巨济住宿',
    },
    checkedAt: '2026-08-17',
  },

  'klook-gyeongju-hanbok': {
    url: 'https://www.klook.com/en-US/activity/117284-gyeongju-hanbok-experience/',
    merchant: 'Klook',
    category: 'experience',
    relationship: 'suggested',
    label: 'Hanbok rental in Gyeongju — book ahead on Klook',
    labels: {
      ja: '慶州の韓服レンタル — 出発前にKlookで予約',
      'zh-hans': '庆州韩服租借 —— 出发前在 Klook 预订',
    },
    checkedAt: '2026-08-17',
  },
};

/**
 * URL → 정식 라벨. 게이트가 기사 frontmatter 를 대조할 때 쓴다.
 *
 * 2026-08-17: **언어별로 갖는다.** 일본어 기사에 영어 상품명이 뜨면
 * 「데이터 전용」이라는 제일 중요한 제약이 그 독자에게 안 읽힌다.
 * 제약이 안 읽히는 라벨은 라벨이 아니다.
 */
export const LABEL_BY_URL = Object.fromEntries(
  Object.values(PRODUCTS).flatMap((p) => [
    [p.url, p.label],
    ...Object.values(p.labels ?? {}).map((l) => [`${p.url}::${l}`, l]),
  ]),
);

/** 해당 URL 이 어떤 언어에서 쓸 수 있는 라벨들인가 (게이트용). */
export const ALLOWED_LABELS = Object.fromEntries(
  Object.values(PRODUCTS).map((p) => [p.url, new Set([p.label, ...Object.values(p.labels ?? {})])]),
);

/** 페이지에서 쓰는 형태로 꺼낸다. */
export const product = (key, lang = 'en') => {
  const p = PRODUCTS[key];
  if (!p) throw new Error(`알 수 없는 상품 키: ${key} — src/config/products.mjs 를 보십시오.`);
  const { checkedAt, labels, ...item } = p;
  return { ...item, label: labels?.[lang] ?? p.label };
};
