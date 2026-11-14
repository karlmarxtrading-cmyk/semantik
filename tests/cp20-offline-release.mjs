/** Exact built offline module + generated SW in controlled Cache/Fetch boundaries.
 * No browser lifecycle, device or hosting result is inferred from this suite. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.resolve(process.argv[2]||path.join(root,'dist'));
const out=path.resolve(process.argv[3]||path.join(root,'evidence/cp20/release'));
const previousDist=process.argv[4]?path.resolve(process.argv[4]):null;
fs.mkdirSync(out,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex');
const generatedConfig=JSON.parse(fs.readFileSync(path.join(dist,'sw.js'),'utf8').match(/const CONFIG=(.*);/)[1]);
const release=[generatedConfig.base.split('/')[2]];
assert.match(release[0],/^[0-9a-f]{16}$/,'test receives one current release');
const base=`/r/${release[0]}/`,origin='https://cp20.test';
const manifest=JSON.parse(fs.readFileSync(path.join(dist,base,'offline-assets.json')));
const build=manifest.release;
const rows=[];
async function test(name,fn){const start=performance.now();try{const detail=await fn();rows.push({name,status:'PASS',milliseconds:performance.now()-start,...(detail||{})});}catch(e){rows.push({name,status:'FAIL',error:e.stack});throw e;}}
const cacheMaps=new Map();let cacheDenied=false,network=true,networkCalls=0,mutatePath=null;
const caches={async open(name){if(cacheDenied)throw Error('QuotaExceededError');if(!cacheMaps.has(name))cacheMaps.set(name,new Map());const data=cacheMaps.get(name);return {async match(key){return data.get(typeof key==='string'?key:new URL(key.url).pathname)?.clone();},async put(key,response){data.set(typeof key==='string'?key:new URL(key.url).pathname,response.clone());},async delete(key){return data.delete(key);}};}};
async function networkFetch(req){networkCalls++;if(!network)throw Error('offline');const url=new URL(typeof req==='string'?req:req.url,origin);const local=path.join(dist,url.pathname);if(!fs.existsSync(local)||!fs.statSync(local).isFile())return new Response('missing',{status:404});const bytes=fs.readFileSync(local);return new Response(url.pathname===mutatePath?Buffer.concat([bytes,Buffer.from('tamper')]):bytes,{headers:{'Content-Type':'application/octet-stream'}});}
const handlers={},lifecycle={claims:0,skipWaiting:0};
const swCode=fs.readFileSync(path.join(dist,'sw.js'),'utf8');
const swContext=vm.createContext({Response,URL,Map,Uint8Array,crypto:webcrypto,caches,fetch:networkFetch,console,self:{location:{origin},clients:{async claim(){lifecycle.claims++;}},skipWaiting(){lifecycle.skipWaiting++;},addEventListener(type,fn){handlers[type]=fn;}}});
vm.runInContext(swCode,swContext);
async function swFetch(req){let responded;handlers.fetch({request:typeof req==='string'||req instanceof URL?{url:new URL(String(req),origin).href,method:'GET',mode:'cors'}:req,respondWith(p){responded=p;}});return responded?await responded:networkFetch(req);}
const context=vm.createContext({Response,URL,Map,Set,Object,Number,JSON,Array,Uint8Array,DOMException,Error,AbortController,crypto:webcrypto,caches,fetch:swFetch,console,setTimeout,clearTimeout,navigator:{serviceWorker:{ready:Promise.resolve({active:{}})}}});
const modules=new Map();
async function load(url){if(modules.has(url))return modules.get(url);const mod=new vm.SourceTextModule(fs.readFileSync(path.join(dist,new URL(url).pathname),'utf8'),{context,identifier:url,initializeImportMeta(meta){meta.url=url;}});modules.set(url,mod);await mod.link(spec=>load(new URL(spec,url).href));await mod.evaluate();return mod;}
const offline=(await load(origin+base+'app/offline.js')).namespace;
try{
 await test('Actual generated manifest matches CP20 exact build identity',()=>{assert.equal(build.version,'0.20.0');assert.match(build.release,/^cp20-[0-9a-f]{16}$/);assert.equal(offline.validateOfflineManifest(manifest,base),true);return {files:manifest.files.length,cache:manifest.cache};});
 await test('Manifest defects rejected before any cache mutation',async()=>{const before=cacheMaps.size;for(const change of [m=>m.cache='semantik-pdf-cp18-'+release[0],m=>m.release.version='0.19.0',m=>m.release.sourceHash='0'.repeat(64),m=>m.release.modelHashes['id-en']='f'.repeat(64),m=>m.files.push({...m.files[0]}),m=>m.files[0].path=base+'%2e%2e/secret',m=>m.files[0].path=base+'thing?x=1',m=>m.files[0].path=base+'thing#x',m=>m.files[0].path=base+'../secret',m=>m.files[0].size=-1,m=>m.files[0].size=26*1024*1024,m=>m.files=m.files.filter(f=>f.path!==base+'app/build-info.js')]){const m=structuredClone(manifest);change(m);assert.throws(()=>offline.validateOfflineManifest(m,base));}assert.equal(cacheMaps.size,before);return {mutations:12};});
 await test('Install caches only light shell and never skips active-client wait',async()=>{let promise;handlers.install({waitUntil(p){promise=p;}});await promise;const keys=[...cacheMaps.get(manifest.cache).keys()];assert(!keys.some(x=>/\/(models|runtime|vendor)\//.test(x)));assert.equal(lifecycle.skipWaiting,0);assert(!/\.skipWaiting\s*\(/.test(swCode));return {keys};});
 await test('Prepare all actual build assets with size and SHA256 verification',async()=>{const progress=[];const result=await offline.prepareOfflineAssets({onProgress:p=>progress.push(p)});assert.equal(result.files,manifest.files.length);assert.equal(result.cache,manifest.cache);assert.equal(progress.at(-1).done,manifest.files.length);for(const rec of manifest.files){const response=await(await caches.open(result.cache)).match(rec.path);assert(response);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.byteLength,rec.size);assert.equal(hash(bytes),rec.sha256);}return {files:result.files,bytes:manifest.files.reduce((s,x)=>s+x.size,0)};});
 await test('Notices and all licenses served by generated worker after network removal',async()=>{network=false;const docs=manifest.files.filter(x=>x.path.includes('/licenses/')||x.path.endsWith('/MODEL_NOTICE.txt'));assert(docs.length>=3);for(const rec of docs){const r=await swFetch(rec.path);assert.equal(r.status,200,rec.path);assert.equal(hash(Buffer.from(await r.arrayBuffer())),rec.sha256);}return {documents:docs.length};});
 await test('Navigation and repeated offline preparation use verified cache',async()=>{const calls=networkCalls;const r=await swFetch({url:origin+'/',method:'GET',mode:'navigate'});assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),manifest.files.find(x=>x.path==='/index.html').sha256);const result=await offline.prepareOfflineAssets();assert.equal(result.files,manifest.files.length);assert.equal(networkCalls,calls);});
 await test('Corrupted cache and changed server bytes fail closed',async()=>{network=true;const rec=manifest.files.find(x=>x.path.endsWith('/MODEL_NOTICE.txt'));const c=await caches.open(manifest.cache);await c.put(rec.path,new Response('corrupt cache'));mutatePath=rec.path;const r=await swFetch(rec.path);assert.equal(r.status,503);assert.equal(r.headers.get('X-Semantik-Integrity'),'rejected');assert.equal(await c.match(rec.path),undefined);mutatePath=null;assert.equal((await swFetch(rec.path)).status,200);});
 await test('Unknown release paths denied; model shards remain engine-verified',async()=>{assert.equal((await swFetch(base+'does-not-exist.txt')).status,503);let response;handlers.fetch({request:{url:origin+base+'models/id-en/test.part000',method:'GET',mode:'cors'},respondWith(p){response=p;}});assert.equal(response,undefined);});
 await test('Abort and denied cache report failure without false offline success',async()=>{const controller=new AbortController();controller.abort();await assert.rejects(offline.prepareOfflineAssets({signal:controller.signal}),e=>e.name==='AbortError');cacheDenied=true;await assert.rejects(offline.prepareOfflineAssets(),/Cache browser ditolak/);cacheDenied=false;await assert.rejects(offline.waitForOfflineWorker(controller.signal),e=>e.name==='AbortError');});
 if(previousDist)await test('Old active release retains shell and uncached lazy imports across update',async()=>{
  const oldCode=fs.readFileSync(path.join(previousDist,'sw.js'),'utf8');
  const config=JSON.parse(oldCode.match(/const CONFIG=(.*);/)[1]);
  const oldHandlers={};
  const ctx=vm.createContext({Response,URL,Map,Uint8Array,crypto:webcrypto,caches,fetch:networkFetch,console,self:{location:{origin},clients:{async claim(){}},addEventListener(type,fn){oldHandlers[type]=fn;}}});
  vm.runInContext(oldCode,ctx);
  const oldCache=await caches.open(config.cache);await oldCache.put('/index.html',new Response(fs.readFileSync(path.join(previousDist,'index.html'))));
  const paths=['/index.html',...config.files.filter(x=>/\/(?:app\/(?:translation|pdf-reader|offline)\.js|(?:vendor|runtime)\/)/.test(x.path)).map(x=>x.path)];
  assert(paths.length>3);
  for(const path of paths){let response;oldHandlers.fetch({request:{url:origin+path,method:'GET',mode:path==='/index.html'?'navigate':'cors'},respondWith(p){response=p;}});assert(response);const r=await response;assert.equal(r.status,200,path);const expected=config.files.find(x=>x.path===path);assert.equal(hash(Buffer.from(await r.arrayBuffer())),expected.sha256);}
  return {paths:paths.length,previousRelease:config.base,scope:'Exact prior generated worker and current retained asset bytes, controlled fetch/cache; not live browser update'};
 });
 await test('Activation retains previous release cache for rollback',async()=>{const old=await caches.open('semantik-pdf-cp19-historical-controlled');await old.put('/index.html',new Response('old verified shell fixture'));let promise;handlers.activate({waitUntil(p){promise=p;}});await promise;assert.equal(lifecycle.claims,1);assert.equal(await(await old.match('/index.html')).text(),'old verified shell fixture');assert(cacheMaps.has(manifest.cache));return {scope:'Controlled activation retention, not actual browser update/rollback lifecycle'};});
}finally{
 const report={build,files:{offline:hash(fs.readFileSync(path.join(dist,base,'app/offline.js'))),worker:hash(fs.readFileSync(path.join(dist,'sw.js')))},method:'Node VM executes exact generated release modules, real built inventory and bytes; Cache API/fetch/lifecycle boundaries are controlled doubles. No actual browser, hosting, model inference or device claim.',tests:rows,allPass:rows.length===(previousDist?11:10)&&rows.every(x=>x.status==='PASS'),unqualified:['Cloudflare actual byte/header behavior','Browser install/wait/activate while a translation is active','Browser network disconnect and model/OCR execution','Rollback to earlier deployment with checkpoint migration']};
 fs.writeFileSync(path.join(out,'OFFLINE_RELEASE_REGRESSION.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build,tests:rows.map(({name,status,error})=>({name,status,error})),allPass:report.allPass},null,2));
}
