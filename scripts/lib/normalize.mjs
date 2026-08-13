/**
 * Naver DataLab 응답 정규화.
 *
 * 실제 API 응답을 관측한 뒤 만들어진 방어 로직이다 (2026-08-13 probe).
 * 관측된 함정 3가지:
 *
 *  1) ratio 는 "요청 안에서의 상대값"이다. 한 요청에서 최댓값이 100이 된다.
 *     → 서로 다른 요청/다른 날의 ratio 를 직접 비교하면 안 된다.
 *     → 모든 요청에 고정 ANCHOR 키워드를 끼워 넣고 그 대비 비율을 저장한다.
 *
 *  2) 마지막 구간은 "진행 중인 주"라 값이 급락한다.
 *     관측 예: 약과 2026-08-03 = 76.9 → 2026-08-10 = 26.0
 *     이를 그대로 읽으면 멀쩡한 트렌드가 Cooling Down 으로 오판된다.
 *     → 완료되지 않은 마지막 구간은 버린다.
 *
 *  3) 검색량이 임계치 미만이면 data 가 빈 배열로 온다 (관측: "두바이스크림").
 *     → 이것은 "하락"이 아니라 "측정 불가"다. 반드시 구분한다.
 */

const UNIT_DAYS = { date: 1, week: 7, month: 30 };

/** 진행 중인 마지막 구간 제거 */
export function dropIncompletePeriod(data, timeUnit, today = new Date()) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const span = UNIT_DAYS[timeUnit] ?? 7;
  const last = data[data.length - 1];
  const start = new Date(`${last.period}T00:00:00Z`);
  const endExclusive = new Date(start.getTime() + span * 86400000);
  // 구간이 아직 끝나지 않았으면 신뢰할 수 없다
  return endExclusive > today ? data.slice(0, -1) : data;
}

export const SIGNAL_STATUS = {
  OK: 'ok',
  INSUFFICIENT_VOLUME: 'insufficient_volume',  // API 가 빈 배열을 반환
  TOO_SHORT: 'too_short',                      // 완료 구간이 부족
};

/**
 * 한 요청의 결과를 앵커 대비로 정규화한다.
 * @returns {{topic:string, status:string, points:Array<{period:string, raw:number, vsAnchor:number|null}>}[]}
 */
export function normalizeAgainstAnchor(results, anchorName, timeUnit, today = new Date()) {
  const anchor = results.find((r) => r.title === anchorName);
  const anchorPoints = anchor ? dropIncompletePeriod(anchor.data, timeUnit, today) : [];
  const anchorBy = new Map(anchorPoints.map((p) => [p.period, p.ratio]));

  return results
    .filter((r) => r.title !== anchorName)
    .map((r) => {
      if (!r.data || r.data.length === 0) {
        return { topic: r.title, status: SIGNAL_STATUS.INSUFFICIENT_VOLUME, points: [] };
      }
      const pts = dropIncompletePeriod(r.data, timeUnit, today);
      if (pts.length < 2) {
        return { topic: r.title, status: SIGNAL_STATUS.TOO_SHORT, points: [] };
      }
      return {
        topic: r.title,
        status: SIGNAL_STATUS.OK,
        points: pts.map((p) => {
          const a = anchorBy.get(p.period);
          return {
            period: p.period,
            raw: p.ratio,
            vsAnchor: a && a > 0 ? Number((p.ratio / a).toFixed(6)) : null,
          };
        }),
      };
    });
}

/**
 * 상승률 계산. 앵커 대비값이 있으면 그것을, 없으면 raw 를 쓴다.
 * 최근 n구간 평균 대비 직전 n구간 평균.
 */
export function momentum(points, window = 4) {
  const usable = points.filter((p) => p.vsAnchor != null);
  const series = (usable.length >= window * 2 ? usable : points).map((p) => p.vsAnchor ?? p.raw);
  if (series.length < window * 2) return null;
  const recent = series.slice(-window);
  const prior = series.slice(-window * 2, -window);
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const p = avg(prior);
  if (!p) return null;
  return Number(((avg(recent) - p) / p).toFixed(4));
}

/**
 * 유행단계 판정 (기획문서 11 §6).
 *
 * 중요: 독립 신호가 1개뿐이면 절대 Rising 이상으로 올리지 않는다 (05 §8, 11 §4).
 * 근거가 하나뿐일 때의 상한은 'emerging' 이다.
 */
export const STAGE = {
  EMERGING: 'emerging',
  RISING: 'rising',
  HOT: 'hot',
  MAINSTREAM: 'mainstream',
  COOLING: 'cooling',
  ARCHIVE: 'archive',
};

export function evaluateStage({ signals = [], weeksObserved = 0 }) {
  const usable = signals.filter((s) => s.status === SIGNAL_STATUS.OK && s.momentum != null);
  const independentSources = new Set(usable.map((s) => s.source)).size;

  if (usable.length === 0) {
    return { stage: null, independentSources, reason: 'no_usable_signal', publishable: false };
  }

  const avgMomentum = usable.reduce((s, v) => s + v.momentum, 0) / usable.length;

  // 단일 신호 상한 규칙 — 이것이 이 함수의 존재 이유다
  if (independentSources < 2) {
    return {
      stage: STAGE.EMERGING,
      independentSources,
      avgMomentum,
      reason: 'single_source_capped',
      label: 'Emerging online signal',
      publishable: true,
    };
  }

  let stage;
  if (avgMomentum >= 0.5) stage = STAGE.HOT;
  else if (avgMomentum >= 0.15) stage = STAGE.RISING;
  else if (avgMomentum <= -0.25) stage = STAGE.COOLING;
  else stage = weeksObserved >= 12 ? STAGE.MAINSTREAM : STAGE.RISING;

  return { stage, independentSources, avgMomentum, reason: 'multi_source', publishable: true };
}
