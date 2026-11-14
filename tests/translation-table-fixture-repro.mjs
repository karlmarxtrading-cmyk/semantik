// Real WASM/model inference through the browser adapter in a Node Worker bridge.
// Browser transport and UI are verified separately. This bridge never fakes outputs.
import {createHash} from 'node:crypto';
const __hash=b=>createHash('sha256').update(b).digest('hex');
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
const root=path.resolve(process.env.CP17_SOURCE || path.join(path.dirname(fileURLToPath(import.meta.url)),'../app'));
const {Translator,auditTranslation}=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'translation-table-fixture-temporary-worker.mjs');
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


const document=JSON.parse(await fs.readFile(new URL('../evidence/pdf/extracted/table-two-column/document.json',import.meta.url)));
const original=JSON.stringify(document),translator=new Translator(),output=[];
const {serializeTableRows:serializeRows,auditTranslatedTable}=await import('./translation-table-contract.js');
const auditTableContract=(block,result)=>auditTranslatedTable(block,result,auditTranslation);

try{
 await translator.prepare('en-id');
 for(const block of document.blocks.filter(b=>b.translatable)){
  const result=block.type==='table'&&block.rows?await translator.translateTable(block):await translator.translate(block.text);
  const rawFlatIssues=auditTranslation(block.text,result.text);
  const structuralIssues=block.rows?auditTableContract(block,result):rawFlatIssues;
  const item={id:block.id,type:block.type,source:block.text,sourceRows:block.rows,sourceCellBboxes:block.cellBboxes,result,rawFlatIssues,structuralIssues,pass:!structuralIssues.length};output.push(item);console.log(JSON.stringify(item));
 }
 const table=document.blocks.find(b=>b.rows),result=output.find(b=>b.type==='table').result;
 const swapped=structuredClone(result);[swapped.translatedRows[1][1],swapped.translatedRows[2][1]]=[swapped.translatedRows[2][1],swapped.translatedRows[1][1]];swapped.text=serializeRows(swapped.translatedRows);
 const missing=structuredClone(result);missing.translatedRows[1].pop();missing.text=serializeRows(missing.translatedRows);
 const formulaSource={rows:[['Formula','|x| < 3']]},formulaChanged={translatedRows:[['Rumus','|x| > 3']],text:'Rumus | |x| > 3'};
 const controls={swappedValuesRejected:auditTableContract(table,swapped).length>0,missingCellRejected:auditTableContract(table,missing).length>0,formulaOperatorMutationRejected:auditTableContract(formulaSource,formulaChanged).length>0,sourceAndGeometryUnchanged:original===JSON.stringify(document)};
 const identities={};for(const f of ['app/translation.js','app/semantic-spans.js','assets/engine.worker-4c3dcfee.js'])identities[f]=__hash(await fs.readFile(path.join(root,f)));
 const report={testedAt:new Date().toISOString(),identities,method:'Actual local model for every translatable block of the extracted synthetic table/two-column fixture. Node bridge; browser test separate. Mutated result controls explicitly synthetic.',output,controls,pass:output.every(x=>x.pass)&&Object.values(controls).every(Boolean),diagnosis:'Raw block.text flattens source cells using spaces; translateTable text joins cells with explicit | separators. A scalar literal audit on unlike serializations correctly sees introduced bars but is the wrong table comparison contract. Per-cell identity checks, unchanged matrix dimensions, global equal-serialization audit and target/matrix consistency retain all mathematical guards.'};
 await fs.writeFile(new URL('../evidence/translation/table-fixture-repro.json',import.meta.url),JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
