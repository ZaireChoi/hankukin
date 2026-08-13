/**
 * Naver DataLab / 검색 API 클라이언트.
 * 자동화 원칙 (08 §8): 로그, 재시도, 속도제한, 실패격리를 포함한다.
 */
const BASE = 'https://openapi.naver.com/v1';

/** DataLab 검색어 트렌드는 요청당 키워드 그룹 5개가 상한이다. 앵커가 1칸을 쓴다. */
export const MAX_GROUPS_PER_REQUEST = 5;
export const TOPICS_PER_REQUEST = MAX_GROUPS_PER_REQUEST - 1;

function creds() {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았습니다. .env.example 참고.');
  }
  return { id, secret };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body, { retries = 3, log = console } = {}) {
  const { id, secret } = creds();
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
          'X-Naver-Client-Id': id,
          'X-Naver-Client-Secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * 2 ** (attempt - 1);
        log.warn?.(`[datalab] ${res.status} — ${wait}ms 후 재시도 (${attempt}/${retries})`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText} — ${(await res.text()).slice(0, 300)}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt === retries) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr ?? new Error('datalab request failed');
}

export function searchTrend({ startDate, endDate, timeUnit = 'week', keywordGroups }, opts) {
  if (keywordGroups.length > MAX_GROUPS_PER_REQUEST) {
    throw new Error(`키워드 그룹은 최대 ${MAX_GROUPS_PER_REQUEST}개입니다 (요청: ${keywordGroups.length})`);
  }
  return post('/datalab/search', { startDate, endDate, timeUnit, keywordGroups }, opts);
}

export function shoppingCategoryTrend({ startDate, endDate, timeUnit = 'week', category }, opts) {
  return post('/datalab/shopping/categories', { startDate, endDate, timeUnit, category }, opts);
}

/** 언론 반복 노출 = 세 번째 독립 신호. 사실 근거가 아니라 '관심 확산' 신호로만 쓴다. */
export async function newsCount(query, { log = console } = {}) {
  const { id, secret } = creds();
  const url = `${BASE}/search/news.json?query=${encodeURIComponent(query)}&display=1&sort=date`;
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
  });
  if (!res.ok) {
    log.warn?.(`[news] ${query}: ${res.status}`);
    return null;
  }
  const json = await res.json();
  return { total: json.total ?? 0, lastPubDate: json.items?.[0]?.pubDate ?? null };
}
