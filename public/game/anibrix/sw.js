// Anibrix 오프라인 캐시 (게임 파일을 바꾸면 VERSION 숫자를 올려 주세요)
const VERSION='anibrix-v1.3-2';
const CORE=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){ // 게임 파일: 새 버전 우선, 끊기면 캐시
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));}
  else if(/fonts\.(googleapis|gstatic)\.com/.test(u.host)){ // 글꼴: 캐시 우선
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(VERSION).then(c=>c.put(r,cp));return res;})));}
});
