import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {releaseModelCacheForCheckpoint} from '../app/app/long-document.js';
import {loadMain} from './lifecycle-harness.mjs';
const checks=[];
async function test(name,fn){await fn();checks.push({name,status:'PASS'});console.log('PASS',name);}
function caches(){
 const model=new Set(['https://local.invalid/__semantik_models__/sha256/'+'a'.repeat(64),'https://local.invalid/r/1234567890abcdef/models/en-id/shard.gz','https://local.invalid/private-document.pdf']);
 const calls=[];
 return {model,calls,api:{async keys(){return ['semantik-model-v1','semantik-pdf-current','user-documents'];},async open(name){calls.push(['open',name]);assert.equal(name,'semantik-model-v1');return {async keys(){return [...model].map(url=>({url}));},async delete(request){calls.push(['delete',request.url]);return model.delete(request.url);}};},async delete(){throw Error('Whole cache deletion forbidden');}}};
}
await test('Reclamation removes only recognized public-model entries, retains loaded engine/unknown/user caches',async()=>{
 const boundary=caches(),worker={alive:true},engine={fingerprint:'same',offlineReady:true};let cancelled=0;
 const translator={worker,engine,cancel(){cancelled++;}};
 const result=await releaseModelCacheForCheckpoint({cacheStorage:boundary.api,translator});
 assert.equal(result.removedEntries,2);assert.equal(result.skippedEntries,1);assert.equal(boundary.model.size,1);assert(boundary.model.has('https://local.invalid/private-document.pdf'));
 assert.equal(translator.worker,worker);assert.equal(cancelled,0);assert.equal(translator.engine.fingerprint,'same');assert.equal(translator.engine.offlineReady,false);assert.equal(translator.engine.storageMode,'session');
 assert(boundary.calls.every(([action,value])=>action==='open'?value==='semantik-model-v1':value.includes('/models/')||value.includes('/__semantik_models__/')));
});
await test('Actual main retries identical atomic mutation once after quota reclamation and marks offline unavailable',async()=>{
 const boundary=caches(),h=await loadMain();h.context.caches=boundary.api;
 const worker={alive:true};let cancelCalls=0,attempts=0;
 h.api.state.translator={worker,engine:{fingerprint:'loaded-engine',offlineReady:true},cancel(){cancelCalls++;}};
 h.api.state.document={blocks:[],pages:[],warnings:[]};
 const action=async()=>{attempts++;if(attempts===1)throw new DOMException('storage full','QuotaExceededError');};
 assert.equal(await h.api.save(action),true);assert.equal(attempts,2);assert.equal(cancelCalls,0);assert.equal(h.api.state.translator.worker,worker);
 assert.equal(h.api.state.saveEnabled,true);assert.equal(h.api.state.dirty,false);assert.equal(h.api.state.translator.engine.offlineReady,false);assert.match(h.element('offline-status').textContent,/Offline belum siap/);assert.match(h.api.state.document.offlineCacheWarning,/dokumen/);assert.equal(h.api.state.storageRecoveries[0].retryCount,1);assert.equal(h.api.state.storageRecoveries[0].succeeded,true);
});
await test('Second quota failure stops after one retry and retains dirty state',async()=>{
 const boundary=caches(),h=await loadMain();h.context.caches=boundary.api;let attempts=0;
 assert.equal(await h.api.save(async()=>{attempts++;throw new DOMException('still full','QuotaExceededError');}),false);
 assert.equal(attempts,2);assert.equal(h.api.state.saveEnabled,false);assert.equal(h.api.state.dirty,true);assert.equal(h.api.state.storageFailures.at(-1).name,'QuotaExceededError');assert.equal(h.api.state.storageRecoveries[0].succeeded,false);
});
for(const name of ['SecurityError','InvalidStateError','DataCloneError'])await test(`${name} never deletes caches and is never automatically retried`,async()=>{
 const boundary=caches(),h=await loadMain();h.context.caches=boundary.api;let attempts=0;
 assert.equal(await h.api.save(async()=>{attempts++;throw new DOMException('blocked',name);}),false);assert.equal(attempts,1);assert.equal(boundary.calls.length,0);assert.equal(boundary.model.size,3);
});
await test('Absent model cache cannot turn quota failure into a false success',async()=>{
 const h=await loadMain();h.context.caches={keys:async()=>['user-documents'],open:async()=>{throw Error('must not open user data');}};let attempts=0;
 assert.equal(await h.api.save(async()=>{attempts++;throw new DOMException('quota','QuotaExceededError');}),false);assert.equal(attempts,1);assert.equal(h.api.state.dirty,true);
});
const sourceHashes={};for(const name of ['main.js','long-document.js'])sourceHashes[name]=createHash('sha256').update(await readFile(new URL('../app/app/'+name,import.meta.url))).digest('hex');
await writeFile(new URL('../evidence/cp20/pipeline/quota-recovery-results.json',import.meta.url),JSON.stringify({method:'Actual main and recovery helper with explicit DOM/cache/storage fault boundaries. No actual browser quota or actual loaded-model inference assertion is inferred from these tests; root browser evidence is separate.',sourceHashes,checks},null,2));
