/* ASCEND v3.48 — "my frame vanished, only its name is left" guard (loaded after lib/ascend_bossrig.js)
   Seen 2026-11-22 in a boss fight: the unit root's height, the model wrapper's position and the Hips bone rotation of
   my frame had become NaN, so the model was drawn nowhere while the name tag stayed. One NaN is enough: the transform
   code adds a bone-based offset to the wrapper every frame, so it never recovers by itself.
   Every frame, for every unit: a non-finite root position falls back to the last good value, a non-finite wrapper
   position / scale is reset, and bones with a non-finite rotation / position return to their rest pose.
   The first cases are recorded in window.__X348.nan (what was broken, which unit fields were NaN) to find the source. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
X.nan={n:0,first:[]};
var fin=function(v){return v===v&&v!==Infinity&&v!==-Infinity;};
var okV=function(p){return fin(p.x)&&fin(p.y)&&fin(p.z);};
var note=function(what,u){X.nan.n++;if(X.nan.first.length>=6)return;var bad=[];try{for(var k in u){var v=u[k];if(typeof v==='number'&&!fin(v))bad.push(k);}}catch(e){}
 var S=null;try{S={t:Math.round(G.t*10)/10,cls:u.cls,mine:!!(G.local&&G.local.unit===u),fly:u.fly,tf:!!u.tf,fbs:u.fbs&&u.fbs.cur,stun:u.stun,dash:u.dash};}catch(e){}
 X.nan.first.push({what:what,bad:bad,s:S});};
var fixBones=function(root){var n=0;root.traverse(function(o){var q=o.quaternion,p=o.position,s=o.scale;
 if(!(fin(q.x)&&fin(q.y)&&fin(q.z)&&fin(q.w))){if(o.userData.__q0)q.copy(o.userData.__q0);else q.set(0,0,0,1);n++;}
 if(!okV(p)){if(o.userData.__p0)p.copy(o.userData.__p0);else p.set(0,0,0);n++;}
 if(!okV(s)){s.set(1,1,1);n++;}});return n;};
var remember=function(root){root.traverse(function(o){if(o.isBone&&!o.userData.__q0){o.userData.__q0=o.quaternion.clone();o.userData.__p0=o.position.clone();}});};
var hook=function(){if(typeof R3==='undefined'||!R3||!R3.ready||!R3.animate||R3.__nan)return;R3.__nan=1;var oa=R3.animate;
 R3.animate=function(e,u,dt,now){
  if(e&&e.mdl&&!e.__rest){e.__rest=1;try{remember(e.mdl.obj);}catch(er){}}
  oa.call(this,e,u,dt,now);
  try{if(!e||!e.root)return;var p=e.root.position,what=null;
   if(okV(p)){var g=e.__g||(e.__g={x:0,y:0,z:0});g.x=p.x;g.y=p.y;g.z=p.z;}
   else{var g0=e.__g||{x:fin(u.x)?u.x:0,y:0,z:fin(u.y)?u.y:0};if(!fin(p.x))p.x=g0.x;if(!fin(p.y))p.y=g0.y;if(!fin(p.z))p.z=g0.z;what='root';}
   var m=e.mdl;if(m&&m.wrap){var w=m.wrap,bad=false;
    if(!okV(w.position)){w.position.set(0,0,0);bad=true;what=(what?what+'+':'')+'wrap.pos';}
    if(!okV(w.scale)){w.scale.setScalar(fin(m._ws0)?m._ws0:1);bad=true;what=(what?what+'+':'')+'wrap.scale';}
    if(!okV(w.rotation)){w.rotation.set(0,0,0);bad=true;}
    if(bad||what||(e.__chk=(e.__chk||0)+1)%30===0){var nb=fixBones(m.wrap);if(nb&&!what)what='bones';}}
   if(what)note(what,u);
  }catch(er){}};};
setInterval(function(){try{hook();}catch(e){}},500);
})();
