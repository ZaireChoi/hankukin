/* ASCEND v3.48 — events (loaded after lib/ascend_rank.js)
   · 28-day attendance event: a reward every day, a random Epic frame on day 7, Legendary gear on day 14,
     a Legendary summon ticket on day 21 and a guaranteed random Legendary frame on day 28 (resets every month)
   · daily lucky draw that comes with the check-in (all rates shown on the screen)
   · launch gift for the 33 new frames (once)
   Nothing here is paid. Everything is stored in the RPG save (r.ev). */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var A=function(){return window.__A||null;};
var R=function(){var a=A();return a&&a.R?a.R():null;};
var save=function(){try{A().saveP();}catch(e){}};
var fmt=function(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');};
var tx=function(n){return n?L(n.ko,n.en):'';};
var day=function(){return new Date(Date.now()+9*3600e3).toISOString().slice(0,10);};   // Korean date, same as the daily missions
var RC=['#c9d2e3','#7ee787','#5ab4ff','#c58cff','#ffd166','#ff6b6b'];

// ---------- rewards ----------
// t: shard | cred | gear(grade) | ticket | frame(grade)
var CAL=[];(function(){for(var d=1;d<=28;d++){var x;
  if(d===7)x={t:'frame',v:3};else if(d===14)x={t:'gear',v:4};else if(d===21)x={t:'ticket',v:1};else if(d===28)x={t:'frame',v:4};
  else if(d%7===3)x={t:'gear',v:2+Math.floor(d/14)};else if(d%2)x={t:'shard',v:100+Math.floor(d/7)*50};else x={t:'cred',v:800+Math.floor(d/7)*400};CAL.push(x);}})();
// daily lucky draw — published rates (sum 100)
var LUCK=[[2,{t:'frame',v:4}],[8,{t:'frame',v:3}],[30,{t:'shard',v:300}],[60,{t:'cred',v:1500}]];
var label=function(x){return x.t==='shard'?L('금화 ','Shards ')+fmt(x.v):x.t==='cred'?'◆ '+fmt(x.v):x.t==='gear'?[L('고급','Uncommon'),L('고급','Uncommon'),L('희귀','Rare'),L('영웅','Epic'),L('전설','Legendary')][x.v]+L(' 장비',' gear'):x.t==='ticket'?L('전설 확정 소환권','Legendary ticket'):(x.v===4?L('전설','Legendary'):L('영웅','Epic'))+L(' 기체 무작위',' frame (random)');};
var icon=function(x){return x.t==='shard'?'<i class="cn" style="margin:0"></i>':x.t==='cred'?'◆':'<span style="display:inline-block;width:14px;height:14px;transform:rotate(45deg);border:2px solid currentColor;border-radius:3px"></span>';};
var colOf=function(x){return x.t==='frame'||x.t==='gear'?RC[x.v]:x.t==='ticket'?RC[4]:'#cfd8e6';};
var framePool=function(g){var M=window.__MECHS||{};return Object.keys(M).filter(function(k){return M[k].r===g&&!M[k].god;});};
// gives the reward and returns the line to show
var give=function(x){var r=R(),a=A();if(!r)return '';
 if(x.t==='shard'){r.shards=(r.shards||0)+x.v;return label(x);}
 if(x.t==='cred'){r.cred=(r.cred||0)+x.v;return label(x);}
 if(x.t==='gear'){try{var it=a.mkItem(x.v);r.inv.push(it);return label(x)+' · '+tx(it.n);}catch(e){return label(x);}}
 if(x.t==='ticket'){r.legTicket=(r.legTicket||0)+x.v;return label(x)+' +'+x.v;}
 if(x.t==='frame'){var pool=framePool(x.v);if(!pool.length){r.shards=(r.shards||0)+600;return L('금화 600','Shards 600');}var k=pool[Math.floor(Math.random()*pool.length)],had=(r.mechs||[]).indexOf(k)>=0;a.addUnit(k,false);var M=window.__MECHS[k];return '<b style="color:'+RC[x.v]+'">'+tx(M.n)+'</b>'+(had?L(' · 이미 보유 → 각성 +1',' · owned → awakening +1'):L(' · 새 기체!',' · NEW!'));}
 return '';};

// ---------- state ----------
var st=function(){var r=R();if(!r)return null;var mon=day().slice(0,7);r.ev=r.ev||{};if(r.ev.mon!==mon){r.ev.mon=mon;r.ev.n=0;r.ev.last='';}r.ev.n=r.ev.n||0;return r;};
var canClaim=X.evCan=function(){var r=st();return !!(r&&r.ev.last!==day()&&r.ev.n<28);};
var giftDue=function(){var r=st();return !!(r&&!r.ev.gift33);};
var claim=function(){var r=st();if(!r||!canClaim())return null;var x=CAL[r.ev.n];r.ev.n++;r.ev.last=day();var out=[L(r.ev.n+'일째 출석: ','Day '+r.ev.n+': ')+give(x)];
 var roll=Math.random()*100,acc=0,lk=LUCK[LUCK.length-1][1];for(var i=0;i<LUCK.length;i++){acc+=LUCK[i][0];if(roll<acc){lk=LUCK[i][1];break;}}
 out.push(L('행운 추첨: ','Lucky draw: ')+give(lk));save();return {lines:out,big:x.t==='frame'||x.t==='ticket'||lk.t==='frame'};};
var gift=function(){var r=st();if(!r||r.ev.gift33)return null;r.ev.gift33=1;var out=[];var mp=framePool(0);if(mp.length){var k=mp[Math.floor(Math.random()*mp.length)];A().addUnit(k,false);out.push(L('양산형 기체 지급: ','Mass-production frame: ')+'<b>'+tx(window.__MECHS[k].n)+'</b>');}r.shards=(r.shards||0)+900;out.push(L('금화 900 (소환 3회분)','900 shards (3 summons)'));save();return out;};

// ---------- screen ----------
var open=X.evOpen=function(){var r=st();if(!r)return;var ov=document.getElementById('ev348');if(ov)ov.remove();ov=document.createElement('div');ov.id='ev348';
 ov.style.cssText='position:fixed;inset:0;z-index:9400;background:radial-gradient(ellipse at 50% 15%,#1a1630,#04050b 75%);color:#e9eef6;font-family:Noto Sans KR,sans-serif;overflow:auto;padding:18px';document.body.appendChild(ov);var notes=[];
 var draw=function(){var n=r.ev.n,can=canClaim();
  var cell=function(x,i){var got=i<n,today=i===n&&can,big=x.t==='frame'||x.t==='ticket'||(x.t==='gear'&&x.v>=4);
   return '<div style="position:relative;padding:8px 4px;border-radius:10px;text-align:center;min-height:78px;border:1px solid '+(today?'#ffd166':big?colOf(x)+'99':'rgba(255,255,255,.1)')+';background:'+(got?'rgba(125,255,208,.08)':today?'rgba(190,214,240,.14)':big?'rgba(255,255,255,.07)':'rgba(255,255,255,.03)')+';'+(got?'opacity:.55':'')+'"><small style="opacity:.7">'+(i+1)+L('일','')+'</small><div style="font-size:20px;line-height:1.3;color:'+colOf(x)+'">'+icon(x)+'</div><div style="font-size:10.5px;line-height:1.2;color:'+colOf(x)+';font-weight:'+(big?800:500)+'">'+label(x)+'</div>'+(got?'<span style="position:absolute;top:4px;right:6px;color:#7dffd0;font-weight:900">✓</span>':'')+'</div>';};
  ov.innerHTML='<div style="max-width:860px;margin:0 auto"><div style="display:flex;align-items:center;gap:10px"><div><div style="font:700 12px Rajdhani,sans-serif;letter-spacing:.35em;color:#9fb6cf">EVENTS</div><b style="font-size:22px">'+L('행사 · 출석 보상','Events · Attendance')+'</b></div><span style="flex:1"></span><button id="evX">✕</button></div>'+
   (notes.length?'<div style="margin:12px 0;padding:12px 14px;border-radius:10px;background:rgba(190,214,240,.12);border:1px solid rgba(255,209,102,.4);line-height:1.7;font-weight:700">'+notes.join('<br>')+'</div>':'')+
   (giftDue()?'<div style="margin:12px 0;padding:12px 14px;border-radius:12px;background:linear-gradient(90deg,rgba(197,140,255,.18),rgba(90,180,255,.1));border:1px solid rgba(197,140,255,.45);display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><b style="color:#e3c8ff">'+L('신규 기동전사 33종 출시 기념','33 new frames — launch gift')+'</b><br><small style="opacity:.85">'+L('양산형 기체 1기와 금화 900(소환 3회분)을 드립니다. 한 번만 받을 수 있습니다.','One mass-production frame and 900 shards (3 summons). Once only.')+'</small></div><button id="evGift" style="padding:10px 20px;border-radius:10px;border:0;background:#c58cff;color:#140a22;font-weight:900;cursor:pointer">'+L('받기','Claim')+'</button></div>':'')+
   '<div style="margin:12px 0 6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><b style="font-size:16px">'+L('28일 출석 행사 ','28-day attendance ')+'<span style="color:#ffd166">'+n+' / 28</span></b><small style="opacity:.7">'+L('매달 1일 새로 시작 · 하루 한 번 · 빠진 날은 건너뛰지 않고 이어집니다','Restarts on the 1st · once a day · missed days are not lost')+'</small><span style="flex:1"></span><button id="evClaim" '+(can?'':'disabled')+' style="padding:11px 24px;border-radius:10px;border:0;font-weight:900;font-size:15px;cursor:'+(can?'pointer':'default')+';background:'+(can?'linear-gradient(90deg,#f4f8fc,#9eb0c5)':'rgba(255,255,255,.1)')+';color:'+(can?'#0a1322':'#8c96a8')+'">'+(can?L('오늘 출석 + 행운 추첨','Check in + lucky draw'):n>=28?L('이번 달 완주!','Completed this month!'):L('내일 다시 오세요','Come back tomorrow'))+'</button></div>'+
   '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">'+CAL.map(cell).join('')+'</div>'+
   '<div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px"><div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:13px;line-height:1.7"><b style="color:#ffd166">'+L('행운 추첨 확률 (출석할 때마다 1회)','Lucky draw rates (once per check-in)')+'</b><br>'+LUCK.map(function(q){return '<span style="color:'+colOf(q[1])+'">'+label(q[1])+'</span> — <b>'+q[0]+'%</b>';}).join('<br>')+'</div>'+
   '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:13px;line-height:1.7"><b style="color:#ffd166">'+L('알아 두기','Notes')+'</b><br>'+L('무작위 기체는 그 등급의 모든 기체 가운데 같은 확률로 나옵니다. 이미 가진 기체가 나오면 각성 단계가 1 오릅니다(최대 5).','A random frame is drawn evenly from every frame of that grade. A frame you already own raises its awakening by 1 (max 5).')+'<br>'+L('전설 확정 소환권은 소환 화면에서 씁니다.','Use the Legendary ticket on the Summon screen.')+'<br>'+L('모든 보상은 무료입니다.','All rewards are free.')+'</div></div></div>';
  ov.querySelector('#evX').onclick=function(){ov.remove();badge();};
  var c=ov.querySelector('#evClaim');if(c&&can)c.onclick=function(){var o=claim();if(o){notes=o.lines;draw();badge();}};
  var g=ov.querySelector('#evGift');if(g)g.onclick=function(){var o=gift();if(o){notes=o;draw();badge();}};};
 draw();};

// ---------- home button with a dot while something can be claimed ----------
var badge=function(){var b=document.getElementById('mEvent');if(!b)return;if(b.parentNode&&b.parentNode.id==='lbyDock')return;var on=canClaim()||giftDue();b.innerHTML='🎁 '+L('행사','Events')+(on?' <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff5a5a;vertical-align:middle;box-shadow:0 0 6px #ff5a5a"></span>':'');};
guard('menuBtn',function(){setInterval(function(){guard('menuTick',function(){var sq=document.getElementById('mRank')||document.getElementById('mSq');if(!sq||!R())return;var b=document.getElementById('mEvent');if(!b){b=sq.cloneNode(false);b.id='mEvent';b.onclick=function(){open();};sq.parentNode.insertBefore(b,sq.nextSibling);}badge();});},1500);});
})();
