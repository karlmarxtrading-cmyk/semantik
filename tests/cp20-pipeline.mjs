import assert from 'node:assert/strict';
import {indexedDB,IDBObjectStore} from '../tools/node_modules/fake-indexeddb/build/esm/index.js';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as storage from '../app/app/storage.js';
import {processLongDocument,countBlocks,zeroCounts,streamPreflight} from '../app/app/long-document.js';
globalThis.indexedDB=indexedDB;
const results=[];
async function test(name,fn){await fn();results.push({name,status:'PASS'});console.log('PASS',name);}
const file=new Blob(['%PDF-1.7\nCP20-pipeline-fixture']);file.name='pipeline.pdf';
const build={release:'cp20-pipeline-test',sourceHash:'fixture'};
const config={source:'en',target:'id',layout:'auto',glossary:[]};
let token,doc;
let inferenceCalls=0,extractCalls=0,failAt=Infinity;
const module={RULESET:'test-rules-v1',detectLanguage:()=> 'en',Translator:class{
 async prepare(){}
 async translate(text){inferenceCalls++;return {text:'ID '+text,status:'translated',issues:[],metrics:{inferenceCalls:1,cacheHits:0,uniqueInputs:1}};}
}};
const pdf={numPages:1500,metadata:{},sourceSha256:'a'.repeat(64),async extract({startPage:n,endPage,bounded,includePageImages,initialTextCharacters}){
 assert.equal(endPage,n);assert.equal(bounded,true);assert.equal(includePageImages,false);extractCalls++;if(n===failAt)throw new Error('injected extraction failure');
 const text=`page-${n}: `+'Distinct academic argument '.repeat(58);
 const block={id:`p${String(n).padStart(4,'0')}-b001`,page:n,type:'paragraph',text,translatable:true,issues:[]};
 return {pages:[{number:n,blocks:[block],sourceItemCount:1,coveredItemCount:1,sourceTextCharacters:text.length,referenceSection:false,warnings:[]}],assets:[]};
}};
const commit=async(record,summary)=>{assert.equal(summary.blocks.length,0);assert.equal(summary.assets.length,0);assert.equal(summary.pages.length,0);await storage.commitPage(record,summary,{status:'processing',streaming:true,progress:summary.counts},token);};
const run=opts=>processLongDocument({pdf,file,document:doc,config,translate:true,translationModule:module,build,loadPage:n=>storage.loadPage(n,token),commit,onVisible:d=>{doc=d;assert.ok(d.pages.length<=1);assert.ok(d.blocks.length<=1);},...opts});
await test('1500 unique controlled pages >2M chars process with one active page and atomic checkpoints',async()=>{
 token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256});
 const result=await run();doc=result.document;assert.equal(doc.committedPageCount,1500);assert.equal(doc.counts.translated,1500);assert.ok(doc.sourceTextCharacters>2_000_000);assert.equal(inferenceCalls,1500);assert.equal(extractCalls,1500);
 const restored=await storage.loadCheckpoint({lazy:true});assert.equal(restored.document.blocks.length,0);assert.equal(restored.savedPages,undefined);assert.equal(restored.savedBlocks,undefined);
 assert.equal((await storage.loadPage(1500,token)).page.blocks[0].target.startsWith('ID page-1500'),true);
});
await test('Streaming commits and metadata saves never rewrite original source File',async()=>{
 const original=IDBObjectStore.prototype.put;let sourceWrites=0;
 IDBObjectStore.prototype.put=function(value,...args){if(this.name==='source'){sourceWrites++;throw Error('source Blob rewrite forbidden');}return original.call(this,value,...args);};
 try{const record=await storage.loadPage(1,token);await storage.commitPage(record,doc,{streaming:true,status:'processing'},token);await storage.saveStreamSummary(doc,{streaming:true,status:'paused'},token);await storage.saveCheckpointMeta({streaming:true,status:'paused'},token);const current=await storage.loadCheckpoint({lazy:true});assert.equal(current.document.committedPageCount,1500);assert.equal(current.file.size,file.size);assert.equal(sourceWrites,0);}finally{IDBObjectStore.prototype.put=original;}
});
await test('Lazy restore and page iterator never call whole-store getAll',async()=>{
 const original=IDBObjectStore.prototype.getAll;IDBObjectStore.prototype.getAll=function(){throw Error('getAll is forbidden for lazy restore');};
 try{const current=await storage.loadCheckpoint({lazy:true});assert.equal(current.document.committedPageCount,1500);let pages=0;for await(const record of storage.iteratePages(token,{endPage:1500})){pages++;assert.equal(record.page.number,pages);}assert.equal(pages,1500);}finally{IDBObjectStore.prototype.getAll=original;}
});
await test('Resume same provenance reuses successful results without duplicate extraction/inference',async()=>{const count=inferenceCalls;await run();assert.equal(inferenceCalls,count);assert.equal(extractCalls,1500);assert.equal(doc.counts.total,1500);assert.equal(doc.counts.translated,1500);});
await test('Configuration invalidates old machine result and preserves corrected source/history',async()=>{
 pdf.numPages=2;token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256});doc=null;await run();
 const record=await storage.loadPage(1,token);const block=record.page.blocks[0];block.originalText=block.text;block.text='Corrected academic source';block.sourceEditedAt='fixture';block.target='Reviewed target';block.editedAt='fixture';await storage.saveBlock(block,token);
 const count=inferenceCalls;await run({config:{...config,glossary:[{source:'academic',target:'akademik'}]}});
 const updated=(await storage.loadPage(1,token)).page.blocks[0];assert.equal(updated.text,'Corrected academic source');assert.equal(updated.target,'ID Corrected academic source');assert.equal(updated.previousUserResult.target,'Reviewed target');assert.equal(inferenceCalls-count,2);assert.equal(doc.counts.total,2);
});
await test('Subsequent extraction failure leaves all earlier pages and translations salvageable',async()=>{
 token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256});doc=null;pdf.numPages=3;failAt=2;
 await assert.rejects(()=>run(),/injected extraction failure/);const saved=await storage.loadCheckpoint({lazy:true});assert.equal(saved.document.committedPageCount,1);assert.equal((await storage.loadPage(1,token)).page.blocks[0].status,'translated');assert.equal(await storage.loadPage(2,token),null);failAt=Infinity;
});
await test('Quota failure rolls page + metadata back atomically',async()=>{
 const before=await storage.loadCheckpoint({lazy:true});const record=await storage.loadPage(1,token);record.page.blocks[0].target='MUST NOT COMMIT';
 const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='meta')throw new DOMException('Injected quota full','QuotaExceededError');return original.call(this,value,...args);};
 try{await assert.rejects(()=>storage.commitPage(record,before.document,{status:'WRONG'},token),{name:'QuotaExceededError'});}finally{IDBObjectStore.prototype.put=original;}
 assert.equal((await storage.loadCheckpoint({lazy:true})).meta.status,before.meta.status);assert.notEqual((await storage.loadPage(1,token)).page.blocks[0].target,'MUST NOT COMMIT');
});
await test('Stale writer cannot read or overwrite active long checkpoint',async()=>{
 const old=token;token=await storage.claimCheckpoint(token);await assert.rejects(()=>storage.loadPage(1,old),{name:'InvalidStateError'});const record=await storage.loadPage(1,token);await assert.rejects(()=>storage.commitPage(record,doc,{},old),{name:'InvalidStateError'});
});
await test('Cancelled inference retains extracted source and pending status',async()=>{
 token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256});doc=null;pdf.numPages=2;
 const controller=new AbortController();const abortModule={...module,Translator:class{async prepare(){controller.abort();throw new DOMException('Cancelled','AbortError');}}};
 await assert.rejects(()=>run({signal:controller.signal,translationModule:abortModule}),{name:'AbortError'});const page=await storage.loadPage(1,token);assert.equal(page.page.blocks[0].target,undefined);assert.equal(page.page.summary.pending,1);
});
await test('Preflight rejects insufficient storage without starting expensive pipeline',async()=>{await assert.rejects(()=>streamPreflight({file,pdf,storage:{estimate:async()=>({quota:10_000_000,usage:9_000_000}),persist:async()=>false}}),/Ruang browser tersisa/);});
await test('Forced-source to auto redetects language rather than inheriting the forced direction',async()=>{
 token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256});doc=null;pdf.numPages=1;await run();assert.equal(doc.sourceLanguage,'en');
 await run({config:{...config,source:'auto',target:'auto'},translationModule:{...module,detectLanguage:()=> 'id'}});
 assert.equal(doc.sourceLanguage,'id');assert.equal(doc.targetLanguage,'en');assert.equal(doc.counts.translated,1);
});
await test('Unresolved image fallback remains incomplete and is not counted as translated/preserved success',async()=>{
 token=await storage.createCheckpoint(file,{sourceSha256:pdf.sourceSha256});doc=null;
 const imagePdf={...pdf,numPages:1,async extract(){return {pages:[{number:1,blocks:[{id:'p0001-image',page:1,type:'image',text:'',translatable:false,issues:['OCR failed']}],coverageStatus:'incomplete',sourceItemCount:0,coveredItemCount:0,sourceTextCharacters:0,referenceSection:false,warnings:['OCR failed']}],assets:[]};}};
 await run({pdf:imagePdf});assert.equal(doc.coverageIncompletePages,1);assert.equal(doc.counts.failed,1);assert.equal(doc.counts.done,0);assert.equal(doc.extractionComplete,false);
});
const hashes={};for(const name of ['storage.js','long-document.js','main.js','pdf-reader.js'])hashes[name]=createHash('sha256').update(await readFile(new URL('../app/app/'+name,import.meta.url))).digest('hex');
await writeFile(new URL('../evidence/cp20/pipeline/controlled-results.json',import.meta.url),JSON.stringify({method:'Actual CP20 storage/long-document code with fake-indexeddb and controlled PDF/translator doubles. Validates sequencing, bounded active page shape and atomicity, NOT actual PDF inference, browser RAM or semantic quality.',sourceHashes:hashes,results},null,2));
