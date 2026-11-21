/*!
 * ASCEND 보스 뼈대·모션 엔진 (bossrig.js v1.0, 2026-11-21)
 * 뼈대가 없는 보스 모델(Meshy 고정 모델)에 뼈대를 자동으로 만들고 붙여서
 *  - 자연스러운 걷기(이족·사족·다족·머리 여럿·촉수·전차·떠다니기)
 *  - 괴수·로봇다운 공격 모션(내려찍기, 휩쓸기, 돌진, 포효, 짓밟기, 잡기, 회전, 도약 내려찍기, 방어 자세, 날개 돌풍, 숨결)
 *  - 눈 깜박임(평소 2.5~6초마다, 공격 준비 때 눈빛이 커짐)
 *  - 날개 퍼덕임 → 내리칠 때 풍압 이벤트(주변 기체를 뒤로 밀어냄)
 *  - 피격 움찔, 브레이크 경직, 쓰러짐
 * 를 만듭니다. 게임은 이벤트(예고·적중·풍압·잡기·포효·방어)를 받아 판정만 하면 됩니다.
 * 필요: three.js r160. 다른 라이브러리 없음. 긴 직선 효과 없음(예고는 바닥 원·부채꼴·고리·짧은 화살표).
 *
 * const BR = createBossRig(THREE);
 * const boss = BR.rig(gltf.scene, { archetype:'quadruped', legs:4, wings:true, tail:true, height: 3.6*3.5, eyeColor:0x7fd1ff });
 * scene.add(boss.root); boss.onEvent = (e) => {...}; 매 프레임 boss.update(dt, { target });
 */
(function (root) {
  'use strict';

  function createBossRig(THREE) {
    const V3 = THREE.Vector3;
    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const ease = (t) => t * t * (3 - 2 * t);
    const easeOut = (t) => 1 - (1 - t) * (1 - t);
    const easeIn = (t) => t * t;

    // ---------------- 크기 규칙(사용자 지시) ----------------
    const SIZE = {
      mob: 1.0,         // 일반 몹: 기체만큼
      fieldBoss: 3.5,   // 필드 보스: 기체의 3~4배
      raidBoss: 3.8,    // 보스 토벌
      weeklyBoss: 4.0,  // 주간 보스
      dungeonBoss: 3.5, // 분대 던전 보스
      cosmic: 120,      // 우주 보스: 행성급(지면 대신 몸 위에서 싸움)
    };

    // ---------------- 모델 분석 ----------------
    function collectVerts(model, maxSamples) {
      model.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
      const pts = []; const v = new V3(); const m = new THREE.Matrix4();
      let total = 0; model.traverse((o) => { if (o.isMesh) total += o.geometry.getAttribute('position').count; });
      const step = Math.max(1, Math.floor(total / maxSamples));
      model.traverse((o) => {
        if (!o.isMesh) return; m.multiplyMatrices(inv, o.matrixWorld);
        const p = o.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i += step) { v.fromBufferAttribute(p, i).applyMatrix4(m); pts.push(v.x, v.y, v.z); }
      });
      return new Float32Array(pts);
    }
    function bounds(P) {
      const mn = new V3(Infinity, Infinity, Infinity), mx = new V3(-Infinity, -Infinity, -Infinity);
      for (let i = 0; i < P.length; i += 3) { mn.x = Math.min(mn.x, P[i]); mn.y = Math.min(mn.y, P[i + 1]); mn.z = Math.min(mn.z, P[i + 2]); mx.x = Math.max(mx.x, P[i]); mx.y = Math.max(mx.y, P[i + 1]); mx.z = Math.max(mx.z, P[i + 2]); }
      return { mn, mx, size: mx.clone().sub(mn), c: mn.clone().add(mx).multiplyScalar(.5) };
    }
    function filter(P, fn) { const out = []; for (let i = 0; i < P.length; i += 3) if (fn(P[i], P[i + 1], P[i + 2])) out.push(new V3(P[i], P[i + 1], P[i + 2])); return out; }
    function mean(arr) { const s = new V3(); for (const p of arr) s.add(p); return arr.length ? s.multiplyScalar(1 / arr.length) : s; }
    function extremeMean(arr, keyFn, frac) { if (!arr.length) return null; const s = arr.slice().sort((a, b) => keyFn(b) - keyFn(a)); return mean(s.slice(0, Math.max(1, Math.floor(s.length * frac)))); }
    // k-평균(먼 점부터 시작)
    function kmeans(points, k, dims, iters) {
      if (points.length < k) return points.slice(0, k);
      const d2 = (a, b) => dims === 2 ? (a.x - b.x) ** 2 + (a.z - b.z) ** 2 : a.distanceToSquared(b);
      const cents = [points[0].clone()];
      while (cents.length < k) { let best = null, bd = -1; for (const p of points) { let md = Infinity; for (const c of cents) md = Math.min(md, d2(p, c)); if (md > bd) { bd = md; best = p; } } cents.push(best.clone()); }
      for (let it = 0; it < (iters || 12); it++) {
        const sums = cents.map(() => new V3()), cnt = cents.map(() => 0);
        for (const p of points) { let bi = 0, bd = Infinity; cents.forEach((c, i) => { const d = d2(p, c); if (d < bd) { bd = d; bi = i; } }); sums[bi].add(p); cnt[bi]++; }
        cents.forEach((c, i) => { if (cnt[i]) c.copy(sums[i].multiplyScalar(1 / cnt[i])); });
      }
      return cents;
    }

    // ---------------- 뼈대 만들기 ----------------
    class Builder {
      constructor() { this.bones = {}; this.list = []; this.root = null; }
      add(name, pos, parent, info) {
        const b = new THREE.Bone(); b.name = name; b.userData.wpos = pos.clone(); b.userData.info = info || {};
        if (parent) { const pb = this.bones[parent]; b.position.copy(pos).sub(pb.userData.wpos); pb.add(b); } else { b.position.copy(pos); this.root = b; }
        this.bones[name] = b; this.list.push(b); return b;
      }
      chain(prefix, pts, parent, info) { const names = []; pts.forEach((p, i) => { const n = prefix + i; this.add(n, p, i ? prefix + (i - 1) : parent, info); names.push(n); }); return names; }
    }
    const arc = (a, b, n, lift) => { const out = []; for (let i = 0; i < n; i++) { const t = (i + 1) / n; const p = a.clone().lerp(b, t); p.y += Math.sin(t * Math.PI) * (lift || 0); out.push(p); } return out; };

    function buildSkeleton(P, B, o) {
      const { mn, size: S, c } = B; const h = S.y, w = S.x, d = S.z, hw = w / 2;
      const Y = (f) => mn.y + h * f;
      const fwd = o.forward === '-z' ? -1 : 1;           // 모델 정면 방향
      const bd = new Builder(); const roles = { legs: [], arms: [], necks: [], wings: [], tentacles: [], tail: null, spine: [], heads: [], side: {} };
      const arche = o.archetype;
      bd.add('root', new V3(c.x, mn.y, c.z), null);

      const bottom = filter(P, (x, y) => y < mn.y + h * .12);
      const legCount = o.legs ?? ({ biped: 2, quadruped: 4, hexapod: 6, hydra: 0, sphere: 0, tank: 0, floater: 0 }[arche] || 0);

      if (arche === 'biped' || arche === 'floater') {
        const hipY = Y(arche === 'floater' ? .5 : .48), chestY = Y(.7);
        bd.add('pelvis', new V3(c.x, hipY, c.z), 'root'); bd.add('spine', new V3(c.x, Y(.6), c.z), 'pelvis'); bd.add('chest', new V3(c.x, chestY, c.z), 'spine');
        bd.add('neck', new V3(c.x, Y(.84), c.z + fwd * .03 * d), 'chest'); bd.add('head', new V3(c.x, Y(.93), c.z + fwd * .05 * d), 'neck');
        roles.spine = ['pelvis', 'spine', 'chest']; roles.heads = ['head'];
        let feet = legCount ? kmeans(bottom, legCount, 2) : [];
        if (arche === 'floater' || feet.length < 2) feet = [new V3(c.x - w * .12, mn.y, c.z), new V3(c.x + w * .12, mn.y, c.z)];
        feet.sort((a, b) => a.x - b.x);
        feet.forEach((f, i) => {
          const s = f.x < c.x ? -1 : 1, nm = 'leg' + i;
          const hip = new V3(c.x + s * Math.max(w * .08, Math.abs(f.x - c.x) * .6), hipY - h * .02, c.z);
          bd.chain(nm + '_', [hip, new V3(f.x, Y(.27), c.z + fwd * .04 * d), new V3(f.x, Y(.05), f.z)], 'pelvis', { side: s });
          roles.legs.push({ bones: [nm + '_0', nm + '_1', nm + '_2'], side: s, front: true, phase: i % 2 ? Math.PI : 0 });
        });
        for (const s of [-1, 1]) {
          // 어깨 추정 → 어깨에서 가장 멀고 낮은 곳을 손으로(팔이 내려오는 A자·일자 자세 모두)
          const band = filter(P, (x, y) => y > Y(.22) && y < Y(.86) && s * (x - c.x) > hw * .45);
          const guess = new V3(c.x + s * hw * .55, chestY + h * .04, c.z);
          const hand = extremeMean(band, (p) => p.distanceTo(guess) + (guess.y - p.y) * .6, .05) || new V3(c.x + s * hw * .9, Y(.45), c.z);
          const sh = new V3(c.x + s * Math.max(hw * .4, Math.abs(hand.x - c.x) * .85), chestY + h * .04, c.z);
          const el = sh.clone().lerp(hand, .5); el.z -= fwd * .03 * d;
          const nm = 'arm' + (s < 0 ? 'L' : 'R');
          bd.chain(nm + '_', [sh, el, hand], 'chest', { side: s });
          roles.arms.push({ bones: [nm + '_0', nm + '_1', nm + '_2'], side: s });
        }
      } else if (arche === 'quadruped' || arche === 'hexapod') {
        let feet = kmeans(bottom, legCount, 2); feet.sort((a, b) => fwd * (b.z - a.z));   // 앞발부터
        const bodyY = Y(.55);
        const front = mean(feet.slice(0, 2)), rear = mean(feet.slice(-2));
        const sp = arc(new V3(c.x, bodyY, rear.z), new V3(c.x, bodyY + h * .05, front.z), 3, h * .03);
        bd.add('pelvis', new V3(c.x, bodyY, rear.z), 'root'); bd.chain('spine', sp, 'pelvis'); roles.spine = ['pelvis', 'spine0', 'spine1', 'spine2'];
        const headReg = filter(P, (x, y, z) => fwd * (z - front.z) > 0 && y > Y(.45));
        const head = extremeMean(headReg, (p) => fwd * p.z + p.y * .3, .05) || new V3(c.x, Y(.8), front.z + fwd * d * .2);
        const necks = arc(new V3(c.x, bodyY + h * .08, front.z), head, 3, h * .05);
        bd.chain('neck', necks, 'spine2'); roles.necks.push({ bones: ['neck0', 'neck1', 'neck2'] }); roles.heads = ['neck2'];
        feet.forEach((f, i) => {
          const s = f.x < c.x ? -1 : 1, isFront = i < 2, nm = 'leg' + i;
          const parent = isFront ? 'spine2' : (legCount === 6 && i < 4 ? 'spine1' : 'pelvis');
          const hip = new V3(c.x + (f.x - c.x) * .55, bodyY - h * .05, f.z);
          bd.chain(nm + '_', [hip, new V3(f.x, Y(.3), f.z + (isFront ? -1 : 1) * fwd * .03 * d), new V3(f.x, Y(.05), f.z)], parent, { side: s });
          // 걸음 순서: 사족 = 대각선 걷기, 다족 = 세 발 교대
          const ph = legCount === 4 ? [0, Math.PI, Math.PI * 1.5, Math.PI * .5][i] : ((i + (s > 0 ? 1 : 0)) % 2) * Math.PI;
          roles.legs.push({ bones: [nm + '_0', nm + '_1', nm + '_2'], side: s, front: isFront, phase: ph });
        });
      } else if (arche === 'hydra') {
        bd.add('pelvis', new V3(c.x, Y(.3), c.z), 'root'); bd.add('spine0', new V3(c.x, Y(.45), c.z), 'pelvis'); roles.spine = ['pelvis', 'spine0'];
        const top = filter(P, (x, y) => y > Y(.62));
        const heads = kmeans(top, o.heads || 3, 3).map((hp) => { const near = top.filter((p) => p.distanceTo(hp) < h * .18); return extremeMean(near, (p) => p.y + fwd * p.z * .3, .1) || hp; });
        heads.forEach((hp, i) => { const nm = 'neck' + i + '_'; bd.chain(nm, arc(new V3(c.x + (hp.x - c.x) * .2, Y(.5), c.z + (hp.z - c.z) * .2), hp, 4, h * .05), 'spine0', { side: Math.sign(hp.x - c.x) }); roles.necks.push({ bones: [0, 1, 2, 3].map((j) => nm + j), phase: i * 1.7 }); roles.heads.push(nm + '3'); });
        if (legCount) kmeans(bottom, legCount, 2).forEach((f, i) => { const s = f.x < c.x ? -1 : 1, nm = 'leg' + i; bd.chain(nm + '_', [new V3(c.x + (f.x - c.x) * .5, Y(.3), f.z), new V3(f.x, Y(.15), f.z), new V3(f.x, Y(.03), f.z)], 'pelvis', { side: s }); roles.legs.push({ bones: [nm + '_0', nm + '_1', nm + '_2'], side: s, front: fwd * (f.z - c.z) > 0, phase: i * Math.PI }); });
      } else if (arche === 'sphere') {
        bd.add('pelvis', c.clone(), 'root'); roles.spine = ['pelvis'];
        const R = Math.max(w, h, d) / 2;
        const outer = filter(P, (x, y, z) => Math.hypot(x - c.x, (y - c.y) * 1.6, z - c.z) > R * .72);
        const tips = kmeans(outer, o.tentacles || 6, 3).map((tp) => { const near = outer.filter((p) => p.distanceTo(tp) < R * .3); return extremeMean(near, (p) => p.distanceTo(c), .08) || tp; });
        tips.forEach((tp, i) => { const nm = 'tent' + i + '_'; const base = c.clone().lerp(tp, .45); bd.chain(nm, arc(base, tp, 4, 0), 'pelvis', { side: Math.sign(tp.x - c.x) }); roles.tentacles.push({ bones: [0, 1, 2, 3].map((j) => nm + j), phase: i * 1.05 }); });
        bd.add('head', new V3(c.x, c.y, c.z + fwd * R * .85), 'pelvis'); roles.heads = ['head'];
      } else if (arche === 'tank') {
        bd.add('pelvis', new V3(c.x, Y(.3), c.z), 'root'); bd.add('turret', new V3(c.x, Y(.62), c.z), 'pelvis');
        const muzzle = extremeMean(filter(P, (x, y, z) => y > Y(.5)), (p) => fwd * p.z, .03) || new V3(c.x, Y(.65), c.z + fwd * d * .5);
        bd.add('barrel', new V3(c.x, Y(.65), c.z + fwd * d * .1), 'turret'); bd.add('muzzle', muzzle, 'barrel');
        roles.spine = ['pelvis']; roles.heads = ['turret'];
      }

      // 날개: 등에서 옆으로 가장 멀리 뻗은 곳까지
      if (o.wings) {
        const sp = roles.spine[roles.spine.length - 1]; const sb = bd.bones[sp].userData.wpos;
        for (const s of [-1, 1]) {
          const reg = filter(P, (x, y) => y > Y(.45) && s * (x - c.x) > hw * .45);
          const tip = extremeMean(reg, (p) => s * (p.x - c.x) + (p.y - mn.y) * .25, .04) || new V3(c.x + s * hw, Y(.8), c.z);
          const base = new V3(c.x + s * w * .08, sb.y + h * .04, sb.z - fwd * d * .08);
          const nm = 'wing' + (s < 0 ? 'L' : 'R') + '_';
          bd.chain(nm, arc(base, tip, 3, h * .06), sp, { side: s });
          roles.wings.push({ bones: [nm + '0', nm + '1', nm + '2'], side: s });
        }
      }
      // 꼬리
      if (o.tail) {
        const tailReg = filter(P, (x, y, z) => fwd * (z - c.z) < -d * .3);
        const tip = extremeMean(tailReg, (p) => -fwd * p.z, .05);
        if (tip) { const pb = bd.bones.pelvis.userData.wpos; bd.chain('tail', arc(new V3(c.x, pb.y, pb.z - fwd * d * .08), tip, 4, h * .04), 'pelvis'); roles.tail = ['tail0', 'tail1', 'tail2', 'tail3']; }
      }
      return { bd, roles };
    }

    // ---------------- 피부 가중치 ----------------
    function segDist(p, a, b) { const ab = b.clone().sub(a), t = clamp(p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1); return p.distanceTo(a.clone().addScaledVector(ab, t)); }
    function skinModel(model, bd, B, o) {
      const bones = bd.list; const segs = bones.map((b) => {
        const a = b.userData.wpos; const kids = b.children.filter((x) => x.isBone);
        let e; if (kids.length) e = mean(kids.map((k) => k.userData.wpos)); else { const pa = b.parent && b.parent.isBone ? b.parent.userData.wpos : a.clone().add(new V3(0, -.1, 0)); e = a.clone().add(a.clone().sub(pa).multiplyScalar(.5)); }
        return { a, e, side: b.userData.info.side || 0, isRoot: b.name === 'root' };
      });
      const sharp = o.rigid ? 8 : 4, hw = B.size.x / 2, cx = B.c.x;
      // 속도를 위해 선분을 숫자 배열로 펼침(수십만 정점 × 뼈 수십 개)
      const NS = segs.length, SA = new Float32Array(NS * 3), SD = new Float32Array(NS * 3), SL = new Float32Array(NS), SS = new Int8Array(NS), SR = new Uint8Array(NS);
      segs.forEach((s, j) => { SA[j * 3] = s.a.x; SA[j * 3 + 1] = s.a.y; SA[j * 3 + 2] = s.a.z; SD[j * 3] = s.e.x - s.a.x; SD[j * 3 + 1] = s.e.y - s.a.y; SD[j * 3 + 2] = s.e.z - s.a.z; SL[j] = Math.max(1e-9, SD[j * 3] ** 2 + SD[j * 3 + 1] ** 2 + SD[j * 3 + 2] ** 2); SS[j] = s.side; SR[j] = s.isRoot ? 1 : 0; });
      model.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
      const skinned = []; const p = new V3();
      model.traverse((m) => {
        if (!m.isMesh || m.isSkinnedMesh) return;
        const geo = m.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
        const pos = geo.getAttribute('position'), n = pos.count;
        const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
        const best = new Float32Array(4), bidx = new Int32Array(4);
        for (let i = 0; i < n; i++) {
          p.fromBufferAttribute(pos, i); best.fill(Infinity); bidx.fill(0);
          for (let j = 0; j < NS; j++) {
            if (SR[j]) continue; const j3 = j * 3;
            const px = p.x - SA[j3], py = p.y - SA[j3 + 1], pz = p.z - SA[j3 + 2];
            const tt = Math.min(1, Math.max(0, (px * SD[j3] + py * SD[j3 + 1] + pz * SD[j3 + 2]) / SL[j]));
            const qx = px - SD[j3] * tt, qy = py - SD[j3 + 1] * tt, qz = pz - SD[j3 + 2] * tt;
            let dd = Math.sqrt(qx * qx + qy * qy + qz * qz);
            if (SS[j] && SS[j] * (p.x - cx) < -hw * .06) dd *= 4;        // 반대편에 붙지 않게
            if (dd < best[3]) { let k = 3; while (k > 0 && dd < best[k - 1]) { best[k] = best[k - 1]; bidx[k] = bidx[k - 1]; k--; } best[k] = dd; bidx[k] = j; }
          }
          let sum = 0; const ws = [0, 0, 0, 0];
          for (let k = 0; k < 4; k++) { if (!isFinite(best[k])) continue; ws[k] = 1 / (Math.pow(best[k] / (B.size.y * .05) + 1e-3, sharp)); sum += ws[k]; }
          for (let k = 0; k < 4; k++) { si[i * 4 + k] = bidx[k]; sw[i * 4 + k] = sum ? ws[k] / sum : (k ? 0 : 1); }
        }
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        const sm = new THREE.SkinnedMesh(geo, m.material); sm.name = m.name; sm.castShadow = m.castShadow; sm.receiveShadow = m.receiveShadow; sm.frustumCulled = false;
        skinned.push(sm);
      });
      return skinned;
    }

    // ---------------- 눈 ----------------
    let glowTex = null;
    function eyeTex() { if (glowTex) return glowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); return glowTex; }

    // ---------------- 행동 목록 ----------------
    // 각 행동: 길이(초), 예고(종류·크기·시간), 이벤트 시각, 자세 함수
    // 자세 함수 pose(t, A) → A.rot(뼈 이름, x, y, z) / A.move(...) 로 더함. t는 행동 시작 후 초.
    const ACTIONS = {
      slam: { dur: 2.0, tele: { shape: 'circle', r: .55, at: .3, len: 1.0, fwd: .5 }, events: [{ t: 1.3, type: 'impact', cc: 'knockup', r: .55, fwd: .5 }],
        pose(t, A) { const up = t < 1.1 ? ease(t / 1.1) : 0, hit = t >= 1.1 && t < 1.4 ? easeIn((t - 1.1) / .3) : (t >= 1.4 ? 1 - ease(clamp((t - 1.4) / .6, 0, 1)) : 0);
          A.spine(-.35 * up + .45 * hit, 0); A.arms((-2.2 * up + .7 * hit), 0, .2 * up); A.frontLegs(-.9 * up + .3 * hit); A.necks(-.5 * up + .7 * hit, 0); A.tentacles(-.8 * up + 1.2 * hit); A.body(0, -.08 * hit, 0); A.bodyPitch(-.25 * up + .2 * hit); A.wings(-.6 * up + .4 * hit); A.tail(-.3 * up); } },
      sweep: { dur: 1.8, tele: { shape: 'cone', r: .9, angle: 2.1, at: .2, len: .9 }, events: [{ t: 1.15, type: 'impact', cc: 'knockback', r: .9, angle: 2.1 }],
        pose(t, A) { const w = t < 1.0 ? ease(t / 1.0) : 0, s = t >= 1.0 && t < 1.35 ? ease((t - 1.0) / .35) : (t >= 1.35 ? 1 - ease(clamp((t - 1.35) / .45, 0, 1)) : 0); const yaw = .8 * w - 1.1 * s;
          A.spine(.1, yaw); A.arms(-1.0 * (w + s), 0, 1.0 * (w + s)); A.necks(.2, yaw * 1.3); A.tail(0, -yaw * 1.6); A.tentacles(.3 * w, yaw); A.turret(yaw); } },
      charge: { dur: 2.2, tele: { shape: 'arrow', r: 1.6, at: .1, len: .9 }, events: [{ t: 1.6, type: 'impact', cc: 'stun', r: .45, fwd: 1.6 }], move: { from: 1.0, to: 1.6, dist: 1.6 },
        pose(t, A) { const crouch = t < 1.0 ? ease(t / 1.0) : (t < 1.6 ? 1 : 1 - ease(clamp((t - 1.6) / .6, 0, 1)));
          A.spine(.5 * crouch, 0); A.body(0, -.08 * crouch, 0); A.legsBend(.5 * crouch); A.necks(.5 * crouch, 0); A.arms(-.4 * crouch, 0, 0); A.bodyPitch(.2 * crouch); A.wings(.5 * crouch); if (t > 1.0 && t < 1.6) A.gallop(t * 9); } },
      roar: { dur: 2.0, tele: { shape: 'ring', r: 1.1, at: .2, len: .7 }, events: [{ t: .9, type: 'roar', cc: 'fear', r: 1.1, len: 1.0 }],
        pose(t, A) { const u = t < .8 ? ease(t / .8) : (t < 1.6 ? 1 : 1 - ease((t - 1.6) / .4)); const sh = t > .85 && t < 1.6 ? Math.sin(t * 60) * .04 : 0;
          A.spine(-.35 * u, sh); A.necks(-.8 * u, sh * 2); A.arms(-.6 * u, 0, .9 * u); A.wings(-1.0 * u); A.tentacles(-.9 * u); A.tail(-.4 * u); A.bodyPitch(-.2 * u); A.chestExpand(.08 * u); A.eyeFlare(u); } },
      stomp: { dur: 1.6, tele: { shape: 'ring', r: .8, at: .2, len: .8 }, events: [{ t: 1.0, type: 'impact', cc: 'slow', r: .8 }],
        pose(t, A) { const up = t < .85 ? ease(t / .85) : 0, dn = t >= .85 && t < 1.0 ? (t - .85) / .15 : (t >= 1.0 ? 1 - ease(clamp((t - 1.0) / .6, 0, 1)) : 0);
          A.oneLeg(0, -1.1 * up + .2 * dn, 1.0 * up); A.spine(-.15 * up + .15 * dn, 0); A.body(0, -.05 * dn, 0); A.bodyRoll(.12 * up); } },
      grab: { dur: 2.2, tele: { shape: 'arrow', r: 1.2, at: .1, len: .8 }, events: [{ t: 1.05, type: 'grab', cc: 'pull', r: 1.2 }],
        pose(t, A) { const reach = t < .9 ? ease(t / .9) : 0, ext = t >= .9 && t < 1.15 ? ease((t - .9) / .25) : (t >= 1.15 ? 1 - ease(clamp((t - 1.15) / .9, 0, 1)) : 0);
          A.oneArm(1, -1.2 * reach - 1.4 * ext, 0, .3 * reach); A.spine(-.1 * reach + .35 * ext, -.25 * reach); A.necks(-.2 * reach + .8 * ext, 0); A.oneTentacle(0, -.6 * reach + 1.4 * ext); A.bodyPitch(.15 * ext); } },
      spin: { dur: 2.4, tele: { shape: 'ring', r: .75, at: .1, len: .8 }, events: [{ t: 1.2, type: 'impact', cc: 'knockback', r: .75 }, { t: 1.6, type: 'impact', cc: 'knockback', r: .75 }],
        pose(t, A) { const u = t < .9 ? ease(t / .9) : (t < 2.0 ? 1 : 1 - ease((t - 2.0) / .4)); const spin = t > .9 && t < 2.0 ? ease((t - .9) / 1.1) * TAU * 2 : 0;
          A.yaw(spin); A.arms(-.2 * u, 0, 1.4 * u); A.tentacles(.6 * u); A.tail(0, .6 * u); A.spine(-.1 * u, 0); A.wings(-.3 * u); } },
      leap: { dur: 2.6, tele: { shape: 'circle', r: .6, at: .1, len: 1.3, fwd: 1.8 }, events: [{ t: 1.75, type: 'impact', cc: 'knockup', r: .6, fwd: 1.8 }], move: { from: .9, to: 1.75, dist: 1.8, arc: .9 },
        pose(t, A) { const c = t < .9 ? ease(t / .9) : 0, air = t >= .9 && t < 1.75, land = t >= 1.75 ? 1 - ease(clamp((t - 1.75) / .85, 0, 1)) : 0;
          A.legsBend(.6 * c + .5 * land); A.body(0, -.1 * c - .08 * land, 0); A.spine(.3 * c + (air ? -.3 : 0) + .4 * land, 0); A.arms(air ? -2.4 : -.4 * c, 0, .3); A.wings(air ? -1.0 : .4 * land); A.necks(air ? -.4 : .5 * land, 0); } },
      guard: { dur: 3.2, tele: null, events: [{ t: .45, type: 'guardStart', reduce: .7 }, { t: 2.9, type: 'guardEnd' }],
        pose(t, A) { const u = t < .45 ? ease(t / .45) : (t < 2.9 ? 1 : 1 - ease((t - 2.9) / .3));
          A.arms(-1.3 * u, 0, -.9 * u); A.spine(.25 * u, 0); A.body(0, -.06 * u, 0); A.legsBend(.35 * u); A.wings(.9 * u, true); A.necks(.5 * u, 0); A.tentacles(1.2 * u); A.tail(0, .4 * u); A.eyeFlare(.5 * u); } },
      wingGust: { dur: 3.0, tele: { shape: 'cone', r: 1.6, angle: 1.6, at: .1, len: .8 }, events: [], flaps: { from: .8, n: 3, period: .55, strength: 1.0 },
        pose(t, A) { const rise = t < .8 ? ease(t / .8) : 0; A.wings(-1.3 * rise); A.spine(-.25 * rise, 0); A.body(0, .05 * rise, 0);
          if (t >= .8 && t < .8 + 3 * .55) { const ph = ((t - .8) % .55) / .55; A.flap(ph, 1.3); A.spine(ph > .55 ? .15 : -.15, 0); } else if (t >= 2.45) A.wings(-1.3 * (1 - ease(clamp((t - 2.45) / .55, 0, 1)))); } },
      breath: { dur: 2.4, tele: { shape: 'cone', r: 1.3, angle: .9, at: .2, len: 1.0 }, events: [{ t: 1.2, type: 'breath', cc: 'burn', r: 1.3, angle: .9, len: .8 }],
        pose(t, A) { const u = t < 1.1 ? ease(t / 1.1) : 0, b = t >= 1.1 && t < 2.0 ? 1 : (t >= 2.0 ? 1 - ease((t - 2.0) / .4) : 0);
          A.necks(-.6 * u + .45 * b, Math.sin(t * 3) * .15 * b); A.spine(-.2 * u + .15 * b, 0); A.chestExpand(.1 * u); A.eyeFlare(u + b); A.turret(Math.sin(t * 3) * .2 * b); A.recoil(b * .02 * Math.sin(t * 40)); } },
      summon: { dur: 2.2, tele: null, events: [{ t: 1.1, type: 'summon' }],
        pose(t, A) { const u = t < 1.0 ? ease(t / 1.0) : (t < 1.6 ? 1 : 1 - ease((t - 1.6) / .6)); A.arms(-2.4 * u, 0, .5 * u); A.necks(-.7 * u, 0); A.tentacles(-1.1 * u); A.wings(-.8 * u); A.spine(-.3 * u, 0); A.eyeFlare(u); } },
    };

    // ---------------- 보스 배우 ----------------
    class BossActor {
      constructor(model, o) {
        this.o = Object.assign({ archetype: 'biped', walkSpeed: .35, eyeColor: 0xff5a3a, eyeSize: .035, rigid: true, idleFlap: true }, o);
        model.updateMatrixWorld(true);
        const P = collectVerts(model, 60000); const B = bounds(P); this.B = B; this.P = P;
        const { bd, roles } = buildSkeleton(P, B, this.o);
        this.bones = bd.bones; this.roles = roles;
        const meshes = skinModel(model, bd, B, this.o);
        // 뿌리 묶음: 바닥 중심이 원점이 되게
        this.root = new THREE.Group(); this.root.name = 'boss_' + (this.o.name || this.o.archetype);
        this.inner = new THREE.Group(); this.inner.position.set(-B.c.x, -B.mn.y, -B.c.z); this.root.add(this.inner);
        this.inner.add(bd.root);
        for (const sm of meshes) this.inner.add(sm);
        this.root.updateMatrixWorld(true);
        const skel = new THREE.Skeleton(bd.list);               // 뼈 위치가 정해진 뒤에 만들어야 제자리 기준이 맞음
        for (const sm of meshes) sm.bind(skel);
        this.meshes = meshes; this.skeleton = skel;
        this.restH = B.size.y; this.setHeight(this.o.height || B.size.y);
        // 눈
        this.eyes = []; this.makeEyes();
        // 상태
        this.t = 0; this.walkPhase = 0; this.speed = 0; this.heading = 0; this.target = null; this.moveTarget = null;
        this.action = null; this.actT = 0; this.flinch = 0; this.flinchV = 0; this.broken = 0; this.dead = false; this.deathT = 0;
        this.blinkT = 2 + Math.random() * 3; this.blink = 0; this.flare = 0; this.flapPrev = 0; this.idleFlapT = 6 + Math.random() * 6;
        this.onEvent = null; this.acc = {};
      }
      get height() { return this.restH * this.root.scale.y; }
      setHeight(h) { this.root.scale.setScalar(h / this.restH); }
      /** 크기 규칙으로 키 정하기: kind = 'mob'|'fieldBoss'|'raidBoss'|'weeklyBoss'|'dungeonBoss'|'cosmic', robotHeight = 기체 키 */
      setSizeRule(kind, robotHeight) { this.setHeight((SIZE[kind] || 3.5) * robotHeight); }

      makeEyes() {
        const o = this.o; if (o.eyes === false) return;
        const mat = new THREE.SpriteMaterial({ map: eyeTex(), color: o.eyeColor, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true });
        const h = this.restH, fwd = o.forward === '-z' ? -1 : 1;
        const place = (boneName, off, size) => { const b = this.bones[boneName]; if (!b) return; const s = new THREE.Sprite(mat.clone()); s.position.copy(off); s.scale.setScalar(size); s.userData.base = size; b.add(s); this.eyes.push(s); };
        if (o.eyePoints) { for (const ep of o.eyePoints) place(ep.bone, new V3(ep.x * h, ep.y * h, ep.z * h), (ep.size || o.eyeSize) * h); return; }
        const ex = this.B.size.x * .035;
        for (const hb of this.roles.heads) {
          if (o.archetype === 'sphere') { place(hb, new V3(0, 0, fwd * h * .04), h * .16); continue; }
          if (o.archetype === 'tank') { place(hb, new V3(0, h * .05, fwd * this.B.size.z * .2), h * o.eyeSize); continue; }
          const n = o.eyeCount || 2;
          const snout = o.archetype === 'quadruped' || o.archetype === 'hexapod' || o.archetype === 'hydra';
          const hp = this.bones[hb].userData.wpos;
          for (let i = 0; i < n; i++) {
            const xo = n === 1 ? 0 : (i / (n - 1) - .5) * ex * 2, yo = h * (snout ? .03 : .01);
            // 모델 표면을 찾아 눈을 얼굴 겉면에 붙임(주둥이 끝보다는 뒤쪽)
            const tx = hp.x + xo, ty = hp.y + yo, rx = this.B.size.x * .05, ry = h * .05; let best = -Infinity;
            for (let k = 0; k < this.P.length; k += 3) { const x = this.P[k], y = this.P[k + 1], z = this.P[k + 2]; if (Math.abs(x - tx) > rx || Math.abs(y - ty) > ry) continue; const f = fwd * (z - hp.z); if (snout && f > -this.B.size.z * .03) continue; if (f > best) best = f; }
            const zo = isFinite(best) ? best + h * .012 : this.B.size.z * .05;
            place(hb, new V3(xo, yo, fwd * zo), h * o.eyeSize);
          }
        }
      }

      /** 행동 시작. name: slam|sweep|charge|roar|stomp|grab|spin|leap|guard|wingGust|breath|summon */
      play(name) {
        if (this.dead || this.broken > 0) return false; const A = ACTIONS[name]; if (!A) return false;
        this.action = { name, def: A, fired: new Set(), startPos: this.root.position.clone(), flapN: 0 }; this.actT = 0;
        if (A.tele) this.emit({ type: 'telegraph', action: name, shape: A.tele.shape, radius: A.tele.r * this.height, angle: A.tele.angle, duration: A.tele.len, at: A.tele.fwd ? this.forwardPoint(A.tele.fwd * this.height) : this.root.position.clone(), dir: this.forwardDir() });
        return true;
      }
      /** 지금 하고 있는 행동 이름(없으면 null) */
      get busy() { return this.action ? this.action.name : null; }
      moveTo(x, z) { this.moveTarget = new V3(x, 0, z); }
      stop() { this.moveTarget = null; }
      /** 피격 움찔(세기 0~1) */
      hit(strength) { this.flinchV += (strength || .5) * 3; }
      /** 브레이크 경직(초) */
      breakStun(sec) { this.broken = sec || 3.5; this.action = null; this.emit({ type: 'break', duration: this.broken }); }
      /** 쓰러짐 → 끝나면 'dead' 이벤트(폭발 엔진 연결 지점) */
      kill() { if (this.dead) return; this.dead = true; this.deathT = 0; this.action = null; this.moveTarget = null; }

      forwardDir() { return new V3(Math.sin(this.heading), 0, Math.cos(this.heading)); }
      forwardPoint(dist) { return this.root.position.clone().addScaledVector(this.forwardDir(), dist); }
      emit(e) { e.actor = this; if (this.onEvent) this.onEvent(e); }

      // ---- 매 프레임 ----
      update(dt, ctx) {
        ctx = ctx || {}; this.t += dt; if (ctx.target) this.target = ctx.target;
        const h = this.height, acc = this.acc = {}; const add = (n, x, y, z) => { if (!this.bones[n]) return; const a = acc[n] || (acc[n] = [0, 0, 0]); a[0] += x || 0; a[1] += y || 0; a[2] += z || 0; };
        let bodyOff = new V3(), pitch = 0, roll = 0, yawExtra = 0, chest = 0;
        const R = this.roles;
        // 자세 도우미(행동 함수가 씀)
        const API = {
          rot: add,
          spine: (x, y) => { R.spine.forEach((n, i) => add(n, x / R.spine.length, y / R.spine.length, 0)); },
          arms: (x, y, z) => { for (const a of R.arms) { add(a.bones[0], x, y * a.side, -z * a.side); add(a.bones[1], x * .35, 0, 0); } },
          oneArm: (side, x, y, z) => { const a = R.arms.find((q) => q.side === side) || R.arms[0]; if (a) { add(a.bones[0], x, y, -z * a.side); add(a.bones[1], x * .2, 0, 0); } },
          frontLegs: (x) => { for (const l of R.legs) if (l.front && R.legs.length > 2) { add(l.bones[0], x, 0, 0); add(l.bones[1], -x * .8, 0, 0); } },
          oneLeg: (i, x, knee) => { const l = R.legs[i]; if (l) { add(l.bones[0], x, 0, 0); add(l.bones[1], knee, 0, 0); } },
          legsBend: (k) => { for (const l of R.legs) { add(l.bones[0], -k, 0, 0); add(l.bones[1], k * 2, 0, 0); add(l.bones[2], -k, 0, 0); } },
          necks: (x, y) => { if (!R.necks.length) { add('neck', x * .5, y * .5, 0); add('head', x * .5, y * .5, 0); return; } for (const n of R.necks) n.bones.forEach((b) => add(b, x / n.bones.length * 1.2, y / n.bones.length * 1.2, 0)); },
          tentacles: (x, y) => { for (const tc of R.tentacles) tc.bones.forEach((b) => add(b, (x || 0) / 4, (y || 0) / 4, 0)); },
          oneTentacle: (i, x) => { const tc = R.tentacles[i]; if (tc) tc.bones.forEach((b) => add(b, x / 4, 0, 0)); },
          tail: (x, y) => { if (R.tail) R.tail.forEach((b) => add(b, (x || 0) / 4, (y || 0) / 4, 0)); },
          wings: (raise, fold) => { for (const wg of R.wings) { add(wg.bones[0], 0, fold ? -wg.side * raise * .6 : 0, raise * wg.side); add(wg.bones[1], 0, 0, raise * .4 * wg.side); } },
          flap: (ph, amp) => { const a = ph < .55 ? lerp(.6, -1.0, ease(ph / .55)) : lerp(-1.0, .6, easeOut((ph - .55) / .45)); for (const wg of R.wings) { add(wg.bones[0], 0, 0, a * amp * wg.side); add(wg.bones[1], 0, 0, a * .5 * amp * wg.side); add(wg.bones[2], 0, 0, a * .3 * amp * wg.side); } },
          turret: (y) => { add('turret', 0, y, 0); },
          recoil: (z) => { add('barrel', 0, 0, 0); bodyOff.z -= z * h; },
          body: (x, y, z) => { bodyOff.add(new V3(x * h, y * h, z * h)); },
          bodyPitch: (p) => { pitch += p; }, bodyRoll: (r) => { roll += r; }, yaw: (y) => { yawExtra += y; },
          chestExpand: (s) => { chest += s; },
          gallop: (ph) => { for (const l of R.legs) { const s = Math.sin(ph + l.phase); add(l.bones[0], -s * .7, 0, 0); add(l.bones[1], Math.max(0, Math.cos(ph + l.phase)) * 1.0, 0, 0); } },
          eyeFlare: (f) => { this.flare = Math.max(this.flare, f); },
        };

        // ---- 쓰러짐 ----
        if (this.dead) {
          this.deathT += dt; const k = clamp(this.deathT / 1.6, 0, 1), e = ease(k);
          API.legsBend(.8 * e); API.spine(.6 * e, 0); API.necks(1.0 * e, 0); API.arms(.6 * e, 0, .2); API.wings(.9 * e, true); API.tentacles(1.4 * e); API.tail(.3 * e);
          bodyOff.y -= .25 * h * e; roll += .35 * e; this.flare = 0; this.blink = e;
          if (this.deathT >= 1.6 && !this.deadSent) { this.deadSent = true; this.emit({ type: 'dead', pos: this.root.position.clone(), height: h }); }
          return this.apply(acc, bodyOff, pitch, roll, yawExtra, chest, dt);
        }
        // ---- 브레이크 경직 ----
        if (this.broken > 0) { this.broken -= dt; const k = Math.min(1, (3.5 - this.broken) * 4, this.broken * 3); API.legsBend(.45 * k); API.spine(.5 * k, 0); API.necks(.8 * k, 0); API.arms(.5 * k, 0, 0); API.wings(.7 * k, true); bodyOff.y -= .06 * h * k; this.blink = Math.max(this.blink, .6 * k);
          if (this.broken <= 0) this.emit({ type: 'breakEnd' }); return this.apply(acc, bodyOff, pitch, roll, yawExtra, chest, dt); }

        // ---- 이동 ----
        let want = 0;
        if (this.moveTarget && !this.action) {
          const d = this.moveTarget.clone().sub(this.root.position); d.y = 0; const dist = d.length();
          if (dist > h * .15) { want = this.o.walkSpeed * h; const hd = Math.atan2(d.x, d.z); let dh = ((hd - this.heading + Math.PI * 3) % TAU) - Math.PI; this.heading += clamp(dh, -1.2 * dt, 1.2 * dt); if (Math.abs(dh) > 1.2) want *= .3; }
          else this.moveTarget = null;
        } else if (this.target && !this.action) {        // 목표를 천천히 바라봄
          const d = this.target.clone().sub(this.root.position); const hd = Math.atan2(d.x, d.z); let dh = ((hd - this.heading + Math.PI * 3) % TAU) - Math.PI; this.heading += clamp(dh, -.8 * dt, .8 * dt);
        }
        this.speed = lerp(this.speed, want, clamp(dt * 3, 0, 1));
        if (this.speed > 1e-3) this.root.position.addScaledVector(this.forwardDir(), this.speed * dt);
        const gait = clamp(this.speed / (this.o.walkSpeed * h + 1e-6), 0, 1);

        // ---- 숨쉬기·평소 움직임 ----
        const br = Math.sin(this.t * 1.6);
        API.spine(-.03 * br, Math.sin(this.t * .5) * .04); chest += .02 * br; API.necks(.04 * Math.sin(this.t * 1.1), .12 * Math.sin(this.t * .37));
        for (const n of R.necks) if (n.phase != null) n.bones.forEach((b, i) => add(b, Math.sin(this.t * 1.3 + n.phase + i * .7) * .07, Math.sin(this.t * .9 + n.phase + i) * .1, 0));
        for (const tc of R.tentacles) tc.bones.forEach((b, i) => add(b, Math.sin(this.t * 1.4 + tc.phase + i * .9) * .16, 0, Math.cos(this.t * 1.1 + tc.phase + i * .8) * .12));
        if (R.tail) R.tail.forEach((b, i) => add(b, Math.sin(this.t * 1.2 + i) * .04, Math.sin(this.t * 1.5 + i * .8) * .12, 0));
        if (this.o.archetype === 'sphere') yawExtra += this.t * .05;
        if (this.o.archetype === 'floater') bodyOff.y += Math.sin(this.t * 1.3) * .03 * h;
        if (R.wings.length) { // 평소엔 날개를 반쯤 접고 가끔 퍼덕임(풍압 약함)
          API.wings(.5, true);
          if (this.o.idleFlap && !this.action) { this.idleFlapT -= dt; if (this.idleFlapT < 0) { const ph = -this.idleFlapT / 1.1; if (ph < 2) { API.flap(ph % 1, .8); this.checkGust(ph % 1, .35); } else this.idleFlapT = 7 + Math.random() * 7; } }
        }

        // ---- 걷기 ----
        if (gait > .01 && R.legs.length) {
          const legLen = h * .45; this.walkPhase += dt * (this.speed / (legLen * 1.1)) * Math.PI;
          for (const l of R.legs) {
            const ph = this.walkPhase + l.phase, sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
            add(l.bones[0], -sw * .45 * gait, 0, 0); add(l.bones[1], lift * .8 * gait, 0, 0); add(l.bones[2], -lift * .35 * gait + sw * .15 * gait, 0, 0);
          }
          const bob = Math.abs(Math.sin(this.walkPhase)); bodyOff.y -= bob * .025 * h * gait; roll += Math.sin(this.walkPhase) * .03 * gait;
          for (const a of R.arms) add(a.bones[0], Math.sin(this.walkPhase + (a.side > 0 ? 0 : Math.PI)) * .3 * gait, 0, 0);
          if (R.tail) R.tail.forEach((b, i) => add(b, 0, Math.sin(this.walkPhase + i * .6) * .12 * gait, 0));
          // 무거운 발걸음: 발이 땅에 닿을 때 이벤트(흔들림·먼지용)
          const stepNow = Math.floor(this.walkPhase / Math.PI); if (stepNow !== this.lastStep) { this.lastStep = stepNow; this.emit({ type: 'footstep', pos: this.root.position.clone(), strength: gait }); }
        } else if (gait > .01 && this.o.archetype === 'tank') { bodyOff.y += Math.sin(this.t * 14) * .004 * h; }
        else if (gait > .01 && this.o.archetype === 'hydra') { this.walkPhase += dt * 2; API.spine(0, Math.sin(this.walkPhase) * .1 * gait); }

        // ---- 행동 ----
        if (this.action) {
          const ac = this.action, D = ac.def; this.actT += dt; const t = this.actT;
          D.pose(t, API);
          if (t < (D.tele ? D.tele.len + .1 : .3)) this.flare = Math.max(this.flare, .7);
          for (const ev of D.events) if (t >= ev.t && !ac.fired.has(ev)) { ac.fired.add(ev);
            this.emit({ type: ev.type, action: ac.name, cc: ev.cc, radius: (ev.r || 0) * h, angle: ev.angle, reduce: ev.reduce, duration: ev.len, pos: ev.fwd ? this.forwardPoint(ev.fwd * h) : this.root.position.clone(), dir: this.forwardDir() }); }
          if (D.move && t >= D.move.from && t <= D.move.to + dt) { const k = clamp((t - D.move.from) / (D.move.to - D.move.from), 0, 1); const p = ac.startPos.clone().addScaledVector(this.forwardDir(), D.move.dist * h * ease(k)); this.root.position.x = p.x; this.root.position.z = p.z; if (D.move.arc) bodyOff.y += Math.sin(k * Math.PI) * D.move.arc * h; }
          if (D.flaps) { const f = D.flaps; if (t >= f.from && t < f.from + f.n * f.period) this.checkGust(((t - f.from) % f.period) / f.period, f.strength); }
          if (t >= D.dur) { this.action = null; this.emit({ type: 'actionEnd', action: ac.name }); }
        }

        // ---- 피격 움찔(스프링) ----
        this.flinchV += (-this.flinch * 40 - this.flinchV * 8) * dt; this.flinch += this.flinchV * dt; API.spine(-this.flinch * .5, 0); API.necks(-this.flinch * .4, 0);

        return this.apply(acc, bodyOff, pitch, roll, yawExtra, chest, dt);
      }

      // 날개 내리칠 때 풍압 이벤트 (한 번 퍼덕임에 한 번)
      checkGust(ph, strength) {
        const down = ph > .6 && ph < .8;
        if (down && !this.gustArmed) { this.gustArmed = true; const h = this.height;
          this.emit({ type: 'gust', pos: this.root.position.clone().add(new V3(0, h * .5, 0)), dir: this.forwardDir(), radius: h * (1.2 + strength * .8), angle: 1.8, strength }); }
        if (!down) this.gustArmed = false;
      }

      apply(acc, bodyOff, pitch, roll, yaw, chest, dt) {
        const e = new THREE.Euler();
        for (const n in this.bones) { const b = this.bones[n]; const a = acc[n]; if (a) b.quaternion.setFromEuler(e.set(a[0], a[1], a[2])); else b.quaternion.identity(); }
        const pel = this.bones.pelvis; if (pel) { pel.position.copy(pel.userData.wpos).sub(this.bones.root.userData.wpos).add(bodyOff.clone().divideScalar(this.root.scale.y)); pel.rotation.x += pitch; pel.rotation.z += roll; }
        const ch = this.bones.chest || this.bones.spine2 || this.bones.pelvis; if (ch && chest) ch.scale.setScalar(1 + chest); else if (ch) ch.scale.setScalar(1);
        this.root.rotation.y = this.heading + yaw;
        // 눈 깜박임: 2.5~6초마다, 가끔 두 번
        this.blinkT -= dt; if (this.blinkT < 0) { this.blinkAnim = 0; this.blinkT = 2.5 + Math.random() * 3.5; this.doubleBlink = Math.random() < .2; }
        let lid = 0; if (this.blinkAnim != null) { this.blinkAnim += dt; const b = this.blinkAnim; lid = b < .06 ? b / .06 : b < .1 ? 1 : b < .18 ? 1 - (b - .1) / .08 : 0; if (this.doubleBlink && b > .25 && b < .43) { const c = b - .25; lid = c < .06 ? c / .06 : c < .1 ? 1 : 1 - (c - .1) / .08; } if (b > .5) this.blinkAnim = null; }
        lid = Math.max(lid, this.dead ? 1 : 0);
        const fl = this.flare; this.flare = Math.max(0, this.flare - dt * 2);
        for (const s of this.eyes) { const base = s.userData.base; s.scale.set(base * (1 + fl * .6), base * (1 + fl * .6) * Math.max(.04, 1 - lid), 1); s.material.opacity = .85 + fl * .15; }
        return this;
      }

      /** 약점 위치(게임 판정용): 모델 기준 비율 좌표를 넘기면 가장 가까운 뼈에 붙여 월드 좌표를 계속 알려 줌 */
      addWeakPoint(nx, ny, nz, name) {
        const B = this.B; const p = new V3(B.mn.x + B.size.x * nx, B.mn.y + B.size.y * ny, B.mn.z + B.size.z * nz);
        let best = null, bd = Infinity; for (const n in this.bones) { const d = this.bones[n].userData.wpos.distanceTo(p); if (d < bd) { bd = d; best = this.bones[n]; } }
        const o = new THREE.Object3D(); o.name = name || 'weak'; o.position.copy(p).sub(best.userData.wpos); best.add(o); return o;
      }
      dispose() { for (const m of this.meshes) m.geometry.dispose(); this.root.removeFromParent(); }
    }

    function rig(model, o) { return new BossActor(model, o || {}); }
    return { rig, BossActor, ACTIONS, SIZE, version: '1.0' };
  }

  root.createBossRig = createBossRig;
  if (typeof module !== 'undefined' && module.exports) module.exports = createBossRig;
})(typeof window !== 'undefined' ? window : globalThis);
