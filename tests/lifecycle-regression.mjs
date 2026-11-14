import {loadMain} from './lifecycle-harness.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const results=[];
const test=async(name,fn)=>{await fn();results.push({name,result:'PASS',method:'actual main.js in VM; declared DOM, model and storage boundary doubles'});console.log('PASS',name);};
const docFactory=()=>({numPages:1,fileName:'fixture.pdf',pages:[{number:1,blocks:[]}],blocks:[{id:'p0001-b0001',page:1,type:'paragraph',text:'Penelitian ini menggunakan metode survei untuk mengukur hasil.',target:'This study uses a survey.',status:'translated',sourceIssues:[],issues:[]},{id:'p0001-b0002',page:1,type:'paragraph',text:'Dosis sampel adalah 10 mg.',target:'The sample dose is 10 mg.',status:'translated',sourceIssues:[],issues:[]}],assets:[],warnings:[]});
function seed(h,doc=docFactory()){
 doc.pages[0].blocks=doc.blocks;Object.assign(h.api.state,{file:{name:'fixture.pdf',size:1234},pdf:{numPages:1,destroy:async()=>{}},document:doc,status:'complete',config:{target:'en',source:'id',layout:'auto',glossary:[]},token:{jobId:'fixture-A',writeEpoch:1}});
 h.api.state.signature=JSON.stringify(h.api.state.config);h.element('target-language').value='en';h.element('source-language').value='id';return doc;
}
await test('LIFE01 correction + provenance persist after glossary change and cancelled prepare',async()=>{
 const db={source:null,blocks:new Map(),meta:null};
 const cp={saveBlock:async b=>db.blocks.set(b.id,structuredClone(b)),saveCheckpointMeta:async m=>db.meta=structuredClone(m),clearTranslations:async(doc,meta)=>{db.source=structuredClone(doc);db.blocks=new Map(doc.blocks.map(b=>[b.id,structuredClone(b)]));db.meta=structuredClone(meta);}};
 const h=await loadMain({checkpoint:cp,translation:{detectLanguage:()=> 'id',Translator:class{async prepare(){throw new DOMException('Fixture cancel','AbortError');}cancel(){}}}});
 const doc=seed(h);db.source=structuredClone(doc);await h.api.correctSource(doc.blocks[1],'Dosis sampel adalah 20 mg.',doc);h.element('glossary').value='penelitian = study';await h.api.runNow(true);
 const resumed=db.source.blocks.map(b=>db.blocks.get(b.id)||b);assert.equal(resumed[1].text,'Dosis sampel adalah 20 mg.');assert.equal(resumed[1].originalText,'Dosis sampel adalah 10 mg.');assert.equal(resumed[1].target,undefined);assert.equal(h.api.state.status,'paused');
});
for(const name of ['QuotaExceededError','SecurityError'])await test(`LIFE02 ${name} produces sticky unsaved state until complete snapshot retry`,async()=>{
 let deny=true,snapshot;const h=await loadMain({checkpoint:{saveBlock:async()=>{if(deny)throw new DOMException('fixture failure',name);},saveSnapshot:async value=>{if(deny)throw new DOMException('fixture failure',name);snapshot=structuredClone(value);}}});
 const doc=seed(h);await h.api.correctSource(doc.blocks[1],'Dosis sampel adalah 20 mg.',doc);
 assert.equal(h.api.state.dirty,true);assert.equal(h.api.state.saveEnabled,false);assert.match(h.element('file-meta').textContent,/BELUM TERSIMPAN/);assert.doesNotMatch(h.element('notice').textContent,/Koreksi sumber disimpan/);
 await h.api.retrySave();assert.equal(h.api.state.dirty,true);deny=false;await h.api.retrySave();assert.equal(h.api.state.dirty,false);assert.equal(snapshot.document.blocks[1].text,'Dosis sampel adalah 20 mg.');assert.match(h.element('file-meta').textContent,/Progres disimpan lokal/);
});
await test('LIFE04 simulated BFCache return with lock owned by B makes A read-only and prevents write',async()=>{
 let owner=null;const writes=[];const locks={async request(name,options,callback){if(owner)return callback(null);owner='A';try{return await callback({name});}finally{if(owner==='A')owner=null;}}};
 const h=await loadMain({locks,checkpoint:{saveBlock:async b=>writes.push(b)}});const doc=seed(h);assert.equal(await h.api.acquireDocumentLock(),true);await h.event('pagehide',{persisted:true});await new Promise(setImmediate);owner='B';await h.event('pageshow',{persisted:true});h.api.editBlock(doc.blocks[0],'Stale write',doc);await h.api.flushEdits();assert.equal(h.api.state.readOnly,true);assert.equal(writes.length,0);
});
await test('LIFE04 simulated BFCache return rejects different persisted job generation',async()=>{
 const h=await loadMain({checkpoint:{claimCheckpoint:async()=>{throw new DOMException('stale job','InvalidStateError');}}});const doc=seed(h);await h.event('pagehide',{persisted:true});await h.event('pageshow',{persisted:true});assert.equal(h.api.state.readOnly,true);assert.equal(h.api.state.saveEnabled,false);
});
await test('TR03 retry attempts failed/rejected only and preserves edited or reviewed targets',async()=>{
 const calls=[];const h=await loadMain({translation:{detectLanguage:()=> 'id',Translator:class{async prepare(){}async translate(text){calls.push(text);return{text:'English '+text,status:'translated',outcome:'translated',issues:[]};}cancel(){}}}});const doc=seed(h);
 Object.assign(doc.blocks[0],{target:'My valid edit',status:'edited',editedAt:'fixture'});Object.assign(doc.blocks[1],{target:doc.blocks[1].text,status:'review',outcome:'failed',retryable:true,sourcePreserved:true});
 await h.api.runNow(true);assert.equal(calls.length,1);assert.equal(doc.blocks[0].target,'My valid edit');assert.equal(doc.blocks[1].outcome,'translated');assert.equal(h.api.state.status,'complete');
 doc.blocks[1].sourcePreserved=true;doc.blocks[1].outcome='rejected';doc.blocks[1].userReviewed=true;assert.equal(h.api.completed(doc.blocks[1]),true);
});
await test('OUT06 exclusive counters separate translations, preservation, rejection, failure and pending',async()=>{
 const h=await loadMain();const doc=seed(h);doc.blocks=[{text:'a',target:'b',status:'translated'},{text:'x',target:'x',status:'preserved'},{text:'c',target:'c',sourcePreserved:true,outcome:'rejected'},{text:'d',target:'d',sourcePreserved:true,outcome:'failed'},{text:'e'}];const s=h.api.stats();assert.equal(s.total,5);for(const key of ['translated','preserved','rejected','failed','pending'])assert.equal(s[key],1);assert.equal(s.done,2);
});
await test('LIFE06 clear removes content DOM, canvas, fields, state and checkpoint',async()=>{
 const h=await loadMain();seed(h);h.element('block-list').append({textContent:'SECRET'});h.element('pdf-canvas').width=800;h.element('pdf-canvas').height=1200;h.element('file-name').textContent='PRIVATE.pdf';h.element('glossary').value='private = secret';await h.api.clearDocumentNow();assert.equal(h.element('block-list').children.length,0);assert.equal(h.element('pdf-canvas').width,0);assert.equal(h.element('pdf-canvas').height,0);assert.equal(h.element('file-name').textContent,'');assert.equal(h.element('glossary').value,'');assert.equal(h.api.state.document,null);assert.equal(h.api.state.translator,null);assert.equal(h.writes.filter(w=>w.name==='deleteCheckpoint').length,1);
});
await test('LIFE01 cancelled layout extraction keeps prior corrected document in checkpoint payload',async()=>{
 const h=await loadMain();const doc=seed(h);doc.blocks[1].originalText=doc.blocks[1].text;doc.blocks[1].text='Dosis sampel adalah 20 mg.';doc.blocks[1].sourceEditedAt='fixture';h.element('layout-mode').value='two';h.api.state.pdf.extract=async()=>{throw new DOMException('cancel fixture','AbortError');};await h.api.runNow(false);assert.equal(h.api.state.prior.document.blocks[1].text,'Dosis sampel adalah 20 mg.');const saved=h.writes.find(x=>x.name==='beginExtraction');assert.equal(saved.args[3].document.blocks[1].text,'Dosis sampel adalah 20 mg.');assert.equal(saved.args[3].document.blocks[1].originalText,'Dosis sampel adalah 10 mg.');
});
await test('LIFE01 changed layout maps correction by exact original provenance and archives user edit',async()=>{
 const h=await loadMain();const doc=seed(h);doc.blocks[1].originalText=doc.blocks[1].text;doc.blocks[1].text='Dosis sampel adalah 20 mg.';doc.blocks[1].sourceEditedAt='fixture';doc.blocks[0].editedAt='fixture';doc.blocks[0].target='My reviewed English';h.element('layout-mode').value='two';h.api.state.pdf.extract=async()=>docFactory();await h.api.runNow(false);assert.equal(h.api.state.document.blocks[1].text,'Dosis sampel adalah 20 mg.');assert.equal(h.api.state.document.blocks[1].originalText,'Dosis sampel adalah 10 mg.');assert.equal(h.api.state.document.revisionHistory[0].blocks[0].target,'My reviewed English');assert.equal(h.api.state.prior,null);
});
await test('LIFE01 unmatched correction stops layout replacement and restores previous corrected job',async()=>{
 const h=await loadMain();const doc=seed(h);doc.blocks[1].originalText=doc.blocks[1].text;doc.blocks[1].text='Dosis sampel adalah 20 mg.';doc.blocks[1].sourceEditedAt='fixture';h.element('layout-mode').value='two';h.api.state.pdf.extract=async()=>{const next=docFactory();next.blocks[1].text='Different segmentation';return next;};await h.api.runNow(false);assert.equal(h.api.state.document.blocks[1].text,'Dosis sampel adalah 20 mg.');assert.equal(h.api.state.config.layout,'auto');assert.match(h.element('notice').textContent,/koreksi sebelumnya dipertahankan/);assert.ok(h.writes.some(x=>x.name==='saveSnapshot'));
});
await test('LIFE04 recovered session without persisted identity cannot overwrite or delete another job',async()=>{const h=await loadMain();seed(h);h.api.state.token=null;await h.event('pagehide',{persisted:true});await h.event('pageshow',{persisted:true});assert.equal(h.api.state.readOnly,true);await h.api.clearDocumentNow();assert.ok(!h.writes.some(w=>w.name==='deleteCheckpoint'||w.name==='createCheckpoint'));});
await test('LIFE06 deletion revokes retained export object URLs',async()=>{const h=await loadMain();seed(h);const url=URL.createObjectURL(new Blob(['private result']));h.api.state.exportUrls.add(url);await h.api.clearDocumentNow();assert.equal(h.api.state.exportUrls.size,0);await assert.rejects(()=>fetch(url));});
await test('LIFE04 stale run completion after pagehide cannot clear a newer operation controller or UI',async()=>{
 let release,started;const ready=new Promise(resolve=>started=resolve);const h=await loadMain({translation:{detectLanguage:()=> 'id',Translator:class{async prepare(){started();await new Promise(resolve=>release=resolve);}cancel(){}}}});const doc=seed(h);delete doc.blocks[1].target;const oldRun=h.api.runNow(true);await ready;await h.event('pagehide',{persisted:true});const nextController=new AbortController();Object.assign(h.api.state,{controller:nextController,busy:true,status:'new-operation'});release();await oldRun;assert.equal(h.api.state.controller,nextController);assert.equal(h.api.state.busy,true);assert.equal(h.api.state.status,'new-operation');
});
await test('LIFE04 stale export cleanup after pagehide cannot reset a newer operation',async()=>{
 let release,started;const ready=new Promise(resolve=>started=resolve);const h=await loadMain({exporter:{exportDocument:async()=>{started();await new Promise(resolve=>release=resolve);throw new DOMException('cancelled export','AbortError');}}});seed(h);const oldExport=h.api.download('zip');await ready;await h.event('pagehide',{persisted:true});const nextController=new AbortController();Object.assign(h.api.state,{controller:nextController,busy:true,status:'new-operation'});release();await oldExport;assert.equal(h.api.state.controller,nextController);assert.equal(h.api.state.busy,true);assert.equal(h.api.state.status,'new-operation');
});
await test('LIFE04 stale offline preparation cleanup cannot reset a newer operation',async()=>{
 let release,started;const ready=new Promise(resolve=>started=resolve);const h=await loadMain({offline:{prepareOfflineAssets:async()=>{started();await new Promise(resolve=>release=resolve);}}});h.context.navigator.serviceWorker={};seed(h);const oldPreparation=h.api.prepareOffline();await ready;await h.event('pagehide',{persisted:true});const nextController=new AbortController();Object.assign(h.api.state,{controller:nextController,busy:true,status:'new-operation'});release();await oldPreparation;assert.equal(h.api.state.controller,nextController);assert.equal(h.api.state.busy,true);assert.equal(h.api.state.status,'new-operation');
});
const inputHashes={};for(const n of ['main.js','storage.js','export.js'])inputHashes[n]=createHash('sha256').update(await readFile(new URL('../app/app/'+n,import.meta.url))).digest('hex');
await mkdir(new URL('../evidence/lifecycle/',import.meta.url),{recursive:true});await writeFile(new URL('../evidence/lifecycle/main-regression.json',import.meta.url),JSON.stringify({environment:{node:process.version,platform:process.platform},browserVerified:false,inputHashes,results},null,2));
