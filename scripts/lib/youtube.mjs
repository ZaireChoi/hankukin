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

/**
 * 작품명을 직접 검색해 '최근 화제성'을 측정한다.
 *
 * 왜 필요한가 (2026-08-13 실측):
 *   인기영상(trending) 목록만으로는 드라마를 잡지 못한다. 한국 트렌딩은 음악·예능이
 *   지배하므로, Netflix 6위 사극이 그 안에 들어올 이유가 없다. 실제로 130개를 훑어
 *   교차 검증 0건이었다.
 *   기다리는 대신 능동적으로 찾는다.
 *
 * 비용: search.list 는 100 유닛 (videos.list 의 100배). 작품 10편이면 1,000 유닛으로
 *       일일 할당량 10,000 의 10% 다. 감당 가능하지만 남발하면 안 되므로,
 *       트렌딩 매칭이 실패한 작품에 대해서만 호출한다.
 *
 * @returns {Promise<{videos:number, totalViews:number, topViews:number, samples:Array}|null>}
 */
export async function searchRecentBuzz(query, {
  regionCode = 'KR', days = 21, maxResults = 10, log = console,
  names = null, matchOpts = {},
} = {}) {
  try {
    const publishedAfter = new Date(Date.now() - days * 86400000).toISOString();
    const p = new URLSearchParams({
      part: 'snippet', type: 'video', q: query, regionCode,
      publishedAfter, order: 'viewCount', maxResults: String(maxResults), key: apiKey(),
    });
    const res = await fetch(`${BASE}/search?${p}`);
    if (!res.ok) {
      log.warn?.(`[youtube:search] ${res.status} (${query}): ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const json = await res.json();
    const ids = (json.items ?? []).map((i) => i.id?.videoId).filter(Boolean);
    if (ids.length === 0) return { videos: 0, relevant: 0, totalViews: 0, topViews: 0, samples: [], rejected: 0 };

    // 조회수는 search 응답에 없다. videos.list 로 한 번 더 부른다 (1 유닛).
    const sp = new URLSearchParams({ part: 'snippet,statistics', id: ids.join(','), key: apiKey() });
    const sres = await fetch(`${BASE}/videos?${sp}`);
    if (!sres.ok) return { videos: ids.length, relevant: 0, totalViews: 0, topViews: 0, samples: [], rejected: 0 };
    const sjson = await sres.json();

    const vids = (sjson.items ?? []).map((v) => ({
      title: v.snippet?.title ?? '', channel: v.snippet?.channelTitle ?? '',
      publishedAt: v.snippet?.publishedAt ?? null, views: Number(v.statistics?.viewCount ?? 0),
    })).sort((a, b) => b.views - a.views);

    // 관련성 필터: 제목에 작품명(또는 검증된 별칭)이 실제로 등장해야 한다.
    const rel = filterRelevant(vids, names ?? [query], matchOpts);
    const totalViews = rel.reduce((s, v) => s + v.views, 0);
    return {
      videos: vids.length,
      relevant: rel.length,
      totalViews,
      topViews: rel[0]?.views ?? 0,
      samples: rel.slice(0, 3),
      rejected: vids.length - rel.length,
    };
  } catch (e) {
    log.error?.(`[youtube:search] 실패 (${query}): ${e.message}`);
    return null;
  }
}

/**
 * 검색 화제성을 0~1 신호로 변환한다.
 *
 * 주의: 절대 조회수를 그대로 쓰지 않는다. K-pop MV 는 수천만이고 드라마 클립은 수십만이라
 * 같은 척도로 비교하면 음악이 항상 이긴다. 로그 스케일로 눌러 비교 가능하게 만든다.
 * 그리고 임계치 미만이면 신호로 인정하지 않는다 — 아무 작품이나 검색하면 영상 몇 개는 나오므로,
 * '검색 결과가 있다'는 사실 자체는 신호가 아니다.
 */
export const BUZZ_MIN_VIEWS = 300_000;   // 이보다 낮으면 화제성으로 보지 않는다
export const BUZZ_MIN_RELEVANT = 2;      // 제목에 작품명이 실제로 등장하는 영상 최소 개수

/**
 * 검색 결과 중 '실제로 그 작품을 말하는' 영상만 남긴다.
 *
 * 2026-08-13 실측 문제:
 *   'Badly in Love' 로 검색했더니 인도 시트콤(#tmkoc)과 무관한 한국 예능 클립이 잡혔고,
 *   그것들을 근거로 독립 신호 2개를 인정해버렸다. 10편 중 7편이 이렇게 통과했다.
 *   검색이 결과를 돌려줬다는 사실은 신호가 아니다. 제목이 작품을 가리켜야 신호다.
 */
export function filterRelevant(videos, names, opts = {}) {
  const needles = names.map((n) => normalizeTitle(n)).filter((n) => {
    const minChars = opts.minChars ?? 6, minWords = opts.minWords ?? 2;
    return n.length >= minChars && n.split(' ').length >= minWords;
  });
  if (needles.length === 0) return [];
  return videos.filter((v) => {
    const t = normalizeTitle(v.title);
    return needles.some((n) => t.includes(n));
  });
}

export function buzzStrength(buzz) {
  if (!buzz || !buzz.videos) return null;
  const relevant = buzz.relevant ?? buzz.videos;
  if (relevant < BUZZ_MIN_RELEVANT) return null;
  if (buzz.topViews < BUZZ_MIN_VIEWS) return null;
  // 5만 = 0.0, 500만 = 1.0 (로그 스케일)
  const v = Math.log10(buzz.topViews / BUZZ_MIN_VIEWS) / Math.log10(100);
  return Number(Math.max(0, Math.min(1, v)).toFixed(3));
}

/** 매칭된 트렌딩 영상들로부터 신호 강도를 계산한다 (0~1). */
export function trendingStrength(hits) {
  if (!hits || hits.length === 0) return null;
  const best = Math.min(...hits.map((h) => h.rank));
  const rankScore = (51 - Math.min(best, 50)) / 50;      // 1위=1.0, 50위=0.02
  const countBonus = Math.min(hits.length - 1, 2) * 0.1;  // 여러 영상이 걸리면 가산
  return Number(Math.min(1, rankScore * 0.8 + countBonus).toFixed(3));
}
