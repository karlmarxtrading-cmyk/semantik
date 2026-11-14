import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {auditTranslation,semanticWarnings} from '../app/app/translation.js';
const root=new URL('../',import.meta.url);const read=async p=>JSON.parse(await fs.readFile(new URL(p,root),'utf8'));
const prior=await read('evidence/recovery/semantics/DEVELOPMENT_ITERATION_3.json'),affected=await read('evidence/recovery/semantics/AFFECTED_ONLY_INFERENCE.json');
const replacements=new Map(affected.rows.map(r=>[r.id,r])),checks=[],rows=[];
for(const r of prior.rows){
 if(replacements.has(r.id)){rows.push({...replacements.get(r.id),evidenceRun:'AFFECTED_ONLY_INFERENCE.json',executionSourceBinding:affected.sourceBinding});continue;}
 assert.ok(!/\b(?:reviewers?|penelaah|peninjau)\b/iu.test(r.source),'Unrerun source uses new reviewer term');
 const blocking=r.outcome==='translated'?[...auditTranslation(r.source,r.text),...semanticWarnings(r.source,r.text,r.direction).filter(x=>/negasi|kuantor|modalitas|ketidakpastian|belum berubah bahasa/.test(x))]:null;
 assert.ok(blocking===null||blocking.length===0,r.id+': '+blocking);
 checks.push({id:r.id,termDeltaCanMatchSource:false,blockingIssuesAgainstCurrentOutput:blocking,actualInferenceRerun:false});
 rows.push({...r,evidenceRun:'DEVELOPMENT_ITERATION_3.json',executionSourceBinding:prior.sourceBinding});
}
const files={};for(const name of ['translation.js','claim-guards.js','semantic-spans.js'])files[name]=createHash('sha256').update(await fs.readFile(new URL('app/app/'+name,root))).digest('hex');
const result={status:'KNOWN_REGRESSION_PARTIAL_NOT_PRODUCTION_READY',currentSourceBinding:files,method:'50-case real inference followed by3 affected-case real inferences;47 prior results kept with original executionidentity and revalidated guards. This is not50 new executions onfinalbytes or blindacceptance.',rows,checks,humanApprovals:0,counts:Object.fromEntries(['translated','rejected','failed','preserved'].map(status=>[status,rows.filter(r=>r.outcome===status).length])),limitations:['Guard success is not semantic proof','Most cases were used to develop terminology/guards','Scientific fluency, completeness and cross-sentence meaning still require independent acceptance','Two source-preserved rejected cases are incomplete translations']};
await fs.writeFile(new URL('evidence/recovery/semantics/RECONCILED_KNOWN_REGRESSION.json',root),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({counts:result.counts,unchangedPriorRows:checks.length,currentAffectedRows:affected.rows.length,currentSourceBinding:files}));
