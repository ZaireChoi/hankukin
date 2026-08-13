/**
 * Netflix Tudum Top 10 어댑터 — 신작 감지용 '시의성 신호'.
 *
 * 왜 필요한가: 기획문서 07 §6-1 은 "신작·컴백·MV 직후 신속 발행"을 수익 1순위 원칙으로 두고,
 * 04 §4 의 주제 점수에서 '현재 검색·트렌드 수요'가 25점으로 최대 배점이다.
 * 드라마·K-pop 축에 시의성 입력이 없으면 그 25점을 채울 방법이 없다.
 *
 * ⚠ 신뢰도 등급: 이 모듈은 외부 사이트 구조에 의존하므로 **언제든 깨질 수 있다**.
 *   따라서 절대 파이프라인을 멈추지 않는다. 실패하면 null 을 반환하고 호출부가 계속 진행한다.
 *   Naver DataLab/뉴스(공식 API)가 주 신호이고, 이것은 보강 신호다.
 */

const TSV_COUNTRIES = 'https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv';
const TSV_GLOBAL    = 'https://www.netflix.com/tudum/top10/data/all-weeks-global.tsv';
const PAGE_URL = (country, kind) => `https://www.netflix.com/tudum/top10/${country}/${kind}`;
const UA = 'Mozilla/5.0 (compatible; HANKUKIN-signal-collector/0.1)';

/**
 * 공식 TSV 파싱 (1순위 경로).
 * 컬럼: week, country_iso2, country_name, category, weekly_rank, show_title, season_title, cumulative_weeks_in_top_10
 */
export function parseTsv(text, { countryIso = 'KR', category = 'TV' } = {}) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('TSV 본문이 비어 있음');

  const header = lines[0].split('\t').map((h) => h.trim());
  const idx = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`TSV 컬럼 누락: ${name} (실제: ${header.join(',')})`);
    return i;
  };
  const c = {
    week: idx('week'), iso: idx('country_iso2'), category: idx('category'),
    rank: idx('weekly_rank'), show: idx('show_title'),
    season: header.indexOf('season_title'),
    weeks: header.indexOf('cumulative_weeks_in_top_10'),
  };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split('\t');
    if (f.length < header.length - 2) continue;
    if (f[c.iso] !== countryIso) continue;
    if (!f[c.category]?.toUpperCase().includes(category.toUpperCase())) continue;
    rows.push({
      week: f[c.week],
      rank: Number(f[c.rank]),
      title: (f[c.show] || '').trim(),
      season: c.season >= 0 ? (f[c.season] || '').trim() : '',
      weeksInTop10: c.weeks >= 0 ? Number(f[c.weeks]) || 0 : 0,
    });
  }
  if (rows.length === 0) throw new Error(`TSV 에서 ${countryIso}/${category} 행을 찾지 못함`);

  // 가장 최근 주만 남긴다
  const latestWeek = rows.map((r) => r.week).sort().at(-1);
  return rows.filter((r) => r.week === latestWeek).sort((a, b) => a.rank - b.rank);
}

/**
 * 글로벌 TSV 파싱.
 * 국가별 파일과 컬럼이 다르다 — country_iso2 가 없고 category 값이 'TV (English)' 처럼 세분화된다.
 * 2026-08-13 실측: 국가 파일로 글로벌을 대신할 수 없어 별도 경로가 필요했다.
 */
export function parseGlobalTsv(text, { category = 'TV' } = {}) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('글로벌 TSV 본문이 비어 있음');
  const header = lines[0].split('\t').map((h) => h.trim());
  const idx = (n) => { const i = header.indexOf(n); if (i < 0) throw new Error(`TSV 컬럼 누락: ${n}`); return i; };
  const c = { week: idx('week'), category: idx('category'), rank: idx('weekly_rank'), show: idx('show_title'),
              season: header.indexOf('season_title'), weeks: header.indexOf('cumulative_weeks_in_top_10') };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split('\t');
    if (f.length < 4) continue;
    if (!f[c.category]?.toUpperCase().startsWith(category.toUpperCase())) continue;
    rows.push({
      week: f[c.week], rank: Number(f[c.rank]), title: (f[c.show] || '').trim(),
      season: c.season >= 0 ? (f[c.season] || '').trim() : '',
      weeksInTop10: c.weeks >= 0 ? Number(f[c.weeks]) || 0 : 0,
      category: f[c.category],
    });
  }
  if (rows.length === 0) throw new Error(`글로벌 TSV 에서 ${category} 행을 찾지 못함`);
  const latest = rows.map((r) => r.week).sort().at(-1);
  return rows.filter((r) => r.week === latest).sort((a, b) => a.rank - b.rank).slice(0, 10);
}

/**
 * 페이지 텍스트 파싱 (2순위 폴백).
 * 순위가 01~10 으로 순차적이라는 점을 앵커로 쓴다.
 */
export function parsePageText(text) {
  const anchor = text.indexOf('overviewRanking');
  const body = anchor >= 0 ? text.slice(anchor + 'overviewRanking'.length) : text;

  const out = [];
  for (let rank = 1; rank <= 10; rank++) {
    const tag = String(rank).padStart(2, '0');
    const start = body.indexOf(tag, rank === 1 ? 0 : (out.at(-1)?._end ?? 0));
    if (start < 0) break;
    const nextTag = String(rank + 1).padStart(2, '0');
    let end = body.indexOf(nextTag, start + 2);
    if (rank === 10 || end < 0) end = Math.min(body.length, start + 120);
    const raw = body.slice(start + 2, end);
    const title = raw.replace(/\d+$/, '').replace(/:\s*(Limited Series|Season \d+)$/i, '').trim();
    if (title) out.push({ rank, title, weeksInTop10: null, _end: end });
  }
  return out.map(({ _end, ...r }) => r);
}

/** 최상위 진입점. 절대 throw 하지 않는다. */
export async function fetchTop10({ country = 'south-korea', iso = 'KR', kind = 'tv', scope = 'country', log = console } = {}) {
  // 1순위: 공식 TSV. 글로벌은 별도 파일이다 (국가 파일에 글로벌 행이 없다).
  try {
    const url = scope === 'global' ? TSV_GLOBAL : TSV_COUNTRIES;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const text = await res.text();
      const rows = scope === 'global'
        ? parseGlobalTsv(text, { category: kind === 'tv' ? 'TV' : 'Films' })
        : parseTsv(text, { countryIso: iso, category: kind === 'tv' ? 'TV' : 'Films' });
      log.info?.(`[netflix] TSV 경로 성공 (${scope}) — ${rows.length}건`);
      return { source: 'tsv', rows };
    }
    log.warn?.(`[netflix] TSV ${res.status} — 페이지 폴백 시도`);
  } catch (e) {
    log.warn?.(`[netflix] TSV 실패(${e.message}) — 페이지 폴백 시도`);
  }

  // 2순위: 페이지
  try {
    const res = await fetch(PAGE_URL(country, kind), { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const plain = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, '');
    const rows = parsePageText(plain);
    if (rows.length === 0) throw new Error('순위를 추출하지 못함');
    log.warn?.(`[netflix] 페이지 폴백 사용 — ${rows.length}건 (구조 변경에 취약)`);
    return { source: 'page', rows };
  } catch (e) {
    log.error?.(`[netflix] 모든 경로 실패: ${e.message} — Naver 신호만으로 계속 진행`);
    return null;   // 파이프라인을 멈추지 않는다
  }
}

/**
 * 신작성 점수. 순위보다 '새로 들어왔는가'와 '올라가는가'가 중요하다.
 * 1위지만 8주째인 작품보다, 6위인데 이번 주 신규 진입인 작품이 콘텐츠 기회로는 낫다.
 */
export function noveltyScore(row, previousRows = [], { hasHistory = true } = {}) {
  const prev = previousRows.find((p) => p.title === row.title);
  const rankScore = (11 - row.rank) / 10;                    // 0.1 ~ 1.0

  // 이전 스냅샷이 없으면(첫 실행) 모두 '신규'로 보이는 착시가 생긴다.
  // 2026-08-13 첫 실행에서 7주째인 작품까지 new_entry 로 잡혔다.
  // 이럴 때는 차트가 제공하는 누적 주차를 신규 판단의 대체 근거로 쓴다.
  if (!hasHistory || previousRows.length === 0) {
    const w = row.weeksInTop10 ?? 0;
    if (w <= 1) return { score: Number((0.6 + rankScore * 0.4).toFixed(3)), reason: 'new_entry_by_weeks' };
    if (w <= 3) return { score: Number((0.35 + rankScore * 0.3).toFixed(3)), reason: 'recent_by_weeks' };
    return { score: Number((rankScore * 0.3).toFixed(3)), reason: 'established_by_weeks' };
  }

  if (!prev) return { score: Number((0.6 + rankScore * 0.4).toFixed(3)), reason: 'new_entry' };

  const climb = prev.rank - row.rank;                        // 양수면 상승
  if (climb > 0) return { score: Number((0.4 + rankScore * 0.3 + Math.min(climb, 5) * 0.06).toFixed(3)), reason: 'climbing' };

  const weeks = row.weeksInTop10 ?? 0;
  if (weeks >= 6) return { score: Number((rankScore * 0.25).toFixed(3)), reason: 'saturated' };
  return { score: Number((rankScore * 0.4).toFixed(3)), reason: 'holding' };
}
