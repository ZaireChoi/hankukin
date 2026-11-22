/* ASCEND v3.55 — flight and transform rules (all modes)
   Flight (X / the "Flight" slot): ranged weapons only — basic laser fire, Q palm laser, R missiles, C multi-launch, drone volley.
     Beam saber (E), the absolute skill (T), weapon art (Z) and melee number skills are locked and their slots dim.
     While airborne the Flight slot reads "Robot mode": pressing it (or dashing) lands the frame — a dash also lands it, mid-dash.
   Transform (Y, the right-most slot): labelled "Transform"; while transformed it reads "Robot" and only what the machine can use stays lit;
     a dash also turns the machine back into the robot. */
(function () {
  'use strict';
  var me = function () { try { return G && G.local && G.local.unit; } catch (e) { return null; } };
  var jet = function (u) { return !!(u && u.tf && u.tf.mode !== 'robot'); };
  var flying = function (u) { return !!(u && u.fly && !jet(u) && !u._tfFly); };
  var L2 = function (k, e) { try { return L(k, e); } catch (x) { return k; } };
  var NAME2K = { '비행': 'fly', 'Flight': 'fly', '드론 일제사격': 'volley', 'Drone Volley': 'volley', '돌진 베기': 'charge', 'Charge Slash': 'charge', '수리 키트': 'kit', 'Repair Kit': 'kit', '드론 합체': 'fusion', 'Drone Fusion': 'fusion', '탑승/하차': 'board', 'Board/Exit': 'board' };
  var orig = {};
  // number-slot skill of slot i, read from the bar label (the slot map itself is private to the game script)
  var skOf = function (i) { var d = document.querySelector('#skb2 [data-k="n' + i + '"]'); if (!d) return null; var sp = d.querySelector('span'); var t = orig['n' + i] != null ? orig['n' + i] : (sp ? sp.textContent : ''); return NAME2K[t] || (t ? 'other' : null); };
  var RANGED_N = { fly: 1, volley: 1 };            // number-slot skills usable in flight
  var BLOCK_FLY = { KeyE: 1, KeyT: 1, KeyZ: 1 };
  var land = function (u) { try { if (typeof arkFly === 'function') arkFly(u, false); else u.fly = false; } catch (e) { u.fly = false; } };

  // keys (capture phase, before the game's own handlers)
  addEventListener('keydown', function (e) {
    var u = me(); if (!u || u.dead || u.cls !== 'arkframe') return;
    if (flying(u)) {
      if (BLOCK_FLY[e.code]) { e.stopImmediatePropagation(); e.preventDefault(); return; }
      var m = /^Digit([1-6])$/.exec(e.code); if (m) { var k = skOf(+m[1] - 1); if (k && !RANGED_N[k]) { e.stopImmediatePropagation(); e.preventDefault(); return; } }
    }
  }, true);

  // a dash ends flight / transform (the dash itself still happens)
  var lastDash = 0;
  var tick = function () {
    var u = me(); if (!u || u.dead) return;
    var d = u.dashT > 0;
    if (d && !lastDash) {
      if (flying(u)) land(u);
      else if (jet(u) && (u.tf.mode === 'jet' || u.tf.mode === 'toJet')) { try { window.ascendTransform && window.ascendTransform(u); } catch (e) {} }
    }
    lastDash = d;
  };

  // input: no melee while flying
  var hookInput = function () {
    var li = window.localInput; if (!li || li.__fl) return;
    var w = function (u) { var inp = li(u); try { if (flying(u)) { inp.a2 = false; inp.ab = false; if (inp.melee) inp.melee = false; } } catch (e) {} return inp; };
    w.__fl = 1; window.localInput = w;
  };

  // skill bar: only what can be used stays lit; Flight reads "Robot mode" in the air; the right-most slot is "Transform"
  var paint = function () {
    var u = me(); var bar = document.getElementById('skb2'); if (!bar) return;
    var fl = flying(u), tj = jet(u);
    bar.querySelectorAll('.sk2').forEach(function (d) {
      var k = d.dataset.k, ok = true;
      if (fl) { if (k === 'E' || k === 'T') ok = false; else { var m = /^n(\d)$/.exec(k); if (m) { var s = skOf(+m[1]); ok = !s || !!RANGED_N[s]; } } }
      else if (tj) ok = (k === 'lmb' || k === 'TF');
      var want = ok ? '' : '.32'; if (d.style.opacity !== want) { d.style.opacity = want; d.style.filter = ok ? '' : 'grayscale(1)'; }
      var m2 = /^n(\d)$/.exec(k); if (m2 && (orig[k] == null || !fl)) { var s0 = d.querySelector('span'); if (s0 && s0.textContent && s0.textContent !== L2('로봇 모드', 'Robot mode')) orig[k] = s0.textContent; } if (m2 && skOf(+m2[1]) === 'fly') { var sp = d.querySelector('span'); if (sp) { if (orig[k] == null) orig[k] = sp.textContent; var t = fl ? L2('로봇 모드', 'Robot mode') : orig[k]; if (sp.textContent !== t) sp.textContent = t; } }
      else if (orig[k] != null && !fl) { var sp2 = d.querySelector('span'); if (sp2 && sp2.textContent === L2('로봇 모드', 'Robot mode')) sp2.textContent = orig[k]; }
    });
    var tf = document.getElementById('skTFs'); if (tf) { var t2 = tj ? L2('로봇 복귀', 'Robot') : L2('변신', 'Transform'); if (tf.textContent !== t2) tf.textContent = t2; }
    var tfc = document.getElementById('skTF'); if (tfc) tfc.title = L2('변신 / 로봇 복귀 [Y]', 'Transform / Robot [Y]');
    // touch: the flight button doubles as "robot mode"
    var tb = document.getElementById('tFly'); if (tb) { var tt = fl ? L2('로봇', 'ROBOT') : (tb.dataset.o || (tb.dataset.o = tb.textContent)); if (tb.textContent !== tt) tb.textContent = tt; }
  };
  setInterval(function () { try { hookInput(); tick(); } catch (e) {} }, 50);
  setInterval(function () { try { paint(); } catch (e) {} }, 200);
  window.__flight = { flying: function () { return flying(me()); } };
})();
