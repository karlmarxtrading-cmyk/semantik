import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../source');
const release='r/7a8e787a497535f5';
const source=await fs.readFile(path.join(root,'sw.js'),'utf8');
const engine=await fs.readFile(path.join(root,release,'assets/engine.worker-4c3dcfee.js'),'utf8');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const results=[];
const record=(test,detail)=>results.push({test,status:'PASS',detail});
class MemoryCache {
  constructor(){this.map=new Map();this.puts=[];this.denied=false;}
  key(key){return typeof key==='string'?key:key.url;}
  async match(key){return this.map.get(this.key(key))?.clone();}
  async put(key,value){if(this.denied)throw new DOMException('Quota exceeded','QuotaExceededError');this.puts.push(this.key(key));this.map.set(this.key(key),value.clone());}
  async delete(key){return this.map.delete(this.key(key));}
}
function swContext({openDenied=false,putDenied=false,wrongNetwork=false}={}){
  const cache=new MemoryCache();cache.denied=putDenied;
  const events={};const fetched=[];
  const sandbox={crypto:crypto.webcrypto,Uint8Array,Response,Request,URL,Map,Promise,Error,
    caches:{open:async()=>{if(openDenied)throw new DOMException('denied','SecurityError');return cache;}},
    fetch:async input=>{const p=typeof input==='string'?input:new URL(input.url).pathname;fetched.push(p);try{return new Response(wrongNetwork?'new version at old URL':await fs.readFile(path.join(root,p.replace(/^\//,''))));}catch{return new Response('missing',{status:404});}},
    self:{location:{origin:'https://audit.invalid'},clients:{claim:async()=>{}},addEventListener:(event,handler)=>{events[event]=handler;}}
  };
  const context=vm.createContext(sandbox);
  vm.runInContext(source+'\nglobalThis.audit={pinned,CONFIG,RECORDS};',context);
  return {...context.audit,events,cache,fetched};
}
{
  const a=swContext();const p=a.CONFIG.base+'app/main.js';const r=await a.pinned(p);
  assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),a.RECORDS.get(p).sha256);
  const r2=await a.pinned(p);assert.equal(r2.status,200);assert.equal(a.fetched.length,1);
  record('SW valid cache remains pinned','Exact SW function returns verified bytes and does not refetch valid cached release.');
}
{
  const a=swContext({wrongNetwork:true});const p=a.CONFIG.base+'app/main.js';const r=await a.pinned(p);
  assert.equal(r.status,503);assert.equal(a.cache.puts.length,0);
  record('SW changed bytes fail closed','New bytes served at old release URL rejected, no poisoned cache entry.');
}
{
  const a=swContext();const p=a.CONFIG.base+'app/main.js';a.cache.map.set(p,new Response('corrupt'));
  const r=await a.pinned(p);assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),a.RECORDS.get(p).sha256);
  record('SW corrupt cache repaired','Corrupt cache discarded; network bytes used only after matching release hash.');
}
for(const mode of ['openDenied','putDenied']){
  const a=swContext({[mode]:true});const r=await a.pinned(a.CONFIG.base+'app/main.js');assert.equal(r.status,200);
  record('SW '+mode+' still serves verified network asset','Cache Storage failure does not discard verified network response.');
}
{
  const a=swContext();let operation;a.events.install({waitUntil:p=>{operation=p;}});await operation;
  assert.equal(a.fetched.length,a.CONFIG.shell.length);assert.equal(a.CONFIG.shell.length,7);
  assert(a.fetched.every(p=>!p.includes('/models/')&&!p.includes('/vendor/')&&!p.includes('/runtime/')));
  record('SW install lazy shell','Only 7 lightweight shell paths fetched during installation; model/PDF/OCR/WASM not precached by install.');
}
{
  const a=swContext();let intercepted=false;
  a.events.fetch({request:{url:'https://audit.invalid'+a.CONFIG.base+'models/en-id/encoder_q8.onnx.part000.gz',method:'GET',mode:'cors'},respondWith:()=>{intercepted=true;}});
  assert.equal(intercepted,false);
  record('SW delegates model hashes to worker','Model shards bypass SW pinning; worker verifies independent transport and decoded hashes.');
}

const patchStart=engine.indexOf('let cp18ModelCache =');
const patchEnd=engine.indexOf('\nasync function ar()',patchStart);
assert(patchStart>0&&patchEnd>patchStart);
const patch=engine.slice(patchStart,patchEnd);
const payload=Buffer.from('Verified model fixture data');
const part={path:'/fixture.part',size:payload.length,sha256:sha(payload),encoding:'identity',decodedSize:payload.length,decodedSha256:sha(payload)};
const model={name:'fixture.onnx',size:payload.length,sha256:sha(payload),parts:[part]};
function workerContext(mode){
  const cache=new MemoryCache();let fetched=0,puts=0;
  const originalPut=cache.put.bind(cache);
  cache.put=async(k,v)=>{puts++;if(mode==='putDenied'&&puts>1)throw new DOMException('full','QuotaExceededError');return originalPut(k,v);};
  if(mode==='corruptCache')cache.map.set(part.path,new Response('invalid cache bytes'));
  const context=vm.createContext({Uint8Array,Request,Response,URL,Error,DOMException,
    navigator:{storage:{estimate:async()=>({quota:10000000,usage:0})}},
    self:{location:{href:'https://audit.invalid/worker.js'},postMessage:()=>{}},
    caches:{open:async()=>{if(mode==='openDenied')throw new DOMException('denied','SecurityError');return cache;}},
    fetch:async()=>{fetched++;return new Response(mode==='badHash'?Buffer.alloc(payload.length):payload);},
    u:async bytes=>sha(bytes),Rn:async(bytes,p)=>{assert.equal(bytes.length,p.decodedSize);assert.equal(sha(bytes),p.decodedSha256);return bytes;}
  });
  vm.runInContext(patch+'\nglobalThis.audit={cp18StoragePreflight,ir,status:()=>({offlineReady:cp18OfflineReady,storageWarning:cp18StorageWarning})};',context);
  return {...context.audit,counts:()=>({fetched,puts})};
}
for(const mode of ['openDenied','putDenied','corruptCache']){
  const a=workerContext(mode);await a.cp18StoragePreflight(payload.length);const output=await a.ir(model,'request',0,payload.length);
  assert.equal(Buffer.from(output).toString(),payload.toString());assert.equal(a.counts().fetched,1);
  if(mode!=='corruptCache')assert.equal(a.status().offlineReady,false);
  record('Model '+mode+' recovery',{...a.status(),...a.counts(),scope:'Exact cache/preflight/loader functions with fixture bytes; not a real-model inference test.'});
}
{
  const a=workerContext('badHash');await a.cp18StoragePreflight(payload.length);
  await assert.rejects(()=>a.ir(model,'request',0,payload.length),/Hash model tidak cocok/);
  record('Model network wrong hash rejected','Exact loader rejects wrong transport bytes before decoded model use.');
}
{
  const a=workerContext('normal');await a.cp18StoragePreflight(payload.length);
  const older={...model,parts:[{...part,path:'/r/1111111111111111/models/en-id/fixture.part'}]};
  const newer={...model,parts:[{...part,path:'/r/2222222222222222/models/en-id/fixture.part'}]};
  await a.ir(older,'old',0,payload.length);await a.ir(newer,'new',0,payload.length);
  assert.equal(a.counts().fetched,2);
  record('Same model bytes at next release URL are fetched again',{...a.counts(),implication:'Cache is keyed by release-prefixed URL rather than content hash. This passes a reproduction of behavior, not an acceptance criterion.'});
}

// Read the actual bundled model object, without executing inference code.
{
  const start=engine.indexOf('var Ln={')+'var Ln='.length;let depth=0,quote=null,escaped=false,end=-1;
  for(let i=start;i<engine.length;i++){
    const c=engine[i];
    if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
  }
  assert(end>start);const embedded=vm.runInNewContext('('+engine.slice(start,end)+')');
  for(const direction of ['en-id','id-en']){
    const disk=JSON.parse(await fs.readFile(path.join(root,release,'models',direction,'manifest.json'),'utf8'));
    assert.deepEqual(JSON.parse(JSON.stringify(embedded[direction])),disk);
  }
  record('Bundled model manifests equal disk manifests','Both directions: every property, transport/decoded hash, file path and fingerprint matches.');
}
const report={scope:'Node VM execution of exact deployed service-worker functions and exact readable engine cache patch; memory cache and transport are controlled harnesses. Not browser lifecycle or deployed HTTPS proof.',tests:results,passed:results.length};
await fs.writeFile(path.join(here,'runtime_integrity_probe.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
