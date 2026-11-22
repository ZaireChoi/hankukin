/* ASCEND — PLANET CONQUEST MAP in the real game (Argen-7, 9600×9600, 5 objectives)
   · adds the map to the battle map list (same faction-war rules: bases lower-left / upper-right, points A–E)
   · ground follows the eroded terrain: every unit, the camera, sparks, blasts and point markers sit on the real height
   · cliffs block ground units (slide along them); stuck AI units follow a flow field (one per objective) round the rock
   · flying units keep their altitude above the ground under them
   Lag: terrain = ~12–24 draw calls (chunked LOD), landmarks instanced; flow fields 128×128 built once per match (~5 ms);
        per frame only a height lookup per unit/effect */
(function () {
  'use strict';
  var ID = 'planet', DATA = 'planet/argen/';
  var on = function () { try { return typeof MAP !== 'undefined' && MAP && MAP.id === ID && window.PLANET && PLANET.ready; } catch (e) { return false; } };
  var hAt = function (x, y) { return PLANET.heightAt(x, y); };
  // ---------------------------------------------------------------- the map entry
  var addMap = function () {
    if (typeof MAPS === 'undefined' || MAPS[ID]) return !!(typeof MAPS !== 'undefined' && MAPS[ID]);
    MAPS[ID] = { id: ID, n: { ko: '행성 아르겐-7 · 점령전', en: 'Planet Argen-7 · Conquest' },
      d: { ko: '9,600 크기의 침식된 붉은 행성. 본진은 왼쪽 아래·오른쪽 위, 거점 5곳(전방 기지 2·궤도포 고원·보급창·통신탑). 산맥과 절벽을 돌아 길을 잡아라.', en: 'A 9,600-wide eroded red planet. Bases at opposite corners, 5 objectives. Work round the ranges and cliffs.' },
      theme: 'dune', W: 9600, H: 9600, sym: 'p', base: { x: 1150, y: 8450 }, base1: { x: 8450, y: 1150 },
      points: [{ n: 'A', x: 3050, y: 5650 }, { n: 'B', x: 1900, y: 1900 }, { n: 'C', x: 4800, y: 4800 }, { n: 'D', x: 7700, y: 7700 }, { n: 'E', x: 6550, y: 3950 }], coreNeed: 3,
      fogs: [], bholes: [], wholes: [], lava: [], mud: [], high: [], gusts: [], rocks: 0, rmin: 30, rmax: 60, seed: 7, minBase: 900, planet: 'argen' };
    try { if (MAP_ORDER.indexOf(ID) < 0) MAP_ORDER.push(ID); if (typeof syncMapUI === 'function') syncMapUI(); } catch (e) {}
    return true;
  };
  var loading = null;
  var ensureData = function () { if (window.PLANET && PLANET.ready) return Promise.resolve(); if (!loading && window.PLANET && window.THREE) loading = PLANET.load(DATA).then(function () { return PLANET.placeLandmarks('models/', PLANET.layout.landmarks || []); }).then(function () { buildFlow(); }); return loading || Promise.resolve(); };
  // ---------------------------------------------------------------- flow fields round the cliffs
  var FG = 128, FL = null, FW = null;
  var buildFlow = function () {
    var cs = 9600 / FG; FW = new Uint8Array(FG * FG);
    for (var j = 0; j < FG; j++) for (var i = 0; i < FG; i++) { var ok = 0; for (var q = 0; q < 4; q++) if (PLANET.walkable((i + (q & 1 ? .75 : .25)) * cs, (j + (q & 2 ? .75 : .25)) * cs)) ok++; FW[j * FG + i] = ok >= 3 ? 1 : 0; }
    var goals = []; try { (MAPS[ID].points || []).forEach(function (p) { goals.push([p.x, p.y]); }); goals.push([1150, 8450], [8450, 1150]); } catch (e) {}
    FL = goals.map(function (g) {
      var D = new Float32Array(FG * FG).fill(1e9), gi = Math.min(FG - 1, Math.floor(g[0] / cs)), gj = Math.min(FG - 1, Math.floor(g[1] / cs)), Qa = [gj * FG + gi]; D[Qa[0]] = 0;
      for (var h = 0; h < Qa.length; h++) { var c = Qa[h], ci = c % FG, cj = (c / FG) | 0;
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { if (!di && !dj) continue; var ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= FG || nj >= FG) continue; var n = nj * FG + ni; if (!FW[n]) continue; var nd = D[c] + (di && dj ? 1.414 : 1); if (nd < D[n]) { D[n] = nd; Qa.push(n); } } }
      return { x: g[0], y: g[1], D: D };
    });
  };
  var flowDir = function (f, x, y) {
    var cs = 9600 / FG, i = Math.floor(x / cs), j = Math.floor(y / cs), best = null, bd = 1e9; if (i < 0 || j < 0 || i >= FG || j >= FG) return null;
    for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { var ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= FG || nj >= FG) continue; var d = f.D[nj * FG + ni]; if (d < bd) { bd = d; best = [di, dj]; } }
    if (!best || (!best[0] && !best[1])) return null; var l = Math.hypot(best[0], best[1]); return [best[0] / l, best[1] / l];
  };
  // ---------------------------------------------------------------- hooks
  var hooked = false;
  var hook = function () {
    if (hooked || typeof unitH !== 'function' || typeof step !== 'function' || !window.R3 || !R3.ready) return; hooked = true;
    // heights
    var _uh = unitH; unitH = function (u) { var h = _uh(u); return on() ? h + Math.max(0, hAt(u.x, u.y)) : h; };
    var _pt = part; part = function (x, y, vx, vy, l, c, s, h) { if (on()) { var hh = h != null ? h : (G && G._h != null ? G._h : 4); if (hh < 90) h = hh + Math.max(0, hAt(x, y)); } return _pt(x, y, vx, vy, l, c, s, h); };
    ['fxRing', 'fxSphere'].forEach(function (k) { var f = R3[k]; if (typeof f !== 'function') return; R3[k] = function (x, h, z) { if (on() && h < 90) arguments[1] = h + Math.max(0, hAt(x, z)); return f.apply(this, arguments); }; });
    var _fl = R3.flash; if (typeof _fl === 'function') R3.flash = function (x, h, z) { if (on() && h < 200) arguments[1] = h + Math.max(0, hAt(x, z)); return _fl.apply(this, arguments); };
    // environment: our terrain instead of the flat ground; point markers lifted onto their plateaus
    var _rb = R3.rebuildEnv; R3.rebuildEnv = function () {
      var r = _rb.apply(this, arguments);
      try {
        if (typeof MAP !== 'undefined' && MAP.id === ID) {
          if (!(window.PLANET && PLANET.ready)) { ensureData().then(function () { try { R3.rebuildEnv(); } catch (e) {} }); return r; }
          var keep = new Set((this.pts || []).map(function (o) { return o.gp; }));
          this.envG.children.forEach(function (o) { if (!keep.has(o)) o.visible = false; });
          (this.pts || []).forEach(function (o) { o.gp.position.y = Math.max(0, hAt(o.gp.position.x, o.gp.position.z)); });
          if (PLANET.group.parent !== this.envG) this.envG.add(PLANET.group);
          // landmarks are solid: their footprints join the rock list the movement code already uses
          try { if (typeof ROCKS !== 'undefined' && !ROCKS.some(function (k) { return k._pl; })) { (PLANET.layout.landmarks || []).forEach(function (o) { if (o.m === 'p_rock_arch') { var cx = Math.cos(o.rot || 0), cy = -Math.sin(o.rot || 0); [-1, 1].forEach(function (sg) { ROCKS.push({ x: o.x + cx * o.size * .36 * sg, y: o.y + cy * o.size * .36 * sg, r: o.size * .13, pts: [1, 1, 1, 1, 1, 1, 1, 1, 1], z: 0, _pl: 1 }); }); return; } var f = o.m === 'p_drop_pod' ? .45 : o.m === 'p_rock_arch' ? .22 : o.m === 'p_crystal_cluster' ? .38 : o.m === 'p_comm_tower' ? .3 : .42; ROCKS.push({ x: o.x, y: o.y, r: Math.max(18, o.size * f), pts: [1, 1, 1, 1, 1, 1, 1, 1, 1], z: 0, _pl: 1 }); }); if (typeof buildRockGrid === 'function') buildRockGrid(); } } catch (e2) {}
          if (this.scene.fog && this.scene.fog.far) { this.scene.fog.near = Math.max(this.scene.fog.near, 2600); this.scene.fog.far = Math.max(this.scene.fog.far, 12000); }
          if (this.cam && this.cam.far < 20000) { this.cam.far = 20000; this.cam.updateProjectionMatrix(); }
        } else if (window.PLANET && PLANET.group && PLANET.group.parent) PLANET.group.parent.remove(PLANET.group);
      } catch (e) { window.__pwErr = String(e).slice(0, 160); }
      return r;
    };
    var _am = applyMap; applyMap = function (id) { if (id === ID) ensureData(); return _am.apply(this, arguments); };
    // cliffs + stuck AI
    var prev = new Map();
    var _st = step; step = function (dt) {
      var P0 = on(); if (P0) { prev.clear(); for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; if (!u.dead && u.layer === 0) prev.set(u, [u.x, u.y]); } }
      _st(dt);
      if (!P0 || !G || G.over) return;
      try {
        prev.forEach(function (p, u) {
          if (u.dead) return; if (!PLANET.walkable(u.x, u.y)) { if (PLANET.walkable(p[0], u.y)) u.x = p[0]; else if (PLANET.walkable(u.x, p[1])) u.y = p[1]; else { u.x = p[0]; u.y = p[1]; } }
          // stuck watch for AI ground units
          if (u === (G.local && G.local.unit)) return; var w = u._pw || (u._pw = { t: 0, x: u.x, y: u.y, f: 0 }); w.t += dt;
          if (w.t > 1.6) { if (w.n && w.mv / w.n > .7 && Math.hypot(u.x - w.x, u.y - w.y) < 30) w.f = 4; w.t = 0; w.x = u.x; w.y = u.y; w.n = 0; w.mv = 0; }
          if (w.f > 0) w.f -= dt;
        });
        var lu = G.local && G.local.unit; PLANET.update(lu ? lu.x : 4800, lu ? lu.y : 4800);
      } catch (e) { window.__pwErr = String(e).slice(0, 160); }
    };
    if (typeof botInput === 'function') { var _bi = botInput; botInput = function (s, u, dt) { var inp = _bi(s, u, dt);
      try { if (on() && inp && u._pw) { u._pw.n = (u._pw.n || 0) + 1; if (Math.hypot(inp.mx || 0, inp.my || 0) > .5) u._pw.mv = (u._pw.mv || 0) + 1; }
        if (on() && inp && FL && u.layer === 0 && u._pw && u._pw.f > 0 && (inp.mx || inp.my)) {
          // the goal it is heading for = the objective most in line with what it wanted
          var best = null, bs = -2; for (var k = 0; k < FL.length; k++) { var f = FL[k], dx = f.x - u.x, dy = f.y - u.y, l = Math.hypot(dx, dy) || 1, sc = (dx * inp.mx + dy * inp.my) / l / (Math.hypot(inp.mx, inp.my) || 1); if (sc > bs) { bs = sc; best = f; } }
          var d = best && flowDir(best, u.x, u.y); if (d) { var m = Math.hypot(inp.mx, inp.my) || 1; inp.mx = d[0] * m; inp.my = d[1] * m; } } } catch (e) {}
      return inp; }; }
  };
  var iv = setInterval(function () { try { addMap(); hook(); if (hooked && typeof MAPS !== 'undefined' && MAPS[ID]) { try { if (typeof P !== 'undefined' && P.map === ID) ensureData(); } catch (e) {} } } catch (e) {} }, 400);
  window.__planetWar = { ensure: ensureData, flow: function () { return !!FL; } };
})();
