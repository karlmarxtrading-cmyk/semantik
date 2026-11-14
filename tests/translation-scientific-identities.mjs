import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditTranslation,splitForTranslation} from '../app/app/translation.js';
import {scientificSpans,functionNotationSpans,romanLabelSpans,taxonomicSpans} from '../app/app/semantic-spans.js';
const checks=[];
function test(name,fn){try{fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.stack});}}
for(const call of ['F(B)','H(X)','g(x)','g(f(x))','P(A,B)','Var(X)','log(x+1)','f(A_i)','h(𝑥)','Cov(X,Y)']){
 test('function identity '+call,()=>assert.ok(functionNotationSpans('Evaluate '+call+' before proceeding.').some(s=>s.value===call)));
 test('function unchanged '+call,()=>assert.deepEqual(auditTranslation('Evaluate '+call+'.','Hitung '+call+'.'),[]));
}
for(const [a,b] of [['F(B)','F(C)'],['H(X)','H(Y)'],['g(x)','g(y)'],['log(x+1)','log(x-1)'],['P(A,B)','P(B,A)'],['Var(X)','Var(Y)'],['f(A_i)','f(A_j)'],['h(𝑥)','h(x)']])test('function mutation '+a+' -> '+b,()=>assert.ok(auditTranslation('Evaluate '+a+'.','Hitung '+b+'.').length));
test('ordinary parenthetical prose not function',()=>assert.deepEqual(functionNotationSpans('Method A (new approach) was tested.'),[]));
test('unbalanced function not invented',()=>assert.deepEqual(functionNotationSpans('Use h(x and continue.'),[]));
test('function protects sentence segmentation',()=>{const text=('The function g(f(x)) is defined. ').repeat(30);const parts=splitForTranslation(text,80);assert.equal(parts.join(''),text);assert.ok(parts.every(p=>!p.endsWith('g(')&&!p.endsWith('f(')));});
for(const [a,b] of [['(ii) The sample is dry.','(iii) Sampel kering.'],['(iv) Teks tetap. (v) Teks berikut.','(v) Text stays. (v) Next text.'],['Condition (ix) is required.','Kondisi (xi) diperlukan.']])test('Roman mutation '+a,()=>assert.ok(auditTranslation(a,b).length));
test('Roman labels unchanged',()=>assert.deepEqual(auditTranslation('(ii) The sample is dry. (iii) It is warm.','(ii) Sampel kering. (iii) Sampel hangat.'),[]));
test('Roman ordinary mix not frozen',()=>assert.deepEqual(romanLabelSpans('(mix) the ingredients first.'),[]));
test('Roman nonlabel parenthetical I not inferred',()=>assert.deepEqual(romanLabelSpans('The personal pronoun (I) is written here.'),[]));
for(const text of ['The species Homo sapiens was recorded.','The bacterium (Escherichia coli) was isolated.','Nama ilmiah Arabidopsis thaliana dicatat.','The fox (Vulpes vulpes) was observed.','The species Inventus fictivus was listed.'])test('explicit taxonomic cue '+text,()=>assert.equal(taxonomicSpans(text).length,1));
for(const text of ['Climate change was observed.','The experiment (Further analysis) is reported.','Species diversity declined.','The species requires Further analysis.','We discussed Common language.'])test('ordinary prose not taxon '+text,()=>assert.deepEqual(taxonomicSpans(text),[]));
test('taxon mutated detected',()=>assert.ok(auditTranslation('The bacterium (Escherichia coli) was isolated.','Bakteri (Escherichia fakei) diisolasi.').length));
test('taxon surrounding prose may translate',()=>assert.deepEqual(auditTranslation('The bacterium (Escherichia coli) was isolated.','Basil (Escherichia coli) diisolasi.'),[]));
test('taxon duplicate detected',()=>assert.ok(auditTranslation('The species Homo sapiens was recorded.','Homo sapiens dan Homo sapiens dicatat.').length));
test('source taxonomy never corrected',()=>assert.ok(scientificSpans('The species Inventus fictivus was listed.').some(s=>s.value==='Inventus fictivus')));
const identities={};for(const f of ['app/translation.js','app/semantic-spans.js'])identities[f]=createHash('sha256').update(await fs.readFile(new URL('../app/'+f,import.meta.url))).digest('hex');
const report={testedAt:new Date().toISOString(),identities,method:'Independent constructed structural regression/validator mutations; not model outputs or validation that invented taxon exists.',checks,pass:checks.filter(x=>x.pass).length,fail:checks.filter(x=>!x.pass).length};
await fs.writeFile(new URL('../evidence/translation/scientific-identities-regression.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.fail)process.exitCode=1;
