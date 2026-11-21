/* ASCEND v3.48 — growth (loaded after lib/ascend_event.js)
   · skill points: 1 per pilot level-up and 1 per 10 squad-dungeon stages cleared
   · a new pilot starts with the dash, the laser cannon (Q) and the melee skill (E); the ultimate (R), the absolute skill (T)
     and the drone fusion are bought with skill points, and spare points go into attack / armour (+3% each, 10 steps)
   · grade gaps shown as level head starts (index.html: window.__GLV, window.__grow)
   · the Phoenix is given free on the first clear of squad-dungeon stage 30 */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var A=function(){return window.__A||null;};
var R=function(){var a=A();return a&&a.R?a.R():null;};
var save=function(){if(X._draft){X._dirty=true;return;}try{A().saveP();}catch(e){}};var saveNow=function(){try{A().saveP();}catch(e){}};
var tx=function(n){return n?L(n.ko,n.en):'';};
var RAR=[['일반','Common','#c9d2e3'],['고급','Uncommon','#7ee787'],['희귀','Rare','#5ab4ff'],['영웅','Epic','#c58cff'],['전설','Legendary','#ffd166'],['신화','Mythic','#ff6b6b']];

// k, cost, max, name, what it does
var NODES=[
 ['ult',3,1,L('궁극기 (R)','Ultimate (R)'),L('게이지가 차면 쓰는 가장 강한 기술','The strongest skill, used when the gauge is full')],
 ['abs',2,1,L('절대기 (T)','Absolute skill (T)'),L('전황을 뒤집는 특수 기술','A special skill that turns the fight')],
 ['fusion',2,1,L('드론 합체','Drone fusion'),L('드론 6기를 합쳐 12초 동안 화력을 올림','Merge six drones for 12 s of extra firepower')],
 ['atk',1,10,L('공격 강화','Attack up'),L('한 단계에 공격력 +3%','+3% damage a step')],
 ['hp',1,10,L('장갑 강화','Armour up'),L('한 단계에 내구 +3%','+3% health a step')]];
var st=function(){var r=R();if(!r)return null;if(!r.sk){r.sk={got:{}};
  // pilots who already played keep what they had: the three skills stay open
  if((r.lv||1)>=5||(r.sq&&r.sq.best>0)){r.sk.got={ult:1,abs:1,fusion:1};r.sk.old=1;}save();}r.sk.got=r.sk.got||{};return r;};
var total=function(r){return Math.max(0,(r.lv||1)-1)+Math.floor(((r.sq&&r.sq.best)||0)/10);};
var spent=function(r){var n=0;NODES.forEach(function(q){var v=r.sk.got[q[0]]||0;if(r.sk.old&&q[2]===1)return;n+=v*q[1];});return n+bookCost(r);};
var free=X.skFree=function(){var r=st();return r?total(r)-spent(r):0;};


// ---------- skill book (v3.48c) ----------
// Every frame can learn only its own list of skills; the list is longer for higher grades (3/4/5/7/10/15).
// What you take into battle is limited by equip slots, the same for every grade: 3 at the start (Q, E, R),
// one more at pilot level 10, 20, 35 and 50 (keys 7, 8, 9, 0 and a small bar above the skill bar). 1 skill point per skill.
var POOLN=[3,4,5,7,10,15],SLOTLV=[1,1,1,10,20,35,50],SLOTKEY=['Q','E','R','7','8','9','0'],ORIG=null;
var arche=function(k){return k==='saber0'?'mech3':((window.__NEWMECH&&window.__NEWMECH[k])||k);};
var origKit=function(k){if(!ORIG)ORIG=JSON.parse(JSON.stringify(window.__SK2KIT||{}));return ORIG[arche(k)]||{};};
var pool=X.skPool=function(k){var T=window.__SK2T,M=window.__MECHS;if(!T||!M||!M[k])return [];var b=origKit(k),first=[b.q,b.e,b.r].filter(Boolean),ids=Object.keys(T).filter(function(id){return first.indexOf(id)<0;});
 var h=function(s){var x=7;for(var i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))>>>0;return x;};ids.sort(function(a,c){return h(k+a)-h(k+c);});return first.concat(ids).slice(0,M[k].god?15:(POOLN[M[k].r]||3));};
var slots=X.skSlots=function(){var r=R(),lv=(r&&r.lv)||1,n=0;for(var i=0;i<SLOTLV.length;i++)if(lv>=SLOTLV[i])n++;return n;};
var book=X.skBook=function(k){var r=st();r.skb=r.skb||{};var b=r.skb[k];if(!b){var p=pool(k),M=window.__MECHS[k],o=origKit(k);
  // frames of Rare grade and above keep the three skills they always had; common and uncommon frames learn everything with points
  var fr=(M.r>=2||M.god)?[o.q,o.e,o.r].filter(function(id){return id&&p.indexOf(id)>=0;}):[];var has=function(id){return id&&fr.indexOf(id)>=0?id:null;};
  b=r.skb[k]={learned:fr.slice(),eq:[has(o.q),has(o.e),has(o.r),null,null,null,null],free:fr.length};save();}
 b.eq=b.eq||[];while(b.eq.length<7)b.eq.push(null);return b;};
var bookCost=function(r){var n=0,B=r.skb||{};for(var k in B)n+=Math.max(0,(B[k].learned||[]).length-(B[k].free||0));return n;};
var applyKit=X.skApply=function(){var r=R();if(!r||!window.__SK2KIT||!window.__SK2T||!window.__MECHS||!window.__MECHS[r.mech])return;origKit(r.mech);var b=book(r.mech),n=slots(),o={};
 if(b.eq[0])o.q=b.eq[0];if(b.eq[1])o.e=b.eq[1];if(b.eq[2]&&r.sk.got.ult)o.r=b.eq[2];if(o.q||o.e||o.r)window.__SK2KIT[r.mech]=o;else delete window.__SK2KIT[r.mech];
 X._ex=[];for(var i=3;i<n;i++)if(b.eq[i])X._ex.push([b.eq[i],SLOTKEY[i]]);};
// extra slots: cast from a small bar (and keys 7 8 9 0); auto battle uses them too
var cds={},cdG=null;
var castX=function(id){try{if(typeof G==='undefined'||!G||G.over||!G.local)return;var u=G.local.unit;if(!u||u.dead||!window.__SK2||!window.__SK2[id])return;if(cdG!==G){cdG=G;cds={};}var T=window.__SK2T[id];if((cds[id]||0)>G.t)return;
  var tg=null,bd=1e9,us=G.units;for(var i=0;i<us.length;i++){var e=us[i];if(e.dead||e.team===u.team||e.team===2)continue;var d=Math.hypot(e.x-u.x,e.y-u.y);if(d<bd){bd=d;tg=e;}}
  var a=tg?Math.atan2(tg.y-u.y,tg.x-u.x):(u.aa!=null?u.aa:u.a);cds[id]=G.t+T.cd;window.__SK2[id](u,a,tg&&bd<(T.at||T.rng)+200?tg.x:undefined,tg&&bd<(T.at||T.rng)+200?tg.y:undefined);try{pop(tx(T.n),'#9ff6ff',false);}catch(e){}}catch(e){}};
guard('skx',function(){addEventListener('keydown',function(ev){if(ev.repeat)return;var i=['Digit7','Digit8','Digit9','Digit0'].indexOf(ev.code);if(i<0||!X._ex)return;var s=X._ex.filter(function(q){return q[1]===SLOTKEY[3+i];})[0];if(s)castX(s[0]);});
 setInterval(function(){guard('skxTick',function(){var inM=typeof G!=='undefined'&&G&&!G.over&&G.local&&G.local.unit&&G.local.unit.cls==='arkframe';var bar=document.getElementById('skx348');
  if(!inM||!X._ex||!X._ex.length){if(bar)bar.style.display='none';if(!inM)applyKit();return;}
  if(!bar){bar=document.createElement('div');bar.id='skx348';bar.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:96px;z-index:9;display:flex;gap:6px;pointer-events:auto';document.body.appendChild(bar);}
  bar.style.display='flex';if(cdG!==G){cdG=G;cds={};}var h='';X._ex.forEach(function(q){var T=window.__SK2T[q[0]],left=Math.max(0,(cds[q[0]]||0)-G.t);h+='<button data-x="'+q[0]+'" style="min-width:62px;padding:5px 8px;border-radius:9px;border:1px solid '+(left>0?'rgba(255,255,255,.15)':'#cfe0f2')+';background:rgba(8,12,22,.72);color:'+(left>0?'#8c96a8':'#eaf3fc')+';font:700 11px \'Noto Sans KR\',sans-serif;cursor:pointer">'+tx(T.n)+'<br><small style="opacity:.75">'+(left>0?Math.ceil(left)+L('초','s'):q[1])+'</small></button>';});
  if(bar.dataset.h!==h){bar.dataset.h=h;bar.innerHTML=h;[].slice.call(bar.querySelectorAll('[data-x]')).forEach(function(b){b.onpointerdown=function(ev){ev.stopPropagation();castX(b.dataset.x);};});}
  // auto battle: fire an extra skill when a foe is inside its reach
  try{if(typeof P!=='undefined'&&P.autoHunt){var u=G.local.unit,near=1e9,us=G.units;for(var i=0;i<us.length;i++){var e=us[i];if(e.dead||e.team===u.team||e.team===2)continue;near=Math.min(near,Math.hypot(e.x-u.x,e.y-u.y));}X._ex.forEach(function(q){var T=window.__SK2T[q[0]];if(near<(T.at||T.rng)*.9)castX(q[0]);});}}catch(e){}});},300);});
var bookHtml=function(r){var k=r.mech,M=window.__MECHS[k];if(!M||!window.__SK2T)return '';var p=pool(k),b=book(k),n=slots(),fr=free(),TY={grab:L('끌어오기','Grab'),cc:L('제압','Control'),aoe:L('광역','Area'),guard:L('보호','Guard'),engage:L('진입','Engage'),finish:L('마무리','Finisher')};
 var nextLv=SLOTLV.filter(function(l){return l>(r.lv||1);})[0];
 var h='<b style="color:#9fb6cf">'+L('이 기체의 기술 ','THIS FRAME\'S SKILLS ')+b.learned.length+' / '+p.length+'</b> <small style="opacity:.75">· '+L('장착 칸 ','equip slots ')+n+' / 7'+(nextLv?' · '+L('다음 칸 Lv ','next slot at Lv ')+nextLv:'')+' · '+L('등급이 높을수록 배울 수 있는 기술이 많습니다 (3·4·5·7·10·15)','higher grades can learn more skills (3·4·5·7·10·15)')+'</small>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin:8px 0 14px">';
 p.forEach(function(id){var T=window.__SK2T[id],on=b.learned.indexOf(id)>=0,at=b.eq.indexOf(id);
  h+='<div style="padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid '+(at>=0?'#7dffd0':on?'rgba(207,224,242,.5)':'rgba(255,255,255,.1)')+';display:flex;gap:10px;align-items:center"><div style="flex:1;min-width:0"><b>'+tx(T.n)+'</b> <small style="color:#9fb6cf">'+(TY[T.ty]||T.ty)+'</small><br><small style="opacity:.75">'+L('재사용 ','cooldown ')+T.cd+L('초','s')+(T.coef?' · '+L('위력 ×','power ×')+T.coef:'')+(T.cc?' · '+T.cc[0]:'')+'</small></div>'+
   (on?'<select data-eq="'+id+'" style="height:34px;border-radius:9px;background:rgba(255,255,255,.08);color:#eaf3fc;border:1px solid rgba(255,255,255,.2);padding:0 8px"><option value="-1">'+L('미장착','Not equipped')+'</option>'+SLOTKEY.slice(0,n).map(function(s,i){return '<option value="'+i+'"'+(at===i?' selected':'')+'>'+L('칸 ','Slot ')+s+'</option>';}).join('')+'</select>'
      :'<button data-learn="'+id+'" '+(fr>=1?'':'disabled')+' style="padding:9px 14px;border:0;font-weight:900;cursor:'+(fr>=1?'pointer':'default')+';background:'+(fr>=1?'linear-gradient(180deg,#f4f8fc,#9eb0c5)':'rgba(255,255,255,.1)')+';color:'+(fr>=1?'#0a1322':'#8c96a8')+'">'+L('배우기 · 포인트 1','Learn · 1 point')+'</button>')+'</div>';});
 return h+'</div>'+(b.eq[2]&&!r.sk.got.ult?'<small style="color:#ffb36b;display:block;margin:-8px 0 12px">'+L('칸 R의 기술은 위의 「궁극기 (R)」를 해금해야 쓸 수 있습니다.','The skill in slot R needs the "Ultimate (R)" unlock above.')+'</small>':'');};
var bookBind=function(ov,r,redraw){[].slice.call(ov.querySelectorAll('[data-learn]')).forEach(function(bt){bt.onclick=function(){var b=book(r.mech),id=bt.dataset.learn;if(free()<1||b.learned.indexOf(id)>=0)return;b.learned.push(id);var e=-1,n=slots();for(var i=0;i<n;i++)if(!b.eq[i]){e=i;break;}if(e>=0)b.eq[e]=id;save();applyKit();redraw();};});
 [].slice.call(ov.querySelectorAll('[data-eq]')).forEach(function(se){se.onchange=function(){var b=book(r.mech),id=se.dataset.eq,to=+se.value,from=b.eq.indexOf(id);if(from>=0)b.eq[from]=null;if(to>=0){var other=b.eq[to];b.eq[to]=id;if(other&&from>=0)b.eq[from]=other;}save();applyKit();redraw();};});};

// asked by index.html before the ultimate / absolute / fusion fire
var lastMsg=0;
window.__skLock=function(u,k){try{if(typeof G==='undefined'||!G||!G.local||u!==G.local.unit||u.cls!=='arkframe')return false;var r=st();if(!r||r.sk.got[k])return false;
  var now=Date.now();if(now-lastMsg>4000){lastMsg=now;var nm=NODES.filter(function(q){return q[0]===k;})[0][3];try{pop(nm+L(' · 잠김 (성장에서 기술 포인트로 해금)',' · locked (unlock with skill points in Growth)'),'#ffd166',false);}catch(e){}}return true;}catch(e){return false;}};


// ---------- game information (grade gaps · summon odds · skill slots): kept out of the growth screen ----------
var gradeHtml=function(lv){var GLV=window.__GLV||[0,10,20,35,55,80];return '<b style="color:#9fb6cf">'+L('등급 차이 (같은 레벨에서 기본 기체보다 몇 레벨 앞서는가)','GRADE GAP (levels ahead of a basic frame at the same pilot level)')+'</b>'+
   '<div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-top:6px">'+RAR.map(function(q,i){var f={r:i,rh:1,rd:1},a=window.__grow?window.__grow({lv:lv,sk:{got:{}}},f):{hp:1,dmg:1},b=window.__grow?window.__grow({lv:lv,sk:{got:{}}},{r:0,rh:1,rd:1}):{hp:1,dmg:1};return '<div style="padding:8px 4px;border-radius:10px;text-align:center;background:rgba(255,255,255,.04);border-top:3px solid '+q[2]+'"><b style="color:'+q[2]+'">'+L(q[0],q[1])+'</b><br><span style="font:800 16px Rajdhani,sans-serif">+'+GLV[i]+'</span><br><small style="opacity:.7">'+L('공격 ×','DMG ×')+(a.dmg/b.dmg).toFixed(2)+'<br>'+L('내구 ×','HP ×')+(a.hp/b.hp).toFixed(2)+'</small></div>';}).join('')+'</div>'+'<small style="opacity:.7;display:block;margin-top:8px">'+L('배율은 지금 내 레벨 기준입니다. 레벨이 오를수록 등급 차이는 줄어듭니다. 결투장에서는 등급 차이를 ±25% 안으로 보정합니다.','Multipliers are for your current level. The gap shrinks as you level. The duel arena limits the grade gap to ±25%.')+'</small>';};
var infoOpen=X.infoOpen=function(tab){var r=R();if(!r)return;var ov=document.getElementById('gi348');if(ov)ov.remove();ov=document.createElement('div');ov.id='gi348';ov.style.cssText='position:fixed;inset:0;z-index:9650;background:rgba(3,5,11,.9);display:flex;align-items:center;justify-content:center;padding:12px';document.body.appendChild(ov);tab=tab||'odds';
 var draw=function(){var lv=r.lv||1,body='';
  if(tab==='odds')body=window.__oddsHtml?window.__oddsHtml():'';
  else if(tab==='grade')body=gradeHtml(lv);
  else if(tab==='news'){var nw='';try{nw=String(t('news')||'');}catch(e){}var ns=[];try{ns=(window.__NOTICES||[]).slice(0,6);}catch(e){}var tt=function(x){return typeof x==='string'?x:L(x.ko,x.en);};body='<div class="epi" style="line-height:1.7"><b style="color:#8fe3ff">NEW</b> '+nw.replace(/[<>]/g,'')+'</div>'+ns.map(function(n){return '<div class="epi"><div style="display:flex;gap:10px"><b style="flex:1">'+tt(n.t).replace(/[<>]/g,'')+'</b><small style="opacity:.6">'+n.d+'</small></div><div class="small" style="margin-top:6px;line-height:1.7;opacity:.85">'+tt(n.b).replace(/[<>]/g,'')+'</div></div>';}).join('');}
  else body='<div class="epi" style="line-height:1.8">'+L('<b>배울 수 있는 기술</b> — 기체마다 목록이 정해져 있고 등급이 높을수록 많습니다: 일반 3 · 고급 4 · 희귀 5 · 영웅 7 · 전설 10 · 신화 15. 기술 1개에 포인트 1.<br><b>장착 칸</b> — 등급과 관계없이 처음 3칸(Q·E·R), 파일럿 Lv 10 · 20 · 35 · 50에 1칸씩 늘어 최대 7칸(키 7·8·9·0).<br><b>기술 포인트</b> — 레벨이 오를 때 1, 분대 던전 10단계마다 1.<br><b>레벨</b> — 레벨마다 공격력 +3%, 내구 +2%. 최고 60.<br><b>분대</b> — 처음 2기, Lv 8에 3기, Lv 16에 4기, Lv 25에 5기.','<b>Learnable skills</b> — each frame has its own list, longer for higher grades: 3 · 4 · 5 · 7 · 10 · 15. One point per skill.<br><b>Equip slots</b> — 3 at the start (Q·E·R), one more at pilot level 10 · 20 · 35 · 50, 7 at most (keys 7·8·9·0).<br><b>Skill points</b> — 1 per level-up, 1 per 10 squad-dungeon stages.<br><b>Level</b> — +3% damage and +2% health per level, cap 60.<br><b>Squad</b> — 2 frames at the start, 3 at Lv 8, 4 at Lv 16, 5 at Lv 25.')+'</div>';
  ov.innerHTML='<div class="panel" style="width:min(880px,96vw);max-height:92vh;overflow:auto;padding:18px 20px;color:#e9eef6"><div style="display:flex;align-items:center;margin-bottom:10px"><div style="flex:1"><div style="font:700 11px Rajdhani,sans-serif;letter-spacing:.4em;color:#9fb6cf">GAME INFO</div><h2 style="margin:2px 0 0">'+L('게임 정보','Game information')+'</h2></div><button id="giX" style="width:38px;height:38px;border-radius:19px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e9eef6;cursor:pointer">✕</button></div>'+
   '<div style="display:flex;gap:6px;margin:0 0 12px;flex-wrap:wrap">'+[['odds',L('소환 확률','Summon odds')],['grade',L('등급 차이','Grade gaps')],['rule',L('기술 · 성장 규칙','Skills and growth')],['news',L('새 소식','What is new')]].map(function(q){return '<button data-gi="'+q[0]+'" style="padding:8px 14px;border-radius:17px;border:1px solid '+(tab===q[0]?'#cfe0f2':'rgba(255,255,255,.14)')+';background:'+(tab===q[0]?'rgba(190,214,240,.14)':'transparent')+';color:#e9eef6;font-weight:700;cursor:pointer">'+q[1]+'</button>';}).join('')+'</div>'+body+'</div>';
  ov.querySelector('#giX').onclick=function(){ov.remove();};[].slice.call(ov.querySelectorAll('[data-gi]')).forEach(function(b){b.onclick=function(){tab=b.dataset.gi;draw();};});};
 ov.onclick=function(e){if(e.target===ov)ov.remove();};draw();};
// ---------- growth screen ----------
var open=X.growOpen=function(){var r=st();if(!r)return;var ov=document.getElementById('gw348');if(ov)ov.remove();ov=document.createElement('div');ov.id='gw348';
 ov.style.cssText='position:fixed;inset:0;z-index:9400;background:radial-gradient(ellipse at 50% 15%,#10202a,#04050b 75%);color:#e9eef6;font-family:Noto Sans KR,sans-serif;overflow:auto;padding:18px';document.body.appendChild(ov);
 var snap=JSON.stringify({sk:r.sk,skb:r.skb||{}});X._draft=true;X._dirty=false;
 var revert=function(){var o=JSON.parse(snap);r.sk=o.sk;r.skb=o.skb;X._dirty=false;applyKit();};
 var draw=function(){var M=window.__MECHS||{},C=M[r.mech]||M.mech3,GLV=window.__GLV||[0,10,20,35,55,80],lv=r.lv||1,fr=free(),g=window.__grow?window.__grow(r,C):{hp:1,dmg:1},g1=window.__grow?window.__grow({lv:lv+1,sk:r.sk},C):g;
  var node=function(q){var v=r.sk.got[q[0]]||0,max=q[2],full=v>=max,can=!full&&fr>=q[1];
   return '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid '+(full?'#7dffd0':can?'rgba(207,224,242,.55)':'rgba(255,255,255,.1)')+';display:flex;gap:10px;align-items:center"><div style="flex:1"><b>'+q[3]+'</b>'+(max>1?' <small style="color:#7dffd0">'+v+' / '+max+'</small>':'')+'<br><small style="opacity:.75">'+q[4]+'</small></div>'+(full?'<span style="color:#7dffd0;font-weight:800">'+(max>1?L('최대','MAX'):L('해금됨','Unlocked'))+'</span>':'<button data-n="'+q[0]+'" '+(can?'':'disabled')+' style="padding:9px 14px;border:0;font-weight:900;cursor:'+(can?'pointer':'default')+';background:'+(can?'linear-gradient(180deg,#f4f8fc,#9eb0c5)':'rgba(255,255,255,.1)')+';color:'+(can?'#0a1322':'#8c96a8')+'">'+L('포인트 ','Points ')+q[1]+'</button>')+'</div>';};
  ov.innerHTML='<div style="max-width:860px;margin:0 auto"><div style="display:flex;align-items:center;gap:10px"><div><div style="font:700 12px Rajdhani,sans-serif;letter-spacing:.35em;color:#9fb6cf">GROWTH</div><b style="font-size:22px">'+L('성장 · 기술','Growth · Skills')+'</b></div><span style="flex:1"></span><button id="gwX">✕</button></div>'+
   '<div style="margin:12px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">'+
    '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05)"><small style="opacity:.7">'+L('파일럿 레벨','Pilot level')+'</small><div style="font:900 26px Rajdhani,sans-serif;color:#7fe8ff">Lv '+lv+'</div><small>'+L('레벨이 오를 때마다 공격력 +3%, 내구 +2%, 기술 포인트 +1','Each level: +3% damage, +2% health, +1 skill point')+'</small></div>'+
    '<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.05);border-left:4px solid '+RAR[C.r][2]+'"><small style="opacity:.7">'+L('지금 기체','Current frame')+'</small><div style="font:900 17px \'Noto Sans KR\';color:'+RAR[C.r][2]+'">'+tx(C.n)+'</div><small>'+L(RAR[C.r][0],RAR[C.r][1])+L(' 등급 · 기본 기체보다 ',' · ')+'+'+GLV[C.r]+L('레벨 앞섬',' levels ahead')+'<br>'+L('내구 ×','Health ×')+g.hp.toFixed(2)+' · '+L('공격 ×','Damage ×')+g.dmg.toFixed(2)+(lv<60?' <span style="color:#7dffd0">→ Lv'+(lv+1)+': ×'+g1.hp.toFixed(2)+'</span>':'')+'</small></div>'+
    '<div style="padding:12px;border-radius:12px;background:rgba(190,214,240,.08);border:1px solid rgba(207,224,242,.45)"><small style="opacity:.7">'+L('남은 기술 포인트','Skill points left')+'</small><div style="font:900 26px Rajdhani,sans-serif;color:#eaf3fc">'+fr+'</div><small>'+L('레벨업 1 · 분대 던전 10단계마다 1','1 per level · 1 per 10 dungeon stages')+'</small></div></div>'+
   '<b style="color:#9fb6cf">'+L('기술','SKILLS')+'</b><div style="margin:6px 0 4px;padding:10px 12px;border-radius:10px;background:rgba(125,255,208,.07);font-size:13px">'+L('처음부터 쓸 수 있는 기술: 돌진 · 레이저포(Q) · 근접 기술(E) · 기본 근접 연타','Open from the start: dash · laser cannon (Q) · melee skill (E) · basic melee combo')+'</div>'+
   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin-bottom:14px">'+NODES.map(node).join('')+'</div>'+bookHtml(r)+
   '<div id="gwBar" style="position:sticky;bottom:-18px;z-index:2;margin:14px -18px -18px;padding:12px 18px 14px;background:rgba(6,9,16,.97);border-top:1px solid rgba(255,255,255,.1);display:flex;gap:8px;align-items:center;flex-wrap:wrap"><small style="flex:1;min-width:160px;color:'+(X._dirty?'#ffb36b':'#9fb0cc')+'">'+(X._dirty?L('바뀐 내용이 있습니다. 「결정」을 눌러야 저장됩니다.','You have changes. Press Confirm to keep them.'):L('포인트를 나눈 뒤 「결정」을 누르면 저장됩니다.','Spend points, then press Confirm to save.'))+'</small><button id="gwUndo" '+(X._dirty?'':'disabled')+' style="padding:10px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:transparent;color:'+(X._dirty?'#eaf3fc':'#6c7688')+';font-weight:700;cursor:pointer">'+L('되돌리기','Undo')+'</button><button id="gwReset" style="padding:10px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eaf3fc;font-weight:700;cursor:pointer">'+L('전체 초기화','Reset all')+'</button><button id="gwOk" class="pri" '+(X._dirty?'':'disabled')+' style="padding:11px 22px;border:0;font-weight:900;cursor:pointer;background:'+(X._dirty?'linear-gradient(180deg,#f4f8fc,#9eb0c5)':'rgba(255,255,255,.1)')+';color:'+(X._dirty?'#0a1322':'#8c96a8')+'">'+L('결정 · 저장','Confirm · Save')+'</button></div>'+
   '</div>';
  ov.querySelector('#gwX').onclick=function(){if(X._dirty)revert();X._draft=false;saveNow();ov.remove();badge();};
  ov.querySelector('#gwUndo').onclick=function(){revert();draw();badge();};
  ov.querySelector('#gwOk').onclick=function(){X._draft=false;saveNow();X._draft=true;X._dirty=false;snap=JSON.stringify({sk:r.sk,skb:r.skb||{}});applyKit();draw();badge();try{pop(L('성장 내용을 저장했습니다','Growth saved'),'#7dffd0',false);}catch(e){}};
  ov.querySelector('#gwReset').onclick=function(){var g={};if(r.sk.old){g.ult=1;g.abs=1;g.fusion=1;}r.sk.got=g;var B=r.skb||{};for(var k in B){var b=B[k],keep=(b.learned||[]).slice(0,b.free||0);b.learned=keep;b.eq=(b.eq||[]).map(function(id){return id&&keep.indexOf(id)>=0?id:null;});}X._dirty=true;applyKit();draw();badge();};bookBind(ov,r,function(){draw();badge();});
  [].slice.call(ov.querySelectorAll('[data-n]')).forEach(function(b){b.onclick=function(){var q=NODES.filter(function(z){return z[0]===b.dataset.n;})[0];if(!q||free()<q[1]||(r.sk.got[q[0]]||0)>=q[2])return;r.sk.got[q[0]]=(r.sk.got[q[0]]||0)+1;save();draw();badge();};});};
 draw();};

// ---------- home button, dot while points are unspent ----------
var badge=function(){var b=document.getElementById('mGrow');if(!b)return;if(b.parentNode&&b.parentNode.id==='lbyDock')return;var n=free();b.innerHTML='⬆ '+L('성장','Growth')+(n>0?' <span style="display:inline-block;min-width:16px;padding:0 4px;border-radius:8px;background:#ffd166;color:#0a1322;font:800 11px sans-serif;vertical-align:middle">'+n+'</span>':'');};
guard('menuBtn',function(){setInterval(function(){guard('menuTick',function(){var sq=document.getElementById('mEvent')||document.getElementById('mRank')||document.getElementById('mSq');if(!sq||!R())return;var b=document.getElementById('mGrow');if(!b){b=sq.cloneNode(false);b.id='mGrow';b.onclick=function(){open();};sq.parentNode.insertBefore(b,sq.nextSibling);}badge();
  // my frame's model is fetched while I am still in the menus, so that it is on screen from the first frame of a sortie
  try{var rr=R(),M0=window.__MECHS&&window.__MECHS[rr.mech],mf=(M0&&M0.mdl)||rr.mech;if(mf&&X._pre!==mf&&typeof mdlGet==='function'&&window.__TX&&window.__TX.GLTFLoader){X._pre=mf;mdlGet(mf);(rr.sqF?[rr.sqF.tank].concat(rr.sqF.back||[]):[]).forEach(function(k){var U=window.__sqUN&&window.__sqUN[k];if(U&&U.m)mdlGet(U.m);});}}catch(e){}
  // free Phoenix on the first clear of stage 30
  var r=R();if(r&&r.sq&&r.sq.best>=30&&(r.mechs||[]).indexOf('mech3')<0&&window.__phxGrant&&window.__phxGrant()){try{pop(L('분대 던전 30단계 돌파 보상: 세이버 「불사조」 지급!','Stage 30 reward: Saber “Phoenix”!'),'#ff6b6b',true);}catch(e){}}});},1500);});
})();
