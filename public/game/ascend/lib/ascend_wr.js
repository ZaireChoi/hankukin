/* ASCEND v3.58 — lane-battle screen (5v5 and the 100-player front), laid out like the mobile MOBA standard
   · completely separate from the story / dungeon HUD: the story skill bar and orbs are hidden here
   · minimap top-left, score / time top-centre (existing), gold + shop on the left, skills bottom-right around a big attack button
   · from the start: basic laser fire (left mouse / attack button), beam saber melee (E), dash (Space), transform (Y)
   · learned with skill points (one per level, + buttons): Skill 1 palm laser (Q), Skill 2 multi-launch missiles (C), Skill 3 absolute (T)
     each rank: -10% cooldown on that skill; the ultimate (R) opens at level 5 */
(function () {
  'use strict';
  var on = function () { try { return typeof G !== 'undefined' && G && G.arena && G.local && !G.over; } catch (e) { return false; } };
  var L2 = function (k, e) { try { return L(k, e); } catch (x) { return k; } };
  var me = function () { try { return G.local; } catch (e) { return null; } };
  var SK = [
    { id: 'q', key: 'KeyQ', lab: 'Q', n: L2('손바닥 레이저', 'Palm Laser'), c: '#9ff6ff', cd: 'cd1', max: 5 },
    { id: 'c', key: 'KeyC', lab: 'C', n: L2('다연장 미사일', 'Missile Pods'), c: '#ffd166', cd: 'mslCd', max: 5 },
    { id: 't', key: 'KeyT', lab: 'T', n: L2('절대기술', 'Absolute'), c: '#c58cff', cd: 'cdAb', max: 5 }
  ];
  var ULT_LV = 5;
  var learned = function (s, id) { return ((s.aSk || {})[id] || 0) > 0; };
  var points = function (s) { var spent = 0; for (var k in (s.aSk || {})) spent += s.aSk[k]; var lv = s.alv || 1; return Math.max(0, lv - spent - (lv >= ULT_LV ? 0 : 0)); };
  var learn = function (s, id) { var d = SK.filter(function (x) { return x.id === id; })[0]; if (!d) return; s.aSk = s.aSk || {}; var r = s.aSk[id] || 0; if (r >= d.max || points(s) <= 0) return; s.aSk[id] = r + 1; try { SFX.tone(980, .08, 'triangle', .05); } catch (e) {} draw(true); };

  // ---------------------------------------------------------------- gating: unlearned skills do nothing; ranks shorten cooldowns
  addEventListener('keydown', function (e) {
    if (!on()) return; var s = me(); if (!s || !s.aRole) return;
    for (var i = 0; i < SK.length; i++) if (e.code === SK[i].key && !learned(s, SK[i].id)) { e.stopImmediatePropagation(); e.preventDefault(); try { pop(L2('먼저 스킬을 배우세요 (+)', 'Learn the skill first (+)'), '#ffb36b', false); } catch (er) {} return; }
    if (e.code === 'KeyR' && (s.alv || 1) < ULT_LV) { e.stopImmediatePropagation(); e.preventDefault(); return; }
  }, true);
  var lastCd = {};
  var cdTick = function () {
    var s = me(); var u = s && s.unit; if (!u || !s.aSk) return;
    SK.forEach(function (d) { var v = u[d.cd] || 0, p = lastCd[d.id] || 0; if (v > p + .05 && learned(s, d.id)) { var r = s.aSk[d.id]; u[d.cd] = v * (1 - .1 * (r - 1)); } lastCd[d.id] = u[d.cd] || 0; });
    // the auto pilot only uses what has been learned
  };
  var hookInput = function () { var li = window.localInput; if (!li || li.__wr || window.__hkWr) return; window.__hkWr = 1; var w = function (u) { var inp = li(u); try { if (on() && u === G.local.unit) { var s = me(); if (!learned(s, 'q')) inp.a1 = false; if ((s.alv || 1) < ULT_LV) inp.ul = false; if (!learned(s, 't')) inp.ab = false; if (window.__wrFire) inp.fire = true; } } catch (e) {} return inp; }; w.__wr = 1; window.localInput = w; };

  // ---------------------------------------------------------------- minimap to the top-left in this mode
  var hookMini = function () {
    if (typeof drawMinimap !== 'function' || drawMinimap.__wr) return;
    var orig = drawMinimap;
    var w2 = function (info, mob) {
      if (!on()) return orig(info, mob);
      try { var PL = window.__phoneLand && window.__phoneLand(); var w = PL ? 118 : (mob ? 140 : 228); var c = ctx; c.save(); c.translate(-(VW - w - 28), mob ? 74 : 100); var r = orig(info, mob); c.restore(); return r; } catch (e) { return orig(info, mob); }
    };
    w2.__wr = 1; try { drawMinimap = w2; } catch (e) {}
  };

  // ---------------------------------------------------------------- the skill cluster
  var root = null, st = null;
  var css = '#wrSk{position:fixed;right:18px;bottom:16px;z-index:40;width:300px;height:250px;pointer-events:none;font-family:"Noto Sans KR",sans-serif}' +
    '#wrSk .b{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#eaf3fc;font-weight:800;text-align:center;pointer-events:auto;cursor:pointer;background:radial-gradient(circle at 40% 35%,rgba(40,60,96,.92),rgba(6,10,20,.92));border:2px solid rgba(207,224,242,.35);box-shadow:0 0 14px rgba(0,0,0,.6);overflow:hidden;user-select:none}' +
    '#wrSk .b small{font-size:10px;font-weight:700;opacity:.85;line-height:1.1;padding:0 3px}#wrSk .b i{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.7) var(--p,0%),transparent 0);pointer-events:none}' +
    '#wrSk .b em{position:absolute;bottom:3px;font-style:normal;font-size:11px;color:#ffd166}#wrSk .b.lock{filter:grayscale(1);opacity:.45}#wrSk .rk{position:absolute;top:-2px;display:flex;gap:2px}#wrSk .rk b{width:6px;height:6px;border-radius:2px;background:rgba(255,255,255,.18)}#wrSk .rk b.on{background:#ffd166}' +
    '#wrSk .plus{position:absolute;width:26px;height:26px;border-radius:50%;background:#ffd166;color:#1a1206;font:900 18px sans-serif;display:none;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;box-shadow:0 0 12px rgba(255,209,102,.8);z-index:2}' +
    'body.wr #skb2,body.wr #skTag,body.wr #skx348{display:none!important}body.wr #arGold{top:auto!important;bottom:44%!important;left:12px!important;right:auto!important;align-items:flex-start!important}' +
    'body.wr #touchUI #tA1,body.wr #touchUI #tA2,body.wr #touchUI #tUl,body.wr #touchUI #tAb,body.wr #touchUI #tMsl{display:none!important}';
  var POS = { atk: [190, 140, 96], e: [118, 178, 60], q: [106, 104, 60], c: [150, 46, 60], t: [222, 24, 60], r: [246, 92, 58], dash: [44, 192, 48], y: [44, 124, 48] };
  var keyDown = function (code) { window.dispatchEvent(new KeyboardEvent('keydown', { code: code })); setTimeout(function () { window.dispatchEvent(new KeyboardEvent('keyup', { code: code })); }, code === 'KeyC' ? 900 : 140); };
  var build = function () {
    if (root) return; st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'wrSk'; document.body.appendChild(root);
    var mk = function (id, html, title) { var p = POS[id]; var d = document.createElement('div'); d.className = 'b'; d.dataset.k = id; d.style.cssText = 'left:' + (p[0] - p[2] / 2) + 'px;top:' + (p[1] - p[2] / 2) + 'px;width:' + p[2] + 'px;height:' + p[2] + 'px'; d.innerHTML = html + '<i></i><em></em>'; d.title = title || ''; root.appendChild(d); return d; };
    mk('atk', '<span style="font-size:22px">✦</span><small>' + L2('공격', 'Attack') + '</small>', L2('기본 레이저 사격 (마우스 왼쪽)', 'Basic laser fire (left mouse)'));
    mk('e', '<span>E</span><small>' + L2('빔 세이버', 'Saber') + '</small>', L2('기본 근접 공격', 'Basic melee'));
    SK.forEach(function (d) { var b = mk(d.id, '<span>' + d.lab + '</span><small>' + d.n + '</small>', d.n); b.style.borderColor = d.c; var rk = document.createElement('div'); rk.className = 'rk'; rk.innerHTML = new Array(d.max + 1).join('<b></b>'); b.appendChild(rk);
      var pl = document.createElement('div'); pl.className = 'plus'; pl.textContent = '+'; pl.dataset.p = d.id; var p = POS[d.id]; pl.style.left = (p[0] - p[2] / 2 - 8) + 'px'; pl.style.top = (p[1] - p[2] / 2 - 8) + 'px'; root.appendChild(pl);
      pl.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); ev.preventDefault(); learn(me(), d.id); }); });
    var r = mk('r', '<span>R</span><small>' + L2('궁극기', 'Ultimate') + '</small>', L2('궁극기 (레벨 5)', 'Ultimate (level 5)')); r.style.borderColor = '#ff7ae0';
    mk('dash', '<span style="font-size:15px">⇢</span><small>' + L2('대시', 'Dash') + '</small>', 'Space');
    mk('y', '<span style="font-size:15px">✈</span><small>' + L2('변신', 'Transform') + '</small>', 'Y');
    root.querySelectorAll('.b').forEach(function (b) { b.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); var k = b.dataset.k; var s = me();
      if (k === 'atk') { window.__wrFire = true; var up = function () { window.__wrFire = false; removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); }; addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true); return; }
      if (k === 'e') keyDown('KeyE'); else if (k === 'q') keyDown('KeyQ'); else if (k === 'c') keyDown('KeyC'); else if (k === 't') keyDown('KeyT'); else if (k === 'r') keyDown('KeyR'); else if (k === 'dash') keyDown('Space'); else if (k === 'y') keyDown('KeyY'); }); });
    var atk = root.querySelector('[data-k="atk"]'); atk.title += ' · ' + L2('누르고 있으면 자동 사격', 'hold for auto fire');
  };
  var setCd = function (k, frac, txt) { var b = root.querySelector('[data-k="' + k + '"]'); if (!b) return; b.style.setProperty('--p', Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%'); var em = b.querySelector('em'); if (em && em.textContent !== txt) em.textContent = txt; };
  var lastDraw = 0;
  var draw = function (force) {
    var act = on(); document.body.classList.toggle('wr', !!act); if (!act) { if (root) root.style.display = 'none'; return; }
    build(); root.style.display = 'block'; var s = me(); if (!s || !s.aRole) return; var u = s.unit; var pts = points(s);
    SK.forEach(function (d) { var b = root.querySelector('[data-k="' + d.id + '"]'); var r = (s.aSk || {})[d.id] || 0; b.classList.toggle('lock', r <= 0); b.querySelectorAll('.rk b').forEach(function (x, i) { x.classList.toggle('on', i < r); }); var pl = root.querySelector('[data-p="' + d.id + '"]'); pl.style.display = (pts > 0 && r < d.max) ? 'flex' : 'none';
      var v = u ? (u[d.cd] || 0) : 0; setCd(d.id, v > 0 ? Math.min(1, v / 10) : 0, v > .05 ? Math.ceil(v) + '' : ''); });
    var rb = root.querySelector('[data-k="r"]'); rb.classList.toggle('lock', (s.alv || 1) < ULT_LV); var ultP = (G.local && G.local.ult) || 0; setCd('r', (s.alv || 1) < ULT_LV ? 1 : (1 - Math.min(1, ultP / 100)), (s.alv || 1) < ULT_LV ? 'Lv' + ULT_LV : (ultP >= 100 ? '' : Math.floor(ultP) + '%'));
    if (u) { setCd('e', (u.cd2 || 0) > 0 ? Math.min(1, u.cd2 / 4) : 0, (u.cd2 || 0) > .05 ? Math.ceil(u.cd2) + '' : ''); setCd('dash', (u.dashCd || 0) > 0 ? Math.min(1, u.dashCd / .75) : 0, ''); }
  };
  // the attack button fires while it is held (aim stays where the pointer / auto aim puts it)
  setInterval(function () { try { hookInput(); hookMini(); cdTick(); var t = performance.now(); if (t - lastDraw > 150) { lastDraw = t; draw(); } } catch (e) { (window.__wrErr = window.__wrErr || []).push(String(e && e.stack || e).slice(0, 160)); } }, 60);
  window.__wr = { learn: function (id) { learn(me(), id); }, points: function () { return points(me()); } };
})();
