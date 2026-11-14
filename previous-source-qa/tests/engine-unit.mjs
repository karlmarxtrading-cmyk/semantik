import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {auditTranslation, detectLanguage, splitForTranslation, Translator} from '../app/translation.js';
const checks=[];
const check=(name,fn)=>{fn();checks.push({name,pass:true});};
const asyncCheck=async(name,fn)=>{await fn();checks.push({name,pass:true});};
class FakeWorker {
 static created=0;static terminated=0;static mode='ok';static sent=[];
 constructor(){FakeWorker.created++;this.dead=false;}
 postMessage({id,action,payload}){
  FakeWorker.sent.push({action,payload});
  const mode=FakeWorker.mode;
  setTimeout(()=>{
   if(this.dead)return;
   if(action==='prepare'){this.onmessage({data:{id,result:{direction:payload,model:'FAKE-UNIT-TEST'}}});return;}
   if(mode==='error'){this.onmessage({data:{id,error:'Deliberate protected marker failure'}});return;}
   let text=payload.sourceText.replace('The study','Penelitian ini').replace('included','melibatkan').replace('participants','peserta').replace('improves','meningkatkan').replace('prediction','prediksi').replace('mengestimasi','customize');
   if(mode==='badnumber')text=text.replace('120','121');
   this.onmessage({data:{id,result:{targetText:text,finishReason:'complete',inputTokens:10,outputTokens:10}}});
  },mode==='slow'?200:10);
 }
 terminate(){this.dead=true;FakeWorker.terminated++;}
}
globalThis.Worker=FakeWorker;
const translator=new Translator();
check('Import and construction are lazy',()=>assert.equal(FakeWorker.created,0));
check('English detection',()=>assert.equal(detectLanguage('The study investigates the effect of education on economic growth.'),'en'));
check('Indonesian detection',()=>assert.equal(detectLanguage('Penelitian ini menjelaskan hubungan antara pendidikan dan pertumbuhan ekonomi.'),'id'));
check('Ambiguous detection remains unknown',()=>assert.equal(detectLanguage('Quantum spin'),'unknown'));
check('Equal numbers and DOI pass',()=>assert.deepEqual(auditTranslation('n=120; DOI:10.1234/a.2024','n=120; DOI:10.1234/a.2024'),[]));
check('Changed number rejected',()=>assert.ok(auditTranslation('n=120','n=121').length));
check('Duplicate number rejected',()=>assert.ok(auditTranslation('120 participants','120 dari 120 peserta').length));
check('Changed DOI rejected',()=>assert.ok(auditTranslation('DOI:10.1234/a.2024','DOI:10.1234/a.2025').length));
check('Changed formula rejected',()=>assert.ok(auditTranslation('$x^2=4$ is true','$x^2=5$ adalah benar').length));
check('Changed citation rejected',()=>assert.ok(auditTranslation('See [1,3]','Lihat [1,4]').length));
check('Changed scientific unit rejected',()=>assert.ok(auditTranslation('A dose of 10 mg','Dosis 10 kg').length));
check('Changed author identity rejected',()=>assert.ok(auditTranslation('(Smith, 2024)','(Jones, 2024)').length));
check('Empty target rejected',()=>assert.ok(auditTranslation('Some text','').length));
check('Lossless long input segmentation',()=>{const t='The results show that '+('education and economic growth are related, '.repeat(40))+'with p < 0.05 and DOI:10.1234/abc.';assert.equal(splitForTranslation(t).join(''),t);});
check('Formula is not split',()=>{const t='Example '+ '$$'+('x'.repeat(550))+'$$'+' end.';const parts=splitForTranslation(t,100);assert.ok(parts.some(x=>x.includes('$$'+('x'.repeat(550))+'$$')));assert.equal(parts.join(''),t);});
await asyncCheck('Invalid direction cannot create worker',async()=>{await assert.rejects(translator.prepare('fr-en'));assert.equal(FakeWorker.created,0);});
await asyncCheck('Prepare creates exactly one worker',async()=>{await translator.prepare('en-id');assert.equal(FakeWorker.created,1);});
await asyncCheck('Repeated prepare reuses direction',async()=>{await translator.prepare('en-id');assert.equal(FakeWorker.sent.filter(x=>x.action==='prepare').length,1);});
await asyncCheck('Ordinary translation structurally passes',async()=>{const r=await translator.translate('The study included 120 participants.');assert.equal(r.text,'Penelitian ini melibatkan 120 peserta.');assert.equal(r.status,'translated');assert.equal(r.semanticVerified,false);});
await asyncCheck('Scientific tokens are masked and restored',async()=>{const text='The study included 10 mg and p < 0.05 (Smith, 2024).';const r=await translator.translate(text);assert.ok(r.text.includes('10 mg'));assert.ok(r.text.includes('p < 0.05'));assert.ok(r.text.includes('(Smith, 2024)'));const sent=FakeWorker.sent.at(-1).payload.sourceText;assert.ok(!sent.includes('10 mg'));assert.ok(!sent.includes('(Smith, 2024)'));});
await asyncCheck('Glossary entries are restored as required',async()=>{const r=await translator.translate('Machine learning improves prediction.',{glossary:[{source:'Machine learning',target:'Pembelajaran mesin'}]});assert.equal(r.text,'Pembelajaran mesin meningkatkan prediksi.');});
await asyncCheck('Glossary cannot alter numbers',async()=>{await assert.rejects(translator.translate('A sample of 120 people.',{glossary:[{source:'120 people',target:'121 orang'}]}));});
await asyncCheck('Bad numeric candidate preserves source',async()=>{FakeWorker.mode='badnumber';const s='The study included 120 participants.';const r=await translator.translate(s);assert.equal(r.text,s);assert.equal(r.sourcePreserved,true);assert.equal(r.status,'review');FakeWorker.mode='ok';});
await asyncCheck('Worker rejection preserves source',async()=>{FakeWorker.mode='error';const s='The study included 120 participants.';const r=await translator.translate(s);assert.equal(r.text,s);assert.equal(r.sourcePreserved,true);FakeWorker.mode='ok';});
await asyncCheck('Academic heading translates deterministically',async()=>{const r=await translator.translate('Abstract');assert.equal(r.text,'Abstrak');});
await asyncCheck('Heading translates with empty glossary',async()=>{const r=await translator.translate('ABSTRACT',{glossary:[]});assert.equal(r.text,'Abstrak');});
await asyncCheck('All exact academic defaults translate English to Indonesian',async()=>{
 const pairs=[['sample mean','rata-rata sampel'],['standard deviation','simpangan baku'],['standard error','galat baku'],['sample size','ukuran sampel'],['confidence interval','interval kepercayaan'],['statistically significant','signifikan secara statistik'],['null hypothesis','hipotesis nol'],['effect size','ukuran efek'],['linear regression','regresi linear']];
 for(const [source,target] of pairs){const r=await translator.translate(source);assert.equal(r.text,target);assert.ok(!r.sourcePreserved);}
});
await asyncCheck('Uppercase academic phrase is not frozen as an acronym',async()=>{const r=await translator.translate('The SAMPLE MEAN was 12.5.');assert.ok(r.text.includes('Rata-rata sampel'));assert.ok(!r.sourcePreserved);});
await asyncCheck('User phrase overrides academic default',async()=>{const r=await translator.translate('The sample mean was 12.5.',{glossary:[{source:'sample mean',target:'rerata sampel'}]});assert.ok(r.text.includes('rerata sampel'));assert.ok(!r.text.includes('rata-rata sampel'));});
await asyncCheck('Overlapping shorter user term suppresses longer default',async()=>{const r=await translator.translate('The sample mean was 12.5.',{glossary:[{source:'mean',target:'rerata'}]});assert.ok(r.text.includes('sample rerata'));assert.ok(!r.text.includes('rata-rata sampel'));});
await asyncCheck('Academic defaults do not rewrite literal code',async()=>{const r=await translator.translate('The identifier is `sample mean`.');assert.ok(r.text.includes('`sample mean`'));assert.ok(!r.text.includes('rata-rata sampel'));});
await asyncCheck('Default terms match whole phrases only',async()=>{const r=await translator.translate('resample means');assert.equal(r.text,'resample means');});
await asyncCheck('Academic defaults are bidirectional',async()=>{
 await translator.prepare('id-en');
 const pairs=[['rata-rata sampel','sample mean'],['simpangan baku','standard deviation'],['galat baku','standard error'],['ukuran sampel','sample size'],['interval kepercayaan','confidence interval'],['signifikan secara statistik','statistically significant'],['hipotesis nol','null hypothesis'],['ukuran efek','effect size'],['regresi linear','linear regression']];
 for(const [source,target] of pairs){const r=await translator.translate(source);assert.equal(r.text,target);assert.ok(!r.sourcePreserved);}
 await translator.prepare('en-id');
});
await asyncCheck('Known estimation-verb mismatch is reviewed',async()=>{await translator.prepare('id-en');const r=await translator.translate('Regresi linear mengestimasi ukuran efek.');assert.equal(r.status,'review');assert.ok(r.issues.some(x=>x.includes('verba estimasi')));await translator.prepare('en-id');});
await asyncCheck('Cancellation rejects and next prepare is isolated',async()=>{
 FakeWorker.mode='slow';const controller=new AbortController();const p=translator.translate('The study included 120 participants.',{signal:controller.signal});controller.abort();FakeWorker.mode='ok';const next=translator.prepare('id-en');await assert.rejects(p,{name:'AbortError'});await next;assert.equal(translator.direction,'id-en');assert.equal(translator.busy,false);
});
await asyncCheck('Already aborted preparation creates no worker',async()=>{const n=FakeWorker.created;const controller=new AbortController();controller.abort();await assert.rejects(translator.prepare('en-id',{signal:controller.signal}),{name:'AbortError'});assert.equal(FakeWorker.created,n);});
await translator.dispose();
check('Dispose releases worker',()=>assert.equal(translator.worker,null));
const result={scope:'Helper and lifecycle tests; FakeWorker is explicit and never counted as model/browser inference evidence',passed:checks.length,failed:0,checks};
await fs.writeFile(fileURLToPath(new URL('../evidence/engine-unit-results.json',import.meta.url)),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
