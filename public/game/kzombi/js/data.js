/* 처용, 조선좀비 전투 수치표. 바깥 화면(meta.js)도 JZD를 읽어 챕터, 동료, 기술 이름을 쓴다. */
(function () {
'use strict';
const D = window.JZD = {};
D.W = 720; D.VH = 1280; D.H = 1760;   /* W·VH: 화면(논리 픽셀), WW·H: 판(월드) 크기 */
/* WIDE_MAP2(11-25): 판 폭 720→1300, 본진은 넓은 공터 */ D.WW = 1300; D.CX = 650;
D.SHRINE = { x: 650, y: 1440, r: 54 };
D.WALL_Y = 1200; D.GATE = [582, 718];
D.LANE_X = [283, 650, 1018];
D.PADS = [];   /* 실제 자리는 D.layoutOf(ch) */

/* 적. h: 그림 키(px), r: 몸 반지름 */
D.EN = {
  peasant: { n: '역병 백성', hp: 24, sp: 64, r: 12, dmg: 6, cd: 0.8, xp: 1, h: 60 },
  archer:  { n: '좀비 궁수', hp: 20, sp: 54, r: 12, dmg: 7, cd: 1.9, xp: 2, range: 210, h: 62 },
  spear:   { n: '좀비 군졸', hp: 44, sp: 56, r: 13, dmg: 10, cd: 1.1, xp: 2, reach: 46, h: 62 },
  rider:   { n: '좀비 기마병', hp: 52, sp: 150, r: 16, dmg: 14, cd: 1.0, xp: 3, h: 90 },
  harcher: { n: '좀비 기마궁수', hp: 36, sp: 130, r: 16, dmg: 7, cd: 1.7, xp: 3, range: 250, h: 90 },
  yangban: { n: '좀비 양반', hp: 70, sp: 50, r: 13, dmg: 8, cd: 1.2, xp: 3, h: 64, aura: 1 },
  munsin:  { n: '좀비 문신', hp: 48, sp: 46, r: 13, dmg: 9, cd: 2.4, xp: 3, range: 240, h: 62, caster: 1 },
  zdog:    { n: '좀비 들개', hp: 16, sp: 150, r: 11, dmg: 5, cd: 0.7, xp: 1, h: 40, jump: 1 },
  zrat:    { n: '역병 쥐', hp: 26, sp: 100, r: 11, dmg: 4, cd: 0.6, xp: 1, h: 36, split: 1 },
  zcrow:   { n: '좀비 까마귀', hp: 12, sp: 120, r: 10, dmg: 4, cd: 0.9, xp: 1, h: 40, fly: 1 },
  zboar:   { n: '좀비 멧돼지', hp: 70, sp: 85, r: 15, dmg: 14, cd: 1.0, xp: 3, h: 52, charger: 1, siege: 3 },
  zox:     { n: '좀비 황소', hp: 190, sp: 40, r: 20, dmg: 22, cd: 1.4, xp: 6, h: 72, tank: 1, siege: 4 },
  zbear:   { n: '좀비 반달곰', hp: 340, sp: 54, r: 22, dmg: 26, cd: 1.5, xp: 12, h: 82, slam: 1 },
  ztiger:  { n: '좀비 범', hp: 280, sp: 96, r: 20, dmg: 20, cd: 1.1, xp: 12, h: 70, charger: 1 },
  zsword:  { n: '좀비 검사', hp: 46, sp: 70, r: 13, dmg: 12, cd: 0.9, xp: 2, h: 62 },
  zwaegun: { n: '좀비 왜군', hp: 30, sp: 50, r: 12, dmg: 15, cd: 2.6, xp: 2, range: 300, gun: 1, h: 60 },
  zsamurai:{ n: '좀비 사무라이', hp: 95, sp: 78, r: 14, dmg: 18, cd: 1.0, xp: 4, h: 66, charger: 1 },
  zmonk:   { n: '좀비 승려', hp: 60, sp: 48, r: 13, dmg: 8, cd: 1.4, xp: 3, h: 62, healer: 1 },
  zgrand:  { n: '좀비 대장군', hp: 900, sp: 52, r: 26, dmg: 30, cd: 1.3, xp: 25, h: 100, armor: 3, slam: 1 },
  zqueen2: { n: '좀비 왕비', hp: 800, sp: 44, r: 18, dmg: 16, cd: 1.6, xp: 18, h: 82, range: 250, caster: 1, summoner: 1 },
  yeoksin: { n: '역신', hp: 4200, sp: 60, r: 24, dmg: 32, cd: 1.0, xp: 0, h: 124, armor: 2, blink: 1 },
  wb_stone: { n: '돌장승 거신', hp: 6000, sp: 30, r: 34, dmg: 40, cd: 1.6, xp: 0, h: 150, armor: 6, slam: 1, wb: 1 },
  wb_fire: { n: '화마', hp: 5600, sp: 36, r: 32, dmg: 44, cd: 1.4, xp: 0, h: 150, armor: 3, slam: 1, caster: 1, wb: 1 },
  wb_plague: { n: '역병 대장군', hp: 5800, sp: 40, r: 32, dmg: 42, cd: 1.3, xp: 0, h: 150, armor: 4, charger: 1, slam: 1, wb: 1 },
  bulgasari: { n: '불가사리', hp: 5200, sp: 46, r: 30, dmg: 34, cd: 1.4, xp: 0, h: 120, armor: 4, slam: 1, eater: 1 },
  jangsanbeom: { n: '장산범', hp: 3800, sp: 92, r: 24, dmg: 28, cd: 1.0, xp: 0, h: 104, charger: 1, mimic: 1 },
  mudang:  { n: '검은 무녀', hp: 3000, sp: 42, r: 22, dmg: 20, cd: 1.8, xp: 0, h: 116, range: 300, caster: 1, summoner: 1, warder: 1 },
  mujang:  { n: '좀비 무장', hp: 560, sp: 60, r: 22, dmg: 22, cd: 1.2, xp: 15, h: 84, armor: 2, charger: 1 },
  king:    { n: '역병 든 임금', hp: 3400, sp: 34, r: 28, dmg: 34, cd: 1.5, xp: 0, h: 100, armor: 1 }
};

/* 상위 종: 기존 그림(spr)을 쓰되 색 윤곽(tint)·크기(sc)·능력이 다른 새 적. 16장부터 차례로 공개 */
Object.assign(D.EN, {
  iron_spear:  { n: '철갑 군졸', spr: 'spear', tint: '150,180,230', sc: 1.2, hp: 300, sp: 50, r: 15, dmg: 18, cd: 1.1, xp: 5, reach: 50, h: 70, armor: 6 },
  red_sword:   { n: '붉은눈 검귀', spr: 'zsword', tint: '255,40,40', sc: 1.2, hp: 260, sp: 96, r: 15, dmg: 24, cd: 0.8, xp: 5, h: 70, charger: 1, vtier: 1 },
  black_archer:{ n: '흑염 궁수', spr: 'archer', tint: '255,120,20', sc: 1.15, hp: 170, sp: 52, r: 14, dmg: 18, cd: 1.6, xp: 5, range: 280, h: 70 },
  blood_dog:   { n: '피굶주린 들개', spr: 'zdog', tint: '255,30,60', sc: 1.25, hp: 120, sp: 200, r: 13, dmg: 14, cd: 0.6, xp: 3, h: 48, jump: 1 },
  skull_monk:  { n: '해골 승려', spr: 'zmonk', tint: '210,220,255', sc: 1.2, hp: 320, sp: 46, r: 15, dmg: 14, cd: 1.3, xp: 6, h: 70, healer: 1 },
  plague_rider:{ n: '역병 기마대장', spr: 'rider', tint: '120,255,60', sc: 1.25, hp: 420, sp: 150, r: 19, dmg: 28, cd: 1.0, xp: 7, h: 108, charger: 1, vtier: 1 },
  ghost_yangban:{ n: '원귀 양반', spr: 'yangban', tint: '80,230,255', sc: 1.2, hp: 380, sp: 52, r: 15, dmg: 16, cd: 1.1, xp: 6, h: 74, aura: 1 },
  shadow_samurai:{ n: '그림자 사무라이', spr: 'zsamurai', tint: '170,80,255', sc: 1.25, hp: 520, sp: 88, r: 17, dmg: 30, cd: 0.9, xp: 8, h: 80, charger: 1, vtier: 1 },
  war_ox:      { n: '철갑 황소', spr: 'zox', tint: '200,200,210', sc: 1.25, hp: 1100, sp: 40, r: 24, dmg: 34, cd: 1.4, xp: 12, h: 88, tank: 1, siege: 6, armor: 5 },
  giant_bear:  { n: '거대 반달곰', spr: 'zbear', tint: '255,200,60', sc: 1.3, hp: 1600, sp: 50, r: 27, dmg: 38, cd: 1.5, xp: 18, h: 104, slam: 1, vtier: 1 }
});
/* 새 역할형 좀비·우두머리·탐험 몹 (r4) */
Object.assign(D.EN, {
  zsiege:  { n: '공성 좀비', hp: 160, sp: 36, r: 17, dmg: 14, cd: 1.5, xp: 4, h: 72, siege: 3 },
  zbomb:   { n: '자폭 좀비', hp: 70, sp: 92, r: 13, dmg: 8, cd: 1.0, xp: 3, h: 62, bomber: 1 },
  zshield: { n: '방패 좀비', hp: 150, sp: 50, r: 15, dmg: 10, cd: 1.1, xp: 3, h: 64, shield: 1 },
  znest:   { n: '둥지 좀비', hp: 220, sp: 40, r: 16, dmg: 8, cd: 1.3, xp: 5, h: 66, nest: 1 },
  zplague: { n: '역병 술사', hp: 130, sp: 46, r: 14, dmg: 12, cd: 2.2, xp: 4, h: 66, range: 260, caster: 1, plague: 1 },
  zbat:    { n: '박쥐 떼', hp: 10, sp: 150, r: 9, dmg: 3, cd: 0.7, xp: 1, h: 40, fly: 1, swarm: 4, flap: 1 },
  byeomra:   { n: '역병 염라', hp: 2800, sp: 40, r: 26, dmg: 30, cd: 1.4, xp: 0, h: 110, summoner: 1, chain: 1 },
  bdokryong: { n: '독룡 이무기', hp: 3200, sp: 56, r: 28, dmg: 30, cd: 1.3, xp: 0, h: 104, breath: 1 },
  bheukryong: { n: '흑룡 대장', hp: 3600, sp: 70, r: 26, dmg: 34, cd: 1.1, xp: 0, h: 110, armor: 3, charger: 1 },
  bdukkeobi: { n: '바위 두꺼비 거인', hp: 1800, sp: 36, r: 32, dmg: 36, cd: 1.5, xp: 0, h: 100, armor: 3, slam: 1, hop: 1 },
  xwisp:   { n: '도깨비불 정령', hp: 40, sp: 110, r: 11, dmg: 6, cd: 0.9, xp: 2, h: 50, fly: 1, tag: 'explore' },
  xlooter: { n: '폐허 약탈 좀비', hp: 60, sp: 140, r: 12, dmg: 7, cd: 0.8, xp: 2, h: 60, tag: 'explore' }
});
/* 단계: 1 약함 ~ 4 강함, 5 상위 종. 단계가 높을수록 체력 배율이 크고 무리 짝이 적다 */
D.TIER = { zbat: 2, zbomb: 2, zshield: 3, zsiege: 3, zplague: 3, znest: 3, peasant: 1, zrat: 1, zdog: 1, zcrow: 2, archer: 2, spear: 2, yangban: 2, zsword: 3, rider: 3, munsin: 3, zwaegun: 3, zboar: 3, zmonk: 3, harcher: 3, zsamurai: 4, mujang: 4, zox: 4, zbear: 4, ztiger: 4,
  iron_spear: 5, red_sword: 5, black_archer: 5, blood_dog: 5, skull_monk: 5, plague_rider: 5, ghost_yangban: 5, shadow_samurai: 5, war_ox: 5, giant_bear: 5 };
D.TIERHP = [1, 1, 1.3, 2.0, 2.0, 1.0];   /* 기본 체력 차이에 곱한다: 평균이 대략 1 / 2.2 / 4.5 / 9 / 15 */
D.VAR_OF = { spear: 'iron_spear', zsword: 'red_sword', archer: 'black_archer', zdog: 'blood_dog', zmonk: 'skull_monk', rider: 'plague_rider', yangban: 'ghost_yangban', zsamurai: 'shadow_samurai', zox: 'war_ox', zbear: 'giant_bear' };

/* 챕터: 땅 모습(theme), 밤 수, 나오는 적, 우두머리 */
D.CHAPTERS = [
  { n: 1, name: '역병 도는 마을', theme: 'village', nights: 4, pool: ['peasant', 'zdog', 'archer'], elite: 'mujang', boss: 'mujang' },
  { n: 2, name: '버려진 장터', theme: 'market', nights: 4, pool: ['peasant', 'zrat', 'archer', 'spear', 'yangban'], elite: 'zboar', boss: 'zbear' },
  { n: 3, name: '눈 덮인 고개', theme: 'snow', nights: 4, pool: ['peasant', 'spear', 'zdog', 'zcrow', 'rider'], elite: 'zbear', boss: 'ztiger' },
  { n: 4, name: '불타는 관아', theme: 'burning', nights: 5, pool: ['archer', 'spear', 'zsword', 'munsin', 'zboar', 'rider'], elite: 'zox', boss: 'zgrand' },
  { n: 5, name: '안개 낀 나루', theme: 'ferry', nights: 5, pool: ['peasant', 'zwaegun', 'zsamurai', 'zrat', 'zcrow'], elite: 'zsamurai', boss: 'zgrand' },
  { n: 6, name: '무너진 산성', theme: 'fortress', nights: 5, pool: ['spear', 'archer', 'rider', 'harcher', 'zboar'], elite: 'mujang', boss: 'zbear' },
  { n: 7, name: '귀신 나는 서원', theme: 'seowon', nights: 5, pool: ['yangban', 'munsin', 'zmonk', 'zcrow', 'peasant'], elite: 'zbear', boss: 'mudang' },
  { n: 8, name: '얼어붙은 궁궐 뒤뜰', theme: 'frozen', nights: 6, pool: ['spear', 'zsword', 'zdog', 'harcher', 'yangban'], elite: 'ztiger', boss: 'zqueen2' },
  { n: 9, name: '황천 다리', theme: 'hwangcheon', nights: 6, pool: ['peasant', 'zmonk', 'munsin', 'zcrow', 'zsamurai', 'zboar'], elite: 'zgrand', boss: 'mudang' },
  { n: 10, name: '역병 든 궁궐', theme: 'palace', nights: 6, pool: ['spear', 'archer', 'zsword', 'zwaegun', 'yangban', 'munsin'], elite: 'zgrand', boss: 'king' }
];
/* 11~30장: 테마를 돌려 쓰고 적을 섞는다 */
(function () {
  const names = ['피어린 성곽길', '역병 돈 포구', '버려진 광산', '귀신 우는 대숲', '얼음 동굴', '무너진 탑골', '핏빛 단풍 산사', '저주받은 왕릉', '불타는 한양 저잣거리', '역병 군영', '안개 덮인 섬', '검은 늪', '쟿빛 고개', '저승 문턱', '해골 성채', '얼어붙은 백두', '독기 서린 궁궐 지하', '하늘 다리', '어둠의 종묘', '역신의 옥좌'];
  const th = ['fortress', 'ferry', 'burning', 'seowon', 'frozen', 'fortress', 'burning', 'hwangcheon', 'market', 'fortress', 'ferry', 'hwangcheon', 'burning', 'hwangcheon', 'seowon', 'snow', 'palace', 'hwangcheon', 'palace', 'palace'];
  const all = ['peasant', 'archer', 'spear', 'zsword', 'rider', 'zwaegun', 'yangban', 'zsamurai', 'munsin', 'zmonk', 'zdog', 'zrat', 'zcrow', 'zboar', 'zox'];
  const bosses = ['zgrand', 'zqueen2', 'mudang', 'zbear', 'yeoksin', 'zgrand', 'ztiger', 'mudang', 'yeoksin'];
  names.forEach((nm, i) => { const n = 11 + i, s = (i * 5) % all.length; const pool = [i % 2 ? 'spear' : 'peasant']; for (let k = 0; k < 5; k++) pool.push(all[(s + k * 3) % all.length]); D.CHAPTERS.push({ n, name: nm, theme: th[i], nights: 6, pool, elite: ['zgrand', 'zsamurai', 'zbear', 'ztiger', 'mujang'][i % 5], boss: n === 20 || n === 30 ? 'yeoksin' : bosses[i % bosses.length] }); });
  /* 새 우두머리: 뒤 장에 섞는다 (악몽 2막도 같은 목록을 쓴다) */
  for (const c of D.CHAPTERS) { if ([16, 22, 28].includes(c.n)) c.boss = 'bulgasari'; if ([19, 25].includes(c.n)) c.boss = 'jangsanbeom'; }
})();
/* 판마다 다른 목표 (1~3장은 기본 사당 지키기) */
D.OBJ = {
  defend:     { n: '사당 지키기', d: '사당 내구도를 절반 넘게 지켜라' },
  survive:    { n: '시간 버티기', d: '우두머리 없이 더 많은 물량을 끝까지 버텨라' },
  escort:     { n: '피난민 호위', d: '밤마다 오는 피난민을 사당까지 절반 넘게 데려와라' },
  bossTime:   { n: '우두머리 속전', d: '우두머리를 75초 안에 쓰러뜨려라 (넘기면 분노)' },
  beacon:     { n: '봉화대 지키기', d: '성 밖 봉화대가 무너지면 진다' },
  annihilate: { n: '섬멸', d: '정해진 수만큼 좀비를 쓰러뜨려라' }
};
(function () { const fixed = { 1: 'defend', 2: 'defend', 3: 'defend', 4: 'survive', 5: 'escort', 6: 'bossTime', 7: 'beacon', 8: 'annihilate', 9: 'defend', 10: 'bossTime' }; const rot = ['escort', 'beacon', 'survive', 'annihilate', 'bossTime', 'defend'];
  D.CHAPTERS.forEach(C => { C.objective = fixed[C.n] || rot[(C.n - 11) % rot.length]; });
  /* 18장 첫 밤 튐: 강한 무리(왜군 조총·문신)를 뒤로 미룬다 */
  if (D.CHAPTERS[17]) D.CHAPTERS[17].pool = ['peasant', 'spear', 'zrat', 'munsin', 'zwaegun', 'zox'];
})();
/* 등장 순서: 막마다 새 얼굴을 천천히 공개한다 (앞쪽 = 약한 것, 뒤 밤일수록 뒤쪽 것이 섞인다) */
(function () {
  const P = {
    1: ['peasant', 'zdog'], 2: ['peasant', 'zrat', 'zdog'], 3: ['peasant', 'zdog', 'zrat'],
    4: ['peasant', 'zrat', 'archer', 'spear'], 5: ['peasant', 'zrat', 'archer', 'zcrow', 'yangban'], 6: ['peasant', 'zdog', 'spear', 'archer', 'yangban', 'zcrow'],
    7: ['spear', 'archer', 'yangban', 'zsword', 'munsin', 'zmonk'], 8: ['spear', 'zdog', 'archer', 'zsword', 'rider', 'zboar'], 9: ['peasant', 'zcrow', 'zmonk', 'munsin', 'zwaegun', 'harcher'], 10: ['spear', 'archer', 'zsword', 'zwaegun', 'rider', 'munsin'],
    11: ['spear', 'zsword', 'zboar', 'munsin', 'zsamurai'], 12: ['spear', 'archer', 'harcher', 'zwaegun', 'zsamurai', 'zox'], 13: ['peasant', 'zsword', 'zmonk', 'rider', 'zox', 'zsamurai'], 14: ['spear', 'yangban', 'munsin', 'zboar', 'zsamurai', 'zox'], 15: ['zsword', 'zwaegun', 'harcher', 'rider', 'zsamurai', 'zox'],
    16: ['spear', 'zsword', 'zwaegun', 'zsamurai', 'zox', 'iron_spear'], 17: ['spear', 'archer', 'zsword', 'rider', 'zsamurai', 'red_sword'], 18: ['spear', 'zsword', 'archer', 'munsin', 'iron_spear', 'black_archer'],
    19: ['peasant', 'zdog', 'zsword', 'rider', 'red_sword', 'blood_dog'], 20: ['spear', 'zmonk', 'munsin', 'zsamurai', 'black_archer', 'skull_monk'], 21: ['zsword', 'rider', 'harcher', 'zox', 'iron_spear', 'plague_rider'],
    22: ['spear', 'yangban', 'zsamurai', 'red_sword', 'skull_monk', 'ghost_yangban'], 23: ['zsword', 'zwaegun', 'zsamurai', 'black_archer', 'plague_rider', 'shadow_samurai'], 24: ['spear', 'zox', 'iron_spear', 'blood_dog', 'ghost_yangban', 'war_ox'],
    25: ['zsword', 'zsamurai', 'red_sword', 'skull_monk', 'shadow_samurai', 'giant_bear'], 26: ['iron_spear', 'black_archer', 'blood_dog', 'plague_rider', 'war_ox', 'giant_bear'], 27: ['red_sword', 'ghost_yangban', 'skull_monk', 'shadow_samurai', 'war_ox', 'plague_rider'],
    28: ['iron_spear', 'blood_dog', 'black_archer', 'shadow_samurai', 'giant_bear', 'war_ox'], 29: ['red_sword', 'plague_rider', 'ghost_yangban', 'skull_monk', 'giant_bear', 'shadow_samurai'], 30: ['iron_spear', 'red_sword', 'black_archer', 'plague_rider', 'shadow_samurai', 'giant_bear']
  };
  for (const C of D.CHAPTERS) if (P[C.n]) C.pool = P[C.n].filter(k => D.EN[k]);
  /* 장마다 처음 나오는 적 */
  const seen = new Set(); for (const C of D.CHAPTERS) { C.fresh = C.pool.filter(k => !seen.has(k)); C.pool.forEach(k => seen.add(k)); }
  /* 역할형 좀비를 4~18장에 단계적으로 섞는다 */
  const R4P = { zbat: [5, 9, 12, 20], zbomb: [6, 10, 14, 21], zshield: [7, 11, 15, 24], zsiege: [8, 12, 16, 26], zplague: [9, 13, 17, 27], znest: [11, 14, 18, 29] };
  for (const k in R4P) for (const n of R4P[k]) { const C = D.CHAPTERS[n - 1]; if (C && D.EN[k] && !C.pool.includes(k)) C.pool.push(k); }
  { const seen2 = new Set(); for (const C of D.CHAPTERS) { C.fresh = C.pool.filter(k => !seen2.has(k)); C.pool.forEach(k => seen2.add(k)); } }
  /* 우두머리: 같은 우두머리가 두 번 넘게 나오지 않게 (30장 역신은 최종 결전이라 예외) */
  const BOSS = [0, 'mujang', 'zbear', 'ztiger', 'zgrand', 'zsamurai', 'zsamurai', 'mudang', 'zqueen2', 'byeomra', 'king', 'zgrand', 'bdokryong', 'mudang', 'zbear', 'yeoksin', 'bulgasari', 'ztiger', 'byeomra', 'jangsanbeom', 'yeoksin', 'bheukryong', 'bulgasari', 'bdukkeobi', 'bdokryong', 'jangsanbeom', 'bdukkeobi', 'king', 'mujang', 'bheukryong', 'yeoksin'];
  for (const C of D.CHAPTERS) if (BOSS[C.n] && D.EN[BOSS[C.n]]) C.boss = BOSS[C.n];
  D.revealed = ch => { const s = new Set(); for (const C of D.CHAPTERS) { if (C.n > ch) break; C.pool.forEach(k => s.add(k)); } return s; };
})();
/* 판마다 다른 배치: 좀비 길(2~3갈래)과 건물 자리. 같은 챕터는 늘 같은 배치 */
D.lanePt = (L, t, i) => { const k = t * t * (3 - 2 * t); return { x: L + (D.CX - L) * k * k + Math.sin(t * 9 + i * 2) * 16, y: -40 + t * (D.WALL_Y + 40) }; };
D.layoutOf = function (ch) {
  let s = (ch * 9973 + 17) >>> 0; const R = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; const rr = (a, b) => a + R() * (b - a);
  const T = [[150, 360, 570], [200, 520], [120, 420, 600], [250, 590], [140, 470], [180, 360, 540], [110, 330, 610]];
  const lanes = (ch === 1 ? [150, 360, 570] : T[(ch * 3) % T.length].map(x => Math.round(x + rr(-35, 35)))).map(x => Math.round(D.CX + (x - 360) * 1.75));
  const nearLane = (x, y) => lanes.some((L, i) => { for (let t = 0; t <= 1; t += 0.02) { const p = D.lanePt(L, t, i); if (Math.abs(p.y - y) < 30 && Math.abs(p.x - x) < 78) return true; } return false; });
  const guardNear = (x, y) => Object.values(D.GUARD).some(g => Math.hypot(g.x - x, g.y - y) < 80);
  const pads = [];
  /* WIDE_PADS(11-25): 넓은 판 — 성문 앞 반원 고리 두 겹 + 길 양옆 + 성벽 안 양옆. 좌우 거울 우선, 길·수호물·서로 겹침 금지 */
  const CX = D.CX, WY = D.WALL_Y, jit = rr(-18, 18);
  const free = (x, y) => x > 80 && x < D.WW - 80 && !nearLane(x, y) && !guardNear(x, y) && !pads.some(p => Math.hypot(p[0] - x, p[1] - y) < 118);
  const put = (x, y) => { if (free(x, y)) { pads.push([Math.round(x), Math.round(y)]); return true; } return false; };
  const pair = (x, y) => { const xm = 2 * CX - x; if (free(x, y) && free(xm, y)) { put(x, y); put(xm, y); } else { put(x, y); put(xm, y); } };
  for (const a of [0.16, 0.5, 0.86, 1.2]) pair(CX - Math.cos(a) * (340 + jit), WY - 60 - Math.sin(a) * 250);
  for (const a of [0.1, 0.42, 0.76, 1.1]) pair(CX - Math.cos(a) * (560 + jit), WY - 90 - Math.sin(a) * 430);
  lanes.forEach((L, i) => { const p = D.lanePt(L, 0.5, i); put(p.x - 130, p.y); put(p.x + 130, p.y); });
  pair(CX - 330, WY + 110); pair(CX - 470, WY + 270);
  while (pads.length > 20) pads.pop();
  return { lanes, pads };
};
/* 챕터 하나의 밤 목록을 만든다. kind: normal / elite / boss (웨이브 줄 아이콘) */
/* 2막 악몽 배율: 노멀 30장 클리어 계정 기준. 1장에서 시작해 30장까지 오른다 */
D.nmK = ch => ({ hp: 10 + 0.9 * (ch - 1), rate: 1.3 + 0.008 * (ch - 1), dmg: 2.2 + 0.05 * (ch - 1) });
D.nightsOf = function (ch) {
  const C = D.CHAPTERS[ch - 1], out = [], hp0 = 1 + 0.34 * (ch - 1) + 0.004 * (ch - 1) * (ch - 1); /* 시뮬 조정(11-25): 장별 체력 증가를 완만하게 */
  for (let i = 0; i < C.nights; i++) {
    const last = i === C.nights - 1, k = i / Math.max(1, C.nights - 1);
    const mix = {};
    C.pool.forEach((t, j) => { if (j === 0) return; if (j <= 1 + i) mix[t] = 0.07 + 0.04 * Math.min(i, 3); });
    out.push({
      name: (i + 1) + '번째 밤', dur: 50 + i * 8 + (last ? 10 : 0),
      rate: [1.5 + k * 1.6 + ch * 0.07, 3.0 + k * 3.0 + ch * 0.12], hp: hp0 * (0.7 + 0.3 * k) * (1 + 0.22 * i) * (last && ch <= 3 ? 0.8 : 1) * (ch >= 4 && ch <= 6 ? 0.78 : 1) * (ch >= 8 ? 1.12 : 1), mix, base: C.pool[0], /* 시뮬 조정: 첫 밤은 약하게, 밤마다 가파르게 */
      kind: last ? 'boss' : (i % 2 === 1 ? 'elite' : 'normal'),
      elites: last ? [0.4] : (i % 2 === 1 ? [0.5] : []), eliteType: C.elite, boss: last ? C.boss : null
    });
  }
  return out;
};

D.TUR = {
  general: { name: '천하대장군', d: '눈에서 붉은 광선을 쏜다', kind: 'beam', cost: 40, range: 230, rate: 0.9, dmg: 14, hp: 80, spr: 'tur_general', top: 62, col: '255,90,60' },
  lady:    { name: '지하여장군', d: '푸른 기운으로 적을 느리게 한다', kind: 'aura', cost: 50, range: 140, slow: 0.5, dps: 8, hp: 90, spr: 'tur_lady', top: 62 },
  arrow:   { name: '망루', d: '탑 위 병사가 쏜다 (궁수 → 연노병 → 조총수로 강화, 단계마다 인원 증가)', crew: 1, kind: 'shot', cost: 60, range: 270, rate: 0.36, dmg: 11, hp: 120, spr: 'tower_arrow', top: 112 },
  mine:    { name: '금광', d: '밤을 넘길 때마다 엽전 +20', kind: 'mine', cost: 50, range: 0, hp: 90, spr: 'mine', top: 44, income: 20 },
  fire:    { name: '화덕탑', d: '가까이 온 적에게 불길을 뿜는다', kind: 'flame', cost: 70, range: 150, rate: 0.08, dps: 26, hp: 130, spr: 'tower_fire', top: 96 },
  hwacha:  { head: 'hwacha_head', name: '화차', d: '신기전 여덟 발을 한꺼번에', kind: 'rocket', cost: 85, range: 290, rate: 2.6, dmg: 12, shots: 8, hp: 70, spr: 'tower_hwacha', top: 60 },
  cannon:  { head: 'cannon_head', name: '화포', d: '포탄이 날아가 넓게 터진다', kind: 'shell', cost: 90, range: 330, rate: 2.8, dmg: 42, splash: 80, hp: 80, spr: 'tower_cannon', top: 54 },
  talisman:{ name: '부적탑', d: '번개가 적에서 적으로 옮겨 붙는다', kind: 'chain', cost: 80, range: 260, rate: 1.4, dmg: 18, hp: 90, spr: 'tower_talisman', top: 100 },
  barracks:{ name: '병영', d: '조선 병사가 나와 성문 앞을 지킨다 (강화할수록 병종과 인원 증가)', kind: 'barracks', cost: 90, range: 0, rate: 7, hp: 170, spr: 'barracks', top: 100 },
  well:    { name: '우물', d: '주변 처용과 시설의 체력을 되살린다', kind: 'heal', cost: 60, range: 170, rate: 1.0, heal: 6, hp: 100, spr: 'well', top: 90 }
};

/* 장별 원소 약점(후더덕식 챕터 원소 버프): 이 장의 좀비는 이 속성 피해를 더 받는다 */
D.CHEL_LIST = ['fire', 'metal', 'fire', 'thunder', 'qi', 'ice', 'thunder', 'fire', 'qi', 'metal'];
D.chEl = function (ch, nm) { const c = Math.max(1, ch | 0), el = D.CHEL_LIST[(c - 1 + (nm ? 3 : 0)) % D.CHEL_LIST.length]; const k = nm ? 0.5 : c <= 10 ? 0.3 : c <= 20 ? 0.4 : 0.5; return { el, k }; };
/* 건물 단계별 해금: 이 장부터 지을 수 있다 (악몽은 전부 열림) */
D.TUR_UNLOCK = { arrow: 1, mine: 1, barracks: 1, general: 2, well: 3, fire: 4, lady: 5, cannon: 6, talisman: 8, hwacha: 10 };
D.tUnlocked = (k, ch, nm) => !!nm || (ch | 0) >= (D.TUR_UNLOCK[k] || 1);
/* 병영 병사: unlock 병영 단계, melee/range, dps, hp, sp */
D.SOLDIER = {
  s_sword:   { n: '검사', unlock: 1, reach: 26, dps: 14, hp: 90, sp: 120, col: '70,120,200' },
  s_spear:   { n: '창수', unlock: 1, reach: 52, dps: 11, hp: 130, sp: 100, col: '60,90,160' },
  s_archer:  { n: '궁수', unlock: 2, range: 270, dmg: 12, rate: 1.0, hp: 60, sp: 110, col: '70,150,80' },
  s_geuk:    { n: '극사', unlock: 2, reach: 48, dps: 12, hp: 120, sp: 100, cleave: 1, col: '170,60,50' },
  s_gun:     { n: '조총병', unlock: 3, range: 330, dmg: 34, rate: 2.2, hp: 60, sp: 100, gun: 1, col: '50,60,110' },
  s_monk:    { n: '승병', unlock: 3, reach: 30, dps: 10, hp: 150, sp: 105, heal: 1, col: '150,140,120' },
  s_cavalry: { n: '기마병', unlock: 4, reach: 34, dps: 20, hp: 160, sp: 210, charge: 1, col: '140,90,50' },
  s_taoist:  { n: '도사', unlock: 4, range: 280, dmg: 16, rate: 1.4, hp: 55, sp: 100, chain: 1, col: '230,230,220' }
};
/* 본부(사당) 레벨: 시설 최대 레벨, 동료 칸, 밤마다 엽전 */
D.HQ = [null, { max: 2, comps: 1, gold: 0, hp: 0 }, { max: 3, comps: 2, gold: 15, hp: 120, cost: 120 }, { max: 4, comps: 2, gold: 30, hp: 260, cost: 220 }, { max: 5, comps: 2, gold: 50, hp: 420, cost: 360 }, { max: 5, comps: 2, gold: 80, hp: 600, cost: 520 }];
D.WALLS = []; for (let k = -7; k <= 7; k++) D.WALLS.push(k ? { x: D.CX + k * 86 + (k > 0 ? 24 : -24) } : { x: D.CX, gate: 1 });   /* 넓은 판: 15칸 */

D.WEAPON = {
  bow:     { n: '각궁', d: '금빛 화살이 적 하나를 뚫고 나간다', rate: 0.40, dmg: 11, range: 340, sp: 900, shots: 1, pierce: 1, spread: 0.14, fx: 'arrow' },
  nogi:    { n: '수노기', d: '푸른 쇠뇌살을 쉴 새 없이 쏜다', rate: 0.17, dmg: 6, range: 290, sp: 950, shots: 1, pierce: 0, spread: 0.10, fx: 'bolt' },
  jochong: { n: '조총', d: '느리지만 세고 멀리 간다. 적 셋을 뚫는다', rate: 1.05, dmg: 30, range: 440, sp: 1500, shots: 1, pierce: 3, spread: 0.08, fx: 'tracer' },
  manpa:   { n: '만파식적', d: '피리 소리가 부채꼴 음파로 퍼져 적을 밀어내고 뚫는다', rate: 0.55, dmg: 16, range: 300, sp: 520, shots: 3, pierce: 99, spread: 0.22, fx: 'wave' },
  chilji:  { n: '칠지도', d: '일곱 갈래 검기를 한꺼번에 날린다', rate: 0.75, dmg: 14, range: 320, sp: 760, shots: 7, pierce: 1, spread: 0.13, fx: 'swordwave' },
  seungja: { n: '승자총통', d: '철환 여러 알을 흩뿌린다', rate: 0.8, dmg: 11, range: 270, sp: 780, shots: 6, pierce: 0, spread: 0.13, fx: 'pellet' }
};

D.GUARD = {
  turtle:  { n: '현무', side: '사당 왼편', d: '사당 피해 30% 감소. 영혼이 나와 물결 방패로 적을 밀어내고 느리게 한다', x: 190, y: 1610, range: 330, c: '90,200,170' },
  phoenix: { n: '주작', side: '사당 오른편', d: '영혼이 날아올라 내리꽂으며 불길 자국을 남긴다', x: 1110, y: 1610, range: 540, rate: 2.2, dmg: 32, c: '255,110,50' },
  tiger:   { n: '백호', side: '성문 앞 왼편', d: '영혼이 적 무리로 뛰어들어 세 번 할퀴고 포효로 밀쳐 낸다', x: 210, y: 1150, range: 320, rate: 0.75, dmg: 26, c: '235,240,255' },
  dragon:  { n: '청룡', side: '성문 앞 오른편', d: '영혼이 하늘을 휘감으며 번개를 다섯 번 내리친다', x: 1090, y: 1150, range: 440, rate: 1.4, dmg: 22, c: '90,190,255' }
};

/* 동료: 처용을 따라다니며 싸운다 */
D.COMP = {
  yisunsin:    { n: '이순신', role: '원거리', el: 'metal', grade: 4, d: '화살 다섯 대를 부채꼴로 쏜다', spr: 'yisunsin', rate: 1.1, dmg: 16, range: 380, col: '255,90,70', ult: '학익진', ultD: '거북선이 나타나 포탄을 퍼붓는다' },
  eulji:       { n: '을지문덕', role: '근거리', el: 'ice', grade: 4, d: '적에게 뛰어들어 회전 베기', spr: 'eulji', rate: 1.3, dmg: 34, range: 230, col: '120,200,255', ult: '살수대첩', ultD: '거대한 물결이 적을 쓸어 간다' },
  wonhyo:      { n: '원효대사', role: '법사', el: 'qi', grade: 4, d: '염주에서 금빛 광선을 쏜다', spr: 'wonhyo', rate: 0.1, dmg: 26, range: 330, col: '255,210,120', ult: '정화 결계', ultD: '큰 결계로 적을 태우고 아군을 치유' },
  gangamchan:  { n: '강감찬', role: '번개', el: 'thunder', grade: 3, d: '벼락이 적에서 적으로 옮겨 붙는다', spr: 'gangamchan', rate: 1.4, dmg: 22, range: 340, col: '140,190,255', ult: '귀주대첩', ultD: '화면 모든 적에게 벼락' },
  honggildong: { n: '홍길동', role: '날쌘 공격', el: 'metal', grade: 3, d: '분신 둘이 함께 비수를 던진다', spr: 'honggildong', rate: 0.9, dmg: 12, range: 320, col: '200,60,60', ult: '둔갑 연속베기', ultD: '순간이동하며 적 열둘을 벤다' },
  gumiho:      { n: '구미호', role: '마법', el: 'fire', grade: 3, d: '여우불 셋이 적을 쫓아간다', spr: 'gumiho', rate: 1.6, dmg: 18, range: 360, col: '120,200,255', ult: '홀림', ultD: '적 여덟을 홀려 서로 싸우게 한다' },
  bari:        { n: '바리공주', role: '혼령술', el: 'qi', grade: 4, d: '쓰러진 좀비의 혼을 인도해 잠시 아군 혼령으로 싸우게 한다', spr: 'bari', rate: 1.4, dmg: 18, range: 320, col: '170,220,255', ult: '저승길 인도', ultD: '화면 안 적에게 피해를 주고 쓰러진 적을 혼령 아군으로 일으킨다' },
  jeonwoochi:  { n: '전우치', role: '도술 검객', el: 'thunder', grade: 4, d: '칼을 휘둘러 적을 꿰뚫는 검기를 날린다', spr: 'jeonwoochi', rate: 1.0, dmg: 26, range: 340, col: '90,170,255', ult: '화중병', ultD: '그림 속 먹물 병사 여섯을 불러내 함께 싸운다' },
  samyeong:    { n: '사명대사', role: '권법', el: 'metal', grade: 3, d: '권법 연타로 적을 기절시킨다', spr: 'samyeong', rate: 0.9, dmg: 20, range: 200, col: '255,190,90', ult: '승병 봉기', ultD: '승병 다섯을 불러 앞을 막는다' },
  daejanggeum: { n: '대장금', role: '치유', el: 'qi', grade: 4, d: '약재 주머니를 던지고 주변 처용과 동료를 치유한다', spr: 'daejanggeum', rate: 1.3, dmg: 14, range: 320, col: '150,240,190', ult: '어의의 탕약', ultD: '사당과 처용, 시설을 크게 회복하고 잠시 받는 피해를 줄인다' },
  sadaham:     { n: '화랑 사다함', role: '근거리', el: 'metal', grade: 3, d: '적 사이를 오가며 세 번 연달아 벤다', spr: 'sadaham', rate: 1.1, dmg: 22, range: 220, col: '90,220,200', ult: '화랑 검무', ultD: '일직선으로 돌진하며 앞의 적을 모두 벤다' },
  kimchungseon: { n: '김충선', role: '암살', el: 'metal', grade: 4, d: '귀화한 사무라이. 적진의 원거리·마법 유닛만 노려 뒤로 파고들어 벤다', spr: 'kimchungseon', rate: 1.2, dmg: 70, range: 520, col: '220,60,60', ult: '귀순의 칼', ultD: '화면 안 원거리·마법 적을 차례로 순간이동하며 모두 벤다' },
  imugi:       { n: '이무기', role: '비행', el: 'fire', grade: 4, d: '하늘을 날며 불길을 뿜는다', spr: 'imugi', rate: 0.1, dmg: 34, range: 260, col: '255,120,40', ult: '승천', ultD: '하늘로 솟구치며 불덩이 비를 쏟는다', fly: 1 },
  dokkaebi:    { n: '도깨비', role: '근거리', el: 'fire', grade: 2, d: '도깨비방망이를 던져 되돌아오게 한다', spr: 'dokkaebi', rate: 1.5, dmg: 18, range: 300, col: '255,190,60', ult: '방망이 지진', ultD: '땅을 세 번 내리쳐 적을 기절시킨다' },
  haetae:      { n: '해태', role: '수호', el: 'fire', grade: 2, d: '불길을 내뿜어 앞의 적을 태운다', spr: 'haetae', rate: 0.1, dmg: 30, range: 200, col: '255,120,40', ult: '해치의 불바다', ultD: '앞쪽 땅을 불바다로 만든다' },
  jangyeongsil: { n: '장영실', role: '발명가', el: 'metal', grade: 4, d: '작은 화포 장치를 세워 한동안 저절로 쏘게 한다', spr: 'jangyeongsil', rate: 1.2, dmg: 18, range: 360, col: '120,180,255', ult: '자격루의 종', ultD: '자격루 종이 울려 아군 공격 속도가 크게 오른다', gadget: 1 },
  samjoko:     { n: '삼족오', role: '원거리', el: 'qi', grade: 2, d: '태양 광선으로 여러 적을 꿰뚫는다', spr: 'samjoko', rate: 2.0, dmg: 26, range: 380, col: '255,220,90', ult: '태양 강림', ultD: '하늘에서 태양 광선이 쏟아진다' }
};
/* 원소 다섯: 불, 번개, 얼음, 기, 쇠 */
D.EL = { fire: { n: '불', c: '#ff7a3a' }, thunder: { n: '번개', c: '#7fb8ff' }, ice: { n: '얼음', c: '#9ff0ff' }, qi: { n: '기', c: '#c08aff' }, metal: { n: '쇠', c: '#d8d8d8' } };
/* 진화(탕탕특공대식): 공격 기술 5단계 + 짝 보조 기술 */
D.EVO = { ghost: { pair: 'crit', n: '백귀야행' }, meteor: { pair: 'power', n: '천벌 유성우' }, thunder: { pair: 'rapid', n: '뇌신강림' }, ice: { pair: 'swift', n: '빙룡' }, dance: { pair: 'heal', n: '처용 대무' }, talisman: { pair: 'multi', n: '팔괘 부적진' }, beam: { pair: 'pierce', n: '해모수 광선' }, vortex: { pair: 'magnet', n: '화룡 회오리' } };
/* 각성(별 다섯) 효과 */
D.AWAKE = {
  ghost: '진화: 귀신불이 맞으면 작게 터진다, 발수 +3',
  meteor: '진화: 불바다가 두 배로 넓고 오래 탄다',
  thunder: '진화: 벼락이 주변 적 셋에게 옮겨 붙는다',
  ice: '진화: 맞은 적이 반드시 얼어붙는다',
  dance: '진화: 부채가 커지고 불꽃 자국을 남긴다',
  talisman: '진화: 부적이 두 번 터진다',
  beam: '진화: 광선이 굵어지고 맞은 적이 불탄다',
  vortex: '진화: 불회오리가 둘로 나뉜다'
};

/* 전투 안 성장 카드. kind: atk(공격 기술) / buff */
D.SKILLS = [
  { id: 'ghost',    n: '귀화탄',     kind: 'atk', el: 'qi', max: 5, c: '#b066ff', d: l => '보랏빛 귀신불 ' + (2 + l) + '발이 적을 쫓아간다' },
  { id: 'meteor',   n: '별똥불',     kind: 'atk', el: 'fire', max: 5, c: '#ff8a3a', d: l => '불타는 운석 ' + l + '개가 떨어져 불바다를 남긴다' },
  { id: 'thunder',  n: '벼락',       kind: 'atk', el: 'thunder', max: 5, c: '#7fd0ff', d: l => '하늘에서 벼락 ' + (1 + l) + '줄기가 내리꽂힌다' },
  { id: 'ice',      n: '얼음송곳',   kind: 'atk', el: 'ice', max: 5, c: '#9ff0ff', d: l => '얼음송곳 ' + (3 + l) + '개를 부채꼴로 쏘아 얼린다' },
  { id: 'dance',    n: '처용무',     kind: 'atk', el: 'metal', max: 5, c: '#ff6a8a', d: l => '부채 ' + (1 + l) + '개가 처용 둘레를 돌며 벤다' },
  { id: 'talisman', n: '벽사부',     kind: 'atk', el: 'fire', max: 5, c: '#ffd84a', d: l => '부적 ' + (1 + Math.floor(l / 2)) + '장이 날아가 터진다' },
  { id: 'beam',     n: '신궁 광선',  kind: 'atk', el: 'qi', max: 5, c: '#ff5a4a', d: l => '붉은 광선이 이어지며 ' + l + '명을 꿰뚫는다' },
  { id: 'vortex',   n: '불회오리',   kind: 'atk', el: 'fire', max: 5, c: '#ffb03a', d: l => '불회오리가 적을 빨아들이며 태운다 (위력 ' + (100 + 30 * (l - 1)) + '%)' },
  { id: 'rapid',    n: '속사',       kind: 'buff', max: 5, c: '#8affc0', d: () => '쏘는 간격이 20% 짧아진다' },
  { id: 'multi',    n: '겹발',       kind: 'buff', max: 3, c: '#8affc0', d: () => '한 번에 쏘는 발수가 하나 늘어난다' },
  { id: 'pierce',   n: '관통',       kind: 'buff', max: 3, c: '#8affc0', d: () => '적 하나를 더 뚫는다' },
  { id: 'power',    n: '신력',       kind: 'buff', max: 5, c: '#8affc0', d: () => '모든 공격 위력이 30% 오른다' },
  { id: 'crit',     n: '급소',       kind: 'buff', max: 5, c: '#8affc0', d: () => '치명타 확률 +12% (치명타는 두 배 반)' },
  { id: 'swift',    n: '축지',       kind: 'buff', max: 3, c: '#8affc0', d: () => '이동이 15% 빨라진다' },
  { id: 'magnet',   n: '옥구슬 끌기', kind: 'buff', max: 3, c: '#8affc0', d: () => '옥구슬을 끌어오는 거리 +60%' },
  { id: 'heal',     n: '정화수',     kind: 'buff', max: 99, c: '#8affc0', d: () => '체력 40 회복, 최대 체력 +20' },
  { id: 'repair',   n: '사당 보수',  kind: 'buff', max: 99, c: '#8affc0', d: () => '사당 내구도를 100 되살린다', need: g => g.shrine.hp < g.shrine.max },
  { id: 'bless',    n: '장승 가호',  kind: 'buff', max: 3, c: '#8affc0', d: () => '세운 시설의 위력과 속도 +40%', need: g => g.turrets.length > 0 },
{ id: 'bond',     n: '영웅 결속',  kind: 'buff', max: 3, c: '#ffc85a', d: () => '함께한 영웅의 위력 +40%, 큰 기술이 빨리 찬다', need: g => g.comps.some(c => c.active) }
];
})();

/* ARMED_BIG: 무기 든 좀비는 화면 크기 약 2배·체력 2배, 말 탄 좀비는 덩치 1.7배·체력 2.2배 (사용자 요청 11-25) */
(function () {
  const D = window.JZD; if (!D) return;
  const ARMED = { archer: [1.9, 1.5], spear: [1.9, 1.5], zsword: [1.9, 1.5], zwaegun: [1.9, 1.5], zsamurai: [1.9, 1.5],
    iron_spear: [1.6, 1.3], red_sword: [1.6, 1.3], black_archer: [1.6, 1.3], shadow_samurai: [1.6, 1.3] };
  const RIDER = { rider: [1.7, 1.6], harcher: [1.7, 1.6], plague_rider: [1.45, 1.4] };
  const apply = (T) => { for (const k in T) { const e = D.EN && D.EN[k]; if (!e || e.__big) continue; e.sc = Math.min(2.4, (e.sc || 1) * T[k][0]); e.hp = Math.round(e.hp * T[k][1]); e.__big = 1; e.big = 1; } };
  apply(ARMED); apply(RIDER);
  /* BASE_FIX: 상위 종이 장의 '기본 적'(무리 맨 앞)이면 첫 밤부터 몰려와 사당이 무너진다 → 원래 종을 기본으로 앞에 둔다 */
  const REV = {}; for (const k in (D.VAR_OF || {})) REV[D.VAR_OF[k]] = k;
  for (const C of D.CHAPTERS || []) { if (C.pool && REV[C.pool[0]]) C.pool.unshift(REV[C.pool[0]]); }
  /* 장별 체력 보정 (시뮬로 맞춤) */
  D.CHHP = Object.assign(D.CHHP || {}, {"1":0.8,"2":0.82,"3":1.32,"4":1.35,"5":1.55,"6":1,"7":0.64,"8":0.88,"9":0.63,"10":0.85,"11":0.72,"12":0.68,"13":0.5,"14":0.6,"15":0.6,"16":0.57,"17":0.6,"18":0.5,"19":0.6,"20":0.52,"21":0.6,"22":0.5,"23":0.58,"24":0.56,"25":0.55,"26":0.62,"27":0.58,"28":0.61,"29":0.57,"30":0.56});   /* 시뮬(11-25 진행 계정) 맞춤 */
  /* UP_SOFT: 상위 종은 첫 밤에 나오지 않고 둘째 밤엔 절반만, 공격력은 0.6배 */
  const UP = new Set(Object.values(D.VAR_OF || {})); UP.forEach(k => { const e = D.EN[k]; if (e && !e.__soft) { e.dmg = Math.round(e.dmg * 0.6); e.__soft = 1; } });
  const nf = D.nightsOf; D.nightsOf = function (ch) { const o = nf(ch), k = D.CHHP[ch] || 1; o.forEach((n, i) => { if (k !== 1) n.hp *= k; if (i <= 1 && n.mix) for (const t in n.mix) if (UP.has(t)) { if (i === 0) delete n.mix[t]; else n.mix[t] *= 0.5; } if (i === 0 && UP.has(n.base)) n.base = 'peasant'; /* 첫 밤 큰 무기 좀비 완화(11-25 시뮬: 25장 첫 밤 사무라이가 사당 파괴) */ const EB = t => D.EN && D.EN[t] && D.EN[t].big; if (i <= 1 && n.mix) for (const t in n.mix) if (EB(t)) { if (i === 0) delete n.mix[t]; else n.mix[t] *= 0.6; } if (i === 0 && EB(n.base)) n.hp *= 0.72; }); return o; };
})();

/* SK_UNLOCK: 기술 카드는 장을 거듭하며 열린다 + 출전 영웅 전용 카드 (사용자 요청 11-25) */
(function () {
  const D = window.JZD; if (!D || !D.SKILLS) return;
  D.SK_UNLOCK = { ghost: 1, thunder: 1, dance: 1, rapid: 1, power: 1, heal: 1, repair: 1, bless: 2, ice: 2, multi: 3, talisman: 3, bond: 4, crit: 5, meteor: 6, pierce: 8, swift: 10, beam: 12, magnet: 15, vortex: 18 };
  D.skUnlocked = (id, ch, nm) => !!nm || (ch | 0) >= (D.SK_UNLOCK[id] || 1);
  /* 영웅 전용 카드: 그 영웅을 데려가야 카드 풀에 들어온다. 효과는 그 영웅 위력(+35%/단계)과 특수 효과 */
  const HS = {
    honggildong: ['분신 둔갑', '홍길동 위력 +35%, 큰 기술이 10% 빨리 찬다'],
    dokkaebi: ['방망이 잔치', '도깨비 위력 +35%, 좀비가 엽전을 더 자주 떨군다'],
    haetae: ['해치 불길 돋우기', '해태 위력 +35%'],
    yisunsin: ['학익 화살비', '이순신 위력 +35%, 시설 위력 +10%'],
    eulji: ['살수 돌격', '을지문덕 위력 +35%'],
    gumiho: ['여우불 홀림', '구미호 위력 +35%, 큰 기술이 10% 빨리 찬다'],
    samjoko: ['세 발 햇살', '삼족오 위력 +35%'],
    bari: ['저승길 인도', '바리공주 위력 +35%']
  };
  const COMP = D.COMP || {};
  for (const id in COMP) {
    if (D.SKILLS.some(s => s.id === 'h_' + id)) continue;
    const h = HS[id] || [COMP[id].n + '의 결의', COMP[id].n + ' 위력 +35%'];
    D.SKILLS.push({ id: 'h_' + id, hero: id, n: h[0], kind: 'buff', max: 3, c: '#ffc85a', img: COMP[id].spr, d: (desc => () => desc)(h[1]) });
  }
  if (D.TUR && D.TUR.mine) { D.TUR.mine.income = 35; D.TUR.mine.d = '밤을 넘길 때마다 엽전 +35'; }
  /* 디펜스 강화(11-25 2차): 시설 체력 2.5배, 본부 단계별 시설 최고 레벨 완화(1단계 3 · 2단계 4 · 3단계부터 5) */
  if (D.TUR) for (const k in D.TUR) { const t = D.TUR[k]; if (!t.__hp2) { t.hp = Math.round(t.hp * 2.5); t.__hp2 = 1; } }
  if (D.HQ) { const MX = [0, 3, 4, 5, 5, 5]; for (let i = 1; i < D.HQ.length; i++) if (D.HQ[i]) D.HQ[i].max = Math.max(D.HQ[i].max, MX[i] || 5); }
})();

/* WIDE_MAP2: 넓은 판에 맞춰 탑 사거리 15% 늘림 */
(function () { const D = window.JZD; if (!D || !D.TUR) return; for (const k in D.TUR) { const t = D.TUR[k]; if (t.range && !t.__wr) { t.range = Math.round(t.range * 1.15); t.__wr = 1; } } })();
