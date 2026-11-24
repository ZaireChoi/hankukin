/* ASCEND v3.66 — tension 19-1: auto battle must not be a stroll (manager v3.65: 81 s, S, 0 deaths, lowest HP 83 %)
   Only while AUTO battle is on (hands-on play keeps the normal numbers and all the new hit effects):
   · the longer quick-battle score pool is guaranteed (1.7x was skipped when the match was started through another path)
   · enemies hit my frame harder (about x2.5 in total, +5 % per kill in the current streak, up to +50 %)
   · my blows no longer knock enemies down or stun them (knock-back stays) — the auto pilot was locking whole squads
   · enemy frames hunt me: every 7 s the two nearest enemy frames / elites (within 1600) set me as their target and goal,
     with a bounty (5+ streak) four of them, and a strike team (3 elite walkers) drops in every 20 s
   · enemy elites and frames get +30 % health when they spawn, so focus fire takes time */
(function () {
  'use strict';
  var on = function () { try { return typeof G !== 'undefined' && G && G.local && !G.over && !G.rpg && !G.arena && !G.inv && !G.client && typeof P !== 'undefined' && P.autoHunt; } catch (e) { return false; } };
  var base = function () { try { return typeof G !== 'undefined' && G && G.local && !G.over && !G.rpg && !G.arena && !G.inv && !G.client; } catch (e) { return false; } };
  var me = function () { return G.local && G.local.unit; };
  var streak = function () { try { return G.local.streak || G.local.ks || 0; } catch (e) { return 0; } };
  var hunt = function (u, n) {
    var c = G.units.filter(function (e) { return !e.dead && e.team !== u.team && e.team !== 2 && (e.cls === 'arkframe' || e.elite || e.elite2 || e.eMech || e.named || e.arm === 'heavy') && Math.hypot(e.x - u.x, e.y - u.y) < 1600; })
      .sort(function (a, b) { return Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y); }).slice(0, n);
    c.forEach(function (e) { e._hunt = 1; e.tgt = u; e.forceTgt = u; e.forceT = 7; if (e.bot) { e.bot.tgt = u; e.bot.goal = { x: u.x, y: u.y, r: 120 }; e.bot.asg = null; e.bot.asgT = 7; } });
    return c.length;
  };
  var tH = 0, tS = 0, seenG = null, buffed = new WeakSet();
  var hook = function () {
  // ---- v3.70 (20-1/20-2/20-4) ----
  // auto battle: level-up perks are taken silently (the card is never shown)
  if (!window.__t2Perk && typeof offerPerks === 'function') { window.__t2Perk = 1; var op = offerPerks; offerPerks = function (s) { try { if (typeof P !== 'undefined' && P.autoHunt && G && G.local && s === G.local) { var ch = perkChoices(s); if (ch && ch.length) addPerk(s, ch[0]); return; } } catch (e) {} return op.apply(this, arguments); }; }
  // the enemy HQ must be earned: my frame alone chips it slowly on auto, the HQ guns bite hard when I stand at its door
  if (!window.__t2Core && typeof hurtStruct === 'function') { window.__t2Core = 1; var hs = hurtStruct; hurtStruct = function (s, amt, src) { try { var u0 = me(); if (on() && s && s.kind === 'core' && s.team !== u0.team && src && (src === G.local || src.unit === u0)) amt *= .3; } catch (e) {} return hs.call(this, s, amt, src); }; }
  var nearEnemyHQ = function (u) { try { for (var i = 0; i < G.structs.length; i++) { var s = G.structs[i]; if (!s.dead && s.kind === 'core' && s.team !== u.team && Math.hypot(s.x - u.x, s.y - u.y) < 1000) return true; } } catch (e) {} return false; };
  var ev = { g: null, e60: 0, e90: 0, zones: [] };
  var bigEvents = function (dt) {
    var u = me(); if (!u) return; if (ev.g !== G) { ev.g = G; ev.e60 = ev.e90 = 0; ev.zones.length = 0; }
    var team = 1 - u.team, own = (G.slots || []).filter(function (s) { return s.team === team; })[0];
    if (!ev.e60 && G.t >= 60) { ev.e60 = 1;   // reinforcements drop between me and the front
      if (own && typeof spawnMinion === 'function') { var A = Math.random() * 6.283; for (var k = 0; k < 6; k++) { var m = spawnMinion(own, k < 2 ? 'walker' : 'heavy', u.x + Math.cos(A) * 700 + (Math.random() - .5) * 260, u.y + Math.sin(A) * 700 + (Math.random() - .5) * 260, 600, 0); if (m) { m.elite = 1; m._hunt = 1; m.tgt = u; if (m.bot) m.bot.tgt = u; } } }
      try { announce('', L('적 증원 강하!', 'ENEMY REINFORCEMENTS!'), L('정예 강하 부대가 전선에 내려앉는다', 'An elite drop team lands on the front'), true, '#ff9b9b'); } catch (e) {} }
    if (!ev.e90 && G.t >= 90) { ev.e90 = 1;   // orbital strike warning: 5 marked circles around me, they burst 2.5 s later
      for (var z = 0; z < 5; z++) { var a = z / 5 * 6.283 + Math.random(), d = 120 + Math.random() * 380; ev.zones.push({ x: u.x + Math.cos(a) * d, y: u.y + Math.sin(a) * d, r: 150, t: 2.5 + z * .25 }); }
      try { announce('', L('궤도 포격 경보!', 'ORBITAL STRIKE INBOUND!'), L('붉은 원에서 벗어나라', 'Get out of the red circles'), true, '#ff7a5a'); } catch (e) {} }
    for (var i = ev.zones.length - 1; i >= 0; i--) { var Z = ev.zones[i]; Z.t -= dt;
      if (Z.t > 0) { if (Math.random() < .5) { var b = Math.random() * 6.283; try { part(Z.x + Math.cos(b) * Z.r, Z.y + Math.sin(b) * Z.r, 0, 0, .25, '#ff4a3a', 5, 4); } catch (e) {} } continue; }
      ev.zones.splice(i, 1); try { fx(0, Z.x, Z.y, 90); } catch (e) {} for (var j = 0; j < G.units.length; j++) { var e2 = G.units[j]; if (e2.dead || e2.layer > 0) continue; if (Math.hypot(e2.x - Z.x, e2.y - Z.y) < Z.r + (e2.r || 0)) try { hurt(e2, (e2.mhp || 200) * (e2 === u ? .22 : .35), own || null, 0, 'x'); } catch (er) {} } }
  };
  if (!window.__t2Ev && typeof step === 'function') { window.__t2Ev = 1; var stE = step; step = function (dt) { stE(dt); try { if (on()) bigEvents(dt); } catch (e) { window.__t2Err = String(e).slice(0, 160); } }; }
  if (!window.__t2Hq && typeof hurt === 'function') { window.__t2Hq = 1; var hu2 = hurt; hurt = function (u, amt, src, ang, dt) { try { if (on() && u && u === me() && src && src.team !== u.team && nearEnemyHQ(u)) amt *= 1.8; } catch (e) {} return hu2(u, amt, src, ang, dt); }; }

    if (!window.__t2Hurt && typeof hurt === 'function') { window.__t2Hurt = 1; var hu = hurt;
      hurt = function (u, amt, src, ang, dt) { try { if (on() && u && u === me() && src && src.team !== u.team) amt *= 1.6 * (1 + Math.min(.5, streak() * .05)); } catch (e) {} return hu(u, amt, src, ang, dt); }; }
    if (!window.__t2Step && typeof step === 'function') { window.__t2Step = 1; var st = step;
      step = function (dt) { st(dt);
        try {
          if (!base()) return;
          if (G !== seenG) { seenG = G; tH = tS = 0; try { ['wbRes', 'wbPanel', 'wbOpen'].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); }); } catch (e) {} if (G.tk && !G.__tk17 && G.tkMax) { G.__tk17 = 1; G.tk = G.tk.map(function (v) { return Math.round(v * 1.7); }); G.tkMax = Math.round(G.tkMax * 1.7); } }
          if (!on()) return; var u = me(); if (!u || u.dead) return;
          for (var i = 0; i < G.units.length; i++) { var e = G.units[i]; if (e.dead || e.team === u.team || e.team === 2 || buffed.has(e)) continue; buffed.add(e); if (e.cls === 'arkframe' || e.elite || e.elite2 || e.named || e.eMech) { e.mhp = Math.round((e.mhp || 100) * 1.3); e.hp = Math.min(e.mhp, (e.hp || 0) * 1.3); } }
          tH += dt; tS += dt; var bounty = streak() >= 5;
          if (tH >= 7) { tH = 0; hunt(u, bounty ? 4 : 2); }
          if (tS >= 20) { tS = 0; var team = 1 - u.team, own = (G.slots || []).filter(function (s) { return s.team === team; })[0], A = Math.random() * 6.283;
            if (own && typeof spawnMinion === 'function') { for (var k = 0; k < 3; k++) { var m = spawnMinion(own, 'walker', u.x + Math.cos(A) * 560 + (Math.random() - .5) * 140, u.y + Math.sin(A) * 560 + (Math.random() - .5) * 140, 600, 0); if (m) { m.elite = 1; m._hunt = 1; m.tgt = u; if (m.bot) m.bot.tgt = u; } }
              try { pop(L('적 강습대 접근!', 'Enemy strike team!'), '#ff9b9b', false); } catch (e) {} } }
        } catch (e) { window.__t2Err = String(e).slice(0, 160); }
      }; }
  };
  // 19-5: on auto battle the level-up card picks itself (first choice) after 1.2 s instead of covering the screen
  setInterval(function () { try { if (typeof P === 'undefined' || !P.autoHunt) return; var box = document.getElementById('perkPick'); if (!box || box.offsetParent === null || getComputedStyle(box).display === 'none') { box && (box._t0 = 0); return; } if (!box._t0) { box._t0 = performance.now(); return; } if (performance.now() - box._t0 > 1200) { var b = box.querySelector('button[data-k]'); box._t0 = 0; if (b) b.click(); } } catch (e) {} }, 300);
  // 19-5: the 5v5 top bar (#arHud) stayed on the main menu and the weekly boss after leaving 5v5 - shown only inside 5v5 now
  setInterval(function () { try { var el = document.getElementById('arHud'); if (!el) return; var inA = typeof G !== 'undefined' && G && G.arena && !G.over; var want = inA ? 'flex' : 'none'; if (el.style.display !== want) el.style.display = want; } catch (e) {} }, 300);
  // 20-8: a leftover weekly-boss window never sits over the next battle (5v5 included)
  var lastAnyG = null; setInterval(function () { try { var g = (typeof G !== 'undefined') ? G : null; if (g && g.local && !g.over && g !== lastAnyG) { lastAnyG = g; ['wbRes', 'wbPanel', 'wbOpen'].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); }); } } catch (e) {} }, 400);
  window.__autoSoftCC = function (a) { try { return on() && a && a === me(); } catch (e) { return false; } };   // read by combat2: no knock-down / stun from my blows on auto
  setInterval(function () { try { hook(); } catch (e) {} }, 500);
})();

/* v3.83 (manager 22-5): battle length. A faction battle was won in 79 s (inside the enemy base at 46 s). The enemy HQ can be
   damaged only while we hold 2+ points (engine rule), and now it also cannot fall below 15 % of its health before 2:00 of
   battle time - its last shield holds, the defenders keep coming. 5v5 lanes, story and boss modes are not affected. */
(function(){var told=0;var hook=function(){if(window.__hkCoreMin||typeof hurtStruct!=='function')return;window.__hkCoreMin=1;var hs=hurtStruct;
 hurtStruct=function(s,amt,src){try{if(s&&s.kind==='core'&&!s.dead&&(typeof G!=='undefined'?G:undefined)&&G.local&&s.team!==G.local.team&&!(typeof arOn==='function'&&arOn())&&!(G.rpg&&G.rpg.obj&&/squad|kill|survive|hunt|field|rift/.test(G.rpg.obj.k||''))&&G.t<120){var mh=s.mhp||s.maxHp||s.hp0||0;if(!mh){s.hp0=s.hp0||s.hp;mh=s.hp0;}var floor=mh*.15;if(s.hp-amt<floor){amt=Math.max(0,s.hp-floor);if(G.t-told>8){told=G.t;try{announce('⛨',L2('적 사령부 최후 방어막','Enemy HQ last shield'),L2('2분 전에는 함락되지 않는다 · 거점을 지켜라','It will not fall before 2:00 · hold the points'),true,'#ff9b5a');}catch(e){}}}}}catch(e){}return hs(s,amt,src);};};
 var L2=function(k,e){try{return (typeof LANG!=='undefined'&&LANG==='en')?e:k;}catch(er){return k;}};setInterval(function(){try{hook();}catch(e){}},500);})();

/* v3.84 (manager 23-5): the auto pilot played alone - at the enemy base by 44 s, 426 kills vs 11 for the next ally, 0 captures.
   Now in faction battles the auto pilot (my frame only) first takes the nearest point we do not hold, fights near it, and
   pulls back from the enemy base while we hold fewer than 2 points or before 2:00. Manual play is unchanged. */
(function(){var steerObj=function(u,inp){try{var g=(typeof G!=='undefined'?G:undefined);if(!g||!g.local||u!==g.local.unit||g.over||u.dead)return inp;if(typeof arOn==='function'&&arOn())return inp;if(g.rpg&&g.rpg.obj&&/squad|kill|survive|hunt|field|rift/.test(g.rpg.obj.k||''))return inp;if(!g.pts||!g.pts.length||typeof BASES==='undefined')return inp;
   var T=u.team,EB=BASES[1-T],held=0,best=null,bd=1e12;for(var i=0;i<g.pts.length;i++){var p=g.pts[i];if(p.owner===T){held++;continue;}var d=(p.x-u.x)*(p.x-u.x)+(p.y-u.y)*(p.y-u.y);if(d<bd){bd=d;best=p;}}
   var dEB=Math.hypot(EB.x-u.x,EB.y-u.y),near=0;for(var j=0;j<g.units.length;j++){var e=g.units[j];if(e.dead||e.team===T||e.team===2)continue;if((e.x-u.x)*(e.x-u.x)+(e.y-u.y)*(e.y-u.y)<520*520){near++;if(near>2)break;}}
   var goal=null;if(dEB<1500&&(held<2||g.t<120))goal=best||BASES[T];else if(best&&near<2&&Math.sqrt(bd)>(typeof PR!=='undefined'?PR*.6:90))goal=best;
   if(goal&&u.layer===0){var dx=goal.x-u.x,dy=goal.y-u.y,L=Math.hypot(dx,dy)||1;inp.mx=dx/L;inp.my=dy/L;if(inp.steer!=null)inp.steer=Math.atan2(dy,dx);if(u.fly&&typeof arkFly==='function'&&L<600)arkFly(u,false);}
  }catch(e){}return inp;};
 /* v3.85: the auto battle (F) on my frame runs through autoHuntInput, not botInput - both are steered */
 var hook=function(){if(!window.__hkAutoObj&&typeof window.botInput==='function'){window.__hkAutoObj=1;var bi=window.botInput;window.botInput=function(s,u,dt){return steerObj(u,bi(s,u,dt));};}
  /* autoHuntInput lives inside a code block (not global), so the auto battle is steered at localInput, the outermost input */
  if(!window.__hkAutoObj2&&typeof window.localInput==='function'){window.__hkAutoObj2=1;var li=window.localInput;window.localInput=function(u){var r=li(u);try{if(r&&typeof P!=='undefined'&&P.autoHunt&&typeof G!=='undefined'&&G&&G.local&&u===G.local.unit)r=steerObj(u,r);}catch(e){}return r;};}};
 setInterval(function(){try{hook();}catch(e){}},500);})();

/* v3.88 (manager 25-5): on auto battle in faction battles my frame still took 500+ kills (next ally ~10) and dropped to 2-11 %
   health. On auto only: my frame deals 55 % damage to ordinary enemies (allies get their share of the fight) and takes 75 %
   of the extra auto damage, so the lowest health sits around 30-60 %. Manual play, bosses, 5v5 and missions are unchanged. */
(function(){var on=function(){try{if(typeof P==='undefined'||!P.autoHunt||typeof G==='undefined'||!G||!G.local||G.over)return false;if(typeof arOn==='function'&&arOn())return false;if(G.rpg&&G.rpg.obj&&/squad|kill|survive|hunt|field|rift/.test(G.rpg.obj.k||''))return false;return true;}catch(e){return false;}};
 /* v4.16 (31-7): on auto, once my frame has 60+ kills, a foe an ally hit in the last 4 s counts as that ally's kill (the assist goes to the wingman) */
 var hookK=function(){if(window.__hkAutoKill||typeof killUnit!=='function')return;window.__hkAutoKill=1;var kU=killUnit;killUnit=function(u,src){try{if(on()&&u&&!u.boss&&u._lastAlly&&G.t-u._lastAlly.t<4&&G.local&&(G.local.k||0)>=60){var ks=src?(src.ownerSlot||src):null;if(ks===G.local)src=u._lastAlly.s;}}catch(e){}return kU(u,src);};};setInterval(function(){try{hookK();}catch(e){}},700);
 var hook=function(){if(window.__hkAutoBal||typeof hurt!=='function')return;window.__hkAutoBal=1;var hu=hurt;hurt=function(u,amt,src,ang,dt){try{if(on()&&u&&amt>0){var me=G.local.unit;var su=src&&(src.unit||src);if(me&&u!==me&&!u.boss&&!u.elite2&&(src===G.local||su===me)){var kk=(G.local&&G.local.k)||0;amt*=.32*Math.max(.1,Math.min(1,1-(kk-80)/140));}/* v4.16 (31-7: 505 kills, ally 2nd 7): past ~110 kills my frame's share tapers off so the line holds 150-250 and allies finish more */else if(me&&u===me)amt*=.6;/* v4.02 (29-6): lowest HP in auto faction battles was 2.9 % - target 30-60 % */else if(me&&su&&su!==me&&su.team===me.team&&u.team!==me.team){amt*=3;try{var sl=su.slot||src;if(sl&&sl!==G.local)u._lastAlly={s:sl,t:G.t};}catch(e2){}}/* v3.94 (27-6): my frame 42 %, allies hit 1.6x harder - they get kills too */}}catch(e){}return hu(u,amt,src,ang,dt);};};
 setInterval(function(){try{hook();}catch(e){}},500);})();

/* v3.98 (28-6): the result card says WHY the battle ended (the enemy base at 98 % and still a win was confusing) */
(function(){var hook=function(){if(window.__hkWhy||typeof checkEnd!=='function'||typeof showResult!=='function')return;window.__hkWhy=1;var ce=checkEnd;checkEnd=function(){var g=(typeof G!=='undefined'?G:null);var was=g&&g.over;var r=ce.apply(this,arguments);try{if(g&&!was&&g.over&&!g._why){var me=g.local&&g.local.team,L2=function(k,e){return (window.LANG||'ko')==='en'?e:k;};if(g.coreDown!=null)g._why=g.coreDown===me?L2('우리 본진 코어가 파괴됨','Our HQ core was destroyed'):L2('적 본진 코어 파괴','Enemy HQ core destroyed');else if(g.tk&&g.tk[0]<=0)g._why=(me===0?L2('우리 병력 점수 소진','Our tickets ran out'):L2('적 병력 점수 0 (점령·격추로 깎음)','Enemy tickets reached 0 (captures and kills)'));else if(g.tk&&g.tk[1]<=0)g._why=(me===1?L2('우리 병력 점수 소진','Our tickets ran out'):L2('적 병력 점수 0 (점령·격추로 깎음)','Enemy tickets reached 0 (captures and kills)'));else if(g.tLimit&&g.t>=g.tLimit)g._why=L2('시간 종료 · 남은 병력 점수 ','Time up · tickets ')+Math.round(g.tk?g.tk[me]:0)+' : '+Math.round(g.tk?g.tk[1-me]:0);}}catch(e){}return r;};var sr=showResult;showResult=function(){var r=sr.apply(this,arguments);try{var g=(typeof G!=='undefined'?G:null);var b=document.getElementById('rsBody');if(g&&g._why&&b&&!b.querySelector('.rsWhy')){var t=b.querySelector('.rs-title');var d=document.createElement('div');d.className='rsWhy';d.style.cssText='margin-top:6px;font:700 14px Noto Sans KR,sans-serif;color:#cfe8ff;opacity:.9';d.textContent=g._why;if(t&&t.nextSibling)t.parentNode.insertBefore(d,t.nextSibling.nextSibling);else b.prepend(d);}}catch(e){}return r;};};setInterval(function(){try{hook();}catch(e){}},700);})();

/* v4.00 (user 2026-11-24): giant frames walk and run 12 % slower - heavier, less foot sliding (dash keeps its own burst) */
(function(){setInterval(function(){try{var g=(typeof G!=='undefined'?G:null);if(!g||!g.units)return;for(var i=0;i<g.units.length;i++){var u=g.units[i];if(u.cls!=='arkframe'||!u.st||u.st.__spd12)continue;u.st.spd*=.88;u.st.__spd12=1;}}catch(e){}},400);})();
