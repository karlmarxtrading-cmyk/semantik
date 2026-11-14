import {indexedDB,IDBObjectStore} from '../tools/node_modules/fake-indexeddb/build/esm/index.js';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
globalThis.indexedDB=indexedDB;
const storage=await import('../app/app/storage.js');
const results=[];const test=async(name,fn)=>{await fn();results.push({name,result:'PASS'});console.log('PASS',name);};
const file=new Blob(['%PDF-1.7\nfixture']);file.name='lifecycle-fixture.pdf';
const document={numPages:1,pages:[{number:1}],blocks:[{id:'p1b1',page:1,text:'Dose 10 mg.',originalText:'Dose 10 mg.',target:'Dosis 10 mg.',status:'translated'}],assets:[]};
let token;
await test('Atomic corrected source persists when translations invalidated',async()=>{
 token=await storage.createCheckpoint(file,{status:'selected'});await storage.saveExtraction(document,token);const corrected={...document.blocks[0],text:'Dose 20 mg.',sourceEditedAt:'fixture'};await storage.saveBlock(corrected,token);
 const current=structuredClone(document);current.blocks[0]={...corrected};delete current.blocks[0].target;delete current.blocks[0].status;
 await storage.clearTranslations(current,{status:'paused'},token);const reloaded=await storage.loadCheckpoint();assert.equal(reloaded.document.blocks[0].text,'Dose 20 mg.');assert.equal(reloaded.savedBlocks[0].text,'Dose 20 mg.');assert.equal(reloaded.savedBlocks[0].originalText,'Dose 10 mg.');assert.equal(reloaded.savedBlocks[0].target,undefined);
});
await test('Claim generation invalidates every stale writer transaction',async()=>{
 const old=token;token=await storage.claimCheckpoint(token);assert.equal(token.writeEpoch,old.writeEpoch+1);
 for(const write of [()=>storage.saveBlock({id:'p1b1',text:'STALE'},old),()=>storage.saveCheckpointMeta({status:'STALE'},old),()=>storage.saveExtractedPage({number:1},[],old),()=>storage.beginExtraction({status:'STALE'},[],old),()=>storage.saveExtraction({blocks:[]},old),()=>storage.clearTranslations({blocks:[]},{status:'STALE'},old),()=>storage.saveSnapshot({document:{blocks:[]},partialPages:[],meta:{}},old),()=>storage.deleteCheckpoint(old)])await assert.rejects(write,{name:'InvalidStateError'});
 const result=await storage.loadCheckpoint();assert.equal(result.document.blocks[0].text,'Dose 20 mg.');
});
await test('Replaced job rejects old block IDs and stale delete',async()=>{
 const old=token;token=await storage.createCheckpoint(file,{status:'new'});await storage.saveExtraction(document,token);await assert.rejects(()=>storage.saveBlock({id:'p1b1',text:'STALE A'},old),{name:'InvalidStateError'});await assert.rejects(()=>storage.deleteCheckpoint(old),{name:'InvalidStateError'});assert.equal((await storage.loadCheckpoint()).document.blocks[0].text,'Dose 10 mg.');
});
await test('Snapshot write failure rolls back document, block and meta atomically',async()=>{
 const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...rest){if(this.name==='blocks')throw new DOMException('Injected quota failure','QuotaExceededError');return original.call(this,value,...rest);};
 try{await assert.rejects(()=>storage.saveSnapshot({document:{...document,blocks:[{...document.blocks[0],text:'Dose 90 mg.'}]},partialPages:[],meta:{status:'partial'}},token),{name:'QuotaExceededError'});}finally{IDBObjectStore.prototype.put=original;}
 const current=await storage.loadCheckpoint();assert.equal(current.document.blocks[0].text,'Dose 10 mg.');assert.equal(current.meta.status,'new');
});
await test('Full retry snapshot persists all corrections and outputs after failure',async()=>{
 const next={...document,blocks:[{...document.blocks[0],text:'Dose 20 mg.',target:'Dosis 20 mg.',sourceEditedAt:'fixture',userReviewed:true}]};await storage.saveSnapshot({document:next,partialPages:[],meta:{status:'complete'}},token);const result=await storage.loadCheckpoint();assert.equal(result.savedBlocks[0].text,'Dose 20 mg.');assert.equal(result.savedBlocks[0].target,'Dosis 20 mg.');assert.equal(result.savedBlocks[0].userReviewed,true);assert.equal(result.document.blocks[0].originalText,'Dose 10 mg.');
});
await test('Legacy CP17 claim preserves file and content; rejects changed timestamp',async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('semantik-pdf-checkpoint-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 await new Promise((resolve,reject)=>{const tx=db.transaction(['meta'],'readwrite');tx.objectStore('meta').put({id:'current',filename:'legacy.pdf',updatedAt:'fixture-timestamp'});tx.oncomplete=resolve;tx.onerror=reject;});
 await assert.rejects(()=>storage.claimCheckpoint({filename:'legacy.pdf',updatedAt:'old'}),{name:'InvalidStateError'});token=await storage.claimCheckpoint({filename:'legacy.pdf',updatedAt:'fixture-timestamp'});assert.ok(token.jobId);assert.equal(token.writeEpoch,1);assert.equal((await storage.loadCheckpoint()).document.blocks[0].text,'Dose 20 mg.');
});
await test('Extraction checkpoint keeps corrected prior revision across cancellation and reload',async()=>{const prior={document:structuredClone(document),config:{layout:'auto'},signature:'fixture'};prior.document.blocks[0].text='Dose 20 mg.';await storage.beginExtraction({status:'extracting'},[],token,prior);const saved=await storage.loadCheckpoint();assert.equal(saved.document,null);assert.equal(saved.prior.document.blocks[0].text,'Dose 20 mg.');assert.equal(saved.prior.document.blocks[0].originalText,'Dose 10 mg.');await storage.saveSnapshot({document:prior.document,partialPages:[],meta:{status:'paused'},prior:null},token);assert.equal((await storage.loadCheckpoint()).prior,null);});
await test('Delete clears all stores under current ownership only',async()=>{await storage.deleteCheckpoint(token);const result=await storage.loadCheckpoint();assert.equal(result.meta,undefined);assert.equal(result.file,undefined);assert.equal(result.savedBlocks.length,0);assert.equal(result.savedPages.length,0);});
await writeFile(new URL('../evidence/lifecycle/storage-regression.json',import.meta.url),JSON.stringify({environment:{node:process.version,platform:process.platform,fakeIndexedDB:'6.2.5'},method:'actual storage.js transactions using fake-indexeddb boundary; not browser storage',sourceSha256:createHash('sha256').update(await readFile(new URL('../app/app/storage.js',import.meta.url))).digest('hex'),results},null,2));
