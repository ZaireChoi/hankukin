/* ASCEND transform engine v3 - "panel" transformation (v4.09)
   User: "transform like the Transformers films, step by step, never a picture swap; the same engine in battle; same colours".
   Research notes applied (ILM / Weta interviews, Blender transformation tutorials):
   - two puppets (robot + vehicle) cut into many RIGID pieces; every piece moves on a HINGE / pivot, it folds, it does not float or squash
   - rhythm "like orchestration for music": small parts first, then legs, torso, arms, head; locks land on beats
   - recognisable parts carried across (backpack -> fuselage, legs -> tail/engines, arms -> wings, head -> nose/canopy)
   - personality: elegant factions transform smoothly, aggressive factions snap in ratchet steps with harder overshoot
   - hero frames (Phoenix + the four mythic frames) get the "film" treatment: more pieces, telescoping struts, signature sparks,
     a longer showcase in the hangar.
   The robot keeps its own skeletal fold (lib/transform.js tfPose); this file replaces only the vehicle-shell part (shellPose). */
(function () {
  'use strict';
  var T3 = function () { return window.THREE; };
  var HERO = { mech3: { fx: '#ff8a3a', n: 72, style: 'fire' }, fed_myth_libertas: { fx: '#8fd0ff', n: 72, style: 'elegant' }, emp_myth_sol: { fx: '#ffd36a', n: 72, style: 'royal' }, alp_myth_genesis: { fx: '#eef6ff', n: 72, style: 'elegant' }, omg_myth_eclipse: { fx: '#c77bff', n: 72, style: 'aggressive' } };
  var styleOf = function (fk) { if (HERO[fk]) return HERO[fk].style; if (/^(emp|omg)_/.test(fk)) return 'aggressive'; return 'elegant'; };
  var STY = {
    elegant: { over: .07, steps: 0, flip: 1.0, spread: .55 },
    fire: { over: .10, steps: 0, flip: 1.15, spread: .5 },
    royal: { over: .08, steps: 3, flip: .9, spread: .6 },
    aggressive: { over: .16, steps: 5, flip: 1.25, spread: .42 }
  };
  // choreography (k = 0..1): legs -> tail first, then backpack -> fuselage, arms -> wings, head -> nose; final locks cascade
  var WIN = { tailL: [.06, .52], tailR: [.08, .54], body: [.22, .66], wingL: [.32, .76], wingR: [.34, .78], nose: [.5, .9] };
  var CHAIN = {
    nose: ['Head', 'Neck', 'neck', 'Spine2', 'Spine02'],
    body: ['Spine2', 'Spine02', 'Spine1', 'Spine01', 'Spine', 'Hips'],
    wingL: ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand'],
    wingR: ['RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'],
    tailL: ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase'],
    tailR: ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']
  };
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var ratchet = function (t, n) { if (!n) return ease(t); var s = t * n, i = Math.floor(s), f = s - i; f = f * f * f * (f * (f * 6 - 15) + 10); return Math.min(1, (i + Math.pow(f, 1.6)) / n); };
  var rnd = function (s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- build: cut every shell part into rigid panels (k-means on triangle centres) ---------- */
  var cutPart = function (geo, K, seed) {
    var P = geo.attributes.position.array, N = geo.attributes.normal ? geo.attributes.normal.array : null, U = geo.attributes.uv ? geo.attributes.uv.array : null;
    var nt = P.length / 9; if (nt < K * 4) K = Math.max(1, Math.floor(nt / 4)); var cx = new Float32Array(nt), cy = new Float32Array(nt), cz = new Float32Array(nt);
    for (var t = 0; t < nt; t++) { var o = t * 9; cx[t] = (P[o] + P[o + 3] + P[o + 6]) / 3; cy[t] = (P[o + 1] + P[o + 4] + P[o + 7]) / 3; cz[t] = (P[o + 2] + P[o + 5] + P[o + 8]) / 3; }
    // k-means++ style seeding (deterministic)
    var C = [], i, j, a = Math.floor(rnd(seed) * nt); C.push([cx[a], cy[a] * .6, cz[a]]);
    var dmin = new Float32Array(nt).fill(1e9);
    while (C.length < K) { var last = C[C.length - 1], best = 0, bi = 0; for (t = 0; t < nt; t++) { var dx = cx[t] - last[0], dy = cy[t] * .6 - last[1], dz = cz[t] - last[2], d = dx * dx + dy * dy + dz * dz; if (d < dmin[t]) dmin[t] = d; if (dmin[t] > best) { best = dmin[t]; bi = t; } } C.push([cx[bi], cy[bi] * .6, cz[bi]]); }
    var lab = new Int32Array(nt);
    for (var it = 0; it < 7; it++) {
      for (t = 0; t < nt; t++) { var bd = 1e9, bl = 0; for (j = 0; j < K; j++) { var ex = cx[t] - C[j][0], ey = cy[t] * .6 - C[j][1], ez = cz[t] - C[j][2], dd = ex * ex + ey * ey + ez * ez; if (dd < bd) { bd = dd; bl = j; } } lab[t] = bl; }
      var S = []; for (j = 0; j < K; j++) S.push([0, 0, 0, 0]); for (t = 0; t < nt; t++) { var s = S[lab[t]]; s[0] += cx[t]; s[1] += cy[t] * .6; s[2] += cz[t]; s[3]++; }
      for (j = 0; j < K; j++) if (S[j][3]) C[j] = [S[j][0] / S[j][3], S[j][1] / S[j][3], S[j][2] / S[j][3]];
    }
    var out = [], T = T3();
    for (j = 0; j < K; j++) {
      var ids = []; for (t = 0; t < nt; t++) if (lab[t] === j) ids.push(t); if (!ids.length) continue;
      var n = ids.length * 3, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), c = [0, 0, 0], nn = [0, 0, 0];
      ids.forEach(function (tt, q) { for (var v = 0; v < 3; v++) { var src = tt * 9 + v * 3, dst = (q * 3 + v) * 3; pos[dst] = P[src]; pos[dst + 1] = P[src + 1]; pos[dst + 2] = P[src + 2]; c[0] += P[src]; c[1] += P[src + 1]; c[2] += P[src + 2]; if (N) { nor[dst] = N[src]; nor[dst + 1] = N[src + 1]; nor[dst + 2] = N[src + 2]; nn[0] += N[src]; nn[1] += N[src + 1]; nn[2] += N[src + 2]; } if (U) { var us = tt * 6 + v * 2, ud = (q * 3 + v) * 2; uv[ud] = U[us]; uv[ud + 1] = U[us + 1]; } } });
      c = c.map(function (v) { return v / n; }); var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      for (var q2 = 0; q2 < n; q2++) for (var ax = 0; ax < 3; ax++) { pos[q2 * 3 + ax] -= c[ax]; mn[ax] = Math.min(mn[ax], pos[q2 * 3 + ax]); mx[ax] = Math.max(mx[ax], pos[q2 * 3 + ax]); }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.computeBoundingSphere();
      var nl = Math.hypot(nn[0], nn[1], nn[2]) || 1;
      out.push({ g: g, c: new T.Vector3(c[0], c[1], c[2]), nrm: new T.Vector3(nn[0] / nl, nn[1] / nl, nn[2] / nl), half: new T.Vector3((mx[0] - mn[0]) / 2, (mx[1] - mn[1]) / 2, (mx[2] - mn[2]) / 2), size: Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) });
    }
    return out;
  };
  var CUT = {};   // cache per jet key + piece count
  var build = function (e, J, fk) {
    if (J.panels) return J.panels; var T = T3(); var hero = HERO[fk]; var total = hero ? hero.n : 30;
    var keys = Object.keys(J.pcs); var tri = {}, sum = 0; keys.forEach(function (k) { var m = J.pcs[k].hold.children[0]; var c = m.geometry.attributes.position.count / 3; tri[k] = c; sum += c; });
    var key = J.f + '|' + total; var cut = CUT[key];
    if (!cut) { cut = {}; keys.forEach(function (k, gi) { var m = J.pcs[k].hold.children[0]; var K = Math.max(2, Math.round(total * Math.pow(tri[k] / sum, .7))); cut[k] = cutPart(m.geometry, K, gi + 1); }); CUT[key] = cut; }
    var mat = J.pcs[keys[0]].hold.children[0].material; var panels = [];
    keys.forEach(function (k) {
      var list = cut[k], pc = J.pcs[k];
      // order inside the group: wings inner -> outer, tails front -> back, nose back -> front, body front -> back
      var rank = list.map(function (p, i) { var v = k.indexOf('wing') === 0 ? Math.abs(p.c.z) : k.indexOf('tail') === 0 ? -p.c.x : k === 'nose' ? p.c.x : -p.c.x; return [v, i]; }).sort(function (a, b) { return a[0] - b[0]; });
      rank.forEach(function (rk, ord) {
        var p = list[rk[1]]; var mesh = new T.Mesh(p.g, mat); mesh.castShadow = false; mesh.frustumCulled = false; mesh.userData.keep = 1;
        var piv = new T.Group(); var hold = new T.Group(); piv.add(hold); hold.add(mesh); J.grp.add(piv); piv.visible = false;
        var home = pc.home.clone().add(p.c.clone().multiplyScalar(J.len));
        // hinge: the panel's edge that faces the hull centre, axis along that edge
        var dir = new T.Vector3(-home.x, 0, -home.z); var hp = new T.Vector3();
        if (Math.abs(dir.z) > Math.abs(dir.x) * .6) { hp.z = Math.sign(dir.z || 1) * p.half.z; } else { hp.x = Math.sign(dir.x || 1) * p.half.x; }
        var axis = new T.Vector3(0, 1, 0).cross(hp.clone().normalize()); if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0); axis.normalize();
        var chain = CHAIN[k] || CHAIN.body; var nb = Math.max(1, chain.length);
        panels.push({ piv: piv, hold: hold, grp: k, ord: ord, cnt: list.length, home: home, hinge: hp.multiplyScalar(J.len), axis: axis, nrm: p.nrm.clone(), size: p.size * J.len,
          bone: chain, bi: Math.min(nb - 1, Math.floor(ord / list.length * nb)), flipS: (ord % 2 ? -1 : 1) * (k.indexOf('wing') === 0 ? 1 : .7), seed: rnd(ord * 13.7 + k.length), big: p.size > .14 });
      });
    });
    // telescoping struts for hero frames: the biggest wing / tail panels are pushed out on hydraulic rams
    J.struts = []; if (hero) { var sm = new T.MeshStandardMaterial({ color: 0x2b2f36, metalness: .85, roughness: .35 }), sm2 = new T.MeshStandardMaterial({ color: 0xb8c0cc, metalness: .9, roughness: .25 });
      panels.filter(function (p) { return p.grp !== 'body'; }).sort(function (a, b) { return b.size - a.size; }).slice(0, 10).forEach(function (p) {
        var g1 = new T.CylinderGeometry(.5, .5, 1, 8, 1, true), g2 = new T.CylinderGeometry(.3, .3, 1, 8, 1, true); var o1 = new T.Mesh(g1, sm), o2 = new T.Mesh(g2, sm2); o1.userData.keep = o2.userData.keep = 1; o1.frustumCulled = o2.frustumCulled = false; J.grp.add(o1); J.grp.add(o2); o1.visible = o2.visible = false; J.struts.push({ p: p, a: o1, b: o2 }); }); }
    // spark sprites (work in the hangar too, where the battle particle system does not exist)
    J.sparks = []; var sc = document.createElement('canvas'); sc.width = sc.height = 32; var sg = sc.getContext('2d'); var gr = sg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 32, 32);
    var st = new T.CanvasTexture(sc); var col = new T.Color(hero ? hero.fx : '#ffe2c0');
    for (var s = 0; s < (hero ? 48 : 24); s++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: st, color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); sp.visible = false; sp.userData.keep = 1; J.grp.add(sp); J.sparks.push({ s: sp, t: 0, v: new T.Vector3() }); }
    J.si = 0; J.panels = panels; J.style = STY[styleOf(fk)] || STY.elegant; J.hero = !!hero; return panels;
  };
  var burst = function (J, pos, n, big) { var T = T3(); for (var i = 0; i < n; i++) { var sp = J.sparks[J.si++ % J.sparks.length]; sp.s.position.copy(pos); var b = Math.random() * 6.28, up = Math.random(); sp.v.set(Math.cos(b), up * 1.2 + .2, Math.sin(b)).multiplyScalar(J.len * (big ? .9 : .5) * (.5 + Math.random())); sp.t = .28 + Math.random() * .2; sp.s.visible = true; var sc = J.len * (big ? .05 : .03); sp.s.scale.set(sc, sc, sc); } };
  var sparkTick = function (J) { var now = performance.now(), dt = Math.min(.05, (now - (J.lastT || now)) / 1000); J.lastT = now; J.sparks.forEach(function (sp) { if (!sp.s.visible) return; sp.t -= dt; if (sp.t <= 0) { sp.s.visible = false; return; } sp.s.position.addScaledVector(sp.v, dt); sp.v.y -= J.len * 2.2 * dt; sp.s.material.opacity = Math.min(1, sp.t * 4); }); };
  // sound: short servo whine per moving group + metal lock clank (rate limited)
  var AC = null, lastClank = 0, lastServo = 0;
  var audio = function () { try { if (window.__tfMute) return null; if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } };
  var servo = function (up, hero) { var now = performance.now(); if (now - lastServo < 140) return; lastServo = now; var a = audio(); if (!a) return; var o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; var t = a.currentTime, f0 = up ? 180 : 420, f1 = up ? 520 : 160; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + .16); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(hero ? .05 : .035, t + .02); g.gain.exponentialRampToValueAtTime(.0005, t + .2); o.connect(f); f.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .22); };
  var clank = function (big) { var now = performance.now(); if (now - lastClank < (big ? 60 : 90)) return; lastClank = now; try { var S = window.__AX && window.__AX.SFX2; if (big && S && S.clang) { S.clang(); return; } } catch (e) {} var a = audio(); if (!a) return; var t = a.currentTime; var len = .09, buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); var src = a.createBufferSource(); src.buffer = buf; var f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400 + Math.random() * 1600; f.Q.value = 6; var g = a.createGain(); g.gain.value = .07; src.connect(f); f.connect(g); g.connect(a.destination); src.start(t); };

  /* ---------- pose: called every frame from lib/transform.js shellPose ---------- */
  var V1, V2, V3, Q1, Q2, M1;
  var pose = function (e, m, u, k, p, H, B, jk, J) {
    var T = T3(); if (!T || !J || !B) return false; if (!V1) { V1 = new T.Vector3(); V2 = new T.Vector3(); V3 = new T.Vector3(); Q1 = new T.Quaternion(); Q2 = new T.Quaternion(); M1 = new T.Matrix4(); }
    var fk = e.fk || (window.__AX && window.__AX.myMechKey ? window.__AX.myMechKey() : '');
    var panels = build(e, J, fk); if (!panels.length) return false; var S = J.style;
    // shell frame: same place/heading as the robot; ground forms sit on the deck, flyers rise
    var lift = clamp((k - .35) / .55); lift = lift * lift * (3 - 2 * lift); var y0 = H * .45, y1 = J.gnd ? -J.bot : H * .45 + p.alt;
    /* v4.09: the hull forms where the robot's body is (the robot springs up first), then settles to flight height / the deck */
    try { m.wrap.updateMatrixWorld(true); var hw = new T.Vector3(); B.Hips.getWorldPosition(hw); var pr = J.grp.parent || m.wrap.parent; if (pr) { pr.worldToLocal(hw); y0 = hw.y; } } catch (e) {}
    lift = clamp((k - .6) / .35); lift = lift * lift * (3 - 2 * lift);
    J.grp.position.set(m.wrap.position.x, y0 + (y1 - y0) * lift, m.wrap.position.z); J.grp.rotation.set(0, m.wrap.rotation.y, 0); J.grp.visible = k > .02; J.grp.updateMatrixWorld(true);
    var done = k >= .995; for (var pk in J.pcs) { var hh = J.pcs[pk].hold; hh.visible = done; if (done) { hh.position.copy(J.pcs[pk].home); hh.rotation.set(0, 0, 0); hh.scale.setScalar(J.len); } }   // fully locked: the merged hull (6 meshes) replaces the panels - cheap while flying
    var inv = M1.copy(J.grp.matrixWorld).invert(); var gq = J.grp.getWorldQuaternion(Q2).invert();
    /* v4.09 (user: "the robot stays whole while it comes apart - it looks wrong"): each body part folds away as its panels leave it.
       The limb's root bone is scaled down, so legs retract into the hips, arms into the shoulders, the head into the chest, and last the torso. */
    var GB = { tailL: ['LeftUpLeg'], tailR: ['RightUpLeg'], wingL: ['LeftShoulder', 'LeftArm'], wingR: ['RightShoulder', 'RightArm'], nose: ['Neck', 'neck', 'Head'] };
    var gprog = {}; for (var gi = 0; gi < panels.length; gi++) { var P0 = panels[gi], w0 = WIN[P0.grp] || WIN.body, sp0 = w0[1] - w0[0], st0 = w0[0] + (P0.ord / Math.max(1, P0.cnt)) * sp0 * S.spread, en0 = st0 + sp0 * (1 - S.spread) + .04; var t0 = clamp((k - st0) / (en0 - st0)); var g0 = gprog[P0.grp] || (gprog[P0.grp] = [0, 0]); g0[0] += t0 > .15 ? Math.min(1, (t0 - .15) / .5) : 0; g0[1]++; }
    for (var gk in GB) { var gp = gprog[gk] ? gprog[gk][0] / gprog[gk][1] : clamp((k - .3) / .4); var sc0 = 1 - .96 * (gp * gp * (3 - 2 * gp)); for (var bi2 = 0; bi2 < GB[gk].length; bi2++) { var bb = B[GB[gk][bi2]]; if (bb) { bb.scale.setScalar(Math.max(.04, sc0)); break; } } }
    var gb = gprog.body ? gprog.body[0] / gprog.body[1] : 0; var spB = B.Spine2 || B.Spine02 || B.Spine1 || B.Spine01; if (spB) spB.scale.setScalar(Math.max(.05, 1 - .9 * clamp((gb - .5) / .5)));
    m.wrap.updateMatrixWorld(true);
    // robot centre and facing, in shell space
    B.Hips.getWorldPosition(V3); var hipL = V3.clone().applyMatrix4(inv);
    var moving = 0, up = (u.tf && u.tf.mode === 'toRobot') ? false : true;
    for (var i = 0; i < panels.length; i++) {
      var P = panels[i], w = WIN[P.grp] || WIN.body, span = w[1] - w[0], st = w[0] + (P.ord / Math.max(1, P.cnt)) * span * S.spread, en = st + span * (1 - S.spread) + .04;
      var t = clamp((k - st) / (en - st));
      if (done || t <= 0) { P.piv.visible = false; P.locked = t >= 1 ? P.locked : 0; continue; }
      P.piv.visible = true; if (t > 0 && t < 1) moving++;
      // anchor on the robot: the chain bone this panel belongs to, pushed out of the armour surface
      var bone = null; for (var b = P.bi; b >= 0 && !bone; b--) bone = B[P.bone[b]]; if (!bone) for (var b2 = 0; b2 < P.bone.length && !bone; b2++) bone = B[P.bone[b2]]; bone = bone || B.Spine || B.Hips;
      bone.getWorldPosition(V1); var A = V1.applyMatrix4(inv); var out = V2.copy(A).sub(hipL); out.y *= .3; if (out.lengthSq() < 1e-4) out.set(-1, 0, 0); out.normalize(); if (P.grp === 'body') out.set(-1, .2, 0).normalize();   // backpack panels sit on the back
      var surf = A.clone().addScaledVector(out, H * .05);
      bone.getWorldQuaternion(Q1); var qA = gq.clone().multiply(Q1);
      var pos = new T.Vector3(), q = new T.Quaternion(), sc;
      if (t < .2) {   // 1) unlatch: the plate slides out of the armour and shakes once
        var a = ease(t / .2); pos.copy(A).lerp(surf, a); if (a > .7) pos.addScaledVector(out, Math.sin(t * 160 + P.seed * 9) * H * .006); q.copy(qA); sc = J.len * (.12 + .38 * a);
      } else if (t < .82) {   // 2) travel on an arc while turning over its hinge (fold, not float)
        var v = ratchet((t - .2) / .62, S.steps); var mid = surf.clone().lerp(P.home, .5); mid.y += J.len * (.12 + .18 * P.seed); mid.addScaledVector(out, J.len * .12);
        var p1 = surf.clone().lerp(mid, v), p2 = mid.clone().lerp(P.home, v); pos.copy(p1).lerp(p2, v);
        var flip = Math.PI * S.flip * P.flipS * (1 - v); var qh = new T.Quaternion().setFromAxisAngle(P.axis, flip); q.copy(qA).slerp(new T.Quaternion(), v).premultiply(qh);
        // turn about the hinge edge instead of the centre
        var hv = P.hinge.clone(); pos.add(hv.clone().sub(hv.clone().applyQuaternion(qh)).multiplyScalar(v)); sc = J.len * (.5 + .5 * v);
      } else {   // 3) lock: overshoot past the seat, bounce back, clank
        var l = (t - .82) / .18; var ov = Math.sin(l * Math.PI) * (1 - l) * S.over; pos.copy(P.home).addScaledVector(P.nrm, J.len * ov * .25); q.setFromAxisAngle(P.axis, ov * P.flipS * .8); sc = J.len;
        if (t >= 1 && !P.locked) { P.locked = 1; if (P.big || J.hero || (P.ord % 3 === 0)) { burst(J, pos, J.hero ? 6 : 3, P.big); clank(P.big); } }
      }
      if (t < 1) P.locked = 0;
      P.piv.position.copy(pos); P.piv.quaternion.copy(q); P.piv.scale.setScalar(sc);
    }
    // hydraulic rams (hero): from the robot bone to the travelling panel, outer sleeve + inner rod
    if (J.struts) J.struts.forEach(function (s) { var P = s.p; var vis = P.piv.visible && !done; var tt = 0; if (vis) { var w = WIN[P.grp] || WIN.body; tt = clamp((k - w[0]) / (w[1] - w[0])); vis = tt > .15 && tt < .9; } s.a.visible = s.b.visible = vis; if (!vis) return;
      var bone = B[P.bone[0]] || B.Spine || B.Hips; bone.getWorldPosition(V1); var a = V1.applyMatrix4(inv); var b = P.piv.position; var d = V2.copy(b).sub(a); var L = d.length(); if (L < 1e-3) { s.a.visible = s.b.visible = false; return; } d.normalize(); var Lm = J.len * .18; if (L > Lm) { a = b.clone().addScaledVector(d, -Lm); L = Lm; }   /* short rams only - never a long line across the screen */ var qq = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d); var r = J.len * .032;
      s.a.position.copy(a).addScaledVector(d, L * .3); s.a.quaternion.copy(qq); s.a.scale.set(r * 1.6, L * .6, r * 1.6); s.b.position.copy(a).addScaledVector(d, L * .7); s.b.quaternion.copy(qq); s.b.scale.set(r, L * .6, r); });
    if (moving > 0 && J.hero) servo(up, true); else if (moving > 2) servo(up, false);
    sparkTick(J);
    // the robot shrinks only a little and only once the hull has closed around it
    var hide = clamp((k - .42) / .2); m.wrap.scale.setScalar((m._ws0 || 1) * (1 - .6 * hide)); m.wrap.visible = k < .62;   /* tucked inside the hull before the last panels close */
    var ig = clamp((k - .9) / .1), sp2 = Math.hypot(u.vx || 0, u.vy || 0); J.fl.forEach(function (f) { f.visible = ig > .02 && !J.gnd; f.scale.set(1, ig * (.7 + Math.min(1, sp2 / 900) * .9) * (1 + Math.random() * .15), 1); });
    return true;
  };
  window.__tf3 = { pose: pose, HERO: HERO, STY: STY, WIN: WIN };
})();
