import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker as NodeWorker } from 'node:worker_threads';
import { createHash } from 'node:crypto';

const out = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(out, '../../source');
const release = path.join(site, 'r/7a8e787a497535f5');
const { Translator, auditTranslation, semanticWarnings, detectLanguage } = await import(pathToFileURL(path.join(release,'app/translation.js')));
let bundle = await fs.readFile(path.join(release,'assets/engine.worker-4c3dcfee.js'),'utf8');
const originalSha256 = createHash('sha256').update(bundle).digest('hex');
const replacements = [
  ['N.wasm.wasmPaths=`/r/7a8e787a497535f5/runtime/`', 'N.wasm.wasmPaths='+JSON.stringify(pathToFileURL(path.join(release,'runtime')+'/').href)],
  ['t.exports={}})),kn=', 't.exports={createRequire:__createRequire}})),kn='],
  ['error:String(e),', 'error:String(e.stack||e),']
];
for (const [from,to] of replacements) {
  if (!bundle.includes(from)) throw Error('Bridge expected fragment missing: '+from);
  bundle=bundle.replace(from,to);
}
const prelude=`
import fs from 'node:fs/promises';
import path from 'node:path';
import {parentPort} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {createRequire as __createRequire} from 'node:module';
globalThis.self=globalThis;
globalThis.location={href:'https://local.invalid/r/7a8e787a497535f5/assets/engine.worker-4c3dcfee.js',origin:'https://local.invalid'};
const stores=new Map();
globalThis.caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);const key=r=>typeof r==='string'?r:r.url;return {async match(r){return store.get(key(r))?.clone()},async put(r,v){store.set(key(r),v.clone())},async delete(r){return store.delete(key(r))},async keys(){return [...store.keys()].map(k=>new Request(k))}}}};
globalThis.fetch=async (input)=>{const raw=typeof input==='string'?input:input.url;const u=new URL(raw,'https://local.invalid/');if(!['https://local.invalid','null'].includes(u.origin))throw Error('Nonlocal fetch blocked: '+u.origin);const target=u.protocol==='file:'?fileURLToPath(u):path.join(${JSON.stringify(site)},decodeURIComponent(u.pathname));const bytes=await fs.readFile(target);return new Response(bytes,{status:200,headers:{'Content-Type':target.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});};
globalThis.postMessage=data=>parentPort.postMessage(data);
`;
const workerFile = path.join(out,'worker-bridge.generated.mjs');
await fs.writeFile(workerFile, prelude+bundle+'\nparentPort.on("message",data=>self.onmessage({data}));\n');
class BrowserWorkerBridge {
  constructor(){this.worker=new NodeWorker(pathToFileURL(workerFile));this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',error=>this.onerror?.({message:error.stack||String(error)}));}
  postMessage(data){this.worker.postMessage(data)}
  terminate(){return this.worker.terminate()}
}
globalThis.Worker=BrowserWorkerBridge;

// End-to-end core pipeline, not a browser/UI/OCR/checkpoint test.
const {createRequire}=await import('node:module');
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'@napi-rs/canvas/package.json'));
const canvas=require('@napi-rs/canvas');
for(const key of ['DOMMatrix','ImageData','Path2D'])globalThis[key]=canvas[key];
if(!Uint8Array.prototype.toHex)Object.defineProperty(Uint8Array.prototype,'toHex',{value(){return Buffer.from(this).toString('hex');}});
if(!Map.prototype.getOrInsertComputed)Object.defineProperty(Map.prototype,'getOrInsertComputed',{value(key,callback){if(!this.has(key))this.set(key,callback(key));return this.get(key);}});
if(!Map.prototype.getOrInsert)Object.defineProperty(Map.prototype,'getOrInsert',{value(key,value){if(!this.has(key))this.set(key,value);return this.get(key);}});
if(!Math.sumPrecise)Math.sumPrecise=function(values){let sum=0,correction=0;for(const x of values){const t=sum+x;if(Math.abs(sum)>=Math.abs(x))correction+=(sum-t)+x;else correction+=(x-t)+sum;sum=t;}return sum+correction;};
const pdfjs=await import(pathToFileURL(path.join(release,'vendor/pdfjs/pdf.min.mjs')).href);
pdfjs.GlobalWorkerOptions.workerSrc=pathToFileURL(path.join(release,'vendor/pdfjs/pdf.worker.min.mjs')).href;
const {normalizeItems}=await import(pathToFileURL(path.join(release,'app/pdf-reader.js')));
const {analyzeLayout}=await import(pathToFileURL(path.join(release,'app/layout.js')));
const {createMarkdown,summarizeBlocks}=await import(pathToFileURL(path.join(release,'app/export.js')));
const report={scope:'Actual uploaded PDF.js parser -> CP18 normalizeItems/layout -> actual bundled ONNX translator -> actual Markdown exporter. Node standard API shims and transport bridge only. Browser, canvas/OCR, checkpoint and download click not tested.',originalWorkerSha256:originalSha256,bridgeOnlyChanges:replacements.map(x=>x[0]),documents:[]};
const translator=new Translator();
try{
 for(const language of ['en','id']){
  const target=language==='en'?'id':'en',direction=`${language}-${target}`,filename=`academic_prose_${language}.pdf`;
  const data=new Uint8Array(await fs.readFile(path.join(out,filename)));
  const task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:false,stopAtErrors:true,enableXfa:false,standardFontDataUrl:path.join(release,'vendor/pdfjs/standard_fonts/'),cMapUrl:path.join(release,'vendor/pdfjs/cmaps/'),cMapPacked:true,wasmUrl:path.join(release,'vendor/pdfjs/wasm/')});
  const pdf=await task.promise,pages=[],blocks=[];
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),viewport=page.getViewport({scale:1});
   const content=await page.getTextContent({includeMarkedContent:false,disableNormalization:false});
   const items=normalizeItems(content,viewport,pdfjs);
   const layout=analyzeLayout(items,{pageNumber:i,width:viewport.width,height:viewport.height,layout:'auto',source:'pdf-text'});
   blocks.push(...layout.blocks);pages.push({number:i,width:viewport.width,height:viewport.height,source:'pdf-text',blocks:layout.blocks,warnings:layout.warnings});
  }
  await task.destroy();
  const readonlyTypes=new Set(['formula','reference','image']);
  const sample=blocks.filter(b=>b.translatable!==false&&!readonlyTypes.has(b.type)).map(b=>b.text).join(' ').slice(0,16000);
  const detectedSource=detectLanguage(sample);
  const blockLanguage=block=>{const detected=detectLanguage(block.text||''),words=(block.text||'').split(/\s+/).length;if(block.type==='heading'&&detected!=='unknown')return detected;if(detected===target&&words>=12)return target;if(detected!=='unknown'&&words>=6)return detected;return detectedSource;};
  await translator.prepare(direction);
  const raw=[];
  for(const block of blocks){
   const result=block.translatable===false||readonlyTypes.has(block.type)||!block.text?.trim()||blockLanguage(block)===target?{text:block.text||'',status:'preserved',issues:[]}:await (block.type==='table'&&Array.isArray(block.rows)?translator.translateTable(block):translator.translate(block.text));
   raw.push({id:block.id,type:block.type,language:blockLanguage(block),source:block.text,result});
   block.target=result.text;block.status=result.status;block.issues=[...new Set([...(block.sourceIssues||[]),...(result.issues||[])])];
   block.outcome=result.outcome||(result.status==='preserved'?'preserved':result.sourcePreserved?'rejected':'translated');
   block.sourcePreserved=Boolean(result.sourcePreserved);block.semanticVerified=false;block.retryable=Boolean(result.retryable);block.diagnostics=result.diagnostics||[];
   if(result.translatedRows)block.translatedRows=result.translatedRows;
   if(block.issues.length&&block.status==='translated')block.status='review';
  }
  const document={numPages:pages.length,pages,blocks,assets:[],sourceLanguage:detectedSource,targetLanguage:target,metadata:{},warnings:pages.flatMap(p=>p.warnings)};
  const counts=summarizeBlocks(blocks),status=counts.rejected||counts.failed||counts.pending?'needs-attention':'complete';
  const job={file:{name:filename},document,status,config:{source:'auto',target}};
  const markdown=createMarkdown(job,'translation');
  await fs.writeFile(path.join(out,`FRESH_TRANSLATION_${direction}.md`),markdown);
  report.documents.push({filename,detectedSource,direction,status,counts,document,raw});
  await fs.writeFile(path.join(out,'prose_pipeline_results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({filename,detectedSource,status,counts,results:raw},null,2));
 }
}finally{await translator.dispose();await fs.rm(workerFile,{force:true});}

