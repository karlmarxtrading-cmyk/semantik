/* Actual production reader and PDF.js with native Canvas/file transport in Node.
 * Page records written to disk are a QA sink, NOT browser IndexedDB durability.
 * No translation inference, browser download, OCR accuracy, or hosting claim.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as canvas from '../tools/node_modules/@napi-rs/canvas/index.js';
for(const k of ['DOMMatrix','ImageData','Path2D'])globalThis[k]=canvas[k];
if(!Uint8Array.prototype.toHex)Uint8Array.prototype.toHex=function(){return Buffer.from(this).toString('hex')};
if(!Map.prototype.getOrInsertComputed)Map.prototype.getOrInsertComputed=function(k,f){if(!this.has(k))this.set(k,f(k));return this.get(k)};
if(!Math.sumPrecise)Math.sumPrecise=values=>{let s=0,c=0;for(const x of values){const y=x-c,t=s+y;c=(t-s)-y;s=t;}return s};
globalThis.document={createElement(type){assert.equal(type,'canvas');const c=canvas.createCanvas(1,1);c.style={};c.toBlob=(cb,type='image/png',q=.9)=>cb(new Blob([c.toBuffer(type,type==='image/jpeg'?Math.round(q*100):undefined)],{type}));return c}};
const nativeFetch=globalThis.fetch;globalThis.fetch=async(input,options)=>{const url=String(input?.url||input);if(url.startsWith('file:'))return new Response(await fs.readFile(fileURLToPath(url)));return nativeFetch(input,options)};
const repo=fileURLToPath(new URL('../',import.meta.url));
const activeRoot=process.env.CP20_APP_ROOT?path.resolve(process.env.CP20_APP_ROOT):path.join(repo,'app');
const sourceNames=['pdf-reader.js','layout.js','math-geometry.js'];
const identity=async()=>Object.fromEntries(await Promise.all(sourceNames.map(async n=>[n,createHash('sha256').update(await fs.readFile(path.join(activeRoot,'app',n))).digest('hex')])));
const before=await identity();
const {openPdf,PDF_LIMITS}=await import(pathToFileURL(path.join(activeRoot,'app/pdf-reader.js')).href);
const fixtureDir=path.join(repo,'tests/fixtures/cp20-capacity');const manifest=JSON.parse(await fs.readFile(path.join(fixtureDir,'MANIFEST.json')));
const out=path.join(repo,process.env.CP20_CAPACITY_OUT||'evidence/cp20/qa/capacity-parser');await fs.mkdir(out,{recursive:true});
const picked=process.argv.slice(2);const rows=[];
for(const fixture of manifest.files.filter(x=>!picked.length||picked.includes(x.file))){
 const started=performance.now(),sampled=[];let peak={rss:0,heapUsed:0,external:0,arrayBuffers:0};
 const sample=()=>{const m=process.memoryUsage();for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],m[k]);return m};sample();const interval=setInterval(sample,100);
 const trace=JSON.parse(await fs.readFile(path.join(fixtureDir,fixture.traceManifest)));
 const file=new File([await fs.readFile(path.join(fixtureDir,fixture.file))],fixture.file,{type:'application/pdf'});
 const records=path.join(out,fixture.file.replace('.pdf',''));await fs.mkdir(records,{recursive:true});
 let reader,summary={pages:0,blocks:0,characters:0,sourceItems:0,coveredItems:0,assets:0,assetBytes:0,traceIds:0,maxActivePageRecords:0},lastReference=false,hash=createHash('sha256'),error;
 try{
  reader=await openPdf(file);assert.equal(reader.numPages,fixture.pages);
  for(let n=1;n<=reader.numPages;n++){
   const extracted=await reader.extract({startPage:n,endPage:n,bounded:true,includePageImages:false,initialReferenceSection:lastReference,initialTextCharacters:summary.characters});
   assert.equal(extracted.pages.length,1);const p=extracted.pages[0];assert.equal(p.number,n);assert.equal(extracted.sourceItemCount,extracted.coveredItemCount);assert.ok(extracted.blocks.length);
   const text=extracted.blocks.map(b=>b.text).join('\n');const expected=trace.pages[n-1];assert.ok(text.includes(expected.id),`page ID ${expected.id} missing`);
   const blockIds=[...text.matchAll(/CP20B\d{4}_\d{2}/g)].map(m=>m[0]);assert.deepEqual([...new Set(blockIds)].sort(),expected.blockIds.slice().sort());assert.equal(blockIds.length,new Set(blockIds).size,'duplicated paragraph ID');
   summary.pages++;summary.blocks+=extracted.blocks.length;summary.characters+=p.sourceTextCharacters;summary.sourceItems+=extracted.sourceItemCount;summary.coveredItems+=extracted.coveredItemCount;summary.assets+=extracted.assets.length;summary.assetBytes+=extracted.assets.reduce((v,a)=>v+a.blob.size,0);summary.traceIds+=blockIds.length;summary.maxActivePageRecords=Math.max(summary.maxActivePageRecords,extracted.pages.length);lastReference=p.referenceSection;
   const serial={page:p,blocks:extracted.blocks,assets:extracted.assets.map(a=>({...a,blob:undefined,bytes:a.blob.size})),sourceSha256:reader.sourceSha256};const serialized=JSON.stringify(serial);hash.update(serialized);await fs.writeFile(path.join(records,`${String(n).padStart(4,'0')}.json`),serialized);
   if(n===1||n%100===0||n===reader.numPages){const m=sample();sampled.push({page:n,elapsedMs:performance.now()-started,...m});console.log(fixture.file,n,summary.characters,Math.round(m.rss/1048576)+' MiB RSS');}
  }
  assert.equal(summary.pages,fixture.pages);assert.equal(summary.traceIds,fixture.uniqueProseParagraphs);assert.equal(summary.sourceItems,summary.coveredItems);assert.equal(summary.maxActivePageRecords,1);
  if(fixture.rich)assert.ok(summary.characters>2_000_000,'rich fixture must exceed legacy text ceiling with actual extracted characters');
 }catch(e){error=e.stack||String(e);}finally{clearInterval(interval);sample();await reader?.destroy();}
 const result={fixture,status:error?'FAIL':'PASS',method:'Actual production openPdf and bounded per-page extract / PDF.js 6.2.108; native Canvas and disk QA sink. No translation or browser download.',summary,error,sourceSha256:reader?.sourceSha256,orderedPageRecordsSha256:hash.digest('hex'),elapsedMs:performance.now()-started,sampledPeakNodeMemoryBytes:peak,memoryLimit:'Node process only; 100ms sampled. Not total browser/worker/WASM/Canvas RAM and not a physical-device qualification.',samples:sampled};rows.push(result);await fs.writeFile(path.join(out,fixture.file.replace('.pdf','-result.json')),JSON.stringify(result,null,2)+'\n');
}
const after=await identity();const result={node:process.version,platform:process.platform,appRoot:activeRoot,sourceBefore:before,sourceAfter:after,sourceStable:JSON.stringify(before)===JSON.stringify(after),limits:PDF_LIMITS,rows};await fs.writeFile(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(rows.map(r=>({file:r.fixture.file,status:r.status,summary:r.summary,seconds:r.elapsedMs/1000,error:r.error})),null,2));if(rows.some(r=>r.status==='FAIL'))process.exitCode=1;
