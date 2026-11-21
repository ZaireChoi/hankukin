/* ASCEND v3.48 — field hunting: pilots of other factions and the engagement settings (loaded after lib/ascend_boss.js)
   The hunting grounds had only my side and monsters, so the PVP settings had nothing to act on. Two pilots of other
   factions (AI for now; real players need the online field server) hunt in the same ground. They are neutral - they
   hunt monsters beside you - until a fight starts:
   · PVP off (default): they never turn on you and you cannot fight them.
   · PVP on: they may ambush you now and then, and you can start a fight by firing at one (mouse / fire button).
     counter - auto battle answers only a pilot that has hit me, and stays on that pilot
     manual  - auto battle never picks a pilot; only the one I fired at
     first   - any pilot of another faction in sight is attacked at once
     guard   - auto battle answers a pilot that has hit me or anyone on my side
   Settings: window.__fld() -> {pvp, st} (lib/ascend_boss.js). Hooks: window.__rvSkip(e) for the auto battle. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var R=function(){var a=window.__A;return a&&a.R?a.R():null;};
var fld=function(){return window.__fld?window.__fld():{pvp:false,st:'counter'};};
var NAMES=[[L('제국','Empire'),'Kael'],[L('오메가','Omega'),'Rhea'],[L('제국','Empire'),'Vex'],[L('알파','Alpha'),'Dorn']];
var MODELS=['m_striker','m_phantom','m_artillery','m_ranger'];
var STN={counter:L('반격','Counter'),manual:L('직접 지정','Manual'),first:L('선제 공격','Strike first'),guard:L('진영 방어','Defend faction')};
var COUNT=2,S=null;
var inField=function(){return typeof G!=='undefined'&&G&&!G.over&&G.rpg&&G.rpg.obj&&G.rpg.obj.k==='field'&&G.local&&G.local.unit;};
var setTeam=function(u,t){u.team=t;if(u.slot)u.slot.team=t;};
var say=function(ic,a,b,col){try{announce(ic,a,b,true,col);}catch(e){}};
var spawn=function(i){var me=G.local.unit,ang=Math.random()*6.28,d=700+Math.random()*500,m=MODELS[(i+((S&&S.seed)||0))%MODELS.length],key='rv_'+m,H=80;
 try{H=(MDL.arkframe&&MDL.arkframe[2])||80;}catch(e){}
 window.MONMDL=window.MONMDL||{};window.MONMDL[key]=[m,Math.PI/2,H,'h'];
 var u=invSpawn('arkframe',me.x+Math.cos(ang)*d,me.y+Math.sin(ang)*d,1e9);if(!u)return null;
 var N=NAMES[(i+((S&&S.seed)||0))%NAMES.length];u.mon=key;u.rival=1;u.slot.name='['+N[0]+'] '+N[1];u.rvName=u.slot.name;
 var pk=1;try{pk=Math.max(1,X.cp()/X.recCP(Math.max(5,(R()||{}).lv||1)));}catch(e){}u.mhp=Math.round((me.mhp||1000)*2.5*pk);   /* follows my combat power: a heavily geared pilot dropped a 2.5x rival in under 6 s */   /* at 0.8 a hostile pilot fell in 8 s to my side's infantry without landing a hit */u.hp=u.mhp;setTeam(u,0);u.rvHost=0;u.rvHit=0;u.rvAlly=0;u.rvMark=0;u.rvAmb=G.t+40+Math.random()*50;return u;};
var hostile=function(u,mine){setTeam(u,1);u.rvHost=1;u.rvHit=0;u.rvAlly=0;u.rvMark=mine?1:0;u.rvFar=0;u.fbd={sk:['charge','fan','spin'],col:'#ff5a5a'};u.fbdMul=.8;
 say('⚔',u.rvName,mine?L('교전 개시','Engaging'):L('다른 진영 파일럿이 공격해 옵니다','A pilot of another faction is attacking'),'#ff6b6b');};
var calm=function(u){setTeam(u,0);u.rvHost=0;u.rvMark=0;u.rvHit=0;u.rvAlly=0;try{delete u.fbd;}catch(e){}u.rvAmb=G.t+60+Math.random()*60;};
// firing at a neutral pilot (mouse button / fire button held, aim within about 14 degrees, inside 700) starts the fight
var firedAt=function(u,me,d){try{if(d>700||typeof mouse==='undefined'||!mouse.l)return false;var aim=G.local.input&&G.local.input.aim;if(aim==null)return false;var a=Math.atan2(u.y-me.y,u.x-me.x),df=Math.abs(Math.atan2(Math.sin(a-aim),Math.cos(a-aim)));return df<.25;}catch(e){return false;}};
var hud=function(on){var h=document.getElementById('rvHud');if(!on){if(h)h.remove();return;}var f=fld(),t=f.pvp?'PVP ON · '+STN[f.st]:'PVP OFF';
 if(!h){h=document.createElement('div');h.id='rvHud';h.style.cssText='position:fixed;right:10px;top:150px;z-index:40;pointer-events:none;font:700 11px "Noto Sans KR",sans-serif;padding:3px 9px;border-radius:10px;background:rgba(0,0,0,.4)';document.body.appendChild(h);}
 if(h.dataset.t!==t){h.dataset.t=t;h.textContent=t;h.style.color=f.pvp?'#ff9b9b':'#9fb6cf';h.style.border='1px solid '+(f.pvp?'rgba(255,107,107,.45)':'rgba(255,255,255,.14)');}};
// the hunting status box (zone · level % · kills · EXP · time) is gone: only the zone name stays, small, top left.
// The time left is shown there for the last minute only.
var rh0=null,loc=function(on){var h=document.getElementById('rvLoc');if(!on){if(h)h.remove();return;}var t='';try{t=String(rh0?rh0():'').split(' · ')[0];var left=Math.max(0,Math.ceil(G.tLimit-((G.rpg&&G.rpg.t)||0)));if(left<=60)t+=' · '+left+L('초','s');}catch(e){}
 if(!h){h=document.createElement('div');h.id='rvLoc';h.style.cssText='position:fixed;left:8px;top:6px;z-index:40;pointer-events:none;font:700 11px "Noto Sans KR",sans-serif;letter-spacing:.02em;color:#cfe0f2;text-shadow:0 1px 3px #000;opacity:.85';document.body.appendChild(h);}if(h.textContent!==t)h.textContent=t;};
var tick=function(){if(!rh0&&window.__rpgHud&&!window.__rpgHud.__rv){rh0=window.__rpgHud;var w=function(){try{var X0=G&&G.rpg;if(X0&&X0.obj&&X0.obj.k==='field')return '';}catch(e){}return rh0.apply(this,arguments);};w.__rv=1;window.__rpgHud=w;}
 if(!inField()){S=null;hud(false);loc(false);return;}hud(true);loc(true);
 if(!S||S.g!==G)S={g:G,rv:[],resp:[],t0:G.t,seed:(Math.random()*4)|0,kills:0};
 var f=fld(),me=G.local.unit;
 for(var i=0;i<COUNT;i++){var u=S.rv[i];
  if(!u){if(G.t>(S.resp[i]!=null?S.resp[i]:S.t0+15)){S.rv[i]=spawn(i);if(!S.rv[i])S.resp[i]=G.t+30;}continue;}
  if(u.dead){if(u.rvHost){S.kills++;var r=R();if(r){r.shards=(r.shards||0)+30;try{window.__A.saveP();}catch(e){}}say('★',u.rvName,L('격파 · 금화 +30','Defeated · gold +30'),'#cfe0f2');}S.rv[i]=null;S.resp[i]=G.t+60;continue;}
  var d=Math.hypot(u.x-me.x,u.y-me.y);
  if(!f.pvp){if(u.rvHost)calm(u);continue;}
  if(!u.rvHost){if(me.dead)continue;if(f.st==='first'&&d<900)hostile(u,true);else if(firedAt(u,me,d))hostile(u,true);else if(G.t>u.rvAmb&&d<800)hostile(u,false);}
  else{if(d>1700||me.dead){u.rvFar=(u.rvFar||0)+.25;if(u.rvFar>(me.dead?4:20))calm(u);}else u.rvFar=0;}}};
// which pilots the auto battle leaves alone
window.__rvSkip=function(e){if(!e||!e.rival)return false;if(!e.rvHost)return true;if(e.rvMark)return false;var st=fld().st;if(st==='first')return false;if(st==='manual')return true;if(st==='counter')return !e.rvHit;if(st==='guard')return !(e.rvHit||e.rvAlly);return false;};
X.rvState=function(){return S?{kills:S.kills,rv:S.rv.map(function(u){return u?{n:u.rvName,team:u.team,host:u.rvHost,hit:u.rvHit,ally:u.rvAlly,mark:u.rvMark,hp:Math.round(100*u.hp/u.mhp),dead:!!u.dead}:null;})}:null;};
X.rvForce=function(i){if(S&&S.rv[i]&&!S.rv[i].rvHost)hostile(S.rv[i],false);};   // test hook: make pilot i ambush now
guard('field',function(){
 // remember who a hostile pilot has hit: me, or someone on my side
 var _h=hurt;hurt=function(u,amt,src,ang,dt){try{var su=src&&(src.unit||src);if(su&&su.rival&&su.rvHost&&u&&G&&G.local){if(u===G.local.unit)su.rvHit=1;else if(u.team===G.local.team)su.rvAlly=1;}}catch(e){}return _h.apply(this,arguments);};
 // the built-in auto aim skips the pilots the rule says to leave alone (they are hidden from it for the one call)
 var _a=autoTarget;autoTarget=function(u){var hid=null;try{if(S&&G&&G.local&&u===G.local.unit){for(var i=0;i<S.rv.length;i++){var e=S.rv[i];if(e&&!e.dead&&e.rvHost&&window.__rvSkip(e)){e.dead=true;(hid=hid||[]).push(e);}}}}catch(er){}var t;try{t=_a(u);}finally{if(hid)for(var j=0;j<hid.length;j++)hid[j].dead=false;}return t;};
 setInterval(function(){guard('fieldT',tick);},250);});
})();
