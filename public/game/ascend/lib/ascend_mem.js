/* ASCEND v3.60 — memory and draw-call housekeeping (all modes)
   (1) every geometry / texture made while a match runs is registered; every 5 s the ones that are no longer in the scene for two sweeps
       running are freed (loaded model files are kept; pooled effects that come back simply upload again). On leaving a match the
       match's leftovers are freed at once, so the next match starts near the first one's numbers.
   (2) radial-glow canvas textures are made once per look and shared (they were a new texture per use).
   (3) ground rings: only frames, elites, bosses and my own unit keep their team ring; infantry and minions drop theirs
       (60 rings = 60 draw calls in a 60-unit battle). */
(function () {
  'use strict';
  var REG = { g: new Map(), t: new Map() }, ST = { freedG: 0, freedT: 0, sweeps: 0, rings: 0 };
  var inMatch = function () { try { return typeof G !== 'undefined' && G && G.local; } catch (e) { return false; } };
  var hook = function () {
    var T = window.THREE; if (!T || T.BufferGeometry.prototype.__memHook) return !!T;
    var BG = T.BufferGeometry.prototype; BG.__memHook = 1;
    var sa = BG.setAttribute; BG.setAttribute = function (n, a) { if (n === 'position' && inMatch() && !REG.g.has(this)) REG.g.set(this, 0); return sa.call(this, n, a); };
    var gd = BG.dispose; BG.dispose = function () { REG.g.delete(this); return gd.call(this); };
    var P = T.Texture.prototype, d = Object.getOwnPropertyDescriptor(P, 'needsUpdate');
    if (d && d.set) Object.defineProperty(P, 'needsUpdate', { set: function (v) { if (v && inMatch() && !REG.t.has(this) && !this.isRenderTargetTexture) REG.t.set(this, 0); d.set.call(this, v); }, get: function () { return d.get ? d.get.call(this) : undefined; }, configurable: true });
    var td = P.dispose; P.dispose = function () { REG.t.delete(this); return td.call(this); };
    return true;
  };
  var protectedSet = function () {
    var s = new Set();
    try { for (var k in MC) { var c = MC[k]; if (c && c.g && c.g.scene) c.g.scene.traverse(function (o) { if (o.geometry) s.add(o.geometry); var m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(function (x) { for (var p in x) { var v = x[p]; if (v && v.isTexture) s.add(v); } }); if (o.skeleton && o.skeleton.boneTexture) s.add(o.skeleton.boneTexture); }); } } catch (e) {}
    try { if (R3 && R3.scene && R3.scene.environment) s.add(R3.scene.environment); if (R3 && R3.scene && R3.scene.background && R3.scene.background.isTexture) s.add(R3.scene.background); } catch (e) {}
    return s;
  };
  var liveSet = function () {
    var s = new Set(); if (!R3 || !R3.scene) return s;
    var addM = function (x) { for (var p in x) { var v = x[p]; if (v && v.isTexture) s.add(v); } if (x.uniforms) for (var u in x.uniforms) { var uv = x.uniforms[u] && x.uniforms[u].value; if (uv && uv.isTexture) s.add(uv); } };
    var walk = function (root) { root.traverse(function (o) { if (o.geometry) s.add(o.geometry); var m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(addM); if (o.skeleton && o.skeleton.boneTexture) s.add(o.skeleton.boneTexture); }); };
    walk(R3.scene);
    try { for (var e of R3.units.values()) if (e.root && !e.root.parent) walk(e.root); } catch (e) {}       // far units are taken off the scene but come back
    return s;
  };
  var sweep = function (hard) {
    if (!window.THREE || !R3 || !R3.r) return; ST.sweeps++;
    var live = liveSet(), prot = protectedSet();
    var run = function (map, kind) { map.forEach(function (n, o) { if (live.has(o) || prot.has(o)) { map.set(o, 0); return; } if (hard || n >= 1) { map.delete(o); try { o.dispose(); } catch (e) {} if (kind === 'g') ST.freedG++; else ST.freedT++; } else map.set(o, n + 1); }); };
    run(REG.g, 'g'); run(REG.t, 't');
  };
  // (2) shared radial glows
  var memoRad = function () { if (!R3 || !R3.radTex || R3.radTex.__memo) return; var o = R3.radTex, cache = {}; var f = function (stops, size) { var k = JSON.stringify(stops) + '|' + (size || 128); var t = cache[k]; if (t) return t; t = cache[k] = o.call(this, stops, size); t.__shared = 1; return t; }; f.__memo = 1; R3.radTex = f; };
  // (3) rings
  var ringTick = function () {
    if (!R3 || !R3.units || !inMatch()) return; var me = G.local.unit;
    R3.units.forEach(function (e, id) { if (!e.ring || e._ringOff) return; var u = null; try { u = G.umap ? G.umap.get(id) : null; } catch (er) {} if (!u) { for (var i = 0; i < G.units.length; i++) if (G.units[i].id === id) { u = G.units[i]; break; } } if (!u || u === me) return;
      var c = (typeof CL !== 'undefined' && CL[u.cls]) || {}; var big = u.cls === 'arkframe' || u.boss || u.elite || u.elite2 || u.named || u.eMech || c.arm === 'heavy' || c.cat === 3;
      if (!big) { e._ringOff = 1; if (e.ring.parent) e.ring.parent.remove(e.ring); ST.rings++; } });
  };
  var wasIn = false, t5 = 0;
  setInterval(function () { try { hook(); memoRad(); var now = inMatch(); if (wasIn && !now) { setTimeout(function () { sweep(true); }, 1200); } wasIn = !!now; if (now) { ringTick(); t5 += .5; if (t5 >= 5) { t5 = 0; sweep(false); } } } catch (e) { (window.__memErr = window.__memErr || []).push(String(e).slice(0, 120)); } }, 500);
  window.__mem = { stat: function () { return { regG: REG.g.size, regT: REG.t.size, freedG: ST.freedG, freedT: ST.freedT, sweeps: ST.sweeps, ringsOff: ST.rings }; }, sweep: sweep };
})();
