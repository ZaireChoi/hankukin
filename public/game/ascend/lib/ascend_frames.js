/* ASCEND v4.04 — frames are EARNED, grade by grade; every frame gets its own identity (user 2026-11-24)
   · Summons no longer hand out frames (mech/premium summons now give frame parts + blueprints; gear, skills, squad upgrades unchanged).
   · Frame ladder: Common (AX-00 starter) -> Uncommon -> Rare -> Epic -> Legendary -> Mythic.
       To open the next grade: pilot level + blueprints. Then pick 1 of 3 frames of that grade.
         Uncommon PFC (Lv6) / 30   Rare Corporal (Lv12) / 60   Epic Master Sgt (Lv21) / 100   Legendary 2nd Lt (Lv30) / 160   Mythic Colonel (Lv45) / 250
       Blueprints: battle win +3 (loss +1), story chapter battle won +6, summons (by grade, premium x2).
       Players who already own higher frames keep them; their ladder starts at the best grade they own.
   · Launch event: AX-01 "Phoenix" for everyone who sorties 3 times before 2027-01-31.
   · Frame identity: each frame can carry its own name, tail number and emblem (shown on the panel and as a small
     emblem plate that floats at the frame's shoulder in battle), on top of the existing per-frame paint.
   UI: a "기체 승급" button on the expedition screen and the main menu. Wraps once: window.__hkFrames. */
(function () {
  'use strict';
  var A = function () { return window.__A; };
  var R = function () { try { return A().R(); } catch (e) { return null; } };
  var EN = function () { return typeof LANG !== 'undefined' && LANG === 'en'; };
  var L2 = function (k, e) { return EN() ? e : k; };
  var tx2 = function (o) { return o ? (EN() ? o.en : o.ko) || o.ko : ''; };
  var LADDER = [null, { lv: 6, rk: 2, bp: 30 }, { lv: 12, rk: 4, bp: 60 }, { lv: 21, rk: 7, bp: 100 }, { lv: 30, rk: 10, bp: 160 }, { lv: 45, rk: 15, bp: 250 }];   /* rank = level / 3: Uncommon PFC, Rare Corporal, Epic Master Sgt, Legendary 2nd Lt, Mythic Colonel */
  var rkName = function (i) { try { return typeof rankName === 'function' ? rankName(i) : 'R' + i; } catch (e) { return 'R' + i; } };
  var EVENT_END = Date.UTC(2027, 0, 31, 15, 0, 0); // 2027-01-31 24:00 KST
  var EMB = ['★', '◆', '▲', '✦', '⬢', '✚', '☄', '♞', '♛', '⚡', '❖', '✠'];
  var gradeName = function (i) { try { return tx2(A().RAR[i]); } catch (e) { return String(i); } };
  var tier = function (r) {
    if (r.ftier == null) { var M = A().MECHS, best = 0; (r.mechs || []).forEach(function (k) { var m = M[k]; if (m && !m.god && m.r > best) best = m.r; }); r.ftier = best; }
    return r.ftier;
  };
  var lv = function (r) { return r.lv || 1; };
  var fid = function (r, k) { r.fid = r.fid || {}; return r.fid[k] || (r.fid[k] = { nm: '', no: String(10 + Math.floor(Math.random() * 89)), em: EMB[Math.floor(Math.random() * EMB.length)] }); };
  // ------------------------------------------------------------------ panel
  var ov = null;
  var close = function () { if (ov) { ov.remove(); ov = null; } };
  var choose3 = function (r, g) { var M = A().MECHS, pool = Object.keys(M).filter(function (k) { return M[k].r === g && !M[k].god && (r.mechs || []).indexOf(k) < 0; }); for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; } return pool.slice(0, 3); };
  var open = function () {
    var r = R(); if (!r) return; close(); var t = tier(r), nx = t + 1, need = LADDER[nx], M = A().MECHS, cur = r.mech || 'saber0', id = fid(r, cur);
    ov = document.createElement('div'); ov.id = 'frLadder';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(3,6,12,.82);display:flex;align-items:center;justify-content:center;font-family:"Noto Sans KR",sans-serif;color:#e9eef6';
    var steps = ''; for (var i = 0; i <= 5; i++) { var on = i <= t; steps += '<div style="flex:1;text-align:center;padding:8px 2px;border-radius:8px;background:' + (on ? 'rgba(255,209,102,.18)' : 'rgba(255,255,255,.04)') + ';border:1px solid ' + (on ? 'rgba(255,209,102,.6)' : 'rgba(255,255,255,.08)') + '"><b style="color:' + ((A().RAR[i] || {}).c || '#fff') + '">' + gradeName(i) + '</b>' + (i && LADDER[i] ? '<div style="font-size:11px;opacity:.75">' + rkName(LADDER[i].rk) + ' · ' + LADDER[i].bp + '</div>' : '<div style="font-size:11px;opacity:.75">' + L2('시작', 'Start') + '</div>') + '</div>'; }
    var canUp = need && lv(r) >= need.lv && (r.bp || 0) >= need.bp;
    var evOn = Date.now() < EVENT_END && (r.mechs || []).indexOf('mech3') < 0, phx = r.phx || 0;
    var h = '<div style="width:min(720px,94vw);max-height:92vh;overflow:auto;background:#0c1220;border:1px solid rgba(255,209,102,.4);border-radius:16px;padding:18px 20px">' +
      '<div style="display:flex;align-items:center;gap:10px"><b style="font-size:20px">' + L2('기체 승급', 'Frame ladder') + '</b><span style="flex:1"></span><span>' + L2('설계도 조각', 'Blueprints') + ' <b style="color:#ffd166">' + (r.bp || 0) + '</b> · Lv' + lv(r) + '</span><button id="frX" style="all:unset;cursor:pointer;padding:4px 10px">✕</button></div>' +
      '<p style="font-size:13px;opacity:.8;margin:6px 0 12px">' + L2('기체는 뽑기로 나오지 않습니다. 일반형으로 싸우며 레벨과 설계도 조각을 모아 한 단계씩 올라가세요. 무기·방어·기술·분대 강화는 그대로입니다.', 'Frames do not come from summons. Fight in your basic frame, collect levels and blueprints, and climb one grade at a time. Weapon, defense, skill and squad upgrades stay as they are.') + '</p>' +
      '<div style="display:flex;gap:6px">' + steps + '</div>' +
      (need ? '<div style="margin:14px 0;padding:12px;border-radius:10px;background:rgba(255,255,255,.04)">' + L2('다음 단계', 'Next grade') + ' <b style="color:' + A().RAR[nx].c + '">' + gradeName(nx) + '</b> · ' + L2('필요', 'needs') + ' Lv' + need.lv + ' (' + L2('현재', 'now') + ' ' + lv(r) + ') · ' + L2('설계도', 'blueprints') + ' ' + need.bp + ' (' + (r.bp || 0) + ')' +
        '<div id="frPick" style="margin-top:10px">' + (canUp ? '<button id="frUp" style="all:unset;cursor:pointer;padding:8px 16px;border-radius:10px;background:#ffd166;color:#111;font-weight:800">' + L2('승급 시험 통과 · 기체 고르기', 'Pass the trial · choose a frame') + '</button>' : '<span style="opacity:.7">' + L2('조건을 채우면 같은 등급 기체 3종 중 1대를 고를 수 있습니다.', 'Meet the conditions to choose 1 of 3 frames of that grade.') + '</span>') + '</div></div>' : '<div style="margin:14px 0">' + L2('최고 등급에 도달했습니다.', 'Top grade reached.') + '</div>') +
      (evOn ? '<div style="margin:10px 0;padding:12px;border-radius:10px;border:1px solid rgba(255,107,107,.5);background:rgba(255,80,60,.08)"><b style="color:#ff8a6b">' + L2('출시 기념 행사', 'Launch event') + '</b> · ' + L2('3번 출격하면 AX-01 세이버 「불사조」 지급', 'Sortie 3 times to receive AX-01 Saber "Phoenix"') + ' (' + Math.min(3, phx) + '/3)' + (phx >= 3 ? ' <button id="frPhx" style="all:unset;cursor:pointer;margin-left:8px;padding:6px 12px;border-radius:8px;background:#ff6b6b;color:#fff;font-weight:800">' + L2('받기', 'Claim') + '</button>' : '') + '</div>' : '') +
      '<div style="margin-top:12px;padding:12px;border-radius:10px;background:rgba(255,255,255,.04)"><b>' + L2('내 기체의 표식', 'My frame\'s marks') + '</b> · <span style="opacity:.8">' + tx2((M[cur] || {}).n) + '</span>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center"><input id="frNm" maxlength="10" placeholder="' + L2('기체 이름 (예: 청룡)', 'Frame name (e.g. Blue Dragon)') + '" value="' + (id.nm || '').replace(/"/g, '') + '" style="flex:1;min-width:140px;padding:6px 8px;border-radius:8px;border:1px solid #334;background:#0a0f1a;color:#fff"><input id="frNo" maxlength="2" value="' + id.no + '" style="width:44px;padding:6px 8px;border-radius:8px;border:1px solid #334;background:#0a0f1a;color:#fff;text-align:center">' +
      '<span id="frEm">' + EMB.map(function (e) { return '<button data-e="' + e + '" style="all:unset;cursor:pointer;width:28px;height:28px;text-align:center;line-height:28px;border-radius:6px;margin:1px;background:' + (e === id.em ? '#ffd166;color:#111' : 'rgba(255,255,255,.06)') + '">' + e + '</button>'; }).join('') + '</span>' +
      '<button id="frSave" style="all:unset;cursor:pointer;padding:6px 14px;border-radius:8px;background:#5ab4ff;color:#04101e;font-weight:800">' + L2('저장', 'Save') + '</button></div>' +
      '<p style="font-size:12px;opacity:.7;margin:6px 0 0">' + L2('같은 기종이라도 이름·번호·엠블럼과 도색으로 내 기체가 구분됩니다. 전투에서는 어깨 옆에 엠블럼 표식이 뜹니다.', 'Same model, different frame: name, number, emblem and paint. In battle the emblem plate floats at the shoulder.') + '</p></div></div>';
    ov.innerHTML = h; document.body.appendChild(ov);
    ov.querySelector('#frX').onclick = close; ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    var emSel = id.em; ov.querySelectorAll('#frEm button').forEach(function (b) { b.onclick = function () { emSel = b.dataset.e; ov.querySelectorAll('#frEm button').forEach(function (x) { x.style.background = x.dataset.e === emSel ? '#ffd166' : 'rgba(255,255,255,.06)'; x.style.color = x.dataset.e === emSel ? '#111' : ''; }); }; });
    ov.querySelector('#frSave').onclick = function () { id.nm = String(ov.querySelector('#frNm').value || '').slice(0, 10); id.no = String(ov.querySelector('#frNo').value || '').replace(/\D/g, '').slice(0, 2) || id.no; id.em = emSel; A().saveP(); try { toast(L2('기체 표식을 저장했습니다', 'Frame marks saved'), 2000); } catch (e) {} window.__frPlateK = null; };
    var up = ov.querySelector('#frUp'); if (up) up.onclick = function () {
      var picks = choose3(r, nx); var box = ov.querySelector('#frPick');
      if (!picks.length) { r.ftier = nx; r.bp -= need.bp; A().saveP(); open(); return; }
      box.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap">' + picks.map(function (k) { return '<button data-k="' + k + '" style="all:unset;cursor:pointer;flex:1;min-width:150px;padding:10px;border-radius:10px;border:1px solid ' + A().RAR[nx].c + ';background:rgba(255,255,255,.04);text-align:center"><img src="models/thumbs/' + k + '.jpg" onerror="this.style.display=\'none\'" style="width:100%;max-width:150px;border-radius:8px"><div style="margin-top:6px;font-weight:800">' + tx2(M[k].n) + '</div><div style="font-size:12px;opacity:.75">' + tx2(M[k].ty) + '</div></button>'; }).join('') + '</div>';
      box.querySelectorAll('button[data-k]').forEach(function (b) { b.onclick = function () { var k = b.dataset.k; r.bp -= need.bp; r.ftier = nx; A().addUnit(k, false); r.mech = k; A().saveP(); try { A().render(); } catch (e) {} try { toast(L2(gradeName(nx) + ' 기체 「' + tx2(M[k].n) + '」 획득!', gradeName(nx) + ' frame "' + tx2(M[k].n) + '" acquired!'), 3200); } catch (e) {} open(); }; });
    };
    var ph = ov.querySelector('#frPhx'); if (ph) ph.onclick = function () { A().addUnit('mech3', false); r.phx = 99; A().saveP(); try { A().render(); } catch (e) {} try { toast(L2('AX-01 세이버 「불사조」를 받았습니다!', 'AX-01 Saber "Phoenix" received!'), 3200); } catch (e) {} open(); };
  };
  window.__frameLadder = open;
  // ------------------------------------------------------------------ entry buttons
  var btnTick = function () {
    var rp = document.getElementById('rpg'), mn = document.getElementById('menu');
    var host = rp && rp.offsetParent !== null ? rp.querySelector('.rh') : null;
    if (host && !host.querySelector('#frBtn')) { var b = document.createElement('button'); b.id = 'frBtn'; b.textContent = L2('기체 승급', 'Frame ladder'); b.style.cssText = 'padding:6px 12px;border-radius:10px;border:1px solid rgba(255,209,102,.6);background:rgba(255,209,102,.12);color:#ffd166;font-weight:800;cursor:pointer'; b.onclick = open; host.appendChild(b); }
    if (mn && mn.offsetParent !== null && !document.getElementById('frBtnM')) { var b2 = document.createElement('button'); b2.id = 'frBtnM'; b2.textContent = L2('기체 승급', 'Frame ladder'); b2.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:40;padding:8px 14px;border-radius:12px;border:1px solid rgba(255,209,102,.6);background:rgba(10,14,24,.8);color:#ffd166;font:800 13px "Noto Sans KR",sans-serif;cursor:pointer'; b2.onclick = open; document.body.appendChild(b2); }
    var b3 = document.getElementById('frBtnM'); if (b3) b3.style.display = mn && mn.offsetParent !== null ? '' : 'none';
  };
  // ------------------------------------------------------------------ blueprint income + launch-event counter
  var hookEnd = function () {
    if (window.__hkFrames || typeof endMatch !== 'function') return; window.__hkFrames = 1; var em = endMatch;
    endMatch = function (w) { var G0 = typeof G !== 'undefined' ? G : null, was = G0 && G0.over; var res = em.apply(this, arguments); try { if (G0 && !was) { var r = R(); if (r) { var win = G0.local && w === G0.local.team, g2 = (G0.rpg && win && !G0.rpg.quest) ? 6 : win ? 3 : 1; r.bp = (r.bp || 0) + g2; r.phx = Math.min(99, (r.phx || 0) + 1); A().saveP(); setTimeout(function () { try { toast(L2('설계도 조각 +' + g2, 'Blueprints +' + g2), 2200); } catch (e) {} }, 2600); } } } catch (e) {} return res; };
  };
  // ------------------------------------------------------------------ emblem plate at my frame's shoulder
  var plate = null, plateFor = null;
  var plateTick = function () {
    var G0 = typeof G !== 'undefined' ? G : null; if (!G0 || !G0.local || !G0.local.unit || !window.R3 || !R3.units) { if (plate && plate.parent) plate.parent.remove(plate); plate = null; return; }
    var u = G0.local.unit, e = R3.units.get(u.id), T = window.THREE; if (!e || !e.mdl || !e.mdl.obj || !T || u.cls !== 'arkframe') return;
    var r = R(); if (!r) return; var k = r.mech || 'saber0', id = fid(r, k), key = k + id.em + id.no + id.nm;
    if (plate && (plateFor !== e.mdl.obj || window.__frPlateK !== key)) { if (plate.parent) plate.parent.remove(plate); plate = null; }
    if (plate) { plate.visible = !(u.tf && u.tf.mode) && !u.dead && e.mdl.wrap.visible; return; }
    var bone = null; e.mdl.obj.traverse(function (o) { if (!bone && o.isBone && /^LeftArm$|left.?shoulder/i.test(o.name)) bone = o; }); if (!bone) return;
    var c = document.createElement('canvas'); c.width = 128; c.height = 64; var x = c.getContext('2d');
    x.fillStyle = 'rgba(8,12,20,.72)'; x.beginPath(); x.moveTo(8, 4); x.lineTo(120, 4); x.lineTo(124, 32); x.lineTo(120, 60); x.lineTo(8, 60); x.lineTo(4, 32); x.closePath(); x.fill(); x.strokeStyle = '#ffd166'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#ffd166'; x.font = 'bold 36px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(id.em, 34, 34); x.font = 'bold 30px Rajdhani, sans-serif'; x.fillStyle = '#fff'; x.fillText(id.no, 88, 34);
    var tex = new T.CanvasTexture(c); var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
    var wsv = new T.Vector3(); bone.getWorldScale(wsv); var s = 22 / Math.max(1e-4, wsv.x); sp.scale.set(s, s / 2, 1); sp.position.set(0, 0, 0); sp.renderOrder = 9; sp.userData.keep = 1; bone.add(sp); plate = sp; plateFor = e.mdl.obj; window.__frPlateK = key;
  };
  setInterval(function () { try { hookEnd(); btnTick(); plateTick(); } catch (e) { window.__framesErr = String(e && e.stack || e).slice(0, 200); } }, 700);
})();
