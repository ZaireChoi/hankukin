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
 m_titan:{nose:'heavy',noseLen:.22,fin:.36,flame:0xffb070,alt:40,speed:4,bulk:1.5}        // Titan: heavy gunship
};
function prof(k){var p={};for(var a in BASE)p[a]=BASE[a];var q=PROF[k]||{};for(var b in q)p[b]=q[b];return p;}
function seg(k,a,b){var x=Math.max(0,Math.min(1,(k-a)/(b-a)));return x*x*(3-2*x);}
function G(){return window.__T&&window.__T.G;}
function me(){var g=G();return g&&g.local&&g.local.unit;}
// ---------- state ----------
function isJet(u){return !!(u&&u.tf&&u.tf.mode!=='robot');}
function toggle(u){u=u||me();if(!u||u.dead||u.cls!=='arkframe')return;var g=G();if(!g||g.over)return;u.tf=u.tf||{mode:'robot',k:0};
 if(u.tf.mode==='robot'||u.tf.mode==='toRobot'){u.tf.mode='toJet';}else{u.tf.mode='toRobot';}
 u.tf.mark=-1;try{AX().SFX2&&AX().SFX2.hatch();}catch(e){}}
window.ascendTransform=toggle;
// ---------- input: jets fire lasers only; Q/E/R/T/Z/C/X and number skills are locked ----------
var LOCK={KeyQ:1,KeyE:1,KeyR:1,KeyT:1,KeyZ:1,KeyC:1,KeyX:1,Digit1:1,Digit2:1,Digit3:1,Digit4:1,Digit5:1,Digit6:1};
addEventListener('keydown',function(e){if(e.code==='KeyY'&&!e.repeat){var u=me();if(u&&u.cls==='arkframe'){e.preventDefault();toggle(u);}return;}var u2=me();if(isJet(u2)&&LOCK[e.code]){e.stopImmediatePropagation();e.preventDefault();}},true);
['touchstart','pointerdown','mousedown'].forEach(function(ev){addEventListener(ev,function(e){var u=me();if(!isJet(u))return;var t=e.target;if(!t||!t.closest)return;if(t.closest('#tA1,#tA2,#tUl,#tArt,#tMsl,#tFly,#tDash')||(t.closest('.sk2')&&!t.closest('[data-k="TF"]'))){e.stopImmediatePropagation();e.preventDefault();}},true);});
function hookInput(){var li=window.localInput;if(!li||li.__tf)return;var w=function(u){var inp=li(u);try{if(isJet(u)){inp.a1=false;inp.a2=false;inp.ul=false;inp.ab=false;var g=G();var moving=u.tf.mode==='jet';if(inp.fire&&moving){u._tfFire=(u._tfFire||0)-1/60;if(u._tfFire<=0&&AX().boltFire){u._tfFire=.16;var a=inp.aim!=null?inp.aim:(u.aa||0);try{AX().boltFire(u,a+(Math.random()-.5)*.03,{dmg:22*(1+((window.__plv&&window.__plv())||1)*.03),w:44,vis:46,r:4,spd:3000});}catch(e){}}}inp.fire=false;if(!moving){inp.mx*=.2;inp.my*=.2;}}}catch(e){}return inp;};w.__tf=1;window.localInput=w;}
// ---------- per-frame: progress, speed, protection, sounds ----------
function hookStep(){var st=window.step;if(!st||st.__tf)return;var w=function(dt){st(dt);try{var u=me();if(!u||!u.tf)return;var T=u.tf,p=prof(AX().myMechKey?AX().myMechKey():'');
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
  var ft=s2<0?B.LeftFoot:B.RightFoot;if(ft){var ring=mk(new T.CylinderGeometry(H*.035*p.bulk,H*.045*p.bulk,H*.05,10,1,true),dark);ft.add(ring);o.thr.push(ring);var cg=new T.ConeGeometry(H*.03*p.bulk,H*.28,10,1,true);cg.translate(0,-H*.14,0);var fl=new T.Mesh(cg,new T.MeshBasicMaterial({color:p.flame,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));fl.userData.keep=1;fl.frustumCulled=false;ft.add(fl);o.fl.push(fl);}}
 e._tfP=o;return o;}
function scaleLocal(obj,s,H){obj.scale.setScalar(Math.max(.001,s));}
function hookPose(){var ma=window.mdlAnimate;if(!ma||ma.__tf)return;var w=function(e,m,u,dt,now){ma(e,m,u,dt,now);try{if(!u||!u.tf||!m||!m.obj||!m.wrap)return;var A=AX();var B=A.motBones&&A.motBones(m);if(!B)return;var T=T3();var k=u.tf.k||0;var p=prof(A.myMechKey?A.myMechKey():'');
  var H=(e.wg&&e.wg.H)||((e.mfx&&e.mfx.H)||90);
  var jk=jetKey();var mcj=jk&&A.mc?A.mc(jk):null;if(jk&&!mcj){try{A.mdlGet&&A.mdlGet(jk);}catch(er){}}
  var shellOK=!!(mcj&&mcj.st==='ok');
  var c=seg(k,0,.18),l=seg(k,.1,.42),a=seg(k,.25,.52),pt=seg(k,.4,.7),pa=seg(k,.68,.92),ig=seg(k,.9,1);
  var dip=c*(1-pt);
  // 2 legs fold back into a tail (thighs together and straight back, knees locked)
  var fwd=new T.Vector3(0,0,1),upv=new T.Vector3(0,1,0);
  var qL=function(bone,axis,ang){if(!bone||!ang)return;bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,ang));};
  m.wrap.rotation.z+=(window.__TFSIGN||-1)*pt*p.pitch;m.wrap.position.y+=-H*.08*dip;
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
   if(shellOK){if(m._ws0==null)m._ws0=m.wrap.scale.x;m.wrap.scale.setScalar(m._ws0);shellPose(e,m,u,k,p,H,B);}else if(e._jet){e._jet.grp.visible=false;m.wrap.visible=true;}
   // keep the hips over the unit at flight height (pitching about the feet would push the body ahead of the frame)
   if(B.Hips&&e.root&&pt>0){m.wrap.updateMatrixWorld(true);var hp=new T.Vector3();B.Hips.getWorldPosition(hp);var rp=new T.Vector3();e.root.getWorldPosition(rp);var tgt=new T.Vector3(rp.x,rp.y+H*.5+p.alt*pt,rp.z);var par=m.wrap.parent;if(par){var a1=par.worldToLocal(hp.clone());var a2=par.worldToLocal(hp.clone().lerp(tgt,pt));m.wrap.position.add(a2.sub(a1));m.wrap.updateMatrixWorld(true);}}o.fins.forEach(function(f){f.visible=vis;});o.thr.forEach(function(t){t.visible=vis;});}
 }catch(er){window.__tfErr=String(er&&er.stack||er).slice(0,200);}};w.__tf=1;window.mdlAnimate=w;}

// ================= v2: "shell" transform — a Meshy jet model split into armour pieces; each piece launches from the robot part it comes from and locks into the jet =================
var JETM={mech3:'saberjet',mech4:'mech4_jet',m_sky:'m_sky_jet',m_striker:'m_striker_jet',m_titan:'m_titan_jet'};
function jetKey(){var k=AX().myMechKey?AX().myMechKey():'';return JETM[k]||null;}
var JC={};// split cache per jet model
function splitJet(f){if(JC[f])return JC[f];var T=T3();var c=AX().mc&&AX().mc(f);if(!c||c.st!=='ok'||!c.g)return null;var src=c.g.scene;src.updateMatrixWorld(true);var tris=[];var mat=null;var box=new T.Box3();
 src.traverse(function(o){if(!o.isMesh)return;mat=mat||(Array.isArray(o.material)?o.material[0]:o.material);var g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);var P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;for(var i=0;i<P.count;i+=3){var t={p:[],n:[],u:[]};for(var j=0;j<3;j++){t.p.push(P.getX(i+j),P.getY(i+j),P.getZ(i+j));if(N)t.n.push(N.getX(i+j),N.getY(i+j),N.getZ(i+j));if(U)t.u.push(U.getX(i+j),U.getY(i+j));box.expandByPoint(new T.Vector3(P.getX(i+j),P.getY(i+j),P.getZ(i+j)));}tris.push(t);}});
 var sz=box.getSize(new T.Vector3()),ctr=box.getCenter(new T.Vector3());
 // length axis = longest horizontal; the nose end is the narrower end
 // length axis: the fuselage holds most vertices, so its spread is wider than the thin wings' spread
 var vx=0,vz=0,nv=0;tris.forEach(function(t){for(var i=0;i<9;i+=3){var dx=t.p[i]-ctr.x,dz=t.p[i+2]-ctr.z;vx+=dx*dx;vz+=dz*dz;nv++;}});var LX=vx>=vz;var len=LX?sz.x:sz.z,wid=LX?sz.z:sz.x;var ax=function(p,i){return LX?p[i]-ctr.x:p[i+2]-ctr.z;},sd=function(p,i){return LX?p[i+2]-ctr.z:p[i]-ctr.x;};
 var wA=0,wB=0;tris.forEach(function(t){for(var i=0;i<9;i+=3){var a=ax(t.p,i)/len,s=Math.abs(sd(t.p,i))/wid;if(a>.35)wA=Math.max(wA,s);if(a<-.35)wB=Math.max(wB,s);}});var noseSign=wA<wB?1:-1;
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
function shellBuild(e,f,H,pf){if(e._jet&&e._jet.f===f)return e._jet;var S=splitJet(f);if(!S)return null;var T=T3();var grp=new T.Group();var len=H*1.15;var pcs={};for(var k in S.parts){var m=new T.Mesh(S.parts[k].g,S.mat);m.castShadow=false;m.userData.keep=1;m.frustumCulled=false;var hold=new T.Group();hold.add(m);grp.add(hold);pcs[k]={hold:hold,home:S.parts[k].home.clone().multiplyScalar(len),spin:new T.Euler((Math.random()-.5)*3,(Math.random()-.5)*3,(Math.random()-.5)*3)};hold.scale.setScalar(len);}
 // engine flames at the tail
 var fl=[];for(var s=-1;s<=1;s+=2){var cg=new T.ConeGeometry(len*.035,len*.32,10,1,true);cg.rotateZ(Math.PI/2);cg.translate(-len*.16,0,0);var fm=new T.Mesh(cg,new T.MeshBasicMaterial({color:(pf&&pf.flame)||0xff7a4a,transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));fm.position.set(-len*.5,len*.0,s*len*.06);fm.userData.keep=1;fm.frustumCulled=false;grp.add(fm);fl.push(fm);}
 grp.userData.keep=1;e._jet={f:f,grp:grp,pcs:pcs,fl:fl,len:len};return e._jet;}
function shellPose(e,m,u,k,p,H,B){var T=T3();var J=shellBuild(e,jetKey(),H,p);if(!J)return false;var par=m.wrap.parent;if(!par)return false;if(J.grp.parent!==par)par.add(J.grp);
 // jet frame: same place/heading as the robot, lifted to flight height (robot wrap faces +X)
 var lift=seg(k,.35,.9);J.grp.position.set(m.wrap.position.x,H*.45+p.alt*lift,m.wrap.position.z);J.grp.rotation.set(0,m.wrap.rotation.y,0);J.grp.visible=k>.02;J.grp.updateMatrixWorld(true);
 var inv=new T.Matrix4().copy(J.grp.matrixWorld).invert();var wp=new T.Vector3();
 for(var key in J.pcs){var pc=J.pcs[key];var st=ORDER[key]||0;var kk=seg(k,.18+st,.62+st);var src=B[SRC[key]]||B.Spine||B.Hips;src.getWorldPosition(wp);var from=wp.clone().applyMatrix4(inv);
  pc.hold.position.copy(from).lerp(pc.home,kk);var ov=Math.sin(kk*Math.PI)*.18;pc.hold.position.y+=ov*J.len*.15;
  pc.hold.rotation.set(pc.spin.x*(1-kk),pc.spin.y*(1-kk),pc.spin.z*(1-kk));pc.hold.scale.setScalar(J.len*(.25+.75*kk));pc.hold.visible=kk>.01;
  if(kk>=.999&&!pc.locked){pc.locked=1;try{AX().SFX2&&AX().SFX2.clang();}catch(er){}var P2=AX().part;if(P2){var w=pc.hold.getWorldPosition(new T.Vector3());for(var i=0;i<6;i++){var b=Math.random()*6.28;P2(w.x,w.z,Math.cos(b)*160,Math.sin(b)*160,.2,'#ffe2c0',3,w.y);}}}
  if(kk<.9)pc.locked=0;}
 // the robot folds and shrinks into the hull, then hides inside it
 var hide=seg(k,.55,.92);m.wrap.scale.setScalar((m._ws0||1)*(1-.55*hide));m.wrap.visible=k<.93;
 var ig=seg(k,.9,1);var sp=Math.hypot(u.vx||0,u.vy||0);J.fl.forEach(function(f){f.visible=ig>.02;f.scale.set(1,ig*(.7+Math.min(1,sp/900)*.9)*(1+Math.random()*.15),1);});
 return true;}

// ---------- skill bar: rightmost cell + phone button ----------
function addCell(){var bar=document.getElementById('skb2');if(!bar||document.getElementById('skTF'))return;var row=bar.querySelector('div[style*="display:flex"]')||bar;var d=document.createElement('div');d.className='sk2';d.id='skTF';d.dataset.k='TF';d.title='변신 / Transform [Y]';
 d.style.cssText='position:relative;width:52px;height:52px;border-radius:8px;border:1px solid rgba(255,140,110,.6);background:linear-gradient(160deg,#2a0d10,#120609);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto';
 d.innerHTML='<span style="position:absolute;left:4px;top:2px;font:800 10px sans-serif;color:#ffd2c8">Y</span><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#ff8a70" stroke-width="1.6"><path d="M12 3v7M5 13l7-3 7 3M8 21l4-3 4 3M12 10v8"/></svg><em id="skTFs" style="position:absolute;bottom:2px;right:4px;font:700 9px sans-serif;color:#ffb0a0;font-style:normal">변신</em>';
 d.addEventListener('pointerdown',function(e){e.stopPropagation();e.preventDefault();toggle();});row.appendChild(d);}
function syncCell(){var s=document.getElementById('skTFs');var u=me();if(!s)return;var j=isJet(u);var t=j?(u.tf.mode==='jet'?'비행':'…'):'변신';if(s.textContent!==t)s.textContent=t;var d=document.getElementById('skTF');if(d)d.style.boxShadow=j?'0 0 10px rgba(255,120,90,.7)':'none';}
function boot(){hookInput();hookStep();hookPose();addCell();syncCell();}
setInterval(boot,600);
window.__TF={toggle:toggle,prof:prof,PROF:PROF,set:function(k){var u=me();if(!u)return;u.tf={mode:'hold',k:k,mark:-1};}};
})();

;(function(){var IMG={mech3:'saberjet',mech4:'mech4_jet',m_sky:'m_sky_jet',m_striker:'m_striker_jet',m_titan:'m_titan_jet'};
 function hook(){var f=window.flyTo;if(!f||f.__tf)return;var w=function(h){var r=f.apply(this,arguments);try{var k=(window.__AX&&window.__AX.myMechKey&&window.__AX.myMechKey())||'mech3';var jk=IMG[k]||'saberjet';var im=document.createElement('img');im.src='bg/jetrear_'+jk+'.png';im.id='tfJetFly';im.style.cssText='position:fixed;left:50%;bottom:9%;width:min(34vw,420px);transform:translateX(-50%) scale(.2);opacity:0;z-index:61;pointer-events:none;transition:transform .9s cubic-bezier(.2,1.4,.4,1),opacity .4s;filter:drop-shadow(0 0 18px rgba(255,140,90,.55))';document.body.appendChild(im);
  var fl=document.createElement('div');fl.style.cssText='position:fixed;left:50%;bottom:7%;width:min(16vw,200px);height:min(9vw,110px);transform:translateX(-50%);z-index:60;pointer-events:none;background:radial-gradient(ellipse at 50% 0%,rgba(255,200,140,.9),rgba(255,110,60,.35) 45%,transparent 70%);filter:blur(4px);opacity:0;transition:opacity .6s';document.body.appendChild(fl);
  try{window.__AX&&window.__AX.SFX2&&window.__AX.SFX2.hatch();}catch(e){}setTimeout(function(){im.style.opacity='1';im.style.transform='translateX(-50%) scale(1)';try{window.__AX.SFX2.clang();}catch(e){}},60);setTimeout(function(){fl.style.opacity='1';try{window.__AX.SFX2.launch();}catch(e){}},900);
  var mx=0,my=0;var pm=function(e){mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5);};addEventListener('pointermove',pm);var bank=0;var t0=performance.now();
  var tick=function(){var cv=document.querySelector('canvas[style*="z-index:60"]');if(!cv){im.remove();fl.remove();removeEventListener('pointermove',pm);return;}bank+=(mx*30-bank)*.08;if(performance.now()-t0>1000){im.style.transition='none';im.style.transform='translateX(calc(-50% + '+(mx*120)+'px)) translateY('+(my*60)+'px) rotate('+bank+'deg)';fl.style.transform='translateX(calc(-50% + '+(mx*120)+'px)) translateY('+(my*60)+'px)';fl.style.opacity=String(.75+Math.random()*.25);}requestAnimationFrame(tick);};requestAnimationFrame(tick);}catch(e){}return r;};w.__tf=1;window.flyTo=w;}
 setInterval(hook,800);})();
