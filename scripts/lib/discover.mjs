/**
 * 촬영지 자동 발굴 — 순수 로직.
 *
 * 발상의 전환:
 *   지금까지는 사람이 '작품 → 장소' 를 적어주면 TourAPI 가 그것을 검증했다.
 *   그 방식의 약점은 명확하다. 사람이 기억하는 만큼만 채워진다.
 *   기억은 근거가 아니다. 우리가 블로거의 목격담을 반려한 이유와 같다.
 *
 *   그래서 방향을 뒤집는다. 한국관광공사 데이터를 촬영지 키워드로 훑고,
 *   소개글이 스스로 작품명을 말하는 곳만 골라낸다.
 *   출처는 처음부터 public_institution 이고, 작품명도 사람이 아니라 데이터가 댄다.
 *
 * 한계 (정직하게):
 *   관광 콘텐츠로 등재된 곳만 나온다. 신작은 시차가 있다.
 *   여기서 나온 결과는 '후보' 이지 발행 승인이 아니다. 게이트는 그대로 작동한다.
 */

/**
 * 훑을 키워드. 한국관광공사 등재명·소개글에서 실제로 쓰이는 표현들이다.
 * 넓게 잡되, 판정은 소개글 본문으로 한다.
 */
export const SWEEP_KEYWORDS = [
  '촬영지',
  '촬영장',
  '촬영장소',
  '세트장',
  '오픈세트장',
  '드라마촬영장',
  '드라마 촬영지',
  '영화 촬영지',
  '영상테마파크',
  '드라마세트',
  '로케이션',
  '영화마을',
];

/** 방문 가능성이 낮은 유형을 미리 걸러낸다 (음식점·숙박·쇼핑) */
const VISITABLE_CONTENT_TYPES = new Set(['12', '14', '15', '25', '28']);
//  12 관광지 · 14 문화시설 · 15 축제공연행사 · 25 여행코스 · 28 레포츠

export function isVisitableType(contentTypeId) {
  return VISITABLE_CONTENT_TYPES.has(String(contentTypeId ?? ''));
}

/**
 * 상류(한국관광공사) 쪽에서 작품명이 이미 지워진 흔적을 찾는다.
 *
 * 2026-08-13 실측:
 *   "2010년 MBC 드라마 가 처음 촬영되었고, 이후 , , , , 등의 드라마와"
 *   "SBS 드라마 의 촬영지이다"
 *   "해양드라마세트장 ( 촬영지)"      ← 등재명 자체에 구멍
 *
 *   등재명은 우리 코드가 손대지 않는 필드인데도 비어 있다.
 *   즉 우리가 오늘 고친 것과 같은 결함이 그쪽 시스템에도 있다.
 *
 * 왜 표시만 하고 채우지 않는가:
 *   문맥으로 추측하면 그 순간 우리도 목격담을 쓰는 것이 된다.
 *   비어 있음을 '비어 있다' 고 기록하는 편이 낫다.
 */
const REDACTION_SIGNS = [
  /드라마\s+(?:가|를|의|와|과|는|이)\s/,    // 조사 앞이 비어 있음
  /영화\s+(?:가|를|의|와|과|는|이)\s/,
  /(?:^|[^,])\s,\s*,\s*,/,                  // ", , ," 연속 — 목록이 통째로 사라짐
  /\(\s+촬영지\)/,                          // "( 촬영지)"
  /「\s*」|〈\s*〉|《\s*》/,                 // 빈 괄호가 남음
];

export function detectRedaction(text = '') {
  const hits = REDACTION_SIGNS.filter((re) => re.test(String(text)));
  return { redacted: hits.length > 0, signs: hits.length };
}

/**
 * 장소 등재명에서 작품을 뽑는다.
 *
 * "낭만닥터김사부촬영지", "웰컴투동막골촬영지", "태양의 후예 촬영지" —
 * 한국관광공사가 **이름 자체에** 작품을 넣어 등재한 경우다.
 * 소개글이 지워졌어도 이름은 남아 있으므로, 상류 결손의 실질적 복구 수단이 된다.
 *
 * 지명을 작품으로 오인하지 않는 것이 핵심이다.
 *   "문경새재 오픈세트장" → 문경새재 는 지명 (주소에 '문경' 이 있다)
 *   "완도 청해포구촬영장" → 완도 도 지명
 *   "순천 드라마촬영장"   → '드라마' 라는 일반어가 섞여 있다
 */
const NAME_SUFFIX = /^(.+?)\s*(?:오픈세트장|드라마세트장|드라마촬영장|영화촬영장|촬영세트장|세트장|촬영장소|촬영장|촬영지)$/;
const GENERIC_IN_NAME = /(드라마|영화|세트|촬영|테마파크|스튜디오|공원|마을|해변|해수욕장|저수지|폭포|계곡)/;

export function extractFromPlaceName(title = '', address = '') {
  const m = NAME_SUFFIX.exec(String(title).trim());
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 3) return null;                 // '연천', '남이' 같은 조각 방지
  if (GENERIC_IN_NAME.test(name)) return null;      // 일반어가 섞이면 작품명이 아니다
  const addr = String(address ?? '');
  if (addr && (addr.includes(name) || addr.includes(name.slice(0, 2)))) return null;  // 지명
  return { title: name, evidence: ['등재명'], context: `한국관광공사 등재명: "${title}"` };
}

/**
 * 한 장소의 조사 결과를 만든다.
 * 작품명을 못 뽑아도 버리지 않는다 — '촬영 언급은 있으나 작품 불명' 도 정보다.
 */
export function toFinding(place, overview, { extractWorkTitles, mentionsFilming, regionOf }) {
  const text = overview ?? '';
  const filming = mentionsFilming(text);
  const works = extractWorkTitles(text);

  // 소개글에서 못 뽑았을 때 등재명이 마지막 수단이 된다
  const fromName = extractFromPlaceName(place.title, place.address);
  if (fromName && !works.some((w) => w.title === fromName.title)) works.push(fromName);

  const redaction = detectRedaction(`${place.title ?? ''} ${text}`);

  return {
    upstreamRedacted: redaction.redacted,
    redactionSigns: redaction.signs,
    contentId: String(place.contentId),
    title: place.title,
    address: place.address ?? null,
    region: regionOf(place.address ?? ''),
    contentTypeId: String(place.contentTypeId ?? ''),
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    image: place.image ?? null,
    mentionsFilming: filming.mentioned,
    filmingHits: filming.hits,
    works: works.map((w) => ({ title: w.title, evidence: w.evidence, context: w.context })),
    overviewExcerpt: text.slice(0, 400) || null,
    scannedAt: new Date().toISOString().slice(0, 10),
  };
}

/**
 * 발굴 결과를 '작품 → 장소들' 로 뒤집는다.
 * 이 형태여야 locations.json 에 바로 옮길 수 있다.
 */
export function indexByWork(findings) {
  const byWork = {};
  for (const f of findings) {
    for (const w of f.works ?? []) {
      (byWork[w.title] ??= []).push({
        contentId: f.contentId,
        name: f.title,
        address: f.address,
        region: f.region,
        lat: f.lat,
        lng: f.lng,
        evidence: w.evidence,
        context: w.context,
      });
    }
  }
  // 장소가 많은 작품부터 — 기사 한 편에 여러 장소를 담을 수 있는 쪽이 가치가 크다
  return Object.fromEntries(
    Object.entries(byWork).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])),
  );
}

/**
 * 이전 결과와 합친다. 쿼터 때문에 한 번에 다 못 훑으므로 이어달리기가 기본이다.
 * 같은 contentId 는 새 결과로 덮는다 (소개글이 갱신될 수 있다).
 */
export function mergeFindings(previous = [], next = []) {
  const map = new Map(previous.map((f) => [String(f.contentId), f]));
  for (const f of next) map.set(String(f.contentId), f);
  return [...map.values()].sort((a, b) => a.contentId.localeCompare(b.contentId));
}

/** 요약 — 사람이 30초 안에 읽을 것 */
export function summarize(findings) {
  const withFilming = findings.filter((f) => f.mentionsFilming);
  const withWork = findings.filter((f) => (f.works ?? []).length > 0);
  const byWork = indexByWork(findings);
  return {
    scanned: findings.length,
    filmingMentioned: withFilming.length,
    workIdentified: withWork.length,
    upstreamRedacted: findings.filter((f) => f.upstreamRedacted).length,
    works: Object.keys(byWork).length,
    top: Object.entries(byWork).slice(0, 15).map(([title, places]) => ({ title, places: places.length })),
  };
}
