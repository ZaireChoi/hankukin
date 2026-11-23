/* ASCEND v3.81: the ghost copies of the weapon looked cluttered (user) - they are off (window.__bgCopies = true turns them back on).
   This module still marks swings that hit (u._bgHit), which the single soft swing trail in index.html uses (shown on hits, ~0.1 s).
   ASCEND v3.75 — ghost blades: the sword leaves copies of itself along its swing, the way the frame leaves afterimages
   when it dashes. Every 40 ms of a swing a see-through copy of the blade is left exactly where the blade was (its real
   position and angle), glowing in the blade colour and held until the swing finishes and then fading out together over a quarter second — so the whole swing, from where it
   started to where it finished, stays readable for a moment.
   Lag: a pool of 14 copies per frame for my frame and up to 2 nearby frames; copies share geometry with the real blade. */
(function () {
  'use strict';
  var T = null, POOLS = new Map(), MAXU = 3; window.__bgPools = POOLS;
  var swinging = function (u) { return u.slashT > 0 || u.melT > 0 || !!u.lunge || !!(u.melSw && u.melSw.t < (u.melSw.T || .3) + .05) || !!(u.melSw2 && u.melSw2.t < (u.melSw2.T || .3) + .05); };
  var mkPool = function (S, sab) {
    var arr = []; for (var i = 0; i < 14; i++) {
      var g = new T.Group(); g.matrixAutoUpdate = false; g.visible = false; g.userData = { keep: 1, l: 0 };
      S.traverse(function (o) { if (!o.isMesh || !o.visible && o !== S.userData.core) return; var gm = (S.userData.glow && S.userData.glow.material) || (sab && sab.userData && sab.userData.glow && sab.userData.glow.material); var bc = (gm && gm.color) ? gm.color.clone() : new T.Color(0xff7ae0); /* ghosts take the blade colour; the white core becomes a light tint of it */ var col = (o === S.userData.core) ? bc.clone().lerp(new T.Color(0xffffff), .45) : bc;
        var c = new T.Mesh(o.geometry, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); c.matrixAutoUpdate = false; c.userData = { keep: 1, rel: null, o: o }; g.add(c); });
      arr.push(g); }
    return { arr: arr, i: 0, acc: 0, S: S };
  };
  var LIFE = .1;
  var snap = function (P, scene, vis) {
    var g = P.arr[P.i++ % P.arr.length]; if (g.parent !== scene) scene.add(g); g.matrix.identity(); g.matrixWorldNeedsUpdate = true;
    for (var k = 0; k < g.children.length; k++) { var c = g.children[k], o = c.userData.o; o.updateMatrixWorld(true); c.matrix.copy(o.matrixWorld); c.matrixWorldNeedsUpdate = true; c.material.opacity = (o === P.S.userData.core ? .75 : .45); }
    /* v3.76: copies are only shown when the swing actually hits something, and each lasts ~0.1 s */ g.userData.born = performance.now(); g.userData.l = g.userData.ml = LIFE; g.visible = !!vis; g.userData.pend = !vis;
  };
  var tick = function (dt) {
    T = T || window.THREE; if (!T || !window.R3 || !R3.units || !G || G.over) return; var me = G.local && G.local.unit, used = 0;
    var list = [me]; for (var i = 0; i < G.units.length && list.length < MAXU; i++) { var u = G.units[i]; if (u !== me && u.cls === 'arkframe' && !u.dead && me && Math.hypot(u.x - me.x, u.y - me.y) < 900) list.push(u); }
    list.forEach(function (u) { if (!u || u.dead) return; var e = R3.units.get(u.id); /* the weapon actually on screen: my frame holds a Meshy weapon model (eq.o.melH) in the fist, others hold the energy blade */
      var sab = e && e.mfx && e.mfx.saber, mh = e && e.eq && e.eq.o && e.eq.o.melH; var S = (mh && mh.visible) ? mh : sab; if (!S || !S.visible || !S.parent || !e.root.parent) return;
      var P = POOLS.get(e); if (!P || P.S !== S) { if (P) P.arr.forEach(function (g) { if (g.parent) g.parent.remove(g); }); P = mkPool(S, sab); POOLS.set(e, P); }
      var on = swinging(u); var sk = u.melSw2 || u.melSw || null, st = u.slashT || 0;
      /* a new swing starts when the swing record changes or the swing timer jumps back up (combo chains never let it reach zero) */
      if (on && (!P.on || sk !== P.sk || st > (P.st || 0) + .02)) { P.sw0 = performance.now(); P.shown = false; P.arr.forEach(function (g) { g.userData.pend = false; }); } P.on = on; P.sk = sk; P.st = st;
      var hit = (u._bgHit || 0) >= (P.sw0 || 0) && on;
      if (hit && !P.shown) { P.shown = true; /* reveal the copies already taken in this swing: the path from the start of the swing to the hit */ P.arr.forEach(function (g) { if (g.userData.pend && g.userData.born >= P.sw0 && performance.now() - g.userData.born < 350) { g.userData.pend = false; g.visible = true; g.userData.l = g.userData.ml = LIFE; } }); }
      if (on && window.__bgCopies) { P.acc += dt; if (P.acc >= .03) { P.acc = 0; snap(P, e.root.parent, hit); } } else { P.acc = .03; P.arr.forEach(function (g) { g.userData.pend = false; }); } });
    POOLS.forEach(function (P, e) { for (var j = 0; j < P.arr.length; j++) { var g = P.arr[j]; if (!g.visible) continue; g.userData.l -= dt; var k = g.userData.l / g.userData.ml; if (k <= 0) { g.visible = false; continue; } for (var c = 0; c < g.children.length; c++) { var m = g.children[c].material; m.opacity = (g.children[c].userData.o === P.S.userData.core ? .75 : .45) * k * k; } }
      if (!e.root.parent) { P.arr.forEach(function (g) { if (g.parent) g.parent.remove(g); }); POOLS.delete(e); } });
  };
  var hook = function () {
    if (!window.__bgHurt && typeof hurt === 'function') { window.__bgHurt = 1; var hu = hurt; hurt = function (v, amt, src, ang, dt) { var hp0 = v && v.hp; var r = hu(v, amt, src, ang, dt); try { var a = src && src.unit; if (a && v && v.hp < hp0 && a.team !== v.team && swinging(a)) a._bgHit = performance.now(); } catch (er) {} return r; }; } if (window.__bgStep || typeof step !== 'function') return; window.__bgStep = 1; var st = step; step = function (dt) { st(dt); try { tick(dt); } catch (e) { window.__bgErr = String(e).slice(0, 160); } }; };
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
