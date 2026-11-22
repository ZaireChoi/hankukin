/* ASCEND v3.66 — floor and blast clean-up (19-4)
   · the flat purple discs under fog clouds are gone (the drifting fog clouds stay); mud pools get a soft, ragged edge and a
     low wet-earth tone instead of a solid coloured plate
   · explosion "yellow balls" (solid orange / yellow spheres) become a soft glow that swells and fades, with a puff of dark smoke
   Cost: one pooled sprite set (16), textures made once. */
(function () {
  'use strict';
  var T = null, soft = null, mudA = null, POOL = [], pi = 0;
  var mk = function () {
    T = window.THREE; if (!T) return false;
    var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.55)'); gr.addColorStop(.7, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    soft = new T.CanvasTexture(c); soft.userData = { keep: 1 };
    var m = document.createElement('canvas'); m.width = m.height = 128; var h = m.getContext('2d'), d = h.createImageData(128, 128);
    for (var y = 0; y < 128; y++) for (var x = 0; x < 128; x++) { var dx = x - 64, dy = y - 64, r = Math.hypot(dx, dy) / 64, a = Math.atan2(dy, dx), edge = .72 + .12 * Math.sin(a * 5 + 1) + .07 * Math.sin(a * 11) + (Math.random() - .5) * .06;
      var v = r < edge - .18 ? 1 : r < edge ? (edge - r) / .18 : 0; v *= .75 + Math.random() * .25; var o = (y * 128 + x) * 4; d.data[o] = d.data[o + 1] = d.data[o + 2] = Math.round(v * 255); d.data[o + 3] = 255; }
    h.putImageData(d, 0, 0); mudA = new T.CanvasTexture(m); mudA.userData = { keep: 1 };
    for (var i = 0; i < 16; i++) { var s = new T.Sprite(new T.SpriteMaterial({ map: soft, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.userData = { keep: 1, l: 0 }; POOL.push(s); }
    return true;
  };
  var near = function (o, arr) { for (var i = 0; i < arr.length; i++) if (Math.abs(o.position.x - arr[i].x) < 3 && Math.abs(o.position.z - arr[i].y) < 3) return true; return false; };
  var tidy = function () {
    try { var S = R3.envG; if (!S) return;
      S.traverse(function (o) { if (!o.isMesh || !o.geometry || o.geometry.type !== 'CircleGeometry' || o.position.y > 3) return;
        if (typeof FOGS !== 'undefined' && near(o, FOGS)) { o.visible = false; return; }
        if (typeof MUD !== 'undefined' && near(o, MUD) && !o.userData.mud2) { o.userData.mud2 = 1; var m = o.material.clone(); m.alphaMap = mudA; m.opacity = .7; m.color = new T.Color(0x3b2a20); m.roughness = .55; m.transparent = true; m.depthWrite = false; m.needsUpdate = true; o.material = m; } });
    } catch (e) {}
  };
  var warm = function (col) { try { var c = new T.Color(col), h = {}; c.getHSL(h); return h.h < .17 || h.h > .93 || h.s < .25; } catch (e) { return false; } };
  var live = [];
  var glow = function (x, h, z, r1, col, life) {
    var s = POOL[pi++ % POOL.length]; if (s.parent !== R3.scene) R3.scene.add(s); s.position.set(x, h, z); s.material.color.set(col); s.material.opacity = .9; s.visible = true; s.userData.l = s.userData.ml = Math.max(.25, life); s.userData.r = Math.max(30, r1 * 1.6); s.scale.setScalar(s.userData.r * .35); if (live.indexOf(s) < 0) live.push(s);
    try { for (var i = 0; i < 2; i++) part(x + (Math.random() - .5) * r1 * .4, z + (Math.random() - .5) * r1 * .4, (Math.random() - .5) * 40, (Math.random() - .5) * 40, .9, 'rgba(58,52,48,.55)', Math.min(26, r1 * .35), h + 10); } catch (e) {}
  };
  var tick = function (dt) { for (var i = live.length - 1; i >= 0; i--) { var s = live[i]; s.userData.l -= dt; var k = 1 - s.userData.l / s.userData.ml; if (s.userData.l <= 0) { s.visible = false; live.splice(i, 1); continue; } s.scale.setScalar(s.userData.r * (.35 + .65 * Math.sqrt(k))); s.material.opacity = .9 * (1 - k) * (1 - k); } };
  var hook = function () {
    var R = window.R3; if (!R || !R.ready) return; if (!T && !mk()) return;
    if (!window.__fl2Sph && typeof R.fxSphere === 'function') { window.__fl2Sph = 1; var fs = R.fxSphere; R.fxSphere = function (x, h, z, r0, r1, col, life, op) { if (warm(col)) { glow(x, h, z, Math.max(r0, r1), col, life); return; } return fs.apply(this, arguments); }; }
    if (!window.__fl2Env && typeof R.rebuildEnv === 'function') { window.__fl2Env = 1; var rb = R.rebuildEnv; R.rebuildEnv = function () { var r = rb.apply(this, arguments); setTimeout(tidy, 300); return r; }; tidy(); }
    if (!window.__fl2Step && typeof step === 'function') { window.__fl2Step = 1; var st = step; step = function (dt) { st(dt); try { tick(dt); } catch (e) {} }; }
  };
  setInterval(function () { try { hook(); if (window.R3 && R3.envG && typeof G !== 'undefined' && G && G.t < 3) tidy(); } catch (e) {} }, 500);
})();
