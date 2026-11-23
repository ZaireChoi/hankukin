/* ASCEND v3.61 — MISSILE ENGINE (one engine for every missile in the game)
   Flight profiles
     vertical : missiles from a robot frame. They leave the shoulder pods straight up, slow while the motor builds thrust,
                pitch over, chase the target on a loose free curve, and are at their fastest in the last stretch.
     rocket   : shoulder rocket launchers / ground launchers. Straight and level at the target, slow off the rail, speeding up
                until full thrust. The launcher kicks back; at speed the rocket punches pressure rings through the air.
     aa       : air-to-air from a flying unit. Level flight, follows the target as it moves, same speed build-up and rings.
     bomb     : air-to-ground from a flying unit. A straight line down onto the aimed spot.
   Look: dark gunmetal body, black nose and fins, blue band (Meshy model when it is loaded, built-in model until then),
         a small blue-white motor flame on every missile, a thin smoke trail, an explosion on the unit it hits.
   Cost: everything is drawn with 5 instanced draw calls in total, whatever the number of missiles; no per-frame allocation;
         phones get fewer smoke puffs and sparks; caps on missiles and particles keep big salvos from dropping frames.
   API: window.MSLE.fire({profile, kind, x, y, h, dir:[dx,dh,dy], target, tx, ty, th, dmg, src, dt, splash, delay})
        window.MSLE.salvo(unit, n, targets, {dmg, src, dt})   — n missiles, half from each shoulder pod */
(function () {
  'use strict';
  var T = null, R = null, ok = false;
  var phone = function () { return !!window.__phone; };
  // ------------------------------------------------------------------ kinds (sizes in world units)
  var KIND = {
    micro: { len: 17, flame: 10, fw: 4.2, ex: 60, puff: 7, puffL: .5, puffDt: .022, ring: 0 },   // small: 20 of them fit the two shoulder pods
    heavy: { len: 46, flame: 30, fw: 10, ex: 150, puff: 16, puffL: .7, puffDt: .03, ring: 0 },
    rocket: { len: 34, flame: 22, fw: 7, ex: 100, puff: 11, puffL: .5, puffDt: .03, ring: 0 }
  };
  // ------------------------------------------------------------------ WARHEADS (the body stays black/grey/blue; the warhead shows in the nose light, the flame and the blast)
  //   he    red-orange : full damage, fire blast                       emp   silver : stuns machines 1.8 s (organics 0.5 s), 40 % damage
  //   acid  lime green : organics take 1.6x, burns 4 s, 35 % slow, puddle 3 s     flash yellow : 1.5 s blinding in 170 range, 20 % damage
  //   cut by a blade: he / emp are stopped; acid / flash burst right there (no less harm). Shot down in the air: flash still flashes, acid rains.
  var WH = {
    he: { k: 'he', col: [1, .42, .16], fl: [1, .7, .45], dm: 1, r: 0, cut: true },
    emp: { k: 'emp', col: [.86, .92, 1], fl: [.8, .9, 1], dm: .4, r: 95, cut: true },
    acid: { k: 'acid', col: [.62, 1, .18], fl: [.7, 1, .4], dm: .5, r: 105, cut: false },
    flash: { k: 'flash', col: [1, .93, .35], fl: [1, .95, .6], dm: .2, r: 170, cut: false },
    poison: { k: 'poison', col: [.62, .3, 1], fl: [.75, .5, 1], dm: .45, r: 120, cut: false }   // violet toxin: long burn (6 s), stops healing, no slow
  };
  var PROF = {
    vertical: { climb: .42, v0: 110, vClimb: 360, vmax: 1100, vEnd: 1380, endR: 460, acc: 1700, turn: 3.0, turnUp: 9, wob: .5, wf: 6.5, life: 4.5 },
    direct: { v0r: .28, accT: .5, vmax: 900, life: 4, rings: 0 },   /* v3.92: seen from above the launch pressure rings read as small white circles on the ground - off */
    rocket: { v0r: .3, accT: .45, rings: 0 },
    aa: { v0r: .35, accT: .35, rings: 0 },
    bomb: { v0r: .3, accT: .3, rings: 0 },
    intercept: { v0r: .45, accT: .2, rings: 0 }
  };
  var MAXM = 160, LIVE = [], fr = 0;
  // ------------------------------------------------------------------ shared math scratch
  var V, Q, M4, SC, ZA, UP;
  // ------------------------------------------------------------------ textures
  var radTex = function (soft) {
    var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) { gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, 'rgba(255,255,255,.85)'); gr.addColorStop(.55, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); var t = new T.CanvasTexture(c); t.userData = { keep: 1 }; return t;
  };
  // ------------------------------------------------------------------ billboard particle system (1 draw call each)
  var VS = 'attribute vec4 aP;attribute vec4 aC;varying vec2 vUv;varying vec4 vC;void main(){vUv=uv;vC=aC;vec4 mv=modelViewMatrix*vec4(aP.xyz,1.0);mv.xy+=position.xy*aP.w;gl_Position=projectionMatrix*mv;}';
  var FS = 'uniform sampler2D map;varying vec2 vUv;varying vec4 vC;void main(){float a=texture2D(map,vUv).a*vC.a;if(a<.004)discard;gl_FragColor=vec4(vC.rgb,a);}';
  var BB = function (max, add, tex, order) {
    var pg = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry();
    g.index = pg.index; g.setAttribute('position', pg.attributes.position); g.setAttribute('uv', pg.attributes.uv);
    var aP = new T.InstancedBufferAttribute(new Float32Array(max * 4), 4), aC = new T.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    aP.setUsage(T.DynamicDrawUsage); aC.setUsage(T.DynamicDrawUsage); g.setAttribute('aP', aP); g.setAttribute('aC', aC); g.instanceCount = 0;
    var mat = new T.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending });
    var mesh = new T.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = order || 5; mesh.userData.keep = 1; mesh.userData.core = 1;
    var P = []; for (var i = 0; i < max; i++) P.push({ l: 0 });
    var n = 0, w = 0, cur = 0;
    return {
      mesh: mesh, max: max,
      add: function (x, y, z, vx, vy, vz, s0, s1, life, r, gg, b, a, drag) {
        var p; if (n < max) p = P[n++]; else { p = P[cur]; cur = (cur + 1) % max; }
        p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.s0 = s0; p.s1 = s1; p.l = life; p.ml = life; p.r = r; p.g = gg; p.b = b; p.a = a; p.d = drag || 0;
      },
      begin: function (dt) {
        var A = aP.array, C = aC.array; w = 0;
        for (var i = 0; i < n; i++) {
          var p = P[i]; p.l -= dt;
          if (p.l <= 0) { n--; var t = P[i]; P[i] = P[n]; P[n] = t; i--; continue; }
          if (p.d) { var f = Math.max(0, 1 - p.d * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          var k = 1 - p.l / p.ml, o = w * 4;
          A[o] = p.x; A[o + 1] = p.y; A[o + 2] = p.z; A[o + 3] = p.s0 + (p.s1 - p.s0) * k;
          C[o] = p.r; C[o + 1] = p.g; C[o + 2] = p.b; C[o + 3] = p.a * (1 - k); w++;
        }
      },
      now: function (x, y, z, s, r, gg, b, a) { if (w >= max) return; var A = aP.array, C = aC.array, o = w * 4; A[o] = x; A[o + 1] = y; A[o + 2] = z; A[o + 3] = s; C[o] = r; C[o + 1] = gg; C[o + 2] = b; C[o + 3] = a; w++; },
      end: function () { g.instanceCount = w; aP.needsUpdate = true; aC.needsUpdate = true; mesh.visible = w > 0; },
      count: function () { return n; }
    };
  };
  // ------------------------------------------------------------------ built-in missile model (dark grey body, black nose/fins, blue band)
  var merge = function (parts) {
    var pos = [], nor = [], col = [];
    parts.forEach(function (pp) {
      var g = pp[0].index ? pp[0].toNonIndexed() : pp[0]; g.computeVertexNormals(); var c = new T.Color(pp[1]);
      var P = g.attributes.position.array, N = g.attributes.normal.array;
      for (var i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(N[i]); }
      for (var j = 0; j < P.length / 3; j++) col.push(c.r, c.g, c.b);
    });
    var out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new T.Float32BufferAttribute(col, 3)); return out;
  };
  var builtin = function () {
    var Z = function (g, z) { g.rotateX(Math.PI / 2); g.translate(0, 0, z); return g; };
    var fin1 = new T.BoxGeometry(.012, .3, .13); fin1.translate(0, 0, -.33); var fin2 = new T.BoxGeometry(.3, .012, .13); fin2.translate(0, 0, -.33);
    var finF1 = new T.BoxGeometry(.01, .17, .06); finF1.translate(0, 0, .12); var finF2 = new T.BoxGeometry(.17, .01, .06); finF2.translate(0, 0, .12);
    return merge([
      [Z(new T.CylinderGeometry(.068, .068, .66, 10, 1), -.05), 0x59616c],        // gunmetal body
      [Z(new T.CylinderGeometry(.071, .071, .07, 10, 1), .2), 0x2f86ff],          // blue band
      [Z(new T.CylinderGeometry(.071, .071, .025, 10, 1), -.22), 0x2f86ff],       // thin rear band
      [Z(new T.ConeGeometry(.068, .2, 10, 1), .38), 0x141619],                    // black nose
      [Z(new T.CylinderGeometry(.05, .064, .07, 10, 1, true), -.415), 0x26292e],  // nozzle
      [fin1, 0x17191d], [fin2, 0x17191d], [finF1, 0x17191d], [finF2, 0x17191d]
    ]);
  };
  // ------------------------------------------------------------------ scene objects
  var BODY, FLAME, RING, GLOW, SMOKE;
  var setup = function () {
    T = window.THREE; R = window.R3; if (!T || !R || !R.scene) return false;
    V = new T.Vector3(); Q = new T.Quaternion(); M4 = new T.Matrix4(); SC = new T.Vector3(); ZA = new T.Vector3(0, 0, 1); UP = new T.Vector3(0, 1, 0);
    var hot = radTex(false), soft = radTex(true);
    BODY = new T.InstancedMesh(builtin(), new T.MeshStandardMaterial({ vertexColors: true, metalness: .55, roughness: .42, emissive: 0x0c1016 }), MAXM);
    BODY.count = 0; BODY.frustumCulled = false; BODY.userData.keep = 1; BODY.userData.core = 1;
    // motor flame: two crossed planes reaching back from the nozzle (z from 0 to -1)
    var fp = new T.PlaneGeometry(1, 1); fp.translate(0, 0, 0); fp.rotateY(Math.PI / 2); fp.translate(0, 0, -.5); var fp2 = fp.clone(); fp2.rotateZ(Math.PI / 2);
    var fg = new T.BufferGeometry(); var a1 = fp.toNonIndexed(), a2 = fp2.toNonIndexed();
    var pos = new Float32Array(a1.attributes.position.array.length * 2); pos.set(a1.attributes.position.array, 0); pos.set(a2.attributes.position.array, a1.attributes.position.array.length);
    var uv = new Float32Array(a1.attributes.uv.array.length * 2); uv.set(a1.attributes.uv.array, 0); uv.set(a2.attributes.uv.array, a1.attributes.uv.array.length);
    // planes after rotateY lie in the YZ plane; uv.x runs along z — stretch the hot spot to the nozzle end
    fg.setAttribute('position', new T.BufferAttribute(pos, 3)); fg.setAttribute('uv', new T.BufferAttribute(uv, 2));
    var ftex = (typeof window.flameTex === 'function' ? window.flameTex() : null) || hot;
    FLAME = new T.InstancedMesh(fg, new T.MeshBasicMaterial({ map: ftex, color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), MAXM);
    FLAME.instanceColor = new T.InstancedBufferAttribute(new Float32Array(MAXM * 3), 3); FLAME.count = 0; FLAME.frustumCulled = false; FLAME.userData.keep = 1; FLAME.userData.core = 1;
    // pressure rings ("pang pang pang" through the air)
    RING = new T.InstancedMesh(new T.RingGeometry(.78, 1, 28), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), 128);
    RING.instanceColor = new T.InstancedBufferAttribute(new Float32Array(128 * 3), 3); RING.count = 0; RING.frustumCulled = false; RING.userData.keep = 1; RING.userData.core = 1; RING.userData.list = [];
    GLOW = BB(phone() ? 260 : 520, true, hot, 7);
    SMOKE = BB(phone() ? 200 : 460, false, soft, 6);
    ok = true; loadModel(); return true;
  };
  var attach = function () { if (!ok && !setup()) return false; var s = R.scene; [BODY, FLAME, RING, GLOW.mesh, SMOKE.mesh].forEach(function (o) { if (o.parent !== s) s.add(o); }); return true; };
  // ------------------------------------------------------------------ Meshy model (replaces the built-in one when it is there)
  var loadModel = function () {
    try {
      var X = window.__TX || {}; if (!X.GLTFLoader) return;
      new X.GLTFLoader().load('models/w_micromissile.glb?v=361', function (g) {
        try {
          var src = null; g.scene.updateMatrixWorld(true); g.scene.traverse(function (o) { if (o.isMesh && !src) src = o; }); if (!src) return;
          var geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld); geo.computeBoundingBox(); var bb = geo.boundingBox, s = new T.Vector3(); bb.getSize(s);
          var c = new T.Vector3(); bb.getCenter(c); geo.translate(-c.x, -c.y, -c.z);
          // longest side becomes +Z
          if (s.x >= s.y && s.x >= s.z) geo.rotateY(-Math.PI / 2); else if (s.y >= s.x && s.y >= s.z) geo.rotateX(Math.PI / 2);
          geo.computeBoundingBox(); var L = geo.boundingBox.max.z - geo.boundingBox.min.z; geo.scale(1 / L, 1 / L, 1 / L);
          // the nose is the thin end: compare the average radius of the front and back 15 %
          var P = geo.attributes.position, fr2 = 0, fn = 0, bk = 0, bn = 0;
          for (var i = 0; i < P.count; i++) { var z = P.getZ(i), r = Math.hypot(P.getX(i), P.getY(i)); if (z > .35) { fr2 += r; fn++; } else if (z < -.35) { bk += r; bn++; } }
          if (fn && bn && fr2 / fn > bk / bn) geo.rotateY(Math.PI);
          geo.computeVertexNormals(); geo.computeBoundingSphere();
          var m = src.material; var mat = new T.MeshStandardMaterial({ map: m && m.map || null, color: 0xffffff, metalness: .6, roughness: .4, emissive: 0x0a0e14 });
          if (mat.map) mat.map.userData = { keep: 1 };
          // two glowing blue bands around the body (the Meshy paint is black / grey; the blue is added here, no extra texture)
          mat.onBeforeCompile = function (sh) {
            sh.vertexShader = 'varying float vLz;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLz = position.z;');
            sh.fragmentShader = 'varying float vLz;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n float bnd = (1.0 - smoothstep(.018, .03, abs(vLz - .06))) + (1.0 - smoothstep(.01, .02, abs(vLz + .2)));\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.16, .48, 1.0), bnd);\n totalEmissiveRadiance += vec3(.12, .42, 1.0) * bnd * .9;');
          };
          BODY.geometry = geo; BODY.material = mat; window.MSLE.model = 'meshy';
        } catch (e) { window.MSLE.err = 'model ' + e; }
      }, null, function () { window.MSLE.model = 'builtin'; });
    } catch (e) {}
  };
  // ------------------------------------------------------------------ helpers
  var uh = function (u) { try { return (typeof unitH === 'function' ? unitH(u) : 0); } catch (e) { return 0; } };
  var aimH = function (u) { return uh(u) + Math.min(60, (u.r || 20) * 1.3); };
  var lost = function (u) { return !u || u.dead || u.flare > 0 || u.evade > 0; };
  var foeNear = function (team, x, y, r) { var best = null, bd = r * r; for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (e.dead || e.team === team || e.team === 2) continue; var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y); if (d < bd) { bd = d; best = e; } } return best; };
  var sndT = 0, ringSndT = 0;
  // ------------------------------------------------------------------ explosion on impact
  var boom = function (x, h, y, K, big) {
    var ex = K.ex * (big || 1), ph = phone();
    GLOW.add(x, h, y, 0, 0, 0, ex * .5, ex * 1.7, .13, 1, .97, .9, 1);                                     // white flash
    for (var i = 0; i < (ph ? 2 : 3); i++) { var a = Math.random() * 6.28, r = ex * .22;
      GLOW.add(x + Math.cos(a) * r, h + Math.random() * r, y + Math.sin(a) * r, Math.cos(a) * 40, 30, Math.sin(a) * 40, ex * .35, ex * 1.05, .34 + Math.random() * .1, 1, .55 + Math.random() * .2, .18, .9, 2); }
    GLOW.add(x, h, y, 0, 0, 0, ex * .3, ex * .9, .2, .45, .75, 1, .7);                                     // blue core (the missile colour)
    for (var j = 0; j < (ph ? 2 : 3); j++) { var b = Math.random() * 6.28;
      SMOKE.add(x + Math.cos(b) * ex * .2, h + 6, y + Math.sin(b) * ex * .2, Math.cos(b) * 30, 46 + Math.random() * 30, Math.sin(b) * 30, ex * .45, ex * 1.35, .8 + Math.random() * .4, .2, .21, .23, .55, 1.2); }
    try { for (var q = 0; q < (ph ? 3 : 5); q++) { var c = Math.random() * 6.28, sp = 110 + Math.random() * 220; part(x, y, Math.cos(c) * sp, Math.sin(c) * sp, .32, q % 2 ? '#ff9a3c' : '#ffe2a0', 4.5, h); } } catch (e) {}
    try { if (big || Math.random() < .35) G.parts.push({ x: x, y: y, vx: 0, vy: 0, l: .26, ml: .26, c: 'ring', s: ex * 1.3 }); } catch (e) {}
    var t = G.t || 0; if (t - sndT > .07) { sndT = t; try { SFX.noise(.16, .1 + (big ? .1 : 0), big ? 380 : 700); } catch (e) {} }
  };
  // ------------------------------------------------------------------ spawning
  var spawn = function (o) {
    if (!attach()) return null;
    if (LIVE.length >= MAXM) { LIVE = LIVE.filter(function (q) { return !q.dead; }); }
    if (LIVE.length >= MAXM) { // full: my own missiles always fly — drop the oldest bullet-borne visual to make room
      var mine = o.src && G.local && o.src === G.local; if (!mine) return null; for (var di = 0; di < LIVE.length; di++) if (LIVE[di].b) { LIVE[di].b._eng = null; LIVE[di].dead = 1; LIVE.splice(di, 1); break; } if (LIVE.length >= MAXM) return null; }
    var m = { prof: o.profile || 'vertical', K: KIND[o.kind || 'micro'] || KIND.micro, P: PROF[o.profile || 'vertical'], x: o.x, h: o.h, y: o.y, t: 0, delay: o.delay || 0,
      tg: o.target || null, tx: o.tx, th: o.th, ty: o.ty, dmg: o.dmg || 0, src: o.src || null, dt: o.dt || 'x', splash: o.splash || 0, sw: o.sw || 0, team: o.team,
      wh: WH[o.wh] || WH.he, tm: o.tm || null, seed: Math.random() * 6.28, puffA: 0, ringA: 0, b: o.bullet || null, roll: Math.random() * 6.28, spd: 0 };
    var d = o.dir || [0, 1, 0], L = Math.hypot(d[0], d[1], d[2]) || 1; m.dx = d[0] / L; m.dh = d[1] / L; m.dy = d[2] / L;
    if (m.prof === 'vertical') m.spd = m.P.v0;
    if (m.tg) { m.tx = m.tg.x; m.ty = m.tg.y; m.th = aimH(m.tg); }
    if (m.b) { m.v0 = Math.hypot(m.b.vx, m.b.vy) || 600; m.h0 = m.h; m.dist = m.b.life * m.v0; m.trav = 0; m.lx = m.b.x; m.ly = m.b.y; m.b._eng = m; }
    LIVE.push(m); return m;
  };
  // the two shoulder pods of a frame
  var shoulders = function (u) {
    var out = null;
    try {
      var e = R.units && R.units.get(u.id), B = e && e.mdl && window.__AX && window.__AX.motBones(e.mdl);
      if (B) { var l = B.LeftShoulder || B.LeftArm, r = B.RightShoulder || B.RightArm; if (l && r) { var a = new T.Vector3(), b = new T.Vector3(); l.getWorldPosition(a); r.getWorldPosition(b); var H = (e.wg && e.wg.H) || 90, sx = a.x - b.x, sz = a.z - b.z, sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl; out = [[a.x + sx * H * .13, a.y + H * .14, a.z + sz * H * .13], [b.x - sx * H * .13, b.y + H * .14, b.z - sz * H * .13]]; } }
    } catch (er) {}
    if (!out) { var f = u.aa != null ? u.aa : (u.a || 0), sx = Math.cos(f + Math.PI / 2), sy = Math.sin(f + Math.PI / 2), hh = uh(u) + 78, w = (u.r || 24) * .9;
      out = [[u.x + sx * w, hh, u.y + sy * w], [u.x - sx * w, hh, u.y - sy * w]]; }
    return out;
  };
  var salvo = function (u, n, targets, o) {
    if (!u || !attach()) return 0; o = o || {}; var sh = shoulders(u), f = u.aa != null ? u.aa : (u.a || 0), fx = Math.cos(f), fy = Math.sin(f), c = 0;
    for (var i = 0; i < n; i++) {
      var s = sh[i % 2], side = i % 2 ? -1 : 1, px = -fy * side, py = fx * side;
      var tg = targets && targets.length ? targets[i % targets.length] : null;
      var m = spawn({ profile: 'vertical', kind: o.kind || 'micro', x: s[0] + (Math.random() - .5) * 6, h: s[1], y: s[2] + (Math.random() - .5) * 6,
        dir: [px * .22 - fx * .12 + (Math.random() - .5) * .1, 1, py * .22 - fy * .12 + (Math.random() - .5) * .1],
        target: tg, tx: tg ? null : u.x + fx * 700, ty: tg ? null : u.y + fy * 700, th: tg ? null : 10, dmg: o.dmg || 0, src: o.src || u.slot, dt: o.dt || 'x', sw: o.sw, team: u.team,
        delay: (o.delay || 0) + (i >> 1) * .055 + Math.random() * .02 });
      if (m) c++;
    }
    // pods puff open
    try { for (var k = 0; k < 2; k++) SMOKE.add(sh[k][0], sh[k][1], sh[k][2], 0, 40, 0, 14, 40, .5, .7, .72, .76, .45, 1); } catch (e) {}
    try { SFX.noise(.5, .22, 2400); SFX.tone(260, .45, 'sawtooth', .025, 820); } catch (e) {}
    return c;
  };
  // ------------------------------------------------------------------ DEFENCE: skilled androids read the incoming salvo and answer with their frame's own move
  //   shield : a bubble that eats a few missiles (10 % chip damage each)   slash : the blade cuts missiles in two before they land
  //   dash   : a side-step at the last moment, the missiles close behind lose the lock and hit the ground
  //   Each answer has a limit, so a big salvo still gets through: the frame only takes less of it.
  var SHL = [], DEB = [], SHM = null;
  var mkShield = function () {
    var mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.FrontSide,
      vertexShader: 'varying vec3 vN;varying vec3 vV;varying vec3 vC;void main(){mat4 im=instanceMatrix;vec4 mv=modelViewMatrix*im*vec4(position,1.0);vN=normalize(normalMatrix*mat3(im)*normal);vV=normalize(-mv.xyz);vC=instanceColor;gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec3 vN;varying vec3 vV;varying vec3 vC;void main(){float f=pow(1.0-abs(dot(normalize(vN),vV)),2.2);gl_FragColor=vec4(vC*(f*1.2),1.0);}' });
    SHM = new T.InstancedMesh(new T.IcosahedronGeometry(1, 3), mat, 16); SHM.instanceColor = new T.InstancedBufferAttribute(new Float32Array(48), 3); SHM.count = 0; SHM.frustumCulled = false; SHM.userData.keep = 1; SHM.userData.core = 1;
  };
  var dSkill = function (u) {
    if (!u || u.dead) return 0; var me = G.local && u === G.local.unit; if (me && !(typeof P !== 'undefined' && P && P.autoHunt)) return 0;
    var s = 0; if (u.cls === 'arkframe') s = .45; if (u.fbs || u.boss) s = .85; if (u.elite || u.named || u.hero) s = Math.max(s, .65); if (!s) return 0;
    var lv = u.lv || (u.slot && u.slot.lv) || 0; return Math.min(.92, s + Math.min(.25, lv * .01));
  };
  var dType = function (u) {
    try { if (u.shldSub || u.arm === 'heavy' || (CL[u.cls] && CL[u.cls].shield)) return 'shield'; } catch (e) {}
    try { if (u.melSub || (typeof styleOf === 'function' && typeof MSTYLE !== 'undefined' && styleOf(u) === MSTYLE.saber)) return 'slash'; } catch (e) {}
    return ['dash', 'slash', 'shield'][(u.id | 0) % 3];
  };
  var defend = function (u, m) {
    var now = G.t || 0, s = u._md; if (s && now < s.until) return s; if (s && now < s.cd) return null;
    var sk = dSkill(u); if (!sk) return null; if (Math.random() > sk) { u._md = { until: 0, cd: now + 1.2 }; return null; }
    var ty = dType(u); if (sk >= .85 && Math.random() < .65) ty = 'intercept';
    if (ty === 'intercept') { s = u._md = { type: ty, until: now + 1.6, cd: now + 5, cap: 2 + Math.round(sk * 4), used: 0, u: u }; return s; }
    if (ty === 'shield') { s = u._md = { type: ty, until: now + 1.5, cd: now + 7, cap: 3 + Math.round(sk * 5), used: 0, u: u, t0: now }; SHL.push(s); try { SFX.tone(520, .25, 'sine', .04, 900); } catch (e) {} }
    else if (ty === 'slash') { s = u._md = { type: ty, until: now + 1.0, cd: now + 3.5, cap: 2 + Math.round(sk * 4), used: 0, u: u }; }
    else {
      // side-step across the line of the incoming missile
      var px = -m.dy, py = m.dx, pl = Math.hypot(px, py) || 1, sd = Math.random() < .5 ? 1 : -1, D = 150 + sk * 60; px = px / pl * sd; py = py / pl * sd;
      for (var g = 0; g < 4; g++) GLOW.add(u.x + px * D * g / 4, aimH(u) * .6, u.y + py * D * g / 4, 0, 0, 0, 30, 10, .25, .55, .8, 1, .45);
      u.x += px * D; u.y += py * D; try { if (typeof collideGround === 'function') collideGround(u); } catch (e) {}
      var lostN = 0, capD = 3 + Math.round(sk * 6);
      for (var i = 0; i < LIVE.length && lostN < capD; i++) { var q = LIVE[i]; if (q.dead || q.tg !== u || q.delay > 0) continue; var dd = Math.hypot(q.tx - q.x, q.ty - q.y); if (dd < 360) { q.tg = null; q.th = 2; lostN++; } }
      s = u._md = { type: ty, until: now + .3, cd: now + 4, cap: 0, used: 0, u: u }; try { SFX.noise(.12, .12, 2600); } catch (e) {}
    }
    return s;
  };
  var cutMissile = function (m, u) {
    m.dead = 1; var K = m.K;
    for (var h = 0; h < 2; h++) DEB.push({ x: m.x + m.dx * K.len * (h ? -.25 : .25), h: m.h, y: m.y + m.dy * K.len * (h ? -.25 : .25), vx: m.dx * 120 * (h ? -1 : 1) + (Math.random() - .5) * 160, vh: 120 + Math.random() * 80, vy: m.dy * 120 * (h ? -1 : 1) + (Math.random() - .5) * 160, ax: Math.random(), ay: Math.random(), l: .6, K: K });
    GLOW.add(m.x, m.h, m.y, 0, 0, 0, K.ex * .25, K.ex * .7, .12, 1, .7, .95, .9);
    try { for (var q = 0; q < 3; q++) { var c = Math.random() * 6.28; part(m.x, m.y, Math.cos(c) * 200, Math.sin(c) * 200, .2, '#ffd0f0', 3, m.h); } } catch (e) {}
    try { u.slashT = Math.max(u.slashT || 0, .3); } catch (e) {}
    var t = G.t || 0; if (t - sndT > .05) { sndT = t; try { SFX.tone(1800, .05, 'square', .03, 400); } catch (e) {} }
  };
  // ------------------------------------------------------------------ per-frame update
  var trailPuff = function (m, K, n) {
    var lu = G.local && G.local.unit; if (lu && m.b && Math.abs(m.x - lu.x) + Math.abs(m.y - lu.y) > 2200) return;   // far rockets: no smoke (cost)
    var ph = phone(), crowd = Math.max(1, n / (ph ? 10 : 18)), dtp = K.puffDt * crowd;
    m.puffA += m._dt; while (m.puffA >= dtp) { m.puffA -= dtp; var bx = m.x - m.dx * K.len * .55, bh = m.h - m.dh * K.len * .55, by = m.y - m.dy * K.len * .55;
      SMOKE.add(bx, bh, by, (Math.random() - .5) * 18, 8 + Math.random() * 14, (Math.random() - .5) * 18, K.puff * .7, K.puff * 2.6, K.puffL, .7, .72, .78, .5, 2); }
  };
  var pressureRing = function (m, K) {
    var L = RING.userData.list; if (L.length >= 120) L.shift();
    L.push({ x: m.x + m.dx * K.len * .55, h: m.h + m.dh * K.len * .55, y: m.y + m.dy * K.len * .55, dx: m.dx, dh: m.dh, dy: m.dy, s: K.len * .22, l: .24, ml: .24 });
    var t = G.t || 0; if (t - ringSndT > .11 && m.local) { ringSndT = t; try { SFX.noise(.05, .05, 1800); } catch (e) {} }
  };
  var steer = function (m, wx, wh, wy, rate, dt) {
    var L = Math.hypot(wx, wh, wy) || 1; wx /= L; wh /= L; wy /= L;
    var dot = m.dx * wx + m.dh * wh + m.dy * wy; var ang = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (ang < 1e-4) { m.dx = wx; m.dh = wh; m.dy = wy; return; }
    var k = Math.min(1, rate * dt / ang); m.dx += (wx - m.dx) * k; m.dh += (wh - m.dh) * k; m.dy += (wy - m.dy) * k;
    var l2 = Math.hypot(m.dx, m.dh, m.dy) || 1; m.dx /= l2; m.dh /= l2; m.dy /= l2;
  };
  var isMechU = function (u) { try { return typeof isMech === 'function' ? isMech(u.cls) : u.cls === 'arkframe'; } catch (e) { return false; } };
  var isBio = function (u) { return !!u && !isMechU(u) && (u.bio || u.arm === 'inf' || /zeta|swarm|beast|bug|hive|crawl|spawn|brood/i.test(u.cls || '')); };
  var DOT = [], PUD = [], flashEl = null;
  var whBlast = function (m, x, h, y) {
    var c = m.wh.col, ex = m.K.ex, ph = phone();
    GLOW.add(x, h, y, 0, 0, 0, ex * .4, ex * (m.wh === WH.flash ? 3.2 : 1.6), m.wh === WH.flash ? .22 : .16, c[0], c[1], c[2], 1);
    GLOW.add(x, h, y, 0, 0, 0, ex * .2, ex * .8, .1, 1, 1, 1, 1);
    if (m.wh === WH.emp) { try { for (var i = 0; i < (ph ? 4 : 7); i++) { var a = Math.random() * 6.28, s = 160 + Math.random() * 200; part(x, y, Math.cos(a) * s, Math.sin(a) * s, .18, i % 2 ? '#e8f0ff' : '#9fc4ff', 2.5, h + (Math.random() - .5) * 30); } G.parts.push({ x: x, y: y, vx: 0, vy: 0, l: .3, ml: .3, c: 'ring', s: m.wh.r * 2 }); } catch (e) {} }
    if (m.wh === WH.acid) { for (var j = 0; j < (ph ? 3 : 5); j++) { var b = Math.random() * 6.28; GLOW.add(x, h, y, Math.cos(b) * 120, 60, Math.sin(b) * 120, 6, 3, .45, .55, 1, .2, .9, 1); }
      for (var k = 0; k < 2; k++) SMOKE.add(x, h, y, (Math.random() - .5) * 30, 30, (Math.random() - .5) * 30, ex * .5, ex * 1.2, 1, .45, .62, .2, .5, 1); }
    if (m.wh === WH.flash) { try { G.parts.push({ x: x, y: y, vx: 0, vy: 0, l: .25, ml: .25, c: 'ring', s: m.wh.r * 2 }); } catch (e) {} }
    if (m.wh === WH.poison) { for (var p2 = 0; p2 < (ph ? 2 : 4); p2++) SMOKE.add(x + (Math.random() - .5) * ex * .6, h, y + (Math.random() - .5) * ex * .6, (Math.random() - .5) * 30, 18, (Math.random() - .5) * 30, ex * .5, ex * 1.5, 1.6, .42, .2, .55, .55, .6); }
    var t = G.t || 0; if (t - sndT > .07) { sndT = t; try { if (m.wh === WH.emp) SFX.tone(160, .25, 'square', .04, 60); else if (m.wh === WH.flash) SFX.noise(.08, .18, 4000); else SFX.noise(.2, .08, 500); } catch (e) {} }
  };
  var blindMe = function (k) { try { if (!flashEl) { flashEl = document.createElement('div'); flashEl.style.cssText = 'position:fixed;inset:0;background:#fffbe6;pointer-events:none;z-index:40;opacity:0;transition:opacity 1.4s ease-out'; document.body.appendChild(flashEl); }
    flashEl.style.transition = 'none'; flashEl.style.opacity = String(.75 * k); void flashEl.offsetWidth; flashEl.style.transition = 'opacity 1.4s ease-out'; flashEl.style.opacity = '0'; } catch (e) {} };
  // warhead effect around a point; 'hit' is the unit struck directly (always inside)
  var whApply = function (m, x, h, y, hit) {
    var W = m.wh, r = W.r; if (!r) return; var me = G.local && G.local.unit;
    for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; if (u.dead || u.team === m.team || u.team === 2) continue;
      var d = Math.hypot(u.x - x, u.y - y); if (u !== hit && d > r + (u.r || 20)) continue; if (Math.abs(aimH(u) - h) > r * 1.6 && u !== hit) continue;
      if (W === WH.emp) { var st = isMechU(u) || u.arm === 'heavy' ? 1.8 : .5; u.stun = Math.max(u.stun || 0, st); u.jam = Math.max(u.jam || 0, st); }
      else if (W === WH.acid) { var bio = isBio(u) ? 1.6 : 1; DOT.push({ u: u, dps: m.dmg * .2 * bio, until: (G.t || 0) + 4, acc: 0, src: m.src }); u.slow = Math.max(u.slow || 0, .35); }
      else if (W === WH.flash) { u.conf = Math.max(u.conf || 0, 1.5); if (u === me) blindMe(1 - Math.min(1, d / (r * 1.4))); }
      else if (W === WH.poison) { var bio2 = isBio(u) ? 1.5 : 1; DOT.push({ u: u, dps: m.dmg * .16 * bio2, until: (G.t || 0) + 6, acc: 0, src: m.src, pz: 1 }); u.noHeal = Math.max(u.noHeal || 0, 6); }
    }
    if (W === WH.acid) PUD.push({ x: x, y: y, r: 80, until: (G.t || 0) + 3, team: m.team, dps: m.dmg * .15, src: m.src, acc: 0 });
  };
  // a missile shot down in the air: no hit, but a flash still flashes and acid still rains down
  var airBurst = function (m) {
    if (m.dead) return; m.dead = 1;
    if (m.wh === WH.he || m.wh === WH.emp) { boom(m.x, m.h, m.y, m.K, .6); return; }
    whBlast(m, m.x, m.h, m.y); whApply(m, m.x, Math.max(20, m.h * .4), m.y, null);
  };
  var explode = function (m, hitUnit) {
    m.dead = 1; if (m.wh === WH.he || m.b) boom(m.x, m.h, m.y, m.K, m.K === KIND.heavy ? 1.3 : 1); else whBlast(m, m.x, m.h, m.y);
    if (m.b) return;                                   // bullet-borne rockets: the game already dealt the damage
    try {
      var tg = hitUnit;
      if (tg && !tg.dead && m.dmg) hurt(tg, m.dmg * m.wh.dm * (m.wh === WH.acid && isBio(tg) ? 1.6 : 1), m.src, Math.atan2(m.dy, m.dx), m.dt);
      if (m.wh !== WH.he) whApply(m, m.x, m.h, m.y, tg);
      if (m.splash > 0) { for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (e === tg || e.dead || e.team === m.team || e.team === 2) continue; if ((e.x - m.x) * (e.x - m.x) + (e.y - m.y) * (e.y - m.y) < m.splash * m.splash) hurt(e, m.dmg * .5, m.src, 0, m.dt); } }
      if (m.sw && typeof swArea === 'function') swArea(m.x, m.y, 90, m.dmg * .5, m.src);
    } catch (e) {}
  };
  var tick = function (dt) {
    if (!ok || !LIVE.length && !GLOW.count() && !SMOKE.count() && !RING.userData.list.length && !SHL.length && !DEB.length && !DOT.length && !PUD.length) { if (SHM) SHM.count = 0; if (ok) { BODY.count = 0; FLAME.count = 0; RING.count = 0; GLOW.begin(0); GLOW.end(); SMOKE.begin(0); SMOKE.end(); } return; }
    attach(); fr++;
    if (LIVE.some(function (m) { return m.b; })) for (var bi = 0; bi < G.bullets.length; bi++) { var bb = G.bullets[bi]; if (bb._eng) bb._eng.seen = fr; }
    GLOW.begin(dt); SMOKE.begin(dt);
    var nb = 0, nf = 0, live = 0, now = G.t || 0, localU = G.local && G.local.unit;
    for (var i = 0; i < LIVE.length; i++) {
      var m = LIVE[i]; if (m.dead) continue; if (m.delay > 0) { m.delay -= dt; continue; } live++;
      m.t += dt; m._dt = dt; var K = m.K, P = m.P, thrust = 1;
      if (m.b) {
        // ---- bullet-borne: rocket / aa / bomb — the game moves it, the engine shapes speed and looks
        var b = m.b; if (m.seen !== fr || b.dead) { explode(m); continue; }
        var r = Math.min(1, P.v0r + (1 - P.v0r) * Math.min(1, m.t / P.accT) * Math.min(1, m.t / P.accT)); thrust = r;
        var sp = Math.hypot(b.vx, b.vy) || 1, want = m.v0 * r; b.vx *= want / sp; b.vy *= want / sp; b.life += dt * (1 - r);
        m.trav += Math.hypot(b.x - m.lx, b.y - m.ly); m.lx = b.x; m.ly = b.y;
        var nh = m.h0; if (m.prof === 'bomb') { var th = m.tg && !m.tg.dead ? aimH(m.tg) * .5 : 6; nh = m.h0 + (th - m.h0) * Math.min(1, m.trav / Math.max(60, m.dist)); }
        var dhh = nh - m.h; m.x = b.x; m.y = b.y; m.h = nh;
        var L0 = Math.hypot(b.vx, b.vy, dhh / Math.max(dt, 1e-3)) || 1; m.dx = b.vx / L0; m.dy = b.vy / L0; m.dh = (dhh / Math.max(dt, 1e-3)) / L0;
        if (P.rings && r > .72) { m.ringA += want * dt; var gap = K.len * 2.6; if (m.ringA > gap) { m.ringA -= gap; pressureRing(m, K); } }
      } else if (m.prof === 'vertical') {
        // ---- robot missiles: slow vertical boost, pitch over, free-curve chase, fastest at the end
        if (m.tg) { if (lost(m.tg)) { var nt = m.tg.dead ? foeNear(m.team, m.tx, m.ty, 420) : null; m.tg = nt; } if (m.tg) { m.tx = m.tg.x; m.ty = m.tg.y; m.th = aimH(m.tg); } }
        var ddx = m.tx - m.x, ddh = m.th - m.h, ddy = m.ty - m.y, dist = Math.hypot(ddx, ddh, ddy);
        if (m.t < P.climb) { var kc = m.t / P.climb; m.spd = P.v0 + (P.vClimb - P.v0) * kc * kc; thrust = .45 + .55 * kc; steer(m, m.dx * .3, 1, m.dy * .3, 1.2, dt); }
        else {
          var fade = Math.max(0, Math.min(1, (dist - 160) / 520)), w = P.wob * fade, ws = Math.sin(m.t * P.wf + m.seed), wc = Math.cos(m.t * P.wf * .7 + m.seed);
          var lx = -ddy, ly = ddx, ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
          var nx = ddx / dist + lx * w * ws, nh2 = ddh / dist + w * .45 * wc, ny = ddy / dist + ly * w * ws;
          steer(m, nx, nh2, ny, P.turn + (m.t - P.climb) * P.turnUp, dt);
          var top = dist < P.endR ? P.vEnd : P.vmax; m.spd = Math.min(top, m.spd + P.acc * dt); thrust = dist < P.endR ? 1.35 : 1;
        }
        m.x += m.dx * m.spd * dt; m.h += m.dh * m.spd * dt; m.y += m.dy * m.spd * dt;
        if (m.tg && m.t > P.climb && dist < 620) { var DS = defend(m.tg, m); if (DS && DS.used < DS.cap) {
            if (DS.type === 'shield' && dist < (m.tg.r || 20) + 70) { DS.used++; m.dead = 1; boom(m.x, m.h, m.y, m.K, .7); try { hurt(m.tg, m.dmg * .1, m.src, 0, m.dt); } catch (e) {} DS.hit = G.t; continue; }
            if (DS.type === 'slash' && dist < (m.tg.r || 20) + 110) { DS.used++; if (!m.wh.cut) { var tgS = m.tg; cutMissile(m, tgS); m.dead = 0; explode(m, tgS); continue; } cutMissile(m, m.tg); continue; }
            if (DS.type === 'intercept' && !m._icp && DS.used < DS.cap) { DS.used++; m._icp = 1; var su = m.tg, sh0 = shoulders(su);
              spawn({ profile: 'intercept', kind: 'micro', x: sh0[DS.used % 2][0], h: sh0[DS.used % 2][1], y: sh0[DS.used % 2][2], dir: [m.x - su.x, 300, m.y - su.y], tm: m, team: su.team, src: su.slot, dmg: 0 }); } } }
        var hr = 14 + (m.tg ? (m.tg.r || 20) : 0);
        if (dist < hr + m.spd * dt || (m.t > P.climb && m.h < 3) || m.t > P.life) { explode(m, dist < hr + 40 + m.spd * dt ? m.tg : null); continue; }
      } else {
        // ---- direct: straight and level at the target point, building speed (big missiles / scripted use)
        if (m.tg && !lost(m.tg) && m.prof === 'aa') { m.tx = m.tg.x; m.ty = m.tg.y; m.th = aimH(m.tg); }
        if (m.tm) { if (m.tm.dead) { m.dead = 1; GLOW.add(m.x, m.h, m.y, 0, 0, 0, 8, 26, .12, 1, 1, 1, .8); continue; } m.tx = m.tm.x; m.ty = m.tm.y; m.th = m.tm.h;
          if (Math.hypot(m.tx - m.x, m.th - m.h, m.ty - m.y) < 26 + (m.spd + 1300) * dt) { m.dead = 1; GLOW.add(m.x, m.h, m.y, 0, 0, 0, 10, 40, .14, 1, 1, 1, 1); airBurst(m.tm); continue; } }
        var ex = m.tx - m.x, eh = m.th - m.h, ey = m.ty - m.y, dd = Math.hypot(ex, eh, ey);
        steer(m, ex, eh, ey, m.tm ? 14 : m.prof === 'aa' ? 5 : 30, dt);
        var rr = Math.min(1, P.v0r + (1 - P.v0r) * Math.min(1, m.t / P.accT)); thrust = rr; m.spd = (m.tm ? 1250 : PROF.direct.vmax) * rr;
        m.x += m.dx * m.spd * dt; m.h += m.dh * m.spd * dt; m.y += m.dy * m.spd * dt;
        if (rr > .72) { m.ringA += m.spd * dt; if (m.ringA > K.len * 2.6) { m.ringA = 0; pressureRing(m, K); } }
        if (dd < 20 + m.spd * dt || m.t > PROF.direct.life) { explode(m, m.tg && dd < 80 ? m.tg : null); continue; }
      }
      m.local = m.src && G.local && m.src === G.local;
      // ---- draw: body, motor flame, glow, smoke
      if (nb < MAXM) {
        V.set(m.dx, m.dh, m.dy); Q.setFromUnitVectors(ZA, V); m.roll += dt * 9;
        SC.setScalar(K.len); V.set(m.x, m.h, m.y); M4.compose(V, Q, SC); BODY.setMatrixAt(nb++, M4);
        var fl = (.8 + Math.random() * .4) * thrust; V.set(m.x - m.dx * K.len * .45, m.h - m.dh * K.len * .45, m.y - m.dy * K.len * .45);
        SC.set(K.fw * (1 + .35 * thrust), K.fw * (1 + .35 * thrust), K.flame * fl * (.55 + .3 * thrust)); M4.compose(V, Q, SC); FLAME.setMatrixAt(nf, M4);
        var wf = m.wh.fl; FLAME.instanceColor.setXYZ(nf, wf[0] * (.6 + .4 * thrust), wf[1] * (.75 + .25 * thrust), wf[2]); nf++;
        if (m.wh !== WH.he) { var wc = m.wh.col; GLOW.now(m.x + m.dx * K.len * .5, m.h + m.dh * K.len * .5, m.y + m.dy * K.len * .5, K.fw * 1.7, wc[0], wc[1], wc[2], .9); }
        GLOW.now(V.x, V.y, V.z, K.fw * (2.2 + thrust * 1.2), .55, .8, 1, .85); GLOW.now(V.x - m.dx * K.flame * .35, V.y - m.dh * K.flame * .35, V.z - m.dy * K.flame * .35, K.fw * (3.2 + thrust * 1.6), 1, .55, .25, .35); GLOW.now(V.x, V.y, V.z, K.fw * 1.1, 1, 1, 1, .95);
        trailPuff(m, K, LIVE.length);
      }
    }
    // acid burns and puddles
    var tn2 = G.t || 0;
    for (var di = DOT.length - 1; di >= 0; di--) { var D = DOT[di]; if (D.u.dead || tn2 > D.until) { DOT.splice(di, 1); continue; } D.acc += dt; if (D.acc >= .5) { D.acc -= .5; try { hurt(D.u, D.dps * .5, D.src, 0, 'x'); } catch (e) {} if (Math.random() < .6) GLOW.add(D.u.x, aimH(D.u) * .7, D.u.y, 0, 40, 0, 8, 16, .4, D.pz ? .62 : .55, D.pz ? .3 : 1, D.pz ? 1 : .2, .7); } }
    for (var pi = PUD.length - 1; pi >= 0; pi--) { var Pd = PUD[pi]; if (tn2 > Pd.until) { PUD.splice(pi, 1); continue; } GLOW.now(Pd.x, 3, Pd.y, Pd.r * 2, .3, .7, .1, .35 * Math.min(1, Pd.until - tn2)); Pd.acc += dt; if (Pd.acc >= .5) { Pd.acc -= .5; for (var ui = 0; ui < G.units.length; ui++) { var uu = G.units[ui]; if (uu.dead || uu.team === Pd.team || uu.team === 2 || uu.layer > 0) continue; if (Math.hypot(uu.x - Pd.x, uu.y - Pd.y) < Pd.r + (uu.r || 20)) { try { hurt(uu, Pd.dps * .5, Pd.src, 0, 'x'); } catch (e) {} uu.slow = Math.max(uu.slow || 0, .3); } } } }
    // pressure rings
    var RL = RING.userData.list, nr = 0;
    for (var j = RL.length - 1; j >= 0; j--) { var g = RL[j]; g.l -= dt; if (g.l <= 0) { RL.splice(j, 1); continue; } var kk = 1 - g.l / g.ml;
      V.set(g.dx, g.dh, g.dy); Q.setFromUnitVectors(ZA, V); SC.setScalar(g.s * (1 + kk * 2.4)); V.set(g.x, g.h, g.y); M4.compose(V, Q, SC); RING.setMatrixAt(nr, M4);
      var cc = (1 - kk) * .9; RING.instanceColor.setXYZ(nr, cc * .8, cc * .9, cc); nr++; }
    // cut halves tumbling down
    for (var d2 = DEB.length - 1; d2 >= 0; d2--) { var p = DEB[d2]; p.l -= dt; if (p.l <= 0 || nb >= MAXM) { DEB.splice(d2, 1); continue; } p.vh -= 900 * dt; p.x += p.vx * dt; p.h = Math.max(2, p.h + p.vh * dt); p.y += p.vy * dt; p.ax += dt * 14; p.ay += dt * 9;
      V.set(Math.sin(p.ax), Math.cos(p.ay), Math.cos(p.ax)).normalize(); Q.setFromUnitVectors(ZA, V); SC.set(p.K.len, p.K.len, p.K.len * .5); V.set(p.x, p.h, p.y); M4.compose(V, Q, SC); BODY.setMatrixAt(nb++, M4); }
    // shield bubbles
    var ns = 0; if (SHL.length) { if (!SHM) mkShield(); if (SHM.parent !== R.scene) R.scene.add(SHM);
      for (var si = SHL.length - 1; si >= 0; si--) { var S = SHL[si], u2 = S.u, tn = G.t || 0; if (!u2 || u2.dead || tn > S.until || ns >= 16) { SHL.splice(si, 1); continue; }
        var rr2 = (u2.r || 20) * 1.15 + 14, /* v3.92: smaller, fainter - from above it read as a big white circle */ k0 = Math.min(1, (tn - S.t0) / .12), k1 = Math.min(1, (S.until - tn) / .2), fl2 = S.hit && tn - S.hit < .12 ? 1.6 : 1;
        V.set(u2.x, aimH(u2) * .55, u2.y); Q.identity(); SC.setScalar(rr2 * (.6 + .4 * k0)); M4.compose(V, Q, SC); SHM.setMatrixAt(ns, M4); var cc2 = .16 * Math.min(k0, k1) * fl2; SHM.instanceColor.setXYZ(ns, cc2 * .45, cc2 * .8, cc2); ns++; } }
    if (SHM) { SHM.count = ns; SHM.instanceMatrix.needsUpdate = true; SHM.instanceColor.needsUpdate = true; SHM.visible = ns > 0; }
    BODY.count = nb; FLAME.count = nf; RING.count = nr;
    BODY.instanceMatrix.needsUpdate = true; FLAME.instanceMatrix.needsUpdate = true; FLAME.instanceColor.needsUpdate = true; RING.instanceMatrix.needsUpdate = true; RING.instanceColor.needsUpdate = true;
    GLOW.end(); SMOKE.end();
    if (LIVE.length > 0 && fr % 30 === 0) LIVE = LIVE.filter(function (m) { return !m.dead; });
    else if (LIVE.length && LIVE.every(function (m) { return m.dead; })) LIVE = [];
  };
  // ------------------------------------------------------------------ hooking into the game
  var MISK = { 6: 1, 8: 1, 13: 1 };
  var followCap = function () { return phone() ? 20 : 56; };
  var hookShoot = function () {
    if (typeof shoot !== 'function' || window.__msleShoot) return; window.__msleShoot = 1; var _s = shoot;   // once only: later wrappers keep calling this one
    var w = function (u, a, o) {
      try {
        if (o && MISK[o.kind] && u && attach() && !(typeof MAP !== 'undefined' && MAP.space)) {
          // robot frame missiles: vertical launch from the shoulder pods (a 16-shot ultimate becomes 20, 10 per pod)
          if (u.cls === 'arkframe' && o.kind === 6 && !u._tfFly) {
            var t = G.t || 0; if (u._swT !== t) { u._swT = t; u._swN = 0; }
            var idx = u._swN++, extra = (idx % 4 === 3) ? 1 : 0, per = (o.dmg || 0) * (idx < 16 ? .8 : 1);
            for (var e = 0; e <= extra; e++) { var k = idx + Math.floor(idx / 4) + e, sh = shoulders(u)[k % 2], f = u.aa != null ? u.aa : u.a, side = k % 2 ? -1 : 1;
              if (idx === 0) u._swWH = u.mslWH || (window.__mslPick ? window.__mslPick(u) : null) || (G.local && u === G.local.unit ? 'he' : ['he', 'he', 'he', 'emp', 'acid', 'poison', 'flash'][Math.floor(Math.random() * 7)]);
              spawn({ wh: u._swWH, profile: 'vertical', kind: 'micro', x: sh[0], h: sh[1], y: sh[2], dir: [-Math.sin(f) * side * .38 - Math.cos(f) * .14 + (Math.random() - .5) * .12, 1, Math.cos(f) * side * .38 - Math.sin(f) * .14 + (Math.random() - .5) * .12],
                target: o.home || null, tx: o.home ? null : u.x + Math.cos(a) * Math.min(900, o.range || 900), ty: o.home ? null : u.y + Math.sin(a) * Math.min(900, o.range || 900), th: o.home ? null : 8,
                dmg: per, src: u.slot, dt: o.dt || 'at', splash: o.splash || 0, team: u.team, delay: (k >> 1) * .055 + Math.random() * .02 }); }
            try { var s2 = shoulders(u), q2 = idx % 2; GLOW.add(s2[q2][0], s2[q2][1], s2[q2][2], 0, 30, 0, 10, 34, .12, 1, .85, .6, .9); SMOKE.add(s2[q2][0], s2[q2][1], s2[q2][2], (Math.random() - .5) * 40, 50, (Math.random() - .5) * 40, 10, 34, .45, .72, .74, .78, .45, 1); if (idx === 0) SFX.noise(.5, .22, 2400); } catch (er) {}
            return;
          }
        }
      } catch (er) { window.MSLE.err = 'shoot ' + er; }
      var n0 = G.bullets.length; var res = _s(u, a, o);
      try {
        if (o && MISK[o.kind] && u && G.bullets.length > n0 && ok && !(typeof MAP !== 'undefined' && MAP.space)) {
          var nFol = 0; for (var i = 0; i < LIVE.length; i++) if (LIVE[i].b && !LIVE[i].dead) nFol++;
          if (nFol < followCap()) {
            var b = G.bullets[G.bullets.length - 1], air = u.layer > 0 || u._tfFly, tg = o.home || null;
            var prof = air ? ((tg ? tg.layer > 0 : !!o.air) ? 'aa' : 'bomb') : 'rocket';
            var kind = (u.arm === 'heavy' || u.cls === 'arkframe' || (o.dmg || 0) > 120) ? 'rocket' : 'micro';
            spawn({ profile: prof, kind: kind, x: b.x, h: b.h != null ? b.h : 14, y: b.y, dir: [b.vx, 0, b.vy], bullet: b, target: tg, team: u.team, src: u.slot });
            if (prof === 'rocket') {
              // recoil: the launcher is pushed back, backblast smoke behind it, a flash at the tube
              var ca = Math.cos(a), sa = Math.sin(a), kick = kind === 'rocket' ? 9 : 4, hh = b.h != null ? b.h : 14;
              if (!u.fixed && u.cls !== 'sentry' && u.cls !== 'turret') { u.x -= ca * kick; u.y -= sa * kick; }
              GLOW.add(b.x, hh, b.y, 0, 0, 0, 18, 46, .1, 1, .85, .6, 1);
              for (var p2 = 0; p2 < (phone() ? 2 : 4); p2++) SMOKE.add(b.x - ca * (30 + p2 * 10), hh, b.y - sa * (30 + p2 * 10), -ca * (90 + Math.random() * 80) + (Math.random() - .5) * 40, 10, -sa * (90 + Math.random() * 80) + (Math.random() - .5) * 40, 10, 34, .55, .68, .7, .74, .5, 2.5);
              if (G.local && u === G.local.unit) { try { cam.shake = Math.min(8, (cam.shake || 0) + 2.2); } catch (er) {} }
            }
          }
        }
      } catch (er) { window.MSLE.err = 'follow ' + er; }
      return res;
    };
    w.__msle = 1; shoot = w;
  };
  // the lock-on salvo (C) and other scripted swarms still push to G.hm — take them over
  var drainHM = function () {
    if (!G || !G.hm || !G.hm.length || !attach()) return; var u = G.local && G.local.unit; if (!u || u.dead) { G.hm.length = 0; return; }
    var list = G.hm.splice(0, G.hm.length), sh = shoulders(u), f = u.aa != null ? u.aa : (u.a || 0), fx = Math.cos(f), fy = Math.sin(f);
    for (var i = 0; i < list.length; i++) { var h = list[i], s = sh[i % 2], side = i % 2 ? -1 : 1;
      spawn({ wh: u.mslWH || (window.__mslPick ? window.__mslPick(u) : null) || 'he', profile: 'vertical', kind: 'micro', x: s[0], h: s[1], y: s[2], dir: [-fy * side * .22 - fx * .12 + (Math.random() - .5) * .1, 1, fx * side * .22 - fy * .12 + (Math.random() - .5) * .1],
        target: h.tg || null, dmg: h.dmg, src: G.local, dt: 'x', sw: 1, team: u.team, delay: (h.delay || 0) + (i >> 1) * .01 }); }
    try { for (var q = 0; q < 2; q++) SMOKE.add(sh[q][0], sh[q][1], sh[q][2], 0, 40, 0, 14, 40, .5, .7, .72, .76, .45, 1); } catch (e) {}
  };
  var hookStep = function () {
    if (typeof step !== 'function' || window.__msleStep) return; window.__msleStep = 1; var _st = step;
    var w = function (dt) { try { drainHM(); } catch (e) {} _st(dt); try { if (G && !G.over) tick(dt); else if (ok && G && G.over) { LIVE = []; tick(0); } } catch (e) { window.MSLE.err = 'tick ' + e; } };
    w.__msle = 1; step = w;
  };
  // hide the old round "orb" for bullets the engine draws
  var hookDraw = function () {
    var R3x = window.R3; if (!R3x || typeof R3x.syncBullets !== 'function' || R3x.syncBullets.__msle || window.__msleDraw) return; window.__msleDraw = 1; var _sb = R3x.syncBullets;
    R3x.syncBullets = function () { var all = G.bullets, has = false; for (var i = 0; i < all.length; i++) if (all[i]._eng) { has = true; break; }
      if (!has) return _sb.apply(this, arguments); G.bullets = all.filter(function (b) { return !b._eng; }); try { return _sb.apply(this, arguments); } finally { G.bullets = all; } };
    R3x.syncBullets.__msle = 1;
  };
  window.MSLE = {
    fire: function (o) { return spawn(o); }, salvo: salvo, warheads: WH, setWarhead: function (k) { var u = G.local && G.local.unit; if (u && WH[k]) u.mslWH = k; return u && u.mslWH; }, kinds: KIND, profiles: PROF, model: 'builtin',
    stat: function () { return { live: LIVE.filter(function (m) { return !m.dead; }).length, glow: ok ? GLOW.count() : 0, smoke: ok ? SMOKE.count() : 0, rings: ok ? RING.userData.list.length : 0, model: window.MSLE.model }; }
  };
  setInterval(function () { try { hookShoot(); hookStep(); hookDraw(); } catch (e) {} }, 500);
})();
