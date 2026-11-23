/* ASCEND v3.48 — smooth-play engine patches (loaded after index.html's scripts and lib/transform.js).
   Everything here is measured: see docs/ASCEND_v3.48_작업기록.md for the before/after numbers. */
(function(){'use strict';
var X=window.__X348={v:'3.48',err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){X.err.push(tag+': '+String(e&&e.stack||e).slice(0,240));}}
function whenThree(fn){var iv=setInterval(function(){if(window.THREE){clearInterval(iv);guard('three',fn);}},40);}
function whenR3(fn){var iv=setInterval(function(){try{if(typeof R3!=='undefined'&&R3&&R3.ready&&R3.r){clearInterval(iv);guard('r3',fn);}}catch(e){}},60);}

// ---------- 1) three.js prototype fixes ----------
whenThree(function(){var T=window.THREE;
 // Material.copy / Object3D.copy deep-copy userData through JSON. Our userData holds materials (iffBase) and other live
 // objects, so every clone serialised whole textures to data-URLs (19% of the entry freeze). Shallow copy instead.
 var mc=T.Material.prototype.copy;
 T.Material.prototype.copy=function(s){var ud=s.userData;s.userData={};try{mc.call(this,s);}finally{s.userData=ud;}this.userData=Object.assign({},ud);return this;};
 var oc=T.Object3D.prototype.copy;
 T.Object3D.prototype.copy=function(s,rec){var ud=s.userData;s.userData={};try{oc.call(this,s,rec);}finally{s.userData=ud;}this.userData=Object.assign({},ud);return this;};
 // SkinnedMesh.computeBoundingSphere walks every vertex through its bones on the CPU (Meshy bodies are dense):
 // 14% of battle time, one hitch per spawned frame. The bind-pose sphere with a margin is enough for culling.
 // The real (bone-space) result is computed once per geometry and reused by every clone of that model, with a margin.
 var SP=T.SkinnedMesh.prototype,oS=SP.computeBoundingSphere,oB=SP.computeBoundingBox;
 SP.computeBoundingSphere=function(){var g=this.geometry,c=g.userData.__sbs;if(!this.boundingSphere)this.boundingSphere=new T.Sphere();
  if(c){this.boundingSphere.copy(c);return;}oS.call(this);var s=this.boundingSphere;if(isFinite(s.radius)&&s.radius>0){s.radius*=1.5;g.userData.__sbs=s.clone();}};
 SP.computeBoundingBox=function(){var g=this.geometry,c=g.userData.__sbb;if(!this.boundingBox)this.boundingBox=new T.Box3();
  if(c){this.boundingBox.copy(c);return;}oB.call(this);var b=this.boundingBox;if(!b.isEmpty()&&isFinite(b.min.x)&&isFinite(b.max.x)){g.userData.__sbb=b.clone();}};
});

// Six effects (melee arcs, flashes, shock rings…) advanced their clock by a fixed 1/60 s per drawn frame, so on a slow device a
// 0.18 s slash arc stayed for a second or more as a big bright band. They now advance by the real frame time.
(function(){var last=performance.now(),dt=1/60;(function r(){var n=performance.now();dt=Math.min(.1,Math.max(.001,(n-last)/1000));last=n;requestAnimationFrame(r);})();window.__fdt=function(){return dt;};})();

// Squad dungeon and duel borrowed an episode to launch and showed that story chapter's title card ("5장 · …") over the fight.
guard('cine',function(){var _c=cine;cine=function(a,b,c,ms){try{var o=G&&G.rpg&&G.rpg.obj;if(o&&(o.k==='squad'||o.k==='duel'))return;}catch(e){}return _c(a,b,c,ms);};});

// Auto battle = full offence. It closes to blade range (melee hits hardest), and fires every skill it has as soon as it is up:
// Q / E / ultimate / absolute tech through the input, T and the 1-4 skill slots, the LINK strike (V) and the call-in (B) as key taps.
guard('auto',function(){var last={};
 var tap=function(code,cd){var t=G.t;if(last[code]>t)last[code]=-9;if((last[code]==null?-9:last[code])+cd>t)return;last[code]=t;
  try{window.dispatchEvent(new KeyboardEvent('keydown',{code:code,key:code.slice(-1).toLowerCase()}));setTimeout(function(){try{window.dispatchEvent(new KeyboardEvent('keyup',{code:code,key:code.slice(-1).toLowerCase()}));}catch(e){}},120);}catch(e){}};
 window.__autoWrap=function(_a,u){var inp=_a(u);if(!inp||!G||G.over||!u||u.dead||P.autoCalm||u.cls!=='arkframe')return inp;
  try{var foe=null,fd=1e9,near=0,boss=false,us=G.units;for(var i=0;i<us.length;i++){var e=us[i];if(e.dead||e.team===u.team||e.team===2||(e.rival&&window.__rvSkip&&window.__rvSkip(e)))continue;var d=Math.hypot(e.x-u.x,e.y-u.y);if(d<fd){fd=d;foe=e;}if(d<480)near++;if((e.boss||e.named||e.elite2)&&d<750)boss=true;}
   var sqM=G.rpg&&G.rpg.obj&&G.rpg.obj.k==='squad';try{var SWl=window.__SW&&window.__SW.list;if(SWl&&SWl.length&&(!foe||fd>360)){var sb=null,sd=1e9,cnt=0;for(var si=0;si<SWl.length;si++){var q=SWl[si];if(q.dead)continue;var d2s=Math.hypot(q.x-u.x,q.y-u.y);if(d2s<sd){sd=d2s;sb=q;}if(d2s<240)cnt++;}if(sb&&sd<760){var sa=Math.atan2(sb.y-u.y,sb.x-u.x);inp.aim=sa;inp.tx=sb.x;inp.ty=sb.y;inp.fire=true;if(sd>110){inp.mx=Math.cos(sa);inp.my=Math.sin(sa);}else{inp.mx=Math.cos(sa+1.57)*.3;inp.my=Math.sin(sa+1.57)*.3;}inp.a2=cnt>=3;inp.a1=sd>200&&sd<700;return inp;}}}catch(er){}if(!foe||fd>(sqM?3000:1100))return inp;var a=Math.atan2(foe.y-u.y,foe.x-u.x);inp.aim=a;inp.tx=foe.x;inp.ty=foe.y;inp.fire=true;
   var hr=u.hp/(u.mhp||1);/* fall back for 4 s at most, then fight again for at least 10 s: without a way to heal the old rule retreated until the timer ran out */if(last.lowT>G.t+1){last.lowT=-99;last.lowCd=-99;last.low=0;}if(!last.low&&hr<.45&&G.t>(last.lowCd||-99)){last.low=1;last.lowT=G.t;}else if(last.low&&(hr>.7||G.t-last.lowT>4)){last.low=0;last.lowCd=G.t+10;}if(hr<.55){var ki=(P.skMap||[]).indexOf('kit');if(ki>=0)tap('Digit'+(ki+1),3);} // badly hurt: break off to gun range until repaired, then go back in
   var reach=(foe.r||14)+(u.r||20)+70,s=a+Math.PI/2;
   // enemy frames, aces and bosses are fought from mid range (skills + palm fire) and only finished with the blade once they are weak
   var strong=(foe.cls==='arkframe'||foe.boss||foe.named||foe.elite2)&&foe.hp>foe.mhp*.4;
   if(strong&&!last.low){if(fd<300){inp.mx=-Math.cos(a)*.7+Math.cos(s)*.6;inp.my=-Math.sin(a)*.7+Math.sin(s)*.6;}else if(fd>430){inp.mx=Math.cos(a);inp.my=Math.sin(a);}else{inp.mx=Math.cos(s)*.6;inp.my=Math.sin(s)*.6;}}
   else if(last.low){if(fd<380){inp.mx=-Math.cos(a)*.9+Math.cos(s)*.4;inp.my=-Math.sin(a)*.9+Math.sin(s)*.4;}else{inp.mx=Math.cos(s)*.5;inp.my=Math.sin(s)*.5;}}
   else if(fd>reach){inp.mx=Math.cos(a);inp.my=Math.sin(a);}else{inp.mx=Math.cos(s)*.3;inp.my=Math.sin(s)*.3;}
   inp.a1=fd<820;inp.a2=fd<340;inp.ul=(G.local.ult||0)>=100&&(near>=2||boss||fd<520);inp.ab=(G.local.ab||0)>=100&&(near>=3||boss);
   // number slots hold whatever the player put there (P.skMap). Only attack skills are pressed: never the flight toggle,
   // never "board" (that one makes the pilot climb OUT of the frame), never the repair kit (handled by health below).
   if(fd<650){tap('KeyT',2.2);var sm=P.skMap||[],k=Math.floor(G.t/0.45)%6,id=sm[k];if(id&&!/^(fly|board|kit|flight|unboard|eject|tf|transform|fusion)$/.test(id))tap('Digit'+(k+1),1.8);}
   // LINK combo strike: only when its button is up (the V key alone would switch the camera view)
   if(fd<520&&(last.lk==null||G.t-last.lk>.6||G.t<last.lk)){last.lk=G.t;if(!last.lkBtn||!last.lkBtn.isConnected){last.lkBtn=null;var bs=document.body.children;for(var j=0;j<bs.length;j++){var b=bs[j];if(b.tagName==='BUTTON'&&/링크 연계 일격|LINK combo strike/.test(b.textContent)){last.lkBtn=b;break;}}}
    if(last.lkBtn&&last.lkBtn.style.display==='block')last.lkBtn.click();}
   if(near>=3||boss)tap('KeyB',4);
   X.autoAct=(X.autoAct||0)+1;}catch(er){X.err.length<6&&X.err.push('auto:'+String(er).slice(0,120));}
  return inp;};
});

// Difficulty follows the head-count: every extra human on my side (beyond the humans on the other side) makes AI enemies tougher
// (+40% health each, up to x3) and the swarm bigger (+30% bodies, +25% health each). Solo play is unchanged. Host-side only.
guard('coop',function(){var _st=step,acc=0,shown=0;
 step=function(dt){_st(dt);try{if(!G||G.over||G.client||!G.local||!G.slots)return;acc+=dt;if(acc<.5)return;acc=0;
   var mine=0,theirs=0,lt=G.local.team;for(var i=0;i<G.slots.length;i++){var s=G.slots[i];if(s.kind==='local'||s.kind==='remote'){if(s.team===lt)mine++;else theirs++;}}
   var extra=Math.max(0,mine-theirs-1),f=Math.min(3,1+.4*extra);X.coop={humans:mine+theirs,mul:f};window.__coopN=1+.3*extra;window.__coopHp=1+.25*extra;
   for(var j=0;j<G.units.length;j++){var u=G.units[j];if(u.dead||u.team===lt||!u.slot||u.slot.kind==='local'||u.slot.kind==='remote'||!(u.mhp>0))continue;var p=u.__cm||1;if(p===f)continue;var k=f/p;u.mhp*=k;u.hp*=k;u.__cm=f;}
   if(extra>0&&shown!==G){shown=G;try{pop(L('참여 '+(mine+theirs)+'명 · 적 강화 ×','Players '+(mine+theirs)+' · enemies ×')+f.toFixed(1),'#ffb36b',true);}catch(e){}}}catch(e){X.err.length<6&&X.err.push('coop:'+String(e).slice(0,120));}};
});

// One result card for every mode (faction battle, squad dungeon, duel, story, hunting): grade S/A/B, the "just missed" line,
// and three reasons to play another round (next pilot level, personal record, win streak). It sits beside the mode's own result screen.
guard('result',function(){var card=null,doneFor=null;
 var rec=function(){try{return JSON.parse(localStorage.getItem('ascend_rec348')||'{}');}catch(e){return {};}},save=function(o){try{localStorage.setItem('ascend_rec348',JSON.stringify(o));}catch(e){}};
 var build=function(){var Lc=G.local,k=Lc.k||0,d=Lc.d||0,caps=Lc.caps||0,win=G.win===Lc.team,o=G.rpg&&G.rpg.obj,mode=G.rpg?(o&&(o.k==='squad'||o.k==='duel'||o.k==='field')?o.k:'story'):'faction';
  var grade,miss,pts=k+caps*3+(win?12:0)-d*4,t=Math.round(G.t||0);
  if(mode==='faction'){grade=(win&&pts>=28&&d<=1)?'S':(win||pts>=14)?'A':'B';
   miss=grade==='S'?L('완벽한 전투!','Flawless!'):grade==='A'?(!win?L('승리했다면 S에 도전할 수 있었다','A win would have put S in reach'):d>1?L('대파 '+(d-1)+'회만 줄이면 S','Lose '+(d-1)+' fewer frames for S'):L('S까지 격추 '+Math.max(1,28-pts)+'기','S is '+Math.max(1,28-pts)+' kills away')):L('A까지 격추 '+Math.max(1,14-pts)+'기','A is '+Math.max(1,14-pts)+' kills away');}
  else if(mode==='squad'){grade=win?(t<=60?'S':t<=90?'A':'B'):'B';miss=!win?L('클리어하면 등급이 오른다','Clear the stage to rank up'):grade==='S'?L('60초 안에 돌파!','Cleared inside 60 s!'):L((grade==='A'?'S':'A')+'까지 '+(t-(grade==='A'?60:90))+'초','Only '+(t-(grade==='A'?60:90))+' s from '+(grade==='A'?'S':'A'));}
  else{grade=win?(d===0?'S':'A'):'B';miss=grade==='S'?L('무사망 클리어!','No frame lost!'):grade==='A'?L('무사망까지 대파 '+d+'회','No-loss clear was '+d+' frame'+(d>1?'s':'')+' away'):L('승리하면 A, 무사망이면 S','Win for A, lose no frame for S');}
  try{var wl=window.__wbLast;if(wl&&Date.now()-wl.at<20000){grade=wl.g==='-'?'—':wl.g;miss=wl.msg;}}catch(e){} /* v3.66: weekly boss - the card shows the boss grade, same as the centre screen */
  var R0=rec(),m=R0[mode]||{best:0,n:0,g:'B'},newRec=k>m.best,rank={S:3,A:2,B:1};
  var lines=[];
  try{var r=window.__A&&window.__A.R&&window.__A.R();if(r&&r.lv){var need=r.lv<30?Math.floor(40+r.lv*r.lv*3):0;lines.push(need?L('파일럿 Lv '+(r.lv+1)+'까지 경험치 '+Math.max(1,need-(r.exp||0)),'Pilot Lv '+(r.lv+1)+' in '+Math.max(1,need-(r.exp||0))+' XP'):L('파일럿 Lv '+r.lv+' · 다음 레벨 진행 중','Pilot Lv '+r.lv+' · levelling'));}}catch(e){}
  lines.push(newRec?L('신기록! 격추 '+k+'기 (이전 '+m.best+')','New record: '+k+' kills (was '+m.best+')'):L('최고 기록 '+m.best+'기까지 '+(m.best-k+1)+'기','Record '+m.best+' kills: '+(m.best-k+1)+' more to beat it'));
  var st=(P&&P.streak)||0;lines.push(win?L((st>1?st+'연승 중 · ':'')+'한 판 더 이기면 '+(Math.max(1,st)+1)+'연승','Win again for a '+(Math.max(1,st)+1)+'-win streak'):L('다음 판 승리로 연승 시작','Win the next one to start a streak'));
  if(rank[grade]<3)lines.push(L('이 모드 최고 등급 '+(rank[m.g]>rank[grade]?m.g:grade)+' → S 도전','Best grade here '+(rank[m.g]>rank[grade]?m.g:grade)+' → go for S'));
  m.best=Math.max(m.best,k);m.n++;if(rank[grade]>rank[m.g||'B'])m.g=grade;R0[mode]=m;save(R0);
  var gc={S:'#ffd166',A:'#7fe8ff',B:'#c9d4e6'}[grade],el=document.createElement('div');el.id='rc348';
  el.style.cssText='position:fixed;right:14px;bottom:14px;z-index:10060;width:'+(innerWidth<700?250:300)+'px;padding:12px 14px;border-radius:12px;background:rgba(8,13,25,.9);border:1px solid rgba(140,170,220,.3);border-left:4px solid '+gc+';color:#e9f0ff;font:500 13px/1.5 "Noto Sans KR",sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);cursor:pointer';
  el.innerHTML='<div style="display:flex;align-items:center;gap:10px"><b style="font:900 34px/1 Orbitron,sans-serif;color:'+gc+'">'+grade+'</b><div><div style="font-weight:800;color:'+gc+'">'+miss+'</div><small style="opacity:.7">'+L('격추 ','Kills ')+k+' · '+L('대파 ','Lost ')+d+' · '+t+L('초','s')+'</small></div></div><div style="margin-top:8px;border-top:1px solid rgba(140,170,220,.2);padding-top:6px"><small style="letter-spacing:.2em;opacity:.6">'+L('다음 판 이유','ONE MORE ROUND')+'</small>'+lines.slice(0,3).map(function(s){return '<div>· '+s+'</div>';}).join('')+'</div>';
  el.onclick=function(){el.remove();};document.body.appendChild(el);return el;};
 setInterval(function(){try{if(G&&G.over&&G.local&&doneFor!==G){doneFor=G;if(card)card.remove();card=build();X.resultShown=(X.resultShown||0)+1;}else if((!G||!G.over)&&card){card.remove();card=null;}}catch(e){X.err.length<6&&X.err.push('result:'+String(e).slice(0,140));}},500);
});

// When my frame is destroyed it must look destroyed (it used to just vanish and respawn): blast, debris, shake, a short freeze.
guard('mydeath',function(){var _st=step,was=false,lx=0,ly=0;
 step=function(dt){var u0=G&&G.local&&G.local.unit;if(u0&&!u0.dead){lx=u0.x;ly=u0.y;}_st(dt);try{if(!G||G.over||!G.local)return;var u=G.local.unit,dead=!u||!!u.dead;
   if(dead&&!was&&G.t>1){for(var i=0;i<(window.__phone?26:46);i++){var b=Math.random()*6.283,s=120+Math.random()*460;part(lx,ly,Math.cos(b)*s,Math.sin(b)*s,.5+Math.random()*.5,i%4===0?'#ffffff':i%2?'#ff8a3c':'#ffd27a',5+Math.random()*7,20+Math.random()*60);}
    G.parts.push({x:lx,y:ly,vx:0,vy:0,l:.5,ml:.5,c:'ring',s:230});G.shake=Math.max(G.shake||0,16);G.hstop=Math.max(G.hstop||0,.14);try{SFX.noise(.7,.5,140);}catch(e){}}
   was=dead;}catch(e){}};
});
// The models every sortie needs (my frame, the infantry, their rifle, the swarm) are fetched while the menu is up,
// so my frame is on screen from the first frame instead of popping in 2-3 s later.
(function(){var iv=setInterval(function(){try{if(!window.THREE||!window.__TX||!window.__TX.GLTFLoader||typeof mdlGet!=='function')return;clearInterval(iv);
  var list=[];try{var k=window.__AX&&window.__AX.myMechKey&&window.__AX.myMechKey();if(k)list.push(k);}catch(e){}/* v3.49: only my own frame is fetched in the menu; infantry, weapons and the swarm are fetched at deploy (newMatch prefetch) */
  list.forEach(function(f,i){setTimeout(function(){try{mdlGet(f);}catch(e){}},600+i*350);});}catch(e){}},300);})();

// Balance: the ordinary (white/grey) enemy frame is a standard unit, not an ace. It hits human players for 55% of what it did
// (40% during the first 90 s of a battle, so the opening is survivable) and has 75% of its health. Named aces and bosses are unchanged.
guard('balance',function(){var _h=hurt;
 var plain=function(u){return u&&u.cls==='arkframe'&&u.slot&&u.slot.kind==='bot'&&!u.named&&!u.boss&&!u.elite2;};
 hurt=function(e,dmg,src,a,dt){try{var su=src&&src.unit;if(su&&e&&e.slot&&(e.slot.kind==='local'||e.slot.kind==='remote')&&su.team!==e.team&&plain(su))dmg*=(G&&G.t<90)?.4:.55;}catch(er){}return _h.call(this,e,dmg,src,a,dt);};
 // Bosses must get to show their skills: a boss has 2.4x health, no single hit of mine takes more than 5% of it, it cannot
 // drop below 30% until it has used two skills, it takes no damage during its entrance, and its first skill comes at once.
 var _hb=hurt;hurt=function(e,dmg,src,a,dt){try{if(e&&e.boss&&e.fbs&&G&&G.local&&e.team!==G.local.team&&dmg>0){if(e.__bIn>G.t)return;var o=src&&(src.ownerSlot||src);if(o&&o.team===G.local.team){dmg=Math.min(dmg,e.mhp*.05);if((e.__skN||0)<2)dmg=Math.min(dmg,Math.max(0,e.hp-e.mhp*.3));if(dmg<=0)return;}}}catch(er){}return _hb.call(this,e,dmg,src,a,dt);};
 var _sb=step;step=function(dt){_sb(dt);try{if(!G||G.over||G.client||!G.local)return;var lt2=G.local.team;for(var i=0;i<G.units.length;i++){var u=G.units[i];if(u.dead||!u.boss||u.team===lt2||!u.fbs)continue;
   if(!u.__bh8){u.__bh8=1;u.mhp*=2.4;u.hp=u.mhp;u.__bIn=G.t+2.4;u.fbs.cd=Math.min(u.fbs.cd||9,2.6);}
   var c=u.fbs.cur||null;if(c&&c!==u.__lc)u.__skN=(u.__skN||0)+1;u.__lc=c;}}catch(er){}};
 var _st=step,acc=0;step=function(dt){_st(dt);try{if(!G||G.over||G.client||!G.local)return;acc+=dt;if(acc<.7)return;acc=0;var lt=G.local.team;for(var i=0;i<G.units.length;i++){var u=G.units[i];if(u.dead||u.__nf8||u.team===lt||!plain(u)||!(u.mhp>0))continue;u.__nf8=1;u.mhp*=.75;u.hp=Math.min(u.hp,u.mhp);}}catch(er){}};
});
// A model whose download failed (a dropped connection) used to stay failed for the whole session — the swarm then stayed
// as placeholder cones. Failed files are retried, up to 4 times each.
(function(){var tries={};setInterval(function(){try{if(typeof MC==='undefined')return;for(var f in MC){if(MC[f]&&MC[f].st==='fail'&&(tries[f]||0)<4){tries[f]=(tries[f]||0)+1;delete MC[f];try{mdlGet(f);}catch(e){}}}}catch(e){}},4000);})();

// Boss entrance (2.3 s): the edges of the screen darken, a lower-third name caption slides in, a short freeze and a low hit sound.
guard('bossIntro',function(){var _st=step,acc=0,el=null,until=0;
 var show=function(u){var nm='';try{nm=(u.slot&&u.slot.name)||u.name||'';if(typeof rs==='function')nm=rs(nm);}catch(e){}
  if(!el){el=document.createElement('div');el.id='bi348';el.style.cssText='position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;transition:opacity .25s;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 30%,rgba(0,0,0,.62) 100%)';
   el.innerHTML='<div style="position:absolute;left:0;right:0;bottom:24%;text-align:center"><div style="display:inline-block;padding:6px 26px;border-top:1px solid rgba(255,107,107,.7);border-bottom:1px solid rgba(255,107,107,.7);background:linear-gradient(90deg,rgba(0,0,0,0),rgba(20,4,6,.72),rgba(0,0,0,0))"><div style="font:700 11px Rajdhani,sans-serif;letter-spacing:.5em;color:#ff8a8f">⚠ '+L('위험 · 보스 출현','WARNING · BOSS')+'</div><div id="bi348n" style="font:900 26px \'Noto Sans KR\',sans-serif;color:#fff;text-shadow:0 2px 10px #000"></div></div></div>';document.body.appendChild(el);}
  el.querySelector('#bi348n').textContent=nm||L('강적','Boss');el.style.opacity='1';until=G.t+2.3;G.hstop=Math.max(G.hstop||0,.22);G.shake=Math.max(G.shake||0,8);try{SFX.noise(.5,.5,90);}catch(e){}try{var S2=window.__AX.SFX2;S2.tone(520,.28,'sawtooth',.06,380);setTimeout(function(){try{S2.tone(520,.28,'sawtooth',.06,380);}catch(e){}},340);setTimeout(function(){try{S2.tone(520,.28,'sawtooth',.06,380);}catch(e){}},680);}catch(e){}X.bossIntro=(X.bossIntro||0)+1;};
 step=function(dt){_st(dt);try{if(el&&until&&(!G||G.over||G.t>until||G.t<until-3)){el.style.opacity='0';until=0;}if(!G||G.over||!G.local)return;acc+=dt;if(acc<.3)return;acc=0;var me=G.local.unit;if(!me||me.dead||until)return;
   for(var i=0;i<G.units.length;i++){var u=G.units[i];if(u.dead||!u.boss||u.__bi8||u.team===me.team)continue;if(Math.hypot(u.x-me.x,u.y-me.y)<1500){u.__bi8=1;show(u);break;}}}catch(e){X.err.length<6&&X.err.push('boss:'+String(e).slice(0,120));}};
});

// EVOLUTIONS: two level-up perks that both reach level 2 fuse into an evolution with its own effect (six pairs).
// The pair is shown the moment it completes, lasts for the battle, and is remembered in a small collection (localStorage).
guard('evo',function(){
 var EVO=[
  {id:'crescent',a:'dmg',b:'rof',n:['붉은 초승달','Crimson Crescent'],d:['피해 +25% · 격추한 적이 폭발해 주변에 피해','+25% damage · kills explode'],c:'#ff6b7a'},
  {id:'phoenix', a:'hp', b:'arm',n:['불사조 장갑','Phoenix Plating'],d:['받는 피해 -15% · 초당 체력 1.5% 회복','-15% damage taken · 1.5% health per second'],c:'#ffb36b'},
  {id:'gale',    a:'spd',b:'cd', n:['질풍','Gale'],d:['이동 속도 +10% · 대시 재사용 2배 빠름','+10% speed · dash recharges twice as fast'],c:'#7fe8ff'},
  {id:'leech',   a:'ls', b:'dmg',n:['흡혈 칼날','Leech Edge'],d:['준 피해의 4%만큼 회복','Heal 4% of damage dealt'],c:'#c58cff'},
  {id:'overload',a:'ult',b:'cd', n:['과부하 코어','Overload Core'],d:['궁극기가 스스로 충전된다','The ultimate charges by itself'],c:'#ffd166'},
  {id:'colossus',a:'hp', b:'ls', n:['거신','Colossus'],d:['최대 체력 +25% · 격추할 때마다 체력 3% 회복','+25% max health · each kill heals 3%'],c:'#7ee787'}];
 X.EVO=EVO;var busy=false;
 var has=function(id){return !!(G&&G._evo&&G._evo[id]);};
 var mineSrc=function(src){return src&&G&&(src===G.local||src.ownerSlot===G.local);};
 var _h=hurt;
 hurt=function(e,dmg,src,a,dt){var mine=false,hp0=0;try{mine=mineSrc(src)&&e&&G.local.unit&&e!==G.local.unit;if(mine){if(has('crescent'))dmg*=1.25;hp0=e.hp;}}catch(er){}
  var r=_h.call(this,e,dmg,src,a,dt);
  try{if(mine){var me=G.local.unit,dealt=Math.max(0,hp0-Math.max(0,e.hp));if(me&&!me.dead){if(has('leech')&&dealt>0)me.hp=Math.min(me.mhp,me.hp+dealt*.04);
     if((e.dead||e.hp<=0)&&hp0>0){if(has('colossus'))me.hp=Math.min(me.mhp,me.hp+me.mhp*.03);
      if(has('crescent')&&!busy){busy=true;try{var ex=Math.max(40,e.mhp*.15);for(var i=0;i<G.units.length;i++){var v=G.units[i];if(v.dead||v===e||v.team===me.team)continue;if(Math.hypot(v.x-e.x,v.y-e.y)<150)_h.call(this,v,ex,src,Math.atan2(v.y-e.y,v.x-e.x),'x');}
        for(var j=0;j<14;j++){var b=Math.random()*6.283;part(e.x,e.y,Math.cos(b)*260,Math.sin(b)*260,.35,j%2?'#ff6b7a':'#ffd2d6',6,20);}G.parts.push({x:e.x,y:e.y,vx:0,vy:0,l:.3,ml:.3,c:'ring',s:150});}finally{busy=false;}}}}}}catch(er){}
  return r;};
 var _st=step,acc=0;
 step=function(dt){_st(dt);try{if(!G||G.over||G.client||!G.local)return;var s=G.local,u=s.unit,pk=s.pk||{};G._evo=G._evo||{};
   if(u&&!u.dead){if(has('phoenix'))u.hp=Math.min(u.mhp,u.hp+u.mhp*.015*dt);if(has('gale')&&u.dashCd>0)u.dashCd=Math.max(0,u.dashCd-dt);if(has('overload'))s.ult=Math.min(100,(s.ult||0)+dt*1.6);
    // stat parts are re-applied to a respawned frame
    if(u.__evA!==G){u.__evA=G;if(has('phoenix')&&u.st)u.st.taken*=.85;if(has('gale')&&u.st)u.st.spd*=1.1;if(has('colossus')){u.mhp*=1.25;u.hp*=1.25;}}}
   acc+=dt;if(acc<.5)return;acc=0;
   for(var i=0;i<EVO.length;i++){var E=EVO[i];if(G._evo[E.id]||(pk[E.a]||0)<2||(pk[E.b]||0)<2)continue;G._evo[E.id]=1;
    if(u&&!u.dead){if(E.id==='phoenix'&&u.st)u.st.taken*=.85;if(E.id==='gale'&&u.st)u.st.spd*=1.1;if(E.id==='colossus'){u.mhp*=1.25;u.hp=Math.min(u.mhp,u.hp*1.25+u.mhp*.1);}
     for(var j=0;j<36;j++){var b=Math.random()*6.283;part(u.x,u.y,Math.cos(b)*380,Math.sin(b)*380,.6,j%3?E.c:'#ffffff',7,30+Math.random()*50);}G.parts.push({x:u.x,y:u.y,vx:0,vy:0,l:.5,ml:.5,c:'ring',s:260});}
    G.hstop=Math.max(G.hstop||0,.16);G.shake=Math.max(G.shake||0,8);try{SFX.lvl&&SFX.lvl();}catch(e){}
    try{pop('✦ '+L('진화','EVOLUTION')+' · '+L(E.n[0],E.n[1])+' — '+L(E.d[0],E.d[1]),E.c,true);}catch(e){}
    try{var col=JSON.parse(localStorage.getItem('ascend_evo348')||'{}');col[E.id]=(col[E.id]||0)+1;localStorage.setItem('ascend_evo348',JSON.stringify(col));}catch(e){}
    X.evoGot=(X.evoGot||0)+1;}}catch(er){X.err.length<6&&X.err.push('evo:'+String(er).slice(0,140));}};
 // the level-up choice shows which evolution a perk works toward
 try{new MutationObserver(function(){try{var box=document.getElementById('perkPick');if(!box||box.classList.contains('hidden')||box.dataset.ev8===box.innerHTML.length+'')return;var pk=(G&&G.local&&G.local.pk)||{};
   box.querySelectorAll('button[data-k]').forEach(function(bt){if(bt.querySelector('.ev8'))return;var k=bt.dataset.k,hint=null;for(var i=0;i<EVO.length;i++){var E=EVO[i];if(has(E.id))continue;var o=E.a===k?E.b:E.b===k?E.a:null;if(o&&(pk[o]||0)>=1){hint=E;break;}}
    if(hint){var sp=document.createElement('i');sp.className='ev8';sp.style.cssText='display:block;font:700 10px "Noto Sans KR",sans-serif;font-style:normal;color:'+hint.c+';margin-top:2px';sp.textContent='✦ '+L(hint.n[0],hint.n[1]);bt.appendChild(sp);}});
   box.dataset.ev8=box.innerHTML.length+'';}catch(e){}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}catch(e){}
});

// BOSS CONTRIBUTION RACE: every boss fight (field bosses in the hunting grounds, story and dungeon bosses) shows a live damage
// ranking — me against my allies, and in solo hunting against rival hunters working the same boss. When the boss falls the
// rank is announced and paid (1st +300, 2nd +200, 3rd +120, others +60 credits; score in the faction battle).
guard('bossRank',function(){var _h=hurt,_st=step,acc=0,el=null,cur=null;
 var RIV=[['헌터 리온','Hunter Rion',.9],['헌터 세이지','Hunter Sage',.74],['헌터 미르','Hunter Mir',.6],['헌터 카론','Hunter Karon',.45]];
 var track=function(u){if(!u.__br){u.__br={by:{},t0:G.t,me:0,riv:null};var q=G.rpg;if(q&&q.obj&&q.obj.k==='field')u.__br.riv=RIV.map(function(r){return {n:L(r[0],r[1]),f:r[2]*(.85+Math.random()*.3),d:0};});}return u.__br;};
 hurt=function(e,dmg,src,a,dt){var hp0=0,ok=false;try{ok=e&&e.boss&&G&&G.local&&e.team!==G.local.team&&src;if(ok)hp0=e.hp;}catch(er){}
  var r=_h.call(this,e,dmg,src,a,dt);
  try{if(ok){var d=Math.max(0,hp0-Math.max(0,e.hp));if(d>0){var B=track(e),o=src.ownerSlot||src;if(o===G.local)B.me+=d;else if(o.team===G.local.team&&o.name){B.by[o.name]=(B.by[o.name]||0)+d;}}}}catch(er){}
  return r;};
 var rows=function(B){var a=[{n:(G.local.name||'ME'),d:B.me,me:1}];for(var k in B.by)a.push({n:k,d:B.by[k]});if(B.riv)B.riv.forEach(function(r){a.push({n:r.n,d:r.d});});a.sort(function(x,y){return y.d-x.d;});return a;};
 var draw=function(u,B){if(!el){el=document.createElement('div');el.id='br348';el.style.cssText='position:fixed;left:8px;top:34%;z-index:9;pointer-events:none;width:176px;padding:6px 8px;border-radius:8px;background:rgba(6,11,22,.55);border-left:3px solid #ff8a8f;color:#e9f0ff;font:600 11px/1.45 "Noto Sans KR",sans-serif;display:none';document.body.appendChild(el);}
  var a=rows(B),top=a[0].d||1,rank=1;for(var i=0;i<a.length;i++)if(a[i].me){rank=i+1;break;}var nm='';try{nm=(u.slot&&u.slot.name)||'';if(typeof rs==='function')nm=rs(nm);}catch(e){}
  var show=a.slice(0,4);if(rank>4)show[3]=a[rank-1];
  el.innerHTML='<div style="color:#ff9ea2;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(nm||L('보스','Boss'))+' · '+Math.max(0,Math.round(u.hp/u.mhp*100))+'%</div><div style="opacity:.65;font-size:10px">'+L('기여도 순위','Damage ranking')+' · '+rank+'/'+a.length+'</div>'+
   show.map(function(r){var i=a.indexOf(r)+1;return '<div style="position:relative;margin-top:2px;padding:0 3px;color:'+(r.me?'#ffd166':'#cfd9ec')+'"><div style="position:absolute;left:0;top:0;bottom:0;width:'+Math.round(r.d/top*100)+'%;background:'+(r.me?'rgba(255,209,102,.22)':'rgba(140,170,220,.14)')+';border-radius:3px"></div><span style="position:relative">'+i+'. '+String(r.n).slice(0,12)+'</span><span style="position:relative;float:right">'+Math.round(r.d)+'</span></div>';}).join('');
  el.style.display='block';};
 step=function(dt){_st(dt);try{if(!G||!G.local){if(el)el.style.display='none';return;}var me=G.local.unit;
   if(cur&&cur.__br&&cur.__br.riv&&!cur.dead&&cur.__br.me>0){var B0=cur.__br,el0=Math.max(1,G.t-B0.t0),dps=B0.me/el0;B0.riv.forEach(function(r){r.d+=dps*r.f*dt*(.6+Math.random()*.8);});}
   acc+=dt;if(acc<.4)return;acc=0;var best=null,bd=1e9;
   for(var i=0;i<G.units.length;i++){var u=G.units[i];if(!u.boss||!u.__br)continue;
    if(u.dead){if(!u.__br.paid){u.__br.paid=1;var a=rows(u.__br),rank=1;for(var j=0;j<a.length;j++)if(a[j].me){rank=j+1;break;}if(u.__br.me>0){var bonus=[300,200,120][rank-1]||60;
       try{if(G.rpg&&window.__A&&window.__A.R){var r=window.__A.R();r.cred=(r.cred||0)+bonus;window.__A.saveP&&window.__A.saveP();}else G.local.score=(G.local.score||0)+bonus;}catch(e){}
       try{pop('✦ '+L('보스 격파 · 기여도 ','Boss down · damage rank ')+rank+L('위 / ','/')+a.length+L('명 · 보상 +',' · reward +')+bonus,rank===1?'#ffd166':'#7fe8ff',true);}catch(e){}X.bossRank=rank;}}continue;}
    if(!me)continue;var d=Math.hypot(u.x-me.x,u.y-me.y);if(d<1800&&d<bd){bd=d;best=u;}}
   cur=best;if(best&&(best.__br.me>0||Object.keys(best.__br.by).length))draw(best,best.__br);else if(el)el.style.display='none';}catch(er){X.err.length<6&&X.err.push('rank:'+String(er).slice(0,140));}};
});

// Deploy screen pictures: every unit card and the detail panel show the unit's real model design (its thumbnail picture),
// not the old placeholder shape — the Saber used to be drawn as a flat blue flyer there.
guard('deployArt',function(){var _pc=previewCanvas,IMG={};
 var fileOf=function(cls){try{if(cls==='arkframe')return (window.__AX&&window.__AX.myMechKey&&window.__AX.myMechKey())||'mech3';
   if(typeof INF_ROLE!=='undefined'&&INF_ROLE[cls]){var fac=(G&&G.local&&G.local.team===1)?'emp':'fed';return INF_M[fac][INF_ROLE[cls]];}
   if(typeof MDL!=='undefined'&&MDL[cls])return MDL[cls][0];}catch(e){}return null;};
 // Gear check on the deploy screen: the frame's detail panel lists what is equipped in every slot, with a button to change it.
 var detCls=null,SLOT={rng:['사격 무기','Gun'],mel:['근접 무기','Melee'],shld:['방패','Shield'],wing:['날개','Wings'],ult:['코어','Core'],fuel:['추진 연료','Fuel'],ear:['장신구','Trinket'],neck:['장신구','Trinket'],d1:['드론 1','Drone 1'],d2:['드론 2','Drone 2'],d3:['드론 3','Drone 3'],d4:['드론 4','Drone 4'],d5:['드론 5','Drone 5'],d6:['드론 6','Drone 6']},RC=['#cfd9ec','#7fe8ff','#c58cff','#ffd166','#ff6b7a','#ff9bd0'];
 var gearBlock=function(){try{var det=document.getElementById('dpDetail');if(!det||detCls!=='arkframe'||det.querySelector('#eq348')||!det.querySelector('.nm'))return;var r=window.__A&&window.__A.R&&window.__A.R();if(!r||!r.eq)return;
   var all=(r.inv||[]).concat(r.drones||[]).concat(r.dr||[]),rows=[],n=0,tot=0;for(var k in SLOT){if(!(k in r.eq)&&/^d[56]$/.test(k))continue;tot++;var id=r.eq[k],it=id&&all.find(function(x){return x&&x.id===id;});if(id)n++;
    var nm=it?(it.n?(typeof it.n==='string'?it.n:L(it.n.ko,it.n.en)):L('장착됨','Equipped')):(id?L('장착됨','Equipped'):L('비어 있음','Empty'));
    rows.push('<div style="display:flex;gap:6px;justify-content:space-between;padding:1px 0"><span style="opacity:.65;white-space:nowrap">'+L(SLOT[k][0],SLOT[k][1])+'</span><span style="color:'+(it?RC[it.r||0]||RC[0]:id?'#cfd9ec':'#6b7890')+';text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+nm+(it&&it.lv?' +'+it.lv:'')+'</span></div>');}
   var d=document.createElement('div');d.id='eq348';d.style.cssText='margin-top:10px;padding-top:8px;border-top:1px solid rgba(140,170,220,.2);font-size:12px';
   d.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><b style="color:#5ad1ff;letter-spacing:.1em">'+L('장비 점검','GEAR CHECK')+' · '+n+'/'+tot+'</b>'+(window.__showGear?'<button id="eq348b" class="sm" style="padding:3px 10px;font-size:12px">'+L('장비 변경','Change gear')+'</button>':'')+'</div>'+rows.join('');
   det.appendChild(d);var b=d.querySelector('#eq348b');if(b)b.onclick=function(){try{window.__showGear();}catch(e){}};}catch(e){X.err.length<6&&X.err.push('gear:'+String(e).slice(0,120));}};
 try{var dd=document.getElementById('dpDetail');if(dd)new MutationObserver(function(){setTimeout(gearBlock,0);}).observe(dd,{childList:true});}catch(e){}
 // real 3D picture of a unit whose model is loaded (hover bike, walker, flyers…), framed on the model itself
 var T3C={};
 var thumb3=function(cls,w,h){try{var T=window.THREE,M=typeof MDL!=='undefined'&&MDL[cls];if(!T||!M||cls==='arkframe'||!R3.ready||!mdlGet(M[0]))return null;var key=cls+w+'x'+h,src=T3C[key];
   if(!src){R3.initThumb();var e=R3.build({cls:cls,layer:CL[cls].layer,r:CL[cls].r,wk:CL[cls].wpns[0]},P.ch,0);if(!e||!e.mdl)return null;if(e.ring)e.ring.visible=false;if(e.blob)e.blob.visible=false;e.root.rotation.y=.65;R3.ts.add(e.root);e.root.updateMatrixWorld(true);
    var bx=new T.Box3().setFromObject(e.mdl.wrap),c=bx.getCenter(new T.Vector3()),s=bx.getSize(new T.Vector3()).length()||40;
    R3.tr.setPixelRatio(1);R3.tr.setSize(w,h,false);R3.tc.aspect=w/h;R3.tc.updateProjectionMatrix();R3.tc.position.set(c.x+s*.55,c.y+s*.38,c.z+s*.85);R3.tc.lookAt(c);R3.tr.setClearColor(0x0a101e,1);R3.tr.render(R3.ts,R3.tc);
    src=document.createElement('canvas');src.width=w;src.height=h;src.getContext('2d').drawImage(R3.tr.domElement,0,0);R3.ts.remove(e.root);T3C[key]=src;}
   var out=document.createElement('canvas');out.width=w;out.height=h;out.getContext('2d').drawImage(src,0,0);return out;}catch(er){return null;}};
 previewCanvas=function(cls,ch,w,h){w=w||300;h=h||140;if(w>=600)detCls=cls;var t3=thumb3(cls,w,h);if(t3)return t3;var f=fileOf(cls);if(cls==='arkframe'&&f==='mech3')f='../../bg/ui/saber_red'; /* the Saber "Phoenix" is shown in its red design */if(!f)return _pc(cls,ch,w,h);var st=IMG[f];if(st&&st.bad)return _pc(cls,ch,w,h);
  var cv=document.createElement('canvas');cv.width=w;cv.height=h;var g=cv.getContext('2d');
  var paint=function(im){var gr=g.createRadialGradient(w/2,h*.85,4,w/2,h*.85,Math.max(w,h)*.8);gr.addColorStop(0,'#1a3058');gr.addColorStop(1,'#070c18');g.fillStyle=gr;g.fillRect(0,0,w,h);
   var k=Math.min(w/im.width,h/im.height)*1.02,dw=im.width*k,dh=im.height*k;g.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);};
  if(st&&st.im){paint(st.im);return cv;}
  var fb=_pc(cls,ch,w,h);try{g.drawImage(fb,0,0,w,h);}catch(e){}
  var im=new Image();im.onload=function(){IMG[f]={im:im};try{paint(im);}catch(e){}};im.onerror=function(){IMG[f]={bad:1};};im.src='models/thumbs/'+f+'.jpg';return cv;};
});

// The green/red bars at the top are the faction-battle ticket counts. They mean nothing in a squad dungeon or a duel, so
// they are not drawn there (only the stage clock stays).
guard('topbar',function(){var _rc=window.__RC;window.__RC=function(){try{var o=G&&G.rpg&&G.rpg.obj;if(o&&(o.k==='squad'||o.k==='duel'))return true;}catch(e){}return _rc?_rc():false;};});

// ---------- 1b) combat rules ----------
// Beam weapons charge between shots: one base attack speed for every energy beam (laser / beam / ion / arc), the same for
// allies and enemies. Faster definitions are slowed to BEAM_RATE and each shot hits proportionally harder, so damage per second is unchanged.
guard('beam',function(){var BEAM_RATE=.5;X.beamRate=BEAM_RATE;
 var isBeam=function(w){return w&&(w.kind===3||w.kind===11)&&!w.burst;};
 var fix=function(w){if(!isBeam(w)||w.__b348||!(w.rate>0)||w.rate>=BEAM_RATE)return;w.dmg=Math.round(w.dmg*BEAM_RATE/w.rate);w.rate=BEAM_RATE;w.__b348=1;};
 for(var k in W)fix(W[k]);
 var _fw=fireWeapon;fireWeapon=function(u){try{fix(u.w);}catch(e){}return _fw(u);};
});
// More enemies: in the faction battle a Zeta swarm keeps pouring in from the enemy side from 40 s on (instanced, cheap to draw).
guard('swarm',function(){var _st=step,next=40;
 step=function(dt){_st(dt);try{if(!G||G.over||G.client||G.rpg||G.inv||!G.local||G.local.team!==0||(MAP&&MAP.space)||G.mode==='moba')return;
   if(G.t<2)next=40;if(G.t<next)return;next=G.t+8;var me=G.local.unit;if(!me||me.dead)return;var SW=window.__SW,swSpawn=window.__swSpawn;if(!SW||!swSpawn)return;var cap=window.__swCap();if(SW.list.length>cap*.7)return;
   var b=BASES[1],a=Math.atan2(b.y-me.y,b.x-me.x)+(Math.random()-.5)*1.4,d=900+Math.random()*250;
   swSpawn(16+Math.floor(Math.random()*8),clamp(me.x+Math.cos(a)*d,60,WW-60),clamp(me.y+Math.sin(a)*d,60,WH-60),{hp:26+Math.min(60,G.t*.12),spread:180,chest:false});
   if(!G._sw348){G._sw348=1;try{pop(L('제타 무리 난입!','Zeta swarm incoming!'),'#c58cff',true);}catch(e){}}}catch(e){X.err.length<5&&X.err.push('swarm:'+e);}};
});

// ---------- 2) renderer hooks ----------
whenR3(function(){var r=R3.r;
 // Transparent double-sided materials were drawn twice (back, then front) and flagged needsUpdate both times:
 // 8,272 program re-setups in 60 frames. One pass is visually identical for our additive glows/rings.
 var rbd=r.renderBufferDirect;
 // Units outside the camera frustum: no animation, no scene-graph walk. They come back the frame they re-enter.
 var T=window.THREE,fr=new T.Frustum(),pm=new T.Matrix4(),sp=new T.Sphere(),frNo=-1;
 // Selective rebuild: remember which model files a unit asked for and did not get; rebuild just that unit when one arrives.
 var cur=null,_mg=mdlGet;
 mdlGet=function(f){var c=_mg(f);if(!c&&cur)(cur._miss||(cur._miss={}))[f]=1;return c;};
 // The recorder must be the OUTERMOST build layer (index.html adds its own model layer lazily on the first step), so it is
 // re-applied on top whenever someone else wrapped build after us; units built before that are rebuilt once.
 var myBuild=null;
 var ensureBuild=function(){if(R3.build===myBuild)return;var inner=R3.build;
  myBuild=function(u,ch,rel){var h={},prev=cur;cur=h;var e;try{e=inner.call(this,u,ch,rel);}finally{cur=prev;}if(e&&h._miss)e._miss=Object.assign(e._miss||{},h._miss);return e;};
  R3.build=myBuild;try{R3.units.forEach(function(e){if(!e._miss&&!e.mdl)e.key='~';});}catch(er){}};
 ensureBuild();var _stB=step;step=function(dt){try{if(R3.ready)ensureBuild();}catch(er){}return _stB(dt);};
 var _su=R3.syncUnits,lastV=-1;
 R3.syncUnits=function(dt,now){
  if(this._mver!==lastV){lastV=this._mver;this.units.forEach(function(e){if(!e._miss)return;for(var f in e._miss){var c=MC[f];if(c&&c.st==='ok'){e.key='~';break;}}});}
  return _su.call(this,dt,now);};
 // Freed hand effects (beam saber, palm orb, blade) are parented to the scene; when a unit view was rebuilt the old
 // ones stayed at the spawn point as "weapon scrap". Remove them with their owner, and sweep any that lost their owner.
 var _mc=mechFXCleanup;
 mechFXCleanup=function(e){try{var fx=e&&e.mfx;if(fx){['saber','saber2','orb','blade','blade2'].forEach(function(k){var o=fx[k];if(o&&o.parent&&o.userData&&o.userData.freed)o.parent.remove(o);});}
   var g=e&&e.grip;if(g)for(var k in g){var o=g[k];if(o&&o.isObject3D&&o.parent===R3.scene)R3.scene.remove(o);}}catch(er){}return _mc(e);};
 setInterval(function(){try{if(!G||!R3.scene)return;var live=new Set();R3.units.forEach(function(e){var fx=e.mfx;if(fx)['saber','saber2','orb','blade','blade2'].forEach(function(k){if(fx[k])live.add(fx[k]);});});
   var kill=[];R3.scene.children.forEach(function(o){if(o.userData&&o.userData.freed&&!live.has(o))kill.push(o);});kill.forEach(function(o){R3.scene.remove(o);});X.swept=(X.swept||0)+kill.length;}catch(er){}},700);
 // Fog-zone sprites were 500-unit purple/teal billboards at 40% opacity: from the top-down camera they read as big
 // translucent pink plates over the battlefield. Keep the zone readable (ground patch stays) but make the haze faint.
 setInterval(function(){try{var f=R3.fogSpr;if(!f)return;for(var i=0;i<f.length;i++){var m=f[i].material;if(m&&m.opacity>.13)m.opacity=.13;}}catch(er){}},1500);
 // ---- terrain maps (maps/맵_목록.md): the baked colour + relief texture becomes the ground of the matching dungeon / battlefield / chapter,
 //      and each map gets its own light and haze colour. The ground stays flat for the simulation; the relief is shading + a normal map.
 var TLIGHT={sq_ruin:[0xffe6c8,0x6e665c],sq_arena:[0xff9c6c,0x3c1612],sq_ice:[0xdcedff,0x8cb2d6],s01:[0xffe9d0,0x5c6470],s02:[0xffa474,0x42221c],s03:[0xdcedff,0x8cb2d6],
  s04:[0xfff0c0,0x8a7c54],s05:[0xd4c4ff,0x4a4468],s06:[0xd2b4ff,0x2c1a44],s07:[0xffc48c,0x7c4232],s08:[0xc8f0ff,0x3c5c6c],s09:[0xdcffc8,0x3a5a3c],s10:[0xffd0a0,0x5c4232]};
 var FIELD={h1:'s01',h3:'s02',h4:'s03',h5:'s04',h6:'s05',h7:'s06',rift:'s06',h8:'s08',h9:'s09',h10:'s10'},EPI={e_p:'s01',e0:'s01',e2:'s02',e3:'s03',e4:'s04',e5:'s05',e6:'s06'};
 var terrKey=X.terrKey=function(){if(!G||!MAP||MAP.space)return null;var id=MAP.id;if(id==='sq_ruin'||id==='sq_arena'||id==='sq_ice')return id;var q=G.rpg;
  if(q){var o=q.obj;if(o&&(o.k==='squad'||o.k==='duel'))return null;if(o&&o.k==='field')return FIELD[o.zone]||null;return EPI[q.epi]||null;}return id==='dune'?'s07':null;};
 var TC={},MCACHE={};
 var tload=function(f,srgb){if(TC[f])return TC[f];var t=new T.TextureLoader().load('bg/terrain/'+f+'.jpg?v=371');if(srgb)t.colorSpace=T.SRGBColorSpace;try{t.anisotropy=R3.r.capabilities.getMaxAnisotropy();}catch(e){}TC[f]=t;return t;};
 var terrApply=function(){var key=terrKey();if(!key||!R3.envG)return;var ground=null,ch=R3.envG.children;
  for(var i=0;i<ch.length;i++){var o=ch[i],g=o.geometry;if(o.isMesh&&g&&g.type==='PlaneGeometry'&&Math.abs(g.parameters.width-WW)<1&&Math.abs(g.parameters.height-WH)<1){ground=o;break;}}
  if(!ground)return;
  // the ground outside the playfield takes the edge colour of the terrain picture, so there is no seam at the border
  var tx=TC[key];if(tx&&tx.image&&tx.image.width&&R3.envG.userData.o348!==key){R3.envG.userData.o348=key;try{var cv=document.createElement('canvas');cv.width=cv.height=24;var c2=cv.getContext('2d');c2.drawImage(tx.image,0,0,24,24);var d=c2.getImageData(0,0,24,24).data,r=0,gg=0,b=0,n=0;
    for(var py=0;py<24;py++)for(var px=0;px<24;px++){if(px>1&&px<22&&py>1&&py<22)continue;var q=(py*24+px)*4;r+=d[q];gg+=d[q+1];b+=d[q+2];n++;}
    var col=new T.Color(r/n/255,gg/n/255,b/n/255);col.convertSRGBToLinear();for(var j=0;j<ch.length;j++){var o2=ch[j],g2=o2.geometry;if(o2.isMesh&&g2&&g2.type==='PlaneGeometry'&&g2.parameters.width>=40000){o2.material=new T.MeshStandardMaterial({color:col,roughness:1,metalness:0});}}}catch(e){}}
  if(ground.material&&ground.material.userData&&ground.material.userData.t348===key)return;
  var old=ground.material,det=old&&!Array.isArray(old)&&old.map&&old.map.image?old.map:null,mk=key+'|'+(det?det.uuid:'-'),mat=MCACHE[mk];
  if(!mat){mat=new T.MeshStandardMaterial({map:tload(key,true),normalMap:tload(key+'_n',false),roughness:.94,metalness:0});mat.normalScale.set(.9,.9);
   if(det){mat.onBeforeCompile=function(sh){sh.uniforms.uDet={value:det};
     sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP8;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvWP8=(modelMatrix*vec4(transformed,1.)).xyz;');
     sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP8;uniform sampler2D uDet;').replace('#include <map_fragment>','#include <map_fragment>\n{vec3 d8=texture2D(uDet,vWP8.xz/300.).rgb;diffuseColor.rgb*=.90+.22*dot(d8,vec3(.333));} /* fine grain only: the map picture itself must stay readable */');};
    mat.customProgramCacheKey=function(){return 'terr348b';};}
   mat.userData.t348=key;MCACHE[mk]=mat;}
  ground.material=mat;ground.receiveShadow=true;X.terr=key;
  var L=TLIGHT[key];if(L){try{if(R3.sun)R3.sun.color.setHex(L[0]);if(R3.scene.fog)R3.scene.fog.color.setHex(L[1]);if(R3.hemi&&R3.hemi.groundColor)R3.hemi.groundColor.setHex(L[1]);}catch(e){}}};
 // Small dungeon maps have a clear floor: trees, crystals, boulders, crates and their blob shadows inside the playfield are
 // taken out of the scene (removed, not hidden, so their collision circles go too). Base buildings and the rim scenery stay.
 var clearFloor=function(){if(!G||!MAP||!/^sq_/.test(MAP.id||'')||!R3.envG)return;
  // v3.48b: a dungeon is an arena, not a battlefield - no home base, no capture points, no buildings, no rocks, no scenery.
  // Game side: obstacle circles and cover walls are emptied once per match. Visual side: everything in the environment group
  // except the ground planes, the far mountain ring and the lights is removed (props arrive late, so this repeats for 15 s).
  if(G._clr8!==1){G._clr8=1;try{if(typeof ROCKS!=='undefined'){ROCKS.length=0;buildRockGrid();}if(typeof COVERS!=='undefined')COVERS.length=0;}catch(e){}
   try{(G.structs||[]).forEach(function(s){s.dead=true;s.hp=0;});}catch(e){}}
  var ch=R3.envG.children,kill=[];
  for(var i=0;i<ch.length;i++){var o=ch[i],g=o.geometry;if(o.isLight||(o.isMesh&&g&&g.type==='PlaneGeometry'&&g.parameters.width>=WW-1))continue;kill.push(o);}
  for(var j=0;j<kill.length;j++)R3.envG.remove(kill[j]);
  try{if(R3.mg)R3.mg.children.slice().forEach(function(c){R3.mg.remove(c);});}catch(e){}
  try{R3.scene.children.slice().forEach(function(c){if(c.userData&&c.userData.__merged)R3.scene.remove(c);});}catch(e){}
  try{var hideO=function(v,d){if(!v||d>2)return;if(v.isObject3D){v.visible=false;return;}if(Array.isArray(v)){v.forEach(function(x){hideO(x,d+1);});return;}if(typeof v==='object')for(var k in v)hideO(v[k],d+1);};hideO(R3.pts,0);}catch(e){}
  X.floorCleared=(X.floorCleared||0)+kill.length;};
 X.clearFloor=clearFloor;
 var _stF=step,clrAcc=0;step=function(dt){try{if(G&&G.t<15){clrAcc+=dt;if(G.t<1||clrAcc>.4){clrAcc=0;clearFloor();}}}catch(e){}return _stF(dt);};
 // ---- TERRAIN SURFACE FX (lib/terrainfx.js, from 엔진_지형효과) in the small dungeons ----
 // The un-graded 256 px colour map decides what the ground is at every spot (snow / ice / water / sand / rock / grass / mud).
 // Each unit near me then leaves footprints, snow puffs, splashes or dust, landings burst by ground type, the map gets a water
 // surface where it has water, and the air carries snowfall or blowing dust. Movement rules: snow -10%, shallow water -20%,
 // mud -25%; ice makes MY frame glide a little. Deep water does not block anyone in a dungeon (it counts as shallow).
 var TF={api:null,fx:null,g:null,key:null,loading:null};X.TF=TF;
 var tfxDispose=function(){try{if(TF.fx)TF.fx.dispose();}catch(e){}TF.fx=null;TF.g=null;TF.key=null;};
 var tfxEnsure=function(){if(!window.createTerrainFX||!G||G.over)return;var key=terrKey();if(!key){if(TF.fx)tfxDispose();return;}
  if(TF.g===G&&TF.fx)return;if(TF.loading===G)return;if(TF.fx)tfxDispose();
  TF.loading=G;var g0=G,dungeon=/^sq_/.test(key);
  var ld=function(src){return new Promise(function(ok,no){var im=new Image();im.onload=function(){ok(im);};im.onerror=function(){no(new Error('missing '+src));};im.src=src;});};
  Promise.all([ld('bg/terrain/'+key+'_c.png'),dungeon?null:ld('bg/terrain/'+key+'_h.png').catch(function(){return null;})]).then(function(r){try{var im=r[0],hi=r[1];if(G!==g0||G.over){TF.loading=null;return;}if(!TF.api)TF.api=window.createTerrainFX(T);var A=TF.api,S=A.SURF;
    var sm=A.SurfaceMap.fromColorMap(im,{worldW:WW,worldH:WH,originX:0,originZ:0,res:256,deepCells:6,lavaFromOrange:key==='s02'});
    if(key==='sq_ruin'){for(var q=0;q<sm.data.length;q++)if(sm.data[q]===S.GRASS)sm.data[q]=S.SAND;} // the ruined city is recoloured to dust in the game: its "grass" is dusty ground
    // WATER: the generator's colour map paints lake and river beds as sand, not blue. On the big maps the low half of a
    // sand basin (by the height map) is therefore water; the higher half stays a sandy shore. Dungeons stay dry.
    if(!dungeon&&hi&&MAP.id!=='dune'){var cv=document.createElement('canvas');cv.width=cv.height=256;var c2=cv.getContext('2d',{willReadFrequently:true});c2.drawImage(hi,0,0,256,256);var hd=c2.getImageData(0,0,256,256).data,n=0,sum=0,all=[];
     for(var k=0;k<65536;k++){all.push(hd[k*4]);if(sm.data[k]===S.SAND){n++;sum+=hd[k*4];}}
     var frac=n/65536;all.sort(function(a,b){return a-b;});var med=all[32768],mean=n?sum/n:255;
     if(frac>.02&&frac<.6&&mean<med-4){for(var k2=0;k2<65536;k2++)if(sm.data[k2]===S.SAND&&hd[k2*4]<mean)sm.data[k2]=S.WATER_SHALLOW;
      // bases and capture points stay on dry ground
      var dry=function(x,z,r){var cw=WW/256,chh=WH/256;for(var j=Math.max(0,Math.floor((z-r)/chh));j<Math.min(256,Math.ceil((z+r)/chh));j++)for(var i=Math.max(0,Math.floor((x-r)/cw));i<Math.min(256,Math.ceil((x+r)/cw));i++){var cx=(i+.5)*cw-x,cz=(j+.5)*chh-z,q2=j*256+i;if(cx*cx+cz*cz<r*r&&(sm.data[q2]===S.WATER_SHALLOW||sm.data[q2]===S.WATER_DEEP))sm.data[q2]=S.SAND;}};
      try{for(var b=0;b<BASES.length;b++)dry(BASES[b].x,BASES[b].y,560);(G.pts||[]).forEach(function(p){dry(p.x,p.y,300);});}catch(e){}
      sm.computeDepth(6);}}
    var fx=new A.TerrainFX({scene:R3.scene,camera:R3.cam,map:sm,unitScale:.9,quality:window.__phone?'low':'high',printLife:1.0,maxParticles:window.__phone?450:900,maxDecals:window.__phone?120:240}); /* small fixed pools: 3 draw calls (+1 for water), nothing is created after this */
    var st=sm.stats();if(st.water_shallow||st.water_deep){fx.addWater({level:1.4,opacity:.82});var Lc=TLIGHT[key];fx.setSky({zenith:0x4f86d1,horizon:Lc?Lc[1]:0xdcebf7,sunDir:{x:.4,y:.8,z:.3}});}
    var amb={sq_ice:['snowfall',32],s03:['snowfall',32],s06:['snowfall',14],s07:['desertWind',10],s10:['desertWind',8],sq_arena:['desertWind',9],sq_ruin:['desertWind',9]}[key]; /* ambience is a hint, not a weather show */if(amb)fx.setAmbient(amb[0],{rate:amb[1]});
    TF.fx=fx;TF.g=g0;TF.key=key;TF.stats=st;TF.loading=null;X.tfx=(X.tfx||0)+1;}catch(e){TF.loading=null;X.err.length<8&&X.err.push('tfx:'+String(e).slice(0,160));}}).catch(function(e){TF.loading=null;X.err.length<8&&X.err.push('tfx:'+String(e).slice(0,120));});};
 var _stT=step;step=function(dt){var meU=G&&G.local&&G.local.unit,pvx=meU?meU.vx:0,pvy=meU?meU.vy:0;_stT(dt);
  try{if(!G||!G.local){if(TF.fx)tfxDispose();return;}tfxEnsure();var fx=TF.fx;if(!fx||TF.g!==G)return;var me=G.local.unit,fxp=me||{x:WW/2,y:WH/2},us=G.units;
   for(var i=0;i<us.length;i++){var u=us[i];if(u.dead||u.layer!==0||u.drone||(u!==me&&(u.r||0)<18))continue; /* infantry leave no marks: dozens of tiny puffs only cluttered the picture */var dx=u.x-fxp.x,dy=u.y-fxp.y;if(dx*dx+dy*dy>1300*1300)continue;
    var e=R3.units.get(u.id),air=!!u.fly||(e&&e.root&&e.root.position.y-(unitH(u)||0)>28);
    var r=fx.step(u.id,{x:u.x,z:u.y,vx:u.vx||0,vz:u.vy||0,size:Math.min(34,u.r||12),dash:(u.dashT||0)>0||!!u.lunge,airborne:air,hover:false},dt);
    if(u.st&&u.st.spd){var m=r.surface===2?.7:(r.speedMul||1),pm=u.__tm8||1;if(m!==pm){u.st.spd=u.st.spd/pm*m;u.__tm8=m;}}
    if(u===me&&r.slide>0&&!air){var k=r.slide*.55;u.vx=pvx*k+(u.vx||0)*(1-k);u.vy=pvy*k+(u.vy||0)*(1-k);}}
   fx.setFocus(fxp.x,fxp.y,900);fx.update(dt);}catch(e){X.err.length<8&&X.err.push('tfxStep:'+String(e).slice(0,160));}};
 X.terrApply=terrApply;
 setInterval(function(){try{if(G&&!G.over)terrApply();}catch(e){X.err.length<6&&X.err.push('terr:'+String(e).slice(0,160));}},400);
 var _an=R3.animate;
 R3.animate=function(e,u,dt,now){
  if(frNo!==this.fno){frNo=this.fno;this.cam.updateMatrixWorld();pm.multiplyMatrices(this.cam.projectionMatrix,this.cam.matrixWorldInverse);fr.setFromProjectionMatrix(pm);}
  var me=G&&G.local&&G.local.unit;
  if(u!==me&&!u.boss){sp.center.copy(e.root.position);sp.center.y+=40;sp.radius=(u.r||20)*4+170;
   if(!fr.intersectsSphere(sp)){e.root.visible=false;e._off=(e._off||0)+dt;X.culled=(X.culled||0)+1;return;}
   if(e._off){dt=Math.min(.1,dt+e._off);e._off=0;}}
  // My own frame never blinks out: skills grant short protection through the respawn-protection timer, which made the body
  // flash invisible 5 times a second — with auto battle chaining skills the frame looked gone.
  if(u===me&&!u.dead)e.root.visible=true;
  cur=e;try{var rr=_an.call(this,e,u,dt,now);if(u.fbs)bossMotion(e,u,now);if(u===me)whipTick(e,u,dt,now);
   // DUNGEON ENTRANCE (3.2 s, real time). The fight is held in slow motion and the stage clock stays at 0 while it plays:
   //  0.0-1.3 s  my frame swoops in from behind in its flight form, high and fast
   //  1.3-2.2 s  it unfolds into the robot in mid-air while it drops (transform engine pose, driven here)
   //  2.2 s      it lands: dust ring, debris, camera jolt, thump
   //  1.6-3.2 s  the squad comes down one after another around it, each with its own landing burst
   if(me&&u.team===me.team&&MAP&&!MAP.space&&G._intDone!==1&&!G.client&&((G.rpg&&/^sq_/.test(MAP.id||''))||u===me)){ /* v3.64: every battlefield opens with this entrance (squad dungeons also bring the squad in) */var pn=performance.now()/1000;if(G._intPN==null){G._intPN=pn;G._intClk=pn;G._intR0=pn;}G._intClk+=Math.min(.1,Math.max(0,pn-G._intPN));G._intPN=pn;var nowR=G._intClk;if(pn-G._intR0>12){G._intDone=1;G.hstop=0;} /* v3.72: the entrance runs on its own clock (at most 0.1 s per frame) so a loading stall no longer skips the fly-in and the mid-air transformation */
    if(G._int0==null){if(G.t>.25&&u===me&&(e.mdl||G.t>1.2)){G._int0=nowR;G._intN=0;}else if(G.t<4){e.root.position.y+=900;}else{G._intDone=1;}} /* v3.66b: frames whose model path has no e.mdl were parked 900 up for good (invisible) - start anyway, never hold past 4 s */
    if(G._int0!=null){var p=nowR-G._int0;if(p>6){G._intDone=1;G.hstop=0;}G.hstop=Math.max(G.hstop||0,.25);if(G.rpg){G.rpg.sqT=0;G.rpg.sqT0=G.t;}
     var ez=function(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
     if(u===me){var a0=(u.aa!=null?u.aa:(u.a||0)),fl=1-ez(p/2.2),hgt=fl*fl*420+(p<2.2?Math.sin(Math.min(1,p/2.2)*Math.PI)*60:0);
      e.root.position.x-=Math.cos(a0)*fl*620;e.root.position.z-=Math.sin(a0)*fl*620;e.root.position.y+=hgt;
      if(u.cls==='arkframe'){if(p<1.3)u.tf={mode:'hold',k:1,mark:-1};else if(p<2.2)u.tf={mode:'hold',k:1-ez((p-1.3)/.9),mark:-1};else if(!u.__intL){u.tf={mode:'robot',k:0};}}
      if(p<2.2&&Math.random()<.7)part(e.root.position.x,e.root.position.z,-Math.cos(a0)*200,-Math.sin(a0)*200,.35,Math.random()<.5?'#ffd2a0':'#ffffff',6,e.root.position.y+20);
      if(p>=2.2&&!u.__intL){u.__intL=1;for(var q=0;q<40;q++){var b=Math.random()*6.283,s=140+Math.random()*420;part(u.x,u.y,Math.cos(b)*s,Math.sin(b)*s,.6,q%3?'#d8c8b0':'#ffffff',8,6+Math.random()*30);}
       G.parts.push({x:u.x,y:u.y,vx:0,vy:0,l:.5,ml:.5,c:'ring',s:260});G.parts.push({x:u.x,y:u.y,vx:0,vy:0,l:.7,ml:.7,c:'ring',s:420});G.shake=Math.max(G.shake||0,18);try{window.__AX.SFX2.thump();}catch(er){}try{SFX.noise(.5,.5,120);}catch(er){}}}
     else{if(u.__ei==null)u.__ei=++G._intN;var st0=1.5+Math.min(5,u.__ei)*.26,k=Math.max(0,Math.min(1,(p-st0)/.7));
      if(k<1)e.root.position.y+=(1-k*k)*820;
      else if(!e._ld8){e._ld8=1;for(var q2=0;q2<14;q2++){var b2=Math.random()*6.283;part(u.x,u.y,Math.cos(b2)*240,Math.sin(b2)*240,.45,q2%2?'#d8c8b0':'#ffffff',7,6);}G.parts.push({x:u.x,y:u.y,vx:0,vy:0,l:.35,ml:.35,c:'ring',s:(u.r||20)*4});G.shake=Math.max(G.shake||0,5);try{window.__AX.SFX2.thump();}catch(er){}}}
     if(p>3.3){G._intDone=1;G.hstop=0;X.intro=(X.intro||0)+1;}}}
   return rr;}finally{cur=null;}};
 // ENERGY WHIP: the whip had no body, only an arc flash. It is now a chain of 14 light beads from the weapon hand — it hangs
 // in a loose curl at rest, and on a swing the tip lashes out along the swing arc with the beads trailing behind it.
 var WHP=null;
 function whipTick(e,u,dt,now){var on=u.melSub==='whip'&&!u.dead&&e.mdl&&e.root.visible;
  if(!on){if(WHP)WHP.g.visible=false;return;}
  if(!WHP){WHP={g:new T.Group(),s:[],p:[],k:0};var tex=(typeof glowTex==='function')?glowTex():null;for(var i=0;i<14;i++){var sp=new T.Sprite(new T.SpriteMaterial({map:tex,color:i%3?0xff5a98:0xffd0e4,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false}));sp.userData.keep=1;WHP.g.add(sp);WHP.s.push(sp);WHP.p.push(new T.Vector3());}WHP.g.userData.keep=1;WHP.g.userData.core=1;}
  if(WHP.g.parent!==R3.scene)R3.scene.add(WHP.g);WHP.g.visible=true;
  var B=null;try{B=window.__AX&&window.__AX.motBones(e.mdl);}catch(er){}var hand=new T.Vector3();if(B&&B.RightHand)B.RightHand.getWorldPosition(hand);else hand.set(u.x,(window.__AX.unitH(u)||0)+50,u.y);
  var sw=u.melSw2||u.melSw,act=sw&&sw.T>0&&sw.t<sw.T,ph=act?Math.min(1,sw.t/sw.T):0;WHP.k+=((act?1:0)-WHP.k)*Math.min(1,dt*(act?22:7));var k=WHP.k;
  var a=u.aa!=null?u.aa:(u.a||0),dir=(sw&&sw.dir<0)?-1:1,len=250,ang=a+dir*(1.15-2.3*(ph*ph*(3-2*ph))),hy=hand.y;
  // tip target: on the swing arc when lashing, a short droop beside the frame at rest
  var tipX=hand.x+Math.cos(ang)*len*k+Math.cos(a+1.9)*26*(1-k),tipZ=hand.z+Math.sin(ang)*len*k+Math.sin(a+1.9)*26*(1-k),tipY=hy*(1-k)*.12+ (hy-18)*k;
  for(var i=0;i<14;i++){var f=(i+1)/14,lag=act?(1-f)*.5*dir:0,aa=ang+lag*(1-ph),r=len*f*k;
   var tx=hand.x+(tipX-hand.x)*f*(1-k)+(Math.cos(aa)*r)*1,tz=hand.z+(tipZ-hand.z)*f*(1-k)+(Math.sin(aa)*r)*1;
   var ty=hy+(tipY-hy)*f - Math.sin(Math.PI*f)*(k>0.5?10:22)*(1-k*.6) + (act?Math.sin(f*9-now*30)*5*k:Math.sin(now*2+f*5)*2);
   var p=WHP.p[i];if(WHP.init){p.x+=(tx-p.x)*Math.min(1,dt*(26-i));p.y+=(ty-p.y)*Math.min(1,dt*(26-i));p.z+=(tz-p.z)*Math.min(1,dt*(26-i));}else p.set(tx,ty,tz);
   var s=WHP.s[i];s.position.copy(p);var sz=(9-f*5)*(1+k*.7);s.scale.set(sz,sz,1);s.material.opacity=(.5+.45*k)*(1-f*.35);}
  WHP.init=1;}
 // Bosses without a skeleton (beasts, serpents, tanks, golems — Meshy only rigs humanoids) are moved by code: they breathe and
 // sway while idle, lean and bob when they walk, and each skill has a wind-up and a strike (rear up and slam, crouch and
 // charge, spin, roar, sink into the ground and burst out, three lunging bites…). The old code only did this for rigged models.
 function bossMotion(e,u,now){var m=e.mdl;if(!m||m.mx||!m.obj)return;var o=m.obj,b=o.userData.__b8||(o.userData.__b8={y:o.position.y,rx:o.rotation.x,ry:o.rotation.y,rz:o.rotation.z,s:o.scale.x});
  var H=(u.r||40)*2.4,S=u.fbs,lift=0,pitch=0,spin=0,roll=0,sc=1,ez=function(x){return x*x*(3-2*x);},ph=(u.id||0)*1.7;
  var sp=Math.hypot(u.vx||0,u.vy||0),mv=Math.min(1,sp/90);
  sc=1+.014*Math.sin(now*1.7+ph);roll=.028*Math.sin(now*1.15+ph)*(1-mv*.5);lift=Math.abs(Math.sin(now*4.6+ph))*H*.025*mv;pitch=.06*mv+.012*Math.sin(now*.9+ph);
  if(S&&S.cur){var T={bite3:[.7,1.25],slam:[1,.35],charge:[.75,.45],spin:[.5,1.3],roar:[.9,.4],fan:[.8,.5],burrow:[.8,1.6],meteor:[.9,.6],nova:[1.8,.4],starfall:[1,1.6]}[S.cur]||[.8,.5],w=T[0],a=T[1],t=S.t||0,p=Math.min(1,t/w),q=t>w?Math.min(1,(t-w)/a):0,c=S.cur;
   if(c==='slam'){if(t<w){pitch=-.42*ez(p);lift=H*.22*ez(p);}else{pitch=-.42+.72*Math.min(1,q*5)-.3*Math.max(0,q*5-1)/4;lift=H*.22*(1-Math.min(1,q*5));}}
   else if(c==='charge'){if(t<w){pitch=.24*ez(p);lift=-H*.06*ez(p);sc*=1-.04*ez(p);}else{pitch=.24*(1-q);roll=.1*Math.sin(now*30)*(1-q);}}
   else if(c==='spin'){spin=t<w?-.4*ez(p):-.4+Math.PI*4*ez(q);lift=H*.05*Math.sin(Math.PI*q);}
   else if(c==='roar'){var k=Math.sin(Math.PI*Math.min(1,t/(w+a)));pitch=-.3*k;sc*=1+.12*k;roll=.05*Math.sin(now*26)*k;}
   else if(c==='fan'||c==='meteor'||c==='starfall'){pitch=t<w?-.28*ez(p):-.28*(1-q);lift=H*.08*(t<w?ez(p):1-q);}
   else if(c==='burrow'){if(t<w)lift=-H*1.1*ez(p);else if(!S.moved)lift=-H*1.1;else{var r=Math.min(1,(t-w-.9)/.35);lift=-H*1.1+H*1.4*ez(Math.max(0,r))-H*.3*Math.max(0,r-.8)*5;}}
   else if(c==='nova'){sc*=1+.18*ez(p)-(t>w?.18*q:0);lift=H*.15*ez(p)*(t>w?1-q:1);roll=.04*Math.sin(now*34)*p;}
   else if(c==='bite3'){if(t<w){pitch=-.2*ez(p);}else{var bt=(t-w)/.4,fr=bt-Math.floor(bt),on=bt<3?Math.sin(Math.PI*Math.min(1,fr*1.6)):0;pitch=-.2*(1-Math.min(1,bt/3))+.5*on;lift=-H*.05*on;spin=(Math.floor(Math.min(2,bt))-1)*.38*(bt<3?1:0);}}}
  o.position.y=b.y+lift;o.rotation.x=b.rx+pitch;o.rotation.y=b.ry+spin;o.rotation.z=b.rz+roll;o.scale.setScalar(b.s*sc);}
 // the swarm's real model is fetched up front, so the horde never shows as placeholder cones
 try{mdlGet('zling_sw');}catch(e){}
 r.renderBufferDirect=function(cam,scene,geo,mat,obj,grp){if(mat&&mat.transparent===true&&mat.forceSinglePass===false)mat.forceSinglePass=true; /* (three flips side to Back/Front while it double-draws, so side cannot be tested here) */return rbd.call(this,cam,scene,geo,mat,obj,grp);};
});
})();
