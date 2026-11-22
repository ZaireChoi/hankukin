/* ASCEND v3.62 — floor clean-up: no more yellow / orange circles on the ground
   · explosion rings (fx type 0, every kill and hit) and the gold/orange shock rings from heavy strikes are gone;
     the blast itself (fire ball, flash, sparks, scorch) stays, so impacts still read
   · small cool-coloured rings that carry meaning (heal green, EMP cyan, void purple) are kept but fainter
   · costs nothing: fewer meshes drawn, no new objects */
(function () {
  'use strict';
  var warm = function (col) {
    try { var c = new window.THREE.Color(col); var hsl = {}; c.getHSL(hsl); return hsl.h < .17 || hsl.h > .93; } catch (e) { return true; }
  };
  var hook = function () {
    var R = window.R3; if (!R || typeof R.fxRing !== 'function' || window.__floorHk) return; window.__floorHk = 1;
    var _r = R.fxRing;
    R.fxRing = function (x, h, z, r0, r1, col, life, op) { if (warm(col)) return; return _r.call(this, x, h, z, r0, Math.min(r1, 160), col, life, (op || 1) * .45); };
    try { if (typeof shockRing === 'function') shockRing = function () {}; } catch (e) {}
  };
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
