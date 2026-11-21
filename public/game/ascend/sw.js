// ASCEND service worker: cache-first for heavy assets, network-first for pages
const V='ascend-v347';const HEAVY=/\/game\/ascend\/(models|bg)\/|\.(glb|webp|jpg|png)$/;
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 if(HEAVY.test(u.pathname)){e.respondWith(caches.open(V).then(c=>c.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r;}))));return;}
 if(u.pathname.startsWith('/game/ascend/')){const isDoc=e.request.mode==='navigate'||/\.html$|\/$/.test(u.pathname);const nu=isDoc?e.request.url+(u.search?'&':'?')+'_sw='+Date.now():e.request.url;e.respondWith(fetch(nu,{cache:'no-store',credentials:'same-origin'}).then(r=>{if(r.ok){const cl=r.clone();caches.open(V).then(c=>c.put(e.request,cl));}return r;}).catch(()=>caches.match(e.request)));}});
