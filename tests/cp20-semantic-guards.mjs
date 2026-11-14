import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {auditTranslation,semanticWarnings,Translator,RULESET} from '../app/app/translation.js';
import {domainTermsFor,mathTermsFor,isLiteralOnly,scientificSpans} from '../app/app/semantic-spans.js';
const rows=[];async function test(id,fn){try{await fn();rows.push({id,status:'PASS'});}catch(e){rows.push({id,status:'FAIL',error:e.stack});}}
const valid=[
 ['Every finite subgroup has an identity element.','Setiap subgrup hingga mempunyai elemen identitas.'],
 ['A finite set may be empty.','Himpunan hingga mungkin kosong.'],
 ['An infinite set is not finite.','Himpunan tak hingga bukan himpunan hingga.'],
 ['The solution was heated until the solvent evaporated.','Larutan dipanaskan sampai pelarut menguap.'],
 ['Elastic demand responds to price.','Permintaan elastis merespons harga.'],
 ['Every bounded monotone sequence of real numbers converges.','Setiap barisan monoton terbatas dari bilangan real konvergen.'],
 ['The catalyst is not consumed.','Katalis tidak habis bereaksi.'],
 ['The net force is zero although the object is moving.','Gaya total bernilai nol meskipun benda sedang bergerak.']
];for(const [s,t] of valid)for(const [source,target] of [[s,t],[t,s]])await test('valid '+source,()=>assert.deepEqual(auditTranslation(source,target),[]));
const invalid=[
 ['Every finite subgroup has an identity element.','Setiap subgrup mempunyai elemen identitas.'],
 ['Setiap himpunan hingga mempunyai elemen.','Every group has elements.'],
 ['The solution was heated until the solvent evaporated.','Solusi dipanaskan sampai pelarut menguap.'],
 ['Permintaan elastis dipengaruhi harga.','Elastic request is affected by price.'],
 ['Every bounded monotone sequence converges.','Setiap urutan monoton yang terikat bertemu.'],
 ['Katalis tidak habis bereaksi.','The catalyst does not react exhausted.'],
 ['A finite set may be empty.','Himpunan tak hingga mungkin kosong.']
];for(const [s,t] of invalid)await test('reject '+s,()=>assert.ok(auditTranslation(s,t).length));
await test('chemistry activated by solvent evaporation',()=>assert.ok(domainTermsFor('The solution was heated until the solvent evaporated.','en-id').some(([a,b])=>a==='solution'&&b==='larutan')));
await test('nonchemical solution not forced',()=>assert.ok(!domainTermsFor('A solution to the scheduling problem.','en-id').some(([a])=>a==='solution')));
await test('request not demand without economics',()=>assert.ok(!domainTermsFor('Permintaan untuk wawancara diterima.','id-en').some(([a])=>a==='permintaan')));
await test('finite noun phrase not until',()=>assert.ok(mathTermsFor('Setiap subgrup hingga mempunyai elemen identitas.','id-en').some(([a,b])=>a==='subgrup hingga'&&b==='finite subgroup')));
await test('deterministic rejected recovery is actionable',async()=>{const tr=new Translator();tr.engine={fixture:true};tr.direction='id-en';tr._request=async()=>({targetText:'Everything vanished 99.',finishReason:'complete'});const r=await tr.translate('Kami memeriksa 3 benda.');assert.equal(r.outcome,'rejected');assert.equal(r.retryable,false);assert.equal(r.recovery,'change-source-or-glossary');assert.ok(!r.issues[0].includes('coba ulang'));assert.ok(r.metrics.inferenceCalls>0);});
await test('within block cache inference counts',async()=>{const tr=new Translator();tr.engine={fixture:true};tr.direction='en-id';tr._request=async()=>({targetText:'Kami membaca jurnal.',finishReason:'complete',inputTokens:4,outputTokens:4});const r=await tr.translate('We read journals. We read journals.');assert.equal(r.metrics.inferenceCalls,1);assert.equal(r.metrics.cacheHits,1);});
await test('document appendix terms apply',()=>assert.ok(domainTermsFor('The authors included accounts in the appendix.','en-id').some(([a,b])=>a==='appendix'&&b==='lampiran')));
await test('anatomical appendix not forced to document',()=>assert.ok(!domainTermsFor('The authors report surgical removal of the appendix.','en-id').some(([a])=>a==='appendix')));
await test('mathematical differentiability protected',()=>assert.ok(mathTermsFor('The function is differentiable.','en-id').some(([a,b])=>a==='differentiable'&&b==='dapat diturunkan')));
for(const [a,b] of [['The function is differentiable.','Fungsi dapat dibedakan.'],['The experiment cannot be generalized to the population.','Percobaan tidak dapat dirumuskan untuk populasi.'],['The authors preserved the accounts in the appendix.','Penulis mempertahankan keterangan di usus buntu.'],['The observations may not reduce the standard error.','Pengamatan tidak dapat mengurangi galat baku.']])await test('v2 rejection '+a,()=>assert.ok(auditTranslation(a,b).length));
await test('infinitely many qualifier bilingual invariant',()=>assert.deepEqual(auditTranslation('No finite subgroup has infinitely many elements.','Tidak ada subgrup hingga yang memiliki tak hingga banyak elemen.'),[]));
await test('typed lexical guard rejection not transient retry',async()=>{const tr=new Translator();tr.engine={fixture:true};tr.direction='id-en';tr._request=async()=>({targetText:'The value changes.',finishReason:'complete',inputTokens:5,outputTokens:5});const r=await tr.translate('Nilai tidak berubah.');assert.equal(r.outcome,'rejected');assert.equal(r.retryable,false);});
await test('table deterministic rejected recovery',async()=>{const tr=new Translator();tr.engine={fixture:true};tr.direction='id-en';tr.translate=async()=>({text:'source',status:'review',outcome:'rejected',sourcePreserved:true,retryable:false,issues:[],metrics:{inferenceCalls:2,cacheHits:0,inputTokens:8,outputTokens:7,uniqueInputs:2}});const r=await tr.translateTable({rows:[['teks']],text:'teks'});assert.equal(r.outcome,'rejected');assert.equal(r.retryable,false);assert.equal(r.recovery,'change-source-or-glossary');assert.equal(r.metrics.inferenceCalls,2);});
for(const code of ['GENE_01','TRIAL7_A03','sample_42','X9Z0002_08','ABC18P0007','DATA-2026-07'])await test('identifier atom '+code,()=>{assert.ok(isLiteralOnly(code+'.'));assert.ok(scientificSpans(code+'.').some(s=>s.value===code&&s.kind==='identifier'));assert.ok(auditTranslation(code,code+'X').length);});
await test('identifier sentence does not suppress following prose',async()=>{const tr=new Translator();tr.engine={fixture:true};tr.direction='en-id';let calls=0;tr._request=async()=>{calls++;return{targetText:'Kami membaca jurnal.',finishReason:'complete',inputTokens:4,outputTokens:4};};const r=await tr.translate('GENE_01. We read journals.');assert.equal(r.outcome,'translated');assert.equal(r.text,'GENE_01. Kami membaca jurnal.');assert.equal(calls,1);});
await test('plain words remain translatable beside identifiers',()=>assert.equal(isLiteralOnly('TRIAL7_A03. We read journals.'),false));
await test('unsupported lexical negation faithful both directions',()=>{assert.deepEqual(semanticWarnings('The answer is unsupported.','Jawaban tidak didukung.','en-id'),[]);assert.deepEqual(semanticWarnings('Jawaban tidak didukung.','The answer is unsupported.','id-en'),[]);});
await test('unsupported reversal still rejected',()=>assert.ok(semanticWarnings('The answer is unsupported.','Jawaban didukung.','en-id').length));
await test('separated sequence predicate activates mathematical senses',()=>{const terms=mathTermsFor('The sequence in calculation 81 is bounded and monotone.','en-id');for(const pair of [['sequence','barisan'],['bounded','terbatas'],['monotone','monoton']])assert.ok(terms.some(x=>x[0]===pair[0]&&x[1]===pair[1]));});
await test('ordinary sequence context not forced into mathematics',()=>assert.ok(!mathTermsFor('The sequence of photographs records the journey.','en-id').some(([a])=>a==='sequence')));
await fs.mkdir(new URL('../evidence/cp20/semantics/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/cp20/semantics/guards.json',import.meta.url),JSON.stringify({RULESET,method:'Structural and contextual units; stubbed failure/cache boundaries explicitly marked by test name; NOT semantic model accuracy',rows},null,2));console.log(rows.filter(r=>r.status==='FAIL'));console.log(rows.length, 'checks');if(rows.some(r=>r.status==='FAIL'))process.exitCode=1;
