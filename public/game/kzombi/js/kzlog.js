/* 조선좀비 실기기 안정성(2026-11-30): 오류 수집 + 화질 단계 + 저장 실패 대비
   - 오류·약속 거부·긴 멈춤(0.5초 넘게 화면이 멈춤)·캔버스 실패·저장 공간 부족을 /api/kzlog/report 로 보낸다(한 번 켤 때 최대 8건).
   - 개인정보(계정·이메일)는 보내지 않는다. 기기·브라우저·버전·장·마지막 행동만.
   - 화질 단계(높음/보통/낮음): localStorage kz_q 가 있으면 그것, 없으면 기기 추정(메모리·코어·화면) → window.KZQ.
     battle.js fit() 가 KZQ.kcap 으로 캔버스 해상도 상한을 정하고, 낮음이면 원활 모드로 시작한다. */
(function () {
  var W = window, sent = 0, MAX = 8, seen = {};
  var V = (function () { try { var s = document.querySelector('script[src*="battle.js"]'); var m = s && /v=(\w+)/.exec(s.src); return m ? m[1] : ''; } catch (e) { return ''; } })();
  var app = /android-app:\/\//.test(document.referrer) || (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches) ? 'twa' : (/KAKAOTALK/i.test(navigator.userAgent) ? 'kakao' : 'web');
  W.KZLOG_LAST = '';
  function ctx() {
    var G = W.JZB && W.JZB.G;
    return { v: V, app: app, lang: W.IS_EN ? 'en' : 'ko', ua: String(navigator.userAgent).slice(0, 160), w: innerWidth, h: innerHeight, dpr: W.devicePixelRatio || 1,
      q: (W.KZQ && W.KZQ.lv) || '', ch: G && G.cfg ? String((G.cfg.act || '') + ':' + (G.cfg.chapter || '')) : '', ph: G ? String(G.phase || '') : 'meta', last: W.KZLOG_LAST };
  }
  function send(o) {
    if (sent >= MAX) return; var key = (o.k || '') + '|' + (o.m || '') + '|' + (o.ln || ''); if (seen[key]) return; seen[key] = 1; sent++;
    var b = ctx(); for (var k in o) b[k] = o[k];
    try {
      var body = JSON.stringify(b).slice(0, 5800);
      if (!/hankuk-in\.com$/.test(location.hostname)) { console.warn('[kzlog]', b); return; }
      if (navigator.sendBeacon) navigator.sendBeacon('/api/kzlog/report', new Blob([body], { type: 'application/json' }));
      else fetch('/api/kzlog/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true });
    } catch (e) {}
  }
  W.kzlog = send;
  addEventListener('error', function (e) {
    if (e && e.target && e.target !== W && e.target.tagName) return; /* 그림·소리 불러오기 실패는 제외(게임이 따로 처리) */
    send({ k: 'err', m: String(e.message || ''), src: String(e.filename || '').replace(/^.*\//, ''), ln: e.lineno || 0, col: e.colno || 0, st: e.error && e.error.stack ? String(e.error.stack) : '' });
  }, true);
  addEventListener('unhandledrejection', function (e) { var r = e.reason; send({ k: 'rej', m: String(r && r.message || r || ''), st: r && r.stack ? String(r.stack) : '' }); });
  /* 긴 멈춤: 화면이 보이는 동안 프레임 사이가 0.5초 넘으면 센다. 처음 1번 + 판마다 모아서 */
  var lt = 0, longN = 0, longMax = 0;
  function tick(t) { if (!document.hidden && lt && t - lt > 500 && t - lt < 20000) { longN++; longMax = Math.max(longMax, t - lt); if (longN === 1 || longN === 10) send({ k: 'long', m: 'frame gap', n: longN, fps: Math.round(longMax) }); } lt = document.hidden ? 0 : t; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', function () { lt = 0; });
  /* 저장 공간 부족 대비: setItem 실패를 잡아 오래된 임시 키를 지우고 한 번 더 시도 */
  try {
    var LS = W.localStorage, orig = LS.setItem.bind(LS);
    LS.setItem = function (k, v) {
      try { return orig(k, v); } catch (e) {
        try { for (var i = LS.length - 1; i >= 0; i--) { var kk = LS.key(i); if (kk && /^(kz_tmp|kz_cache|kz_dbg|jz_bak_)/.test(kk)) LS.removeItem(kk); } return orig(k, v); }
        catch (e2) { send({ k: 'quota', m: String(e2 && e2.name || 'quota'), last: String(k).slice(0, 40) }); throw e2; }
      }
    };
  } catch (e) {}
  /* 화질 단계 */
  var saved = null; try { saved = localStorage.getItem('kz_q'); } catch (e) {}
  var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  var auto = (mem <= 2 || cores <= 4) ? 'low' : (mem <= 4 || cores <= 6) ? 'mid' : 'high';
  var lv = saved === 'high' || saved === 'mid' || saved === 'low' ? saved : auto;
  var KC = { high: 2.5, mid: 2, low: 1.5 };
  W.KZQ = { lv: lv, auto: !saved, kcap: KC[lv],
    set: function (v) { if (!KC[v]) return; this.lv = v; this.kcap = KC[v]; this.auto = false; try { localStorage.setItem('kz_q', v); } catch (e) {} try { dispatchEvent(new Event('resize')); } catch (e) {} },
    down: function () { if (!this.auto) return; var nx = this.lv === 'high' ? 'mid' : 'low'; if (nx === this.lv) return; this.lv = nx; this.kcap = KC[nx]; try { dispatchEvent(new Event('resize')); } catch (e) {} send({ k: 'boot', m: 'quality auto down → ' + nx }); } };
  /* 캔버스 실패 확인 */
  try { var c = document.createElement('canvas'); if (!c.getContext('2d')) send({ k: 'canvas', m: 'no 2d context' }); } catch (e) { send({ k: 'canvas', m: String(e && e.message) }); }
})();
