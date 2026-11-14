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
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'translation-revised-temporary-worker.mjs');
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
 cases.push({id:'caps-title',source:'CLIMATE CHANGE'},{id:'caps-lit',source:'LITERATURE REVIEW'},{id:'caps-context',source:'The CLIMATE CHANGE hypothesis was tested.'},{id:'caps-glossary',source:'THE CLIMATE CHANGE hypothesis was tested.',glossary:[{source:'CLIMATE CHANGE',target:'perubahan iklim'}]},{id:'quantities',source:'The Ca2+ concentration was 10 μM.'},{id:'uncertainty',source:'The intervention may reduce mortality, but the evidence remains uncertain.'},{id:'chemistry-control',source:'The saline solution was mixed with water.'},{id:'union-control',source:'The trade union issued a statement.'},{id:'instruction-express',source:'Solve the inequality. Express the solution set in interval notation.'},{id:'express-nonmath-control',source:'The express delivery service transported the solution set worksheet.'},{id:'union-context',source:'Let A = ∅ and B = ℝ. Their union equals B.'},{id:'chemistry-article',source:'A solution containing sodium chloride was prepared before the assay.'});
 for(const c of cases){const started=Date.now();const result=await translator.translate(c.source,{glossary:c.glossary});const item={origin:c.origin||'Constructed CP18 regression/control; not historical user PDF.',...c,...result,ms:Date.now()-started};output.push(item);console.log('RESULT',JSON.stringify(item));}
 await translator.prepare('id-en');
 for(const source of ['KAJIAN PUSTAKA','Regresi linear mengestimasi ukuran efek.','Intervensi ini mungkin menurunkan mortalitas, tetapi bukti masih belum pasti.','Himpunan penyelesaian adalah ∅.','Dosis yang diberikan adalah 20 mg.','Intervensi tidak meningkatkan kelangsungan hidup.','Parameter diestimasi dari data pelatihan dan dievaluasi pada data terpisah.','Larutan mengandung 8 nM reagen dan disimpan pada 4 °C.']){const result=await translator.translate(source);output.push({id:'reverse-'+output.length,direction:'id-en',source,...result});console.log('RESULT',JSON.stringify(output.at(-1)));}
 const identities={};for(const file of ['app/translation.js','app/semantic-spans.js','assets/engine.worker-4c3dcfee.js','models/en-id/manifest.json','models/id-en/manifest.json']){identities[file]=__hash(await fs.readFile(path.join(root,file)));}
 const checks={expressMath:output.find(x=>x.id==='instruction-express').text.toLowerCase().includes('nyatakan'),expressNonmath:!output.find(x=>x.id==='express-nonmath-control').text.toLowerCase().includes('nyatakan'),unionContext:!output.find(x=>x.id==='union-context').text.toLowerCase().includes('serikat'),chemistry:!/(?:agasyar|solusi|^A )/u.test(output.find(x=>x.id==='chemistry-article').text),contractedNegation:output.find(x=>x.source==='Intervensi tidak meningkatkan kelangsungan hidup.').issues.length===0};
 const report={checks,pass:Object.values(checks).every(Boolean),testedAt:new Date().toISOString(),identities,environment:'CP18 adapter with actual preserved local WASM/model inference through Node Worker bridge; literal-only and controlled-terminology results labeled separately; filesystem fetch and RAM cache replace browser transport only. No model output is fabricated.',sourceRoot:root,browserVerified:false,originalPdfAvailable:false,output};
 await fs.writeFile(path.join(root,'../evidence/translation/revised-real-output.json'),JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
