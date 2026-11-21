/* ASCEND v3.48 — daily loop (loaded after lib/ascend_mail.js)
   · standby reward: gold and credits pile up while you are away, by your best squad-dungeon stage, up to 12 hours.
     It is the way forward for a pilot stuck at a wall ("come back later and you are stronger").
   · victory boxes: the first three wins of the day each give a random box (cannot be bought). Rates are shown.
   Both sit in a small strip under the logo on the home screen. Stored in the RPG save: r.idle, r.fw. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var A=function(){return window.__A||null;};
var R=function(){var a=A();return a&&a.R?a.R():null;};
var save=function(){try{A().saveP();}catch(e){}};
var fmt=function(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');};
var today=function(){return new Date(Date.now()+9*3600e3).toISOString().slice(0,10);};
var CAP=12,MINH=1/6;
// ---- standby reward ----
var rate=function(r){var b=(r.sq&&r.sq.best)||0,lv=r.lv||1;return {gold:20+b*2+lv,cred:100+b*20+lv*10};};
var idle=X.idleInfo=function(){var r=R();if(!r)return null;if(!r.idle||!r.idle.t){r.idle={t:Date.now()};save();}var h=Math.max(0,Math.min(CAP,(Date.now()-r.idle.t)/3600e3)),q=rate(r);return {h:h,gold:Math.floor(q.gold*h),cred:Math.floor(q.cred*h),per:q,full:h>=CAP};};
var idleClaim=function(){var r=R(),i=idle();if(!r||!i||i.h<MINH)return null;r.shards=(r.shards||0)+i.gold;r.cred=(r.cred||0)+i.cred;r.idle.t=Date.now();save();return i;};
// ---- victory boxes: first three wins a day ----
var BOX=[[50,L('금화 150','150 gold'),function(r){r.shards=(r.shards||0)+150;}],[28,L('금화 400','400 gold'),function(r){r.shards=(r.shards||0)+400;}],[15,L('희귀 장비','Rare gear'),function(r){try{r.inv.push(A().mkItem(2));}catch(e){}}],[5,L('영웅 장비','Epic gear'),function(r){try{r.inv.push(A().mkItem(3));}catch(e){}}],[2,L('전설 확정 소환권','Legendary ticket'),function(r){r.legTicket=(r.legTicket||0)+1;}]];
var fw=function(){var r=R();if(!r)return null;var d=today();if(!r.fw||r.fw.d!==d)r.fw={d:d,n:0,seen:-1};return r.fw;};
var wins=function(){try{var m=P.m3;return (m&&m.day===today()&&m.d&&m.d.wins)||0;}catch(e){return 0;}};
var banner=function(html){var b=document.getElementById('lp348');if(!b){b=document.createElement('div');b.id='lp348';b.style.cssText='position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:9700;padding:10px 18px;border-radius:12px;background:rgba(8,12,22,.92);border:1px solid rgba(207,224,242,.5);color:#eaf3fc;font:700 14px "Noto Sans KR",sans-serif;text-align:center;pointer-events:none;transition:opacity .4s;max-width:92vw';document.body.appendChild(b);}b.innerHTML=html;b.style.opacity='1';clearTimeout(banner.t);banner.t=setTimeout(function(){b.style.opacity='0';},4200);};
var boxTick=function(){var r=R(),f=fw();if(!r||!f)return;var w=wins();if(f.seen<0){f.seen=w;save();return;}if(w<=f.seen)return;var gained=w-f.seen;f.seen=w;var out=[];
 for(var i=0;i<gained&&f.n<3;i++){var x=Math.random()*100,acc=0,pick=BOX[0];for(var j=0;j<BOX.length;j++){acc+=BOX[j][0];if(x<acc){pick=BOX[j];break;}}pick[2](r);f.n++;out.push(pick[1]);}
 save();if(out.length)banner('<small style="color:#9fb6cf;letter-spacing:.2em">'+L('승리 상자 ','VICTORY BOX ')+f.n+' / 3</small><br>'+out.join(' · '));};
X.boxRates=function(){return BOX.map(function(b){return b[1]+' '+b[0]+'%';}).join(' · ');};
// ---- one-time repair: a named glaive that an earlier test build had turned into a whip ----
var repair=function(){var r=R();if(!r||r._fixMoon)return;r._fixMoon=1;(r.inv||[]).forEach(function(it){if(it&&it.slot==='mel'&&it.sub==='whip'&&it.n&&/언월도/.test(it.n.ko||''))it.sub='glaive';});save();};
// ---- home strip ----
var strip=function(){var menu=document.getElementById('menu'),left=menu&&menu.querySelector('.lb-left');if(!left||!R())return;var s=document.getElementById('lbyLoop');if(!s){s=document.createElement('div');s.id='lbyLoop';s.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:10px';left.appendChild(s);}
 var i=idle(),f=fw(),can=i&&i.h>=MINH;
 var h='<button id="lpIdle" style="all:unset;cursor:'+(can?'pointer':'default')+';padding:6px 12px;border-radius:15px;font:700 12px \'Noto Sans KR\',sans-serif;border:1px solid '+(can?'#cfe0f2':'rgba(255,255,255,.14)')+';background:'+(i&&i.full?'rgba(143,227,255,.18)':'rgba(8,12,22,.6)')+';color:'+(can?'#eaf3fc':'#8c96a8')+'">'+L('대기 보상 ','Standby ')+(i?i.h.toFixed(1):'0')+L('시간','h')+(can?' · <i class="cn"></i>'+fmt(i.gold):'')+(i&&i.full?' · '+L('가득','FULL'):'')+'</button>'+
  '<span style="padding:6px 12px;border-radius:15px;font:700 12px \'Noto Sans KR\',sans-serif;border:1px solid rgba(255,255,255,.14);background:rgba(8,12,22,.6);color:'+(f&&f.n>=3?'#8c96a8':'#eaf3fc')+'" title="'+X.boxRates()+'">'+L('승리 상자 ','Victory boxes ')+(f?f.n:0)+' / 3</span>'+(X.wbChip?X.wbChip():'');
 if(s.dataset.h!==h){s.dataset.h=h;s.innerHTML=h;var wbb=s.querySelector('#lpBoss');if(wbb)wbb.onclick=function(){X.wbOpen&&X.wbOpen();};var b=s.querySelector('#lpIdle');if(b)b.onclick=function(){var g=idleClaim();if(g){banner('<small style="color:#9fb6cf;letter-spacing:.2em">'+L('대기 보상','STANDBY REWARD')+'</small><br><i class="cn"></i>'+fmt(g.gold)+' · ◆ '+fmt(g.cred)+'<br><small style="opacity:.75">'+L('시간당 금화 ','per hour: gold ')+g.per.gold+' · ◆ '+g.per.cred+L(' · 최대 12시간 · 최고 단계가 오르면 늘어납니다',' · up to 12 h · grows with your best stage')+'</small>');try{A().render&&A().render();}catch(e){}s.dataset.h='';}};}};
X.loopStrip=function(){guard('loopS',function(){repair();strip();});};
guard('loop',function(){X.loopStrip();setInterval(function(){guard('loopT',function(){repair();boxTick();var m=document.getElementById('menu');if(m&&getComputedStyle(m).display!=='none')strip();});},1000);});
})();
