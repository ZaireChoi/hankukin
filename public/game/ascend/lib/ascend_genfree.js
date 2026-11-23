/* ASCEND v3.90 — free the graphics memory of a finished battle (user: top priority before launch)
   Measured: geometries/textures grew 66/77 -> 155/179 -> 5v5 195/304 from battle to battle (nothing grew inside a battle).
   Every geometry, material and picture that the renderer actually draws is noted with the time it was last drawn.
   When a battle ends and the next screen / battle has been running a few seconds, everything that has not been drawn since
   is released from the graphics card (dispose). Anything still referenced simply uploads again if it is ever drawn later,
   so nothing breaks; shared frame models that are drawn in the next battle are, by definition, still in use and stay.
   Also clears the renderer's draw lists. Wraps once: window.__hkGenRBD. Debug: window.__genfree.stat() */
(function () {
  'use strict';
  var GEO = new Map(), MAT = new Map(), TEX = new Map(), last = { geometries: 0, textures: 0 }, runs = [], R = null;
  var TEXKEYS = ['map', 'alphaMap', 'aoMap', 'bumpMap', 'emissiveMap', 'envMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap', 'specularMap', 'displacementMap', 'gradientMap', 'matcap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap', 'transmissionMap', 'thicknessMap'];
  var now = function () { return performance.now(); };
  var noteMat = function (m, t) {
    if (!m) return; MAT.set(m, t);
    for (var i = 0; i < TEXKEYS.length; i++) { var x = m[TEXKEYS[i]]; if (x && x.isTexture) TEX.set(x, t); }
    var u = m.uniforms; if (u) for (var k in u) { var v = u[k] && u[k].value; if (v && v.isTexture) TEX.set(v, t); }
  };
  var hook = function () {
    var r3 = window.R3; if (!r3 || !r3.r) return false; R = r3.r; if (window.__hkGenRBD) return true; window.__hkGenRBD = 1;
    var rbd = R.renderBufferDirect;
    R.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
      var t = now(); if (geo) GEO.set(geo, t); if (mat) noteMat(mat, t);
      if (obj && obj.isSkinnedMesh && obj.skeleton && obj.skeleton.boneTexture) TEX.set(obj.skeleton.boneTexture, t);
      return rbd.apply(this, arguments);
    };
    return true;
  };
  var keep = function (x) { return x && x.userData && (x.userData.keep || x.userData.genKeep); };
  // release what has not been drawn for `age` ms
  var sweep = function (age, why) {
    if (!R) return null; var t0 = now(), cut = t0 - age, g = 0, m = 0, x = 0;
    var before = { geometries: R.info.memory.geometries, textures: R.info.memory.textures };
    GEO.forEach(function (t, geo) { if (t < cut && !keep(geo)) { try { geo.dispose(); } catch (e) {} GEO.delete(geo); g++; } });
    TEX.forEach(function (t, tx) { if (t < cut && !keep(tx)) { try { tx.dispose(); } catch (e) {} TEX.delete(tx); x++; } });
    MAT.forEach(function (t, mt) { if (t < cut && !keep(mt)) { try { mt.dispose(); } catch (e) {} MAT.delete(mt); m++; } });
    try { R.renderLists.dispose(); } catch (e) {}
    var after = { geometries: R.info.memory.geometries, textures: R.info.memory.textures };
    var rec = { why: why, ms: Math.round(now() - t0), geo: g, mat: m, tex: x, before: before, after: after };
    runs.push(rec); if (runs.length > 12) runs.shift(); return rec;
  };
  // battle transitions: the battle object changes (new battle) or goes away (menu)
  var lastG = null, pend = 0, pendWhy = '';
  setInterval(function () {
    try {
      if (!hook()) return; var g = (typeof G !== 'undefined') ? G : null; var t = now();
      if (g !== lastG) { if (lastG) { pend = t + (g ? 6000 : 3500); pendWhy = g ? 'new battle' : 'menu'; } lastG = g; }
      if (pend && t > pend) { pend = 0; sweep(g ? 5000 : 3000, pendWhy); }
    } catch (e) { window.__genErr = String(e).slice(0, 160); }
  }, 500);
  window.__genfree = {
    stat: function () { return { tracked: { geo: GEO.size, mat: MAT.size, tex: TEX.size }, mem: R ? { geometries: R.info.memory.geometries, textures: R.info.memory.textures } : null, runs: runs.slice(-4), err: window.__genErr || null }; },
    sweep: function (age) { return sweep(age || 3000, 'manual'); }
  };
})();
