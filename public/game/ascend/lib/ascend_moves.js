/* ASCEND v3.73 — MARTIAL MOTION LIBRARY: real full-body sword / combat motions for every frame
   Source: Meshy animation library (motion-captured fighting moves), generated once on the Saber rig and packed into
   models/anim_combat.bin (bone rotations only, 378 KB). Each move is cut to its active part (wind-up → strike → recovery).
   Moves: slash_l (Left Slash), combo2, combo3 (Double / Triple Combo), judgment (Sword Judgment), reap (Reaping Swing),
          spin2 (Double Blade Spin), spinR (Rightward Spin), hammer (Heavy Hammer Swing), slam (Charged Ground Slam),
          flykick, counter, dodge, parry, and hit reactions: hit, facehit, flyup (blown up), knock (knock-down), electro.
   Use: · basic melee combo: 1st swing Left Slash, 2nd Double Combo, finisher Heavy Swing (twin blades: Double Blade Spin)
        · weapon arts: 반월참 → Reaping Swing, 선풍 → Rightward Spin, axe/mace/hammer → Charged Ground Slam,
          great sword → Sword Judgment, saber / twin / dagger → Triple Combo, katana → Left Slash
        · frames that are hit hard play a hit reaction (blown up on very heavy hits, electrocuted by EMP)
   Same bone names on every Meshy-rigged frame, so one library drives all frames. Lag: clips built once and shared. */
(function () {
  'use strict';
  var LIB = null, loading = false, T = null;
  var load = function () {
    if (LIB || loading || !window.THREE) return; loading = true; T = window.THREE;
    Promise.all([fetch('models/anim_combat.json?v=373').then(function (r) { return r.json(); }), fetch('models/anim_combat.bin?v=373').then(function (r) { return r.arrayBuffer(); })]).then(function (R) {
      var J = R[0], A = new Int16Array(R[1]), fps = J.fps, out = {};
      J.clips.forEach(function (c) {
        var w0 = Math.round(c.win[0] * fps), w1 = Math.round(c.win[1] * fps), n = Math.max(2, w1 - w0 + 1), times = new Float32Array(n); for (var f = 0; f < n; f++) times[f] = f / fps;
        var tracks = c.tracks.map(function (t) { var o = t.o / 2, v = new Float32Array(n * 4); for (var f2 = 0; f2 < n; f2++) for (var k = 0; k < 4; k++) v[f2 * 4 + k] = A[o + (w0 + f2) * 4 + k] / 32767; return { b: t.b, v: v }; });
        out[c.name] = { times: times, tracks: tracks, dur: (n - 1) / fps };
      });
      LIB = out; window.__moves = { lib: LIB };
    }).catch(function (e) { loading = false; window.__movesErr = String(e).slice(0, 160); });
  };
  // one clip per (move, bone-name map) so models with prefixed bone names work too
  var cache = {};
  var clipFor = function (name, mapKey, map) {
    var k = name + '|' + mapKey; if (cache[k]) return cache[k]; var L = LIB[name]; if (!L) return null;
    var tr = []; L.tracks.forEach(function (t) { var bn = map[t.b]; if (!bn) return; tr.push(new T.QuaternionKeyframeTrack(bn + '.quaternion', L.times, t.v)); });
    if (tr.length < 8) return null; return (cache[k] = new T.AnimationClip('mv_' + name, L.dur, tr));
  };
  var ALIAS = { combo: 'combo3', staff: 'spinR', slam: 'slam', whip: 'spin2', twirl: 'spinR', lunge: 'slash_l', cross: 'combo3' };
  var attach = function (m) {
    if (!LIB || !m || !m.mx || !m.mx.mixer || !m.mx.acts || m.mx._mv) return; m.mx._mv = 1;
    var names = {}; try { (m.obj || m.wrap).traverse(function (o) { if (o.isBone) names[o.name] = 1; }); } catch (e) {}
    var map = {}, sig = [], any = LIB[Object.keys(LIB)[0]];
    any.tracks.forEach(function (t) { var b = t.b; if (names[b]) map[b] = b; else { var hit = Object.keys(names).filter(function (n) { return n.toLowerCase().endsWith(b.toLowerCase()); })[0]; if (hit) map[b] = hit; } sig.push(map[b] || '-'); });
    var key = sig.join(','); if (Object.keys(map).length < 8) { m.mx._mvFail = 1; return; }
    Object.keys(LIB).forEach(function (n) { var c = clipFor(n, key, map); if (!c) return; try { m.mx.acts['mv_' + n] = m.mx.mixer.clipAction(c); } catch (e) {} });
    Object.keys(ALIAS).forEach(function (a) { if (!m.mx.acts[a] && m.mx.acts['mv_' + ALIAS[a]]) m.mx.acts[a] = m.mx.acts['mv_' + ALIAS[a]]; });
  };
  var has = function (u, n) { try { var e = R3.units.get(u.id); return !!(e && e.mdl && e.mdl.mx && e.mdl.mx.acts && e.mdl.mx.acts[n]); } catch (er) { return false; } };
  var play = function (u, n, dur) { if (has(u, n)) { u.clipReq = { n: n, t: dur, T: dur }; return true; } return false; };
  // ---------------------------------------------------------------- triggers
  var seen = new WeakMap();
  var styleKey = function (u) { try { var X = window.__KX; return X && X.artKey ? X.artKey(u) : 'saber'; } catch (e) { return 'saber'; } };
  var onSwing = function (u) {
    var sw = u.melSw; if (!sw || seen.get(u) === sw) return; seen.set(u, sw); if (u.clipReq && u.clipReq.n && u.clipReq.n.indexOf('mv_') === 0 && u.clipReq.t > .15) return;
    var k = styleKey(u), i = sw.i || 0, fin = !!sw.fin, T0 = Math.max(.42, (sw.T || .3) * 1.9);
    if (fin) play(u, (k === 'twin' || k === 'dagger') ? 'mv_spin2' : (k === 'axe' || k === 'hammer' || k === 'mace' || k === 'great') ? 'mv_hammer' : 'mv_judgment', T0 * 1.35);
    else play(u, i % 2 ? 'mv_combo2' : 'mv_slash_l', T0);
  };
  var ART_MV = { glaive: ['mv_reap', 1.05], staff: ['mv_spinR', .95], axe: ['mv_slam', .9], hammer: ['mv_slam', .9], mace: ['mv_slam', .9], great: ['mv_judgment', 1.1], saber: ['mv_combo3', 1.0], twin: ['mv_combo3', 1.0], dagger: ['mv_combo3', .95], katana: ['mv_slash_l', .7], whip: ['mv_spin2', .9] };
  var hookArt = function () {
    var prev = window.__artOverride; if (window.__mvArtHk) return; window.__mvArtHk = 1;
    window.__artOverride = function (u) { try { var k = styleKey(u), m = ART_MV[k]; if (m && !((u.artCd || 0) > G.t)) play(u, m[0], m[1]); } catch (e) {} return prev ? prev(u) : false; };
  };
  var react = function (u, frac, dt) {
    if (!u || u.dead || u.cls !== 'arkframe' || u.boss || u.fbs) return; if (u.melSw && u.melSw.t < (u.melSw.T || .3)) return; if (u.slashT > .1) return;
    if (dt === 'ion' || (u.stun > .8 && u.jam > 0)) { play(u, 'mv_electro', .9); return; }
    if (frac >= .15) play(u, 'mv_flyup', .85); else if (frac >= .06) play(u, Math.random() < .5 ? 'mv_hit' : 'mv_facehit', .5);
  };
  var hook = function () {
    load(); hookArt();
    if (!window.__mvAnim && typeof window.mdlAnimate === 'function') { window.__mvAnim = 1; var ma = window.mdlAnimate;
      window.mdlAnimate = function (e, m, u, dt, now) { try { if (LIB && u && u.cls === 'arkframe' && m && m.mx && !m.mx._mv) attach(m); } catch (er) {} return ma(e, m, u, dt, now); }; }
    if (!window.__mvStep && typeof step === 'function') { window.__mvStep = 1; var st = step;
      step = function (dt) { st(dt); try { if (!LIB || !G || G.over) return; for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; if (u.cls === 'arkframe' && !u.dead && u.melSw) onSwing(u); } } catch (e) {} }; }
    if (!window.__mvHurt && typeof hurt === 'function') { window.__mvHurt = 1; var hu = hurt;
      hurt = function (u, amt, src, ang, dt) { var hp0 = u && u.hp; var r = hu(u, amt, src, ang, dt); try { if (LIB && u && u.cls === 'arkframe' && !u.dead && u.hp < hp0) react(u, (hp0 - u.hp) / (u.mhp || 1000), dt); } catch (e) {} return r; }; }
  };
  // attach from here too: the game's own animate code may hold its own (block-scoped) reference to mdlAnimate
  var attachAll = function () { if (!LIB || !window.R3 || !R3.units) return; R3.units.forEach(function (e, id) { if (e && e.mdl && e.mdl.mx && !e.mdl.mx._mv) { var u = null; try { u = G.units.find(function (x) { return x.id === id; }); } catch (er) {} if (u && u.cls === 'arkframe') attach(e.mdl); } }); };
  setInterval(function () { try { hook(); attachAll(); } catch (e) {} }, 500);
  window.__movesDbg = function () { return { lib: !!LIB, attach: attach }; };
})();
