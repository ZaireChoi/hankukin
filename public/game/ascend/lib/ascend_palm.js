/* ASCEND v3.60 — palm laser (all frames, all modes)
   · the basic laser of every mech frame fires once every 3 s: a 0.6 s charge, then one heavy shot (6x the old bolt, so a shot matters)
   · during the charge and just after the shot the frame stretches its gun arm straight at the target, the armored fist and the
     carried gun are put away, the open hand shows and energy gathers in the palm (a growing glow with sparks drawn inward)
   · works for my frame (mouse / attack button / auto) and for AI frames */
(function () {
  'use strict';
  var CD = 2.4, CH = .6, DMG = 6, HOLD = .45;   // one shot every 3.0 s (0.6 s charge + 2.4 s recovery)
  var T3 = function () { return window.THREE; };
  var now = function () { try { return G ? G.t : 0; } catch (e) { return 0; } };
  var mech = function (u) { return u && u.cls === 'arkframe' && !u.dead; };
  // ---------------------------------------------------------------- the fire gate
  var gate = function (u, inp) {
    if (!inp || !mech(u)) return inp;
    if (u._tfFly || (u.tf && u.tf.mode !== 'robot')) return inp;            // jets keep their own rapid lasers
    var t = now(); u._lzCd = u._lzCd || 0;
    if (u._lzCh > 0) {                                                         // charging
      if (t >= u._lzFire) { u._lzCh = 0; u._lzShot = t; u._lzCd = t + CD; inp.fire = true; } else inp.fire = false;
      return inp;
    }
    if (inp.fire) { if (t >= u._lzCd) { u._lzCh = 1; u._lzFire = t + CH; u._lzAim = inp.aim; } inp.fire = false; }
    return inp;
  };
  var hookIn = function () {
    var li = window.localInput; if (li && !li.__palm && !window.__hkPalm) { window.__hkPalm = 1; var w = function (u) { return gate(u, li(u)); }; w.__palm = 1; window.localInput = w; }
    try { if (typeof botInput === 'function' && !botInput.__palm && !window.__hkPalmB) { window.__hkPalmB = 1; var bi = botInput; var w2 = function (s, u, dt) { return gate(u, bi(s, u, dt)); }; w2.__palm = 1; botInput = w2; } } catch (e) {}
  };
  // ---------------------------------------------------------------- one heavy shot
  try { var _hu = hurt; hurt = function (u, amt, s, ang, dt) { try { var a = s && s.unit; if (a && a.cls === 'arkframe' && a._lzShot && now() - a._lzShot < 1.2 && (dt === 'k' || dt === 'b' || dt == null)) amt *= DMG; } catch (e) {} return _hu(u, amt, s, ang, dt); }; } catch (e) {}
  // ---------------------------------------------------------------- the pose: straight arm, open palm, energy in the hand
  var palmOn = function (u) { var t = now(); return mech(u) && ((u._lzCh > 0) || (u._lzShot && t - u._lzShot < HOLD)); };
  var aimDir = function (u) { var a = u._lzAim != null ? u._lzAim : (u.aa != null ? u.aa : u.a); var V = T3().Vector3; return new V(Math.cos(a), -.05, Math.sin(a)).normalize(); };
  var pointBone = function (bone, child, dir, k) { if (!bone || !child) return; var V = T3().Vector3, Q = T3().Quaternion; var a = new V(), b = new V(); bone.getWorldPosition(a); child.getWorldPosition(b); var cur = b.sub(a); if (cur.lengthSq() < 1e-6) return; cur.normalize(); var q = new Q().setFromUnitVectors(cur, dir); rotW(bone, new Q().slerp(q, k)); bone.updateMatrixWorld(true); };
  var glow = function (e) {
    if (e._palmG) return e._palmG; var T = T3(); var tex = (window.R3 && R3.radTex) ? R3.radTex([[0, 'rgba(255,255,255,1)'], [.3, 'rgba(160,240,255,.85)'], [1, 'rgba(60,180,255,0)']]) : null;
    var s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: 0xbff8ff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.userData.keep = 1; s.visible = false; e._palmG = s; return s;
  };
  var hookPose = function () {
    if (typeof gripTick !== 'function' || gripTick.__palm || window.__hkPalmG) return; window.__hkPalmG = 1; var gt = gripTick;
    var w = function (e, m, u, dt) {
      gt(e, m, u, dt);
      try {
        var on = palmOn(u); var B = motBones(m); if (!B) return; var hand = B.LeftHand, fore = B.LeftForeArm, arm = B.LeftArm;
        /* v3.91 (user: the arm moved strangely) - the arm used to snap to the target and back every 3 s; it now eases in and out (about 0.15 s) */
        e._palmW = (e._palmW || 0) + ((on ? 1 : 0) - (e._palmW || 0)) * Math.min(1, (dt || 1 / 60) * (on ? 9 : 6)); var W = e._palmW;   // the empty left hand (the right one keeps the sword)
        var g = glow(e); var sc = e.root && e.root.parent;
        if (!hand || !fore || !arm || (!on && W < .03)) { if (e.grip && e.grip.wrapL && e._palmHid) { e.grip.wrapL.visible = true; e._palmHid = 0; } g.visible = false; return; }
        if (!on) { var dirO = aimDir(u); pointBone(arm, fore, dirO, .95 * W); pointBone(fore, hand, dirO, .95 * W); g.visible = false; return; }
        var H = (e.wg && e.wg.H) || 90, dir = aimDir(u);
        // the arm reaches straight at the target (upper arm, then forearm in line)
        pointBone(arm, fore, dir, .95 * W); pointBone(fore, hand, dir, .95 * W);
        // the open left hand (no fist over it); a carried gun steps aside
        hand.scale.setScalar(1); hand.updateMatrixWorld(true);
        if (e.grip && e.grip.wrapL) { e.grip.wrapL.visible = false; e._palmHid = 1; }
        try { var O = e.eq && e.eq.o; if (O && O.gun) O.gun.visible = false; if (O && O.gun2) O.gun2.visible = false; } catch (er) {}
        // energy gathers in the palm
        if (sc && g.parent !== sc) sc.add(g);
        var p = new (T3().Vector3)(); hand.getWorldPosition(p); p.addScaledVector(dir, H * .05);
        var t = now(); var k = u._lzCh > 0 ? Math.max(0, Math.min(1, 1 - (u._lzFire - t) / CH)) : Math.max(0, 1 - (t - u._lzShot) / HOLD);
        g.position.copy(p); var fl = .85 + Math.random() * .3; g.scale.setScalar(H * (.12 + .5 * k) * fl); g.material.opacity = .35 + .65 * k; g.visible = true;
        e.palmPos = p.clone(); e.muzzle = p.clone();
        if (u._lzCh > 0 && Math.random() < .7 && typeof part === 'function') { var b = Math.random() * 6.28, r = H * (.12 + Math.random() * .3); part(p.x + Math.cos(b) * r, p.z + Math.sin(b) * r, -Math.cos(b) * r * 4, -Math.sin(b) * r * 4, .22, '#bff8ff', 2.2, p.y + (Math.random() - .5) * r); }
      } catch (er) { window.__palmErr = String(er && er.stack || er).slice(0, 200); }
    };
    w.__palm = 1; try { gripTick = w; } catch (e) {}
  };
  setInterval(function () { try { hookIn(); hookPose(); } catch (e) {} }, 400);
  window.__palm = { cd: CD, charge: CH };
})();
