/* ASCEND v3.65 — combat pass 2 (all lag-aware: pools / instancing, nothing allocated per frame)
   (1) shoulder-missile warheads per frame (EMP / acid / poison / high-explosive / flash), changeable in Settings
   (2) phone: separate FLY and TRANSFORM buttons (transform no longer turns into flight)
   (3) plasma / energy bolts: white-hot core, coloured halo and a short fading comet tail instead of a long cone;
       the beam / plasma rifles fire at a measured pace (heavier shots, same damage per second)
   (4) dash by grade: higher-grade frames dash further; hero (r3) and up punch pressure rings through the air ("pang-pang-pang")
   (5) hit reactions: survivors are knocked back; heavy hits knock infantry down (fall, lie, get up), stagger frames,
       and melee finishers / EMP can stun (orbiting stars over the head)
   (6) R (ultimate) and T (absolute tech) work as ultimates: 20 s and 30 s cooldowns, shown on the bar
   (7) phone menus answer at once (no double-tap delay; pressed buttons light up immediately) */
(function () {
  'use strict';
  var T = null;
  var L2 = function (ko, en) { try { return (typeof LANG !== 'undefined' && LANG === 'en') ? en : ko; } catch (e) { return ko; } };
  var meU = function () { try { return G && G.local && G.local.unit; } catch (e) { return null; } };
  var mkey = function () { try { return window.__myMechKey ? window.__myMechKey() : 'mech3'; } catch (e) { return 'mech3'; } };
  var grade = function () { try { var m = MECHS[mkey()]; return m && m.r != null ? m.r : 0; } catch (e) { return 0; } };
  var hsh = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // ---------------------------------------------------------------- (1) warheads
  var WHF = { mech3: 'he', saber0: 'he', mech4: 'he', m_ranger: 'flash', m_artillery: 'he', m_guardian: 'emp', m_titan: 'he', m_sky: 'emp', m_striker: 'acid', m_wizard: 'emp', m_phantom: 'poison', m_origin: 'emp', m_samurai: 'flash', mech_leg: 'emp' };
  var FAC = { fed: ['he', 'flash', 'he'], emp: ['emp', 'he', 'emp'], alp: ['emp', 'flash', 'emp'], omg: ['poison', 'acid', 'poison'] };
  var frameWH = function (k) { if (WHF[k]) return WHF[k]; var f = (k.split('_')[0]) || 'fed', arr = FAC[f] || ['he', 'emp', 'acid', 'poison']; return arr[hsh(k) % arr.length]; };
  window.__mslPick = function (u) { var me = meU(); if (!me || u !== me) return null; var s = (typeof P !== 'undefined' && P.mslWH) || 'auto'; return s === 'auto' ? frameWH(mkey()) : s; };
  var WHN = { auto: ['기체 기본', 'Frame default'], he: ['일반 고폭탄', 'High explosive'], emp: ['EMP탄 (기계 정지)', 'EMP (stops machines)'], acid: ['산성탄 (생명체 지속 피해·감속)', 'Acid (burn + slow)'], poison: ['독탄 (긴 지속 피해·회복 차단)', 'Poison (long burn, no healing)'], flash: ['섬광탄 (조준 상실)', 'Flash (blinds)'] };
  var settingsRow = function () {
    if (document.getElementById('mMslWH')) return; var sfx = document.getElementById('mSfx'); if (!sfx) return; var row = sfx.closest('.setrow'); if (!row) return;
    var r = document.createElement('div'); r.className = 'setrow'; var sel = document.createElement('select'); sel.id = 'mMslWH';
    r.innerHTML = '<span>' + L2('어깨 미사일 탄두', 'Shoulder missile warhead') + '</span>'; Object.keys(WHN).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = L2(WHN[k][0], WHN[k][1]); sel.appendChild(o); });
    sel.value = (typeof P !== 'undefined' && P.mslWH) || 'auto'; sel.onchange = function () { try { P.mslWH = sel.value; saveP(); } catch (e) {} }; r.appendChild(sel); row.parentNode.insertBefore(r, row);
  };
  // ---------------------------------------------------------------- (2) phone transform button
  var phoneTF = function () {
    var fly = document.getElementById('tFly'), host = document.getElementById('touchUI'); if (!fly || !host) return;
    var b = document.getElementById('tTF2');
    if (!b) { b = document.createElement('div'); b.className = 'tb'; b.id = 'tTF2'; b.textContent = L2('변신', 'MORPH');
      var go = function (e) { e.preventDefault(); e.stopPropagation(); try { var u = meU(); if (window.__TF && u) window.__TF.toggle ? window.__TF.toggle(u) : null; } catch (er) {} };
      b.addEventListener('touchstart', go, { passive: false }); b.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') go(e); }); host.appendChild(b); }
    var cs = getComputedStyle(fly), r = fly.getBoundingClientRect(); b.style.display = cs.display === 'none' ? 'none' : '';
    if (r.width && !b._placed) {
      // find a free spot next to FLY: above, left, below, right — whichever does not touch another visible button
      var others = [].slice.call(document.querySelectorAll('#touchUI .tb, #touchUI button, #wrSk .b')).filter(function (x) { return x !== b && x.offsetParent !== null; }).map(function (x) { return x.getBoundingClientRect(); });
      var w = r.width, h = r.height, gap = 10, cand = [[r.left, r.top - h - gap], [r.left - w - gap, r.top], [r.left, r.bottom + gap], [r.right + gap, r.top], [r.left - w - gap, r.top - h - gap]];
      var hit = function (x, y) { if (x < 4 || y < 4 || x + w > innerWidth - 4 || y + h > innerHeight - 4) return true; for (var i = 0; i < others.length; i++) { var o = others[i]; if (!(x + w + 4 < o.left || x > o.right + 4 || y + h + 4 < o.top || y > o.bottom + 4)) return true; } return false; };
      var pos = cand.filter(function (c) { return !hit(c[0], c[1]); })[0] || cand[0];
      b.style.position = 'fixed'; b.style.left = pos[0] + 'px'; b.style.top = pos[1] + 'px'; b.style.right = 'auto'; b.style.bottom = 'auto'; b.style.width = w + 'px'; b.style.height = h + 'px'; b.style.borderColor = '#ff8a70'; b.style.color = '#ffd2c8'; b.style.fontSize = '11px'; b._placed = 1;
      addEventListener('resize', function () { b._placed = 0; }, { once: true }); }
    try { var u = meU(), j = u && u.tf && u.tf.mode === 'jet'; var want = j ? L2('로봇', 'ROBOT') : L2('변신', 'MORPH'); if (b.textContent !== want) b.textContent = want; } catch (e) {}
    if (!fly.dataset.o2) { fly.dataset.o2 = 1; } try { var u2 = meU(); if (u2 && !u2.fly && fly.textContent !== L2('날기', 'FLY') && !/로봇|ROBOT/.test(fly.textContent)) fly.textContent = L2('날기', 'FLY'); } catch (e) {}
  };
  // ---------------------------------------------------------------- shared billboards (plasma, rings, stars) — 2 draw calls
  var VS = 'attribute vec4 aP;attribute vec4 aC;varying vec2 vUv;varying vec4 vC;void main(){vUv=uv;vC=aC;vec4 mv=modelViewMatrix*vec4(aP.xyz,1.0);mv.xy+=position.xy*aP.w;gl_Position=projectionMatrix*mv;}';
  var FS = 'uniform sampler2D map;varying vec2 vUv;varying vec4 vC;void main(){float a=texture2D(map,vUv).a*vC.a;if(a<.004)discard;gl_FragColor=vec4(vC.rgb*a,a);}';
  var BBN = 1600, bb = null, bbA, bbC, bbW = 0;
  var radTex = function () { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.75)'); gr.addColorStop(.6, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); var t = new T.CanvasTexture(c); t.userData = { keep: 1 }; return t; };
  var bbInit = function () {
    if (bb) return true; T = window.THREE; if (!T || !window.R3 || !R3.scene) return false;
    var pg = new T.PlaneGeometry(1, 1), g = new T.InstancedBufferGeometry(); g.index = pg.index; g.setAttribute('position', pg.attributes.position); g.setAttribute('uv', pg.attributes.uv);
    bbA = new T.InstancedBufferAttribute(new Float32Array(BBN * 4), 4); bbC = new T.InstancedBufferAttribute(new Float32Array(BBN * 4), 4); bbA.setUsage(T.DynamicDrawUsage); bbC.setUsage(T.DynamicDrawUsage); g.setAttribute('aP', bbA); g.setAttribute('aC', bbC); g.instanceCount = 0;
    bb = new T.Mesh(g, new T.ShaderMaterial({ uniforms: { map: { value: radTex() } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneFactor }));
    bb.frustumCulled = false; bb.renderOrder = 8; bb.userData.keep = 1; return true;
  };
  var put = function (x, y, z, s, r, g, b, a) { if (bbW >= BBN) return; var o = bbW * 4, A = bbA.array, C = bbC.array; A[o] = x; A[o + 1] = y; A[o + 2] = z; A[o + 3] = s; C[o] = r; C[o + 1] = g; C[o + 2] = b; C[o + 3] = a; bbW++; };
  // ---------------------------------------------------------------- (3) plasma bolts
  var EN = { 3: 1, 11: 1, 14: 1, 15: 1 };
  var col3 = function (hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  var C_ME = col3('#7fe7ff'), C_AL = col3('#5cf2b0'), C_EN = col3('#ff5a3c'), C_PL = col3('#d48cff');
  var drawBolts = function () {
    var lt = G.local && G.local.team, me = G.local;
    for (var i = 0; i < G.bullets.length; i++) { var b = G.bullets[i]; if (!EN[b.kind] || b._eng) continue; var h = b.h != null ? b.h : 14, sp = Math.hypot(b.vx, b.vy) || 1, nx = b.vx / sp, ny = b.vy / sp;
      var c = b.kind === 15 ? C_PL : b.owner === me ? C_ME : b.team === lt ? C_AL : C_EN, s = b.kind === 15 ? 30 : b.kind === 14 ? 20 : 14;
      put(b.x, h, b.y, s * 2.4, c[0], c[1], c[2], .55);                                    // halo
      put(b.x, h, b.y, s * .9, 1, 1, 1, 1);                                                 // white-hot core
      for (var k = 1; k <= 3; k++) put(b.x - nx * s * .75 * k, h, b.y - ny * s * .75 * k, s * (1.5 - k * .3), c[0], c[1], c[2], .5 - k * .13);   // comet tail
    }
  };
  var hookBolts = function () {
    var R = window.R3; if (!R || typeof R.syncBullets !== 'function' || window.__c2Draw) return; window.__c2Draw = 1; var sb = R.syncBullets;
    R.syncBullets = function () { var all = G.bullets, has = false; for (var i = 0; i < all.length; i++) if (EN[all[i].kind]) { has = true; break; }
      if (!has) return sb.apply(this, arguments); G.bullets = all.filter(function (b) { return !EN[b.kind] || b._eng; }); try { return sb.apply(this, arguments); } finally { G.bullets = all; } };
    try { if (W.beamrifle && W.beamrifle.rate < .42) { var k = .42 / W.beamrifle.rate; W.beamrifle.dmg = Math.round(W.beamrifle.dmg * k); W.beamrifle.rate = .42; } if (W.pulse && W.pulse.rate < .3) { var k2 = .3 / W.pulse.rate; W.pulse.dmg = Math.round(W.pulse.dmg * k2); W.pulse.rate = .3; } } catch (e) {}
  };
  // ---------------------------------------------------------------- (4) dash by grade + pressure rings
  var RINGS = null, RL = [], V, Q, M4, SC, ZA;
  var ringInit = function () { if (RINGS) return; RINGS = new T.InstancedMesh(new T.RingGeometry(.8, 1, 32), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }), 48);
    RINGS.instanceColor = new T.InstancedBufferAttribute(new Float32Array(48 * 3), 3); RINGS.count = 0; RINGS.frustumCulled = false; RINGS.userData.keep = 1; V = new T.Vector3(); Q = new T.Quaternion(); M4 = new T.Matrix4(); SC = new T.Vector3(); ZA = new T.Vector3(0, 0, 1); };
  var dashSt = { was: 0, acc: 0, lx: 0, ly: 0 };
  var dashTick = function (dt) {
    var u = meU(); if (!u || u.dead) return; var g = grade();
    if (u.dashT > 0 && !dashSt.was) { dashSt.was = 1; u.dashT *= [.85, .95, 1.05, 1.25, 1.45, 1.65][Math.min(5, g)]; dashSt.lx = u.x; dashSt.ly = u.y; dashSt.acc = 0; if (g >= 3) try { cam.shake = Math.max(cam.shake || 0, 3 + g); } catch (e) {} }
    if (!(u.dashT > 0)) { dashSt.was = 0; return; }
    if (g < 3) return; var d = Math.hypot(u.x - dashSt.lx, u.y - dashSt.ly); dashSt.acc += d; dashSt.lx = u.x; dashSt.ly = u.y;
    var gap = g >= 5 ? 55 : g >= 4 ? 65 : 80; while (dashSt.acc >= gap) { dashSt.acc -= gap; var a = u.dashA != null ? u.dashA : u.aa; var hh = (function () { try { return unitH(u); } catch (e) { return 0; } })() + 60;
      if (RL.length >= 46) RL.shift(); RL.push({ x: u.x + Math.cos(a) * 40, h: hh, y: u.y + Math.sin(a) * 40, dx: Math.cos(a), dy: Math.sin(a), s: 26 + g * 4, l: .26, ml: .26 });
      try { if (Math.random() < .5) SFX.noise(.05, .06, 1900); } catch (e) {} }
  };
  var ringsDraw = function (dt) {
    if (!RINGS) return; if (RINGS.parent !== R3.scene) R3.scene.add(RINGS); var n = 0;
    for (var i = RL.length - 1; i >= 0; i--) { var r = RL[i]; r.l -= dt; if (r.l <= 0) { RL.splice(i, 1); continue; } var k = 1 - r.l / r.ml; V.set(r.dx, 0, r.dy); Q.setFromUnitVectors(ZA, V); SC.setScalar(r.s * (1 + k * 2.2)); V.set(r.x, r.h, r.y); M4.compose(V, Q, SC); RINGS.setMatrixAt(n, M4); var c = (1 - k) * .85; RINGS.instanceColor.setXYZ(n, c * .85, c * .93, c); n++;
      if (k < .25) put(r.x, r.h, r.y, r.s * 1.2, .9, .95, 1, .5 * (1 - k * 4)); }
    RINGS.count = n; RINGS.instanceMatrix.needsUpdate = true; RINGS.instanceColor.needsUpdate = true;
  };
  // ---------------------------------------------------------------- (5) hit reactions
  var REACT = [];
  var react = function (u, a, amt, dt) {
    if (!u || u.dead || u.boss || u.fbs || u.cls === 'sentry' || u.layer > 0) return; var mhp = u.mhp || 100, frac = amt / mhp, fin = a && a.melSw && a.melSw.fin, mech = u.cls === 'arkframe' || u.arm === 'heavy';
    var ang = a ? Math.atan2(u.y - a.y, u.x - a.x) : Math.random() * 6.28, heavy = frac >= .12 || fin || (dt === 'x' && frac >= .08);
    if (!heavy && frac < .04) return;
    var kb = (mech ? 6 : 14) * (heavy ? 2.2 : 1); u._kbv = { vx: Math.cos(ang) * kb / .14, vy: Math.sin(ang) * kb / .14, t: .14 }; if (REACT.indexOf(u) < 0) REACT.push(u);
    if (window.__autoSoftCC && window.__autoSoftCC(a)) return;
    if (heavy && !mech && u.arm !== 'heavy') { if (!(u._kd > 0)) { u._kd = 1.05; u._kdA = ang; u.stun = Math.max(u.stun || 0, .95); } }
    else if (heavy && mech) { u._stg = .38; u._kdA = ang; u.stun = Math.max(u.stun || 0, .18); }
    if (fin && Math.random() < .25) { u.stun = Math.max(u.stun || 0, 1.1); u._stars = 1.1; }
  };
  var reactTick = function (dt) {
    for (var i = REACT.length - 1; i >= 0; i--) { var u = REACT[i]; if (u.dead) { REACT.splice(i, 1); continue; }
      if (u._kbv && u._kbv.t > 0) { var k = Math.min(dt, u._kbv.t); u.x += u._kbv.vx * k; u.y += u._kbv.vy * k; u._kbv.t -= k; try { collideGround(u); } catch (e) {} }
      if (u._kd > 0) u._kd -= dt; if (u._stg > 0) u._stg -= dt; if (u._stars > 0) u._stars -= dt;
      if (!(u._kd > 0) && !(u._stg > 0) && !(u._stars > 0) && !(u._kbv && u._kbv.t > 0)) REACT.splice(i, 1); }
    // knock-back for everyone hit (not only those in the list)
  };
  var TQ = null, TE = null, TA = null, BQ = null;
  var pose = function (e, u) {
    if (!(u._kd > 0) && !(u._stg > 0) && !e._tilted) return; if (!TQ) { TQ = new T.Quaternion(); TE = new T.Euler(); TA = new T.Vector3(); BQ = new T.Quaternion(); }
    var ang = 0; if (u._kd > 0) { var p = 1.05 - u._kd; ang = p < .22 ? (p / .22) * 1.35 : p < .62 ? 1.35 : Math.max(0, 1.35 * (1 - (p - .62) / .43)); } else if (u._stg > 0) { var q = .38 - u._stg; ang = Math.sin(Math.min(1, q / .38) * Math.PI) * .28; }
    TE.set(0, e.root.rotation.y, 0); BQ.setFromEuler(TE);
    if (ang <= .001) { e.root.quaternion.copy(BQ); e._tilted = 0; return; }
    TA.set(Math.sin(u._kdA || 0), 0, -Math.cos(u._kdA || 0)).normalize(); TQ.setFromAxisAngle(TA, ang); e.root.quaternion.copy(BQ).premultiply(TQ); e._tilted = 1;
  };
  var starsDraw = function () {
    var t = performance.now() / 1000;
    for (var i = 0; i < REACT.length; i++) { var u = REACT[i]; if (!(u._stars > 0) && !(u._kd > .3)) continue; var hh = (function () { try { return unitH(u); } catch (e) { return 0; } })() + (u.r || 20) * 2.6 + 30;
      for (var s = 0; s < 3; s++) { var a = t * 5 + s * 2.094; put(u.x + Math.cos(a) * (u.r || 20) * .9, hh, u.y + Math.sin(a) * (u.r || 20) * .9, 12, 1, .9, .35, .95); } }
  };
  // ---------------------------------------------------------------- (6) R / T as ultimates
  var CDR = 20, CDT = 30, nxt = { r: 0, t: 0 };
  var gate = function (u, inp) {
    if (!inp || !G || !G.local || u !== G.local.unit) return inp; var t = G.t || 0;
    if (inp.ul) { if (t < nxt.r) inp.ul = false; else { var gauge = Math.max(G.local.ult || 0, (u.slot && u.slot.ult) || 0); if (gauge >= 100 || u.cls !== 'arkframe') nxt.r = t + CDR; } }
    if (inp.ab) { if (t < nxt.t) inp.ab = false; else nxt.t = t + CDT; }
    return inp;
  };
  var barCd = function () {
    var bar = document.getElementById('skb2'); if (!bar || !G || G.over) return; var t = G.t || 0;
    [['R', nxt.r, CDR], ['T', nxt.t, CDT]].forEach(function (a) { var d = bar.querySelector('.sk2[data-k="' + a[0] + '"]'); if (!d) return; var left = a[1] - t, ov = d.querySelector('.cdm'), tx = d.querySelector('.cdt');
      if (left > 0) { if (ov) ov.style.setProperty('--p', Math.round(left / a[2] * 100) + '%'); if (tx) tx.textContent = Math.ceil(left); d._c2 = 1; } else if (d._c2) { d._c2 = 0; if (ov) ov.style.setProperty('--p', '0%'); if (tx) tx.textContent = ''; } });
  };
  // ---------------------------------------------------------------- hooks (each wraps exactly once)
  var lastG = null;
  var hook = function () {
    if (!window.__c2Hurt && typeof hurt === 'function') { window.__c2Hurt = 1; var hu = hurt;
      hurt = function (u, amt, src, ang, dt) { var hp0 = u && u.hp; var r = hu(u, amt, src, ang, dt); try { if (u && !u.dead && u.hp < hp0) react(u, src && src.unit, hp0 - u.hp, dt); } catch (e) {} return r; }; }
    if (!window.__c2Step && typeof step === 'function') { window.__c2Step = 1; var st = step;
      step = function (dt) { st(dt); try { if (!G || G.over) return; if (G !== lastG) { lastG = G; nxt.r = 0; nxt.t = 0; RL.length = 0; REACT.length = 0; } if (!bbInit()) return; ringInit(); dashTick(dt); reactTick(dt); } catch (e) { window.__c2Err = String(e).slice(0, 160); } }; }
    if (!window.__c2In && window.localInput) { window.__c2In = 1; var li = window.localInput; window.localInput = function (u) { return gate(u, li(u)); }; }
    if (!window.__c2Anim && window.R3 && typeof R3.animate === 'function') { window.__c2Anim = 1; var an = R3.animate; R3.animate = function (e, u, dt, now) { var r = an.call(this, e, u, dt, now); try { if (u && (u._kd > 0 || u._stg > 0 || e._tilted)) pose(e, u); } catch (er) {} return r; }; }
    if (!window.__c2Frame && window.R3 && typeof R3.syncParts === 'function') { window.__c2Frame = 1; var sp = R3.syncParts; R3.syncParts = function () { var r = sp.apply(this, arguments);
        try { if (bb && G && !G.over) { if (bb.parent !== R3.scene) R3.scene.add(bb); bbW = 0; drawBolts(); ringsDraw(1 / 60); starsDraw(); bb.geometry.instanceCount = bbW; bbA.needsUpdate = true; bbC.needsUpdate = true; bb.visible = bbW > 0; } else if (bb) bb.visible = false; } catch (e) { window.__c2Err = String(e).slice(0, 160); }
        return r; }; }
    hookBolts();
  };
  // ---------------------------------------------------------------- (7) phone menus answer at once
  var css = document.createElement('style'); css.textContent = 'html,body,button,select,.tb,.sk2,[onclick]{touch-action:manipulation}button:active,.tb:active{filter:brightness(1.35);transform:scale(.97)}#tTF2{display:flex;align-items:center;justify-content:center}'; document.head.appendChild(css);
  setInterval(function () { try { hook(); settingsRow(); if (window.__phone || (window.matchMedia && matchMedia('(pointer:coarse)').matches)) phoneTF(); barCd(); } catch (e) { window.__c2Err = String(e).slice(0, 160); } }, 250);
  window.__c2 = { nxt: nxt, frameWH: frameWH, cd: { r: CDR, t: CDT } };
})();
