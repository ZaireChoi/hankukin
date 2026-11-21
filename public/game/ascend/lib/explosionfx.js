/*!
 * ASCEND 폭발 연출 엔진 (explosionfx.js v1.0, 2026-11-21)
 * 적 기체 처치 때 "큰 상자 파편" 대신 현실감 있는 폭발 후 사라지기.
 *  - 섬광 → 불덩이 → 불꽃 튐 → 작은 진영색 파편 → 연기 → 바닥 그을음
 *  - 크기별(잡몹/지휘관·에이스/보스) 연쇄 폭발, 진영별(제국/연맹/알파/오메가) 차이
 *  - 모든 효과는 미리 만든 묶음을 돌려 씀(새 물체를 만들지 않음). 그리기 횟수 고정.
 *  - 긴 직선 없음. 시간은 게임의 update(dt)로만 흐름(히트스톱·일시정지와 맞음).
 * 필요: three.js r160 (게임이 쓰는 THREE를 넘겨줌). 다른 라이브러리 없음.
 * 사용: const XFX = createExplosionFX(THREE); const fx = new XFX.ExplosionFX({ scene }); fx.kill(pos, {...}); 매 프레임 fx.update(dt, camera);
 */
(function (root) {
  'use strict';

  function createExplosionFX(THREE) {
    // ---------- 기본(대체) 텍스처: Meshy 텍스처를 안 넘기면 이걸 씀 ----------
    function canvasTex(size, draw) {
      const c = document.createElement('canvas'); c.width = c.height = size;
      draw(c.getContext('2d'), size);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    }
    const DEF = {
      dot: () => canvasTex(64, (g, s) => { const r = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); }),
      fire: () => canvasTex(128, (g, s) => { for (let i = 0; i < 10; i++) { const x = s/2 + (Math.random()-.5)*s*.3, y = s/2 + (Math.random()-.5)*s*.3, rr = s*(.2+Math.random()*.2); const r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,240,200,.9)'); r.addColorStop(.5, 'rgba(255,140,40,.6)'); r.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); } }),
      smoke: () => canvasTex(128, (g, s) => { for (let i = 0; i < 14; i++) { const x = s/2 + (Math.random()-.5)*s*.35, y = s/2 + (Math.random()-.5)*s*.35, rr = s*(.18+Math.random()*.18); const r = g.createRadialGradient(x, y, 0, x, y, rr); r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); } }),
      scorch: () => canvasTex(128, (g, s) => { const r = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2); r.addColorStop(0, 'rgba(10,6,4,.95)'); r.addColorStop(.55, 'rgba(20,10,6,.6)'); r.addColorStop(1, 'rgba(20,10,6,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); }),
    };

    // ---------- 진영·크기 규칙 ----------
    const FACTION = {
      emp: { debris: [0x5a0f1c, 0x3a2a22, 0xb08038], spark: [0xffd27a, 0xff7a1a], smoke: [0x8a7a70, 0x4a4440], fireTint: [0xffffff, 0x8a3a1a], fireKind: 'fire' },
      fed: { debris: [0xc9d0da, 0x2a4f9a, 0x55606e], spark: [0xffd27a, 0xff7a1a], smoke: [0x8a7a70, 0x4a4440], fireTint: [0xffffff, 0x8a3a1a], fireKind: 'fire' },
      alp: { debris: [0xe6dcc8, 0xc9a85c], spark: [0xfff6d8, 0xffb04a], smoke: [0x8a7a70, 0x4a4440], fireTint: [0xffffff, 0x9a5a2a], fireKind: 'fire', lightMotes: true },
      omg: { debris: [0x101014, 0x2a2333], spark: [0xe0b8ff, 0x8a3cff], smoke: [0x5a3a7a, 0x3a3044], fireTint: [0xffffff, 0x7a3ab0], fireKind: 'omega' },
      zeta: { debris: [0x2a1e14, 0x5a3a1a], spark: [0xffe0a0, 0xff6a10], smoke: [0x6a5a40, 0x3a3020], fireTint: [0xffffff, 0x8a4a10], fireKind: 'fire' },
    };
    const TIER = {
      grunt: { chain: 0, shake: 0,    wreck: false, big: 1.0 },
      elite: { chain: 2, shake: 0.25, wreck: false, big: 1.15 },
      boss:  { chain: 3, shake: 0.55, wreck: true,  big: 1.4 },
    };
    const QUALITY = { low: 0.5, mid: 0.75, high: 1 };

    // ---------- 묶음 입자(한 텍스처 = 그리기 1회) ----------
    const VS = `
      attribute vec3 iPos; attribute float iSize; attribute float iRot; attribute vec3 iCol; attribute float iAlpha;
      varying vec2 vUv; varying vec3 vCol; varying float vA;
      void main(){
        vUv = uv; vCol = iCol; vA = iAlpha;
        float c = cos(iRot), s = sin(iRot);
        vec2 p = vec2(position.x*c - position.y*s, position.x*s + position.y*c) * iSize;
        #ifdef GROUND
          gl_Position = projectionMatrix * viewMatrix * vec4(iPos + vec3(p.x, 0.0, p.y), 1.0);
        #else
          vec4 mv = viewMatrix * vec4(iPos, 1.0); mv.xy += p; gl_Position = projectionMatrix * mv;
        #endif
      }`;
    const FS = `
      uniform sampler2D map; varying vec2 vUv; varying vec3 vCol; varying float vA;
      void main(){
        vec4 t = texture2D(map, vUv); float a = t.a * vA; if (a < 0.003) discard;
        gl_FragColor = vec4(t.rgb * vCol, a);
        #include <colorspace_fragment>
      }`;

    class Batch {
      constructor(scene, tex, max, additive, ground) {
        this.max = max; this.items = []; this.free = [];
        const base = new THREE.PlaneGeometry(1, 1);
        const g = new THREE.InstancedBufferGeometry();
        g.index = base.index; g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
        const mk = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(max * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
        this.aPos = mk(3); this.aSize = mk(1); this.aRot = mk(1); this.aCol = mk(3); this.aAlpha = mk(1);
        g.setAttribute('iPos', this.aPos); g.setAttribute('iSize', this.aSize); g.setAttribute('iRot', this.aRot); g.setAttribute('iCol', this.aCol); g.setAttribute('iAlpha', this.aAlpha);
        g.instanceCount = 0;
        const m = new THREE.ShaderMaterial({ uniforms: { map: { value: tex } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
          blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, defines: ground ? { GROUND: 1 } : {}, toneMapped: false });
        if (ground) m.polygonOffset = true, m.polygonOffsetFactor = -2;
        this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = ground ? 1 : (additive ? 3 : 2);
        this.mesh.name = 'explosionfx_batch'; scene.add(this.mesh);
        for (let i = 0; i < max; i++) this.items.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), c0: new THREE.Color(), c1: new THREE.Color(), col: new THREE.Color() });
      }
      spawn(o) {
        let p = null; for (const it of this.items) if (!it.alive) { p = it; break; }
        if (!p) return null;                     // 묶음이 가득 차면 조용히 건너뜀(성능 우선)
        p.alive = true; p.t = 0; p.delay = o.delay || 0; p.life = o.life; p.pos.copy(o.pos); p.vel.copy(o.vel || ZERO);
        p.g = o.g || 0; p.drag = o.drag || 0; p.s0 = o.s0; p.s1 = o.s1; p.a0 = o.a0 ?? 1; p.rot = o.rot || 0; p.spin = o.spin || 0;
        p.c0.setHex(o.c0); p.c1.setHex(o.c1 ?? o.c0); p.hold = o.hold || 0; // hold: 끝 무렵까지 진하게 유지되는 비율(그을음)
        return p;
      }
      update(dt) {
        let n = 0;
        for (const p of this.items) {
          if (!p.alive) continue;
          if (p.delay > 0) { p.delay -= dt; if (p.delay > 0) continue; }
          p.t += dt; const k = p.t / p.life;
          if (k >= 1) { p.alive = false; continue; }
          p.vel.y += p.g * dt; p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt)); p.pos.addScaledVector(p.vel, dt); p.rot += p.spin * dt;
          const size = p.s0 + (p.s1 - p.s0) * (1 - (1 - k) * (1 - k));
          const a = p.hold ? (k < p.hold ? p.a0 : p.a0 * (1 - (k - p.hold) / (1 - p.hold))) : p.a0 * (k < .1 ? k / .1 : 1 - Math.pow((k - .1) / .9, 1.4));
          p.col.copy(p.c0).lerp(p.c1, k);
          this.aPos.setXYZ(n, p.pos.x, p.pos.y, p.pos.z); this.aSize.setX(n, size); this.aRot.setX(n, p.rot);
          this.aCol.setXYZ(n, p.col.r, p.col.g, p.col.b); this.aAlpha.setX(n, a); n++;
        }
        this.mesh.geometry.instanceCount = n;
        if (n) { this.aPos.needsUpdate = this.aSize.needsUpdate = this.aRot.needsUpdate = this.aCol.needsUpdate = this.aAlpha.needsUpdate = true; }
        return n;
      }
      clear() { for (const p of this.items) p.alive = false; this.mesh.geometry.instanceCount = 0; }
      dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
    }
    const ZERO = new THREE.Vector3();

    // ---------- 파편(모양 하나당 그리기 1회, 진영 색은 instanceColor) ----------
    function defaultDebrisGeos() {
      const plate = new THREE.BoxGeometry(1, .35, .7);                       // 장갑판
      const wedge = new THREE.CylinderGeometry(0, .6, 1, 3); wedge.rotateZ(Math.PI / 2); // 쐐기 조각
      const rod = new THREE.CylinderGeometry(.18, .18, 1.2, 6);              // 피스톤·지지대
      const gear = new THREE.CylinderGeometry(.55, .55, .22, 10);            // 톱니
      return [plate, wedge, rod, gear];
    }
    class DebrisPool {
      constructor(scene, geos, maxPer, mat) {
        this.scene = scene; this.groups = []; this.mat = mat || new THREE.MeshStandardMaterial({ metalness: .6, roughness: .5 });
        this.setGeometries(geos, maxPer);
      }
      setGeometries(geos, maxPer) {
        for (const g of this.groups) this.scene.remove(g.mesh);
        this.groups = geos.map((geo) => {
          const mesh = new THREE.InstancedMesh(geo, this.mat, maxPer); mesh.count = 0; mesh.frustumCulled = false; mesh.name = 'explosionfx_debris';
          mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxPer * 3), 3);
          this.scene.add(mesh);
          const items = []; for (let i = 0; i < maxPer; i++) items.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3(), scl: new THREE.Vector3(), color: new THREE.Color() });
          return { mesh, items };
        });
      }
      spawn(o, gi) {
        const grp = this.groups[gi % this.groups.length]; let d = null; for (const it of grp.items) if (!it.alive) { d = it; break; }
        if (!d) return; Object.assign(d, { alive: true, t: 0, delay: o.delay || 0, life: o.life, bounced: false, ground: o.ground });
        d.pos.copy(o.pos); d.vel.copy(o.vel); d.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); d.spin.copy(o.spin); d.scl.copy(o.scl); d.color.setHex(o.color); d.g = o.g;
      }
      update(dt) {
        let total = 0;
        for (const grp of this.groups) {
          let n = 0;
          for (const d of grp.items) {
            if (!d.alive) continue;
            if (d.delay > 0) { d.delay -= dt; if (d.delay > 0) continue; }
            d.t += dt; const k = d.t / d.life; if (k >= 1) { d.alive = false; continue; }
            d.vel.y -= d.g * dt; d.pos.addScaledVector(d.vel, dt);
            d.rot.x += d.spin.x * dt; d.rot.y += d.spin.y * dt; d.rot.z += d.spin.z * dt;
            const half = d.scl.y * .5;
            if (d.pos.y < d.ground + half) { d.pos.y = d.ground + half; if (!d.bounced) { d.vel.y *= -.3; d.vel.x *= .4; d.vel.z *= .4; d.spin.multiplyScalar(.3); d.bounced = true; } else { d.vel.set(0, 0, 0); d.spin.set(0, 0, 0); } }
            const shrink = k > .7 ? 1 - (k - .7) / .3 : 1;
            M4.compose(d.pos, Q.setFromEuler(d.rot), V.copy(d.scl).multiplyScalar(Math.max(.01, shrink)));
            grp.mesh.setMatrixAt(n, M4); grp.mesh.setColorAt(n, d.color); n++;
          }
          grp.mesh.count = n; if (n) { grp.mesh.instanceMatrix.needsUpdate = true; grp.mesh.instanceColor.needsUpdate = true; }
          total += n;
        }
        return total;
      }
      clear() { for (const g of this.groups) { for (const d of g.items) d.alive = false; g.mesh.count = 0; } }
      dispose() { for (const g of this.groups) { this.scene.remove(g.mesh); g.mesh.dispose(); } }
    }
    const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3();

    // ---------- 엔진 본체 ----------
    class ExplosionFX {
      /**
       * @param {object} o
       *  scene (필수), textures {fire, fire2, smoke, omega, spark, scorch} (THREE.Texture, 없으면 기본 텍스처)
       *  quality 'low'|'mid'|'high' (기본 'high'), maxConcurrent 동시 큰 폭발 상한(기본 8)
       *  light true면 점광원 1개를 미리 넣어 재사용(기본 true, 조명 수는 변하지 않음)
       *  onHitstop(sec), onShake(amp, at) 게임 쪽 연결용 콜백
       */
      constructor(o) {
        this.scene = o.scene; this.quality = QUALITY[o.quality] ? o.quality : 'high'; this.maxConcurrent = o.maxConcurrent || 8;
        this.onHitstop = o.onHitstop || null; this.onShake = o.onShake || null;
        const tx = Object.assign({}, o.textures || {});
        tx.spark = tx.spark || DEF.dot(); tx.fire = tx.fire || DEF.fire(); tx.fire2 = tx.fire2 || tx.fire; tx.smoke = tx.smoke || DEF.smoke(); tx.omega = tx.omega || tx.fire; tx.scorch = tx.scorch || DEF.scorch();
        this.tex = tx;
        this.b = {
          spark: new Batch(this.scene, tx.spark, 600, true, false),
          fire: new Batch(this.scene, tx.fire, 160, true, false),
          fire2: new Batch(this.scene, tx.fire2, 160, true, false),
          omega: new Batch(this.scene, tx.omega, 160, true, false),
          smoke: new Batch(this.scene, tx.smoke, 200, false, false),
          scorch: new Batch(this.scene, tx.scorch, 48, false, true),
        };
        this.debris = new DebrisPool(this.scene, defaultDebrisGeos(), 96, o.debrisMaterial);
        this.light = null;
        if (o.light !== false) { this.light = new THREE.PointLight(0xffa860, 0, 1, 1.6); this.light.name = 'explosionfx_light'; this.scene.add(this.light); this.lightT = 1; this.lightPeak = 0; this.lightLife = .3; }
        this.queue = []; this.time = 0; this.recent = []; this.wrecks = []; this.wreckSrc = null;
      }

      /** Meshy 파편 세트를 조각별로 나눈 지오메트리 배열을 넣으면 기본 모양 대신 사용(조각당 300~500면 권장) */
      setDebrisGeometries(geos, material) { if (material) this.debris.mat = material; this.debris.setGeometries(geos, 96); }
      /** 보스 잔해 모델(예: Meshy 「쓰러진 거인」). 높이 1 기준으로 맞춰서 넘기면 보스 크기에 맞게 키움 */
      setWreckModel(obj3d) { this.wreckSrc = obj3d; }
      setQuality(q) { if (QUALITY[q]) this.quality = q; }

      /**
       * 적 처치 폭발
       * @param {THREE.Vector3|{x,y,z}} pos 기체 발밑 위치(월드 좌표)
       * @param {object} o tier 'grunt'|'elite'|'boss', faction 'emp'|'fed'|'alp'|'omg'|'zeta', size 기체 높이(월드 단위), groundY 바닥 높이(기본 pos.y)
       * @returns {number} 기체를 숨겨야 하는 시각(초 뒤). 게임은 이 시간 뒤 기체 모델을 숨기면 됨.
       */
      kill(pos, o = {}) {
        const tier = TIER[o.tier] || TIER.grunt, F = FACTION[o.faction] || FACTION.emp, S = o.size || 1;
        const base = new THREE.Vector3(pos.x, pos.y, pos.z), groundY = o.groundY ?? pos.y;
        // 동시 폭발이 많으면 입자 수를 줄임
        this.recent = this.recent.filter((t) => this.time - t < 1); this.recent.push(this.time);
        const crowd = this.recent.length > this.maxConcurrent ? .5 : 1;
        const q = QUALITY[this.quality] * crowd;
        for (let i = 0; i < tier.chain; i++) {
          const p = base.clone().add(new THREE.Vector3((Math.random() - .5) * .45 * S, S * (.45 + Math.random() * .35), (Math.random() - .5) * .3 * S));
          this.at(.25 + i * .3, () => this.blast(p, .22 * S, false, F, q, groundY, S, tier));
        }
        const tBig = tier.chain ? .25 + tier.chain * .3 + .15 : 0;
        const center = base.clone(); center.y += S * .5;
        this.at(tBig, () => this.blast(center, .44 * S * tier.big, true, F, q, groundY, S, tier));
        this.at(tBig + .05, () => {
          this.b.scorch.spawn({ pos: new THREE.Vector3(base.x, groundY + .002 * S, base.z), life: 3, s0: 1.25 * S * tier.big, s1: 1.25 * S * tier.big, c0: 0xffffff, a0: .85, hold: .66, rot: Math.random() * 6.28 });
          if (tier.wreck && this.wreckSrc) this.spawnWreck(base, groundY, S);
        });
        return tBig + .05;
      }

      // 폭발 한 번
      blast(c, size, big, F, q, groundY, S, tier) {
        const n = (v) => Math.max(1, Math.round(v * q));
        // 1) 섬광 0~0.1초
        this.b.spark.spawn({ pos: c, life: .12, s0: size * 1.2, s1: size * 3.2, c0: 0xffffff, c1: 0xfff2c8, a0: 1 });
        if (this.light) { this.light.position.copy(c); this.light.position.y += .15 * S; this.light.distance = S * 9; this.lightPeak = Math.max(big ? 9 : 5, this.lightT < 1 ? this.lightPeak : 0); this.lightT = 0; }
        if (big) { this.onHitstop && this.onHitstop(.1); if (tier.shake > 0 && this.onShake) this.onShake(tier.shake, c); }
        // 2) 불덩이 0.1~0.6초
        for (let i = 0, N = n(big ? 10 : 5); i < N; i++) {
          const off = new THREE.Vector3(Math.random() - .5, Math.random() * .7, Math.random() - .5).multiplyScalar(size * .9);
          const kind = F.fireKind === 'omega' ? 'omega' : (i % 2 ? 'fire' : 'fire2');
          this.b[kind].spawn({ pos: c.clone().add(off), life: .45 + Math.random() * .2, delay: .03 + Math.random() * .08, s0: size * .6, s1: size * (1.4 + Math.random() * .5),
            vel: off.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, .42 * S, 0)), drag: 2.5, c0: F.fireTint[0], c1: F.fireTint[1], a0: 1, rot: Math.random() * 6.28, spin: (Math.random() - .5) * 1.5 });
        }
        // 불꽃 튐 20~30개(짧은 점)
        for (let i = 0, N = n(big ? 30 : 20); i < N; i++) {
          const dir = new THREE.Vector3(Math.random() - .5, Math.random() * .9 + .2, Math.random() - .5).normalize();
          this.b.spark.spawn({ pos: c, life: .35 + Math.random() * .35, vel: dir.multiplyScalar((1.9 + Math.random() * 1.9) * S), g: -3.9 * S, drag: 1.2, s0: .06 * S, s1: .017 * S, c0: F.spark[0], c1: F.spark[1] });
        }
        // 3) 작은 진영색 파편 8~12개, 1초 안에 사라짐
        for (let i = 0, N = n(big ? 12 : 8); i < N; i++) {
          const sz = size * (.08 + Math.random() * .07);
          this.debris.spawn({ pos: c, life: .9 + Math.random() * .3, ground: groundY, g: 5 * S,
            vel: new THREE.Vector3(Math.random() - .5, Math.random() * .8 + .6, Math.random() - .5).normalize().multiplyScalar((1.4 + Math.random() * 1.4) * S),
            spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12), scl: new THREE.Vector3(sz, sz * (.5 + Math.random() * .6), sz * (.4 + Math.random() * .6)),
            color: F.debris[i % F.debris.length] }, i);
        }
        // 4) 연기 0.4~2.6초 / 알파는 빛 입자로 흩어짐
        if (F.lightMotes) {
          for (let i = 0, N = n(26); i < N; i++) this.b.spark.spawn({ pos: c.clone().add(new THREE.Vector3((Math.random() - .5) * size, Math.random() * size, (Math.random() - .5) * size)), delay: .15 + Math.random() * .3, life: 1.2 + Math.random() * .6,
            vel: new THREE.Vector3((Math.random() - .5) * .4 * S, (.4 + Math.random() * .55) * S, (Math.random() - .5) * .4 * S), drag: .6, s0: .08 * S, s1: .006 * S, c0: 0xfff4d0, c1: 0xffd48a });
        }
        for (let i = 0, N = n(F.lightMotes ? 3 : (big ? 9 : 6)); i < N; i++) {
          const off = new THREE.Vector3((Math.random() - .5) * size, Math.random() * size * .5, (Math.random() - .5) * size);
          this.b.smoke.spawn({ pos: c.clone().add(off), delay: .35 + Math.random() * .25, life: 1.6 + Math.random() * .8, vel: new THREE.Vector3((Math.random() - .5) * .17 * S, (.36 + Math.random() * .22) * S, (Math.random() - .5) * .17 * S), drag: .4,
            s0: size * .9, s1: size * (2.4 + Math.random()), c0: F.smoke[0], c1: F.smoke[1], a0: .85, rot: Math.random() * 6.28, spin: (Math.random() - .5) * .4 });
        }
      }

      spawnWreck(base, groundY, S) {
        let w = this.wrecks.find((x) => !x.alive);
        if (!w) { if (this.wrecks.length >= 2) return; const obj = this.wreckSrc.clone(true); obj.name = 'explosionfx_wreck'; obj.visible = false; this.scene.add(obj); w = { obj, alive: false }; this.wrecks.push(w); }
        w.alive = true; w.t = 0; w.obj.visible = true; w.obj.position.set(base.x, groundY, base.z); w.obj.rotation.set(0, Math.random() * 6.28, .25); w.obj.scale.setScalar(S * .6); w.S = S;
      }

      /** 지연 실행(게임 시간 기준) */
      at(delay, fn) { if (delay <= 0) fn(); else this.queue.push({ t: this.time + delay, fn }); }

      /** 매 프레임 호출. dt는 게임 시간(히트스톱·일시정지 반영된 값) */
      update(dt) {
        this.time += dt;
        if (this.queue.length) { const due = this.queue.filter((e) => e.t <= this.time); this.queue = this.queue.filter((e) => e.t > this.time); for (const e of due) e.fn(); }
        let n = 0; for (const k in this.b) n += this.b[k].update(dt);
        n += this.debris.update(dt);
        if (this.light) { this.lightT += dt / this.lightLife; this.light.intensity = this.lightT < 1 ? this.lightPeak * (1 - this.lightT) * (1 - this.lightT) : 0; }
        for (const w of this.wrecks) { if (!w.alive) continue; w.t += dt; if (w.t > 2.4) w.obj.position.y -= dt * .25 * w.S; if (w.t > 3) { w.alive = false; w.obj.visible = false; } }
        this.active = n; return n;
      }

      /** 측정용: 살아 있는 입자 수, 그리기 횟수(효과가 있을 때 최대값), 장면에 넣은 물체 수 */
      stats() {
        const batches = Object.keys(this.b).length;
        return { active: this.active || 0, pending: this.queue.length, maxDrawCalls: batches + this.debris.groups.length + this.wrecks.length, sceneObjects: batches + this.debris.groups.length + (this.light ? 1 : 0) + this.wrecks.length };
      }
      clear() { this.queue = []; for (const k in this.b) this.b[k].clear(); this.debris.clear(); for (const w of this.wrecks) { w.alive = false; w.obj.visible = false; } }
      dispose() { this.clear(); for (const k in this.b) this.b[k].dispose(this.scene); this.debris.dispose(); if (this.light) this.scene.remove(this.light); for (const w of this.wrecks) this.scene.remove(w.obj); this.wrecks = []; }
    }

    return { ExplosionFX, FACTION, TIER, version: '1.0' };
  }

  root.createExplosionFX = createExplosionFX;
  if (typeof module !== 'undefined' && module.exports) module.exports = createExplosionFX;
})(typeof window !== 'undefined' ? window : globalThis);
