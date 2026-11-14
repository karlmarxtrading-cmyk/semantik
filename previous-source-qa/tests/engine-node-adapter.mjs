// Real WASM/model inference through the browser adapter in a Node Worker bridge.
// Browser transport and UI are verified separately. This bridge never fakes outputs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
import {Translator,auditTranslation} from '../app/translation.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const generated=path.join(root,'tests/engine-node-adapter-worker.mjs');
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
try{
 for(const direction of ['en-id','id-en']){
  console.log('PREPARE',direction);await translator.prepare(direction);console.log('READY',direction);
  const samples=direction==='en-id'?[
   {text:'This study investigates the relationship between economic growth and education.'},
   {text:'The study included 120 participants. The result was significant (p < 0.05).'},
   {text:'The temperature was 37 °C and the dose was 10 mg. Smith et al. (2024) reported no improvement.'},
   {text:'The results are described in https://example.org/paper and DOI:10.1234/science.2024.01.'},
   {text:'Machine learning improves the prediction of academic performance.',glossary:[{source:'machine learning',target:'pembelajaran mesin'}]},
   {text:'Abstract'}
  ]:[
   {text:'Penelitian ini menganalisis hubungan antara pertumbuhan ekonomi dan pendidikan.'},
   {text:'Penelitian ini melibatkan 120 peserta. Hasil penelitian menunjukkan perbedaan signifikan.'},
   {text:'Suhu sampel adalah 37 °C dan dosisnya 10 mg.'},
   {text:'Pembelajaran mesin meningkatkan prediksi kinerja akademik.',glossary:[{source:'Pembelajaran mesin',target:'Machine learning'}]},
   {text:'Abstrak'}
  ];
  for(const {text,glossary} of samples){const started=Date.now();const result=await translator.translate(text,{glossary});const item={direction,source:text,...result,ms:Date.now()-started};output.push(item);console.log('RESULT',JSON.stringify(item));}
 }
 const passed=output.filter(x=>!x.sourcePreserved&&x.source!==x.text&&auditTranslation(x.source,x.text).length===0).length;
 await fs.writeFile(path.join(root,'evidence/engine-node-adapter.json'),JSON.stringify({environment:'Node Worker bridge; real CP16 model inference; filesystem transport',browserVerified:false,passed,total:output.length,output},null,2));
 console.log('SUMMARY',passed+'/'+output.length);
}finally{await translator.dispose();await fs.rm(generated,{force:true});}
