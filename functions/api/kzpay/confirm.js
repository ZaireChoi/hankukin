/* 조선좀비 결제 승인 (Cloudflare Pages Functions)
   POST /api/kzpay/confirm  { paymentKey, orderId, amount, item }
   - 가격은 서버 표(PRICES)로 다시 확인한다(브라우저가 보낸 금액을 믿지 않음).
   - 비밀키는 Cloudflare Pages 환경변수 TOSS_SECRET_KEY. 없으면 토스 문서에 공개된 '시험' 키로만 동작(실제 돈 안 나감).
   - 승인되면 KZPAY_HMAC 으로 서명한 영수증을 돌려준다. 게임은 영수증을 받은 주문번호만 한 번 지급한다. */
const PRICES = { jade300: [500, '옥 주머니 (옥 300)'], jade1k: [990, '옥 상자 (옥 1,000)'], starter: [990, '신규 스타트팩'], pass: [990, '황금 패스'] };
const TEST_SK = 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R'; /* 토스페이먼츠 개발자 문서의 공개 시험 키 */
const J = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return J({ ok: false, code: 'BAD_JSON' }, 400); }
  const { paymentKey, orderId, item } = b || {}; const amount = Number(b && b.amount);
  const P = PRICES[item];
  if (!P || !paymentKey || !/^kz-[a-z0-9]+-[A-Za-z0-9_-]{6,40}$/.test(orderId || '')) return J({ ok: false, code: 'BAD_REQ' }, 400);
  if (amount !== P[0]) return J({ ok: false, code: 'BAD_AMOUNT' }, 400);
  if (orderId.split('-')[1] !== item.toLowerCase()) return J({ ok: false, code: 'ITEM_MISMATCH' }, 400);
  const sk = env.TOSS_SECRET_KEY || TEST_SK, live = /^live_/.test(sk);
  const r = await fetch('https://api.tosspayments.com/v1/payments/confirm', { method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(sk + ':'), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
    body: JSON.stringify({ paymentKey, orderId, amount }) });
  const t = await r.json().catch(() => ({}));
  if (!r.ok && t.code !== 'ALREADY_PROCESSED_PAYMENT') return J({ ok: false, code: t.code || 'CONFIRM_FAIL', message: t.message || '' }, 400);
  const at = Date.now(), sig = await hmac(env.KZPAY_HMAC || 'kz-test-only', [orderId, item, amount, at].join('|'));
  return J({ ok: true, live, receipt: { orderId, item, amount, at, method: t.method || '', sig } });
}
export const onRequestGet = () => J({ ok: true, service: 'kzpay', test: true });
