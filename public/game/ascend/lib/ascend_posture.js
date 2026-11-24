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
    /* v3.98 stability: lean / landing dip are OFF until reviewed on screen (user: frames look buried and move strangely). window.__postureOn=true re-enables */
    if (!window.__postureOn) { if (e._ps2A && m && m.wrap) { var A9 = e._ps2A, w9 = m.wrap; if (w9.rotation.z === A9.vz) w9.rotation.z -= A9.rz; if (w9.rotation.x === A9.vx) w9.rotation.x -= A9.rx; if (w9.position.y === A9.vy) w9.position.y -= A9.py; A9.rz = A9.rx = A9.py = 0; A9.vz = A9.vx = A9.vy = NaN; } return; }
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
  // ---------------------------------------------------------------- v3.97 detail: upper body turns to the aim, head follows, heavy footfalls
  // the legs keep walking where the frame moves; spine and neck twist toward where it shoots (up to ~60 deg), eased.
  var Y = null, QA = null, QB = null, VA = null, VB = null;
  var twistBone = function (b, ang) {
    // rotate bone about world up by ang, expressed in its parent's frame; undo last frame's twist first if the animation did not overwrite it
    var s = b.userData._tw; if (s && b.quaternion.equals(s.after)) b.quaternion.copy(s.before);
    var before = b.quaternion.clone(); b.parent.getWorldQuaternion(QA); VA.set(0, 1, 0).applyQuaternion(QA.invert()); QB.setFromAxisAngle(VA, ang); b.quaternion.premultiply(QB);
    b.userData._tw = { before: before, after: b.quaternion.clone() };
  };
  var detail = function (e, m, u, dt) {
    if (!m.obj || u.fly || (u.tf && u.tf.mode)) return; var T3 = window.THREE; if (!T3) return; if (!QA) { QA = new T3.Quaternion(); QB = new T3.Quaternion(); VA = new T3.Vector3(); VB = new T3.Vector3(); }
    var B = m._dtB; if (B === undefined) { B = null; var f = {}; m.obj.traverse(function (o) { if (o.isBone) f[o.name] = o; }); if (f.Spine01 && f.Spine02 && f.neck && f.Head) { B = f; B.headfront = m.obj.getObjectByName('headfront'); } m._dtB = B; } if (!B) return;
    // facing of the body from the hips, aim from u.aa
    var D = e._dt || (e._dt = { tw: 0, fL: 0, fR: 0, mnL: 1e9, mnR: 1e9, st: 0 }), d = dt || 1 / 60;
    var aim = u.aa, hasAim = typeof aim === 'number' && isFinite(aim) && (u.tgt || u.fireT > 0 || u.atkT > 0 || u.cd > 0 || u === (G.local && G.local.unit));
    // where the hips actually face (the model may already be turned toward the aim by the game): perpendicular to the hip line, sign fixed once from the head
    var want = 0; if (hasAim && B.LeftUpLeg && B.RightUpLeg) { m.obj.updateMatrixWorld(true); B.LeftUpLeg.getWorldPosition(VA); B.RightUpLeg.getWorldPosition(VB); var rx = VB.x - VA.x, rz = VB.z - VA.z;
      if (m._dtSg == null && B.headfront) { var hp = new T3.Vector3(), hf = new T3.Vector3(); B.Head.getWorldPosition(hp); B.headfront.getWorldPosition(hf); var fx = hf.x - hp.x, fz = hf.z - hp.z; m._dtSg = (-rz * fx + rx * fz) >= 0 ? 1 : -1; }
      var sg = m._dtSg || 1, face = Math.atan2(rx * sg, -rz * sg); var a = face - aim; a = Math.atan2(Math.sin(a), Math.cos(a)); want = Math.abs(a) > 2.4 ? 0 : Math.max(-1.05, Math.min(1.05, a)); }
    D.tw += (want - D.tw) * Math.min(1, d * 9);
    /* v3.98: user 2026-11-24 "the robot moves grotesquely, arms swing for no reason" - the upper-body twist is OFF (window.__twistOn=true to try it again) */
    if (window.__twistOn && Math.abs(D.tw) > .01) { m.obj.updateMatrixWorld(true); twistBone(B.Spine01, D.tw * .3); twistBone(B.Spine02, D.tw * .35); twistBone(B.neck, D.tw * .35); }
    // heavy footfalls for my own frame: dust, a low thud and a tiny camera bump each time a foot plants
    if (u === (G.local && G.local.unit) && B.LeftFoot && B.RightFoot && Math.hypot(u.vx || 0, u.vy || 0) > 40) {
      B.LeftFoot.getWorldPosition(VB); var yl = VB.y; B.RightFoot.getWorldPosition(VB); var yr = VB.y;
      D.mnL = Math.min(D.mnL + d * 4, yl); D.mnR = Math.min(D.mnR + d * 4, yr); D.st -= d;
      var plant = function (y, mn, key) { var was = D[key]; var up = y > mn + 6; D[key] = up ? 1 : 0; return was === 1 && !up; };
      if ((plant(yl, D.mnL, 'fL') || plant(yr, D.mnR, 'fR')) && D.st <= 0) { D.st = .18; try { G.shake = Math.max(G.shake || 0, 1.6); } catch (er) {} try { for (var i = 0; i < 4; i++) { var q = Math.random() * 6.28; part(u.x + Math.cos(q) * 10, u.y + Math.sin(q) * 10, Math.cos(q) * 60, Math.sin(q) * 60, .45, '#c8a27a', 7, 3); } } catch (er) {} try { SFX2.tone(70, 40, .09, .05, 'sine'); } catch (er) {} }
    }
  };
  /* the render pass keeps its own reference to mdlAnimate, so the posture is applied right after R3.syncUnits (which runs it) */
  var lastT = 0;
  var hook = function () {
    if (window.__hkPosture2 || !window.R3 || typeof R3.syncUnits !== 'function') return; window.__hkPosture2 = 1; var su = R3.syncUnits;
    R3.syncUnits = function (dt) { var r = su.apply(this, arguments); try { if (typeof G !== 'undefined' && G && G.units) { var d = typeof dt === 'number' ? dt : 1 / 60; for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; var e = R3.units.get(u.id); if (!e || !e.mdl) continue; if (u.cls === 'arkframe') { post(e, e.mdl, u, d); try { detail(e, e.mdl, u, d); } catch (er2) { window.__dtErr = String(er2).slice(0, 160); } } else if (u.boss && window.__postureOn) bossPost(e, e.mdl, u, d); } } } catch (er) { window.__postErr = String(er).slice(0, 160); } return r; };
  };
  setInterval(function () { try { hook(); } catch (e) {} }, 700);
})();
