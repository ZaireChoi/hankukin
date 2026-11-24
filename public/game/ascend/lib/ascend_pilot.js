/* ASCEND v4.05 — PILOT DOSSIER (파일럿): replaces the old infantry paint screen (user 2026-11-24: "the character screen is crude").
   A military personnel file in the same visual language as the hangar: rank insignia, callsign, level and rank path,
   service record, the frame in service and the LINK partner, and the full 21-step rank ladder with the frame licences on it.
   Opens from the lobby dock "파일럿" button. */
(function () {
  'use strict';
  var A = function () { return window.__A; };
  var EN = function () { return typeof LANG !== 'undefined' && LANG === 'en'; };
  var L2 = function (k, e) { return EN() ? e : k; };
  var tx2 = function (o) { return o ? (EN() ? o.en : o.ko) || o.ko : ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); };
  var rkName = function (i) { try { return rankName(i); } catch (e) { return 'R' + i; } };
  var LIC = { 2: 1, 4: 2, 7: 3, 10: 4, 15: 5 }; // rank -> frame grade it licenses
  // ------------------------------------------------------------------ insignia (SVG, drawn per rank)
  var insignia = function (rk, sz) {
    var s = sz || 64, g = '#ffd166', w = '#e8eef7', parts = '';
    var chev = function (n, y0) { for (var i = 0; i < n; i++) { var y = y0 + i * 9; parts += '<path d="M14 ' + (y + 8) + ' L32 ' + y + ' L50 ' + (y + 8) + '" stroke="' + g + '" stroke-width="5" fill="none" stroke-linejoin="round"/>'; } };
    var star = function (cx, cy, r) { var p = ''; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; p += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } parts += '<path d="' + p + 'Z" fill="' + g + '"/>'; };
    var dia = function (cx, cy, r) { parts += '<path d="M' + cx + ' ' + (cy - r) + ' L' + (cx + r * .7) + ' ' + cy + ' L' + cx + ' ' + (cy + r) + ' L' + (cx - r * .7) + ' ' + cy + 'Z" fill="' + w + '"/>'; };
    if (rk === 0) parts += '<rect x="22" y="26" width="20" height="12" rx="2" fill="none" stroke="' + g + '" stroke-width="3"/>';
    else if (rk <= 4) chev(rk, 18);
    else if (rk <= 9) { chev(3, 12); var arcs = rk - 6; for (var i = 0; i <= arcs; i++) parts += '<path d="M16 ' + (40 + i * 7) + ' Q32 ' + (48 + i * 7) + ' 48 ' + (40 + i * 7) + '" stroke="' + g + '" stroke-width="4" fill="none"/>'; }
    else if (rk <= 12) { var n = rk - 9; for (var j = 0; j < n; j++) parts += '<rect x="' + (32 - n * 7 + j * 14 + 2) + '" y="18" width="10" height="28" rx="2" fill="' + w + '"/>'; }
    else if (rk <= 15) { var n2 = rk - 12; for (var k = 0; k < n2; k++) dia(32 - (n2 - 1) * 9 + k * 18, 32, 13); }
    else { var n3 = rk - 15; for (var q = 0; q < n3; q++) star(32 - (n3 - 1) * 6.5 + q * 13, 32, n3 > 3 ? 7 : 10); }
    return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '">' + parts + '</svg>';
  };
  window.__insignia = insignia;
  var css = function () {
    if (document.getElementById('pdCss')) return; var s = document.createElement('style'); s.id = 'pdCss';
    s.textContent = '#pilotDos{position:fixed;inset:0;z-index:9300;color:#e8eef7;font-family:"Noto Sans KR",sans-serif;overflow:auto;background:radial-gradient(ellipse at 30% 20%,rgba(40,70,120,.35),transparent 60%),linear-gradient(180deg,#060a14,#03050a)}' +
      '#pilotDos .grid{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(127,232,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(127,232,255,.04) 1px,transparent 1px);background-size:48px 48px}' +
      '#pilotDos .wrap{position:relative;max-width:1180px;margin:0 auto;padding:22px 26px 40px}' +
      '#pilotDos .top{display:flex;align-items:center;gap:14px;margin-bottom:18px}#pilotDos .top small{font:600 11px Rajdhani,sans-serif;letter-spacing:.42em;color:#ffd166}#pilotDos .top b{display:block;font:800 24px "Noto Sans KR"}' +
      '#pilotDos .x{all:unset;cursor:pointer;margin-left:auto;width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);background:rgba(8,12,22,.6)}' +
      '#pilotDos .pn{background:linear-gradient(180deg,rgba(12,18,32,.9),rgba(8,12,22,.8));border:1px solid rgba(255,255,255,.08);padding:16px 18px;clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px)}' +
      '#pilotDos .sec{font:700 11px Rajdhani,"Noto Sans KR";letter-spacing:.3em;color:#8fb2d6;margin:0 0 10px;display:flex;align-items:center;gap:8px}#pilotDos .sec:after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(143,178,214,.4),transparent)}' +
      '#pilotDos .hero{display:grid;grid-template-columns:150px 1fr 280px;gap:18px;align-items:center}#pilotDos .ins{width:150px;height:150px;display:grid;place-items:center;background:radial-gradient(circle,rgba(255,209,102,.16),transparent 70%);border:1px solid rgba(255,209,102,.35);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}' +
      '#pilotDos .cs{font:800 40px Rajdhani,"Noto Sans KR";letter-spacing:.04em;line-height:1}#pilotDos .rk{color:#ffd166;font-weight:800;font-size:18px;margin:6px 0}#pilotDos .xp{height:8px;background:rgba(255,255,255,.08);margin:10px 0 6px;position:relative}#pilotDos .xp em{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ffd166,#fff3c4)}' +
      '#pilotDos .stamp{display:inline-block;margin-top:6px;padding:2px 10px;border:2px solid rgba(255,107,107,.6);color:#ff8a7a;font:800 12px Rajdhani;letter-spacing:.3em;transform:rotate(-3deg)}' +
      '#pilotDos .cols{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:16px;margin-top:16px}' +
      '#pilotDos .st{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}#pilotDos .st div{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);padding:10px}#pilotDos .st b{display:block;font:800 24px Rajdhani}#pilotDos .st span{font-size:11px;opacity:.7}' +
      '#pilotDos .card{display:flex;gap:12px;align-items:center}#pilotDos .card img{width:96px;height:96px;object-fit:cover;background:#0a1020;border:1px solid rgba(255,255,255,.1)}' +
      '#pilotDos .btn{all:unset;cursor:pointer;display:inline-block;margin-top:10px;padding:8px 14px;font-weight:800;font-size:13px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}' +
      '#pilotDos .ladder{display:flex;gap:4px;overflow-x:auto;padding-bottom:6px}#pilotDos .ladder .s{flex:0 0 auto;width:74px;text-align:center;padding:8px 2px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);opacity:.45}#pilotDos .ladder .s.got{opacity:1}#pilotDos .ladder .s.cur{border-color:#ffd166;background:rgba(255,209,102,.12);opacity:1}#pilotDos .ladder small{display:block;font-size:10.5px}#pilotDos .ladder i{display:block;font-style:normal;font-size:10px;margin-top:3px}' +
      '@media(max-width:900px){#pilotDos .hero{grid-template-columns:100px 1fr}#pilotDos .hero>.pn:last-child{grid-column:1/-1}#pilotDos .ins{width:100px;height:100px}#pilotDos .cols{grid-template-columns:1fr}#pilotDos .st{grid-template-columns:repeat(2,1fr)}#pilotDos .cs{font-size:30px}}';
    document.head.appendChild(s);
  };
  var close = function () { var d = document.getElementById('pilotDos'); if (d) d.remove(); };
  var open = function () {
    if (!A() || !A().R) return; css(); close(); var r = A().R(), Pp = typeof P !== 'undefined' ? P : {}, st = Pp.st || {}, lv = r.lv || 1, rk = Math.floor(lv / 3), M = A().MECHS, RAR = A().RAR;
    var m = M[r.mech] || {}, fid = (r.fid || {})[r.mech] || {}, link = (r.links3 || [])[0] || Pp.linkM || 'link2';
    var kd = st.d ? (st.k / st.d).toFixed(2) : (st.k ? L2('무패', 'Flawless') : '—'), wr = st.m ? Math.round((st.w || 0) / st.m * 100) : 0;
    var nextLic = null; Object.keys(LIC).map(Number).sort(function (a, b) { return a - b; }).some(function (k) { if (k > rk) { nextLic = k; return true; } return false; });
    var lad = ''; for (var i = 0; i <= 20; i++) lad += '<div class="s' + (i < rk ? ' got' : '') + (i === rk ? ' cur' : '') + '">' + insignia(i, 34) + '<small>' + esc(rkName(i)) + '</small><i style="opacity:.7">Lv' + i * 3 + '</i>' + (LIC[i] ? '<i style="color:' + RAR[LIC[i]].c + '">' + esc(tx2(RAR[LIC[i]])) + ' ' + L2('운용', 'licence') + '</i>' : '') + '</div>';
    var d = document.createElement('div'); d.id = 'pilotDos';
    d.innerHTML = '<div class="grid"></div><div class="wrap"><div class="top"><div><small>PILOT DOSSIER · UNITED FRONT</small><b>' + L2('파일럿', 'Pilot') + '</b></div><button class="x" id="pdX">✕</button></div>' +
      '<div class="hero"><div class="ins">' + insignia(rk, 96) + '</div><div><div class="cs" id="pdCs">' + esc(Pp.name || 'PILOT') + '</div><div class="rk">' + esc(rkName(rk)) + ' · Lv ' + lv + '</div>' +
      '<div class="xp"><em style="width:' + ((lv % 3) / 3 * 100).toFixed(0) + '%"></em></div><div style="font-size:13px;opacity:.85">' + (rk >= 20 ? L2('최고 계급', 'Top rank') : L2('다음 진급 (' + rkName(rk + 1) + ')까지 레벨 ' + ((rk + 1) * 3 - lv), 'Levels to ' + rkName(rk + 1) + ': ' + ((rk + 1) * 3 - lv))) + (nextLic != null ? ' · ' + L2(rkName(nextLic) + '부터 ' + tx2(RAR[LIC[nextLic]]) + ' 기체 운용', tx2(RAR[LIC[nextLic]]) + ' frames from ' + rkName(nextLic)) : '') + '</div>' +
      '<span class="stamp">ACE CANDIDATE</span> <button class="btn" id="pdName">' + L2('콜사인 변경', 'Change callsign') + '</button></div>' +
      '<div class="pn"><div class="sec">' + L2('탑승 기체', 'FRAME IN SERVICE') + '</div><div class="card"><img src="' + esc(window.__frThumb ? window.__frThumb(r.mech) : 'models/thumbs/' + r.mech + '.jpg') + '" style="background:radial-gradient(circle at 50% 40%,#1c2c48,#0a1020)"><div><b style="color:' + ((RAR[m.r || 0] || {}).c || '#fff') + '">' + esc(tx2(m.n)) + '</b><div style="font-size:12px;opacity:.75">' + esc(tx2(m.ty)) + '</div><div style="color:#ffd166;margin-top:4px">' + (fid.nm ? '「' + esc(fid.nm) + '」 ' : '') + esc(fid.em || '') + ' ' + esc(fid.no || '') + '</div></div></div><button class="btn" id="pdHangar">' + L2('격납고로', 'To hangar') + '</button></div></div>' +
      '<div class="cols"><div class="pn"><div class="sec">' + L2('전투 기록', 'SERVICE RECORD') + '</div><div class="st">' +
      [[st.m || 0, L2('출격', 'Sorties')], [st.w || 0, L2('승리', 'Wins')], [wr + '%', L2('승률', 'Win rate')], [st.k || 0, L2('격추', 'Kills')], [kd, 'K/D'], [st.best || 0, L2('최고 연속 격추', 'Best streak')], [st.caps || 0, L2('점령', 'Captures')], [st.rev || 0, L2('소생', 'Revives')]].map(function (x) { return '<div><b>' + esc(x[0]) + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div></div>' +
      '<div class="pn"><div class="sec">' + L2('링크 파트너', 'LINK PARTNER') + '</div><div class="card"><img src="models/thumbs/' + esc(link) + '.jpg" onerror="this.style.visibility=\'hidden\'"><div><b>' + esc(link === 'link2' ? L2('세라', 'Sera') : link === 'link3' ? L2('루나', 'Luna') : link) + '</b><div style="font-size:12px;opacity:.75">' + L2('보조조종 AI · 동기율', 'Co-pilot AI · sync') + ' ' + Math.min(100, 60 + lv) + '%</div></div></div></div>' +
      '<div class="pn"><div class="sec">' + L2('기체 등급 사다리', 'FRAME LADDER') + '</div><div style="font-size:13px;line-height:1.7">' + L2('설계도 조각', 'Blueprints') + ' <b style="color:#ffd166">' + (r.bp || 0) + '</b><br>' + L2('도달 등급', 'Grade reached') + ' <b style="color:' + RAR[r.ftier || 0].c + '">' + esc(tx2(RAR[r.ftier || 0])) + '</b></div><button class="btn" id="pdLad">' + L2('기체 승급 열기', 'Open frame ladder') + '</button></div></div>' +
      '<div class="pn" style="margin-top:16px"><div class="sec">' + L2('계급과 운용 자격', 'RANK PATH & LICENCES') + '</div><div class="ladder">' + lad + '</div></div></div>';
    document.body.appendChild(d);
    d.querySelector('#pdX').onclick = close;
    d.querySelector('#pdHangar').onclick = function () { close(); try { window.__garage && window.__garage(); } catch (e) {} };
    d.querySelector('#pdLad').onclick = function () { try { window.__frameLadder && window.__frameLadder(); } catch (e) {} };
    d.querySelector('#pdName').onclick = function () { var n = prompt(L2('새 콜사인 (12자)', 'New callsign (12 chars)'), Pp.name || ''); if (n == null) return; n = String(n).trim().replace(/[<>&"]/g, '').slice(0, 12); if (!n) return; Pp.name = n; try { var mn = document.getElementById('mName'); if (mn) mn.value = n; } catch (e) {} A().saveP(); open(); };
    var cur = d.querySelector('.ladder .cur'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
  window.__pilotDossier = open;
  var mine = function () { open(); };
  setInterval(function () { try { var b = document.getElementById('mChar'); if (b && b.onclick !== mine) b.onclick = mine; } catch (e) {} }, 800);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.getElementById('pilotDos')) close(); });
})();
