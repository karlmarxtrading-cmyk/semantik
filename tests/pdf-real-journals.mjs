/* Current PDF.js + production reader; native Canvas stand-in for browser canvas.
 * No browser/OCR-model claim: Tesseract browser transport is not exercised here.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as canvas from '../tools/node_modules/@napi-rs/canvas/index.js';
for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
globalThis.document={createElement(type){assert.equal(type,'canvas');const c=canvas.createCanvas(1,1);c.style={};c.toBlob=(cb,type='image/png',q=.9)=>{try{cb(new Blob([c.toBuffer(type,type==='image/jpeg'?Math.round(q*100):undefined)],{type}))}catch(e){console.error(e);cb(null)}};return c}};
// Node 24 transport shims for modern browser APIs, declared in the report.
if(!Math.sumPrecise)Math.sumPrecise=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input,options)=>{const url=String(input?.url||input);if(url.startsWith('file:'))return new Response(await fs.readFile(fileURLToPath(url)));return nativeFetch(input,options)};

import {createHash} from 'node:crypto';
const {normalizeItems,imageCoverage,ocrPlan,PDF_LIMITS}=await import('../app/app/pdf-reader.js');
const {analyzeLayout}=await import('../app/app/layout.js');
const pdfjs=await import('../app/vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../app/vendor/pdfjs/pdf.worker.min.mjs',import.meta.url).href;
const vendor=new URL('../app/vendor/pdfjs/',import.meta.url),out=new URL('../evidence/pdf/real-journals/',import.meta.url);await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(new URL('../evidence/acceptance/G7_REAL_JOURNAL_CORPUS.json',import.meta.url),'utf8'));
const reports=[];
for(const d of manifest.documents){
 const file=new URL('../evidence/acceptance/'+d.pdfPath,import.meta.url),data=await fs.readFile(file);let task;const pages=[];const started=performance.now();
 try{assert.equal(createHash('sha256').update(data).digest('hex'),d.pdfSha256);task=pdfjs.getDocument({data:new Uint8Array(data),isEvalSupported:false,enableXfa:false,stopAtErrors:true,maxImageSize:-1,cMapUrl:new URL('cmaps/',vendor).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',vendor).href,wasmUrl:new URL('wasm/',vendor).href,iccUrl:new URL('iccs/',vendor).href});const pdf=await task.promise;assert.ok(pdf.numPages<=PDF_LIMITS.maxPages);let references=false;
 for(let n=1;n<=pdf.numPages;n++){
  const p=await pdf.getPage(n),viewport=p.getViewport({scale:1});const content=await p.getTextContent({includeMarkedContent:false,disableNormalization:false}),items=normalizeItems(content,viewport,pdfjs);assert.ok(items.length<=PDF_LIMITS.maxTextItemsPerPage);
  const images=await imageCoverage(p,viewport,pdfjs,undefined,()=>task.destroy()),plan=ocrPlan(items,images,viewport);
  const layout=analyzeLayout(items,{pageNumber:n,width:viewport.width,height:viewport.height,referenceSection:references});references=layout.referenceSection;
  assert.equal(layout.sourceItemCount,layout.coveredItemCount);pages.push({page:n,sourceItems:items.length,textCharacters:plan.textCharacters,ocrRequired:plan.useOCR,imageRegions:plan.regions,blocks:layout.blocks});p.cleanup();
 }
 const doc={id:d.documentId,status:'PASS_PARSER_AND_LAYOUT_ONLY',pages:pdf.numPages,ocrPages:pages.filter(p=>p.ocrRequired).length,sourceItems:pages.reduce((s,p)=>s+p.sourceItems,0),elapsedMs:performance.now()-started,inputSha256:createHash('sha256').update(data).digest('hex')};reports.push(doc);await fs.writeFile(new URL(d.documentId+'.json',out),JSON.stringify({...doc,pages},null,2));
 }catch(e){reports.push({id:d.documentId,status:'FAIL_PARSER',error:String(e.stack||e),completedPages:pages.length,elapsedMs:performance.now()-started})}finally{await task?.destroy()}
}
const result={method:'Current PDF.js6.2.108 and production normalizeItems/imageCoverage/ocrPlan/analyzeLayout. Real lawful journal PDFs from frozen acceptance corpus. Node modern-API/file-fetch/nativeCanvas shims; no OCR/translation inference or browser claim. Source item coverage is not visual coverage or scientific acceptance.',reports};await fs.writeFile(new URL('../evidence/pdf/real-journals-parser.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
