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

const build=JSON.parse(await fs.readFile(path.join(repo,'evidence/build/BUILD_MANIFEST.json'))).build;
const activeRoot=path.join(repo,'dist',build.base);
const sourceNames=['pdf-reader.js','layout.js','math-geometry.js'];
const identity=async()=>Object.fromEntries(await Promise.all(sourceNames.map(async n=>[n,createHash('sha256').update(await fs.readFile(path.join(activeRoot,'app',n))).digest('hex')])));
const before=await identity();
const fixturePath=path.resolve(process.argv[2]||path.join(repo,'../experiments/cp20-authentic/light-and-matter.pdf'));
const out=path.join(repo,'evidence/cp20/qa/authentic-parser');await fs.mkdir(out,{recursive:true});
const started=performance.now();const abort=new AbortController();let peak={rss:0,heapUsed:0,external:0,arrayBuffers:0};
const sample=()=>{const m=process.memoryUsage();for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],m[k]);if(m.rss>1536*1048576)abort.abort(new Error('QA RSS cap 1536MiB'));return m};
const interval=setInterval(sample,100);const deadline=setTimeout(()=>abort.abort(new Error('QA deadline 360 seconds')),360000);
const summary={pages:0,blocks:0,characters:0,sourceItems:0,coveredItems:0,assets:0,assetBytes:0,maxActivePageRecords:0,coverageStatuses:{},mathStatuses:{},warningPages:0,blockTypes:{}};
const pages=[];let reader,error,lastReference=false;const digest=createHash('sha256');
try{
 const {openPdf}=await import(pathToFileURL(path.join(activeRoot,'app/pdf-reader.js')).href);
 const bytes=await fs.readFile(fixturePath);assert.ok(bytes.length<=100*1048576);
 const fixtureManifest=JSON.parse(await fs.readFile(path.join(repo,'tests/fixtures/cp20-authentic/MANIFEST.json')));assert.equal(createHash('sha256').update(bytes).digest('hex'),fixtureManifest.sha256,'exact fixture hash');
 reader=await openPdf(new File([bytes],path.basename(fixturePath),{type:'application/pdf'}));
 assert.ok(reader.numPages>1000,'original publisher PDF must exceed 1000 pages');
 for(let n=1;n<=reader.numPages;n++){
  const extracted=await reader.extract({startPage:n,endPage:n,bounded:true,includePageImages:false,initialReferenceSection:lastReference,initialTextCharacters:summary.characters,signal:abort.signal});
  assert.equal(extracted.pages.length,1);const p=extracted.pages[0];assert.equal(p.number,n);assert.equal(extracted.sourceItemCount,extracted.coveredItemCount);
  const text=extracted.blocks.map(b=>b.text||'').join('\n');digest.update(text);digest.update('\f');
  summary.pages++;summary.blocks+=extracted.blocks.length;summary.characters+=p.sourceTextCharacters;summary.sourceItems+=extracted.sourceItemCount;summary.coveredItems+=extracted.coveredItemCount;summary.assets+=extracted.assets.length;summary.assetBytes+=extracted.assets.reduce((v,a)=>v+a.blob.size,0);summary.maxActivePageRecords=Math.max(summary.maxActivePageRecords,extracted.pages.length);summary.warningPages+=Number(p.warnings?.length>0);summary.coverageStatuses[p.coverageStatus]=(summary.coverageStatuses[p.coverageStatus]||0)+1;
  for(const b of extracted.blocks)summary.blockTypes[b.type]=(summary.blockTypes[b.type]||0)+1;
  for(const r of p.mathEvidence?.regions||[])summary.mathStatuses[r.verified?'supported-geometry-only':'uncertain']=(summary.mathStatuses[r.verified?'supported-geometry-only':'uncertain']||0)+1;
  lastReference=p.referenceSection;
  const m=sample();pages.push({page:n,characters:p.sourceTextCharacters,blocks:extracted.blocks.length,sourceItems:extracted.sourceItemCount,coveredItems:extracted.coveredItemCount,coverageStatus:p.coverageStatus,warnings:p.warnings,sourceTextSha256:createHash('sha256').update(text).digest('hex'),retainedVisualSource:p.preserveVisualSource,assetBytes:extracted.assets.reduce((v,a)=>v+a.blob.size,0)});
  if(n===1||n%50===0||n===reader.numPages){console.log(n,summary.characters,Math.round(m.rss/1048576)+' MiB RSS');await fs.writeFile(path.join(out,'CHECKPOINT.json'),JSON.stringify({build,summary,peak,lastPage:n,elapsedMs:performance.now()-started},null,2)+'\n');}
 }
 assert.equal(summary.pages,reader.numPages);assert.ok(summary.characters>2000000,'diverse genuine source must exceed 2M extracted characters');assert.equal(summary.sourceItems,summary.coveredItems);assert.equal(summary.maxActivePageRecords,1);
}catch(e){error=e.stack||String(e);}finally{clearInterval(interval);clearTimeout(deadline);sample();await reader?.destroy();}
const after=await identity();const result={status:error?'FAIL':'PASS',scope:'Original author-published scientific textbook, actual final-dist production reader bounded source extraction only. No translation inference, no browser IndexedDB/export test. Incomplete OCR and uncertain formulas remain explicitly unresolved; item accounting is not semantic coverage.',build,fixturePath,sourceSha256:reader?.sourceSha256,numPages:reader?.numPages,summary,error,sourceBefore:before,sourceAfter:after,sourceStable:JSON.stringify(before)===JSON.stringify(after),orderedSourceTextSha256:digest.digest('hex'),elapsedMs:performance.now()-started,sampledPeakNodeMemoryBytes:peak,kernelMaxRssBytes:process.resourceUsage().maxRSS*1024,overallContentCoverageStatus:summary.coverageStatuses.incomplete?'INCOMPLETE':'NOT_HUMAN_REVIEWED',translationStatus:'NOT_RUN',mathVerificationScope:'Geometric support only, not mathematical or semantic accuracy.',memoryLimit:'Node process RSS sampled every100ms; abort cap1536MiB,360s. Not browser/physical laptop RAM qualification.',pages};
await fs.writeFile(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,pages:undefined},null,2));if(error)process.exitCode=1;
