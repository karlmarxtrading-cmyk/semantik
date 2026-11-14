import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const release=path.resolve(out,'../../source/r/7a8e787a497535f5');
const {auditTranslation,semanticWarnings}=await import(pathToFileURL(path.join(release,'app/translation.js')));
const {scientificSpans,isFormulaText}=await import(pathToFileURL(path.join(release,'app/semantic-spans.js')));
const cases=[
 ['old-unit-prefix-control','The concentration was 10 μM.','Konsentrasinya 10 mM.'],
 ['old-ion-charge-control','Ca2+ was detected.','Ca3+ terdeteksi.'],
 ['old-empty-set-control','The solution set is ∅.','Himpunan penyelesaian adalah å.'],
 ['old-group-values-control','Group A received 10 mg and group B received 20 mg.','Kelompok A menerima 20 mg dan kelompok B menerima 10 mg.'],
 ['prime-corruption-actual-replay','Given f(x)=x², the derivative is f′(x)=2x.','Mengingat f(x)=x², turunan adalah fåx)=2x.'],
 ['microliter-nanoliter','The sample volume was 10 μL.','Volume sampel adalah 10 nL.'],
 ['electron-volts','The energy was 10 eV.','Energinya adalah 10 keV.'],
 ['dose-units','The absorbed dose was 10 Gy.','Dosis serapannya adalah 10 Sv.'],
 ['combining-math-accent','The sample mean is z̄.','Rata-rata sampel adalah z.'],
 ['non-group-value-association','The systolic and diastolic pressures were 120 and 80 mmHg, respectively.','Tekanan sistolik dan diastolik masing-masing adalah 80 dan 120 mmHg.'],
 ['one-group-claim-reversal','Treatment A reduced mortality by 10%.','Perlakuan A meningkatkan mortalitas sebesar 10%.'],
 ['both-second-actual-replay','Tidak ada bilangan riil yang memenuhi kedua syarat.','No real number satisfies second condition.']
];
const report={type:'Synthetic validator mutation tests, except two actual-model replays; these are NOT claims the model produced every mutation.',cases:cases.map(([id,source,target])=>({id,source,target,issues:auditTranslation(source,target),semanticWarnings:semanticWarnings(source,target,id==='both-second-actual-replay'?'id-en':'en-id'),sourceSpans:scientificSpans(source),targetSpans:scientificSpans(target)}))};
await fs.writeFile(path.join(out,'validator-results.json'),JSON.stringify(report,null,2));
for(const row of report.cases)console.log(JSON.stringify(row));
