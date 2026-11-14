// CP22 concept-coverage unit controls. Pure functions; no model, no network.
// Sentences are generic controls written for the mechanism, not corpus answers.
import assert from 'node:assert/strict';
import path from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=process.env.CP22_APP_ROOT||path.join(path.dirname(fileURLToPath(import.meta.url)),'../app');
const cov=await import(pathToFileURL(path.join(root,'app/coverage.js')).href);
const tr=await import(pathToFileURL(path.join(root,'app/translation.js')).href);
const ph=await import(pathToFileURL(path.join(root,'app/academic-phrases.js')).href);
const results=[];const check=(name,fn)=>{fn();results.push(name);};
check('stemmer EN derivation',()=>{for(const [a,b] of [['boundedness','bounded'],['converging','convergence'],['estimates','estimate'],['entries','entry'],['measurements','measure']])assert.ok([...cov.stems(a,'en')].some(x=>cov.stems(b,'en').has(x)),a+'/'+b);});
check('stemmer ID morphology',()=>{for(const [a,b] of [['penundaan','menunda'],['penyembunyian','menyembunyikan'],['keterbatasan','terbatas'],['diperlukan','memerlukan'],['rata-rata','rata']])assert.ok([...cov.stems(a,'id')].some(x=>cov.stems(b,'id').has(x)),a+'/'+b);});
check('synonym entries survive stemming (delay)',()=>{assert.equal(cov.missingConcepts('Postponement','Delay.','en').length,0);assert.equal(cov.missingConcepts('postponed','delayed','en').length,0);});
check('substituted concept is detected',()=>{assert.deepEqual(cov.missingConcepts('Averaging improves precision.','Repetition improves precision.','en').map(x=>x.word),['Averaging']);});
check('function words are not concepts',()=>{assert.equal(cov.missingConcepts('Not all of these would have been there.','Not all were there.','en').length,0);});
check('two-evidence rule: isolated term in aligned target rescues paraphrase',()=>{
  const g=cov.conceptGaps({source:'The reagent was dissolved.',target:'Reagen itu dilarutkan.',back:'The reagent was solved.',srcLang:'en',tgtLang:'id',iso:w=>({dissolved:'dilarutkan'})[w]||''});assert.equal(g.length,0);});
check('sentence alignment keeps referents per sentence',()=>{
  const g=cov.conceptGaps({source:'Rumus itu sederhana. Rumus tersebut perlu bukti.',target:'The formula is simple. They need proof.',back:'Rumus itu sederhana. Mereka perlu bukti.',srcLang:'id',tgtLang:'en',iso:w=>({rumus:'formula'})[w]||''});
  assert.deepEqual(g.map(x=>[x.word,x.sentence]),[['Rumus',1]]);});
check('Indonesian voice inversion detected',()=>{assert.equal(cov.voiceGaps('Rumus memerlukan pembenaran.','Rumus diperlukan untuk pembenaran.')[0]?.word,'memerlukan');assert.equal(cov.voiceGaps('Rumus memerlukan pembenaran.','Rumus membutuhkan pembenaran.').length,0);});
check('degree adverb covered by intensifier',()=>{assert.equal(cov.conceptGaps({source:'They differ substantially.',target:'Mereka sangat berbeda.',back:'They are very different.',srcLang:'en',tgtLang:'id',iso:()=>''}).length,0);});
check('repair eligibility excludes homographs',()=>{assert.equal(tr.repairEligible('rose','en'),false);assert.equal(tr.repairEligible('bears','en','who bears','beruang'),false);assert.equal(tr.repairEligible('excludes','en','mass excludes','mengecualikan'),true);assert.equal(tr.repairEligible('results','en','the results','menghasilkan'),false);assert.equal(tr.repairEligible('postponement','en'),true);assert.equal(tr.repairEligible('rumus','id','x, rumus tersebut perlu'),true);assert.equal(tr.repairEligible('titik','id','di titik ujung'),false);});
check('analytic negation only with positive base',()=>{assert.equal(tr.semanticWarnings('The mass excludes the solvent.','Massa tidak termasuk pelarut.','en-id').length,0);assert.ok(tr.semanticWarnings('The mass excludes the solvent.','Massa tidak menyebutkan pelarut.','en-id').some(x=>/negasi/.test(x)));assert.ok(tr.semanticWarnings('The effect is large.','Efeknya tidak besar.','en-id').some(x=>/negasi/.test(x)));});
check('grammatical sense rules',()=>{const r=ph.grammaticalSenseRules('A fall in cost does not necessarily lower price. The order matters. It matters less here.','en-id');
  assert.ok(r.some(([s,t])=>s==='does not necessarily lower'&&t==='tidak selalu menurunkan'));assert.ok(r.some(([s,t])=>s==='matters'&&t==='penting'));assert.ok(r.some(([s,t])=>s==='matters less'&&t==='kurang penting'));
  assert.equal(ph.grammaticalSenseRules('A lower bound is used. No matter what.','en-id').length,0);
  assert.deepEqual(ph.grammaticalSenseRules('Nilai selisih kedua perkiraan kecil. Tahap kedua penelitian dimulai.','id-en'),[['selisih kedua','difference between the two']]);});
check('derived nominal terms',()=>{assert.deepEqual(ph.derivedNominalTerms([['bounded','terbatas']],'boundedness alone','en-id'),[['boundedness','keterbatasan']]);});
console.log(JSON.stringify({suite:'cp22-coverage-unit',pass:results.length,checks:results}));
// Over-merging control: a formula referent must not be covered by "satu sama lain".
assert.deepEqual(cov.missingConcepts('Rumus tersebut memerlukan pembenaran.','Mereka bergantung satu sama lain dan membutuhkan pembenaran.','id').map(x=>x.word),['Rumus']);
console.log('over-merging control PASS');
// Verifier failure must degrade visibly, never silently and never block translation.
{
  const t=new tr.Translator();
  t._request=async(action,payload)=>action==='prepare'?{offlineReady:true,storageMode:'persistent',storageWarning:'',fingerprint:'fp'}:{targetText:'Halo dunia.',finishReason:'complete',inputTokens:3,outputTokens:3};
  const OrigPrepare=tr.Translator.prototype.prepare;
  const failing=new tr.Translator({verify:false});failing.prepare=async()=>{throw new Error('quota exceeded');};
  t.verifier=failing;
  const engine=await t.prepare('en-id');
  assert.equal(engine.conceptVerification,'unavailable');assert.equal(t.verifier,null);
  const r=await t.translate('Hello world.');
  assert.ok(r.issues.some(x=>/cakupan konsep tidak aktif/.test(x)),'visible note');assert.equal(r.status,'review');
  console.log('verifier degradation control PASS');
}
{
  const t=new tr.Translator();
  t._request=async()=>({offlineReady:true,storageMode:'persistent',storageWarning:'',fingerprint:'fp'});
  const v=new tr.Translator({verify:false});v.prepare=async()=>({offlineReady:false,storageWarning:'Model hanya sesi.',fingerprint:'v'});t.verifier=v;
  const engine=await t.prepare('id-en');assert.equal(engine.offlineReady,false);assert.match(engine.storageWarning,/sesi/);
  console.log('combined offline readiness control PASS');
}
