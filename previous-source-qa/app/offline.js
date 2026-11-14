/* Explicit user action only: prepare static program assets, never PDF content. */
export function waitForOfflineWorker(signal){
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>finish(new DOMException('Dibatalkan','AbortError'));
    const timer=setTimeout(()=>finish(new Error('Pemasangan aplikasi offline belum aktif. Muat ulang melalui HTTPS atau localhost, lalu coba lagi.')),20000);
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    navigator.serviceWorker.ready.then(value=>finish(null,value),error=>finish(error));
  });
}
export async function prepareOfflineAssets({signal,onProgress=()=>{}}={}){
  const response=await fetch('/offline-assets.json',{cache:'no-cache',signal});
  if(!response.ok)throw new Error('Daftar komponen offline tidak tersedia.');
  const manifest=await response.json();
  if(!Array.isArray(manifest.files)||!/^semantik-pdf-cp17-[a-f0-9]{12}$/.test(manifest.cache))throw new Error('Daftar offline tidak valid.');
  const cache=await caches.open(manifest.cache);
  let done=0;
  for(const asset of manifest.files){
    if(signal?.aborted)throw new DOMException('Dibatalkan','AbortError');
    if(!/^\/(?:app|vendor|assets|runtime)\/[A-Za-z0-9_./-]+$/.test(asset.path)&&!['/','/index.html','/icon.svg','/manifest.webmanifest'].includes(asset.path))throw new Error('Jalur komponen offline tidak valid.');
    if(asset.path.includes('..'))throw new Error('Jalur komponen offline tidak valid.');
    let existing=await cache.match(asset.path);
    let valid=false;
    if(existing){const buf=await existing.arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buf))].map(x=>x.toString(16).padStart(2,'0')).join('');valid=buf.byteLength===asset.size&&digest===asset.sha256;}
    if(!valid){
      const file=await fetch(asset.path,{signal,cache:'reload'});
      if(!file.ok)throw new Error(`Komponen offline gagal diunduh: ${asset.path}`);
      const buf=await file.arrayBuffer();
      if(buf.byteLength!==asset.size)throw new Error(`Ukuran komponen berubah: ${asset.path}. Muat ulang aplikasi.`);
      const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buf))].map(x=>x.toString(16).padStart(2,'0')).join('');
      if(digest!==asset.sha256)throw new Error(`Integritas komponen tidak cocok: ${asset.path}. Muat ulang aplikasi.`);
      await cache.put(asset.path,new Response(buf,{headers:file.headers,status:200}));
    }
    onProgress({done:++done,total:manifest.files.length,path:asset.path});
  }
  return {files:done,cache:manifest.cache};
}
