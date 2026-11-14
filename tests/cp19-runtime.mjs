// Real WASM/model inference through the browser adapter in a Node Worker bridge.
// Browser transport and UI are verified separately. This bridge never fakes outputs.
import {createHash} from 'node:crypto';
const __hash=b=>createHash('sha256').update(b).digest('hex');
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Worker as NodeWorker} from 'node:worker_threads';
export const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const build=JSON.parse(await fs.readFile(path.join(repo,'evidence/build/BUILD_MANIFEST.json'))).build;
export const root=path.join(repo,'dist',build.base);

const {Translator,auditTranslation}=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const generated=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'cp19-temporary-worker-'+process.pid+'.mjs');
let source=await fs.readFile(path.join(root,'assets/engine.worker-4c3dcfee.js'),'utf8');
source=source.replace('N.wasm.wasmPaths=`'+build.base+'runtime/`','N.wasm.wasmPaths='+JSON.stringify(pathToFileURL(path.join(root,'runtime')+'/').href)).replace('error:String(e)','error:String(e.stack||e)').replace('t.exports={}})),kn=','t.exports={createRequire:__createRequire}})),kn=');
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
globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||input.href;let filename;if(url.startsWith('/'))filename=path.join(root,url.startsWith(${JSON.stringify(build.base)})?url.slice(${JSON.stringify(build.base.length)}):url);else if(url.startsWith('file:'))filename=fileURLToPath(url);else throw Error('Unexpected nonlocal fetch '+url);return new Response(await fs.readFile(filename),{headers:{'Content-Type':filename.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});};
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
import * as canvas from '../tools/node_modules/@napi-rs/canvas/index.js';
for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
if(!Math.sumPrecise)Math.sumPrecise=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s};
globalThis.document={createElement(type){if(type!=='canvas')throw Error('Only native canvas in Node test boundary');const c=canvas.createCanvas(1,1);c.style={};c.toBlob=(cb,type='image/png',q=.9)=>cb(new Blob([c.toBuffer(type,type==='image/jpeg'?Math.round(q*100):undefined)],{type}));return c}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input,options)=>{const url=String(input?.url||input);if(url.startsWith('file:'))return new Response(await fs.readFile(fileURLToPath(url)));return nativeFetch(input,options)};
