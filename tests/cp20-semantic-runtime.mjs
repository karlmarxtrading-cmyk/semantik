// Real WASM/model inference through the browser adapter in a Node Worker bridge.
// Browser transport and UI are verified separately. This bridge never fakes outputs.
import {createHash,randomUUID} from 'node:crypto';
const __hash=b=>createHash('sha256').update(b).digest('hex');
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
export const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const root=process.env.CP20_SEMANTIC_ROOT?path.resolve(process.env.CP20_SEMANTIC_ROOT):path.join(repo,'app');
export const build={sourceRoot:root,adapterSHA256:__hash(await fs.readFile(path.join(root,'app/translation.js'))),rulesSHA256:__hash(await fs.readFile(path.join(root,'app/claim-guards.js'))),spansSHA256:__hash(await fs.readFile(path.join(root,'app/semantic-spans.js'))),workerSHA256:__hash(await fs.readFile(path.join(root,'assets/engine.worker-4c3dcfee.js')))};

const {Translator,auditTranslation}=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'cp20-semantic-temporary-worker-'+randomUUID()+'.mjs');
let source=await fs.readFile(path.join(root,'assets/engine.worker-4c3dcfee.js'),'utf8');
const base=source.match(/N\.wasm\.wasmPaths=`([^`]+)runtime\/`/)[1];
source=source.replace('N.wasm.wasmPaths=`'+base+'runtime/`','N.wasm.wasmPaths='+JSON.stringify(pathToFileURL(path.join(root,'runtime')+'/').href)).replace('error:String(e)','error:String(e.stack||e)').replace('t.exports={}})),kn=','t.exports={createRequire:__createRequire}})),kn=');
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
globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||input.href;let filename;if(url.startsWith('/'))filename=path.join(root,url.startsWith(${JSON.stringify(base)})?url.slice(${JSON.stringify(base.length)}):url);else if(url.startsWith('file:'))filename=fileURLToPath(url);else throw Error('Unexpected nonlocal fetch '+url);return new Response(await fs.readFile(filename),{headers:{'Content-Type':filename.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});};
globalThis.postMessage=data=>parentPort.postMessage(data);
`;
await fs.writeFile(generated,header+source+'\nparentPort.on("message",data=>self.onmessage({data}));\n');
class BrowserWorkerBridge {
 constructor(){this.thread=new NodeWorker(generated,{type:'module'});this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.stack||error.message}));}
 postMessage(data){this.thread.postMessage(data);}
 terminate(){this.thread.terminate();}
}
globalThis.Worker=BrowserWorkerBridge;


export {Translator};
export async function cleanupBridge(){await fs.rm(generated,{force:true});}
