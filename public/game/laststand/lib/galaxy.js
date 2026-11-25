// ASCEND 은하 전도 (ASCEND 본편에서 그대로 가져옴)
window.ASCEND_GALAXY={
 regions:[
  {k:'emp',lx:34,ly:11,n:{ko:'은하 제국',en:'Galactic Empire'},c:'255,70,90',pts:[[8,6],[46,4],[54,16],[44,30],[30,34],[14,30],[6,18]]},
  {k:'fed',lx:17,ly:90,n:{ko:'자유주의 연맹',en:'Liberty Federation'},c:'80,170,255',pts:[[3,46],[22,42],[34,52],[30,78],[18,96],[3,94]]},
  {k:'neu',lx:39.5,ly:44,n:{ko:'중립 회랑',en:'Neutral Corridor'},c:'160,220,255',pts:[[22,40],[34,32],[42,40],[36,50],[26,48]]},
  {k:'zeta',lx:61,ly:67,n:{ko:'제타 확산 지대',en:'Zeta Expanse'},c:'255,150,40',pts:[[40,52],[56,44],[70,62],[64,88],[44,92],[36,74]]},
  {k:'alpha',lx:61,ly:9,n:{ko:'알파 망명 항로',en:'Alpha Exile Route'},c:'197,140,255',pts:[[50,6],[74,4],[80,20],[66,32],[54,24]]},
  {k:'lumen',lx:79,ly:69,n:{ko:'루멘 성운',en:'Lumen Nebula'},c:'255,210,110',pts:[[66,48],[80,46],[84,64],[72,72],[64,62]]},
  {k:'omega',lx:92,ly:47,n:{ko:'오메가 지배권',en:'Omega Dominion'},c:'150,60,220',pts:[[84,14],[99,8],[99,60],[90,52],[82,36]]},
  {k:'void',lx:92.5,ly:91,n:{ko:'허무의 균열',en:'Void Rift'},c:'255,90,110',pts:[[86,68],[99,66],[99,96],[84,94]]}],
 places:[
  {id:'earth',n:{ko:'지구 · 네오 서울',en:'Earth · Neo Seoul'},x:12,y:72,c:'#5ad1ff',r:1.5},
  {id:'capital_e',n:{ko:'제국 수도 성계 아우렐리아',en:'Imperial Capital Aurelia'},x:18,y:20,c:'#ff6b7a',r:1.3},
  {id:'capital_f',n:{ko:'연맹 수도 리베르타스',en:'Federation Capital Libertas'},x:7,y:54,c:'#7fb8ff',r:1.2},
  {id:'aegis',n:{ko:'궤도 기지 이지스',en:'Orbital Station Aegis'},x:30,y:40,c:'#9fe0ff',r:1},
  {id:'eden',n:{ko:'알파 모성 에덴 (폐허)',en:'Alpha Homeworld Eden (ruins)'},x:70,y:20,c:'#c58cff',r:1.2},
  {id:'ignis',n:{ko:'화산 행성 이그니스',en:'Volcanic World Ignis'},x:46,y:72,c:'#ff7a2a',r:1.1},
  {id:'niv',n:{ko:'빙하 위성 니브',en:'Glacial Moon Niv'},x:58,y:28,c:'#bfe9ff',r:1},
  {id:'hive',n:{ko:'제타 대모 하이브',en:'Zeta Mother Hive'},x:56,y:84,c:'#ffa040',r:1.3},
  {id:'lumen',n:{ko:'빛의 사원 루멘',en:'Temple of Lumen'},x:74,y:58,c:'#ffd166',r:1.2},
  {id:'gate',n:{ko:'거인의 문',en:'Gate of Giants'},x:86,y:34,c:'#c58cff',r:1.3},
  {id:'omega',n:{ko:'오메가 본성 아르케',en:'Omega Throneworld Arche'},x:95,y:22,c:'#9a5cff',r:1.6},
  {id:'sanctum',n:{ko:'??? 신기 성소',en:'??? Divine Sanctum'},x:93,y:80,c:'#ff6b6b',r:1},
  {id:'core',n:{ko:'은하 중심 · 대흑점',en:'Galactic Core'},x:50,y:50,c:'#ffffff',r:2.4}],
 lanes:[['earth','capital_f'],['earth','aegis'],['capital_f','aegis'],['capital_e','aegis'],['capital_e','eden'],['aegis','niv'],['aegis','ignis'],['niv','eden'],['ignis','hive'],['ignis','lumen'],['niv','gate'],['lumen','gate'],['gate','omega'],['lumen','sanctum'],['hive','lumen']],
 draw(cv,opt){opt=opt||{};const g=cv.getContext('2d'),W=cv.width,H=cv.height,L=opt.lang||'ko',X=p=>p/100*W,Y=p=>p/100*H,S=Math.min(W,H)/100;let seed=7;const rn=()=>(seed=(seed*16807)%2147483647)/2147483647;
  g.fillStyle='#03040b';g.fillRect(0,0,W,H);
  // spiral galaxy glow
  g.save();g.translate(X(50),Y(50));for(let arm=0;arm<4;arm++){for(let i=0;i<900;i++){const t=i/900,a=arm*Math.PI/2+t*5.2,rr=t*Math.min(W,H)*.62;const x=Math.cos(a)*rr+(rn()-.5)*rr*.18,y=Math.sin(a)*rr*.62+(rn()-.5)*rr*.12;g.fillStyle=`rgba(${180+rn()*75|0},${170+rn()*60|0},${255},${(1-t)*.16*rn()})`;g.fillRect(x,y,1+rn()*2,1+rn()*2);}}
  const cg=g.createRadialGradient(0,0,0,0,0,S*16);cg.addColorStop(0,'rgba(255,240,210,.9)');cg.addColorStop(.15,'rgba(255,200,140,.45)');cg.addColorStop(.5,'rgba(140,90,200,.18)');cg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=cg;g.fillRect(-S*16,-S*16,S*32,S*32);g.fillStyle='#000';g.beginPath();g.arc(0,0,S*1.3,0,6.28);g.fill();g.strokeStyle='rgba(255,220,160,.8)';g.lineWidth=S*.25;g.beginPath();g.ellipse(0,0,S*2.6,S*.9,.3,0,6.28);g.stroke();g.restore();
  // nebulae
  for(let i=0;i<26;i++){const x=rn()*W,y=rn()*H,r=S*(6+rn()*18);const cs=['120,70,220','40,140,230','230,80,140','255,160,60','60,200,200'][i%5];const ng=g.createRadialGradient(x,y,0,x,y,r);ng.addColorStop(0,`rgba(${cs},${.10+rn()*.1})`);ng.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=ng;g.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<2600;i++){const b=rn();g.fillStyle=`rgba(255,255,255,${b*.8})`;const s=b>.985?2.2:b>.9?1.4:.8;g.fillRect(rn()*W,rn()*H,s,s);}
  // grid
  g.strokeStyle='rgba(120,170,255,.06)';g.lineWidth=1;for(let i=0;i<=20;i++){g.beginPath();g.moveTo(X(i*5),0);g.lineTo(X(i*5),H);g.stroke();g.beginPath();g.moveTo(0,Y(i*5));g.lineTo(W,Y(i*5));g.stroke();}
  // territories
  for(const R of this.regions){g.beginPath();R.pts.forEach((p,i)=>{const x=X(p[0]),y=Y(p[1]);if(i)g.lineTo(x,y);else g.moveTo(x,y);});g.closePath();const cx=R.pts.reduce((a,p)=>a+p[0],0)/R.pts.length,cy=R.pts.reduce((a,p)=>a+p[1],0)/R.pts.length;const rg=g.createRadialGradient(X(cx),Y(cy),0,X(cx),Y(cy),S*28);rg.addColorStop(0,`rgba(${R.c},.22)`);rg.addColorStop(1,`rgba(${R.c},.04)`);g.fillStyle=rg;g.fill();g.setLineDash([S*.9,S*.6]);g.strokeStyle=`rgba(${R.c},.65)`;g.lineWidth=Math.max(1.2,S*.18);g.stroke();g.setLineDash([]);
   if(opt.labels!==false){g.font=`800 ${Math.round(S*2.1)}px "Noto Sans KR",sans-serif`;g.textAlign='center';g.fillStyle=`rgba(${R.c},.85)`;g.shadowColor='#000';g.shadowBlur=6;g.fillText(R.n[L],X(R.lx),Y(R.ly));if(L==='ko'){g.font=`600 ${Math.round(S*1.2)}px sans-serif`;g.fillStyle=`rgba(${R.c},.6)`;g.fillText(R.n.en.toUpperCase(),X(R.lx),Y(R.ly)+S*1.6);}g.shadowBlur=0;}}
  // hyperlanes
  const P=Object.fromEntries(this.places.map(p=>[p.id,p]));g.lineWidth=Math.max(1,S*.14);if(opt.lanes!==false)for(const[a,b]of this.lanes){const A=P[a],B=P[b];const gr=g.createLinearGradient(X(A.x),Y(A.y),X(B.x),Y(B.y));gr.addColorStop(0,A.c+'aa');gr.addColorStop(1,B.c+'aa');g.strokeStyle=gr;g.setLineDash([S*.5,S*.5]);g.beginPath();g.moveTo(X(A.x),Y(A.y));g.lineTo(X(B.x),Y(B.y));g.stroke();}g.setLineDash([]);
  // places
  if(opt.places!==false)for(const p of this.places){if(p.id==='core'||(opt.skip&&opt.skip.includes(p.id)))continue;const x=X(p.x),y=Y(p.y),r=S*p.r;const pg=g.createRadialGradient(x,y,0,x,y,r*4);pg.addColorStop(0,p.c+'cc');pg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=pg;g.fillRect(x-r*4,y-r*4,r*8,r*8);const bg=g.createRadialGradient(x-r*.4,y-r*.4,r*.1,x,y,r);bg.addColorStop(0,'#fff');bg.addColorStop(.35,p.c);bg.addColorStop(1,'#111');g.fillStyle=bg;g.beginPath();g.arc(x,y,r,0,6.28);g.fill();
   g.font=`700 ${Math.round(S*1.45)}px "Noto Sans KR",sans-serif`;g.textAlign='center';g.fillStyle='#fff';g.shadowColor='#000';g.shadowBlur=5;g.fillText(p.n[L],x,y+r+S*2.1);g.shadowBlur=0;}
  if(opt.title!==false){g.textAlign='left';g.font=`900 ${Math.round(S*3.2)}px "Noto Sans KR",sans-serif`;g.fillStyle='#ffd166';g.shadowColor='rgba(255,209,102,.6)';g.shadowBlur=14;g.fillText(L==='ko'?'ASCEND 은하 전도 · 2326':'ASCEND GALAXY MAP · 2326',X(2),Y(5.5));g.shadowBlur=0;g.font=`600 ${Math.round(S*1.3)}px sans-serif`;g.fillStyle='rgba(200,215,255,.75)';g.fillText(L==='ko'?'창조주의 죄, 피조물의 별':'Sin of the Creators, Star of the Created',X(2),Y(8.6));}
  if(opt.legend!==false){const ly=Y(97.2);g.fillStyle='rgba(4,8,18,.72)';g.fillRect(0,ly-S*2.2,W,S*3.6);let lx=X(2);g.font=`800 ${Math.round(S*1.25)}px "Noto Sans KR",sans-serif`;g.fillStyle='#fff';g.textAlign='left';g.fillText(L==='ko'?'세력':'Factions',lx,ly);lx+=S*6;this.regions.forEach((R)=>{g.fillStyle=`rgba(${R.c},.9)`;g.fillRect(lx,ly-S*1.05,S*1.3,S*1.3);g.fillStyle='#dfe8ff';g.font=`600 ${Math.round(S*1.15)}px "Noto Sans KR",sans-serif`;g.fillText(R.n[L],lx+S*1.9,ly);lx+=S*(2.6+g.measureText(R.n[L]).width/S+1.6);});}}
};
