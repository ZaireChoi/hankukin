/* 조선좀비 오류 수집 (실기기 안정성, 2026-11-30)
   - 게임(js/kzlog.js)이 오류·긴 멈춤을 POST 로 보낸다. 개인정보(계정·이메일·IP) 저장 안 함.
   - Firestore kzlogs/{자동 id} 에 저장(서비스 계정 GP_SA_JSON). 권한이 없으면 Cloudflare 함수 기록(console)에만 남긴다.
   - 하루 상한: kzlog_day/{YYYYMMDD}.n 이 1500 넘으면 저장하지 않음(대략값).
   - 보기: Firebase 콘솔 → Firestore → kzlogs (최신순 정렬은 t 필드). */
const PROJECT = 'hankukin-play';
const DAY_CAP = 1500;
const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const enc = s => new TextEncoder().encode(s);
const b64u = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
let TOK = null;
async function saToken(sa) {
  if (TOK && TOK.exp > Date.now() + 60000) return TOK.v;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(enc(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64u(enc(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const pem = String(sa.private_key || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc(head + '.' + claim));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + b64u(sig) });
  const t = await r.json().catch(() => ({}));
  if (!r.ok || !t.access_token) throw new Error('TOKEN_FAIL');
  TOK = { v: t.access_token, exp: Date.now() + (t.expires_in || 3600) * 1000 };
  return TOK.v;
}
const FS = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
const S = (v, n) => String(v == null ? '' : v).slice(0, n || 200);
const N = v => (isFinite(+v) ? +v : 0);

export async function onRequestPost({ request, env }) {
  const txt = await request.text().catch(() => '');
  if (!txt || txt.length > 6000) return J({ ok: false, code: 'SIZE' }, 400);
  let b; try { b = JSON.parse(txt); } catch (e) { return J({ ok: false, code: 'BAD_JSON' }, 400); }
  const ok = /^(err|rej|long|mem|canvas|quota|boot)$/.test(b.k || '');
  if (!ok) return J({ ok: false, code: 'KIND' }, 400);
  /* 저장할 칸(개인정보 없음) */
  const rec = {
    k: S(b.k, 12), m: S(b.m, 300), src: S(b.src, 120), ln: N(b.ln), col: N(b.col), st: S(b.st, 900),
    v: S(b.v, 16), ch: S(b.ch, 12), ph: S(b.ph, 10), lang: S(b.lang, 4), app: S(b.app, 6),
    ua: S(b.ua, 160), w: N(b.w), h: N(b.h), dpr: N(b.dpr), q: S(b.q, 6), fps: N(b.fps), n: N(b.n), last: S(b.last, 60),
    t: new Date().toISOString()
  };
  const day = rec.t.slice(0, 10).replace(/-/g, '');
  let sa; try { sa = JSON.parse(env.GP_SA_JSON || ''); } catch (e) { sa = null; }
  if (!sa) { console.log('kzlog', JSON.stringify(rec)); return J({ ok: true, mode: 'log' }); }
  try {
    const tk = await saToken(sa); const H = { authorization: 'Bearer ' + tk, 'content-type': 'application/json' };
    /* 하루 상한(대략) */
    const dr = await fetch(FS + '/kzlog_day/' + day, { headers: H });
    let n = 0; if (dr.ok) { const d = await dr.json().catch(() => ({})); n = +(((d.fields || {}).n || {}).integerValue || 0); }
    if (n >= DAY_CAP) return J({ ok: true, mode: 'cap' });
    await fetch(FS + '/kzlog_day/' + day + '?updateMask.fieldPaths=n', { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { n: { integerValue: String(n + 1) } } }) });
    const fields = {}; for (const [kk, vv] of Object.entries(rec)) fields[kk] = typeof vv === 'number' ? { doubleValue: vv } : { stringValue: vv };
    const wr = await fetch(FS + '/kzlogs', { method: 'POST', headers: H, body: JSON.stringify({ fields }) });
    if (!wr.ok) { console.log('kzlog', JSON.stringify(rec)); return J({ ok: true, mode: 'log' }); }
    return J({ ok: true, mode: 'fs' });
  } catch (e) { console.log('kzlog', JSON.stringify(rec)); return J({ ok: true, mode: 'log' }); }
}
export const onRequest = () => J({ ok: false, code: 'METHOD' }, 405);
