/* 처용야행 배경: 챕터마다 다른 땅, 가장자리 소품, 등불, 떠다니는 입자 */
(function () {
'use strict';
const D = window.JZD, FX = window.JZFX;
const W = D.WW || D.W, H = D.H, CX = D.CX || 360, WALL_Y = D.WALL_Y, SH = D.SHRINE, LANE_X = D.LANE_X;
const TAU = Math.PI * 2;
const TH = {
  village:    { base: '#86b553', hi: '178,214,104', lo: '98,152,66', dirt: '228,198,134', edge: '24,60,30', tree: 'pine', amb: 'firefly', props: ['house', 'haystack', 'cart', 'jars', 'fence', 'sotdae', 'rubble', 'sheaf'], light: '255,180,80' },
  market:     { base: '#b9a57c', hi: '214,198,150', lo: '150,128,90', dirt: '200,176,130', edge: '50,36,20', tree: 'pine', amb: 'dust', props: ['stall', 'crate', 'jars', 'cart', 'lanterns', 'rubble', 'fence'], light: '255,150,80', paving: 1 },
  snow:       { base: '#dce6ee', hi: '250,252,255', lo: '178,196,214', dirt: '160,150,140', edge: '60,80,110', tree: 'snowpine', amb: 'snow', props: ['house', 'rock', 'fence', 'sotdae', 'cart', 'icerock'], light: '255,190,110', snowy: 1 },
  burning:    { base: '#6f5a46', hi: '140,110,80', lo: '60,44,34', dirt: '120,96,74', edge: '30,10,6', tree: 'deadtree', amb: 'ember', props: ['ruin', 'fire', 'rubble', 'crate', 'banner', 'cart'], light: '255,110,40', burning: 1 },
  ferry:      { base: '#7d8c5c', hi: '150,170,110', lo: '80,96,60', dirt: '150,130,96', edge: '20,40,40', tree: 'willow', amb: 'fog', props: ['boat', 'reeds', 'dock', 'jars', 'rock', 'lamppost'], light: '255,200,120', water: 1 },
  fortress:   { base: '#8f8d76', hi: '170,166,140', lo: '96,94,80', dirt: '170,150,116', edge: '30,30,26', tree: 'pine', amb: 'dust', props: ['brokenwall', 'banner', 'rack', 'rock', 'rubble', 'crate'], light: '255,170,80' },
  seowon:     { base: '#5d6a58', hi: '110,130,104', lo: '48,58,50', dirt: '130,126,104', edge: '10,20,30', tree: 'bamboo', amb: 'ghost', props: ['stonelamp', 'bamboo', 'rock', 'house', 'fence'], light: '140,200,255', ghost: 1 },
  frozen:     { base: '#b9c9d9', hi: '232,240,250', lo: '140,160,186', dirt: '150,160,176', edge: '40,60,100', tree: 'snowpine', amb: 'snow', props: ['palacewall', 'icerock', 'stonelamp', 'rock'], light: '200,230,255', snowy: 1, tiles: 1 },
  hwangcheon: { base: '#4d3b4d', hi: '110,70,100', lo: '40,26,40', dirt: '120,60,70', edge: '20,0,20', tree: 'deadtree', amb: 'ghost', props: ['lily', 'lantern', 'rock', 'ruin'], light: '255,90,120', water: 2, ghost: 1 },
  palace:     { base: '#a39785', hi: '196,186,166', lo: '120,110,96', dirt: '150,136,116', edge: '30,10,40', tree: 'pine', amb: 'miasma', props: ['pillar', 'stonelamp', 'marker', 'banner'], light: '255,170,90', tiles: 1 }
};
const JZW = window.JZW = { TH };
/* TOON_PROPS(11-26): 만화체 소품 그림. 못 불러오면 기존 코드 그림을 쓴다 */
const PIMG = {}; JZW.PIMG = PIMG; ['house_a', 'house_b', 'tilewall', 'fence', 'cart', 'jars', 'willow', 'pine', 'bamboo', 'rock_a', 'rock_b', 'boat', 'lantern', 'dock', 'grass_a', 'grass_b', 'floor_tile', 'haystack', 'jangseung'].forEach(k => { const im = new Image(); im.onload = () => { PIMG[k] = im; }; im.src = 'sprites/props/' + k + '.png?v=1'; });

JZW.build = function (theme, LAY) {
  const LANES = (LAY && LAY.lanes) || LANE_X;
  const T = TH[theme] || TH.village, GS = 1;
  /* WIDE_MAP: 둘레 여백(멀리서 내려다보는 넓은 맵) */ const MX = 340, MT = 660, MB = 320; const cv = document.createElement('canvas'); cv.width = (W + 2 * MX) * GS; cv.height = (H + MT + MB) * GS;
  const g = cv.getContext('2d'); g.setTransform(GS, 0, 0, GS, MX * GS, MT * GS);
  let seed = 20261124 + theme.length * 77;
  const R = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const rr = (a, b) => a + R() * (b - a);
  const blob = (x, y, r, col, al) => { const gr = g.createRadialGradient(x, y, r * 0.1, x, y, r); gr.addColorStop(0, 'rgba(' + col + ',' + al + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  const ell = (x, y, rx, ry, col, rot) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); g.fill(); };
  const rrect = (x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); };
  const shadow = (x, y, rx, ry, a) => ell(x, y, rx, ry, 'rgba(20,18,14,' + (a || 0.32) + ')');
  const lights = [], fires = [];

  /* 바탕 */
  g.fillStyle = T.base; g.fillRect(-MX, -MT, W + 2 * MX, H + MT + MB);
  for (let i = 0; i < 340; i++) blob(rr(-MX, W + MX), rr(-MT, H + MB), rr(70, 190), R() < 0.5 ? T.hi : T.lo, rr(0.2, 0.45));
  /* 물길 */
  if (T.water) {
    const wc = T.water === 2 ? ['120,20,40', '200,60,80'] : ['40,90,110', '120,190,200'];
    for (const side of [0, 1]) {
      const x0 = side ? W + 20 : -90;   /* 강은 판 바깥 가장자리 */
      const gr = g.createLinearGradient(side ? W + 120 : -120, 0, side ? W + 6 : -6, 0);
      gr.addColorStop(0, 'rgba(' + wc[0] + ',1)'); gr.addColorStop(0.75, 'rgba(' + wc[0] + ',.85)'); gr.addColorStop(1, 'rgba(' + wc[0] + ',0)');
      g.fillStyle = gr; g.fillRect(side ? W : -120, -MT, 120, H + MT + MB);
      g.strokeStyle = 'rgba(' + wc[1] + ',.35)'; g.lineWidth = 2;
      for (let y = -MT + 20; y < H + MB; y += rr(30, 60)) { const x = x0 + rr(8, 50); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 22, y); g.stroke(); }
    }
  }
  /* 돌바닥 무늬 */
  if (T.tiles || T.paving) {
    g.strokeStyle = 'rgba(60,50,40,' + (T.tiles ? 0.22 : 0.12) + ')'; g.lineWidth = 2;
    const s = T.tiles ? 64 : 46;
    for (let y = 0; y < H; y += s) for (let x = (y / s % 2) * s / 2 - s; x < W; x += s) { if (R() < (T.tiles ? 0.9 : 0.35)) { g.strokeRect(x + 2, y + 2, s - 4, s - 4); if (R() < 0.3) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 4, y + 4, s - 8, s - 8); } } }
  }
  /* 옅은 돌판 격자(판 전체, 아주 연하게) */ if (!T.tiles && !T.paving) { g.strokeStyle = 'rgba(40,30,20,.06)'; g.lineWidth = 2; const s2 = 76; for (let y = 0; y < H; y += s2) for (let x = 0; x < W; x += s2) if (R() < 0.55) g.strokeRect(x + 3, y + 3, s2 - 6, s2 - 6); }
  /* 밟혀서 드러난 길 세 갈래, 본진 둘레 */
  const dirt = (x, y, r) => blob(x + rr(-16, 16), y + rr(-16, 16), r * rr(0.8, 1.3), T.dirt, rr(0.4, 0.75));
  for (let l = 0; l < LANES.length; l++) for (let t = 0; t <= 1; t += 0.011) { const k = t * t * (3 - 2 * t), x = LANES[l] + (CX - LANES[l]) * k * k, y = -40 + t * (WALL_Y + 40); dirt(x + Math.sin(t * 9 + l * 2) * 16, y, 44); }
  for (let l = 0; l < LANES.length; l++) for (let y = -MT; y < -30; y += 13) dirt(LANES[l] + Math.sin(y * 0.02 + l) * 10, y, 46);   /* 길 입구(판 위 여백) */
  for (let i = 0; i < 80; i++) { const a = rr(0, TAU), d = Math.sqrt(R()); dirt(SH.x + Math.cos(a) * d * 400, SH.y + Math.sin(a) * d * 240, 72); }
  for (let x = 96; x <= W - 96; x += 20) dirt(x, WALL_Y - 30, 30);
  /* 수레바퀴 자국 */
  g.strokeStyle = 'rgba(60,44,30,.16)'; g.lineWidth = 3;
  for (let l = 0; l < LANES.length; l++) for (const o of [-12, 12]) { g.beginPath(); for (let t = 0; t <= 1; t += 0.02) { const k = t * t * (3 - 2 * t), x = LANES[l] + (CX - LANES[l]) * k * k + o + Math.sin(t * 9 + l * 2) * 16, y = -40 + t * (WALL_Y + 40); t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }

  /* 좀비가 오는 길: 붉은 화살표 */
  for (let l = 0; l < LANES.length; l++) for (let t = 0.04; t < 0.97; t += 0.035) {
    const a = D.lanePt(LANES[l], t, l), b = D.lanePt(LANES[l], t + 0.01, l), an = Math.atan2(b.y - a.y, b.x - a.x);
    g.save(); g.translate(a.x, a.y); g.rotate(an); g.strokeStyle = 'rgba(200,40,40,' + (0.28 + 0.18 * Math.sin(t * 20)) + ')'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-7, -9); g.lineTo(3, 0); g.lineTo(-7, 9); g.stroke(); g.restore();
  }
  /* 풀포기, 잔돌, 잎 */
  const grassC = T.snowy ? ['rgba(255,255,255,.8)', 'rgba(170,190,210,.8)'] : T.burning ? ['rgba(60,40,30,.7)', 'rgba(120,80,50,.6)'] : ['rgba(66,128,52,.85)', 'rgba(204,232,124,.75)'];
  for (let i = 0; i < 90; i++) { const x = rr(10, W - 10), y = rr(10, H - 10); g.strokeStyle = R() < 0.5 ? grassC[0] : grassC[1]; g.lineWidth = 2; g.lineCap = 'round'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 3, y); g.lineTo(x + k * 6, y - rr(6, 11)); g.stroke(); } }
  for (let i = 0; i < 40; i++) { const x = rr(10, W - 10), y = rr(10, H - 10), r = rr(3, 8); shadow(x + 1, y + r * 0.5, r * 1.2, r * 0.5, 0.25); ell(x, y, r, r * 0.7, R() < 0.5 ? '#8d8672' : '#7a7566'); ell(x - r * 0.25, y - r * 0.2, r * 0.45, r * 0.3, 'rgba(255,255,255,.18)'); }
  if (!T.snowy && !T.tiles) for (let i = 0; i < 30; i++) { const x = rr(10, W - 10), y = rr(10, H - 10); const c = T.burning ? ['#2a201a', '#4a3020'] : ['#e8d070', '#f0a0b0', '#ffffff']; ell(x, y, 2.4, 2.4, c[(R() * c.length) | 0]); }

  /* ---------- 소품 그리기 ---------- */
  const snowCap = (x, y, w) => { if (!T.snowy) return; ell(x, y, w, w * 0.32, 'rgba(250,252,255,.95)'); };
  const P = {
    pine: (x, y, s) => { shadow(x + 6, y + 6, 28 * s, 10 * s); rrect(x - 4 * s, y - 14 * s, 8 * s, 18 * s, 3, '#5d4634'); for (let i = 0; i < 3; i++) { const w = (30 - i * 7) * s, yy = y - (14 + i * 20) * s; g.fillStyle = i === 2 ? '#4fae68' : '#2f8450'; g.beginPath(); g.moveTo(x - w, yy); g.quadraticCurveTo(x, yy - 44 * s, x + w, yy); g.quadraticCurveTo(x, yy + 12 * s, x - w, yy); g.fill(); } ell(x - 7 * s, y - 50 * s, 6 * s, 12 * s, 'rgba(200,240,170,.30)', 0.3); },
    snowpine: (x, y, s) => { shadow(x + 6, y + 6, 28 * s, 10 * s, 0.22); rrect(x - 4 * s, y - 14 * s, 8 * s, 18 * s, 3, '#5d4634'); for (let i = 0; i < 3; i++) { const w = (30 - i * 7) * s, yy = y - (14 + i * 20) * s; g.fillStyle = '#3d6e66'; g.beginPath(); g.moveTo(x - w, yy); g.quadraticCurveTo(x, yy - 44 * s, x + w, yy); g.quadraticCurveTo(x, yy + 12 * s, x - w, yy); g.fill(); g.fillStyle = '#f4f8ff'; g.beginPath(); g.moveTo(x - w * 0.8, yy - 6 * s); g.quadraticCurveTo(x, yy - 42 * s, x + w * 0.7, yy - 8 * s); g.quadraticCurveTo(x, yy - 14 * s, x - w * 0.8, yy - 6 * s); g.fill(); } },
    deadtree: (x, y, s) => { shadow(x + 6, y + 4, 22 * s, 8 * s); g.strokeStyle = '#2e241e'; g.lineCap = 'round'; g.lineWidth = 7 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2 * s, y - 60 * s); g.stroke(); g.lineWidth = 3.5 * s; for (let i = 0; i < 5; i++) { const yy = y - (24 + i * 8) * s, d = (i % 2 ? 1 : -1); g.beginPath(); g.moveTo(x + 1, yy); g.lineTo(x + d * rr(14, 24) * s, yy - rr(10, 20) * s); g.stroke(); } },
    willow: (x, y, s) => { shadow(x + 6, y + 6, 30 * s, 10 * s); rrect(x - 4 * s, y - 30 * s, 8 * s, 32 * s, 3, '#5a4a36'); ell(x, y - 48 * s, 34 * s, 26 * s, '#5c8a44'); g.strokeStyle = 'rgba(120,170,80,.9)'; g.lineWidth = 2; for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(x + i * 6 * s, y - 50 * s); g.quadraticCurveTo(x + i * 7 * s, y - 30 * s, x + i * 6.5 * s, y - 12 * s); g.stroke(); } },
    bamboo: (x, y, s) => { shadow(x + 4, y + 4, 24 * s, 8 * s); for (let i = 0; i < 5; i++) { const xx = x + (i - 2) * 7 * s, h = rr(70, 110) * s; g.strokeStyle = i % 2 ? '#5e9a4a' : '#78b05a'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + rr(-6, 6), y - h); g.stroke(); g.strokeStyle = 'rgba(30,60,20,.5)'; g.lineWidth = 1.5; for (let k = 20; k < h; k += 20) { g.beginPath(); g.moveTo(xx - 3, y - k); g.lineTo(xx + 3, y - k); g.stroke(); } ell(xx + 8, y - h + 6, 10 * s, 3 * s, '#6aa850', -0.5); } },
    house: (x, y, tile) => { tile = tile == null ? R() < 0.5 : tile; shadow(x + 8, y + 8, 68, 18); rrect(x - 50, y - 44, 100, 48, 8, tile ? '#8f8674' : '#9a8466'); rrect(x - 12, y - 30, 22, 34, 3, '#3b3228'); rrect(x - 40, y - 34, 18, 14, 2, T.ghost ? '#a0d8ff' : '#ffd88a'); g.fillStyle = tile ? '#4a4d55' : '#b39b63'; g.beginPath(); g.moveTo(x - 66, y - 38); g.quadraticCurveTo(x, y - 104, x + 66, y - 38); g.quadraticCurveTo(x, y - 24, x - 66, y - 38); g.fill(); g.strokeStyle = tile ? 'rgba(30,32,38,.5)' : 'rgba(120,96,52,.6)'; g.lineWidth = 2; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * 16, y - 34); g.lineTo(x + i * 9, y - 78 + Math.abs(i) * 9); g.stroke(); } if (T.snowy) { g.fillStyle = '#f6f9ff'; g.beginPath(); g.moveTo(x - 58, y - 46); g.quadraticCurveTo(x, y - 106, x + 58, y - 46); g.quadraticCurveTo(x, y - 70, x - 58, y - 46); g.fill(); } lights.push({ x: x - 31, y: y - 27, r: 46, c: T.ghost ? '140,200,255' : '255,200,110', k: 0.5 }); },
    ruin: (x, y) => { shadow(x + 8, y + 8, 64, 16); rrect(x - 48, y - 30, 30, 34, 4, '#5a4c40'); rrect(x + 10, y - 22, 40, 26, 4, '#4e4238'); g.fillStyle = '#2e2a2a'; g.beginPath(); g.moveTo(x - 60, y - 20); g.lineTo(x - 10, y - 66); g.lineTo(x + 20, y - 40); g.lineTo(x - 30, y - 10); g.fill(); g.strokeStyle = '#1e1a18'; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 40, y - 8); g.lineTo(x + 40, y - 54); g.stroke(); for (let i = 0; i < 8; i++) rrect(x + rr(-60, 60), y + rr(-6, 14), rr(8, 14), 6, 2, '#3e3c40'); if (T.burning) fires.push({ x: x + rr(-20, 20), y: y - 18, s: rr(0.8, 1.2) }); },
    fire: (x, y) => { shadow(x, y + 6, 30, 8); for (let i = 0; i < 4; i++) { g.save(); g.translate(x + rr(-14, 14), y + rr(-4, 4)); g.rotate(rr(-0.6, 0.6)); rrect(-18, -4, 36, 8, 3, '#2a1c14'); g.restore(); } fires.push({ x, y: y - 4, s: rr(1, 1.4) }); },
    haystack: (x, y) => { const s = rr(0.9, 1.15); shadow(x + 3, y + 4, 26 * s, 9 * s); g.fillStyle = T.snowy ? '#c8b88a' : '#b39858'; g.beginPath(); g.moveTo(x - 22 * s, y); g.quadraticCurveTo(x - 20 * s, y - 44 * s, x, y - 48 * s); g.quadraticCurveTo(x + 20 * s, y - 44 * s, x + 22 * s, y); g.closePath(); g.fill(); g.strokeStyle = 'rgba(110,86,44,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 18 * s, y - 16 * s); g.quadraticCurveTo(x, y - 10 * s, x + 18 * s, y - 16 * s); g.stroke(); snowCap(x, y - 42 * s, 16 * s); },
    sheaf: (x, y) => { shadow(x, y + 5, 22, 7); ell(x, y, 22, 8, '#a98f52', rr(-0.5, 0.5)); ell(x, y, 5, 9, '#7a6234'); },
    cart: (x, y) => { shadow(x, y + 12, 44, 10); g.save(); g.translate(x, y); g.rotate(rr(-0.4, 0.4)); rrect(-38, -12, 70, 20, 5, '#8B664A'); rrect(-38, -16, 70, 6, 3, '#6f5038'); g.strokeStyle = '#5b4230'; g.lineWidth = 5; g.beginPath(); g.arc(-18, 14, 15, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(-33, 14); g.lineTo(-3, 14); g.moveTo(-18, -1); g.lineTo(-18, 29); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(32, -4); g.lineTo(62, 8); g.stroke(); rrect(-30, -30, 24, 18, 3, '#a07a50'); rrect(-4, -26, 20, 14, 3, '#8a6a44'); g.restore(); snowCap(x - 8, y - 18, 30); },
    jars: (x, y) => { shadow(x + 4, y + 8, 34, 9); rrect(x - 32, y - 4, 66, 12, 4, '#8a8172'); [[-18, 0, 13], [6, -2, 16], [26, 2, 10]].forEach((j, i) => { ell(x + j[0], y - j[2] + j[1], j[2] * 0.85, j[2], i === 2 ? '#5a3e2d' : '#6b4a36'); ell(x + j[0], y - j[2] * 1.8 + j[1], j[2] * 0.5, 3, '#3a281d'); ell(x + j[0] - j[2] * 0.3, y - j[2] * 1.1 + j[1], 2.5, j[2] * 0.45, 'rgba(255,255,255,.2)'); }); },
    fence: (x, y) => { const n = 7 + (R() * 4 | 0); for (let i = 0; i < n; i++) { const xx = x + i * 9 - n * 4.5, h = rr(24, 34), lean = rr(-0.12, 0.12); g.save(); g.translate(xx, y); g.rotate(lean); rrect(-2.5, -h, 5, h, 2, i % 3 ? '#8B664A' : '#74543b'); g.restore(); } g.strokeStyle = '#6a4d36'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - n * 4.5 - 4, y - 16); g.lineTo(x + n * 4.5, y - 18); g.stroke(); },
    sotdae: (x, y) => { shadow(x + 3, y + 3, 9, 4); rrect(x - 2.5, y - 110, 5, 110, 2, '#7a5c42'); g.fillStyle = '#4a3a2c'; g.beginPath(); g.ellipse(x + 3, y - 114, 13, 6, -0.15, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 14, y - 116); g.lineTo(x + 26, y - 120); g.lineTo(x + 14, y - 111); g.fill(); },
    rubble: (x, y) => { for (let i = 0; i < 6; i++) { const xx = x + rr(-26, 26), yy = y + rr(-8, 8), w = rr(14, 24); shadow(xx + w / 2, yy + 14, w * 0.7, 5); rrect(xx, yy, w, rr(11, 16), 5, R() < 0.5 ? '#8a8172' : '#777062'); } },
    rock: (x, y) => { const s = rr(0.8, 1.4); shadow(x + 4, y + 6, 26 * s, 9 * s); ell(x, y - 8 * s, 24 * s, 16 * s, '#7c7a72'); ell(x - 6 * s, y - 14 * s, 14 * s, 8 * s, 'rgba(255,255,255,.18)'); ell(x + 14 * s, y - 2 * s, 12 * s, 8 * s, '#6a675f'); snowCap(x - 2, y - 18 * s, 16 * s); },
    icerock: (x, y) => { shadow(x + 4, y + 6, 24, 8, 0.2); for (let i = 0; i < 4; i++) { const xx = x + (i - 1.5) * 10, h = rr(20, 44); g.fillStyle = i % 2 ? '#9fdcff' : '#d8f4ff'; g.beginPath(); g.moveTo(xx - 7, y); g.lineTo(xx + rr(-3, 3), y - h); g.lineTo(xx + 7, y); g.closePath(); g.fill(); } g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 12, y - 30, 3, 20); },
    stall: (x, y) => { const cs = [['#d0453a', '#f4e4c8'], ['#3a6ab0', '#f0e8d0'], ['#e0a030', '#fff2d0']][(R() * 3) | 0]; shadow(x + 6, y + 8, 56, 14); rrect(x - 44, y - 26, 88, 30, 4, '#8a6a46'); for (let i = 0; i < 4; i++) ell(x - 30 + i * 20, y - 30, 8, 6, ['#e86a3a', '#a0c040', '#f0d040', '#c04040'][i]); g.fillStyle = cs[0]; g.beginPath(); g.moveTo(x - 54, y - 44); g.lineTo(x + 54, y - 44); g.lineTo(x + 46, y - 70); g.lineTo(x - 46, y - 70); g.closePath(); g.fill(); g.fillStyle = cs[1]; for (let i = 0; i < 6; i += 2) { g.beginPath(); g.moveTo(x - 54 + i * 18, y - 44); g.lineTo(x - 36 + i * 18, y - 44); g.lineTo(x - 31 + i * 15.3, y - 70); g.lineTo(x - 46 + i * 15.3, y - 70); g.closePath(); g.fill(); } g.strokeStyle = '#5a4030'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 50, y - 44); g.lineTo(x - 50, y); g.moveTo(x + 50, y - 44); g.lineTo(x + 50, y); g.stroke(); },
    crate: (x, y) => { for (let i = 0; i < 3; i++) { const xx = x + (i - 1) * 22 + rr(-3, 3), yy = y - (i === 1 ? 18 : 0); shadow(xx + 3, yy + 10, 14, 5); rrect(xx - 11, yy - 12, 22, 20, 2, '#a07848'); g.strokeStyle = '#6a4a2a'; g.lineWidth = 2; g.strokeRect(xx - 10, yy - 11, 20, 18); g.beginPath(); g.moveTo(xx - 10, yy - 11); g.lineTo(xx + 10, yy + 7); g.stroke(); } snowCap(x, y - 30, 14); },
    lanterns: (x, y) => { g.strokeStyle = '#3a2a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 60, y - 60); g.quadraticCurveTo(x, y - 40, x + 60, y - 60); g.stroke(); for (let i = -2; i <= 2; i++) { const lx = x + i * 24, ly = y - 50 + Math.abs(i) * -3; ell(lx, ly, 6, 8, '#e04a30'); ell(lx - 2, ly - 2, 2, 3, 'rgba(255,240,200,.7)'); lights.push({ x: lx, y: ly, r: 28, c: '255,120,60', k: 0.6 }); } },
    lantern: (x, y) => { shadow(x, y + 3, 10, 4); rrect(x - 2, y - 46, 4, 46, 2, '#3a2420'); ell(x, y - 52, 8, 10, '#e04050'); ell(x - 2, y - 55, 2.5, 4, 'rgba(255,230,220,.7)'); lights.push({ x, y: y - 52, r: 56, c: '255,80,110', k: 0.8 }); },
    lamppost: (x, y) => { shadow(x + 2, y + 3, 10, 4); rrect(x - 3, y - 80, 6, 80, 2, '#3a2a1e'); rrect(x - 3, y - 80, 22, 4, 2, '#3a2a1e'); rrect(x + 10, y - 76, 14, 16, 4, '#e8a040'); lights.push({ x: x + 17, y: y - 68, r: 80, c: '255,190,100', k: 1, cone: 1 }); },
    stonelamp: (x, y) => { shadow(x + 4, y + 5, 18, 6); rrect(x - 12, y - 6, 24, 8, 2, '#7a7468'); rrect(x - 4, y - 36, 8, 30, 2, '#8a8478'); rrect(x - 14, y - 52, 28, 18, 3, '#9a948a'); rrect(x - 7, y - 48, 14, 10, 2, T.ghost ? '#bfe6ff' : '#ffd890'); g.fillStyle = '#6a6458'; g.beginPath(); g.moveTo(x - 20, y - 52); g.lineTo(x, y - 66); g.lineTo(x + 20, y - 52); g.fill(); snowCap(x, y - 58, 14); lights.push({ x, y: y - 43, r: 60, c: T.ghost ? '140,210,255' : '255,200,110', k: 0.9 }); },
    banner: (x, y) => { shadow(x + 3, y + 3, 10, 4); rrect(x - 2, y - 100, 4, 100, 2, '#4a3a2a'); g.fillStyle = T.burning ? '#7a2a1a' : '#b8322a'; g.beginPath(); g.moveTo(x + 2, y - 96); g.lineTo(x + 34, y - 92); g.lineTo(x + 30, y - 70); g.lineTo(x + 36, y - 52); g.lineTo(x + 2, y - 56); g.fill(); ell(x + 18, y - 76, 7, 7, '#f0d060'); },
    rack: (x, y) => { shadow(x, y + 4, 30, 6); g.strokeStyle = '#5a4030'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 26, y); g.lineTo(x - 26, y - 40); g.moveTo(x + 26, y); g.lineTo(x + 26, y - 40); g.moveTo(x - 30, y - 34); g.lineTo(x + 30, y - 34); g.stroke(); g.strokeStyle = '#b8b8b0'; g.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 10, y + 2); g.lineTo(x + i * 10 + 4, y - 56); g.stroke(); } },
    brokenwall: (x, y) => { shadow(x + 6, y + 6, 66, 12); for (let i = 0; i < 6; i++) { const h = 40 - Math.abs(i - 2.5) * 10 + rr(-6, 6); for (let k = 0; k < h; k += 12) rrect(x - 60 + i * 20 + (k / 12 % 2) * 4, y - k - 12, 18, 11, 2, k % 24 ? '#8e8a7e' : '#7e7a6e'); } },
    palacewall: (x, y) => { shadow(x + 6, y + 6, 70, 12); rrect(x - 64, y - 40, 128, 40, 2, '#a8402e'); rrect(x - 64, y - 46, 128, 8, 2, '#d8d0c0'); g.fillStyle = '#3a4048'; g.beginPath(); g.moveTo(x - 74, y - 44); g.lineTo(x + 74, y - 44); g.lineTo(x + 64, y - 62); g.lineTo(x - 64, y - 62); g.fill(); snowCap(x, y - 60, 66); },
    pillar: (x, y) => { shadow(x + 5, y + 4, 16, 6); rrect(x - 8, y - 90, 16, 90, 3, '#b0382a'); rrect(x - 12, y - 6, 24, 8, 2, '#8a8478'); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 5, y - 86, 3, 80); rrect(x - 14, y - 98, 28, 10, 2, '#3a6a5a'); },
    marker: (x, y) => { shadow(x + 3, y + 3, 10, 4); rrect(x - 7, y - 30, 14, 30, 3, '#9a9488'); g.fillStyle = 'rgba(40,30,20,.5)'; g.fillRect(x - 2, y - 24, 4, 16); },
    lily: (x, y) => { for (let i = 0; i < 9; i++) { const xx = x + rr(-30, 30), yy = y + rr(-14, 14); g.strokeStyle = '#3a5a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy - 14); g.stroke(); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.strokeStyle = '#ff2a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, yy - 16); g.lineTo(xx + Math.cos(a) * 8, yy - 16 + Math.sin(a) * 6); g.stroke(); } ell(xx, yy - 16, 3, 3, '#ff6070'); } lights.push({ x, y: y - 10, r: 40, c: '255,40,70', k: 0.4 }); },
    boat: (x, y) => { shadow(x, y + 8, 50, 10); g.fillStyle = '#6a4a30'; g.beginPath(); g.moveTo(x - 50, y - 10); g.quadraticCurveTo(x, y + 14, x + 50, y - 10); g.lineTo(x + 40, y - 18); g.lineTo(x - 40, y - 18); g.fill(); rrect(x - 36, y - 22, 72, 6, 2, '#8a6a48'); g.strokeStyle = '#4a3020'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 10, y - 18); g.lineTo(x + 34, y - 54); g.stroke(); },
    reeds: (x, y) => { for (let i = 0; i < 12; i++) { const xx = x + rr(-20, 20), h = rr(26, 50); g.strokeStyle = R() < 0.5 ? '#8a9a50' : '#6a7a40'; g.lineWidth = 2; g.beginPath(); g.moveTo(xx, y); g.quadraticCurveTo(xx + 4, y - h * 0.6, xx + rr(-6, 6), y - h); g.stroke(); ell(xx, y - h, 2, 6, '#8a6a40'); } },
    dock: (x, y) => { shadow(x + 6, y + 8, 50, 10); for (let i = 0; i < 6; i++) rrect(x - 48 + i * 16, y - 20, 15, 34, 2, i % 2 ? '#8a6a48' : '#7a5c3e'); g.fillStyle = '#4a3424'; g.fillRect(x - 50, y + 12, 6, 14); g.fillRect(x + 44, y + 12, 6, 14); }
  };
  /* TOON_PROPS: 그림이 있으면 만화체 그림으로 그린다 */
  { const pic = (keys, h, fb, lt) => (x, y, s) => { const k = Array.isArray(keys) ? keys[(R() * keys.length) | 0] : keys, im = PIMG[k]; if (!im) return fb(x, y, s); const hh = h * (typeof s === 'number' ? s : 1) * rr(0.9, 1.1), w = im.width * hh / im.height;
      shadow(x + 3, y - 1, w * 0.42, Math.max(4, w * 0.11), 0.26); g.save(); if (R() < 0.5) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0); } g.drawImage(im, x - w / 2, y - hh, w, hh); g.restore(); if (T.snowy && k !== 'floor_tile') snowCap(x, y - hh * 0.9, w * 0.3); if (lt) lights.push({ x, y: y - hh * 0.62, r: 60, c: '255,200,120', k: 0.9 }); };
    const O = Object.assign({}, P);
    Object.assign(P, { pine: pic('pine', 92, O.pine), willow: pic('willow', 100, O.willow), bamboo: pic('bamboo', 88, O.bamboo), house: pic(['house_a', 'house_b'], 84, O.house), haystack: pic('haystack', 44, O.haystack), cart: pic('cart', 46, O.cart), jars: pic('jars', 50, O.jars), fence: pic(['fence', 'tilewall'], 36, O.fence), rock: pic(['rock_a', 'rock_b'], 36, O.rock), rubble: pic('rock_b', 28, O.rubble), boat: pic('boat', 44, O.boat), dock: pic('dock', 42, O.dock), lantern: pic('lantern', 54, O.lantern, 1), stonelamp: pic('lantern', 54, O.stonelamp, 1), lamppost: pic('lantern', 62, O.lamppost, 1), sotdae: pic('jangseung', 58, O.sotdae), marker: pic('jangseung', 46, O.marker) });
    P.jangseung = pic('jangseung', 52, O.marker); P.grass = pic(['grass_a', 'grass_b'], 24, () => {}); P.floor = pic('floor_tile', 22, () => {}); }

  /* 가장자리 소품 배치: 나무 띠 + 테마 소품 */
  const items = [];
  const tree = P[T.tree];
  for (let y = 40; y < H; y += rr(46, 74)) { const s = rr(0.9, 1.4); const x1 = T.water ? rr(-170, -135) : rr(-70, -20); items.push([y, () => tree(x1, y, s)]); const y2 = y + rr(-20, 20), x2 = T.water ? rr(W + 135, W + 170) : rr(W + 20, W + 70); items.push([y2, () => tree(x2, y2, rr(0.9, 1.4))]); }
  const spots = [[60, 300], [664, 520], [64, 470], [656, 250], [60, 760], [664, 860], [90, 560], [640, 700], [96, 150], [640, 400], [72, 660], [250, 64], [470, 90], [652, 190], [62, 940], [96, 1180], [630, 1200], [80, 1400], [640, 1430], [660, 1000]];
  /* 넓은 판: 장식은 모두 판 바깥 가장자리로(가운데는 빈 공터) */ spots.forEach(q => { q[1] = Math.round(q[1] * H / 1500); q[0] = q[0] < 360 ? -150 + (q[0] % 60) : W + 90 + (q[0] % 60); if (q[1] < 140) q[1] = -160; });
  
  /* 여백 숲·장식 (길 입구는 비움) */ for (let y = -MT + 30; y < H + MB; y += rr(60, 95)) for (const side of [0, 1]) { const x = side ? rr(W + 110, W + MX - 30) : rr(-MX + 30, -110), s = rr(0.9, 1.5); items.push([y, () => tree(x, y, s)]); if (R() < 0.35) { const xx = side ? rr(W + 90, W + MX - 40) : rr(-MX + 40, -90), yy = y + rr(10, 40), nm = T.props[(R() * T.props.length) | 0]; if (P[nm]) items.push([yy, () => P[nm](xx, yy)]); } }
  for (let y = -MT + 30; y < -90; y += rr(70, 110)) for (let x = rr(-MX, -MX + 80); x < W + MX; x += rr(90, 150)) { if (LANES.some(L => Math.abs(L - x) < 130) || Math.abs(x - CX) < 90) continue; const s = rr(0.9, 1.4), yy = y; items.push([yy, () => tree(x, yy, s)]); }
  spots.forEach((q, i) => { const name = T.props[i % T.props.length]; const fn = P[name]; if (fn) items.push([q[1], () => fn(q[0] + (T.water ? (q[0] < CX ? -60 : 60) : 0), q[1])]); });
  /* 본진 뒤쪽 */
  items.push([SH.y + 178, () => P.jars(SH.x - 30, SH.y + 148)]); items.push([SH.y + 128, () => P.fence(SH.x - 110, SH.y + 130)]); items.push([SH.y + 130, () => P.fence(SH.x + 110, SH.y + 130)]);
  /* 성벽 앞 가로등(후더덕의 가로등 빛처럼) */
  /* 판 안 가로등은 빼고 가장자리에만 */ items.push([700, () => P.lamppost(-40, 700)]); items.push([420, () => P.lamppost(W + 20, 420)]);
  /* TOON_PROPS: 가장자리 소품 무더기(촘촘히) + 판 안 바닥 돌판·풀(드문드문, 길·가운데 비움) */
  { const EXTRA = ['rock', 'jangseung', 'jars', 'haystack', 'fence', 'house', 'cart'].filter(n => P[n]); for (let y = -MT + 60; y < H + MB - 40; y += rr(70, 120)) for (const side of [0, 1]) { const n = 1 + ((R() * 3) | 0); for (let i = 0; i < n; i++) { const xx = side ? rr(W + 70, W + 230) : rr(-230, -70), yy = y + rr(-20, 30), nm = R() < 0.5 && T.props.length ? T.props[(R() * T.props.length) | 0] : EXTRA[(R() * EXTRA.length) | 0]; if (P[nm] && !(T.water && Math.abs(side ? xx - W - 150 : xx + 150) < 40)) items.push([yy, () => P[nm](xx, yy)]); } }
    const nearL = (x, y) => LANES.some((L, i) => { for (let t = 0; t <= 1; t += 0.04) { const p = D.lanePt(L, t, i); if (Math.abs(p.y - y) < 50 && Math.abs(p.x - x) < 70) return true; } return false; });
    for (let i = 0, got = 0; i < 80 && got < 16; i++) { const x = rr(40, W - 40), y = rr(80, H - 80); if (Math.abs(x - CX) < 200 && y > WALL_Y - 420) continue; if (nearL(x, y)) continue; got++; const k = R() < 0.45 ? 'floor' : 'grass'; if (k === 'grass' && (T.snowy || T.burning || T.ghost)) continue; items.push([y - 400, () => P[k](x, y)]); } }
  items.sort((a, b) => a[0] - b[0]).forEach(it => it[1]());

  /* 양옆을 어둡게, 위쪽(적이 오는 곳)도 조금 어둡게 */
  let gr = g.createLinearGradient(-MX, 0, -MX + 240, 0); gr.addColorStop(0, 'rgba(' + T.edge + ',.5)'); gr.addColorStop(1, 'rgba(' + T.edge + ',0)'); g.fillStyle = gr; g.fillRect(-MX, -MT, 240, H + MT + MB);
  gr = g.createLinearGradient(W + MX, 0, W + MX - 240, 0); gr.addColorStop(0, 'rgba(' + T.edge + ',.5)'); gr.addColorStop(1, 'rgba(' + T.edge + ',0)'); g.fillStyle = gr; g.fillRect(W + MX - 240, -MT, 240, H + MT + MB);
  gr = g.createLinearGradient(0, -MT, 0, -MT + 320); gr.addColorStop(0, 'rgba(' + T.edge + ',.55)'); gr.addColorStop(1, 'rgba(' + T.edge + ',0)'); g.fillStyle = gr; g.fillRect(-MX, -MT, W + 2 * MX, 320);

  /* 본진 둘레의 큰 흰 원 (지킬 구역 표시) */
  g.save(); g.translate(SH.x, SH.y - 40); g.scale(1, 0.62);
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 470, 0, TAU); g.stroke();
  g.setLineDash([18, 14]); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 360, 0, TAU); g.stroke(); g.setLineDash([]);
  g.restore();
  /* 성벽 앞 가로선 */
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(60, WALL_Y + 30, W - 120, 3);

  /* 본진 앞 등불 */
  [[CX - 64, WALL_Y - 58], [CX + 64, WALL_Y - 58], [SH.x - 90, SH.y + 90], [SH.x + 90, SH.y + 90]].forEach(q => lights.push({ x: q[0], y: q[1], r: 70, c: T.light, k: 0.9 }));
  return { cv, GS, lights, fires, T, MX, MT, MB };
};

/* 떠다니는 입자: 화면 범위(x0..x1, y0..y1) 안에 테마별로 띄운다 */
JZW.ambient = function (T, dt, v) {
  const a = T.amb, rnd = (p, q) => p + Math.random() * (q - p);
  if (a === 'firefly' && Math.random() < dt * 6) FX.p({ kind: 'glow', x: rnd(v.x0, v.x1), y: rnd(v.y0, v.y1), vx: rnd(-14, 14), vy: rnd(-14, 6), life: rnd(1.6, 3), s: rnd(5, 8), s2: 2, c: '200,255,140' });
  else if (a === 'snow' && Math.random() < dt * 40) FX.p({ kind: 'glow', x: rnd(v.x0 - 60, v.x1), y: v.y0 + rnd(-40, (v.y1 - v.y0) * 0.6), vx: rnd(10, 40), vy: rnd(50, 90), life: rnd(3, 5), s: rnd(3, 6), s2: rnd(2, 4), c: '235,245,255' });
  else if (a === 'ember' && Math.random() < dt * 22) FX.p({ kind: 'glow', x: rnd(v.x0, v.x1), y: rnd(v.y0 + 200, v.y1 + 40), vx: rnd(-20, 30), vy: -rnd(40, 110), life: rnd(1.5, 3), s: rnd(3, 6), s2: 1, c: Math.random() < 0.5 ? '255,140,40' : '255,200,80' });
  else if (a === 'ghost' && Math.random() < dt * 3) FX.p({ kind: 'glow', x: rnd(v.x0, v.x1), y: rnd(v.y0, v.y1), vx: rnd(-20, 20), vy: -rnd(8, 30), life: rnd(2, 4), s: rnd(12, 20), s2: 4, c: T.ghost && T.light === '255,90,120' ? '255,120,160' : '150,210,255' });
  else if (a === 'dust' && Math.random() < dt * 5) FX.p({ kind: 'leaf', x: v.x0 - 10, y: rnd(v.y0, v.y1), vx: rnd(60, 120), vy: rnd(-10, 20), life: rnd(4, 6), s: rnd(3, 5), c: Math.random() < 0.5 ? 'rgba(170,120,60,.8)' : 'rgba(200,170,90,.8)', rot: rnd(0, 6), vr: rnd(-4, 4) });
  else if (a === 'miasma' && Math.random() < dt * 4) FX.p({ kind: 'smoke', x: rnd(v.x0, v.x1), y: rnd(v.y0, v.y0 + 400), vx: rnd(-10, 10), vy: rnd(5, 20), life: rnd(3, 5), s: rnd(30, 50), s2: rnd(60, 90), c: '120,60,150', rot: 0, vr: 0.3 });
  else if (a === 'fog' && Math.random() < dt * 1.2) FX.p({ kind: 'smoke', x: rnd(v.x0 - 60, v.x1), y: rnd(v.y0, v.y0 + (v.y1 - v.y0) * 0.45), vx: rnd(15, 30), vy: 0, life: rnd(4, 6), s: rnd(40, 55), s2: rnd(60, 80), c: '200,215,215', rot: 0, vr: 0.1 });
};
})();
