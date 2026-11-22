/* ASCEND v3.48 — home screen music (loaded after lib/ascend_nan.js)
   The user's track bgm/main_theme.mp3 ("Main Battle Motif", 107.8 s, about 100 BPM) plays on the home screen and the
   screens opened from it; the procedural war theme stays for battles.
   · It is not part of the first load (2.6 MB): it is fetched after the first tap, when the browser allows sound.
   · The track ends with a fade and starts at once, so a plain loop would have a gap: the next pass starts 3 s before
     the end and the two are cross-faded.
   · The track is bass-heavy (62% below 200 Hz, 3% above 4 kHz): a gentle shelf lifts the highs and eases the lows so
     it is not thin on phone speakers.
   · Follows the existing Sound and Music switches (P.sfx, P.mus). In a battle it fades out. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var FILE='bgm/main_theme.mp3',XF=3,VOL=.5;
var A={buf:null,loading:false,fail:0,on:false,nextT:0,live:[],m:null,plays:0};
X.musStat=function(){return {loaded:!!A.buf,loading:A.loading,fail:A.fail,on:A.on,plays:A.plays,live:A.live.length,dur:A.buf?Math.round(A.buf.duration*10)/10:0};};
var ctx=function(){try{return (typeof SFX!=='undefined'&&SFX.ctx)||null;}catch(e){return null;}};
var want=function(){try{return !!(P.sfx&&P.mus!==false&&!(typeof G!=='undefined'&&G)&&!window.__bgmBusy);}catch(e){return false;}};
var master=function(c){if(A.m)return A.m;var g=c.createGain();g.gain.value=VOL;var lo=c.createBiquadFilter();lo.type='lowshelf';lo.frequency.value=120;lo.gain.value=-2;var hi=c.createBiquadFilter();hi.type='highshelf';hi.frequency.value=3500;hi.gain.value=3;g.connect(lo);lo.connect(hi);hi.__music=1;hi.connect(c.destination);A.m=g;return g;};
var start=function(c,at,first){var s=c.createBufferSource();s.buffer=A.buf;var g=c.createGain(),d=A.buf.duration,fin=first?1.5:XF;
 g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(1,at+fin);g.gain.setValueAtTime(1,at+d-XF);g.gain.linearRampToValueAtTime(0,at+d);
 s.connect(g);g.connect(master(c));s.start(at);s.stop(at+d+.1);var it={s:s,g:g,end:at+d};A.live.push(it);s.onended=function(){var i=A.live.indexOf(it);if(i>=0)A.live.splice(i,1);};A.nextT=at+d-XF;A.plays++;};
var stopAll=function(c){var now=c.currentTime;A.live.forEach(function(it){try{it.g.gain.cancelScheduledValues(now);it.g.gain.setTargetAtTime(0,now,.25);it.s.stop(now+1.2);}catch(e){}});A.live=[];};
var tick=function(){var c=ctx();if(!c||c.state!=='running')return;var w=want();
 if(!A.buf){if(w&&!A.loading&&!A.fail){A.loading=true;fetch(FILE).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();}).then(function(b){return new Promise(function(ok,no){c.decodeAudioData(b,ok,no);});}).then(function(buf){A.buf=buf;A.loading=false;}).catch(function(e){A.fail=1;A.loading=false;(X.err=X.err||[]).push('music: '+String(e).slice(0,120));});}return;}
 if(w){if(!A.on){A.on=true;start(c,c.currentTime+.05,true);}else if(c.currentTime>A.nextT-.6)start(c,Math.max(A.nextT,c.currentTime+.05),false);}
 else if(A.on){A.on=false;stopAll(c);}};
guard('music',function(){
 // while the track plays, the procedural theme does not schedule its menu notes
 try{if(typeof MUS!=='undefined'&&MUS.play){var _p=MUS.play;MUS.play=function(){if(A.on&&this.mode==='menu')return;return _p.apply(this,arguments);};}}catch(e){}
 setInterval(function(){guard('musicT',tick);},250);});
})();
