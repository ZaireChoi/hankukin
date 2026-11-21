/* ASCEND v3.48 — tidy battlefields (loaded before the first match starts)
   The big maps had several generations of scattered props on top of each other. On the desert map alone: 177 thorn bushes,
   84 alien mushroom trees, 27 crystals, 18 crate piles, 3 wrecks, 4 ruined buildings on the rim and 48 barrier rows.
   Rule now: a natural battlefield (desert, ice canyon, volcano) shows natural rock only.
   · alien flora: none on the desert; a few ice / lava crystals on the ice and volcano maps
   · crate piles and wrecks: none on any map (they were scenery only)
   · ruined buildings on the rim: only on the city maps
   · barrier rows: not generated on natural maps (index.html asks window.__noCover) — rocks already give cover there
   Nothing here changes collision except the barrier rows, which are removed together with their collision. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var NAT={dune:1,frost:1,volcano:1},CITY={seoul:1};
var natural=function(M){try{M=M||MAP;return !!(M&&NAT[M.theme]&&!/^sq_/.test(M.id||''));}catch(e){return false;}};
window.__noCover=function(M){return natural(M);};
guard('props',function(){
 // scenery models that are never placed any more / only on city maps
 var _pi=propInst;propInst=function(f,size,axis,yaw){try{if(f==='p_crates'||f==='p_wreck')return null;if(f==='p_ruin'&&natural())return null;
   // city maps: no desert boulders, mesas, cliffs or crystals between the buildings
   if(CITY[MAP.theme]&&/^p_(boulders|rock\d|mesa|cliff|crystal|atree\d?|bush)$/.test(f))return null;}catch(e){}return _pi(f,size,axis,yaw);};
 try{if(MAPS.seoul){MAPS.seoul.rocks=1;MAPS.seoul.rmin=12;MAPS.seoul.rmax=14;}}catch(e){}
 // (index.html draws cone-and-ball trees itself while the flora models are not loaded yet: natural maps skip that path too)
 var _fr=window.__floraReady;window.__floraReady=function(){try{if(natural())return true;}catch(e){}return _fr?_fr():false;};
 var _pf=window.__placeFlora;
 window.__placeFlora=function(S,spots,th){try{if(!natural())return _pf&&_pf(S,spots,th);if(th==='dune'||MAP.theme==='dune')return;
   // ice and volcano: one crystal on every fourth spot, nothing else
   for(var i=0;i<spots.length;i+=4){var s=spots[i],inst=_pi('p_crystal',40*(.7+((i*37)%10)/16)*s[2],'h',(i*1.7)%6.28);if(!inst)continue;inst.wrap.position.set(s[0],0,s[1]);inst.wrap.traverse(function(o){if(o.isMesh)o.receiveShadow=true;});S.add(inst.wrap);}
  }catch(e){(X.err=X.err||[]).push('flora: '+String(e).slice(0,160));}};
});
// ---- capture points: the 420-high light column and the two upright rings are removed (the HUD markers A/B/C already show
//      where the points are, and long straight beams are not allowed); the flat pad and its label stay.
// ---- basic Saber: charcoal body. The tint in mechInit can run before the match knows which unit is mine, so it is applied here.
guard('tidy',function(){var tick=0;
 // charcoal copy of a model texture (the Saber texture is red: multiplying the colour only gives dark red)
 var grey=function(tex){try{var im=tex&&tex.image;if(!im||!im.width)return null;var T3=window.THREE,w=Math.min(512,im.width),h=Math.min(512,im.height),c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');g.drawImage(im,0,0,w,h);var d=g.getImageData(0,0,w,h),a=d.data;
   for(var i=0;i<a.length;i+=4){var r=a[i],gg=a[i+1],b=a[i+2],l=(r*.3+gg*.59+b*.11)/255,mx=Math.max(r,gg,b),mn=Math.min(r,gg,b),sat=mx?(mx-mn)/mx:0;
    if(sat<.18&&l>.62){a[i]=Math.round(205*l);a[i+1]=Math.round(170*l);a[i+2]=Math.round(96*l);}       // pale trim -> muted gold
    else{var v=Math.pow(l,.85)*.5+.035;a[i]=Math.round(255*v*.96);a[i+1]=Math.round(255*v);a[i+2]=Math.round(255*v*1.08);}}   // body -> charcoal with a little blue
   g.putImageData(d,0,0);var t=new T3.CanvasTexture(c);t.colorSpace=tex.colorSpace;t.flipY=tex.flipY;t.wrapS=tex.wrapS;t.wrapT=tex.wrapT;t.needsUpdate=true;return t;}catch(e){return null;}};
 var cache=null,cacheSrc=null;
 // used by the style-select preview too: turn a Saber model instance charcoal
 window.__charcoal=function(obj){try{obj.traverse(function(m){if(!m.isMesh||!m.material||m.userData.keep||m.userData.__tn)return;m.userData.__tn=1;var mat=m.material.clone();if(mat.map){if(cacheSrc!==mat.map){cache=grey(mat.map);cacheSrc=mat.map;}if(cache){mat.map=cache;mat.color.setScalar(1);}}if(mat.emissive)mat.emissive.multiplyScalar(.4);mat.needsUpdate=true;m.material=mat;});}catch(e){}};
 setInterval(function(){guard('tidyTick',function(){if(typeof R3==='undefined'||!R3||!R3.ready)return;tick++;
  // capture points: light column, upright rings and the dark posts (the posts are batched into the scene root)
  if(tick%4===1){var hide=function(o){if(!o.isMesh||!o.geometry||!o.material||o.userData.__tidy)return;var t=o.geometry.type,p=o.geometry.parameters||{},mt=o.material.type;
     if((t==='CylinderGeometry'&&mt==='MeshBasicMaterial'&&(p.height||0)>=300&&(p.radiusTop||0)<120)||(t==='TorusGeometry'&&mt==='MeshBasicMaterial'&&(p.radius||0)<80&&(p.radius||0)>20&&o.parent&&o.parent!==R3.scene)||(t==='CylinderGeometry'&&p.radiusTop===5&&p.radiusBottom===7&&p.height===40)||(t==='SphereGeometry'&&mt==='MeshBasicMaterial'&&p.radius===5&&o.parent&&o.parent.parent===R3.envG)){o.userData.__tidy=1;o.visible=false;o.scale.setScalar(.0001);}};
    if(R3.envG)R3.envG.traverse(function(o){if(o.userData&&o.userData.flbl&&o.visible)o.visible=false;hide(o);});R3.scene.children.forEach(hide);}
  if(typeof G==='undefined'||!G)return;var me=G.local&&G.local.unit;if(!me||me.dead)return;var e=R3.units.get(me.id);if(!e||!e.mdl||!e.mdl.obj||e.mdl.__tint)return;var tn=window.__mechTint?window.__mechTint(me):0;e.mdl.__tint=1;if(!tn)return;
  e.mdl.obj.traverse(function(m){if(!m.isMesh||!m.material||m.userData.keep||m.userData.__tn)return;m.userData.__tn=1;var mat=m.material.clone();if(mat.map){if(cacheSrc!==mat.map){cache=grey(mat.map);cacheSrc=mat.map;}if(cache){mat.map=cache;mat.color.setScalar(1);}else mat.color.setScalar(tn);}else if(mat.color)mat.color.setScalar(tn);if(mat.emissive)mat.emissive.multiplyScalar(.4);mat.needsUpdate=true;m.material=mat;});});},400);});
})();