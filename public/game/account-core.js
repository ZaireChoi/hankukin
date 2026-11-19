/*
 * HANKUKIN PLAY 계정 (이메일 가입 + 게임 기록 클라우드 저장)
 *
 * 사용법
 *   (이 파일은 account-core.js. 브라우저 캐시 때문에 account.js 는 작은 로더만 두고 이 파일을 버전 붙여 불러온다)
 *   포털:  <script type="module" src="/game/account.js" data-mode="portal"></script>
 *   게임:  <script type="module" src="/game/account.js" data-game="anibrix" data-prefix="anibrix_"></script>
 *
 * 게임 쪽은 아무것도 고치지 않아도 된다. 게임이 이미 localStorage 에 저장하는 값
 * (경험치, 게임머니, 기술, 계급, 기록 등) 중 data-prefix 로 시작하는 키를 통째로
 * 계정에 올리고, 다른 기기에서 로그인하면 내려받는다.
 * 게임이 직접 쓰고 싶으면 window.HKAccount 를 쓴다 (아래 API 참고).
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signOut, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp, query, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Firebase 설정 (공개해도 되는 값. 보안은 Firestore 규칙이 맡는다) ──
const FIREBASE_CONFIG = { apiKey: "AIzaSyAqOGFP1fm-Aa18s1GAFGkUtLu-kvEo2cE", authDomain: "hankukin-play.firebaseapp.com", projectId: "hankukin-play", storageBucket: "hankukin-play.firebasestorage.app", messagingSenderId: "388085274912", appId: "1:388085274912:web:1c91b85b7f5deb6c459f45" };

// account.js(로더)가 넘겨준 설정. 로더 없이 직접 불러도 동작하게 스크립트 태그도 본다.
const SCRIPT = { dataset: window.__HKACC_CFG || ((document.querySelector('script[src*="/game/account"]') || {}).dataset) || {} };
const MODE = (SCRIPT && SCRIPT.dataset.mode) || 'game';
const GAME = (SCRIPT && SCRIPT.dataset.game) || '';
const PREFIXES = ((SCRIPT && SCRIPT.dataset.prefix) || (GAME ? GAME + '_' : '')).split(',').map(s => s.trim()).filter(Boolean);
const PORTAL = '/game/';
const GAME_NAMES = { anibrix: 'Anibrix', ascend: 'ASCEND' };
// 다른 게임 사이트(CrazyGames 등)에 올린 판에서는 우리 이메일 로그인을 보이지 않는다 (그 사이트 규칙: 외부 로그인 금지)
const EMBED_NOLOGIN = (() => { const hit = /[?&]src=crazygames\b/i.test(location.search); try { if (hit) sessionStorage.setItem('hk_nologin', '1'); return sessionStorage.getItem('hk_nologin') === '1'; } catch (e) { return hit; } })();

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
// 로그인 상태가 처음 확인될 때까지 기다리는 약속 (주간 순위 등에서 사용)
const authReady = new Promise(res => { const un = onAuthStateChanged(auth, u => { un(); res(u); }); });

// ── 언어 ──
function lang() {
  let l = null; try { l = localStorage.getItem('hk_play_lang'); } catch (e) {}
  if (!l) l = (navigator.language || 'ko').slice(0, 2);
  return l === 'ko' ? 'ko' : l === 'ja' ? 'ja' : l === 'zh' ? 'zh' : 'en';
}
const T = {
  ko: {
    login: '로그인', signup: '이메일로 가입', logout: '로그아웃', email: '이메일', pw: '비밀번호 (6자 이상)',
    doSignup: '가입하기', doLogin: '로그인', toLogin: '이미 계정이 있어요', toSignup: '처음이에요. 가입할래요',
    forgot: '비밀번호를 잊었어요', close: '닫기', why: '가입하면 경험치, 게임머니, 기술, 계급이 계정에 저장돼서 다른 기기에서도 이어서 할 수 있어요.',
    sentVerify: '가입 완료! 확인 메일을 보냈어요. 메일의 링크를 눌러 주세요.', sentReset: '비밀번호 재설정 메일을 보냈어요.',
    needEmail: '이메일을 먼저 입력해 주세요.', myRecords: '내 게임 기록', noRecords: '아직 저장된 기록이 없어요. 게임을 한 판 해 보세요!',
    saved: '저장됨', cloudOn: '☁ 기록이 계정에 저장되고 있어요', cloudOff: '☁ 로그인하면 기록이 저장돼요',
    conflictT: '기록이 두 개 있어요', conflictD: '이 기기에 있는 기록과 계정에 저장된 기록이 달라요. 어느 쪽을 쓸까요?',
    useCloud: '계정 기록 쓰기', useLocal: '이 기기 기록 쓰기', verifyWarn: '이메일 확인이 아직 안 됐어요.', resend: '확인 메일 다시 보내기',
    errInUse: '이미 가입된 이메일이에요. 로그인해 주세요.', errEmail: '이메일 형식이 맞지 않아요.', errWeak: '비밀번호는 6자 이상이어야 해요.',
    errCred: '이메일 또는 비밀번호가 맞지 않아요.', errMany: '시도가 너무 많아요. 잠시 후 다시 해 주세요.', errNet: '인터넷 연결을 확인해 주세요.', errEtc: '문제가 생겼어요: ',
    play: '플레이'
  },
  en: {
    login: 'Log in', signup: 'Sign up with email', logout: 'Log out', email: 'Email', pw: 'Password (6+ characters)',
    doSignup: 'Create account', doLogin: 'Log in', toLogin: 'I already have an account', toSignup: 'New here? Sign up',
    forgot: 'Forgot password', close: 'Close', why: 'With an account your XP, coins, skills and rank are saved, so you can continue on any device.',
    sentVerify: 'Done! We sent a confirmation email. Please click the link in it.', sentReset: 'Password reset email sent.',
    needEmail: 'Please enter your email first.', myRecords: 'My game records', noRecords: 'No saved records yet. Play a round!',
    saved: 'Saved', cloudOn: '☁ Progress is saved to your account', cloudOff: '☁ Log in to save your progress',
    conflictT: 'Two different saves', conflictD: 'This device and your account have different progress. Which one should we keep?',
    useCloud: 'Use account save', useLocal: 'Use this device', verifyWarn: 'Email not confirmed yet.', resend: 'Resend email',
    errInUse: 'This email is already registered. Please log in.', errEmail: 'Invalid email address.', errWeak: 'Password must be 6+ characters.',
    errCred: 'Wrong email or password.', errMany: 'Too many attempts. Try again later.', errNet: 'Check your internet connection.', errEtc: 'Something went wrong: ',
    play: 'Play'
  }
};
T.ja = Object.assign({}, T.en, { login: 'ログイン', signup: 'メールで登録', logout: 'ログアウト', myRecords: 'ゲーム記録', cloudOn: '☁ 記録はアカウントに保存中', cloudOff: '☁ ログインで記録を保存' });
T.zh = Object.assign({}, T.en, { login: '登录', signup: '邮箱注册', logout: '退出', myRecords: '我的游戏记录', cloudOn: '☁ 进度已保存到账号', cloudOff: '☁ 登录即可保存进度' });
const t = k => (T[lang()] || T.en)[k] ?? T.en[k];

function errMsg(e) {
  const c = (e && e.code) || '';
  if (c.includes('email-already-in-use')) return t('errInUse');
  if (c.includes('invalid-email')) return t('errEmail');
  if (c.includes('weak-password')) return t('errWeak');
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login')) return t('errCred');
  if (c.includes('too-many-requests')) return t('errMany');
  if (c.includes('network')) return t('errNet');
  return t('errEtc') + (c || (e && e.message) || e);
}

// ── 로컬 저장값 모으기 ──
function collectLocal(prefixes) {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && prefixes.some(p => k.startsWith(p))) out[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  return out;
}
function hashOf(obj) {
  const s = JSON.stringify(Object.keys(obj).sort().map(k => [k, obj[k]]));
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36) + ':' + s.length;
}
function applyLocal(prefixes, data) {
  try {
    const cur = collectLocal(prefixes);
    for (const k in cur) if (!(k in data)) localStorage.removeItem(k);
    for (const k in data) localStorage.setItem(k, data[k]);
  } catch (e) {}
}
const markKey = g => 'hk_sync_' + g;
function getMark(g) { try { return JSON.parse(localStorage.getItem(markKey(g)) || 'null'); } catch (e) { return null; } }
function setMark(g, m) { try { localStorage.setItem(markKey(g), JSON.stringify(m)); } catch (e) {} }

// ── 클라우드 ──
const saveRef = (uid, g) => doc(db, 'users', uid, 'saves', g);
async function pushSave(user, g, prefixes, reason) {
  const data = collectLocal(prefixes);
  const h = hashOf(data);
  const now = Date.now();
  await setDoc(saveRef(user.uid, g), { data, hash: h, updatedAtMs: now, updatedAt: serverTimestamp(), reason: reason || 'auto', ua: navigator.userAgent.slice(0, 120) });
  setMark(g, { uid: user.uid, at: now, hash: h });
  return h;
}
async function touchUser(user) {
  try { await setDoc(doc(db, 'users', user.uid), { email: user.email, lastSeen: serverTimestamp(), lastSeenMs: Date.now() }, { merge: true }); } catch (e) {}
}

// ── 스타일과 작은 화면 요소 ──
const CSS = `
.hkacc-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(5,8,18,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
.hkacc-box{width:100%;max-width:380px;background:#121a30;border:1px solid rgba(120,150,220,.3);border-radius:18px;padding:22px;color:#e9eefc;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.hkacc-box h3{margin:0 0 6px;font-size:20px}
.hkacc-box p{margin:0 0 14px;color:#9fb0d4;font-size:13.5px;line-height:1.5}
.hkacc-box input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:12px;border-radius:10px;border:1px solid #2f4470;background:#0a1222;color:#fff;font:inherit;font-size:16px}
.hkacc-btn{display:block;width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:0;font:inherit;font-weight:800;font-size:16px;cursor:pointer;background:linear-gradient(90deg,#3b82f6,#8b5cf6);color:#fff}
.hkacc-btn.sub{background:transparent;border:1px solid #2f4470;color:#cfdaf5;font-weight:600;font-size:14px;margin-top:8px}
.hkacc-link{background:none;border:0;color:#8fb4ff;font:inherit;font-size:13px;cursor:pointer;padding:6px 0;text-decoration:underline}
.hkacc-msg{min-height:18px;font-size:13px;margin:6px 0 4px;color:#ffb4b4}
.hkacc-msg.ok{color:#8ef0b0}
.hkacc-row{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hkacc-toast{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:2147483000;background:rgba(10,16,32,.88);color:#e9eefc;border:1px solid rgba(140,180,255,.35);border-radius:99px;padding:7px 14px;font:600 13px system-ui,-apple-system,"Malgun Gothic",sans-serif;transition:opacity .4s;cursor:pointer;white-space:nowrap}
.hkacc-who{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:#cfdaf5}
.hkacc-who button,.hkacc-open{background:rgba(80,120,220,.25);border:1px solid #8fb4ff;color:#fff;border-radius:99px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.hkacc-rec{margin-top:26px;border:1px solid rgba(120,150,220,.22);border-radius:18px;padding:16px 18px;background:rgba(14,20,40,.6)}
.hkacc-rec h3{margin:0 0 8px;font-size:17px}
.hkacc-rec ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.hkacc-rec li{display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:14px;color:#cbd6f2;border-top:1px solid rgba(120,150,220,.12);padding-top:8px}
.hkacc-rec li a{color:#8fb4ff;font-weight:700}
`;
function injectCSS() { if (document.getElementById('hkacc-css')) return; const s = document.createElement('style'); s.id = 'hkacc-css'; s.textContent = CSS; document.head.appendChild(s); }
function el(tag, attrs, html) { const e = document.createElement(tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
function toast(text, ms, onClick) {
  injectCSS();
  const d = el('div', { class: 'hkacc-toast' }); d.textContent = text; document.body.appendChild(d);
  if (onClick) d.onclick = onClick;
  setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, ms || 3500);
}

// ── 가입/로그인 창 ──
function openAuthModal(startMode) {
  injectCSS();
  let mode = startMode || 'signup';
  const ov = el('div', { class: 'hkacc-ov' });
  const box = el('div', { class: 'hkacc-box' });
  ov.appendChild(box); document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  function render() {
    box.innerHTML = '';
    box.appendChild(el('h3', null, mode === 'signup' ? t('signup') : t('login')));
    box.appendChild(el('p', null, t('why')));
    const em = el('input', { type: 'email', autocomplete: 'email', placeholder: t('email'), inputmode: 'email' });
    const pw = el('input', { type: 'password', autocomplete: mode === 'signup' ? 'new-password' : 'current-password', placeholder: t('pw') });
    const msg = el('div', { class: 'hkacc-msg' });
    const go = el('button', { class: 'hkacc-btn', type: 'button' }, mode === 'signup' ? t('doSignup') : t('doLogin'));
    const sw = el('button', { class: 'hkacc-btn sub', type: 'button' }, mode === 'signup' ? t('toLogin') : t('toSignup'));
    const row = el('div', { class: 'hkacc-row' });
    const forgot = el('button', { class: 'hkacc-link', type: 'button' }, t('forgot'));
    const close = el('button', { class: 'hkacc-link', type: 'button' }, t('close'));
    if (mode === 'login') row.appendChild(forgot); else row.appendChild(el('span'));
    row.appendChild(close);
    box.append(em, pw, msg, go, sw, row);
    setTimeout(() => em.focus(), 50);
    const submit = async () => {
      msg.className = 'hkacc-msg'; msg.textContent = '…'; go.disabled = true;
      try {
        if (mode === 'signup') {
          const cr = await createUserWithEmailAndPassword(auth, em.value.trim(), pw.value);
          try { auth.languageCode = lang(); await sendEmailVerification(cr.user); } catch (e) {}
          msg.className = 'hkacc-msg ok'; msg.textContent = t('sentVerify');
          setTimeout(() => ov.remove(), 2500);
        } else {
          await signInWithEmailAndPassword(auth, em.value.trim(), pw.value);
          ov.remove();
        }
      } catch (e) { msg.className = 'hkacc-msg'; msg.textContent = errMsg(e); }
      go.disabled = false;
    };
    go.onclick = submit;
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    sw.onclick = () => { mode = mode === 'signup' ? 'login' : 'signup'; render(); };
    close.onclick = () => ov.remove();
    forgot.onclick = async () => {
      if (!em.value.trim()) { msg.className = 'hkacc-msg'; msg.textContent = t('needEmail'); return; }
      try { auth.languageCode = lang(); await sendPasswordResetEmail(auth, em.value.trim()); msg.className = 'hkacc-msg ok'; msg.textContent = t('sentReset'); }
      catch (e) { msg.className = 'hkacc-msg'; msg.textContent = errMsg(e); }
    };
  }
  render();
}

function chooseModal() {
  return new Promise(resolve => {
    injectCSS();
    const ov = el('div', { class: 'hkacc-ov' });
    const box = el('div', { class: 'hkacc-box' });
    box.append(el('h3', null, t('conflictT')), el('p', null, t('conflictD')));
    const a = el('button', { class: 'hkacc-btn', type: 'button' }, t('useCloud'));
    const b = el('button', { class: 'hkacc-btn sub', type: 'button' }, t('useLocal'));
    a.onclick = () => { ov.remove(); resolve('cloud'); };
    b.onclick = () => { ov.remove(); resolve('local'); };
    box.append(a, b); ov.appendChild(box); document.body.appendChild(ov);
  });
}

// ── 게임 모드: 자동 동기화 ──
let timer = null, lastHash = null, busy = false, ready = false;
// 계정 기록을 이 기기에 덮어쓴 뒤 새로고침할 때, 게임이 끝나면서 옛 값을 다시 저장하지 못하게 막는다.
function freezeAndReload() {
  try {
    const P = Storage.prototype, oSet = P.setItem, oRem = P.removeItem;
    const hit = k => typeof k === 'string' && PREFIXES.some(p => k.startsWith(p));
    P.setItem = function (k, v) { if (this === localStorage && hit(k)) return; return oSet.call(this, k, v); };
    P.removeItem = function (k) { if (this === localStorage && hit(k)) return; return oRem.call(this, k); };
  } catch (e) {}
  location.reload();
}
async function syncGame(user) {
  ready = false;
  if (!GAME || !PREFIXES.length) return;
  const local = collectLocal(PREFIXES);
  const lh = hashOf(local);
  const hasLocal = Object.keys(local).length > 0;
  const mark = getMark(GAME);
  let snap = null;
  try { snap = await getDoc(saveRef(user.uid, GAME)); } catch (e) { console.warn('[HKAccount] load failed', e); return; }
  const cloud = snap.exists() ? snap.data() : null;

  if (!cloud) {
    if (hasLocal) await pushSave(user, GAME, PREFIXES, 'first');
    lastHash = lh;
  } else if (cloud.hash === lh) {
    setMark(GAME, { uid: user.uid, at: cloud.updatedAtMs || Date.now(), hash: lh });
    lastHash = lh;
  } else {
    const sameAcc = mark && mark.uid === user.uid;
    const cloudNewer = !sameAcc || (cloud.updatedAtMs || 0) > (mark.at || 0);
    const localChanged = sameAcc && mark.hash !== lh;
    let pick;
    if (!hasLocal) pick = 'cloud';
    // 이 기기에서 한 번도 동기화한 적 없고, 이 기기 기록이 계정 기록보다 작으면(막 설치한 기기) 계정 기록을 쓴다
    else if (!mark && Object.keys(local).length < Object.keys(cloud.data || {}).length) pick = 'cloud';
    else if (sameAcc && cloudNewer && !localChanged) pick = 'cloud';
    else if (sameAcc && !cloudNewer) pick = 'local';
    else pick = await chooseModal();
    if (pick === 'cloud') {
      applyLocal(PREFIXES, cloud.data || {});
      setMark(GAME, { uid: user.uid, at: cloud.updatedAtMs || Date.now(), hash: cloud.hash });
      const rk = 'hk_reloaded_' + GAME;
      if (!sessionStorage.getItem(rk)) { sessionStorage.setItem(rk, '1'); freezeAndReload(); return; }
    } else {
      await pushSave(user, GAME, PREFIXES, 'choose-local');
    }
    lastHash = hashOf(collectLocal(PREFIXES));
  }
  try { sessionStorage.removeItem('hk_reloaded_' + GAME); } catch (e) {}
  ready = true;
  toast(t('cloudOn'), 3000);
  clearInterval(timer);
  timer = setInterval(() => flush('interval'), 15000);
}
async function flush(reason) {
  const user = auth.currentUser;
  if (!user || !GAME || busy || !ready) return;
  const h = hashOf(collectLocal(PREFIXES));
  if (h === lastHash) return;
  busy = true;
  try { lastHash = await pushSave(user, GAME, PREFIXES, reason); } catch (e) { console.warn('[HKAccount] save failed', e); }
  busy = false;
}
if (MODE !== 'portal') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush('hidden'); });
  addEventListener('pagehide', () => flush('pagehide'));
}

// ── 포털 모드: 로그인 버튼 + 내 기록 ──
function fmtTime(ms) { try { return new Date(ms).toLocaleString(lang() === 'ko' ? 'ko-KR' : undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } }
function summarize(g, data) {
  // 게임 저장값에서 알아볼 수 있는 숫자만 골라 보여 준다.
  const bits = [];
  const ko = lang() === 'ko';
  const num = k => { const v = Number(String(data[k] ?? '').replace(/"/g, '')); return isFinite(v) && data[k] != null ? v : null; };
  try {
    if (g === 'anibrix') {
      const lv = num('anibrix_plv'), xp = num('anibrix_xp'), co = num('anibrix_coins');
      if (lv != null) bits.push((ko ? '레벨 ' : 'Lv ') + lv);
      if (xp != null) bits.push((ko ? '경험치 ' : 'XP ') + xp.toLocaleString());
      if (co != null) bits.push((ko ? '코인 ' : 'Coins ') + co.toLocaleString());
      return bits.join(' · ');
    }
    if (g === 'ascend' && data.ascend_profile_v2) {
      const p = JSON.parse(data.ascend_profile_v2);
      const sk = Object.values(p.skills || {}).reduce((a, b) => a + (Number(b) || 0), 0);
      bits.push((ko ? '계급 ' : 'Rank ') + ((p.rank || 0) + 1) + (ko ? '단계' : ''));
      bits.push((ko ? '공훈 ' : 'Merit ') + (p.merit || 0).toLocaleString());
      bits.push((ko ? '기술 ' : 'Skills ') + sk);
      return bits.join(' · ');
    }
    for (const k in data) {
      let v; try { v = JSON.parse(data[k]); } catch (e) { continue; }
      if (!v || typeof v !== 'object') continue;
      const pick = (names, label) => { for (const n of names) if (typeof v[n] === 'number' && !bits.some(b => b.startsWith(label))) { bits.push(label + ' ' + v[n].toLocaleString()); return; } };
      pick(['rank', 'rk', 'level', 'lv'], lang() === 'ko' ? '레벨' : 'Lv');
      pick(['xp', 'exp', 'merit', 'merits'], lang() === 'ko' ? '경험치' : 'XP');
      pick(['coins', 'coin', 'gold', 'money', 'credits'], lang() === 'ko' ? '머니' : 'Coins');
      pick(['stage', 'chapter', 'best'], lang() === 'ko' ? '진행' : 'Stage');
    }
  } catch (e) {}
  return bits.slice(0, 3).join(' · ');
}
async function renderPortal(user) {
  injectCSS();
  let slot = document.getElementById('hkacc-slot');
  if (!slot) {
    const header = document.querySelector('header');
    slot = el('div', { id: 'hkacc-slot' });
    if (header) header.appendChild(slot); else document.body.prepend(slot);
  }
  slot.innerHTML = '';
  let rec = document.getElementById('hkacc-rec');
  if (!user) {
    const b = el('button', { class: 'hkacc-open', type: 'button' }, t('login') + ' / ' + (lang() === 'ko' ? '가입' : 'Sign up'));
    b.onclick = () => openAuthModal('signup');
    slot.appendChild(b);
    if (rec) rec.remove();
    return;
  }
  const who = el('span', { class: 'hkacc-who' });
  who.appendChild(el('span', null, (user.email || '').replace(/(.{2}).*(@.*)/, '$1***$2')));
  const lo = el('button', { type: 'button' }, t('logout'));
  lo.onclick = () => signOut(auth);
  who.appendChild(lo);
  slot.appendChild(who);

  if (!rec) {
    rec = el('section', { id: 'hkacc-rec', class: 'hkacc-rec' });
    const anchor = document.querySelector('.how') || document.querySelector('footer');
    if (anchor) anchor.parentNode.insertBefore(rec, anchor); else document.body.appendChild(rec);
  }
  rec.innerHTML = '';
  rec.appendChild(el('h3', null, t('myRecords')));
  if (!user.emailVerified) {
    const w = el('p', { style: 'color:#ffd38a;font-size:13px;margin:0 0 8px' }, t('verifyWarn') + ' ');
    const rs = el('button', { class: 'hkacc-link', type: 'button' }, t('resend'));
    rs.onclick = async () => { try { auth.languageCode = lang(); await sendEmailVerification(user); rs.textContent = '✓'; } catch (e) { rs.textContent = errMsg(e); } };
    w.appendChild(rs); rec.appendChild(w);
  }
  const ul = el('ul'); rec.appendChild(ul);
  try {
    const qs = await getDocs(collection(db, 'users', user.uid, 'saves'));
    if (qs.empty) ul.appendChild(el('li', null, t('noRecords')));
    qs.forEach(d => {
      const v = d.data();
      const li = el('li');
      const left = el('span', null, '<b>' + (GAME_NAMES[d.id] || d.id) + '</b> ' + (summarize(d.id, v.data || {}) || ''));
      const right = el('span', null, t('saved') + ' ' + fmtTime(v.updatedAtMs) + ' · <a href="/game/' + d.id + '/">' + t('play') + ' ▶</a>');
      li.append(left, right); ul.appendChild(li);
    });
  } catch (e) { ul.appendChild(el('li', null, errMsg(e))); }
}

// ── 공개 API ──
const listeners = new Set();
window.HKAccount = {
  get user() { return auth.currentUser; },
  openLogin: () => openAuthModal('login'),
  openSignup: () => openAuthModal('signup'),
  logout: () => signOut(auth),
  onChange: fn => { listeners.add(fn); fn(auth.currentUser); return () => listeners.delete(fn); },
  saveNow: () => flush('manual'),
  // 게임이 직접 값을 저장/불러오고 싶을 때 (localStorage 와 별개)
  async save(key, value) { const u = auth.currentUser; if (!u) return false; await setDoc(doc(db, 'users', u.uid, 'kv', key), { v: JSON.stringify(value), at: Date.now() }); return true; },
  async load(key) { const u = auth.currentUser; if (!u) return null; const s = await getDoc(doc(db, 'users', u.uid, 'kv', key)); return s.exists() ? JSON.parse(s.data().v) : null; },
  whenReady: () => authReady,
  // 전 세계 순위표: leaderboards/{boardId}/entries/{uid} (자기 점수보다 높을 때만 올린다)
  async submitScore(boardId, score, name) {
    const u = auth.currentUser; if (!u) return false;
    score = Math.max(0, Math.min(99999999, Math.floor(Number(score) || 0)));
    const ref = doc(db, 'leaderboards', String(boardId), 'entries', u.uid);
    let prev = null; try { const s = await getDoc(ref); if (s.exists()) prev = s.data().score; } catch (e) {}
    if (prev != null && prev >= score) return false;
    await setDoc(ref, { name: String(name || 'Player').slice(0, 20), score, at: Date.now() });
    return true;
  },
  // 서버 전체 고유 소유권: unique/{key} (먼저 만든 계정이 영구 소유, 규칙상 수정·삭제 불가)
  async claimUnique(key, info) {
    const u = auth.currentUser; if (!u) return { ok: false, reason: 'login' };
    const ref = doc(db, 'unique', String(key));
    try { const s = await getDoc(ref); if (s.exists()) return { ok: s.data().uid === u.uid, owner: s.data(), reason: s.data().uid === u.uid ? 'mine' : 'taken' }; } catch (e) {}
    try { await setDoc(ref, Object.assign({}, info || {}, { uid: u.uid, email: u.email || '', at: Date.now() })); return { ok: true, reason: 'claimed' }; }
    catch (e) { return { ok: false, reason: 'taken', err: String(e && e.code || e) }; }
  },
  async getUnique(key) { try { const s = await getDoc(doc(db, 'unique', String(key))); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async topScores(boardId, n) {
    const qs = await getDocs(query(collection(db, 'leaderboards', String(boardId), 'entries'), orderBy('score', 'desc'), limit(n || 50)));
    const out = []; qs.forEach(d => out.push(Object.assign({ id: d.id }, d.data()))); return out;
  }
};

if (EMBED_NOLOGIN) { window.HKAccount.disabled = true; window.HKAccount.openLogin = window.HKAccount.openSignup = () => {}; }
let firstState = true;
onAuthStateChanged(auth, async user => {
  listeners.forEach(fn => { try { fn(user); } catch (e) {} });
  if (user) touchUser(user);
  if (MODE === 'portal') { renderPortal(user); if (!user && /[?&]login=1/.test(location.search) && firstState) openAuthModal('signup'); }
  else if (user) { syncGame(user); }
  else {
    ready = false; clearInterval(timer);
    if (firstState && GAME && !EMBED_NOLOGIN) toast(t('cloudOff'), 4500, () => { location.href = PORTAL + '?login=1'; });
  }
  firstState = false;
});
