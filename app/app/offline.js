import {BUILD_INFO} from './build-info.js';
/* Explicit user action only. Manifest is pinned to this module's release URL. */
export function waitForOfflineWorker(signal){
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>finish(new DOMException('Dibatalkan','AbortError'));
    const timer=setTimeout(()=>finish(new Error('Aplikasi offline belum aktif. Muat ulang melalui HTTPS, lalu coba lagi.')),20000);
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    navigator.serviceWorker.ready.then(value=>finish(null,value),error=>finish(error));
  });
}
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
export async function prepareOfflineAssets({signal,onProgress=()=>{}}={}){
  const manifestURL=new URL('../offline-assets.json',import.meta.url);
  const response=await fetch(manifestURL,{cache:'no-cache',signal});
  if(!response.ok)throw new Error('Daftar komponen rilis ini tidak tersedia. Simpan hasil lalu muat ulang aplikasi.');
  const manifest=await response.json();
  const prefix=manifestURL.pathname.slice(0,-'offline-assets.json'.length);
  validateOfflineManifest(manifest,prefix);
  let cache;
  try{
    cache=await caches.open(manifest.cache);
    const probe=prefix+'cache-probe';await cache.put(probe,new Response('probe'));await cache.delete(probe);
  }catch{throw new Error('Cache browser ditolak atau penuh. Kosongkan model lokal atau sediakan ruang lalu coba lagi. Offline belum tersedia.');}
  let done=0;
  for(const asset of manifest.files){
    if(signal?.aborted)throw new DOMException('Dibatalkan','AbortError');
    let valid=false;
    const existing=await cache.match(asset.path);
    if(existing){const buf=await existing.arrayBuffer();valid=buf.byteLength===asset.size&&await digest(buf)===asset.sha256;}
    if(!valid){
      const file=await fetch(asset.path,{signal,cache:'reload'});
      if(!file.ok)throw new Error('Komponen rilis ini tidak tersedia. Simpan pekerjaan lalu muat ulang sebelum menyiapkan offline.');
      const buf=await file.arrayBuffer();
      if(buf.byteLength!==asset.size||await digest(buf)!==asset.sha256)throw new Error('Integritas rilis tidak cocok. Komponen tidak digunakan; simpan pekerjaan lalu muat ulang.');
      try{await cache.put(asset.path,new Response(buf,{headers:file.headers,status:200}));}
      catch{throw new Error('Penyimpanan komponen gagal. Offline belum siap; kosongkan model lokal atau sediakan ruang lalu coba lagi.');}
    }
    onProgress({done:++done,total:manifest.files.length,path:asset.path});
  }
  return {files:done,cache:manifest.cache,offlineReady:true};
}

// Validate the entire inventory before touching cache. The identity comes from the
// same generated module as the rest of the app, never a hard-coded CP revision.
export function validateOfflineManifest(manifest,prefix){
  const release=manifest?.release;
  if(manifest?.schema!==2||!Array.isArray(manifest.files)||manifest.files.length===0||manifest.files.length>20000||
     !/^\/r\/[a-f0-9]{16}\/$/.test(prefix)||manifest.base!==prefix||BUILD_INFO.base!==prefix||
     manifest.cache!==`semantik-pdf-${BUILD_INFO.release}`||release?.release!==BUILD_INFO.release||
     release?.version!==BUILD_INFO.version||release?.sourceHash!==BUILD_INFO.sourceHash||release?.base!==prefix||
     !/^[a-f0-9]{64}$/.test(release?.sourceHash||'')||prefix!==`/r/${release.sourceHash.slice(0,16)}/`||
     JSON.stringify(Object.entries(release.modelHashes||{}).sort())!==JSON.stringify(Object.entries(BUILD_INFO.modelHashes||{}).sort())){
    throw new Error('Daftar offline tidak cocok dengan rilis aktif.');
  }
  const seen=new Set();
  for(const asset of manifest.files){
    // URL canonicalization excludes queries, fragments, encoded traversal,
    // protocol-relative paths and a manifest pointing outside this release.
    if(!asset||typeof asset.path!=='string'||(!asset.path.startsWith(prefix)&&asset.path!=='/index.html')||
       /[\\%?#]/.test(asset.path)||asset.path.includes('..')||asset.path.includes('//')||seen.has(asset.path)||
       !/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.size)||asset.size<0||asset.size>25*1024*1024){
      throw new Error('Jalur komponen offline tidak valid.');
    }
    seen.add(asset.path);
  }
  if(!seen.has('/index.html')||!seen.has(prefix+'app/build-info.js')||!seen.has(prefix+'app/offline.js')){
    throw new Error('Daftar offline tidak lengkap untuk rilis aktif.');
  }
  return true;
}
