// Exact-product logic executed with explicit browser/storage boundary doubles.
// No production source is changed. This is not a real-browser BFCache test.
import {loadMain} from './main-vm-harness.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../../baseline/',import.meta.url);
const results=[];
const baseDoc=()=>({numPages:1,fileName:'fixture.pdf',pages:[{number:1,blocks:[]}],blocks:[{id:'p0001-b0001',page:1,type:'paragraph',text:'Penelitian ini menggunakan metode survei untuk mengukur hasil.',target:'This study uses a survey.',status:'translated',sourceIssues:[],issues:[]},{id:'p0001-b0002',page:1,type:'paragraph',text:'Dosis sampel adalah 10 mg.',target:'The sample dose is 10 mg.',status:'translated',sourceIssues:[],issues:[]}],assets:[],warnings:[]});
function seed(h,doc=baseDoc()){
 const s=h.api.state;doc.pages[0].blocks=doc.blocks;
 Object.assign(s,{file:{name:'fixture.pdf',size:1234},pdf:{numPages:1},document:doc,status:'complete',config:{target:'en',source:'id',layout:'auto',glossary:[]}});s.signature=JSON.stringify(s.config);
 h.element('target-language').value='en';h.element('source-language').value='id';return doc;
}
{
 const db={source:null,blocks:new Map(),meta:null};
 const cp={saveBlock:async b=>db.blocks.set(b.id,structuredClone(b)),saveCheckpointMeta:async m=>db.meta=structuredClone(m),clearTranslations:async()=>db.blocks.clear()};
 const h=await loadMain({checkpoint:cp,translation:{detectLanguage:()=> 'id',Translator:class {async prepare(){throw new DOMException('Simulated cancellation during model prepare','AbortError');}cancel(){}}}});
 const doc=seed(h);db.source=structuredClone(doc);
 await h.api.correctSource(doc.blocks[1],'Dosis sampel adalah 20 mg.',doc);
 assert.equal(db.blocks.get('p0001-b0002').text,'Dosis sampel adalah 20 mg.');
 h.element('glossary').value='penelitian = study';
 await h.api.runNow(true);
 const resumed=db.source.blocks.map(b=>db.blocks.get(b.id)||b);
 assert.equal(h.api.state.document.blocks[1].text,'Dosis sampel adalah 20 mg.');
 assert.equal(resumed[1].text,'Dosis sampel adalah 10 mg.');
 results.push({name:'Source correction lost from persisted checkpoint after changed glossary + canceled prepare',confirmed:true,uiText:h.api.state.document.blocks[1].text,resumableText:resumed[1].text,savedBlockCount:db.blocks.size,jobStatus:h.api.state.status,refs:['app/main.js:80-86','app/main.js:281-285','app/main.js:216-220','app/storage.js:53-64']});
}
{
 const failure=new DOMException('quota exceeded','QuotaExceededError');
 const h=await loadMain({checkpoint:{saveBlock:async()=>{throw failure;}}});const doc=seed(h);h.api.displayFile();
 await h.api.correctSource(doc.blocks[1],'Dosis sampel adalah 20 mg.',doc);
 assert.equal(h.api.state.saveEnabled,false);
 assert.match(h.element('notice').textContent,/Koreksi sumber disimpan/);
 assert.match(h.element('file-meta').textContent,/Progres disimpan lokal/);
 results.push({name:'Source correction reports saved after failed checkpoint write',confirmed:true,saveEnabled:h.api.state.saveEnabled,notice:h.element('notice').textContent,fileBadge:h.element('file-meta').textContent,refs:['app/main.js:28-36','app/main.js:86-87','app/main.js:159-164']});
}
{
 let owner=null;const writes=[];
 const locks={async request(name,options,callback){if(owner)return callback(null);owner='tab-A';try{return await callback({name});}finally{if(owner==='tab-A')owner=null;}}};
 const h=await loadMain({locks,checkpoint:{saveBlock:async b=>writes.push({owner,text:b.target}),saveCheckpointMeta:async()=>{}}});const doc=seed(h);
 assert.equal(await h.api.acquireDocumentLock(),true);assert.equal(owner,'tab-A');
 await h.event('pagehide',{persisted:true});await new Promise(setImmediate);assert.equal(owner,null);
 owner='tab-B';await h.event('pageshow',{persisted:true});
 h.api.editBlock(doc.blocks[0],'Changed after history restore',doc);await h.api.flushEdits();
 assert.equal(h.api.state.releaseLock,null);assert.equal(writes[0].owner,'tab-B');
 results.push({name:'Returned page can persist while another tab owns document lock',confirmed:true,condition:'Browser must restore the page JS heap (BFCache). Test injects lifecycle events, does not establish browser eligibility.',pageshowHandlers:h.listeners.get('pageshow')?.length||0,activeDocumentStillPresent:!!h.api.state.document,lockHeldByReturnedPage:!!h.api.state.releaseLock,write:writes[0],refs:['app/main.js:90-101','app/main.js:46-60','app/main.js:512-515']});
}
{
 const handlers=new Map(),stored=new Map(),origin='https://journal.example';const key=k=>typeof k==='string'?new URL(k,origin).href:k.url;
 const cache={match:async k=>stored.get(key(k))?.clone(),put:async(k,r)=>stored.set(key(k),r.clone())};
 const cacheNames=[];let online=true;
 const ctx=vm.createContext({self:{location:{origin},addEventListener:(n,f)=>handlers.set(n,f)},URL,Response,Request,Set,fetch:async()=>{if(!online)throw new TypeError('Offline');return new Response('// RELEASE 2 TRANSLATION MODULE',{status:200,headers:{'Content-Type':'application/javascript'}});},caches:{open:async n=>{cacheNames.push(n);return cache;}}});
 vm.runInContext(await readFile(new URL('sw.js',root),'utf8'),ctx,{filename:'sw.js'});
 stored.set(origin+'/app/translation.js',new Response('// RELEASE 1 TRANSLATION MODULE'));
 async function request(path){let response;handlers.get('fetch')({request:new Request(origin+path),respondWith:p=>response=p});return (await response).text();}
 const servedAfterDeploy=await request('/app/translation.js');const storedInOldCache=await (await cache.match('/app/translation.js')).text();online=false;const offlineAgain=await request('/app/translation.js');
 assert.equal(servedAfterDeploy,'// RELEASE 2 TRANSLATION MODULE');assert.equal(storedInOldCache,servedAfterDeploy);assert.equal(offlineAgain,servedAfterDeploy);
 results.push({name:'Old active service worker accepts new deployment bytes and rewrites old release cache',confirmed:true,cacheName:cacheNames[0],servedAfterDeploy,storedInOldCache,offlineAgain,refs:['sw.js:2-4','sw.js:23-28','app/offline.js:24-34']});
}
await writeFile(new URL('../../evidence/lifecycle/baseline-reproductions.json',import.meta.url),JSON.stringify({scope:'Actual product logic, explicit storage/network/DOM doubles; no live-browser claims',results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
