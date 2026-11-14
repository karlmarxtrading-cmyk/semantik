import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {scientificClaimIssues} from '../app/app/claim-guards.js';
import {domainTermsFor} from '../app/app/semantic-spans.js';
import {semanticWarnings,auditTranslation} from '../app/app/translation.js';
const tests=[];
const check=(name,fn)=>{fn();tests.push({name,status:'PASS'});};
const cases=[
 ['Population mean mistranslated','A sample mean differs from the population mean.','Rata-rata sampel berbeda dari populasi berarti.'],
 ['Price subject omitted','Harga barang substitusi naik, sehingga permintaan berubah.','Substitute goods go up, so demand changes.'],
 ['Calibration identity lost','Kalibrasi mengurangi kesalahan pengukuran; kalibrasi tidak membuktikan penjelasan itu.','Calicacy reduces measurement error; calibration does not prove that explanation.'],
 ['Incorrect recording predicate shifted','Perbedaan tersebut bukan bukti bahwa suatu pengamatan dicatat secara keliru.','The difference is not evidence that a misrecorded observation is recorded.'],
 ['Dependence replaced with imperative','Konsentrasi bergantung pada volume larutan.','Concentration on solution volume.'],
 ['Numbered experiment became quantity','Himpunan dalam percobaan 47 memiliki elemen berbeda.','The set in 47 experiments has different elements.'],
 ['Rubric changed into generic feature','Rubrik penilaian membedakan jawaban tertulis.','The feature distinguishes written answers.'],
 ['One interval becomes all intervals','Fungsi itu kontinu di seluruh interval.','The function is continuous at all intervals.'],
 ['Reviewer role changed','The reviewer asked the authors to explain the data.','Penginjil meminta penulis menjelaskan data.'],
 ['Satisfaction of conditions changed','The required hypotheses hold.','Hipotesis yang diperlukan masih kuat.'],
 ['Passive recording auxiliary missing','Perbedaan bukan bukti bahwa suatu pengamatan dicatat secara keliru.','The difference is not evidence that an observation recorded incorrectly.'],
 ['Price predicate replaced by nominal increase','When the price of a substitute rises, demand increases.','Ketika harga dari sebuah peningkatan pengganti, permintaan meningkat.'],
 ['Event vanished from evidence proposition','The record is evidence that an event did not occur.','Catatan itu merupakan bukti yang tidak pernah terjadi.'],
 ['Quantity demanded lost','Peningkatan jumlah yang diminta berbeda dari peningkatan permintaan.','The requested increase differs from increased demand.'],
 ['Certify weakened to mere statement','The report does not certify that every respondent understood.','Laporan itu tidak menyatakan bahwa setiap responden memahami.'],
];
for(const [name,source,target] of cases)check(name,()=>assert.ok(scientificClaimIssues(source,target).length));
for(const [name,source,target] of [
 ['Population mean correct','The population mean is unknown.','Rata-rata populasi tidak diketahui.'],
 ['Numbered experiment correct','Himpunan dalam percobaan 47 memiliki elemen berbeda.','The set in experiment 47 has different elements.'],
 ['Quantity of experiments unchanged','Ada 47 percobaan dalam penelitian ini.','There are 47 experiments in this study.'],
 ['Price subject correct','Harga barang substitusi naik, sehingga permintaan berubah.','The price of substitute goods rises, so demand changes.'],
 ['Incorrect recording predicate correct','Perbedaan tersebut bukan bukti bahwa suatu pengamatan dicatat secara keliru.','The difference is not evidence that an observation was recorded incorrectly.'],
 ['Mathematical interval scope retained','Fungsi itu kontinu di seluruh interval.','The function is continuous throughout the interval.'],
 ['Event proposition preserved','The record is evidence that an event did not occur.','Catatan itu merupakan bukti bahwa suatu peristiwa tidak terjadi.'],
 ['Quantity demanded retained','Peningkatan jumlah yang diminta berbeda dari peningkatan permintaan.','An increase in quantity demanded differs from an increase in demand.'],
 ['Certification disclaimer retained','The report does not certify that every respondent understood.','Laporan itu tidak menjamin bahwa setiap responden memahami.'],
 ['Reviewer role retained','The reviewer asked the authors to explain the data.','Penelaah meminta penulis menjelaskan data.'],
 ['Singular hypothesis fulfillment','Hipotesis yang diperlukan terpenuhi.','The required hypothesis is fulfilled.'],
 ['Plural condition fulfillment','The required conditions are satisfied.','Syarat yang diperlukan terpenuhi.'],
 ['None polarity equivalence','None of the patients received treatment.','Tidak ada pasien yang menerima perlakuan.'],
 ['Nonempty polarity equivalence','A nonempty finite set has elements.','Suatu himpunan hingga yang tidak kosong memiliki elemen.'],
 ])check(name,()=>assert.deepEqual(auditTranslation(source,target),[]));
check('Nonempty deletion is not accepted',()=>assert.ok(semanticWarnings('A nonempty finite set has elements.','Suatu himpunan hingga memiliki elemen.','en-id').length));
check('Interview time is not a question instrument',()=>assert.ok(!domainTermsFor('The interview schedule lists each appointment time in the calendar.','en-id').some(([s])=>s==='interview schedule')));
check('Interview questions context selects instrument',()=>assert.ok(domainTermsFor('Researchers inspect the questions in the interview schedule.','en-id').some(([s,t])=>s==='interview schedule'&&t==='pedoman wawancara')));
check('Financial balance not assigned to equilibrium',()=>assert.ok(!domainTermsFor('The account explains the balance of forces in the instrument.','en-id').some(([s])=>s==='balance')));
check('Rubrik as newspaper column is not assessment',()=>assert.ok(!domainTermsFor('Rubrik budaya terbit pada hari Minggu.','id-en').some(([s])=>s==='rubrik')));
check('Permintaan for personal help is not turned into supply',()=>assert.ok(!domainTermsFor('Ia meminta bantuan dan saran pribadi.','id-en').some(([s])=>s==='penawaran')));
const sourceBinding={};for(const file of ['translation.js','claim-guards.js','semantic-spans.js'])sourceBinding[file]=createHash('sha256').update(await fs.readFile(new URL('../app/app/'+file,import.meta.url))).digest('hex');
await fs.writeFile(new URL('../evidence/recovery/semantics/GUARD_TESTS.json',import.meta.url),JSON.stringify({sourceBinding,method:'Targeted negative and positive semantic invariant controls, not general semantic proof',tests},null,2)+'\n');console.log(JSON.stringify({tests:tests.length,status:'PASS'}));
