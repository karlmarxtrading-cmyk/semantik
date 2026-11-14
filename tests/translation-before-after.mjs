import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditTranslation as before} from '../baseline/app/translation.js';
import {auditTranslation as after} from '../app/app/translation.js';
const inputs=[
 ['TR-02-μM','The concentration was 10 μM.','Konsentrasinya 10 mM.'],
 ['TR-02-nM','The concentration was 10 nM.','Konsentrasinya 10 mM.'],
 ['TR-02-Ca','The Ca2+ concentration increased.','Konsentrasi Ca3+ meningkat.'],
 ['TR-04-binding','Treatment A increased by 10 and treatment B decreased by 20.','Perlakuan A meningkat sebesar 20 dan perlakuan B menurun sebesar 10.'],
 ['OUT-03-empty-set-letter','The solution set is ∅.','Himpunan penyelesaian adalah å.'],
 ['OUT-03-empty-set-degree','The solution set is ∅.','Himpunan penyelesaian adalah °.'],
 ['OUT-01-italic-x','Find 𝑥 < 1.','Tentukan x < 1.'],
 ['OUT-04-slug','ID absolute-value-inequalities~challenge~nested-abs~34f24hj2-0~0','ID absolut-nilai-inequalities~challenge~nested-abs~34f24hj2-0~0'],
 ['OUT-01-absolute-var','The value is |x|.','Nilainya |y|.'],
];
const hash=async p=>createHash('sha256').update(await fs.readFile(new URL(p,import.meta.url))).digest('hex');
const cases=inputs.map(([id,source,mutatedTarget])=>({id,source,mutatedTarget,before:before(source,mutatedTarget),after:after(source,mutatedTarget)}));
const report={method:'Actual exported validator functions, synthetic targeted mutations. Targets are deliberately wrong, not model outputs.',testedAt:new Date().toISOString(),baselineAdapterSha256:await hash('../baseline/app/translation.js'),revisedAdapterSha256:await hash('../app/app/translation.js'),revisedSpansSha256:await hash('../app/app/semantic-spans.js'),cases};
await fs.writeFile(new URL('../evidence/translation/validator-before-after.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(cases.map(x=>({id:x.id,beforeDetected:!!x.before.length,afterDetected:!!x.after.length})),null,2));
if(cases.some(x=>!x.after.length))process.exitCode=1;
