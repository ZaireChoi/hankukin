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
  /*
   * 제주 기사 딸린 차량 (2026-08-20 확인).
   *
   *   운영자 지시: "차량렌탈 제휴도 붙여".
   *   Klook 공개검색에서 «jeju car rental» 을 치면 나오는 제주 상품은 **전부 기사 딸린 차량**이다.
   *   자가운전 렌터카가 아니다. 그래서 그 사실을 라벨에 그대로 적었다 —
   *   「rental」 이라고만 적으면 독자가 직접 운전하는 것으로 읽는다.
   *
   *   그리고 이 자리는 편집상으로도 맞다. 기사가 말하는 것은
   *   「국제운전면허가 되면 직접 몰아라, 안 되면 이 방법이 있다」이고,
   *   이 상품은 **두 번째 문장의 답**이다. 자격이 안 되는 사람에게 파는 것이 아니라
   *   자격이 안 되는 사람이 실제로 쓰는 수단이다.
   *
   *   ?aid=131289 를 붙여 열었더니 최종 주소에 utm_campaign=131289 가 붙었다.
   *   4.6/5 · 리뷰 231 · 2K+ 예약 · 롯데렌터카(허츠 공식 파트너) · 공항 내 데스크 ·
   *   영어·중국어 가능 기사. 전부 상품 페이지에서 읽은 것이다.
   */
  /*
   * 제주 관광지 예매 (2026-08-20 확인). 운영자: "제주의 관광지 klook표 예매 제휴도 없고".
   *
   *   후보를 넷 열어 보고 골랐다. 고른 기준은 노출이 아니라 **독자가 실제로 쓸 수 있는가**다.
   *     220302 성산일출봉+우도 종일투어  4.8 · **리뷰 4개** · 50+ 예약 → 우리 사진과 딱 맞지만 너무 얇다
   *     87580  제주 주요관광지 1일투어   4.7 · 리뷰 32 · 200+   → **중국어 가이드**다. 영어 독자용이 아니다
   *     19902  유네스코 소그룹 데이투어  4.8 · **리뷰 367 · 3K+ 예약 · English-only, 최대 15명** ← 이것
   *
   *   기사와도 맞는다. 대표사진이 성산일출봉(유네스코 세계자연유산)이고
   *   기사 전체가 이 섬의 화산 지질을 설명한다. 그리고 **운전 절의 두 번째 답**이기도 하다 —
   *   국제운전면허가 안 되는 사람이 성산일출봉·주상절리·천지연을 하루에 도는 방법.
   *
   *   ⚠ 이건 «입장권» 이 아니라 «투어» 다. 라벨에 day tour 를 명시했다 —
   *      ticket 이라고 적으면 독자가 매표소 대체재로 읽는다.
   */
  'klook-jeju-unesco-tour': {
    url: 'https://www.klook.com/en-US/activity/19902-unesco-walking-day-tour-jeju/',
    merchant: 'Klook',
    category: 'tour',
    relationship: 'suggested',
    label: 'Jeju UNESCO sites day tour, English-only small group — on Klook',
    labels: {
      ja: '済州ユネスコ地区の日帰りツアー（英語・少人数）— Klook',
      'zh-hans': '济州世界自然遗产一日游（英文小团）—— Klook',
    },
    checkedAt: '2026-08-20',
  },
  'klook-jeju-car-charter': {
    url: 'https://www.klook.com/en-US/activity/132698-jeju-car-charter/',
    merchant: 'Klook',
    category: 'transport',
    relationship: 'suggested',
    label: 'Jeju private car charter with a driver — LOTTE rent-a-car, on Klook',
    labels: {
      ja: '済州のドライバー付きチャーター — ロッテレンタカー（Klook）',
      'zh-hans': '济州包车（含司机）—— 乐天租车，Klook',
    },
    checkedAt: '2026-08-20',
  },
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
  /*
   * 제주 (2026-08-20 확인).
   *   운영자 지시로 붙였다. 제주 편은 «가는 곳» 글이므로 표준순서 §3 의 기준에 맞는다.
   *
   *   ⚠ 주소를 두 번 시도했다. jeju-hotels-list-696 은 **트립닷컴 홈으로 튕겼다** —
   *     도시 ID 를 짐작한 결과이고, 경주(3675)에서 이미 한 번 낸 사고와 같은 종류다.
   *     737 은 검색으로 찾아 브라우저로 열어 확인했다.
   *
   *   ⚠ 페이지 제목이 «Jeju City Hotels» 다. 다만 본문 구역에 성산·애월·한라산이 들어 있어
   *     섬 전체를 덮는다. 라벨을 «Jeju» 로 두되 이 사실을 link-verified.json 에 적어 두었다.
   */
  'tripcom-jeju-hotels': {
    url: 'https://www.trip.com/hotels/jeju-hotels-list-737/',
    merchant: 'Trip.com',
    category: 'stay',
    relationship: 'suggested',
    label: 'Search Jeju stays on Trip.com',
    labels: {
      ja: '済州の宿をTrip.comで探す',
      'zh-hans': '在 Trip.com 搜济州住宿',
    },
    checkedAt: '2026-08-20',
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

  /*
   * 2026-08-17. 주소를 열어서 확인했다 (Klook 영문 상품 페이지, 4.6/5 · 34.3K 리뷰).
   * 라벨에 「취소 불가」를 먼저 적는 이유: 이 상품의 진짜 조건이 거기이기 때문이다.
   * 게이트 가격은 공식 페이지 기준 대인 ₩29,000 — 싼 것이 요점이 아니라
   * **무를 수 없다는 것**이 요점이고, 독자가 버튼 전에 알아야 할 것은 그쪽이다.
   */
  'klook-n-seoul-tower': {
    url: 'https://www.klook.com/en-US/activity/412-n-seoul-tower-seoul/',
    merchant: 'Klook',
    category: 'ticket',
    relationship: 'suggested',
    label: 'N Seoul Tower observatory — no cancellation, no refund, no date change',
    labels: {
      ja: 'Nソウルタワー展望台 — 取消・返金・日付変更いずれも不可',
      'zh-hans': 'N首尔塔观景台 —— 不可取消、不退款、不能改期',
    },
    checkedAt: '2026-08-17',
  },

  /*
   * 2026-08-17 저녁 추가 — 운영자 지적: "제휴를 넣을 수 있는 글이 꽤 있는데 왜 안 넣었나."
   *
   * 세어 보니 맞는 말이었다. **도시 항목을 세 개만 만들어 두고,**
   * 부산·강릉 기사를 쓰면서 「붙일 상품이 없다」고 넘어갔다.
   * 없었던 게 아니라 **만들지 않았던 것**이다. 그건 판단이 아니라 게으름이다.
   *
   * 주소는 Trip.com 의 국가 페이지(/hotels/country/south-korea.html)에서
   * **회사가 스스로 건 링크를 읽어 왔다.** 8월 16·17일에 주소를 짐작했다가
   * 404 를 두 번 봤기 때문에, 이번에는 생성기도 짐작도 쓰지 않았다.
   * 부산·강릉은 열어서 목록이 뜨는 것까지 확인했다 (1,036곳 · 607곳).
   */
  'tripcom-busan-hotels': {
    url: 'https://www.trip.com/hotels/busan-hotels-list-253/',
    merchant: 'Trip.com',
    category: 'stay',
    relationship: 'suggested',
    label: 'Search Busan stays on Trip.com — by district, not by name',
    labels: {
      ja: '釜山の宿をTrip.comで探す — エリアから絞る',
      'zh-hans': '在 Trip.com 搜釜山住宿 —— 按区域筛，不按名字',
    },
    checkedAt: '2026-08-17',
  },
  'tripcom-gangneung-hotels': {
    url: 'https://www.trip.com/hotels/gangneung-si-hotels-list-61325/',
    merchant: 'Trip.com',
    category: 'stay',
    relationship: 'suggested',
    label: 'Search Gangneung stays on Trip.com — the coast is the deciding factor',
    labels: {
      ja: '江陵の宿をTrip.comで探す — 海側かどうかで決まる',
      'zh-hans': '在 Trip.com 搜江陵住宿 —— 靠不靠海是关键',
    },
    checkedAt: '2026-08-17',
  },

  /*
   * 2026-08-17 저녁 — 운영자 지적: "도깨비 강릉편은 제휴를 넣어야 한다."
   *
   * 맞는 말이었는데, 자리가 숙소가 아니었다. 그 기사는 이미 Trip.com 강릉을 달고 있다.
   * 비어 있던 것은 **가는 법**이다. 본문이 「KTX 약 27,000원, 2시간」이라고 적어 놓고
   * 그걸 살 방법을 주지 않았다. 값을 적어 두고 행동할 길을 안 준 셈이다.
   *
   * 왜 KR PASS 가 아니라 개별 승차권인가.
   *   KORAIL PASS 2일권이 US$94.65 다. 강릉 왕복 한 번(약 54,000원)에는
   *   **두 배 넘게 비싸다.** Klook 자기 페이지도 「적게 타면 개별 티켓으로」라고 안내한다.
   *   비싼 쪽을 걸면 수수료는 크지만 그 독자에게는 틀린 상품이다.
   *
   * 주소 확인 (2026-08-17).
   *   먼저 짐작한 1290 번은 **양곤 야시장 투어**였다. 열어 봤기에 안 나갔다.
   *   201665 는 /activity/ 로 시작하지만 리디렉션되어 /korea-rail/ 로 간다.
   *   (이 줄에 굵게 표시를 쓰면 `*` 와 `/` 가 붙어 주석이 거기서 닫힌다 — 실제로 겪었다.)
   *   그래서 브라우저로 aid 를 붙여 열어 확인했다 —
   *   최종 주소에 aid=131289 가 남고 utm_campaign=131289 가 자동으로 붙으며
   *   쿠키에도 기록된다. **추적이 끊기지 않는다.**
   */
  'klook-korea-train-ticket': {
    url: 'https://www.klook.com/en-US/activity/201665-korea-train-ticket/',
    merchant: 'Klook',
    category: 'transport',
    relationship: 'suggested',
    label: 'Korea train tickets — single journeys, not a rail pass',
    labels: {
      ja: '韓国の鉄道チケット — 乗り放題パスではなく片道ずつ',
      'zh-hans': '韩国火车票 —— 单程票，不是通票',
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
