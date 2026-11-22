/* ASCEND v3.64 — melee you can read: the blade goes to the enemy and visibly cuts it
   · step-in: when a frame starts a swing, it turns to the nearest foe in front and closes the gap (≤110 units in 0.1 s),
     so the blade arc actually passes through the target instead of swinging at air beside it
   · on every melee hit: a bright cut streak across the target along the swing, a white hit flash on the body, sparks,
     a short knock-back, and (for my own hits) a 45–90 ms hit-stop so each blow lands with weight
   Cost: two small sprite pools (≤10 sprites each, created once), no per-hit allocation. */
(function () {
  'use strict';
  var T, CUT = [], FLASH = [], ci = 0, fi = 0, tex1 = null, tex2 = null;
  var mkTex = function (streak) {
    var c = document.createElement('canvas'); c.width = streak ? 256 : 64; c.height = streak ? 32 : 64; var g = c.getContext('2d');
    if (streak) { var gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.45, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 12, 256, 8); var g2 = g.createLinearGradient(0, 0, 256, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(.5, 'rgba(255,255,255,.35)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = g2; g.fillRect(0, 6, 256, 20); }
    else { var r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.6)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); }
    var t = new T.CanvasTexture(c); t.userData = { keep: 1 }; return t;
  };
  var pool = function (arr, tex, n) { for (var i = 0; i < n; i++) { var s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); s.visible = false; s.renderOrder = 9; s.userData = { keep: 1, l: 0, ml: 1 }; arr.push(s); } };
  var ready = function () { if (CUT.length) return true; T = window.THREE; if (!T || !window.R3 || !R3.scene) return false; tex1 = mkTex(true); tex2 = mkTex(false); pool(CUT, tex1, 10); pool(FLASH, tex2, 10); return true; };
  var attach = function () { var sc = R3.scene; for (var i = 0; i < CUT.length; i++) { if (CUT[i].parent !== sc) sc.add(CUT[i]); if (FLASH[i].parent !== sc) sc.add(FLASH[i]); } };
  var uh = function (u) { try { return unitH(u); } catch (e) { return 0; } };
  var blade = function (a) { try { var m = (typeof MELT !== 'undefined' && MELT[a.melSub]) || null; return m && m.col ? '#' + m.col.toString(16).padStart(6, '0') : (a.team === (G.local && G.local.unit && G.local.unit.team) ? '#ff9be8' : '#ff6a6a'); } catch (e) { return '#ffffff'; } };
  // ---------------------------------------------------------------- hit feedback
  var last = new WeakMap();
  var onHit = function (u, a, ang) {
    if (!ready()) return; attach(); var now = performance.now(); var lt = last.get(u) || 0; if (now - lt < 60) return; last.set(u, now);
    var h = uh(u) + Math.max(26, (u.r || 20) * 1.1), big = (u.r || 20) > 26;
    var s = CUT[ci++ % CUT.length]; s.position.set(u.x, h, u.y); var len = (u.r || 20) * 4.2 + 40; s.scale.set(len, len * .16, 1);
    // the streak lies across the swing: rotate in screen space by the swing direction (approximation from the top camera)
    s.material.rotation = -(ang || 0) + Math.PI / 2 + (Math.random() - .5) * .5; s.material.color.set(blade(a)); s.material.opacity = 1; s.visible = true; s.userData.l = s.userData.ml = .16;
    var f = FLASH[fi++ % FLASH.length]; f.position.set(u.x, h, u.y); var fs = (u.r || 20) * 3.4; f.scale.set(fs, fs, 1); f.material.color.set('#ffffff'); f.material.opacity = .9; f.visible = true; f.userData.l = f.userData.ml = .1;
    try { for (var i = 0; i < (window.__phone ? 4 : 7); i++) { var b = (ang || 0) + (Math.random() - .5) * 1.4, sp = 160 + Math.random() * 260; part(u.x, u.y, Math.cos(b) * sp, Math.sin(b) * sp, .22, i % 2 ? '#ffffff' : blade(a), 3.5, h); } } catch (e) {}
    // knock-back (small units more), flinch timer for any animation code that reads it
    if (!u.boss && !u.fbs && u.cls !== 'sentry') { var kb = big ? 8 : 18; u.x += Math.cos(ang || 0) * kb; u.y += Math.sin(ang || 0) * kb; u._flinch = .15; }
    if (G.local && a === G.local.unit) { G.hstop = Math.max(G.hstop || 0, big ? .09 : .045); try { cam.shake = Math.min(10, (cam.shake || 0) + (big ? 3 : 1.5)); } catch (e) {} }
  };
  var tick = function (dt) {
    for (var i = 0; i < CUT.length; i++) { var s = CUT[i]; if (s.visible) { s.userData.l -= dt; var k = s.userData.l / s.userData.ml; if (k <= 0) s.visible = false; else { s.material.opacity = k; s.scale.y *= .9 + .1 * k; } }
      var f = FLASH[i]; if (f.visible) { f.userData.l -= dt; var k2 = f.userData.l / f.userData.ml; if (k2 <= 0) f.visible = false; else f.material.opacity = .9 * k2; } }
  };
  // ---------------------------------------------------------------- step-in at swing start
  var stepIn = function (a) {
    if (a.dead || a.stun > 0) return; var reach = 175; try { var m = MELT[a.melSub]; if (m && m.rng) reach = m.rng; } catch (e) {}
    var best = null, bd = 1e9, aa = a.aa != null ? a.aa : a.a; for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (e.dead || e.team === a.team || e.team === 2) continue; var dx = e.x - a.x, dy = e.y - a.y, d = Math.hypot(dx, dy); if (d > reach * 1.9 + (e.r || 0)) continue; var da = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - aa), Math.cos(Math.atan2(dy, dx) - aa))); if (da > 1.25) continue; var sc = d + da * 120; if (sc < bd) { bd = sc; best = e; } }
    if (!best) return; var dx2 = best.x - a.x, dy2 = best.y - a.y, d2 = Math.hypot(dx2, dy2) || 1; a.aa = Math.atan2(dy2, dx2);
    var gap = d2 - (reach * .62 + (best.r || 0)); if (gap > 4) { var mv = Math.min(110, gap); a._mg = { vx: dx2 / d2 * mv / .1, vy: dy2 / d2 * mv / .1, t: .1 }; }
  };
  var seen = new WeakMap();
  var hook = function () {
    if (!window.__mlHurt && typeof hurt === 'function') { window.__mlHurt = 1; var hu = hurt;
      hurt = function (u, amt, src, ang, dt) { var hp0 = u && u.hp; var r = hu(u, amt, src, ang, dt);
        try { var a = src && src.unit; if (a && u && u.hp < hp0 && a.cls === 'arkframe' && (dt === 'm' || (a.melSw && a.melSw.t <= (a.melSw.T || .3) + .12) || a.slashT > 0 || a.lunge)) onHit(u, a, ang != null ? ang : Math.atan2(u.y - a.y, u.x - a.x)); } catch (e) {}
        return r; }; }
    if (!window.__mlStep && typeof step === 'function') { window.__mlStep = 1; var st = step;
      step = function (dt) { st(dt);
        try { if (!G || G.over) return; for (var i = 0; i < G.units.length; i++) { var a = G.units[i]; if (a.cls !== 'arkframe' || a.dead) continue;
            if (a.melSw && seen.get(a) !== a.melSw) { seen.set(a, a.melSw); stepIn(a); }
            if (a._mg && a._mg.t > 0) { var k = Math.min(dt, a._mg.t); a.x += a._mg.vx * k; a.y += a._mg.vy * k; a._mg.t -= k; try { collideGround(a); } catch (e) {} } }
          tick(dt); } catch (e) {} }; }
  };
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
