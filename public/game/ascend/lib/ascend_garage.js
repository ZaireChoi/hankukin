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
      '#garage .bpc{all:unset;cursor:pointer;padding:6px 12px;border:1px solid rgba(127,200,255,.55);background:rgba(20,60,120,.45);color:#cfe8ff;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);font:700 13px Rajdhani,"Noto Sans KR";letter-spacing:.04em;animation:bpg 2.4s ease-in-out infinite}@keyframes bpg{50%{box-shadow:0 0 14px rgba(127,200,255,.55);background:rgba(30,80,150,.6)}}' +
      '#grBp{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(2,6,14,.7)}#grBp .pp{position:relative;width:min(1180px,96vw);height:min(720px,90vh);background:#0b3570;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.13) 1px,transparent 1px);background-size:20px 20px,20px 20px,100px 100px,100px 100px;box-shadow:0 0 0 1px rgba(255,255,255,.25),0 30px 80px rgba(0,0,0,.6);overflow:hidden;font-family:"Noto Sans KR";color:#eaf4ff}' +
      '#grBp .frame{position:absolute;inset:14px;border:2px solid rgba(234,244,255,.75);pointer-events:none}#grBp .frame:after{content:"";position:absolute;inset:6px;border:1px solid rgba(234,244,255,.35)}#grBp canvas{position:absolute;left:24%;right:24%;top:40px;bottom:40px;width:52%;height:calc(100% - 80px)}#grBp .mk span{position:absolute;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;border:2px solid #ffd166;background:rgba(11,53,112,.85);color:#ffd166;font:800 12px Rajdhani;display:grid;place-items:center;pointer-events:none}' +
      '#grBp .hd{position:absolute;left:36px;top:30px}#grBp .hd small{font:700 11px Rajdhani;letter-spacing:.35em;opacity:.8}#grBp .hd b{display:block;font:800 28px Rajdhani,"Noto Sans KR";margin:4px 0}#grBp .hd span{font-size:13px}#grBp .parts{position:absolute;left:36px;top:150px;width:22%}#grBp .parts div{display:flex;gap:8px;align-items:center;margin:9px 0;font-size:13px;border-bottom:1px dashed rgba(234,244,255,.3);padding-bottom:6px}#grBp .parts i{font-style:normal;width:20px;height:20px;border-radius:50%;border:2px solid #ffd166;color:#ffd166;display:grid;place-items:center;font:800 11px Rajdhani;flex:0 0 auto}' +
      '#grBp .dim{position:absolute;left:23%;top:60px;bottom:60px;width:30px}#grBp .dim i{position:absolute;left:14px;top:0;bottom:0;border-left:1px solid #eaf4ff}#grBp .dim i:before,#grBp .dim i:after{content:"";position:absolute;left:-8px;width:16px;border-top:1px solid #eaf4ff}#grBp .dim i:before{top:0}#grBp .dim i:after{bottom:0}#grBp .dim span{position:absolute;left:-6px;top:50%;transform:rotate(-90deg) translate(0,-50%);transform-origin:left;white-space:nowrap;font:700 12px Rajdhani,"Noto Sans KR";background:#0b3570;padding:0 6px}' +
      '#grBp .tb{position:absolute;right:30px;bottom:30px;width:330px;display:grid;grid-template-columns:1fr 1fr;border:1.5px solid rgba(234,244,255,.8);background:rgba(11,53,112,.9)}#grBp .tb div{padding:6px 8px;border:.5px solid rgba(234,244,255,.45)}#grBp .tb small{display:block;font-size:10px;opacity:.75}#grBp .tb b{font:700 13px Rajdhani,"Noto Sans KR"}' +
      '#grBp .dec{position:absolute;right:30px;top:30px;width:300px;display:flex;flex-direction:column;gap:3px}#grBp .dec small{font:700 10.5px Rajdhani,"Noto Sans KR";letter-spacing:.25em;opacity:.85}#grBp .dec b{font:800 24px Rajdhani}#grBp .dec span{font-size:12px;opacity:.85}#grBp .dec .bar{height:8px;border:1px solid rgba(234,244,255,.6);margin-top:6px}#grBp .dec .bar em{display:block;height:100%;background:linear-gradient(90deg,#7fd8ff,#ffffff)}' +
      '#grBp .vw{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;gap:6px}#grBp .vw button{all:unset;cursor:pointer;padding:5px 14px;border:1px solid rgba(234,244,255,.6);font:700 12px "Noto Sans KR"}#grBp .vw button.on{background:#eaf4ff;color:#0b3570}#grBp .x{all:unset;cursor:pointer;position:absolute;right:30px;top:-2px;margin-top:0;width:34px;height:34px;display:none}' +
      '@media(max-width:900px){#grBp canvas{left:0;right:0;width:100%}#grBp .parts,#grBp .dim{display:none}#grBp .tb{width:auto;left:20px;right:20px;grid-template-columns:1fr 1fr 1fr}#grBp .dec{left:20px;right:20px;width:auto;top:100px}}' +
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
  // ------------------------------------------------------------------ v4.06: roster pictures are rendered from the frame's REAL model (the old thumbnails were concept art and some did not match, e.g. Crimson Striker)
  var TH = { r: null, s: null, c: null, q: [], busy: false };
  var thumbKey = function (k) { return 'grThumb2:' + k; };
  var thumbOf = function (k) { try { return localStorage.getItem(thumbKey(k)); } catch (e) { return null; } };
  window.__frThumb = function (k) { return thumbOf(k) || ('models/thumbs/' + k + '.jpg'); };
  var thumbPump = function () {
    if (TH.busy || !TH.q.length) return; var T = window.THREE; if (!T) return; TH.busy = true; var k = TH.q.shift();
    try { if (!TH.r) { var cv = document.createElement('canvas'); cv.width = cv.height = 192; TH.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true }); TH.r.outputColorSpace = T.SRGBColorSpace; TH.r.toneMapping = T.ACESFilmicToneMapping; TH.s = new T.Scene(); TH.s.add(new T.HemisphereLight(0xcfe0ff, 0x202030, 1.6)); var d = new T.DirectionalLight(0xffffff, 2.4); d.position.set(3, 6, 6); TH.s.add(d); var d2 = new T.DirectionalLight(0x7fd8ff, 1); d2.position.set(-5, 3, -4); TH.s.add(d2); TH.c = new T.PerspectiveCamera(28, 1, .1, 100); } } catch (e) { TH.busy = false; return; }
    var tries = 0; var go = function () { var i = null; try { i = mdlInstance(k, 0, 7.6, 'h'); } catch (e) {} if (!i) { if (++tries < 80) { setTimeout(go, 150); return; } TH.busy = false; thumbPump(); return; }
      try { i.wrap.rotation.y = .45; TH.s.add(i.wrap); var c = mdlGet(k); if (c && c.g && c.g.animations && c.g.animations.length) { var mx = new T.AnimationMixer(i.obj); var cl = c.g.animations.find(function (a) { return /idle/i.test(a.name); }) || c.g.animations[0]; mx.clipAction(cl).play(); mx.update(.3); }
        TH.c.position.set(0, 4.2, 17); TH.c.lookAt(0, 3.8, 0); TH.r.render(TH.s, TH.c); var url = TH.r.domElement.toDataURL('image/webp', .85); try { localStorage.setItem(thumbKey(k), url); } catch (e) {} TH.s.remove(i.wrap);
        document.querySelectorAll('#garage .fc[data-k="' + k + '"] img').forEach(function (im) { im.src = url; im.style.visibility = ''; }); } catch (e) {}
      TH.busy = false; setTimeout(thumbPump, 30); };
    go();
  };
  var thumbNeed = function (ks) { ks.forEach(function (k) { if (!thumbOf(k) && TH.q.indexOf(k) < 0) TH.q.push(k); }); thumbPump(); };
  // ------------------------------------------------------------------ roster
  var sel = null;
  var roster = function () {
    var r = A().R(), M = A().MECHS, RAR = A().RAR, box = document.querySelector('#garage .roster'); if (!box) return;
    var ks = (r.mechs || []).filter(function (k) { return M[k] && !M[k].god; }).sort(function (a, b) { return (M[b].r - M[a].r) || (a < b ? -1 : 1); });
    var h = '<div class="sec">' + L2('보유 기체', 'FRAMES') + ' ' + ks.length + '</div>';
    ks.forEach(function (k) { var m = M[k], g = RAR[m.r] || {}, fid = (r.fid || {})[k] || {}, lic = RK[m.r] || 0, ok = !window.__licenceOn || rankOf(r) >= lic || m.r === 0 || k === 'mech3', met = rankOf(r) >= lic || m.r === 0 || k === 'mech3';
      h += '<div class="fc' + (k === sel ? ' on' : '') + (ok ? '' : ' lock') + '" data-k="' + k + '" style="--g:' + g.c + '"><img src="' + (thumbOf(k) || 'models/thumbs/' + k + '.jpg') + '" style="background:radial-gradient(circle at 50% 40%,#1c2c48,#0a1020)"><div><b>' + esc(tx2(m.n)) + '</b><small style="color:' + g.c + '">' + esc(tx2(g)) + (fid.nm ? ' · 「' + esc(fid.nm) + '」' : '') + '</small>' + (met ? '' : '<small style="color:#ffb38a">' + L2('운용 자격 ', 'Licence ') + rkName(lic) + '</small>') + '</div>' + (k === r.mech ? '<span class="tag" style="color:#ffd166">' + L2('출격', 'ACTIVE') + '</span>' : '') + '</div>'; });
    box.innerHTML = h; thumbNeed(ks);
    box.querySelectorAll('.fc').forEach(function (d) { d.onclick = function () { var k = d.dataset.k; sel = k; var m = M[k], lic = RK[m.r] || 0, ok = !window.__licenceOn || rankOf(r) >= lic || m.r === 0 || k === 'mech3', met = rankOf(r) >= lic || m.r === 0 || k === 'mech3'; if (ok && r.mech !== k) { r.mech = k; A().saveP(); } showModel(k); sheet(k); box.querySelectorAll('.fc').forEach(function (x) { x.classList.toggle('on', x === d); var t = x.querySelector('.tag'); if (t) t.remove(); }); var cur = box.querySelector('.fc[data-k="' + r.mech + '"]'); if (cur && !cur.querySelector('.tag')) { var tg = document.createElement('span'); tg.className = 'tag'; tg.style.color = '#ffd166'; tg.textContent = L2('출격', 'ACTIVE'); cur.appendChild(tg); } }; });
  };
  // ------------------------------------------------------------------ v4.06: BLUEPRINT view (click the blueprint chip) - the frame drawn as a technical drawing
  var BP = { r: null, s: null, c: null, g: null, run: false, yaw: .5, drag: null, marks: [], view: 'spin' };
  var PARTS = [['Head', ['헤드 센서 유닛', 'Head sensor unit']], ['Spine02', ['흉부 반응로', 'Chest reactor']], ['LeftArm', ['견갑 추진 모듈', 'Shoulder thruster']], ['RightHand', ['무장 매니퓰레이터', 'Weapon manipulator']], ['Hips', ['고관절 구동계', 'Hip actuator']], ['LeftFoot', ['각부 완충 장치', 'Leg shock absorber']]];
  var bpBuild = function (k, done) {
    var T = window.THREE; var tries = 0;
    var go = function () { var i = null; try { i = mdlInstance(k, 0, 7.6, 'h'); } catch (e) {} if (!i) { if (++tries < 80) { setTimeout(go, 150); return; } done(null); return; }
      try { var c = mdlGet(k); if (c && c.g && c.g.animations && c.g.animations.length) { var mx = new T.AnimationMixer(i.obj); var cl = c.g.animations.find(function (a) { return /idle/i.test(a.name); }) || c.g.animations[0]; mx.clipAction(cl).play(); mx.update(.3); } } catch (e) {}
        try { i.wrap.updateMatrixWorld(true); var grp = new T.Group(), fill = new T.MeshBasicMaterial({ color: 0x1d5bb0, transparent: true, opacity: .35, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }), line = new T.LineBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: .9 }), v = new T.Vector3();
        i.obj.traverse(function (o) { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; var src = o.geometry, n = src.attributes.position.count, pos = new Float32Array(n * 3);
          for (var q = 0; q < n; q++) { if (o.isSkinnedMesh && o.getVertexPosition) o.getVertexPosition(q, v); else v.fromBufferAttribute(src.attributes.position, q); v.applyMatrix4(o.matrixWorld); pos[q * 3] = v.x; pos[q * 3 + 1] = v.y; pos[q * 3 + 2] = v.z; }
          var g2 = new T.BufferGeometry(); g2.setAttribute('position', new T.BufferAttribute(pos, 3)); if (src.index) g2.setIndex(src.index.clone());
          grp.add(new T.Mesh(g2, fill)); try { grp.add(new T.LineSegments(new T.EdgesGeometry(g2, 26), line)); } catch (e) {} });
        var marks = []; PARTS.forEach(function (p, ix) { var b = null; i.obj.traverse(function (o) { if (!b && o.isBone && o.name === p[0]) b = o; }); if (!b) return; var m = new T.Object3D(); b.getWorldPosition(m.position); grp.add(m); marks.push({ o: m, n: ix + 1, t: p[1] }); });
        var bb = new T.Box3().setFromObject(grp); done({ grp: grp, marks: marks, h: bb.max.y - bb.min.y, minY: bb.min.y }); } catch (e) { window.__bpErr = String(e).slice(0, 160); done(null); } };
    go();
  };
  var bpClose = function () { BP.run = false; var o = document.getElementById('grBp'); if (o) o.remove(); try { BP.r && BP.r.dispose(); } catch (e) {} BP.r = null; };
  var blueprint = function (k) {
    var T = window.THREE, r = A().R(), M = A().MECHS, m = M[k] || {}, RAR = A().RAR, g = RAR[m.r || 0] || {}; if (!T) return; bpClose();
    r.fsort = r.fsort || {}; var sorties = r.fsort[k] || 0, dec = Math.min(100, sorties * 10), nx = (r.ftier || 0) + 1, NEED = [0, 30, 60, 100, 160, 250];
    var code = (tx2(m.n).match(/^[A-Z]{2}-[0-9A-Z]{2}/) || ['FR-' + String(k).slice(0, 3).toUpperCase()])[0], hM = (16 + (m.r || 0) * .9 + (m.hp || 1) * 1.4).toFixed(1), wT = Math.round(38 + (m.hp || 1) * 22 + (m.r || 0) * 4);
    var o = document.createElement('div'); o.id = 'grBp';
    o.innerHTML = '<div class="pp"><canvas></canvas><div class="mk"></div>' +
      '<div class="frame"></div><div class="hd"><small>BLUEPRINT · ' + esc(code) + '-BP</small><b>' + esc(tx2(m.n)) + '</b><span style="color:' + g.c + '">' + esc(tx2(g)) + ' · ' + esc(tx2(m.ty)) + '</span></div>' +
      '<div class="dim"><i></i><span>' + L2('전고', 'Height') + ' ' + hM + ' m</span></div>' +
      '<div class="parts"></div>' +
      '<div class="tb"><div><small>' + L2('도면명', 'Title') + '</small><b>' + esc(tx2(m.n)) + '</b></div><div><small>' + L2('도면 번호', 'Drawing') + '</small><b>' + esc(code) + '-001</b></div><div><small>' + L2('축척', 'Scale') + '</small><b>1 : 120</b></div><div><small>' + L2('전고 / 중량', 'Height / Mass') + '</small><b>' + hM + ' m / ' + wT + ' t</b></div><div><small>' + L2('설계', 'Design') + '</small><b>' + L2('연합 기술국', 'United Tech Bureau') + '</b></div><div><small>' + L2('보안 등급', 'Clearance') + '</small><b style="color:' + g.c + '">' + esc(tx2(g)) + '</b></div></div>' +
      '<div class="dec"><small>' + L2('이 기종 설계 해독', 'DECODED FOR THIS FRAME') + '</small><div class="bar"><em style="width:' + dec + '%"></em></div><b>' + dec + '%</b><span>' + (dec >= 100 ? L2('개량 설계 완료 · 설계자 도색 해금', 'Refit plan complete · designer paint unlocked') : L2('이 기체로 출격할 때마다 +10%', '+10% each sortie in this frame') + ' (' + sorties + ')') + '</span>' +
      '<small style="margin-top:10px">' + L2('보유 설계도 조각', 'BLUEPRINTS ON HAND') + '</small><b style="color:#ffd166">' + (r.bp || 0) + (NEED[nx] ? ' / ' + NEED[nx] : '') + '</b><span>' + (NEED[nx] ? L2('다음 ' + tx2(RAR[nx]) + ' 기체 승급까지', 'toward the next ' + tx2(RAR[nx]) + ' frame') : L2('최고 등급', 'Top grade')) + '</span></div>' +
      '<div class="vw"><button data-v="front">' + L2('정면', 'Front') + '</button><button data-v="side">' + L2('측면', 'Side') + '</button><button data-v="spin" class="on">' + L2('회전', 'Rotate') + '</button></div><button class="x" id="bpX">✕</button></div>';
    document.getElementById('garage').appendChild(o);
    var cv = o.querySelector('canvas'); BP.r = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); BP.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); BP.s = new T.Scene(); BP.c = new T.OrthographicCamera(-1, 1, 1, -1, .1, 200); BP.view = 'spin';
    o.querySelector('#bpX').onclick = bpClose; o.querySelectorAll('.vw button').forEach(function (b) { b.onclick = function () { BP.view = b.dataset.v; BP.yaw = BP.view === 'front' ? 0 : BP.view === 'side' ? Math.PI / 2 : BP.yaw; o.querySelectorAll('.vw button').forEach(function (x) { x.classList.toggle('on', x === b); }); }; });
    cv.addEventListener('pointerdown', function (e) { BP.drag = { x: e.clientX, y: BP.yaw }; }); addEventListener('pointerup', function () { BP.drag = null; }); cv.addEventListener('pointermove', function (e) { if (BP.drag) { BP.yaw = BP.drag.y + (e.clientX - BP.drag.x) * .01; BP.view = 'free'; } });
    o.querySelector('.parts').innerHTML = PARTS.map(function (p, i) { return '<div><i>' + (i + 1) + '</i>' + esc(tx2({ ko: p[1][0], en: p[1][1] })) + '</div>'; }).join('');
    bpBuild(k, function (res) {
      if (!res || !document.getElementById('grBp')) return; BP.g = new T.Group(); BP.g.add(res.grp); BP.s.add(BP.g); BP.marks = res.marks; var H = res.h, cy = res.minY + H / 2;
      var mk = o.querySelector('.mk'); mk.innerHTML = res.marks.map(function (m) { return '<span data-n="' + m.n + '">' + m.n + '</span>'; }).join('');
      BP.run = true; var last = performance.now(), v = new T.Vector3();
      var loop = function () { if (!BP.run || !document.getElementById('grBp')) return; var n = performance.now(), dt = Math.min(.05, (n - last) / 1000); last = n; if (BP.view === 'spin' && !BP.drag) BP.yaw += dt * .35;
        var w = cv.clientWidth, h = cv.clientHeight; if (w && h) { BP.r.setSize(w, h, false); var asp = w / h, half = H * .62; BP.c.left = -half * asp; BP.c.right = half * asp; BP.c.top = half; BP.c.bottom = -half; BP.c.position.set(0, cy, 40); BP.c.lookAt(0, cy, 0); BP.c.updateProjectionMatrix(); }
        BP.g.rotation.y = BP.yaw; BP.g.updateMatrixWorld(true); BP.r.render(BP.s, BP.c);
        BP.marks.forEach(function (m) { m.o.getWorldPosition(v); v.project(BP.c); var el = mk.querySelector('span[data-n="' + m.n + '"]'); if (el) { el.style.left = (cv.offsetLeft + (v.x + 1) / 2 * w) + 'px'; el.style.top = (cv.offsetTop + (1 - v.y) / 2 * h) + 'px'; } });
        requestAnimationFrame(loop); };
      requestAnimationFrame(loop); });
  };
  // ------------------------------------------------------------------ open / close
  var close = function () { var g = document.getElementById('garage'); if (g) g.remove(); V.key = ''; V.m = null; };
  var open = function () {
    if (!A() || !A().R) return; css(); close(); var r = A().R(); sel = r.mech || 'saber0';
    var g = document.createElement('div'); g.id = 'garage';
    g.innerHTML = '<div class="bg"></div><div class="vg"></div><div class="scan"></div><div class="top"><div class="ttl"><small>HANGAR · BAY 07</small><b>' + L2('격납고', 'Hangar') + '</b></div><span style="flex:1"></span><span class="chip">' + L2('계급', 'Rank') + ' ' + esc(rkName(rankOf(r))) + ' · Lv' + (r.lv || 1) + '</span><button class="chip bpc" id="grBpBtn" title="' + L2('이 기종의 설계도 보기', 'View this frame\'s blueprint') + '">▦ ' + L2('설계도', 'Blueprint') + ' ' + (r.bp || 0) + '</button><button class="x" id="grX" title="' + L2('닫기', 'Close') + '">✕</button></div><div class="roster"></div><canvas></canvas><div class="name"></div><div class="sheet"></div>';
    document.body.appendChild(g); g.querySelector('#grX').onclick = close; g.querySelector('#grBpBtn').onclick = function () { blueprint(sel || r.mech); };
    roster(); sheet(sel); if (bay(g.querySelector('canvas'))) showModel(sel);
  };
  window.__garage = open;
  // the lobby dock "정비소" opens the hangar
  var mine = function () { open(); };
  var hook = function () { var b = document.getElementById('mHangar'); if (!b || b.onclick === mine) return; b.onclick = mine; };   /* replace the dock button's own handler (a listener would run after it and open both screens) */
  setInterval(function () { try { hook(); } catch (e) {} }, 800);
  addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; if (document.getElementById('grBp')) { bpClose(); return; } if (document.getElementById('garage')) close(); });
  document.addEventListener('click', function (e) { var o = document.getElementById('grBp'); if (o && e.target === o) bpClose(); });
})();
