/* ASCEND v3.64 — FRAME SKILL ENGINE: every frame has its own Q / E / R, and the skill bar shows the frame you fly
   · the 12 base frames keep their hand-made kits; the 33 newer frames used to borrow a base frame's kit wholesale (six frames
     shared one) — each now gets its own three skills, picked from its role's pool so no two frames share the same set
   · the bar's Q / E / R icons, names, tooltips and colours follow the current frame (they were always "palm laser / beam saber /
     missile swarm"), refreshed when you change frames or start a battle
   · icons are drawn once per skill (small canvas, cached), no network, no per-frame cost */
(function () {
  'use strict';
  var KIT = null, SKD = null, SKB = null; var myMechKey = function () { return window.__myMechKey ? window.__myMechKey() : 'mech3'; };
  var bind = function () { KIT = window.__KIT || null; SKD = window.__SKD || null; SKB = window.__SKB || null; return !!KIT; };
  var Kx = function (ko, en) { return { ko: ko, en: en }; };
  var tr = function (o) { try { return typeof tx === 'function' ? tx(o) : (o.ko || o); } catch (e) { return o && o.ko || ''; } };
  // ---------------------------------------------------------------- skill catalogue: look, words (names fall back to the game's own)
  var CAT = {
    flash: ['dash', Kx('적에게 번개처럼 돌진해 베어 가릅니다.', 'Blink to a foe and cut through.')],
    fivecut: ['slash', Kx('눈앞의 적을 다섯 번 연속으로 벱니다.', 'Five rapid cuts on the foe in front.')],
    bladefall: ['slash', Kx('하늘에서 검의 비를 쏟아 넓은 범위를 벱니다.', 'Rain blades over a wide area.')],
    railshot: ['shot', Kx('일직선의 적을 모두 꿰뚫는 레일 사격.', 'A rail shot that pierces a whole line.')],
    backstep: ['dash', Kx('뒤로 크게 도약해 거리를 벌립니다.', 'Leap far back to open distance.')],
    satsnipe: ['orbital', Kx('위성이 표적 한 명을 정밀 저격합니다.', 'A satellite snipes one marked foe.')],
    mortar: ['blast', Kx('박격포 세 발이 목표 지점에 떨어집니다.', 'Three mortar shells land on the target area.')],
    deploy: ['buff', Kx('포대를 고정해 사거리와 화력을 올립니다.', 'Brace for range and firepower.')],
    carpet: ['blast', Kx('넓은 띠를 따라 포탄을 쏟아 붓습니다.', 'A carpet of shells along a wide strip.')],
    bash: ['shield', Kx('방패로 들이받아 적을 밀치고 기절시킵니다.', 'Ram with the shield, knocking back and stunning.')],
    dome: ['shield', Kx('아군을 덮는 에너지 방벽을 세웁니다.', 'Raise an energy dome over allies.')],
    aegis: ['shield', Kx('주변 아군에게 강한 보호막을 겹니다.', 'Strong shields on nearby allies.')],
    quake: ['quake', Kx('지면을 내리쳐 주변 적을 띄웁니다.', 'Smash the ground and launch nearby foes.')],
    armor: ['buff', Kx('잠시 받는 피해를 크게 줄입니다.', 'Briefly cut damage taken sharply.')],
    titanfall: ['quake', Kx('높이 뛰어올라 거대한 충격으로 내려찍습니다.', 'Leap and crash down with a huge impact.')],
    dive: ['dash', Kx('공중에서 급강하하며 폭격합니다.', 'Dive from the air and bomb the spot.')],
    roll: ['dash', Kx('공중 회전으로 공격을 흘려 냅니다.', 'Barrel roll that slips past attacks.')],
    mstorm: ['missile', Kx('어깨에서 미사일 폭풍을 쏟아냅니다.', 'A storm of missiles from the shoulder pods.')],
    gale: ['dash', Kx('질풍처럼 세 번 연달아 돌진합니다.', 'Three gale-fast rushes in a row.')],
    cyclone: ['slash', Kx('몸을 돌려 주변을 휩쓰는 회오리 베기.', 'A spinning cut that sweeps all around.')],
    crimson: ['slash', Kx('진홍빛 난무로 주변 적을 난도질합니다.', 'A crimson flurry through nearby foes.')],
    bits: ['summon', Kx('비트를 날려 적을 자동 사격합니다.', 'Launch bits that fire on their own.')],
    bitshield: ['shield', Kx('비트가 둘러싸 공격을 막아 줍니다.', 'Bits circle you and block hits.')],
    allrange: ['missile', Kx('모든 방향의 적을 한꺼번에 공격합니다.', 'Strike foes in every direction at once.')],
    cloak: ['stealth', Kx('광학 위장으로 모습을 감춥니다.', 'Optical camouflage hides you.')],
    decoy: ['summon', Kx('환영 분신을 만들어 적의 조준을 흩뜨립니다.', 'Phantom copies scatter enemy aim.')],
    execute: ['slash', Kx('약해진 적을 그림자처럼 처형합니다.', 'Finish a weakened foe from the shadows.')],
    execute2: ['slash', Kx('체력이 낮은 적을 단숨에 처형합니다.', 'Execute a low-health foe in one stroke.')],
    iaido: ['slash', Kx('칼집에서 뽑는 한 번의 일섬.', 'One flash of the blade from the sheath.')],
    parry: ['shield', Kx('공격을 간파해 흘리고 반격합니다.', 'Read the attack, deflect and counter.')],
    tenzan: ['slash', Kx('하늘을 가르는 일격으로 넓게 벱니다.', 'A sky-splitting cut over a wide arc.')],
    feather: ['summon', Kx('빛의 깃털을 흩뿌려 적을 꿰뚫습니다.', 'Scatter light feathers that pierce foes.')],
    sanctum: ['heal', Kx('성스러운 방벽 안의 아군을 지킵니다.', 'A holy barrier shields allies inside.')],
    descent: ['heal', Kx('세라핌으로 강림해 주변을 정화합니다.', 'Descend as a seraph, purging the area.')],
    grab: ['grab', Kx('적을 붙잡아 끌어옵니다.', 'Seize a foe and drag it in.')],
    dashcut: ['dash', Kx('돌진하며 지나가는 적을 벱니다.', 'Rush forward cutting through foes.')],
    shock: ['blast', Kx('충격파로 주변 적을 밀어냅니다.', 'A shockwave pushes foes away.')],
    orbital: ['orbital', Kx('궤도 포격을 목표 지점에 요청합니다.', 'Call an orbital strike on the target.')],
    slowshot: ['shot', Kx('맞은 적의 이동을 크게 늦춥니다.', 'A shot that badly slows its target.')],
    root: ['grab', Kx('에너지 사슬로 적을 그 자리에 묶습니다.', 'Energy chains root a foe in place.')],
    taunt: ['buff', Kx('주변 적의 공격을 자신에게 끌어옵니다.', 'Draw nearby enemy fire onto yourself.')],
    lift: ['quake', Kx('주변 적을 공중으로 띄웁니다.', 'Lift nearby foes into the air.')],
    flame: ['blast', Kx('앞쪽으로 화염을 내뿜습니다.', 'Breathe fire in a cone ahead.')],
    push: ['grab', Kx('강한 반발력으로 적을 멀리 밀어냅니다.', 'Repel foes far away.')],
    ambush: ['stealth', Kx('사라졌다가 적의 등 뒤에서 기습합니다.', 'Vanish and strike from behind.')]
  };
  var CD = { flash: 6, fivecut: 7, railshot: 5, backstep: 7, mortar: 5, deploy: 1, bash: 6, dome: 14, quake: 6, armor: 15, dive: 6, roll: 5, gale: 7, cyclone: 9, bits: 8, bitshield: 12, cloak: 10, decoy: 12, iaido: 6, parry: 6, feather: 5, sanctum: 14 };
  var POOL = {
    melee: { q: ['flash', 'gale', 'iaido', 'dashcut', 'grab', 'ambush'], e: ['fivecut', 'cyclone', 'parry', 'shock', 'roll', 'push'], r: ['bladefall', 'crimson', 'tenzan', 'execute2', 'titanfall'] },
    ranged: { q: ['railshot', 'slowshot', 'mortar', 'flame'], e: ['backstep', 'root', 'deploy', 'push', 'roll'], r: ['satsnipe', 'carpet', 'orbital', 'mstorm'] },
    tank: { q: ['bash', 'quake', 'grab', 'taunt'], e: ['dome', 'armor', 'taunt', 'lift', 'shock'], r: ['aegis', 'titanfall', 'lift', 'orbital'] },
    caster: { q: ['bits', 'feather', 'flame', 'slowshot', 'root'], e: ['bitshield', 'sanctum', 'decoy', 'root', 'shock'], r: ['allrange', 'descent', 'orbital', 'mstorm'] },
    stealth: { q: ['cloak', 'ambush', 'flash', 'dashcut'], e: ['decoy', 'backstep', 'parry', 'roll'], r: ['execute', 'crimson', 'execute2'] },
    air: { q: ['dive', 'railshot', 'flash', 'slowshot'], e: ['roll', 'backstep', 'shock', 'push'], r: ['mstorm', 'orbital', 'satsnipe', 'carpet'] }
  };
  var ROLE = { mech3: 'melee', mech4: 'melee', m_ranger: 'ranged', m_artillery: 'ranged', m_guardian: 'tank', m_titan: 'tank', m_sky: 'air', m_striker: 'melee', m_wizard: 'caster', m_phantom: 'stealth', m_origin: 'caster', m_samurai: 'melee', mech_leg: 'caster' };
  var hsh = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  var sk2 = function () { return window.__SK2T || {}; };
  var entry = function (id) { // [id, cd, name] in the format the game's kit code reads
    var T2 = sk2(), t = T2[id === 'execute2' ? 'execute' : id]; var nm = null, cd = CD[id];
    try { for (var k in KIT) { var kk = KIT[k]; ['q', 'e', 'r'].forEach(function (s) { if (kk && kk[s] && kk[s][0] === id && !nm) { nm = kk[s][2]; if (cd == null) cd = kk[s][1]; } }); } } catch (e) {}
    if (!nm && t) nm = t.n; if (cd == null) cd = t && t.cd != null ? t.cd : 8; return [id, cd, nm || Kx(id, id)];
  };
  // ---------------------------------------------------------------- unique kits for the newer frames
  var built = false;
  var build = function () {
    if (built || !bind() || !window.__NEWMECH) return; built = true;
    var used = new Set(), eff = function (k) { var o = (window.__SK2KIT || {})[k] || {}, b = KIT[k] || {}; return [o.q || (b.q && b.q[0]), o.e || (b.e && b.e[0]), o.r || (b.r && b.r[0])]; };
    Object.keys(ROLE).forEach(function (k) { if (KIT[k]) used.add(eff(k).join('|')); });
    // the base frame without skills of its own (m_origin) gets a set too
    var give = function (key, base) {
      var role = ROLE[base] || 'melee', P = POOL[role], h = hsh(key), tries = 0, q, e, r;
      do { q = P.q[(h + tries) % P.q.length]; e = P.e[((h >>> 5) + tries * 2) % P.e.length]; r = P.r[((h >>> 11) + tries * 3) % P.r.length]; if (e === q) e = P.e[(P.e.indexOf(e) + 1) % P.e.length]; tries++; } while (used.has(q + '|' + e + '|' + r) && tries < 40);
      used.add(q + '|' + e + '|' + r);
      KIT[key] = Object.assign({}, KIT[base] || KIT.mech3, { q: entry(q), e: entry(e), r: entry(r), _auto: 1 });
      try { if (window.__SK2KIT && window.__SK2KIT[key]) delete window.__SK2KIT[key]; } catch (er) {}
    };
    if (KIT.m_origin && !KIT.m_origin.q) give('m_origin', 'm_origin');
    Object.keys(window.__NEWMECH).forEach(function (k) { give(k, window.__NEWMECH[k]); });
  };
  // the kit the game will actually fire for this frame (same merge the input code does)
  var current = function () {
    try { bind(); if (!KIT) return null; var mk = myMechKey(), o = (window.__SK2KIT || {})[mk], k = KIT[mk] || KIT.mech3; if (!k) return null; var T2 = sk2();
      var m = function (id) { return id ? [id === 'execute' ? 'execute2' : id, (T2[id] || {}).cd || 8, (T2[id] || {}).n] : null; };
      return { key: mk, q: (o && o.q) ? m(o.q) : k.q, e: (o && o.e) ? m(o.e) : k.e, r: (o && o.r) ? m(o.r) : k.r, pass: k.pass };
    } catch (e) { return null; }
  };
  // ---------------------------------------------------------------- icons (drawn once per skill)
  var ICO = {}, COL = { Q: '#3ad7ff', E: '#ff5ad8', R: '#ffc24a' };
  var icon = function (id, slot) {
    var key = id + slot; if (ICO[key]) return ICO[key];
    var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), col = COL[slot] || '#9fb4d8', cat = (CAT[id] || ['blast'])[0];
    var bg = g.createRadialGradient(64, 58, 6, 64, 64, 92); bg.addColorStop(0, col); bg.addColorStop(.42, 'rgba(20,24,40,.95)'); bg.addColorStop(1, '#05060c'); g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 7;
    var arc = function (r, a0, a1) { g.beginPath(); g.arc(64, 64, r, a0, a1); g.stroke(); };
    var L = function (pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
    var h = hsh(id);
    switch (cat) {
      case 'slash': g.lineWidth = 9; arc(38, -2.4 + (h % 7) * .05, .2); g.lineWidth = 4; arc(26, -2.1, -.1); L([86, 30, 100, 18]); break;
      case 'dash': for (var i = 0; i < 3; i++) L([30 + i * 22, 36, 50 + i * 22, 64, 30 + i * 22, 92]); break;
      case 'shot': g.lineWidth = 5; L([22, 98, 104, 26]); g.beginPath(); g.arc(98, 32, 9, 0, 6.3); g.fill(); g.lineWidth = 3; L([30, 70, 46, 86]); L([52, 48, 68, 64]); break;
      case 'blast': for (var j = 0; j < 10; j++) { var a = j / 10 * 6.283; L([64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14, 64 + Math.cos(a) * (j % 2 ? 34 : 46), 64 + Math.sin(a) * (j % 2 ? 34 : 46)]); } g.beginPath(); g.arc(64, 64, 10, 0, 6.3); g.fill(); break;
      case 'shield': g.lineWidth = 7; g.beginPath(); g.moveTo(64, 20); g.lineTo(98, 34); g.quadraticCurveTo(96, 86, 64, 108); g.quadraticCurveTo(32, 86, 30, 34); g.closePath(); g.stroke(); g.lineWidth = 4; L([64, 36, 64, 92]); break;
      case 'quake': g.lineWidth = 6; L([64, 18, 64, 58]); L([50, 44, 64, 60, 78, 44]); g.lineWidth = 4; L([20, 96, 42, 82, 56, 98, 72, 80, 88, 98, 108, 84]); break;
      case 'missile': for (var m = 0; m < 3; m++) { var x = 38 + m * 26, y = 84 - (m % 2) * 18; g.lineWidth = 6; L([x, y + 18, x, y - 22]); g.beginPath(); g.moveTo(x - 6, y - 18); g.lineTo(x, y - 32); g.lineTo(x + 6, y - 18); g.fill(); g.lineWidth = 3; L([x - 7, y + 20, x + 7, y + 20]); } break;
      case 'orbital': g.lineWidth = 5; arc(34, 0, 6.3); arc(14, 0, 6.3); L([64, 18, 64, 40]); L([64, 88, 64, 110]); L([18, 64, 40, 64]); L([88, 64, 110, 64]); break;
      case 'stealth': g.lineWidth = 6; g.beginPath(); g.moveTo(20, 64); g.quadraticCurveTo(64, 26, 108, 64); g.quadraticCurveTo(64, 102, 20, 64); g.stroke(); g.beginPath(); g.arc(64, 64, 11, 0, 6.3); g.fill(); L([28, 100, 100, 28]); break;
      case 'summon': for (var s = 0; s < 4; s++) { var b = s / 4 * 6.283 + .4; var cx = 64 + Math.cos(b) * 32, cy = 64 + Math.sin(b) * 32; g.beginPath(); g.moveTo(cx, cy - 11); g.lineTo(cx + 8, cy); g.lineTo(cx, cy + 11); g.lineTo(cx - 8, cy); g.closePath(); g.fill(); } g.lineWidth = 3; arc(32, 0, 6.3); break;
      case 'buff': g.lineWidth = 7; L([38, 70, 64, 44, 90, 70]); L([38, 96, 64, 70, 90, 96]); break;
      case 'grab': g.lineWidth = 5; for (var r2 = 0; r2 < 4; r2++) { g.beginPath(); g.ellipse(36 + r2 * 18, 64 + (r2 % 2 ? 6 : -6), 11, 7, .6, 0, 6.3); g.stroke(); } break;
      case 'heal': g.lineWidth = 6; L([64, 30, 64, 98]); L([30, 64, 98, 64]); g.lineWidth = 3; arc(40, -2.8, -.3); break;
    }
    g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(3, 3, 122, 122);
    return (ICO[key] = c.toDataURL('image/png'));
  };
  // ---------------------------------------------------------------- the bar follows the frame
  var lastKey = '';
  var applyBar = function () {
    var K0 = current(); if (!K0) return; var sig = K0.key + ':' + [K0.q, K0.e, K0.r].map(function (x) { return x && x[0]; }).join(',');
    bind(); if (SKD) try { // tooltips and names (the game reads SKD / SKB for both)
      [['Q', K0.q, 0], ['E', K0.e, 1], ['R', K0.r, 2]].forEach(function (a) { var s = a[1]; if (!s) return; var c = CAT[s[0]]; var cdTxt = a[0] === 'R' ? Kx(' (궁극기 게이지 100%)', ' (ultimate gauge 100%)') : Kx(' (재사용 ' + s[1] + '초)', ' (' + s[1] + ' s cooldown)');
        var d = c ? c[1] : Kx('', ''); SKD[a[0]] = [s[2], Kx((d.ko || '') + tr(cdTxt), (d.en || '') + (cdTxt.en || '')), a[0]]; if (SKB && SKB[a[2]]) SKB[a[2]][2] = s[2]; });
    } catch (e) {}
    var bar = document.getElementById('skb2'); if (!bar) return;
    ['Q', 'E', 'R'].forEach(function (k) { var s = K0[k.toLowerCase()]; var d = bar.querySelector('.sk2[data-k="' + k + '"]'); if (!d || !s) return;
      var im = d.querySelector('img.ski'); var src = icon(s[0], k); if (im && im.getAttribute('src') !== src) { im.setAttribute('src', src); im.style.visibility = 'visible'; }
      var sp = d.querySelector('span'); if (sp && sp.textContent !== tr(s[2])) sp.textContent = tr(s[2]); });
    if (sig !== lastKey) { lastKey = sig; try { if (typeof toast === 'function' && G && G.local && !G.over) toast(tr(Kx('기체 기술: ', 'Frame skills: ')) + [K0.q, K0.e, K0.r].filter(Boolean).map(function (x) { return tr(x[2]); }).join(' · '), 2600); } catch (e) {} }
  };
  var hook = function () { window.__kitsApply = function () { try { applyBar(); } catch (e) {} }; };
  setInterval(function () { try { build(); hook(); if (typeof G !== 'undefined' && G && G.local) applyBar(); } catch (e) { window.__kitsErr = String(e).slice(0, 160); } }, 600);
  window.__kits = { current: current, icon: icon, build: function () { built = false; build(); } };
})();
