/* 처용야행 장비(아이템) 설계. 로비(meta.js)와 전투(battle.js)가 함께 쓴다.
   후더덕 서바이벌의 장비 구조(6칸, 6등급, 3개 합성, 등급별 특수 효과, 레벨업, 분해)를 따르고
   이름과 그림, 수치는 조선풍으로 새로 만든다. */
(function () {
'use strict';
const I = window.JZI = {};

I.SLOTS = [
  { id: 'weapon', n: '무기' }, { id: 'hat', n: '모자' }, { id: 'robe', n: '옷' },
  { id: 'glove', n: '토시' }, { id: 'shoe', n: '신' }, { id: 'acc', n: '노리개' }
];
/* 등급: 색, 기본 능력치 배율, 최대 레벨 */
I.GRADES = [
  { id: 0, n: '일반', c: '#a8a8a8', mul: 1.0, max: 10 },
  { id: 1, n: '우수', c: '#5cc85a', mul: 1.5, max: 20 },
  { id: 2, n: '희귀', c: '#4a9cff', mul: 2.2, max: 30 },
  { id: 3, n: '영웅', c: '#b45cff', mul: 3.2, max: 40 },
  { id: 4, n: '전설', c: '#ff9a2a', mul: 4.6, max: 50 },
  { id: 5, n: '신화', c: '#ff3a3a', mul: 6.5, max: 60 }
];
/* fx: 등급이 [3]영웅, [4]전설, [5]신화에 이르면 열리는 특수 효과. 전투가 key로 처리한다. */
I.ITEMS = {
  /* 무기: 공격 방식을 정한다 (WEAPON id) */
  w_bow:     { slot: 'weapon', n: '각궁', weapon: 'bow', atk: 30, d: '쇠뿔로 만든 활. 금빛 화살이 적을 뚫는다',
               fx: { 3: ['pierce1', '화살 관통 +1'], 4: ['fireArrow', '다섯 발마다 불화살이 터진다'], 5: ['tripleArrow', '화살이 세 갈래로 나간다'] } },
  w_nogi:    { slot: 'weapon', n: '수노기', weapon: 'nogi', atk: 22, d: '연달아 쏘는 쇠뇌',
               fx: { 3: ['haste15', '쏘는 속도 +15%'], 4: ['chillBolt', '맞은 적이 느려진다'], 5: ['bounce2', '쇠뇌살이 두 번 튕긴다'] } },
  w_jochong: { slot: 'weapon', n: '조총', weapon: 'jochong', atk: 40, d: '느리지만 세고 멀리 가는 총',
               fx: { 3: ['crit10', '치명타 확률 +10%'], 4: ['killBlast', '처치한 적이 폭발한다'], 5: ['pierceAll', '총알이 모든 적을 뚫는다'] } },
  w_seungja: { slot: 'weapon', n: '승자총통', weapon: 'seungja', atk: 34, d: '철환을 흩뿌리는 총통',
               fx: { 3: ['pellet2', '철환 +2알'], 4: ['bigKnock', '가까운 적을 크게 밀쳐 낸다'], 5: ['firePellet', '철환에 불이 붙는다'] } },
  /* 모자 */
  h_heukrip: { slot: 'hat', n: '흑립', hp: 60, d: '선비의 검은 갓',
               fx: { 3: ['dmgCut10', '받는 피해 -10%'], 4: ['lastStand', '체력 30% 아래로 떨어지면 2초 무적(한 판 한 번)'], 5: ['regen', '5초마다 체력 3% 회복'] } },
  h_jeonrip: { slot: 'hat', n: '전립', hp: 50, atk: 6, d: '무관이 쓰던 붉은 술 모자',
               fx: { 3: ['crit5', '치명타 확률 +5%'], 4: ['critDmg30', '치명타 피해 +30%'], 5: ['ultCd20', '큰 기술 대기 -20%'] } },
  h_helm:    { slot: 'hat', n: '봉시투구', hp: 80, d: '쇠로 만든 장수의 투구',
               fx: { 3: ['dmgCut10', '받는 피해 -10%'], 4: ['thorns', '가까이서 때린 적에게 피해를 돌려준다'], 5: ['shrine20', '사당 내구도 +20%'] } },
  /* 옷 */
  r_dopo:    { slot: 'robe', n: '도포', hp: 90, d: '넓은 소매의 흰 도포',
               fx: { 3: ['xp15', '옥구슬 경험치 +15%'], 4: ['magnet50', '옥구슬 끄는 거리 +50%'], 5: ['reroll1', '카드 다시 뽑기 +1'] } },
  r_cheolrik: { slot: 'robe', n: '철릭', hp: 110, d: '무관의 군복',
               fx: { 3: ['shrine15', '사당 내구도 +15%'], 4: ['build20', '시설 위력 +20%'], 5: ['startGold60', '시작 엽전 +60'] } },
  r_dujeong: { slot: 'robe', n: '두정갑', hp: 140, d: '쇠못을 박은 갑옷',
               fx: { 3: ['dmgCut10', '받는 피해 -10%'], 4: ['thorns', '가까이서 때린 적에게 피해를 돌려준다'], 5: ['shield', '밤마다 체력 25% 보호막'] } },
  /* 토시 */
  g_tosi:    { slot: 'glove', n: '비단 토시', atk: 14, d: '가벼운 비단 토시',
               fx: { 3: ['haste10', '쏘는 속도 +10%'], 4: ['skillCd10', '신력 기술 대기 -10%'], 5: ['multi1', '한 번에 쏘는 발수 +1'] } },
  g_gauntlet: { slot: 'glove', n: '가죽 깍지', atk: 18, d: '활 쏘는 손을 지키는 깍지',
               fx: { 3: ['critDmg30', '치명타 피해 +30%'], 4: ['eliteDmg25', '정예·우두머리에게 피해 +25%'], 5: ['execute', '체력 10% 아래 일반 적은 바로 쓰러진다'] } },
  /* 신 */
  s_mituri:  { slot: 'shoe', n: '미투리', hp: 30, speed: 0.05, d: '삼으로 엮은 가벼운 신',
               fx: { 3: ['speed10', '이동 속도 +10%'], 4: ['magnet50', '옥구슬 끄는 거리 +50%'], 5: ['dodge10', '10% 확률로 피해를 피한다'] } },
  s_mokhwa:  { slot: 'shoe', n: '목화', hp: 45, speed: 0.03, d: '관리의 검은 목화신',
               fx: { 3: ['dmgCut10', '받는 피해 -10%'], 4: ['moveCut20', '움직이는 동안 받는 피해 -20%'], 5: ['speed10', '이동 속도 +10%'] } },
  /* 노리개 */
  a_jade:    { slot: 'acc', n: '옥노리개', atk: 8, hp: 30, d: '푸른 옥을 단 노리개',
               fx: { 3: ['xp15', '옥구슬 경험치 +15%'], 4: ['ultCd20', '큰 기술 대기 -20%'], 5: ['awaken', '각성까지 필요한 별 -1'] } },
  a_tiger:   { slot: 'acc', n: '범 발톱 노리개', atk: 12, d: '나쁜 기운을 막는 범 발톱',
               fx: { 3: ['eliteDmg25', '정예·우두머리에게 피해 +25%'], 4: ['crit10', '치명타 확률 +10%'], 5: ['killHeal', '적 50마리마다 체력 10% 회복'] } },
  a_samjak:  { slot: 'acc', n: '삼작노리개', atk: 6, hp: 40, d: '세 갈래 술이 달린 노리개',
               fx: { 3: ['startGold60', '시작 엽전 +60'], 4: ['coin30', '엽전 줍는 양 +30%'], 5: ['compDmg30', '동료 피해 +30%'] } }
};
/* 레벨당 능력치 +8% */
I.statOf = function (it) {
  const B = I.ITEMS[it.id], Gd = I.GRADES[it.grade || 0], lvk = 1 + 0.08 * ((it.lv || 1) - 1);
  return { atk: (B.atk || 0) * Gd.mul * lvk, hp: (B.hp || 0) * Gd.mul * lvk, speed: B.speed || 0 };
};
I.fxOf = function (it) {
  const B = I.ITEMS[it.id], out = [];
  for (const g of [3, 4, 5]) if ((it.grade || 0) >= g && B.fx[g]) out.push(B.fx[g][0]);
  return out;
};
/* 장착 목록 [{id, grade, lv}] -> 전투에 넘길 합계 */
I.sum = function (eq) {
  const s = { atk: 0, hp: 0, speed: 0, fx: {}, weapon: 'bow' };
  for (const it of eq || []) {
    if (!it || !I.ITEMS[it.id]) continue;
    const st = I.statOf(it); s.atk += st.atk; s.hp += st.hp; s.speed += st.speed;
    for (const f of I.fxOf(it)) s.fx[f] = (s.fx[f] || 0) + 1;
    if (I.ITEMS[it.id].weapon) s.weapon = I.ITEMS[it.id].weapon;
  }
  return s;
};
/* 전투력: 로비 표시용 */
I.power = function (eq, heroLv) { const s = I.sum(eq); return Math.round((100 + s.atk) * 6 + (500 + s.hp) * 1.2 + (heroLv || 1) * 40); };
/* 합성: 같은 id, 같은 등급 3개 -> 등급 +1 (신화 제외) */
I.canMerge = (a, b, c) => a.id === b.id && b.id === c.id && a.grade === b.grade && b.grade === c.grade && a.grade < 5;
/* 레벨업 비용(도면, 엽전), 분해 보상 */
I.upCost = it => ({ scroll: 2 + Math.floor((it.lv || 1) / 3) * (1 + (it.grade || 0)), gold: 200 + (it.lv || 1) * 120 * (1 + (it.grade || 0)) });
I.salvage = it => ({ scroll: 3 * Math.pow(3, it.grade || 0) + (it.lv || 1), gold: 100 * (1 + (it.grade || 0)) });
/* 뽑기 확률(상점 확률 안내에 그대로 쓴다) */
I.GACHA = [{ grade: 0, p: 0.52 }, { grade: 1, p: 0.30 }, { grade: 2, p: 0.13 }, { grade: 3, p: 0.04 }, { grade: 4, p: 0.0095 }, { grade: 5, p: 0.0005 }];
I.PITY = 50; /* 50번 안에 전설 이상 한 번 보장 */
I.roll = function (count) {
  const ids = Object.keys(I.ITEMS), out = [];
  for (let i = 0; i < count; i++) { let r = Math.random(), g = 0; for (const q of I.GACHA) { if (r < q.p) { g = q.grade; break; } r -= q.p; } out.push({ id: ids[(Math.random() * ids.length) | 0], grade: g, lv: 1 }); }
  return out;
};

/* 전투 중 줍는 물건 (정예·우두머리가 떨어뜨리는 보급 보따리) */
I.PICKUPS = {
  magnet: { n: '자석 부적', d: '떨어진 옥구슬을 모두 끌어온다', c: '120,255,210' },
  bomb:   { n: '벼락 폭탄', d: '화면 안 적 모두에게 큰 피해', c: '255,200,90' },
  yakgwa: { n: '약과', d: '체력 30% 회복', c: '255,150,90' },
  pouch:  { n: '엽전 꾸러미', d: '엽전 +30', c: '255,220,90' }
};
})();
