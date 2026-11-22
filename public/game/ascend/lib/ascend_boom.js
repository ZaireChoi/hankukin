/* ASCEND v3.48 — explosion engine hookup (lib/explosionfx.js, user supplied; loaded after it)
   · every frame / vehicle / boss that dies explodes: flash → fireball → sparks → small faction-coloured shards → smoke → scorch
   · cost control: pooled batches only (10 draw calls at most, and only while something is burning), no extra light,
     infantry and the swarm never trigger it, at most 8 explosions a second (4 on phones), quality mid (low on phones),
     and the engine is skipped for a second whenever its own update took more than 4 ms
   · window.__xfx = {fx, stat()}  — stat() gives the measured cost */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var iv=setInterval(function(){try{if(typeof R3==='undefined'||!R3||!R3.ready||!R3.r||!R3.scene||!window.THREE||!window.createExplosionFX)return;clearInterval(iv);guard('boom',init);}catch(e){}},80);
function init(){var T3=window.THREE,phone=!!window.__phone,XFX=window.createExplosionFX(T3);
 var tl=new T3.TextureLoader(),load=function(f){var t=tl.load('bg/fx/'+f);t.colorSpace=T3.SRGBColorSpace;return t;};
 var hsOK=false;
 var fx=new XFX.ExplosionFX({scene:R3.scene,quality:phone?'low':'mid',maxConcurrent:phone?3:6,light:false,
   textures:{fire:load('tex_fire.webp'),fire2:load('tex_fire2.webp'),smoke:load('tex_smoke.webp'),omega:load('tex_omega.webp')},
   onHitstop:function(s){if(hsOK&&typeof G!=='undefined'&&G)G.hstop=Math.max(G.hstop||0,s*.6);},
   onShake:function(a){if(typeof G!=='undefined'&&G)G.shake=Math.max(G.shake||0,a*22);}});
 // smoke a little lighter and smaller than the engine default so that it never hides the fight
 {var sm=fx.b.smoke,_sp=sm.spawn.bind(sm);sm.spawn=function(o){o.a0=(o.a0==null?1:o.a0)*.55;o.s1*=.8;o.life*=.8;return _sp(o);};}
 var meshes=[];for(var k in fx.b)meshes.push(fx.b[k].mesh);fx.debris.groups.forEach(function(g){meshes.push(g.mesh);});meshes.forEach(function(m){m.visible=false;m.userData.keep=1;});
 var S={kills:0,skipped:0,ms:0,max:0,n:0,off:0},recent=[],scene=R3.scene;
 var facOf=function(u){try{var c=CL[u.cls]||{};if(c.bug||/^z/.test(u.cls))return'zeta';var D=window.__FBD&&u.mon&&window.__FBD[u.mon];var f=(D&&D.f)||(u.fbd&&u.fbd.f);if(f)return{empire:'emp',omega:'omg',alpha:'alp',fed:'fed',zeta:'zeta'}[f]||'emp';var me=G.local&&G.local.unit;return me&&u.team===me.team?'fed':'emp';}catch(e){return'emp';}};
 var sizeOf=function(u){try{var m=u.mon&&window.MONMDL&&window.MONMDL[u.mon];if(m&&m[2])return m[2];var d=MDL[u.cls];if(d&&d[3]==='h')return d[2];if(d)return Math.max(30,d[2]*.6);}catch(e){}return Math.max(36,(u.r||14)*3);};
 var boom=function(u){if(!u||typeof G==='undefined'||!G||S.off>0)return;var c=CL[u.cls]||{};if(c.arm==='inf'&&!u.boss&&!u.mon)return;/* v3.49: every non-infantry kill uses the engine (grey box shards were removed) */
  var now=performance.now();recent=recent.filter(function(t){return now-t<1000;});if(recent.length>=(phone?4:8)){S.skipped++;return;}recent.push(now);
  if(scene!==R3.scene||meshes[0].parent!==R3.scene){scene=R3.scene;meshes.forEach(function(m){R3.scene.add(m);});fx.scene=R3.scene;}
  var e=R3.units.get(u.id),p=e&&e.root?e.root.position:{x:u.x,y:0,z:u.y};var tier=u.boss?'boss':(u.named||u.elite2||u.fbd)?'elite':'grunt';hsOK=tier!=='grunt';
  fx.kill({x:p.x,y:p.y,z:p.z},{tier:tier,faction:facOf(u),size:sizeOf(u),groundY:p.y});fx.active=1;S.kills++;};
 window.__xfx={fx:fx,boom:boom,stat:function(){var st=fx.stats();return{kills:S.kills,skipped:S.skipped,avgMs:S.n?+(S.ms/S.n).toFixed(3):0,maxMs:+S.max.toFixed(2),active:st.active,drawMax:st.maxDrawCalls,frames:S.n};}};
 // every death in the unit list
 var _ku=killUnit;killUnit=function(u){var was=u&&u.dead;var r=_ku.apply(this,arguments);try{if(u&&!was&&u.dead)boom(u);}catch(e){}return r;};
 // advance with game time; measure the cost and back off if it is ever expensive
 var _st=step;step=function(dt){_st(dt);try{if(S.off>0){S.off-=dt;return;}if(!fx.active&&!fx.queue.length){if(meshes[0].visible)meshes.forEach(function(m){m.visible=false;});return;}
   var t0=performance.now();var n=fx.update(dt);var ms=performance.now()-t0;S.ms+=ms;S.n++;if(ms>S.max)S.max=ms;var on=n>0;if(meshes[0].visible!==on)meshes.forEach(function(m){m.visible=on;});
   if(ms>4&&S.n>30){S.off=1;fx.clear();meshes.forEach(function(m){m.visible=false;});}}catch(e){}};
 // nothing carries over into the next match
 try{var _lm=leaveMatch;leaveMatch=function(){try{fx.clear();fx.active=0;meshes.forEach(function(m){m.visible=false;});}catch(e){}return _lm.apply(this,arguments);};}catch(e){}
}
})();
