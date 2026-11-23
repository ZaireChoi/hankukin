/* ASCEND v3.77: 난도(saber), 쌍인 난무(twin), 그림자 연격(dagger), 회전 분쇄(axe) also follow the three beats with the same damage totals
   ASCEND v3.69 — weapon arts redesigned for readable motion (first: 반월참 Half-moon Reap, 선풍 Cyclone Staff)
   Before: 14 quick twirls every 0.06 s with a damage circle each — it read as frantic flailing.
   Now every art follows the same three beats:
     1. wind-up (0.3 s): the frame sinks, the blade is drawn back, light gathers along it (sparks converge), a low hum
     2. the strike: ONE big swing — a crescent of blade light leaves the edge and sweeps outward, the hit lands with a short
        freeze and a camera jolt; targets inside the crescent take the blow and are thrown back
     3. the echo (0.22 s later): a fainter second crescent completes the full moon behind, then a quiet follow-through
   Total damage is the same as before (it is just delivered in two clear blows). Lag: two pooled crescent meshes, reused. */
(function () {
  'use strict';
  var T = null, CR = [], ci = 0;
  var K = function () { return window.__KX || {}; };
  var kLater = function (t, f) { return K().kLater(t, f); }, kHitUnits = function (a, b, c, d, e) { return K().kHitUnits(a, b, c, d, e); }, slashFx = function (a, b, c, d) { return K().slashFx(a, b, c, d); }, styleOf = function (u) { return K().styleOf(u); }, swArea = function (a, b, c, d, e) { return K().swArea(a, b, c, d, e); };
  var crescentInit = function () {
    if (CR.length) return true; T = window.THREE; if (!T || !window.R3 || !R3.scene) return false;
    var c = document.createElement('canvas'); c.width = 256; c.height = 8; var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.15, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(.85, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 8);
    var tex = new T.CanvasTexture(c); tex.userData = { keep: 1 };
    for (var i = 0; i < 3; i++) {
      var geo = new T.RingGeometry(.72, 1, 64, 1, -Math.PI * .55, Math.PI * 1.1); // a half-moon blade, thick in the middle
      var uv = geo.attributes.uv, pos = geo.attributes.position; for (var k = 0; k < uv.count; k++) { var x = pos.getX(k), y = pos.getY(k), a = Math.atan2(y, x); uv.setXY(k, (a + Math.PI * .55) / (Math.PI * 1.1), uv.getY(k)); }
      var m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, color: 0xff9be8, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
      m.rotation.order = 'YXZ'; m.visible = false; m.userData = { keep: 1, l: 0 }; CR.push(m);
    }
    return true;
  };
  var live = [];
  var crescent = function (x, h, y, ang, r0, r1, col, life, op) {
    if (!crescentInit()) return; var m = CR[ci++ % CR.length]; if (m.parent !== R3.scene) R3.scene.add(m);
    m.position.set(x, h, y); m.rotation.set(-Math.PI / 2, 0, 0); m.rotation.z = -ang; m.material.color.set(col); m.material.opacity = op; m.visible = true;
    m.userData.l = m.userData.ml = life; m.userData.r0 = r0; m.userData.r1 = r1; m.userData.op = op; m.scale.setScalar(r0); if (live.indexOf(m) < 0) live.push(m);
  };
  var tick = function (dt) { for (var i = live.length - 1; i >= 0; i--) { var m = live[i]; m.userData.l -= dt; var k = 1 - m.userData.l / m.userData.ml; if (m.userData.l <= 0) { m.visible = false; live.splice(i, 1); continue; } var e = 1 - Math.pow(1 - k, 3); m.scale.setScalar(m.userData.r0 + (m.userData.r1 - m.userData.r0) * e); m.material.opacity = m.userData.op * (1 - k * k); } };
  var uh = function (u) { try { return unitH(u); } catch (e) { return 0; } };
  var gather = function (u, col, n) { var h = uh(u) + 55; for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, d = 120 + Math.random() * 90; try { part(u.x + Math.cos(a) * d, u.y + Math.sin(a) * d, -Math.cos(a) * d * 3, -Math.sin(a) * d * 3, .3, i % 2 ? '#ffffff' : col, 3, h); } catch (e) {} } };
  var hitArc = function (u, R, arc, dmg, kb) { try { return kHitUnits(function (e) { var d = Math.hypot(e.x - u.x, e.y - u.y); return d < R + (e.r || 0) && (arc >= 3.1 || Math.abs(ANGD(u.aa, Math.atan2(e.y - u.y, e.x - u.x))) < arc); }, dmg, u.aa, kb); } catch (e) { return 0; } };
  // ---------------------------------------------------------------- the arts
  var ARTS = {

    saber: function (u, base) {    // 난도 (was 8 rapid cuts): draw back → two big crossing cuts → a finishing X-cut that leaves its mark
      var col = '#ff7ae0'; u.slashT = Math.max(u.slashT || 0, .3); gather(u, col, window.__phone ? 6 : 12); try { SFX2.charge(.25); } catch (e) {}
      [[.26, 2.6, -1], [.46, 2.6, 1], [.72, 5.7, 0]].forEach(function (s, i) { kLater(s[0], function () { if (u.dead) return; var fin = i === 2; u.melSw2 = { t: 0, T: fin ? .2 : .16, i: i, fin: fin, kind: 'slash', dir: s[2] || 1 };
        try { slashFx(u, styleOf(u), i % 2, fin); } catch (e) {}
        crescent(u.x, uh(u) + 50, u.y, (u.aa || 0) + s[2] * .5, 60, fin ? 260 : 190, fin ? '#ffffff' : col, fin ? .3 : .22, fin ? .4 : .3);
        var n = hitArc(u, fin ? 300 : 250, fin ? 1.4 : 1.1, base * s[1], fin ? 380 : 90);
        if (n) { G.hstop = Math.max(G.hstop || 0, fin ? .1 : .05); try { cam.shake = Math.max(cam.shake || 0, fin ? 9 : 4); } catch (e) {} }
        try { SFX2.swing(fin); } catch (e) {}
        if (fin) kLater(.08, function () { var a = u.aa || 0; for (var d = -1; d <= 1; d += 2) try { K().slashMark(u.x + Math.cos(a) * 120, u.y + Math.sin(a) * 120, 60, a + d * .8, 0xff5ad8); } catch (e) {} }); }); });
    },
    twin: function (u, base) {     // 쌍인 난무 (was 12 tiny cuts): cross the blades → three wide X-cuts, the last one twice as big
      var col = '#7fe8ff'; u.slashT = Math.max(u.slashT || 0, .3); gather(u, col, window.__phone ? 6 : 12); try { SFX2.charge(.22); } catch (e) {}
      for (var i = 0; i < 3; i++) (function (i) { kLater(.24 + i * .18, function () { if (u.dead) return; var fin = i === 2; u.melSw2 = { t: 0, T: .14, i: i, fin: fin, kind: 'cross', dir: 1 };
        try { slashFx(u, styleOf(u), i % 2, fin); } catch (e) {}
        crescent(u.x, uh(u) + 50, u.y, (u.aa || 0) + .45, 50, fin ? 230 : 170, col, .2, .3); crescent(u.x, uh(u) + 52, u.y, (u.aa || 0) - .45, 50, fin ? 230 : 170, '#ffffff', .2, .22);
        var n = hitArc(u, fin ? 260 : 220, 1.3, base * (fin ? 4.2 : 2.4), fin ? 300 : 60); if (n && fin) { G.hstop = Math.max(G.hstop || 0, .08); try { cam.shake = Math.max(cam.shake || 0, 7); } catch (e) {} }
        try { SFX2.swing(fin); } catch (e) {} }); })(i);
    },
    dagger: function (u, base) {   // 그림자 연격 (was 12 hits with 3 blinks): vanish → reappear behind two targets with one deep cut each → a final cut
      var col = '#c9a0ff'; u.slashT = Math.max(u.slashT || 0, .25); gather(u, col, window.__phone ? 5 : 10);
      var ts = []; try { ts = K().foesNear(u, 600, 3) || []; } catch (e) {}
      for (var i = 0; i < 3; i++) (function (i) { kLater(.2 + i * .24, function () { if (u.dead) return; var t = ts[i % Math.max(1, ts.length)], fin = i === 2;
        if (t && !t.dead && i < 2) { var a = Math.atan2(t.y - u.y, t.x - u.x); for (var q = 0; q < 6; q++) try { part(u.x, u.y, (Math.random() - .5) * 200, (Math.random() - .5) * 200, .3, col, 6, uh(u) + 40); } catch (e) {} u.x = t.x - Math.cos(a) * 70; u.y = t.y - Math.sin(a) * 70; u.aa = a; }
        u.melSw2 = { t: 0, T: .14, i: i, fin: fin, kind: 'cross', dir: 1 }; try { slashFx(u, styleOf(u), i % 2, fin); } catch (e) {}
        crescent(u.x, uh(u) + 50, u.y, u.aa || 0, 40, fin ? 220 : 150, col, .2, .32);
        var n = hitArc(u, fin ? 250 : 200, fin ? 3.2 : 1.2, base * (fin ? 4.2 : 3.6), fin ? 260 : 80); if (n) G.hstop = Math.max(G.hstop || 0, fin ? .08 : .05); try { SFX2.swing(fin); } catch (e) {} }); })(i);
    },
    axe: function (u, base) {      // 회전 분쇄 (was 10 quick spins): heave the axe up → two heavy full turns → slam into the ground
      var col = '#ffa040'; u.slashT = Math.max(u.slashT || 0, .35); gather(u, col, window.__phone ? 6 : 14); try { SFX2.charge(.35); } catch (e) {}
      [[.34, 3.5], [.6, 3.5]].forEach(function (s, i) { kLater(s[0], function () { if (u.dead) return; u.melSw2 = { t: 0, T: .24, i: i, fin: false, kind: 'twirl', dir: 1 };
        try { slashFx(u, styleOf(u), i % 2, false); } catch (e) {}
        crescent(u.x, uh(u) + 46, u.y, (u.aa || 0) + i * Math.PI, 70, 270, col, .26, .3); crescent(u.x, uh(u) + 46, u.y, (u.aa || 0) + i * Math.PI + Math.PI, 70, 270, col, .26, .3);
        hitArc(u, 280, 3.2, base * s[1], 150); try { SFX2.swing(true); } catch (e) {} }); });
      kLater(.9, function () { if (u.dead) return; u.melSw2 = { t: 0, T: .2, i: 2, fin: true, kind: 'slam', dir: 1 };
        var n = hitArc(u, 360, 3.2, base * 4, 420); G.hstop = Math.max(G.hstop || 0, .14); try { cam.shake = Math.max(cam.shake || 0, 14); SFX2.thump(); } catch (e) {}
        try { K().shockRing(u.x, u.y, 0xffa040); } catch (e) {} for (var q = 0; q < 4; q++) try { K().scorchMark(u.x, u.y, q * .8, 300, true); } catch (e) {}
        for (var j = 0; j < (window.__phone ? 12 : 26); j++) { var b = Math.random() * 6.28; try { part(u.x, u.y, Math.cos(b) * (150 + Math.random() * 250), Math.sin(b) * (150 + Math.random() * 250), .7, j % 2 ? '#b9a78c' : '#ffb36b', 8, 20); } catch (e) {} } });
    },
    glaive: function (u, base) {   // 반월참: wind-up, one great crescent, echo crescent behind
      var col = '#ff9be8', a = u.aa || 0;
      u.slashT = Math.max(u.slashT || 0, .3); gather(u, col, window.__phone ? 8 : 16); try { SFX2.charge(.3); } catch (e) {}
      kLater(.3, function () { if (u.dead) return; u.melSw2 = { t: 0, T: .3, i: 0, fin: true, kind: 'twirl', dir: 1 };
        try { slashFx(u, styleOf(u), 0, true); } catch (e) {} crescent(u.x, uh(u) + 50, u.y, u.aa, 80, 300, col, .38, .42);
        var n = hitArc(u, 340, 1.75, base * 6.5, 260); if (n) { G.hstop = Math.max(G.hstop || 0, .09); try { cam.shake = Math.max(cam.shake || 0, 9); } catch (e) {} }
        try { swArea(u.x + Math.cos(u.aa) * 150, u.y + Math.sin(u.aa) * 150, 220, base * 3, G.local); SFX2.swing(true); } catch (e) {} });
      kLater(.52, function () { if (u.dead) return; crescent(u.x, uh(u) + 46, u.y, (u.aa || a) + Math.PI, 60, 230, '#ffd0f0', .32, .28); hitArc(u, 260, 3.2, base * 3.3, 140); try { SFX2.swing(false); } catch (e) {} });
    },
    staff: function (u, base) {    // 선풍: wind-up, three wide sweeping turns (each one readable), a closing gust
      var col = '#b48cff'; u.slashT = Math.max(u.slashT || 0, .3); gather(u, col, window.__phone ? 6 : 12); try { SFX2.charge(.25); } catch (e) {}
      for (var i = 0; i < 3; i++) (function (i) { kLater(.28 + i * .2, function () { if (u.dead) return; u.melSw2 = { t: 0, T: .18, i: i, fin: i === 2, kind: 'twirl', dir: 1 }; try { slashFx(u, styleOf(u), i % 2, i === 2); } catch (e) {}
        crescent(u.x, uh(u) + 50, u.y, (u.aa || 0) + i * 2.09, 70, 210 + i * 25, col, .28, .38); hitArc(u, 260 + i * 20, 3.2, base * (i === 2 ? 3.6 : 2.4), i === 2 ? 220 : 90); if (i === 2) { G.hstop = Math.max(G.hstop || 0, .07); try { cam.shake = Math.max(cam.shake || 0, 7); } catch (e) {} } }); })(i);
    }
  };
  // called first thing by the game's weaponArt (inside its own code block); true = handled here
  window.__artOverride = function (u) {
    var X = K(); if (!X.artKey) return false; var k = X.artKey(u), f = ARTS[k], A = X.ART && X.ART[k]; if (!f || !A) return false;
    if ((u.artCd || 0) > G.t) return true; if (u.en != null && u.en < 25) { try { pop(L('에너지 부족', 'Low energy'), '#9fcfe8', false); } catch (e) {} return true; }
    u.artCd = G.t + A.cd; if (u.en != null) u.en -= 25; var base = X.kbase(u) * (u.melMul || 1);
    try { X.clipPlay(u, A.clip, .85); } catch (e) {}
    try { (window.arAnnounce || announce)('', tx(A.n), '', true, '#ffd166'); } catch (e) {}
    f(u, base); return true;
  };
  var hook = function () { if (!window.__hkArtsStep && typeof step === 'function') { window.__hkArtsStep = 1; var st = step; step = function (dt) { st(dt); try { tick(dt); } catch (e) {} }; } };
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
