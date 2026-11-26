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
  { id: 'mech4', nm: '발레리안', ty: '기동형 · 권총·방패', hp: 1.0, dmg: 1.0, spd: 1.12, cd: .97, arm: 'pistol', off: 'shield', prim: 'pistol', cost: 0, rar: 'N',
    pass: '대시 재사용 -40% · 장갑 +20', auto: { k: 'flash', nm: '섬광 돌격', ic: '⚡', cd: 7 }, ult: { k: 'bladefall', nm: '천검 낙하', ic: '🗡️' },
    init(p) { p.dashMax *= .6; p.maxHp += 20; } },
  { id: 'm_samurai', nm: '인퀴지터', ty: '근접형 · 카타나', hp: 1.05, dmg: 1.15, spd: 1.05, cd: .92, arm: 'katana', prim: 'katana', cost: 0, rar: 'N',
    pass: '근접 피해 +25% · 불꽃 드론으로 시작', auto: { k: 'iaido', nm: '발도', ic: '💫', cd: 6 }, ult: { k: 'tenzan', nm: '천섬', ic: '🌙' },
    init(p) { p.meleeMul = 1.25; p.w.blade = 1; } },
  { id: 'm_striker', nm: '오리온', ty: '사격형 · 레이저 소총', hp: .95, dmg: 1.1, spd: 1.1, cd: .95, arm: 'rifle', prim: 'rifle', cost: 0, rar: 'N',
    pass: '치명타 +10% · 소총 2단계로 시작', auto: { k: 'overdrive', nm: '과충전', ic: '🔋', cd: 9 }, ult: { k: 'laserstorm', nm: '레이저 폭풍', ic: '✴️' },
    init(p) { p.w.rifle = 2; p.crit += .1; } },
  { id: 'mech3', nm: '세이버 「불사조」', ty: '균형형 · 빔 세이버', hp: 1, dmg: 1, spd: 1, cd: 1, arm: 'saber', prim: 'saber', cost: 500, rar: 'R',
    pass: '가까이선 베고 멀면 손바닥 레이저 · 필살 게이지 +20%', auto: { k: 'palm', nm: '손바닥 레이저', ic: '✋', cd: 5 }, ult: { k: 'phoenix', nm: '불사조 일섬', ic: '🔥' },
    init(p) { p.ultGain = 1.2; } },
  { id: 'm_guardian', nm: '가디언', ty: '방어형 · 산탄 캐논', hp: 1.35, dmg: .92, spd: .9, cd: 1, arm: 'cannon', off: 'shield', prim: 'shotgun', cost: 400, rar: 'R',
    pass: '받는 피해 -20% · 가까울수록 강함', auto: { k: 'bash', nm: '방패 돌진', ic: '🛡️', cd: 6 }, ult: { k: 'aegis', nm: '수호 결계', ic: '💠' },
    init(p) { p.taken = .8; } },
  { id: 'm_titan', nm: '타이탄', ty: '초중량형 · 회전 기관포', hp: 1.5, dmg: 1.05, spd: .8, cd: 1.05, arm: 'gatling', prim: 'gatling', cost: 400, rar: 'R',
    pass: '초당 내구 1% 회복 · 쏘수록 빨라짐', auto: { k: 'quake', nm: '지면 강타', ic: '🌋', cd: 6 }, ult: { k: 'titanfall', nm: '타이탄 낙하', ic: '☄️' },
    init(p) { p.regen += p.maxHp * .01; } },
  { id: 'm_ranger', nm: '레인저', ty: '저격형 · 레일 저격총', hp: .85, dmg: 1.12, spd: 1, cd: 1, arm: 'rail', prim: 'rail', cost: 600, rar: 'R',
    pass: '멈춰 있으면 피해 +30% · 한 줄을 모두 꾰뚫는다', auto: { k: 'backstep', nm: '후방 도약', ic: '↩️', cd: 7 }, ult: { k: 'satsnipe', nm: '위성 저격', ic: '🛰️' },
    init(p) { p.stillMul = 1.3; } },
  { id: 'm_artillery', nm: '아틸러리', ty: '포격형 · 곡사포·해머', hp: 1.1, dmg: 1.1, spd: .85, cd: 1, arm: 'hammer', prim: 'mortar', cost: 600, rar: 'R',
    pass: '포탄이 넓게 터진다 · 어깨 곡사포', auto: { k: 'mortar3', nm: '박격포 3연발', ic: '💣', cd: 5 }, ult: { k: 'carpet', nm: '융단 포격', ic: '🎆' },
    init(p) { p.splash = 1.3; } },
  { id: 'm_sky', nm: '스카이', ty: '비행형 · 유도 미사일', hp: .9, dmg: 1.05, spd: 1.25, cd: .95, arm: 'rifle', prim: 'homing', cost: 1800, rar: 'SR',
    pass: '비행 재사용 대기 거의 없음 · 이동 +10%', auto: { k: 'dive', nm: '급강하 폭격', ic: '🦅', cd: 6 }, ult: { k: 'mstorm', nm: '미사일 폭풍', ic: '🚀' },
    init(p) { p.flyCdMul = .15; p.spdMul *= 1.1; } },
  { id: 'm_phantom', nm: '팬텀', ty: '은신형 · 소음 소총', hp: .85, dmg: 1.15, spd: 1.2, cd: .9, arm: 'rifle', prim: 'burst', cost: 2000, rar: 'SR',
    pass: '은신 뒤 첫 공격 3배 · 정밀 3점사', auto: { k: 'cloak', nm: '광학 은신', ic: '👻', cd: 10 }, ult: { k: 'execute', nm: '그림자 처형', ic: '🌑' },
    init(p) { p.crit += .08; } },
  { id: 'm_wizard', nm: '위저드', ty: '비트형 · 장창·비트 레이저', hp: .95, dmg: 1.08, spd: 1, cd: .85, arm: 'spear', prim: 'bits', cost: 2200, rar: 'SR',
    pass: '모든 재사용 -15% · 비트가 적을 저격', auto: { k: 'bitstorm', nm: '비트 사출', ic: '🔷', cd: 7 }, ult: { k: 'allrange', nm: '전방위 공격', ic: '🌐' },
    init(p) { p.cdMul *= .85; } },
  { id: 'm_origin', nm: '오리진', ty: '알파 원형기 · 알파 빔', hp: 1.1, dmg: 1.1, spd: 1.05, cd: .9, arm: 'saber', prim: 'beam', cost: 2600, rar: 'SR',
    pass: '모든 재사용 -20% · 끊임없이 지지는 광선', auto: { k: 'blink', nm: '순간 이동', ic: '✨', cd: 6 }, ult: { k: 'nova', nm: '알파 노바', ic: '🌟' },
    init(p) { p.cdMul *= .8; } },
  { id: 'mech_leg', nm: '세라핌 프라임', ty: '전설 · 대검·빛 깃털', hp: 1.4, dmg: 1.35, spd: 1.15, cd: .8, arm: 'great', prim: 'feather', cost: 4500, rar: 'SSR',
    pass: '모든 피해 +10% · 가까이선 대검, 멀면 빛 깃털', auto: { k: 'featherstorm', nm: '광익 방출', ic: '🕊️', cd: 5 }, ult: { k: 'descent', nm: '세라핌 강림', ic: '👼' },
    init(p) { p.dmgMul *= 1.1; } },
  { id: 'astra', nm: '아스트라 센티널', ty: '알파 수호기 · 알파 빔·방패', hp: 1.32, dmg: 1.25, spd: 1.05, cd: .85, arm: 'rifle', off: 'shield', prim: 'beam', cost: 6000, rar: 'SSR',
    pass: '받는 피해 -15% · 모든 재사용 -10% · 2부 「망명자의 그림자」 완료 보상', auto: { k: 'blink', nm: '수호 도약', ic: '✨', cd: 5.5 }, ult: { k: 'aegis', nm: '수호의 빛', ic: '💠' },
    init(p) { p.taken = .85; p.cdMul *= .9; } },
  // 신화(뽑기·장기 구매): 날개 달린 신 기체 4종. 등급 배율이 가장 높고 패시브도 강하다
  { id: 'god', nm: '솔라리스', ty: '신화 · 태양 대검·빛 깃털', hp: 1.6, dmg: 1.5, spd: 1.18, cd: .75, arm: 'great', prim: 'feather', cost: 9000, rar: 'UR',
    pass: '모든 피해 +15% · 피격 20% 확률로 피해 무효', auto: { k: 'featherstorm', nm: '태양 깃털', ic: '☀️', cd: 3.5 }, ult: { k: 'descent', nm: '태양 강림', ic: '🌞' },
    init(p) { p.dmgMul *= 1.15; p.dodge = .2; } },
  { id: 'god_white', nm: '아크엔젤', ty: '신화 · 장창·성광 비트', hp: 1.5, dmg: 1.45, spd: 1.2, cd: .72, arm: 'spear', prim: 'bits', cost: 9000, rar: 'UR',
    pass: '비트 +2 · 모든 재사용 -25%', auto: { k: 'bitstorm', nm: '성광 비트', ic: '💠', cd: 5 }, ult: { k: 'allrange', nm: '천상 포위', ic: '🌐' },
    init(p) { p.cdMul *= .75; p.bitPlus = 2; } },
  { id: 'god_red', nm: '블러드 이클립스', ty: '신화 · 혈광 세이버', hp: 1.65, dmg: 1.55, spd: 1.2, cd: .8, arm: 'saber', prim: 'saber', cost: 9000, rar: 'UR',
    pass: '근접 피해 +40% · 적을 처치할 때마다 내구 1 회복', auto: { k: 'iaido', nm: '혈월 발도', ic: '🩸', cd: 4 }, ult: { k: 'tenzan', nm: '일식 천섬', ic: '🌘' },
    init(p) { p.meleeMul = 1.4; p.lifesteal = 1; } },
  { id: 'god_black', nm: '녹턴', ty: '신화 · 공허 광선', hp: 1.5, dmg: 1.55, spd: 1.25, cd: .75, arm: 'saber', prim: 'beam', cost: 9000, rar: 'UR',
    pass: '치명타 +20% · 이동 +10%', auto: { k: 'blink', nm: '공허 도약', ic: '🌀', cd: 4 }, ult: { k: 'execute', nm: '심연 처형', ic: '🌑' },
    init(p) { p.crit += .2; p.spdMul *= 1.1; } },
];
// 등급: 이름·색·능력 배율(내구·피해). 별(★)은 중복 획득마다 +1, 별당 +6%
const RAR = { N: { nm: '일반', col: '#a7b0c2', mul: 1 }, R: { nm: '희귀', col: '#4fb6ff', mul: 1.06 }, SR: { nm: '영웅', col: '#b67bff', mul: 1.14 }, SSR: { nm: '전설', col: '#ffb84a', mul: 1.24 }, UR: { nm: '신화', col: '#ff5a7a', mul: 1.36 }, A: { nm: '고급', col: '#7df06a', mul: 1.03 }, UQ: { nm: '유니크', col: '#4cff9a', mul: 1.3 } };
const RAR_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
const MECH = (id) => MECHS.find((m) => m.id === id) || MECHS[0];
// 기종 분류: 장마다 추천 기종이 있고, 맞춰 출격하면 보너스
const CLS = { 근접: { k: 'katana', ds: '가까이 붙어 베는 기체' }, 사격: { k: 'rifle', ds: '멀리서 쏘는 기체' }, 기동: { k: 'dash', ds: '빠르게 움직이는 기체' }, 중장: { k: 'armor', ds: '튼튼하고 묵직한 기체' } };
const CLS_OF = { mech4: '기동', m_samurai: '근접', m_striker: '사격', mech3: '근접', m_guardian: '중장', m_titan: '중장', m_ranger: '사격', m_artillery: '중장', m_sky: '기동', m_phantom: '기동', m_wizard: '사격', m_origin: '사격', mech_leg: '근접', god: '근접', god_white: '사격', god_red: '근접', god_black: '기동', astra: '사격' };
for (const m of MECHS) m.cls = CLS_OF[m.id] || '사격';
// 기체별 전투기 모델(변신 엔진 JETM과 같은 이름)
const JET_OF = { mech3: 'saberjet', mech4: 'mech4_jet', m_sky: 'm_sky_jet', m_striker: 'm_striker_jet', m_titan: 'm_titan_jet', m_ranger: 'm_ranger_jet', m_artillery: 'm_artillery_jet', m_wizard: 'm_wizard_jet', m_phantom: 'm_phantom_jet', m_samurai: 'm_samurai_jet', m_origin: 'm_origin_jet', m_guardian: 'm_guardian_jet', mech_leg: 'mech_leg_jet', god: 'm_wizard_jet', god_white: 'm_sky_jet', god_red: 'm_striker_jet', god_black: 'm_phantom_jet', astra: 'm_guardian_jet' };
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
  courier:  { file: 'a_heli', h: 16, fit: 1, r: 8, hp: 900, spd: 60, dmg: 0, xp: 0, max: 1, yaw: 0, col: 0xffd166, fly: 16, mech: 1 },
  barrel:   { virt: 1, stat: 1, h: 7, r: 4.5, hp: 30, spd: 0, dmg: 0, xp: 0, max: 16, yaw: 0, col: 0xff6a3a },
  nest:     { file: 'p_crystal', h: 17, fit: 1, r: 7, hp: 420, spd: 0, dmg: 0, xp: 6, max: 12, yaw: 0, col: 0xc08cff },
  warden:   { file: 'v_goliath', h: 38, r: 15, hp: 5200, spd: 17, dmg: 26, xp: 0, max: 1, yaw: 0, col: 0xe0d0ff, mech: 1, boss: '정원의 파수꾼' },
  keeper:   { file: 'fb_scorp', h: 40, fit: 1, r: 15, hp: 6000, spd: 28, dmg: 26, xp: 0, max: 1, yaw: 0, col: 0x9f8cff, boss: '서고의 문지기' },
  mb_guard:     { virt: 1, h: 24, r: 11, hp: 2600, spd: 34, dmg: 20, xp: 0, max: 1, yaw: 0, col: 0xd8c8ff, mech: 1, boss: '알파 근위기' },
  mb_honor:     { virt: 1, h: 26, r: 11, hp: 5200, spd: 38, dmg: 22, xp: 0, max: 1, yaw: 0, col: 0xb89cff, mech: 1, boss: '세라핀 근위기' },
  mb_heavy:     { virt: 1, h: 28, r: 12, hp: 6400, spd: 24, dmg: 26, xp: 0, max: 1, yaw: 0, col: 0xcfc4ff, mech: 1, boss: '함장실 방어 기체' },
  mb_core:      { virt: 1, h: 27, r: 11, hp: 7600, spd: 36, dmg: 24, xp: 0, max: 1, yaw: 0, col: 0xffe7a0, mech: 1, boss: '정화포 수호기' },
  mb_seraphine: { virt: 1, h: 32, r: 12, hp: 9800, spd: 40, dmg: 26, xp: 0, max: 1, yaw: 0, col: 0xc9a8ff, mech: 1, boss: '알파 사령관 세라핀' },
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
  elemUp:   { ic: '◆', nm: '계열 각성', max: 5, kind: 'p', ds: ['계열 기술(R) 위력 +25% · 재사용 -8%'] },
  stunUp:   { ic: '✶', nm: '충격 탄두', max: 4, kind: 'p', ds: ['공격 6% 확률로 1초 기절', '기절 확률 +4%'] },
  aoeUp:    { ic: '✹', nm: '폭렬 탄두', max: 4, kind: 'p', ds: ['처치한 적이 12% 확률로 폭발', '폭발 확률 +8%'] },
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
const hemi = new THREE.HemisphereLight(0xffe2c0, 0x4a3040, 1.25); scene.add(hemi);
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
  cam.aspect = W / H; cam.updateProjectionMatrix(); try { lobby.cam.aspect = W / H; lobby.cam.updateProjectionMatrix(); } catch (e) { }
  camScale = W / H < 0.8 ? 1.5 : W / H < 1.25 ? 1.2 : 1;   // 세로 화면은 더 멀리서
  const d = Math.min(devicePixelRatio || 1, 2);
  fx2d.width = W * d; fx2d.height = H * d; ctx2.setTransform(d, 0, 0, d, 0, 0);
}
addEventListener('resize', resize); resize();

// ───────── 지형 ─────────
const texL = new THREE.TextureLoader();
function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }

let terrainMat = null;
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
  terrainMat = new THREE.MeshLambertMaterial({ map: gTex }); scene.add(new THREE.Mesh(geo, terrainMat));

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
// ───────── 기체 도색: 기체마다 두 가지 색 조합으로 다시 칠한다(세이버 「불사조」는 원래 빨강·검정 그대로)
// swap: [색상 시작, 끝, 새 색상, 채도 배율, 밝기 배율]  dark: 색 없는 부분 중 어두운 곳을 검게  colorize: 전체를 한 색으로  two: 밝은 곳/어두운 곳을 두 색으로
const PAINT = {
  m_striker: { swap: [[18, 75, 322, 1.25, 1.15]] },                                                     // 분홍 + 검정
  m_guardian: { swap: [[180, 262, 222, 1.15, .6]], swapDark: .34, dark: [.55, .3] },                                   // 아주 파란색 + 검정
  m_titan: { dark: [.46, .34], gray: .25 },                                                              // 회색 + 검정
  m_ranger: { swap: [[328, 360, 24, 1.15, 1.18], [0, 24, 24, 1.15, 1.18]], stripes: 1 },                 // 주황 + 검정 호랑이 줄무늬
  m_artillery: { two: { h: [38, 175], t: .44, hi: [214, .06, 1.42], lo: [218, .82, .95] }, dark: [.4, .55], unsat: [219, .75, .9, .36] }, // 파랑 + 흰색
  m_sky: { swap: [[0, 52, 356, 1.5, .95], [330, 360, 356, 1.5, .95]] },                                  // 흰색 + 빨강
  m_phantom: { colorize: [.12, 281, .62, 1.2], dark: [.12, .5] },                                                         // 자주 + 검정
  m_origin: { swap: [[150, 215, 189, 1.6, 1.05]] },
  astra: { swap: [[180, 262, 262, .16, 1.75]], dark: [.3, .55] },                                         // 알파 백색 + 보랏빛                                                      // 흰색 + 청록
};
const _hsl2rgb = (h, s, l) => { const C = (1 - Math.abs(2 * l - 1)) * s, H = (((h % 360) + 360) % 360) / 60, X = C * (1 - Math.abs(H % 2 - 1)), m = l - C / 2;
  const [R, G, B] = H < 1 ? [C, X, 0] : H < 2 ? [X, C, 0] : H < 3 ? [0, C, X] : H < 4 ? [0, X, C] : H < 5 ? [X, 0, C] : [C, 0, X]; return [(R + m) * 255, (G + m) * 255, (B + m) * 255]; };
const _paintCache = new Map();
function repaintTex(tex, P) {
  if (_paintCache.has(tex)) return _paintCache.get(tex);
  const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const W = c.width, D = x.getImageData(0, 0, W, c.height), d = D.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dl = mx - mn;
    const s = dl / (1 - Math.abs(2 * l - 1) || 1); let h = dl < 1e-6 ? 0 : mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h *= 60; if (h < 0) h += 360;
    let out = null, hit = false;
    if (P.swap && dl >= .12) for (const [h0, h1, to, sm, lm] of P.swap) if (h >= h0 && h <= h1) { out = P.swapDark && l < P.swapDark ? [d[i] * .18, d[i + 1] * .18, d[i + 2] * .22] : _hsl2rgb(to, Math.min(1, s * sm), Math.min(1, l * lm)); hit = true; break; }
    if (!out && P.two && dl >= .04 && h >= P.two.h[0] && h <= P.two.h[1]) { const q = l > P.two.t ? P.two.hi : P.two.lo; out = _hsl2rgb(q[0], q[1], Math.min(1, l * q[2])); }
    if (!out && P.colorize && l > P.colorize[0]) { const [, ch, cs, cl] = P.colorize; out = _hsl2rgb(ch, Math.max(s, cs), Math.min(1, l * cl)); }
    if (!out && P.unsat && dl < .12 && l < P.unsat[3] && l > .05) out = _hsl2rgb(P.unsat[0], P.unsat[1], l * P.unsat[2]);
    if (!out && P.dark && dl < .12 && l < P.dark[0]) out = [d[i] * P.dark[1], d[i + 1] * P.dark[1], d[i + 2] * P.dark[1]];
    if (!out && P.gray && dl < .12) { const k = 1 + P.gray; out = [Math.min(255, d[i] * k), Math.min(255, d[i + 1] * k), Math.min(255, d[i + 2] * k)]; }
    if (out && P.stripes && hit) { const px = (i / 4) % W, py = (i / 4 - px) / W, X = px / W, Y = py / c.height;
      const v = Math.sin(X * 62 + 4.2 * Math.sin(Y * 8.5) + 2.4 * Math.sin(X * 14 + Y * 23)); if (v > .5) out = [18, 13, 10]; }
    if (out) { d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; }
  }
  x.putImageData(D, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; _paintCache.set(tex, t); return t;
}
// ───────── 파일럿 스티커: 비행기 기수 그림처럼 파일럿이 직접 새긴 문양·글귀·태극기. 기체마다 자리와 내용이 다르다
// 자리(키 대비 비율): 가슴 왼쪽·오른쪽, 어깨(바깥쪽) 왼쪽·오른쪽, 등, 허벅지
const MK_SLOT = {
  lch: { ax: 1, x: .055, y: .7, s: .06 }, rch: { ax: 1, x: -.055, y: .7, s: .06 }, chest: { ax: 1, x: 0, y: .69, s: .09 },
  lsh: { ax: 1, x: .15, y: .76, s: .065 }, rsh: { ax: 1, x: -.15, y: .76, s: .065 }, lsx: { ax: 2, z: 0, y: .745, s: .08 }, rsx: { ax: -2, z: 0, y: .745, s: .08 },
  back: { ax: -1, x: 0, y: .64, s: .27 }, lth: { ax: 1, x: .07, y: .37, s: .06 }, rth: { ax: 1, x: -.07, y: .37, s: .06 },
};
const MARKS = {
  mech4: [{ at: 'lsh', img: 'taegukgi', w: 1.5, c: '#f3e6b0' }, { at: 'back', img: 'wolf', c: '#ffd34a' }],
  m_samurai: [{ at: 'back', img: 'dragon', c: '#ffcf5a' }],
  m_striker: [{ at: 'rsh', img: 'taegukgi', w: 1.5, c: '#ff9ee6' }, { at: 'back', img: 'eagle', c: '#ff7ad9' }],
  m_guardian: [{ at: 'lsh', img: 'taegukgi', w: 1.5, c: '#d8ecff' }, { at: 'back', img: 'wolf', c: '#bfe6ff' }],
  m_titan: [{ at: 'back', img: 'tiger', c: '#f4f4f4' }, { at: 'rch', img: 'tiger', c: '#f4f4f4' }],
  m_ranger: [{ at: 'lsh', img: 'skull', c: '#fff6ea' }, { at: 'back', img: 'skull', c: '#fff6ea' }],
  m_artillery: [{ at: 'rsh', img: 'taegukgi', w: 1.5, c: '#1e4db8' }, { at: 'back', img: 'dragon', c: '#1e4db8' }],
  m_sky: [{ at: 'lsh', img: 'eagle', c: '#e8323c' }, { at: 'back', img: 'eagle', c: '#e8323c' }],
  m_wizard: [{ at: 'back', img: 'crane', c: '#ff5fbf' }, { at: 'lsh', img: 'crane', c: '#ff5fbf' }],
  m_origin: [{ at: 'lsh', img: 'taegukgi', w: 1.5, c: '#2fd6ff' }, { at: 'back', img: 'eagle', c: '#2fd6ff' }],
  god_white: [{ at: 'lsh', img: 'taegukgi', w: 1.5, c: '#3a7fe0' }],
  astra: [{ at: 'lsh', img: 'crane', c: '#b48cff' }, { at: 'back', img: 'eagle', c: '#c9a8ff' }],
};
const _decImg = {};
const loadDecal = (k) => _decImg[k] ??= new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `img/decal_${k}.png`; });
const KFONT = '"Black Han Sans","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif', EFONT = 'Impact,"Arial Black","Noto Sans KR",sans-serif';
async function markAtlas(list) {
  const c = document.createElement('canvas'); c.width = 1536; c.height = 1024; const x = c.getContext('2d');
  for (let k = 0; k < list.length && k < 6; k++) {
    const d = list[k], w = d.w || 1, col = k % 3, row = Math.floor(k / 3);
    const o = document.createElement('canvas'); o.width = o.height = 512; const ox = o.getContext('2d');
    ox.save(); ox.translate(256, 256); ox.scale(1 / w, 1);
    const BW = 512 * w * .92, BH = 512 * .92; let top = -BH / 2, avail = BH;
    if (d.img) { const im = await loadDecal(d.img); if (im) { const ih = d.t ? BH * .68 : BH, ar = im.width / im.height; const dw = Math.min(BW, ih * ar), dh = dw / ar; ox.drawImage(im, -dw / 2, top + (ih - dh) / 2, dw, dh); top += ih; avail -= ih; } }
    if (d.t) { const lh = avail / d.t.length; ox.fillStyle = '#fff'; ox.textAlign = 'center'; ox.textBaseline = 'middle';
      d.t.forEach((s, i) => { const ko = /[가-힣]/.test(s), fam = ko ? KFONT : EFONT; let fs = lh * .8; ox.font = `900 ${fs}px ${fam}`; const mw = ox.measureText(s).width; if (mw > BW) { fs *= BW / mw; ox.font = `900 ${fs}px ${fam}`; } ox.fillText(s, 0, top + lh * (i + .5)); }); }
    ox.restore(); ox.globalCompositeOperation = 'source-in'; ox.fillStyle = d.c; ox.fillRect(0, 0, 512, 512);
    x.drawImage(o, col * 512, (1 - row) * 512);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 스티커를 몸에 붙인다: 기본 자세 기준 좌표로 앞·뒤·옆에서 투사하므로 움직여도 몸을 따라간다
async function applyMarks(g, id) {
  const list = MARKS[id]; if (!list) return; const tex = await markAtlas(list);
  g.scene.traverse((o) => {
    if (!o.isSkinnedMesh || !o.material || Array.isArray(o.material)) return;
    const geo = o.geometry; geo.computeBoundingBox(); const b = geo.boundingBox, H = b.max.y - b.min.y, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    // 기본 자세의 뼈 위치(어깨 관절·가슴·허벅지)를 읽어 기체마다 정확한 자리에 붙인다
    const bp = {}; if (o.skeleton) o.skeleton.bones.forEach((bn, i) => { const m4 = new THREE.Matrix4().copy(o.skeleton.boneInverses[i]).invert(); bp[bn.name.replace(/^mixamorig:?/, '')] = new THREE.Vector3().setFromMatrixPosition(m4); });
    const L3 = (a, c, t) => (a && c ? a.clone().lerp(c, t) : null);
    const shB = o.skeleton && o.skeleton.bones.find((x) => /LeftShoulder$/.test(x.name)), chN = shB && shB.parent && shB.parent.isBone ? shB.parent.name.replace(/^mixamorig:?/, '') : null, chP = shB && shB.parent && shB.parent.parent && shB.parent.parent.isBone ? shB.parent.parent.name.replace(/^mixamorig:?/, '') : null;
    const anchor = (at) => { const S2 = (chN && bp[chN]) || bp.Spine2 || bp.Spine1, NK = bp.Neck || bp.neck, S1 = (chP && bp[chP]) || bp.Spine1 || bp.Spine;
      switch (at) {
        case 'lsh': return bp.LeftArm && [bp.LeftArm.x, bp.LeftArm.y - .012 * H];
        case 'rsh': return bp.RightArm && [bp.RightArm.x, bp.RightArm.y - .012 * H];
        case 'lsx': return bp.LeftArm && [bp.LeftArm.z, bp.LeftArm.y - .05 * H];
        case 'rsx': return bp.RightArm && [bp.RightArm.z, bp.RightArm.y - .05 * H];
        case 'lch': { const c = L3(S2, NK, .3), s = bp.LeftArm; return c && s && [c.x + (s.x - c.x) * .45, c.y]; }
        case 'rch': { const c = L3(S2, NK, .3), s = bp.RightArm; return c && s && [c.x + (s.x - c.x) * .45, c.y]; }
        case 'chest': { const c = L3(S2, NK, .3); return c && [c.x, c.y]; }
        case 'back': { const c = L3(S1, S2, .7); return c && [c.x, c.y]; }
        case 'lth': { const c = L3(bp.LeftUpLeg, bp.LeftLeg, .42); return c && [c.x, c.y]; }
        case 'rth': { const c = L3(bp.RightUpLeg, bp.RightLeg, .42); return c && [c.x, c.y]; }
      } return null; };
    const R = [], I = [];
    for (let k = 0; k < 6; k++) {
      const d = list[k]; if (!d) { R.push(new THREE.Vector4()); I.push(new THREE.Vector4()); continue; }
      const S = MK_SLOT[d.at], s = (S.s * (d.s || 1)) * H * .5, w = d.w || 1, side = Math.abs(S.ax) === 2, an = anchor(d.at);
      const c0 = an ? an[0] : side ? cz + (S.z || 0) * H : cx + (S.x || 0) * H, c1 = (an ? an[1] : b.min.y + S.y * H) + (d.dy || 0) * H;
      R.push(new THREE.Vector4(c0 + (d.dx || 0) * H, c1, s * w, s));
      I.push(new THREE.Vector4(S.ax, k % 3, Math.floor(k / 3), d.o ?? .95));
    }
    const m = o.material;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uMkT = { value: tex }; sh.uniforms.uMkR = { value: R }; sh.uniforms.uMkI = { value: I };
      sh.vertexShader = 'varying vec3 vMkP; varying vec3 vMkN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMkP = position; vMkN = normal;');
      sh.fragmentShader = 'uniform sampler2D uMkT; uniform vec4 uMkR[6]; uniform vec4 uMkI[6]; varying vec3 vMkP; varying vec3 vMkN;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  for (int k = 0; k < 6; k++) { vec4 r = uMkR[k], inf = uMkI[k]; if (inf.w <= 0.) continue;
    float face; vec2 uv;
    if (abs(inf.x) < 1.5) { face = vMkN.z * inf.x; uv = vec2((vMkP.x - r.x) * inf.x, vMkP.y - r.y); }
    else { float sd = sign(inf.x); face = vMkN.x * sd; uv = vec2(-(vMkP.z - r.x) * sd, vMkP.y - r.y); }
    if (face < .15) continue;
    uv = uv / r.zw * .5 + .5; if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) continue;
    vec4 tx = texture2D(uMkT, vec2((uv.x + inf.y) / 3., (uv.y + inf.z) / 2.));
    float a = tx.a * inf.w * smoothstep(.15, .4, face);
    diffuseColor.rgb = mix(diffuseColor.rgb, tx.rgb, a); totalEmissiveRadiance = mix(totalEmissiveRadiance, tx.rgb, a);
  }`);
    };
    m.customProgramCacheKey = () => 'mk6'; m.needsUpdate = true;
  });
}
// 신화 기체: 날개 때문에 작아진 몸을 몸 기준으로 키우고, 다리는 길게·머리는 작게(8등신)
const UR_BODY = 22.5, UR_LEG = 1.1, UR_HEAD = .84;
function heroicBody(g) {
  const B = {}; g.scene.traverse((o) => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; });
  if (!B.Hips || !B.Head || !B.LeftFoot) return;
  const wp = (o) => (g.scene.updateMatrixWorld(true), o.getWorldPosition(new THREE.Vector3()));
  const foot0 = wp(B.LeftFoot).y;
  for (const n of ['LeftUpLeg', 'RightUpLeg']) if (B[n]) B[n].scale.y *= UR_LEG;
  B.Head.scale.multiplyScalar(UR_HEAD);
  // 다리가 길어진 만큼 엉덩이를 올려 발이 땅에 닿게(동작 속 엉덩이 높이도 같이)
  const drop = foot0 - wp(B.LeftFoot).y, ps = B.Hips.parent ? B.Hips.parent.getWorldScale(new THREE.Vector3()).y : 1, dl = drop / (ps || 1);
  B.Hips.position.y += dl;
  for (const clip of g.animations) for (const tr of clip.tracks) if (/^Hips\.position$/.test(tr.name)) for (let i = 1; i < tr.values.length; i += 3) tr.values[i] += dl;
  // 몸 높이(머리 꼭대기까지, 날개 제외)를 UR_BODY로
  const headY = wp(B.Head).y, minY = new THREE.Box3().setFromObject(g.scene).min.y, bodyH = (headY - minY) * 1.1;
  if (bodyH > 1) g.scene.scale.multiplyScalar(UR_BODY / bodyH);
}
const MODEL_FILE = { astra: 'm_guardian' };   // 다른 기체의 몸을 빌려 쓰는 기체
async function loadMech(id) {
  if (mechCache[id]) return mechCache[id];
  const g = await gltfL.loadAsync(`models/${MODEL_FILE[id] || id}.glb`);
  // 본편 모델은 크기가 제각각이라 키를 19로 맞춘다(이 게임의 기존 기체 키)
  { g.scene.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g.scene), h = bb.max.y - bb.min.y; if (h > 0 && Math.abs(h - 19) > .5) g.scene.scale.multiplyScalar(19 / h); }
  if (MECH(id).rar === 'UR') heroicBody(g);
  g.scene.traverse((o) => {
    if (o.isMesh) { o.frustumCulled = false; const m = o.material; if (PAINT[id] && m.map) m.map = repaintTex(m.map, PAINT[id]); m.metalness = Math.min(m.metalness, .15); m.roughness = Math.max(m.roughness, .6); m.metalnessMap = null; m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 1.05; m.color.setScalar(1.6); m.needsUpdate = true; }
  });
  try { await applyMarks(g, id); } catch (e) { console.warn('marks', e); }
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
  spear: { proc: 'spear', bone: 'RightHand', len: 20, grip: [0, -.1, 0], basis: [[0, 1, 0], [0, 0, 1], [1, 0, 0]], palm: [-.35, 1.0, 0], tip: [0, .5, 0], col: 0x9fe8ff },   // 장창: 기체 키만 한 창(코드로 만든 모델, 창끝 +Y)
  staff: { file: 'wm_mace', bone: 'RightHand', len: 21, grip: [0, 0, -.12], basis: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], palm: [-.35, 1.0, 0], col: 0x7fe6ff },
  great: { file: 'wm_great', bone: 'RightHand', len: 21, grip: [.38, 0, 0], basis: [[0, 0, -1], [-1, 0, 0], [0, 1, 0]], palm: [-.35, 1.0, 0], col: 0xfff3b0 },
  howitzer: { file: 'wm_howitzer', world: true, len: 13 },   // 아틸러리 어깨 곡사포(총구 -X)
};
const WPN = {};        // 무기 원본(가운데 정렬, 가장 긴 변 = 1)
// 장창 모델: 길이 1(아래 -0.5 ~ 창끝 +0.5), 금테 두른 자루 + 날개 코등이 + 빛나는 잎 모양 창날
function buildSpear() {
  const grp = new THREE.Group();
  const shaftM = new THREE.MeshStandardMaterial({ color: 0x2b3140, metalness: .55, roughness: .35, emissive: 0x141a26 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xe0b860, metalness: .8, roughness: .28, emissive: 0x3a2a08 });
  const bladeM = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, metalness: .75, roughness: .18, emissive: 0x5fd6ff, emissiveIntensity: .45 });
  const add = (geo, m, y, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.y = y; o.rotation.set(rx, 0, rz); grp.add(o); return o; };
  add(new THREE.CylinderGeometry(.011, .012, .77, 12), shaftM, -.115);                       // 자루
  add(new THREE.ConeGeometry(.016, .045, 12), goldM, -.478, Math.PI);                       // 물미(아래 끝)
  for (const y of [-.40, -.06, .04, .2]) add(new THREE.CylinderGeometry(.016, .016, .016, 12), goldM, y);   // 금테
  // 날개 모양 코등이
  const wing = new THREE.Shape(); wing.moveTo(0, 0); wing.lineTo(.07, .018); wing.lineTo(.095, .05); wing.lineTo(.06, .03); wing.lineTo(0, .022); wing.lineTo(-.06, .03); wing.lineTo(-.095, .05); wing.lineTo(-.07, .018); wing.closePath();
  const wg = new THREE.ExtrudeGeometry(wing, { depth: .014, bevelEnabled: false }); wg.translate(0, 0, -.007); add(wg, goldM, .262);
  add(new THREE.CylinderGeometry(.018, .014, .03, 12), goldM, .28);
  // 잎 모양 창날
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.bezierCurveTo(.045, .03, .05, .11, 0, .21); leaf.bezierCurveTo(-.05, .11, -.045, .03, 0, 0);
  const lg = new THREE.ExtrudeGeometry(leaf, { depth: .008, bevelEnabled: true, bevelThickness: .006, bevelSize: .004, bevelSegments: 2, curveSegments: 16 }); lg.translate(0, 0, -.004); add(lg, bladeM, .29);
  add(new THREE.BoxGeometry(.006, .19, .02), new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x6fe0ff, emissiveIntensity: 1.2, toneMapped: false }), .385);   // 창날 가운데 빛줄기
  grp.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  const box = new THREE.Group(); box.add(grp); return box;
}
async function loadWeapon(key, file) {
  if (ARMS[key] && ARMS[key].proc === 'spear') { WPN[key] = buildSpear(); return; }
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
  wrap.userData = { key, rot, body, muzzle: A.muzzle ? new THREE.Vector3(A.muzzle[0], A.muzzle[1], A.muzzle[2]) : null, tip: A.tip ? vA(A.tip) : null };
  return wrap;
}
// 손 기준틀: 중지 방향(F), 새끼→검지 방향(A), 손등 방향(B = F×A). 무기 축 표(ARMS.basis)는 X=손등·Y=손가락·Z=검지 쪽 기준이다
function handFrame(hand, hs, bonesAll) {
  const side = /Left/.test(hand.name) ? 'Left' : 'Right', nm = (o) => o.name.replace(/^mixamorig:?/, '');
  const ch = (n) => hand.children.find((c) => nm(c) === side + 'Hand' + n);
  const mid = ch('Middle1'), idx = ch('Index1'), pin = ch('Pinky1') || ch('Ring1');
  let F, A, len;
  if (mid && idx && pin) {
    F = mid.position.clone(); len = F.length() * hs; F.normalize();
    A = idx.position.clone().sub(pin.position);
  } else {
    // 손가락 뼈가 없는 기체: 손가락 방향 = 아래팔→손, 검지 쪽 = 몸 앞쪽(기본 자세에서 엄지가 앞을 본다)
    const fa = hand.parent, B0 = bonesAll || {}; if (!fa || !B0.LeftUpLeg || !B0.RightUpLeg) return null;
    const hw = hand.getWorldPosition(new THREE.Vector3()), fw = fa.getWorldPosition(new THREE.Vector3()), Fw = hw.clone().sub(fw); len = Fw.length() * .62; Fw.normalize();
    const left = B0.LeftUpLeg.getWorldPosition(new THREE.Vector3()).sub(B0.RightUpLeg.getWorldPosition(new THREE.Vector3())); left.y = 0; left.normalize();
    const fwd = new THREE.Vector3().crossVectors(left, new THREE.Vector3(0, 1, 0)).normalize();
    const qi = hand.getWorldQuaternion(new THREE.Quaternion()).invert(); F = Fw.applyQuaternion(qi); A = fwd.applyQuaternion(qi);
  }
  if (!len || len < 1e-4) return null; F.normalize();
  A.addScaledVector(F, -A.dot(F)); if (A.lengthSq() < 1e-8) return null; A.normalize();
  const B = new THREE.Vector3().crossVectors(F, A).normalize();
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(B, F, A));
  return { q, len, info: { len: +len.toFixed(2), F: F.toArray().map((v) => +v.toFixed(2)), A: A.toArray().map((v) => +v.toFixed(2)), B: B.toArray().map((v) => +v.toFixed(2)) } };
}
// 기체에 무기를 단다(뼈에 붙여 동작을 그대로 따라간다). 뼈의 세계 배율을 상쇄해 무기 안쪽은 세계 단위로 다룬다
function dressMech(g, mech) {
  if (g.userData.armed) return g.userData.armed;
  const bones = {}; g.scene.traverse((o) => { if (o.isBone) { bones[o.name] = o; o.userData.q0 = o.quaternion.clone(); o.userData.p0 = o.position.clone(); } });
  const out = { bones, main: null, off: null };
  { P.group.updateMatrixWorld(true); const lf = bones.LeftFoot, rf = bones.RightFoot; if (lf && rf) out.footRest = Math.min(lf.getWorldPosition(new THREE.Vector3()).y, rf.getWorldPosition(new THREE.Vector3()).y) - P.group.getWorldPosition(new THREE.Vector3()).y; }
  for (const [slot, key] of [['main', mech.arm], ['off', mech.off]]) {
    if (!key || !WPN[key] || ARMS[key].world) continue; const b = bones[ARMS[key].bone]; if (!b) continue;
    // 뼈의 실제 세계 배율을 재서 상쇄(본편 모델마다 내부 배율이 다르다)
    P.group.updateMatrixWorld(true); const hs = new THREE.Vector3(); b.getWorldScale(hs);
    const w = makeArm(key); w.scale.setScalar((key === 'spear' && mech.rar === 'UR' ? 1.2 : 1) / (hs.x || .0125));
    // 기체마다 손 뼈 방향이 달라, 손가락 뼈로 실제 손바닥 방향을 재서 무기를 손바닥에 쥐게 한다
    P.group.updateMatrixWorld(true); const fr = handFrame(b, hs.x || .0125, bones); if (fr) { w.quaternion.copy(fr.q); w.userData.rot.position.set(-.22 * fr.len, .6 * fr.len, 0); (window.__hand ??= {})[mech.id] = fr.info; }
    b.add(w); out[slot] = w;
  }
  { const lh = bones.LeftHand; if (lh) { P.group.updateMatrixWorld(true); const fr = handFrame(lh, 1, bones);
    if (fr) { const F = new THREE.Vector3(...fr.info.F).normalize(), Bk = new THREE.Vector3(...fr.info.B).normalize(), qw = lh.getWorldQuaternion(new THREE.Quaternion());
      const Bw = Bk.clone().applyQuaternion(qw), hp = lh.getWorldPosition(new THREE.Vector3()), body = bones.Hips ? bones.Hips.getWorldPosition(new THREE.Vector3()).sub(hp).setY(0).normalize() : new THREE.Vector3();
      const sc = -Bw.y + .6 * Bw.dot(body); out.lpf = { F, N: sc > 0 ? Bk : Bk.clone().negate() }; } } }
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
// 무술 동작은 표준 뼈대(인퀴지터 등) 기준이다. 뼈 축이 다른 기체(불사조)는 세계 좌표의 회전 차이로 다시 계산해 몸이 찌그러지지 않게 한다
const MV_SRC = {"Hips":[null,-0.00784,-0.00337,-0.00337,0.99996],"Spine02":["Hips",0,0,0,1],"Spine01":["Spine02",0,0,0,1],"Spine":["Spine01",0.00003,-0.00446,-0.00453,0.99998],"neck":["Spine",0,0,0,1],"Head":["neck",0.09387,-0.03146,-0.03345,0.99452],"head_end":["Head",0,0,0,1],"headfront":["Head",0,-0.76422,-0.64244,0.05698],"LeftShoulder":["Spine",-0.54501,-0.44147,-0.44,0.56078],"LeftArm":["LeftShoulder",-0.49555,0.40252,-0.29155,0.71233],"LeftForeArm":["LeftArm",0.2297,0.14077,-0.04945,0.96176],"LeftHand":["LeftForeArm",-0.07814,-0.20054,-0.13276,0.9675],"RightShoulder":["Spine",-0.54703,0.43896,0.45478,0.54886],"RightArm":["RightShoulder",-0.4649,-0.41862,0.30857,0.71653],"RightForeArm":["RightArm",0.19168,-0.0862,0.0825,0.97418],"RightHand":["RightForeArm",-0.08634,0.20147,0.12917,0.96709],"LeftUpLeg":["Hips",0.98258,0.12588,0.12118,0.06326],"LeftLeg":["LeftUpLeg",0.15927,-0.02346,0.05753,0.98528],"LeftFoot":["LeftLeg",-0.34934,0.05696,-0.13279,0.92579],"LeftToeBase":["LeftFoot",0.17625,0.82993,-0.40725,0.33807],"RightUpLeg":["Hips",0.9838,-0.11446,-0.12296,0.06255],"RightLeg":["RightUpLeg",0.22479,0.02351,-0.0712,0.97152],"RightFoot":["RightLeg",-0.49333,-0.07196,0.18453,0.84699],"RightToeBase":["RightFoot",0.13832,-0.87295,0.33033,0.33122]};
const _mvCache = {};
function mvClips(id, bones) {
  if (_mvCache[id]) return _mvCache[id];
  const off = ['Hips', 'Spine', 'LeftUpLeg', 'RightUpLeg', 'LeftShoulder', 'RightShoulder', 'Head'].some((n) => { const s = MV_SRC[n], b = bones[n]; if (!s || !b || !b.userData.q0) return false; const q = b.userData.q0; return Math.abs(q.x * s[1] + q.y * s[2] + q.z * s[3] + q.w * s[4]) < .9; });
  const out = {}; for (const k in MV) out[k] = off ? retargetClip(MV[k].clip, bones) : MV[k].clip;
  return (_mvCache[id] = out);
}
function retargetClip(clip, bones) {
  const Q = THREE.Quaternion, order = [], seen = new Set();
  const add = (n) => { if (seen.has(n) || !MV_SRC[n] || !bones[n]) return; const p = MV_SRC[n][0]; if (p) add(p); seen.add(n); order.push(n); };
  Object.keys(MV_SRC).forEach(add);
  const tpar = (n) => (bones[n].parent && bones[n].parent.isBone ? bones[n].parent.name : null);
  const sr = {}, sw0 = {}, inv0 = {}, tw0 = {};
  for (const n of order) { const s = MV_SRC[n], p = s[0]; sr[n] = new Q(s[1], s[2], s[3], s[4]); sw0[n] = (p && sw0[p] ? sw0[p].clone() : new Q()).multiply(sr[n]); inv0[n] = sw0[n].clone().invert();
    const tp = tpar(n); tw0[n] = (tp && tw0[tp] ? tw0[tp].clone() : new Q()).multiply(bones[n].userData.q0 || bones[n].quaternion); }
  const tr = {}; for (const t of clip.tracks) tr[boneOf(t)] = { t, ip: t.createInterpolant() };
  const ref = clip.tracks[0], times = ref.times, nF = times.length, outV = {};
  for (const n in tr) if (bones[n] && seen.has(n) && !/^(neck|Head|head_end|headfront)$/.test(n)) outV[n] = new Float32Array(nF * 4);
  const sw = {}, tw = {}, ql = new Q();
  for (let f = 0; f < nF; f++) {
    for (const n of order) {
      const p = MV_SRC[n][0]; if (tr[n]) { const r = tr[n].ip.evaluate(times[f]); ql.set(r[0], r[1], r[2], r[3]).normalize(); } else ql.copy(sr[n]);
      sw[n] = (p && sw[p] ? sw[p].clone() : new Q()).multiply(ql);
      tw[n] = sw[n].clone().multiply(inv0[n]).multiply(tw0[n]);
      if (outV[n]) { const tp = tpar(n); (tp && tw[tp] ? tw[tp].clone().invert() : new Q()).multiply(tw[n]).toArray(outV[n], f * 4); }
    }
  }
  return new THREE.AnimationClip(clip.name + '_rt', clip.duration, Object.keys(outV).map((n) => new THREE.QuaternionKeyframeTrack(n + '.quaternion', times, outV[n])));
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
    if (ET[k].virt) { IM[k] = []; continue; }
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
  if (e.code === 'KeyE') inp.auto = true; if (e.code === 'KeyR') inp.elem = true; if (e.code === 'KeyT' && G.state === 'play') toggleSkMode();
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
tap($('#bDash'), () => (inp.dash = true)); tap($('#bAuto'), () => (inp.auto = true)); tap($('#bElem'), () => (inp.elem = true)); tap($('#bFly'), () => (inp.fly = true)); tap($('#bUlt'), () => (inp.ult = true)); tap($('#bPause'), () => togglePause()); tap($('#bSkMode'), () => toggleSkMode());
function drawSkMode() { const b = $('#bSkMode'); if (!b) return; b.innerHTML = save.skMan ? '<i>●</i>수동' : '<i>●</i>자동'; b.classList.toggle('man', !!save.skMan); $('#hud').classList.toggle('skman', !!save.skMan); b.title = save.skMan ? '수동: E·R 스킬을 버튼으로만 씁니다 (T)' : '자동: 적이 가까우면 E·R 스킬을 스스로 씁니다 (T)'; }
function toggleSkMode() { save.skMan = !save.skMan; persist(); drawSkMode(); banner(save.skMan ? '스킬 수동 · 버튼을 눌러야 씁니다' : '스킬 자동 · 적이 가까우면 스스로 씁니다', 1500); if (gate('skm', 100)) tone(save.skMan ? 520 : 780, save.skMan ? 380 : 1040, .1, 'triangle', .05); }
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
save.cpn ??= []; save.core ??= 0; save.own ??= { mech4: 1, m_samurai: 1, m_striker: 1 }; save.up ??= {}; save.daily ??= {}; save.stat ??= { runs: 0, kills: 0, wins: 0 };
if (!save.own[save.mech]) save.mech = 'mech4';
save.acc ??= { lv: 1, exp: 0, name: '', pilot: 1 }; save.ore ??= 0; save.chip ??= 0; save.sk ??= {}; save.mail ??= []; save.mailId ??= 1; save.shop ??= {}; save.wpity ??= 0;
save.gem ??= 300; save.stars ??= {}; save.pity ??= { n: 0 }; save.chMax ??= Math.min(10, Math.max(1, save.maxThreat || 1)); save.ch ??= Math.min(save.chMax, save.threat || 1);
if (!save.stv) { const oc = save.chMax || 1; save.chMax = Math.min(24, 1 + Math.round((oc - 1) * 23 / 9)); const ns = {}; for (let i = 1; i < save.chMax; i++) ns[i] = 1; save.stars = ns; save.ch = save.chMax; save.stv = 2; }
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
  for (const e of E) if (e.vis) scene.remove(e.vis.wrap); E = []; shots = []; ebs = []; gems = []; picks = []; msl = []; nums.length = 0; if (XF) XF.clear();
  AN.over = null; AN.overT = 0; mslClear();
  clearMission();
  Object.assign(G, { finalT: null, t: 0, kills: 0, shake: 0, slow: 0, bossOn: false, boss: null, mid: null, won: false, spawnAcc: 0, ev: 0, pend: 0, endT: 0, st: { big: 0, flights: 0, ults: 0, skills: 0, maxCombo: 0, pd: 0 }, combo: 0, comboT: 0, hstop: 0, hsCd: 0, pdCd: 0, evq: null, drops: [], elites: 0, bonusCore: 0, ashT: 0, storm: 0, tor: [] });
  LATER.length = 0; shells = []; clearVFX();
  Object.assign(P, {
    x: 0, z: 0, yaw: 0, hp: 100, maxHp: 100, inv: 0, lvl: 1, xp: 0, need: 6, spdMul: 1, cdMul: 1, crit: .05, magnet: 30, regen: 0,
    dashT: 0, dashCd: 0, dashMax: 2.6, dx: 0, dz: 1, ult: 0, flash: 0, bladeA: 0, sw: null, swN: 0, podT: 0, podK: 0, recoil: 0, ultT: 0, lunge: 0, pod: null, mz: null,
    fly: false, flyT: 0, flyCd: 0, tf: 0, tfUp: false, alt: 0, hd: 0, bank: 0, dT: 0,
    bar: 0, barMax: 0, barT: 0, barCd: 3, barHit: 0,
    w: { rifle: 1, blade: 0, missile: 0, pulse: 0, strike: 0, armor: 0, thruster: 0, magnet: 0, reactor: 0, crit: 0, repair: 0, elemUp: 0, stunUp: 0, aoeUp: 0 },
    cd: { rifle: .3, missile: 1, pulse: 2, strike: 1.5 },
    dmgMul: 1, meleeMul: 1, taken: 1, stillMul: 1, splash: 1, ultGain: 1, flyCdMul: 1, gSpin: 0, burstN: 0, burstT: 0, beamTk: 0, beamB: null,
    evo: {}, iceK: 1, burnT: 0, zapT: 0, el: 'fire', ekCd: 5, relT: 0, relEl: null, relTk: 0, rel: null, wo: {}, wAuto: [], elT: 0, healK: 1, wpn: null,
    dodge: 0, bitPlus: 0, lifesteal: 0, rr: 2, odT: 0, palmT: 0, cloakT: 0, cloakHits: 0, akCd: 2, mv: null, bitBoost: 0, palm: null, how: null, howRc: 0, lAimK: 0,
  });
}

// ───────── 플레이어 ─────────
let CURM = null;
async function setMech(id) {
  await ensureMech(id);
  const g = await loadMech(id), mech = MECH(id);
  while (P.spin.children.length) P.spin.remove(P.spin.children[0]);
  if (TF_E._jet && TF_E._jet.grp && TF_E._jet.grp.parent) TF_E._jet.grp.parent.remove(TF_E._jet.grp);
  P.spin.add(g.scene); TF_E.mdl.obj = g.scene; TF_E.fk = id; TF_E._jet = null; TF_E._tfP = null; TF_M._bones = null;
  ARM = mech.arm; PRIM = mech.prim; CURM = mech; armed = dressMech(g, mech);
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
  if (MV) { const MC = mvClips(id, armed.bones); for (const k in MV) {
    acts['o_' + k] = mixer.clipAction(MC[k]);
    acts['u_' + k] = mixer.clipAction(onlyBones(MC[k], 'u_' + k + '_' + id, (b) => !LEGB.has(b)));
  } }
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
const lvOf = (k) => P.w[k], st = (k, f) => { let v = UP[k][f][P.w[k] - 1]; const X = P.evo && P.evo[k] && EVO[k]; if (X) { if (X.mul && X.mul[f]) v = f === 'n' ? Math.round(v * X.mul[f]) : v * X.mul[f]; if (X.add && X.add[f]) v += X.add[f]; } return v; };
// 무기 진화: 무기를 최대로 키우고 짝 장비를 갖추면 강화 카드에 「무기 진화」가 뜬다
const EVO = {
  rifle: { need: 'crit', nm: '섬멸 사격', ds: '주무기 진화 · 피해 +70% · 탄 +1 · 관통 +1 · 연사 +30%', mul: { dmg: 1.7, cd: .7 }, add: { n: 1, pierce: 1 } },
  missile: { need: 'reactor', nm: '군집 미사일 폭풍', ds: '미사일 2배 · 피해 +30% · 재장전 -20%', mul: { n: 2, dmg: 1.3, cd: .8 } },
  pulse: { need: 'magnet', nm: '중력 붕괴', ds: '충격파 범위 +50% · 피해 +80% · 주기 -25%', mul: { rad: 1.5, dmg: 1.8, cd: .75 } },
  strike: { need: 'thruster', nm: '궤도 융단 폭격', ds: '포격 2배 · 피해 +40% · 주기 -20%', mul: { n: 2, dmg: 1.4, cd: .8 } },
  blade: { need: 'armor', nm: '태양 드론', ds: '드론 피해 2배 · 회전 반경 +25%', mul: { dmg: 2, rad: 1.25 } },
};

function nearest(x, z, range, skip) {
  let best = null, bd = range * range;
  for (const e of E) { if (e.dead || e.ally || e === skip) continue; const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
function fire(x, z, ang, dmg, pierce, kind, tgt, y = 10, vy = 0, life, col) {
  if (shots.length > 250) return;
  const sp = kind === 'w' ? 210 : kind === 'f' ? 240 : 300;
  shots.push({ x, z, y, vy, vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, ang, life: life || (kind === 'w' ? .46 : .62), dmg, pierce, kind, tgt, hit: null, col });
}
function dealDmg(e, base, kx, kz, kb = 1) {
  if (e.ally || e.dead) return;
  const cr = Math.random() < P.crit; let d = Math.round(base * (P.dmgMul || 1) * (cr ? 2 : 1) * rand(.9, 1.1) * (e.vulT > 0 ? 1.3 : 1) * (P.relT > 0 ? 1.3 : 1));
  const bossy = e.T.r > 10 && (e.T.boss || e.t === 'queen' || e.T.virt) && !e.flee;
  if (bossy) {
    if (e.groggy > 0) d = Math.round(d * 1.5);
    else { e.stg = (e.stg || 0) + d; const need = e.max * .1 * (1 + (e.brk || 0) * .5);
      if (e.stg >= need) { e.stg = 0; e.brk = (e.brk || 0) + 1; e.groggy = 3.2; e.stun = 3.2; e.st = 'move'; e.tm = 1.5; cancelDecal(e.dec); e.dec = null;
        banner('그로기 · 약점 노출', 1500); ring(e.x, e.z, 6, 70, .5, 0xffd166); screenFlash('#ffd166', .25, .5); G.hstop = .12; sfx.boom(); num(e.x, e.T.h + 6, e.z, '그로기!', '#ffd166', 24); } }
  }
  if (cr && (G.hsCd || 0) <= 0 && (e.T.r > 10 || d >= 90)) { G.hstop = .05; G.hsCd = .2; G.shake = Math.max(G.shake, 2.5); }
  e.hp -= d; e.flash = .11;
  const m = e.T.r > 10 ? .12 : 1; e.kx += kx * 26 * kb * m; e.kz += kz * 26 * kb * m;
  if (cr || d >= 40) num(e.x, e.T.h, e.z, cr ? d + '!' : d, cr ? '#ffd24a' : '#fff', cr ? 21 : 15); else if (Math.random() < .22) num(e.x, e.T.h, e.z, d, '#ffffffcc', 13);
  sfx.hit();
  if (e.hp <= 0) kill(e); else onHitFx(e, d, cr);
}
function explode(x, z, r, dmg, color) {
  ring(x, z, r * .2, r * 1.1, .4, color); burst(x, 5, z, 26, color, 70, .55, 9); burst(x, 5, z, 10, 0xffffff, 40, .3, 12);
  flare(x, 7, z, color, r * 1.05, .14); lightFlash(x, 16, z, color, 14 + r * 1.3, .3); mark(x, z, r * .85, 0x0e0805, 'scorch', 7, .62);
  for (const e of E) { if (e.dead) continue; const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz); if (d < r + e.T.r) dealDmg(e, dmg, dx / (d || 1), dz / (d || 1), 1.4); }
  sfx.boom(); G.shake = Math.max(G.shake, 2.2);
}

function updPlayer(dt) {
  readMove(); tickLater(dt);
  const spd = 62 * P.spdMul * (P.iceK || 1);
  P.odT -= dt; P.palmT -= dt; if (P.cloakT > 0) P.cloakT -= dt;
  // 비행(F): 누르면 짧게 변신해 날아오른다. 다시 누르거나 대시하면 착지
  if (inp.fly) { if (P.fly && P.tfUp) endFly(); else if (!P.fly) startFly(); }
  inp.fly = false;
  if (inp.dash && P.fly) { if (P.tfUp) endFly(); inp.dash = false; }
  P.flyCd -= dt;
  if (inp.dash && P.dashCd <= 0) {
    P.dashT = .2; P.dashCd = P.dashMax; P.inv = Math.max(P.inv, .34); checkPerfectDodge();
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
  if (!P.fly) { const w = (P.sw || P.dashT > 0 ? 16 : 10) * dt; P.yaw += Math.abs(da) < w ? da : Math.sign(da) * w; }
  P.alt = lerp(P.alt, P.fly && P.tfUp ? FLY.alt : 0, Math.min(1, dt * (P.fly && P.tfUp ? 7 : 9))); if (!P.fly && P.alt < .05) P.alt = 0;
  P.group.position.set(P.x, P.alt, P.z); P.wrap.position.set(0, 0, 0); P.wrap.rotation.set(0, P.yaw - Math.PI / 2, 0); P.wrap.scale.setScalar(1.25); pMark.position.set(P.x, .4, P.z);
  P.group.visible = !(P.inv > 0 && P.dashT <= 0 && P.ultT <= 0 && Math.floor(P.inv * 20) % 2 === 0);
  const moving = !!(inp.x || inp.z) || P.dashT > 0 || !!P.mv;
  if ((P.dashT > 0 || P.mv) && !P.fly && (P.ghT = (P.ghT || 0) - dt) <= 0) { P.ghT = .045; spawnGhost(); }
  updGhosts(dt);
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
        const near = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 130 * 130), e = near[Math.random() * near.length | 0];
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
  if (inp.ult) { inp.ult = false; if (P.ult < 100) denyBtn('#bUlt', '필살 게이지 ' + Math.floor(P.ult) + '%'); else if (P.fly) { if (P.tfUp) endFly(); P.ulQ = .9; } else P.ulQ = .5; }
  P.ulQ = Math.max(0, (P.ulQ || 0) - dt);
  if (P.ulQ > 0 && P.ult >= 100 && !P.fly && !P.mv) { P.ulQ = 0; tone(160, 640, .38, 'sawtooth', .07); burst(P.x, 14, P.z, 24, 0xffcf5a, 30, .4, 10, 1.4); castUlt(); skPress('#bUlt'); }
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
  const n = G.state !== 'title' && PRIM === 'bits' && P.w ? 2 + st('rifle', 'n') + (P.bitBoost > 0 ? 2 : 0) + (P.bitPlus || 0) : 0; P.bitBoost -= dt;
  for (let i = 0; i < BITS.length; i++) { const B = BITS[i], on = i < Math.min(6, n); B.g.visible = on; if (!on) continue;
    const a = droneClock * 2.2 + i / Math.min(6, n) * TAU; B.x = P.x + Math.cos(a) * 11; B.z = P.z + Math.sin(a) * 11; B.y = P.alt + 24 + Math.sin(droneClock * 3 + i) * 2; B.g.position.set(B.x, B.y, B.z); }
}
function bitsFire(n, dmg, range = 150) {
  const live = BITS.filter((b) => b.g.visible); if (!live.length) return 0; const tg = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < range * range).sort((a, b) => ((a.x - P.x) ** 2 + (a.z - P.z) ** 2) - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2)).slice(0, n);
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
  const near = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 170 * 170);
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
    case 'mortar': if (ARM === 'hammer' && d < 34) { startSwing(tgt); break; } P.cd.rifle = cd0 * 1.75; for (let i = 0; i < n; i++) mortar(tgt.x + (i ? rand(-18, 18) : 0), tgt.z + (i ? rand(-18, 18) : 0), base * 2.4, 17 * (P.splash || 1), .7 + i * .08); break;
    case 'bits': if (ARM === 'spear' && d < 40) { startSwing(tgt); break; } P.cd.rifle = cd0 * 1.05; bitsFire(2 + n, base * 1.05); break;
    case 'saber': if (d < 46) startSwing(tgt); else { P.cd.rifle = cd0; gunShot(tgt, n, .12, base, pr, { palm: 1, col: 0xffc060 }); P.palmT = .5; } break;
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
// 대상이 없을 때 누르면 바라보는 쪽 앞을 겨눈다
const fakeTg = (d = 70) => ({ x: P.x + Math.sin(P.yaw) * d, z: P.z + Math.cos(P.yaw) * d, T: { h: 16, r: 4 }, hp: 1, dead: false, fake: 1 });
function denyBtn(sel, msg) {
  const b = $(sel); if (b) { b.classList.remove('deny'); void b.offsetWidth; b.classList.add('deny'); clearTimeout(b._dn); b._dn = setTimeout(() => b.classList.remove('deny'), 380); }
  if (gate('deny', 160)) tone(150, 110, .08, 'square', .035);
  if (msg && gate('denyMsg', 900)) num(P.x, 34, P.z, msg, '#ffb0a0', 13);
}
function skPress(sel) { const b = $(sel); if (b) { b.classList.remove('fired'); void b.offsetWidth; b.classList.add('fired'); } }
function autoTick(dt) {
  elemTick(dt);
  const A = MECH(save.mech).auto; P.akCd -= dt;
  if (inp.auto) { inp.auto = false; if (P.akCd > .35) denyBtn('#bAuto', '재사용 ' + Math.ceil(P.akCd) + '초'); else P.akQ = .4; }
  P.akQ = Math.max(0, (P.akQ || 0) - dt);
  if (P.akCd > 0 || P.mv || P.ultT > 0) return;
  const want = P.akQ > 0, near = nearest(P.x, P.z, A.k === 'backstep' ? 34 : 100);
  if (!want && (save.skMan || !near)) return;
  if (P.fly && !['dive', 'featherstorm', 'bitstorm', 'palm', 'overdrive'].includes(A.k)) { if (want) { P.akQ = 0; denyBtn('#bAuto', '착지해야 씁니다'); } return; }
  const tg = near || nearest(P.x, P.z, 260) || (want ? fakeTg() : null);
  if (tg && doAuto(A.k, tg)) { P.akQ = 0; P.akCd = A.cd * P.cdMul * (P.akK || 1); G.st.skills++; if (want) skPress('#bAuto'); }
}
function doAuto(k, tg) {
  const base = st('rifle', 'dmg') * (P.skE || 1), fy = P.yaw, fx = Math.sin(fy), fz = Math.cos(fy);
  switch (k) {
    case 'flash': { if (!tg) return false; const a = Math.atan2(tg.x - P.x, tg.z - P.z), dd = Math.max(0, Math.hypot(tg.x - P.x, tg.z - P.z) - 8); moveTo(P.x + Math.sin(a) * dd, P.z + Math.cos(a) * dd, .16); sfx.dash();
      later(.17, () => { areaHit(P.x, P.z, 26, base * 5, 2.2); ring(P.x, P.z, 4, 30, .3, 0x9ff3ff); burst(P.x, 8, P.z, 30, 0xbff6ff, 90, .35, 10); G.shake = Math.max(G.shake, 2.5); }); return true; }
    case 'iaido': { if (!tg) return false; const a = Math.atan2(tg.x - P.x, tg.z - P.z), L = 70, x0 = P.x, z0 = P.z; moveTo(P.x + Math.sin(a) * L, P.z + Math.cos(a) * L, .14); oneShot('cut1', .3); sfx.swing(true);
      later(.14, () => { lineHit(x0, z0, a, L + 8, 10, base * 5 * (P.meleeMul || 1), 1.8); beamFx(x0, 9, z0, x0 + Math.sin(a) * (L + 10), 9, z0 + Math.cos(a) * (L + 10), 1.6, 0xdff8ff, .25); crescent(P.x, P.z, a, 40, .4, 0xdff8ff); sfx.slash(); }); return true; }
    case 'overdrive': P.odT = 3.5; ring(P.x, P.z, 4, 26, .35, 0x9ff3ff); tone(400, 1600, .4, 'sawtooth', .05); num(P.x, 30, P.z, '과충전', '#9ff3ff', 16); return true;
    case 'palm': { if (!tg) return false; gunShot(tg, 7, .12, base * 1.3, 2, { palm: 1, col: 0xffc060 }); P.palmT = .7; return true; }
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
  P.ult = 0; P.inv = Math.max(P.inv, 1.2); P.sw = null; G.st.ults++; if (P.rel) later(.3, () => castRelease(P.rel)); sfx.ult(); G.shake = Math.max(G.shake, 4);
  const UC = { bladefall: '#bff6ff', tenzan: '#dff8ff', laserstorm: '#9ff3ff', phoenix: '#ff8a3a', satsnipe: '#9ff6ff', carpet: '#ffa040', aegis: '#ffd27a', titanfall: '#ffb04a', mstorm: '#ff9a4a', execute: '#b48cff', allrange: '#6fdcff', nova: '#ffe28a', descent: '#fff3b0' }[k] || '#ffffff';
  screenFlash(UC, .28, .5); lightFlash(P.x, 22, P.z, UC, 55, .5); ring(P.x, P.z, 4, 46, .45, +('0x' + UC.slice(1))); flare(P.x, 14 + P.alt, P.z, +('0x' + UC.slice(1)), 26, .2);
  const D = (e, small, large) => (big(e) ? large : small) * (P.skQ || 1);
  switch (k) {
    case 'bladefall': { oneShot('fin', .7); const near = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 160 * 160);
      for (let i = 0; i < 22; i++) later(i * .05, () => { const e = near[(Math.random() * near.length) | 0]; const x = e && !e.dead ? e.x : P.x + rand(-120, 120), z = e && !e.dead ? e.z : P.z + rand(-120, 120);
        beamFx(x, 90, z, x, 0, z, 1.4, 0xbff6ff, .18); decal(x, z, 14, .25, 0x9ff3ff, () => { for (const o of E) { if (o.dead) continue; if (Math.hypot(o.x - x, o.z - z) < 14 + o.T.r) dealDmg(o, D(o, 170, 500), 0, 0, 1.5); } ring(x, z, 3, 16, .25, 0xbff6ff); }); }); break; }
    case 'tenzan': { oneShot('fin', .8); later(.35, () => { for (const da of [0, -1.05, 1.05]) { const a = fy + da; lineHit(P.x - Math.sin(a) * 130, P.z - Math.cos(a) * 130, a, 260, 16, 0, 0, (e) => dealDmg(e, D(e, 320, 950), Math.sin(a), Math.cos(a), 3)); beamFx(P.x - Math.sin(a) * 130, 9, P.z - Math.cos(a) * 130, P.x + Math.sin(a) * 130, 9, P.z + Math.cos(a) * 130, 3, 0xdff8ff, .4); crescent(P.x, P.z, a, 90, da, 0xdff8ff); }
      G.slow = .4; G.shake = 8; xfBoom(P.x, P.z, 'elite', 14, 'emp'); }); break; }
    case 'laserstorm': { for (let w = 0; w < 3; w++) later(w * .22, () => { const p = P.mz || { x: P.x, y: 14, z: P.z }; for (let i = 0; i < 30; i++) fire(p.x, p.z, i / 30 * TAU + w * .1, 110, 6, 'r', null, p.y, 0, .8); tone(1600, 400, .25, 'sawtooth', .05); ring(P.x, P.z, 4, 60, .3, 0x9ff3ff); }); break; }
    case 'phoenix': { oneShot('fin', .6); const L = 150, x0 = P.x, z0 = P.z; moveTo(P.x + fx * L, P.z + fz * L, .3);
      for (let i = 0; i < 8; i++) later(i * .035, () => { burst(P.x, 10, P.z, 14, 0xff7a2a, 70, .6, 13, .8); burst(P.x, 12, P.z, 6, 0xffe08a, 50, .4, 16, 1); });
      later(.3, () => { lineHit(x0, z0, fy, L + 10, 22, 0, 0, (e) => dealDmg(e, D(e, 380, 1100), fx, fz, 3)); beamFx(x0, 10, z0, x0 + fx * L, 10, z0 + fz * L, 4, 0xff8a3a, .45); xfBoom(P.x, P.z, 'elite', 16, 'emp'); G.slow = .35; }); break; }
    case 'satsnipe': { const tg = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 230 * 230).sort((a, b) => b.hp - a.hp).slice(0, 7);
      tg.forEach((e, i) => later(.15 + i * .14, () => { if (e.dead) return; decal(e.x, e.z, 16, .2, 0x9ff6ff); beamFx(e.x, 260, e.z, e.x, 0, e.z, 3.2, 0x9ff6ff, .45); dealDmg(e, D(e, 900, 1600), 0, 0, 0); areaHit(e.x, e.z, 18, 160, 1.5); burst(e.x, 6, e.z, 30, 0xdff8ff, 90, .45, 12); tone(2600, 200, .35, 'sawtooth', .06); })); break; }
    case 'carpet': { for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) { const dist = 30 + row * 32, a = fy + (i - 2) * .28, x = P.x + Math.sin(a) * dist, z = P.z + Math.cos(a) * dist; later(row * .16 + i * .03, () => mortar(x, z, 240, 26, .55)); } break; }
    case 'aegis': oneShot('slam', .7); P.barMax = P.bar = Math.round(P.maxHp * .6); P.barT = 9; P.barHit = 1; P.inv = Math.max(P.inv, 2.2);
      later(.35, () => { areaHit(P.x, P.z, 85, 160, 6, 1.5); ring(P.x, P.z, 8, 90, .6, 0xffd27a); ring(P.x, P.z, 4, 70, .45, 0x9ff3ff); xfBoom(P.x, P.z, 'elite', 14, 'emp'); }); break;
    case 'titanfall': oneShot('slam', .8); later(.42, () => { for (const e of E) { if (e.dead) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < 150) { dealDmg(e, D(e, 260, 950), dx / (d || 1), dz / (d || 1), 4.5); e.stun = Math.max(e.stun || 0, 2); } }
      ring(P.x, P.z, 8, 155, .7, 0xffb04a); ring(P.x, P.z, 4, 110, .5, 0xffffff); burst(P.x, 8, P.z, 90, 0xffb04a, 180, .9, 13); xfBoom(P.x, P.z, 'boss', 18, 'emp'); G.slow = .5; G.shake = 9; ebs.length = 0; }); break;
    case 'mstorm': if (MSW) { const near = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 200 * 200); const b = P.pod || { x: P.x, y: 22 + P.alt, z: P.z };
      for (let i = 0; i < 24; i++) { const tg = near.length ? near[i % near.length] : null, side = i % 2 ? -1 : 1; MSLE.fire({ wh: 'he', profile: 'vertical', kind: 'micro', x: b.x / MK, h: b.y / MK, y: b.z / MK, dir: [side * rand(.1, .5), 1, rand(-.4, .4)], target: tg ? pxOf(tg) : null, tx: tg ? null : (P.x + rand(-90, 90)) / MK, ty: tg ? null : (P.z + rand(-90, 90)) / MK, th: tg ? null : 8, dmg: 140, src: window.G.local, dt: 'x', splash: 18 / MK, team: 0, delay: i * .045 }); }
      P.podT = 1.8; } else launchSalvo(20, 140); break;
    case 'execute': { const tg = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 190 * 190).sort((a, b) => b.hp - a.hp).slice(0, 9), x0 = P.x, z0 = P.z; P.inv = Math.max(P.inv, tg.length * .09 + .6);
      tg.forEach((e, i) => later(i * .09, () => { if (e.dead) return; P.x = e.x - 6; P.z = e.z - 6; dealDmg(e, D(e, 650, 1300), 0, 0, 1); crescent(e.x, e.z, rand(0, TAU), 26, rand(-.6, .6), 0xc9b8ff); burst(e.x, 9, e.z, 16, 0xb48cff, 70, .35, 10); sfx.slash(); }));
      later(tg.length * .09 + .05, () => { P.x = x0; P.z = z0; ring(P.x, P.z, 4, 30, .3, 0xb48cff); }); break; }
    case 'allrange': { const tg = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 175 * 175).slice(0, 36); P.bitBoost = 4;
      tg.forEach((e, i) => later((i % 6) * .05, () => { if (e.dead) return; const B = BITS[i % 6]; beamFx(B.x || P.x, B.y || 24, B.z || P.z, e.x, e.T.h * .5, e.z, .9, 0x6fdcff, .25); dealDmg(e, D(e, 280, 700), 0, 0, .8); })); tone(2200, 600, .5, 'square', .04); break; }
    case 'nova': for (let w = 0; w < 2; w++) later(w * .35, () => { areaHit(P.x, P.z, 170, 300, 4); ring(P.x, P.z, 8, 175, .65, 0xffe28a); burst(P.x, 12, P.z, 60, 0xffe28a, 170, .7, 12); xfBoom(P.x, P.z, 'elite', 14, 'emp'); });
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .3); num(P.x, 30, P.z, '+' + Math.round(P.maxHp * .3), '#7dff9a', 18); break;
    case 'descent': { oneShot('slam', .8); P.inv = Math.max(P.inv, 2.5); const pts = [[0, 0]]; for (let i = 0; i < 8; i++) pts.push([Math.cos(i / 8 * TAU) * 75, Math.sin(i / 8 * TAU) * 75]);
      pts.forEach(([ox, oz], i) => later(.3 + i * .06, () => { const x = P.x + ox, z = P.z + oz; beamFx(x, 220, z, x, 0, z, 6, 0xfff3b0, .6); areaHit(x, z, 32, 380, 3); ring(x, z, 4, 34, .4, 0xfff3b0); }));
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .5); num(P.x, 30, P.z, '+' + Math.round(P.maxHp * .5), '#7dff9a', 18); later(.8, () => { xfBoom(P.x, P.z, 'boss', 16, 'alp'); G.slow = .4; }); break; }
  }
}

// 근접 무기별 동작 묶음(검도·창술·도끼질 참고 사진 기준)
//  · 카타나: 대각 베기(袈裟)·가로 베기·찌르기(突き)·올려 베기, 마지막은 내려 베기. 두 손으로 자루를 잡는다
//  · 빔 세이버: 한 손 연속 베기(다른 손은 손바닥 레이저)
//  · 대검: 두 손, 느리고 무겁게. 대각 베기 → 내려찍기 → 회전 베기
//  · 장창: 두 손. 찌르기 두 번 → 휘둘러 베기 → 머리 위로 돌리는 회전 공격
//  · 해머(도끼와 같은 무거운 무기): 머리 위로 들어 내려찍기 → 비껴 치기 → 회전
const CUTS = ['cut1', 'cut2', 'cut3', 'cut4', 'cut5'];
const MSTY = {
  katana: { two: 1, seq: ['cut1', 'cut2', 'thrust', 'cut3', 'cut4', 'fin'] },
  saber: { two: 0, seq: ['cut1', 'cut2', 'cut3', 'cut4', 'cut5', 'fin'] },
  great: { two: 1, seq: ['cut3', 'cut1', 'chop', 'cut4', 'spin'], slow: 1.2 },
  spear: { two: 1, seq: ['thrust', 'thrust', 'cut2', 'thrust', 'spin'] },
  hammer: { two: 1, seq: ['chop', 'cut4', 'chop', 'spin'], slow: 1.3 },
};
const MTIP = { katana: [0, .5, 0], saber: [0, -.5, 0], great: [-.5, 0, 0], spear: [0, .5, 0], hammer: [.5, 0, 0] };
function startSwing(tgt) {
  const S = MSTY[ARM] || MSTY.saber, cd = st('rifle', 'cd') * P.cdMul * 1.1 * (S.slow || 1); P.swN++;
  const k = S.seq[(P.swN - 1) % S.seq.length], fin = k === 'fin' || k === 'chop' || k === 'spin';
  const dur = k === 'spin' ? Math.max(.7, cd * 1.9) : k === 'thrust' ? clamp(cd * 1.15, .34, .55) : fin ? Math.max(.62, cd * 1.7) : clamp(cd * 1.2, .36, .6);
  P.cd.rifle = fin ? dur * .92 : Math.max(cd, k === 'thrust' ? dur * .85 : 0);
  if (k === 'chop') oneShot('slam', dur); else if (MV && MV[k]) oneShot(k, dur);
  const at = k === 'thrust' ? .45 : k === 'spin' ? .45 : k === 'chop' ? (MV ? MV.slam.hit : .55) : (MV && MV[k] ? MV[k].hit : .5);
  P.sw = { t: 0, T: dur, at: dur * at, done: false, fin, k, hits: k === 'spin' ? [dur * .45, dur * .72] : null, hn: 0, tilt: (P.swN % 2 ? 1 : -1) * rand(.25, .55) };
  P.lunge = clamp(Math.hypot(tgt.x - P.x, tgt.z - P.z) - 24, 0, k === 'thrust' ? 30 : fin ? 26 : 12);
  sfx.swing(fin);
}
function updSwing(dt) {
  const s = P.sw; s.t += dt;
  if (P.lunge > 0 && s.t < s.at) { const d = Math.min(P.lunge, (s.k === 'thrust' ? 190 : 110) * dt); P.x += Math.sin(P.yaw) * d; P.z += Math.cos(P.yaw) * d; P.lunge -= d; }
  // 회전 공격: 몸 전체가 한 바퀴 돈다
  if (s.k === 'spin') { const u = clamp((s.t / s.T - .15) / .7, 0, 1); P.wrap.rotation.y += u * u * (3 - 2 * u) * TAU; }
  if (s.hits) { while (s.hn < s.hits.length && s.t >= s.hits[s.hn]) { s.hn++; slashHit(s); } }
  else if (!s.done && s.t >= s.at) { s.done = true; slashHit(s); }
  if (s.t >= s.T) P.sw = null;
}
function slashHit(s) {
  if (s.k === 'thrust' || s.k === 'spin' || s.k === 'chop') { slashHit2(s); return; }
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

// 찌르기·회전·내려찍기 판정과 효과
function slashHit2(s) {
  const fy = P.yaw, fx = Math.sin(fy), fz = Math.cos(fy), col = (ARMS[ARM] && ARMS[ARM].col) || 0xbff6ff, base = st('rifle', 'dmg') * (P.meleeMul || 1) * cloakMul();
  if (s.k === 'thrust') {
    const R = ARM === 'spear' ? 64 : 48, n = lineHit(P.x, P.z, fy, R, 9, base * 1.7, 2.4);
    beamFx(P.x + fx * 6, 11, P.z + fz * 6, P.x + fx * R, 9, P.z + fz * R, 1.1, col, .16); flare(P.x + fx * R, 9, P.z + fz * R, col, 16, .12); burst(P.x + fx * R * .8, 9, P.z + fz * R * .8, 10, 0xffffff, 80, .25, 8, .2);
    for (let i = 0; i < st('rifle', 'n'); i++) fire(P.x + fx * 10, P.z + fz * 10, fy + (i - (st('rifle', 'n') - 1) / 2) * .08, st('rifle', 'dmg') * 1.2, st('rifle', 'pierce') + 2, 'w', null, 9, 0);
    if (n) { G.slow = Math.max(G.slow, .04); sfx.slash(); } return;
  }
  if (s.k === 'spin') {
    const R = ARM === 'spear' ? 54 : 50, n = areaHit(P.x, P.z, R, base * 1.5, 2.6);
    ring(P.x, P.z, R * .3, R, .35, col); for (let i = 0; i < 4; i++) { const a = fy + i * Math.PI / 2 + s.hn * .7; crescent(P.x, P.z, a, R * .8, rand(-.3, .3), col); }
    burst(P.x, 8, P.z, 24, col, 110, .35, 8, .4); G.shake = Math.max(G.shake, 2.5); if (n) { G.slow = Math.max(G.slow, .05); sfx.slash(); } return;
  }
  // 내려찍기(도끼·해머·대검): 앞쪽 좁고 길게, 땅이 갈라진다
  const R = 56, x1 = P.x + fx * 24, z1 = P.z + fz * 24; let n = 0;
  for (const e of E) { if (e.dead || e.ally) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d > R + e.T.r || (d > 8 && (dx * fx + dz * fz) / d < .55)) continue; dealDmg(e, base * 3, dx / (d || 1), dz / (d || 1), 3); applySt(e, 'stun', .5); n++; }
  areaHit(x1, z1, 20, base * 1.2, 2, .4); ring(x1, z1, 4, 30, .35, col); mark(x1, z1, 16, 0x0e0805, 'scorch', 6, .6); burst(x1, 3, z1, 30, 0xffd27a, 100, .45, 10, .3); xfBoom(x1, z1, 'grunt', 9, 'emp');
  G.shake = Math.max(G.shake, 5); G.hstop = Math.max(G.hstop || 0, .06); if (n) sfx.boom();
}

// ── 미사일 엔진(ASCEND '수직 발사' 비행을 이 전장 크기에 맞춰 줄임) ──
// 포드에서 곧장 솟아 추력을 모으고 → 기수를 꺾어 느슨한 곡선으로 쫓고 → 마지막 구간에서 가장 빠르다
const MP = { climb: .42, v0: 29, vClimb: 95, vmax: 290, vEnd: 365, endR: 120, acc: 450, turn: 3, turnUp: 9, wob: .5, wf: 6.5, life: 4.5 };
function launchSalvo(n, dmg) {
  if (MSW) return engineSalvo(n, dmg);
  const base = P.pod || { x: P.x, y: 22, z: P.z }, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const near = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 175 * 175).sort((a, b) => ((a.x - P.x) ** 2 + (a.z - P.z) ** 2) - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2)).slice(0, n * 3);
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
function mslClear() { if (!MSW) return; const W = window.G; W.over = true; W.t = 1e9; try { window.step(0); } catch (e) { } W.over = false; W.t = 0; ME_U.slow = 0; }
function mslHurt(u, amt, src, ang, dt) {
  if (!u || !(amt > 0)) return;
  if (u === ME_U) {
    if (P.alt > 10 || G.state !== 'play') return;            // 날고 있으면 밑에서 터져도 안 맞는다
    if (dt === 'x') { if (P.inv > 0 || P.bar > 0) return; P.hp -= amt * .35 * (.3 + .7 * EZ()); if (Math.random() < .3) num(P.x, 20, P.z, '-' + Math.max(1, Math.round(amt * .35 * (.3 + .7 * EZ()))), '#9be05a', 14); if (P.hp <= 0) { P.hp = 0; endRun(false); } return; }
    hurtPlayer(amt); return;
  }
  const e = u.ref; if (!e || e.dead) return; const a = ang || 0; dealDmg(e, amt, Math.cos(a), Math.sin(a), 1.3);
}
function engineSalvo(n, dmg) {
  const base = P.pod || { x: P.x, y: 22 + P.alt, z: P.z }, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const near = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 175 * 175).sort((a, b) => ((a.x - P.x) ** 2 + (a.z - P.z) ** 2) - ((b.x - P.x) ** 2 + (b.z - P.z) ** 2)).slice(0, n * 3);
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
  if (P.dodge && Math.random() < P.dodge) { P.inv = .25; num(P.x, 24 + P.alt, P.z, '회피', '#fff3b0', 15); flare(P.x, 12 + P.alt, P.z, 0xfff3b0, 14, .15); return; }
  d = Math.round(d * (1 + .2 * (G.threat - 1)) * (P.taken || 1) * (.3 + .7 * EZ()));
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
      if (e.dead || e.ally) continue; const dx = e.x - s.x, dz = e.z - s.z, rr = e.T.r + (s.kind === 'w' ? 5 : 2);
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
  v *= 1 + Math.min(.5, (G.combo || 0) / 200);
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
      if (p.kind === 'heal') { const hv = Math.round(30 * (P.healK || 1)); P.hp = Math.min(P.maxHp, P.hp + hv); num(P.x, 24, P.z, '+' + hv, '#7dff9a', 18); tone(520, 1040, .2, 'sine', .12); }
      else { G.pend++; G.chest = true; }
    }
  }
  picks = picks.filter((p) => !p.dead);
}

// ───────── 강화 선택 ─────────
let cardKeys = [];
function buildCards() {
  const pool = Object.keys(UP).filter((k) => P.w[k] < UP[k].max);
  cardKeys = [];
  while (cardKeys.length < 3 && pool.length) {
    let tot = 0; const wts = pool.map((k) => (tot += (P.w[k] > 0 ? 1.7 : 1) * (UP[k].kind === 'w' ? 1.25 : 1)));
    const r = Math.random() * tot, i = wts.findIndex((w) => r < w); cardKeys.push(pool.splice(i, 1)[0]);
  }
  if (!cardKeys.length) cardKeys = ['_heal'];
  { const ek = Object.keys(EVO).filter((k) => P.w[k] >= UP[k].max && P.w[EVO[k].need] > 0 && !(P.evo && P.evo[k])); if (ek.length) cardKeys[0] = '_evo_' + ek[0]; }
  const box = $('#cards'); box.innerHTML = '';
  const hi = (s) => s.replace(/([+−-]?\d+(?:\.\d+)?%?)/g, '<em>$1</em>');
  cardKeys.forEach((k, i) => {
    if (k.startsWith('_evo_')) { const ek = k.slice(5), X = EVO[ek], b = document.createElement('button'); b.className = 'card evo'; b.style.setProperty('--rc', '#ff5a7a'); b.style.setProperty('--rg', '#ff5a7a88');
      b.innerHTML = `<span class="tag">무기 진화</span><div class="med">${ico2(ek === 'rifle' ? PRIM : ek, '#ff9ab0')}</div><div class="nm">${X.nm}</div><div class="pips"></div><div class="ds">${hi(X.ds)}</div><kbd>${i + 1}</kbd>`; b.addEventListener('click', () => pickCard(i)); box.appendChild(b); return; }
    const u = UP[k], lv = k === '_heal' ? 0 : P.w[k], b = document.createElement('button'); b.className = 'card';
    const an = k === 'rifle' && ARM_NAME[PRIM], nm = k === '_heal' ? '긴급 수리' : an ? an.nm : u.nm;
    const ds = k === '_heal' ? '내구 40 회복' : (an && lv === 0 ? an.ds0 : u.ds[Math.min(lv, u.ds.length - 1)] + (an && ARM === 'katana' && /탄/.test(u.ds[Math.min(lv, u.ds.length - 1)]) ? ' (검기 +1)' : ''));
    const last = u && lv + 1 === u.max, col = k === '_heal' ? '#7dff9a' : last ? '#ff5a7a' : lv === 0 ? '#ffcf5a' : u.kind === 'w' ? '#5fe3ff' : '#b67bff';
    const tag = k === '_heal' ? '회복' : last ? '최종 강화' : lv === 0 ? (u.kind === 'w' ? '새 무기' : '새 장비') : u.kind === 'w' ? '무기 강화' : '장비 강화';
    b.style.setProperty('--rc', col); b.style.setProperty('--rg', col + '88');
    b.innerHTML = `<span class="tag">${tag}</span><div class="med">${ico2(k === 'rifle' ? PRIM : k, col)}</div><div class="nm">${nm}</div>`
      + (u ? `<div class="pips">${Array.from({ length: u.max }, (_, j) => `<i class="${j < lv ? 'on' : j === lv ? 'nx' : ''}"></i>`).join('')}</div>` : '<div class="pips"></div>')
      + `<div class="ds">${hi(ds)}</div><kbd>${i + 1}</kbd>`;
    b.addEventListener('click', () => pickCard(i)); box.appendChild(b);
  });
  $('#reroll').innerHTML = `${ico('reroll')} 다시 뽑기 (${P.rr || 0})`; $('#reroll').disabled = !(P.rr > 0); $('#reroll').style.opacity = P.rr > 0 ? 1 : .4;
}
function openLevelUp() {
  $('#lvlT').textContent = G.chest ? '전리품' : 'LEVEL UP';
  $('#lvlS').textContent = G.chest ? '보스의 잔해에서 강화를 얻었습니다' : `레벨 ${P.lvl} · 강화 하나를 고르세요`;
  G.chest = false; buildCards();
  G.state = 'levelup'; $('#lvl').classList.remove('hide'); sfx.lvl(); keys.clear(); stickEnd({ pointerId: stick.id });
}
$('#reroll').addEventListener('click', () => { if (G.state !== 'levelup' || !(P.rr > 0)) return; P.rr--; buildCards(); tone(600, 900, .12, 'triangle', .06); });
function pickCard(i) {
  const k = cardKeys[i]; if (!k || G.state !== 'levelup') return;
  if (k.startsWith('_evo_')) { const ek = k.slice(5); P.evo[ek] = 1; banner(`무기 진화 · ${EVO[ek].nm}`, 2200); screenFlash('#ff5a7a', .3, .7); ring(P.x, P.z, 6, 130, .6, 0xff5a7a); G.hstop = .12; tone(440, 1320, .4, 'triangle', .12); }
  else if (k === '_heal') P.hp = Math.min(P.maxHp, P.hp + 40);
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
  $('#slots').innerHTML = Object.keys(UP).filter((k) => P.w[k] > 0).map((k) => { const u = UP[k], nm = k === 'rifle' && ARM_NAME[PRIM] ? ARM_NAME[PRIM].nm : u.nm;
    return `<div class="slot ${u.kind === 'w' ? 'w' : ''} ${P.evo && P.evo[k] ? 'evo' : ''}" title="${nm} Lv ${P.w[k]}">${ico2(k === 'rifle' ? PRIM : k, u.kind === 'w' ? '#ffd98a' : '#9ff3ff')}<u>${Array.from({ length: u.max }, (_, i) => `<i class="${i < P.w[k] ? 'on' : ''}"></i>`).join('')}</u></div>`; }).join('');
}
function drawBuild() {
  const m = MECH(save.mech);
  $('#build').innerHTML = `<div style="grid-column:1/3"><img src="img/${m.id}.jpg?v=15" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:cover"><span><b>${m.nm} · Lv ${P.lvl}</b><small>${stLabel(G.chi)} · ${CHAPTERS[G.chi].nm} · 남은 시간 ${fmt(Math.max(0, RUN_TIME - G.t))}</small></span></div>`
    + Object.keys(UP).filter((k) => P.w[k] > 0).map((k) => { const u = UP[k], an = k === 'rifle' && ARM_NAME[PRIM], lv = P.w[k];
      return `<div>${ico(k === 'rifle' ? PRIM : k)}<span><b>${an ? an.nm : u.nm} Lv ${lv}/${u.max}</b><small>${an && lv === 1 ? an.ds0 : u.ds[Math.min(lv - 1, u.ds.length - 1)]}</small></span></div>`; }).join('');
}



// ───────── 적 ─────────
function spawn(type, x, z) {
  const T = ET[type]; let n = 0; for (const e of E) if (e.t === type) n++;
  if (n >= T.max) return null;
  const tm = Math.min(G.t, RUN_TIME) / 60, hs = (1 + .5 * tm + .13 * tm * tm) * (1 + .35 * (G.threat - 1));
  const e = { t: type, T, x, z, vx: 0, vz: 0, kx: 0, kz: 0, yaw: 0, hp: T.hp * (T.r > 10 ? 1 + .35 * (G.threat - 1) : hs), flash: 0, bladeT: 0,
    st: 'move', tm: rand(1, 3), ph: rand(0, 6), sc: 1, born: .35, sm: (1 + .05 * tm) * rand(.92, 1.1) };
  e.hp *= T.r > 10 ? (.85 + .15 * EZ()) * (T.boss || type === 'queen' ? 1.25 + .55 * EZ() : 1) : EZ(); e.max = e.hp; if (G.mis && G.mis.tgt && !T.fly && !T.boss && !T.virt && T.dmg > 0 && type !== 'bane' && Math.random() < (G.mis.tgtP || .4)) e.tgo = 1;
  E.push(e); return e;
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
  const t = G.t + (CH().early || 0), w = [['ling', 6]];
  if (t > 35) w.push(['roach', 1.5]); if (t > 75) w.push(['bane', 1.5]); if (t > 120) w.push(['plasma', 1.1]); if (t > 165) w.push(['lurk', 1]);
  if (t > 20) w.push(['trooper', 1.3]); if (t > 60) w.push(['wing', 1.1]); if (t > 90) w.push(['robo', 1.2]); if (t > 125) w.push(['spit', .9]);
  if (t > 140) w.push(['jet', .22]); if (t > 195) w.push(['heli', .18]); if (t > 40) w.push(['aat', .8]); if (t > 110) w.push(['aagun', .3]);
  const mix = CH().mix || {}; for (const a of w) a[1] *= mix[a[0]] ?? 1;
  let tot = 0; for (const a of w) tot += a[1]; let r = Math.random() * tot;
  for (const a of w) { if ((r -= a[1]) < 0) return a[0]; } return 'ling';
}
function banner(txt, ms = 2200) { const b = $('#banner'); b.textContent = txt; b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), ms); }

const EVENTS = [
  [55, () => { banner('무리 습격'); sfx.warn(); swarm(22); }],
  [95, () => midBoss(CH().mids[0])],
  [135, () => { banner('거대 개체 접근'); sfx.warn(); const [x, z] = spawnPos(170, 190); spawn('behemoth', x, z); }],
  [150, () => { banner('무리 습격'); sfx.warn(); swarm(30); }],
  [175, () => midBoss(CH().mids[1])],
  [210, () => { banner('거대 개체 접근'); sfx.warn(); for (let i = 0; i < 2; i++) { const [x, z] = spawnPos(170, 190); spawn('behemoth', x, z); } }],
  [235, () => midBoss(CH().mids[2])],
  [262, () => { banner('무리 습격'); sfx.warn(); swarm(38); }],
  [RUN_TIME, () => { if (!(G.mis && G.mis.obj)) spawnFinal(); }],
];
function spawnFinal() {
  if (G.bossOn || G.won) return; G.finalT = G.t; const bk = CH().boss;
  const [x, z] = spawnPos(150, 170);
  if (bk && ET[bk]) {
    banner(`결전 · ${ET[bk].boss}`, 3000); sfx.warn(); screenFlash('#c9a8ff', .3, .8);
    const e = spawn(bk, x, z); G.boss = e;
    if (e && ET[bk].virt) loadBossVis(bk).then((v) => { if (!e.dead && G.state !== 'over') { e.vis = v; scene.add(v.wrap); G.visOn = v; } }).catch(() => { });
  } else {
    banner('여왕 출현', 3000); sfx.warn(); G.boss = spawn('queen', x, z);
    if (CH().twin) { const [x2, z2] = spawnPos(150, 170), b2 = spawn('brood', x2, z2); if (b2) G.mid = b2; }
  }
  G.bossOn = true; $('#boss').classList.remove('hide'); G.shake = 5;
}
// ───────── 적 기체 보스: 우리 기체 모델에 알파의 빛깔을 입혀 공중에 떠서 싸운다
const MB = {
  mb_guard: { mdl: 'm_wizard', pats: ['volley', 'lance', 'pillars'] },
  mb_honor: { mdl: 'm_wizard', pats: ['volley', 'lance', 'pillars', 'summon'] },
  mb_heavy: { mdl: 'm_titan', pats: ['barrage2', 'volley', 'summon'] },
  mb_core: { mdl: 'm_origin', pats: ['volley', 'pillars', 'lance', 'nova'] },
  mb_seraphine: { mdl: 'mech_leg', pats: ['volley', 'lance', 'pillars', 'summon', 'nova'] },
};
const MBV = {};
function loadBossVis(k) {
  if (MBV[k]) return MBV[k];
  const T = ET[k], col = new THREE.Color(T.col);
  return (MBV[k] = gltfL.loadAsync(`models/${MB[k].mdl}.glb`).then((gl) => {
    const s = gl.scene; s.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(s), hh = bb.max.y - bb.min.y; if (hh > 0) s.scale.multiplyScalar(T.h / hh);
    s.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; const m = o.material; m.metalness = Math.min(m.metalness ?? 0, .2); m.roughness = Math.max(m.roughness ?? 1, .5); m.metalnessMap = null; m.emissive = col.clone(); m.emissiveMap = m.map || null; m.emissiveIntensity = .85; m.color = col.clone().multiplyScalar(1.35); m.needsUpdate = true; } });
    const inner = new THREE.Group(); inner.add(s); inner.rotation.y = -Math.PI / 2; const wrap = new THREE.Group(); wrap.add(inner);
    const aura = new THREE.Mesh(new THREE.RingGeometry(8, 11, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: T.col, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); aura.position.y = -1.5; wrap.add(aura);
    const mixer = new THREE.AnimationMixer(s), clip = gl.animations.find((c) => /hover|fly/i.test(c.name)) || gl.animations.find((c) => /idle/i.test(c.name)) || gl.animations[0];
    if (clip) mixer.clipAction(clip).play();
    return { wrap, mixer, aura };
  }).catch((e) => { delete MBV[k]; throw e; }));
}
function dropBossVis(e) { if (e.vis) { if (G.visOn === e.vis) G.visOn = null; scene.remove(e.vis.wrap); e.vis = null; } }
function syncBossVis(dt) {
  for (const e of E) {
    if (e.groggy > 0) { e.groggy -= dt; if (Math.random() < .25) burst(e.x, e.T.h + 2, e.z, 2, 0xffd166, 30, .4, 8); }
    if (!e.vis) continue; const v = e.vis;
    if (e.T.stat) { v.wrap.position.set(e.x, 0, e.z); continue; }
    v.wrap.position.set(e.x, 3 + Math.sin(e.ph * 2) * 1.4, e.z); v.wrap.rotation.y = e.yaw; if (v.mixer) v.mixer.update(dt);
    v.wrap.scale.setScalar(e.flash > 0 ? 1.06 : 1); if (v.aura) v.aura.rotation.y += dt * 1.5;
  }
}
// ───────── 손맛: 콤보 · 완벽 회피
function comboKill(e) {
  G.combo = (G.combo || 0) + 1; G.comboT = 2.4; G.st.maxCombo = Math.max(G.st.maxCombo || 0, G.combo); const c = G.combo;
  if (c === 25 || c === 50 || c === 100 || c === 200 || (c > 200 && c % 200 === 0)) {
    const nm = c >= 200 ? '전설의 학살' : c >= 100 ? '폭풍' : c >= 50 ? '광란' : '연쇄';
    banner(`${nm} · ${c} 콤보`, 1400); P.ult = Math.min(100, P.ult + (c >= 100 ? 30 : 15)); P.hp = Math.min(P.maxHp, P.hp + P.maxHp * (c >= 100 ? .12 : .06));
    ring(P.x, P.z, 6, 90, .5, 0xffd166); screenFlash('#ffd166', .18, .4); tone(660, 1320, .25, 'triangle', .1);
  }
}
function updCombo(dt) { G.hsCd = (G.hsCd || 0) - dt; G.pdCd = (G.pdCd || 0) - dt; if (G.combo > 0 && (G.comboT -= dt) <= 0) G.combo = 0; }
function checkPerfectDodge() {
  if ((G.pdCd || 0) > 0) return; let hit = 0;
  for (let i = ebs.length - 1; i >= 0; i--) { const b = ebs[i], dx = P.x - b.x, dz = P.z - b.z; if (dx * dx + dz * dz < 36 * 36 && b.vx * dx + b.vz * dz > 0) { hit++; burst(b.x, 6, b.z, 4, 0xbff6ff, 40, .3, 6); ebs.splice(i, 1); } }
  if (!hit) for (const e of E) { if (e.dead) continue; if ((e.st === 'dash' || e.st === 'ldash' || e.st === 'charge' || e.st === 'fuse') && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 55 * 55) { hit++; break; } }
  if (!hit) return;
  G.pdCd = 2.5; G.slow = Math.max(G.slow, .55); P.inv = Math.max(P.inv, .6); P.ult = Math.min(100, P.ult + 6); G.st.pd = (G.st.pd || 0) + 1;
  num(P.x, 26, P.z, '완벽 회피!', '#bff6ff', 22); ring(P.x, P.z, 4, 46, .45, 0xbff6ff); flare(P.x, 10, P.z, 0xbff6ff, 26, .2); tone(1200, 2400, .18, 'sine', .1);
}
// ───────── 장소별 땅: 모래(원래 땅) · 도시 · 금속 갑판 · 용암 · 설원 · 공허 · 잿빛 폐허 · 하이브
const THEME_OF = ['sand', 'city', 'sand', 'city', 'deck', 'deck', 'deck', 'deck', 'lava', 'lava', 'lava', 'lava', 'snow', 'snow', 'snow', 'snow', 'void', 'void', 'void', 'void', 'hive', 'hive', 'hive', 'hive',
  'void', 'void', 'void', 'void', 'deck', 'deck', 'deck', 'deck', 'ash', 'ash', 'ash', 'ash', 'ash', 'ash', 'ash', 'ash', 'deck', 'deck', 'deck', 'deck', 'void', 'void', 'void', 'void'];
const THEME_NM = { sand: '사막', city: '도시', deck: '금속 갑판', lava: '용암', snow: '설원', void: '공허', ash: '잿빛 폐허', hive: '하이브' };
const THEME_HZ = { lava: '용암 웅덩이 · 들어가면 불타지만 적도 불탄다', snow: '얼음판 · 위에서는 빨라지고 적은 미끄러져 느려진다', deck: '전기 장판 · 노랗게 깜빡이면 피하라, 적도 감전된다', void: '중력 소용돌이 · 끌려 들어간 적이 부서진다', hive: '산성 웅덩이 · 밟으면 녹는다', city: '폭발 드럼통 · 쏘면 터져 주변 적을 날린다', ash: '잿빛 폭풍 · 때때로 시야가 확 줄어든다' };
const _thTex = {}; let _sandMap = null; const DECOR = {};
function cvs(S, f) { const c = document.createElement('canvas'); c.width = c.height = S; f(c.getContext('2d'), S); return c; }
function rr(a, b) { return a + Math.random() * (b - a); }
function speck(x, S, n, cols, sz = 2) { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; const s = rr(1, sz); x.fillRect(rr(0, S), rr(0, S), s, s); } }
function blobs(x, S, n, rgb, r0, r1, a) { for (let i = 0; i < n; i++) { const X = rr(0, S), Y = rr(0, S), R = rr(r0, r1), gr = x.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(X - R, Y - R, R * 2, R * 2); } }
function cracks(x, S, n, col, w, segs = 8, step = 40, blur = 0) { x.save(); x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; if (blur) { x.shadowColor = col; x.shadowBlur = blur; }
  for (let i = 0; i < n; i++) { let X = rr(0, S), Y = rr(0, S); x.beginPath(); x.moveTo(X, Y); for (let j = 0; j < segs; j++) { X += rr(-step, step); Y += rr(-step, step); x.lineTo(X, Y); } x.stroke(); } x.restore(); }
function themeTex(th) {
  if (_thTex[th]) return _thTex[th];
  const S = 512; let base, glow = null, gi = 1;
  if (th === 'city') base = cvs(S, (x) => { x.fillStyle = '#3c3e44'; x.fillRect(0, 0, S, S); speck(x, S, 9000, ['#46484e', '#33353a', '#50525a']); blobs(x, S, 12, '18,18,22', 20, 70, .35);
    x.strokeStyle = '#26282d'; x.lineWidth = 4; for (let i = 0; i <= S; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
    x.fillStyle = '#d8c35a'; for (let y = 16; y < S; y += 64) x.fillRect(252, y, 6, 34); x.fillStyle = 'rgba(235,235,235,.55)'; for (let i = 0; i < 7; i++) x.fillRect(140 + i * 16, 380, 9, 56);
    cracks(x, S, 12, 'rgba(14,14,18,.6)', 1.6); x.strokeStyle = 'rgba(20,20,24,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(90, 90, 14, 0, TAU); x.stroke(); });
  if (th === 'deck') { base = cvs(S, (x) => { x.fillStyle = '#5c6472'; x.fillRect(0, 0, S, S); speck(x, S, 6000, ['#646c7a', '#535a66', '#6a7280'], 2);
      for (let X = 0; X < S; X += 128) for (let Y = 0; Y < S; Y += 128) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(X + 3, Y + 3, 122, 3); x.fillRect(X + 3, Y + 3, 3, 122); x.fillStyle = 'rgba(0,0,0,.32)'; x.fillRect(X + 3, Y + 122, 122, 3); x.fillRect(X + 122, Y + 3, 3, 122);
        x.fillStyle = '#3a404a'; for (const [a, b] of [[10, 10], [114, 10], [10, 114], [114, 114]]) { x.beginPath(); x.arc(X + a, Y + b, 3.2, 0, TAU); x.fill(); } }
      x.save(); x.beginPath(); x.rect(0, 256, 128, 128); x.clip(); for (let i = -128; i < 256; i += 22) { x.fillStyle = (i / 22) % 2 ? '#e8b830' : '#1c1c1c'; x.beginPath(); x.moveTo(i, 256); x.lineTo(i + 11, 256); x.lineTo(i + 139, 384); x.lineTo(i + 128, 384); x.fill(); } x.restore();
      blobs(x, S, 8, '20,18,16', 14, 40, .3); });
    glow = cvs(S, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.strokeStyle = '#3fd8ff'; x.lineWidth = 2; x.shadowColor = '#3fd8ff'; x.shadowBlur = 6; for (const y of [128, 384]) { x.beginPath(); x.moveTo(0, y); x.lineTo(S, y); x.stroke(); } }); gi = .7; }
  if (th === 'lava') { const cr = []; for (let i = 0; i < 16; i++) { let X = rr(0, S), Y = rr(0, S); const pts = [[X, Y]]; for (let j = 0; j < 9; j++) { X += rr(-46, 46); Y += rr(-46, 46); pts.push([X, Y]); } cr.push(pts); }
    const draw = (x, col, w, blur) => { x.save(); x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.shadowColor = col; x.shadowBlur = blur; for (const p of cr) { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (const q of p) x.lineTo(q[0], q[1]); x.stroke(); } x.restore(); };
    base = cvs(S, (x) => { x.fillStyle = '#2b1c18'; x.fillRect(0, 0, S, S); speck(x, S, 9000, ['#33221d', '#21150f', '#3d2a22'], 3); blobs(x, S, 14, '10,6,4', 20, 70, .45); draw(x, '#8a2a08', 5, 0); draw(x, '#ff7a1a', 2, 0); });
    glow = cvs(S, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); draw(x, '#ff5a10', 6, 14); draw(x, '#ffd060', 2, 6); }); gi = 1.4; }
  if (th === 'snow') base = cvs(S, (x) => { x.fillStyle = '#dde7f1'; x.fillRect(0, 0, S, S); blobs(x, S, 22, '170,190,215', 30, 90, .35); blobs(x, S, 10, '190,225,250', 30, 80, .6); speck(x, S, 4000, ['#ffffff', '#c8d4e2'], 2);
    x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1.2; for (let i = 0; i < 40; i++) { const X = rr(0, S), Y = rr(0, S); x.beginPath(); x.moveTo(X, Y); x.lineTo(X + rr(30, 80), Y + rr(-6, 6)); x.stroke(); } });
  if (th === 'void') { base = cvs(S, (x) => { x.fillStyle = '#140b26'; x.fillRect(0, 0, S, S); blobs(x, S, 16, '90,40,160', 30, 110, .35); blobs(x, S, 10, '30,10,60', 30, 90, .5); speck(x, S, 1600, ['#ffffff', '#c9a8ff', '#7fb8ff'], 2); });
    glow = cvs(S, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.strokeStyle = 'rgba(170,110,255,.32)'; x.lineWidth = 1.2; x.shadowColor = '#a06aff'; x.shadowBlur = 8; for (let i = 0; i <= S; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
      x.strokeStyle = 'rgba(216,184,255,.35)'; x.lineWidth = 1.5; for (let i = 0; i < 2; i++) { x.beginPath(); x.arc(rr(40, S - 40), rr(40, S - 40), rr(10, 22), 0, TAU); x.stroke(); } speck(x, S, 300, ['#ffffff', '#d8b8ff'], 2); }); gi = 1.1; }
  if (th === 'ash') { base = cvs(S, (x) => { x.fillStyle = '#6a6567'; x.fillRect(0, 0, S, S); speck(x, S, 9000, ['#77716f', '#5a5557', '#837d7b'], 3); blobs(x, S, 16, '30,26,28', 20, 70, .4);
      x.strokeStyle = 'rgba(40,36,38,.55)'; x.lineWidth = 2; for (let i = 0; i < 14; i++) { const X = rr(0, S), Y = rr(0, S), s = rr(30, 70); x.save(); x.translate(X, Y); x.rotate(rr(0, 1.5)); x.strokeRect(-s / 2, -s / 2, s, s); x.restore(); } cracks(x, S, 10, 'rgba(25,22,24,.6)', 1.5); });
    glow = cvs(S, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); speck(x, S, 260, ['#ff7a2a', '#ffb04a'], 3); }); gi = 1.2; }
  if (th === 'hive') { base = cvs(S, (x) => { x.fillStyle = '#3e2632'; x.fillRect(0, 0, S, S); for (let i = 0; i < 70; i++) { const X = rr(0, S), Y = rr(0, S), R = rr(14, 40); x.fillStyle = `rgba(${rr(80, 120) | 0},${rr(40, 60) | 0},${rr(60, 90) | 0},.55)`; x.beginPath(); x.ellipse(X, Y, R, R * rr(.6, 1), rr(0, 3), 0, TAU); x.fill(); x.strokeStyle = 'rgba(20,8,14,.6)'; x.lineWidth = 2.5; x.stroke(); } speck(x, S, 3000, ['#5a3646', '#2a161e'], 2); });
    glow = cvs(S, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, S, S); cracks(x, S, 5, '#c03aff', 1.6, 8, 26, 8); cracks(x, S, 2, '#7aff5a', 1.2, 6, 24, 6); }); gi = .45; }
  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 9); t.anisotropy = 4; return t; };
  return (_thTex[th] = { map: mk(base), glow: glow ? mk(glow) : null, gi });
}
function applyTheme(th, gc) {
  if (!terrainMat) return; _sandMap ??= terrainMat.map;
  if (!th || th === 'sand') { terrainMat.map = _sandMap; terrainMat.emissiveMap = null; terrainMat.emissive.setRGB(0, 0, 0); terrainMat.color.setRGB(gc[0], gc[1], gc[2]); }
  else { const T = themeTex(th); terrainMat.map = T.map; terrainMat.emissiveMap = T.glow; terrainMat.emissive.setRGB(T.glow ? 1 : 0, T.glow ? 1 : 0, T.glow ? 1 : 0); terrainMat.emissiveIntensity = T.gi; terrainMat.color.setRGB(lerp(1, gc[0], .3), lerp(1, gc[1], .3), lerp(1, gc[2], .3)); }
  terrainMat.needsUpdate = true;
  if (th && th !== 'sand' && !DECOR[th]) DECOR[th] = buildDecor(th);
  for (const k in DECOR) DECOR[k].visible = k === th;
}
function windowTex() { const c = cvs(128, (x) => { x.fillStyle = '#1a1d24'; x.fillRect(0, 0, 128, 128); for (let X = 8; X < 128; X += 20) for (let Y = 8; Y < 128; Y += 18) { x.fillStyle = Math.random() < .35 ? '#ffd98a' : Math.random() < .3 ? '#7fb8ff' : '#262a34'; x.fillRect(X, Y, 11, 10); } }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 4); return t; }
function buildDecor(th) {
  const grp = new THREE.Group(); grp.userData.spin = [];
  const put = (m, r0, r1, y = 0) => { const a = rr(0, TAU), r = rr(r0, r1); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.y = rr(0, TAU); grp.add(m); return m; };
  const lam = (c, e = 0, ei = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e, emissiveIntensity: ei });
  if (th === 'city') { const wt = windowTex(); for (let i = 0; i < 34; i++) { const w = rr(18, 38), hh = rr(40, 140), d = rr(18, 38); put(new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), new THREE.MeshLambertMaterial({ color: 0x9aa0aa, map: wt, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: .8 })), 252, 370, hh / 2 - 2); } }
  if (th === 'deck') { for (let i = 0; i < 18; i++) { const hh = rr(40, 95), p = put(new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5, hh, 10), lam(0x6a7282, 0x10141a, 1)), 250, 340, hh / 2); const ring = new THREE.Mesh(new THREE.TorusGeometry(6, .8, 8, 24), new THREE.MeshBasicMaterial({ color: 0x3fd8ff, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = hh / 2 - 4; p.add(ring); }
    for (let i = 0; i < 16; i++) { const s = rr(10, 18); put(new THREE.Mesh(new THREE.BoxGeometry(s, s, s * 1.6), lam(i % 2 ? 0xa86a2a : 0x4a5a6a)), 245, 300, s / 2); } }
  if (th === 'snow') for (let i = 0; i < 40; i++) { const hh = rr(18, 70); put(new THREE.Mesh(new THREE.ConeGeometry(rr(5, 13), hh, 6), lam(0xd8eeff, 0x5fa8ff, .3)), 240, 330, hh / 2 - 1); }
  if (th === 'lava') for (let i = 0; i < 18; i++) { const s = rr(10, 24), m = put(new THREE.Mesh(new THREE.DodecahedronGeometry(s), lam(0x2a1a14, 0xff4a10, .35)), 245, 330, s * .4); m.scale.y = rr(.5, 1.2); }
  if (th === 'void') for (let i = 0; i < 28; i++) { const m = put(new THREE.Mesh(new THREE.OctahedronGeometry(rr(4, 11)), new THREE.MeshLambertMaterial({ color: 0x9a6aff, emissive: 0x7a3aff, emissiveIntensity: .9 })), 240, 370, rr(18, 75)); m.scale.y = 1.7; grp.userData.spin.push(m); }
  if (th === 'ash') for (let i = 0; i < 22; i++) { const hh = rr(15, 50), m = put(new THREE.Mesh(new THREE.CylinderGeometry(rr(4, 7), rr(5, 8), hh, 10), lam(0x8a8486)), 242, 330, hh / 2 - 2); m.rotation.z = rr(-.3, .3); }
  if (th === 'hive') for (let i = 0; i < 22; i++) { const hh = rr(30, 85); put(new THREE.Mesh(new THREE.ConeGeometry(rr(6, 13), hh, 7), lam(0x5a3048, 0xff3a9a, .3)), 242, 330, hh / 2 - 2); }
  scene.add(grp); return grp;
}
// 위험 요소(전장 안): 용암·얼음·전기 장판·중력 소용돌이·산성·드럼통·잿빛 폭풍
let HZ = [];
function poolTex(a, b, c) { const t = new THREE.CanvasTexture(cvs(256, (x) => { const gr = x.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, a); gr.addColorStop(.65, b); gr.addColorStop(.92, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); speck(x, 256, 300, ['rgba(255,255,255,.25)'], 3); })); t.colorSpace = THREE.SRGBColorSpace; return t; }
function hzMesh(k, r) {
  const grp = new THREE.Group();
  if (k === 'elec') { const t = new THREE.CanvasTexture(cvs(128, (x) => { x.fillStyle = '#0c1420'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#9fe8ff'; x.lineWidth = 3; for (let i = 4; i < 128; i += 20) { x.strokeRect(i, i, 128 - i * 2, 128 - i * 2); } }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: t, color: 0x2a3a5a, transparent: true, opacity: .92, toneMapped: false })); m.position.y = .3; grp.add(m); grp.userData.m = m; }
  else if (k === 'well') { const disk = new THREE.Mesh(new THREE.CircleGeometry(15, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x08020f })); disk.position.y = .3; grp.add(disk);
    for (const [a, b, o] of [[18, 21, .9], [40, 42, .5], [66, 68, .3]]) { const rg = new THREE.Mesh(new THREE.RingGeometry(a, b, 48, 1, 0, Math.PI * 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb07aff, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); rg.position.y = .35; grp.add(rg); }
    grp.userData.spin = true; }
  else { const T = k === 'lava' ? poolTex('#fff0a0', '#ff7a1a', '#7a1a04') : k === 'acid' ? poolTex('#e8ffb0', '#6aff3a', '#1a5a10') : poolTex('rgba(255,255,255,.9)', 'rgba(190,230,255,.75)', 'rgba(140,200,240,.5)');
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: T, transparent: true, depthWrite: false, toneMapped: k !== 'lava' })); m.position.y = .28; grp.add(m); grp.userData.m = m; }
  scene.add(grp); return grp;
}
function barrelVis() { const grp = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 7, 14), new THREE.MeshLambertMaterial({ color: 0xc83a1a, emissive: 0x4a0a00, emissiveIntensity: 1 })); body.position.y = 3.5; grp.add(body);
  for (const y of [1.6, 5.4]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, .7, 14), new THREE.MeshLambertMaterial({ color: 0xffd040, emissive: 0x6a4a00, emissiveIntensity: 1 })); b.position.y = y; grp.add(b); } return { wrap: grp, mixer: null, aura: null }; }
function clearHazards() { for (const z of HZ) if (z.mesh) scene.remove(z.mesh); HZ = []; for (const e of E) if (e.vis && e.T.stat) scene.remove(e.vis.wrap); if (G.storm > 0) { G.storm = 0; scene.fog.near = G.fogN ?? scene.fog.near; scene.fog.far = G.fogF ?? scene.fog.far; } }
function initHazards(th) {
  clearHazards(); G.ashT = 32;
  const spots = (n, r0, r1, minD = 70) => { const out = []; for (let k = 0; k < n * 30 && out.length < n; k++) { const a = rr(0, TAU), r = rr(r0, r1), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - P.x, z - P.z) < 55) continue; if (out.some((o) => Math.hypot(o[0] - x, o[1] - z) < minD)) continue; out.push([x, z]); } return out; };
  const add = (k, x, z, r, extra = {}) => { const o = { k, x, z, r, ph: rr(0, 5), tk: 0, ...extra }; o.mesh = hzMesh(k, r); o.mesh.position.set(x, 0, z); HZ.push(o); };
  if (th === 'lava') for (const [x, z] of spots(5, 50, 195)) add('lava', x, z, rr(18, 26));
  if (th === 'snow') for (const [x, z] of spots(5, 40, 195)) add('ice', x, z, rr(30, 40));
  if (th === 'deck') for (const [x, z] of spots(5, 50, 190, 60)) add('elec', x, z, 22);
  if (th === 'void') for (const [x, z] of spots(2, 70, 160, 140)) add('well', x, z, 72);
  if (th === 'hive') for (const [x, z] of spots(5, 50, 195)) add('acid', x, z, rr(16, 24));
  if (th === 'city') for (const [x, z] of spots(12, 40, 200, 34)) { const e = spawn('barrel', x, z); if (e) { e.vis = barrelVis(); scene.add(e.vis.wrap); e.vis.wrap.position.set(x, 0, z); } }
}
function dealEnv(e, dmg) { if (e.dead || e.T.virt && !e.T.stat) return; e.hp -= dmg * (1 + .15 * (G.threat - 1)); e.flash = .08; if (e.hp <= 0) kill(e); }
function updHazards(dt) {
  P.iceK = 1; const onP = !P.fly && P.alt < 3;
  for (const z of HZ) {
    const dx = P.x - z.x, dz = P.z - z.z, dP = Math.hypot(dx, dz);
    z.tk -= dt;
    if (z.k === 'lava') { z.mesh.userData.m.material.opacity = .85 + Math.sin(G.t * 3 + z.ph) * .12;
      if (onP && dP < z.r && (P.burnT -= dt) <= 0) { P.burnT = .5; hurtPlayer(9); burst(P.x, 3, P.z, 5, 0xff7a2a, 40, .35, 7); }
      if (z.tk <= 0) { z.tk = .4; for (const e of E) if (!e.dead && !e.T.fly && (e.x - z.x) ** 2 + (e.z - z.z) ** 2 < z.r * z.r) { dealEnv(e, 16); if (Math.random() < .3) burst(e.x, 3, e.z, 3, 0xff7a2a, 30, .3, 6); } } }
    if (z.k === 'ice') { if (onP && dP < z.r) P.iceK = 1.3; for (const e of E) if (!e.dead && !e.T.fly && (e.x - z.x) ** 2 + (e.z - z.z) ** 2 < z.r * z.r) e.slowK = .5; }
    if (z.k === 'acid') { z.mesh.userData.m.material.opacity = .8 + Math.sin(G.t * 4 + z.ph) * .1; if (onP && dP < z.r) { P.iceK = .72; if ((P.burnT -= dt) <= 0) { P.burnT = .5; hurtPlayer(7); burst(P.x, 3, P.z, 4, 0x7aff5a, 40, .35, 7); } } }
    if (z.k === 'elec') { const c = (G.t + z.ph) % 5, m = z.mesh.userData.m.material, inside = (px, pz) => Math.abs(px - z.x) < z.r && Math.abs(pz - z.z) < z.r;
      if (c < 3.1) m.color.setHex(0x2a3a5a); else if (c < 3.9) m.color.setHex(Math.sin(G.t * 40) > 0 ? 0xffd166 : 0x3a3a2a);
      else { m.color.setHex(0xbff6ff); if (Math.random() < .5) burst(z.x + rr(-z.r, z.r), 2, z.z + rr(-z.r, z.r), 2, 0x9fe8ff, 50, .25, 6, 1.5);
        if (onP && inside(P.x, P.z) && (P.zapT -= dt) <= 0) { P.zapT = .45; hurtPlayer(12); }
        if (z.tk <= 0) { z.tk = .35; for (const e of E) if (!e.dead && !e.T.fly && inside(e.x, e.z)) dealEnv(e, 26); } } }
    if (z.k === 'well') { z.mesh.rotation.y += dt * 1.6;
      if (dP < z.r && dP > 2 && P.dashT <= 0 && !P.fly) { const k = 15 * (1 - dP / z.r) + 6; P.x -= dx / dP * k * dt; P.z -= dz / dP * k * dt; }
      for (const e of E) { if (e.dead || e.T.fly || e.T.r > 10 || e.T.stat) continue; const ex = z.x - e.x, ez = z.z - e.z, d = Math.hypot(ex, ez); if (d < z.r && d > 1) { e.x += ex / d * 42 * dt; e.z += ez / d * 42 * dt; if (d < 13 && z.tk <= 0) dealEnv(e, 14); } }
      if (z.tk <= 0) z.tk = .25; }
  }
  for (const k in DECOR) if (DECOR[k].visible) for (const m of DECOR[k].userData.spin) m.rotation.y += dt * .8;
  // 잿빛 폭풍
  if (CH().theme === 'ash' && !G.bossOn) { G.ashT -= dt;
    if (G.ashT <= 0 && !G.storm) { G.storm = 9; G.ashT = 45; banner('잿빛 폭풍', 1600); G.fogN = scene.fog.near; G.fogF = scene.fog.far; }
    if (G.storm > 0) { G.storm -= dt; scene.fog.near = lerp(scene.fog.near, 70, dt * 2); scene.fog.far = lerp(scene.fog.far, 240, dt * 2); if (Math.random() < .5) burst(P.x + rr(-90, 90), rr(10, 40), P.z + rr(-70, 70), 1, 0xffa04a, 20, 1.2, 4, .2);
      if (G.storm <= 0) { G.storm = 0; scene.fog.near = G.fogN; scene.fog.far = G.fogF; } } }
}
// ───────── 돌발 사건: 보급 낙하 · 보물 운반선 · 정예 습격 (판마다 두 번, 순서는 무작위)
function initEvents() { const ks = ['supply', 'courier', 'elite'].sort(() => Math.random() - .5); G.evq = [{ t: rr(65, 115), k: ks[0] }, { t: rr(160, 225), k: ks[1] }]; G.drops = []; }
function runEvent(k) {
  if (k === 'supply') { const a = rr(0, TAU), r = rr(60, 130); let x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; const q = Math.hypot(x, z); if (q > ARENA_R - 24) { x *= (ARENA_R - 24) / q; z *= (ARENA_R - 24) / q; }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 9), new THREE.MeshLambertMaterial({ color: 0x9a7a3a, emissive: 0xffb04a, emissiveIntensity: .5 })); mesh.position.set(x, 160, z); scene.add(mesh); misObjs.push(mesh);
    G.drops.push({ x, z, t: 0, mesh }); decal(x, z, 18, 1.6, 0xffd166); banner('보급 낙하 · 상자를 열어라', 2000); sfx.warn(); }
  if (k === 'courier') { const [x, z] = spawnPos(120, 150), e = spawn('courier', x, z); if (e) { e.flee = 1; e.life = 22; e.gold = 1; banner('보물 운반선 출현 · 22초 안에 격추하라', 2400); sfx.warn(); } }
  if (k === 'elite') { const ty = ['roach', 'robo', 'lurk', 'spit', 'trooper'][Math.random() * 5 | 0], [x, z] = spawnPos(130, 160); G.elites = 0;
    for (let i = 0; i < 3; i++) { const e = spawn(ty, x + rr(-14, 14), z + rr(-14, 14)); if (e) { e.elite = 1; e.hp = e.max = e.hp * 7; e.sc = 1.5; e.sm *= 1.12; G.elites++; } }
    banner('정예 습격 · 금빛 적을 쓰러뜨려라', 2200); sfx.warn(); }
}
function updEvents(dt) {
  if (G.evq && !G.bossOn) for (const ev of G.evq) if (!ev.done && G.t >= ev.t) { ev.done = true; runEvent(ev.k); }
  for (const e of E) if (e.flee && !e.dead && (e.life -= dt) <= 0) { e.dead = true; banner('보물 운반선을 놓쳤다', 1500); }
  for (const s of G.drops || []) { if (s.done) continue; s.t += dt; const k = Math.min(1, s.t / 1.6); s.mesh.position.set(s.x, 160 * (1 - k) ** 2 + 4.5, s.z); s.mesh.rotation.y += dt * 3;
    if (k >= 1) { s.done = true; s.mesh.visible = false; ring(s.x, s.z, 6, 40, .5, 0xffd166); burst(s.x, 6, s.z, 30, 0xffd166, 90, .5, 10); sfx.boom(); G.shake = Math.max(G.shake, 3);
      picks.push({ kind: 'chest', x: s.x, z: s.z, t: 0 }); picks.push({ kind: 'heal', x: s.x + 10, z: s.z + 4, t: 0 }); } }
}
function mechBossAI(e, dt, d, dx, dz) {
  if (e.groggy > 0) { e.mv = 0; return 0; }
  const T = e.T, toP = Math.atan2(dx, dz), rage = e.hp < e.max * .45, col = T.col, B = MB[e.t];
  e.yaw = e.st === 'ldash' ? e.ang : toP;
  if (e.st === 'move') {
    e.side = e.side || (Math.random() < .5 ? 1 : -1);
    e.mv = d > 95 ? toP : d < 55 ? toP + Math.PI : toP + e.side * Math.PI / 2;
    if (e.tm <= 0) {
      e.pat = ((e.pat ?? -1) + 1) % B.pats.length; const p = B.pats[e.pat]; e.st = p; e.cnt = 0; e.ct = 0;
      e.tm = { volley: 1.6, lance: .9, pillars: 1.7, summon: .8, nova: 1.2, barrage2: 1.8 }[p];
      if (p === 'lance') { e.ang = toP; e.dec = lineDecal(e.x, e.z, e.ang, 220, 26, .9, col); sfx.tele(); }
      if (p === 'nova') { e.dec = decal(e.x, e.z, 62, 1.2, col); sfx.tele(); }
    }
    return T.spd * (rage ? 1.25 : 1);
  }
  const done = () => { e.st = 'move'; e.tm = rage ? 1.0 : 1.7; e.dec = null; e.side = Math.random() < .5 ? 1 : -1; };
  e.ct -= dt;
  switch (e.st) {
    case 'volley':
      if (e.ct <= 0 && e.cnt < 3) { e.ct = .45; e.cnt++; const n = rage ? 9 : 7; for (let i = 0; i < n; i++) eShot(e.x, e.z, toP + (i - (n - 1) / 2) * .14, 95, 12, 3, col); flare(e.x, T.h * .6, e.z, col, 14, .08); tone(700, 300, .08, 'triangle', .05); }
      if (e.tm <= 0) done(); return 0;
    case 'lance': if (e.tm <= 0) { e.st = 'ldash'; e.tm = .6; sfx.dash(); } return 0;
    case 'ldash': e.mv = e.ang; burst(e.x, 8, e.z, 3, col, 30, .4, 12); if (e.tm <= 0) { G.shake = 3; done(); } return 310;
    case 'pillars':
      if (e.ct <= 0 && e.cnt < (rage ? 7 : 5)) { e.ct = .28; e.cnt++; const x = P.x + inp.x * 28 + rand(-20, 20), z = P.z + inp.z * 28 + rand(-20, 20);
        decal(x, z, 18, .8, col, () => { ring(x, z, 4, 18, .3, col); beamFx(x, 120, z, x, 0, z, 2.4, col, .35); burst(x, 4, z, 16, col, 60, .4, 10); lightFlash(x, 12, z, col, 30, .25); sfx.boom(); if (Math.hypot(P.x - x, P.z - z) < 18 + P.r) hurtPlayer(16); }); }
      if (e.tm <= 0) done(); return T.spd * .3;
    case 'summon': if (e.tm <= 0) { const n = rage ? 6 : 4; for (let i = 0; i < n; i++) { const a = i / n * TAU; spawn('robo', e.x + Math.cos(a) * 24, e.z + Math.sin(a) * 24); } ring(e.x, e.z, 8, 40, .4, col); done(); } return 0;
    case 'nova': if (e.tm <= 0) { const n = rage ? 28 : 20; for (let i = 0; i < n; i++) eShot(e.x, e.z, i / n * TAU, 70, 12, 5, col); ring(e.x, e.z, 8, 62, .5, col); lightFlash(e.x, 14, e.z, col, 60, .3); if (d < 62 + P.r) hurtPlayer(20); sfx.boom(); G.shake = 4; done(); } return 0;
    case 'barrage2':
      if (e.ct <= 0 && e.cnt < (rage ? 10 : 7)) { e.ct = .18; e.cnt++; const x = P.x + inp.x * 26 + rand(-26, 26), z = P.z + inp.z * 26 + rand(-26, 26); flare(e.x, T.h * .9, e.z, col, 10, .1);
        decal(x, z, 17, .85, col, () => { ring(x, z, 4, 18, .3, col); burst(x, 4, z, 18, col, 70, .45, 10); mark(x, z, 12, 0x0e0805, 'scorch', 6, .55); sfx.boom(); if (Math.hypot(P.x - x, P.z - z) < 17 + P.r) hurtPlayer(16); }); }
      if (e.tm <= 0) done(); return 0;
  }
  done(); return 0;
}
// ───────── 임무 방식: 방어·호위·소탕·돌파·탈출·시간제한·야간 (목표를 이루면 결전)
const MIS_INFO = { 생존: '버티고 보스를 쓰러뜨려라', 보스: '막 보스를 쓰러뜨려라', 제공권: '하늘의 적을 걷어 내라', 야간: '어둠 속에서 버텨라', 방어: '거점을 끝까지 지켜라', 호위: '피난선을 끝까지 지켜라', 소탕: '둥지를 모두 부숴라', 돌파: '목표 지점까지 돌파하라', 탈출: '시간 안에 빠져나가라', 시간제한: '시간 안에 장치를 모두 부숴라' };
let misObjs = [];
function clearMission() { clearHazards(); for (const o of misObjs) scene.remove(o); misObjs = []; G.mis = null; G.failMsg = null; for (const k in MBV) MBV[k].then((v) => scene.remove(v.wrap)).catch(() => { }); }
function misMesh(kind, col) {
  const grp = new THREE.Group(), glow = (c, o = .8) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a4258, metalness: .6, roughness: .35, emissive: 0x141a28 });
  if (kind === 'pylon') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 4, 8), metal); base.position.y = 2; grp.add(base);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(6), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, metalness: .3, roughness: .2 })); core.position.y = 16; core.scale.y = 1.6; grp.add(core); grp.userData.spin = core;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(9, .5, 8, 40), glow(col)); ring1.rotation.x = Math.PI / 2; ring1.position.y = 16; grp.add(ring1); grp.userData.ring = ring1;
  } else if (kind === 'ship') {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.5, 26, 10), metal); hull.rotation.z = Math.PI / 2; grp.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 9), metal); deck.position.y = 3; grp.add(deck);
    for (const z of [-3, 3]) { const eng = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), glow(0x7fe6ff, 1)); eng.position.set(-14, 0, z); grp.add(eng); }
    const win = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 9.2), glow(0xffe7a0, .9)); win.position.set(5, 4, 0); grp.add(win);
  } else {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 160, 20, 1, true), glow(col, .22)); pil.position.y = 80; grp.add(pil);
    const r = new THREE.Mesh(new THREE.RingGeometry(18, 22, 48).rotateX(-Math.PI / 2), glow(col, .8)); r.position.y = .3; grp.add(r); grp.userData.ring = r;
  }
  scene.add(grp); misObjs.push(grp); return grp;
}
function initMission(C) {
  const ty = C.type || '생존', k = 1 + .3 * (G.threat - 1), M = { ty, obj: false }; G.mis = M; G.failMsg = null;
  if (ty === '방어') { const o = { x: 0, z: -34, r: 11, hp: 1200 * k, kind: 'pylon' }; o.max = o.hp; o.mesh = misMesh('pylon', 0x9fd8ff); M.tgt = o; M.obj = true; M.until = 170; M.tgtP = .3; }
  if (ty === '호위') { const o = { x: -185, z: 0, r: 12, hp: 1100 * k, kind: 'ship', vx: 370 / 150 }; o.max = o.hp; o.mesh = misMesh('ship'); M.tgt = o; M.obj = true; M.tgtP = .28; P.x = -160; P.z = 26; }
  if (ty === '소탕' || ty === '시간제한') { const N = ty === '소탕' ? 6 : 5; M.nests = N; M.obj = true; if (ty === '시간제한') M.limit = 140;
    for (let i = 0; i < N; i++) { const a = i / N * TAU + rand(-.3, .3), r = rand(115, 195); spawn('nest', Math.cos(a) * r, Math.sin(a) * r); } }
  if (ty === '돌파' || ty === '탈출') { M.obj = true; M.wps = [[-55, 95], [75, -75], [175, 60]]; M.wi = 0; P.x = -175; P.z = -70; if (ty === '탈출') M.limit = 165; M.bea = misMesh('beacon', 0xffd166); }
}
function misTarget() { const M = G.mis; if (!M || M.done) return null; if (M.tgt) return M.tgt; if (M.wps) return { x: M.wps[M.wi][0], z: M.wps[M.wi][1] };
  if (M.nests != null) { let b = null, bd = 1e9; for (const e of E) if (e.t === 'nest' && !e.dead) { const q = (e.x - P.x) ** 2 + (e.z - P.z) ** 2; if (q < bd) { bd = q; b = e; } } return b; } return null; }
function misFail(msg) { if (G.state !== 'play') return; G.failMsg = msg; banner(msg, 2000); endRun(false); }
function misDone() { const M = G.mis; if (M.done) return; M.done = true; banner('임무 달성 · 결전', 2400); screenFlash('#ffd166', .3, .7); sfx.lvl(); if (M.bea) M.bea.visible = false; spawnFinal(); }
function updMission(dt) {
  syncBossVis(dt); if (!G.won) { updHazards(dt); updEvents(dt); }
  const M = G.mis; if (!M || G.won) return;
  for (const o of misObjs) { if (o.userData.spin) o.userData.spin.rotation.y += dt * 1.2; if (o.userData.ring) o.userData.ring.rotation.z += dt * .8; }
  if (M.tgt) { const o = M.tgt;
    if (o.kind === 'ship' && !M.done) o.x = Math.min(185, o.x + o.vx * dt);
    if (M.done && o.kind === 'ship') { o.lift = (o.lift || 0) + dt * 26; if (o.mesh.visible && o.lift > 120) o.mesh.visible = false; }
    o.mesh.position.set(o.x + (o.lift || 0) * .6, o.kind === 'ship' ? 10 + (o.lift || 0) + Math.sin(G.t * 1.6) * 1.2 : 0, o.z);
    if (o.hitT > 0) { o.hitT -= dt; if (Math.random() < .3) burst(o.x, 10, o.z, 2, 0xffa04a, 30, .3, 6); }
    if (o.hp <= 0 && !M.done) { misFail(o.kind === 'ship' ? '피난선이 격추되었다' : '거점이 무너졌다'); return; } }
  if (M.done) return;
  if (M.limit && G.t > M.limit) { misFail('시간 초과'); return; }
  if (M.tgt && M.tgt.kind === 'pylon' && G.t >= M.until) misDone();
  if (M.tgt && M.tgt.kind === 'ship' && M.tgt.x >= 185) misDone();
  if (M.nests != null) { let left = 0; for (const e of E) if (e.t === 'nest' && !e.dead) left++; M.left = left;
    if (left === 0) misDone(); else if ((M.spT = (M.spT || 0) + dt) > 6.5) { M.spT = 0; for (const e of E) if (e.t === 'nest' && !e.dead) for (let i = 0; i < 2; i++) spawn('ling', e.x + rand(-12, 12), e.z + rand(-12, 12)); } }
  if (M.wps) { const [wx, wz] = M.wps[M.wi]; M.bea.position.set(wx, 0, wz);
    if (Math.hypot(P.x - wx, P.z - wz) < 24) { ring(wx, wz, 6, 40, .5, 0xffd166); sfx.lvl(); M.wi++; if (M.wi >= M.wps.length) misDone(); } }
}
function misHud() {
  const M = G.mis, el = $('#mis'); if (!M || !M.obj || G.bossOn) { el.classList.add('hide'); $('#misArrow').classList.add('hide'); return; }
  el.classList.remove('hide'); let s = '';
  if (M.done) s = '임무 달성 · 결전';
  else if (M.tgt) s = M.tgt.kind === 'ship' ? `피난선 ${Math.max(0, Math.ceil(M.tgt.hp / M.tgt.max * 100))}% · 남은 거리 ${Math.max(0, Math.round(185 - M.tgt.x))}` : `거점 ${Math.max(0, Math.ceil(M.tgt.hp / M.tgt.max * 100))}% · ${fmt(Math.max(0, M.until - G.t))}`;
  else if (M.nests != null) s = `${M.ty === '소탕' ? '둥지' : '장치'} ${M.left ?? M.nests} 남음`;
  else if (M.wps) s = `목표 ${M.wi + 1}/${M.wps.length} · ${Math.round(Math.hypot(P.x - M.wps[M.wi][0], P.z - M.wps[M.wi][1]))}m`;
  el.textContent = s;
  // 화면 밖 목표 화살표
  const tg = misTarget(), ar = $('#misArrow'); if (!tg) { ar.classList.add('hide'); return; }
  _vmis.set(tg.x, 8, tg.z).project(cam); const sx = (_vmis.x * .5 + .5) * innerWidth, sy = (-_vmis.y * .5 + .5) * innerHeight, m = 46;
  if (_vmis.z < 1 && sx > m && sx < innerWidth - m && sy > m && sy < innerHeight - m) { ar.classList.add('hide'); return; }
  const cx = innerWidth / 2, cy = innerHeight / 2; let ax = sx - cx, ay = sy - cy; if (_vmis.z > 1) { ax = -ax; ay = -ay; }
  const k = Math.min((cx - m) / Math.abs(ax || 1e-3), (cy - m) / Math.abs(ay || 1e-3)); ar.classList.remove('hide');
  ar.style.transform = `translate(${cx + ax * k}px, ${cy + ay * k}px)`; ar.firstElementChild.style.transform = `rotate(${Math.atan2(ay, ax)}rad)`;
  ar.lastElementChild.textContent = Math.round(Math.hypot(P.x - tg.x, P.z - tg.z)) + 'm';
}
const _vmis = new THREE.Vector3();
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
  rate *= .75 + .25 * EZ(); if (G.bossOn) rate *= .3;
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
    case 'goliath': case 'scorp': case 'brood': case 'warden': case 'keeper': if (P.fly && (e.flk = (e.flk || 0) - dt) <= 0) { e.flk = rage ? .5 : .8; for (let i = -1; i <= 1; i++) aaShot(e, 140, 9, .02 + Math.abs(i) * .12, T.col); }   // 보스도 날고 있으면 대공탄
      return bossAI(e, dt, d, toP, rage);
  }
  return T.spd;
}
function bossAI(e, dt, d, toP, rage) {
  if (e.groggy > 0) return 0;
  const T = e.T, k = e.t;
  if (e.st === 'move') {
    if (k === 'brood') { const orb = Math.atan2(e.x - P.x, e.z - P.z) + .35; e.mv = Math.atan2(P.x + Math.sin(orb) * 70 - e.x, P.z + Math.cos(orb) * 70 - e.z); }
    if (e.tm <= 0) {
      e.pat = ((e.pat ?? -1) + 1) % 3; e.cnt = 0; e.ct = 0;
      const P0 = { goliath: ['barrage', 'stomp', 'gatling'], scorp: ['charge', 'acidring', 'lob'], brood: ['bombrun', 'brood', 'rain'], warden: ['barrage', 'stomp', 'gatling'], keeper: ['charge', 'acidring', 'lob'] }[k][e.pat];
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
  const T = e.T; G.kills++; comboKill(e); elemKill(e);
  if (e.t === 'barrel') later(.05, () => explode(e.x, e.z, 46, 160 * (1 + .25 * (G.threat - 1)), 0xff7a3a));
  if (e.flee) { banner('보물 운반선 격추!', 1600); for (let i = 0; i < 18; i++) dropGem(e.x + rand(-16, 16), e.z + rand(-16, 16), 4); picks.push({ kind: 'chest', x: e.x, z: e.z, t: 0 }); G.bonusCore = (G.bonusCore || 0) + 120; }
  if (e.elite) { for (let i = 0; i < 5; i++) dropGem(e.x + rand(-10, 10), e.z + rand(-10, 10), 3); if (--G.elites <= 0) { picks.push({ kind: 'chest', x: e.x, z: e.z, t: 0 }); banner('정예 섬멸 · 전리품', 1600); } } if (P.lifesteal) P.hp = Math.min(P.maxHp, P.hp + P.lifesteal);
  burst(e.x, T.h * .5, e.z, T.r > 10 ? 70 : 12, T.col, T.r > 10 ? 130 : 60, T.r > 10 ? .9 : .45, T.r > 10 ? 14 : 9);
  if (T.mech) { mark(e.x, e.z, T.r * (T.r > 10 ? 2 : 1.4), 0x0e0805, 'scorch', T.r > 10 ? 10 : 5, .55); burst(e.x, (T.fly ? T.fly : T.h * .5), e.z, 8, 0xffa04a, 60, .5, 9); if (T.fly || T.r > 10) xfBoom(e.x, e.z, T.r > 10 ? 'elite' : 'grunt', T.r * 1.1, 'emp'); }
  else mark(e.x, e.z, T.r * (T.r > 10 ? 1.9 : 1.35), e.t === 'plasma' || e.t === 'spit' ? 0x2a4a18 : 0x4a1430, 'splat', T.r > 10 ? 9 : 4, .42);
  flare(e.x, T.fly ? T.fly : T.h * .5, e.z, T.col, T.r > 10 ? 40 : 11, .1); if (e === G.mid) G.mid = null;
  if (T.r > 10) screenFlash(e.t === 'queen' ? '#fff2c0' : '#ffb070', e.t === 'queen' ? .8 : .35, e.t === 'queen' ? .9 : .4);
  if (T.r > 10) {
    ring(e.x, e.z, 6, 70, .6, T.col); sfx.boom(); G.shake = 6; G.slow = .35; G.hstop = .1; P.ult = Math.min(100, P.ult + 25 * (P.ultGain || 1)); G.st.big++;
    xfBoom(e.x, e.z, e.t === 'queen' ? 'boss' : 'elite', T.h * .9, 'zeta');
    if (e.vis) dropBossVis(e);
    if (e.t === 'queen' || e === G.boss) { win(); return; }
    picks.push({ kind: 'chest', x: e.x, z: e.z, t: 0 }); picks.push({ kind: 'heal', x: e.x + 12, z: e.z + 6, t: 0 });
    for (let i = 0; i < 14; i++) dropGem(e.x + rand(-14, 14), e.z + rand(-14, 14), 3);
  } else {
    sfx.kill(); P.ult = Math.min(100, P.ult + (G.bossOn ? 1.2 : .75) * (P.ultGain || 1));
    dropGem(e.x, e.z, T.xp); if (Math.random() < .008) picks.push({ kind: 'heal', x: e.x, z: e.z, t: 0 });
  }
}

function updEnemies(dt) {
  const n = E.length;
  for (let i = 0; i < n; i++) {
    const e = E[i]; if (e.dead) continue; const T = e.T;
    if (e.ally) { allyTick(e, dt); continue; }
    if (stTick(e, dt)) continue;
    const TG = (e.confT > 0 && confTarget(e)) || (e.tgo && G.mis && G.mis.tgt && G.mis.tgt.hp > 0 && !G.mis.done ? G.mis.tgt : P), dx = TG.x - e.x, dz = TG.z - e.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    let mx = ux, mz = uz, sp = T.spd * e.sm; e.tm -= dt; e.flash -= dt; e.bladeT -= dt; e.born -= dt; e.ph += dt;

    if (TG.T || e.frzT > 0) { }
    else if (e.flee) { const a = Math.atan2(-dx, -dz) + Math.sin(e.ph * 1.3) * .9; mx = Math.sin(a); mz = Math.cos(a); sp = T.spd; }
    else if (e.t === 'bane') {
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
    else if (T.virt && MB[e.t]) { sp = mechBossAI(e, dt, d, dx, dz); mx = Math.sin(e.mv); mz = Math.cos(e.mv); }
    else if (T.anim || T.fly || T.boss || e.t === 'spit' || e.t === 'aagun') { sp = unitAI(e, dt, d, dx, dz) * e.sm; mx = Math.sin(e.mv); mz = Math.cos(e.mv); }

    if (e.stun > 0) { e.stun -= dt; sp = 0; if (Math.random() < .08) burst(e.x, e.T.h + 2, e.z, 1, 0xfff07a, 10, .3, 6, .2); }
    if (e.frzT > 0) sp = 0; else if (e.slwT > 0) sp *= .5;
    if (P.cloakT > 0 && e.st === 'move') { sp *= .35; mx = Math.sin(e.ph); mz = Math.cos(e.ph * .7); }   // 은신 중에는 헤맨다
    // 서로 밀어내기
    for (let j = i + 1; j < n; j++) {
      const o = E[j]; if (o.dead || !T.fly !== !o.T.fly) continue; const qx = o.x - e.x, qz = o.z - e.z, rr = T.r + o.T.r;
      if (Math.abs(qx) > rr || Math.abs(qz) > rr) continue; const q2 = qx * qx + qz * qz; if (q2 >= rr * rr || q2 < .0001) continue;
      const q = Math.sqrt(q2), push = (rr - q) * .5, px = qx / q * push, pz = qz / q * push, we = o.T.r / rr, wo = T.r / rr;
      e.x -= px * we; e.z -= pz * we; o.x += px * wo; o.z += pz * wo;
    }
    const sk = e.slowK || 1; e.slowK = 1; e.vx = mx * sp * sk; e.vz = mz * sp * sk;
    e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt; const kd = Math.max(0, 1 - 8 * dt); e.kx *= kd; e.kz *= kd;
    const er = Math.hypot(e.x, e.z), lim = e.t === 'jet' ? ARENA_R + 70 : ARENA_R - 4; if (er > lim) { e.x *= lim / er; e.z *= lim / er; }
    if (e.st !== 'fuse' && e.st !== 'stomp' && sp > 0) { const want = Math.atan2(mx, mz); let da = want - e.yaw; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; e.yaw += da * Math.min(1, dt * 9); }
    // 접촉 피해
    if (TG.T) { if (d < T.r + TG.T.r + 3 && e.born <= 0 && !(e.frzT > 0)) unitHit(TG, Math.max(8, T.dmg) * 3 * dt * (1 + .35 * (G.threat - 1)), e); }
    else if (TG !== P) { if (d < T.r + TG.r && e.born <= 0 && T.dmg > 0) { TG.hp -= T.dmg * dt * .55; TG.hitT = .15; } }
    else if (d < T.r + P.r && e.born <= 0 && e.t !== 'bane' && T.dmg > 0 && !(e.frzT > 0)) {
      if (P.alt > 10) { if (T.fly) hurtPlayer(T.dmg, true); }
      else if (!T.fly || (e.alt || 0) < -T.fly * .6) hurtPlayer((e.st === 'dash' ? T.dmg * 1.3 : T.dmg) * (e.weakT > 0 ? .6 : 1));
    }
  }
  E = E.filter((e) => { if (e.dead && e.px) e.px.dead = true; if (e.dead && e.vis) dropBossVis(e); return !e.dead; });
}

// 여왕: 탄막 고리 → 지면 포격 → 돌진 → 소환을 번갈아 쓴다
function queenAI(e, dt, d, dx, dz) {
  if (e.groggy > 0) return 0;
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
  const key = `c${G.chi + 1}`, prev = save.best[key] || { t: 0, k: 0, w: 0 };
  const better = (won && !prev.w) || (won === !!prev.w && (won ? G.t < prev.t : G.t > prev.t));
  if (better) save.best[key] = { t: Math.round(G.t), k: G.kills, w: won ? 1 : 0 };
  const rw = runReward(won); const wdrop = dropWeapon(won); const mr = metaReward(won); persist();
  $('#ovT').textContent = won ? '임무 완료' : G.failMsg ? '임무 실패' : '기체 대파'; $('#ovT').className = won ? 'win' : 'lose';
  $('#ovSub').textContent = `${stLabel(G.chi)} · ${CHAPTERS[G.chi].nm}`;
  $('#ovStars').innerHTML = ['보스 격파', '내구 50% 이상', '결전 60초 안에'].map((s, i) => `<span class="${G.lastStars[i] ? 'on' : ''}"><i>★</i>${s}</span>`).join('');
  $('#newrec').classList.toggle('hide', !better);
  $('#stats').innerHTML = [['clock', fmt(G.t), '생존 시간'], ['skull', G.kills, '격파'], ['lv', P.lvl, '레벨'], ['star', G.st.maxCombo || 0, '최고 콤보']].map(([i, v, l]) => `<div>${ico(i)}<b class="num">${v}</b><small>${l}</small></div>`).join('');
  $('#reward').innerHTML = rw.html + mr.html + (wdrop ? wdropHtml(wdrop) : '');
  const nextOk = won && G.chi + 1 < CHAPTERS.length; $('#nextThreat').classList.toggle('hide', !nextOk); $('#nextThreat').textContent = nextOk ? `다음 · ${stLabel(G.chi + 1)}` : '';
  ADS.offer('double', $('#adDouble'), `광고 보고 보상 2배`, () => { save.core += rw.earned; save.gem += rw.gem; persist(); $('#reward').insertAdjacentHTML('beforeend', '<div class="rwm">광고 보상 2배 지급 완료</div>'); });
  setTimeout(() => { $('#over').classList.remove('hide'); countUp($('#reward')); }, won ? 300 : 700);
  if (won) storyAfter(G.chi);
  { const dl = won && DEBRIEF[G.chi]; $('#ovLine').classList.toggle('hide', !dl); if (dl) $('#ovLine').innerHTML = `<b>${dl[0]}</b><span>${dl[1]}</span>`; }
  if (!won && G.failMsg) $('#ovSub').textContent += ` · ${G.failMsg}`;
  $('#hud').classList.add('hide');
}
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; drawBuild(); $('#pause').classList.remove('hide'); music.pause(); }
  else if (G.state === 'pause') { G.state = 'play'; $('#pause').classList.add('hide'); if (!muted) music.play().catch(() => { }); last = performance.now(); }
}
function countUp(root) { root.querySelectorAll('[data-to]').forEach((el) => { const to = +el.dataset.to, t0 = performance.now(); const f = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = '+' + Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

async function startRun() {
  if (!save.own[save.mech]) return;
  audioInit(); $('#start').disabled = true; $('#retry').disabled = true; const st0 = $('#start').textContent; $('#start').textContent = '기체 준비 중…';
  try { await ensureMech(save.mech); } catch (e) { $('#start').textContent = '불러오지 못했습니다. 다시 눌러 주세요'; $('#start').disabled = false; $('#retry').disabled = false; return; }
  $('#start').textContent = st0; $('#retry').disabled = false;
  G.chi = clamp(save.ch, 1, save.chMax) - 1; G.threat = CHAPTERS[G.chi].th; leaveLobby(); resetRun(); await setMech(save.mech);
  applyMech(MECH(save.mech)); applyChapterLook(CHAPTERS[G.chi]); P.rr = 2;
  G.recOk = (CHAPTERS[G.chi].rec || []).includes(MECH(save.mech).cls); if (G.recOk) { P.dmgMul *= 1.15; P.maxHp = Math.round(P.maxHp * 1.1); P.hp = P.maxHp; }
  { const m = MECH(save.mech); $('#bUlt').firstElementChild.innerHTML = ico2(m.ult.k, '#ffd98a'); const EL0 = ELEM[m.el]; $('#bElem').firstElementChild.innerHTML = ico2('el_' + m.el, EL0.col); $('#bElem').style.setProperty('--ec', EL0.col); $('#bElem').title = `${EL0.sk.nm} · 계열 기술 (R)`; $('#bAuto').style.setProperty('--ec', EL0.col); UP.elemUp.nm = `${EL0.nm} 각성`; $('#bUlt').title = `${m.ult.nm} (Q)`; $('#bAuto').firstElementChild.innerHTML = ico2(m.auto.k, '#ffffff'); $('#bAuto').title = `${m.auto.nm} · 스킬 (E)`;
    $('#bFly').firstElementChild.innerHTML = ico('fly'); $('#pfp').style.backgroundImage = `url(img/${m.id}.jpg?v=15)`; $('#chLabel').textContent = `${stLabel(G.chi)} · ${CHAPTERS[G.chi].nm}`; }
  save.stat.runs++; const D = save.daily; if (D.mechs && !D.mechs.includes(save.mech)) D.mechs.push(save.mech); persist();
  $('#title').classList.add('hide'); $('#over').classList.add('hide'); $('#lvl').classList.add('hide'); $('#pause').classList.add('hide'); $('#hud').classList.remove('hide'); $('#boss').classList.add('hide');
  initMission(CHAPTERS[G.chi]); initHazards(CHAPTERS[G.chi].theme); initEvents();
  if (THEME_HZ[CHAPTERS[G.chi].theme]) later(3, () => banner(THEME_HZ[CHAPTERS[G.chi].theme], 2800)); { const bk = CHAPTERS[G.chi].boss; if (bk && ET[bk] && ET[bk].virt) loadBossVis(bk).catch(() => { }); }
  $('#btns').style.display = ''; drawSlots(); await storyBefore(G.chi); G.state = 'play'; last = performance.now();
  music.currentTime = 0; if (!muted) music.play().catch(() => { });
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; spawn('ling', Math.cos(a) * 105, Math.sin(a) * 105); }
  banner(`${stLabel(G.chi)} · ${CHAPTERS[G.chi].nm}${G.recOk ? ' · 추천 기종 보너스' : ''}`, 2600); $('#start').disabled = false;
}

// ───────── 그리기 ─────────
function drawInstances(time) {
  const cnt = {}; for (const k in ET) cnt[k] = IM[k].map(() => 0); let sh = 0;
  const put = (x, z, r) => { if (sh >= 180) return; dummy.position.set(x, .25, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(r, 1, r); dummy.updateMatrix(); imShadow.setMatrixAt(sh++, dummy.matrix); };
  put(P.x, P.z, P.alt > 5 ? 9 : 7);
  for (const e of E) {
    const F = IM[e.t].length, moving = e.st === 'move' || e.st === 'dash' || e.st === 'dive' || e.st === 'pass';
    if (!F) { put(e.x, e.z, e.T.r * 1.1); continue; }
    const f = F > 1 && moving ? Math.floor(e.ph * e.T.spd * .26) % F : 0, im = IM[e.t][f], i = cnt[e.t][f]++; if (i >= e.T.max) continue;
    const big = e.T.r > 10, air = e.T.fly ? e.T.fly + (e.alt || 0) + Math.sin(e.ph * 2.2) * 1.2 : 0;
    const hop = moving && F === 1 && !e.T.fly ? Math.abs(Math.sin(e.ph * (big ? 4 : 9))) * (big ? 1.2 : 1.6) : 0;
    const grow = e.born > 0 ? 1 - e.born / .35 * .7 : 1, sq = e.flash > 0 ? 1.12 : 1;
    dummy.position.set(e.x, hop + air, e.z);
    if (e.T.fly) dummy.rotation.set(e.st === 'dive' ? .35 : .05, e.yaw + e.T.yaw, e.bank || 0); else dummy.rotation.set(moving && F === 1 ? .12 : 0, e.yaw + e.T.yaw, F > 1 ? 0 : Math.sin(e.ph * 7) * (big ? .02 : .07));
    dummy.scale.set(e.sc * grow * sq, e.sc * grow * (2 - sq), e.sc * grow * sq); dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
    im.setColorAt(i, e.flash > 0 ? tmpC.setRGB(4, 4, 4) : e.ally ? tmpC.setRGB(.85, .45, 2) : e.frzT > 0 ? tmpC.setRGB(1.3, 2.2, 3) : e.confT > 0 ? tmpC.setRGB(1.3, 2.1, 1.1) : (e.gold || e.elite) ? tmpC.setRGB(2.1, 1.6, .5) : e.groggy > 0 ? tmpC.setRGB(1.8, 1.6, .8) : e.st === 'fuse' ? tmpC.setRGB(2.4, .8, .5) : e.burnT > 0 ? tmpC.setRGB(1.9, 1.15, .8) : e.weakT > 0 ? tmpC.setRGB(1.15, 1.45, 1.25) : tmpC.setRGB(1, 1, 1));
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
function setCd(id, frac, secs) { const b = $(id); b.style.setProperty('--cd', clamp(frac, 0, 1) * 100 + '%'); const s = secs > 0 ? String(Math.ceil(secs)) : ''; const el = b.querySelector('b'); if (el.textContent !== s) el.textContent = s; }
let flyIco = '';
function drawHud(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = .08;
  $('#xpfill').style.width = clamp(P.xp / P.need * 100, 0, 100) + '%';
  $('#lv').textContent = P.lvl;
  $('#time').textContent = G.bossOn ? '결전' : G.mis && G.mis.limit ? fmt(Math.max(0, G.mis.limit - G.t)) : G.mis && G.mis.obj ? '임무' : fmt(Math.max(0, RUN_TIME - G.t));
  misHud();
  { const el = $('#combo'); if ((G.combo || 0) >= 3) { if (G._cs !== G.combo) { G._cs = G.combo; el.classList.remove('hide'); el.firstElementChild.textContent = G.combo; el.dataset.tier = G.combo >= 200 ? 4 : G.combo >= 100 ? 3 : G.combo >= 50 ? 2 : G.combo >= 25 ? 1 : 0; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } el.style.setProperty('--ct', Math.max(0, G.comboT / 2.4)); } else if (!el.classList.contains('hide')) { el.classList.add('hide'); G._cs = 0; } }
  { const B = G.boss && !G.boss.dead ? G.boss : G.mid && !G.mid.dead ? G.mid : null, sb = $('#bossStg'); if (B) { const need = B.max * .1 * (1 + (B.brk || 0) * .5); sb.style.width = (B.groggy > 0 ? 100 : clamp((B.stg || 0) / need * 100, 0, 100)) + '%'; sb.classList.toggle('on', B.groggy > 0); } }
  const ks = $('#kills').children; ks[0].innerHTML = `${ico('skull')}${G.kills}`; ks[1].innerHTML = `${ico('core')}${Math.round((G.kills / 9 + G.t / 5 + G.st.big * 15) * (1 + .25 * (G.threat - 1)))}`;
  $('#hpfill').style.width = clamp(P.hp / P.maxHp * 100, 0, 100) + '%';
  $('#hptxt').innerHTML = `<span>${Math.ceil(P.hp)} / ${P.maxHp}</span><span>${P.bar > 0 ? '보호막 ' + Math.ceil(P.bar) : ''}</span>`;
  $('#barfill').style.width = clamp(P.bar / P.maxHp * 100, 0, 100) + '%';
  { const want = P.fly ? 'land' : 'fly'; if (flyIco !== want) { flyIco = want; $('#bFly').firstElementChild.innerHTML = ico(want); $('#bFly').title = P.fly ? '착지 (F)' : '비행 (F)'; } }
  if (P.fly) setCd('#bFly', 0, P.flyT); else setCd('#bFly', P.flyCd / (FLY.cd * (P.flyCdMul || 1)), P.flyCd);
  setCd('#bDash', P.dashCd / P.dashMax, P.dashCd);
  { const A = MECH(save.mech).auto, cdm = A.cd * P.cdMul; setCd('#bAuto', P.akCd / cdm, P.akCd); $('#bAuto').classList.toggle('ready', P.akCd <= 0); }
  { const cdm = ekCdMax(); setCd('#bElem', P.ekCd / cdm, P.ekCd); $('#bElem').classList.toggle('ready', P.ekCd <= 0); $('#hud').classList.toggle('rel', P.relT > 0); }
  { const b = $('#bUlt'); b.style.setProperty('--cd', P.ult + '%'); b.classList.toggle('ready', P.ult >= 100); const s = P.ult >= 100 ? '' : Math.floor(P.ult) + '%', el = b.querySelector('b'); if (el.textContent !== s) el.textContent = s; }
  { const B = G.boss && !G.boss.dead ? G.boss : G.mid && !G.mid.dead ? G.mid : null; $('#boss').classList.toggle('hide', !B || G.won);
    if (B) { const nm = B.T.boss || '제타 여왕'; if ($('#bossname').dataset.nm !== nm) { $('#bossname').dataset.nm = nm; $('#bossname').innerHTML = `${ico('skull')}<span>${nm}</span>${ico('skull')}`; } $('#bossfill').style.width = clamp(B.hp / B.max * 100, 0, 100) + '%'; } }
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
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3(), _ss = new THREE.Vector3(), _sf = new THREE.Vector3(), _sd = new THREE.Vector3();
// 대기창에서 손에 든 무기 방향: [앞쪽 기울기, 바깥쪽 기울기] (아래 1 기준). 칼끝·총구가 앞쪽 아래를 향하게
const STAND_HOLD = { spear: [.06, .1, 1], great: [.85, .22], katana: [1, .18], saber: [.9, .18], pistol: [.65, .12], rifle: [.9, .28], rail: [.9, .28], gatling: [.75, .32], cannon: [.75, .3] }, _sbox = new THREE.Box3();
const STAND_REST = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'LeftHand', 'RightHand'];
// 기체별 대기 자세: attn = 차렷(발 모으고 팔 몸에 붙임)
const STAND_STYLE = { mech3: { attn: 1, hold: [.12, .14] } };
function lobbyStand() {
  const SS = STAND_STYLE[CURM && CURM.id] || {};
  const B = armed && armed.bones; if (!B || !B.Hips || !B.LeftUpLeg || !B.RightUpLeg || !B.LeftArm || !B.RightArm) return;
  // 몸통·머리·다리는 기본 자세로 되돌려 비틀림을 없앤다
  for (const n in B) { const b = B[n]; if (b && b.userData.q0) b.quaternion.copy(b.userData.q0); }
  if (B.Hips.userData.p0) B.Hips.position.copy(B.Hips.userData.p0);
  P.group.updateMatrixWorld(true);
  _sf.set(Math.sin(P.yaw), 0, Math.cos(P.yaw));                                                                                                       // 앞 방향
  // 엉덩이·가슴이 정확히 정면을 보게: 좌우 선을 앞 방향과 직각으로 돌린다
  const squareUp = (bone, la, ra) => { if (!bone || !la || !ra) return; la.getWorldPosition(_sa); ra.getWorldPosition(_sb); _sd.copy(_sa).sub(_sb); if (_sd.lengthSq() < 1e-6) return; _sd.normalize();
    const want = _sb.set(_sf.z, 0, -_sf.x); if (want.dot(_sd) < 0) want.negate(); rotW(bone, new THREE.Quaternion().setFromUnitVectors(_sd, want)); };
  squareUp(B.Hips, B.LeftUpLeg, B.RightUpLeg);
  // 허리: 가장 아래 허리뼈를 돌려 어깨 중심이 엉덩이 바로 위에 오게(옆으로 휜 모델도 곧게)
  { let sp = B.LeftShoulder && B.LeftShoulder.parent; while (sp && sp.parent && sp.parent !== B.Hips) sp = sp.parent;
    if (sp && sp.parent === B.Hips && B.LeftArm && B.RightArm) { sp.getWorldPosition(_sa); B.LeftArm.getWorldPosition(_sb); B.RightArm.getWorldPosition(_sd); _sb.add(_sd).multiplyScalar(.5).sub(_sa);
      if (_sb.lengthSq() > 1e-6) { _sb.normalize(); rotW(sp, new THREE.Quaternion().setFromUnitVectors(_sb, _sd.set(0, 1, 0))); } } }
  squareUp((B.LeftShoulder && B.LeftShoulder.parent) || B.Spine2 || B.Spine, B.LeftArm, B.RightArm);
  B.LeftUpLeg.getWorldPosition(_sa); B.RightUpLeg.getWorldPosition(_sb); _ss.copy(_sa).sub(_sb); _ss.y = 0; const hipW = _ss.length(); _ss.normalize();   // 왼쪽 방향
  B.LeftArm.getWorldPosition(_sa); B.RightArm.getWorldPosition(_sb); const shW = Math.hypot(_sa.x - _sb.x, _sa.z - _sb.z);
  for (const s of [1, -1]) {
    const L = s > 0 ? 'Left' : 'Right';
    // 다리: 곧게 펴고 발 간격을 어깨너비에 맞춘다
    const up = B[L + 'UpLeg'], kn = B[L + 'Leg'], ft = B[L + 'Foot'];
    if (up && kn && ft) {
      up.getWorldPosition(_sa); ft.getWorldPosition(_sb); const len = _sa.distanceTo(_sb) || 1, out = SS.attn ? 0 : clamp((shW - hipW) / 2 / len, 0, .3);
      _sd.copy(_ss).multiplyScalar(s * out); _sd.y = -1; _sd.normalize(); pointArm(up, kn, _sd, 1); pointArm(kn, ft, _sd, 1);
      // 발끝은 정면으로 나란히
      if (ft.userData.q0) { ft.quaternion.copy(ft.userData.q0); ft.updateMatrixWorld(true); }
      const toe = B[L + 'ToeBase']; if (toe) { ft.getWorldPosition(_sa); toe.getWorldPosition(_sb); _sd.copy(_sb).sub(_sa); _sd.y = 0; if (_sd.lengthSq() > 1e-6) { _sd.normalize(); rotW(ft, new THREE.Quaternion().setFromUnitVectors(_sd, _sf)); } }
    }
    // 팔: 몸 옆으로 내리고 팔꿈치는 살짝 굽힌다
    const ua = B[L + 'Arm'], fa = B[L + 'ForeArm'], hd = B[L + 'Hand'];
    if (ua && fa && hd) {
      _sd.copy(_ss).multiplyScalar(s * (SS.attn ? .13 : .26)).addScaledVector(_sf, .02); _sd.y = -1; _sd.normalize(); pointArm(ua, fa, _sd, 1);
      _sd.copy(_ss).multiplyScalar(s * (SS.attn ? .05 : .14)).addScaledVector(_sf, SS.attn ? .03 : .2); _sd.y = -1; _sd.normalize(); pointArm(fa, hd, _sd, 1);
    }
  }
  // 두 발을 기본 자세 때 높이(바닥)에 맞춘다
  const scn = TF_E.mdl.obj; if (scn && B.LeftFoot && B.RightFoot) {
    if (armed.footY == null) armed.footY = null;
    const fy = Math.min(B.LeftFoot.getWorldPosition(_sa).y, B.RightFoot.getWorldPosition(_sb).y), base = P.group.getWorldPosition(_sd).y + (armed.footRest ?? 0);
    const ps = B.Hips.parent ? B.Hips.parent.getWorldScale(_sd).y : 1; if (Math.abs(base - fy) > 1e-3 && ps) { B.Hips.position.y += (base - fy) / ps; P.group.updateMatrixWorld(true); }
  }  // 칼을 든 손: 칼끝이 앞쪽 아래를 향하게 자연스럽게 든다
  const mw = armed.main, hk = SS.hold || STAND_HOLD[ARM]; if (mw && hk && B.RightHand) { mw.updateMatrixWorld(true); mw.getWorldPosition(_sb);
    const tl = mw.userData.muzzle || mw.userData.tip; if (tl) mw.userData.body.localToWorld(_sa.copy(tl)); else { _sbox.setFromObject(mw); _sbox.getCenter(_sa); }
    _sd.copy(_sa).sub(_sb);
    if (_sd.lengthSq() > 1e-4) { _sd.normalize(); _sb.copy(_sf).multiplyScalar(hk[0]).addScaledVector(_ss, -hk[1]); _sb.y = hk[2] ? 1 : -1; _sb.normalize(); rotW(B.RightHand, new THREE.Quaternion().setFromUnitVectors(_sd, _sb)); } }
}
// 손바닥이 표적을 보게(손가락은 위로): 장풍 쏘는 손 모양
const _pf1 = new THREE.Vector3(), _pf2 = new THREE.Vector3(), _pf3 = new THREE.Vector3(), _pf4 = new THREE.Vector3(), _pfq = new THREE.Quaternion(), _pm1 = new THREE.Matrix4(), _pm2 = new THREE.Matrix4();
function palmFace(hand, dir, k) {
  const f = armed && armed.lpf; if (!f || k < .02) return;
  hand.getWorldQuaternion(_pfq); const Nw = _pf2.copy(f.N).applyQuaternion(_pfq).normalize(), Fw = _pf1.copy(f.F).applyQuaternion(_pfq); Fw.addScaledVector(Nw, -Fw.dot(Nw)).normalize();
  const Ft = _pf3.set(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
  _pm1.makeBasis(Nw, Fw, _pf4.crossVectors(Nw, Fw).normalize()); const q1 = new THREE.Quaternion().setFromRotationMatrix(_pm1);
  _pm2.makeBasis(dir, Ft, new THREE.Vector3().crossVectors(dir, Ft).normalize()); const q2 = new THREE.Quaternion().setFromRotationMatrix(_pm2);
  rotW(hand, new THREE.Quaternion().slerp(q2.multiply(q1.invert()), k));
}
// ── 총 쥐는 법(실제 사격 자세와 로봇 프라모델 사진 기준)
//  · 소총·레일: 개머리를 어깨에 붙이고 총을 눈높이로, 왼손은 총신 아래를 받친다
//  · 기관포: 허리 높이에서 두 손으로 든다
//  · 권총·방패 든 기체: 한 팔을 곧게 뻗어 겨눈다(방패는 왼팔)
//  · 대기 화면: 두 손으로 총을 비스듬히 아래로 든 준비 자세
const _gq = new THREE.Quaternion(), _gv = [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector3());
function aimGun(mw, dir, k) {
  const RH = armed && armed.bones.RightHand; if (!mw || !RH || !mw.userData.muzzle || k < .02) return; mw.updateMatrixWorld(true);
  // 총신 축(총구와, 같은 높이의 총 한가운데를 잇는 선)을 dir에 맞춘다
  const m = mw.userData.muzzle, ai = Math.abs(m.x) >= Math.abs(m.y) && Math.abs(m.x) >= Math.abs(m.z) ? 'x' : Math.abs(m.y) >= Math.abs(m.z) ? 'y' : 'z', rear = _gv[1].copy(m); rear[ai] = 0;
  const mz = mw.userData.body.localToWorld(_gv[0].copy(m)); mw.userData.body.localToWorld(rear); const v = mz.sub(rear); if (v.lengthSq() < 1e-6) return; v.normalize();
  rotW(RH, new THREE.Quaternion().slerp(_gq.setFromUnitVectors(v, dir), k));
}
const UPY = new THREE.Vector3(0, 1, 0);
// 상체를 표적 쪽으로 돌린다. ang: 표적보다 오른쪽으로 더 트는 각도(왼어깨가 앞으로 나오는 사격 자세), pitch: +앞으로 숙임 / -뒤로 젖힘
function torsoAim(dir, ang, pitch, k) {
  const B = armed.bones, sp1 = B.Spine01 || B.Spine1, sp = B.Spine; if (!sp || !B.RightArm || !B.LeftArm || k < .02) return;
  const dh = new THREE.Vector3(dir.x, 0, dir.z); if (dh.lengthSq() < 1e-6) return; dh.normalize();
  const df = dh.clone().multiplyScalar(Math.cos(ang)).addScaledVector(new THREE.Vector3().crossVectors(dh, UPY).normalize(), Math.sin(ang)).normalize();
  for (const [bone, w] of [[sp1, .5], [sp, 1]]) { if (!bone) continue;
    const side = B.RightArm.getWorldPosition(new THREE.Vector3()).sub(B.LeftArm.getWorldPosition(new THREE.Vector3())); side.y = 0; if (side.lengthSq() < 1e-6) return; side.normalize();
    const cf = new THREE.Vector3().crossVectors(UPY, side).normalize(); const a = clamp(Math.atan2(new THREE.Vector3().crossVectors(cf, df).y, cf.dot(df)), -1.1, 1.1);
    const q = new THREE.Quaternion().setFromAxisAngle(UPY, a * w * k);
    if (bone === sp && pitch) q.premultiply(new THREE.Quaternion().setFromAxisAngle(side, -pitch * k));
    rotW(bone, q); }
}
// 머리가 표적을 본다(상체를 튼 만큼 되돌려 앞을 본다)
function headAim(dir, k) {
  const B = armed.bones, hd = B.Head || B.neck; if (!hd || !B.RightArm || !B.LeftArm || k < .02) return;
  const side = B.RightArm.getWorldPosition(new THREE.Vector3()).sub(B.LeftArm.getWorldPosition(new THREE.Vector3())); side.y = 0; if (side.lengthSq() < 1e-6) return; side.normalize();
  const cf = new THREE.Vector3().crossVectors(UPY, side).normalize(), dh = new THREE.Vector3(dir.x, 0, dir.z).normalize();
  const a = clamp(Math.atan2(new THREE.Vector3().crossVectors(cf, dh).y, cf.dot(dh)), -.9, .9); rotW(hd, new THREE.Quaternion().setFromAxisAngle(UPY, a * k));
}
// 왼손 방향 맞추기: 손바닥이 N을, 손가락이 F 쪽을 보게(받침손은 손바닥이 위로)
function handOrient(hand, N, F, k) {
  const f = armed && armed.lpf; if (!f || k < .02) return;
  hand.getWorldQuaternion(_pfq); const Nw = _pf2.copy(f.N).applyQuaternion(_pfq).normalize(), Fw = _pf1.copy(f.F).applyQuaternion(_pfq); Fw.addScaledVector(Nw, -Fw.dot(Nw)).normalize();
  const Nt = N.clone().normalize(), Ft = F.clone().addScaledVector(Nt, -F.dot(Nt)); if (Ft.lengthSq() < 1e-6) return; Ft.normalize();
  _pm1.makeBasis(Nw, Fw, _pf4.crossVectors(Nw, Fw).normalize()); const q1 = new THREE.Quaternion().setFromRotationMatrix(_pm1);
  _pm2.makeBasis(Nt, Ft, new THREE.Vector3().crossVectors(Nt, Ft).normalize()); const q2 = new THREE.Quaternion().setFromRotationMatrix(_pm2);
  rotW(hand, new THREE.Quaternion().slerp(q2.multiply(q1.invert()), k));
}
// 쏠 때 반동 세기(기관포는 잔떨림, 레일은 크게)
const recoilK = () => (P.recoil || 0) * (ARM === 'gatling' ? .35 : ARM === 'rail' ? 1.5 : ARM === 'cannon' ? 1.3 : 1);
function gunTwoHand(mode, dir, k) {
  const B = armed.bones, mw = armed.main; if (!B.RightArm || !B.RightForeArm || !B.RightHand || !B.LeftArm) return;
  const rc = mode === 'ready' ? 0 : recoilK();
  // 비스듬히 선 자세: 소총은 왼어깨를 앞으로 틀고 살짝 숙인다, 기관포는 덜 틀고 뒤로 젖혀 무게를 받친다. 쏘면 상체가 뒤로 밀린다
  if (mode !== 'ready') torsoAim(dir, mode === 'hip' ? .18 : .4, (mode === 'hip' ? -.1 : .07) - .07 * rc, k);
  const rs = B.RightArm.getWorldPosition(_gv[2]), ls = B.LeftArm.getWorldPosition(_gv[3]), side = _gv[4].copy(rs).sub(ls); side.y = 0; if (side.lengthSq() < 1e-6) return; side.normalize();
  const fe = B.RightForeArm.getWorldPosition(_gv[5]), hd = B.RightHand.getWorldPosition(_gv[6]), L = rs.distanceTo(fe) + fe.distanceTo(hd);
  const fw = _gv[7].set(dir.x, 0, dir.z).normalize(); let T, aim;
  if (mode === 'shoulder') { T = rs.clone().addScaledVector(fw, L * .52).addScaledVector(side, L * .1); T.y -= L * .44; aim = dir; }
  else if (mode === 'hip') { T = rs.clone().addScaledVector(fw, L * .4).addScaledVector(side, -L * .04); T.y -= L * .62; aim = new THREE.Vector3(dir.x, .03, dir.z).normalize(); }
  else { T = rs.clone().addScaledVector(fw, L * .34).addScaledVector(side, -L * .12); T.y -= L * .66; aim = fw.clone().multiplyScalar(.72).addScaledVector(side, -.55); aim.y = -.42; aim.normalize(); }
  // 반동: 오른손이 뒤로 밀리고 총구가 위로 튄다
  if (rc > .01) { T.addScaledVector(fw, -L * .09 * rc); T.y += L * .03 * rc; aim = aim.clone(); aim.y += (mode === 'hip' ? .05 : .11) * rc; aim.normalize(); }
  armIK(B.RightArm, B.RightForeArm, B.RightHand, T, k); aimGun(mw, aim, k);
  // 머리 피하기: 총신 선이 머리 가까이 지나가면 오른손을 바깥·아래로 옮겨 다시 맞춘다(총이 머리를 뚫지 않게)
  if (mode === 'shoulder' && B.Head) for (let it = 0; it < 4; it++) {
    const hp = B.RightHand.getWorldPosition(new THREE.Vector3()), hdp = B.Head.getWorldPosition(new THREE.Vector3()); hdp.y += L * .12;
    const t = hdp.clone().sub(hp).dot(aim), dist = hp.clone().addScaledVector(aim, t).distanceTo(hdp), need = L * .62;
    if (dist >= need) break; T.addScaledVector(side, need - dist + L * .04); T.y -= L * .05; armIK(B.RightArm, B.RightForeArm, B.RightHand, T, k); aimGun(mw, aim, k);
  }
  if (mw && mw.userData.muzzle && B.LeftForeArm && B.LeftHand && (P.lAimK || 0) < .1) {
    mw.updateMatrixWorld(true); const mzp = mw.userData.body.localToWorld(new THREE.Vector3().copy(mw.userData.muzzle)), hp = B.RightHand.getWorldPosition(new THREE.Vector3());
    const grip = hp.lerp(mzp, mode === 'hip' ? .3 : .44); grip.y -= L * .05;
    armIK(B.LeftArm, B.LeftForeArm, B.LeftHand, grip, k);
    // 받침손: 손바닥을 위로, 손가락은 총구 쪽으로 감싸 쥔다(기관포는 위 손잡이를 위에서 잡는다)
    handOrient(B.LeftHand, mode === 'hip' ? new THREE.Vector3(0, -1, 0) : UPY, aim, k * .85);
  }
  if (mode !== 'ready') headAim(dir, k * .85);
}
function wEnds(mw) { const t = MTIP[mw.userData.key]; if (!t) return null; mw.updateMatrixWorld(true); const b = mw.userData.body; return [b.localToWorld(new THREE.Vector3(t[0], t[1], t[2])), b.localToWorld(new THREE.Vector3(-t[0], -t[1], -t[2]))]; }
function aimTool(mw, dir, k) { const RH = armed.bones.RightHand, e = wEnds(mw); if (!e || !RH || k < .02) return; const v = e[0].sub(e[1]); if (v.lengthSq() < 1e-6) return; v.normalize(); rotW(RH, new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(v, dir), k)); }
function meleePose() {
  const s = P.sw, mw = armed && armed.main, B = armed && armed.bones, S = MSTY[ARM]; if (!s || !mw || !S || !B.RightArm || !B.LeftArm || !B.RightHand) return;
  const fw = new THREE.Vector3(Math.sin(P.yaw), 0, Math.cos(P.yaw)), u = s.t / s.T;
  const rs = B.RightArm.getWorldPosition(new THREE.Vector3()), ls = B.LeftArm.getWorldPosition(new THREE.Vector3()), side = rs.clone().sub(ls); side.y = 0; if (side.lengthSq() < 1e-6) return; side.normalize();
  const L = rs.distanceTo(B.RightForeArm.getWorldPosition(new THREE.Vector3())) + B.RightForeArm.getWorldPosition(new THREE.Vector3()).distanceTo(B.RightHand.getWorldPosition(new THREE.Vector3()));
  if (s.k === 'thrust') {
    // 뒤로 당겼다가(0~35%) 한 번에 뻗고(35~50%) 잠깐 멈췄다가 거둔다. 상체는 틀었다가 찌르며 정면으로
    const ext = u < .35 ? -.3 * (u / .35) : u < .5 ? -.3 + 1.3 * ((u - .35) / .15) : u < .7 ? 1 : 1 - (u - .7) / .3, e1 = clamp(ext, 0, 1);
    torsoAim(fw, .5 - .42 * e1, .03 + .14 * e1, 1);
    // 창은 뒷손을 허리에 붙이고 자루가 몸 바깥(오른쪽 옆구리)으로 지나가게, 칼은 가슴 앞에서 곧게 찌른다
    const sp = ARM === 'spear', T = rs.clone().addScaledVector(fw, L * ((sp ? .05 : .2) + .62 * ext)).addScaledVector(side, sp ? L * .16 : -L * .1); T.y -= L * (sp ? .55 : .42);
    armIK(B.RightArm, B.RightForeArm, B.RightHand, T, 1); aimTool(mw, fw.clone().setY(sp ? .07 : -.06).normalize(), 1);
  } else if (s.k === 'spin') {
    // 무기를 몸 바깥으로 수평으로 뻗어 돌린다
    const T = rs.clone().addScaledVector(side, L * .5).addScaledVector(fw, L * .3); T.y -= L * .3;
    armIK(B.RightArm, B.RightForeArm, B.RightHand, T, 1); aimTool(mw, side.clone().multiplyScalar(.8).addScaledVector(fw, .6).setY(-.05).normalize(), 1);
  }
  // 두 손 잡이: 칼·해머는 오른손 바로 아래 자루를, 창은 앞쪽 자루를 잡는다
  if (S.two && B.LeftForeArm && B.LeftHand && (P.lAimK || 0) < .1) {
    const e = wEnds(mw); if (!e) return; const hp = B.RightHand.getWorldPosition(new THREE.Vector3()), ax = e[0].clone().sub(hp), len = ax.length(); if (len < 1e-4) return; ax.normalize();
    const grip = ARM === 'spear' ? hp.clone().addScaledVector(ax, len * .38) : hp.clone().addScaledVector(ax, -L * .13);
    armIK(B.LeftArm, B.LeftForeArm, B.LeftHand, grip, 1);
  }
}
// ── 잔상 분신: 뼈대만 복제해 그 순간 자세로 얼리고, 몸 모델(형상)은 원본을 함께 쓴다
const GHOSTS = [];
function spawnGhost() {
  if (!P.wrap || GHOSTS.length > 8 || G.state !== 'play') return;
  const root = P.spin.children[0]; if (!root) return; root.updateMatrixWorld(true);
  const col = (ELEM[P.el] || {}).hex || 0x7fe6ff, mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const grp = new THREE.Group(); grp.matrixAutoUpdate = false;
  const skins = []; root.traverse((o) => { if (o.isSkinnedMesh && o.visible) skins.push(o); });
  const done = new Map();
  for (const sm of skins) {
    const sk = sm.skeleton, top = sk.bones.find((b) => !b.parent || !b.parent.isBone) || sk.bones[0]; let map = done.get(top);
    if (!map) {
      const cl = top.clone(true); map = new Map(); const walk = (a, b) => { map.set(a, b); if (b.isMesh) b.material = mat; for (let i = 0; i < a.children.length; i++) if (b.children[i]) walk(a.children[i], b.children[i]); }; walk(top, cl);
      const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.copy(top.parent ? top.parent.matrixWorld : new THREE.Matrix4()); holder.add(cl); grp.add(holder); done.set(top, map);
    }
    const bones = sk.bones.map((b) => map.get(b) || b), skel = new THREE.Skeleton(bones, sk.boneInverses);
    const gm = new THREE.SkinnedMesh(sm.geometry, mat); gm.bindMode = sm.bindMode; gm.matrixAutoUpdate = false; gm.matrix.copy(sm.matrixWorld); gm.frustumCulled = false; gm.bind(skel, sm.bindMatrix);
    grp.add(gm);
  }
  scene.add(grp); GHOSTS.push({ grp, mat, t: 0, T: .34 });
}
function updGhosts(dt) {
  for (let i = GHOSTS.length - 1; i >= 0; i--) { const o = GHOSTS[i]; o.t += dt; const k = o.t / o.T; o.mat.opacity = .5 * Math.max(0, 1 - k) ** 1.5;
    if (k >= 1) { scene.remove(o.grp); o.mat.dispose(); GHOSTS.splice(i, 1); } }
}
// ── 로봇다운 몸놀림: 달릴 때 상체·머리는 덜 흔들리고(단단한 몸통), 팔은 덜 휘두른다(무기를 앞에 들고)
const ROBO_STIFF = [['Spine02', .35], ['Spine01', .45], ['Spine', .5], ['neck', .6], ['Head', .6]], ROBO_ARM = [['LeftArm', .4], ['RightArm', .4], ['LeftForeArm', .35], ['RightForeArm', .35]];
function roboBody(dt) {
  const B = armed && armed.bones; if (!B || G.state !== 'play' || P.fly) return;
  const run = !!(inp.x || inp.z) && P.dashT <= 0 && !P.mv;
  P.rbK = lerp(P.rbK || 0, run ? 1 : .35, Math.min(1, dt * 8)); const k = P.rbK;
  for (const [n, w] of ROBO_STIFF) { const b = B[n]; if (b && b.userData.q0 && !(P.sw && n !== 'Head')) b.quaternion.slerp(b.userData.q0, w * k); }
  if (!P.sw && (P.aimK || 0) < .1 && (P.lAimK || 0) < .1) for (const [n, w] of ROBO_ARM) { const b = B[n]; if (b && b.userData.q0) b.quaternion.slerp(b.userData.q0, w * k); }
  // 발 디딤: 발이 땅에 닿는 순간 쿵(먼지·작은 진동·낮은 소리)
  if (run) for (const s of ['Left', 'Right']) { const f = B[s + 'Foot']; if (!f) continue; f.getWorldPosition(_va); const y = _va.y - P.group.position.y, key = 'ft' + s, low = (armed.footRest ?? 0) + 1.1;
    if (y < low && (P[key] ?? 9) >= low && (P['fs' + s] = (P['fs' + s] || 0)) <= G.t) { P['fs' + s] = G.t + .16; burst(_va.x, .6, _va.z, 4, 0xb8a07a, 22, .35, 7, .2); G.shake = Math.max(G.shake, .5); if (gate('stomp', 120)) tone(90, 40, .09, 'sine', .07); }
    P[key] = y; }
  // 달리는 동안 등 추진기 불빛
  if (run && B.Spine && (P.thT = (P.thT || 0) - dt) <= 0) { P.thT = .05; B.Spine.getWorldPosition(_va); const bx = _va.x - Math.sin(P.yaw) * 2.6, bz = _va.z - Math.cos(P.yaw) * 2.6;
    flare(bx, _va.y - 1, bz, 0x7fd8ff, 6, .06); burst(bx, _va.y - 1.5, bz, 1, 0x9fe8ff, 18, .2, 5, -.2); }
}
function placeArms(dt) {
  if (!armed) return;
  if (lobby.on && G.state === 'title') lobbyStand();
  else roboBody(dt);
  P.group.updateMatrixWorld(true);
  const B = armed.bones, fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), mw = armed.main;
  // 왼손 레이저(손바닥 빔·알파 빔·빛 깃털): 쏘는 동안 왼팔을 적 쪽으로 뻗는다
  P.lAimK = lerp(P.lAimK || 0, P.palmT > 0 && !P.fly ? 1 : 0, Math.min(1, dt * 16));
  if (P.lAimK > .02 && B.LeftArm && B.LeftForeArm && B.LeftHand) {
    const tg = nearest(P.x, P.z, 160); B.LeftShoulder && B.LeftShoulder.getWorldPosition(_va); const sx = B.LeftShoulder ? _va.x : P.x, sz = B.LeftShoulder ? _va.z : P.z;
    const ax = tg ? tg.x - sx : fx, az = tg ? tg.z - sz : fz, al = Math.hypot(ax, az) || 1, dir = v3b.set(ax / al, -.04, az / al).normalize(), k = Math.min(1, P.lAimK * 1.05);
    for (let it = 0; it < 2; it++) { pointArm(B.LeftArm, B.LeftHand, dir, k); pointArm(B.LeftForeArm, B.LeftHand, dir, k); }
    palmFace(B.LeftHand, dir, k);
  }
  if (P.sw && G.state === 'play') meleePose();
  if (B.LeftHand) { B.LeftHand.getWorldPosition(_va); const tg = nearest(P.x, P.z, 160), a = tg ? Math.atan2(tg.x - _va.x, tg.z - _va.z) : P.yaw, ex = P.lAimK > .5 ? 2.6 : 1.5; P.palm = { x: _va.x + Math.sin(a) * ex, y: _va.y, z: _va.z + Math.cos(a) * ex }; }
  // 아틸러리 어깨 곡사포: 왼쪽 어깨 위에 얹고 앞을 향한다(총구 -X)
  if (howW) {
    const on = ARM === 'hammer' && (G.state !== 'title' || lobby.on) && P.group.visible && !P.fly; howW.visible = on;
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
    const tg = nearest(P.x, P.z, 160), pose = G.state === 'thumb', want = (G.state === 'play' || pose) && P.dashT <= 0 && !P.fly && !P.mv && !P.sw && (!!tg || pose) ? 1 : 0;
    P.aimK = lerp(P.aimK || 0, want, Math.min(1, dt * (want ? 12 : 5))); if (pose) P.aimK = 1;
    if (P.aimK > .02 && B.RightArm && B.RightForeArm && B.RightHand) {
      const ax = tg ? tg.x - P.x : fx, az = tg ? tg.z - P.z : fz, al = Math.hypot(ax, az) || 1;
      const two = gk === 2 && !(CURM && CURM.off === 'shield');
      if (two) gunTwoHand(ARM === 'gatling' ? 'hip' : 'shoulder', v3b.set(ax / al, ARM === 'gatling' ? -.03 : -.06, az / al).normalize(), P.aimK);
      else { const rc = recoilK(), dir = v3b.set(ax / al, -.1 + .16 * rc, az / al).normalize(); torsoAim(dir, .22, .03 - .05 * rc, P.aimK);
        pointArm(B.RightArm, B.RightHand, dir, .95 * P.aimK); pointArm(B.RightForeArm, B.RightHand, dir, .95 * P.aimK); aimGun(mw, new THREE.Vector3().copy(dir).setY(dir.y + .06 * rc).normalize(), .9 * P.aimK); headAim(dir, .8 * P.aimK); }
    }
    // 대기 화면: 두 손 총은 비스듬히 내려 든 준비 자세
    if (lobby.on && G.state === 'title' && gk === 2 && !(CURM && CURM.off === 'shield')) gunTwoHand('ready', v3b.set(fx, 0, fz), 1);
  }
  // 방패: 왼쪽 아래팔 옆에 세워 앞을 본다
  if (shieldW) {
    const on = CURM && CURM.off === 'shield' && (G.state !== 'title' || lobby.on) && P.group.visible && !P.fly;
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
    updMission(dt); updCombo(dt);
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
  if (G.hstop > 0) { G.hstop -= raw; dt *= .05; } else if (G.slow > 0) { G.slow -= raw; dt *= .3; }
  const time = now / 1000;

  step(dt, raw);

  G.shake = Math.max(0, G.shake - raw * 14);
  const tx = P.x + rand(-1, 1) * G.shake, tz = P.z + rand(-1, 1) * G.shake;
  const ca = (P.alt || 0) * .9;      // 날고 있으면 카메라도 함께 올라 전투기가 화면 가운데에 오게
  cam.position.set(tx + camPos.x, camPos.y * camScale + ca, tz + camPos.z * camScale); cam.lookAt(tx, 7 + ca, tz - 6);

  if (G.state !== 'title') { drawInstances(time); draw2d(G.state === 'play' ? dt : 0); }
  if (lobby.on && G.state === 'title') { lobbyFrame(raw); renderer.render(lobby.sc, lobby.cam); }
  else if (bloomOn && composer) composer.render(); else renderer.render(scene, cam);
}

// ───────── 아이콘: 이모티콘 대신 직접 그린 선 아이콘(24×24, 같은 굵기) ─────────
const ICO = {
  // 공통
  core: '<path d="M12 2.5l7.5 5v9L12 21.5 4.5 16.5v-9z"/><path d="M12 2.5v19M4.5 7.5l7.5 5 7.5-5"/>',
  gem: '<path class="f" d="M12 1.8l2.6 7.6 7.6 2.6-7.6 2.6L12 22.2l-2.6-7.6L1.8 12l7.6-2.6z"/>',
  gacha: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M5 12h14"/><circle cx="12" cy="12" r="2.6"/><path d="M9 6.5h6M9 17.5h6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8.5 14.5l2 2 4.5-4.5"/>',
  map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  soundOn: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  soundOff: '<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
  pause: '<path d="M8.5 5v14M15.5 5v14" stroke-width="3"/>',
  skull: '<path d="M5 11a7 7 0 0 1 14 0v3.5l-2 1.5V19H7v-3l-2-1.5z"/><circle cx="9.3" cy="11.5" r="1.6" class="f"/><circle cx="14.7" cy="11.5" r="1.6" class="f"/><path d="M10 19v-2.2M14 19v-2.2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.5l3.5 2"/>',
  star: '<path class="f" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/>',
  lv: '<path d="M12 3v18M5 10l7-7 7 7"/>',
  reroll: '<path d="M20 8.5A8.5 8.5 0 0 0 4.5 9M4 15.5A8.5 8.5 0 0 0 19.5 15"/><path d="M20 3.5v5h-5M4 20.5v-5h5"/>',
  // 이동 단추
  dash: '<path d="M3 8.5h6M2 12h8M3 15.5h6"/><path d="M12 5.5l6.5 6.5-6.5 6.5M16 5.5l6 6.5-6 6.5" opacity=".55"/><path d="M12 5.5l6.5 6.5-6.5 6.5"/>',
  fly: '<path class="f" d="M12 1.8c.9 0 1.5 1.8 1.6 4.6l7.6 5.2v2.1l-7.6-2.3-.3 5.2 2.6 2v1.6L12 19.4 8.1 20.2v-1.6l2.6-2-.3-5.2-7.6 2.3v-2.1l7.6-5.2C10.5 3.6 11.1 1.8 12 1.8z"/>',
  land: '<path d="M12 3v11M7 9.5l5 5 5-5"/><path d="M3.5 20h17" stroke-width="2.6"/>',
  // 기본 무기
  pistol: '<path d="M3 7.5h14l1.5 2H21v2.5h-4.5l-2 1H11l-1.5 6H5.5L7 12H3z"/><path d="M9.5 12.5l1.2 2.3"/>',
  rifle: '<path d="M2 10.5h13l2-2h5v3l-3 1H13l-1 2.5H9.5L10 13H6l-1 3H2.5L3 12z"/><path d="M6 8.5h5"/>',
  katana: '<path d="M4 20l2.5-2.5M5.5 16l2.5 2.5"/><path d="M7.5 16.5C12 12 16 8 21 3c-1 4.5-5 9-11.5 15.5"/>',
  saber: '<path d="M5 19l3-3"/><path d="M7 14.5l2.5 2.5"/><path d="M9 15L20.5 3.5" stroke-width="3.2" opacity=".35"/><path d="M9 15L20.5 3.5"/>',
  shotgun: '<path d="M2 9h14l4-1.5V13l-4-1.5H8l-1.5 5H3.5L5 11.5H2z"/><path d="M19.5 9.5h2.5M19.5 11h2.5"/>',
  gatling: '<rect x="3" y="7.5" width="9" height="9" rx="2"/><path d="M12 9h9M12 12h9M12 15h9"/><circle cx="7.5" cy="12" r="1.8"/>',
  rail: '<path d="M1.5 11h17l1.5-1.5h2.5v3H20l-1.5-.5H9l-1 3.5H5l.5-3.5H1.5z"/><path d="M9 8.5h5.5M11.5 8.5V11"/><path d="M20 6.5l2-2M20 15.5l2 2" opacity=".6"/>',
  mortar: '<path d="M5 20l3-9 6 2-3 7z"/><path d="M14 13l4-8"/><circle cx="19.5" cy="3.8" r="1.5" class="f"/><path d="M3 20.5h12"/>',
  homing: '<path d="M4 20c2-8 6-12 14-14"/><path d="M14.5 4.5L18 6l-1.5 3.5"/><path d="M4 20l-1 1M6.5 16.5l-1.5 0M8.5 13.5l-1.5-.3" opacity=".6"/>',
  burst: '<path d="M2 11h11l2-2h4v3h-3l-1 1H8l-1 3.5H4L5 13H2z"/><circle cx="20" cy="6" r="1.1" class="f"/><circle cx="22" cy="9" r="1.1" class="f"/><circle cx="21" cy="12.5" r="1.1" class="f"/>',
  bits: '<path d="M12 3l3 4-3 4-3-4z"/><path d="M5 12l3 4-3 4-3-4z"/><path d="M19 12l3 4-3 4-3-4z"/><path d="M12 11v3M8 16h8" opacity=".55"/>',
  beam: '<circle cx="5" cy="12" r="3"/><path d="M8 12h14" stroke-width="3.2" opacity=".35"/><path d="M8 12h14"/><path d="M12 8.5h7M12 15.5h7" opacity=".5"/>',
  feather: '<path d="M20 4C11 5 6 10 5 19c4-1 8-3 10.5-6.5"/><path d="M5 19L15 9M9 13.5h4.5M11.5 10.5h4"/>',
  // 스킬(E)
  flash: '<path class="f" d="M13.5 2L5 13.5h6L9.5 22 19 10h-6.2z"/>',
  iaido: '<path d="M3 21L21 3"/><path d="M5 9c3-4.5 8-6.5 14-6" opacity=".6"/><path d="M15 21c4.5-3 6.5-8 6-14" opacity=".6"/>',
  overdrive: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M19 10.5h2v3h-2"/><path class="f" d="M11.5 8l-3.5 5h3l-1 3.5 3.5-5h-3z"/>',
  palm: '<path d="M7 12V6.5a1.3 1.3 0 0 1 2.6 0V11m0-6a1.3 1.3 0 0 1 2.6 0v6m0-5a1.3 1.3 0 0 1 2.6 0v6m0-3.5a1.3 1.3 0 0 1 2.6 0V15c0 3.5-2.5 6-6 6s-5-1.5-6.5-4L4 13.5c-.6-1 .5-2.2 1.6-1.5L7 13"/>',
  backstep: '<path d="M19 6.5A7.5 7.5 0 1 0 19.5 15"/><path d="M19 2.5v4h-4"/><circle cx="12" cy="12" r="1.8" class="f"/>',
  mortar3: '<circle cx="6" cy="16" r="3"/><circle cx="12" cy="8" r="3"/><circle cx="18" cy="16" r="3"/><path d="M6 13V9M18 13V9" opacity=".5"/>',
  bash: '<path d="M8 3.5l7 2.5v6.5c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6z"/><path d="M17 12h6M20 9l3 3-3 3"/>',
  quake: '<path d="M2 18h20"/><path d="M12 18l-2-4 3-3-2-4"/><path d="M5 14l-2-3M19 14l2-3M7.5 11.5L6 8.5M16.5 11.5L18 8.5"/>',
  dive: '<path d="M12 21V8"/><path d="M6 15l6 6 6-6"/><path d="M4 4c3 2 5.5 2.5 8 2.5S17 6 20 4"/>',
  cloak: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  bitstorm: '<path d="M12 2l2.5 3.5L12 9 9.5 5.5z"/><path d="M4 9l2.5 3.5L4 16 1.5 12.5z"/><path d="M20 9l2.5 3.5L20 16l-2.5-3.5z"/><path d="M12 15l2.5 3.5L12 22l-2.5-3.5z"/><circle cx="12" cy="12" r="1.6" class="f"/>',
  blink: '<path class="f" d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/><path class="f" d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  featherstorm: '<path d="M12 12c-1-5-4-8-9-9 1 5 4 8 9 9zM12 12c5-1 8-4 9-9-5 1-8 4-9 9zM12 12c-5 1-8 4-9 9 5-1 8-4 9-9zM12 12c1 5 4 8 9 9-1-5-4-8-9-9z"/>',
  // 필살기(Q)
  bladefall: '<path d="M6 2v11M12 4v13M18 2v11"/><path d="M4 13h4M10 17h4M16 13h4"/><path d="M6 13l-1 2.5h2zM12 17l-1 2.5h2zM18 13l-1 2.5h2z" class="f"/>',
  tenzan: '<path d="M19 4a9 9 0 1 0 1.5 12A7 7 0 0 1 19 4z"/><path d="M2 20L21 7" opacity=".7"/>',
  laserstorm: '<circle cx="12" cy="12" r="3.2" class="f"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5M4.5 4.5l3.5 3.5M16 16l3.5 3.5M4.5 19.5L8 16M16 8l3.5-3.5"/>',
  phoenix: '<path d="M12 21c-4-2-6-5-6-9 0 0 2 2 4 2-1-3 0-7 2-11 2 4 3 8 2 11 2 0 4-2 4-2 0 4-2 7-6 9z"/><path d="M12 21c-1-2-1-4 0-6 1 2 1 4 0 6z" class="f"/>',
  satsnipe: '<circle cx="12" cy="13" r="6.5"/><path d="M12 4v3.5M12 18.5V22M3 13h3.5M17.5 13H21"/><circle cx="12" cy="13" r="1.4" class="f"/><path d="M17 3l3-1.5L21.5 4l-3 1.5z"/>',
  carpet: '<circle cx="5" cy="7" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="19" cy="7" r="2"/><circle cx="8.5" cy="15" r="2"/><circle cx="15.5" cy="15" r="2"/><path d="M2 21h20"/>',
  aegis: '<path d="M12 2.5l8 3v6.5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5.5z"/><path d="M12 7v10M7.5 11.5h9"/>',
  titanfall: '<circle cx="15" cy="9" r="4.5"/><path d="M11.5 12.5L4 20M9 10.5L3.5 16M13.5 15L8 20.5"/><path d="M2 21.5h9" opacity=".6"/>',
  mstorm: '<path d="M5 19L12 5l7 14"/><path d="M3.5 13L8 4M20.5 13L16 4"/><circle cx="12" cy="4" r="1.4" class="f"/><circle cx="8" cy="3.5" r="1.2" class="f"/><circle cx="16" cy="3.5" r="1.2" class="f"/>',
  execute: '<path d="M18 3a9 9 0 1 0 3 9 7 7 0 0 1-3-9z"/><path d="M4 20l9-9M13 11l2-.5-.5 2z"/>',
  allrange: '<circle cx="12" cy="12" r="8.5" stroke-dasharray="2 3"/><circle cx="12" cy="3.5" r="1.8" class="f"/><circle cx="19.4" cy="16.2" r="1.8" class="f"/><circle cx="4.6" cy="16.2" r="1.8" class="f"/><circle cx="12" cy="12" r="2.4"/>',
  nova: '<path class="f" d="M12 1.5l2 7 7-2-5 5.5 5 5.5-7-2-2 7-2-7-7 2 5-5.5-5-5.5 7 2z"/>',
  descent: '<ellipse cx="12" cy="4.5" rx="4" ry="1.6"/><path d="M12 8v13"/><path d="M12 11c-3-3-7-3-10-1 3 0 5 2 6 4M12 11c3-3 7-3 10-1-3 0-5 2-6 4"/>',
  // 레벨업 강화·격납고
  blade: '<circle cx="12" cy="12" r="3"/><path d="M12 12c0-6 3-9 7-9-1 4-3 6-7 9zM12 12c0 6-3 9-7 9 1-4 3-6 7-9z" class="f" opacity=".85"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="1.5 3"/>',
  missile: '<path d="M13 3.5c3 0 5.5 2.5 5.5 5.5L10 17.5 6.5 14z"/><path d="M6.5 14L3 15l1 3 3-1M10 17.5L9 21l-3-1 1-3"/><circle cx="14" cy="8" r="1.5"/>',
  pulse: '<circle cx="12" cy="12" r="2.5" class="f"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5" opacity=".5"/>',
  strike: '<path d="M12 2v6"/><path d="M8 5l4 4 4-4"/><circle cx="12" cy="17" r="4"/><path d="M12 13v8M8 17h8"/>',
  armor: '<path d="M12 2.5l8 3v6.5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5.5z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  thruster: '<path d="M8 3h8v9l-2 2h-4l-2-2z"/><path d="M10 14l-1 4M14 14l1 4M12 14v6"/><path d="M5 9h3M16 9h3" opacity=".5"/>',
  magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 7h4V3M18 7h-4V3"/>',
  reactor: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M12 5l-2-2M12 5l2-2M12 19l-2 2M12 19l2 2" opacity=".6"/>',
  crit: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/>',
  repair: '<path d="M14.5 6.5a4 4 0 0 1 4.8-3.2l-2.6 2.6.5 2.4 2.4.5 2.6-2.6A4 4 0 0 1 17 11L8 20a2.1 2.1 0 0 1-3-3z"/>',
  heal: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  power: '<path class="f" d="M12 2l2.2 5.2L20 5l-2.2 5.8L23 12l-5.2 1.2L20 19l-5.8-2.2L12 22l-2.2-5.2L4 19l2.2-5.8L1 12l5.2-1.2L4 5l5.8 2.2z" opacity=".9"/>',
};
// 키 별칭: 강화 카드 키·무기 키를 같은 그림으로
Object.assign(ICO, { rifleUp: ICO.rifle, cannon: ICO.shotgun, great: ICO.katana, staff: ICO.bits, hammer: ICO.mortar, _heal: ICO.heal });
const GK = { rifleUp: 'rifle', cannon: 'shotgun', great: 'katana', staff: 'bits', hammer: 'mortar', _heal: 'heal', spear: 'katana', power: 'overdrive', thrust: 'thruster', cool: 'reactor', lv: 'upgrade', hangar: 'upgrade' };
const gic = (k) => { const G0 = window.GICO; if (!G0) return null; const n = GK[k] || k; return G0[n] ? n : null; };
const ico = (k, cls = '') => { const n = gic(k); return n ? `<svg class="ico gi ${cls}" viewBox="0 0 512 512" aria-hidden="true"><path d="${GICO[n]}"/></svg>` : `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICO[k] || ICO.star}</svg>`; };

// ───────── 계열(속성) 7종: 기체마다 하나. 계열마다 노는 맛이 다르다
const ELEM = {
  fire:  { nm: '불', col: '#ff7a3a', hex: 0xff7a3a, wn: '홍염의', ds: '광역 공격이 강하다 · 처치한 적이 20% 확률로 폭발 · 공격 10% 확률로 화상',
    sk: { nm: '화염 폭풍', cd: 13, ds: '주변을 세 번 휩쓰는 불길 · 맞은 적은 화상' } },
  water: { nm: '물', col: '#4ab8ff', hex: 0x4ab8ff, wn: '청류의', ds: '치유와 탱커 · 초당 회복 +1.5 · 받는 피해 -12% · 회복 아이템 +50%',
    sk: { nm: '치유의 해일', cd: 15, ds: '해일로 적을 밀어내고 기절 · 내구 22% 회복 · 보호막' } },
  wind:  { nm: '바람', col: '#7dffc8', hex: 0x7dffc8, wn: '질풍의', ds: '전자기 바람 · 이동 +8% · 공격 12% 확률로 적 약화(공격력 -40%)',
    sk: { nm: '전자기 폭풍', cd: 14, ds: '회오리가 적을 빨아들이고 혼란에 빠뜨려 서로 싸우게 한다' } },
  elec:  { nm: '전기', col: '#ffe14a', hex: 0xffe14a, wn: '뇌명의', ds: '여럿을 한꺼번에 · 공격 12% 확률로 번개가 3마리에 튄다 · 재사용 -5%',
    sk: { nm: '연쇄 번개', cd: 11, ds: '번개가 적 14마리를 잇달아 꿰뚫고 감전시켜 멈춘다' } },
  ice:   { nm: '얼음', col: '#9fe8ff', hex: 0x9fe8ff, wn: '서리의', ds: '공격 22% 확률로 둔화 · 얼어붙은 적은 이동 정지, 받는 피해 +30%',
    sk: { nm: '절대 영도', cd: 15, ds: '주변 적을 통째로 얼려 멈추고 방어를 깎는다' } },
  light: { nm: '빛', col: '#fff0a8', hex: 0xfff0a8, wn: '성광의', ds: '치명타 +8% · 치명타 때 15% 확률로 빛기둥',
    sk: { nm: '심판의 빛', cd: 13, ds: '빛기둥 8개가 내리꽂혀 적을 기절시키고 내구 10% 회복' } },
  dark:  { nm: '어둠', col: '#b47aff', hex: 0xb47aff, wn: '흑월의', ds: '네크로맨서 · 쓰러뜨린 적 기계를 30% 확률로 해킹해 부하로 되살린다',
    sk: { nm: '그림자 군단', cd: 16, ds: '그림자 기동병 3기를 불러내 함께 싸운다' } },
};
const EL_KEYS = Object.keys(ELEM);
const EL_OF = { mech4: 'elec', m_samurai: 'wind', m_striker: 'light', mech3: 'fire', m_guardian: 'water', m_titan: 'fire', m_ranger: 'ice', m_artillery: 'fire', m_sky: 'wind',
  m_phantom: 'dark', m_wizard: 'elec', m_origin: 'ice', mech_leg: 'light', astra: 'water', god: 'light', god_white: 'elec', god_red: 'dark', god_black: 'dark' };
for (const m of MECHS) m.el = EL_OF[m.id] || 'fire';
// 초반 난이도 완화: 1부 앞쪽 장은 적이 약하고 덜 아프다(1부 8장부터 원래 난이도)
const EZ = () => { const c = CHAPTERS[G.chi]; if (!c || c.part !== 1) return 1; return Math.min(1, .66 + G.chi * .02); };

// ───────── 세련된 스킬 아이콘: 계열색 그라데이션 + 은은한 빛번짐
Object.assign(ICO, {
  el_fire: '<path d="M12 22c-4.4 0-7-3-7-6.6 0-3.2 2.2-5.4 3.6-7.4.4 1.8 1.4 3 2.6 3.4-.4-3.6 1.2-6.8 3.8-9.4.4 3.4 2.2 5.6 3.6 7.6 1 1.4 1.4 3 1.4 4.6C20 19.4 16.6 22 12 22z"/><path class="f" d="M12 22c-1.9 0-3.2-1.3-3.2-3 0-1.8 1.5-3 2.2-4.4.8 1.2 1.6 1.6 2.3 1.7.3-.9.2-1.8 0-2.6 1.4 1.1 2.3 2.6 2.3 4.4 0 2.2-1.6 3.9-3.6 3.9z"/>',
  el_water: '<path d="M12 2.5c3.5 4.6 6.5 8.2 6.5 11.8a6.5 6.5 0 0 1-13 0C5.5 10.7 8.5 7.1 12 2.5z"/><path class="f" d="M8.4 15c1.2 1 2.4 1 3.6.2 1.1-.8 2.3-.8 3.6.2-.3 2.1-1.9 3.6-3.6 3.6S8.7 17.5 8.4 15z"/>',
  el_wind: '<path d="M3 8.5h10.5a3 3 0 1 0-3-3"/><path d="M3 12.5h15.5a3 3 0 1 1-3 3"/><path d="M3 16.5h6.5a2.5 2.5 0 1 1-2.5 2.5"/>',
  el_elec: '<path class="f" d="M13.5 1.8L4.6 13.6h5.8L9.3 22.2l9.6-12.6h-5.8z"/>',
  el_ice: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.6 3.6L12 6l2.4-2.4M9.6 20.4L12 18l2.4 2.4M4.2 10.4l3.3.8-.8 3.3M19.8 13.6l-3.3-.8.8-3.3M4.2 13.6l3.3-.8-.8-3.3M19.8 10.4l-3.3.8.8 3.3"/>',
  el_light: '<circle class="f" cx="12" cy="12" r="4.2"/><path d="M12 1.5v3.4M12 19.1v3.4M1.5 12h3.4M19.1 12h3.4M4.6 4.6l2.4 2.4M17 17l2.4 2.4M4.6 19.4L7 17M17 7l2.4-2.4"/>',
  el_dark: '<path d="M15.5 2.6A9.6 9.6 0 1 0 21.4 15a7.6 7.6 0 0 1-5.9-12.4z"/><circle class="f" cx="10.4" cy="12.6" r="2.3"/><path d="M6 6.5l1.2 1.2M4.2 12H6M6 17.5l1.2-1.2" opacity=".7"/>',
  wpn: '<path d="M14.6 2.8H21v6.4L10.2 20 3.9 13.8z"/><path class="f" d="M17.4 4.6h1.8v1.8L9.9 15.7l-1.8-1.8z" opacity=".8"/><path d="M7 11l6 6M3 21l3.2-3.2"/>',
  release: '<path d="M12 1.8l2.4 6.4 6.8.5-5.2 4.4 1.6 6.7L12 16.2l-5.6 3.6L8 13.1 2.8 8.7l6.8-.5z"/><path class="f" d="M12 7.4l1 2.7 2.9.2-2.2 1.9.7 2.8-2.4-1.5-2.4 1.5.7-2.8-2.2-1.9 2.9-.2z"/>',
  stunUp: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 2.6"/><path class="f" d="M12 6l1.7 3.7 4 .4-3 2.7.9 4L12 14.8l-3.6 2 .9-4-3-2.7 4-.4z"/>',
  aoeUp: '<path d="M12 1.8l1.9 4.8L18.6 4l-1.5 5 5.1 1.1-4.3 2.9 3.3 4.1-5.2-.6.2 5.3L12 18.4l-4.2 3.4.2-5.3-5.2.6 3.3-4.1-4.3-2.9 5.1-1.1-1.5-5 4.7 2.6z"/><circle class="f" cx="12" cy="12" r="2.8"/>',
  elemUp: '<path d="M12 1.8l8.4 10.2L12 22.2 3.6 12z"/><path class="f" d="M12 6.6l4.4 5.4-4.4 5.4L7.6 12z" opacity=".85"/>',
});
let _ig = 0;
function shadeHex(c, k = .45) { const n = parseInt(c.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (v) => Math.round(v * k).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
function tintHex(c, k) { const n = parseInt(c.slice(1), 16), f = (v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255); }
function ico2(k, c = '#9ff3ff', cls = '') {
  const id = 'ig' + (++_ig), n = gic(k);
  if (n) return `<svg class="ico ico2 gi ${cls}" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="150" y1="0" x2="362" y2="512"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${tintHex(c, .45)}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><path fill="url(#${id})" d="${GICO[n]}"/></svg>`;
  const src = ICO[k] || ICO.star, fg = src.replace(/class="f"/g, `class="f" style="fill:url(#${id})"`);
  return `<svg class="ico ico2 ${cls}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="5" y1="1" x2="15" y2="23"><stop offset="0" stop-color="#ffffff"/><stop offset=".42" stop-color="${c}"/><stop offset="1" stop-color="${shadeHex(c, .62)}"/></linearGradient></defs>`
    + `<g style="stroke:url(#${id})">${fg}</g></svg>`;
}

// ───────── 무기 장비: 일반~신화. 특수 각인과 다른 계열 기술 자동 시전, 전설·신화는 고유 해방(만해 같은 궁극기)
const WR = ['N', 'A', 'R', 'SR', 'SSR', 'UQ', 'UR'];
const W_DMG = { N: 5, A: 7, R: 10, SR: 16, SSR: 24, UQ: 29, UR: 34 }, W_OPT_N = { N: 0, A: 1, R: 1, SR: 2, SSR: 2, UQ: 3, UR: 3 };
// 등급이 처음 나오는 장(조선좀비 관문 방식) · 강화 상한 · 별 상한
const GATE = [1, 3, 8, 16, 30, 60, 120], W_CAP = [10, 20, 30, 40, 50, 55, 60], STAR_MAX = [0, 0, 0, 0, 2, 3, 5];
const gI = (w) => Math.max(0, WR.indexOf(w.rar));
const maxG = () => { const c = save.chMax || 1; let r = 0; GATE.forEach((v, i) => { if (c >= v) r = i; }); return r; };
const wCap = (w) => W_CAP[gI(w)] + 10 * (w.s || 0);
const WOPT = {
  burn: { nm: '화염 각인', ds: '공격 12% 확률로 화상' }, frz: { nm: '서리 각인', ds: '공격 8% 확률로 1초 빙결' },
  chain: { nm: '뇌전 각인', ds: '공격 12% 확률로 번개가 3마리에 튄다' }, conf: { nm: '교란 각인', ds: '공격 8% 확률로 적이 혼란에 빠져 서로 싸운다' },
  stun: { nm: '충격 각인', ds: '공격 7% 확률로 1초 기절' }, boom: { nm: '폭렬 각인', ds: '처치한 적이 18% 확률로 폭발' },
  hack: { nm: '해킹 각인', ds: '쓰러뜨린 적 기계를 15% 확률로 부하로 되살린다' }, leech: { nm: '흡수 각인', ds: '처치할 때마다 내구 1 회복' },
  crit: { nm: '정밀 각인', ds: '치명타 +8%' }, cool: { nm: '냉각 각인', ds: '모든 재사용 -10%' }, guard: { nm: '수호 각인', ds: '받는 피해 -8%' },
};
for (const el of EL_KEYS) WOPT['auto_' + el] = { nm: `${ELEM[el].sk.nm} 자동 시전`, ds: `16초마다 ${ELEM[el].nm} 계열 기술을 70% 위력으로 저절로 쓴다`, auto: el };
const REL = {
  fire: { nm: '홍련 해방 · 겁화', ds: '8초 동안 불기둥이 연달아 적을 태운다' }, water: { nm: '청룡 해방 · 해일', ds: '물의 용이 세 방향을 휩쓸고 내구 40% 회복' },
  wind: { nm: '질풍 해방 · 신풍', ds: '8초 동안 칼바람 고리가 돌며 베고 혼란시킨다' }, elec: { nm: '뇌신 해방 · 천뢰', ds: '8초 동안 하늘에서 벼락이 쏟아져 감전시킨다' },
  ice: { nm: '빙화 해방 · 백야', ds: '화면의 적을 모두 얼리고 얼음꽃이 터진다' }, light: { nm: '성검 해방 · 여명', ds: '거대한 빛의 검이 네 방향을 베고 내구 20% 회복' },
  dark: { nm: '흑월 해방 · 월식', ds: '검은 초승달 세 줄기와 그림자 기동병 3기' },
};
save.wpn ??= { inv: [], eq: {}, uid: 1 }; save.mlv ??= {};
function mkWeapon(rar, el) {
  el ||= EL_KEYS[Math.random() * EL_KEYS.length | 0];
  const w = { u: save.wpn.uid++, rar, el, lv: 0, opts: [] }, n = W_OPT_N[rar];
  if (n && (WR.indexOf(rar) >= 4 || (rar === 'SR' && Math.random() < .6))) w.opts.push('auto_' + el);
  const pool = Object.keys(WOPT).filter((k) => !k.startsWith('auto_'));
  while (w.opts.length < n && pool.length) w.opts.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  if (WR.indexOf(rar) >= 4) w.rel = el; w.s = 0;
  return w;
}
if (!save.wpn.inv.length && !save.wpn.gift) { save.wpn.gift = 1; const w = mkWeapon('R', MECH(save.mech).el); save.wpn.inv.push(w); save.wpn.eq[save.mech] = w.u; }
const wOf = (id) => save.wpn.inv.find((w) => w.u === save.wpn.eq[id]);
const wDmg = (w) => Math.round((W_DMG[w.rar] + w.lv * 1.6) * (1 + .12 * (w.s || 0)));
const wName = (w, m) => `${ELEM[w.el].wn} ${(ARM_NAME[(m || MECH(save.mech)).prim] || { nm: '무기' }).nm}`;
const wUpCost = (w) => ({ core: Math.round(25 * (w.lv + 1) * (1 + gI(w) * .45)), ore: 1 + Math.floor(w.lv / 5) });
const wSell = (w) => ({ core: 20 * (gI(w) + 1) + w.lv * 8, ore: 2 + gI(w) * 3 + Math.floor(w.lv / 5) });
const mlvCost = (lv) => Math.round(120 * Math.pow(1.32, lv)), MLV_MAX = 20;
function applyGear(m) {
  { const S0 = save.sk[m.id] || {}, le = (S0.e || 1) - 1, lr = (S0.r || 1) - 1, lq = (S0.q || 1) - 1, al = ((save.acc && save.acc.lv) || 1) - 1;
    P.skE = 1 + .2 * le; P.akK = 1 - .04 * le; P.skR = 1 + .2 * lr; P.skQ = 1 + .2 * lq; P.ultGain = (P.ultGain || 1) * (1 + .06 * lq);
    P.maxHp *= 1 + al * .005; P.dmgMul *= 1 + al * .005; }
  const lv = save.mlv[m.id] || 0; P.maxHp *= 1 + lv * .03; P.dmgMul *= 1 + lv * .03; P.elT = Math.floor(lv / 5);
  P.el = m.el; P.wo = {}; P.wAuto = []; P.rel = null; P.healK = 1; P.ekCd = 5;
  if (P.el === 'water') { P.regen += 1.5; P.taken = (P.taken || 1) * .88; P.healK = 1.5; }
  if (P.el === 'wind') P.spdMul *= 1.08;
  if (P.el === 'elec') P.cdMul *= .95;
  if (P.el === 'light') P.crit += .08;
  if (P.el === 'fire') P.splash = (P.splash || 1) * 1.15;
  const w = wOf(m.id); P.wpn = w || null;
  if (w) {
    P.dmgMul *= 1 + (wDmg(w) + (w.el === m.el ? 10 : 0)) / 100;
    for (const o of w.opts) { P.wo[o] = 1; if (WOPT[o].auto) P.wAuto.push({ el: WOPT[o].auto, t: 8 }); }
    if (P.wo.crit) P.crit += .08; if (P.wo.cool) P.cdMul *= .9; if (P.wo.guard) P.taken = (P.taken || 1) * .92;
    P.rel = w.rel || null;
  }
}

// ───────── 상태 이상: 화상·빙결·둔화·혼란·약화·기절·방어 약화
function applySt(e, k, t, v) {
  if (!e || e.dead || e.ally || e.T.stat) return; const boss = e.T.r > 10;
  if (k === 'burn') { e.burnT = Math.max(e.burnT || 0, t); e.burnD = Math.max(e.burnD || 0, v || 6); }
  else if (k === 'frz') { if (boss) e.slwT = Math.max(e.slwT || 0, t); else { if (!(e.frzT > 0)) burst(e.x, e.T.h * .6, e.z, 8, 0xbff6ff, 40, .4, 7, .3); e.frzT = Math.max(e.frzT || 0, t); } e.vulT = Math.max(e.vulT || 0, t + 2); }
  else if (k === 'slw') e.slwT = Math.max(e.slwT || 0, t);
  else if (k === 'conf') { if (boss) e.weakT = Math.max(e.weakT || 0, t); else e.confT = Math.max(e.confT || 0, t); }
  else if (k === 'weak') e.weakT = Math.max(e.weakT || 0, t);
  else if (k === 'vul') e.vulT = Math.max(e.vulT || 0, t);
  else if (k === 'stun') e.stun = Math.max(e.stun || 0, boss ? Math.min(t, .5) : t);
}
function stTick(e, dt) {
  if (e.frzT > 0) e.frzT -= dt; if (e.slwT > 0) e.slwT -= dt; if (e.confT > 0) { e.confT -= dt; if (Math.random() < .06) burst(e.x, e.T.h + 3, e.z, 1, 0x7dffc8, 14, .4, 6, .3); }
  if (e.weakT > 0) e.weakT -= dt; if (e.vulT > 0) e.vulT -= dt;
  if (e.burnT > 0) { e.burnT -= dt; e.hp -= e.burnD * dt; if (Math.random() < .2) burst(e.x, e.T.h * .5, e.z, 1, 0xff7a2a, 22, .4, 7, 1.2); if (e.hp <= 0) { kill(e); return true; } }
  return false;
}
// 혼란에 빠진 적: 가장 가까운 다른 적을 노린다
function confTarget(e) {
  if (e.cfTg && !e.cfTg.dead && (e.cfTg.x - e.x) ** 2 + (e.cfTg.z - e.z) ** 2 < 150 * 150) return e.cfTg;
  let b = null, bd = 130 * 130; for (const o of E) { if (o === e || o.dead || o.ally || o.T.stat) continue; const q = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (q < bd) { bd = q; b = o; } }
  e.cfTg = b; return b;
}
// 적끼리·부하가 때리는 피해
function unitHit(t, dmg, src) {
  if (!t || t.dead) return;
  if (t.ally) { t.hp -= dmg; t.flash = .06; if (t.hp <= 0) allyDie(t); return; }
  t.hp -= dmg * (t.vulT > 0 ? 1.3 : 1); t.flash = .08; if (Math.random() < .3) burst(t.x, t.T.h * .6, t.z, 3, src && src.ally ? 0xc9a0ff : 0x9dffb0, 40, .25, 6);
  if (Math.random() < .12) num(t.x, t.T.h, t.z, Math.round(dmg), src && src.ally ? '#d8b8ff' : '#b8ffd0', 13);
  if (t.hp <= 0) kill(t);
}
// 공격이 맞을 때: 계열 효과 + 무기 각인 + 강화 카드
function onHitFx(e, d, cr) {
  if (G._fx || e.dead) return; G._fx = 1;
  try {
    const el = P.el, pk = 1 + (P.elT >= 2 ? .5 : 0), wo = P.wo || {};
    if ((el === 'fire' && Math.random() < .1 * pk) || (wo.burn && Math.random() < .12)) applySt(e, 'burn', 3, Math.max(4, d * .22));
    if ((el === 'wind' && Math.random() < .12 * pk)) applySt(e, 'weak', 4);
    if ((el === 'wind' && Math.random() < .04 * pk) || (wo.conf && Math.random() < .08)) applySt(e, 'conf', 3.5);
    if ((el === 'ice' && Math.random() < .22 * pk)) applySt(e, 'slw', 1.6);
    if ((el === 'ice' && Math.random() < .05 * pk) || (wo.frz && Math.random() < .08)) applySt(e, 'frz', 1.1);
    if ((el === 'elec' && Math.random() < .12 * pk) || (wo.chain && Math.random() < .12)) chainZap(e, 3, d * .55, .3);
    if (el === 'light' && cr && Math.random() < .15 * pk) holyPillar(e.x, e.z, d * 1.3, .7);
    const sc = (P.w.stunUp ? .02 + .04 * P.w.stunUp : 0) + (wo.stun ? .07 : 0);
    if (sc && Math.random() < sc) { applySt(e, 'stun', 1); num(e.x, e.T.h + 4, e.z, '기절', '#fff07a', 13); }
  } finally { G._fx = 0; }
}
function elemKill(e) {
  if (e.ally || e.T.stat) return; const el = P.el, wo = P.wo || {}, small = e.T.r <= 10, base = st('rifle', 'dmg') + 8;
  const bc = (el === 'fire' ? .2 : 0) + (wo.boom ? .18 : 0) + (P.w.aoeUp ? .04 + .08 * P.w.aoeUp : 0);
  if (small && bc && Math.random() < bc) { const x = e.x, z = e.z; later(.05, () => { G._fx = 1; explode(x, z, 26 * (P.splash || 1), base * 2.2, 0xff7a3a); G._fx = 0; }); }
  if (wo.leech) P.hp = Math.min(P.maxHp, P.hp + 1);
  const hc = (el === 'dark' ? .3 : 0) + (wo.hack ? .15 : 0);
  if (hc && small && (e.T.mech || e.T.anim) && !e.flee && !e.elite && e.t !== 'jet' && Math.random() < hc) { const x = e.x, z = e.z, t = e.t; later(.35, () => { const a = mkAlly(t, x, z, 18); if (a) num(x, a.T.h + 6, z, '해킹', '#d8b8ff', 15); }); }
}
function chainZap(e0, n, dmg, stun) {
  let px = e0.x, pz = e0.z; const hit = new Set([e0]);
  for (let i = 0; i < n; i++) { let b = null, bd = 75 * 75; for (const o of E) { if (o.dead || o.ally || hit.has(o)) continue; const q = (o.x - px) ** 2 + (o.z - pz) ** 2; if (q < bd) { bd = q; b = o; } }
    if (!b) break; hit.add(b); beamFx(px, 8, pz, b.x, b.T.h * .5, b.z, .5, 0xffe14a, .12); dealDmg(b, dmg, 0, 0, .3); if (stun) applySt(b, 'stun', stun); px = b.x; pz = b.z; }
}
function holyPillar(x, z, dmg, stun) { beamFx(x, 160, z, x, 0, z, 2.2, 0xfff0a8, .28); ring(x, z, 3, 20, .3, 0xfff0a8); burst(x, 4, z, 12, 0xfff6c8, 60, .4, 9);
  for (const o of E) { if (o.dead || o.ally) continue; if (Math.hypot(o.x - x, o.z - z) < 18 + o.T.r) { dealDmg(o, dmg, 0, 0, .5); applySt(o, 'stun', stun); } } }

// ───────── 부하: 어둠 계열의 소환·해킹. 보라빛으로 빛나며 가까운 적을 친다
const ALLY_MAX = 9;
function mkAlly(type, x, z, life) {
  if (E.filter((o) => o.ally && !o.dead).length >= ALLY_MAX) return null; const T = ET[type]; if (!T) return null;
  const e = { t: type, T, x, z, vx: 0, vz: 0, kx: 0, kz: 0, yaw: 0, hp: 60 + P.maxHp * .6, flash: 0, bladeT: 0, st: 'move', tm: 1, ph: rand(0, 6), sc: 1.15, born: .3, sm: 1.2, ally: 1, life, acd: 0 };
  e.max = e.hp; E.push(e); ring(x, z, 3, 24, .45, 0xb47aff); burst(x, 8, z, 26, 0xb47aff, 80, .55, 9); flare(x, 10, z, 0xc9a0ff, 18, .2); return e;
}
function allyDie(e) { if (e.dead) return; e.dead = true; burst(e.x, 6, e.z, 22, 0xb47aff, 70, .5, 8); flare(e.x, 8, e.z, 0xb47aff, 14, .15); }
function allyTick(e, dt) {
  e.life -= dt; e.flash -= dt; e.born -= dt; e.ph += dt; e.acd -= dt;
  if (e.life <= 0 || e.hp <= 0) { allyDie(e); return; }
  let tg = null, bd = 1e12;
  for (const o of E) { if (o.dead || o.ally || o.T.stat) continue; const q = (o.x - e.x) ** 2 + (o.z - e.z) ** 2; if (q < bd) { bd = q; tg = o; }
    if (o.T.dmg > 0 && q < (o.T.r + e.T.r + 2) ** 2 && !(o.frzT > 0)) e.hp -= o.T.dmg * dt * .7; }
  let mx = 0, mz = 0, sp = 0;
  if (tg && bd < 230 * 230) { const d = Math.sqrt(bd), ux = (tg.x - e.x) / (d || 1), uz = (tg.z - e.z) / (d || 1), reach = e.T.r + tg.T.r + 4;
    if (d > reach) { mx = ux; mz = uz; sp = 74; }
    if (d < reach + 34 && e.acd <= 0) { e.acd = .5; const dm = (14 + st('rifle', 'dmg')) * (P.dmgMul || 1) * (1 + .25 * (G.threat - 1)) * (1 + .25 * (P.elT || 0));
      if (d > reach + 4) beamFx(e.x, e.T.h * .6, e.z, tg.x, tg.T.h * .5, tg.z, .55, 0xb47aff, .1); else burst(tg.x, tg.T.h * .5, tg.z, 5, 0xc9a0ff, 50, .25, 7);
      unitHit(tg, dm, e); } }
  else { const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz); if (d > 36) { mx = dx / d; mz = dz / d; sp = 80; } }
  e.vx = mx * sp; e.vz = mz * sp; e.x += e.vx * dt; e.z += e.vz * dt;
  const er = Math.hypot(e.x, e.z); if (er > ARENA_R - 4) { e.x *= (ARENA_R - 4) / er; e.z *= (ARENA_R - 4) / er; }
  if (sp > 0) { const want = Math.atan2(mx, mz); let da = want - e.yaw; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; e.yaw += da * Math.min(1, dt * 9); }
  if (Math.random() < .12) burst(e.x, e.T.h * .8, e.z, 1, 0xb47aff, 12, .5, 5, .5);
}

// ───────── 계열 기술(R): 재사용이 끝나고 적이 모이면 저절로, 버튼을 누르면 바로
const ekCdMax = () => ELEM[P.el].sk.cd * P.cdMul * (1 - .08 * (P.w.elemUp || 0)) * (P.elT >= 4 ? .75 : 1);
function elemTick(dt) {
  P.ekCd -= dt; if (P.relT > 0) { P.relT -= dt; relTick(dt); }
  for (const a of P.wAuto || []) { a.t -= dt; if (a.t <= 0 && nearest(P.x, P.z, 120)) { a.t = 16 * P.cdMul; castElem(a.el, .7); } }
  updTor(dt);
  if (inp.elem) { inp.elem = false; if (P.ekCd > .35) denyBtn('#bElem', '재사용 ' + Math.ceil(P.ekCd) + '초'); else P.ekQ = .4; }
  P.ekQ = Math.max(0, (P.ekQ || 0) - dt);
  if (P.ekCd > 0) return;
  const press = P.ekQ > 0; let want = press;
  if (!want && !save.skMan) { let n = 0; for (const e of E) { if (e.dead || e.ally) continue; if ((e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 95 * 95) n += e.T.r > 10 ? 6 : 1; }
    want = n >= 6 || (P.el === 'water' && P.hp < P.maxHp * .45 && n > 0); }
  if (!want || P.mv) return;
  castElem(P.el, P.skR || 1); P.ekQ = 0; P.ekCd = ekCdMax(); G.st.skills++; if (press) skPress('#bElem');
}
function castElem(el, pw) {
  const k = pw * (1 + .25 * (P.elT || 0)) * (1 + .25 * (P.w.elemUp || 0)), base = (st('rifle', 'dmg') + 10) * k, X = ELEM[el], C = X.hex;
  if (pw >= 1) { num(P.x, 34 + P.alt, P.z, X.sk.nm, X.col, 18); screenFlash(X.col, .14, .35); } else num(P.x, 30 + P.alt, P.z, X.sk.nm, X.col, 14);
  flare(P.x, 14 + P.alt, P.z, C, 30, .2); lightFlash(P.x, 20, P.z, C, 40, .3);
  switch (el) {
    case 'fire': for (let w = 0; w < 3; w++) later(w * .26, () => { const r = 46 + w * 30;
      for (const e of E) { if (e.dead || e.ally) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < r + e.T.r) { dealDmg(e, base * 2.2, dx / (d || 1), dz / (d || 1), 1.6); applySt(e, 'burn', 4, base * .5); } }
      ring(P.x, P.z, r * .3, r, .4, 0xff7a3a); ring(P.x, P.z, r * .2, r * .8, .3, 0xffd060); for (let i = 0; i < 10; i++) { const a = rand(0, TAU), q = rand(.3, 1) * r; burst(P.x + Math.cos(a) * q, 4, P.z + Math.sin(a) * q, 6, i % 2 ? 0xff5a1a : 0xffc040, 70, .55, 12, 1.4); }
      if (w === 2) xfBoom(P.x, P.z, 'elite', 12, 'emp'); sfx.boom(); G.shake = Math.max(G.shake, 3); }); break;
    case 'water': { const r = 110; ring(P.x, P.z, 6, r, .6, 0x4ab8ff); ring(P.x, P.z, 4, r * .7, .45, 0xbfe8ff); burst(P.x, 4, P.z, 60, 0x6ac8ff, 160, .6, 10, .6);
      for (const e of E) { if (e.dead || e.ally) continue; const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz); if (d < r + e.T.r) { dealDmg(e, base * 1.8, dx / (d || 1), dz / (d || 1), 5); applySt(e, 'stun', .9); } }
      const h = Math.round(P.maxHp * .22 * pw * (P.healK || 1)); P.hp = Math.min(P.maxHp, P.hp + h); num(P.x, 26, P.z, '+' + h, '#7dff9a', 18);
      const b = Math.round(P.maxHp * .3 * pw); if (b > P.bar) { P.barMax = P.bar = b; P.barT = 6; P.barHit = 1; } tone(300, 900, .5, 'sine', .08); break; }
    case 'wind': { const tg = nearest(P.x, P.z, 170), x = tg ? tg.x : P.x + Math.sin(P.yaw) * 60, z = tg ? tg.z : P.z + Math.cos(P.yaw) * 60;
      G.tor.push({ x, z, t: 4 * (pw < 1 ? .7 : 1), tk: 0, dmg: base * .7 }); tone(200, 700, .6, 'sawtooth', .04); break; }
    case 'elec': { const t0 = nearest(P.x, P.z, 160); if (!t0) break; beamFx(P.x, 14 + P.alt, P.z, t0.x, t0.T.h * .5, t0.z, .9, 0xffe14a, .18); dealDmg(t0, base * 2.4, 0, 0, .4); applySt(t0, 'stun', 1.2);
      let px = t0.x, pz = t0.z; const hit = new Set([t0]), N = pw < 1 ? 9 : 14;
      for (let i = 0; i < N; i++) later(i * .045, () => { let b = null, bd = 90 * 90; for (const o of E) { if (o.dead || o.ally || hit.has(o)) continue; const q = (o.x - px) ** 2 + (o.z - pz) ** 2; if (q < bd) { bd = q; b = o; } }
        if (!b) return; hit.add(b); beamFx(px, 8, pz, b.x, b.T.h * .5, b.z, .8, 0xffe14a, .16); burst(b.x, b.T.h * .5, b.z, 8, 0xfff6a0, 70, .3, 7); dealDmg(b, base * 2.1, 0, 0, .3); applySt(b, 'stun', 1.2); px = b.x; pz = b.z; if (i % 3 === 0) tone(1800, 300, .08, 'square', .03); });
      break; }
    case 'ice': { const r = pw < 1 ? 110 : 150; ring(P.x, P.z, 6, r, .7, 0x9fe8ff); ring(P.x, P.z, 3, r * .6, .5, 0xffffff); burst(P.x, 6, P.z, 70, 0xdff8ff, 170, .7, 9, .4);
      for (const e of E) { if (e.dead || e.ally) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < r + e.T.r) { dealDmg(e, base * 1.3, 0, 0, 0); applySt(e, 'frz', 2.6); applySt(e, 'vul', 5); } }
      tone(2400, 800, .6, 'triangle', .06); break; }
    case 'light': { const tg = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 180 * 180).sort((a, b) => b.hp - a.hp).slice(0, pw < 1 ? 5 : 8);
      tg.forEach((e, i) => later(i * .08, () => { if (!e.dead) holyPillar(e.x, e.z, base * 2.6, 1.5); }));
      const h = Math.round(P.maxHp * .1 * pw); P.hp = Math.min(P.maxHp, P.hp + h); num(P.x, 26, P.z, '+' + h, '#7dff9a', 16); tone(1200, 2400, .4, 'triangle', .06); break; }
    case 'dark': { const n = pw < 1 ? 2 : 3 + ((P.elT || 0) >= 3 ? 1 : 0); for (let i = 0; i < n; i++) { const a = i / n * TAU + P.yaw; later(i * .12, () => mkAlly('robo', P.x + Math.sin(a) * 26, P.z + Math.cos(a) * 26, 14)); }
      for (const e of E) { if (e.dead || e.ally) continue; if (Math.hypot(e.x - P.x, e.z - P.z) < 55 + e.T.r) { dealDmg(e, base * 1.2, 0, 0, 1); applySt(e, 'weak', 5); } }
      ring(P.x, P.z, 4, 58, .5, 0xb47aff); burst(P.x, 6, P.z, 40, 0x7a3aff, 90, .6, 10, .2); tone(140, 60, .6, 'sawtooth', .08); break; }
  }
}
// 바람 회오리: 적을 빨아들이고 베며 혼란·약화
function updTor(dt) {
  if (!G.tor || !G.tor.length) return;
  for (const T of G.tor) { T.t -= dt; T.tk -= dt; const tg = nearest(T.x, T.z, 140); if (tg) { T.x += (tg.x - T.x) * dt * .6; T.z += (tg.z - T.z) * dt * .6; }
    for (const e of E) { if (e.dead || e.ally || e.T.stat) continue; const dx = T.x - e.x, dz = T.z - e.z, d = Math.hypot(dx, dz); if (d > 85) continue;
      if (e.T.r <= 10) { e.x += dx / (d || 1) * 60 * dt; e.z += dz / (d || 1) * 60 * dt; }
      if (T.tk <= 0 && d < 40 + e.T.r) { dealDmg(e, T.dmg, 0, 0, 0); applySt(e, 'conf', 5); applySt(e, 'weak', 6); } }
    if (T.tk <= 0) { T.tk = .3; ring(T.x, T.z, 6, 42, .3, 0x7dffc8); }
    for (let i = 0; i < 3; i++) { const a = G.t * 9 + i * 2.1, h = rand(2, 40), q = 8 + h * .5; burst(T.x + Math.cos(a) * q, h, T.z + Math.sin(a) * q, 1, i ? 0x7dffc8 : 0xffffff, 30, .35, 6, .8); } }
  G.tor = G.tor.filter((T) => T.t > 0);
}
// ───────── 무기 해방: 필살기를 쓸 때 전설·신화 무기가 고유 궁극기를 함께 펼친다
function castRelease(el) {
  const R0 = REL[el], X = ELEM[el], base = (st('rifle', 'dmg') + 14) * (1 + .25 * (P.elT || 0)) * (1 + .1 * (P.wpn ? P.wpn.lv : 0));
  P.relT = 8; P.relEl = el; P.relTk = 0; banner(R0.nm, 2200); screenFlash(X.col, .4, .8); ring(P.x, P.z, 8, 160, .8, X.hex); ring(P.x, P.z, 4, 100, .6, 0xffffff); G.hstop = .14; G.shake = Math.max(G.shake, 7);
  burst(P.x, 14, P.z, 80, X.hex, 200, .8, 12, .6); lightFlash(P.x, 30, P.z, X.hex, 90, .6);
  if (el === 'water') { P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .4); for (const da of [0, 2.09, -2.09]) { const a = P.yaw + da; lineHit(P.x, P.z, a, 260, 24, 0, 0, (e) => { dealDmg(e, base * 9, Math.sin(a), Math.cos(a), 5); applySt(e, 'stun', 1.2); });
    beamFx(P.x, 10, P.z, P.x + Math.sin(a) * 260, 10, P.z + Math.cos(a) * 260, 5, 0x4ab8ff, .6); for (let i = 0; i < 14; i++) burst(P.x + Math.sin(a) * i * 18, 8, P.z + Math.cos(a) * i * 18, 6, 0x9fdcff, 80, .6, 11, 1); } }
  if (el === 'ice') { for (const e of E) { if (e.dead || e.ally) continue; if (Math.hypot(e.x - P.x, e.z - P.z) < 230) { applySt(e, 'frz', 3.2); applySt(e, 'vul', 6); dealDmg(e, base * 4, 0, 0, 0); burst(e.x, e.T.h * .6, e.z, 6, 0xdff8ff, 60, .5, 9, .6); } } }
  if (el === 'light') { for (let w = 0; w < 4; w++) later(w * .15, () => { const a = P.yaw + w * Math.PI / 2 + .4; lineHit(P.x - Math.sin(a) * 150, P.z - Math.cos(a) * 150, a, 300, 30, 0, 0, (e) => { dealDmg(e, base * 8, Math.sin(a), Math.cos(a), 3); applySt(e, 'stun', 1.5); });
    beamFx(P.x - Math.sin(a) * 150, 12, P.z - Math.cos(a) * 150, P.x + Math.sin(a) * 150, 12, P.z + Math.cos(a) * 150, 7, 0xfff0a8, .5); crescent(P.x, P.z, a, 110, 0, 0xfff6c8); }); P.hp = Math.min(P.maxHp, P.hp + P.maxHp * .2); }
  if (el === 'dark') { for (let w = 0; w < 3; w++) later(w * .2, () => { const a = P.yaw + (w - 1) * .5; lineHit(P.x, P.z, a, 280, 26, 0, 0, (e) => { dealDmg(e, base * 8, Math.sin(a), Math.cos(a), 3); applySt(e, 'weak', 6); });
    crescent(P.x + Math.sin(a) * 60, P.z + Math.cos(a) * 60, a, 70, 0, 0x7a3aff); beamFx(P.x, 9, P.z, P.x + Math.sin(a) * 280, 9, P.z + Math.cos(a) * 280, 4, 0x8a4aff, .45); });
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; later(.3 + i * .1, () => mkAlly('robo', P.x + Math.sin(a) * 30, P.z + Math.cos(a) * 30, 16)); } }
}
function relTick(dt) {
  const el = P.relEl, X = ELEM[el], base = (st('rifle', 'dmg') + 14) * (1 + .25 * (P.elT || 0)) * (1 + .1 * (P.wpn ? P.wpn.lv : 0)); P.relTk -= dt;
  if (Math.random() < .5) { const a = rand(0, TAU); burst(P.x + Math.cos(a) * 10, rand(4, 26) + P.alt, P.z + Math.sin(a) * 10, 1, X.hex, 40, .5, 7, 1.2); }
  if (P.relTk > 0) return;
  if (el === 'fire') { P.relTk = .45; const tg = E.filter((e) => !e.dead && !e.ally && (e.x - P.x) ** 2 + (e.z - P.z) ** 2 < 150 * 150); for (let i = 0; i < 3 && tg.length; i++) { const e = tg.splice(Math.random() * tg.length | 0, 1)[0];
      beamFx(e.x, 0, e.z, e.x, 70, e.z, 4, 0xff7a3a, .4); explode(e.x, e.z, 30, base * 3, 0xff7a3a); applySt(e, 'burn', 4, base * .6); } }
  else if (el === 'wind') { P.relTk = .25; const a0 = G.t * 5; for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2, x = P.x + Math.cos(a) * 55, z = P.z + Math.sin(a) * 55; burst(x, 8, z, 3, 0x7dffc8, 50, .3, 8);
      for (const e of E) { if (e.dead || e.ally) continue; if (Math.hypot(e.x - x, e.z - z) < 20 + e.T.r) { dealDmg(e, base * 1.5, 0, 0, 1.5); applySt(e, 'conf', 4); } } } }
  else if (el === 'elec') { P.relTk = .35; const tg = nearest(P.x + rand(-80, 80), P.z + rand(-80, 80), 140); if (tg) { beamFx(tg.x, 200, tg.z, tg.x, 0, tg.z, 2.4, 0xffe14a, .25); areaHit(tg.x, tg.z, 24, base * 3.2, 1.5, .8); ring(tg.x, tg.z, 3, 26, .3, 0xffe14a); tone(2200, 200, .12, 'square', .04); } }
  else P.relTk = 1;
}

// ───────── 판이 끝나면 무기를 얻는다(이기면 확정, 지면 가끔). 뒤 장일수록 좋은 등급
function dropWeapon(won) {
  if (!won && (G.t < 90 || Math.random() > .35)) return null;
  const c = CHAPTERS[G.chi], lift = Math.min(1, (G.chi || 0) / 30), r = Math.random() * 100;
  const tb = won ? [36, 30, 20, 9 + lift * 4, 3 + lift * 3, .8, .3] : [62, 30, 8, 0, 0, 0, 0], rar = WR[rollGrade(tb, maxG())];
  const w = mkWeapon(rar, Math.random() < .35 ? MECH(save.mech).el : null); save.wpn.inv.push(w);
  if (save.wpn.inv.length > 60) { const i = save.wpn.inv.findIndex((x) => WR.indexOf(x.rar) === 0 && !Object.values(save.wpn.eq).includes(x.u)); if (i >= 0) save.wpn.inv.splice(i, 1); }
  return w;
}
function wdropHtml(w) { const R0 = RAR[w.rar], X = ELEM[w.el];
  return `<div class="wdrop" style="--rc:${R0.col};--ec:${X.col}"><span class="wi">${ico2('wpn', X.col)}</span><span><em>무기 획득</em><b>${wName(w)}</b><small>${R0.nm} · ${X.nm} 계열${w.rel ? ' · 해방 보유' : ''}</small></span></div>`; }

// ───────── 무기고: 기체 숙련(기종별 성장)과 무기 장착·강화·분해
// ───────── 대기 화면 정리: 오른쪽 정보창(작은 글씨·스킬 칸), 기체 목록 창, 정비(무기·숙련·공통 강화), 상점
const AUTO_DS = { flash: '가까운 적에게 번개처럼 돌진해 주변을 벤다', iaido: '한순간에 앞으로 미끄러지며 일직선을 베어낸다', overdrive: '3.5초 동안 사격 속도가 크게 오른다', palm: '손바닥을 뻗어 레이저 7발을 퍼붓는다',
  backstep: '뒤로 뛰어 물러나며 있던 자리에 폭탄을 남긴다', mortar3: '적 무리 위로 포탄 세 발을 떨어뜨린다', bash: '방패로 돌진해 적을 밀치고 기절시킨다', quake: '땅을 내려찍어 주변을 흔들고 기절시킨다',
  dive: '하늘에서 급강하해 폭격한다', cloak: '3초 동안 모습을 감추고 다음 공격이 3배', bitstorm: '비트 8기가 한꺼번에 저격한다', blink: '순간이동하며 떠난 자리에 빛 폭발', featherstorm: '사방으로 빛 깃털 16개를 쏜다' };
const ULT_DS = { bladefall: '하늘에서 빛의 검 22자루가 떨어진다', tenzan: '세 방향으로 거대한 참격을 날린다', laserstorm: '사방으로 레이저를 세 번 퍼붓는다', phoenix: '불사조처럼 돌진하며 길 위의 적을 모두 태운다',
  satsnipe: '가장 강한 적 7기를 위성으로 저격한다', carpet: '앞쪽에 포탄 20발을 깔아 융단 폭격', aegis: '결계로 주변을 날리고 큰 보호막을 두른다', titanfall: '하늘에서 떨어져 넓게 부수고 기절시킨다',
  mstorm: '미사일 24발을 한꺼번에 쏜다', execute: '가장 강한 적 9기를 차례로 처형한다', allrange: '비트가 주변 적 36기를 동시에 공격한다', nova: '거대한 빛 폭발 두 번과 내구 30% 회복', descent: '빛기둥 9개가 내리꽂히고 내구 50% 회복' };
let skSel = 'r';
function drawMdet(m, st) {
  const R0 = rarOf(m), X = ELEM[m.el], an = ARM_NAME[m.prim], pm = st ? powMul(m) : R0.mul, w = wOf(m.id), lv = save.mlv[m.id] || 0;
  const rel = w && w.rel ? ` · 해방 「${REL[w.rel].nm}」` : '';
  const T = [
    { k: 'w', ic: m.prim, col: '#ffd98a', lb: '무기', nm: an.nm, ds: an.ds0, sub: '기본 무기 · 자동 공격' },
    { k: 'e', ic: m.auto.k, col: '#cfefff', lb: 'E', nm: m.auto.nm, ds: AUTO_DS[m.auto.k] || '', sub: `스킬 · E · ${m.auto.cd}초` },
    { k: 'r', ic: 'el_' + m.el, col: X.col, lb: 'R', nm: X.sk.nm, ds: X.sk.ds, sub: `계열 기술 · R · ${X.sk.cd}초` },
    { k: 'q', ic: m.ult.k, col: '#ffc24a', lb: 'Q', nm: m.ult.nm, ds: (ULT_DS[m.ult.k] || '') + rel, sub: '필살기 · Q' },
  ];
  const sel = T.find((t) => t.k === skSel) || T[2];
  const bar = (l, v, mx, s) => `<div class="sr"><span>${l}</span><i><em style="width:${Math.round(clamp(v / mx, .06, 1) * 100)}%"></em></i><b class="num">${s}</b></div>`;
  $('#mdet').style.setProperty('--rc', R0.col); $('#mdet').style.setProperty('--ec', X.col);
  $('#mdet').innerHTML = `<div class="mtop"><span class="rar">${R0.nm}</span><span class="chip">${ico(CLS[m.cls].k)}${m.cls}</span><span class="chip el">${ico('el_' + m.el)}${X.nm}</span>${st ? `<span class="stars">${'★'.repeat(st)}<s>${'★'.repeat(5 - st)}</s></span>` : '<span class="stars lk">미보유</span>'}</div>`
    + `<div class="mh">${m.nm}</div><div class="ty">${m.ty}</div>`
    + `<div class="st4">${bar('내구', m.hp * pm, 2.3, Math.round(100 * m.hp * pm))}${bar('화력', m.dmg * pm, 2.2, Math.round(100 * m.dmg * pm))}${bar('속도', m.spd, 1.3, Math.round(100 * m.spd))}${bar('냉각', 1 / m.cd, 1.45, Math.round(100 / m.cd))}</div>`
    + `<div class="sk4">${T.map((t) => `<button class="skb ${t.k === sel.k ? 'on' : ''}" data-k="${t.k}" style="--ec:${t.col}"><span class="skt">${ico2(t.ic, t.col)}</span><small>${t.lb}</small></button>`).join('')}</div>`
    + `<div class="skd" style="--ec:${sel.col}"><b>${sel.nm}</b><small>${sel.sub}</small><p>${sel.ds}</p></div>`
    + (st ? `<button class="gearl" id="toArms" style="--rc:${w ? RAR[w.rar].col : '#5a6478'};--ec:${w ? ELEM[w.el].col : '#8a93a8'}"><span class="skt sm">${ico2('wpn', w ? ELEM[w.el].col : '#8a93a8')}</span><span class="gt"><b>${w ? wName(w, m) : '무기 없음'}</b><small>${w ? `${RAR[w.rar].nm} · +${w.lv} · 피해 +${wDmg(w)}%` : '정비에서 무기를 장착하세요'}</small></span><span class="gm"><small>숙련</small><b class="num">${lv}</b></span></button>` : '')
    + `<div class="ps">${m.pass}</div>`
    + (st ? '' : `<div class="buy"><button class="bp" id="unlock" ${save.core >= m.cost ? '' : 'disabled'}>${ico('core')} ${m.cost.toLocaleString()}<small>코어로 구매</small></button><button class="bs" id="toGacha">${ico('shop')}<small>상점에서 모집</small></button></div>`);
  $('#mdet').querySelectorAll('.skb').forEach((b) => b.addEventListener('click', () => { skSel = b.dataset.k; drawMdet(m, st); }));
  if ($('#toArms')) $('#toArms').onclick = () => openArsenal('wpn');
  if (!st) { $('#unlock').onclick = () => { if (save.core < m.cost) return; save.core -= m.cost; save.own[m.id] = 1; save.mech = m.id; persist(); sfx.lvl(); screenFlash(R0.col, .35, .6); if (lobby.on) enterLobby(); drawTitle(); }; $('#toGacha').onclick = () => openGacha('mech'); }
}
function mechOrder() { return MECHS.slice().sort((a, b) => (!!starOf(b.id) - !!starOf(a.id)) || RAR_ORDER.indexOf(a.rar) - RAR_ORDER.indexOf(b.rar)); }
function stepMech(d) { const L = mechOrder(), i = L.findIndex((m) => m.id === viewMech), m = L[(i + d + L.length) % L.length]; viewMech = m.id; if (starOf(m.id)) { save.mech = m.id; persist(); } if (lobby.on) enterLobby(); drawTitle(); }
const curHtml = (k) => k === 'core'
  ? `<i class="ci">${ico('core')}</i><span class="cv"><small>코어</small><b class="num">${save.core.toLocaleString()}</b></span><button class="pl" data-go="daily" aria-label="코어 얻기">+</button>`
  : `<i class="ci">${ico('gem')}</i><span class="cv"><small>결정</small><b class="num">${save.gem.toLocaleString()}</b></span><button class="pl" data-go="gem" aria-label="결정 얻기">+</button>`;
function bindCur(root) { root.querySelectorAll('.pl').forEach((b) => (b.onclick = () => { if (b.dataset.go === 'daily') { drawDaily(); $('#daily').classList.remove('hide'); } else openGacha('gem'); })); }

// ── 정비: 무기 · 기체 숙련 · 공통 강화
let arsTab = 'wpn', wSel = null;
function openArsenal(t) { if (t) arsTab = t; drawArsenal(); $('#arsenal').classList.remove('hide'); }
if (location.search.includes('dev')) Object.assign(window, { __el: Object.assign(window.__el || {}, { castElem, castRelease, mkWeapon, applySt, mkAlly, ELEM, wOf, placeArms, spawnGhost, get GH() { return GHOSTS; }, get HZ() { return HZ; } }) });
function drawArsenal() {
  const m = MECH(save.mech), X = ELEM[m.el];
  $('#aTitle').innerHTML = `${ico('anvil')}정비`;
  $('#aCur').innerHTML = `<span class="cur">${curHtml('core')}</span>${curMini('ore')}${curMini('chip')}`; bindCur($('#aCur'));
  $('#aTabs').innerHTML = [['wpn', '무기'], ['sk', '스킬 강화'], ['mlv', '기체 숙련'], ['up', '공통 강화']].map(([k, n]) => `<button data-t="${k}" class="${arsTab === k ? 'on' : ''}">${n}</button>`).join('');
  $('#aTabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { arsTab = b.dataset.t; drawArsenal(); }));
  $('#aNote').innerHTML = `무기는 장착한 기체 · 스킬 강화와 기체 숙련은 <em>${m.nm}</em>만 · 공통 강화는 모든 기체에 적용`;
  const body = $('#arsBody');
  if (arsTab === 'wpn') { drawWpnTab(body, m);
  } else if (arsTab === 'sk') { drawSkTab(body, m);
  } else if (arsTab === 'mlv') {
    const lv = save.mlv[m.id] || 0, tier = Math.floor(lv / 5), cost = mlvCost(lv);
    const tiers = [[5, '계열 기술 위력 +25%'], [10, '계열 효과 확률 1.5배'], [15, '소환 +1 · 기술 위력 +25%'], [20, '계열 기술 재사용 -25%']];
    body.innerHTML = `<div class="mlv" style="--ec:${X.col};--rc:${rarOf(m).col}"><div class="mp"><img src="img/${m.id}.jpg?v=15" alt=""><div class="mpn"><small>${rarOf(m).nm} · ${m.cls}</small><b>${m.nm}</b><span class="chip el">${ico('el_' + m.el)}${X.nm} 계열</span></div></div>`
      + `<div class="mr"><div class="mlvn"><small>숙련</small><b class="num">${lv}</b><em class="num">/ ${MLV_MAX}</em></div><div class="mbar">${Array.from({ length: MLV_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''} ${(i + 1) % 5 === 0 ? 'k' : ''}"></i>`).join('')}</div>`
      + `<div class="mfx"><div><small>지금</small><b>내구·화력 +${lv * 3}%</b></div><div><small>다음 단계</small><b>${lv >= MLV_MAX ? '최대' : `+${(lv + 1) * 3}%`}</b></div></div>`
      + `<ul class="mt">${tiers.map(([L, d], i) => `<li class="${i < tier ? 'ok' : ''}"><span class="num">Lv ${L}</span><b>${d}</b>${i < tier ? '<em>달성</em>' : ''}</li>`).join('')}</ul>`
      + `<div class="msk"><span class="skt sm">${ico2('el_' + m.el, X.col)}</span><span><small>계열 기술 · R</small><b>${X.sk.nm}</b><p>${X.sk.ds}</p></span></div>`
      + `<button class="bp big" id="mUp" ${lv >= MLV_MAX || save.core < cost ? 'disabled' : ''}>${lv >= MLV_MAX ? '최대 숙련' : `숙련 올리기 ${ico('core')} ${cost}`}</button></div></div>`;
    $('#mUp').onclick = () => { const l = save.mlv[m.id] || 0, c = mlvCost(l); if (l >= MLV_MAX || save.core < c) return; save.core -= c; save.mlv[m.id] = l + 1; persist(); sfx.lvl(); screenFlash(X.col, .25, .5); drawArsenal(); drawTitle(); };
  } else {
    body.innerHTML = `<div class="ugrid">${UPG.map((u) => { const lv = save.up[u.k] || 0, c = upCost(lv), max = lv >= UPG_MAX;
      return `<div class="uc"><span class="skt">${ico2(u.ic, '#ffd27a')}</span><div class="ut"><b>${u.nm}</b><span class="upp">${Array.from({ length: UPG_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><small>${lv ? u.ds(lv) : '없음'}${max ? '' : ` → <em>${u.ds(lv + 1)}</em>`}</small></div><button class="bp" data-k="${u.k}" ${max || save.core < c ? 'disabled' : ''}>${max ? '최대' : `${ico('core')} ${c}`}</button></div>`; }).join('')}</div>`;
    body.querySelectorAll('.uc button').forEach((b) => (b.onclick = () => { const k = b.dataset.k, lv = save.up[k] || 0, c = upCost(lv); if (lv >= UPG_MAX || save.core < c) return; save.core -= c; save.up[k] = lv + 1; persist(); sfx.lvl(); drawArsenal(); drawTitle(); }));
  }
}

// ── 상점: 기체 모집 · 무기 보급 · 결정 얻기
let shopTab = 'mech';
function drawShopHead() {
  $('#gTitle').innerHTML = `${ico('shop')}상점`;
  $('#gCur').innerHTML = `<span class="cur">${curHtml('core')}</span><span class="cur gem">${curHtml('gem')}</span>${curMini('ore')}${curMini('chip')}`; bindCur($('#gCur'));
  $('#gTabs').innerHTML = [['mech', '기체 모집'], ['wpn', '무기 보급'], ['goods', '재화'], ['gem', '결정 얻기']].map(([k, n]) => `<button data-t="${k}" class="${shopTab === k ? 'on' : ''}">${n}</button>`).join('');
  $('#gTabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { shopTab = b.dataset.t; drawGacha(); }));
  for (const [k, id] of [['mech', 'shopMech'], ['wpn', 'shopWpn'], ['goods', 'shopGoods'], ['gem', 'shopGem']]) $('#' + id).classList.toggle('hide', shopTab !== k);
}
// ═════════ v27 메타(조선좀비 방식): 계정·우편·무기 7등급·보급·재화 상점·스킬 강화 ═════════
if (window.GICO) Object.assign(window.GICO, {
  mail: 'M40 104h432v36L256 290 40 140zM40 184l216 150 216-150v224H40z',
  ore: 'M120 352l56-144h160l56 144zM80 384h352v56H80zM200 168l20-56h72l20 56z',
  chip: 'M152 152h208v208H152zM196 196v120h120V196zM180 88h28v48h-28zM242 88h28v48h-28zM304 88h28v48h-28zM180 376h28v48h-28zM242 376h28v48h-28zM304 376h28v48h-28zM88 180h48v28H88zM88 242h48v28H88zM88 304h48v28H88zM376 180h48v28h-48zM376 242h48v28h-48zM376 304h48v28h-48z',
  gear: 'M232 32h48l10 58 34 14 48-34 34 34-34 48 14 34 58 10v48l-58 10-14 34 34 48-34 34-48-34-34 14-10 58h-48l-10-58-34-14-48 34-34-34 34-48-14-34-58-10v-48l58-10 14-34-34-48 34-34 48 34 34-14zM256 184a72 72 0 1 0 .1 0z',
  pilot: 'M256 48c-62 0-112 50-112 112v40c0 62 50 112 112 112s112-50 112-112v-40c0-62-50-112-112-112zM168 168h176v32H168zM96 464c0-80 64-136 160-136s160 56 160 136z',
});
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RWN = { core: ['core', '코어'], gem: ['gem', '결정'], ore: ['ore', '정련 합금'], chip: ['chip', '강화 회로'] };
const curMini = (k) => `<span class="cur mini ${k}" title="${RWN[k][1]}"><i class="ci">${ico(k)}</i><span class="cv"><small>${RWN[k][1]}</small><b class="num">${(save[k] || 0).toLocaleString()}</b></span></span>`;
function give(rw) { for (const k in rw) { if (k === 'wpn') { const w = mkWeapon(rw.wpn, null); save.wpn.inv.push(w); } else save[k] = (save[k] || 0) + rw[k]; } }
const rwHtml = (rw) => Object.entries(rw).map(([k, v]) => k === 'wpn' ? `<span class="rwc" style="--rc:${RAR[v].col}">${ico('wpn')}${RAR[v].nm} 무기</span>` : `<span class="rwc ${k}">${ico(RWN[k][0])}${RWN[k][1]} <b class="num">${Number(v).toLocaleString()}</b></span>`).join('');

// ── 계정 레벨(조선좀비 needExp: 100 + 레벨×60). 레벨마다 모든 기체 내구·화력 +0.5%, 오르면 우편으로 보상
const needExp = (lv) => 100 + lv * 60;
function addExp(e) { const A = save.acc; A.exp += e; let up = 0;
  while (A.exp >= needExp(A.lv)) { A.exp -= needExp(A.lv); A.lv++; up++; pushMail(`계정 Lv ${A.lv} 달성`, `계정 레벨이 ${A.lv}이 되었습니다. 모든 기체의 내구·화력이 조금 더 오릅니다.`, { gem: 20 + A.lv * 2, core: 200 + A.lv * 40, chip: 5 }); }
  return up; }
function metaReward(won) {
  const ci = G.chi || 0, ex = Math.round((won ? 90 : 40) * (1 + ci * .06) * (won || G.t > 60 ? 1 : .3));
  const ore = won ? 2 + Math.floor(ci / 6) : (G.t >= 120 ? 1 : 0), chip = won ? 2 + Math.floor(ci / 8) : (G.t >= 180 ? 1 : 0);
  save.ore += ore; save.chip += chip; const up = addExp(ex);
  return { html: `<div class="mrw">${ore ? `<span>${ico('ore')}정련 합금 <b class="num">+${ore}</b></span>` : ''}${chip ? `<span>${ico('chip')}강화 회로 <b class="num">+${chip}</b></span>` : ''}<span class="ex">계정 경험치 <b class="num">+${ex}</b>${up ? ` · <em>Lv ${save.acc.lv} 달성 · 우편함에 보상</em>` : ''}</span></div>` }; }

// ── 우편함: 보상 메일, 30일 보관, 받은 뒤 7일 지나면 정리
function pushMail(t, b, rw, days = 30) { save.mail.unshift({ id: save.mailId++, t, b, rw, at: Date.now(), exp: Date.now() + days * 864e5, got: 0 }); if (save.mail.length > 60) save.mail.length = 60; }
function mailPurge() { const now = Date.now(); save.mail = save.mail.filter((m) => m.exp > now && !(m.got && now - m.got > 7 * 864e5)); }
const mailNew = () => (save.mail || []).filter((m) => !m.got && m.exp > Date.now()).length;
function mailInit() {
  if (!save.mlInit) { save.mlInit = 1; pushMail('지휘부 환영 보급', '기동전사 부대에 온 것을 환영합니다. 첫 출격 준비에 쓰세요.', { gem: 300, core: 1000, ore: 20, chip: 20 }); }
  if (!save.mlV27) { save.mlV27 = 1; pushMail('정비 체계 개편 안내', '무기가 7등급(일반·고급·희귀·영웅·전설·유니크·신화)으로 바뀌었습니다. 무기 강화·승급·분해, 스킬 강화, 계정 레벨이 열렸습니다. 개편 기념 보급입니다.', { ore: 30, chip: 30, wpn: 'R' }); }
  mailPurge(); persist(); }
function mailGet(m) { if (!m || m.got || m.exp <= Date.now()) return false; give(m.rw); m.got = Date.now(); return true; }

// ── 파일럿 8명(사용자가 고르는 얼굴)
const PILOTS = [{ nm: '한결', cs: '블레이드' }, { nm: '서린', cs: '나이트폴' }, { nm: '카이', cs: '아이언' }, { nm: '노아', cs: '에코' }, { nm: '도윤', cs: '스파크' }, { nm: '레아', cs: '미라주' }, { nm: '강백호', cs: '타이거' }, { nm: '하루', cs: '핑크 볼트' }];
const pilotImg = (i) => `img/pilot/p${i}.webp?v=1`;
const pilotOf = () => PILOTS[((save.acc.pilot || 1) - 1) % PILOTS.length];
const pName = () => save.acc.name || pilotOf().nm;
function drawProf() { const el = $('#prof'); if (!el) return; const A = save.acc, n = mailNew();
  el.innerHTML = `<span class="pav"><img src="${pilotImg(A.pilot || 1)}" alt=""><b class="num">${A.lv}</b></span><span class="pin"><b>${esc(pName())}</b><small>Lv ${A.lv} · ${pilotOf().cs}</small><i class="pxp"><i style="width:${Math.min(100, A.exp / needExp(A.lv) * 100).toFixed(1)}%"></i></i></span>${n ? `<em class="pdot num">${n}</em>` : ''}`; }
let profView = 'home';
function openProf(v) { profView = v || 'home'; drawProfP(); $('#profP').classList.remove('hide'); }
function drawProfP() {
  const A = save.acc, n = mailNew(), body = $('#pfBody');
  $('#pfTitle').innerHTML = `${ico('pilot')}프로필`;
  $('#pfCur').innerHTML = `<span class="cur">${curHtml('core')}</span><span class="cur gem">${curHtml('gem')}</span>`; bindCur($('#pfCur'));
  $('#pfTabs').innerHTML = [['home', '프로필'], ['mail', `받은 메일${n ? ` <i class="tn num">${n}</i>` : ''}`], ['cpn', '쿠폰 입력'], ['pilot', '파일럿'], ['set', '설정']].map(([k, t]) => `<button data-t="${k}" class="${profView === k ? 'on' : ''}">${t}</button>`).join('');
  $('#pfTabs').querySelectorAll('button').forEach((b) => (b.onclick = () => { profView = b.dataset.t; drawProfP(); }));
  if (profView === 'home') {
    const cleared = Object.keys(save.stars || {}).length, own = MECHS.filter((m) => save.own[m.id]).length, need = needExp(A.lv);
    const tiles = [['mail', '받은 메일', n ? `새 메일 ${n}통` : '새 메일 없음', 'mail', n], ['gacha', '쿠폰 입력', '쿠폰 번호로 보상 받기', 'cpn', 0], ['pilot', '파일럿 변경', `지금 ${pilotOf().nm} · ${pilotOf().cs}`, 'pilot', 0], ['gear', '설정', '소리 · 스킬 자동/수동', 'set', 0]];
    body.innerHTML = `<div class="pfw"><div class="pfc"><div class="pfa"><img src="${pilotImg(A.pilot || 1)}" alt=""><b class="num">Lv ${A.lv}</b></div>
      <div class="pfi"><small>${pilotOf().cs} · 기동전사 파일럿</small><div class="pfn"><input id="pfName" maxlength="10" value="${esc(pName())}" spellcheck="false" aria-label="파일럿 이름"><button class="bs" id="pfNameGo">이름 저장</button></div>
      <div class="pfx"><span><i style="width:${Math.min(100, A.exp / need * 100).toFixed(1)}%"></i></span><em class="num">${A.exp} / ${need}</em></div>
      <p class="pfb">계정 보너스 · 모든 기체 내구·화력 <b class="num">+${((A.lv - 1) * .5).toFixed(1)}%</b> · 레벨이 오를 때마다 우편으로 보상</p></div></div>
      <div class="pfs">${[['출격', save.stat.runs], ['승리', save.stat.wins], ['격파', save.stat.kills.toLocaleString()], ['깬 장', cleared], ['기동전사', `${own}/${MECHS.length}`]].map(([k, v]) => `<div><small>${k}</small><b class="num">${v}</b></div>`).join('')}</div>
      <div class="pfm">${tiles.map(([ic, t, d, go, dot]) => `<button class="pmb" data-go="${go}"><span class="skt">${ico2(ic, '#f2b544')}</span><span><b>${t}${dot ? `<i class="dot"></i>` : ''}</b><small>${d}</small></span><em>›</em></button>`).join('')}</div></div>`;
    body.querySelectorAll('.pmb').forEach((b) => (b.onclick = () => { profView = b.dataset.go; drawProfP(); }));
    const saveName = () => { const v = $('#pfName').value.trim().slice(0, 10); A.name = v; persist(); drawProf(); flashMsg('이름을 저장했습니다'); };
    $('#pfNameGo').onclick = saveName; $('#pfName').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') saveName(); };
  } else if (profView === 'mail') {
    mailPurge(); const L = save.mail;
    body.innerHTML = `<div class="mlw"><div class="mlh"><b>받은 메일</b><small>보관 30일 · 받은 메일은 7일 뒤 정리됩니다</small><button class="bp" id="mlAll" ${n ? '' : 'disabled'}>모두 받기</button></div>`
      + (L.length ? `<div class="mll">${L.map((m) => { const dl = Math.max(0, Math.ceil((m.exp - Date.now()) / 864e5));
        return `<div class="mli ${m.got ? 'got' : ''}"><span class="skt sm">${ico2(m.rw && m.rw.wpn ? 'wpn' : 'mail', '#f2b544')}</span><div class="mlt"><b>${esc(m.t)}</b><p>${esc(m.b)}</p><div class="rwl">${rwHtml(m.rw || {})}</div></div><div class="mlr"><small>${m.got ? '받음' : `${dl}일 남음`}</small>${m.got ? '' : `<button class="bp" data-id="${m.id}">받기</button>`}</div></div>`; }).join('')}</div>`
        : '<p class="emp">받은 메일이 없습니다.</p>') + '</div>';
    const done = (k) => { persist(); sfx.lvl(); drawProfP(); drawProf(); if (k) flashMsg(`메일 ${k}통의 보상을 받았습니다`); };
    body.querySelectorAll('.mli .bp').forEach((b) => (b.onclick = () => { if (mailGet(save.mail.find((m) => m.id === +b.dataset.id))) done(1); }));
    if ($('#mlAll')) $('#mlAll').onclick = () => { let k = 0; for (const m of save.mail) if (mailGet(m)) k++; if (k) done(k); };
  } else if (profView === 'cpn') { body.innerHTML = '<div class="pfcp"></div>'; drawCpn(body.firstChild); }
  else if (profView === 'pilot') {
    body.innerHTML = `<div class="plw"><p class="snote">대기 화면 왼쪽 위와 프로필에 보이는 파일럿 얼굴입니다. 능력치는 같습니다.</p><div class="plg">${PILOTS.map((p, i) => `<button class="plc ${A.pilot === i + 1 ? 'on' : ''}" data-i="${i + 1}"><img src="${pilotImg(i + 1)}" alt=""><b>${p.nm}</b><small>${p.cs}</small>${A.pilot === i + 1 ? '<em>선택됨</em>' : ''}</button>`).join('')}</div></div>`;
    body.querySelectorAll('.plc').forEach((b) => (b.onclick = () => { A.pilot = +b.dataset.i; persist(); sfx.lvl(); drawProfP(); drawProf(); }));
  } else {
    body.innerHTML = `<div class="stw"><div class="str"><span><b>소리</b><small>배경 음악과 효과음</small></span><button class="bs" id="stSnd">${muted ? '꺼짐 · 켜기' : '켜짐 · 끄기'}</button></div>
      <div class="str"><span><b>스킬 사용</b><small>자동: 적이 가까우면 E·R을 스스로 씀 · 수동: 버튼을 눌러야 씀 (전투 중 T 키)</small></span><button class="bs" id="stSk">${save.skMan ? '수동 · 자동으로' : '자동 · 수동으로'}</button></div>
      <div class="str"><span><b>저장</b><small>진행은 이 기기의 브라우저에 저장됩니다. 브라우저 기록을 지우면 사라집니다.</small></span></div></div>`;
    $('#stSnd').onclick = () => { $('#bSound').click(); drawProfP(); };
    $('#stSk').onclick = () => { save.skMan = !save.skMan; persist(); drawSkMode(); drawProfP(); };
  }
}

// ── 무기 등급 뽑기(관문 위 등급은 빼고 남은 확률을 다시 나눈다)
function gradeTable(tb, cap) { const t = tb.map((p, i) => (i <= cap ? p : 0)), s = t.reduce((a, b) => a + b, 0) || 1; return t.map((p) => p / s * 100); }
function rollGrade(tb, cap) { const t = gradeTable(tb, cap); let r = Math.random() * 100; for (let i = 0; i < t.length; i++) if ((r -= t[i]) < 0) return i; return 0; }
const wFree = (x) => !Object.values(save.wpn.eq).includes(x.u) && !x.lk;
const wFodder = (w) => save.wpn.inv.filter((x) => x !== w && x.rar === w.rar && wFree(x) && !(x.s > 0)).sort((a, b) => a.lv - b.lv);
function wPromote(w) { const g0 = gI(w); if (g0 >= 6) return; w.rar = WR[g0 + 1]; w.s = 0; const g1 = g0 + 1;
  if (g1 >= 4 && !w.opts.includes('auto_' + w.el)) w.opts.unshift('auto_' + w.el);
  const pool = Object.keys(WOPT).filter((k) => !k.startsWith('auto_') && !w.opts.includes(k)); while (w.opts.length < W_OPT_N[w.rar] && pool.length) w.opts.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  if (g1 >= 4) w.rel = w.el; }
// 승급: 영웅 이하는 같은 등급 3개 → 다음 등급 / 전설 이상은 같은 등급 1개로 별 +1, 별이 다 차면 다음 등급
function wMergeInfo(w) { const g0 = gI(w), F = wFodder(w), nx = WR[g0 + 1];
  if (g0 <= 3) { if (g0 + 1 > maxG()) return { ok: false, t: `${RAR[nx].nm}은 ${GATE[g0 + 1]}장을 열어야 만들 수 있습니다` }; return { ok: F.length >= 2, t: `같은 ${RAR[w.rar].nm} 무기 2개를 더해 ${RAR[nx].nm}으로 (${Math.min(F.length, 2)}/2)`, use: 2 }; }
  const mx = STAR_MAX[g0]; if ((w.s || 0) >= mx) { if (g0 >= 6) return { ok: false, t: '최고 등급 · 별 최대' }; return { ok: false, t: `${RAR[nx].nm}은 ${GATE[g0 + 1]}장을 열어야 오릅니다` }; }
  return { ok: F.length >= 1, t: `같은 ${RAR[w.rar].nm} 무기 1개로 별 +1 (별 ${w.s || 0}/${mx}${g0 < 6 ? ` · 다 차면 ${RAR[nx].nm}` : ''})`, use: 1 }; }
function wMerge(w) { const I = wMergeInfo(w); if (!I.ok) return false; const used = wFodder(w).slice(0, I.use), g0 = gI(w);
  for (const x of used) save.ore += Math.floor(x.lv / 2); save.wpn.inv = save.wpn.inv.filter((x) => !used.includes(x));
  if (g0 <= 3) wPromote(w); else { w.s = (w.s || 0) + 1; if (w.s >= STAR_MAX[g0] && g0 < 6 && g0 + 1 <= maxG()) wPromote(w); }
  return true; }
function wUp(w, times) { let k = 0; while (k < times && w.lv < wCap(w)) { const c = wUpCost(w); if (save.core < c.core || save.ore < c.ore) break; save.core -= c.core; save.ore -= c.ore; w.lv++; k++; } return k; }
function drawWpnTab(body, m) {
  const cur = wOf(m.id), eqU = (x) => Object.keys(save.wpn.eq).find((k) => save.wpn.eq[k] === x.u);
  const list = save.wpn.inv.slice().sort((a, b) => (b.u === (cur && cur.u)) - (a.u === (cur && cur.u)) || gI(b) - gI(a) || (b.s || 0) - (a.s || 0) || b.lv - a.lv);
  if (!wSel || !save.wpn.inv.find((w) => w.u === wSel)) wSel = cur ? cur.u : list[0] && list[0].u;
  const w = save.wpn.inv.find((x) => x.u === wSel);
  const stars = (x) => (STAR_MAX[gI(x)] ? `<span class="wsr">${'★'.repeat(x.s || 0)}<s>${'★'.repeat(STAR_MAX[gI(x)] - (x.s || 0))}</s></span>` : '');
  const tile = (x) => { const R0 = RAR[x.rar], E0 = ELEM[x.el], eq = eqU(x);
    return `<button class="wt g${gI(x)} ${x.u === wSel ? 'sel' : ''}" data-u="${x.u}" style="--rc:${R0.col};--ec:${E0.col}"><span class="wg">${ico2('wpn', E0.col)}</span><i class="we">${ico('el_' + x.el)}</i><b class="num">+${x.lv}</b>${x.s ? `<i class="ws num">★${x.s}</i>` : ''}${x.lk ? '<i class="wl">🔒</i>' : ''}${eq ? `<em>${eq === m.id ? '장착' : '사용 중'}</em>` : ''}</button>`; };
  let det = '<div class="wdet empty"><p>무기가 없습니다. 장을 깨거나 상점의 무기 보급에서 얻을 수 있습니다.</p></div>';
  if (w) { const R0 = RAR[w.rar], E0 = ELEM[w.el], owner = eqU(w), mine = owner === m.id, mt = w.el === m.el, c = wUpCost(w), cap = wCap(w), sv = wSell(w), MI = wMergeInfo(w), canUp = w.lv < cap && save.core >= c.core && save.ore >= c.ore;
    det = `<div class="wdet" style="--rc:${R0.col};--ec:${E0.col}"><div class="wh"><span class="skt lg">${ico2('wpn', E0.col)}</span><div><small class="rr">${R0.nm} · ${E0.nm} 계열 ${stars(w)}</small><b>${wName(w, m)}</b><span class="lvb"><i style="width:${Math.min(100, w.lv / cap * 100)}%"></i></span><small class="num">강화 +${w.lv} / ${cap}</small></div></div>`
      + `<div class="wst"><div><small>피해</small><b class="num">+${wDmg(w)}%</b></div><div><small>계열 일치</small><b>${mt ? '+10%' : '없음'}</b></div><div><small>다음 강화</small><b class="num">${w.lv >= cap ? '상한' : '+' + Math.round((W_DMG[w.rar] + (w.lv + 1) * 1.6) * (1 + .12 * (w.s || 0))) + '%'}</b></div></div>`
      + `<ul class="wop">${w.opts.length ? w.opts.map((o) => `<li class="${WOPT[o].auto ? 'au' : ''}"><b>${WOPT[o].nm}</b><small>${WOPT[o].ds}</small></li>`).join('') : '<li class="none"><small>각인 없음 · 고급 이상부터 각인이 붙습니다</small></li>'}</ul>`
      + (w.rel ? `<div class="wrel"><span class="skt sm">${ico2('release', E0.col)}</span><span><small>고유 해방 · 필살기와 함께 발동</small><b>${REL[w.rel].nm}</b><p>${REL[w.rel].ds}</p></span></div>` : '')
      + `<div class="wmg ${MI.ok ? 'ok' : ''}"><span>${ico('upgrade')}<b>승급</b><small>${MI.t}</small></span><button class="bs" data-a="mg" ${MI.ok ? '' : 'disabled'}>승급</button></div>`
      + `<div class="wbt">${mine ? `<button class="bs" data-a="off">해제</button>` : `<button class="bp" data-a="eq">${owner ? `${MECH(owner).nm}에게서 가져와 장착` : '장착'}</button>`}`
      + `<button class="bp" data-a="up" ${canUp ? '' : 'disabled'}>${w.lv >= cap ? '강화 상한' : `강화 ${ico('core')}${c.core.toLocaleString()} ${ico('ore')}${c.ore}`}</button>`
      + `<button class="bs" data-a="up5" ${canUp ? '' : 'disabled'}>강화 ×5</button>`
      + `<button class="bs" data-a="lk">${w.lk ? '잠금 해제' : '잠금'}</button>`
      + `${!owner && !w.lk ? `<button class="bs" data-a="sc">분해 ${ico('core')}${sv.core} ${ico('ore')}${sv.ore}</button>` : ''}</div></div>`; }
  const bulk = save.wpn.inv.filter((x) => gI(x) <= 2 && wFree(x)), bc = bulk.reduce((a, x) => a + wSell(x).core, 0), bo = bulk.reduce((a, x) => a + wSell(x).ore, 0);
  body.innerHTML = `<div class="ars2"><div class="wgrid"><div class="gh"><b>보유 무기</b><small class="num">${save.wpn.inv.length}개</small><button class="bs sm" id="wBulk" ${bulk.length ? '' : 'disabled'}>일괄 분해</button></div><div class="wts">${list.map(tile).join('')}</div></div>${det}</div>`;
  body.querySelectorAll('.wt').forEach((b) => (b.onclick = () => { wSel = +b.dataset.u; drawArsenal(); }));
  $('#wBulk').onclick = (e) => { const b = e.currentTarget; if (!b.dataset.ok) { b.dataset.ok = 1; b.classList.add('warn'); b.innerHTML = `일반·고급·희귀 ${bulk.length}개 분해? ${ico('core')}${bc} ${ico('ore')}${bo}`; return; }
    save.core += bc; save.ore += bo; save.wpn.inv = save.wpn.inv.filter((x) => !bulk.includes(x)); persist(); tone(500, 200, .2, 'triangle', .08); drawArsenal(); drawTitle(); };
  body.querySelectorAll('.wbt button, .wmg button').forEach((b) => (b.onclick = () => { const a = b.dataset.a;
    if (a === 'eq') { for (const k in save.wpn.eq) if (save.wpn.eq[k] === w.u) delete save.wpn.eq[k]; save.wpn.eq[m.id] = w.u; sfx.lvl(); }
    if (a === 'off') delete save.wpn.eq[m.id];
    if (a === 'up' || a === 'up5') { if (wUp(w, a === 'up' ? 1 : 5)) { sfx.lvl(); screenFlash(RAR[w.rar].col, .12, .3); } }
    if (a === 'lk') w.lk = !w.lk;
    if (a === 'mg') { const g0 = gI(w); if (wMerge(w)) { sfx.lvl(); screenFlash(RAR[w.rar].col, gI(w) > g0 ? .45 : .2, .7); flashMsg(gI(w) > g0 ? `${RAR[w.rar].nm} 등급으로 승급` : `별 ${w.s}개`); } }
    if (a === 'sc') { const s = wSell(w); save.core += s.core; save.ore += s.ore; save.wpn.inv = save.wpn.inv.filter((x) => x !== w); wSel = null; tone(500, 200, .2, 'triangle', .08); }
    persist(); drawArsenal(); drawTitle(); }));
}

// ── 스킬 강화(조선좀비 신력 방식): 기체마다 E·R·Q 1~5단계, 강화 회로 + 코어
const SK_MAX = 5, skCost = (lv) => ({ chip: lv * 10, core: lv * 300 });
const SK_FX = { e: (l) => `위력 +${(l - 1) * 20}% · 재사용 -${(l - 1) * 4}%`, r: (l) => `위력 +${(l - 1) * 20}%`, q: (l) => `위력 +${(l - 1) * 20}% · 필살 게이지 +${(l - 1) * 6}%` };
function drawSkTab(body, m) {
  const S0 = (save.sk[m.id] ||= {}), X = ELEM[m.el];
  const rows = [['e', 'E · 스킬', m.auto.nm, AUTO_DS[m.auto.k], ico2(m.auto.k, '#9ff3ff')], ['r', 'R · 계열 기술', X.sk.nm, X.sk.ds, ico2('el_' + m.el, X.col)], ['q', 'Q · 필살기', m.ult.nm, ULT_DS[m.ult.k], ico2(m.ult.k, '#ffd98a')]];
  body.innerHTML = `<div class="skw"><p class="snote"><b>${m.nm}</b>의 스킬을 강화합니다 · 강화 회로는 장을 깨거나 상점·메일로 얻습니다</p>${rows.map(([k, t, nm, ds, ic]) => { const lv = S0[k] || 1, c = skCost(lv), max = lv >= SK_MAX, ok = !max && save.chip >= c.chip && save.core >= c.core;
    return `<div class="skc"><span class="skt lg">${ic}</span><div class="skx"><small>${t}</small><b>${nm}</b><p>${ds || ''}</p><span class="sks">${Array.from({ length: SK_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}<em class="num">Lv ${lv}</em></span>
      <div class="skf"><span>지금 <b>${lv > 1 ? SK_FX[k](lv) : '기본'}</b></span>${max ? '' : `<span>다음 <b>${SK_FX[k](lv + 1)}</b></span>`}</div></div>
      <button class="bp" data-k="${k}" ${ok ? '' : 'disabled'}>${max ? '최대' : `강화<small>${ico('chip')}${c.chip} ${ico('core')}${c.core.toLocaleString()}</small>`}</button></div>`; }).join('')}</div>`;
  body.querySelectorAll('.skc .bp').forEach((b) => (b.onclick = () => { const k = b.dataset.k, lv = S0[k] || 1, c = skCost(lv); if (lv >= SK_MAX || save.chip < c.chip || save.core < c.core) return;
    save.chip -= c.chip; save.core -= c.core; S0[k] = lv + 1; persist(); sfx.lvl(); screenFlash(X.col, .2, .45); drawArsenal(); drawTitle(); }));
}

// ── 무기 보급(조선좀비 장비 뽑기 방식): 확률 공개 · 관문 · 50회 확정 · 10회 희귀 이상 보장 · 주간 전설 확정 구매
const EQP = [45, 30, 17, 6.5, 1.3, .15, .05], CRATE_C = [55, 30, 12, 3, 0, 0, 0], W_PITY = 50, LEG_PRICE = 2400;
const BOXES = [
  { k: 'c1', nm: '정비 보급', ds: '코어로 사는 기본 보급 1회', cur: 'core', cost: 400, n: 1, tb: CRATE_C },
  { k: 'g1', nm: '고급 보급', ds: '결정으로 사는 보급 1회', cur: 'gem', cost: 60, n: 1, tb: EQP },
  { k: 'g10', nm: '고급 보급 10회', ds: '희귀 이상 1개 보장 · 10% 할인', cur: 'gem', cost: 540, n: 10, tb: EQP },
];
const LWK = () => Math.floor((Date.now() / 864e5 + 3) / 7), legEls = () => { const k = LWK(); return [EL_KEYS[(k * 3) % 7], EL_KEYS[(k * 3 + 2) % 7]]; };
function pullBox(B) { if (save[B.cur] < B.cost) { flashMsg(B.cur === 'gem' ? '결정이 부족합니다' : '코어가 부족합니다'); return null; }
  save[B.cur] -= B.cost; const cap = maxG(), got = [];
  for (let i = 0; i < B.n; i++) { let gi = rollGrade(B.tb, cap);
    if (B.cur === 'gem') { save.wpity++; if (save.wpity >= W_PITY) { gi = Math.max(gi, Math.min(cap, 4)); } if (gi >= Math.min(cap, 4)) save.wpity = 0; }
    got.push(gi); }
  if (B.n >= 10 && !got.some((x) => x >= 2)) got[got.length - 1] = Math.min(2, cap);
  const ws = got.map((gi) => { const w = mkWeapon(WR[gi], Math.random() < .35 ? MECH(save.mech).el : null); save.wpn.inv.push(w); return w; });
  persist(); return ws; }
function wMini(w) { const R0 = RAR[w.rar], X = ELEM[w.el]; return `<div class="wmn g${gI(w)}" style="--rc:${R0.col};--ec:${X.col}"><span>${ico2('wpn', X.col)}</span><b>${R0.nm}</b><small>${X.nm}</small></div>`; }
function drawShopWpn(keep) {
  const res = keep ? ($('#crateRes') || {}).innerHTML || '' : '', cap = maxG(), [la, lb] = legEls(), bought = save.shop.legWk === LWK();
  const rateRow = (tb) => gradeTable(tb, cap).map((p, i) => p > 0 ? `<span style="--rc:${RAR[WR[i]].col}"><i></i>${RAR[WR[i]].nm} <b class="num">${p < 1 ? p.toFixed(2) : p.toFixed(1)}%</b></span>` : '').join('');
  $('#shopWpn').innerHTML = `<div class="crates">${BOXES.map((B, i) => `<div class="crate ${B.cur}"><div class="cimg">${ico2('chest', B.cur === 'gem' ? '#ffb0e0' : '#ffd27a')}</div><div class="ct"><b>${B.nm}</b><small>${B.ds}</small><div class="crr">${rateRow(B.tb)}</div></div>`
    + `<button class="bp" data-i="${i}" ${save[B.cur] < B.cost ? 'disabled' : ''}>${ico(B.cur === 'gem' ? 'gem' : 'core')} ${B.cost}</button></div>`).join('')}</div>`
    + `<div class="pity"><span>고급 보급 확정까지 <b class="num">${Math.max(0, W_PITY - save.wpity)}</b>회</span><small>50회째에는 지금 열린 가장 높은 등급(최대 전설)이 확정으로 나옵니다 · 열린 등급: ${RAR[WR[cap]].nm}까지 (다음 ${cap < 6 ? `${RAR[WR[cap + 1]].nm} · ${GATE[cap + 1]}장` : '없음'})</small></div>`
    + `<div class="legw"><div class="lgh"><small>주간 한정 · 매주 바뀜</small><b>전설 무기 확정 구매</b><p>이번 주 계열 ${[la, lb].map((e) => `<span class="chip el" style="--ec:${ELEM[e].col}">${ico('el_' + e)}${ELEM[e].nm}</span>`).join(' ')} 중 하나를 골라 전설 무기를 삽니다. 한 주에 1번, 장 관문과 상관없이 살 수 있습니다.</p></div>`
    + `<div class="lgb">${[la, lb].map((e) => `<button class="bp" data-el="${e}" ${bought || save.gem < LEG_PRICE ? 'disabled' : ''}>${bought ? '이번 주 구매 완료' : `${ELEM[e].nm} 전설 ${ico('gem')} ${LEG_PRICE.toLocaleString()}`}</button>`).join('')}</div></div>`
    + `<div id="crateRes">${res}</div><p class="fine">확률은 표에 적힌 그대로입니다(아직 열리지 않은 등급은 빠지고 남은 확률을 다시 나눕니다) · 무기 계열은 무작위이며 35%는 지금 고른 기체의 계열로 나옵니다 · 전설 이상은 고유 해방을 가집니다</p>`;
  const show = (ws) => { if (!ws) return; if (ws.some((w) => gI(w) >= 4)) screenFlash(RAR[WR[Math.max(...ws.map(gI))]].col, .45, .8); sfx.lvl();
    $('#crateRes').innerHTML = `<div class="wres">${ws.map(wMini).join('')}</div><button class="bs" id="toArms2">정비에서 보기</button>`; wSel = ws[ws.length - 1].u; drawShopHead(); drawShopWpn(true); drawTitle(); };
  $('#shopWpn').querySelectorAll('.crate button').forEach((b) => (b.onclick = () => show(pullBox(BOXES[+b.dataset.i]))));
  $('#shopWpn').querySelectorAll('.lgb button').forEach((b) => (b.onclick = () => { if (save.shop.legWk === LWK() || save.gem < LEG_PRICE) return; save.gem -= LEG_PRICE; save.shop.legWk = LWK(); const w = mkWeapon('SSR', b.dataset.el); save.wpn.inv.push(w); persist(); show([w]); }));
  if ($('#toArms2')) $('#toArms2').onclick = () => { $('#gacha').classList.add('hide'); openArsenal('wpn'); };
}
// ── 재화 상점(조선좀비 상점 방식): 매일 무료 · 교환
const GOODS = [
  { k: 'free', nm: '매일 무료 보급', ds: '하루 1번 무료', cur: 'gem', cost: 0, lim: 1, rw: { core: 300, ore: 3 } },
  { k: 'oreC', nm: '정련 합금 교환', ds: '코어로 교환 · 하루 5번', cur: 'core', cost: 600, lim: 5, rw: { ore: 5 } },
  { k: 'core3k', nm: '코어 묶음', ds: '결정으로 코어 구매', cur: 'gem', cost: 50, rw: { core: 3000 } },
  { k: 'ore20', nm: '정련 합금 상자', ds: '무기 강화 재료', cur: 'gem', cost: 80, rw: { ore: 20 } },
  { k: 'chip20', nm: '강화 회로 상자', ds: '스킬 강화 재료', cur: 'gem', cost: 80, rw: { chip: 20 } },
];
const goodsUsed = (G0) => (save.shop.day === dayKey() ? (save.shop.d || {})[G0.k] || 0 : 0);
function drawShopGoods() {
  $('#shopGoods').innerHTML = `<div class="gds">${GOODS.map((G0, i) => { const u = goodsUsed(G0), out = G0.lim && u >= G0.lim, poor = save[G0.cur] < G0.cost;
    return `<div class="gd ${G0.cost ? '' : 'free'}"><div class="gdi">${ico2(Object.keys(G0.rw)[0] === 'core' && G0.cost ? 'core' : Object.keys(G0.rw).includes('chip') ? 'chip' : Object.keys(G0.rw).includes('ore') && G0.cost ? 'ore' : 'chest', G0.cost ? '#9fe8ff' : '#7df06a')}</div><b>${G0.nm}</b><div class="rwl">${rwHtml(G0.rw)}</div><small>${G0.ds}${G0.lim ? ` · 오늘 ${u}/${G0.lim}` : ''}</small>`
      + `<button class="bp" data-i="${i}" ${out || poor ? 'disabled' : ''}>${out ? '오늘 완료' : G0.cost ? `${ico(G0.cur)} ${G0.cost.toLocaleString()}` : '무료 받기'}</button></div>`; }).join('')}</div><p class="fine">매일 0시에 횟수가 다시 채워집니다 · 정련 합금은 무기 강화, 강화 회로는 스킬 강화에 씁니다</p>`;
  $('#shopGoods').querySelectorAll('.gd button').forEach((b) => (b.onclick = () => { const G0 = GOODS[+b.dataset.i]; if (save.shop.day !== dayKey()) { save.shop.day = dayKey(); save.shop.d = {}; }
    const u = save.shop.d[G0.k] || 0; if ((G0.lim && u >= G0.lim) || save[G0.cur] < G0.cost) return; save[G0.cur] -= G0.cost; save.shop.d[G0.k] = u + 1; give(G0.rw); persist(); sfx.lvl(); flashMsg('구매 완료'); drawShopHead(); drawShopGoods(); drawTitle(); }));
}

// ───────── 쿠폰 ─────────
const cpnNorm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
const cpnHash = (s) => { let x = 5381; for (const c of cpnNorm(s)) x = ((x * 33) ^ c.charCodeAt(0)) >>> 0; return x.toString(36); };
const COUPONS = {
  '1nc94ca': { nm: '모든 기동전사 해금', run() { let n = 0; for (const m of MECHS) if (!save.own[m.id]) { save.own[m.id] = 1; n++; } return n ? `기동전사 ${n}기를 새로 얻었습니다. 이제 ${MECHS.length}기 모두 쓸 수 있습니다.` : `이미 ${MECHS.length}기를 모두 가지고 있습니다.`; } },
};
function redeemCoupon(code) {
  const k = cpnHash(code), C = COUPONS[k]; save.cpn ??= [];
  if (!cpnNorm(code)) return { ok: false, msg: '쿠폰 번호를 넣어 주세요.' };
  if (!C) return { ok: false, msg: '없는 쿠폰 번호입니다. 다시 확인해 주세요.' };
  if (save.cpn.includes(k)) { const msg = C.run(); persist(); return { ok: true, msg: '이미 쓴 쿠폰입니다. ' + msg }; }
  const msg = C.run(); save.cpn.push(k); persist(); return { ok: true, nm: C.nm, msg };
}
function drawCpn(root) {
  const used = (save.cpn || []).map((k) => COUPONS[k]?.nm).filter(Boolean);
  root.innerHTML = `<div class="cpnBox"><div class="cpnH">${ico2('gacha', '#f2b544')}<span><b>쿠폰 입력</b><small>받은 쿠폰 번호를 넣고 사용을 누르세요. 대소문자·띄어쓰기는 상관없습니다.</small></span></div>
    <div class="cpnRow"><input id="cpnIn" maxlength="24" autocomplete="off" spellcheck="false" placeholder="쿠폰 번호"><button class="go small" id="cpnGo">사용</button></div><p class="cpnMsg" id="cpnMsg"></p>
    ${used.length ? `<p class="fine">사용한 쿠폰: ${used.join(' · ')}</p>` : ''}</div>`;
  const go = () => { const r = redeemCoupon($('#cpnIn').value);
    if (r.ok) { sfx.lvl(); screenFlash(0xf2b544, .3, .5); try { drawTitle(); } catch (e) {} drawCpn(root); }
    const el = $('#cpnMsg'); el.textContent = r.msg; el.className = 'cpnMsg ' + (r.ok ? 'ok' : 'bad'); };
  const qc = new URLSearchParams(location.search).get('coupon'); if (qc && !drawCpn.used) { drawCpn.used = 1; $('#cpnIn').value = qc; }
  setTimeout(() => { try { $('#cpnIn').focus(); } catch (e) {} }, 60);
  $('#cpnGo').onclick = go; $('#cpnIn').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); };
}
function drawShopGem() {
  const L0 = LOGIN[(save.daily.streak || 0) % 7];
  const rows = [
    ['calendar', '출석 보상', loginReady() ? `오늘 받을 보상이 있습니다 (${L0.g ? '결정 ' + L0.g : '코어 ' + L0.c})` : '오늘 출석 완료 · 7일째에 결정 200', 'daily', loginReady()],
    ['quest', '일일 임무', '임무 하나마다 결정 10과 코어', 'daily', dailyPending()],
    ['map', '장 첫 클리어', '처음 깨는 장마다 결정 · 막을 끝내면 새 기체', 'map', false],
  ];
  $('#shopGem').innerHTML = `<div class="gway">${rows.map(([ic, n, d, go, dot]) => `<button class="gw" data-go="${go}"><span class="skt">${ico2(ic, '#ffb0e0')}</span><span><b>${n}${dot ? '<i class="dot"></i>' : ''}</b><small>${d}</small></span><em>바로 가기 ›</em></button>`).join('')}</div>`
    + `<div id="adGemBox"></div><p class="fine">유료 결정 판매는 아직 없습니다. 모든 결정은 플레이로 얻습니다.</p>`;
  $('#shopGem').querySelectorAll('.gw').forEach((b) => (b.onclick = () => { $('#gacha').classList.add('hide'); if (b.dataset.go === 'daily') { drawDaily(); $('#daily').classList.remove('hide'); } else $('#chMap').click(); }));
}

// ───────── 첫 화면 ─────────
// ───────── 성장·해금·출석·임무·챕터·뽑기 (계속 다시 하고 싶게 만드는 장치) ─────────
// 코어: 판마다 격파·생존·승리로 벌고, 기체 구매와 격납고 영구 강화에 쓴다
// 결정: 챕터 첫 클리어·별·출석·임무·광고로 모으고, 뽑기에 쓴다(나중에 유료 구매도 같은 자리)
const UPG = [
  { k: 'armor', nm: '장갑 보강', ic: 'armor', ds: (lv) => `최대 내구 +${lv * 6}%` },
  { k: 'power', nm: '출력 강화', ic: 'power', ds: (lv) => `모든 피해 +${lv * 5}%` },
  { k: 'thrust', nm: '추진 강화', ic: 'thruster', ds: (lv) => `이동 +${lv * 3}%` },
  { k: 'cool', nm: '냉각 계통', ic: 'reactor', ds: (lv) => `재사용 대기 -${lv * 3}%` },
  { k: 'magnet', nm: '수집 장치', ic: 'magnet', ds: (lv) => `경험치 수집 범위 +${lv * 12}%` },
  { k: 'repair', nm: '자가 수리', ic: 'repair', ds: (lv) => `초당 내구 +${(lv * .25).toFixed(2)}` },
];
const UPG_MAX = 10, upCost = (lv) => Math.round(80 * Math.pow(1.45, lv));
const starOf = (id) => save.own[id] || 0, rarOf = (m) => RAR[m.rar || 'N'];
const powMul = (m) => rarOf(m).mul * (1 + .06 * Math.max(0, starOf(m.id) - 1));
function applyMech(m) {
  const U = (k) => save.up[k] || 0, pm = powMul(m);
  P.maxHp = Math.round(100 * m.hp * pm * (1 + .06 * U('armor'))); P.dmgMul = m.dmg * pm * (1 + .05 * U('power'));
  P.spdMul = m.spd * (1 + .03 * U('thrust')); P.cdMul = m.cd * (1 - .03 * U('cool')); P.magnet = 30 * (1 + .12 * U('magnet')); P.regen = .25 * U('repair');
  if (m.init) m.init(P); applyGear(m); P.maxHp = Math.round(P.maxHp); P.hp = P.maxHp;
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// 출석 7일: 코어와 결정(✦)을 번갈아. 7일째 큰 보상
const LOGIN = [{ c: 80 }, { g: 30 }, { c: 150 }, { g: 50 }, { c: 250 }, { g: 80 }, { g: 200 }];
const MPOOL = [
  { k: 'kills', n: [300, 600, 900], rw: [70, 110, 150], t: (n) => `적 ${n}마리 격파 (누적)` },
  { k: 'time', n: [120, 180, 240], rw: [60, 90, 130], t: (n) => `한 판에 ${fmt(n)} 버티기` },
  { k: 'big', n: [1, 2, 3], rw: [80, 120, 170], t: (n) => `거대 개체·보스 ${n}마리 격파` },
  { k: 'flights', n: [3, 6], rw: [60, 90], t: (n) => `비행 ${n}번 하기` },
  { k: 'ults', n: [2, 4], rw: [60, 100], t: (n) => `필살기 ${n}번 쓰기` },
  { k: 'skills', n: [10, 25], rw: [60, 100], t: (n) => `스킬 ${n}번 발동` },
  { k: 'mechs', n: [2, 3], rw: [90, 130], t: (n) => `서로 다른 기체로 ${n}판 출격` },
  { k: 'queen', n: [1], rw: [220], t: () => `여왕 격파` },
];
function rollDaily() {
  const D = save.daily, today = dayKey(); if (D.day === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (D.lastClaim !== dayKey(y) && D.lastClaim !== today) D.streak = 0;
  D.day = today; D.mechs = []; D.ads = 0;
  const pool = MPOOL.slice().sort(() => Math.random() - .5).slice(0, 3);
  D.ms = pool.map((p) => { const i = (Math.random() * p.n.length) | 0; return { k: p.k, n: p.n[i], rw: p.rw[i], p: 0, done: false, got: false }; });
  persist();
}
const loginReady = () => save.daily.lastClaim !== dayKey();
const dailyPending = () => loginReady() || (save.daily.ms || []).some((m) => m.done && !m.got);

// ── 챕터: 1장은 처음 난이도 그대로. 장이 오를수록 적 구성·땅 색·중간 보스가 바뀌고 강해진다
// 막 = ASCEND 은하 지도의 행성, 장 = 그 행성의 전장. 기체는 유저가 고르고, 장마다 추천 기종만 있다
// 부: 이야기 단위(6막 24장). 1부는 처음 만든 그대로, 2부부터 임무 방식과 막 보스가 붙는다
const PARTS = [
  { no: 1, nm: '첫 침공', syn: '분대가 하룻밤 사이에 사라졌다. 살아남은 것은 당신 하나. 보조조종 AI 세라가 깨어난 기체에 올라, 하늘에서 쏟아지는 제타 군체를 막아라. 지구에서 우주로, 불과 얼음을 지나 제타의 모성까지.', end: '하이브 퀸이 쓰러졌다. 하이브 깊은 곳에서 나온 배양 기록에는 제타를 만든 자의 서명이 남아 있다 ─ 「OMEGA」. 그리고 그 순간, 궤도에 정체 모를 함대가 나타났다.' },
  { no: 2, nm: '망명자의 그림자', syn: '궤도의 함대는 제타에게 멸망한 문명 「알파」의 망명자들이었다. 사령관 세라핀은 손을 내밀지만, 그 손에는 행성째 지우는 「정화 계획」이 들려 있다. 폐허가 된 알파의 고향 에덴으로 내려가 지워진 기록을 찾아라.', end: '세라핀의 기함이 무너지는 순간, 알파의 마지막 수호기 아스트라가 눈을 떴다. "나는 심판이 아닌 수호를 택하겠다." 그리고 알파의 비밀을 말했다. 제타는 실패작, 오메가는 성공작. 알파는 둘 다 언젠가 지울 생각이었다.' },
];
const ACTS = [
  { part: 1, pl: 'earth', nm: '지구 · 네오 서울', st: '첫 침공', col: '#5ad1ff', rw: 'm_guardian', story: '분대가 전멸한 밤. 세라가 말한다. "생존자 1명 확인. 설명은 살아남은 뒤에 하겠습니다." 하윤의 인식표 뒷면에는 「한강 야시장, 네가 쏘는 거야」라고 적혀 있다.' },
  { part: 1, pl: 'aegis', nm: '궤도 기지 이지스', st: '망명자의 함대', col: '#9fe0ff', rw: 'm_ranger', story: '피난민을 실은 이지스 기지에서 기계 병사의 반란이 일어났다. 폭격 사이로, 정체 모를 함대의 신호가 스친다.' },
  { part: 1, pl: 'ignis', nm: '화산 행성 이그니스', st: '불의 행성', col: '#ff7a2a', rw: 'm_titan', story: '용암 둥지에서 불의 정령 이그니가 깨어난다. "…날 깨운 게 너야? 좋아, 불타는 놈들은 내가 다 맡지."' },
  { part: 1, pl: 'niv', nm: '빙하 위성 니브', st: '얼음 아래의 진실', col: '#bfe9ff', rw: 'm_sky', story: '얼음 속에서 연구 일지가 나왔다. 제타는 자연에서 생긴 것이 아니었다. 누군가 "배양"한 것이었다.' },
  { part: 1, pl: 'lumen', nm: '빛의 성운 루멘', st: '수호자의 각성', col: '#ffd166', rw: 'm_origin', story: '루멘 사원에서 파일럿 루나가 합류한다. "와, 진짜 사람이다! 오늘 운이 좋을 것 같아요. 제 직감은 틀린 적이 거의 없거든요."' },
  { part: 1, pl: 'hive', nm: '제타 대모 하이브', st: '최후의 저항', col: '#ffa040', rw: 'mech_leg', story: '모든 것이 시작된 둥지. 하이브의 심장에 제타를 만든 자의 기록이 잠들어 있다.' },
  { part: 2, x: 36, y: 45, nm: '중립 회랑', st: '회색 지대', col: '#a0dcff', gem: 150, core: 600, story: '알파 함대가 중립 회랑을 봉쇄했다. 사령관 세라핀의 첫 통신. "기체를 다룰 줄 아는 인간이 있었군. 시험해 보지."' },
  { part: 2, x: 57, y: 11, nm: '알파 망명 항로', st: '빛을 잃은 함대', col: '#c58cff', gem: 150, core: 700, story: '세라핀의 함대에 오른다. 빛나는 복도 끝, 봉인된 문 너머에 한 단어가 적혀 있다 ─ 「정화」.' },
  { part: 2, x: 70, y: 21, nm: '알파 모성 에덴', st: '무너진 낙원', col: '#d8b0ff', gem: 200, core: 800, story: '제타에게 삼켜진 알파의 고향. 잿빛 정원 한가운데, 아직 꺼지지 않은 방송탑 하나가 같은 기록을 되풀이해 보내고 있다.' },
  { part: 2, x: 78, y: 31, nm: '에덴 지하 서고', st: '기억의 서고', col: '#9f8cff', gem: 200, core: 900, story: '지하 서고에서 「정화 계획」 문서가 나왔다. 세라핀이 낮게 말한다. "…그 기록은 지워졌어야 했다."' },
  { part: 2, x: 82, y: 13, nm: '정화포 요새', st: '심판의 창', col: '#ffd166', gem: 250, core: 1000, story: '행성 하나를 통째로 지우는 알파의 정화포가 지구를 겨눈다. 세라가 짧게 말한다. "충전 완료까지 남은 시간이 많지 않습니다."' },
  { part: 2, x: 64, y: 35, nm: '에덴 궤도', st: '수호를 택한 빛', col: '#e0c8ff', rw: 'astra', story: '세라핀의 기함과 정면으로 맞선다. 무너지는 함교 아래, 오래 잠들어 있던 알파의 마지막 빛이 희미하게 깜빡인다.' },
];
const STG1 = [
  // 1막 지구 · 네오 서울
  ['모래 전선', '제타 무리의 첫 습격. 넓은 사막이니 빠르게 움직이며 싸워라', ['기동'], {}, ['goliath', 'scorp', 'brood'], [1, 1, 1], 0x2a1a24, ['#6a4a2a', '#2a1a14']],
  ['무너진 고가도로', '좁은 도로로 보병이 밀려든다. 몰려오는 적을 베어 넘겨라', ['근접'], { trooper: 2, robo: 1.4 }, ['goliath', 'scorp', 'goliath'], [.9, .88, .95], 0x1c1a26, ['#4a4a5a', '#16141e']],
  ['붉은 협곡', '대공 보병이 하늘을 노린다. 다가오기 전에 멀리서 쏴라', ['사격'], { trooper: 1.6, aat: 2, spit: 1.3 }, ['scorp', 'goliath', 'brood'], [1.05, .72, .6], 0x2e130e, ['#8a3a22', '#2a0e08']],
  ['결전 · 네오 서울의 하늘', '도시를 지켜라. 제타 여왕이 직접 내려온다', ['근접', '사격'], { trooper: 1.5, robo: 1.5, wing: 1.6 }, ['goliath', 'brood', 'scorp'], [.95, .85, .9], 0x241a2e, ['#5a4a7a', '#1a1226']],
  // 2막 궤도 기지 이지스
  ['격납 갑판', '기계 병사가 갑판을 점령했다. 단단한 장갑으로 버티며 밀어내라', ['중장'], { robo: 2.6, trooper: 1.4 }, ['goliath', 'goliath', 'scorp'], [.82, .86, .95], 0x141a26, ['#4a5a7a', '#10141e']],
  ['제공권', '날벌레와 전투기가 하늘을 덮었다. 비행은 위험하다. 대공 사격이 답이다', ['사격'], { wing: 3, jet: 4, heli: 3, aat: 1.5 }, ['brood', 'goliath', 'brood'], [.85, .9, 1.05], 0x14202e, ['#2a4a7a', '#0a1222']],
  ['기계 반란', '대공 전차와 골리앗이 전선을 밀고 온다', ['중장'], { robo: 2.5, aat: 2, aagun: 3 }, ['goliath', 'goliath', 'goliath'], [.82, .82, .88], 0x1a1a20, ['#5a5a66', '#16161c']],
  ['결전 · 망명자의 함대', '폭격이 쏟아진다. 멈추면 죽는다. 움직이며 여왕을 잡아라', ['기동'], { jet: 3, heli: 3, wing: 2, aagun: 1.5 }, ['brood', 'goliath', 'scorp'], [.78, .84, 1], 0x101a30, ['#3a5a9a', '#0a1020']],
  // 3막 화산 행성 이그니스
  ['용암 평원', '자폭충이 끝없이 굴러온다. 붙기 전에 쏴서 터뜨려라', ['사격'], { bane: 2.6, roach: 1.6 }, ['scorp', 'goliath', 'scorp'], [1.05, .58, .42], 0x2a0c06, ['#9a3a10', '#2a0802']],
  ['재의 협곡', '바퀴충 떼가 좁은 길을 메운다. 베고 지나가라', ['근접'], { roach: 2.4, trooper: 1.4 }, ['goliath', 'scorp', 'brood'], [.8, .6, .52], 0x221010, ['#6a3a2a', '#1e0a06']],
  ['분화구', '플라즈마가 쏟아지는 분화구. 한자리에 서 있지 마라', ['기동'], { plasma: 2.4, bane: 1.6, spit: 1.3 }, ['scorp', 'scorp', 'brood'], [1.1, .66, .4], 0x300e04, ['#b2501a', '#2a0a02']],
  ['결전 · 불의 행성', '거대 개체가 쉬지 않는다. 버티는 쪽이 이긴다', ['중장'], { roach: 2, bane: 2, robo: 1.5 }, ['goliath', 'goliath', 'scorp'], [1.08, .5, .36], 0x2e0802, ['#a83410', '#2a0600']],
  // 4막 빙하 위성 니브
  ['얼음 평원', '탁 트인 설원. 저격과 대공 사격이 오간다', ['사격'], { trooper: 2, aat: 2, jet: 3 }, ['brood', 'goliath', 'scorp'], [.92, 1, 1.12], 0x18222e, ['#6a8aa8', '#141e2a']],
  ['얼음 동굴', '어둠 속 잠복충이 바로 옆에서 튀어나온다', ['근접'], { lurk: 2.4, roach: 1.4 }, ['scorp', 'scorp', 'goliath'], [.55, .62, .8], 0x0a1018, ['#2a3a5a', '#060a12']],
  ['눈보라', '시야가 짧다. 사방에서 무리가 몰려온다. 포위되기 전에 빠져나가라', ['기동'], { wing: 2, spit: 1.6 }, ['brood', 'scorp', 'brood'], [.86, .94, 1.08], 0x1a2430, ['#8aa8c8', '#18222e']],
  ['결전 · 얼음 아래의 진실', '얼음 밑에서 여왕과 브루드로드가 함께 깨어난다', ['중장'], { lurk: 1.6, aat: 1.6, heli: 2.5 }, ['goliath', 'brood', 'scorp'], [.7, .82, 1.05], 0x0e1828, ['#4a6a9a', '#0a1220'], 1],
  // 5막 빛의 성운 루멘
  ['공허의 틈', '차원의 틈에서 정예가 쏟아진다. 거리를 두고 쏴라', ['사격'], { spit: 2, lurk: 2, heli: 3 }, ['scorp', 'brood', 'brood'], [.8, .62, 1], 0x160a24, ['#5a2a8a', '#12061e']],
  ['빛의 사원', '사원 회랑에 기계 병사가 줄지어 선다. 파고들어 베어라', ['근접'], { robo: 2.4, trooper: 2 }, ['goliath', 'scorp', 'goliath'], [1.05, .95, .7], 0x221a0c, ['#a8883a', '#221808']],
  ['성운 폭풍', '하늘 전력의 총공세. 대공 사격과 빠른 발이 필요하다', ['사격', '기동'], { jet: 3.5, heli: 3.5, wing: 2.5 }, ['brood', 'brood', 'goliath'], [.9, .8, 1.05], 0x1a1030, ['#7a5aaa', '#140a22']],
  ['결전 · 수호자의 각성', '칠흑의 성운에서 모든 적이 몰려온다', ['중장'], { lurk: 2, wing: 2, robo: 1.6 }, ['scorp', 'brood', 'goliath'], [.5, .52, .68], 0x0a0a16, ['#22224a', '#05050e']],
  // 6막 제타 대모 하이브
  ['산성 늪', '산성병과 플라즈마가 쏟아지는 늪. 멈추지 마라', ['기동'], { spit: 2.4, plasma: 2, bane: 1.5 }, ['scorp', 'scorp', 'brood'], [.72, .92, .6], 0x132016, ['#3a6a2a', '#0e1a0a']],
  ['하이브 외벽', '두꺼운 외벽 앞 총력전. 맞으면서도 밀고 나가라', ['중장'], { roach: 2, robo: 2, aagun: 2 }, ['goliath', 'goliath', 'brood'], [.85, .75, .55], 0x1e1408, ['#7a5a2a', '#1a1006']],
  ['군체의 심장', '심장부의 정예 무리. 붙어서 끊어 내라', ['근접'], { lurk: 2, bane: 2, spit: 1.5 }, ['scorp', 'brood', 'scorp'], [.95, .6, .45], 0x200a06, ['#8a3a1a', '#1e0804']],
  ['결전 · 최후의 저항', '모든 적, 여왕과 브루드로드. 은하의 운명이 이 전장에 달렸다', ['중장', '근접'], { jet: 3, aagun: 2, heli: 3 }, ['goliath', 'scorp', 'brood'], [1.08, .86, .55], 0x241608, ['#a8782a', '#2a1806'], 1],
];
// 2부: [이름, 설명, 추천, 적 구성, 중간 보스, 땅 색, 하늘, 카드 색, 쌍둥이, 임무, 결전 보스]
const STG2 = [
  ['봉쇄선', '알파 무인 초계기가 회랑을 막는다. 먼저 하늘을 비워라', ['사격'], { jet: 3, heli: 2.5, wing: 2, robo: 1.5 }, ['brood', 'goliath', 'brood'], [.8, .88, 1], 0x10182a, ['#5a7a9a', '#101826'], 0, '제공권', 'mb_guard'],
  ['표류하는 피난선', '고장 난 피난선을 끝까지 지켜라', ['중장'], { robo: 2, trooper: 1.5 }, ['goliath', 'scorp', 'goliath'], [.8, .88, 1], 0x10182a, ['#5a7a9a', '#101826'], 0, '호위', 'mb_guard'],
  ['회색 성운', '시야가 짧은 성운 속 매복. 붙는 적을 끊어라', ['근접'], { lurk: 2, robo: 2 }, ['scorp', 'scorp', 'brood'], [.62, .7, .86], 0x0a0f1c, ['#3a4a6a', '#080c16'], 0, '야간', 'mb_guard'],
  ['결전 · 세라핀의 시험', '알파 사령관의 근위기가 시험하러 온다', ['기동'], { robo: 2.2, jet: 2 }, ['goliath', 'brood', 'scorp'], [.8, .88, 1], 0x10182a, ['#5a7a9a', '#101826'], 0, '보스', 'mb_honor'],
  ['망명자 정박지', '정박지에 숨어든 제타 잔당을 몰아내라', ['사격'], { roach: 1.6, spit: 1.5, robo: 1.4 }, ['scorp', 'goliath', 'brood'], [.78, .76, .9], 0x120c22, ['#5a4a8a', '#100a1e'], 0, '생존', 'mb_guard'],
  ['격납고의 침입자', '격납고 곳곳의 둥지를 모두 깨부숴라', ['근접'], { bane: 1.5, roach: 1.4 }, ['goliath', 'scorp', 'goliath'], [.78, .76, .9], 0x120c22, ['#5a4a8a', '#100a1e'], 0, '소탕', 'mb_guard'],
  ['엔진실 폭주', '폭주하는 엔진실을 지나 반대편까지 돌파하라', ['기동'], { plasma: 2, bane: 1.5 }, ['scorp', 'brood', 'scorp'], [.9, .7, .8], 0x1e0c1a, ['#7a3a6a', '#1a0814'], 0, '돌파', 'mb_guard'],
  ['결전 · 함장실 방어선', '봉인된 문을 지키는 알파 중기체를 쓰러뜨려라', ['중장'], { robo: 2.4, aat: 1.6 }, ['goliath', 'goliath', 'scorp'], [.78, .76, .9], 0x120c22, ['#5a4a8a', '#100a1e'], 0, '보스', 'mb_heavy'],
  ['잿빛 정원', '재가 쌓인 정원. 넓게 움직이며 무리를 흩어라', ['기동'], { roach: 1.8, lurk: 1.5 }, ['goliath', 'scorp', 'brood'], [.72, .7, .74], 0x1a1418, ['#6a6070', '#141016'], 0, '생존', 'mb_guard'],
  ['무너진 성당', '좁은 성당 안으로 적이 쏟아진다', ['근접'], { trooper: 1.5, robo: 2 }, ['scorp', 'goliath', 'scorp'], [.7, .66, .72], 0x161216, ['#5a5060', '#120e14'], 0, '생존', 'mb_guard'],
  ['마지막 방송탑', '방송탑이 기록을 다 보낼 때까지 지켜라', ['사격'], { wing: 2, spit: 1.8 }, ['brood', 'goliath', 'brood'], [.72, .7, .74], 0x1a1418, ['#6a6070', '#141016'], 0, '방어', 'mb_guard'],
  ['결전 · 정원의 파수꾼', '수천 년을 지켜 온 거대 파수 기계가 깨어난다', ['중장'], { roach: 2, robo: 1.6 }, ['goliath', 'scorp', 'goliath'], [.72, .7, .74], 0x1a1418, ['#6a6070', '#141016'], 0, '보스', 'warden'],
  ['봉인된 계단', '끝없는 계단을 내려가며 길을 뚫어라', ['근접'], { lurk: 1.8, roach: 1.6 }, ['scorp', 'scorp', 'goliath'], [.55, .5, .7], 0x0c0a18, ['#3a2a6a', '#08060e'], 0, '돌파', 'mb_guard'],
  ['자료 보관실', '세라가 기록을 해독하는 동안 버텨라', ['사격'], { spit: 2, robo: 1.6 }, ['brood', 'goliath', 'scorp'], [.55, .5, .7], 0x0c0a18, ['#3a2a6a', '#08060e'], 0, '방어', 'mb_guard'],
  ['지워진 이름들', '불 꺼진 서가 사이의 잠복충을 찾아내라', ['기동'], { lurk: 2.4, wing: 1.5 }, ['scorp', 'brood', 'scorp'], [.5, .46, .66], 0x08060e, ['#2a1a4a', '#06040a'], 0, '야간', 'mb_guard'],
  ['결전 · 서고의 문지기', '기록을 지키는 거대한 문지기를 넘어서라', ['중장'], { spit: 1.8, lurk: 1.6 }, ['brood', 'scorp', 'goliath'], [.55, .5, .7], 0x0c0a18, ['#3a2a6a', '#08060e'], 0, '보스', 'keeper'],
  ['포대 외곽', '요새 외곽의 포대를 맞으며 밀고 들어가라', ['중장'], { aagun: 2.5, aat: 2, robo: 1.5 }, ['goliath', 'goliath', 'scorp'], [1.05, .98, .85], 0x1e1a10, ['#a89a6a', '#1e1a0e'], 0, '생존', 'mb_guard'],
  ['냉각탑', '냉각탑 위의 저격 기체들을 먼저 잡아라', ['사격'], { aat: 2, jet: 2.5, heli: 2 }, ['brood', 'goliath', 'brood'], [.95, 1, 1.05], 0x161a22, ['#8a9aaa', '#12161e'], 0, '제공권', 'mb_guard'],
  ['충전 회로', '정화포 충전이 끝나기 전에 회로를 끊어라', ['기동'], { robo: 2, plasma: 1.6 }, ['scorp', 'brood', 'scorp'], [1.05, .98, .85], 0x1e1a10, ['#a89a6a', '#1e1a0e'], 0, '시간제한', 'mb_guard'],
  ['결전 · 정화포 핵', '정화포의 핵을 지키는 수호기를 베어라', ['근접'], { robo: 2.2, aat: 1.8, jet: 1.6 }, ['goliath', 'scorp', 'brood'], [1.08, 1, .82], 0x221c0e, ['#b8a060', '#221a08'], 0, '보스', 'mb_core'],
  ['궤도 엘리베이터', '무너지는 궤도 엘리베이터를 타고 끝까지 달려라', ['기동'], { robo: 2, wing: 2 }, ['brood', 'scorp', 'goliath'], [.62, .66, .9], 0x06061a, ['#2a2a6a', '#04040e'], 0, '탈출', 'mb_guard'],
  ['근위 함대', '근위 함대의 전투기 편대를 걷어 내라', ['사격'], { jet: 4, heli: 3, wing: 2 }, ['brood', 'brood', 'goliath'], [.62, .66, .9], 0x06061a, ['#2a2a6a', '#04040e'], 0, '제공권', 'mb_guard'],
  ['세라핀의 기함', '기함 갑판 위의 근위 기사들을 베어라', ['근접'], { robo: 2.6, trooper: 1.6 }, ['goliath', 'scorp', 'goliath'], [.7, .66, .92], 0x0a0820, ['#4a3a8a', '#08061a'], 0, '생존', 'mb_honor'],
  ['결전 · 심판할 자인가 지킬 자인가', '알파 사령관 세라핀과의 결전. 이기면 알파의 마지막 빛이 깨어난다', ['중장'], { robo: 2.4, jet: 2.4, heli: 2 }, ['goliath', 'scorp', 'brood'], [.7, .66, .92], 0x0a0820, ['#4a3a8a', '#08061a'], 0, '보스', 'mb_seraphine'],
];
const CHAPTERS = [
  ...STG1.map(([nm, ds, rec, mix, mids, gg, sky, c, twin], i) => ({ part: 1, a: Math.floor(i / 4), ai: Math.floor(i / 4), n: i % 4 + 1, nm, ds, rec, mix, mids, g: gg, sky, c, twin: !!twin, type: i % 4 === 3 ? '보스' : '생존',
    th: +(1 + i * .283).toFixed(2), early: Math.round(Math.min(115, i * 5)) })),
  ...STG2.map(([nm, ds, rec, mix, mids, gg, sky, c, twin, type, boss], j) => ({ part: 2, a: 6 + Math.floor(j / 4), ai: Math.floor(j / 4), n: j % 4 + 1, nm, ds, rec, mix, mids, g: gg, sky, c, twin: !!twin, type, boss,
    th: +(2.4 + j * .27).toFixed(2), early: Math.round(Math.min(120, 40 + j * 3.5)) })),
];
CHAPTERS.forEach((c, i) => { c.theme = THEME_OF[i] || 'sand'; });
// 장을 이기면 결과 화면에 나오는 한 줄 대사(장 순서대로)
const DEBRIEF = [["세라","첫 전투 생존. …당신, 손이 떨리지 않는군요."],["세라","도로가 무너진 건 제타 때문만이 아닙니다. 누군가 길을 끊어 두었습니다."],["세라","대공 보병의 장비가 연맹 제식이 아닙니다. 기록해 두겠습니다."],["세라","여왕 격파. 네오 서울 상공 확보. …하윤 님의 인식표는 제가 보관하겠습니다."],["세라","기계 병사들의 명령 코드가 바깥에서 들어왔습니다. 출처는 알 수 없습니다."],["세라","하늘이 비었습니다. 피난선이 출발할 수 있습니다."],["세라","반란은 진압했습니다. 그런데 이 신호… 이지스 바깥에서 오고 있습니다."],["세라","정체 모를 함대가 물러났습니다. 공격이 아니라… 관찰이었습니다."],["이그니","오, 제법인데? 그 녀석들은 원래 내 둥지 손님이 아니었어."],["이그니","길 뚫어 줘서 고마워. 이제 불은 네 편이야."],["세라","용암 온도가 오르고 있습니다. 오래 머물면 기체가 견디지 못합니다."],["이그니","하하! 마음에 들었어. 앞으로는 내가 같이 타 줄게!"],["세라","얼음 아래에서 오래된 연구 시설의 신호가 잡힙니다."],["세라","연구 일지 1권 회수. 날짜가… 제타가 처음 나타난 날보다 앞섭니다."],["세라","일지에 같은 단어가 되풀이됩니다. 「배양」."],["세라","제타는 누군가 길러 낸 것입니다. 누가, 왜인지는 아직 모릅니다."],["루나","와, 저 틈 봤어요? 저기서 뭔가 우릴 보고 있었어요."],["루나","사원 벽에 날개 넷 달린 기체 그림이 있어요. 무슨 뜻일까요?"],["루나","거봐요, 오늘 운 좋을 거라고 했잖아요!"],["세라","사원의 수호 신호가 깨어났습니다. 다음 목적지, 제타의 모성."],["세라","하이브까지 남은 거리 4천. 늪을 건넜습니다."],["세라","외벽 돌파. 안쪽에서 거대한 생체 신호가 뜁니다."],["세라","배양 기록 저장소를 찾았습니다. 여왕을 쓰러뜨리면 열 수 있습니다."],["세라","기록 해독 중… 서명 확인. 「OMEGA」."],["세라","봉쇄선에 틈이 생겼습니다. 알파 초계기는 모두 무인기였습니다."],["세라","피난선 도착. 승객 412명 모두 무사합니다."],["세라핀","어둠 속에서도 칼끝이 흔들리지 않는군. 흥미롭다."],["세라핀","시험은 통과다. 우리 함대로 와라, 파일럿."],["세라","알파 함대에도 제타가 숨어 있었습니다. 그들도 쫓기는 중입니다."],["세라","격납고 정리 완료. 봉인된 문 쪽 경비가 두 배로 늘었습니다."],["세라","엔진 폭주는 사고가 아니었습니다. 누군가 우리를 막으려 했습니다."],["세라","봉인된 문 너머 기록에서 단어 하나를 읽었습니다. 「정화」."],["세라","여기가 알파의 고향, 에덴입니다. 생존자 신호는… 없습니다."],["세라","성당 벽에 알파의 기도문이 남아 있습니다. 「우리가 지운 것들을 용서하소서」."],["세라","방송탑이 전송을 마쳤습니다. 받는 곳은… 세라핀의 기함입니다."],["세라","파수꾼이 지키던 것은 정원이 아니라, 지하로 가는 길이었습니다."],["세라","계단 끝에 서고가 있습니다. 알파의 모든 기록이 모인 곳입니다."],["세라","해독 완료. 「정화 계획」 ─ 행성째 생명을 지우는 계획입니다."],["세라","지워진 이름들 가운데… 제타와 오메가가 있습니다."],["세라핀","…그 기록은 지워졌어야 했다."],["세라","정화포 조준 좌표 확인. 지구입니다."],["세라","냉각탑 정지. 충전 속도가 떨어졌습니다. 아직 시간이 있습니다."],["세라","회로 차단 성공. 정화포 충전이 37%에서 멈췄습니다."],["세라","정화포 무력화. 세라핀의 기함이 움직입니다."],["세라","궤도 도달. 기함까지 직선거리 2천."],["세라","근위 함대 무력화. 이제 세라핀뿐입니다."],["세라핀","여기까지 오다니. 그렇다면 끝까지 시험해 주지."],["아스트라","파일럿. 나는 심판이 아닌 수호를 택하겠다. 당신이 그것을 증명했으니."]];
const stLabel = (i) => `${CHAPTERS[i].part}부 ${CHAPTERS[i].ai + 1}막 ${CHAPTERS[i].n}장`;
const recHtml = (c, cls) => `<span class="rec"><span class="mty">${c.type}</span>${c.theme && c.theme !== 'sand' ? `<span class="mth">${THEME_NM[c.theme]}</span>` : ''}${c.rec.map((k) => `<span class="${k === cls ? 'ok' : ''}">${ico(CLS[k].k)}${k}</span>`).join('')}</span>`;
const CH = () => CHAPTERS[(G.chi ?? save.ch - 1)] || CHAPTERS[0];
const CH_CLEAR_GEM = (i) => 80 + i * 12, CH_STAR_GEM = 30;
function applyChapterLook(ch) {
  applyTheme(ch.theme, ch.g);
  scene.background.set(ch.sky); scene.fog.color.set(ch.sky);
  const night = ch.type === '야간'; hemi.intensity = night ? .42 : 1.25; sun.intensity = night ? .5 : 1.9; scene.fog.near = night ? 110 : 300; scene.fog.far = night ? 360 : 760;
  if (night && !P.lamp) { P.lamp = new THREE.PointLight(0xcfe6ff, 60, 230, 1); P.lamp.position.set(0, 30, 0); P.group.add(P.lamp); } if (P.lamp) P.lamp.visible = night;
}
function chStarsTxt(i) { const s = save.stars[i + 1] || 0; return '★'.repeat(s) + '☆'.repeat(3 - s); }

// 판 정산: 코어 + 챕터 별·첫 클리어 결정 + 임무 진행
function runReward(won) {
  const mul = 1 + .25 * (G.threat - 1), a = Math.round(G.kills / 9), b = Math.round(G.t / 5), c = won ? Math.round(120 * G.threat) : 0, d = G.st.big * 15;
  let earned = Math.round((a + b + c + d) * mul) + (G.bonusCore || 0); save.core += earned; G.lastCore = earned;
  save.stat.kills += G.kills; if (won) save.stat.wins++;
  // 별: 클리어 · 내구 50% 이상 · 여왕을 60초 안에
  const ci = G.chi, got = [won, won && P.hp >= P.maxHp * .5, won && G.t <= (G.finalT ?? RUN_TIME) + 60], n = got.filter(Boolean).length, prev = save.stars[ci + 1] || 0;
  let gem = 0; const notes = [];
  if (won && !prev) { gem += CH_CLEAR_GEM(ci); notes.push(`${stLabel(ci)} 첫 클리어 ✦${CH_CLEAR_GEM(ci)}`); if (ci + 2 <= CHAPTERS.length) { save.chMax = Math.max(save.chMax, ci + 2); notes.push(`${stLabel(ci + 1)} 「${CHAPTERS[ci + 1].nm}」 열림`); }
    if (CHAPTERS[ci].n === 4) { const C = CHAPTERS[ci], A = ACTS[C.a], lab = `${C.part}부 ${C.ai + 1}막 완료 보상`;
      if (A.rw) { const rid = A.rw, rm = MECH(rid), s0 = starOf(rid); if (!s0) { save.own[rid] = 1; notes.push(`${lab} · ${rm.nm} 획득`); } else if (s0 < 5) { save.own[rid] = s0 + 1; notes.push(`${lab} · ${rm.nm} 별 +1`); } else { gem += 300; notes.push(`${lab} ✦300`); } }
      else { gem += A.gem || 150; save.core += A.core || 600; notes.push(`${lab} · ✦${A.gem || 150} · 코어 ${A.core || 600}`); } } }
  if (n > prev) { gem += (n - prev) * CH_STAR_GEM; save.stars[ci + 1] = n; notes.push(`별 ${n - prev}개 ✦${(n - prev) * CH_STAR_GEM}`); }
  save.gem += gem; G.lastGem = gem; G.lastStars = got;
  // 임무 진행
  rollDaily(); const D = save.daily, done = [];
  for (const m of D.ms || []) {
    if (m.done) continue;
    if (m.k === 'kills') m.p += G.kills; else if (m.k === 'time') m.p = Math.max(m.p, Math.floor(G.t)); else if (m.k === 'big') m.p += G.st.big;
    else if (m.k === 'flights') m.p += G.st.flights; else if (m.k === 'ults') m.p += G.st.ults; else if (m.k === 'skills') m.p += G.st.skills;
    else if (m.k === 'mechs') m.p = (D.mechs || []).length; else if (m.k === 'queen') m.p += won ? 1 : 0;
    if (m.p >= m.n) { m.done = true; done.push(MPOOL.find((q) => q.k === m.k).t(m.n)); }
  }
  const html = `<div class="rws"><div class="rw">${ico('core')}<span class="num" data-to="${earned}">0</span></div>${gem ? `<div class="rw g">${ico('gem')}<span class="num" data-to="${gem}">0</span></div>` : ''}</div>`
    + `<div class="rwd">격파 ${a} · 생존 ${b}${c ? ` · 승리 ${c}` : ''}${d ? ` · 보스 ${d}` : ''}${mul > 1 ? ` · 난이도 ×${mul.toFixed(2)}` : ''}</div>`
    + notes.map((t) => `<div class="rwm">${t}</div>`).join('') + done.map((t) => `<div class="rwm">임무 완료: ${t} — 출석·임무에서 보상을 받으세요</div>`).join('');
  return { earned, gem, html };
}

// ── 뽑기(보급 신호): 확률 공개 · 10회 영웅 이상 1개 확정 · 60회 안에 신화 확정 · 중복은 별 +1
const GACHA = { one: 100, ten: 900, pity: 60, rates: [['UR', 1.5], ['SSR', 3.5], ['SR', 10], ['R', 25], ['core', 60]] };
function gachaRoll(forceSR) {
  const P0 = save.pity; P0.n = (P0.n || 0) + 1;
  let tier;
  if (P0.n >= GACHA.pity) tier = 'UR';
  else { let r = Math.random() * 100; for (const [k, w] of GACHA.rates) { if ((r -= w) < 0) { tier = k; break; } } tier ||= 'core'; }
  if (forceSR && (tier === 'R' || tier === 'core')) tier = 'SR';
  if (tier === 'UR') P0.n = 0;
  if (tier === 'core') { const v = [80, 120, 200][(Math.random() * 3) | 0]; save.core += v; return { tier: 'core', v }; }
  const pool = MECHS.filter((m) => m.rar === tier), m = pool[(Math.random() * pool.length) | 0];
  const st = starOf(m.id); let res;
  if (!st) { save.own[m.id] = 1; res = { tier, m, isNew: true }; }
  else if (st < 5) { save.own[m.id] = st + 1; res = { tier, m, up: st + 1 }; }
  else { const back = { R: 30, SR: 80, SSR: 150, UR: 300 }[tier]; save.gem += back; res = { tier, m, back }; }
  return res;
}
function doPull(n) {
  const cost = n === 10 ? GACHA.ten : GACHA.one; if (save.gem < cost) { flashMsg('결정이 부족합니다'); return; }
  save.gem -= cost; const out = []; for (let i = 0; i < n; i++) out.push(gachaRoll(n === 10 && i === n - 1 && !out.some((o) => ['SR', 'SSR', 'UR'].includes(o.tier))));
  persist(); sfx.lvl();
  const best = out.reduce((a, o) => Math.max(a, RAR_ORDER.indexOf(o.tier)), -1); { const top = out.filter((o) => o.m).sort((a, b) => RAR_ORDER.indexOf(b.tier) - RAR_ORDER.indexOf(a.tier))[0]; if (top && RAR_ORDER.indexOf(top.tier) >= 3) gachaTop = top.m.id; } if (best >= 3) { screenFlash(best === 4 ? '#ff5a7a' : '#ffb84a', .5, .9); tone(400, 1600, .6, 'triangle', .1); }
  $('#gres').innerHTML = out.map((o, i) => { const R0 = RAR[o.tier] || { nm: '코어', col: '#5fe3ff' };
    return `<div class="gc" style="--rc:${R0.col};--rg:${R0.col}66;animation-delay:${i * .09}s">${o.m ? `<img src="img/${o.m.id}.jpg?v=15" alt="">` : `<div class="ic">${ico('core')}</div>`}`
      + `${o.isNew ? '<span class="new">NEW</span>' : ''}<b>${o.m ? o.m.nm : '코어 ' + o.v}</b><small>${o.m ? R0.nm + (o.up ? ' · ★' + o.up : o.back ? ' · ✦' + o.back : '') : '재화'}</small></div>`; }).join('');
  drawGacha(); drawTitle();
}
function drawGacha() {
  if (shopTab === 'cpn') { $('#gacha').classList.add('hide'); openProf('cpn'); return; } drawShopHead(); if (shopTab === 'wpn') drawShopWpn(true); if (shopTab === 'goods') drawShopGoods(); if (shopTab === 'gem') drawShopGem();
  $('#pull1').innerHTML = `<b>1회 모집</b><small>${ico('gem')} ${GACHA.one}</small>`; $('#pull10').innerHTML = `<b>10회 모집</b><small>${ico('gem')} ${GACHA.ten} · 영웅 이상 1개 확정</small>`;
  $('#pull1').disabled = save.gem < GACHA.one; $('#pull10').disabled = save.gem < GACHA.ten;
  const left = GACHA.pity - (save.pity.n || 0);
  $('#pity').innerHTML = `<div class="pbar"><span>신화 확정까지</span><i><em style="width:${Math.round((save.pity.n || 0) / GACHA.pity * 100)}%"></em></i><b class="num">${left}회</b></div>`;
  const names = (t) => MECHS.filter((m) => m.rar === t).map((m) => m.nm).join(', ');
  $('#rates').innerHTML = GACHA.rates.map(([k, w]) => `<tr><td style="color:${(RAR[k] || {}).col || '#5fe3ff'}">${RAR[k] ? RAR[k].nm : '코어 꾸러미'}</td><td style="opacity:.7">${RAR[k] ? names(k) : '코어 80 · 120 · 200'}</td><td>${w}%</td></tr>`).join('')
    + `<tr><td colspan="3" style="opacity:.6;text-align:left">같은 등급 안에서는 같은 확률 · 10회 모집은 영웅 이상 1개 확정 · ${GACHA.pity}회 안에 신화 1개 확정 · 별 5개 이후 중복은 결정으로 돌려받음</td></tr>`;
  $('#gods').innerHTML = ['god', 'god_white', 'god_red', 'god_black'].map((id) => `<img src="img/${id}.jpg?v=15" alt="">`).join('');
  ADS.offer('gem', $('#adGem'), `광고 보고 ${ico('gem')} 30`, () => { save.gem += 30; save.daily.ads = (save.daily.ads || 0) + 1; persist(); drawGacha(); drawTitle(); }, () => (save.daily.ads || 0) < 5);
}
function flashMsg(t) { banner(t, 1400); const b = $('#banner'); b.style.zIndex = 9; }

// ── 보상형 광고(구글 H5 게임 광고). 승인 전에는 광고가 없어 버튼이 나타나지 않는다
const ADS = {
  ok: () => typeof window.adBreak === 'function',
  offer(name, btn, label, onReward, can = () => true) {
    btn.classList.add('hide'); if (!ADS.ok() || !can()) return;
    window.adBreak({ type: 'reward', name, beforeAd: () => { muted0 = muted; muted = true; music.pause(); }, afterAd: () => { muted = muted0; },
      beforeReward: (showAdFn) => { btn.innerHTML = label; btn.classList.remove('hide'); btn.onclick = () => { btn.classList.add('hide'); showAdFn(); }; },
      adDismissed: () => { }, adViewed: () => { onReward(); sfx.lvl(); } });
  },
};
let muted0 = false;

// ── 대기실(격납고): 가운데 회전대 위에 실제 3D 기체
const LOBBY_FRONT = 0;
const lobby = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, 1, 3000), on: false, rot: LOBBY_FRONT, vr: 0, drag: null };
function buildLobby() {
  lobby.cam.aspect = W / H; lobby.cam.updateProjectionMatrix();
  const L = lobby.sc, c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#05070f'); gr.addColorStop(.55, '#121a33'); gr.addColorStop(1, '#070a14'); x.fillStyle = gr; x.fillRect(0, 0, 4, 256);
  L.background = new THREE.CanvasTexture(c); L.background.colorSpace = THREE.SRGBColorSpace;
  L.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a1428, 1.1));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2); key.position.set(50, 80, 70); L.add(key);
  const rim = new THREE.DirectionalLight(0x6fb0ff, 2.6); rim.position.set(-70, 50, -60); L.add(rim);
  const rim2 = new THREE.DirectionalLight(0xff9a5a, 1.4); rim2.position.set(70, 30, -50); L.add(rim2);
  // 회전대: 금속 원판 + 빛 테두리 + 바닥 빛 웅덩이 + 뒤쪽 격납고 벽
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(17, 18.5, 2, 64), new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: .7, roughness: .35 })); pad.position.y = -1; L.add(pad);
  const ringM = new THREE.MeshBasicMaterial({ color: 0x5fe3ff, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const r1 = new THREE.Mesh(new THREE.RingGeometry(16.6, 17.4, 96).rotateX(-Math.PI / 2), ringM); r1.position.y = .05; L.add(r1);
  const r2 = new THREE.Mesh(new THREE.RingGeometry(12, 12.25, 96).rotateX(-Math.PI / 2), ringM.clone()); r2.material.opacity = .35; r2.position.y = .05; L.add(r2); lobby.r2 = r2;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: TEX.soft, color: 0x2a6aff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.y = -1.9; L.add(glow);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0b0f1a, metalness: .6, roughness: .5 })); floor.position.y = -2; L.add(floor);
  new THREE.TextureLoader().load('img/hangar.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; const w = new THREE.Mesh(new THREE.PlaneGeometry(420, 236), new THREE.MeshBasicMaterial({ map: t, color: 0x3a4460, fog: false })); w.position.set(0, 80, -190); L.add(w); });
  // 떠다니는 빛 먼지
  const N = 160, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = rand(-90, 90); pos[i * 3 + 1] = rand(0, 80); pos[i * 3 + 2] = rand(-80, 40); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  lobby.dust = new THREE.Points(g, new THREE.PointsMaterial({ map: TEX.soft, color: 0x9fd8ff, size: 1.6, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); L.add(lobby.dust);
  L.fog = new THREE.Fog(0x070a14, 160, 420);
  // 끌어서 돌리기
  const el = $('#title');
  el.addEventListener('pointerdown', (e) => { if (e.target.closest('button,#mdet,#rail,#deploy,#topbar,.panel')) return; lobby.drag = { x: e.clientX, r: lobby.rot }; });
  addEventListener('pointermove', (e) => { if (!lobby.drag) return; lobby.rot = lobby.drag.r + (e.clientX - lobby.drag.x) * .012; lobby.vr = 0; });
  addEventListener('pointerup', () => { if (lobby.drag) lobby.rel = performance.now() / 1000; lobby.drag = null; });
}
function lobbyFrame(dt) {
  if (!lobby.on) return;
  if (!lobby.drag) { const now = performance.now() / 1000; if (now - (lobby.rel || 0) > 1.8) { const tgt = LOBBY_FRONT; let d = tgt - lobby.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); lobby.rot += d * Math.min(1, dt * 2.4); } }
  P.wrap.rotation.set(0, lobby.rot - Math.PI / 2, 0); P.yaw = lobby.rot;
  if (lobby.r2) lobby.r2.rotation.y += dt * .4; if (lobby.dust) lobby.dust.position.y = Math.sin(performance.now() / 3000) * 2;
  // 화면이 넓으면 기체를 가운데 칸(목록과 정보 사이)에 맞춘다
  const wide = W > 820, h = viewMech.startsWith('god') ? 35 : 24;
  lobby.cam.position.set(wide ? 0 : 0, h * .62, wide ? 74 : 92); lobby.cam.lookAt(0, h * .48, 0);
  // 기체 무대(#stage) 칸 한가운데에, 칸 높이에 맞춰 크게 보이게
  const r = $('#stage') && $('#stage').getBoundingClientRect();
  if (r && r.width > 60 && r.height > 60) { const fit = clamp(r.height / H, .3, .95) * .84, V = h * 1.08 / fit, dd = V / (2 * Math.tan(15 * Math.PI / 180)); lobby.cam.position.set(0, h * .55, dd); lobby.cam.lookAt(0, h * .5, 0); lobby.cam.setViewOffset(W, H, W / 2 - (r.left + r.width / 2), H / 2 - (r.top + r.height / 2), W, H); }
  else if (wide) lobby.cam.setViewOffset(W, H, 35, 0, W, H); else lobby.cam.setViewOffset(W, H, 0, H * .06, W, H);
}
async function enterLobby() {
  if (!booted) return;
  if (!lobby.on) { lobby.on = true; lobby.sc.add(P.group); }
  P.group.position.set(0, 0, 0); P.group.visible = true; P.x = P.z = 0; P.alt = 0; P.fly = false; if (P.lamp) P.lamp.visible = false;
  lobby.rot = LOBBY_FRONT; lobby.rel = 0;
  await setMech(viewMech);
  if (!lobby.on) return;
  for (const o of [shieldW, howW]) if (o) lobby.sc.add(o);
  for (const k in acts) acts[k].stop(); acts.idle.reset().play();
}
function leaveLobby() {
  if (!lobby.on) return; lobby.on = false; lobby.cam.clearViewOffset();
  scene.add(P.group); for (const o of [shieldW, howW]) if (o) scene.add(o);
}

// ── 대기실 화면
let viewMech = save.mech, booted = false;
const statBar = (l, v, max, s) => `<div class="sb"><span>${l}</span><i><em style="width:${Math.round(clamp(v / max, .06, 1) * 100)}%"></em></i><b>${s}</b></div>`;
function drawTitle() {
  try { drawProf(); } catch (e) { }
  rollDaily();
  $('#curCore').innerHTML = curHtml('core'); $('#curGem').innerHTML = curHtml('gem'); bindCur($('#topbar'));
  $('#bDaily').innerHTML = `${ico('quest')}<span>임무</span>${dailyPending() ? '<i class="dot"></i>' : ''}`;
  const box = $('#mechs'), sx = box.scrollLeft, sy = box.scrollTop; box.innerHTML = '';
  const list = MECHS.slice().sort((a, b) => (!!starOf(b.id) - !!starOf(a.id)) || RAR_ORDER.indexOf(a.rar) - RAR_ORDER.indexOf(b.rar));
  for (const m of list) {
    const st = starOf(m.id), b = document.createElement('button'), R0 = rarOf(m);
    b.className = 'mech' + (m.id === viewMech ? ' on' : '') + (st ? '' : ' locked'); b.style.setProperty('--rc', R0.col);
    b.innerHTML = `<img src="img/${m.id}.jpg?v=15" alt="" loading="lazy"><div class="mi"><strong>${m.nm}</strong><em>${R0.nm} · ${m.cls} · <i class="elc" style="--ec:${ELEM[m.el].col}">${ELEM[m.el].nm}</i></em></div>${st ? `<span class="st">${'★'.repeat(st)}</span>` : `<span class="lk">${ico('lock')}</span>`}`;
    b.addEventListener('click', () => { const chg = viewMech !== m.id; viewMech = m.id; if (starOf(m.id)) { save.mech = m.id; persist(); } if (chg && lobby.on) enterLobby(); drawTitle(); });
    box.appendChild(b);
  }
  box.scrollLeft = sx; box.scrollTop = sy;
  $('#ownCnt').textContent = `${MECHS.filter((m) => starOf(m.id)).length} / ${MECHS.length}`;
  const m = MECH(viewMech), st = starOf(m.id), R0 = rarOf(m), an = ARM_NAME[m.prim], pm = st ? powMul(m) : rarOf(m).mul;
  $('#mdet').style.setProperty('--rc', R0.col);
  $('#mdet').innerHTML = `<span class="rar">${R0.nm}</span><span class="clsb">${ico(CLS[m.cls].k)}${m.cls}</span>${st ? `<span class="stars">${'★'.repeat(st)}${'☆'.repeat(5 - st)}</span>` : ''}<div class="mh">${m.nm}</div><div class="ty">${m.ty}</div>`
    + statBar('내구', m.hp * pm, 2.3, Math.round(100 * m.hp * pm)) + statBar('화력', m.dmg * pm, 2.2, Math.round(100 * m.dmg * pm)) + statBar('속도', m.spd, 1.3, Math.round(100 * m.spd)) + statBar('냉각', 1 / m.cd, 1.45, Math.round(100 / m.cd))
    + `<div class="kit"><div><span class="bd">${ico2(m.prim, '#ffd98a')}</span><span><b>${an.nm}</b><small>기본 무기 · ${an.ds0}</small></span></div>`
    + `<div><span class="bd a" style="--ec:${ELEM[m.el].col}">${ico2(m.auto.k, '#ffffff')}</span><span><b>${m.auto.nm}</b><small>스킬 · E · ${m.auto.cd}초</small></span></div>`
    + `<div><span class="bd u">${ico2(m.ult.k, '#ffd98a')}</span><span><b>${m.ult.nm}</b><small>필살기 · Q${wOf(m.id) && wOf(m.id).rel ? ' · 무기 해방 「' + REL[wOf(m.id).rel].nm + '」' : ''}</small></span></div><div><span class="bd e" style="--ec:${ELEM[m.el].col}">${ico2('el_' + m.el, ELEM[m.el].col)}</span><span><b>${ELEM[m.el].sk.nm} <i class="elc" style="--ec:${ELEM[m.el].col}">${ELEM[m.el].nm} 계열</i></b><small>계열 기술 · R · ${ELEM[m.el].sk.ds}</small></span></div>${starOf(m.id) ? (() => { const w = wOf(m.id), X = w && ELEM[w.el]; return `<div><span class="bd w" style="--ec:${X ? X.col : '#8a93a8'}">${ico2('wpn', X ? X.col : '#8a93a8')}</span><span><b>${w ? wName(w, m) : '무기 없음'} ${w ? `<i class="elc" style="--ec:${RAR[w.rar].col}">${RAR[w.rar].nm} · Lv ${w.lv}</i>` : ''}</b><small>${w ? `피해 +${wDmg(w)}% · ${w.opts.map((o) => WOPT[o].nm).join(' · ') || '각인 없음'}` : '무기고에서 장착하세요'} · 숙련 Lv ${save.mlv[m.id] || 0}</small></span></div>`; })() : ''}</div>`
    + `<div class="ps">${m.pass}</div>`
    + (st ? '' : `<div class="buy"><button class="go" id="unlock" ${save.core >= m.cost ? '' : 'disabled'}>${ico('core')} ${m.cost.toLocaleString()} 코어로 구매</button><button class="ghost" id="toGacha">${ico('gacha')} 뽑기로 얻기</button></div>`);
  if (!st) { $('#unlock').onclick = () => { if (save.core < m.cost) return; save.core -= m.cost; save.own[m.id] = 1; save.mech = m.id; persist(); sfx.lvl(); screenFlash(R0.col, .35, .6); if (lobby.on) enterLobby(); drawTitle(); }; $('#toGacha').onclick = openGacha; }
  drawMdet(m, st);
  $('#start').textContent = st ? '출격' : `출격 · ${MECH(save.mech).nm}`; $('#start').disabled = !booted || !starOf(save.mech);
  if (st && save.mech !== m.id) { save.mech = m.id; persist(); }
  // 챕터
  save.ch = clamp(save.ch, 1, save.chMax); const ci = save.ch - 1, C0 = CHAPTERS[ci];
  $('#chNo').textContent = `${stLabel(ci)} · ${ACTS[C0.a].nm}`; $('#chNm').textContent = C0.nm; $('#chStars').textContent = chStarsTxt(ci);
  { const cl = MECH(save.mech).cls, ok = C0.rec.includes(cl); $('#chRec').innerHTML = `<small>추천</small>${recHtml(C0, cl)}<em class="${ok ? 'ok' : ''}">${ok ? '보너스 적용 · 화력 +15% 내구 +10%' : '추천 기종이면 화력 +15% 내구 +10%'}</em>`; }
  $('#chPrev').disabled = save.ch <= 1; $('#chNext').disabled = save.ch >= save.chMax; $('#chPrev').style.opacity = save.ch <= 1 ? .3 : 1; $('#chNext').style.opacity = save.ch >= save.chMax ? .3 : 1;
}
let mapAct = null, mapPart = null;
function actOpen(a) { const i = CHAPTERS.findIndex((c) => c.a === a); return i >= 0 && i + 1 <= save.chMax; }
function partOpen(p) { const i = CHAPTERS.findIndex((c) => c.part === p); return i >= 0 && i + 1 <= save.chMax; }
function drawChapters() {
  if (mapAct == null || !actOpen(mapAct)) mapAct = CHAPTERS[save.ch - 1].a;
  if (mapPart == null || !partOpen(mapPart)) mapPart = ACTS[mapAct].part;
  if (ACTS[mapAct].part !== mapPart) { let la = null; ACTS.forEach((A, a) => { if (A.part === mapPart && actOpen(a)) la = a; }); if (la != null) mapAct = la; }
  $('#partTabs').innerHTML = PARTS.map((p) => `<button class="pt ${p.no === mapPart ? 'on' : ''}" data-p="${p.no}" ${partOpen(p.no) ? '' : 'disabled'}><small>${p.no}부</small><b>${p.nm}</b>${partOpen(p.no) ? '' : '<i>잠김</i>'}</button>`).join('')
    + '<button class="pt soon" disabled><small>3부</small><b>제국의 칼날</b><i>준비 중</i></button>';
  $('#partTabs').querySelectorAll('.pt[data-p]').forEach((b) => b.addEventListener('click', () => { mapPart = +b.dataset.p; drawChapters(); }));
  const GX = window.ASCEND_GALAXY, P0 = GX ? Object.fromEntries(GX.places.map((p) => [p.id, p])) : {};
  const posOf = (A) => (A.x != null ? { x: A.x, y: A.y } : P0[A.pl] || { x: 50, y: 50 });
  const acts = ACTS.map((A, a) => ({ A, a })).filter((o) => o.A.part === mapPart);
  $('#gxn').innerHTML = acts.map(({ A, a }) => { const p = posOf(A), open = actOpen(a), idx = CHAPTERS.map((c, i) => (c.a === a ? i : -1)).filter((i) => i >= 0), done = !!save.stars[idx[3] + 1], got = idx.reduce((s, i) => s + (save.stars[i + 1] || 0), 0);
    return `<button class="an ${open ? '' : 'lock'} ${a === mapAct ? 'on' : ''} ${done ? 'done' : ''}" data-a="${a}" style="left:${p.x}%;top:${p.y}%;--ac:${A.col}" ${open ? '' : 'disabled'}><b>${CHAPTERS[idx[0]].ai + 1}막</b><i>${A.nm}<small>${open ? `★ ${got}/12` : '잠김'}</small></i></button>`; }).join('');
  $('#gxn').querySelectorAll('.an').forEach((b) => b.addEventListener('click', () => { mapAct = +b.dataset.a; drawChapters(); }));
  const A = ACTS[mapAct], idx = CHAPTERS.map((c, i) => (c.a === mapAct ? i : -1)).filter((i) => i >= 0), done = !!save.stars[idx[3] + 1], cl = MECH(save.mech).cls, C0 = CHAPTERS[idx[0]];
  const rwHtml = A.rw ? (() => { const rm = MECH(A.rw); return `<img src="img/${rm.id}.jpg?v=15" alt=""><span><em>막 완료 보상</em>${rm.nm} <i>${rarOf(rm).nm} · ${rm.cls}</i></span>`; })() : `<span><em>막 완료 보상</em>${ico('gem')} ${A.gem || 150} · ${ico('core')} ${A.core || 600}</span>`;
  $('#actHead').style.setProperty('--ac', A.col);
  $('#actHead').innerHTML = `<small>${C0.part}부 ${C0.ai + 1}막 · ${A.nm}</small><b>${A.st}</b><div class="arw">${rwHtml}${done ? '<span class="ok">받음</span>' : ''}</div>`;
  $('#chList').innerHTML = idx.map((i) => { const c = CHAPTERS[i], lock = i + 1 > save.chMax;
    return `<button class="cc ${lock ? 'lock' : ''} ${i + 1 === save.ch ? 'on' : ''}" data-i="${i + 1}" style="--c1:${c.c[0]};--c2:${c.c[1]}" ${lock ? 'disabled' : ''}><small>${stLabel(i)}</small><b>${c.nm}</b><p>${c.ds}</p>${recHtml(c, cl)}<span class="s">${chStarsTxt(i)}</span><span class="rw">${save.stars[i + 1] ? '클리어' : `첫 클리어 ${ico('gem')} ${CH_CLEAR_GEM(i)}`}</span></button>`; }).join('');
  $('#chList').querySelectorAll('.cc').forEach((b) => b.addEventListener('click', () => { save.ch = +b.dataset.i; persist(); $('#chapters').classList.add('hide'); drawTitle(); }));
  requestAnimationFrame(() => { const cv = $('#gxc'), r = cv.getBoundingClientRect(); if (!GX || !r.width) return; const k = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(r.width * k); cv.height = Math.round(r.height * k);
    try { GX.draw(cv, { lang: 'ko', title: false, legend: false, skip: GX.places.filter((pl) => acts.some(({ A }) => { const q = posOf(A); return Math.hypot(q.x - pl.x, q.y - pl.y) < 7; })).map((pl) => pl.id) }); } catch (e) { console.warn(e); }
    const x = cv.getContext('2d'), X = (p) => p / 100 * cv.width, Y = (p) => p / 100 * cv.height; x.lineCap = 'round';
    for (let i = 0; i < acts.length - 1; i++) { const p = posOf(acts[i].A), q = posOf(acts[i + 1].A), on = actOpen(acts[i + 1].a);
      x.setLineDash(on ? [] : [6 * k, 7 * k]); x.lineWidth = (on ? 3.2 : 2) * k; x.strokeStyle = on ? 'rgba(255,207,90,.9)' : 'rgba(200,210,230,.35)';
      x.shadowColor = on ? 'rgba(255,207,90,.8)' : 'transparent'; x.shadowBlur = on ? 10 * k : 0; x.beginPath(); x.moveTo(X(p.x), Y(p.y)); x.lineTo(X(q.x), Y(q.y)); x.stroke(); }
    x.setLineDash([]); x.shadowBlur = 0; });
}
// ───────── 이야기 장면: 부와 막을 처음 시작할 때, 부를 끝냈을 때 한 번씩
function showStory(kick, title, text) {
  return new Promise((res) => { $('#stK').textContent = kick; $('#stT').textContent = title; $('#stP').textContent = text; $('#story').classList.remove('hide');
    $('#stGo').onclick = () => { $('#story').classList.add('hide'); res(); }; });
}
async function storyBefore(ci) {
  const C = CHAPTERS[ci], A = ACTS[C.a], Pt = PARTS.find((p) => p.no === C.part); save.seen ??= {};
  if (C.n !== 1) return;
  if (C.ai === 0 && Pt && !save.seen['p' + C.part]) { save.seen['p' + C.part] = 1; persist(); await showStory(`${C.part}부`, Pt.nm, Pt.syn); }
  if (A && A.story && !save.seen['a' + C.a]) { save.seen['a' + C.a] = 1; persist(); await showStory(`${C.part}부 ${C.ai + 1}막 · ${A.nm}`, A.st, A.story); }
}
function storyAfter(ci) {
  const C = CHAPTERS[ci], Pt = PARTS.find((p) => p.no === C.part); save.seen ??= {};
  const lastOfPart = !CHAPTERS[ci + 1] || CHAPTERS[ci + 1].part !== C.part;
  if (lastOfPart && C.n === 4 && Pt && !save.seen['e' + C.part]) { save.seen['e' + C.part] = 1; persist(); setTimeout(() => showStory(`${C.part}부 완료`, Pt.nm, Pt.end), 1200); }
}
function openGacha(t) { shopTab = typeof t === 'string' ? t : 'mech'; $('#gres').innerHTML = ''; drawGacha(); $('#gacha').classList.remove('hide'); }
$('#chPrev').addEventListener('click', () => { save.ch = Math.max(1, save.ch - 1); persist(); drawTitle(); });
$('#chNext').addEventListener('click', () => { save.ch = Math.min(save.chMax, save.ch + 1); persist(); drawTitle(); });
$('#chMap').addEventListener('click', () => { mapAct = null; mapPart = null; $('#chapters').classList.remove('hide'); drawChapters(); });
$('#cClose').addEventListener('click', () => $('#chapters').classList.add('hide'));
$('#bGacha').addEventListener('click', openGacha);
$('#prof').addEventListener('click', () => openProf('home')); $('#pfClose').addEventListener('click', () => { $('#profP').classList.add('hide'); drawTitle(); });
let gachaTop = null;
$('#gClose').addEventListener('click', () => { $('#gacha').classList.add('hide'); if (gachaTop) { viewMech = gachaTop; save.mech = gachaTop; persist(); gachaTop = null; drawTitle(); if (lobby.on) enterLobby().then(() => screenFlash(rarOf(MECH(viewMech)).col, .45, .8)); } });
$('#pull1').addEventListener('click', () => doPull(1));
$('#pull10').addEventListener('click', () => doPull(10));
$('#bSound').addEventListener('click', () => { muted = !muted; drawStaticIcons(); if (muted) music.pause(); });
$('#start').addEventListener('click', startRun);
$('#retry').addEventListener('click', startRun);
$('#nextThreat').addEventListener('click', () => { save.ch = Math.min(save.chMax, G.chi + 2); persist(); startRun(); });
// 격납고(영구 강화)
function drawHangar() {
  $('#coreH').textContent = save.core;
  $('#upList').innerHTML = UPG.map((u) => { const lv = save.up[u.k] || 0, c = upCost(lv), max = lv >= UPG_MAX;
    return `<div class="up"><span class="ic">${ico(u.ic)}</span><div class="tx"><b>${u.nm} <small>Lv ${lv}/${UPG_MAX}</small></b><span class="lvp">${Array.from({ length: UPG_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span><em>${lv ? u.ds(lv) : '없음'}${max ? '' : ' → ' + u.ds(lv + 1)}</em></div><button data-k="${u.k}" ${max || save.core < c ? 'disabled' : ''}>${max ? '최대' : ico('core') + ' ' + c}</button></div>`; }).join('');
  $('#upList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k, lv = save.up[k] || 0, c = upCost(lv); if (lv >= UPG_MAX || save.core < c) return; save.core -= c; save.up[k] = lv + 1; persist(); sfx.lvl(); drawHangar(); drawTitle(); }));
}
// 출석·일일 임무
const loginTxt = (L0) => (L0.g ? `${ico('gem')}<b>${L0.g}</b>` : `${ico('core')}<b>${L0.c}</b>`);
function drawDaily() {
  rollDaily(); const D = save.daily, idx = (D.streak || 0) % 7, ready = loginReady();
  $('#loginRow').innerHTML = LOGIN.map((v, i) => `<div class="day ${v.g ? 'gem' : ''} ${i < idx ? 'got' : ''} ${i === idx && ready ? 'now' : ''}"><small>${i + 1}일</small>${loginTxt(v)}</div>`).join('');
  $('#claimLogin').disabled = !ready; $('#claimLogin').innerHTML = ready ? `출석 보상 받기` : '오늘 출석 완료 · 내일 또 오세요';
  $('#streak').textContent = `연속 출석 ${D.streak || 0}일 · 하루라도 빠지면 1일부터 다시`;
  $('#msList').innerHTML = (D.ms || []).map((m, i) => { const q = MPOOL.find((x) => x.k === m.k), pct = Math.min(1, m.p / m.n);
    return `<div class="ms"><div class="tx"><b>${q.t(m.n)}</b><i><em style="width:${pct * 100}%"></em></i><small>${m.k === 'time' ? fmt(Math.min(m.p, m.n)) + ' / ' + fmt(m.n) : Math.min(m.p, m.n) + ' / ' + m.n}</small></div><button data-i="${i}" ${m.done && !m.got ? '' : 'disabled'}>${m.got ? '완료' : ico('core') + ' ' + m.rw + ' · ' + ico('gem') + ' 10'}</button></div>`; }).join('');
  $('#msList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const m = D.ms[+b.dataset.i]; if (!m.done || m.got) return; m.got = true; save.core += m.rw; save.gem += 10; persist(); sfx.lvl(); drawDaily(); drawTitle(); }));
}
$('#claimLogin').addEventListener('click', () => { const D = save.daily; if (!loginReady()) return; const L0 = LOGIN[(D.streak || 0) % 7]; save.core += L0.c || 0; save.gem += L0.g || 0; D.streak = (D.streak || 0) + 1; D.lastClaim = dayKey(); persist(); sfx.lvl(); drawDaily(); drawTitle(); });
$('#bHangar').addEventListener('click', () => openArsenal('up'));
$('#bDaily').addEventListener('click', () => { drawDaily(); $('#daily').classList.remove('hide'); });
$('#hClose').addEventListener('click', () => $('#hangar').classList.add('hide'));
$('#bArms').addEventListener('click', () => openArsenal());
$('#bRoster').addEventListener('click', () => { drawTitle(); $('#rosterP').classList.remove('hide'); });
$('#rClose').addEventListener('click', () => $('#rosterP').classList.add('hide'));
$('#mechs').addEventListener('click', (e) => { if (e.target.closest('.mech')) setTimeout(() => $('#rosterP').classList.add('hide'), 60); });
$('#mPrev').addEventListener('click', () => stepMech(-1)); $('#mNext').addEventListener('click', () => stepMech(1));
$('#aClose').addEventListener('click', () => $('#arsenal').classList.add('hide'));
$('#dClose').addEventListener('click', () => $('#daily').classList.add('hide'));
function toTitle() { $('#over').classList.add('hide'); $('#pause').classList.add('hide'); $('#hud').classList.add('hide'); $('#title').classList.remove('hide'); G.state = 'title'; music.pause(); drawTitle(); enterLobby(); }
$('#toTitle').addEventListener('click', toTitle);
$('#resume').addEventListener('click', togglePause);
$('#quit').addEventListener('click', toTitle);
$('#mute').addEventListener('click', (e) => { muted = !muted; e.target.textContent = muted ? '소리 켜기' : '소리 끄기'; drawStaticIcons(); });
// 고정 아이콘(단추·제목)
function drawStaticIcons() {
  $('#bGacha').innerHTML = `${ico('shop')}<span>상점</span>`; $('#bHangar').innerHTML = `${ico('upgrade')}<span>강화</span>`; $('#bRoster').innerHTML = `${ico('mech')}<span>기체</span>`; $('#rTitle').innerHTML = `${ico('mech')}기체`;
  $('#bSound').innerHTML = ico(muted ? 'soundOff' : 'soundOn'); $('#chMap').innerHTML = `${ico('map')}<span>지도</span>`;
  $('#bPause').innerHTML = ico('pause'); $('#bArms').innerHTML = `${ico('anvil')}<span>정비</span>`; $('#bFly').firstElementChild.innerHTML = ico('fly'); $('#bDash').firstElementChild.innerHTML = ico('dash');
  $('#chTitle').innerHTML = `${ico('map')} 작전 지도<span class="gxs"> · ASCEND 은하</span>`; $('#hTitle').innerHTML = `${ico('repair')} 격납고 강화`; $('#dTitle').innerHTML = `${ico('calendar')} 출석 · 일일 임무`;
}


(async function boot() {
  drawStaticIcons(); drawTitle(); drawSkMode();
  const jobs = [buildTerrain(), ensureMech(save.mech), loadModel('rock', 'p_rock2', 22, 0), loadModel('crystal', 'p_crystal', 20, 0),
    loadMissile(), loadMoves(), loadWeapon('mpod', 'wm_mpod')];
  for (const k in ET) if (!ET[k].virt) jobs.push(loadModel(k, ET[k].file, ET[k].h, 0, ET[k]));
  let done = 0; jobs.forEach((j) => j.then(() => ($('#load').textContent = `불러오는 중 ${Math.round(++done / jobs.length * 100)}%`)));
  try {
    await Promise.all(jobs); initXF(); buildVFX(); buildLobby(); buildPools(); buildParticles(); buildDrones(); buildBarrier(); buildBeams(); buildBits(); mslInit(); tfInit();
    imPod = WPN.mpod.clone(true); imPod.scale.setScalar(6.4); imPod.visible = false; scene.add(imPod);
    resetRun(); await setMech(save.mech);
    $('#load').classList.add('hide'); booted = true; drawTitle(); await enterLobby();
    mailInit(); drawTitle(); if (new URLSearchParams(location.search).get('coupon')) openProf('cpn');
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
  try { placeArms(0); if (!GUNS[ARM]) { P.wrap.rotation.set(0, -Math.PI / 2, 0); P.yaw = 0; P.wrap.updateMatrixWorld(true); lobbyStand(); } } catch (e) { }
  const extra = [shieldW, howW].filter((o) => o && o.visible); extra.forEach((o) => sc.add(o));
  const bb = new THREE.Box3().setFromObject(P.wrap); for (const o of extra) bb.expandByObject(o);
  const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()), h = Math.max(s.y, s.x * .9);
  const cam2 = new THREE.PerspectiveCamera(28, 1, 1, 2000), D = h * .6 / Math.tan(14 * Math.PI / 180);
  cam2.position.set(c.x, c.y + h * .12, c.z + D); cam2.lookAt(c.x, c.y, c.z);
  thumbR.render(sc, cam2); const url = thumbR.domElement.toDataURL('image/jpeg', .9);
  par.add(P.wrap); extra.forEach((o) => scene.add(o)); G.state = st; save.mech = sm; return url;
}
if (location.search.includes('dev')) window.__g = { get lobby() { return lobby; }, G, P, ET, UP, inp, keys, stick, get ebs() { return ebs; }, get cards() { return cardKeys; }, sim(sec, auto, bot) { for (let t = 0; t < sec && G.state !== 'over'; t += 1 / 30) { if (G.state === 'levelup') { if (auto) pickCard(typeof auto === 'function' ? auto() : 0); else break; } bot && bot(); step(1 / 30, 1 / 30); } }, get E() { return E; }, spawn, kill, endRun, addXp, pickCard, startRun, camPos, AN, oneShot, setMech, ARMS, get acts() { return acts; }, get mixer() { return mixer; }, get armed() { return armed; }, get msl() { return msl; }, launchSalvo, scene, cam, renderer, get composer() { return composer; }, TF_E, startFly, endFly, FLY, save, MECHS, castUlt, doAuto, drawTitle, drawHangar, drawDaily, persist, get PRIM() { return PRIM; }, get ARM() { return ARM; }, get shells() { return shells; }, flare, mark, lightFlash, explode, ring, beamFx, screenFlash, xfBoom, crescent, castUlt2: castUlt, fire, mortar, MODELS, IM, midBoss, makeThumb, dropGem, get picks() { return picks; } };
