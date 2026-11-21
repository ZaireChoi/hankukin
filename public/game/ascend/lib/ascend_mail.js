/* ASCEND v3.48 — mailbox (loaded after lib/ascend_grow.js)
   One place for everything the game hands out outside of play: update compensation, holiday gifts, coupon rewards
   and the notices. A reward mail is claimed once; notices are read-only mails made from the existing notice list.
   · SYSTEM: mails every pilot receives inside a date window (edit this list to send a new one)
   · coupons: a code typed in the mailbox turns into a reward mail (codes are checked on the device for now —
     real coupons need the server, see docs)
   Stored in the RPG save as r.mail = {got:{id:time}, read:{id:1}, extra:[mails made on this device]}. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function L(ko,en){try{return (typeof LANG!=='undefined'&&LANG==='en')?en:ko;}catch(e){return ko;}}
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var A=function(){return window.__A||null;};
var R=function(){var a=A();return a&&a.R?a.R():null;};
var save=function(){try{A().saveP();}catch(e){}};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
var today=function(){return new Date(Date.now()+9*3600e3).toISOString().slice(0,10);};
var fmt=function(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');};

// ---- mails for everyone: id, from, until (Korean dates, inclusive), kind, title, body, reward ----
// reward keys: shards (coins), cred (credits), gem (crystals), ticket (legendary summon ticket), gear (grade 0-4)
var SYSTEM=[
 {id:'upd348',from:'2026-11-22',until:'2026-12-31',kind:'update',t:['v3.48 업데이트 보상','v3.48 update gift'],b:['분대 던전 200단계, 신규 기동전사 33종, 새 전장과 화면 개편을 기념해 보냅니다.','For the 200-stage squad dungeon, 33 new frames and the new screens.'],rw:{shards:900,cred:3000}},
 {id:'fix348',from:'2026-11-22',until:'2026-12-06',kind:'update',t:['점검 보상','Maintenance gift'],b:['궁극기 게이지와 초반 난이도 조정에 대한 보상입니다.','For the ultimate-gauge fix and the early difficulty changes.'],rw:{shards:300,gear:2}},
 {id:'xmas26',from:'2026-12-24',until:'2026-12-26',kind:'holiday',t:['성탄 선물','Holiday gift'],b:['따뜻한 연말 보내세요, 파일럿.','Happy holidays, pilot.'],rw:{shards:500,ticket:1}},
 {id:'newyear27',from:'2027-01-01',until:'2027-01-03',kind:'holiday',t:['새해 선물','New Year gift'],b:['새해 복 많이 받으세요.','Happy New Year.'],rw:{shards:1000,cred:5000}},
 {id:'seol27',from:'2027-02-05',until:'2027-02-09',kind:'holiday',t:['설 명절 선물','Lunar New Year gift'],b:['즐거운 설 명절 보내세요.','Happy Lunar New Year.'],rw:{shards:1000,gear:3}}];
// ---- coupons (device-side for now): code -> reward ----
var COUPONS={'ASCEND348':{t:['쿠폰 보상 · ASCEND348','Coupon · ASCEND348'],rw:{shards:600,cred:2000}},'SILVERWING':{t:['쿠폰 보상 · SILVERWING','Coupon · SILVERWING'],rw:{shards:300,gear:3}}};

var st=function(){var r=R();if(!r)return null;r.mail=r.mail||{};r.mail.got=r.mail.got||{};r.mail.read=r.mail.read||{};r.mail.extra=r.mail.extra||[];return r;};
var rwText=function(rw){if(!rw)return '';var o=[];if(rw.shards)o.push('<i class="cn"></i>'+fmt(rw.shards));if(rw.cred)o.push('◆ '+fmt(rw.cred));if(rw.gem)o.push('<i class="gm"></i>'+fmt(rw.gem));if(rw.ticket)o.push(L('전설 확정 소환권 ','Legendary ticket ')+'×'+rw.ticket);if(rw.gear!=null)o.push([L('일반','Common'),L('고급','Uncommon'),L('희귀','Rare'),L('영웅','Epic'),L('전설','Legendary')][rw.gear]+L(' 장비',' gear'));return o.join(' · ');};
var give=function(rw){var r=R(),a=A();if(!r||!rw)return;if(rw.shards)r.shards=(r.shards||0)+rw.shards;if(rw.cred)r.cred=(r.cred||0)+rw.cred;if(rw.gem)r.gem=(r.gem||0)+rw.gem;if(rw.ticket)r.legTicket=(r.legTicket||0)+rw.ticket;if(rw.gear!=null){try{r.inv.push(a.mkItem(rw.gear));}catch(e){}}};
var rewards=function(){var r=st();if(!r)return [];var d=today(),out=[];SYSTEM.forEach(function(m){if(d<m.from)return;if(d>m.until&&!r.mail.got[m.id])return;out.push({id:m.id,kind:m.kind,t:L(m.t[0],m.t[1]),b:L(m.b[0],m.b[1]),rw:m.rw,until:m.until,got:!!r.mail.got[m.id],ts:m.from});});
 r.mail.extra.forEach(function(m){out.push({id:m.id,kind:'coupon',t:m.t,b:m.b||'',rw:m.rw,until:'',got:!!r.mail.got[m.id],ts:m.ts});});
 out.sort(function(a,b){return (a.got-b.got)||(a.ts<b.ts?1:-1);});return out;};
var notices=function(){var r=st();try{return (window.__NOTICES||[]).map(function(n,i){var id='n_'+n.d+'_'+i,tt=typeof n.t==='string'?n.t:L(n.t.ko,n.t.en),bb=typeof n.b==='string'?n.b:L(n.b.ko,n.b.en);return {id:id,d:n.d,t:tt,b:bb,read:!!(r&&r.mail.read[id])};});}catch(e){return [];}};
var count=X.mailCount=function(){var n=0;rewards().forEach(function(m){if(!m.got)n++;});notices().slice(0,3).forEach(function(m){if(!m.read)n++;});return n;};
var claim=function(id){var r=st(),m=rewards().filter(function(x){return x.id===id;})[0];if(!m||m.got)return false;give(m.rw);r.mail.got[id]=Date.now();save();return true;};
var coupon=function(code){var r=st();code=String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');var c=COUPONS[code];if(!c)return L('없는 쿠폰 번호입니다.','Unknown coupon code.');var id='c_'+code;if(r.mail.extra.some(function(m){return m.id===id;}))return L('이미 사용한 쿠폰입니다.','This coupon was already used.');r.mail.extra.push({id:id,t:L(c.t[0],c.t[1]),b:L('쿠폰 보상이 도착했습니다.','Your coupon reward has arrived.'),rw:c.rw,ts:today()});save();return '';};

var open=X.mailOpen=function(tab){var r=st();if(!r)return;var ov=document.getElementById('ml348');if(ov)ov.remove();ov=document.createElement('div');ov.id='ml348';ov.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(3,5,11,.9);display:flex;align-items:center;justify-content:center;padding:12px';document.body.appendChild(ov);tab=tab||'gift';var msg='',openId=null;
 var KN={update:L('업데이트','Update'),holiday:L('명절','Holiday'),coupon:L('쿠폰','Coupon')};
 var draw=function(){var rs=rewards(),ns=notices(),left=rs.filter(function(m){return !m.got;}).length,body='';
  if(tab==='gift'){body=(rs.length?rs.map(function(m){return '<div class="epi" style="display:flex;gap:12px;align-items:center;'+(m.got?'opacity:.5':'')+'"><div style="flex:1;min-width:0"><small style="color:#9fb6cf;font-weight:700">'+(KN[m.kind]||'')+(m.until&&!m.got?' · '+L('받을 수 있는 기간 ','until ')+m.until:'')+'</small><br><b>'+esc(m.t)+'</b><br><small style="opacity:.8">'+esc(m.b)+'</small><div style="margin-top:6px;font-weight:700;font-size:13px">'+rwText(m.rw)+'</div></div>'+(m.got?'<span style="color:#7dffd0;font-weight:800;white-space:nowrap">'+L('받음','Claimed')+'</span>':'<button class="pri" data-claim="'+m.id+'" style="padding:10px 18px;white-space:nowrap">'+L('받기','Claim')+'</button>')+'</div>';}).join(''):'<div class="epi" style="opacity:.7">'+L('받을 우편이 없습니다.','No mail.')+'</div>')+
    '<div class="epi" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="white-space:nowrap">'+L('쿠폰 번호','Coupon code')+'</b><input id="mlCode" maxlength="20" placeholder="'+L('번호 입력','Enter code')+'" style="flex:1;min-width:140px;height:36px;border-radius:10px;padding:0 12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#e9eef6;text-transform:uppercase"><button id="mlUse" class="sm" style="height:36px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#e9eef6;cursor:pointer">'+L('등록','Redeem')+'</button>'+(msg?'<small style="width:100%;color:'+(msg.charAt(0)==='✓'?'#7dffd0':'#ffb36b')+'">'+esc(msg)+'</small>':'')+'</div>';}
  else{body=ns.length?ns.map(function(m){var on=openId===m.id;return '<div class="epi" data-note="'+m.id+'" style="cursor:pointer"><div style="display:flex;gap:10px;align-items:center">'+(m.read?'':'<span style="width:8px;height:8px;border-radius:50%;background:#8fe3ff;flex:0 0 8px"></span>')+'<b style="flex:1">'+esc(m.t)+'</b><small style="opacity:.6">'+esc(m.d)+'</small></div>'+(on?'<div class="small" style="margin-top:8px;line-height:1.7;opacity:.9">'+esc(m.b)+'</div>':'')+'</div>';}).join(''):'<div class="epi" style="opacity:.7">'+L('공지가 없습니다.','No notices.')+'</div>';}
  ov.innerHTML='<div class="panel" style="width:min(720px,96vw);max-height:92vh;overflow:auto;padding:18px 20px;color:#e9eef6"><div style="display:flex;align-items:center;margin-bottom:10px"><div style="flex:1"><div style="font:700 11px Rajdhani,sans-serif;letter-spacing:.4em;color:#9fb6cf">MAIL</div><h2 style="margin:2px 0 0">'+L('메일','Mail')+'</h2></div>'+(tab==='gift'&&left>1?'<button id="mlAll" class="pri" style="padding:9px 16px;margin-right:8px">'+L('모두 받기','Claim all')+'</button>':'')+'<button id="mlX" style="width:38px;height:38px;border-radius:19px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e9eef6;cursor:pointer">✕</button></div>'+
   '<div style="display:flex;gap:6px;margin:0 0 12px">'+[['gift',L('보상 우편','Rewards')+(left?' '+left:'')],['note',L('공지','Notices')]].map(function(q){return '<button data-ml="'+q[0]+'" style="padding:8px 14px;border-radius:17px;border:1px solid '+(tab===q[0]?'#cfe0f2':'rgba(255,255,255,.14)')+';background:'+(tab===q[0]?'rgba(190,214,240,.14)':'transparent')+';color:#e9eef6;font-weight:700;cursor:pointer">'+q[1]+'</button>';}).join('')+'</div>'+body+'</div>';
  ov.querySelector('#mlX').onclick=function(){ov.remove();};[].slice.call(ov.querySelectorAll('[data-ml]')).forEach(function(b){b.onclick=function(){tab=b.dataset.ml;msg='';draw();};});
  [].slice.call(ov.querySelectorAll('[data-claim]')).forEach(function(b){b.onclick=function(){if(claim(b.dataset.claim)){msg='';draw();try{A().render&&A().render();}catch(e){}}};});
  var all=ov.querySelector('#mlAll');if(all)all.onclick=function(){rewards().forEach(function(m){if(!m.got)claim(m.id);});draw();try{A().render&&A().render();}catch(e){}};
  var use=ov.querySelector('#mlUse');if(use)use.onclick=function(){var e=coupon(ov.querySelector('#mlCode').value);msg=e||('✓ '+L('쿠폰이 등록됐습니다. 위 우편에서 받으세요.','Coupon added. Claim it from the mail above.'));draw();};
  [].slice.call(ov.querySelectorAll('[data-note]')).forEach(function(d){d.onclick=function(){var id=d.dataset.note;openId=openId===id?null:id;r.mail.read[id]=1;save();draw();};});};
 ov.onclick=function(e){if(e.target===ov)ov.remove();};draw();};

// dock button (lib/ascend_lobby.js moves it into the dock and draws the icon and badge)
guard('btn',function(){setInterval(function(){guard('tick',function(){var sq=document.getElementById('mGrow')||document.getElementById('mSq');if(!sq||!R())return;if(!document.getElementById('mMail')){var b=sq.cloneNode(false);b.id='mMail';b.textContent=L('메일','Mail');b.onclick=function(){open();};sq.parentNode.insertBefore(b,sq.nextSibling);}});},1500);});
})();
