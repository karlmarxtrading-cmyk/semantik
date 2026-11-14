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
for(const f of ['app/translation.js','app/semantic-spans.js','assets/engine.worker-4c3dcfee.js','models/en-id/manifest.json','models/id-en/manifest.json']){try{identities[f]=__hash(await fs.readFile(path.join(root,f)));}catch(e){if(e.code!=='ENOENT')throw e;}}
try{
 for(const direction of ['en-id','id-en']){
  await translator.prepare(direction);
  for(const document of corpus.documents.filter(d=>d.direction===direction))for(const segment of document.segments){
   const started=Date.now(),result=await translator.translate(segment.source);
   output.push({id:segment.id,documentId:document.documentId,domain:document.domain,direction,source:segment.source,...result,ms:Date.now()-started});
   console.log(JSON.stringify(output.at(-1)));
  }
 }
 const report={testedAt:new Date().toISOString(),corpusSha256:__hash(corpusBytes),identities,sourceRoot:root,method:'Actual local model via Node Worker bridge; filesystem fetch/RAM cache transport. Controlled-terminology/literal outcomes identified separately. No PDF extraction or browser claim.',browserVerified:false,humanReview:'UNREVIEWED',output};
 await fs.writeFile(process.env.CP18_OUTPUT || new URL('../evidence/translation/holdout-'+(process.env.CP18_LABEL||'revised')+'.json',import.meta.url),JSON.stringify(report,null,2));
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
