// ASCEND 라스트 스탠드 — 기동전사 서바이벌
// 구성: 설정 → 화면(렌더러·지형) → 자료 불러오기 → 그리기 풀 → 소리 → 입력 → 플레이어·강화 → 적 → 진행 → 루프
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
window.THREE = THREE;      // ASCEND 엔진(미사일·변신·폭발)이 같은 THREE를 쓴다

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

// ───────── 기체 13종 (ASCEND 본편 MECHS·LOADOUT·PRIM·KIT 자료) ─────────
// hp·dmg·spd·cd: 본편 능력치 배율 / arm: 손에 드는 무기 / off: 왼팔 장비 / prim: 기본 무기 방식(본편 PRIM)
// auto: 재사용마다 스스로 쓰는 스킬(본편 KIT q/e) / ult: 필살기 Q(본편 KIT r) / cost: 해금에 드는 코어 / req: 이겨야 하는 위험도
const MECHS = [
  { id: 'mech4', nm: '발레리안', ty: '기동형 · 권총·방패', hp: 1.0, dmg: 1.0, spd: 1.12, cd: .97, arm: 'pistol', off: 'shield', prim: 'pistol', cost: 0,
    pass: '대시 재사용 -40% · 장갑 +20', auto: { k: 'flash', nm: '섬광 돌격', ic: '⚡', cd: 7 }, ult: { k: 'bladefall', nm: '천검 낙하', ic: '🗡️' },
    init(p) { p.dashMax *= .6; p.maxHp += 20; } },
  { id: 'm_samurai', nm: '인퀴지터', ty: '근접형 · 카타나', hp: 1.05, dmg: 1.15, spd: 1.05, cd: .92, arm: 'katana', prim: 'katana', cost: 0,
    pass: '근접 피해 +25% · 불꽃 드론으로 시작', auto: { k: 'iaido', nm: '발도', ic: '💫', cd: 6 }, ult: { k: 'tenzan', nm: '천섬', ic: '🌙' },
    init(p) { p.meleeMul = 1.25; p.w.blade = 1; } },
  { id: 'm_striker', nm: '오리온', ty: '사격형 · 레이저 소총', hp: .95, dmg: 1.1, spd: 1.1, cd: .95, arm: 'rifle', prim: 'rifle', cost: 0,
    pass: '치명타 +10% · 소총 2단계로 시작', auto: { k: 'overdrive', nm: '과충전', ic: '🔋', cd: 9 }, ult: { k: 'laserstorm', nm: '레이저 폭풍', ic: '✴️' },
    init(p) { p.w.rifle = 2; p.crit += .1; } },
  { id: 'mech3', nm: '세이버 「불사조」', ty: '균형형 · 빔 세이버', hp: 1, dmg: 1, spd: 1, cd: 1, arm: 'saber', prim: 'saber', cost: 500,
    pass: '가까이선 베고 멀면 손바닥 레이저 · 필살 게이지 +20%', auto: { k: 'palm', nm: '손바닥 레이저', ic: '✋', cd: 5 }, ult: { k: 'phoenix', nm: '불사조 일섬', ic: '🔥' },
    init(p) { p.ultGain = 1.2; } },
  { id: 'm_guardian', nm: '가디언', ty: '방어형 · 산탄 캐논', hp: 1.35, dmg: .92, spd: .9, cd: 1, arm: 'cannon', off: 'shield', prim: 'shotgun', cost: 400,
    pass: '받는 피해 -20% · 가까울수록 강함', auto: { k: 'bash', nm: '방패 돌진', ic: '🛡️', cd: 6 }, ult: { k: 'aegis', nm: '수호 결계', ic: '💠' },
    init(p) { p.taken = .8; } },
  { id: 'm_titan', nm: '타이탄', ty: '초중량형 · 회전 기관포', hp: 1.5, dmg: 1.05, spd: .8, cd: 1.05, arm: 'gatling', prim: 'gatling', cost: 400,
    pass: '초당 내구 1% 회복 · 쏘수록 빨라짐', auto: { k: 'quake', nm: '지면 강타', ic: '🌋', cd: 6 }, ult: { k: 'titanfall', nm: '타이탄 낙하', ic: '☄️' },
    init(p) { p.regen += p.maxHp * .01; } },
  { id: 'm_ranger', nm: '레인저', ty: '저격형 · 레일 저격총', hp: .85, dmg: 1.12, spd: 1, cd: 1, arm: 'rail', prim: 'rail', cost: 600,
    pass: '멈춰 있으면 피해 +30% · 한 줄을 모두 꾰뚫는다', auto: { k: 'backstep', nm: '후방 도약', ic: '↩️', cd: 7 }, ult: { k: 'satsnipe', nm: '위성 저격', ic: '🛰️' },
    init(p) { p.stillMul = 1.3; } },
  { id: 'm_artillery', nm: '아틸러리', ty: '포격형 · 곡사포·해머', hp: 1.1, dmg: 1.1, spd: .85, cd: 1, arm: 'hammer', prim: 'mortar', cost: 600,
    pass: '포탄이 넓게 터진다 · 어깨 곡사포', auto: { k: 'mortar3', nm: '박격포 3연발', ic: '💣', cd: 5 }, ult: { k: 'carpet', nm: '융단 포격', ic: '🎆' },
    init(p) { p.splash = 1.3; } },
  { id: 'm_sky', nm: '스카이', ty: '비행형 · 유도 미사일', hp: .9, dmg: 1.05, spd: 1.25, cd: .95, arm: 'rifle', prim: 'homing', cost: 800,
    pass: '비행 재사용 대기 거의 없음 · 이동 +10%', auto: { k: 'dive', nm: '급강하 폭격', ic: '🦅', cd: 6 }, ult: { k: 'mstorm', nm: '미사일 폭풍', ic: '🚀' },
    init(p) { p.flyCdMul = .15; p.spdMul *= 1.1; } },
  { id: 'm_phantom', nm: '팬텀', ty: '은신형 · 소음 소총', hp: .85, dmg: 1.15, spd: 1.2, cd: .9, arm: 'rifle', prim: 'burst', cost: 900,
    pass: '은신 뒤 첫 공격 3배 · 정밀 3점사', auto: { k: 'cloak', nm: '광학 은신', ic: '👻', cd: 10 }, ult: { k: 'execute', nm: '그림자 처형', ic: '🌑' },
    init(p) { p.crit += .08; } },
  { id: 'm_wizard', nm: '위저드', ty: '비트형 · 비트 레이저', hp: .95, dmg: 1.08, spd: 1, cd: .85, arm: 'staff', prim: 'bits', cost: 1000,
    pass: '모든 재사용 -15% · 비트가 적을 저격', auto: { k: 'bitstorm', nm: '비트 사출', ic: '🔷', cd: 7 }, ult: { k: 'allrange', nm: '전방위 공격', ic: '🌐' },
    init(p) { p.cdMul *= .85; } },
  { id: 'm_origin', nm: '오리진', ty: '알파 원형기 · 알파 빔', hp: 1.1, dmg: 1.1, spd: 1.05, cd: .9, arm: 'saber', prim: 'beam', cost: 1400,
    pass: '모든 재사용 -20% · 끊임없이 지지는 광선', auto: { k: 'blink', nm: '순간 이동', ic: '✨', cd: 6 }, ult: { k: 'nova', nm: '알파 노바', ic: '🌟' },
    init(p) { p.cdMul *= .8; } },
  { id: 'mech_leg', nm: '세라핌 프라임', ty: '전설 · 대검·빛 깃털', hp: 1.4, dmg: 1.35, spd: 1.15, cd: .8, arm: 'great', prim: 'feather', cost: 2500, req: 3,
    pass: '모든 피해 +10% · 가까이선 대검, 멀면 빛 깃털', auto: { k: 'featherstorm', nm: '광익 방출', ic: '🕊️', cd: 5 }, ult: { k: 'descent', nm: '세라핌 강림', ic: '👼' },
    init(p) { p.dmgMul *= 1.1; } },
];
const MECH = (id) => MECHS.find((m) => m.id === id) || MECHS[0];
// 기체별 전투기 모델(변신 엔진 JETM과 같은 이름)
const JET_OF = { mech3: 'saberjet', mech4: 'mech4_jet', m_sky: 'm_sky_jet', m_striker: 'm_striker_jet', m_titan: 'm_titan_jet', m_ranger: 'm_ranger_jet', m_artillery: 'm_artillery_jet', m_wizard: 'm_wizard_jet', m_phantom: 'm_phantom_jet', m_samurai: 'm_samurai_jet', m_origin: 'm_origin_jet', m_guardian: 'm_guardian_jet', mech_leg: 'mech_leg_jet' };
// 주무기 이름: 같은 강화(rifle)라도 기체의 기본 무기에 맞춰 부른다
const ARM_NAME = {
  pistol: { nm: '빔 권총', ic: '🔫', ds0: '가까운 적을 권총으로 자동 사격' },
  rifle: { nm: '레이저 소총', ic: '🔫', ds0: '가까운 적을 소총으로 자동 사격' },
  katana: { nm: '검기 베기', ic: '⚔️', ds0: '카타나로 앞을 베고 검기를 날린다' },
  saber: { nm: '빔 세이버', ic: '⚔️', ds0: '가까우면 베고, 멀면 손바닥 레이저' },
  shotgun: { nm: '산탄 캐논', ic: '💥', ds0: '부채꼴로 퍼지는 산탄, 가까울수록 강함' },
  gatling: { nm: '회전 기관포', ic: '🌀', ds0: '쏘수록 빨라지는 연사' },
  rail: { nm: '레일 저격총', ic: '🎯', ds0: '한 줄의 적을 모두 꾰뚫는 강한 한 발' },
  mortar: { nm: '곡사포', ic: '💣', ds0: '적 무리 위로 포탄을 떨어뜨린다' },
  homing: { nm: '유도 미사일', ic: '🚀', ds0: '적을 쏘아 올려 쫓아가는 작은 미사일' },
  burst: { nm: '소음 소총', ic: '🔫', ds0: '정밀 3점사' },
  bits: { nm: '비트 레이저', ic: '🔷', ds0: '어깨의 비트가 적을 저격한다' },
  beam: { nm: '알파 빔', ic: '🔆', ds0: '끊임없이 지지는 광선, 줄 위의 적 모두' },
  feather: { nm: '빛 깃털', ic: '🕊️', ds0: '가까우면 대검, 멀면 빛 깃털 세례' },
};

// 적 종류: h 키, r 충돌 반지름, yaw 모델 정면 보정
const ET = {
  ling:     { file: 'zling_sw',  h: 7,  r: 3.2, hp: 10,   spd: 47, dmg: 8,  xp: 1,  max: 100, yaw: 0, col: 0x9be05a },
  roach:    { file: 'zroach',    h: 9,  r: 5.2, hp: 62,   spd: 25, dmg: 14, xp: 3,  max: 34,  yaw: 0, col: 0xd9a04a },
  bane:     { file: 'zbane',     h: 8,  r: 3.6, hp: 20,   spd: 54, dmg: 22, xp: 2,  max: 26,  yaw: 0, col: 0xff7a3a },
  plasma:   { file: 'zplasma',   h: 10, r: 4.6, hp: 38,   spd: 30, dmg: 10, xp: 3,  max: 18,  yaw: 0, col: 0xc86bff },
  lurk:     { file: 'zlurk',     h: 9,  r: 5.2, hp: 54,   spd: 34, dmg: 18, xp: 4,  max: 16,  yaw: 0, col: 0xff4a6a },
  behemoth: { file: 'zbehemoth', h: 27, r: 12,  hp: 760,  spd: 21, dmg: 22, xp: 0,  max: 3,   yaw: 0, col: 0xffb04a },
  queen:    { file: 'zqueen',    h: 46, r: 15,  hp: 5200, spd: 25, dmg: 25, xp: 0, max: 1,   yaw: 0, col: 0xff7ac4 },
  // ASCEND 본편 유닛: 보병(달리기 동작 4장면을 굳혀 번갈아 보인다)·공중·중간 보스
  aat:      { file: 'emp_trooper', h: 14, r: 3.6, hp: 40, spd: 28, dmg: 11, xp: 3, max: 16, yaw: 0, col: 0xff9a6a, anim: 'run', frames: 4, mech: 1 },
  aagun:    { file: 'v_aa', h: 22, fit: 1, r: 8, hp: 230, spd: 16, dmg: 0, xp: 8, max: 4, yaw: 0, col: 0xffc07a, mech: 1 },
  trooper:  { file: 'fed_trooper', h: 14, r: 3.6, hp: 34, spd: 30, dmg: 9, xp: 2, max: 30, yaw: 0, col: 0x9bc06a, anim: 'run', frames: 4, mech: 1 },
  robo:     { file: 'robo', h: 14.5, r: 3.6, hp: 28, spd: 54, dmg: 12, xp: 2, max: 30, yaw: 0, col: 0x7fd8ff, anim: 'run', frames: 4, mech: 1 },
  spit:     { file: 'zspit', h: 15, r: 4.2, hp: 46, spd: 27, dmg: 12, xp: 3, max: 16, yaw: 0, col: 0xb06bff },
  wing:     { file: 'zwing', h: 12, fit: 1, rx: -Math.PI / 2, r: 4.5, hp: 24, spd: 50, dmg: 12, xp: 2, max: 18, yaw: Math.PI, col: 0xff6a8a, fly: 18 },
  jet:      { file: 'a_interceptor', h: 13, fit: 1, r: 6, hp: 70, spd: 105, dmg: 0, xp: 4, max: 4, yaw: 0, col: 0x9fd8ff, fly: 30, mech: 1 },
  heli:     { file: 'a_heli', h: 13, fit: 1, r: 7, hp: 150, spd: 34, dmg: 0, xp: 6, max: 3, yaw: 0, col: 0xbfe0ff, fly: 24, mech: 1 },
  goliath:  { file: 'v_goliath', h: 30, r: 12.5, hp: 1800, spd: 19, dmg: 24, xp: 0, max: 1, yaw: 0, col: 0xffc05a, mech: 1, boss: '골리앗 강습 보행기' },
  scorp:    { file: 'fb_scorp', h: 36, fit: 1, r: 14, hp: 2600, spd: 27, dmg: 24, xp: 0, max: 1, yaw: 0, col: 0x5ab0ff, boss: '심연 거미' },
  brood:    { file: 'z_broodlord', h: 38, fit: 1, r: 14, hp: 3000, spd: 24, dmg: 0, xp: 0, max: 1, yaw: 0, col: 0xc07aff, fly: 30, boss: '브루드로드' },
};

// 강화 목록: 단계별 수치와 설명
const UP = {
  rifle: { ic: '➹', nm: '빔 라이플', max: 6, kind: 'w',
    dmg: [12, 16, 16, 21, 21, 28], n: [1, 1, 2, 2, 3, 3], cd: [.42, .42, .40, .34, .34, .28], pierce: [0, 0, 0, 1, 1, 2],
    ds: ['가까운 적을 자동으로 쏜다', '피해 +30%', '탄 +1', '관통 +1 · 연사 +15%', '탄 +1', '피해 +30% · 관통 +1 · 연사 +20%'] },
  // 불꽃 드론: ASCEND 동반 드론(빛 궁도)을 그대로 쓴다. 넓게 돌며 부딪히는 적에게 피해, 최대 6대
  blade: { ic: '✺', nm: '불꽃 드론', max: 5, kind: 'w',
    n: [2, 3, 4, 5, 6], dmg: [9, 10, 12, 14, 18], rad: [36, 39, 42, 45, 48],
    ds: ['기체 주위를 넓게 도는 불꽃 드론 2대, 부딪히면 피해', '드론 +1 · 반경 확대', '드론 +1 · 피해 +20%', '드론 +1 · 피해 +15%', '드론 +1 (최대 6대) · 피해 +30%'] },
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
function bake(gltf, height, yaw, T = {}) {
  gltf.scene.updateMatrixWorld(true);
  let mesh = null; gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const geos = [];
  if (T.anim && mesh.isSkinnedMesh && gltf.animations.length) {
    // 뼈대 모델: 달리기 동작을 몇 장면으로 굳혀 둔다(인스턴스로 수십 명을 가볍게 그리려고)
    const src = gltf.animations.find((a) => a.name === T.anim) || gltf.animations.find((a) => /run|walk/i.test(a.name)) || gltf.animations[0], clip = src.clone();
    clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.position'));
    const mixer = new THREE.AnimationMixer(gltf.scene); mixer.clipAction(clip).play();
    const pos = mesh.geometry.attributes.position, v = new THREE.Vector3();
    for (let f = 0; f < T.frames; f++) {
      mixer.setTime(clip.duration * f / T.frames); gltf.scene.updateMatrixWorld(true); mesh.skeleton.update();
      const g = new THREE.BufferGeometry(), arr = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); mesh.applyBoneTransform(i, v); v.applyMatrix4(mesh.matrixWorld); arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; }
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3)); if (mesh.geometry.attributes.uv) g.setAttribute('uv', mesh.geometry.attributes.uv.clone());
      if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone()); geos.push(g);
    }
  } else {
    const g = mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    geos.push(g);
  }
  if (T.rx) geos.forEach((g) => g.rotateX(T.rx));
  geos[0].computeBoundingBox(); const b = geos[0].boundingBox, sz = b.getSize(new THREE.Vector3()), s = height / (T.fit ? Math.max(sz.x, sz.y, sz.z) : sz.y);
  const cx = -(b.min.x + b.max.x) / 2, cy = -b.min.y, cz = -(b.min.z + b.max.z) / 2;
  for (const g of geos) { g.translate(cx, cy, cz); g.scale(s, s, s); if (yaw) g.rotateY(yaw); if (!g.attributes.normal || T.anim) g.computeVertexNormals(); g.computeBoundingSphere(); }
  return { geo: geos[0], geos, map: mesh.material.map, hy: sz.y * s };
}
async function loadModel(key, file, height, yaw, T) {
  MODELS[key] = bake(await gltfL.loadAsync(`models/${file}.glb`), height, yaw, T);
  if (T) { if (T.fly) T.h = T.fly * 2; else if (T.fit) T.h = MODELS[key].hy; }
}
// 미사일 몸: 머리(-X)를 +Z로 돌리고 길이 1로 맞춘다
async function loadMissile() {
  const g = await gltfL.loadAsync('models/w_micromissile.glb'); g.scene.updateMatrixWorld(true);
  let mesh = null; g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld);
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
  geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-c.x, -c.y, -c.z);
  geo.rotateY(Math.PI / 2); geo.computeBoundingBox(); const L = geo.boundingBox.max.z - geo.boundingBox.min.z; geo.scale(1 / L, 1 / L, 1 / L);
  geo.computeBoundingSphere(); MODELS.msl = { geo, map: mesh.material.map };
}
const mechCache = {};
// 같은 몸체를 쓰는 기체는 색을 바꿔 구분한다(본편 m_striker 파일이 발레리안과 같은 모양이라 검정·빨강으로)
const TINT = { m_striker: { from: [18, 75], to: 356, sat: 1.25, lum: 1 } };
function tintTex(tex, filter) {
  const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  // 정해진 색 범위(금색)만 골라 다른 색(빨강)으로 바꾼다. 어두운 몸통은 그대로
  const D = x.getImageData(0, 0, c.width, c.height), d = D.data, F = filter;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
    if (dl < .12) continue; const s = dl / (1 - Math.abs(2 * l - 1) || 1);
    let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; h *= 60; if (h < 0) h += 360;
    if (h < F.from[0] || h > F.from[1]) continue;
    const S = Math.min(1, s * F.sat), L = Math.min(1, l * F.lum), C = (1 - Math.abs(2 * L - 1)) * S, H = F.to / 60, X = C * (1 - Math.abs(H % 2 - 1)), m = L - C / 2;
    const [R, G, B] = H < 1 ? [C, X, 0] : H < 2 ? [X, C, 0] : H < 3 ? [0, C, X] : H < 4 ? [0, X, C] : H < 5 ? [X, 0, C] : [C, 0, X];
    d[i] = (R + m) * 255; d[i + 1] = (G + m) * 255; d[i + 2] = (B + m) * 255;
  }
  x.putImageData(D, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; return t;
}
async function loadMech(id) {
  if (mechCache[id]) return mechCache[id];
  const g = await gltfL.loadAsync(`models/${id}.glb`);
  // 본편 모델은 크기가 제각각이라 키를 19로 맞춘다(이 게임의 기존 기체 키)
  { g.scene.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g.scene), h = bb.max.y - bb.min.y; if (h > 0 && Math.abs(h - 19) > .5) g.scene.scale.multiplyScalar(19 / h); }
  g.scene.traverse((o) => {
    if (o.isMesh) { o.frustumCulled = false; const m = o.material; if (TINT[id] && m.map) m.map = tintTex(m.map, TINT[id]); m.metalness = Math.min(m.metalness, .15); m.roughness = Math.max(m.roughness, .6); m.metalnessMap = null; m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 1.05; m.color.setScalar(1.6); m.needsUpdate = true; }
  });
  // 달리기 동작에 섞인 전진 이동을 지워 제자리에서 뛰게 한다
  for (const clip of g.animations) for (const tr of clip.tracks) {
    if (!/^Hips\.position$/.test(tr.name)) continue;
    for (let i = 0; i < tr.values.length; i += 3) { tr.values[i] = 0; tr.values[i + 2] = 0; }
  }
  // 동작을 이름으로 찾는다(본편 모델마다 순서·이름이 조금씩 다르다)
  const byName = (re) => g.animations.find((a) => re.test(a.name));
  const C = { idle: byName(/^idle$/i), walk: byName(/^walk$|walk_fight/i), shoot: byName(/^shoot$|while_shooting/i), run: byName(/^run$|run_and_shoot/i), slash: byName(/^slash$|combo_attack/i), hover: byName(/^hover$/i) };
  if (!C.walk) C.walk = (C.run || g.animations[0]).clone(); if (!C.run) C.run = C.walk.clone();
  if (!C.idle) C.idle = THREE.AnimationUtils.subclip(C.walk, 'idle', 0, 2, 30);
  // 빠진 동작은 복제본으로 채운다(같은 동작을 두 이름이 나눠 쓰면 섞임 비율이 엉킨다)
  if (!C.shoot) C.shoot = C.idle.clone(); if (!C.hover) C.hover = C.idle.clone(); if (!C.slash) C.slash = C.idle.clone();
  g.userData.clips = C;
  return (mechCache[id] = g);
}
// 고른 기체에 필요한 것만 불러온다(모델·전투기·무기)
const mechJobs = {};
function ensureMech(id) {
  if (mechJobs[id]) return mechJobs[id];
  const m = MECH(id), jobs = [loadMech(id), loadJet(id)];
  for (const k of [m.arm, m.off, m.arm === 'hammer' ? 'howitzer' : null]) if (k && ARMS[k] && !WPN[k]) jobs.push(loadWeapon(k, ARMS[k].file));
  return (mechJobs[id] = Promise.all(jobs).catch((e) => { delete mechJobs[id]; throw e; }));
}

// ───────── 무기·동작 (ASCEND 본편 엔진에서 가져옴) ─────────
// 손 뼈 축(메시 리그 공통): Y = 손가락 방향, Z = 엄지 방향, X = 손등 바깥
// 무기 모델 축: 권총 총구 -X·위 +Y / 소총 총구 +X·위 +Y / 카타나 칼끝 +Y / 방패 긴 쪽 +Y·앞면 +Z / 미사일 포드 발사구 +Z / 미사일 머리 -X
// basis: 모델의 X·Y·Z 축이 손(또는 팔) 좌표에서 향하는 방향, grip: 손에 쥐는 점(모델 길이 1 기준), len: 세계 단위 길이
const ARMS = {
  pistol: { file: 'wm_pistol', bone: 'RightHand', len: 7.6, grip: [.24, -.16, 0], basis: [[0, -1, 0], [0, 0, 1], [-1, 0, 0]], palm: [-.35, 1.05, 0], muzzle: [-.5, .1, 0], col: 0x7fe6ff },
  rifle: { file: 'w_laserrifle', bone: 'RightHand', len: 12.5, grip: [.1, -.15, 0], basis: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], palm: [-.35, 1.05, 0], muzzle: [.5, .05, 0], col: 0x9ff3ff },
  katana: { file: 'wm_katana', bone: 'RightHand', len: 17.5, grip: [0, -.3, 0], basis: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], palm: [-.35, 1.0, 0], col: 0xbff6ff },
  shield: { file: 'wm_tshield', world: true, len: 11 },   // 방패는 팔 각도와 상관없이 서 있게(본편과 같은 방식) 왼쪽 아래팔 옆에 세운다
  // 새 무기: 빔 세이버 칼끝 -Y / 레일·캐논 총구 -X / 기관포 총구 +X / 해머 비스듬히 누운 모델(맨 먼저 바로 세움) / 지팡이 머리 +Z / 대검 칼끝 -X
  saber: { file: 'w_saber', bone: 'RightHand', len: 14, grip: [0, .36, 0], basis: [[0, 1, 0], [0, 0, -1], [-1, 0, 0]], palm: [-.35, 1.0, 0], col: 0xffb070 },
  rail: { file: 'w_railsniper', bone: 'RightHand', len: 15, grip: [.14, -.12, 0], basis: [[0, -1, 0], [0, 0, 1], [-1, 0, 0]], palm: [-.35, 1.05, 0], muzzle: [-.5, .03, 0], col: 0x9ff6ff },
  cannon: { file: 'w_plasmacannon', bone: 'RightHand', len: 10, grip: [.27, -.15, 0], basis: [[0, -1, 0], [0, 0, 1], [-1, 0, 0]], palm: [-.35, 1.05, 0], muzzle: [-.5, 0, 0], col: 0xffb04a },
  gatling: { file: 'wm_gatling', bone: 'RightHand', len: 14, grip: [.07, -.2, 0], basis: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], palm: [-.35, 1.05, 0], muzzle: [.5, 0, 0], col: 0xffd27a },
  hammer: { file: 'wm_hammer', bone: 'RightHand', len: 15, pre: [0, 0, -.61], grip: [-.32, 0, 0], basis: [[0, 0, 1], [1, 0, 0], [0, 1, 0]], palm: [-.35, 1.0, 0], col: 0xffb04a },
  staff: { file: 'wm_mace', bone: 'RightHand', len: 21, grip: [0, 0, -.12], basis: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], palm: [-.35, 1.0, 0], col: 0x7fe6ff },
  great: { file: 'wm_great', bone: 'RightHand', len: 21, grip: [.38, 0, 0], basis: [[0, 0, -1], [-1, 0, 0], [0, 1, 0]], palm: [-.35, 1.0, 0], col: 0xfff3b0 },
  howitzer: { file: 'wm_howitzer', world: true, len: 13 },   // 아틸러리 어깨 곡사포(총구 -X)
};
const WPN = {};        // 무기 원본(가운데 정렬, 가장 긴 변 = 1)
async function loadWeapon(key, file) {
  const g = await gltfL.loadAsync(`models/${file}.glb`); let s = g.scene;
  const pre = ARMS[key] && ARMS[key].pre; if (pre) { const w0 = new THREE.Group(); s.rotation.set(pre[0], pre[1], pre[2]); w0.add(s); s = w0; }
  s.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(s), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), L = Math.max(sz.x, sz.y, sz.z);
  const inner = new THREE.Group(); s.position.sub(c); inner.add(s); inner.scale.setScalar(1 / L);
  s.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; const m = o.material; m.metalness = Math.min(m.metalness ?? 0, .35); m.roughness = Math.max(m.roughness ?? 1, .5); m.metalnessMap = null; if (m.map) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = .9; } m.color.setScalar(1.5); m.needsUpdate = true; } });
  const box = new THREE.Group(); box.add(inner); WPN[key] = box;
}
const vA = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function makeArm(key) {
  const A = ARMS[key], wrap = new THREE.Group(), rot = new THREE.Group(), body = WPN[key].clone(true);
  body.scale.setScalar(A.len); body.position.set(-A.grip[0] * A.len, -A.grip[1] * A.len, -A.grip[2] * A.len);
  rot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(vA(A.basis[0]), vA(A.basis[1]), vA(A.basis[2])));
  rot.position.set(A.palm[0], A.palm[1], A.palm[2]); rot.add(body); wrap.add(rot);
  wrap.userData = { key, rot, body, muzzle: A.muzzle ? new THREE.Vector3(A.muzzle[0], A.muzzle[1], A.muzzle[2]) : null };
  return wrap;
}
// 기체에 무기를 단다(뼈에 붙여 동작을 그대로 따라간다). 뼈의 세계 배율을 상쇄해 무기 안쪽은 세계 단위로 다룬다
function dressMech(g, mech) {
  if (g.userData.armed) return g.userData.armed;
  const bones = {}; g.scene.traverse((o) => { if (o.isBone) bones[o.name] = o; });
  const out = { bones, main: null, off: null };
  for (const [slot, key] of [['main', mech.arm], ['off', mech.off]]) {
    if (!key || !WPN[key] || ARMS[key].world) continue; const b = bones[ARMS[key].bone]; if (!b) continue;
    // 뼈의 실제 세계 배율을 재서 상쇄(본편 모델마다 내부 배율이 다르다)
    P.group.updateMatrixWorld(true); const hs = new THREE.Vector3(); b.getWorldScale(hs);
    const w = makeArm(key); w.scale.setScalar(1 / (hs.x || .0125)); b.add(w); out[slot] = w;
  }
  return (g.userData.armed = out);
}

// 무술 동작 묶음(ASCEND models/anim_combat): 모든 메시 기체가 같은 뼈 이름을 써서 그대로 쓸 수 있다
let MV = null;
async function loadMoves() {
  const [J, buf] = await Promise.all([fetch('models/anim_combat.json').then((r) => r.json()), fetch('models/anim_combat.bin').then((r) => r.arrayBuffer())]);
  const A = new Int16Array(buf), fps = J.fps, raw = {};
  for (const c of J.clips) {
    const w0 = Math.round(c.win[0] * fps), w1 = Math.round(c.win[1] * fps), n = Math.max(2, w1 - w0 + 1), times = new Float32Array(n);
    for (let f = 0; f < n; f++) times[f] = f / fps;
    const tracks = c.tracks.map((t) => { const o = t.o / 2, v = new Float32Array(n * 4); for (let f = 0; f < n; f++) for (let k = 0; k < 4; k++) v[f * 4 + k] = A[o + (w0 + f) * 4 + k] / 32767; return new THREE.QuaternionKeyframeTrack(t.b + '.quaternion', times, v); });
    raw[c.name] = new THREE.AnimationClip('mv_' + c.name, (n - 1) / fps, tracks);
  }
  const sub = (n, a, b) => THREE.AnimationUtils.subclip(raw[n], n + a, a, b, 30);
  // 한 번 휘두르는 구간만 잘라 쓴다. hit = 칼이 가장 빠른 순간(오른손 속도로 측정)
  MV = {
    cut1: { clip: sub('combo3', 8, 26), hit: .6 }, cut2: { clip: sub('combo3', 28, 48), hit: .68 }, cut3: { clip: sub('combo3', 52, 72), hit: .6 },
    cut4: { clip: sub('combo2', 6, 26), hit: .6 }, cut5: { clip: sub('combo2', 26, 42), hit: .56 },
    fin: { clip: sub('judgment', 10, 36), hit: .65 }, slam: { clip: sub('slam', 30, 62), hit: .55 },
    hit: { clip: sub('hit', 0, 26), hit: 0 }, dodge: { clip: raw.dodge, hit: 0 },
  };
}
const LEGB = new Set(['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']);
const boneOf = (t) => t.name.split('.')[0];
const onlyBones = (clip, name, keep) => new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((t) => keep(boneOf(t))));

// ───────── 그리기 풀 ─────────
const dummy = new THREE.Object3D(), tmpC = new THREE.Color();
function instanced(geo, mat, max) {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0;
  m.setColorAt(0, tmpC.set(0xffffff)); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  scene.add(m); return m;
}
const IM = {};          // 적 종류별 인스턴스
let imGemCore, imCross, imCoreBox, imOrbit, imPillar;
let imShadow, imShot, imEB, imGem, imBlade, imRock, imWave, imMsl, imFlame, imPod = null, shieldW = null;
const flatMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const addMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

function buildPools() {
  for (const k in ET) {
    const m = new THREE.MeshLambertMaterial({ map: MODELS[k].map, emissiveMap: MODELS[k].map, emissive: new THREE.Color(ET[k].col).lerp(new THREE.Color(0xffffff), .45), emissiveIntensity: .95 });
    if (ET[k].mech) m.emissiveIntensity = .55;
    m.color.setScalar(1.7); IM[k] = MODELS[k].geos.map((g) => instanced(g, m, ET[k].max));
  }
  imShadow = instanced(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .3, depthWrite: false }), 180);
  imShadow.renderOrder = 2;
  imShot = instanced(new THREE.BoxGeometry(1.1, 1.1, 9), flatMat(), 260);
  imEB = instanced(new THREE.SphereGeometry(2.4, 12, 8), flatMat(), 280);
  // 재화: 각진 수정 껍질 + 빛나는 심, 회복 십자, 보급 코어(육각 결정+고리), 빛기둥
  imGem = instanced(new THREE.OctahedronGeometry(1.25).scale(.78, 1.55, .78), new THREE.MeshPhongMaterial({ flatShading: true, shininess: 120, specular: 0xffffff, transparent: true, opacity: .8, emissive: 0x18222c }), 420);
  imGemCore = instanced(new THREE.OctahedronGeometry(.62).scale(.8, 1.5, .8), addMat(0xffffff), 420); imGemCore.renderOrder = 6;
  { const s = new THREE.Shape(), a = .42, b = 1.25; s.moveTo(-a, b); s.lineTo(a, b); s.lineTo(a, a); s.lineTo(b, a); s.lineTo(b, -a); s.lineTo(a, -a); s.lineTo(a, -b); s.lineTo(-a, -b); s.lineTo(-a, -a); s.lineTo(-b, -a); s.lineTo(-b, a); s.lineTo(-a, a); s.closePath();
    imCross = instanced(new THREE.ExtrudeGeometry(s, { depth: .5, bevelEnabled: true, bevelThickness: .18, bevelSize: .16, bevelSegments: 2 }).translate(0, 0, -.25), new THREE.MeshPhongMaterial({ shininess: 90, specular: 0xffffff, emissive: 0x0a3a14 }), 24); }
  imCoreBox = instanced(new THREE.CylinderGeometry(1.25, 1.25, 2.7, 6), new THREE.MeshPhongMaterial({ flatShading: true, shininess: 140, specular: 0xffffff, emissive: 0x3a2400 }), 12);
  imOrbit = instanced(new THREE.TorusGeometry(2.4, .14, 6, 40), addMat(0xffffff), 24); imOrbit.renderOrder = 6;
  imPillar = instanced(new THREE.CylinderGeometry(1, 1, 1, 18, 1, true).translate(0, .5, 0), new THREE.MeshBasicMaterial({ map: TEX.pillar, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 36); imPillar.renderOrder = 5;
  // 검기: 날아가는 초승달(가운데가 앞으로 볼록)
  imWave = instanced(new THREE.RingGeometry(4.4, 7.2, 26, 1, -Math.PI / 2 - 1.15, 2.3).rotateX(-Math.PI / 2).translate(0, 0, -6.3),
    new THREE.MeshBasicMaterial({ map: arcTex(4.4 / 7.2, -Math.PI / 2 - 1.15, 2.3), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), 120);
  // 미사일: ASCEND 마이크로 미사일 모델(머리 +Z, 길이 1) + 푸른 분사 불꽃
  imMsl = instanced(MODELS.msl.geo, new THREE.MeshLambertMaterial({ map: MODELS.msl.map, emissive: 0x223044, emissiveIntensity: 1 }), 80);
  imFlame = instanced(new THREE.ConeGeometry(.42, 1, 8).rotateX(-Math.PI / 2).translate(0, 0, -.5), addMat(0xffffff), 80);
  // 너무 어두운 미사일 몸은 살짝 밝힌다
  imMsl.material.color.setScalar(1.6);
  // 베기 잔상(반달 빛)
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(.5, 1, 40, 2, -Math.PI / 2 - 1.2, 2.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: CRES_TEX ||= arcTex(.5, -Math.PI / 2 - 1.2, 2.4), color: 0xbff6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.visible = false; m.renderOrder = 6; scene.add(m); cres.push({ m, t: 1, T: .17 });
  }
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

// 베기 반달 빛: 칼이 지나간 자리에 잠깐 남는다
const cres = []; let cresI = 0, CRES_TEX = null;
function crescent(x, z, yaw, r, tilt, color) {
  const c = cres[cresI++ % cres.length]; if (!c) return;
  c.t = 0; c.r = r; c.m.visible = true; c.m.position.set(x, 9, z);
  c.m.rotation.set(0, yaw, tilt); c.m.material.color.set(color);
}
function updCres(dt) {
  for (const c of cres) { if (!c.m.visible) continue; c.t += dt; const k = c.t / c.T; if (k >= 1) { c.m.visible = false; continue; }
    c.m.scale.setScalar(c.r * (.62 + .22 * k)); c.m.material.opacity = (1 - k) * .92; }
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
const RING_GEO = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
function ring(x, z, r0, r1, dur, color) {
  let o = rings.find((q) => !q.on);
  if (!o) { const mt = addMat(color); mt.map = TEX.ring || null; o = { m: new THREE.Mesh(RING_GEO, mt) }; o.m.renderOrder = 4; scene.add(o.m); rings.push(o); }
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

// ───────── 다듬은 효과: 코드로 그린 빛 무늬(탄 꼬리·섬광·충격파·그을음·베기 빛·번지는 빛) ─────────
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function paintTex(n, f) {
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), im = g.createImageData(n, n), d = im.data;
  for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
    const x = (px + .5) / n * 2 - 1, y = 1 - (py + .5) / n * 2, k = (py * n + px) * 4; d[k] = d[k + 1] = d[k + 2] = 255; d[k + 3] = clamp(f(x, y), 0, 1) * 255;
  }
  g.putImageData(im, 0, 0); return new THREE.CanvasTexture(c);
}
// 반달 빛: 바깥 가장자리가 가장 밝고, 양 끝은 가늘게 사라진다(링 도형의 평면 UV에 맞춤)
function arcTex(rIn, th0, len) {
  return paintTex(256, (x, y) => {
    const r = Math.hypot(x, y); let a = Math.atan2(y, x) - th0; while (a < 0) a += TAU; while (a >= TAU) a -= TAU; const t = a / len; if (t > 1) return 0;
    const s = (r - rIn) / (1 - rIn); if (s < 0 || s > 1) return 0;
    return sstep(0, .75, s) * (1 - sstep(.88, 1, s)) * Math.pow(Math.sin(Math.PI * t), .55) * (.45 + .55 * s);
  });
}
const TEX = {}, VX = { fl: [], fi: 0, mk: [], mi: 0, lt: [] }, WHITE = new THREE.Color(1, 1, 1), tmpC2 = new THREE.Color(), HSL = {};
let imGlow = null, imSoft = null;
function buildVFX() {
  TEX.streak = paintTex(64, (x, y) => { const t = (1 - y) / 2; return Math.min(1, 1.25 * Math.exp(-x * x * 5.5)) * Math.pow(sstep(0, 1, t), 1.05) * (1 - sstep(.93, 1, t)); });
  TEX.pillar = paintTex(32, (x, y) => Math.pow((1 - y) / 2, 2.2) * (.35 + .65 * Math.pow(Math.abs(x), 3)));
  TEX.soft = paintTex(64, (x, y) => { const r = Math.hypot(x, y); return Math.exp(-r * r * 4.5) * (1 - sstep(.8, 1, r)); });
  TEX.flare = paintTex(128, (x, y) => { const r = Math.hypot(x, y), ax = Math.abs(x), ay = Math.abs(y);
    return (Math.exp(-r * r * 18) + .75 * (Math.exp(-ax * 34) * Math.exp(-ay * 3.2) + Math.exp(-ay * 34) * Math.exp(-ax * 3.2)) + .3 * Math.exp(-r * r * 4)) * (1 - sstep(.8, 1, r)); });
  TEX.ring = paintTex(256, (x, y) => { const r = Math.hypot(x, y); return (Math.pow(sstep(.6, .95, r), 3) * .9 + .12 * sstep(.3, .9, r)) * (1 - sstep(.95, 1, r)); });
  TEX.scorch = paintTex(128, (x, y) => { const r = Math.hypot(x, y), n = .78 + .13 * Math.sin(x * 9.1 + y * 3.3) + .09 * Math.sin(y * 13.7 - x * 6.9); return (1 - sstep(.2 * n, .95 * n, r)) * .95; });
  TEX.splat = paintTex(128, (x, y) => { const r = Math.hypot(x, y), a = Math.atan2(y, x), rr = r / (.6 + .16 * Math.sin(a * 5 + 1.3) + .1 * Math.sin(a * 9 + .4) + .06 * Math.sin(a * 17));
    return (1 - sstep(.5, 1, rr)) * (.82 + .18 * Math.sin(x * 4.1 + 1) * Math.sin(y * 3.7)) * (.7 + .3 * (1 - r)); });
  const add = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  // 탄환 꼬리(바닥에 눈운 길쭉한 빛) · 부드러운 둥근 빛(적 탄·포탄·보석 밑)
  imGlow = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, -.42), new THREE.MeshBasicMaterial({ map: TEX.streak, transparent: true, opacity: .9, depthWrite: false, toneMapped: false }), 260); imGlow.renderOrder = 6;
  imSoft = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), add(TEX.soft), 720); imSoft.renderOrder = 5;
  // 총구·피격 섬광(네 갈래 빛)
  for (let i = 0; i < 48; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.flare, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 8; scene.add(s); VX.fl.push({ s, t: 1, T: .1, sz: 1 }); }
  // 땅에 남는 그을음·체액 자국
  const mg = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  for (let i = 0; i < 56; i++) { const m = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ map: TEX.scorch, transparent: true, depthWrite: false, color: 0x1a0f0a, opacity: 0 })); m.visible = false; m.renderOrder = 1; scene.add(m); VX.mk.push({ m, t: 1, T: 1, op: .5 }); }
  // 폭발이 땅과 기체를 비추는 순간 빛(항상 같은 개수를 두어 셰이더를 다시 만들지 않게)
  for (let i = 0; i < (MOBILE ? 1 : 3); i++) { const L = new THREE.PointLight(0xffffff, 0, 170, 1.15); L.position.set(0, -500, 0); scene.add(L); VX.lt.push({ L, t: 1, T: 1, I: 0 }); }
}
function flare(x, y, z, col, sz, T = .09) {
  const f = VX.fl[VX.fi++ % VX.fl.length]; if (!f) return;
  f.t = 0; f.T = T; f.sz = sz; f.s.position.set(x, y, z); f.s.material.color.set(col); f.s.material.rotation = rand(0, TAU); f.s.material.opacity = 1; f.s.scale.setScalar(sz * .6); f.s.visible = true;
}
function mark(x, z, r, col, kind = 'scorch', T = 6, op = .5, dark = 1) {
  const o = VX.mk[VX.mi++ % VX.mk.length]; if (!o) return; const m = o.m;
  o.t = 0; o.T = T; o.op = op; m.material.map = TEX[kind]; m.material.color.set(col); if (dark !== 1) m.material.color.multiplyScalar(dark);
  m.position.set(x, .18 + (VX.mi % 12) * .006, z); m.rotation.y = rand(0, TAU); m.scale.setScalar(r); m.visible = true;
}
function lightFlash(x, y, z, col, I, T = .3) {
  if (!VX.lt.length) return; const o = VX.lt.reduce((a, b) => (b.L.intensity < a.L.intensity ? b : a));
  if (o.L.intensity > I) return; o.t = 0; o.T = T; o.I = I; o.L.color.set(col); o.L.position.set(x, y, z); o.L.intensity = I;
}
function updVFX(dt) {
  for (const f of VX.fl) { if (!f.s.visible) continue; f.t += dt; const k = f.t / f.T; if (k >= 1) { f.s.visible = false; continue; } f.s.scale.setScalar(f.sz * (.6 + .7 * k)); f.s.material.opacity = 1 - k * k; }
  for (const o of VX.mk) { if (!o.m.visible) continue; o.t += dt; const k = o.t / o.T; if (k >= 1) { o.m.visible = false; continue; } o.m.material.opacity = o.op * (k < .03 ? k / .03 : 1 - sstep(.55, 1, k)); }
  for (const o of VX.lt) { if (o.L.intensity <= 0) continue; o.t += dt; const k = o.t / o.T; o.L.intensity = k >= 1 ? 0 : o.I * (1 - k) * (1 - k); }
}
function clearVFX() { for (const o of VX.mk) o.m.visible = false; for (const f of VX.fl) f.s.visible = false; for (const o of VX.lt) o.L.intensity = 0; }
// 필살기·여왕 격파 때 화면이 한 번 번쩍인다
function screenFlash(col = '#ffffff', a = .55, T = .5) {
  const el = $('#sflash'); if (!el) return; el.style.transition = 'none';
  el.style.background = `radial-gradient(circle at 50% 52%, ${col} 0%, ${col}88 30%, ${col}00 78%)`; el.style.opacity = a; void el.offsetWidth;
  el.style.transition = `opacity ${T}s ease-out`; el.style.opacity = 0;
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
  swing(heavy) { noise(heavy ? .32 : .16, heavy ? .22 : .13, heavy ? 900 : 4200); tone(heavy ? 220 : 520, heavy ? 90 : 260, heavy ? .3 : .12, 'sine', .05); },
  slash() { gate('sl', 60) && (tone(1900, 1300, .1, 'triangle', .05), noise(.08, .14, 3200)); },
  launch() { gate('l', 55) && (noise(.3, .1, 2600), tone(180, 420, .22, 'sawtooth', .025)); },
};

// ───────── 폭발 연출(ASCEND explosionfx.js: 섬광 → 불덩이 → 불꽃 → 파편 → 연기) ─────────
let XF = null, xfRecent = [];
const XFm = [];
function initXF() {
  if (!window.createExplosionFX) return;
  try {
    const X = window.createExplosionFX(THREE), tl = new THREE.TextureLoader(), ld = (f) => { const t = tl.load('img/fx/' + f); t.colorSpace = THREE.SRGBColorSpace; return t; };
    XF = new X.ExplosionFX({ scene, quality: MOBILE ? 'low' : 'mid', maxConcurrent: MOBILE ? 3 : 6, light: false,
      textures: { fire: ld('tex_fire.webp'), fire2: ld('tex_fire2.webp'), smoke: ld('tex_smoke.webp'), omega: ld('tex_omega.webp') },
      onShake: (a) => { G.shake = Math.max(G.shake, a * 8); } });
    const sm = XF.b.smoke, sp = sm.spawn.bind(sm); sm.spawn = (o) => { o.a0 = (o.a0 == null ? 1 : o.a0) * .5; o.s1 *= .75; o.life *= .7; return sp(o); };
    for (const k in XF.b) XFm.push(XF.b[k].mesh); XF.debris.groups.forEach((g) => XFm.push(g.mesh)); XFm.forEach((m) => (m.visible = false));
  } catch (e) { XF = null; console.warn('explosionfx', e); }
}
function xfBoom(x, z, tier, size, faction) {
  if (!XF) return; const now = performance.now(); xfRecent = xfRecent.filter((t) => now - t < 1000);
  if (tier === 'grunt' && xfRecent.length >= (MOBILE ? 4 : 8)) return; xfRecent.push(now);
  XF.kill({ x, y: 0, z }, { tier, faction: faction || 'zeta', size, groundY: 0 }); XF.active = 1;
  lightFlash(x, 20, z, faction === 'emp' ? 0xffa050 : faction === 'alp' ? 0xfff0b0 : 0xff6a3a, tier === 'boss' ? 150 : tier === 'elite' ? 90 : 30, tier === 'grunt' ? .35 : .6);
  mark(x, z, size * (tier === 'grunt' ? 1.4 : 1.9), 0x0e0805, 'scorch', tier === 'grunt' ? 7 : 12, .66);
}
function updXF(dt) {
  if (!XF) return; if (!XF.active && !XF.queue.length) { if (XFm[0] && XFm[0].visible) XFm.forEach((m) => (m.visible = false)); return; }
  const n = XF.update(dt), on = n > 0 || XF.queue.length > 0; if (XFm[0].visible !== on) XFm.forEach((m) => (m.visible = on)); if (!on) XF.active = 0;
}

// ───────── 입력 ─────────
const keys = new Set();
const inp = { x: 0, z: 0, dash: false, ult: false, fly: false };
addEventListener('keydown', (e) => {
  if (e.repeat) return; keys.add(e.code);
  if (e.code === 'Space' || e.code === 'ShiftLeft') { inp.dash = true; e.preventDefault(); }
  if (e.code === 'KeyQ') inp.ult = true;
  if (e.code === 'KeyE') inp.auto = true;
  if (e.code === 'KeyF') inp.fly = true;
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
tap($('#bDash'), () => (inp.dash = true)); tap($('#bAuto'), () => (inp.auto = true)); tap($('#bFly'), () => (inp.fly = true)); tap($('#bUlt'), () => (inp.ult = true)); tap($('#bPause'), () => togglePause());
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
// 성장 자료: 코어(재화), 가진 기체, 격납고 강화, 출석·임무, 누적 기록
save.core ??= 0; save.own ??= { mech4: 1, m_samurai: 1, m_striker: 1 }; save.up ??= {}; save.daily ??= {}; save.stat ??= { runs: 0, kills: 0, wins: 0 };
if (!save.own[save.mech]) save.mech = 'mech4';
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };

const G = { state: 'title', t: 0, kills: 0, threat: 1, shake: 0, slow: 0, bossOn: false, boss: null, mid: null, won: false, spawnAcc: 0, ev: 0, pend: 0, endT: 0 };
const P = { group: new THREE.Group(), x: 0, z: 0, yaw: 0, r: 5 };
scene.add(P.group);
// 변신 엔진은 로봇 감싸개(wrap)가 +X를 보는 것으로 다룬다(ASCEND 기준). group(위치) → wrap(방향·크기) → spin(+Z 모델을 +X로)
P.wrap = new THREE.Group(); P.spin = new THREE.Group(); P.spin.rotation.y = Math.PI / 2; P.wrap.add(P.spin); P.group.add(P.wrap); P.wrap.scale.setScalar(1.25);
const pMark = new THREE.Mesh(new THREE.RingGeometry(7.2, 8.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x18d8ff, transparent: true, opacity: .85, depthWrite: false, toneMapped: false }));
pMark.renderOrder = 3; scene.add(pMark);
let E = [], shots = [], ebs = [], gems = [], picks = [];
let mixer = null, acts = {}, curAct = null, ARM = null, PRIM = null, armed = null, howW = null;
let msl = [];           // 어깨 포드에서 쏜 미사일
const AN = { w: {}, tgt: {}, over: null, overT: 0, hold: {} };

function resetRun() {
  for (const d of decals) cancelDecal(d);
  E = []; shots = []; ebs = []; gems = []; picks = []; msl = []; nums.length = 0; if (XF) XF.clear();
  AN.over = null; AN.overT = 0; mslClear();
  Object.assign(G, { t: 0, kills: 0, shake: 0, slow: 0, bossOn: false, boss: null, mid: null, won: false, spawnAcc: 0, ev: 0, pend: 0, endT: 0, st: { big: 0, flights: 0, ults: 0, skills: 0 } });
  LATER.length = 0; shells = []; clearVFX();
  Object.assign(P, {
    x: 0, z: 0, yaw: 0, hp: 100, maxHp: 100, inv: 0, lvl: 1, xp: 0, need: 6, spdMul: 1, cdMul: 1, crit: .05, magnet: 30, regen: 0,
    dashT: 0, dashCd: 0, dashMax: 2.6, dx: 0, dz: 1, ult: 0, flash: 0, bladeA: 0, sw: null, swN: 0, podT: 0, podK: 0, recoil: 0, ultT: 0, lunge: 0, pod: null, mz: null,
    fly: false, flyT: 0, flyCd: 0, tf: 0, tfUp: false, alt: 0, hd: 0, bank: 0, dT: 0,
    bar: 0, barMax: 0, barT: 0, barCd: 3, barHit: 0,
    w: { rifle: 1, blade: 0, missile: 0, pulse: 0, strike: 0, armor: 0, thruster: 0, magnet: 0, reactor: 0, crit: 0, repair: 0 },
    cd: { rifle: .3, missile: 1, pulse: 2, strike: 1.5 },
    dmgMul: 1, meleeMul: 1, taken: 1, stillMul: 1, splash: 1, ultGain: 1, flyCdMul: 1, gSpin: 0, burstN: 0, burstT: 0, beamTk: 0, beamB: null,
    odT: 0, palmT: 0, cloakT: 0, cloakHits: 0, akCd: 2, mv: null, bitBoost: 0, palm: null, how: null, howRc: 0, lAimK: 0,
  });
}

// ───────── 플레이어 ─────────
async function setMech(id) {
  await ensureMech(id);
  const g = await loadMech(id), mech = MECH(id);
  while (P.spin.children.length) P.spin.remove(P.spin.children[0]);
  if (TF_E._jet && TF_E._jet.grp && TF_E._jet.grp.parent) TF_E._jet.grp.parent.remove(TF_E._jet.grp);
  P.spin.add(g.scene); TF_E.mdl.obj = g.scene; TF_E.fk = id; TF_E._jet = null; TF_E._tfP = null; TF_M._bones = null;
  ARM = mech.arm; PRIM = mech.prim; armed = dressMech(g, mech);
  if (imPod) imPod.visible = false;
  if (mech.off === 'shield' && WPN.shield && !shieldW) { shieldW = WPN.shield.clone(true); shieldW.scale.setScalar(ARMS.shield.len); shieldW.visible = false; scene.add(shieldW); }
  if (mech.arm === 'hammer' && WPN.howitzer && !howW) { howW = WPN.howitzer.clone(true); howW.scale.setScalar(ARMS.howitzer.len); howW.visible = false; scene.add(howW); }
  if (mixer) mixer.stopAllAction();
  mixer = new THREE.AnimationMixer(g.scene); acts = {}; AN.w = {}; AN.tgt = {}; AN.over = null; AN.overT = 0; AN.hold = {};
  // 기체 자체 동작(이름으로 찾음): 서기·걷기·조준·달리기(총을 든 채)·베기·부양
  const C = g.userData.clips;
  for (const n of ['idle', 'walk', 'shoot', 'run', 'slash', 'hover']) acts[n] = mixer.clipAction(C[n]);
  acts.run_lg = mixer.clipAction(onlyBones(C.run, 'run_lg_' + id, (b) => LEGB.has(b)));
  // 무술 동작: 서 있을 때는 온몸, 뛰면서는 상체만(다리는 달리기)
  if (MV) for (const k in MV) {
    acts['o_' + k] = mixer.clipAction(MV[k].clip);
    acts['u_' + k] = mixer.clipAction(onlyBones(MV[k].clip, 'u_' + k, (b) => !LEGB.has(b)));
  }
  for (const n in acts) { const a = acts[n]; AN.w[n] = 0; a.setEffectiveWeight(0); if (!/^[ou]_/.test(n)) a.play(); else { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } }
  AN.w.idle = 1; acts.idle && acts.idle.setEffectiveWeight(1);
  mixer.update(0);
}
// 한 번만 하는 동작(베기·필살·피격)을 dur초에 맞춰 틀고, 무기를 든 기본 자세 위에 얹는다
function oneShot(k, dur) {
  if (!MV || !MV[k]) return false;
  for (const p of ['o_', 'u_']) { const a = acts[p + k]; if (!a) continue; a.reset(); a.timeScale = MV[k].clip.duration / dur; a.play(); }
  AN.over = k; AN.overT = dur; return true;
}
function animTick(dt, want, moving) {
  const T = AN.tgt; for (const n in acts) T[n] = 0;
  if (AN.over && AN.overT > 0) {
    AN.overT -= dt;
    if (moving) { T['u_' + AN.over] = 1; T.run_lg = 1; } else T['o_' + AN.over] = 1;
    if (AN.overT <= 0) AN.over = null;
  } else T[want] = 1;
  for (const n in acts) {
    const a = acts[n], t = T[n], sp = /^[ou]_/.test(n) ? 16 : 9; let w = AN.w[n];
    w += clamp(t - w, -dt * sp, dt * sp); AN.w[n] = w;
    if (/^[ou]_/.test(n) && w <= 0 && t === 0) { if (a.isRunning()) a.stop(); continue; }
    a.setEffectiveWeight(w);
  }
}
const lvOf = (k) => P.w[k], st = (k, f) => UP[k][f][P.w[k] - 1];

function nearest(x, z, range, skip) {
  let best = null, bd = range * range;
  for (const e of E) { if (e.dead || e === skip) continue; const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function fire(x, z, ang, dmg, pierce, kind, tgt, y = 10, vy = 0, life, col) {
  if (shots.length > 250) return;
  const sp = kind === 'w' ? 210 : kind === 'f' ? 240 : 300;
  shots.push({ x, z, y, vy, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, ang, life: life || (kind === 'w' ? .46 : .62), dmg, pierce, kind, tgt, hit: null, col });
}
function dealDmg(e, base, kx, kz, kb = 1) {
  const cr = Math.random() < P.crit, d = Math.round(base * (P.dmgMul || 1) * (cr ? 2 : 1) * rand(.9, 1.1));
  e.hp -= d; e.flash = .11;
  const m = e.T.r > 10 ? .12 : 1; e.kx += kx * 26 * kb * m; e.kz += kz * 26 * kb * m;
  if (cr || d >= 40) num(e.x, e.T.h, e.z, d, cr ? '#ffd24a' : '#fff', cr ? 19 : 15); else if (Math.random() < .22) num(e.x, e.T.h, e.z, d, '#ffffffcc', 13);
  sfx.hit();
  if (e.hp <= 0) kill(e);
}
function explode(x, z, r, dmg, color) {
  ring(x, z, r * .2, r * 1.1, .4, color); burst(x, 5, z, 26, color, 70, .55, 9); burst(x, 5, z, 10, 0xffffff, 40, .3, 12);
  flare(x, 7, z, color, r * 1.05, .14); lightFlash(x, 16, z, color, 14 + r * 1.3, .3); mark(x, z, r * .85, 0x0e0805, 'scorch', 7, .62);
  for (const e of E) { if (e.dead) continue; const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz); if (d < r + e.T.r) dealDmg(e, dmg, dx / (d || 1), dz / (d || 1), 1.4); }
  sfx.boom(); G.shake = Math.max(G.shake, 2.2);
}

function updPlayer(dt) {
  readMove(); tickLater(dt);
  const spd = 62 * P.spdMul;
  P.odT -= dt; P.palmT -= dt; if (P.cloakT > 0) P.cloakT -= dt;
  // 비행(F): 누르면 짧게 변신해 날아오른다. 다시 누르거나 대시하면 착지
  if (inp.fly) { if (P.fly && P.tfUp) endFly(); else if (!P.fly) startFly(); }
  inp.fly = false;
  if (inp.dash && P.fly) { if (P.tfUp) endFly(); inp.dash = false; }
  P.flyCd -= dt;
  if (inp.dash && P.dashCd <= 0) {
    P.dashT = .2; P.dashCd = P.dashMax; P.inv = Math.max(P.inv, .34);
    if (inp.x || inp.z) { const d = Math.hypot(inp.x, inp.z); P.dx = inp.x / d; P.dz = inp.z / d; }
    sfx.dash(); ring(P.x, P.z, 4, 20, .3, 0x9ff3ff); flare(P.x, 9, P.z, 0x9ff3ff, 16, .12); mark(P.x, P.z, 7, 0x1a120c, 'scorch', 2.5, .35);
  }
  inp.dash = false;
  if (P.fly) flyMove(dt);
  else if (tickMove(dt)) { }
  else if (P.dashT > 0) {
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
  if (!P.fly) P.yaw += da * Math.min(1, dt * 14);
  P.alt = lerp(P.alt, P.fly && P.tfUp ? FLY.alt : 0, Math.min(1, dt * (P.fly && P.tfUp ? 7 : 9))); if (!P.fly && P.alt < .05) P.alt = 0;
  P.group.position.set(P.x, P.alt, P.z); P.wrap.position.set(0, 0, 0); P.wrap.rotation.set(0, P.yaw - Math.PI / 2, 0); P.wrap.scale.setScalar(1.25); pMark.position.set(P.x, .4, P.z);
  P.group.visible = !(P.inv > 0 && P.dashT <= 0 && P.ultT <= 0 && Math.floor(P.inv * 20) % 2 === 0);
  const moving = !!(inp.x || inp.z) || P.dashT > 0 || !!P.mv;
  const twoHand = ['rifle', 'rail', 'gatling', 'homing', 'burst'].includes(PRIM);
  animTick(dt, P.dashT > 0 ? 'hover' : moving ? 'run' : (tgt && twoHand) ? 'shoot' : 'idle', moving);

  // 주무기: 기체마다 다른 방식(본편 PRIM). 근접 기체는 베면서 검기를 날린다
  P.cd.rifle -= dt;
  if (P.sw) updSwing(dt);
  if (P.fly) { if (tgt && P.cd.rifle <= 0 && P.tf <= 0) jetFire(tgt); }
  else {
    primTick(tgt, dt);
    const swingBusy = P.sw && !(P.sw.done && P.sw.t > P.sw.at + .06);
    if (tgt && P.cd.rifle <= 0 && !swingBusy && !P.mv && PRIM !== 'beam') primFire(tgt, dt);
  }
  autoTick(dt);
  // 미사일: 오른쪽 어깨 포드가 솟아 열리고 한 발씩 수직으로 쏘아 올린다
  if (lvOf('missile')) {
    P.cd.missile -= dt;
    if (P.cd.missile <= 0 && E.length) {
      P.cd.missile = st('missile', 'cd') * P.cdMul;
      launchSalvo(st('missile', 'n'), st('missile', 'dmg'));
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
  // 불꽃 드론은 updDrones(그리기와 충돌을 함께)
  // 보호막 전개: 적이 가까우거나 내구가 줄면 스스로 펼친다
  P.barCd -= dt; P.barHit = Math.max(0, P.barHit - dt * 3);
  if (P.barT > 0) { P.barT -= dt; if (P.barT <= 0) { P.bar = 0; P.barT = 0; } }
  if (P.barCd <= 0 && P.bar <= 0 && (nearest(P.x, P.z, 75) || P.hp < P.maxHp * .7)) castBarrier();
  // 필살기(Q): 기체마다 다른 본편 필살기
  if (inp.ult && P.ult >= 100 && !P.fly && !P.mv) { tone(160, 640, .38, 'sawtooth', .07); burst(P.x, 14, P.z, 24, 0xffcf5a, 30, .4, 10, 1.4); castUlt(); }
  inp.ult = false;
}

// ───────── 기체별 기본 무기·자동 스킬·필살기 ─────────
const LATER = [];
const later = (t, fn) => LATER.push({ t, fn });
function tickLater(dt) { for (let i = LATER.length - 1; i >= 0; i--) { const L = LATER[i]; if ((L.t -= dt) <= 0) { LATER.splice(i, 1); try { L.fn(); } catch (e) { console.warn(e); } } } }
// 짧게 미끄러지듯 옮겨 가기(돌진·도약·순간이동)
function moveTo(x, z, T) { const r = Math.hypot(x, z); if (r > ARENA_R - 8) { x *= (ARENA_R - 8) / r; z *= (ARENA_R - 8) / r; } P.mv = { x0: P.x, z0: P.z, x1: x, z1: z, t: 0, T }; P.inv = Math.max(P.inv, T + .15); }
function tickMove(dt) {
  const m = P.mv; if (!m) return false; m.t += dt; const k = Math.min(1, m.t / m.T), e = 1 - (1 - k) * (1 - k);
  P.x = lerp(m.x0, m.x1, e); P.z = lerp(m.z0, m.z1, e); burst(P.x, 9, P.z, 2, ARMS[ARM] ? ARMS[ARM].col : 0x9ff3ff, 20, .3, 9, .3);
  if (k >= 1) P.mv = null; return true;
}
// 한 줄 위의 적 모두에게 피해(레일·광선·돌진 베기)
function lineHit(x0, z0, ang, len, w, dmg, kb = 1, onHit) {
  const fx = Math.sin(ang), fz = Math.cos(ang); let n = 0;
  for (const e of E) { if (e.dead) continue; const dx = e.x - x0, dz = e.z - z0, t = dx * fx + dz * fz; if (t < -e.T.r || t > len + e.T.r) continue;
    if (Math.abs(dx * fz - dz * fx) > w + e.T.r) continue; dealDmg(e, dmg, fx, fz, kb); n++; onHit && onHit(e); }
  return n;
}
function areaHit(x, z, r, dmg, kb = 1.4, stun = 0) {
  let n = 0; for (const e of E) { if (e.dead) continue; const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz); if (d > r + e.T.r) continue; dealDmg(e, dmg, dx / (d || 1), dz / (d || 1), kb); if (stun) e.stun = Math.max(e.stun || 0, stun); n++; }
  return n;
}
// 광선 그림(잠깐 빛나고 사라지는 원기둥)
const BEAMS = []; let beamI = 0;
function buildBeams() {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, .5);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    // 가운데 하얀 심(두 격 광선: 바깥 색 빛 + 안쪽 하얀 심)
    const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    core.scale.set(.32, .32, 1); m.add(core); m.visible = false; m.renderOrder = 6; core.renderOrder = 7; scene.add(m); BEAMS.push({ m, core, t: 0, T: .1, w: 1 });
  }
}
function beamFx(x0, y0, z0, x1, y1, z1, w, col, T = .14, keep) {
  const B = keep || BEAMS[beamI++ % BEAMS.length]; if (!B) return null; const m = B.m;
  m.position.set(x0, y0, z0); m.lookAt(x1, y1, z1); const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0); m.scale.set(w, w, L); m.material.color.set(col);
  B.t = 0; B.T = T; B.w = w; m.visible = true;
  if (!keep) { flare(x0, y0, z0, col, w * 7, .1); flare(x1, y1, z1, col, w * 9, .14); if (w >= 2) lightFlash(x1, Math.max(8, y1 + 6), z1, col, 40 * w, .25); }
  return B;
}
function updBeams(dt) { for (const B of BEAMS) { if (!B.m.visible) continue; B.t += dt; const k = B.t / B.T; if (k >= 1) { B.m.visible = false; continue; } B.m.material.opacity = (1 - k) * .6; B.core.material.opacity = 1 - k * k; const s = B.w * (1 - k * .6) * (1 + Math.sin(B.t * 90) * .06); B.m.scale.x = B.m.scale.y = s; } }
// 곡사포탄: 어깨 포에서 포물선으로 날아가 떨어진 자리에서 터진다
let shells = [];
function mortar(x1, z1, dmg, r, T = .75) {
  const s0 = P.how || { x: P.x, y: 20 + P.alt, z: P.z }; const rr = Math.hypot(x1, z1); if (rr > ARENA_R - 6) { x1 *= (ARENA_R - 6) / rr; z1 *= (ARENA_R - 6) / rr; }
  shells.push({ x0: s0.x, y0: s0.y, z0: s0.z, x1, z1, t: 0, T, dmg, r }); decal(x1, z1, r, T, 0xffa040); P.howRc = 1; tone(140, 70, .18, 'square', .06); burst(s0.x, s0.y, s0.z, 6, 0xffc070, 40, .3, 10, .8);
  flare(s0.x, s0.y, s0.z, 0xffc070, 13, .1); burst(s0.x, s0.y, s0.z, 4, 0x8a7a70, 18, .7, 10, .6);
}
function updShells(dt) {
  for (const s of shells) { s.t += dt; if (s.t < s.T) continue; s.dead = true;
    if (s.foe) { ring(s.x1, s.z1, 4, s.r, .3, 0x9be05a); burst(s.x1, 3, s.z1, 22, 0x9be05a, 60, .5, 10); mark(s.x1, s.z1, s.r * .9, 0x2a4a18, 'splat', 6, .55); sfx.boom(); if (Math.hypot(P.x - s.x1, P.z - s.z1) < s.r + P.r) hurtPlayer(s.dmg); }
    else { explode(s.x1, s.z1, s.r, s.dmg, 0xffa04a); xfBoom(s.x1, s.z1, 'grunt', s.r * .55, 'emp'); } }
  shells = shells.filter((s) => !s.dead);
}
const shellPos = (s) => { const k = Math.min(1, s.t / s.T); return [lerp(s.x0, s.x1, k), lerp(s.y0, 1, k) + Math.sin(k * Math.PI) * 55, lerp(s.z0, s.z1, k)]; };
// 비트(위저드): 어깨 위를 도는 작은 빛 포대
const BITS = [];
function buildBits() { for (let i = 0; i < 6; i++) { const g = new THREE.Group(), h = glowSpr(0x39c8ff, 3.2, false), c = glowSpr(0xffffff, 1.3); g.add(h); g.add(c); g.visible = false; scene.add(g); BITS.push({ g, x: 0, y: 0, z: 0 }); } }
function updBits(dt) {
  const n = G.state !== 'title' && PRIM === 'bits' && P.w ? 2 + st('rifle', 'n') + (P.bitBoost > 0 ? 2 : 0) : 0; P.bitBoost -= dt;
  for (let i = 0; i < BITS.length; i++) { const B = BITS[i], on = i < Math.min(6, n); B.g.visible = on; if (!on) continue;
    const a = droneClock * 2.2 + i / Math.min(6, n) * TAU; B.x = P.x + Math.cos(a) * 11; B.z = P.z + Math.sin(a) * 11; B.y = P.alt + 24 + Math.sin(droneClock * 3 + i) * 2; B.g.position.set(B.x, B.y, B.z); }
}
function bitsFire(n, dmg, range = 150) {
  const live = BITS.filter((b) => b.g.visible); if (!live.length) return 0; const tg = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < range * range).sort((a, b) => ((a.x - P.x) ** 2 + (a.z - P.z) ** 2) - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2)).slice(0, n);
  tg.forEach((e, i) => { const B = live[i % live.length]; beamFx(B.x, B.y, B.z, e.x, e.T.h * .5, e.z, .6, 0x6fdcff, .14); dealDmg(e, dmg, 0, 0, .4); burst(e.x, e.T.h * .5, e.z, 3, 0x9fe8ff, 40, .18, 7); });
  if (tg.length) tone(1800, 900, .06, 'square', .025); return tg.length;
}
const cloakMul = () => { if (P.cloakHits > 0) { P.cloakHits--; return 3; } return 1; };
// 총구에서 쏜기(권총·소총·캠논·기관포·산탄)
function gunShot(tgt, n, spread, dmg, pierce, opt = {}) {
  const mz = (opt.palm ? P.palm : P.mz) || { x: P.x, y: 12 + P.alt, z: P.z }, a0 = Math.atan2(tgt.x - mz.x, tgt.z - mz.z);
  const dist = Math.max(8, Math.hypot(tgt.x - mz.x, tgt.z - mz.z)), vy = (tgt.T.h * .5 - mz.y) / (dist / 300), k = cloakMul();
  for (let i = 0; i < n; i++) fire(mz.x, mz.z, a0 + (n > 1 ? (i - (n - 1) / 2) * spread : 0) + (opt.jit ? rand(-opt.jit, opt.jit) : 0), dmg * k, pierce, opt.kind || 'r', null, mz.y, vy, opt.life, opt.col);
  const fc = opt.col || (ARMS[ARM] && ARMS[ARM].col) || 0x9ff3ff;
  P.recoil = 1; sfx.shoot(); burst(mz.x, mz.y, mz.z, 3, fc, 26, .1, 11, .2); flare(mz.x, mz.y, mz.z, fc, n > 3 ? 10 : 7, .07);
}
function railShot(tgt, dmg, n) {
  const mz = P.mz || { x: P.x, y: 12, z: P.z }, a = Math.atan2(tgt.x - mz.x, tgt.z - mz.z), k = cloakMul(), L = 240;
  for (let i = 0; i < Math.min(3, n); i++) {
    const off = (i - (Math.min(3, n) - 1) / 2) * 6, ox = Math.cos(a) * off, oz = -Math.sin(a) * off;
    lineHit(mz.x + ox, mz.z + oz, a, L, 3.5, dmg * k, 1.6); beamFx(mz.x + ox, mz.y, mz.z + oz, mz.x + ox + Math.sin(a) * L, 6, mz.z + oz + Math.cos(a) * L, 1.1, 0x9ff6ff, .22);
  }
  P.recoil = 1; G.shake = Math.max(G.shake, 1.5); tone(2400, 300, .25, 'sawtooth', .06); noise(.2, .12, 5000); burst(mz.x, mz.y, mz.z, 10, 0xdff8ff, 60, .2, 10, .2);
  flare(mz.x, mz.y, mz.z, 0xbff8ff, 18, .12); lightFlash(mz.x, mz.y + 4, mz.z, 0x9ff6ff, 60, .18); ring(mz.x, mz.z, 2, 14, .25, 0x9ff6ff);
}
function palmPos() { return P.palm || { x: P.x, y: 14 + P.alt, z: P.z }; }
function homingShot(n, dmg) {
  if (!MSW) { launchSalvo(n, dmg); return; }
  const b = P.mz || { x: P.x, y: 14 + P.alt, z: P.z }, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const near = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 170 * 170);
  for (let i = 0; i < n; i++) { const tg = near.length ? near[(Math.random() * Math.min(near.length, 8)) | 0] : null, side = i % 2 ? -1 : 1;
    MSLE.fire({ wh: 'he', profile: 'vertical', kind: 'micro', x: b.x / MK, h: b.y / MK, y: b.z / MK, dir: [-fz * side * .4 + fx * .3, .8, fx * side * .4 + fz * .3], target: tg ? pxOf(tg) : null, tx: tg ? null : (P.x + fx * 100) / MK, ty: tg ? null : (P.z + fz * 100) / MK, th: tg ? null : 8, dmg, src: window.G.local, dt: 'x', splash: 12 / MK, team: 0, delay: i * .06 }); }
  sfx.launch();
}
function primFire(tgt, dt) {
  const base = st('rifle', 'dmg'), cd0 = st('rifle', 'cd') * P.cdMul * (P.odT > 0 ? .5 : 1), n = st('rifle', 'n'), pr = st('rifle', 'pierce');
  const still = !(inp.x || inp.z) ? (P.stillMul || 1) : 1, d = Math.hypot(tgt.x - P.x, tgt.z - P.z);
  switch (PRIM) {
    case 'pistol': case 'rifle': P.cd.rifle = cd0; gunShot(tgt, n, .11, base, pr); break;
    case 'burst': P.burstN = 3; P.burstT = 0; P.cd.rifle = cd0 * 1.35; break;
    case 'shotgun': { P.cd.rifle = cd0 * 1.35; const k = 5 + n * 2; gunShot(tgt, k, .6 / (k - 1), base * .62 * (d < 45 ? 1.5 : 1), pr, { life: .3, col: 0xffb04a, jit: .03 }); G.shake = Math.max(G.shake, .8); break; }
    case 'gatling': P.gSpin = Math.min(1, P.gSpin + .1); P.cd.rifle = cd0 * (1.05 - .8 * P.gSpin); gunShot(tgt, n > 2 ? 2 : 1, .06, base * .55, pr, { jit: .06, col: 0xffd27a }); break;
    case 'rail': P.cd.rifle = cd0 * 2.3; railShot(tgt, base * 3.4 * still, n); break;
    case 'homing': P.cd.rifle = cd0 * 1.35; homingShot(n + 1, base * 1.15); break;
    case 'mortar': P.cd.rifle = cd0 * 1.75; for (let i = 0; i < n; i++) mortar(tgt.x + (i ? rand(-18, 18) : 0), tgt.z + (i ? rand(-18, 18) : 0), base * 2.4, 17 * (P.splash || 1), .7 + i * .08); break;
    case 'bits': P.cd.rifle = cd0 * 1.05; bitsFire(2 + n, base * 1.05); break;
    case 'saber': if (d < 46) startSwing(tgt); else { P.cd.rifle = cd0; gunShot(tgt, n, .12, base, pr, { palm: 1, col: 0xffc060 }); P.palmT = .3; } break;
    case 'feather': if (d < 44) startSwing(tgt); else { P.cd.rifle = cd0 * 1.1; const k = n + 2; gunShot(tgt, k, .16, base * .85, pr + 1, { kind: 'f', col: 0xfff3b0, palm: 1 }); P.palmT = .3; } break;
    case 'katana': startSwing(tgt); break;
  }
}
// 연속 동작(3점사·광선)은 매 프레임 챙긴다
function primTick(tgt, dt) {
  if (P.burstN > 0 && (P.burstT -= dt) <= 0) { P.burstN--; P.burstT = .075; if (tgt) gunShot(tgt, st('rifle', 'n'), .05, st('rifle', 'dmg') * 1.1, st('rifle', 'pierce') + 1, { col: 0xc9b8ff }); }
  if (PRIM === 'gatling' && !tgt) P.gSpin = Math.max(0, P.gSpin - dt * .8);
  if (PRIM === 'beam') {
    const on = tgt && !P.fly && Math.hypot(tgt.x - P.x, tgt.z - P.z) < 150; P.palmT = on ? .2 : P.palmT;
    if (!on) { if (P.beamB) { P.beamB.m.visible = false; P.beamB = null; } return; }
    const p = palmPos(), a = Math.atan2(tgt.x - p.x, tgt.z - p.z), L = 150;
    P.beamB = beamFx(p.x, p.y, p.z, p.x + Math.sin(a) * L, tgt.T.h * .5, p.z + Math.cos(a) * L, 1.3 + Math.sin(G.t * 40) * .25, 0xffe28a, .09, P.beamB);
    if (Math.random() < .5) flare(p.x, p.y, p.z, 0xffe28a, rand(7, 11), .06); if (Math.random() < .35) flare(tgt.x, tgt.T.h * .5, tgt.z, 0xfff0b0, rand(8, 13), .07);
    if ((P.beamTk -= dt) <= 0) { P.beamTk = .1 * P.cdMul; lineHit(p.x, p.z, a, L, 3, st('rifle', 'dmg') * .34 * (1 + .25 * (st('rifle', 'n') - 1)), .25); if (Math.random() < .5) tone(900 + Math.random() * 200, 700, .05, 'sawtooth', .012); }
  }
}
// 자동 스킬: 재사용이 끝나고 적이 가까우면 스스로(화면의 아이콘을 눌러도 즉시)
function autoTick(dt) {
  const A = MECH(save.mech).auto; P.akCd -= dt;
  if (P.akCd > 0 || P.mv || P.ultT > 0) { inp.auto = false; return; }
  const near = nearest(P.x, P.z, A.k === 'backstep' ? 34 : 100);
  if (!near && !inp.auto) return; inp.auto = false;
  if (P.fly && !['dive', 'featherstorm', 'bitstorm', 'palm', 'overdrive'].includes(A.k)) return;
  if (doAuto(A.k, near || nearest(P.x, P.z, 200))) { P.akCd = A.cd * P.cdMul; G.st.skills++; }
}
function doAuto(k, tg) {
  const base = st('rifle', 'dmg'), fy = P.yaw, fx = Math.sin(fy), fz = Math.cos(fy);
  switch (k) {
    case 'flash': { if (!tg) return false; const a = Math.atan2(tg.x - P.x, tg.z - P.z), dd = Math.max(0, Math.hypot(tg.x - P.x, tg.z - P.z) - 8); moveTo(P.x + Math.sin(a) * dd, P.z + Math.cos(a) * dd, .16); sfx.dash();
      later(.17, () => { areaHit(P.x, P.z, 26, base * 5, 2.2); ring(P.x, P.z, 4, 30, .3, 0x9ff3ff); burst(P.x, 8, P.z, 30, 0xbff6ff, 90, .35, 10); G.shake = Math.max(G.shake, 2.5); }); return true; }
    case 'iaido': { if (!tg) return false; const a = Math.atan2(tg.x - P.x, tg.z - P.z), L = 70, x0 = P.x, z0 = P.z; moveTo(P.x + Math.sin(a) * L, P.z + Math.cos(a) * L, .14); oneShot('cut1', .3); sfx.swing(true);
      later(.14, () => { lineHit(x0, z0, a, L + 8, 10, base * 5 * (P.meleeMul || 1), 1.8); beamFx(x0, 9, z0, x0 + Math.sin(a) * (L + 10), 9, z0 + Math.cos(a) * (L + 10), 1.6, 0xdff8ff, .25); crescent(P.x, P.z, a, 40, .4, 0xdff8ff); sfx.slash(); }); return true; }
    case 'overdrive': P.odT = 3.5; ring(P.x, P.z, 4, 26, .35, 0x9ff3ff); tone(400, 1600, .4, 'sawtooth', .05); num(P.x, 30, P.z, '과충전', '#9ff3ff', 16); return true;
    case 'palm': { if (!tg) return false; gunShot(tg, 7, .12, base * 1.3, 2, { palm: 1, col: 0xffc060 }); P.palmT = .5; return true; }
    case 'backstep': { const a = tg ? Math.atan2(P.x - tg.x, P.z - tg.z) : fy + Math.PI, x0 = P.x, z0 = P.z; moveTo(P.x + Math.sin(a) * 55, P.z + Math.cos(a) * 55, .2); decal(x0, z0, 28, .55, 0x9ff6ff, () => { explode(x0, z0, 28, base * 4.5, 0x9ff6ff); }); sfx.dash(); return true; }
    case 'mortar3': { if (!tg) return false; for (let i = 0; i < 3; i++) later(i * .12, () => mortar(tg.x + rand(-20, 20), tg.z + rand(-20, 20), base * 4, 26 * (P.splash || 1), .8)); return true; }
    case 'bash': { if (!tg) return false; const a = Math.atan2(tg.x - P.x, tg.z - P.z); moveTo(P.x + Math.sin(a) * 45, P.z + Math.cos(a) * 45, .2); sfx.dash();
      later(.2, () => { areaHit(P.x + Math.sin(a) * 8, P.z + Math.cos(a) * 8, 26, base * 3, 5, .9); ring(P.x, P.z, 4, 28, .3, 0xffd27a); G.shake = Math.max(G.shake, 3); }); return true; }
    case 'quake': oneShot('slam', .55); later(.3, () => { areaHit(P.x, P.z, 58, base * 3.5, 3, .9); ring(P.x, P.z, 6, 62, .4, 0xffb04a); burst(P.x, 3, P.z, 40, 0xffb04a, 110, .5, 11, .2); sfx.boom(); G.shake = Math.max(G.shake, 4); }); return true;
    case 'dive': { if (!tg) return false; const x = tg.x, z = tg.z; decal(x, z, 34, .45, 0xff8a3a, () => { explode(x, z, 34, base * 5, 0xff8a3a); xfBoom(x, z, 'grunt', 12, 'emp'); }); later(.25, () => beamFx(P.x, 40 + P.alt, P.z, x, 2, z, 1.5, 0xffa040, .2)); return true; }
    case 'cloak': P.cloakT = 3; P.cloakHits = 3; P.inv = Math.max(P.inv, .4); ring(P.x, P.z, 4, 24, .3, 0xb48cff); tone(1200, 300, .4, 'sine', .05); num(P.x, 30, P.z, '은신', '#c9b8ff', 16); return true;
    case 'bitstorm': P.bitBoost = 4; bitsFire(8, base * 2.2, 170); return true;
    case 'blink': { const a = tg ? Math.atan2(P.x - tg.x, P.z - tg.z) + rand(-.6, .6) : fy + Math.PI, x0 = P.x, z0 = P.z; P.x += Math.sin(a) * 60; P.z += Math.cos(a) * 60; const r = Math.hypot(P.x, P.z); if (r > ARENA_R - 8) { P.x *= (ARENA_R - 8) / r; P.z *= (ARENA_R - 8) / r; }
      P.inv = Math.max(P.inv, .4); areaHit(x0, z0, 32, base * 3.5, 2.5); ring(x0, z0, 4, 34, .35, 0xffe28a); burst(x0, 10, z0, 26, 0xffe28a, 80, .4, 10); burst(P.x, 10, P.z, 20, 0xffffff, 60, .3, 10); tone(600, 2000, .2, 'sine', .06); return true; }
    case 'featherstorm': { const p = palmPos(); for (let i = 0; i < 16; i++) fire(p.x, p.z, i / 16 * TAU, base * 1.3, 2, 'f', null, p.y, 0, .55, 0xfff3b0); tone(900, 1800, .3, 'triangle', .05); ring(P.x, P.z, 4, 30, .3, 0xfff3b0); return true; }
  }
  return false;
}
// 필살기(Q): 기체마다 본편의 필살기를 이 전장에 맞게 옮긴 것
function castUlt() {
  const k = MECH(save.mech).ult.k, fy = P.yaw, fx = Math.sin(fy), fz = Math.cos(fy), big = (e) => e.T.r > 10;
  P.ult = 0; P.inv = Math.max(P.inv, 1.2); P.sw = null; G.st.ults++; sfx.ult(); G.shake = Math.max(G.shake, 4);
  const UC = { bladefall: '#bff6ff', tenzan: '#dff8ff', laserstorm: '#9ff3ff', phoenix: '#ff8a3a', satsnipe: '#9ff6ff', carpet: '#ffa040', aegis: '#ffd27a', titanfall: '#ffb04a', mstorm: '#ff9a4a', execute: '#b48cff', allrange: '#6fdcff', nova: '#ffe28a', descent: '#fff3b0' }[k] || '#ffffff';
  screenFlash(UC, .28, .5); lightFlash(P.x, 22, P.z, UC, 55, .5); ring(P.x, P.z, 4, 46, .45, +('0x' + UC.slice(1))); flare(P.x, 14 + P.alt, P.z, +('0x' + UC.slice(1)), 26, .2);
  const D = (e, small, large) => (big(e) ? large : small);
  switch (k) {
    case 'bladefall': { oneShot('fin', .7); const near = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 160 * 160);
      for (let i = 0; i < 22; i++) later(i * .05, () => { const e = near[(Math.random() * near.length) | 0]; const x = e && !e.dead ? e.x : P.x + rand(-120, 120), z = e && !e.dead ? e.z : P.z + rand(-120, 120);
        beamFx(x, 90, z, x, 0, z, 1.4, 0xbff6ff, .18); decal(x, z, 14, .25, 0x9ff3ff, () => { for (const o of E) { if (o.dead) continue; if (Math.hypot(o.x - x, o.z - z) < 14 + o.T.r) dealDmg(o, D(o, 170, 500), 0, 0, 1.5); } ring(x, z, 3, 16, .25, 0xbff6ff); }); }); break; }
    case 'tenzan': { oneShot('fin', .8); later(.35, () => { for (const da of [0, -1.05, 1.05]) { const a = fy + da; lineHit(P.x - Math.sin(a) * 130, P.z - Math.cos(a) * 130, a, 260, 16, 0, 0, (e) => dealDmg(e, D(e, 320, 950), Math.sin(a), Math.cos(a), 3)); beamFx(P.x - Math.sin(a) * 130, 9, P.z - Math.cos(a) * 130, P.x + Math.sin(a) * 130, 9, P.z + Math.cos(a) * 130, 3, 0xdff8ff, .4); crescent(P.x, P.z, a, 90, da, 0xdff8ff); }
      G.slow = .4; G.shake = 8; xfBoom(P.x, P.z, 'elite', 14, 'emp'); }); break; }
    case 'laserstorm': { for (let w = 0; w < 3; w++) later(w * .22, () => { const p = P.mz || { x: P.x, y: 14, z: P.z }; for (let i = 0; i < 30; i++) fire(p.x, p.z, i / 30 * TAU + w * .1, 110, 6, 'r', null, p.y, 0, .8); tone(1600, 400, .25, 'sawtooth', .05); ring(P.x, P.z, 4, 60, .3, 0x9ff3ff); }); break; }
    case 'phoenix': { oneShot('fin', .6); const L = 150, x0 = P.x, z0 = P.z; moveTo(P.x + fx * L, P.z + fz * L, .3);
      for (let i = 0; i < 8; i++) later(i * .035, () => { burst(P.x, 10, P.z, 14, 0xff7a2a, 70, .6, 13, .8); burst(P.x, 12, P.z, 6, 0xffe08a, 50, .4, 16, 1); });
      later(.3, () => { lineHit(x0, z0, fy, L + 10, 22, 0, 0, (e) => dealDmg(e, D(e, 380, 1100), fx, fz, 3)); beamFx(x0, 10, z0, x0 + fx * L, 10, z0 + fz * L, 4, 0xff8a3a, .45); xfBoom(P.x, P.z, 'elite', 16, 'emp'); G.slow = .35; }); break; }
    case 'satsnipe': { const tg = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 230 * 230).sort((a, b) => b.hp - a.hp).slice(0, 7);
      tg.forEach((e, i) => later(.15 + i * .14, () => { if (e.dead) return; decal(e.x, e.z, 16, .2, 0x9ff6ff); beamFx(e.x, 260, e.z, e.x, 0, e.z, 3.2, 0x9ff6ff, .45); dealDmg(e, D(e, 900, 1600), 0, 0, 0); areaHit(e.x, e.z, 18, 160, 1.5); burst(e.x, 6, e.z, 30, 0xdff8ff, 90, .45, 12); tone(2600, 200, .35, 'sawtooth', .06); })); break; }
    case 'carpet': { for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) { const dist = 30 + row * 32, a = fy + (i - 2) * .28, x = P.x + Math.sin(a) * dist, z = P.z + Math.cos(a) * dist; later(row * .16 + i * .03, () => mortar(x, z, 240, 26, .55)); } break; }
    case 'aegis': oneShot('slam', .7); P.barMax = P.bar = Math.round(P.maxHp * .6); P.barT = 9; P.barHit = 1; P.inv = Math.max(P.inv, 2.2);
      later(.35, () => { areaHit(P.x, P.z, 85, 160, 6, 1.5); ring(P.x, P.z, 8, 90, .6, 0xffd27a); ring(P.x, P.z, 4, 70, .45, 0x9ff3ff); xfBoom(P.x, P.z, 'elite', 14, 'emp'); }); break;
    case 'titanfall': oneShot('slam', .8); later(.42, () => { for (const e of E) { if (e.dead) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < 150) { dealDmg(e, D(e, 260, 950), dx / (d || 1), dz / (d || 1), 4.5); e.stun = Math.max(e.stun || 0, 2); } }
      ring(P.x, P.z, 8, 155, .7, 0xffb04a); ring(P.x, P.z, 4, 110, .5, 0xffffff); burst(P.x, 8, P.z, 90, 0xffb04a, 180, .9, 13); xfBoom(P.x, P.z, 'boss', 18, 'emp'); G.slow = .5; G.shake = 9; ebs.length = 0; }); break;
    case 'mstorm': if (MSW) { const near = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 200 * 200); const b = P.pod || { x: P.x, y: 22 + P.alt, z: P.z };
      for (let i = 0; i < 24; i++) { const tg = near.length ? near[i % near.length] : null, side = i % 2 ? -1 : 1; MSLE.fire({ wh: 'he', profile: 'vertical', kind: 'micro', x: b.x / MK, h: b.y / MK, y: b.z / MK, dir: [side * rand(.1, .5), 1, rand(-.4, .4)], target: tg ? pxOf(tg) : null, tx: tg ? null : (P.x + rand(-90, 90)) / MK, ty: tg ? null : (P.z + rand(-90, 90)) / MK, th: tg ? null : 8, dmg: 140, src: window.G.local, dt: 'x', splash: 18 / MK, team: 0, delay: i * .045 }); }
      P.podT = 1.8; } else launchSalvo(20, 140); break;
    case 'execute': { const tg = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 190 * 190).sort((a, b) => b.hp - a.hp).slice(0, 9), x0 = P.x, z0 = P.z; P.inv = Math.max(P.inv, tg.length * .09 + .6);
      tg.forEach((e, i) => later(i * .09, () => { if (e.dead) return; P.x = e.x - 6; P.z = e.z - 6; dealDmg(e, D(e, 650, 1300), 0, 0, 1); crescent(e.x, e.z, rand(0, TAU), 26, rand(-.6, .6), 0xc9b8ff); burst(e.x, 9, e.z, 16, 0xb48cff, 70, .35, 10); sfx.slash(); }));
      later(tg.length * .09 + .05, () => { P.x = x0; P.z = z0; ring(P.x, P.z, 4, 30, .3, 0xb48cff); }); break; }
    case 'allrange': { const tg = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 175 * 175).slice(0, 36); P.bitBoost = 4;
      tg.forEach((e, i) => later((i % 6) * .05, () => { if (e.dead) return; const B = BITS[i % 6]; beamFx(B.x || P.x, B.y || 24, B.z || P.z, e.x, e.T.h * .5, e.z, .9, 0x6fdcff, .25); dealDmg(e, D(e, 280, 700), 0, 0, .8); })); tone(2200, 600, .5, 'square', .04); break; }
    case 'nova': for (let w = 0; w < 2; w++) later(w * .35, () => { areaHit(P.x, P.z, 170, 300, 4); ring(P.x, P.z, 8, 175, .65, 0xffe28a); burst(P.x, 12, P.z, 60, 0xffe28a, 170, .7, 12); xfBoom(P.x, P.z, 'elite', 14, 'emp'); });
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .3); num(P.x, 30, P.z, '+' + Math.round(P.maxHp * .3), '#7dff9a', 18); break;
    case 'descent': { oneShot('slam', .8); P.inv = Math.max(P.inv, 2.5); const pts = [[0, 0]]; for (let i = 0; i < 8; i++) pts.push([Math.cos(i / 8 * TAU) * 75, Math.sin(i / 8 * TAU) * 75]);
      pts.forEach(([ox, oz], i) => later(.3 + i * .06, () => { const x = P.x + ox, z = P.z + oz; beamFx(x, 220, z, x, 0, z, 6, 0xfff3b0, .6); areaHit(x, z, 32, 380, 3); ring(x, z, 4, 34, .4, 0xfff3b0); }));
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .5); num(P.x, 30, P.z, '+' + Math.round(P.maxHp * .5), '#7dff9a', 18); later(.8, () => { xfBoom(P.x, P.z, 'boss', 16, 'alp'); G.slow = .4; }); break; }
  }
}

// 카타나: 연속 베기 5종을 번갈아 쓰고 여섯 번째는 내리찍는 마무리 베기
const CUTS = ['cut1', 'cut2', 'cut3', 'cut4', 'cut5'];
function startSwing(tgt) {
  const cd = st('rifle', 'cd') * P.cdMul * 1.1; P.swN++;
  const fin = P.swN % 6 === 0, k = fin ? 'fin' : CUTS[(P.swN - 1 - Math.floor(P.swN / 6)) % 5];
  const dur = fin ? Math.max(.62, cd * 1.7) : clamp(cd * 1.2, .36, .6);
  P.cd.rifle = fin ? dur * .92 : cd;
  oneShot(k, dur);
  P.sw = { t: 0, T: dur, at: dur * (MV ? MV[k].hit : .5), done: false, fin, tilt: (P.swN % 2 ? 1 : -1) * rand(.25, .55) };
  P.lunge = clamp(Math.hypot(tgt.x - P.x, tgt.z - P.z) - 24, 0, fin ? 26 : 12);
  sfx.swing(fin);
}
function updSwing(dt) {
  const s = P.sw; s.t += dt;
  if (P.lunge > 0 && s.t < s.at) { const d = Math.min(P.lunge, 110 * dt); P.x += Math.sin(P.yaw) * d; P.z += Math.cos(P.yaw) * d; P.lunge -= d; }
  if (!s.done && s.t >= s.at) { s.done = true; slashHit(s); }
  if (s.t >= s.T) P.sw = null;
}
function slashHit(s) {
  const fy = P.yaw, fx = Math.sin(fy), fz = Math.cos(fy), R = s.fin ? 48 : 34, dmg = st('rifle', 'dmg') * (s.fin ? 2.8 : 1.5) * (P.meleeMul || 1) * cloakMul();
  crescent(P.x + fx * 4, P.z + fz * 4, fy, R, s.fin ? 0 : s.tilt, s.fin ? 0xffe7a0 : (ARMS[ARM] && ARMS[ARM].col) || 0xbff6ff);
  if (s.fin) { ring(P.x + fx * 16, P.z + fz * 16, 4, 34, .3, 0xffe7a0); G.shake = Math.max(G.shake, 3.5); }
  let hits = 0;
  for (const e of E) {
    if (e.dead) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz);
    if (d > R + e.T.r || (d > 8 && (dx * fx + dz * fz) / d < (s.fin ? -.3 : .2))) continue;
    dealDmg(e, dmg, dx / (d || 1), dz / (d || 1), s.fin ? 2.6 : 1.5); burst(e.x, e.T.h * .55, e.z, 5, 0xdff8ff, 60, .22, 8, .5); hits++;
  }
  // 검기: 강화 단계만큼 앞으로 날아가는 초승달(관통 +1)
  const n = st('rifle', 'n') + (s.fin ? 2 : 0);
  for (let i = 0; i < n; i++) fire(P.x + fx * 8, P.z + fz * 8, fy + (i - (n - 1) / 2) * .2, st('rifle', 'dmg'), st('rifle', 'pierce') + 1, 'w', null, 8, 0);
  if (hits) { G.slow = Math.max(G.slow, s.fin ? .09 : .035); sfx.slash(); }
}

// ── 미사일 엔진(ASCEND '수직 발사' 비행을 이 전장 크기에 맞춰 줄임) ──
// 포드에서 곧장 솟아 추력을 모으고 → 기수를 꺾어 느슨한 곡선으로 쫓고 → 마지막 구간에서 가장 빠르다
const MP = { climb: .42, v0: 29, vClimb: 95, vmax: 290, vEnd: 365, endR: 120, acc: 450, turn: 3, turnUp: 9, wob: .5, wf: 6.5, life: 4.5 };
function launchSalvo(n, dmg) {
  if (MSW) return engineSalvo(n, dmg);
  const base = P.pod || { x: P.x, y: 22, z: P.z }, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const near = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 175 * 175).sort((a, b) => ((a.x - P.x) ** 2 + (a.z - P.z) ** 2) - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2)).slice(0, n * 3);
  const big = near.filter((e) => e.T.r > 10);
  for (let i = 0; i < n; i++) {
    const tg = big.length && i % 2 === 0 ? big[0] : near.length ? near[(i * 2 + (Math.random() * 2 | 0)) % near.length] : null, side = i % 2 ? -1 : 1;
    const m = { x: base.x + rand(-.8, .8), y: base.y, z: base.z + rand(-.8, .8), dx: -fz * side * .22 - fx * .12 + rand(-.05, .05), dy: 1, dz: fx * side * .22 - fz * .12 + rand(-.05, .05),
      spd: MP.v0, t: 0, delay: i * .075, tg, tx: tg ? tg.x : P.x + fx * 120, ty: 4, tz: tg ? tg.z : P.z + fz * 120, dmg, seed: rand(0, TAU), thrust: .5, puff: 0, fired: false };
    const L = Math.hypot(m.dx, m.dy, m.dz); m.dx /= L; m.dy /= L; m.dz /= L; msl.push(m);
  }
  P.podT = .55 + n * .075;
}

// ───────── 미사일 엔진 연결 (ASCEND lib/ascend_missile.js 원본) ─────────
// 엔진은 ASCEND 단위로 돌고, 이 전장에서는 MK 배율로 줄인 묶음(MSW) 안에 그린다. 엔진 좌표 x,y = 이 게임 x,z / MK, 높이 h = y / MK
// 내 미사일: 수직 발사 유도탄(고폭 탄두, 주황 불꽃) / 적 미사일: 곧게 날아가는 직선탄(산성 탄두, 초록 불꽃·초록 폭발)
const MK = 23.75 / 90;
let MSW = null, pxId = 0;
const ME_U = { id: 'me', cls: 'arkframe', team: 0, x: 0, y: 0, r: 5 / MK, dead: false, slot: 'me' };
function mslInit() {
  if (!window.MSLE) return false;
  MSW = new THREE.Group(); MSW.scale.setScalar(MK); scene.add(MSW);
  window.R3 = { scene: MSW, units: new Map() };
  window.G = { units: [ME_U], t: 0, local: { unit: ME_U }, bullets: [], hm: [], over: false, parts: [] };
  window.__TX = { GLTFLoader };
  window.unitH = (u) => (u === ME_U ? (P.alt || 0) / MK : 0);
  window.hurt = mslHurt; window.part = () => { }; window.CL = {};
  window.SFX = { noise: (d, v, f) => noise(Math.min(d, .4), Math.min(.2, (v || .1) * .8), f || 1200), tone: (f, d, ty, v, f2) => tone(f, f2 || f, d, ty || 'sine', Math.min(.08, v || .04)) };
  MSLE.profiles.direct.vmax = 560;          // 적 직선탄: 보고 피할 수 있는 빠르기
  return true;
}
const pxOf = (e) => e.px || (e.px = { id: ++pxId, cls: 'zeta_' + e.t, team: 1, r: e.T.r / MK, ref: e, dead: false, x: e.x / MK, y: e.z / MK });
// 엔진이 미사일 모델의 압축 법선(Int8)에 다시 계산한 값을 덮어 0이 되면 빛 번짐 효과에서 검은 사각형이 번진다 → 실수 법선으로 다시 만든다
let mslFixed = false;
function fixMslNormals() {
  if (mslFixed || !MSW || !window.MSLE || window.MSLE.model !== 'meshy') return;
  for (const o of MSW.children) { if (!o.isInstancedMesh || !o.material || o.material.type !== 'MeshStandardMaterial') continue; const g = o.geometry; g.deleteAttribute('normal'); g.computeVertexNormals(); mslFixed = true; }
}
function mslSync(dt) {
  if (!MSW) return; fixMslNormals(); const W = window.G; W.t = G.t; W.over = false;
  ME_U.x = P.x / MK; ME_U.y = P.z / MK; ME_U.dead = P.hp <= 0; W.units.length = 1;
  for (const e of E) { if (e.dead) continue; const u = pxOf(e); u.x = e.x / MK; u.y = e.z / MK; W.units.push(u); }
  window.step(dt);
}
function mslClear() { if (!MSW) return; const W = window.G; W.over = true; try { window.step(0); } catch (e) { } W.over = false; }
function mslHurt(u, amt, src, ang, dt) {
  if (!u || !(amt > 0)) return;
  if (u === ME_U) {
    if (P.alt > 10 || G.state !== 'play') return;            // 날고 있으면 밑에서 터져도 안 맞는다
    if (dt === 'x') { if (P.inv > 0 || P.bar > 0) return; P.hp -= amt * .35; if (Math.random() < .3) num(P.x, 20, P.z, '-' + Math.max(1, Math.round(amt * .35)), '#9be05a', 14); if (P.hp <= 0) { P.hp = 0; endRun(false); } return; }
    hurtPlayer(amt); return;
  }
  const e = u.ref; if (!e || e.dead) return; const a = ang || 0; dealDmg(e, amt, Math.cos(a), Math.sin(a), 1.3);
}
function engineSalvo(n, dmg) {
  const base = P.pod || { x: P.x, y: 22 + P.alt, z: P.z }, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const near = E.filter((e) => !e.dead && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 175 * 175).sort((a, b) => ((a.x - P.x) ** 2 + (a.z - P.z) ** 2) - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2)).slice(0, n * 3);
  const big = near.filter((e) => e.T.r > 10);
  for (let i = 0; i < n; i++) {
    const tg = big.length && i % 2 === 0 ? big[0] : near.length ? near[(i * 2 + (Math.random() * 2 | 0)) % near.length] : null, side = i % 2 ? -1 : 1;
    MSLE.fire({ wh: 'he', profile: 'vertical', kind: 'micro', x: base.x / MK + rand(-3, 3), h: base.y / MK, y: base.z / MK + rand(-3, 3),
      dir: [-fz * side * .22 - fx * .12 + rand(-.05, .05), 1, fx * side * .22 - fz * .12 + rand(-.05, .05)],
      target: tg ? pxOf(tg) : null, tx: tg ? null : (P.x + fx * 120) / MK, ty: tg ? null : (P.z + fz * 120) / MK, th: tg ? null : 8,
      dmg, src: window.G.local, dt: 'x', splash: 17 / MK, team: 0, delay: i * .075 });
  }
  P.podT = .55 + n * .075; sfx.launch();
}
// 적 미사일: 발사 자리에서 조준점까지 곧게. 도착까지 걸리는 시간을 돌려줌(바닥 경고 표시용). 피해는 폭발 반경 안이면 dmg
function enemyMissile(e, tx, tz, dmg, delay = .3) {
  if (!MSW) { eShot(e.x, e.z, Math.atan2(tx - e.x, tz - e.z), 66, dmg); return 0; }
  const h = e.T.h * .7;
  MSLE.fire({ wh: 'acid', profile: 'direct', kind: 'micro', x: e.x / MK, h: h / MK, y: e.z / MK, dir: [tx - e.x, 0, tz - e.z], tx: tx / MK, ty: tz / MK, th: 2 / MK,
    dmg: dmg * 2, src: null, dt: 'zeta', splash: 17 / MK, team: 1, delay });
  return delay + .2 + Math.hypot(tx - e.x, tz - e.z) / MK / MSLE.profiles.direct.vmax;
}

// ───────── 비행 변신 (ASCEND 기체별 전투기 모델) ─────────
// 변신은 아주 짧게(0.22초), 비행은 길게(10초). 날고 있는 동안은 땅의 공격·적 미사일·몸통 박치기를 모두 피한다.
// 전투기는 항상 앞으로 날고, 방향은 비행기처럼 크게 돌며 천천히 바뀐다.
const FLY = { dur: 10, cd: 8, tf: .35, alt: 24, spd: 110, turn: 1.7 };
const JETS = {};
async function loadJet(id) {
  const file = JET_OF[id] || id + '_jet'; if (JETG[file]) return;
  const g0 = await gltfL.loadAsync(`models/${file}.glb`); JETG[file] = g0;        // 변신 엔진용 원본
  const g = { scene: g0.scene.clone(true) }; const s = g.scene; s.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(s), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()), L = Math.max(sz.x, sz.y, sz.z);
  s.position.sub(c); const rot = new THREE.Group(); rot.add(s); rot.rotation.y = Math.PI / 2;     // 기수(-X)를 앞(+Z)으로
  const inner = new THREE.Group(); inner.add(rot); inner.scale.setScalar(27 / L);
  s.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; const m = o.material; m.metalness = Math.min(m.metalness ?? 0, .3); m.roughness = Math.max(m.roughness ?? 1, .5); m.metalnessMap = null; if (m.map) { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = .9; } m.color.setScalar(1.5); m.needsUpdate = true; } });
  const box = new THREE.Group(); box.add(inner);
  // 엔진 불꽃 두 개
  for (const sx of [-1.6, 1.6]) { const f = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1, 10).rotateX(-Math.PI / 2).translate(0, 0, -.5), addMat(0x7fd8ff)); f.position.set(sx, 0, -12.5); box.add(f); (box.userData.fl ||= []).push(f); }
  box.visible = false; scene.add(box); JETS[id] = box;
}
function tfFx() {
  const y = P.alt + 10;
  ring(P.x, P.z, 4, 30, .28, 0xffb04a); burst(P.x, y, P.z, 34, 0xff8a3a, 120, .35, 9, .8); burst(P.x, y, P.z, 16, 0xbff6ff, 80, .25, 12, .6);
  noise(.22, .14, 3000); tone(220, 880, .18, 'sawtooth', .05);
}
function startFly() {
  if (P.fly || P.flyCd > 0 || P.ultT > 0 || !JETS[save.mech]) return;
  P.fly = true; P.tfUp = true; P.tf = FLY.tf; P.flyT = FLY.dur; P.hd = P.yaw; P.sw = null; P.dashT = 0; P.mv = null; tfFx(); G.st.flights++;
}
function endFly() { if (!P.fly || !P.tfUp) return; P.tfUp = false; P.tf = FLY.tf; tfFx(); }
function flyMove(dt) {
  P.tf = Math.max(0, P.tf - dt);
  if (P.tfUp) { P.flyT -= dt; if (P.flyT <= 0) endFly(); }
  else if (P.tf <= 0) { P.fly = false; P.flyCd = FLY.cd * (P.flyCdMul || 1); P.inv = Math.max(P.inv, .5); P.yaw = P.hd; return; }
  let turn = 0;
  if (inp.x || inp.z) { let da = Math.atan2(inp.x, inp.z) - P.hd; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; turn = clamp(da * 3, -1, 1); }
  const r = Math.hypot(P.x, P.z);
  if (r > ARENA_R - 45) { let da = Math.atan2(-P.x, -P.z) - P.hd; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; turn = clamp(turn + da * 2, -1.4, 1.4); }
  P.hd += turn * FLY.turn * dt; P.bank = lerp(P.bank, -turn, Math.min(1, dt * 4));
  const sp = FLY.spd * P.spdMul * (P.tfUp ? 1 : .5);
  P.x += Math.sin(P.hd) * sp * dt; P.z += Math.cos(P.hd) * sp * dt;
  const r2 = Math.hypot(P.x, P.z); if (r2 > ARENA_R - 6) { P.x *= (ARENA_R - 6) / r2; P.z *= (ARENA_R - 6) / r2; }
  P.yaw = P.hd;
}
function jetFire(tgt) {
  P.cd.rifle = st('rifle', 'cd') * P.cdMul * .9;
  const fx = Math.sin(P.hd), fz = Math.cos(P.hd), y = P.alt + 10, n = st('rifle', 'n');
  for (const sx of [-2.2, 2.2]) {
    const x = P.x + fx * 10 + fz * sx, z = P.z + fz * 10 - fx * sx, a0 = Math.atan2(tgt.x - x, tgt.z - z), dist = Math.max(8, Math.hypot(tgt.x - x, tgt.z - z));
    for (let i = 0; i < n; i++) fire(x, z, a0 + (i - (n - 1) / 2) * .1, st('rifle', 'dmg') * .6, st('rifle', 'pierce'), 'r', null, y, (tgt.T.h * .5 - y) / (dist / 300));
  }
  sfx.shoot();
}
// 로봇은 작아지며 사라지고 전투기가 펼쳐진다(반대도 같은 순서, 아주 짧게)
// ── ASCEND 변신 엔진(lib/transform.js + lib/ascend_tf3.js) 연결: 로봇 뼈가 접히고 전투기 판이 날아와 맞물린다 ──
// 피닉스(세이버 '피닉스')와 같은 '불꽃' 연출(판 72조각, 불뛰)을 세 기체에 모두 적용. 진행도 k는 이 게임이 직접 정해 아주 짧게 돌린다
const TF_M = { obj: null, wrap: P.wrap, _ws0: 1.25, _bones: null };
const TF_E = { mdl: TF_M, wg: { H: 23.75 }, fk: 'mech4', _jet: null };
const TF_U = { id: 'me', cls: 'arkframe', x: 0, y: 0, vx: 0, vy: 0, dead: false, tf: { mode: 'robot', k: 0, mark: -1 } };
const JETG = {};
let tfOn = false;
function tfInit() {
  if (!window.__TF || !window.__tf3) return false;
  window.__AX = {
    motBones: (m) => { if (m._bones) return m._bones; const b = {}; m.obj && m.obj.traverse((o) => { if (o.isBone) b[o.name] = o; }); return (m._bones = b); },
    rotW, myMechKey: () => save.mech, unitH: () => 0, mdlGet: () => { },
    mc: (k) => (JETG[k] ? { st: 'ok', g: JETG[k] } : null),
    part: (x, z, vx, vz, life, col, size, y) => burst(x * 1, (y || 10), z * 1, 1, col || '#ffe2c0', Math.hypot(vx || 0, vz || 0) * MK, life || .3, (size || 3) * 2.2, .4),
    SFX2: { hatch: () => noise(.08, .1, 700), clang: () => tone(1700 + Math.random() * 400, 1100, .1, 'triangle', .035), launch: () => noise(.3, .1, 2600), thump: () => tone(80, 40, .25, 'sine', .12) },
  };
  window.__T = { G: { local: { unit: TF_U }, units: [TF_U], t: 0 } };
  window.__tfHoldOK = true;
  for (const m of MECHS) { window.__tf3.HERO[m.id] = { fx: '#ff8a3a', n: 72, style: 'fire' }; const pf = window.__TF.PROF[m.id]; if (pf) pf.alt = 0; }
  return (tfOn = true);
}
function tfTick(dt) {
  if (!tfOn || !TF_M.obj || typeof window.mdlAnimate !== 'function') return false;
  let k = 0; if (P.fly) k = P.tfUp ? 1 - P.tf / FLY.tf : P.tf / FLY.tf;
  k = clamp(k, 0, 1); TF_U.tf.k = k; TF_U.tf.mode = 'robot'; TF_U.x = P.x; TF_U.y = P.z;
  P.wrap.position.set(0, 0, 0); P.wrap.rotation.set(0, P.yaw - Math.PI / 2, 0); P.wrap.scale.setScalar(1.25); P.wrap.visible = true;
  try { window.mdlAnimate(TF_E, TF_M, TF_U, dt, performance.now() / 1000); } catch (e) { window.__tfErrLS = String(e && e.stack || e).slice(0, 300); }
  const J = TF_E._jet; if (J && J.grp) { J.grp.rotation.order = 'YXZ'; J.grp.rotation.x = -P.bank * .6 * k; if (G.state === 'title') J.grp.visible = false; }
  if (P.fly) P.pod = { x: P.x, y: P.alt + 23.75 * .45 + 2, z: P.z };
  return true;
}
function placeJet(dt) {
  if (tfTick(dt)) return;
  const jet = JETS[save.mech]; for (const k in JETS) if (JETS[k] !== jet) JETS[k].visible = false;
  let k = 0; if (P.fly) k = P.tfUp ? 1 - P.tf / FLY.tf : P.tf / FLY.tf;
  const ke = k * k * (3 - 2 * k);
  P.wrap.scale.setScalar(1.25 * Math.max(.001, 1 - ke)); P.wrap.rotation.z = ke * 1.2;
  if (!jet) return;
  jet.visible = ke > .02 && G.state !== 'title';
  if (!jet.visible) return;
  const pop = ke < 1 ? ke * (1 + .25 * Math.sin(ke * Math.PI)) : 1;
  jet.scale.setScalar(Math.max(.001, pop));
  jet.position.set(P.x, P.alt + 3, P.z); jet.rotation.set(-.06, P.hd, P.bank * .7, 'YXZ');
  for (const f of jet.userData.fl || []) { const s = (P.tfUp ? 1 : .5) * (1 + Math.random() * .3); f.scale.set(1, 1, 3 + s * 4); }
  P.pod = { x: P.x, y: P.alt + 5, z: P.z };
}

// ───────── 불꽃 드론 (ASCEND 동반 드론: 흰 핵 + 불꽃색 후광 + 빛 꼬리, 기울어진 궁도로 돈다) ─────────
// 크기: ASCEND(기체 키 90에 핵 2.6·후광 7.5)를 이 기체 키에 맞춘 뒤 1.5배
const DS = 23.75 / 90 * 2.4, DRONES = []; let glowTex = null, droneClock = 0;
function glowSpr(col, size, normal) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  s.scale.setScalar(size); s.renderOrder = 7; return s;
}
function buildDrones() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.22, 'rgba(255,255,255,.9)'); gr.addColorStop(.55, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c);
  for (let i = 0; i < 6; i++) {
    // 불꽃: 바깥은 짙은 주홍(밝은 모래 위에서도 보이게 보통 섞임), 안쪽은 노랑·흰 빛(더하기 섞임)
    const d = new THREE.Group(), halo = glowSpr(0xff5a10, 7.5 * DS, true), mid = glowSpr(0xffa030, 4.2 * DS), core = glowSpr(0xfff4d0, 2.2 * DS);
    halo.material.opacity = .8; d.add(halo); d.add(mid); d.add(core); d.visible = false; scene.add(d);
    const trail = []; for (let k = 0; k < 4; k++) { const s = glowSpr(k < 2 ? 0xff6a1a : 0xd8401a, (5 - k) * DS, true); s.visible = false; scene.add(s); trail.push(s); }
    DRONES.push({ g: d, halo, core, trail, hist: [], inc: .12 + ((i * .618) % 1) * .34, w: (2.4 + ((i * .37) % 1) * 1.4) * (i % 2 ? 1 : -1), ph: i * 1.7, x: 0, y: 0, z: 0 });
  }
}
function updDrones(dt) {
  droneClock += dt; const now = droneClock;
  const n = G.state !== 'title' && P.w && P.w.blade ? st('blade', 'n') : 0, R = n ? st('blade', 'rad') : 0, dmg = n ? st('blade', 'dmg') : 0, cy = P.alt + 13;
  for (let i = 0; i < DRONES.length; i++) {
    const D = DRONES[i], on = i < n; D.g.visible = on; for (const s of D.trail) s.visible = on; if (!on) { D.hist.length = 0; continue; }
    const th = now * D.w + D.ph, px = R * Math.cos(th), q = R * Math.sin(th), py = q * Math.sin(D.inc), pz = q * Math.cos(D.inc), node = i / n * TAU, cN = Math.cos(node), sN = Math.sin(node);
    D.x = P.x + px * cN - pz * sN; D.z = P.z + px * sN + pz * cN; D.y = Math.max(2.5, cy + py);
    D.g.position.set(D.x, D.y, D.z);
    const fl = .45 + .4 * Math.sin(now * 11 + D.ph) * Math.sin(now * 3.7 + i);
    D.halo.material.opacity = .55 + fl * .35; D.core.material.opacity = Math.max(.5, fl + .35); D.halo.scale.setScalar(7.5 * DS * (.9 + fl * .25));
    D.hist.unshift([D.x, D.y, D.z]); if (D.hist.length > 12) D.hist.length = 12;
    D.trail.forEach((s, k) => { const h = D.hist[Math.min(D.hist.length - 1, (k + 1) * 2)]; if (h) s.position.set(h[0], h[1], h[2]); s.material.opacity = Math.max(0, (.6 - k * .13) * (fl + .55)); });
    if (G.state !== 'play') continue;
    for (const e of E) {         // 부딪히면 피해
      if (e.dead || e.bladeT > 0) continue; const dx = e.x - D.x, dz = e.z - D.z;
      if (dx * dx + dz * dz < (e.T.r + 3.4) ** 2 && D.y < e.T.h + 8) { const d = Math.hypot(dx, dz) || 1; e.bladeT = .28; dealDmg(e, dmg, dx / d, dz / d, 1.1); burst(D.x, D.y, D.z, 5, 0xffb04a, 50, .24, 8, .5); }
    }
  }
}

// ───────── 보호막 전개 (ASCEND 특수기술 '보호막 전개': 재사용 15초, 최대 내구 30%를 막는다) ─────────
const BAR = { cd: 15, dur: 8, frac: .3 };
let barMesh = null;
function buildBarrier() {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { c: { value: new THREE.Color(0x5fd8ff) }, a: { value: 0 }, t: { value: 0 } },
    vertexShader: 'varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vP=position;gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 c;uniform float a;uniform float t;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.-abs(dot(vN,vV)),2.4);vec3 q=abs(fract(vP*.16+vec3(0.,t*.12,0.))-.5);float grid=smoothstep(.44,.5,max(q.x,max(q.y,q.z)));float band=smoothstep(.47,.5,abs(fract(vP.y*.05-t*.35)-.5));gl_FragColor=vec4(c*(f*1.5+grid*.28+band*.35+.05)*a,a);}' });
  barMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(15, 4), mat); barMesh.visible = false; barMesh.renderOrder = 8; scene.add(barMesh);
}
function placeBarrier(dt) {
  if (!barMesh) return; const on = P.bar > 0 && G.state !== 'title'; barMesh.visible = on; if (!on) return;
  const u = barMesh.material.uniforms; u.t.value += dt; const fade = Math.min(1, (BAR.dur - P.barT) * 6) * Math.min(1, P.barT * 2);
  u.a.value = (.45 + P.barHit * .9) * fade; barMesh.position.set(P.x, P.alt + 11, P.z); barMesh.scale.setScalar((P.fly ? 1.35 : 1) * (1 + P.barHit * .06));
}
function steer(m, nx, ny, nz, rate, dt) {
  const L = Math.hypot(nx, ny, nz) || 1; nx /= L; ny /= L; nz /= L;
  const ang = Math.acos(clamp(m.dx * nx + m.dy * ny + m.dz * nz, -1, 1)); if (ang < 1e-4) return;
  const k = Math.min(1, rate * dt / ang); m.dx += (nx - m.dx) * k; m.dy += (ny - m.dy) * k; m.dz += (nz - m.dz) * k;
  const l2 = Math.hypot(m.dx, m.dy, m.dz) || 1; m.dx /= l2; m.dy /= l2; m.dz /= l2;
}
function updMissiles(dt) {
  for (const m of msl) {
    if (m.delay > 0) { m.delay -= dt; if (P.pod) { m.x = P.pod.x + rand(-.8, .8); m.y = P.pod.y; m.z = P.pod.z + rand(-.8, .8); } continue; }
    if (!m.fired) { m.fired = true; sfx.launch(); burst(m.x, m.y, m.z, 4, 0xbfe8ff, 22, .25, 9, -.4); }
    m.t += dt;
    if (m.tg && m.tg.dead) m.tg = nearest(m.x, m.z, 160);
    if (m.tg) { m.tx = m.tg.x; m.tz = m.tg.z; m.ty = m.tg.T.h * .45; }
    const ex = m.tx - m.x, ey = m.ty - m.y, ez = m.tz - m.z, dist = Math.hypot(ex, ey, ez) || 1;
    if (m.t < MP.climb) { const k = m.t / MP.climb; m.spd = MP.v0 + (MP.vClimb - MP.v0) * k * k; m.thrust = .45 + .55 * k; steer(m, m.dx * .3, 1, m.dz * .3, 1.2, dt); }
    else {
      const fade = clamp((dist - 42) / 137, 0, 1), w = MP.wob * fade, ws = Math.sin(m.t * MP.wf + m.seed), wc = Math.cos(m.t * MP.wf * .7 + m.seed);
      let lx = -ez, lz = ex; const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll;
      steer(m, ex / dist + lx * w * ws, ey / dist + w * .45 * wc, ez / dist + lz * w * ws, MP.turn + (m.t - MP.climb) * MP.turnUp, dt);
      m.spd = Math.min(dist < MP.endR ? MP.vEnd : MP.vmax, m.spd + MP.acc * dt); m.thrust = dist < MP.endR ? 1.35 : 1;
    }
    m.x += m.dx * m.spd * dt; m.y += m.dy * m.spd * dt; m.z += m.dz * m.spd * dt;
    if ((m.puff += dt) > (MOBILE ? .07 : .04)) { m.puff = 0; burst(m.x - m.dx * 3, m.y - m.dy * 3, m.z - m.dz * 3, 1, 0x5a6270, 4, .38, 7, .1); }
    const hr = 3 + (m.tg ? m.tg.T.r : 0);
    if (dist < hr + m.spd * dt || (m.t > MP.climb && m.y < 1.2) || m.t > MP.life) {
      m.dead = true; explode(m.x, m.z, 17, m.dmg, 0xffa04a); xfBoom(m.x, m.z, 'grunt', 9, 'emp');
    }
  }
  msl = msl.filter((m) => !m.dead);
}
function castBarrier() {
  P.barMax = P.bar = Math.round(P.maxHp * BAR.frac); P.barT = BAR.dur; P.barCd = BAR.cd; P.barHit = 1;
  tone(420, 880, .3, 'sine', .07); tone(880, 1320, .25, 'triangle', .04, .08); ring(P.x, P.z, 6, 24, .35, 0x5fd8ff);
  num(P.x, 30 + P.alt, P.z, '보호막', '#9ff3ff', 16);
}
// air: 공중·대공 공격은 날고 있는 기체도 맞힌다(지상 공격은 날면 피한다)
function hurtPlayer(d, air) {
  if (P.inv > 0 || G.state !== 'play' || G.won || (P.alt > 10 && !air) || P.cloakT > 0) return;
  d = Math.round(d * (1 + .2 * (G.threat - 1)) * (P.taken || 1));
  if (P.bar > 0) {          // 보호막이 먼저 받는다
    const a = Math.min(P.bar, d); P.bar -= a; d -= a; P.barHit = 1; if (P.bar <= 0) { P.barT = 0; burst(P.x, 12, P.z, 30, 0x9ff3ff, 90, .4, 9); tone(900, 200, .25, 'square', .05); }
    if (d <= 0) { P.inv = .3; tone(1200, 700, .08, 'triangle', .05); return; }
  }
  P.hp -= d; P.inv = .6; G.shake = Math.max(G.shake, 4); sfx.hurt();
  $('#hurt').style.opacity = .8; setTimeout(() => ($('#hurt').style.opacity = 0), 140);
  num(P.x, 22, P.z, '-' + d, '#ff6a5a', 18); burst(P.x, 10, P.z, 14, 0xff5a4a, 60, .4, 9);
  if (!AN.over && d >= 10) oneShot('hit', .42);
  if (P.hp <= 0) { P.hp = 0; endRun(false); }
}

function updShots(dt) {
  for (const s of shots) {
    s.x += s.vx * dt; s.z += s.vz * dt; s.y = Math.max(3, s.y + s.vy * dt); s.life -= dt;
    for (const e of E) {
      if (e.dead) continue; const dx = e.x - s.x, dz = e.z - s.z, rr = e.T.r + (s.kind === 'w' ? 5 : 2);
      if (dx * dx + dz * dz > rr * rr || (s.hit && s.hit.includes(e))) continue;
      dealDmg(e, s.dmg, s.vx / 300, s.vz / 300, s.kind === 'w' ? .9 : .5); burst(s.x, s.kind === 'w' ? 7 : s.y, s.z, 4, s.col || (s.kind === 'w' ? 0xdff8ff : 0x7fe6ff), 55, .22, 6, .9);
      flare(s.x, s.kind === 'w' ? 7 : s.y, s.z, s.col || (s.kind === 'w' ? 0xdff8ff : s.kind === 'f' ? 0xfff0a0 : 0x7fe6ff), s.kind === 'w' ? 12 : 7, .08);
      if (s.pierce-- > 0) (s.hit ||= []).push(e); else { s.life = 0; break; }
    }
  }
  shots = shots.filter((s) => s.life > 0);

  for (const b of ebs) {
    b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
    const dx = b.x - P.x, dz = b.z - P.z;
    if ((P.alt <= 10 || b.air) && dx * dx + dz * dz < (P.r + (b.air && P.alt > 10 ? 4 : 2.2)) ** 2) { hurtPlayer(b.dmg, b.air); b.life = 0; if (b.air && P.alt > 10) { flare(b.x, P.alt + 6, b.z, 0xffb060, 10, .1); burst(b.x, P.alt + 6, b.z, 8, 0xffa040, 50, .3, 8, .2); } }
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
    if (g.mag) { const sp = 150 + g.t * 60; g.x += dx / (d || 1) * sp * dt; g.z += dz / (d || 1) * sp * dt; if (d < 7) { g.v > 0 && addXp(g.v); g.dead = true; sfx.pick(); if (Math.random() < .5) flare(P.x + rand(-3, 3), 8, P.z + rand(-3, 3), g.v >= 4 ? 0xffd27a : g.v >= 2 ? 0xd8a0ff : 0x9ff3ff, 5, .14); } }
  }
  gems = gems.filter((g) => !g.dead);
  for (const p of picks) {
    p.t += dt; const d = Math.hypot(P.x - p.x, P.z - p.z);
    if (d < 11) {
      p.dead = true;
      ring(p.x, p.z, 3, 26, .4, p.kind === 'heal' ? 0x7dff9a : 0xffcf5a); flare(p.x, 8, p.z, p.kind === 'heal' ? 0x9dffb0 : 0xffe08a, 22, .22); burst(p.x, 7, p.z, 24, p.kind === 'heal' ? 0x7dff9a : 0xffcf5a, 70, .5, 8, .9);
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
    const an = k === 'rifle' && ARM_NAME[PRIM], nm = an ? an.nm : u && u.nm, ic = an ? an.ic : u && u.ic;
    const ds = u && (an && lv === 0 ? an.ds0 : u.ds[Math.min(lv, u.ds.length - 1)] + (an && ARM === 'katana' && /탄/.test(u.ds[Math.min(lv, u.ds.length - 1)]) ? ' (검기 +1)' : ''));
    b.innerHTML = k === '_heal'
      ? `<div class="ic">✚</div><div class="nm">긴급 수리</div><div class="ds">내구 40 회복</div>`
      : `<div class="ic">${ic}</div><div class="lvt ${lv ? '' : 'new'}">${lv ? `Lv ${lv} → ${lv + 1}` : '새 장비'}</div><div class="nm">${nm}</div><div class="ds">${ds}</div><kbd>${i + 1}</kbd>`;
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
  $('#slots').innerHTML = Object.keys(UP).filter((k) => P.w[k] > 0).map((k) => `<div class="slot">${k === 'rifle' && ARM_NAME[PRIM] ? ARM_NAME[PRIM].ic : UP[k].ic}<b>${P.w[k]}</b></div>`).join('');
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
  if (t > 20) w.push(['trooper', 1.3]); if (t > 60) w.push(['wing', 1.1]); if (t > 90) w.push(['robo', 1.2]); if (t > 125) w.push(['spit', .9]);
  if (t > 140) w.push(['jet', .22]); if (t > 195) w.push(['heli', .18]); if (t > 40) w.push(['aat', .8]); if (t > 110) w.push(['aagun', .3]);
  let tot = 0; for (const a of w) tot += a[1]; let r = Math.random() * tot;
  for (const a of w) { if ((r -= a[1]) < 0) return a[0]; } return 'ling';
}
function banner(txt, ms = 2200) { const b = $('#banner'); b.textContent = txt; b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), ms); }

const EVENTS = [
  [55, () => { banner('무리 습격'); sfx.warn(); swarm(22); }],
  [95, () => midBoss('goliath')],
  [135, () => { banner('거대 개체 접근'); sfx.warn(); const [x, z] = spawnPos(170, 190); spawn('behemoth', x, z); }],
  [150, () => { banner('무리 습격'); sfx.warn(); swarm(30); }],
  [175, () => midBoss('scorp')],
  [210, () => { banner('거대 개체 접근'); sfx.warn(); for (let i = 0; i < 2; i++) { const [x, z] = spawnPos(170, 190); spawn('behemoth', x, z); } }],
  [235, () => midBoss('brood')],
  [262, () => { banner('무리 습격'); sfx.warn(); swarm(38); }],
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
  // 날고 있으면 날벌레·대공 보병이 더 몰려온다(하늘도 안전하지 않게)
  if (P.fly && !G.won && (G.flyAcc = (G.flyAcc || 0) + dt) > Math.max(.7, 1.6 - G.t / 300)) { G.flyAcc = 0; const [x, z] = spawnPos(120, 150); if (Math.random() < .55) { spawn('wing', x, z); spawn('wing', x + 8, z + 6); } else spawn('aat', x, z); }
  let rate = (1.5 + Math.min(G.t, RUN_TIME) / 60 * 1.05) * (1 + .15 * (G.threat - 1));   // 초당 무리 수
  if (G.bossOn) rate *= .3;
  G.spawnAcc += rate * dt;
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1; if (E.length >= MAX_ALIVE) continue;
    const [x, z] = spawnPos(140, 175), ty = pickType();
    if (ty === 'ling' || ty === 'trooper') for (let i = 0; i < (ty === 'ling' ? 3 : 2); i++) spawn(ty, x + rand(-9, 9), z + rand(-9, 9));
    else if (ty === 'jet') { const a = rand(0, TAU); spawn('jet', Math.cos(a) * (ARENA_R + 40), Math.sin(a) * (ARENA_R + 40)); }
    else spawn(ty, x, z);
  }
}
function eShot(x, z, ang, sp, dmg, life = 5, col, air) { if (ebs.length < 270) ebs.push({ x, z, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, dmg, life, col, air, y: air && P.alt > 10 ? P.alt + 6 : 8 }); }
// 날고 있는 기체를 노리는 대공탄: 움직이는 방향을 조금 앞서 겨눈다
function aaShot(e, sp, dmg, spread = 0, col = 0xffa040) {
  const lead = Math.hypot(P.x - e.x, P.z - e.z) / sp, hx = P.fly ? Math.sin(P.hd) * FLY.spd * lead * .7 : inp.x * 40 * lead, hz = P.fly ? Math.cos(P.hd) * FLY.spd * lead * .7 : inp.z * 40 * lead;
  const a = Math.atan2(P.x + hx - e.x, P.z + hz - e.z) + rand(-spread, spread); eShot(e.x, e.z, a, sp, dmg, 2.4, col, true);
}
// 적의 곡사 산성탄: 내 자리에 초록 경고를 띄우고 포물선으로 떨어져 터진다
function eLob(e, x1, z1, r, dmg, T = .95) {
  const rr = Math.hypot(x1, z1); if (rr > ARENA_R - 6) { x1 *= (ARENA_R - 6) / rr; z1 *= (ARENA_R - 6) / rr; }
  shells.push({ foe: 1, x0: e.x, y0: e.T.h * .7 + (e.T.fly ? e.T.fly : 0), z0: e.z, x1, z1, t: 0, T, dmg, r }); decal(x1, z1, r, T, 0x9be05a);
}
function midBoss(k) {
  const [x, z] = spawnPos(165, 185), e = spawn(k, x, z); if (!e) return;
  G.mid = e; banner(`중간 보스 · ${ET[k].boss}`, 2800); sfx.warn(); G.shake = Math.max(G.shake, 4); screenFlash('#ff6a4a', .25, .7);
}
// 보병·공중·중간 보스의 행동. 이동 방향은 e.mv(각도)에, 속도는 돌려준다
function unitAI(e, dt, d, dx, dz) {
  const T = e.T, toP = Math.atan2(dx, dz), rage = e.hp < e.max * .4; e.mv = toP;
  switch (e.t) {
    case 'trooper': {
      if (e.st === 'fire') { e.yaw = toP; e.ct -= dt; if (e.ct <= 0 && e.cnt > 0) { e.cnt--; e.ct = .13; const a = toP + rand(-.07, .07); eShot(e.x + Math.sin(a) * 4, e.z + Math.cos(a) * 4, a, 105, T.dmg, 2, 0xffc060); flare(e.x + Math.sin(a) * 5, 7, e.z + Math.cos(a) * 5, 0xffd27a, 6, .06); tone(900, 500, .04, 'square', .012); }
        if (e.cnt <= 0 && e.ct <= -.25) { e.st = 'move'; e.tm = rand(1.6, 2.4); } return 0; }
      if (d < 88 && e.tm <= 0) { e.st = 'fire'; e.cnt = 3; e.ct = .35; return 0; }
      return d < 70 ? T.spd * .35 : T.spd;
    }
    case 'spit': {
      if (d < 62) e.mv = toP + Math.PI; else if (d < 95) e.mv = toP + Math.PI / 2;
      if (e.st === 'cast') { e.yaw = toP; e.flash = .05; if (e.tm <= 0) { e.st = 'move'; e.tm = rand(2.8, 3.6); eLob(e, P.x + inp.x * 20, P.z + inp.z * 20, 16, T.dmg * 1.4, .9); tone(420, 200, .15, 'sine', .05); } return 0; }
      if (e.tm <= 0 && d < 140) { e.st = 'cast'; e.tm = .4; return 0; }
      return T.spd * (d < 95 ? .6 : 1);
    }
    case 'wing': {
      if (P.fly) { e.alt = lerp(e.alt || 0, P.alt - T.fly + 2, Math.min(1, dt * 3)); e.bank = 0; e.st = 'move'; return T.spd * 1.5; }   // 날고 있는 기체를 곧장 쫓는다
      if (e.st === 'dive') { e.mv = e.ang; e.alt = lerp(e.alt || 0, -14, Math.min(1, dt * 6)); e.bank = 0; if (e.tm <= 0) { e.st = 'move'; e.tm = rand(2.2, 3.4); } return T.spd * 2.5; }
      e.alt = lerp(e.alt || 0, 0, Math.min(1, dt * 3)); const orb = Math.atan2(e.x - P.x, e.z - P.z) + .9;
      e.mv = Math.atan2(P.x + Math.sin(orb) * 55 - e.x, P.z + Math.cos(orb) * 55 - e.z); e.bank = -.45;
      if (e.tm <= 0 && d < 95) { e.st = 'dive'; e.ang = toP; e.tm = 1.15; tone(700, 1300, .2, 'sine', .04); }
      return T.spd;
    }
    case 'jet': {
      if (e.ang == null || Math.hypot(e.x, e.z) > ARENA_R + 45 && Math.cos(e.ang - Math.atan2(-e.x, -e.z)) < .2) e.ang = toP + rand(-.25, .25);
      e.mv = e.ang; e.yaw = e.ang; e.bank = Math.sin(e.ph * 1.3) * .25; e.ct = (e.ct || 0) - dt;
      const ahead = Math.cos(toP - e.ang) > .6;
      if (ahead && d < 130 && e.ct <= 0) { e.ct = .16; for (const s of [-1, 1]) { const ox = Math.cos(e.ang) * 4 * s, oz = -Math.sin(e.ang) * 4 * s; eShot(e.x + ox, e.z + oz, toP + rand(-.05, .05), 150, 7, 1.6, 0x9fe0ff, true); } tone(1200, 700, .03, 'square', .01); }
      return T.spd;
    }
    case 'heli': {
      const orb = Math.atan2(e.x - P.x, e.z - P.z) + .5; e.mv = Math.atan2(P.x + Math.sin(orb) * 88 - e.x, P.z + Math.cos(orb) * 88 - e.z); e.yaw = toP; e.bank = .12;
      if (e.tm <= 0 && d < 160) { e.tm = rand(2.8, 3.6);
        if (P.fly) { e.cnt = 6; e.ct = 0; } else for (let i = 0; i < 2; i++) { const tx = P.x + inp.x * 18 + rand(-14, 14), tz = P.z + inp.z * 18 + rand(-14, 14), eta = enemyMissile(e, tx, tz, 12, .15 + i * .25); if (eta) decal(tx, tz, 16, eta, 0x9be05a); } }
      if (e.cnt > 0 && (e.ct -= dt) <= 0) { e.cnt--; e.ct = .12; aaShot(e, 150, 7, .06, 0x9fe0ff); flare(e.x, T.fly, e.z, 0xbfe8ff, 7, .06); }
      return T.spd;
    }
    case 'aat': {        // 대공 보병: 날고 있으면 대공 로켓, 땅에 있으면 직사 로켓
      const R = P.fly ? 150 : 95;
      if (e.st === 'fire') { e.yaw = toP; if ((e.ct -= dt) <= 0) { e.st = 'move'; e.tm = rand(2, 2.8); if (P.fly) aaShot(e, 135, 13, .03, 0xff8a3a); else eShot(e.x, e.z, toP, 110, T.dmg, 2.2, 0xff8a3a); flare(e.x + Math.sin(toP) * 4, 12, e.z + Math.cos(toP) * 4, 0xffb060, 9, .08); burst(e.x, 10, e.z, 4, 0x8a7a70, 20, .5, 8, .5); tone(300, 900, .12, 'sawtooth', .03); } return 0; }
      if (d < R && e.tm <= 0) { e.st = 'fire'; e.ct = .45; return 0; }
      return d < R * .7 ? T.spd * .3 : T.spd;
    }
    case 'aagun': {      // 대공 전차: 거리를 두고 고사포 연사
      if (d < 85) e.mv = toP + Math.PI * .6; e.yaw = e.mv;
      if (e.tm <= 0 && d < 190) { e.tm = rand(1.8, 2.4); e.cnt = P.fly ? 5 : 3; e.ct = 0; }
      if (e.cnt > 0 && (e.ct -= dt) <= 0) { e.cnt--; e.ct = .14; if (P.fly) aaShot(e, 170, 9, .08, 0xffd27a); else eShot(e.x, e.z, toP + rand(-.08, .08), 120, 10, 2.2, 0xffd27a); flare(e.x + Math.sin(toP) * 6, 10, e.z + Math.cos(toP) * 6, 0xffe08a, 9, .06); tone(260, 140, .06, 'square', .03); }
      return d < 110 ? T.spd * .5 : T.spd;
    }
    case 'goliath': case 'scorp': case 'brood': if (P.fly && (e.flk = (e.flk || 0) - dt) <= 0) { e.flk = rage ? .5 : .8; for (let i = -1; i <= 1; i++) aaShot(e, 140, 9, .02 + Math.abs(i) * .12, T.col); }   // 보스도 날고 있으면 대공탄
      return bossAI(e, dt, d, toP, rage);
  }
  return T.spd;
}
function bossAI(e, dt, d, toP, rage) {
  const T = e.T, k = e.t;
  if (e.st === 'move') {
    if (k === 'brood') { const orb = Math.atan2(e.x - P.x, e.z - P.z) + .35; e.mv = Math.atan2(P.x + Math.sin(orb) * 70 - e.x, P.z + Math.cos(orb) * 70 - e.z); }
    if (e.tm <= 0) {
      e.pat = ((e.pat ?? -1) + 1) % 3; e.cnt = 0; e.ct = 0;
      const P0 = { goliath: ['barrage', 'stomp', 'gatling'], scorp: ['charge', 'acidring', 'lob'], brood: ['bombrun', 'brood', 'rain'] }[k][e.pat];
      e.st = P0; e.tm = { barrage: 1.8, stomp: 1.1, gatling: 1.9, charge: .9, acidring: 1.4, lob: 1.6, bombrun: 2.2, brood: .9, rain: 1.8 }[P0];
      if (P0 === 'stomp') { e.dec = decal(e.x, e.z, 48, 1.1, 0xff5a2a); sfx.tele(); }
      if (P0 === 'charge') { e.ang = toP; e.dec = lineDecal(e.x, e.z, e.ang, 200, 28, .9, 0x5ab0ff); sfx.tele(); }
      if (P0 === 'bombrun') { e.ang = toP; sfx.tele(); }
    }
    return d < T.r + 14 && k !== 'brood' ? 0 : T.spd * (rage ? 1.3 : 1);
  }
  const done = () => { e.st = 'move'; e.tm = rage ? 1.1 : 1.8; e.dec = null; };
  e.ct -= dt; e.yaw = e.st === 'charge' || e.st === 'dash' || e.st === 'bombrun' ? e.ang : toP;
  switch (e.st) {
    case 'barrage':      // 어깨 로켓 세례: 내 주변에 차례로 떨어진다
      if (e.ct <= 0 && e.cnt < (rage ? 10 : 7)) { e.ct = .18; e.cnt++; const x = P.x + inp.x * 26 + rand(-26, 26), z = P.z + inp.z * 26 + rand(-26, 26); flare(e.x, T.h * .9, e.z, 0xffc060, 10, .1);
        decal(x, z, 17, .85, 0xff7a3a, () => { ring(x, z, 4, 18, .3, 0xffa04a); burst(x, 4, z, 18, 0xffa04a, 70, .45, 10); mark(x, z, 12, 0x0e0805, 'scorch', 6, .55); lightFlash(x, 12, z, 0xffa04a, 30, .25); sfx.boom(); if (Math.hypot(P.x - x, P.z - z) < 17 + P.r) hurtPlayer(16); }); }
      if (e.tm <= 0) done(); return 0;
    case 'stomp':
      e.sc = 1 + Math.sin((1.1 - e.tm) * 3) * .08;
      if (e.tm <= 0) { e.sc = 1; ring(e.x, e.z, 8, 50, .4, 0xff7a3a); burst(e.x, 3, e.z, 50, 0xffb04a, 100, .55, 12); mark(e.x, e.z, 34, 0x0e0805, 'scorch', 8, .55); lightFlash(e.x, 14, e.z, 0xffa04a, 60, .35); sfx.boom(); G.shake = 5; if (d < 48 + P.r) hurtPlayer(26); done(); }
      return 0;
    case 'gatling':      // 부채꼴 기관포 4연발
      if (e.ct <= 0 && e.cnt < 4) { e.ct = .42; e.cnt++; const n = rage ? 9 : 7; for (let i = 0; i < n; i++) eShot(e.x, e.z, toP + (i - (n - 1) / 2) * .13, 115, 11, 2.6, 0xffc060); flare(e.x + Math.sin(toP) * 10, T.h * .6, e.z + Math.cos(toP) * 10, 0xffd27a, 14, .08); tone(300, 120, .12, 'square', .05); }
      if (e.tm <= 0) done(); return 0;
    case 'charge': if (e.tm <= 0) { e.st = 'dash'; e.tm = .65; sfx.dash(); } return 0;
    case 'dash': e.mv = e.ang; burst(e.x, 6, e.z, 3, 0x5ab0ff, 30, .4, 12); if (e.tm <= 0) { G.shake = 3; done(); } return 290;
    case 'acidring':     // 산성 고리 3겹
      if (e.ct <= 0 && e.cnt < 3) { e.ct = .42; const n = rage ? 22 : 16, off = e.cnt++ * .19; for (let i = 0; i < n; i++) eShot(e.x, e.z, off + i / n * TAU, 60, 12, 5, 0x9be05a); ring(e.x, e.z, 10, 34, .3, 0x9be05a); tone(260, 140, .2, 'sawtooth', .06); }
      if (e.tm <= 0) done(); return 0;
    case 'lob':
      if (e.ct <= 0 && e.cnt < (rage ? 7 : 5)) { e.ct = .26; e.cnt++; eLob(e, P.x + inp.x * 24 + rand(-20, 20), P.z + inp.z * 24 + rand(-20, 20), 18, 18, .85); }
      if (e.tm <= 0) done(); return 0;
    case 'bombrun':      // 머리 위를 지나가며 땅에 폭탄 줄
      e.mv = e.ang; if (e.ct <= 0) { e.ct = .2; const x = e.x, z = e.z; decal(x, z, 18, .7, 0xc07aff, () => { ring(x, z, 4, 19, .3, 0xc07aff); burst(x, 4, z, 18, 0xc07aff, 70, .45, 10); mark(x, z, 13, 0x2a0e30, 'splat', 7, .5); sfx.boom(); if (Math.hypot(P.x - x, P.z - z) < 18 + P.r) hurtPlayer(18); }); }
      if (e.tm <= 0) done(); return T.spd * 3;
    case 'brood': if (e.tm <= 0) { const n = rage ? 8 : 5; for (let i = 0; i < n; i++) { const a = i / n * TAU; spawn('wing', e.x + Math.cos(a) * 20, e.z + Math.sin(a) * 20); } ring(e.x, e.z, 8, 40, .4, 0xc07aff); done(); } return 0;
    case 'rain':
      if (e.ct <= 0 && e.cnt < (rage ? 8 : 6)) { e.ct = .25; e.cnt++; const tx = P.x + inp.x * 30 + rand(-22, 22), tz = P.z + inp.z * 30 + rand(-22, 22), eta = enemyMissile(e, tx, tz, 16, .1); if (eta) decal(tx, tz, 18, eta, 0x9be05a); else eLob(e, tx, tz, 18, 16, .9); }
      if (e.tm <= 0) done(); return T.spd * .4;
  }
  done(); return 0;
}

function kill(e) {
  if (e.dead) return; e.dead = true; cancelDecal(e.dec); e.dec = null;
  const T = e.T; G.kills++;
  burst(e.x, T.h * .5, e.z, T.r > 10 ? 70 : 12, T.col, T.r > 10 ? 130 : 60, T.r > 10 ? .9 : .45, T.r > 10 ? 14 : 9);
  if (T.mech) { mark(e.x, e.z, T.r * (T.r > 10 ? 2 : 1.4), 0x0e0805, 'scorch', T.r > 10 ? 10 : 5, .55); burst(e.x, (T.fly ? T.fly : T.h * .5), e.z, 8, 0xffa04a, 60, .5, 9); if (T.fly || T.r > 10) xfBoom(e.x, e.z, T.r > 10 ? 'elite' : 'grunt', T.r * 1.1, 'emp'); }
  else mark(e.x, e.z, T.r * (T.r > 10 ? 1.9 : 1.35), e.t === 'plasma' || e.t === 'spit' ? 0x2a4a18 : 0x4a1430, 'splat', T.r > 10 ? 9 : 4, .42);
  flare(e.x, T.fly ? T.fly : T.h * .5, e.z, T.col, T.r > 10 ? 40 : 11, .1); if (e === G.mid) G.mid = null;
  if (T.r > 10) screenFlash(e.t === 'queen' ? '#fff2c0' : '#ffb070', e.t === 'queen' ? .8 : .35, e.t === 'queen' ? .9 : .4);
  if (T.r > 10) {
    ring(e.x, e.z, 6, 70, .6, T.col); sfx.boom(); G.shake = 6; G.slow = .35; P.ult = Math.min(100, P.ult + 25 * (P.ultGain || 1)); G.st.big++;
    xfBoom(e.x, e.z, e.t === 'queen' ? 'boss' : 'elite', T.h * .9, 'zeta');
    if (e.t === 'queen') { win(); return; }
    picks.push({ kind: 'chest', x: e.x, z: e.z, t: 0 }); picks.push({ kind: 'heal', x: e.x + 12, z: e.z + 6, t: 0 });
    for (let i = 0; i < 14; i++) dropGem(e.x + rand(-14, 14), e.z + rand(-14, 14), 3);
  } else {
    sfx.kill(); P.ult = Math.min(100, P.ult + (G.bossOn ? 1.6 : 1.1) * (P.ultGain || 1));
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
      if (e.st === 'cast') { sp = 0; e.flash = .05; e.ct -= dt; if (e.ct <= 0) {
        // 산성 직선탄: 내가 있던 자리(살짝 앞)를 향해 곧게 날아온다. 바닥에 초록 경고
        e.st = 'move'; const tx = P.x + inp.x * 18, tz = P.z + inp.z * 18, eta = enemyMissile(e, tx, tz, T.dmg * 1.2, .15);
        if (eta) decal(tx, tz, 16, eta, 0x9be05a); tone(520, 300, .12, 'sine', .05); } }
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
    else if (T.anim || T.fly || T.boss || e.t === 'spit' || e.t === 'aagun') { sp = unitAI(e, dt, d, dx, dz) * e.sm; mx = Math.sin(e.mv); mz = Math.cos(e.mv); }

    if (e.stun > 0) { e.stun -= dt; sp = 0; if (Math.random() < .08) burst(e.x, e.T.h + 2, e.z, 1, 0xfff07a, 10, .3, 6, .2); }
    if (P.cloakT > 0 && e.st === 'move') { sp *= .35; mx = Math.sin(e.ph); mz = Math.cos(e.ph * .7); }   // 은신 중에는 헤맨다
    // 서로 밀어내기
    for (let j = i + 1; j < n; j++) {
      const o = E[j]; if (o.dead || !T.fly !== !o.T.fly) continue; const qx = o.x - e.x, qz = o.z - e.z, rr = T.r + o.T.r;
      if (Math.abs(qx) > rr || Math.abs(qz) > rr) continue; const q2 = qx * qx + qz * qz; if (q2 >= rr * rr || q2 < .0001) continue;
      const q = Math.sqrt(q2), push = (rr - q) * .5, px = qx / q * push, pz = qz / q * push, we = o.T.r / rr, wo = T.r / rr;
      e.x -= px * we; e.z -= pz * we; o.x += px * wo; o.z += pz * wo;
    }
    e.vx = mx * sp; e.vz = mz * sp;
    e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt; const kd = Math.max(0, 1 - 8 * dt); e.kx *= kd; e.kz *= kd;
    const er = Math.hypot(e.x, e.z), lim = e.t === 'jet' ? ARENA_R + 70 : ARENA_R - 4; if (er > lim) { e.x *= lim / er; e.z *= lim / er; }
    if (e.st !== 'fuse' && e.st !== 'stomp' && sp > 0) { const want = Math.atan2(mx, mz); let da = want - e.yaw; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; e.yaw += da * Math.min(1, dt * 9); }
    // 접촉 피해
    if (d < T.r + P.r && e.born <= 0 && e.t !== 'bane' && T.dmg > 0) {
      if (P.alt > 10) { if (T.fly) hurtPlayer(T.dmg, true); }
      else if (!T.fly || (e.alt || 0) < -T.fly * .6) hurtPlayer(e.st === 'dash' ? T.dmg * 1.3 : T.dmg);
    }
  }
  E = E.filter((e) => { if (e.dead && e.px) e.px.dead = true; return !e.dead; });
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
      const eta = MSW ? enemyMissile(e, x, z, 20, .35) : 0;      // 여왕의 직선탄 세례
      if (eta) decal(x, z, 20, eta, 0x9be05a);
      else decal(x, z, 22, .85, 0xff4a8a, () => { ring(x, z, 4, 22, .3, 0xff7ac4); burst(x, 4, z, 22, 0xff7ac4, 70, .45, 10); sfx.boom(); if (Math.hypot(P.x - x, P.z - z) < 22 + P.r) hurtPlayer(20); });
      sfx.tele();
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
  G.state = 'over'; music.pause(); stickEnd({ pointerId: stick.id }); $('#pause').classList.add('hide'); $('#lvl').classList.add('hide'); if (P.beamB) { P.beamB.m.visible = false; P.beamB = null; }
  if (!muted) { const j = jingle[won ? 'win' : 'lose']; j.currentTime = 0; j.volume = .6; j.play().catch(() => { }); }
  const key = `${G.threat}`, prev = save.best[key] || { t: 0, k: 0, w: 0 };
  const better = (won && !prev.w) || (won === !!prev.w && (won ? G.t < prev.t : G.t > prev.t));
  if (better) save.best[key] = { t: Math.round(G.t), k: G.kills, w: won ? 1 : 0 };
  if (won && G.threat >= save.maxThreat) save.maxThreat = G.threat + 1;
  const rw = runReward(won); persist();
  $('#ovT').textContent = won ? '여왕 격파' : '기체 대파'; $('#ovT').style.color = won ? '#ffd27a' : '#ff6a5a';
  $('#newrec').classList.toggle('hide', !better);
  $('#stats').innerHTML = `<span>생존 시간</span><b>${fmt(G.t)}</b><span>격파</span><b>${G.kills}</b><span>레벨</span><b>${P.lvl}</b><span>위험도</span><b>${G.threat}</b>`
    + (won && G.threat + 1 === save.maxThreat ? `<span style="grid-column:1/3;color:#9ff3ff;margin-top:6px">위험도 ${G.threat + 1} 해금</span>` : '');
  $('#reward').innerHTML = rw.html;
  $('#nextThreat').classList.toggle('hide', !won); $('#nextThreat').textContent = `🔥 위험도 ${G.threat + 1} 바로 도전`;
  setTimeout(() => $('#over').classList.remove('hide'), won ? 300 : 700);
  $('#hud').classList.add('hide');
}
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; $('#pause').classList.remove('hide'); music.pause(); }
  else if (G.state === 'pause') { G.state = 'play'; $('#pause').classList.add('hide'); if (!muted) music.play().catch(() => { }); last = performance.now(); }
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function startRun() {
  if (!save.own[save.mech]) return;
  audioInit(); $('#start').disabled = true; $('#retry').disabled = true; const st0 = $('#start').textContent; $('#start').textContent = '기체 준비 중…';
  try { await ensureMech(save.mech); } catch (e) { $('#start').textContent = '불러오지 못했습니다. 다시 눌러 주세요'; $('#start').disabled = false; $('#retry').disabled = false; return; }
  $('#start').textContent = st0; $('#retry').disabled = false;
  G.threat = save.threat; resetRun(); await setMech(save.mech);
  applyMech(MECH(save.mech));
  { const m = MECH(save.mech); $('#bUlt').lastElementChild.textContent = m.ult.ic; $('#bUlt').title = `${m.ult.nm} (Q)`; $('#bAuto').lastElementChild.textContent = m.auto.ic; $('#bAuto').title = `${m.auto.nm} · 자동 (E)`; }
  save.stat.runs++; const D = save.daily; if (D.mechs && !D.mechs.includes(save.mech)) D.mechs.push(save.mech); persist();
  $('#title').classList.add('hide'); $('#over').classList.add('hide'); $('#lvl').classList.add('hide'); $('#pause').classList.add('hide'); $('#hud').classList.remove('hide'); $('#boss').classList.add('hide');
  $('#btns').style.display = ''; drawSlots(); G.state = 'play'; last = performance.now();
  music.currentTime = 0; if (!muted) music.play().catch(() => { });
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; spawn('ling', Math.cos(a) * 105, Math.sin(a) * 105); }
  banner('5분을 버텨라', 1800); $('#start').disabled = false;
}

// ───────── 그리기 ─────────
function drawInstances(time) {
  const cnt = {}; for (const k in ET) cnt[k] = IM[k].map(() => 0); let sh = 0;
  const put = (x, z, r) => { if (sh >= 180) return; dummy.position.set(x, .25, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(r, 1, r); dummy.updateMatrix(); imShadow.setMatrixAt(sh++, dummy.matrix); };
  put(P.x, P.z, P.alt > 5 ? 9 : 7);
  for (const e of E) {
    const F = IM[e.t].length, moving = e.st === 'move' || e.st === 'dash' || e.st === 'dive' || e.st === 'pass';
    const f = F > 1 && moving ? Math.floor(e.ph * e.T.spd * .26) % F : 0, im = IM[e.t][f], i = cnt[e.t][f]++; if (i >= e.T.max) continue;
    const big = e.T.r > 10, air = e.T.fly ? e.T.fly + (e.alt || 0) + Math.sin(e.ph * 2.2) * 1.2 : 0;
    const hop = moving && F === 1 && !e.T.fly ? Math.abs(Math.sin(e.ph * (big ? 4 : 9))) * (big ? 1.2 : 1.6) : 0;
    const grow = e.born > 0 ? 1 - e.born / .35 * .7 : 1, sq = e.flash > 0 ? 1.12 : 1;
    dummy.position.set(e.x, hop + air, e.z);
    if (e.T.fly) dummy.rotation.set(e.st === 'dive' ? .35 : .05, e.yaw + e.T.yaw, e.bank || 0); else dummy.rotation.set(moving && F === 1 ? .12 : 0, e.yaw + e.T.yaw, F > 1 ? 0 : Math.sin(e.ph * 7) * (big ? .02 : .07));
    dummy.scale.set(e.sc * grow * sq, e.sc * grow * (2 - sq), e.sc * grow * sq); dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
    im.setColorAt(i, e.flash > 0 ? tmpC.setRGB(4, 4, 4) : e.st === 'fuse' ? tmpC.setRGB(2.4, .8, .5) : tmpC.setRGB(1, 1, 1));
    put(e.x, e.z, e.T.r * (e.T.fly ? .8 : 1.15));
  }
  for (const k in ET) IM[k].forEach((im, f) => { im.count = Math.min(cnt[k][f], ET[k].max); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; });
  imShadow.count = sh; imShadow.instanceMatrix.needsUpdate = true;

  let i = 0, wv = 0;
  for (const s of shots) {
    if (s.kind === 'w') {        // 검기: 날아가며 넓어지고 옛어진다
      if (wv >= 120) continue; const k = 1 - s.life / .46;
      dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(0, s.ang, 0); dummy.scale.set(1 + k * .5, 1, 1 + k * .2); dummy.updateMatrix();
      imWave.setMatrixAt(wv, dummy.matrix); imWave.setColorAt(wv++, tmpC.setRGB(.78, .96, 1)); continue;
    }
    if (i >= 260) break; dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(-Math.atan2(s.vy, 300), s.ang, 0, 'YXZ'); dummy.scale.set(.55, .55, 1.15); dummy.updateMatrix();
    const sc = s.col ? tmpC.set(s.col) : s.kind === 'f' ? tmpC.setRGB(1, .95, .6) : tmpC.setRGB(.25, .8, 1);
    sc.getHSL(HSL); imGlow.setColorAt(i, tmpC2.setHSL(HSL.h, 1, .5)); sc.lerp(WHITE, .35).multiplyScalar(1.45);
    imShot.setMatrixAt(i, dummy.matrix); imShot.setColorAt(i, sc);
    // 바깥 빛 꼬리: 앞은 밝고 뒤로 갈수록 엷어진다
    dummy.scale.set(s.kind === 'f' ? 5.5 : 4.6, 1, s.kind === 'f' ? 18 : 26); dummy.updateMatrix(); imGlow.setMatrixAt(i++, dummy.matrix);
  }
  dummy.rotation.order = 'XYZ';
  imShot.count = imGlow.count = i; imShot.instanceMatrix.needsUpdate = imGlow.instanceMatrix.needsUpdate = true; imShot.instanceColor.needsUpdate = imGlow.instanceColor.needsUpdate = true;
  imWave.count = wv; imWave.instanceMatrix.needsUpdate = true; imWave.instanceColor.needsUpdate = true;

  // 미사일 몸과 분사 불꽃
  i = 0;
  for (const m of msl) {
    if (i >= 80 || m.delay > 0) continue;
    dummy.position.set(m.x, m.y, m.z); dummy.quaternion.setFromUnitVectors(Z1, v3b.set(m.dx, m.dy, m.dz)); dummy.scale.setScalar(4.6); dummy.updateMatrix();
    imMsl.setMatrixAt(i, dummy.matrix); imMsl.setColorAt(i, tmpC.setRGB(1, 1, 1));
    const fl = m.thrust * (1 + Math.random() * .35);
    dummy.position.set(m.x - m.dx * 2.2, m.y - m.dy * 2.2, m.z - m.dz * 2.2); dummy.scale.set(1.3 * fl, 1.3 * fl, 2.1 * fl); dummy.updateMatrix();
    imFlame.setMatrixAt(i, dummy.matrix); imFlame.setColorAt(i++, tmpC.setRGB(.35, .62, 1.1));
  }
  dummy.rotation.set(0, 0, 0);
  imMsl.count = imFlame.count = i; imMsl.instanceMatrix.needsUpdate = imFlame.instanceMatrix.needsUpdate = true; imMsl.instanceColor.needsUpdate = imFlame.instanceColor.needsUpdate = true;

  i = 0; let so = 0;
  const soft = (x, y, z, s, r, g, b) => { if (so >= 720) return; dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, 1, s); dummy.updateMatrix(); imSoft.setMatrixAt(so, dummy.matrix); imSoft.setColorAt(so++, tmpC.setRGB(r, g, b)); };
  for (const b of ebs) { if (i >= 280) break; const pl = 1 + Math.sin(time * 12 + b.x) * .12; dummy.position.set(b.x, b.y || 8, b.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(pl); dummy.updateMatrix(); if (b.col) { tmpC.set(b.col); dummy.scale.setScalar(pl * .62); dummy.updateMatrix(); } else tmpC.setRGB(1.2, .25, .8); imEB.setMatrixAt(i, dummy.matrix); imEB.setColorAt(i++, tmpC.multiplyScalar(b.col ? 1.4 : 1));
    if (b.col) { tmpC.set(b.col); soft(b.x, 8, b.z, 8 * pl, tmpC.r * .8, tmpC.g * .8, tmpC.b * .8); } else { soft(b.x, 8, b.z, 13 * pl, .9, .1, .55); soft(b.x, .6, b.z, 9, .5, .05, .3); } }
  for (const s of shells) { if (i >= 280) break; const [x, y, z] = shellPos(s); dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.9); dummy.updateMatrix(); imEB.setMatrixAt(i, dummy.matrix); imEB.setColorAt(i++, s.foe ? tmpC.setRGB(.7, 1.5, .3) : tmpC.setRGB(1.6, .9, .3));
    soft(x, y, z, 11, s.foe ? .3 : 1, s.foe ? .8 : .5, .12); if (Math.random() < .6) burst(x, y, z, 1, 0x8a7a70, 4, .5, 7, .1); if (Math.random() < .5) burst(x, y, z, 1, 0xffa040, 6, .2, 5, .1); }
  imEB.count = i; imEB.instanceMatrix.needsUpdate = true; imEB.instanceColor.needsUpdate = true;

  // 경험치 수정: 등급별 색(하늘·보라·금), 빙글 돌며 떠 있고 안에서 빛이 남는다
  i = 0;
  for (const g of gems) {
    if (i >= 400) break; const tier = g.v >= 4 ? 2 : g.v >= 2 ? 1 : 0, sc = [1.35, 1.6, 2][tier], y = 3.2 + Math.sin(g.t * 3.4) * .7;
    dummy.position.set(g.x, y, g.z); dummy.rotation.set(.18, g.t * 2.2, 0); dummy.scale.setScalar(sc); dummy.updateMatrix(); imGem.setMatrixAt(i, dummy.matrix);
    imGem.setColorAt(i, tier === 2 ? tmpC.setRGB(1.9, 1.25, .25) : tier === 1 ? tmpC.setRGB(1.2, .45, 2) : tmpC.setRGB(.3, 1.15, 2));
    dummy.scale.setScalar(sc * (.9 + Math.sin(g.t * 6 + g.x) * .12)); dummy.updateMatrix(); imGemCore.setMatrixAt(i, dummy.matrix);
    imGemCore.setColorAt(i++, tier === 2 ? tmpC.setRGB(1.6, 1.2, .4) : tier === 1 ? tmpC.setRGB(1.3, .6, 1.6) : tmpC.setRGB(.5, 1.4, 1.7));
  }
  imGem.count = imGemCore.count = i; imGem.instanceMatrix.needsUpdate = imGemCore.instanceMatrix.needsUpdate = true; imGem.instanceColor.needsUpdate = imGemCore.instanceColor.needsUpdate = true;
  if (gems.length && Math.random() < .35) { const g = gems[(Math.random() * gems.length) | 0]; flare(g.x, 4.5, g.z, g.v >= 4 ? 0xffe8a0 : g.v >= 2 ? 0xe8c8ff : 0xd8f6ff, 4.5, .28); }
  // 회복 십자·보급 코어 + 빛기둥
  let nc = 0, nb = 0, no = 0, np = 0;
  for (const p of picks) {
    const y = 6.5 + Math.sin(p.t * 2.6) * 1.2, chest = p.kind === 'chest';
    if (chest && nb < 12) { dummy.position.set(p.x, y, p.z); dummy.rotation.set(0, p.t * 1.4, 0); dummy.scale.set(1.9, 1.9, 1.9); dummy.updateMatrix(); imCoreBox.setMatrixAt(nb, dummy.matrix); imCoreBox.setColorAt(nb++, tmpC.setRGB(1.7, 1.15, .35));
      for (const k of [0, 1]) { if (no >= 24) break; dummy.rotation.set(Math.PI / 2 + (k ? .6 : -.6) * Math.sin(p.t * 1.3 + k), p.t * (k ? 2.2 : -1.7), 0); dummy.scale.setScalar(k ? 2.2 : 1.8); dummy.updateMatrix(); imOrbit.setMatrixAt(no, dummy.matrix); imOrbit.setColorAt(no++, tmpC.setRGB(1, .7, .2)); } }
    else if (!chest && nc < 24) { dummy.position.set(p.x, y, p.z); dummy.rotation.set(0, p.t * 2, 0); dummy.scale.setScalar(2.4); dummy.updateMatrix(); imCross.setMatrixAt(nc, dummy.matrix); imCross.setColorAt(nc++, tmpC.setRGB(.3, 1.6, .55)); }
    if (np < 36) { dummy.position.set(p.x, 0, p.z); dummy.rotation.set(0, p.t, 0); dummy.scale.set(chest ? 2.6 : 1.9, chest ? 38 : 26, chest ? 2.6 : 1.9); dummy.updateMatrix(); imPillar.setMatrixAt(np, dummy.matrix); imPillar.setColorAt(np++, chest ? tmpC.setRGB(.55, .38, .1) : tmpC.setRGB(.1, .5, .22)); }
  }
  imCross.count = nc; imCoreBox.count = nb; imOrbit.count = no; imPillar.count = np;
  for (const m of [imCross, imCoreBox, imOrbit, imPillar]) { m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; }
  // 보석·전리품 밑의 은은한 빛 웅덩이
  for (const g of gems) { if (so >= 700) break; const t2 = g.v >= 4 ? 2 : g.v >= 2 ? 1 : 0; soft(g.x, .5, g.z, [6, 7, 10][t2], [.05, .35, .55][t2], [.3, .15, .35][t2], [.5, .5, .05][t2]); }
  for (const p of picks) soft(p.x, .5, p.z, p.kind === 'chest' ? 24 : 16, p.kind === 'chest' ? .7 : .05, p.kind === 'chest' ? .45 : .6, p.kind === 'chest' ? .05 : .2);
  imSoft.count = so; imSoft.instanceMatrix.needsUpdate = true; imSoft.instanceColor.needsUpdate = true;

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
  $('#hptxt').textContent = `${Math.ceil(P.hp)} / ${P.maxHp}` + (P.bar > 0 ? `  ·  보호막 ${Math.ceil(P.bar)}` : '');
  $('#barfill').style.width = clamp(P.bar / P.maxHp * 100, 0, 100) + '%';
  $('#bFly').firstElementChild.style.height = (P.fly ? clamp(1 - P.flyT / FLY.dur, 0, 1) : clamp(P.flyCd / FLY.cd, 0, 1)) * 100 + '%';
  { const ic = P.fly ? '🛬' : '✈️', sp = $('#bFly').lastElementChild; if (sp.textContent !== ic) sp.textContent = ic; $('#bFly').title = P.fly ? '착지 (F)' : '비행 (F)'; }
  $('#bDash').firstElementChild.style.height = clamp(P.dashCd / P.dashMax, 0, 1) * 100 + '%';
  $('#bUlt').firstElementChild.style.height = P.ult + '%'; $('#bUlt').classList.toggle('ready', P.ult >= 100);
  { const A = MECH(save.mech).auto; $('#bAuto').firstElementChild.style.height = clamp(P.akCd / (A.cd * P.cdMul), 0, 1) * 100 + '%'; $('#bAuto').classList.toggle('ready', P.akCd <= 0); }
  { const B = G.boss && !G.boss.dead ? G.boss : G.mid && !G.mid.dead ? G.mid : null; $('#boss').classList.toggle('hide', !B || G.won);
    if (B) { const nm = B.T.boss || '제타 여왕'; if ($('#bossname').textContent !== nm) $('#bossname').textContent = nm; $('#bossfill').style.width = clamp(B.hp / B.max * 100, 0, 100) + '%'; } }
}

// 무기 자리 잡기: 동작이 정해진 뒤 총구 위치·반동·어깨 포드를 맞춘다
const Z1 = new THREE.Vector3(0, 0, 1), UPV = new THREE.Vector3(0, 1, 0), v3b = new THREE.Vector3(), _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3(), _m4 = new THREE.Matrix4();
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _vd = new THREE.Vector3(), _ve = new THREE.Vector3();
// 뼈를 세계 기준으로 돌린다(본편 rotW)
function rotW(bone, q) {
  bone.parent.getWorldQuaternion(_qa); bone.getWorldQuaternion(_qb);
  bone.quaternion.copy(_qa.invert().multiply(_qc.copy(q).multiply(_qb))); bone.updateMatrixWorld(true);
}
// 팔을 결의 방향으로 뻗는다(본편 pointArm): 어깨→손 선을 dir 쪽으로 k만큼
const GUNS = { pistol: 1, cannon: 1, rifle: 2, rail: 2, gatling: 2 };
const _vg0 = new THREE.Vector3(), _vg1 = new THREE.Vector3(), _vg2 = new THREE.Vector3(), _vg3 = new THREE.Vector3(), _vg4 = new THREE.Vector3(), _vg5 = new THREE.Vector3();
// 두 마디 팔 맞추기: 어깨·팔꿈치·손이 목표점에 닿도록 팔꿈치를 아래로 굽힌다
function armIK(up, fore, hand, T, k) {
  const S = up.getWorldPosition(_vg2), E0 = fore.getWorldPosition(_vg3), H0 = hand.getWorldPosition(_vg4);
  const a = S.distanceTo(E0), b = E0.distanceTo(H0), toT = _vg5.copy(T).sub(S); let d = toT.length(); if (d < 1e-4) return;
  d = clamp(d, Math.abs(a - b) + 1e-3, (a + b) * .999); toT.normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pole = new THREE.Vector3(0, -1, 0).addScaledVector(toT, -toT.y).normalize();        // 팔꿈치는 아래쪽
  const E = new THREE.Vector3().copy(S).addScaledVector(toT, cosA * a).addScaledVector(pole, sinA * a);
  pointArm(up, fore, new THREE.Vector3().copy(E).sub(S).normalize(), k);
  fore.getWorldPosition(_vg3); pointArm(fore, hand, new THREE.Vector3().copy(T).sub(_vg3).normalize(), k);
}
function pointArm(arm, hand, dir, k) {
  if (!arm || !hand || k < .02) return;
  arm.getWorldPosition(_vd); hand.getWorldPosition(_ve); _ve.sub(_vd).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(_ve, dir); rotW(arm, new THREE.Quaternion().slerp(q, k));
}
function placeArms(dt) {
  if (!armed) return;
  P.group.updateMatrixWorld(true);
  const B = armed.bones, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), mw = armed.main;
  // 왼손 레이저(손바닥 빔·알파 빔·빛 깃털): 쏘는 동안 왼팔을 적 쪽으로 뻗는다
  P.lAimK = lerp(P.lAimK || 0, P.palmT > 0 && !P.fly ? 1 : 0, Math.min(1, dt * 10));
  if (P.lAimK > .02 && B.LeftArm && B.LeftForeArm && B.LeftHand) {
    const tg = nearest(P.x, P.z, 160), ax = tg ? tg.x - P.x : fx, az = tg ? tg.z - P.z : fz, al = Math.hypot(ax, az) || 1, dir = v3b.set(ax / al, -.08, az / al).normalize();
    pointArm(B.LeftArm, B.LeftHand, dir, .9 * P.lAimK); pointArm(B.LeftForeArm, B.LeftHand, dir, .9 * P.lAimK);
  }
  if (B.LeftHand) { B.LeftHand.getWorldPosition(_va); const tg = nearest(P.x, P.z, 160), a = tg ? Math.atan2(tg.x - _va.x, tg.z - _va.z) : P.yaw; P.palm = { x: _va.x + Math.sin(a) * 1.5, y: _va.y, z: _va.z + Math.cos(a) * 1.5 }; }
  // 아틸러리 어깨 곡사포: 왼쪽 어깨 위에 얹고 앞을 향한다(총구 -X)
  if (howW) {
    const on = ARM === 'hammer' && G.state !== 'title' && P.group.visible && !P.fly; howW.visible = on;
    if (on && B.LeftShoulder && B.RightShoulder) {
      B.LeftShoulder.getWorldPosition(_va); B.RightShoulder.getWorldPosition(_vb); let lx = _va.x - _vb.x, lz = _va.z - _vb.z; const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll;
      P.howRc = Math.max(0, (P.howRc || 0) - dt * 3);
      howW.position.set(_va.x + lx * 1.6 - fx * (1 + P.howRc * 1.5), _va.y + 2.6, _va.z + lz * 1.6 - fz * (1 + P.howRc * 1.5));
      howW.rotation.set(0, P.yaw + Math.PI / 2, -.35, 'YXZ');
      P.how = { x: howW.position.x + fx * 6, y: howW.position.y + 2.5, z: howW.position.z + fz * 6 };
    }
  }
  // 총을 든 기체는 쏘는 동안 사격 자세: 오른팔은 표적을 겨누고, 두 손 총은 왼손이 총신 앞을 받친다
  const gk = GUNS[ARM];
  if (gk) {
    const tg = nearest(P.x, P.z, 160), want = (G.state === 'play' || G.state === 'thumb') && P.dashT <= 0 && !P.fly && !P.mv && !P.sw && (!!tg || G.state === 'thumb') ? 1 : 0;
    P.aimK = lerp(P.aimK || 0, want, Math.min(1, dt * (want ? 12 : 5))); if (G.state === 'thumb') P.aimK = 1;
    if (P.aimK > .02 && B.RightArm && B.RightForeArm && B.RightHand) {
      const ax = tg ? tg.x - P.x : fx, az = tg ? tg.z - P.z : fz, al = Math.hypot(ax, az) || 1;
      const dir = v3b.set(ax / al, gk === 2 ? -.22 : -.12, az / al).normalize();
      pointArm(B.RightArm, B.RightHand, dir, .92 * P.aimK); pointArm(B.RightForeArm, B.RightHand, dir, .92 * P.aimK);
      if (gk === 2 && mw && mw.userData.muzzle && B.LeftArm && B.LeftForeArm && B.LeftHand && (P.lAimK || 0) < .1) {
        mw.updateMatrixWorld(true); const mzp = mw.userData.body.localToWorld(_vg0.copy(mw.userData.muzzle));
        B.RightHand.getWorldPosition(_vg1); const grip = _vg1.lerp(mzp, ARM === 'gatling' ? .32 : .42);
        armIK(B.LeftArm, B.LeftForeArm, B.LeftHand, grip, .95 * P.aimK);
      }
    }
  }
  // 방패: 왼쪽 아래팔 옆에 세워 앞을 본다
  if (shieldW) {
    const on = MECH(save.mech).off === 'shield' && G.state !== 'title' && P.group.visible && !P.fly;
    shieldW.visible = !!on;
    if (on && B.LeftForeArm && B.LeftHand && B.LeftShoulder && B.RightShoulder) {
      B.LeftForeArm.getWorldPosition(_va); B.LeftHand.getWorldPosition(_vb); _va.lerp(_vb, .5);
      B.LeftShoulder.getWorldPosition(_vb); B.RightShoulder.getWorldPosition(_vc); let lx = _vb.x - _vc.x, lz = _vb.z - _vc.z; const ll = Math.hypot(lx, lz) || 1; lx /= ll; lz /= ll;
      shieldW.position.set(_va.x + lx * 1.7 + fx * 1.6, Math.max(5.6, _va.y), _va.z + lz * 1.7 + fz * 1.6);
      shieldW.rotation.set(0, P.yaw + .35, 0);
    }
  }
  P.recoil = Math.max(0, P.recoil - dt * 9);
  if (mw) { const A = ARMS[mw.userData.key]; mw.userData.rot.position.set(A.palm[0], A.palm[1] - P.recoil * .9, A.palm[2]); }
  if (mw && mw.userData.muzzle) { mw.updateMatrixWorld(true); const p = mw.userData.body.localToWorld(_va.copy(mw.userData.muzzle)); P.mz = { x: p.x, y: p.y, z: p.z }; } else P.mz = null;
  if (!imPod) return;
  const own = !!(P.w && P.w.missile > 0) && G.state !== 'title';
  imPod.visible = own && P.group.visible && !P.fly;
  if (!own || !B.RightShoulder || !B.LeftShoulder) { P.pod = null; return; }
  B.RightShoulder.getWorldPosition(_va); B.LeftShoulder.getWorldPosition(_vb);
  let rx = _va.x - _vb.x, rz = _va.z - _vb.z; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
  P.podK = lerp(P.podK, P.podT > 0 ? 1 : 0, Math.min(1, dt * (P.podT > 0 ? 14 : 4))); P.podT -= dt;
  imPod.position.set(_va.x + rx * 1.5 - fx * 1.2, _va.y + 1.4 + P.podK * 1.6, _va.z + rz * 1.5 - fz * 1.2);
  const fw = _vb.set(fx, 0, fz), yv = _vc.crossVectors(UPV, fw);
  _m4.makeBasis(fw, yv, UPV); imPod.quaternion.setFromRotationMatrix(_m4); imPod.rotateY(P.podK * .0); imPod.rotateZ(-P.podK * .12);
  P.pod = { x: imPod.position.x, y: imPod.position.y + 1.8, z: imPod.position.z };
}

// ───────── 루프 ─────────
function step(dt, raw) {
  if (G.state === 'play') {
    if (!G.won) { G.t += dt; updSpawner(dt); }
    updPlayer(dt); updEnemies(dt); updShots(dt); updMissiles(dt); mslSync(dt); updPickups(dt); updDecals(dt);
    if (G.won) { G.endT -= raw; if (G.endT <= 0) endRun(true); }
    else if (G.pend > 0 && G.state === 'play') openLevelUp();
    drawHud(dt);
  }
  if (G.state !== 'pause' && G.state !== 'levelup') { updRings(dt); updParticles(dt); updCres(dt); updXF(dt); updBeams(dt); updBits(dt); updVFX(dt); if (G.state === 'play') updShells(dt); if (mixer) mixer.update(dt); placeArms(dt); placeJet(dt); updDrones(dt); placeBarrier(dt); }
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
  const ca = (P.alt || 0) * .9;      // 날고 있으면 카메라도 함께 올라 전투기가 화면 가운데에 오게
  cam.position.set(tx + camPos.x, camPos.y * camScale + ca, tz + camPos.z * camScale); cam.lookAt(tx, 7 + ca, tz - 6);

  if (G.state !== 'title') { drawInstances(time); draw2d(G.state === 'play' ? dt : 0); }
  if (bloomOn && composer) composer.render(); else renderer.render(scene, cam);
}

// ───────── 첫 화면 ─────────
// ───────── 성장·해금·출석·임무 (계속 다시 하고 싶게 만드는 장치) ─────────
// 코어: 판마다 격파·생존·승리로 벌고, 기체 해금과 격납고 영구 강화에 쓴다
const UPG = [
  { k: 'armor', nm: '장갑 보강', ic: '🛡️', ds: (lv) => `최대 내구 +${lv * 6}%` },
  { k: 'power', nm: '출력 강화', ic: '💥', ds: (lv) => `모든 피해 +${lv * 5}%` },
  { k: 'thrust', nm: '추진 강화', ic: '💨', ds: (lv) => `이동 +${lv * 3}%` },
  { k: 'cool', nm: '냉각 계통', ic: '❄️', ds: (lv) => `재사용 대기 -${lv * 3}%` },
  { k: 'magnet', nm: '수집 장치', ic: '🧲', ds: (lv) => `경험치 수집 범위 +${lv * 12}%` },
  { k: 'repair', nm: '자가 수리', ic: '🔧', ds: (lv) => `초당 내구 +${(lv * .25).toFixed(2)}` },
];
const UPG_MAX = 10, upCost = (lv) => Math.round(80 * Math.pow(1.45, lv));
function applyMech(m) {
  const U = (k) => save.up[k] || 0;
  P.maxHp = Math.round(100 * m.hp * (1 + .06 * U('armor'))); P.dmgMul = m.dmg * (1 + .05 * U('power'));
  P.spdMul = m.spd * (1 + .03 * U('thrust')); P.cdMul = m.cd * (1 - .03 * U('cool')); P.magnet = 30 * (1 + .12 * U('magnet')); P.regen = .25 * U('repair');
  if (m.init) m.init(P); P.maxHp = Math.round(P.maxHp); P.hp = P.maxHp;
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const LOGIN = [60, 90, 120, 160, 200, 260, 400];
const MPOOL = [
  { k: 'kills', n: [300, 600, 900], rw: [70, 110, 150], t: (n) => `제타 ${n}마리 격파 (누적)` },
  { k: 'time', n: [120, 180, 240], rw: [60, 90, 130], t: (n) => `한 판에 ${fmt(n)} 버티기` },
  { k: 'big', n: [1, 2, 3], rw: [80, 120, 170], t: (n) => `거대 개체 ${n}마리 격파` },
  { k: 'flights', n: [3, 6], rw: [60, 90], t: (n) => `비행 ${n}번 하기` },
  { k: 'ults', n: [2, 4], rw: [60, 100], t: (n) => `필살기 ${n}번 쓰기` },
  { k: 'skills', n: [10, 25], rw: [60, 100], t: (n) => `자동 스킬 ${n}번 발동` },
  { k: 'mechs', n: [2, 3], rw: [90, 130], t: (n) => `서로 다른 기체로 ${n}판 출격` },
  { k: 'queen', n: [1], rw: [220], t: () => `여왕 격파` },
];
function rollDaily() {
  const D = save.daily, today = dayKey(); if (D.day === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (D.lastClaim !== dayKey(y) && D.lastClaim !== today) D.streak = 0;
  D.day = today; D.mechs = [];
  const pool = MPOOL.slice().sort(() => Math.random() - .5).slice(0, 3);
  D.ms = pool.map((p) => { const i = (Math.random() * p.n.length) | 0; return { k: p.k, n: p.n[i], rw: p.rw[i], p: 0, done: false, got: false }; });
  persist();
}
const loginReady = () => save.daily.lastClaim !== dayKey();
const dailyPending = () => loginReady() || (save.daily.ms || []).some((m) => m.done && !m.got);
function runReward(won) {
  const mul = 1 + .25 * (G.threat - 1), a = Math.round(G.kills / 9), b = Math.round(G.t / 5), c = won ? 120 * G.threat : 0, d = G.st.big * 15;
  const earned = Math.round((a + b + c + d) * mul); save.core += earned;
  save.stat.kills += G.kills; if (won) save.stat.wins++;
  // 임무 진행
  rollDaily(); const D = save.daily, done = [];
  for (const m of D.ms || []) {
    if (m.done) continue;
    if (m.k === 'kills') m.p += G.kills; else if (m.k === 'time') m.p = Math.max(m.p, Math.floor(G.t)); else if (m.k === 'big') m.p += G.st.big;
    else if (m.k === 'flights') m.p += G.st.flights; else if (m.k === 'ults') m.p += G.st.ults; else if (m.k === 'skills') m.p += G.st.skills;
    else if (m.k === 'mechs') m.p = (D.mechs || []).length; else if (m.k === 'queen') m.p += won ? 1 : 0;
    if (m.p >= m.n) { m.done = true; done.push(MPOOL.find((q) => q.k === m.k).t(m.n)); }
  }
  const html = `<div class="rw">💎 +${earned} 코어 <small>보유 ${save.core}</small></div><div class="rwd">격파 ${a} · 생존 ${b}${c ? ` · 승리 ${c}` : ''}${d ? ` · 거대 개체 ${d}` : ''}${mul > 1 ? ` · 위험도 ×${mul.toFixed(2)}` : ''}</div>`
    + done.map((t) => `<div class="rwm">✅ 임무 완료: ${t} — 출석·임무에서 보상을 받으세요</div>`).join('');
  return { earned, html };
}
let viewMech = save.mech, booted = false;
const sbar = (l, v) => `<span>${l}<i><em style="width:${Math.round(clamp(v, .1, 1) * 100)}%"></em></i></span>`;
function drawTitle() {
  rollDaily();
  $('#coreTop').textContent = '💎 ' + save.core; $('#dailyDot').classList.toggle('hide', !dailyPending());
  const box = $('#mechs'), sx = box.scrollLeft; box.innerHTML = '';
  for (const m of MECHS) {
    const own = !!save.own[m.id], b = document.createElement('button');
    b.className = 'mech' + (m.id === viewMech ? ' on' : '') + (own ? '' : ' locked');
    b.innerHTML = `<img src="img/${m.id}.jpg" alt="" loading="lazy"><strong>${m.nm}</strong><em>${own ? m.ty.split(' · ')[0] : '🔒 💎' + m.cost}</em>`;
    b.addEventListener('click', () => { viewMech = m.id; if (own) { save.mech = m.id; persist(); ensureMech(m.id).catch(() => { }); } drawTitle(); });
    box.appendChild(b);
  }
  box.scrollLeft = sx; { const on = box.querySelector('.mech.on'); if (on) { const l = on.offsetLeft - box.offsetLeft, r = l + on.offsetWidth; if (l < box.scrollLeft) box.scrollLeft = l - 8; else if (r > box.scrollLeft + box.clientWidth) box.scrollLeft = r - box.clientWidth + 8; } }
  const m = MECH(viewMech), own = !!save.own[m.id], reqOk = !m.req || save.maxThreat >= m.req, an = ARM_NAME[m.prim];
  $('#mdet').innerHTML = `<div class="mh"><b>${m.nm}</b><span>${m.ty}</span></div>`
    + `<div class="st">${sbar('내구', m.hp / 1.5)}${sbar('화력', m.dmg / 1.35)}${sbar('속도', m.spd / 1.25)}</div>`
    + `<div class="sk"><span>${an.ic} ${an.nm}<small>기본 무기</small></span><span>${m.auto.ic} ${m.auto.nm}<small>자동 · E</small></span><span>${m.ult.ic} ${m.ult.nm}<small>필살 · Q</small></span></div>`
    + `<div class="ps">${m.pass}</div>`
    + (own ? '' : `<button class="go small" id="unlock" ${save.core >= m.cost && reqOk ? '' : 'disabled'}>🔓 💎${m.cost} 해금</button>${reqOk ? '' : `<div class="req">위험도 ${m.req - 1}에서 여왕을 잡으면 해금할 수 있어요</div>`}`);
  if (!own) $('#unlock').addEventListener('click', () => { if (save.core < m.cost || !reqOk) return; save.core -= m.cost; save.own[m.id] = 1; save.mech = m.id; persist(); sfx.lvl(); ensureMech(m.id).catch(() => { }); drawTitle(); });
  $('#start').textContent = own ? '출격' : '🔒 해금 필요'; $('#start').disabled = !own || !booted;
  save.threat = clamp(save.threat, 1, save.maxThreat); $('#thV').textContent = save.threat;
  const r = save.best[save.threat];
  $('#rec').textContent = r ? `위험도 ${save.threat} 최고 기록 — ${r.w ? '격파 ' : '생존 '}${fmt(r.t)} · 격파 ${r.k}` : '';
  $('#thUp').style.opacity = save.threat < save.maxThreat ? 1 : .3; $('#thDn').style.opacity = save.threat > 1 ? 1 : .3;
}
$('#thUp').addEventListener('click', () => { save.threat = Math.min(save.maxThreat, save.threat + 1); persist(); drawTitle(); });
$('#thDn').addEventListener('click', () => { save.threat = Math.max(1, save.threat - 1); persist(); drawTitle(); });
$('#start').addEventListener('click', startRun);
$('#retry').addEventListener('click', startRun);
$('#nextThreat').addEventListener('click', () => { save.threat = Math.min(save.maxThreat, G.threat + 1); persist(); startRun(); });
// 격납고(영구 강화)
function drawHangar() {
  $('#coreH').textContent = save.core;
  $('#upList').innerHTML = UPG.map((u) => { const lv = save.up[u.k] || 0, c = upCost(lv), max = lv >= UPG_MAX;
    return `<div class="up"><span class="ic">${u.ic}</span><div class="tx"><b>${u.nm} <small>Lv ${lv}/${UPG_MAX}</small></b><em>${lv ? u.ds(lv) : '없음'}${max ? '' : ' → ' + u.ds(lv + 1)}</em></div><button data-k="${u.k}" ${max || save.core < c ? 'disabled' : ''}>${max ? '최대' : '💎' + c}</button></div>`; }).join('');
  $('#upList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k, lv = save.up[k] || 0, c = upCost(lv); if (lv >= UPG_MAX || save.core < c) return; save.core -= c; save.up[k] = lv + 1; persist(); sfx.lvl(); drawHangar(); drawTitle(); }));
}
// 출석·일일 임무
function drawDaily() {
  rollDaily(); const D = save.daily, idx = (D.streak || 0) % 7, ready = loginReady();
  $('#loginRow').innerHTML = LOGIN.map((v, i) => `<div class="day ${i < idx || (!ready && i === idx - 0 && false) ? 'got' : ''} ${i === idx && ready ? 'now' : ''}"><small>${i + 1}일</small><b>💎${v}</b></div>`).join('');
  $('#claimLogin').disabled = !ready; $('#claimLogin').textContent = ready ? `출석 보상 받기 (💎${LOGIN[idx]})` : '오늘 출석 완료 · 내일 또 오세요';
  $('#streak').textContent = `연속 출석 ${D.streak || 0}일`;
  $('#msList').innerHTML = (D.ms || []).map((m, i) => { const q = MPOOL.find((x) => x.k === m.k), pct = Math.min(1, m.p / m.n);
    return `<div class="ms"><div class="tx"><b>${q.t(m.n)}</b><i><em style="width:${pct * 100}%"></em></i><small>${m.k === 'time' ? fmt(Math.min(m.p, m.n)) + ' / ' + fmt(m.n) : Math.min(m.p, m.n) + ' / ' + m.n}</small></div><button data-i="${i}" ${m.done && !m.got ? '' : 'disabled'}>${m.got ? '완료' : '💎' + m.rw}</button></div>`; }).join('');
  $('#msList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const m = D.ms[+b.dataset.i]; if (!m.done || m.got) return; m.got = true; save.core += m.rw; persist(); sfx.lvl(); drawDaily(); drawTitle(); }));
}
$('#claimLogin').addEventListener('click', () => { const D = save.daily; if (!loginReady()) return; save.core += LOGIN[(D.streak || 0) % 7]; D.streak = (D.streak || 0) + 1; D.lastClaim = dayKey(); persist(); sfx.lvl(); drawDaily(); drawTitle(); });
$('#bHangar').addEventListener('click', () => { drawHangar(); $('#hangar').classList.remove('hide'); });
$('#bDaily').addEventListener('click', () => { drawDaily(); $('#daily').classList.remove('hide'); });
$('#hClose').addEventListener('click', () => $('#hangar').classList.add('hide'));
$('#dClose').addEventListener('click', () => $('#daily').classList.add('hide'));
$('#toTitle').addEventListener('click', () => { $('#over').classList.add('hide'); $('#pause').classList.add('hide'); $('#title').classList.remove('hide'); G.state = 'title'; drawTitle(); });
$('#resume').addEventListener('click', togglePause);
$('#quit').addEventListener('click', () => { $('#pause').classList.add('hide'); $('#hud').classList.add('hide'); $('#title').classList.remove('hide'); G.state = 'title'; music.pause(); drawTitle(); });
$('#mute').addEventListener('click', (e) => { muted = !muted; e.target.textContent = muted ? '소리 켜기' : '소리 끄기'; });

(async function boot() {
  drawTitle();
  const jobs = [buildTerrain(), ensureMech(save.mech), loadModel('rock', 'p_rock2', 22, 0), loadModel('crystal', 'p_crystal', 20, 0),
    loadMissile(), loadMoves(), loadWeapon('mpod', 'wm_mpod')];
  for (const k in ET) jobs.push(loadModel(k, ET[k].file, ET[k].h, 0, ET[k]));
  let done = 0; jobs.forEach((j) => j.then(() => ($('#load').textContent = `불러오는 중 ${Math.round(++done / jobs.length * 100)}%`)));
  try {
    await Promise.all(jobs); initXF(); buildVFX(); buildPools(); buildParticles(); buildDrones(); buildBarrier(); buildBeams(); buildBits(); mslInit(); tfInit();
    imPod = WPN.mpod.clone(true); imPod.scale.setScalar(6.4); imPod.visible = false; scene.add(imPod);
    resetRun(); await setMech(save.mech);
    $('#load').classList.add('hide'); booted = true; drawTitle();
  } catch (e) { $('#load').textContent = '자료를 불러오지 못했습니다. 새로고침해 주세요.' + (location.search.includes('dev') ? ' ' + e.message + ' @ ' + (e.stack || '').split('\n')[1] : ''); console.error(e); }
  requestAnimationFrame(frame);
})();

// 개발용: 실제 전투 모델(무기 포함)로 기체 사진을 찍는다
let thumbR = null;
async function makeThumb(id, size = 512, bg = 0x0d1428) {
  await setMech(id);
  if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.ACESFilmicToneMapping; thumbR.toneMappingExposure = 1.3; }
  thumbR.setSize(size, size, false);
  const sc = new THREE.Scene(); sc.background = new THREE.Color(bg);
  sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x1c2340, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(40, 60, 70); sc.add(key);
  const rim = new THREE.DirectionalLight(0x7fb0ff, 2.4); rim.position.set(-60, 40, -50); sc.add(rim);
  for (const k in acts) acts[k].stop(); acts.idle.reset().play(); mixer.update(.6);
  const par = P.wrap.parent, st = G.state, sm = save.mech; save.mech = id; sc.add(P.wrap); P.wrap.position.set(0, 0, 0); P.wrap.rotation.set(0, .42 - Math.PI / 2, 0);
  G.state = 'thumb'; P.fly = false; P.palmT = 0; P.lAimK = 0; P.mv = null; P.sw = null; P.dashT = 0; P.yaw = .42; P.group.visible = true; P.wrap.updateMatrixWorld(true);
  try { placeArms(0); } catch (e) { }
  const extra = [shieldW, howW].filter((o) => o && o.visible); extra.forEach((o) => sc.add(o));
  const bb = new THREE.Box3().setFromObject(P.wrap); for (const o of extra) bb.expandByObject(o);
  const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()), h = Math.max(s.y, s.x * .9);
  const cam2 = new THREE.PerspectiveCamera(28, 1, 1, 2000), D = h * .6 / Math.tan(14 * Math.PI / 180);
  cam2.position.set(c.x, c.y + h * .12, c.z + D); cam2.lookAt(c.x, c.y, c.z);
  thumbR.render(sc, cam2); const url = thumbR.domElement.toDataURL('image/jpeg', .9);
  par.add(P.wrap); extra.forEach((o) => scene.add(o)); G.state = st; save.mech = sm; return url;
}
if (location.search.includes('dev')) window.__g = { G, P, ET, UP, inp, keys, stick, get ebs() { return ebs; }, get cards() { return cardKeys; }, sim(sec, auto, bot) { for (let t = 0; t < sec && G.state !== 'over'; t += 1 / 30) { if (G.state === 'levelup') { if (auto) pickCard(typeof auto === 'function' ? auto() : 0); else break; } bot && bot(); step(1 / 30, 1 / 30); } }, get E() { return E; }, spawn, kill, endRun, addXp, pickCard, startRun, camPos, AN, oneShot, setMech, ARMS, get acts() { return acts; }, get mixer() { return mixer; }, get armed() { return armed; }, get msl() { return msl; }, launchSalvo, scene, cam, renderer, get composer() { return composer; }, TF_E, startFly, endFly, FLY, save, MECHS, castUlt, doAuto, drawTitle, drawHangar, drawDaily, persist, get PRIM() { return PRIM; }, get ARM() { return ARM; }, get shells() { return shells; }, flare, mark, lightFlash, explode, ring, beamFx, screenFlash, xfBoom, crescent, castUlt2: castUlt, fire, mortar, MODELS, IM, midBoss, makeThumb, dropGem, get picks() { return picks; } };
