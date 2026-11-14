// CP18 readable patch for the inherited CP17 bundle. Applied by patch-engine.py.
// Only public model assets enter Cache Storage; document text never does.
let cp18ModelCache = null, cp18OfflineReady = true, cp18StorageWarning = '';
function cp18SessionMode(error) {
  cp18ModelCache = null;
  cp18OfflineReady = false;
  cp18StorageWarning = 'Model hanya tersedia untuk sesi ini; cache tidak dapat disimpan. Jangan tutup tab sebelum mengunduh hasil. Kosongkan model lokal atau sediakan ruang, lalu siapkan offline kembali.';
}
async function cp18StoragePreflight(requiredBytes) {
  cp18OfflineReady = true; cp18StorageWarning = ''; cp18ModelCache = null;
  try {
    // Probe before any large download. Estimate is advisory: an already-cached
    // model may still fit even when remaining quota is lower than its full size.
    const estimate = await globalThis.navigator?.storage?.estimate?.();
    if (estimate?.quota && estimate.quota - (estimate.usage || 0) < requiredBytes) {
      cp18StorageWarning = 'Ruang cache terbatas; bila penyimpanan gagal, model hanya digunakan selama sesi ini.';
    }
    cp18ModelCache = await caches.open('semantik-model-v1');
    const probe = new Request(new URL('/__semantik_cache_probe__', self.location?.href || 'https://local.invalid/'));
    await cp18ModelCache.put(probe, new Response('probe'));
    await cp18ModelCache.delete(probe);
  } catch (error) { cp18SessionMode(error); }
}
async function ir(e,t,n,r) {
  let output = new Uint8Array(e.size), decodedOffset = 0, downloaded = 0;
  for (const part of e.parts) {
    if(!/^[a-f0-9]{64}$/.test(part.sha256))throw Error('Hash shard tidak valid');
    const contentKey='/__semantik_models__/sha256/'+part.sha256;
    let bytes;
    if (cp18ModelCache) {
      try {
        let cached = await cp18ModelCache.match(contentKey);
        // Migrate only verified legacy bytes. Never purge other releases or active readers.
        if(!cached && cp18ModelCache.keys){
          const suffix=part.path.slice(part.path.indexOf('/models/'));
          for(const request of await cp18ModelCache.keys()){
            if(!new URL(request.url).pathname.endsWith(suffix))continue;
            const prior=await cp18ModelCache.match(request);if(!prior)continue;
            const bytes=new Uint8Array(await prior.arrayBuffer());
            if(bytes.length===part.size&&await u(bytes)===part.sha256){
              await cp18ModelCache.put(contentKey,new Response(bytes));
              cached=await cp18ModelCache.match(contentKey);
              // All old clients can still fetch their own release; retained immutable asset cache is untouched.
              break;
            }
          }
        }
        if (cached) {
          const candidate = new Uint8Array(await cached.arrayBuffer());
          if (candidate.length === part.size && await u(candidate) === part.sha256) bytes = candidate;
          else await cp18ModelCache.delete(contentKey);
        }
      } catch (error) { cp18SessionMode(error); }
    }
    if (!bytes) {
      const response = await fetch(part.path,{credentials:'same-origin',cache:'no-cache'});
      if (!response.ok || !response.body) throw Error(`Unduhan model gagal: ${part.path} (${response.status})`);
      const chunks=[]; let size=0; const reader=response.body.getReader();
      try {
        for (;;) {
          const chunk=await reader.read(); if(chunk.done)break;
          size+=chunk.value.length;
          if(size>part.size){await reader.cancel();throw Error('Ukuran shard model melebihi manifest');}
          chunks.push(chunk.value);
          self.postMessage({id:t,progress:{done:n+downloaded+size,total:r,label:e.name,storageWarning:cp18StorageWarning}});
        }
      } finally { reader.releaseLock(); }
      bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      if(size!==part.size || await u(bytes)!==part.sha256)throw Error(`Hash model tidak cocok: ${part.path}`);
      if(cp18ModelCache){try{await cp18ModelCache.put(contentKey,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch(error){cp18SessionMode(error);}}
    }
    const decoded=await Rn(bytes,part);
    if(decodedOffset+decoded.length>output.length)throw Error('Ukuran model terurai melebihi manifest');
    output.set(decoded,decodedOffset);decodedOffset+=decoded.length;downloaded+=part.size;
    self.postMessage({id:t,progress:{done:n+downloaded,total:r,label:e.name,storageWarning:cp18StorageWarning}});
  }
  if(decodedOffset!==e.size || await u(output)!==e.sha256)throw Error(`Hash model lengkap gagal: ${e.name}`);
  return output;
}
