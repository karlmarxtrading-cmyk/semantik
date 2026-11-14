/* ACTUAL captured-build PDF.js + model + processLongDocument + storage + exporter.
 * Node transport and fake-indexeddb are explicit boundaries. No browser download,
 * physical-device RAM, durable browser quota or human semantic approval claim.
 */
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
import {createHash,randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import assert from 'node:assert/strict';
import * as canvas from '../tools/node_modules/@napi-rs/canvas/index.js';
import {indexedDB} from '../tools/node_modules/fake-indexeddb/build/esm/index.js';
const repo=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(repo,'evidence/build/BUILD_MANIFEST.json')));const build=manifest.build;
assert.match(build.release,/^cp20-[a-f0-9]{16}$/,'build and freeze the captured dist first');
const root=path.join(repo,'dist',build.base);process.env.CP20_SEMANTIC_ROOT=root;
const {Translator,cleanupBridge}=await import('./cp20-semantic-runtime.mjs');
const OriginalWorker=globalThis.Worker;
const layoutBootstrap=path.join(repo,'tests',`cp20-capacity-layout-worker-${randomUUID()}.mjs`);
await fs.writeFile(layoutBootstrap,`import {parentPort} from 'node:worker_threads';globalThis.self=globalThis;globalThis.postMessage=data=>parentPort.postMessage(data);await import(${JSON.stringify(pathToFileURL(path.join(root,'app/layout.worker.js')).href)});parentPort.on('message',data=>self.onmessage({data}));`);
globalThis.Worker=class {
 constructor(url,options){if(!String(url).endsWith('/layout.worker.js'))return new OriginalWorker(url,options);this.thread=new NodeWorker(layoutBootstrap,{type:'module'});this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.stack||error.message}));}
 postMessage(data){this.thread.postMessage(data);}terminate(){return this.thread.terminate();}
};
for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
if(!Math.sumPrecise)Math.sumPrecise=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s};
globalThis.document={createElement(type){assert.equal(type,'canvas');const c=canvas.createCanvas(1,1);c.style={};c.toBlob=(cb,type='image/png',q=.9)=>cb(new Blob([c.toBuffer(type,type==='image/jpeg'?Math.round(q*100):undefined)],{type}));return c}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input,options)=>{const url=String(input?.url||input);if(url.startsWith('file:'))return new Response(await fs.readFile(fileURLToPath(url)));return nativeFetch(input,options)};
globalThis.indexedDB=indexedDB;
const storage=await import(pathToFileURL(path.join(root,'app/storage.js')).href);
const {openPdf}=await import(pathToFileURL(path.join(root,'app/pdf-reader.js')).href);
const {processLongDocument}=await import(pathToFileURL(path.join(root,'app/long-document.js')).href);
const actualTranslation=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const {createStreamingMarkdown}=await import(pathToFileURL(path.join(root,'app/export.js')).href);
const sha=x=>createHash('sha256').update(x).digest('hex');
const identity=Object.fromEntries(await Promise.all(['main.js','storage.js','pdf-reader.js','layout.js','long-document.js','translation.js','claim-guards.js','semantic-spans.js','export.js'].map(async n=>[n,sha(await fs.readFile(path.join(root,'app',n)))])));
const out=path.join(repo,process.env.CP20_REAL_INFERENCE_OUT||'evidence/cp20/qa/real-inference');await fs.mkdir(out,{recursive:true});
const selection=process.argv.slice(2).length?process.argv.slice(2):['capacity-1001-en.pdf','capacity-1500-id.pdf'];const rows=[];
try{for(const name of selection){
 const sourceFile=path.join(repo,'tests/fixtures/cp20-capacity',name),bytes=await fs.readFile(sourceFile),file=new File([bytes],name,{type:'application/pdf'});const lang=name.includes('-id')?'id':'en';
 const started=performance.now();let pdf,tr,doc,token,error,peak={rss:0,heapUsed:0,external:0,arrayBuffers:0},metrics={modelPrepareMs:0,engineRequests:0,engineSucceeded:0,engineFailed:0,engineMs:0,rawBlockCalls:0,maskedRepeatedRequests:0},maskedInputs=new Set(),rawInputs=new Set(),samples=[],lastLogged=0,maxActivePages=0,maxActiveBlocks=0;
 const sample=()=>{const m=process.memoryUsage();for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],m[k]);return m};sample();const timer=setInterval(sample,250);
 const mirror=path.join(out,name.replace('.pdf','-committed'));await fs.mkdir(mirror,{recursive:true});
 const requestLog=await fs.open(path.join(out,name.replace('.pdf','-engine-requests.jsonl')),'w');
 class MeasuredTranslator extends Translator{
  async prepare(...args){const t=performance.now();try{return await super.prepare(...args);}finally{metrics.modelPrepareMs+=performance.now()-t;}}
  async translate(text,opts){metrics.rawBlockCalls++;rawInputs.add(sha(text));return super.translate(text,opts);}
  async _request(action,payload,opts){if(action!=='translate')return super._request(action,payload,opts);const hash=sha(payload.sourceText);metrics.engineRequests++;if(maskedInputs.has(hash))metrics.maskedRepeatedRequests++;maskedInputs.add(hash);const t=performance.now();try{const r=await super._request(action,payload,opts);metrics.engineSucceeded++;await requestLog.write(JSON.stringify({request:metrics.engineRequests,direction:payload.direction,inputSha256:hash,inputChars:payload.sourceText.length,inputTokens:r.inputTokens,outputTokens:r.outputTokens,ms:performance.now()-t})+'\n');return r;}catch(e){metrics.engineFailed++;throw e;}finally{metrics.engineMs+=performance.now()-t;}}
 }
 const module={...actualTranslation,Translator:MeasuredTranslator};
 try{
  pdf=await openPdf(file);token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256,status:'processing',build});
  const result=await processLongDocument({pdf,file,config:{source:lang,target:lang==='en'?'id':'en',layout:'auto',glossary:[]},translate:true,translationModule:module,build,
   loadPage:n=>storage.loadPage(n,token),commit:async(record,summary)=>{await storage.commitPage(record,summary,{status:'processing',sourceSha256:pdf.sourceSha256,build,progress:summary.counts},token);assert.equal(record.assets.length,0,'plain capacity fixture unexpectedly requires raster mirror');await fs.writeFile(path.join(mirror,String(record.page.number).padStart(4,'0')+'.json'),JSON.stringify(record));await fs.writeFile(path.join(mirror,'SUMMARY.json'),JSON.stringify({build,identity,summary,measurements:{...metrics,uniqueRawBlockInputs:rawInputs.size,uniqueMaskedModelInputs:maskedInputs.size},elapsedMs:performance.now()-started},null,2));},
   onTranslator:x=>{tr=x;},onVisible:d=>{doc=d;maxActivePages=Math.max(maxActivePages,d.pages.length);maxActiveBlocks=Math.max(maxActiveBlocks,d.blocks.length);assert.ok(d.pages.length<=1);},
   onProgress:p=>{if(p.stage==='page-complete'&&(p.page===1||p.page%25===0||p.page===pdf.numPages)){lastLogged=p.page;const m=sample();samples.push({page:p.page,elapsedMs:performance.now()-started,...m,counts:{...doc.counts}});console.log(name,p.page+'/'+pdf.numPages,JSON.stringify(doc.counts),Math.round((performance.now()-started)/1000)+'s');}}
  });doc=result.document;tr=result.translator;
 }catch(e){error=e.stack||String(e);}finally{clearInterval(timer);sample();await requestLog.close();await pdf?.destroy();await tr?.dispose();}
 let exportResult;
 if(doc?.committedPageCount){
  const exportStart=performance.now();try{
   const restored=await storage.loadCheckpoint({lazy:true});assert.equal(restored.document.blocks.length,0);
   const full=!error&&doc.committedPageCount===doc.numPages&&!doc.counts.pending&&!doc.counts.rejected&&!doc.counts.failed;
   const blob=await createStreamingMarkdown({document:restored.document,pages:storage.iteratePages(token,{endPage:doc.committedPageCount}),kind:'translation',status:full?'complete':'paused',file,build,sourceSha256:pdf.sourceSha256});
   const output=name.replace('.pdf',full?'-NODE_TRANSLATION.md':'-NODE_PARTIAL_TRANSLATION.md');await pipeline(Readable.fromWeb(blob.stream()),createWriteStream(path.join(out,output)));const resultBytes=await fs.readFile(path.join(out,output));
   const ids=new Set([...resultBytes.toString('utf8').replaceAll('\\_','_').matchAll(/CP20B\d{4}_\d{2}/g)].map(x=>x[0]));
   assert.equal(ids.size,doc.committedPageCount,'every generated paragraph trace ID must survive into translation or preserved source');
   exportResult={file:output,bytes:resultBytes.length,sha256:sha(resultBytes),stats:blob.exportStats,traceIds:ids.size,ms:performance.now()-exportStart};
  }catch(e){exportResult={status:'FAIL',error:e.stack||String(e)};}
 }
 const afterIdentity=Object.fromEntries(await Promise.all(Object.keys(identity).map(async n=>[n,sha(await fs.readFile(path.join(root,'app',n)))])));assert.deepEqual(afterIdentity,identity,'packaged module bytes changed during run');
 const record={fixture:name,sourceSha256:sha(bytes),build,identity,ruleset:actualTranslation.RULESET,status:error?'FAIL':doc?.counts.pending||doc?.counts.rejected||doc?.counts.failed?'FAIL':'PASS',scope:`Actual captured build ${build.release} reader + local model + page pipeline + fake-indexeddb + Markdown saved by Node. Later packaged builds require explicit component/parity binding or a new run. Not full consumer UI, browser download, or reviewed semantic quality.`,error,counts:doc?.counts,pages:doc?.committedPageCount,totalPages:doc?.numPages,sourceCharacters:doc?.sourceTextCharacters,coverage:{source:doc?.sourceItemCount,covered:doc?.coveredItemCount},pipelineMetrics:doc?.metrics,measurements:{...metrics,uniqueRawBlockInputs:rawInputs.size,uniqueMaskedModelInputs:maskedInputs.size,maxActivePages,maxActiveBlocks},elapsedMs:performance.now()-started,sampledPeakNodeProcessBytes:peak,memoryLimit:'250ms samples; Node process (worker_threads share process RSS), native canvas and WASM within that process where OS accounts them. fake-indexeddb retains all records in RAM; this is not browser RAM or bounded browser persistence. No physical device qualification.',samples,export:exportResult};
 rows.push(record);await fs.writeFile(path.join(out,name.replace('.pdf','-RESULTS.json')),JSON.stringify(record,null,2)+'\n');await fs.writeFile(path.join(out,'RESULTS.json'),JSON.stringify({rows},null,2)+'\n');console.log('FINISHED',name,record.status,record.counts);
 }}finally{await cleanupBridge();await fs.rm(layoutBootstrap,{force:true});}
if(rows.some(x=>x.status==='FAIL'))process.exitCode=1;
