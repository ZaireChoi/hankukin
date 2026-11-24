/* 처용야행 효과: 빛 번짐, 불꽃, 연기, 파편, 충격파, 번개, 바닥 자국, 피해 숫자 */
(function () {
'use strict';
const FX = window.JZFX = {};
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
let parts = [], decals = [], nums = [], bolts = [], rings = [];
FX.shake = 0;

/* 빛 번짐 그림을 색마다 한 번만 만들어 둔다 */
const glowCache = {};
function glowImg(c, hard) {
  const key = c + '|' + (hard || 0);
  if (glowCache[key]) return glowCache[key];
  const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s * 2;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(s, s, 0, s, s, s);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(hard ? 0.18 : 0.08, 'rgba(' + c + ',1)');
  gr.addColorStop(hard ? 0.5 : 0.35, 'rgba(' + c + ',' + (hard ? 0.7 : 0.45) + ')');
  gr.addColorStop(1, 'rgba(' + c + ',0)');
  g.fillStyle = gr; g.fillRect(0, 0, s * 2, s * 2);
  return (glowCache[key] = cv);
}
FX.glowImg = glowImg;
/* 연기 덩어리 (보통 섞기) */
const smokeCache = {};
function smokeImg(c) {
  if (smokeCache[c]) return smokeCache[c];
  const s = 48, cv = document.createElement('canvas'); cv.width = cv.height = s * 2;
  const g = cv.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const x = s + rnd(-14, 14), y = s + rnd(-14, 14), r = rnd(18, 30), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(' + c + ',.55)'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, s * 2, s * 2);
  }
  return (smokeCache[c] = cv);
}
FX.glow = function (ctx, x, y, r, c, a, hard) {
  if (a <= 0 || r <= 0) return;
  ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowImg(c, hard), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
};

FX.low = false;
function add(p) { if (parts.length < (FX.low ? 450 : 2200)) parts.push(p); return p; }
/* kind: glow(가산) spark(가산 선) smoke(연기) debris(파편) ember(가산 작은 불티) leaf(낙엽) */
FX.p = function (o) { o.t = o.life = o.life || 0.5; o.vx = o.vx || 0; o.vy = o.vy || 0; o.s = o.s || 6; o.s2 = o.s2 == null ? o.s : o.s2; return add(o); };

FX.spark = function (x, y, c, n, sp, life) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(0.35, 1) * (sp || 260); add({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: life || rnd(0.15, 0.3), life: life || 0.3, s: rnd(2, 3.5), c: c || '255,220,140', drag: 4 }); }
};
FX.hit = function (x, y, c, big) {
  c = c || '255,230,170';
  add({ kind: 'glow', x, y, t: 0.12, life: 0.12, s: big ? 46 : 26, s2: big ? 10 : 6, c });
  FX.spark(x, y, c, big ? 7 : 4, big ? 380 : 260);
};
FX.ring = function (x, y, r, c, life, w, r0) { rings.push({ x, y, r, r0: r0 || r * 0.15, c: c || '255,240,200', t: life || 0.35, life: life || 0.35, w: w || 6 }); };
FX.flash = function (x, y, r, c, life) { add({ kind: 'glow', x, y, t: life || 0.15, life: life || 0.15, s: r, s2: r * 0.6, c: c || '255,255,240', hard: 1 }); };
FX.smoke = function (x, y, n, c, sz, rise) {
  for (let i = 0; i < n; i++) add({ kind: 'smoke', x: x + rnd(-8, 8), y: y + rnd(-8, 8), vx: rnd(-30, 30), vy: -rnd(10, rise || 50), t: rnd(0.8, 1.4), life: 1.4, s: sz || rnd(14, 22), s2: (sz || 18) * 2.4, c: c || '70,64,60', rot: rnd(0, TAU), vr: rnd(-1, 1), drag: 1.5 });
};
FX.debris = function (x, y, n, c, sp) {
  for (let i = 0; i < n; i++) { const a = rnd(0, TAU), v = rnd(80, sp || 300); add({ kind: 'debris', x, y, z: 0, vz: rnd(150, 360), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, t: rnd(0.5, 0.9), life: 0.9, s: rnd(3, 6), c: c || '#5a4a3a', rot: rnd(0, TAU), vr: rnd(-12, 12), drag: 1.2 }); }
};
FX.ember = function (x, y, c, n, rise) {
  for (let i = 0; i < n; i++) add({ kind: 'glow', x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: rnd(-30, 30), vy: -rnd(30, rise || 120), t: rnd(0.4, 0.9), life: 0.9, s: rnd(4, 8), s2: 1, c: c || '255,160,60', drag: 1 });
};
FX.trail = function (x, y, c, s, life) { add({ kind: 'glow', x, y, t: life || 0.22, life: life || 0.22, s: s || 10, s2: 1, c }); };
FX.decal = function (o) { o.t = o.life = o.life || 6; decals.push(o); if (decals.length > 120) decals.shift(); };
FX.scorch = function (x, y, r) { FX.decal({ kind: 'scorch', x, y, r, life: 7, rot: rnd(0, TAU) }); };
FX.goo = function (x, y, c, r) { FX.decal({ kind: 'goo', x, y, r: r || 16, c: c || '120,190,60', life: 5, rot: rnd(0, TAU), seed: Math.random() }); };

/* 폭발: 하얀 섬광 → 불덩이 → 충격파 → 불티와 파편 → 연기 → 그을음 */
FX.explode = function (x, y, r, pal) {
  const P = pal === 'purple' ? ['220,140,255', '160,80,255', '90,40,160'] : pal === 'blue' ? ['200,240,255', '90,180,255', '40,80,160'] : pal === 'green' ? ['230,255,170', '150,230,60', '60,110,30'] : ['255,240,190', '255,150,40', '200,60,20'];
  add({ kind: 'glow', x, y, t: 0.1, life: 0.1, s: r * 2.2, s2: r * 1.6, c: '255,255,255', hard: 1 });
  add({ kind: 'glow', x, y, t: 0.38, life: 0.38, s: r * 1.6, s2: r * 0.6, c: P[1], hard: 1 });
  for (let i = 0; i < 12; i++) { const a = rnd(0, TAU), v = rnd(30, 110) * r / 60; add({ kind: 'glow', x: x + Math.cos(a) * r * 0.2, y: y + Math.sin(a) * r * 0.15, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 20, t: rnd(0.25, 0.5), life: 0.5, s: rnd(0.4, 0.7) * r, s2: r * 0.1, c: i % 3 ? P[1] : P[0], hard: 1, drag: 3 }); }
  FX.ring(x, y, r * 1.35, P[0], 0.32, Math.max(4, r / 9));
  FX.spark(x, y, P[0], 10 + (r / 8 | 0), r * 6, 0.35);
  FX.debris(x, y, 6 + (r / 15 | 0), '#3a2e26', r * 5);
  FX.smoke(x, y - r * 0.2, 4 + (r / 20 | 0), pal ? '60,50,70' : '70,60,55', r * 0.35, 60);
  if (pal !== 'blue') FX.scorch(x, y, r * 0.9);
  FX.shake = Math.max(FX.shake, Math.min(0.35, r / 300));
};

/* 번개: 꺾인 선을 미리 만들어 두고 세 겹으로 그린다 */
function jag(x1, y1, x2, y2, dev, depth, out) {
  if (depth <= 0) { out.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2 + rnd(-dev, dev), my = (y1 + y2) / 2 + rnd(-dev, dev) * 0.5;
  jag(x1, y1, mx, my, dev / 2, depth - 1, out); jag(mx, my, x2, y2, dev / 2, depth - 1, out);
}
FX.bolt = function (pts, c, life, w) {
  const paths = [];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.y - a.y), o = [[a.x, a.y]]; jag(a.x, a.y, b.x, b.y, Math.min(60, d * 0.25), 4, o); paths.push(o); }
  /* 곁가지 */
  const br = [];
  for (const p of paths) for (let k = 0; k < 2; k++) { const s = p[(Math.random() * p.length) | 0], o = [[s[0], s[1]]], a = rnd(0, TAU), L = rnd(20, 50); jag(s[0], s[1], s[0] + Math.cos(a) * L, s[1] + Math.sin(a) * L, 12, 3, o); br.push(o); }
  bolts.push({ paths, br, c: c || '150,210,255', t: life || 0.22, life: life || 0.22, w: w || 1 });
};
FX.skyBolt = function (x, y, c, w) {
  FX.bolt([{ x: x + rnd(-80, 80), y: y - 700 }, { x, y }], c || '170,200,255', 0.3, w || 1.6);
  FX.flash(x, y, 90, c || '200,220,255', 0.2);
  FX.ring(x, y, 70, c || '200,230,255', 0.3, 5);
  FX.spark(x, y, c || '220,240,255', 12, 420);
  FX.scorch(x, y, 26);
};

/* 피해 숫자 */
FX.fmt = v => typeof v === 'string' ? v : v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e4 ? (v / 1e3).toFixed(1) + 'K' : String(Math.round(v));
FX.num = function (x, y, v, crit, col) {
  if (nums.length > 60) nums.shift();
  nums.push({ x: x + rnd(-10, 10), y, v, crit, col, t: 0.8, life: 0.8, vy: -rnd(70, 110) });
};

FX.reset = function () { parts = []; decals = []; nums = []; bolts = []; rings = []; FX.shake = 0; };
FX.count = () => parts.length;

FX.update = function (dt) {
  for (const p of parts) {
    p.t -= dt;
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'debris') { p.vz -= 900 * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; } p.rot += p.vr * dt; }
    else if (p.rot != null) p.rot += (p.vr || 0) * dt;
    if (p.grav) p.vy += p.grav * dt;
  }
  parts = parts.filter(p => p.t > 0);
  for (const d of decals) d.t -= dt; decals = decals.filter(d => d.t > 0);
  for (const n of nums) { n.t -= dt; n.y += n.vy * dt; n.vy *= Math.max(0, 1 - 3.5 * dt); } nums = nums.filter(n => n.t > 0);
  for (const b of bolts) b.t -= dt; bolts = bolts.filter(b => b.t > 0);
  for (const r of rings) r.t -= dt; rings = rings.filter(r => r.t > 0);
  if (FX.shake > 0) FX.shake -= dt;
};

/* 바닥 자국: 인물보다 먼저 그린다 */
FX.drawDecals = function (ctx) {
  for (const d of decals) {
    const a = Math.min(1, d.t / 1.5);
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot || 0); ctx.scale(1, 0.62);
    if (d.kind === 'scorch') {
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, d.r);
      gr.addColorStop(0, 'rgba(20,14,10,' + 0.55 * a + ')'); gr.addColorStop(0.6, 'rgba(30,20,14,' + 0.35 * a + ')'); gr.addColorStop(1, 'rgba(30,20,14,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, TAU); ctx.fill();
      if (d.t > d.life - 1.2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (d.t - (d.life - 1.2)) / 1.2 * 0.5; ctx.drawImage(glowImg('255,100,30'), -d.r * 0.7, -d.r * 0.7, d.r * 1.4, d.r * 1.4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    } else if (d.kind === 'goo') {
      ctx.fillStyle = 'rgba(' + d.c + ',' + 0.75 * a + ')';
      let s = d.seed * 1000;
      const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      ctx.beginPath(); ctx.arc(0, 0, d.r * 0.7, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i++) { const an = R() * TAU, L = d.r * (0.7 + R() * 0.8); ctx.beginPath(); ctx.arc(Math.cos(an) * L, Math.sin(an) * L, d.r * (0.15 + R() * 0.22), 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,' + 0.25 * a + ')'; ctx.beginPath(); ctx.arc(-d.r * 0.25, -d.r * 0.25, d.r * 0.2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
};

/* 위에 덮는 효과 */
FX.draw = function (ctx) {
  /* 연기와 파편 (보통 섞기) */
  for (const p of parts) {
    if (p.kind === 'smoke') {
      const k = p.t / p.life, s = p.s2 + (p.s - p.s2) * k;
      ctx.globalAlpha = Math.min(1, k * 1.6) * 0.8; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(smokeImg(p.c), -s, -s, s * 2, s * 2); ctx.restore();
    } else if (p.kind === 'debris') {
      ctx.globalAlpha = Math.min(1, p.t * 3); ctx.save(); ctx.translate(p.x, p.y - p.z); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7); ctx.restore();
    } else if (p.kind === 'leaf') {
      ctx.globalAlpha = Math.min(1, p.t * 2, 1); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (const r of rings) {
    const k = 1 - r.t / r.life, rr = r.r0 + (r.r - r.r0) * (1 - Math.pow(1 - k, 2.2));
    ctx.save(); ctx.translate(r.x, r.y); ctx.scale(1, 0.62);
    ctx.strokeStyle = 'rgba(' + r.c + ',' + (1 - k) * 0.9 + ')'; ctx.lineWidth = r.w * (1 - k * 0.6);
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) * 0.6 + ')'; ctx.lineWidth = r.w * 0.35; ctx.stroke();
    ctx.restore();
  }
  for (const p of parts) {
    if (p.kind === 'glow') {
      const k = p.t / p.life, s = p.s2 + (p.s - p.s2) * k;
      ctx.globalAlpha = Math.min(1, k * 2.2); ctx.drawImage(glowImg(p.c, p.hard), p.x - s, p.y - s, s * 2, s * 2);
    } else if (p.kind === 'spark') {
      const k = p.t / p.life;
      ctx.globalAlpha = Math.min(1, k * 2); ctx.strokeStyle = 'rgb(' + p.c + ')'; ctx.lineWidth = p.s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  for (const b of bolts) {
    const k = b.t / b.life, fl = 0.6 + 0.4 * Math.sin(b.t * 90);
    const pass = (paths, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; for (const p of paths) { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); } };
    pass(b.paths, 16 * b.w, 'rgba(' + b.c + ',' + 0.35 * k * fl + ')');
    pass(b.paths, 7 * b.w, 'rgba(' + b.c + ',' + 0.9 * k + ')');
    pass(b.paths, 2.5 * b.w, 'rgba(255,255,255,' + k + ')');
    pass(b.br, 3 * b.w, 'rgba(' + b.c + ',' + 0.7 * k + ')');
  }
  ctx.globalCompositeOperation = 'source-over';
};

/* 피해 숫자: 화면 좌표로 그린다. toS(x,y) -> [sx, sy] */
FX.drawNums = function (ctx, toS) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const n of nums) {
    const age = n.life - n.t, pop = age < 0.08 ? 1.7 - age / 0.08 * 0.7 : 1, s = toS(n.x, n.y);
    const size = (n.crit ? 40 : 30) * pop;
    ctx.globalAlpha = Math.min(1, n.t / 0.25);
    ctx.font = '900 ' + size.toFixed(1) + 'px "Pretendard","Malgun Gothic",sans-serif';
    const txt = FX.fmt(n.v) + (n.crit ? '!' : '');
    ctx.lineWidth = n.crit ? 8 : 7; ctx.strokeStyle = n.crit ? '#3a0606' : '#141018'; ctx.strokeText(txt, s[0], s[1]);
    ctx.fillStyle = n.col || (n.crit ? '#ff4a3a' : '#ffffff'); ctx.fillText(txt, s[0], s[1]);
    if (n.crit) { ctx.fillStyle = 'rgba(255,230,120,.55)'; ctx.fillText(txt, s[0], s[1] - 2); }
  }
  ctx.globalAlpha = 1;
};
})();
