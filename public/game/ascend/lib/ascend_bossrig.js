/* ASCEND v3.48 — boss motion engine hookup, TRIAL: one boss (loaded after lib/bossrig.js)
   lib/bossrig.js (the user's engine, copied unchanged from 엔진_보스모션/bossrig.js v1.0) builds a skeleton for a
   static boss model and animates it. This file puts it under the game's own boss:
   · the game still decides everything that matters - position, facing, skill timing, telegraphs, damage;
   · the engine only replaces the picture: breathing, neck sway, blinking eyes, walking, a body motion for each skill
     (started so that its strike lands when the game's windup ends), a flinch when hit.
   The engine's own telegraph / impact / move events are ignored here (the game already has them); wiring those in
   is the next step once the engine is final. Bosses listed in CFG only; window.__brOff = true turns it off. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
var CFG={
 /* the model is a four-legged, long-necked beast with a tail: as 'hydra' it got 7 bones and stood like a doll */
 raid_hydra:{o:{archetype:'quadruped',legs:4,tail:true,rigid:false,eyeColor:0xa8ffe0,name:'hydra'},map:{bite3:'slam',fan:'breath',spin:'spin',slam:'slam',roar:'roar',charge:'charge',burrow:'roar'}}
};
var HIT={slam:1.3,sweep:1.15,charge:1.6,roar:.9,stomp:1.0,grab:1.05,spin:1.2,leap:1.75,breath:1.2};   // when the engine's motion strikes
var WIND={bite3:.7,slam:1.0,charge:.75,spin:1.0,roar:.9,fan:.8,burrow:.8};                              // the game's windup per skill
var BR=null,ST={built:0,ms:0,fail:0,plays:0,last:null};
X.brStat=function(){return ST;};
var fileOf=function(u){try{var m=u.mon&&window.MONMDL&&window.MONMDL[u.mon];if(m)return m[0];if(MDL[u.cls])return MDL[u.cls][0];}catch(e){}return null;};
var build=function(e,u){var f=fileOf(u),C=f&&CFG[f];if(!C)return false;var c=MC[f];if(!c||c.st!=='ok')return null;
 var t0=performance.now();BR=BR||window.createBossRig(window.THREE);
 var a=BR.rig(c.g.scene.clone(true),C.o);
 // size (user direction 2026-11-22): a boss is about ten times a frame, so it looms over the squad. The longest side of
 // the model is set to SCALE x the frame height; the unit's body radius grows with it so attackers stop at its edge.
 var mech=80;try{mech=(MDL.arkframe&&MDL.arkframe[2])||80;}catch(er){}var SC=window.__bossScale||10,mxs=Math.max(c.size.x,c.size.y,c.size.z)||1;
 a.setHeight(c.size.y*(mech*SC/mxs));u.r=Math.max(u.r||0,mech*SC*.22);e.brBig=mech*SC;
 // the skill circles are drawn from the class radius: without this they stay the size of a frame under a giant body
 try{if(CL[u.cls]&&!CL[u.cls].__r0){CL[u.cls].__r0=CL[u.cls].r;CL[u.cls].r=Math.max(CL[u.cls].r,mech*SC*.2);}}catch(er){}
 // it must hurt: one hit takes roughly a fifth of my frame (the squad-stage damage factor is applied on top)
 try{var me0=G.local&&G.local.unit;if(me0&&!(G.rpg&&G.rpg.obj&&G.rpg.obj.zl)){var per=(me0.mhp||1000)*.2,mul=1;try{if(u.sqE&&window.__sqMul)mul=window.__sqMul(u.sqStage||1).dmg;}catch(e2){}u.hzl=Math.max(u.hzl||0,Math.round((per/mul-110)/16));}}catch(er){}
 a.root.traverse(function(o){if(o.isMesh){o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;}});   /* a body this size sat inside its own shadow and looked black */
 try{a.play('roar');}catch(er){}
 e.mdl.inner.remove(e.mdl.obj);e.mdl.inner.add(a.root);e.mdl.obj0=e.mdl.obj;e.mdl.obj=a.root;e.mdl.mx=null;
 e.brC=C;e.brHp=u.hp;e.brCur=null;ST.built++;ST.ms=Math.round(performance.now()-t0);ST.last=f;return a;};
var AHEAD=null;
var hook=function(){if(typeof R3==='undefined'||!R3||!R3.ready||!R3.animate||R3.__br||typeof window.createBossRig!=='function')return;R3.__br=1;var oa=R3.animate;
 R3.animate=function(e,u,dt,now){oa.call(this,e,u,dt,now);if(window.__brOff||!e||!e.mdl||e.brig===null)return;
  try{if(e.brig===undefined){var r=build(e,u);if(r===false){e.brig=null;return;}if(!r)return;e.brig=r;}
   var a=e.brig,S=u.fbs,cur=(S&&S.cur)||null;
   if(cur!==e.brCur){e.brCur=cur;if(cur){var nm=e.brC.map[cur];if(nm){a.action=null;if(a.play(nm)){a.actT=Math.max(0,(HIT[nm]||1)-(WIND[cur]||.8));ST.plays++;}}}}
   if(u.hp<e.brHp-u.mhp*.002)a.hit(.5);e.brHp=u.hp;
   if(S&&!S.cur&&S.cd>2.2)S.cd=2.2;   /* attacks come every 2 s or so instead of every 4-6 s */
   var sp=Math.hypot(u.vx||0,u.vy||0);AHEAD=AHEAD||new window.THREE.Vector3(0,0,1e6);a.heading=0;a.target=null;a.moveTarget=(sp>20&&!a.action)?AHEAD:null;
   a.update(Math.min(dt||.016,.05));a.root.position.x=0;a.root.position.z=0;a.heading=0;
  }catch(er){e.brig=null;ST.fail++;(X.err=X.err||[]).push('bossrig: '+String(er&&er.stack||er).slice(0,200));}};};
setInterval(function(){try{hook();}catch(e){}},500);
})();
