/* ASCEND v3.48 — weekly boss (loaded after lib/ascend_loop.js)
   One boss a week (resets Monday 00:00 KST), three attempts, 90 seconds each, fought with the squad-dungeon formation.
   The boss scales with the pilot's best squad-dungeon stage, and rewards go by how much of its health was removed
   (10 / 25 / 50 / 75 / 100%), each tier once a week - so it rewards what you reached, not your rank.
   The boss type rotates (ground / anti-air / air), so the formation that counters it changes every week.
   Index hooks: window.__wbStart(cfg), window.__wbFinish(pct, sec), window.__wbHud(X). Save: r.wb = {wk, n, best, got}. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var A=function(){return window.__A||null;};
var R=function(){var a=A();return a&&a.R?a.R():null;};
var save=function(){try{A().saveP();}catch(e){}};
var fmt=function(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');};
var BOSS=['db_castrum','db_hive','db_judge','fb_typhon','fb_knight','fb_magma','fb_frost','fb_scorp','fb_spore','fb_hound'];
var TY=['ground','aa','air'],TYN={ground:L('지상','Ground'),aa:L('대공','Anti-air'),air:L('비행','Air')},WEAK={ground:'air',aa:'ground',air:'aa'};
var TRIES=3,SEC=90,HPM=40;   /* measured: at 14 a Lv 21 pilot with best stage 9 killed it in 55 s -> stronger, and it also scales with pilot level */
// week number counted from Monday 00:00 KST
var wk=function(){return Math.floor((Date.now()+9*3600e3-4*86400e3)/(7*86400e3));};
var left=function(){var ms=(wk()+1)*7*86400e3+4*86400e3-9*3600e3-Date.now(),d=Math.floor(ms/86400e3),h=Math.floor(ms%86400e3/3600e3);return d?d+L('일 ','d ')+h+L('시간','h'):h+L('시간','h');};
var st=function(){var r=R();if(!r)return null;var w=wk();if(!r.wb||r.wb.wk!==w)r.wb={wk:w,n:0,best:0,got:[]};return r.wb;};
// health also follows combat power: a pilot far above the recommended power of the stage (heavy gear) met a boss that died in 21 s
var cfg=function(){var r=R(),w=wk(),b=(r&&r.sq&&r.sq.best)||0,s=Math.max(5,Math.min(200,Math.max(b,(r&&r.lv)||1))),k=1;try{k=Math.sqrt(Math.max(1,X.cp()/X.recCP(s)));   /* full ratio was too hard: 8% removed in 41 s */}catch(e){}return {boss:BOSS[w%BOSS.length],ty:TY[w%3],stage:s,hp:(window.__wbM||HPM)*k*.22};   /* v3.66 (19-2): manager v3.65 - 5 % in 98 s on a first try; x0.44 more so grade D (10 %) is reachable */   /* v3.60 (5): half the health - a Lv 16 pilot should reach grade D (10%) on a first try */};
var bossName=function(k){try{return tx(MONS[k].n);}catch(e){}try{return tx(CL[k].n);}catch(e){}return L('주간 보스','Weekly boss');};
var TIER=[
 {p:.10,g:'D',t:L('금화 200','200 gold'),f:function(r){r.shards=(r.shards||0)+200;}},
 {p:.25,g:'C',t:L('금화 400 · 크레딧 2,000','400 gold · 2,000 credits'),f:function(r){r.shards=(r.shards||0)+400;r.cred=(r.cred||0)+2000;}},
 {p:.50,g:'B',t:L('영웅 장비 1개','1 Epic gear'),f:function(r){try{r.inv.push(A().mkItem(3));}catch(e){}}},
 {p:.75,g:'A',t:L('금화 1,000 · 전설 장비 1개','1,000 gold · 1 Legendary gear'),f:function(r){r.shards=(r.shards||0)+1000;try{r.inv.push(A().mkItem(4));}catch(e){}}},
 {p:1.0,g:'S',t:L('소환권 10장 (기동전사·안드로이드 소환)','10 summon tickets (Mech / Android)'),f:function(r){r.sumTicket=(r.sumTicket||0)+10;}}];
var gradeOf=function(p){var g=L('등급 없음','No grade');TIER.forEach(function(t){if(p>=t.p)g=t.g;});return g;};
var CSS='position:fixed;inset:0;z-index:9320;display:flex;align-items:center;justify-content:center;background:rgba(3,5,10,.88);font-family:"Noto Sans KR",sans-serif;color:#e9eef6;padding:14px';
var BOXC='width:min(460px,94vw);max-height:92vh;overflow:auto;padding:18px;border-radius:14px;background:linear-gradient(180deg,#121a2b,#070a12);border:1px solid rgba(207,224,242,.28)';
var BTN='all:unset;cursor:pointer;padding:10px 18px;border-radius:8px;font-weight:800;font-size:14px;text-align:center;';
var tiersHtml=function(s,nowP){return TIER.map(function(t,i){var got=s.got.indexOf(i)>=0,hit=nowP!=null&&nowP>=t.p;return '<div style="display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:8px;margin-top:4px;background:'+(got?'rgba(125,255,208,.08)':'rgba(255,255,255,.04)')+';border:1px solid '+(hit?'#cfe0f2':'rgba(255,255,255,.08)')+'"><b style="width:22px;font:800 17px Rajdhani,sans-serif;color:'+(got?'#7dffd0':'#cfe0f2')+'">'+t.g+'</b><small style="width:44px;opacity:.75">'+Math.round(t.p*100)+'%</small><span style="flex:1;font-size:13px;word-break:keep-all">'+t.t+'</span><small style="color:'+(got?'#7dffd0':'#8c96a8')+'">'+(got?L('받음','Got'):L('미달성','—'))+'</small></div>';}).join('');};
var open=X.wbOpen=function(){guard('wbOpen',function(){var s=st();if(!s)return;var c=cfg(),old=document.getElementById('wb348');if(old)old.remove();var ov=document.createElement('div');ov.id='wb348';ov.style.cssText=CSS;var can=s.n<TRIES;
 ov.innerHTML='<div style="'+BOXC+'"><div style="display:flex;align-items:center"><div><div style="font:700 11px Rajdhani,sans-serif;letter-spacing:.35em;color:#9fb6cf">WEEKLY BOSS</div><b style="font-size:20px">'+bossName(c.boss)+'</b></div><span style="flex:1"></span><button id="wbX" style="'+BTN+'padding:6px 12px;border:1px solid rgba(255,255,255,.2)">✕</button></div>'+
  '<div style="margin:10px 0;font-size:13px;line-height:1.6;word-break:keep-all;color:#cfd8e6">'+L('유형 ','Type ')+'<b style="color:#eaf3fc">'+TYN[c.ty]+'</b> · '+L('약점 ','weak to ')+'<b style="color:#7dffd0">'+TYN[WEAK[c.ty]]+'</b> · '+L('제한 ','limit ')+SEC+L('초','s')+'<br>'+L('분대 던전 편성으로 출격합니다. 깎은 체력 비율로 보상을 받고, 각 등급은 주 1회입니다.','You fight with your squad-dungeon formation. Rewards go by the share of health removed; each tier once a week.')+'<br><small style="opacity:.75">'+L('보스 강도: 단계 ','Boss strength: stage ')+c.stage+L(' (내 최고 단계와 레벨 중 높은 쪽)',' (the higher of your best stage and level)')+' · '+L('초기화까지 ','resets in ')+left()+'</small></div>'+
  '<div style="display:flex;gap:10px;align-items:baseline"><b>'+L('이번 주 최고 ','Best this week ')+Math.round(s.best*100)+'% · '+gradeOf(s.best)+'</b><span style="flex:1"></span><small style="color:#9fb6cf">'+L('남은 도전 ','Attempts left ')+(TRIES-s.n)+' / '+TRIES+'</small></div>'+tiersHtml(s,s.best)+
  '<div style="display:flex;gap:8px;margin-top:14px"><button id="wbSq" style="'+BTN+'border:1px solid rgba(255,255,255,.2);flex:1">'+L('편성 바꾸기','Formation')+'</button><button id="wbGo" style="'+BTN+'flex:1.4;'+(can?'background:linear-gradient(90deg,#f4f8fc,#9eb0c5);color:#0a1322':'background:rgba(255,255,255,.08);color:#8c96a8;cursor:default')+'">'+(can?L('도전','Challenge'):L('이번 주 도전 완료','No attempts left'))+'</button></div></div>';
 document.body.appendChild(ov);ov.querySelector('#wbX').onclick=function(){ov.remove();};
 ov.querySelector('#wbSq').onclick=function(){ov.remove();try{hide('#menu');}catch(e){}try{window.squadOpen();}catch(e){}};
 ov.querySelector('#wbGo').onclick=function(){if(!can||!window.__wbStart)return;s.n++;save();ov.remove();try{hide('#menu');}catch(e){}try{window.__wbStart(c);}catch(e){s.n--;save();(X.err=X.err||[]).push('wbStart: '+String(e).slice(0,160));}};});};
window.__wbHud=function(G0){try{var b=G0.sqBoss,p=b?Math.max(0,b.hp)/b.mhp:1,t=Math.max(0,SEC-Math.floor(G0.sqT||0));return L('주간 보스 ','Weekly boss ')+'<span style="color:#ff9b9b">'+Math.ceil(p*100)+'%</span> · <span style="color:'+(t<=15?'#ffb36b':'#cfe0f2')+'">'+t+L('초','s')+'</span> · '+gradeOf(1-p);}catch(e){return '';}};
window.__wbFinish=function(pct,sec){try{if(window.G&&G.t)sec=Math.round(G.t);/* v3.84 (23-6): the same battle clock as the result card */}catch(e){}try{var gl='-';TIER.forEach(function(t){if(pct>=t.p)gl=t.g;});var nx=TIER.filter(function(t){return pct<t.p;})[0];window.__wbLast={g:gl,at:Date.now(),msg:nx?L(nx.g+'('+Math.round(nx.p*100)+'%)까지 '+Math.max(1,Math.round((nx.p-pct)*100))+'%',Math.max(1,Math.round((nx.p-pct)*100))+'% to '+nx.g):L('최고 등급!','Top grade!')};}catch(e){}guard('wbFinish',function(){var r=R(),s=st();if(!r||!s)return;var log=[];
 if(pct<0){s.n=Math.max(0,s.n-1);pct=0;log.push(L('보스를 불러오지 못해 도전 횟수를 돌려드렸습니다.','The boss failed to load; the attempt was returned.'));}
 s.best=Math.max(s.best,pct);TIER.forEach(function(t,i){if(pct>=t.p&&s.got.indexOf(i)<0){s.got.push(i);t.f(r);log.push(t.g+' · '+t.t);}});
 var part=300+cfg().stage*20;r.cred=(r.cred||0)+part;save();
 var g=gradeOf(pct),ov=document.createElement('div');ov.id='wbRes';ov.style.cssText=CSS;
 ov.innerHTML='<div style="'+BOXC+';text-align:center"><div style="font:700 11px Rajdhani,sans-serif;letter-spacing:.35em;color:#9fb6cf">WEEKLY BOSS</div><div style="font:900 84px Rajdhani,sans-serif;line-height:1;margin:6px 0;color:#cfe0f2;text-shadow:0 0 26px rgba(207,224,242,.6)">'+g+'</div><div style="font-size:17px">'+(pct>=1?L('토벌 성공 · ','Defeated · ')+sec+L('초','s'):L('깎은 체력 ','Health removed ')+Math.round(pct*100)+'%'+L(' · 보스 남은 체력 ',' · boss health left ')+Math.max(0,100-Math.round(pct*100))+'%')+'</div>'/* v3.77 (21-6): the result also says how much health the boss still had */+
  '<div style="margin:10px 0;font-size:13px;color:#cfd8e6;word-break:keep-all">'+(log.length?'<b style="color:#7dffd0">'+L('새로 받은 보상','New rewards')+'</b><br>'+log.join('<br>')+'<br>':'')+L('참가 보상 크레딧 ','Entry reward: credits ')+fmt(part)+'</div><div style="text-align:left">'+tiersHtml(s,pct)+'</div>'+
  '<div style="display:flex;gap:8px;margin-top:14px"><button id="wbOut" style="'+BTN+'border:1px solid rgba(255,255,255,.2);flex:1">'+L('나가기','Exit')+'</button><button id="wbAgain" style="'+BTN+'flex:1.4;'+(s.n<TRIES?'background:linear-gradient(90deg,#f4f8fc,#9eb0c5);color:#0a1322':'background:rgba(255,255,255,.08);color:#8c96a8;cursor:default')+'">'+(s.n<TRIES?L('다시 도전 (','Retry (')+(TRIES-s.n)+L('회 남음)',' left)'):L('도전 완료','No attempts left'))+'</button></div></div>';
 document.body.appendChild(ov);var out=function(again){ov.remove();try{leaveMatch();}catch(e){}setTimeout(function(){guard('wbOut',function(){if(again){s.n++;save();window.__wbStart(cfg());}else{try{show('#menu');}catch(e){}open();}});},600);};
 ov.querySelector('#wbOut').onclick=function(){if(ov._t)clearInterval(ov._t);out(false);};ov.querySelector('#wbAgain').onclick=function(){if(ov._t)clearInterval(ov._t);if(s.n<TRIES)out(true);};
 /* v3.77 (21-8): with auto battle on and attempts left, the next attempt starts by itself after a short countdown (Exit cancels) */
 try{if(P.autoHunt&&s.n<TRIES&&pct<1){var left=6,bt=ov.querySelector('#wbAgain'),lab=bt.textContent;ov._t=setInterval(function(){left--;if(!document.body.contains(ov)){clearInterval(ov._t);return;}bt.textContent=lab+' · '+L('자동 ','auto ')+left;if(left<=0){clearInterval(ov._t);out(true);}},1000);}}catch(e){}});};
// ---------- field hunting: engagement settings, asked every time the hunting grounds are opened ----------
// PVP is off until the pilot turns it on. With PVP on, one of four rules decides when my frame fights other pilots.
var STN=[['counter',L('반격','Counterattack'),L('공격받으면 반격하고, 그 상대를 끝까지 공격합니다.','Fight back when attacked and keep attacking that pilot.')],
 ['manual',L('직접 지정','Manual'),L('내가 누른(클릭한) 상대만 공격합니다.','Attack only the pilot you tap or click.')],
 ['first',L('선제 공격','Strike first'),L('다른 진영 파일럿은 보이는 즉시 공격합니다.','Attack pilots of other factions on sight.')],
 ['guard',L('진영 방어','Defend faction'),L('우리 진영이 공격받으면 그 상대를 공격합니다.','Attack whoever attacks your faction.')]];
var fld=function(){var r=R();if(!r)return {pvp:false,st:'counter'};if(!r.fld)r.fld={pvp:false,st:'counter'};return r.fld;};
window.__fld=fld;
X.huntGate=function(go){guard('huntGate',function(){var f=fld(),old=document.getElementById('hg348');if(old)old.remove();var ov=document.createElement('div');ov.id='hg348';ov.style.cssText=CSS;
 var draw=function(){ov.innerHTML='<div style="'+BOXC+'"><div style="display:flex;align-items:center"><div><div style="font:700 11px Rajdhani,sans-serif;letter-spacing:.35em;color:#9fb6cf">FIELD HUNTING</div><b style="font-size:20px">'+L('교전 설정','Engagement settings')+'</b></div><span style="flex:1"></span><button id="hgX" style="'+BTN+'padding:6px 12px;border:1px solid rgba(255,255,255,.2)">✕</button></div>'+
  '<div style="margin:10px 0 6px;font-size:13px;line-height:1.6;word-break:keep-all;color:#cfd8e6">'+L('필드는 여러 파일럿이 함께 사냥하는 곳입니다. 일반 보스·필드 보스·우주 보스는 오래 걸리는 만큼 보상이 큽니다.','The field is where pilots hunt together. Bosses, field bosses and cosmic bosses take long and pay well.')+'</div>'+
  '<div id="hgPvp" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid '+(f.pvp?'#ff9b9b':'rgba(255,255,255,.14)')+';background:'+(f.pvp?'rgba(255,107,107,.1)':'rgba(255,255,255,.04)')+'"><span style="flex:1"><b>'+L('파일럿 간 전투 (PVP)','Pilot versus pilot (PVP)')+'</b><br><small style="opacity:.75;word-break:keep-all">'+(f.pvp?L('켜짐 · 다른 파일럿을 공격할 수 있고 공격받을 수 있습니다.','On · you can attack other pilots and be attacked.'):L('꺼짐 · 다른 파일럿과 서로 피해를 주고받지 않습니다.','Off · you and other pilots cannot damage each other.'))+'</small></span><b style="font:800 14px Rajdhani,sans-serif;color:'+(f.pvp?'#ff9b9b':'#8c96a8')+'">'+(f.pvp?'ON':'OFF')+'</b></div>'+
  '<div style="margin-top:10px;opacity:'+(f.pvp?1:.45)+'"><small style="color:#9fb6cf">'+L('교전 방식 (PVP를 켰을 때 적용)','Rule of engagement (applies with PVP on)')+'</small>'+STN.map(function(s){var on=f.st===s[0];return '<div data-st="'+s[0]+'" style="cursor:pointer;display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:8px;margin-top:4px;border:1px solid '+(on?'#cfe0f2':'rgba(255,255,255,.08)')+';background:'+(on?'rgba(207,224,242,.1)':'rgba(255,255,255,.03)')+'"><span style="width:12px;height:12px;border-radius:50%;border:2px solid #cfe0f2;background:'+(on?'#cfe0f2':'transparent')+'"></span><span style="flex:1"><b style="font-size:13.5px">'+s[1]+'</b><br><small style="opacity:.75;word-break:keep-all">'+s[2]+'</small></span></div>';}).join('')+'</div>'+
  '<button id="hgGo" style="'+BTN+'display:block;margin-top:14px;background:linear-gradient(90deg,#f4f8fc,#9eb0c5);color:#0a1322">'+L('사냥터 선택으로','Choose a hunting ground')+'</button></div>';
  ov.querySelector('#hgX').onclick=function(){ov.remove();};ov.querySelector('#hgPvp').onclick=function(){f.pvp=!f.pvp;save();draw();};
  [].forEach.call(ov.querySelectorAll('[data-st]'),function(el){el.onclick=function(){f.st=el.dataset.st;save();draw();};});
  ov.querySelector('#hgGo').onclick=function(){ov.remove();go&&go();};};
 draw();document.body.appendChild(ov);});};
// chip on the home strip (lib/ascend_loop.js draws it)
X.wbChip=function(){var s=st();if(!s)return '';var l=TRIES-s.n;return '<button id="lpBoss" style="all:unset;cursor:pointer;padding:6px 12px;border-radius:15px;font:700 12px \'Noto Sans KR\',sans-serif;border:1px solid '+(l?'#cfe0f2':'rgba(255,255,255,.14)')+';background:rgba(8,12,22,.6);color:'+(l?'#eaf3fc':'#8c96a8')+'">'+L('주간 보스 ','Weekly boss ')+l+' / '+TRIES+(s.best?' · '+gradeOf(s.best):'')+'</button>';};
})();

/* v3.48b: general summon tickets (weekly boss S reward). Usable on Mech / Android summon instead of gold; weekly pull caps still apply. */
(function(){try{
 var R0=function(){try{return R();}catch(e){return null;}};
 var _rsT=renderSummon;renderSummon=function(B){_rsT(B);try{var r=R0();if(!r||!(r.sumTicket>0))return;var d=document.createElement('div');d.className='epi';d.style.cssText='margin:0 0 12px;border:1px solid rgba(185,214,230,.4);display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  d.innerHTML='<b style="flex:1;min-width:160px">'+L('소환권 ','Summon tickets ')+r.sumTicket+L('장','')+'</b>'+[['mech',L('기동전사','Mech')],['link',L('안드로이드','Android')]].map(function(x){return '<button class="pri" data-tk="'+x[0]+'" data-n="1">'+x[1]+' 1'+L('회','x')+'</button>'+(r.sumTicket>=10?'<button class="pri" data-tk="'+x[0]+'" data-n="10">'+x[1]+' 10'+L('회','x')+'</button>':'');}).join('');
  B.insertBefore(d,B.firstChild);
  d.querySelectorAll('[data-tk]').forEach(function(el){el.onclick=function(){var rr=R0();var b=el.dataset.tk,n=+el.dataset.n;if(!rr||(rr.sumTicket||0)<n)return;var cost=BANNERS[b].cost*(n===10?9:1);rr.shards=(rr.shards||0)+cost;var out=null;try{out=pull(b,n);}catch(e){}if(out){rr.sumTicket-=n;lastPull=out;}else{rr.shards-=cost;}try{saveP();}catch(e){}render();};});}catch(e){window.__tkErr=String(e);}};
}catch(e){window.__tk0Err=String(e);}})();
/* v3.77 (21-8): auto battle never waits on the deploy screen - after a frame is destroyed the relaunch is pressed for you
   3 s after it becomes possible (any mode: weekly boss, field, battlefield). Manual play is unchanged. */
(function(){var since=0;setInterval(function(){try{if(!window.P||!P.autoHunt||!window.G||G.over){since=0;return;}var d=document.getElementById('deploy'),b=document.getElementById('dpGo');if(!d||!b||d.classList.contains('hidden')||b.disabled||(G.local&&G.local.respT>0)){since=0;return;}if(!since){since=performance.now();return;}if(performance.now()-since>3000){since=0;b.click();}}catch(e){}},500);})();

/* v3.80 (22-6): weekly boss pace. A first attempt went from 6-16 % to 100 % in 34 s, so the boss now takes damage no faster
   than a set pace that grows with each attempt this week: 1st try about 0.45 % of its health a second (~40 % in 90 s, grade C~B),
   2nd 0.7 %/s, 3rd and later 1.2 %/s (S becomes possible). A weaker squad that deals less is not affected. */
(function(){var rate=function(){try{var r=window.__A&&window.__A.R&&window.__A.R();var n=(r&&r.wb&&r.wb.n)||1;return n<=1?.0045:n===2?.007:.012;}catch(e){return .0045;}};
 var hook=function(){if(window.__hkWbCap||typeof hurt!=='function')return;window.__hkWbCap=1;var hu=hurt;hurt=function(u,amt,src,ang,dt){try{if(u&&u.boss&&u.sqTy!=null&&amt>0&&!u.dead&&window.G){if(u._wbT0==null){u._wbT0=G.t;u._wbD=0;}var mh=u.mhp||u.hp||1,allow=mh*rate()*(G.t-u._wbT0+2)-u._wbD;if(amt>allow)amt=Math.max(0,allow);var hp0=u.hp;var r=hu(u,amt,src,ang,dt);u._wbD+=Math.max(0,hp0-u.hp);return r;}}catch(e){}return hu(u,amt,src,ang,dt);};};
 setInterval(function(){try{hook();}catch(e){}},500);})();

/* v3.83 (manager 22-8): when any battle starts, the weekly boss window / result card are closed (they stayed on top of the 5v5) */
(function(){var lastG=null;setInterval(function(){try{var g=window.G||null;if(g&&g!==lastG&&g.local){lastG=g;var isWb=false;try{isWb=!!(g.rpg&&g.rpg.obj&&g.rpg.obj.wb);}catch(e){}['wb348','wbRes'].forEach(function(id){var el=document.getElementById(id);if(el&&!(isWb&&id==='wb348'&&false))el.remove();});}if(!g)lastG=null;}catch(e){}},400);})();

/* v3.84 (23-6): the damage pace above was bypassed (a first try still reached 100 % in 31 s): some damage paths change the
   boss's health directly. Now the weekly boss's health itself cannot drop faster than the pace, whatever lowers it. */
(function(){var rate=function(){try{var r=window.__A&&window.__A.R&&window.__A.R();var n=(r&&r.wb&&r.wb.n)||1;return n<=1?.0045:n===2?.007:.012;}catch(e){return .0045;}};
 setInterval(function(){try{var g=window.G;if(!g||g.over||!g.rpg||!g.rpg.obj||!g.rpg.obj.wb)return;for(var i=0;i<g.units.length;i++){var b=g.units[i];if(!b.boss||b._wbPace||b.dead)continue;b._wbPace=1;var hp=b.hp,mh=b.mhp||b.hp,t0=g.t;
   Object.defineProperty(b,'hp',{configurable:true,enumerable:true,get:function(){return hp;},set:function(v){try{var floor=mh*(1-Math.min(1,rate()*(window.G.t-t0+2)));if(v<floor)v=floor;}catch(e){}hp=v;}});}}catch(e){}},300);})();

/* v3.84 (23-8): any battle that is not the weekly boss (5v5 included, whatever path it was opened from) closes the weekly boss window */
(function(){setInterval(function(){try{var g=window.G;if(!g||g.over||!g.local||!g.local.unit)return;var wb=!!(g.rpg&&g.rpg.obj&&g.rpg.obj.wb);if(wb)return;['wb348','wbRes'].forEach(function(id){var el=document.getElementById(id);if(el)el.remove();});}catch(e){}},400);})();
