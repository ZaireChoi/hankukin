/* ASCEND v3.74 — what a blade hit leaves behind
   (1) every unit that has the same skeleton (soldiers, pilots, humanoid bosses) now also plays the motion-captured hit
       reactions from the martial library: a flinch on a normal hit, a face-snap, and a blown-off-the-feet reaction on a big one.
       Creatures with other skeletons get a quick squash-and-recoil of the whole body instead.
   (2) armour shards: dark metal flakes with a hot edge burst off the cut, spin, fall and fade
   (3) the cut itself: a glowing gash stays on the target for a moment, along the swing, cooling from white to the blade colour
   Lag: one InstancedMesh for all shards (64), 10 pooled gash sprites; nothing allocated per hit. */
(function () {
  'use strict';
  var T = null, SH = null, SL = [], GASH = [], gi = 0, V, Q, M4, SC, E3;
  var init = function () {
    if (SH) return true; T = window.THREE; if (!T || !window.R3 || !R3.scene) return false;
    V = new T.Vector3(); Q = new T.Quaternion(); M4 = new T.Matrix4(); SC = new T.Vector3(); E3 = new T.Euler();
    var g = new T.BoxGeometry(1, .35, .7); SH = new T.InstancedMesh(g, new T.MeshStandardMaterial({ color: 0xc9b896, metalness: .35, roughness: .6, emissive: 0xff7a30, emissiveIntensity: .0 })   /* v4.13: shards are sand / steel coloured, never black */, 64);
    SH.instanceColor = new T.InstancedBufferAttribute(new Float32Array(64 * 3), 3); SH.count = 0; SH.frustumCulled = false; SH.userData.keep = 1;
    var c = document.createElement('canvas'); c.width = 128; c.height = 16; var x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 128, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.2, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(.8, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 5, 128, 6);
    var tex = new T.CanvasTexture(c); tex.userData = { keep: 1 };
    for (var i = 0; i < 10; i++) { var s = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); s.visible = false; s.renderOrder = 10; s.userData = { keep: 1, l: 0 }; GASH.push(s); }
    return true;
  };
  var uh = function (u) { try { return unitH(u); } catch (e) { return 0; } };
  var shards = function (u, ang, n, col) {
    var h = uh(u) + (u.r || 20) * 1.1; for (var i = 0; i < n; i++) { if (SL.length >= 64) SL.shift(); var a = ang + (Math.random() - .5) * 1.6, sp = 160 + Math.random() * 260;
      SL.push({ x: u.x, h: h + (Math.random() - .5) * 20, y: u.y, vx: Math.cos(a) * sp, vh: 120 + Math.random() * 220, vy: Math.sin(a) * sp, rx: Math.random() * 6, ry: Math.random() * 6, wx: (Math.random() - .5) * 20, wy: (Math.random() - .5) * 20, s: 3 + Math.random() * 5 * ((u.r || 20) / 22), l: .9, ml: .9 }); }
  };
  var gash = function (u, a, ang) {
    var s = GASH[gi++ % GASH.length]; if (s.parent !== R3.scene) R3.scene.add(s); var len = (u.r || 20) * 3; s.scale.set(len, len * .1, 1);
    s.material.rotation = -(ang || 0) + Math.PI / 2 + (Math.random() - .5) * .7; s.material.color.set('#ffffff'); s.material.opacity = 1; s.visible = true;
    s.userData = { keep: 1, l: .7, ml: .7, u: u, dh: (u.r || 20) * (.8 + Math.random() * .7), col: (function () { try { var m = MELT && MELT[a.melSub]; return m && m.col ? '#' + m.col.toString(16).padStart(6, '0') : '#ff7ae0'; } catch (e) { return '#ff7ae0'; } })() };
  };
  // hit reaction clips on every compatible skeleton (the frames already have theirs through the motion library)
  var actsFor = function (e) {
    var lib = window.__moves && window.__moves.lib; if (!lib || !e || !e.mdl || !e.mdl.mx || !e.mdl.mx.mixer) return null; var mx = e.mdl.mx; if (mx._hr !== undefined) return mx._hr;
    mx._hr = null; try { var names = {}; (e.mdl.obj || e.mdl.wrap).traverse(function (o) { if (o.isBone) names[o.name] = 1; }); var out = {};
      ['hit', 'facehit', 'flyup', 'knock'].forEach(function (k) { var L = lib[k]; if (!L) return; var tr = []; L.tracks.forEach(function (t) { if (names[t.b]) tr.push(new T.QuaternionKeyframeTrack(t.b + '.quaternion', L.times, t.v)); }); if (tr.length >= 12) { var act = mx.mixer.clipAction(new T.AnimationClip('hr_' + k, L.dur, tr)); act.setLoop(T.LoopOnce, 1); act.clampWhenFinished = false; out[k] = act; } });
      if (Object.keys(out).length) mx._hr = out; } catch (er) {}
    return mx._hr;
  };
  var squash = new WeakMap();
  var reactBody = function (u, frac, ang) {
    if (u.cls === 'arkframe') return; var e = R3.units.get(u.id); if (!e) return; var hr = actsFor(e);
    if (hr) { var k = frac >= .3 ? (hr.flyup ? 'flyup' : 'knock') : (Math.random() < .5 && hr.facehit ? 'facehit' : 'hit'); var act = hr[k]; if (!act) return;
      act.reset(); act.setEffectiveWeight(1); act.timeScale = 1.6; act.fadeIn(.05).play(); setTimeout(function () { try { act.fadeOut(.25); } catch (e) {} }, k === 'flyup' || k === 'knock' ? 650 : 380); return; }
    squash.set(e, { t: .18, ang: ang });   // other skeletons: a quick recoil of the whole body
  };
  var tick = function (dt) {
    var n = 0;
    for (var i = SL.length - 1; i >= 0; i--) { var p = SL[i]; p.l -= dt; if (p.l <= 0) { SL.splice(i, 1); continue; } p.vh -= 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.h += p.vh * dt; if (p.h < 2) { p.h = 2; p.vh *= -.3; p.vx *= .6; p.vy *= .6; } p.rx += p.wx * dt; p.ry += p.wy * dt;
      E3.set(p.rx, p.ry, 0); Q.setFromEuler(E3); var k = p.l / p.ml; SC.setScalar(p.s * (.4 + .6 * k)); V.set(p.x, p.h, p.y); M4.compose(V, Q, SC); SH.setMatrixAt(n, M4); var hot = Math.max(0, (k - .6) / .4); SH.instanceColor.setXYZ(n, 1 + hot * 1.2, .95 + hot * .5, .9); n++; }
    if (SH) { if (SH.parent !== R3.scene && n) R3.scene.add(SH); SH.count = n; SH.instanceMatrix.needsUpdate = true; SH.instanceColor.needsUpdate = true; }
    for (var j = 0; j < GASH.length; j++) { var s = GASH[j]; if (!s.visible) continue; s.userData.l -= dt; var u = s.userData.u, k2 = s.userData.l / s.userData.ml; if (k2 <= 0 || !u || u.dead) { s.visible = false; continue; }
      s.position.set(u.x, uh(u) + s.userData.dh, u.y); s.material.opacity = k2; if (k2 < .75) s.material.color.set(s.userData.col); }
  };
  var bodyTick = function () { try { R3.units.forEach(function (e) { var q = squash.get(e); if (!q) return; q.t -= 1 / 60; if (q.t <= 0) { squash.delete(e); e.root.scale.setScalar(e.root.userData.s0 || e.root.scale.x); return; } if (!e.root.userData.s0) e.root.userData.s0 = e.root.scale.x; var k = Math.sin((1 - q.t / .18) * Math.PI), s0 = e.root.userData.s0; e.root.scale.set(s0 * (1 + .12 * k), s0 * (1 - .14 * k), s0 * (1 + .12 * k)); }); } catch (er) {} };
  var lastHit = new WeakMap();
  var hook = function () {
    if (!window.__hfxHurt && typeof hurt === 'function') { window.__hfxHurt = 1; var hu = hurt;
      hurt = function (u, amt, src, ang, dt) { var hp0 = u && u.hp; var r = hu(u, amt, src, ang, dt);
        try { var a = src && src.unit; if (u && a && u.hp < hp0 && init()) { var melee = dt === 'm' || (a.melSw && a.melSw.t <= (a.melSw.T || .3) + .15) || a.slashT > 0 || a.lunge; var now = performance.now(), lt = lastHit.get(u) || 0;
            var frac = (hp0 - Math.max(0, u.hp)) / (u.mhp || 100), A = ang != null ? ang : Math.atan2(u.y - a.y, u.x - a.x);
            if (melee && now - lt > 90) { lastHit.set(u, now); var metal = u.cls === 'arkframe' || u.arm === 'heavy' || u.arm === 'light' || /tank|walker|mech|turret|sentry|bike/.test(u.cls || '');
              if (metal) shards(u, A, window.__phone ? 3 : 6, null); gash(u, a, A); }
            if (!u.dead && (melee || frac > .08) && now - (u._hfxR || 0) > 260) { u._hfxR = now; reactBody(u, frac, A); } } } catch (e) {}
        return r; }; }
    if (!window.__hfxStep && typeof step === 'function') { window.__hfxStep = 1; var st = step; step = function (dt) { st(dt); try { if (SH) { tick(dt); bodyTick(); } } catch (e) {} }; }
  };
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
