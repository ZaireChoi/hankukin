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
const FETCH_TIMEOUT_MS = Number(process.env.TOURAPI_TIMEOUT_MS ?? 8000);

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
      // 타임아웃이 없으면 응답 없는 연결에 30초씩 매달린다.
      // 2026-08-13 3회차가 그랬다 — 3번 시도에 1분 42초를 썼고 전부 'fetch failed' 였다.
      const res = await fetch(`${BASE}${path}?${p}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
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

/**
 * 시·도 코드. TourAPI 의 areaCode 값이다.
 * 동명이인 방어와 지역기반 조회에 쓴다.
 */
export const AREA_CODE = {
  '서울': 1, '인천': 2, '대전': 3, '대구': 4, '광주': 5, '부산': 6, '울산': 7, '세종': 8,
  '경기': 31, '강원': 32, '충북': 33, '충남': 34, '경북': 35, '경남': 36, '전북': 37, '전남': 38, '제주': 39,
};

/** 주소 문자열에서 시·도를 뽑아낸다 */
export function regionOf(address = '') {
  const a = String(address);
  for (const key of Object.keys(AREA_CODE)) if (a.startsWith(key)) return key;
  // '강원특별자치도', '전북특별자치도' 같은 표기 대응
  const m = /^(\S+?)(특별자치도|특별시|광역시|도)/.exec(a);
  if (m) { const k = m[1].slice(0, 2); if (AREA_CODE[k]) return k; }
  return null;
}

/**
 * 키워드 변형을 만든다.
 * 2026-08-13 실측: '주문진해수욕장' 0건. 등재명이 붙여쓰기/띄어쓰기 중 무엇인지 알 수 없다.
 * 한 번 실패했다고 '없는 장소' 로 판정하면 안 되므로 몇 가지 형태를 순차로 시도한다.
 */
export function keywordVariants(keyword) {
  const k = String(keyword).trim();
  const out = new Set([k]);
  out.add(k.replace(/\s+/g, ''));                       // 띄어쓰기 제거
  if (!k.includes(' ')) {
    // 흔한 접미사 앞에서 띄어쓰기
    const m = /^(.*?)(해수욕장|해변|방파제|저수지|자연휴양림|수목원|미술관|박물관)$/.exec(k);
    if (m && m[1]) out.add(`${m[1]} ${m[2]}`);
  }
  // 접미사를 흔한 동의어로 치환
  if (k.includes('해수욕장')) out.add(k.replace('해수욕장', '해변'));
  if (k.includes('해변')) out.add(k.replace('해변', '해수욕장'));
  return [...out];
}

/** 키워드로 장소를 찾는다. 절대 throw 하지 않는다. */
export async function searchPlace(keyword, { rows = 5, page = 1, areaCode = null, log = console } = {}) {
  const params = { keyword, numOfRows: String(rows), pageNo: String(page) };
  if (areaCode) params.areaCode = String(areaCode);
  try {
    const body = await call('/searchKeyword2', params, { log });
    const items = body?.items?.item;
    const list = Array.isArray(items) ? items : items ? [items] : [];
    return list.map(normalizeItem);
  } catch (e) {
    log.error?.(`[tourapi] 검색 실패 (${keyword}): ${e.message}`);
    return null;
  }
}

/**
 * 장소 해석 — 이 모듈의 주 진입점.
 *
 * 두 가지를 방어한다 (2026-08-13 실측):
 *   ① 검색 실패: 키워드 변형을 순차 시도한다. 한 형태가 0건이어도 포기하지 않는다.
 *   ② 동명이인: '경복궁' 검색에 울산 업소가 섞여 나왔다. 기대 지역과 대조하고,
 *      좁히지 못한 채 후보가 2건 이상이면 **자동 채택하지 않는다.**
 *      틀린 좌표를 넣느니 사람에게 넘기는 편이 낫다.
 *
 * @returns {Promise<{status, place?, candidates?, tried, note}>}
 */
export const RESOLVE = {
  OK: 'ok',                     // 단일 후보 확정
  AMBIGUOUS: 'ambiguous',       // 후보 여럿 — 사람이 선택해야 함
  NOT_FOUND: 'not_found',       // 어떤 변형으로도 못 찾음
  ERROR: 'error',
};

export async function resolvePlace(keyword, { expectRegion = null, log = console } = {}) {
  const tried = [];
  const areaCode = expectRegion ? AREA_CODE[expectRegion] ?? null : null;

  for (const variant of keywordVariants(keyword)) {
    const items = await searchPlace(variant, { rows: 10, areaCode, log });
    tried.push({ keyword: variant, areaCode, count: items?.length ?? null });
    if (items === null) return { status: RESOLVE.ERROR, tried, note: 'API 호출 실패' };
    if (items.length === 0) { await sleep(250); continue; }

    // 기대 지역이 있으면 주소로 한 번 더 거른다 (areaCode 를 못 쓴 경우 대비)
    const filtered = expectRegion
      ? items.filter((it) => regionOf(it.address ?? '') === expectRegion)
      : items;
    const pool = filtered.length > 0 ? filtered : items;

    if (pool.length === 1) {
      return { status: RESOLVE.OK, place: pool[0], tried,
               note: `"${variant}" 로 단일 확정${expectRegion ? ` (${expectRegion} 필터)` : ''}` };
    }
    // 제목이 검색어와 정확히 같은 것이 하나뿐이면 그것으로 확정
    const exact = pool.filter((it) => String(it.title).replace(/\s+/g, '') === variant.replace(/\s+/g, ''));
    if (exact.length === 1) {
      return { status: RESOLVE.OK, place: exact[0], tried, note: `"${variant}" 제목 완전일치로 확정` };
    }
    return { status: RESOLVE.AMBIGUOUS, candidates: pool.slice(0, 5), tried,
             note: `후보 ${pool.length}건 — 지역을 지정하거나 사람이 선택해야 합니다.` };
  }
  return { status: RESOLVE.NOT_FOUND, tried, note: '모든 키워드 변형에서 0건' };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 소개글에 촬영지 언급이 있는지 — 있으면 게이트를 열 근거가 된다 */
export const FILMING_HINTS = ['촬영', '드라마', '영화', '로케이션'];
export function mentionsFilming(overview = '') {
  const hits = FILMING_HINTS.filter((k) => String(overview).includes(k));
  return { mentioned: hits.length > 0, hits };
}

/**
 * 소개글에서 '어느 작품인가' 를 뽑아낸다.
 *
 * 왜 이게 가능한가:
 *   한국관광공사 소개글은 작품명을 괄호류로 감싸는 관행이 있다.
 *   "드라마 <도깨비> 촬영지로 유명해졌다" / "영화 「기생충」의 배경이 된"
 *   따라서 촬영지 정보는 이미 공공기관 데이터 안에 있다. 사람이 기억할 필요가 없다.
 *
 * 왜 문맥을 보는가:
 *   괄호를 무조건 작품명으로 보면 <문의처>, <이용료> 같은 것까지 작품이 된다.
 *   근처에 촬영 문맥어가 있을 때만 채택한다. 놓치는 편이 지어내는 것보다 낫다.
 */
const BRACKET_RE = /<([^<>\n]{1,30})>|〈([^〈〉\n]{1,30})〉|《([^《》\n]{1,30})》|「([^「」\n]{1,30})」|『([^『』\n]{1,30})』|\[([^[\]\n]{1,30})\]|'([^'\n]{1,30})'|‘([^‘’\n]{1,30})’|“([^“”\n]{1,30})”/g;
const WORK_CONTEXT = ['촬영', '드라마', '영화', '로케이션', '방영', '세트장', '뮤직비디오'];
const CONTEXT_WINDOW = 45;
/** 그 자체로는 작품명이 될 수 없는 것들 */
const NOT_A_TITLE = /^(촬영지?|드라마|영화|세트장|로케이션|문의|이용료|주차|위치|주소|교통|안내|참고|주의|현재|기타|무료|유료)$/;

export function extractWorkTitles(overview = '') {
  const text = String(overview);
  const seen = new Map();
  for (const m of text.matchAll(BRACKET_RE)) {
    const raw = m.slice(1).find((g) => g != null);
    if (raw == null) continue;
    const title = raw.trim();
    if (!title) continue;
    if (NOT_A_TITLE.test(title)) continue;
    if (/^[\d\s.,~\-–—:()]+$/.test(title)) continue;      // 날짜·시간·숫자
    if (/(원|명|시간|분|㎞|km|m²|번지)$/.test(title)) continue;  // 단위로 끝나면 정보 표기

    const from = Math.max(0, m.index - CONTEXT_WINDOW);
    const to = Math.min(text.length, m.index + m[0].length + CONTEXT_WINDOW);
    const context = text.slice(from, to);
    const evidence = WORK_CONTEXT.filter((w) => context.includes(w));
    if (evidence.length === 0) continue;

    if (!seen.has(title)) seen.set(title, { title, evidence, context: context.replace(/\s+/g, ' ').trim() });
  }
  return [...seen.values()];
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

/**
 * HTML 태그만 제거한다. 꺾쇠 안의 모든 것을 지우지 않는다.
 *
 * 2026-08-13 발견한 결함:
 *   이전 구현은 /<[^>]+>/g 였다. 한국관광공사 소개글은 작품명을 꺾쇠로 감싼다 —
 *   "주문진 방파제는 드라마 <도깨비> 촬영지로 유명해졌다."
 *   그 정규식이 <도깨비> 를 태그로 보고 지웠고, 저장된 소개글에는
 *   "드라마  촬영지" 처럼 공백 두 칸만 남았다.
 *   즉 우리가 찾으려던 정보를 우리 손으로 삭제하고 있었다.
 *
 *   그래서 실제 HTML 태그 이름을 화이트리스트로 못박는다.
 *   목록에 없는 꺾쇠는 본문으로 간주해 그대로 둔다. <Winter Sonata> 같은
 *   영문 제목도 살아남아야 하므로 '영문으로 시작하면 태그' 규칙은 쓰지 않는다.
 */
const HTML_TAG_NAMES = [
  'br', 'p', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'div', 'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'ul', 'ol', 'li',
  'font', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'pre', 'blockquote', 'sup', 'sub', 'small', 'center', 'iframe', 'script', 'style',
];
const HTML_TAG_RE = new RegExp(
  `<!--[\\s\\S]*?-->|</?(?:${HTML_TAG_NAMES.join('|')})(?:\\s[^<>]*)?/?>`,
  'gi',
);

export function stripTags(s) {
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(HTML_TAG_RE, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
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
