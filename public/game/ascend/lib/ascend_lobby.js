/* ASCEND v3.48 — lobby layout (loaded last)
   The home screen had grown by accretion: two overlapping characters, a 4+7 button stack of mixed sizes, later buttons
   landing wherever their neighbour happened to be. This file only re-arranges and re-skins what is already there
   (the buttons are MOVED, so every existing click handler keeps working):
     top-left   pilot chip (level, name) · currencies
     top-right  missions · notices · manual · settings · language
     right      three main sorties as cards (squad dungeon · galactic expedition · instant battle) + three small ones
     bottom     one dock: hangar · pilot · wingmates · growth · rankings · events · records · style
   Same structure on a phone (the cards go under the art, the dock becomes a 4-column grid). */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var $=function(id){return document.getElementById(id);};
var CSS=[
'#menu .ha-c2{display:none!important}',
'#menu .ha-c1{display:none!important}',
'#menu .ha-vig{background:linear-gradient(90deg,rgba(4,7,14,.86) 0%,rgba(4,7,14,.25) 34%,rgba(4,7,14,.1) 58%,rgba(4,7,14,.82) 100%),linear-gradient(0deg,rgba(4,7,14,.92) 0%,rgba(4,7,14,0) 30%,rgba(4,7,14,0) 82%,rgba(4,7,14,.7) 100%)!important}',
'#menu .lb-top{top:14px!important;left:20px!important;right:20px!important;width:auto!important;display:flex;align-items:center;gap:8px}',
'#menu .lb-top .ver{display:none}',
'#menu .lb-top button{height:34px;padding:0 13px;border-radius:17px;border:1px solid rgba(255,255,255,.1);background:rgba(10,15,28,.6);color:#d8e0ee;font:600 12.5px "Noto Sans KR",sans-serif;backdrop-filter:blur(8px)}',
'#menu .lb-top button:hover{border-color:#cfe0f2;color:#fff}',
'#lbyChip{display:flex;align-items:center;gap:10px;padding:5px 14px 5px 6px;border-radius:22px;background:rgba(10,15,28,.66);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(8px);cursor:pointer}',
'#lbyChip .lv{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:800 14px Rajdhani,sans-serif;color:#0a1322;background:linear-gradient(135deg,#ffffff,#93a6bc)}',
'#lbyChip b{font:700 14px "Noto Sans KR",sans-serif;color:#fff;display:block;line-height:1.1}',
'#lbyChip small{font:600 11px "Noto Sans KR",sans-serif;color:#9fb0cc}',
'#lbyCur{display:flex;gap:6px}','#menu .lb-top #mShop{margin-right:auto;border-color:rgba(207,224,242,.45)}','#menu .lb-top #mShop svg{width:16px;height:16px}',
'#lbyCur span{height:34px;display:flex;align-items:center;gap:6px;padding:0 12px;border-radius:17px;background:rgba(10,15,28,.6);border:1px solid rgba(255,255,255,.08);font:700 13px Rajdhani,"Noto Sans KR",sans-serif;color:#e9eef6}',
'#lbyCur i{font-style:normal;color:#ffd166}#lbyCur span+span i{color:#7fe8ff}',
'#menu .lb-left{left:28px!important;top:84px!important;width:auto!important}',
'#menu .logo .tagl{font-size:11px;letter-spacing:.5em;color:#9fb6cf}',
'#menu .logo h1{font-size:clamp(40px,5vw,62px)!important;line-height:1!important;margin:6px 0 8px!important}',
'#menu .logo .sub{display:none}',
'#menu .logo .motto{font-size:13px;color:#aebbd2;letter-spacing:.2em}',
'#menu .lb-right{display:none!important}',
'#menu .hm-stack{position:absolute!important;right:24px!important;left:auto!important;top:72px!important;bottom:112px!important;width:min(300px,26vw)!important;height:auto!important;display:flex!important;flex-direction:column;justify-content:center;gap:10px}',
'#lbyMain{display:flex;flex-direction:column;gap:10px}',
'#lbySub{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
'#menu .hm-stack .lb-row{display:none!important}',
'#menu button.lbyCard{position:relative;display:flex!important;align-items:center;gap:14px;width:100%!important;height:auto!important;min-height:58px;padding:9px 14px!important;margin:0!important;text-align:left;border-radius:14px!important;border:1px solid rgba(255,255,255,.1)!important;background:linear-gradient(100deg,rgba(14,20,36,.9),rgba(14,20,36,.62))!important;color:#fff!important;backdrop-filter:blur(10px);overflow:hidden;transition:transform .15s,border-color .15s,box-shadow .15s;cursor:pointer}',
'#menu button.lbyCard::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--ac,#cfe0f2)}',
'#menu button.lbyCard::after{content:"›";position:absolute;right:16px;top:50%;transform:translateY(-52%);font:300 26px Rajdhani,sans-serif;color:rgba(255,255,255,.35)}',
'#menu button.lbyCard:hover{transform:translateX(-4px);border-color:var(--ac,#cfe0f2)!important;box-shadow:0 10px 30px rgba(0,0,0,.45)}',
'#menu button.lbyCard>svg{display:none}','#menu button.lbyCard .ic svg{width:22px;height:22px;color:var(--ac,#cfe0f2)}','#lbyDock .di svg{display:block;width:21px;height:21px}','#lbyDock>*:hover .di{color:#8fe3ff}',
'#menu button.lbyCard .ic{flex:0 0 36px;height:36px;border-radius:12px;display:grid;place-items:center;font-size:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}',
'#menu button.lbyCard .tt{font:800 15px "Noto Sans KR",sans-serif;display:block;letter-spacing:-.01em}',
'#menu button.lbyCard .ss{font:500 12px "Noto Sans KR",sans-serif;color:#9fb0cc;display:block;margin-top:3px}',
'#menu button.lbyCard.main{min-height:64px;background:linear-gradient(100deg,rgba(26,38,58,.92),rgba(14,20,36,.66))!important;border-color:rgba(190,214,240,.45)!important}',
'#menu button.lbyCard.main .tt{font-size:16.5px}','#menu button.lbyCard .ss{font-size:11px!important;margin-top:1px!important}',
'#menu button.lbyCard.sm{min-height:42px;padding:10px 12px!important;gap:0;justify-content:center;text-align:center}',
'#menu button.lbyCard.sm::after{display:none}#menu button.lbyCard.sm .ic{display:none}#menu button.lbyCard.sm .ss{display:none}',
'#menu button.lbyCard.sm .tt{font-size:13.5px;font-weight:700}',
'#lbyDock{position:absolute;left:50%;transform:translateX(-50%);bottom:44px;display:flex;gap:2px;padding:6px 8px;border-radius:18px;background:rgba(8,12,22,.74);border:1px solid rgba(255,255,255,.09);backdrop-filter:blur(12px);z-index:3;max-width:calc(100vw - 24px)}',
'#lbyDock>*{all:unset;box-sizing:border-box;cursor:pointer;min-width:60px;padding:6px 6px 5px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:4px;font:600 11.5px "Noto Sans KR",sans-serif;color:#b9c5da;text-align:center;position:relative;white-space:nowrap}',
'#lbyDock>*:hover{background:rgba(255,255,255,.07);color:#fff}',
'#lbyDock>* .di{font-size:19px;line-height:1}',
'#lbyDock>* .bd{position:absolute;top:3px;right:10px;min-width:15px;height:15px;padding:0 4px;border-radius:8px;background:#ff5a5a;color:#fff;font:800 10px/15px sans-serif;box-sizing:border-box}',
'#menu .lb-foot{bottom:8px!important;height:26px!important;font-size:11.5px;opacity:.75}',
'#menu .lb-foot>div:last-child{display:none}','#menu .lb-foot .news{display:none!important}','#menu #ntBtn{display:none!important}',
'@media (max-width:820px){',
' #menu .lb-left{top:66px!important;left:18px!important}#menu .logo h1{font-size:38px!important}#menu .logo .motto{display:none}',
' #menu .lb-top{flex-wrap:wrap;gap:6px}#menu .lb-top #mHelp,#menu .lb-top #mLang{display:none}#lbyChip small{display:none}',
' #menu .hm-stack{left:14px!important;right:14px!important;width:auto!important;top:auto!important;bottom:150px!important;justify-content:flex-end}',
' #lbyMain{display:grid!important;grid-template-columns:repeat(3,1fr);gap:6px}#lbySub{gap:6px}#menu .hm-stack{gap:6px!important;bottom:96px!important}#menu button.lbyCard{min-height:46px!important;padding:6px 8px!important;justify-content:center;text-align:center;gap:6px}#menu button.lbyCard::after{display:none}#menu button.lbyCard .ss{display:none!important}#menu button.lbyCard .ic{flex:0 0 22px;height:22px;background:none;border:0}#menu button.lbyCard .ic svg{width:18px;height:18px}#menu button.lbyCard .tt,#menu button.lbyCard.main .tt{font-size:13px!important}#menu button.lbyCard.sm{min-height:36px!important}#menu button.lbyCard.sm .tt{font-size:12px!important;font-weight:600}',
' #lbyDock{left:10px;right:10px;transform:none;bottom:34px;display:grid;grid-template-columns:repeat(9,1fr);gap:0;padding:3px 2px}#lbyDock>*{font-size:10px!important;gap:2px!important;padding:5px 0 4px!important}#lbyDock .di svg{width:18px!important;height:18px!important}#lbyDock>* .bd{top:0!important;right:2px!important}#lbyDock>*{min-width:0;padding:6px 2px}',
' #menu .lb-foot .news{font-size:10.5px}}'
].join('\n');
// line icons (one stroke weight, currentColor) instead of emoji
var IC={wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c3 0 5 1.8 5 4.5"/>',grow:'<path d="M4 20h16"/><path d="M6 16l4-5 3 3 5-7"/><path d="M14 7h4v4"/>',trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8 20h8"/>',gift:'<rect x="4" y="10" width="16" height="10" rx="1.5"/><path d="M3 7h18v3H3zM12 7v13"/><path d="M12 7c-1.5-3.5-5.5-3-5-1s3.5 1 5 1zM12 7c1.5-3.5 5.5-3 5-1s-3.5 1-5 1z"/>',chart:'<path d="M5 20V11M12 20V4M19 20v-6"/>',shop:'<path d="M4 9h16l-1.2 10H5.2z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',swords:'<path d="M4 4l9 9M20 4l-9 9M7 14l3 3M17 14l-3 3M4 20l4-4M20 20l-4-4"/>',planet:'<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="3.4" transform="rotate(-20 12 12)"/>',play:'<path d="M8 5l11 7-11 7z"/>'};
var svg=function(k){return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(IC[k]||'')+'</svg>';};
// card text: [id, class, accent, icon, title, subtitle]
var CARDS=[['mSq','main','#cfe0f2','swords',L('분대 던전','Squad Dungeon'),L('200단계 · 티어 · 주간 순위 보상','200 stages · tiers · weekly rank rewards')],
 ['mHunt','','#7dffd0','target',L('필드 사냥','Field Hunting'),L('열린 사냥터 · 필드 보스 · 전리품','Open hunting grounds · field bosses · loot')],
 ['mRpg','','#7fe8ff','planet',L('은하 원정','Galactic Expedition'),L('이야기 · 던전 · 보스 토벌','Story · dungeons · bosses')],
 ['mSolo','sm','#7dffd0','',L('즉시 출격','Instant Battle'),''],['mArena','sm','#b48cff','',L('5:5 궤도 전선','5v5 Orbit'),''],['mOnline','sm','#ff9b6b','',L('온라인 대전','Online'),''],['mDuel','sm','#ff6b6b','',L('결투장','Duel'),'']];
// dock: [id, icon, label]
var DOCK=[['mHangar','wrench',L('정비소','Hangar')],['mChar','user',L('파일럿','Pilot')],['mWing','users',L('동료','Wingmates')],['mGrow','grow',L('성장','Growth')],['mRank','trophy',L('순위','Rankings')],['mEvent','gift',L('행사','Events')],['mMail','mail',L('메일','Mail')],['mRec','chart',L('기록','Records')],['mCls','target',L('성향','Style')]];
var built=false;
var build=function(){var menu=$('menu'),stack=menu&&menu.querySelector('.hm-stack'),lb=menu&&menu.querySelector('.lb'),top=menu&&menu.querySelector('.lb-top');if(!menu||!stack||!lb||!top||!$('mSq')||!$('mRpg'))return false;
 if(!$('lbyCss')){var st=document.createElement('style');st.id='lbyCss';st.textContent=CSS;document.head.appendChild(st);}
 var main=$('lbyMain')||(function(){var d=document.createElement('div');d.id='lbyMain';stack.insertBefore(d,stack.firstChild);return d;})();
 var sub=$('lbySub')||(function(){var d=document.createElement('div');d.id='lbySub';stack.insertBefore(d,main.nextSibling);return d;})();
 var dock=$('lbyDock')||(function(){var d=document.createElement('div');d.id='lbyDock';lb.appendChild(d);return d;})();
 // field hunting: straight from the lobby (it used to be reachable only through the expedition hub)
 if(!$('mHunt')){var hb=document.createElement('button');hb.id='mHunt';hb.onclick=function(){var go=function(){var h=$('mRpg');if(!h)return;window.__busyText=L('사냥터 여는 중…','Opening hunting grounds…');h.click();var n=0,iv=setInterval(function(){n++;var tb=[].slice.call(document.querySelectorAll('#rpg .rtabs button')).filter(function(x){return /사냥터|Hunting/.test(x.textContent);})[0],rp=$('rpg');if(tb&&rp&&!rp.classList.contains('hidden')){clearInterval(iv);tb.click();}else if(n>40)clearInterval(iv);},150);};if(X.huntGate)X.huntGate(go);else go();};main.appendChild(hb);}
 var sl=$('mSolo');if(sl&&sl.dataset.lby&&!/sm/.test(sl.className))delete sl.dataset.lby;
 CARDS.forEach(function(c){var b=$(c[0]);if(!b)return;var host=c[1]==='sm'?sub:main;if(b.parentNode!==host)host.appendChild(b);if(!b.dataset.lby){b.dataset.lby=1;b.className='lbyCard '+c[1];b.style.setProperty('--ac',c[2]);b.innerHTML='<span class="ic">'+(c[3]?svg(c[3]):'')+'</span><span><span class="tt">'+c[4]+'</span><span class="ss">'+c[5]+'</span></span>';}});
 DOCK.forEach(function(d){var b=$(d[0]);if(!b)return;if(b.parentNode!==dock)dock.appendChild(b);var n=0;try{if(d[0]==='mGrow')n=X.skFree?Math.max(0,X.skFree()):0;else if(d[0]==='mEvent')n=X.evCan&&X.evCan()?1:0;else if(d[0]==='mMail')n=X.mailCount?X.mailCount():0;}catch(e){}
  var html='<span class="di">'+svg(d[1])+'</span><span>'+d[2]+'</span>'+(n?'<span class="bd">'+(d[0]==='mEvent'?'!':n)+'</span>':'');if(b.dataset.lby!==html||!b.querySelector('.di')){b.dataset.lby=html;b.className='';b.removeAttribute('style');b.innerHTML=html;}});
 // shop: straight from the lobby, between the currencies and the missions button
 if(!$('mShop')&&$('lbyCur')){var sh=document.createElement('button');sh.id='mShop';sh.innerHTML='<span style="display:inline-flex;align-items:center;gap:6px">'+svg('shop')+L('상점','Shop')+'</span>';sh.onclick=function(){var h=$('mHangar');if(!h)return;window.__busyText=L('상점 여는 중…','Opening shop…');h.click();var n=0,iv=setInterval(function(){n++;var tb=[].slice.call(document.querySelectorAll('#rpg .rtabs button')).filter(function(x){return /상점|Shop/.test(x.textContent);})[0],rp=$('rpg');if(tb&&rp&&!rp.classList.contains('hidden')){clearInterval(iv);tb.click();}else if(n>40)clearInterval(iv);},150);};$('lbyCur').parentNode.insertBefore(sh,$('lbyCur').nextSibling);}
 // game information (odds, grade gaps, rules) next to the manual button
 if(!$('mInfo')&&$('mHelp')){var gi=$('mHelp').cloneNode(false);gi.id='mInfo';gi.textContent=L('게임 정보','Game info');gi.onclick=function(){try{X.infoOpen('odds');}catch(e){}};$('mHelp').parentNode.insertBefore(gi,$('mHelp'));}
 // pilot chip + currencies in the top bar
 var chip=$('lbyChip');if(!chip){chip=document.createElement('div');chip.id='lbyChip';top.insertBefore(chip,top.firstChild);chip.onclick=function(){var b=$('mChar');b&&b.click();};var cur=document.createElement('div');cur.id='lbyCur';top.insertBefore(cur,chip.nextSibling);}
 try{var r=window.__A&&window.__A.R&&window.__A.R(),nm=(typeof P!=='undefined'&&P.name)||'Pilot',lv=(r&&r.lv)||1,tier='';try{var t=X.tierOf&&X.tierOf((r.sq&&r.sq.best)||0);tier=t?L(t.ko,t.en):'';}catch(e){}
  var h='<span class="lv">'+lv+'</span><span><b>'+String(nm).replace(/[<>&]/g,'')+'</b><small>'+(tier?tier+L(' 티어',' tier')+' · ':'')+L('전투력 ','CP ')+(X.cp?String(X.cp()).replace(/\B(?=(\d{3})+(?!\d))/g,','):'-')+'</small></span>';if(chip.dataset.h!==h){chip.dataset.h=h;chip.innerHTML=h;}
  var c2='<span><i class="cn"></i>'+String((r&&r.shards)||0).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'</span><span><i>◆</i>'+String((r&&r.cred)||0).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'</span>',cu=$('lbyCur');if(cu.dataset.h!==c2){cu.dataset.h=c2;cu.innerHTML=c2;}}catch(e){}
 return true;};
guard('lobby',function(){
 // shown only when every script has run (so the chips other scripts add are already there) - one appearance, no pop-in
 var ready=function(){if(document.readyState==='loading')return;var m=$('menu');if(m&&!m.classList.contains('lbyReady')){try{X.loopStrip&&X.loopStrip();}catch(e){}m.classList.add('lbyReady');}};
 var tick=function(){guard('lobbyTick',function(){var m=$('menu');if(!m||m.offsetParent===null&&getComputedStyle(m).display==='none')return;
  // the squad-dungeon button is added by a 1 s timer in index.html; make it here at once so the build does not wait for it
  if(!$('mSq')&&$('mWing')&&typeof window.squadOpen==='function'){var hb0=$('mWing'),b0=document.createElement('button');b0.id='mSq';b0.className=hb0.className;b0.textContent=L('분대 던전','Squad Dungeon');b0.onclick=function(){try{hide('#menu');}catch(e){}window.squadOpen();};hb0.parentNode.insertBefore(b0,hb0);}
  built=build()||built;if(built)ready();});};
 // build at once and on every frame until it has worked (it used to wait up to 0.7 s, so the old menu was seen first)
 tick();var n=0,fast=function(){if(built||n++>600)return;tick();requestAnimationFrame(fast);};requestAnimationFrame(fast);
 setInterval(tick,700);});
// ---------- expedition hub (#rpg: map · quests · hunting · hangar · shop · summon · codex) and the start screen ----------
// Same structure, one consistent skin: full-height glass panel, pill tabs, quiet section titles, cards with an accent bar,
// the quest you can play now stands out, locked ones step back.
var SKIN=[
'#rpg .panel{max-width:1240px!important;width:min(1240px,97vw)!important;max-height:96vh!important;padding:18px 22px!important;border-radius:20px!important;background:linear-gradient(180deg,rgba(13,19,34,.96),rgba(7,10,19,.97))!important;border:1px solid rgba(255,255,255,.09)!important;box-shadow:0 30px 90px rgba(0,0,0,.6)!important}',
'#rpg .rh h2{font:800 22px "Noto Sans KR",sans-serif!important;letter-spacing:-.01em}',
'#rpg .rh h2::before{content:"EXPEDITION";display:block;font:700 11px Rajdhani,sans-serif;letter-spacing:.4em;color:#9fb6cf;margin-bottom:2px}',
'#rpg .rcur span{border-radius:17px!important;border:1px solid rgba(255,255,255,.09)!important;background:rgba(255,255,255,.05)!important;padding:6px 13px!important;font:700 13px Rajdhani,"Noto Sans KR",sans-serif!important}',
'#rpg .rh button{border-radius:17px!important;height:34px;padding:0 14px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.05)!important;color:#dfe6f2!important;font:600 12.5px "Noto Sans KR",sans-serif!important}',
'#rpg .rh button.pri{background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;border:0!important;font-weight:800!important}',
'#rpg .rtabs{flex:0 0 auto!important;min-height:48px;box-sizing:border-box;align-items:center;gap:6px!important;border-bottom:0!important;margin:14px 0 14px!important;padding:5px;border-radius:14px;background:rgba(255,255,255,.04);overflow-x:auto;flex-wrap:nowrap!important;scrollbar-width:none}',
'#rpg .rtabs button{flex:0 0 auto;border-radius:10px!important;border-bottom:0!important;padding:9px 16px!important;font:700 13.5px "Noto Sans KR",sans-serif!important;color:#9fb0cc!important;transition:background .15s,color .15s}',
'#rpg .rtabs button.on{background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important}',
'#rpg .rtabs button:not(.on):hover{background:rgba(255,255,255,.06)!important;color:#fff!important}',
'#rpg .rbody{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent;padding-right:4px}',
'#rpg .rbody h3{font:700 11.5px Rajdhani,"Noto Sans KR",sans-serif!important;letter-spacing:.28em;color:#9fb6cf!important;text-transform:uppercase;margin:4px 0 10px!important;display:flex;align-items:center;gap:10px}',
'#rpg .rbody h3::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(159,182,207,.4),rgba(159,182,207,0))}',
'#rpg .hg{gap:22px!important}',
'#rpg .epi{position:relative;border-radius:14px!important;border:1px solid rgba(255,255,255,.08)!important;background:rgba(255,255,255,.035)!important;padding:13px 16px 13px 18px!important;margin:8px 0!important;transition:border-color .15s,transform .15s,background .15s}',
'#rpg .epi::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:2px;background:rgba(255,255,255,.14)}',
'#rpg .epi:hover{border-color:rgba(255,255,255,.2)!important;background:rgba(255,255,255,.06)!important}',
'#rpg .epi.lbyOn{border-color:rgba(190,214,240,.6)!important;background:linear-gradient(100deg,rgba(30,44,64,.5),rgba(255,255,255,.035))!important}',
'#rpg .epi.lbyOn::before{background:#cfe0f2}',
'#rpg .epi.lbyLock{opacity:.5}',
'#rpg .epi.lbyLock:hover{opacity:.75}',
'#rpg .epi b{font-size:15px}',
'#rpg .epi small,#rpg .epi .small{color:#9fb0cc}',
'#rpg .epi img{border-radius:10px!important;background:#0b1020}',
'#rpg button.pri{border-radius:10px!important;border:0!important;padding:9px 18px!important;font:800 13.5px "Noto Sans KR",sans-serif!important;background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;cursor:pointer}',
'#rpg button.pri:hover{filter:brightness(1.1)}',
'#rpg .cards{gap:10px!important}',
'#rpg .cd{border-radius:12px!important;background:rgba(255,255,255,.04)!important;border-width:1px!important;padding:8px!important}',
'#rpg .cd img{border-radius:8px}',
'#rpg .ban{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))!important;gap:10px!important}',
// coin icon for the earned currency
'.cn{display:inline-block;width:.95em;height:.95em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6cf,#f3c24f 46%,#b27a1c 100%);box-shadow:inset 0 0 0 1.5px #8a5a12,0 0 0 1px rgba(0,0,0,.35);vertical-align:-.13em;margin-right:.3em;font-style:normal}',
// Korean words are never cut in the middle: a word that does not fit moves to the next line as a whole
'html,body,button,input,select,textarea{word-break:keep-all;overflow-wrap:break-word}',
'.gm{display:inline-block;width:.68em;height:.68em;transform:rotate(45deg);background:linear-gradient(135deg,#f0fcff,#5ad1ff 55%,#2a7fd0);margin:0 .45em 0 .2em;vertical-align:.04em;box-shadow:0 0 6px rgba(90,209,255,.55)}',
'#rpg .panel{overflow-x:hidden;box-sizing:border-box}','#rpg .rh{padding-right:86px!important}','#m3ov .m3p,#ml348 .panel>div:first-child,#gi348 .panel>div:first-child{padding-right:0}',
// summon boxes: same height, buttons on one baseline
'#rpg .ban .bn{display:flex!important;flex-direction:column}#rpg .ban .bn>.small{min-height:2.9em;line-height:1.45}#rpg .ban .bn>div:last-child{margin-top:auto!important}#rpg .ban .bn button{flex:1;white-space:nowrap}',
// silver, futuristic: angled primary buttons, thin bright edge on panels
'button.pri,#sqGo,#pkGo,#clsGo,#evClaim,#evGift{clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);border-radius:0!important;letter-spacing:.02em;box-shadow:none!important}',
'.panel,#rpg .panel{border-top:1px solid rgba(214,230,246,.55)!important}',
'#menu .logo h1{background:linear-gradient(180deg,#ffffff 10%,#b9c7d8 55%,#7f90a6 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;filter:drop-shadow(0 4px 18px rgba(140,190,240,.25))}',
'#rpg .ban .bn{border-radius:14px!important;border:1px solid rgba(255,255,255,.09)!important;background:rgba(255,255,255,.035)!important;padding:14px 16px!important}',
'#rpg .pd-tabs{display:flex;flex-wrap:wrap;gap:6px!important;margin-bottom:10px}',
'#rpg .pd-tabs button{border-radius:17px!important;height:34px;padding:0 15px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.04)!important;color:#b9c5da!important;font:700 12.5px "Noto Sans KR",sans-serif!important}',
'#rpg .pd-tabs button.on{border-color:#cfe0f2!important;color:#eaf3fc!important;background:rgba(190,214,240,.12)!important}',
'#rpg .pd-tabs button.pri{background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;border:0!important}',
'#rpg button.sm{border-radius:10px!important;border:1px solid rgba(255,255,255,.12)!important;background:rgba(255,255,255,.05)!important;color:#dfe6f2!important;font:600 12.5px "Noto Sans KR",sans-serif!important;padding:7px 13px!important}',
'#rpg button.sm.pri{background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;border:0!important;font-weight:800!important}',
'#rpg select{border-radius:10px;height:32px;padding:0 10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#e9eef6}',
'#rpg .cd.lock{opacity:.55}#rpg .cd b{font-size:12.5px}#rpg .cd small{font-size:11px;color:#9fb0cc}',
// every other dialog built on the same .panel (settings, pause, deploy, result, notices): the same glass, radius and controls
'.panel{border-radius:18px!important;background:linear-gradient(180deg,rgba(13,19,34,.97),rgba(7,10,19,.98))!important;border:1px solid rgba(255,255,255,.09)!important;box-shadow:0 30px 90px rgba(0,0,0,.6)!important}',
'.panel h2{font:800 20px "Noto Sans KR",sans-serif;letter-spacing:-.01em}',
'.panel .row{padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
'.panel select,.panel input[type=text],.panel input:not([type]){border-radius:10px!important;min-height:36px;padding:0 12px;background:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.12)!important;color:#e9eef6!important}',
'.panel button{border-radius:10px}',
'.panel button.pri,#deploy button.pri,#result button.pri{background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;border:0!important;font-weight:800!important}',
'#rpg table.rt{border-collapse:separate;border-spacing:4px 0}#rpg table.rt td,#rpg table.rt th{padding:4px 8px;border-radius:6px;background:rgba(255,255,255,.04);font:700 12px Rajdhani,"Noto Sans KR",sans-serif}',
// story dialogue: one bottom panel (name plate · text · choices) instead of text lying over the figures
'#rpgDlg .box{position:absolute!important;left:50%!important;transform:translateX(-50%);bottom:5.5vh!important;width:min(1080px,92vw)!important;max-width:none!important;box-sizing:border-box;padding:20px 28px 18px!important;border-radius:16px!important;background:linear-gradient(180deg,rgba(9,13,24,.82),rgba(6,9,17,.94))!important;border:1px solid rgba(255,255,255,.1)!important;border-top:1px solid rgba(190,214,240,.45)!important;box-shadow:0 20px 60px rgba(0,0,0,.55)!important;backdrop-filter:blur(8px);z-index:5}',
'#rpgDlg .box .who{display:inline-block;margin:-34px 0 10px -6px!important;padding:5px 16px!important;border-radius:9px!important;background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;font:800 15px "Noto Sans KR",sans-serif!important;border:0!important;letter-spacing:.02em}',
'#rpgDlg #dlgTx{font:500 17px/1.75 "Noto Sans KR",sans-serif!important;color:#eef2f8!important;min-height:3.4em;letter-spacing:-.005em}',
'#rpgDlg .opts{display:flex!important;flex-direction:column;align-items:stretch;gap:8px!important;margin:14px auto 0!important;max-width:520px}',
'#rpgDlg .opts:empty{display:none!important}',
'#rpgDlg .opts button{border-radius:11px!important;padding:12px 18px!important;font:700 14.5px "Noto Sans KR",sans-serif!important;border:1px solid rgba(255,255,255,.14)!important;background:rgba(255,255,255,.06)!important;color:#e9eef6!important;cursor:pointer;transition:background .15s,border-color .15s}',
'#rpgDlg .opts button:hover{background:rgba(255,255,255,.12)!important;border-color:rgba(255,255,255,.3)!important}',
'#rpgDlg .opts button.pri{background:linear-gradient(90deg,#f4f8fc,#9eb0c5)!important;color:#0a1322!important;border:0!important;font-weight:800!important}',
'#rpgDlg #vnNext{right:22px!important;bottom:12px!important;color:#cfe0f2!important}',
'#rpgDlg.serLine .box{border-top-color:rgba(255,120,120,.5)!important}',
'#vnCtl{top:14px!important;right:16px!important;gap:6px!important;display:flex}',
'#vnCtl button{height:30px;padding:0 12px!important;border-radius:15px!important;border:1px solid rgba(255,255,255,.14)!important;background:rgba(8,12,22,.6)!important;color:#cfd8e6!important;font:700 11px Rajdhani,"Noto Sans KR",sans-serif!important;letter-spacing:.08em;backdrop-filter:blur(6px)}',
'#vnCtl button.on{border-color:#cfe0f2!important;color:#eaf3fc!important;background:rgba(190,214,240,.14)!important}',
// squad formation: the deploy bar stays in reach at the bottom of the screen
'#sqOv>div>div:last-child{position:sticky;bottom:-16px;z-index:2;margin:14px -16px -16px;padding:12px 16px 14px;background:rgba(6,9,16,.97);border-top:1px solid rgba(255,255,255,.08);flex-wrap:wrap}',
'#sqOv button{border-radius:10px;font-family:"Noto Sans KR",sans-serif}',
'#sqOv #sqPrev,#sqOv #sqNext,#sqOv #sqX,#pkOv #pkX,#rk348 #rkX,#ev348 #evX,#gw348 #gwX{width:38px;height:38px;border-radius:19px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e9eef6;cursor:pointer}',
'@media (max-width:820px){#rpg .panel{width:100vw!important;max-height:100vh!important;height:100vh;border-radius:0!important;padding:12px 12px!important}#rpg .hg{display:block!important}#rpg .rh h2::before{display:none}',
' #clsOv{display:block!important;overflow:auto!important}#clsOv>div{border:0!important}#clsOv #clsL{padding:14px!important}#clsOv #clsList{display:grid;grid-template-columns:1fr 1fr;gap:6px}#clsOv #clsList>div{margin:0!important}',
' #clsOv>div:nth-child(2){height:38vh}#clsOv #clsR{padding:14px!important}',
' #rpgDlg .box{bottom:2.5vh!important;width:96vw!important;padding:16px 16px 14px!important}#rpgDlg #dlgTx{font-size:15px!important;line-height:1.65!important}#rpgDlg .box .who{font-size:13.5px!important;margin-top:-30px!important}}'
].join('\n');
var tagQuests=function(){var B=document.getElementById('rpgBody');if(!B)return;var es=B.querySelectorAll('.epi');for(var i=0;i<es.length;i++){var e=es[i],first=e.firstElementChild,on=!!e.querySelector('button.pri'),lock=!on&&/🔒/.test(e.textContent||'');
  if(lock!==e.classList.contains('lbyLock'))e.classList.toggle('lbyLock',lock);if(on!==e.classList.contains('lbyOn'))e.classList.toggle('lbyOn',on);}};
// missions window: one button that claims everything that can be claimed
var claimable=function(ov){return [].slice.call(ov.querySelectorAll('button')).filter(function(b){return !b.disabled&&b.id!=='m3All'&&b.offsetParent&&/^(받기|Claim|오늘 출석 보상 받기|Claim today)$/.test((b.textContent||'').trim());});};
var tabsOf=function(ov){return [].slice.call(ov.querySelectorAll('button')).filter(function(b){return b.dataset&&b.dataset.t;});};
var m3All=function(){var ov=document.getElementById('m3ov');if(!ov)return;var box=ov.firstElementChild||ov,dot=document.querySelector('#m3Btn .m3dot'),n=dot?(+dot.textContent||0):claimable(ov).length,b=document.getElementById('m3All');if(!n){if(b)b.remove();return;}
 if(!b||!b.isConnected){b=document.createElement('button');b.id='m3All';b.className='pri';b.style.cssText='display:block;margin:0 0 10px auto;padding:9px 18px;font-weight:800;cursor:pointer';box.insertBefore(b,box.children[1]||null);
  b.onclick=function(){var keys=tabsOf(document.getElementById('m3ov')).map(function(x){return x.dataset.t;});if(!keys.length)keys=[null];keys.forEach(function(k){var o=document.getElementById('m3ov');if(!o)return;if(k){var tb=tabsOf(o).filter(function(x){return x.dataset.t===k;})[0];tb&&tb.click();}for(var i=0;i<40;i++){o=document.getElementById('m3ov');if(!o)break;var c=claimable(o);if(!c.length)break;c[0].click();}});};}
 var tx=L('전부 받기 ','Claim all ')+'('+n+')';if(b.textContent!==tx)b.textContent=tx;};
// hangar: "unequip all" next to "auto-equip"
guard('hgOff',function(){setInterval(function(){guard('hgOffT',function(){var a=$('hgAuto');if(!a||$('hgOff'))return;var b=document.createElement('button');b.id='hgOff';b.textContent=L('일괄 해제','Unequip all');b.onclick=function(){try{var A0=window.__A,r=A0.R(),n=0;for(var k in r.eq){if(r.eq[k]){n++;}delete r.eq[k];}try{window.__eqSync&&window.__eqSync();}catch(e){}A0.saveP();A0.render();try{toast(n?L('장비 ','Removed ')+n+L('개를 해제했습니다',' items'):L('장착한 장비가 없습니다','Nothing equipped'));}catch(e){}}catch(e){}};a.parentNode.insertBefore(b,a.nextSibling);});},600);});
guard('m3all',function(){setInterval(function(){guard('m3t',m3All);},500);});
// ---- back / home: one small control at the top-right of every sub screen ----
var OVS=['gi348','odds348','ml348','gw348','ev348','rk348','pkOv','m3ov','sqOv','clsOv'];
var openList=function(){var out=[];OVS.forEach(function(id){var e=$(id);if(e&&e.isConnected&&getComputedStyle(e).display!=='none')out.push(e);});
 [].slice.call(document.querySelectorAll('.screen')).forEach(function(s){if(s.id==='menu'||s.id==='deploy'||s.id==='pause'||s.id==='result')return;if(!s.classList.contains('hidden')&&getComputedStyle(s).display!=='none')out.push(s);});
 var D=$('rpgDlg');return out;};
var closeOne=function(e){if(!e)return false;var bs=[].slice.call(e.querySelectorAll('button'));var b=bs.filter(function(x){return /X$/.test(x.id||'')&&x.id!=='navX';})[0]||bs.filter(function(x){return /^(✕|×|돌아가기|Back|닫기|Close)$/.test((x.textContent||'').trim());})[0]||$(e.id+'Back');
 if(b){b.click();return true;}if(OVS.indexOf(e.id)>=0){e.remove();return true;}e.classList.add('hidden');return true;};
var nav=function(){var inFight=false;try{inFight=typeof G!=='undefined'&&G&&G.local&&!G.over&&$('menu')&&getComputedStyle($('menu')).display==='none'&&!$('sqOv')&&!$('pkOv');}catch(e){}
 var list=inFight?[]:openList(),n=$('nav348');if(!list.length){if(n)n.style.display='none';return;}
 if(!n){n=document.createElement('div');n.id='nav348';n.style.cssText='position:fixed;top:10px;right:10px;z-index:9990;display:flex;gap:4px;padding:3px;border-radius:19px;background:rgba(8,12,22,.82);border:1px solid rgba(207,224,242,.35);backdrop-filter:blur(8px)';
  n.innerHTML='<button id="navBack" title="'+L('이전 화면','Back')+'" style="all:unset;cursor:pointer;width:32px;height:32px;border-radius:16px;display:grid;place-items:center;color:#eaf3fc"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><button id="navHome" title="'+L('메인 화면','Home')+'" style="all:unset;cursor:pointer;width:32px;height:32px;border-radius:16px;display:grid;place-items:center;color:#eaf3fc"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/></svg></button>';
  document.body.appendChild(n);
  n.querySelector('#navBack').onclick=function(ev){ev.stopPropagation();var l=openList();closeOne(l[0]||l[l.length-1]);};
  n.querySelector('#navHome').onclick=function(ev){ev.stopPropagation();for(var i=0;i<8;i++){var l=openList();if(!l.length)break;closeOne(l[0]);}try{if(typeof show==='function')show('#menu');}catch(e){}};}
 n.style.display='flex';};
guard('nav',function(){setInterval(function(){guard('navT',nav);},300);});
// the screens' own close buttons sit under the control: hide the duplicates
var NAVCSS='#sqX,#pkX,#rkX,#evX,#gwX,#mlX,#giX,#oddsX{visibility:hidden}';
guard('navcss',function(){var s2=document.createElement('style');s2.textContent=NAVCSS;document.head.appendChild(s2);});
guard('skin',function(){var st=document.createElement('style');st.id='lbySkin';st.textContent=SKIN;document.head.appendChild(st);setInterval(function(){guard('tagQ',tagQuests);},500);});
})();
