/* ASCEND v3.97 — hit feel layer (user 2026-11-24: "타격감을 더욱 올리자")
   · phone vibration on hits I land / heavy hits I take / kills (Settings: P.haptic=false turns it off)
   · directional camera punch: the camera is nudged along the blow, not shaken at random; frame/elite kills add a short zoom-in
   · combo counter: "N HIT" pops near the centre after 3 chained hits, grows with the chain, gold from 10, red from 25
   Wraps once: window.__hkFeel. Cheap: a few numbers per hit, one DOM node. */
(function () {
  'use strict';
  var g = function () { return typeof G !== 'undefined' ? G : null; };
  var pp = function () { return typeof P !== 'undefined' ? P : null; };
  var touch = function () { try { return !!(window.touchMode || window.__phone || matchMedia('(pointer:coarse)').matches); } catch (e) { return false; } };
  var lastVib = 0;
  var vib = function (ms) { try { var p = pp(); if (p && p.haptic === false) return; if (!touch() || !navigator.vibrate) return; var n = performance.now(); if (n - lastVib < 70) return; lastVib = n; navigator.vibrate(ms); } catch (e) {} };
  // ---------------------------------------------------------------- camera punch
  var K = { x: 0, z: 0, vx: 0, vz: 0, fov: 0 };
  var punch = function (ang, amt) { if (!window.__punchOn) return; /* v3.98 stability: camera punch off by default */ if (!isFinite(ang) || !isFinite(amt)) return; K.x = Math.max(-30, Math.min(30, K.x + Math.cos(ang) * amt * 9)); K.z = Math.max(-30, Math.min(30, K.z + Math.sin(ang) * amt * 9)); };
  var camHook = function () {
    if (window.__hkFeelCam || !window.R3 || !R3.r || !R3.cam) return; window.__hkFeelCam = 1;
    var rr = R3.r.render.bind(R3.r), lastT = performance.now();
    R3.r.render = function (sc, cam) {
      var n = performance.now(), dt = Math.min(.05, (n - lastT) / 1000); lastT = n;
      // spring back to rest
      /* v3.97: plain exponential return (a stiff spring blew up at low frame rates and sent the camera to infinity = black screen) */
      var dk = Math.exp(-dt * 13); K.x *= dk; K.z *= dk; if (!isFinite(K.x) || Math.abs(K.x) < .05) K.x = 0; if (!isFinite(K.z) || Math.abs(K.z) < .05) K.z = 0; if (!isFinite(K.fov)) K.fov = 0;
      K.fov *= Math.max(0, 1 - dt * 9);
      var c = (cam === R3.cam) ? cam : null, f0 = 0;
      if (c && (K.x || K.z || K.fov > .02)) { c.position.x += K.x; c.position.z += K.z; if (c.isPerspectiveCamera && K.fov > .02) { f0 = c.fov; c.fov = f0 - K.fov; c.updateProjectionMatrix(); } }
      try { return rr(sc, cam); } finally { if (c && (K.x || K.z || f0)) { c.position.x -= K.x; c.position.z -= K.z; if (f0) { c.fov = f0; c.updateProjectionMatrix(); } } }
    };
  };
  // ---------------------------------------------------------------- combo counter
  var CB = { n: 0, t: 0, el: null, hideT: 0 };
  var comboEl = function () {
    if (CB.el) return CB.el; var el = document.createElement('div'); el.id = 'feelCombo';
    el.style.cssText = 'position:fixed;left:58%;top:28%;white-space:nowrap;z-index:60;pointer-events:none;font:900 24px Rajdhani,"Noto Sans KR",sans-serif;font-style:italic;letter-spacing:.02em;color:#fff;text-shadow:0 0 8px rgba(0,0,0,.8),0 2px 0 rgba(0,0,0,.6);opacity:0;transition:opacity .25s;transform-origin:center';
    document.body.appendChild(el); CB.el = el; return el;
  };
  var comboHit = function () {
    var now = performance.now(); if (now - CB.t > 1600) CB.n = 0; CB.n++; CB.t = now;
    if (CB.n < 3) return; var el = comboEl(), n = CB.n;
    el.innerHTML = n + '<span style="font-size:.5em;margin-left:4px">HIT</span>';
    el.style.color = n >= 50 ? '#ffb070' : n >= 10 ? '#ffd166' : '#ffffff';
    el.style.transition = 'none'; el.style.opacity = '1'; el.style.transform = 'scale(1.25)';
    void el.offsetWidth; el.style.transition = 'transform .14s ease-out, opacity .4s'; el.style.transform = 'scale(1)';
    clearTimeout(CB.hideT); CB.hideT = setTimeout(function () { el.style.opacity = '0'; }, 1500);
  };
  // ---------------------------------------------------------------- hurt hook
  var hook = function () {
    if (window.__hkFeel || typeof hurt !== 'function') return; window.__hkFeel = 1; var hu = hurt;
    hurt = function (e, amt, src, ang, dt) {
      var G0 = g(), me = G0 && G0.local && G0.local.unit, hp0 = e ? e.hp : 0, dead0 = e && e.dead;
      var r = hu.apply(this, arguments);
      try {
        if (!G0 || !me || !e || e.hp >= hp0) return r;
        var mine = e !== me && (src === G0.local || (src && (src === me || src.ownerSlot === G0.local)));
        if (mine) {
          var d = Math.hypot(e.x - me.x, e.y - me.y), melee = d < (e.r || 14) + 230, heavy = (hp0 - e.hp) >= (e.mhp || 1) * .22 || dt === 'x';
          var a = Math.atan2(e.y - me.y, e.x - me.x), big = e.cls === 'arkframe' || e.boss || e.elite2;
          if (melee || heavy) { punch(a, heavy ? 1.6 : 1); vib(heavy ? 18 : 9); }
          if (e.dead && !dead0) { if (big) { K.fov = Math.max(K.fov, 3.2); punch(a, 2.2); vib([25, 30, 40]); } else vib(12); }
          comboHit();
        } else if (e === me && (hp0 - e.hp) >= (e.mhp || 1) * .06) {
          var s = src && (src.unit || src), a2 = s && s.x != null ? Math.atan2(me.y - s.y, me.x - s.x) : Math.random() * 6.28; punch(a2, 1.2); vib(22);
        }
      } catch (er) { window.__feelErr = String(er).slice(0, 160); }
      return r;
    };
  };
  setInterval(function () { try { hook(); camHook(); } catch (e) {} }, 600);
  window.__feel = { K: K, combo: CB };
})();
