/* ASCEND v3.54 — Orbital Front 2.0: lane-battle rules modelled on the classic 5v5 MOBA map
   · fortress turrets: HP bar on top, 0.83 s shots, minions first, instantly switch to an enemy frame that hits an allied frame in range,
     damage ramps on consecutive hits to the same frame (a frame cannot win 1v1 under a turret); frames deal 35% to a turret with no own minions near it
   · the core (base HQ): a beam plus a rocket mortar
   · minion squads: infantry + an assault walker every wave + a gunship every 3rd wave (siege)
   · gold: last hit only (infantry 20, ranged 15, walker 45, gunship 60), frame kill 300 + assists 120, camps, turrets; +1.6 G/s
   · jungle: every camp respawns one level higher; clearing a camp gives its buff (red: damage, blue: cooldown/energy, swift: speed)
   · shop (P or the HUD button, at your base or while dead): six items and two squad upgrades (attack / armour of your team's minions)
   // auto battle in the arena plays the lane you picked (it used to wander to a corner with the generic hunt logic)
  // (other modules install their own auto wrapper later, so ours is re-attached on top whenever it is replaced)
  setInterval(function () { var cur = window.__autoWrap; if (cur && cur.__ar2) return; var prev = cur; var w = function (orig, u) { try { if (on() && G.local && u === G.local.unit && G.local.aRole && window.__AR && window.__AR.hero) { var inp = window.__AR.hero(u); if (inp) return inp; } } catch (e) {} return prev ? prev(orig, u) : orig(u); }; w.__ar2 = 1; window.__autoWrap = w; }, 1000);
  window.__ar2 = {stat()} */
(function () {
  'use strict';
  var on = function () { try { return typeof G !== 'undefined' && G && G.arena && !G.over; } catch (e) { return false; } };
  var L2 = function (k, e) { try { return L(k, e); } catch (x) { return k; } };
  var D2 = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  var TW = { range: 560, rate: .83, hero: .085, ramp: .4, rampMax: 2.2, aggro: 2.5 };
  var CORE = { range: 640, rate: .83, rkt: 2.6, rktR: 170 };
  var GOLD = { inf: 20, rng: 15, heavy: 45, air: 60, hero: 300, assist: 120, camp: 70, epic: 300, turret: 250, start: 500, perSec: 1.6 };
  var ITEMS = [
    { id: 'blade', n: L2('광자 블레이드', 'Photon Blade'), d: L2('공격력 +14%', 'Damage +14%'), c: 450, dmg: .14 },
    { id: 'plate', n: L2('중장갑 판', 'Heavy Plating'), d: L2('받는 피해 -15%', 'Damage taken -15%'), c: 450, arm: .15 },
    { id: 'boost', n: L2('추진 부스터', 'Thruster Boost'), d: L2('이동 속도 +9%', 'Move speed +9%'), c: 350, spd: .09 },
    { id: 'core', n: L2('과충전 코어', 'Overcharged Core'), d: L2('재사용 대기 -15%', 'Cooldowns -15%'), c: 500, cdr: .15 },
    { id: 'leech', n: L2('흡혈 나노봇', 'Leech Nanobots'), d: L2('준 피해의 8% 회복', 'Heal 8% of damage dealt'), c: 600, ls: .08 },
    { id: 'siege', n: L2('요새 파쇄기', 'Fortress Breaker'), d: L2('포탑·핵 피해 +40%', 'Turret / core damage +40%'), c: 650, tw: .4 }
  ];
  var SQ = { max: 5, cost: function (lv) { return 300 + lv * 150; } };
  var BUFF = {
    red: { n: L2('적색 버프', 'Red buff'), c: '#ff7a5a', d: L2('공격력 +15%', 'Damage +15%'), t: 90 },
    blue: { n: L2('청색 버프', 'Blue buff'), c: '#6ab8ff', d: L2('재사용 -20% · 에너지 회복', 'Cooldowns -20% · energy'), t: 90 },
    swift: { n: L2('신속 버프', 'Swift buff'), c: '#7dffb0', d: L2('이동 속도 +15%', 'Move speed +15%'), t: 60 }
  };
  var CAMPBUFF = ['red', 'blue', 'blue', 'red', 'swift', null];
  var ST = { shots: 0, aggro: 0, rockets: 0, gold: 0, buys: 0 };

  var heroes = function () { return G.slots.filter(function (s) { return s.aRole; }); };
  var mySlot = function () { return G.local; };
  var gold = function (s, n, x, y) { if (!s || !s.aRole || !n) return; s.gold = (s.gold || 0) + n; ST.gold += n; if (s === mySlot() && x != null) { try { G.texts.push({ h: 70, x: x + (Math.random() * 20 - 10), y: y - 20, txt: '+' + Math.round(n) + 'G', c: '#ffd166', sz: n >= 100 ? 20 : 15, l: 1, L: 1 }); } catch (e) {} } };
  var items = function (s) { return (s && s.aItems) || []; };
  var sum = function (s, k) { var v = 0; items(s).forEach(function (id) { var it = ITEMS.filter(function (x) { return x.id === id; })[0]; if (it && it[k]) v += it[k]; }); return v; };
  var buffOn = function (u, k) { return u && u.aBuff && u.aBuff[k] > G.t; };
  var A = function () { return G.arena; };

  // ---------------------------------------------------------------- HP bars on fortresses / cores
  var bars = new Map(), barMat = {};
  var bar = function (s) {
    var T3 = window.THREE; if (!T3 || !R3 || !R3.sobj) return null; var b = bars.get(s); if (b) return b;
    var o = R3.sobj.filter(function (x) { return x.s === s; })[0]; if (!o) return null;
    var mk = function (col, op) { var k = col + op; return barMat[k] || (barMat[k] = new T3.SpriteMaterial({ color: col, transparent: true, opacity: op, depthTest: false, depthWrite: false })); };
    var W = s.kind === 'core' ? 150 : 110, Hh = s.kind === 'core' ? 12 : 9, y = s.kind === 'core' ? 270 : 165;
    var bg = new T3.Sprite(mk(0x05080e, .75)); bg.center.set(0, .5); bg.scale.set(W + 6, Hh + 6, 1); bg.position.set(-W / 2 - 3, y, 0); bg.renderOrder = 20;
    var fg = new T3.Sprite(mk(new T3.Color(relTeamC(s.team)).getHex(), .95)); fg.center.set(0, .5); fg.scale.set(W, Hh, 1); fg.position.set(-W / 2, y, 0); fg.renderOrder = 21;
    [bg, fg].forEach(function (q) { q.userData.keep = 1; o.gp.add(q); });
    b = { bg: bg, fg: fg, W: W, H: Hh, last: -1 }; bars.set(s, b); return b;
  };
  var barTick = function () {
    for (var i = 0; i < G.structs.length; i++) { var s = G.structs[i]; if (!s || !s.ar) continue; var b = bar(s); if (!b) continue;
      if (s.dead) { b.bg.visible = b.fg.visible = false; continue; }
      var k = Math.max(0, s.hp / s.mhp); if (Math.abs(k - b.last) > .002) { b.last = k; b.fg.scale.x = Math.max(.001, b.W * k); } }
  };

  // ---------------------------------------------------------------- turret / core targeting and fire
  var src = function (team) { try { return A().owner[team].slot; } catch (e) { return null; } };
  var inR = function (s, u, r) { return u && !u.dead && D2(s.x, s.y, u.x, u.y) < (r + (u.r || 14)) * (r + (u.r || 14)); };
  var pick = function (s, r) {
    if (s.aggro && (!inR(s, s.aggro, r) || G.t > s.aggroT)) s.aggro = null;
    if (s.aggro) return s.aggro;
    if (s.tg && inR(s, s.tg, r) && s.tg.team !== s.team) return s.tg;
    var best = null, bd = 1e12, hero = null, hd = 1e12;
    for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; if (u.dead || u.team === s.team || u.team === 2 || !inR(s, u, r)) continue; var d = D2(s.x, s.y, u.x, u.y);
      if (u.aMinion) { if (d < bd) { bd = d; best = u; } } else if (d < hd) { hd = d; hero = u; } }
    return best || hero;
  };
  var dmgTo = function (s, u, mul) {
    if (u.aMinion) { var k = u.aKind === 'heavy' ? .22 : u.aKind === 'air' ? .25 : .45; return u.mhp * k * mul; }
    if (u.cls === 'arkframe') { s.chain = (s.lastHero === u) ? (s.chain || 0) + 1 : 0; s.lastHero = u; return u.mhp * TW.hero * Math.min(TW.rampMax, 1 + TW.ramp * s.chain) * mul; }
    return (u.mhp || 300) * .2 * mul;
  };
  var fire = function (s, u, mul) {
    var sl = src(s.team); var a = Math.atan2(u.y - s.y, u.x - s.x);
    try { if (typeof towerBeam === 'function') towerBeam(s, u); } catch (e) {}
    try { hurt(u, dmgTo(s, u, mul), sl, a, 'x'); } catch (e) {}
    ST.shots++;
  };
  var rockets = [];
  var coreRocket = function (s, u) {
    var tx = u.x + (u.vx || 0) * .5, ty = u.y + (u.vy || 0) * .5; rockets.push({ x0: s.x, y0: s.y, x1: tx, y1: ty, t: 0, T: .8, team: s.team });
    try { G.parts.push({ x: tx, y: ty, vx: 0, vy: 0, l: .8, ml: .8, c: 'ring', s: CORE.rktR * 2 }); } catch (e) {} ST.rockets++;
  };
  var rocketTick = function (dt) {
    for (var i = rockets.length - 1; i >= 0; i--) { var r = rockets[i]; r.t += dt; var k = Math.min(1, r.t / r.T);
      var x = r.x0 + (r.x1 - r.x0) * k, y = r.y0 + (r.y1 - r.y0) * k, h = 200 + Math.sin(k * Math.PI) * 260 - k * 190;
      try { part(x, y, 0, 0, .4, '#ffb347', 7, h); part(x, y, 0, 0, .7, '#8a8f99', 5, h + 6); } catch (e) {}
      if (k >= 1) { rockets.splice(i, 1); var sl = src(r.team);
        for (var j = 0; j < G.units.length; j++) { var u = G.units[j]; if (u.dead || u.team === r.team || u.team === 2) continue; if (D2(u.x, u.y, r.x1, r.y1) < CORE.rktR * CORE.rktR) { try { hurt(u, u.aMinion ? u.mhp * .6 : u.mhp * .12, sl, 0, 'x'); } catch (e) {} } }
        try { fx(0, r.x1, r.y1, 90); } catch (e) {} for (var q = 0; q < 14; q++) { var b = Math.random() * 6.28; try { part(r.x1, r.y1, Math.cos(b) * (120 + Math.random() * 260), Math.sin(b) * (120 + Math.random() * 260), .5, q % 2 ? '#ff8a3c' : '#ffe2a0', 8, 20); } catch (e) {} } } }
  };
  var structTick = function (s, dt) {
    if (s.dead) return; var core = s.kind === 'core'; var r = core ? CORE.range : TW.range;
    var u = pick(s, r); s.tg = u; s.ft = (s.ft || 0) - dt; if (core) s.rk = (s.rk || 0) - dt;
    if (!u) { s.chain = 0; return; }
    var want = Math.atan2(u.y - s.y, u.x - s.x); s.a = want;
    if (s.ft <= 0) { s.ft = core ? CORE.rate : TW.rate; fire(s, u, core ? 1.25 : 1); }
    if (core && s.rk <= 0) { var hero = null; for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (!e.dead && e.team !== s.team && e.team !== 2 && e.cls === 'arkframe' && inR(s, e, r)) { hero = e; break; } } coreRocket(s, hero || u); s.rk = CORE.rkt; }
  };
  // the original routine keeps handling every non-arena structure; arena structures are driven here
  var _us = updateStructs;
  updateStructs = function (dt) {
    if (!on()) return _us(dt);
    var keep = [];
    for (var i = 0; i < G.structs.length; i++) { var s = G.structs[i]; if (s && s.ar) { keep.push([s, s.jam || 0]); s.jam = 1e6; } }
    _us(dt);
    for (var j = 0; j < keep.length; j++) { var s2 = keep[j][0]; s2.jam = Math.max(0, keep[j][1] - dt); if (s2.jam <= 0) { try { structTick(s2, dt); } catch (e) {} } }
  };

  // ---------------------------------------------------------------- damage rules (aggro, items, buffs, squads, turret resistance)
  var _hu = hurt;
  hurt = function (u, amt, s, ang, dt) {
    try { if (on() && u && s) {
      var a = s.unit; var Ar = A();
      if (a && a.cls === 'arkframe' && s.aRole) {
        amt *= 1 + sum(s, 'dmg') + (buffOn(a, 'red') ? .15 : 0);
        if (u.cls === 'arkframe' && u.team !== a.team && u.team !== 2) {
          // calling for help: every allied turret / core with the attacker in range turns on him at once
          for (var i = 0; i < G.structs.length; i++) { var st = G.structs[i]; if (st && st.ar && !st.dead && st.team === u.team && inR(st, a, st.kind === 'core' ? CORE.range : TW.range)) { if (st.aggro !== a) ST.aggro++; st.aggro = a; st.aggroT = G.t + TW.aggro; st.ft = Math.min(st.ft || 0, .12); } }
        }
        var ls = sum(s, 'ls'); if (ls > 0 && u.team !== a.team) a.hp = Math.min(a.mhp, a.hp + amt * ls);
      }
      if (u.cls === 'arkframe' && u.slot && u.slot.aRole) amt *= 1 - Math.min(.5, sum(u.slot, 'arm'));
      // squad upgrades
      if (Ar && Ar.owner) { for (var t = 0; t < 2; t++) { if (s === Ar.owner[t].slot) amt *= 1 + .1 * ((Ar.sqA || [0, 0])[t]); } if (u.aMinion) amt *= 1 - .08 * ((Ar.sqD || [0, 0])[u.team] || 0); }
    } } catch (e) {}
    return _hu(u, amt, s, ang, dt);
  };
  var _hs = hurtStruct;
  hurtStruct = function (s, amt, sl) {
    try { if (on() && s && s.ar && sl && sl.aRole) {
      var near = false; for (var i = 0; i < G.units.length; i++) { var m = G.units[i]; if (!m.dead && m.aMinion && m.team === sl.team && D2(m.x, m.y, s.x, s.y) < 700 * 700) { near = true; break; } }
      amt *= (near ? 1 : .35) * (1 + sum(sl, 'tw'));
      if (s.hp - amt <= 0 && !s.dead) { G.slots.forEach(function (h) { if (h.aRole && h.team === sl.team) gold(h, GOLD.turret, h === mySlot() && h.unit ? h.unit.x : null, h.unit ? h.unit.y : 0); }); }
    } } catch (e) {}
    return _hs(s, amt, sl);
  };

  // ---------------------------------------------------------------- squads (bigger units), camp levels, buffs, gold, cooldowns
  var lastWave = 0;
  var squadTick = function () {
    var Ar = A(); if (Ar.wave === lastWave) return; lastWave = Ar.wave;
    var AW = window.__AR || {}; if (!AW.LANES) return; for (var t = 0; t < 2; t++) for (var ln in AW.LANES) { var pth = AW.LANES[ln].map(function (p) { return AW.mirX(p, t); }); var p0 = pth[0];
      var add = ['walker']; if (Ar.wave % 3 === 0) add.push('gunship');
      add.forEach(function (cls, i) { try { var m = spawnMinion(Ar.owner[t], CL[cls] ? cls : 'walker', p0[0] - (t ? -1 : 1) * (150 + i * 70), p0[1] + (Math.random() * 60 - 30), 400, 0); m.aMinion = 1; m.aLane = ln; m.aPath = pth; m.aW = 1; m.aKind = cls === 'gunship' ? 'air' : 'heavy'; m.mhp = Math.round(m.mhp * (1.1 + Ar.wave * .05)); m.hp = m.mhp; } catch (e) {} }); }
  };
  var tagTick = function () { for (var i = 0; i < G.units.length; i++) { var u = G.units[i]; if (u.aMinion && !u.aKind) u.aKind = (u.cls === 'rocket' || u.cls === 'sentry') ? 'rng' : 'inf'; } };
  var campTick = function () {
    A().camps.forEach(function (c, ci) {
      if (c.units !== c._seen && c.units.length) { c._seen = c.units; c.lv = (c.lv || 0) + 1; c.paid = 0; var k = 1 + .18 * (c.lv - 1);
        c.units.forEach(function (m) { m.mhp = Math.round(m.mhp * k); m.hp = m.mhp; m.aCampLv = c.lv; try { if (m.w) { var w = Object.assign({}, m.w); w.dmg = (w.dmg || 10) * k; m.w = w; } } catch (e) {} });
        if (c.lv > 1 && G.t > 30) { try { pop(L2('중립 몹 Lv ', 'Camp Lv ') + c.lv, '#cfe0f2', false); } catch (e) {} } }
      if (c.units.length && !c.paid && c.units.every(function (m) { return m.dead; })) { c.paid = 1; var ks = c.lastKs;
        if (ks && ks.aRole) { var g = Math.round((c.epic ? GOLD.epic : GOLD.camp) * (1 + .1 * ((c.lv || 1) - 1)));
          if (c.epic) G.slots.forEach(function (h) { if (h.aRole && h.team === ks.team) gold(h, g, h === mySlot() ? c.x : null, c.y); }); else gold(ks, g, c.x, c.y);
          var bk = CAMPBUFF[ci]; if (bk && ks.unit && !ks.unit.dead) { var u = ks.unit; u.aBuff = u.aBuff || {}; u.aBuff[bk] = G.t + BUFF[bk].t; if (ks === mySlot()) { try { (window.arAnnounce || announce)('', BUFF[bk].n + ' · ' + BUFF[bk].d, '', false, BUFF[bk].c); } catch (e) {} } } } }
    });
  };
  var _ku = killUnit;
  killUnit = function (u, ks) {
    var was = u && u.dead; var r = _ku.apply(this, arguments);
    try { if (on() && u && !was && u.dead) {
      var k = ks ? (ks.ownerSlot || ks) : null;
      if (u.aCamp) u.aCamp.lastKs = k;
      if (u.aMinion && k && k.aRole) gold(k, GOLD[u.aKind || 'inf'] || 20, u.x, u.y);
      if (u.cls === 'arkframe' && u.slot && u.slot.aRole && k && k.aRole && k.team !== u.team) {
        gold(k, GOLD.hero, u.x, u.y);
        G.slots.forEach(function (h) { if (h !== k && h.aRole && h.team === k.team && h.unit && !h.unit.dead && D2(h.unit.x, h.unit.y, u.x, u.y) < 1100 * 1100) gold(h, GOLD.assist, h === mySlot() ? u.x : null, u.y); });
      }
    } } catch (e) {}
    return r;
  };
  var unitTick = function (dt) {
    heroes().forEach(function (s) {
      if (s.gold == null) { s.gold = GOLD.start; s.aItems = []; }
      s.gold += GOLD.perSec * dt;
      var u = s.unit; if (!u || u.dead) return;
      var cdr = sum(s, 'cdr') + (buffOn(u, 'blue') ? .2 : 0);
      if (cdr > 0) { ['cd1', 'cd2', 'cdU', 'cd3'].forEach(function (k) { if (u[k] > 0) u[k] = Math.max(0, u[k] - dt * cdr / (1 - cdr)); }); if (buffOn(u, 'blue') && u.en != null) u.en = Math.min(u.enMax || 100, u.en + dt * 8); }
      var spd = 1 + sum(s, 'spd') + (buffOn(u, 'swift') ? .15 : 0);
      if (u.st && u._arSpd !== spd) { u.st.spd = u.st.spd / (u._arSpd || 1) * spd; u._arSpd = spd; }
      if (u.aBuff && Math.random() < dt * 4) { for (var k in u.aBuff) if (u.aBuff[k] > G.t) { try { part(u.x + (Math.random() * 30 - 15), u.y + (Math.random() * 30 - 15), 0, -30, .5, BUFF[k].c, 4, 30 + Math.random() * 60); } catch (e) {} } }
      // the AI shops when it is home
      if (s !== mySlot() && atBase(s)) aiBuy(s);
    });
  };

  // ---------------------------------------------------------------- shop
  var atBase = function (s) { var u = s.unit; if (!u || u.dead) return true; var b = BASES[u.team]; return D2(u.x, u.y, b.x, b.y) < 480 * 480; };
  var buy = function (s, id) {
    var Ar = A(); if (!atBase(s)) return L2('본진에서만 살 수 있습니다', 'Buy at your base');
    if (id === 'sqA' || id === 'sqD') { Ar[id] = Ar[id] || [0, 0]; var lv = Ar[id][s.team]; if (lv >= SQ.max) return L2('최대 단계', 'Max level'); var c = SQ.cost(lv); if (s.gold < c) return L2('골드 부족', 'Not enough gold'); s.gold -= c; Ar[id][s.team]++; ST.buys++; return ''; }
    var it = ITEMS.filter(function (x) { return x.id === id; })[0]; if (!it) return '?'; if (items(s).indexOf(id) >= 0) return L2('이미 보유', 'Owned'); if (items(s).length >= 6) return L2('칸이 가득', 'Inventory full'); if (s.gold < it.c) return L2('골드 부족', 'Not enough gold');
    s.gold -= it.c; s.aItems.push(id); ST.buys++; return '';
  };
  var AIORD = { fighter: ['blade', 'plate', 'boost', 'leech', 'siege', 'core'], tank: ['plate', 'boost', 'core', 'blade', 'leech', 'siege'], assassin: ['blade', 'boost', 'leech', 'core', 'plate', 'siege'], marksman: ['blade', 'leech', 'siege', 'boost', 'core', 'plate'], mage: ['core', 'blade', 'boost', 'plate', 'leech', 'siege'], support: ['plate', 'core', 'boost', 'blade', 'leech', 'siege'] };
  var aiBuy = function (s) { if ((s._aiBuyT || 0) > G.t) return; s._aiBuyT = G.t + 3; var ord = AIORD[s.aRole] || AIORD.fighter; for (var i = 0; i < ord.length; i++) { var id = ord[i]; if (items(s).indexOf(id) >= 0) continue; if (buy(s, id) === '') return; break; } if (s.gold > 900) { buy(s, Math.random() < .5 ? 'sqA' : 'sqD'); } };
  var shopEl = null;
  var shopDraw = function () {
    var s = mySlot(); if (!shopEl || !s) return; var Ar = A(); var base = atBase(s);
    var row = function (id, n, d, c, owned, dis) { return '<button data-b="' + id + '" style="all:unset;cursor:' + (dis ? 'default' : 'pointer') + ';display:flex;gap:10px;align-items:center;padding:9px 12px;border-radius:10px;border:1px solid ' + (owned ? 'rgba(125,255,176,.6)' : 'rgba(207,224,242,.22)') + ';background:rgba(255,255,255,' + (owned ? '.08' : '.03') + ');opacity:' + (dis && !owned ? .5 : 1) + '"><b style="flex:1;font-size:14px">' + n + '<br><small style="font-weight:600;color:#9fb6cf">' + d + '</small></b><span style="font:800 14px Rajdhani,sans-serif;color:#ffd166">' + (owned ? L2('보유', 'OWNED') : c + 'G') + '</span></button>'; };
    var h = '<div style="display:flex;align-items:center;gap:10px"><b style="font-size:18px">' + L2('보급 상점', 'Supply Shop') + '</b><span style="flex:1"></span><b style="color:#ffd166;font:800 18px Rajdhani,sans-serif">' + Math.floor(s.gold) + ' G</b><button id="arShopX" style="all:unset;cursor:pointer;padding:4px 10px;border:1px solid rgba(207,224,242,.3);border-radius:8px">✕</button></div>' +
      '<div style="margin:6px 0 10px;font-size:12px;color:' + (base ? '#7dffb0' : '#ffb36b') + '">' + (base ? L2('본진에 있어 구매할 수 있습니다', 'At base: you can buy') : L2('본진으로 돌아가거나 쓰러져 있을 때 살 수 있습니다', 'Return to base (or while down) to buy')) + '</div>' +
      '<div style="font-size:12px;color:#9fb6cf;margin:4px 0">' + L2('장비 (최대 6칸)', 'Items (6 slots)') + '</div><div style="display:grid;gap:6px">' + ITEMS.map(function (it) { var own = items(s).indexOf(it.id) >= 0; return row(it.id, it.n, it.d, it.c, own, !base || own || s.gold < it.c); }).join('') + '</div>' +
      '<div style="font-size:12px;color:#9fb6cf;margin:12px 0 4px">' + L2('분대 강화 (우리 팀 미니언 전체)', 'Squad upgrades (all your team\'s minions)') + '</div><div style="display:grid;gap:6px">' +
      ['sqA', 'sqD'].map(function (k) { var lv = ((Ar[k] || [0, 0])[s.team]) || 0; return row(k, (k === 'sqA' ? L2('분대 공격력', 'Squad attack') : L2('분대 방어력', 'Squad armour')) + ' Lv ' + lv + '/' + SQ.max, k === 'sqA' ? L2('미니언 공격력 +10%씩', '+10% minion damage per level') : L2('미니언 받는 피해 -8%씩', '-8% minion damage taken per level'), lv >= SQ.max ? '-' : SQ.cost(lv), false, !base || lv >= SQ.max || s.gold < SQ.cost(lv)); }).join('') + '</div>';
    shopEl.firstChild.innerHTML = h;
    shopEl.querySelector('#arShopX').onclick = function () { shopEl.style.display = 'none'; };
    shopEl.querySelectorAll('[data-b]').forEach(function (b) { b.onclick = function () { var m = buy(s, b.dataset.b); if (m) { try { pop(m, '#ffb36b', false); } catch (e) {} } else { try { SFX.tone(880, .08, 'triangle', .05); } catch (e) {} } shopDraw(); }; });
  };
  var shopOpen = function () { if (!on()) return; if (!shopEl) { shopEl = document.createElement('div'); shopEl.id = 'arShop'; shopEl.style.cssText = 'position:fixed;right:12px;top:64px;z-index:9400;width:min(360px,92vw);max-height:78vh;overflow:auto;color:#e9eef6;font-family:"Noto Sans KR",sans-serif'; shopEl.innerHTML = '<div style="padding:14px;border-radius:14px;background:rgba(8,12,22,.92);border:1px solid rgba(207,224,242,.28);backdrop-filter:blur(8px)"></div>'; document.body.appendChild(shopEl); } shopEl.style.display = shopEl.style.display === 'block' ? 'none' : 'block'; shopDraw(); };
  window.addEventListener('keydown', function (e) { if (e.code === 'KeyP' && on() && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) { shopOpen(); } });

  // ---------------------------------------------------------------- HUD: gold, buffs, shop button
  var hud = null;
  var hudTick = function () {
    var s = mySlot(); if (!s) return;
    if (!hud) { hud = document.createElement('div'); hud.id = 'arGold'; hud.style.cssText = 'position:fixed;right:12px;top:232px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-family:"Noto Sans KR",sans-serif;pointer-events:auto';
      hud.innerHTML = '<button id="arShopB" style="all:unset;cursor:pointer;padding:6px 12px;border-radius:16px;background:rgba(8,12,22,.7);border:1px solid rgba(255,209,102,.6);color:#ffd166;font:800 13px Rajdhani,\'Noto Sans KR\',sans-serif"></button><div id="arBuffs" style="font-size:11px;text-align:right;line-height:1.5"></div>'; document.body.appendChild(hud); hud.querySelector('#arShopB').onclick = shopOpen; }
    hud.style.display = on() ? 'flex' : 'none'; if (!on()) { if (shopEl) shopEl.style.display = 'none'; return; }
    hud.querySelector('#arShopB').textContent = Math.floor(s.gold || 0) + ' G · ' + L2('상점', 'Shop') + (window.touchMode ? '' : ' [P]');
    var u = s.unit, out = []; if (u && u.aBuff) for (var k in u.aBuff) { var left = u.aBuff[k] - G.t; if (left > 0) out.push('<span style="color:' + BUFF[k].c + '">' + BUFF[k].n + ' ' + Math.ceil(left) + 's</span>'); }
    hud.querySelector('#arBuffs').innerHTML = out.join('<br>');
    if (shopEl && shopEl.style.display === 'block' && (G.t * 4 | 0) % 2 === 0) shopDraw();
  };

  // ---------------------------------------------------------------- main loop
  var hT = 0;
  var _st = step;
  step = function (dt) {
    _st(dt);
    if (!on()) { lastWave = 0; bars.forEach(function (b) { b.bg.visible = b.fg.visible = false; }); if (bars.size && !(G && G.arena)) bars.clear(); rockets.length = 0; if (hud && hud.style.display !== 'none') hudTick(); return; }
    try { squadTick(); tagTick(); campTick(); unitTick(dt); rocketTick(dt); barTick(); hT -= dt; if (hT <= 0) { hT = .25; hudTick(); } } catch (e) { (window.__ar2err = window.__ar2err || []).push(String(e && e.stack || e).slice(0, 200)); }
  };
  window.__ar2 = { stat: function () { return JSON.parse(JSON.stringify(ST)); }, shop: shopOpen, items: ITEMS };
})();
