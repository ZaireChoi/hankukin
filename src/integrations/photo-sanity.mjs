/**
 * 사진 오매칭 자동 검수 — 1층: 이름 검사와 확인 대장(臺帳).
 *
 * 왜 만들었나 (2026-08-15 운영자 요구).
 *
 *   하루에 사진 오매칭을 **여덟 번** 걸렀다. 전부 사람 눈으로.
 *     서울역 → 서울역사박물관 (박물관)
 *     설악산 → 설악산책        (책방 카페)
 *     설악산 → 자동차야영장
 *     부산역 → 하운드호텔 부산역점 (호텔)
 *     불국사 → 불국사밀면      (밀면집)
 *     단풍   → 단풍산          (이름만 단풍인 산)
 *     벚꽃   → 안양천제방벚꽃길 (내용 중복 — md5 게이트가 이미 잡는다)
 *     내장산 단풍생태공원      → 이름은 맞고 사진이 여름 (2층에서 잡는다)
 *
 *   "다음부터 잘 보자" 는 해결이 아니다. 여덟 번 중 여섯 번은
 *   **등재명 문자열만 봐도 알 수 있었다.** 기계가 볼 수 있는 것은 기계가 본다.
 *
 * 두 가지를 한다.
 *
 *   ① 이름 검사 — 요청한 키워드와 실제 등재명을 비교한다.
 *      등재명에 '박물관·호텔·밀면·책방·야영장' 같은 **종류를 바꾸는 말**이 붙어 있으면
 *      빌드를 세운다. 지역 접두어(경주·서울)나 허용 접미어(공원·시장)는 통과시킨다.
 *
 *   ② 확인 대장 — data/photo-verified.json 에 '사람이 열어 봤다' 는 기록을 남긴다.
 *      **기사에 실린 사진의 장소가 대장에 없으면 빌드가 실패한다.**
 *      이것이 이 파일의 핵심이다. 이름 검사는 아는 함정만 잡지만,
 *      대장은 **아무도 안 본 사진이 발행되는 것 자체를 막는다.**
 *      한 장소당 한 번만 보면 되고, 그 뒤로는 영영 조용하다.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const PLACES = 'data/place-images.json';
const LEDGER = 'data/photo-verified.json';
const CONTENT = 'src/content';

/** 등재명에 붙으면 **다른 종류의 장소**가 되는 말. 여기 걸리면 빌드가 선다. */
const DENY = [
  // 오늘 실제로 당한 것들
  '박물관', '미술관', '역사관', '기념관', '전시관', '체험관',
  '호텔', '모텔', '펜션', '리조트', '콘도', '게스트하우스', '민박',
  '밀면', '냉면', '식당', '맛집', '카페', '베이커리', '분식',
  '책', '책방', '서점', '도서관',   // '설악산책' 을 잡는다
  '야영장', '캠핑장', '오토캠핑',
  // 같은 함정의 다른 얼굴
  '주차장', '휴게소',
  // '터미널' 은 뺐다 — '인천국제공항 제2여객터미널' 은 진짜 공항이다.
  // 오탐 하나가 진짜 경보 열 개를 무디게 만든다.
  '병원', '의원', '약국', '학교', '유치원', '학원',
  '아파트', '빌라', '오피스텔', '상가',
  '골프', '워터파크', '스키장', '수련원', '연수원',
  '마트', '백화점', '아울렛', '편의점',
  '점', '지점', '본점',   // '부산역점' 을 잡는다
];

/** 붙어도 같은 곳인 말. 지역 접두어와 일반 접미어. */
const ALLOW = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
  '경주', '거제', '수원', '전주', '안동', '여수', '속초', '강릉',
  '공원', '국립공원', '도립공원', '군립공원',
  '시장', '전통시장', '해변', '해수욕장', '유원지', '한옥마을',
  '유적지', '관광지', '여객터미널', '제1', '제2', '제3',
  '(', ')', '·', '-', '~', ',',
];

const norm = (s) => (s ?? '').replace(/\s+/g, '');

/** 등재명이 키워드와 다를 때, 그 차이가 위험한지 본다. */
function nameVerdict(keyword, title) {
  const k = norm(keyword), t = norm(title);
  if (!k || !t) return { level: 'warn', why: '키워드 또는 등재명이 비어 있습니다' };
  if (k === t) return { level: 'ok' };

  if (!t.includes(k)) {
    return { level: 'fail', why: `등재명에 요청한 말이 아예 없습니다 (요청 "${keyword}" → 받은 "${title}")` };
  }
  const extra = t.split(k).join('');
  const hit = DENY.find((d) => extra.includes(d));
  if (hit) {
    return { level: 'fail', why: `등재명에 "${hit}" 이 붙어 있습니다 — 다른 종류의 장소입니다 (요청 "${keyword}" → 받은 "${title}")` };
  }
  let rest = extra;
  for (const a of ALLOW) rest = rest.split(a).join('');
  if (rest.length === 0) return { level: 'ok' };
  return { level: 'warn', why: `등재명이 요청과 다릅니다 — "${title}" (덧붙은 말: "${extra}")` };
}

/** 기사에서 실제로 쓰이는 사진 파일 이름을 모은다. */
function usedFiles() {
  const out = new Set();
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (/\.(md|mdx)$/.test(e.name)) {
        const text = readFileSync(p, 'utf8');
        for (const m of text.matchAll(/assets\/images\/[\w/-]+\/([\w.-]+\.(?:jpg|jpeg|png|webp|avif))/gi)) {
          out.add(m[1]);
        }
      }
    }
  };
  walk(CONTENT);
  return out;
}

export default function photoSanity() {
  return {
    name: 'hankukin:photo-sanity',
    hooks: {
      'astro:build:start': ({ logger }) => {
        if (!existsSync(PLACES)) return;
        const places = JSON.parse(readFileSync(PLACES, 'utf8')).places ?? [];
        const ledger = existsSync(LEDGER)
          ? JSON.parse(readFileSync(LEDGER, 'utf8'))
          : { verified: {} };
        const used = usedFiles();

        const fails = [];
        const warns = [];
        const unseen = [];

        for (const pl of places) {
          const files = (pl.images ?? []).map((i) => i.file);
          const inUse = files.filter((f) => used.has(f));
          if (inUse.length === 0) continue;          // 안 쓰는 사진은 따지지 않는다

          const v = nameVerdict(pl.keyword, pl.title);
          if (v.level === 'fail') fails.push(`${pl.slug}: ${v.why}`);
          else if (v.level === 'warn') warns.push(`${pl.slug}: ${v.why}`);

          if (!ledger.verified?.[pl.slug]) {
            unseen.push(`${pl.slug} — "${pl.title}" (${inUse.length}장 사용 중)`);
          }
        }

        if (fails.length) {
          throw new Error(
            `사진의 장소가 요청과 다릅니다 (${fails.length}건).\n\n` +
            fails.map((f) => `  ${f}`).join('\n') +
            '\n\n등재명은 장소일 뿐 내용의 보증이 아닙니다.\n' +
            '해당 사진을 지우고 exactTitle 로 다시 요청하십시오.\n',
          );
        }
        if (unseen.length) {
          throw new Error(
            `아무도 열어 보지 않은 사진이 기사에 실려 있습니다 (${unseen.length}곳).\n\n` +
            unseen.map((u) => `  ${u}`).join('\n') +
            '\n\n사진을 실제로 열어 본 뒤 data/photo-verified.json 에 기록하십시오:\n' +
            '  "슬러그": { "verifiedAt": "YYYY-MM-DD", "note": "무엇이 찍혀 있는지 한 줄" }\n\n' +
            '이 검사가 있는 이유: 2026-08-15 하루에 오매칭을 여덟 번 걸렀고\n' +
            '여덟 번 모두 "열어 봤기 때문에" 걸렀습니다. 열어 보지 않으면 그대로 실립니다.\n',
          );
        }
        for (const w of warns) logger.warn(w);
        logger.info(`사진 장소 ${places.length}곳 · 이름 검사 통과 · 확인 대장 최신`);
      },
    },
  };
}
