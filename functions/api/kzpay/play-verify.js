/* 조선좀비 앱(구글 플레이) 결제 확인 (Cloudflare Pages Functions)
   POST /api/kzpay/play-verify  { productId, purchaseToken, packageName }
   - 비밀 환경변수: GP_SA_JSON (구글 서비스 계정 키 JSON), KZPAY_HMAC (영수증 서명 키). 없으면 503 not_configured.
   - Google Play Developer API 로 구매를 확인(purchaseState 0)하고 소모(consume)한 뒤, 웹 결제와 같은 형식의 서명 영수증을 돌려준다.
   - 게임은 영수증의 주문번호마다 한 번만 지급한다(payClaim). */
const PKG = 'com.hankukin.kzombi';
const PRODUCTS = { kz_jade_s: ['jade300', 500], kz_jade_m: ['jade1k', 990], kz_starter: ['starter', 990], kz_pass: ['pass', 990] };
const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const enc = s => new TextEncoder().encode(s);
const b64u = buf => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64uStr = str => b64u(enc(str));
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, enc(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, '0')).join('');
}
let TOK = null; /* { v, exp } — 같은 작업자 안에서만 재사용 */
async function accessToken(sa) {
  if (TOK && TOK.exp > Date.now() + 60000) return TOK.v;
  const now = Math.floor(Date.now() / 1000);
  const head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64uStr(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc(head + '.' + claim));
  const jwt = head + '.' + claim + '.' + b64u(sig);
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt });
  const t = await r.json().catch(() => ({}));
  if (!r.ok || !t.access_token) throw new Error('TOKEN_FAIL');
  TOK = { v: t.access_token, exp: Date.now() + (t.expires_in || 3600) * 1000 };
  return TOK.v;
}
export async function onRequestPost({ request, env }) {
  if (!env.GP_SA_JSON || !env.KZPAY_HMAC) return J({ ok: false, code: 'not_configured' }, 503);
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, code: 'BAD_JSON' }, 400); }
  const productId = b && b.productId, token = b && b.purchaseToken, pkg = (b && b.packageName) || PKG;
  const P = PRODUCTS[productId];
  if (!P || pkg !== PKG || typeof token !== 'string' || token.length < 10 || token.length > 2048) return J({ ok: false, code: 'BAD_REQ' }, 400);
  let sa; try { sa = JSON.parse(env.GP_SA_JSON); } catch (e) { return J({ ok: false, code: 'not_configured' }, 503); }
  let at; try { at = await accessToken(sa); } catch (e) { return J({ ok: false, code: 'AUTH_FAIL' }, 502); }
  const base = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/' + PKG + '/purchases/products/' + encodeURIComponent(productId) + '/tokens/' + encodeURIComponent(token);
  const r = await fetch(base, { headers: { Authorization: 'Bearer ' + at } });
  const p = await r.json().catch(() => ({}));
  if (!r.ok) return J({ ok: false, code: r.status === 404 || r.status === 400 ? 'NOT_FOUND' : 'VERIFY_FAIL' }, 400);
  if (p.purchaseState !== 0) return J({ ok: false, code: p.purchaseState === 2 ? 'PENDING' : 'NOT_PURCHASED' }, 400);
  let again = false;
  if (p.consumptionState === 1) again = true; /* 이미 소모됨: 같은 영수증을 다시 돌려준다(게임이 주문번호로 중복 지급을 막음) */
  else {
    const c = await fetch(base + ':consume', { method: 'POST', headers: { Authorization: 'Bearer ' + at } });
    if (!c.ok) return J({ ok: false, code: 'CONSUME_FAIL' }, 502);
  }
  const orderId = 'gp-' + (p.orderId || token.slice(0, 40)), item = P[0], amount = P[1], ts = Date.now();
  const sig = await hmac(env.KZPAY_HMAC, [orderId, item, amount, ts].join('|'));
  return J({ ok: true, live: p.purchaseType !== 0, again, receipt: { orderId, item, amount, at: ts, method: 'play', sig } });
}
export const onRequestGet = ({ env }) => J({ ok: true, service: 'kzpay-play', configured: !!(env.GP_SA_JSON && env.KZPAY_HMAC) });
