import {BUILD_INFO} from '__BASE__app/build-info.js';
const report={build:BUILD_INFO,scope:'Actual managed preview HTTP and browser APIs; not Cloudflare deployment',results:[]};
const show=()=>document.querySelector('pre').textContent=JSON.stringify(report,null,2);show();
document.querySelector('button').onclick=async()=>{document.querySelector('button').disabled=true;
 const model=await(await fetch('__BASE__models/en-id/manifest.json')).json();
 const part=model.files.flatMap(f=>f.parts||[])[0];
 const paths=['/index.html','/sw.js','__BASE__app/main.js','__BASE__runtime/ort-wasm-simd-threaded.wasm',part.path];
 for(const path of paths){try{const r=await fetch(path,{method:'HEAD',cache:'no-cache'});report.results.push({path,method:'HEAD',status:r.status,headers:Object.fromEntries(r.headers)});}catch(e){report.results.push({path,error:String(e)})}show();}
 const response=await fetch('__BASE__app/main.js',{headers:{Range:'bytes=0-31'},cache:'no-cache'});const reader=response.body.getReader();const first=await reader.read();await reader.cancel();report.range={status:response.status,contentRange:response.headers.get('content-range'),firstChunk:first.value?.length,pass:response.status===206&&response.headers.get('content-range')?.startsWith('bytes 0-31/')};
 const manifest=await(await fetch('__BASE__offline-assets.json')).json(),entry=manifest.files.find(f=>f.path==='/index.html'),bytes=await(await fetch('/index.html',{cache:'no-cache'})).arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');report.shellIntegrity={expected:entry,actualBytes:bytes.byteLength,actualSha256:hash,pass:hash===entry.sha256};show();
 try{const {waitForOfflineWorker}=await import('__BASE__app/offline.js');await waitForOfflineWorker();report.offlineWorker={pass:true};}catch(e){report.offlineWorker={pass:false,error:String(e)}}
 report.completed=new Date().toISOString();show();document.querySelector('button').disabled=false;
};
