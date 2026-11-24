/* ASCEND v3.95 — movement posture for frames (manager 26/27-4)
   · the frame leans into its motion: a little when running, a lot when dashing (up to ~18°), sideways when strafing
   · landing (after a jump, flight or drop) gives a short crouch-and-recover bounce
   Applied last in mdlAnimate on the model's wrap, eased so it never snaps. Ground frames only (flight keeps its own banking).
   Wraps once: window.__hkPosture2. */
(function () {
  'use strict';
  var T = null, Q = null, V = null;
  var post = function (e, m, u, dt) {
    /* v3.96 safety net: a humanoid frame on foot never sits far above its own base; pull it back if something pushed it into the sky */
    try { if (u && u.cls === 'arkframe' && m && m.wrap && m.obj && !u.fly && !(u.kJump > 0) && Math.abs(m.wrap.position.y) > 400) { m.wrap.position.y = 0; m._kjAdd = 0; if (e._ps2A) { e._ps2A.py = 0; e._ps2A.vy = NaN; } window.__postFix = (window.__postFix || 0) + 1; } } catch (er) {}
    if (!u || u.cls !== 'arkframe' || !m || !m.wrap || u.dead || u.fly || (u.tf && u.tf.mode)) { if (m && m.wrap && e._ps2) { e._ps2.x = e._ps2.z = 0; var A0 = e._ps2A, w0 = m.wrap; if (A0) { if (w0.rotation.z === A0.vz) w0.rotation.z -= A0.rz; if (w0.rotation.x === A0.vx) w0.rotation.x -= A0.rx; if (w0.position.y === A0.vy) w0.position.y -= A0.py; A0.rz = A0.rx = A0.py = 0; A0.vz = A0.vx = A0.vy = NaN; } } return; }
    T = T || window.THREE; if (!T) return; if (!Q) { Q = new T.Quaternion(); V = new T.Vector3(); }
    var P0 = e._ps2 || (e._ps2 = { x: 0, z: 0, land: 0, wasAir: false });
    var vx = u.vx || 0, vy = u.vy || 0, sp = Math.hypot(vx, vy);
    // velocity in the model's own frame (+x forward, +z right)
    var par = m.wrap.parent; if (!par) return; par.getWorldQuaternion(Q); Q.invert(); V.set(vx, 0, vy).applyQuaternion(Q);
    var dash = u.dashT > 0 || !!u.lunge, maxL = dash ? .32 : .12, ref = dash ? 900 : 1500;
    var tx = Math.max(-maxL, Math.min(maxL, V.x / ref * (dash ? 1 : .9) * (sp > 20 ? 1 : 0)));
    var tz = Math.max(-maxL * .6, Math.min(maxL * .6, V.z / ref * .7 * (sp > 20 ? 1 : 0)));
    var k = Math.min(1, (dt || 1 / 60) * (dash ? 14 : 6)); P0.x += (tx - P0.x) * k; P0.z += (tz - P0.z) * k;
    // landing bounce
    if (u.landT > 0 && !(P0.landSeen)) { P0.land = .38; P0.landSeen = true; } if (!(u.landT > 0)) P0.landSeen = false;
    var dip = 0, nod = 0; if (P0.land > 0) { P0.land -= dt || 1 / 60; var p = 1 - Math.max(0, P0.land) / .38; dip = Math.sin(p * Math.PI) * (1 - p * .4); nod = dip * .1; }
    // add on top of whatever the game set this frame; if the game did not reset it, take our last offset off first (no build-up)
    var A = e._ps2A || (e._ps2A = { rz: 0, rx: 0, py: 0, vz: NaN, vx: NaN, vy: NaN }), w = m.wrap;
    if (w.rotation.z === A.vz) w.rotation.z -= A.rz; if (w.rotation.x === A.vx) w.rotation.x -= A.rx; if (w.position.y === A.vy) w.position.y -= A.py;
    A.rz = -(P0.x + nod); A.rx = P0.z; A.py = -dip * 7;
    w.rotation.z += A.rz; w.rotation.x += A.rx; w.position.y += A.py; A.vz = w.rotation.z; A.vx = w.rotation.x; A.vy = w.position.y;
  };
  // ---------------------------------------------------------------- bosses: wind-up before an attack lands (manager 26/27-5, spore queen first)
  // while one of the boss's ground warnings is counting down, the body rears back and swells; when it lands the body snaps forward
  var bossPost = function (e, m, u, dt) {
    if (!m || !m.wrap || u.dead) return; var tl = (typeof G !== 'undefined' && G && G.tele) || [], k = 0;
    for (var i = 0; i < tl.length; i++) { var s = tl[i]; if (!(s.t > 0)) continue; var src = s.src && (s.src.unit || s.src); if (src !== u && s.src !== u.slot && !(src && src.id === u.id)) continue; if (s._t0 == null) s._t0 = s.t; k = Math.max(k, 1 - s.t / Math.max(.2, s._t0)); }
    var B = e._bw || (e._bw = { k: 0, snap: 0, rz: 0, sy: 1, vz: NaN, vs: NaN }), d = dt || 1 / 60;
    if (B.k > .5 && k === 0) B.snap = .22; B.k += (k - B.k) * Math.min(1, d * 8); if (B.snap > 0) B.snap -= d;
    var w = m.wrap; if (w.rotation.z === B.vz) w.rotation.z -= B.rz; if (w.scale.y === B.vs) w.scale.y /= B.sy;
    var ease = B.k * B.k * (3 - 2 * B.k), sn = B.snap > 0 ? Math.sin((1 - B.snap / .22) * Math.PI) : 0;
    B.rz = ease * .28 - sn * .22; B.sy = 1 + ease * .07 - sn * .05;   /* rear back (+z tilts the top backward for +x-forward models) */
    w.rotation.z += B.rz; w.scale.y *= B.sy; B.vz = w.rotation.z; B.vs = w.scale.y;
  };
  /* the render pass keeps its own reference to mdlAnimate, so the posture is applied right after R3.syncUnits (which runs it) */
  var lastT = 0;
  var hook = function () {
    if (window.__hkPosture2 || !window.R3 || typeof R3.syncUnits !== 'function') return; window.__hkPosture2 = 1; var su = R3.syncUnits;
    R3.syncUnits = function (dt) { var r = su.apply(this, arguments); try { if (typeof G !== 'undefined' && G && G.units) { var d = typeof dt === 'number' ? dt : 1 / 60; for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; var e = R3.units.get(u.id); if (!e || !e.mdl) continue; if (u.cls === 'arkframe') post(e, e.mdl, u, d); else if (u.boss) bossPost(e, e.mdl, u, d); } } } catch (er) { window.__postErr = String(er).slice(0, 160); } return r; };
  };
  setInterval(function () { try { hook(); } catch (e) {} }, 700);
})();
