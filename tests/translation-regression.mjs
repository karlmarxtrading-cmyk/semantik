import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {auditTranslation,semanticWarnings,Translator,splitForTranslation} from '../app/app/translation.js';
import {scientificSpans,isFormulaText,isLiteralOnly,ordinaryCase,mathTermsFor,domainTermsFor} from '../app/app/semantic-spans.js';
const cases=[];
function test(name,run){try{run();cases.push({name,pass:true});}catch(e){cases.push({name,pass:false,error:e.stack});}}
for(const [name,source,target] of [
 ['molarity micro to milli','The concentration was 10 μM.','Konsentrasinya 10 mM.'],
 ['molarity nano to milli','The concentration was 10 nM.','Konsentrasinya 10 mM.'],
 ['calcium charge','The Ca2+ concentration increased.','Konsentrasi Ca3+ meningkat.'],
 ['unicode charge','The Ca²⁺ concentration increased.','Konsentrasi Ca³⁺ meningkat.'],
 ['kilogram mutation','The dose was 10 mg.','Dosisnya 10 kg.'],
 ['claim association','Treatment A increased by 10 and treatment B decreased by 20.','Perlakuan A meningkat sebesar 20 dan perlakuan B menurun sebesar 10.'],
 ['empty set letter','The solution set is ∅.','Himpunan penyelesaian adalah å.'],
 ['empty set degree','The solution set is ∅.','Himpunan penyelesaian adalah °.'],
 ['unicode variable identity','Find 𝑥 < 1.','Tentukan x < 1.'],
 ['absolute variable identity','The value is |x|.','Nilainya |y|.'],
 ['greek identity','The parameter α was fixed.','Parameter β ditetapkan.'],
 ['operator relation','Find x < 1.','Tentukan x > 1.'],
 ['opaque slug','ID absolute-value-inequalities~challenge~nested-abs~34f24hj2-0~0','ID absolut-nilai-inequalities~challenge~nested-abs~34f24hj2-0~0'],
 ['accession','Accession NM_000123.4 is shown.','Aksesi NM_000124.4 ditampilkan.'],
 ['interval open boundary','The solution set is (−1, 1) ∪ (7, 9).','Himpunan penyelesaian adalah [−1, 1) ∪ (7, 9).'],
])test(name,()=>assert.ok(auditTranslation(source,target).length));
for(const glyph of ['∅','ℝ','ℕ','ℤ','∈','∉','∪','∩','⁴','₃'])test('protect '+glyph,()=>assert.ok(scientificSpans('Value '+glyph+'.').some(s=>s.value.includes(glyph))));
for(const source of ['||𝑥 − 4| − 4| < 1','||x − 4| − 4| > 1','|𝑥 + 4| + |𝑥 + 3| ≤ 0','|x| ≥ 2','∅','(−1, 1) ∪ (7, 9)'])test('formula '+source,()=>{assert.ok(isFormulaText(source));assert.ok(isLiteralOnly(source));assert.equal(scientificSpans(source).map(s=>s.value).join(''),source);});
test('formula prose distinct',()=>assert.equal(isFormulaText('The value x < 1 is required.'),false));
test('no change real charge',()=>assert.deepEqual(auditTranslation('The Ca²⁺ concentration was 10 μM.','Konsentrasi Ca²⁺ adalah 10 μM.'),[]));
test('faithful binding',()=>assert.deepEqual(auditTranslation('Treatment A increased by 10 and treatment B decreased by 20.','Perlakuan A meningkat sebesar 10 dan perlakuan B menurun sebesar 20.'),[]));
test('uncertainty faithful en-id',()=>assert.deepEqual(semanticWarnings('The evidence remains uncertain.','Bukti masih belum pasti.','en-id'),[]));
test('uncertainty faithful id-en',()=>assert.deepEqual(semanticWarnings('Bukti masih belum pasti.','The evidence remains uncertain.','id-en'),[]));
test('negation deletion',()=>assert.ok(semanticWarnings('The treatment did not reduce mortality.','Perlakuan menurunkan mortalitas.','en-id').some(x=>x.includes('negasi'))));
test('uncertainty deletion',()=>assert.ok(semanticWarnings('The evidence is uncertain.','Bukti sudah pasti.','en-id').some(x=>x.includes('ketidakpastian'))));
test('modality strengthened',()=>assert.ok(semanticWarnings('Treatment may reduce mortality.','Perlakuan menurunkan mortalitas.','en-id').some(x=>x.includes('modalitas'))));
test('quantifier changed',()=>assert.ok(semanticWarnings('All groups improved.','Beberapa kelompok membaik.','en-id').some(x=>x.includes('kuantor'))));
test('contracted negation faithful',()=>assert.deepEqual(semanticWarnings('Intervensi tidak meningkatkan kelangsungan hidup.',"Intervention doesn't improve survival.",'id-en'),[]));
test('contracted negation deletion detected',()=>assert.ok(semanticWarnings("The treatment doesn't improve survival.",'Perlakuan meningkatkan kelangsungan hidup.','en-id').some(x=>x.includes('negasi'))));
test('curly contraction faithful',()=>assert.deepEqual(semanticWarnings('The effect isn’t certain.','Efeknya belum pasti.','en-id'),[]));
test('unchanged faithful',()=>assert.deepEqual(semanticWarnings('The identifier remains unchanged.','Identifier tetap tidak berubah.','en-id'),[]));
test('unchanged reversal',()=>assert.ok(semanticWarnings('The identifier remains unchanged.','Identifier berubah.','en-id').some(x=>x.includes('negasi'))));
test('asymmetry reversal',()=>assert.ok(semanticWarnings('The distribution is asymmetric.','Distribusinya simetris.','en-id').some(x=>x.includes('negasi'))));
test('asymmetric faithful',()=>assert.deepEqual(semanticWarnings('The distribution is asymmetric.','Distribusinya tidak simetris.','en-id'),[]));
test('uncertainty noun faithful',()=>assert.deepEqual(semanticWarnings('Ketidakpastian harus dilaporkan.','Uncertainty must be reported.','id-en'),[]));
test('possible noun faithful',()=>assert.deepEqual(semanticWarnings('Ada kemungkinan manfaat.','There are possible benefits.','id-en'),[]));
test('grup faithful binding',()=>assert.deepEqual(auditTranslation('Group C included 12 participants, whereas group D included 18 participants.','Grup C meliputi 12 peserta, sedangkan grup D meliputi 18 peserta.'),[]));
test('reordered group label faithful',()=>assert.deepEqual(auditTranslation('Kelompok C memiliki 14 pengamatan dan kelompok D memiliki 21 pengamatan.','Group C has 14 observations and D group has 21 observations.'),[]));
test('reordered group label mutation',()=>assert.ok(auditTranslation('Kelompok C memiliki 14 pengamatan dan kelompok D memiliki 21 pengamatan.','Group C has 21 observations and D group has 14 observations.').length));
test('identifier label order',()=>assert.deepEqual(auditTranslation('The dataset identifier climate-observations~site-P~2026 must remain unchanged.','Identifier dataset climate-observations~site-P~2026 harus tetap tidak berubah.'),[]));
test('explicit uppercase ID changed',()=>assert.ok(auditTranslation('The identifier ABC is valid.','Identifier XYZ valid.').length));
test('table header is not an opaque group label',()=>assert.deepEqual(auditTranslation('Treatment | Outcome\nControl group | 10 mg\nIntervention group | 20 mg','Pengobatan | Outcome\nGrup kendali | 10 mg\nKelompok Intervensi | 20 mg'),[]));
test('named table arm values swapped detected',()=>assert.ok(auditTranslation('Treatment | Outcome\nControl group | 10 mg\nIntervention group | 20 mg','Pengobatan | Outcome\nGrup kendali | 20 mg\nKelompok Intervensi | 10 mg').length));
test('named clinical arm binding faithful',()=>assert.deepEqual(auditTranslation('The placebo group had 12 events and the control group had 19 events.','Kelompok plasebo memiliki 12 kejadian dan kelompok kontrol memiliki 19 kejadian.'),[]));
test('named clinical arm binding swapped',()=>assert.ok(auditTranslation('The placebo group had 12 events and the control group had 19 events.','Kelompok plasebo memiliki 19 kejadian dan kelompok kontrol memiliki 12 kejadian.').length));
test('opaque multi-character labels unchanged',()=>assert.deepEqual(auditTranslation('Group AB2 had 7 events and group CD3 had 9 events.','Kelompok AB2 memiliki 7 kejadian dan kelompok CD3 memiliki 9 kejadian.'),[]));
test('opaque multi-character labels binding swapped',()=>assert.ok(auditTranslation('Group AB2 had 7 events and group CD3 had 9 events.','Kelompok AB2 memiliki 9 kejadian dan kelompok CD3 memiliki 7 kejadian.').length));
test('minute unit mutation',()=>assert.ok(auditTranslation('The duration was 15 min.','Durasinya 15 h.').length));
test('ascii hyphen variable mutation',()=>assert.ok(auditTranslation('If x-4<1, continue.','Jika y-4<1, lanjutkan.').length));
test('chemistry inflections',()=>assert.ok(domainTermsFor('Larutan mengandung reagen.','id-en').some(([a,b])=>a==='larutan'&&b==='solution')));
test('estimation passive inflection',()=>assert.ok(domainTermsFor('Parameter diestimasi dari data.','id-en').some(([a,b])=>a==='diestimasi'&&b==='estimated')));
test('URL no warning',()=>assert.deepEqual(semanticWarnings('https://example.org/long/mathematical/journal/article/absolute','https://example.org/long/mathematical/journal/article/absolute','en-id'),[]));
test('uppercase remains flagged if unchanged',()=>assert.ok(semanticWarnings('CLIMATE CHANGE','CLIMATE CHANGE','en-id').length));
test('uppercase prose is not formula',()=>assert.equal(isLiteralOnly('CLIMATE CHANGE'),false));
test('unknown capitals retained pending review',()=>assert.ok(semanticWarnings('XANES spectroscopy','Spektroskopi XANES','en-id').some(x=>x.includes('kapital'))));
test('known scientific title translated dictionary case',()=>assert.equal(ordinaryCase('THE CLIMATE CHANGE'),'the climate change'));
test('unknown acronym not lowercased',()=>assert.equal(ordinaryCase('XANES'),'XANES'));
test('acronyms are literals',()=>assert.ok(isLiteralOnly('DNA PCR RNA')));
test('chemistry no math glossary',()=>assert.deepEqual(mathTermsFor('The saline solution was mixed with water.','en-id'),[]));
test('union political no math glossary',()=>assert.deepEqual(mathTermsFor('The trade union issued a statement.','en-id'),[]));
test('reverse math singular',()=>assert.ok(mathTermsFor('Himpunan penyelesaian adalah ∅.','id-en').some(x=>x[0]==='himpunan penyelesaian'&&x[1]==='solution set')));
test('math term plural',()=>assert.ok(mathTermsFor('Solve inequalities in interval notation.','en-id').some(x=>x[0]==='inequalities')));
test('lossless segmentation',()=>{const input=('The solution set is (−1, 1) ∪ (7, 9). ').repeat(30);assert.equal(splitForTranslation(input).join(''),input);});
// Explicit fault injection only; never described as model inference.
class FaultWorker{postMessage({id,action}){queueMicrotask(()=>this.onmessage?.({data:action==='prepare'?{id,result:{fixture:true}}:{id,error:'Temporary worker failure'}}));}terminate(){}}
globalThis.Worker=FaultWorker;const tr=new Translator();await tr.prepare('en-id');const result=await tr.translate('The study included 120 participants.');test('failure retryable and diagnosis separated',()=>{assert.equal(result.retryable,true);assert.equal(result.outcome,'failed');assert.equal(result.text,'The study included 120 participants.');assert.ok(!result.issues.join('').includes('Temporary'));assert.ok(result.diagnostics[0].message.includes('Temporary'));});await tr.dispose();
const out={method:'Deterministic validator mutations, span/segmentation controls and explicit worker fault injection; no model inference',pass:cases.filter(c=>c.pass).length,fail:cases.filter(c=>!c.pass).length,cases};
await fs.writeFile(new URL('../evidence/translation/regression.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));if(out.fail)process.exitCode=1;
