/* ASCEND v3.64 — lag pass + glow kept on low graphics
   Why effects looked cheap again: when a battle ran under 30 fps (or the GPU is an Intel/phone chip) the game switched itself to
   "low" graphics and stayed there — low had no glow pass at all, so blade trails, foot jets and missiles lost their light.
   (1) lite glow: on desktop "low" a small glow pass (fixed 480×270, cheap) brings the light back; it switches itself off again
       if the battle still runs below 24 fps with the resolution already at its floor
   (2) animation detail by distance: my frame and units near the camera animate every frame; units 800+ away every 2nd frame,
       1500+ away every 3rd (time is carried over, so motion speed is unchanged)
   (3) AI thinking: bots more than 1800 away from me think every 2nd step and keep moving on their last decision
   (4) infantry / minion contact shadows off on low graphics (one transparent draw each)
   (5) solid ground: rocks push units out at their visible size (+22 %), frames keep an extra margin for their wide shoulders
   (6) the transform cell on the skill bar takes mouse clicks again */
(function () {
  'use strict';
  var phone = function () { return !!window.__phone; };
  var lowMode = function () { try { return typeof gfxMode === 'function' && gfxMode() !== 'high'; } catch (e) { return false; } };
  var meU = function () { try { return G && G.local && G.local.unit; } catch (e) { return null; } };
  // ---------------------------------------------------------------- (1) lite glow
  var lite = { on: false, off: false, slow: 0 };
  var liteGlow = function () {
    var R = window.R3; if (!R || !R.r || !R.X || !R.X.EffectComposer || phone() || lite.off) return;
    if (!lowMode()) return;
    if (!lite.composer) {
      var X = R.X, T = window.THREE, c = new X.EffectComposer(R.r); c.addPass(new X.RenderPass(R.scene, R.cam));
      var b = new X.UnrealBloomPass(new T.Vector2(480, 270), .55, .42, .88); var bs = b.setSize; b.setSize = function (w, h) { bs.call(this, Math.min(w, 480), Math.min(h, 270)); };
      c.addPass(b); c.addPass(new X.OutputPass()); lite.composer = c; lite.bloom = b;
    }
    if (R.composer !== lite.composer && !(R.composer && !R.composerOff)) { lite.prev = R.composer; R.composer = lite.composer; }
    if (R.composer === lite.composer) { R.composerOff = false; try { lite.composer.setPixelRatio(R.r.getPixelRatio()); lite.composer.setSize(VW, VH); } catch (e) {} lite.on = true; }
  };
  var liteWatch = function (dt) {
    if (!lite.on || !G || G.over) return; var d = window.__drs; if (!d) return;
    if (d.fps < 24 && d.pr <= .62) lite.slow += dt; else lite.slow = Math.max(0, lite.slow - dt);
    if (lite.slow > 8) { lite.off = true; lite.on = false; var R = window.R3; if (R && R.composer === lite.composer) { R.composer = lite.prev || null; R.composerOff = true; } }
  };
  // ---------------------------------------------------------------- hooks (each wraps exactly once)
  var hook = function () {
    var R = window.R3; if (!R || !R.ready) return;
    if (!window.__pfGfx && typeof R.applyGfx === 'function') { window.__pfGfx = 1; var ag = R.applyGfx; R.applyGfx = function () { var r = ag.apply(this, arguments); try { if (lowMode()) liteGlow(); else if (R.composer === lite.composer) { R.composer = lite.prev || null; } } catch (e) {} return r; }; liteGlow(); }
    if (!window.__pfAnim && typeof R.animate === 'function') { window.__pfAnim = 1; var an = R.animate;
      R.animate = function (e, u, dt, now) {
        var me = meU(); if (u && me && u !== me && !u.boss && !u.fbs) { var d = Math.hypot(u.x - me.x, u.y - me.y), k = d > 1500 ? 3 : d > 800 ? 2 : 1;
          if (k > 1) { e._anA = (e._anA || 0) + dt; e._anN = (e._anN || 0) + 1; if (e._anN < k) return; dt = e._anA; e._anA = 0; e._anN = 0; } }
        if (lowMode() && e && e.blob && u && (u.arm === 'inf' || u.aMinion) && e.blob.visible) e.blob.visible = false;
        return an.call(this, e, u, dt, now);
      }; }
    if (!window.__pfBot && typeof botInput === 'function') { window.__pfBot = 1; var bi = botInput;
      botInput = function (s, u, dt) { var me = meU();
        if (me && u && u._biL && Math.hypot(u.x - me.x, u.y - me.y) > 1800) { u._biN = (u._biN || 0) + 1; if (u._biN & 1) { var c = {}; for (var k in u._biL) c[k] = u._biL[k]; c.a1 = c.a2 = c.ul = c.ab = false; return c; } }
        var r = bi(s, u, dt); if (u) u._biL = r; return r; }; }
    if (!window.__pfCol && typeof collideGround === 'function') { window.__pfCol = 1; var cg = collideGround;
      collideGround = function (u) { cg(u); try { if (typeof rocksIn !== 'function') return; var extra = u.cls === 'arkframe' ? u.r * .35 : 0;
          for (var k of rocksIn(u.x, u.y, u.r + 60)) { if (MAP.space && Math.abs((u.z || 0) - (k.z || 0)) > k.r + u.r) continue; var R2 = k.r * 1.22 + u.r + extra, dx = u.x - k.x, dy = u.y - k.y; if (dx > R2 || dx < -R2 || dy > R2 || dy < -R2) continue; var d = Math.hypot(dx, dy) || .01; if (d < R2) { u.x = k.x + dx / d * R2; u.y = k.y + dy / d * R2; } } } catch (e) {} }; }
    if (!window.__pfStep && typeof step === 'function') { window.__pfStep = 1; var st = step; step = function (dt) { st(dt); try { liteWatch(dt); } catch (e) {} }; }
  };
  // (6) transform cell clickable
  var css = document.createElement('style'); css.textContent = '#skb2 .sk2{pointer-events:auto!important;cursor:pointer}#skb2 .sk2:hover{filter:brightness(1.25)}#skb2 .sk2:active{transform:scale(.94)}'; document.head.appendChild(css);
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
  window.__perf = { lite: lite };
})();
