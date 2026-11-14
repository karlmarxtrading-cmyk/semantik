import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {auditTranslation,Translator} from '../app/app/translation.js';
import {scientificSpans} from '../app/app/semantic-spans.js';
const rows=[];async function test(id,fn){try{await fn();rows.push({id,pass:true});}catch(e){rows.push({id,pass:false,error:e.stack});}}
const audit=JSON.parse(await fs.readFile(new URL('../audit/evidence/engine/validator-results.json',import.meta.url)));
for(const c of audit.cases)await test(c.id,()=>assert.ok(auditTranslation(c.source,c.target).length));
for(const s of ['f′(x)','g″(t)',"h''(y)",'f\u0302(x)','z\u0304','10 μL','2 nL','9 eV','4 Gy','5 mSv'])await test('preserve:'+s,()=>assert.ok(scientificSpans('Value '+s+' is shown.').some(x=>x.value===s)));
for(const [source,target] of [
 ['Treatment A was given 10 mg and treatment B was given 20 mg.','Pengobatan A diberikan 10 mg dan pengobatan B diberikan 20 mg.'],
 ['The systolic and diastolic pressures were 120 and 80 mmHg, respectively.','Tekanan sistolik dan diastolik masing-masing adalah 120 dan 80 mmHg.'],
 ['Treatment A reduced mortality by 10%.','Perlakuan A menurunkan mortalitas sebesar 10%.'],
 ['Tidak ada bilangan riil yang memenuhi kedua syarat.','No real number satisfies both conditions.'],
 ['The trial failed to demonstrate non-inferiority.','Uji coba gagal menunjukkan non-inferioritas.'],
 ['The derivative is f′(x)=2x.','Turunannya adalah f′(x)=2x.'],
 ['The dose was 10 μL and the energy was 10 eV.','Dosisnya 10 μL dan energinya 10 eV.'],
 ['The sample mean is z̄.','Rata-rata sampel adalah z̄.'],
])await test('valid:'+source,()=>assert.deepEqual(auditTranslation(source,target),[]));
await test('bounded alternate drops terminology masks but retains literal masks',async()=>{
 const tr=new Translator();tr.engine={fixture:true};tr.direction='en-id';const inputs=[];
 tr._request=async(_action,payload)=>{inputs.push(payload.sourceText);if(inputs.length===1)return {targetText:'Kandidat kehilangan notasi',finishReason:'complete'};
   assert.ok(payload.sourceText.includes('sample mean'));assert.ok(payload.sourceText.includes('<sslit'));
   return {targetText:payload.sourceText.replace('The sample mean is','Rata-rata sampel adalah'),finishReason:'complete',inputTokens:3,outputTokens:3};};
 const result=await tr.translate('The sample mean is z̄.');assert.equal(result.text,'Rata-rata sampel adalah z̄.');assert.equal(inputs.length,2);assert.equal(result.attempts[1].strategy,'literal-only-context');
});
await test('repeated identical successful sentences reuse result instead of false rejection',async()=>{
 const tr=new Translator();tr.engine={fixture:true};tr.direction='en-id';let calls=0;tr._request=async()=>{calls++;return {targetText:'Kami membaca jurnal.',finishReason:'complete'};};
 const r=await tr.translate('We read journals. We read journals.');assert.equal(r.text,'Kami membaca jurnal. Kami membaca jurnal.');assert.equal(calls,1);
});
for(const [source,target] of [
 ['The equilibrium constant depends on temperature.','Keseimbangan konstan tergantung pada suhu.'],
 ['Varians meningkat.','The variants increased.'],
 ['Upah nominal tidak berubah.','Wages are unchanged.'],
 ['Daya beli meningkat.','Purchases increase.'],
 ['Outcome assessors knew the allocation.','Hasil pemeriksaan tahu alokasi.'],
 ['The confidence interval includes no effect.','Interval kepercayaan tidak mengandung efek.'],
])await test('scientific-sense-rejected:'+source,()=>assert.ok(auditTranslation(source,target).length));
for(const [source,target] of [
 ['The equilibrium constant depends on temperature.','Tetapan kesetimbangan bergantung pada suhu.'],
 ['Variance increased.','Varians meningkat.'],
 ['Higher nominal wages do not necessarily imply higher purchasing power.','Upah nominal yang lebih tinggi tidak selalu berarti daya beli yang lebih tinggi.'],
 ['Outcome assessors knew the allocation.','Penilai luaran mengetahui alokasi.'],
 ['The confidence interval includes no effect.','Interval kepercayaan mencakup tidak adanya efek.'],
 ['The estimator is unbiased only if both conditions hold.','Penduga tidak bias hanya jika kedua syarat terpenuhi.'],
 ['Absence of evidence is not evidence of absence.','Ketiadaan bukti bukanlah bukti ketiadaan.'],
])await test('scientific-sense-valid:'+source,()=>assert.deepEqual(auditTranslation(source,target),[]));
await fs.mkdir(new URL('../evidence/cp19/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../evidence/cp19/guards.json',import.meta.url),JSON.stringify({method:'Validator mutations and faithful bilingual controls; explicitly stubbed retry test; NOT real inference',rows,pass:rows.filter(x=>x.pass).length,fail:rows.filter(x=>!x.pass).length},null,2));
console.log(JSON.stringify(rows.filter(x=>!x.pass),null,2));console.log(`${rows.filter(x=>x.pass).length}/${rows.length} PASS`);if(rows.some(x=>!x.pass))process.exitCode=1;
