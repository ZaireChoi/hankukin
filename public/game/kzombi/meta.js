/* 처용, 조선좀비 바깥 화면: 첫 화면, 로비(상점/장비/모험/동료/신력), 챕터 지도, 결과, 저장
   전투와의 약속은 CONTRACT.md 를 따른다. */
window.JZMETA = true;
window.IS_EN = window.JZL ? window.JZL === 'en' : /[?&]lang=en/.test(location.search) || (!/[?&]lang=ko/.test(location.search) && !/^ko/i.test(navigator.language || 'ko'));
if (window.IS_EN) document.title = 'K Zombi';
(function () {
  'use strict';
  const W = 720, H = 1280;
  const $ = (q, r) => (r || document).querySelector(q);
  const fmt = n => { n = Math.floor(n); if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K'; return n.toLocaleString('ko-KR'); };
  const now = () => Date.now();
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  /* ---------------- 그림 기호(SVG) ---------------- */
  const I = {
    coin: '<circle cx="32" cy="32" r="27" fill="#b8790f"/><circle cx="32" cy="30" r="26" fill="url(#gCoin)" stroke="#7a4a05" stroke-width="3"/><circle cx="32" cy="30" r="19" fill="none" stroke="#a86a0a" stroke-width="2.5"/><rect x="24" y="22" width="16" height="16" rx="2" fill="#4a2a05" stroke="#ffe9a0" stroke-width="2"/><path d="M14 22a20 20 0 0 1 12-10" stroke="#fff6c8" stroke-width="4" fill="none" stroke-linecap="round"/>',
    jade: '<path d="M38 6c13 2 21 14 18 27-3 14-17 25-31 23-9-1-14-9-11-16 2-6 9-8 14-6 6 2 9-2 8-7-1-6-6-9-10-9 3-8 7-13 12-12z" fill="#0e7a44"/><path d="M37 4c13 2 21 14 18 27-3 14-17 24-31 22-9-1-14-9-11-16 2-6 9-8 14-6 6 2 9-2 8-7-1-6-6-9-10-9 3-8 7-12 12-11z" fill="url(#gJade)" stroke="#06502b" stroke-width="2.5"/><circle cx="42" cy="18" r="5" fill="#06502b"/><path d="M30 10c4-3 9-3 12-2" stroke="#d6ffe6" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    torch: '<path d="M27 30h10l-2 28h-6z" fill="#7a4520" stroke="#3a1d0a" stroke-width="2.5"/><rect x="24" y="27" width="16" height="7" rx="2" fill="#c08a3a" stroke="#3a1d0a" stroke-width="2"/><path d="M32 4c6 8 12 12 11 19-1 6-5 8-11 8s-10-2-11-8c-1-6 4-9 6-14 1 4 3 5 5 6-1-4-1-7 0-11z" fill="#ff7a1a" stroke="#8a2a00" stroke-width="2"/><path d="M32 14c3 5 6 7 5 11-1 3-3 4-5 4s-5-1-5-4c0-3 2-5 3-8 0 2 1 3 2 3 0-2 0-4 0-6z" fill="#ffe14a"/>',
    stone: '<path d="M32 4l22 14v28L32 60 10 46V18z" fill="url(#gStone)" stroke="#3a1670" stroke-width="3"/><path d="M32 4v56M10 18l22 14 22-14" stroke="#e8d4ff" stroke-width="2" fill="none" opacity=".6"/><path d="M20 20l8-5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    sword: '<path d="M44 6l14 0 0 14-26 26-14-14z" fill="#dfe8f5" stroke="#2a3350" stroke-width="3" stroke-linejoin="round"/><path d="M22 34l8 8" stroke="#2a3350" stroke-width="2"/><path d="M12 36l16 16-5 5-16-16z" fill="#f0b030" stroke="#5a3a00" stroke-width="3"/><path d="M14 50l-8 8" stroke="#7a4520" stroke-width="7" stroke-linecap="round"/>',
    heart: '<path d="M32 56C14 42 6 32 6 21 6 12 13 6 21 6c5 0 9 3 11 7 2-4 6-7 11-7 8 0 15 6 15 15 0 11-8 21-26 35z" fill="#ff4a5a" stroke="#7a0a14" stroke-width="3"/><path d="M14 18c1-4 4-6 8-6" stroke="#ffd0d6" stroke-width="4" fill="none" stroke-linecap="round"/>',
    power: '<path d="M8 50L40 8l4 4-28 40z" fill="#e6eefc" stroke="#2a3350" stroke-width="2.5"/><path d="M56 50L24 8l-4 4 28 40z" fill="#e6eefc" stroke="#2a3350" stroke-width="2.5"/><circle cx="14" cy="52" r="6" fill="#f0b030" stroke="#5a3a00" stroke-width="2.5"/><circle cx="50" cy="52" r="6" fill="#f0b030" stroke="#5a3a00" stroke-width="2.5"/>',
    lock: '<rect x="12" y="28" width="40" height="30" rx="6" fill="#ffd36b" stroke="#5a3a00" stroke-width="3"/><path d="M20 28v-8a12 12 0 0 1 24 0v8" fill="none" stroke="#c9d3e6" stroke-width="6"/><circle cx="32" cy="42" r="5" fill="#5a3a00"/><rect x="30" y="44" width="4" height="8" fill="#5a3a00"/>',
    star: '<path d="M32 4l8 18 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z" fill="#ffd23a" stroke="#8a5200" stroke-width="3" stroke-linejoin="round"/><path d="M24 22l6-1" stroke="#fff6c0" stroke-width="3" stroke-linecap="round"/>',
    star0: '<path d="M32 4l8 18 19 2-14 13 4 19-17-10-17 10 4-19L5 24l19-2z" fill="#3a3f5a" stroke="#1a1d2e" stroke-width="3" stroke-linejoin="round"/>',
    chest: '<path d="M6 28h52v26a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#a0521c" stroke="#3a1a05" stroke-width="3"/><path d="M6 28c0-12 10-20 26-20s26 8 26 20z" fill="#c8692a" stroke="#3a1a05" stroke-width="3"/><path d="M6 28h52" stroke="#ffd36b" stroke-width="5"/><path d="M14 10v48M50 10v48" stroke="#ffd36b" stroke-width="4"/><rect x="26" y="26" width="12" height="14" rx="2" fill="#ffd36b" stroke="#3a1a05" stroke-width="2.5"/>',
    chestOpen: '<path d="M6 32h52v22a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" fill="#a0521c" stroke="#3a1a05" stroke-width="3"/><path d="M8 30L14 6h36l6 24z" fill="#5a2a0a" stroke="#3a1a05" stroke-width="3"/><circle cx="32" cy="28" r="12" fill="#ffe27a"/><path d="M6 32h52" stroke="#ffd36b" stroke-width="5"/>',
    gift: '<rect x="8" y="24" width="48" height="34" rx="4" fill="#e8434a" stroke="#5a0a10" stroke-width="3"/><rect x="5" y="18" width="54" height="12" rx="3" fill="#ff6a6a" stroke="#5a0a10" stroke-width="3"/><path d="M32 18v40" stroke="#ffd36b" stroke-width="8"/><path d="M32 18c-6-12-20-12-18-2 1 4 10 3 18 2zM32 18c6-12 20-12 18-2-1 4-10 3-18 2z" fill="#ffd36b" stroke="#7a4a00" stroke-width="2.5"/>',
    scroll: '<rect x="12" y="10" width="40" height="44" rx="3" fill="#f3e2b8" stroke="#6a4a1a" stroke-width="3"/><rect x="8" y="6" width="48" height="8" rx="4" fill="#b03a2a" stroke="#4a0a05" stroke-width="2.5"/><rect x="8" y="50" width="48" height="8" rx="4" fill="#b03a2a" stroke="#4a0a05" stroke-width="2.5"/><path d="M20 24h24M20 32h24M20 40h16" stroke="#6a4a1a" stroke-width="3" stroke-linecap="round"/>',
    mail: '<rect x="6" y="14" width="52" height="38" rx="5" fill="#f5f0e0" stroke="#3a3a5a" stroke-width="3"/><path d="M8 17l24 19 24-19" fill="none" stroke="#3a3a5a" stroke-width="3"/><circle cx="32" cy="38" r="6" fill="#d0283a"/>',
    gear: '<path d="M27 4h10l2 8 7 3 7-5 7 7-5 7 3 7 8 2v10l-8 2-3 7 5 7-7 7-7-5-7 3-2 8H27l-2-8-7-3-7 5-7-7 5-7-3-7-8-2V27l8-2 3-7-5-7 7-7 7 5 7-3z" fill="#aab8d8" stroke="#2a3350" stroke-width="3" transform="scale(.94) translate(2 2)"/><circle cx="32" cy="32" r="9" fill="#2a3350"/>',
    back: '<path d="M40 10L18 32l22 22" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
    arrowL: '<path d="M44 6L12 38l32 32z" fill="#ffd36b" stroke="#6b4a12" stroke-width="4" stroke-linejoin="round"/>',
    arrowR: '<path d="M20 6l32 32-32 32z" fill="#ffd36b" stroke="#6b4a12" stroke-width="4" stroke-linejoin="round"/>',
    note: '<path d="M24 46V12l28-6v34" fill="none" stroke="#fff" stroke-width="5"/><circle cx="18" cy="46" r="8" fill="#fff"/><circle cx="46" cy="40" r="8" fill="#fff"/>',
    noteOff: '<path d="M24 46V12l28-6v34" fill="none" stroke="#889" stroke-width="5"/><circle cx="18" cy="46" r="8" fill="#889"/><circle cx="46" cy="40" r="8" fill="#889"/><path d="M8 8l48 48" stroke="#e33" stroke-width="6" stroke-linecap="round"/>',
    /* 탭 */
    tShop: '<path d="M6 26L12 8h40l6 18z" fill="#e8434a" stroke="#4a0a10" stroke-width="3"/><path d="M6 26h52v4a8 8 0 0 1-13 0 8 8 0 0 1-13 0 8 8 0 0 1-13 0 8 8 0 0 1-13 0z" fill="#fff" stroke="#4a0a10" stroke-width="3"/><rect x="10" y="34" width="44" height="24" rx="3" fill="#c8823a" stroke="#4a2a05" stroke-width="3"/><rect x="26" y="40" width="12" height="18" fill="#5a2a0a"/>',
    tEquip: '<ellipse cx="32" cy="44" rx="28" ry="9" fill="#2a2a3a" stroke="#0a0a14" stroke-width="3"/><path d="M20 44V20a12 6 0 0 1 24 0v24" fill="#3a3a52" stroke="#0a0a14" stroke-width="3"/><ellipse cx="32" cy="20" rx="12" ry="5" fill="#4a4a66" stroke="#0a0a14" stroke-width="2.5"/><path d="M20 38h24" stroke="#d0283a" stroke-width="4"/><path d="M14 46c4 2 8 3 14 3" stroke="#8a8aa8" stroke-width="2.5" fill="none"/>',
    tAdv: '<circle cx="32" cy="32" r="29" fill="url(#gAdv)" stroke="#6b2a00" stroke-width="3"/><circle cx="32" cy="32" r="22" fill="none" stroke="#ffe9a0" stroke-width="2.5" stroke-dasharray="4 4"/><path d="M20 46L44 14M44 46L20 14" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M20 46L44 14M44 46L20 14" stroke="#2a3350" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="30" r="6" fill="#ffd36b" stroke="#6b2a00" stroke-width="2.5"/>',
    tComp: '<circle cx="22" cy="24" r="11" fill="#7fd36a" stroke="#1a4a10" stroke-width="3"/><path d="M18 13l4-8 4 8" fill="#f0e0c0" stroke="#1a4a10" stroke-width="2"/><path d="M4 56c0-12 8-18 18-18s18 6 18 18z" fill="#ff8a2a" stroke="#5a2a00" stroke-width="3"/><circle cx="44" cy="22" r="10" fill="#8fa8d8" stroke="#1a2a5a" stroke-width="3"/><path d="M28 56c0-10 7-16 16-16s16 6 16 16z" fill="#4a7ad8" stroke="#1a2a5a" stroke-width="3"/>',
    tPower: '<rect x="14" y="4" width="36" height="56" rx="3" fill="#ffe27a" stroke="#8a4a00" stroke-width="3"/><path d="M32 12c5 7 9 10 8 16-1 5-4 7-8 7s-8-2-8-7c0-5 3-8 4-12 1 3 2 4 4 5-1-3-1-6 0-9z" fill="#e8343a"/><path d="M22 42h20M22 48h20M26 54h12" stroke="#b02a1a" stroke-width="3" stroke-linecap="round"/>',
    /* 장비 칸 */
    bow: '<path d="M18 6c22 6 30 26 24 52" fill="none" stroke="#7a4520" stroke-width="7" stroke-linecap="round"/><path d="M18 6c22 6 30 26 24 52" fill="none" stroke="#c8823a" stroke-width="3" stroke-linecap="round"/><path d="M18 6L42 58" stroke="#eee" stroke-width="2"/><path d="M8 44L50 18" stroke="#5a3a1a" stroke-width="4"/><path d="M50 18l-10 0 6 6z" fill="#ccd" stroke="#333" stroke-width="2"/><path d="M8 44l2 8 6-4z" fill="#e33"/>',
    hat: '<ellipse cx="32" cy="42" rx="29" ry="9" fill="#2a2a3a" stroke="#0a0a14" stroke-width="3"/><path d="M21 42V18a11 5 0 0 1 22 0v24" fill="#3a3a52" stroke="#0a0a14" stroke-width="3"/><path d="M21 36h22" stroke="#d0283a" stroke-width="4"/><path d="M26 44c-2 6-3 10-2 16M38 44c2 6 3 10 2 16" stroke="#d0283a" stroke-width="2.5" fill="none"/>',
    robe: '<path d="M22 6h20l14 12-6 8-6-4v36H20V22l-6 4-6-8z" fill="#f2f4fa" stroke="#3a4060" stroke-width="3" stroke-linejoin="round"/><path d="M22 6l10 14 10-14" fill="none" stroke="#3a4060" stroke-width="3"/><path d="M20 34h24" stroke="#d0283a" stroke-width="6"/><path d="M34 34l6 16" stroke="#d0283a" stroke-width="4"/>',
    arm: '<path d="M14 14h30l8 36H20z" fill="#7a4a2a" stroke="#2a1505" stroke-width="3" stroke-linejoin="round"/><path d="M16 24h31M18 34h31M19 44h31" stroke="#c8a06a" stroke-width="3"/><rect x="12" y="8" width="34" height="8" rx="3" fill="#c8823a" stroke="#2a1505" stroke-width="2.5"/>',
    shoes: '<path d="M6 40c0-8 6-12 12-12h14c6 0 8 6 14 8l10 4c3 1 3 6 0 8H10c-3 0-4-3-4-8z" fill="#2a2a3a" stroke="#0a0a14" stroke-width="3"/><path d="M6 46h50" stroke="#e8e0c8" stroke-width="4"/><path d="M50 38c4-6 8-6 10-4" fill="none" stroke="#2a2a3a" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="36" r="3" fill="#d0283a"/>',
    norigae: '<circle cx="32" cy="12" r="6" fill="none" stroke="#d0283a" stroke-width="3"/><path d="M32 18v6" stroke="#d0283a" stroke-width="3"/><path d="M32 24l10 10-10 10-10-10z" fill="#ff5a6a" stroke="#6a0a14" stroke-width="3"/><circle cx="32" cy="34" r="4" fill="#ffd36b"/><path d="M26 44l-2 16M32 44v18M38 44l2 16" stroke="#d0283a" stroke-width="3" stroke-linecap="round"/>',
    /* 원소 */
    elFire: '<circle cx="32" cy="32" r="28" fill="#c0301b" stroke="#fff" stroke-width="3"/><path d="M32 10c8 10 14 14 13 24-1 8-6 12-13 12s-12-4-13-12c-1-8 5-12 7-18 1 5 4 7 6 8-1-5-1-10 0-14z" fill="#ffb02a"/><path d="M32 26c3 5 6 7 5 11-1 3-3 5-5 5s-5-2-5-5c0-3 2-5 3-8 0 2 1 3 2 3z" fill="#fff3a0"/>',
    elWater: '<circle cx="32" cy="32" r="28" fill="#1d62c9" stroke="#fff" stroke-width="3"/><path d="M32 10c8 12 16 20 16 28a16 16 0 0 1-32 0c0-8 8-16 16-28z" fill="#7fd0ff"/><path d="M24 38c0 5 3 8 7 9" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    elSun: '<circle cx="32" cy="32" r="28" fill="#d48a00" stroke="#fff" stroke-width="3"/><circle cx="32" cy="32" r="11" fill="#fff3a0"/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6" stroke="#fff3a0" stroke-width="4" stroke-linecap="round"/>',
    /* 신력 */
    skArrow: '<path d="M8 56L50 14" stroke="#7a4520" stroke-width="5" stroke-linecap="round"/><path d="M56 8l-4 16-12-12z" fill="#dfe8f5" stroke="#2a3350" stroke-width="2.5"/><path d="M8 56l2-12 6 6zM14 50l-2-10 8 4z" fill="#e33" stroke="#600" stroke-width="2"/><path d="M20 30L38 12M30 50l18-18" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>',
    skGun: '<rect x="8" y="24" width="40" height="16" rx="6" fill="#5a5a6a" stroke="#1a1a24" stroke-width="3"/><rect x="44" y="20" width="10" height="24" rx="3" fill="#7a7a8a" stroke="#1a1a24" stroke-width="3"/><circle cx="20" cy="48" r="8" fill="#7a4520" stroke="#2a1505" stroke-width="3"/><path d="M56 32h6" stroke="#ffb02a" stroke-width="6" stroke-linecap="round"/><path d="M14 28h26" stroke="#9a9aaa" stroke-width="3"/>',
    skFire: '<rect x="16" y="6" width="32" height="52" rx="3" fill="#ffe27a" stroke="#8a4a00" stroke-width="3"/><path d="M32 14c6 8 11 12 10 19-1 6-5 9-10 9s-9-3-10-9c-1-6 4-10 5-14 1 4 3 5 5 6-1-4-1-7 0-11z" fill="#e8343a"/><path d="M24 50h16" stroke="#b02a1a" stroke-width="3"/>',
    skIce: '<path d="M32 4v56M8 18l48 28M56 18L8 46" stroke="#bfefff" stroke-width="5" stroke-linecap="round"/><path d="M32 4v56M8 18l48 28M56 18L8 46" stroke="#3aa0e8" stroke-width="2" stroke-linecap="round"/><path d="M26 10l6 6 6-6M26 54l6-6 6 6" fill="none" stroke="#bfefff" stroke-width="3.5"/><circle cx="32" cy="32" r="6" fill="#fff"/>',
    skThunder: '<path d="M36 4L12 36h16l-6 24 30-36H34z" fill="#ffe14a" stroke="#6a4a00" stroke-width="3" stroke-linejoin="round"/><path d="M30 14l-8 14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
    skTurtle: '<ellipse cx="32" cy="36" rx="22" ry="16" fill="#2a6a4a" stroke="#0a2a1a" stroke-width="3"/><path d="M22 30l10-8 10 8-4 10H26z" fill="#4a9a6a" stroke="#0a2a1a" stroke-width="2"/><circle cx="54" cy="30" r="6" fill="#4a9a6a" stroke="#0a2a1a" stroke-width="2.5"/><path d="M10 36c-6-10 0-24 14-24" stroke="#5a7a2a" stroke-width="5" fill="none" stroke-linecap="round"/>',
    skPhoenix: '<path d="M32 54c-4-10-2-20 0-24 2 4 4 14 0 24z" fill="#ff7a1a"/><path d="M32 30C20 26 8 30 4 16c10 4 18 2 26 8zM32 30c12-4 24 0 28-14-10 4-18 2-26 8z" fill="#e8343a" stroke="#6a0a00" stroke-width="2.5"/><circle cx="32" cy="22" r="8" fill="#ff9a2a" stroke="#6a0a00" stroke-width="2.5"/><path d="M38 20l8 2-8 3z" fill="#ffd36b"/><path d="M26 56c2-8 4-6 6-2 2-4 4-6 6 2" fill="none" stroke="#ffd36b" stroke-width="3"/>',
    skTiger: '<circle cx="32" cy="34" r="22" fill="#f4f4f0" stroke="#2a2a2a" stroke-width="3"/><path d="M12 22l-2-12 12 6M52 22l2-12-12 6" fill="#f4f4f0" stroke="#2a2a2a" stroke-width="3"/><path d="M32 14v8M24 16l2 7M40 16l-2 7M12 34h8M44 34h8" stroke="#2a2a2a" stroke-width="3.5" stroke-linecap="round"/><circle cx="24" cy="32" r="3.5" fill="#3a9ae8"/><circle cx="40" cy="32" r="3.5" fill="#3a9ae8"/><path d="M26 44c4 4 8 4 12 0" stroke="#2a2a2a" stroke-width="3" fill="none"/><path d="M29 40h6l-3 3z" fill="#e88"/>',
    skGhost: '<path d="M32 6c12 0 20 10 20 22v28l-6-5-7 6-7-6-7 6-7-6-6 5V28C12 16 20 6 32 6z" fill="#c890ff" stroke="#3a0a70" stroke-width="3"/><circle cx="25" cy="28" r="5" fill="#2a0050"/><circle cx="39" cy="28" r="5" fill="#2a0050"/><path d="M18 18c3-5 8-7 12-7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    skMeteor: '<path d="M6 6l26 18M14 4l22 22M4 14l22 16" stroke="#ffb02a" stroke-width="5" stroke-linecap="round" opacity=".8"/><circle cx="40" cy="40" r="18" fill="#5a2a8a" stroke="#1a0530" stroke-width="3"/><path d="M30 34l8 4 4-8M36 48l6-6 8 2" stroke="#ffd36b" stroke-width="3" fill="none"/>',
    skFan: '<path d="M32 56L6 22a34 34 0 0 1 52 0z" fill="#ff8aa8" stroke="#6a0a2a" stroke-width="3" stroke-linejoin="round"/><path d="M32 56L14 14M32 56L32 8M32 56L50 14" stroke="#6a0a2a" stroke-width="2.5"/><circle cx="32" cy="54" r="4" fill="#ffd36b" stroke="#6a0a2a" stroke-width="2"/>',
    skVortex: '<path d="M32 32m-4 0a4 4 0 1 1 8 0a10 10 0 1 1-20 0a16 16 0 1 1 32 0a22 22 0 1 1-44 0" fill="none" stroke="#ffb02a" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="32" r="3" fill="#fff3a0"/>',    skDragon: '<path d="M8 50c10-4 10-16 20-18s14 8 22 2 6-18 6-18" fill="none" stroke="#2a8ad8" stroke-width="10" stroke-linecap="round"/><path d="M8 50c10-4 10-16 20-18s14 8 22 2 6-18 6-18" fill="none" stroke="#9fe0ff" stroke-width="3" stroke-dasharray="3 6" stroke-linecap="round"/><circle cx="54" cy="12" r="7" fill="#2a8ad8" stroke="#0a3a6a" stroke-width="2.5"/><circle cx="14" cy="18" r="7" fill="#fff6c0" stroke="#d4a000" stroke-width="3"/>'
  };
  const DEFS = '<svg width="0" height="0" style="position:absolute"><defs>' +
    '<linearGradient id="gCoin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset=".5" stop-color="#ffc83a"/><stop offset="1" stop-color="#e08a10"/></linearGradient>' +
    '<linearGradient id="gJade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9dffc8"/><stop offset=".5" stop-color="#2ad07a"/><stop offset="1" stop-color="#0a8a4a"/></linearGradient>' +
    '<linearGradient id="gStone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d0ff"/><stop offset=".5" stop-color="#b070ff"/><stop offset="1" stop-color="#6a20c0"/></linearGradient>' +
    '<radialGradient id="gAdv" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffd66a"/><stop offset=".6" stop-color="#f08a10"/><stop offset="1" stop-color="#b04a00"/></radialGradient>' +
    '</defs></svg>';
  const ic = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 64 64">' + (I[n] || '') + '</svg>';

  /* ---------------- 자료 ---------------- */
  const CH_NAMES = ['역병 도는 마을', '버려진 장터', '눈 덮인 고개', '불타는 관아', '안개 낀 나루', '무너진 산성', '귀신 나는 서원', '얼어붙은 궁궐 뒤뜰', '황천 다리', '역병 든 궁궐'];
  const CH_THEME = ['village', 'market', 'snow', 'fire', 'mist', 'fort', 'ghost', 'ice', 'hell', 'palace'];
  const chapters = () => {
    const J = (window.JZB && window.JZB.CHAPTERS) || (window.JZD && window.JZD.CHAPTERS);
    if (J && J.length) return J.map((c, i) => ({ n: c.n || i + 1, name: c.name || CH_NAMES[i] || ('챕터 ' + (i + 1)), theme: c.theme || CH_THEME[i], waves: c.waves || c.nights || 4 }));
    return CH_NAMES.map((name, i) => ({ n: i + 1, name, theme: CH_THEME[i], waves: 4 + Math.floor(i / 2) }));
  };
  const GR = [
    { n: '일반', c: '#a7adb8' }, { n: '고급', c: '#7df06a' }, { n: '희귀', c: '#6cc6ff' },
    { n: '영웅', c: '#e39bff' }, { n: '전설', c: '#ffd36b' }, { n: '신화', c: '#ff8e8e' }];
  const GMUL = [1, 1.6, 2.6, 4.2, 7, 12];
  const SLOTS = [
    { id: 'weapon', n: '무기', ic: 'bow', st: 'atk', base: 20, names: ['나무 활', '각궁', '흑각궁', '용각궁', '천궁', '신궁'] },
    { id: 'hat', n: '갓', ic: 'hat', st: 'hp', base: 70, names: ['삿갓', '흑립', '옥로립', '주립', '금관립', '신령 갓'] },
    { id: 'robe', n: '도포', ic: 'robe', st: 'hp', base: 100, names: ['무명 도포', '비단 도포', '청 도포', '자색 도포', '금실 도포', '신선 도포'] },
    { id: 'arm', n: '토시', ic: 'arm', st: 'atk', base: 12, names: ['가죽 토시', '쇠 토시', '은 토시', '자개 토시', '금 토시', '용 토시'] },
    { id: 'shoes', n: '신', ic: 'shoes', st: 'hp', base: 55, names: ['짚신', '미투리', '가죽신', '태사혜', '운혜', '구름신'] },
    { id: 'norigae', n: '노리개', ic: 'norigae', st: 'atk', base: 15, names: ['매듭 노리개', '호박 노리개', '산호 노리개', '비취 노리개', '금 노리개', '삼작 신물'] }];
  const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
  /* 영웅: g 는 등급 번호 (0 일반, 2 희귀, 3 영웅, 4 전설) */
  const COMPS = [
    { id: 'kimchungseon', n: '김충선', g: 4, el: 'sword', eln: '암살 · 왜검', img: 'img/ui/hero_kimchungseon.webp?v=2', role: '암살', ult: '귀순의 칼', desc: '임진왜란 때 조선에 귀화한 사무라이 사야가예요. 적진의 원거리·마법 좀비만 노려 뒤로 순간이동해 베어요. 큰 기술 귀순의 칼은 화면 안 원거리·마법 적을 차례로 벱니다.', bonus: 'atk' },
    { id: 'daejanggeum', n: '대장금', g: 4, el: 'tPower', eln: '치유 · 약선', img: 'img/ui/hero_daejanggeum.webp?v=2', role: '회복', ult: '어의의 탕약', desc: '조선 최초의 어의녀예요. 약재 주머니를 던지며 처용과 동료를 치유해요. 큰 기술 어의의 탕약은 사당과 시설을 크게 회복하고 받는 피해를 줄여요.', bonus: 'hp' },
    { id: 'jeonwoochi', n: '전우치', g: 4, el: 'skThunder', eln: '도술 · 검기', img: 'img/ui/hero_jeonwoochi.webp?v=2', role: '도술 검객', ult: '화중병', desc: '도술을 부리는 검객이에요. 칼을 휘둘러 적을 꿰뚫는 검기를 날려요. 큰 기술 화중병은 그림 속 먹물 병사 여섯을 불러내요.', bonus: 'atk' },
    { id: 'bari', n: '바리공주', g: 4, el: 'skGhost', eln: '혼령술', img: 'img/ui/hero_bari.webp?v=2', role: '혼령 소환', ult: '저승길 인도', desc: '저승길을 안내하는 무조신이에요. 곁에서 쓰러진 좀비의 혼을 인도해 잠시 아군 혼령으로 싸우게 해요.', bonus: 'atk' },
    { id: 'imugi', n: '이무기', g: 4, el: 'elFire', eln: '비행 · 불', img: 'img/ui/hero_imugi.webp?v=2', role: '비행 화염', ult: '승천', desc: '승천을 꿈꾸는 비룡이에요. 하늘을 날며 불길을 뿜어요. 큰 기술 승천은 날아오르며 불덩이 비를 쏟아요.', bonus: 'atk' },
    { id: 'sadaham', n: '화랑 사다함', g: 3, el: 'sword', eln: '근거리 · 검무', img: 'img/ui/hero_sadaham.webp?v=2', role: '근거리', ult: '화랑 검무', desc: '열다섯에 대가야를 친 신라 화랑이에요. 적 사이를 오가며 세 번 연달아 베어요.', bonus: 'atk' },
    { id: 'samyeong', n: '사명대사', g: 3, el: 'tPower', eln: '권법 · 승병', img: 'img/ui/hero_samyeong.webp?v=2', role: '권법', ult: '승병 봉기', desc: '임진왜란의 승병장이에요. 권법 연타로 적을 기절시키고, 큰 기술로 승병을 불러 앞을 막아요.', bonus: 'hp' },
    { id: 'yisunsin', n: '이순신', g: 4, el: 'skArrow', eln: '원거리 · 활', img: 'img/ui/hero_yisunsin.webp?v=2', role: '원거리', ult: '학익진', desc: '멀리서 화살을 쏟아부어요. 큰 기술 학익진은 학의 날개처럼 펼친 화살비로 적 무리를 덮어요.', bonus: 'atk' },
    { id: 'gangamchan', n: '강감찬', g: 4, el: 'skThunder', eln: '번개', img: 'img/ui/hero_gangamchan.webp?v=2', role: '번개', ult: '귀주대첩', desc: '칼끝에서 번개를 내리쳐요. 큰 기술 귀주대첩은 넓은 땅에 벼락을 연달아 떨어뜨려요.', bonus: 'atk' },
    { id: 'samjoko', n: '삼족오', g: 4, el: 'elSun', eln: '해', img: 'img/ui/hero_samjoko.webp?v=2', role: '원거리 화력', ult: '태양 강림', desc: '태양 광선으로 여러 적을 한꺼번에 꿰뚫어요. 큰 기술은 태양 강림이에요.', bonus: 'atk' },
    { id: 'eulji', n: '을지문덕', g: 3, el: 'sword', eln: '근거리 · 검', img: 'img/ui/hero_eulji.webp?v=2', role: '근거리', ult: '살수대첩', desc: '앞장서서 검으로 적을 베어요. 큰 기술 살수대첩은 거센 물살로 적을 쓸어 버려요.', bonus: 'hp' },
    { id: 'wonhyo', n: '원효대사', g: 3, el: 'tPower', eln: '법사 · 염주', img: 'img/ui/hero_wonhyo.webp?v=2', role: '법사', ult: '정화 결계', desc: '염주에서 빛줄기를 쏘아요. 큰 기술 정화 결계는 둘레의 역병을 씻어 내고 아군을 지켜요.', bonus: 'hp' },
    { id: 'gumiho', n: '구미호', g: 3, el: 'skGhost', eln: '여우불', img: 'img/ui/hero_gumiho.webp?v=2', role: '유도탄', ult: '홀림', desc: '여우불이 적을 쫓아가 터져요. 큰 기술 홀림은 적들을 잠시 멍하게 만들어요.', bonus: 'atk' },
    { id: 'honggildong', n: '홍길동', g: 2, el: 'skFan', eln: '분신', img: 'img/ui/hero_honggildong.webp?v=2', role: '분신', ult: '둔갑 연속베기', desc: '분신을 만들어 함께 싸워요. 큰 기술 둔갑 연속베기는 순식간에 여러 적을 베어요.', bonus: 'atk' },
    { id: 'haetae', n: '해태', g: 2, el: 'elFire', eln: '불', img: 'img/ui/hero_haetae.webp?v=2', role: '화염 방어', ult: '해치의 불바다', desc: '불길을 내뿜어 앞의 적을 태워요. 큰 기술은 해치의 불바다예요.', bonus: 'hp' },
    { id: 'dokkaebi', n: '도깨비', g: 0, el: 'elWater', eln: '도깨비불', img: 'img/ui/hero_dokkaebi.webp?v=2', role: '돌격', ult: '방망이 지진', desc: '도깨비방망이를 던지면 적을 뚫고 되돌아와요. 큰 기술은 방망이 지진이에요.', bonus: 'atk' }];
  const COMP = Object.fromEntries(COMPS.map(c => [c.id, c]));
  const SKILLS = [
    { id: 'ghost', n: '귀화탄', ic: 'skGhost', c: '#6a2ab0', d: '보랏빛 귀신불이 적을 쫓아가요.' },
    { id: 'meteor', n: '별똥불', ic: 'skMeteor', c: '#b0401a', d: '불타는 운석이 떨어져 불바다를 남겨요.' },
    { id: 'thunder', n: '벼락', ic: 'skThunder', c: '#a07a00', d: '하늘에서 벼락이 내리꽂혀요.' },
    { id: 'ice', n: '얼음송곳', ic: 'skIce', c: '#1d62c9', d: '얼음송곳을 부채꼴로 쏘아 얼려요.' },
    { id: 'dance', n: '처용무', ic: 'skFan', c: '#b02a5a', d: '부채가 처용 둘레를 돌며 베어요.' },
    { id: 'talisman', n: '벽사부', ic: 'skFire', c: '#a06a00', d: '부적이 날아가 터져요.' },
    { id: 'beam', n: '신궁 광선', ic: 'skArrow', c: '#a01a1a', d: '붉은 광선이 이어지며 적을 꿰뚫어요.' },
    { id: 'vortex', n: '불회오리', ic: 'skVortex', c: '#b06a00', d: '불회오리가 적을 빨아들이며 태워요.' }];

  /* ---------------- 저장 ---------------- */
  const KEY = 'jz_save';
  const TORCH_MAX = 30, TORCH_SEC = 360, PATROL_MAX = 16 * 3600 * 1000;
  const fresh = () => ({
    v: 1, name: '처용', lv: 1, exp: 0, gold: 2000, jade: 300, torch: TORCH_MAX, torchT: now(), stone: 20,
    chap: 1, sel: 1, stars: {}, best: {}, chest: {}, equip: {}, inv: [], uid: 1,
    comps: {},
    team: ['dokkaebi'], skills: Object.fromEntries(SKILLS.map(s => [s.id, 1])),
    patrolT: now() - 2 * 3600 * 1000, day: '', att: 0, attDay: '', quests: {}, qday: '', mail: false, freeGold: '', music: true, plays: 0
  });
  let S;
  function load() {
    try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = fresh(); }
    fixComps();
    if (!S.plans) S.plans = { weapon: 3, hat: 3, robe: 3, arm: 3, shoes: 3, norigae: 3 };
    for (const it of S.inv) if (it.s == null) it.s = 0;
    if (!S.inv.length && !Object.keys(S.equip).length) { // 첫 장비
      ['weapon', 'hat', 'robe'].forEach(sl => { const it = mkItem(sl, 0, 'bow'); S.inv.push(it); S.equip[sl] = it.uid; });
    }
  }
  function fixComps() { for (const c of COMPS) { if (!S.comps[c.id]) S.comps[c.id] = { own: c.id === 'dokkaebi', lv: 1, sh: 0, star: 1 }; if (!S.comps[c.id].star) S.comps[c.id].star = 1; } S.team = S.team.filter(id => COMP[id]); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  const WKIND = ['bow', 'nogi', 'jochong', 'seungja'], WN = { bow: '각궁', nogi: '수노기', jochong: '조총', seungja: '승자총통' };
  const SETS = { cheoyong: { n: '처용 세트', c: '#ff8a6a', b: ['공격력 +8%', '처용 진노 대기 -20%', '처용무로 시작'] }, mugwan: { n: '무관 세트', c: '#8ac8ff', b: ['체력 +10%', '받는 피해 -10%', '병영 병사 +2'] }, seonbi: { n: '선비 세트', c: '#b9f08a', b: ['경험치 +10%', '카드 다시 뽑기 +1', '공격 기술 하나로 시작'] } };
  const SG = { manpa: { slot: 'weapon', w: 'manpa', n: '만파식적', img: 's_manpa', d: '피리 소리가 부채꼴 음파로 퍼져 적을 밀어내고 뚫어요.' }, chilji: { slot: 'weapon', w: 'chilji', n: '칠지도', img: 's_chilji', d: '일곱 갈래 검기를 한꺼번에 날려요.' }, cheonbu: { slot: 'norigae', n: '천부인', img: 's_cheonbu', d: '모든 능력치가 크게 오르는 하늘의 신물이에요.' } };
  const STAR_MAX = g => g === 4 ? 2 : g === 5 ? 3 : 0;
  const LV_CAP = it => [10, 20, 30, 40, 50, 60][it.g] + 10 * (it.s || 0) + (it.sg ? 20 : 0);
  function mkItem(slot, g, w, sg) { const it = { uid: S.uid++, slot, g, lv: 1, s: 0 }; if (sg && SG[sg]) { it.sg = sg; it.slot = SG[sg].slot; if (SG[sg].w) it.w = SG[sg].w; it.g = Math.max(4, g); } else if (slot === 'weapon') it.w = w || rnd(WKIND); if (it.g >= 2) it.set = rnd(Object.keys(SETS)); return it; }
  const itemSrc = it => 'img/items/' + (it.sg ? SG[it.sg].img : it.slot === 'weapon' ? (it.w && it.w !== 'bow' ? 'w_' + it.w : 'weapon_g' + it.g) : it.slot === 'arm' ? 'arm_g' + it.g : it.slot + '_g' + it.g) + '.webp';
  const itemImg = it => '<img class="iimg" src="' + itemSrc(it) + '" style="width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 3px 3px rgba(0,0,0,.5))" onerror="this.style.display=\'none\'">' + ((it.s || 0) > 0 ? '<div class="st stroke-s" style="position:absolute;right:4px;top:2px;font-size:18px;color:#ffe27a">+' + it.s + '</div>' : '') + (it.sg ? '<div class="stroke-s" style="position:absolute;left:4px;top:2px;font-size:16px;color:#ff6a6a">독보</div>' : '');
  function setsOf() { const c = {}; for (const sl in S.equip) { const it = byUid(S.equip[sl]); if (it && it.set) c[it.set] = (c[it.set] || 0) + 1; } return c; }
  const itemIc = it => it.slot === 'weapon' && (it.w === 'jochong' || it.w === 'seungja') ? 'skGun' : SLOT[it.slot].ic;
  const itemVal = it => Math.round(SLOT[it.slot].base * GMUL[it.g] * (1 + 0.15 * (it.lv - 1)) * (1 + 0.15 * (it.s || 0)) * (it.sg ? 1.6 : 1));
  const itemName = it => it.sg ? SG[it.sg].n : it.slot === 'weapon' ? (it.w && it.w !== 'bow' ? GR[it.g].n + ' ' + WN[it.w] : SLOT.weapon.names[it.g]) : SLOT[it.slot].names[it.g];
  const byUid = u => S.inv.find(i => i.uid === u);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  function stats() {
    let atk = 100 + 8 * (S.lv - 1), hp = 1000 + 60 * (S.lv - 1);
    for (const sl in S.equip) { const it = byUid(S.equip[sl]); if (!it) continue; if (SLOT[sl].st === 'atk') atk += itemVal(it); else hp += itemVal(it); }
    let cp = 0;
    for (const id of S.team) { const c = S.comps[id]; if (!c || !c.own) continue; const b = (1 + COMP[id].g * 0.5 + c.lv * 0.3) * (1 + (c.star - 1) * 0.25); if (COMP[id].bonus === 'atk') atk += Math.round(6 * b); else hp += Math.round(60 * b); cp += c.lv * 60 * (COMP[id].g + 1) * c.star; }
    const sk = Object.values(S.skills).reduce((a, b) => a + b, 0);
    const power = Math.round(atk * 9 + hp * 0.9 + cp + sk * 40);
    return { atk, hp, power };
  }
  const needExp = lv => 100 + lv * 60;
  function addExp(e) { S.exp += e; let up = false; while (S.exp >= needExp(S.lv)) { S.exp -= needExp(S.lv); S.lv++; up = true; } return up; }
  function tickTorch() {
    if (S.torch >= TORCH_MAX) { S.torchT = now(); return; }
    const n = Math.floor((now() - S.torchT) / 1000 / TORCH_SEC);
    if (n > 0) { S.torch = Math.min(TORCH_MAX, S.torch + n); S.torchT += n * TORCH_SEC * 1000; }
  }
  function patrol() {
    const ms = Math.min(PATROL_MAX, now() - S.patrolT), h = ms / 3600000, c = Math.max(1, S.chap);
    return { ms, h, gold: Math.floor(h * 240 * c), exp: Math.floor(h * 40 * c), stone: Math.floor(h * 1.5), jade: Math.floor(h * 3) };
  }
  function dailyReset() {
    const d = today();
    if (S.qday !== d) { S.qday = d; S.quests = { battle: 0, gacha: 0, up: 0, got: {} }; }
  }
  const QUESTS = [{ id: 'battle', n: '챕터 1번 도전하기', need: 1, r: 40 }, { id: 'up', n: '장비 1번 강화하기', need: 1, r: 30 }, { id: 'gacha', n: '뽑기 1번 하기', need: 1, r: 30 }];
  const qDot = () => QUESTS.some(q => (S.quests[q.id] || 0) >= q.need && !(S.quests.got || {})[q.id]);
  const attDot = () => S.attDay !== today();

  /* ---------------- 소리 ---------------- */
  /* 배경음악 지킴이: 로비(meta)와 전투(battle) 어디서 틀든 배경음악은 언제나 하나만.
     - 배경음악(bgm_)이 재생되면 다른 배경음악은 모두 멈춘다
     - 승리/패배 짧은 곡(sting_)이 나오는 동안에는 배경음악을 미뤘다가 끝나면 튼다
     - 탭을 숨기면 멈추고, 돌아오면 마지막 곡 하나만 다시 튼다
     - 설정에서 음악을 끄면 전투 음악도 나오지 않는다 */
  const AUD = new Set(); let pendBgm = null, lastBgm = null, hiddenStop = false;
  const isBgm = a => /audio\/bgm_/.test(a.src || ''), isSting = a => /audio\/sting_/.test(a.src || '');
  const stingOn = () => { for (const a of AUD) if (isSting(a) && !a.paused && !a.ended) return a; return null; };
  (function guard() {
    const P = HTMLMediaElement.prototype; if (P.__kzGuard) return; P.__kzGuard = 1;
    const oPlay = P.play, oPause = P.pause;
    P.play = function () {
      if (isBgm(this) || isSting(this)) AUD.add(this);
      if (isBgm(this)) {
        if (S && S.music === false) return Promise.resolve();
        lastBgm = this;
        for (const a of AUD) if (a !== this && isBgm(a) && !a.paused) oPause.call(a);
        const st = stingOn();
        if (st) { pendBgm = this; const go = () => { st.removeEventListener('ended', go); st.removeEventListener('pause', go); if (pendBgm === this && lastBgm === this) { pendBgm = null; P.play.call(this); } }; st.addEventListener('ended', go); st.addEventListener('pause', go); return Promise.resolve(); }
        if (document.hidden) { hiddenStop = true; return Promise.resolve(); }
      }
      if (isSting(this)) { for (const a of AUD) if (a !== this && !a.paused) oPause.call(a); }
      return oPlay.call(this);
    };
    P.pause = function () { if (this === pendBgm) pendBgm = null; if (isBgm(this) && this === lastBgm && !hiddenStop) lastBgm = null; return oPause.call(this); };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { const keep = lastBgm; hiddenStop = true; for (const a of AUD) if (!a.paused) oPause.call(a); lastBgm = keep; }
      else if (hiddenStop) { hiddenStop = false; if (lastBgm && !(S && S.music === false)) { const p = P.play.call(lastBgm); if (p && p.catch) p.catch(() => {}); } }
    });
  })();
  const BGM = {};
  let curBgm = null;
  /* 첫 화면·로비 음악: 직접 편곡한 아리랑 */
  const BGM_FILE = { bgm_title: 'bgm_arirang', bgm_lobby: 'bgm_arirang' };
  function music(k) {
    const f = k && (BGM_FILE[k] || k);
    if (curBgm && curBgm !== f && BGM[curBgm]) { BGM[curBgm].pause(); }
    if (f && curBgm === f && BGM[f] && !BGM[f].paused) return;
    curBgm = f;
    if (!f || !S.music) return;
    try {
      if (!BGM[f]) { const a = new Audio(); a.src = 'audio/' + f + (f === 'bgm_arirang' ? '.wav' : '.mp3'); a.loop = true; a.volume = 0.5; BGM[f] = a; }
      const p = BGM[f].play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function stopMusic() { for (const k in BGM) BGM[k].pause(); curBgm = null; }

  /* ---------------- 화면 틀 ---------------- */
  let root, meta, tab = 'home';
  function build() {
    meta = document.createElement('div'); meta.id = 'meta';
    meta.innerHTML = DEFS + '<div id="mroot">' +
      '<div class="m-scr" id="s-title"></div>' +
      '<div class="m-scr" id="s-lobby"></div>' +
      '<div class="m-scr" id="s-map"></div>' +
      '<div class="m-scr" id="s-result"></div>' +
      '</div>';
    document.body.appendChild(meta);
    root = $('#mroot');
    root.addEventListener('click', onClick);
    addEventListener('resize', fit); fit();
  }
  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    root.style.transform = 'translate(' + ((innerWidth - W * s) / 2) + 'px,' + ((innerHeight - H * s) / 2) + 'px) scale(' + s + ')';
  }
  function show(id) { root.querySelectorAll('.m-scr').forEach(e => e.classList.toggle('on', e.id === id)); }
  function toast(t) { const d = document.createElement('div'); d.className = 'toast stroke-s'; d.textContent = t; root.appendChild(d); setTimeout(() => d.remove(), 1700); }
  function modal(html, cls) { closeModal(); const m = document.createElement('div'); m.className = 'modal'; m.id = 'mdl'; m.innerHTML = '<div class="mbox box gold-frame ' + (cls || '') + '">' + html + '<div class="btn r x" data-act="close">✕</div></div>'; root.appendChild(m); }
  function closeModal() { const m = $('#mdl', root); if (m) m.remove(); }

  /* ---------------- 첫 화면 ---------------- */
  function renderTitle() {
    $('#s-title').innerHTML =
      (window.IS_EN ? '<div class="logo logo-left-en"><div class="t" data-t="K Zombi">K Zombi</div></div>' : '<div class="logo logo-left"><div class="t2"><span data-t="처">처</span><span data-t="용">용</span></div></div>') + '<div class="kzmark"><i class="seal">K</i><b>K-ZOMBIE</b><small>JOSEON SURVIVAL</small></div>' +
      '<div class="tap stroke" data-act="enter">' + (window.IS_EN ? 'Tap to Start' : '터치하여 시작') + '</div>' +
      '<div class="cpy stroke-s">' + (window.IS_EN ? 'A night of plague. Cheoyong guards the village.' : '역병 든 밤, 처용이 마을을 지킨다') + '</div><div class="ver stroke-s">시제품 0.4</div>';
    $('#s-title').setAttribute('data-act', 'enter');
    show('s-title');
  }

  /* ---------------- 로비 ---------------- */
  function topbar() {
    const st = stats(); tickTorch();
    const left = S.torch >= TORCH_MAX ? '가득' : (() => { const r = TORCH_SEC - Math.floor((now() - S.torchT) / 1000) % TORCH_SEC; return String(Math.floor(r / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0'); })();
    return '<div class="topbar">' +
      '<div class="prof" data-act="profile"><div class="lv stroke-s">' + S.lv + '</div></div>' +
      '<div class="pname stroke-s">' + S.name + ' <span style="font-size:18px;color:#bfe">' + Math.floor(S.exp / needExp(S.lv) * 100) + '%</span></div>' +
      '<div class="power stroke-s">' + ic('power').replace('class="ic ', 'style="width:34px;height:34px" class="ic ') + fmt(st.power) + '</div>' +
      (accOnline() ? '<div class="xchip stroke-s" data-act="acc">' + (accUser() ? '☁ 저장 중' : '<i class="g"></i>로그인') + '</div>' : '') +
      '<div class="res">' +
      '<div class="rpill stroke-s" data-act="buyTorch">' + ic('torch') + '<span class="tv"><b id="torchv">' + S.torch + '/' + TORCH_MAX + '</b><small id="torcht">' + left + '</small></span><div class="plus">+</div></div>' +
      '<div class="rpill stroke-s" data-act="goShop">' + ic('coin') + fmt(S.gold) + '<div class="plus">+</div></div>' +
      '</div><div class="res2"><div class="rpill stroke-s" data-act="goShop">' + ic('jade') + fmt(S.jade) + '<div class="plus">+</div></div></div>' +
      '</div>';
  }
  function tabsBar() {
    const T = [['shop', '상점', 'tShop', false], ['equip', '장비', 'tEquip', false], ['home', '모험', 'tAdv', true], ['comp', '영웅', 'tComp', false], ['power', '신력', 'tPower', false]];
    const dots = { shop: S.freeGold !== today(), equip: canMerge(), comp: COMPS.some(c => { const x = S.comps[c.id]; return (!x.own && x.sh >= 10) || (x.own && x.star < 5 && x.sh >= x.star * 10); }), power: false, home: false };
    return '<div class="tabs">' + T.map(([id, n, i, big]) => '<div class="tab ' + (big ? 'big ' : '') + (tab === id ? 'on' : '') + '" data-act="tab" data-v="' + id + '">' + ic(i) + '<span class="stroke-s">' + n + '</span>' + (dots[id] ? '<i class="dot"></i>' : '') + '</div>').join('') + '</div>';
  }
  function renderLobby() {
    const el = $('#s-lobby');
    el.innerHTML = topbar() + '<div class="panel">' +
      '<div class="pg ' + (tab === 'home' ? 'on' : '') + '">' + pgHome() + '</div>' +
      '<div class="pg ' + (tab === 'equip' ? 'on' : '') + '">' + pgEquip() + '</div>' +
      '<div class="pg ' + (tab === 'comp' ? 'on' : '') + '">' + pgComp() + '</div>' +
      '<div class="pg ' + (tab === 'power' ? 'on' : '') + '">' + pgPower() + '</div>' +
      '<div class="pg ' + (tab === 'shop' ? 'on' : '') + '">' + pgShop() + '</div>' +
      '</div>' + tabsBar();
    show('s-lobby');
  }
  function refresh() { save(); if ($('#s-lobby').classList.contains('on')) renderLobby(); }

  function pgHome() {
    const C = chapters(), c = C[S.sel - 1] || C[0], st = stats(), p = patrol();
    const team = [0, 1].map(i => { const id = S.team[i]; return id ? '<div class="mini" style="background-image:url(' + COMP[id].img + ')" data-act="tab" data-v="comp"></div>' : '<div class="mini empty" data-act="tab" data-v="comp">+</div>'; }).join('');
    const stars = [1, 2, 3].map(k => ic((S.stars[c.n] || 0) >= k ? 'star' : 'star0')).join('');
    return '' +
      (S.sel > 1 ? '<svg class="arrowbtn l" viewBox="0 0 64 76" data-act="chap" data-v="-1">' + I.arrowL + '</svg>' : '') +
      (S.sel < S.chap ? '<svg class="arrowbtn r" viewBox="0 0 64 76" data-act="chap" data-v="1">' + I.arrowR + '</svg>' : '') +
      '<div class="chapcard gold-frame" data-act="map"><div class="bg"></div><div class="n stroke-s">챕터 ' + c.n + ' · 밤 ' + c.waves + '번</div><div class="nm stroke">' + c.name + '</div>' +
      '<div class="arr stroke-s">지도 ▸</div><div class="best stroke-s" style="display:flex;gap:2px;align-items:center">' + stars.replace(/class="ic /g, 'style="width:26px;height:26px" class="ic ') + '</div></div>' +
      '<div class="sidebtns l">' +
      '<div class="sb" data-act="att">' + ic('gift') + '<div class="lb stroke-s">출석</div>' + (attDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="quest">' + ic('scroll') + '<div class="lb stroke-s">임무</div>' + (qDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="pass">' + ic('star') + '<div class="lb stroke-s">패스</div>' + (passDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="event">' + ic('gift') + '<div class="lb stroke-s">축제</div>' + (evDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="rank">' + ic('power') + '<div class="lb stroke-s">랭킹</div></div>' +
      '</div><div class="sidebtns r">' +
      '<div class="sb" data-act="mailbox">' + ic('mail') + '<div class="lb stroke-s">우편</div>' + (!S.mail ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="settings">' + ic('gear') + '<div class="lb stroke-s">설정</div></div>' +
      '<div class="sb" data-act="ach">' + ic('chest') + '<div class="lb stroke-s">업적</div>' + (achDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="codex">' + ic('scroll') + '<div class="lb stroke-s">도감</div>' + (cdDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="friend">' + ic('heart') + '<div class="lb stroke-s">친구</div></div>' +
      '<div class="sb" data-act="guild">' + ic('sword') + '<div class="lb stroke-s">문파</div></div>' +
      '</div>' +
      '<div class="herostage"><div class="glow"></div><div class="hero" data-act="tab" data-v="equip"></div></div>' +
      '<div class="statline"><div class="stat stroke-s">' + ic('sword') + fmt(st.atk) + '</div><div class="stat stroke-s">' + ic('heart') + fmt(st.hp) + '</div></div>' +
      '<div class="teamrow">' + team + '</div>' +
      '<div class="patrol" data-act="patrol">' + ic(p.h >= 1 ? 'chestOpen' : 'chest', 'chest') + '<div class="lb stroke-s">순찰 보상</div><div class="bar"><i style="width:' + (p.ms / PATROL_MAX * 100) + '%"></i><span class="stroke-s">' + hm(p.ms) + '</span></div>' + (p.h >= 1 ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="startwrap"><div class="btn y startbtn" data-act="start"><span>모험 시작</span><small>' + ic('torch') + '5</small></div></div>';
  }
  const hm = ms => { const m = Math.floor(ms / 60000); return Math.floor(m / 60) + '시간 ' + String(m % 60).padStart(2, '0') + '분'; };

  function canMerge() { const cnt = {}; for (const it of S.inv) { if (it.g >= 5) continue; const k = it.slot + (it.w || '') + it.g; cnt[k] = (cnt[k] || 0) + 1; } return Object.values(cnt).some(v => v >= 3); }
  function pgEquip() {
    const st = stats();
    const slot = s => { const it = byUid(S.equip[s.id]); return it ? '<div class="slot g' + it.g + '" data-act="item" data-v="' + it.uid + '">' + itemImg(it) + '<div class="lv stroke-s">' + it.lv + '</div><div class="nm stroke-s">' + itemName(it) + '</div></div>' : '<div class="slot emp">' + ic(s.ic) + '<div class="nm stroke-s">' + s.n + '</div></div>'; };
    const inv = S.inv.slice().sort((a, b) => b.g - a.g || b.lv - a.lv).map(it => {
      const eq = S.equip[it.slot] === it.uid;
      return '<div class="it g' + it.g + '" data-act="item" data-v="' + it.uid + '">' + itemImg(it) + '<div class="lv stroke-s">' + it.lv + '</div>' + (eq ? '<div class="eqd stroke-s">착용</div>' : '') + '</div>';
    }).join('');
    return '<div class="hdr stroke">장비<span class="sub">영웅까지 같은 장비 3개 · 전설·신화는 같은 칸 2개를 먹여 +1~+3 · 도면 ' + Object.values(S.plans || {}).reduce((a, b) => a + b, 0) + '</span></div>' + (() => { const c = setsOf(); const t = Object.keys(c).filter(k => c[k] >= 2).map(k => '<span style="color:' + SETS[k].c + '">' + SETS[k].n + ' ' + c[k] + '부위</span>').join(' · '); return t ? '<div class="stroke-s" style="position:absolute;left:0;right:0;top:300px;text-align:center;font-size:18px;z-index:3;pointer-events:none">' + t + '</div>' : ''; })() +
      '<div class="eqwrap"><div class="eqhero"></div><div class="slots l">' + SLOTS.slice(0, 3).map(slot).join('') + '</div><div class="slots r">' + SLOTS.slice(3).map(slot).join('') + '</div></div>' +
      '<div class="eqstats"><div class="stat stroke-s">' + ic('sword') + '공격 ' + fmt(st.atk) + '</div><div class="stat stroke-s">' + ic('heart') + '체력 ' + fmt(st.hp) + '</div></div>' +
      '<div class="eqbtns"><div class="btn b" data-act="autoEq">일괄 착용</div><div class="btn p ' + (canMerge() ? '' : 'dis') + '" data-act="merge">일괄 합성' + (canMerge() ? '<i class="dot" style="right:-8px;top:-8px"></i>' : '') + '</div></div>' +
      '<div class="inv box">' + (inv || '<div style="grid-column:1/-1;text-align:center;opacity:.7;font-size:22px;padding:30px">가진 장비가 없어요. 상점에서 뽑아 보세요.</div>') + '</div>';
  }
  function pgComp() {
    const stars = (n, sz) => [1, 2, 3, 4, 5].map(k => '<svg class="ic" viewBox="0 0 64 64" style="width:' + sz + 'px;height:' + sz + 'px">' + I[n >= k ? 'star' : 'star0'] + '</svg>').join('');
    const compOrd = c => { const x = S.comps[c.id]; return !x.own && x.sh >= 10 ? 0 : x.own ? 1 : 2; };
    const cards = [...COMPS].sort((a, b) => compOrd(a) - compOrd(b) || b.g - a.g).map(c => {
      const s = S.comps[c.id], inTeam = S.team.includes(c.id), need = s.own ? s.star * 10 : 10;
      return '<div class="card ' + (s.own ? '' : 'lock') + (selComp === c.id ? ' sel' : '') + '" style="border-color:' + GR[c.g].c + '" data-act="comp" data-v="' + c.id + '">' +
        '<div class="art" style="background-image:url(' + c.img + ')"></div>' +
        '<div class="gr stroke-s" style="background:' + GR[c.g].c + ';color:#2a1a00;text-shadow:none">' + GR[c.g].n + '</div>' +
        '<svg class="ic el" viewBox="0 0 64 64">' + I[c.el] + '</svg>' +
        (inTeam ? '<div class="team stroke-s">출전</div>' : '') +
        (s.own ? '' : '<svg class="ic lk" viewBox="0 0 64 64">' + I.lock + '</svg>') +
        '<div class="nm stroke">' + c.n + '</div><div class="lv stroke-s">' + (s.own ? '<span class="cst">' + stars(s.star, 16) + '</span> 레벨 ' + s.lv : '조각 ' + s.sh + '/10') + '</div>' +
        '<div class="shard"><i style="width:' + Math.min(100, s.sh / need * 100) + '%"></i></div>' +
        ((!s.own && s.sh >= 10) || (s.own && s.star < 5 && s.sh >= need) ? '<i class="dot" style="right:6px;top:60px"></i>' : '') + '</div>';
    }).join('');
    const slots = [0, 1].map(i => { const id = S.team[i]; return id ? '<div class="mini" style="background-image:url(' + COMP[id].img + ');border-color:' + GR[COMP[id].g].c + '" data-act="unteam" data-v="' + id + '"></div>' : '<div class="mini empty">+</div>'; }).join('');
    const sel = COMP[selComp] || COMPS[0], ss = S.comps[sel.id];
    const maxLv = ss.star * 10, lvCost = 300 * ss.lv * (sel.g + 1), stCost = ss.star * 10;
    return '<div class="hdr stroke">영웅<span class="sub">함께 싸울 영웅을 2명까지 데려가요</span></div>' +
      '<div class="comps' + (infoFold ? ' tall' : '') + '">' + cards + '</div>' +
      (infoFold ? '<div class="infotab stroke-s" data-act="infoFold" data-v="0">▲ ' + sel.n + ' 정보 열기</div>' : '<div class="compinfo box">' +
      '<div class="xfold" data-act="infoFold" data-v="1" title="닫기">✕</div>' +
      '<div class="tsl"><div class="lbl stroke-s">출전</div>' + slots + '</div>' +
      '<h3 class="stroke" style="color:' + GR[sel.g].c + '">' + sel.n + '</h3><div class="tags"><span style="background:' + GR[sel.g].c + ';color:#2a1a00">' + GR[sel.g].n + '</span><span>' + sel.eln + '</span><span>큰 기술 · ' + sel.ult + '</span></div>' +
      '<p>' + sel.desc + '</p>' +
      (ss.own ? '<p style="font-size:19px">' + stars(ss.star, 22) + ' 레벨 ' + ss.lv + '/' + maxLv + ' · 조각 ' + ss.sh + '</p>' +
        '<div class="row"><div class="btn ' + (S.team.includes(sel.id) ? 'r' : 'b') + '" data-act="team" data-v="' + sel.id + '">' + (S.team.includes(sel.id) ? '출전 빼기' : '출전하기') + '</div>' +
        '<div class="btn g ' + (S.gold >= lvCost && ss.lv < maxLv ? '' : 'dis') + '" data-act="compUp" data-v="' + sel.id + '" style="flex-direction:column;gap:0"><span>레벨업</span><small style="font-size:16px">' + (ss.lv < maxLv ? '엽전 ' + fmt(lvCost) : '별을 올려야 해요') + '</small></div>' +
        '<div class="btn y ' + (ss.sh >= stCost && ss.star < 5 ? '' : 'dis') + '" data-act="compStar" data-v="' + sel.id + '" style="flex-direction:column;gap:0"><span>별 올리기</span><small style="font-size:16px;color:#7a3300">' + (ss.star < 5 ? '조각 ' + stCost : '최고') + '</small></div></div>'
        : '<p>조각 10개를 모으면 함께할 수 있어요. 상점의 영웅 뽑기에서 얻어요.</p><div class="row"><div class="btn y ' + (ss.sh >= 10 ? '' : 'dis') + '" data-act="compUnlock" data-v="' + sel.id + '">맞이하기 (조각 ' + ss.sh + '/10)</div><div class="btn p" data-act="tab" data-v="shop">뽑으러 가기</div></div>') +
      '</div>');
  }  let selComp = 'dokkaebi', infoFold = false;
  function pgPower() {
    const list = SKILLS.map(s => {
      const lv = S.skills[s.id] || 1, cost = lv * 15, gc = lv * 400;
      const stars = [1, 2, 3, 4, 5].map(k => ic(lv >= k ? 'star' : 'star0')).join('');
      return '<div class="sk box"><div class="ico" style="background:' + s.c + ';overflow:hidden">' + ic(s.ic) + '<img src="img/skills/' + s.id + '.webp?v=2" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:17px" onerror="this.remove()"></div><h4 class="stroke-s">' + s.n + '</h4><p>' + s.d + '</p>' +
        '<p style="color:#ffe27a">위력 ' + (100 + (lv - 1) * 25) + '%</p><div class="stars">' + stars + '</div>' +
        (lv >= 5 ? '<div class="btn y dis">최고</div>' : '<div class="btn g ' + (S.stone >= cost && S.gold >= gc ? '' : 'dis') + '" data-act="skUp" data-v="' + s.id + '">' + ic('stone').replace('class="ic ', 'style="width:26px;height:26px" class="ic ') + cost + '</div>') + '</div>';
    }).join('');
    const EVO = window.JZD && JZD.EVO ? JZD.EVO : {}; const SN = id => (window.JZD ? (JZD.SKILLS.find(s => s.id === id) || {}).n : id);
    const evo = Object.keys(EVO).map(id => '<div class="box" style="display:flex;gap:10px;align-items:center;padding:8px;margin:6px 0"><img src="img/skills/' + id + '.webp?v=2" style="width:54px;height:54px;border-radius:10px;background:#2a2f5a" onerror="this.style.visibility=\'hidden\'"><span class="stroke-s" style="font-size:20px">+</span><img src="img/skills/' + EVO[id].pair + '.webp" style="width:54px;height:54px;border-radius:10px"><span class="stroke-s" style="font-size:24px">→</span><img src="img/skills/ev_' + id + '.webp" style="width:48px;height:70px;border-radius:8px;object-fit:cover"><div style="font-size:18px;line-height:1.3"><b style="color:#ffe27a">' + EVO[id].n + '</b><br>' + SN(id) + ' 5단계 + ' + SN(EVO[id].pair) + '</div></div>').join('');
    return '<div class="hdr stroke">신력<span class="sub">신력석 ' + S.stone + '개 · 별을 올리면 전투 속 기술이 세져요</span></div><div class="skills" style="top:96px">' + list + '<div style="grid-column:1/-1"><div class="stroke" style="font-size:26px;margin:14px 0 6px">진화 짝 (전투 중)</div>' + evo + '</div></div>';
  }
  function pgShop() {
    const free = S.freeGold !== today();
    const goods = [
      ['freeGold', '무료 엽전', 'coin', '엽전 500', free ? '무료' : '내일 다시', free ? 'g' : 'b dis', free ? '매일' : ''],
      ['gold3k', '엽전 꾸러미', 'coin', '엽전 5,000', '옥 50', 'b', ''],
      ['stone20', '신력석 상자', 'stone', '신력석 20', '옥 80', 'p', '인기'],
      ['torch30', '횃불 묶음', 'torch', '횃불 30', '옥 40', 'r', ''],
      ['jade300', '옥 주머니', 'jade', '옥 300', '결제 준비 중', 'b dis', ''],
      ['jade1k', '옥 상자', 'jade', '옥 1,000', '결제 준비 중', 'b dis', '']];
    return '<div class="hdr stroke">상점<span class="sub">옥으로 장비와 동료를 뽑아요</span></div><div class="shop" style="top:96px">' +
      '<div class="banner gold-frame"><div class="art" style="background-image:url(img/ui/title.jpg);background-position:center 30%"></div><h3 class="stroke">장비 뽑기</h3><div class="d stroke-s">10번 뽑으면 희귀 이상 1개 보장. 전설, 신화 장비가 나올 수 있어요.</div>' +
      '<div class="prob" data-act="prob" data-v="eq">확률 안내</div><div class="bb"><div class="btn b" data-act="gacha" data-v="eq1"><span>1번</span><small>' + ic('jade') + '60</small></div><div class="btn y" data-act="gacha" data-v="eq10"><span>10번</span><small>' + ic('jade') + '540</small></div></div></div>' +
      '<div class="banner gold-frame"><div class="art" style="background-image:url(img/ui/hero_yisunsin.webp?v=2);background-position:center 30%"></div><h3 class="stroke">영웅 뽑기</h3><div class="d stroke-s">이순신, 강감찬, 삼족오 같은 전설 영웅 조각이 나와요. 조각으로 영웅을 맞이하고 별을 올려요.</div>' +
      '<div class="prob" data-act="prob" data-v="cp">확률 안내</div><div class="bb"><div class="btn p" data-act="gacha" data-v="cp1"><span>1번</span><small>' + ic('jade') + '100</small></div><div class="btn y" data-act="gacha" data-v="cp10"><span>10번</span><small>' + ic('jade') + '900</small></div></div></div>' +
      '<div class="sect stroke">물건</div><div class="goods">' + goods.map(([id, n, i, what, price, c, tag]) =>
        '<div class="good box">' + (tag ? '<div class="tag stroke-s">' + tag + '</div>' : '') + '<div class="gi">' + ic(i) + '</div><div class="gn stroke-s">' + n + '</div><div style="font-size:18px;color:#ffe9a8">' + what + '</div><div class="btn ' + c + '" data-act="buy" data-v="' + id + '">' + price + '</div></div>').join('') + '</div></div>';
  }

  /* ---------------- 뽑기 ---------------- */
  const EQP = [45, 30, 17, 6.5, 1.4, 0.1];
  const CPP = [['g4', 3], ['g3', 12], ['g2', 20], ['g0', 15], ['stone', 25], ['gold', 25]];
  function rollGrade(min) { let r = Math.random() * 100, g = 0; for (; g < 6; g++) { if (r < EQP[g]) break; r -= EQP[g]; } return Math.max(min || 0, Math.min(5, g)); }
  function doGacha(kind) {
    const cost = { eq1: 60, eq10: 540, cp1: 100, cp10: 900 }[kind], n = kind.endsWith('10') ? 10 : 1;
    if (S.jade < cost) { toast('옥이 부족해요'); return; }
    S.jade -= cost; S.quests.gacha = (S.quests.gacha || 0) + 1; xinit(); S.st.gacha += 1;
    const res = [];
    if (kind.startsWith('eq')) {
      for (let i = 0; i < n; i++) { let g0 = rollGrade(0); S.pity = (S.pity || 0) + 1; if (S.pity >= 50 && g0 < 4) g0 = 4; if (g0 >= 4) S.pity = 0; const sg = g0 >= 4 && Math.random() < 0.12 ? rnd(Object.keys(SG)) : null; const it = mkItem(rnd(SLOTS).id, g0, null, sg); res.push({ g: it.g, img2: itemSrc(it), t: itemName(it) }); S.inv.push(it); }
      if (n === 10 && !res.some(r => r.g >= 2)) { const it = S.inv[S.inv.length - 1]; it.g = 2; res[9].g = 2; res[9].t = itemName(it); }
    } else {
      for (let i = 0; i < n; i++) {
        let r = Math.random() * 100, pick = 'gold'; for (const [k, p] of CPP) { if (r < p) { pick = k; break; } r -= p; }
        if (pick[0] === 'g' && pick !== 'gold') { const gg = +pick.slice(1), h = rnd(COMPS.filter(c => c.g === gg)), q = gg >= 4 ? 2 : gg === 3 ? 3 : 5; S.comps[h.id].sh += q; res.push({ g: h.g, img: h.img, t: h.n + ' 조각 ' + q }); }
        else if (pick === 'stone') { S.stone += 5; res.push({ g: 2, icon: 'stone', t: '신력석 5' }); }
        else { S.gold += 800; res.push({ g: 0, icon: 'coin', t: '엽전 800' }); }
      }
    }
    save();
    const g = document.createElement('div'); g.className = 'gacha'; g.id = 'gacha';
    g.innerHTML = '<div class="rays"></div><div class="stroke" style="font-size:44px;margin-bottom:30px;position:relative">' + (kind.startsWith('eq') ? '장비 뽑기' : '영웅 뽑기') + '</div><div class="gcards ' + (n === 1 ? 'one' : '') + '">' +
      res.map(r => '<div class="gc ' + (r.g >= 4 ? 'hi' : '') + '"><div class="in"><div class="f g' + r.g + '" style="border-color:' + GR[r.g].c + '">' + (r.img ? '<div style="width:80%;aspect-ratio:1;border-radius:12px;background:url(' + r.img + ') center/cover"></div>' : r.img2 ? '<img src="' + r.img2 + '" style="width:80%;aspect-ratio:1;object-fit:contain">' : ic(r.icon)) + '<b class="stroke-s">' + r.t + '</b></div><div class="bk">' + ic('jade') + '</div></div></div>').join('') +
      '</div><div class="gres"><div class="btn b" data-act="gclose">확인</div><div class="btn y" data-act="gacha" data-v="' + kind + '">한 번 더</div></div>';
    const old = $('#gacha', root); if (old) old.remove();
    root.appendChild(g);
    g.querySelectorAll('.gc').forEach((c, i) => setTimeout(() => c.classList.add('open'), 250 + i * 160));
  }
  function probModal(k) {
    if (k === 'eq') modal('<h3 class="stroke">장비 뽑기 확률</h3><table>' + GR.map((g, i) => '<tr><td style="color:' + g.c + '">' + g.n + '</td><td>' + EQP[i] + '%</td></tr>').join('') + '</table><p>10번 뽑기는 희귀 이상 1개를 꼭 줘요. 칸(무기, 갓, 도포, 토시, 신, 노리개)은 똑같은 확률이에요.</p>');
    else modal('<h3 class="stroke">영웅 뽑기 확률</h3><table><tr><td style="color:#ffd36b">전설 영웅 조각 2개 (이순신, 강감찬, 삼족오)</td><td>3%</td></tr><tr><td style="color:#e39bff">영웅 등급 조각 3개 (을지문덕, 원효대사, 구미호)</td><td>12%</td></tr><tr><td style="color:#6cc6ff">희귀 조각 5개 (홍길동, 해태)</td><td>20%</td></tr><tr><td>일반 조각 5개 (도깨비)</td><td>15%</td></tr><tr><td style="color:#6cc6ff">신력석 5개</td><td>25%</td></tr><tr><td>엽전 800</td><td>25%</td></tr></table><p>같은 등급 안의 영웅은 똑같은 확률이에요.</p>');
  }

  /* ---------------- 지도 ---------------- */
  const NX = [360, 210, 490, 250, 480, 220, 470, 260, 470, 360];
  function renderMap() {
    const C = chapters(), HB = 2100;
    const pos = C.map((c, i) => [NX[i % 10], HB - 170 - i * 195]);
    let d = 'M' + pos[0][0] + ' ' + (pos[0][1] + 60);
    for (let i = 1; i < pos.length; i++) { const [x0, y0] = pos[i - 1], [x1, y1] = pos[i]; d += ' C' + x0 + ' ' + (y0 - 90) + ' ' + x1 + ' ' + (y1 + 150) + ' ' + x1 + ' ' + (y1 + 60); }
    const nodes = C.map((c, i) => {
      const lock = c.n > S.chap, done = (S.stars[c.n] || 0) >= 1 && c.n < S.chap || (S.stars[c.n] || 0) >= 3, cur = c.n === S.chap;
      const st = [1, 2, 3].map(k => ic((S.stars[c.n] || 0) >= k ? 'star' : 'star0')).join('');
      const chest = (S.stars[c.n] || 0) >= 3 && !S.chest[c.n] ? '<svg class="ch" viewBox="0 0 64 64" data-act="chest" data-v="' + c.n + '" style="animation:bob 1.4s infinite">' + I.chest + '</svg>' : '';
      return '<div class="node ' + (lock ? 'lock' : done ? 'done' : '') + (cur ? ' cur' : '') + '" style="left:' + pos[i][0] + 'px;top:' + pos[i][1] + 'px" data-act="node" data-v="' + c.n + '">' +
        '<div class="ball stroke">' + (lock ? ic('lock').replace('class="ic ', 'style="width:60px;height:60px" class="ic ') : c.n) + chest + '</div>' +
        '<div class="lab stroke-s">' + c.name + '</div><div class="st">' + st + '</div></div>';
    }).join('');
    $('#s-map').innerHTML = '<div class="mapscroll" id="mapscroll"><div class="mapbody"><svg class="mpath" width="720" height="' + HB + '"><path d="' + d + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="22" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#ffe9a8" stroke-width="10" stroke-dasharray="2 22" stroke-linecap="round"/></svg>' + nodes + '</div></div>' +
      '<div class="mapbar"><div class="btn b back" data-act="lobby">' + ic('back').replace('class="ic ', 'style="width:40px;height:40px" class="ic ') + '</div><div class="t stroke">모험 지도</div>' +
      '<div style="margin-left:auto" class="rpill stroke-s">' + ic('torch') + S.torch + '/' + TORCH_MAX + '</div></div>';
    show('s-map');
    const sc = $('#mapscroll'); const y = pos[Math.min(S.chap, C.length) - 1][1]; sc.scrollTop = Math.max(0, y - 640);
  }
  function chapModal(n) {
    const c = chapters()[n - 1], rec = Math.round(900 * Math.pow(n, 1.6)), st = stats();
    modal('<h3 class="stroke">챕터 ' + n + ' · ' + c.name + '</h3>' +
      '<div style="height:200px;border-radius:16px;background:url(img/ui/map_bg.jpg) center ' + (100 - (n - 1) * 11) + '%/cover;border:3px solid #ffd36b;margin-bottom:14px"></div>' +
      '<p>밤 ' + c.waves + '번을 버티면 이겨요. 마지막 밤에는 우두머리가 나와요.</p>' +
      '<p>권장 전투력 <b style="color:' + (st.power >= rec ? '#7df06a' : '#ff8e8e') + '">' + fmt(rec) + '</b> · 내 전투력 ' + fmt(st.power) + '</p>' +
      '<p>최고 기록: ' + (S.best[n] ? '밤 ' + S.best[n] + '/' + c.waves : '없음') + '</p>' +
      '<div class="row"><div class="btn y" data-act="go" data-v="' + n + '" style="flex-direction:column;gap:0"><span>도전하기</span><small style="font-size:18px;display:flex;gap:4px;align-items:center;color:#7a3300">' + ic('torch').replace('class="ic ', 'style="width:26px;height:26px" class="ic ') + '5</small></div></div>' +
      '<p style="margin-top:16px;color:#ffe27a">다른 방식으로 도전하기</p><div class="row" style="flex-wrap:wrap;gap:10px">' +
      [['challenge', '극한 도전', '미션 3개 별 3개'], ['endless', '무한 방어선', '끝없이 버티기'], ['gold', '엽전 던전', '엽전 3배'], ['xp', '경험치 던전', '경험치 3배'], ['boss', '우두머리 토벌', '피해량 기록']].map(m => '<div class="btn ' + (m[0] === 'boss' ? 'r' : 'b') + '" data-act="mode" data-v="' + m[0] + ':' + n + '" style="flex-direction:column;gap:0;min-width:180px"><span>' + m[1] + '</span><small style="font-size:16px">' + m[2] + (S.modeBest && S.modeBest[m[0] + n] ? ' · 최고 ' + S.modeBest[m[0] + n] : '') + '</small></div>').join('') + '</div>');
  }

  /* ---------------- 전투 시작과 결과 ---------------- */
  let lastCh = 1;
  function startBattle(n) {
    tickTorch();
    if (S.torch < 5) { modal('<h3 class="stroke">횃불이 모자라요</h3><p>챕터에 들어가려면 횃불 5개가 필요해요. 횃불은 6분마다 1개씩 차요.</p><div class="row"><div class="btn r" data-act="buy" data-v="torch30">옥 40으로 30개 채우기</div></div>'); return; }
    if (S.torch >= TORCH_MAX) S.torchT = now();
    S.torch -= 5; S.quests.battle = (S.quests.battle || 0) + 1; S.plays++; lastCh = n; save();
    closeModal();
    const st = stats();
    const cfg = { chapter: n, heroLv: S.lv, atk: st.atk / 100, hp: st.hp / 1000, companions: S.team.filter(id => S.comps[id] && S.comps[id].own).slice(0, 2), skillStars: Object.assign({}, S.skills), weapon: (byUid(S.equip.weapon) || {}).w || 'bow', items: Object.values(S.equip).map(byUid).filter(Boolean).map(it => ({ id: jziId(it), grade: it.g, lv: it.lv })).filter(x => x.id), itemsFxOnly: true, mode: S.nextMode || 'adventure', hqLv: 1, sets: setsOf() }; S.nextMode = null;
    stopMusic();
    const J = window.JZB;
    if (J && typeof J.start === 'function') {
      J.onEnd = onEnd;
      meta.classList.add('off');
      try { J.start(cfg); } catch (e) { console.error(e); meta.classList.remove('off'); toast('전투를 열지 못했어요'); }
    } else fakeBattle(cfg);
  }
  function fakeBattle(cfg) {
    const f = document.createElement('div'); f.className = 'fakebattle'; f.innerHTML = '<div class="stroke">시험 전투 중... (챕터 ' + cfg.chapter + ')</div><div class="bar2"><i></i></div>';
    root.appendChild(f); requestAnimationFrame(() => requestAnimationFrame(() => { f.querySelector('i').style.width = '100%'; }));
    const C = chapters()[cfg.chapter - 1];
    setTimeout(() => { f.remove(); onEnd({ win: Math.random() < 0.8, chapter: cfg.chapter, wave: C.waves, waves: C.waves, dmg: { skill: 52000, hero: 21000, building: 34000, player: 18000 }, kills: 240 + cfg.chapter * 30, gold: 300, time: 412 }); }, 3000);
  }
  function onEnd(r) {
    try { xOnEnd(r || {}); } catch (e) { console.warn(e); }
    try { if (arguments[0] && arguments[0].mode && arguments[0].mode !== 'adventure') { const r0 = arguments[0]; S.modeBest = S.modeBest || {}; const key = r0.mode + r0.chapter, val = r0.mode === 'endless' ? r0.wave + '밤' : r0.mode === 'boss' ? fmt(r0.bossDmg || 0) : r0.mode === 'challenge' ? '★' + (r0.stars || 0) : (r0.win ? '완료' : '실패'); S.modeBest[key] = val; } } catch (e) {}
    r = r || {};
    meta.classList.remove('off');
    try { window.JZB && window.JZB.hide && window.JZB.hide(); } catch (e) {}
    const n = r.chapter || lastCh, C = chapters(), c = C[n - 1] || C[0], waves = r.waves || c.waves, wave = Math.min(r.wave || 0, waves);
    const win = !!r.win;
    const stars = win ? (wave >= waves ? 3 : 2) : wave >= waves * 0.66 ? 2 : wave >= waves * 0.33 ? 1 : 0;
    if (stars > (S.stars[n] || 0)) S.stars[n] = stars;
    if (wave > (S.best[n] || 0)) S.best[n] = wave;
    const unlocked = win && n === S.chap && S.chap < C.length;
    if (unlocked) { S.chap++; S.sel = S.chap; }
    const gold = Math.round((r.gold || 0) + (win ? 400 : 150) * n + (r.kills || 0) * 2);
    const exp = Math.round((win ? 90 : 40) * n);
    const stone = win ? 4 + n * 2 : Math.floor(n * wave / waves * 2);
    const drop = win ? mkItem(rnd(SLOTS).id, Math.min(5, rollGrade(Math.min(3, Math.floor((n - 1) / 3))))) : null;
    const rw = { gold, exp, stone, drop, jade: win && unlocked ? 50 : 0, dbl: false };
    S.gold += gold; S.stone += stone; S.jade += rw.jade; if (drop) S.inv.push(drop);
    const lvUp = addExp(exp); save();
    lastRw = rw;
    const d = r.dmg || {}, tot = Math.max(1, (d.skill || 0) + (d.hero || 0) + (d.building || 0) + (d.player || 0));
    const rows = [['skill', '신력', 'tPower', '#9a4ef0', 'linear-gradient(90deg,#b070ff,#6a20c0)'], ['hero', '영웅', 'tComp', '#2b9520', 'linear-gradient(90deg,#9df27a,#2b9520)'], ['building', '건물', 'skGun', '#1d62c9', 'linear-gradient(90deg,#7fd0ff,#1d62c9)'], ['player', '처용', 'bow', '#c0301b', 'linear-gradient(90deg,#ffb02a,#e0401b)']];
    const el = $('#s-result'); el.className = 'm-scr ' + (win ? '' : 'lose');
    el.innerHTML = '<div class="rays"></div><div class="rtitle"><span>' + (win ? '승리' : '패배') + '</span></div>' +
      '<div class="rsub stroke-s">챕터 ' + n + ' · ' + c.name + (unlocked ? ' · 다음 챕터 열림!' : '') + '</div>' +
      '<div class="rinfo"><div class="stat stroke-s">밤 ' + wave + '/' + waves + '</div><div class="stat stroke-s">물리친 좀비 ' + fmt(r.kills || 0) + '</div><div class="stat stroke-s">' + Math.floor((r.time || 0) / 60) + '분 ' + ((r.time || 0) % 60) + '초</div></div>' +
      '<div class="dmg box"><h4 class="stroke-s">피해 비율</h4>' + rows.map(([k, nm, i, bg, grad]) => { const p = Math.round((d[k] || 0) / tot * 100); return '<div class="drow"><div class="ic2" style="background:' + bg + '">' + ic(i) + '</div><div class="nm stroke-s">' + nm + '</div><div class="bar"><i data-w="' + p + '" style="background:' + grad + '"></i></div><div class="pc stroke-s">' + p + '%</div></div>'; }).join('') +
      '<div style="text-align:center;font-size:18px;color:#cdd6ff;margin-top:6px">전체 피해 ' + fmt(tot) + '</div></div>' +
      '<div class="rew box"><h4 class="stroke-s">보상' + (lvUp ? ' · <span style="color:#7df06a">레벨 올라감! ' + S.lv + '</span>' : '') + '</h4><div class="rewl" id="rewl">' + rewHtml(rw) + '</div></div>' +
      '<div class="rbtns"><div class="btn p" data-act="adx2" id="adx2"><span>광고 보고 2배</span><small>시제품: 광고 없이 바로</small></div><div class="btn y" data-act="rok"><span>확인</span></div></div>';
    show('s-result'); music('bgm_lobby');
    setTimeout(() => el.querySelectorAll('.drow .bar i').forEach(i => { i.style.width = i.dataset.w + '%'; }), 120);
  }
  let lastRw = null;
  function rewHtml(rw) {
    const m = rw.dbl ? 2 : 1;
    const box = (i, v, g) => '<div class="rw" style="border-color:' + GR[g].c + ';background:rgba(0,0,0,.4)">' + ic(i) + '<b class="stroke-s">' + fmt(v) + '</b></div>';
    return box('coin', rw.gold * m, 4) + box('stone', rw.stone * m, 3) + '<div class="rw" style="border-color:#7df06a;background:rgba(0,0,0,.4);font-size:22px;flex-direction:column"><span class="stroke-s" style="color:#7df06a">경험</span><b class="stroke-s" style="position:static">' + fmt(rw.exp) + '</b></div>' +
      (rw.jade ? box('jade', rw.jade, 4) : '') +
      (rw.drop ? '<div class="rw g' + rw.drop.g + '">' + ic(itemIc(rw.drop)) + '<b class="stroke-s" style="font-size:14px;left:4px;right:4px;text-align:center">' + itemName(rw.drop) + '</b></div>' : '');
  }

  /* ---------------- 모달들 ---------------- */
  const JZI_MAP = { hat: 'h_jeonrip', robe: 'r_dujeong', arm: 'g_gauntlet', shoes: 's_mituri', norigae: 'a_tiger' };
  const jziId = it => it.slot === 'weapon' ? 'w_' + (it.w || 'bow') : JZI_MAP[it.slot];
  /* 등급별 특수 효과 목록: [필요 등급, 설명, 열림 여부] */
  function itemFx(it) { const J = window.JZI && JZI.ITEMS[jziId(it)]; if (!J) return []; return [3, 4, 5].map(g => [g, J.fx[g][1], it.g >= g]); }
  function fxHtml(it) { const GN = ['일반', '우수', '희귀', '영웅', '전설', '신화']; return itemFx(it).map(f => '<p style="font-size:18px;margin:2px 0;color:' + (f[2] ? '#ffe27a' : 'rgba(255,255,255,.45)') + '">' + (f[2] ? '★ ' : '잠김 ') + GN[f[0]] + ': ' + f[1] + '</p>').join(''); }
  function itemModal(uid) {
    const it = byUid(uid); if (!it) return;
    const s = SLOT[it.slot], cur = byUid(S.equip[it.slot]), eq = cur && cur.uid === it.uid, cost = 150 * it.lv * (it.g + 1);
    modal('<h3 class="stroke" style="color:' + GR[it.g].c + '">' + itemName(it) + '</h3>' +
      '<div style="display:flex;gap:20px;align-items:center"><div class="slot g' + it.g + '" style="flex:none">' + itemImg(it) + '<div class="lv stroke-s">' + it.lv + '</div></div>' +
      '<div><p>' + GR[it.g].n + ' ' + s.n + ' · 레벨 ' + it.lv + '</p><p style="color:#ffe27a">' + (s.st === 'atk' ? '공격력 +' : '체력 +') + itemVal(it) + '</p>' +
      (it.w && window.JZD && JZD.WEAPON && JZD.WEAPON[it.w] ? '<p style="font-size:18px">' + JZD.WEAPON[it.w].d + '</p>' : '') + fxHtml(it) + (it.set ? '<p style="font-size:18px;color:' + SETS[it.set].c + '">' + SETS[it.set].n + ' (착용 ' + (setsOf()[it.set] || 0) + '/6) · 2부위 ' + SETS[it.set].b[0] + ' · 4부위 ' + SETS[it.set].b[1] + ' · 6부위 ' + SETS[it.set].b[2] + '</p>' : '') + (it.sg ? '<p style="font-size:18px;color:#ff8a8a">' + SG[it.sg].d + '</p>' : '') + '<p style="font-size:17px;opacity:.8">레벨 ' + it.lv + '/' + LV_CAP(it) + ' · 강화에 ' + SLOT[it.slot].n + ' 도면 ' + (1 + Math.floor(it.lv / 5)) + '개 (보유 ' + (S.plans[it.slot] || 0) + ')</p>' + (cur && !eq ? '<p style="font-size:18px">지금 착용: ' + itemName(cur) + ' (+' + itemVal(cur) + ')</p>' : '') + '</div></div>' +
      '<div class="row">' + (eq ? '' : '<div class="btn b" data-act="equip" data-v="' + uid + '">착용</div><div class="btn r" data-act="salvage" data-v="' + uid + '">분해</div>') +
      '<div class="btn g ' + (S.gold >= cost ? '' : 'dis') + '" data-act="itemUp" data-v="' + uid + '" style="flex-direction:column;gap:0"><span>강화</span><small style="font-size:18px;display:flex;align-items:center;gap:4px">' + ic('coin').replace('class="ic ', 'style="width:24px;height:24px" class="ic ') + fmt(cost) + '</small></div></div>');
  }
  function patrolModal() {
    const p = patrol();
    modal('<h3 class="stroke">순찰 보상</h3><p style="text-align:center">처용 일행이 ' + hm(p.ms) + ' 동안 마을을 돌았어요. (최대 16시간)</p>' +
      '<div class="rewl" style="margin:16px 0">' + [['coin', p.gold, 4], ['stone', p.stone, 3], ['jade', p.jade, 4]].map(([i, v, g]) => '<div class="rw" style="border-color:' + GR[g].c + ';background:rgba(0,0,0,.4)">' + ic(i) + '<b class="stroke-s">' + fmt(v) + '</b></div>').join('') +
      '<div class="rw" style="border-color:#7df06a;background:rgba(0,0,0,.4);flex-direction:column"><span class="stroke-s" style="color:#7df06a;font-size:20px">경험</span><b class="stroke-s" style="position:static">' + fmt(p.exp) + '</b></div></div>' +
      '<p style="text-align:center;font-size:18px">챕터를 깰수록 한 시간에 얻는 양이 늘어요.</p>' +
      '<div class="row"><div class="btn y ' + (p.ms >= 60000 ? '' : 'dis') + '" data-act="patrolGet">받기</div><div class="btn r" data-act="patrolFast" style="flex-direction:column;gap:0"><span>빠른 순찰</span><small style="font-size:18px">횃불 5 · 2시간치</small></div></div>');
  }
  function attModal() {
    const d = today(), can = S.attDay !== d, day = (S.att % 7) + 1;
    const R = [['coin', 1000], ['jade', 50], ['stone', 10], ['coin', 3000], ['jade', 100], ['stone', 30], ['jade', 300]];
    modal('<h3 class="stroke">7일 출석</h3><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' + R.map(([i, v], k) => {
      const got = k < (S.att % 7) || (!can && k === (S.att - 1) % 7);
      return '<div class="box" style="height:150px;text-align:center;padding-top:6px;' + (k === day - 1 && can ? 'border-color:#ffd36b;box-shadow:0 0 18px #ffd36b' : '') + (got ? ';opacity:.45' : '') + '"><div class="stroke-s" style="font-size:18px">' + (k + 1) + '일</div>' + ic(i).replace('class="ic ', 'style="width:60px;height:60px" class="ic ') + '<div class="stroke-s" style="font-size:20px">' + fmt(v) + '</div>' + (got ? '<div style="color:#7df06a;font-size:18px">받음</div>' : '') + '</div>';
    }).join('') + '</div><div class="row"><div class="btn y ' + (can ? '' : 'dis') + '" data-act="attGet">' + (can ? day + '일째 받기' : '내일 또 와요') + '</div></div>');
    attModal.R = R;
  }
  function questModal() {
    modal('<h3 class="stroke">오늘의 임무</h3>' + QUESTS.map(q => {
      const v = Math.min(q.need, S.quests[q.id] || 0), got = (S.quests.got || {})[q.id];
      return '<div class="box" style="display:flex;align-items:center;gap:14px;padding:14px 16px;margin:10px 0"><div style="flex:1"><div class="stroke-s" style="font-size:24px">' + q.n + '</div><div style="font-size:18px;color:#cdd6ff">' + v + '/' + q.need + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:4px;font-size:22px" class="stroke-s">' + ic('jade').replace('class="ic ', 'style="width:34px;height:34px" class="ic ') + q.r + '</div>' +
        '<div class="btn ' + (got ? 'b dis' : v >= q.need ? 'y' : 'b dis') + '" style="height:60px;width:120px;font-size:22px" data-act="qGet" data-v="' + q.id + '">' + (got ? '완료' : '받기') + '</div></div>';
    }).join(''));
  }
  function mailModal() {
    modal('<h3 class="stroke">우편</h3>' + (S.mail ? '<p style="text-align:center">새 우편이 없어요.</p>' :
      '<div class="box" style="padding:18px"><div class="stroke-s" style="font-size:26px">처용, 조선좀비에 오신 것을 반겨요!</div><p>마을을 지켜 줄 처용님께 첫 선물을 보내요.</p><div class="rewl">' +
      [['jade', 500, 4], ['coin', 5000, 4], ['stone', 30, 3]].map(([i, v, g]) => '<div class="rw" style="border-color:' + GR[g].c + ';background:rgba(0,0,0,.4)">' + ic(i) + '<b class="stroke-s">' + fmt(v) + '</b></div>').join('') +
      '</div><div class="row"><div class="btn y" data-act="mailGet">받기</div></div></div>'));
  }
  /* ---------------- 쿠폰(행사 코드) ----------------
     코드 원문은 넣지 않고 해시만 둔다. rep: 여러 번 쓸 수 있는 시험용. 이 검사는 기기 안에서만 하므로
     정식 유료 판매 전에는 서버 검사로 바꿔야 한다. */
  const CPN_SALT = 'jz:MQMRT2QLZ2';
  const CPN = { 'emcd515lgu': { jade: 10000, rep: true }, 'xtc3izhfdg': { jade: 300 }, '1g0kle3wmjk': { jade: 10000, rep: true }, 'ii2xa7zzi3': { jade: 300 } };
  const cpnHash = (str, seed) => { let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0); for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  function couponModal() {
    modal('<h3 class="stroke">쿠폰 입력</h3><p style="text-align:center">행사 코드를 입력하세요</p>' +
      '<div class="row"><input id="cpnIn" class="xcpn" type="text" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="쿠폰 코드"></div>' +
      '<div class="row"><div class="btn y" data-act="cpnUse">확인</div></div>');
    const i = $('#cpnIn', root); if (i) setTimeout(() => i.focus(), 60);
  }
  function useCoupon() {
    const i = $('#cpnIn', root), code = (i ? i.value : '').trim().toUpperCase();
    if (!code) return;
    const k = cpnHash(CPN_SALT + code), c = CPN[k];
    S.cpn = S.cpn || {};
    if (!c) { toast('없는 코드예요'); return; }
    if (S.cpn[k] && !c.rep) { toast('이미 쓴 코드예요'); return; }
    S.cpn[k] = (S.cpn[k] || 0) + 1; S.jade += c.jade; save(); closeModal(); toast('쿠폰 보상: 옥 ' + fmt(c.jade)); refresh();
  }
  function settingsModal() {
    modal('<h3 class="stroke">설정</h3>' + accountBox() + '<div class="row"><div class="btn ' + (S.music ? 'g' : 'b') + '" data-act="toggleMusic">' + ic(S.music ? 'note' : 'noteOff').replace('class="ic ', 'style="width:40px;height:40px" class="ic ') + (S.music ? '음악 켬' : '음악 끔') + '</div></div>' +
      '<div class="row"><div class="btn p" data-act="coupon">쿠폰 입력</div></div>' +
      '<p style="text-align:center;margin-top:20px">저장은 이 기기에 자동으로 돼요.</p><div class="row"><div class="btn r" data-act="reset">처음부터 다시</div></div>');
  }


  /* ---------------- 바깥 콘텐츠: 시즌 패스, 업적, 도감, 기간 이벤트, 랭킹, 친구, 문파 ---------------- */
  const monthKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); };
  const weekKey = () => { const d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); return y + '-W' + Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); };
  function xinit() {
    S.st = Object.assign({ kills: 0, wins: 0, games: 0, gacha: 0, upg: 0, boss: 0 }, S.st || {});
    if (!S.pass || S.pass.season !== monthKey()) S.pass = { season: monthKey(), xp: 0, f: {}, p: {}, paid: false };
    S.ach = S.ach || {}; S.codex = Object.assign({ hero: {}, zom: {}, item: {}, seenZ: {}, seenI: {} }, S.codex || {});
    if (!S.ev || S.ev.id !== monthKey()) S.ev = { id: monthKey(), got: 0, last: '' };
    if (!S.wk || S.wk.key !== weekKey()) S.wk = { key: weekKey(), score: 0 };
    S.friends = S.friends || []; S.guild = S.guild || null; if (!S.myCode) S.myCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    for (const it of S.inv) S.codex.seenI[it.slot + it.g] = 1;
  }
  const RIC = { jade: 'jade', coin: 'coin', stone: 'stone', torch: 'torch' };
  function give(k, v) { if (k === 'jade') S.jade += v; else if (k === 'coin') S.gold += v; else if (k === 'stone') S.stone += v; else if (k === 'torch') S.torch += v; }
  const rwBox = (k, v, g, sm) => '<div class="rw" style="border-color:' + GR[g || 2].c + ';background:rgba(0,0,0,.4);' + (sm ? 'width:84px;height:84px' : '') + '">' + ic(RIC[k]) + '<b class="stroke-s">' + fmt(v) + '</b></div>';
  /* 전투가 끝날 때 */
  function xOnEnd(r) {
    xinit(); const k = r.kills || 0, win = !!r.win;
    S.st.games++; S.st.kills += k; if (win) S.st.wins++; if (win && r.wave >= r.waves) S.st.boss++;
    S.pass.xp += (win ? 120 : 50) + Math.floor(k / 10);
    const C = (window.JZD && JZD.CHAPTERS) || []; const ch = C[(r.chapter || 1) - 1];
    if (ch) { for (const z of [...ch.pool, ch.elite]) S.codex.seenZ[z] = 1; if (win) S.codex.seenZ[ch.boss] = 1; }
    S.wk.score += k + (win ? 300 : 0); S.wk.kills = (S.wk.kills || 0) + k;
    try { if (S.guild && accUser()) putEntry('kzgw-' + S.wk.key, S.guild.id, S.wk.kills).catch(() => {}); } catch (e) {}
    try { const A = window.HKAccount; if (A && A.user && A.submitScore && S.wk.score > 0) A.submitScore('kzombi-' + S.wk.key, S.wk.score, accName()).catch(() => {}); } catch (e) {}
  }
  /* 시즌 패스: 30단계, 단계마다 100점. 유료 줄은 990원(결제 준비 중) */
  const PASS_N = 30, PASS_XP = 100;
  const passFree = i => [['coin', 2000], ['jade', 30], ['stone', 5], ['torch', 5]][i % 4];
  const passPaid = i => [['jade', 60], ['coin', 5000], ['stone', 12], ['jade', 80], ['torch', 10]][i % 5];
  function passModal() {
    xinit(); const lv = Math.min(PASS_N, Math.floor(S.pass.xp / PASS_XP)), into = S.pass.xp % PASS_XP;
    let rows = '';
    for (let i = 0; i < PASS_N; i++) {
      const ok = lv > i, [fk, fv] = passFree(i), [pk, pv] = passPaid(i);
      const fs = S.pass.f[i] ? '<i class="xchk">✔</i>' : ok ? '<div class="btn g xget" data-act="passGet" data-v="f' + i + '">받기</div>' : '';
      const ps = S.pass.p[i] ? '<i class="xchk">✔</i>' : ok && S.pass.paid ? '<div class="btn g xget" data-act="passGet" data-v="p' + i + '">받기</div>' : '<i class="xlock">' + ic('lock') + '</i>';
      rows += '<div class="xprow' + (ok ? ' on' : '') + '"><div class="xpn stroke-s">' + (i + 1) + '</div><div class="xpc">' + rwBox(fk, fv, 2, 1) + fs + '</div><div class="xpc paid">' + rwBox(pk, pv, 4, 1) + ps + '</div></div>';
    }
    modal('<h3 class="stroke">시즌 패스</h3><p style="text-align:center;margin:0 0 8px">' + S.pass.season.replace('-', '년 ') + '월 시즌 · 전투를 하면 패스 점수가 쌓여요</p>' +
      '<div class="xbar"><i style="width:' + (lv >= PASS_N ? 100 : into) + '%"></i><span class="stroke-s">' + lv + '단계 · ' + (lv >= PASS_N ? '최고' : into + '/' + PASS_XP) + '</span></div>' +
      '<div class="xphd"><span>단계</span><span>무료</span><span>황금 패스</span></div><div class="xscroll">' + rows + '</div>' +
      '<div class="row">' + (S.pass.paid ? '<div class="btn y" style="min-width:300px">황금 패스 사용 중</div>' : '<div class="btn p" data-act="passBuy" style="min-width:320px;flex-direction:column;gap:0"><span>황금 패스 열기 990원</span><small style="font-size:16px">결제 준비 중</small></div>') + '</div>', 'xwide');
  }
  /* 업적 */
  const ACH = [
    { id: 'k1', n: '좀비 100마리 물리치기', v: () => S.st.kills, need: 100, r: ['jade', 30] }, { id: 'k2', n: '좀비 1,000마리 물리치기', v: () => S.st.kills, need: 1000, r: ['jade', 80] }, { id: 'k3', n: '좀비 10,000마리 물리치기', v: () => S.st.kills, need: 10000, r: ['jade', 200] },
    { id: 'w1', n: '첫 승리', v: () => S.st.wins, need: 1, r: ['coin', 3000] }, { id: 'w2', n: '10번 승리', v: () => S.st.wins, need: 10, r: ['jade', 60] }, { id: 'w3', n: '50번 승리', v: () => S.st.wins, need: 50, r: ['jade', 150] },
    { id: 'c1', n: '챕터 3 열기', v: () => S.chap, need: 3, r: ['stone', 20] }, { id: 'c2', n: '챕터 5 열기', v: () => S.chap, need: 5, r: ['jade', 100] }, { id: 'c3', n: '챕터 10 열기', v: () => S.chap, need: 10, r: ['jade', 200] },
    { id: 'h1', n: '영웅 3명 모으기', v: () => COMPS.filter(c => S.comps[c.id] && S.comps[c.id].own).length, need: 3, r: ['jade', 50] }, { id: 'h2', n: '영웅 8명 모으기', v: () => COMPS.filter(c => S.comps[c.id] && S.comps[c.id].own).length, need: 8, r: ['jade', 150] },
    { id: 'g1', n: '뽑기 10번', v: () => S.st.gacha, need: 10, r: ['stone', 15] }, { id: 'g2', n: '뽑기 50번', v: () => S.st.gacha, need: 50, r: ['jade', 100] },
    { id: 'u1', n: '장비 강화 20번', v: () => S.st.upg, need: 20, r: ['coin', 8000] },
  ];
  const passDot = () => { xinit(); const lv = Math.min(PASS_N, Math.floor(S.pass.xp / PASS_XP)); for (let i = 0; i < lv; i++) if (!S.pass.f[i]) return true; return false; };
  const achDot = () => { xinit(); return ACH.some(a => !S.ach[a.id] && a.v() >= a.need); };
  function achModal() {
    xinit();
    const list = ACH.map(a => { const v = Math.min(a.need, a.v()), done = S.ach[a.id], ok = v >= a.need;
      return '<div class="xrow box"><div class="xn"><b class="stroke-s">' + a.n + '</b><div class="xbar sm"><i style="width:' + (v / a.need * 100) + '%"></i><span class="stroke-s">' + fmt(v) + '/' + fmt(a.need) + '</span></div></div>' + rwBox(a.r[0], a.r[1], 3, 1) +
        (done ? '<i class="xchk">✔</i>' : '<div class="btn ' + (ok ? 'g' : 'b no') + ' xget" data-act="achGet" data-v="' + a.id + '">' + (ok ? '받기' : '진행') + '</div>') + '</div>'; }).join('');
    modal('<h3 class="stroke">업적</h3><div class="xscroll">' + list + '</div>', 'xwide');
  }
  /* 도감 */
  let cdTab = 'hero', MAN = null;
  function codexItems() {
    if (cdTab === 'hero') return COMPS.map(c => ({ k: c.id, n: c.n, own: S.comps[c.id] && S.comps[c.id].own, img: '<div class="xcimg" style="background-image:url(' + c.img + ')"></div>', g: c.g, r: 20 + c.g * 10 }));
    if (cdTab === 'zom') { const EN = (window.JZD && JZD.EN) || {}; return Object.keys(EN).map(k => ({ k, n: EN[k].n || k, own: !!S.codex.seenZ[k], img: zimg(k), g: 2, r: 10 })); }
    const out = []; for (const s of SLOTS) for (let g = 0; g < 6; g++) out.push({ k: s.id + g, n: (s.names && s.names[g]) || s.n, own: !!S.codex.seenI[s.id + g], img: '<img src="img/items/' + (s.id === 'weapon' ? 'weapon_g' + g : s.id + '_g' + g) + '.webp" style="width:70%;height:70%;object-fit:contain" onerror="this.style.display=\'none\'">', g, r: 5 + g * 5 }); return out;
  }
  function zimg(k) { const m = MAN && MAN[k]; if (!m) return '<div class="xcimg">' + ic('lock') + '</div>'; const fr = m.frames || 1, dr = m.dirs || 1; return '<div class="xcimg" style="background-image:url(sprites/' + m.src + ');background-size:' + (fr * 100) + '% ' + (dr * 100) + '%;background-position:0 ' + (dr > 1 ? (2 / (dr - 1) * 100) : 0) + '%"></div>'; }
  function codexModal() {
    xinit(); if (!MAN) { fetch('sprites/manifest.json').then(r => r.json()).then(j => { MAN = j; if ($('#mdl', root) && $('.xcodex', root)) codexModal(); }).catch(() => { MAN = {}; }); }
    const list = codexItems(), have = list.filter(x => x.own).length, box = S.codex[cdTab];
    const cells = list.map(x => { const got = box[x.k]; return '<div class="xcell' + (x.own ? '' : ' off') + '" style="border-color:' + GR[Math.min(5, x.g)].c + '"' + (x.own && !got ? ' data-act="cdGet" data-v="' + x.k + '"' : '') + '>' + x.img + '<div class="nm stroke-s">' + (x.own ? x.n : '???') + '</div>' + (x.own && !got ? '<i class="dot"></i><div class="xrw stroke-s">옥 ' + x.r + '</div>' : got ? '<i class="xchk sm">✔</i>' : '') + '</div>'; }).join('');
    modal('<h3 class="stroke">도감</h3><div class="xtabs">' + [['hero', '영웅'], ['zom', '좀비'], ['item', '장비']].map(([k, n]) => '<div class="btn ' + (k === cdTab ? 'y' : 'b') + '" data-act="cdTab" data-v="' + k + '">' + n + '</div>').join('') + '</div>' +
      '<p style="text-align:center;margin:6px 0">모은 것 ' + have + '/' + list.length + ' · 새로 모은 칸을 누르면 옥을 받아요</p><div class="xscroll xcodex">' + cells + '</div>', 'xwide');
  }
  const cdDot = () => { xinit(); for (const t of ['hero', 'zom', 'item']) { const o = cdTab; cdTab = t; const any = codexItems().some(x => x.own && !S.codex[t][x.k]); cdTab = o; if (any) return true; } return false; };
  /* 기간 이벤트: 이달의 7일 출석 축제 */
  const EVR = [['jade', 50], ['coin', 5000], ['stone', 15], ['torch', 15], ['jade', 80], ['coin', 10000], ['jade', 150]];
  const evDot = () => { xinit(); return S.ev.got < 7 && S.ev.last !== today(); };
  function evModal() {
    xinit(); const d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 0), left = end.getDate() - d.getDate();
    const cells = EVR.map(([k, v], i) => { const got = i < S.ev.got, now = i === S.ev.got && S.ev.last !== today(); return '<div class="xev' + (got ? ' got' : now ? ' now' : '') + '"' + (now ? ' data-act="evGet"' : '') + '><div class="stroke-s" style="font-size:20px">' + (i + 1) + '일째</div>' + rwBox(k, v, i === 6 ? 5 : 3, 1) + (got ? '<i class="xchk">✔</i>' : '') + '</div>'; }).join('');
    modal('<h3 class="stroke">처용 맞이 축제</h3><p style="text-align:center">이번 달 안에 7일을 들르면 날마다 선물을 받아요. 하루에 한 칸씩!<br><b style="color:#ffe27a">남은 기간 ' + left + '일</b></p><div class="xevs">' + cells + '</div>' + (S.ev.got >= 7 ? '<p style="text-align:center;color:#7df06a">이번 축제 선물을 모두 받았어요</p>' : ''));
  }
  /* 랭킹: 같은 HANKUKIN 계정·Firestore의 주간 순위표. 가짜 순위는 만들지 않는다 */
  async function rankModal() {
    xinit();
    modal('<h3 class="stroke">주간 랭킹</h3><p style="text-align:center">이번 주(' + S.wk.key + ') 물리친 좀비 수 + 승리 300점 · 내 점수 <b style="color:#ffe27a">' + fmt(S.wk.score) + '</b></p><div class="xscroll" id="rkbox"><p style="text-align:center">불러오는 중...</p></div>', 'xwide');
    const box = () => $('#rkbox', root); let A = window.HKAccount; for (let i = 0; i < 20 && !(A && A.topScores); i++) { await new Promise(r => setTimeout(r, 250)); A = window.HKAccount; }
    if (!box()) return;
    if (!A || !A.topScores || A.disabled) { box().innerHTML = '<p style="text-align:center">온라인 순위표에 연결되지 않았어요.<br>hankuk-in.com 에서 열면 순위가 보여요.</p>'; return; }
    const bid = 'kzombi-' + S.wk.key;
    if (A.user && S.wk.score > 0) { try { await A.submitScore(bid, S.wk.score, accName()); } catch (e) {} }
    let arr = []; try { arr = await A.topScores(bid, 50); } catch (e) { if (box()) box().innerHTML = '<p style="text-align:center">순위를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>'; return; }
    if (!box()) return; const me = A.user && A.user.uid;
    box().innerHTML = (arr.length ? arr.map((e, i) => '<div class="xrk' + (e.uid === me || e.id === me ? ' me' : '') + '"><b class="stroke-s">' + (i + 1) + '</b><span class="stroke-s">' + String(e.name || '처용').replace(/[<>&]/g, '') + '</span><em class="stroke-s">' + fmt(e.score || 0) + '</em></div>').join('') : '<p style="text-align:center">아직 이번 주 기록이 없어요. 첫 번째가 되어 보세요!</p>') +
      (A.user ? '' : '<div class="xgoogle" data-act="gLogin"><i class="g"></i>구글로 로그인하고 내 점수 올리기</div>');
  }
  /* ---------------- 친구 · 문파 (HANKUKIN 계정 Firestore) ----------------
     새 컬렉션 없이 이미 열려 있는 두 곳만 쓴다.
     - leaderboards/{보드}/entries/{내 uid} : 내 문서만 쓰고 누구나 읽는다. 필드는 {name, score, at}만.
     - unique/{키} : 먼저 만든 사람이 영구 소유 (친구 코드, 문파 이름)
     보드 이름 약속 (kz = K Zombi)
       kzp                 내 공개 정보: name=이름, score=레벨*1e6+전투력, at=마지막 접속
       kzf-{상대uid}       친구 신청/수락: 내가 상대 보드에 한 줄 (score 1=신청, 2=수락)
       kzg-{상대uid}-{날}  횃불 선물: 내가 상대에게 오늘 보낸 선물
       kzguilds            문파 목록: 문주가 씀. name=문파이름, score=문양*1000+인원 (0=해산)
       kzgm-{문파}         문파원: 내가 씀. score=레벨*1e6+전투력 (0=탈퇴)
       kzgk-{문파}-{uid}   강퇴 표시: 문주가 씀
       kzga-{문파}-{날}    문파 출석
       kzgw-{주}           문파 주간 공헌: name=문파이름, score=그 주 처치 수 → 문파별로 합쳐 순위 */
  const GEMB = ['龍', '虎', '鳳', '龜', '劍', '月', '火', '山'];
  const FB = { db: null, fs: null };
  async function fbDb() {
    if (FB.db) return FB;
    const appM = await import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app.js');
    const fsM = await import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-firestore.js');
    const app = appM.getApps()[0]; if (!app) throw new Error('noapp');
    FB.fs = fsM; FB.db = fsM.getFirestore(app); return FB;
  }
  const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, '');
  const dayKey = () => today();
  const nm20 = s => String(s || '처용').replace(/[|<>&"]/g, '').slice(0, 20);
  async function putEntry(board, name, score) {
    const u = accUser(); if (!u) throw new Error('login');
    const { fs: F, db } = await fbDb();
    await F.setDoc(F.doc(db, 'leaderboards', board, 'entries', u.uid), { name: nm20(name), score: Math.max(0, Math.min(99999999, Math.floor(score) || 0)), at: Date.now() });
  }
  async function getEntry(board, uid) { if (!uid) return null; const { fs: F, db } = await fbDb(); const s = await F.getDoc(F.doc(db, 'leaderboards', board, 'entries', uid)); return s.exists() ? Object.assign({ id: uid }, s.data()) : null; }
  async function listBoard(board, n) { const { fs: F, db } = await fbDb(); const qs = await F.getDocs(F.query(F.collection(db, 'leaderboards', board, 'entries'), F.limit(n || 100))); const out = []; qs.forEach(d => out.push(Object.assign({ id: d.id }, d.data()))); return out; }
  const myScoreVal = () => { const st = stats(); return S.lv * 1e6 + Math.min(999999, Math.round(st.power)); };
  const lvOf = sc => Math.floor((sc || 0) / 1e6), pwOf = sc => (sc || 0) % 1e6;
  const ago = t => { if (!t) return '-'; const m = Math.floor((Date.now() - t) / 60000); return m < 5 ? '접속 중' : m < 60 ? m + '분 전' : m < 1440 ? Math.floor(m / 60) + '시간 전' : Math.floor(m / 1440) + '일 전'; };
  let socialErr = '';
  async function socialReady(depth) {
    if (!accOnline()) return 'offline'; const u = accUser(); if (!u) return 'login';
    S.fr = S.fr || { list: {}, rej: {}, sent: {}, gotDay: '', gotN: 0, got: {} };
    try {
      await putEntry('kzp', accName(), myScoreVal());
      if (S.codeOk && S.codeOk !== u.uid) { S.codeOk = null; S.myCode = Math.random().toString(36).slice(2, 8).toUpperCase(); }
      if (!S.codeOk) { for (let i = 0; i < 4; i++) { const r = await window.HKAccount.claimUnique('kzcode-' + S.myCode, { g: 'kzombi' }); if (r.ok) { S.codeOk = u.uid; break; } S.myCode = Math.random().toString(36).slice(2, 8).toUpperCase(); } save(); }
      return 'ok';
    } catch (e) { socialErr = String(e && e.code || e); console.warn('[social]', e); return 'err'; }
  }
  const loginBox = what => '<div class="xsoon box"><b class="stroke-s">로그인이 필요해요</b><p>구글 로그인하면 ' + what + '</p></div><div class="xgoogle" data-act="gLogin"><i class="g"></i>구글로 가입·로그인</div>';
  const offBox = '<div class="xsoon box"><b class="stroke-s">온라인 연결 안 됨</b><p>hankuk-in.com 에서 열면 친구·문파를 쓸 수 있어요.</p></div>';
  const errBox = () => '<div class="xsoon box"><b class="stroke-s">서버에 연결하지 못했어요</b><p>잠시 뒤 다시 열어 주세요. (' + esc(socialErr.replace('firestore/', '')) + ')</p></div>';

  /* ---- 친구 ---- */
  async function friendModal() {
    xinit();
    modal('<h3 class="stroke">친구</h3><div id="frbox"><p style="text-align:center">불러오는 중...</p></div>', 'xwide');
    const st = await socialReady(), box = () => $('#frbox', root); if (!box()) return;
    if (st === 'offline') { box().innerHTML = offBox; return; } if (st === 'login') { box().innerHTML = loginBox('친구 코드로 친구를 맺고 날마다 횃불을 주고받을 수 있어요.'); return; } if (st === 'err') { box().innerHTML = errBox(); return; }
    const me = accUser().uid, d = dayKey(); if (S.fr.gotDay !== d) { S.fr.gotDay = d; S.fr.gotN = 0; S.fr.got = {}; }
    let inbox = []; try { inbox = await listBoard('kzf-' + me, 100); } catch (e) { socialErr = String(e.code || e); box().innerHTML = errBox(); return; }
    /* 상대가 내 보드에 남긴 줄: 신청(1) 또는 수락(2) */
    for (const r of inbox) if (r.score === 2 && S.fr.sent[r.id]) { S.fr.list[r.id] = 1; delete S.fr.sent[r.id]; }
    const reqs = inbox.filter(r => r.score === 1 && !S.fr.list[r.id] && !S.fr.rej[r.id]);
    const ids = Object.keys(S.fr.list).slice(0, 30); save();
    const prof = {}, gifts = {}; await Promise.all(ids.map(async id => { try { prof[id] = await getEntry('kzp', id); } catch (e) {} try { gifts[id] = await getEntry('kzg-' + me + '-' + d, id); } catch (e) {} }));
    if (!box()) return;
    const giftSent = S.fr.giftDay === d ? S.fr.giftTo || {} : {};
    const rows = ids.map(id => { const p = prof[id] || {}, g = gifts[id], got = S.fr.got[id];
      return '<div class="xfr box"><div class="xav stroke">' + esc((p.name || '?')[0]) + '</div><div class="xfi"><b class="stroke-s">' + esc(p.name || '알 수 없음') + '</b><small>레벨 ' + lvOf(p.score) + ' · 전투력 ' + fmt(pwOf(p.score)) + ' · ' + ago(p.at) + '</small></div>' +
        '<div class="xfb">' + (g && !got ? '<div class="btn y sm" data-act="frTake" data-v="' + id + '">🔥 받기</div>' : '') + (giftSent[id] ? '<div class="btn b sm dis">보냄</div>' : '<div class="btn g sm" data-act="frGift" data-v="' + id + '">🔥 보내기</div>') + '</div></div>'; }).join('');
    box().innerHTML = '<div class="box xmycode"><span>내 친구 코드</span><b class="stroke" style="color:#ffe27a">' + S.myCode + '</b></div>' +
      '<div class="row xfadd"><input id="frIn" class="xcpn" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="친구 코드 6자리"><div class="btn p" data-act="frAdd">신청</div></div>' +
      (reqs.length ? '<div class="sect stroke-s">받은 신청 ' + reqs.length + '</div>' + reqs.map(r => '<div class="xfr box"><div class="xav stroke">' + esc((r.name || '?')[0]) + '</div><div class="xfi"><b class="stroke-s">' + esc(r.name) + '</b><small>' + ago(r.at) + '</small></div><div class="xfb"><div class="btn g sm" data-act="frOk" data-v="' + r.id + '">수락</div><div class="btn r sm" data-act="frNo" data-v="' + r.id + '">거절</div></div></div>').join('') : '') +
      '<div class="sect stroke-s">친구 ' + ids.length + '/30 · 오늘 받은 횃불 ' + S.fr.gotN + '/10</div><div class="xscroll xfrl">' + (rows || '<p style="text-align:center">아직 친구가 없어요. 친구 코드를 주고받아 보세요!</p>') + '</div>';
  }
  async function frAct(a, v) {
    const me = accUser() && accUser().uid; if (!me) return;
    try {
      if (a === 'frAdd') {
        const code = (($('#frIn', root) || {}).value || '').trim().toUpperCase(); if (code.length < 4) { toast('친구 코드를 넣어 주세요'); return; }
        if (code === S.myCode) { toast('내 코드예요'); return; }
        const u2 = await window.HKAccount.getUnique('kzcode-' + code); if (!u2 || !u2.uid) { toast('없는 친구 코드예요'); return; }
        if (u2.uid === me) { toast('내 코드예요'); return; }
        if (S.fr.list[u2.uid]) { toast('이미 친구예요'); return; } if (Object.keys(S.fr.list).length >= 30) { toast('친구는 30명까지예요'); return; }
        const back = await getEntry('kzf-' + me, u2.uid);   /* 상대가 먼저 나에게 신청했으면 바로 친구 */
        await putEntry('kzf-' + u2.uid, accName(), back ? 2 : 1);
        if (back) { S.fr.list[u2.uid] = 1; toast('친구가 되었어요!'); } else { S.fr.sent[u2.uid] = 1; toast('친구 신청을 보냈어요'); }
      } else if (a === 'frOk') { if (Object.keys(S.fr.list).length >= 30) { toast('친구는 30명까지예요'); return; } await putEntry('kzf-' + v, accName(), 2); S.fr.list[v] = 1; toast('친구가 되었어요!'); }
      else if (a === 'frNo') { S.fr.rej[v] = 1; toast('신청을 거절했어요'); }
      else if (a === 'frGift') { const d = dayKey(); await putEntry('kzg-' + v + '-' + d, accName(), 1); if (S.fr.giftDay !== d) { S.fr.giftDay = d; S.fr.giftTo = {}; } S.fr.giftTo[v] = 1; toast('횃불을 선물했어요'); }
      else if (a === 'frTake') { if (S.fr.gotN >= 10) { toast('오늘은 10개까지 받을 수 있어요'); return; } S.fr.got[v] = 1; S.fr.gotN++; S.torch += 1; toast('횃불 +1'); }
      save(); friendModal(); refresh();
    } catch (e) { console.warn(e); toast('실패했어요: ' + String(e && e.code || e).replace('firestore/', '')); }
  }

  /* ---- 문파 ---- */
  const GCOST = 5000;
  const gidOf = n => String(n).trim().replace(/\s+/g, ' ').replace(/[\/|<>&"#?.\[\]*~]/g, '').slice(0, 12);
  async function guildMembers(g) {
    const rows = (await listBoard('kzgm-' + g.id, 60)).filter(r => r.score > 0);
    const kicked = {}; await Promise.all(rows.map(async r => { if (r.id === g.owner) return; try { if (await getEntry('kzgk-' + g.id + '-' + r.id, g.owner)) kicked[r.id] = 1; } catch (e) {} }));
    return rows.filter(r => !kicked[r.id]);
  }
  let gTab = 'mine';
  async function guildModal(tab) {
    xinit(); if (tab) gTab = tab;
    modal('<h3 class="stroke">문파</h3><div id="gdbox"><p style="text-align:center">불러오는 중...</p></div>', 'xwide');
    const st = await socialReady(), box = () => $('#gdbox', root); if (!box()) return;
    if (st === 'offline') { box().innerHTML = offBox; return; } if (st === 'login') { box().innerHTML = loginBox('문파를 세우거나 들어가 문파원과 함께 출석 보상과 주간 순위를 겨룰 수 있어요.'); return; } if (st === 'err') { box().innerHTML = errBox(); return; }
    const me = accUser().uid;
    try {
      if (S.guild) {
        if (S.guild.owner !== me && await getEntry('kzgk-' + S.guild.id + '-' + me, S.guild.owner)) { toast('문파에서 내보내졌어요'); S.guild = null; save(); return guildModal('find'); }
        if (S.guild.owner !== me) { const gl = await getEntry('kzguilds', S.guild.owner); if (gl && gl.score === 0) { toast('문파가 해산되었어요'); S.guild = null; save(); return guildModal('find'); } }
        if (S.guild) { await putEntry('kzgm-' + S.guild.id, accName(), myScoreVal()); await putEntry('kzgw-' + S.wk.key, S.guild.id, S.wk.kills || 0); }
      }
      if (!S.guild || gTab !== 'mine') {
        const all = (await listBoard('kzguilds', 200)).filter(g => g.score > 0);
        const q = gTab === 'find' ? (S.gq || '') : '';
        const list = all.filter(g => !q || String(g.name).includes(q)).sort((a, b) => (b.score % 1000) - (a.score % 1000)).slice(0, 40);
        let rank = [];
        if (gTab === 'rank') { const wk = await listBoard('kzgw-' + S.wk.key, 500), sum = {}; for (const r of wk) if (all.some(g => g.name === r.name)) sum[r.name] = (sum[r.name] || 0) + (r.score || 0); rank = Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 20); }
        if (!box()) return;
        const tabs = '<div class="xgtabs">' + (S.guild ? '<div class="btn b sm" data-act="gTab" data-v="mine">내 문파</div>' : '') + '<div class="btn ' + (gTab === 'rank' ? 'b' : 'p') + ' sm" data-act="gTab" data-v="find">문파 찾기</div><div class="btn ' + (gTab === 'rank' ? 'p' : 'b') + ' sm" data-act="gTab" data-v="rank">주간 순위</div></div>';
        if (gTab === 'rank') {
          box().innerHTML = tabs + '<p style="text-align:center">이번 주(' + S.wk.key + ') 문파원이 물리친 좀비 수 합계</p><div class="xscroll xfrl">' + (rank.length ? rank.map(([n, v], i) => { const g = all.find(x => x.name === n); return '<div class="xrk' + (S.guild && S.guild.id === n ? ' me' : '') + '"><b class="stroke-s">' + (i + 1) + '</b><span class="stroke-s">' + (g ? '<i class="xemb sm">' + GEMB[Math.floor(g.score / 1000) % GEMB.length] + '</i> ' : '') + esc(n) + '</span><em class="stroke-s">' + fmt(v) + '</em></div>'; }).join('') : '<p style="text-align:center">이번 주 문파 기록이 아직 없어요</p>') + '</div>';
          return;
        }
        box().innerHTML = tabs + '<div class="row xfadd"><input id="gqIn" class="xcpn" maxlength="12" autocomplete="off" placeholder="문파 이름 검색" value="' + esc(q) + '"><div class="btn p" data-act="gFind">검색</div></div>' +
          '<div class="xscroll xfrl">' + (list.length ? list.map(g => '<div class="xfr box"><i class="xemb">' + GEMB[Math.floor(g.score / 1000) % GEMB.length] + '</i><div class="xfi"><b class="stroke-s">' + esc(g.name) + '</b><small>문파원 ' + (g.score % 1000) + '/20 · ' + ago(g.at) + '</small></div><div class="xfb">' + (S.guild ? '' : '<div class="btn g sm" data-act="gJoin" data-v="' + esc(g.name) + '|' + g.id + '">가입</div>') + '</div></div>').join('') : '<p style="text-align:center">문파가 없어요. 직접 세워 보세요!</p>') + '</div>' +
          (S.guild ? '' : '<div class="sect stroke-s">문파 세우기 (엽전 ' + fmt(GCOST) + ')</div><div class="xembs">' + GEMB.map((e, i) => '<i class="xemb' + ((S.gemb | 0) === i ? ' on' : '') + '" data-act="gEmb" data-v="' + i + '">' + e + '</i>').join('') + '</div><div class="row xfadd"><input id="gnIn" class="xcpn" maxlength="12" autocomplete="off" placeholder="문파 이름 (2~12자)"><div class="btn y" data-act="gMake">세우기</div></div>');
        return;
      }
      /* 내 문파 */
      const g = S.guild, mem = await guildMembers(g), d = dayKey(), att = await listBoard('kzga-' + g.id + '-' + d, 60), attIds = new Set(att.map(x => x.id).filter(id => mem.some(m => m.id === id)));
      const wk = (await listBoard('kzgw-' + S.wk.key, 500)).filter(r => r.name === g.id && mem.some(m => m.id === r.id)), wsum = wk.reduce((s, r) => s + (r.score || 0), 0);
      if (g.owner === me) { try { await putEntry('kzguilds', g.id, (g.emb | 0) * 1000 + Math.min(20, mem.length)); } catch (e) {} }
      if (!box()) return;
      const did = attIds.has(me), claimed = S.gAttGot === d, n = attIds.size;
      box().innerHTML = '<div class="xgtabs"><div class="btn p sm">내 문파</div><div class="btn b sm" data-act="gTab" data-v="find">문파 찾기</div><div class="btn b sm" data-act="gTab" data-v="rank">주간 순위</div></div>' +
        '<div class="box xghd"><i class="xemb big">' + GEMB[(g.emb | 0) % GEMB.length] + '</i><div><b class="stroke" style="font-size:30px;color:#ffe27a">' + esc(g.id) + '</b><small>문파원 ' + mem.length + '/20 · 이번 주 공헌 ' + fmt(wsum) + '마리</small></div></div>' +
        '<div class="box xgatt"><div><b class="stroke-s">문파 출석 ' + n + '/' + mem.length + '</b><small>출석한 문파원이 많을수록 모두의 보상이 커져요 (엽전 200×출석 인원, 5명 이상이면 옥 20 추가)</small></div>' +
        (!did ? '<div class="btn y" data-act="gAtt">출석</div>' : claimed ? '<div class="btn b dis">받음</div>' : '<div class="btn g" data-act="gAttGet">보상 받기</div>') + '</div>' +
        '<div class="sect stroke-s">문파원</div><div class="xscroll xfrl">' + mem.sort((x, y) => y.score - x.score).map(m => { const w = wk.find(r => r.id === m.id);
          return '<div class="xfr box"><div class="xav stroke">' + esc((m.name || '?')[0]) + '</div><div class="xfi"><b class="stroke-s">' + esc(m.name) + (m.id === g.owner ? ' <span class="xboss">문주</span>' : '') + (attIds.has(m.id) ? ' ✔' : '') + '</b><small>레벨 ' + lvOf(m.score) + ' · 전투력 ' + fmt(pwOf(m.score)) + ' · 이번 주 ' + fmt(w ? w.score : 0) + '마리 · ' + ago(m.at) + '</small></div>' +
            '<div class="xfb">' + (g.owner === me && m.id !== me ? '<div class="btn r sm" data-act="gKick" data-v="' + m.id + '">강퇴</div>' : '') + '</div></div>'; }).join('') + '</div>' +
        '<div class="row"><div class="btn r" data-act="gLeave">' + (g.owner === me ? '문파 해산' : '탈퇴') + '</div></div>';
    } catch (e) { socialErr = String(e && e.code || e); console.warn('[guild]', e); if (box()) box().innerHTML = errBox(); }
  }
  async function gAct(a, v) {
    const me = accUser() && accUser().uid; if (!me) return;
    try {
      if (a === 'gTab') { guildModal(v); return; }
      if (a === 'gFind') { S.gq = (($('#gqIn', root) || {}).value || '').trim(); guildModal('find'); return; }
      if (a === 'gEmb') { S.gemb = +v; root.querySelectorAll('.xembs .xemb').forEach((e, i) => e.classList.toggle('on', i === +v)); return; }
      if (a === 'gMake') {
        const id = gidOf(($('#gnIn', root) || {}).value || ''); if (id.length < 2) { toast('문파 이름은 2~12자예요'); return; }
        if (S.gold < GCOST) { toast('엽전이 모자라요'); return; }
        const r = await window.HKAccount.claimUnique('kzguild-' + id, { g: 'kzombi', name: id }); if (!r.ok) { toast('이미 있는 문파 이름이에요'); return; }
        S.gold -= GCOST; S.guild = { id, owner: me, emb: S.gemb | 0 }; save();
        await putEntry('kzguilds', id, (S.gemb | 0) * 1000 + 1); await putEntry('kzgm-' + id, accName(), myScoreVal());
        toast('문파 「' + id + '」를 세웠어요!'); guildModal('mine'); refresh(); return;
      }
      if (a === 'gJoin') {
        const [id, owner] = String(v).split('|'); const mem = (await listBoard('kzgm-' + id, 60)).filter(r => r.score > 0); if (mem.length >= 20) { toast('문파원이 가득 찼어요'); return; }
        if (await getEntry('kzgk-' + id + '-' + me, owner)) { toast('이 문파에는 들어갈 수 없어요'); return; }
        const gl = await getEntry('kzguilds', owner); S.guild = { id, owner, emb: gl ? Math.floor(gl.score / 1000) : 0 }; save();
        await putEntry('kzgm-' + id, accName(), myScoreVal()); toast('「' + id + '」에 들어왔어요!'); guildModal('mine'); return;
      }
      if (a === 'gAtt') { await putEntry('kzga-' + S.guild.id + '-' + dayKey(), accName(), 1); toast('문파 출석!'); guildModal('mine'); return; }
      if (a === 'gAttGet') { if (S.gAttGot === dayKey()) return; const att = await listBoard('kzga-' + S.guild.id + '-' + dayKey(), 60), n = Math.max(1, Math.min(20, att.length)); S.gold += 200 * n; if (n >= 5) S.jade += 20; S.gAttGot = dayKey(); save(); toast('문파 출석 보상: 엽전 ' + fmt(200 * n) + (n >= 5 ? ', 옥 20' : '')); guildModal('mine'); refresh(); return; }
      if (a === 'gKick') { if (!confirm('이 문파원을 내보낼까요?')) return; await putEntry('kzgk-' + S.guild.id + '-' + v, 'kick', 1); toast('내보냈어요'); guildModal('mine'); return; }
      if (a === 'gLeave') {
        const boss = S.guild.owner === me; if (!confirm(boss ? '문파를 해산할까요? 문파 이름은 다시 쓸 수 없어요.' : '문파에서 나갈까요?')) return;
        await putEntry('kzgm-' + S.guild.id, accName(), 0); if (boss) await putEntry('kzguilds', S.guild.id, 0);
        S.guild = null; save(); toast(boss ? '문파를 해산했어요' : '문파에서 나왔어요'); guildModal('find'); return;
      }
    } catch (e) { console.warn(e); toast('실패했어요: ' + String(e && e.code || e).replace('firestore/', '')); }
  }
  /* 온라인 계정(hankuk-in.com 에서만): 순위표용 */
  (function loadAccount() { try { if (!/hankuk-in\.com$/.test(location.hostname) || document.querySelector('script[src*="/game/account.js"]')) return; const s = document.createElement('script'); s.type = 'module'; s.src = '/game/account.js'; s.dataset.game = 'kzombi'; s.dataset.prefix = 'jz_save'; document.head.appendChild(s); } catch (e) {} })();


  /* ---------------- 계정: HANKUKIN PLAY 공용 계정(Anibrix·ASCEND와 같은 Firebase) + 구글 로그인 ----------------
     - 로그인 안 해도 지금처럼 이 기기(localStorage jz_save)에 저장된다
     - 로그인하면 account-core가 jz_save 를 계정(users/{uid}/saves)에 올리고, 다른 기기에서 내려받는다
     - 공용 계정창은 이메일만 있어서, 구글 로그인은 같은 Firebase 앱(같은 모듈 주소)에 직접 붙인다 */
  const FB_VER = '10.12.2';
  const accUser = () => { try { const A = window.HKAccount; return A && !A.disabled ? A.user : null; } catch (e) { return null; } };
  const accName = () => { const u = accUser(); return (u && (u.displayName || (u.email || '').split('@')[0])) || S.name; };
  const accOnline = () => !!(window.HKAccount && !window.HKAccount.disabled);
  async function googleLogin() {
    if (!accOnline()) { toast('hankuk-in.com 에서 열어야 로그인할 수 있어요'); return; }
    try {
      const appM = await import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app.js');
      const authM = await import('https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-auth.js');
      const app = appM.getApps()[0]; if (!app) { toast('계정 연결을 준비 중이에요. 잠시 뒤 다시 눌러 주세요'); return; }
      const auth = authM.getAuth(app), pv = new authM.GoogleAuthProvider(); pv.setCustomParameters({ prompt: 'select_account' });
      try { await authM.signInWithPopup(auth, pv); toast('구글 계정으로 로그인했어요'); }
      catch (e) {
        const c = String(e && e.code || e);
        if (/popup-blocked|operation-not-supported/.test(c)) { await authM.signInWithRedirect(auth, pv); return; }
        if (/popup-closed|cancelled-popup/.test(c)) return;
        if (/unauthorized-domain/.test(c)) toast('이 주소에서는 구글 로그인이 아직 허용되지 않았어요');
        else if (/operation-not-allowed/.test(c)) toast('구글 로그인이 아직 켜지지 않았어요 (관리자 설정 필요)');
        else if (/account-exists-with-different-credential/.test(c)) toast('이 이메일은 이메일 로그인으로 가입돼 있어요. 이메일로 로그인해 주세요');
        else toast('로그인하지 못했어요: ' + c.replace('auth/', ''));
        console.warn('[google login]', e);
      }
    } catch (e) { console.warn(e); toast('로그인 모듈을 불러오지 못했어요'); }
  }
  function accountBox() {
    const u = accUser();
    if (!accOnline()) return '<div class="xacc box"><b class="stroke-s">계정</b><p>지금은 이 기기에만 저장돼요. hankuk-in.com 에서 열면 구글 계정으로 저장할 수 있어요.</p></div>';
    if (u) return '<div class="xacc box"><b class="stroke-s">☁ ' + String(accName()).replace(/[<>&]/g, '') + '</b><p>' + String(u.email || '').replace(/[<>&]/g, '') + '<br>엽전·장비·영웅 기록이 계정에 저장되고, 다른 기기에서 로그인하면 이어서 할 수 있어요.</p><div class="row"><div class="btn b" data-act="accSave">지금 저장</div><div class="btn r" data-act="accOut">로그아웃</div></div></div>';
    return '<div class="xacc box"><b class="stroke-s">계정</b><p>로그인하지 않아도 이 기기에 저장돼요. 로그인하면 다른 기기에서도 이어서 할 수 있어요. (Anibrix·ASCEND와 같은 계정)</p>' +
      '<div class="xgoogle" data-act="gLogin"><i class="g"></i>구글로 가입·로그인</div><div class="row"><div class="btn b" data-act="eLogin" style="min-width:260px">이메일로 로그인</div></div></div>';
  }
  (function watchAcc() { let n = 0; const t = setInterval(() => { const A = window.HKAccount; if (A && A.onChange) { clearInterval(t); A.onChange(() => { try { if ($('#s-lobby') && $('#s-lobby').classList.contains('on') && !$('#gacha', root)) { const m = $('#mdl', root), set = m && m.querySelector('.xacc'); renderLobby(); if (set) settingsModal(); } } catch (e) {} }); } else if (++n > 80) clearInterval(t); }, 250); })();

  (function preItems() { setTimeout(() => { const L = []; for (const s of SLOTS) for (let g = 0; g < 6; g++) L.push(s.id === 'weapon' ? 'weapon_g' + g : s.id + '_g' + g); for (const w of ['nogi', 'jochong', 'seungja']) L.push('w_' + w); for (const k in SG) L.push(SG[k].img); window.__itemImgs = L.map(n => { const i = new Image(); i.src = 'img/items/' + n + '.webp'; return i; }); }, 1500); })();
  /* ---------------- 누르기 처리 ---------------- */
  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act, v = t.dataset.v;
    switch (a) {
      case 'enter': music('bgm_lobby'); tab = 'home'; renderLobby(); break;
      case 'tab': tab = v; closeModal(); renderLobby(); break;
      case 'goShop': tab = 'shop'; renderLobby(); break;
      case 'buyTorch': modal('<h3 class="stroke">횃불</h3><p>챕터에 들어갈 때 5개를 써요. 6분마다 1개씩 차오르고 최대 30개예요.</p><div class="row"><div class="btn r" data-act="buy" data-v="torch30">옥 40으로 30개</div></div>'); break;
      case 'close': closeModal(); break;
      case 'pass': passModal(); break;
      case 'passGet': { xinit(); const row = v[0], i = +v.slice(1), lv = Math.floor(S.pass.xp / PASS_XP); if (lv <= i) break; if (row === 'f' && !S.pass.f[i]) { const [k, n] = passFree(i); give(k, n); S.pass.f[i] = 1; toast('패스 선물을 받았어요'); } else if (row === 'p' && S.pass.paid && !S.pass.p[i]) { const [k, n] = passPaid(i); give(k, n); S.pass.p[i] = 1; toast('황금 패스 선물을 받았어요'); } save(); passModal(); break; }
      case 'passBuy': toast('결제는 준비 중이에요. 곧 열려요!'); break;
      case 'ach': achModal(); break;
      case 'achGet': { xinit(); const a = ACH.find(x => x.id === v); if (!a || S.ach[a.id] || a.v() < a.need) break; S.ach[a.id] = 1; give(a.r[0], a.r[1]); save(); toast('업적 보상을 받았어요'); achModal(); break; }
      case 'codex': codexModal(); break;
      case 'cdTab': cdTab = v; codexModal(); break;
      case 'cdGet': { xinit(); const x = codexItems().find(o => o.k === v); if (!x || !x.own || S.codex[cdTab][v]) break; S.codex[cdTab][v] = 1; S.jade += x.r; save(); toast('도감 보상 옥 ' + x.r); codexModal(); break; }
      case 'event': evModal(); break;
      case 'evGet': { xinit(); if (S.ev.got >= 7 || S.ev.last === today()) break; const [k, n] = EVR[S.ev.got]; give(k, n); S.ev.got++; S.ev.last = today(); save(); toast('축제 선물을 받았어요'); evModal(); break; }
      case 'rank': rankModal(); break;
      case 'rkLogin': try { window.HKAccount && window.HKAccount.openLogin && window.HKAccount.openLogin(); } catch (e) {} break;
      case 'friend': friendModal(); break;
      case 'frAdd': case 'frOk': case 'frNo': case 'frGift': case 'frTake': frAct(a, v); break;
      case 'gTab': case 'gFind': case 'gEmb': case 'gMake': case 'gJoin': case 'gAtt': case 'gAttGet': case 'gKick': case 'gLeave': gAct(a, v); break;
      case 'gLogin': googleLogin(); break;
      case 'eLogin': try { window.HKAccount.openLogin(); } catch (e) {} break;
      case 'accOut': try { if (confirm('로그아웃할까요? 이 기기 저장은 그대로 남아요.')) window.HKAccount.logout(); } catch (e) {} closeModal(); break;
      case 'accSave': try { save(); window.HKAccount.saveNow(); toast('계정에 저장했어요'); } catch (e) {} break;
      case 'acc': settingsModal(); break;
      case 'guild': guildModal(); break;
      case 'mode': { const p = v.split(':'); S.nextMode = p[0]; S.modeCh = +p[1]; startBattle(+p[1]); break; }
      case 'chap': S.sel = Math.max(1, Math.min(S.chap, S.sel + (+v))); refresh(); break;
      case 'map': renderMap(); break;
      case 'lobby': renderLobby(); break;
      case 'node': { const n = +v; if (n > S.chap) { toast('앞 챕터를 먼저 깨야 해요'); break; } S.sel = n; save(); chapModal(n); break; }
      case 'chest': e.stopPropagation(); S.chest[v] = 1; S.jade += 50; S.stone += 5; save(); toast('보상 상자: 옥 50, 신력석 5'); renderMap(); break;
      case 'start': startBattle(S.sel); break;
      case 'go': startBattle(+v); break;
      case 'patrol': patrolModal(); break;
      case 'patrolGet': { const p = patrol(); S.gold += p.gold; S.stone += p.stone; S.jade += p.jade; const up = addExp(p.exp); S.patrolT = now(); closeModal(); toast('엽전 ' + fmt(p.gold) + ' 받았어요' + (up ? ' · 레벨 올라감!' : '')); refresh(); break; }
      case 'patrolFast': { if (S.torch < 5) { toast('횃불이 모자라요'); break; } S.torch -= 5; const c = Math.max(1, S.chap); S.gold += 480 * c; S.stone += 3; addExp(80 * c); closeModal(); toast('빠른 순찰: 엽전 ' + fmt(480 * c)); refresh(); break; }
      case 'att': attModal(); break;
      case 'attGet': { const R = attModal.R, k = S.att % 7, [i, val] = R[k]; if (i === 'coin') S.gold += val; else if (i === 'jade') S.jade += val; else S.stone += val; S.att++; S.attDay = today(); closeModal(); toast(k + 1 + '일째 출석 보상을 받았어요'); refresh(); break; }
      case 'quest': questModal(); break;
      case 'qGet': { const q = QUESTS.find(x => x.id === v); S.quests.got = S.quests.got || {}; S.quests.got[v] = 1; S.jade += q.r; save(); questModal(); refresh(); break; }
      case 'mailbox': mailModal(); break;
      case 'mailGet': S.mail = true; S.jade += 500; S.gold += 5000; S.stone += 30; closeModal(); toast('첫 선물을 받았어요'); refresh(); break;
      case 'settings': settingsModal(); break;
      case 'coupon': couponModal(); break;
      case 'cpnUse': useCoupon(); break;
      case 'toggleMusic': S.music = !S.music; save(); if (S.music) music('bgm_lobby'); else stopMusic(); settingsModal(); break;
      case 'reset': if (confirm('저장을 모두 지우고 처음부터 할까요?')) { localStorage.removeItem(KEY); load(); closeModal(); tab = 'home'; renderLobby(); } break;
      case 'profile': { const st = stats(); modal('<h3 class="stroke">처용</h3><p>레벨 ' + S.lv + ' (경험 ' + S.exp + '/' + needExp(S.lv) + ')</p><p>공격력 ' + fmt(st.atk) + ' · 체력 ' + fmt(st.hp) + ' · 전투력 ' + fmt(st.power) + '</p><p>깬 챕터 ' + (S.chap - 1) + ' · 도전 ' + S.plays + '번</p>' +
        '<div class="row"><div class="btn b" data-act="settings">설정</div><div class="btn p" data-act="coupon">쿠폰 입력</div></div>'); break; }
      case 'item': itemModal(+v); break;
      case 'equip': { const it = byUid(+v); S.equip[it.slot] = it.uid; closeModal(); refresh(); toast(itemName(it) + ' 착용'); break; }
      case 'itemUp': { const it = byUid(+v), cost = 150 * it.lv * (it.g + 1), pc = 1 + Math.floor(it.lv / 5); if (S.gold < cost || (S.plans[it.slot] || 0) < pc) { toast('엽전이나 ' + SLOT[it.slot].n + ' 도면이 모자라요'); break; } if (it.lv >= LV_CAP(it)) { toast('최대 레벨이에요. 합성으로 등급을 올리세요'); break; } S.gold -= cost; S.plans[it.slot] -= pc; it.lv++; S.quests.up = (S.quests.up || 0) + 1; xinit(); S.st.upg += 1; save(); itemModal(+v); renderLobby(); break; }
      case 'autoEq': for (const s of SLOTS) { const best = S.inv.filter(i => i.slot === s.id).sort((a, b) => itemVal(b) - itemVal(a))[0]; if (best) S.equip[s.id] = best.uid; } refresh(); toast('가장 좋은 장비를 입었어요'); break;
      case 'merge': { let made = 0;
        const free = it => !Object.values(S.equip).includes(it.uid);
        for (const s of SLOTS) for (let g = 0; g < 6; g++) {
          if (g < 4) { const keys = {}; for (const it of S.inv) if (it.slot === s.id && it.g === g && !it.sg && free(it)) { const k = (it.w || '') + (it.set || ''); (keys[k] = keys[k] || []).push(it); }
            for (const k in keys) { const pool = keys[k]; while (pool.length >= 3) { const use = pool.splice(0, 3); S.inv = S.inv.filter(i => !use.includes(i)); const n = mkItem(s.id, g + 1, use[0].w); n.set = use[0].set || n.set; n.lv = Math.max(...use.map(u => u.lv)); S.inv.push(n); made++; } } }
          else { let tgt; while ((tgt = S.inv.filter(i => i.slot === s.id && i.g === g && (g < 5 || (i.s || 0) < STAR_MAX(g))).sort((a, b) => (b.s || 0) - (a.s || 0) || b.lv - a.lv)[0])) { const fod = S.inv.filter(i => i !== tgt && i.slot === s.id && i.g === g && free(i) && !i.sg && (i.s || 0) === 0).slice(0, 2); if (fod.length < 2) break; S.inv = S.inv.filter(i => !fod.includes(i)); if ((tgt.s || 0) < STAR_MAX(g)) tgt.s = (tgt.s || 0) + 1; else { tgt.g = g + 1; tgt.s = 0; } made++; if (g === 5 && tgt.s >= STAR_MAX(5)) break; } }
        }
        refresh(); toast(made ? '합성 ' + made + '번 성공!' : '합성할 장비가 없어요'); break; }
      case 'salvage': { const it = byUid(+v); if (!it || Object.values(S.equip).includes(it.uid)) break; const pl = 2 + it.g * 3 + Math.floor(it.lv / 5); S.plans[it.slot] = (S.plans[it.slot] || 0) + pl; S.gold += 100 * (it.g + 1) + it.lv * 40; S.inv = S.inv.filter(i => i !== it); closeModal(); refresh(); toast(SLOT[it.slot].n + ' 도면 ' + pl + '개를 얻었어요'); break; }
      case 'comp': selComp = v; infoFold = false; renderLobby(); break;
      case 'infoFold': infoFold = v === '1'; renderLobby(); break;
      case 'team': { const i = S.team.indexOf(v); if (i >= 0) S.team.splice(i, 1); else { if (S.team.length >= 2) S.team.shift(); S.team.push(v); } refresh(); break; }
      case 'unteam': S.team = S.team.filter(x => x !== v); refresh(); break;
      case 'compUp': { const c = S.comps[v], lc = 300 * c.lv * (COMP[v].g + 1); if (S.gold < lc || c.lv >= c.star * 10) break; S.gold -= lc; c.lv++; refresh(); toast(COMP[v].n + ' 레벨 ' + c.lv); break; }
      case 'compStar': { const c = S.comps[v], sc = c.star * 10; if (c.sh < sc || c.star >= 5) break; c.sh -= sc; c.star++; refresh(); toast(COMP[v].n + ' 별 ' + c.star + '개!'); break; }
      case 'compUnlock': { const c = S.comps[v]; if (c.sh < 10) break; c.sh -= 10; c.own = true; refresh(); toast(COMP[v].n + '이(가) 함께해요!'); break; }
      case 'skUp': { const lv = S.skills[v], cost = lv * 15, gc = lv * 400; if (S.stone < cost || S.gold < gc || lv >= 5) break; S.stone -= cost; S.gold -= gc; S.skills[v] = lv + 1; refresh(); break; }
      case 'buy': {
        if (v === 'freeGold') { if (S.freeGold === today()) break; S.freeGold = today(); S.gold += 500; toast('엽전 500'); }
        else if (v === 'gold3k') { if (S.jade < 50) { toast('옥이 부족해요'); break; } S.jade -= 50; S.gold += 5000; toast('엽전 5,000'); }
        else if (v === 'stone20') { if (S.jade < 80) { toast('옥이 부족해요'); break; } S.jade -= 80; S.stone += 20; toast('신력석 20'); }
        else if (v === 'torch30') { if (S.jade < 40) { toast('옥이 부족해요'); break; } S.jade -= 40; S.torch = Math.min(99, S.torch + 30); toast('횃불 30'); closeModal(); }
        else if (v === 'jade300' || v === 'jade1k') { toast('결제는 준비 중이에요. 곧 열려요!'); break; }   /* 유료 상품: 결제가 붙기 전에는 지급하지 않는다 */
        refresh(); if ($('#s-map').classList.contains('on')) renderMap(); break;
      }
      case 'prob': probModal(v); break;
      case 'gacha': doGacha(v); break;
      case 'gclose': { const g = $('#gacha', root); if (g) g.remove(); refresh(); break; }
      case 'adx2': { if (!lastRw || lastRw.dbl) break; lastRw.dbl = true; S.gold += lastRw.gold; S.stone += lastRw.stone; save(); $('#rewl').innerHTML = rewHtml(lastRw); t.classList.add('dis'); toast('보상이 2배가 됐어요'); break; }
      case 'rok': tab = 'home'; renderLobby(); break;
    }
  }

  /* ---------------- 시작 ---------------- */
  function boot() {
    load(); dailyReset(); build();
    try { if (window.JZB && window.JZB.hide) window.JZB.hide(); else { const st = document.getElementById('stage'); if (st) st.style.visibility = 'hidden'; } } catch (e) {}
    renderTitle();
    // 시간 표시 갱신(횃불 타이머, 순찰 막대)
    setInterval(() => {
      if (!$('#s-lobby').classList.contains('on') || $('#mdl', root) || $('#gacha', root)) return;
      tickTorch(); const tv = $('#torchv'), tt = $('#torcht');
      if (tv) tv.textContent = S.torch + '/' + TORCH_MAX;
      if (tt) { const r = TORCH_SEC - Math.floor((now() - S.torchT) / 1000) % TORCH_SEC; tt.textContent = S.torch >= TORCH_MAX ? '가득' : String(Math.floor(r / 60)).padStart(2, '0') + ':' + String(r % 60).padStart(2, '0'); }
    }, 1000);
    // 첫 화면 음악은 첫 터치 때 (브라우저 규칙)
    const first = () => { if ($('#s-title').classList.contains('on')) music('bgm_title'); removeEventListener('pointerdown', first, true); };
    addEventListener('pointerdown', first, true);
    window.JZMeta = { show: () => { meta.classList.remove('off'); renderLobby(); }, onEnd, save: () => S, reset: () => { localStorage.removeItem(KEY); load(); } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
