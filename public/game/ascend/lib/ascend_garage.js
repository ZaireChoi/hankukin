/* ASCEND v4.05 — HANGAR (격납고): the frame screen rebuilt like a console mech game garage (user 2026-11-24:
   "clicking a frame in the hangar does not change the one on top, clicks are slow, the screens look amateur").
   Layout: roster on the left (grade stripe, rank licence, in-service tag) · the frame itself in the middle on a lit bay
   (slow turntable, drag to turn, idle animation) · spec sheet on the right (grade, role, bars, Q/E/R kit, marks) ·
   actions: Sortie with this frame / Paint & marks / Equipment.
   Clicking a frame applies it at once and swaps only the model and the sheet - no full-page redraw.
   Opens from the lobby dock "정비소" button (the old equipment page stays one click away). Wraps once: window.__hkGarage. */
(function () {
  'use strict';
  var A = function () { return window.__A; };
  var EN = function () { return typeof LANG !== 'undefined' && LANG === 'en'; };
  var L2 = function (k, e) { return EN() ? e : k; };
  var tx2 = function (o) { return o ? (EN() ? o.en : o.ko) || o.ko : ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); };
  var RK = [0, 2, 4, 7, 10, 15]; // rank licence per grade (rank = level / 3)
  var rankOf = function (r) { return Math.floor((r.lv || 1) / 3); };
  var rkName = function (i) { try { return rankName(i); } catch (e) { return 'R' + i; } };
  var css = function () {
    if (document.getElementById('grCss')) return; var s = document.createElement('style'); s.id = 'grCss';
    s.textContent = '#garage{position:fixed;inset:0;z-index:9300;color:#e8eef7;font-family:"Noto Sans KR",sans-serif;overflow:hidden;background:#05080f}' +
      '#garage .bg{position:absolute;inset:-20px;background:url(bg/hangar.jpg) center/cover;filter:blur(7px) brightness(.32) saturate(.8);transform:scale(1.05)}' +
      '#garage .vg{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,rgba(10,20,40,0) 0%,rgba(4,7,14,.55) 55%,rgba(2,4,8,.95) 100%),linear-gradient(180deg,rgba(2,4,8,.7),transparent 18%,transparent 78%,rgba(2,4,8,.9))}' +
      '#garage .scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px)}' +
      '#garage .top{position:absolute;left:0;right:0;top:0;height:64px;display:flex;align-items:center;gap:14px;padding:0 26px;z-index:3}' +
      '#garage .ttl{display:flex;flex-direction:column;line-height:1}#garage .ttl small{font:600 11px Rajdhani,sans-serif;letter-spacing:.42em;color:#ffd166;opacity:.9}#garage .ttl b{font:800 24px "Noto Sans KR";letter-spacing:.04em}' +
      '#garage .chip{padding:6px 12px;border:1px solid rgba(255,255,255,.14);background:rgba(8,12,22,.6);clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);font:700 13px Rajdhani,"Noto Sans KR";letter-spacing:.04em}' +
      '#garage .x{all:unset;cursor:pointer;width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);background:rgba(8,12,22,.6)}' +
      '#garage .roster{position:absolute;left:22px;top:84px;bottom:22px;width:268px;overflow:auto;z-index:3;padding-right:4px}' +
      '#garage .sec{font:700 11px Rajdhani,"Noto Sans KR";letter-spacing:.3em;color:#8fb2d6;margin:4px 0 8px;display:flex;align-items:center;gap:8px}#garage .sec:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(143,178,214,.4),transparent)}' +
      '#garage .fc{position:relative;display:flex;gap:10px;align-items:center;padding:8px 10px 8px 14px;margin-bottom:8px;cursor:pointer;background:linear-gradient(90deg,rgba(14,22,38,.85),rgba(10,16,28,.6));border:1px solid rgba(255,255,255,.07);clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%);transition:transform .12s,background .12s}' +
      '#garage .fc:hover{transform:translateX(3px);background:linear-gradient(90deg,rgba(24,36,60,.9),rgba(12,20,34,.7))}#garage .fc:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--g)}' +
      '#garage .fc.on{background:linear-gradient(90deg,rgba(255,209,102,.16),rgba(12,20,34,.7));border-color:rgba(255,209,102,.55)}#garage .fc img{width:52px;height:52px;object-fit:cover;border-radius:4px;background:#0a1020}' +
      '#garage .fc b{display:block;font-size:13px}#garage .fc small{display:block;font-size:11px;opacity:.75}#garage .fc .tag{position:absolute;right:8px;top:6px;font:700 10px Rajdhani,"Noto Sans KR";padding:1px 6px;border:1px solid currentColor;letter-spacing:.06em}' +
      '#garage .lock{filter:grayscale(.7);opacity:.75}' +
      '#garage canvas{position:absolute;left:290px;right:360px;top:64px;bottom:120px;z-index:2;cursor:grab;width:calc(100% - 650px);height:calc(100% - 184px)}' +
      '#garage .name{position:absolute;left:290px;right:360px;bottom:28px;z-index:3;text-align:center;pointer-events:none}#garage .name .gd{font:700 12px Rajdhani,"Noto Sans KR";letter-spacing:.35em}#garage .name b{display:block;font:800 34px Rajdhani,"Noto Sans KR";letter-spacing:.03em;text-shadow:0 2px 18px rgba(0,0,0,.8)}#garage .name .nick{font-size:13px;color:#ffd166;letter-spacing:.08em}' +
      '#garage .sheet{position:absolute;right:22px;top:84px;bottom:22px;width:330px;z-index:3;display:flex;flex-direction:column;gap:10px;overflow:auto}' +
      '#garage .pn{background:linear-gradient(180deg,rgba(12,18,32,.88),rgba(8,12,22,.78));border:1px solid rgba(255,255,255,.08);padding:14px 16px;clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px)}' +
      '#garage .bar{display:grid;grid-template-columns:62px 1fr 44px;align-items:center;gap:8px;margin:7px 0;font-size:12px}#garage .bar i{display:block;height:6px;background:rgba(255,255,255,.08);position:relative}#garage .bar i em{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#5ab4ff,#bff0ff)}#garage .bar span{text-align:right;font:700 13px Rajdhani}' +
      '#garage .sk{display:flex;gap:10px;align-items:center;margin:6px 0;font-size:13px}#garage .sk kbd{min-width:26px;height:26px;display:grid;place-items:center;font:800 13px Rajdhani;border:1px solid rgba(255,209,102,.6);color:#ffd166;background:rgba(255,209,102,.08)}' +
      '#garage .act{display:grid;gap:8px;margin-top:auto}#garage .act button{all:unset;cursor:pointer;text-align:center;padding:12px 10px;font:800 15px "Noto Sans KR";letter-spacing:.04em;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}' +
      '#garage .act .go{background:linear-gradient(180deg,#ffe08a,#e6a93a);color:#141008}#garage .act .sub{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}#garage .act .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '@media(max-width:900px){#garage .roster{width:150px;left:8px}#garage .fc img{display:none}#garage canvas{left:160px;right:0;width:calc(100% - 160px);bottom:300px;height:auto}#garage .name{left:160px;right:0;bottom:300px}#garage .sheet{left:160px;right:8px;top:auto;height:290px;width:auto;bottom:8px;overflow:auto}}';
    document.head.appendChild(s);
  };
  // ------------------------------------------------------------------ 3D bay
  var V = { r: null, s: null, c: null, m: null, mixer: null, key: '', yaw: .4, drag: null, run: false, cv: null, t0: 0 };
  var bay = function (cv) {
    var T = window.THREE; if (!T) return false;
    if (!V.r || V.cv !== cv) {
      try { if (V.r) V.r.dispose(); } catch (e) {}
      V.cv = cv; V.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); V.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); V.r.outputColorSpace = T.SRGBColorSpace; V.r.toneMapping = T.ACESFilmicToneMapping; V.r.toneMappingExposure = .95;
      V.s = new T.Scene(); V.s.add(new T.HemisphereLight(0xbcd4ff, 0x1a1410, 1.4)); try { var X = window.__TX; if (X && X.RoomEnvironment) V.s.environment = new T.PMREMGenerator(V.r).fromScene(new X.RoomEnvironment(), .04).texture; V.s.environmentIntensity = .35; } catch (e) {}
      var key = new T.SpotLight(0xffffff, 260, 0, .5, .7, 1.4); key.position.set(0, 22, 8); key.target.position.set(0, 3, 0); V.s.add(key); V.s.add(key.target);
      var rim = new T.DirectionalLight(0x6fd8ff, 1.6); rim.position.set(-8, 6, -8); V.s.add(rim); var warm = new T.DirectionalLight(0xffb36b, 1.1); warm.position.set(8, 4, 4); V.s.add(warm);
      // platform: dark hex deck with a thin lit edge and hazard ring
      var deck = new T.Mesh(new T.CylinderGeometry(4.6, 4.9, .35, 6), new T.MeshStandardMaterial({ color: 0x1a2230, metalness: .8, roughness: .35 })); deck.position.y = -.18; V.s.add(deck);
      var edge = new T.Mesh(new T.TorusGeometry(4.75, .035, 6, 6), new T.MeshBasicMaterial({ color: 0x7fe8ff })); edge.rotation.x = Math.PI / 2; edge.rotation.z = Math.PI / 6; edge.position.y = .01; V.s.add(edge);
      var cone = new T.Mesh(new T.ConeGeometry(4.2, 16, 32, 1, true), new T.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: .05, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })); cone.position.y = 8; V.s.add(cone);
      V.c = new T.PerspectiveCamera(30, 1, .1, 200);
      cv.addEventListener('pointerdown', function (e) { V.drag = { x: e.clientX, y: V.yaw }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
      cv.addEventListener('pointermove', function (e) { if (V.drag) V.yaw = V.drag.y + (e.clientX - V.drag.x) * .01; });
      cv.addEventListener('pointerup', function () { V.drag = null; cv.style.cursor = 'grab'; });
    }
    if (!V.run) { V.run = true; var last = performance.now(); var loop = function () { if (!document.getElementById('garage')) { V.run = false; return; } var n = performance.now(), dt = Math.min(.05, (n - last) / 1000); last = n; if (!V.drag) V.yaw += dt * .25; var w = cv.clientWidth, h = cv.clientHeight; if (w && h && (cv.width !== Math.round(w * V.r.getPixelRatio()) || cv.height !== Math.round(h * V.r.getPixelRatio()))) { V.r.setSize(w, h, false); V.c.aspect = w / h; V.c.updateProjectionMatrix(); } if (V.m) V.m.wrap.rotation.y = V.yaw; if (V.mixer) V.mixer.update(dt); V.c.position.set(0, 5.4, 21); V.c.lookAt(0, 3.9, 0); V.r.render(V.s, V.c); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
    return true;
  };
  var showModel = function (k) {
    var T = window.THREE; if (!V.s || !T) return; if (V.key === k && V.m) return; V.key = k;
    if (V.m) { V.s.remove(V.m.wrap); V.m = null; V.mixer = null; }
    var tries = 0; var put = function () { if (V.key !== k) return; var i = null; try { i = mdlInstance(k, 0, 7.6, 'h'); } catch (e) {} if (!i) { if (++tries < 60) setTimeout(put, 150); return; } V.m = i; V.s.add(i.wrap);
      try { var c = mdlGet(k); if (c && c.g && c.g.animations && c.g.animations.length) { V.mixer = new T.AnimationMixer(i.obj); var cl = c.g.animations.find(function (a) { return /idle/i.test(a.name); }) || c.g.animations[0]; V.mixer.clipAction(cl).play(); } } catch (e) {}
      try { var r = A().R(), pk = r.psel && r.psel[k]; if (pk && typeof custMat === 'function') {} } catch (e) {} };
    put();
  };
  // ------------------------------------------------------------------ sheet
  var kitRows = function (k) { var o = (window.__SK2KIT || {})[k] || {}, T2 = window.__SK2T || {}, out = ''; ['q', 'e', 'r'].forEach(function (s) { var id = o[s]; if (!id || !T2[id]) return; out += '<div class="sk"><kbd>' + s.toUpperCase() + '</kbd><span>' + esc(tx2(T2[id].n)) + '</span></div>'; }); if (!out) out = '<div class="sk"><kbd>Q</kbd><span>' + L2('손바닥 레이저', 'Palm laser') + '</span></div><div class="sk"><kbd>E</kbd><span>' + L2('빔 세이버', 'Beam saber') + '</span></div><div class="sk"><kbd>R</kbd><span>' + L2('군집 미사일', 'Missile swarm') + '</span></div>'; return out + '<div class="sk"><kbd>T</kbd><span>' + L2('절대 기술', 'Absolute art') + '</span></div>'; };
  var bar = function (lab, v, max) { var p = Math.max(4, Math.min(100, v / max * 100)); return '<div class="bar"><span style="text-align:left;font:500 12px \'Noto Sans KR\'">' + lab + '</span><i><em style="width:' + p.toFixed(0) + '%"></em></i><span>' + v.toFixed(2) + '</span></div>'; };
  var sheet = function (k) {
    var r = A().R(), M = A().MECHS, m = M[k] || {}, RAR = A().RAR, g = RAR[m.r || 0] || {}, fid = (r.fid || {})[k] || {}, lic = RK[m.r || 0] || 0, ok = !window.__licenceOn || rankOf(r) >= lic || m.r === 0 || k === 'mech3', met = rankOf(r) >= lic || m.r === 0 || k === 'mech3';
    var el = document.querySelector('#garage .sheet'); if (!el) return;
    el.innerHTML = '<div class="pn"><div class="sec">' + L2('기체 제원', 'SPECIFICATION') + '</div><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15px;color:' + g.c + '">' + esc(tx2(g)) + '</b><span style="font-size:12px;opacity:.75">' + esc(tx2(m.ty)) + '</span></div>' +
      bar(L2('내구', 'Armor'), m.hp || 1, 1.6) + bar(L2('화력', 'Power'), m.dmg || 1, 1.6) + bar(L2('기동', 'Mobility'), m.spd || 1, 1.4) + bar(L2('재사용', 'Recharge'), 2 - (m.cd || 1), 1.3) +
      '<div style="font-size:12px;margin-top:8px;color:' + (met ? '#9fe8b0' : '#ffb38a') + '">' + L2('운용 자격', 'Licence') + ': ' + (m.r === 0 || k === 'mech3' ? L2('제한 없음 (특수·기본 기종)', 'None (special / basic)') : rkName(lic) + ' ' + L2('이상', 'or above') + (met ? '' : L2(' · 정식 출시 때 적용', ' · from launch'))) + '</div></div>' +
      '<div class="pn"><div class="sec">' + L2('전투 기술', 'COMBAT KIT') + '</div>' + kitRows(k) + '</div>' +
      '<div class="pn"><div class="sec">' + L2('기체 표식', 'MARKS') + '</div><div style="display:flex;align-items:center;gap:12px"><span style="font-size:28px;color:#ffd166">' + esc(fid.em || '★') + '</span><div><b>' + esc(fid.nm || L2('이름 없음', 'Unnamed')) + '</b><div style="font:700 14px Rajdhani;opacity:.8">No. ' + esc(fid.no || '--') + '</div></div></div></div>' +
      '<div class="act"><button class="go" id="grGo">' + (r.mech === k ? L2('출격 기체로 지정됨', 'In service') : L2('이 기체로 출격', 'Sortie with this frame')) + '</button><div class="row"><button class="sub" id="grPaint">' + L2('도색·표식', 'Paint & marks') + '</button><button class="sub" id="grEq">' + L2('장비 정비', 'Equipment') + '</button></div><button class="sub" id="grLad">' + L2('기체 승급', 'Frame ladder') + '</button></div>';
    var nm = document.querySelector('#garage .name'); if (nm) nm.innerHTML = '<div class="gd" style="color:' + g.c + '">' + esc(tx2(g)).toUpperCase() + ' · ' + esc(tx2(m.ty)) + '</div><b>' + esc(tx2(m.n)) + '</b><div class="nick">' + (fid.nm ? '「' + esc(fid.nm) + '」 ' : '') + (fid.em || '') + ' ' + (fid.no || '') + '</div>';
    el.querySelector('#grGo').onclick = function () { if (!ok) { try { toast(L2('운용 자격이 부족합니다: ' + rkName(lic) + ' 이상', 'Licence required: ' + rkName(lic)), 2600); } catch (e) {} return; } r.mech = k; A().saveP(); roster(); sheet(k); try { toast(L2('출격 기체: ', 'In service: ') + tx2(m.n), 1800); } catch (e) {} };
    el.querySelector('#grPaint').onclick = function () { try { if (window.__frameLadder) window.__frameLadder(); } catch (e) {} };
    el.querySelector('#grLad').onclick = function () { try { if (window.__frameLadder) window.__frameLadder(); } catch (e) {} };
    el.querySelector('#grEq').onclick = function () { close(); try { var h = document.getElementById('mRpg'); if (h) h.click(); setTimeout(function () { try { A().tab = 'hangar'; A().render(); } catch (e) {} }, 400); } catch (e) {} };
  };
  // ------------------------------------------------------------------ roster
  var sel = null;
  var roster = function () {
    var r = A().R(), M = A().MECHS, RAR = A().RAR, box = document.querySelector('#garage .roster'); if (!box) return;
    var ks = (r.mechs || []).filter(function (k) { return M[k] && !M[k].god; }).sort(function (a, b) { return (M[b].r - M[a].r) || (a < b ? -1 : 1); });
    var h = '<div class="sec">' + L2('보유 기체', 'FRAMES') + ' ' + ks.length + '</div>';
    ks.forEach(function (k) { var m = M[k], g = RAR[m.r] || {}, fid = (r.fid || {})[k] || {}, lic = RK[m.r] || 0, ok = !window.__licenceOn || rankOf(r) >= lic || m.r === 0 || k === 'mech3', met = rankOf(r) >= lic || m.r === 0 || k === 'mech3';
      h += '<div class="fc' + (k === sel ? ' on' : '') + (ok ? '' : ' lock') + '" data-k="' + k + '" style="--g:' + g.c + '"><img src="models/thumbs/' + k + '.jpg" onerror="this.style.visibility=\'hidden\'"><div><b>' + esc(tx2(m.n)) + '</b><small style="color:' + g.c + '">' + esc(tx2(g)) + (fid.nm ? ' · 「' + esc(fid.nm) + '」' : '') + '</small>' + (met ? '' : '<small style="color:#ffb38a">' + L2('운용 자격 ', 'Licence ') + rkName(lic) + '</small>') + '</div>' + (k === r.mech ? '<span class="tag" style="color:#ffd166">' + L2('출격', 'ACTIVE') + '</span>' : '') + '</div>'; });
    box.innerHTML = h;
    box.querySelectorAll('.fc').forEach(function (d) { d.onclick = function () { var k = d.dataset.k; sel = k; var m = M[k], lic = RK[m.r] || 0, ok = !window.__licenceOn || rankOf(r) >= lic || m.r === 0 || k === 'mech3', met = rankOf(r) >= lic || m.r === 0 || k === 'mech3'; if (ok && r.mech !== k) { r.mech = k; A().saveP(); } showModel(k); sheet(k); box.querySelectorAll('.fc').forEach(function (x) { x.classList.toggle('on', x === d); var t = x.querySelector('.tag'); if (t) t.remove(); }); var cur = box.querySelector('.fc[data-k="' + r.mech + '"]'); if (cur && !cur.querySelector('.tag')) { var tg = document.createElement('span'); tg.className = 'tag'; tg.style.color = '#ffd166'; tg.textContent = L2('출격', 'ACTIVE'); cur.appendChild(tg); } }; });
  };
  // ------------------------------------------------------------------ open / close
  var close = function () { var g = document.getElementById('garage'); if (g) g.remove(); V.key = ''; V.m = null; };
  var open = function () {
    if (!A() || !A().R) return; css(); close(); var r = A().R(); sel = r.mech || 'saber0';
    var g = document.createElement('div'); g.id = 'garage';
    g.innerHTML = '<div class="bg"></div><div class="vg"></div><div class="scan"></div><div class="top"><div class="ttl"><small>HANGAR · BAY 07</small><b>' + L2('격납고', 'Hangar') + '</b></div><span style="flex:1"></span><span class="chip">' + L2('계급', 'Rank') + ' ' + esc(rkName(rankOf(r))) + ' · Lv' + (r.lv || 1) + '</span><span class="chip">' + L2('설계도', 'Blueprints') + ' ' + (r.bp || 0) + '</span><button class="x" id="grX" title="' + L2('닫기', 'Close') + '">✕</button></div><div class="roster"></div><canvas></canvas><div class="name"></div><div class="sheet"></div>';
    document.body.appendChild(g); g.querySelector('#grX').onclick = close;
    roster(); sheet(sel); if (bay(g.querySelector('canvas'))) showModel(sel);
  };
  window.__garage = open;
  // the lobby dock "정비소" opens the hangar
  var mine = function () { open(); };
  var hook = function () { var b = document.getElementById('mHangar'); if (!b || b.onclick === mine) return; b.onclick = mine; };   /* replace the dock button's own handler (a listener would run after it and open both screens) */
  setInterval(function () { try { hook(); } catch (e) {} }, 800);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('garage')) close(); });
})();
