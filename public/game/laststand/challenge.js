// ASCEND 라스트 스탠드 · 매일 할 이유 모음 (조선좀비 대기 화면 체계를 라스트 스탠드에 맞게 옮김)
//  - 도전: 일일 도전(매일 바뀌는 변형 작전) · 주간 토벌(단계 오르기, 주간 순위) · 주간 임무(점수 상자)
//  - 작전 패스(28일 시즌, 무료 30단계) · 업적 · 정찰 보상(접속하지 않아도 쌓임) · 랭킹과 계정(클라우드 저장)
// game.js 는 건드리지 않고 window.LS 연결점만 쓴다. 저장은 LS.save.lsx 한 칸.
(function () {
  'use strict';
  const RAID_MAX = 15, DC_TRIES = 3, RAID_TRIES = 3, IDLE_MAX_H = 12, PASS_LV = 30, PASS_XP = 100, SEASON_DAYS = 28;
  const SEASON0 = new Date(2026, 10, 23); // 시즌 1 시작(월요일)
  const WR = ['N', 'A', 'R', 'SR', 'SSR', 'UQ', 'UR'], GATE = [1, 3, 8, 16, 30, 60, 120];
  const WRN = { N: '일반', A: '고급', R: '희귀', SR: '영웅', SSR: '전설', UQ: '유니크', UR: '신화' };
  let LS = null, cur = null, tab = null;

  // ───────── 날짜 ─────────
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monday = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const weekKey = (d = new Date()) => dayKey(monday(d));
  const weekNum = (d = new Date()) => Math.round((monday(d) - monday(SEASON0)) / 6048e5);
  const prevWeekKey = () => { const d = monday(); d.setDate(d.getDate() - 7); return dayKey(d); };
  const season = () => { const n = Math.floor((new Date() - SEASON0) / (SEASON_DAYS * 864e5)); const st = new Date(SEASON0); st.setDate(st.getDate() + n * SEASON_DAYS); const en = new Date(st); en.setDate(en.getDate() + SEASON_DAYS); return { n: n + 1, st, en }; };
  const leftTxt = (to) => { const ms = to - Date.now(); if (ms <= 0) return '곧 바뀜'; const h = Math.floor(ms / 36e5), d = Math.floor(h / 24); return d ? `${d}일 ${h % 24}시간` : `${h}시간 ${Math.floor(ms / 6e4) % 60}분`; };
  const nextMidnight = () => { const d = new Date(); d.setHours(24, 0, 0, 0); return d; };
  const nextMonday = () => { const d = monday(); d.setDate(d.getDate() + 7); return d; };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
  const fmtT = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, '');

  // ───────── 저장 ─────────
  const S = () => LS.save;
  function X() {
    const s = S(); const x = (s.lsx ||= {});
    x.v ||= 1; x.tot ||= { dc: 0, dcWin: 0, raid: 0, combo: 0, runs: 0 };
    const d = dayKey(), w = weekKey();
    if (!x.dc || x.dc.day !== d) { const y = new Date(); y.setDate(y.getDate() - 1); const keep = x.dc && x.dc.winDay === dayKey(y); x.dc = { day: d, n: 0, best: 0, got: {}, streak: keep ? (x.dc.streak || 0) : 0, winDay: x.dc ? x.dc.winDay : '' }; }
    if (!x.raid || x.raid.wk !== w) { if (x.raid && x.raid.best > 0 && x.raid.wk) x.raidPrev = { wk: x.raid.wk, best: x.raid.best, settled: false }; x.raid = { wk: w, best: 0, got: {}, day: '', n: 0 }; }
    if (x.raid.day !== d) { x.raid.day = d; x.raid.n = 0; }
    if (!x.wm || x.wm.wk !== w) x.wm = { wk: w, runs: 0, wins: 0, kills: 0, dc: 0, raid: 0, combo: 0, mechs: [], days: [], got: {} };
    if (!x.wm.days.includes(d)) x.wm.days.push(d);
    const sn = season().n; if (!x.pass || x.pass.s !== sn) x.pass = { s: sn, xp: 0, got: {} };
    x.ach ||= {}; x.idle ||= { t: Date.now(), quick: '' };
    return x;
  }
  const save = () => { try { LS.persist(); } catch (e) { } };

  // ───────── 보상 ─────────
  const maxG = () => { const c = S().chMax || 1; let r = 0; GATE.forEach((v, i) => { if (c >= v) r = i; }); return r; };
  const capR = (r) => WR[Math.min(WR.indexOf(r), maxG())];
  const MYI = { chal: 'u_chal', pass: 'u_pass', ach: 'u_ach', scout: 'u_scout', rank: 'u_rank', squad: 'u_squad', event: 'u_event' };
  const ic = (k) => { if (MYI[k]) return `<img class="ico ii" src="img/icon/${MYI[k]}.webp?v=1" alt="" draggable="false">`; try { return LS.ico(k); } catch (e) { return ''; } };
  function rwFix(rw) { const o = Object.assign({}, rw); if (o.wpn) o.wpn = capR(o.wpn); if (o.part) o.part = capR(o.part); return o; }
  function rwHtml(rw, cls = '') {
    const it = [];
    if (rw.gem) it.push(`<span class="lsx-rw g">${ic('gem')}<b>${fmtN(rw.gem)}</b></span>`);
    if (rw.core) it.push(`<span class="lsx-rw">${ic('core')}<b>${fmtN(rw.core)}</b></span>`);
    if (rw.ore) it.push(`<span class="lsx-rw">${ic('ore')}<b>${fmtN(rw.ore)}</b></span>`);
    if (rw.chip) it.push(`<span class="lsx-rw">${ic('chip')}<b>${fmtN(rw.chip)}</b></span>`);
    if (rw.wpn) { const r = capR(rw.wpn); it.push(`<span class="lsx-rw w" style="--rc:var(--${r === 'UQ' ? 'UR' : r === 'A' ? 'R' : r},#a7b0c2)">${ic('wpn')}<b>${WRN[r]} 무기</b></span>`); }
    if (rw.part) { const r = capR(rw.part); it.push(`<span class="lsx-rw w" style="--rc:var(--${r === 'UQ' ? 'UR' : r === 'A' ? 'R' : r},#a7b0c2)">${ic('gear')}<b>${WRN[r]} 부품</b></span>`); }
    return `<span class="lsx-rws ${cls}">${it.join('')}</span>`;
  }
  function give(rw, xp) { LS.give(rwFix(rw)); if (xp) addXp(xp); save(); }

  // ───────── 일일 도전 ─────────
  const MODS = [
    { k: 'armor', nm: '철갑 군단', ds: '적 내구 +60%', cfg: { hpMul: 1.6 } },
    { k: 'fury', nm: '맹공', ds: '받는 피해 +50%', cfg: { dmgMul: 1.5 }, hu: 1 },
    { k: 'glass', nm: '유리 대포', ds: '내 화력 +60% · 내 내구 -40%', cfg: { pDmg: 1.6, pHp: .6 }, hu: 1 },
    { k: 'norep', nm: '수리 불가', ds: '자동 수리가 멈춘다', cfg: { noRegen: true }, hu: 1 },
    { k: 'blitz', nm: '속전속결', ds: '결전이 2분 30초에 시작된다', cfg: { time: 150 }, tm: 1 },
    { k: 'over', nm: '과부하', ds: '내 화력 +30% · 적 내구 +30%', cfg: { pDmg: 1.3, hpMul: 1.3 } },
    { k: 'heavy', nm: '중장 압박', ds: '내 내구 +50% · 받는 피해 +70%', cfg: { pHp: 1.5, dmgMul: 1.7 }, hu: 1 },
    { k: 'long', nm: '장기전', ds: '결전이 6분에 시작된다 · 적 내구 -15%', cfg: { time: 360, hpMul: .85 }, tm: 1 },
  ];
  const SURV = ['생존', '야간', '제공권', '보스', '연전'];
  function dcToday() {
    const d = dayKey(), h = hash('dc' + d), C = LS.CHAPTERS, cleared = Math.max(1, Math.min(C.length, (S().chMax || 1) - 1));
    const hi = Math.max(1, cleared - 1), lo = Math.max(1, cleared - 8), cand = []; for (let n = lo; n <= hi; n++) cand.push(n);
    const pref = cand.filter((n) => SURV.includes(C[n - 1].type || '생존')), pool = pref.length ? pref : cand;
    const ch = pool[h % pool.length];
    const m1 = MODS[h % MODS.length]; let m2 = MODS[(h >>> 8) % MODS.length], k = 1;
    while (m2 === m1 || (m2.tm && m1.tm) || (m2.hu && m1.hu)) m2 = MODS[((h >>> 8) + k++) % MODS.length];
    const cfg = { hpMul: 1, dmgMul: 1, pDmg: 1, pHp: 1 };
    for (const m of [m1, m2]) for (const key in m.cfg) { if (typeof m.cfg[key] === 'number' && cfg[key] != null) cfg[key] *= m.cfg[key]; else cfg[key] = m.cfg[key]; }
    const ELS = ['fire', 'water', 'wind', 'elec', 'ice', 'light', 'dark'], el = ELS[(h >>> 16) % ELS.length];
    return { d, ch, mods: [m1, m2], cfg, el, th: C[ch - 1].th || 1 };
  }
  const EL_NM = { fire: '불', water: '물', wind: '바람', elec: '전기', ice: '얼음', light: '빛', dark: '어둠' };
  const dcOpen = () => (S().chMax || 1) >= 3;
  const dcRw = (ch) => { const k = weekend() ? 2 : 1; return { join: { core: (150 + 15 * ch) * k }, win: { gem: 40 * k, ore: 3 * k }, perfect: { gem: 30 * k, chip: 3 * k } }; };
  function dcStart() {
    const x = X(); if (!dcOpen()) return LS.toast('2장을 깨면 열립니다');
    if (x.dc.n >= DC_TRIES) return LS.toast('오늘 도전을 모두 했습니다. 내일 다시 오세요');
    const T = dcToday(), mech = S().mech, m = LS.MECHS.find((q) => q.id === mech), elB = m && m.el === T.el;
    const cfg = Object.assign({}, T.cfg, { ch: T.ch, label: '일일 도전', kind: 'dc', threat: T.th });
    if (elB) cfg.pDmg = (cfg.pDmg || 1) * 1.2;
    x.dc.n++; save(); closeS();
    if (!LS.startChallenge(cfg)) { x.dc.n--; save(); LS.toast('지금은 출격할 수 없습니다'); }
  }

  // ───────── 주간 토벌 ─────────
  const raidOpen = () => (S().chMax || 1) >= 5;
  const bossChs = () => LS.CHAPTERS.map((c, i) => (c.n === 4 ? i + 1 : 0)).filter(Boolean);
  const raidCh = () => { const L = bossChs(); return L[((weekNum() % L.length) + L.length) % L.length]; };
  const raidTh = (k) => 1.6 + .9 * (k - 1);
  function raidRw(k) {
    const r = { gem: 20 + 8 * k, core: 250 * k, ore: 2 + k, chip: 1 + Math.floor(k / 2) };
    if (k === 5) r.part = 'SR'; if (k === 10) r.part = 'SSR'; if (k === 15) r.wpn = 'SSR';
    return r;
  }
  function raidStart(k) {
    const x = X(); if (!raidOpen()) return LS.toast('1막을 끝내면 열립니다');
    if (x.raid.n >= RAID_TRIES) return LS.toast('오늘 토벌을 모두 했습니다. 내일 다시 오세요');
    k = Math.max(1, Math.min(RAID_MAX, k || x.raid.best + 1));
    const cfg = { ch: raidCh(), label: `주간 토벌 ${k}단계`, kind: 'raid', stage: k, threat: raidTh(k), hpMul: 1 + .05 * (k - 1), time: 150 };
    x.raid.n++; save(); closeS();
    if (!LS.startChallenge(cfg)) { x.raid.n--; save(); LS.toast('지금은 출격할 수 없습니다'); }
  }

  // ───────── 주간 임무 ─────────
  const WM = [
    { k: 'runs', n: 15, pt: 15, t: '출격 15판' }, { k: 'wins', n: 8, pt: 15, t: '임무 완료 8판' },
    { k: 'kills', n: 3000, pt: 15, t: '적 3,000기 격파' }, { k: 'dc', n: 5, pt: 15, t: '일일 도전 5번' },
    { k: 'raid', n: 3, pt: 10, t: '주간 토벌 3번' }, { k: 'days', n: 5, pt: 10, t: '5일 접속' },
    { k: 'combo', n: 3, pt: 10, t: '콤보 100 이상 3판' }, { k: 'mechs', n: 4, pt: 10, t: '서로 다른 기체 4대로 출격' },
  ];
  const WCH = [{ p: 30, rw: { gem: 100, core: 1500 } }, { p: 60, rw: { gem: 150, ore: 20, chip: 10 } }, { p: 100, rw: { gem: 300, part: 'SSR', wpn: 'SR' } }];
  const wmVal = (m, w) => (m.k === 'days' ? w.days.length : m.k === 'mechs' ? w.mechs.length : w[m.k] || 0);
  const wmPts = () => { const w = X().wm; return WM.reduce((a, m) => a + (wmVal(m, w) >= m.n ? m.pt : 0), 0); };
  const wmDot = () => { const w = X().wm, p = wmPts(); return WCH.some((c, i) => p >= c.p && !w.got[i]); };

  // ───────── 작전 패스 ─────────
  function passRw(i) { // i: 0..29 (단계 1..30)
    const lv = i + 1;
    if (lv === 30) return { gem: 500, wpn: 'SSR' };
    if (lv % 10 === 0) return { gem: 200, part: 'SSR' };
    if (lv % 5 === 0) return { gem: 120, part: 'SR' };
    return [{ core: 800 + lv * 40 }, { gem: 40 }, { ore: 8 + Math.floor(lv / 3) }, { chip: 5 + Math.floor(lv / 4) }][lv % 4];
  }
  function addXp(v) { const x = X(); x.pass.xp = Math.min(PASS_LV * PASS_XP, x.pass.xp + Math.round(v * (weekend() ? 1.5 : 1))); }
  const passLv = () => Math.floor(X().pass.xp / PASS_XP);
  const passDot = () => { const x = X(), lv = passLv(); for (let i = 0; i < lv; i++) if (!x.pass.got[i]) return true; return false; };

  // ───────── 업적 ─────────
  const starSum = () => Object.values(S().stars || {}).reduce((a, b) => a + (b || 0), 0);
  const ACH = [
    { id: 'runs', nm: '출격 횟수', ds: (n) => `${n}판 출격`, v: () => (S().stat || {}).runs || 0, t: [10, 50, 200, 500], g: [30, 80, 150, 300] },
    { id: 'wins', nm: '임무 완료', ds: (n) => `${n}판 임무 완료`, v: () => (S().stat || {}).wins || 0, t: [5, 30, 100, 300], g: [30, 80, 150, 300] },
    { id: 'kills', nm: '격파 기록', ds: (n) => `적 ${fmtN(n)}기 격파`, v: () => (S().stat || {}).kills || 0, t: [1000, 10000, 50000, 200000], g: [30, 80, 150, 300] },
    { id: 'prog', nm: '작전 진행', ds: (n) => `${n}장 돌파`, v: () => Math.max(0, (S().chMax || 1) - 1), t: [4, 24, 48, 72, 120, 240], g: [50, 150, 200, 250, 300, 500] },
    { id: 'stars', nm: '별 모으기', ds: (n) => `별 ${n}개`, v: starSum, t: [12, 60, 150, 300, 720], g: [30, 80, 150, 250, 500] },
    { id: 'own', nm: '격납고', ds: (n) => `기체 ${n}대 보유`, v: () => Object.keys(S().own || {}).filter((k) => S().own[k]).length, t: [5, 8, 12, 16, 19], g: [50, 100, 150, 250, 500] },
    { id: 'lv', nm: '지휘관 레벨', ds: (n) => `계정 레벨 ${n}`, v: () => (S().acc || {}).lv || 1, t: [5, 10, 20, 30, 50], g: [30, 60, 120, 200, 400] },
    { id: 'dc', nm: '일일 도전', ds: (n) => `일일 도전 ${n}번 승리`, v: () => X().tot.dcWin || 0, t: [3, 10, 30, 100], g: [40, 80, 150, 300] },
    { id: 'raid', nm: '주간 토벌', ds: (n) => `토벌 ${n}단계 돌파(한 주 최고)`, v: () => X().tot.raidBest || 0, t: [3, 5, 10, 15], g: [40, 80, 200, 400] },
    { id: 'combo', nm: '연속 격파', ds: (n) => `최고 콤보 ${n}`, v: () => X().tot.combo || 0, t: [50, 100, 200, 400], g: [30, 60, 120, 250] },
  ];
  const achTier = (a) => X().ach[a.id] || 0; // 받은 단계 수
  const achReady = (a) => { const t = achTier(a); return t < a.t.length && a.v() >= a.t[t]; };
  const achDot = () => ACH.some(achReady);

  // ───────── 정찰 보상 ─────────
  function idle() { const x = X(), ms = Math.min(IDLE_MAX_H * 36e5, Date.now() - x.idle.t), h = ms / 36e5, c = Math.max(1, (S().chMax || 1) - 1);
    return { ms, h, core: Math.floor(h * (50 + 10 * c)), ore: Math.floor(h * (.4 + c / 60)), chip: Math.floor(h * (.25 + c / 90)), gem: Math.floor(h * 2) }; }
  const idleDot = () => idle().h >= 1;

  // ───────── 판이 끝날 때 ─────────
  function onRunEnd(d) {
    const x = X(), w = x.wm, chal = d.chal || null, kind = chal && chal.kind;
    w.runs++; if (d.won) w.wins++; w.kills += d.kills || 0; if ((d.maxCombo || 0) >= 100) w.combo++; if (d.mech && !w.mechs.includes(d.mech)) w.mechs.push(d.mech);
    { const rc = raceSt(); if (rc.id) { rc.k += d.kills || 0; postScore('lsrace-' + rc.id, rc.k); } }
    x.tot.runs++; x.tot.combo = Math.max(x.tot.combo || 0, d.maxCombo || 0);
    let xp = 15 + (d.won ? 15 : 0), html = '';
    if (kind === 'dc') {
      w.dc++; x.tot.dc++; xp += 25; const T = dcToday(), R = dcRw(T.ch), got = [], perfect = d.won && (d.hpPct == null ? true : d.hpPct >= .5);
      const sc = Math.round((d.kills || 0) * 10 + (d.t || 0) * 4 + (d.won ? 3000 : 0) + (d.maxCombo || 0) * 15 + (d.won ? (d.hpPct || 0) * 1000 : 0));
      const nb = sc > x.dc.best; x.dc.best = Math.max(x.dc.best, sc);
      if (!x.dc.got.join) { x.dc.got.join = 1; give(R.join); got.push(['참여 보상', R.join]); }
      if (d.won && !x.dc.got.win) { x.dc.got.win = 1; give(R.win); got.push(['승리 보상', R.win]); x.tot.dcWin++; }
      if (perfect && !x.dc.got.perfect) { x.dc.got.perfect = 1; give(R.perfect); got.push(['완벽 보상(내구 50% 이상)', R.perfect]); }
      if (d.won && x.dc.winDay !== x.dc.day) { x.dc.winDay = x.dc.day; x.dc.streak = (x.dc.streak || 0) + 1; if (x.dc.streak % 7 === 0) { const b = { gem: 150, part: 'SR' }; give(b); got.push([`연속 ${x.dc.streak}일 승리`, b]); } }
      html = `<div class="lsx-ovh"><b>일일 도전 ${fmtN(sc)}점</b>${nb ? '<em>오늘 최고</em>' : ''}<small>남은 도전 ${Math.max(0, DC_TRIES - x.dc.n)}번 · 연속 승리 ${x.dc.streak || 0}일</small></div>` + (got.length ? `<div class="lsx-ovr">${got.map(([t, r]) => `<span>${t}</span>${rwHtml(r)}`).join('')}</div>` : '');
      postScore('lsdc-' + x.dc.day, x.dc.best);
    } else if (kind === 'raid') {
      w.raid++; x.tot.raid++; xp += 25; const k = chal.stage || 1; let got = null;
      if (d.won) { if (k > x.raid.best) x.raid.best = k; x.tot.raidBest = Math.max(x.tot.raidBest || 0, x.raid.best); if (!x.raid.got[k]) { x.raid.got[k] = 1; got = raidRw(k); give(got); } }
      html = `<div class="lsx-ovh"><b>주간 토벌 ${k}단계 ${d.won ? '돌파' : '실패'}</b><small>이번 주 최고 ${x.raid.best}단계 · 남은 토벌 ${Math.max(0, RAID_TRIES - x.raid.n)}번</small></div>` + (got ? `<div class="lsx-ovr"><span>${k}단계 첫 돌파</span>${rwHtml(got)}</div>` : '');
      if (x.raid.best) postScore('lsraid-' + x.raid.wk, x.raid.best * 1000 + Math.min(999, d.kills || 0));
    }
    addXp(xp); save();
    try { const so = X().so; if (so && so.guild && user()) put('lsgw-' + w.wk, so.guild.id, w.kills || 0).catch(() => { }); } catch (e) { }
    postScore('lsprog', Math.max(0, (S().chMax || 1) - 1) * 1000 + starSum());
    const box = document.getElementById('lsxOver');
    if (box) {
      box.innerHTML = chal ? html : '';
    }
    let bb = document.getElementById('lsxBackC'); const ob = document.getElementById('ovBtns');
    if (chal && ob) { if (!bb) { bb = el('button', { id: 'lsxBackC', class: 'go' }, '도전 화면으로'); ob.insertBefore(bb, ob.firstChild); } bb.onclick = () => { const t = document.getElementById('toTitle'); if (t) t.click(); setTimeout(() => openS('chal', kind === 'raid' ? 'raid' : 'dc'), 250); }; }
    else if (bb) bb.remove();
    drawBar();
  }

  // ───────── 계정 · 순위 ─────────
  const onSite = () => /(^|\.)hankuk-in\.com$/.test(location.hostname);
  function loadAccount() { try { if (!onSite() || document.querySelector('script[src*="/game/account.js"]')) return; const s = document.createElement('script'); s.type = 'module'; s.src = '/game/account.js'; s.dataset.game = 'laststand'; s.dataset.prefix = 'ascend-laststand-v1'; document.head.appendChild(s); } catch (e) { } }
  const A = () => { const a = window.HKAccount; return a && !a.disabled ? a : null; };
  const user = () => { const a = A(); return a ? a.user : null; };
  const myName = () => { const u = user(), n = (S().acc || {}).name; return String(n || (u && (u.displayName || (u.email || '').split('@')[0])) || '파일럿').replace(/[|<>&"]/g, '').slice(0, 20); };
  function postScore(board, score) { try { const a = A(); if (a && a.user && score > 0) a.submitScore(board, score, myName()).catch(() => { }); } catch (e) { } }
  async function googleLogin() {
    if (!A()) return LS.toast('hankuk-in.com 에서 열어야 로그인할 수 있습니다');
    try {
      const appM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const authM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const app = appM.getApps()[0]; if (!app) return LS.toast('계정 연결을 준비 중입니다. 잠시 뒤 다시 눌러 주세요');
      const auth = authM.getAuth(app), pv = new authM.GoogleAuthProvider(); pv.setCustomParameters({ prompt: 'select_account' });
      try { await authM.signInWithPopup(auth, pv); LS.toast('구글 계정으로 로그인했습니다'); }
      catch (e) { const c = String((e && e.code) || e); if (/popup-blocked|operation-not-supported/.test(c)) return authM.signInWithRedirect(auth, pv); if (/popup-closed|cancelled-popup/.test(c)) return; LS.toast('로그인하지 못했습니다: ' + c.replace('auth/', '')); }
    } catch (e) { LS.toast('로그인 모듈을 불러오지 못했습니다'); }
  }
  const RK_RAID = [[1, 1, 1000], [2, 3, 600], [4, 10, 300], [11, 50, 150], [51, 1e9, 50]];
  async function settleRaid() {
    const x = X(), p = x.raidPrev, a = A(); if (!p || p.settled || !a || !a.user || !a.topScores) return;
    try { const L = await a.topScores('lsraid-' + p.wk, 300); const i = L.findIndex((e) => e.uid === a.user.uid || e.id === a.user.uid), rk = i + 1;
      const row = RK_RAID.find((r) => rk && rk >= r[0] && rk <= r[1]) || RK_RAID[4]; p.settled = true; save();
      LS.mail('주간 토벌 순위 보상', `지난주(${p.wk} 주) 주간 토벌 최고 ${p.best}단계${rk ? ` · 순위 ${rk}위` : ''}. 수고했습니다.`, { gem: row[2] }); LS.toast('주간 토벌 순위 보상이 우편함에 도착했습니다');
    } catch (e) { }
  }

  // ───────── 부대 · 친구 (조선좀비 문파·친구와 같은 방식, HANKUKIN 계정 Firestore) ─────────
  // leaderboards/{보드}/entries/{내 uid} 에 내 줄만 쓰고 누구나 읽는다. 보드 이름(ls = Last Stand):
  //  lsp 공개 정보(score=레벨*1e6+돌파장*1000+별) · lsc-{코드} 친구 코드 주인 · lsf-{상대uid} 친구 신청(1)/수락(2)
  //  lsg-{상대uid}-{날} 보급 선물 · lsi-{초대자코드} 초대받아 들어온 사람
  //  lsguilds 부대 목록(문장*1000+인원, 0=해산) · lsgm-{부대} 대원 · lsgk-{부대}-{uid} 강퇴 · lsga-{부대}-{날} 출석 · lsgw-{주} 주간 공헌(name=부대, score=격파)
  const GCOST = 5000, G_MAX = 20, FR_MAX = 30, GIFT_MAX = 10, GIFT = { core: 300, gem: 5 };
  const GEMB = ['fire', 'water', 'wind', 'elec', 'ice', 'light', 'dark'];
  const GGOAL = [{ n: 20000, rw: { gem: 100, core: 3000 } }, { n: 60000, rw: { gem: 200, ore: 30, chip: 15 } }, { n: 150000, rw: { gem: 400, part: 'SSR' } }];
  const FB = { db: null, fs: null };
  async function fb() { if (FB.db) return FB; const appM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'); const fsM = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'); const app = appM.getApps()[0]; if (!app) throw new Error('noapp'); FB.fs = fsM; FB.db = fsM.getFirestore(app); return FB; }
  const nm20 = (s) => String(s || '파일럿').replace(/[|<>&"]/g, '').slice(0, 20);
  async function put(board, name, score) { const u = user(); if (!u) throw new Error('login'); const { fs: F, db } = await fb(); await F.setDoc(F.doc(db, 'leaderboards', board, 'entries', u.uid), { name: nm20(name), score: Math.max(0, Math.min(99999999, Math.floor(score) || 0)), at: Date.now() }); }
  async function getE(board, uid) { if (!uid) return null; const { fs: F, db } = await fb(); const s = await F.getDoc(F.doc(db, 'leaderboards', board, 'entries', uid)); return s.exists() ? Object.assign({ id: uid }, s.data()) : null; }
  async function list(board, n) { const { fs: F, db } = await fb(); const qs = await F.getDocs(F.query(F.collection(db, 'leaderboards', board, 'entries'), F.limit(n || 100))); const out = []; qs.forEach((d) => out.push(Object.assign({ id: d.id }, d.data()))); return out; }
  const myVal = () => ((S().acc || {}).lv || 1) * 1e6 + Math.min(999, Math.max(0, (S().chMax || 1) - 1)) * 1000 + Math.min(999, starSum());
  const lvOf = (v) => Math.floor((v || 0) / 1e6), chOf = (v) => Math.floor(((v || 0) % 1e6) / 1000), stOf = (v) => (v || 0) % 1000;
  const ago = (t) => { if (!t) return '-'; const m = Math.floor((Date.now() - t) / 6e4); return m < 5 ? '접속 중' : m < 60 ? m + '분 전' : m < 1440 ? Math.floor(m / 60) + '시간 전' : Math.floor(m / 1440) + '일 전'; };
  const newCode = () => Math.random().toString(36).slice(2, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(6, 'Q');
  function SO() { const x = X(); const o = (x.so ||= {}); o.code ||= newCode(); o.fr ||= { list: {}, sent: {}, rej: {} }; const d = dayKey(); if (o.gotDay !== d) { o.gotDay = d; o.gotN = 0; o.got = {}; } if (o.giftDay !== d) { o.giftDay = d; o.giftTo = {}; } return o; }
  let soErr = '';
  async function soReady() {
    if (!A()) return onSite() ? 'wait' : 'offline'; const u = user(); if (!u) return 'login';
    const o = SO();
    try {
      await put('lsp', myName(), myVal());
      if (o.codeOk && o.codeOk !== u.uid) { o.codeOk = null; o.code = newCode(); }
      if (!o.codeOk) { for (let i = 0; i < 5; i++) { const ex = (await list('lsc-' + o.code, 3)).filter((r) => r.id !== u.uid); if (!ex.length) { await put('lsc-' + o.code, myName(), 1); o.codeOk = u.uid; break; } o.code = newCode(); } save(); }
      await inviteSettle();
      if (o.guild) { await put('lsgm-' + o.guild.id, myName(), myVal()); await put('lsgw-' + X().wm.wk, o.guild.id, X().wm.kills || 0); }
      return 'ok';
    } catch (e) { soErr = String((e && e.code) || e); console.warn('[lsx social]', e); return 'err'; }
  }
  async function codeOwner(code) { const L = (await list('lsc-' + code, 5)).sort((a, b) => (a.at || 0) - (b.at || 0)); return L[0] ? L[0].id : null; }
  async function inviteSettle() {
    const o = SO(), me = user().uid;
    if (o.ref && !o.refDone && o.ref !== o.code) { const inv = await codeOwner(o.ref); if (inv && inv !== me) { await put('lsi-' + o.ref, myName(), 1); await put('lsf-' + inv, myName(), 2); o.fr.list[inv] = 1; give({ gem: 100, core: 2000 }); LS.mail('초대 환영 보급', '친구의 초대로 합류했습니다. 초대한 친구와 자동으로 친구가 되었습니다.', {}); LS.toast('초대 환영 보급 · 결정 100 · 코어 2,000'); } o.refDone = 1; save(); }
    if (o.codeOk) { const L = (await list('lsi-' + o.code, 40)).filter((r) => r.id !== me); let add = 0; o.invSeen ||= {}; for (const r of L) { if (o.invSeen[r.id]) continue; o.invSeen[r.id] = 1; o.fr.list[r.id] = 1; if ((o.invN || 0) < 10) { o.invN = (o.invN || 0) + 1; add++; } } if (add) { give({ gem: 100 * add, core: 1000 * add }); LS.toast(`초대한 친구 ${add}명 합류 · 결정 ${100 * add}`); } save(); }
  }
  const loginCard = (why) => `<div class="lsx-card"><div class="k">로그인이 필요합니다</div><p>구글로 로그인하면 ${why} (조선좀비·ASCEND와 같은 계정)</p><div class="lsx-row"><button class="lsx-btn" data-a="gl">구글로 로그인</button><button class="lsx-btn dk" data-a="el">이메일로 로그인</button></div></div>`;
  const stBox = (st, why) => (st === 'offline' ? `<div class="lsx-card"><p>hankuk-in.com 에서 열면 부대와 친구를 쓸 수 있습니다.</p></div>` : st === 'wait' ? `<div class="lsx-card"><p>계정 연결을 준비하고 있습니다. 잠시 뒤 다시 열어 주세요.</p></div>` : st === 'login' ? loginCard(why) : `<div class="lsx-card"><p>서버에 연결하지 못했습니다. 잠시 뒤 다시 열어 주세요. (${esc(soErr.replace('firestore/', ''))})</p></div>`);
  const emb = (i) => `<span class="lsx-emb">${ic('el_' + GEMB[(i | 0) % GEMB.length])}</span>`;
  const memRow = (m, extra, right) => `<div class="lsx-it"><span class="lsx-av">${esc((m.name || '?')[0])}</span><div class="tx"><b>${esc(m.name || '알 수 없음')}${extra || ''}</b><small>Lv ${lvOf(m.score)} · ${chOf(m.score)}장 돌파 · 별 ${stOf(m.score)} · ${ago(m.at)}</small></div>${right || ''}</div>`;

  async function guildMembers(g) {
    const rows = (await list('lsgm-' + g.id, 60)).filter((r) => r.score > 0), kicked = {};
    await Promise.all(rows.map(async (r) => { if (r.id === g.owner) return; try { if (await getE('lsgk-' + g.id + '-' + r.id, g.owner)) kicked[r.id] = 1; } catch (e) { } }));
    return rows.filter((r) => !kicked[r.id]);
  }
  async function vSquad(box, t) {
    const st = await soReady(); if (!box.isConnected || tab !== t) return;
    if (st !== 'ok') { box.innerHTML = stBox(st, t === 'friend' ? '친구 코드로 친구를 맺고 날마다 보급을 주고받을 수 있습니다.' : '부대를 세우거나 들어가 대원과 함께 출석 보상과 주간 공헌 목표, 부대 순위를 겨룰 수 있습니다.'); return bindActs(box); }
    const o = SO(), me = user().uid, wk = X().wm.wk;
    if (t === 'friend') return vFriend(box, o, me);
    if (o.guild && t === 'mine') {
      if (o.guild.owner !== me && await getE('lsgk-' + o.guild.id + '-' + me, o.guild.owner)) { o.guild = null; save(); LS.toast('부대에서 내보내졌습니다'); tab = 'find'; return render(); }
      if (o.guild.owner !== me) { const gl = await getE('lsguilds', o.guild.owner); if (gl && gl.score === 0) { o.guild = null; save(); LS.toast('부대가 해산되었습니다'); tab = 'find'; return render(); } }
    }
    if (t === 'mine' && !o.guild) { tab = 'find'; return render(); }
    if (t === 'mine') {
      const g = o.guild, mem = await guildMembers(g), d = dayKey(), att = await list('lsga-' + g.id + '-' + d, 60), attIds = new Set(att.map((a) => a.id).filter((id) => mem.some((m) => m.id === id)));
      const wkl = (await list('lsgw-' + wk, 500)).filter((r) => r.name === g.id && mem.some((m) => m.id === r.id)), wsum = wkl.reduce((s, r) => s + (r.score || 0), 0);
      if (g.owner === me) { try { await put('lsguilds', g.id, (g.emb | 0) * 1000 + Math.min(G_MAX, mem.length)); } catch (e) { } }
      if (!box.isConnected || tab !== t) return;
      o.gGoal ||= {}; if (o.gGoal.wk !== wk) o.gGoal = { wk, got: {} };
      const did = attIds.has(me), claimed = o.gAttGot === d, n = attIds.size;
      const goals = GGOAL.map((q, i) => { const ok = wsum >= q.n, got = o.gGoal.got[i]; return `<div class="${ok ? 'ok' : ''}"><b>대원 격파 ${fmtN(q.n)}</b>${rwHtml(q.rw)}<button class="lsx-btn" data-a="gGoal" data-v="${i}|${wsum}" ${ok && !got ? '' : 'disabled'}>${got ? '받음' : ok ? '받기' : `${fmtN(q.n - wsum)} 남음`}</button></div>`; }).join('');
      box.innerHTML = `<div class="lsx-card"><div class="lsx-row">${emb(g.emb)}<div><div class="k">내 부대${g.owner === me ? ' · 부대장' : ''}</div><h4>${esc(g.id)}</h4><p>대원 ${mem.length}/${G_MAX} · 이번 주 공헌 ${fmtN(wsum)}기 격파</p></div><span class="lsx-sp"></span><button class="lsx-btn dk" data-a="gLeave">${g.owner === me ? '부대 해산' : '탈퇴'}</button></div></div>
        <div class="lsx-card"><div class="lsx-row"><div><div class="k">부대 출석 ${n}/${mem.length}</div><p>출석한 대원이 많을수록 모두의 보상이 커집니다 (코어 200 × 출석 인원, 5명 이상이면 결정 20 추가).</p></div><span class="lsx-sp"></span>${!did ? '<button class="go lsx-go" data-a="gAtt">출석</button>' : claimed ? '<button class="lsx-btn dk" disabled>받음</button>' : '<button class="go lsx-go" data-a="gAttGet">보상 받기</button>'}</div></div>
        <div class="lsx-card"><div class="k">주간 공동 목표 · 대원 모두의 격파 합계 · 바뀌기까지 ${leftTxt(nextMonday())}</div><div class="lsx-chest" style="margin-top:8px">${goals}</div></div>
        <div class="lsx-card"><div class="k">대원</div><div class="lsx-list" style="margin-top:8px">${mem.sort((a, b) => b.score - a.score).map((m) => { const w = wkl.find((r) => r.id === m.id); return memRow(m, `${m.id === g.owner ? ' <span class="lsx-pill on">부대장</span>' : ''}${attIds.has(m.id) ? ' <span class="lsx-pill">출석</span>' : ''}`, `<small style="color:var(--tx2)">이번 주 ${fmtN((w && w.score) || 0)}기</small>${g.owner === me && m.id !== me ? `<button class="lsx-btn dk" data-a="gKick" data-v="${m.id}">내보내기</button>` : ''}`); }).join('')}</div></div>`;
      return bindActs(box);
    }
    const all = (await list('lsguilds', 200)).filter((g) => g.score > 0);
    if (t === 'rank') {
      const wl = await list('lsgw-' + wk, 500), sum = {}; for (const r of wl) if (all.some((g) => g.name === r.name)) sum[r.name] = (sum[r.name] || 0) + (r.score || 0);
      const R = Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 30); if (!box.isConnected || tab !== t) return;
      box.innerHTML = `<div class="lsx-card"><div class="k">부대 주간 순위 · ${wk} 주 · 대원 격파 합계</div><div class="lsx-list" style="margin-top:8px">${R.length ? R.map(([n, v], i) => { const g = all.find((x) => x.name === n); return `<div class="lsx-rk ${o.guild && o.guild.id === n ? 'me' : ''}"><b>${i + 1}</b>${emb(g ? Math.floor(g.score / 1000) : 0)}<span>${esc(n)}</span><em>${fmtN(v)}기</em></div>`; }).join('') : '<p>아직 이번 주 기록이 없습니다.</p>'}</div></div>`;
      return bindActs(box);
    }
    const q = o.gq || '', L = all.filter((g) => !q || String(g.name).includes(q)).sort((a, b) => (b.score % 1000) - (a.score % 1000)).slice(0, 40);
    if (!box.isConnected || tab !== t) return;
    box.innerHTML = `<div class="lsx-card"><div class="lsx-row"><input class="lsx-in" id="lsxGq" maxlength="12" placeholder="부대 이름 검색" value="${esc(q)}"><button class="lsx-btn dk" data-a="gFind">검색</button></div>
      <div class="lsx-list" style="margin-top:8px">${L.length ? L.map((g) => `<div class="lsx-it">${emb(Math.floor(g.score / 1000))}<div class="tx"><b>${esc(g.name)}</b><small>대원 ${g.score % 1000}/${G_MAX} · ${ago(g.at)}</small></div>${o.guild ? '' : `<button class="lsx-btn" data-a="gJoin" data-v="${esc(g.name)}|${g.id}" ${g.score % 1000 >= G_MAX ? 'disabled' : ''}>가입</button>`}</div>`).join('') : '<p>부대가 없습니다. 첫 부대를 세워 보세요.</p>'}</div></div>`
      + (o.guild ? '' : `<div class="lsx-card"><div class="k">부대 세우기 · 코어 ${fmtN(GCOST)}</div><div class="lsx-row" style="margin:8px 0">${GEMB.map((e, i) => `<button class="lsx-embb ${(o.gemb | 0) === i ? 'on' : ''}" data-a="gEmb" data-v="${i}">${ic('el_' + e)}</button>`).join('')}</div><div class="lsx-row"><input class="lsx-in" id="lsxGn" maxlength="12" placeholder="부대 이름 2~12자"><button class="lsx-btn" data-a="gMake">세우기</button></div></div>`);
    return bindActs(box);
  }
  async function vFriend(box, o, me) {
    let inbox = []; try { inbox = await list('lsf-' + me, 100); } catch (e) { soErr = String(e.code || e); box.innerHTML = stBox('err'); return; }
    for (const r of inbox) if (r.score === 2 && (o.fr.sent[r.id] || !o.fr.list[r.id])) { o.fr.list[r.id] = 1; delete o.fr.sent[r.id]; }
    const reqs = inbox.filter((r) => r.score === 1 && !o.fr.list[r.id] && !o.fr.rej[r.id]), ids = Object.keys(o.fr.list).slice(0, FR_MAX), d = dayKey(); save();
    const prof = {}, gifts = {}; await Promise.all(ids.map(async (id) => { try { prof[id] = await getE('lsp', id); } catch (e) { } try { gifts[id] = await getE('lsg-' + me + '-' + d, id); } catch (e) { } }));
    if (!box.isConnected || tab !== 'friend') return;
    const link = `${location.origin}/game/laststand/?ref=${o.code}`;
    const rows = ids.map((id) => { const p = prof[id] || { name: '?' }, g = gifts[id], got = o.got[id], sent = o.giftTo[id];
      return memRow(p, '', `${g && !got ? `<button class="lsx-btn" data-a="frTake" data-v="${id}">보급 받기</button>` : ''}<button class="lsx-btn ${sent ? 'dk' : ''}" data-a="frGift" data-v="${id}" ${sent ? 'disabled' : ''}>${sent ? '보냄' : '보급 보내기'}</button>`); }).join('');
    box.innerHTML = `<div class="lsx-card"><div class="lsx-row"><div><div class="k">내 친구 코드</div><span class="lsx-big" style="letter-spacing:4px">${o.code}</span></div><span class="lsx-sp"></span><input class="lsx-in" id="lsxFc" maxlength="6" placeholder="친구 코드 6자리" style="max-width:170px;text-transform:uppercase"><button class="lsx-btn" data-a="frAdd">친구 신청</button></div>
      <p>친구에게 하루 한 번 보급(코어 ${GIFT.core} · 결정 ${GIFT.gem})을 보낼 수 있고, 하루 ${GIFT_MAX}번까지 받을 수 있습니다.</p></div>
      <div class="lsx-card"><div class="lsx-row"><div><div class="k">친구 초대</div><p>이 주소로 들어와 로그인한 친구는 결정 100 · 코어 2,000을 받고, 나도 한 명마다 결정 100 · 코어 1,000을 받습니다(10명까지). 초대한 친구와는 자동으로 친구가 됩니다. 지금까지 ${o.invN || 0}명.</p></div><span class="lsx-sp"></span><button class="lsx-btn" data-a="frLink" data-v="${esc(link)}">초대 주소 복사</button></div></div>
      ${reqs.length ? `<div class="lsx-card"><div class="k">받은 신청 ${reqs.length}</div><div class="lsx-list" style="margin-top:8px">${reqs.map((r) => `<div class="lsx-it"><span class="lsx-av">${esc((r.name || '?')[0])}</span><div class="tx"><b>${esc(r.name)}</b><small>${ago(r.at)}</small></div><button class="lsx-btn" data-a="frOk" data-v="${r.id}">수락</button><button class="lsx-btn dk" data-a="frNo" data-v="${r.id}">거절</button></div>`).join('')}</div></div>` : ''}
      <div class="lsx-card"><div class="k">친구 ${ids.length}/${FR_MAX} · 오늘 받은 보급 ${o.gotN}/${GIFT_MAX}</div><div class="lsx-list" style="margin-top:8px">${rows || '<p>아직 친구가 없습니다. 친구 코드나 초대 주소를 주고받아 보세요.</p>'}</div></div>`;
    bindActs(box);
  }
  async function soAct(a, v) {
    const o = SO(), u = user(); if (!u) return; const me = u.uid;
    try {
      if (a === 'frAdd') { const code = ((document.getElementById('lsxFc') || {}).value || '').trim().toUpperCase(); if (code.length < 4) return LS.toast('친구 코드를 넣어 주세요'); if (code === o.code) return LS.toast('내 코드입니다');
        const id = await codeOwner(code); if (!id) return LS.toast('없는 친구 코드입니다'); if (id === me) return LS.toast('내 코드입니다'); if (o.fr.list[id]) return LS.toast('이미 친구입니다'); if (Object.keys(o.fr.list).length >= FR_MAX) return LS.toast(`친구는 ${FR_MAX}명까지입니다`);
        const back = await getE('lsf-' + me, id); await put('lsf-' + id, myName(), back ? 2 : 1); if (back) { o.fr.list[id] = 1; LS.toast('친구가 되었습니다'); } else { o.fr.sent[id] = 1; LS.toast('친구 신청을 보냈습니다'); } }
      else if (a === 'frOk') { if (Object.keys(o.fr.list).length >= FR_MAX) return LS.toast(`친구는 ${FR_MAX}명까지입니다`); await put('lsf-' + v, myName(), 2); o.fr.list[v] = 1; LS.toast('친구가 되었습니다'); }
      else if (a === 'frNo') { o.fr.rej[v] = 1; LS.toast('신청을 거절했습니다'); }
      else if (a === 'frGift') { await put('lsg-' + v + '-' + dayKey(), myName(), 1); o.giftTo[v] = 1; LS.toast('보급을 보냈습니다'); }
      else if (a === 'frTake') { if (o.gotN >= GIFT_MAX) return LS.toast(`오늘은 ${GIFT_MAX}번까지 받을 수 있습니다`); o.got[v] = 1; o.gotN++; give(GIFT); LS.toast(`보급 받음 · 코어 ${GIFT.core} · 결정 ${GIFT.gem}`); }
      else if (a === 'frLink') { try { await navigator.clipboard.writeText(v); LS.toast('초대 주소를 복사했습니다'); } catch (e) { prompt('초대 주소', v); } return; }
      else if (a === 'gFind') { o.gq = ((document.getElementById('lsxGq') || {}).value || '').trim(); }
      else if (a === 'gEmb') { o.gemb = +v; }
      else if (a === 'gMake') { const id = String((document.getElementById('lsxGn') || {}).value || '').trim().replace(/\s+/g, ' ').replace(/[\/|<>&"#?.\[\]*~]/g, '').slice(0, 12); if (id.length < 2) return LS.toast('부대 이름은 2~12자입니다'); if ((S().core || 0) < GCOST) return LS.toast('코어가 모자랍니다');
        const taken = (await list('lsguilds', 300)).some((g) => g.name === id && g.score > 0 && g.id !== me); if (taken) return LS.toast('이미 있는 부대 이름입니다');
        const A0 = A(); if (A0 && A0.claimUnique) { const r = await A0.claimUnique('lsguild-' + id, { g: 'laststand', name: id }); if (r && !r.ok && r.reason === 'taken' && r.owner && r.owner.uid !== me) return LS.toast('이미 있는 부대 이름입니다'); }
        S().core -= GCOST; o.guild = { id, owner: me, emb: o.gemb | 0 }; save(); await put('lsguilds', id, (o.gemb | 0) * 1000 + 1); await put('lsgm-' + id, myName(), myVal()); LS.toast(`부대 「${id}」를 세웠습니다`); tab = 'mine'; }
      else if (a === 'gJoin') { const [id, owner] = String(v).split('|'); const mem = (await list('lsgm-' + id, 60)).filter((r) => r.score > 0); if (mem.length >= G_MAX) return LS.toast('대원이 가득 찼습니다'); if (await getE('lsgk-' + id + '-' + me, owner)) return LS.toast('이 부대에는 들어갈 수 없습니다');
        const gl = await getE('lsguilds', owner); o.guild = { id, owner, emb: gl ? Math.floor(gl.score / 1000) : 0 }; save(); await put('lsgm-' + id, myName(), myVal()); LS.toast(`「${id}」에 들어왔습니다`); tab = 'mine'; }
      else if (a === 'gAtt') { await put('lsga-' + o.guild.id + '-' + dayKey(), myName(), 1); LS.toast('부대 출석'); }
      else if (a === 'gAttGet') { if (o.gAttGot === dayKey()) return; const att = await list('lsga-' + o.guild.id + '-' + dayKey(), 60), n = Math.max(1, Math.min(G_MAX, att.length)); const r = { core: 200 * n }; if (n >= 5) r.gem = 20; o.gAttGot = dayKey(); give(r, 10); LS.toast(`부대 출석 보상 · 코어 ${fmtN(r.core)}${r.gem ? ' · 결정 20' : ''}`); }
      else if (a === 'gGoal') { const [i, ws] = String(v).split('|').map(Number), q = GGOAL[i]; o.gGoal ||= { wk: X().wm.wk, got: {} }; if (ws >= q.n && !o.gGoal.got[i]) { o.gGoal.got[i] = 1; give(q.rw, 30); LS.toast('주간 공동 목표 보상을 받았습니다'); } }
      else if (a === 'gKick') { if (!confirm('이 대원을 내보낼까요?')) return; await put('lsgk-' + o.guild.id + '-' + v, 'kick', 1); LS.toast('내보냈습니다'); }
      else if (a === 'gLeave') { const boss = o.guild.owner === me; if (!confirm(boss ? '부대를 해산할까요? 부대 이름은 다시 쓸 수 없습니다.' : '부대에서 나갈까요?')) return; await put('lsgm-' + o.guild.id, myName(), 0); if (boss) await put('lsguilds', o.guild.id, 0); o.guild = null; LS.toast(boss ? '부대를 해산했습니다' : '부대에서 나왔습니다'); tab = 'find'; }
      save(); render();
    } catch (e) { console.warn(e); LS.toast('실패했습니다: ' + String((e && e.code) || e).replace('firestore/', '')); }
  }
  function bindActs(box) { box.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a, b.dataset.v))); }

  // ───────── 주말 작전(이벤트): 토·일 일일 도전 보상 2배 · 패스 경험치 1.5배 ─────────
  const weekend = () => { const g = new Date().getDay(); return g === 0 || g === 6; };
  const nextWeekend = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return d; };

  // ───────── 이벤트: 한정 레이스(금~일 격파 수 경쟁) · 이달의 출석 축제 · 주말 작전 안내 ─────────
  const RACE_ST = [{ n: 500, rw: { gem: 30 } }, { n: 2000, rw: { ore: 20, chip: 10 } }, { n: 5000, rw: { gem: 80 } }, { n: 10000, rw: { core: 20000 } }, { n: 20000, rw: { gem: 200, part: 'SSR' } }];
  const RK_RACE = [[1, 1, 1000], [2, 3, 600], [4, 10, 300], [11, 50, 150], [51, 1e9, 50]];
  function raceNow() { const d = new Date(), wd = d.getDay(), back = wd === 5 ? 0 : wd === 6 ? 1 : wd === 0 ? 2 : -1;
    if (back < 0) return { on: false, next: new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((5 - wd + 7) % 7)) };
    const fr = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back); return { on: true, id: dayKey(fr), end: new Date(fr.getFullYear(), fr.getMonth(), fr.getDate() + 3) }; }
  function raceSt() { const x = X(), R = raceNow(); const c = (x.race ||= { id: '', k: 0, got: {} });
    if (c.id && (!R.on || R.id !== c.id)) { let n = 0; RACE_ST.forEach((s, i) => { if (c.k >= s.n && !c.got[i]) { LS.give(rwFix(s.rw)); n++; } }); if (n) setTimeout(() => LS.toast(`지난 레이스 단계 보상 ${n}개를 받았습니다`), 600); if (c.k > 0) x.racePrev = { id: c.id, k: c.k, settled: false }; c.id = ''; c.k = 0; c.got = {}; save(); }
    if (R.on && !c.id) { c.id = R.id; c.k = 0; c.got = {}; }
    return c; }
  const raceDot = () => { try { const c = raceSt(); return !!c.id && RACE_ST.some((s, i) => c.k >= s.n && !c.got[i]); } catch (e) { return false; } };
  async function settleRace() { const x = X(), p = x.racePrev, a = A(); if (!p || p.settled || !a || !a.user || !a.topScores) return;
    try { const L = await a.topScores('lsrace-' + p.id, 300); const i = L.findIndex((e) => e.uid === a.user.uid || e.id === a.user.uid), rk = i + 1, row = RK_RACE.find((r) => rk && rk >= r[0] && rk <= r[1]) || RK_RACE[4];
      p.settled = true; save(); LS.mail('한정 레이스 순위 보상', `지난 레이스(${p.id} 금요일 시작) 격파 ${fmtN(p.k)}기${rk ? ` · 순위 ${rk}위` : ''}.`, { gem: row[2] }); LS.toast('한정 레이스 순위 보상이 우편함에 도착했습니다'); } catch (e) { } }
  const FEST = [{ gem: 50 }, { core: 5000 }, { ore: 15, chip: 8 }, { gem: 80 }, { core: 10000 }, { ore: 25, chip: 15 }, { gem: 150, part: 'SR' }];
  const monthKey = () => 'S' + season().n;
  function festSt() { const x = X(); if (!x.fest || x.fest.m !== monthKey()) x.fest = { m: monthKey(), got: 0, last: '' }; return x.fest; }
  const festDot = () => { const f = festSt(); return f.got < 7 && f.last !== dayKey(); };
  const evDot = () => festDot() || raceDot();
  function vFest() {
    const f = festSt(), end = season().en, canGet = f.got < 7 && f.last !== dayKey();
    const cells = FEST.map((r, i) => { const got = i < f.got, now = i === f.got && canGet; return `<div class="lsx-pc ${got ? 'got' : ''} ${now ? 'ok' : ''} ${i === 6 ? 'big' : ''}"><span class="lv">${i + 1}일째</span>${rwHtml(r)}<button class="lsx-btn ${now ? '' : 'dk'}" data-a="fest" ${now ? '' : 'disabled'}>${got ? '받음' : now ? '받기' : '잠김'}</button></div>`; }).join('');
    return `<div class="lsx-card lsx-ev"><b>시즌 출석 축제</b><span>이번 시즌(4주) 안에 7일을 들르면 날마다 한 칸씩 선물을 받습니다. 남은 기간 ${leftTxt(end)}</span></div><div class="lsx-card"><div class="lsx-pass" style="grid-auto-columns:minmax(108px,1fr)">${cells}</div>${f.got >= 7 ? '<p>이번 시즌 축제 선물을 모두 받았습니다. 다음 시즌에 다시 열립니다.</p>' : ''}</div>`;
  }
  function vRace() {
    const c = raceSt(), R = raceNow();
    if (!R.on) return `<div class="lsx-card lsx-ev off"><b>한정 레이스 · 기체 사냥</b><span>매주 금요일 0시부터 일요일 밤 12시까지 열립니다. 다음 레이스까지 ${leftTxt(R.next)}</span></div><div class="lsx-card"><p>레이스 동안 모든 출격(장 진행·도전 포함)에서 격파한 적 수로 겨룹니다. 격파 수에 따라 단계 보상을 받고, 끝난 뒤 순위 보상이 우편으로 옵니다.</p><div class="lsx-list" style="margin-top:8px">${RACE_ST.map((s) => `<div class="lsx-it"><div class="tx"><b>${fmtN(s.n)}기 격파</b></div>${rwHtml(s.rw)}</div>`).join('')}</div></div>`;
    const stg = RACE_ST.map((s, i) => { const ok = c.k >= s.n, got = c.got[i]; return `<div class="lsx-it ${got ? 'done' : ''}"><div class="tx"><b>${fmtN(s.n)}기 격파</b><span class="lsx-row"><span class="lsx-bar2"><i style="width:${Math.min(1, c.k / s.n) * 100}%"></i></span><small>${fmtN(Math.min(c.k, s.n))} / ${fmtN(s.n)}</small></span></div>${rwHtml(s.rw)}<button class="lsx-btn" data-a="race" data-v="${i}" ${ok && !got ? '' : 'disabled'}>${got ? '받음' : ok ? '받기' : '진행 중'}</button></div>`; }).join('');
    return `<div class="lsx-card lsx-ev"><b>한정 레이스 진행 중</b><span>남은 시간 ${leftTxt(R.end)} · 내 기록 ${fmtN(c.k)}기 격파</span></div><div class="lsx-card"><div class="k">단계 보상</div><div class="lsx-list" style="margin-top:8px">${stg}</div></div>
      <div class="lsx-card"><div class="k">레이스 순위 · 순위 보상: 1위 결정 1,000 · 2~3위 600 · 4~10위 300 · 11~50위 150 · 참여 50 (끝난 뒤 첫 접속 때 우편)</div><div class="lsx-list" id="lsxRace" style="margin-top:8px"><p>순위를 불러오는 중…</p></div></div>`;
  }
  async function loadRace() {
    const box = () => document.getElementById('lsxRace'); if (!box()) return; const c = raceSt();
    let a = A(); for (let i = 0; i < 16 && !(a && a.topScores); i++) { await new Promise((r) => setTimeout(r, 250)); a = A(); }
    if (!box()) return; if (!a || !a.topScores) { box().innerHTML = '<p>온라인 순위표에 연결되지 않았습니다. hankuk-in.com 에서 열면 순위가 보입니다.</p>'; return; }
    if (a.user) { settleRace(); if (c.k > 0) await a.submitScore('lsrace-' + c.id, c.k, myName()).catch(() => { }); }
    let L = []; try { L = (await a.topScores('lsrace-' + c.id, 50)).filter((e) => (e.score || 0) > 0); } catch (e) { if (box()) box().innerHTML = '<p>순위를 불러오지 못했습니다.</p>'; return; }
    if (!box()) return; const me = a.user && a.user.uid;
    box().innerHTML = (L.length ? L.map((e, i) => `<div class="lsx-rk ${e.uid === me || e.id === me ? 'me' : ''}"><b>${i + 1}</b><span>${esc(e.name || '파일럿')}</span><em>${fmtN(e.score)}기</em></div>`).join('') : '<p>아직 이번 레이스 기록이 없습니다. 첫 번째가 되어 보세요.</p>') + (a.user ? '' : '<p>로그인하면 내 기록이 순위에 올라갑니다 (랭킹 화면에서 로그인).</p>');
  }
  function vWeekendEv() {
    return weekend() ? `<div class="lsx-card lsx-ev"><b>주말 작전 진행 중</b><span>일일 도전 보상 2배 · 패스 경험치 1.5배 · 남은 시간 ${leftTxt(nextMidnightOf(new Date().getDay() === 6 ? 2 : 1))}</span></div><div class="lsx-card"><div class="lsx-row"><p>지금 일일 도전에 나가면 보상이 두 배입니다.</p><span class="lsx-sp"></span><button class="go lsx-go" data-a="toDc">일일 도전으로</button></div></div>`
      : `<div class="lsx-card lsx-ev off"><b>주말 작전</b><span>토·일요일에는 일일 도전 보상 2배 · 패스 경험치 1.5배. 시작까지 ${leftTxt(nextWeekend())}</span></div>`;
  }
  const nextMidnightOf = (days) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return d; };

  // ───────── 도감: 기체 · 무기 등급 (처음 모을 때 결정) ─────────
  const CD_WIMG = { N: 'pistol', A: 'rifle', R: 'shotgun', SR: 'katana', SSR: 'rail', UQ: 'beam', UR: 'feather' };
  const CD_MECH = { N: 20, R: 40, SR: 80, SSR: 150, UR: 300 }, CD_WPN = { N: 10, A: 20, R: 30, SR: 60, SSR: 120, UQ: 200, UR: 400 };
  function cdSt() { const x = X(); const c = (x.cd ||= { m: {}, w: {}, seenW: {} }); for (const w of ((S().wpn || {}).inv || [])) if (w && w.rar) c.seenW[w.rar] = 1; return c; }
  const cdMechList = () => LS.MECHS.map((m) => ({ k: m.id, nm: m.nm, rar: m.rar, own: !!(S().own || {})[m.id], st: (S().own || {})[m.id] || 0, g: CD_MECH[m.rar] || 20 }));
  const cdWpnList = () => { const c = cdSt(); return WR.map((r) => ({ k: r, nm: `${WRN[r]} 무기`, rar: r, own: !!c.seenW[r], g: CD_WPN[r] })); };
  const cdDot = () => { const c = cdSt(); return cdMechList().some((m) => m.own && !c.m[m.k]) || cdWpnList().some((w) => w.own && !c.w[w.k]); };
  const RC = (r) => `var(--${r === 'UQ' ? 'UR' : r === 'A' ? 'R' : r},#a7b0c2)`;
  function vCodex(kind) {
    const c = cdSt(), L = kind === 'm' ? cdMechList() : cdWpnList(), have = L.filter((x) => x.own).length, ready = L.filter((x) => x.own && !c[kind][x.k]).length;
    const cells = L.map((x) => { const got = c[kind][x.k], ok = x.own && !got;
      const pic = kind === 'm' ? `<img class="lsx-cdi" src="img/${x.k}.jpg?v=15" alt="" loading="lazy" style="${x.own ? '' : 'filter:brightness(.15) grayscale(1)'}">` : `<span class="lsx-cdw" style="--rc:${RC(x.rar)};${x.own ? '' : 'filter:brightness(.2) grayscale(1)'}">${(() => { try { return LS.ico2(CD_WIMG[x.rar] || 'rifle'); } catch (e) { return ic('wpn'); } })()}</span>`;
      return `<div class="lsx-cd ${x.own ? '' : 'no'}" style="--rc:${RC(x.rar)}">${pic}<b>${x.own ? esc(x.nm) : '???'}</b>${kind === 'm' && x.own ? `<small>${'★'.repeat(x.st)}</small>` : `<small>${WRN[x.rar] || ''}</small>`}<button class="lsx-btn ${ok ? '' : 'dk'}" data-a="cd" data-v="${kind}|${x.k}" ${ok ? '' : 'disabled'}>${got ? '받음' : ok ? `${ic('gem')} ${x.g}` : '미발견'}</button></div>`; }).join('');
    return `<div class="lsx-card"><div class="lsx-row"><div><div class="k">${kind === 'm' ? '기체 도감' : '무기 도감'} · 모은 것 ${have}/${L.length}</div><p>${kind === 'm' ? '기체를 처음 얻으면 등급에 따라 결정을 받습니다.' : '무기 등급을 처음 손에 넣으면 결정을 받습니다.'}</p></div><span class="lsx-sp"></span><button class="lsx-btn" data-a="cdAll" data-v="${kind}" ${ready ? '' : 'disabled'}>모두 받기${ready ? ` (${ready})` : ''}</button></div></div><div class="lsx-cds">${cells}</div>`;
  }

  // ───────── 화면 ─────────
  const CSS = `
#lsx-bar{position:absolute;top:8px;left:186px;display:flex;gap:4px;z-index:4}
#lsx-bar .rl{width:52px;height:50px;font-size:10.5px;gap:3px}
#lsx-bar .rl .ico{font-size:21px}
#lsx-bar .lsx-tag{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);padding:1px 5px;font:900 9px var(--ff);font-style:normal;white-space:nowrap;background:linear-gradient(180deg,#ffe08a,#ff9a3a);color:#1a0f08}
#lsx-bar .rl small{position:absolute;left:0;right:0;bottom:-13px;font:800 9px var(--ff);color:var(--ac);letter-spacing:0;white-space:nowrap}
@media (min-width:1100px){#lsx-bar{left:50%;transform:translateX(-50%)}#lsx-bar .rl{width:64px;height:58px;font-size:11.5px}#lsx-bar .rl .ico{font-size:24px}}
@media (max-width:640px){#lsx-bar{position:absolute;left:8px;right:8px;top:calc(max(8px,env(safe-area-inset-top)) + 102px);justify-content:center}#lsx-bar .rl{flex:1;width:auto;height:44px;flex-direction:column;font-size:10px;clip-path:none}}
#lsxS .lsx-b{width:100%;max-width:980px;padding:14px 18px 28px;text-align:left;display:flex;flex-direction:column;gap:10px}
#lsxS .tabs .dot{position:static;display:inline-block;width:7px;height:7px;margin-left:4px;vertical-align:2px}
.lsx-card{position:relative;background:linear-gradient(180deg,#141b2aee,#0b0f19ee);box-shadow:inset 0 0 0 1px var(--ln);padding:14px 16px;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%)}
.lsx-card h4{margin:0 0 2px;font:900 17px var(--ff);display:flex;align-items:center;gap:8px}
.lsx-card .k{font:800 11px var(--ff);letter-spacing:2px;color:var(--ac)}
.lsx-card p{margin:4px 0;color:#c9d2e4;font-size:13px;line-height:1.5}
.lsx-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.lsx-sp{flex:1}
.lsx-mod{display:inline-flex;flex-direction:column;gap:1px;padding:7px 10px;background:#ffffff08;box-shadow:inset 0 0 0 1px #ff9a3a44;border-left:3px solid var(--gold2);min-width:150px}
.lsx-mod b{font-size:13px}.lsx-mod small{font-size:11.5px;color:#c9d2e4}
.lsx-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;font:800 11.5px var(--ff);background:#ffffff0c;box-shadow:inset 0 0 0 1px var(--ln2);color:#dfe6f3}
.lsx-pill.on{color:#1a0f08;background:var(--ac)}
.lsx-rws{display:inline-flex;gap:6px;flex-wrap:wrap;align-items:center}
.lsx-rw{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#00000040;box-shadow:inset 0 0 0 1px #ffffff1a;font:800 12px var(--ff)}
.lsx-rw .ico{font-size:16px}.lsx-rw.g b{color:#e9b6ff}.lsx-rw.w{box-shadow:inset 0 0 0 1px var(--rc)}.lsx-rw.w b{color:var(--rc)}
.lsx-go{padding:11px 22px!important;font-size:15px!important;letter-spacing:2px!important;margin:0!important}
.lsx-btn{padding:8px 14px;border:0;font:900 12.5px var(--ff);background:linear-gradient(180deg,#ffe08a,#ff9a3a);color:#1a0f08;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%);white-space:nowrap}
.lsx-btn:disabled{filter:grayscale(1);opacity:.4;cursor:default}
.lsx-btn.dk{background:#1b2336;color:#dfe6f3;box-shadow:inset 0 0 0 1px var(--ln2)}
.lsx-bar2{position:relative;height:8px;background:#ffffff14;overflow:hidden;flex:1;min-width:120px}
.lsx-bar2 i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--gold2),var(--gold))}
.lsx-list{display:flex;flex-direction:column;gap:6px}
.lsx-it{display:flex;align-items:center;gap:12px;padding:10px 12px;background:linear-gradient(90deg,#ffffff0b,#ffffff04);box-shadow:inset 0 0 0 1px #ffffff17}
.lsx-it .tx{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
.lsx-it .tx b{font-size:13.5px}.lsx-it .tx small{font-size:11.5px;color:var(--tx2)}
.lsx-it.done{opacity:.55}
.lsx-stg{display:grid;grid-template-columns:repeat(15,1fr);gap:3px;margin:8px 0}
.lsx-stg span{height:30px;display:grid;place-items:center;font:900 11px var(--ff);background:#ffffff0a;box-shadow:inset 0 0 0 1px #ffffff14;color:var(--tx2)}
.lsx-stg span.ok{background:#f2b54433;color:#ffe08a;box-shadow:inset 0 0 0 1px #f2b54488}
.lsx-stg span.nx{color:#fff;box-shadow:inset 0 0 0 2px var(--ac)}
.lsx-stg span.mile::after{content:"";position:absolute}
.lsx-chest{display:flex;gap:10px;flex-wrap:wrap}
.lsx-chest > div{flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px;padding:10px;background:#ffffff08;box-shadow:inset 0 0 0 1px #ffffff17}
.lsx-chest > div.ok{box-shadow:inset 0 0 0 1px #f2b544aa;background:#f2b5441a}
.lsx-pass{display:grid;grid-auto-flow:column;grid-auto-columns:108px;gap:6px;overflow-x:auto;padding-bottom:8px;scrollbar-width:thin;scrollbar-color:#f2b54466 transparent}
.lsx-pass::-webkit-scrollbar{height:6px}.lsx-pass::-webkit-scrollbar-thumb{background:#f2b54466}
.lsx-pc .lsx-rw{white-space:nowrap;font-size:11px}
.lsx-pc{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;background:#ffffff08;box-shadow:inset 0 0 0 1px #ffffff17;text-align:center}
.lsx-pc .lv{font:900 12px var(--ff);color:var(--tx2)}
.lsx-pc.ok{box-shadow:inset 0 0 0 1px #f2b54499}.lsx-pc.ok .lv{color:#ffe08a}
.lsx-pc.got{opacity:.45}.lsx-pc.big{background:#f2b54414}
.lsx-pc .lsx-rws{flex-direction:column}
.lsx-rk{display:flex;align-items:center;gap:10px;padding:7px 12px;background:#ffffff07;box-shadow:inset 0 0 0 1px #ffffff12}
.lsx-rk b{width:34px;font:900 14px var(--ff);color:var(--ac)}.lsx-rk span{flex:1}.lsx-rk em{font-style:normal;font-weight:800}
.lsx-rk.me{box-shadow:inset 0 0 0 1px var(--ac);background:#f2b54418}
.lsx-big{font:900 28px var(--ff);color:#fff}
.lsx-in{flex:1;min-width:120px;padding:9px 12px;border:0;background:#060910;color:#fff;box-shadow:inset 0 0 0 1px var(--ln2);font:700 14px var(--ff);user-select:text;-webkit-user-select:text}
.lsx-in:focus{outline:none;box-shadow:inset 0 0 0 1px var(--ac)}
.lsx-av{width:34px;height:34px;display:grid;place-items:center;flex:none;background:#1b2336;box-shadow:inset 0 0 0 1px var(--ln2);font:900 15px var(--ff);color:var(--ac)}
.lsx-emb{width:40px;height:40px;display:grid;place-items:center;flex:none;background:#0a0e16;box-shadow:inset 0 0 0 1px #f2b54466}.lsx-emb .ico{font-size:28px}
.lsx-rk .lsx-emb{width:28px;height:28px}.lsx-rk .lsx-emb .ico{font-size:20px}
.lsx-embb{width:46px;height:46px;border:0;background:#0a0e16;box-shadow:inset 0 0 0 1px var(--ln2);display:grid;place-items:center}.lsx-embb .ico{font-size:30px}.lsx-embb.on{box-shadow:inset 0 0 0 2px var(--ac);background:#f2b5441a}
.lsx-ev{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 16px;background:linear-gradient(90deg,#ff9a3a33,#141b2aee 60%);box-shadow:inset 0 0 0 1px #ff9a3a66}
.lsx-ev b{font:900 14px var(--ff);color:#ffd08a}.lsx-ev span{font-size:12.5px;color:#e6d9c4}.lsx-ev.off{background:linear-gradient(180deg,#141b2aee,#0b0f19ee);box-shadow:inset 0 0 0 1px var(--ln)}.lsx-ev.off b{color:var(--tx2)}
.lsx-cds{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.lsx-cd{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px;background:linear-gradient(180deg,#141b2aee,#0b0f19ee);box-shadow:inset 0 0 0 1px var(--rc);text-align:center}
.lsx-cd.no{box-shadow:inset 0 0 0 1px #ffffff14}
.lsx-cd b{font-size:12px;line-height:1.25;min-height:30px;display:flex;align-items:center}.lsx-cd small{font-size:11px;color:var(--ac);min-height:14px}
.lsx-cdi{width:100%;aspect-ratio:1;object-fit:cover;background:#0d1428}
.lsx-cdw{width:100%;aspect-ratio:1;display:grid;place-items:center;background:radial-gradient(circle at 50% 55%,color-mix(in srgb,var(--rc) 35%,transparent),#0d1428 70%);box-shadow:inset 0 0 0 1px var(--rc)}.lsx-cdw .ico{width:80%!important;height:80%!important;object-fit:contain;vertical-align:middle}
.lsx-cd .lsx-btn{width:100%}
#lsxOver{display:flex;flex-direction:column;align-items:center;gap:6px;margin:6px 0}
#lsxOver:empty{display:none}
.lsx-ovh{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center}
.lsx-ovh b{font-size:17px}.lsx-ovh em{font-style:normal;color:#1a0f08;background:var(--ac);padding:1px 8px;font-weight:900;font-size:12px}.lsx-ovh small{color:var(--tx2);font-size:12px}
.lsx-ovr{display:flex;align-items:center;gap:8px;font-size:12.5px}
.lsx-ovr .lsx-rw{padding:2px 6px}
@media (max-height:560px){#lsxS .lsx-b{padding:10px 14px 22px;gap:8px}.lsx-card{padding:11px 13px}}
`;
  function el(tag, attrs, html) { const e = document.createElement(tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }

  const BTNS = [
    { k: 'chal', nm: '도전', ic: 'chal', dot: () => dcOpen() && X().dc.n < DC_TRIES || raidOpen() && X().raid.n < RAID_TRIES || wmDot() },
    { k: 'pass', nm: '패스', ic: 'pass', dot: passDot },
    { k: 'event', nm: '이벤트', ic: 'event', dot: evDot },
    { k: 'ach', nm: '업적', ic: 'ach', dot: () => achDot() || cdDot() },
    { k: 'idle', nm: '정찰', ic: 'scout', dot: idleDot },
    { k: 'squad', nm: '부대', ic: 'squad', dot: () => false },
    { k: 'rank', nm: '랭킹', ic: 'rank', dot: () => false },
  ];
  function drawBar() {
    let bar = document.getElementById('lsx-bar');
    if (!bar) { const t = document.getElementById('title'); if (!t) return; bar = el('nav', { id: 'lsx-bar' }); t.appendChild(bar); }
    bar.innerHTML = BTNS.map((b) => `<button class="rl" data-k="${b.k}">${ic(b.ic)}<span>${b.nm}</span>${b.dot() ? '<i class="dot"></i>' : ''}${b.k === 'chal' && weekend() ? '<em class="lsx-tag">주말 2배</em>' : ''}</button>`).join('');
    bar.querySelectorAll('button').forEach((b) => (b.onclick = () => openS(b.dataset.k)));
  }

  const TITLES = { chal: ['chal', '도전'], pass: ['pass', '작전 패스'], ach: ['ach', '업적 · 도감'], event: ['event', '이벤트'], idle: ['scout', '정찰 보상'], rank: ['rank', '랭킹 · 계정'], squad: ['squad', '부대 · 친구'] };
  const TABS = { ach: [['ach', '업적'], ['cdm', '기체 도감'], ['cdw', '무기 도감']], event: [['race', '한정 레이스'], ['fest', '출석 축제'], ['wkd', '주말 작전']], squad: [['mine', '내 부대'], ['find', '부대 찾기'], ['rank', '부대 순위'], ['friend', '친구']], chal: [['dc', '일일 도전'], ['raid', '주간 토벌'], ['wm', '주간 임무']], rank: [['raid', '주간 토벌'], ['dc', '오늘의 도전'], ['prog', '작전 진행']] };
  function openS(k, t) {
    cur = k; tab = t || (k === 'event' ? (raceNow().on ? 'race' : 'fest') : TABS[k] ? TABS[k][0][0] : null);
    let s = document.getElementById('lsxS');
    if (!s) { s = el('div', { id: 'lsxS', class: 'ov panel scr hide' }, `<div class="scrH"><h2 id="lsxT"></h2><div class="tabs" id="lsxTabs"></div><button class="close" id="lsxC">✕</button></div><div class="lsx-b" id="lsxB"></div>`); document.body.appendChild(s); s.querySelector('#lsxC').onclick = closeS; }
    s.classList.remove('hide'); render();
  }
  function closeS() { const s = document.getElementById('lsxS'); if (s) s.classList.add('hide'); cur = null; drawBar(); }
  function render() {
    if (!cur) return; X();
    const [ik, nm] = TITLES[cur]; document.getElementById('lsxT').innerHTML = `${ic(ik)}${nm}`;
    const T = TABS[cur] || [], dots = { dc: () => dcOpen() && X().dc.n < DC_TRIES, raid: () => raidOpen() && X().raid.n < RAID_TRIES, wm: wmDot, ach: achDot, cdm: () => { const c = cdSt(); return cdMechList().some((m) => m.own && !c.m[m.k]); }, cdw: () => { const c = cdSt(); return cdWpnList().some((w) => w.own && !c.w[w.k]); }, race: raceDot, fest: festDot };
    document.getElementById('lsxTabs').innerHTML = T.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}${cur !== 'rank' && cur !== 'squad' && dots[k] && dots[k]() ? '<i class="dot"></i>' : ''}</button>`).join('');
    document.querySelectorAll('#lsxTabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
    const B = document.getElementById('lsxB');
    if (cur === 'squad') { B.innerHTML = '<div class="lsx-card"><p>불러오는 중…</p></div>'; vSquad(B, tab); return; }
    B.innerHTML = ({ chal: { dc: vDc, raid: vRaid, wm: vWm }[tab], pass: vPass, ach: { ach: vAch, cdm: () => vCodex('m'), cdw: () => vCodex('w') }[tab], event: { race: vRace, fest: vFest, wkd: vWeekendEv }[tab], idle: vIdle, rank: vRank })[cur]();
    B.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a, b.dataset.v)));
    if (cur === 'rank') loadRank();
    if (cur === 'event' && tab === 'race' && raceNow().on) loadRace();
  }
  const SOA = ['frAdd', 'frOk', 'frNo', 'frGift', 'frTake', 'frLink', 'gFind', 'gMake', 'gJoin', 'gAtt', 'gAttGet', 'gGoal', 'gKick', 'gLeave'];
  function act(a, v) {
    if (SOA.includes(a)) return soAct(a, v);
    if (a === 'gEmb') { SO().gemb = +v; document.querySelectorAll('.lsx-embb').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); return; }
    const x = X();
    if (a === 'toDc') return openS('chal', 'dc');
    if (a === 'fest') { const f = festSt(); if (f.got < 7 && f.last !== dayKey()) { const r = FEST[f.got]; f.got++; f.last = dayKey(); give(r, 20); LS.toast('축제 선물을 받았습니다'); } return render(); }
    if (a === 'race') { const c = raceSt(), i = +v, s = RACE_ST[i]; if (s && c.id && !c.got[i] && c.k >= s.n) { c.got[i] = 1; give(s.rw, 20); LS.toast('레이스 단계 보상을 받았습니다'); } return render(); }
    if (a === 'cd' || a === 'cdAll') { const c = cdSt(); let g = 0, n = 0; const take = (kind, it) => { if (it.own && !c[kind][it.k]) { c[kind][it.k] = 1; g += it.g; n++; } };
      if (a === 'cd') { const [kind, k] = String(v).split('|'); const it = (kind === 'm' ? cdMechList() : cdWpnList()).find((q) => q.k === k); if (it) take(kind, it); } else { const kind = v; for (const it of (kind === 'm' ? cdMechList() : cdWpnList())) take(kind, it); }
      if (n) { give({ gem: g }); LS.toast(`도감 ${n}칸 · 결정 ${g}`); } return render(); }
    if (a === 'dc') dcStart();
    else if (a === 'raid') raidStart(+v || 0);
    else if (a === 'wch') { const i = +v, c = WCH[i]; if (wmPts() >= c.p && !x.wm.got[i]) { x.wm.got[i] = 1; give(c.rw, 40); LS.toast('주간 상자를 열었습니다'); } render(); }
    else if (a === 'pass') { const i = +v; if (i < passLv() && !x.pass.got[i]) { x.pass.got[i] = 1; give(passRw(i)); LS.toast(`패스 ${i + 1}단계 보상을 받았습니다`); } render(); }
    else if (a === 'passAll') { let n = 0; for (let i = 0; i < passLv(); i++) if (!x.pass.got[i]) { x.pass.got[i] = 1; LS.give(rwFix(passRw(i))); n++; } save(); if (n) LS.toast(`패스 보상 ${n}개를 받았습니다`); render(); }
    else if (a === 'ach') { const A0 = ACH.find((q) => q.id === v); if (A0 && achReady(A0)) { const t = achTier(A0); x.ach[A0.id] = t + 1; give({ gem: A0.g[t] }, 20); LS.toast(`업적 달성: ${A0.ds(A0.t[t])}`); } render(); }
    else if (a === 'achAll') { let n = 0, g = 0; for (const A0 of ACH) while (achReady(A0)) { const t = achTier(A0); x.ach[A0.id] = t + 1; g += A0.g[t]; n++; } if (n) { give({ gem: g }, 20 * n); LS.toast(`업적 ${n}개 · 결정 ${g}`); } render(); }
    else if (a === 'idle') { const I = idle(); if (I.h < 1 / 6) return LS.toast('조금 더 기다려 주세요'); x.idle.t = Date.now(); const r = { core: I.core, ore: I.ore, chip: I.chip, gem: I.gem }; give(r, Math.floor(I.h * 4)); LS.toast('정찰 보상을 받았습니다'); render(); }
    else if (a === 'quick') { if (x.idle.quick === dayKey()) return; x.idle.quick = dayKey(); const c = Math.max(1, (S().chMax || 1) - 1), h = 2; give({ core: Math.floor(h * (50 + 10 * c)), ore: Math.floor(h * (.4 + c / 60)), chip: Math.floor(h * (.25 + c / 90)) }); LS.toast('긴급 정찰 완료 · 2시간 치 보상'); render(); }
    else if (a === 'rk') { tab = v; render(); }
    else if (a === 'gl') googleLogin();
    else if (a === 'el') { const A0 = A(); if (A0) A0.openLogin(); else LS.toast('hankuk-in.com 에서 열어야 로그인할 수 있습니다'); }
    else if (a === 'lo') { const A0 = A(); if (A0) A0.logout(); setTimeout(render, 600); }
    else if (a === 'sv') { const A0 = A(); if (A0) A0.saveNow().then(() => LS.toast('계정에 저장했습니다')).catch(() => LS.toast('저장하지 못했습니다')); }
  }

  // 일일 도전 화면
  function vDc() {
    const x = X();
    if (!dcOpen()) return lockCard('일일 도전', '1부 1막 2장을 깨면 열립니다. 매일 바뀌는 특수 규칙으로 하루 세 번 도전합니다.');
    const T = dcToday(), C = LS.CHAPTERS[T.ch - 1], R = dcRw(T.ch), left = DC_TRIES - x.dc.n;
    const m = LS.MECHS.find((q) => q.id === S().mech), elB = m && m.el === T.el;
    const got = (k) => (x.dc.got[k] ? '<span class="lsx-pill on">받음</span>' : '');
    const we = weekend() ? `<div class="lsx-card lsx-ev"><b>주말 작전 진행 중</b><span>오늘 일일 도전 보상 2배 · 패스 경험치 1.5배</span></div>` : `<div class="lsx-card lsx-ev off"><b>주말 작전</b><span>토·일요일에는 일일 도전 보상 2배 · 패스 경험치 1.5배 · 시작까지 ${leftTxt(nextWeekend())}</span></div>`;
    return we + `<div class="lsx-card"><div class="k">오늘의 작전 · ${T.d}</div><h4>${esc(C.nm)}</h4><p>${C.part}부 ${C.ai + 1}막 ${C.n}장의 전장 · ${esc(C.type || '생존')} 임무 · 오늘의 규칙 두 가지가 붙습니다. 다음 작전까지 ${leftTxt(nextMidnight())}</p>
      <div class="lsx-row" style="margin:8px 0">${T.mods.map((q) => `<span class="lsx-mod"><b>${q.nm}</b><small>${q.ds}</small></span>`).join('')}<span class="lsx-mod" style="border-left-color:var(--cy)"><b>오늘의 계열 · ${EL_NM[T.el]}</b><small>${EL_NM[T.el]} 계열 기체로 나가면 화력 +20%${elB ? ' · 지금 기체 적용' : ''}</small></span></div>
      <div class="lsx-row"><span class="lsx-pill">남은 도전 ${left}/${DC_TRIES}</span><span class="lsx-pill">오늘 최고 ${fmtN(x.dc.best)}점</span><span class="lsx-pill">연속 승리 ${x.dc.streak || 0}일 · 7일마다 추가 보상</span><span class="lsx-sp"></span><button class="go lsx-go" data-a="dc" ${left > 0 ? '' : 'disabled'}>${left > 0 ? '도전 출격' : '내일 다시'}</button></div></div>
      <div class="lsx-card"><div class="k">오늘 받을 수 있는 보상 (하루 한 번씩)</div><div class="lsx-list" style="margin-top:8px">
      <div class="lsx-it ${x.dc.got.join ? 'done' : ''}"><div class="tx"><b>참여</b><small>도전 판을 끝까지 마치기</small></div>${rwHtml(R.join)}${got('join')}</div>
      <div class="lsx-it ${x.dc.got.win ? 'done' : ''}"><div class="tx"><b>승리</b><small>결전까지 이기기</small></div>${rwHtml(R.win)}${got('win')}</div>
      <div class="lsx-it ${x.dc.got.perfect ? 'done' : ''}"><div class="tx"><b>완벽</b><small>내구 50% 이상 남기고 승리</small></div>${rwHtml(R.perfect)}${got('perfect')}</div></div>
      <p style="margin-top:8px">점수는 격파·생존 시간·승리·최고 콤보·남은 내구로 매기고, 로그인하면 오늘의 도전 순위에 올라갑니다. 도전 판은 장 진행과 별에는 들어가지 않습니다.</p></div>`;
  }
  function lockCard(t, d) { return `<div class="lsx-card"><h4>${ic('lock')} ${t}</h4><p>${d}</p></div>`; }

  // 주간 토벌 화면
  function vRaid() {
    const x = X();
    if (!raidOpen()) return lockCard('주간 토벌', '1부 1막을 끝내면(4장 결전 승리) 열립니다. 한 주 동안 단계를 올리며 막 보스를 토벌하고 순위를 겨룹니다.');
    const ch = raidCh(), C = LS.CHAPTERS[ch - 1], nx = Math.min(RAID_MAX, x.raid.best + 1), left = RAID_TRIES - x.raid.n;
    const stg = Array.from({ length: RAID_MAX }, (_, i) => { const k = i + 1; return `<span class="${k <= x.raid.best ? 'ok' : ''} ${k === nx && x.raid.best < RAID_MAX ? 'nx' : ''}" title="${k}단계">${k}</span>`; }).join('');
    const mile = [5, 10, 15].map((k) => `<div class="lsx-it ${x.raid.got[k] ? 'done' : ''}"><div class="tx"><b>${k}단계 첫 돌파</b><small>위협도 ${raidTh(k).toFixed(1)}</small></div>${rwHtml(raidRw(k))}${x.raid.got[k] ? '<span class="lsx-pill on">받음</span>' : ''}</div>`).join('');
    return `<div class="lsx-card"><div class="k">이번 주 표적 · ${x.raid.wk} 주 · 바뀌기까지 ${leftTxt(nextMonday())}</div><h4>${esc(C.nm.replace(/^결전 · /, ''))}</h4>
      <p>${C.part}부 ${C.ai + 1}막 결전의 전장. 단계가 오를수록 위협도와 적 내구가 오르고, 2분 30초에 결전이 시작됩니다. 단계마다 처음 돌파하면 보상을 받습니다.</p>
      <div class="lsx-stg">${stg}</div>
      <div class="lsx-row"><span class="lsx-pill">이번 주 최고 ${x.raid.best}단계</span><span class="lsx-pill">오늘 남은 토벌 ${left}/${RAID_TRIES}</span><span class="lsx-pill">다음 ${nx}단계 보상</span>${rwHtml(raidRw(nx))}<span class="lsx-sp"></span>
      ${x.raid.best >= 1 ? `<button class="lsx-btn dk" data-a="raid" data-v="${x.raid.best}" ${left > 0 ? '' : 'disabled'}>${x.raid.best}단계 다시</button>` : ''}<button class="go lsx-go" data-a="raid" data-v="${nx}" ${left > 0 ? '' : 'disabled'}>${left > 0 ? `${nx}단계 출격` : '내일 다시'}</button></div></div>
      <div class="lsx-card"><div class="k">큰 보상 단계</div><div class="lsx-list" style="margin-top:8px">${mile}</div>
      <p style="margin-top:8px">주간 순위 보상(다음 주 첫 접속 때 우편): 1위 결정 1,000 · 2~3위 600 · 4~10위 300 · 11~50위 150 · 참여 50. 순위에 오르려면 랭킹 화면에서 로그인하세요.</p></div>`;
  }

  // 주간 임무 화면
  function vWm() {
    const x = X(), w = x.wm, p = wmPts();
    const items = WM.map((m) => { const v = Math.min(m.n, wmVal(m, w)); return `<div class="lsx-it ${v >= m.n ? 'done' : ''}"><div class="tx"><b>${m.t}</b><span class="lsx-row"><span class="lsx-bar2"><i style="width:${v / m.n * 100}%"></i></span><small>${fmtN(v)} / ${fmtN(m.n)}</small></span></div><span class="lsx-pill ${v >= m.n ? 'on' : ''}">+${m.pt}점</span></div>`; }).join('');
    const ch = WCH.map((c, i) => { const ok = p >= c.p, got = w.got[i]; return `<div class="${ok ? 'ok' : ''}"><b>${c.p}점 상자</b>${rwHtml(c.rw)}<button class="lsx-btn" data-a="wch" data-v="${i}" ${ok && !got ? '' : 'disabled'}>${got ? '받음' : ok ? '열기' : `${c.p - p}점 더`}</button></div>`; }).join('');
    return `<div class="lsx-card"><div class="k">이번 주 점수 · 바뀌기까지 ${leftTxt(nextMonday())}</div><div class="lsx-row"><span class="lsx-big">${p}</span><small style="color:var(--tx2)">/ 100점</small><span class="lsx-bar2" style="height:10px"><i style="width:${p}%"></i></span></div>
      <div class="lsx-chest" style="margin-top:10px">${ch}</div></div><div class="lsx-card"><div class="k">주간 임무</div><div class="lsx-list" style="margin-top:8px">${items}</div></div>`;
  }

  // 패스 화면
  function vPass() {
    const x = X(), se = season(), lv = passLv(), xpIn = x.pass.xp - lv * PASS_XP, ready = Array.from({ length: lv }, (_, i) => i).filter((i) => !x.pass.got[i]).length;
    const cells = Array.from({ length: PASS_LV }, (_, i) => { const ok = i < lv, got = x.pass.got[i], big = (i + 1) % 5 === 0;
      return `<div class="lsx-pc ${ok ? 'ok' : ''} ${got ? 'got' : ''} ${big ? 'big' : ''}"><span class="lv">${i + 1}단계</span>${rwHtml(passRw(i))}<button class="lsx-btn ${ok && !got ? '' : 'dk'}" data-a="pass" data-v="${i}" ${ok && !got ? '' : 'disabled'}>${got ? '받음' : ok ? '받기' : '잠김'}</button></div>`; }).join('');
    return `<div class="lsx-card"><div class="k">시즌 ${se.n} · 끝나기까지 ${leftTxt(se.en)}</div><h4>작전 패스 ${lv >= PASS_LV ? '완료' : `${lv}단계`}</h4>
      <div class="lsx-row"><span class="lsx-bar2" style="height:10px"><i style="width:${lv >= PASS_LV ? 100 : xpIn}%"></i></span><small style="color:var(--tx2)">${lv >= PASS_LV ? '모든 단계 달성' : `${xpIn} / ${PASS_XP} 경험치`}</small><button class="lsx-btn" data-a="passAll" ${ready ? '' : 'disabled'}>모두 받기${ready ? ` (${ready})` : ''}</button></div>
      <p>패스 경험치: 출격 15 · 임무 완료 +15 · 일일 도전·주간 토벌 +25 · 주간 상자 +40 · 업적 +20 · 정찰 보상(시간에 따라). 시즌이 바뀌면 단계가 처음부터 다시 시작됩니다.</p></div>
      <div class="lsx-card"><div class="lsx-pass">${cells}</div></div>`;
  }

  // 업적 화면
  function vAch() {
    const n = ACH.filter(achReady).length;
    const rows = ACH.map((a) => { const t = achTier(a), done = t >= a.t.length, goal = a.t[Math.min(t, a.t.length - 1)], v = a.v(), ok = achReady(a);
      return `<div class="lsx-it ${done ? 'done' : ''}"><div class="tx"><b>${a.nm} <small>${'★'.repeat(t)}${'☆'.repeat(a.t.length - t)}</small></b><span class="lsx-row"><span class="lsx-bar2"><i style="width:${Math.min(1, v / goal) * 100}%"></i></span><small>${done ? '모두 달성' : a.ds(goal) + ` · ${fmtN(Math.min(v, goal))}/${fmtN(goal)}`}</small></span></div>${done ? '' : rwHtml({ gem: a.g[t] })}<button class="lsx-btn" data-a="ach" data-v="${a.id}" ${ok ? '' : 'disabled'}>${done ? '완료' : ok ? '받기' : '진행 중'}</button></div>`; }).join('');
    return `<div class="lsx-card"><div class="lsx-row"><div><div class="k">업적</div><p>단계를 달성할 때마다 결정을 받습니다. 별은 받은 단계입니다.</p></div><span class="lsx-sp"></span><button class="lsx-btn" data-a="achAll" ${n ? '' : 'disabled'}>모두 받기${n ? ` (${n})` : ''}</button></div></div><div class="lsx-list">${rows}</div>`;
  }

  // 정찰 화면
  function vIdle() {
    const x = X(), I = idle(), c = Math.max(1, (S().chMax || 1) - 1), q = x.idle.quick === dayKey();
    return `<div class="lsx-card"><div class="k">정찰 드론 · 접속하지 않아도 보상이 쌓입니다 (최대 ${IDLE_MAX_H}시간)</div><h4>${Math.floor(I.h)}시간 ${pad(Math.floor(I.ms / 6e4) % 60)}분째 정찰 중</h4>
      <div class="lsx-row" style="margin:8px 0"><span class="lsx-bar2" style="height:10px"><i style="width:${I.h / IDLE_MAX_H * 100}%"></i></span><small style="color:var(--tx2)">${I.h >= IDLE_MAX_H ? '가득 참 · 받아야 다시 쌓입니다' : '가득 차기까지 ' + fmtT((IDLE_MAX_H - I.h) * 60) + ' (시간:분)'}</small></div>
      <div class="lsx-row">${rwHtml({ core: I.core, ore: I.ore, chip: I.chip, gem: I.gem })}<span class="lsx-sp"></span><button class="go lsx-go" data-a="idle" ${I.h >= 1 / 6 ? '' : 'disabled'}>보상 받기</button></div>
      <p>시간당 코어 ${50 + 10 * c} · 정련 합금 ${(.4 + c / 60).toFixed(1)} · 강화 회로 ${(.25 + c / 90).toFixed(1)} · 결정 2. 작전을 더 진행할수록 정찰 보상이 커집니다.</p></div>
      <div class="lsx-card"><div class="lsx-row"><div><div class="k">긴급 정찰 · 하루 한 번</div><p>2시간 치 정찰 보상(결정 제외)을 바로 받습니다.</p></div><span class="lsx-sp"></span><button class="lsx-btn" data-a="quick" ${q ? 'disabled' : ''}>${q ? '오늘 완료' : '긴급 정찰'}</button></div></div>`;
  }

  // 랭킹 · 계정 화면
  function vRank() {
    const a = A(), u = user();
    const acc = !onSite() ? `<p>지금은 이 기기에만 저장됩니다. hankuk-in.com 에서 열면 계정으로 저장하고 순위에 오를 수 있습니다.</p>`
      : !a ? `<p>계정 연결을 준비하고 있습니다…</p>`
        : u ? `<div class="lsx-row"><span class="lsx-pill on">☁ ${esc(myName())}</span><small style="color:var(--tx2)">${esc(u.email || '')}</small><span class="lsx-sp"></span><button class="lsx-btn dk" data-a="sv">지금 저장</button><button class="lsx-btn dk" data-a="lo">로그아웃</button></div><p>기체·무기·재화 기록이 계정에 저장되고, 다른 기기에서 로그인하면 이어서 합니다.</p>`
          : `<p>로그인하지 않아도 이 기기에 저장됩니다. 로그인하면 다른 기기에서 이어서 하고, 순위에 내 기록이 올라갑니다. (조선좀비·ASCEND와 같은 계정)</p><div class="lsx-row"><button class="lsx-btn" data-a="gl">구글로 로그인</button><button class="lsx-btn dk" data-a="el">이메일로 로그인</button></div>`;
    const x = X(), mine = tab === 'raid' ? `이번 주 최고 ${x.raid.best}단계` : tab === 'dc' ? `오늘 최고 ${fmtN(x.dc.best)}점` : `${Math.max(0, (S().chMax || 1) - 1)}장 돌파 · 별 ${starSum()}개`;
    return `<div class="lsx-card"><div class="k">계정</div>${acc}</div><div class="lsx-card"><div class="lsx-row"><div class="k">${{ raid: `주간 토벌 · ${x.raid.wk} 주`, dc: `오늘의 도전 · ${x.dc.day}`, prog: '작전 진행 · 전체' }[tab]}</div><span class="lsx-sp"></span><span class="lsx-pill">내 기록 · ${mine}</span></div><div class="lsx-list" id="lsxRk" style="margin-top:8px"><p>순위를 불러오는 중…</p></div></div>`;
  }
  async function loadRank() {
    const box = () => document.getElementById('lsxRk'); const x = X(), t0 = tab;
    let a = A(); for (let i = 0; i < 16 && !(a && a.topScores); i++) { await new Promise((r) => setTimeout(r, 250)); a = A(); }
    if (!box() || tab !== t0) return;
    if (!a || !a.topScores) { box().innerHTML = '<p>온라인 순위표에 연결되지 않았습니다. hankuk-in.com 에서 열면 순위가 보입니다.</p>'; return; }
    const bid = { raid: 'lsraid-' + x.raid.wk, dc: 'lsdc-' + x.dc.day, prog: 'lsprog' }[t0];
    if (a.user) { if (t0 === 'raid' && x.raid.best) await a.submitScore(bid, x.raid.best * 1000, myName()).catch(() => { }); if (t0 === 'dc' && x.dc.best) await a.submitScore(bid, x.dc.best, myName()).catch(() => { }); if (t0 === 'prog' && (S().chMax || 1) > 1) await a.submitScore(bid, Math.max(0, (S().chMax || 1) - 1) * 1000 + starSum(), myName()).catch(() => { }); settleRaid(); }
    let L = []; try { L = await a.topScores(bid, 50); } catch (e) { if (box()) box().innerHTML = '<p>순위를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    if (!box() || tab !== t0) return; const me = a.user && a.user.uid;
    L = L.filter((e) => (e.score || 0) > 0); const val = (sc) => (t0 === 'raid' ? `${Math.floor(sc / 1000)}단계` : t0 === 'prog' ? `${Math.floor(sc / 1000)}장 · 별 ${sc % 1000}` : `${fmtN(sc)}점`);
    box().innerHTML = L.length ? L.map((e, i) => `<div class="lsx-rk ${e.uid === me || e.id === me ? 'me' : ''}"><b>${i + 1}</b><span>${esc(e.name || '파일럿')}</span><em>${val(e.score || 0)}</em></div>`).join('') : '<p>아직 기록이 없습니다. 첫 번째가 되어 보세요.</p>';
  }

  // ───────── 시작 ─────────
  function init() {
    if (LS) return; LS = window.LS; if (!LS) return;
    document.head.appendChild(el('style', { id: 'lsx-css' }, CSS));
    X(); try { const rf = new URLSearchParams(location.search).get('ref'); if (rf && /^[A-Za-z0-9]{6}$/.test(rf)) { const o = SO(); if (!o.ref) o.ref = rf.toUpperCase(); } } catch (e) { } save(); drawBar(); loadAccount(); for (const k in MYI) { const i = new Image(); i.src = `img/icon/${MYI[k]}.webp?v=1`; }
    LS.on('runEnd', onRunEnd);
    LS.on('runStart', () => { const s = document.getElementById('lsxS'); if (s) s.classList.add('hide'); });
    LS.on('lobby', () => { drawBar(); const b = document.getElementById('lsxOver'); if (b) b.innerHTML = ''; const c = document.getElementById('lsxBackC'); if (c) c.remove(); });
    // 출석 보상을 받으면 패스 경험치
    setInterval(() => { try { const x = X(), lc = (S().daily || {}).lastClaim; if (lc && x.lastClaim !== lc) { if (x.lastClaim) addXp(30); x.lastClaim = lc; save(); } if (!cur) drawBar(); else if (cur === 'idle') render(); } catch (e) { } }, 20000);
    try { const a = window.HKAccount; if (a && a.onChange) a.onChange(() => settleRaid()); else setTimeout(() => { const b = window.HKAccount; if (b && b.onChange) b.onChange(() => { settleRaid(); if (cur === 'rank') render(); }); }, 4000); } catch (e) { }
    window.LSX = { openS, X, dcToday, raidCh, idle, passLv, wmPts };
  }
  if (window.LS) init(); else window.addEventListener('ls:ready', init);
})();
