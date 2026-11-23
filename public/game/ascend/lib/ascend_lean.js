/* ASCEND v3.70 (written v3.66, live-tested 2026-11-23: 60-unit red dune calls 280-378 -> 103-165, pictures match) — lean draw (manager 19-3: end-of-battle draw calls 337 -> 200 or less). Same look, fewer draw calls.
   (1) A see-through effect that has faded to opacity 0 (and writes no depth) is not sent to the graphics card at all.
       It draws nothing either way; before, 30-35 of them still cost a draw call every frame.
   (2) Look-alike pieces — glow balls, jet flames, soft contact shadows, nebula puffs, ground marks, red X marks — that share the
       same picture, blend, shape and side (3 or more in the scene) are drawn together: one instanced draw per look.
       Every copy keeps its own place, size, turn, color and fade; camera-facing sprites keep facing the camera exactly as before.
       The original pieces stay in the scene and game code still moves / hides / fades / removes them; only their own draw is
       skipped while the batch draws them. Anything unusual (custom shader, vertex colors, depth-writing see-through, mirrored
       scale, edited shape, other layer) is left alone and drawn as before.
   Wraps once: window.__hkLeanRBD (renderer.renderBufferDirect), window.__hkLeanOBR (scene.onBeforeRender).
   Debug: __lean.stat(), __lean.off(), __lean.on() */
(function () {
  'use strict';
  if (window.__lean) return;
  var L = { on: true, scene: null, batches: new Map(), skipZero: 0, skipB: 0, drawnB: 0, sweeps: 0, err: null };
  var T = null, MIN = 3, ID = 0;
  var hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var GEO = /^(Plane|Circle|Ring|Sphere|Box|Cylinder|Cone|Octahedron|Icosahedron|Tetrahedron|Torus|Capsule)Geometry$/;
  // ------------------------------------------------------------------ keys
  var fp = function (a) { var s = 0, n = a.length, st = Math.max(1, Math.floor(n / 97)); for (var i = 0; i < n; i += st) s += a[i] * ((i % 13) + 1); return Math.round(s * 1000); };
  var geoKey = function (g) {
    if (!g || !g.parameters || !GEO.test(g.type) || !g.attributes.position) return null;
    if (g.morphAttributes && g.morphAttributes.position) return null;
    if (g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return null;
    var p = g.attributes.position;
    if (g.__lnK === undefined || g.__lnV !== p.version) { g.__lnK = g.type + JSON.stringify(g.parameters) + '#' + p.count + ':' + fp(p.array) + (g.index ? 'i' + g.index.count : ''); g.__lnV = p.version; }
    return g.__lnK;
  };
  var matKey = function (o, m) {
    if (!m || Array.isArray(m) || !m.visible || hasOwn(m, 'onBeforeCompile') || m.alphaMap || m.blending === 5 || m.stencilWrite || m.clippingPlanes) return null;
    if (m.transparent && m.depthWrite) return null;                       // depth-writing see-through pieces depend on draw order
    if (o.isSprite) { if (!m.isSpriteMaterial || !m.sizeAttenuation) return null; }
    else if (!m.isMeshBasicMaterial || m.vertexColors || m.envMap || m.lightMap || m.aoMap || m.specularMap || m.wireframe) return null;
    var map = m.map;
    if (map && (map.isVideoTexture || map.matrixAutoUpdate === false)) return null;
    return m.type + '|' + (map ? map.uuid : '-') + '|' + m.blending + '|' + m.side + '|' + (m.transparent ? 1 : 0) + (m.depthWrite ? 1 : 0) + (m.depthTest ? 1 : 0) + (m.fog ? 1 : 0) + (m.toneMapped ? 1 : 0) + (m.premultipliedAlpha ? 1 : 0) + (m.colorWrite ? 1 : 0) + '|' + m.alphaTest + '|' + (m.polygonOffset ? m.polygonOffsetFactor + ',' + m.polygonOffsetUnits : '');
  };
  var keyOf = function (o) {
    if (o.__lnBatch || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || o.layers.mask !== 1 || hasOwn(o, 'onBeforeRender')) return null;
    var m = o.material, gk;
    if (o.isSprite) { if (o.center.x !== .5 || o.center.y !== .5) return null; gk = 'sprite'; }
    else if (o.isMesh) { gk = geoKey(o.geometry); if (!gk) return null; } else return null;
    var mk = matKey(o, m); if (!mk) return null;
    return gk + '|' + mk + '|r' + o.renderOrder;
  };
  // ------------------------------------------------------------------ batches
  var mkBatch = function (key, o, cap) {
    var m = o.material, g;
    if (o.isSprite) g = new T.PlaneGeometry(1, 1); else g = o.geometry.clone();
    var op = new T.InstancedBufferAttribute(new Float32Array(cap), 1); op.setUsage(T.DynamicDrawUsage); g.setAttribute('iOp', op);
    var bm = new T.MeshBasicMaterial({ map: m.map || null, transparent: m.transparent, blending: m.blending, side: o.isSprite ? T.FrontSide : m.side, depthWrite: m.depthWrite, depthTest: m.depthTest, fog: m.fog, toneMapped: m.toneMapped, alphaTest: m.alphaTest, premultipliedAlpha: m.premultipliedAlpha, colorWrite: m.colorWrite, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
    bm.forceSinglePass = true;
    bm.onBeforeCompile = function (s) {
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float iOp;\nvarying float vIOp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvIOp = iOp;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vIOp;').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse, opacity * vIOp );');
    };
    bm.customProgramCacheKey = function () { return 'lean1'; };
    var im = new T.InstancedMesh(g, bm, cap); im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    im.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3); im.instanceColor.setUsage(T.DynamicDrawUsage);
    im.frustumCulled = false; im.matrixAutoUpdate = false; im.renderOrder = o.renderOrder; im.count = 0; im.visible = false;
    im.__lnBatch = 1; im.userData.keep = 1; im.name = 'lean_batch';
    return { key: key, im: im, cap: cap, mem: [], sprite: !!o.isSprite, mat: m.isSpriteMaterial ? 1 : 0, idle: 0 };
  };
  var dropBatch = function (b) { try { if (b.im.parent) b.im.parent.remove(b.im); b.im.geometry.dispose(); b.im.material.dispose(); } catch (e) {} };
  var release = function (o) { o.__lnB = 0; o.__lnBat = null; };
  var sweep = function () {
    var R = window.R3; if (!R || !R.scene) return;
    if (L.scene !== R.scene) { L.batches.forEach(function (b) { b.mem.forEach(release); dropBatch(b); }); L.batches.clear(); L.scene = R.scene; hookScene(R.scene); }
    L.sweeps++;
    var groups = new Map();
    R.scene.traverse(function (o) {
      if (!(o.isMesh || o.isSprite)) return;
      var k = null; try { k = keyOf(o); } catch (e) {}
      if (!k) { if (o.__lnB) release(o); return; }
      var a = groups.get(k); if (!a) { a = []; groups.set(k, a); } a.push(o);
    });
    // members that left the scene
    L.batches.forEach(function (b) { for (var i = 0; i < b.mem.length; i++) { var o = b.mem[i]; if (o.__lnBat === b && !(groups.get(b.key) || []).includes(o)) release(o); } });
    groups.forEach(function (list, k) {
      var b = L.batches.get(k);
      if (list.length < MIN) { if (b) { b.mem.forEach(function (o) { if (o.__lnBat === b) release(o); }); b.mem = []; } return; }
      if (b && list.length > b.cap) { b.mem.forEach(function (o) { if (o.__lnBat === b) release(o); }); dropBatch(b); L.batches.delete(k); b = null; }
      if (!b) { var cap = 32; while (cap < list.length * 1.5) cap *= 2; b = mkBatch(k, list[0], cap); b.id = ++ID; L.batches.set(k, b); }
      if (b.im.parent !== R.scene) R.scene.add(b.im);
      b.mem.forEach(function (o) { if (o.__lnBat === b) release(o); });
      b.mem = list; b.idle = 0;
      for (var i = 0; i < list.length; i++) { var o = list[i]; o.__lnB = 1; o.__lnBat = b; o.__lnMat = o.material; o.__lnGeo = o.geometry; o.__lnMap = o.material.map; }
    });
    L.batches.forEach(function (b, k) { if (!groups.has(k) || b.mem.length === 0) { b.mem = []; b.im.visible = false; if (++b.idle > 20) { dropBatch(b); L.batches.delete(k); } } });
  };
  // ------------------------------------------------------------------ per render fill (after the scene's matrices are updated)
  var _m = null, _q = null, _qz = null, _p = null, _s = null, _cq = null, _z = null, _list = [], _fr = null, _pm = null, _sp = null;
  // the camera's own culling is kept: a copy outside the view is not drawn by the batch either (and a batch with none in view is off)
  var inView = function (o, el, sprite) {
    var sx = Math.hypot(el[0], el[1], el[2]), sy = Math.hypot(el[4], el[5], el[6]), r;
    if (sprite) r = Math.max(sx, sy) * .71;
    else { var g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); r = g.boundingSphere.radius * Math.max(sx, sy, Math.hypot(el[8], el[9], el[10])); _sp.center.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld); _sp.radius = r; return _fr.intersectsSphere(_sp); }
    _sp.center.set(el[12], el[13], el[14]); _sp.radius = r; return _fr.intersectsSphere(_sp);
  };
  var chainOn = function (o, sc) { var p = o; for (var i = 0; i < 40 && p; i++) { if (!p.visible) return false; if (p === sc) return true; p = p.parent; } return false; };
  var fill = function (sc, cam) {
    if (!L.on || !L.batches.size) return;
    if (!(cam.layers.mask & 1)) { L.batches.forEach(function (b) { b.im.visible = false; }); return; }
    cam.getWorldQuaternion(_cq);
    _pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
    L.batches.forEach(function (b) {
      var im = b.im, n = 0, cx = 0, cy = 0, cz = 0, mem = b.mem; _list.length = 0;
      for (var i = 0; i < mem.length; i++) {
        var o = mem[i]; if (o.__lnBat !== b) continue;
        var m = o.material;
        if (m !== o.__lnMat || o.geometry !== o.__lnGeo || m.map !== o.__lnMap || !m.visible || (!o.isSprite && o.geometry.attributes.position.version !== o.geometry.__lnV)) { release(o); continue; }
        if (!chainOn(o, sc)) continue;
        if (m.transparent && m.opacity < .004) continue;
        var e = o.matrixWorld.elements;
        if (!b.sprite && m.side !== 2 && o.matrixWorld.determinant() < 0) { release(o); continue; }
        if (o.frustumCulled !== false && !inView(o, e, b.sprite)) continue;
        _list.push(o); cx += e[12]; cy += e[13]; cz += e[14];
      }
      n = _list.length; if (n > b.cap) n = b.cap;
      if (!n) { im.visible = false; im.count = 0; return; }
      cx /= _list.length; cy /= _list.length; cz /= _list.length;
      im.position.set(cx, cy, cz); im.updateMatrix(); im.matrixWorld.copy(im.matrix);
      var ma = im.instanceMatrix.array, ca = im.instanceColor.array, oa = im.geometry.attributes.iOp.array;
      for (var j = 0; j < n; j++) {
        var q = _list[j], mm = q.material, el = q.matrixWorld.elements, o16 = j * 16;
        if (b.sprite) {
          _p.set(el[12] - cx, el[13] - cy, el[14] - cz);
          _s.set(Math.hypot(el[0], el[1], el[2]), Math.hypot(el[4], el[5], el[6]), 1);
          if (mm.rotation) { _qz.setFromAxisAngle(_z, mm.rotation); _q.copy(_cq).multiply(_qz); } else _q.copy(_cq);
          _m.compose(_p, _q, _s); var me = _m.elements; for (var t = 0; t < 16; t++) ma[o16 + t] = me[t];
        } else {
          for (var t2 = 0; t2 < 16; t2++) ma[o16 + t2] = el[t2];
          ma[o16 + 12] -= cx; ma[o16 + 13] -= cy; ma[o16 + 14] -= cz;
        }
        var c = mm.color; ca[j * 3] = c.r; ca[j * 3 + 1] = c.g; ca[j * 3 + 2] = c.b; oa[j] = mm.opacity;
      }
      im.count = n; im.visible = true; L.drawnB += n;
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.geometry.attributes.iOp.needsUpdate = true;
    });
  };
  // ------------------------------------------------------------------ hooks (each exactly once)
  var hookScene = function (sc) {
    if (sc.__hkLeanOBR) return; sc.__hkLeanOBR = 1;
    var ob = sc.onBeforeRender;
    sc.onBeforeRender = function (r, s, cam) { try { ob.apply(this, arguments); } catch (e) {} if (s === L.scene) { try { fill(s, cam); } catch (e) { L.err = String(e).slice(0, 160); } } };
  };
  var hook = function () {
    var R = window.R3; T = window.THREE; if (!R || !R.r || !T) return false;
    if (!_m) { _m = new T.Matrix4(); _q = new T.Quaternion(); _qz = new T.Quaternion(); _p = new T.Vector3(); _s = new T.Vector3(); _cq = new T.Quaternion(); _z = new T.Vector3(0, 0, 1); _fr = new T.Frustum(); _pm = new T.Matrix4(); _sp = new T.Sphere(); }
    if (!window.__hkLeanRBD) {
      window.__hkLeanRBD = 1; var r = R.r, rbd = r.renderBufferDirect;
      r.renderBufferDirect = function (cam, scene, geo, mat, obj, grp) {
        if (L.on) {
          if (obj && obj.__lnB === 1 && scene && scene === L.scene && obj.__lnBat && obj.__lnBat.im.visible) { L.skipB++; return; }
          if (mat && mat.transparent === true && mat.opacity < .004 && !mat.depthWrite && !mat.isShaderMaterial && !hasOwn(mat, 'onBeforeCompile') && !(obj && obj.__lnBatch)) { L.skipZero++; return; }
        }
        return rbd.call(this, cam, scene, geo, mat, obj, grp);
      };
    }
    return true;
  };
  var t = 0;
  setInterval(function () { try { if (!hook()) return; if (!L.on) return; t++; sweep(); } catch (e) { L.err = String(e).slice(0, 160); } }, 1000);
  window.__lean = {
    L: L,
    stat: function () { var b = []; L.batches.forEach(function (x) { b.push((x.sprite ? 'S ' : 'M ') + x.mem.length + '/' + x.im.count); }); return { on: L.on, batches: L.batches.size, members: b.join(' '), skipZero: L.skipZero, skipB: L.skipB, drawnB: L.drawnB, sweeps: L.sweeps, err: L.err }; },
    off: function () { L.on = false; L.batches.forEach(function (b) { b.im.visible = false; b.mem.forEach(release); b.mem = []; }); },
    on: function () { L.on = true; try { sweep(); } catch (e) {} }
  };
})();
