/* Actual production serializer over preserved real-model results.
 * Explicit replay: not another model run, not production PDF extraction/browser E2E.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BASE=path.join(ROOT,'evidence/acceptance');
const OUT=path.join(BASE,'journal-replay-exports');
await mkdir(OUT,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=async p=>JSON.parse(await readFile(path.join(BASE,p),'utf8'));
const corpus=await read('G7_REAL_JOURNAL_CORPUS.json');
const inference=await read('REAL_JOURNAL_REVISED_INFERENCE.json');
const corpusHash=hash(await readFile(path.join(BASE,'G7_REAL_JOURNAL_CORPUS.json')));
assert.equal(inference.corpusSha256,corpusHash);assert.equal(inference.output.length,160);assert.equal(inference.complete,true);
const sourceHashes={};
for(const name of ['app/export.js','app/layout.js','app/build-info.js','vendor/export/jszip.min.js'])sourceHashes[name]=hash(await readFile(path.join(ROOT,'app',name)));
const require=createRequire(import.meta.url);
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onload?.({target:this});},error=>{this.error=error;this.onerror?.(error);});}};
globalThis.JSZip=require('../app/vendor/export/jszip.min.js');
const {createZip,summarizeBlocks}=await import('../app/app/export.js');
const {BUILD_INFO}=await import('../app/app/build-info.js');
const {marked}=await import('../tools/node_modules/marked/lib/marked.esm.js');
const byId=new Map(inference.output.map(x=>[x.id,x]));
const records=[];
const reportMethod='Fresh production export.js/JSZip serialization of first160 actual local-model outputs, replayed in Node with Blob/FileReader boundary. Reference source text was prepared independently from PDF/OCR; not fresh PDF extraction, not new inference, not browser E2E, not human approval.';
for(const d of corpus.documents){
 const bytes=await readFile(path.join(BASE,d.pdfPath));assert.equal(hash(bytes),d.pdfSha256);
 const file=new Blob([bytes],{type:'application/pdf'});file.name=path.basename(d.pdfPath);
 const blocks=d.segments.map(s=>{
  const r=byId.get(s.id);assert.equal(r.source,s.source);
  return {id:s.id,page:s.page,type:'paragraph',source:'REFERENCE_TEXT_REPLAY',bbox:s.bbox,
          text:s.source,target:r.text,status:r.status,outcome:r.outcome,
          sourcePreserved:r.outcome==='rejected',retryable:r.retryable,
          issues:r.issues||[],diagnostics:r.diagnostics||[],userReviewed:false,
          sourceItemIds:[s.id],modelEvidence:{inferenceId:s.id,method:r.method,direction:r.direction,
            engine:r.engine,sourceIdentity:inference.identities,corpusSha256:corpusHash},
          sourceReference:{pdfPath:d.pdfPath,pdfSha256:d.pdfSha256,page:s.page,bbox:s.bbox,
            transcriptionStatus:'HUMAN_UNVERIFIED',preparation:'reference PDF extraction / native OCR, not CP18 production reader'}};
 });
 const [source,target]=d.direction.split('-');
 const selectedPages=[...new Set(blocks.map(b=>b.page))].sort((a,b)=>a-b);
 const job={file,status:'paused',config:{source,target},build:{...BUILD_INFO,
       evidenceMethod:'ACTUAL_EXPORT_REPLAY_FIRST160_NOT_BROWSER',inferenceIdentities:inference.identities,
       exportModuleHashes:sourceHashes,corpusSha256:corpusHash},
     document:{fileName:file.name,metadata:{title:d.title+' [20 frozen review segments; replay evidence]',author:d.authors?.join('; ')||''},
      sourceLanguage:source,targetLanguage:target,numPages:d.pages,
      pages:selectedPages.map(number=>({number,source:'reference-replay',evidenceOnly:true})),
      blocks,assets:[],warnings:[reportMethod,'Only20 selected frozen source segments are represented; unselected PDF content is not claimed extracted or translated.','The source PDF is authentic and included for reviewer comparison. Human source transcription and scientific approval remain UNREVIEWED.']}};
 const blob=await createZip(job);const zipBytes=new Uint8Array(await blob.arrayBuffer());
 const zip=await JSZip.loadAsync(zipBytes,{checkCRC32:true});
 const zipName=d.documentId+'-FIRST160-REPLAY.zip';await writeFile(path.join(OUT,zipName),zipBytes);
 const metadata=JSON.parse(await zip.file('EXPORT_METADATA.json').async('string'));
 const provenance=JSON.parse(await zip.file('PROVENANCE.json').async('string'));
 assert.equal(metadata.sourceSha256,d.pdfSha256);assert.equal(metadata.semanticVerified,false);assert.equal(metadata.humanApproval,false);
 assert.deepEqual(metadata.counts,summarizeBlocks(blocks));assert.equal(provenance.blocks.length,20);
 for(let i=0;i<blocks.length;i++){
  assert.equal(provenance.blocks[i].id,blocks[i].id);assert.equal(provenance.blocks[i].text,blocks[i].text);assert.equal(provenance.blocks[i].target,blocks[i].target);
 }
 const hashLines=(await zip.file('SHA256SUMS.txt').async('string')).trim().split('\n');
 for(const line of hashLines){const sep=line.indexOf('  ');assert.ok(sep>0);const h=line.slice(0,sep),name=line.slice(sep+2);assert.equal(hash(await zip.file(name).async('uint8array')),h);}
 assert.equal(hash(await zip.file('JURNAL_SUMBER.pdf').async('uint8array')),d.pdfSha256);
 const artifacts=[];
 for(const type of ['ASLI','TERJEMAHAN','BILINGUAL']){
  const md=await zip.file(`JURNAL_${type}.md`).async('string');
  const markers=[...md.matchAll(/<!-- bagian: ([A-Za-z0-9_-]+) \| halaman: (\d+) -->/g)];
  assert.equal(markers.length,20);assert.deepEqual(markers.map(m=>m[1]),blocks.map(b=>b.id));
  assert.ok(md.includes('HASIL SEMENTARA'));assert.ok(md.includes('Total20')||md.includes('Total 20'));
  if(type!=='ASLI')assert.equal((md.match(/KANDIDAT DITOLAK:/g)||[]).length,blocks.filter(b=>b.outcome==='rejected').length);
  const html='<!doctype html><html lang="'+(type==='ASLI'?source:target)+'"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:"><title>'+d.documentId+' replay evidence</title><style>body{font:17px/1.6 system-ui;max-width:900px;margin:2rem auto;padding:1rem}blockquote{border-left:4px solid #b67400;padding:.2rem 1rem;background:#fff8e8}pre{white-space:pre-wrap}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.4rem}</style></head><body><aside><strong>REPLAY EVIDENCE — NOT NEW PDF EXTRACTION / INFERENCE / BROWSER ACCEPTANCE</strong></aside>'+marked.parse(md)+'</body></html>';
  assert.ok(!/<script\b/i.test(html));
  const prefix=d.documentId+'-'+type;
  await writeFile(path.join(OUT,prefix+'.md'),md);await writeFile(path.join(OUT,prefix+'.html'),html);
  artifacts.push({kind:type,markdown:prefix+'.md',markdownSha256:hash(md),html:prefix+'.html',htmlSha256:hash(html),pairedBlockIds:markers.map(m=>m[1])});
 }
 records.push({documentId:d.documentId,direction:d.direction,domain:d.domain,pdfPath:d.pdfPath,pdfSha256:d.pdfSha256,
               inferenceSourceIdentities:inference.identities,selectedPages,sourcePages:d.pages,
               zip:zipName,bytes:zipBytes.byteLength,sha256:hash(zipBytes),crc:'PASS_JSZIP_CHECKCRC32',
               counts:metadata.counts,provenanceExactSourceAndTarget:'PASS',internalSHA256:'PASS',artifacts});
 console.log(JSON.stringify({document:d.documentId,...metadata.counts,zipBytes:zipBytes.byteLength}));
}
for(const [name,h]of Object.entries(sourceHashes))assert.equal(hash(await readFile(path.join(ROOT,'app',name))),h,'Export dependencies changed during replay');
const result={schemaVersion:1,createdAt:new Date().toISOString(),method:reportMethod,corpusSha256:corpusHash,
 inferenceSha256:hash(await readFile(path.join(BASE,'REAL_JOURNAL_REVISED_INFERENCE.json'))),exportModuleHashes:sourceHashes,
 inferenceIdentities:inference.identities,counts:records.reduce((a,r)=>{for(const[k,v]of Object.entries(r.counts))a[k]=(a[k]||0)+v;return a;},{}),
 humanApprovals:0,browserVerified:false,newInference:false,newProductionPDFExtraction:false,records};
await writeFile(path.join(BASE,'JOURNAL_REPLAY_EXPORT_REPORT.json'),JSON.stringify(result,null,2));
await writeFile(path.join(OUT,'READ_ME_FIRST.txt'),reportMethod+'\n\nAll eight ZIPs contain authentic source PDFs,20 frozen model-output pairs each, explicit rejection counts, provenance and internal SHA256. These are selected samples, not complete translated papers. The first160 corpus was later exposed for structural bug fixes; preserve these initial outputs as historical first-run evidence. Independent scientific review remains pending and observed G7 errors remain documented.\n');
