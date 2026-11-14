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
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'translation-table-temporary-worker.mjs');
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



const translator=new Translator();
const input={type:'table',rows:[['Sample mean','Standard deviation'],['20','10 μM'],['Solution set','∅'],['Formula','||𝑥 − 4| − 4| < 1']]};
const original=JSON.stringify(input),output=[];
try{
 await translator.prepare('en-id');
 const result=await translator.translateTable(input);
 const checks={sameRowCount:result.translatedRows.length===input.rows.length,sameCellCounts:result.translatedRows.every((r,i)=>r.length===input.rows[i].length),sourceUnchanged:original===JSON.stringify(input),numbersUnitsIntact:result.translatedRows[1][0]==='20'&&result.translatedRows[1][1]==='10 μM',setGlyphIntact:result.translatedRows[2][1]==='∅',formulaIntact:result.translatedRows[3][1]===input.rows[3][1],proseTranslated:result.translatedRows[0][0]==='Rata-rata sampel'&&result.translatedRows[0][1]==='Simpangan baku'};
 const identities={};for(const file of ['app/translation.js','app/semantic-spans.js','assets/engine.worker-4c3dcfee.js'])identities[file]=__hash(await fs.readFile(path.join(root,file)));
 const report={testedAt:new Date().toISOString(),identities,method:'Real adapter table pipeline with actual local model, controlled terminology and literal cells distinguished via the same adapter. Synthetic table fixture, not user historical PDF; browserVerified=false.',input,result,checks,pass:Object.values(checks).every(Boolean)};
 await fs.writeFile(new URL('../evidence/translation/table-model.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
