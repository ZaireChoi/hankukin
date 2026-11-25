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
    { n: '영웅', c: '#e39bff' }, { n: '전설', c: '#ffd36b' }, { n: '유니크', c: '#4cff9a' }, { n: '신화', c: '#ff3a3a' }];
  /* 장비 개편(11-27): 등급은 7개로 끝. 긴 성장은 티어(T1~T10, 30장마다)·품질·강화·별로. 등급마다 나오는 장(1막 1~30, 악몽 2막 31~60 …) */
  const GATE = [1, 5, 15, 30, 60, 120, 200];
  const progCh = () => Math.max(1, (S.chap || 1) - 1, S.nm && S.nm.chap > 1 ? 30 + S.nm.chap - 1 : 0);
  const maxG = c => { let g = 0; for (let i = 0; i < GATE.length; i++) if (GATE[i] <= c) g = i; return g; };
  const curTier = c => Math.min(10, 1 + Math.floor(((c || progCh()) - 1) / 30));
  /* '가끔' 단계(사용자 11-27: 전설은 가끔 나와야): [등급, 시작장, 정식장, {box:우두머리 상자, gacha:뽑기, nem:숙적}] */
  const RARE = [[3, 15, 30, { box: 0.08 }], [4, 10, 30, { box: 0.02, nem: 0.05, gacha: 0.005 }], [4, 30, 60, { box: 0.04, nem: 0.05, gacha: 0.01 }], [5, 90, 120, { box: 0.015, nem: 0.02 }], [6, 160, 200, { nem: 0.01 }]];
  let RARE_HIT = null;
  function rareUp(g, c, kind) { for (const [rg, a, b, p] of RARE) if (c >= a && c < b && rg > g && Math.random() < (p[kind] || 0)) { g = rg; RARE_HIT = rg; } return g; }
  function rareShow(it) { if (!it || !RARE_HIT || it.g < 3) return; RARE_HIT = null; it.rare = 1; setTimeout(() => { try { toast('✨ ' + GR[it.g].n + ' 획득! · ' + itemName(it)); const b = document.createElement('div'); b.className = 'rarebeam g' + it.g; b.innerHTML = '<b>' + GR[it.g].n + ' 획득!</b><span>' + itemName(it) + '</span>'; document.body.appendChild(b); setTimeout(() => b.remove(), 2600); } catch (e) {} }, 300); }
  /* 부가 옵션 13종·고유 효과 15종: 전투에는 기존 fx 키로 넘긴다(afxSum) */
  const AFX = { atkP: ['공격력', 2, 6, '%'], hpP: ['체력', 3, 8, '%'], crit: ['치명 확률', 1, 4, '%'], critD: ['치명 피해', 5, 15, '%'], aspd: ['공격 속도', 2, 6, '%'], mspd: ['이동 속도', 2, 5, '%'], cdr: ['기술 대기 감소', 2, 6, '%'], towerP: ['시설 피해', 3, 9, '%'], heroP: ['영웅 피해', 3, 9, '%'], gold: ['엽전 획득', 4, 12, '%'], ls: ['피흡', 0.5, 2, '%'], eliteP: ['정예·우두머리 피해', 3, 9, '%'], dmgCut: ['받는 피해 감소', 1, 4, '%'] };
  const AFX_FX = { crit: ['crit10', 10], critD: ['critDmg30', 30], aspd: ['haste10', 10], mspd: ['speed10', 10], cdr: ['skillCd10', 10], towerP: ['build20', 20], heroP: ['compDmg30', 30], gold: ['coin30', 30], ls: ['ls', 1], eliteP: ['eliteDmg25', 25], dmgCut: ['dmgCut10', 10] };
  const UQ = { cheoyong: ['처용의 분노', '처치한 적이 폭발한다', { killBlast: 1 }], haechi: ['해치의 불씨', '쏘는 속도 +15%, 치명 피해 +30%', { haste15: 1, critDmg30: 1 }], jeoseung: ['저승사자의 낫', '체력 10% 아래 일반 적은 바로 쓰러진다', { execute: 1 }], cheolgap: ['철갑 반사', '가까이서 때린 적에게 피해를 돌려준다', { thorns: 1 }], okhwang: ['옥황의 축복', '5초마다 체력 3% 회복', { regen: 1 }], sabang: ['사방신의 가호', '체력 30% 아래 2초 무적', { lastStand: 1 }], sinmyeong: ['신명', '큰 기술 대기 -20%', { ultCd20: 1 }], janggun: ['장군의 기백', '시설 위력 +20%', { build20: 1 }], heuphyeol: ['흡혈 부적', '피흡 +3%', { ls: 3 }], baram: ['바람신', '이동 +10%, 10% 회피', { speed10: 1, dodge10: 1 }], geumdukkeobi: ['금두꺼비', '엽전 +60%', { coin30: 2 }], gwisin: ['귀신잡이', '정예·우두머리 피해 +50%', { eliteDmg25: 2 }], ssanggeom: ['쌍검무', '쏘는 속도 +25%', { haste10: 2.5 }], cheondung: ['천둥 부적', '치명 확률 +15%', { crit5: 3 }], dokkaebi: ['도깨비 방망이', '동료 피해 +40%', { compDmg30: 1.35 }] };
  function rollAffix(it) { const g = it.g || 0, n = [0, 1, 1 + (Math.random() < 0.5 ? 1 : 0), 2, 3, 3 + (Math.random() < 0.5 ? 1 : 0), 4][g], gm = [1, 1, 1.2, 1.4, 1.7, 2, 2.4][g], ks = Object.keys(AFX).sort(() => Math.random() - 0.5).slice(0, n); it.af = ks.map(k => { const A = AFX[k], v = (A[1] + Math.random() * (A[2] - A[1])) * gm; return [k, Math.round(v * 10) / 10]; }); const uk = Object.keys(UQ).sort(() => Math.random() - 0.5); it.uq = g >= 6 ? uk.slice(0, 2) : g === 5 ? uk.slice(0, 1) : g === 4 && Math.random() < 0.3 ? uk.slice(0, 1) : []; }
  function afxSum(eqList) { const fx = {}, add = (k, v) => { fx[k] = (fx[k] || 0) + v; }; for (const it of eqList || Object.values(S.equip).map(byUid).filter(Boolean)) { for (const [k, v] of (it.af || [])) if (AFX_FX[k]) add(AFX_FX[k][0], v / AFX_FX[k][1]); for (const u of (it.uq || [])) if (UQ[u]) for (const k in UQ[u][2]) add(k, UQ[u][2][k]); } return fx; }
  const afPct = (k) => { let s = 0; for (const it of Object.values(S.equip).map(byUid).filter(Boolean)) for (const [kk, v] of (it.af || [])) if (kk === k) s += v; return s; };
  function powerWith(it) { const old = S.equip[it.slot]; S.equip[it.slot] = it.uid; const st = stats(); S.equip[it.slot] = old; return st; }
  const afHtml = it => (it.af && it.af.length ? '<p style="font-size:18px;color:#9fe0ff">' + it.af.map(([k, v]) => AFX[k][0] + ' +' + v + AFX[k][3]).join(' · ') + '</p>' : '') + (it.uq && it.uq.length ? it.uq.map(u => '<p style="font-size:18px;color:' + (it.g >= 6 ? '#ff7a5a' : it.g === 5 ? '#4cff9a' : '#ffd36b') + '">★ ' + UQ[u][0] + ' · ' + UQ[u][1] + '</p>').join('') : '') + '<p style="font-size:16px;opacity:.75">품질 ' + (it.q || 100) + '% · T' + (it.t || 1) + '</p>';
  const GMUL = [1, 1.6, 2.6, 4.2, 7, 9.5, 12];
  const SLOTS = [
    { id: 'weapon', n: '무기', ic: 'bow', st: 'atk', base: 20, names: ['나무 활', '각궁', '흑각궁', '용각궁', '천궁', '청룡궁', '신궁'] },
    { id: 'hat', n: '갓', ic: 'hat', st: 'hp', base: 70, names: ['삿갓', '흑립', '옥로립', '주립', '금관립', '비취 금관립', '신령 갓'] },
    { id: 'robe', n: '도포', ic: 'robe', st: 'hp', base: 100, names: ['무명 도포', '비단 도포', '청 도포', '자색 도포', '금실 도포', '봉황 도포', '신선 도포'] },
    { id: 'arm', n: '토시', ic: 'arm', st: 'atk', base: 12, names: ['가죽 토시', '쇠 토시', '은 토시', '자개 토시', '금 토시', '비취 토시', '용 토시'] },
    { id: 'shoes', n: '신', ic: 'shoes', st: 'hp', base: 55, names: ['짚신', '미투리', '가죽신', '태사혜', '운혜', '청운혜', '구름신'] },
    { id: 'norigae', n: '노리개', ic: 'norigae', st: 'atk', base: 15, names: ['매듭 노리개', '호박 노리개', '산호 노리개', '비취 노리개', '금 노리개', '옥룡 노리개', '삼작 신물'] }];
  const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
  /* 영웅: g 는 등급 번호 (0 일반, 2 희귀, 3 영웅, 4 전설) */
  const COMPS = [
    { id: 'jangyeongsil', n: '장영실', g: 4, el: 'skGun', eln: '발명 · 화포', img: 'img/ui/hero_jangyeongsil.webp?v=4', role: '장치 설치', ult: '자격루의 종', desc: '조선 최고의 발명가예요. 작은 화포 장치를 세워 한동안 저절로 쏘게 해요. 큰 기술 자격루의 종은 아군 공격 속도를 크게 올려요. 화차와 짝이면 장치가 더 세고 오래가요.', bonus: 'atk' },
    { id: 'kimchungseon', n: '김충선', g: 4, el: 'sword', eln: '암살 · 왜검', img: 'img/ui/hero_kimchungseon.webp?v=4', role: '암살', ult: '귀순의 칼', desc: '임진왜란 때 조선에 귀화한 사무라이 사야가예요. 적진의 원거리·마법 좀비만 노려 뒤로 순간이동해 베어요. 큰 기술 귀순의 칼은 화면 안 원거리·마법 적을 차례로 벱니다.', bonus: 'atk' },
    { id: 'daejanggeum', n: '대장금', g: 4, el: 'tPower', eln: '치유 · 약선', img: 'img/ui/hero_daejanggeum.webp?v=4', role: '회복', ult: '어의의 탕약', desc: '조선 최초의 어의녀예요. 약재 주머니를 던지며 처용과 동료를 치유해요. 큰 기술 어의의 탕약은 사당과 시설을 크게 회복하고 받는 피해를 줄여요.', bonus: 'hp' },
    { id: 'jeonwoochi', n: '전우치', g: 4, el: 'skThunder', eln: '도술 · 검기', img: 'img/ui/hero_jeonwoochi.webp?v=5', role: '도술 검객', ult: '화중병', desc: '도술을 부리는 검객이에요. 칼을 휘둘러 적을 꿰뚫는 검기를 날려요. 큰 기술 화중병은 그림 속 먹물 병사 여섯을 불러내요.', bonus: 'atk' },
    { id: 'bari', n: '바리공주', g: 4, el: 'skGhost', eln: '혼령술', img: 'img/ui/hero_bari.webp?v=4', role: '혼령 소환', ult: '저승길 인도', desc: '저승길을 안내하는 무조신이에요. 곁에서 쓰러진 좀비의 혼을 인도해 잠시 아군 혼령으로 싸우게 해요.', bonus: 'atk' },
    { id: 'imugi', n: '이무기', g: 4, el: 'elFire', eln: '비행 · 불', img: 'img/ui/hero_imugi.webp?v=4', role: '비행 화염', ult: '승천', desc: '승천을 꿈꾸는 비룡이에요. 하늘을 날며 불길을 뿜어요. 큰 기술 승천은 날아오르며 불덩이 비를 쏟아요.', bonus: 'atk' },
    { id: 'sadaham', n: '화랑 사다함', g: 3, el: 'sword', eln: '근거리 · 검무', img: 'img/ui/hero_sadaham.webp?v=4', role: '근거리', ult: '화랑 검무', desc: '열다섯에 대가야를 친 신라 화랑이에요. 적 사이를 오가며 세 번 연달아 베어요.', bonus: 'atk' },
    { id: 'samyeong', n: '사명대사', g: 3, el: 'tPower', eln: '권법 · 승병', img: 'img/ui/hero_samyeong.webp?v=4', role: '권법', ult: '승병 봉기', desc: '임진왜란의 승병장이에요. 권법 연타로 적을 기절시키고, 큰 기술로 승병을 불러 앞을 막아요.', bonus: 'hp' },
    { id: 'yisunsin', n: '이순신', g: 4, el: 'skArrow', eln: '원거리 · 활', img: 'img/ui/hero_yisunsin.webp?v=4', role: '원거리', ult: '학익진', desc: '멀리서 화살을 쏟아부어요. 큰 기술 학익진은 학의 날개처럼 펼친 화살비로 적 무리를 덮어요.', bonus: 'atk' },
    { id: 'gangamchan', n: '강감찬', g: 4, el: 'skThunder', eln: '번개', img: 'img/ui/hero_gangamchan.webp?v=4', role: '번개', ult: '귀주대첩', desc: '칼끝에서 번개를 내리쳐요. 큰 기술 귀주대첩은 넓은 땅에 벼락을 연달아 떨어뜨려요.', bonus: 'atk' },
    { id: 'samjoko', n: '삼족오', g: 4, el: 'elSun', eln: '해', img: 'img/ui/hero_samjoko.webp?v=4', role: '원거리 화력', ult: '태양 강림', desc: '태양 광선으로 여러 적을 한꺼번에 꿰뚫어요. 큰 기술은 태양 강림이에요.', bonus: 'atk' },
    { id: 'eulji', n: '을지문덕', g: 3, el: 'sword', eln: '근거리 · 검', img: 'img/ui/hero_eulji.webp?v=4', role: '근거리', ult: '살수대첩', desc: '앞장서서 검으로 적을 베어요. 큰 기술 살수대첩은 거센 물살로 적을 쓸어 버려요.', bonus: 'hp' },
    { id: 'wonhyo', n: '원효대사', g: 3, el: 'tPower', eln: '법사 · 염주', img: 'img/ui/hero_wonhyo.webp?v=4', role: '법사', ult: '정화 결계', desc: '염주에서 빛줄기를 쏘아요. 큰 기술 정화 결계는 둘레의 역병을 씻어 내고 아군을 지켜요.', bonus: 'hp' },
    { id: 'gumiho', n: '구미호', g: 3, el: 'skGhost', eln: '여우불', img: 'img/ui/hero_gumiho.webp?v=4', role: '유도탄', ult: '홀림', desc: '여우불이 적을 쫓아가 터져요. 큰 기술 홀림은 적들을 잠시 멍하게 만들어요.', bonus: 'atk' },
    { id: 'honggildong', n: '홍길동', g: 2, el: 'skFan', eln: '분신', img: 'img/ui/hero_honggildong.webp?v=4', role: '분신', ult: '둔갑 연속베기', desc: '분신을 만들어 함께 싸워요. 큰 기술 둔갑 연속베기는 순식간에 여러 적을 베어요.', bonus: 'atk' },
    { id: 'haetae', n: '해태', g: 2, el: 'elFire', eln: '불', img: 'img/ui/hero_haetae.webp?v=3', role: '화염 방어', ult: '해치의 불바다', desc: '불길을 내뿜어 앞의 적을 태워요. 큰 기술은 해치의 불바다예요.', bonus: 'hp' },
    { id: 'dokkaebi', n: '도깨비', g: 0, el: 'elWater', eln: '도깨비불', img: 'img/ui/hero_dokkaebi.webp?v=4', role: '돌격', ult: '방망이 지진', desc: '도깨비방망이를 던지면 적을 뚫고 되돌아와요. 큰 기술은 방망이 지진이에요.', bonus: 'atk' }];
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
    if ((S.gearV || 0) < 2) { for (const i of (S.inv || [])) { if (i.g === 5) i.g = 6; if (i.t == null) i.t = 1; } S.gearV = 2; }   /* 장비 개편: 옛 신화(5)→새 신화(6), 가진 장비는 그대로(T1) */
    if (!S.plans) S.plans = { weapon: 3, hat: 3, robe: 3, arm: 3, shoes: 3, norigae: 3 };
    if (!S.nm) S.nm = { chap: 1, stars: {}, best: {}, first: {} };
    for (const it of S.inv) if (it.s == null) it.s = 0;
    if (!S.inv.length && !Object.keys(S.equip).length) { // 첫 장비
      ['weapon', 'hat', 'robe'].forEach(sl => { const it = mkItem(sl, 0, 'bow'); it.src = '처음 장비'; it.nw = 0; S.inv.push(it); S.equip[sl] = it.uid; });
    }
  }
  function fixComps() { for (const c of COMPS) { if (!S.comps[c.id]) S.comps[c.id] = { own: c.id === 'dokkaebi', lv: 1, sh: 0, star: 1 }; if (!S.comps[c.id].star) S.comps[c.id].star = 1; } S.team = S.team.filter(id => COMP[id]); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  const WKIND = ['bow', 'nogi', 'jochong', 'seungja'], WN = { bow: '각궁', nogi: '수노기', jochong: '조총', seungja: '승자총통' };
  const SETS = { cheoyong: { n: '처용 세트', c: '#ff8a6a', b: ['공격력 +8%', '처용 진노 대기 -20%', '처용무로 시작'] }, mugwan: { n: '무관 세트', c: '#8ac8ff', b: ['체력 +10%', '받는 피해 -10%', '병영 병사 +2'] }, seonbi: { n: '선비 세트', c: '#b9f08a', b: ['경험치 +10%', '카드 다시 뽑기 +1', '공격 기술 하나로 시작'] } };
  const SG = { manpa: { slot: 'weapon', w: 'manpa', n: '만파식적', img: 's_manpa', d: '피리 소리가 부채꼴 음파로 퍼져 적을 밀어내고 뚫어요.' }, chilji: { slot: 'weapon', w: 'chilji', n: '칠지도', img: 's_chilji', d: '일곱 갈래 검기를 한꺼번에 날려요.' }, cheonbu: { slot: 'norigae', n: '천부인', img: 's_cheonbu', d: '모든 능력치가 크게 오르는 하늘의 신물이에요.' } };
  const STAR_MAX = g => g === 4 ? 2 : g === 5 ? 3 : g === 6 ? 5 : 0;
  const LV_CAP = it => [10, 20, 30, 40, 50, 55, 60][it.g] + 10 * (it.s || 0) + (it.sg ? 20 : 0);
  function mkItem(slot, g, w, sg) { const it = { uid: S.uid++, slot, g, lv: 1, s: 0, src: ITEM_SRC || '', nw: 1, t: curTier(ITEM_CH || 0), q: Math.round(85 + Math.random() * 30 * (1 - [0, 0, 0.05, 0.1, 0.17, 0.27, 0.37][g || 0])) + Math.round(30 * [0, 0, 0.05, 0.1, 0.17, 0.27, 0.37][g || 0]) }; setTimeout(() => { try { if (!/뽑기|처치|처음|승급/.test(it.src || '') && S.inv.includes(it)) gotItem(it); } catch (e) {} }, 80); if (sg && SG[sg]) { it.sg = sg; it.slot = SG[sg].slot; if (SG[sg].w) it.w = SG[sg].w; it.g = Math.max(4, g); } else if (slot === 'weapon') it.w = w || rnd(WKIND); if (it.g >= 2) it.set = rnd(Object.keys(SETS)); try { rollAffix(it); } catch (e) {} return it; }
  const IMGG = g => g >= 6 ? 5 : g === 5 ? 4 : g;   /* 유니크는 전설 그림+초록 테두리, 신화는 옛 신화 그림 */
  const itemSrc = it => 'img/items/' + (it.sg ? SG[it.sg].img : it.slot === 'weapon' ? (it.w && it.w !== 'bow' ? 'w_' + it.w : 'weapon_g' + IMGG(it.g)) : it.slot === 'arm' ? 'arm_g' + IMGG(it.g) : it.slot + '_g' + IMGG(it.g)) + '.webp';
  const itemImg = it => '<img class="iimg" src="' + itemSrc(it) + '" style="width:78%;height:78%;object-fit:contain;filter:drop-shadow(0 3px 3px rgba(0,0,0,.5))" onerror="this.style.display=\'none\'">' + ((it.s || 0) > 0 ? '<div class="st stroke-s" style="position:absolute;right:4px;top:2px;font-size:18px;color:#ffe27a">+' + it.s + '</div>' : '') + (it.sg ? '<div class="stroke-s" style="position:absolute;left:4px;top:2px;font-size:16px;color:#ff6a6a">독보</div>' : '');
  function setsOf() { const c = {}; for (const sl in S.equip) { const it = byUid(S.equip[sl]); if (it && it.set) c[it.set] = (c[it.set] || 0) + 1; } return c; }
  const itemIc = it => it.slot === 'weapon' && (it.w === 'jochong' || it.w === 'seungja') ? 'skGun' : SLOT[it.slot].ic;
  const itemVal = it => Math.round(SLOT[it.slot].base * GMUL[it.g] * (1 + 0.15 * (it.lv - 1)) * (1 + 0.15 * (it.s || 0)) * (it.sg ? 1.6 : 1) * (1 + 0.35 * ((it.t || 1) - 1)) * ((it.q || 100) / 100));
  const itemName = it => 'T' + (it.t || 1) + ' ' + itemName0(it);
  const itemName0 = it => it.sg ? SG[it.sg].n : it.slot === 'weapon' ? (it.w && it.w !== 'bow' ? GR[it.g].n + ' ' + WN[it.w] : SLOT.weapon.names[it.g]) : SLOT[it.slot].names[it.g];
  const byUid = u => S.inv.find(i => i.uid === u);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  function stats() {
    let atk = 100 + 8 * (S.lv - 1), hp = 1000 + 60 * (S.lv - 1);
    for (const sl in S.equip) { const it = byUid(S.equip[sl]); if (!it) continue; if (SLOT[sl].st === 'atk') atk += itemVal(it); else hp += itemVal(it); }
    { let ap = 0, hpq = 0; for (const sl in S.equip) { const it = byUid(S.equip[sl]); if (it && it.af) for (const [k, v] of it.af) { if (k === 'atkP') ap += v; if (k === 'hpP') hpq += v; } } atk = Math.round(atk * (1 + ap / 100)); hp = Math.round(hp * (1 + hpq / 100)); }
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

  /* ---------------- 이야기 (세계관: 이야기\세계관_스토리.md) ---------------- */
  const OP_CUTS = [
    ['19세기 조선. 이상한 역병을 실은 검은 배가 남쪽 바다에 닿았다.', 'Joseon, 19th century. A black ship carrying a strange plague reached the southern sea.'],
    ['배에서 내린 역병 든 무리가 마을과 장터를 덮쳤다.', 'A plague-stricken horde poured off the ship and swept over villages and markets.'],
    ['쌓인 죽음 속에서 잠들어 있던 어둠의 세력, 역신이 깨어나 좀비에게 의식을 불어넣었다.', 'From all that death, the Plague God awoke and gave the zombies a will of their own.'],
    ['그때, 사당의 처용 탈이 빛나기 시작했다. 신라의 수호자 처용이 다시 깨어난다!', 'Then the old Cheoyong mask in the shrine began to glow. The guardian Cheoyong rises again!'],
    ['잠들어 있던 나라의 수호자들도 하나둘 깨어났다. 낮에는 지키고, 밤에는 막아라. 조선을 되찾자!', "Joseon's sleeping guardians wake one by one. Build by day, hold by night. Take Joseon back!"]
  ];
  const CH_STORY = ['검은 배에서 내린 무리가 마을을 덮쳤다. 사당의 처용 탈이 빛난다!', '장꾼들이 떠난 장터, 산에서 내려온 곰마저 역병에 물들었다.', '피란길 고개에 눈보라와 함께 범의 울음소리가 들린다.', '관아가 불탄다. 고을을 지키던 장수가 적이 되어 돌아왔다.', '안개 속 나루에 검은 배가 또 닿았다.', '산성이 무너졌다. 남은 병사들과 성문을 다시 세우자.', '서원에서 이상한 굿 소리. 좀비가 생각하고 움직이기 시작했다.', '궁궐 뒤뜰이 얼어붙었다. 왕비마저 역병에 물들었다.', '죽은 이들이 건너는 다리를 거꾸로 건너오는 자가 있다.', '임금이 역병에 물들었다. 궁궐을 되찾아야 한다.',
    '성곽을 따라 역병 군대가 밀려온다.', '포구 물빛이 검게 변했다. 바다 밑에서 독룡이 깨어났다.', '광산 깊은 곳, 검은 무녀가 다시 굿판을 열었다.', '대숲이 운다. 숲의 짐승들이 모두 어둠에 물들었다.', "동굴 벽화에 그려진 이름, 역병의 신 '역신'이 모습을 드러낸다.", '쇠를 먹는 괴물 불가사리가 탑을 갉아먹고 있다.', '붉은 단풍 사이, 산사를 지키던 범이 적이 되었다.', '옛 왕들의 무덤이 열렸다. 염라가 다시 돌아왔다.', '저잣거리에서 아는 사람 목소리가 들린다. 장산범의 흉내다!', '역신이 군영을 세웠다. 처용과 역신의 첫 맞대결.',
    '검은 배의 주인, 흑룡 대장이 섬에 진을 쳤다.', '늪에 빠진 쇳덩이를 먹고 불가사리가 더 커졌다.', '고개를 막은 바위가 움직인다. 두꺼비 거인이다.', '저승 문턱에서 독룡이 길을 막는다.', '해골로 쌓은 성채, 장산범의 울음이 메아리친다.', '백두의 얼음 아래 어둠의 뿌리가 뻗어 있다.', '궁궐 지하에 숨은 임금의 그림자를 되돌려야 한다.', '구름 위 다리, 처음 마을을 덮쳤던 무장이 다시 나타났다.', '종묘를 차지한 흑룡 대장과의 마지막 싸움.', '역신의 옥좌. 처용의 춤으로 역병을 걷어 내자!'];
  const CH_STORY_EN = ['A horde from the black ship falls on the village. The Cheoyong mask glows!', 'The market is empty, and even the mountain bear has caught the plague.', 'Snow, wind, and a tiger\'s roar on the refugee pass.', 'The magistrate\'s hall burns. Its own general has come back as the enemy.', 'Another black ship lands at the misty ferry.', 'The fortress has fallen. Rebuild the gate with the last soldiers.', 'Strange chanting at the academy. The zombies have started to think.', 'The palace garden is frozen, and the queen has caught the plague.', 'Someone is crossing the River of the Dead the wrong way.', 'The king has caught the plague. Take back the palace!',
    'The plague army marches along the walls.', 'The harbor turns black. A poison dragon wakes beneath the sea.', 'Deep in the mine, the Black Shaman begins another ritual.', 'The bamboo forest weeps. Its beasts have all turned dark.', 'A name on the cave wall: the Plague God shows himself.', 'Bulgasari, the iron-eating beast, is gnawing at the pagoda.', 'Among red maples, the temple tiger has turned.', 'The royal tombs are open. Yeomra is back.', 'A familiar voice in the streets... it is the Jangsan Tiger mimicking it!', 'The Plague God builds a war camp. First clash with Cheoyong.',
    'The Black Dragon Captain camps on the island.', 'Fed on sunken iron, Bulgasari grows even larger.', 'The rock blocking the pass moves. It is the Toad Giant!', 'The poison dragon blocks the threshold of the underworld.', 'A fortress of skulls echoes with the Jangsan Tiger\'s cry.', 'Under Baekdu\'s ice, the roots of darkness spread.', 'Bring back the king\'s shadow from beneath the palace.', 'On the bridge above the clouds, the first warlord returns.', 'The last battle with the Black Dragon Captain at the royal shrine.', 'The Plague God\'s throne. End the plague with Cheoyong\'s dance!'];
  const GUARD = { dokkaebi: ['마을 뒷산의 장난꾸러기. 놀던 마을이 사라질까 봐 방망이를 들었다.', 'The mischief-maker of the village hill. He took up his club to save the village he loves.'], haetae: ['궁궐 앞을 지키던 불의 수호수. 나쁜 기운을 가려내는 눈으로 어둠을 알아챘다.', 'The fire beast that guarded the palace gate. Its eyes sensed the darkness first.'], honggildong: ['백성을 지키던 의적. 억울한 사람이 늘자 다시 부채를 폈다.', 'The outlaw hero of the people. He opened his fan again when the innocent suffered.'], yisunsin: ['바다를 지킨 장군. 검은 배가 오자 거북선 방패를 들었다.', 'The admiral who guarded the sea. When the black ship came, he raised his turtle-ship shield.'], gumiho: ['천 년 묵은 여우. 사람이 되고 싶은 마음으로 사람들을 지킨다.', 'A thousand-year fox who protects people because she longs to be one.'], gangamchan: ['별이 떨어진 날 태어난 장군. 다시 큰 군대를 막는다.', 'The general born under a falling star, ready to stop a great army again.'], eulji: ['살수에서 대군을 물리친 지략가. 꾀로 역병 군대를 무너뜨린다.', 'The strategist who beat a vast army at Salsu, now outwitting the plague horde.'], wonhyo: ['마음의 빛을 깨친 스님. 의식을 빼앗긴 좀비들의 마음을 일깨운다.', 'The awakened monk whose light stirs the stolen minds of zombies.'], bari: ['저승을 다녀온 공주. 뒤집힌 황천 다리를 바로잡으러 왔다.', 'The princess who returned from the underworld to set its bridge right.'], jeonwoochi: ['도술을 부리는 선비. 그림 속 병사를 불러내 싸운다.', 'A scholar-wizard who summons soldiers from his paintings.'], samyeong: ['승병을 이끈 스님. 산사가 위험해지자 지팡이를 들었다.', 'The warrior monk who took up his staff when the temples fell.'], daejanggeum: ['조선 최고의 의녀. 역병을 고칠 약을 찾으며 동료를 치료한다.', "Joseon's finest healer, seeking a cure while tending her friends."], sadaham: ['열다섯에 싸움터에 나선 신라 화랑. 칼춤으로 앞장선다.', 'The Silla hwarang who went to war at fifteen, leading with his sword dance.'], kimchungseon: ['바다를 건너와 조선 편에 선 무사. 역병에 물든 옛 동료를 구하려 칼을 든다.', 'A warrior who crossed the sea to stand with Joseon, fighting to free his plagued comrades.'], jangyeongsil: ['조선 최고의 발명가. 발명품으로 성을 지킨다.', "Joseon's greatest inventor, defending the walls with his machines."], imugi: ['용이 되기를 기다리던 아기 용. 여의주를 지키려 함께 싸운다.', 'A baby dragon waiting to ascend, fighting to protect its pearl.'], samjoko: ['해 속에 사는 세 발 까마귀. 어둠을 햇빛으로 걷어 낸다.', 'The three-legged crow of the sun, clearing darkness with sunlight.'] };
  function guardLine(id) { const g = GUARD[id]; return g ? (window.IS_EN ? g[1] : g[0]) : ''; }
  function storyBook() {
    const E = window.IS_EN, C = chapters(), open = S.chap || 1;
    const chs = C.map((c, i) => '<div style="padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.12)"><b style="color:#ffd36b">' + (i + 1) + '. ' + c.name + '</b>' + (i < open && CH_DLG[i + 1] ? ' <span data-act="dlg" data-v="' + (i + 1) + '" style="cursor:pointer;color:#8fd4ff;font-size:13px">💬 ' + (window.IS_EN ? 'replay' : '대화 보기') + '</span>' : '') + '<br>' + (i < open ? chStory(i + 1) : '???') + '</div>').join('');
    const gs = COMPS.map(c => (S.comps[c.id] && S.comps[c.id].own) ? '<div style="padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.12)"><b style="color:#9ef0c0">' + c.n + '</b> · ' + guardLine(c.id) + '</div>' : '').join('');
    modal('<h3 class="stroke">' + (E ? 'Story' : '이야기') + '</h3><p style="text-align:center">' + (E ? 'A plague ship lands in 19th-century Joseon. The Plague God wakes, and Joseon\'s sleeping guardians rise to stop him.' : '19세기 조선, 역병을 실은 검은 배가 닿자 어둠의 세력 역신이 깨어났다. 잠들어 있던 수호자들이 다시 일어선다.') + '</p>' +
      '<div class="row"><div class="btn y" data-act="opening">' + (E ? 'Opening' : '오프닝') + '</div>' + (S.seenEnd1 ? '<div class="btn y" data-act="ending">' + (E ? 'Act 1 Ending' : '1막 엔딩') + '</div>' : '') + '</div>' +
      '<div class="xscroll" style="text-align:left;font-size:17px"><h4 style="margin:8px 0">' + (E ? 'Chapters' : '장 이야기') + '</h4>' + chs + (gs ? '<h4 style="margin:12px 0 8px">' + (E ? 'Awakened Guardians' : '깨어난 수호자') + '</h4>' + gs : '') + '</div>', 'xwide');
  }
  function chStory(n) { const a = window.IS_EN ? CH_STORY_EN : CH_STORY; return a[(n - 1) % 30] || ''; }
  const END_CUTS = [
    ['역신의 옥좌. 처용이 마지막 춤을 추자, 역병의 신이 빛 속으로 흩어졌다.', 'At the throne, Cheoyong danced one last time, and the Plague God scattered into the light.'],
    ['아침이 왔다. 역병이 걷히고, 사람들이 마을로 돌아온다. 수호자들 덕분이다!', 'Morning came. The plague lifted and people returned home, thanks to the guardians!'],
    ['그러나 역신이 남긴 마지막 말. "어둠은 꿈속에도 있다." 악몽의 조선(2막)이 열렸다!', 'But the Plague God left a last whisper: "Darkness lives in dreams, too." Act 2, Nightmare Joseon, is open!']
  ];
  function storyOpening(done) { storyCuts(OP_CUTS, i => 'op' + (i + 1), done); }
  function storyCuts(CUTS, imgOf, done) {
    let i = 0; const ov = document.createElement('div'); ov.id = 'kzop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:manipulation';
    const draw = () => { const c = CUTS[i], t = window.IS_EN ? c[1] : c[0];
      ov.innerHTML = '<div style="position:relative;height:100%;max-width:100vw;aspect-ratio:9/16;background:url(img/story/' + imgOf(i) + '.webp?v=2) center/cover">' +
        '<div style="position:absolute;left:0;right:0;bottom:0;padding:22px 20px 34px;background:linear-gradient(transparent,rgba(0,0,0,.85) 35%);color:#fff;font:800 19px/1.5 Pretendard,\'Malgun Gothic\',sans-serif;text-align:center;text-shadow:0 2px 3px #000">' + t +
        '<div style="margin-top:10px;font-size:13px;opacity:.7">' + (i + 1) + ' / ' + CUTS.length + (window.IS_EN ? ' · tap to continue' : ' · 화면을 누르면 넘어가요') + '</div></div>' +
        '<div id="kzopSkip" style="position:absolute;top:14px;right:14px;padding:8px 16px;border-radius:20px;background:rgba(0,0,0,.55);color:#fff;font:700 15px sans-serif;border:1px solid rgba(255,255,255,.4)">' + (window.IS_EN ? 'Skip' : '건너뛰기') + '</div></div>'; };
    const end = () => { ov.remove(); try { done && done(); } catch (e) { console.warn(e); } };
    ov.addEventListener('click', e => { if (e.target && e.target.id === 'kzopSkip') return end(); i++; if (i >= CUTS.length) end(); else draw(); });
    draw(); document.body.appendChild(ov);
  }

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
      '</div><div class="res2"><div class="rpill stroke-s" data-act="goShop">' + ic('jade') + fmt(S.jade) + '<div class="plus">+</div></div>' +
      '<div class="rpill stroke-s rstone" data-act="tab" data-v="power" title="신력석">' + ic('stone') + fmt(S.stone) + '<div class="plus">+</div></div></div>' +
      '</div>';
  }
  function tabsBar() {
    const T = [['shop', '상점', 'tShop', false], ['equip', '장비', 'tEquip', false], ['home', '모험', 'tAdv', true], ['comp', '영웅', 'tComp', false], ['power', '신력', 'tPower', false]];
    const dots = { shop: S.freeGold !== today(), equip: canMerge() || S.inv.some(i => i.nw), comp: COMPS.some(c => { const x = S.comps[c.id]; return (!x.own && x.sh >= 10) || (x.own && x.star < 5 && x.sh >= x.star * 10); }), power: false, home: false };
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
      '<div class="sidebtns l n7">' +
      '<div class="sb" data-act="att">' + ic('gift') + '<div class="lb stroke-s">출석</div>' + (attDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="quest">' + ic('scroll') + '<div class="lb stroke-s">임무</div>' + (qDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="pass">' + ic('star') + '<div class="lb stroke-s">패스</div>' + (passDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="event">' + ic('gift') + '<div class="lb stroke-s">이벤트</div>' + (evDot() || raceDot() ? '<i class="dot"></i>' : '') + (raceLeft().on ? '<i class="rcb stroke-s">레이스 ' + raceLeft().short + '</i>' : '') + '</div>' +
      '<div class="sb" data-act="rank">' + ic('power') + '<div class="lb stroke-s">랭킹</div></div>' +
      '<div class="sb wbsb" data-act="wb">' + ic('skull' in I ? 'skull' : 'sword') + '<div class="lb stroke-s">월드보스</div>' + (wbDay().n < 3 ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb arsb" data-act="ar">' + ic('sword') + '<div class="lb stroke-s">아레나</div>' + (arDay().n < AR_FREE ? '<i class="dot"></i>' : '') + '</div>' +
      '</div><div class="sidebtns r' + (stShow() ? ' n7' : '') + '">' + (stShow() ? '<div class="sb stsb" data-act="starter">' + ic('gift') + '<div class="lb stroke-s">스타트팩</div><i class="dot"></i><i class="rcb stroke-s">' + stDays() + '일</i></div>' : '') +
      '<div class="sb" data-act="mailbox">' + ic('mail') + '<div class="lb stroke-s">우편</div>' + (!S.mail ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="settings">' + ic('gear') + '<div class="lb stroke-s">설정</div></div>' +
      '<div class="sb" data-act="ach">' + ic('chest') + '<div class="lb stroke-s">업적</div>' + (achDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="codex">' + ic('scroll') + '<div class="lb stroke-s">도감</div>' + (cdDot() ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="sb" data-act="friend">' + ic('heart') + '<div class="lb stroke-s">친구</div></div>' +
      '<div class="sb" data-act="guild">' + ic('sword') + '<div class="lb stroke-s">문파</div></div>' +
      '</div>' +
      '<div class="herostage"><div class="glow"></div><div class="hero" data-act="tab" data-v="equip"' + skinFull() + '></div></div>' +
      '<div class="statline"><div class="stat stroke-s">' + ic('sword') + fmt(st.atk) + '</div><div class="stat stroke-s">' + ic('heart') + fmt(st.hp) + '</div></div>' +
      '<div class="teamrow">' + team + '</div>' +
      '<div class="patrol" data-act="patrol">' + ic(p.h >= 1 ? 'chestOpen' : 'chest', 'chest') + '<div class="lb stroke-s">순찰 보상</div><div class="bar"><i style="width:' + (p.ms / PATROL_MAX * 100) + '%"></i><span class="stroke-s">' + hm(p.ms) + '</span></div>' + (p.h >= 1 ? '<i class="dot"></i>' : '') + '</div>' +
      '<div class="startwrap"><div class="btn y startbtn" data-act="start"><span>모험 시작</span><small>' + ic('torch') + '5</small></div>' + (isApp() || !window.KZ_RBX_ON ? '' : '<a class="rbxlink stroke-s" href="https://www.roblox.com/games/97862450605218/K-Zombie-Cheoyong-Defense" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:6px;font-size:14px;font-weight:800;color:#fff;text-decoration:underline;opacity:.9">' + (window.IS_EN ? 'Play on Roblox ↗' : '로블록스에서 하기 ↗') + '</a>') + '</div>';
  }
  const hm = ms => { const m = Math.floor(ms / 60000); return Math.floor(m / 60) + '시간 ' + String(m % 60).padStart(2, '0') + '분'; };

  /* ---------- 장비 편의: 정련석 강화·잠금·입수 경로·NEW·거르기·일괄 분해 ---------- */
  var ITEM_SRC = '', eqF = 'all', eqSortK = 'g', eqBig = false;
  function eqx() { if (S.ore == null) { S.ore = Object.values(S.plans || {}).reduce((a, b) => a + (b || 0), 0); for (const k in (S.plans || {})) S.plans[k] = 0; } if (!S.bsG) S.bsG = [1, 1, 0, 0]; }
  const isEq = it => Object.values(S.equip).includes(it.uid);
  const upCost = it => ({ gold: 150 * it.lv * (it.g + 1), ore: 1 + Math.floor(it.lv / 5) });
  const salvVal = it => ({ gold: 100 * (it.g + 1) + it.lv * 40, ore: 2 + it.g * 3 + Math.floor(it.lv / 5) });
  const bsList = () => S.inv.filter(it => !isEq(it) && !it.lk && !it.sg && it.g <= 3 && S.bsG[it.g]);
  function gotItem(it) { try { const d = document.createElement('div'); d.className = 'gotit'; d.style.borderColor = GR[it.g].c; d.innerHTML = '<div class="gi slot g' + it.g + '">' + itemImg(it) + '</div><div><b class="stroke-s" style="color:' + GR[it.g].c + '">장비 획득! ' + itemName(it) + '</b><br><small class="stroke-s">' + GR[it.g].n + ' · 입수: ' + (it.src || '보상') + '</small></div>'; root.appendChild(d); setTimeout(() => d.remove(), 2800); } catch (e) {} }
  function upItem(it, times) { eqx(); let n = 0; while (n < times) { if (it.lv >= LV_CAP(it)) break; const c = upCost(it); if (S.gold < c.gold || S.ore < c.ore) break; S.gold -= c.gold; S.ore -= c.ore; it.lv++; n++; }
    if (n) { S.quests.up = (S.quests.up || 0) + n; try { xinit(); S.st.upg += n; } catch (e) {} save(); toast('강화 +' + n + ' · 레벨 ' + it.lv); } else toast(it.lv >= LV_CAP(it) ? '최대 레벨이에요. 승급으로 등급을 올려요' : '엽전이나 정련석이 모자라요'); return n; }
  function bulkSalvModal() { eqx(); const L = bsList(); let gold = 0, ore = 0; for (const it of L) { const v = salvVal(it); gold += v.gold; ore += v.ore; }
    modal('<h3 class="stroke">일괄 분해</h3><p style="text-align:center">고른 등급을 한 번에 분해해요. 착용 중·잠금·특수 장비는 빠져요.</p>' +
      '<div class="xbsg">' + [0, 1, 2, 3].map(g => '<div class="btn ' + (S.bsG[g] ? 'y' : 'b') + '" data-act="bsTog" data-v="' + g + '" style="box-shadow:0 0 0 3px ' + GR[g].c + '">' + (S.bsG[g] ? '✔ ' : '') + GR[g].n + '</div>').join('') + '</div>' +
      '<p class="stroke-s" style="text-align:center;font-size:22px">' + L.length + '개 → ' + ic('coin').replace('class="ic ', 'style="width:26px;height:26px" class="ic ') + fmt(gold) + ' · 정련석 ' + fmt(ore) + '</p>' +
      '<div class="row"><div class="btn r ' + (L.length ? '' : 'dis') + '" data-act="bulkGo">분해하기</div></div>');
  }
  function canMerge() { const cnt = {}; for (const it of S.inv) { if (it.g >= 6 || it.g + 1 > maxG(progCh())) continue; const k = it.slot + (it.w || '') + it.g; cnt[k] = (cnt[k] || 0) + 1; } return Object.values(cnt).some(v => v >= 3); }
  function pgEquip() {
    const st = stats();
    const slot = s => { const it = byUid(S.equip[s.id]); return it ? '<div class="slot g' + it.g + '" data-act="item" data-v="' + it.uid + '">' + itemImg(it) + '<div class="lv stroke-s">' + it.lv + '</div><div class="nm stroke-s">' + itemName(it) + '</div></div>' : '<div class="slot emp">' + ic(s.ic) + '<div class="nm stroke-s">' + s.n + '</div></div>'; };
    eqx(); const SORTF = { g: (a, b) => b.g - a.g || b.lv - a.lv, lv: (a, b) => b.lv - a.lv || b.g - a.g, new: (a, b) => b.uid - a.uid };
    const inv = S.inv.filter(it => eqF === 'all' || it.slot === eqF).sort(SORTF[eqSortK] || SORTF.g).map(it => {
      const eq = S.equip[it.slot] === it.uid;
      const up = eq ? 0 : (() => { try { return Math.sign(Math.round(powerWith(it).power - stats().power)); } catch (e) { return 0; } })(); return '<div class="it g' + it.g + '" data-act="item" data-v="' + it.uid + '">' + itemImg(it) + '<div class="lv stroke-s">' + it.lv + '</div>' + (eq ? '<div class="eqd stroke-s">착용</div>' : up > 0 ? '<div class="upar" style="position:absolute;left:3px;bottom:2px;color:#7df06a;font-weight:900;font-size:20px;text-shadow:0 0 3px #000">▲</div>' : up < 0 ? '<div class="upar" style="position:absolute;left:3px;bottom:2px;color:#ff6a5a;font-weight:900;font-size:16px;text-shadow:0 0 3px #000">▼</div>' : '') + (it.nw ? '<div class="nwd stroke-s">NEW</div>' : '') + (it.lk ? '<div class="lkd">🔒</div>' : '') + '</div>';
    }).join('');
    return '<div class="hdr stroke">장비<span class="sub">강화: 엽전+정련석 · 승급: 같은 장비 3개(전설·신화는 2개) · 정련석 ' + fmt(S.ore || 0) + '</span></div>' + (() => { const c = setsOf(); const t = Object.keys(c).filter(k => c[k] >= 2).map(k => '<span style="color:' + SETS[k].c + '">' + SETS[k].n + ' ' + c[k] + '부위</span>').join(' · '); return t ? '<div class="stroke-s" style="position:absolute;left:0;right:0;top:300px;text-align:center;font-size:18px;z-index:3;pointer-events:none">' + t + '</div>' : ''; })() +
      '<div class="eqwrap"><div class="eqhero"' + skinFull() + '></div><div class="btn p eqskin" data-act="skins">의상</div><div class="btn y eqmount" data-act="mounts">탈것' + (S.mount ? ' ✔' : '') + '</div><div class="slots l">' + SLOTS.slice(0, 3).map(slot).join('') + '</div><div class="slots r">' + SLOTS.slice(3).map(slot).join('') + '</div></div>' +
      '<div class="eqstats"><div class="stat stroke-s">' + ic('sword') + '공격 ' + fmt(st.atk) + '</div><div class="stat stroke-s">' + ic('heart') + '체력 ' + fmt(st.hp) + '</div></div>' +
      '<div class="eqbtns"><div class="btn b" data-act="autoEq">일괄 착용</div><div class="btn p ' + (canMerge() ? '' : 'dis') + '" data-act="merge">일괄 승급' + (canMerge() ? '<i class="dot" style="right:-8px;top:-8px"></i>' : '') + '</div><div class="btn r" data-act="bulkSalv">일괄 분해</div></div>' +
      '<div class="bagbar' + (eqBig ? ' bx' : '') + '">' + [['all', '전체']].concat(SLOTS.map(s => [s.id, s.n])).map(f => '<div class="bf stroke-s' + (eqF === f[0] ? ' on' : '') + '" data-act="eqF" data-v="' + f[0] + '">' + f[1] + '</div>').join('') + '<div class="bf stroke-s sort" data-act="eqSort">' + ({ g: '등급순', lv: '레벨순', new: '새것순' })[eqSortK] + '</div><div class="bf stroke-s bxx" data-act="eqBig">' + (eqBig ? '▼ 접기' : '▲ 크게') + '</div></div>' +
      '<div class="inv box' + (eqBig ? ' bx' : '') + '">' + (inv || '<div style="grid-column:1/-1;text-align:center;opacity:.7;font-size:22px;padding:30px">가진 장비가 없어요. 상점에서 뽑아 보세요.</div>') + '</div>';
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
        (inTeam ? '<div class="team stroke-s">출전</div>' : '') + (() => { const D = window.JZD; if (!D || !D.chEl || !D.COMP || !D.COMP[c.id]) return ''; const x = D.chEl(S.sel || 1, typeof isNM === 'function' && isNM()); return D.COMP[c.id].el === x.el ? '<div class="xadv stroke-s" style="background:' + D.EL[x.el].c + '">' + S.sel + '장 유리</div>' : ''; })() +
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
      '<p>' + sel.desc + '</p>' + (guardLine(sel.id) ? '<p style="color:#ffe3a3;font-size:17px;margin-top:-4px">' + (window.IS_EN ? 'Awakened guardian: ' : '깨어난 수호자 · ') + guardLine(sel.id) + '</p>' : '') +
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
        '<p style="color:#ffe27a">위력 ' + (100 + (lv - 1) * 25) + '%' + ((window.JZD && JZD.SK_UNLOCK && (JZD.SK_UNLOCK[s.id] || 1) > Math.max(1, S.chap || 1)) ? ' <b style="color:#ffb0a0">🔒 ' + JZD.SK_UNLOCK[s.id] + '장에서 열림</b>' : '') + '</p><div class="stars">' + stars + '</div>' +
        (lv >= 5 ? '<div class="btn y dis">최고</div>' : '<div class="btn g ' + (S.stone >= cost && S.gold >= gc ? '' : 'dis') + '" data-act="skUp" data-v="' + s.id + '">' + ic('stone').replace('class="ic ', 'style="width:26px;height:26px" class="ic ') + cost + '</div>') + '</div>';
    }).join('');
    const EVO = window.JZD && JZD.EVO ? JZD.EVO : {}; const SN = id => (window.JZD ? (JZD.SKILLS.find(s => s.id === id) || {}).n : id);
    const evo = Object.keys(EVO).map(id => '<div class="box" style="display:flex;gap:10px;align-items:center;padding:8px;margin:6px 0"><img src="img/skills/' + id + '.webp?v=2" style="width:54px;height:54px;border-radius:10px;background:#2a2f5a" onerror="this.style.visibility=\'hidden\'"><span class="stroke-s" style="font-size:20px">+</span><img src="img/skills/' + EVO[id].pair + '.webp" style="width:54px;height:54px;border-radius:10px"><span class="stroke-s" style="font-size:24px">→</span><img src="img/skills/ev_' + id + '.webp" style="width:48px;height:70px;border-radius:8px;object-fit:cover"><div style="font-size:18px;line-height:1.3"><b style="color:#ffe27a">' + EVO[id].n + '</b><br>' + SN(id) + ' 5단계 + ' + SN(EVO[id].pair) + '</div></div>').join('');
    return '<div class="hdr stroke">신력<span class="sub">신력석 ' + S.stone + '개 · 별을 올리면 전투 속 기술이 세져요</span></div><div class="skills" style="top:96px">' + list + '<div style="grid-column:1/-1"><div class="stroke" style="font-size:26px;margin:14px 0 6px">진화 짝 (전투 중)</div>' + evo + '</div></div>';
  }
  /* ---------------- 월드 보스 · 문파 보스 (ADSCEND 거대 보스를 조선풍으로) ---------------- */
  const WBS = [{ id: 'wb_stone', n: '돌장승 거신', d: '돌을 쌓아 만든 거대한 장승. 단단해서 방어를 깎는 공격이 좋아요' }, { id: 'wb_fire', n: '화마', d: '불을 두른 거인. 불길을 흩뿌려요' }, { id: 'wb_plague', n: '역병 대장군', d: '돌진하며 내려찍는 좀비 대장군' }];
  const GB_HP = 20000000, GB_STAGE = [[0.25, 'jade', 60], [0.5, 'jade', 120], [0.75, 'stone', 40], [1, 'jade', 300]];
  const wkNum = () => { const m = /(\d+)\D+(\d+)/.exec(S.wk && S.wk.key || ''); return m ? (+m[1]) * 60 + (+m[2]) : 0; };
  const wbNow = () => WBS[wkNum() % WBS.length];
  const gbNow = () => WBS[(wkNum() + 1) % WBS.length];
  const sprBg = (k, sz, fr) => '<div class="wbspr" style="width:' + sz + 'px;height:' + sz + 'px;background-image:url(sprites/' + k + '_idle.webp);background-size:' + ((fr || 6) * 100) + '% 800%;background-position:0 0"></div>';
  function wbDay() { xinit(); const d = today(); if (!S.wb || S.wb.day !== d) S.wb = Object.assign({}, S.wb || {}, { day: d, n: 0, gn: 0 }); if (!S.wb.wk || S.wb.wk !== S.wk.key) { if (S.wb.wk && S.wb.best > 0) S.wb.prev = { wk: S.wb.wk, best: S.wb.best, got: false }; S.wb.wk = S.wk.key; S.wb.best = 0; S.wb.gtot = 0; S.wb.gGot = {}; } return S.wb; }
  function wbRecord(W, dmg) {
    const s = wbDay(); S.wbTries = (S.wbTries || 0) + 1;
    if (W.kind === 'wb') { if (dmg > s.best) s.best = dmg; save(); toast('월드 보스 피해 ' + fmt(dmg) + (dmg >= s.best ? ' · 이번 주 최고!' : '')); try { if (accUser()) putEntry('kzwb-' + S.wk.key, accName(), s.best).catch(() => {}); } catch (e) {} }
    else { s.gtot = (s.gtot || 0) + dmg; save(); toast('문파 보스에 ' + fmt(dmg) + ' 피해!'); try { if (accUser() && S.guild) putEntry('kzgb-' + S.guild.id + '-' + S.wk.key, accName(), s.gtot).catch(() => {}); } catch (e) {} }
  }
  function wbGo(kind) { const s = wbDay(); if (kind === 'wb' && s.n >= 3) { toast('오늘 도전을 다 했어요 (하루 3번)'); return; } if (kind === 'gb' && s.gn >= 2) { toast('오늘 도전을 다 했어요 (하루 2번)'); return; }
    if (kind === 'wb') s.n++; else s.gn++; const B = kind === 'wb' ? wbNow() : gbNow(); S.nextMode = 'boss'; S.nextWB = { kind, boss: B.id, name: (kind === 'wb' ? '월드 보스 · ' : '문파 보스 · ') + B.n }; save(); startBattle(Math.max(1, Math.min(S.chap, chapters().length))); }
  async function wbModal() {
    const s = wbDay(), B = wbNow();
    modal('<h3 class="stroke">월드 보스</h3><div class="box wbhd">' + sprBg(B.id, 200) + '<div><b class="stroke" style="font-size:30px;color:#ffb07a">' + B.n + '</b><p>' + B.d + '</p><p>90초 동안 준 피해로 이번 주(' + S.wk.key + ') 순위를 겨뤄요. 보스는 매주 바뀌어요.</p><p>내 최고 <b style="color:#ffe27a">' + fmt(s.best || 0) + '</b> · 오늘 ' + s.n + '/3</p></div></div>' +
      '<div class="row"><div class="btn r" data-act="wbGo" data-v="wb">' + (s.n >= 3 ? '내일 다시' : '도전 (횃불 없음)') + '</div></div>' +
      '<p style="text-align:center;font-size:16px">주간 보상: 1위 옥 1000 · 2~3위 600 · 4~10위 300 · 11~50위 150 · 참여 50 (다음 주 첫 접속 때)</p><div class="xscroll" id="wbbox"><p style="text-align:center">순위 불러오는 중...</p></div>', 'xwide');
    const box = () => $('#wbbox', root); const st = await socialReady(); if (!box()) return;
    if (st !== 'ok') { box().innerHTML = st === 'login' ? loginBox('구글 로그인하면 내 피해가 순위표에 올라가요.') : st === 'offline' ? offBox : errBox(); return; }
    try { const me = accUser().uid;
      if (s.prev && !s.prev.got) { const pl = (await listBoard('kzwb-' + s.prev.wk, 300)).sort((a, b) => b.score - a.score); const rk = pl.findIndex(e => e.id === me) + 1; const j = rk === 1 ? 1000 : rk && rk <= 3 ? 600 : rk && rk <= 10 ? 300 : rk && rk <= 50 ? 150 : 50; S.jade += j; s.prev.got = true; save(); toast('지난주 월드 보스 ' + (rk ? rk + '위' : '참여') + ' 보상: 옥 ' + j); refresh(); }
      if (s.best > 0) await putEntry('kzwb-' + S.wk.key, accName(), s.best);
      const L = (await listBoard('kzwb-' + S.wk.key, 300)).sort((a, b) => b.score - a.score).slice(0, 50); if (!box()) return;
      box().innerHTML = L.length ? L.map((e, i) => '<div class="xrk' + (e.id === me ? ' me' : '') + '"><b class="stroke-s">' + (i + 1) + '</b><span class="stroke-s">' + esc(e.name) + '</span><em class="stroke-s">' + fmt(e.score || 0) + '</em></div>').join('') : '<p style="text-align:center">아직 이번 주 기록이 없어요. 첫 번째가 되어 보세요!</p>';
    } catch (e) { if (box()) box().innerHTML = errBox(); }
  }
  async function gbBox(g, me) {
    const s = wbDay(), B = gbNow(), L = await listBoard('kzgb-' + g.id + '-' + S.wk.key, 60), tot = L.reduce((a, r) => a + (r.score || 0), 0), k = Math.min(1, tot / GB_HP);
    return '<div class="box gbbox">' + sprBg(B.id, 120) + '<div style="flex:1"><b class="stroke-s" style="font-size:24px;color:#ffb07a">문파 보스 · ' + B.n + '</b><div class="xbar"><i style="width:' + (k * 100) + '%"></i><span class="stroke-s">' + fmt(tot) + ' / ' + fmt(GB_HP) + '</span></div>' +
      '<div class="gbst">' + GB_STAGE.map(([p, kk, v], i) => { const ok = k >= p, got = (s.gGot || {})[i]; return '<div class="gbs' + (ok ? ' ok' : '') + '"' + (ok && !got ? ' data-act="gbGet" data-v="' + i + '"' : '') + '>' + Math.round(p * 100) + '%<br>' + (got ? '✔' : rwBox(kk, v, 3, 1)) + '</div>'; }).join('') + '</div>' +
      '<small>문파원 모두의 피해를 더해요 · 내 피해 ' + fmt(s.gtot || 0) + ' · 오늘 ' + s.gn + '/2</small></div><div class="btn r" data-act="wbGo" data-v="gb">도전</div></div>';
  }
  /* ---------------- 탈것: 이동이 빨라지는 꾸미기 (힘은 그대로) ---------------- */
  const MOUNTS = [
    { id: 'pony', n: '제주 조랑말', d: '이동 속도 +10%', sp: 0.10, price: 800, g: 2 },
    { id: 'tiger', n: '아기 백호', d: '이동 속도 +15% · 챕터 10을 열면 무료', sp: 0.15, free: () => S.chap >= 10, g: 4 },
    { id: 'haetae', n: '아기 해태', d: '이동 속도 +15%', sp: 0.15, price: 1500, g: 4 },
    { id: 'crane', n: '선학', d: '이동 속도 +20% · 월드 보스에 5번 도전하면 무료', sp: 0.20, free: () => (S.wbTries || 0) >= 5, g: 5 }];
  const mOwn = id => !!(S.mounts && S.mounts[id]) || !!(MOUNTS.find(m => m.id === id) || {}).free && MOUNTS.find(m => m.id === id).free();
  function mountModal() {
    modal('<h3 class="stroke">탈것</h3><p style="text-align:center">타면 전투에서 처용이 더 빨리 움직여요 (공격·체력은 그대로)</p><div class="skins">' + MOUNTS.map(m => { const own = mOwn(m.id), on = S.mount === m.id;
      return '<div class="skin box' + (on ? ' wear' : '') + '" style="border-color:' + GR[m.g].c + '"><div class="si" style="background:#3a2a1a">' + sprBg('mount_' + m.id, 170, 1) + '</div><div class="gn stroke-s">' + m.n + '</div><div class="sd">' + m.d + '</div>' +
        (on ? '<div class="btn b" data-act="mountOff">내리기</div>' : own ? '<div class="btn g" data-act="mountOn" data-v="' + m.id + '">타기</div>' : m.price ? '<div class="btn y" data-act="mountBuy" data-v="' + m.id + '">' + ic('jade') + fmt(m.price) + '</div>' : '<div class="btn b dis">조건 미달성</div>') + '</div>'; }).join('') + '</div>', 'wide');
  }
  /* ---------------- 의상(스킨): 모습만 바뀌고 능력치는 같다 ---------------- */
  const SKINS = [
    { id: 'base', n: '기본 처용', d: '흰 도포에 갓을 쓴 처용', price: 0, g: 1 },
    { id: 'amhaeng', n: '암행어사', d: '낡은 도포에 마패를 찬 비밀 어사', price: 1200, g: 3 },
    { id: 'jeoseung', n: '저승사자', d: '검은 도포와 흑립, 이름 적힌 두루마리', price: 1800, g: 4 },
    { id: 'janggun', n: '장수복', d: '붉은 두정갑과 투구를 갖춘 조선 장수', price: 2400, g: 4 },
    { id: 'gonryong', n: '곤룡포', d: '금빛 용무늬 붉은 곤룡포와 익선관', price: 3000, g: 5 },
    { id: 'seonbi', n: '선비', d: '유생 도포와 유건, 책을 든 선비', price: 1500, g: 3 },
    { id: 'podo', n: '포도청 포졸', d: '검은 전립과 붉은 철릭, 육모방망이', price: 2000, g: 3 }];
  const skinOwn = id => id === 'base' || !!(S.skins && S.skins[id]);
  const skinCard = id => id === 'base' ? 'img/ui/hero_face.webp' : 'img/skins/' + id + '.png';
  const skinFull = () => (!S.skin || S.skin === 'base') ? '' : ' style="background-image:url(img/skins/' + S.skin + '_full.png)"';
  function skinRow() {
    return '<div class="skins">' + SKINS.map(s => { const own = skinOwn(s.id), wear = (S.skin || 'base') === s.id;
      return '<div class="skin box' + (wear ? ' wear' : '') + '" style="border-color:' + GR[s.g].c + '"><div class="si" style="background-image:url(' + skinCard(s.id) + ')"></div>' +
        '<div class="gn stroke-s">' + s.n + '</div><div class="sd">' + s.d + '</div>' +
        (wear ? '<div class="btn b dis">착용 중</div>' : own ? '<div class="btn g" data-act="skinWear" data-v="' + s.id + '">착용</div>' : '<div class="btn y" data-act="skinBuy" data-v="' + s.id + '">' + ic('jade') + fmt(s.price) + '</div>') + '</div>'; }).join('') + '</div>';
  }
  function skinModal() { modal('<h3 class="stroke">의상</h3><p style="text-align:center">모습만 바뀌고 능력치는 같아요</p>' + skinRow(), 'wide'); }
  /* 주간 전설 무기(사용자 11-27: 유료로 전설 무기 일부 구매). 옥 확정 구매, 주 1개, 장 문 예외 */
  const LWK = () => Math.floor((Date.now() / 864e5 + 3) / 7), LEG_PRICE = 4000;
  const legWeek = () => { const w = LWK(), ks = WKIND; return [ks[w % 4], ks[(w + 1) % 4]]; };
  function legShopHtml() { const done = S.legWk === LWK(); return '<div class="sect stroke">이번 주 전설 무기 <small>확정 구매 · 주 1개</small></div><div class="goods">' + legWeek().map(w => { const it = { slot: 'weapon', w, g: 4, lv: 1, t: curTier(), q: 98 }; return '<div class="good box"><div class="tag stroke-s">전설</div><div class="gi slot g4" style="width:64px;height:64px;margin:auto">' + itemImg(it) + '</div><div class="gn stroke-s">' + itemName(it) + '</div><div style="font-size:16px;color:#ffe9a8">고유 효과 1개 확정 · 품질 90~105%</div><div class="btn ' + (done ? 'b dis' : 'y') + '" data-act="buyLeg" data-v="' + w + '">' + (done ? '이번 주 구매함' : '<small>' + ic('jade') + fmt(LEG_PRICE) + '</small>') + '</div></div>'; }).join('') + '</div>'; }
  function pgShop() {
    const free = S.freeGold !== today();
    const goods = [
      ['freeGold', '무료 엽전', 'coin', '엽전 500', free ? '무료' : '내일 다시', free ? 'g' : 'b dis', free ? '매일' : ''],
      ['starterPk', '신규 스타트팩', 'gift', '홍길동 + 영웅 장비 4점', S.starter ? '받음' : '990원', S.starter ? 'b dis' : 'p', S.starter ? '' : '1회'],
      ['gold3k', '엽전 꾸러미', 'coin', '엽전 5,000', '옥 50', 'b', ''],
      ['stone20', '신력석 상자', 'stone', '신력석 20', '옥 80', 'p', '인기'],
      ['torch30', '횃불 묶음', 'torch', '횃불 30', '옥 40', 'r', ''],
      ['jade300', '옥 주머니', 'jade', '옥 300', '500원', 'y', ''],
      ['jade1k', '옥 상자', 'jade', '옥 1,000', '990원', 'y', '']];
    return '<div class="hdr stroke">상점<span class="sub">옥으로 장비와 동료를 뽑아요</span></div><div class="shop" style="top:96px">' +
      '<div class="banner gold-frame"><div class="art" style="background-image:url(img/ui/bn_gear.webp?v=1);background-position:right center"></div><h3 class="stroke">장비 뽑기</h3><div class="d stroke-s">10번 뽑으면 희귀 이상 1개 보장. 전설, 신화 장비가 나올 수 있어요.</div>' +
      '<div class="prob" data-act="prob" data-v="eq">확률 안내</div><div class="bb"><div class="btn b" data-act="gacha" data-v="eq1"><span>1번</span><small>' + ic('jade') + '60</small></div><div class="btn y" data-act="gacha" data-v="eq10"><span>10번</span><small>' + ic('jade') + '540</small></div></div></div>' +
      '<div class="banner gold-frame"><div class="art" style="background-image:url(img/ui/hero_yisunsin.webp?v=4);background-position:center 30%"></div><h3 class="stroke">영웅 뽑기</h3><div class="d stroke-s">이순신, 강감찬, 삼족오 같은 전설 영웅 조각이 나와요. 조각으로 영웅을 맞이하고 별을 올려요.</div>' +
      '<div class="prob" data-act="prob" data-v="cp">확률 안내</div><div class="bb"><div class="btn p" data-act="gacha" data-v="cp1"><span>1번</span><small>' + ic('jade') + '100</small></div><div class="btn y" data-act="gacha" data-v="cp10"><span>10번</span><small>' + ic('jade') + '900</small></div></div></div>' +
      legShopHtml() + '<div class="sect stroke">의상 <small>모습만 바뀌어요</small></div>' + skinRow() + '<div class="sect stroke">물건</div><div class="goods">' + goods.map(([id, n, i, what, price, c, tag]) =>
        '<div class="good box">' + (tag ? '<div class="tag stroke-s">' + tag + '</div>' : '') + '<div class="gi">' + ic(i) + '</div><div class="gn stroke-s">' + n + '</div><div style="font-size:18px;color:#ffe9a8">' + what + '</div><div class="btn ' + c + '" data-act="buy" data-v="' + id + '">' + price + '</div></div>').join('') + '</div></div>';
  }

  /* ---------------- 뽑기 ---------------- */
  const EQP = [45, 30, 17, 6.5, 1.3, 0.15, 0.05];
  const CPP = [['g4', 3], ['g3', 12], ['g2', 20], ['g0', 15], ['stone', 25], ['gold', 25]];
  function rollGrade(min, cap) { cap = Math.min(6, cap == null ? maxG(progCh()) : cap); min = Math.min(min || 0, cap); let tot = 0; for (let g = 0; g <= cap; g++) tot += EQP[g]; let r = Math.random() * tot, g = 0; for (; g < cap; g++) { if (r < EQP[g]) break; r -= EQP[g]; } return Math.max(min, Math.min(cap, g)); }
  let ITEM_CH = 0;
  function doGacha(kind) {
    const cost = { eq1: 60, eq10: 540, cp1: 100, cp10: 900 }[kind], n = kind.endsWith('10') ? 10 : 1;
    if (S.jade < cost) { toast('옥이 부족해요'); return; }
    S.jade -= cost; S.quests.gacha = (S.quests.gacha || 0) + 1; xinit(); S.st.gacha += 1;
    const res = [];
    if (kind.startsWith('eq')) {
      ITEM_SRC = '장비 뽑기'; for (let i = 0; i < n; i++) { const topG = progCh() >= 30 ? 4 : Math.min(4, maxG(progCh())); let g0 = rareUp(rollGrade(0), progCh(), 'gacha'); S.pity = (S.pity || 0) + 1; if (S.pity >= 50 && g0 < topG) { g0 = topG; if (progCh() >= 10 && Math.random() < 0.1) { g0 = Math.max(g0, 4); RARE_HIT = 4; } } if (g0 >= topG) S.pity = 0; const sg = g0 >= 4 && Math.random() < 0.12 ? rnd(Object.keys(SG)) : null; const it = mkItem(rnd(SLOTS).id, g0, null, sg); rareShow(it); res.push({ g: it.g, img2: itemSrc(it), t: itemName(it) }); S.inv.push(it); }
      if (n === 10 && maxG(progCh()) >= 2 && !res.some(r => r.g >= 2)) { const it = S.inv[S.inv.length - 1]; it.g = 2; res[9].g = 2; res[9].t = itemName(it); }
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
    if (k === 'eq') { const capQ = maxG(progCh()); let tq = 0; for (let i = 0; i <= capQ; i++) tq += EQP[i]; modal('<h3 class="stroke">장비 뽑기 확률</h3><p style="text-align:center">지금 진행: ' + progCh() + '장 · 장비 단계 T' + curTier() + '</p><table>' + GR.map((g, i) => '<tr><td style="color:' + g.c + '">' + g.n + '</td><td>' + (i <= capQ ? (Math.round(EQP[i] / tq * 10000) / 100) + '%' : '0% (' + GATE[i] + '장 이후)') + '</td></tr>').join('') + '</table><p style="font-size:16px">가끔 나오는 등급(뽑기 기준): 전설 10~29장 0.5%, 30~59장 1%, 60장부터 정식. 우두머리 상자: 영웅 15~29장 8%, 전설 10~29장 2%·30~59장 4%, 유니크 90~119장 1.5%. 숙적 상자: 전설 5%, 유니크 2%, 신화 160~199장 1%. 천장 50회: 30장 전엔 열린 최고 등급(10% 확률로 전설), 30장부터 전설.</p><p>등급마다 열리는 장이 있어요(악몽 2막은 31장부터 이어서 셉니다). 50번 안에 그때 뽑을 수 있는 가장 높은 등급(최대 전설)을 1개 줘요. 10번 뽑기는 희귀가 열린 뒤 희귀 이상 1개를 꼭 줘요. 칸(무기, 갓, 도포, 토시, 신, 노리개)은 똑같은 확률이에요.</p>'); }
    else modal('<h3 class="stroke">영웅 뽑기 확률</h3><table><tr><td style="color:#ffd36b">전설 영웅 조각 2개 (이순신, 강감찬, 삼족오)</td><td>3%</td></tr><tr><td style="color:#e39bff">영웅 등급 조각 3개 (을지문덕, 원효대사, 구미호)</td><td>12%</td></tr><tr><td style="color:#6cc6ff">희귀 조각 5개 (홍길동, 해태)</td><td>20%</td></tr><tr><td>일반 조각 5개 (도깨비)</td><td>15%</td></tr><tr><td style="color:#6cc6ff">신력석 5개</td><td>25%</td></tr><tr><td>엽전 800</td><td>25%</td></tr></table><p>같은 등급 안의 영웅은 똑같은 확률이에요.</p>');
  }

  /* ---------------- 지도 ---------------- */
  const NX = [360, 210, 490, 250, 480, 220, 470, 260, 470, 360];
  /* ---------------- 2막: 악몽의 조선 (노멀 30장을 깨면 열림) ---------------- */
  const nmOpen = () => (S.stars[30] || 0) >= 2;
  const isNM = () => nmOpen() && S.mapNM === true;
  function renderMap() {
    if (!S.nm) S.nm = { chap: 1, stars: {}, best: {}, first: {} };
    const NMm = isNM(), PCH = NMm ? S.nm.chap : S.chap, PST = NMm ? S.nm.stars : S.stars;
    const C = chapters(), HB = 2100;
    const pos = C.map((c, i) => [NX[i % 10], HB - 170 - i * 195]);
    let d = 'M' + pos[0][0] + ' ' + (pos[0][1] + 60);
    for (let i = 1; i < pos.length; i++) { const [x0, y0] = pos[i - 1], [x1, y1] = pos[i]; d += ' C' + x0 + ' ' + (y0 - 90) + ' ' + x1 + ' ' + (y1 + 150) + ' ' + x1 + ' ' + (y1 + 60); }
    const nodes = C.map((c, i) => {
      const lock = c.n > PCH, done = (PST[c.n] || 0) >= 1 && c.n < PCH || (PST[c.n] || 0) >= 3, cur = c.n === PCH;
      const st = [1, 2, 3].map(k => ic((PST[c.n] || 0) >= k ? 'star' : 'star0')).join('');
      const chest = !NMm && (S.stars[c.n] || 0) >= 3 && !S.chest[c.n] ? '<svg class="ch" viewBox="0 0 64 64" data-act="chest" data-v="' + c.n + '" style="animation:bob 1.4s infinite">' + I.chest + '</svg>' : '';
      return '<div class="node ' + (lock ? 'lock' : done ? 'done' : '') + (cur ? ' cur' : '') + '" style="left:' + pos[i][0] + 'px;top:' + pos[i][1] + 'px" data-act="node" data-v="' + c.n + '">' +
        '<div class="ball stroke">' + (lock ? ic('lock').replace('class="ic ', 'style="width:60px;height:60px" class="ic ') : c.n) + chest + '</div>' +
        '<div class="lab stroke-s">' + c.name + '</div><div class="st">' + st + '</div></div>';
    }).join('');
    $('#s-map').innerHTML = '<div class="mapscroll" id="mapscroll"><div class="mapbody"><svg class="mpath" width="720" height="' + HB + '"><path d="' + d + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="22" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#ffe9a8" stroke-width="10" stroke-dasharray="2 22" stroke-linecap="round"/></svg>' + nodes + '</div></div>' +
      '<div class="mapbar"><div class="btn b back" data-act="lobby">' + ic('back').replace('class="ic ', 'style="width:40px;height:40px" class="ic ') + '</div><div class="t stroke">' + (NMm ? '2막 · 악몽의 조선' : '모험 지도') + '</div>' +
      (nmOpen() ? '<div class="nmsw"><div class="' + (NMm ? '' : 'on') + '" data-act="mapNM" data-v="0">평범</div><div class="' + (NMm ? 'on nm' : '') + '" data-act="mapNM" data-v="1">악몽</div></div>' : '') +
      '<div style="margin-left:auto" class="rpill stroke-s">' + ic('torch') + S.torch + '/' + TORCH_MAX + '</div></div>';
    $('#s-map').classList.toggle('nmmap', NMm);
    show('s-map');
    const sc = $('#mapscroll'); const y = pos[Math.min(PCH, C.length) - 1][1]; sc.scrollTop = Math.max(0, y - 640);
  }
  /* 장별 원소 약점·새 건물 안내 */
  function elInfo(n, nm) { const D = window.JZD; if (!D || !D.chEl) return ''; const x = D.chEl(n, nm), E = D.EL[x.el]; const heroes = COMPS.filter(c => D.COMP && D.COMP[c.id] && D.COMP[c.id].el === x.el && S.comps[c.id] && S.comps[c.id].own).map(c => c.n);
    const nb = !nm && D.TUR_UNLOCK ? Object.keys(D.TUR_UNLOCK).filter(k => D.TUR_UNLOCK[k] === n).map(k => D.TUR[k].name) : [];
    return '<div class="xel" style="border-color:' + E.c + '"><b style="color:' + E.c + '">이 장의 좀비 약점 · ' + E.n + ' 속성 피해 +' + Math.round(x.k * 100) + '%</b><div>' + (heroes.length ? '유리한 내 영웅: ' + heroes.join(', ') : E.n + ' 속성 영웅·기술을 데려가면 유리해요') + '</div>' + (nb.length ? '<div style="color:#9ef0c0">새 건물 열림: ' + nb.join(', ') + '</div>' : '') + '</div>'; }
  function chapModal(n) {
    const c = chapters()[n - 1], rec = Math.round(900 * Math.pow(n, 1.6)), st = stats();
    if (isNM()) { const nr = Math.round(900 * Math.pow(n + 29, 1.6) * 1.6); modal('<h3 class="stroke" style="color:#ff7a6a">악몽 ' + n + ' · ' + c.name + '</h3>' +
      '<div style="height:200px;border-radius:16px;background:url(img/ui/map_bg.jpg) center ' + (100 - (n - 1) * 11) + '%/cover;border:3px solid #ff5a4a;margin-bottom:14px;filter:hue-rotate(-30deg) saturate(1.6) brightness(.75)"></div>' +
      elInfo(n, true) + '<p>적이 훨씬 세고 많아요. 우두머리는 일찍 분노하고, 역병 걸린 좀비는 죽으며 독 웅덩이를 남겨요.</p>' +
      '<p>보상: 엽전·경험치 2배, 신화 장비 확률, 첫 클리어 옥 ' + (100 + 10 * n) + '</p>' +
      '<p>권장 전투력 <b style="color:' + (st.power >= nr ? '#7df06a' : '#ff8e8e') + '">' + fmt(nr) + '</b> · 내 전투력 ' + fmt(st.power) + '</p>' +
      '<div class="row"><div class="btn r" data-act="go" data-v="' + n + '" style="flex-direction:column;gap:0"><span>악몽 도전</span><small style="font-size:18px">횃불 5</small></div></div>'); return; }
    modal('<h3 class="stroke">챕터 ' + n + ' · ' + c.name + '</h3>' + '<p style="text-align:center;color:#ffe3a3;font-weight:700;margin:-4px 0 10px">' + chStory(n) + '</p>' +
      '<div style="height:200px;border-radius:16px;background:url(img/ui/map_bg.jpg) center ' + (100 - (n - 1) * 11) + '%/cover;border:3px solid #ffd36b;margin-bottom:14px"></div>' +
      elInfo(n, false) + '<p>밤 ' + c.waves + '번을 버티면 이겨요. 마지막 밤에는 우두머리가 나와요.</p>' +
      '<p>권장 전투력 <b style="color:' + (st.power >= rec ? '#7df06a' : '#ff8e8e') + '">' + fmt(rec) + '</b> · 내 전투력 ' + fmt(st.power) + '</p>' +
      '<p>최고 기록: ' + (S.best[n] ? '밤 ' + S.best[n] + '/' + c.waves : '없음') + '</p>' +
      '<div class="row"><div class="btn y" data-act="go" data-v="' + n + '" style="flex-direction:column;gap:0"><span>도전하기</span><small style="font-size:18px;display:flex;gap:4px;align-items:center;color:#7a3300">' + ic('torch').replace('class="ic ', 'style="width:26px;height:26px" class="ic ') + '5</small></div></div>' +
      '<p style="margin-top:16px;color:#ffe27a">다른 방식으로 도전하기</p><div class="row" style="flex-wrap:wrap;gap:10px">' +
      [['challenge', '극한 도전', '미션 3개 별 3개'], ['endless', '무한 방어선', '끝없이 버티기'], ['gold', '엽전 던전', '엽전 3배'], ['xp', '경험치 던전', '경험치 3배'], ['boss', '우두머리 토벌', '피해량 기록']].map(m => '<div class="btn ' + (m[0] === 'boss' ? 'r' : 'b') + '" data-act="mode" data-v="' + m[0] + ':' + n + '" style="flex-direction:column;gap:0;min-width:180px"><span>' + m[1] + '</span><small style="font-size:16px">' + m[2] + (S.modeBest && S.modeBest[m[0] + n] ? ' · 최고 ' + S.modeBest[m[0] + n] : '') + '</small></div>').join('') + '</div>');
  }

  /* ---------------- 전투 시작과 결과 ---------------- */
  let lastCh = 1;

  /* 장 사이 대화 (사용자 11-27) — 처음 한 번, 도감 이야기에서 다시 보기 */
  const CH_DLG = {"1":[["bs","처용님! 바다에서 온 검은 배에서 역병이 번지고 있어요!","Cheoyong! A plague spreads from the black ship!"],["cy","걱정 마시오. 이 마을은 내가 지키겠소.","Do not fear. I will guard this village."],["hero","함께 싸우겠소, 처용!","I will fight beside you, Cheoyong!"]],"3":[["cy","좀비들이 무리를 지어 움직인다… 누군가 부리고 있어.","They move in packs… someone commands them."],["hero","그냥 역병이 아니란 말이오?","So this is no ordinary plague?"]],"6":[["bs","밤마다 굿판이 벌어지더니 죽은 이들이 일어났어요!","Every night a rite was held, and the dead rose!"],["cy","어둠의 세력이 깨어났군. 서둘러야겠소.","The dark powers have awakened. We must hurry."]],"7":[["cy","오늘 밤은 공기가 다르다… 무언가 지켜보고 있어.","The air feels different tonight… something is watching."],["hero","등골이 서늘하오. 조심합시다.","A chill runs down my spine. Stay alert."]],"9":[["hero","처용, 그 그림자는 누구였소?","Cheoyong, who was that shadow?"],["cy","역신. 옛날 내 춤에 쫓겨난 역병의 귀신이오.","Yeoksin. The plague spirit my dance once drove out."],["cy","놈이 돌아왔다면… 이번엔 끝을 봐야 하오.","If he is back… this time it must end."]],"12":[["bs","궁궐 쪽 하늘이 보랏빛으로 물들었어요…","The sky over the palace has turned purple…"],["cy","놈이 힘을 모으고 있다.","He is gathering power."]],"14":[["ys","처용, 오늘 밤엔 직접 상대해 주마.","Cheoyong, tonight I face you myself."],["cy","바라던 바다. 이번엔 놓치지 않겠다!","Just what I wanted. You will not escape!"],["hero","수호자들이 모두 함께하겠소!","All the guardians stand with you!"]],"15":[["hero","놈이 물러났소. 하지만 끝이 아니오.","He retreated. But this is not over."],["cy","다음엔 반드시 끝을 내겠다.","Next time I will finish it."]],"18":[["bs","얼어붙은 성에서 북소리가 들려요… 무서워요.","Drums echo from the frozen fortress…"],["cy","두려워 마시오. 수호자들이 깨어나고 있소.","Fear not. The guardians are awakening."]],"21":[["cy","흑룡 대장… 역신의 오른팔이 나섰군.","The Black Dragon General… Yeoksin's right hand."],["hero","오른팔을 꺾으면 몸통도 흔들리겠지!","Break the arm and the body will shake!"]],"22":[["ys","또 만났구나. 이번엔 지난번과 다를 것이다.","We meet again. This time will be different."],["cy","나도 지난번의 처용이 아니다.","Nor am I the Cheoyong you met before."]],"24":[["hero","궁궐까지 얼마 남지 않았소!","The palace is close now!"],["cy","사당을 하나씩 지키며 나아가자.","We push on, shrine by shrine."]],"27":[["bs","임금님마저 역병에 쓰러지셨대요…","They say even the king has fallen ill…"],["cy","아직 늦지 않았다. 역신만 쓰러뜨리면 된다.","It is not too late. We only need to defeat Yeoksin."]],"30":[["ys","여기가 네 무덤이다, 처용!","This is your grave, Cheoyong!"],["cy","천 년 전처럼, 춤으로 너를 몰아내리라!","As long ago, my dance will drive you out!"],["hero","조선의 수호자들이여, 마지막 밤이다!","Guardians of Joseon, this is the final night!"]]};
  function chDlg(n, done, force) { const L = CH_DLG[n]; S.dlg = S.dlg || {}; if (!L || (!force && S.dlg[n])) return false; S.dlg[n] = 1; save();
    const hid = (S.team || []).find(id => S.comps[id] && S.comps[id].own) || 'dokkaebi', EN = !!window.IS_EN;
    const SP = { cy: ['img/ui/hero_face.webp', EN ? 'Cheoyong' : '처용', '#ffcf6a'], ys: ['img/story/op3.webp', EN ? 'Yeoksin' : '역신', '#c98aff'], bs: ['img/story/op2.webp', EN ? 'Villager' : '백성', '#cfe8b0'], hero: ['img/ui/hero_' + hid + '.webp?v=4', (COMP[hid] && COMP[hid].n) || hid, '#8fd4ff'] };
    let i = 0; const ov = document.createElement('div'); ov.id = 'kzdlg';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(4,6,12,.78);display:flex;flex-direction:column;justify-content:flex-end;align-items:center;touch-action:manipulation';
    const ch = chapters()[n - 1] || {};
    const draw = () => { const l = L[i], s = SP[l[0]]; ov.innerHTML = '<div style="position:absolute;top:12%;left:0;right:0;text-align:center;color:#ffe3a3;font-weight:900;font-size:20px;text-shadow:0 2px 6px #000">' + (EN ? 'Chapter ' : '') + n + (EN ? '' : '장') + ' · ' + (ch.name || '') + '</div>' +
      '<div style="position:absolute;top:10px;right:12px;padding:8px 14px;border-radius:99px;background:rgba(255,255,255,.12);color:#fff;font-weight:800;font-size:14px" data-skip="1">' + (EN ? 'Skip ▶▶' : '건너뛰기 ▶▶') + '</div>' +
      '<div style="width:min(94vw,480px);margin:0 0 7vh;display:flex;gap:12px;align-items:flex-end">' +
      '<div style="flex:none;width:92px;height:92px;border-radius:50%;border:4px solid ' + s[2] + ';background:#222 url(' + s[0] + ') center 30%/cover;box-shadow:0 6px 18px rgba(0,0,0,.6)"></div>' +
      '<div style="flex:1;background:linear-gradient(180deg,#2a2018,#18120d);border:3px solid ' + s[2] + ';border-radius:16px;padding:10px 14px 14px;color:#fff6e0;box-shadow:0 8px 24px rgba(0,0,0,.5)">' +
      '<div style="font-weight:900;color:' + s[2] + ';font-size:16px;margin-bottom:4px">' + s[1] + '</div><div style="font-size:17px;line-height:1.45;font-weight:700">' + (EN ? l[2] : l[1]) + '</div>' +
      '<div style="text-align:right;font-size:12px;opacity:.6;margin-top:4px">' + (i + 1) + '/' + L.length + ' ▼</div></div></div>'; };
    const end = () => { ov.remove(); if (done) done(); };
    ov.addEventListener('click', ev => { if (ev.target.closest('[data-skip]')) return end(); i++; if (i >= L.length) end(); else draw(); });
    draw(); document.body.appendChild(ov); return true; }
  window.KZ_chDlg = chDlg;
  function startBattle(n) {
    if (!S.nextWB && S.nextMode !== 'arena' && S.nextMode !== 'boss' && chDlg(n, () => startBattle(n))) return;
    tickTorch(); const WBX = S.nextWB || null, ARX = S.nextMode === 'arena' ? S.nextAR || null : null;
    if (!WBX && !ARX && S.torch < 5) { modal('<h3 class="stroke">횃불이 모자라요</h3><p>챕터에 들어가려면 횃불 5개가 필요해요. 횃불은 6분마다 1개씩 차요.</p><div class="row"><div class="btn r" data-act="buy" data-v="torch30">옥 40으로 30개 채우기</div></div>'); return; }
    if (!WBX && !ARX && S.torch >= TORCH_MAX) S.torchT = now();
    if (!WBX && !ARX) S.torch -= 5; S.quests.battle = (S.quests.battle || 0) + 1; S.plays++; lastCh = n; save();
    closeModal();
    const st = stats();
    const cfg = { afx: afxSum(), skin: S.skin && S.skin !== 'base' ? S.skin : null, chapter: n, heroLv: S.lv, atk: st.atk / 100, hp: st.hp / 1000, companions: S.team.filter(id => S.comps[id] && S.comps[id].own).slice(0, 2), skillStars: Object.assign({}, S.skills), weapon: (byUid(S.equip.weapon) || {}).w || 'bow', items: Object.values(S.equip).map(byUid).filter(Boolean).map(it => ({ id: jziId(it), grade: (it.g === 5 ? 4 : it.g >= 6 ? 5 : it.g), lv: it.lv })).filter(x => x.id), itemsFxOnly: true, mode: S.nextMode || 'adventure', hqLv: 1, sets: setsOf(), nightmare: !S.nextMode && isNM(), mount: S.mount || null, wbBoss: WBX ? WBX.boss : null, wbName: WBX ? WBX.name : null, arena: ARX }; S.nextMode = null; S.nextWB = null; S.nextAR = null; lastWB = WBX;
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
  let lastWB = null;
  function onEnd(r) {
    if (r && r.mode === 'arena') { try { arEnd(r); } catch (e) { console.warn(e); meta.classList.remove('off'); } return; }
    try { if (lastWB && r && r.mode === 'boss') { wbRecord(lastWB, Math.round(r.bossDmg || 0)); } } catch (e) { console.warn(e); } lastWB = null;
    try { xOnEnd(r || {}); } catch (e) { console.warn(e); }
    try { runSync(r); } catch (e) { console.warn(e); }
    try { if (arguments[0] && arguments[0].mode && arguments[0].mode !== 'adventure') { const r0 = arguments[0]; S.modeBest = S.modeBest || {}; const key = r0.mode + r0.chapter, val = r0.mode === 'endless' ? r0.wave + '밤' : r0.mode === 'boss' ? fmt(r0.bossDmg || 0) : r0.mode === 'challenge' ? '★' + (r0.stars || 0) : (r0.win ? '완료' : '실패'); S.modeBest[key] = val; } } catch (e) {}
    r = r || {};
    meta.classList.remove('off');
    try { window.JZB && window.JZB.hide && window.JZB.hide(); } catch (e) {}
    const n = r.chapter || lastCh, C = chapters(), c = C[n - 1] || C[0], waves = r.waves || c.waves, wave = Math.min(r.wave || 0, waves);
    const win = !!r.win, NMr = !!r.nightmare; if (!S.nm) S.nm = { chap: 1, stars: {}, best: {}, first: {} };
    const STb = NMr ? S.nm.stars : S.stars, BSb = NMr ? S.nm.best : S.best, wasOpen = nmOpen();
    const stars = win ? (wave >= waves ? 3 : 2) : wave >= waves * 0.66 ? 2 : wave >= waves * 0.33 ? 1 : 0;
    if (stars > (STb[n] || 0)) STb[n] = stars;
    if (wave > (BSb[n] || 0)) BSb[n] = wave;
    const unlocked = NMr ? (win && n === S.nm.chap && S.nm.chap < C.length) : (win && n === S.chap && S.chap < C.length);
    if (unlocked) { if (NMr) S.nm.chap++; else { S.chap++; S.sel = S.chap; } }
    const nmFirst = NMr && win && !S.nm.first[n] ? 100 + 10 * n : 0; if (nmFirst) S.nm.first[n] = 1;
    if (!NMr && win && n === C.length && !S.seenEnd1) { S.seenEnd1 = 1; setTimeout(() => { try { storyCuts(END_CUTS, i => 'end' + (i + 1), null); } catch (e) {} }, 1500); }
    const act2 = !NMr && !wasOpen && nmOpen(), nmTitle = NMr && win && n === 30 && !S.title; if (nmTitle) S.title = '악몽을 넘은 자';
    const tk = Math.min(2.4, Math.max(1, +r.tierK || 1)) * (NMr ? 2 : 1), gold = Math.round(((r.gold || 0) + (win ? 400 : 150) * n + (r.kills || 0) * 2) * tk);   /* 판 등급만큼 보상도 */
    const exp = Math.round((win ? 90 : 40) * n * tk);
    const stone = win ? 4 + n * 2 : Math.floor(n * wave / waves * 2);
    ITEM_SRC = (NMr ? '악몽 ' : '') + n + '장 우두머리 처치'; ITEM_CH = NMr ? 30 + n : n; const capD = maxG(ITEM_CH), drop = win ? mkItem(rnd(SLOTS).id, rareUp(Math.min(capD, rollGrade(Math.max(0, capD - 2), capD) + (Math.random() < 0.3 ? 1 : 0)), ITEM_CH, 'box')) : null; ITEM_CH = 0; rareShow(drop);   /* 우두머리 상자: 그 장 문(GATE)을 넘지 않음, 확률만 조금 높음 */ ITEM_SRC = '';
    const ob = r.objective || null, obJade = ob && ob.ok ? 20 + 5 * n : 0;
    const rw = { gold, exp, stone, drop, jade: (win && unlocked ? 50 : 0) + obJade + nmFirst, dbl: false };
    S.gold += gold; S.stone += stone; S.jade += rw.jade; if (drop) S.inv.push(drop);
    if (win && ((r.nemBox | 0) > 0 || (n === 30 && !NMr))) { ITEM_SRC = '숙적 보상 상자'; ITEM_CH = NMr ? 30 + n : n; const capN = maxG(ITEM_CH); for (let k = 0; k < Math.max(1, r.nemBox | 0); k++) { const nb = mkItem(rnd(SLOTS).id, rareUp(rollGrade(Math.max(0, capN - 1), capN), ITEM_CH, 'nem')); S.inv.push(nb); rareShow(nb); rw.nemDrop = nb; } ITEM_CH = 0; ITEM_SRC = ''; }   /* 숙적(14·22장 퇴장, 30장 처치) 장비 상자: 가끔 확률 nem */
    const lvUp = addExp(exp); save();
    lastRw = rw;
    const d = r.dmg || {}, tot = Math.max(1, (d.skill || 0) + (d.hero || 0) + (d.building || 0) + (d.player || 0));
    const rows = [['skill', '신력', 'tPower', '#9a4ef0', 'linear-gradient(90deg,#b070ff,#6a20c0)'], ['hero', '영웅', 'tComp', '#2b9520', 'linear-gradient(90deg,#9df27a,#2b9520)'], ['building', '건물', 'skGun', '#1d62c9', 'linear-gradient(90deg,#7fd0ff,#1d62c9)'], ['player', '처용', 'bow', '#c0301b', 'linear-gradient(90deg,#ffb02a,#e0401b)']];
    const el = $('#s-result'); el.className = 'm-scr ' + (win ? '' : 'lose');
    el.innerHTML = '<div class="rays"></div><div class="rtitle"><span>' + (win ? '승리' : '패배') + '</span></div>' +
      '<div class="rsub stroke-s">' + (NMr ? '<span style="color:#ff7a6a">악몽</span> ' : '챕터 ') + n + ' · ' + c.name + (unlocked ? ' · 다음 챕터 열림!' : '') + (nmFirst ? ' · 첫 클리어 옥 +' + nmFirst : '') + '</div>' +
      (ob ? '<div class="robj stroke-s ' + (ob.ok ? 'ok' : 'no') + '">목표 · ' + String(ob.name || '').replace(/[<>&]/g, '') + ' — ' + (ob.ok ? '달성! 옥 +' + obJade : '실패') + '</div>' : '') +
      '<div class="rinfo"><div class="stat stroke-s">밤 ' + wave + '/' + waves + '</div><div class="stat stroke-s">물리친 좀비 ' + fmt(r.kills || 0) + '</div><div class="stat stroke-s">' + Math.floor((r.time || 0) / 60) + '분 ' + ((r.time || 0) % 60) + '초</div></div>' +
      '<div class="dmg box"><h4 class="stroke-s">피해 비율</h4>' + rows.map(([k, nm, i, bg, grad]) => { const p = Math.round((d[k] || 0) / tot * 100); return '<div class="drow"><div class="ic2" style="background:' + bg + '">' + ic(i) + '</div><div class="nm stroke-s">' + nm + '</div><div class="bar"><i data-w="' + p + '" style="background:' + grad + '"></i></div><div class="pc stroke-s">' + p + '%</div></div>'; }).join('') +
      '<div style="text-align:center;font-size:18px;color:#cdd6ff;margin-top:6px">전체 피해 ' + fmt(tot) + '</div></div>' +
      '<div class="rew box"><h4 class="stroke-s">보상' + (lvUp ? ' · <span style="color:#7df06a">레벨 올라감! ' + S.lv + '</span>' : '') + '</h4><div class="rewl" id="rewl">' + rewHtml(rw) + '</div></div>' +
      '<div class="rbtns"><div class="btn p" data-act="adx2" id="adx2"><span>광고 보고 2배</span><small>시제품: 광고 없이 바로</small></div><div class="btn y" data-act="rok"><span>확인</span></div></div>';
    show('s-result'); music('bgm_lobby');
    if (act2) setTimeout(() => modal('<div class="act2"><div class="a2t stroke">2막 열림</div><h3 class="stroke" style="color:#ff6a5a">악몽의 조선</h3><p>역신을 물리쳤지만 조선의 밤은 끝나지 않았다. 더 강한 좀비와 역병이 몰려온다.</p><p>지도에서 <b>악몽</b>을 눌러 2막에 도전하세요. 신화 장비와 칭호가 기다려요.</p><div class="row"><div class="btn r" data-act="map">악몽 지도로</div></div></div>'), 900);
    if (nmTitle) setTimeout(() => modal('<h3 class="stroke" style="color:#ffd36b">칭호 획득!</h3><p style="text-align:center;font-size:30px;color:#ff7a6a">악몽을 넘은 자</p><p style="text-align:center">프로필에 칭호가 새겨졌어요.</p>'), 900);
    setTimeout(() => el.querySelectorAll('.drow .bar i').forEach(i => { i.style.width = i.dataset.w + '%'; }), 120);
  }
  let lastRw = null;
  function rewHtml(rw) {
    const m = rw.dbl ? 2 : 1;
    const box = (i, v, g) => '<div class="rw" style="border-color:' + GR[g].c + ';background:rgba(0,0,0,.4)">' + ic(i) + '<b class="stroke-s">' + fmt(v) + '</b></div>';
    return box('coin', rw.gold * m, 4) + box('stone', rw.stone * m, 3) + '<div class="rw" style="border-color:#7df06a;background:rgba(0,0,0,.4);font-size:22px;flex-direction:column"><span class="stroke-s" style="color:#7df06a">경험</span><b class="stroke-s" style="position:static">' + fmt(rw.exp) + '</b></div>' +
      (rw.jade ? box('jade', rw.jade, 4) : '') +
      (rw.drop ? '<div class="rw rwdrop g' + rw.drop.g + '" style="--gc:' + GR[rw.drop.g].c + '">' + itemImg(rw.drop) + '<b class="stroke-s" style="font-size:14px;left:4px;right:4px;text-align:center">' + itemName(rw.drop) + '</b></div><div class="rwsrc stroke-s">새 장비 <b style="color:' + GR[rw.drop.g].c + '">' + GR[rw.drop.g].n + ' ' + itemName(rw.drop) + '</b> · 입수: ' + (rw.drop.src || '전투 보상') + '</div>' : '');
  }

  /* ---------------- 모달들 ---------------- */
  const JZI_MAP = { hat: 'h_jeonrip', robe: 'r_dujeong', arm: 'g_gauntlet', shoes: 's_mituri', norigae: 'a_tiger' };
  const jziId = it => it.slot === 'weapon' ? 'w_' + (it.w || 'bow') : JZI_MAP[it.slot];
  /* 등급별 특수 효과 목록: [필요 등급, 설명, 열림 여부] */
  function itemFx(it) { const J = window.JZI && JZI.ITEMS[jziId(it)]; if (!J) return []; const gq = it.g === 5 ? 4 : it.g >= 6 ? 5 : it.g; return [3, 4, 5].map(g => [g, J.fx[g][1], gq >= g]); }
  function fxHtml(it) { const GN = ['일반', '우수', '희귀', '영웅', '전설', '신화']; return itemFx(it).map(f => '<p style="font-size:18px;margin:2px 0;color:' + (f[2] ? '#ffe27a' : 'rgba(255,255,255,.45)') + '">' + (f[2] ? '★ ' : '잠김 ') + GN[f[0]] + ': ' + f[1] + '</p>').join(''); }
  let IUP = false;
  function itemModal(uid) {
    eqx(); const it = byUid(uid); if (!it) return; if (it.nw) { it.nw = 0; save(); try { renderLobby(); } catch (e) {} }
    const s = SLOT[it.slot], cur = byUid(S.equip[it.slot]), eq = cur && cur.uid === it.uid, c = upCost(it), cap = LV_CAP(it);
    const stN = s.st === 'atk' ? '공격력' : '체력', v0 = itemVal(it), v1 = it.lv < cap ? itemVal(Object.assign({}, it, { lv: it.lv + 1 })) : v0, q = it.q || 100;
    const canUp = it.lv < cap && S.gold >= c.gold && (S.ore || 0) >= c.ore;
    const sgn = x => (x >= 0 ? '+' : '') + x;
    const cmp = eq ? '' : (() => { const a = stats(), b = powerWith(it), dp = Math.round(b.power - a.power), da = a.atk ? Math.round((b.atk / a.atk - 1) * 1000) / 10 : 0, dh = a.hp ? Math.round((b.hp / a.hp - 1) * 1000) / 10 : 0;
      return '<div class="gd-cmp"><div class="gd-cp"><span>전투력</span><b>' + fmt(Math.round(a.power)) + '</b><i>→</i><b class="' + (dp >= 0 ? 'up' : 'dn') + '">' + fmt(Math.round(b.power)) + '</b><em class="' + (dp >= 0 ? 'up' : 'dn') + '">' + (dp >= 0 ? '▲ ' : '▼ ') + fmt(Math.abs(dp)) + '</em></div>' +
        '<div class="gd-cs"><span>공격력 <b class="' + (da >= 0 ? 'up' : 'dn') + '">' + sgn(da) + '%</b></span><span>체력 <b class="' + (dh >= 0 ? 'up' : 'dn') + '">' + sgn(dh) + '%</b></span><span class="gd-cur">' + (cur ? '지금 착용 · ' + itemName(cur) + ' Lv' + cur.lv : '빈 칸') + '</span></div></div>'; })();
    const af = (it.af || []).map(([k, v]) => '<div class="gd-af"><span>' + AFX[k][0] + '</span><b>+' + v + AFX[k][3] + '</b></div>').join('');
    const uq = (it.uq || []).map(u => UQ[u] ? '<div class="gd-uq"><b>★ ' + UQ[u][0] + '</b><span>' + UQ[u][1] + '</span></div>' : '').join('');
    const GNX = { 3: '영웅', 4: '전설', 5: '신화' }, fxA = itemFx(it), fxOn = fxA.filter(f => f[2]), fxNext = fxA.find(f => !f[2]), fxTop = fxOn[fxOn.length - 1]; /* 지금 등급 효과 하나 + 다음 등급 하나만(사용자 11-27: 신화에 영웅·전설 설명 불필요) */
  const fx = (fxTop ? '<div class="gd-fx on"><i>◆</i><em>' + GNX[fxTop[0]] + '</em><span>' + fxTop[1] + '</span></div>' + (fxOn.length > 1 ? '<div class="gd-fx sub">' + '아래 등급 효과도 함께 적용' + '</div>' : '') : '') + (fxNext ? '<div class="gd-fx off"><i>🔒</i><em>' + GNX[fxNext[0]] + '</em><span>' + fxNext[1] + '</span></div>' : '');
    const extra = (it.w && window.JZD && JZD.WEAPON && JZD.WEAPON[it.w] ? '<div class="gd-note">' + JZD.WEAPON[it.w].d + '</div>' : '') + (it.set ? '<div class="gd-note" style="color:' + SETS[it.set].c + '">' + SETS[it.set].n + ' ' + (setsOf()[it.set] || 0) + '/6 · 2부위 ' + SETS[it.set].b[0] + ' · 4부위 ' + SETS[it.set].b[1] + ' · 6부위 ' + SETS[it.set].b[2] + '</div>' : '') + (it.sg ? '<div class="gd-note" style="color:#ff9a8a">' + SG[it.sg].d + '</div>' : '');
    const up = IUP ? '<div class="gd-upp">' + (it.lv < cap ? '<div class="gd-upl">Lv ' + it.lv + ' → ' + (it.lv + 1) + ' · ' + stN + ' ' + fmt(v0) + ' → <b>' + fmt(v1) + '</b> <em>(+' + fmt(v1 - v0) + ')</em></div><div class="gd-cost">엽전 ' + fmt(c.gold) + ' · 정련석 ' + c.ore + ' <small>(보유 ' + fmt(S.ore || 0) + ')</small></div><div class="gd-chips"><div class="gd-chip ' + (canUp ? '' : 'dis') + '" data-act="itemUp" data-v="' + uid + '">강화</div><div class="gd-chip ' + (canUp ? '' : 'dis') + '" data-act="itemUp10" data-v="' + uid + '">×10</div><div class="gd-chip ' + (canUp ? '' : 'dis') + '" data-act="itemUpMax" data-v="' + uid + '">최대</div></div>' : '<div class="gd-upl">최대 레벨이에요. 같은 장비로 승급하면 더 올라가요</div>') + '</div>' : '';
    const subB = eq ? '<div class="gd-btn sub" data-act="unequip" data-v="' + uid + '">해제</div>' : it.lk ? '<div class="gd-btn sub dis">잠김</div>' : '<div class="gd-btn sub" data-act="salvage" data-v="' + uid + '">분해 <small>+' + salvVal(it).ore + '</small></div>';
    const mainB = eq ? '<div class="gd-btn main" data-act="swap" data-v="' + it.slot + '">교체</div>' : '<div class="gd-btn main" data-act="equip" data-v="' + uid + '">' + (cur ? '착용 (교체)' : '착용') + '</div>';
    modal('<div class="gd gq' + it.g + '" style="--gc:' + GR[it.g].c + '">' +
      '<div class="gd-hd"><span class="gd-badge">' + GR[it.g].n + '</span><span class="gd-t">' + itemName(it) + '</span><span class="gd-lk' + (it.lk ? ' on' : '') + '" data-act="lock" data-v="' + uid + '">' + (it.lk ? '🔒' : '🔓') + '</span></div>' +
      '<div class="gd-top"><div class="gd-pic slot g' + it.g + '">' + itemImg(it) + (it.lv > 1 ? '<div class="gd-plus">+' + (it.lv - 1) + '</div>' : '') + '</div><div class="gd-main"><div class="gd-stat"><span>' + stN + '</span><b>' + fmt(v0) + '</b></div><div class="gd-q"><i style="width:' + Math.max(6, Math.min(100, (q - 85) / 30 * 100)) + '%"></i><span>품질 ' + q + '%</span></div><div class="gd-meta">' + s.n + ' · Lv ' + it.lv + '/' + cap + ' · T' + (it.t || 1) + (eq ? ' · <b>착용 중</b>' : '') + '</div></div></div>' +
      cmp + (af ? '<div class="gd-sec">' + af + '</div>' : '') + (uq ? '<div class="gd-sec">' + uq + '</div>' : '') + '<div class="gd-sec">' + fx + extra + '</div>' + up +
      '<div class="gd-src">입수 · ' + (it.src || (it.nw === undefined ? '이전 기록 없음' : '보상')) + '</div>' +
      '<div class="gd-foot">' + subB + '<div class="gd-btn up' + (IUP ? ' on' : '') + '" data-act="itemUpTog" data-v="' + uid + '">강화</div>' + mainB + '</div></div>');
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
  /* 모두 받기: 받을 수 있는 보상을 한 번에 */
  const allBtn = (act, n) => n > 0 ? '<div class="btn y xall" data-act="' + act + '">모두 받기 (' + n + ')</div>' : '';
  const achReady = () => ACH.filter(a => !S.ach[a.id] && a.v() >= a.need);
  const passReady = () => { const lv = Math.min(PASS_N, Math.floor(S.pass.xp / PASS_XP)), o = []; for (let i = 0; i < lv; i++) { if (!S.pass.f[i]) o.push('f' + i); if (S.pass.paid && !S.pass.p[i]) o.push('p' + i); } return o; };
  const cdReady = () => { const o = [], keep = cdTab; for (const t of ['hero', 'zom', 'item']) { cdTab = t; for (const x of codexItems()) if (x.own && !S.codex[t][x.k]) o.push([t, x]); } cdTab = keep; return o; };
  const qReady = () => QUESTS.filter(q => (S.quests[q.id] || 0) >= q.need && !(S.quests.got || {})[q.id]);
  function questModal() {
    modal('<h3 class="stroke">오늘의 임무</h3>' + allBtn('qAll', qReady().length) + QUESTS.map(q => {
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
  const CPN = { '1c3xotbdevi': { jade: 0, starter: 1 }, 'emcd515lgu': { jade: 10000, rep: true }, 'xtc3izhfdg': { jade: 300 }, '1g0kle3wmjk': { jade: 10000, rep: true }, 'ii2xa7zzi3': { jade: 300 }, '17tfciwa04h': { jade: 100000 } };
  const cpnHash = (str, seed) => { let h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0); for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); };
  /* 신규 스타트팩(990원, 계정당 1회): 홍길동 + 영웅 장비 4점 + 옥 300 + 횃불 20. 결제 전에는 시험 쿠폰으로만 받는다 */
  const stBorn = () => { if (!S.born) S.born = Date.now(); return S.born; };
  const stShow = () => !S.starter && Date.now() - stBorn() < 7 * 864e5;
  const stDays = () => Math.max(1, Math.ceil((stBorn() + 7 * 864e5 - Date.now()) / 864e5));
  function grantStarter() {
    if (S.starter) return; S.starter = Date.now();
    const hc = S.comps.honggildong; if (hc) { if (hc.own) hc.sh += 10; else hc.own = true; }
    ITEM_SRC = '신규 스타트팩'; const got = ['weapon', 'hat', 'robe', 'arm'].map(sl => { const it = mkItem(sl, 3, 'bow'); S.inv.push(it); return it; }); ITEM_SRC = '';
    S.jade += 300; S.torch = Math.min(99, (S.torch || 0) + 20); save(); closeModal(); refresh();
    modal('<h3 class="stroke">신규 스타트팩을 받았어요!</h3><div style="text-align:center;font-size:19px;line-height:1.6">영웅 <b style="color:#e39bff">홍길동</b>' + (hc && hc.sh >= 10 && hc.own ? ' (이미 있어 조각 10개)' : '') + '<br>영웅 등급 장비 ' + got.length + '점 (무기·갓·도포·토시)<br>옥 300 · 횃불 20</div><div class="row"><div class="btn y" data-act="tab" data-v="equip">장비 끼러 가기</div></div>');
  }

  /* ---------------- 결제 (웹: 토스페이먼츠 결제창 v2 / 앱: 구글 플레이 결제) ----------------
     지금은 '시험 결제'(토스 문서의 공개 시험 키) — 실제 돈은 나가지 않는다. 실결제는 PAY_CK 를 live_ck 로, 서버 환경변수 TOSS_SECRET_KEY 를 live_sk 로 바꾸면 된다.
     승인은 /api/kzpay/confirm (Cloudflare Pages Functions) 에서 하고, 받은 영수증(kz_pay_rcpt)의 주문번호마다 한 번만 지급한다. */
  const PAY_CK = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq', PAY_TEST = /^test_/.test(PAY_CK);
  /* 웹 결제 켜기: 사장님 토스 키(시험/실결제)를 받으면 true. 문서 공개 시험 키는 토스가 거부해 지금은 '결제 준비 중'으로 둔다. */
  const PAY_WEB_ON = false;
  const PLAY_PRICE = {}; /* 앱: 구글 플레이에서 읽은 실제 가격 표시 문자열 */
  const PAY_ITEMS = { jade300: [500, '옥 주머니 (옥 300)'], jade1k: [990, '옥 상자 (옥 1,000)'], starter: [990, '신규 스타트팩'], pass: [990, '황금 패스'] };
  const PAY_PLAY = { jade300: 'kz_jade_s', jade1k: 'kz_jade_m', starter: 'kz_starter', pass: 'kz_pass' };
  const isApp = () => { try { return /(^|[?&])src=app/.test(location.search) || sessionStorage.getItem('hk_src') === 'app' || document.referrer.indexOf('android-app://') === 0; } catch (e) { return false; } };
  const payNote = () => isApp() ? '구글 플레이' : (!PAY_WEB_ON ? '결제 준비 중' : (PAY_TEST ? '시험 결제' : ''));
  const payPriceTxt = item => (isApp() && PLAY_PRICE[item]) || (PAY_ITEMS[item] ? PAY_ITEMS[item][0] + '원' : '');
  /* 앱이면 시작할 때 구글 플레이 가격을 미리 읽어 둔다 */
  setTimeout(async () => { if (!isApp() || !('getDigitalGoodsService' in window)) return; try { const svc = await window.getDigitalGoodsService('https://play.google.com/billing'); const det = await svc.getDetails(Object.values(PAY_PLAY)); for (const d of det || []) { const it = Object.keys(PAY_PLAY).find(k => PAY_PLAY[k] === d.itemId); if (it && d.price) PLAY_PRICE[it] = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: d.price.currency }).format(Number(d.price.value)); } } catch (e) { console.warn('play price', e); } }, 1500);
  function payModal(item) {
    const P = PAY_ITEMS[item]; if (!P) return;
    if (item === 'starter' && S.starter) { toast('스타트팩은 계정당 한 번이에요'); return; }
    if (item === 'pass' && S.pass && S.pass.paid) { toast('이미 황금 패스를 열었어요'); return; }
    const webOff = !isApp() && !PAY_WEB_ON;
    modal('<h3 class="stroke">' + P[1] + '</h3><p style="text-align:center;font-size:30px;margin:6px 0;color:#ffd36b"><b>' + payPriceTxt(item) + '</b></p>' +
      (webOff ? '<p style="text-align:center;color:#ffcf8a;font-size:16px">웹 결제는 준비 중이에요. 앱(구글 플레이)에서 살 수 있어요.</p>' : '') +
      (PAY_TEST && PAY_WEB_ON && !isApp() ? '<p style="text-align:center;color:#8fe0ff;font-size:16px">지금은 시험 결제예요. 실제 돈은 나가지 않아요.</p>' : '') +
      '<p style="font-size:15px;line-height:1.55;color:#d8cdef;margin:8px 4px">결제 즉시 지급되는 디지털 상품이에요. 결제 후 7일 이내, 쓰지 않은 상품은 환불(청약 철회)할 수 있어요. 지급된 상품을 쓰면 환불이 제한될 수 있어요.</p>' +
      (webOff ? '<div class="row"><div class="btn g dis" style="min-width:260px">결제 준비 중</div></div>' : '<div class="row"><div class="btn y" data-act="payGo" data-v="' + item + '" style="min-width:260px">' + (isApp() ? '구글 플레이로 결제' : '결제하기') + '</div></div>') +
      '<p style="text-align:center;margin-top:8px"><a href="pay/terms.html" target="_blank" style="color:#f0c35a;font-size:15px">유료 상품 이용 안내 · 환불 정책</a></p>');
  }
  async function payGo(item) {
    const P = PAY_ITEMS[item]; if (!P) return;
    if (isApp()) return payPlay(item);
    if (!PAY_WEB_ON) { toast('웹 결제는 준비 중이에요'); return; }
    try {
      if (!window.TossPayments) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v2/standard'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
      S.payCid = S.payCid || ('kzc_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36)); save();
      const orderId = 'kz-' + item.toLowerCase() + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const base = location.origin + location.pathname.replace(/[^/]*$/, '');
      const pay = window.TossPayments(PAY_CK).payment({ customerKey: S.payCid });
      await pay.requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: P[0] }, orderId, orderName: '조선좀비 ' + P[1], successUrl: base + 'pay/success.html', failUrl: base + 'pay/fail.html', card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false } });
    } catch (e) { if (e && e.code === 'USER_CANCEL') toast('결제를 취소했어요'); else { console.warn(e); toast('결제창을 열지 못했어요'); } }
  }
  /* 앱(TWA): Digital Goods API + Payment Request → 서버(/api/kzpay/play-verify)가 구글에 확인·소모 → 서명 영수증 → payClaim 지급 */
  let payBusy = false;
  async function payPlay(item) {
    if (payBusy) return; payBusy = true;
    let res = null;
    try {
      if (!('getDigitalGoodsService' in window) || !window.PaymentRequest) { toast('이 기기에서는 앱 결제를 쓸 수 없어요'); return; }
      const sku = PAY_PLAY[item]; if (!sku) return;
      const req = new PaymentRequest([{ supportedMethods: 'https://play.google.com/billing', data: { sku } }], { total: { label: 'Total', amount: { currency: 'KRW', value: '0' } } });
      try { res = await req.show(); } catch (e) { toast(e && e.name === 'AbortError' ? '결제를 취소했어요' : '결제창을 열지 못했어요'); return; }
      const token = res.details && res.details.purchaseToken;
      if (!token) { await res.complete('fail'); toast('결제 정보를 받지 못했어요'); return; }
      try { const pend = JSON.parse(localStorage.getItem('kz_play_pend') || '[]'); pend.push({ sku, token, t: Date.now() }); localStorage.setItem('kz_play_pend', JSON.stringify(pend.slice(-10))); } catch (e) {}
      const out = await playVerify(sku, token);
      await res.complete(out === 'ok' ? 'success' : 'fail').catch(() => {});
      if (out === 'not_configured') toast('앱 결제 확인을 준비 중이에요. 결제는 나중에 자동으로 지급돼요');
      else if (out === 'pending') toast('결제가 아직 처리 중이에요. 완료되면 지급돼요');
      else if (out !== 'ok') toast('결제 확인에 실패했어요. 다시 접속하면 자동으로 다시 확인해요');
    } catch (e) { console.warn(e); if (res) res.complete('fail').catch(() => {}); toast('앱 결제 중 문제가 생겼어요'); }
    finally { payBusy = false; }
  }
  /* 서버 확인 → 영수증 저장 → 지급. 성공하면 보류 목록에서 지운다 */
  async function playVerify(sku, token) {
    let r, j = {};
    try { r = await fetch('/api/kzpay/play-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: sku, purchaseToken: token, packageName: 'com.hankukin.kzombi' }) }); j = await r.json().catch(() => ({})); } catch (e) { return 'network'; }
    if (r.status === 503 || j.code === 'not_configured') return 'not_configured';
    if (!j.ok || !j.receipt) return j.code === 'PENDING' ? 'pending' : 'fail';
    try { const a = JSON.parse(localStorage.getItem('kz_pay_rcpt') || '[]'); a.push(j.receipt); localStorage.setItem('kz_pay_rcpt', JSON.stringify(a.slice(-50))); } catch (e) {}
    try { const pend = JSON.parse(localStorage.getItem('kz_play_pend') || '[]').filter(p => p.token !== token); localStorage.setItem('kz_play_pend', JSON.stringify(pend)); } catch (e) {}
    payClaim(); return 'ok';
  }
  /* 앱을 다시 열면: 확인 못 한 구매(보류)와 구글에 남은 미소모 구매를 다시 확인 */
  setTimeout(async () => {
    if (!isApp()) return;
    let pend = []; try { pend = JSON.parse(localStorage.getItem('kz_play_pend') || '[]'); } catch (e) {}
    try { if ('getDigitalGoodsService' in window) { const svc = await window.getDigitalGoodsService('https://play.google.com/billing'); const ex = await svc.listPurchases(); for (const p of ex || []) if (p.purchaseToken && !pend.some(x => x.token === p.purchaseToken)) pend.push({ sku: p.itemId, token: p.purchaseToken }); } } catch (e) { console.warn('listPurchases', e); }
    for (const p of pend) { try { await playVerify(p.sku, p.token); } catch (e) {} }
  }, 3000);
  /* 영수증 처리: 결제 성공 페이지가 남긴 영수증을 주문번호마다 한 번만 지급 */
  function payClaim() {
    let a = []; try { a = JSON.parse(localStorage.getItem('kz_pay_rcpt') || '[]'); } catch (e) {}
    S.paidIds = S.paidIds || []; let got = '';
    for (const r of a) {
      if (!r || !r.orderId || !r.sig || S.paidIds.indexOf(r.orderId) >= 0 || !PAY_ITEMS[r.item] || r.amount !== PAY_ITEMS[r.item][0]) continue;
      S.paidIds.push(r.orderId);
      if (r.item === 'jade300') S.jade += 300; else if (r.item === 'jade1k') S.jade += 1000;
      else if (r.item === 'starter') { if (!S.starter) grantStarter(); else S.jade += 300; }
      else if (r.item === 'pass') { S.pass = S.pass || {}; S.pass.paid = 1; }
      got = PAY_ITEMS[r.item][1];
    }
    if (got) { S.paidIds = S.paidIds.slice(-200); save(); toast(got + ' 지급 완료!'); try { refresh(); } catch (e) {} }
  }
  setTimeout(() => { try { payClaim(); } catch (e) { console.warn(e); } }, 1200);
  window.addEventListener('storage', e => { if (e.key === 'kz_pay_rcpt') try { payClaim(); } catch (e2) {} });
  function starterModal() {
    modal('<h3 class="stroke">신규 스타트팩</h3><div style="text-align:center"><div style="width:220px;height:220px;margin:0 auto;border-radius:20px;background:#2a1a3a url(img/ui/hero_honggildong.webp?v=4) center/cover;box-shadow:0 0 0 4px #e39bff"></div>' +
      '<p style="font-size:19px;line-height:1.6;margin:10px 0">영웅 <b style="color:#e39bff">홍길동</b> 바로 합류<br>영웅 등급 장비 4점 (무기·갓·도포·토시)<br>옥 300 · 횃불 20<br><small style="color:#ffd36b">계정당 한 번 · ' + (S.starter ? '이미 받았어요' : '남은 기간 ' + stDays() + '일') + '</small></p></div>' +
      '<div class="row">' + (S.starter ? '<div class="btn b dis">받음</div>' : '<div class="btn p" data-act="payBuy" data-v="starter" style="flex-direction:column;gap:0;min-width:300px"><span>990원</span><small style="font-size:16px">' + payNote() + '</small></div>') + '</div>' +
      '<div class="row"><div class="btn b" data-act="coupon">시험 쿠폰 입력</div></div>');
  }
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
    if (c.starter) { if (S.starter) { toast('스타트팩은 계정당 한 번이에요'); return; } S.cpn[k] = 1; grantStarter(); return; }
    S.cpn[k] = (S.cpn[k] || 0) + 1; S.jade += c.jade; save(); closeModal(); toast('쿠폰 보상: 옥 ' + fmt(c.jade)); refresh();
  }
  function settingsModal() {
    modal('<h3 class="stroke">설정</h3>' + accountBox() + '<div class="row"><div class="btn ' + (S.music ? 'g' : 'b') + '" data-act="toggleMusic">' + ic(S.music ? 'note' : 'noteOff').replace('class="ic ', 'style="width:40px;height:40px" class="ic ') + (S.music ? '음악 켬' : '음악 끔') + '</div></div>' +
      '<div class="row"><div class="btn ' + (localStorage.getItem('kz_vib') === '0' ? 'b' : 'g') + '" data-act="toggleVib">' + (localStorage.getItem('kz_vib') === '0' ? '진동 끔' : '진동 켬') + '</div></div>' +
      '<div class="row"><div class="btn p" data-act="coupon">쿠폰 입력</div><div class="btn b" data-act="runlog">판 기록</div></div>' + '<div class="row"><div class="btn g" data-act="opening">' + (window.IS_EN ? 'Replay opening' : '오프닝 다시 보기') + '</div></div>' +
      '<p style="text-align:center;margin-top:20px">저장은 이 기기에 자동으로 돼요.</p><div class="row"><div class="btn r" data-act="reset">처음부터 다시</div></div>');
  }


  /* ---------------- 판 기록 (재미 점검용) ----------------
     battle.js가 판마다 이 기기에 남긴 기록(kz_runlog)을 장별로 묶어 보여 준다.
     로그인한 사람은 장마다 요약 한 줄을 서버에도 남긴다. 새 컬렉션 없이 leaderboards 보드만 쓴다.
       kzrun-c{장} (악몽은 kzrun-n{장}) : 내 줄 하나
         score = 도전 수*1e6 + 승리 수*1e4 + 마지막 판 도달 밤*100 + 그 장의 밤 수 (도전·승리는 99까지)
         name  = 영웅 번호/무기/판 등급/마지막 판 분 (예: h0.5/bow/1.2/7m) */
  const T = (ko, en) => window.IS_EN ? en : ko;
  function runSync(r) {
    if (!r || !r.chapter || (r.mode && r.mode !== 'adventure')) return;
    const key = (r.nightmare ? 'n' : 'c') + r.chapter;
    S.runAgg = S.runAgg || {}; const a = S.runAgg[key] = S.runAgg[key] || { t: 0, w: 0 };
    a.t = Math.min(99, a.t + 1); if (r.win) a.w = Math.min(99, a.w + 1); save();
    if (!accUser()) return;
    const L = r.log || {}, hs = (L.heroes || []).map(h => COMPS.findIndex(c => c.id === h)).filter(i => i >= 0).join('.');
    const nm = 'h' + (hs || '-') + '/' + String(L.weapon || '-').slice(0, 4) + '/' + (L.tierK || 1) + '/' + Math.round((r.time || 0) / 60) + 'm';
    putEntry('kzrun-' + key, nm, a.t * 1e6 + a.w * 1e4 + Math.min(99, r.wave | 0) * 100 + Math.min(99, r.waves | 0)).catch(e => console.warn('runSync', e));
  }
  const rlRuns = () => { const J = window.JZB; try { return (J && J.runLog ? J.runLog() : []).filter(x => x && (x.mode || 'adventure') === 'adventure'); } catch (e) { return []; } };
  const rlSk = id => { const D = window.JZD; if (id.indexOf('ev_') === 0) return ((D && D.EVO && D.EVO[id.slice(3)]) || {}).n || id; const s = D && D.SKILLS ? D.SKILLS.find(x => x.id === id) : null; if (s) return s.n; if (id.indexOf('h_') === 0 && COMP[id.slice(2)]) return COMP[id.slice(2)].n + T(' 카드', ' card'); return id; };
  const rlTur = k => { const D = window.JZD; return (D && D.TUR && D.TUR[k] && D.TUR[k].name) || ({ hq: T('본부', 'HQ'), wall: T('성벽', 'Wall') })[k] || k; };
  const rlHero = ids => (ids || []).map(id => (COMP[id] || {}).n || id).join('+') || T('없음', 'None');
  const rlWhy = w => w === 'win' ? T('승리', 'Win') : w === 'shrine' ? T('사당 무너짐', 'Shrine fell') : w === 'player' ? T('처용 쓰러짐', 'Cheoyong fell') : String(w || '-');
  const rlPct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
  const rlTd = 'style="padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.12);text-align:center"';
  const rlTable = (head, rows) => '<table style="width:100%;border-collapse:collapse;font-size:17px;margin:6px 0"><tr>' + head.map(h => '<th ' + rlTd + '>' + h + '</th>').join('') + '</tr>' + rows.map(r => '<tr>' + r.map(c => '<td ' + rlTd + '>' + c + '</td>').join('') + '</tr>').join('') + '</table>';
  function runLogModal(view) {
    const tabs = '<div class="row"><div class="btn ' + (view === 'all' ? 'b' : 'g') + '" data-act="runlog">' + T('내 기록', 'My runs') + '</div><div class="btn ' + (view === 'all' ? 'g' : 'b') + '" data-act="runlogAll">' + T('모든 이용자', 'All players') + '</div><div class="btn p" data-act="runlogDl">' + T('내려받기', 'Download') + '</div></div>';
    if (view === 'all') { modal('<h3 class="stroke">' + T('판 기록', 'Run log') + '</h3>' + tabs + '<div class="xscroll" id="rlAll"><p style="text-align:center">' + T('불러오는 중...', 'Loading...') + '</p></div>', 'xwide'); runLogAllLoad(); return; }
    const R = rlRuns();
    if (!R.length) { modal('<h3 class="stroke">' + T('판 기록', 'Run log') + '</h3>' + tabs + '<p style="text-align:center">' + T('아직 기록이 없어요. 모험을 한 판 하면 여기에 쌓여요.', 'No runs yet. Play an adventure and it shows up here.') + '</p>', 'xwide'); return; }
    /* 장별 묶음 */
    const by = {}; for (const r of R) { const k = (r.nm ? T('악몽 ', 'NM ') : '') + r.ch; (by[k] = by[k] || []).push(r); }
    const avg = (a, f) => a.length ? a.reduce((s, x) => s + (f(x) || 0), 0) / a.length : 0;
    const chRows = Object.keys(by).sort((a, b) => (parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))) || a.length - b.length).map(k => { const a = by[k], w = a.filter(x => x.win).length, lose = a.filter(x => !x.win), why = {}; lose.forEach(x => { const y = rlWhy(x.why); why[y] = (why[y] || 0) + 1; }); const top = Object.keys(why).sort((p, q) => why[q] - why[p])[0];
      return [T(k + '장', 'Ch ' + k), a.length, w, rlPct(w, a.length), avg(a, x => x.wave).toFixed(1) + '/' + (a[0].waves || '-'), Math.round(avg(a, x => x.time) / 60) + T('분', 'm'), fmt(Math.round(avg(a, x => x.earned))), fmt(Math.round(avg(a, x => x.spent))), top || '-']; });
    /* 난이도 기준 점검 */
    const crit = (f) => { const a = R.filter(f), w = a.filter(x => x.win).length; return a.length ? w + '/' + a.length + ' (' + rlPct(w, a.length) + ')' : T('기록 없음', 'No data'); };
    const dokOnly = x => !x.nm && x.ch <= 2 && (x.heroes || []).length === 1 && x.heroes[0] === 'dokkaebi';
    const withHong = x => !x.nm && x.ch <= 10 && (x.heroes || []).indexOf('honggildong') >= 0;
    /* 엽전 부족: 밤이 시작될 때 가진 엽전과 세운 건물 수 */
    const dusk = {}; for (const r of R) for (const s of (r.nights || [])) if (s.k === 'dusk') { const d = dusk[s.n] = dusk[s.n] || { n: 0, gold: 0, tw: 0, sh: 0 }; d.n++; d.gold += s.gold; d.tw += s.tw; }
    const duskRows = Object.keys(dusk).map(Number).sort((a, b) => a - b).slice(0, 10).map(n => { const d = dusk[n]; return [n + T('번째 밤', ''), d.n, fmt(Math.round(d.gold / d.n)), (d.tw / d.n).toFixed(1)]; });
    /* 기술 카드: 나온 횟수 대비 고른 횟수 */
    const off = {}, pk = {}; for (const r of R) { for (const o of (r.offers || [])) for (const id of o) off[id] = (off[id] || 0) + 1; for (const s of (r.skills || [])) pk[s[0]] = (pk[s[0]] || 0) + 1; }
    const skIds = Object.keys(off).filter(id => off[id] >= 3).sort((a, b) => (pk[b] || 0) / off[b] - (pk[a] || 0) / off[a]);
    const skRow = id => [rlSk(id), off[id], pk[id] || 0, rlPct(pk[id] || 0, off[id])];
    const low = skIds.filter(id => (pk[id] || 0) / off[id] < 0.15);
    /* 건물 */
    const bt = {}; for (const r of R) { for (const b of (r.builds || [])) bt[b[0]] = (bt[b[0]] || 0) + 1; }
    const btRows = Object.keys(bt).sort((a, b) => bt[b] - bt[a]).map(k => [rlTur(k), bt[k]]);
    const recent = R.slice(-12).reverse().map(r => { const d = new Date(r.at || 0); return [(d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'), (r.nm ? T('악몽 ', 'NM ') : '') + r.ch + T('장', ''), r.win ? '<b style="color:#8f8">' + T('승리', 'Win') + '</b>' : '<b style="color:#f88">' + rlWhy(r.why) + '</b>', r.wave + '/' + r.waves, rlHero(r.heroes), Math.round((r.time || 0) / 60) + T('분', 'm'), fmt(r.earned || 0) + '/' + fmt(r.spent || 0)]; });
    modal('<h3 class="stroke">' + T('판 기록', 'Run log') + '</h3>' + tabs + '<div class="xscroll">' +
      '<p style="text-align:center;font-size:17px">' + T('이 기기에서 한 모험 ', 'Adventures on this device: ') + R.length + T('판 (최근 100판까지 보관)', ' (last 100 kept)') + '</p>' +
      '<h4 class="stroke-s">' + T('난이도 기준 점검', 'Difficulty targets') + '</h4>' + rlTable([T('기준', 'Target'), T('이긴 판/한 판', 'Won/Played')], [[T('1~2장, 도깨비만', 'Ch.1-2, Dokkaebi only'), crit(dokOnly)], [T('10장까지, 홍길동 포함', 'Up to ch.10, with Hong Gildong'), crit(withHong)], [T('모든 모험', 'All adventures'), crit(() => true)]]) +
      '<h4 class="stroke-s">' + T('장별 결과', 'By chapter') + '</h4>' + rlTable([T('장', 'Ch'), T('판', 'Runs'), T('승', 'Won'), T('승률', 'Win %'), T('평균 밤', 'Avg night'), T('평균 시간', 'Avg time'), T('번 엽전', 'Coins in'), T('쓴 엽전', 'Coins spent'), T('주된 패배', 'Main loss')], chRows) +
      '<h4 class="stroke-s">' + T('밤이 시작될 때 엽전과 건물', 'Coins and buildings at dusk') + '</h4>' + rlTable([T('밤', 'Night'), T('판', 'Runs'), T('가진 엽전', 'Coins'), T('건물 수', 'Buildings')], duskRows) +
      '<h4 class="stroke-s">' + T('기술 카드 고른 비율 (3번 이상 나온 것)', 'Skill pick rate (offered 3+ times)') + '</h4>' + rlTable([T('기술', 'Skill'), T('나옴', 'Offered'), T('고름', 'Picked'), T('비율', 'Rate')], skIds.slice(0, 14).map(skRow)) +
      (low.length ? '<p style="font-size:17px;color:#ffb0a0">' + T('거의 안 고르는 기술: ', 'Rarely picked: ') + low.map(rlSk).join(', ') + '</p>' : '') +
      '<h4 class="stroke-s">' + T('많이 지은 건물', 'Most built') + '</h4>' + rlTable([T('건물', 'Building'), T('지은 수', 'Built')], btRows.slice(0, 10)) +
      '<h4 class="stroke-s">' + T('최근 판', 'Recent runs') + '</h4>' + rlTable([T('때', 'When'), T('장', 'Ch'), T('결과', 'Result'), T('밤', 'Night'), T('영웅', 'Heroes'), T('시간', 'Time'), T('엽전 번/씀', 'Coins in/out')], recent) +
      '</div>', 'xwide');
  }
  async function runLogAllLoad() {
    const box = () => $('#rlAll', root) || document.getElementById('rlAll');
    try {
      const n = chapters().length, out = [];
      let bad = 0, lastErr = null; const res = await Promise.all(Array.from({ length: n }, (_, i) => listBoard('kzrun-c' + (i + 1), 300).catch(e => { bad++; lastErr = e; return []; })));
      if (bad === n) throw lastErr || new Error('server');
      let players = new Set();
      res.forEach((L, i) => { if (!L.length) return; let t = 0, w = 0, reach = 0; const hc = {}; L.forEach(e => { players.add(e.id); const s = e.score || 0; t += Math.floor(s / 1e6); w += Math.floor(s / 1e4) % 100; const nn = s % 100, wv = Math.floor(s / 100) % 100; reach += nn ? wv / nn : 0; const h = String(e.name || '').split('/')[0]; hc[h] = (hc[h] || 0) + 1; });
        const topH = Object.keys(hc).sort((a, b) => hc[b] - hc[a])[0] || ''; const hn = topH.replace(/^h/, '').split('.').map(x => (COMPS[+x] || {}).n).filter(Boolean).join('+') || '-';
        out.push([T((i + 1) + '장', 'Ch ' + (i + 1)), L.length, t, w, rlPct(w, t), Math.round(reach / L.length * 100) + '%', hn]); });
      const b = box(); if (!b) return;
      b.innerHTML = out.length ? '<p style="text-align:center;font-size:17px">' + T('로그인한 이용자 ', 'Signed-in players: ') + players.size + T('명의 장별 누적 (한 사람당 장마다 한 줄)', ' (one row per player per chapter)') + '</p>' + rlTable([T('장', 'Ch'), T('사람', 'Players'), T('도전', 'Tries'), T('승리', 'Win'), T('승률', 'Win %'), T('마지막 판 진행', 'Last-run progress'), T('많이 쓴 영웅', 'Top heroes')], out) + '<p style="font-size:16px;opacity:.8">' + T('마지막 판 진행: 각자 마지막으로 한 판에서 몇 번째 밤까지 갔는지의 평균이에요.', 'Last-run progress: average share of nights reached in each player\'s latest run.') + '</p>' : '<p style="text-align:center">' + T('아직 서버에 모인 기록이 없어요. 로그인한 이용자가 모험을 하면 쌓여요.', 'No server data yet.') + '</p>';
    } catch (e) { const b = box(); if (b) b.innerHTML = '<p style="text-align:center">' + T('서버에 연결하지 못했어요 (', 'Could not reach the server (') + esc(String(e && e.code || e)) + ')</p>'; }
  }
  function runLogDownload() {
    const R = (window.JZB && window.JZB.runLog ? window.JZB.runLog() : []);
    if (!R.length) { toast(T('아직 기록이 없어요', 'No runs yet')); return; }
    try { const d = new Date(), nm = 'kzombi_runlog_' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ game: 'K-ZOMBIE', at: Date.now(), runs: R }, null, 1)], { type: 'application/json' })); a.download = nm; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast(T('기록 파일을 내려받았어요', 'Run log downloaded')); }
    catch (e) { toast(T('내려받지 못했어요', 'Download failed')); }
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
    try { const Rc = raceSt(); if (Rc.id && k > 0) { Rc.k += k; if (accUser()) putEntry('kzrace-' + Rc.id, accName(), Rc.k).catch(() => {}); } } catch (e) {}
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
    modal('<h3 class="stroke">시즌 패스</h3>' + allBtn('passAll', passReady().length) + '<p style="text-align:center;margin:0 0 8px">' + S.pass.season.replace('-', '년 ') + '월 시즌 · 전투를 하면 패스 점수가 쌓여요</p>' +
      '<div class="xbar"><i style="width:' + (lv >= PASS_N ? 100 : into) + '%"></i><span class="stroke-s">' + lv + '단계 · ' + (lv >= PASS_N ? '최고' : into + '/' + PASS_XP) + '</span></div>' +
      '<div class="xphd"><span>단계</span><span>무료</span><span>황금 패스</span></div><div class="xscroll">' + rows + '</div>' +
      '<div class="row">' + (S.pass.paid ? '<div class="btn y" style="min-width:300px">황금 패스 사용 중</div>' : '<div class="btn p" data-act="passBuy" style="min-width:320px;flex-direction:column;gap:0"><span>황금 패스 열기 990원</span><small style="font-size:16px">' + payNote() + '</small></div>') + '</div>', 'xwide');
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
    modal('<h3 class="stroke">업적</h3>' + allBtn('achAll', achReady().length) + '<div class="xscroll">' + list + '</div>', 'xwide');
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
    const cells = list.map(x => { const got = box[x.k]; return '<div class="xcell' + (x.own ? '' : ' off') + '" style="border-color:' + GR[Math.min(6, x.g)].c + '"' + (x.own && !got ? ' data-act="cdGet" data-v="' + x.k + '"' : '') + '>' + x.img + '<div class="nm stroke-s">' + (x.own ? x.n : '???') + '</div>' + (x.own && !got ? '<i class="dot"></i><div class="xrw stroke-s">옥 ' + x.r + '</div>' : got ? '<i class="xchk sm">✔</i>' : '') + '</div>'; }).join('');
    modal('<h3 class="stroke">도감</h3>' + allBtn('cdAll', cdReady().length) + '<div class="xtabs">' + [['hero', '영웅'], ['zom', '좀비'], ['item', '장비']].map(([k, n]) => '<div class="btn ' + (k === cdTab ? 'y' : 'b') + '" data-act="cdTab" data-v="' + k + '">' + n + '</div>').join('') + '<div class="btn g" data-act="storyBook">이야기</div></div>' +
      '<p style="text-align:center;margin:6px 0">모은 것 ' + have + '/' + list.length + ' · 새로 모은 칸을 누르면 옥을 받아요</p><div class="xscroll xcodex">' + cells + '</div>', 'xwide');
  }
  const cdDot = () => { xinit(); for (const t of ['hero', 'zom', 'item']) { const o = cdTab; cdTab = t; const any = codexItems().some(x => x.own && !S.codex[t][x.k]); cdTab = o; if (any) return true; } return false; };
  /* ---------------- 비동기 아레나: 다른 처용의 '방어 편성'과 결투 ----------------
     kzar-{주}  : name=닉네임, score=아레나 점수(주마다 1000에서 시작)
     kzard-{주} : name=편성 요약(전투력36.의상.영웅.영웅 앞 4글자), score=전투력
     남의 점수는 쓸 수 없으니 내 점수만 엘로식으로 바뀐다. 가상 상대는 언제나 '연습 상대(가상 AI)'로 표시하고 순위표엔 넣지 않는다 */
  const AR_FREE = 5, AR_K = 32; let arList = [], lastAR = null;
  function arDay() { xinit(); const d = today(); if (!S.ar) S.ar = { pts: 1000, best: 1000, wk: S.wk.key, day: d, n: 0, w: 0, l: 0, played: 0 }; const A = S.ar;
    if (A.day !== d) { A.day = d; A.n = 0; A.foes = null; }
    if (A.wk !== S.wk.key) { if (A.played) A.prev = { wk: A.wk, pts: A.pts, got: false }; Object.assign(A, { wk: S.wk.key, pts: 1000, best: 1000, w: 0, l: 0, played: 0, foes: null }); }
    return A; }
  const arTeam = () => S.team.filter(id => S.comps[id] && S.comps[id].own).slice(0, 2);
  const arDef = () => Math.round(stats().power).toString(36) + '.' + String(S.skin || 'base').slice(0, 3) + arTeam().map(id => '.' + id.slice(0, 4)).join('');
  const arParse = s => { const p = String(s || '').split('.'), sk = SKINS.find(x => x.id.slice(0, 3) === p[1]); return { pow: parseInt(p[0], 36) || 0, skin: sk && sk.id !== 'base' ? sk.id : null, heroes: p.slice(2, 4).map(x => (COMPS.find(c => c.id.slice(0, 4) === x) || {}).id).filter(Boolean) }; };
  const arElo = (me, op, win) => { const e = 1 / (1 + Math.pow(10, ((op || 1000) - me) / 400)); let d = Math.round(AR_K * ((win ? 1 : 0) - e)); if (win && d < 3) d = 3; if (!win && d > -3) d = -3; return d; };
  const arAI = () => { const p = Math.max(1, stats().power), own = COMPS.map(c => c.id); return [['연습 허수아비', 0.75, null], ['연습 목각 처용', 1, 'seonbi'], ['연습 그림자 처용', 1.3, 'jeoseung']].map(([n, k, sk], i) => ({ ai: 1, name: n, pts: 0, pow: Math.round(p * k), skin: sk, heroes: [own[(i * 2 + 3) % own.length], own[(i * 2 + 4) % own.length]] })); };
  function arFoeHtml(list) { arList = list; const A = arDay();
    return list.map((f, i) => '<div class="box arfoe"><div class="arf1"><b class="stroke-s" style="font-size:24px;color:' + (f.ai ? '#cdd6ff' : '#ff9a8a') + '">' + esc(f.name) + '</b>' + (f.ai ? '<span class="arai stroke-s">연습 상대 · 가상 AI (실제 사람 아님)</span>' : '<span class="stroke-s" style="color:#ffe27a">점수 ' + fmt(f.pts || 1000) + '</span>') + '<span class="stroke-s" style="font-size:17px">전투력 ' + fmt(f.pow) + '</span></div>' +
      '<div class="arh">' + (f.heroes || []).map(id => COMP[id] ? '<div class="mini" style="background-image:url(' + COMP[id].img + ')"></div>' : '').join('') + '</div>' +
      '<div class="btn ' + (f.ai ? 'b' : A.n >= AR_FREE ? 'b dis' : 'r') + '" data-act="arGo" data-v="' + i + '">' + (f.ai ? '연습' : A.n >= AR_FREE ? '내일' : '결투') + '</div></div>').join(''); }
  async function arModal() {
    const A = arDay(), st = stats(), tm = arTeam().map(id => COMP[id].n).join(', ') || '없음';
    modal('<h3 class="stroke">아레나 결투</h3><div class="box" style="padding:10px 16px;font-size:19px"><p style="margin:2px 0">내 방어 편성 · 전투력 <b style="color:#ffe27a">' + fmt(st.power) + '</b> · 영웅 ' + esc(tm) + '</p><p style="margin:2px 0">이번 주(' + S.wk.key + ') 점수 <b style="color:#ffe27a">' + fmt(A.pts) + '</b> · ' + A.w + '승 ' + A.l + '패 · 오늘 결투 ' + A.n + '/' + AR_FREE + '</p><p style="margin:2px 0;font-size:16px">90초 안에 상대 처용을 쓰러뜨리면 승리. 이기면 점수가 오르고 지면 내려가요. 남이 나에게 도전해도 내 점수는 줄지 않아요.</p></div>' +
      '<p style="text-align:center;font-size:16px;margin:6px 0">주간 보상: 1위 옥 800 · 2~3위 500 · 4~10위 300 · 11~50위 150 · 참여 50 (다음 주 첫 접속 때)</p><div id="arfoe"><p style="text-align:center">상대를 찾는 중...</p></div><h4 class="stroke-s" style="text-align:center;margin:8px 0 2px">이번 주 아레나 순위</h4><div class="xscroll" id="arbox" style="max-height:260px"></div>', 'xwide');
    const fb = () => $('#arfoe', root), box = () => $('#arbox', root);
    const s2 = await socialReady(); if (!fb()) return;
    if (s2 !== 'ok') { fb().innerHTML = arFoeHtml(arAI()); box().innerHTML = s2 === 'login' ? loginBox('진짜 처용들과 결투하고 주간 순위에 올라요. 지금은 연습 상대(가상 AI)만 열려요.') : s2 === 'offline' ? offBox : errBox(); return; }
    try { const me = accUser().uid, wk = S.wk.key;
      if (A.prev && !A.prev.got) { const pl = (await listBoard('kzar-' + A.prev.wk, 300)).sort((a, b) => b.score - a.score); const rk = pl.findIndex(e => e.id === me) + 1; const j = rk === 1 ? 800 : rk && rk <= 3 ? 500 : rk && rk <= 10 ? 300 : rk && rk <= 50 ? 150 : 50; S.jade += j; A.prev.got = true; save(); toast('지난주 아레나 ' + (rk ? rk + '위' : '참여') + ' 보상: 옥 ' + j); refresh(); }
      await putEntry('kzar-' + wk, accName(), A.pts); await putEntry('kzard-' + wk, arDef(), Math.round(st.power));
      const L = (await listBoard('kzar-' + wk, 300)).sort((a, b) => b.score - a.score);
      if (!A.foes || !A.foes.length) { const cand = L.filter(e => e.id !== me).sort((a, b) => Math.abs(a.score - A.pts) - Math.abs(b.score - A.pts)).slice(0, 6).sort(() => Math.random() - 0.5).slice(0, 3); const foes = [];
        for (const e of cand) { const d = await getEntry('kzard-' + wk, e.id); if (!d) continue; const P = arParse(d.name); foes.push({ uid: e.id, name: nm20(e.name), pts: e.score || 1000, pow: P.pow || d.score || 1, skin: P.skin, heroes: P.heroes }); }
        A.foes = foes.sort((a, b) => b.pts - a.pts); save(); }
      if (!fb()) return;
      fb().innerHTML = A.foes.length ? arFoeHtml(A.foes) + '<div class="row"><div class="btn b" data-act="arRe">상대 다시 찾기</div></div>' : '<p style="text-align:center">아직 이번 주에 편성을 올린 다른 처용이 없어요. 내 편성은 올라갔으니 곧 누군가 도전해 올 거예요. 그동안 연습해 보세요.</p>' + arFoeHtml(arAI());
      box().innerHTML = L.length ? L.slice(0, 50).map((e, i) => '<div class="xrk' + (e.id === me ? ' me' : '') + '"><b class="stroke-s">' + (i + 1) + '</b><span class="stroke-s">' + esc(e.name) + '</span><em class="stroke-s">' + fmt(e.score || 0) + '</em></div>').join('') : '<p style="text-align:center">아직 이번 주 기록이 없어요.</p>';
    } catch (e) { console.warn(e); if (fb()) { fb().innerHTML = arFoeHtml(arAI()); box().innerHTML = errBox(); } }
  }
  function arGo(i) { const A = arDay(), f = arList[i]; if (!f) return; if (!f.ai && A.n >= AR_FREE) { toast('오늘 결투를 다 했어요 (하루 ' + AR_FREE + '번)'); return; }
    if (!f.ai) A.n++; const myP = Math.max(1, stats().power);
    S.nextMode = 'arena'; S.nextAR = { name: f.name, pw: Math.max(0.4, Math.min(3, (f.pow || myP) / myP)), skin: f.skin || null, heroes: f.heroes || [], ai: f.ai ? 1 : 0 }; lastAR = f; save();
    startBattle(Math.max(1, Math.min(S.chap, chapters().length))); }
  function arEnd(r) {
    meta.classList.remove('off'); try { window.JZB && window.JZB.hide && window.JZB.hide(); } catch (e) {}
    const f = lastAR || { ai: 1, name: '' }, A = arDay(), win = !!r.win; lastAR = null; let d = 0, gold = 0;
    if (!f.ai) { d = arElo(A.pts, f.pts, win); A.pts = Math.max(0, A.pts + d); A.best = Math.max(A.best || 0, A.pts); if (win) A.w++; else A.l++; A.played = 1; A.foes = null; gold = win ? 1500 : 400; S.gold += gold; S.quests.arena = (S.quests.arena || 0) + 1;
      try { if (accUser()) putEntry('kzar-' + S.wk.key, accName(), A.pts).catch(() => {}); } catch (e) {} }
    save(); tab = 'home'; renderLobby(); show('s-lobby'); try { music('bgm_lobby'); } catch (e) {}
    modal('<h3 class="stroke" style="color:' + (win ? '#7df06a' : '#ff7a6a') + '">' + (win ? '결투 승리!' : '결투 패배') + '</h3><p style="text-align:center;font-size:24px">상대 ' + esc(f.name) + (f.ai ? ' (연습 상대 · 가상 AI)' : '') + '</p>' +
      (f.ai ? '<p style="text-align:center">연습 결투는 점수와 보상이 없어요.</p>' : '<p style="text-align:center;font-size:26px">아레나 점수 <b style="color:#ffe27a">' + fmt(A.pts) + '</b> (' + (d >= 0 ? '+' : '−') + Math.abs(d) + ')</p><p style="text-align:center">엽전 +' + fmt(gold) + ' · 오늘 결투 ' + A.n + '/' + AR_FREE + '</p>') +
      '<div class="row"><div class="btn y" data-act="ar">아레나로</div></div>');
  }

  /* ---------------- 한정 레이스: 매주 금~일, 물리친 좀비 수 경쟁 (kzrace-{금요일 날짜}) ---------------- */
  const RACE_ST = [[500, 'jade', 30], [2000, 'stone', 20], [5000, 'jade', 80], [10000, 'coin', 20000], [20000, 'jade', 200]];
  const ymd = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  function raceNow() { const d = new Date(), wd = d.getDay(), back = wd === 5 ? 0 : wd === 6 ? 1 : wd === 0 ? 2 : -1;
    if (back < 0) return { on: false, next: new Date(d.getFullYear(), d.getMonth(), d.getDate() + (5 - wd)).getTime() };
    const fr = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back); return { on: true, id: ymd(fr), end: new Date(fr.getFullYear(), fr.getMonth(), fr.getDate() + 3).getTime() }; }
  function raceSt() { const R = raceNow(); S.race = S.race || { id: '', k: 0, got: {} }; const c = S.race;
    if (c.id && (!R.on || R.id !== c.id)) { let auto = 0; RACE_ST.forEach(([need, k, v], i) => { if (c.k >= need && !c.got[i]) { give(k, v); auto++; } }); if (auto) setTimeout(() => toast('지난 레이스 단계 보상 ' + auto + '개를 받았어요'), 600); if (c.k > 0) c.prev = { id: c.id, k: c.k, got: false }; c.id = ''; c.k = 0; c.got = {}; save(); }
    if (R.on && !c.id) { c.id = R.id; c.k = 0; c.got = {}; }
    return c; }
  const raceDot = () => { try { const c = raceSt(); return !!c.id && RACE_ST.some(([need], i) => c.k >= need && !c.got[i]); } catch (e) { return false; } };
  const raceLeft = () => { const R = raceNow(), ms = Math.max(0, (R.on ? R.end : R.next) - Date.now()), h = Math.floor(ms / 36e5); return { on: R.on, s: (h >= 24 ? Math.floor(h / 24) + '일 ' : '') + (h % 24) + '시간 ' + Math.floor(ms / 6e4) % 60 + '분', short: h >= 24 ? Math.floor(h / 24) + '일' : h >= 1 ? h + '시간' : Math.floor(ms / 6e4) + '분' }; };
  const evTabs = t => '<div class="xtabs" style="margin-bottom:6px"><div class="btn ' + (t === 'race' ? 'b' : 'y') + '" data-act="evTab" data-v="fest">출석 축제</div><div class="btn ' + (t === 'race' ? 'y' : 'b') + '" data-act="evTab" data-v="race">한정 레이스' + (raceDot() ? ' •' : '') + '</div></div>';
  async function raceModal() {
    const c = raceSt(), T = raceLeft();
    const stg = RACE_ST.map(([need, k, v], i) => { const ok = c.k >= need, got = c.got[i]; return '<div class="xev' + (got ? ' got' : ok ? ' now' : '') + '"' + (ok && !got ? ' data-act="raceGet" data-v="' + i + '"' : '') + '><div class="stroke-s" style="font-size:17px">' + fmt(need) + '마리</div>' + rwBox(k, v, i >= 4 ? 5 : 3, 1) + (got ? '<i class="xchk">✔</i>' : '') + '</div>'; }).join('');
    modal(evTabs('race') + '<h3 class="stroke">한정 레이스 · 좀비 사냥</h3><p style="text-align:center">' + (T.on ? '금~일 사흘 동안 물리친 좀비 수로 겨뤄요. 모든 전투가 들어가요.<br><b style="color:#ffe27a">남은 시간 ' + T.s + '</b> · 내 기록 <b style="color:#ffe27a">' + fmt(c.k) + '마리</b>' : '레이스는 매주 금요일 0시부터 일요일 밤 12시까지 열려요.<br><b style="color:#ffe27a">다음 레이스까지 ' + T.s + '</b>') + '</p>' +
      (T.on ? '<div class="xevs">' + stg + '</div>' : '') + '<p style="text-align:center;font-size:16px">순위 보상: 1위 옥 1000 · 2~3위 600 · 4~10위 300 · 11~50위 150 · 참여 50 (끝난 뒤 첫 접속 때)</p><div class="xscroll" id="rcbox" style="max-height:280px"><p style="text-align:center">' + (T.on ? '순위 불러오는 중...' : '') + '</p></div>', 'xwide');
    const box = () => $('#rcbox', root); const s2 = await socialReady(); if (!box()) return;
    if (s2 !== 'ok') { box().innerHTML = s2 === 'login' ? loginBox('레이스 순위에 이름이 올라가고 순위 보상을 받아요.') : s2 === 'offline' ? offBox : errBox(); return; }
    try { const me = accUser().uid;
      if (c.prev && !c.prev.got) { const pl = (await listBoard('kzrace-' + c.prev.id, 300)).sort((a, b) => b.score - a.score); const rk = pl.findIndex(e => e.id === me) + 1; const j = rk === 1 ? 1000 : rk && rk <= 3 ? 600 : rk && rk <= 10 ? 300 : rk && rk <= 50 ? 150 : 50; S.jade += j; c.prev.got = true; save(); toast('지난 레이스 ' + (rk ? rk + '위' : '참여') + ' 보상: 옥 ' + j); refresh(); }
      if (!T.on) { box().innerHTML = '<p style="text-align:center">레이스가 열리면 순위가 보여요.</p>'; return; }
      if (c.k > 0) await putEntry('kzrace-' + c.id, accName(), c.k);
      const L = (await listBoard('kzrace-' + c.id, 300)).sort((a, b) => b.score - a.score).slice(0, 50); if (!box()) return;
      box().innerHTML = L.length ? L.map((e, i) => '<div class="xrk' + (e.id === me ? ' me' : '') + '"><b class="stroke-s">' + (i + 1) + '</b><span class="stroke-s">' + esc(e.name) + '</span><em class="stroke-s">' + fmt(e.score || 0) + '</em></div>').join('') : '<p style="text-align:center">아직 이번 레이스 기록이 없어요. 첫 번째가 되어 보세요!</p>';
    } catch (e) { console.warn(e); if (box()) box().innerHTML = errBox(); }
  }
  function raceGet(i) { const c = raceSt(), s = RACE_ST[i]; if (!s || !c.id || c.got[i] || c.k < s[0]) return; c.got[i] = 1; give(s[1], s[2]); save(); toast('레이스 단계 보상을 받았어요'); raceModal(); refresh(); }

  /* 기간 이벤트: 이달의 7일 출석 축제 */
  const EVR = [['jade', 50], ['coin', 5000], ['stone', 15], ['torch', 15], ['jade', 80], ['coin', 10000], ['jade', 150]];
  const evDot = () => { xinit(); return S.ev.got < 7 && S.ev.last !== today(); };
  function evModal(tab) {
    if (tab === 'race') return raceModal();
    xinit(); const d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 0), left = end.getDate() - d.getDate();
    const cells = EVR.map(([k, v], i) => { const got = i < S.ev.got, now = i === S.ev.got && S.ev.last !== today(); return '<div class="xev' + (got ? ' got' : now ? ' now' : '') + '"' + (now ? ' data-act="evGet"' : '') + '><div class="stroke-s" style="font-size:20px">' + (i + 1) + '일째</div>' + rwBox(k, v, i === 6 ? 5 : 3, 1) + (got ? '<i class="xchk">✔</i>' : '') + '</div>'; }).join('');
    modal(evTabs('fest') + '<h3 class="stroke">처용 맞이 축제</h3><p style="text-align:center">이번 달 안에 7일을 들르면 날마다 선물을 받아요. 하루에 한 칸씩!<br><b style="color:#ffe27a">남은 기간 ' + left + '일</b></p><div class="xevs">' + cells + '</div>' + (S.ev.got >= 7 ? '<p style="text-align:center;color:#7df06a">이번 축제 선물을 모두 받았어요</p>' : ''));
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
      /* 친구 코드 → uid: 누구나 읽을 수 있는 보드 kzc-{코드} 에 내 줄을 둔다 */
      if (!S.codeOk) { for (let i = 0; i < 5; i++) { const ex = (await listBoard('kzc-' + S.myCode, 3)).filter(r => r.id !== u.uid); if (!ex.length) { await putEntry('kzc-' + S.myCode, accName(), 1); S.codeOk = u.uid; break; } S.myCode = Math.random().toString(36).slice(2, 8).toUpperCase(); } save(); }
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
    if (st === 'offline') { box().innerHTML = offBox; return; } if (st === 'login') { box().innerHTML = loginBox('친구 코드로 친구를 맺고 날마다 횃불을 주고받을 수 있어요.') + inviteBox(); return; } if (st === 'err') { box().innerHTML = errBox(); return; }
    const me = accUser().uid, d = dayKey(); if (S.fr.gotDay !== d) { S.fr.gotDay = d; S.fr.gotN = 0; S.fr.got = {}; }
    try { await inviteeSettle(); await inviterSettle(); } catch (e) { console.warn('[invite]', e); } if (!box()) return;
    let inbox = []; try { inbox = await listBoard('kzf-' + me, 100); } catch (e) { socialErr = String(e.code || e); box().innerHTML = errBox(); return; }
    /* 상대가 내 보드에 남긴 줄: 신청(1) 또는 수락(2) */
    for (const r of inbox) if (r.score === 2 && S.fr.sent[r.id]) { S.fr.list[r.id] = 1; delete S.fr.sent[r.id]; }
    const reqs = inbox.filter(r => r.score === 1 && !S.fr.list[r.id] && !S.fr.rej[r.id]);
    const ids = Object.keys(S.fr.list).slice(0, 30); save();
    const prof = {}, gifts = {}, begs = {}; await Promise.all(ids.map(async id => { try { prof[id] = await getEntry('kzp', id); } catch (e) {} try { gifts[id] = await getEntry('kzg-' + me + '-' + d, id); } catch (e) {} try { begs[id] = await getEntry('kzb-' + me + '-' + d, id); } catch (e) {} }));
    const begSent = S.fr.begDay === d ? S.fr.begTo || {} : {};
    if (!box()) return;
    const giftSent = S.fr.giftDay === d ? S.fr.giftTo || {} : {};
    const rows = ids.map(id => { const p = prof[id] || {}, g = gifts[id], got = S.fr.got[id];
      return '<div class="xfr box"><div class="xav stroke">' + esc((p.name || '?')[0]) + '</div><div class="xfi"><b class="stroke-s">' + esc(p.name || '알 수 없음') + (begs[id] && !giftSent[id] ? ' <span class="xbeg">🙏 횃불 조름</span>' : '') + '</b><small>레벨 ' + lvOf(p.score) + ' · 전투력 ' + fmt(pwOf(p.score)) + ' · ' + ago(p.at) + '</small></div>' +
        '<div class="xfb">' + (begSent[id] ? '' : '<div class="btn p sm" data-act="frBeg" data-v="' + id + '">🙏</div>') + (g && !got ? '<div class="btn y sm" data-act="frTake" data-v="' + id + '">🔥 받기</div>' : '') + (giftSent[id] ? '<div class="btn b sm dis">보냄</div>' : '<div class="btn g sm" data-act="frGift" data-v="' + id + '">🔥 보내기</div>') + '</div></div>'; }).join('');
    box().innerHTML = '<div class="box xmycode"><span>내 친구 코드</span><b class="stroke" style="color:#ffe27a">' + S.myCode + '</b></div>' + inviteBox() +
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
        const hit = (await listBoard('kzc-' + code, 3)).sort((x, y) => (x.at || 0) - (y.at || 0))[0], u2 = hit ? { uid: hit.id } : null; if (!u2) { toast('없는 친구 코드예요'); return; }
        if (u2.uid === me) { toast('내 코드예요'); return; }
        if (S.fr.list[u2.uid]) { toast('이미 친구예요'); return; } if (Object.keys(S.fr.list).length >= 30) { toast('친구는 30명까지예요'); return; }
        const back = await getEntry('kzf-' + me, u2.uid);   /* 상대가 먼저 나에게 신청했으면 바로 친구 */
        await putEntry('kzf-' + u2.uid, accName(), back ? 2 : 1);
        if (back) { S.fr.list[u2.uid] = 1; toast('친구가 되었어요!'); } else { S.fr.sent[u2.uid] = 1; toast('친구 신청을 보냈어요'); }
      } else if (a === 'frOk') { if (Object.keys(S.fr.list).length >= 30) { toast('친구는 30명까지예요'); return; } await putEntry('kzf-' + v, accName(), 2); S.fr.list[v] = 1; toast('친구가 되었어요!'); }
      else if (a === 'frNo') { S.fr.rej[v] = 1; toast('신청을 거절했어요'); }
      else if (a === 'frGift') { const d = dayKey(); await putEntry('kzg-' + v + '-' + d, accName(), 1); if (S.fr.giftDay !== d) { S.fr.giftDay = d; S.fr.giftTo = {}; } S.fr.giftTo[v] = 1; toast('횃불을 선물했어요'); }
      else if (a === 'frTake') { if (S.fr.gotN >= 10) { toast('오늘은 10개까지 받을 수 있어요'); return; } S.fr.got[v] = 1; S.fr.gotN++; addTorch(1); toast('횃불 +1'); }
      else if (a === 'frBeg') { const d = dayKey(); await putEntry('kzb-' + v + '-' + d, accName(), 1); if (S.fr.begDay !== d) { S.fr.begDay = d; S.fr.begTo = {}; } S.fr.begTo[v] = 1; toast('횃불을 졸랐어요'); }
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
        (await gbBox(g, me)) +
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
        const taken = (await listBoard('kzguilds', 300)).some(g => g.name === id && g.score > 0 && g.id !== me); if (taken) { toast('이미 있는 문파 이름이에요'); return; }
        const r = await window.HKAccount.claimUnique('kzguild-' + id, { g: 'kzombi', name: id }); if (!r.ok && r.reason === 'taken' && !/permission/.test(String(r.err || '')) && r.owner && r.owner.uid !== me) { toast('이미 있는 문파 이름이에요'); return; }
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
  /* ---- 친구 초대 (애니팡 하트처럼) ----
     초대 링크: /game/kzombi/?ref={내 친구 코드}
     초대받은 사람: 처음 들어오면 코드를 기억 → 로그인하면 kzi-{초대자코드} 보드에 자기 줄을 쓰고 환영 선물(횃불 10, 옥 100) + 초대자와 자동 친구
     초대한 사람: kzi-{내코드} 를 읽어 새 사람마다 횃불 5, 옥 50 + 3·5·10명 달성 보상
     선물·초대로 받은 횃불은 최대치(30)를 넘어 99까지 쌓인다 */
  const INV_MS = [[3, 300], [5, 500], [10, 1000]];
  const TORCH_CAP = 99;
  const addTorch = n => { S.torch = Math.min(TORCH_CAP, (S.torch || 0) + n); };
  (function catchRef() { try { const r = /[?&]ref=([A-Za-z0-9]{4,8})\b/.exec(location.search); if (r && localStorage.getItem('kz_ref_done') !== '1') localStorage.setItem('kz_ref', r[1].toUpperCase()); } catch (e) {} })();
  const refCode = () => { try { return localStorage.getItem('kz_ref_done') === '1' ? null : localStorage.getItem('kz_ref'); } catch (e) { return null; } };
  const inviteUrl = () => 'https://www.hankuk-in.com/game/kzombi/?ref=' + S.myCode;
  async function shareInvite() {
    xinit(); const url = inviteUrl() + (window.IS_EN ? '&lang=en' : ''), text = window.IS_EN ? 'Help Cheoyong hold off the Joseon zombies! Join with this link for 10 torches and 100 Jade. Friend code: ' + S.myCode : '처용과 함께 조선 좀비를 막아 줘! 이 링크로 들어오면 횃불 10개와 옥 100개를 선물로 받아요. 친구 코드: ' + S.myCode;
    try { if (navigator.share) { await navigator.share({ title: 'K-ZOMBIE 처용, 조선좀비', text, url }); toast('초대 링크를 보냈어요'); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text + '\n' + url); toast('초대 링크를 복사했어요. 카카오톡에 붙여넣어 보내 주세요'); return; } catch (e) {}
    modal('<h3 class="stroke">친구 초대</h3><p style="text-align:center">아래 링크를 길게 눌러 복사한 뒤 카카오톡에 붙여넣어 보내 주세요</p><div class="row"><input class="xcpn" readonly value="' + esc(url) + '" onclick="this.select()"></div>');
  }
  function inviteBox() {
    xinit(); S.invt = S.invt || {}; S.invt.got = S.invt.got || {}; S.invt.ms = S.invt.ms || {}; const n = Object.keys(S.invt.got).length, nx = INV_MS.find(([k]) => n < k);
    return '<div class="box xinv"><div><b class="stroke-s">친구 초대 ' + n + '명</b><small>초대한 친구가 들어오면 나는 횃불 5·옥 50, 친구는 횃불 10·옥 100!' + (nx ? ' · ' + nx[0] + '명 달성 시 옥 ' + nx[1] : '') + (accUser() ? '' : '<br>보상은 구글 로그인 뒤에 정산돼요') + '</small></div><div class="btn y" data-act="frInvite">초대하기</div></div>';
  }
  let socialT = 0;
  async function socialTick(force) {
    if (!accUser() || (!force && Date.now() - socialT < 60000)) return; socialT = Date.now();
    try { if (await socialReady() !== 'ok') return; await inviteeSettle(); await inviterSettle(); } catch (e) { console.warn('[invite]', e); }
  }
  async function inviteeSettle() {
    const code = refCode(), me = accUser() && accUser().uid; if (!code || !me) return;
    if (code === S.myCode) { localStorage.setItem('kz_ref_done', '1'); return; }
    const hit = (await listBoard('kzc-' + code, 3)).sort((x, y) => (x.at || 0) - (y.at || 0))[0]; if (!hit) return;   /* 초대자가 아직 로그인 전: 나중에 다시 */
    const inviter = hit.id; if (inviter === me) { localStorage.setItem('kz_ref_done', '1'); return; }
    const was = await getEntry('kzi-' + code, me);   /* 같은 계정이 다른 기기에서 이미 받았으면 선물은 없음 */
    await putEntry('kzi-' + code, accName(), 1);
    await putEntry('kzf-' + inviter, accName(), 2); S.fr.list[inviter] = 1; delete S.fr.sent[inviter];
    localStorage.setItem('kz_ref_done', '1'); localStorage.removeItem('kz_ref');
    if (!was && !S.invWelcome) { S.invWelcome = 1; addTorch(10); S.jade += 100; save(); modal('<h3 class="stroke">환영 선물</h3><p style="text-align:center">친구 초대로 들어왔어요! <b style="color:#ffe27a">' + esc(hit.name) + '</b>님과 친구가 되었어요.</p><div class="xrwd">' + ic('torch') + '<b class="stroke-s">10</b>' + ic('jade') + '<b class="stroke-s">100</b></div>'); refresh(); }
    else save();
  }
  async function inviterSettle() {
    S.invt = S.invt || {}; S.invt.got = S.invt.got || {}; S.invt.ms = S.invt.ms || {}; const me = accUser() && accUser().uid; if (!me || S.codeOk !== me) return;
    const rows = await listBoard('kzi-' + S.myCode, 200), fresh = rows.filter(r => r.id !== me && !S.invt.got[r.id]);
    if (!fresh.length) return;
    for (const r of fresh) { S.invt.got[r.id] = 1; S.fr.list[r.id] = 1; addTorch(5); S.jade += 50; }
    const n = Object.keys(S.invt.got).length; let bonus = 0; for (const [k, j] of INV_MS) if (n >= k && !S.invt.ms[k]) { S.invt.ms[k] = 1; S.jade += j; bonus += j; }
    save(); refresh();
    toast((fresh.length === 1 ? esc(fresh[0].name) + '님이' : esc(fresh[0].name) + '님 외 ' + (fresh.length - 1) + '명이') + ' 초대로 들어왔어요! 횃불 +' + 5 * fresh.length + ', 옥 +' + (50 * fresh.length + bonus));
  }
  function refWelcome() {
    const code = refCode(); if (!code || accUser() || sessionStorage.getItem('kz_refw')) return; sessionStorage.setItem('kz_refw', '1');
    modal('<h3 class="stroke">친구 초대로 왔어요!</h3><p style="text-align:center">구글 로그인하면 환영 선물 <b style="color:#ffe27a">횃불 10개 · 옥 100개</b>를 받고, 초대한 친구와 자동으로 친구가 돼요.</p>' + (accOnline() ? '<div class="xgoogle" data-act="gLogin"><i class="g"></i>구글로 가입·로그인</div>' : '<p style="text-align:center">hankuk-in.com 에서 열어 주세요</p>') + '<div class="row"><div class="btn b" data-act="close">나중에</div></div>');
  }
  function torchHelp() {
    modal('<h3 class="stroke">횃불</h3><p>챕터에 들어갈 때 5개를 써요. 6분마다 1개씩 최대 30개까지 차요. 친구 선물과 초대로 받은 횃불은 30개를 넘어 99개까지 쌓여요.</p>' +
      '<div class="row"><div class="btn y" data-act="frInvite">친구 초대하기</div><div class="btn g" data-act="friend">친구에게 받기</div></div><div class="row"><div class="btn r" data-act="buy" data-v="torch30">옥 40으로 30개</div></div>');
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
  (function watchAcc() { let n = 0; const t = setInterval(() => { const A = window.HKAccount; if (A && A.onChange) { clearInterval(t); A.onChange(() => { try { if (accUser()) setTimeout(() => socialTick(true), 500); } catch (e) {} try { if ($('#s-lobby') && $('#s-lobby').classList.contains('on') && !$('#gacha', root)) { const m = $('#mdl', root), set = m && m.querySelector('.xacc'); renderLobby(); if (set) settingsModal(); } } catch (e) {} }); } else if (++n > 80) clearInterval(t); }, 250); })();

  (function preItems() { setTimeout(() => { const L = []; for (const s of SLOTS) for (let g = 0; g < 6; g++) L.push(s.id === 'weapon' ? 'weapon_g' + g : s.id + '_g' + g); for (const w of ['nogi', 'jochong', 'seungja']) L.push('w_' + w); for (const k in SG) L.push(SG[k].img); window.__itemImgs = L.map(n => { const i = new Image(); i.src = 'img/items/' + n + '.webp'; return i; }); }, 1500); })();
  /* ---------------- 누르기 처리 ---------------- */
  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act, v = t.dataset.v;
    switch (a) {
      case 'enter': { const go = () => { music('bgm_lobby'); tab = 'home'; renderLobby(); setTimeout(() => { refWelcome(); socialTick(true); }, 900); }; if (!S.seenOp) { S.seenOp = 1; save(); storyOpening(go); } else go(); break; }
      case 'opening': closeModal(); storyOpening(null); break;
      case 'dlg': closeModal(); chDlg(+v, null, true); break;
      case 'ending': closeModal(); storyCuts(END_CUTS, i => 'end' + (i + 1), null); break;
      case 'storyBook': storyBook(); break;
      case 'tab': tab = v; closeModal(); renderLobby(); break;
      case 'goShop': tab = 'shop'; renderLobby(); break;
      case 'buyTorch': torchHelp(); break;
      case 'buyTorchOld': modal('<h3 class="stroke">횃불</h3><p>챕터에 들어갈 때 5개를 써요. 6분마다 1개씩 차오르고 최대 30개예요.</p><div class="row"><div class="btn r" data-act="buy" data-v="torch30">옥 40으로 30개</div></div>'); break;
      case 'close': closeModal(); try { refresh(); } catch (e2) {} break;   /* 보상을 받고 닫으면 빨간 점·재화를 바로 다시 계산 */
      case 'pass': passModal(); break;
      case 'passGet': { xinit(); const row = v[0], i = +v.slice(1), lv = Math.floor(S.pass.xp / PASS_XP); if (lv <= i) break; if (row === 'f' && !S.pass.f[i]) { const [k, n] = passFree(i); give(k, n); S.pass.f[i] = 1; toast('패스 선물을 받았어요'); } else if (row === 'p' && S.pass.paid && !S.pass.p[i]) { const [k, n] = passPaid(i); give(k, n); S.pass.p[i] = 1; toast('황금 패스 선물을 받았어요'); } save(); try { refresh(); } catch (e2) {} passModal(); break; }
      case 'passBuy': payModal('pass'); break;
      case 'payBuy': payModal(v); break;
      case 'payGo': payGo(v); break;
      case 'ach': achModal(); break;
      case 'achGet': { xinit(); const a = ACH.find(x => x.id === v); if (!a || S.ach[a.id] || a.v() < a.need) break; S.ach[a.id] = 1; give(a.r[0], a.r[1]); save(); toast('업적 보상을 받았어요'); try { refresh(); } catch (e2) {} achModal(); break; }
      case 'codex': codexModal(); break;
      case 'cdTab': cdTab = v; codexModal(); break;
      case 'cdGet': { xinit(); const x = codexItems().find(o => o.k === v); if (!x || !x.own || S.codex[cdTab][v]) break; S.codex[cdTab][v] = 1; S.jade += x.r; save(); toast('도감 보상 옥 ' + x.r); try { refresh(); } catch (e2) {} codexModal(); break; }
      case 'event': evModal(); break;
      case 'evGet': { xinit(); if (S.ev.got >= 7 || S.ev.last === today()) break; const [k, n] = EVR[S.ev.got]; give(k, n); S.ev.got++; S.ev.last = today(); save(); toast('축제 선물을 받았어요'); evModal(); break; }
      case 'rank': rankModal(); break;
      case 'rkLogin': try { window.HKAccount && window.HKAccount.openLogin && window.HKAccount.openLogin(); } catch (e) {} break;
      case 'friend': friendModal(); break;
      case 'frAdd': case 'frOk': case 'frNo': case 'frGift': case 'frTake': case 'frBeg': frAct(a, v); break;
      case 'frInvite': shareInvite(); break;
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
      case 'mapNM': S.mapNM = v === '1'; save(); renderMap(); break;
      case 'node': { const n = +v; if (n > (isNM() ? S.nm.chap : S.chap)) { toast('앞 챕터를 먼저 깨야 해요'); break; } S.sel = n; save(); chapModal(n); break; }
      case 'chest': e.stopPropagation(); S.chest[v] = 1; S.jade += 50; S.stone += 5; save(); toast('보상 상자: 옥 50, 신력석 5'); renderMap(); break;
      case 'start': startBattle(S.sel); break;
      case 'go': startBattle(+v); break;
      case 'patrol': patrolModal(); break;
      case 'patrolGet': { const p = patrol(); S.gold += p.gold; S.stone += p.stone; S.jade += p.jade; const up = addExp(p.exp); S.patrolT = now(); closeModal(); toast('엽전 ' + fmt(p.gold) + ' 받았어요' + (up ? ' · 레벨 올라감!' : '')); refresh(); break; }
      case 'patrolFast': { if (S.torch < 5) { toast('횃불이 모자라요'); break; } S.torch -= 5; const c = Math.max(1, S.chap); S.gold += 480 * c; S.stone += 3; addExp(80 * c); closeModal(); toast('빠른 순찰: 엽전 ' + fmt(480 * c)); refresh(); break; }
      case 'att': attModal(); break;
      case 'attGet': { const R = attModal.R, k = S.att % 7, [i, val] = R[k]; if (i === 'coin') S.gold += val; else if (i === 'jade') S.jade += val; else S.stone += val; S.att++; S.attDay = today(); closeModal(); toast(k + 1 + '일째 출석 보상을 받았어요'); refresh(); break; }
      case 'quest': questModal(); break;
      case 'achAll': { xinit(); const L = achReady(); for (const a of L) { S.ach[a.id] = 1; give(a.r[0], a.r[1]); } save(); toast('업적 보상 ' + L.length + '개를 받았어요'); try { refresh(); } catch (e2) {} achModal(); break; }
      case 'passAll': { xinit(); const L = passReady(); for (const k of L) { const i = +k.slice(1); if (k[0] === 'f') { const [a, b] = passFree(i); give(a, b); S.pass.f[i] = 1; } else { const [a, b] = passPaid(i); give(a, b); S.pass.p[i] = 1; } } save(); toast('패스 선물 ' + L.length + '개를 받았어요'); try { refresh(); } catch (e2) {} passModal(); break; }
      case 'cdAll': { xinit(); const L = cdReady(); let j = 0; for (const [t, x] of L) { S.codex[t][x.k] = 1; j += x.r; } S.jade += j; save(); toast('도감 보상 옥 ' + fmt(j)); try { refresh(); } catch (e2) {} codexModal(); break; }
      case 'qAll': { const L = qReady(); S.quests.got = S.quests.got || {}; let j = 0; for (const q of L) { S.quests.got[q.id] = 1; j += q.r; } S.jade += j; save(); toast('임무 보상 옥 ' + fmt(j)); try { refresh(); } catch (e2) {} questModal(); break; }
      case 'qGet': { const q = QUESTS.find(x => x.id === v); S.quests.got = S.quests.got || {}; S.quests.got[v] = 1; S.jade += q.r; save(); questModal(); refresh(); break; }
      case 'mailbox': mailModal(); break;
      case 'mailGet': S.mail = true; S.jade += 500; S.gold += 5000; S.stone += 30; closeModal(); toast('첫 선물을 받았어요'); refresh(); break;
      case 'settings': settingsModal(); break;
      case 'coupon': couponModal(); break;
      case 'runlog': runLogModal('me'); break;
      case 'runlogAll': runLogModal('all'); break;
      case 'runlogDl': runLogDownload(); break;
      case 'starter': starterModal(); break;
      case 'cpnUse': useCoupon(); break;
      case 'toggleVib': { const off = localStorage.getItem('kz_vib') === '0'; localStorage.setItem('kz_vib', off ? '1' : '0'); if (off && navigator.vibrate) navigator.vibrate(40); settingsModal(); break; }
      case 'toggleMusic': S.music = !S.music; save(); if (S.music) music('bgm_lobby'); else stopMusic(); settingsModal(); break;
      case 'reset': if (confirm('저장을 모두 지우고 처음부터 할까요?')) { localStorage.removeItem(KEY); load(); closeModal(); tab = 'home'; renderLobby(); } break;
      case 'profile': { const st = stats(); modal('<h3 class="stroke">처용</h3>' + (S.title ? '<p style="text-align:center;color:#ff7a6a;font-size:24px">〈' + S.title + '〉</p>' : '') + '<p>레벨 ' + S.lv + ' (경험 ' + S.exp + '/' + needExp(S.lv) + ')</p><p>공격력 ' + fmt(st.atk) + ' · 체력 ' + fmt(st.hp) + ' · 전투력 ' + fmt(st.power) + '</p><p>깬 챕터 ' + (S.chap - 1) + ' · 도전 ' + S.plays + '번</p>' +
        '<div class="row"><div class="btn b" data-act="settings">설정</div><div class="btn p" data-act="coupon">쿠폰 입력</div></div>'); break; }
      case 'item': IUP = false; itemModal(+v); break;
      case 'itemUpTog': IUP = !IUP; itemModal(+v); break;
      case 'equip': { const it = byUid(+v); S.equip[it.slot] = it.uid; it.nw = 0; closeModal(); refresh(); toast(itemName(it) + ' 착용'); break; }
      case 'unequip': { const it = byUid(+v); if (it && S.equip[it.slot] === it.uid) { delete S.equip[it.slot]; closeModal(); refresh(); toast(itemName(it) + ' 해제'); } break; }
      case 'swap': closeModal(); eqF = v; eqBig = true; renderLobby(); toast('바꿀 장비를 눌러 착용해요'); break;
      case 'lock': { const it = byUid(+v); if (it) { it.lk = !it.lk; save(); itemModal(+v); renderLobby(); } break; }
      case 'itemUp10': { const it = byUid(+v); if (it) { upItem(it, 10); itemModal(+v); renderLobby(); } break; }
      case 'itemUpMax': { const it = byUid(+v); if (it) { upItem(it, 999); itemModal(+v); renderLobby(); } break; }
      case 'eqF': eqF = v; renderLobby(); break;
      case 'eqSort': eqSortK = ({ g: 'lv', lv: 'new', new: 'g' })[eqSortK]; renderLobby(); break;
      case 'eqBig': eqBig = !eqBig; renderLobby(); break;
      case 'bulkSalv': bulkSalvModal(); break;
      case 'bsTog': eqx(); S.bsG[+v] = S.bsG[+v] ? 0 : 1; save(); bulkSalvModal(); break;
      case 'bulkGo': { eqx(); const L = bsList(); let gold = 0, ore = 0; for (const it of L) { const sv = salvVal(it); gold += sv.gold; ore += sv.ore; } S.inv = S.inv.filter(i => !L.includes(i)); S.gold += gold; S.ore += ore; save(); closeModal(); refresh(); toast(L.length + '개 분해 · 엽전 ' + fmt(gold) + ' · 정련석 ' + fmt(ore)); break; }
      case 'itemUp': { const it = byUid(+v); if (it) { upItem(it, 1); itemModal(+v); renderLobby(); } break; }
      case 'autoEq': for (const s of SLOTS) { let best = byUid(S.equip[s.id]), bp = best ? stats().power : -1; for (const i of S.inv.filter(i => i.slot === s.id)) { const p = powerWith(i).power; if (p > bp) { bp = p; best = i; } } if (best) S.equip[s.id] = best.uid; } refresh(); toast('가장 좋은 장비를 입었어요'); break;
      case 'merge': { let made = 0; ITEM_SRC = '승급(합성)';
        const free = it => !Object.values(S.equip).includes(it.uid);
        for (const s of SLOTS) for (let g = 0; g < 7; g++) {
          if (g + 1 > maxG(progCh()) && g < 6) continue;   /* 승급도 그 장 문을 넘지 않음 */
          if (g < 4) { const keys = {}; for (const it of S.inv) if (it.slot === s.id && it.g === g && !it.sg && free(it)) { const k = (it.w || '') + (it.set || ''); (keys[k] = keys[k] || []).push(it); }
            for (const k in keys) { const pool = keys[k]; while (pool.length >= 3) { const use = pool.splice(0, 3); S.inv = S.inv.filter(i => !use.includes(i)); const n = mkItem(s.id, g + 1, use[0].w); n.set = use[0].set || n.set; n.lv = Math.max(...use.map(u => u.lv)); S.inv.push(n); made++; } } }
          else { let tgt; while ((tgt = S.inv.filter(i => i.slot === s.id && i.g === g && (g < 6 || (i.s || 0) < STAR_MAX(g))).sort((a, b) => (b.s || 0) - (a.s || 0) || b.lv - a.lv)[0])) { const fod = S.inv.filter(i => i !== tgt && i.slot === s.id && i.g === g && free(i) && !i.sg && (i.s || 0) === 0).slice(0, 2); if (fod.length < 2) break; S.inv = S.inv.filter(i => !fod.includes(i)); if ((tgt.s || 0) < STAR_MAX(g)) tgt.s = (tgt.s || 0) + 1; else { tgt.g = g + 1; tgt.s = 0; } made++; if (g === 6 && tgt.s >= STAR_MAX(6)) break; } }
        }
        ITEM_SRC = ''; refresh(); toast(made ? '승급 ' + made + '번 성공!' : '승급할 장비가 없어요'); break; }
      case 'salvage': { eqx(); const it = byUid(+v); if (!it || isEq(it) || it.lk) break; const sv = salvVal(it); S.ore += sv.ore; S.gold += sv.gold; S.inv = S.inv.filter(i => i !== it); save(); closeModal(); refresh(); toast('분해: 엽전 ' + fmt(sv.gold) + ' · 정련석 ' + sv.ore); break; }
      case 'comp': selComp = v; infoFold = false; renderLobby(); break;
      case 'infoFold': infoFold = v === '1'; renderLobby(); break;
      case 'team': { const i = S.team.indexOf(v); if (i >= 0) S.team.splice(i, 1); else { if (S.team.length >= 2) S.team.shift(); S.team.push(v); } refresh(); break; }
      case 'unteam': S.team = S.team.filter(x => x !== v); refresh(); break;
      case 'compUp': { const c = S.comps[v], lc = 300 * c.lv * (COMP[v].g + 1); if (S.gold < lc || c.lv >= c.star * 10) break; S.gold -= lc; c.lv++; refresh(); toast(COMP[v].n + ' 레벨 ' + c.lv); break; }
      case 'compStar': { const c = S.comps[v], sc = c.star * 10; if (c.sh < sc || c.star >= 5) break; c.sh -= sc; c.star++; refresh(); toast(COMP[v].n + ' 별 ' + c.star + '개!'); break; }
      case 'compUnlock': { const c = S.comps[v]; if (c.sh < 10) break; c.sh -= 10; c.own = true; refresh(); toast(COMP[v].n + '이(가) 함께해요!'); break; }
      case 'skUp': { const lv = S.skills[v], cost = lv * 15, gc = lv * 400; if (S.stone < cost || S.gold < gc || lv >= 5) break; S.stone -= cost; S.gold -= gc; S.skills[v] = lv + 1; refresh(); break; }
      case 'skins': skinModal(); break;
      case 'mounts': mountModal(); break;
      case 'mountOn': if (mOwn(v)) { S.mount = v; save(); toast('탈것에 올랐어요'); mountModal(); refresh(); } break;
      case 'mountOff': S.mount = null; save(); mountModal(); refresh(); break;
      case 'mountBuy': { const m = MOUNTS.find(x => x.id === v); if (!m || mOwn(v)) break; if (S.jade < m.price) { toast('옥이 모자라요'); break; } S.jade -= m.price; S.mounts = S.mounts || {}; S.mounts[v] = 1; S.mount = v; save(); toast(m.n + '을(를) 얻었어요!'); mountModal(); refresh(); break; }
      case 'wb': wbModal(); break;
      case 'wbGo': closeModal(); wbGo(v); break;
      case 'ar': arModal(); break;
      case 'arGo': closeModal(); arGo(+v); break;
      case 'arRe': { arDay().foes = null; save(); arModal(); break; }
      case 'evTab': evModal(v); break;
      case 'raceGet': raceGet(+v); break;
      case 'gbGet': { const s = wbDay(), i = +v; s.gGot = s.gGot || {}; if (s.gGot[i]) break; const [, kk, vv] = GB_STAGE[i]; give(kk, vv); s.gGot[i] = 1; save(); toast('문파 보스 단계 보상!'); refresh(); guildModal(); break; }
      case 'skinBuy': { const s = SKINS.find(x => x.id === v); if (!s || skinOwn(v)) break; if (S.jade < s.price) { toast('옥이 모자라요'); break; } S.jade -= s.price; S.skins = S.skins || {}; S.skins[v] = 1; S.skin = v; save(); toast(s.n + ' 의상을 얻었어요!'); if ($('#mdl', root)) skinModal(); refresh(); break; }
      case 'skinWear': if (skinOwn(v)) { S.skin = v; save(); toast('의상을 바꿨어요'); if ($('#mdl', root)) skinModal(); refresh(); } break;
      case 'buyLeg': { if (S.legWk === LWK()) { toast('이번 주 전설 무기는 이미 샀어요'); break; } if (!legWeek().includes(v)) break; if (S.jade < LEG_PRICE) { toast('옥이 모자라요'); break; } S.jade -= LEG_PRICE; S.legWk = LWK(); ITEM_SRC = '전설 무기 상점(확정)'; ITEM_CH = progCh(); const it = mkItem('weapon', 4, v); ITEM_CH = 0; ITEM_SRC = ''; it.q = Math.round(90 + Math.random() * 15); if (!it.uq || !it.uq.length) it.uq = [rnd(Object.keys(UQ))]; S.inv.push(it); RARE_HIT = 4; rareShow(it); save(); refresh(); break; }
      case 'buy': {
        if (v === 'freeGold') { if (S.freeGold === today()) break; S.freeGold = today(); S.gold += 500; toast('엽전 500'); }
        else if (v === 'gold3k') { if (S.jade < 50) { toast('옥이 부족해요'); break; } S.jade -= 50; S.gold += 5000; toast('엽전 5,000'); }
        else if (v === 'stone20') { if (S.jade < 80) { toast('옥이 부족해요'); break; } S.jade -= 80; S.stone += 20; toast('신력석 20'); }
        else if (v === 'torch30') { if (S.jade < 40) { toast('옥이 부족해요'); break; } S.jade -= 40; S.torch = Math.min(99, S.torch + 30); toast('횃불 30'); closeModal(); }
        else if (v === 'starterPk') { starterModal(); break; }
        else if (v === 'jade300' || v === 'jade1k') { payModal(v); break; }   /* 유료 상품: 결제가 붙기 전에는 지급하지 않는다 */
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
