/* CP20 generated release-pinned, hash-verified static asset cache. */
const CONFIG=__CONFIG__;
const RECORDS=new Map(CONFIG.files.map(x=>[x.path,x]));
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function verified(response,record){
  if(!response?.ok)return false;
  const bytes=await response.clone().arrayBuffer();
  return bytes.byteLength===record.size&&hex(await crypto.subtle.digest('SHA-256',bytes))===record.sha256;
}
const unavailable=()=>new Response('Komponen rilis ini belum tersedia atau berubah. Simpan pekerjaan; hubungkan jaringan atau muat ulang untuk memakai rilis baru.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','X-Semantik-Integrity':'rejected'}});
async function pinned(path,request){
  const record=RECORDS.get(path);
  if(!record)return unavailable();
  let cache;
  try{cache=await caches.open(CONFIG.cache);}catch{}
  if(cache){
    const cached=await cache.match(path);
    if(cached&&await verified(cached,record))return cached;
    if(cached)await cache.delete(path).catch(()=>{});
  }
  let response;
  try{response=await fetch(request||path,{cache:'no-cache'});}catch{return unavailable();}
  if(!await verified(response,record))return unavailable();
  if(cache)try{await cache.put(path,response.clone());}catch{}
  return response;
}
self.addEventListener('install',event=>{
  // Existing work retains its release. Only the light shell is precached.
  event.waitUntil((async()=>{
    const cache=await caches.open(CONFIG.cache);
    for(const path of CONFIG.shell){const r=await pinned(path);if(!r.ok)throw Error('Release shell integrity failed');await cache.put(path,r);}
  })());
});
self.addEventListener('activate',event=>{
  // Retain verified old releases for rollback; never erase an offline workspace.
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  // Model shards have independent transport/decoded hashes in the worker.
  if(url.pathname.startsWith(CONFIG.base+'models/'))return;
  const navigation=req.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html');
  const path=navigation?'/index.html':url.pathname;
  if(RECORDS.has(path)&&(!url.search||navigation))event.respondWith(pinned(path,navigation?'/index.html':req));
  else if(url.pathname.startsWith(CONFIG.base))event.respondWith(Promise.resolve(unavailable()));
});
