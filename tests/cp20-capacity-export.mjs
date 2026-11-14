/* Streaming export of ACTUAL parser records saved by cp20-capacity-parser.mjs.
 * Source-only Markdown: NOT translation completion or a browser download.
 */
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import assert from 'node:assert/strict';
const repo=fileURLToPath(new URL('../',import.meta.url));
const root=process.env.CP20_APP_ROOT?path.resolve(process.env.CP20_APP_ROOT):path.join(repo,'app');
const {createStreamingMarkdown}=await import(pathToFileURL(path.join(root,'app/export.js')).href);
const {BUILD_INFO}=await import(pathToFileURL(path.join(root,'app/build-info.js')).href);
const {marked}=await import('../tools/node_modules/marked/lib/marked.esm.js');
const recordRoot=path.join(repo,process.env.CP20_CAPACITY_IN||'evidence/cp20/qa/capacity-parser');
const out=path.join(repo,process.env.CP20_CAPACITY_EXPORT_OUT||'evidence/cp20/qa/capacity-export');await fs.mkdir(out,{recursive:true});
const parserResults=JSON.parse(await fs.readFile(path.join(recordRoot,'RESULTS.json')));
const rows=[];
for(const r of parserResults.rows.filter(r=>r.status==='PASS')){
 const name=r.fixture.file,dir=path.join(recordRoot,name.replace('.pdf',''));
 async function* pages(){for(let n=1;n<=r.fixture.pages;n++){const record=JSON.parse(await fs.readFile(path.join(dir,`${String(n).padStart(4,'0')}.json`)));assert.equal(record.assets.length,0,'raster records require separate blob storage');yield {page:{...record.page,blocks:record.blocks},assets:[]};}}
 let peak={rss:0,heapUsed:0,external:0,arrayBuffers:0};const sample=()=>{const m=process.memoryUsage();for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],m[k])};sample();const timer=setInterval(sample,100),start=performance.now();
 let result;
 try{
  const blob=await createStreamingMarkdown({document:{numPages:r.fixture.pages,committedPageCount:r.fixture.pages,fileName:name,sourceLanguage:r.fixture.language,targetLanguage:r.fixture.language==='en'?'id':'en'},pages:pages(),kind:'source',status:'paused',sourceSha256:r.sourceSha256,build:BUILD_INFO});
  const file=name.replace('.pdf','-SOURCE_ONLY.md');await pipeline(Readable.fromWeb(blob.stream()),createWriteStream(path.join(out,file)));clearInterval(timer);sample();
  const exportMs=performance.now()-start,stats=blob.exportStats;
  // Validation is intentionally outside export memory measurements.
  const raw=await fs.readFile(path.join(out,file));const md=raw.toString('utf8');const ids=new Set([...md.replaceAll('\\_','_').matchAll(/CP20B\d{4}_\d{2}/g)].map(x=>x[0]));assert.equal(ids.size,r.fixture.uniqueProseParagraphs);assert.match(md,/HASIL SEMENTARA/);assert.equal(stats.pages,r.fixture.pages);assert.equal(stats.maxActivePages,1);assert.equal(stats.partial,true);assert.equal(stats.counts.translated,0);
  const renderStart=performance.now(),html=marked.parse(md);const renderMs=performance.now()-renderStart;assert.equal((html.match(/<h3\b/g)||[]).length,r.fixture.pages,'each page preserves detected level-2 heading under document title');assert.ok(!html.includes('<script>'));assert.ok(!md.includes('data:image/'));
  result={file,status:'PASS',scope:'Actual extracted source records → streaming Markdown Blob → Node filesystem, full Marked parse. No browser download, translated output, or semantic approval.',sourceSha256:r.sourceSha256,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),exportMs,renderMs,stats,traceIds:ids.size,renderedH3:(html.match(/<h3\b/g)||[]).length,sampledPeakNodeMemoryBytes:peak,memoryLimit:'Export-only Node process RSS/heap/external, sampled 100ms; validation excluded. Not browser RAM.'};
 }catch(e){clearInterval(timer);result={file:name,status:'FAIL',error:e.stack||String(e),sampledPeakNodeMemoryBytes:peak};}
 rows.push(result);console.log(JSON.stringify(result));await fs.writeFile(path.join(out,'RESULTS.json'),JSON.stringify({build:BUILD_INFO,parserSource:parserResults.sourceAfter,exporterSha256:createHash('sha256').update(await fs.readFile(path.join(root,'app/export.js'))).digest('hex'),rows},null,2)+'\n');
}
if(rows.some(r=>r.status==='FAIL'))process.exitCode=1;
