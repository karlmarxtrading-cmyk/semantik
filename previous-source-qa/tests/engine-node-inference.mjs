// Exercise the original browser engine in Node, with local filesystem adapters.
// This is inference evidence, NOT a substitute for browser compatibility tests.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cache=new Map(),pending=new Map();let seq=0;
globalThis.self=globalThis;
globalThis.location={href:pathToFileURL(path.join(root,'tests/engine-node-worker.mjs')).href,origin:'file://'};
globalThis.caches={open:async()=>({match:async key=>cache.get(key)?.clone(),put:async(key,value)=>cache.set(key,value.clone()),delete:async key=>cache.delete(key)})};
globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||input.href;let filename;if(url.startsWith('/'))filename=path.join(root,url);else if(url.startsWith('file:'))filename=fileURLToPath(url);else throw Error('Unexpected nonlocal fetch '+url);return new Response(await fs.readFile(filename),{headers:{'Content-Type':filename.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});};
globalThis.postMessage=data=>{const p=pending.get(data.id);if(!p)return;if(data.error){pending.delete(data.id);p.reject(Error(data.error));}else if(data.result!==undefined){pending.delete(data.id);p.resolve(data.result);}};
const source=await fs.readFile(path.join(root,'assets/engine.worker-4c3dcfee.js'),'utf8');
const adapted='import {createRequire as __createRequire} from "node:module"; const require=__createRequire(import.meta.url);\n'+source.replace('N.wasm.wasmPaths=`/runtime/`','N.wasm.wasmPaths='+JSON.stringify(pathToFileURL(path.join(root,'runtime')+'/').href));
const debugAdapted=adapted.replace('error:String(e)', 'error:String(e.stack||e)').replace('t.exports={}})),kn=', 't.exports={createRequire:__createRequire}})),kn=');
const adaptedPath=path.join(root,'tests/engine-node-worker.mjs');await fs.writeFile(adaptedPath,debugAdapted);
const send=(action,payload)=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});self.onmessage({data:{id,action,payload}});});
try{
 await import(pathToFileURL(adaptedPath));
 const output=[];
 for(const direction of ['en-id','id-en']){
  console.log('PREPARE',direction,Date.now());const engine=await send('prepare',direction);console.log('READY',direction,Date.now());
  const samples=direction==='en-id'?['This study investigates the relationship between economic growth and education.','The study included 120 participants.','The result was significant (p < 0.05).'] : ['Penelitian ini menganalisis hubungan antara pertumbuhan ekonomi dan pendidikan.','Penelitian ini melibatkan 120 peserta.','Suhu sampel adalah 37 °C dan dosisnya 10 mg.'];
  for(const sourceText of samples){const start=Date.now();let result;try{result=await send('translate',{direction,sourceText});}catch(error){result={error:error.message};}const record={direction,source:sourceText,...result,ms:Date.now()-start};output.push(record);console.log('RESULT',JSON.stringify(record));}
 }
 await fs.writeFile(path.join(root,'evidence/engine-node-inference.json'),JSON.stringify({environment:'Node filesystem adapters; CP16 engine with test-only WASM path, Node createRequire stub, and error-stack reporting adaptations',browserVerified:false,output},null,2));
 await send('dispose',null);
}finally{await fs.rm(adaptedPath,{force:true});}
