/* ASCEND v3.84: also big dark round ground stains (contact shadows under units stay), rings raised up to 150 (warp holes at 110),
   and big camera-facing ring pictures near the ground (the warp holes' black-hole sprites).
   ASCEND v3.80 — no circles on the ground, no swirl emblems (user, repeated: "바닥에 동그라미와 뜬금없는 태극 문장들은 같이 없애줘")
   Every flat ring / disc / torus and every flat round-glow plate that some code tries to put on the ground is refused at the
   moment it is added to the 3D world (THREE.Object3D.add), from any module — explosion and hit rings, shock rings, stacked
   yellow rings, white swirl rings, capture-point / base / spawn / under-frame circles, heal (green) and EMP (cyan) rings,
   and the two-colour spiral discs of the warp holes (the "태극"-looking emblems; the standing portal ring stays).
   Kept: enemy and boss attack warnings (red, they fade in 1-1.5 s), dark contact shadows under units, terrain,
   standing (vertical) rings such as dash pressure rings, and the instanced effect pools.
   A light sweep every 0.5 s takes out any that were turned flat after being added.  Debug: window.__noGround.stat() */
(function () {
  'use strict';
  var T = null, N = { refused: 0, swept: 0, kinds: {} };
  var ROUND = /^(Ring|Circle|Torus)Geometry$/;
  var lumCache = new WeakMap(), ringCache = new WeakMap();
  var texLum = function (tex) {      // how bright a picture is (0..1); dark soft blobs are contact shadows and stay
    if (!tex || !tex.image) return 1; var v = lumCache.get(tex); if (v != null) return v; v = 1;
    try { var im = tex.image, c = document.createElement('canvas'); c.width = c.height = 16; var g = c.getContext('2d'); g.drawImage(im, 0, 0, 16, 16); var d = g.getImageData(0, 0, 16, 16).data, mx = 0;
      for (var i = 0; i < d.length; i += 4) { var l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255 * (d[i + 3] / 255); if (l > mx) mx = l; } v = mx; } catch (e) { v = 1; }
    lumCache.set(tex, v); return v;
  };
  var roundPic = function (tex) {    // a square picture whose corners are empty = a round glow / disc picture
    if (!tex || !tex.image) return false; var k = lumCache.get(tex.image); if (k != null) return k; k = false;
    try { var im = tex.image; if (Math.abs((im.width || 0) - (im.height || 0)) > 2) { lumCache.set(tex.image, false); return false; }
      var c = document.createElement('canvas'); c.width = c.height = 16; var g = c.getContext('2d'); g.drawImage(im, 0, 0, 16, 16); var d = g.getImageData(0, 0, 16, 16).data;
      var corner = function (x, y) { var i = (y * 16 + x) * 4; return d[i + 3] / 255 * (d[i] + d[i + 1] + d[i + 2]) / 765; };
      var ctr = corner(8, 8), cn = Math.max(corner(0, 0), corner(15, 0), corner(0, 15), corner(15, 15));
      k = cn < .06 && ctr > .12; } catch (e) { k = false; }
    lumCache.set(tex.image, k); return k;
  };
  var ringPic = function (tex) {    // dark middle, bright ring around it (warp holes drawn as camera-facing pictures)
    if (!tex || !tex.image) return false; var key = 'r' + (tex.image.width || 0); var c0 = ringCache.get(tex); if (c0 != null) return c0; var k = false;
    try { var im = tex.image, c = document.createElement('canvas'); c.width = c.height = 16; var g = c.getContext('2d'); g.drawImage(im, 0, 0, 16, 16); var d = g.getImageData(0, 0, 16, 16).data;
      var L = function (x, y) { var i = (y * 16 + x) * 4; return d[i + 3] / 255 * (d[i] + d[i + 1] + d[i + 2]) / 765; }; var mid = L(8, 8), ring = Math.max(L(8, 3), L(3, 8), L(13, 8), L(8, 13)); k = mid < .12 && ring > .3; } catch (e) { k = false; }
    ringCache.set(tex, k); return k;
  };
  var isRed = function (m) { var c = m && m.color; if (!c) return false; return c.r > .75 && c.g < .45 && c.b < .45; };
  var flatLocal = function (o) {     // lies flat: its plane faces up (rotation.x = ±90°, or the geometry was rotated flat)
    var rx = Math.abs(o.rotation.x); if (Math.abs(rx - Math.PI / 2) < .35 && Math.abs(o.rotation.z) < 7 && Math.abs(Math.abs(o.rotation.y) % Math.PI) < .35) return true;
    var g = o.geometry; if (g && g.boundingBox == null) try { g.computeBoundingBox(); } catch (e) {}
    var b = g && g.boundingBox; if (b) { var sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z; if (sy < Math.max(sx, sz) * .08 && rx < .35) return true; }
    return false;
  };
  var flatWorld = function (o) {
    if (!T) return false; var q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(); o.updateWorldMatrix(true, false); o.matrixWorld.decompose(p, q, s);
    var n = new T.Vector3(0, 0, 1).applyQuaternion(q); var g = o.geometry, flatGeo = false;
    if (g && g.boundingBox == null) try { g.computeBoundingBox(); } catch (e) {}
    var b = g && g.boundingBox; if (b && (b.max.y - b.min.y) < Math.max(b.max.x - b.min.x, b.max.z - b.min.z) * .08) { n.set(0, 1, 0).applyQuaternion(q); flatGeo = true; }
    return Math.abs(n.y) > .8 && p.y < 150;
  };
  var banned = function (o, world) {
    if (o && o.isSprite && !o.userData.groundOK) { var sm = o.material; var sc = Math.max(o.scale.x, o.scale.y); if (sm && sm.map && sc > 300 && o.position.y < 220 && ringPic(sm.map)) return 'Sprite-ring #' + (sm.color ? sm.color.getHexString() : ''); return null; }
    if (!o || !o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.groundOK) return null;
    var g = o.geometry, gt = g && g.type, m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m) return null;
    var round = ROUND.test(gt || ''), plate = !round && gt === 'PlaneGeometry' && m.map && roundPic(m.map);
    if (!round && !plate) return null;
    if (isRed(m)) return null;                                   // attack warnings stay
    if (plate && texLum(m.map) * Math.max(m.color.r, m.color.g, m.color.b) < .22 && m.blending !== 2) { var pw = (g.parameters && Math.max(g.parameters.width || 0, g.parameters.height || 0) || 1) * Math.max(Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z)); if (pw < 95) return null; }   // small dark blob = contact shadow under a unit; big ones are ground stains (v3.84)
    if (gt === 'RingGeometry' || gt === 'CircleGeometry') { var pr = g.parameters || {}; if ((pr.outerRadius || pr.radius || 0) > 4000) return null; } // sky / horizon pieces
    if (!(world ? flatWorld(o) : flatLocal(o))) return null;
    return (gt || 'plate') + (m.map ? '+pic' : '') + ' #' + (m.color ? m.color.getHexString() : '');
  };
  var note = function (k) { N.kinds[k] = (N.kinds[k] || 0) + 1; };
  var strip = function (root) {      // take banned pieces out of a group that is about to be added
    var rm = []; root.traverse(function (o) { if (o !== root) { var k = banned(o, false); if (k) { rm.push(o); note(k); } } });
    for (var i = 0; i < rm.length; i++) { if (rm[i].parent) rm[i].parent.remove(rm[i]); N.refused++; }
  };
  var install = function () {
    T = window.THREE; if (!T || !T.Object3D || T.Object3D.prototype.__ngAdd) return !!(T && T.Object3D && T.Object3D.prototype.__ngAdd);
    var add = T.Object3D.prototype.add;
    T.Object3D.prototype.add = function (o) {
      if (arguments.length === 1 && o && o !== this) {
        try { var k = banned(o, false); if (k) { N.refused++; note(k); return this; } if (o.children && o.children.length) strip(o); } catch (e) {}
      }
      return add.apply(this, arguments);
    };
    T.Object3D.prototype.__ngAdd = 1; return true;
  };
  var sweep = function () {
    if (!window.R3 || !R3.scene) return; var rm = [];
    /* v3.94 (27-1): the coloured ring under every unit (red under enemies) is not an attack warning - taken off too */
    try { R3.units.forEach(function (e) { if (e && e.ring && e.ring.parent) { e.ring.parent.remove(e.ring); N.swept++; note('unit ring'); } }); } catch (e) {}
    R3.scene.traverse(function (o) { var k = banned(o, true); if (k) { rm.push(o); note(k); } });
    for (var i = 0; i < rm.length; i++) { if (rm[i].parent) rm[i].parent.remove(rm[i]); N.swept++; }
  };
  // sparks that fly out at one fixed speed form a perfect expanding ring of dots; every spark now gets its own speed (scatter)
  var partHook = function () { if (window.__hkNgPart || typeof part !== 'function') return; window.__hkNgPart = 1; var p0 = part; part = function (x, y, vx, vy) { if (vx || vy) { var k = .42 + Math.random() * .66; arguments[2] = vx * k; arguments[3] = vy * k; } return p0.apply(this, arguments); }; };
  setInterval(function () { try { partHook(); } catch (e) {} }, 500);
  var iv = setInterval(function () { try { install(); } catch (e) {} }, 50);
  setInterval(function () { try { if (install()) { clearInterval(iv); sweep(); } } catch (e) { N.err = String(e).slice(0, 160); } }, 500);
  window.__noGround = { stat: function () { return { refused: N.refused, swept: N.swept, kinds: N.kinds, err: N.err || null }; }, sweep: sweep };
})();
