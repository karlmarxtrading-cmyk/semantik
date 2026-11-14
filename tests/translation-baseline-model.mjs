// Real WASM/model inference through the browser adapter in a Node Worker bridge.
// Browser transport and UI are verified separately. This bridge never fakes outputs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
const root=path.resolve(process.env.CP17_SOURCE || path.join(path.dirname(fileURLToPath(import.meta.url)),'../baseline'));
const {Translator,auditTranslation}=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'translation-baseline-temporary-worker.mjs');
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

const translator=new Translator();const output=[];
const prose='Solve the inequality. Write your answer in interval notation, using U for union.';
const glossary=[{source:'inequality',target:'pertidaksamaan'},{source:'union',target:'gabungan'},{source:'solution set',target:'himpunan penyelesaian'},{source:'real number',target:'bilangan riil'}];
const cases=[
 {id:'observed_formula_italic_lt',source:'||𝑥 − 4| − 4| < 1',origin:'Exact preserved source text from p0001-b0004; Markdown escapes decoded.'},
 {id:'control_formula_ascii_lt',source:'||x − 4| − 4| < 1',origin:'Constructed comparison: italic x changed to ASCII x.'},
 {id:'control_formula_italic_le',source:'||𝑥 − 4| − 4| ≤ 1',origin:'Constructed comparison passed directly to translation adapter. Actual PDF classifier preserves this relation without translation.'},
 {id:'constructed_math_instruction',source:prose,origin:'Constructed English case matching the type of instruction; original PDF text unavailable.'},
 {id:'constructed_math_instruction_glossary',source:prose,glossary,origin:'Same constructed case with four domain glossary entries.'},
 {id:'constructed_solution_set',source:'The solution set is (−1, 1) ∪ (7, 9).',origin:'Constructed English case, not a recovered original PDF sentence.'},
 {id:'constructed_solution_set_glossary',source:'The solution set is (−1, 1) ∪ (7, 9).',glossary,origin:'Same constructed case with four domain glossary entries.'},
 {id:'constructed_empty_set',source:'No real number satisfies the inequality. Solution set: ∅',origin:'Constructed English case to test symbol handling; origin of uploaded å still needs the source PDF.'},
 {id:'constructed_empty_set_glossary',source:'No real number satisfies the inequality. Solution set: ∅',glossary,origin:'Same constructed case with domain glossary; tests whether glossary alone fixes symbol transport.'},
 {id:'constructed_identifier',source:'ID absolute-value-inequalities~challenge~nested-abs~34f24hj2-0~0',origin:'Constructed identifier based on visible topic and suffix; original PDF identifier not provided.'},
 {id:'constructed_real_instruction',source:'Solve the inequality. Write your answer in interval notation (or all real numbers / ∅ no solution).',origin:'Constructed English case to probe degree-sign and lexical behavior, not a recovered source.'}
];
try{
 console.log('PREPARE en-id');await translator.prepare('en-id');console.log('READY en-id');
 for(const c of cases){const started=Date.now();const result=await translator.translate(c.source,{glossary:c.glossary});const item={...c,...result,ms:Date.now()-started};output.push(item);console.log('RESULT',JSON.stringify(item));}
 const report={environment:'Real CP17 local WASM model through Node Worker bridge; filesystem fetch and RAM cache replace browser transport only. No model output is fabricated.',sourceRoot:root,browserVerified:false,originalPdfAvailable:false,output};
 await fs.writeFile(path.join(root,'../evidence/translation/baseline-real-output.json'),JSON.stringify(report,null,2));
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
