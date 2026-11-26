/* 조선좀비 쿠폰 서버 검사 (Cloudflare Pages Functions) — 초안, 아직 배포 안 함
   POST /api/kzcoupon/redeem   헤더 Authorization: Bearer <Firebase ID 토큰>   본문 { code }
   - 로그인 사용자만. Firebase ID 토큰을 구글 공개키로 직접 검증(프로젝트 hankukin-play).
   - 쿠폰 표: ①기존 표(게임과 같은 해시, 코드 원문 없음) ②환경변수 KZ_COUPONS(JSON: { "<sha256(KZPAY_HMAC 키 HMAC)>": {jade, rep, starter} }) — 새 쿠폰은 여기에만 넣는다.
   - 사용 기록: Firestore kzcoupon_use/{uid}_{key} (서비스 계정 GP_SA_JSON, datastore 범위). 1회 쿠폰은 문서 만들기(이미 있으면 거절), 반복 쿠폰은 횟수만 올림.
     Firestore 권한이 없으면 mode:'device' 로 답하고, 게임은 예전처럼 기기 기록으로 한 번만 지급한다.
   - 답: { ok, reward, key, mode, receipt } — receipt 는 KZPAY_HMAC 로 서명(uid·key·보상·시각). 게임은 receipt 마다 한 번만 지급. */
const PROJECT = 'hankukin-play';
const CPN_SALT = 'jz:MQMRT2QLZ2';
const LEGACY = { '1c3xotbdevi': { jade: 0, starter: 1 }, 'yq1o8r10h4': { jade: 0, mbow: 1 }, 'emcd515lgu': { jade: 10000, rep: true }, 'xtc3izhfdg': { jade: 300 }, '1g0kle3wmjk': { jade: 10000, rep: true }, 'ii2xa7zzi3': { jade: 300 }, '17tfciwa04h': { jade: 100000 }, '19go3zxjsvd': { jade: 100000 } };
const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const enc = s => new TextEncoder().encode(s);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64u = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64uDec = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
async function hmac(key, msg) { const k = await crypto.subtle.importKey('raw', enc(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', k, enc(msg))); }
const cpnHash = (str, seed) => { let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0); for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };

/* Firebase ID 토큰 검증 */
let JWKS = null;
async function verifyIdToken(tok) {
  const p = String(tok || '').split('.'); if (p.length !== 3) throw new Error('BAD_TOKEN');
  const head = JSON.parse(new TextDecoder().decode(b64uDec(p[0]))), body = JSON.parse(new TextDecoder().decode(b64uDec(p[1])));
  const now = Math.floor(Date.now() / 1000);
  if (head.alg !== 'RS256' || body.aud !== PROJECT || body.iss !== 'https://securetoken.google.com/' + PROJECT || !body.sub || body.exp < now || body.iat > now + 300) throw new Error('BAD_TOKEN');
  if (!JWKS || JWKS.exp < Date.now()) { const r = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'); JWKS = { keys: (await r.json()).keys || [], exp: Date.now() + 3600e3 }; }
  const jwk = JWKS.keys.find(k => k.kid === head.kid); if (!jwk) throw new Error('BAD_TOKEN');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uDec(p[2]), enc(p[0] + '.' + p[1]));
  if (!ok) throw new Error('BAD_TOKEN');
  return body.sub;
}

/* 서비스 계정 접근 토큰(Firestore) */
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
/* 사용 기록. 돌려줌: 'ok' | 'used' | 'nofs'(권한 없음 → 기기 기록으로 대체) */
async function recordUse(env, uid, key, rep) {
  let sa; try { sa = JSON.parse(env.GP_SA_JSON || ''); } catch (e) { return 'nofs'; }
  let at; try { at = await saToken(sa); } catch (e) { return 'nofs'; }
  const id = (uid + '_' + key).replace(/[^A-Za-z0-9_-]/g, '');
  const H = { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' };
  if (!rep) {
    const r = await fetch(FS + '/kzcoupon_use?documentId=' + id, { method: 'POST', headers: H, body: JSON.stringify({ fields: { uid: { stringValue: uid }, key: { stringValue: key }, n: { integerValue: '1' }, t: { timestampValue: new Date().toISOString() } } }) });
    if (r.status === 409) return 'used';
    if (r.status === 403 || r.status === 401 || r.status === 404) return 'nofs';
    return r.ok ? 'ok' : 'nofs';
  }
  const g = await fetch(FS + '/kzcoupon_use/' + id, { headers: H });
  if (g.status === 403 || g.status === 401) return 'nofs';
  const cur = g.ok ? +(((await g.json()).fields || {}).n || {}).integerValue || 0 : 0;
  const w = await fetch(FS + '/kzcoupon_use/' + id + '?updateMask.fieldPaths=uid&updateMask.fieldPaths=key&updateMask.fieldPaths=n&updateMask.fieldPaths=t', { method: 'PATCH', headers: H, body: JSON.stringify({ fields: { uid: { stringValue: uid }, key: { stringValue: key }, n: { integerValue: String(cur + 1) }, t: { timestampValue: new Date().toISOString() } } }) });
  return w.ok ? 'ok' : 'nofs';
}

export async function onRequestPost({ request, env }) {
  if (!env.KZPAY_HMAC) return J({ ok: false, code: 'not_configured' }, 503);
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, code: 'BAD_JSON' }, 400); }
  const code = String((b && b.code) || '').trim().toUpperCase();
  if (code.length < 4 || code.length > 32) return J({ ok: false, code: 'BAD_CODE' }, 400);
  let uid; try { uid = await verifyIdToken((request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')); } catch (e) { return J({ ok: false, code: 'LOGIN_REQUIRED' }, 401); }
  /* 쿠폰 찾기: 기존 표 → 환경변수 표 */
  let key = cpnHash(CPN_SALT + code), c = LEGACY[key];
  if (!c && env.KZ_COUPONS) { try { const T = JSON.parse(env.KZ_COUPONS); const k2 = 's' + (await hmac(env.KZPAY_HMAC, 'kzcpn:' + code)).slice(0, 24); if (T[k2]) { key = k2; c = T[k2]; } } catch (e) {} }
  if (!c) return J({ ok: false, code: 'NO_COUPON' }, 404);
  const st = await recordUse(env, uid, key, !!c.rep);
  if (st === 'used') return J({ ok: false, code: 'USED' }, 409);
  const reward = { jade: c.jade || 0, starter: c.starter ? 1 : 0, mbow: c.mbow ? 1 : 0, rep: !!c.rep };
  const t = Date.now(), nonce = hex(crypto.getRandomValues(new Uint8Array(8)));
  const payload = ['kzcpn', uid, key, reward.jade, reward.starter, t, nonce].join('|');
  return J({ ok: true, key, reward, mode: st === 'ok' ? 'server' : 'device', receipt: { p: payload, sig: await hmac(env.KZPAY_HMAC, payload) } });
}
export const onRequest = () => J({ ok: false, code: 'METHOD' }, 405);
