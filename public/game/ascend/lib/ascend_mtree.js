/* ASCEND v3.93 — frame skill tree (replaces the old infantry/vehicle/air/command tree in the "기술 트리" screen)
   Points: 1 per pilot level (Lv 60 = 60 points). Four branches, each 3 nodes x 3 ranks + 1 core node (needs 6 points in its branch).
   Total 40 ranks, so a pilot chooses a style; reset is free. Old tree points are not used any more (its screen is replaced).
   Effects work on my frame in every mode (story, faction battle, 5v5, boss, field). Save: P.mtree = {id: rank}. */
(function () {
  'use strict';
  var L2 = function (ko, en) { try { return (typeof LANG !== 'undefined' && LANG === 'en') ? en : ko; } catch (e) { return ko; } };
  var BR = [
    { id: 'mel', n: ['근접', 'Melee'], c: '#ff7ae0', sub: ['빔세이버 · 비기', 'Saber · arts'] },
    { id: 'rng', n: ['사격', 'Firepower'], c: '#7df9ff', sub: ['레이저 · 미사일', 'Laser · missiles'] },
    { id: 'mob', n: ['기동', 'Mobility'], c: '#ffd166', sub: ['이동 · 대시 · 궁극', 'Move · dash · ultimates'] },
    { id: 'sur', n: ['생존', 'Survival'], c: '#7dffb0', sub: ['장갑 · 수리', 'Armor · repair'] }
  ];
  var N = [
    { id: 'm1', br: 0, max: 3, n: ['예리한 날', 'Keen Edge'], d: ['근접 피해 +8% (단계당)', 'Melee damage +8% per rank'] },
    { id: 'm2', br: 0, max: 3, n: ['비기 숙련', 'Art Mastery'], d: ['비기(Z) 재사용 대기 10% 빨리 (단계당)', 'Weapon art (Z) cooldown 10% faster per rank'] },
    { id: 'm3', br: 0, max: 3, n: ['흡수 칼날', 'Drain Blade'], d: ['근접 피해의 3%만큼 체력 회복 (단계당)', 'Heal 3% of melee damage per rank'] },
    { id: 'm4', br: 0, max: 1, core: 1, n: ['칼날 폭풍', 'Blade Storm'], d: ['비기를 쓴 뒤 4초간 근접 피해 +35%', 'Melee damage +35% for 4 s after a weapon art'] },
    { id: 'r1', br: 1, max: 3, n: ['집속 렌즈', 'Focus Lens'], d: ['사격(레이저·미사일) 피해 +8% (단계당)', 'Ranged damage +8% per rank'] },
    { id: 'r2', br: 1, max: 3, n: ['속사 회로', 'Rapid Circuit'], d: ['Q 재사용 대기 10% 빨리 (단계당)', 'Q cooldown 10% faster per rank'] },
    { id: 'r3', br: 1, max: 3, n: ['원거리 조준', 'Long Sight'], d: ['600 이상 떨어진 적에게 피해 +10% (단계당)', '+10% damage to targets beyond 600 per rank'] },
    { id: 'r4', br: 1, max: 1, core: 1, n: ['과충전', 'Overcharge'], d: ['사격이 20% 확률로 2배 피해', 'Ranged hits have a 20% chance to deal double damage'] },
    { id: 'v1', br: 2, max: 3, n: ['추진기 강화', 'Thrusters'], d: ['이동 속도 +5% (단계당)', 'Move speed +5% per rank'] },
    { id: 'v2', br: 2, max: 3, n: ['빠른 재정비', 'Quick Refit'], d: ['E 재사용 대기 10% 빨리 (단계당)', 'E cooldown 10% faster per rank'] },
    { id: 'v3', br: 2, max: 3, n: ['회피 기동', 'Evasive'], d: ['대시 중 받는 피해 -20% (단계당)', 'Damage taken while dashing -20% per rank'] },
    { id: 'v4', br: 2, max: 1, core: 1, n: ['궁극 가속', 'Overdrive'], d: ['궁극기(R)·절대기술(T) 재사용 대기 -25%', 'Ultimate (R) and absolute tech (T) cooldowns -25%'] },
    { id: 's1', br: 3, max: 3, n: ['강화 장갑', 'Heavy Plating'], d: ['최대 체력 +6% (단계당)', 'Max health +6% per rank'] },
    { id: 's2', br: 3, max: 3, n: ['반응 장갑', 'Reactive Armor'], d: ['받는 피해 -4% (단계당)', 'Damage taken -4% per rank'] },
    { id: 's3', br: 3, max: 3, n: ['자동 수리', 'Auto Repair'], d: ['4초간 피해가 없으면 초당 최대 체력의 1% 회복 (단계당)', 'Out of combat for 4 s: heal 1% max health per second per rank'] },
    { id: 's4', br: 3, max: 1, core: 1, n: ['최후의 방벽', 'Last Bastion'], d: ['체력 25% 아래로 떨어지면 5초간 받는 피해 -50% (60초마다 1번)', 'Below 25% health: damage taken -50% for 5 s (once per 60 s)'] }
  ];
  var CORE_NEED = 6;
  var tx2 = function (a) { return L2(a[0], a[1]); };
  var T = function () { try { if (!P.mtree) P.mtree = {}; return P.mtree; } catch (e) { return {}; } };
  var rk = function (id) { return T()[id] || 0; };
  var lv = function () { try { return typeof plv === 'function' ? plv() : 1; } catch (e) { return 1; } };
  var spent = function () { var s = 0, t = T(); for (var k in t) s += t[k]; return s; };
  var inBranch = function (b) { var s = 0; N.forEach(function (n) { if (n.br === b && !n.core) s += rk(n.id); }); return s; };
  var free = function () { return Math.max(0, lv() - spent()); };
  var save = function () { try { saveP(); } catch (e) {} };
  // ---------------------------------------------------------------- the screen
  var css = '#tree.mt .grid.tree{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px}#tree.mt .br{display:flex;flex-direction:column;gap:7px}' +
    '#tree.mt .br>.bh{padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.05);border-left:3px solid var(--c)}#tree.mt .br>.bh b{color:var(--c);font-size:15px}#tree.mt .br>.bh small{display:block;opacity:.7;font-size:11px}' +
    '#tree.mt .node{text-align:left;white-space:normal;line-height:1.3;border:1px solid rgba(255,255,255,.14)}#tree.mt .node.core{border-color:var(--c);box-shadow:0 0 10px rgba(255,255,255,.08) inset}#tree.mt .node .pips{float:right;letter-spacing:2px;color:var(--c)}' +
    '#tree.mt .node.got{background:rgba(255,255,255,.06)}#tree.mt .node.full{border-color:var(--c)}#tree.mt .node.no{opacity:.55}@media (max-width:700px){#tree.mt .grid.tree{grid-template-columns:repeat(2,1fr)}}';
  var styled = false;
  var openTree2 = function () {
    try {
      if (!styled) { styled = true; var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }
      show('#tree'); var tr = document.getElementById('tree'); tr.classList.add('mt');
      var fp = free();
      document.getElementById('trHead').innerHTML = '<b>' + L2('기체 기술 트리', 'Frame skill tree') + '</b> · ' + L2('사용 가능 포인트 ', 'Points ') + '<b class="green">' + fp + '</b> / ' + lv() + ' <span class="small">(' + L2('파일럿 레벨마다 1점 · 핵심 기술은 같은 갈래 6점 이상', '1 per pilot level · core skills need 6 points in the branch') + ')</span>';
      var body = document.getElementById('trBody'); body.innerHTML = '';
      BR.forEach(function (b, bi) {
        var col = document.createElement('div'); col.className = 'br'; col.style.setProperty('--c', b.c);
        col.innerHTML = '<div class="bh"><b>' + tx2(b.n) + '</b><small>' + tx2(b.sub) + ' · ' + inBranch(bi) + L2('점', ' pts') + '</small></div>';
        N.filter(function (n) { return n.br === bi; }).forEach(function (n) {
          var cur = rk(n.id), reqOk = !n.core || inBranch(bi) >= CORE_NEED, can = fp > 0 && cur < n.max && reqOk;
          var btn = document.createElement('button'); btn.className = 'node' + (n.core ? ' core' : '') + (cur >= n.max ? ' full' : cur > 0 ? ' got' : '') + (!can && cur === 0 ? ' no' : '');
          var pips = ''; for (var i = 0; i < n.max; i++) pips += i < cur ? '●' : '○';
          btn.innerHTML = '<b>' + (n.core ? '★ ' : '') + tx2(n.n) + '</b><span class="pips">' + pips + '</span><div class="small">' + tx2(n.d) + '</div>' + (!reqOk ? '<div class="small red">' + L2('같은 갈래 ' + CORE_NEED + '점 필요', CORE_NEED + ' points in this branch needed') + '</div>' : '');
          btn.onclick = function () { if (!can) { try { toast(cur >= n.max ? L2('최대 단계', 'Maxed') : fp <= 0 ? L2('포인트가 부족합니다', 'No points left') : L2('같은 갈래 포인트가 더 필요합니다', 'Needs more points in this branch')); } catch (e) {} return; }
            T()[n.id] = cur + 1; save(); try { SFX.init(); SFX.tone(660, .12, 'triangle', .06); } catch (e) {} applyNow(); openTree2(); };
          col.appendChild(btn);
        });
        body.appendChild(col);
      });
      var rs = document.getElementById('trReset'); try { var nt = rs && rs.nextElementSibling; if (nt) nt.textContent = L2('파일럿 레벨이 오를 때마다 1포인트. 모든 걸 다 배울 수는 없으니 갈래를 골라 내 기체의 전투 방식을 만드세요. 초기화는 무료이며 바로 적용됩니다.', 'One point per pilot level. You cannot learn everything - pick branches to shape how your frame fights. Reset is free and applies at once.'); } catch (e) {}
      if (rs) rs.onclick = function () { if (!confirm(L2('기체 기술 포인트를 모두 돌려받을까요?', 'Refund all frame skill points?'))) return; P.mtree = {}; save(); applyNow(); openTree2(); };
    } catch (e) { window.__mtErr = String(e).slice(0, 160); }
  };
  // ---------------------------------------------------------------- effects on my frame
  var me = function () { try { return (typeof G !== 'undefined' && G && G.local) ? G.local.unit : null; } catch (e) { return null; } };
  var applied = null;
  var applyNow = function () {   // max health and move speed are set on the frame itself; re-applied when the frame changes or the tree changes
    var u = me(); if (!u || u.dead || u.cls !== 'arkframe') return; var key = rk('s1') + ':' + rk('v1');
    if (applied && applied.u === u && applied.key === key) return;
    if (applied && applied.u === u) { u.mhp /= applied.hp; u.hp = Math.min(u.mhp, u.hp / applied.hp); if (u.st) u.st.spd /= applied.sp; }
    var hp = 1 + .06 * rk('s1'), sp = 1 + .05 * rk('v1'); u.mhp *= hp; u.hp *= hp; if (u.st) u.st.spd *= sp; applied = { u: u, key: key, hp: hp, sp: sp };
  };
  var S = { storm: 0, last: 0, hurtAt: 0, bastion: -99, bastionUntil: 0, art: 0 };
  var mine = function (src, u) { if (!src || !u) return false; return src === G.local || src === u || src.unit === u || (src.ownerSlot && src.ownerSlot === G.local); };
  var hook = function () {
    if (window.__hkMtree || typeof hurt !== 'function') return; window.__hkMtree = 1; var hu = hurt;
    hurt = function (v, amt, src, ang, dt) {
      var u = me(), dealt = 0, isMel = false;
      try {
        if (u && v && amt > 0 && u.cls === 'arkframe') {
          if (v !== u && v.team !== u.team && mine(src, u)) {
            isMel = dt === 'm' || u.slashT > 0 || !!u.lunge || !!(u.melSw2 && u.melSw2.t < (u.melSw2.T || .3) + .1);
            if (isMel) amt *= (1 + .08 * rk('m1')) * (rk('m4') && G.t < S.storm ? 1.35 : 1);
            else { amt *= 1 + .08 * rk('r1'); if (rk('r3') && Math.hypot(v.x - u.x, v.y - u.y) > 600) amt *= 1 + .1 * rk('r3'); if (rk('r4') && Math.random() < .2) amt *= 2; }
          } else if (v === u) {
            amt *= 1 - .04 * rk('s2'); if (rk('v3') && u.dashT > 0) amt *= 1 - .2 * rk('v3');
            if (rk('s4') && G.t < S.bastionUntil) amt *= .5; S.hurtAt = G.t;
          }
        }
      } catch (e) {}
      var hp0 = v && v.hp, r = hu(v, amt, src, ang, dt);
      try {
        if (u && v && v !== u && isMel && rk('m3') && hp0 > v.hp) { dealt = hp0 - Math.max(0, v.hp); u.hp = Math.min(u.mhp, u.hp + dealt * .03 * rk('m3')); }
        if (u && v === u && rk('s4') && !u.dead && u.hp < u.mhp * .25 && G.t - S.bastion > 60) { S.bastion = G.t; S.bastionUntil = G.t + 5; try { pop(L2('최후의 방벽!', 'LAST BASTION!'), '#7dffb0', false); } catch (e) {} }
      } catch (e) {}
      return r;
    };
  };
  var tick = function () {
    try {
      hook(); var u = me(); window.__mtCd = rk('v4') ? .75 : 1; if (!u || u.dead || typeof G === 'undefined' || !G || G.over) { S.last = 0; return; }
      applyNow(); var t = G.t, dt = S.last ? Math.max(0, Math.min(.5, t - S.last)) : 0; S.last = t; if (!dt) return;
      if (rk('r2') && u.cd1 > 0) u.cd1 = Math.max(0, u.cd1 - dt * .1 * rk('r2'));
      if (rk('v2') && u.cd2 > 0) u.cd2 = Math.max(0, u.cd2 - dt * .1 * rk('v2'));
      if (rk('m2') && u.artCd > t) u.artCd -= dt * .1 * rk('m2');
      if ((u.artCd || 0) > S.art + .5) S.storm = t + 4; S.art = u.artCd || 0;
      if (rk('s3') && t - S.hurtAt > 4 && u.hp < u.mhp) u.hp = Math.min(u.mhp, u.hp + u.mhp * .01 * rk('s3') * dt);
    } catch (e) { window.__mtErr = String(e).slice(0, 160); }
  };
  setInterval(tick, 100);
  // the "기술 트리" screen (menu, pause, deploy) opens the frame tree
  var swap = function () { try { if (typeof openTree === 'function' && openTree !== openTree2) { window.openTree = openTree2; try { openTree = openTree2; } catch (e) {} } } catch (e) {} };
  setInterval(swap, 1000); swap();
  window.__mtree = { nodes: N, free: free, open: openTree2 };
})();
