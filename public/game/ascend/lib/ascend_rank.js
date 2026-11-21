/* ASCEND v3.48 — competition layer for the squad dungeon (loaded after lib/ascend348.js)
   · combat power (CP) of my frame, recommended CP for every stage, "power up" guidance when a stage is failed
   · ten tiers over the 200 stages (20 stages each) with a weekly tier salary
   · rankings: dungeon (this week / all time) and combat power, with rank-based weekly rewards
   Server boards go through window.HKAccount (submitScore / topScores) — the same service the duel arena uses.
   Without a login the tier salary still works; rank rewards need the server. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var R=function(){return window.__A&&window.__A.R?window.__A.R():null;};
var save=function(){try{window.__A.saveP();}catch(e){}};
var fmt=function(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');};

// ---------- combat power ----------
// CP = 1000 x health x damage / damage-taken, with small weights for crit and cooldown. A new Saber is about 1,900.
var cp=X.cp=function(){var s=window.__arkStats&&window.__arkStats();if(!s)return 0;return Math.round(1000*(s.hp||1)*(s.dmg||1)/(s.taken||1)*(1+(s.crit||0)*.5)/Math.sqrt(s.cd||1));};
// Recommended CP: the enemy's health x damage multiplier of the stage, set so that being AT the number is a fair fight
// (calibrated on stage 13: CP 3,600 clears it, sometimes with a loss).
var recCP=X.recCP=function(n){var m=window.__sqMul?window.__sqMul(n):{hp:1,dmg:1};return Math.round(1000*m.hp*m.dmg/1.26/50)*50;};

// ---------- tiers ----------
var TIERS=[['훈련병','Recruit','#9fb4d8'],['브론즈','Bronze','#c98a5a'],['실버','Silver','#cfd9ec'],['골드','Gold','#ffd166'],['플래티넘','Platinum','#7fe8ff'],['다이아','Diamond','#9fb8ff'],['마스터','Master','#c58cff'],['그랜드마스터','Grandmaster','#ff8a8f'],['챌린저','Challenger','#ff6b3a'],['레전드','Legend','#fff0a0']];
var tierOf=X.tierOf=function(best){var i=best>0?Math.min(9,Math.floor((best-1)/20)):0;return {i:i,ko:TIERS[i][0],en:TIERS[i][1],c:TIERS[i][2],next:Math.min(200,(i+1)*20+1)};};
var tierName=function(t){return L(t.ko,t.en);};
// weekly tier salary (gold) — paid once a week whatever the ranking is
var SALARY=[200,400,700,1000,1400,1800,2400,3000,3800,4800];
// weekly rank rewards (gold) on the weekly dungeon board; rank 1 also gets a legend summon ticket
var RANKRW=[[1,1200],[3,800],[10,500],[50,300],[100,150]];
var rankReward=function(rank){for(var i=0;i<RANKRW.length;i++)if(rank<=RANKRW[i][0])return RANKRW[i][1];return 50;};

// ---------- week (ISO week, the same key the duel arena uses) ----------
var WEEK=function(off){var d=new Date(Date.now()+(off||0)*7*864e5),t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),dn=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-dn+3);var y0=new Date(Date.UTC(t.getUTCFullYear(),0,4));return t.getUTCFullYear()+'w'+(1+Math.round(((t-y0)/864e5-3+((y0.getUTCDay()+6)%7))/7));};
var rk=function(){var r=R();if(!r)return null;r.sq=r.sq||{best:0,stars:{},t:{}};r.rk=r.rk||{wk:WEEK(),wbest:0,wt:999,paid:{},sal:{}};if(r.rk.wk!==WEEK()){r.rk.last={wk:r.rk.wk,wbest:r.rk.wbest,wt:r.rk.wt};r.rk.wk=WEEK();r.rk.wbest=0;r.rk.wt=999;}return r;};
var score=function(stage,t){return stage>0?stage*1000+(999-Math.max(0,Math.min(999,Math.round(t||999)))):0;};
var unscore=function(s){return {stage:Math.floor(s/1000),t:999-(s%1000)};};
var myName=function(){var r=R(),nm='Pilot';try{nm=String((typeof P!=='undefined'&&P.name)||'Pilot').replace(/\|/g,'').slice(0,10);}catch(e){}return nm+'|'+((r&&r.mech)||'mech3');};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var decName=function(s){var p=String(s||'').split('|');return {nm:esc((p[0]||'?').slice(0,16)),mech:esc(p[1]||'')};};
var TO=function(p,ms){return Promise.race([Promise.resolve(p).catch(function(){return null;}),new Promise(function(ok){setTimeout(function(){ok(null);},ms||5000);})]);};
var HK=function(){var A=window.HKAccount;return (A&&A.user&&!A.disabled&&A.submitScore&&A.topScores)?A:null;};
// records that cannot be real are never sent: a stage cleared in under 8 s, or with less than 35% of the recommended power
var plausible=function(n,t){try{if(!n)return false;if((t||0)<8)return false;return cp()>=recCP(n)*.35;}catch(e){return false;}};
var publish=X.rankPublish=function(){var A=HK(),r=rk();if(!A||!r)return Promise.resolve(false);var b=r.sq.best||0,nm=myName();if(b&&!plausible(b,r.sq.t[b]))b=0;if(r.rk.wbest&&!plausible(r.rk.wbest,r.rk.wt)){r.rk.wbest=0;r.rk.wt=999;}
 return Promise.all([b?TO(A.submitScore('ascend_sq',score(b,r.sq.t[b]),nm),6000):null,r.rk.wbest?TO(A.submitScore('ascend_sq_'+r.rk.wk,score(r.rk.wbest,r.rk.wt),nm),6000):null,TO(A.submitScore('ascend_cp',cp(),nm),6000)]).then(function(){return true;});};

// called by the dungeon when a stage ends (index.html → window.__sqOnFinish)
window.__sqOnFinish=function(n,won,t,grade){guard('onFinish',function(){var r=rk();if(!r)return;
  if(won&&(n>r.rk.wbest||(n===r.rk.wbest&&t<r.rk.wt))){r.rk.wbest=n;r.rk.wt=t;}save();publish();
  setTimeout(function(){guard('resultAdd',function(){var ov=document.getElementById('sqRes');if(!ov||ov.querySelector('#rkRes'))return;var box=ov.firstElementChild;if(!box)return;var my=cp(),rec=recCP(n),tr=tierOf(r.sq.best||0),d=document.createElement('div');d.id='rkRes';d.style.cssText='margin:10px 0 4px;padding:10px;border-radius:10px;background:rgba(255,255,255,.05);text-align:left;font-size:13px;line-height:1.55';
    var h='<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>'+L('내 전투력 ','My power ')+'<b style="color:'+(my>=rec?'#7dffd0':my>=rec*.8?'#ffd166':'#ff8a8f')+'">'+fmt(my)+'</b> / '+L('추천 ','recommended ')+fmt(rec)+'</span><span style="color:'+tr.c+';font-weight:800">'+tierName(tr)+L(' 티어',' tier')+'</span></div>';
    if(!won){h+='<div style="margin-top:8px;color:#ffb36b;font-weight:800">'+(my<rec?L('전투력이 '+fmt(rec-my)+' 부족합니다. 강해져서 다시 도전하세요.','You are '+fmt(rec-my)+' power short. Power up and try again.'):L('전투력은 충분합니다. 편성과 조작으로 넘을 수 있습니다.','Your power is enough: adjust the squad and try again.'))+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">'+[['hunt',L('필드 사냥 · 경험치와 재료','Field hunting · XP and materials')],['gear',L('정비소 · 장비 강화','Hangar · upgrade gear')],['summon',L('소환 · 새 기체와 각성','Summon · new frames, awakening')],['prev',L('이전 단계 반복 · 보상 모으기','Replay earlier stages · farm rewards')]].map(function(a){return '<button data-pw="'+a[0]+'" style="padding:9px 6px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e9eef6;font:700 12px \'Noto Sans KR\',sans-serif;cursor:pointer">'+a[1]+'</button>';}).join('')+'</div>';}
    d.innerHTML=h;var btnRow=box.lastElementChild;box.insertBefore(d,btnRow);
    d.querySelectorAll('[data-pw]').forEach(function(b){b.onclick=function(){var k=b.dataset.pw;ov.remove();try{window.__T.leaveMatch();}catch(e){}setTimeout(function(){try{if(k==='prev'){window.squadOpen&&window.squadOpen();return;}window.openRpg&&window.openRpg();setTimeout(function(){var want={hunt:/사냥터|Hunt/,gear:/정비소|Hangar/,summon:/소환|Summon/}[k];var tb=[].slice.call(document.querySelectorAll('#rpg button')).filter(function(x){return want.test(x.textContent)&&x.offsetParent;})[0];if(tb)tb.click();},500);}catch(e){}},500);};});});},900);});};

// ---------- formation screen: power line, tier, ranking button ----------
var decorate=function(){guard('decorate',function(){var ov=document.getElementById('sqOv');if(!ov||ov.querySelector('#rkBar'))return;var m=ov.innerText.match(/(?:단계|Stage)\s*(\d+)/);if(!m)return;var n=+m[1],r=rk();if(!r)return;var my=cp(),rec=recCP(n),tr=tierOf(r.sq.best||0),col=my>=rec?'#7dffd0':my>=rec*.8?'#ffd166':'#ff8a8f';
  var d=document.createElement('div');d.id='rkBar';d.style.cssText='margin:6px 0 10px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.05);border-left:3px solid '+col+';display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px';
  d.innerHTML='<span>'+L('내 전투력 ','My power ')+'<b style="font-size:17px;color:'+col+'">'+fmt(my)+'</b></span><span>'+L('이 단계 추천 전투력 ','Recommended ')+'<b style="font-size:17px">'+fmt(rec)+'</b></span><span style="color:'+col+';font-weight:800">'+(my>=rec?L('도전 적정','Ready'):my>=rec*.8?L('조금 부족 · 조작으로 극복 가능','A little short'):L('전투력 부족 · 성장 후 도전 권장','Too weak · power up first'))+'</span><span style="flex:1"></span><span style="color:'+tr.c+';font-weight:800">'+tierName(tr)+L(' 티어',' tier')+(tr.i<9?' <small style="opacity:.7;font-weight:500">· '+L('다음 티어 ','next at ')+tr.next+L('단계','')+'</small>':'')+'</span><button id="rkOpen" style="padding:6px 14px;border-radius:8px;border:1px solid #9fb6cf;background:rgba(159,182,207,.14);color:#ffd166;font-weight:800;cursor:pointer">🏆 '+L('순위 · 보상','Rankings')+'</button>';
  var host=ov.querySelector('#sqPrev');if(host&&host.parentElement)host.parentElement.insertAdjacentElement('afterend',d);else ov.firstElementChild.appendChild(d);d.querySelector('#rkOpen').onclick=function(){open();};});};
guard('observe',function(){new MutationObserver(function(){if(document.getElementById('sqOv'))decorate();}).observe(document.body,{childList:true});setInterval(function(){if(document.getElementById('sqOv'))decorate();},400);});

// ---------- weekly settlement ----------
var settle=function(){var r=rk();if(!r)return Promise.resolve([]);var out=[],tr=tierOf(r.sq.best||0),wk=r.rk.wk;
 if(!r.rk.sal[wk]&&(r.sq.best||0)>0){r.rk.sal[wk]=1;var s=SALARY[tr.i];r.shards=(r.shards||0)+s;out.push(L('주간 티어 급여('+tierName(tr)+') 금화 +'+fmt(s),'Weekly tier salary ('+tierName(tr)+'): +'+fmt(s)+' shards'));save();}
 var last=r.rk.last,A=HK();if(!last||!last.wbest||r.rk.paid[last.wk]||!A)return Promise.resolve(out);
 return TO(A.topScores('ascend_sq_'+last.wk,100),6000).then(function(rows){if(!rows)return out;var me=A.user.uid,rank=0;for(var i=0;i<rows.length;i++)if(rows[i].id===me){rank=i+1;break;}var rw=rank?rankReward(rank):100;r.rk.paid[last.wk]=1;r.shards=(r.shards||0)+rw;if(rank===1)r.legTicket=(r.legTicket||0)+1;save();
   out.push(L('지난주 던전 순위 '+(rank?rank+'위':'100위 밖')+' 보상 금화 +'+fmt(rw)+(rank===1?' · 전설 확정 소환권 +1':''),'Last week: rank '+(rank||'100+')+' → +'+fmt(rw)+' shards'+(rank===1?' · legend ticket +1':'')));return out;});};

// ---------- ranking screen ----------
var open=X.rankOpen=function(){var r=rk();if(!r)return;var ov=document.getElementById('rk348');if(ov)ov.remove();ov=document.createElement('div');ov.id='rk348';ov.style.cssText='position:fixed;inset:0;z-index:9400;background:radial-gradient(ellipse at 50% 20%,#101a30,#03050b 75%);color:#e9eef6;font-family:Noto Sans KR,sans-serif;overflow:auto;padding:18px';document.body.appendChild(ov);
 var tab='week',notes=[],rows={},A=HK(),tr=tierOf(r.sq.best||0);
 var draw=function(){var list=rows[tab],my=cp(),b=r.sq.best||0,meId=A&&A.user&&A.user.uid;
  var line=function(x,i){var d=decName(x.name),mine=x.id===meId,v=tab==='cp'?fmt(x.score):(function(){var u=unscore(x.score);return L('단계 ','Stage ')+u.stage+' · '+u.t+L('초','s');})(),t2=tab==='cp'?null:tierOf(unscore(x.score).stage);
   return '<div style="display:flex;gap:10px;align-items:center;padding:6px 10px;border-radius:8px;background:'+(mine?'rgba(190,214,240,.14)':i%2?'rgba(255,255,255,.03)':'transparent')+'"><b style="width:34px;color:'+(i<3?'#ffd166':'#9fb4d8')+'">'+(i+1)+'</b><span style="flex:1;font-weight:'+(mine?800:500)+'">'+d.nm+(mine?' ('+L('나','me')+')':'')+'</span>'+(t2?'<small style="color:'+t2.c+'">'+tierName(t2)+'</small>':'')+'<b>'+v+'</b>'+(tab==='week'?'<small style="width:70px;text-align:right;color:#7dffd0">+'+fmt(rankReward(i+1))+'</small>':'')+'</div>';};
  var body=!A?'<div style="padding:14px;border-radius:10px;background:rgba(255,255,255,.04);line-height:1.6">'+L('순위표는 로그인한 파일럿끼리 겨룹니다. 로그인하면 내 기록이 등록되고 주간 순위 보상을 받습니다.<br>로그인하지 않아도 <b>주간 티어 급여</b>는 받습니다.','Rankings are between logged-in pilots. Log in to register your record and earn weekly rank rewards.<br>The <b>weekly tier salary</b> is paid even without a login.')+'</div>':
    !list?'<div style="opacity:.6;padding:14px">'+L('불러오는 중…','Loading…')+'</div>':!list.length?'<div style="opacity:.6;padding:14px">'+L('아직 기록이 없습니다. 첫 기록의 주인공이 되세요.','No entries yet. Be the first.')+'</div>':list.map(line).join('');
  ov.innerHTML='<div style="max-width:860px;margin:0 auto"><div style="display:flex;align-items:center;gap:10px"><div><div style="font:700 12px Rajdhani,sans-serif;letter-spacing:.35em;color:#9fb6cf">RANKINGS</div><b style="font-size:22px">'+L('순위 · 티어 · 보상','Rankings · Tier · Rewards')+'</b></div><span style="flex:1"></span><button id="rkX">✕</button></div>'+
   '<div style="margin:12px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">'+
    '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05);border-left:4px solid '+tr.c+'"><small style="opacity:.7">'+L('내 티어','My tier')+'</small><div style="font:900 24px \'Noto Sans KR\';color:'+tr.c+'">'+tierName(tr)+'</div><small>'+L('최고 단계 ','Best stage ')+b+' / 200'+(tr.i<9?' · '+L('다음 티어까지 ','next tier in ')+Math.max(0,tr.next-1-b+1)+L('단계',' stages'):'')+'</small></div>'+
    '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05)"><small style="opacity:.7">'+L('내 전투력','My combat power')+'</small><div style="font:900 24px Rajdhani,sans-serif;color:#7fe8ff">'+fmt(my)+'</div><small>'+L('다음 단계 추천 ','next stage needs ')+fmt(recCP(Math.min(200,b+1)))+'</small></div>'+
    '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05)"><small style="opacity:.7">'+L('이번 주 기록 ','This week ')+r.rk.wk+'</small><div style="font:900 24px Rajdhani,sans-serif;color:#ffd166">'+(r.rk.wbest?L('단계 ','Stage ')+r.rk.wbest:'—')+'</div><small>'+L('매주 월요일 초기화 · 주간 순위로 보상 지급','Resets every Monday · rewards by weekly rank')+'</small></div></div>'+
   (notes.length?'<div style="margin:8px 0;padding:10px 12px;border-radius:10px;background:rgba(125,255,208,.1);color:#7dffd0;font-weight:700">'+notes.join('<br>')+'</div>':'')+
   '<div style="display:flex;gap:6px;margin:10px 0">'+[['week',L('던전 순위 · 이번 주','Dungeon · this week')],['all',L('던전 순위 · 전체','Dungeon · all time')],['cp',L('전투력 순위','Combat power')]].map(function(t){return '<button data-tab="'+t[0]+'" style="padding:8px 14px;border-radius:8px;border:1px solid '+(tab===t[0]?'#ffd166':'rgba(255,255,255,.15)')+';background:'+(tab===t[0]?'rgba(190,214,240,.14)':'transparent')+';color:#e9eef6;font-weight:700;cursor:pointer">'+t[1]+'</button>';}).join('')+'</div>'+
   '<div style="display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:14px;align-items:start"><div>'+body+'</div>'+
   '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:13px;line-height:1.7"><b style="color:#ffd166">'+L('주간 순위 보상 (금화)','Weekly rank rewards (shards)')+'</b><br>'+L('1위','1st')+' 1,200 + '+L('전설 확정 소환권','legend ticket')+'<br>2~3'+L('위','')+' 800<br>4~10'+L('위','')+' 500<br>11~50'+L('위','')+' 300<br>51~100'+L('위','')+' 150<br>'+L('그 외 참가','Others')+' 50<br><br><b style="color:#ffd166">'+L('주간 티어 급여 (금화)','Weekly tier salary (shards)')+'</b><br>'+TIERS.map(function(t,i){return '<span style="color:'+t[2]+'">'+L(t[0],t[1])+'</span> <small style="opacity:.6">'+(i*20+1)+'~'+(i*20+20)+'</small> '+fmt(SALARY[i]);}).join('<br>')+'</div></div></div>';
  ov.querySelector('#rkX').onclick=function(){ov.remove();};[].slice.call(ov.querySelectorAll('[data-tab]')).forEach(function(b2){b2.onclick=function(){tab=b2.dataset.tab;draw();load();};});};
 var load=function(){if(!A||rows[tab])return;var board=tab==='week'?'ascend_sq_'+r.rk.wk:tab==='all'?'ascend_sq':'ascend_cp',t0=tab;TO(A.topScores(board,50),6000).then(function(x){rows[t0]=x||[];if(document.getElementById('rk348'))draw();});};
 draw();settle().then(function(n){notes=n||[];if(document.getElementById('rk348'))draw();});publish().then(load,load);};

// home menu: a ranking button next to the squad dungeon button
guard('menuBtn',function(){var iv=setInterval(function(){var sq=document.getElementById('mSq');if(!sq)return;clearInterval(iv);if(document.getElementById('mRank'))return;var b=sq.cloneNode(false);b.id='mRank';b.textContent='🏆 '+L('순위','Ranking');b.onclick=function(){open();};sq.parentNode.insertBefore(b,sq.nextSibling);},500);});
})();
