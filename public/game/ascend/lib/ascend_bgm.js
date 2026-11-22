/* ASCEND v3.57 — screen music (tracks made by the user with Suno Pro, commercial plan), music / sound-effect volume buses
   lobby   bgm/lobby.mp3   hangar, workshop, codex, every screen opened from the home menu (the home theme keeps the home screen itself)
   battle  bgm/battle.mp3  every fight; about -6 dB under the effects
   duel    bgm/duel.mp3    arena duels
   story   bgm/story.mp3   under story dialogue, quiet
   win / lose / summon     played once (result screen, summon reveal), then the screen's own track returns
   · gapless loops: each track is decoded once and looped by the audio clock (no <audio> loop gap); switching cross-fades over 1 s
   · loaded only when its screen is entered; at most two decoded tracks are kept
   · Settings: music volume, effects volume (and the existing Sound / Music switches) */
(function () {
  'use strict';
  var FILES = { lobby: 'bgm/lobby.mp3', battle: 'bgm/battle.mp3', duel: 'bgm/duel.mp3', story: 'bgm/story.mp3', win: 'bgm/win.mp3', lose: 'bgm/lose.mp3', summon: 'bgm/summon.mp3' };
  var LEVEL = { lobby: .55, battle: .5, duel: .55, story: .32, win: .7, lose: .65, summon: .7 };
  var ONCE = { win: 1, lose: 1, summon: 1 };
  var S = { cur: null, src: null, gain: null, bufs: {}, order: [], loading: {}, once: null, err: [] };
  var ctx = function () { try { return (typeof SFX !== 'undefined' && SFX.ctx) || null; } catch (e) { return null; } };
  var pref = function (k, d) { try { var v = P[k]; return v == null ? d : v; } catch (e) { return d; } };
  // ---------------------------------------------------------------- buses
  var B = { ctx: null, mus: null, sfx: null };
  var buses = function (c) {
    if (B.ctx === c) return B; B.ctx = c;
    var dest = c.destination, rawConnect = AudioNode.prototype.__rawConnect || AudioNode.prototype.connect;
    AudioNode.prototype.__rawConnect = rawConnect;
    B.mus = c.createGain(); rawConnect.call(B.mus, dest); B.mus.__bus = 1;
    B.sfx = c.createGain(); rawConnect.call(B.sfx, dest); B.sfx.__bus = 1;
    // everything that used to go straight to the speakers is an effect, unless it is tagged as music
    AudioNode.prototype.connect = function (t) { if (t === B.ctx.destination && !this.__bus) { return rawConnect.apply(this, [this.__music ? B.mus : B.sfx].concat([].slice.call(arguments, 1))); } return rawConnect.apply(this, arguments); };
    apply(); return B;
  };
  window.__musicBus = function (c) { var b = buses(c); return b.mus; };
  var apply = function () { if (!B.ctx) return; var t = B.ctx.currentTime; B.mus.gain.setTargetAtTime(pref('musVol', .8), t, .05); B.sfx.gain.setTargetAtTime(pref('sfxVol', 1), t, .05); };
  // ---------------------------------------------------------------- loading / playback
  var load = function (c, k) {
    if (S.bufs[k] || S.loading[k]) return; S.loading[k] = 1;
    fetch(FILES[k]).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, no) { c.decodeAudioData(b, ok, no); }); })
      .then(function (buf) { S.bufs[k] = buf; S.loading[k] = 0; S.order = S.order.filter(function (x) { return x !== k; }); S.order.push(k);
        while (S.order.length > 2) { var old = S.order.shift(); if (old !== S.cur) delete S.bufs[old]; else S.order.push(old); if (S.order.length > 2 && S.order[0] === S.cur) break; } })
      .catch(function (e) { S.loading[k] = 0; S.err.push(k + ': ' + String(e).slice(0, 80)); });
  };
  var fadeOut = function (c) { if (!S.src) return; var t = c.currentTime; try { S.gain.gain.cancelScheduledValues(t); S.gain.gain.setValueAtTime(S.gain.gain.value, t); S.gain.gain.linearRampToValueAtTime(0, t + 1); S.src.stop(t + 1.05); } catch (e) {} S.src = null; S.gain = null; };
  var play = function (c, k) {
    var buf = S.bufs[k]; if (!buf) { load(c, k); return false; }
    buses(c); fadeOut(c);
    var s = c.createBufferSource(); s.buffer = buf; s.loop = !ONCE[k]; var g = c.createGain(); g.__music = 1; s.__music = 1;
    var t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(LEVEL[k] || .5, t + 1);
    s.connect(g); g.connect(c.destination); s.start(t);
    if (ONCE[k]) { S.once = { k: k, end: t + buf.duration }; s.onended = function () { if (S.once && S.once.k === k) S.once = null; }; }
    S.src = s; S.gain = g; S.cur = k; return true;
  };
  var stop = function (c) { fadeOut(c); S.cur = null; };
  // ---------------------------------------------------------------- what the screen wants
  var vis = function (id) { var e = document.getElementById(id); if (!e) return false; var cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.classList.contains('hidden'); };
  var lastResult = null, lastPull = 0;
  var want = function () {
    var g = null; try { g = (typeof G !== 'undefined') ? G : null; } catch (e) {}
    if (vis('rpgDlg')) return 'story';
    if (vis('result')) {
      var r = document.getElementById('result'); var txt = (r && r.textContent) || ''; var key = txt.slice(0, 80);
      if (key !== lastResult) { lastResult = key; S.resOnce = /패배|DEFEAT|작전 실패/.test(txt) ? 'lose' : 'win'; }
      return S.resOnce;
    } else lastResult = null;
    if (g && g.local && !g.over && !vis('menu')) { try { if (g.units && g.units.some(function (u) { return u.duOpp && !u.dead; })) return 'duel'; } catch (e) {} return 'battle'; }
    var nav = document.getElementById('nav348'); if (nav && nav.style.display !== 'none') return 'lobby';
    if (!vis('menu')) return 'lobby';                                               // hangar / workshop and other screens that replace the home menu
    return null;                                                                    // the home screen: the existing home theme plays
  };
  var tick = function () {
    var c = ctx(); if (!c || c.state !== 'running') return; buses(c);
    var on = pref('sfx', true) && pref('mus', true) !== false;
    window.__bgmBusy = false;
    if (!on) { if (S.cur) stop(c); return; }
    // summon reveal: a new card row appeared
    var pr = document.getElementById('pullRes'); var n = pr ? pr.children.length : 0; if (n && n !== lastPull) { lastPull = n; S.pull = 1; } if (!n) lastPull = 0;
    var w = want();
    if (S.pull) { if (S.cur !== 'summon') { if (play(c, 'summon')) S.pull = 0; } else S.pull = 0; }
    if (S.once && c.currentTime < S.once.end - .2) { window.__bgmBusy = true; return; }   // let a short piece finish once
    if (S.once) S.once = null;
    if (w === 'win' || w === 'lose') { if (S.cur !== w && !S.resDone) { if (play(c, w)) S.resDone = 1; return; } w = 'lobby'; } else S.resDone = 0;
    if (!w) { if (S.cur) stop(c); return; }
    window.__bgmBusy = true;
    if (S.cur !== w) play(c, w);
  };
  // ---------------------------------------------------------------- settings: two sliders under the Sound switch
  var addSliders = function () {
    var anchor = document.getElementById('mSfx'); if (!anchor || document.getElementById('volBox')) return;
    var d = document.createElement('div'); d.id = 'volBox'; d.style.cssText = 'display:grid;grid-template-columns:auto 1fr auto;gap:6px 10px;align-items:center;margin:8px 0;font-size:13px';
    var row = function (id, lab, k, def) { return '<span>' + lab + '</span><input id="' + id + '" type="range" min="0" max="100" value="' + Math.round(pref(k, def) * 100) + '"><b id="' + id + 'V" style="min-width:34px;text-align:right">' + Math.round(pref(k, def) * 100) + '</b>'; };
    var L2 = function (k, e) { try { return L(k, e); } catch (x) { return k; } };
    d.innerHTML = row('volMus', L2('음악 음량', 'Music'), 'musVol', .8) + row('volSfx', L2('효과음 음량', 'Effects'), 'sfxVol', 1);
    anchor.parentNode.insertBefore(d, anchor.nextSibling);
    [['volMus', 'musVol'], ['volSfx', 'sfxVol']].forEach(function (p) { var el = d.querySelector('#' + p[0]); el.oninput = function () { try { P[p[1]] = el.value / 100; saveP(); } catch (e) {} d.querySelector('#' + p[0] + 'V').textContent = el.value; apply(); }; });
  };
  // the old procedural theme goes silent while a recorded track plays
  setInterval(function () { try { if (typeof MUS !== 'undefined' && MUS.tick && !MUS.tick.__bgm) { var t0 = MUS.tick; MUS.tick = function () { if (window.__bgmBusy && this.g && this.c) { this.g.gain.setTargetAtTime(0, this.c.currentTime, .2); this.next = 0; return; } return t0.apply(this, arguments); }; MUS.tick.__bgm = 1; } } catch (e) {} }, 500);
  setInterval(function () { try { tick(); } catch (e) { S.err.push(String(e).slice(0, 100)); } }, 250);
  setInterval(function () { try { addSliders(); } catch (e) {} }, 1000);
  window.__bgm = { stat: function () { return { cur: S.cur, loaded: Object.keys(S.bufs), err: S.err.slice(-3), want: (function () { try { return want(); } catch (e) { return '?'; } })() }; } };
})();
