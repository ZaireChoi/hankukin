// ASCEND 라스트 스탠드 — 기동전사 서바이벌
// 구성: 설정 → 화면(렌더러·지형) → 자료 불러오기 → 그리기 풀 → 소리 → 입력 → 플레이어·강화 → 적 → 진행 → 루프
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const MOBILE = matchMedia('(pointer:coarse)').matches;
const SAVE_KEY = 'ascend-laststand-v1';

// ───────── 설정 ─────────
const ARENA_R = 230;          // 전장 반지름
const RUN_TIME = 300;         // 여왕 등장까지(초)
const MAX_ALIVE = MOBILE ? 70 : 110;

const MECHS = [
  { id: 'mech4', nm: '발레리안', tag: '균형 · 장갑 +20', init(p) { p.maxHp += 20; p.hp += 20; } },
  { id: 'm_samurai', nm: '인퀴지터', tag: '근접 · 칼날로 시작', init(p) { p.w.blade = 1; p.spdMul *= 1.08; } },
  { id: 'm_striker', nm: '오리온', tag: '사격 · 치명타 +10%', init(p) { p.w.rifle = 2; p.crit += 0.1; } },
];

// 적 종류: h 키, r 충돌 반지름, yaw 모델 정면 보정
const ET = {
  ling:     { file: 'zling_sw',  h: 7,  r: 3.2, hp: 10,   spd: 47, dmg: 8,  xp: 1,  max: 100, yaw: 0, col: 0x9be05a },
  roach:    { file: 'zroach',    h: 9,  r: 5.2, hp: 62,   spd: 25, dmg: 14, xp: 3,  max: 34,  yaw: 0, col: 0xd9a04a },
  bane:     { file: 'zbane',     h: 8,  r: 3.6, hp: 20,   spd: 54, dmg: 22, xp: 2,  max: 26,  yaw: 0, col: 0xff7a3a },
  plasma:   { file: 'zplasma',   h: 10, r: 4.6, hp: 38,   spd: 30, dmg: 10, xp: 3,  max: 18,  yaw: 0, col: 0xc86bff },
  lurk:     { file: 'zlurk',     h: 9,  r: 5.2, hp: 54,   spd: 34, dmg: 18, xp: 4,  max: 16,  yaw: 0, col: 0xff4a6a },
  behemoth: { file: 'zbehemoth', h: 27, r: 12,  hp: 760,  spd: 21, dmg: 22, xp: 0,  max: 3,   yaw: 0, col: 0xffb04a },
  queen:    { file: 'zqueen',    h: 46, r: 15,  hp: 5200, spd: 25, dmg: 25, xp: 0, max: 1,   yaw: 0, col: 0xff7ac4 },
};

// 강화 목록: 단계별 수치와 설명
const UP = {
  rifle: { ic: '➹', nm: '빔 라이플', max: 6, kind: 'w',
    dmg: [12, 16, 16, 21, 21, 28], n: [1, 1, 2, 2, 3, 3], cd: [.42, .42, .40, .34, .34, .28], pierce: [0, 0, 0, 1, 1, 2],
    ds: ['가까운 적을 자동으로 쏜다', '피해 +30%', '탄 +1', '관통 +1 · 연사 +15%', '탄 +1', '피해 +30% · 관통 +1 · 연사 +20%'] },
  blade: { ic: '⟳', nm: '궤도 칼날', max: 5, kind: 'w',
    n: [2, 3, 3, 4, 5], dmg: [9, 9, 13, 13, 18], rad: [24, 24, 28, 28, 33],
    ds: ['기체 주위를 도는 칼날 2개', '칼날 +1', '피해 +45% · 반경 확대', '칼날 +1', '칼날 +1 · 피해 +40%'] },
  missile: { ic: '✸', nm: '유도 미사일', max: 5, kind: 'w',
    n: [2, 3, 3, 4, 5], dmg: [28, 28, 40, 40, 55], cd: [2.4, 2.4, 2.1, 2.1, 1.8],
    ds: ['적을 쫓아가 터지는 미사일 2발', '미사일 +1', '피해 +40% · 재장전 단축', '미사일 +1', '미사일 +1 · 피해 +35%'] },
  pulse: { ic: '◎', nm: '충격파', max: 5, kind: 'w',
    dmg: [20, 28, 28, 40, 55], rad: [42, 42, 54, 54, 66], cd: [3.6, 3.6, 3.2, 2.8, 2.4],
    ds: ['주변을 밀어내는 충격파', '피해 +40%', '범위 확대 · 주기 단축', '피해 +40% · 주기 단축', '범위·피해 대폭 증가'] },
  strike: { ic: '⚡', nm: '궤도 포격', max: 5, kind: 'w',
    n: [1, 2, 2, 3, 4], dmg: [55, 55, 80, 80, 110], cd: [2.6, 2.6, 2.3, 2.3, 2.0],
    ds: ['적 머리 위로 떨어지는 포격', '포격 +1', '피해 +45% · 주기 단축', '포격 +1', '포격 +1 · 피해 +35%'] },
  armor:    { ic: '⛨', nm: '강화 장갑', max: 5, kind: 'p', ds: ['최대 내구 +25, 즉시 25 회복'] },
  thruster: { ic: '➤', nm: '추진기', max: 5, kind: 'p', ds: ['이동 +9% · 대시 재사용 −10%'] },
  magnet:   { ic: '⊙', nm: '수집 자석', max: 4, kind: 'p', ds: ['코어 수집 범위 +45%'] },
  reactor:  { ic: '❄', nm: '냉각 반응로', max: 5, kind: 'p', ds: ['모든 무기 주기 −7%'] },
  crit:     { ic: '✦', nm: '조준 보정', max: 5, kind: 'p', ds: ['치명타 확률 +10% (피해 2배)'] },
  repair:   { ic: '✚', nm: '수리 드론', max: 4, kind: 'p', ds: ['초당 내구 0.7 회복'] },
};

// ───────── 화면 ─────────
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const SKY = new THREE.Color(0x2a1a24);
scene.background = SKY;
scene.fog = new THREE.Fog(SKY, 300, 760);
const cam = new THREE.PerspectiveCamera(42, 1, 1, 1600);
scene.add(new THREE.HemisphereLight(0xffe2c0, 0x4a3040, 1.25));
const sun = new THREE.DirectionalLight(0xffd0a0, 1.9);
sun.position.set(-120, 220, 90);
scene.add(sun);

let composer = null, bloomOn = false;
function setupBloom() {
  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, cam));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.82));
    composer.addPass(new OutputPass());
    bloomOn = true;
  } catch (e) { composer = null; bloomOn = false; }
}
if (!MOBILE) setupBloom();

const fx2d = $('#fx'), ctx2 = fx2d.getContext('2d');
let W = 1, H = 1, camScale = 1;
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(W, H, false);
  if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(W, H); }
  cam.aspect = W / H; cam.updateProjectionMatrix();
  camScale = W / H < 0.8 ? 1.5 : W / H < 1.25 ? 1.2 : 1;   // 세로 화면은 더 멀리서
  const d = Math.min(devicePixelRatio || 1, 2);
  fx2d.width = W * d; fx2d.height = H * d; ctx2.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', resize); resize();

// ───────── 지형 ─────────
const texL = new THREE.TextureLoader();
function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }

async function buildTerrain() {
  const [hImg, gTex] = await Promise.all([loadImg('img/height.png'), texL.loadAsync('img/ground.jpg')]);
  const N = hImg.width, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const cx = cv.getContext('2d'); cx.drawImage(hImg, 0, 0);
  const hd = cx.getImageData(0, 0, N, N).data;
  const hAt = (u, v) => {           // 0..1 좌표의 높이(0..1), 양선형 보간
    u = (u % 1 + 1) % 1; v = (v % 1 + 1) % 1;
    const x = u * (N - 1), y = v * (N - 1), x0 = x | 0, y0 = y | 0, x1 = Math.min(N - 1, x0 + 1), y1 = Math.min(N - 1, y0 + 1);
    const fx = x - x0, fy = y - y0, g = (a, b) => hd[(b * N + a) * 4] / 255;
    return lerp(lerp(g(x0, y0), g(x1, y0), fx), lerp(g(x0, y1), g(x1, y1), fx), fy);
  };
  const SIZE = 1500, SEG = 150, geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    const u = x / 620 + 0.5, v = z / 620 + 0.5;
    // 전장 안쪽은 평지, 바깥으로 갈수록 능선이 솟는다
    const k = THREE.MathUtils.smoothstep(r, ARENA_R + 6, ARENA_R + 230);
    pos.setY(i, k * (hAt(u, v) * 150 + 26) - 0.2);
    uv.setXY(i, u, v);
  }
  geo.computeVertexNormals();
  gTex.colorSpace = THREE.SRGBColorSpace; gTex.wrapS = gTex.wrapT = THREE.MirroredRepeatWrapping; gTex.anisotropy = 4;
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: gTex })));

  // 바닥 결: 움직임이 보이도록 균열·잔무늬를 곱해 얹는다
  const dc = document.createElement('canvas'); dc.width = dc.height = 256;
  const d = dc.getContext('2d'); d.fillStyle = '#fff'; d.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) { const g = 182 + Math.random() * 73 | 0; d.fillStyle = `rgb(${g},${g},${g})`; d.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  d.strokeStyle = 'rgba(90,60,45,.22)'; d.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    let x = Math.random() * 256, y = Math.random() * 256; d.beginPath(); d.moveTo(x, y);
    for (let j = 0; j < 7; j++) { x += rand(-34, 34); y += rand(-34, 34); d.lineTo(x, y); } d.stroke();
  }
  const dt = new THREE.CanvasTexture(dc); dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.repeat.set(7, 7); dt.anisotropy = 4;
  const det = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R + 20, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: dt, blending: THREE.MultiplyBlending, transparent: true, depthWrite: false }));
  det.position.y = 0.05; det.renderOrder = 1; scene.add(det);

  // 전장 경계선
  const rim = new THREE.Mesh(new THREE.RingGeometry(ARENA_R, ARENA_R + 2.2, 128).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x18c8f0, transparent: true, opacity: .75, depthWrite: false, toneMapped: false }));
  rim.position.y = 0.3; scene.add(rim);
}

// ───────── 자료 불러오기 ─────────
const gltfL = new GLTFLoader();
const MODELS = {};     // 적·소품: { geo, map }
function bake(gltf, height, yaw) {
  gltf.scene.updateMatrixWorld(true);
  let mesh = null; gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const g = mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld);
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  g.computeBoundingBox(); const b = g.boundingBox, s = height / (b.max.y - b.min.y);
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g.scale(s, s, s);
  if (yaw) g.rotateY(yaw);
  g.computeBoundingSphere();
  return { geo: g, map: mesh.material.map };
}
async function loadModel(key, file, height, yaw) {
  MODELS[key] = bake(await gltfL.loadAsync(`models/${file}.glb`), height, yaw);
}
const mechCache = {};
async function loadMech(id) {
  if (mechCache[id]) return mechCache[id];
  const g = await gltfL.loadAsync(`models/${id}.glb`);
  g.scene.traverse((o) => {
    if (o.isMesh) { o.frustumCulled = false; const m = o.material; m.metalness = Math.min(m.metalness, .15); m.roughness = Math.max(m.roughness, .6); m.metalnessMap = null; m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 1.05; m.color.setScalar(1.6); m.needsUpdate = true; }
  });
  // 달리기 동작에 섞인 전진 이동을 지워 제자리에서 뛰게 한다
  for (const clip of g.animations) for (const tr of clip.tracks) {
    if (!/^Hips\.position$/.test(tr.name)) continue;
    for (let i = 0; i < tr.values.length; i += 3) { tr.values[i] = 0; tr.values[i + 2] = 0; }
  }
  return (mechCache[id] = g);
}

// ───────── 그리기 풀 ─────────
const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
function instanced(geo, mat, max) {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
  m.setColorAt(0, tmpC.set(0xffffff)); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(m); return m;
}
const IM = {};          // 적 종류별 인스턴스
let imShadow, imShot, imEB, imGem, imBlade, imRock;
const flatMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const addMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

function buildPools() {
  for (const k in ET) {
    const m = new THREE.MeshLambertMaterial({ map: MODELS[k].map, emissiveMap: MODELS[k].map, emissive: new THREE.Color(ET[k].col).lerp(new THREE.Color(0xffffff), .45), emissiveIntensity: .95 });
    m.color.setScalar(1.7); IM[k] = instanced(MODELS[k].geo, m, ET[k].max);
  }
  imShadow = instanced(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false }), 180);
  imShadow.renderOrder = 2;
  imShot = instanced(new THREE.BoxGeometry(1.1, 1.1, 9), flatMat(), 260);
  imEB = instanced(new THREE.SphereGeometry(2.4, 12, 8), flatMat(), 280);
  imGem = instanced(new THREE.OctahedronGeometry(1.25), flatMat(), 420);
  imBlade = instanced(MODELS.blade.geo, new THREE.MeshLambertMaterial({ map: MODELS.blade.map, emissive: 0x2a6a88 }), 6);
  // 전장 밖 바위·수정
  const rg = MODELS.rock.geo, cg = MODELS.crystal.geo;
  imRock = instanced(rg, new THREE.MeshLambertMaterial({ map: MODELS.rock.map }), 70);
  const imCry = instanced(cg, new THREE.MeshLambertMaterial({ map: MODELS.crystal.map, emissive: 0x16404a }), 40);
  for (let i = 0; i < 70; i++) {
    const a = rand(0, TAU), r = ARENA_R + rand(14, 150), s = rand(.6, 2.2);
    dummy.position.set(Math.cos(a) * r, -1, Math.sin(a) * r); dummy.rotation.set(0, rand(0, TAU), 0); dummy.scale.set(s, s * rand(.7, 1.3), s); dummy.updateMatrix();
    imRock.setMatrixAt(i, dummy.matrix); imRock.setColorAt(i, tmpC.set(0xffffff));
  }
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * TAU + rand(-.05, .05), r = ARENA_R + rand(8, 16), s = rand(.5, 1.1);
    dummy.position.set(Math.cos(a) * r, -1, Math.sin(a) * r); dummy.rotation.set(0, rand(0, TAU), 0); dummy.scale.setScalar(s); dummy.updateMatrix();
    imCry.setMatrixAt(i, dummy.matrix); imCry.setColorAt(i, tmpC.set(0xffffff));
  }
  imRock.count = 70; imCry.count = 40; imRock.instanceMatrix.needsUpdate = imCry.instanceMatrix.needsUpdate = true;
}

// 예고 표시(원·직선): 바깥 테두리 + 차오르는 안쪽
const decals = [];
const DEC_GEO = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const DEC_RING = new THREE.RingGeometry(.93, 1, 48).rotateX(-Math.PI / 2);
const DEC_BOX = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, .5);
function decal(x, z, r, dur, color, onDone) {
  let d = decals.find((o) => !o.on && !o.line);
  if (!d) {
    const mk = (g, op) => new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
    d = { g: new THREE.Group(), fill: mk(DEC_GEO, .30), base: mk(DEC_GEO, .13), ring: mk(DEC_RING, .95) };
    d.g.add(d.base, d.fill, d.ring); d.g.renderOrder = 3; scene.add(d.g); decals.push(d);
  }
  for (const m of [d.fill, d.base, d.ring]) m.material.color.set(color);
  d.on = true; d.t = 0; d.dur = dur; d.r = r; d.cb = onDone; d.g.visible = true;
  d.g.position.set(x, .35, z); d.base.scale.setScalar(r); d.ring.scale.setScalar(r); d.fill.scale.setScalar(.01);
  return d;
}
function lineDecal(x, z, ang, len, w, dur, color, onDone) {
  let d = decals.find((o) => !o.on && o.line);
  if (!d) {
    const mk = (op) => new THREE.Mesh(DEC_BOX, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, toneMapped: false }));
    d = { line: true, g: new THREE.Group(), fill: mk(.34), base: mk(.16) };
    d.g.add(d.base, d.fill); d.g.renderOrder = 3; scene.add(d.g); decals.push(d);
  }
  d.fill.material.color.set(color); d.base.material.color.set(color);
  d.on = true; d.t = 0; d.dur = dur; d.len = len; d.cb = onDone; d.g.visible = true;
  d.g.position.set(x, .35, z); d.g.rotation.y = ang; d.base.scale.set(w, 1, len); d.fill.scale.set(w, 1, .01);
  return d;
}
function cancelDecal(d) { if (d) { d.on = false; d.g.visible = false; d.cb = null; } }
function updDecals(dt) {
  for (const d of decals) {
    if (!d.on) continue;
    d.t += dt; const k = Math.min(1, d.t / d.dur);
    if (d.line) d.fill.scale.z = Math.max(.01, d.len * k); else d.fill.scale.setScalar(Math.max(.01, d.r * k));
    if (k >= 1) { const cb = d.cb; cancelDecal(d); cb && cb(); }
  }
}

// 퍼지는 고리(충격파·폭발)
const rings = [];
const RING_GEO = new THREE.RingGeometry(.86, 1, 56).rotateX(-Math.PI / 2);
function ring(x, z, r0, r1, dur, color) {
  let o = rings.find((q) => !q.on);
  if (!o) { o = { m: new THREE.Mesh(RING_GEO, addMat(color)) }; o.m.renderOrder = 4; scene.add(o.m); rings.push(o); }
  o.m.material.color.set(color); o.on = true; o.t = 0; o.dur = dur; o.r0 = r0; o.r1 = r1; o.m.visible = true; o.m.position.set(x, 1.2, z);
}
function updRings(dt) {
  for (const o of rings) {
    if (!o.on) continue; o.t += dt; const k = o.t / o.dur;
    if (k >= 1) { o.on = false; o.m.visible = false; continue; }
    const e = 1 - (1 - k) * (1 - k); o.m.scale.setScalar(lerp(o.r0, o.r1, e)); o.m.material.opacity = 1 - k;
  }
}

// 입자
const PMAX = MOBILE ? 900 : 1800;
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 4), pSize = new Float32Array(PMAX);
const pVel = new Float32Array(PMAX * 3), pLife = new Float32Array(PMAX), pMax = new Float32Array(PMAX), pBase = new Float32Array(PMAX);
let pHead = 0, points;
function buildParticles() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('col', new THREE.BufferAttribute(pCol, 4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('size', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { sc: { value: 1 } },
    vertexShader: 'attribute float size;attribute vec4 col;varying vec4 vc;uniform float sc;void main(){vc=col;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*sc/-mv.z;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying vec4 vc;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.08,d);gl_FragColor=vec4(vc.rgb*vc.a*a,vc.a*a);}',
  });
  points = new THREE.Points(g, m); points.frustumCulled = false; points.renderOrder = 5; scene.add(points);
}
function burst(x, y, z, n, color, speed, life, size, up = 0.6) {
  tmpC.set(color);
  for (let i = 0; i < n; i++) {
    const k = pHead; pHead = (pHead + 1) % PMAX;
    const a = rand(0, TAU), e = rand(-.2, 1) * up, s = speed * rand(.35, 1);
    pPos[k * 3] = x; pPos[k * 3 + 1] = y; pPos[k * 3 + 2] = z;
    pVel[k * 3] = Math.cos(a) * s; pVel[k * 3 + 1] = e * s; pVel[k * 3 + 2] = Math.sin(a) * s;
    pCol[k * 4] = tmpC.r; pCol[k * 4 + 1] = tmpC.g; pCol[k * 4 + 2] = tmpC.b; pCol[k * 4 + 3] = 1;
    pLife[k] = pMax[k] = life * rand(.6, 1); pBase[k] = pSize[k] = size * rand(.6, 1.2);
  }
}
function updParticles(dt) {
  for (let k = 0; k < PMAX; k++) {
    if (pLife[k] <= 0) continue;
    pLife[k] -= dt;
    if (pLife[k] <= 0) { pCol[k * 4 + 3] = 0; pSize[k] = 0; continue; }
    const j = k * 3; pVel[j + 1] -= 60 * dt; const dr = 1 - 2.2 * dt; pVel[j] *= dr; pVel[j + 2] *= dr;
    pPos[j] += pVel[j] * dt; pPos[j + 1] = Math.max(.4, pPos[j + 1] + pVel[j + 1] * dt); pPos[j + 2] += pVel[j + 2] * dt;
    const t = pLife[k] / pMax[k]; pCol[k * 4 + 3] = t; pSize[k] = pBase[k] * (.4 + .6 * t);
  }
  const g = points.geometry; g.attributes.position.needsUpdate = g.attributes.col.needsUpdate = g.attributes.size.needsUpdate = true;
  points.material.uniforms.sc.value = H * pixelRatio * 1.1;
}

// 피해 숫자(2D)
const nums = [];
const v3 = new THREE.Vector3();
function num(x, y, z, txt, color = '#fff', size = 15) {
  if (nums.length > 50) nums.shift();
  nums.push({ x, y, z, txt, color, size, t: 0, ox: rand(-10, 10) });
}

// ───────── 소리 ─────────
let AC = null, master = null, muted = false, noiseBuf = null;
const music = new Audio('audio/battle.mp3'); music.loop = true; music.volume = .34;
const jingle = { win: new Audio('audio/win.mp3'), lose: new Audio('audio/lose.mp3') };
function audioInit() {
  if (AC) { AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * .6, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function tone(f0, f1, dur, type, vol, delay = 0) {
  if (!AC || muted) return; const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, fc, delay = 0) {
  if (!AC || muted) return; const t = AC.currentTime + delay, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(fc, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, fc * .15), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
}
const lastS = {};
const gate = (k, ms) => { const n = performance.now(); if (n - (lastS[k] || 0) < ms) return false; lastS[k] = n; return true; };
const sfx = {
  shoot() { gate('s', 70) && tone(1150, 380, .06, 'square', .035); },
  hit() { gate('h', 45) && tone(260, 120, .05, 'triangle', .07); },
  kill() { gate('k', 55) && (noise(.12, .12, 2400), tone(190, 60, .12, 'sawtooth', .05)); },
  boom() { gate('b', 90) && (noise(.42, .32, 1300), tone(110, 34, .4, 'sine', .28)); },
  pick() { gate('p', 40) && tone(1300 + Math.random() * 500, 2100, .05, 'sine', .045); },
  lvl() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .16, 'triangle', .12, i * .07)); },
  dash() { noise(.2, .16, 3600); tone(300, 900, .14, 'sine', .06); },
  hurt() { tone(170, 55, .24, 'sawtooth', .2); noise(.18, .2, 800); },
  ult() { noise(.9, .4, 5000); tone(70, 28, .9, 'sine', .4); tone(700, 110, .5, 'sawtooth', .1); },
  warn() { tone(440, 440, .16, 'square', .08); tone(440, 440, .16, 'square', .08, .24); tone(620, 620, .3, 'square', .08, .48); },
  tele() { gate('t', 160) && tone(880, 760, .1, 'sine', .05); },
};

// ───────── 입력 ─────────
const keys = new Set();
const inp = { x: 0, z: 0, dash: false, ult: false };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space' || e.code === 'ShiftLeft') { inp.dash = true; e.preventDefault(); }
  if (e.code === 'KeyQ' || e.code === 'KeyE') inp.ult = true;
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (G.state === 'levelup' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) pickCard(+e.code.slice(-1) - 1);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); if (G.state === 'play') togglePause(); });
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, stickEl = $('#stick'), knob = stickEl.firstElementChild;
canvas.addEventListener('pointerdown', (e) => {
  if (G.state !== 'play' || stick.id !== null) return;
  stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0;
  stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.remove('hide'); knob.style.transform = '';
});
addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), m = 52;
  if (d > m) { dx *= m / d; dy *= m / d; }
  stick.x = dx / m; stick.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
});
const stickEnd = (e) => { if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; stickEl.classList.add('hide'); } };
addEventListener('pointerup', stickEnd); addEventListener('pointercancel', stickEnd);
const tap = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
tap($('#bDash'), () => (inp.dash = true)); tap($('#bUlt'), () => (inp.ult = true)); tap($('#bPause'), () => togglePause());
addEventListener('contextmenu', (e) => e.preventDefault());

function readMove() {
  let x = 0, z = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
  if (stick.id !== null) { x = stick.x; z = stick.y; }
  const d = Math.hypot(x, z); if (d > 1) { x /= d; z /= d; }
  inp.x = Math.abs(x) < .12 && Math.abs(z) < .12 ? 0 : x; inp.z = Math.abs(x) < .12 && Math.abs(z) < .12 ? 0 : z;
}

// ───────── 상태 ─────────
const save = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } })();
save.maxThreat ||= 1; save.best ||= {}; save.mech ||= 'mech4'; save.threat ||= 1;
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };

const G = { state: 'title', t: 0, kills: 0, threat: 1, shake: 0, slow: 0, bossOn: false, boss: null, won: false, spawnAcc: 0, ev: 0, pend: 0, endT: 0 };
const P = { group: new THREE.Group(), x: 0, z: 0, yaw: 0, r: 5 };
scene.add(P.group);
const pMark = new THREE.Mesh(new THREE.RingGeometry(7.2, 8.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x18d8ff, transparent: true, opacity: .85, depthWrite: false, toneMapped: false }));
pMark.renderOrder = 3; scene.add(pMark);
let E = [], shots = [], ebs = [], gems = [], picks = [];
let mixer = null, acts = {}, curAct = null;

function resetRun() {
  for (const d of decals) cancelDecal(d);
  E = []; shots = []; ebs = []; gems = []; picks = []; nums.length = 0;
  Object.assign(G, { t: 0, kills: 0, shake: 0, slow: 0, bossOn: false, boss: null, won: false, spawnAcc: 0, ev: 0, pend: 0, endT: 0 });
  Object.assign(P, {
    x: 0, z: 0, yaw: 0, hp: 100, maxHp: 100, inv: 0, lvl: 1, xp: 0, need: 6, spdMul: 1, cdMul: 1, crit: .05, magnet: 30, regen: 0,
    dashT: 0, dashCd: 0, dashMax: 2.6, dx: 0, dz: 1, ult: 0, flash: 0, bladeA: 0,
    w: { rifle: 1, blade: 0, missile: 0, pulse: 0, strike: 0, armor: 0, thruster: 0, magnet: 0, reactor: 0, crit: 0, repair: 0 },
    cd: { rifle: .3, missile: 1, pulse: 2, strike: 1.5 },
  });
}

// ───────── 플레이어 ─────────
async function setMech(id) {
  const g = await loadMech(id);
  while (P.group.children.length) P.group.remove(P.group.children[0]);
  P.group.add(g.scene); P.group.scale.setScalar(1.25);
  mixer = new THREE.AnimationMixer(g.scene); acts = {};
  ['idle', 'walk', 'shoot', 'run', 'slash', 'hover'].forEach((n, i) => { if (g.animations[i]) acts[n] = mixer.clipAction(g.animations[i]); });
  curAct = null; play('idle');
}
function play(n) {
  const a = acts[n] || acts.idle; if (!a || a === curAct) return;
  a.reset().fadeIn(.14).play(); if (curAct) curAct.fadeOut(.14); curAct = a;
}
const lvOf = (k) => P.w[k], st = (k, f) => UP[k][f][P.w[k] - 1];

function nearest(x, z, range, skip) {
  let best = null, bd = range * range;
  for (const e of E) { if (e.dead || e === skip) continue; const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function fire(x, z, ang, dmg, pierce, kind, tgt) {
  if (shots.length > 250) return;
  const sp = kind === 'm' ? 120 : 300;
  shots.push({ x, z, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, ang, life: kind === 'm' ? 2.6 : .62, dmg, pierce, kind, tgt, hit: null });
}
function dealDmg(e, base, kx, kz, kb = 1) {
  const cr = Math.random() < P.crit, d = Math.round(base * (cr ? 2 : 1) * rand(.9, 1.1));
  e.hp -= d; e.flash = .11;
  const m = e.T.r > 10 ? .12 : 1; e.kx += kx * 26 * kb * m; e.kz += kz * 26 * kb * m;
  if (cr || d >= 40) num(e.x, e.T.h, e.z, d, cr ? '#ffd24a' : '#fff', cr ? 19 : 15); else if (Math.random() < .22) num(e.x, e.T.h, e.z, d, '#ffffffcc', 13);
  sfx.hit();
  if (e.hp <= 0) kill(e);
}
function explode(x, z, r, dmg, color) {
  ring(x, z, r * .2, r, .35, color); burst(x, 5, z, 26, color, 70, .55, 9); burst(x, 5, z, 10, 0xffffff, 40, .3, 12);
  for (const e of E) { if (e.dead) continue; const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz); if (d < r + e.T.r) dealDmg(e, dmg, dx / (d || 1), dz / (d || 1), 1.4); }
  sfx.boom(); G.shake = Math.max(G.shake, 2.2);
}

function updPlayer(dt) {
  readMove();
  const spd = 62 * P.spdMul;
  if (inp.dash && P.dashCd <= 0) {
    P.dashT = .2; P.dashCd = P.dashMax; P.inv = Math.max(P.inv, .34);
    if (inp.x || inp.z) { const d = Math.hypot(inp.x, inp.z); P.dx = inp.x / d; P.dz = inp.z / d; }
    sfx.dash(); ring(P.x, P.z, 4, 20, .3, 0x9ff3ff);
  }
  inp.dash = false;
  if (P.dashT > 0) {
    P.dashT -= dt; P.x += P.dx * 250 * dt; P.z += P.dz * 250 * dt;
    burst(P.x, 9, P.z, 3, 0x7fe6ff, 20, .35, 9, .3);
  } else {
    P.x += inp.x * spd * dt; P.z += inp.z * spd * dt;
    if (inp.x || inp.z) { const d = Math.hypot(inp.x, inp.z); P.dx = inp.x / d; P.dz = inp.z / d; }
  }
  const pr = Math.hypot(P.x, P.z); if (pr > ARENA_R - 6) { P.x *= (ARENA_R - 6) / pr; P.z *= (ARENA_R - 6) / pr; }
  P.dashCd -= dt; P.inv -= dt; P.flash -= dt;
  if (P.regen) P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);

  // 조준: 가장 가까운 적
  const tgt = nearest(P.x, P.z, 150);
  const want = tgt ? Math.atan2(tgt.x - P.x, tgt.z - P.z) : Math.atan2(P.dx, P.dz);
  let da = want - P.yaw; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
  P.yaw += da * Math.min(1, dt * 14);
  P.group.position.set(P.x, 0, P.z); P.group.rotation.y = P.yaw; pMark.position.set(P.x, .4, P.z);
  P.group.visible = !(P.inv > 0 && P.dashT <= 0 && Math.floor(P.inv * 20) % 2 === 0);
  play(P.dashT > 0 ? 'hover' : (inp.x || inp.z) ? 'run' : tgt ? 'shoot' : 'idle');

  // 라이플
  P.cd.rifle -= dt;
  if (tgt && P.cd.rifle <= 0) {
    P.cd.rifle = st('rifle', 'cd') * P.cdMul;
    const n = st('rifle', 'n'), a0 = Math.atan2(tgt.x - P.x, tgt.z - P.z);
    for (let i = 0; i < n; i++) fire(P.x, P.z, a0 + (i - (n - 1) / 2) * .11, st('rifle', 'dmg'), st('rifle', 'pierce'), 'r');
    sfx.shoot();
  }
  // 미사일
  if (lvOf('missile')) {
    P.cd.missile -= dt;
    if (P.cd.missile <= 0 && E.length) {
      P.cd.missile = st('missile', 'cd') * P.cdMul;
      for (let i = 0; i < st('missile', 'n'); i++) fire(P.x, P.z, P.yaw + rand(-1.6, 1.6), st('missile', 'dmg'), 0, 'm', E[Math.random() * E.length | 0]);
    }
  }
  // 충격파
  if (lvOf('pulse')) {
    P.cd.pulse -= dt;
    if (P.cd.pulse <= 0) {
      P.cd.pulse = st('pulse', 'cd') * P.cdMul; const r = st('pulse', 'rad');
      ring(P.x, P.z, 6, r, .4, 0x9ff3ff); burst(P.x, 4, P.z, 14, 0x9ff3ff, 80, .35, 8, .1);
      for (const e of E) { if (e.dead) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < r + e.T.r) dealDmg(e, st('pulse', 'dmg'), dx / (d || 1), dz / (d || 1), 3.2); }
      tone(240, 70, .25, 'sine', .14);
    }
  }
  // 궤도 포격
  if (lvOf('strike')) {
    P.cd.strike -= dt;
    if (P.cd.strike <= 0 && E.length) {
      P.cd.strike = st('strike', 'cd') * P.cdMul; const dmg = st('strike', 'dmg');
      for (let i = 0; i < st('strike', 'n'); i++) {
        const near = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 130 * 130), e = near[Math.random() * near.length | 0];
        if (!e) break; const x = e.x + e.vx * .3, z = e.z + e.vz * .3;
        decal(x, z, 16, .42, 0x4adfff, () => { explode(x, z, 16, dmg, 0x7fe6ff); burst(x, 30, z, 12, 0xbff6ff, 30, .3, 14, 2); });
      }
    }
  }
  // 궤도 칼날
  if (lvOf('blade')) {
    P.bladeA += dt * 3.4; const n = st('blade', 'n'), rad = st('blade', 'rad'), dmg = st('blade', 'dmg');
    for (let i = 0; i < n; i++) {
      const a = P.bladeA + i / n * TAU, bx = P.x + Math.cos(a) * rad, bz = P.z + Math.sin(a) * rad;
      for (const e of E) {
        if (e.dead || e.bladeT > 0) continue; const dx = e.x - bx, dz = e.z - bz;
        if (dx * dx + dz * dz < (e.T.r + 5) ** 2) { e.bladeT = .32; dealDmg(e, dmg, (e.x - P.x) / rad, (e.z - P.z) / rad, 1.2); burst(e.x, 6, e.z, 3, 0xbff6ff, 40, .2, 7); }
      }
    }
  }
  // 필살기
  if (inp.ult && P.ult >= 100) {
    P.ult = 0; P.inv = Math.max(P.inv, 1.1); G.slow = .5; G.shake = 7; sfx.ult();
    ring(P.x, P.z, 8, 130, .7, 0xffcf5a); ring(P.x, P.z, 4, 90, .5, 0xffffff); burst(P.x, 10, P.z, 90, 0xffcf5a, 170, .9, 12);
    for (const e of E) { if (e.dead) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < 125) dealDmg(e, e.T.r > 10 ? 700 : 190, dx / (d || 1), dz / (d || 1), 4); }
    ebs.length = 0;
  }
  inp.ult = false;
}
function hurtPlayer(d) {
  if (P.inv > 0 || G.state !== 'play' || G.won) return;
  d = Math.round(d * (1 + .2 * (G.threat - 1)));
  P.hp -= d; P.inv = .6; G.shake = Math.max(G.shake, 4); sfx.hurt();
  $('#hurt').style.opacity = .8; setTimeout(() => ($('#hurt').style.opacity = 0), 140);
  num(P.x, 22, P.z, '-' + d, '#ff6a5a', 18); burst(P.x, 10, P.z, 14, 0xff5a4a, 60, .4, 9);
  if (P.hp <= 0) { P.hp = 0; endRun(false); }
}

function updShots(dt) {
  for (const s of shots) {
    if (s.kind === 'm') {       // 유도
      if (!s.tgt || s.tgt.dead) s.tgt = nearest(s.x, s.z, 200);
      if (s.tgt) { const want = Math.atan2(s.tgt.x - s.x, s.tgt.z - s.z); let da = want - s.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; s.ang += clamp(da, -5 * dt, 5 * dt); }
      const sp = 120 + (2.6 - s.life) * 90; s.vx = Math.sin(s.ang) * sp; s.vz = Math.cos(s.ang) * sp;
      if (Math.random() < .6) burst(s.x, 10, s.z, 1, 0xffa04a, 8, .3, 7, .2);
    }
    s.x += s.vx * dt; s.z += s.vz * dt; s.life -= dt;
    for (const e of E) {
      if (e.dead) continue; const dx = e.x - s.x, dz = e.z - s.z, rr = e.T.r + 2;
      if (dx * dx + dz * dz > rr * rr || (s.hit && s.hit.includes(e))) continue;
      if (s.kind === 'm') { explode(s.x, s.z, 17, s.dmg, 0xffa04a); s.life = 0; break; }
      dealDmg(e, s.dmg, s.vx / 300, s.vz / 300, .5); burst(s.x, 9, s.z, 3, 0x7fe6ff, 36, .2, 7);
      if (s.pierce-- > 0) (s.hit ||= []).push(e); else { s.life = 0; break; }
    }
  }
  shots = shots.filter((s) => s.life > 0);

  for (const b of ebs) {
    b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
    const dx = b.x - P.x, dz = b.z - P.z;
    if (dx * dx + dz * dz < (P.r + 2.2) ** 2) { hurtPlayer(b.dmg); b.life = 0; }
  }
  ebs = ebs.filter((b) => b.life > 0);
}

// ───────── 수집품 ─────────
function dropGem(x, z, v) {
  if (gems.length > 400) { gems[Math.random() * gems.length | 0].v += v; return; }
  gems.push({ x: x + rand(-3, 3), z: z + rand(-3, 3), v, mag: false, t: rand(0, 6) });
}
function addXp(v) {
  P.xp += v;
  while (P.xp >= P.need) { P.xp -= P.need; P.lvl++; P.need = Math.round(6 + P.lvl * 5 + P.lvl ** 1.9); G.pend++; }
}
function updPickups(dt) {
  for (const g of gems) {
    g.t += dt; const dx = P.x - g.x, dz = P.z - g.z, d = Math.hypot(dx, dz);
    if (!g.mag && d < P.magnet) g.mag = true;
    if (g.mag) { const sp = 150 + g.t * 60; g.x += dx / (d || 1) * sp * dt; g.z += dz / (d || 1) * sp * dt; if (d < 7) { g.v > 0 && addXp(g.v); g.dead = true; sfx.pick(); } }
  }
  gems = gems.filter((g) => !g.dead);
  for (const p of picks) {
    p.t += dt; const d = Math.hypot(P.x - p.x, P.z - p.z);
    if (d < 11) {
      p.dead = true;
      if (p.kind === 'heal') { P.hp = Math.min(P.maxHp, P.hp + 30); num(P.x, 24, P.z, '+30', '#7dff9a', 18); tone(520, 1040, .2, 'sine', .12); }
      else { G.pend++; G.chest = true; }
    }
  }
  picks = picks.filter((p) => !p.dead);
}

// ───────── 강화 선택 ─────────
let cardKeys = [];
function openLevelUp() {
  const pool = Object.keys(UP).filter((k) => P.w[k] < UP[k].max);
  cardKeys = [];
  while (cardKeys.length < 3 && pool.length) {
    let tot = 0; const wts = pool.map((k) => (tot += (P.w[k] > 0 ? 1.7 : 1) * (UP[k].kind === 'w' ? 1.25 : 1)));
    const r = Math.random() * tot, i = wts.findIndex((w) => r < w); cardKeys.push(pool.splice(i, 1)[0]);
  }
  if (!cardKeys.length) cardKeys = ['_heal'];
  $('#lvlT').textContent = G.chest ? '전리품' : `레벨 ${P.lvl}`;
  $('#lvlS').textContent = G.chest ? '거대 개체의 잔해에서 강화를 얻었습니다' : '강화 하나를 고르세요';
  G.chest = false;
  const box = $('#cards'); box.innerHTML = '';
  cardKeys.forEach((k, i) => {
    const u = UP[k], lv = k === '_heal' ? 0 : P.w[k], b = document.createElement('button'); b.className = 'card';
    b.innerHTML = k === '_heal'
      ? `<div class="ic">✚</div><div class="nm">긴급 수리</div><div class="ds">내구 40 회복</div>`
      : `<div class="ic">${u.ic}</div><div class="lvt ${lv ? '' : 'new'}">${lv ? `Lv ${lv} → ${lv + 1}` : '새 장비'}</div><div class="nm">${u.nm}</div><div class="ds">${u.ds[Math.min(lv, u.ds.length - 1)]}</div><kbd>${i + 1}</kbd>`;
    b.addEventListener('click', () => pickCard(i)); box.appendChild(b);
  });
  G.state = 'levelup'; $('#lvl').classList.remove('hide'); sfx.lvl(); keys.clear(); stickEnd({ pointerId: stick.id });
}
function pickCard(i) {
  const k = cardKeys[i]; if (!k || G.state !== 'levelup') return;
  if (k === '_heal') P.hp = Math.min(P.maxHp, P.hp + 40);
  else {
    P.w[k]++;
    if (k === 'armor') { P.maxHp += 25; P.hp = Math.min(P.maxHp, P.hp + 25); }
    if (k === 'thruster') { P.spdMul *= 1.09; P.dashMax *= .9; }
    if (k === 'magnet') P.magnet *= 1.45;
    if (k === 'reactor') P.cdMul *= .93;
    if (k === 'crit') P.crit += .1;
    if (k === 'repair') P.regen += .7;
  }
  G.pend--; $('#lvl').classList.add('hide'); G.state = 'play'; P.inv = Math.max(P.inv, .5); drawSlots();
  ring(P.x, P.z, 4, 40, .4, 0xffcf5a);
}
function drawSlots() {
  $('#slots').innerHTML = Object.keys(UP).filter((k) => P.w[k] > 0).map((k) => `<div class="slot">${UP[k].ic}<b>${P.w[k]}</b></div>`).join('');
}

// ───────── 적 ─────────
function spawn(type, x, z) {
  const T = ET[type]; let n = 0; for (const e of E) if (e.t === type) n++;
  if (n >= T.max) return null;
  const tm = Math.min(G.t, RUN_TIME) / 60, hs = (1 + .5 * tm + .13 * tm * tm) * (1 + .35 * (G.threat - 1));
  const e = { t: type, T, x, z, vx: 0, vz: 0, kx: 0, kz: 0, yaw: 0, hp: T.hp * (T.r > 10 ? 1 + .35 * (G.threat - 1) : hs), flash: 0, bladeT: 0,
    st: 'move', tm: rand(1, 3), ph: rand(0, 6), sc: 1, born: .35, sm: (1 + .05 * tm) * rand(.92, 1.1) };
  e.max = e.hp; E.push(e); return e;
}
function spawnPos(dMin, dMax) {
  for (let i = 0; i < 8; i++) {
    const a = rand(0, TAU), d = rand(dMin, dMax) * camScale; let x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
    const r = Math.hypot(x, z); if (r > ARENA_R - 8) { x *= (ARENA_R - 8) / r; z *= (ARENA_R - 8) / r; }
    if ((x - P.x) ** 2 + (z - P.z) ** 2 > (dMin * .8) ** 2) return [x, z];
  }
  const a = Math.atan2(-P.z, -P.x); return [P.x + Math.cos(a) * dMin, P.z + Math.sin(a) * dMin];
}
function pickType() {
  const t = G.t, w = [['ling', 6]];
  if (t > 35) w.push(['roach', 1.5]); if (t > 75) w.push(['bane', 1.5]); if (t > 120) w.push(['plasma', 1.1]); if (t > 165) w.push(['lurk', 1]);
  let tot = 0; for (const a of w) tot += a[1]; let r = Math.random() * tot;
  for (const a of w) { if ((r -= a[1]) < 0) return a[0]; } return 'ling';
}
function banner(txt, ms = 2200) { const b = $('#banner'); b.textContent = txt; b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), ms); }

const EVENTS = [
  [55, () => { banner('무리 습격'); sfx.warn(); swarm(22); }],
  [105, () => { banner('거대 개체 접근'); sfx.warn(); const [x, z] = spawnPos(170, 190); spawn('behemoth', x, z); }],
  [150, () => { banner('무리 습격'); sfx.warn(); swarm(30); }],
  [210, () => { banner('거대 개체 접근'); sfx.warn(); for (let i = 0; i < 2; i++) { const [x, z] = spawnPos(170, 190); spawn('behemoth', x, z); } }],
  [250, () => { banner('무리 습격'); sfx.warn(); swarm(38); }],
  [RUN_TIME, () => { banner('여왕 출현', 3000); sfx.warn(); const [x, z] = spawnPos(150, 170); G.boss = spawn('queen', x, z); G.bossOn = true; $('#boss').classList.remove('hide'); G.shake = 5; }],
];
function swarm(n) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, d = 150 * camScale; let x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
    const r = Math.hypot(x, z); if (r > ARENA_R - 8) { x *= (ARENA_R - 8) / r; z *= (ARENA_R - 8) / r; }
    spawn('ling', x, z);
  }
}
function updSpawner(dt) {
  while (G.ev < EVENTS.length && G.t >= EVENTS[G.ev][0]) EVENTS[G.ev++][1]();
  let rate = (1.5 + Math.min(G.t, RUN_TIME) / 60 * 1.05) * (1 + .15 * (G.threat - 1));   // 초당 무리 수
  if (G.bossOn) rate *= .3;
  G.spawnAcc += rate * dt;
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1; if (E.length >= MAX_ALIVE) continue;
    const [x, z] = spawnPos(140, 175), ty = pickType();
    if (ty === 'ling') for (let i = 0; i < 3; i++) spawn('ling', x + rand(-9, 9), z + rand(-9, 9)); else spawn(ty, x, z);
  }
}
function eShot(x, z, ang, sp, dmg, life = 5) { if (ebs.length < 270) ebs.push({ x, z, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, dmg, life }); }

function kill(e) {
  if (e.dead) return; e.dead = true; cancelDecal(e.dec); e.dec = null;
  const T = e.T; G.kills++;
  burst(e.x, T.h * .5, e.z, T.r > 10 ? 70 : 12, T.col, T.r > 10 ? 130 : 60, T.r > 10 ? .9 : .45, T.r > 10 ? 14 : 9);
  if (T.r > 10) {
    ring(e.x, e.z, 6, 70, .6, T.col); sfx.boom(); G.shake = 6; G.slow = .35; P.ult = Math.min(100, P.ult + 25);
    if (e.t === 'queen') { win(); return; }
    picks.push({ kind: 'chest', x: e.x, z: e.z, t: 0 }); picks.push({ kind: 'heal', x: e.x + 12, z: e.z + 6, t: 0 });
    for (let i = 0; i < 14; i++) dropGem(e.x + rand(-14, 14), e.z + rand(-14, 14), 3);
  } else {
    sfx.kill(); P.ult = Math.min(100, P.ult + (G.bossOn ? 1.6 : 1.1));
    dropGem(e.x, e.z, T.xp); if (Math.random() < .008) picks.push({ kind: 'heal', x: e.x, z: e.z, t: 0 });
  }
}

function updEnemies(dt) {
  const n = E.length;
  for (let i = 0; i < n; i++) {
    const e = E[i]; if (e.dead) continue; const T = e.T;
    const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    let mx = ux, mz = uz, sp = T.spd * e.sm; e.tm -= dt; e.flash -= dt; e.bladeT -= dt; e.born -= dt; e.ph += dt;

    if (e.t === 'bane') {
      if (e.st === 'move' && d < 20) { e.st = 'fuse'; e.tm = .7; e.dec = decal(e.x, e.z, 22, .7, 0xff5a2a); sfx.tele(); }
      if (e.st === 'fuse') {
        sp = 0; e.sc = 1 + (.7 - e.tm) * .9;
        if (e.tm <= 0) {
          const x = e.x, z = e.z; e.dec = null; e.dead = true; G.kills++;
          ring(x, z, 5, 22, .3, 0xff7a3a); burst(x, 5, z, 30, 0xff7a3a, 80, .5, 10); sfx.boom(); G.shake = Math.max(G.shake, 2.5);
          if (Math.hypot(P.x - x, P.z - z) < 22 + P.r) hurtPlayer(T.dmg);
          for (const o of E) { if (o.dead || o === e) continue; const q = Math.hypot(o.x - x, o.z - z); if (q < 22 + o.T.r) dealDmg(o, 45, (o.x - x) / (q || 1), (o.z - z) / (q || 1), 2); }
          dropGem(x, z, T.xp); continue;
        }
      }
    } else if (e.t === 'plasma') {
      if (d < 62) { mx = -ux; mz = -uz; sp *= .7; } else if (d < 92) { mx = -uz; mz = ux; sp *= .5; }
      if (e.tm <= 0 && d < 150) { e.tm = 2.8; e.st = 'cast'; e.ct = .45; }
      if (e.st === 'cast') { sp = 0; e.flash = .05; e.ct -= dt; if (e.ct <= 0) { e.st = 'move'; eShot(e.x, e.z, Math.atan2(dx, dz), 66, T.dmg); tone(520, 300, .12, 'sine', .05); } }
    } else if (e.t === 'lurk') {
      if (e.st === 'move' && d < 78 && e.tm <= 0) { e.st = 'aim'; e.tm = .8; e.ang = Math.atan2(dx, dz); e.dec = lineDecal(e.x, e.z, e.ang, 125, 10, .8, 0xff4a4a); sfx.tele(); }
      if (e.st === 'aim') { sp = 0; if (e.tm <= 0) { e.st = 'dash'; e.tm = .62; e.dec = null; } }
      if (e.st === 'dash') { mx = Math.sin(e.ang); mz = Math.cos(e.ang); sp = 200; burst(e.x, 4, e.z, 1, 0xff4a6a, 14, .3, 8); if (e.tm <= 0) { e.st = 'move'; e.tm = 1.6; } }
    } else if (e.t === 'behemoth') {
      if (e.st === 'move' && e.tm <= 0 && d < 70) { e.st = 'stomp'; e.tm = 1.05; e.dec = decal(e.x, e.z, 40, 1.05, 0xff5a2a); sfx.tele(); }
      if (e.st === 'stomp') {
        sp = 0; e.sc = 1 + Math.sin((1.05 - e.tm) * 3) * .12;
        if (e.tm <= 0) { e.st = 'move'; e.tm = 4.2; e.sc = 1; e.dec = null; ring(e.x, e.z, 8, 40, .35, 0xff7a3a); burst(e.x, 3, e.z, 40, 0xffb04a, 90, .5, 11); sfx.boom(); G.shake = 4; if (d < 40 + P.r) hurtPlayer(26); }
      }
    } else if (e.t === 'queen') { sp = queenAI(e, dt, d, dx, dz); if (e.st === 'dash') { mx = Math.sin(e.ang); mz = Math.cos(e.ang); } }

    // 서로 밀어내기
    for (let j = i + 1; j < n; j++) {
      const o = E[j]; if (o.dead) continue; const qx = o.x - e.x, qz = o.z - e.z, rr = T.r + o.T.r;
      if (Math.abs(qx) > rr || Math.abs(qz) > rr) continue; const q2 = qx * qx + qz * qz; if (q2 >= rr * rr || q2 < .0001) continue;
      const q = Math.sqrt(q2), push = (rr - q) * .5, px = qx / q * push, pz = qz / q * push, we = o.T.r / rr, wo = T.r / rr;
      e.x -= px * we; e.z -= pz * we; o.x += px * wo; o.z += pz * wo;
    }
    e.vx = mx * sp; e.vz = mz * sp;
    e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt; const kd = Math.max(0, 1 - 8 * dt); e.kx *= kd; e.kz *= kd;
    const er = Math.hypot(e.x, e.z); if (er > ARENA_R - 4) { e.x *= (ARENA_R - 4) / er; e.z *= (ARENA_R - 4) / er; }
    if (e.st !== 'fuse' && e.st !== 'stomp' && sp > 0) { const want = Math.atan2(mx, mz); let da = want - e.yaw; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; e.yaw += da * Math.min(1, dt * 9); }
    // 접촉 피해
    if (d < T.r + P.r && e.born <= 0 && e.t !== 'bane') hurtPlayer(e.st === 'dash' ? T.dmg * 1.3 : T.dmg);
  }
  E = E.filter((e) => !e.dead);
}

// 여왕: 탄막 고리 → 지면 포격 → 돌진 → 소환을 번갈아 쓴다
function queenAI(e, dt, d, dx, dz) {
  const rage = e.hp < e.max * .4, T = e.T;
  if (e.st === 'move') {
    if (e.tm <= 0) {
      e.pat = ((e.pat ?? -1) + 1) % 4; const p = e.pat;
      if (p === 0) { e.st = 'ring'; e.tm = rage ? 1.5 : 1.1; e.cnt = 0; e.ct = 0; }
      else if (p === 1) { e.st = 'rain'; e.tm = 1.6; e.cnt = 0; e.ct = 0; }
      else if (p === 2) { e.st = 'aim'; e.tm = .95; e.ang = Math.atan2(dx, dz); e.dec = lineDecal(e.x, e.z, e.ang, 210, 30, .95, 0xff4a8a); sfx.tele(); }
      else { e.st = 'summon'; e.tm = .8; banner('소환', 900); }
    }
    return d < 34 ? 0 : T.spd * (rage ? 1.3 : 1);
  }
  if (e.st === 'ring') {
    e.ct -= dt;
    if (e.ct <= 0) { e.ct = .5; const n = rage ? 22 : 16, off = e.cnt++ * .2; for (let i = 0; i < n; i++) eShot(e.x, e.z, off + i / n * TAU, 58, 12, 6); tone(300, 160, .2, 'sawtooth', .07); ring(e.x, e.z, 10, 30, .3, 0xff7ac4); }
    if (e.tm <= 0) { e.st = 'move'; e.tm = rage ? 1 : 1.6; }
    return 0;
  }
  if (e.st === 'rain') {
    e.ct -= dt;
    if (e.ct <= 0 && e.cnt < (rage ? 7 : 5)) {
      e.ct = .28; e.cnt++; const x = P.x + inp.x * 34 + rand(-16, 16), z = P.z + inp.z * 34 + rand(-16, 16);
      decal(x, z, 22, .85, 0xff4a8a, () => { ring(x, z, 4, 22, .3, 0xff7ac4); burst(x, 4, z, 22, 0xff7ac4, 70, .45, 10); sfx.boom(); if (Math.hypot(P.x - x, P.z - z) < 22 + P.r) hurtPlayer(20); }); sfx.tele();
    }
    if (e.tm <= 0) { e.st = 'move'; e.tm = rage ? .9 : 1.5; }
    return T.spd * .5;
  }
  if (e.st === 'aim') { if (e.tm <= 0) { e.st = 'dash'; e.tm = .7; e.dec = null; sfx.dash(); } return 0; }
  if (e.st === 'dash') { burst(e.x, 6, e.z, 3, 0xff7ac4, 30, .4, 12); if (e.tm <= 0) { e.st = 'move'; e.tm = rage ? .8 : 1.4; G.shake = 3; } return 300; }
  if (e.st === 'summon') {
    if (e.tm <= 0) { const n = rage ? 12 : 8; for (let i = 0; i < n; i++) { const a = i / n * TAU; spawn(i % 4 === 0 ? 'bane' : 'ling', e.x + Math.cos(a) * 30, e.z + Math.sin(a) * 30); } ring(e.x, e.z, 8, 40, .4, 0x9be05a); e.st = 'move'; e.tm = 1.4; }
    return 0;
  }
  return T.spd;
}

// ───────── 진행 ─────────
function win() {
  G.won = true; G.slow = 1.6; G.shake = 10; ebs.length = 0; $('#boss').classList.add('hide');
  for (const e of E) if (!e.dead && e.t !== 'queen') { e.dead = true; cancelDecal(e.dec); burst(e.x, 5, e.z, 8, e.T.col, 60, .5, 9); }
  for (const d of decals) cancelDecal(d);
  ring(P.x, P.z, 10, 260, 1.4, 0xffcf5a); G.endT = 2.2;
}
function endRun(won) {
  G.state = 'over'; music.pause(); stickEnd({ pointerId: stick.id });
  if (!muted) { const j = jingle[won ? 'win' : 'lose']; j.currentTime = 0; j.volume = .6; j.play().catch(() => { }); }
  const key = `${G.threat}`, prev = save.best[key] || { t: 0, k: 0, w: 0 };
  const better = (won && !prev.w) || (won === !!prev.w && (won ? G.t < prev.t : G.t > prev.t));
  if (better) save.best[key] = { t: Math.round(G.t), k: G.kills, w: won ? 1 : 0 };
  if (won && G.threat >= save.maxThreat) save.maxThreat = G.threat + 1;
  persist();
  $('#ovT').textContent = won ? '여왕 격파' : '기체 대파'; $('#ovT').style.color = won ? '#ffd27a' : '#ff6a5a';
  $('#newrec').classList.toggle('hide', !better);
  $('#stats').innerHTML = `<span>생존 시간</span><b>${fmt(G.t)}</b><span>격파</span><b>${G.kills}</b><span>레벨</span><b>${P.lvl}</b><span>위험도</span><b>${G.threat}</b>`
    + (won && G.threat + 1 === save.maxThreat ? `<span style="grid-column:1/3;color:#9ff3ff;margin-top:6px">위험도 ${G.threat + 1} 해금</span>` : '');
  setTimeout(() => $('#over').classList.remove('hide'), won ? 300 : 700);
  $('#hud').classList.add('hide');
}
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; $('#pause').classList.remove('hide'); music.pause(); }
  else if (G.state === 'pause') { G.state = 'play'; $('#pause').classList.add('hide'); if (!muted) music.play().catch(() => { }); last = performance.now(); }
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function startRun() {
  audioInit(); $('#start').disabled = true;
  G.threat = save.threat; resetRun(); await setMech(save.mech);
  MECHS.find((m) => m.id === save.mech).init(P);
  $('#title').classList.add('hide'); $('#over').classList.add('hide'); $('#hud').classList.remove('hide'); $('#boss').classList.add('hide');
  $('#btns').style.display = ''; drawSlots(); G.state = 'play'; last = performance.now();
  music.currentTime = 0; if (!muted) music.play().catch(() => { });
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; spawn('ling', Math.cos(a) * 105, Math.sin(a) * 105); }
  banner('5분을 버텨라', 1800); $('#start').disabled = false;
}

// ───────── 그리기 ─────────
function drawInstances(time) {
  const cnt = {}; for (const k in ET) cnt[k] = 0; let sh = 0;
  const put = (x, z, r) => { if (sh >= 180) return; dummy.position.set(x, .25, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(r, 1, r); dummy.updateMatrix(); imShadow.setMatrixAt(sh++, dummy.matrix); };
  put(P.x, P.z, 7);
  for (const e of E) {
    const im = IM[e.t], i = cnt[e.t]++; if (i >= e.T.max) continue;
    const big = e.T.r > 10, moving = e.st === 'move' || e.st === 'dash';
    const hop = moving ? Math.abs(Math.sin(e.ph * (big ? 4 : 9))) * (big ? 1.2 : 1.6) : 0;
    const grow = e.born > 0 ? 1 - e.born / .35 * .7 : 1, sq = e.flash > 0 ? 1.12 : 1;
    dummy.position.set(e.x, hop, e.z); dummy.rotation.set(moving ? .12 : 0, e.yaw + e.T.yaw, Math.sin(e.ph * 7) * (big ? .02 : .07));
    dummy.scale.set(e.sc * grow * sq, e.sc * grow * (2 - sq), e.sc * grow * sq); dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
    im.setColorAt(i, e.flash > 0 ? tmpC.setRGB(4, 4, 4) : e.st === 'fuse' ? tmpC.setRGB(2.4, .8, .5) : tmpC.setRGB(1, 1, 1));
    put(e.x, e.z, e.T.r * 1.15);
  }
  for (const k in ET) { IM[k].count = Math.min(cnt[k], ET[k].max); IM[k].instanceMatrix.needsUpdate = true; IM[k].instanceColor.needsUpdate = true; }
  imShadow.count = sh; imShadow.instanceMatrix.needsUpdate = true;

  let i = 0;
  for (const s of shots) {
    if (i >= 260) break; dummy.position.set(s.x, 10, s.z); dummy.rotation.set(0, s.ang, 0); dummy.scale.setScalar(s.kind === 'm' ? 1.5 : 1); dummy.updateMatrix();
    imShot.setMatrixAt(i, dummy.matrix); imShot.setColorAt(i++, s.kind === 'm' ? tmpC.setRGB(1, .45, .1) : tmpC.setRGB(.1, .75, 1));
  }
  imShot.count = i; imShot.instanceMatrix.needsUpdate = true; imShot.instanceColor.needsUpdate = true;

  i = 0;
  for (const b of ebs) { if (i >= 280) break; dummy.position.set(b.x, 8, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1 + Math.sin(time * 12 + b.x) * .12); dummy.updateMatrix(); imEB.setMatrixAt(i, dummy.matrix); imEB.setColorAt(i++, tmpC.setRGB(.95, .1, .6)); }
  imEB.count = i; imEB.instanceMatrix.needsUpdate = true; imEB.instanceColor.needsUpdate = true;

  i = 0;
  for (const g of gems) { if (i >= 400) break; dummy.position.set(g.x, 3 + Math.sin(g.t * 4) * .8, g.z); dummy.rotation.set(0, g.t * 3, 0); dummy.scale.setScalar(g.v >= 3 ? 1.5 : 1); dummy.updateMatrix(); imGem.setMatrixAt(i, dummy.matrix); imGem.setColorAt(i++, g.v >= 3 ? tmpC.setRGB(1, .55, 0) : tmpC.setRGB(0, .5, 1)); }
  for (const p of picks) { if (i >= 420) break; dummy.position.set(p.x, 6 + Math.sin(p.t * 3) * 1.5, p.z); dummy.rotation.set(0, p.t * 2, 0); dummy.scale.setScalar(p.kind === 'chest' ? 4.2 : 2.6); dummy.updateMatrix(); imGem.setMatrixAt(i, dummy.matrix); imGem.setColorAt(i++, p.kind === 'chest' ? tmpC.setRGB(1, .6, 0) : tmpC.setRGB(.05, .85, .3)); }
  imGem.count = i; imGem.instanceMatrix.needsUpdate = true; imGem.instanceColor.needsUpdate = true;

  i = 0;
  if (G.state !== 'title' && P.w && P.w.blade) {
    const n = st('blade', 'n'), rad = st('blade', 'rad');
    for (; i < n; i++) { const a = P.bladeA + i / n * TAU; dummy.position.set(P.x + Math.cos(a) * rad, 9, P.z + Math.sin(a) * rad); dummy.rotation.set(0, -a + time * 9, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); imBlade.setMatrixAt(i, dummy.matrix); }
  }
  imBlade.count = i; imBlade.instanceMatrix.needsUpdate = true;
}

function draw2d(dt) {
  ctx2.clearRect(0, 0, W, H); ctx2.textAlign = 'center'; ctx2.lineJoin = 'round';
  for (const n of nums) {
    n.t += dt; v3.set(n.x, n.y + n.t * 16, n.z).project(cam); if (v3.z > 1) continue;
    const x = (v3.x * .5 + .5) * W + n.ox, y = (-v3.y * .5 + .5) * H, a = clamp(1.6 - n.t * 2.2, 0, 1);
    ctx2.globalAlpha = a; ctx2.font = `800 ${n.size * (n.t < .08 ? 1.5 : 1)}px system-ui,sans-serif`;
    ctx2.lineWidth = 3; ctx2.strokeStyle = '#000b'; ctx2.strokeText(n.txt, x, y); ctx2.fillStyle = n.color; ctx2.fillText(n.txt, x, y);
  }
  while (nums.length && nums[0].t > .75) nums.shift();
  ctx2.globalAlpha = 1;
  for (const e of E) {          // 거대 개체 내구
    if (e.t !== 'behemoth') continue; v3.set(e.x, e.T.h + 6, e.z).project(cam);
    const x = (v3.x * .5 + .5) * W, y = (-v3.y * .5 + .5) * H; ctx2.fillStyle = '#000a'; ctx2.fillRect(x - 31, y - 1, 62, 7);
    ctx2.fillStyle = '#ffb04a'; ctx2.fillRect(x - 30, y, 60 * clamp(e.hp / e.max, 0, 1), 5);
  }
  for (const p of picks) {      // 화면 밖 전리품 방향
    v3.set(p.x, 6, p.z).project(cam); if (Math.abs(v3.x) < 1 && Math.abs(v3.y) < 1) continue;
    const a = Math.atan2(-v3.y, v3.x), x = W / 2 + Math.cos(a) * (W / 2 - 34), y = H / 2 + Math.sin(a) * (H / 2 - 34);
    ctx2.fillStyle = p.kind === 'chest' ? '#ffcf5a' : '#7dff9a'; ctx2.beginPath(); ctx2.arc(x, y, 7, 0, TAU); ctx2.fill();
  }
}

let hudT = 0;
function drawHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = .08;
  $('#xpfill').style.width = clamp(P.xp / P.need * 100, 0, 100) + '%';
  $('#lv').textContent = 'Lv ' + P.lvl;
  $('#time').textContent = G.bossOn ? '결전' : fmt(Math.max(0, RUN_TIME - G.t));
  $('#kills').textContent = '격파 ' + G.kills;
  $('#hpfill').style.width = clamp(P.hp / P.maxHp * 100, 0, 100) + '%';
  $('#hptxt').textContent = `${Math.ceil(P.hp)} / ${P.maxHp}`;
  $('#bDash').firstElementChild.style.height = clamp(P.dashCd / P.dashMax, 0, 1) * 100 + '%';
  $('#bUlt').firstElementChild.style.height = P.ult + '%'; $('#bUlt').classList.toggle('ready', P.ult >= 100);
  if (G.boss) $('#bossfill').style.width = clamp(G.boss.hp / G.boss.max * 100, 0, 100) + '%';
}

// ───────── 루프 ─────────
function step(dt, raw) {
  if (G.state === 'play') {
    if (!G.won) { G.t += dt; updSpawner(dt); }
    updPlayer(dt); updEnemies(dt); updShots(dt); updPickups(dt); updDecals(dt);
    if (G.won) { G.endT -= raw; if (G.endT <= 0) endRun(true); }
    else if (G.pend > 0 && G.state === 'play') openLevelUp();
    drawHud(dt);
  }
  if (G.state !== 'pause' && G.state !== 'levelup') { updRings(dt); updParticles(dt); if (mixer) mixer.update(dt); }
}
let last = performance.now(), ema = 16, slowT = 0;
const camPos = new THREE.Vector3(0, 104, 73);
function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(.05, (now - last) / 1000); last = now;
  ema = lerp(ema, raw * 1000, .05);
  if (G.state === 'play') {     // 느리면 품질을 낮춘다
    slowT = ema > 27 ? slowT + raw : 0;
    if (slowT > 3) { slowT = 0; if (bloomOn) bloomOn = false; else if (pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - .5); resize(); } }
  }
  let dt = raw;
  if (G.slow > 0) { G.slow -= raw; dt *= .3; }
  const time = now / 1000;

  step(dt, raw);

  G.shake = Math.max(0, G.shake - raw * 14);
  const tx = P.x + rand(-1, 1) * G.shake, tz = P.z + rand(-1, 1) * G.shake;
  cam.position.set(tx + camPos.x, camPos.y * camScale, tz + camPos.z * camScale); cam.lookAt(tx, 7, tz - 6);

  if (G.state !== 'title') { drawInstances(time); draw2d(G.state === 'play' ? dt : 0); }
  if (bloomOn && composer) composer.render(); else renderer.render(scene, cam);
}

// ───────── 첫 화면 ─────────
function drawTitle() {
  const box = $('#mechs'); box.innerHTML = '';
  for (const m of MECHS) {
    const b = document.createElement('button'); b.className = 'mech' + (m.id === save.mech ? ' on' : '');
    b.innerHTML = `<img src="img/${m.id}.jpg" alt=""><strong>${m.nm}</strong><em>${m.tag}</em>`;
    b.addEventListener('click', () => { save.mech = m.id; persist(); drawTitle(); loadMech(m.id); }); box.appendChild(b);
  }
  save.threat = clamp(save.threat, 1, save.maxThreat); $('#thV').textContent = save.threat;
  const r = save.best[save.threat];
  $('#rec').textContent = r ? `위험도 ${save.threat} 최고 기록 — ${r.w ? '격파 ' : '생존 '}${fmt(r.t)} · 격파 ${r.k}` : '';
  $('#thUp').style.opacity = save.threat < save.maxThreat ? 1 : .3; $('#thDn').style.opacity = save.threat > 1 ? 1 : .3;
}
$('#thUp').addEventListener('click', () => { save.threat = Math.min(save.maxThreat, save.threat + 1); persist(); drawTitle(); });
$('#thDn').addEventListener('click', () => { save.threat = Math.max(1, save.threat - 1); persist(); drawTitle(); });
$('#start').addEventListener('click', startRun);
$('#retry').addEventListener('click', startRun);
$('#toTitle').addEventListener('click', () => { $('#over').classList.add('hide'); $('#title').classList.remove('hide'); G.state = 'title'; drawTitle(); });
$('#resume').addEventListener('click', togglePause);
$('#quit').addEventListener('click', () => { $('#pause').classList.add('hide'); $('#hud').classList.add('hide'); $('#title').classList.remove('hide'); G.state = 'title'; music.pause(); drawTitle(); });
$('#mute').addEventListener('click', (e) => { muted = !muted; e.target.textContent = muted ? '소리 켜기' : '소리 끄기'; });

(async function boot() {
  drawTitle();
  const jobs = [buildTerrain(), loadMech(save.mech), loadModel('blade', 'd_blade', 2.6, 0), loadModel('rock', 'p_rock2', 22, 0), loadModel('crystal', 'p_crystal', 20, 0)];
  for (const k in ET) jobs.push(loadModel(k, ET[k].file, ET[k].h, 0));
  let done = 0; jobs.forEach((j) => j.then(() => ($('#load').textContent = `불러오는 중 ${Math.round(++done / jobs.length * 100)}%`)));
  try {
    await Promise.all(jobs); buildPools(); buildParticles(); resetRun(); await setMech(save.mech);
    $('#load').classList.add('hide'); $('#start').disabled = false;
  } catch (e) { $('#load').textContent = '자료를 불러오지 못했습니다. 새로고침해 주세요.'; console.error(e); }
  requestAnimationFrame(frame);
})();

if (location.search.includes('dev')) window.__g = { G, P, ET, UP, inp, keys, stick, get ebs() { return ebs; }, get cards() { return cardKeys; }, sim(sec, auto, bot) { for (let t = 0; t < sec && G.state !== 'over'; t += 1 / 30) { if (G.state === 'levelup') { if (auto) pickCard(typeof auto === 'function' ? auto() : 0); else break; } bot && bot(); step(1 / 30, 1 / 30); } }, get E() { return E; }, spawn, kill, endRun, addXp, pickCard, startRun };
