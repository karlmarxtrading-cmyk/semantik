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
const {openPdf,validatePdf,imageCoverage,ocrPlan}=await import('../app/app/pdf-reader.js');
const dir=fileURLToPath(new URL('./fixtures/',import.meta.url));
const out=fileURLToPath(new URL('../evidence/pdf/extracted/',import.meta.url));await fs.mkdir(out,{recursive:true});
const results=[];
for(const name of ['digital-en.pdf','digital-id.pdf','mathematics.pdf','table-two-column.pdf','rotated.pdf','dense.pdf','password.pdf']) {
 const input=await fs.readFile(path.join(dir,name)),file=new File([input],name,{type:'application/pdf'});let reader;
 const started=performance.now();
 try{
  reader=await openPdf(file,{onPassword:()=>Promise.resolve('cp18-test-password')});
  const doc=await reader.extract();
  const text=doc.blocks.map(b=>b.text).join('\n');
  assert.ok(doc.blocks.length);assert.equal(doc.sourceItemCount,doc.coveredItemCount);
  if(name==='table-two-column.pdf'){assert.equal(doc.blocks.filter(b=>b.type==='table').length,1);assert.deepEqual(doc.blocks.at(-1).rows,[['Treatment','Outcome'],['Control group','10 mg'],['Intervention group','20 mg']]);assert.ok(doc.blocks.findIndex(b=>b.text.startsWith('Right column')) > doc.blocks.findIndex(b=>b.text.startsWith('Left column scientific prose line 4')))}
  if(name==='mathematics.pdf'){assert.ok(text.includes('𝑥'));assert.ok(text.includes('∅'));for(const b of doc.blocks.filter(b=>/^[|x𝑥∅(]/u.test(b.text)))assert.equal(b.type,'formula');}
  const dest=path.join(out,name.replace('.pdf',''));await fs.mkdir(dest,{recursive:true});
  for(const a of doc.assets){await fs.mkdir(path.dirname(path.join(dest,a.path)),{recursive:true});await fs.writeFile(path.join(dest,a.path),Buffer.from(await a.blob.arrayBuffer()))}
  await fs.writeFile(path.join(dest,'document.json'),JSON.stringify(doc,(k,v)=>v instanceof Blob?{bytes:v.size,type:v.type}:v,2));
  results.push({name,status:'PASS',pages:doc.pages.length,blocks:doc.blocks.length,sourceItems:doc.sourceItemCount,coveredItems:doc.coveredItemCount,elapsedMs:performance.now()-started,types:doc.blocks.map(b=>b.type)});
 }catch(e){results.push({name,status:'FAIL',error:String(e.stack||e),elapsedMs:performance.now()-started});}finally{await reader?.destroy()}
}
for(const [name,onPassword,expected] of [['corrupt.pdf',undefined,/PDF tidak dapat dibuka/],['password.pdf',()=>Promise.resolve(null),/kata sandi|dibatalkan/]]){
 try{const input=await fs.readFile(path.join(dir,name));await assert.rejects(openPdf(new File([input],name,{type:'application/pdf'}),{onPassword}),expected);results.push({name,case:onPassword?'cancel-password':'malformed',status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:String(e)})}
}
{
 const input=await fs.readFile(path.join(dir,'oversized-image.pdf'));const reader=await openPdf(new File([input],'oversized-image.pdf',{type:'application/pdf'}));
 try{await assert.rejects(reader.extract(),{code:'PDF_IMAGE_LIMIT'});results.push({name:'oversized-image.pdf',status:'PASS',expected:'Reject declared image dimensions above 24 megapixels, after operator parsing; not a predecode/heap bound'});}catch(e){results.push({name:'oversized-image.pdf',status:'FAIL',error:String(e)});}finally{await reader.destroy()}
}
await assert.rejects(validatePdf(new File(['{}'],'document.json',{type:'application/json'})),/Hanya dokumen PDF/);results.push({name:'json-input-rejected',status:'PASS'});
// Real parser image geometry with current OCR decision; OCR itself not invoked.
const pdfjs=await import('../app/vendor/pdfjs/pdf.min.mjs');
for(const name of ['mixed-digital-500-scan.pdf','scan.pdf']){
 const task=pdfjs.getDocument({data:new Uint8Array(await fs.readFile(path.join(dir,name))),isEvalSupported:false,useSystemFonts:false});const pdf=await task.promise;const p=await pdf.getPage(1),v=p.getViewport({scale:1}),t=await p.getTextContent();
 const images=await imageCoverage(p,v,pdfjs);const plan=ocrPlan(t.items.filter(i=>i.str).map(i=>({text:i.str})),images,v);assert.equal(plan.useOCR,true);if(name.startsWith('mixed'))assert.ok(plan.textCharacters>=400);
 results.push({name,status:'PASS',method:'real PDF text/operator parsing + current OCR plan; no OCR inference',plan,images});await task.destroy();
}
const report={method:'Actual PDF.js 6.2.108, production openPdf/extract, native canvas transport (not real browser). Synthetic fixtures labelled. Model translation and OCR are separate tests.',node:process.version,nodeShims:['Uint8Array.toHex','Map.getOrInsertComputed','Math.sumPrecise compensated summation for fixture geometry','file URL fetch; actual local bytes','native Canvas instead of browser DOM'],results};
await fs.writeFile(new URL('../evidence/pdf/real-parser.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
