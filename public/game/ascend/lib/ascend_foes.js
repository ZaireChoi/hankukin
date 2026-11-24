/* ASCEND v4.03 — enemy variety: every Zeta type gets its own readable attack, plus Diablo-style elite affixes
   (user 2026-11-24: "different enemies, with their own motions and attack patterns")
   Each special attack = wind-up (the body crouches / swells / rears, red mark on the ground) -> the strike -> recovery.
     zling   Zeta Warrior   POUNCE      crouch 0.45 s, red spot where it will land, leaps and slashes (small area)
     zspit   Acid Spitter   ACID MORTAR rears back, lobs a glob at where you are going, leaves an acid patch for 3 s
     zbane   Bile Roller    BURST       rolls in, swells and glows for 0.7 s, bursts (move away when it glows)
     ztank   Tanker Bug     CHARGE      rears 0.8 s, red lane, charges straight through and knocks you back
     zhopper Hopper         DIVE        climbs, red spot under you, dives
     zsled   Sky Sled       STRAFE      lines up and strafes along a red lane
     zlurk   Spine Lurker   SPINE LINE  burrows, red line toward you, spikes erupt along it one after another
     zroach  Shell Roach    REGROW      after taking a beating it burrows for 2 s and comes back healed (break it fast)
     zplasma Plasma Bug     TRI-SHOT    three slow plasma orbs in a fan, after a glow
   Elite affixes (6 % of wave spawns, never bosses): [Swift] [Splitting] [Shielded] [Frenzied] [Vampiric] - bigger, name tag.
   New spawn mix per wave: rollers from wave 2, roaches and sleds from 3, lurkers from 4.
   Damage scales with the target's max HP so it stays fair at every level. Global cap: 5 special attacks in flight at once.
   Hooks: step (after), spawnWave, invSpawn, hurt. Wraps once: window.__hkFoes. Off switch: window.__foesOff = true. */
(function () {
  'use strict';
  var g = function () { return typeof G !== 'undefined' ? G : null; };
  var EN = function () { return typeof LANG !== 'undefined' && LANG === 'en'; };
  var L2 = function (k, e) { return EN() ? e : k; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var LIVE = 0, STAT = {}; // special attacks in flight / started per type
  var tele = function (k, o) { var G0 = g(); if (!G0) return; G0.tele = G0.tele || []; var s = { k: k, t: 1.1 }; for (var key in o) s[key] = o[key]; G0.tele.push(s); };   /* the game's own tele() is block-scoped */
  var CD = { zling: [5, 8], zspit: [6, 9], zbane: [0, 0], ztank: [9, 12], zhopper: [7, 10], zsled: [8, 11], zlurk: [7, 10], zroach: [0, 0], zplasma: [6, 8] };
  var RANGE = { zling: [120, 420], zspit: [250, 900], zbane: [0, 130], ztank: [200, 800], zhopper: [0, 700], zsled: [200, 900], zlurk: [200, 900], zplasma: [250, 1000] };
  var target = function (u) { var G0 = g(), best = null, bd = 1e9; for (var i = 0; i < G0.units.length; i++) { var v = G0.units[i]; if (v.dead || v.team === u.team || v.team === 2 || v.fly && u.cls !== 'zhopper' && u.cls !== 'zsled') continue; var d = (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y); if (d < bd) { bd = d; best = v; } } return best ? { v: best, d: Math.sqrt(bd) } : null; };
  var dmgOf = function (v, pct, u) { return Math.max(8, (v.mhp || 300) * pct) * (u.elite3 ? 1.5 : 1) * (u.aff === 'frenzy' ? 1.3 : 1); };
  var squash = function (u, sx, sy) { try { var e = R3.units.get(u.id); if (!e || !e.mdl || !e.mdl.wrap) return; var w = e.mdl.wrap, b = u._fs || (u._fs = { x: w.scale.x, y: w.scale.y }); w.scale.x = b.x * sx; w.scale.z = b.x * sx; w.scale.y = b.y * sy; } catch (er) {} };
  var unsquash = function (u) { try { var e = R3.units.get(u.id); if (!e || !e.mdl || !u._fs) return; e.mdl.wrap.scale.set(u._fs.x, u._fs.y, u._fs.x); } catch (er) {} };
  var puff = function (x, y, c, n, h) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, s = rnd(60, 260); try { part(x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(.25, .5), c, rnd(4, 8), h || rnd(4, 30)); } catch (e) {} } };
  // ------------------------------------------------------------------ the attacks: each returns a little state machine stored on the unit
  var start = function (u, tg) {
    var k = u.cls, v = tg.v, A = { k: k, t: 0, ph: 0, tx: v.x + (v.vx || 0) * .5, ty: v.y + (v.vy || 0) * .5, v: v };
    if (k === 'zling') A.wind = .45; else if (k === 'zspit') A.wind = .55; else if (k === 'zbane') A.wind = .7; else if (k === 'ztank') A.wind = .8; else if (k === 'zhopper' || k === 'zsled') A.wind = .6; else if (k === 'zlurk') A.wind = .9; else if (k === 'zplasma') A.wind = .6; else return null;
    if (k === 'ztank' || k === 'zsled' || k === 'zlurk') { var a = Math.atan2(A.ty - u.y, A.tx - u.x), L = k === 'ztank' ? Math.min(820, tg.d + 220) : k === 'zsled' ? 760 : Math.min(900, tg.d + 120); A.a = a; A.x2 = u.x + Math.cos(a) * L; A.y2 = u.y + Math.sin(a) * L; try { tele('line', { x: u.x, y: u.y, x2: A.x2, y2: A.y2, w: k === 'ztank' ? 70 : 55, t: A.wind + (k === 'zlurk' ? .6 : .25), dmg: 0, src: null }); } catch (e) {} }
    else if (k !== 'zplasma') { try { tele('circle', { x: A.tx, y: A.ty, r: k === 'zbane' ? 150 : k === 'zspit' ? 120 : 95, t: A.wind + .25, dmg: 0, src: null }); } catch (e) {} }
    LIVE++; STAT[k] = (STAT[k] || 0) + 1; return A;
  };
  var hitArea = function (u, x, y, r, pct, kb) { var G0 = g(); for (var i = 0; i < G0.units.length; i++) { var v = G0.units[i]; if (v.dead || v.team === u.team || v.team === 2) continue; var dx = v.x - x, dy = v.y - y; if (dx * dx + dy * dy > r * r) continue; try { hurt(v, dmgOf(v, pct, u), u.slot || null, Math.atan2(dy, dx), 'x'); } catch (e) {} if (kb && !v.boss) { var a = Math.atan2(dy, dx); v.vx = (v.vx || 0) + Math.cos(a) * kb; v.vy = (v.vy || 0) + Math.sin(a) * kb; } } };
  var hitLine = function (u, x1, y1, x2, y2, w, pct, kb) { var G0 = g(), dx = x2 - x1, dy = y2 - y1, L2q = dx * dx + dy * dy || 1; for (var i = 0; i < G0.units.length; i++) { var v = G0.units[i]; if (v.dead || v.team === u.team || v.team === 2 || v._lh === u.id) continue; var t = Math.max(0, Math.min(1, ((v.x - x1) * dx + (v.y - y1) * dy) / L2q)), px = x1 + dx * t, py = y1 + dy * t; if ((v.x - px) * (v.x - px) + (v.y - py) * (v.y - py) > w * w) continue; v._lh = u.id; setTimeout(function (vv) { return function () { vv._lh = 0; }; }(v), 600); try { hurt(v, dmgOf(v, pct, u), u.slot || null, Math.atan2(dy, dx), 'x'); } catch (e) {} if (kb && !v.boss) { var a = Math.atan2(dy, dx) + (Math.random() < .5 ? 1.2 : -1.2); v.vx = (v.vx || 0) + Math.cos(a) * kb; v.vy = (v.vy || 0) + Math.sin(a) * kb; } } };
  var run = function (u, A, dt) {
    A.t += dt; var k = A.k;
    if (A.ph === 0) { // wind-up
      var p = Math.min(1, A.t / A.wind);
      if (k === 'zling' || k === 'ztank') squash(u, 1 + p * .12, 1 - p * .22); else if (k === 'zbane') squash(u, 1 + p * .45, 1 + p * .45); else if (k === 'zspit' || k === 'zplasma') squash(u, 1 - p * .05, 1 + p * .15); else if (k === 'zlurk') squash(u, 1 + p * .2, Math.max(.15, 1 - p * .85));
      if (k === 'zbane' && Math.random() < .5) puff(u.x, u.y, '#b8ff5a', 1, 12);
      if (k === 'zplasma' && Math.random() < .5) puff(u.x, u.y, '#c58cff', 1, 40);
      u.vx = 0; u.vy = 0; if (A.t >= A.wind) { A.ph = 1; A.t = 0; unsquash(u); if (k === 'zlurk') A.i = 0; }
      return true;
    }
    if (k === 'zling') { // leap
      var d = .28, q = Math.min(1, A.t / d); u.x += (A.tx - u.x) * Math.min(1, dt / Math.max(.01, d - A.t + dt)); u.y += (A.ty - u.y) * Math.min(1, dt / Math.max(.01, d - A.t + dt)); u.h = Math.sin(q * Math.PI) * 60;
      if (A.t >= d) { u.h = 0; hitArea(u, A.tx, A.ty, 95, .04, 160); puff(A.tx, A.ty, '#ffd28a', 10); return false; } return true;
    }
    if (k === 'zspit') { if (!A.fired) { A.fired = 1; A.land = .55; } if (A.t >= A.land && !A.pool) { A.pool = 3; puff(A.tx, A.ty, '#9cff5a', 14); hitArea(u, A.tx, A.ty, 120, .03, 0); } if (A.pool) { A.pool -= dt; A.tick = (A.tick || 0) - dt; if (A.tick <= 0) { A.tick = .5; hitArea(u, A.tx, A.ty, 110, .012, 0); for (var i = 0; i < 4; i++) { var aa = Math.random() * 6.28, rr = Math.random() * 100; try { part(A.tx + Math.cos(aa) * rr, A.ty + Math.sin(aa) * rr, 0, 0, .6, '#8cff4a', 6, 3); } catch (e) {} } } if (A.pool <= 0) return false; } return true; }
    if (k === 'zbane') { hitArea(u, u.x, u.y, 150, .08, 260); puff(u.x, u.y, '#b8ff5a', 24); try { fx(1, u.x, u.y, 0); } catch (e) {} try { u.hp = 0; hurt(u, 99999, null, 0, 'x'); } catch (e) {} return false; }
    if (k === 'ztank' || k === 'zsled') { var dur = k === 'ztank' ? .45 : .5, sp = Math.hypot(A.x2 - u.x, A.y2 - u.y); var step = Math.min(sp, (k === 'ztank' ? 1800 : 1500) * dt); u.x += Math.cos(A.a) * step; u.y += Math.sin(A.a) * step; u.vx = Math.cos(A.a) * 900; u.vy = Math.sin(A.a) * 900; hitLine(u, u.x - Math.cos(A.a) * 60, u.y - Math.sin(A.a) * 60, u.x, u.y, k === 'ztank' ? 70 : 55, k === 'ztank' ? .09 : .04, k === 'ztank' ? 420 : 0); if (Math.random() < .6) puff(u.x, u.y, k === 'ztank' ? '#c8a27a' : '#ffd28a', 1, 6); if (A.t >= dur || sp < 10) { u.vx = u.vy = 0; return false; } return true; }
    if (k === 'zhopper') { var dd = .35, qq = Math.min(1, A.t / dd); u.x += (A.tx - u.x) * Math.min(1, dt / Math.max(.01, dd - A.t + dt)); u.y += (A.ty - u.y) * Math.min(1, dt / Math.max(.01, dd - A.t + dt)); if (A.t >= dd) { hitArea(u, A.tx, A.ty, 95, .04, 120); puff(A.tx, A.ty, '#ffd28a', 10); return false; } return true; }
    if (k === 'zlurk') { A.gap = (A.gap || 0) - dt; if (A.gap <= 0) { A.gap = .07; A.i++; var f = A.i / 10, sx = u.x + (A.x2 - u.x) * f, sy = u.y + (A.y2 - u.y) * f; hitArea(u, sx, sy, 60, .06, 220); puff(sx, sy, '#d8c8a8', 5, 30); } if (A.i >= 10) { unsquash(u); return false; } return true; }
    if (k === 'zplasma') { if (!A.fired) { A.fired = 1; var base = Math.atan2(A.ty - u.y, A.tx - u.x); for (var s = -1; s <= 1; s++) { var ang = base + s * .22, ex = u.x + Math.cos(ang) * 650, ey = u.y + Math.sin(ang) * 650; try { tele('line', { x: u.x, y: u.y, x2: ex, y2: ey, w: 40, t: .5, dmg: 0, src: null }); } catch (e) {} A['l' + s] = [ex, ey]; } } if (A.t >= .5 && !A.hit) { A.hit = 1; for (var s2 = -1; s2 <= 1; s2++) { var l = A['l' + s2]; hitLine(u, u.x, u.y, l[0], l[1], 40, .035, 0); for (var j = 1; j <= 6; j++) { try { part(u.x + (l[0] - u.x) * j / 6, u.y + (l[1] - u.y) * j / 6, 0, 0, .3, '#c58cff', 9, 40); } catch (e) {} } } return false; } return true; }
    return false;
  };
  // ------------------------------------------------------------------ elites
  var AFF = [['swift', L2('신속', 'Swift')], ['split', L2('분열', 'Splitting')], ['shield', L2('보호막', 'Shielded')], ['frenzy', L2('광폭', 'Frenzied')], ['vamp', L2('흡혈', 'Vampiric')]];
  var makeElite = function (u) {
    if (!u || u.boss || u.elite3 || !/^z/.test(u.cls || '') || u.cls === 'zqueen' || u.cls === 'ztitan') return; var a = AFF[Math.floor(Math.random() * AFF.length)];
    u.elite3 = 1; u.aff = a[0]; u.mhp *= 2.2; u.hp = u.mhp; try { u.slot.name = '[' + a[1] + '] ' + (u.slot.name || ''); } catch (e) {} if (a[0] === 'swift' && u.st) { u.st = Object.assign({}, u.st, { spd: u.st.spd * 1.45 }); } if (a[0] === 'shield') u.esh = u.mhp * .35;
    setTimeout(function () { try { var e = R3.units.get(u.id); if (e && e.mdl && e.mdl.wrap) e.mdl.wrap.scale.multiplyScalar(1.3); } catch (er) {} }, 300);
  };
  // ------------------------------------------------------------------ per frame
  var tick = function (dt) {
    var G0 = g(); if (!G0 || G0.over || window.__foesOff) return; var me = G0.local && G0.local.unit; if (!me) return;
    for (var i = 0; i < G0.units.length; i++) {
      var u = G0.units[i]; if (u.dead || u.team === me.team || u.boss || !CD[u.cls] && u.cls !== 'zroach') continue;
      if (u._fa) { if (!run(u, u._fa, dt) || u.dead) { u._fa = null; LIVE = Math.max(0, LIVE - 1); unsquash(u); u._fcd = rnd.apply(null, CD[u.cls] || [6, 9]); } continue; }
      if (u.cls === 'zroach') { if (!u._rg && u.hp < u.mhp * .35) { u._rg = 2; u._rgCd = 1; puff(u.x, u.y, '#c8a27a', 10); } if (u._rg > 0) { u._rg -= dt; u.vx = u.vy = 0; u.hp = Math.min(u.mhp, u.hp + u.mhp * .25 * dt); if (u._rg <= 0) { u._rg = -1; puff(u.x, u.y, '#c8a27a', 10); } } continue; }
      u._fcd = (u._fcd == null ? rnd(1, 5) : u._fcd) - dt; if (u._fcd > 0 || LIVE >= 5) continue;
      if (Math.hypot(u.x - me.x, u.y - me.y) > 1400) { u._fcd = 1; continue; }
      var tg = target(u); if (!tg) { u._fcd = 1; continue; } var R = RANGE[u.cls]; if (tg.d < R[0] || tg.d > R[1]) { u._fcd = .6; continue; }
      var A = start(u, tg); if (A) u._fa = A; else u._fcd = 3;
    }
  };
  // ------------------------------------------------------------------ hooks
  var hook = function () {
    if (window.__hkFoes || typeof step !== 'function' || typeof hurt !== 'function' || typeof spawnWave !== 'function' || typeof invSpawn !== 'function') return; window.__hkFoes = 1;
    var st0 = step; step = function (dt) { var r = st0.apply(this, arguments); try { tick(dt || 1 / 60); } catch (e) { window.__foesErr = String(e && e.stack || e).slice(0, 200); } return r; };
    var sw = spawnWave; spawnWave = function (n) { var r = sw.apply(this, arguments); try { if (window.__foesOff) return r; var b = BASES[1], add = function (c, k) { for (var i = 0; i < k; i++) invSpawn(c, b.x - 200 + rnd(-260, 260), b.y + rnd(-500, 500)); }; if (n >= 2) add('zbane', 1 + Math.floor(n / 2)); if (n >= 3) { add('zroach', 2); add('zsled', 1 + Math.floor(n / 3)); } if (n >= 4) add('zlurk', 1); } catch (e) {} return r; };
    var is0 = invSpawn; invSpawn = function () { var u = is0.apply(this, arguments); try { if (!window.__foesOff && Math.random() < .06) makeElite(u); } catch (e) {} return u; };
    var hu = hurt; hurt = function (u, amt, src) {
      try { if (u && u.elite3 && u.aff === 'shield' && u.esh > 0 && amt > 0) { var take = Math.min(u.esh, amt * .6); u.esh -= take; arguments[1] = amt - take; if (u.esh <= 0) puff(u.x, u.y, '#7fd8ff', 12, 40); } if (u && u._rg > 0 && amt > 0) arguments[1] = amt * .3; } catch (e) {}
      var d0 = u && u.dead; var r = hu.apply(this, arguments);
      try { var s = src && (src.unit || src); if (s && s.elite3 && s.aff === 'vamp' && !s.dead && amt > 0) s.hp = Math.min(s.mhp, s.hp + amt * .5); if (u && u.dead && !d0 && u.elite3 && u.aff === 'split') { for (var i = 0; i < 3; i++) invSpawn('zling', u.x + rnd(-60, 60), u.y + rnd(-60, 60)); puff(u.x, u.y, '#ffd28a', 12); } if (u && u.dead && !d0 && u._fa) { u._fa = null; LIVE = Math.max(0, LIVE - 1); } } catch (e) {}
      return r;
    };
  };
  setInterval(function () { try { hook(); var G0 = g(); if (!G0 || G0.over) LIVE = 0; } catch (e) {} }, 600);
  window.__foes = { live: function () { return LIVE; }, stat: STAT };
})();
