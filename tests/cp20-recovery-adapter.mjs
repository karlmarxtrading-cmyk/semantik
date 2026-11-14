import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {semanticWarnings,RULESET} from '../app/app/translation.js';
const rows=[
 ['nonempty equivalence','A nonempty set has 3 elements.','Himpunan tidak kosong memiliki 3 elemen.','en-id',false],
 ['nonempty cannot become empty','A nonempty set has 3 elements.','Himpunan kosong memiliki 3 elemen.','en-id',true],
 ['none equivalence','None of the samples exceeded 4 mg.','Tidak ada sampel yang melebihi 4 mg.','en-id',false],
 ['none reversal','None of the samples exceeded 4 mg.','Semua sampel melebihi 4 mg.','en-id',true],
 ['no existing equivalence','There is no evidence of causation.','Tidak ada bukti hubungan sebab akibat.','en-id',false],
 ['none reverse direction','Tidak ada sampel yang melebihi 4 mg.','None of the samples exceeded 4 mg.','id-en',false],
 ['nonempty plus independent negation','The set is nonempty and not bounded.','Himpunan tidak kosong dan tidak terbatas.','en-id',false]
].map(([name,source,target,direction,expectedNegationWarning])=>{const issues=semanticWarnings(source,target,direction),actual=issues.some(x=>/negasi|negatif/.test(x));assert.equal(actual,expectedNegationWarning,name);return {name,source,target,direction,expectedNegationWarning,issues,status:'PASS'};});
for(const [name,source,target,direction,pattern,expected] of [
 ['incomplete equivalence','The dataset is incomplete.','Data tersebut tidak lengkap.','en-id','negasi',false],
 ['incomplete reversal','The dataset is incomplete.','Data tersebut lengkap.','en-id','negasi',true],
 ['unchanging equivalence','The value is unchanging.','Nilai tersebut tidak berubah.','en-id','negasi',false],
 ['entire interval extent','Fungsi ini kontinu di seluruh interval.','This function is continuous over the entire interval.','id-en','kuantor',false],
 ['throughout interval extent','Fungsi ini kontinu di seluruh interval.','This function is continuous throughout the interval.','id-en','kuantor',false],
 ['partial interval rejected','Fungsi ini kontinu di seluruh interval.','This function is continuous in part of the interval.','id-en','kuantor',true],
 ['remaining every point still required','Setiap titik berada di seluruh interval.','The point is throughout the interval.','id-en','kuantor',true],
 ['entire sample cannot satisfy all samples','Semua sampel diukur.','The entire sample was measured.','id-en','kuantor',true],
 ['extent noun mismatch','Fungsi ini kontinu di seluruh interval.','This function is continuous throughout the region.','id-en','kuantor',true]
]){const issues=semanticWarnings(source,target,direction),actual=issues.some(x=>new RegExp(pattern).test(x));assert.equal(actual,expected,name);rows.push({name,source,target,direction,expectedWarning:expected,issues,status:'PASS'});}
const report={ruleset:RULESET,adapterSHA256:createHash('sha256').update(await fs.readFile(new URL('../app/app/translation.js',import.meta.url))).digest('hex'),method:'Deterministic guard positive/negative controls; no inference or semantic approval inferred',rows};
await fs.mkdir(new URL('../evidence/recovery/root',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/recovery/root/ADAPTER_CONTROLS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(rows.length+' adapter guard controls PASS');
