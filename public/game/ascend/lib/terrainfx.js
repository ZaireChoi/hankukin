/*
 * ASCEND Terrain Surface FX engine  (terrainfx.js)  v1.0  2026-11-21
 * three.js r150+ (tested with r160). No other dependency.
 *
 *  - SurfaceMap : which ground is where (water / snow / ice / sand / rock / grass / mud / lava)
 *                 built from the terrain colour map (auto classify) or from masks, or painted by hand.
 *  - TerrainFX  : footstep effects (splash, ripple, snow print, sand print, dust), dash / landing bursts,
 *                 movement rules (slow, slide on ice, deep water blocks ground units),
 *                 water surface with sky reflection + sun glint + shore foam,
 *                 ambient desert wind dust and snowfall.
 *
 * Performance: every effect lives in 2 pre-allocated GPU pools (particles, ground decals) + 1 additive pool.
 * No objects are created after init -> no scene/material/geometry leak. Draw calls: 3 pools + water = 4.
 *
 * Works as a classic <script> (sets globalThis.createTerrainFX) or can be imported as a module for side effect.
 * Usage:  const TFX = createTerrainFX(THREE);   // THREE = the three.js namespace the game already uses
 *         const map = TFX.SurfaceMap.fromColorMap(img, {worldW, worldH, originX, originZ});
 *         const fx  = new TFX.TerrainFX({scene, camera, map});
 *         fx.addWater({level:0.5});
 *         // every frame: for each unit -> const r = fx.step(unitId, {x, z, vx, vz, size, dash, airborne}, dt);
 *         //              apply r.speedMul / r.slide / r.blocked ;  then fx.update(dt)
 */
(function (root) {
  'use strict';

  function createTerrainFX(THREE) {
    if (!THREE) throw new Error('createTerrainFX(THREE): pass the three.js namespace');

    // ------------------------------------------------------------------ surface codes & rules
    const SURF = { NONE: 0, WATER_SHALLOW: 1, WATER_DEEP: 2, SNOW: 3, ICE: 4, SAND: 5, ROCK: 6, GRASS: 7, MUD: 8, LAVA: 9 };
    const SURF_NAME = ['none', 'water_shallow', 'water_deep', 'snow', 'ice', 'sand', 'rock', 'grass', 'mud', 'lava'];
    const SURF_KO = ['없음', '얕은 물', '깊은 물', '눈', '얼음', '모래', '바위', '풀', '진흙', '용암'];
    // speedMul: ground move speed multiplier; slide: 0..1 inertia on ice; blockGround: ground units cannot enter
    const RULES = {
      [SURF.NONE]:          { speedMul: 1.00, slide: 0.00, step: null },
      [SURF.WATER_SHALLOW]: { speedMul: 0.80, slide: 0.00, step: 'splash' },
      [SURF.WATER_DEEP]:    { speedMul: 0.00, slide: 0.00, step: 'wake', blockGround: true },
      [SURF.SNOW]:          { speedMul: 0.90, slide: 0.00, step: 'snow' },
      [SURF.ICE]:           { speedMul: 1.00, slide: 0.90, step: 'ice' },
      [SURF.SAND]:          { speedMul: 1.00, slide: 0.00, step: 'sand' },
      [SURF.ROCK]:          { speedMul: 1.00, slide: 0.00, step: 'rock' },
      [SURF.GRASS]:         { speedMul: 1.00, slide: 0.00, step: null },
      [SURF.MUD]:           { speedMul: 0.75, slide: 0.00, step: 'mud' },
      [SURF.LAVA]:          { speedMul: 0.90, slide: 0.00, step: 'lava', dps: 0.04 },
    };

    // ------------------------------------------------------------------ SurfaceMap
    class SurfaceMap {
      /** @param {{w:number,h:number,worldW:number,worldH:number,originX?:number,originZ?:number}} o */
      constructor(o) {
        this.w = o.w | 0; this.h = o.h | 0;
        this.worldW = o.worldW; this.worldH = o.worldH;
        this.originX = o.originX || 0; this.originZ = o.originZ || 0;
        this.data = new Uint8Array(this.w * this.h);        // surface code per cell
        this.water = new Uint8Array(this.w * this.h);       // 0..255 water depth-ish (for shader mask)
        this._tex = null;
      }
      _cell(x, z) {
        const u = (x - this.originX) / this.worldW, v = (z - this.originZ) / this.worldH;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) return -1;
        return ((v * this.h) | 0) * this.w + ((u * this.w) | 0);
      }
      /** surface code at world x,z */
      at(x, z) { const i = this._cell(x, z); return i < 0 ? SURF.NONE : this.data[i]; }
      name(code) { return SURF_NAME[code] || 'none'; }
      /** paint a circle by hand (for maps without colour data, or level design tweaks) */
      paintCircle(x, z, r, code) {
        const cw = this.worldW / this.w, ch = this.worldH / this.h;
        const x0 = Math.floor((x - r - this.originX) / cw), x1 = Math.ceil((x + r - this.originX) / cw);
        const z0 = Math.floor((z - r - this.originZ) / ch), z1 = Math.ceil((z + r - this.originZ) / ch);
        for (let j = Math.max(0, z0); j < Math.min(this.h, z1); j++) for (let i = Math.max(0, x0); i < Math.min(this.w, x1); i++) {
          const cx = this.originX + (i + .5) * cw, cz = this.originZ + (j + .5) * ch;
          if ((cx - x) ** 2 + (cz - z) ** 2 <= r * r) {
            const k = j * this.w + i; this.data[k] = code;
            this.water[k] = code === SURF.WATER_DEEP ? 255 : code === SURF.WATER_SHALLOW ? 120 : 0;
          }
        }
        if (this._tex) this._tex.needsUpdate = true;
      }
      /** fill a rectangle (world units) */
      paintRect(x0, z0, x1, z1, code) {
        const cw = this.worldW / this.w, ch = this.worldH / this.h;
        for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
          const cx = this.originX + (i + .5) * cw, cz = this.originZ + (j + .5) * ch;
          if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) {
            const k = j * this.w + i; this.data[k] = code;
            this.water[k] = code === SURF.WATER_DEEP ? 255 : code === SURF.WATER_SHALLOW ? 120 : 0;
          }
        }
        if (this._tex) this._tex.needsUpdate = true;
      }
      /** recompute deep vs shallow water by distance from shore (cells) */
      computeDepth(deepCells = 4) {
        const W = this.w, H = this.h, d = this.data, dist = new Int16Array(W * H).fill(32767);
        const isW = (k) => d[k] === SURF.WATER_SHALLOW || d[k] === SURF.WATER_DEEP;
        const q = [];
        for (let k = 0; k < W * H; k++) if (!isW(k)) { dist[k] = 0; q.push(k); }
        for (let qi = 0; qi < q.length; qi++) {
          const k = q[qi], x = k % W, y = (k / W) | 0, nd = dist[k] + 1;
          const nb = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1];
          for (const n of nb) if (n >= 0 && dist[n] > nd) { dist[n] = nd; q.push(n); }
        }
        for (let k = 0; k < W * H; k++) if (isW(k)) {
          d[k] = dist[k] >= deepCells ? SURF.WATER_DEEP : SURF.WATER_SHALLOW;
          this.water[k] = Math.min(255, 40 + dist[k] * (215 / Math.max(1, deepCells * 2)));
        } else this.water[k] = 0;
        if (this._tex) this._tex.needsUpdate = true;
        return this;
      }
      /** DataTexture of water mask (R) for the water shader */
      waterTexture() {
        if (!this._tex) {
          const rgba = new Uint8Array(this.w * this.h * 4);
          this._tex = new THREE.DataTexture(rgba, this.w, this.h, THREE.RGBAFormat);
          this._tex.magFilter = THREE.LinearFilter; this._tex.minFilter = THREE.LinearFilter;
          this._tex.wrapS = this._tex.wrapT = THREE.ClampToEdgeWrapping;
        }
        const a = this._tex.image.data;
        for (let k = 0; k < this.w * this.h; k++) { a[k * 4] = this.water[k]; a[k * 4 + 3] = 255; }
        this._tex.needsUpdate = true;
        return this._tex;
      }
      stats() { const c = new Array(10).fill(0); for (const v of this.data) c[v]++; const out = {}; c.forEach((n, i) => { if (n) out[SURF_NAME[i]] = +(n / this.data.length * 100).toFixed(1) + '%'; }); return out; }

      /**
       * Build from the terrain colour map (Heightmap Level Generator "Color map PNG" or any painted map).
       * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|ImageData} img
       * @param {{worldW:number,worldH:number,originX?:number,originZ?:number,res?:number,deepCells?:number,flipV?:boolean,classify?:Function,lavaFromOrange?:boolean}} o
       */
      static fromColorMap(img, o) {
        const res = o.res || 256;
        let data;
        if (typeof ImageData !== 'undefined' && img instanceof ImageData && img.width === res) data = img.data;
        else {
          const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(res, res) : Object.assign(document.createElement('canvas'), { width: res, height: res });
          const g = cv.getContext('2d', { willReadFrequently: true });
          if (img instanceof ImageData) { const t = document.createElement('canvas'); t.width = img.width; t.height = img.height; t.getContext('2d').putImageData(img, 0, 0); g.drawImage(t, 0, 0, res, res); }
          else g.drawImage(img, 0, 0, res, res);
          data = g.getImageData(0, 0, res, res).data;
        }
        const m = new SurfaceMap({ w: res, h: res, worldW: o.worldW, worldH: o.worldH, originX: o.originX, originZ: o.originZ });
        const cls = o.classify || SurfaceMap.classifyColor;
        for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
          const sj = o.flipV ? (res - 1 - j) : j;
          const p = (sj * res + i) * 4;
          m.data[j * res + i] = cls(data[p], data[p + 1], data[p + 2], o);
        }
        return m.computeDepth(o.deepCells || 4);
      }
      /** default colour -> surface classifier (tuned on the 13 ASCEND maps) */
      static classifyColor(r, g, b, o) {
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = mx === 0 ? 0 : (mx - mn) / mx;
        let h = 0;
        if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
        if (o && o.lavaFromOrange && h >= 8 && h <= 40 && s > .6 && mx > 200) return SURF.LAVA;
        if (b > r + 18 && b >= g - 4 && h >= 180 && h <= 250 && s > .2 && l < 205) return SURF.WATER_SHALLOW;
        if (l > 205 && s < .12) return SURF.SNOW;
        if (l > 175 && s < .28 && b >= r && b > 200) return SURF.ICE;
        if (h >= 20 && h <= 50 && s > .22 && l > 90) return SURF.SAND;
        if (h >= 55 && h <= 170 && s > .15) return SURF.GRASS;
        if (h >= 15 && h <= 40 && s > .3 && l <= 90) return SURF.MUD;
        return SURF.ROCK;
      }
    }

    // ------------------------------------------------------------------ GPU particle pool (camera-facing quads)
    const PART_VS = `
      attribute vec3 aP0; attribute vec3 aV; attribute float aT0; attribute float aLife;
      attribute vec2 aSize; attribute vec4 aCol; attribute float aGrav; attribute float aShape; attribute float aDrag;
      uniform float uTime; varying vec2 vUv; varying vec4 vCol; varying float vK; varying float vShape;
      void main(){
        float t = uTime - aT0; vUv = uv; vCol = aCol; vShape = aShape;
        if (t < 0.0 || t > aLife) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vK = 1.0; return; }
        float k = t / aLife; vK = k;
        float dt = aDrag > 0.0 ? (1.0 - exp(-aDrag * t)) / aDrag : t;
        vec3 p = aP0 + aV * dt + vec3(0.0, -0.5 * aGrav * t * t, 0.0);
        p.y = max(p.y, aP0.y * 0.0 + 0.2);
        float s = mix(aSize.x, aSize.y, k);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 wp = p + (right * position.x + up * position.y) * s;
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`;
    const PART_FS = `
      varying vec2 vUv; varying vec4 vCol; varying float vK; varying float vShape;
      void main(){
        vec2 q = vUv - 0.5; float r = length(q) * 2.0;
        float a;
        if (vShape < 0.5)      a = smoothstep(1.0, 0.0, r);                    // soft puff
        else if (vShape < 1.5) a = smoothstep(1.0, 0.55, r);                   // droplet / grain
        else                   a = smoothstep(1.0, 0.0, r) * smoothstep(0.0, 0.25, 1.0 - r) + smoothstep(0.35, 0.0, r); // sparkle
        float fade = smoothstep(0.0, 0.03, vK) * (1.0 - smoothstep(0.55, 1.0, vK));
        float al = a * vCol.a * fade;
        if (al < 0.01) discard;
        gl_FragColor = vec4(vCol.rgb, al);
      }`;

    class ParticlePool {
      constructor(max, additive) {
        this.max = max; this.i = 0;
        const g = new THREE.InstancedBufferGeometry();
        const base = new THREE.PlaneGeometry(1, 1);
        g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
        const mk = (n, sz) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * sz), sz); a.setUsage(THREE.DynamicDrawUsage); return a; };
        this.a = { aP0: mk(max, 3), aV: mk(max, 3), aT0: mk(max, 1), aLife: mk(max, 1), aSize: mk(max, 2), aCol: mk(max, 4), aGrav: mk(max, 1), aShape: mk(max, 1), aDrag: mk(max, 1) };
        for (const k in this.a) g.setAttribute(k, this.a[k]);
        this.a.aLife.array.fill(0); this.a.aT0.array.fill(-1e6);
        g.instanceCount = max;
        this.mat = new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 } }, vertexShader: PART_VS, fragmentShader: PART_FS,
          transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 12 : 11;
        this.mesh.userData.keep = 1; this.mesh.userData.terrainfx = 1;
        this.dirty = false; this.geo = g; this.base = base; this.k = 1;
      }
      /** spawn one particle. p:{x,y,z}  v:{x,y,z} */
      spawn(time, p, v, life, s0, s1, col, alpha, grav, shape, drag) {
        const i = this.i; this.i = (this.i + 1) % this.max; const A = this.a;
        A.aP0.array.set([p.x, p.y, p.z], i * 3); A.aV.array.set([v.x, v.y, v.z], i * 3);
        A.aT0.array[i] = time; A.aLife.array[i] = life; A.aSize.array.set([s0 * this.k, s1 * this.k], i * 2);
        A.aCol.array.set([col.r, col.g, col.b, alpha], i * 4); A.aGrav.array[i] = grav || 0; A.aShape.array[i] = shape || 0; A.aDrag.array[i] = drag || 0;
        this.dirty = true;
      }
      flush(time) { this.mat.uniforms.uTime.value = time; if (this.dirty) { for (const k in this.a) this.a[k].needsUpdate = true; this.dirty = false; } }
      dispose() { this.geo.dispose(); this.base.dispose(); this.mat.dispose(); }
    }

    // ------------------------------------------------------------------ ground decal pool (flat quads: ring / prints / streak)
    const DEC_VS = `
      attribute vec3 aP; attribute float aRot; attribute float aT0; attribute float aLife; attribute vec2 aSize; attribute vec4 aCol; attribute float aShape; attribute float aAsp;
      uniform float uTime; varying vec2 vUv; varying vec4 vCol; varying float vK; varying float vShape;
      void main(){
        float t = uTime - aT0; vUv = uv; vCol = aCol; vShape = aShape;
        if (t < 0.0 || t > aLife) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vK = 1.0; return; }
        float k = t / aLife; vK = k;
        float s = mix(aSize.x, aSize.y, k);
        vec2 xy = position.xy * vec2(s * aAsp, s);
        float c = cos(aRot), sn = sin(aRot);
        vec2 r = vec2(xy.x * c - xy.y * sn, xy.x * sn + xy.y * c);
        vec3 wp = aP + vec3(r.x, 0.0, r.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`;
    const DEC_FS = `
      varying vec2 vUv; varying vec4 vCol; varying float vK; varying float vShape;
      void main(){
        vec2 q = (vUv - 0.5) * 2.0; float r = length(q); float a = 0.0;
        if (vShape < 0.5) {                       // ripple ring (thins as it grows)
          float w = mix(0.22, 0.06, vK); a = smoothstep(w, 0.0, abs(r - 0.8)) ;
        } else if (vShape < 1.5) {                // mech footprint: pad + 3 toes
          float pad = smoothstep(0.62, 0.5, length(q * vec2(1.0, 0.75) + vec2(0.0, 0.15)));
          float t1 = smoothstep(0.2, 0.12, length(q - vec2(-0.38, -0.62)));
          float t2 = smoothstep(0.2, 0.12, length(q - vec2(0.0, -0.75)));
          float t3 = smoothstep(0.2, 0.12, length(q - vec2(0.38, -0.62)));
          a = max(pad, max(t1, max(t2, t3)));
        } else if (vShape < 2.5) {                // soft round print / splat
          a = smoothstep(1.0, 0.35, r);
        } else {                                  // drag streak (stretched by aspect)
          a = smoothstep(1.0, 0.2, r) * 0.8;
        }
        float fade = 1.0 - smoothstep(0.5, 1.0, vK);
        float al = a * vCol.a * fade;
        if (al < 0.01) discard;
        gl_FragColor = vec4(vCol.rgb, al);
      }`;

    class DecalPool {
      constructor(max) {
        this.max = max; this.i = 0;
        const g = new THREE.InstancedBufferGeometry();
        const base = new THREE.PlaneGeometry(1, 1);
        g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.uv = base.attributes.uv;
        const mk = (n, sz) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * sz), sz); a.setUsage(THREE.DynamicDrawUsage); return a; };
        this.a = { aP: mk(max, 3), aRot: mk(max, 1), aT0: mk(max, 1), aLife: mk(max, 1), aSize: mk(max, 2), aCol: mk(max, 4), aShape: mk(max, 1), aAsp: mk(max, 1) };
        for (const k in this.a) g.setAttribute(k, this.a[k]);
        this.a.aT0.array.fill(-1e6); this.a.aAsp.array.fill(1);
        g.instanceCount = max;
        this.mat = new THREE.ShaderMaterial({
          uniforms: { uTime: { value: 0 } }, vertexShader: DEC_VS, fragmentShader: DEC_FS,
          transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        });
        this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 10;
        this.mesh.userData.keep = 1; this.mesh.userData.terrainfx = 1;
        this.dirty = false; this.geo = g; this.base = base;
      }
      spawn(time, x, y, z, rot, life, s0, s1, col, alpha, shape, aspect) {
        const i = this.i; this.i = (this.i + 1) % this.max; const A = this.a;
        A.aP.array.set([x, y, z], i * 3); A.aRot.array[i] = rot; A.aT0.array[i] = time; A.aLife.array[i] = life;
        A.aSize.array.set([s0, s1], i * 2); A.aCol.array.set([col.r, col.g, col.b, alpha], i * 4); A.aShape.array[i] = shape; A.aAsp.array[i] = aspect || 1;
        this.dirty = true;
      }
      flush(time) { this.mat.uniforms.uTime.value = time; if (this.dirty) { for (const k in this.a) this.a[k].needsUpdate = true; this.dirty = false; } }
      dispose() { this.geo.dispose(); this.base.dispose(); this.mat.dispose(); }
    }

    // ------------------------------------------------------------------ water surface (sky reflection + glint + shore foam)
    const WATER_VS = `
      varying vec3 vWp; varying vec2 vMuv; uniform vec4 uBounds;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz;
        vMuv = vec2((wp.x - uBounds.x) / uBounds.z, (wp.z - uBounds.y) / uBounds.w);
        gl_Position = projectionMatrix * viewMatrix * wp; }`;
    const WATER_FS = `
      uniform float uTime; uniform sampler2D uMask; uniform vec3 uShallow; uniform vec3 uDeep;
      uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uReflect;
      uniform float uOpacity; uniform float uWaveScale; uniform samplerCube uEnv; uniform float uUseEnv; uniform float uFoam; uniform float uMinReflect; uniform float uClouds;
      varying vec3 vWp; varying vec2 vMuv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      float h(vec2 p){ float t = uTime;
        return noise(p * 0.035 + vec2(t*0.05, t*0.03)) * 0.6 + noise(p * 0.09 - vec2(t*0.08, -t*0.06)) * 0.3 + noise(p*0.2 + t*0.1)*0.1; }
      void main(){
        float m = texture2D(uMask, vMuv).r;
        if (m < 0.03) discard;
        vec2 p = vWp.xz * uWaveScale; float e = 1.5;
        float hx = h(p + vec2(e, 0.0)) - h(p - vec2(e, 0.0)); float hz = h(p + vec2(0.0, e)) - h(p - vec2(0.0, e));
        vec3 n = normalize(vec3(-hx * 2.2, 1.0, -hz * 2.2));
        vec3 V = normalize(cameraPosition - vWp);
        vec3 R = reflect(-V, n);
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(R.y, 0.0, 1.0), 0.55));
        vec2 cuv = R.xz / max(R.y, 0.15) * 0.9 + vWp.xz * 0.0009 + vec2(uTime * 0.012, uTime * 0.006);
        float cl = smoothstep(0.45, 0.85, noise(cuv * 3.0) * 0.65 + noise(cuv * 7.0) * 0.35);
        sky = mix(sky, vec3(1.0), cl * uClouds);
        if (uUseEnv > 0.5) sky = mix(sky, textureCube(uEnv, R).rgb, 0.7);
        float F = 0.03 + 0.97 * pow(1.0 - max(dot(V, n), 0.0), 5.0);
        vec3 base = mix(uShallow, uDeep, smoothstep(0.15, 0.85, m));
        vec3 col = mix(base, sky, clamp(max(F * uReflect, uMinReflect), 0.0, 1.0));
        float spec = pow(max(dot(R, normalize(uSunDir)), 0.0), 180.0);
        col += uSunCol * spec * 1.6;
        float shore = 1.0 - smoothstep(0.06, 0.32, m);
        float foam = shore * smoothstep(0.45, 0.75, noise(vWp.xz * 0.12 + uTime * 0.4)) * uFoam;
        col = mix(col, vec3(0.95), foam);
        float a = smoothstep(0.03, 0.18, m) * uOpacity;
        gl_FragColor = vec4(col, clamp(a + F * 0.25 + foam * 0.3, 0.0, 1.0));
      }`;

    // ------------------------------------------------------------------ helpers
    const C = (hex) => new THREE.Color(hex);
    const COL = {
      water: C(0xd8f2ff), foam: C(0xffffff), ring: C(0xe8fbff), snow: C(0xf4f8ff), snowPrint: C(0x7f93a8), ice: C(0xcff4ff),
      sand: C(0xc9a06a), sandPrint: C(0x7a5a38), dust: C(0xd9c29a), rock: C(0x8a8580), mud: C(0x3e2c1e), mudPrint: C(0x2a1d12),
      lava: C(0xff7a2a), ember: C(0xffc070), wake: C(0xeefaff),
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const V3 = (x, y, z) => ({ x, y, z });

    // ------------------------------------------------------------------ TerrainFX
    class TerrainFX {
      /**
       * @param {{scene:THREE.Scene, camera?:THREE.Camera, map:SurfaceMap, groundY?:(x:number,z:number)=>number,
       *          quality?:'high'|'low', maxParticles?:number, maxDecals?:number, printLife?:number, unitScale?:number,
       *          onStep?:(surface:number, unitId:any, kind:string, intensity:number)=>void}} o
       */
      constructor(o) {
        this.scene = o.scene; this.camera = o.camera || null; this.map = o.map;
        this.groundY = o.groundY || (() => 0);
        this.quality = o.quality || 'high';
        this.printLife = o.printLife != null ? o.printLife : 1.0;          // footprints vanish within ~1 s (ASCEND rule: no lingering trails)
        this.unitScale = o.unitScale || 1;                                  // multiply effect sizes (ASCEND units are big: try 3~6)
        this.onStep = o.onStep || null;
        const mp = o.maxParticles || (this.quality === 'low' ? 600 : 1600), md = o.maxDecals || (this.quality === 'low' ? 160 : 400);
        this.parts = new ParticlePool(mp, false);
        this.glow = new ParticlePool(Math.max(120, mp >> 3), true);
        this.decals = new DecalPool(md);
        this.scene.add(this.decals.mesh, this.parts.mesh, this.glow.mesh);
        this.parts.k = 2.5; this.glow.k = 2.5;   // footstep particle size boost (ambient wind/snow divide it back)
        this.time = 0; this.units = new Map(); this.water = null;
        this.ambient = { kind: 'none', rate: 0, acc: 0, wind: V3(60, 0, 15), focus: V3(0, 0, 0), radius: 900 };
        this.enabled = true;
      }
      get spawnMul() { return this.quality === 'low' ? 0.5 : 1; }
      setQuality(q) { this.quality = q; }
      setFocus(x, z, radius) { this.ambient.focus.x = x; this.ambient.focus.z = z; if (radius) this.ambient.radius = radius; }

      /** sky colours for the water reflection; pass an envMap (CubeTexture) to reflect the real skybox */
      setSky({ zenith, horizon, sunDir, sunColor, envMap } = {}) {
        if (!this.water) return;
        const u = this.water.material.uniforms;
        if (zenith != null) u.uZenith.value.set(zenith);
        if (horizon != null) u.uHorizon.value.set(horizon);
        if (sunDir) u.uSunDir.value.set(sunDir.x, sunDir.y, sunDir.z).normalize();
        if (sunColor != null) u.uSunCol.value.set(sunColor);
        if (envMap) { u.uEnv.value = envMap; u.uUseEnv.value = 1; }
      }

      /** create the water surface over the whole map, masked to water cells of the SurfaceMap */
      addWater(o = {}) {
        const m = this.map, segs = this.quality === 'low' ? 1 : 1;
        const geo = new THREE.PlaneGeometry(m.worldW, m.worldH, segs, segs); geo.rotateX(-Math.PI / 2);
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 }, uMask: { value: m.waterTexture() },
            uBounds: { value: new THREE.Vector4(m.originX, m.originZ, m.worldW, m.worldH) },
            uShallow: { value: new THREE.Color(o.shallow != null ? o.shallow : 0x4fb8c4) }, uDeep: { value: new THREE.Color(o.deep != null ? o.deep : 0x1d5a7e) },
            uZenith: { value: new THREE.Color(o.zenith != null ? o.zenith : 0x5b8fd6) }, uHorizon: { value: new THREE.Color(o.horizon != null ? o.horizon : 0xd9e8f5) },
            uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() }, uSunCol: { value: new THREE.Color(o.sunColor != null ? o.sunColor : 0xfff2d8) },
            uReflect: { value: o.reflect != null ? o.reflect : 0.85 }, uOpacity: { value: o.opacity != null ? o.opacity : 0.88 },
            uWaveScale: { value: o.waveScale != null ? o.waveScale : 1.0 }, uEnv: { value: null }, uUseEnv: { value: 0 }, uFoam: { value: o.foam != null ? o.foam : 1 },
            uMinReflect: { value: o.minReflect != null ? o.minReflect : 0.38 }, uClouds: { value: o.clouds != null ? o.clouds : 0.55 },
          },
          vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(m.originX + m.worldW / 2, o.level != null ? o.level : 0.6, m.originZ + m.worldH / 2);
        mesh.renderOrder = 9; mesh.userData.keep = 1; mesh.userData.terrainfx = 1;
        this.scene.add(mesh); this.water = mesh;
        return mesh;
      }

      /** ambient: 'desertWind' (low dust streaming with the wind) | 'snowfall' | 'none' */
      setAmbient(kind, o = {}) {
        this.ambient.kind = kind; this.ambient.rate = o.rate != null ? o.rate : (kind === 'desertWind' ? 40 : kind === 'snowfall' ? 60 : 0);
        if (o.wind) this.ambient.wind = V3(o.wind.x, 0, o.wind.z);
      }

      /**
       * Call every frame for each moving unit (ground or hovering/flying low).
       * @param {*} id  unit id (any key)
       * @param {{x:number,z:number,vx?:number,vz?:number,size?:number,dash?:boolean,airborne?:boolean,hover?:boolean}} u
       * @returns {{surface:number, name:string, speedMul:number, slide:number, blocked:boolean, dps:number}}
       */
      step(id, u, dt) {
        const surf = this.map.at(u.x, u.z), rule = RULES[surf] || RULES[0];
        let st = this.units.get(id);
        if (!st) { st = { dist: 0, foot: 0, wasAir: !!u.airborne, wakeT: 0, lastX: u.x, lastZ: u.z, dashT: 0 }; this.units.set(id, st); }
        const dx = u.x - st.lastX, dz = u.z - st.lastZ; const moved = Math.hypot(dx, dz); st.lastX = u.x; st.lastZ = u.z;
        const size = (u.size || 10) * this.unitScale * 2.2;
        const res = { surface: surf, name: SURF_NAME[surf], nameKo: SURF_KO[surf], speedMul: u.airborne || u.hover ? 1 : rule.speedMul, slide: u.airborne || u.hover ? 0 : rule.slide, blocked: !u.airborne && !u.hover && !!rule.blockGround, dps: rule.dps || 0 };
        if (!this.enabled) return res;
        const y = this.groundY(u.x, u.z);
        // landing burst
        if (st.wasAir && !u.airborne) this._burst(surf, u.x, y, u.z, size, 1.4, id);
        st.wasAir = !!u.airborne;
        if (u.airborne) return res;
        // water under a hovering / flying-low unit: continuous spray wake
        if ((u.hover || surf === SURF.WATER_DEEP) && (surf === SURF.WATER_DEEP || surf === SURF.WATER_SHALLOW)) {
          st.wakeT -= dt;
          if (st.wakeT <= 0 && moved > 0.01) { st.wakeT = 0.07; this._wake(u.x, y, u.z, Math.atan2(u.vz || dz, u.vx || dx), size, Math.min(1.5, moved / Math.max(dt, 1e-3) / 300)); }
          if (u.hover) return res;
        }
        // dash burst (once per dash start)
        if (u.dash) { if (st.dashT <= 0) { this._burst(surf, u.x, y, u.z, size, 1.0, id, true); st.dashT = 0.35; } }
        st.dashT -= dt;
        // footsteps by distance
        st.dist += moved;
        const stride = size * 0.9;
        if (st.dist >= stride) {
          st.dist = 0; st.foot ^= 1;
          const ang = Math.atan2(u.vz != null ? u.vz : dz, u.vx != null ? u.vx : dx);
          const side = (st.foot ? 1 : -1) * size * 0.28;
          const fx = u.x + Math.cos(ang + Math.PI / 2) * side, fz = u.z + Math.sin(ang + Math.PI / 2) * side;
          this._footstep(rule.step, surf, fx, y, fz, ang, size, id, !!u.dash);
        }
        return res;
      }

      /** manual effect: 'splash' | 'snowBurst' | 'dustCloud' | 'ripple' | 'emberBurst' at x,z */
      burst(kind, x, z, size = 10, strength = 1) {
        const y = this.groundY(x, z); const s = size * this.unitScale * 2.2;
        const surf = { splash: SURF.WATER_SHALLOW, ripple: SURF.WATER_SHALLOW, snowBurst: SURF.SNOW, dustCloud: SURF.SAND, emberBurst: SURF.LAVA }[kind] || this.map.at(x, z);
        this._burst(surf, x, y, z, s, strength, null, true);
      }

      _emit(kind, surf, id, k) { if (this.onStep) try { this.onStep(surf, id, kind, k); } catch (e) { } }

      _footstep(kind, surf, x, y, z, ang, s, id, dash) {
        const t = this.time, P = this.parts, D = this.decals, M = this.spawnMul, life = this.printLife;
        const n = (a) => Math.max(1, Math.round(a * M));
        switch (kind) {
          case 'splash':
            D.spawn(t, x, y + 0.3, z, 0, 0.75, s * 0.25, s * 1.1, COL.ring, 0.75, 0);
            for (let i = 0; i < n(12); i++) { const a = rnd(0, 6.28), v = rnd(0.6, 1.4) * s * 1.2; P.spawn(t, V3(x, y + 0.5, z), V3(Math.cos(a) * v * .45, v * 3.0, Math.sin(a) * v * .45), rnd(.45, .7), s * .1, s * .06, COL.water, .95, s * 6, 1); }
            P.spawn(t, V3(x, y + s * .1, z), V3(0, s * .3, 0), .55, s * .3, s * .7, COL.foam, .55, 0, 0);
            break;
          case 'snow':
            D.spawn(t, x, y + 0.2, z, ang + Math.PI / 2, life, s * .42, s * .42, COL.snowPrint, .55, 1, .8);
            for (let i = 0; i < n(8); i++) { const a = rnd(0, 6.28), v = rnd(.3, .9) * s; P.spawn(t, V3(x, y + .4, z), V3(Math.cos(a) * v * .6, v * 1.4, Math.sin(a) * v * .6), rnd(.5, .8), s * .12, s * .26, COL.snow, .9, s * 3, 0, 2); }
            break;
          case 'ice':
            if (Math.random() < .6) this.glow.spawn(t, V3(x + rnd(-s * .2, s * .2), y + s * .05, z + rnd(-s * .2, s * .2)), V3(0, s * .1, 0), .35, s * .12, s * .02, COL.ice, .9, 0, 2);
            if (dash) D.spawn(t, x, y + .2, z, ang + Math.PI / 2, .7, s * .5, s * .5, COL.ice, .35, 3, 3.5);
            break;
          case 'sand':
            D.spawn(t, x, y + 0.2, z, ang + Math.PI / 2, life, s * .4, s * .4, COL.sandPrint, .45, 1, .8);
            for (let i = 0; i < n(5); i++) { const a = rnd(0, 6.28), v = rnd(.2, .6) * s; P.spawn(t, V3(x, y + .5, z), V3(Math.cos(a) * v, v * .6, Math.sin(a) * v), rnd(.7, 1.0), s * .15, s * .5, COL.dust, .55, s * .4, 0, 1.5); }
            break;
          case 'mud':
            D.spawn(t, x, y + .2, z, ang + Math.PI / 2, life, s * .45, s * .45, COL.mudPrint, .6, 1, .85);
            for (let i = 0; i < n(4); i++) { const a = rnd(0, 6.28), v = rnd(.4, .9) * s; P.spawn(t, V3(x, y + .5, z), V3(Math.cos(a) * v * .4, v, Math.sin(a) * v * .4), rnd(.3, .5), s * .08, s * .05, COL.mud, .9, s * 8, 1); }
            break;
          case 'rock':
            if (Math.random() < .5) P.spawn(t, V3(x, y + .5, z), V3(rnd(-s, s) * .2, s * .25, rnd(-s, s) * .2), .5, s * .1, s * .25, COL.rock, .3, 0, 0, 1.5);
            break;
          case 'lava':
            for (let i = 0; i < n(3); i++) this.glow.spawn(t, V3(x, y + .5, z), V3(rnd(-s, s) * .3, rnd(.6, 1.2) * s, rnd(-s, s) * .3), rnd(.4, .7), s * .08, s * .02, COL.ember, .9, s * 3, 1);
            break;
        }
        this._emit('step', surf, id, dash ? 1 : .5);
      }

      _wake(x, y, z, ang, s, k) {
        const t = this.time, P = this.parts, M = this.spawnMul;
        this.decals.spawn(t, x, y + .35, z, 0, .6, s * .3, s * 1.0, COL.ring, .5, 0);
        const back = ang + Math.PI;
        for (let i = 0; i < Math.max(1, Math.round(4 * M)); i++) {
          const a = back + rnd(-.7, .7), v = rnd(.5, 1.2) * s * (0.6 + k);
          P.spawn(t, V3(x, y + .6, z), V3(Math.cos(a) * v, rnd(.5, 1.2) * s, Math.sin(a) * v), rnd(.35, .6), s * .08, s * .05, COL.wake, .85, s * 7, 1);
        }
      }

      _burst(surf, x, y, z, s, k, id, dash) {
        const t = this.time, P = this.parts, D = this.decals, M = this.spawnMul;
        const n = (a) => Math.max(1, Math.round(a * M * k));
        if (surf === SURF.WATER_SHALLOW || surf === SURF.WATER_DEEP) {
          D.spawn(t, x, y + .3, z, 0, .9, s * .4, s * 2.2, COL.ring, .8, 0);
          D.spawn(t + .12, x, y + .3, z, 0, .8, s * .3, s * 1.5, COL.ring, .6, 0);
          for (let i = 0; i < n(24); i++) { const a = rnd(0, 6.28), v = rnd(.6, 1.6) * s; P.spawn(t, V3(x, y + .5, z), V3(Math.cos(a) * v * .55, v * 3.2, Math.sin(a) * v * .55), rnd(.55, .85), s * .12, s * .07, COL.water, .95, s * 6, 1); }
        } else if (surf === SURF.SNOW || surf === SURF.ICE) {
          for (let i = 0; i < n(14); i++) { const a = rnd(0, 6.28), v = rnd(.4, 1.1) * s; P.spawn(t, V3(x, y + .5, z), V3(Math.cos(a) * v, v * .7, Math.sin(a) * v), rnd(.6, 1.0), s * .15, s * .5, COL.snow, .8, s * 1.5, 0, 2.2); }
        } else if (surf === SURF.SAND || surf === SURF.ROCK || surf === SURF.MUD || surf === SURF.GRASS || surf === SURF.NONE) {
          const col = surf === SURF.MUD ? COL.mud : surf === SURF.ROCK ? COL.rock : COL.dust;
          for (let i = 0; i < n(dash ? 14 : 10); i++) { const a = rnd(0, 6.28), v = rnd(.4, 1.2) * s; P.spawn(t, V3(x, y + .5, z), V3(Math.cos(a) * v, v * .35, Math.sin(a) * v), rnd(.8, 1.3), s * .25, s * .9, col, surf === SURF.GRASS ? .18 : .4, 0, 0, 1.8); }
        } else if (surf === SURF.LAVA) {
          for (let i = 0; i < n(12); i++) this.glow.spawn(t, V3(x, y + .5, z), V3(rnd(-s, s) * .5, rnd(.8, 1.6) * s, rnd(-s, s) * .5), rnd(.5, .9), s * .1, s * .02, COL.ember, .95, s * 3, 1);
        }
        this._emit(dash ? 'dash' : 'land', surf, id, k);
      }

      _ambient(dt) {
        const A = this.ambient; if (!A.rate || A.kind === 'none') return;
        A.acc += A.rate * dt * this.spawnMul;
        const t = this.time, P = this.parts, R = A.radius; const k0 = P.k; P.k = 1;
        while (A.acc >= 1) {
          A.acc -= 1;
          const x = A.focus.x + rnd(-R, R), z = A.focus.z + rnd(-R, R);
          if (A.kind === 'desertWind') {
            const surf = this.map.at(x, z);
            if (surf !== SURF.SAND && surf !== SURF.ROCK && surf !== SURF.NONE) continue;
            const y = this.groundY(x, z);
            const w = A.wind, sp = Math.hypot(w.x, w.z) || 1;
            P.spawn(t, V3(x, y + rnd(2, 18), z), V3(w.x * rnd(.8, 1.4), rnd(0, 4), w.z * rnd(.8, 1.4)), rnd(2.0, 3.5), rnd(18, 30), rnd(40, 80), COL.dust, rnd(.06, .14), 0, 0, 0);
            if (Math.random() < .5) P.spawn(t, V3(x, y + rnd(1, 6), z), V3(w.x * 2.2, 0, w.z * 2.2), rnd(.8, 1.4), 1.6, 1.2, COL.sand, .5, 0, 1, 0);
          } else if (A.kind === 'snowfall') {
            const y = this.groundY(x, z) + rnd(120, 260);
            P.spawn(t, V3(x, y, z), V3(A.wind.x * .3 + rnd(-6, 6), -rnd(40, 70), A.wind.z * .3 + rnd(-6, 6)), rnd(3, 5), rnd(1.6, 3), rnd(1.6, 3), COL.snow, .9, 0, 1, 0);
          }
        }
        P.k = k0;
      }

      /** call once per frame after step() calls */
      update(dt) {
        this.time += dt;
        this._ambient(dt);
        this.parts.flush(this.time); this.glow.flush(this.time); this.decals.flush(this.time);
        if (this.water) this.water.material.uniforms.uTime.value = this.time;
        // forget units not updated for a while (no growth of the map)
        if ((this._gcT = (this._gcT || 0) + dt) > 5) { this._gcT = 0; if (this.units.size > 2000) this.units.clear(); }
      }
      forget(id) { this.units.delete(id); }
      /** remove everything from the scene and free GPU memory */
      dispose() {
        this.scene.remove(this.decals.mesh, this.parts.mesh, this.glow.mesh);
        this.parts.dispose(); this.glow.dispose(); this.decals.dispose();
        if (this.water) { this.scene.remove(this.water); this.water.geometry.dispose(); this.water.material.dispose(); this.water = null; }
        if (this.map && this.map._tex) { this.map._tex.dispose(); this.map._tex = null; }
        this.units.clear();
      }
    }

    return { SURF, SURF_NAME, SURF_KO, RULES, SurfaceMap, TerrainFX, version: '1.0' };
  }

  root.createTerrainFX = createTerrainFX;
  if (typeof module !== 'undefined' && module.exports) module.exports = createTerrainFX;
})(typeof globalThis !== 'undefined' ? globalThis : this);
