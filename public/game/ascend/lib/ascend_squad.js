/* ASCEND v3.48 — squad focus fire (loaded after lib/ascend_field.js)
   The squad's frames and support units were ordinary followers: they looked for a target only inside their own weapon
   range and otherwise walked behind the leader, so when I attacked a boss they stayed back like infantry.
   Now the unit I hit (or the auto-battle target) becomes the squad's target at once: every squad unit turns to it,
   closes to its own fighting distance and fires, and keeps on it until it falls or I have left it alone for 5 s.
   Hooks the global hurt / findTarget / botInput. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var KEEP=5,REACH=2400;
var focus=function(){if(typeof G==='undefined'||!G||!G.local)return null;var t=G.__myT;if(t&&!t.dead&&t.hp>0&&G.t-G.__myTt<KEEP&&G.t>=G.__myTt)return t;var a=G.autoT;return a&&!a.dead&&a.team!==G.local.team?a:null;};
var isSq=function(u){return u&&!u.dead&&u.sqU&&u.slot&&u.slot.leader===G.local;};
X.sqFocus=function(){var t=focus();return t?{name:t.slot&&t.slot.name,boss:!!t.boss,hp:Math.round(100*t.hp/t.mhp)}:null;};
guard('squad',function(){
 // what I am attacking: the last enemy unit my own frame damaged
 var _h=hurt;hurt=function(u,amt,src){try{if(G&&G.local&&src&&(src===G.local||src.unit===G.local.unit)&&u&&!u.dead&&u.team!==G.local.team){G.__myT=u;G.__myTt=G.t;}}catch(e){}return _h.apply(this,arguments);};
 // the squad takes that target whatever its own weapon range is
 var _f=findTarget;findTarget=function(u,range,B){try{if(isSq(u)){var t=focus();if(t&&t.team!==u.team&&Math.hypot(t.x-u.x,t.y-u.y)<REACH)return t;}}catch(e){}return _f.apply(this,arguments);};
 // and goes to it instead of staying behind the leader: close to its own fighting distance, circle there, fire
 var _b=botInput;botInput=function(s,u,dt){var inp=_b.apply(this,arguments);try{if(inp&&isSq(u)){var t=focus();if(t&&t.team!==u.team){var dx=t.x-u.x,dy=t.y-u.y,d=Math.hypot(dx,dy)||1;if(d<REACH){var a=Math.atan2(dy,dx),rng=(u.w&&u.w.range)||400,want=Math.max(110,Math.min(420,rng*.7))+(t.r||0);
   if(u.bot)u.bot.tgt=t;inp.tx=t.x;inp.ty=t.y;
   if(!u.layer){inp.aim=a;if(d>want){inp.mx=Math.cos(a);inp.my=Math.sin(a);}else if(d<want*.5){inp.mx=-Math.cos(a)*.6;inp.my=-Math.sin(a)*.6;}else{var sd=(u.id%2?1:-1);inp.mx=Math.cos(a+1.57*sd)*.5;inp.my=Math.sin(a+1.57*sd)*.5;}
    if(d<rng*1.15+(t.r||0))inp.fire=true;}}}}}catch(e){}return inp;};
});
})();
