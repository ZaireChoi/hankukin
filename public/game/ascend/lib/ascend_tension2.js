/* ASCEND v3.66 — tension 19-1: auto battle must not be a stroll (manager v3.65: 81 s, S, 0 deaths, lowest HP 83 %)
   Only while AUTO battle is on (hands-on play keeps the normal numbers and all the new hit effects):
   · the longer quick-battle score pool is guaranteed (1.7x was skipped when the match was started through another path)
   · enemies hit my frame harder (about x2.5 in total, +5 % per kill in the current streak, up to +50 %)
   · my blows no longer knock enemies down or stun them (knock-back stays) — the auto pilot was locking whole squads
   · enemy frames hunt me: every 7 s the two nearest enemy frames / elites (within 1600) set me as their target and goal,
     with a bounty (5+ streak) four of them, and a strike team (3 elite walkers) drops in every 20 s
   · enemy elites and frames get +30 % health when they spawn, so focus fire takes time */
(function () {
  'use strict';
  var on = function () { try { return typeof G !== 'undefined' && G && G.local && !G.over && !G.rpg && !G.arena && !G.inv && !G.client && typeof P !== 'undefined' && P.autoHunt; } catch (e) { return false; } };
  var base = function () { try { return typeof G !== 'undefined' && G && G.local && !G.over && !G.rpg && !G.arena && !G.inv && !G.client; } catch (e) { return false; } };
  var me = function () { return G.local && G.local.unit; };
  var streak = function () { try { return G.local.streak || G.local.ks || 0; } catch (e) { return 0; } };
  var hunt = function (u, n) {
    var c = G.units.filter(function (e) { return !e.dead && e.team !== u.team && e.team !== 2 && (e.cls === 'arkframe' || e.elite || e.elite2 || e.eMech || e.named || e.arm === 'heavy') && Math.hypot(e.x - u.x, e.y - u.y) < 1600; })
      .sort(function (a, b) { return Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y); }).slice(0, n);
    c.forEach(function (e) { e._hunt = 1; e.tgt = u; e.forceTgt = u; e.forceT = 7; if (e.bot) { e.bot.tgt = u; e.bot.goal = { x: u.x, y: u.y, r: 120 }; e.bot.asg = null; e.bot.asgT = 7; } });
    return c.length;
  };
  var tH = 0, tS = 0, seenG = null, buffed = new WeakSet();
  var hook = function () {
    if (!window.__t2Hurt && typeof hurt === 'function') { window.__t2Hurt = 1; var hu = hurt;
      hurt = function (u, amt, src, ang, dt) { try { if (on() && u && u === me() && src && src.team !== u.team) amt *= 1.6 * (1 + Math.min(.5, streak() * .05)); } catch (e) {} return hu(u, amt, src, ang, dt); }; }
    if (!window.__t2Step && typeof step === 'function') { window.__t2Step = 1; var st = step;
      step = function (dt) { st(dt);
        try {
          if (!base()) return;
          if (G !== seenG) { seenG = G; tH = tS = 0; if (G.tk && !G.__tk17 && G.tkMax) { G.__tk17 = 1; G.tk = G.tk.map(function (v) { return Math.round(v * 1.7); }); G.tkMax = Math.round(G.tkMax * 1.7); } }
          if (!on()) return; var u = me(); if (!u || u.dead) return;
          for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (e.dead || e.team === u.team || e.team === 2 || buffed.has(e)) continue; buffed.add(e); if (e.cls === 'arkframe' || e.elite || e.elite2 || e.named || e.eMech) { e.mhp = Math.round((e.mhp || 100) * 1.3); e.hp = Math.min(e.mhp, (e.hp || 0) * 1.3); } }
          tH += dt; tS += dt; var bounty = streak() >= 5;
          if (tH >= 7) { tH = 0; hunt(u, bounty ? 4 : 2); }
          if (tS >= 20) { tS = 0; var team = 1 - u.team, own = (G.slots || []).filter(function (s) { return s.team === team; })[0], A = Math.random() * 6.283;
            if (own && typeof spawnMinion === 'function') { for (var k = 0; k < 3; k++) { var m = spawnMinion(own, 'walker', u.x + Math.cos(A) * 560 + (Math.random() - .5) * 140, u.y + Math.sin(A) * 560 + (Math.random() - .5) * 140, 600, 0); if (m) { m.elite = 1; m._hunt = 1; m.tgt = u; if (m.bot) m.bot.tgt = u; } }
              try { pop(L('적 강습대 접근!', 'Enemy strike team!'), '#ff9b9b', false); } catch (e) {} } }
        } catch (e) { window.__t2Err = String(e).slice(0, 160); }
      }; }
  };
  // 19-5: on auto battle the level-up card picks itself (first choice) after 1.2 s instead of covering the screen
  setInterval(function () { try { if (typeof P === 'undefined' || !P.autoHunt) return; var box = document.getElementById('perkPick'); if (!box || box.offsetParent === null || getComputedStyle(box).display === 'none') { box && (box._t0 = 0); return; } if (!box._t0) { box._t0 = performance.now(); return; } if (performance.now() - box._t0 > 1200) { var b = box.querySelector('button[data-k]'); box._t0 = 0; if (b) b.click(); } } catch (e) {} }, 300);
  window.__autoSoftCC = function (a) { try { return on() && a && a === me(); } catch (e) { return false; } };   // read by combat2: no knock-down / stun from my blows on auto
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
