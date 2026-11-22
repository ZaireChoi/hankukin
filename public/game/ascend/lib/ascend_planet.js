/* ASCEND — PLANET TERRAIN ENGINE (100-player planet conquest)
   Data comes from the terrain generator (eroded height field + baked materials):
     planet/<id>/height.png  1025² RG = 16-bit height (R high byte, G low byte)
     planet/<id>/albedo.jpg  baked ground colour (regolith, rock, basalt cliffs, salt flats, crystal veins, ambient occlusion)
     planet/<id>/normal.jpg  surface normals      planet/<id>/walk.png  cliff mask (black = too steep to walk)
     planet/<id>/layout.json bases, objectives, lanes, mesas, craters, landmark placements
   Lag budget
     · 8×8 chunks, 3 detail levels picked by distance every 0.25 s (near 129² verts, mid 65², far 33²), skirts hide the seams
     · one shared material for the whole ground → draw calls = visible chunks (typically 6–14 from the battle camera)
     · a small grey detail texture tiles over the baked colour near the camera (crisp up close, free far away)
     · landmarks: one InstancedMesh per Meshy model (one draw call per kind, wherever and however many)
     · phones: mid/far levels kick in sooner, no normal map
   API: PLANET.load(base) → Promise; PLANET.group; PLANET.heightAt(x, y); PLANET.walkable(x, y); PLANET.update(camX, camY) */
(function () {
  'use strict';
  var P = { ready: false, group: null, layout: null };
  var T, N = 0, WORLD = 9600, HMIN = 0, HMAX = 1, HT = null, WK = null, WN = 0;
  var phone = function () { return !!window.__phone || /Android|iPhone|iPad/i.test(navigator.userAgent); };
  var img = function (url) { return new Promise(function (res, rej) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = rej; i.src = url; }); };
  var pixels = function (im) { var c = document.createElement('canvas'); c.width = im.width; c.height = im.height; var g = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
  P.heightAt = function (x, y) {
    if (!HT) return 0; var fx = x / WORLD * (N - 1), fy = y / WORLD * (N - 1); if (fx < 0) fx = 0; if (fy < 0) fy = 0; if (fx > N - 1.001) fx = N - 1.001; if (fy > N - 1.001) fy = N - 1.001;
    var i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, a = j * N + i; return HT[a] * (1 - u) * (1 - v) + HT[a + 1] * u * (1 - v) + HT[a + N] * (1 - u) * v + HT[a + N + 1] * u * v;
  };
  P.walkable = function (x, y) { if (!WK) return true; var i = Math.round(x / WORLD * (WN - 1)), j = Math.round(y / WORLD * (WN - 1)); if (i < 0 || j < 0 || i >= WN || j >= WN) return false; return WK[j * WN + i] > 127; };
  // ---------------------------------------------------------------- chunk geometry (one per level, with skirts)
  var CH = 8, chunks = [];
  var buildChunk = function (ci, cj, step) {
    var per = (N - 1) / CH, i0 = ci * per, j0 = cj * per, n = per / step + 1, cs = WORLD / (N - 1);
    var vc = n * n + 4 * n, pos = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), idx = [];
    var put = function (k, i, j, drop) { var h = HT[j * N + i] - (drop || 0); pos[k * 3] = i * cs; pos[k * 3 + 1] = h; pos[k * 3 + 2] = j * cs; uv[k * 2] = i / (N - 1); uv[k * 2 + 1] = 1 - j / (N - 1); };
    for (var b = 0; b < n; b++) for (var a = 0; a < n; a++) put(b * n + a, i0 + a * step, j0 + b * step);
    for (var b2 = 0; b2 < n - 1; b2++) for (var a2 = 0; a2 < n - 1; a2++) { var p = b2 * n + a2; idx.push(p, p + n, p + 1, p + 1, p + n, p + n + 1); }
    // skirts on the four sides (hang 60 units down so neighbouring levels never show a gap)
    var base = n * n, edges = [[0, 1, 0], [n * (n - 1), 1, 0], [0, n, 1], [n - 1, n, 1]];
    for (var e = 0; e < 4; e++) { var s0 = edges[e][0], st = edges[e][1]; for (var q = 0; q < n; q++) { var src = s0 + q * st, si = i0 + (src % n) * step, sj = j0 + Math.floor(src / n) * step; put(base + e * n + q, si, sj, 60); }
      for (var q2 = 0; q2 < n - 1; q2++) { var t0 = s0 + q2 * st, t1 = t0 + st, k0 = base + e * n + q2, k1 = k0 + 1; idx.push(t0, k0, t1, t1, k0, k1, t0, t1, k0, t1, k1, k0); } }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  };
  var detailTex = function () {
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), d = g.createImageData(256, 256);
    // tileable value noise, 4 octaves (no stripes)
    var oct = [[8, .45], [16, .28], [32, .17], [64, .1]], grid = oct.map(function (o) { var a = new Float32Array(o[0] * o[0]); for (var k = 0; k < a.length; k++) a[k] = Math.random(); return a; });
    for (var y = 0; y < 256; y++) for (var x = 0; x < 256; x++) { var v = 0; for (var q = 0; q < oct.length; q++) { var n = oct[q][0], gx = x / 256 * n, gy = y / 256 * n, i0 = Math.floor(gx), j0 = Math.floor(gy), fx = gx - i0, fy = gy - j0, A = grid[q]; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var c00 = A[(j0 % n) * n + i0 % n], c10 = A[(j0 % n) * n + (i0 + 1) % n], c01 = A[((j0 + 1) % n) * n + i0 % n], c11 = A[((j0 + 1) % n) * n + (i0 + 1) % n]; v += oct[q][1] * (c00 * (1 - fx) * (1 - fy) + c10 * fx * (1 - fy) + c01 * (1 - fx) * fy + c11 * fx * fy); }
      var o = (y * 256 + x) * 4; d.data[o] = d.data[o + 1] = d.data[o + 2] = Math.max(0, Math.min(255, 40 + v * 200 + (Math.random() - .5) * 18)); d.data[o + 3] = 255; }
    g.putImageData(d, 0, 0); var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  };
  P.load = function (base) {
    T = window.THREE; base = base.replace(/\/?$/, '/');
    return fetch(base + 'layout.json').then(function (r) { return r.json(); }).then(function (L) {
      P.layout = L; WORLD = L.world; HMIN = L.hmin; HMAX = L.hmax;
      return Promise.all([img(base + 'height.png'), img(base + 'walk.png'), new Promise(function (res) { new T.TextureLoader().load(base + 'albedo.jpg', res); }), null /* the mesh carries the shape; a full-height normal map would double the slopes */]);
    }).then(function (R) {
      var hp = pixels(R[0]); N = R[0].width; HT = new Float32Array(N * N);
      for (var a = 0; a < N * N; a++) HT[a] = HMIN + (hp[a * 4] * 256 + hp[a * 4 + 1]) / 65535 * (HMAX - HMIN);
      var wp = pixels(R[1]); WN = R[1].width; WK = new Uint8Array(WN * WN); for (var b = 0; b < WN * WN; b++) WK[b] = wp[b * 4];
      var alb = R[2]; alb.colorSpace = T.SRGBColorSpace; alb.anisotropy = 8;
      var mat = new T.MeshStandardMaterial({ map: alb, normalMap: R[3] || null, roughness: .93, metalness: 0 });
      var det = detailTex();
      mat.onBeforeCompile = function (sh) {
        sh.uniforms.detMap = { value: det };
        sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'uniform sampler2D detMap;varying vec3 vWp;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n float dd = clamp(1.0 - length(vWp - cameraPosition) / 2600.0, 0.0, 1.0);\n float dt = texture2D(detMap, vWp.xz / 90.0).r * .6 + texture2D(detMap, vWp.xz / 23.0).r * .4;\n diffuseColor.rgb *= mix(1.0, .55 + dt * .9, dd);');
      };
      P.mat = mat; var grp = new T.Group(); grp.name = 'planet'; grp.userData.keep = 1;
      for (var cj = 0; cj < CH; cj++) for (var ci = 0; ci < CH; ci++) {
        var lv = [buildChunk(ci, cj, 1), buildChunk(ci, cj, 2), buildChunk(ci, cj, 4)];
        var m = new T.Mesh(lv[2], mat); m.receiveShadow = true; m.userData.lv = lv; m.userData.cur = 2; m.userData.cx = (ci + .5) * WORLD / CH; m.userData.cy = (cj + .5) * WORLD / CH; grp.add(m); chunks.push(m);
      }
      P.group = grp; P.ready = true; return P;
    });
  };
  var lastU = 0;
  P.update = function (cx, cy) {
    if (!P.ready) return; var t = performance.now(); if (t - lastU < 250) return; lastU = t; var ph = phone(), size = WORLD / CH;
    for (var i = 0; i < chunks.length; i++) { var m = chunks[i], d = Math.hypot(m.userData.cx - cx, m.userData.cy - cy) - size * .7;
      var want = d < (ph ? 300 : 700) ? 0 : d < (ph ? 1800 : 3000) ? 1 : 2; if (want !== m.userData.cur) { m.userData.cur = want; m.geometry = m.userData.lv[want]; } }
  };
  // ---------------------------------------------------------------- landmarks (Meshy models, instanced per kind)
  P.placeLandmarks = function (modelBase, list) {
    var X = window.__TX || {}; if (!X.GLTFLoader || !P.ready) return Promise.resolve(0);
    var kinds = {}; list.forEach(function (o) { (kinds[o.m] = kinds[o.m] || []).push(o); });
    return Promise.all(Object.keys(kinds).map(function (k) {
      return new Promise(function (res) {
        new X.GLTFLoader().load(modelBase + k + '.glb', function (g) {
          var src = null; g.scene.updateMatrixWorld(true); g.scene.traverse(function (o) { if (o.isMesh && !src) src = o; }); if (!src) return res(0);
          var geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld); geo.computeBoundingBox(); var bb = geo.boundingBox, c = new T.Vector3(); bb.getCenter(c);
          geo.translate(-c.x, -bb.min.y, -c.z); var sz = new T.Vector3(); bb.getSize(sz); var foot = Math.max(sz.x, sz.z) || 1;
          var arr = kinds[k], mt = src.material.clone(); if (arr[0].bright) { mt.color.multiplyScalar(arr[0].bright); } if (mt.map) mt.map.anisotropy = 4; var im = new T.InstancedMesh(geo, mt, arr.length), M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), V = new T.Vector3(), E = new T.Euler();
          arr.forEach(function (o, n) { var s = (o.size || 400) / foot; E.set(0, o.rot || 0, 0); Q.setFromEuler(E); S.set(s, s * (o.sy || 1), s); V.set(o.x, P.heightAt(o.x, o.y) - (o.sink || .04) * sz.y * s, o.y); M.compose(V, Q, S); im.setMatrixAt(n, M); });
          im.castShadow = true; im.receiveShadow = true; im.userData.keep = 1; P.group.add(im); res(arr.length);
        }, null, function () { res(0); });
      });
    }));
  };
  window.PLANET = P;
})();
