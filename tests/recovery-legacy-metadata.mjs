import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadMain} from './lifecycle-harness.mjs';
const rows=[];
for(const [source,target,labelTarget,labelSource,prose,rejected] of [
 ['id','en','RPT9 END','RPT9 AKHIR','Penelitian ini mengukur hasil dengan cermat.','Jangan mengubah angka 19.'],
 ['en','id','RPT9 AKHIR','RPT9 END','The research team measured the results carefully.','Do not change value 19.']
]){
 let calls=[];
 const translation={detectLanguage:()=>source,Translator:class{async prepare(){}async translate(text){calls.push(text);return text===rejected?{text,status:'review',outcome:'rejected',retryable:false,sourcePreserved:true,issues:['Controlled rejected prose']}:{text:'Translated '+text,status:'translated',outcome:'translated',issues:[]};}cancel(){}}};
 const h=await loadMain({translation});h.element('source-language').value=source;h.element('target-language').value=target;
 const texts=[labelTarget,labelSource,prose,rejected];const blocks=texts.map((text,i)=>({id:'p1-b'+i,page:1,type:'paragraph',text,originalText:text,sourceIssues:[],issues:[],preservationReason:'stale-test-reason'}));
 const doc={numPages:1,pages:[{number:1,blocks}],blocks,assets:[],warnings:[],extractionComplete:true};
 const file=new Blob(['%PDF-1.7\n']);file.name='controlled-legacy.pdf';const config=h.api.readConfig();
 Object.assign(h.api.state,{file,pdf:{numPages:1,destroy:async()=>{}},document:doc,config,signature:JSON.stringify(config),status:'extracted',token:{jobId:'j',writeEpoch:1}});
 await h.api.runNow(true);
 assert.equal(blocks[0].status,'preserved');assert.equal(blocks[0].target,labelTarget);assert.equal(blocks[0].preservationReason,'already-target-metadata');assert(!calls.includes(labelTarget));
 assert.equal(blocks[1].outcome,'translated');assert.equal(blocks[2].outcome,'translated');assert.equal(blocks[3].outcome,'rejected');assert.equal(blocks[3].target,rejected);
 assert.equal(calls.length,3);for(const x of blocks.slice(1))assert.equal(x.preservationReason,undefined);
 assert.equal(h.api.state.status,'needs-attention');assert.deepEqual(JSON.parse(JSON.stringify(h.api.stats())),{total:4,translated:2,preserved:1,rejected:1,failed:0,pending:0,review:1,done:3,attempted:4});
 assert.deepEqual(blocks.map(x=>x.text),texts);assert.deepEqual(blocks.map(x=>x.id),texts.map((_,i)=>'p1-b'+i));
 rows.push({direction:source+'-'+target,status:'PASS',counts:JSON.parse(JSON.stringify(h.api.stats())),engineCalls:calls,blocks});h.api.releaseDocumentLock();
}
const sourceHashes={};for(const p of ['app/app/main.js','app/app/metadata-language.js','tests/lifecycle-harness.mjs'])sourceHashes[p]=createHash('sha256').update(await fs.readFile(new URL('../'+p,import.meta.url))).digest('hex');
await fs.writeFile(new URL('../evidence/recovery/root/LEGACY_METADATA.json',import.meta.url),JSON.stringify({method:'Actual main.js and metadata function in VM with explicit DOM/storage/translation doubles; no real inference/browser claim. Harness links new dependency to actual module, with no weakened assertions.',sourceHashes,rows},null,2)+'\n');console.log(rows.length+' legacy metadata routing controls PASS');
