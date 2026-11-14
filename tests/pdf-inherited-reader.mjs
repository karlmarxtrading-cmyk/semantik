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

const dir=fileURLToPath(new URL('../previous-source-qa/tests/fixtures/',import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8')),results=[];
const file=async name=>new File([await fs.readFile(path.join(dir,name))],name,{type:'application/pdf'});
for(const name of ['digital-en.pdf','digital-id.pdf','bilingual-text.pdf','two-column.pdf','academic-structures.pdf','rotated.pdf','unsafe-strings.pdf','password-protected.pdf']){
 let r;
 try{r=await openPdf(await file(name),{onPassword:()=>Promise.resolve('journal-test-password')});const doc=await r.extract(),text=doc.blocks.map(b=>b.text).join('\n');
 assert.equal(doc.pages.length,manifest[name].pages);assert.equal(doc.sourceItemCount,doc.coveredItemCount);
 for(const t of manifest[name].contains||[])assert.ok(text.includes(t),name+' missing '+t);
 let prev=-1;for(const t of manifest[name].order||[]){const i=text.indexOf(t);assert.ok(i>prev,name+' incorrect order '+t);prev=i}
 if(name==='academic-structures.pdf'){const formula=doc.blocks.find(b=>b.type==='formula');const table=doc.blocks.find(b=>b.type==='table');assert.ok(formula?.text.includes('mc²'));assert.equal(formula.translatable,false);assert.ok(table?.text.includes('Control'));assert.ok(table?.text.includes('Treatment'));assert.equal(table.translatable,true);assert.ok(doc.assets.some(a=>a.path===table.assetPath))}
 results.push({name,status:'PASS',sourceItems:doc.sourceItemCount,coveredItems:doc.coveredItemCount,blocks:doc.blocks.length,coverage:doc.pages.map(p=>p.coverageStatus)});
 }catch(e){results.push({name,status:'FAIL',error:String(e.stack||e)})}finally{await r?.destroy()}
}
for(const [name,pattern]of [['json-masquerading.pdf',/valid|PDF/],['corrupt.pdf',/PDF/]]){await assert.rejects(openPdf(await file(name)),pattern);results.push({name,status:'PASS',case:'rejected input'})}
{
 const r=await openPdf(await file('page-limit-301.pdf'));try{assert.equal(r.numPages,301);results.push({name:'page-limit-301.pdf',status:'PASS',case:'CP20 accepts 301 pages; extraction capacity is independently tested'})}finally{await r.destroy()}
 const bytes=await fs.readFile(new URL('./fixtures/cp20-capacity-2001-limit.pdf',import.meta.url));await assert.rejects(openPdf(new File([bytes],'limit-2001.pdf',{type:'application/pdf'})),/2\.?000|2000/);results.push({name:'cp20-capacity-2001-limit.pdf',status:'PASS',case:'upper page safety bound retained'});
}
{
 const r=await openPdf(await file('text-limit.pdf')),pages=[];try{await assert.rejects(r.extract({onPage:p=>pages.push(p.number)}),{code:'PDF_TEXT_LIMIT'});assert.deepEqual(pages,[1]);results.push({name:'text-limit.pdf',status:'PASS',completedPages:pages})}finally{await r.destroy()}
}
{
 const r=await openPdf(await file('references-continuation.pdf'));try{const first=await r.extract({endPage:1});const p=first.pages.at(-1);assert.equal(p.referenceSection,true);const resumed=await r.extract({startPage:2,initialReferenceSection:p.referenceSection,initialTextCharacters:p.sourceTextCharacters,initialAssets:first.assets});const ref=resumed.blocks.find(b=>b.text.includes('Jones, B.'));assert.equal(ref.type,'reference');assert.equal(ref.translatable,false);results.push({name:'references-continuation.pdf',status:'PASS',resumedAssetBytes:resumed.assetsBytes,sourceTextCharacters:resumed.sourceTextCharacters})}finally{await r.destroy()}
}
{
 const r=await openPdf(await file('mixed.pdf'));const c=new AbortController(),pages=[];try{await assert.rejects(r.extract({signal:c.signal,onPage:p=>{pages.push(p.number);c.abort()}}),{name:'AbortError'});assert.deepEqual(pages,[1]);results.push({name:'mixed.pdf',case:'cancel after first page; no OCR tested',status:'PASS',completedPages:pages})}finally{await r.destroy()}
}
const report={method:'Current production reader/PDF.js6.2.108 with Node nativeCanvas/fileFetch modernAPI shims as declared in pdf-real-parser. Original CP17 fixtures newly tested, NOT historical results reused.',changedExpectation:'Table remains structurally intact and translatable=true per explicit CP18 OUT05 requirement (formerly false). All content/geometry/image assertions retained.',results};await fs.writeFile(new URL('../evidence/pdf/inherited-reader.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
