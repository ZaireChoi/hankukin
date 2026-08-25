/**
 * 서울교통공사 공개 자료 → 저장소가 읽을 수 있는 UTF-8 JSON.
 *
 * 왜 필요한가 (2026-08-23).
 *   운영자가 공공데이터포털에서 세 개의 CSV 를 받아 주셨다.
 *   그런데 **EUC-KR(CP949) 인코딩**이라 그대로는 못 읽는다 —
 *   숫자는 보이는데 역 이름이 전부 깨진다. 「서울역」이 「���￪」로 온다.
 *
 *   이걸 손으로 고칠 수는 없다. 역이 수백 개다.
 *   그리고 이 자료는 앞으로 서울 기사마다 쓸 것이라 **한 번 제대로 들여놓아야** 한다.
 *
 * 왜 의존성을 안 쓰나.
 *   Node 18 이상은 full-ICU 를 기본 포함하므로 TextDecoder 가 'euc-kr' 를 안다.
 *   iconv-lite 를 설치할 이유가 없다. 이 저장소는 이미 의존성이 충분히 많다.
 *
 * 쓰는 법
 *   1) 받은 CSV 세 개를 data/raw/ 에 넣는다 (폴더가 없으면 만든다)
 *   2) node scripts/import-subway-data.mjs
 *
 * 한 번만 돌리면 된다. 자료가 갱신되면 새 CSV 로 갈아 끼우고 다시 돌린다.
 *
 * 출처와 라이선스
 *   서울교통공사 / 공공데이터포털. 공공누리 유형은 각 데이터셋 페이지에 적혀 있고,
 *   기사에 숫자를 쓸 때는 **반드시 서울교통공사를 출처로 표기한다.**
 *   TourAPI 사진에 한국관광공사를 적는 것과 같은 규율이다.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'data/raw';
const OUT = 'data';

/**
 * EUC-KR 로 읽는다.
 *
 * ※ 파일이 이미 UTF-8 인 경우도 대비한다. BOM 이 있거나, EUC-KR 로 읽었을 때
 *   U+FFFD(치환문자)가 많이 나오면 UTF-8 로 다시 읽는다.
 *   「인코딩을 짐작하고 그대로 진행」이 이 저장소에서 조용한 사고를 만든 적이 있다.
 */
function readText(path) {
  const buf = readFileSync(path);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.slice(3).toString('utf8'), enc: 'utf-8 (BOM)' };
  }
  const asEuc = new TextDecoder('euc-kr').decode(buf);
  const asUtf = buf.toString('utf8');
  const bad = (s) => (s.match(/�/g) ?? []).length;
  if (bad(asEuc) <= bad(asUtf)) return { text: asEuc, enc: 'euc-kr' };
  return { text: asUtf, enc: 'utf-8' };
}

/** 따옴표를 다루는 최소한의 CSV 파서. 이 자료에는 줄바꿈이 든 셀이 없다. */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

/** '2:00' → 120초. 빈 값과 '0:00' 을 구분해서 돌려준다. */
function toSeconds(v) {
  const m = /^(\d+):(\d{2})$/.exec(String(v).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function pickFile(names, ...needles) {
  return names.find((n) => needles.every((s) => n.includes(s)));
}

function main() {
  if (!existsSync(RAW)) {
    console.error(
      `\n${RAW} 가 없습니다.\n` +
      '  받으신 CSV 세 개를 그 폴더에 넣고 다시 실행하십시오.\n' +
      '    · 서울교통공사_역간거리.csv\n' +
      '    · 서울교통공사_환승역거리 소요시간 정보_*.csv\n' +
      '    · 서울시 역사마스터 정보.csv\n',
    );
    process.exit(1);
  }
  const names = readdirSync(RAW).filter((n) => n.toLowerCase().endsWith('.csv'));
  if (!names.length) { console.error(`${RAW} 에 CSV 가 없습니다.`); process.exit(1); }

  console.log(`\n${RAW} 에서 CSV ${names.length}개를 읽습니다.\n`);
  const wrote = [];

  // ── 1. 역사마스터 — 역 이름·호선·위경도 ────────────────────────────
  const fMaster = pickFile(names, '역사마스터');
  if (fMaster) {
    const { text, enc } = readText(join(RAW, fMaster));
    const rows = parseCsv(text);
    const body = rows.slice(1);
    const stations = body.map(([id, name, line, lat, lng]) => ({
      id, name, line,
      lat: Number(lat) || null,
      lng: Number(lng) || null,
    })).filter((s) => s.name);
    writeFileSync(join(OUT, 'subway-stations.json'), JSON.stringify({
      _출처: '서울시 역사마스터 정보 (서울교통공사 / 공공데이터포털)',
      _주의: '기사에 쓸 때 출처를 서울교통공사로 표기한다.',
      _가져온날: new Date().toISOString().slice(0, 10),
      _원본파일: fMaster, _원본인코딩: enc,
      stations,
    }, null, 2) + '\n');
    wrote.push(`subway-stations.json — 역 ${stations.length}개 (${enc})`);
  }

  // ── 2. 역간거리 — 구간 소요시간과 거리 ─────────────────────────────
  const fSeg = pickFile(names, '역간거리');
  if (fSeg) {
    const { text, enc } = readText(join(RAW, fSeg));
    const rows = parseCsv(text).slice(1);
    const segments = rows.map(([line, name, time, km, cum]) => ({
      line, name,
      /** 앞 역에서 이 역까지 걸리는 시간(초). 노선 첫 역은 0 이다. */
      runSeconds: toSeconds(time),
      km: Number(km),
      cumulativeKm: Number(cum),
    })).filter((s) => s.name);
    writeFileSync(join(OUT, 'subway-segments.json'), JSON.stringify({
      _출처: '서울교통공사 역간거리 (공공데이터포털)',
      _읽는법: 'runSeconds 는 **앞 역에서 이 역까지** 걸리는 시간이다. 노선 첫 역은 0.',
      _한계: '서울교통공사 관할 노선만 있다. 우이신설선·공항철도·신분당선 등은 빠져 있을 수 있다.',
      _가져온날: new Date().toISOString().slice(0, 10),
      _원본파일: fSeg, _원본인코딩: enc,
      segments,
    }, null, 2) + '\n');
    const lines = [...new Set(segments.map((s) => s.line))];
    wrote.push(`subway-segments.json — 구간 ${segments.length}개 · 노선 ${lines.length}개 (${enc})`);
  }

  // ── 3. 환승역 — 환승 거리와 걷는 시간 ──────────────────────────────
  const fTrans = pickFile(names, '환승역');
  if (fTrans) {
    const { text, enc } = readText(join(RAW, fTrans));
    const rows = parseCsv(text);
    writeFileSync(join(OUT, 'subway-transfers.json'), JSON.stringify({
      _출처: '서울교통공사 환승역거리 소요시간 정보 (공공데이터포털)',
      _주의: '환승 소요시간은 보행속도 1.2 m/s 기준으로 계산된 값이다 — 실측이 아니다. 기사에 쓸 때 그 사실을 밝힌다.',
      _가져온날: new Date().toISOString().slice(0, 10),
      _원본파일: fTrans, _원본인코딩: enc,
      header: rows[0],
      rows: rows.slice(1).filter((r) => r.some((c) => c)),
    }, null, 2) + '\n');
    wrote.push(`subway-transfers.json — ${rows.length - 1}행 (${enc})`);
  }

  if (!wrote.length) {
    console.error('알아본 파일이 없습니다. 파일 이름에 「역사마스터」·「역간거리」·「환승역」이 들어 있어야 합니다.');
    process.exit(1);
  }
  console.log(wrote.map((w) => `  ${w}`).join('\n'));
  console.log(`\n${OUT}/ 에 저장했습니다.\n`);
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
main();
