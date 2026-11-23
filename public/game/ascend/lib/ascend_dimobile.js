/* ASCEND v3.79 — phone controls in the style of action-RPG phone games (Diablo Immortal layout)
   Left thumb: a floating joystick — touch anywhere on the left side of the screen and drag; the stick appears under the thumb.
   Right thumb: one big ATTACK button in the corner (hold = keep attacking the nearest enemy; up close it also swings the
   beam saber), and the skills on an arc around it: Q palm laser, E beam saber, C missiles, R ultimate, T absolute tech,
   plus a dodge/dash button. FLY and MORPH sit above the arc. Skills and attacks aim themselves at the nearest enemy
   (auto-aim), so the phone never needs a second stick. Works in manual play and overrides the auto pilot while touched.
   Lag: DOM only, no per-frame allocation; the input hook is installed once (window.__hkDim). */
(function () {
  'use strict';
  var L2 = function (ko, en) { try { return (typeof LANG !== 'undefined' && LANG === 'en') ? en : ko; } catch (e) { return ko; } };
  var phone = function () { try { return !!window.__phone || (typeof isTouch === 'function' && isTouch()) || ('ontouchstart' in window && navigator.maxTouchPoints > 0 && !matchMedia('(pointer:fine)').matches); } catch (e) { return false; } };
  var meU = function () { try { return G && G.local && G.local.unit; } catch (e) { return null; } };
  var inBattle = function () { try { var u = meU(); return !!(G && !G.over && u && !u.dead); } catch (e) { return false; } };
  // ---------------------------------------------------------------- state
  var J = { id: null, ox: 0, oy: 0, dx: 0, dy: 0, mag: 0 };
  var ATK = false, PULSE = {}; // PULSE[k] = time until which input k is held
  var hold = function (k, ms) { PULSE[k] = performance.now() + (ms || 160); };
  var held = function (k) { return (PULSE[k] || 0) > performance.now(); };
  var key = function (code, ms) { try { window.dispatchEvent(new KeyboardEvent('keydown', { code: code })); setTimeout(function () { window.dispatchEvent(new KeyboardEvent('keyup', { code: code })); }, ms || 140); } catch (e) {} };
  // ---------------------------------------------------------------- UI
  var css = '#dimJoy{position:fixed;z-index:38;pointer-events:none;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:50%;border:2px solid rgba(207,224,242,.28);background:radial-gradient(circle,rgba(20,30,50,.25),rgba(20,30,50,.08) 70%,transparent);display:none}' +
    '#dimJoy b{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(234,243,252,.55),rgba(120,150,190,.3));border:2px solid rgba(234,243,252,.5)}' +
    '#dimHint{position:fixed;left:9%;bottom:34%;width:110px;height:110px;border-radius:50%;border:2px dashed rgba(207,224,242,.16);z-index:37;pointer-events:none;display:none}' +
    '#dimSk{position:fixed;right:8px;bottom:6px;width:280px;height:280px;z-index:40;pointer-events:none;transform-origin:100% 100%;font-family:"Noto Sans KR",sans-serif;display:none}' +
    '#dimSk .b{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#eaf3fc;font-weight:800;text-align:center;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;background:radial-gradient(circle at 40% 35%,rgba(40,60,96,.78),rgba(6,10,20,.78));border:2px solid rgba(207,224,242,.35);box-shadow:0 0 12px rgba(0,0,0,.5);overflow:hidden}' +
    '#dimSk .b small{font-size:10px;font-weight:700;opacity:.9;line-height:1.1}#dimSk .b span{font-size:15px;line-height:1}#dimSk .b i{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.66) var(--p,0%),transparent 0);pointer-events:none}' +
    '#dimSk .b em{position:absolute;font-style:normal;font-size:15px;font-weight:900;color:#ffd166;text-shadow:0 0 4px #000}#dimSk .b.on{filter:brightness(1.5);transform:scale(.94)}' +
    '#dimSk .b.hasIc>span,#dimSk .b.hasIc>small,#wrSk .b.hasIc>span,#wrSk .b.hasIc>small{display:none}#dimSk .b i,#wrSk .b i{z-index:1}#dimSk .b em{z-index:2}' +
    '#dimSk .atk{background:radial-gradient(circle at 40% 35%,rgba(120,40,60,.85),rgba(30,6,12,.85));border-color:rgba(255,154,170,.6)}' +
    'body.dim #touchUI #tA1,body.dim #touchUI #tA2,body.dim #touchUI #tUl,body.dim #touchUI #tAb,body.dim #touchUI #tMsl,body.dim #touchUI #tDash{display:none!important}' +
    'body.dim #skb2>div:nth-child(2)>*:nth-child(-n+5){display:none!important}body.dim #skb2{left:14px!important;transform:scale(var(--dimBar,.78))!important;transform-origin:0 100%!important}' + /* the desktop bar keeps items 1-6 and the orbs, moved to the left; attack/Q/E/R/T live in the thumb cluster */
    'body.dim #touchUI #tFly{right:14px!important;bottom:var(--dimTop,300px)!important;width:56px!important;height:56px!important}';
  var POS = { atk: [205, 205, 92], q: [103, 207, 60], e: [133, 133, 60], c: [207, 103, 60], r: [52, 140, 54], t: [140, 52, 54], dash: [40, 240, 50] };
  var root = null, joy = null, hint = null, built = false;
  var build = function () {
    if (built) return; built = true; var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    joy = document.createElement('div'); joy.id = 'dimJoy'; joy.innerHTML = '<b></b>'; document.body.appendChild(joy);
    hint = document.createElement('div'); hint.id = 'dimHint'; document.body.appendChild(hint);
    root = document.createElement('div'); root.id = 'dimSk'; document.body.appendChild(root);
    var mk = function (k, html, cls) { var p = POS[k], d = document.createElement('div'); d.className = 'b' + (cls ? ' ' + cls : ''); d.dataset.k = k; d.style.cssText = 'left:' + (p[0] - p[2] / 2) + 'px;top:' + (p[1] - p[2] / 2) + 'px;width:' + p[2] + 'px;height:' + p[2] + 'px'; d.innerHTML = html + '<i></i><em></em>'; root.appendChild(d); return d; };
    mk('atk', '<span style="font-size:26px">⚔</span><small>' + L2('공격', 'Attack') + '</small>', 'atk');
    mk('q', '<span>✋</span><small>' + L2('레이저', 'Laser') + '</small>');
    mk('e', '<span>⚡</span><small>' + L2('빔세이버', 'Saber') + '</small>');
    mk('c', '<span>➶</span><small>' + L2('미사일', 'Missiles') + '</small>');
    mk('r', '<span>R</span><small>' + L2('궁극기', 'Ultimate') + '</small>').style.borderColor = '#ff7ae0';
    mk('t', '<span>T</span><small>' + L2('절대기술', 'Absolute') + '</small>').style.borderColor = '#c58cff';
    mk('dash', '<span>⇢</span><small>' + L2('회피', 'Dodge') + '</small>');
    root.querySelectorAll('.b').forEach(function (b) {
      var k = b.dataset.k;
      var down = function (ev) { ev.preventDefault(); ev.stopPropagation(); b.classList.add('on'); try { SFX && SFX.init && SFX.init(); } catch (e) {}
        if (k === 'atk') { ATK = true; return; }
        if (k === 'q') { hold('a1', 220); key('KeyQ'); } else if (k === 'e') { hold('a2', 200); key('KeyE'); } else if (k === 'r') { hold('ul', 220); key('KeyR'); } else if (k === 't') { hold('ab', 220); key('KeyT'); }
        else if (k === 'c') key('KeyC', 900); else if (k === 'dash') { hold('dash', 200); key('Space', 160); try { tbtn.dash = 1; setTimeout(function () { tbtn.dash = 0; }, 180); } catch (e) {} } };
      var up = function (ev) { b.classList.remove('on'); if (k === 'atk') ATK = false; };
      b.addEventListener('pointerdown', down, { passive: false }); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      b.addEventListener('touchstart', function (ev) { ev.preventDefault(); }, { passive: false });
    });
  };
  // skill pictures: the same pictures as the PC skill bar (#skb2 cells hold them as img.ski), so each frame's own skills show
  var ICMAP = { atk: 'lmb', q: 'Q', e: 'E', r: 'R', t: 'T', c: 'C', dash: '-' };
  var ICFB = { c: 'models/thumbs/u_starswarm.jpg', dash: 'models/thumbs/dr_evader_1.jpg' };   // pictures for the two buttons the bar has no cell for
  var setIcons = function (host) {
    if (!host) return; var bs = host.querySelectorAll('.b[data-k]');
    for (var i = 0; i < bs.length; i++) { var b = bs[i], k = ICMAP[b.dataset.k]; if (!k) continue; var src = document.querySelector('#skb2 .sk2[data-k="' + k + '"] img.ski'); if ((!src || !src.src) && ICFB[b.dataset.k]) src = { src: new URL(ICFB[b.dataset.k], document.baseURI).href }; if (!src || !src.src) continue;
      var im = b.querySelector('img.dimIc'); if (!im) { im = document.createElement('img'); im.className = 'dimIc'; im.alt = ''; im.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;opacity:.95;pointer-events:none;z-index:0'; b.insertBefore(im, b.firstChild); }
      if (im.src !== src.src) im.src = src.src; b.classList.add('hasIc'); }
  };
  var setCd = function (k, left, total) { var b = root && root.querySelector('[data-k="' + k + '"]'); if (!b) return; var f = left > .05 ? Math.min(1, left / (total || 10)) : 0; b.style.setProperty('--p', Math.round(f * 100) + '%'); var em = b.querySelector('em'), tx = left > .05 ? String(Math.ceil(left)) : ''; if (em.textContent !== tx) em.textContent = tx; };
  // ---------------------------------------------------------------- left joystick (anywhere on the left side)
  var interactive = function (el) { while (el && el !== document.body) { if (el.id === 'dimSk' || el.id === 'wrSk' || el.id === 'skb2' || el.id === 'hkPause') return true; var tg = el.tagName; if (tg === 'BUTTON' || tg === 'INPUT' || tg === 'SELECT' || tg === 'A' || tg === 'TEXTAREA') return true; if (el.classList && (el.classList.contains('tb') || el.classList.contains('b'))) return true; el = el.parentElement; } return false; };
  addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' || !active() || J.id !== null) return; if (interactive(e.target)) return;
    if (e.clientX > innerWidth * .48 || e.clientY < innerHeight * .2) return;
    J.id = e.pointerId; J.ox = e.clientX; J.oy = e.clientY; J.dx = J.dy = J.mag = 0;
    if (joy) { joy.style.left = J.ox + 'px'; joy.style.top = J.oy + 'px'; joy.style.display = 'block'; joy.firstChild.style.transform = 'translate(0,0)'; }
    try { touchMode = true; } catch (er) {}
  }, true);
  addEventListener('pointermove', function (e) {
    if (e.pointerId !== J.id) return; var R = 56, dx = e.clientX - J.ox, dy = e.clientY - J.oy, m = Math.hypot(dx, dy);
    if (m > R * 1.6) { J.ox += dx * (1 - R * 1.6 / m); J.oy += dy * (1 - R * 1.6 / m); dx = e.clientX - J.ox; dy = e.clientY - J.oy; m = Math.hypot(dx, dy); if (joy) { joy.style.left = J.ox + 'px'; joy.style.top = J.oy + 'px'; } } // the base follows a far thumb
    var k = m > R ? R / m : 1; J.dx = dx / R * k; J.dy = dy / R * k; J.mag = Math.min(1, m / R); if (joy) joy.firstChild.style.transform = 'translate(' + (dx * k) + 'px,' + (dy * k) + 'px)';
  }, true);
  var endJ = function (e) { if (e.pointerId !== J.id) return; J.id = null; J.dx = J.dy = J.mag = 0; if (joy) joy.style.display = 'none'; };
  addEventListener('pointerup', endJ, true); addEventListener('pointercancel', endJ, true);
  // ---------------------------------------------------------------- input
  var target = function (u, rng) {
    var t = null; try { if (typeof autoTarget === 'function') t = autoTarget(u); } catch (e) {}
    if (t && !t.dead && Math.hypot(t.x - u.x, t.y - u.y) <= rng) return t; t = null; var bd = rng * rng;
    for (var i = 0; i < G.units.length; i++) { var e2 = G.units[i]; if (e2.dead || e2.team === u.team || e2.team === 2 || e2.cloak > 0) continue; var d = (e2.x - u.x) * (e2.x - u.x) + (e2.y - u.y) * (e2.y - u.y); if (d < bd) { bd = d; t = e2; } }
    return t;
  };
  var hook = function () {
    if (window.__hkDim || typeof window.localInput !== 'function') return; window.__hkDim = 1; var li = window.localInput;
    var w = function (u) { var inp = li(u); try { if (!active() || !u || u !== meU()) return inp;
        var moving = J.id !== null && J.mag > .12;
        if (moving) { var r = (typeof camRot === 'function') ? camRot(J.dx, J.dy) : [J.dx, J.dy]; var mm = Math.hypot(r[0], r[1]) || 1, mg = Math.min(1, J.mag * 1.15);
          inp.mx = r[0] / mm * mg; inp.my = r[1] / mm * mg; var ang = Math.atan2(r[1], r[0]); if (u.layer > 0 && !(CL[u.cls] && CL[u.cls].hover)) inp.steer = ang; if (!ATK) inp.aim = ang; }
        var skill = held('a1') || held('a2') || held('ul') || held('ab');
        if (ATK || skill) { var rng = (u.w && u.w.range ? u.w.range : 700) * 1.15; var tg = target(u, Math.max(rng, held('a1') ? 1100 : 0));
          if (tg) { var la = (typeof leadAng === 'function') ? leadAng(u, tg, u.w ? u.w.spd : 1000) : Math.atan2(tg.y - u.y, tg.x - u.x); inp.aim = la; inp.tx = tg.x; inp.ty = tg.y;
            if (ATK && Math.hypot(tg.x - u.x, tg.y - u.y) < 240 && !(u.cd2 > 0) && (u.en == null || u.en >= 12)) inp.a2 = true; }  // up close the attack button also swings the saber
          else if (!moving) { inp.tx = u.x + Math.cos(inp.aim) * 650; inp.ty = u.y + Math.sin(inp.aim) * 650; }
          if (ATK) inp.fire = true; }
        if (held('a1')) inp.a1 = true; if (held('a2')) inp.a2 = true; if (held('ul')) inp.ul = true; if (held('ab')) inp.ab = true;
      } catch (e) { window.__dimErr = String(e).slice(0, 160); } return inp; };
    window.localInput = w;
  };
  // ---------------------------------------------------------------- show / layout
  var active = function () { return phone() && inBattle(); };
  var tick = function () {
    try { hook(); var on = active(); build(); var wrOn = document.body.classList.contains('wr');
      document.body.classList.toggle('dim', on && !wrOn); root.style.display = (on && !wrOn) ? 'block' : 'none'; hint.style.display = (on && J.id === null) ? 'block' : 'none'; if (!on && joy) joy.style.display = 'none';
      if (on) { var tu = document.getElementById('touchUI'); if (tu && tu.classList.contains('hidden')) tu.classList.remove('hidden'); } /* FLY, MORPH, AUTO, menu buttons live there - it used to appear only after the first touch on the 3D view */
      if (on && wrOn) setIcons(document.getElementById('wrSk')); /* 5v5 thumb cluster gets the pictures too */
      if (!on || wrOn) return; var s = Math.max(.6, Math.min(1, innerHeight / 560)); root.style.transform = 'scale(' + s + ')'; document.body.style.setProperty('--dimTop', Math.round(280 * s + 16) + 'px'); try { var bb = document.getElementById('skb2'); if (bb) { var bw = bb.scrollWidth || 640, room = innerWidth - 280 * s - 30; document.body.style.setProperty('--dimBar', String(Math.max(.5, Math.min(.85, room / Math.max(1, bw))))); } } catch (e) {} /* the item bar shrinks so it always ends before the thumb cluster */
      var u = meU(); if (!u) return; setCd('q', u.cd1 || 0, 6); setCd('e', u.cd2 || 0, 4); setIcons(root);
    } catch (e) { window.__dimErr = String(e).slice(0, 160); }
  };
  setInterval(tick, 250);
  // ---------------------------------------------------------------- pause / resume / home, on every device (phone, web app, PC)
  var pb = null, homeAdded = false;
  var pauseUI = function () {
    try {
      if (!pb) { pb = document.createElement('div'); pb.id = 'hkPause'; pb.textContent = 'Ⅱ'; pb.title = L2('일시정지 · 메뉴 (Esc)', 'Pause · menu (Esc)');
        pb.style.cssText = 'position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(150px);z-index:60;width:38px;height:38px;border-radius:50%;display:none;align-items:center;justify-content:center;font:900 15px sans-serif;color:#eaf3fc;background:rgba(6,10,20,.6);border:1.5px solid rgba(207,224,242,.45);cursor:pointer;touch-action:none;user-select:none';
        var go = function (ev) { ev.preventDefault(); ev.stopPropagation(); try { togglePause(); } catch (e) {} };
        pb.addEventListener('pointerdown', go, { passive: false }); document.body.appendChild(pb); }
      var inb = false; try { inb = !!(G && !G.over && G.local); } catch (e) {}
      var pz = document.getElementById('pause'); var pzOpen = pz && !pz.classList.contains('hidden');
      pb.style.display = (inb && !pzOpen) ? 'flex' : 'none';
      if (!homeAdded && pz) { var lv = document.getElementById('pzLeave'); if (lv) { homeAdded = true;
          var hm = document.createElement('button'); hm.id = 'pzHome'; hm.textContent = L2('홈으로', 'Home'); lv.parentNode.insertBefore(hm, lv.nextSibling);
          hm.onclick = function () { try { if (G) G.paused = false; leaveMatch(); } catch (e) {} try { document.querySelectorAll('.screen').forEach(function (s) { if (s.id !== 'menu' && !s.classList.contains('hidden') && /rpg|map|hub/i.test(s.id)) s.classList.add('hidden'); }); show('#menu'); refreshMenu(); } catch (e) {} };
          var rs = document.getElementById('pzResume'); if (rs && !rs.textContent) rs.textContent = L2('계속하기', 'Resume'); } }
    } catch (e) { window.__dimErr = String(e).slice(0, 160); }
  };
  setInterval(pauseUI, 300);
  // ---------------------------------------------------------------- frames must never disappear: no frustum culling on frame models
  // (skinned + compressed models can carry a too-small bounding sphere, so a frame vanished when it sat near the screen edge -
  // phones see this more because of their narrow, close camera). Only frames, a few dozen meshes at most.
  setInterval(function () { try { if (!window.R3 || !R3.units || !G) return; R3.units.forEach(function (e, id) { var m = e && e.mdl; if (!m || m._noCull) return; var u = null; for (var i = 0; i < G.units.length; i++) if (G.units[i].id === id) { u = G.units[i]; break; } if (!u || u.cls !== 'arkframe') return; m._noCull = 1; (m.wrap || m.obj).traverse(function (o) { if (o.isMesh) o.frustumCulled = false; }); }); } catch (e) {} }, 700);
})();
