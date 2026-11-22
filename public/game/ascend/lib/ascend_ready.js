/* ASCEND v3.64 — battle start waits for my frame
   The match used to start ticking while my frame's model was still loading (3–5 s of an empty spot).
   Now the battle is held (clock stopped) behind a short loading card until my frame's model is in the scene and the
   shaders are compiled; then it starts with the frame already standing there. Never holds longer than 10 s. */
(function () {
  'use strict';
  var S = { g: null, held: false, done: false, t0: 0, warm: false };
  var card = null;
  var show = function (txt, k) {
    if (!card) { card = document.createElement('div'); card.id = 'rdyCard';
      card.style.cssText = 'position:fixed;inset:0;z-index:95;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(ellipse at center,rgba(10,16,30,.92),rgba(2,4,10,.98));color:#eaf3fc;font:700 15px "Noto Sans KR",sans-serif;letter-spacing:.06em;transition:opacity .35s';
      card.innerHTML = '<div style="font:800 13px Rajdhani,sans-serif;letter-spacing:.4em;color:#8fb4ff">SORTIE</div><div id="rdyTxt"></div><div style="width:260px;height:4px;border-radius:2px;background:rgba(255,255,255,.12);overflow:hidden"><i id="rdyBar" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#3ad7ff,#ffc24a);transition:width .2s"></i></div>';
      document.body.appendChild(card); }
    card.style.opacity = '1'; card.style.display = 'flex'; document.getElementById('rdyTxt').textContent = txt; document.getElementById('rdyBar').style.width = Math.round(k * 100) + '%';
  };
  var hideCard = function () { if (!card) return; card.style.opacity = '0'; setTimeout(function () { if (card && card.style.opacity === '0') card.style.display = 'none'; }, 380); };
  var L = function (ko, en) { try { return (typeof LANG !== 'undefined' && LANG === 'en') ? en : ko; } catch (e) { return ko; } };
  var finish = function () { S.done = true; if (S.held && G) G.paused = false; S.held = false; hideCard(); };
  setInterval(function () {
    try {
      if (typeof G === 'undefined' || !G || G.over || G.client) { if (S.held) finish(); if (!G) S.g = null; return; }
      if (G !== S.g) { S.g = G; S.done = false; S.held = false; S.warm = false; S.t0 = performance.now(); }
      if (S.done) return;
      var u = G.local && G.local.unit; if (!u) { if (performance.now() - S.t0 > 10000) finish(); return; }
      var R = window.R3, e = R && R.units && R.units.get(u.id);
      var ready = !!(e && e.mdl && e.mdl.obj && e.root && e.root.parent);
      if (!S.held && !ready) { S.held = true; G.paused = true; }
      var el = (performance.now() - S.t0) / 1000;
      if (ready && !S.warm) { S.warm = true; if (S.held) show(L('셰이더 준비 중…', 'Preparing shaders…'), .85); try { R.r.compile(R.scene, R.cam); } catch (er) {} return; }
      if (ready || el > 10) { finish(); return; }
      if (S.held) show(L('기체 불러오는 중…', 'Loading your frame…'), Math.min(.8, el / 6));
    } catch (er) { try { finish(); } catch (e2) {} }
  }, 100);
  window.__ready = S;
})();
