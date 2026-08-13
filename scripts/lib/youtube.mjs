/**
 * YouTube Data API v3 어댑터 — 두 번째 독립 신호.
 *
 * 왜 필요한가:
 *   Netflix 차트만으로는 한 작품에 대해 신호가 1개뿐이다.
 *   기획문서 05 §8 규칙에 따라 독립 신호가 2개 미만이면 'emerging' 을 넘을 수 없으므로,
 *   Netflix 만으로는 모든 주제가 초기 단계에 갇힌다.
 *
 *   YouTube 한국 인기 영상은 성격이 다른 독립 신호다.
 *   Netflix 순위 = 실제 시청, YouTube 트렌딩 = 화제성·확산.
 *   두 신호가 같은 작품을 가리키면 비로소 'rising' 이상을 주장할 근거가 생긴다.
 *
 * 비용: videos.list 는 호출당 1 유닛. 일일 무료 할당량 10,000 유닛.
 *       하루 몇 유닛만 쓰므로 사실상 제약이 없다.
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

/** 우리가 관심 있는 카테고리 */
export const CATEGORY = {
  MUSIC: '10',
  ENTERTAINMENT: '24',
  FILM_ANIMATION: '1',
};

function apiKey() {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error('YOUTUBE_API_KEY 가 설정되지 않았습니다.');
  return k;
}

export function assertYoutubeKey() { apiKey(); }

/**
 * 지역별 인기 영상. 절대 throw 하지 않는다 — 실패해도 파이프라인은 계속된다.
 * @returns {Promise<{items:Array}|null>}
 */
export async function fetchMostPopular({
  regionCode = 'KR', categoryId = null, maxResults = 50, log = console,
} = {}) {
  try {
    const p = new URLSearchParams({
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode,
      maxResults: String(maxResults),
      key: apiKey(),
    });
    if (categoryId) p.set('videoCategoryId', categoryId);

    const res = await fetch(`${BASE}/videos?${p}`);
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      log.warn?.(`[youtube] ${res.status} (${regionCode}/${categoryId ?? 'all'}): ${body}`);
      return null;
    }
    const json = await res.json();
    const items = (json.items ?? []).map((v, i) => ({
      rank: i + 1,
      videoId: v.id,
      title: v.snippet?.title ?? '',
      channel: v.snippet?.channelTitle ?? '',
      publishedAt: v.snippet?.publishedAt ?? null,
      viewCount: Number(v.statistics?.viewCount ?? 0),
      categoryId: v.snippet?.categoryId ?? null,
    }));
    log.info?.(`[youtube] ${regionCode}/${categoryId ?? 'all'} 인기영상 ${items.length}건`);
    return { regionCode, categoryId, items };
  } catch (e) {
    log.error?.(`[youtube] 실패: ${e.message}`);
    return null;
  }
}

/** 비교용 정규화 — 대소문자·공백·특수문자·시즌 표기 제거 */
export function normalizeTitle(s) {
  return String(s)
    .toLowerCase()
    .replace(/[\[\]()（）【】|:·・~!?"'’“”,.]/g, ' ')
    .replace(/\b(season|시즌|part|파트)\s*\d+\b/g, ' ')
    .replace(/\b(limited series|official|teaser|trailer|예고|공식|하이라이트|highlight|mv|m\/v)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 작품 제목이 YouTube 트렌딩 영상 제목에 등장하는지 확인한다.
 *
 * 주의: 짧거나 흔한 단어는 우연히 맞을 수 있다.
 *   'Solo' 같은 제목은 무관한 음악 영상에 걸린다.
 *   그래서 최소 길이와 단어 수 조건을 둔다. 애매하면 매칭하지 않는다 —
 *   거짓 양성은 '신호 2개'를 잘못 만들어 단계를 부풀리기 때문에 가장 위험하다.
 */
export function matchTitle(workTitle, videos, { minChars = 6, minWords = 2 } = {}) {
  const needle = normalizeTitle(workTitle);
  if (needle.length < minChars || needle.split(' ').length < minWords) {
    return { matched: false, reason: 'title_too_generic', hits: [] };
  }
  const hits = videos.filter((v) => normalizeTitle(v.title).includes(needle));
  return {
    matched: hits.length > 0,
    reason: hits.length > 0 ? 'title_in_trending' : 'no_match',
    hits: hits.slice(0, 3).map((h) => ({ rank: h.rank, title: h.title, channel: h.channel, views: h.viewCount })),
  };
}

/** 매칭된 트렌딩 영상들로부터 신호 강도를 계산한다 (0~1). */
export function trendingStrength(hits) {
  if (!hits || hits.length === 0) return null;
  const best = Math.min(...hits.map((h) => h.rank));
  const rankScore = (51 - Math.min(best, 50)) / 50;      // 1위=1.0, 50위=0.02
  const countBonus = Math.min(hits.length - 1, 2) * 0.1;  // 여러 영상이 걸리면 가산
  return Number(Math.min(1, rankScore * 0.8 + countBonus).toFixed(3));
}
