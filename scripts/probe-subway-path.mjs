/**
 * 서울교통공사 최단경로이동정보 API 탐침 — **파라미터 이름을 알아내는 것이 목적이다.**
 *
 * 왜 만들었나 (2026-08-23).
 *   운영자: 「너가 직접 자료를 구할 방법을 연구해봐. 매번 내가 해줄수 없잖아.」
 *   맞는 말이었다. 그날 숙소 기사에 필요한 환승·소요시간 스무 건을
 *   서울교통공사 사이버스테이션에서 손으로 뽑아 달라고 부탁하고 있었다.
 *   그건 기사 한 편마다 반복될 부탁이고, 방법이 아니다.
 *
 * 찾은 것.
 *   공공데이터포털 `서울교통공사_최단경로이동정보` (data.go.kr/data/15143842).
 *   사이버스테이션의 경로찾기를 그대로 API 로 낸 것이다.
 *     · 최소시간 · 최단거리 · 최소환승 세 유형
 *     · 구간별 정차역, 역간 이동시간·거리, 환승 여부
 *     · 역명 또는 역코드로 조회 (역값구분 파라미터)
 *   무료 · 이용허락범위 제한 없음 · 개발계정 자동승인 · 하루 10,000건.
 *   TourAPI 와 같은 포털이라 **인증키(DATA_GO_KR_KEY)를 그대로 쓴다.**
 *
 * 왜 바로 수집기를 안 쓰고 탐침부터인가.
 *   Swagger 화면에서 Base URL 과 엔드포인트까지는 읽었지만
 *   **요청 변수 이름은 못 읽었다.** 그리고 이 저장소는 짐작한 주소로 404 를
 *   세 번 봤다 (klook 도시 ID, 트립닷컴 경주·제주 호텔 목록).
 *   짐작한 파라미터로 수집기를 쓰면 같은 실패를 한 번 더 하는 것이고,
 *   이번엔 조용히 빈 배열을 저장할 수도 있다 — 그게 더 나쁘다.
 *
 *   그래서 이 스크립트는 **후보 조합을 차례로 던져보고 무엇이 통했는지 적는다.**
 *   한 번 통하면 그 이름을 fetch-subway-routes.mjs 에 고정하고 이 파일은 남겨 둔다.
 *
 * 쓰는 법
 *   1) data.go.kr 에서 이 API 에 **활용신청** (개발계정, 자동승인, 1분)
 *   2) setx DATA_GO_KR_KEY "..."   ← TourAPI 와 같은 키. 이미 있으면 그대로.
 *   3) node scripts/probe-subway-path.mjs 명동 경복궁
 *
 * 출력은 사람이 읽는 보고서다. 파일을 쓰지 않는다 — 탐침은 관찰만 한다.
 */
import { normalizeKey } from './lib/tourapi.mjs';

const BASE = 'https://apis.data.go.kr/B553766/path2';
const PATH = '/getShtrmPath2';
const TIMEOUT_MS = Number(process.env.SUBWAY_TIMEOUT_MS ?? 10000);

const [fromArg, toArg] = process.argv.slice(2);
const FROM = fromArg ?? '명동';
const TO = toArg ?? '경복궁';

/*
 * 후보 이름들.
 *
 * 공공데이터포털의 국문 API 는 파라미터 이름 관행이 갈린다 —
 * 영문 축약(dept/arvl), 국문 로마자(chulbal), 한글 그대로 셋 다 쓰인다.
 * 명세를 못 읽었으니 흔한 것부터 던진다. **이 목록은 추측이고, 추측임을 적어 둔다.**
 * 통한 조합이 나오면 그 줄만 남기고 나머지는 지운다.
 */
const CANDIDATES = [
  { dep: 'dept', arr: 'arvl', kind: 'stnNmCd' },
  { dep: 'deptStnNm', arr: 'arvlStnNm', kind: 'stnValGb' },
  { dep: 'startStnNm', arr: 'endStnNm', kind: 'stnValGb' },
  { dep: 'departure', arr: 'arrival', kind: 'stationType' },
  { dep: 'startSttnNm', arr: 'endSttnNm', kind: 'sttnValGb' },
  { dep: 'stStnNm', arr: 'edStnNm', kind: 'stnGb' },
];

function keyValue() {
  return normalizeKey(process.env.DATA_GO_KR_KEY).value;
}

async function tryOnce(c) {
  const p = new URLSearchParams({
    serviceKey: keyValue(),
    [c.dep]: FROM,
    [c.arr]: TO,
    [c.kind]: '1',              // 역명으로 조회한다는 뜻일 것으로 본다 (추측)
    numOfRows: '10', pageNo: '1', type: 'json', _type: 'json',
  });
  const url = `${BASE}${PATH}?${p}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const text = await res.text();
  return { status: res.status, text, shown: url.replace(keyValue(), '«KEY»') };
}

/**
 * 응답이 「쓸 만한가」를 판정한다.
 *
 * 200 이라고 성공이 아니다. 공공데이터포털은 **인증 실패도 200 으로 준다** —
 * 본문에 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 를 담아서. TourAPI 에서 이미 겪었다.
 * 그래서 상태코드가 아니라 본문을 본다.
 */
function verdict(text) {
  if (/SERVICE_KEY_IS_NOT_REGISTERED/i.test(text))
    return { ok: false, why: '키가 이 API 에 등록되지 않았습니다 — 활용신청이 필요합니다' };
  if (/LIMITED_NUMBER_OF_SERVICE_REQUESTS/i.test(text))
    return { ok: false, why: '일일 호출 한도 초과' };
  if (/NO_OPENAPI_SERVICE_ERROR|SERVICE_ACCESS_DENIED/i.test(text))
    return { ok: false, why: '서비스 주소 또는 접근 권한 문제' };
  if (/INVALID_REQUEST_PARAMETER|필수.*누락|누락된?\s*요청/i.test(text))
    return { ok: false, why: '파라미터 이름이 틀렸습니다 (다음 후보로)' };
  if (/"resultCode"\s*:\s*"?0*3"?/.test(text) || /NODATA/i.test(text))
    return { ok: false, why: '요청은 통했으나 결과 없음 — 역 이름을 확인하십시오' };
  if (/환승|소요|정차|Path|path|Trnsf|time/i.test(text) && text.length > 200)
    return { ok: true, why: '경로 데이터로 보이는 응답' };
  return { ok: false, why: '판정 불가 — 아래 원문을 눈으로 보십시오' };
}

async function main() {
  try { keyValue(); } catch (e) {
    console.error(
      '\nDATA_GO_KR_KEY 가 없습니다.\n' +
      '  TourAPI 와 같은 공공데이터포털 인증키입니다. 이미 쓰고 계신 그 키입니다.\n',
    );
    process.exit(1);
  }

  console.log(`\n서울교통공사 최단경로이동정보 탐침`);
  console.log(`  ${FROM} → ${TO}`);
  console.log(`  ${BASE}${PATH}\n`);

  const notes = [];
  for (const c of CANDIDATES) {
    let r;
    try {
      r = await tryOnce(c);
    } catch (e) {
      notes.push({ c, ok: false, why: `연결 실패: ${e.message}`, body: '' });
      continue;
    }
    const v = verdict(r.text);
    notes.push({ c, ok: v.ok, why: v.why, body: r.text.slice(0, 700), status: r.status, shown: r.shown });
    console.log(`  ${v.ok ? '통함' : '아님'}  ${c.dep}/${c.arr}/${c.kind}  — ${v.why}`);
    if (v.ok) {
      console.log('\n─── 통한 요청 ───');
      console.log(r.shown);
      console.log('\n─── 응답 앞부분 ───');
      console.log(r.text.slice(0, 2000));
      console.log(
        '\n다음 할 일:\n' +
        `  이 이름들을 scripts/fetch-subway-routes.mjs 에 고정한다\n` +
        `    출발=${c.dep}  도착=${c.arr}  역값구분=${c.kind}\n`,
      );
      return;
    }
  }

  /*
   * 전부 실패했을 때 조용히 끝내지 않는다.
   * 「아무것도 안 나왔다」와 「키가 없다」와 「이름을 못 맞혔다」는 전혀 다른 사건인데,
   * 종료코드 0 으로 끝내면 셋이 같아 보인다.
   */
  const keyProblem = notes.some((n) => /등록되지 않/.test(n.why));
  console.error('\n여섯 조합 모두 실패했습니다.\n');
  for (const n of notes) {
    console.error(`  ${n.c.dep}/${n.c.arr}/${n.c.kind}  (HTTP ${n.status ?? '-'}) ${n.why}`);
    if (n.body) console.error(`      ${n.body.replace(/\s+/g, ' ').slice(0, 220)}`);
  }
  console.error(
    keyProblem
      ? '\n키가 이 API 에 등록되지 않았습니다.\n' +
        '  data.go.kr/data/15143842/openapi.do 에서 **활용신청** 을 누르십시오.\n' +
        '  개발계정은 자동승인이고 1분이면 됩니다. 신청 뒤 다시 실행하십시오.\n'
      : '\n파라미터 이름을 못 맞혔습니다. **추측을 더 하지 않습니다.**\n' +
        '  활용신청을 마치면 마이페이지 > 오픈API > 개발계정에 **요청변수 표**가 나옵니다.\n' +
        '  그 표를 그대로 보내 주시면 이름을 고정하겠습니다 — 한 번만 하면 됩니다.\n',
  );
  process.exit(1);
}

main();
