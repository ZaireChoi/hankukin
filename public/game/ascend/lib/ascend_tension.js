/* ASCEND v3.60 — tension (16-4): the auto pilot alone should not win untouched
   · quick battles last longer: the score pool is 1.7x (about two and a half minutes instead of 50-100 s)
   · on auto battle the enemy hits my frame 55% harder; hands-on play keeps the normal numbers
   · a bounty (5+ kill streak) draws the enemy: every 6 s up to three enemy frames / elites within 1400 turn on me and hit 20% harder,
     and an elite strike team drops near me every 25 s while the streak lasts */
(function () {
  'use strict';
  var ok = function () { try { return typeof G !== 'undefined' && G && G.local && !G.over && !G.rpg && !G.arena && !G.inv; } catch (e) { return false; } };
  var me = function () { return G.local && G.local.unit; };
  var streak = function () { try { return G.local.streak || G.local.ks || 0; } catch (e) { return 0; } };
  var bounty = function () { try { return !!G.local.bounty || streak() >= 5; } catch (e) { return false; } };
  // longer quick battles
  var _nm = newMatch;
  newMatch = function (size, mode) {
    var r = _nm.apply(this, arguments);
    try { if (G && !G.rpg && !G.arena && !G.inv && !G.client && G.tk && !G.__tk17) { G.__tk17 = 1; G.tk = G.tk.map(function (v) { return Math.round(v * 1.7); }); G.tkMax = Math.round(G.tkMax * 1.7); } } catch (e) {}
    return r;
  };
  try { if (window.__ascend) window.__ascend.newMatch = newMatch; } catch (e) {}
  // pressure on my frame
  var _hu = hurt;
  hurt = function (u, amt, src, ang, dt) {
    try { if (ok() && u && u === me() && src && src.team !== u.team) { if (P.autoHunt) amt *= 1.55; if (bounty() && src.unit && src.unit._hunt) amt *= 1.2; } } catch (e) {}
    return _hu(u, amt, src, ang, dt);
  };
  var tH = 0, tS = 0;
  setInterval(function () {
    try { if (!ok()) return; var u = me(); if (!u || u.dead || !bounty()) return; tH += .5; tS += .5;
      if (tH >= 6) { tH = 0; var c = G.units.filter(function (e) { return !e.dead && e.team !== u.team && e.team !== 2 && (e.cls === 'arkframe' || e.elite || e.elite2 || e.eMech || e.named) && Math.hypot(e.x - u.x, e.y - u.y) < 1400; }).sort(function (a, b) { return Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y); }).slice(0, 3);
        c.forEach(function (e) { e._hunt = 1; e.tgt = u; e.target = u; e.aggro = u; e.forceTgt = u; e.forceT = 6; }); }
      if (tS >= 25) { tS = 0; try { if (typeof window.__strikeTeam === 'function') window.__strikeTeam(u); else { var team = 1 - u.team, A = Math.random() * 6.28, n = 3; for (var i = 0; i < n; i++) { var x = u.x + Math.cos(A) * 520 + (Math.random() * 120 - 60), y = u.y + Math.sin(A) * 520 + (Math.random() * 120 - 60); var own = G.slots.filter(function (s) { return s.team === team; })[0]; if (own && typeof spawnMinion === 'function') { var m = spawnMinion(own, 'walker', x, y, 600, 0); if (m) { m.elite = 1; m._hunt = 1; m.tgt = u; } } } try { pop((typeof L === 'function' ? L('현상수배 · 적 강습대가 몰려옵니다', 'Bounty: an enemy strike team is coming') : 'Bounty'), '#ff9b9b', false); } catch (e) {} } } catch (e) {} }
    } catch (e) {}
  }, 500);
})();
