import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {analyzeLayout} from '../app/app/layout.js';
import {createMarkdown,createStandaloneMarkdown,createStreamingMarkdown} from '../app/app/export.js';
import {renderMarkdown} from './markdown-renderer.mjs';
const results=[];
async function test(name,fn){const start=performance.now();try{await fn();results.push({name,status:'PASS',ms:performance.now()-start});}catch(error){results.push({name,status:'FAIL',error:error.stack});}}
const item=(text,y,fontSize=12,bold=false,x=36)=>({text,x,y,width:Math.min(520,text.length*6),height:fontSize,fontSize,bold,sourceIndex:y,baseline:y+fontSize});
await test('References ends at an unfamiliar chapter title and repeated chapter bibliography',()=>{
 const a=analyzeLayout([item('References',50,18,true),item('Smith (2020). A statistical study. Journal 4, pp. 8–19.',90)],{pageNumber:1});assert.equal(a.referenceSection,true);assert.equal(a.blocks[1].type,'reference');
 for(const heading of ['Chapter Two: Differential Calculus','Bab Tiga: Perubahan Bentuk','The Hidden Architecture of Rain']){
  const b=analyzeLayout([item(heading,40,23,true),item('Changes in temperature modify the observed chemical reaction.',90),item('References',180,18,true),item('Jones (2021). Results. Journal 2, pp. 3–9.',220)],{pageNumber:2,referenceSection:a.referenceSection});
  assert.equal(b.blocks.find(x=>x.text.startsWith('Changes')).type,'paragraph');assert.equal(b.blocks.find(x=>x.text.startsWith('Changes')).translatable,true);assert.equal(b.referenceSection,true);
 }
});
await test('Sparse page unfamiliar heading works without a bold font-name signal',()=>{
 for(const heading of ['Boundary Layers','Unexpected Topologies']){
  const r=analyzeLayout([item(heading,40,18,false),item('This ordinary paragraph belongs to the next section.',90,11,false)],{pageNumber:5,referenceSection:true});
  assert.equal(r.blocks[0].type,'heading');assert.equal(r.blocks[0].level,1);assert.equal(r.blocks[1].type,'paragraph');assert.equal(r.blocks[1].translatable,true);assert.equal(r.referenceSection,false);
 }
});
await test('Bibliography continuation and prominent citation entry stay references',()=>{
 const r=analyzeLayout([item('Brown (2022). Modern methods, pp. 20–30.',50,18,true),item('Study details continuing on the following line.',100)],{pageNumber:3,referenceSection:true});assert.ok(r.blocks.every(x=>x.type==='reference'));assert.equal(r.referenceSection,true);
});
await test('Small running title above continuing citation does not end References',()=>{
 const r=analyzeLayout([item('Journal of Synthetic Studies',40,13),item('Jones, B. (2026). Follow-up research. doi:10.1234/second',90,10)],{pageNumber:2,referenceSection:true});
 assert.equal(r.blocks[0].sectionRole,'reference-continuation');assert.equal(r.blocks[1].type,'reference');assert.equal(r.referenceSection,true);
 const next=analyzeLayout([item('Boundary Layers',40,13),item('This ordinary paragraph begins another section of the book.',90,10)],{pageNumber:3,referenceSection:true});assert.equal(next.blocks[1].type,'paragraph');assert.equal(next.referenceSection,false);
});
await test('Ordinary prose beginning Part of does not become a chapter',()=>{const r=analyzeLayout([item('Part of the solution remains unchanged.',60),item('The experiment continues.',100)]);assert.ok(r.blocks.every(x=>x.type==='paragraph'));});
await test('Lists have explicit markers and continuation source item coverage',()=>{
 const r=analyzeLayout([item('1. Measure the volume.',40),item('using the calibrated vessel.',57,12,false,55),item('2. Record the value.',80),item('• Repeat the experiment.',110)]);assert.equal(r.blocks.length,3);assert.ok(r.blocks.every(x=>x.type==='list-item'));assert.equal(r.blocks[0].list.start,1);assert.equal(r.blocks[0].sourceItemIds.length,2);assert.equal(r.coveredItemCount,4);
});
const image=new Blob([Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iH1kAAAAASUVORK5CYII=','base64'))],{type:'image/png'});
const base={file:{name:'CP20 fixture.pdf'},status:'complete',config:{source:'en',target:'id'},document:{numPages:1,fileName:'CP20 fixture.pdf',pages:[{number:1,imagePath:'assets/page.png'}],assets:[{path:'assets/page.png',blob:image},{path:'assets/copy.png',blob:image}],blocks:[{id:'p0001-b0001',page:1,type:'heading',level:1,text:'A chapter',target:'Sebuah bab',status:'translated'},{id:'p0001-b0002',page:1,type:'heading',level:2,text:'A section',target:'Sebuah bagian',status:'translated'},{id:'p0001-b0003',page:1,type:'image',assetPath:'assets/page.png',text:'',target:'',status:'preserved'}]}};
await test('Hierarchy preserved and page numbers do not replace chapters',()=>{const md=createMarkdown(base,'translation');assert.match(md,/^## Sebuah bab$/m);assert.match(md,/^### Sebuah bagian$/m);assert.doesNotMatch(md,/^## Halaman/m);assert.match(md,/<!-- halaman: 1 -->/);});
await test('Identical image bytes with different paths embedded once and still render',async()=>{
 const job=structuredClone(base);job.document.blocks.push({id:'p0001-b0004',page:1,type:'image',assetPath:'assets/copy.png',text:'',target:'',status:'preserved'});
 const md=await createStandaloneMarkdown(job,'translation',{includePageSources:true});assert.equal((md.match(/data:image\/png;base64,/g)||[]).length,1);assert.equal((renderMarkdown(md).html.match(/<img /g)||[]).length,2);assert.doesNotMatch(md,/Citra sumber — halaman/);await fs.writeFile(new URL('../evidence/cp20/structure/deduplicated.md',import.meta.url),md);
});
await test('Digital page source raster optional while required fallback always available',async()=>{
 const job=structuredClone(base);job.document.blocks=job.document.blocks.slice(0,2);
 assert.doesNotMatch(await createStandaloneMarkdown(job),/data:image/);assert.match(await createStandaloneMarkdown(job,'translation',{includePageSources:true}),/data:image/);
 job.document.blocks.push({id:'p0001-b0003',page:1,type:'formula',text:'unknown notation',target:'unknown notation',status:'preserved',math:{verified:false},pageImagePath:'assets/page.png'});assert.match(await createStandaloneMarkdown(job),/data:image/);
});
await test('Successful figure OCR preserves essential visual in legacy and streaming exports',async()=>{
 const job=structuredClone(base);job.document.pages[0].preserveVisualSource=true;job.document.pages[0].coverageStatus='ocr-needs-review';job.document.pages[0].warnings=['Labels came from OCR; curve remains in source.'];job.document.blocks=job.document.blocks.slice(0,2);
 const legacy=await createStandaloneMarkdown(job);assert.match(legacy,/data:image/);assert.match(legacy,/Labels came from OCR/);
 const doc=streamDoc(1,{total:2,translated:2,preserved:0,rejected:0,failed:0,pending:0});
 async function* pages(){yield {page:{...job.document.pages[0],blocks:job.document.blocks},assets:job.document.assets};}
 const blob=await createStreamingMarkdown({document:doc,pages:pages(),status:'complete'}),md=await blob.text();assert.match(md,/data:image/);assert.match(md,/Labels came from OCR/);assert.equal(blob.exportStats.uniqueAssets,1);assert.equal(blob.exportStats.coverageIncompletePages,0);
});
await test('Unresolved per-page coverage and math warnings are exported and cannot claim complete',async()=>{
 const doc=streamDoc(1);doc.coverageIncompletePages=1;doc.mathUncertainPages=1;
 async function* pages(){yield {page:{number:1,coverageStatus:'incomplete',mathUncertain:true,warnings:['Image labels could not be read.'],blocks:[{id:'p0001-b0001',page:1,type:'paragraph',text:'Partial content',target:'Konten parsial',status:'translated'}]},assets:[]};}
 const blob=await createStreamingMarkdown({document:doc,pages:pages(),status:'complete'}),md=await blob.text();assert.equal(blob.exportStats.partial,true);assert.match(md,/CAKUPAN HALAMAN BELUM LENGKAP/);assert.match(md,/MATEMATIKA BELUM TERVERIFIKASI/);assert.match(md,/Image labels could not be read/);
 await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(1),pages:pages(),status:'complete'}),/Checkpoint lengkap/);
});
await test('Ordered and unordered lists render as lists while hostile source HTML stays escaped',()=>{
 const job=structuredClone(base);job.document.blocks=[{id:'p0001-b0001',page:1,type:'list-item',text:'1. First.',target:'1. Pertama.',status:'translated',list:{ordered:true,start:1}},{id:'p0001-b0002',page:1,type:'list-item',text:'2. Second.',target:'2. Kedua.',status:'translated',list:{ordered:true,start:2}},{id:'p0001-b0003',page:1,type:'paragraph',text:'<script>bad()</script>',target:'<script>bad()</script>',status:'translated'}];
 const md=createMarkdown(job,'translation'),html=renderMarkdown(md).html;assert.equal((html.match(/<ol/g)||[]).length,1);assert.equal((html.match(/<li>/g)||[]).length,2);assert.ok(!html.includes('<script>'));assert.match(md,/bagian: p0001-b0002/);
});
function streamDoc(n,counts={total:n,translated:n,preserved:0,rejected:0,failed:0,pending:0}){return {numPages:n,committedPageCount:n,counts,fileName:'stream.pdf'};}
async function* records(n,textSize=40){for(let page=1;page<=n;page++){const text=`UNIQUE-PAGE-${page} `+'Measured value remains reproducible. '.repeat(Math.ceil(textSize/35));yield {page:{number:page,blocks:[{id:`p${String(page).padStart(4,'0')}-b0001`,page,type:'paragraph',text,target:text,status:'translated'}]},assets:[]};}}
await test('1500 unique pages beyond two million characters export with reconciled IDs',async()=>{
 const start=performance.now(),blob=await createStreamingMarkdown({document:streamDoc(1500),pages:records(1500,1600),status:'complete'});const md=await blob.text();assert.ok(md.length>2_000_000);assert.equal((md.match(/<!-- halaman: /g)||[]).length,1500);assert.equal((md.match(/<!-- bagian: /g)||[]).length,1500);for(let i=1;i<=1500;i++)assert.ok(md.includes(`UNIQUE-PAGE-${i} `));assert.equal(blob.exportStats.maxActivePages,1);assert.equal(blob.exportStats.partial,false);await fs.writeFile(new URL('../evidence/cp20/structure/stream-1500-export.json',import.meta.url),JSON.stringify({...blob.exportStats,sha256:createHash('sha256').update(md).digest('hex'),elapsedMs:performance.now()-start,method:'Node actual exporter, diverse synthetic text generator; no PDF extraction, model inference, browser download or device claim'},null,2));
});
await test('Partial extraction can export committed prefix with pending blocks clearly marked',async()=>{
 const doc=streamDoc(3,{total:1,translated:0,preserved:0,rejected:0,failed:0,pending:1});doc.committedPageCount=1;
 async function* pages(){yield {page:{number:1,blocks:[{id:'p0001-b0001',page:1,type:'paragraph',text:'Saved before extraction failure.'}]},assets:[]};}
 const blob=await createStreamingMarkdown({document:doc,pages:pages(),status:'failed'}),md=await blob.text();assert.match(md,/HASIL SEMENTARA/);assert.match(md,/BELUM DITERJEMAHKAN/);assert.match(md,/Sisa 2 halaman belum tersedia/);assert.equal(blob.exportStats.partial,true);
});
await test('Quota-rescue output distinguishes available pages from unsaved changes',async()=>{
 const blob=await createStreamingMarkdown({document:streamDoc(2),pages:records(2),status:'complete',unsavedPages:[2]});const md=await blob.text();
 assert.equal(blob.exportStats.partial,true);assert.deepEqual(blob.exportStats.unsavedPages,[2]);assert.equal(blob.exportStats.durablePages,1);assert.equal(blob.exportStats.pages,2);
 assert.match(md,/Halaman tersedia dalam unduhan:\*\* 2\/2/);assert.match(md,/versi yang diekspor\):\*\* 1\/2/);assert.match(md,/Perubahan halaman 2 tersedia dalam unduhan ini tetapi belum tersimpan di browser/);assert.match(md,/HASIL SEMENTARA/);assert.match(md,/UNIQUE-PAGE-2/);
 await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(2),pages:records(2),unsavedPages:[3]}),/belum tersimpan tidak valid/);
});
await test('Missing pages, aggregate mismatch and duplicate IDs fail closed',async()=>{
 await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(3),pages:records(2),status:'complete'}),/Jumlah halaman/);
 const doc=streamDoc(1);doc.counts.total=2;await assert.rejects(()=>createStreamingMarkdown({document:doc,pages:records(1),status:'complete'}),/Jumlah bagian/);
 async function* pages(){yield {page:{number:1,blocks:[1,2].map(()=>({id:'p0001-b0001',page:1,type:'paragraph',text:'a',target:'a'}))},assets:[]};}
 await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(1),pages:pages()}),/Identitas bagian/);
});
await test('Fallback has a measured byte cap and cancellation prevents usable output',async()=>{
 await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(2),pages:records(2,2000),fallbackMaxBytes:2500}),/penulisan berkas lokal/);
 const controller=new AbortController();controller.abort();await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(1),pages:records(1),signal:controller.signal}),{name:'AbortError'});
});
await test('OPFS boundary commits a file, exposes cleanup and aborts failed writes',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');let closed=0,aborted=0,removed=0,writes=0,fail=false,parts=[];
 const root={async getFileHandle(){parts=[];return {async createWritable(){return {async write(blob){writes++;if(fail)throw new DOMException('quota','QuotaExceededError');parts.push(blob);},async close(){closed++;},async abort(){aborted++;}};},async getFile(){return new File(parts,'result.md',{type:'text/markdown'});}};},async removeEntry(){removed++;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{async getDirectory(){return root;}}}});
 try{const blob=await createStreamingMarkdown({document:streamDoc(2),pages:records(2),status:'complete'});assert.equal(blob.exportStats.sink,'opfs');assert.equal(closed,1);assert.ok(writes>=4);assert.equal(removed,0);assert.match(await blob.text(),/UNIQUE-PAGE-2/);await blob.exportCleanup();assert.equal(removed,1);
 fail=true;await assert.rejects(()=>createStreamingMarkdown({document:streamDoc(1),pages:records(1)}),{name:'QuotaExceededError'});assert.equal(aborted,1);assert.equal(removed,2);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
await test('Denied OPFS allows bounded small rescue export',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{storage:{async getDirectory(){throw new DOMException('denied','NotAllowedError');}}}});
 try{const blob=await createStreamingMarkdown({document:streamDoc(1),pages:records(1)});assert.equal(blob.exportStats.sink,'bounded-blob');assert.match(await blob.text(),/UNIQUE-PAGE-1/);}finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
await fs.writeFile(new URL('../evidence/cp20/structure/RESULTS.json',import.meta.url),JSON.stringify({method:'Actual CP20 layout/export source with Node Blob and real Marked/KaTeX; synthetic fixtures, not browser or model inference',results},null,2));
console.log(JSON.stringify(results,null,2));if(results.some(x=>x.status!=='PASS'))process.exitCode=1;
