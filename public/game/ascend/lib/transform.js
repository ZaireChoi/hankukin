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
  var c=seg(k,0,.18),l=seg(k,.1,.42),a=seg(k,.25,.52),pt=seg(k,.4,.7),pa=seg(k,.68,.92),ig=seg(k,.9,1);
  var dip=c*(1-pt);
  // 1 crouch → 4 body pitches level; altitude rises with the pitch
  m.wrap.rotation.z+=(window.__TFSIGN||-1)*pt*p.pitch;m.wrap.position.y+=-H*.08*dip+p.alt*pt;
  // 2 legs fold back into a tail (thighs together and straight back, knees locked)
  var fwd=new T.Vector3(0,0,1),upv=new T.Vector3(0,1,0);
  var qL=function(bone,axis,ang){if(!bone||!ang)return;bone.quaternion.multiply(new T.Quaternion().setFromAxisAngle(axis,ang));};
  qL(B.LeftUpLeg,new T.Vector3(1,0,0),-p.legFold*l);qL(B.RightUpLeg,new T.Vector3(1,0,0),-p.legFold*l);
  qL(B.LeftUpLeg,new T.Vector3(0,0,1),.12*l);qL(B.RightUpLeg,new T.Vector3(0,0,1),-.12*l);
  // 3 arms lock against the body
  qL(B.LeftArm,new T.Vector3(0,0,1),-p.armTuck*a*.6);qL(B.RightArm,new T.Vector3(0,0,1),p.armTuck*a*.6);qL(B.LeftForeArm,new T.Vector3(1,0,0),.4*a);qL(B.RightForeArm,new T.Vector3(1,0,0),.4*a);
  if(B.Head)qL(B.Head,new T.Vector3(1,0,0),-.9*pt);// head looks forward along the flight line
  // 6 nose / side panels / thrusters slide out and lock
  var o=parts(e,m,H,p);if(o){scaleLocal(o.nose,pa,H);o.nose.position.z=(1-pa)*-H*.05;for(var i=0;i<o.fins.length;i++){var fg=o.fins[i];fg.scale.set(Math.max(.001,pa),1,Math.max(.001,pa));fg.rotation.y=fg.userData.side*(1-pa)*1.2;}for(var j=0;j<o.thr.length;j++)scaleLocal(o.thr[j],pa,H);
   // 7 ignition
   var sp=Math.hypot(u.vx||0,u.vy||0);for(var q=0;q<o.fl.length;q++){var fl=o.fl[q];fl.visible=ig>.02;fl.scale.set(1,ig*(.7+Math.min(1,sp/900)*.8)*(1+Math.random()*.15),1);}
   if(k>.45){try{if(e.eq&&e.eq.o)for(var n in e.eq.o){var eo=e.eq.o[n];if(eo&&eo.isObject3D)eo.visible=false;}if(e.grip)['hilt','sgun','blade2','palm'].forEach(function(n2){if(e.grip[n2])e.grip[n2].visible=false;});if(e.mfx&&e.mfx.saber)e.mfx.saber.visible=false;}catch(er){}}
   var vis=k>.01;o.nose.visible=vis;o.fins.forEach(function(f){f.visible=vis;});o.thr.forEach(function(t){t.visible=vis;});}
 }catch(er){window.__tfErr=String(er&&er.stack||er).slice(0,200);}};w.__tf=1;window.mdlAnimate=w;}
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
