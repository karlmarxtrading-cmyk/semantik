// Independent read-only review regression: actual main.js and long-document.js,
// with explicitly controlled DOM, storage, PDF and translator boundaries.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadMain} from './lifecycle-harness.mjs';
import {countBlocks,processLongDocument} from '../app/app/long-document.js';
const checks=[];
for(const failure of ['QuotaExceededError','SecurityError']){
 const page=n=>({number:n,blocks:[{id:`p000${n}-b001`,page:n,type:'paragraph',text:`Source ${n}`,target:`Original ${n}`,status:'translated',outcome:'translated',sourceIssues:[],issues:[]}],warnings:[]});
 const pages=new Map([1,2].map(n=>[n,{id:n,page:page(n),assets:[]}]));let deny=true;
 const h=await loadMain({checkpoint:{commitPage:async record=>{if(deny)throw new DOMException('controlled storage failure',failure);pages.set(record.page.number,structuredClone(record));},loadPage:async n=>structuredClone(pages.get(n))}});
 const p=structuredClone(pages.get(1).page),counts=countBlocks([...pages.get(1).page.blocks,...pages.get(2).page.blocks]);const doc={streaming:true,numPages:2,committedPageCount:2,savedPageCount:2,counts,pages:[p],blocks:p.blocks,assets:[],warnings:[],visibleCounts:countBlocks(p.blocks)};
 Object.assign(h.api.state,{file:{name:'fixture.pdf',size:10},pdf:{numPages:2},document:doc,token:{jobId:'j',writeEpoch:1},page:1,status:'complete',config:{source:'en',target:'id',layout:'auto',glossary:[]}});
 h.api.editBlock(p.blocks[0],'NEW USER EDIT',doc);await h.api.flushEdits();assert.equal(h.api.state.unsavedPage.page.blocks[0].target,'NEW USER EDIT');await h.api.resultPage(2);assert.equal(h.api.state.page,1);await h.api.resultPage(1);assert.equal(doc.blocks[0].target,'NEW USER EDIT');deny=false;await h.api.retrySave();assert.equal(pages.get(1).page.blocks[0].target,'NEW USER EDIT');assert.equal(h.api.state.dirty,false);assert.equal(h.api.state.unsavedPage,null);checks.push({name:`${failure}: user edit, failed commit, navigation/current-page protection, retry, persisted target`,status:'PASS'});
}
const pages=new Map();const h=await loadMain({checkpoint:{commitPage:async record=>pages.set(record.page.number,structuredClone(record)),loadPage:async n=>structuredClone(pages.get(n)||null)}});
const file={name:'scan.pdf',size:100};Object.assign(h.api.state,{file,pdf:{numPages:65,sourceSha256:'a'.repeat(64),metadata:{},extract:async({startPage:n})=>({pages:[{number:n,blocks:[{id:`p${String(n).padStart(4,'0')}-image`,page:n,type:'image',text:'',translatable:false,issues:['OCR failed']}],warnings:['OCR failed'],coverageStatus:'incomplete',sourceItemCount:0,coveredItemCount:0,sourceTextCharacters:0}],assets:[]})},token:{jobId:'scan',writeEpoch:1},status:'selected',config:{source:'en',target:'id',layout:'auto',glossary:[]}});
await h.api.runNow(true);assert.equal(h.api.state.status,'needs-attention');assert.equal(h.api.stats().done,0);assert.equal(h.api.stats().failed,65);assert.equal(h.api.state.document.coverageIncompletePages,65);assert.equal(h.api.state.document.extractionComplete,false);assert(h.api.state.document.warnings.length);checks.push({name:'65 image/OCR failure fallback pages do not become a completed translation',status:'PASS',observed:{status:h.api.state.status,done:h.api.stats().done,failed:h.api.stats().failed,coverageIncompletePages:h.api.state.document.coverageIncompletePages,extractionComplete:h.api.state.document.extractionComplete}});
{
 const previous={source:'en',target:'auto',layout:'auto',glossary:[]},config={...previous,source:'auto'};
 const block={id:'p0001-b001',page:1,type:'paragraph',text:'Penelitian ini mengukur pengaruh perubahan suhu terhadap tekanan udara pada sampel dalam ruangan laboratorium.',target:'previous result',status:'translated',outcome:'translated',issues:[],sourceIssues:[],translatable:true};
 const page={number:1,blocks:[block],extractionLayout:'auto',summary:countBlocks([block]),provenance:{configSignature:JSON.stringify(previous),ruleset:'r',release:'b'}};
 const prior={streaming:true,sourceSha256:'x',sourceLanguage:'en',targetLanguage:'id',numPages:1,committedPageCount:1,counts:page.summary,pages:[],blocks:[],assets:[],metrics:{},streamProvenance:{configSignature:JSON.stringify(previous)}};
 const directions=[];const translationModule={RULESET:'r',detectLanguage:()=> 'id',Translator:class{async prepare(direction){directions.push(direction)}async translate(){return{text:'English translation',status:'translated',issues:[]}}}};
 const {document}=await processLongDocument({pdf:{numPages:1,sourceSha256:'x'},file:{name:'id.pdf'},document:prior,config,translate:true,translationModule,build:{release:'b'},loadPage:async()=>({page,assets:[]}),commit:async()=>{}});
 assert.equal(document.sourceLanguage,'id');assert.equal(document.targetLanguage,'en');assert.deepEqual(directions,['id-en']);assert.equal(document.counts.translated,1);assert.equal(document.counts.preserved,0);checks.push({name:'Changing forced source language to automatic redetects source and chooses opposite target',status:'PASS'});
}
const sourceHashes={};for(const name of ['main.js','long-document.js','storage.js','pdf-reader.js'])sourceHashes[name]=createHash('sha256').update(await readFile(new URL('../app/app/'+name,import.meta.url))).digest('hex');const report={scope:'Actual application main and long pipeline modules in Node VM. DOM/storage/PDF/model doubles. Not browser, actual OCR, device memory, or real translation proof.',sourceHashes,checks};const out=new URL('../evidence/cp20/math/',import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('INDEPENDENT_PIPELINE_REVIEW.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
