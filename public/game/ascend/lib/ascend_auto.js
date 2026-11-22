/* ASCEND v3.64 — auto battle uses the big moves too
   Auto battle fired the basic attack and Q/E but never R (missile swarm / frame ultimate) or T (absolute tech), so a full
   gauge just sat at 100 %. Now, while auto battle is on: R goes off when the gauge is full and a fight is close
   (2+ foes within 900, or a frame / boss within 800); T is tried every 5 s in the same situation (the game itself checks
   whether it is ready or unlocked). Manual play is untouched. */
(function () {
  'use strict';
  var lastT = 0, lastR = 0;
  var fight = function (u) {
    var n = 0, big = false; for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (e.dead || e.team === u.team || e.team === 2) continue; var d = Math.hypot(e.x - u.x, e.y - u.y); if (d < 900) n++; if (d < 800 && (e.cls === 'arkframe' || e.boss || e.fbs || e.elite)) big = true; } return n >= 2 || big;
  };
  var hook = function () {
    var li = window.localInput; if (!li || window.__hkAuto) return; window.__hkAuto = 1;
    window.localInput = function (u) {
      var inp = li(u);
      try {
        if (inp && typeof P !== 'undefined' && P.autoHunt && G && G.local && u === G.local.unit && !u.dead && !G.over && u.cls === 'arkframe') {
          var t = G.t || 0, gauge = Math.max(G.local.ult || 0, (u.slot && u.slot.ult) || 0);
          if (gauge >= 100 && t - lastR > 1.5 && fight(u)) { inp.ul = true; lastR = t; }
          if (t - lastT > 5 && fight(u)) { inp.ab = true; lastT = t; }
        }
      } catch (e) {}
      return inp;
    };
  };
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();
