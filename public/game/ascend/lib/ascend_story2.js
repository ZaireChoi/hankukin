/* ASCEND v4.01 — story battles that match their chapter (user 2026-11-24: "is the scenario game built for the scenario's purpose?")
   Before: every chapter battle was "N waves, then a boss" with the same "defeat the boss" banner, whatever the story said.
   Now each chapter battle gets its own objective on top of the waves:
     e0  Han River    · if you chose to save the civilians: protect the civilian convoy (stays at the river line) for 90 s, then the Hive Queen
                      · otherwise: push to the hive - destroy 3 hive nests, then the Hive Queen
     e1  Aegis        · the Zeta air legion: shoot down 30 flyers (extra flyers every wave), then the guardian
     e2  Ignis        · siege titan: survive its 60 s bombardment while it shells the line, then it comes down to fight
     e3  Niv          · the research lab is exposed: keep the lab alive (it takes damage while Zeta crowd it) until the swarm breaks
     e4  Lumen 1      · spies hide among the swarm: hunt the 4 marked infiltrators, then the Omega warrior
     e4  Lumen 2      · the leviathan swarm: endure 120 s, then the queen
     e5  Giant Gate   · break the gate itself (a fortified structure), then the warrior guarding it
     e5  final        · Omega Lord Arkos himself (was a generic Omega warrior)
   Objective line on screen, Sera/HQ radio at the key beats, failure if the protected target falls.
   Hooks: storyStep (outermost), spawnWave, window.__storyGoal (banner text). Wraps once: window.__hkStory2. */
(function () {
  'use strict';
  var g = function () { return typeof G !== 'undefined' ? G : null; };
  var EN = function () { return typeof LANG !== 'undefined' && LANG === 'en'; };
  var L2 = function (k, e) { return EN() ? e : k; };
  var say = function (who, txt) { try { COMMS.say(who, who === 'hq' ? L2('사령부', 'HQ') : L2('세라', 'Sera'), txt, { pri: 3 }); } catch (e) {} };
  var flag = function (f) { try { return !!((window.__A && window.__A.R && window.__A.R().flags) || {})[f]; } catch (e) { return false; } };
  // ------------------------------------------------------------------ which mission
  var pick = function (X) {
    if (!X || X.obj || X.quest || X.patrol) return null;
    switch (X.epi) {
      case 'e0': return flag('saveCivil') ? { k: 'protect', name: L2('민간인 수송대', 'Civilian convoy'), hp: 2400, t: 90, at: .22 } : { k: 'nests', n: 3 };
      case 'e1': return { k: 'air', n: 30 };
      case 'e2': return { k: 'barrage', t: 60 };
      case 'e3': return { k: 'protect', name: L2('연구소', 'Research lab'), hp: 3200, t: 0, at: .28 };
      case 'e4': return X.waves <= 4 ? { k: 'spies', n: 4 } : { k: 'endure', t: 120 };
      case 'e5': return X.diff >= 6 ? { k: 'final' } : { k: 'gate', hp: 26000 };
      default: return null;
    }
  };
  var goalText = function (M) {
    if (!M) return null;
    switch (M.k) {
      case 'protect': return L2(M.name + '를 지켜라', 'Protect the ' + M.name);
      case 'nests': return L2('하이브 둥지 3개를 부숴라', 'Destroy the 3 hive nests');
      case 'air': return L2('제타 비행 군단 30기 격추', 'Shoot down 30 Zeta flyers');
      case 'barrage': return L2('타이탄의 포격을 60초 버텨라', 'Survive the titan\'s barrage for 60 s');
      case 'spies': return L2('숨은 첩보체 4기를 찾아 처치', 'Hunt down the 4 hidden infiltrators');
      case 'endure': return L2('리바이어던 무리를 120초 버텨라', 'Endure the leviathan swarm for 120 s');
      case 'gate': return L2('거인의 문을 부숴라', 'Break the Giant Gate');
      case 'final': return L2('오메가 군주 아르코스를 쓰러뜨려라', 'Defeat Omega Lord Arkos');
    }
    return null;
  };
  window.__storyGoal = function (X) { try { if (!X) return null; if (X._m === undefined) X._m = pick(X); return goalText(X._m); } catch (e) { return null; } };
  // ------------------------------------------------------------------ on-screen objective line
  var el = null;
  var line = function (txt) {
    if (!el) { el = document.createElement('div'); el.id = 'stObj'; el.style.cssText = 'position:fixed;left:50%;top:118px;transform:translateX(-50%);z-index:58;pointer-events:none;padding:4px 14px;border-radius:14px;background:rgba(6,10,18,.55);border:1px solid rgba(255,209,102,.45);color:#ffe6a6;font:700 13px "Noto Sans KR",sans-serif;white-space:nowrap;text-shadow:0 1px 2px #000'; document.body.appendChild(el); }
    if (txt == null) { el.style.display = 'none'; return; } el.style.display = ''; if (el.textContent !== txt) el.textContent = txt;
  };
  var bar = function (p) { var n = Math.round(Math.max(0, Math.min(1, p)) * 10); return '■■■■■■■■■■'.slice(0, n) + '□□□□□□□□□□'.slice(0, 10 - n); };
  // ------------------------------------------------------------------ helpers
  var enemyAt = function (x, y, r) { var G0 = g(), n = 0, me = G0.local.team; for (var i = 0; i < G0.units.length; i++) { var u = G0.units[i]; if (u.dead || u.team === me || u.team === 2) continue; var dx = u.x - x, dy = u.y - y; if (dx * dx + dy * dy < r * r) n++; } return n; };
  var mkFoe = function (cls, x, y, name, hpMul) { var u = invSpawn(cls, x, y, 99999); try { if (name) u.slot.name = name; if (hpMul) { u.mhp *= hpMul; u.hp = u.mhp; } } catch (e) {} return u; };
  // ------------------------------------------------------------------ mission tick
  var tick = function (X, I, dt) {
    var G0 = g(), M = X._m; if (!M) { line(null); return; }
    if (!M.init) {
      M.init = 1; M.t0 = G0.t; var b0 = BASES[0], b1 = BASES[1];
      if (M.k === 'protect') { M.x = b0.x + (b1.x - b0.x) * M.at; M.y = b0.y + (b1.y - b0.y) * M.at; M.mhp = M.hp; try { M.vis = spawnMinion(G0.local.unit || { slot: G0.local, team: G0.local.team, z: 0, a: 0, aa: 0 }, 'sentry', M.x, M.y, 99999, 0); M.vis.slot.name = M.name; M.vis.st.spd = 0; } catch (e) {} say('sera', L2(M.name + ' 위치 표시. 제타가 몰리면 피해를 입습니다. 근처에서 막아 주세요.', M.name + ' marked. Every Zeta that reaches it tears at it - hold them off near it.')); }
      if (M.k === 'nests') { M.list = []; for (var i = 0; i < M.n; i++) { var yy = b1.y + (i - 1) * 520; M.list.push(mkFoe('ztank', b1.x - 900 - i * 160, yy, L2('하이브 둥지', 'Hive nest'), 4)); } M.list.forEach(function (u) { try { u.st.spd = 0; u.nest = 1; } catch (e) {} }); say('sera', L2('둥지 3개가 새끼를 뿜어내고 있습니다. 둥지부터 부숴야 여왕이 나옵니다.', 'Three nests keep spawning brood. Break them and the Queen will have to show herself.')); }
      if (M.k === 'air') { M.kills = 0; say('hq', L2('궤도 기지 상공에 비행 군단! 전부 떨어뜨려라!', 'Flyer legion over the station! Bring them all down!')); }
      if (M.k === 'barrage') { say('sera', L2('타이탄이 전선을 포격합니다. 60초만 버티면 포탄이 바닥납니다. 붉은 표시를 피하세요!', 'The titan is shelling the line. Last 60 seconds and it runs dry - stay out of the red marks!')); }
      if (M.k === 'spies') { M.list = []; for (var s = 0; s < M.n; s++) { var a = Math.random() * 6.28, r = 700 + Math.random() * 900; var u = mkFoe('zlurk', (b0.x + b1.x) / 2 + Math.cos(a) * r, (b0.y + b1.y) / 2 + Math.sin(a) * r, L2('첩보체', 'Infiltrator'), 3); u.spy = 1; M.list.push(u); } say('sera', L2('신호 4개가 무리 속에 숨어 있습니다. 표시된 첩보체를 찾아내세요.', 'Four signals are hiding in the swarm. Find the marked infiltrators.')); }
      if (M.k === 'endure') { say('sera', L2('리바이어던 무리가 끝없이 밀려옵니다. 120초. 버티면 퀸이 직접 나옵니다.', 'The leviathan swarm will not stop. 120 seconds. Hold, and the Queen comes out herself.')); }
      if (M.k === 'gate') { M.gate = mkFoe('ztitan', b1.x - 700, b1.y, L2('거인의 문', 'Giant Gate'), 1); try { M.gate.mhp = M.hp; M.gate.hp = M.hp; M.gate.st.spd = 0; M.gate.gate = 1; } catch (e) {} say('hq', L2('문을 부수지 못하면 전군이 갇힌다. 문에 화력을 집중하라!', 'If the gate holds, the whole fleet is trapped. Pour everything into the gate!')); }
      if (M.k === 'final') { say('sera', L2('아르코스… 이번엔 그림자가 아닙니다. 본체입니다.', 'Arkos… not a shadow this time. The real one.')); }
    }
    var el2 = G0.t - M.t0, txt = goalText(M);
    if (M.k === 'protect') {
      var n = enemyAt(M.x, M.y, 300); if (n) M.hp -= n * (6 + X.diff * 2) * dt; if (M.vis && !M.vis.dead) { try { M.vis.hp = Math.max(1, M.vis.mhp * M.hp / M.mhp); } catch (e) {} }
      if (M.hp <= M.mhp * .5 && !M.warn) { M.warn = 1; say('sera', L2(M.name + ' 손상 50%! 돌아와 주세요!', M.name + ' at 50%! Get back here!')); }
      if (M.hp <= 0 && !X.won && !G0.over) { X.won = 1; line(null); say('hq', L2(M.name + ' 상실. 작전 실패.', M.name + ' lost. Mission failed.')); setTimeout(function () { try { endMatch(1); } catch (e) {} }, 1200); return; }
      txt += ' · ' + bar(M.hp / M.mhp) + ' ' + Math.ceil(M.hp / M.mhp * 100) + '%' + (M.t ? ' · ' + Math.max(0, Math.ceil(M.t - el2)) + L2('초', 's') : '');
      if (M.t && el2 >= M.t && !M.done) { M.done = 1; say('sera', L2('수송대가 다리를 건넜습니다. 이제 여왕입니다.', 'The convoy is across. Now - the Queen.')); }
    }
    if (M.k === 'nests') { var left = M.list.filter(function (u) { return !u.dead; }).length; txt += ' · ' + (M.n - left) + '/' + M.n; if (!left && !M.done) { M.done = 1; say('sera', L2('둥지 전멸. 여왕이 움직입니다!', 'All nests down. The Queen is moving!')); } }
    if (M.k === 'air') { txt += ' · ' + Math.min(M.n, M.kills) + '/' + M.n; if (M.kills >= M.n && !M.done) { M.done = 1; say('hq', L2('하늘이 깨끗하다. 수호체가 온다!', 'Skies clear. The guardian is coming!')); } }
    if (M.k === 'barrage') {
      var rem = Math.max(0, Math.ceil(M.t - el2)); txt += ' · ' + rem + L2('초', 's');
      if (rem > 0) { M.sh = (M.sh || 0) - dt; if (M.sh <= 0) { M.sh = 2.2 - Math.min(1, X.diff * .15); try { var me = G0.local.unit; if (me && !me.dead) { var a2 = Math.random() * 6.28, d2 = 60 + Math.random() * 260; var tx2 = me.x + Math.cos(a2) * d2 + (me.vx || 0) * .6, ty2 = me.y + Math.sin(a2) * d2 + (me.vy || 0) * .6; (G0.tele = G0.tele || []).push({ k: 'circle', x: tx2, y: ty2, r: 170, dmg: 0, src: null, t: 1.3 }); setTimeout(function () { try { var G1 = g(); if (!G1 || G1.over) return; fx(1, tx2, ty2, 0); for (var q = 0; q < G1.units.length; q++) { var v = G1.units[q]; if (v.dead || v.team !== G1.local.team) continue; if (Math.hypot(v.x - tx2, v.y - ty2) < 170) hurt(v, (v.mhp || 400) * .09, null, Math.atan2(v.y - ty2, v.x - tx2), 'x'); } } catch (e) {} }, 1300); } } catch (e) {} } }
      else if (!M.done) { M.done = 1; say('sera', L2('포격이 멈췄습니다. 타이탄이 직접 내려옵니다!', 'The shelling stopped. The titan is coming down itself!')); }
    }
    if (M.k === 'spies') { var l2 = M.list.filter(function (u) { return !u.dead; }); txt += ' · ' + (M.n - l2.length) + '/' + M.n; l2.forEach(function (u) { if (!u._mk) { u._mk = 1; try { u.marked = 1; u.spot = 99; } catch (e) {} } }); if (!l2.length && !M.done) { M.done = 1; say('sera', L2('첩보체 전원 제거. 지휘관이 나옵니다.', 'All infiltrators down. Their commander is coming out.')); } }
    if (M.k === 'endure') { var r2 = Math.max(0, Math.ceil(M.t - el2)); txt += ' · ' + r2 + L2('초', 's'); if (!r2 && !M.done) { M.done = 1; say('sera', L2('버텼습니다! 퀸이 나옵니다!', 'We held! Here comes the Queen!')); } }
    if (M.k === 'gate') { var gt = M.gate; txt += ' · ' + bar(gt && !gt.dead ? gt.hp / gt.mhp : 0); if ((!gt || gt.dead) && !M.done) { M.done = 1; say('hq', L2('문이 무너졌다! 수문장을 처치하라!', 'The gate is down! Take out its warden!')); } }
    // the boss only comes once the chapter objective is done
    var gateOpen = M.k === 'final' || M.done || (M.k === 'protect' && !M.t);
    if (!gateOpen && I.wave >= X.waves && !X.bossU) { I.waveT = Math.max(I.waveT, 1.5); if (M.k === 'protect' || M.k === 'air' || M.k === 'spies' || M.k === 'nests') { M.extra = (M.extra || 0) - dt; if (M.extra <= 0) { M.extra = 16; try { spawnWave(Math.min(6, X.waves + X.diff)); } catch (e) {} } } }
    if (M.k === 'protect' && !M.t && X.bossU && X.bossU.dead) M.done = 1;
    if (X.bossU && txt) txt = L2('보스 처치', 'Defeat the boss') + ' · ' + (X.bossU.slot && X.bossU.slot.name || '');
    var dp = document.getElementById('deploy'); line(G0.over || (dp && !dp.classList.contains('hidden')) ? null : txt);
  };
  // ------------------------------------------------------------------ hooks
  var hook = function () {
    if (window.__hkStory2 || typeof storyStep !== 'function' || typeof spawnWave !== 'function' || typeof hurt !== 'function') return; window.__hkStory2 = 1;
    var ss = storyStep; storyStep = function (dt) { try { var G0 = g(); if (G0 && G0.rpg && G0.inv && !G0.over) { var X = G0.rpg; if (X._m === undefined) X._m = pick(X); if (X._m) tick(X, G0.inv, dt); } else line(null); } catch (e) { window.__story2Err = String(e && e.stack || e).slice(0, 200); } return ss.apply(this, arguments); };
    var sw = spawnWave; spawnWave = function (n) { var r = sw.apply(this, arguments); try { var G0 = g(), X = G0 && G0.rpg; if (X && X._m && X._m.k === 'air') { var b = BASES[1], c = 6 + (X.diff || 0) * 2; for (var i = 0; i < c; i++) invSpawn('zhopper', b.x - 200 + (Math.random() - .5) * 600, b.y + (Math.random() - .5) * 900); } } catch (e) {} return r; };
    var hu = hurt; hurt = function (e) { var d0 = e && e.dead; var r = hu.apply(this, arguments); try { var G0 = g(), X = G0 && G0.rpg; if (X && X._m && X._m.k === 'air' && e && e.dead && !d0 && e.cls === 'zhopper' && e.team !== G0.local.team) X._m.kills++; } catch (er) {} return r; };
  };
  setInterval(function () { try { hook(); var G0 = g(); if (!G0 || !G0.rpg || G0.over) line(null); } catch (e) {} }, 500);
})();
