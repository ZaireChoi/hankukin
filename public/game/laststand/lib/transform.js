/* ASCEND transform engine v1 — mech ⇄ flight form (Transformer-style staged motion)
   Profile values change the jet each frame becomes. Robot→jet ≈1.3 s, jet→robot reverses with a landing jolt.
   Needs window.__AX bridge from index.html (SFX2, motBones, rotW, part, unitH, myMechKey, boltFire, myE). */
(function(){'use strict';
var AX=function(){return window.__AX||{};};
var T3=function(){return window.THREE;};
var DUR=1.3;
// ---------- profiles: one value set per frame ----------
var BASE={span:1,nose:'needle',noseLen:.32,fin:.22,legFold:.35,armTuck:1.25,flame:0xff7a4a,alt:55,pitch:1.42,speed:5,finCol:null,twinTail:false,bulk:1};
var PROF={
 mech3:{nose:'needle',noseLen:.34,fin:.24,flame:0xff5a3a,alt:58,speed:5.2},           // Saber "Phoenix": slim red interceptor, split back wings
 mech4:{nose:'twin',noseLen:.26,fin:.3,flame:0x7fd4ff,alt:50,speed:5.6,twinTail:true},  // Knight: twin-boom fast striker
 m_sky:{nose:'needle',noseLen:.42,fin:.4,flame:0x9ff6ff,alt:70,speed:6,span:1.4},        // Sky: long-wing high flyer
 m_striker:{nose:'blade',noseLen:.3,fin:.18,flame:0xff4a4a,alt:45,speed:5.8},            // Crimson Striker: blade-nose dart, low and fast
 m_titan:{nose:'heavy',noseLen:.22,fin:.36,flame:0xffb070,alt:40,speed:4,bulk:1.5},       // Titan: heavy gunship
 m_ranger:{nose:'needle',noseLen:.36,fin:.3,flame:0x7df9ff,alt:62,speed:5.4},           // Ranger: long-barrel recon interceptor
 m_artillery:{nose:'heavy',noseLen:.22,fin:.34,flame:0xffa040,alt:44,speed:4.4,bulk:1.4}, // Artillery: gun-pod bomber
 m_wizard:{nose:'needle',noseLen:.3,fin:.32,flame:0x7dffe0,alt:66,speed:5.2},           // Wizard: delta with drone pods
 m_phantom:{nose:'blade',noseLen:.28,fin:.2,flame:0xb48cff,alt:52,speed:6.2},           // Phantom: stealth flying wing
 m_samurai:{nose:'blade',noseLen:.32,fin:.22,flame:0xffd166,alt:50,speed:5.8},          // Samurai: katana dart
 m_origin:{nose:'needle',noseLen:.34,fin:.3,flame:0xffe9a0,alt:60,speed:5.6}            // Origin: ancient prototype
};
function prof(k){var p={};for(var a in BASE)p[a]=BASE[a];var q=PROF[k]||{};for(var b in q)p[b]=q[b];return p;}
function seg(k,a,b){var x=Math.max(0,Math.min(1,(k-a)/(b-a)));return x*x*(3-2*x);}
function G(){return window.__T&&window.__T.G;}
function me(){var g=G();return g&&g.local&&g.local.unit;}
// ---------- state ----------

/* v4.14 (user): a transformed frame fires missiles only - a pair from under both wings, through the missile engine (lib/ascend_missile.js).
   Wing points come from the flight form itself (outermost wing pieces); forms without wings fire from the hull sides. */
function wingPts(e){var J=e&&e._jet;if(!J||!J.pcs)return null;if(J._wing)return J._wing;var T=T3();var zMax=0,xs=0,n=0,yM=0;for(var k in J.pcs){var h=J.pcs[k].home;if(Math.abs(h.z)>zMax)zMax=Math.abs(h.z);}
 var wl=J.pcs.wingL&&J.pcs.wingL.home,wr=J.pcs.wingR&&J.pcs.wingR.home;var L,R;if(wl&&wr){L=wl.clone();R=wr.clone();L.z=Math.sign(L.z||1)*Math.max(Math.abs(L.z),zMax*.75);R.z=Math.sign(R.z||-1)*Math.max(Math.abs(R.z),zMax*.75);L.y-=J.len*.04;R.y-=J.len*.04;}
 else{var w=Math.max(zMax,J.len*.12);L=new T.Vector3(0,0,w);R=new T.Vector3(0,0,-w);}
 J._wing=[L,R];return J._wing;}
function wingMissile(u,a){try{var M=window.MSLE;if(!M||!M.fire||!window.R3)return false;var e=R3.units.get(u.id);var W=wingPts(e);if(!W)return false;var J=e._jet;J.grp.updateMatrixWorld(true);
  var tg=null,bd=1e18,on=window.__mslOnScr;var g=G();for(var i=0;i<g.units.length;i++){var o=g.units[i];if(o.dead||o.team===u.team||o.team===2)continue;if(on&&!on(o.x,20,o.y))continue;var dd=(o.x-u.x)*(o.x-u.x)+(o.y-u.y)*(o.y-u.y);var ang=Math.atan2(o.y-u.y,o.x-u.x);var df=Math.abs(Math.atan2(Math.sin(ang-a),Math.cos(ang-a)));dd*=1+df*1.5;if(dd<bd){bd=dd;tg=o;}}
  var dmg=46*(1+((window.__plv&&window.__plv())||1)*.03);var P=AX().part;
  for(var s=0;s<2;s++){var wp=W[s].clone();J.grp.localToWorld(wp);var ca=Math.cos(a),sa=Math.sin(a);
   M.fire({profile:'aa',kind:'micro',x:wp.x,h:wp.y,y:wp.z,dir:[ca,-.05,sa],target:tg,tx:tg?null:u.x+ca*800,ty:tg?null:u.y+sa*800,th:tg?null:20,dmg:dmg,src:u.slot,team:u.team,dt:'x',delay:s*.06});
   if(P)for(var q=0;q<3;q++)P(wp.x,wp.z,ca*120+(Math.random()-.5)*60,sa*120+(Math.random()-.5)*60,.12,'#ffe2b0',3,wp.y);}
  return true;}catch(er){window.__tfMslErr=String(er).slice(0,160);return false;}}
window.__tfWing=wingPts;
/* no weapon arts (Z / art button, auto battle) while transformed */
setInterval(function(){try{var ao=window.__artOverride;if(ao&&ao.__tf)return;var w=function(u){if(isJet(u))return true;return ao?ao(u):false;};w.__tf=1;window.__artOverride=w;}catch(e){}},1000);
function isJet(u){return !!(u&&u.tf&&u.tf.mode!=='robot');}
function toggle(u){u=u||me();if(!u||u.dead||u.cls!=='arkframe')return;var g=G();if(!g||g.over)return;u.tf=u.tf||{mode:'robot',k:0};
 if(u.tf.mode==='robot'||u.tf.mode==='toRobot'){u.tf.mode='toJet';}else{u.tf.mode='toRobot';}
 u.tf.mark=-1;try{AX().SFX2&&AX().SFX2.hatch();}catch(e){}}
window.ascendTransform=toggle;
// ---------- input: jets fire lasers only; Q/E/R/T/Z/C/X and number skills are locked ----------
var LOCK={KeyQ:1,KeyE:1,KeyR:1,KeyT:1,KeyZ:1,KeyC:1,KeyX:1,Digit1:1,Digit2:1,Digit3:1,Digit4:1,Digit5:1,Digit6:1};
addEventListener('keydown',function(e){if(e.code==='KeyY'&&!e.repeat){var u=me();if(u&&u.cls==='arkframe'){e.preventDefault();toggle(u);}return;}var u2=me();if(isJet(u2)&&LOCK[e.code]){e.stopImmediatePropagation();e.preventDefault();}},true);
['touchstart','pointerdown','mousedown'].forEach(function(ev){addEventListener(ev,function(e){var u=me();if(!isJet(u))return;var t=e.target;if(!t||!t.closest)return;if(t.closest('#tA1,#tA2,#tUl,#tArt,#tMsl,#tFly,#tDash')||(t.closest('.sk2')&&!t.closest('[data-k="TF"]'))){e.stopImmediatePropagation();e.preventDefault();}},true);});
function hookInput(){var li=window.localInput;if(!li||li.__tf||window.__hkTfI)return;window.__hkTfI=1;var w=function(u){var inp=li(u);try{if(isJet(u)){inp.a1=false;inp.a2=false;inp.ul=false;inp.ab=false;var g=G();var moving=u.tf.mode==='jet';if(inp.fire&&moving){var gt=(g&&g.t)||0;if(u._tfNext==null||u._tfNext>gt+2)u._tfNext=0;u._tfFire=u._tfNext-gt;if(u._tfFire<=0){var a=inp.aim!=null?inp.aim:(u.aa||0);if(wingMissile(u,a))u._tfNext=gt+.42;else if(AX().boltFire){u._tfNext=gt+.16;try{AX().boltFire(u,a+(Math.random()-.5)*.03,{dmg:22*(1+((window.__plv&&window.__plv())||1)*.03),w:44,vis:46,r:4,spd:3000});}catch(e){}}}}inp.fire=false;if(!moving){inp.mx*=.2;inp.my*=.2;}}}catch(e){}return inp;};w.__tf=1;window.localInput=w;}
// ---------- per-frame: progress, speed, protection, sounds ----------
function hookStep(){var st=window.step;if(!st||st.__tf||window.__hkTfS)return;window.__hkTfS=1;var w=function(dt){st(dt);try{var u=me();if(!u||!u.tf)return;var T=u.tf,p=prof(AX().myMechKey?AX().myMechKey():'');
  /* v4.09 fix (user: "manual play does not respond"): the battle entrance holds the frame half-transformed (mode 'hold'); when the entrance ends
     by its time-out (slow phones / slow tabs) nobody released it, so the frame stayed a jet forever and every skill was locked. Release it. */
  var g0=G();if(T.mode==='hold'&&g0&&(g0._intDone===1||(g0._int0==null&&(g0.t||0)>5))&&!window.__tfHoldOK){T.mode=T.k>.02?'toRobot':'robot';}
  if(T.mode==='toJet'){T.k=Math.min(1,(T.k||0)+dt/DUR);if(T.k>=1)T.mode='jet';}else if(T.mode==='toRobot'){T.k=Math.max(0,(T.k||0)-dt/(DUR*.9));if(T.k<=0){T.mode='robot';land(u);}}
  if(T.mode==='toJet'||T.mode==='toRobot')u.spawnProt=Math.max(u.spawnProt||0,.12);// invulnerable while parts move
  // flight physics: the existing flight mode carries the frame; jets add the speed
  if(!u.st)return;if(u._tfSpd0==null)u._tfSpd0=u.st.spd;var jetK=seg(T.k,.55,.95);u.st.spd=u._tfSpd0*(1+(p.speed-1)*jetK);
  if(T.k>.5&&!u.fly){u.fly=true;u._tfFly=1;}if(T.k<.4&&u._tfFly){u.fly=false;u._tfFly=0;}
  if(T.mode==='robot'){u.st.spd=u._tfSpd0;u._tfSpd0=null;u.tf=null;}
  // stage sounds + small sparks at each lock
  var marks=[.15,.4,.55,.7,.92];var idx=-1;for(var i=0;i<marks.length;i++)if(T.k>=marks[i])idx=i;if(idx!==T.mark){var up=idx>T.mark;T.mark=idx;var S=AX().SFX2;try{if(idx===4&&up)S&&S.launch();else S&&(Math.random()<.5?S.clang():S.hatch());}catch(e){}spark(u,idx===4&&up);}
 }catch(e){window.__tfErr=String(e&&e.stack||e).slice(0,200);}};w.__tf=1;window.step=w;}
function spark(u,big){var P=AX().part;if(!P)return;var h=(AX().unitH?AX().unitH(u):0)+40;for(var i=0;i<(big?14:7);i++){var b=Math.random()*6.28;P(u.x,u.y,Math.cos(b)*(big?260:140),Math.sin(b)*(big?260:140),.25,big?'#ffd2a0':'#e8f4ff',big?5:3,h);}}
function land(u){var P=AX().part;try{AX().SFX2&&AX().SFX2.thump();}catch(e){}if(P)for(var i=0;i<18;i++){var b=i/18*6.28;P(u.x+Math.cos(b)*30,u.y+Math.sin(b)*30,Math.cos(b)*220,Math.sin(b)*220,.4,'#c9b79a',5,4);}var g=G();if(g)g.hstop=Math.max(g.hstop||0,.06);}
// ---------- pose: bone keyframes over stages + small parts ----------
function parts(e,m,H,p){if(e._tfP)return e._tfP;var T=T3();var B=AX().motBones(m);if(!B||!B.Head)return null;var body=new T.Color(0xb01018);try{var c=(window.P&&P.cust&&P.cust.body)||null;if(c)body=new T.Color(c);}catch(er){}
 var mat=new T.MeshStandardMaterial({color:body,metalness:.6,roughness:.35});var dark=new T.MeshStandardMaterial({color:0x22262e,metalness:.8,roughness:.4});
 var o={nose:new T.Group(),fins:[],thr:[],fl:[]};var nl=H*p.noseLen;
 var mk=function(geo,mt){var x=new T.Mesh(geo,mt);x.castShadow=false;x.userData.keep=1;return x;};
 if(p.nose==='twin'){for(var s=-1;s<=1;s+=2){var n=mk(new T.ConeGeometry(H*.035,nl,6),mat);n.rotation.x=Math.PI/2;n.position.set(s*H*.05,0,nl*.5);o.nose.add(n);}}
 else if(p.nose==='heavy'){var hv=mk(new T.CylinderGeometry(H*.05,H*.08,nl,6),mat);hv.rotation.x=Math.PI/2;hv.position.z=nl*.5;o.nose.add(hv);}
 else if(p.nose==='blade'){var bl=mk(new T.BoxGeometry(H*.012,H*.05,nl),mat);bl.position.z=nl*.5;o.nose.add(bl);}
 else{var nd=mk(new T.ConeGeometry(H*.045,nl,8),mat);nd.rotation.x=Math.PI/2;nd.position.z=nl*.5;o.nose.add(nd);}
 B.Head.add(o.nose);
 for(var s2=-1;s2<=1;s2+=2){var f=mk(new T.BoxGeometry(H*p.fin,H*.008,H*.12),dark);var fg=new T.Group();fg.add(f);f.position.x=s2*H*p.fin*.5;fg.userData.side=s2;(B.Hips||B.Spine).add(fg);o.fins.push(fg);
  var ft=s2<0?B.LeftFoot:B.RightFoot;if(ft){var ring=mk(new T.CylinderGeometry(H*.035*p.bulk,H*.045*p.bulk,H*.05,10,1,true),dark);ft.add(ring);o.thr.push(ring);var cg=(window.flameGeo?window.flameGeo(T,H*.03*p.bulk,H*.28):new T.ConeGeometry(H*.03*p.bulk,H*.28,10,1,true));cg.translate(0,-H*.14,0);var fl=new T.Mesh(cg,new T.MeshBasicMaterial({map:(window.flameTex?window.flameTex():null),color:p.flame,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));fl.userData.keep=1;fl.frustumCulled=false;ft.add(fl);o.fl.push(fl);}}
 e._tfP=o;return o;}
function scaleLocal(obj,s,H){obj.scale.setScalar(Math.max(.001,s));}
function tfPose(e,m,u,k,opt){opt=opt||{};var A=AX();var B=A.motBones&&A.motBones(m);if(!B)return;var T=T3();var p=prof(opt.pk||(A.myMechKey?A.myMechKey():''));if(opt.alt!=null)p.alt=opt.alt;
  var H=opt.H||(e.wg&&e.wg.H)||((e.mfx&&e.mfx.H)||90);
  var jk=opt.jk||jetKey();var mcj=jk&&A.mc?A.mc(jk):null;if(jk&&!mcj){try{A.mdlGet&&A.mdlGet(jk);}catch(er){}}
  var shellOK=!!(mcj&&mcj.st==='ok');
  var c=seg(k,0,.18),l=seg(k,.1,.42),a=seg(k,.25,.52),pt=seg(k,.4,.7),pa=seg(k,.68,.92),ig=seg(k,.9,1);
  var dip=c*(1-pt);
  // 2 legs fold back into a tail (thighs together and straight back, knees locked)
  var fwd=new T.Vector3(0,0,1),upv=new T.Vector3(0,1,0);
  var qL=function(bone,axis,ang){if(!bone||!ang)return;bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,ang));};
  m.wrap.rotation.z+=(window.__TFSIGN||-1)*pt*p.pitch;m.wrap.position.y+=H*(GROUNDF[jk]?.12:.3)*c*(1-pt*.0);   /* v4.09 (user: the robot sank into the deck and lost its legs): it now springs up off the ground as the transformation starts, never dips below it */
  // 2–3 legs straighten into a twin tail along the body, arms lock along the flanks (direction-based, works on any rig)
  m.wrap.updateMatrixWorld(true);var wp=function(b){var v=new T.Vector3();b.getWorldPosition(v);return v;};var bodyUp=(B.Head&&B.Hips)?wp(B.Head).sub(wp(B.Hips)).normalize():new T.Vector3(0,1,0);var down=new T.Vector3(0,-1,0);
  var point=function(a1,b1,dir,kk){if(!a1||!b1||kk<.01||!A.rotW)return;var cur=wp(b1).sub(wp(a1)).normalize();var q=new T.Quaternion().setFromUnitVectors(cur,dir.clone().normalize());A.rotW(a1,new T.Quaternion().slerp(q,kk));a1.updateMatrixWorld(true);};
  var tail=bodyUp.clone().negate();point(B.LeftUpLeg,B.LeftLeg,tail,l);point(B.RightUpLeg,B.RightLeg,tail,l);point(B.LeftLeg,B.LeftFoot,tail,l);point(B.RightLeg,B.RightFoot,tail,l);
  var flank=tail.clone().multiplyScalar(.8).add(down.clone().multiplyScalar(.2)).normalize();point(B.LeftArm,B.LeftForeArm,flank,a);point(B.RightArm,B.RightForeArm,flank,a);point(B.LeftForeArm,B.LeftHand,flank,a);point(B.RightForeArm,B.RightHand,flank,a);
  if(B.Head)qL(B.Head,new T.Vector3(1,0,0),-.5*pt);// head looks forward along the flight line
  // 6 nose / side panels / thrusters slide out and lock
  var o=parts(e,m,H,p);if(o){scaleLocal(o.nose,pa,H);o.nose.position.z=(1-pa)*-H*.05;for(var i=0;i<o.fins.length;i++){var fg=o.fins[i];fg.scale.set(Math.max(.001,pa),1,Math.max(.001,pa));fg.rotation.y=fg.userData.side*(1-pa)*1.2;}for(var j=0;j<o.thr.length;j++)scaleLocal(o.thr[j],pa,H);
   // 7 ignition
   var sp=Math.hypot(u.vx||0,u.vy||0);for(var q=0;q<o.fl.length;q++){var fl=o.fl[q];fl.visible=ig>.02;fl.scale.set(1,ig*(.7+Math.min(1,sp/900)*.8)*(1+Math.random()*.15),1);}
   if(k>.45){try{if(e.eq&&e.eq.o)for(var n in e.eq.o){var eo=e.eq.o[n];if(eo&&eo.isObject3D)eo.visible=false;}if(e.grip)['hilt','sgun','blade2','palm'].forEach(function(n2){if(e.grip[n2])e.grip[n2].visible=false;});if(e.mfx&&e.mfx.saber)e.mfx.saber.visible=false;}catch(er){}}
   var vis=k>.01&&!shellOK;o.nose.visible=vis;if(shellOK){o.fl.forEach(function(f){f.visible=false;});}
   if(shellOK){if(m._ws0==null)m._ws0=m.wrap.scale.x;m.wrap.scale.setScalar(m._ws0);shellPose(e,m,u,k,p,H,B,jk);}else if(e._jet){e._jet.grp.visible=false;m.wrap.visible=true;}
   // keep the hips over the unit at flight height (pitching about the feet would push the body ahead of the frame)
   if(B.Hips&&e.root&&pt>0){m.wrap.updateMatrixWorld(true);var hp=new T.Vector3();B.Hips.getWorldPosition(hp);var rp=new T.Vector3();e.root.getWorldPosition(rp);var tgt=new T.Vector3(rp.x,rp.y+(GROUNDF[jk]?H*.32:H*.5+p.alt*pt),rp.z);var par=m.wrap.parent;if(par){var a1=par.worldToLocal(hp.clone());var a2=par.worldToLocal(hp.clone().lerp(tgt,pt));m.wrap.position.add(a2.sub(a1));m.wrap.updateMatrixWorld(true);}}o.fins.forEach(function(f){f.visible=vis;});o.thr.forEach(function(t){t.visible=vis;});}
 }
window.__tfPose=tfPose;   /* v4.08: the same staged transform drives the hangar preview */
function hookPose(){var ma=window.mdlAnimate;if(!ma||ma.__tf||window.__hkTfM)return;window.__hkTfM=1;var w=function(e,m,u,dt,now){ma(e,m,u,dt,now);try{if(!u||!u.tf||!m||!m.obj||!m.wrap)return;tfPose(e,m,u,u.tf.k||0,null);}catch(er){window.__tfErr=String(er&&er.stack||er).slice(0,200);}};w.__tf=1;window.mdlAnimate=w;}


/* v4.08 (user): the flying form wears the SAME colours as the robot (original or the player's paint).
   The robot's own texture x material colour is sampled into two tones (armour, frame); the jet texture is re-tinted by brightness onto them. */
var PALC={};
function robotPal(obj){var T=T3();var px=[];try{obj.traverse(function(o){if(!o.isMesh||!o.material||o.userData.keep||px.length>6000)return;var m=Array.isArray(o.material)?o.material[0]:o.material;var im=m.map&&m.map.image;var mc=m.color||{r:1,g:1,b:1};if(!im||!im.width){px.push([mc.r*255,mc.g*255,mc.b*255]);return;}var c=document.createElement('canvas');c.width=c.height=48;var g=c.getContext('2d');try{g.drawImage(im,0,0,48,48);}catch(e){return;}var d=g.getImageData(0,0,48,48).data;for(var i=0;i<d.length;i+=4){if(d[i+3]<128)continue;px.push([d[i]*mc.r,d[i+1]*mc.g,d[i+2]*mc.b]);}});}catch(e){}
 if(!px.length)return null;var L=function(p){return Math.max(p[0],p[1],p[2]);};   /* sort by brightness VALUE so saturated reds/blues count as the armour colour */px.sort(function(a,b){return L(a)-L(b);});var avg=function(a){var s=[0,0,0];a.forEach(function(p){s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];});return s.map(function(v){return v/Math.max(1,a.length);});};
 var n=px.length,dark=avg(px.slice(Math.floor(n*.05),Math.floor(n*.35))),main=avg(px.slice(Math.floor(n*.55),Math.floor(n*.95)));return {main:main,dark:dark,key:main.map(Math.round).join(',')+'|'+dark.map(Math.round).join(',')};}
function recolorMat(mat,pal){if(!mat||!pal||!mat.map||!mat.map.image)return mat;var key=mat.map.uuid+'|'+pal.key;if(PALC[key])return PALC[key];var T=T3();var im=mat.map.image;var w=Math.min(512,im.width),h=Math.min(512,im.height),c=document.createElement('canvas');c.width=w;c.height=h;var g=c.getContext('2d');try{g.drawImage(im,0,0,w,h);}catch(e){return mat;}var D=g.getImageData(0,0,w,h),a=D.data;
 for(var i=0;i<a.length;i+=4){var r=a[i],gg=a[i+1],b=a[i+2],mx=Math.max(r,gg,b),l=(mx*.7+(.3*r+.59*gg+.11*b)*.3)/255,mn=Math.min(r,gg,b),sat=mx?(mx-mn)/mx:0;var s=Math.max(0,Math.min(1,(l-.22)/.5));s=s*s*(3-2*s);
  var tr=pal.dark[0]*(1-s)+pal.main[0]*s,tg=pal.dark[1]*(1-s)+pal.main[1]*s,tb=pal.dark[2]*(1-s)+pal.main[2]*s;var k2=(sat>.5&&mx>238)?.4:.05;   /* bright saturated lights (engines, visors) keep some of their glow */
  a[i]=Math.round(tr*(1-k2)+r*k2);a[i+1]=Math.round(tg*(1-k2)+gg*k2);a[i+2]=Math.round(tb*(1-k2)+b*k2);}
 g.putImageData(D,0,0);var t=new T.CanvasTexture(c);t.colorSpace=mat.map.colorSpace;t.flipY=mat.map.flipY;t.wrapS=mat.map.wrapS;t.wrapT=mat.map.wrapT;var m2=mat.clone();m2.map=t;if(m2.color)m2.color.setScalar(1);m2.needsUpdate=true;PALC[key]=m2;return m2;}
window.__tfPal=robotPal;window.__tfRecolor=recolorMat;
// ================= v2: "shell" transform — a Meshy jet model split into armour pieces; each piece launches from the robot part it comes from and locks into the jet =================
var JETM={mech3:'saberjet',mech3n:'saberjet',mech3w:'saberjet',mech3g:'saberjet',mech4:'mech4_jet',m_sky:'m_sky_jet',m_striker:'m_striker_jet',m_titan:'m_titan_jet',m_ranger:'m_ranger_jet',m_artillery:'m_artillery_jet',m_wizard:'m_wizard_jet',m_phantom:'m_phantom_jet',m_samurai:'m_samurai_jet',m_origin:'m_origin_jet',m_guardian:'m_guardian_jet',mech_leg:'mech_leg_jet'};
/* v3.56: the jet follows the frame actually being flown (the arena skin first); frames without their own jet model borrow the closest one of their faction
   instead of falling back to a robot lying flat in the air */
var JFAC=[[/^emp_|^god_red|^arkos/,'m_striker_jet'],[/^fed_|^god_white|^seraph/,'m_sky_jet'],[/^alp_|^god$|^m_wizard/,'m_wizard_jet'],[/^omg_|^god_black|^omega/,'m_phantom_jet']];
/* v4.08: frames with their own designed flying form use it (Libertas: space frigate). Checked by frame key first, before the borrowed skin model */
var ALTF={fed_myth_libertas:1,alp_myth_genesis:1,alp_hero_glyph:1,alp_hero_oracle:1,alp_hero_seeker:1,alp_leg_solaris:1,alp_leg_aeon:1,fed_hero_atlas:1,fed_leg_tempest:1,fed_leg_orion:1,fed_hero_longshot:1,omg_myth_eclipse:1,omg_hero_wraith:1,omg_leg_warlord:1,emp_myth_sol:1,emp_hero_archer:1,emp_leg_valerian:1,emp_hero_lancer:1};
function jetKey(u){var uu=u||me();try{var fk=AX().myMechKey?AX().myMechKey():'';if(uu&&uu===me()&&ALTF[fk])return fk+'_alt';}catch(e){}var k=(uu&&uu.skin)||'';var j=JETM[k];if(!j){var k2=AX().myMechKey?AX().myMechKey():'';j=JETM[k2];if(!j){k=k||k2;for(var i=0;i<JFAC.length;i++)if(JFAC[i][0].test(k)){j=JFAC[i][1];break;}}}return j||'saberjet';}
var JC={};// split cache per jet model
function splitJet(f){if(JC[f])return JC[f];var T=T3();var c=AX().mc&&AX().mc(f);if(!c||c.st!=='ok'||!c.g)return null;var src=c.g.scene;src.updateMatrixWorld(true);var tris=[];var mat=null;var box=new T.Box3();
 src.traverse(function(o){if(!o.isMesh)return;mat=mat||(Array.isArray(o.material)?o.material[0]:o.material);var g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);var P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;for(var i=0;i<P.count;i+=3){var t={p:[],n:[],u:[]};for(var j=0;j<3;j++){t.p.push(P.getX(i+j),P.getY(i+j),P.getZ(i+j));if(N)t.n.push(N.getX(i+j),N.getY(i+j),N.getZ(i+j));if(U)t.u.push(U.getX(i+j),U.getY(i+j));box.expandByPoint(new T.Vector3(P.getX(i+j),P.getY(i+j),P.getZ(i+j)));}tris.push(t);}});
 var sz=box.getSize(new T.Vector3()),ctr=box.getCenter(new T.Vector3());
 // length axis = longest horizontal; the nose end is the narrower end
 // length axis: the fuselage holds most vertices, so its spread is wider than the thin wings' spread
 var vx=0,vz=0,nv=0;tris.forEach(function(t){for(var i=0;i<9;i+=3){var dx=t.p[i]-ctr.x,dz=t.p[i+2]-ctr.z;vx+=dx*dx;vz+=dz*dz;nv++;}});var JAX={m_phantom_jet:'x'};var LX=JAX[f]?JAX[f]==='x':vx>=vz;var len=LX?sz.x:sz.z,wid=LX?sz.z:sz.x;var ax=function(p,i){return LX?p[i]-ctr.x:p[i+2]-ctr.z;},sd=function(p,i){return LX?p[i+2]-ctr.z:p[i]-ctr.x;};
 var wA=0,wB=0;tris.forEach(function(t){for(var i=0;i<9;i+=3){var a=ax(t.p,i)/len,s=Math.abs(sd(t.p,i))/wid;if(a>.35)wA=Math.max(wA,s);if(a<-.35)wB=Math.max(wB,s);}});var noseSign=wA<wB?1:-1;if({emp_hero_herald_alt:1}[f])noseSign=-noseSign;   /* helicopters: the cockpit end is the wide one, the thin end is the tail boom */
 var groups={nose:[],body:[],wingL:[],wingR:[],tailL:[],tailR:[]};
 tris.forEach(function(t){var a=0,s=0;for(var i=0;i<9;i+=3){a+=ax(t.p,i);s+=sd(t.p,i);}a=a/3/len*noseSign;s=s/3/wid;var key;if(a>.22)key='nose';else if(Math.abs(s)>.2&&a>-.3)key=s>0?'wingL':'wingR';else if(a<-.18)key=s>=0?'tailL':'tailR';else key='body';groups[key].push(t);});
 // build part meshes in a frame where +X is the nose, +Y up, scaled to unit length
 var parts={};var scl=1/len;
 for(var k in groups){var L=groups[k];if(!L.length)continue;var n=L.length*3;var pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);var cen=new T.Vector3();
  L.forEach(function(t,ti){for(var j=0;j<3;j++){var px=t.p[j*3]-ctr.x,py=t.p[j*3+1]-ctr.y,pz=t.p[j*3+2]-ctr.z;var X,Z;if(LX){X=px*noseSign;Z=pz*noseSign;}else{X=pz*noseSign;Z=-px*noseSign;}var o=(ti*3+j);pos[o*3]=X*scl;pos[o*3+1]=py*scl;pos[o*3+2]=Z*scl;cen.x+=X*scl;cen.y+=py*scl;cen.z+=Z*scl;if(t.n.length){var nx=t.n[j*3],ny=t.n[j*3+1],nz=t.n[j*3+2];var NX,NZ;if(LX){NX=nx*noseSign;NZ=nz*noseSign;}else{NX=nz*noseSign;NZ=-nx*noseSign;}nor[o*3]=NX;nor[o*3+1]=ny;nor[o*3+2]=NZ;}if(t.u.length){uv[o*2]=t.u[j*2];uv[o*2+1]=t.u[j*2+1];}}});
  cen.multiplyScalar(1/n);for(var q=0;q<n;q++){pos[q*3]-=cen.x;pos[q*3+1]-=cen.y;pos[q*3+2]-=cen.z;}
  var g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.computeBoundingSphere();parts[k]={g:g,home:cen.clone()};}
 JC[f]={parts:parts,mat:mat};return JC[f];}
// where each jet piece comes from on the robot
var SRC={nose:'Head',body:'Spine',wingL:'LeftArm',wingR:'RightArm',tailL:'LeftFoot',tailR:'RightFoot'};
var ORDER={body:0,wingL:.12,wingR:.12,nose:.24,tailL:.32,tailR:.32};
/* v4.08: ground forms (tanks, trucks, walkers, bikes) sit on the deck with no jet flames; tall round forms are scaled so they don't balloon */
var GROUNDF={};'fed_hero_mortar fed_leg_astra fed_hero_bastion omg_leg_nocturne omg_hero_venom omg_hero_crusher omg_hero_hive emp_leg_aurelian emp_mp_assault emp_mp_heavy emp_mp_artillery emp_hero_inquisitor emp_leg_gravis alp_hero_prism alp_hero_glyph'.split(' ').forEach(function(k){GROUNDF[k+'_alt']=1;});   /* v4.11: IK-44 Herald became an attack helicopter - it flies */window.__tfGround=GROUNDF;
function shellBuild(e,f,H,pf){if(e._jet&&e._jet.f===f)return e._jet;var S=splitJet(f);if(!S)return null;var T=T3();var grp=new T.Group();
 /* v4.08 (user): the jet wears the frame's colours - AX-00 white/black recolour and the player's own paint, same as the robot */
 var JM=S.mat;try{if(e&&e.mdl&&typeof G!=='undefined'&&G&&G.local&&G.local.unit&&R3.units.get(G.local.unit.id)===e){var tn=window.__mechTint?window.__mechTint(G.local.unit):0;if(tn&&window.__axGrey&&JM.map){JM=JM.clone();var gt=window.__axGrey(JM.map);if(gt){JM.map=gt;JM.color.setScalar(1);}}}var palR=(e&&e.mdl&&e.mdl.obj)?robotPal(e.mdl.obj):null;if(palR)JM=recolorMat(JM,palR);}catch(er){}var len=H*1.15;try{var fk0=(e&&e.fk)||(AX().myMechKey?AX().myMechKey():'');var sc0=window.__tf3&&window.__tf3.SCALE&&window.__tf3.SCALE[fk0];if(sc0)len*=sc0;}catch(er){}   /* v4.11: legendary forms can be bigger than the robot (Seraphim x2) */
 var pcs={};for(var k in S.parts){var m=new T.Mesh(S.parts[k].g,JM);m.castShadow=false;m.userData.keep=1;m.frustumCulled=false;var hold=new T.Group();hold.add(m);grp.add(hold);pcs[k]={hold:hold,home:S.parts[k].home.clone().multiplyScalar(len),spin:new T.Euler((Math.random()-.5)*3,(Math.random()-.5)*3,(Math.random()-.5)*3)};hold.scale.setScalar(len);}
 // engine flames at the tail
 var fl=[];for(var s=-1;s<=1;s+=2){var cg=(window.flameGeo?window.flameGeo(T,len*.035,len*.32):new T.ConeGeometry(len*.035,len*.32,10,1,true));cg.rotateZ(Math.PI/2);cg.translate(-len*.16,0,0);var fm=new T.Mesh(cg,new T.MeshBasicMaterial({map:(window.flameTex?window.flameTex():null),color:(pf&&pf.flame)||0xff7a4a,transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));fm.position.set(-len*.5,len*.0,s*len*.06);fm.userData.keep=1;fm.frustumCulled=false;grp.add(fm);fl.push(fm);}
 grp.userData.keep=1;
 /* measure the finished form: squash balloon shapes (spheres, pods) to at most .62 x length tall, and remember the bottom for ground forms */
 var gnd=!!GROUNDF[f],bot=0;try{var bx=new T.Box3(),tv=new T.Vector3();for(var k1 in pcs){var hh=pcs[k1].hold;hh.position.copy(pcs[k1].home);hh.rotation.set(0,0,0);hh.scale.setScalar(len);}grp.updateMatrixWorld(true);bx.setFromObject(grp);var hgt=bx.max.y-bx.min.y;var fz=hgt>len*.62?len*.62/hgt:1;if(fz<1){len*=fz;for(var k2 in pcs)pcs[k2].home.multiplyScalar(fz);fl.forEach(function(f2){f2.scale.multiplyScalar(fz);f2.position.multiplyScalar(fz);});}bot=bx.min.y*fz;if(gnd)fl.forEach(function(f3){f3.visible=false;});}catch(er){}
 e._jet={f:f,grp:grp,pcs:pcs,fl:fl,len:len,gnd:gnd,bot:bot,nofl:!!{emp_hero_herald_alt:1}[f]};if(e._jet.nofl)fl.forEach(function(f4){f4.visible=false;});return e._jet;}
function shellPose(e,m,u,k,p,H,B,jk){var T=T3();var J=shellBuild(e,jk||jetKey(),H,p);if(!J)return false;var par=m.wrap.parent;if(!par)return false;if(J.grp.parent!==par)par.add(J.grp);
 if(window.__tf3&&!window.__tf3Off){try{if(window.__tf3.pose(e,m,u,k,p,H,B,jk,J))return true;}catch(er){window.__tf3Err=String(er&&er.stack||er).slice(0,300);}}   /* v4.09 panel engine */
 // jet frame: same place/heading as the robot, lifted to flight height (robot wrap faces +X)
 var lift=seg(k,.35,.9);var y1=J.gnd?(-J.bot+(m.wrap.position.y>0&&!window.__grV?0:0)):H*.45+p.alt;var y0=H*.45;J.grp.position.set(m.wrap.position.x,y0+(y1-y0)*lift,m.wrap.position.z);J.grp.rotation.set(0,m.wrap.rotation.y,0);J.grp.visible=k>.02;J.grp.updateMatrixWorld(true);
 var inv=new T.Matrix4().copy(J.grp.matrixWorld).invert();var wp=new T.Vector3();
 for(var key in J.pcs){var pc=J.pcs[key];var st=ORDER[key]||0;var kk=seg(k,.18+st,.62+st);var src=B[SRC[key]]||B.Spine||B.Hips;src.getWorldPosition(wp);var from=wp.clone().applyMatrix4(inv);
  pc.hold.position.copy(from).lerp(pc.home,kk);var ov=Math.sin(kk*Math.PI)*.18;pc.hold.position.y+=ov*J.len*.15;
  pc.hold.rotation.set(pc.spin.x*(1-kk),pc.spin.y*(1-kk),pc.spin.z*(1-kk));pc.hold.scale.setScalar(J.len*(.25+.75*kk));pc.hold.visible=kk>.01;
  if(kk>=.999&&!pc.locked){pc.locked=1;try{AX().SFX2&&AX().SFX2.clang();}catch(er){}var P2=AX().part;if(P2){var w=pc.hold.getWorldPosition(new T.Vector3());for(var i=0;i<6;i++){var b=Math.random()*6.28;P2(w.x,w.z,Math.cos(b)*160,Math.sin(b)*160,.2,'#ffe2c0',3,w.y);}}}
  if(kk<.9)pc.locked=0;}
 // the robot folds and shrinks into the hull, then hides inside it
 var hide=seg(k,.55,.92);m.wrap.scale.setScalar((m._ws0||1)*(1-.55*hide));m.wrap.visible=k<.93;
 var ig=seg(k,.9,1);var sp=Math.hypot(u.vx||0,u.vy||0);J.fl.forEach(function(f){f.visible=ig>.02&&!J.gnd&&!J.nofl;f.scale.set(1,ig*(.7+Math.min(1,sp/900)*.9)*(1+Math.random()*.15),1);});
 return true;}

// ---------- skill bar: rightmost cell + phone button ----------
function addCell(){var bar=document.getElementById('skb2');if(!bar||document.getElementById('skTF'))return;var row=bar.querySelector('div[style*="display:flex"]')||bar;var d=document.createElement('div');d.className='sk2';d.id='skTF';d.dataset.k='TF';d.title='변신 / Transform [Y]';
 d.style.cssText='position:relative;width:52px;height:52px;border-radius:8px;border:1px solid rgba(255,140,110,.6);background:linear-gradient(160deg,#2a0d10,#120609);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto';
 d.innerHTML='<span style="position:absolute;left:4px;top:2px;font:800 10px sans-serif;color:#ffd2c8">Y</span><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ff8a70" stroke-width="1.6"><path d="M12 3v7M5 13l7-3 7 3M8 21l4-3 4 3M12 10v8"/></svg><em id="skTFs" style="position:absolute;bottom:2px;right:4px;font:700 9px sans-serif;color:#ffb0a0;font-style:normal">변신</em>';
 d.addEventListener('pointerdown',function(e){e.stopPropagation();e.preventDefault();toggle();});row.appendChild(d);}
function syncCell(){var s=document.getElementById('skTFs');var u=me();if(!s)return;var j=isJet(u);var t=j?(u.tf.mode==='jet'?'로봇 복귀':'…'):'변신';if(s.textContent!==t)s.textContent=t;var d=document.getElementById('skTF');if(d)d.style.boxShadow=j?'0 0 10px rgba(255,120,90,.7)':'none';}
function boot(){hookInput();hookStep();hookPose();addCell();syncCell();}
setInterval(boot,600);
window.__TF={toggle:toggle,prof:prof,PROF:PROF,set:function(k){var u=me();if(!u)return;u.tf={mode:'hold',k:k,mark:-1};}};
})();

;(function(){var IMG={mech3:'saberjet',mech4:'mech4_jet',m_sky:'m_sky_jet',m_striker:'m_striker_jet',m_titan:'m_titan_jet',m_ranger:'m_ranger_jet',m_artillery:'m_artillery_jet',m_wizard:'m_wizard_jet',m_phantom:'m_phantom_jet',m_samurai:'m_samurai_jet',m_origin:'m_origin_jet'};
 window.__onFlyTo=function(h){var r;try{var k=(window.__AX&&window.__AX.myMechKey&&window.__AX.myMechKey())||'mech3';var jk=IMG[k]||'saberjet';var im=document.createElement('img');im.src='bg/jetrear_'+jk+'.png';im.id='tfJetFly';im.style.cssText='position:fixed;left:50%;bottom:9%;width:min(34vw,420px);transform:translateX(-50%) scale(.2);opacity:0;z-index:61;pointer-events:none;transition:transform .9s cubic-bezier(.2,1.4,.4,1),opacity .4s;filter:drop-shadow(0 0 18px rgba(255,140,90,.55))';document.body.appendChild(im);
  var fl=document.createElement('div');fl.style.cssText='position:fixed;left:50%;bottom:7%;width:min(16vw,200px);height:min(9vw,110px);transform:translateX(-50%);z-index:60;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,rgba(255,200,140,.9),rgba(255,110,60,.35) 45%,transparent 70%);filter:blur(4px);opacity:0;transition:opacity .6s';document.body.appendChild(fl);
  try{window.__AX&&window.__AX.SFX2&&window.__AX.SFX2.hatch();}catch(e){}setTimeout(function(){im.style.opacity='1';im.style.transform='translateX(-50%) scale(1)';try{window.__AX.SFX2.clang();}catch(e){}},60);setTimeout(function(){fl.style.opacity='1';try{window.__AX.SFX2.launch();}catch(e){}},900);
  var mx=0,my=0;var pm=function(e){mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5);};addEventListener('pointermove',pm);var bank=0;var t0=performance.now();
  var tick=function(){var cv=null;var cvs=document.querySelectorAll('canvas');for(var ci=0;ci<cvs.length;ci++){if(cvs[ci].style.zIndex==='60'){cv=cvs[ci];break;}}if(!cv){im.remove();fl.remove();removeEventListener('pointermove',pm);return;}bank+=(mx*30-bank)*.08;if(performance.now()-t0>1000){im.style.transition='none';im.style.transform='translateX(calc(-50% + '+(mx*120)+'px)) translateY('+(my*60)+'px) rotate('+bank+'deg)';fl.style.transform='translateX(calc(-50% + '+(mx*120)+'px)) translateY('+(my*60)+'px)';fl.style.opacity=String(.75+Math.random()*.25);}requestAnimationFrame(tick);};requestAnimationFrame(tick);}catch(e){}return r;};})();
