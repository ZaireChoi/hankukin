/* 처용, 조선좀비 전투 본체. 바깥 화면과는 window.JZB 로만 이어진다(CONTRACT.md). */
(function () {
'use strict';
const D = window.JZD, FX = window.JZFX, WD = window.JZW;
const { W, VH, H, SHRINE, WALL_Y, GATE, EN, TUR, WEAPON, GUARD, COMP, SKILLS } = D;
let PADS = D.PADS, LANE_X = D.LANE_X;   /* 판마다 layoutOf로 바뀐다 */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
const stage = $('stage'), cv = $('cv'), ctx = cv.getContext('2d');
let K = 1, camX = 0, camY = H - VH, zoom = 1;
const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / VH);
  stage.style.transform = 'scale(' + s + ')';
  stage.style.left = Math.round((innerWidth - W * s) / 2) + 'px';
  stage.style.top = Math.round((innerHeight - VH * s) / 2) + 'px';
  K = Math.max(1, Math.min(2.5, s * (window.devicePixelRatio || 1)));
  cv.width = Math.round(W * K); cv.height = Math.round(VH * K);
}
addEventListener('resize', fit); fit();

/* ---------- 그림 ---------- */
const SPR = {};
/* 크기: 처용 118 기준. 장군형 영웅은 더 크게, 나머지는 처용만큼 */
const HOV = { player: 118, yisunsin: 136, eulji: 136, gangamchan: 136, kimchungseon: 134, sadaham: 132, jeonwoochi: 118, samyeong: 118, daejanggeum: 116, bari: 116, wonhyo: 118, honggildong: 118, gumiho: 112, dokkaebi: 112, haetae: 145, samjoko: 92, imugi: 150, yeoksin: 124, mudang: 116 };
/* 영웅 초상: 3D 그림이 없을 때 대신 쓴다 */
const PORT = {};
for (const id in COMP) { const im = new Image(); im.onload = () => { PORT[id] = im; }; im.src = 'img/ui/hero_' + id + '.webp?v=' + (id === 'haetae' ? 3 : 2); }
function drawPort(id, x, y, r, ring) { const im = PORT[id]; if (!im) return false; ctx.save(); circle(x, y, r); ctx.clip(); const s = Math.max(r * 2 / im.width, r * 2 / im.height) * 1.15; ctx.drawImage(im, x - im.width * s / 2, y - r - im.height * s * 0.04, im.width * s, im.height * s); ctx.restore(); circle(x, y, r); ctx.strokeStyle = ring || '#ffe08a'; ctx.lineWidth = 3; ctx.stroke(); return true; }
for (const k in EN) HOV[k] = EN[k].h;
function tint(img, col, a) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return c;
}
/* 영혼 그림: 안은 옅게, 테두리는 밝게 */
function spiritTint(img, col, style) {
  /* 영혼: 몸은 비우고 윤곽선만. 신수마다 선 모양이 다르다 */
  const W0 = img.width, H0 = img.height, c = document.createElement('canvas'); c.width = W0; c.height = H0; const g = c.getContext('2d');
  const mk = fill => { const t = document.createElement('canvas'); t.width = W0; t.height = H0; const x = t.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = fill; x.fillRect(0, 0, W0, H0); return t; };
  const sil = mk('rgb(' + col + ')'), hi = mk('#ffffff');
  const ring = (src, r, n, a, dy) => { g.globalAlpha = a; for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2; g.drawImage(src, Math.cos(an) * r, Math.sin(an) * r + (dy || 0)); } g.globalAlpha = 1; };
  const cut = (r) => { const t = document.createElement('canvas'); t.width = W0; t.height = H0; const x = t.getContext('2d'); for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; x.drawImage(img, Math.cos(an) * r, Math.sin(an) * r); } return t; };
  if (style === 'dragon') { /* 물결 이중선 */
    ring(sil, 7, 18, 0.9); g.globalCompositeOperation = 'destination-out'; g.drawImage(cut(4.5), 0, 0); g.globalCompositeOperation = 'source-over';
    ring(sil, 2.2, 12, 1); ring(hi, 1, 8, 0.9);
  } else if (style === 'tiger') { /* 날 선 은빛 선, 군데군데 끊김 */
    ring(hi, 1.3, 10, 1); ring(sil, 2.6, 12, 0.55);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; for (let y = 0; y < H0; y += 22) for (let x = (y / 22 % 2) * 11; x < W0; x += 46) { g.save(); g.translate(x, y); g.rotate(-0.7); g.fillRect(-2, -9, 4, 18); g.restore(); } g.globalCompositeOperation = 'source-over';
  } else if (style === 'phoenix') { /* 불꽃 선: 위로 일렁이는 테두리 */
    ring(sil, 3, 16, 0.55, -4); ring(sil, 5, 16, 0.3, -9); ring(sil, 2.2, 12, 1); ring(hi, 1.1, 8, 1);
  } else { /* 현무: 두꺼운 선 + 바깥 물결 테두리 */
    ring(sil, 4, 16, 1); ring(hi, 1.3, 8, 0.85);
    const o = document.createElement('canvas'); o.width = W0; o.height = H0; const ox = o.getContext('2d'); for (let i = 0; i < 18; i++) { const an = i / 18 * Math.PI * 2; ox.drawImage(sil, Math.cos(an) * 11, Math.sin(an) * 11); } ox.globalCompositeOperation = 'destination-out'; ox.drawImage(cut(9), 0, 0);
    g.globalAlpha = 0.45; g.drawImage(o, 0, 0); g.globalAlpha = 1;
  }
  g.globalCompositeOperation = 'destination-out'; g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-over';
  return c;
}
const SMETA = {}, SLOAD = {};
/* 동작 그림은 처음 쓰일 때 받는다 */
function needAnim(sp, ak) { if (!sp.anims || !sp.anims[ak] || sp.A[ak] || sp.AL[ak]) return; sp.AL[ak] = 1; const a = sp.anims[ak], ai = new Image(); ai.onload = () => { sp.A[ak] = Object.assign({ img: ai }, a); }; ai.src = 'sprites/' + a.src + (sp.v ? '?v=' + sp.v : ''); }
function need(k) { if (SPR[k] || SLOAD[k] || !SMETA[k]) return; SLOAD[k] = 1; addSprite(k, SMETA[k]); }
function preload(keys, anims) { for (const k of keys) { need(k); } setTimeout(() => { for (const k of keys) { const sp = SPR[k]; if (sp && sp.anims) for (const a of (anims || Object.keys(sp.anims))) needAnim(sp, a); } }, 400); }
function addSprite(k, m) {
  const im = new Image();
  if (m.anims) { m = Object.assign({}, m, { A: {}, AL: {} }); }
  im.onload = () => { SPR[k] = Object.assign({ img: im }, m); if (m.A) return; /* 동작 그림이 있으면 색 바꾼 판은 필요할 때 만든다 */ try { SPR[k].white = tint(im, '#fff', 1); SPR[k].ice = tint(im, 'rgb(140,215,255)', 0.55); SPR[k].dark = tint(im, '#000', 1); } catch (e) {} if (k === 'wall') ART = true; };
  im.src = 'sprites/' + m.src + (m.v ? '?v=' + m.v : '');
}
let ART = false;
(function loadSprites() {
  const MAN = Object.assign({}, window.MANIFEST || {});
  const CORE = /^(player|wall|gate|base|shrine|build_pad|barracks|well|mine|tower_|tur_|guard_|cannon_head|hwacha_head|barricade)/;
  const go = () => { for (const k in MAN) { SMETA[k] = MAN[k]; if (CORE.test(k)) need(k); } setTimeout(() => { const sp = SPR.player; if (sp) for (const a of ['walk', 'idle', 'atk', 'hit']) needAnim(sp, a); }, 300); };
  try { fetch('sprites/manifest.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(m => { if (m) Object.assign(MAN, m); go(); }).catch(go); } catch (e) { go(); }
})();
/* 화면 방향(라디안) -> 8방향 행: 0 아래 1 왼아래 2 왼 3 왼위 4 위 5 오른위 6 오른 7 오른아래 */
const dir8 = a => ((Math.round((a * 180 / Math.PI - 90) / 45) % 8) + 8) % 8;
const dirN = (a, n) => ((Math.round((a * 180 / Math.PI - 90) / (360 / n)) % n) + n) % n;
function drawSprite(key, x, y, o) {
  const sp = SPR[key]; if (!sp) { need(key); return false; } o = o || {};
  if (o.anim && sp.anims && !sp.A[o.anim]) { needAnim(sp, o.anim); if (o.anim !== 'walk') { needAnim(sp, 'walk'); o = Object.assign({}, o, { anim: sp.A.walk ? 'walk' : null, at: null }); } }
  const hh = (o.h || HOV[key] || sp.height) * (o.sc || 1);
  const A = o.anim && sp.A ? (sp.A[o.anim] || (o.anim === 'run' || o.anim === 'idle' ? null : null)) : null;
  const FR = A ? A.frames : sp.frames, src = A ? A.img : sp.img;
  let f = o.at != null ? Math.min(FR - 1, Math.max(0, Math.floor(o.at * FR))) : Math.floor((o.t || 0) * (o.fps || sp.fps)) % FR;
  if (o.rev) f = FR - 1 - f;
  const k = hh / (sp.cell * (sp.ch || 0.62)), w = sp.cell * k;
  ctx.save(); ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.flip && !(sp.dirs > 1 && o.dir != null)) ctx.scale(-1, 1);
  if (o.sx) ctx.scale(o.sx, o.sy);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  let img = src;
  if (o.mode) { const key2 = o.mode; src.__t = src.__t || {}; if (!src.__t[key2]) { try { src.__t[key2] = key2.indexOf('sp_') === 0 ? spiritTint(src, SPIRIT[key2.slice(3)].col, key2.slice(3)) : key2 === 'stone' ? tint(src, '#7d7a74', 0.62) : key2 === 'white' ? tint(src, '#fff', 0.85) : key2 === 'ice' ? tint(src, 'rgb(140,215,255)', 0.55) : tint(src, '#000', 0.9); } catch (e) { src.__t[key2] = src; } } img = src.__t[key2]; }
  const row = sp.dirs > 1 && o.dir != null ? ((o.dir + (sp.rowOff || 0)) % sp.dirs + sp.dirs) % sp.dirs : 0;
  ctx.drawImage(img, f * sp.cell, row * sp.cell, sp.cell, sp.cell, -w * sp.anchorX, -w * sp.anchorY, w, w);
  ctx.restore(); return true;
}

/* ---------- 효과음: 파일 없이 짧게 합성 ---------- */
let AC = null, sfxOn = true; const sfxLast = {};
function sfx(kind, vol) {
  if (!sfxOn) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const now = AC.currentTime; if (sfxLast[kind] && now - sfxLast[kind] < 0.045) return; sfxLast[kind] = now;
    const g = AC.createGain(); g.connect(AC.destination); const v = (vol || 1) * 0.16;
    const noise = (dur, f, q) => { const b = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = AC.createBufferSource(); s.buffer = b; const fl = AC.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q || 1; s.connect(fl); fl.connect(g); s.start(now); };
    const tone = (f1, f2, dur, type) => { const o = AC.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f1, now); o.frequency.exponentialRampToValueAtTime(f2, now + dur); o.connect(g); o.start(now); o.stop(now + dur); };
    if (kind === 'shoot') { g.gain.setValueAtTime(v * 0.5, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.08); noise(0.08, 2400, 2); }
    else if (kind === 'gun') { g.gain.setValueAtTime(v * 1.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.2); noise(0.2, 900, 0.8); }
    else if (kind === 'boom') { g.gain.setValueAtTime(v * 1.6, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5); noise(0.5, 180, 0.7); tone(120, 40, 0.4); }
    else if (kind === 'zap') { g.gain.setValueAtTime(v * 0.9, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.25); noise(0.25, 3200, 0.5); tone(900, 200, 0.2, 'sawtooth'); }
    else if (kind === 'hit') { g.gain.setValueAtTime(v * 0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.06); noise(0.06, 1400, 1.5); }
    else if (kind === 'coin') { g.gain.setValueAtTime(v * 0.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15); tone(1400, 2100, 0.12, 'triangle'); }
    else if (kind === 'gem') { g.gain.setValueAtTime(v * 0.25, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.1); tone(1800, 2400, 0.08, 'sine'); }
    else if (kind === 'level') { g.gain.setValueAtTime(v * 0.8, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6); tone(520, 1040, 0.25, 'triangle'); tone(780, 1560, 0.5, 'sine'); }
    else if (kind === 'warn') { g.gain.setValueAtTime(v * 0.9, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.6); tone(220, 180, 0.6, 'square'); }
    else if (kind === 'ult') { g.gain.setValueAtTime(v * 1.4, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.9); tone(200, 900, 0.5, 'sawtooth'); noise(0.9, 600, 0.6); }
    else if (kind === 'build') { g.gain.setValueAtTime(v * 0.8, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.3); noise(0.3, 500, 1); tone(300, 600, 0.2, 'triangle'); }
  } catch (e) {}
}
/* 배경음 */
const BGM = {}; let bgmCur = '', bgmOn = true;
['bgm_lobby', 'bgm_battle', 'bgm_boss', 'sting_victory', 'sting_defeat'].forEach(k => { try { const a = new Audio('audio/' + k + '.mp3'); a.preload = 'auto'; a.loop = k.indexOf('bgm') === 0; a.volume = a.loop ? 0.45 : 0.7; BGM[k] = a; } catch (e) {} });
function setBgm(k) {
  if (!bgmOn) k = '';
  if (k === bgmCur) return; bgmCur = k;
  for (const n in BGM) if (BGM[n].loop) { if (n === k) { try { BGM[n].currentTime = 0; const p = BGM[n].play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} } else BGM[n].pause(); }
}
function sting(k) { const a = BGM[k]; if (!a || !bgmOn) return; try { a.currentTime = 0; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }

/* ---------- 상태 ---------- */
let G = null, WORLD = null;
const keys = {}, joy = { on: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 };
const UI = {};   /* 캔버스 버튼 영역 */

function newGame(cfg) {
  cfg = Object.assign({ chapter: 1, heroLv: 1, atk: 1, hp: 1, companions: ['dokkaebi'], skillStars: {}, weapon: 'bow', items: [], mode: 'adventure', hqLv: 1 }, cfg || {});
  const ch = clamp(cfg.chapter | 0, 1, D.CHAPTERS.length), C = D.CHAPTERS[ch - 1];
  /* 장비 합계 */
  const IS = window.JZI && cfg.items && cfg.items.length ? window.JZI.sum(cfg.items) : { atk: 0, hp: 0, speed: 0, fx: {}, weapon: null };
  if (IS.weapon) cfg.weapon = IS.weapon;
  const atk0 = cfg.itemsFxOnly ? cfg.atk : cfg.atk * (1 + IS.atk / 100), hp0 = cfg.itemsFxOnly ? cfg.hp : cfg.hp * (1 + IS.hp / 400);
  /* 판 등급: 계정이 그 장에 비해 강할수록 적도 세진다(상한 2.4배). 보상도 같은 배율로 올라간다 */
  const POW = Math.sqrt(Math.max(0.2, atk0) * Math.max(0.2, hp0)) * (1 + 0.04 * ((cfg.heroLv | 0 || 1) - 1)), EXPV = 1 + 0.11 * ((cfg.nightmare ? ch + 29 : ch) - 1);
  const TIERK = (cfg.mode || 'adventure') === 'adventure' ? Math.min(2.4, Math.max(1, 1 + 0.6 * (POW / EXPV - 1.25))) : 1;
  const LAY = D.layoutOf(ch); PADS = LAY.pads; LANE_X = LAY.lanes;
  const PKEY = cfg.skin && SMETA['player_' + cfg.skin] ? 'player_' + cfg.skin : 'player'; try { need(PKEY); } catch (e) {}
  try { const N0 = D.nightsOf(ch); const ks = new Set([...C.pool.map(k => (EN[k] && EN[k].spr) || k), C.elite, C.boss, ...(cfg.companions || []).map(id => COMP[id] && COMP[id].spr), 'sp_dragon', 'sp_tiger', 'sp_phoenix', 'sp_turtle', ...Object.keys(D.SOLDIER || {}), ...Object.keys(N0[0].mix || {})].filter(Boolean)); preload([...ks], ['walk', 'atk', 'hit', 'die', 'run', 'idle']); } catch (e) {}
  WORLD = WD.build(C.theme, LAY);
  FX.reset();
  const wp = WEAPON[cfg.weapon] || WEAPON.bow;
  const fx = IS.fx || {};
  const SB = cfg.sets || {};
  if ((SB.mugwan || 0) >= 4) fx.dmgCut10 = (fx.dmgCut10 || 0) + 1; if ((SB.seonbi || 0) >= 2) fx.xp15 = (fx.xp15 || 0) + 1; if ((SB.seonbi || 0) >= 4) fx.reroll1 = (fx.reroll1 || 0) + 1; if ((SB.cheoyong || 0) >= 4) fx.ultCd20 = (fx.ultCd20 || 0) + 1;
  const hpMax = Math.round(120 * hp0 * ((SB.mugwan || 0) >= 2 ? 1.1 : 1) * (1 + 0.06 * (cfg.heroLv - 1)));
  const mode = cfg.mode || 'adventure';
  let nights = D.nightsOf(ch);
  /* 2막 악몽: 같은 지도·목표, 적이 훨씬 세고 많다 (장마다 곡선) */
  const NMK = cfg.nightmare && mode === 'adventure' ? D.nmK(ch) : null;
  if (NMK) nights = nights.map((n, i) => Object.assign({}, n, { hp: n.hp * NMK.hp, rate: [n.rate[0] * NMK.rate, n.rate[1] * NMK.rate], elites: n.boss ? n.elites : (n.elites.length ? n.elites.concat([0.8]) : [0.55]), kind: n.boss ? n.kind : 'elite' }));
  if (mode === 'gold' || mode === 'xp') nights = nights.slice(0, 3).map((n, i) => Object.assign({}, n, { name: (i + 1) + '번째 밤', kind: i === 2 ? 'elite' : 'normal', boss: null, elites: i === 2 ? [0.5] : [], dur: 45 }));
  if (mode === 'boss') nights = [Object.assign({}, nights[nights.length - 1], { name: '우두머리 토벌', dur: 90, elites: [0.01], rate: [0.8, 1.6] })];
  /* 월드 보스·문파 보스: 정해진 거대 보스 하나와 90초 동안 피해량 겨루기 (보스는 쓰러지지 않을 만큼 단단하다) */
  if (mode === 'boss' && cfg.wbBoss && EN[cfg.wbBoss]) nights = [Object.assign({}, nights[0], { name: cfg.wbName || '월드 보스', boss: cfg.wbBoss, kind: 'boss', dur: 90, elites: [0.01], rate: [0.6, 1.2] })];
  if (mode === 'adventure' && C.objective === 'survive') nights = nights.map((n, i) => Object.assign({}, n, { rate: [n.rate[0] * (ch <= 6 ? 1.12 : 1.25), n.rate[1] * (ch <= 6 ? 1.12 : 1.25)], boss: null, elites: n.boss ? [0.3, 0.7] : n.elites, kind: n.boss ? 'elite' : n.kind }));
  const shMax = Math.round((400 + (NMK ? ch + 29 : ch) * 60) * (1 + 0.2 * (fx.shrine20 || 0) + 0.15 * (fx.shrine15 || 0)));
  G = {
    cfg, ch, C, nights, chEl: D.chEl ? D.chEl(ch, !!cfg.nightmare) : null, pkey: PKEY, nm: NMK, pzs: [], tierK: TIERK, night: 0, phase: 'day', t: 0, time: 0, spawnAcc: 0, dawnT: 0, slow: 1, mode, fx, atk0: atk0 * ((SB.cheoyong || 0) >= 2 ? 1.08 : 1), setBarracks: (SB.mugwan || 0) >= 6 ? 2 : 0, speed2: false, low: false,
    gold: 120 + 12 * (ch - 1) + 60 * (fx.startGold60 || 0), kills: 0, startT: performance.now(), hq: clamp(cfg.hqLv | 0 || 1, 1, 5), coinAcc: 0, bossDmg: 0, linkBonus: 0, killHealN: 0, lastStandUsed: false, shield: 0, shotN: 0,
    walls: D.WALLS.map(w => ({ x: w.x, gate: !!w.gate, hp: 0, max: (w.gate ? 420 : 280) * (1 + 0.35 * (ch - 1)), hitT: 0, built: false })), wallLv: 0,
    pickups: [], waves: [], clones: [], missions: null,
    shrine: { x: SHRINE.x, y: SHRINE.y, r: SHRINE.r, hp: shMax, max: shMax, hitT: 0 },
    player: { x: 360, y: WALL_Y - 80, r: 16, hp: hpMax, max: hpMax, sp: 215 * (1 + IS.speed + 0.1 * (fx.speed10 || 0)) * (1 + ({ pony: 0.1, tiger: 0.15, haetae: 0.15, crane: 0.2 }[cfg.mount] || 0)), cd: 0.3, rate: wp.rate * Math.pow(0.85, fx.haste15 || 0) * Math.pow(0.9, fx.haste10 || 0), dmg: wp.dmg, range: wp.range,
              face: -Math.PI / 2, hitT: 0, lv: 1, xp: 0, moving: false, recoil: 0, muzzle: 0, invT: 0 },
    weapon: cfg.weapon in WEAPON ? cfg.weapon : 'bow',
    sk: {}, skT: {}, turrets: [], enemies: [], shots: [], eshots: [], orbs: [], coins: [], zones: [], vortexes: [], corpses: [], tele: [],
    guards: [], comps: [], queue: [], beams: [], marks: [],
    ult: 12, ultMax: 30 * (1 - 0.2 * Math.min(2, fx.ultCd20 || 0)), cult: 18, cultMax: 35, auto: false, banner: null, title: null, cutin: null, alertT: 0, bubble: null, bubbleCd: 0,
    dmg: { skill: 0, hero: 0, building: 0, player: 0 }, pendingLv: 0, rerolls: 1 + (fx.reroll1 || 0), padKey: '', nearPad: -1, bossRef: null, dark: 0
  };
  (cfg.companions || []).slice(0, 2).forEach((id, i) => { if (COMP[id]) G.comps.push({ id, x: 360 + (i ? 60 : -60), y: WALL_Y - 40, cd: 1 + i * 0.4, face: 0, t: 0, fire: 0, active: i < D.HQ[G.hq].comps, drop: 0 }); });
  const els = G.comps.map(c => COMP[c.id].el);
  G.res = els.length === 2 && els[0] === els[1] ? els[0] : null;
  if (mode === 'challenge') G.missions = [{ n: '적 ' + (150 + ch * 30) + '마리 물리치기', ok: () => G.kills >= 150 + ch * 30 }, { n: '사당 내구도 절반 넘게 지키기', ok: () => G.shrine.hp >= G.shrine.max * 0.5 }, { n: '신력 기술 하나 각성하기', ok: () => SKILLS.some(s => s.kind === 'atk' && aw(s.id)) }];
  FX.low = false;
  if ((SB.cheoyong || 0) >= 6) { G.sk.dance = 1; G.skT.dance = 0.5; }
  if ((SB.seonbi || 0) >= 6) { const at = SKILLS.filter(s => s.kind === 'atk' && !G.sk[s.id]); const s0 = at[(Math.random() * at.length) | 0]; if (s0) { G.sk[s0.id] = 1; G.skT[s0.id] = 0.5; } }
  camX = 0; camY = H - VH; zoom = 1.1;
  stage.style.display = 'block';
  for (const id of ['ovEnd', 'ovLevel', 'ovPause', 'ovTitle']) $(id).classList.remove('on');
  startDay();
}
const skLv = id => G.sk[id] || 0;
const fxN = k => (G.fx && G.fx[k]) || 0;
const aw = id => !!(G.evo && G.evo[id]);
const atkMul = () => G.atk0 * (1 + 0.08 * (G.cfg.heroLv - 1)) * (1 + 0.3 * skLv('power'));
/* 원소 배율: 공명 +25%, 동료 연계 +20% */
const chElK = el => (G.chEl && el && el === G.chEl.el ? 1 + G.chEl.k : 1);   /* 이 장의 원소 약점 */
const TUR_EL = { fire: 'fire', hwacha: 'fire', general: 'fire', talisman: 'thunder', cannon: 'metal', arrow: 'metal', lady: 'ice', well: null, mine: null, barracks: 'metal' };
const elMul = el => (1 + (G.res && G.res === el ? 0.25 : 0) + (el && G.comps.some(c => c.active && COMP[c.id].el === el) ? 0.2 : 0)) * chElK(el);
const compMul = () => 1 + 0.3 * fxN('compDmg30') + G.linkBonus + 0.4 * skLv('bond');
const starMul = id => 1 + 0.15 * ((G.cfg.skillStars || {})[id] || 0);
const xpNeed = lv => 6 + lv * 5 + Math.floor(lv * lv * 0.1);   /* 카드 수는 줄이지 않는다(사용자 결정): 한 판 약 40장 */
const curN = () => G.nights[Math.min(G.night, G.nights.length - 1)];
const isNight = () => G.phase === 'night';

/* ===== 전투 재미 개편: 카드 위력, 진화, 시설×영웅 짝, 판 목표, 손맛 ===== */
const CARD_K = 1.6;                                   /* 공격 기술 한 장의 기본 위력 배율 */
const lvK = lv => CARD_K * (1 + 0.12 * (lv - 1));    /* 단계마다 눈에 띄게 세진다 */
function vib(p) { try { if (localStorage.getItem('kz_vib') === '0') return; if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
/* 시설 × 영웅 짝 효과 */
const PAIRS = [
  { id: 'p_yi',   hero: 'yisunsin',     tur: 'arrow',    n: '이순신 + 망루',       d: '망루 화살이 불화살이 된다 (위력 +50%, 불태움)' },
  { id: 'p_gang', hero: 'gangamchan',   tur: 'talisman', n: '강감찬 + 부적탑',     d: '번개가 2번 더 옮겨 붙고 위력 +40%' },
  { id: 'p_dae',  hero: 'daejanggeum',  tur: 'well',     n: '대장금 + 우물',       d: '회복 2배, 처용이 쓰러지면 한 번 일어난다' },
  { id: 'p_won',  hero: 'wonhyo',       tur: null,       n: '원효대사 + 사당',     d: '20초마다 사당에 금빛 보호막' },
  { id: 'p_jeon', hero: 'jeonwoochi',   tur: 'hwacha',   n: '전우치 + 화차',       d: '신기전이 분신해 두 배로 날아간다' },
  { id: 'p_kim',  hero: 'kimchungseon', tur: 'barracks', n: '김충선 + 병영',       d: '병사의 첫 공격이 기습 치명타 (3배)' },
  { id: 'p_eul',  hero: 'eulji',        tur: 'cannon',   n: '을지문덕 + 화포',     d: '포탄이 얼음 폭발로 적을 얼린다' },
  { id: 'p_dok',  hero: 'dokkaebi',     tur: 'mine',     n: '도깨비 + 금광',       d: '금광 수입 2배, 처치 엽전 확률 +10%' },
  { id: 'p_hae',  hero: 'haetae',       tur: 'fire',     n: '해태 + 화덕탑',       d: '불길 사거리 +40%, 위력 +50%' },
  { id: 'p_sam',  hero: 'samyeong',     tur: 'lady',     n: '사명대사 + 지하여장군', d: '기운 안의 적이 수시로 기절한다' },
  { id: 'p_jang', hero: 'jangyeongsil', tur: 'hwacha',   n: '장영실 + 화차',       d: '화포 장치가 더 오래 버티고 위력 +60%' }
];
const pairOn = id => !!(G && G.pairs && G.pairs[id]);
function pairOfTur(type) { return PAIRS.find(P => P.tur === type && pairOn(P.id)); }
function checkPairs() {
  if (!G.pairs) G.pairs = {};
  for (const P of PAIRS) {
    const ok = G.comps.some(c => c.active && c.id === P.hero) && (!P.tur || G.turrets.some(t => t.type === P.tur));
    if (ok && !G.pairs[P.id]) { G.pairs[P.id] = 1; G.banner = { s: '짝 완성! ' + P.n, t: 2.6, kind: 'win' }; G.bubble = { s: P.d, t: 3 }; sfx('level'); vib(40);
      const t = P.tur && G.turrets.find(o => o.type === P.tur); const x = t ? t.x : G.shrine.x, y = t ? t.y : G.shrine.y; FX.ring(x, y, 120, '255,215,110', 0.7, 12); FX.spark(x, y - 40, '255,230,150', 30, 340); }
    else if (!ok && G.pairs[P.id]) delete G.pairs[P.id];
  }
}
function pairTxt(type) { const P = PAIRS.find(Q => Q.tur === type); if (!P || !COMP[P.hero]) return ''; return '<p class="nx" style="color:#ffd36b">' + (pairOn(P.id) ? '★ 짝 완성: ' : '짝: ' + COMP[P.hero].n + ' 함께 출전 시 ') + P.d + '</p>'; }
/* 판 목표 */
function objInit() {
  const type = (G.mode === 'adventure' && G.C.objective) || 'defend', O = D.OBJ[type] || D.OBJ.defend;
  G.obj = { type, n: O.n, d: O.d, saved: 0, lost: 0, total: 0, bt: 0, enr: false, bossKilledFast: false };
  if (type === 'annihilate') { let s = 0; for (const N of G.nights) s += N.dur * (N.rate[0] + N.rate[1]) / 2 * 1.35; G.obj.target = Math.round(s * 0.7 / 10) * 10; }
  if (type === 'escort') { G.obj.total = G.nights.length * 2; G.obj.need = Math.ceil(G.obj.total * 0.5); G.obj.refs = []; }
  if (type === 'beacon') { const yy = WALL_Y - 300; let bx = 140, bd = -1; for (const x of [90, 160, 240, 360, 480, 560, 630]) { const dl = Math.min(...LANE_X.map((L, i) => { let m = 1e9; for (let t = 0; t <= 1; t += 0.02) { const p = D.lanePt(L, t, i); if (Math.abs(p.y - yy) < 40) m = Math.min(m, Math.abs(p.x - x)); } return m; }), ...PADS.map(pp => Math.hypot(pp[0] - x, pp[1] - yy) * 0.8)); if (dl > bd) { bd = dl; bx = x; } }
    const hp = Math.round(G.shrine.max * 1.5); G.obj.beacon = { kind: 'beacon', x: bx, y: yy, r: 26, hp, max: hp, hitT: 0 }; }
}
function objOk() {
  const O = G.obj, win = G.phase === 'win'; if (!O) return win;
  if (O.type === 'defend') return win && G.shrine.hp >= G.shrine.max * 0.5;
  if (O.type === 'escort') return win && O.saved >= O.need;
  if (O.type === 'bossTime') return win && !O.enr;
  if (O.type === 'annihilate') return win && G.kills >= O.target;
  return win;
}
/* 판 목표마다 유리한 빌드: 그 빌드 쪽 피해가 25% 세진다 */
const OBJ_BUILD = { beacon: ['building', '건설 위주'], bossTime: ['player', '공격 위주'], escort: ['hero', '영웅·병사 위주'], survive: ['building', '건설 위주'], annihilate: ['skill', '신력(기술) 위주'], defend: [null, '자유'] };
function objBuildK(src, e) { const B2 = G.obj && OBJ_BUILD[G.obj.type]; if (!B2 || !B2[0]) return 1; const s = src === 'skill' || src === 'player' ? (B2[0] === 'player' && src === 'skill' ? 'player' : src) : src; if (s !== B2[0]) return 1; return B2[0] === 'player' ? (e && (e.boss || e.elite) ? 1.35 : 1.15) : 1.25; }
function objText() {
  const O = G.obj; if (!O) return '';
  if (O.type === 'defend') return '목표 · 사당 ' + Math.round(G.shrine.hp / G.shrine.max * 100) + '% (50% 이상)';
  if (O.type === 'survive') return '목표 · 끝까지 버티기 ' + Math.min(G.night + 1, G.nights.length) + '/' + G.nights.length;
  if (O.type === 'escort') return '목표 · 피난민 ' + O.saved + '/' + O.need + ' 구출 (잃음 ' + O.lost + ')';
  if (O.type === 'bossTime') return O.enr ? '목표 실패 · 우두머리 분노' : (G.bossRef && !G.bossRef.dead ? '목표 · 우두머리 ' + Math.max(0, Math.ceil(75 - O.bt)) + '초 안에!' : '목표 · 우두머리 75초 안에 처치');
  if (O.type === 'beacon') return '목표 · 봉화대 ' + Math.max(0, Math.round(O.beacon.hp / O.beacon.max * 100)) + '%';
  if (O.type === 'annihilate') return '목표 · 섬멸 ' + Math.min(G.kills, O.target) + '/' + O.target;
  return '';
}
function objUpdate(dt) {
  const O = G.obj; if (!O) return;
  const N = curN(), prog = Math.min(1, G.time / N.dur);
  if (O.type === 'escort') {
    const want = prog > 0.6 ? 2 : prog > 0.2 ? 1 : 0, made = O.refs.filter(r => r.night === G.night).length + (O.doneN && O.doneN[G.night] || 0);
    if (made < want && O.refs.length < 4) { const li = (Math.random() * LANE_X.length) | 0, p0 = D.lanePt(LANE_X[li], 0.15, li); O.refs.push({ kind: 'ref', night: G.night, x: p0.x + rnd(-60, 60), y: Math.max(camTop() + 120, p0.y), hp: 60 + 8 * G.ch, max: 60 + 8 * G.ch, r: 12, hitT: 0, sp: 62 }); G.bubble = { s: '피난민이 온다! 사당까지 지켜 줘', t: 2.4 }; }
    for (const r of O.refs) { r.hitT -= dt; let tx = G.shrine.x, ty = G.shrine.y - 60; const cr = allyCross(r, ty); if (cr) { tx = cr.x; ty = cr.y; } const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy) || 1; r.x += dx / d * r.sp * dt; r.y += dy / d * r.sp * dt; r.mvT = (r.mvT || 0) + dt;
      if (Math.abs(r.y - WALL_Y) < 16 && allyBlock(r.x)) r.y = r.y < WALL_Y ? WALL_Y - 16 : WALL_Y + 16;
      if (Math.hypot(r.x - G.shrine.x, r.y - G.shrine.y) < 90) { r.done = 1; O.saved++; O.doneN = O.doneN || {}; O.doneN[r.night] = (O.doneN[r.night] || 0) + 1; FX.ring(r.x, r.y, 60, '160,255,180', 0.5, 6); FX.num(r.x, r.y - 50, '구출!', false, '#8aff9a'); sfx('coin'); }
      else if (r.hp <= 0) { r.done = 1; O.lost++; O.doneN = O.doneN || {}; O.doneN[r.night] = (O.doneN[r.night] || 0) + 1; FX.smoke(r.x, r.y, 6, '150,140,130', 16, 40); G.banner = { s: '피난민을 잃었다', t: 1.4, kind: 'elite' }; } }
    O.refs = O.refs.filter(r => !r.done);
  }
  if (O.type === 'bossTime' && G.bossRef && !G.bossRef.dead && !O.enr) { O.bt += dt; if (O.bt > 75) { O.enr = true; const b = G.bossRef; b.sp *= 1.5; b.dmgK = (b.dmgK || 1) * 1.6; G.shrine.hp -= G.shrine.max * 0.2; G.shrine.hitT = 0.3; FX.shake = 0.6; G.banner = { s: '우두머리가 분노했다!', t: 2.4, kind: 'boss' }; sfx('warn'); vib([120, 60, 200]); } }
  if (O.type === 'beacon') { const B = O.beacon; B.hitT -= dt; if (B.hp > 0) B.hp = Math.min(B.max, B.hp + B.max * 0.01 * dt); if (Math.random() < dt * 10) FX.ember(B.x + rnd(-8, 8), B.y - 70, Math.random() < 0.5 ? '255,150,40' : '255,220,110', 1, 90); if (B.hp < B.max * 0.3 && !O.bwarn) { O.bwarn = 1; G.banner = { s: '봉화대가 무너진다!', t: 2, kind: 'boss' }; sfx('warn'); vib([80, 50, 80]); } }
}
/* 판 목표 소품 그림: 피난민 3종, 봉화대 */
const OBJIMG = {}; for (const k of ['refugee_a', 'refugee_b', 'refugee_c', 'beacon']) { const im = new Image(); im.onload = () => { OBJIMG[k] = im; }; im.src = 'sprites/' + k + '.png?v=1'; }
function drawObjThing(o) {
  if (o.kind === 'beacon' && OBJIMG.beacon) { const x = o.x, y = o.y, im = OBJIMG.beacon, h = 150, w2 = im.width * h / im.height; shadowE(x, y + 10, 46);
    const shake = o.hitT > 0 ? rnd(-2, 2) : 0; ctx.drawImage(im, x - w2 / 2 + shake, y + 14 - h, w2, h); if (o.hitT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(im, x - w2 / 2 + shake, y + 14 - h, w2, h); ctx.restore(); }
    if (o.hp < o.max * 0.5 && Math.random() < 0.2) FX.p({ kind: 'smoke', x: x + rnd(-20, 20), y: y - 40, vx: rnd(-8, 8), vy: -rnd(20, 40), life: 1.6, s: 6, s2: 20, c: '70,60,55', rot: 0, vr: 0.4 });
    if (Math.random() < 0.3) FX.p({ kind: 'smoke', x: x + rnd(-6, 6), y: y - h + 10, vx: rnd(-6, 6), vy: -rnd(30, 50), life: 2, s: 6, s2: 22, c: '110,100,95', rot: 0, vr: 0.4 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - h + 22, 40 + Math.sin(G.t * 11) * 6, '255,140,40', 0.6); ctx.restore();
    txt('봉화대', o.x, o.y + 34, 17, '#ffd36b', 'center', '#2a1408', 4); hpBar(o.x - 34, o.y - h - 6, 68, 7, o.hp / o.max, o.hp < o.max * 0.3 ? '#ff4a3a' : '#ffb03a'); return; }
  if (o.kind === 'beacon') { const x = o.x, y = o.y, w = o.hitT > 0; shadowE(x, y + 14, 40);
    /* 돌을 쌓은 봉수대: 아래 넓고 위 좁은 돌무더기 + 큰 횃불 */
    for (let r = 0; r < 4; r++) { const ww = 70 - r * 12, yy = y + 6 - r * 16; for (let i = 0; i < 4 - r * 0.5; i++) { const sx = x - ww / 2 + (i + 0.5) * ww / Math.max(1, 4 - r * 0.5); rrPath(sx - 10, yy - 12, 20, 15, 5); ctx.fillStyle = w ? '#fff' : (i + r) % 2 ? '#9a8f80' : '#7e7466'; ctx.fill(); ctx.strokeStyle = '#3a3026'; ctx.lineWidth = 2; ctx.stroke(); } }
    rrPath(x - 22, y - 62, 44, 10, 4); ctx.fillStyle = '#4a3020'; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - 80, 52 + Math.sin(G.t * 11) * 7, '255,140,40', 0.85); FX.glow(ctx, x, y - 76, 22, '255,230,140', 0.9, 1); ctx.restore();
    if (Math.random() < 0.3) FX.p({ kind: 'smoke', x: x + rnd(-6, 6), y: y - 100, vx: rnd(-6, 6), vy: -rnd(30, 50), life: 2, s: 6, s2: 22, c: '90,80,75', rot: 0, vr: 0.4 });
    txt('봉화대', o.x, o.y + 46, 17, '#ffd36b', 'center', '#2a1408', 4); hpBar(o.x - 30, o.y - 96, 60, 7, o.hp / o.max, o.hp < o.max * 0.3 ? '#ff4a3a' : '#ffb03a'); return; }
  if (o.kind === 'ref') { if (o.v == null) o.v = (Math.random() * 3) | 0; const RI = OBJIMG[['refugee_a', 'refugee_b', 'refugee_c'][o.v]];
    if (RI) { const bob = Math.abs(Math.sin((o.mvT || 0) * 9)) * 3, h = [104, 100, 86][o.v], w2 = RI.width * h / RI.height, x = o.x, y = o.y - bob; shadowE(o.x, o.y + 2, 13, 0.3);
      const tl = Math.sin((o.mvT || 0) * 9) * 0.05; ctx.save(); ctx.translate(x, y + 2); ctx.rotate(tl); if (o.flip) ctx.scale(-1, 1); ctx.drawImage(RI, -w2 / 2, -h, w2, h); if (o.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(RI, -w2 / 2, -h, w2, h); } ctx.restore();
      if (o.hitT > 0 && Math.random() < 0.3) txt('살려줘요!', x, y - h - 22, 13, '#ffd0d0', 'center', '#2a0c0c', 3);
      txt('피난민', x, y - h - 8, 14, '#bfffd0', 'center', '#0c1a10', 3); hpBar(x - 18, y - h - 2, 36, 5, o.hp / o.max, '#7ee060'); return; }
    const bob = Math.abs(Math.sin((o.mvT || 0) * 9)) * 3, x = o.x, y = o.y - bob; shadowE(o.x, o.y + 2, 12, 0.3);
    ctx.fillStyle = o.hitT > 0 ? '#fff' : '#e8dcc4'; rrPath(x - 11, y - 34, 22, 30, 8); ctx.fill(); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#8a5a3a'; rrPath(x + 4, y - 36, 14, 14, 4); ctx.fill(); ctx.stroke();
    circle(x, y - 44, 11); ctx.fillStyle = o.hitT > 0 ? '#fff' : '#f2c9a0'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#222'; circle(x - 4, y - 45, 1.8); ctx.fill(); circle(x + 4, y - 45, 1.8); ctx.fill(); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y - 49, 11, Math.PI, 0); ctx.fill();
    txt('피난민', x, y - 66, 14, '#bfffd0', 'center', '#0c1a10', 3); hpBar(x - 18, y - 60, 36, 5, o.hp / o.max, '#7ee060'); }
}
/* ---------- 피해 ---------- */
function hurtEnemy(e, dmg, src, o) {
  if (e.dead) return 0;
  o = o || {};
  dmg *= objBuildK(src, e);
  if (e.armor) dmg = Math.max(1, dmg - e.armor);
  if (EN[e.type] && EN[e.type].shield && src !== 'skill' && e.y < G.player.y - 20) { dmg *= 0.45; if (Math.random() < 0.15) FX.ring(e.x, e.y - e.hh * 0.5, e.r * 1.6, '200,170,110', 0.15, 3); }
  let crit = false;
  if (!o.nocrit && Math.random() < 0.05 + 0.12 * skLv('crit') + 0.1 * fxN('crit10') + 0.05 * fxN('crit5')) { dmg *= 2 + 0.5 * Math.min(1, skLv('crit')) + 0.3 * fxN('critDmg30'); crit = true; }
  if (e.slowT > 0 && src === 'building') dmg *= 1.1;
  if (e.elite || e.boss) dmg *= 1 + 0.25 * fxN('eliteDmg25');
  if (e.ward > 0) { dmg *= 0.3; if (Math.random() < 0.3) FX.ring(e.x, e.y - e.hh * 0.5, e.r * 2, '170,90,230', 0.2, 3); }
  e.hp -= dmg; e.hitT = 0.09; e.squash = 1;
  G.dmg[src || 'player'] += dmg;
  if (e.boss) G.bossDmg += dmg;
  if (fxN('execute') && !e.elite && !e.boss && e.hp > 0 && e.hp < e.max * 0.1) { e.hp = 0; FX.num(e.x, e.y - e.hh, '처형', false, '#ffd04a'); }
  if (src === 'player' && e.hp <= 0) e.byPlayer = true;
  if (!o.silent) {
    if (o.acc) { e.accD = (e.accD || 0) + dmg; if (!(e.accT > 0)) { e.accT = 0.3; } }
    else FX.num(e.x, e.y - e.hh * 0.9, dmg, crit, o.col);
  }
  if (!o.kb && !e.boss && e.hp > 0 && (dmg > e.max * 0.06 || crit) && (e.hitCd || 0) <= G.t && e.st !== 'rise' && e.st !== 'climb' && e.st !== 'hit') { e.hitCd = G.t + 0.55; const a = Math.atan2(e.y - G.player.y, e.x - G.player.x); if (SPR[EK(e.type)] && SPR[EK(e.type)].A && SPR[EK(e.type)].A.hit) { e.st = 'hit'; e.stT = 0.18; e.kbx = Math.cos(a) * 40; e.kby = Math.sin(a) * 40; } else { e.x += Math.cos(a) * 4; e.y += Math.sin(a) * 4; } }
  if (e.boss && dmg > e.max * 0.04 && (e.hitCd || 0) <= G.t) { e.hitCd = G.t + 0.8; e.lunge = -0.1; FX.shake = Math.max(FX.shake || 0, 0.12); }
  if (o.kb && !e.boss) { const a = Math.atan2(e.y - o.ky, e.x - o.kx); e.x += Math.cos(a) * o.kb; e.y += Math.sin(a) * o.kb; if ((o.kb >= 8 || dmg > e.max * 0.12) && e.st !== 'rise' && e.st !== 'climb' && SPR[EK(e.type)] && SPR[EK(e.type)].A && SPR[EK(e.type)].A.hit) { e.st = 'hit'; e.stT = 0.28; e.kbx = Math.cos(a) * 60; e.kby = Math.sin(a) * 60; } }
  if (e.hp <= 0) killEnemy(e);
  return dmg;
}
function hurtT(tg, dmg) {
  if (tg === G.player) {
    const p = G.player; if (p.invT > 0) return;
    if (fxN('dodge10') && Math.random() < 0.1 * fxN('dodge10')) { FX.num(p.x, p.y - 70, '회피', false, '#9fe8ff'); return; }
    dmg *= Math.pow(0.9, fxN('dmgCut10')) * (p.moving ? Math.pow(0.8, fxN('moveCut20')) : 1);
    if (G.tonicT > 0) dmg *= 0.6;
    if (G.shield > 0) { const a = Math.min(G.shield, dmg); G.shield -= a; dmg -= a; if (dmg <= 0) return; }
    if (fxN('lastStand') && !G.lastStandUsed && p.hp - dmg < p.max * 0.3) { G.lastStandUsed = true; p.invT = 2; FX.ring(p.x, p.y, 90, '255,240,160', 0.5, 8); G.banner = { s: '흑립의 가호! 잠시 무적', t: 1.6, kind: 'win' }; }
  }
  if (tg === G.shrine) { if (G.guards.some(g => g.id === 'turtle' && !(g.seal > 0))) dmg *= 0.7; if (G.shShield > 0) { const a = Math.min(G.shShield, dmg); G.shShield -= a; dmg -= a; if (dmg <= 0) { FX.ring(tg.x, tg.y - 40, 90, '255,215,110', 0.2, 4); return; } } G.alertT = 1.2; if (G.bubbleCd <= 0) { G.bubble = { s: '사당이 공격받고 있어!', t: 2.6 }; G.bubbleCd = 9; } }
  if (tg.kind === 'beacon') dmg *= 0.5;
  tg.hp -= dmg; tg.hitT = 0.12;
  if (tg.style === 'soldier' && tg.hp <= 0) { FX.smoke(tg.x, tg.y, 5, '150,140,120', 14, 30); G.corpses.push({ type: tg.spr, x: tg.x, y: tg.y, t: 0, sc: 1, dir: 1, d8: dir8(tg.fdir), hasDie: !!(SPR[tg.spr] && SPR[tg.spr].A && SPR[tg.spr].A.die), life: 2 }); }
  if (tg === G.player) { FX.num(tg.x, tg.y - 70, dmg, false, '#ff6a5a'); if ((G.vibT || 0) <= G.t) { G.vibT = G.t + 0.25; vib(dmg > tg.max * 0.1 ? 60 : 25); } }
}
/* 우두머리 처치: 금빛 장비 상자가 튀어나와 빛기둥 (실제 지급은 결과 화면) */
function drawLoot(L) {
  L.t += 1 / 60; const t = L.t; if (t > 6) { G.loot = null; return; }
  const up = Math.min(1, t / 0.6), hop = Math.sin(Math.min(1, t / 0.6) * Math.PI) * 120, x = L.x, y = L.y - hop + (1 - up) * 0 , open = Math.min(1, Math.max(0, (t - 0.9) / 0.4));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const a = Math.min(1, t / 0.8) * (t > 5 ? (6 - t) : 1);
  const gr = ctx.createLinearGradient(0, y - 420, 0, y); gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(1, 'rgba(255,220,120,' + 0.55 * a + ')');
  ctx.fillStyle = gr; ctx.fillRect(x - 34 - 6 * Math.sin(t * 6), y - 420, 68 + 12 * Math.sin(t * 6), 420);
  FX.glow(ctx, x, y - 20, 90 + 10 * Math.sin(t * 8), '255,210,110', 0.7 * a);
  ctx.restore();
  if (Math.random() < 0.4) FX.p({ kind: 'glow', x: x + rnd(-30, 30), y: y - rnd(0, 40), vy: -rnd(60, 140), life: 0.9, s: 6, s2: 1, c: '255,230,150' });
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = Math.min(1, a + 0.2); const s = 1 + 0.08 * Math.sin(t * 7);
  ctx.scale(s, s); shadowE(0, 16, 40, 0.35);
  rrPath(-34, -26, 68, 42, 8); ctx.fillStyle = '#8a4a1c'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#3a1c08'; ctx.stroke();
  ctx.fillStyle = '#ffcf4a'; ctx.fillRect(-34, -8, 68, 7); ctx.fillRect(-5, -26, 10, 42);
  ctx.save(); ctx.translate(0, -26); ctx.rotate(-open * 0.9); rrPath(-34, -18, 68, 20, 8); ctx.fillStyle = '#a65a22'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffcf4a'; ctx.fillRect(-5, -18, 10, 20); ctx.restore();
  if (open > 0) { ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, 0, -30, 50 * open, '255,240,180', 0.9); }
  ctx.restore();
}
/* 자폭 좀비 폭발 (r4) */
function bombBlast(e, dmg, byFoe) {
  if (e.blasted) return; e.blasted = 1; const x = e.x, y = e.y, R = 95;
  FX.explode(x, y - 20, 90); FX.ring(x, y, R, '255,140,40', 0.35, 10); FX.debris(x, y, 10, '#4a3020', 300); FX.shake = Math.max(FX.shake || 0, 0.25); sfx('boom'); vib(35);
  if (byFoe) { for (const o of G.enemies) if (o !== e && !o.dead && Math.hypot(o.x - x, (o.y - y) / 0.62) < R) hurtEnemy(o, (40 + G.ch * 6) * atkMul(), 'player'); }
  else { for (const tt of [G.player, G.shrine, ...G.turrets, ...(G.allies || [])]) if (tt && Math.hypot(tt.x - x, (tt.y - y) / 0.62) < R) hurtT(tt, dmg * 3);
    for (const w of G.walls) if (w.hp > 0 && Math.abs(w.x - x) < R && Math.abs(WALL_Y - y) < 70) { w.hp -= dmg * 4; w.hitT = 0.15; if (w.hp <= 0) wallBreak(w); } }
}
function killEnemy(e) {
  if (e.dead) return;
  if (EN[e.type] && EN[e.type].bomber && !e.blasted) bombBlast(e, 0, true);
  e.dead = true;
  if (e.mut === 'plague' && G.pzs) { G.pzs.push({ x: e.x, y: e.y, r: 62, t: 5, life: 5, tick: 0 }); FX.smoke(e.x, e.y, 5, '110,200,60', 16, 40); }
  G.kills++;
  const d = EN[e.type], big = e.elite || e.boss;
  if (!G.low && (big || Math.random() < 0.35)) { const n = big ? 6 : 1; for (let i = 0; i < n; i++) FX.p({ kind: 'glow', x: e.x + rnd(-8, 8), y: e.y - e.hh * 0.6, vx: rnd(-12, 12), vy: -rnd(70, 120), life: rnd(0.7, 1.1), s: big ? 18 : 11, s2: 2, c: big ? '255,210,120' : '150,240,200' }); }
  const xpM = (1 + 0.15 * fxN('xp15')) * (G.mode === 'xp' ? 3 : 1);
  G.orbs.push({ x: e.x, y: e.y, v: (d.xp || 1) * (big ? 4 : 1) * xpM, t: 0, vx: rnd(-60, 60), vy: rnd(-80, -20), z: 0, vz: 160 });
  const coinP = G.mode === 'gold' ? 1 : 0.22 + (pairOn('p_dok') ? 0.1 : 0);
  if (big || Math.random() < coinP) { const n = e.boss ? 18 : e.elite ? 8 : 1; for (let i = 0; i < n; i++) G.coins.push({ x: e.x, y: e.y, vx: rnd(-140, 140), vy: rnd(-90, 60), z: 0, vz: rnd(180, 320), t: 0, v: (e.boss ? 3 : 1) * (G.mode === 'gold' ? 3 : 1) * (1 + 0.3 * fxN('coin30')) }); }
  if (!big && !e.small && G.comps.some(c => c.active && c.id === 'bari' && Math.hypot(c.x - e.x, c.y - e.y) < 280) && Math.random() < 0.25) summonAlly(e.type, e.x, e.y, 'soul', 6, 14 * atkMul());
  if (big) G.pickups.push({ x: e.x + rnd(-20, 20), y: e.y + rnd(-10, 10), kind: pick(['magnet', 'bomb', 'yakgwa', 'pouch']), t: 0 });
  if (d.split && !e.small) for (let i = 0; i < 3; i++) { const s = spawnEnemy('zrat', e.x + rnd(-20, 20), e.y + rnd(-14, 14), { small: true }); s.cd = 0.6; }
  if (e.byPlayer && fxN('killBlast')) { FX.explode(e.x, e.y - 20, 50); for (const o of G.enemies) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 60) hurtEnemy(o, G.player.dmg * atkMul() * 0.8, 'player'); }
  if (fxN('killHeal')) { G.killHealN++; if (G.killHealN >= 50) { G.killHealN = 0; G.player.hp = Math.min(G.player.max, G.player.hp + G.player.max * 0.1); FX.num(G.player.x, G.player.y - 70, G.player.max * 0.1, false, '#7eff7e'); } }
  if (G.corpses.length > 70) G.corpses.shift();
  G.corpses.push({ type: e.type, x: e.x, y: e.y, flip: e.flip, t: 0, sc: e.sc, dir: e.flip ? -1 : 1, d8: e.d8 || 0, hasDie: !!(SPR[EK(e.type)] && SPR[EK(e.type)].A && SPR[EK(e.type)].A.die), life: 2.6, var: e.var });
  FX.goo(e.x, e.y + 2, d.fly ? '60,40,70' : '110,180,60', e.r * (big ? 2 : 1.1));
  FX.p({ kind: 'glow', x: e.x, y: e.y - e.hh * 0.5, life: 0.18, s: e.r * 3, s2: e.r, c: '220,255,160' });
  for (let i = 0; i < (big ? 18 : 7); i++) FX.p({ kind: 'glow', x: e.x, y: e.y - e.hh * 0.4, vx: rnd(-170, 170), vy: rnd(-220, 40), grav: 500, life: rnd(0.3, 0.55), s: rnd(4, 8), s2: 2, c: i % 3 ? '150,230,80' : '240,255,200' });
  if (big) { FX.explode(e.x, e.y - 20, e.boss ? 120 : 70, 'green'); sfx('boom'); if (e.boss) { G.slowmo = 0.9; G.freezeT = 0.18; G.flash = { c: '255,240,200', t: 0.35 }; vib([80, 40, 160]); G.banner = { s: d.n + ' 격파!', t: 2.2, kind: 'win' }; if (G.mode === 'adventure' || !G.mode) { G.loot = { x: e.x, y: e.y, t: 0 }; G.queue.push({ t: 1.3, fn: () => { G.banner = { s: '장비를 얻었다!', t: 2.0, kind: 'win' }; vib(40); } }); } if (G.obj && G.obj.type === 'bossTime' && !G.obj.enr) G.bossKilledFast = true; } else vib(30); }
}

/* ---------- 적 ---------- */
function camTop() { return Math.max(0, Math.min(camY, 420)); }
/* 백성 좀비 변종: 움직임 동작(anim), 속도 배율, 몸 크기, 체력 배율 */
const ZVAR = {
  shamble:   { n: '비틀이', anim: 'walk', sp: 1.0, w: 30 },
  runner:    { n: '질주 좀비', anim: 'run', sp: 2.1, w: 14, frenzy: 1 },
  limp:      { n: '절뚝이', anim: 'limp', sp: 0.7, w: 14 },
  crawl:     { n: '기어오는 좀비', anim: 'crawl', sp: 0.55, w: 10, low: 1, hp: 0.8 },
  onearm:    { n: '팔 부러진 좀비', anim: 'onearm', sp: 0.95, w: 9 },
  oneleg:    { n: '외다리 좀비', anim: 'oneleg', sp: 0.8, w: 8 },
  handstand: { n: '물구나무 좀비', anim: 'handstand', sp: 1.25, w: 5 },
  backward:  { n: '뒷걸음 좀비', anim: 'backward', sp: 0.85, w: 6, back: 1 }
};
function pickVar(type) {
  if (type !== 'peasant') return Math.random() < 0.12 && SPR[type] && SPR[type].A && SPR[type].A.run ? 'runner' : 'shamble';
  const sp = SPR.peasant, ok = k => ZVAR[k].anim === 'walk' || (sp && sp.A && sp.A[ZVAR[k].anim]);
  const ks = Object.keys(ZVAR).filter(ok), tot = ks.reduce((a, k) => a + ZVAR[k].w, 0); let r = Math.random() * tot;
  for (const k of ks) { r -= ZVAR[k].w; if (r <= 0) return k; } return 'shamble';
}
function spawnEnemy(type, x, y, o) {
  o = o || {};
  const d = EN[type], N = curN();
  let hp = d.hp * N.hp * (G.tierK || 1), sc = 1;
  const tr = TIER[type] || 2; if (!o.elite && !o.boss) hp *= (D.TIERHP && D.TIERHP[tr]) || 1; if (d.sc) sc = d.sc;
  if (o.elite) { hp *= 5; sc = Math.min(2.6, 1.5 * (d.sc || 1)); }
  if (o.small) { hp *= 0.25; sc = 0.6; }
  if (o.boss) { hp = type === 'king' ? d.hp * (1 + 0.3 * (G.ch - 1)) : d.hp * N.hp * (type === 'mujang' ? 2.4 : 4.5); sc = type === 'king' ? 1.6 : Math.min(2.2, 220 / (d.h || 100)); hp *= 1.35; }   /* 우두머리 화면 키 최대 약 220 */
  if (o.boss && G.cfg && G.cfg.wbBoss) { hp *= 60; sc *= 1.15; }
  const e = { type, x, y, r: d.r * sc, hp, max: hp, sp: d.sp * rnd(0.92, 1.08) * (o.boss ? 0.85 : 1), cd: rnd(0.3, 1), hitT: 0, wob: rnd(0, 6.28), turn: Math.random() < 0.5 ? 1 : -1,
    gx: rnd(-46, 46), elite: !!o.elite, boss: !!o.boss, small: !!o.small, armor: d.armor || 0, sc, charmT: 0, burnT: 0, jumpT: 0, var: 'shamble', st: 'move', stT: 0, twT: rnd(1, 5), twA: 0, screamed: false, d8: 0, pile: 0, atkT: 0, hh: (d.h || 60) * sc, slowT: 0, frzT: 0, stunT: 0, t1: rnd(3, 5), t2: 6, chg: 0, tele: 0, squash: 0, flip: false };
  if (!o.boss && !o.elite && !d.fly && !o.small) { e.var = pickVar(type); const V = ZVAR[e.var]; e.sp *= V.sp; if (V.hp) { e.hp *= V.hp; e.max = e.hp; } if (V.low) e.hh *= 0.45; }
  mutate(e);
  if (!o.boss && G.C && G.C.fresh && G.C.fresh.includes(type)) { G.seenNew = G.seenNew || {}; if (!G.seenNew[type]) { G.seenNew[type] = 1; G.banner = { s: '새 좀비 등장: ' + d.n, t: 2.2, kind: 'boss' }; FX.ring(e.x, e.y, 120, d.tint || '255,220,120', 0.5, 6); } }
  if (o.rise) { e.st = 'rise'; e.stT = 1.0; FX.debris(e.x, e.y, 8, '#4a3a2a', 160); FX.smoke(e.x, e.y, 4, '90,80,60', 16, 30); }
  G.enemies.push(e);
  return e;
}
/* 위협 단계: 챕터·몇 번째 밤·처용 레벨·밤 후반일수록 올라간다. 높을수록 약한 좀비가 강한 좀비로 바뀌고 변이체가 섞인다 */
const TIER = D.TIER || {};
const EK = t => (EN[t] && EN[t].spr) || t;   /* 상위 종은 원래 종 그림을 쓴다 */
function threat() { const late = Math.min(1, G.time / curN().dur); return (G.ch - 1) * 0.45 + G.night * 1.0 + (Math.min(G.player.lv, 20) - 1) * 0.25 + late * 1.5; }
function upgradeType(type) {
  const th = threat(), t0 = TIER[type] || 2; if (t0 >= 4) return type;
  if (Math.random() > Math.min(0.65, th * 0.045)) return type;
  /* 이 판 무리 중 더 높은 단계, 위협이 크면 전체 목록의 한 단계 위까지 */
  const C = D.CHAPTERS[G.ch - 1]; let pool = C.pool.filter(k => (TIER[k] || 2) > t0 && EN[k]);
  /* 아직 공개되지 않은 적은 끌어오지 않는다: 이번 장까지 나온 적 중 한 단계 위만 */
  if (th > 6) { const rv = D.revealed ? D.revealed(G.ch) : new Set(); pool = pool.concat([...rv].filter(k => TIER[k] === Math.min(5, t0 + 1) && EN[k] && !EN[k].fly)); }
  if (G.nm && D.VAR_OF && D.VAR_OF[type] && Math.random() < 0.45) return D.VAR_OF[type];
  /* UPPER_GATE: 상위 종은 그 밤 무리에 들어 있거나 3번째 밤부터만 끌어온다 (첫 밤 사당 즉사 방지) */
  if (!G.nm && D.VAR_OF && G.night < 2) { const UP = new Set(Object.values(D.VAR_OF)), mix = curN().mix || {}; pool = pool.filter(k => !UP.has(k) || mix[k]); }
  return pool.length ? pick(pool) : type;
}
/* 변이체: 철갑(단단함), 광폭(빠르고 셈), 거대(크고 체력 많음) */
const MUT = { plague: { n: '역병 걸린', c: '130,230,60' }, armor: { n: '철갑', c: '170,190,210' }, rage: { n: '광폭', c: '255,70,40' }, giant: { n: '거대', c: '190,120,255' } };
function mutate(e) {
  if (e.boss || e.elite || e.small || EN[e.type].fly) return;
  if (G.nm && Math.random() < 0.16) { e.mut = 'plague'; e.hp *= 1.3; e.max = e.hp; return; }
  const th = threat(); if (Math.random() > Math.min(0.3, Math.max(0, th - 3) * 0.025)) return;
  const m = th > 8 && Math.random() < 0.35 ? 'giant' : Math.random() < 0.5 ? 'armor' : 'rage'; e.mut = m;
  if (m === 'armor') { e.armor = (e.armor || 0) + 4 + G.ch * 0.4; e.hp *= 1.6; }
  else if (m === 'rage') { e.sp *= 1.45; e.dmgK = 1.35; e.hp *= 1.2; }
  else { e.sc *= 1.35; e.r *= 1.35; e.hh *= 1.35; e.hp *= 3; e.sp *= 0.8; e.dmgK = 1.6; }
  e.max = e.hp;
}
function spawnWave() {
  const N = curN(), late = Math.min(1, G.time / N.dur);
  let type = N.base, acc = 0;
  const r = Math.random();
  for (const k in N.mix) { acc += N.mix[k] * (0.6 + late); if (r < acc) { type = k; break; } }
  type = upgradeType(type);
  /* 큰 적 마릿수: 무기 든·말 탄 좀비는 덩치·체력이 큰 대신 덜 나온다 */ if (EN[type] && EN[type].big && Math.random() < 0.38) return;
  const lane = (Math.random() * LANE_X.length) | 0;
  const x = LANE_X[lane] + rnd(-80, 80), y = camTop() - rnd(40, 100);
  if (type === 'zrat') { for (let i = 0; i < 2; i++) spawnEnemy('zrat', x + rnd(-30, 30), y + rnd(-20, 20)); return; }
  if (type === 'zcrow') { for (let i = 0; i < 3; i++) spawnEnemy('zcrow', x + rnd(-40, 40), y + rnd(-30, 30)); return; }
  if (EN[type] && EN[type].swarm) { for (let i = 0; i < EN[type].swarm; i++) spawnEnemy(type, x + rnd(-50, 50), y + rnd(-40, 40)); return; }
  if (Math.random() < 0.28 && !EN[type].fly) { const gy = Math.max(camTop() + 60, Math.min(WALL_Y - 260, camY + rnd(40, 260))); spawnEnemy(type, x, gy, { rise: true }); }
  else spawnEnemy(type, x, y);
  { const tt = TIER[type] || 2; if (Math.random() < (tt <= 2 ? 0.35 : tt === 3 ? 0.15 : 0)) spawnEnemy(upgradeType(N.base), x + rnd(-40, 40), y - rnd(20, 60)); }
}
function spawnBig(type, boss) {
  const lane = (Math.random() * LANE_X.length) | 0, x = LANE_X[lane] + rnd(-30, 30), y = camTop() - 90;
  const e = spawnEnemy(type, x, y, boss ? { boss: true } : { elite: true });
  if (boss) { /* 등장: 큰 그림자가 먼저 드리우고 땅이 흔들린다 */ FX.shake = Math.max(FX.shake || 0, 0.9); G.tele.push({ x: e.x, y: Math.max(e.y, camTop() + 140), r: e.r * 4.5, t: 1.2, life: 1.2, c: '120,0,0' }); for (let i = 0; i < 3; i++) G.queue.push({ t: 0.35 * i, fn: () => { FX.shake = 0.5; FX.debris(e.x + rnd(-80, 80), e.y + rnd(-20, 40), 8, '#4a3a2a', 260); } });
    G.bossRef = e; G.banner = { s: (G.ch === D.CHAPTERS.length ? '최후의 결전! ' : '우두머리 출현! ') + EN[type].n, t: 2.8, kind: 'boss' }; if (G.ch === D.CHAPTERS.length) { e.hp *= 1.2; e.max = e.hp; G.flash = { c: '150,20,40', t: 1.2 }; G.title = { s: '역신 강림', sub: '조선의 마지막 밤', t: 3, big: 1 }; FX.ring(e.x, e.y, 360, '255,60,80', 1.2, 14); } G.crisisT = 4; sfx('warn'); vib([120, 80, 120, 80, 240]); FX.shake = 0.5; }
  else G.banner = { s: '정예 출현!', t: 2.4, kind: 'elite' };
  sfx('warn');
  return e;
}

/* ---------- 낮: 사방신, 짓기 ---------- */
const ovLevel = $('ovLevel'), cards = $('cards');
function guardChoices() { return Object.keys(GUARD).filter(id => !G.guards.some(g => g.id === id)); }
/* 낮이 오면: 사방신(짝수 밤) → 진지 구축 카드(둘째 낮부터) → 낮 */
function startDay() {
  G.daySteps = [];
  const cap = G.ch >= 10 ? 4 : G.ch >= 7 ? 3 : G.ch >= 4 ? 2 : G.ch >= 2 ? 1 : 0;
  if (G.guards.length < cap && G.night >= 2 && (G.night - 2) % 2 === 0 && guardChoices().length && G.mode !== 'boss') G.daySteps.push(openGuard);
  if (G.night > 0) G.daySteps.push(openBuildCard);
  nextDayStep();
}
function nextDayStep() { const f = G.daySteps && G.daySteps.shift(); if (f) f(); else enterDay(); }
function openBuildCard() {
  const opts = [], cap = D.HQ[G.hq].max;
  const empty = PADS.map((q, i) => i).filter(i => !G.turrets.some(t => t.pad === i));
  const ups = G.turrets.filter(t => t.lv < cap && TUR[t.type].kind !== 'mine');
  const types = Object.keys(TUR).filter(k => !D.tUnlocked || D.tUnlocked(k, G.ch, G.nm));
  const pool = [];
  for (let i = 0; i < 3 && empty.length; i++) pool.push({ k: 'build', type: pick(types) });
  for (let i = 0; i < 2 && ups.length; i++) pool.push({ k: 'up', t: pick(ups) });
  if (G.hq < 5) pool.push({ k: 'hq' });
  if (G.wallLv < 5) pool.push({ k: 'wall' });
  while (opts.length < 3 && pool.length) { const o = pool.splice((Math.random() * pool.length) | 0, 1)[0]; if (o.k === 'build' && opts.some(q => q.k === 'build' && q.type === o.type)) continue; if (o.k === 'up' && opts.some(q => q.k === 'up' && q.t === o.t)) continue; opts.push(o); }
  G.phase = 'guard';
  $('lvTitle').textContent = '진지 구축';
  $('lvSub').textContent = '하나를 골라 공짜로 짓거나 올립니다';
  cards.innerHTML = '';
  for (const o of opts) {
    const b = document.createElement('button'); b.className = 'card buff';
    let ic = '', n = '', d = '';
    if (o.k === 'build') { const T = TUR[o.type]; ic = 'sprites/' + T.spr + '.png'; n = '1레벨 ' + T.name; d = T.d; }
    else if (o.k === 'up') { const T = TUR[o.t.type]; ic = 'sprites/' + T.spr + '.png'; n = (o.t.lv + 1) + '레벨 ' + T.name; d = '이미 세운 ' + T.name + '을 강화한다 (위력 +40%)'; }
    else if (o.k === 'hq') { ic = 'sprites/base.png'; n = '본부 ' + (G.hq + 1) + '레벨'; d = '사당 내구도와 밤 보상이 오르고 시설을 더 높이 올릴 수 있다' + (G.hq === 1 && G.comps.length > 1 ? ' · 둘째 동료 합류' : ''); }
    else { ic = 'sprites/wall.png'; n = (G.wallLv + 1) + '레벨 성벽'; d = G.wallLv ? '성벽과 성문을 강화한다' : '성벽과 성문을 세워 지상 좀비를 막는다'; }
    b.innerHTML = '<div class="ic" style="background:#fff3d0 url(' + ic + ') center/contain no-repeat;border-radius:18px"></div><div class="tx"><div class="n">' + n + ' <em>공짜</em></div><div class="d">' + d + '</div></div>';
    b.addEventListener('click', () => {
      ovLevel.classList.remove('on');
      if (o.k === 'build') { const pad = pick(empty); G.gold += TUR[o.type].cost; build(pad, o.type); }
      else if (o.k === 'up') upTurret(o.t, true);
      else if (o.k === 'hq') upHQ(true);
      else buildWalls(true);
      sfx('build');
      nextDayStep();
    });
    cards.appendChild(b);
  }
  ovLevel.classList.add('on');
}
function upTurret(t, free) {
  const d = TUR[t.type], up = Math.round(d.cost * (0.8 + t.lv * 0.6));
  if (t.lv >= D.HQ[G.hq].max) return false;
  if (!free) { if (G.gold < up) return false; G.gold -= up; }
  t.lv++; t.max = d.hp * (1 + 0.4 * (t.lv - 1)); t.hp = t.max;
  FX.ring(t.x, t.y, 70, '255,226,140', 0.5, 6); FX.spark(t.x, t.y - 30, '255,230,150', 20, 300); sfx('build'); G.padKey = '';
  return true;
}
function upHQ(free) {
  if (G.hq >= 5) return false;
  const H2 = D.HQ[G.hq + 1];
  if (!free) { if (G.gold < H2.cost) return false; G.gold -= H2.cost; }
  G.hq++; G.shrine.max += H2.hp - D.HQ[G.hq - 1].hp; G.shrine.hp = G.shrine.max;
  FX.explode(G.shrine.x, G.shrine.y - 40, 90, null); FX.ring(G.shrine.x, G.shrine.y, 220, '255,230,160', 0.7, 10);
  G.banner = { s: '본부 ' + G.hq + '레벨!', t: 1.8, kind: 'win' };
  G.comps.forEach((c, i) => { if (!c.active && i < H2.comps) { c.active = true; c.drop = 1; c.x = G.player.x + 60; c.y = G.player.y + 30; G.queue.push({ t: 0.75, fn: () => { FX.explode(c.x, c.y - 10, 80, 'blue'); FX.ring(c.x, c.y, 140, '200,240,255', 0.5, 10); sfx('boom'); G.banner = { s: COMP[c.id].n + ' 합류!', t: 1.8, kind: 'win' }; } }); } });
  G.padKey = ''; sfx('build');
  return true;
}
function openGuard() {
  const ch = guardChoices();
  if (!ch.length) return nextDayStep();
  G.phase = 'guard';
  $('lvTitle').textContent = '사방신을 깨운다';
  $('lvSub').textContent = curN().name + ' · ' + G.C.name;
  cards.innerHTML = '';
  for (const id of ch.slice(0, 3)) {
    const Gd = GUARD[id], b = document.createElement('button');
    b.className = 'card guard';
    b.innerHTML = '<div class="ic" style="background:url(sprites/guard_' + id + '.png) center/120% no-repeat,radial-gradient(circle at 35% 30%,#fff,rgb(' + Gd.c + ') 60%,#222)"></div><div class="tx"><div class="n">' + Gd.n + ' <span class="side">' + Gd.side + '</span></div><div class="d">' + Gd.d + '</div></div>';
    b.addEventListener('click', () => { G.guards.push({ id, x: Gd.x, y: Gd.y, cd: 0.5, pulse: 0 }); G.turrets = G.turrets.filter(t => Math.hypot(t.x - Gd.x, t.y - Gd.y) >= 46); ovLevel.classList.remove('on'); FX.explode(Gd.x, Gd.y - 20, 70, id === 'dragon' || id === 'turtle' ? 'blue' : null); FX.ring(Gd.x, Gd.y, 120, Gd.c, 0.6, 8); nextDayStep(); });
    cards.appendChild(b);
  }
  ovLevel.classList.add('on');
}
function enterDay() {
  G.phase = 'day'; G.padKey = '';
  $('btnBattle').classList.add('on');
  for (const t of G.turrets) t.hp = t.max;
  for (const w of G.walls) if (w.built) w.hp = w.max;
}
const bPanel = $('buildPanel'), bpTitle = $('bpTitle'), bpRow = $('bpRow');
/* 건설 카드: 그림 칸 줄 + 설명 상자 + 건설 단추 (후더덕식) */
let selBuild = 'arrow';
/* 장승 한 쌍: 천하대장군과 지하여장군이 함께 서면 서로 힘을 더한다 */
function jangPair() { if (!G || !G.turrets) return false; let a = 0, b = 0; for (const o of G.turrets) { if (o.type === 'general') a = 1; else if (o.type === 'lady') b = 1; } return a && b; }
function lvInfo(k, lv) {
  const d = TUR[k], m = 1 + 0.4 * (lv - 1);
  if (k === 'arrow') { const c = crewOf({ lv }); return (c[0] === 's_gun' ? '조총수' : c[0] === 's_crossbow' ? '연노병' : '궁수') + ' ' + c[1] + '명이 쏜다'; }
  if (k === 'barracks') return '병사 최대 ' + (2 + Math.floor(lv * 1.5)) + '명 · ' + Object.keys(D.SOLDIER).filter(s => D.SOLDIER[s].unlock <= lv).map(s => D.SOLDIER[s].n).join(', ');
  if (k === 'mine') return '밤마다 엽전 +' + d.income * lv;
  if (k === 'well') return '주변 회복 ' + d.heal * lv + '/초';
  if (k === 'general') return '광선 피해 ' + Math.round(d.dmg * m) + ' · 사거리 ' + d.range + (jangPair() ? ' · 짝 효과: 피해 +40%, 옆 적에게 튐' : ' · 지하여장군과 짝이면 더 강해짐');
  if (k === 'lady') return '느려짐 50% · 초당 피해 ' + Math.round(d.dps * m) + (jangPair() ? ' · 짝 효과: 범위 +30%' : ' · 천하대장군과 짝이면 범위 확대');
  if (d.dmg) return '피해 ' + Math.round(d.dmg * m) + ' · 사거리 ' + d.range;
  if (d.dps) return '초당 피해 ' + Math.round(d.dps * m) + ' · 사거리 ' + d.range;
  return d.d;
}
function buildUI() {
  const p = G.player; let pad = -1, bd = 60;
  for (let i = 0; i < PADS.length; i++) { const dd = Math.hypot(PADS[i][0] - p.x, PADS[i][1] + 6 - p.y); if (dd < bd) { bd = dd; pad = i; } }
  const nearHQ = pad < 0 && Math.hypot(p.x - G.shrine.x, p.y - G.shrine.y) < 140;
  const nearWall = pad < 0 && !nearHQ && Math.abs(p.y - WALL_Y) < 70;
  const t = pad < 0 ? null : G.turrets.find(o => o.pad === pad);
  const key = pad + '|' + nearHQ + '|' + nearWall + '|' + G.wallLv + '|' + G.hq + '|' + (t ? t.type + t.lv : selBuild) + '|' + G.gold;
  if (key === G.padKey) return; G.padKey = key; G.nearPad = pad;
  if (pad < 0 && !nearHQ && !nearWall) { bPanel.classList.remove('on'); return; }
  const btn = (label, cost, ok, fn, cls) => { const b = document.createElement('button'); b.className = 'bbtn ' + (cls || '') + (ok ? '' : ' no'); b.innerHTML = label + (cost != null ? '<small><i></i>' + cost + '</small>' : ''); b.addEventListener('click', ev => { ev.stopPropagation(); if (ok) fn(); }); return b; };
  bpRow.innerHTML = ''; bpTitle.innerHTML = '';
  const info = document.createElement('div'); info.className = 'binfo'; const acts = document.createElement('div'); acts.className = 'bacts';
  if (nearWall) {
    const cost = 80 + G.wallLv * 70;
    info.innerHTML = '<div class="bthumb" style="background-image:url(sprites/wall.png)"></div><b>' + (G.wallLv ? G.wallLv + '레벨 성벽' : '성벽 (없음)') + '</b><p>지상 좀비가 성벽부터 부숴야 들어온다. 성문 포함</p>' + (G.wallLv < 5 ? '<p class="nx">' + (G.wallLv + 1) + '레벨: 성벽 체력 ' + Math.round(100 + 45 * G.wallLv) + '%</p>' : '<p class="nx">최고 레벨</p>');
    if (G.wallLv < 5) acts.appendChild(btn(G.wallLv ? '강화' : '건설', cost, G.gold >= cost, () => buildWalls(false), 'big'));
  } else if (nearHQ) {
    const H2 = D.HQ[G.hq + 1];
    info.innerHTML = '<b>' + G.hq + '레벨 사당(본부)</b><p>시설 최대 ' + D.HQ[G.hq].max + '레벨 · 동료 ' + D.HQ[G.hq].comps + '명</p>' + (H2 ? '<p class="nx">다음: 시설 ' + H2.max + '레벨까지' + (H2.comps > D.HQ[G.hq].comps ? ', 동료 +1' : '') + ', 밤마다 엽전 +' + H2.gold + '</p>' : '<p class="nx">최고 레벨</p>');
    if (H2) acts.appendChild(btn('강화', H2.cost, G.gold >= H2.cost, () => upHQ(false)));
  } else if (!t) {
    for (const k in TUR) { const d = TUR[k], b = document.createElement('button'), lockCh = D.tUnlocked && !D.tUnlocked(k, G.ch, G.nm) ? D.TUR_UNLOCK[k] : 0; b.className = 'bic' + (k === selBuild ? ' sel' : '') + (G.gold < d.cost || lockCh ? ' no' : '') + (lockCh ? ' lock' : ''); b.innerHTML = '<i style="background-image:url(sprites/' + d.spr + '.png)"></i><span>' + d.name + '</span>' + (lockCh ? '<em class="blk">🔒' + lockCh + '장</em>' : (G.chEl && TUR_EL[k] === G.chEl.el ? '<em class="bel" style="background:' + D.EL[G.chEl.el].c + '">유리</em>' : '')); b.addEventListener('click', ev => { ev.stopPropagation(); selBuild = k; G.padKey = ''; }); bpRow.appendChild(b); }
    const d = TUR[selBuild];
    const lockS = D.tUnlocked && !D.tUnlocked(selBuild, G.ch, G.nm) ? D.TUR_UNLOCK[selBuild] : 0;
    info.innerHTML = '<b>1레벨 ' + d.name + '</b><p>' + d.d + '</p>' + (lockS ? '<p class="nx" style="color:#ffb0a0">🔒 ' + lockS + '장에서 열려요</p>' : '<p class="nx">' + lvInfo(selBuild, 1) + '</p>' + (G.chEl && TUR_EL[selBuild] === G.chEl.el ? '<p class="nx" style="color:' + D.EL[G.chEl.el].c + '">이 장 약점 속성 · 피해 +' + Math.round(G.chEl.k * 100) + '%</p>' : '')) + pairTxt(selBuild);
    acts.appendChild(btn('건설', d.cost, !lockS && G.gold >= d.cost, () => build(pad, selBuild), 'big'));
  } else {
    const d = TUR[t.type], up = Math.round(d.cost * (0.8 + t.lv * 0.6)), cap = D.HQ[G.hq].max;
    info.innerHTML = '<div class="bthumb" style="background-image:url(sprites/' + d.spr + '.png)"></div><b>' + t.lv + '레벨 ' + d.name + '</b><p>' + lvInfo(t.type, t.lv) + '</p>' + (t.lv < 5 ? '<p class="nx">다음 ' + (t.lv + 1) + '레벨: ' + lvInfo(t.type, t.lv + 1) + (t.lv >= cap ? ' (사당 레벨 필요)' : '') + '</p>' : '<p class="nx">최고 레벨</p>') + pairTxt(t.type);
    if (t.lv < 5) acts.appendChild(btn('강화', up, G.gold >= up && t.lv < cap, () => upTurret(t, false), 'big'));
    acts.appendChild(btn('거두기', '+' + Math.round(d.cost * 0.7), true, () => { G.gold += Math.round(d.cost * 0.7); G.turrets = G.turrets.filter(o => o !== t); FX.smoke(t.x, t.y, 6); G.padKey = ''; }, 'sell'));
  }
  bpTitle.appendChild(info); bpTitle.appendChild(acts);
  bPanel.classList.add('on');
}
function build(pad, k) {
  if (D.tUnlocked && !D.tUnlocked(k, G.ch, G.nm)) { G.bubble = { s: TUR[k].name + '은(는) ' + D.TUR_UNLOCK[k] + '장에서 열려요', t: 2 }; return false; }
  const d = TUR[k]; if (G.gold < d.cost || G.turrets.some(t => t.pad === pad)) return;
  G.gold -= d.cost;
  const t = { type: k, lv: 1, pad, x: PADS[pad][0], y: PADS[pad][1], r: 16, hp: d.hp, max: d.hp, cd: rnd(0, 0.4), hitT: 0, pulse: 0, fire: 0, rise: 0.45 };
  G.turrets.push(t);
  FX.smoke(t.x, t.y + 10, 10, '200,190,170', 20, 40); FX.ring(t.x, t.y + 10, 60, '255,240,200', 0.4, 5); FX.debris(t.x, t.y, 8, '#8a7a60', 200); sfx('build');
  G.padKey = '';
}
$('btnBattle').addEventListener('click', () => startNight());
function startNight() {
  if (!G || G.phase !== 'day') return;
  $('btnBattle').classList.remove('on'); bPanel.classList.remove('on');
  G.phase = 'night'; G.time = 0; G.spawnAcc = 0; G.eliteIdx = 0; G.bossOut = false;
  if (fxN('shield')) G.shield = G.player.max * 0.25;
  if (G.pendingLv > 0) setTimeout(() => { if (G && G.phase === 'night') openLevel(); }, 2300);
  const N = curN();
  const elNote = G.night === 0 && G.chEl ? ' · 약점 ' + D.EL[G.chEl.el].n + ' +' + Math.round(G.chEl.k * 100) + '%' : '';
  G.title = { s: (G.nm ? '악몽 ' : '') + N.name, sub: (G.night === 0 && G.obj ? (G.bubble = { s: G.obj.d + (OBJ_BUILD[G.obj.type] && OBJ_BUILD[G.obj.type][0] ? ' · 추천: ' + OBJ_BUILD[G.obj.type][1] + ' (피해 +25%)' : ''), t: 5 }, '목표 · ' + G.obj.n + ((G.tierK || 1) > 1.05 ? ' · 판 등급 ×' + (G.tierK).toFixed(1) : '')) : G.C.name + (N.kind === 'boss' ? ' · 우두머리의 밤' : '')) + elNote, t: G.night === 0 ? 3 : 2.2 };
  sfx('warn', 0.6);
}

/* ---------- 성장 카드 ---------- */
const ICON = {};
const SKI = {};
for (const s of SKILLS) { const im = new Image(); im.onload = () => { SKI[s.id] = im; }; im.src = 'img/skills/' + s.id + '.webp'; const ie = new Image(); ie.onload = () => { SKI['ev_' + s.id] = ie; }; ie.src = 'img/skills/ev_' + s.id + '.webp'; }
function skillIcon(id, s) {
  const key = id + s; if (ICON[key]) return ICON[key];
  const sk = SKILLS.find(o => o.id === id) || { c: '#ccc', kind: 'buff' };
  const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), m = s / 2;
  const gr = g.createRadialGradient(m * 0.7, m * 0.6, 2, m, m, m); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, sk.c); gr.addColorStop(1, '#1a1020');
  g.fillStyle = gr; g.beginPath(); g.arc(m, m, m - 2, 0, TAU); g.fill();
  g.lineWidth = s * 0.06; g.strokeStyle = sk.kind === 'atk' ? '#ffd46a' : '#bfe9d0'; g.stroke();
  g.save(); g.translate(m, m); g.scale(s / 100, s / 100); g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 7; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 6;
  const path = { 
    ghost: () => { g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(22, -10, 26, 16, 0, 26); g.bezierCurveTo(-26, 16, -22, -10, 0, -30); g.fill(); g.fillStyle = sk.c; g.beginPath(); g.arc(-7, 6, 4, 0, TAU); g.arc(7, 6, 4, 0, TAU); g.fill(); },
    meteor: () => { g.beginPath(); g.moveTo(-30, -30); g.lineTo(4, 0); g.stroke(); g.beginPath(); g.arc(10, 10, 15, 0, TAU); g.fill(); },
    thunder: () => { g.beginPath(); g.moveTo(8, -32); g.lineTo(-14, 4); g.lineTo(2, 4); g.lineTo(-8, 32); g.lineTo(16, -6); g.lineTo(0, -6); g.closePath(); g.fill(); },
    ice: () => { for (let i = 0; i < 3; i++) { g.save(); g.rotate(i * Math.PI / 3); g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 30); g.stroke(); g.restore(); } },
    dance: () => { g.beginPath(); g.moveTo(0, 24); g.arc(0, 24, 46, -2.4, -0.74); g.closePath(); g.fill(); g.fillStyle = sk.c; g.beginPath(); g.arc(0, 24, 6, 0, TAU); g.fill(); },
    talisman: () => { g.fillRect(-14, -28, 28, 56); g.strokeStyle = '#c01a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-6, -18); g.lineTo(6, -6); g.lineTo(-6, 6); g.lineTo(6, 18); g.stroke(); },
    beam: () => { g.beginPath(); g.moveTo(-30, 26); g.lineTo(28, -26); g.lineWidth = 10; g.stroke(); g.beginPath(); g.arc(28, -26, 9, 0, TAU); g.fill(); },
    vortex: () => { g.lineWidth = 6; g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const r = a * 2.6; g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8); } g.stroke(); },
    rapid: () => { for (const y of [-12, 12]) { g.beginPath(); g.moveTo(-20, y - 12); g.lineTo(0, y); g.lineTo(-20, y + 12); g.stroke(); g.beginPath(); g.moveTo(0, y - 12); g.lineTo(20, y); g.lineTo(0, y + 12); g.stroke(); } },
    multi: () => { for (const a of [-0.4, 0, 0.4]) { g.save(); g.rotate(a); g.beginPath(); g.moveTo(0, 26); g.lineTo(0, -22); g.stroke(); g.beginPath(); g.moveTo(-8, -14); g.lineTo(0, -26); g.lineTo(8, -14); g.fill(); g.restore(); } },
    pierce: () => { g.beginPath(); g.moveTo(-30, 0); g.lineTo(26, 0); g.stroke(); g.beginPath(); g.moveTo(16, -10); g.lineTo(30, 0); g.lineTo(16, 10); g.fill(); g.lineWidth = 4; g.strokeRect(-8, -16, 12, 32); },
    power: () => { g.beginPath(); g.moveTo(0, -30); g.lineTo(9, -9); g.lineTo(30, -9); g.lineTo(13, 5); g.lineTo(19, 27); g.lineTo(0, 14); g.lineTo(-19, 27); g.lineTo(-13, 5); g.lineTo(-30, -9); g.lineTo(-9, -9); g.closePath(); g.fill(); },
    crit: () => { g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.beginPath(); g.moveTo(0, -32); g.lineTo(0, -14); g.moveTo(0, 32); g.lineTo(0, 14); g.moveTo(-32, 0); g.lineTo(-14, 0); g.moveTo(32, 0); g.lineTo(14, 0); g.stroke(); },
    swift: () => { g.beginPath(); g.moveTo(-26, 20); g.quadraticCurveTo(0, 10, 10, -20); g.lineTo(26, -20); g.stroke(); g.beginPath(); g.moveTo(-30, 0); g.lineTo(-10, 0); g.moveTo(-26, -14); g.lineTo(-6, -14); g.stroke(); },
    magnet: () => { g.lineWidth = 11; g.beginPath(); g.arc(0, 0, 20, Math.PI, 0); g.lineTo(20, 22); g.moveTo(-20, 0); g.lineTo(-20, 22); g.stroke(); },
    heal: () => { g.fillRect(-8, -26, 16, 52); g.fillRect(-26, -8, 52, 16); },
    repair: () => { g.beginPath(); g.moveTo(-28, 4); g.lineTo(0, -24); g.lineTo(28, 4); g.closePath(); g.fill(); g.fillRect(-18, 4, 36, 22); },
    bond: () => { g.lineWidth = 8; g.beginPath(); g.arc(-11, 0, 15, 0, TAU); g.stroke(); g.beginPath(); g.arc(11, 0, 15, 0, TAU); g.stroke(); },
    bless: () => { g.fillRect(-10, -28, 20, 52); g.beginPath(); g.arc(-4, -12, 3, 0, TAU); g.arc(4, -12, 3, 0, TAU); g.fillStyle = '#333'; g.fill(); }
  }[id];
  if (path) path();
  g.restore();
  return (ICON[key] = c);
}
function evoReady() { if (!G.evo) G.evo = {}; return Object.keys(D.EVO).filter(id => !G.evo[id] && skLv(id) >= (fxN('awaken') ? 4 : 5) && skLv(D.EVO[id].pair) > 0); }
function levelChoices() {
  const ev = evoReady(); if (ev.length) { const id = ev[0], S0 = SKILLS.find(s => s.id === id); return [{ id: 'ev_' + id, evo: id, n: D.EVO[id].n, kind: 'evo', max: 1, c: S0.c, d: () => D.AWAKE[id] || '진화!' }, ...levelChoicesBase().slice(0, 2)]; }
  return levelChoicesBase();
}
function levelChoicesBase() {
  const ownAtk = SKILLS.filter(s => s.kind === 'atk' && skLv(s.id) > 0).length;
  const pool = SKILLS.filter(s => skLv(s.id) < s.max && (!s.need || s.need(G)) && !(s.kind === 'atk' && !skLv(s.id) && ownAtk >= 6));
  const w = pool.map(s => (s.kind === 'atk' ? (skLv(s.id) ? 3 : 2.2) : 1) * (s.id === 'repair' && G.shrine.hp < G.shrine.max * 0.5 ? 3 : 1));
  const out = [];
  while (out.length < 3 && pool.length) { let tot = w.reduce((a, b) => a + b, 0), r = Math.random() * tot, i = 0; while (r > w[i]) { r -= w[i]; i++; } out.push(pool.splice(i, 1)[0]); w.splice(i, 1); }
  return out;
}
function evoHint(s) {
  if (s.evo) return '';
  if (s.kind === 'atk' && D.EVO[s.id]) { const P = SKILLS.find(o => o.id === D.EVO[s.id].pair); const own = skLv(P.id) > 0, lv = skLv(s.id) + 1; return '<div class="link" style="color:' + (own && lv >= 5 ? '#ffd34a' : '#e8d6a8') + '">' + (own && lv >= 5 ? '★ 짝 완성! 다음에 진화 → ' + D.EVO[s.id].n : '진화 짝 · ' + P.n + (own ? ' (보유)' : '')) + '</div>'; }
  const atk = Object.keys(D.EVO).find(k => D.EVO[k].pair === s.id && skLv(k) > 0);
  if (atk) { const A0 = SKILLS.find(o => o.id === atk), ready = skLv(atk) >= (fxN('awaken') ? 4 : 5) && !skLv(s.id); return '<div class="link" style="color:' + (ready ? '#ffd34a' : '#e8d6a8') + '">' + (ready ? '★ 짝 완성! 고르면 ' + A0.n + ' 진화 → ' + D.EVO[atk].n : '진화 짝 · ' + A0.n + ' (' + skLv(atk) + '/5)') + '</div>'; }
  return '';
}
function openLevel() {
  G.phase = 'level'; joy.on = false; sfx('level');
  $('lvTitle').textContent = '신력이 차올랐다!';
  $('lvSub').innerHTML = '하나를 고르십시오' + (G.rerolls > 0 ? ' · <button id="btnReroll" class="reroll">다시 뽑기 ' + G.rerolls + '</button>' : '');
  cards.innerHTML = '';
  for (const s of levelChoices()) {
    const lv = s.evo ? 0 : skLv(s.id), b = document.createElement('button');
    b.className = 'card ' + (s.kind === 'evo' ? 'atk awk evo' : s.kind === 'atk' ? 'atk' : 'buff') + (lv || s.evo ? '' : ' new');
    let stars = '';
    if (s.max < 99) for (let i = 0; i < s.max; i++) stars += '<span class="' + (i < lv ? 'on' : (i === lv ? 'nx' : '')) + '">★</span>';
    const willAw = !!s.evo;
    const link = s.el ? G.comps.find(c => c.active && COMP[c.id].el === s.el) : null;
    const elTag = s.el ? '<span class="el" style="background:' + D.EL[s.el].c + '">' + D.EL[s.el].n + (G.chEl && G.chEl.el === s.el ? ' · 유리' : '') + '</span>' : '';
    b.innerHTML = '<div class="ic"></div><div class="tx"><div class="n">' + elTag + s.n + (lv || s.evo ? '' : ' <em>새 기술</em>') + (willAw ? ' <em class="aw">진화</em>' : '') + '</div><div class="st">' + (s.evo ? '' : stars) + '</div><div class="d">' + (s.evo ? String(D.AWAKE[s.evo] || '').replace('각성:', '진화:') : s.d(lv + 1)) + '</div>' + (link ? '<div class="link">연계 · ' + COMP[link.id].n + ' (위력 +20%, 동료 피해 +15%)</div>' : '') + evoHint(s) + '</div>';
    { const ic = b.querySelector('.ic'), src = s.evo ? 'img/skills/ev_' + s.evo + '.webp' : 'img/skills/' + s.id + '.webp'; const im = document.createElement('img'); im.src = src; im.style.cssText = 'width:96px;height:' + (s.evo ? 140 : 96) + 'px;object-fit:cover;border-radius:16px;box-shadow:0 4px 10px rgba(0,0,0,.5)'; im.onerror = () => { im.remove(); ic.appendChild(skillIcon(s.id, 96)); }; ic.appendChild(im); if (s.evo) { ic.style.flexBasis = '96px'; ic.style.height = '140px'; ic.style.borderRadius = '16px'; } }
    if (willAw) b.classList.add('awk');
    b.addEventListener('click', () => pickSkill(s.id));
    cards.appendChild(b);
  }
  const rr = $('btnReroll'); if (rr) rr.addEventListener('click', ev => { ev.stopPropagation(); G.rerolls--; openLevel(); });
  ovLevel.classList.add('on');
}
function pickSkill(id) {
  const p = G.player;
  if (id.indexOf('ev_') === 0) { const sid = id.slice(3); if (!G.evo) G.evo = {}; G.evo[sid] = true; G.banner = { s: D.EVO[sid].n + ' 진화!', t: 2.2, kind: 'win' }; G.freezeT = 0.35; G.flash = { c: '255,215,110', t: 0.6 }; G.title = { s: D.EVO[sid].n + '!', sub: String(D.AWAKE[sid] || '').replace('진화: ', ''), t: 2.4, big: 1 }; vib([60, 40, 140]); FX.shake = 0.4; FX.explode(p.x, p.y - 40, 120, 'purple'); FX.ring(p.x, p.y, 220, '255,220,120', 0.7, 14); sfx('ult'); ovLevel.classList.remove('on'); G.phase = 'night'; G.pendingLv--; if (G.pendingLv > 0) setTimeout(() => { if (G && G.phase === 'night') openLevel(); }, 250); return; }
  G.sk[id] = skLv(id) + 1;
  if (id === 'rapid') p.rate *= 0.8;
  if (id === 'swift') p.sp *= 1.15;
  if (id === 'heal') { p.max += 20; p.hp = Math.min(p.max, p.hp + 40); }
  if (id === 'repair') G.shrine.hp = Math.min(G.shrine.max, G.shrine.hp + 100);
  if (id === 'bond') G.cult = Math.max(0, G.cult - 8);
  if (!(id in G.skT)) G.skT[id] = 0.5;
  const S = SKILLS.find(s => s.id === id);
  if (S.el && G.sk[id] === 1 && G.comps.some(c => c.active && COMP[c.id].el === S.el)) G.linkBonus += 0.15;
  if (S.kind === 'atk' && G.sk[id] === (fxN('awaken') ? 4 : 5) && D.EVO[id]) { G.banner = { s: S.n + ' 최대 · ' + SKILLS.find(s => s.id === D.EVO[id].pair).n + '와 짝이면 진화', t: 2.2, kind: 'elite' }; }
  ovLevel.classList.remove('on');
  G.phase = 'night'; G.pendingLv--;
  FX.ring(p.x, p.y, 110, '140,255,220', 0.5, 8); FX.spark(p.x, p.y - 40, '180,255,230', 24, 320);
  if (G.pendingLv > 0) setTimeout(() => { if (G && G.phase === 'night') openLevel(); }, 250);
}
function gainXp(v) {
  const p = G.player; p.xp += v;
  const lv0 = p.lv;
  while (p.xp >= xpNeed(p.lv)) { p.xp -= xpNeed(p.lv); p.lv++; G.pendingLv++; }
  if (p.lv > lv0) { G.slowmo = Math.max(G.slowmo || 0, 0.2); FX.ring(p.x, p.y, 120, '160,255,220', 0.45, 8); }
  if (G.pendingLv > 0 && G.phase === 'night') openLevel();
}

/* ---------- 큰 기술 ---------- */
function useUlt() {
  if (!G || !isNight() || G.ult > 0 || G.cutin) return;
  G.ult = G.ultMax; sfx('ult');
  G.cutin = { t: 1.0, life: 1.0, who: 'player', name: '처용 진노', col: '255,90,60', fn: () => {
    const m = atkMul() * starMul('ult');
    const vis = G.enemies.filter(e => onScreen(e)).sort((a, b) => b.hp - a.hp).slice(0, 28);
    vis.forEach((e, i) => G.queue.push({ t: i * 0.035, fn: () => { if (e.dead) return; FX.skyBolt(e.x, e.y, '255,200,120', 1.4); hurtEnemy(e, 90 * m, 'player'); } }));
    for (let i = 0; i < 6; i++) G.queue.push({ t: 0.1 + i * 0.12, fn: () => { const x = G.player.x + rnd(-240, 240), y = G.player.y - rnd(120, 480); FX.explode(x, y, 90); sfx('boom'); for (const e of G.enemies) if (Math.hypot(e.x - x, e.y - y) < 100) hurtEnemy(e, 50 * m, 'player'); } });
    G.flash = { c: '255,220,180', t: 0.35 };
  } };
}
function useCult() {
  if (!G || !isNight() || G.cult > 0 || G.cutin) return;
  const c = G.comps.find(o => o.active && !(o.drop > 0)); if (!c) return;
  const C = COMP[c.id]; G.cult = G.cultMax; sfx('ult');
  G.cutin = { t: 0.9, life: 0.9, who: c.id, name: C.ult, col: C.col, fn: () => {
    const m = atkMul() * 1.2 * compMul() * elMul(C.el), p = G.player;
    const vis = () => G.enemies.filter(onScreen);
    if (c.id === 'dokkaebi') {
      for (let i = 0; i < 3; i++) G.queue.push({ t: i * 0.35, fn: () => { const R = 160 + i * 60; FX.ring(p.x, p.y, R, '255,200,90', 0.5, 14, 20); FX.explode(p.x, p.y - 10, 70); FX.debris(p.x, p.y, 20, '#6a5040', 420); sfx('boom'); for (const e of G.enemies) if (Math.hypot(e.x - p.x, e.y - p.y) < R) { hurtEnemy(e, 60 * m, 'hero', { kb: 40, kx: p.x, ky: p.y }); e.stunT = 1.2; } } });
    } else if (c.id === 'haetae') {
      for (let i = 0; i < 9; i++) G.queue.push({ t: i * 0.08, fn: () => { const a = -Math.PI / 2 + (i - 4) * 0.22, d = 160 + (i % 3) * 90, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; FX.explode(x, y, 60); G.zones.push({ x, y, r: 70, t: 4, life: 4, dps: 22 * m, src: 'hero', tick: 0 }); } });
      sfx('boom');
    } else if (c.id === 'samjoko') {
      for (let i = 0; i < 7; i++) G.queue.push({ t: i * 0.12, fn: () => { const e = pick(vis()) || { x: p.x + rnd(-200, 200), y: p.y - 300 }; G.beams.push({ x1: e.x + rnd(-30, 30), y1: e.y - 700, x2: e.x, y2: e.y, c: '255,220,100', w: 26, t: 0.35, life: 0.35 }); FX.explode(e.x, e.y, 80); for (const o of G.enemies) if (Math.hypot(o.x - e.x, o.y - e.y) < 90) hurtEnemy(o, 80 * m, 'hero'); sfx('zap'); } });
    } else if (c.id === 'yisunsin') {
      G.ship = { t: 2.4, life: 2.4 };
      for (let i = 0; i < 16; i++) G.queue.push({ t: 0.3 + i * 0.1, fn: () => { const e = pick(vis()) || { x: p.x + rnd(-200, 200), y: p.y - rnd(150, 400) }; const sx = 360 + rnd(-120, 120), sy = camY + VH / zoom - 40; shot({ kind: 'shell', x: sx, y: sy, sx, sy, tx: e.x + rnd(-20, 20), ty: e.y + rnd(-20, 20), T: 0.7, age: 0, dmg: 70 * m, R: 80, src: 'hero', life: 9, pierce: 99, nohit: 1 }); FX.p({ kind: 'glow', x: sx, y: sy, life: 0.15, s: 50, s2: 20, c: '255,200,100', hard: 1 }); sfx('gun'); } });
    } else if (c.id === 'eulji') {
      G.waves.push({ y: p.y + 40, x0: camX, x1: camX + W / zoom, t: 1.3, life: 1.3, dmg: 90 * m, hit: [] });
      sfx('boom');
    } else if (c.id === 'wonhyo') {
      G.zones.push({ x: p.x, y: p.y, r: 270, t: 5, life: 5, dps: 30 * m, src: 'hero', tick: 0, holy: 1 });
      FX.ring(p.x, p.y, 280, '255,230,150', 0.6, 14);
    } else if (c.id === 'jangyeongsil') {
      G.bellT = 8; G.flash = { c: '180,210,255', t: 0.25 }; FX.ring(p.x, p.y - 40, 420, '180,220,255', 0.7, 10); G.banner = { s: '자격루의 종! 공격 속도 상승', t: 1.6, kind: 'win' }; sfx('build');
    } else if (c.id === 'gangamchan') {
      vis().slice(0, 30).forEach((e, i) => G.queue.push({ t: i * 0.03, fn: () => { if (e.dead) return; FX.skyBolt(e.x, e.y, '140,190,255', 1.5); hurtEnemy(e, 85 * m, 'hero'); if (i % 4 === 0) sfx('zap'); } }));
      G.flash = { c: '200,220,255', t: 0.3 };
    } else if (c.id === 'honggildong') {
      const tg = vis().sort((a, b) => b.hp - a.hp).slice(0, 10);
      tg.forEach((e, i) => G.queue.push({ t: i * 0.09, fn: () => { if (e.dead) return; FX.smoke(c.x, c.y - 20, 4, '40,30,40', 16, 30); c.x = e.x + 30; c.y = e.y + 6; G.marks.push({ x: e.x, y: e.y - e.hh * 0.5, t: 0.3, life: 0.3, a: rnd(-0.8, 0.8) }); FX.spark(e.x, e.y - 30, '255,120,120', 10, 320); hurtEnemy(e, 110 * m, 'hero'); sfx('hit'); } }));
    } else if (c.id === 'bari') {
      const vs = vis(); vs.forEach((e, i) => G.queue.push({ t: i * 0.02, fn: () => { if (e.dead) return; FX.p({ kind: 'glow', x: e.x, y: e.y - 30, life: 0.4, s: 40, s2: 6, c: '150,210,255' }); const was = e.hp; hurtEnemy(e, 45 * m, 'hero'); if (e.dead && !e.boss) summonAlly(e.type, e.x, e.y, 'soul', 8, 16 * m); } }));
      G.flash = { c: '170,210,255', t: 0.3 };
    } else if (c.id === 'jeonwoochi') {
      for (let i = 0; i < 6; i++) { const a2 = -Math.PI / 2 + (i - 2.5) * 0.4; summonAlly(i % 2 ? 'spear' : 'zsword' in SPR ? 'zsword' : 'archer', p.x + Math.cos(a2) * 110, p.y - 40 + Math.sin(a2) * 70, 'ink', 9, 30 * m); }
      for (let i = 0; i < 20; i++) FX.p({ kind: 'smoke', x: p.x + rnd(-150, 150), y: p.y - rnd(0, 140), vx: rnd(-20, 20), vy: -rnd(10, 40), life: 1.2, s: 14, s2: 40, c: '30,30,45', rot: 0, vr: 0.5 });
    } else if (c.id === 'samyeong') {
      for (let i = 0; i < 5; i++) summonAlly('zmonk' in SPR ? 'zmonk' : 'munsin', p.x + (i - 2) * 50, p.y - 90, 'monk', 10, 26 * m);
    } else if (c.id === 'daejanggeum') {
      G.shrine.hp = Math.min(G.shrine.max, G.shrine.hp + G.shrine.max * 0.25); p.hp = p.max; for (const t of G.turrets) t.hp = t.max; for (const w of G.walls) if (w.hp > 0) w.hp = w.max;
      for (let i = 0; i < 30; i++) FX.p({ kind: 'glow', x: p.x + rnd(-260, 260), y: p.y + rnd(-200, 120), vy: -rnd(40, 120), life: rnd(0.8, 1.5), s: rnd(8, 16), s2: 2, c: i % 2 ? '160,255,200' : '255,230,250' });
      FX.ring(p.x, p.y, 300, '160,255,220', 0.8, 12); G.banner = { s: '어의의 탕약!', t: 1.6, kind: 'win' }; p.invT = Math.max(p.invT, 0); G.tonicT = 6;
    } else if (c.id === 'sadaham') {
      const a0 = -Math.PI / 2; c.dash = { sx: c.x, sy: c.y, tx: c.x, ty: Math.max(160, c.y - 520), t: 0.5, T: 0.5, fn: () => {} };
      for (const o of G.enemies) if (Math.abs(o.x - c.x) < 70 && o.y < c.y && o.y > c.y - 540) G.queue.push({ t: (c.y - o.y) / 1040, fn: () => { if (o.dead) return; G.marks.push({ x: o.x, y: o.y - o.hh * 0.5, t: 0.25, life: 0.25, a: rnd(-0.8, 0.8) }); hurtEnemy(o, 120 * m, 'hero', { kb: 30, kx: o.x + rnd(-10, 10), ky: o.y + 20 }); } });
    } else if (c.id === 'kimchungseon') {
      const tg = vis().filter(e => { const ed = EN[e.type]; return ed.range || ed.caster || ed.gun; }).slice(0, 14);
      if (!tg.length) G.banner = { s: '노릴 원거리·마법 적이 없다', t: 1.2, kind: 'elite' };
      tg.forEach((e, i) => G.queue.push({ t: i * 0.1, fn: () => { if (e.dead) return; FX.smoke(c.x, c.y - 20, 4, '30,20,30', 14, 30); c.x = e.x + 28; c.y = e.y + 6; c.fdir = Math.PI; c.fire = 0.35; G.marks.push({ x: e.x, y: e.y - e.hh * 0.5, t: 0.3, life: 0.3, a: rnd(-0.9, 0.9) }); FX.spark(e.x, e.y - 30, '255,80,80', 12, 360); hurtEnemy(e, 160 * m, 'hero'); sfx('hit'); } }));
    } else if (c.id === 'imugi') {
      c.soar = 2.6; for (let i = 0; i < 14; i++) G.queue.push({ t: 0.4 + i * 0.14, fn: () => { const e = pick(vis()) || { x: p.x + rnd(-200, 200), y: p.y - rnd(150, 400) }; shot({ kind: 'meteor', x: e.x - 200, y: e.y - 620, tx: e.x, ty: e.y, T: 0.6, age: 0, dmg: 60 * m, R: 70, zone: 14 * m, src: 'hero', life: 9, pierce: 99, nohit: 1 }); } });
    } else if (c.id === 'gumiho') {
      const tg = vis().filter(e => !e.boss).sort((a, b) => b.hp - a.hp).slice(0, 8);
      for (const e of tg) { e.charmT = 5; FX.ring(e.x, e.y, 40, '255,120,190', 0.5, 6); }
      FX.flash(p.x, p.y - 40, 200, '255,140,200', 0.4);
    }
  } };
}
function onScreen(e) { const vw = W / zoom, vh = VH / zoom; return e.x > camX - 20 && e.x < camX + vw + 20 && e.y > camY - 20 && e.y < camY + vh + 20; }

/* ---------- 탄 만들기 ---------- */
function shot(o) { o.hit = o.hit || []; o.t = 0; o.r = o.r || 8; G.shots.push(o); return o; }
function nearestEnemy(x, y, range, skip) {
  let best = null, bd = range;
  for (const e of G.enemies) { if (e.dead || (skip && skip.indexOf(e) >= 0)) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function densest(x, y, range) {
  let best = null, bn = -1;
  const es = G.enemies;
  for (let i = 0; i < Math.min(es.length, 40); i++) { const e = es[(i * 7 + (G.t * 10 | 0)) % es.length]; if (Math.hypot(e.x - x, e.y - y) > range) continue; let n = 0; for (const o of es) if (Math.abs(o.x - e.x) < 80 && Math.abs(o.y - e.y) < 80) n++; if (n > bn) { bn = n; best = e; } }
  return best;
}
function chainLightning(x, y, first, dmg, n, col, src) {
  const pts = [{ x, y }], used = [];
  let cur = first;
  while (cur && used.length < n) { used.push(cur); pts.push({ x: cur.x, y: cur.y - cur.hh * 0.5 }); hurtEnemy(cur, dmg, src); FX.hit(cur.x, cur.y - cur.hh * 0.5, col, true); dmg *= 0.8; cur = nearestEnemy(cur.x, cur.y, 140, used); }
  FX.bolt(pts, col, 0.22, 1); sfx('zap', 0.6);
}

/* ---------- 갱신 ---------- */
function update(dtr) {
  if (G.cutin) { G.cutin.t -= dtr; if (G.cutin.t <= 0) { const f = G.cutin.fn; G.cutin = null; f(); } FX.update(dtr * 0.15); return; }
  if (G.freezeT > 0) { G.freezeT -= dtr; return; }
  if (!G.obj) objInit();
  G.pairT = (G.pairT || 0) - dtr; if (G.pairT <= 0) { G.pairT = 0.5; checkPairs(); }
  if (G.crisisT > 0) G.crisisT -= dtr;
  let dt = dtr * (G.speed2 ? 2 : 1);
  if (G.slowmo > 0) { G.slowmo -= dtr; dt = dtr * 0.35; }
  if (G.ship) { G.ship.t -= dt; if (G.ship.t <= 0) G.ship = null; }
  if (G.tonicT > 0) G.tonicT -= dt;
  G.t += dt;
  FX.update(dt);
  if (G.banner) { G.banner.t -= dtr; if (G.banner.t <= 0) G.banner = null; }
  if (G.title) { G.title.t -= dtr; if (G.title.t <= 0) G.title = null; }
  if (G.bubble) { G.bubble.t -= dtr; if (G.bubble.t <= 0) G.bubble = null; }
  if (G.flash) { G.flash.t -= dtr; if (G.flash.t <= 0) G.flash = null; }
  G.bubbleCd -= dt; G.alertT -= dt;
  for (const q of G.queue) q.t -= dt;
  const due = G.queue.filter(q => q.t <= 0); G.queue = G.queue.filter(q => q.t > 0); for (const q of due) q.fn();
  for (const c of G.corpses) c.t += dt; G.corpses = G.corpses.filter(c => c.t < (c.hasDie ? c.life : 0.45));
  for (const b of G.beams) b.t -= dt; G.beams = G.beams.filter(b => b.t > 0);
  for (const t of G.turrets) { if (t.rise > 0) t.rise -= dt; if (t.crewA) for (let i = 0; i < t.crewA.length; i++) if (t.crewA[i] > 0) t.crewA[i] -= dt; }
  const vw = W / zoom, vh = VH / zoom;
  WD.ambient(WORLD.T, dt, { x0: camX, x1: camX + vw, y0: camY, y1: camY + vh });
  /* 불 소품 */
  for (const f of WORLD.fires) if (Math.random() < dt * 14 * f.s) FX.ember(f.x, f.y - 10, Math.random() < 0.5 ? '255,140,40' : '255,200,90', 1, 90);

  if (G.phase === 'dawn') {
    G.dawnT -= dt;
    collectAll(dt);
    if (G.dawnT <= 0) {
      let inc = 0; for (const t of G.turrets) if (TUR[t.type].income) inc += TUR[t.type].income * t.lv * (pairOn('p_dok') ? 2 : 1);
      G.gold += 70 + G.night * 15 + inc;
      G.night++;
      if (G.obj && G.obj.beacon && G.obj.beacon.hp > 0) { G.obj.beacon.hp = Math.min(G.obj.beacon.max, G.obj.beacon.hp + G.obj.beacon.max * 0.5); G.obj.bwarn = 0; }
      if (G.mode === 'endless' && G.night >= G.nights.length) { const L = G.nights[G.nights.length - 1]; G.nights.push(Object.assign({}, L, { name: (G.night + 1) + '번째 밤', hp: L.hp * 1.22, rate: [L.rate[0] * 1.08, L.rate[1] * 1.08], kind: G.night % 3 === 2 ? 'boss' : 'elite', boss: G.night % 3 === 2 ? pick(['mujang', 'zbear', 'ztiger', 'zox']) : null, elites: [0.45] })); }
      if (G.night >= G.nights.length) return endGame(true);
      startDay();
    }
    return;
  }
  if (G.phase === 'day') { movePlayer(dt); moveComps(dt); buildUI(); collectAll(dt); return; }
  if (G.phase === 'win' || G.phase === 'lose') { G.endT -= dtr; if (G.endT <= 0 && !G.ended) finish(); return; }
  if (!isNight()) return;

  const N = curN(), p = G.player, sh = G.shrine;
  G.time += dt;
  G.ult = Math.max(0, G.ult - dt); G.cult = Math.max(0, G.cult - dt);

  /* 등장 */
  const prog = Math.min(1, G.time / N.dur);
  const bossAlive = G.bossRef && !G.bossRef.dead;
  const rate = G.time > N.dur ? (bossAlive ? 1.2 : 0) : N.rate[0] + (N.rate[1] - N.rate[0]) * prog;
  if (N.elites && G.eliteIdx < N.elites.length && prog >= N.elites[G.eliteIdx]) { G.eliteIdx++; if (N.boss) { spawnBig(N.boss, true); G.bossOut = true; } else spawnBig(N.eliteType, false); }
  if (G.enemies.length < 230) { G.spawnAcc += rate * dt * (G.bossRef && !G.bossRef.dead ? 0.65 : 1);   /* 우두머리 결투 중엔 졸개를 줄여 결투에 집중, 후반 늘어짐 완화 */ while (G.spawnAcc >= 1) { G.spawnAcc -= 1; spawnWave(); } }

  movePlayer(dt); moveComps(dt);
  playerAttack(dt);
  skills(dt);
  turrets(dt);
  guards(dt);
  comps(dt);
  updShots(dt);
  updAllies(dt);
  updGadgets(dt);
  enemies(dt);
  updZones(dt);
  collectAll(dt);

  objUpdate(dt);
  if (pairOn('p_won')) { G.wonT = (G.wonT || 0) - dt; if (G.wonT <= 0) { G.wonT = 20; G.shShield = sh.max * 0.15; FX.ring(sh.x, sh.y - 40, 150, '255,215,110', 0.6, 10); } }
  { const k = sh.hp / sh.max; if (k < 0.5 && !G.sh50) { G.sh50 = 1; G.crisisT = 2.5; G.banner = { s: '사당 내구도 절반!', t: 2, kind: 'boss' }; sfx('warn'); vib([100, 60, 100]); FX.shake = 0.35; } if (k < 0.25 && !G.sh25) { G.sh25 = 1; G.crisisT = 3.5; G.banner = { s: '사당이 무너지기 직전!', t: 2.4, kind: 'boss' }; sfx('warn'); vib([150, 80, 150, 80, 250]); FX.shake = 0.6; } }
  if (p.hp <= 0 && pairOn('p_dae') && !G.daeRez) { G.daeRez = 1; p.hp = p.max * 0.5; p.invT = 2.5; FX.ring(p.x, p.y, 160, '160,255,180', 0.8, 14); G.banner = { s: '대장금의 탕약! 처용이 일어섰다', t: 2.2, kind: 'win' }; vib([60, 40, 60]); }
  if (G.obj && G.obj.beacon && G.obj.beacon.hp <= 0) { G.loseWhy = '봉화대가 무너졌다'; return endGame(false); }
  if (sh.hp <= 0 || p.hp <= 0) return endGame(false);
  if (G.time >= N.dur && !(N.boss && (!G.bossOut || bossAlive))) {
    for (const e of G.enemies) { FX.p({ kind: 'glow', x: e.x, y: e.y - 20, life: 0.5, s: 40, s2: 4, c: '255,230,160' }); FX.ember(e.x, e.y - 10, '255,230,160', 4, 120); }
    G.kills += G.enemies.length; G.enemies = []; G.eshots = []; G.shots = []; G.zones = [];
    G.phase = 'dawn'; G.dawnT = 2.2; joy.on = false; G.bossRef = null;
    G.title = { s: '동이 튼다', sub: '보상 엽전 +' + (70 + G.night * 15), t: 2 };
  }
}

function movePlayer(dt) {
  const p = G.player, sh = G.shrine;
  let mx = 0, my = 0;
  if (keys.ArrowLeft || keys.a) mx -= 1; if (keys.ArrowRight || keys.d) mx += 1;
  if (keys.ArrowUp || keys.w) my -= 1; if (keys.ArrowDown || keys.s) my += 1;
  if (joy.on) { mx = joy.dx; my = joy.dy; }
  else if (G.auto && isNight()) {
    /* 자동: 가까운 적은 피하고, 무리가 많은 쪽을 향해 성벽 앞을 오간다 */
    let ax = 0, ay = 0;
    for (const e of G.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 130) { ax -= (e.x - p.x) / d * (130 - d); ay -= (e.y - p.y) / d * (130 - d); } }
    const tg = densest(p.x, p.y, 600);
    const hx = tg ? clamp(tg.x, 140, 580) : 360, hy = WALL_Y - 150;
    ax += (hx - p.x) * 0.6; ay += (hy - p.y) * 0.6;
    const l = Math.hypot(ax, ay); if (l > 20) { mx = ax / l; my = ay / l; }
  }
  const ml = Math.hypot(mx, my);
  p.moving = ml > 0.05;
  if (p.moving) { const k = Math.min(1, ml) / ml; p.x += mx * k * p.sp * dt; p.y += my * k * p.sp * dt; p.mdir = Math.atan2(my, mx); if (Math.abs(mx) > 0.1 && !p.aimT) p.flip = mx < 0; if (Math.random() < dt * 8) FX.p({ kind: 'smoke', x: p.x + rnd(-6, 6), y: p.y + 4, vx: rnd(-10, 10), vy: -10, life: 0.6, s: 6, s2: 14, c: WORLD.T.snowy ? '240,245,255' : '190,170,130', rot: 0, vr: 0 }); }
  p.x = clamp(p.x, 60, W - 60); p.y = clamp(p.y, 140, H - 110);
  const ds = Math.hypot(p.x - sh.x, p.y - sh.y);
  if (ds < sh.r + p.r + 20) { const k = (sh.r + p.r + 20) / (ds || 1); p.x = sh.x + (p.x - sh.x) * k; p.y = sh.y + (p.y - sh.y) * k; }
  if (fxN('regen') && isNight()) { G.regenT = (G.regenT || 0) + dt; if (G.regenT > 5) { G.regenT = 0; p.hp = Math.min(p.max, p.hp + p.max * 0.03); } }
  p.hitT -= dt; sh.hitT -= dt; p.invT -= dt; p.recoil = Math.max(0, p.recoil - dt * 6); p.muzzle -= dt; if (p.aimT > 0) p.aimT -= dt; else p.aimT = 0;
}
/* 영웅 판단(AI): 처용 곁에 붙어 있지 않고 스스로 적을 찾아 싸운다.
   근거리는 파고들고, 원거리는 알맞은 거리를 지키며 옆으로 돌고, 너무 가까우면 물러난다.
   처용에게서 너무 멀어지면 돌아오고, 싸울 적이 없으면 처용 주변을 지킨다. */
const AIP = { bari: { want: 230 }, jeonwoochi: { want: 200 }, samyeong: { want: 45, melee: 1 }, sadaham: { want: 45, melee: 1 }, kimchungseon: { want: 40, melee: 1, assassin: 1 }, daejanggeum: { want: 230 }, imugi: { want: 190 }, eulji: { want: 50, melee: 1 }, dokkaebi: { want: 150 }, haetae: { want: 110 }, honggildong: { want: 190 }, wonhyo: { want: 210 }, gangamchan: { want: 240 }, gumiho: { want: 250 }, yisunsin: { want: 280 }, samjoko: { want: 290 } };
/* 소환 아군: soul(바리 혼령), ink(전우치 먹물 병사), monk(사명 승병) */
function summonAlly(spr, x, y, style, life, dps) { if (!G.allies) G.allies = []; if (G.allies.length > 24) return; G.allies.push({ spr, x, y, style, t: life, life, dps, cd: 0, fdir: -Math.PI / 2, mv: false }); FX.ring(x, y, 40, style === 'ink' ? '40,40,60' : style === 'monk' ? '255,200,100' : '150,210,255', 0.4, 5); }
function spawnSoldier(home, type) {
  if (!G.allies) G.allies = [];
  const S = D.SOLDIER[type], k = 1 + 0.35 * (home.lv - 1) + (home.lv >= 5 ? 0.5 : 0), atk = atkMul();
  const slot = G.allies.filter(a => a.style === 'soldier').length;
  const li = slot % LANE_X.length, row = Math.floor(slot / LANE_X.length), lp = D.lanePt(LANE_X[li], clamp((WALL_Y - 200 - row * 30 + 40) / (WALL_Y + 40), 0.3, 0.95), li);
  const rx = clamp(lp.x + ((slot * 37) % 70) - 35, 60, W - 60), ry = lp.y + rnd(-12, 12);
  G.allies.push({ spr: type, type, style: 'soldier', home, x: home.x, y: home.y, rx, ry, hp: S.hp * k, max: S.hp * k, r: 12, k, atkM: atk, t: 1e9, life: 1e9, cd: rnd(0, 0.5), fdir: -Math.PI / 2, mv: false, elite: home.lv >= 5 });
  FX.smoke(home.x, home.y, 4, '200,190,170', 14, 30); FX.ring(home.x, home.y, 50, '255,230,160', 0.4, 5);
}
function kimK(e) { if (!pairOn('p_kim') || !e || e.kimHit) return 1; e.kimHit = 1; FX.num(e.x, e.y - e.hh - 10, '기습!', true, '#ff5a6a'); return 3; }
/* 장영실 화포 장치 + 자격루 종 */
function updGadgets(dt) {
  if (G.bellT > 0) { G.bellT -= dt; const x = dt * 0.6; G.player.cd -= x; for (const c of G.comps) c.cd -= x; for (const t of G.turrets) t.cd -= x * 0.5; if (Math.random() < dt * 6) FX.p({ kind: 'glow', x: G.player.x + rnd(-30, 30), y: G.player.y - rnd(20, 90), vy: -40, life: 0.6, s: 6, s2: 2, c: '180,220,255' }); }
  if (!G.gadgets) return;
  for (const g of G.gadgets) { if (g.t <= 0) continue; g.t -= dt; g.cd -= dt; const e = nearestEnemy(g.x, g.y, 380); if (e) g.a = Math.atan2(e.y - e.hh * 0.5 - (g.y - 26), e.x - g.x);
    if (e && g.cd <= 0) { g.cd = 0.45; g.fire = 0.1; shot({ kind: 'tracer', x: g.x + Math.cos(g.a) * 20, y: g.y - 26 + Math.sin(g.a) * 20, vx: Math.cos(g.a) * 1000, vy: Math.sin(g.a) * 1000, dmg: g.dm, pierce: 0, life: 0.5, src: 'hero', r: 7 }); FX.p({ kind: 'glow', x: g.x + Math.cos(g.a) * 24, y: g.y - 26 + Math.sin(g.a) * 24, life: 0.08, s: 20, s2: 6, c: '255,210,120', hard: 1 }); if (Math.random() < 0.4) sfx('gun', 0.25); }
    if (g.fire > 0) g.fire -= dt; if (g.t <= 0) FX.smoke(g.x, g.y - 10, 5, '150,140,130', 14, 30); }
  G.gadgets = G.gadgets.filter(g => g.t > 0);
}
function drawGadget(g) {
  const x = g.x, y = g.y; shadowE(x, y + 2, 16, 0.3);
  ctx.fillStyle = '#6a4a2a'; rrPath(x - 14, y - 12, 28, 12, 4); ctx.fill(); ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.translate(x, y - 22); ctx.rotate(g.a); ctx.fillStyle = '#b08a3a'; rrPath(-6, -6, 30 - (g.fire > 0 ? 5 : 0), 12, 5); ctx.fill(); ctx.stroke(); ctx.restore();
  circle(x, y - 22, 9); ctx.fillStyle = '#c8a050'; ctx.fill(); ctx.stroke();
  const k = Math.max(0, Math.min(1, g.t / 9)); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 14, y + 4, 28, 4); ctx.fillStyle = '#9ef0ff'; ctx.fillRect(x - 14, y + 4, 28 * k, 4);
}
function updSoldier(a, dt) {
  if (a.confT > 0) { a.confT -= dt; a.mv = false; a.tg = null; if (Math.random() < dt * 3) FX.p({ kind: 'glow', x: a.x + rnd(-6, 6), y: a.y - 50, life: 0.4, s: 5, s2: 1, c: '200,200,255' }); return; }
  const S = D.SOLDIER[a.type];
  if (a.hitT > 0) a.hitT -= dt;
  /* 병사는 집결지 둘레 넓게 적을 찾아 나가 싸운다. 너무 멀리(집결지에서 650 밖) 끌려가면 돌아온다 */
  let e = (a.tg && !a.tg.dead && Math.hypot(a.tg.x - a.rx, a.tg.y - a.ry) < 650) ? a.tg : (nearestEnemy(a.x, a.y, 260) || nearestEnemy(a.rx, a.ry, 560));
  if (e && Math.hypot(e.x - a.rx, e.y - a.ry) > 650) e = null;
  a.tg = e;
  let tx = a.rx, ty = a.ry;
  if (e) {
    const dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy) || 1; a.fdir = Math.atan2(dy, dx);
    if (S.range) { if (d > S.range) { tx = e.x; ty = e.y; } else { tx = a.x; ty = a.y; if (a.cd <= 0) { a.cd = S.rate; a.atk = 0.3; const dm = S.dmg * a.k * a.atkM * kimK(e);
      if (S.chain) chainLightning(a.x, a.y - 40, e, dm, 3, '200,220,255', 'building');
      else shot({ kind: S.gun ? 'tracer' : 'tarrow', x: a.x, y: a.y - 36, vx: dx / d * (S.gun ? 1200 : 760), vy: (dy - 20) / d * (S.gun ? 1200 : 760), dmg: dm, pierce: S.gun ? 1 : 0, life: 0.6, src: 'building', r: 8 });
      if (S.gun) { FX.p({ kind: 'glow', x: a.x + dx / d * 18, y: a.y - 38 + dy / d * 18, life: 0.08, s: 28, s2: 8, c: '255,210,120', hard: 1 }); FX.smoke(a.x + dx / d * 20, a.y - 40, 2, '210,210,210', 8, 20); sfx('gun', 0.4); } } } }
    else { const reach = S.reach + e.r; if (d > reach) { tx = e.x; ty = e.y; } else { tx = a.x; ty = a.y; if (a.cd <= 0) { a.cd = 0.6; a.atk = 0.3; const dm = S.dps * 0.6 * a.k * a.atkM * kimK(e);
      if (S.cleave) { for (const o of G.enemies) if (Math.hypot(o.x - a.x, o.y - a.y) < reach + 20) hurtEnemy(o, dm, 'building', { kb: 8, kx: a.x, ky: a.y }); }
      else hurtEnemy(e, dm * (S.charge && a.mvT > 0.6 ? 2.5 : 1), 'building', { kb: S.charge ? 16 : 5, kx: a.x, ky: a.y });
      if (S.heal) for (const o of G.allies) if (o.style === 'soldier' && o.hp < o.max && Math.hypot(o.x - a.x, o.y - a.y) < 120) o.hp = Math.min(o.max, o.hp + o.max * 0.06);
      FX.hit(e.x, e.y - 28, '255,230,170'); } } }
  }
  { const cr = allyCross(a, ty); if (cr) { tx = cr.x; ty = cr.y; } }
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  a.mv = d > 6; if (a.mv) { a.x += dx / d * S.sp * dt; a.y += dy / d * S.sp * dt; if (!e) a.fdir = Math.atan2(dy, dx); a.mvT = (a.mvT || 0) + dt; } else a.mvT = 0;
  if (Math.abs(a.y - WALL_Y) < 16 && allyBlock(a.x)) a.y = a.y < WALL_Y ? WALL_Y - 16 : WALL_Y + 16;
  a.cd -= dt; if (a.atk > 0) a.atk -= dt;
}
function updAllies(dt) {
  if (!G.allies) return;
  for (const a of G.allies) {
    if (a.style === 'soldier') { updSoldier(a, dt); continue; }
    a.t -= dt; a.cd -= dt;
    const e = nearestEnemy(a.x, a.y, 420);
    if (e) { const dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy) || 1; a.fdir = Math.atan2(dy, dx); if (d > e.r + 22) { a.x += dx / d * 170 * dt; a.y += dy / d * 170 * dt; a.mv = true; } else { a.mv = false; if (a.cd <= 0) { a.cd = 0.5; a.atk = 0.3; hurtEnemy(e, a.dps * 0.5, 'hero', { kb: 6, kx: a.x, ky: a.y }); FX.hit(e.x, e.y - 30, a.style === 'ink' ? '120,120,160' : a.style === 'monk' ? '255,210,130' : '160,220,255'); if (a.style === 'monk' && Math.random() < 0.2) e.stunT = 0.6; } } }
    else a.mv = false;
    if (a.atk > 0) a.atk -= dt;
  }
  G.allies = G.allies.filter(a => a.t > 0 && (a.hp == null || a.hp > 0));
}
function drawAlly(a) {
  if (a.style === 'soldier') {
    const S = D.SOLDIER[a.type]; shadowE(a.x, a.y + 2, 14, 0.3);
    const ok = drawSprite(a.spr, a.x, a.y, { anim: a.hitT > 0 ? 'hit' : a.atk > 0 ? 'atk' : a.mv ? 'walk' : 'idle', at: a.atk > 0 ? 1 - a.atk / 0.3 : null, dir: dir8(a.fdir), t: G.t + a.rx, h: 60, mode: a.hitT > 0 ? 'white' : null });
    if (!ok) { const bob = a.mv ? Math.abs(Math.sin(G.t * 12 + a.rx)) * 3 : 0; rrPath(a.x - 11, a.y - 34 - bob, 22, 30, 8); ctx.fillStyle = 'rgb(' + S.col + ')'; ctx.fill(); ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 2.5; ctx.stroke(); circle(a.x, a.y - 44 - bob, 11); ctx.fillStyle = '#f2d2b0'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#17171a'; ctx.fillRect(a.x - 14, a.y - 56 - bob, 28, 4); ctx.fillRect(a.x - 7, a.y - 64 - bob, 14, 9); if (a.elite) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(a.x - 11, a.y - 22 - bob, 22, 4); } txt(S.n[0], a.x, a.y - 20 - bob, 13, '#fff', 'center', '#1a1410', 3); }
    if (a.hp < a.max) hpBar(a.x - 14, a.y - 74, 28, 4, a.hp / a.max, '#6fdc6a');
    return;
  }
  const k = Math.min(1, a.t / 0.5, (a.life - a.t) / 0.3);
  shadowE(a.x, a.y + 2, 14, 0.25 * k);
  ctx.save();
  if (a.style === 'soul') { ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, a.x, a.y - 30, 34, '120,190,255', 0.5 * k); ctx.globalCompositeOperation = 'source-over'; }
  drawSprite(a.spr, a.x, a.y, { anim: a.atk > 0 ? 'atk' : 'walk', at: a.atk > 0 ? 1 - a.atk / 0.3 : null, dir: dir8(a.fdir), t: G.t + a.x, alpha: (a.style === 'soul' ? 0.65 : 0.9) * k, mode: a.style === 'soul' ? 'ice' : a.style === 'ink' ? 'dark' : null });
  ctx.restore();
}
/* 영웅 판단 v2: 위협 우선, 역할별 자리, 마무리, 목표 유지, 회피, 성문 길 찾기 */
const AOE_H = { gangamchan: 1, gumiho: 1, imugi: 1, haetae: 1, jeonwoochi: 1, samjoko: 1, dokkaebi: 1, cheokjunkyung: 1 };
function gapX(y) { /* 지나갈 수 있는 곳: 성문 또는 무너진 성벽 */ let best = 360, bd = 1e9; for (const w of G.walls) if (w.gate || w.hp <= 0) { const d = Math.abs(w.x - y); if (d < bd) { bd = d; best = w.x; } } return best; }
function inDanger(x, y) {
  for (const t of G.tele) { const dx = (x - t.x) / t.r, dy = (y - t.y) / (t.r * 0.62); if (dx * dx + dy * dy < 1.1) return { x: t.x, y: t.y }; }
  for (const e of G.enemies) if (e.tele > 0) { const px = x - e.x, py = y - e.y, al = px * Math.cos(e.ca) + py * Math.sin(e.ca), off = -px * Math.sin(e.ca) + py * Math.cos(e.ca); if (al > 0 && al < 400 && Math.abs(off) < e.r + 26) return { x: x - Math.sin(e.ca) * Math.sign(off || 1) * 50, y: y + Math.cos(e.ca) * Math.sign(off || 1) * 50, line: 1, ox: Math.sign(off || 1), ca: e.ca }; }
  return null;
}
function moveComps(dt) {
  const p = G.player, night = isNight(), sh = G.shrine;
  G.comps.forEach((c, i) => {
    if (!c.active) return;
    if (c.drop > 0) { c.drop = Math.max(0, c.drop - dt / 0.75); c.t += dt; return; }
    if (c.dash) { c.dash.t -= dt; const k = 1 - Math.max(0, c.dash.t) / c.dash.T; c.x = c.dash.sx + (c.dash.tx - c.dash.sx) * k; c.y = c.dash.sy + (c.dash.ty - c.dash.sy) * k; c.fdir = Math.atan2(c.dash.ty - c.dash.sy, c.dash.tx - c.dash.sx); if (Math.random() < 0.8) FX.trail(c.x, c.y - 30, '150,210,255', 18, 0.25); if (c.dash.t <= 0) { const f = c.dash.fn; c.dash = null; if (f) f(); } return; }
    if (c.cloneT > 0) c.cloneT -= dt;
    const C = COMP[c.id], P = AIP[c.id] || { want: 200 }, healer = c.id === 'daejanggeum';
    const LEASH = P.assassin ? 900 : 400, SPD = P.melee ? 300 : 255;
    /* 지킬 기준점: 사당이 맞으면 사당, 아니면 처용과 성문 사이 */
    const shrineHit = G.alertT > 0;
    const anchor = shrineHit ? { x: sh.x, y: sh.y - 90 } : P.melee ? { x: (p.x + gapX(p.x)) / 2, y: Math.min(p.y, WALL_Y - 60) } : { x: p.x + (i ? 80 : -80), y: p.y + 50 };
    let vx = 0, vy = 0;
    /* 1) 목표 고르기 (0.3초마다, 지금 목표에 가산점) */
    c.think = (c.think || 0) - dt;
    if (night && (c.think <= 0 || !c.tg || c.tg.dead)) {
      c.think = 0.3; let best = null, bs = -1e9; const myDmg = C.dmg * atkMul();
      for (const e of G.enemies) {
        if (e.dead || e.charmT > 0) continue;
        const ed = EN[e.type], dc = Math.hypot(e.x - c.x, e.y - c.y), da = Math.hypot(e.x - anchor.x, e.y - anchor.y);
        if (P.assassin) { if (!(ed.range || ed.caster || ed.gun)) continue; }
        else if (da > LEASH + 120) continue;
        let s = -dc * 0.6 - da * 0.25;
        if (Math.hypot(e.x - sh.x, e.y - sh.y) < 150) s += 420;
        if (Math.hypot(e.x - p.x, e.y - p.y) < 130) s += 300;
        if (!e.passed && e.y > WALL_Y - 50 && e.y < WALL_Y) s += 180;
        if (e.passed) s += 160;
        if (e.elite) s += 140; if (e.boss) s += P.melee ? 120 : 220;
        s += (1 - e.hp / e.max) * 120; if (e.hp < myDmg * 1.2) s += 150;
        if (AOE_H[c.id]) { let n = 0; for (const o of G.enemies) if (Math.abs(o.x - e.x) < 80 && Math.abs(o.y - e.y) < 80) n++; s += n * 25; }
        if (e === c.tg) s += 80;
        if (s > bs) { bs = s; best = e; }
      }
      c.tg = best; c.orbit = c.orbit || (i ? 1 : -1);
    }
    let tg = night ? c.tg : null;
    /* 치유자: 다친 아군 곁 */
    if (healer && night) { let hurt = p, hk = p.hp / p.max; for (const a of (G.allies || [])) if (a.style === 'soldier' && a.hp / a.max < hk - 0.15) { hk = a.hp / a.max; hurt = a; } const hx = hurt.x + (i ? 70 : -70), hy = hurt.y + 40; const d = Math.hypot(hx - c.x, hy - c.y); if (d > 30) { vx += (hx - c.x) / d * 1.2; vy += (hy - c.y) / d * 1.2; } if (hk < 0.6 && hurt.hp != null) { hurt.hp = Math.min(hurt.max, hurt.hp + hurt.max * 0.03 * dt); if (Math.random() < dt * 4) FX.p({ kind: 'glow', x: hurt.x + rnd(-10, 10), y: hurt.y - 40, vy: -40, life: 0.6, s: 10, s2: 2, c: '150,255,190' }); } }
    if (tg && !tg.dead) {
      const dx = tg.x - c.x, dy = tg.y - c.y, d = Math.hypot(dx, dy) || 1;
      c.fdir = Math.atan2(dy, dx);
      const want = healer ? Math.max(P.want, 220) : P.want;
      if (d > want * 1.05) { vx += dx / d; vy += dy / d; }
      else if (!P.melee && d < want * 0.65) { vx -= dx / d; vy -= dy / d; }
      if (!P.melee) { vx += -dy / d * 0.5 * c.orbit; vy += dx / d * 0.5 * c.orbit; if (Math.random() < dt * 0.3) c.orbit = -c.orbit; }
      /* 원거리: 둘 이상 붙으면 물러난다 */
      if (!P.melee) { let near = 0, ax = 0, ay = 0; for (const e of G.enemies) { const ex = c.x - e.x, ey = c.y - e.y, ed = Math.hypot(ex, ey); if (ed < 90 && ed > 1) { near++; ax += ex / ed; ay += ey / ed; } } if (near >= 2) { vx += ax * 1.2 + (anchor.x - c.x) / 300; vy += ay * 1.2 + (anchor.y - c.y) / 300; } else if (near === 1) { vx += ax * 0.8; vy += ay * 0.8; } }
    } else if (!healer || !night) {
      const gx = anchor.x + Math.sin(G.t * 0.7 + i * 2) * 26, gy = anchor.y + Math.cos(G.t * 0.9 + i) * 18;
      const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy);
      if (d > 12) { vx += dx / d * Math.min(1, d / 60); vy += dy / d * Math.min(1, d / 60); c.fdir = Math.atan2(dy, dx); }
    }
    /* 2) 위험 지역 회피 */
    const dg = night ? inDanger(c.x, c.y) : null;
    if (dg) { if (dg.line) { vx += -Math.sin(dg.ca) * dg.ox * 2.2; vy += Math.cos(dg.ca) * dg.ox * 2.2; } else { const ex = c.x - dg.x, ey = c.y - dg.y, el = Math.hypot(ex, ey) || 1; vx += ex / el * 2.2; vy += ey / el * 2.2; } }
    /* 3) 처용에게서 너무 멀면 돌아온다 */
    const pdx = anchor.x - c.x, pdy = anchor.y - c.y, pd = Math.hypot(pdx, pdy);
    if (pd > LEASH) { const k = Math.min(2, (pd - LEASH) / 80 + 0.6); vx += pdx / pd * k; vy += pdy / pd * k; }
    /* 4) 서로 겹치지 않게 */
    for (const o of [p, ...G.comps]) { if (o === c || (o.active === false)) continue; const ox = c.x - o.x, oy = c.y - o.y, od = Math.hypot(ox, oy); if (od < 60 && od > 0.1) { vx += ox / od * (60 - od) / 28; vy += oy / od * (60 - od) / 28; } }
    /* 5) 성벽은 성문이나 무너진 틈으로 */
    const wantY = c.y + vy * 50;
    if ((c.y > WALL_Y + 10 && wantY < WALL_Y) || (c.y < WALL_Y - 10 && wantY > WALL_Y)) { const gx2 = gapX(c.x); if (Math.abs(gx2 - c.x) > 24) { vx = Math.sign(gx2 - c.x) * 1.2; vy *= 0.2; } }
    const vl = Math.hypot(vx, vy);
    c.moving = vl > 0.15;
    if (c.moving) { const k = Math.min(1, vl); c.x += vx / vl * SPD * k * (dg ? 1.4 : 1) * dt; c.y += vy / vl * SPD * k * (dg ? 1.4 : 1) * dt; if (!tg) c.fdir = Math.atan2(vy, vx); c.flip = vx < 0; }
    c.x = clamp(c.x, 50, W - 50); c.y = clamp(c.y, 120, H - 90);
    if (Math.abs(c.y - WALL_Y) < 16 && allyBlock(c.x) && c.id !== 'imugi') c.y = c.y < WALL_Y ? WALL_Y - 16 : WALL_Y + 16;
    c.t += dt * (c.moving ? 1 : 0.4); c.fire -= dt;
  });
  /* 자동 모드: 큰 기술 판단 */
  if (G.auto && night && !G.cutin) {
    const vis = G.enemies.filter(onScreen).length, boss = G.bossRef && !G.bossRef.dead;
    if (G.cult <= 0 && (vis >= 12 || boss || G.alertT > 0)) useCult();
    else if (G.ult <= 0 && (vis >= 16 || (boss && G.bossRef.hp > G.bossRef.max * 0.3))) useUlt();
  }
}

function playerAttack(dt) {
  const p = G.player, wp = WEAPON[G.weapon];
  p.cd -= dt;
  if (p.cd > 0) return;
  const e = nearestEnemy(p.x, p.y - 30, p.range);
  if (!e) return;
  p.cd = p.rate;
  const ox = p.x + (p.flip ? -14 : 14), oy = p.y - 46;
  const a = Math.atan2(e.y - e.hh * 0.45 - oy, e.x - ox); p.face = a; p.flip = Math.cos(a) < 0; p.aimT = 0.4;
  const n = wp.shots + skLv('multi') + fxN('multi1') + 2 * fxN('pellet2') + 2 * fxN('tripleArrow'), m = atkMul();
  G.shotN++;
  const fire5 = fxN('fireArrow') && G.shotN % 5 === 0;
  for (let i = 0; i < n; i++) {
    const aa = a + (i - (n - 1) / 2) * wp.spread + (wp.fx === 'pellet' ? rnd(-0.05, 0.05) : 0), sp = wp.sp * (wp.fx === 'pellet' ? rnd(0.85, 1.1) : 1);
    const s = shot({ kind: wp.fx, x: ox, y: oy, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, dmg: p.dmg * m, pierce: fxN('pierceAll') ? 60 : wp.pierce + skLv('pierce') + fxN('pierce1'), life: p.range / sp * 1.15, src: 'player', r: wp.fx === 'tracer' ? 10 : 9,
      slow: fxN('chillBolt') ? 1.2 : 0, bounce: 2 * fxN('bounce2'), burn: fxN('firePellet') ? 1 : 0, kbx: fxN('bigKnock') ? 26 : 0 });
    if (fire5) { s.R = 60; s.fire = 1; s.dmg *= 2; }
  }
  p.recoil = 1; p.muzzle = 0.07; p.atkA = 0.32;
  const mc = wp.fx === 'bolt' ? '140,230,255' : wp.fx === 'arrow' ? '255,230,150' : '255,200,90';
  FX.p({ kind: 'glow', x: ox + Math.cos(a) * 14, y: oy + Math.sin(a) * 14, life: 0.08, s: wp.fx === 'tracer' || wp.fx === 'pellet' ? 40 : 22, s2: 10, c: mc, hard: 1 });
  if (wp.fx === 'tracer' || wp.fx === 'pellet') { FX.smoke(ox + Math.cos(a) * 18, oy + Math.sin(a) * 18, 2, '200,200,200', 8, 30); FX.spark(ox + Math.cos(a) * 16, oy + Math.sin(a) * 16, '255,220,120', 4, 200); sfx('gun'); } else sfx('shoot');
}

function skills(dt) {
  const p = G.player, m = atkMul();
  for (const id in G.sk) {
    const lv = G.sk[id], S = SKILLS.find(s => s.id === id);
    if (S.kind !== 'atk') continue;
    const A = aw(id), sm = m * starMul(id) * elMul(S.el) * lvK(lv) * (A ? 1.5 : 1);
    if (id === 'dance') {
      const n = 1 + lv, R = A ? 140 : lv >= 5 ? 118 : 100, sp = 3.4;
      for (let i = 0; i < n; i++) {
        const a = G.t * sp + i / n * TAU, x = p.x + Math.cos(a) * R, y = p.y - 30 + Math.sin(a) * R * 0.62;
        if (Math.random() < dt * 30) FX.trail(x, y, '255,120,160', 12, 0.25);
        for (const e of G.enemies) { if (e.dead) continue; if (Math.abs(e.x - x) < e.r + 22 && Math.abs(e.y - e.hh * 0.4 - y) < e.r + 26) { e.danceCd = e.danceCd || 0; if (e.danceCd <= G.t) { e.danceCd = G.t + 0.35; hurtEnemy(e, (8 + 4 * lv) * sm * (A ? 1.4 : 1), 'skill', { kb: 10, kx: p.x, ky: p.y }); FX.hit(x, y, '255,150,190'); if (A || lv >= 3) { e.burnT = 2; e.burnD = (A ? 4 : 2) * sm; } } } }
      }
      continue;
    }
    if (id === 'beam') {
      let src = { x: p.x, y: p.y - 50 }, used = [];
      let cur = nearestEnemy(p.x, p.y, 380);
      for (let k = 0; k < lv && cur; k++) {
        used.push(cur);
        const tx = cur.x, ty = cur.y - cur.hh * 0.5;
        G.beams.push({ x1: src.x, y1: src.y, x2: tx, y2: ty, c: '255,70,60', w: (A ? 16 : 10) - k, t: dt * 1.5, life: dt * 1.5, cont: 1 });
        hurtEnemy(cur, (18 + 9 * lv) * sm * dt * (A ? 1.5 : 1), 'skill', { acc: 1, nocrit: 1 });
        if (A || lv >= 3) { cur.burnT = 1.5; cur.burnD = (A ? 6 : 3) * sm; }
        if (Math.random() < dt * 20) FX.spark(tx, ty, '255,180,140', 2, 220);
        src = { x: tx, y: ty }; cur = nearestEnemy(tx, ty, 160, used);
      }
      continue;
    }
    G.skT[id] = (G.skT[id] || 0) - dt / Math.pow(0.9, fxN('skillCd10'));
    if (G.skT[id] > 0) continue;
    if (id === 'ghost') {
      const tg = nearestEnemy(p.x, p.y, 460); if (!tg) { G.skT[id] = 0.3; continue; }
      G.skT[id] = 2.3 - 0.12 * lv;
      for (let i = 0; i < 2 + lv + (A ? 3 : 0); i++) G.queue.push({ t: i * 0.07, fn: () => { const a = -Math.PI / 2 + rnd(-1.2, 1.2), es = G.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 480); const T = es.length ? pick(es) : null; shot({ kind: 'ghost', x: p.x, y: p.y - 50, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, sp: 560, dmg: (12 + 5 * lv) * sm, pierce: lv >= 3 ? 1 : 0, life: 2.2, src: 'skill', target: T, home: 9, r: 12 + (lv >= 4 ? 4 : 0), R: A ? 46 : lv >= 5 ? 28 : 0, pal: 'purple' }); sfx('shoot', 0.5); } });
    } else if (id === 'meteor') {
      const tg = densest(p.x, p.y, 520); if (!tg) { G.skT[id] = 0.3; continue; }
      G.skT[id] = 5.5 - 0.3 * lv;
      for (let i = 0; i < lv; i++) { const T = i ? (pick(G.enemies.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < 520)) || tg) : tg; const tx = T.x + rnd(-20, 20), ty = T.y + rnd(-20, 20); G.tele.push({ x: tx, y: ty, r: 70 + 6 * lv, t: 0.7 + i * 0.15, life: 0.7 + i * 0.15, c: '255,90,40' }); G.queue.push({ t: i * 0.15, fn: () => shot({ kind: 'meteor', x: tx - 200, y: ty - 620, tx, ty, T: 0.7, age: 0, dmg: (30 + 12 * lv) * sm, R: 70 + 8 * lv, zone: (10 + 4 * lv) * sm, zoneK: A ? 1.6 : 1, stun: lv >= 4 ? 0.7 : 0, src: 'skill', life: 9, pierce: 99, nohit: 1 }) }); }
    } else if (id === 'thunder') {
      const es = G.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 440); if (!es.length) { G.skT[id] = 0.3; continue; }
      G.skT[id] = 3.4 - 0.2 * lv;
      for (let i = 0; i < 1 + lv; i++) G.queue.push({ t: i * 0.09, fn: () => { const e = pick(es); if (!e || e.dead) return; FX.skyBolt(e.x, e.y, '150,200,255', 1.2); sfx('zap'); const ex = e.x, ey = e.y; hurtEnemy(e, (34 + 12 * lv) * sm, 'skill'); if (lv >= 5 && !e.boss) e.stunT = Math.max(e.stunT, 0.5); for (const o of G.enemies) if (o !== e && Math.hypot(o.x - ex, o.y - ey) < 55) hurtEnemy(o, (14 + 5 * lv) * sm, 'skill'); if (!A && lv >= 3) { const n3 = nearestEnemy(ex, ey, 150, [e]); if (n3) chainLightning(ex, ey - 30, n3, (16 + 6 * lv) * sm, 1, '150,200,255', 'skill'); } if (A) { const n2 = nearestEnemy(ex, ey, 160, [e]); if (n2) chainLightning(ex, ey - 30, n2, (20 + 8 * lv) * sm, 3, '150,200,255', 'skill'); } } });
    } else if (id === 'ice') {
      const tg = nearestEnemy(p.x, p.y, 400); if (!tg) { G.skT[id] = 0.3; continue; }
      G.skT[id] = 2.8 - 0.1 * lv;
      const a0 = Math.atan2(tg.y - p.y, tg.x - p.x), n = 3 + lv;
      for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.17; shot({ kind: 'ice', x: p.x, y: p.y - 40, vx: Math.cos(a) * 700, vy: Math.sin(a) * 700, dmg: (10 + 4 * lv) * sm, pierce: lv >= 3 ? 2 : 1, life: 0.65, src: 'skill', slow: 2, frz: A ? 1 : lv >= 5 ? 0.35 : lv >= 3 ? 0.12 : 0, r: 10 + (lv >= 4 ? 3 : 0) }); }
      FX.ring(p.x, p.y - 30, 50, '180,240,255', 0.25, 4); sfx('shoot', 0.7);
    } else if (id === 'talisman') {
      const tg = nearestEnemy(p.x, p.y, 460); if (!tg) { G.skT[id] = 0.3; continue; }
      G.skT[id] = 3.4 - 0.2 * lv;
      for (let i = 0; i < 1 + Math.floor(lv / 2) + (lv >= 4 ? 1 : 0); i++) { const a = -Math.PI / 2 + (i - 0.5) * 0.8; const T = i ? (densest(p.x, p.y, 460) || tg) : tg; shot({ kind: 'talisman', x: p.x, y: p.y - 50, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, sp: 460, dmg: (24 + 10 * lv) * sm, R: 70 + 8 * lv, pierce: 0, life: 2.4, src: 'skill', target: T, home: 6, r: 14, rot: 0, twice: A }); }
    } else if (id === 'vortex') {
      const tg = densest(p.x, p.y, 460); if (!tg) { G.skT[id] = 0.3; continue; }
      G.skT[id] = 7 - 0.4 * lv;
      const a = Math.atan2(tg.y - p.y, tg.x - p.x);
      G.vortexes.push({ x: p.x, y: p.y - 10, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, t: 3.6 + (lv >= 5 ? 1 : 0), life: 3.6 + (lv >= 5 ? 1 : 0), r: lv >= 3 ? 115 : 90, dps: (16 + 7 * lv) * sm, tick: 0 });
      if (A) G.vortexes.push({ x: p.x, y: p.y - 10, vx: Math.cos(a + 0.9) * 110, vy: Math.sin(a + 0.9) * 110, t: 3.6, life: 3.6, r: 90, dps: (16 + 7 * lv) * sm, tick: 0 });
    }
  }
}

function turrets(dt) {
  const bl0 = 1 + skLv('bless') * 0.4;
  for (const t of G.turrets) {
    t.hitT -= dt; t.fire -= dt;
    const d = TUR[t.type];
    if (t.seal > 0) { t.seal -= dt; continue; }
    if (d.kind === 'mine') { if (Math.random() < dt * 0.6) FX.p({ kind: 'glow', x: t.x + rnd(-14, 14), y: t.y - rnd(10, 40), vy: -30, life: 0.8, s: 6, s2: 1, c: '255,220,90' }); continue; }
    const bl = bl0 * (1 + 0.4 * (t.lv - 1)) * (1 + 0.2 * fxN('build20')) * (1 + 0.05 * (G.cfg.heroLv - 1)) * chElK(TUR_EL[t.type]), oy = t.y - d.top * 0.75;
    if (d.kind === 'barracks') {
      t.cd -= dt; const lv = t.lv, cap = 2 + Math.floor(lv * 1.5) + (G.setBarracks || 0), mine = (G.allies || []).filter(a => a.style === 'soldier' && a.home === t).length;
      if (t.cd <= 0 && mine < cap && isNight()) { t.cd = Math.max(2.5, d.rate - lv * 0.9); const types = Object.keys(D.SOLDIER).filter(k => D.SOLDIER[k].unlock <= lv); spawnSoldier(t, pick(types)); }
      continue;
    }
    if (d.kind === 'heal') {
      t.cd -= dt; if (Math.random() < dt * 3) FX.p({ kind: 'glow', x: t.x + rnd(-20, 20), y: t.y - rnd(0, 30), vy: -40, life: 0.8, s: 7, s2: 2, c: '120,255,160' });
      if (t.cd <= 0) { t.cd = d.rate; const amt = d.heal * t.lv * (pairOn('p_dae') ? 2 : 1); const P = G.player; if (Math.hypot(P.x - t.x, P.y - t.y) < d.range && P.hp < P.max) { P.hp = Math.min(P.max, P.hp + amt); FX.num(P.x, P.y - 80, amt, false, '#7eff7e'); FX.p({ kind: 'glow', x: P.x, y: P.y - 40, life: 0.3, s: 40, s2: 10, c: '120,255,160' }); }
        for (const o of G.turrets) if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) < d.range) o.hp = Math.min(o.max, o.hp + amt * 2);
        for (const w of G.walls) if (w.hp > 0 && Math.abs(w.x - t.x) < d.range && Math.abs(WALL_Y - t.y) < d.range) w.hp = Math.min(w.max, w.hp + amt * 2); }
      continue;
    }
    if (d.kind === 'aura') {
      t.pulse += dt; const pr = d.range * (jangPair() ? 1.3 : 1);
      for (const e of G.enemies) if (Math.hypot(e.x - t.x, e.y - t.y) < pr) { e.slowT = Math.max(e.slowT, 0.2); if (pairOn('p_sam') && !e.boss && Math.random() < dt * 0.35) { e.stunT = 0.8; FX.num(e.x, e.y - e.hh, '기절', false, '#9fdcff'); } if (Math.random() < dt * 2) hurtEnemy(e, d.dps * bl * 0.5, 'building', { col: '#9fdcff' }); }
      continue;
    }
    if (d.kind === 'flame') {
      const fr = d.range * (pairOn('p_hae') ? 1.4 : 1), fk = pairOn('p_hae') ? 1.5 : 1;
      const e = nearestEnemy(t.x, t.y, fr); if (!e) continue;
      const a = Math.atan2(e.y - oy, e.x - t.x); t.fire = 0.1;
      for (let i = 0; i < 2; i++) { const aa = a + rnd(-0.22, 0.22), v = rnd(260, 380); FX.p({ kind: 'glow', x: t.x + Math.cos(a) * 16, y: oy + Math.sin(a) * 16, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, life: fr / v, s: rnd(10, 16), s2: rnd(22, 30), c: Math.random() < 0.4 ? '255,220,120' : '255,110,30', hard: 1, drag: 0.5 }); }
      t.cd -= dt; if (t.cd <= 0) { t.cd = 0.2; for (const o of G.enemies) { const dd = Math.hypot(o.x - t.x, o.y - oy); if (dd < fr + o.r && Math.abs(((Math.atan2(o.y - oy, o.x - t.x) - a + Math.PI * 3) % TAU) - Math.PI) < 0.35) hurtEnemy(o, d.dps * bl * 0.2 * fk, 'building', { acc: 1 }); } }
      continue;
    }
    const e0 = nearestEnemy(t.x, t.y, d.range); if (e0) { const want = Math.atan2(e0.y - t.y, e0.x - t.x); let da = ((want - (t.aim || -Math.PI / 2)) + Math.PI * 3) % TAU - Math.PI; t.aim = (t.aim || -Math.PI / 2) + clamp(da, -6 * dt, 6 * dt); }
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 5);
    t.cd -= dt;
    if (t.cd > 0) continue;
    const e = nearestEnemy(t.x, t.y, d.range);
    if (!e) { t.cd = 0.1; continue; }
    t.cd = d.rate / (bl0 * (1 + 0.1 * (t.lv - 1))); t.fire = 0.12;
    const ty = e.y - e.hh * 0.5;
    if (d.kind === 'beam') {
      G.beams.push({ x1: t.x, y1: t.y - d.top * 0.78, x2: e.x, y2: ty, c: d.col, w: 7, t: 0.16, life: 0.16 });
      const pair = jangPair(); hurtEnemy(e, d.dmg * bl * (pair ? 1.4 : 1), 'building'); FX.hit(e.x, ty, '255,140,100', true); sfx('zap', 0.4);
      if (pair) { const e2 = G.enemies.find(o => o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 120); if (e2) { G.beams.push({ x1: e.x, y1: ty, x2: e2.x, y2: e2.y - e2.hh * 0.5, c: '120,190,255', w: 5, t: 0.16, life: 0.16 }); hurtEnemy(e2, d.dmg * bl * 0.7, 'building'); } }
    } else if (d.kind === 'shot' && d.crew) {
      const [spr, n] = crewOf(t), y0 = t.y + 18 - d.top * 0.62 - 20; t.crewA = t.crewA || [];
      const W2 = spr === 's_gun' ? { sp: 1400, dmg: 3.2, kind: 'tracer', burst: 1, pierce: 2, rate: 1.9 } : spr === 's_crossbow' ? { sp: 980, dmg: 0.75, kind: 'bolt', burst: 3, pierce: 0, rate: 1.0 } : { sp: 780, dmg: 1, kind: 'tarrow', burst: 1, pierce: 0, rate: 1 };
      t.cd = d.rate * W2.rate / (bl0 * (1 + 0.1 * (t.lv - 1)));
      for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * 16; const T2 = i ? (pick(G.enemies.filter(o => Math.hypot(o.x - t.x, o.y - t.y) < d.range)) || e) : e;
        for (let b = 0; b < W2.burst; b++) G.queue.push({ t: i * 0.07 + b * 0.09, fn: () => { if (T2.dead) return; const sx = t.x + ox, a2 = Math.atan2(T2.y - T2.hh * 0.45 - y0, T2.x - sx); t.crewA[i] = 0.3;
          shot({ kind: W2.kind, x: sx, y: y0, vx: Math.cos(a2) * W2.sp, vy: Math.sin(a2) * W2.sp, dmg: d.dmg * bl * W2.dmg * (pairOn('p_yi') ? 1.5 : 1), pierce: W2.pierce, life: 0.7, src: 'building', r: 8, burn: pairOn('p_yi') ? 1 : 0, fire: pairOn('p_yi') ? 1 : 0 });
          if (W2.kind === 'tracer') { FX.p({ kind: 'glow', x: sx + Math.cos(a2) * 10, y: y0 + Math.sin(a2) * 10, life: 0.08, s: 26, s2: 8, c: '255,210,120', hard: 1 }); FX.smoke(sx + Math.cos(a2) * 12, y0, 2, '210,210,210', 8, 30); sfx('gun', 0.35); } else sfx('shoot', 0.3); } }); }
    } else if (d.kind === 'shot') {
      const a = Math.atan2(ty - oy, e.x - t.x);
      shot({ kind: 'tarrow', x: t.x, y: oy, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, dmg: d.dmg * bl, pierce: 0, life: 0.6, src: 'building' });
      if (t.lv >= 3) shot({ kind: 'tarrow', x: t.x, y: oy, vx: Math.cos(a + 0.12) * 760, vy: Math.sin(a + 0.12) * 760, dmg: d.dmg * bl, pierce: 0, life: 0.6, src: 'building' });
    } else if (d.kind === 'rocket') {
      t.recoil = 0.6;
      for (let i = 0; i < d.shots * (pairOn('p_jeon') ? 2 : 1); i++) G.queue.push({ t: i * 0.06, fn: () => { const a = t.aim + rnd(-0.35, 0.35); const T = pick(G.enemies.filter(o => Math.hypot(o.x - t.x, o.y - t.y) < d.range)) || e; shot({ kind: 'rocket', x: t.x + rnd(-10, 10), y: oy, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, sp: 520, dmg: d.dmg * bl, R: 40, pierce: 0, life: 1.6, src: 'building', target: T, home: 5, r: 10 }); sfx('shoot', 0.4); } });
    } else if (d.kind === 'shell') {
      t.recoil = 1; const mzx = t.x + Math.cos(t.aim) * 34, mzy = t.y - 18 + Math.sin(t.aim) * 22; FX.p({ kind: 'glow', x: mzx, y: mzy, life: 0.12, s: 50, s2: 14, c: '255,210,120', hard: 1 }); FX.smoke(mzx, mzy, 6, '170,160,150', 16, 40); FX.spark(mzx, mzy, '255,200,100', 8, 260); FX.shake = Math.max(FX.shake, 0.06);
      shot({ kind: 'shell', x: mzx, y: mzy, sx: mzx, sy: mzy, tx: e.x, ty: e.y, T: 0.9, age: 0, dmg: d.dmg * bl, R: d.splash, src: 'building', life: 9, pierce: 99, nohit: 1, frzAll: pairOn('p_eul') ? 1 : 0 });
      FX.p({ kind: 'glow', x: t.x, y: oy - 6, life: 0.12, s: 44, s2: 16, c: '255,200,100', hard: 1 }); FX.smoke(t.x, oy - 8, 5, '160,150,140', 14, 50); sfx('gun');
      G.tele.push({ x: e.x, y: e.y, r: d.splash, t: 0.9, life: 0.9, c: '255,140,60' });
    } else if (d.kind === 'chain') {
      chainLightning(t.x, t.y - d.top * 0.85, e, d.dmg * bl * (pairOn('p_gang') ? 1.4 : 1), 3 + t.lv + (pairOn('p_gang') ? 2 : 0), pairOn('p_gang') ? '150,200,255' : '200,140,255', 'building');
    }
  }
}

/* 사방신 영혼: 석상에서 빠져나와 잔상으로만 움직이며 공격하고 돌아간다 */
const SPIRIT = { dragon: { spr: 'sp_dragon', col: '90,170,255', cd: 15, fly: 1 }, tiger: { spr: 'sp_tiger', col: '225,232,245', cd: 14 }, phoenix: { spr: 'sp_phoenix', col: '255,225,150', cd: 15, fly: 1 }, turtle: { spr: 'sp_turtle', col: '90,220,200', cd: 18 } };
function guards(dt) {
  if (!G.spirits) G.spirits = [];
  for (const g of G.guards) {
    g.pulse += dt; if (g.seal > 0) { g.seal -= dt; continue; }
    g.cd = (g.cd == null ? 4 : g.cd) - dt;
    const Gd = GUARD[g.id], SP = SPIRIT[g.id];
    if (g.cd > 0 || G.spirits.some(s => s.g === g)) continue;
    const e = densest(g.x, g.y, Gd.range * 1.6) || nearestEnemy(g.x, g.y, Gd.range * 1.6); if (!e) { g.cd = 0.5; continue; }
    g.cd = SP.cd; g.flash = 0.6;
    G.spirits.push({ g, id: g.id, x: g.x, y: g.y - 30, z: 0, ph: 'out', t: 0, tx: e.x, ty: e.y, trail: [], fdir: Math.atan2(e.y - g.y, e.x - g.x), hits: 0 });
    FX.ring(g.x, g.y, 70, SP.col, 0.5, 8); sfx('ult', 0.5);
  }
  for (const s of G.spirits) {
    const SP = SPIRIT[s.id], g = s.g, m = atkMul() * 0.9; s.t += dt;
    const go = (tx, ty, sp) => { const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy); if (d > 4) { const k = Math.min(1, sp * dt / d); s.x += dx * k; s.y += dy * k; s.fdir = Math.atan2(dy, dx); } return d; };
    if (s.ph === 'out') {
      if (s.id === 'turtle') { s.z = 1; if (s.t > 0.35 && !s.tp) { s.tp = 1; s.trail = []; FX.ring(s.x, s.y, 60, SP.col, 0.4, 6); for (let k = 0; k < 14; k++) FX.p({ kind: 'glow', x: s.x + rnd(-30, 30), y: s.y - rnd(0, 60), vy: -rnd(20, 60), life: 0.5, s: 5, s2: 1, c: SP.col }); s.x = s.tx; s.y = s.ty; FX.ring(s.x, s.y, 120, SP.col, 0.5, 8); } if (s.t > 0.55) { s.ph = 'atk'; s.t = 0; } }
      else { s.z = Math.min(1, s.t / 0.5); const d = go(s.tx, s.ty - (SP.fly ? 60 : 0), s.id === 'phoenix' ? 430 : s.id === 'tiger' ? 700 : 560); if (d < 20 || s.t > 1.8) { s.ph = 'atk'; s.t = 0; } }
    }
    else if (s.ph === 'atk') {
      const dur = s.id === 'turtle' ? 2.2 : 1.4;
      if (s.id === 'dragon' && s.t > s.hits * 0.25 && s.hits < 5) { s.hits++; const e = pick(G.enemies.filter(o => Math.hypot(o.x - s.x, o.y - s.y) < 260)); if (e) { FX.skyBolt(e.x, e.y, '120,190,255', 1.3); chainLightning(e.x, e.y - 30, e, 34 * m, 3, '120,190,255', 'building'); } s.x += Math.sin(s.t * 6) * 3; }
      if (s.id === 'tiger' && s.t > s.hits * 0.35 && s.hits < 3) { s.hits++; const e = nearestEnemy(s.x, s.y, 220); if (e) { s.x = e.x - 20; s.y = e.y; for (const o of G.enemies) if (Math.hypot(o.x - e.x, o.y - e.y) < 70) hurtEnemy(o, 40 * m, 'building', { kb: 26, kx: s.x, ky: s.y }); G.marks.push({ x: e.x, y: e.y - 30, t: 0.3, life: 0.3, a: rnd(-0.8, 0.8) }); FX.spark(e.x, e.y - 30, '235,240,255', 14, 380); sfx('hit'); } if (s.hits === 3) { FX.ring(s.x, s.y, 150, '230,236,250', 0.4, 12); for (const o of G.enemies) if (Math.hypot(o.x - s.x, o.y - s.y) < 150) { o.stunT = 0.8; hurtEnemy(o, 12 * m, 'building', { kb: 40, kx: s.x, ky: s.y }); } } }
      if (s.id === 'phoenix') { if (s.t < 0.5) s.z = 1 + s.t * 2; else if (!s.dove) { s.dove = 1; s.z = 0.6; FX.explode(s.x, s.y, 110); for (const o of G.enemies) if (Math.hypot(o.x - s.x, o.y - s.y) < 130) hurtEnemy(o, 70 * m, 'building'); G.zones.push({ x: s.x, y: s.y, r: 110, t: 3, life: 3, dps: 16 * m, src: 'building', tick: 0 }); sfx('boom'); } }
      if (s.id === 'turtle') { if (!s.dome) { s.dome = 1; FX.ring(s.x, s.y, 200, '90,220,200', 0.6, 14); } for (const o of G.enemies) { const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < 200) { o.slowT = Math.max(o.slowT, 0.3); if (d > 1 && !o.boss) { o.x += (o.x - s.x) / d * 40 * dt; o.y += (o.y - s.y) / d * 40 * dt; } } } if (Math.random() < dt * 3) for (const o of G.enemies) if (Math.hypot(o.x - s.x, o.y - s.y) < 200) hurtEnemy(o, 8 * m, 'building', { col: '#8ff0dc' }); }
      if (s.t > dur) { s.ph = 'back'; s.t = 0; }
    } else if (s.id === 'turtle') { if (s.t > 0.3 && !s.tb) { s.tb = 1; FX.ring(s.x, s.y, 70, SP.col, 0.4, 6); s.x = g.x; s.y = g.y - 30; s.trail = []; } if (s.t > 0.5) { s.done = true; g.flash = 0.5; } }
    else { s.z = Math.max(0, 1 - s.t / 0.8); const d = go(g.x, g.y - 30, 700); if (d < 20 || s.t > 1.2) { s.done = true; g.flash = 0.5; FX.ring(g.x, g.y, 60, SP.col, 0.4, 6); } }
    /* 잔상 기록 */
    s.trail.push({ x: s.x, y: s.y, z: s.z, d: s.fdir, t: G.t }); if (s.trail.length > 12) s.trail.shift();
  }
  G.spirits = G.spirits.filter(s => !s.done);
}
/* 주작은 날개가 펼쳐 보이는 대각선 방향만 쓴다 */
function spDir(id, a) { const d = dir8(a); return id === 'phoenix' && d % 2 === 0 ? (d + 1) % 8 : d; }
function drawSpirit(s) {
  const SP = SPIRIT[s.id], sp = SPR[SP.spr];
  const hop = s.id === 'tiger' && s.ph !== 'atk' ? Math.abs(Math.sin(G.t * 9)) * 34 : 0, glide = s.id === 'phoenix' ? Math.sin(G.t * 1.6) * 16 : s.id === 'dragon' ? Math.sin(G.t * 2.2) * 10 : 0;
  const lift = (SP.fly ? 70 * Math.max(0.4, s.z) : 0) + hop + glide;
  const an = s.ph === 'atk' ? 'atk' : 'walk', at = s.ph === 'atk' ? Math.min(1, s.t / 1.4) : null;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  /* 잔상: 뒤에서부터 옅게 */
  for (let i = 0; i < s.trail.length - 1; i++) { const p = s.trail[i], k = (i + 1) / s.trail.length; drawSprite(SP.spr, p.x, p.y - (SP.fly ? 70 * Math.max(0.4, p.z) : 0), { anim: an, at, dir: spDir(s.id, p.d), t: p.t, mode: 'sp_' + s.id, alpha: (0.06 + 0.3 * k * k) * (s.id === 'tiger' ? 0.65 : 1), sc: 1.3 }); }
  /* 맨 앞: 윤곽선과 옅은 결 */
  const fade = s.ph === 'back' ? Math.max(0, 1 - s.t / 0.8) : s.ph === 'out' ? Math.min(1, s.t / 0.35) : 1;
  const tpFade = s.id === 'turtle' ? (s.ph === 'out' ? (s.t < 0.35 ? 1 - s.t / 0.35 : (s.t - 0.35) / 0.2) : s.ph === 'back' ? Math.max(0, 1 - s.t / 0.3) : 1) : 1;
  drawSprite(SP.spr, s.x, s.y - lift, { anim: an, at, dir: spDir(s.id, s.fdir), t: G.t * (s.id === 'phoenix' ? 0.6 : 1), mode: 'sp_' + s.id, alpha: (s.ph === 'atk' ? 0.95 : 0.75) * fade * Math.max(0, Math.min(1, tpFade)), sc: 1.3, rot: s.id === 'tiger' && hop ? -Math.cos(G.t * 9) * 0.12 * Math.sign(Math.cos(s.fdir) || 1) : 0 });

  if (Math.random() < 0.6) { const pc = s.id === 'dragon' ? '170,220,255' : s.id === 'tiger' ? '240,245,255' : s.id === 'phoenix' ? '255,210,120' : '140,240,220'; FX.p({ kind: s.id === 'dragon' && Math.random() < 0.3 ? 'spark' : 'glow', x: s.x + rnd(-40, 40), y: s.y - lift - rnd(10, 90), vx: rnd(-30, 30), vy: s.id === 'turtle' ? rnd(10, 40) : -rnd(20, 70), life: rnd(0.4, 0.8), s: rnd(3, 6), s2: 1, c: pc }); }
  ctx.restore();
}

function comps(dt) {
  const m = atkMul() * compMul();
  for (const c of G.comps) {
    if (!c.active || c.drop > 0 || c.dash) continue;
    const C = COMP[c.id], el = elMul(C.el); c.cd -= dt;
    const dm = C.dmg * m * el;
    /* 해태: 가까우면 앞발 후려치기, 떨어져 있으면 입으로 불뿜기 */
    if (c.id === 'haetae') {
      const e = nearestEnemy(c.x, c.y, C.range); if (!e) continue;
      const a = Math.atan2(e.y - e.hh * 0.4 - (c.y - 34), e.x - c.x), de = Math.hypot(e.x - c.x, e.y - c.y); c.flip = Math.cos(a) < 0; c.fdir = a;
      if (de < 78 + e.r) {
        c.atkK = 'atk'; if (c.cd <= 0) { c.cd = 0.75; c.fire = 0.45; G.queue.push({ t: 0.22, fn: () => { for (const o of G.enemies) { const dd = Math.hypot(o.x - c.x, o.y - c.y); if (dd < 96 + o.r && Math.abs(((Math.atan2(o.y - c.y, o.x - c.x) - a + Math.PI * 3) % TAU) - Math.PI) < 0.9) hurtEnemy(o, dm * 1.6, 'hero', { kb: 26, kx: c.x, ky: c.y }); } FX.slash ? FX.slash(c.x + Math.cos(a) * 46, c.y - 24 + Math.sin(a) * 30, a, '255,240,200') : FX.hit(c.x + Math.cos(a) * 50, c.y - 26, '255,240,200', true); FX.shake = Math.max(FX.shake || 0, 0.08); } }); }
      } else {
        c.atkK = 'atk2'; c.fire = Math.max(c.fire, 0.15);
        const mx = c.x + Math.cos(a) * 34, my = c.y - 40 + Math.sin(a) * 18;
        for (let i = 0; i < 2; i++) { const aa = a + rnd(-0.22, 0.22), v = rnd(280, 380); FX.p({ kind: 'glow', x: mx, y: my, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, life: C.range / v * 0.9, s: rnd(8, 14), s2: rnd(22, 32), c: Math.random() < 0.35 ? '255,230,130' : '255,100,30', hard: 1, drag: 0.6 }); }
        if (c.cd <= 0) { c.cd = 0.2; for (const o of G.enemies) { const dd = Math.hypot(o.x - c.x, o.y - c.y); if (dd < C.range + o.r && Math.abs(((Math.atan2(o.y - c.y, o.x - c.x) - a + Math.PI * 3) % TAU) - Math.PI) < 0.4) hurtEnemy(o, dm * 0.2, 'hero', { acc: 1 }); } }
      }
      continue;
    }
    if (c.id === 'haetae' || c.id === 'wonhyo' || c.id === 'imugi') {
      const e = nearestEnemy(c.x, c.y, C.range); if (!e) continue;
      const sy = c.y - (c.id === 'wonhyo' ? 56 : c.id === 'imugi' ? 110 : 30), a = Math.atan2(e.y - e.hh * 0.4 - sy, e.x - c.x); c.flip = Math.cos(a) < 0; c.fire = 0.1; c.fdir = a;
      if (c.id === 'haetae' || c.id === 'imugi') {
        for (let i = 0; i < 2; i++) { const aa = a + rnd(-0.25, 0.25), v = rnd(280, 380); FX.p({ kind: 'glow', x: c.x + Math.cos(a) * 20, y: sy + Math.sin(a) * 20, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, life: C.range / v * 0.9, s: rnd(8, 14), s2: rnd(20, 30), c: Math.random() < 0.35 ? '255,230,130' : '255,100,30', hard: 1, drag: 0.6 }); }
        if (c.cd <= 0) { c.cd = 0.2; for (const o of G.enemies) { const dd = Math.hypot(o.x - c.x, o.y - c.y); if (dd < C.range + o.r && Math.abs(((Math.atan2(o.y - c.y, o.x - c.x) - a + Math.PI * 3) % TAU) - Math.PI) < 0.4) hurtEnemy(o, dm * 0.2, 'hero', { acc: 1 }); } }
      } else {
        G.beams.push({ x1: c.x + (c.flip ? -10 : 10), y1: sy, x2: e.x, y2: e.y - e.hh * 0.5, c: '255,200,90', w: 9, t: dt * 1.5, life: dt * 1.5, cont: 1 });
        hurtEnemy(e, dm * dt, 'hero', { acc: 1, nocrit: 1 });
        if (Math.random() < dt * 14) FX.spark(e.x, e.y - e.hh * 0.5, '255,230,150', 2, 200);
      }
      continue;
    }
    if (c.cd > 0) continue;
    const e = nearestEnemy(c.x, c.y, C.range); if (!e) { c.cd = 0.15; continue; }
    c.cd = C.rate; c.fire = 0.35; c.flip = e.x < c.x; c.fdir = Math.atan2(e.y - c.y, e.x - c.x);
    const a = Math.atan2(e.y - e.hh * 0.45 - (c.y - 40), e.x - c.x);
    if (c.id === 'dokkaebi') {
      shot({ kind: 'club', x: c.x, y: c.y - 40, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: dm, pierce: 99, life: 1.4, src: 'hero', owner: c, ret: 0.5, r: 18, rot: 0, rehit: 0.25 }); sfx('shoot', 0.6);
    } else if (c.id === 'yisunsin') {
      for (let i = 0; i < 5; i++) { const aa = a + (i - 2) * 0.09; shot({ kind: 'arrow', x: c.x, y: c.y - 44, vx: Math.cos(aa) * 950, vy: Math.sin(aa) * 950, dmg: dm, pierce: 1, life: 0.5, src: 'hero', r: 9 }); }
      FX.p({ kind: 'glow', x: c.x + Math.cos(a) * 16, y: c.y - 44 + Math.sin(a) * 16, life: 0.08, s: 24, s2: 8, c: '255,220,150', hard: 1 }); sfx('shoot', 0.6);
    } else if (c.id === 'eulji') {
      if (Math.hypot(e.x - c.x, e.y - c.y) > 240) { c.cd = 0.1; continue; }
      const tx = e.x - Math.cos(a) * 30, ty = e.y + 8;
      c.dash = { sx: c.x, sy: c.y, tx, ty, t: 0.16, T: 0.16, fn: () => {
        FX.ring(c.x, c.y - 10, 100, '160,220,255', 0.3, 10); G.marks.push({ x: c.x, y: c.y - 30, t: 0.25, life: 0.25, a: rnd(-0.6, 0.6) }); FX.spark(c.x, c.y - 30, '200,240,255', 10, 320); sfx('hit');
        for (const o of G.enemies) if (Math.hypot(o.x - c.x, o.y - c.y) < 100 + o.r) hurtEnemy(o, dm, 'hero', { kb: 18, kx: c.x, ky: c.y });
      } };
    } else if (c.id === 'jangyeongsil') {
      G.gadgets = G.gadgets || []; const live = G.gadgets.filter(g => g.t > 0);
      if (live.length < 2) { const pj = pairOn('p_jang'); G.gadgets.push({ x: c.x + rnd(-40, 40), y: c.y + rnd(-10, 20), t: pj ? 14 : 9, cd: 0.2, dm: dm * 0.55 * (pj ? 1.6 : 1), a: -Math.PI / 2 }); FX.smoke(c.x, c.y, 4, '200,190,170', 12, 26); sfx('build'); }
      else { const aa = Math.atan2(e.y - e.hh * 0.5 - (c.y - 40), e.x - c.x); shot({ kind: 'tracer', x: c.x, y: c.y - 40, vx: Math.cos(aa) * 1100, vy: Math.sin(aa) * 1100, dmg: dm, pierce: 1, life: 0.5, src: 'hero', r: 8 }); sfx('gun', 0.35); }
    } else if (c.id === 'gangamchan') {
      chainLightning(c.x, c.y - 60, e, dm, 4, '140,190,255', 'hero');
    } else if (c.id === 'samjoko') {
      const tg = [e]; for (let i = 0; i < 2; i++) { const o = nearestEnemy(e.x + rnd(-120, 120), e.y + rnd(-120, 120), 200, tg); if (o) tg.push(o); }
      tg.forEach((o, i) => G.queue.push({ t: i * 0.08, fn: () => { if (o.dead) return; const sx = c.x, sy = c.y - 50, aa = Math.atan2(o.y - o.hh * 0.5 - sy, o.x - sx), L = 520; const ex = sx + Math.cos(aa) * L, ey = sy + Math.sin(aa) * L; G.beams.push({ x1: sx, y1: sy, x2: ex, y2: ey, c: '255,210,80', w: 9, t: 0.2, life: 0.2 }); for (const q of G.enemies) { const px = q.x - sx, py = q.y - q.hh * 0.5 - sy, along = px * Math.cos(aa) + py * Math.sin(aa), off = Math.abs(-px * Math.sin(aa) + py * Math.cos(aa)); if (along > 0 && along < L && off < q.r + 10) { hurtEnemy(q, dm, 'hero'); FX.hit(q.x, q.y - q.hh * 0.5, '255,230,140'); } } sfx('zap', 0.4); } }));
    } else if (c.id === 'honggildong') {
      const srcs = [{ x: c.x, y: c.y }, { x: c.x - 54, y: c.y - 20 }, { x: c.x + 54, y: c.y - 20 }];
      srcs.forEach((s, i) => { const t2 = nearestEnemy(s.x + rnd(-60, 60), s.y - 120, C.range) || e; const aa = Math.atan2(t2.y - t2.hh * 0.45 - (s.y - 40), t2.x - s.x); G.queue.push({ t: i * 0.06, fn: () => shot({ kind: 'knife', x: s.x, y: s.y - 40, vx: Math.cos(aa) * 820, vy: Math.sin(aa) * 820, dmg: dm, pierce: 1, life: 0.5, src: 'hero', r: 9, rot: 0 }) }); });
      c.cloneT = 0.7; sfx('shoot', 0.5);
    } else if (c.id === 'bari') {
      shot({ kind: 'ghost', x: c.x, y: c.y - 50, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, sp: 520, dmg: dm, pierce: 0, life: 2, src: 'hero', target: e, home: 8, r: 12 }); sfx('shoot', 0.4);
    } else if (c.id === 'jeonwoochi') {
      shot({ kind: 'swordwave', x: c.x, y: c.y - 40, vx: Math.cos(a) * 720, vy: Math.sin(a) * 720, dmg: dm, pierce: 99, life: 0.55, src: 'hero', r: 22, rot: a }); FX.spark(c.x + Math.cos(a) * 20, c.y - 40, '150,200,255', 6, 260); sfx('zap', 0.4);
    } else if (c.id === 'samyeong') {
      if (Math.hypot(e.x - c.x, e.y - c.y) > 70) { c.cd = 0.1; continue; }
      for (let i = 0; i < 3; i++) G.queue.push({ t: i * 0.1, fn: () => { if (e.dead) return; hurtEnemy(e, dm * 0.6, 'hero', { kb: 6, kx: c.x, ky: c.y }); FX.hit(e.x, e.y - 30, '255,210,130', i === 2); if (i === 2) { e.stunT = 0.8; FX.ring(e.x, e.y, 40, '255,220,140', 0.3, 5); } sfx('hit'); } });
    } else if (c.id === 'daejanggeum') {
      shot({ kind: 'foxfire', x: c.x, y: c.y - 50, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, sp: 520, dmg: dm, R: 40, pierce: 0, life: 2, src: 'hero', target: e, home: 7, r: 12, pal: 'blue' });
      for (const t of [G.player, ...G.comps]) if (t && t.hp != null && t.max && Math.hypot(t.x - c.x, t.y - c.y) < 260) { const h = t.max * 0.03; t.hp = Math.min(t.max, t.hp + h); }
      FX.ring(c.x, c.y, 60, '140,230,255', 0.4, 4); sfx('shoot', 0.4);
    } else if (c.id === 'sadaham') {
      if (Math.hypot(e.x - c.x, e.y - c.y) > 220) { c.cd = 0.1; continue; }
      const hits = [e]; for (let i = 0; i < 2; i++) { const o = nearestEnemy(hits[hits.length - 1].x, hits[hits.length - 1].y, 150, hits); if (o) hits.push(o); }
      hits.forEach((o, i) => G.queue.push({ t: i * 0.12, fn: () => { if (o.dead) return; c.x = o.x - 26; c.y = o.y + 8; c.fdir = 0; c.fire = 0.35; G.marks.push({ x: o.x, y: o.y - o.hh * 0.5, t: 0.22, life: 0.22, a: rnd(-0.8, 0.8) }); FX.spark(o.x, o.y - 30, '150,255,230', 8, 300); hurtEnemy(o, dm, 'hero', { kb: 12, kx: c.x, ky: c.y }); sfx('hit'); } }));
    } else if (c.id === 'kimchungseon') {
      const T0 = c.tg && !c.tg.dead && (EN[c.tg.type].range || EN[c.tg.type].caster || EN[c.tg.type].gun) ? c.tg : null;
      if (!T0) { c.cd = 0.2; continue; }
      const bx = T0.x - Math.cos(Math.atan2(T0.y - p.y, T0.x - p.x)) * -34, by = T0.y - 10;
      FX.smoke(c.x, c.y - 20, 5, '30,20,30', 16, 30); FX.p({ kind: 'glow', x: c.x, y: c.y - 30, life: 0.2, s: 40, s2: 6, c: '220,60,60' });
      c.x = clamp(bx, 50, W - 50); c.y = clamp(by, 120, H - 90); c.fdir = Math.atan2(T0.y - c.y, T0.x - c.x); c.fire = 0.35;
      FX.smoke(c.x, c.y - 20, 5, '30,20,30', 16, 30); G.marks.push({ x: T0.x, y: T0.y - T0.hh * 0.5, t: 0.3, life: 0.3, a: rnd(-0.9, 0.9) });
      FX.spark(T0.x, T0.y - 30, '255,90,90', 14, 380); hurtEnemy(T0, dm * (T0.boss ? 0.6 : 1.6), 'hero', { kb: 20, kx: c.x, ky: c.y }); sfx('hit');
    } else if (c.id === 'gumiho') {
      for (let i = 0; i < 3; i++) { const aa = -Math.PI / 2 + (i - 1) * 0.9; const T = pick(G.enemies.filter(o => Math.hypot(o.x - c.x, o.y - c.y) < C.range)) || e; shot({ kind: 'foxfire', x: c.x, y: c.y - 50, vx: Math.cos(aa) * 300, vy: Math.sin(aa) * 300, sp: 520, dmg: dm, R: 46, pierce: 0, life: 2, src: 'hero', target: T, home: 7, r: 12 }); }
      sfx('shoot', 0.5);
    }
  }
}

function updShots(dt) {
  for (const b of G.shots) {
    b.t += dt; b.life -= dt;
    if (b.kind === 'meteor' || b.kind === 'shell') {
      b.age += dt; const k = Math.min(1, b.age / b.T);
      if (b.kind === 'meteor') { b.x = b.tx - 200 * (1 - k); b.y = b.ty - 620 * (1 - k); FX.trail(b.x, b.y, '255,140,40', 26, 0.3); if (Math.random() < 0.6) FX.p({ kind: 'smoke', x: b.x, y: b.y, vx: rnd(-10, 10), vy: rnd(-10, 10), life: 0.7, s: 10, s2: 26, c: '60,40,60', rot: 0, vr: 1 }); }
      else { b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k; b.z = Math.sin(k * Math.PI) * 160; if (Math.random() < 0.5) FX.p({ kind: 'smoke', x: b.x, y: b.y - b.z, vx: 0, vy: -10, life: 0.5, s: 4, s2: 10, c: '180,170,160', rot: 0, vr: 0 }); }
      if (k >= 1) {
        b.life = 0;
        FX.explode(b.tx, b.ty, b.R, b.kind === 'meteor' ? null : null); sfx('boom');
        for (const e of G.enemies) if (Math.hypot(e.x - b.tx, e.y - b.ty) < b.R + e.r) { hurtEnemy(e, b.dmg, b.src, { kb: 14, kx: b.tx, ky: b.ty }); if (b.stun && !e.boss) e.stunT = Math.max(e.stunT, b.stun); if (b.frzAll && !e.boss) { e.frzT = 1.4; e.slowT = Math.max(e.slowT, 2); } }
        if (b.frzAll) FX.ring(b.tx, b.ty, b.R * 1.1, '180,240,255', 0.5, 8);
        if (b.src === 'skill') vib(20);
        if (b.zone) { const zk = b.zoneK || 1; G.zones.push({ x: b.tx, y: b.ty, r: b.R * 0.85 * zk, t: 2.8 * zk, life: 2.8 * zk, dps: b.zone, src: b.src, tick: 0 }); }
      }
      continue;
    }
    /* 따라가는 탄 */
    if (b.target) {
      if (b.target.dead) b.target = nearestEnemy(b.x, b.y, 300);
      if (b.target) { const tx = b.target.x, ty = b.target.y - b.target.hh * 0.5, a = Math.atan2(ty - b.y, tx - b.x), sp = Math.min(b.sp, Math.hypot(b.vx, b.vy) + 900 * dt); const cur = Math.atan2(b.vy, b.vx); let da = ((a - cur + Math.PI * 3) % TAU) - Math.PI; const na = cur + clamp(da, -b.home * dt, b.home * dt); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; }
    }
    if (b.kind === 'club') {
      if (b.t > b.ret && !b.back) b.back = true;
      if (b.back) { const o = b.owner, a = Math.atan2(o.y - 40 - b.y, o.x - b.x); b.vx += Math.cos(a) * 2400 * dt; b.vy += Math.sin(a) * 2400 * dt; const s = Math.hypot(b.vx, b.vy); if (s > 640) { b.vx *= 640 / s; b.vy *= 640 / s; } if (Math.hypot(o.x - b.x, o.y - 40 - b.y) < 24) b.life = 0; }
      b.rot += dt * 22;
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    /* 꼬리 */
    if (b.kind === 'ghost') { FX.trail(b.x, b.y, '170,90,255', 16, 0.3); if (Math.random() < 0.5) FX.p({ kind: 'glow', x: b.x, y: b.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: 0.3, s: 6, s2: 1, c: '230,190,255' }); }
    else if (b.kind === 'talisman') { b.rot += dt * 8; if (Math.random() < 0.7) FX.p({ kind: 'glow', x: b.x, y: b.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.35, s: 10, s2: 2, c: '255,150,40', hard: 1 }); }
    else if (b.kind === 'rocket') { FX.p({ kind: 'smoke', x: b.x, y: b.y, vx: rnd(-8, 8), vy: rnd(-8, 8), life: 0.6, s: 4, s2: 12, c: '200,190,180', rot: 0, vr: 0 }); FX.trail(b.x, b.y, '255,160,60', 9, 0.1); }
    else if (b.kind === 'feather') FX.trail(b.x, b.y, '255,110,40', 16, 0.3);
    else if (b.kind === 'foxfire') { FX.trail(b.x, b.y, '90,170,255', 18, 0.3); if (Math.random() < 0.5) FX.p({ kind: 'glow', x: b.x, y: b.y, vx: rnd(-20, 20), vy: -rnd(20, 60), life: 0.4, s: 7, s2: 1, c: '200,240,255' }); }
    else if (b.kind === 'knife') b.rot += dt * 30;
    if (b.fire && Math.random() < 0.6) FX.p({ kind: 'glow', x: b.x, y: b.y, life: 0.2, s: 8, s2: 2, c: '255,140,40', hard: 1 });
    else if (b.kind === 'ice') { if (Math.random() < 0.6) FX.p({ kind: 'glow', x: b.x, y: b.y, life: 0.25, s: 7, s2: 1, c: '200,245,255' }); }
    if (b.life <= 0) { if (b.R && !b.exploded) boomShot(b); continue; }
    if (b.nohit) continue;
    for (const e of G.enemies) {
      if (e.dead || b.life <= 0) continue;
      const hy = e.y - e.hh * 0.45;
      if (Math.abs(e.x - b.x) > e.r + b.r + 6 || Math.abs(hy - b.y) > e.hh * 0.55 + b.r) continue;
      if (b.rehit) { e.clubT = e.clubT || 0; if (e.clubT > G.t) continue; e.clubT = G.t + b.rehit; }
      else if (b.hit.indexOf(e) >= 0) continue;
      else b.hit.push(e);
      if (b.R) { boomShot(b); b.life = 0; break; }
      hurtEnemy(e, b.dmg, b.src, { kb: (b.kind === 'tracer' || b.kind === 'pellet' ? 8 : 3) + (b.kbx || 0), kx: b.x - b.vx, ky: b.y - b.vy });
      if (b.burn) { e.burnT = 2; e.burnD = b.dmg * 0.25; }
      if (b.bounce > 0) { const nx = nearestEnemy(e.x, e.y, 220, b.hit); if (nx) { b.bounce--; const a2 = Math.atan2(nx.y - nx.hh * 0.45 - b.y, nx.x - b.x), s2 = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a2) * s2; b.vy = Math.sin(a2) * s2; b.life = Math.max(b.life, 0.4); FX.spark(b.x, b.y, '150,230,255', 4, 200); continue; } }
      if (b.kind === 'wave') { const a2 = Math.atan2(b.vy, b.vx); e.x += Math.cos(a2) * 6; e.y += Math.sin(a2) * 6; }
      const hc = { wave: '150,220,255', swordwave: '180,220,255', arrow: '255,230,160', bolt: '150,230,255', tracer: '255,220,120', pellet: '255,180,90', ghost: '200,140,255', ice: '200,245,255', tarrow: '255,200,140', club: '255,210,120' }[b.kind] || '255,230,170';
      FX.hit(b.x, b.y, hc, b.kind === 'tracer'); sfx('hit');
      if (b.slow) { e.slowT = Math.max(e.slowT, b.slow); if (b.frz && Math.random() < b.frz) e.frzT = 1; }
      if (b.pierce > 0 && b.pierce < 99) b.pierce--; else if (b.pierce !== 99) b.life = 0;
    }
  }
  G.shots = G.shots.filter(b => b.life > 0);
}
function boomShot(b) {
  b.exploded = true;
  const x = b.x, y = b.y;
  FX.explode(x, y, b.R * 0.8, b.pal || (b.kind === 'foxfire' ? 'blue' : null)); if (b.kind !== 'rocket') sfx('boom', 0.7);
  for (const e of G.enemies) if (Math.hypot(e.x - x, e.y - e.hh * 0.4 - y) < b.R + e.r) hurtEnemy(e, b.dmg, b.src, { kb: 10, kx: x, ky: y });
  if (b.twice) G.queue.push({ t: 0.3, fn: () => { FX.explode(x, y, b.R * 0.9, null); sfx('boom', 0.6); for (const e of G.enemies) if (Math.hypot(e.x - x, e.y - e.hh * 0.4 - y) < b.R + e.r) hurtEnemy(e, b.dmg * 0.8, b.src); } });
}

function updZones(dt) {
  for (const z of G.zones) {
    z.t -= dt; z.tick -= dt;
    if (Math.random() < dt * 18) FX.p({ kind: 'glow', x: z.x + rnd(-z.r, z.r) * 0.8, y: z.y + rnd(-z.r, z.r) * 0.45, vx: 0, vy: -rnd(40, 90), life: rnd(0.4, 0.7), s: rnd(8, 14), s2: 3, c: Math.random() < 0.5 ? '255,120,30' : '255,200,80', hard: 1 });
    if (z.tick <= 0) { z.tick = 0.4; for (const e of G.enemies) { const dx = (e.x - z.x) / z.r, dy = (e.y - z.y) / (z.r * 0.62); if (dx * dx + dy * dy < 1) hurtEnemy(e, z.dps * 0.4, z.src, { col: '#ffb070' }); } }
  }
  G.zones = G.zones.filter(z => z.t > 0);
  for (const v of G.vortexes) {
    v.t -= dt; v.tick -= dt; v.x += v.vx * dt; v.y += v.vy * dt;
    for (let i = 0; i < 3; i++) { const a = G.t * 9 + i * 2.1, rr = v.r * rnd(0.3, 1); FX.p({ kind: 'glow', x: v.x + Math.cos(a) * rr, y: v.y + Math.sin(a) * rr * 0.5 - rnd(0, 60), vx: -Math.sin(a) * 120, vy: -rnd(60, 140), life: 0.4, s: rnd(8, 14), s2: 2, c: Math.random() < 0.5 ? '255,140,40' : '255,220,110', hard: 1 }); }
    for (const e of G.enemies) { const d = Math.hypot(e.x - v.x, e.y - v.y); if (d < v.r * 1.6 && d > 4 && !e.boss) { e.x += (v.x - e.x) / d * 80 * dt; e.y += (v.y - e.y) / d * 80 * dt; } }
    if (v.tick <= 0) { v.tick = 0.3; for (const e of G.enemies) if (Math.hypot(e.x - v.x, e.y - v.y) < v.r) hurtEnemy(e, v.dps * 0.3, 'skill', { acc: 1 }); }
  }
  G.vortexes = G.vortexes.filter(v => v.t > 0);
  if (G.pzs && G.pzs.length) { const pl = G.player; for (const z of G.pzs) { z.t -= dt; z.tick -= dt; if (z.tick <= 0 && Math.hypot(pl.x - z.x, (pl.y - z.y) / 0.62) < z.r) { z.tick = 0.5; hurtT(pl, 6 + G.ch * 0.6); } } G.pzs = G.pzs.filter(z => z.t > 0); }
  for (const t of G.tele) { t.t -= dt; if (t.boom && t.t <= 0) { FX.explode(t.x, t.y - 10, t.r); sfx('boom', 0.5); const pl = G.player; if (Math.hypot(pl.x - t.x, (pl.y - t.y) / 0.62) < t.r) hurtT(pl, t.boom); t.boom = 0; } } G.tele = G.tele.filter(t => t.t > 0);
  /* 살수대첩 물결 */
  for (const w of G.waves) {
    w.t -= dt; w.y -= 560 * dt;
    if (Math.random() < 0.9) FX.p({ kind: 'glow', x: rnd(w.x0, w.x1), y: w.y + rnd(-10, 10), vy: -rnd(40, 120), life: 0.4, s: rnd(6, 12), s2: 2, c: '200,240,255' });
    for (const e of G.enemies) if (!e.dead && w.hit.indexOf(e) < 0 && Math.abs(e.y - w.y) < 40) { w.hit.push(e); hurtEnemy(e, w.dmg, 'hero'); if (!e.boss) { e.y -= 60; e.stunT = 0.8; } FX.spark(e.x, e.y - 20, '180,230,255', 4, 200); }
  }
  G.waves = G.waves.filter(w => w.t > 0);
  /* 정화 결계: 안에 있는 처용과 사당 회복 */
  for (const z of G.zones) if (z.holy) { const P = G.player; if (Math.hypot(P.x - z.x, (P.y - z.y) / 0.62) < z.r) P.hp = Math.min(P.max, P.hp + P.max * 0.04 * dt); if (Math.hypot(G.shrine.x - z.x, (G.shrine.y - z.y) / 0.62) < z.r + 60) G.shrine.hp = Math.min(G.shrine.max, G.shrine.hp + G.shrine.max * 0.02 * dt); }
  /* 보급 보따리 */
  for (const k of G.pickups) {
    k.t += dt; const P = G.player;
    if (Math.hypot(k.x - P.x, k.y - P.y) < 46) {
      k.got = true; const PK = window.JZI ? window.JZI.PICKUPS[k.kind] : { n: k.kind, c: '255,255,255' };
      FX.ring(k.x, k.y, 80, PK.c, 0.4, 8); FX.spark(k.x, k.y - 20, PK.c, 16, 300); sfx('level', 0.6);
      G.banner = { s: PK.n + '!', t: 1.4, kind: 'win' };
      if (k.kind === 'magnet') for (const o of G.orbs) o.t = 9, o.mag = 1;
      else if (k.kind === 'bomb') { G.flash = { c: '255,230,160', t: 0.3 }; for (const e of G.enemies.filter(onScreen)) { FX.explode(e.x, e.y - 20, 40); hurtEnemy(e, 60 * atkMul(), 'player'); } sfx('boom'); }
      else if (k.kind === 'yakgwa') { P.hp = Math.min(P.max, P.hp + P.max * 0.3); FX.num(P.x, P.y - 80, Math.round(P.max * 0.3), false, '#7eff7e'); }
      else { G.gold += 30; FX.num(P.x, P.y - 80, '+30 엽전', false, '#ffd84a'); }
    }
  }
  G.pickups = G.pickups.filter(k => !k.got && k.t < 25);
  for (const mk of G.marks) mk.t -= dt; G.marks = G.marks.filter(m => m.t > 0);
}

function enemies(dt) {
  const p = G.player, sh = G.shrine, N = curN();
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = EN[e.type];
    e.hitT -= dt; e.squash = Math.max(0, e.squash - dt * 6); e.slowT -= dt; e.frzT -= dt; e.stunT -= dt;
    if (e.accT > 0) { e.accT -= dt; if (e.accT <= 0 && e.accD > 0.5) { FX.num(e.x, e.y - e.hh * 0.9, e.accD, false); e.accD = 0; } }
    if (e.burnT > 0) { e.burnT -= dt; hurtEnemy(e, e.burnD * dt, 'skill', { acc: 1, nocrit: 1, col: '#ff9a50' }); if (Math.random() < dt * 12) FX.ember(e.x, e.y - e.hh * 0.5, '255,130,40', 1, 80); if (e.dead) continue; }
    if (e.charmT > 0) {
      e.charmT -= dt; e.cd -= dt;
      const foe = nearestEnemy(e.x, e.y, 400, [e]); if (foe && !foe.charmT) { const ddx = foe.x - e.x, ddy = foe.y - e.y, dd2 = Math.hypot(ddx, ddy) || 1; e.flip = ddx < 0; if (dd2 > e.r + foe.r + 4) { e.x += ddx / dd2 * e.sp * dt; e.y += ddy / dd2 * e.sp * dt; } else if (e.cd <= 0) { e.cd = d.cd; hurtEnemy(foe, d.dmg * 3 * compMul(), 'hero'); FX.hit(foe.x, foe.y - 20, '255,140,200'); } }
      if (Math.random() < dt * 4) FX.p({ kind: 'glow', x: e.x + rnd(-8, 8), y: e.y - e.hh - 6, vy: -30, life: 0.6, s: 8, s2: 2, c: '255,120,190' });
      continue;
    }
    if (e.jumpT > 0) { e.jumpT -= dt; e.y += 170 * dt; if (e.jumpT <= 0) FX.smoke(e.x, e.y, 3, '170,150,120', 10, 20); continue; }
    if (e.frzT > 0 || e.stunT > 0) continue;
    e.cd -= dt; e.wob += dt * 7;
    /* 노릴 대상 */
    let tg = sh;
    if (d.fly) tg = dist(e, p) < 220 ? p : sh;
    else if (e.type === 'peasant' || e.type === 'zdog' || e.type === 'zrat') { if (dist(e, p) < 170) tg = p; }
    else if (d.range) { let bd = dist(e, sh) - sh.r; const dp = dist(e, p); if (dp < bd) { bd = dp; tg = p; } for (const t of G.turrets) { const dd = dist(e, t); if (dd < bd) { bd = dd; tg = t; } } }
    else if (e.type === 'spear' || d.tank || e.type === 'mujang' || d.siege) { let bd = 420; for (const t of G.turrets) { const dd = dist(e, t); if (dd < bd) { bd = dd; tg = t; } } }
    /* 우두머리·정예·거대 변이체는 사당을 노린다 */ if (e.boss || e.elite || e.mut === 'giant') tg = dist(e, p) < 90 ? p : sh;
    if (G.allies && !d.fly && !e.boss && !e.elite) { let bs = 70; for (const a of G.allies) if (a.style === 'soldier') { const da = Math.hypot(a.x - e.x, a.y - e.y); if (da < bs) { bs = da; tg = a; } } }
    if (G.obj && !d.fly && !e.boss) { const O = G.obj; if (O.beacon && O.beacon.hp > 0 && dist(e, O.beacon) < 90 && !d.range) tg = O.beacon; if (O.refs) for (const r of O.refs) if (r.hp > 0 && dist(e, r) < 120) { tg = r; break; } }
    const dx = tg.x - e.x, dy = tg.y - e.y, dd = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) > 3) e.flip = dx < 0;
    if (e.st === 'climb') { e.stT -= dt; e.y = e.climbY0 + (1 - Math.max(0, e.stT) / 1.1) * 90; e.d8 = 4; if (e.stT <= 0) { e.st = 'move'; e.pile = 0; FX.smoke(e.x, e.y, 3, '120,100,80', 12, 20); } continue; }
    if (e.atkT > 0) e.atkT -= dt;
    /* 동작 상태: 일어나기, 비명, 피격 중에는 멈춘다 */
    if (e.stT > 0) { e.stT -= dt; if (e.stT <= 0) e.st = 'move'; if (e.st === 'rise' || e.st === 'scream' || e.st === 'hit') { if (e.st === 'hit') { e.x += e.kbx * dt; e.y += e.kby * dt; } continue; } }
    /* 부산행: 처용을 보면 비명을 지르고 달려든다 */
    if (!e.screamed && !e.boss && !d.fly && Math.hypot(p.x - e.x, p.y - e.y) < 230) { e.screamed = true; if (Math.random() < 0.45 && SPR[EK(e.type)] && SPR[EK(e.type)].A && SPR[EK(e.type)].A.scream) { e.st = 'scream'; e.stT = 0.7; e.d8 = dir8(Math.atan2(p.y - e.y, p.x - e.x)); if (Math.random() < 0.5) e.frenzy = 1; continue; } }
    /* 킹덤: 가끔 몸이 꺾이는 발작 */
    e.twT -= dt; if (e.twT <= 0) { e.twT = rnd(1.5, 5); e.twA = 0.18; e.twR = rnd(-0.35, 0.35); }
    if (e.twA > 0) e.twA -= dt;
    let sp = e.sp * (e.slowT > 0 ? (e.boss ? 0.7 : 0.5) : 1) * (e.frenzy ? 1.6 : 1);
    e.d8 = dir8(Math.atan2(dy, dx)); if (e.var === 'backward') e.d8 = (e.d8 + 4) % 8;
    /* 양반 기운: 주변을 빠르게 */
    if (e.hasteT > 0) { e.hasteT -= dt; sp *= 1.3; }
    if (d.aura && Math.random() < dt * 2) for (const o of G.enemies) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 110) o.hasteT = 1;
    const dmg = d.dmg * (0.8 + N.hp * 0.2) * (e.elite ? 1.8 : 1) * (e.boss ? 1.6 : 1) * (e.dmgK || 1) * Math.sqrt(G.tierK || 1) * (G.nm ? G.nm.dmg : 1);

    /* 우두머리 2단계: 체력 절반에서 분노 — 빨라지고 세지며, 충격파와 졸개를 부른다 (패턴 변화) */
    if (e.boss && !e.p2 && e.hp < e.max * (G.nm ? 0.85 : 0.5)) {
      e.p2 = true; e.sp *= 1.3; e.dmgK = (e.dmgK || 1) * 1.25; e.t1 = Math.min(e.t1 || 0, 1); e.t2 = Math.min(e.t2 || 0, 1.5);
      G.banner = { s: EN[e.type].n + ' 분노!', t: 2.2, kind: 'boss' }; G.crisisT = 2.5; sfx('warn'); vib([80, 50, 80, 50, 200]); FX.shake = 0.6;
      FX.ring(e.x, e.y, 260, '255,70,40', 0.6, 14); FX.explode(e.x, e.y - 40, 110);
      const pl = G.player; if (Math.hypot(pl.x - e.x, pl.y - e.y) < 220) hurtT(pl, pl.max * 0.08);
      for (const a of (G.allies || [])) if (Math.hypot(a.x - e.x, a.y - e.y) < 220) { const an = Math.atan2(a.y - e.y, a.x - e.x); a.x += Math.cos(an) * 60; a.y += Math.sin(an) * 60; }
      const C2 = D.CHAPTERS[G.ch - 1]; for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; spawnEnemy(C2.pool[i % C2.pool.length], e.x + Math.cos(an) * 110, e.y + Math.sin(an) * 70, { small: true }); }
    }
    if (e.boss && e.p2 && Math.random() < dt * 0.35) { /* 분노 중: 땅 갈라짐 예고 후 폭발 */ const tx2 = G.player.x + rnd(-80, 80), ty2 = G.player.y + rnd(-60, 60); G.tele.push({ x: tx2, y: ty2, r: 80, t: 0.9, life: 0.9, c: '255,60,40', boom: dmg * 1.2 }); }
    /* 돌진: 붉은 선으로 미리 알린 뒤 달려든다 */
    if (d.charger && (e.elite || e.boss || e.type === 'zboar' || d.vtier)) {
      e.t1 -= dt;
      if (e.t1 <= 0 && e.tele <= 0 && e.chg <= 0 && dd < 420) { e.tele = 0.7; e.ca = Math.atan2(dy, dx); }
      if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.chg = 0.6; e.t1 = rnd(4, 6); } continue; }
      if (e.chg > 0) { e.chg -= dt; e.x += Math.cos(e.ca) * e.sp * 4.2 * dt; e.y += Math.sin(e.ca) * e.sp * 4.2 * dt;
        if (!e.passed && e.y > WALL_Y - 36 && e.y < WALL_Y + 10) { const w = wallAt(e.x); if (w) { e.y = WALL_Y - 36; e.chg = 0; w.hp -= dmg * 3 * (d.siege || 1); w.hitT = 0.15; FX.explode(e.x, WALL_Y - 26, 50); FX.shake = 0.25; if (w.hp <= 0) wallBreak(w); continue; } } if (Math.random() < 0.6) FX.smoke(e.x, e.y, 1, '160,140,110', 12, 20); for (const tt of [p, ...G.turrets]) if (Math.hypot(tt.x - e.x, tt.y - e.y) < e.r + 22 && !(e.chgHit && e.chgHit.has(tt))) { (e.chgHit = e.chgHit || new Set()).add(tt); hurtT(tt, dmg * 1.5); FX.hit(tt.x, tt.y - 30, '255,120,90', true); FX.shake = 0.2; } if (e.chg <= 0) e.chgHit = null; e.y = clamp(e.y, -200, H - 60); e.x = clamp(e.x, 40, W - 40); continue; }
    }
    /* 내려찍기 */
    if (d.slam && (e.elite || e.boss || d.vtier)) {
      e.t2 -= dt;
      if (e.slamT > 0) { e.slamT -= dt; if (e.slamT <= 0) { const R = e.boss ? 170 : 120; FX.ring(e.x, e.y, R, '255,120,80', 0.4, 12); FX.debris(e.x, e.y, 14, '#5a4a3a', 360); FX.smoke(e.x, e.y, 8, '120,100,80', 22, 40); FX.shake = 0.3; sfx('boom'); for (const tt of [p, sh, ...G.turrets]) if (Math.hypot(tt.x - e.x, (tt.y - e.y) / 0.62) < R + (tt.r || 0)) hurtT(tt, dmg * 1.8); } continue; }
      if (e.t2 <= 0 && dd < 200) { e.t2 = rnd(4.5, 6.5); e.slamT = 0.85; G.tele.push({ x: e.x, y: e.y, r: e.boss ? 170 : 120, t: 0.85, life: 0.85, c: '255,60,40' }); continue; }
    }
    /* 좀비 승려: 주변 좀비 치유 */
    if (d.healer) { e.t2 -= dt; if (e.t2 <= 0) { e.t2 = 3; let n = 0; for (const o of G.enemies) if (o !== e && !o.dead && o.hp < o.max && Math.hypot(o.x - e.x, o.y - e.y) < 150) { o.hp = Math.min(o.max, o.hp + o.max * 0.15); n++; FX.p({ kind: 'glow', x: o.x, y: o.y - o.hh * 0.6, vy: -40, life: 0.6, s: 16, s2: 4, c: '160,255,140' }); } if (n) { FX.ring(e.x, e.y, 150, '160,255,140', 0.5, 5); e.atkT = 0.5; } } }
    /* 새 행동 (r4) */
    if (d.bomber) { if (e.fuse == null && dd < 64 + e.r) { e.fuse = 0.8; vib(15); } if (e.fuse != null) { e.fuse -= dt; e.hitT = Math.sin(G.t * 40) > 0 ? 0.06 : 0; if (e.fuse <= 0) { bombBlast(e, dmg, false); e.hp = 0; killEnemy(e); } continue; } }
    if (d.nest) { e.nT = (e.nT == null ? 4 : e.nT) - dt; if (e.nT <= 0) { e.nT = 6.5; e.atkT = 0.5; for (let i = 0; i < 2; i++) spawnEnemy('peasant', e.x + rnd(-40, 40), e.y + rnd(-20, 20), { small: true }); FX.smoke(e.x, e.y - 30, 4, '150,220,90', 14, 30); } }
    if (d.chain && e.boss) { e.chT = (e.chT == null ? 5 : e.chT) - dt; if (e.chT <= 0 && dist(e, p) < 420) { e.chT = 7; e.atkT = 0.5; G.beams.push({ x1: e.x, y1: e.y - e.hh * 0.6, x2: p.x, y2: p.y - 40, c: '170,120,255', w: 6, t: 0.4, life: 0.4 }); const a = Math.atan2(e.y - p.y, e.x - p.x); p.x = clamp(p.x + Math.cos(a) * 90, 40, W - 40); p.y += Math.sin(a) * 90; hurtT(p, dmg * 0.8); G.banner = { s: '염라의 사슬!', t: 1.1, kind: 'boss' }; vib([40, 30, 40]); } }
    if (d.breath && e.boss) { e.brT = (e.brT == null ? 5 : e.brT) - dt; if (e.brT <= 0 && dist(e, p) < 380) { e.brT = 6.5; e.atkT = 0.6; for (let i = 0; i < 4; i++) { const k = (i + 1) / 4, bx = e.x + (p.x - e.x) * k, by = e.y + (p.y - e.y) * k; G.tele.push({ x: bx, y: by, r: 54, t: 0.7, life: 0.7, c: '120,230,60' }); G.queue.push({ t: 0.7, fn: () => { if (G.pzs) G.pzs.push({ x: bx, y: by, r: 60, t: 4, life: 4, tick: 0 }); FX.smoke(bx, by, 4, '110,200,60', 16, 40); } }); } G.banner = { s: '독룡의 독숨!', t: 1.1, kind: 'boss' }; } }
    if (d.hop && e.boss) { e.hopCd = (e.hopCd == null ? 5 : e.hopCd) - dt;
      if (e.hopT > 0) { e.hopT -= dt; e.jumpT = Math.min(0.6, Math.max(0, e.hopT) * 0.66); const k = 1 - Math.max(0, e.hopT) / 0.9; e.x = e.hx0 + (e.hx1 - e.hx0) * k; e.y = e.hy0 + (e.hy1 - e.hy0) * k;
        if (e.hopT <= 0) { e.jumpT = 0; FX.ring(e.x, e.y, 150, '200,180,120', 0.4, 12); FX.debris(e.x, e.y, 16, '#6a5a4a', 380); FX.shake = 0.35; sfx('boom'); vib(50); for (const tt of [p, sh, ...G.turrets]) if (Math.hypot(tt.x - e.x, (tt.y - e.y) / 0.62) < 130) hurtT(tt, dmg); } continue; }
      if (e.hopCd <= 0 && dist(e, p) < 460) { e.hopCd = 7; e.hopT = 0.9; e.hx0 = e.x; e.hy0 = e.y; e.hx1 = p.x; e.hy1 = p.y; G.tele.push({ x: p.x, y: p.y, r: 150, t: 0.9, life: 0.9, c: '255,80,40' }); G.banner = { s: '두꺼비 거인이 뛰어오른다!', t: 1, kind: 'boss' }; } }
    /* 소환: 왕비, 무녀 */
    if (d.summoner && (e.boss || e.elite)) { e.t1s = (e.t1s == null ? 4 : e.t1s) - dt; if (e.t1s <= 0) { e.t1s = 8; e.atkT = 0.5; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; spawnEnemy(pick(['peasant', 'peasant', 'zsword', 'yangban']), e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 50, { rise: true }); } FX.ring(e.x, e.y, 110, '170,90,230', 0.5, 10); } }
    /* 무녀: 방어막 (받는 피해 감소) */
    if (d.warder && e.boss) { e.wardT = (e.wardT == null ? 6 : e.wardT) - dt; if (e.wardT <= 0) { e.wardT = 10; e.ward = 3; G.banner = { s: '검은 무녀의 결계!', t: 1.4, kind: 'boss' }; } if (e.ward > 0) e.ward -= dt; }
    /* 역신: 순간이동하며 연속 베기 */
    if (d.blink && e.boss) { e.bT = (e.bT == null ? 5 : e.bT) - dt; if (e.bT <= 0) { e.bT = 6; FX.explode(e.x, e.y - 40, 60, 'purple'); const a = rnd(0, TAU); e.x = clamp(p.x + Math.cos(a) * 90, 60, W - 60); e.y = clamp(p.y + Math.sin(a) * 60, 140, H - 100); FX.explode(e.x, e.y - 40, 70, 'purple'); e.atkT = 0.5; e.cd = 0.25; sfx('zap'); } }
    /* 불가사리: 쇠(시설)를 먹는다 */
    if (d.eater && e.boss) { e.eatT = (e.eatT == null ? 5 : e.eatT) - dt; if (e.eatT <= 0) { e.eatT = 7; let bt = null, bd = 420; for (const t of G.turrets) { const dd = dist(e, t); if (dd < bd) { bd = dd; bt = t; } } if (bt) { e.x += (bt.x - e.x) * 0.6; e.y += (bt.y - e.y) * 0.6; bt.hp -= bt.max * 0.35; bt.seal = 3; bt.hitT = 0.3; e.hp = Math.min(e.max, e.hp + e.max * 0.04); FX.explode(bt.x, bt.y - 30, 70); FX.debris(bt.x, bt.y - 20, 14, '#8a8a8a', 320); FX.shake = 0.35; G.banner = { s: '불가사리가 쇠를 먹는다!', t: 1.4, kind: 'boss' }; sfx('boom'); if (navigator.vibrate) try { navigator.vibrate(60); } catch (e2) {} } } }
    /* 장산범: 사라졌다 처용 뒤에 나타나고, 울음소리로 병사를 홀린다 */
    if (d.mimic && e.boss) { e.mmT = (e.mmT == null ? 6 : e.mmT) - dt; if (e.hideT > 0) e.hideT -= dt;
      if (e.mmT <= 0) { e.mmT = 8; FX.smoke(e.x, e.y - 30, 10, '230,230,240', 22, 50); e.hideT = 0.7; G.queue.push({ t: 0.7, fn: () => { if (e.dead) return; e.x = clamp(p.x + rnd(-40, 40), 60, W - 60); e.y = p.y + 90; FX.smoke(e.x, e.y - 30, 10, '230,230,240', 22, 50); G.tele.push({ x: e.x, y: e.y, r: 110, t: 0.6, life: 0.6, c: '200,220,255' }); G.queue.push({ t: 0.6, fn: () => { if (e.dead) return; if (Math.hypot(p.x - e.x, p.y - e.y) < 120) hurtT(p, dmg * 1.4); FX.ring(e.x, e.y, 110, '220,230,255', 0.3, 8); } }); } });
        for (const a of (G.allies || [])) if (a.style === 'soldier' && Math.hypot(a.x - e.x, a.y - e.y) < 420) a.confT = 2.2; G.banner = { s: '장산범의 울음소리… 병사들이 홀렸다!', t: 1.6, kind: 'boss' }; } }
  /* 우두머리 특수 */
    if (e.boss && e.type === 'king') {
      e.t1 -= dt; e.t2 -= dt;
      if (e.t1 <= 0) { e.t1 = 7; const kinds = ['peasant', 'spear', 'archer', 'peasant', 'yangban', 'peasant']; kinds.forEach((k, i) => { const a = i / kinds.length * TAU; spawnEnemy(k, e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60); }); FX.ring(e.x, e.y, 100, '170,90,230', 0.5, 10); FX.explode(e.x, e.y - 30, 60, 'purple'); }
      if (e.t2 <= 0) { e.t2 = 11; let any = false; for (const t of G.turrets) if (dist(t, e) < 300) { t.seal = 4; any = true; } for (const g of G.guards) if (dist(g, e) < 300) { g.seal = 4; any = true; } FX.ring(e.x, e.y, 300, '170,90,230', 0.6, 14); if (any) G.banner = { s: '어명이오! 장승과 신수가 묶였다', t: 2, kind: 'boss' }; }
    }
    if (d.caster && e.boss) {
      e.t2 -= dt;
      if (e.t2 <= 0) { e.t2 = 3.2; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + G.t; G.eshots.push({ kind: 'curse', x: e.x, y: e.y - 40, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: dmg * 0.6, life: 2.4, slow: 1 }); } FX.ring(e.x, e.y - 30, 80, '180,90,255', 0.4, 8); }
    }
    /* 성벽: 땅으로 오는 적은 성벽부터 친다. 들개는 뛰어넘는다 */
    if (!d.fly && !e.passed && tg.y > WALL_Y - 20 && e.y > WALL_Y - 36 && !(d.range && dd < d.range)) {
      const w = wallAt(e.x);
      if (w) {
        if (d.jump && !e.jumped) { e.jumped = true; e.jumpT = 0.6; continue; }
        e.y = WALL_Y - 36;
        let crowd = 0; for (const o of G.enemies) if (o !== e && !o.passed && Math.abs(o.x - e.x) < 46 && Math.abs(o.y - e.y) < 40) crowd++;
        e.pile = Math.min(3, crowd * 0.5);
        if (crowd >= 5 && !e.boss && Math.random() < dt * 0.5) { e.st = 'climb'; e.stT = 1.1; e.climbY0 = e.y; e.passed = true; continue; }
        if (e.cd <= 0) { e.cd = d.cd; e.atkT = 0.5; w.hp -= dmg * (d.siege || 1); w.hitT = 0.1; e.lunge = 0.15; FX.hit(e.x, WALL_Y - 30, '255,210,160'); if (Math.random() < 0.3) FX.debris(e.x, WALL_Y - 20, 2, '#7a6a52', 140); if (w.hp <= 0) wallBreak(w); if (G.bubbleCd <= 0) { G.bubble = { s: '성벽이 버티지 못해!', t: 2.2 }; G.bubbleCd = 12; } }
        continue;
      }
    }
    if (e.type === 'harcher') {
      const rad = dd > 250 ? 1 : (dd < 190 ? -1 : 0);
      let vx = dx / dd * rad + (-dy / dd) * e.turn * 0.8, vy = dy / dd * rad + (dx / dd) * e.turn * 0.8;
      const vl = Math.hypot(vx, vy) || 1;
      e.x += vx / vl * sp * dt; e.y += vy / vl * sp * dt;
      if (e.x < 60 || e.x > W - 60 || e.y < camTop() - 60 || e.y > WALL_Y - 40) e.turn = -e.turn;
      e.x = clamp(e.x, 40, W - 40); e.y = clamp(e.y, -120, WALL_Y - 30);
      if (dd < d.range && e.cd <= 0) { e.cd = d.cd; G.eshots.push({ kind: 'earrow', x: e.x, y: e.y - 40, vx: dx / dd * 250, vy: dy / dd * 250, dmg, life: 1.6 }); }
      continue;
    }
    const reach = d.range ? d.range : e.r + (tg.r || 16) + (d.reach || 4);
    if (dd > reach) {
      let mx = dx, my = dy;
      /* 성벽 앞에서는 무너진 곳이 가까우면 그쪽으로 틀어 간다 */
      if (!d.fly && !e.passed && tg.y > WALL_Y && e.y > WALL_Y - 160 && e.y < WALL_Y - 20) { const gap = G.walls.filter(w => w.hp <= 0).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0]; if (gap && Math.abs(gap.x - e.x) < 140) { mx = gap.x - e.x; my = 40; } }
      const ml = Math.hypot(mx, my) || 1;
      e.x += mx / ml * sp * dt; e.y += my / ml * sp * dt;
      if (d.fly) e.y += Math.sin(e.wob) * 0.6;
    } else if (e.cd <= 0) {
      e.cd = d.cd * (e.boss ? 0.8 : 1);
      if (d.range && d.gun) { e.atkT = 0.5; G.eshots.push({ kind: 'ebullet', x: e.x, y: e.y - 40, vx: dx / dd * 430, vy: dy / dd * 430, dmg, life: 1.15 }); FX.p({ kind: 'glow', x: e.x + dx / dd * 20, y: e.y - 40 + dy / dd * 20, life: 0.08, s: 26, s2: 8, c: '255,220,140', hard: 1 }); FX.smoke(e.x + dx / dd * 22, e.y - 42, 2, '200,200,200', 8, 20); sfx('gun', 0.5); }
      else if (d.range) { if (d.plague) { const px = tg.x, py = tg.y; G.queue.push({ t: Math.min(1.1, dd / 220), fn: () => { if (G.pzs) G.pzs.push({ x: px, y: py, r: 56, t: 4, life: 4, tick: 0 }); FX.smoke(px, py, 4, '110,200,60', 14, 30); } }); }
        e.atkT = 0.5; G.eshots.push({ kind: d.caster ? 'curse' : 'earrow', x: e.x, y: e.y - 40, vx: dx / dd * (d.caster ? 210 : 250), vy: dy / dd * (d.caster ? 210 : 250), dmg, life: 1.8, slow: d.caster ? 1 : 0 }); if (d.caster) FX.p({ kind: 'glow', x: e.x, y: e.y - 44, life: 0.2, s: 26, s2: 8, c: '180,90,255' }); }
      else { hurtT(tg, dmg * (d.siege && tg !== G.player && tg !== G.shrine ? d.siege : 1)); e.lunge = 0.15; e.atkT = 0.5; FX.hit((e.x + tg.x) / 2, (e.y + tg.y) / 2 - 24, '255,120,100'); }
    }
    if (e.lunge > 0) e.lunge -= dt;
  }
  /* 서로 밀어내기 */
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) { const a = es[i]; if (EN[a.type].fly) continue; for (let j = i + 1; j < es.length; j++) { const b = es[j]; if (EN[b.type].fly) continue; const dx = b.x - a.x, dy = b.y - a.y, m = (a.r + b.r) * 0.9; if (Math.abs(dx) < m && Math.abs(dy) < m) { const d2 = Math.hypot(dx, dy) || 0.01; if (d2 < m) { const k = (m - d2) / d2 * 0.5, ka = a.boss ? 0 : (b.boss ? 1 : 0.5), kb = b.boss ? 0 : (a.boss ? 1 : 0.5); a.x -= dx * k * ka; a.y -= dy * k * ka; b.x += dx * k * kb; b.y += dy * k * kb; } } } }
  /* 성벽: 성문 밖은 막는다 */
  for (const e of es) { if (EN[e.type].fly || e.passed || e.jumpT > 0) continue; if (e.y > WALL_Y + 12) { e.passed = true; continue; } if (e.y > WALL_Y - 36 && wallAt(e.x)) e.y = WALL_Y - 36; }
  G.enemies = es.filter(e => !e.dead);
  /* 적의 탄 */
  for (const a of G.eshots) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
    if (a.kind === 'curse') FX.trail(a.x, a.y, '170,80,255', 14, 0.25);
    let tg = null;
    if (Math.hypot(a.x - p.x, a.y - (p.y - 40)) < p.r + 18) tg = p;
    else if (Math.hypot(a.x - sh.x, a.y - (sh.y - 40)) < sh.r + 10) tg = sh;
    else for (const t of G.turrets) if (Math.hypot(a.x - t.x, a.y - (t.y - 30)) < t.r + 10) { tg = t; break; }
    if (tg) { hurtT(tg, a.dmg); a.life = 0; FX.hit(a.x, a.y, a.kind === 'curse' ? '190,110,255' : '255,140,110'); if (a.slow && tg === p) p.slowT = 1.5; }
  }
  G.eshots = G.eshots.filter(a => a.life > 0);
  const before = G.turrets.length;
  G.turrets = G.turrets.filter(t => { if (t.hp > 0) return true; FX.explode(t.x, t.y - 30, 70); FX.debris(t.x, t.y, 16, '#6a5a48', 380); sfx('boom'); return false; });
  if (G.turrets.length < before) G.banner = { s: '시설이 무너졌다', t: 1.6, kind: 'elite' };
}

/* 아군은 성문으로 드나든다: 성문은 아군에게 열리고 적에게는 닫힌다 */
function allyBlock(x) { if (!G.wallLv) return null; for (const w of G.walls) if (w.hp > 0 && !w.gate && Math.abs(x - w.x) < 44) return w; return null; }
function allyCross(o, ty) { /* 성벽 건너편으로 가야 하면 먼저 성문(또는 무너진 곳) 쪽으로 옆걸음 */ if (!G.wallLv) return null; if ((o.y > WALL_Y + 8 && ty < WALL_Y - 8) || (o.y < WALL_Y - 8 && ty > WALL_Y + 8)) { const gx = gapX(o.x), side = o.y < WALL_Y ? -1 : 1; for (const w of G.walls) if (w.gate && Math.abs(w.x - o.x) < 90) w.openT = 1; if (Math.abs(gx - o.x) > 30 && Math.abs(o.y - WALL_Y) > 20) return { x: gx, y: WALL_Y + side * 34 }; return { x: gx + clamp(o.x - gx, -16, 16), y: WALL_Y - side * 46 }; } return null; }
function wallAt(x) { if (!G.wallLv) return null; for (const w of G.walls) if (w.hp > 0 && Math.abs(x - w.x) < (w.gate ? 68 : 44)) return w; return null; }
function buildWalls(free) {
  const cost = 80 + G.wallLv * 70; if (G.wallLv >= 5) return false; if (!free) { if (G.gold < cost) return false; G.gold -= cost; }
  G.wallLv++; const k = 1 + 0.45 * (G.wallLv - 1);
  for (const w of G.walls) { const base = (w.gate ? 420 : 280) * (1 + 0.35 * (G.ch - 1)); w.max = base * k; w.hp = w.max; w.built = true; FX.smoke(w.x, WALL_Y, 3, '200,190,170', 16, 30); FX.debris(w.x, WALL_Y, 4, '#8a7a60', 160); }
  FX.ring(360, WALL_Y, 320, '255,230,160', 0.6, 8); sfx('build'); G.banner = { s: G.wallLv + '레벨 성벽 완성!', t: 1.5, kind: 'win' }; G.padKey = ''; return true;
}
function wallBreak(w) {
  w.hp = 0; FX.explode(w.x, WALL_Y - 20, 80); FX.debris(w.x, WALL_Y - 10, 22, '#7a6a52', 420); FX.smoke(w.x, WALL_Y - 20, 10, '150,130,110', 26, 50); sfx('boom');
  G.banner = { s: w.gate ? '성문이 부서졌다!' : '성벽이 무너졌다!', t: 1.8, kind: 'elite' };
}
function collectAll(dt) {
  const p = G.player, mag = 110 * (1 + 0.6 * skLv('magnet')) + (G.phase === 'dawn' ? 2000 : 0);
  for (const o of G.orbs) {
    o.t += dt;
    if (o.z > 0 || o.vz > 0) { o.vz -= 700 * dt; o.z = Math.max(0, o.z + o.vz * dt); o.x += o.vx * dt; o.y += o.vy * dt * 0.4; if (o.z === 0) { o.vz = 0; o.vx *= 0.3; } }
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if ((d < mag || o.mag) && o.t > 0.3) { const k = Math.min(1, (900 + o.t * 300) * dt / (d || 1)); o.x += (p.x - o.x) * k; o.y += (p.y - 30 - o.y) * k; }
    if (d < 30) { o.got = true; gainXp(o.v); sfx('gem'); FX.p({ kind: 'glow', x: p.x, y: p.y - 40, life: 0.15, s: 20, s2: 6, c: '120,255,210' }); }
  }
  G.orbs = G.orbs.filter(o => !o.got);
  for (const c of G.coins) {
    c.t += dt;
    if (c.z > 0 || c.vz > 0) { c.vz -= 800 * dt; c.z = Math.max(0, c.z + c.vz * dt); c.x += c.vx * dt; c.y += c.vy * dt * 0.5; if (c.z === 0 && c.vz < 0) { c.vz = -c.vz * 0.35; if (c.vz < 40) c.vz = 0; c.vx *= 0.5; c.vy *= 0.5; } }
    if (c.t > 0.7) { const d = Math.hypot(c.x - p.x, c.y - p.y), k = Math.min(1, (700 + c.t * 500) * dt / (d || 1)); c.x += (p.x - c.x) * k; c.y += (p.y - 30 - c.y) * k; if (d < 28) { c.got = true; G.gold += c.v; sfx('coin'); } }
  }
  G.coins = G.coins.filter(c => !c.got);
}

function endGame(win) {
  if (G.phase === 'win' || G.phase === 'lose') return;
  G.phase = win ? 'win' : 'lose'; G.endT = 2.2; joy.on = false;
  sting(win ? 'sting_victory' : 'sting_defeat'); setBgm('');
  ovLevel.classList.remove('on'); bPanel.classList.remove('on'); $('btnBattle').classList.remove('on');
  G.title = { s: win ? '승리!' : (G.loseWhy || (G.shrine.hp <= 0 ? '사당이 무너졌다' : '처용이 쓰러졌다')), sub: win ? (G.obj ? G.obj.n + (objOk() ? ' 성공!' : ' 실패 · 그래도 수호 성공') : G.C.name + ' 수호 성공') : curN().name + '을 넘기지 못했다', t: 2.4, big: 1 };
  if (win) for (let i = 0; i < 6; i++) G.queue.push({ t: i * 0.2, fn: () => FX.explode(G.player.x + rnd(-200, 200), G.player.y - rnd(100, 400), 50, pick(['purple', 'blue', null, 'green'])) });
}
function finish() {
  G.ended = true;
  const res = { win: G.phase === 'win', chapter: G.ch, wave: Math.min(G.night + 1, G.nights.length), waves: G.nights.length,
    dmg: { skill: Math.round(G.dmg.skill), hero: Math.round(G.dmg.hero), building: Math.round(G.dmg.building), player: Math.round(G.dmg.player) },
    mode: G.mode, stars: G.missions ? G.missions.filter(m => m.ok()).length : null, bossDmg: Math.round(G.bossDmg), kills: G.kills, gold: G.gold, time: Math.round((performance.now() - G.startT) / 1000),
    objective: G.obj ? { type: G.obj.type, name: G.obj.n, ok: objOk(), text: objText() } : null, tierK: Math.round((G.tierK || 1) * 100) / 100, nightmare: !!G.nm, pairs: Object.keys(G.pairs || {}) };
  if (typeof JZB.onEnd === 'function' && JZB.onEnd !== defaultEnd) JZB.onEnd(res); else defaultEnd(res);
}
function defaultEnd(res) {
  $('endTitle').textContent = res.win ? '승리!' : '패배';
  const tot = res.dmg.skill + res.dmg.hero + res.dmg.building + res.dmg.player || 1;
  const row = (n, v, c) => '<div class="dr"><span>' + n + '</span><b style="width:' + Math.round(v / tot * 100) + '%;background:' + c + '"></b><em>' + Math.round(v / tot * 100) + '%</em></div>';
  $('endStat').innerHTML = G.C.name + ' · ' + res.wave + '/' + res.waves + '번째 밤<br>물리친 적 ' + res.kills + '<div class="dmg">' + row('신력', res.dmg.skill, '#b066ff') + row('동료', res.dmg.hero, '#ffb03a') + row('건물', res.dmg.building, '#5ac8ff') + row('처용', res.dmg.player, '#ff5a5a') + '</div>';
  $('ovEnd').classList.add('on');
}

/* ---------- 그리기 ---------- */
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
function rrPath(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function shadowE(x, y, rx, a) { ctx.fillStyle = 'rgba(10,8,6,' + (a || 0.32) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.38, 0, 0, TAU); ctx.fill(); }
function hpBar(x, y, w, h, v, col, back) {
  rrPath(x - 2, y - 2, w + 4, h + 4, (h + 4) / 2); ctx.fillStyle = 'rgba(10,8,12,.8)'; ctx.fill();
  if (v > 0) { rrPath(x, y, Math.max(h, w * clamp(v, 0, 1)), h, h / 2); ctx.fillStyle = col; ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x + 2, y + 1, Math.max(0, w * clamp(v, 0, 1) - 4), h * 0.35); }
}
function drawBeam(b) {
  const k = b.t / b.life, w = b.w * (b.cont ? (0.85 + 0.15 * Math.sin(G.t * 40)) : (0.4 + 0.6 * k));
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(' + b.c + ',' + 0.28 * (b.cont ? 1 : k) + ')'; ctx.lineWidth = w * 3.2; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
  ctx.strokeStyle = 'rgba(' + b.c + ',' + 0.9 * (b.cont ? 1 : k) + ')'; ctx.lineWidth = w; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,' + (b.cont ? 0.95 : k) + ')'; ctx.lineWidth = w * 0.35; ctx.stroke();
  FX.glow(ctx, b.x1, b.y1, w * 2.6, b.c, 0.9, 1); FX.glow(ctx, b.x2, b.y2, w * 3.4, b.c, 0.9, 1);
  ctx.globalCompositeOperation = 'source-over';
}
function drawShot(b) {
  const a = Math.atan2(b.vy, b.vx);
  ctx.save();
  if (b.kind === 'arrow' || b.kind === 'tarrow') {
    const L = b.kind === 'arrow' ? 34 : 24, col = b.kind === 'arrow' ? '255,215,110' : '255,170,90';
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(b.x, b.y, b.x - Math.cos(a) * L * 2.4, b.y - Math.sin(a) * L * 2.4);
    gr.addColorStop(0, 'rgba(' + col + ',.85)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.strokeStyle = gr; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(a) * L * 2.4, b.y - Math.sin(a) * L * 2.4); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(a);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-L, -1.6, L, 3.2);
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = b.kind === 'arrow' ? '#ff5a3a' : '#e0e0e0'; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 7, -5); ctx.lineTo(-L + 4, 0); ctx.lineTo(-L - 7, 5); ctx.closePath(); ctx.fill();
  } else if (b.kind === 'bolt') {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(120,220,255,.6)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035); ctx.stroke();
    ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 3; ctx.stroke();
  } else if (b.kind === 'tracer') {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,180,60,.55)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05); ctx.stroke();
    ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.stroke();
    FX.glow(ctx, b.x, b.y, 16, '255,200,90', 1, 1);
  } else if (b.kind === 'pellet') {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,150,50,.7)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); ctx.stroke();
    FX.glow(ctx, b.x, b.y, 10, '255,190,90', 1, 1);
  } else if (b.kind === 'ghost') {
    ctx.globalCompositeOperation = 'lighter';
    FX.glow(ctx, b.x, b.y, 30, '160,80,255', 0.9); FX.glow(ctx, b.x, b.y, 14, '240,210,255', 1, 1);
    ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = 'rgba(200,150,255,.8)'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(-6, -9, -26, 0); ctx.quadraticCurveTo(-6, 9, 10, 0); ctx.fill();
  } else if (b.kind === 'ice') {
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y, 18, '150,220,255', 0.8); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(a);
    ctx.fillStyle = '#dff8ff'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -5); ctx.lineTo(-16, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, 5); ctx.lineTo(-16, 0); ctx.closePath(); ctx.fill();
  } else if (b.kind === 'talisman') {
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y, 28, '255,160,40', 0.8); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = '#ffe680'; ctx.fillRect(-7, -12, 14, 24); ctx.strokeStyle = '#c4122a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(3, -2); ctx.lineTo(-3, 3); ctx.lineTo(3, 8); ctx.stroke();
  } else if (b.kind === 'rocket') {
    ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-14, -2, 18, 4); ctx.fillStyle = '#c0392b'; ctx.fillRect(2, -3, 7, 6);
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, -16, 0, 12, '255,180,60', 1, 1);
  } else if (b.kind === 'shell') {
    ctx.restore(); shadowE(b.x, b.y, 10, 0.35); ctx.save();
    circle(b.x, b.y - b.z, 9); ctx.fillStyle = '#2e2c2a'; ctx.fill(); circle(b.x - 3, b.y - b.z - 3, 3); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y - b.z, 16, '255,160,60', 0.6);
  } else if (b.kind === 'meteor') {
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y, 50, '255,120,30', 0.9); ctx.globalCompositeOperation = 'source-over';
    circle(b.x, b.y, 18); ctx.fillStyle = '#3a2440'; ctx.fill();
    ctx.strokeStyle = '#ffb640'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x - 10, b.y - 4); ctx.lineTo(b.x - 2, b.y + 2); ctx.lineTo(b.x + 6, b.y - 6); ctx.moveTo(b.x - 2, b.y + 2); ctx.lineTo(b.x + 2, b.y + 12); ctx.stroke();
    shadowE(b.tx, b.ty, 20 + 30 * Math.min(1, b.age / b.T), 0.3);
  } else if (b.kind === 'feather') {
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y, 26, '255,100,30', 0.9);
    ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = '#ffd07a'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.quadraticCurveTo(0, -8, -16, 0); ctx.quadraticCurveTo(0, 8, 14, 0); ctx.fill();
  } else if (b.kind === 'wave') {
    const k = 1 - b.life / (b.life0 || (b.life0 = b.life + 0.0001)); ctx.globalCompositeOperation = 'lighter'; ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); const r = 16 + b.t * 70;
    ctx.strokeStyle = 'rgba(120,210,255,' + Math.max(0, 0.8 - b.t * 0.9) + ')'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-r * 0.6, 0, r, -0.6, 0.6); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 0.9 - b.t) + ')'; ctx.lineWidth = 2.5; ctx.stroke();
  } else if (b.kind === 'swordwave') {
    ctx.globalCompositeOperation = 'lighter'; ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.strokeStyle = 'rgba(120,190,255,.55)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(-14, 0, 26, -1.1, 1.1); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,250,255,.95)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-14, 0, 26, -1.0, 1.0); ctx.stroke();
  } else if (b.kind === 'knife') {
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y, 14, '255,200,200', 0.6); ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7a1a1a'; ctx.fillRect(-10, -2, 6, 4);
  } else if (b.kind === 'foxfire') {
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, b.x, b.y, 30, '80,160,255', 0.9); FX.glow(ctx, b.x, b.y, 12, '230,250,255', 1, 1);
    ctx.translate(b.x, b.y); ctx.rotate(a); ctx.fillStyle = 'rgba(140,210,255,.8)'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(-4, -10, -24, 0); ctx.quadraticCurveTo(-4, 10, 12, 0); ctx.fill();
  } else if (b.kind === 'club') {
    ctx.translate(b.x, b.y); ctx.rotate(b.rot);
    ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, 0, 0, 26, '255,200,80', 0.5); ctx.globalCompositeOperation = 'source-over';
    rrPath(-18, -6, 36, 12, 6); ctx.fillStyle = '#8a5a2a'; ctx.fill(); circle(14, 0, 9); ctx.fillStyle = '#a06a30'; ctx.fill();
    for (let i = 0; i < 4; i++) { circle(14 + Math.cos(i * 1.57) * 9, Math.sin(i * 1.57) * 9, 2.5); ctx.fillStyle = '#f0d070'; ctx.fill(); }
  }
  ctx.restore();
}
function drawEnemy(e) {
  if (e.hideT > 0) return;
  const d = EN[e.type], fly = d.fly, x = e.x, y = e.y + (fly ? -36 + Math.sin(e.wob) * 6 : 0) - (e.jumpT > 0 ? Math.sin((1 - e.jumpT / 0.6) * Math.PI) * 70 : 0);
  if (e.charmT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - e.hh * 0.5, e.hh * 0.8, '255,100,180', 0.5); ctx.restore(); }
  shadowE(e.x, e.y + 2, e.r * (fly ? 0.8 : 1.15), fly ? 0.18 : 0.32);
  /* 조준선 예고: 원거리 적이 쏘기 0.3초 전, 처용 쪽으로 붉은 점선 */
  if (d.range && !d.caster && e.cd > 0 && e.cd < 0.32 && G.phase === 'night' && !e.dead) { const P = G.player, dd2 = Math.hypot(P.x - e.x, P.y - e.y); if (dd2 < d.range + 40) { const k = 1 - e.cd / 0.32; ctx.save(); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -G.t * 60; ctx.strokeStyle = 'rgba(255,60,40,' + (0.35 + 0.5 * k) + ')'; ctx.lineWidth = 2 + 2 * k; ctx.beginPath(); ctx.moveTo(e.x, e.y - 40); ctx.lineTo(P.x, P.y - 40); ctx.stroke(); ctx.setLineDash([]); circle(P.x, P.y - 40, 10 + 10 * (1 - k)); ctx.strokeStyle = 'rgba(255,80,60,' + (0.4 + 0.5 * k) + ')'; ctx.stroke(); ctx.restore(); } }
  if (d.tint && !(G.low)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - e.hh * 0.45, e.hh * 0.7, d.tint, 0.38 + 0.12 * Math.sin(G.t * 4 + e.wob)); ctx.restore(); }
  if (e.mut) { const M = MUT[e.mut]; ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - e.hh * 0.45, e.hh * (e.mut === 'giant' ? 0.75 : 0.6), M.c, 0.32 + 0.12 * Math.sin(G.t * 5 + e.wob)); ctx.restore(); if (e.mut === 'rage' && Math.random() < 0.15) FX.ember(x + rnd(-10, 10), y - e.hh * 0.8, '255,90,40', 1, 50); }
  if (e.elite || e.boss) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.4); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = e.boss ? 'rgba(255,60,60,.7)' : 'rgba(255,170,60,.6)'; ctx.lineWidth = 5; circle(0, 0, e.r * 1.6 + Math.sin(G.t * 6) * 3); ctx.stroke(); ctx.restore();
  }
  if (e.tele > 0) { /* 돌진 예고 */
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ca); const k = 1 - e.tele / 0.7;
    ctx.fillStyle = 'rgba(255,40,30,' + (0.18 + 0.2 * k) + ')'; ctx.fillRect(0, -e.r, 380, e.r * 2);
    ctx.fillStyle = 'rgba(255,80,60,.6)'; ctx.fillRect(0, -e.r, 380 * k, e.r * 2); ctx.restore();
  }
  const sq = e.squash, sx = (1 + sq * 0.12) * (d.flap ? 0.72 + 0.28 * Math.abs(Math.sin(G.t * 18 + e.wob)) : 1), sy = 1 - sq * 0.1, lun = e.lunge > 0 ? (e.flip ? -6 : 6) : 0;
  const mode = e.hitT > 0 ? 'white' : (e.frzT > 0 ? 'ice' : null);
  const walkT = e.frzT > 0 || e.stunT > 0 ? 0 : G.t + e.wob;
  const spA = SPR[EK(e.type)] && SPR[EK(e.type)].A;
  let an = null, at = null, fps = null, py = 0;
  if (spA) {
    if (e.st === 'rise') { an = 'rise'; at = 1 - e.stT / 1.0; }
    else if (e.st === 'scream') { an = 'scream'; at = 1 - e.stT / 0.7; }
    else if (e.st === 'hit') { an = 'hit'; at = 1 - e.stT / 0.28; }
    else if (e.st === 'climb') { an = 'climb'; }
    else if (e.atkT > 0) { an = 'atk'; at = 1 - e.atkT / 0.5; }
    else { an = e.frenzy ? 'run' : (ZVAR[e.var] ? ZVAR[e.var].anim : 'walk'); fps = 10 * Math.max(0.6, Math.min(1.8, e.sp / 60)); }
    if (an && !spA[an]) an = an === 'run' ? 'walk' : (spA.walk ? 'walk' : null);
    py = -e.pile * 14;
  }
  const tw = e.twA > 0 ? e.twR * (e.twA / 0.18) : 0;
  const ok = drawSprite(EK(e.type), x + lun + (e.twA > 0 ? Math.sin(G.t * 90) * 3 : 0), y + py, { anim: an, at, fps, dir: spA || (SPR[EK(e.type)] && SPR[EK(e.type)].dirs > 1) ? e.d8 : null, t: walkT, flip: e.flip, sc: e.sc, mode, sx, sy, rot: tw + (SPR[EK(e.type)] && SPR[EK(e.type)].frames === 1 && !fly ? Math.sin(e.wob * 1.4) * 0.06 : 0) });
  if (!ok) {
    const r = e.r; circle(x, y - r, r); ctx.fillStyle = mode === 'white' ? '#fff' : (e.boss ? '#8a2a3a' : '#8ac04a'); ctx.fill(); ctx.strokeStyle = '#1a1410'; ctx.lineWidth = 3; ctx.stroke();
    circle(x - r * 0.35, y - r * 1.15, r * 0.3); circle(x + r * 0.35, y - r * 1.15, r * 0.3); ctx.fillStyle = '#fff'; ctx.fill();
    circle(x - r * 0.35, y - r * 1.15, r * 0.12); circle(x + r * 0.35, y - r * 1.15, r * 0.12); ctx.fillStyle = '#000'; ctx.fill();
  }
  if (e.slowT > 0 && !(e.frzT > 0)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, e.y); ctx.scale(1, 0.4); ctx.strokeStyle = 'rgba(120,200,255,.6)'; ctx.lineWidth = 3; circle(0, 0, e.r + 6); ctx.stroke(); ctx.restore(); }
  if (e.frzT > 0) { ctx.fillStyle = 'rgba(200,240,255,.35)'; ctx.fillRect(x - e.r, y - e.hh, e.r * 2, e.hh); }
  if (e.stunT > 0) for (let i = 0; i < 3; i++) { const a = G.t * 6 + i * 2.1; ctx.fillStyle = '#ffe060'; ctx.font = '900 16px sans-serif'; ctx.fillText('★', x + Math.cos(a) * 16, y - e.hh - 6 + Math.sin(a) * 5); }
  if (d.aura) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, e.y); ctx.scale(1, 0.45); ctx.strokeStyle = 'rgba(190,120,255,' + (0.3 + 0.2 * Math.sin(G.t * 5)) + ')'; ctx.lineWidth = 4; circle(0, 0, 110); ctx.stroke(); ctx.restore(); }
  if (e.hasteT > 0 && Math.random() < 0.2) FX.p({ kind: 'glow', x: x + rnd(-8, 8), y: y - rnd(0, e.hh), vy: -30, life: 0.3, s: 5, s2: 1, c: '200,140,255' });
  /* 체력 막대: 다친 적, 정예, 우두머리 */
  if (e.elite) hpBar(x - 32, y - e.hh - 16, 64, 7, e.hp / e.max, '#ff4a3a');
  else if (!e.boss && e.hp < e.max) hpBar(x - 16, y - e.hh - 8, 32, 4, e.hp / e.max, '#ff5a4a');
}
function drawCorpse(c) {
  if (c.hasDie) { const at = Math.min(1, c.t / 0.85), fade = Math.min(1, (c.life - c.t) / 0.6); drawSprite(EK(c.type), c.x, c.y, { anim: 'die', at, dir: c.d8, sc: c.sc, alpha: fade, mode: c.t < 0.08 ? 'white' : null }); return; }
  const k = Math.max(0, 1 - c.t / 0.45);
  drawSprite(EK(c.type), c.x, c.y, { sc: c.sc, flip: c.flip, rot: (1 - k) * 1.3 * c.dir, alpha: k, mode: k > 0.75 ? 'white' : 'dark', sy: 1 - (1 - k) * 0.3, sx: 1 });
}
function drawTurret(t, day) {
  const d = TUR[t.type], x = t.x, y = t.y, rise = t.rise > 0 ? 1 - t.rise / 0.45 : 1;
  if (day && d.range) { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); ctx.strokeStyle = 'rgba(255,230,160,.35)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 3; circle(0, 0, d.range); ctx.stroke(); ctx.restore(); }
  if (d.kind === 'aura' && !day) { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); const gr = ctx.createRadialGradient(0, 0, d.range * 0.3, 0, 0, d.range); gr.addColorStop(0, 'rgba(110,190,255,0)'); gr.addColorStop(1, 'rgba(110,190,255,' + (0.18 + 0.06 * Math.sin(t.pulse * 3)) + ')'); ctx.fillStyle = gr; circle(0, 0, d.range); ctx.fill(); ctx.strokeStyle = 'rgba(160,220,255,.45)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, d.range * (0.5 + 0.17 * i), t.pulse * (1 + i * 0.3), t.pulse * (1 + i * 0.3) + 1.6); ctx.stroke(); } ctx.restore(); }
  shadowE(x, y + 16, 26);
  drawSprite('build_pad', x, y + 22, {});
  const headKey = d.head && SPR[d.head] ? d.head : null;
  let ok;
  if (headKey) { const hs = SPR[headKey], aim = t.aim == null ? -Math.PI / 2 : t.aim, rc = (t.recoil || 0); const back = rc * rc * 10;
    ok = drawSprite(headKey, x - Math.cos(aim) * back, y + 18 - Math.sin(aim) * back * 0.6, { dir: dirN(aim, hs.dirs || 16), mode: t.hitT > 0 ? 'white' : null, sy: rise * (1 - rc * 0.06), sx: 1 + (1 - rise) * 0.3 + rc * 0.04, alpha: t.seal > 0 ? 0.6 : 1 }); }
  else ok = drawSprite(d.spr, x, y + 18, { mode: t.hitT > 0 ? 'white' : null, sc: 1 + 0.07 * Math.min(4, (t.lv || 1) - 1) /* 강화할수록 커짐 */, sy: rise, sx: 1 + (1 - rise) * 0.3, alpha: t.seal > 0 ? 0.6 : 1 });
  /* 생동감: 깃발, 불꽃, 물빛, 금가루, 등불 */
  if (!t.rise || t.rise <= 0) {
    if (t.type === 'fire' && Math.random() < 0.5) FX.ember(x + rnd(-10, 10), y - d.top * 0.92, Math.random() < 0.5 ? '255,150,40' : '255,220,110', 1, 70);
    if (t.type === 'fire') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - d.top * 0.9, 30 + Math.sin(G.t * 13 + x) * 4, '255,140,40', 0.55); ctx.restore(); }
    if (t.type === 'well' && Math.random() < 0.08) FX.p({ kind: 'glow', x: x + rnd(-16, 16), y: y - d.top * 0.25 + rnd(-4, 4), life: 0.5, s: 5, s2: 1, c: '170,230,255' });
    if (t.type === 'mine' && Math.random() < 0.12) FX.p({ kind: 'glow', x: x + rnd(-20, 20), y: y - rnd(6, 30), vy: -20, life: 0.7, s: 4, s2: 1, c: '255,225,100' });
    if (t.type === 'talisman') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - d.top * 0.55, 26, '120,190,255', 0.35 + 0.25 * Math.abs(Math.sin(G.t * 2.3 + x))); ctx.restore(); }
    if (t.type === 'arrow' || t.type === 'barracks') { const fx0 = x + (t.type === 'arrow' ? 26 : 34), fy = y + 18 - d.top * 0.98; ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx0, fy + 16); ctx.lineTo(fx0, fy - 12); ctx.stroke(); ctx.fillStyle = '#c8322a'; ctx.beginPath(); ctx.moveTo(fx0, fy - 12); for (let k = 0; k <= 6; k++) ctx.lineTo(fx0 + k * 3.4, fy - 12 + Math.sin(G.t * 7 - k * 0.8 + x) * 2.2 + k * 0.3); for (let k = 6; k >= 0; k--) ctx.lineTo(fx0 + k * 3.4, fy - 2 + Math.sin(G.t * 7 - k * 0.8 + x) * 2.2 - k * 0.6); ctx.closePath(); ctx.fill(); }
  }
  /* 탑 위 병사: 망루 */
  if (d.crew && t.rise <= 0) drawCrew(t, d);
  /* 단계 장식: 3단계 금빛 띠, 5단계 빛 */
  if (t.lv >= 5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - d.top * 0.4, d.top * 0.9, '255,220,120', 0.18 + 0.08 * Math.sin(G.t * 3)); ctx.restore(); }
  if (t.hp < t.max * 0.4 && !day) { if (Math.random() < 0.15) FX.smoke(x + rnd(-14, 14), y - d.top * 0.6, 1, '70,60,55', 12, 50); }
  if (!ok) { rrPath(x - 14, y - 40, 28, 56, 6); ctx.fillStyle = '#7a5a34'; ctx.fill(); }
  if (t.fire > 0 && (d.kind === 'shot' || d.kind === 'beam' || d.kind === 'chain')) { ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - d.top * 0.78, 26, d.kind === 'chain' ? '200,140,255' : '255,160,80', t.fire / 0.12, 1); ctx.globalCompositeOperation = 'source-over'; }
  for (let i = 0; i < t.lv; i++) { const sx = x - (t.lv - 1) * 8 + i * 16; ctx.font = '900 18px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a2408'; ctx.strokeText('★', sx, y + 40); ctx.fillStyle = '#ffd34a'; ctx.fillText('★', sx, y + 40); }
  if (!day && t.hp < t.max) hpBar(x - 22, y - d.top - 6, 44, 6, t.hp / t.max, '#7ee060');
  { const PP = pairOfTur(t.type); if (PP) { const bx = x + 24, by = y - d.top - 18 + Math.sin(G.t * 3 + x) * 2; ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, bx, by, 26, '255,215,110', 0.5); ctx.restore(); circle(bx, by, 15); ctx.fillStyle = '#2a1a08'; ctx.fill(); if (!drawPort(PP.hero, bx, by, 13, '#ffd34a')) { ctx.fillStyle = '#ffd34a'; circle(bx, by, 11); ctx.fill(); } txt('짝', bx + 14, by + 12, 13, '#ffd34a', 'center', '#2a1408', 3); } }
  if (t.seal > 0) { ctx.fillStyle = '#ffe680'; ctx.fillRect(x - 8, y - 46, 16, 26); ctx.strokeStyle = '#a3202a'; ctx.lineWidth = 2; ctx.strokeRect(x - 8, y - 46, 16, 26); }
}
function drawGuard(id) {
  const Gd = GUARD[id], g = G.guards.find(o => o.id === id), x = Gd.x, y = Gd.y;
  if (g && id === 'turtle' && !(g.seal > 0)) { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); const gr = ctx.createRadialGradient(0, 0, Gd.range * 0.4, 0, 0, Gd.range); gr.addColorStop(0, 'rgba(' + Gd.c + ',0)'); gr.addColorStop(1, 'rgba(' + Gd.c + ',' + (0.14 + 0.05 * Math.sin(g.pulse * 2)) + ')'); ctx.fillStyle = gr; circle(0, 0, Gd.range); ctx.fill(); ctx.restore(); }
  shadowE(x, y + 16, 40);
  ctx.fillStyle = '#6f6a5d'; ctx.beginPath(); ctx.ellipse(x, y + 12, 38, 15, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = g ? '#b4ad9a' : '#8a8475'; ctx.beginPath(); ctx.ellipse(x, y + 6, 38, 15, 0, 0, TAU); ctx.fill();
  if (g) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y + 6); ctx.scale(1, 0.4); ctx.strokeStyle = 'rgba(' + Gd.c + ',' + (0.5 + 0.3 * Math.sin(g.pulse * 3)) + ')'; ctx.lineWidth = 4; circle(0, 0, 44); ctx.stroke(); ctx.restore(); }
  const ok = drawSprite('guard_' + id, x, y + 10, { alpha: g ? 1 : 0.85, mode: g ? null : 'stone' });
  if (g && g.flash > 0) drawSprite('guard_' + id, x, y + 10, { mode: 'white', alpha: Math.min(0.7, g.flash) });
  if (!g) { /* 잠든 석상: 회색 */ }
  else { if (g.flash > 0) g.flash -= 1 / 60; const SP = SPIRIT[id]; ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, x, y - 30, 46 + Math.sin(g.pulse * 2) * 6, SP.col, 0.25 + 0.1 * Math.sin(g.pulse * 3)); ctx.restore(); }
  if (!ok && g) { circle(x, y - 22, 14); ctx.fillStyle = 'rgb(' + Gd.c + ')'; ctx.fill(); }
  if (g && g.seal > 0) { ctx.fillStyle = '#ffe680'; ctx.fillRect(x - 8, y - 50, 16, 26); }
  ctx.font = '800 17px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(Gd.n, x, y + 38); ctx.fillStyle = g ? '#ffe3a0' : 'rgba(241,233,214,.6)'; ctx.fillText(Gd.n, x, y + 38);
}
function drawPlayer(p) {
  /* 발밑 고리와 장전 고리(후더덕의 흰 원형 게이지처럼) */
  ctx.save(); ctx.translate(p.x, p.y + 4); ctx.scale(1, 0.42);
  ctx.strokeStyle = 'rgba(120,255,220,.85)'; ctx.lineWidth = 5; circle(0, 0, 34); ctx.stroke();
  if (isNight()) { const k = 1 - Math.max(0, p.cd) / p.rate; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); }
  ctx.restore();
  shadowE(p.x, p.y + 4, 22, 0.38);
  const rec = p.recoil * 3 * (p.flip ? 1 : -1);
  const pdir = p.aimT > 0 ? p.face : (p.mdir != null ? p.mdir : Math.PI / 2);
  if (p.atkA > 0) p.atkA -= 1 / 60;
  const pan = p.hitT > 0 ? 'hit' : p.atkA > 0 ? 'atk' : p.moving ? 'walk' : 'idle', pat = pan === 'atk' ? 1 - p.atkA / 0.32 : pan === 'hit' ? 1 - Math.max(0, p.hitT) / 0.12 : null;
  /* 탈것: 처용 아래에 탈것을 그리고 처용을 안장 높이로 올린다. 학은 날갯짓 */
  const MK = G.cfg && G.cfg.mount && SPR['mount_' + G.cfg.mount] ? 'mount_' + G.cfg.mount : (G.cfg && G.cfg.mount ? (need('mount_' + G.cfg.mount), null) : null);
  let rideY = 0;
  if (MK) { const crane = G.cfg.mount === 'crane', flap = crane ? Math.sin(G.t * (p.moving ? 14 : 5)) : 0, hop = p.moving ? Math.abs(Math.sin(G.t * 12)) * 4 : 0;
    drawSprite(MK, p.x, p.y + 10 - hop, { anim: p.moving ? 'walk' : 'idle', dir: dir8(pdir), t: G.t, flip: p.flip, h: crane ? 96 : 78, sx: 1 + flap * 0.08, sy: 1 - flap * 0.04 });
    rideY = (crane ? 50 : 38) + hop; }
  const ok = drawSprite(G.pkey || 'player', p.x + rec, p.y + 4 - rideY, { anim: pan, at: pat, dir: dir8(pdir), t: G.t, flip: p.flip, mode: p.hitT > 0 ? 'white' : null, sy: 1 + Math.sin(G.t * (p.moving ? 16 : 3)) * 0.015 });
  if (!ok) { circle(p.x, p.y - 30, 22); ctx.fillStyle = '#f0e8d8'; ctx.fill(); ctx.fillStyle = '#17171a'; ctx.fillRect(p.x - 26, p.y - 56, 52, 5); ctx.fillRect(p.x - 12, p.y - 70, 24, 15); }
  if (p.muzzle > 0) { ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, p.x + Math.cos(p.face) * 30, p.y - 46 + Math.sin(p.face) * 30, 22, '255,220,140', 1, 1); ctx.globalCompositeOperation = 'source-over'; }
  hpBar(p.x - 34, p.y - 108, 68, 8, p.hp / p.max, '#5ee05a');
  ctx.font = '900 16px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0c1416'; ctx.strokeText('처용', p.x, p.y - 120); ctx.fillStyle = '#fff'; ctx.fillText('처용', p.x, p.y - 120);
}
function drawComp(c) {
  if (!c.active) return;
  const C = COMP[c.id], bob = Math.sin(G.t * 5 + (c.id.length)) * 3;
  const dropY = c.drop > 0 ? -700 * c.drop * c.drop : 0;
  if (c.drop > 0) { ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, 0.4); ctx.strokeStyle = 'rgba(160,230,255,.8)'; ctx.lineWidth = 4; circle(0, 0, 30 + 40 * c.drop); ctx.stroke(); ctx.restore(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(160,220,255,.25)'; ctx.fillRect(c.x - 14, c.y + dropY - 400, 28, 400); ctx.globalCompositeOperation = 'source-over'; }
  shadowE(c.x, c.y + 2, 18 * (c.drop > 0 ? 1 - c.drop * 0.6 : 1));
  if (c.soar > 0) c.soar -= 1 / 60;
  const fly = (c.id === 'samjoko' ? -26 + bob : c.id === 'imugi' ? -70 + bob * 2 - (c.soar > 0 ? Math.sin(Math.min(1, (2.6 - c.soar) / 2.6) * Math.PI) * 220 : 0) : 0) + dropY;
  if (c.id === 'honggildong' && c.cloneT > 0) for (const ox of [-54, 54]) drawCompBody(c, C, c.x + ox, c.y - 20, Math.min(1, c.cloneT * 2) * 0.55);
  drawCompBody(c, C, c.x, c.y + fly, 1);
  /* 이름표 */
  ctx.font = '900 14px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#0c1416'; ctx.strokeText(C.n, c.x, c.y + fly - (HOV[C.spr] || 70) - 12); ctx.fillStyle = 'rgb(' + C.col + ')'; ctx.fillText(C.n, c.x, c.y + fly - (HOV[C.spr] || 70) - 12);
}
function drawCompBody(c, C, x, y, alpha) {
  const can = c.fire > 0 ? (c.atkK || 'atk') : c.moving ? 'walk' : 'idle';
  const ok = drawSprite(C.spr, x, y, { anim: can, at: can === 'atk' ? 1 - Math.max(0, c.fire) / (c.id === 'haetae' ? 0.45 : 0.35) : null, dir: dir8(c.fdir != null ? c.fdir : Math.PI / 2), t: G.t + c.id.length, flip: c.flip, sy: c.fire > 0 ? 1.06 : 1, alpha });
  if (!ok && PORT[c.id]) {
    ctx.globalAlpha = alpha; const bob2 = c.moving ? Math.abs(Math.sin(c.t * 10)) * 4 : 0;
    rrPath(x - 16, y - 34 - bob2, 32, 34, 12); const bg = ctx.createLinearGradient(0, y - 34, 0, y); bg.addColorStop(0, 'rgb(' + C.col + ')'); bg.addColorStop(1, '#2a1a2a'); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 3; ctx.stroke();
    drawPort(c.id, x, y - 58 - bob2, 28, 'rgb(' + C.col + ')');
    ctx.globalAlpha = 1; return;
  }
  if (!ok) {
    ctx.globalAlpha = alpha;
    const gr = ctx.createRadialGradient(x - 6, y - 40, 2, x, y - 32, 26); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, 'rgb(' + C.col + ')'); gr.addColorStop(1, '#2a1a2a');
    rrPath(x - 18, y - 30, 36, 30, 10); ctx.fillStyle = gr; ctx.fill(); circle(x, y - 46, 20); ctx.fill(); ctx.strokeStyle = '#1a1010'; ctx.lineWidth = 3; ctx.stroke();
    circle(x - 7, y - 48, 4); circle(x + 7, y - 48, 4); ctx.fillStyle = '#1a1010'; ctx.fill();
    txt(C.n[0], x, y - 14, 16, '#fff', 'center', '#1a1010', 3);
    ctx.globalAlpha = 1;
  }
}
function drawShrine(s) {
  const k0 = s.hp / s.max, x = s.x + (s.hitT > 0 ? rnd(-3, 3) : 0) + (isNight() && k0 < 0.25 ? Math.sin(G.t * 40) * 1.5 : 0), y = s.y;
  if (Math.random() < 0.15) FX.p({ kind: 'smoke', x: x + rnd(-32, 32), y: y - 60, vx: rnd(-6, 6), vy: -rnd(14, 26), life: 2.2, s: 5, s2: 18, c: '235,230,220', rot: 0, vr: 0.4 });
  shadowE(x, y + 50, 82, 0.3);
  if (!(drawSprite('base', x, y + 62, { mode: s.hitT > 0 ? 'white' : null, sc: 0.8 }) || drawSprite('shrine', x, y + 70, { mode: s.hitT > 0 ? 'white' : null, sc: 0.8 }))) { rrPath(x - 40, y - 30, 80, 60, 10); ctx.fillStyle = '#a8432f'; ctx.fill(); }
  if (k0 < 0.5) { ctx.strokeStyle = 'rgba(30,18,10,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 30, y - 40); ctx.lineTo(x - 16, y - 22); ctx.lineTo(x - 26, y - 4); ctx.moveTo(x + 22, y - 50); ctx.lineTo(x + 10, y - 30); if (k0 < 0.25) { ctx.moveTo(x + 4, y - 60); ctx.lineTo(x - 6, y - 34); ctx.lineTo(x + 8, y - 12); ctx.moveTo(x + 36, y - 20); ctx.lineTo(x + 24, y); } ctx.stroke(); if (k0 < 0.25 && Math.random() < 0.2) FX.smoke(x + rnd(-40, 40), y - 50, 1, '80,70,60', 14, 40); }
  if (G.shShield > 0) { ctx.save(); ctx.translate(x, y - 30); ctx.scale(1, 0.7); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,215,110,' + (0.5 + 0.2 * Math.sin(G.t * 5)) + ')'; ctx.lineWidth = 5; circle(0, 0, 120); ctx.stroke(); ctx.fillStyle = 'rgba(255,215,110,.1)'; ctx.fill(); ctx.restore(); }
}
function drawZone(z) {
  const k = Math.min(1, z.t / 0.5, (z.life - z.t) * 4);
  ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, 0.62);
  if (z.holy) {
    const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, z.r); hg.addColorStop(0, 'rgba(255,240,170,' + 0.1 * k + ')'); hg.addColorStop(0.85, 'rgba(255,210,100,' + 0.28 * k + ')'); hg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = hg; circle(0, 0, z.r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,140,' + 0.9 * k + ')'; ctx.lineWidth = 6; circle(0, 0, z.r); ctx.stroke();
    ctx.rotate(G.t * 0.6); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,240,180,' + 0.6 * k + ')';
    for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.arc(z.r * 0.7, 0, 18, 0, TAU); ctx.stroke(); }
    ctx.restore(); return;
  }
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, z.r);
  gr.addColorStop(0, 'rgba(255,170,60,' + 0.45 * k + ')'); gr.addColorStop(0.7, 'rgba(230,60,20,' + 0.4 * k + ')'); gr.addColorStop(1, 'rgba(200,30,10,0)');
  ctx.fillStyle = gr; circle(0, 0, z.r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,90,40,' + 0.7 * k + ')'; ctx.lineWidth = 4; circle(0, 0, z.r * (0.95 + 0.04 * Math.sin(G.t * 10))); ctx.stroke();
  ctx.restore();
}
function drawVortex(v) {
  const k = Math.min(1, v.t / 0.4, (v.life - v.t) * 4);
  ctx.save(); ctx.translate(v.x, v.y); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.scale(1, 0.5 - i * 0.04); ctx.translate(0, -i * 30); ctx.rotate(G.t * (7 + i)); ctx.strokeStyle = 'rgba(255,' + (120 + i * 30) + ',40,' + (0.8 - i * 0.12) * k + ')'; ctx.lineWidth = 9 - i * 1.5; ctx.beginPath(); ctx.arc(0, 0, v.r * (1 - i * 0.18), 0, 4); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, v.r * (0.6 - i * 0.1), 3, 6); ctx.stroke(); ctx.restore(); }
  FX.glow(ctx, 0, -20, v.r * 0.8, '255,120,30', 0.6 * k);
  ctx.restore();
}
function drawTele(t) {
  const k = 1 - t.t / t.life;
  ctx.save(); ctx.translate(t.x, t.y); ctx.scale(1, 0.62);
  ctx.fillStyle = 'rgba(' + t.c + ',' + (0.12 + 0.1 * k) + ')'; circle(0, 0, t.r); ctx.fill();
  ctx.fillStyle = 'rgba(' + t.c + ',.35)'; circle(0, 0, t.r * k); ctx.fill();
  ctx.strokeStyle = 'rgba(' + t.c + ',.9)'; ctx.lineWidth = 4; circle(0, 0, t.r); ctx.stroke();
  ctx.restore();
}
function drawFan(x, y, a) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, 0, 0, 34, '255,90,140', 0.6); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#ff6a8a'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 24, -1.1, 1.1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * 0.5) * 24, Math.sin(i * 0.5) * 24); ctx.stroke(); }
  ctx.strokeStyle = '#7a1a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 24, -1.1, 1.1); ctx.stroke();
  ctx.restore();
}

const CREW = [null, ['s_archer', 1], ['s_archer', 2], ['s_crossbow', 2], ['s_crossbow', 3], ['s_gun', 3]];
function crewOf(t) { return CREW[Math.min(5, t.lv)] || CREW[1]; }
function drawCrew(t, d) {
  const [spr, n] = crewOf(t), y0 = t.y + 18 - d.top * 0.62;
  for (let i = 0; i < n; i++) { const ox = (i - (n - 1) / 2) * 16, aim = t.aim == null ? -Math.PI / 2 : t.aim, fa = (t.crewA && t.crewA[i]) || 0;
    if (!drawSprite(spr, t.x + ox, y0, { h: 30, dir: dir8(aim), anim: fa > 0 ? 'atk' : 'idle', at: fa > 0 ? 1 - fa / 0.3 : null, t: G.t + i })) { circle(t.x + ox, y0 - 14, 7); ctx.fillStyle = spr === 's_gun' ? '#2a3050' : spr === 's_crossbow' ? '#2a5030' : '#3a6a3a'; ctx.fill(); ctx.fillStyle = '#17171a'; ctx.fillRect(t.x + ox - 8, y0 - 24, 16, 3); } }
}
function drawWall(w, day) {
  if (!w.built) { if (day) { ctx.save(); ctx.setLineDash([12, 10]); ctx.strokeStyle = 'rgba(255,240,200,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w.x - (w.gate ? 64 : 42), WALL_Y - 6); ctx.lineTo(w.x + (w.gate ? 64 : 42), WALL_Y - 6); ctx.stroke(); ctx.restore(); } return; }
  if (w.hp <= 0) { for (let i = 0; i < 5; i++) { const xx = w.x + (i - 2) * 16, yy = WALL_Y + ((i * 7) % 5) - 4; shadowE(xx, yy + 6, 10, 0.25); rrPath(xx - 9, yy - 8, 18, 12, 4); ctx.fillStyle = i % 2 ? '#7e7462' : '#6a6050'; ctx.fill(); } return; }
  const k = w.hp / w.max;
  const ok = drawSprite(w.gate ? 'gate' : 'wall', w.x, WALL_Y + (w.gate ? 18 : 14), { mode: w.hitT > 0 ? 'white' : null });
  if (w.gate) { /* 아군이 가까이 오면 문이 열린다 */ let near = false; const chk = o => o && Math.abs(o.x - w.x) < 70 && Math.abs(o.y - WALL_Y) < 60; if (chk(G.player)) near = true; for (const c of G.comps) if (chk(c)) near = true; for (const a of (G.allies || [])) if (chk(a)) near = true; w.op = clamp((w.op || 0) + (near || w.openT > 0 ? 1 : -1) * 0.08, 0, 1); if (w.openT > 0) w.openT -= 0.02;
    if (w.op > 0.02) { const k2 = w.op, dw = 52, dh = 64, bx = w.x, by = WALL_Y + 6; ctx.save(); ctx.fillStyle = 'rgba(28,18,12,' + (0.92 * k2) + ')'; ctx.beginPath(); ctx.moveTo(bx - dw / 2 * k2, by); ctx.lineTo(bx - dw / 2 * k2, by - dh + 14); ctx.quadraticCurveTo(bx, by - dh - 6, bx + dw / 2 * k2, by - dh + 14); ctx.lineTo(bx + dw / 2 * k2, by); ctx.closePath(); ctx.fill(); const lg = ctx.createLinearGradient(0, by - dh, 0, by); lg.addColorStop(0, 'rgba(255,220,150,0)'); lg.addColorStop(1, 'rgba(255,220,150,' + 0.35 * k2 + ')'); ctx.fillStyle = lg; ctx.fill(); ctx.restore(); } }
  if (!ok) { rrPath(w.x - (w.gate ? 66 : 42), WALL_Y - 34, w.gate ? 132 : 84, 40, 6); ctx.fillStyle = w.gate ? '#8a3a2a' : '#8a7a62'; ctx.fill(); ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.stroke(); }
  if (k < 0.66) { ctx.strokeStyle = 'rgba(30,20,10,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(w.x - 14, WALL_Y - 30); ctx.lineTo(w.x - 4, WALL_Y - 16); ctx.lineTo(w.x - 12, WALL_Y - 4); if (k < 0.33) { ctx.moveTo(w.x + 10, WALL_Y - 34); ctx.lineTo(w.x + 18, WALL_Y - 18); ctx.lineTo(w.x + 8, WALL_Y - 8); } ctx.stroke(); }
  if (w.hitT > 0) w.hitT -= 1 / 60;
  if (k < 1 && !day) hpBar(w.x - 30, WALL_Y - (w.gate ? 112 : 70), 60, 6, k, k < 0.3 ? '#ff5a3a' : '#e8c048');
}
function drawPickup(k) {
  const PK = window.JZI ? window.JZI.PICKUPS[k.kind] : { c: '255,255,255', n: k.kind };
  const y = k.y - 10 + Math.sin(G.t * 4 + k.x) * 4;
  shadowE(k.x, k.y + 4, 16, 0.3);
  ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, k.x, y - 10, 40, PK.c, 0.55 + 0.25 * Math.sin(G.t * 6)); ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#c8954a'; ctx.beginPath(); ctx.moveTo(k.x - 16, y); ctx.quadraticCurveTo(k.x - 20, y - 26, k.x, y - 28); ctx.quadraticCurveTo(k.x + 20, y - 26, k.x + 16, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#d0403a'; ctx.fillRect(k.x - 10, y - 26, 20, 5);
  txt({ magnet: '자', bomb: '폭', yakgwa: '약', pouch: '전' }[k.kind] || '?', k.x, y - 12, 16, '#fff', 'center', '#3a1a00', 4);
}
function drawWave(w) {
  const k = Math.min(1, w.t / 0.3, (w.life - w.t) * 4);
  const gr = ctx.createLinearGradient(0, w.y - 50, 0, w.y + 40);
  gr.addColorStop(0, 'rgba(230,250,255,' + 0.9 * k + ')'); gr.addColorStop(0.3, 'rgba(90,180,255,' + 0.7 * k + ')'); gr.addColorStop(1, 'rgba(30,90,200,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(w.x0, w.y + 40);
  for (let x = w.x0; x <= w.x1; x += 20) ctx.lineTo(x, w.y - 30 + Math.sin(x * 0.05 + G.t * 12) * 12);
  ctx.lineTo(w.x1, w.y + 40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,' + k + ')'; ctx.lineWidth = 5; ctx.beginPath(); for (let x = w.x0; x <= w.x1; x += 20) ctx.lineTo(x, w.y - 30 + Math.sin(x * 0.05 + G.t * 12) * 12); ctx.stroke();
}
function drawShip(s) {
  const k = 1 - s.t / s.life, y = camY + VH / zoom - 20 + (k < 0.15 ? (1 - k / 0.15) * 120 : k > 0.85 ? (k - 0.85) / 0.15 * 120 : 0), x = 360;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,90,140,.5)'; ctx.beginPath(); ctx.ellipse(0, 10, 150, 26, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#6a4226'; ctx.beginPath(); ctx.moveTo(-130, -10); ctx.quadraticCurveTo(0, 30, 130, -10); ctx.lineTo(110, -34); ctx.lineTo(-110, -34); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3a6a4a'; ctx.beginPath(); ctx.ellipse(0, -40, 100, 26, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#c0a050'; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 6, -44); ctx.lineTo(i * 22, -56); ctx.lineTo(i * 22 + 6, -44); ctx.fill(); }
  ctx.fillStyle = '#d04030'; circle(118, -26, 14); ctx.fill(); ctx.fillStyle = '#fff'; circle(122, -30, 4); ctx.fill();
  ctx.restore();
}
function shade(d) {
  if (d <= 0.01) return;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = G && G.nm ? 'rgb(' + Math.round(255 - d * 70) + ',' + Math.round(255 - d * 200) + ',' + Math.round(255 - d * 185) + ')' : 'rgb(' + Math.round(255 - d * 150) + ',' + Math.round(255 - d * 160) + ',' + Math.round(255 - d * 110) + ')';
  ctx.fillRect(0, 0, W, VH); ctx.globalCompositeOperation = 'source-over';
}
const PROPS = [['wall', 78], ['wall', 164], ['wall', 250], ['wall', 470], ['wall', 556], ['wall', 642]];
const BACKPROPS = [['well', 250, 1440], ['barracks', 110, 1456], ['mine', 600, 1420]];

function draw() {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  if (!G) { ctx.fillStyle = '#0d1210'; ctx.fillRect(0, 0, W, VH); return; }
  const day = G.phase === 'day' || G.phase === 'guard';
  const still = G.phase === 'win' || G.phase === 'lose';
  const ZT = day ? 1.12 : 1.28;
  if (!still) zoom += (ZT - zoom) * 0.05;
  const vw = W / zoom, vh = VH / zoom, p = G.player;
  if (!still) { const tx = p.x - vw / 2, ty = p.y - vh * (day ? 0.55 : 0.64); camX += (tx - camX) * 0.1; camY += (ty - camY) * 0.1; }
  camX = clamp(camX, 0, W - vw); camY = clamp(camY, 0, H - vh);
  let dark = 0.06;
  if (isNight() || G.phase === 'level' || G.phase === 'lose') dark = Math.min(0.62, 0.42 + Math.min(1, G.time / curN().dur) * 0.1 + G.night * 0.03 + (WORLD.T.snowy ? 0.06 : 0));
  else if (G.phase === 'dawn' || G.phase === 'win') dark = 0.06 + 0.4 * Math.max(0, G.dawnT / 2.2);
  G.dark += (dark - G.dark) * 0.05;
  const sk = FX.shake > 0 ? FX.shake * 30 : 0, shx = rnd(-sk, sk), shy = rnd(-sk, sk);
  ctx.drawImage(WORLD.cv, camX * WORLD.GS, camY * WORLD.GS, vw * WORLD.GS, vh * WORLD.GS, shx, shy, W, VH);
  shade(G.dark);
  ctx.save(); ctx.scale(zoom, zoom); ctx.translate(-camX + shx / zoom, -camY + shy / zoom);

  /* 바닥 */
  FX.drawDecals(ctx);
  for (const z of G.zones) drawZone(z);
  if (G.gadgets) for (const g of G.gadgets) drawGadget(g);
  if (G.pzs) for (const z of G.pzs) { const k = Math.min(1, z.t / 0.6, (z.life - z.t) * 4 + 0.2); ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, 0.62); const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, z.r); gr.addColorStop(0, 'rgba(150,240,70,' + 0.55 * k + ')'); gr.addColorStop(0.7, 'rgba(70,160,30,' + 0.4 * k + ')'); gr.addColorStop(1, 'rgba(40,90,20,0)'); ctx.fillStyle = gr; circle(0, 0, z.r); ctx.fill(); ctx.restore(); if (Math.random() < 0.15) FX.p({ kind: 'glow', x: z.x + rnd(-z.r * 0.7, z.r * 0.7), y: z.y + rnd(-14, 14), vy: -18, life: 0.7, s: 6, s2: 1, c: '170,255,90' }); }
  for (const t of G.tele) drawTele(t);
  for (let i = 0; i < PADS.length; i++) {
    if (G.turrets.some(t => t.pad === i)) continue;
    const q = PADS[i];
    drawSprite('build_pad', q[0], q[1] + 22, { alpha: day ? 1 : 0.6 });
    if (day) { const a = G.nearPad === i ? 1 : 0.5 + 0.3 * Math.sin(G.t * 3 + i); ctx.save(); ctx.translate(q[0], q[1] + 6); ctx.scale(1, 0.5); ctx.strokeStyle = 'rgba(160,255,140,' + a + ')'; ctx.lineWidth = 4; circle(0, 0, 36); ctx.stroke(); ctx.restore(); ctx.font = '900 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,255,180,' + a + ')'; ctx.fillText('+', q[0], q[1] - 6); }
  }
  /* 옥구슬, 엽전 */
  for (const o of G.orbs) { const y = o.y - o.z - 6 + Math.sin(G.t * 5 + o.x) * 2; ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, o.x, y, 16, '90,255,200', 0.7); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#5ef0c8'; ctx.beginPath(); ctx.moveTo(o.x, y - 8); ctx.lineTo(o.x + 6, y); ctx.lineTo(o.x, y + 8); ctx.lineTo(o.x - 6, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e0fff6'; ctx.fillRect(o.x - 2, y - 4, 2, 4); }
  for (const c of G.coins) { const y = c.y - c.z - 6, sw = Math.abs(Math.cos(G.t * 8 + c.x)); shadowE(c.x, c.y, 6, 0.25); ctx.fillStyle = '#e8b020'; ctx.beginPath(); ctx.ellipse(c.x, y, 8 * sw + 1, 8, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffe680'; ctx.beginPath(); ctx.ellipse(c.x, y, 5 * sw + 0.5, 5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#a07010'; ctx.fillRect(c.x - 1.5 * sw, y - 1.5, 3 * sw, 3); }

  /* 세로 순서로 그리기 */
  const list = [[G.shrine.y + 40, 0, G.shrine]];
  for (const w of G.walls) list.push([WALL_Y + 6, 5, w]);
  if (ART) for (const q of BACKPROPS) list.push([q[2] - 8, 6, q]);
  for (const k of G.pickups) list.push([k.y, 9, k]);
  for (const id in GUARD) list.push([GUARD[id].y, 1, id]);
  for (const t of G.turrets) list.push([t.y, 2, t]);
  for (const c of G.corpses) list.push([c.y - 1, 7, c]);
  for (const e of G.enemies) list.push([e.y + (EN[e.type].fly ? 400 : 0), 3, e]);
  for (const c of G.comps) list.push([c.y, 8, c]);
  if (G.allies) for (const a of G.allies) list.push([a.y, 10, a]);
  if (G.spirits) for (const s of G.spirits) list.push([s.y + 500, 11, s]);
  if (G.obj) { if (G.obj.beacon && G.obj.beacon.hp > 0) list.push([G.obj.beacon.y, 12, G.obj.beacon]); if (G.obj.refs) for (const r of G.obj.refs) list.push([r.y, 12, r]); }
  list.push([p.y, 4, p]);
  list.sort((a, b) => a[0] - b[0]);
  for (const it of list) {
    const k = it[1], o = it[2];
    if (k === 3) drawEnemy(o); else if (k === 2) drawTurret(o, day); else if (k === 1) drawGuard(o); else if (k === 0) drawShrine(o);
    else if (k === 5) drawWall(o, day); else if (k === 6) drawSprite(o[0], o[1], o[2], {}); else if (k === 7) drawCorpse(o); else if (k === 8) drawComp(o); else if (k === 9) drawPickup(o); else if (k === 10) drawAlly(o); else if (k === 11) drawSpirit(o); else if (k === 12) drawObjThing(o); else drawPlayer(o);
  }
  for (const w of G.waves) drawWave(w);
  if (G.ship) drawShip(G.ship);
  /* 사당 체력 */
  const sh = G.shrine; hpBar(sh.x - 70, sh.y - 108, 140, 12, sh.hp / sh.max, sh.hp / sh.max < 0.3 ? '#ff4a3a' : '#ffc23a');
  ctx.font = '900 18px ' + FONT; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#140c06'; ctx.strokeText('사당 ' + Math.max(0, Math.ceil(sh.hp)), sh.x, sh.y - 120); ctx.fillStyle = '#ffe8b0'; ctx.fillText('사당 ' + Math.max(0, Math.ceil(sh.hp)), sh.x, sh.y - 120);

  /* 처용무 부채 */
  const dl = skLv('dance'); if (dl && isNight()) for (let i = 0; i < 1 + dl; i++) { const a = G.t * 3.4 + i / (1 + dl) * TAU; drawFan(p.x + Math.cos(a) * 100, p.y - 30 + Math.sin(a) * 62, a + Math.PI / 2); }
  for (const v of G.vortexes) drawVortex(v);
  /* 탄과 광선 */
  for (const b of G.shots) drawShot(b);
  for (const a of G.eshots) {
    if (a.kind === 'ebullet') { /* 적 총알: 크고 밝은 테두리 + 꼬리 */ ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,120,60,.55)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.vx * 0.07, a.y - a.vy * 0.07); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; circle(a.x, a.y, 8); ctx.fillStyle = '#ffe27a'; ctx.fill(); ctx.strokeStyle = '#ff3a1a'; ctx.lineWidth = 3; ctx.stroke(); continue; }
    if (a.kind === 'curse') { ctx.globalCompositeOperation = 'lighter'; FX.glow(ctx, a.x, a.y, 22, '170,80,255', 0.9); FX.glow(ctx, a.x, a.y, 9, '255,220,255', 1, 1); ctx.globalCompositeOperation = 'source-over'; }
    else { const an = Math.atan2(a.vy, a.vx); ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(an); /* 적 화살: 1.8배 + 밝은 테두리 */ ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,230,120,.45)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-44, 0); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.scale(1.8, 1.8); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,80,60,.5)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, 0); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-22, -1.5, 22, 3); ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.fill(); ctx.restore(); }
  }
  for (const b of G.beams) drawBeam(b);
  for (const mk of G.marks) { const k = mk.t / mk.life; ctx.save(); ctx.translate(mk.x, mk.y); ctx.rotate(mk.a); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,' + k + ')'; ctx.lineCap = 'round'; for (let i = -1; i <= 1; i++) { ctx.lineWidth = 6 * k + 1; ctx.beginPath(); ctx.moveTo(-30, i * 12 - 20); ctx.quadraticCurveTo(0, i * 12, 30, i * 12 + 20); ctx.stroke(); } ctx.restore(); }
  if (G.loot) drawLoot(G.loot);
  FX.draw(ctx);
  ctx.restore();

  /* 빛: 등불 웅덩이와 가로등 원뿔 */
  ctx.globalCompositeOperation = 'lighter';
  const toS = (x, y) => [(x - camX) * zoom + shx, (y - camY) * zoom + shy];
  for (const L of WORLD.lights) {
    const s = toS(L.x, L.y); if (s[1] < -200 || s[1] > VH + 200) continue;
    const fl = 1 + Math.sin(G.t * 7 + L.x) * 0.04, r = L.r * zoom * fl * (1 + G.dark);
    FX.glow(ctx, s[0], s[1], r, L.c, (0.25 + G.dark * 0.9) * L.k);
    if (L.cone) { const gr = ctx.createLinearGradient(0, s[1], 0, s[1] + 90 * zoom); gr.addColorStop(0, 'rgba(' + L.c + ',' + (0.3 + G.dark * 0.4) + ')'); gr.addColorStop(1, 'rgba(' + L.c + ',0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(s[0] - 8 * zoom, s[1]); ctx.lineTo(s[0] + 8 * zoom, s[1]); ctx.lineTo(s[0] + 46 * zoom, s[1] + 90 * zoom); ctx.lineTo(s[0] - 46 * zoom, s[1] + 90 * zoom); ctx.closePath(); ctx.fill(); }
  }
  for (const f of WORLD.fires) { const s = toS(f.x, f.y); if (s[1] < -100 || s[1] > VH + 100) continue; FX.glow(ctx, s[0], s[1] - 10, 60 * zoom * f.s * (1 + Math.sin(G.t * 13 + f.x) * 0.1), '255,120,30', 0.7); FX.glow(ctx, s[0], s[1] - 14, 22 * zoom * f.s, '255,220,120', 0.9, 1); }
  const ps = toS(p.x, p.y - 40); FX.glow(ctx, ps[0], ps[1], 150, '255,230,190', 0.1 + G.dark * 0.25);
  ctx.globalCompositeOperation = 'source-over';
  /* 화면 가장자리 어둡게 */
  const vg = ctx.createRadialGradient(W / 2, VH * 0.55, VH * 0.3, W / 2, VH * 0.55, VH * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,4,14,' + (0.35 + G.dark * 0.4) + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, VH);
  /* 사당 공격받음: 붉은 테두리 */
  if (G.alertT > 0 || G.crisisT > 0 || (isNight() && G.shrine.hp < G.shrine.max * 0.25)) { const a = (0.35 + 0.25 * Math.sin(G.t * 10)) * (G.crisisT > 0 ? 1.5 : G.alertT > 0 ? 1 : 0.6); const rg = ctx.createRadialGradient(W / 2, VH / 2, VH * 0.35, W / 2, VH / 2, VH * 0.72); rg.addColorStop(0, 'rgba(255,0,0,0)'); rg.addColorStop(1, 'rgba(230,20,20,' + a + ')'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, VH); }
  if (G.flash) { ctx.fillStyle = 'rgba(' + G.flash.c + ',' + Math.min(0.6, G.flash.t * 1.6) + ')'; ctx.fillRect(0, 0, W, VH); }
  FX.drawNums(ctx, toS);
  drawHUD(day);
}

/* ---------- 화면 표시 ---------- */
function txt(s, x, y, size, col, align, stroke, sw) {
  ctx.font = '900 ' + size + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  if (stroke !== false) { ctx.lineWidth = sw || Math.max(3, size / 5); ctx.strokeStyle = stroke || '#0e1216'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function panel(x, y, w, h, r, fill, edge) { rrPath(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 3; ctx.stroke(); } }
function tealBtn(x, y, w, h) {
  rrPath(x, y + 4, w, h, 14); ctx.fillStyle = '#1f5a58'; ctx.fill();
  rrPath(x, y, w, h, 14); const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#9ef0e0'); gr.addColorStop(1, '#4cb8b0'); ctx.fillStyle = gr; ctx.fill();
  ctx.strokeStyle = '#123a3a'; ctx.lineWidth = 3; ctx.stroke();
}
function waveIcon(kind, x, y, r, cur, done) {
  circle(x, y, r + 3); ctx.fillStyle = cur ? '#ffe9a8' : 'rgba(0,0,0,.6)'; ctx.fill();
  const col = kind === 'boss' ? ['#ff7a5a', '#a01a1a'] : kind === 'elite' ? ['#ffc35a', '#b0601a'] : ['#c8a0ff', '#5a2a9a'];
  const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
  circle(x, y, r); ctx.fillStyle = done ? '#4a4a52' : gr; ctx.fill();
  ctx.fillStyle = '#fff';
  if (kind === 'elite') { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.45); ctx.lineTo(r * 0.45, -r * 0.45); ctx.moveTo(-r * 0.45, -r * 0.45); ctx.lineTo(r * 0.45, r * 0.45); ctx.stroke(); ctx.restore(); }
  else { circle(x, y - r * 0.1, r * 0.5); ctx.fill(); ctx.fillStyle = done ? '#4a4a52' : col[1]; circle(x - r * 0.2, y - r * 0.12, r * 0.13); ctx.fill(); circle(x + r * 0.2, y - r * 0.12, r * 0.13); ctx.fill(); if (kind === 'boss') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.35); ctx.lineTo(x - r * 0.35, y - r * 0.85); ctx.lineTo(x - r * 0.15, y - r * 0.45); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + r * 0.55, y - r * 0.35); ctx.lineTo(x + r * 0.35, y - r * 0.85); ctx.lineTo(x + r * 0.15, y - r * 0.45); ctx.fill(); } }
}
function drawHUD(day) {
  const p = G.player;
  /* 상단 어둡게 */
  const tg = ctx.createLinearGradient(0, 0, 0, 200); tg.addColorStop(0, 'rgba(6,8,12,.6)'); tg.addColorStop(1, 'rgba(6,8,12,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, 200);
  /* 일시정지 */
  tealBtn(20, 22, 66, 62); ctx.fillStyle = '#123a3a'; ctx.fillRect(41, 38, 8, 28); ctx.fillRect(57, 38, 8, 28); UI.pause = [20, 22, 66, 66];
  /* 경험치 막대 */
  panel(104, 34, 440, 40, 10, 'rgba(10,14,18,.88)', '#05080a');
  const xk = Math.min(1, p.xp / xpNeed(p.lv)); if (xk > 0) { rrPath(108, 38, Math.max(16, 432 * xk), 32, 8); const gr = ctx.createLinearGradient(0, 38, 0, 70); gr.addColorStop(0, '#9cf0e2'); gr.addColorStop(1, '#3aa89e'); ctx.fillStyle = gr; ctx.fill(); }
  panel(280, 8, 88, 32, 10, '#0e1418', null); txt('Lv.' + p.lv, 324, 25, 22, '#fff', 'center', false);
  /* 엽전 */
  circle(580, 54, 18); const cg = ctx.createRadialGradient(574, 48, 2, 580, 54, 18); cg.addColorStop(0, '#fff3b0'); cg.addColorStop(1, '#d89a10'); ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#7a5208'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#7a5208'; ctx.fillRect(575, 49, 10, 10);
  txt(String(G.gold), 610, 55, 28, '#fff', 'left');
  /* 둘째 줄: 시간, 웨이브 줄 */
  panel(20, 104, 120, 46, 10, 'rgba(10,14,18,.8)', null);
  const N = curN();
  let ts = day ? '준비' : '00:00';
  if (isNight() || G.phase === 'level') { const left = Math.max(0, Math.ceil(N.dur - G.time)); ts = G.time > N.dur && G.bossRef && !G.bossRef.dead ? '격파!' : '0' + Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2); }
  txt(ts, 80, 128, 26, day ? '#ffe3a0' : '#fff', 'center', false);
  const n = G.nights.length, gap = 64, x0 = 360 - (n - 1) * gap / 2 + 30;
  panel(x0 - 44, 102, (n - 1) * gap + 88, 52, 26, 'rgba(10,14,18,.75)', null);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap, cur = i === G.night, done = i < G.night;
    if (i) { ctx.fillStyle = done || cur ? '#ffd46a' : 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(x - gap / 2 - 5, 122); ctx.lineTo(x - gap / 2 + 5, 128); ctx.lineTo(x - gap / 2 - 5, 134); ctx.fill(); }
    waveIcon(G.nights[i].kind, x, 128, cur ? 19 : 15, cur, done);
    txt(String(i + 1), x + 12, 144, 15, '#fff', 'center');
    if (cur) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - 8, 96); ctx.lineTo(x + 8, 96); ctx.lineTo(x, 106); ctx.fill(); }
  }
  /* 챕터 이름 */
  panel(20, 160, 240, 34, 8, 'rgba(10,14,18,.55)', null); txt(G.ch + '. ' + G.C.name + (G.mode !== 'adventure' ? ' · ' + ({ challenge: '극한 도전', endless: '무한 방어선', gold: '엽전 던전', xp: '경험치 던전', boss: '우두머리 토벌' }[G.mode] || '') : ''), 30, 177, 18, '#ffe3a0', 'left', false);
  if (G.missions) G.missions.forEach((m, i) => { const ok = m.ok(); panel(20, 246 + i * 34, 300, 30, 8, 'rgba(10,14,18,.6)', null); txt((ok ? '★ ' : '☆ ') + m.n, 30, 261 + i * 34, 16, ok ? '#ffd84a' : '#ddd', 'left', false); });
  /* 오른쪽: 동료 얼굴, 가진 기술 */
  let ry = 210;
  for (const c of G.comps) {
    panel(626, ry - 34, 76, 76, 14, '#2a1e18', '#ffcf6a');
    ctx.save(); rrPath(629, ry - 31, 70, 70, 12); ctx.clip(); const C = COMP[c.id]; ctx.fillStyle = 'rgba(' + C.col + ',.35)'; ctx.fillRect(626, ry - 34, 76, 76); if (PORT[c.id]) { const im = PORT[c.id], s = 76 / Math.min(im.width, im.height); ctx.drawImage(im, 664 - im.width * s / 2, ry - 34, im.width * s, im.height * s); } else drawSprite(C.spr, 664, ry + 44, { h: 92 }); ctx.restore(); if (!c.active) { panel(626, ry - 34, 76, 76, 14, 'rgba(0,0,0,.6)', null); txt('본부 2', 664, ry + 4, 16, '#ffe08a', 'center', false); }
    ry += 88;
  }
  const own = Object.keys(G.sk).filter(k => SKILLS.find(s => s.id === k).kind === 'atk');
  for (const id of own) {
    { const im = G.evo && G.evo[id] ? (SKI['ev_' + id] || SKI[id]) : SKI[id]; if (im) { ctx.save(); rrPath(632, ry - 32, 64, 64, 14); ctx.clip(); const s = Math.max(64 / im.width, 64 / im.height); ctx.drawImage(im, 664 - im.width * s / 2, ry - im.height * s / 2, im.width * s, im.height * s); ctx.restore(); rrPath(632, ry - 32, 64, 64, 14); ctx.strokeStyle = G.evo && G.evo[id] ? '#ffd34a' : '#c9a24a'; ctx.lineWidth = G.evo && G.evo[id] ? 4 : 2.5; ctx.stroke(); } else ctx.drawImage(skillIcon(id, 64), 632, ry - 32, 64, 64); }
    circle(690, ry + 22, 13); ctx.fillStyle = '#123a3a'; ctx.fill(); ctx.strokeStyle = '#9ef0e0'; ctx.lineWidth = 2; ctx.stroke(); txt(String(G.sk[id]), 690, ry + 23, 16, '#fff', 'center', false);
    ry += 74;
  }
  /* 우두머리 체력 */
  const boss = G.bossRef && !G.bossRef.dead ? G.bossRef : null;
  if (boss) {
    panel(90, 202, 540, 66, 14, 'rgba(10,6,8,.9)', '#8a1a1a');
    waveIcon('boss', 122, 236, 26, false, false);
    txt(EN[boss.type].n + (boss.enr ? ' · 분노' : ''), 372, 220, 26, boss.enr ? '#ff7a5a' : '#ffcfb0', 'center');
    hpBar(156, 238, 452, 20, boss.hp / boss.max, boss.hp < boss.max * 0.5 ? '#ff3a1a' : '#e8322a');
  }
  if (isNight() || G.phase === 'level') {
    /* 큰 기술 */
    const ux = 560, uy = 1040, us = 136;
    rrPath(ux, uy + 6, us, us, 22); ctx.fillStyle = '#1a0e08'; ctx.fill();
    rrPath(ux, uy, us, us, 22); const ug = ctx.createLinearGradient(0, uy, 0, uy + us); ug.addColorStop(0, '#ff8a4a'); ug.addColorStop(1, '#8a1a10'); ctx.fillStyle = ug; ctx.fill(); ctx.strokeStyle = G.ult <= 0 ? '#ffe9a0' : '#2a1208'; ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); rrPath(ux + 4, uy + 4, us - 8, us - 8, 18); ctx.clip(); drawSprite(G.pkey || 'player', ux + us / 2, uy + us + 50, { h: 190 });
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + G.t; ctx.strokeStyle = 'rgba(255,220,140,.25)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(ux + us / 2, uy + us / 2); ctx.lineTo(ux + us / 2 + Math.cos(a) * 120, uy + us / 2 + Math.sin(a) * 120); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    if (G.ult > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(ux, uy, us, us * (G.ult / G.ultMax)); ctx.restore(); txt(String(Math.ceil(G.ult)), ux + us / 2, uy + us / 2, 54, '#fff'); }
    else { ctx.restore(); const a = 0.5 + 0.5 * Math.sin(G.t * 6); rrPath(ux - 4, uy - 4, us + 8, us + 8, 26); ctx.strokeStyle = 'rgba(255,230,140,' + a + ')'; ctx.lineWidth = 5; ctx.stroke(); }
    txt('처용 진노', ux + us / 2, uy + us - 12, 18, '#fff');
    UI.ult = [ux, uy, us, us];
    /* 동료 기술 */
    if (G.comps.length) {
      const cx = 586, cy = 912, cs = 104, C = COMP[G.comps[0].id];
      rrPath(cx, cy + 5, cs, cs, 18); ctx.fillStyle = '#10141a'; ctx.fill();
      rrPath(cx, cy, cs, cs, 18); const cg2 = ctx.createLinearGradient(0, cy, 0, cy + cs); cg2.addColorStop(0, 'rgb(' + C.col + ')'); cg2.addColorStop(1, '#2a2a40'); ctx.fillStyle = cg2; ctx.fill(); ctx.strokeStyle = G.cult <= 0 ? '#ffe9a0' : '#101018'; ctx.lineWidth = 4; ctx.stroke();
      ctx.save(); rrPath(cx + 3, cy + 3, cs - 6, cs - 6, 15); ctx.clip(); if (PORT[G.comps[0].id]) { const im = PORT[G.comps[0].id], s = cs / Math.min(im.width, im.height); ctx.drawImage(im, cx + cs / 2 - im.width * s / 2, cy, im.width * s, im.height * s); } else drawSprite(C.spr, cx + cs / 2, cy + cs + 30, { h: 130 });
      if (G.cult > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(cx, cy, cs, cs * (G.cult / G.cultMax)); }
      ctx.restore();
      if (G.cult > 0) txt(String(Math.ceil(G.cult)), cx + cs / 2, cy + cs / 2, 42, '#fff');
      txt(C.ult, cx + cs / 2, cy + cs - 10, 15, '#fff');
      UI.cult = [cx, cy, cs, cs];
    } else UI.cult = null;
    /* 자동 */
    rrPath(616, 1196, 90, 54, 14); ctx.fillStyle = G.auto ? '#4cb8b0' : 'rgba(20,30,34,.85)'; ctx.fill(); ctx.strokeStyle = '#9ef0e0'; ctx.lineWidth = 3; ctx.stroke();
    txt('자동', 661, 1223, 22, G.auto ? '#082020' : '#9ef0e0', 'center', false);
    UI.auto = [616, 1196, 90, 54];
    rrPath(516, 1196, 90, 54, 14); ctx.fillStyle = G.speed2 ? '#ffb03a' : 'rgba(20,30,34,.85)'; ctx.fill(); ctx.strokeStyle = '#ffd88a'; ctx.lineWidth = 3; ctx.stroke(); txt('x2', 561, 1223, 24, G.speed2 ? '#3a1a00' : '#ffd88a', 'center', false); UI.spd = [516, 1196, 90, 54];
    rrPath(20, 200, 120, 38, 10); ctx.fillStyle = G.low ? '#4cb8b0' : 'rgba(10,14,18,.6)'; ctx.fill(); txt(G.low ? '원활 모드 켬' : '원활 모드', 80, 220, 17, G.low ? '#082020' : '#cfe', 'center', false); UI.low = [20, 200, 120, 38];
  if (G.chEl && D.EL[G.chEl.el]) { const E = D.EL[G.chEl.el], s2 = '약점 · ' + E.n + ' +' + Math.round(G.chEl.k * 100) + '%', yy = G.obj && !day ? 286 : 248; ctx.font = '900 16px ' + FONT; const w2 = ctx.measureText(s2).width + 44; panel(20, yy, w2, 30, 9, 'rgba(10,14,18,.62)', E.c); circle(38, yy + 15, 8); ctx.fillStyle = E.c; ctx.fill(); txt(s2, 52, yy + 16, 16, E.c, 'left', false); }
  if (G.obj && !day) { const s = objText(); ctx.font = '900 17px ' + FONT; const w = Math.min(420, ctx.measureText(s).width + 30); panel(20, 248, w, 32, 9, 'rgba(10,14,18,.62)', G.obj.enr || (G.obj.beacon && G.obj.beacon.hp < G.obj.beacon.max * 0.3) ? '#ff5a3a' : 'rgba(255,211,107,.5)'); txt(s, 34, 265, 17, '#ffe3a0', 'left', false); }
  if (G.crisisT > 0 && !day) { const a = Math.min(1, G.crisisT * 1.5), sc = 1 + 0.06 * Math.sin(G.t * 12); ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 330); ctx.scale(sc, sc); txt('사당이 위험하다!', 0, 0, 52, '#ff5a46', 'center', '#2a0606', 10); ctx.restore(); }
  } else { UI.ult = UI.cult = UI.auto = UI.spd = UI.low = null; }
  /* 낮 안내 */
  if (day) {
    panel(150, 216, 420, 48, 24, 'rgba(10,14,18,.75)', null);
    txt('돌판으로 걸어가 시설을 세우세요', 360, 240, 21, '#ffe3a0', 'center', false);
  }
  /* 말풍선 */
  if (G.bubble && G.comps.length) {
    const a = Math.min(1, G.bubble.t * 3), C = COMP[G.comps[0].id]; ctx.globalAlpha = a;
    panel(24, 1010, 100, 100, 50, 'rgba(' + C.col + ',.9)', '#fff'); if (!drawPort(G.comps[0].id, 74, 1060, 46, '#fff')) { ctx.save(); circle(74, 1060, 46); ctx.clip(); drawSprite(C.spr, 74, 1130, { h: 120 }); ctx.restore(); }
    /* 긴 말은 상자 안에서 줄을 바꾼다 (최대 3줄) */
    const BW = 470, fs0 = 22; ctx.font = '800 ' + fs0 + 'px ' + FONT; const words = String(G.bubble.s).split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > BW - 36 && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); if (lines.length > 3) { lines.length = 3; lines[2] += '…'; }
    const BH = 26 + lines.length * 28, by0 = 1060 - BH / 2;
    panel(120, by0, BW, BH, 16, '#fffaf0', '#3a2a1a'); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.moveTo(122, 1050); ctx.lineTo(104, 1062); ctx.lineTo(122, 1066); ctx.fill();
    lines.forEach((l, i) => txt(l, 120 + BW / 2, by0 + 27 + i * 28, fs0, '#2a1a10', 'center', false));
    ctx.globalAlpha = 1;
  }
  /* 경고 띠 */
  if (G.banner) {
    const B = G.banner, age = (B.kind === 'boss' ? 2.8 : 2.4) - B.t, slide = Math.min(1, age * 5), a = Math.min(1, B.t * 3), by = 430;
    ctx.globalAlpha = a; ctx.save(); ctx.translate((1 - slide) * W, 0);
    const col = B.kind === 'boss' ? '160,20,20' : B.kind === 'win' ? '200,150,30' : '200,110,20';
    const bg = ctx.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, 'rgba(' + col + ',0)'); bg.addColorStop(0.15, 'rgba(' + col + ',.92)'); bg.addColorStop(0.85, 'rgba(' + col + ',.92)'); bg.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = bg; ctx.fillRect(0, by - 46, W, 92);
    ctx.fillStyle = 'rgba(255,230,160,.8)'; ctx.fillRect(60, by - 48, W - 120, 3); ctx.fillRect(60, by + 45, W - 120, 3);
    if (B.kind !== 'win') { ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(110, by - 34); ctx.lineTo(146, by + 30); ctx.lineTo(74, by + 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a1a00'; ctx.lineWidth = 4; ctx.stroke(); txt('!', 110, by + 10, 40, '#3a1a00', 'center', false); }
    txt(B.s, 380, by + 2, 40, '#fff6d8', 'center', '#2a0a00', 8);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  /* 큰 제목 */
  if (G.title) {
    const T = G.title, age = (T.big ? 2.4 : 2.2) - T.t, sc = age < 0.2 ? 1.6 - age / 0.2 * 0.6 : 1, a = Math.min(1, T.t * 2.5);
    ctx.globalAlpha = a; ctx.save(); ctx.translate(W / 2, 560); ctx.scale(sc, sc);
    const tb = ctx.createLinearGradient(-W / 2, 0, W / 2, 0); tb.addColorStop(0, 'rgba(0,0,0,0)'); tb.addColorStop(0.5, 'rgba(0,0,0,.55)'); tb.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = tb; ctx.fillRect(-W / 2, -70, W, 140);
    { let fsz = T.big ? 84 : 66; ctx.font = '900 ' + fsz + 'px ' + FONT; const mw = ctx.measureText(T.s).width; if (mw > W - 60) fsz = Math.floor(fsz * (W - 60) / mw);
      txt(T.s, 0, -10, fsz, T.big ? (G.phase === 'win' ? '#ffe070' : '#ff8a7a') : (G.nm && /악몽/.test(T.s) ? '#ff8a7a' : '#ffffff'), 'center', '#1a0e06', 10); }
    if (T.sub) { /* 부제: ' · 약점'은 둘째 줄로, 폭이 넘치면 글씨를 줄인다 */ const parts = String(T.sub).split(' · 약점 '), L = [parts[0]].concat(parts[1] ? ['약점 ' + parts[1]] : []); L.forEach((s, i) => { let fz = 26; ctx.font = '900 ' + fz + 'px ' + FONT; while (fz > 15 && ctx.measureText(s).width > 640) { fz -= 1; ctx.font = '900 ' + fz + 'px ' + FONT; } txt(s, 0, 48 + i * 32, fz, i ? '#9ff0ff' : '#ffe3a0', 'center'); }); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  /* 영웅 컷인 */
  if (G.cutin) {
    const c = G.cutin, k = 1 - c.t / c.life, slide = Math.min(1, k * 4), out = k > 0.8 ? (k - 0.8) * 5 : 0;
    ctx.fillStyle = 'rgba(0,0,0,' + 0.45 * (1 - out) + ')'; ctx.fillRect(0, 0, W, VH);
    ctx.save(); ctx.translate(-W * (1 - slide) + out * W, 0);
    ctx.fillStyle = 'rgba(' + c.col + ',.95)'; ctx.beginPath(); ctx.moveTo(0, 440); ctx.lineTo(W, 380); ctx.lineTo(W, 700); ctx.lineTo(0, 760); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = rnd(2, 6); const y = rnd(400, 740); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y - 60); ctx.stroke(); } ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, 440); ctx.lineTo(W, 380); ctx.lineTo(W, 700); ctx.lineTo(0, 760); ctx.closePath(); ctx.clip();
    if (c.who !== 'player' && PORT[c.who]) { const im = PORT[c.who], s = 560 / im.height; ctx.drawImage(im, 220 - im.width * s / 2, 380, im.width * s, im.height * s); } else drawSprite(c.who === 'player' ? (G.pkey || 'player') : COMP[c.who].spr, 220, 980, { h: 560 });
    ctx.restore();
    txt(c.name + '!', 500, 560, 64, '#fff', 'center', '#2a0a00', 10);
    ctx.restore();
  }
  /* 조이스틱 */
  if (joy.on) {
    circle(joy.ox, joy.oy, 70); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke();
    circle(joy.ox + joy.dx * 60, joy.oy + joy.dy * 60, 34); const jg = ctx.createRadialGradient(joy.ox + joy.dx * 60 - 8, joy.oy + joy.dy * 60 - 8, 2, joy.ox + joy.dx * 60, joy.oy + joy.dy * 60, 34); jg.addColorStop(0, '#ffffff'); jg.addColorStop(1, '#b8c0c8'); ctx.fillStyle = jg; ctx.fill();
  } else if (isNight() && !G.auto) { circle(360, 1150, 60); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.stroke(); circle(360, 1150, 28); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); }
}

/* ---------- 입력 ---------- */
function spos(ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * VH }; }
const inR = (q, R) => R && q.x >= R[0] && q.x <= R[0] + R[2] && q.y >= R[1] && q.y <= R[1] + R[3];
cv.addEventListener('pointerdown', ev => {
  if (!G) return; ev.preventDefault();
  const q = spos(ev);
  if (inR(q, UI.pause)) return pause(true);
  if (inR(q, UI.ult)) return useUlt();
  if (inR(q, UI.cult)) return useCult();
  if (inR(q, UI.auto)) { G.auto = !G.auto; return; }
  if (inR(q, UI.spd)) { G.speed2 = !G.speed2; return; }
  if (inR(q, UI.low)) { G.low = !G.low; FX.low = G.low; return; }
  if (G.phase === 'night' || G.phase === 'day') { joy.on = true; joy.id = ev.pointerId; joy.ox = q.x; joy.oy = q.y; joy.dx = 0; joy.dy = 0; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} }
});
cv.addEventListener('pointermove', ev => {
  if (!joy.on || ev.pointerId !== joy.id) return;
  const q = spos(ev); let dx = (q.x - joy.ox) / 60, dy = (q.y - joy.oy) / 60;
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  joy.dx = dx; joy.dy = dy;
});
const joyEnd = ev => { if (ev.pointerId === joy.id) joy.on = false; };
cv.addEventListener('pointerup', joyEnd); cv.addEventListener('pointercancel', joyEnd);
addEventListener('keydown', e => { keys[e.key] = true; if (e.key.indexOf('Arrow') === 0) e.preventDefault(); if (e.key === ' ' || e.key === 'q') useUlt(); if (e.key === 'e') useCult(); });
addEventListener('keyup', e => { keys[e.key] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.on = false; });
let paused = false;
function pause(on) { if (!G) return; paused = on; $('ovPause').classList.toggle('on', on); joy.on = false; }
$('btnResume').addEventListener('click', () => pause(false));
$('btnQuit').addEventListener('click', () => { pause(false); if (G) { G.phase = 'lose'; G.endT = 0; G.title = null; } });
$('btnSfx').addEventListener('click', ev => { sfxOn = !sfxOn; bgmOn = sfxOn; ev.currentTarget.textContent = sfxOn ? '소리 켬' : '소리 끔'; if (!bgmOn) setBgm(''); });
$('btnRetry').addEventListener('click', () => { $('ovEnd').classList.remove('on'); newGame(G ? G.cfg : {}); });

/* ---------- 루프 ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G && !paused && G.phase !== 'level' && G.phase !== 'guard') update(dt);
  else if (G && G.phase === 'guard') { FX.update(dt); }
  if (G && stage.style.display !== 'none') { setBgm(G.phase === 'win' || G.phase === 'lose' ? '' : (G.phase === 'day' || G.phase === 'guard') ? 'bgm_lobby' : (G.bossRef && !G.bossRef.dead ? 'bgm_boss' : 'bgm_battle')); draw(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- 바깥과 잇는 창구 ---------- */
const JZB = window.JZB = {
  buildWalls,
  start: cfg => { newGame(cfg); try { newBuildIntro(); } catch (e) {} },
  hide: () => { stage.style.display = 'none'; setBgm(''); G = null; },
  onEnd: defaultEnd,
  CHAPTERS: D.CHAPTERS.map(c => ({ n: c.n, name: c.name, theme: c.theme, waves: c.nights })),
  /* 시험용 */
  get G() { return G; }, startNight, pickSkill, build, useUlt, useCult, spawnBig, openLevel, levelChoices
};
const defaultEndRef = defaultEnd;
/* 새 건물이 열린 장을 처음 시작할 때 소개 창 */
function newBuildIntro() {
  if (!G || G.nm || !D.TUR_UNLOCK) return; let seen = {}; try { seen = JSON.parse(localStorage.getItem('kz_bseen') || '{}'); } catch (e) {}
  const ks = Object.keys(D.TUR_UNLOCK).filter(k => D.TUR_UNLOCK[k] > 1 && D.TUR_UNLOCK[k] <= G.ch && !seen[k]); if (!ks.length) return;
  for (const k of ks) seen[k] = 1; try { localStorage.setItem('kz_bseen', JSON.stringify(seen)); } catch (e) {}
  const show = ks.filter(k => D.TUR_UNLOCK[k] === G.ch).concat(ks.filter(k => D.TUR_UNLOCK[k] !== G.ch)).slice(0, 3);
  const box = document.createElement('div'); box.id = 'kzNewB';
  box.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55)';
  box.innerHTML = '<div style="width:min(86vw,420px);background:linear-gradient(#2a2a4a,#151528);border:3px solid #e8c868;border-radius:20px;padding:18px;color:#fff;text-align:center;font-family:inherit;box-shadow:0 10px 30px rgba(0,0,0,.6)">' +
    '<div style="font-size:24px;font-weight:900;color:#ffe08a;margin-bottom:10px">새 건물이 열렸어요!</div>' +
    show.map(k => '<div style="display:flex;gap:12px;align-items:center;text-align:left;margin:8px 0;background:rgba(255,255,255,.06);border-radius:14px;padding:8px"><div style="flex:0 0 72px;height:72px;background:#f4e6c0 url(sprites/' + TUR[k].spr + '.png) center/contain no-repeat;border-radius:10px"></div><div><b style="font-size:19px">' + TUR[k].name + '</b><div style="font-size:15px;color:#dfe6ff;line-height:1.35">' + TUR[k].d + '</div></div></div>').join('') +
    '<div id="kzNewBok" style="margin-top:12px;display:inline-block;padding:10px 40px;border-radius:14px;background:linear-gradient(#ffe48a,#f2b63a);color:#3a1a00;font-weight:900;font-size:20px;cursor:pointer">확인</div></div>';
  document.body.appendChild(box); const close = () => box.remove(); box.querySelector('#kzNewBok').addEventListener('click', close); setTimeout(() => { if (box.parentNode) close(); }, 12000);
}
$('btnStart').addEventListener('click', () => { const ch = +($('selCh').value || 1); newGame({ chapter: ch, companions: ['dokkaebi', 'samjoko'] }); });
setTimeout(() => { if (!window.JZMETA) $('ovTitle').classList.add('on'); }, 0);
})();
