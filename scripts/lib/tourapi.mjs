/**
 * 한국관광공사 TourAPI 어댑터 — 공공기관 등급 출처.
 *
 * 왜 중요한가:
 *   기획문서 06 §1 화이트리스트에서 게이트를 열 수 있는 등급은 공식 제작사·인터뷰·
 *   공식 계정·공공기관뿐이다. 블로그·카페는 아무리 많아도 게이트를 못 연다.
 *   TourAPI 는 한국관광공사가 제공하므로 public_institution 으로 인정된다.
 *
 * 라이선스: 공공누리 1유형 — 출처 표시 시 상업적 이용 가능.
 *   따라서 인용 시 반드시 '한국관광공사' 를 출처로 표기한다.
 *
 * 한계 (정직하게):
 *   촬영지 전용 데이터베이스가 아니다. 관광지로 등재된 장소는 잘 나오지만
 *   최근 작품의 촬영지가 관광 콘텐츠로 등재되기까지는 시차가 있다.
 *   '주문진 방파제' 처럼 관광지로 정착한 곳에 강하고, 신작에는 약하다.
 */

const BASE = 'https://apis.data.go.kr/B551011/KorService2';
const SERVICE_NAME = 'HANKUKIN/0.1';

/**
 * 인증키는 Encoding/Decoding 두 형태로 발급된다.
 * Decoding 값을 다시 인코딩하면 정상, Encoding 값을 또 인코딩하면 깨진다.
 * 어느 쪽이 들어와도 동작하도록 이미 인코딩된 형태를 감지한다.
 */
export function normalizeKey(raw) {
  const k = String(raw ?? '').trim();
  if (!k) throw new Error('DATA_GO_KR_KEY 가 설정되지 않았습니다.');
  // %2F %3D 같은 시퀀스가 있으면 이미 URL 인코딩된 값으로 본다
  const looksEncoded = /%[0-9A-Fa-f]{2}/.test(k);
  return { value: looksEncoded ? decodeURIComponent(k) : k, wasEncoded: looksEncoded };
}

function keyParam() {
  const { value } = normalizeKey(process.env.DATA_GO_KR_KEY);
  return value;   // URLSearchParams 가 알아서 인코딩한다
}

export function assertTourApiKey() { normalizeKey(process.env.DATA_GO_KR_KEY); }

async function call(path, params, { retries = 3, log = console } = {}) {
  const p = new URLSearchParams({
    serviceKey: keyParam(),
    MobileOS: 'ETC', MobileApp: SERVICE_NAME, _type: 'json',
    ...params,
  });
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}?${p}`);
      const text = await res.text();

      // 오류가 JSON 이 아니라 XML 로 오는 경우가 많다 — 그대로 삼키면 원인을 못 찾는다
      if (text.trimStart().startsWith('<')) {
        const code = /<returnReasonCode>(\d+)<\/returnReasonCode>/.exec(text)?.[1];
        const msg = /<errMsg>([^<]*)<\/errMsg>|<returnAuthMsg>([^<]*)<\/returnAuthMsg>/.exec(text);
        throw new Error(`TourAPI XML 오류 ${code ?? ''} ${msg?.[1] ?? msg?.[2] ?? text.slice(0, 150)}`);
      }
      const json = JSON.parse(text);
      const header = json?.response?.header;
      if (header && header.resultCode !== '0000') {
        throw new Error(`TourAPI ${header.resultCode}: ${header.resultMsg}`);
      }
      return json?.response?.body ?? null;
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 800 * attempt));
      log.warn?.(`[tourapi] 재시도 ${attempt}/${retries}: ${e.message}`);
    }
  }
  throw lastErr;
}

/** 키워드로 장소를 찾는다. 절대 throw 하지 않는다. */
export async function searchPlace(keyword, { rows = 5, log = console } = {}) {
  try {
    const body = await call('/searchKeyword2', { keyword, numOfRows: String(rows), pageNo: '1' }, { log });
    const items = body?.items?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];
    log.info?.(`[tourapi] "${keyword}" → ${list.length}건`);
    return list.map(normalizeItem);
  } catch (e) {
    log.error?.(`[tourapi] 검색 실패 (${keyword}): ${e.message}`);
    return null;
  }
}

/** 상세 소개 (개요문) */
export async function fetchOverview(contentId, { log = console } = {}) {
  try {
    const body = await call('/detailCommon2', { contentId: String(contentId) }, { log });
    const items = body?.items?.item;
    const it = Array.isArray(items) ? items[0] : items;
    return it?.overview ? stripTags(it.overview) : null;
  } catch (e) {
    log.warn?.(`[tourapi] 개요 조회 실패 (${contentId}): ${e.message}`);
    return null;
  }
}

function normalizeItem(it) {
  return {
    contentId: it.contentid,
    contentTypeId: it.contenttypeid,
    title: it.title,
    address: [it.addr1, it.addr2].filter(Boolean).join(' ').trim() || null,
    lat: it.mapy ? Number(it.mapy) : null,
    lng: it.mapx ? Number(it.mapx) : null,
    tel: it.tel || null,
    image: it.firstimage || null,
    modifiedAt: it.modifiedtime || null,
  };
}

export function stripTags(s) {
  return String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\s+\n/g, '\n').trim();
}

/** TourAPI 결과를 우리 출처 형식으로 변환한다 (공공누리 1유형 — 출처 표시 필수) */
export function toSource(item) {
  return {
    title: `${item.title} — 한국관광공사 국문 관광정보 서비스`,
    url: `https://api.visitkorea.or.kr/#/detail?cotId=${item.contentId}`,
    type: 'public_institution',
    checkedAt: new Date().toISOString().slice(0, 10),
    attribution: '한국관광공사 (공공누리 제1유형)',
  };
}
