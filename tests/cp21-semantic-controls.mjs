import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {auditTranslation,semanticWarnings} from '../app/app/translation.js';
const rows=[
['Maximum omitted','Fungsi mencapai nilai maksimum.','The function is bounded.','The function attains its maximum.'],
['Qualifier dropped','The assumed sampling procedure is described.','Prosedur pengambilan sampel dijelaskan.','Prosedur pengambilan sampel yang diasumsikan dijelaskan.'],
['Modifier moved','An unchanged demand curve is shown.','Jumlah yang diminta tidak berubah pada kurva permintaan.','Kurva permintaan yang tidak berubah ditampilkan.'],
['Proposed omitted','Penjelasan yang diajukan diuji.','The explanation is tested.','The proposed explanation is tested.'],
['Label becomes article','Perlakuan A menghasilkan 13 respons.','A treatment produced 13 responses.','Treatment A produced 13 responses.'],
['Dilution lost','Diluting the solution reduces its concentration.','Membagikan larutan mengurangi konsentrasi.','Mengencerkan larutan menurunkan konsentrasi.'],
['Possessive term lost','Katalis tidak mengubah tetapan kesetimbangannya.','The catalyst does not change its balance.','The catalyst does not change its equilibrium constant.'],
['Confounding lost','Random assignment reduces confounding.','Penugasan acak mengurangi peran.','Penugasan acak mengurangi perancu.'],
['Counted actor replaces goods','The quantity sellers offer is recorded.','Jumlah penjual dicatat.','Jumlah barang yang ditawarkan penjual dicatat.'],
['Catalyst recovery','The catalyst was recovered.','Katalis ditemukan.','Katalis diperoleh kembali.'],
['Boiling process','The solvent boiled.','Pelarut direbus.','Pelarut mendidih.'],
['Nonzero changed','The determinant is nonzero.','Determinan nol.','Determinan tidak nol.']
];
const result=[];
for(const [name,s,bad,good] of rows){assert.ok(auditTranslation(s,bad).length,name+' did not reject corruption');assert.deepEqual(auditTranslation(s,good),[],name+' rejected valid control');result.push({name,status:'PASS',source:s,badTarget:bad,validTarget:good});}
assert.ok(!semanticWarnings('The determinant is nonzero.','Determinan tidak nol.','en-id').some(x=>/negasi/.test(x)));
assert.ok(semanticWarnings('The claim is not valid.','Klaim tersebut valid.','en-id').some(x=>/negasi/.test(x)));
await fs.mkdir(new URL('../evidence/cp21/semantics/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidence/cp21/semantics/GUARD_CONTROLS.json',import.meta.url),JSON.stringify({method:'Deterministic corrupted/valid bilingual controls; not inference or universal semantic proof',rows:result,polarityControls:2},null,2)+'\n');console.log(result.length+' paired controls + 2 polarity controls PASS');
