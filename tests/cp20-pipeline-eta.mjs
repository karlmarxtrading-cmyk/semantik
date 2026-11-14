import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPageEta,processLongDocument,countBlocks,replaceCounts,zeroCounts} from '../app/app/long-document.js';
import {loadMain} from './lifecycle-harness.mjs';
import {processLongDocument as priorProcess} from './baseline/cp20-1668-long-document.mjs';
const checks=[];
async function test(name,fn){await fn();checks.push({name,status:'PASS'});console.log('PASS',name);}
await test('123 fast cached pages and a partial resumed page cannot inflate throughput',async()=>{
 const resumed=createPageEta(),fresh=createPageEta();
 for(let i=0;i<123;i++)resumed.record({durationMs:1,worked:false});
 resumed.record({durationMs:10,worked:true,partialResume:true});assert.equal(resumed.snapshot().sampleCount,0);assert.equal(resumed.estimate(870),null);
 for(const durationMs of [1000,1200,800]){resumed.record({durationMs,worked:true});fresh.record({durationMs,worked:true});}
 assert.equal(resumed.estimate(867),867000);assert.equal(resumed.estimate(867),fresh.estimate(867));
});
await test('ETA requires three new full-page measurements and retains only recent samples',async()=>{
 const eta=createPageEta();for(let i=0;i<2;i++)eta.record({durationMs:100,worked:true});assert.equal(eta.estimate(100),null);
 for(let i=0;i<9;i++)eta.record({durationMs:200,worked:true});assert.equal(eta.snapshot().sampleCount,8);assert.equal(eta.estimate(10),2000);assert.equal(eta.estimate(-1),null);
});
await test('Actual pipeline excludes cached replay and partial resumed page from ETA samples',async()=>{
 const config={source:'en',target:'id',layout:'auto',glossary:[]},build={release:'b'},records=new Map();let counts=zeroCounts(),calls=0;
 const makePage=n=>({number:n,blocks:[0,1].map(i=>({id:`p${String(n).padStart(4,'0')}-b${i+1}`,page:n,type:'paragraph',text:`Page ${n} academic paragraph ${i}.`,translatable:true,issues:[],sourceIssues:[]})),extractionLayout:'auto',sourceTextCharacters:60,sourceItemCount:2,coveredItemCount:2,referenceSection:false,warnings:[]});
 for(let n=1;n<=4;n++){const page=makePage(n);for(const [i,b]of page.blocks.entries())if(n<4||i===0)Object.assign(b,{target:'old translation',status:'translated',outcome:'translated',retryable:false});page.summary=countBlocks(page.blocks);page.provenance={configSignature:JSON.stringify(config),ruleset:'r',release:'b'};counts=replaceCounts(counts,zeroCounts(),page.summary);records.set(n,{id:n,page,assets:[]});}
 const prior={streaming:true,sourceSha256:'x',numPages:8,committedPageCount:4,counts,sourceItemCount:8,coveredItemCount:8,sourceTextCharacters:240,assetsBytes:0,metrics:{},streamProvenance:{configSignature:JSON.stringify(config)},pages:[],blocks:[],assets:[],warnings:[]};
 const progress=[];
 const pdf={numPages:8,metadata:{},sourceSha256:'x',async extract({startPage}){await new Promise(r=>setTimeout(r,1));return {pages:[makePage(startPage)],assets:[]};}};
 const translationModule={RULESET:'r',detectLanguage:()=> 'en',Translator:class{async prepare(){}async translate(){calls++;return {text:'new translation',status:'translated',issues:[]};}}};
 await processLongDocument({pdf,file:{name:'fixture.pdf',size:100},document:prior,config,translate:true,translationModule,build,loadPage:async n=>structuredClone(records.get(n)||null),commit:async record=>records.set(record.page.number,structuredClone(record)),onProgress:p=>progress.push(p)});
 assert.equal(calls,9);assert(progress.filter(p=>p.page<=4).every(p=>p.etaMs==null));
 assert.equal(progress.find(p=>p.stage==='page-complete'&&p.page===6).etaMs,null);
 assert(Number.isFinite(progress.find(p=>p.stage==='page-complete'&&p.page===7).etaMs));
});
await test('Actual resume restores bounded quota recovery/failure history and preserves it in subsequent metadata',async()=>{
 const page={number:1,blocks:[{id:'p0001-b1',page:1,type:'paragraph',text:'source',target:'target',status:'translated',outcome:'translated',issues:[]}]},counts=countBlocks(page.blocks);
 const recoveries=Array.from({length:7},(_,i)=>({cause:'QuotaExceededError',page:i+1,removedModelEntries:2,retryCount:1,succeeded:true}));
 const failures=Array.from({length:6},(_,i)=>({name:'QuotaExceededError',page:i+1,message:'fixture'}));
 const saved={file:{name:'fixture.pdf',size:100},meta:{streaming:true,status:'complete',config:{source:'en',target:'id',layout:'auto',glossary:[]},page:1,progress:counts,storageRecoveries:recoveries,storageFailures:failures,offlineCacheWarning:'Offline belum siap.'},document:{streaming:true,numPages:1,committedPageCount:1,counts,pages:[],blocks:[],assets:[],warnings:[]}};
 const h=await loadMain({checkpoint:{loadCheckpoint:async()=>structuredClone(saved),loadPage:async()=>({id:1,page:structuredClone(page),assets:[]})}});
 await h.api.resumeNow();assert.deepEqual(h.api.state.storageRecoveries,recoveries.slice(-5));assert.deepEqual(h.api.state.storageFailures,failures.slice(-5));
 assert.deepEqual(h.api.meta().storageRecoveries,recoveries.slice(-5));assert.deepEqual(h.api.meta().storageFailures,failures.slice(-5));assert.match(h.element('offline-status').textContent,/Offline belum siap/);
});
await test('ETA-only patch preserves exact document records, atomic writes, inference requests and non-ETA progress',async()=>{
 const identity=JSON.parse(await readFile(new URL('./baseline/cp20-1668-eta-identity.json',import.meta.url)));
 assert.equal(createHash('sha256').update(await readFile(new URL('./baseline/cp20-1668-long-document.mjs',import.meta.url))).digest('hex'),identity.sha256);
 const clean=value=>JSON.parse(JSON.stringify(value,(key,v)=>['etaMs','extractionMs','inferenceMs','commitMs','totalRunMs'].includes(key)?undefined:v));
 async function simulate(processor){
  const config={source:'en',target:'id',layout:'auto',glossary:[]},build={release:'b'},records=new Map(),requests=[],commits=[],progress=[];let counts=zeroCounts();
  const page=n=>({number:n,blocks:[0,1].map(i=>({id:`p${String(n).padStart(4,'0')}-b${i+1}`,page:n,type:'paragraph',text:`Page ${n} paragraph ${i}.`,translatable:true,sourceIssues:[],issues:[]})),extractionLayout:'auto',sourceTextCharacters:40,sourceItemCount:2,coveredItemCount:2,referenceSection:false,warnings:[]});
  for(let n=1;n<=3;n++){const p=page(n);for(const [i,b]of p.blocks.entries())if(n<3||i===0)Object.assign(b,{target:'prior result',status:'translated',outcome:'translated',retryable:false});p.summary=countBlocks(p.blocks);p.provenance={configSignature:JSON.stringify(config),ruleset:'r',release:'b'};counts=replaceCounts(counts,zeroCounts(),p.summary);records.set(n,{id:n,page:p,assets:[]});}
  const prior={streaming:true,sourceSha256:'x',createdAt:'fixture-time',numPages:7,committedPageCount:3,counts,sourceItemCount:6,coveredItemCount:6,sourceTextCharacters:120,assetsBytes:0,metrics:{},streamProvenance:{configSignature:JSON.stringify(config)},pages:[],blocks:[],assets:[],warnings:[]};
  const pdf={numPages:7,sourceSha256:'x',metadata:{},async extract({startPage}){return{pages:[page(startPage)],assets:[]};}};
  const translationModule={RULESET:'r',detectLanguage:()=> 'en',Translator:class{async prepare(direction){requests.push({prepare:direction});}async translate(text){requests.push({translate:text});return{text:'ID '+text,status:'translated',issues:[],metrics:{inferenceCalls:1,cacheHits:0}};}}};
  const result=await processor({pdf,file:{name:'fixture.pdf',size:100},document:prior,config,translate:true,translationModule,build,loadPage:async n=>structuredClone(records.get(n)||null),commit:async(record,summary)=>{commits.push(clean({record,summary}));records.set(record.page.number,structuredClone(record));},onProgress:p=>progress.push(clean(p))});
  return{records:clean([...records]),commits,requests,progress,document:clean(result.document)};
 }
 const before=await simulate(priorProcess),after=await simulate(processLongDocument);assert.deepEqual(after,before);
});
const sourceHashes={};for(const name of ['main.js','long-document.js'])sourceHashes[name]=createHash('sha256').update(await readFile(new URL('../app/app/'+name,import.meta.url))).digest('hex');
await writeFile(new URL('../evidence/cp20/pipeline/eta-resume-results.json',import.meta.url),JSON.stringify({method:'Actual ETA helper, actual pipeline with controlled PDF/model/page-store boundaries, and actual main resume with controlled DOM/storage. Deterministic timing inputs isolate the estimator; no browser performance claim.',sourceHashes,checks},null,2));
