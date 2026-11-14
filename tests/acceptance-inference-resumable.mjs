// Real WASM/model inference through the browser adapter in a Node Worker bridge.
// Browser transport and UI are verified separately. This bridge never fakes outputs.
import {createHash} from 'node:crypto';
const __hash=b=>createHash('sha256').update(b).digest('hex');
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
const root=path.resolve(process.env.CP18_SOURCE || path.join(path.dirname(fileURLToPath(import.meta.url)),'../app'));
const {Translator,auditTranslation}=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'translation-holdout-'+(process.env.CP18_LABEL||'revised')+'-temporary-worker.mjs');
let source=await fs.readFile(path.join(root,'assets/engine.worker-4c3dcfee.js'),'utf8');
source=source.replace('N.wasm.wasmPaths=`/runtime/`','N.wasm.wasmPaths='+JSON.stringify(pathToFileURL(path.join(root,'runtime')+'/').href)).replace('error:String(e)','error:String(e.stack||e)').replace('t.exports={}})),kn=','t.exports={createRequire:__createRequire}})),kn=');
const header=`
import fs from 'node:fs/promises';
import path from 'node:path';
import {parentPort} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {createRequire as __createRequire} from 'node:module';
const require=__createRequire(import.meta.url);
const root=${JSON.stringify(root)},cache=new Map();
globalThis.self=globalThis;
globalThis.location={href:import.meta.url,origin:'file://'};
globalThis.caches={open:async()=>({match:async key=>cache.get(key)?.clone(),put:async(key,value)=>cache.set(key,value.clone()),delete:async key=>cache.delete(key)})};
globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||input.href;let filename;if(url.startsWith('/'))filename=path.join(root,url);else if(url.startsWith('file:'))filename=fileURLToPath(url);else throw Error('Unexpected nonlocal fetch '+url);return new Response(await fs.readFile(filename),{headers:{'Content-Type':filename.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});};
globalThis.postMessage=data=>parentPort.postMessage(data);
`;
await fs.writeFile(generated,header+source+'\nparentPort.on("message",data=>self.onmessage({data}));\n');
class BrowserWorkerBridge {
 constructor(){this.thread=new NodeWorker(generated,{type:'module'});this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.stack||error.message}));}
 postMessage(data){this.thread.postMessage(data);}
 terminate(){this.thread.terminate();}
}
globalThis.Worker=BrowserWorkerBridge;


const corpusPath=process.env.CP18_CORPUS || new URL('../evidence/acceptance/G7_HOLDOUT_CORPUS.json',import.meta.url);
const corpusBytes=await fs.readFile(corpusPath),corpus=JSON.parse(corpusBytes);
const translator=new Translator(),output=[],identities={};
const outPath=path.resolve(process.env.CP18_OUTPUT || path.join(path.dirname(fileURLToPath(import.meta.url)),'../evidence/acceptance/journal-inference.json'));
const checkpointPath=outPath+'.partial.json';
const corpusHash=__hash(corpusBytes);
const expected=new Map(corpus.documents.flatMap(d=>d.segments.map(s=>[s.id,{...s,direction:d.direction}])));
let resumedCount=0;
for(const f of ['app/translation.js','app/semantic-spans.js','assets/engine.worker-4c3dcfee.js','models/en-id/manifest.json','models/id-en/manifest.json']){try{identities[f]=__hash(await fs.readFile(path.join(root,f)));}catch(e){if(e.code!=='ENOENT')throw e;}}
try {
 const prior=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
 if(prior.corpusSha256!==corpusHash || JSON.stringify(prior.identities)!==JSON.stringify(identities))throw Error('Checkpoint identities differ; refuse mixed-build evidence.');
 const seen=new Set();
 for(const row of prior.output){if(seen.has(row.id)||!expected.has(row.id)||expected.get(row.id).source!==row.source||expected.get(row.id).direction!==row.direction)throw Error('Invalid inference checkpoint row');seen.add(row.id);output.push(row);}
 resumedCount=output.length;
} catch(e) {if(e.code!=='ENOENT')throw e;}
const completed=new Set(output.map(x=>x.id));
const report=complete=>({testedAt:new Date().toISOString(),complete,expectedSegments:expected.size,completedSegments:output.length,resumedCount,corpusSha256:corpusHash,identities,sourceRoot:root,method:'Actual local model via Node Worker bridge; filesystem fetch/RAM cache transport. Per-segment checkpoints; no PDF extraction/browser or human-approval claim.',browserVerified:false,humanReview:'UNREVIEWED',output});
async function checkpoint(){await fs.writeFile(checkpointPath+'.tmp',JSON.stringify(report(false),null,2));await fs.rename(checkpointPath+'.tmp',checkpointPath);}
try{
 for(const direction of ['en-id','id-en']){
  if(corpus.documents.filter(d=>d.direction===direction).every(d=>d.segments.every(s=>completed.has(s.id))))continue;
  await translator.prepare(direction);
  for(const document of corpus.documents.filter(d=>d.direction===direction))for(const segment of document.segments){
   if(completed.has(segment.id))continue;
   const started=Date.now(),result=await translator.translate(segment.source);
   output.push({id:segment.id,documentId:document.documentId,domain:document.domain,direction,source:segment.source,...result,ms:Date.now()-started});
   completed.add(segment.id);await checkpoint();
   console.log(JSON.stringify({id:segment.id,completed:output.length,total:expected.size,status:result.status,outcome:result.outcome,ms:output.at(-1).ms}));
  }
 }
 await fs.writeFile(outPath,JSON.stringify(report(true),null,2));
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
