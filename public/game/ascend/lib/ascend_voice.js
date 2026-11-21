/* ASCEND v3.48 — voiced story lines (loaded after index.html's scripts)
   Quest / story dialogue only showed subtitles. Each line is now also spoken with the device's built-in speech voices
   (Web Speech API: no audio files, nothing to download, works offline on most phones and PCs).
   · every speaker keeps one voice: the same character always gets the same voice, pitch and pace
   · women, men, androids and the narrator are pitched differently; if the device has more than one voice of the
     language, speakers are spread over them
   · the line stops when the player moves on; the "command voice" switch in Settings turns it off
   Limits: the voices are the device's own, so quality differs from device to device and it is not acting.
   Recorded or generated voice files can replace this later: window.__vnClip(who, text) may return an audio URL. */
(function(){'use strict';
var X=window.__X348=window.__X348||{err:[]};
function guard(tag,fn){try{return fn();}catch(e){(X.err=X.err||[]).push(tag+': '+String(e&&e.stack||e).slice(0,200));}}
var S=window.speechSynthesis;var voices=[],lang='';
var load=function(){try{var L0=(typeof LANG!=='undefined'&&LANG==='en')?'en':'ko';var all=S.getVoices()||[];voices=all.filter(function(v){return v.lang&&v.lang.toLowerCase().indexOf(L0)===0;});lang=L0;
  // natural / online voices first when the device offers them
  voices.sort(function(a,b){var q=function(v){return (/natural|neural|online|google|premium|enhanced/i.test(v.name)?0:1);};return q(a)-q(b);});}catch(e){voices=[];}};
// speaker groups (keys are the dialogue "who" ids; unknown ids fall back to a hash)
var FEMALE=/sera|luna|igni|astra|noctia|chrona|gaia|frost|volt|sylph|mira|ohserin|hanseojin|link|a_|f_|female|queen|oracle/i,MALE=/parkcheolho|seomujin|officer|trooper|commander|vask|leon|nox|general|admiral|kang|captain/i,ROBOT=/ai|sys|omega|alpha|zeta|core|drone|machine/i;
var prof=function(who){var k=String(who||'');var h=0;for(var i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))>>>0;var p={pitch:1,rate:1.02,vi:h};
 if(!k){p.pitch=.82;p.rate=.96;p.vi=0;}                       // narrator
 else if(ROBOT.test(k)&&!FEMALE.test(k)){p.pitch=.6;p.rate=.92;}
 else if(FEMALE.test(k)){p.pitch=1.12+(h%5)*.05;p.rate=1.0+(h%4)*.03;}
 else if(MALE.test(k)){p.pitch=.62+(h%4)*.05;p.rate=.98+(h%3)*.03;}
 else{p.pitch=.8+(h%7)*.07;p.rate=.98+(h%5)*.03;}
 return p;};
var on=function(){try{if(typeof P==='undefined')return true;if(P.sfx===false)return false;return P.voice!==false;}catch(e){return true;}};
var cur=null,audio=null;
var stop=function(){try{if(S&&(S.speaking||S.pending))S.cancel();}catch(e){}try{if(audio){audio.pause();audio=null;}}catch(e){}cur=null;};
// ---- mood: a serious line gets a serious face ----
// The stand pictures are layers (base + talk + blink). A fourth layer models/vn/<name>_serious.webp is shown on serious lines
// when that file exists; without it the figure only stops bouncing and is toned down a little. A story node can force it
// with mood:'serious' / mood:'normal'; otherwise the words decide.
var SER=/전사|사망|죽었|죽을|죽는|잃었|잃을|희생|미안|죄송|용서|위험|함정|배신|전멸|응답이 없|응답 없|철수|후퇴|부상|추락|격침|파괴됐|파괴되|경고|긴급|마지막|불가능|살아남|돌아오지|묻었|장례|눈물|두렵|무섭|끝났|늦었|침묵|killed|dead|died|lost |sorry|danger|trap|betray|retreat|wounded|warning|emergency|impossible|too late|afraid/i;
var moodOf=function(text,mood){if(mood==='serious')return true;if(mood==='normal'||mood==='happy')return false;return SER.test(text||'');};
var setMood=function(serious){setTimeout(function(){try{var els=document.querySelectorAll('#vnCast .vnA');for(var i=0;i<els.length;i++){var el=els[i];el.classList.toggle('ser',!!serious&&el.classList.contains('talk'));}}catch(e){}},40);};
guard('moodCss',function(){var st=document.createElement('style');st.id='vnMoodCss';st.textContent='.vnA img.m{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;transition:opacity .25s;pointer-events:none}.vnA.ser img.m{opacity:1}.vnA.ser .bd{animation:none!important;filter:brightness(.84) saturate(.82) contrast(1.04);transition:filter .3s}.vnA.ser{translate:0 0!important}#rpgDlg.serLine #vnBg::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(0,0,0,0),rgba(4,6,14,.5));pointer-events:none}';document.head.appendChild(st);});
// called by the story player for every line (index.html, next to vnSpeak): el = the speaking figure, or null for narration
window.__vnMoodSet=function(el,text,mood){guard('moodSet',function(){var serious=moodOf(text,mood);window.__vnSerious=serious;var els=document.querySelectorAll('#vnCast .vnA');for(var i=0;i<els.length;i++)els[i].classList.toggle('ser',serious&&els[i]===el);var D0=document.getElementById('rpgDlg');D0&&D0.classList.toggle('serLine',serious);});};
window.__vnVoice=function(who,text,mood){guard('vnVoice',function(){stop();var serious=moodOf(text,mood);setMood(serious);try{var D0=document.getElementById('rpgDlg');D0&&D0.classList.toggle('serLine',serious);}catch(e){}window.__vnSerious=serious;
  // the game's own story voice (vnSpeak, per-character profiles) does the talking; this file only speaks where that system is missing
  if(typeof VN!=='undefined')return;if(!text||!on())return;
  var plain=String(text).replace(/<[^>]+>/g,' ').replace(/[「」『』“”"]/g,'').replace(/[·•]/g,', ').replace(/\s+/g,' ').trim();if(!plain)return;if(plain.length>400)plain=plain.slice(0,400);
  // a recorded clip, if the game ever ships one for this line
  try{var url=window.__vnClip&&window.__vnClip(who,plain);if(url){audio=new Audio(url);audio.volume=.95;audio.play().catch(function(){});return;}}catch(e){}
  if(!S||typeof SpeechSynthesisUtterance==='undefined')return;var L0=(typeof LANG!=='undefined'&&LANG==='en')?'en':'ko';if(!voices.length||lang!==L0)load();
  var u=new SpeechSynthesisUtterance(plain),p=prof(who);u.lang=L0==='en'?'en-US':'ko-KR';if(voices.length)u.voice=voices[p.vi%Math.min(voices.length,4)];u.pitch=p.pitch*(window.__vnSerious?.92:1);u.rate=p.rate*(window.__vnSerious?.9:1);u.volume=.95;cur=u;S.speak(u);});};
window.__vnVoiceStop=stop;
guard('init',function(){if(!S)return;load();try{S.addEventListener('voiceschanged',load);}catch(e){}
 // leaving the dialogue (panel hidden, match left, tab closed) stops the line
 setInterval(function(){try{if(!cur)return;var D=document.getElementById('rpgDlg');if(!D||getComputedStyle(D).display==='none')stop();}catch(e){}},400);
 window.addEventListener('pagehide',stop);});
})();
