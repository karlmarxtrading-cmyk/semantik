import fs from 'node:fs/promises';import path from 'node:path';
import {repo,build,Translator,cleanupBridge} from './cp19-runtime.mjs';
// New constructed evaluation cases written after the CP19 patch freeze. These
// are AI-authored controls, not independent human-reviewed journal translations.
const pairs=[
 ['mathematics','A necessary condition is not always a sufficient condition.','Syarat yang perlu tidak selalu merupakan syarat yang cukup.'],
 ['physics','The wavelength increases while the frequency decreases.','Panjang gelombang bertambah sedangkan frekuensi berkurang.'],
 ['chemistry','The equilibrium constant depends on temperature, not on the initial concentration.','Tetapan kesetimbangan bergantung pada suhu, bukan pada konsentrasi awal.'],
 ['biology','The mutation changes gene expression without changing the protein sequence.','Mutasi mengubah ekspresi gen tanpa mengubah urutan protein.'],
 ['medicine','The confidence interval includes no effect; a benefit has not been established.','Interval kepercayaan mencakup tidak adanya efek; manfaat belum terbukti.'],
 ['statistics','The median remained stable even though the variance increased.','Median tetap stabil meskipun varians meningkat.'],
 ['economics','Higher nominal wages do not necessarily imply higher purchasing power.','Upah nominal yang lebih tinggi tidak selalu berarti daya beli yang lebih tinggi.'],
 ['social-science','Self-reported intentions may differ from observed behavior.','Niat yang dilaporkan sendiri mungkin berbeda dari perilaku yang diamati.'],
 ['research-methods','Participants were allocated randomly, but outcome assessors knew the allocation.','Peserta dialokasikan secara acak, tetapi penilai luaran mengetahui alokasinya.']
];
const report={build,method:'Actual final-dist local WASM/ONNX; AI-authored controls originally held out from initial CP19 patch. First-run failures prompted general concept/scope guards; this rerun is now regression, NOT a fresh independent holdout. No human approval.',humanApproval:false,rows:[]};const tr=new Translator();
try{for(const direction of ['en-id','id-en']){await tr.prepare(direction);for(const [domain,en,id] of pairs){const source=direction==='en-id'?en:id,reference=direction==='en-id'?id:en,start=performance.now();const result=await tr.translate(source);report.rows.push({id:'CP19-H-'+String(report.rows.length+1).padStart(3,'0'),domain,direction,source,reference,...result,ms:Math.round(performance.now()-start),humanVerdict:'PENDING'});console.log(domain,direction,result.outcome);await fs.writeFile(path.join(repo,'evidence/cp19/DOMAIN_HOLDOUT.json'),JSON.stringify(report,null,2));}}}finally{await tr.dispose();await cleanupBridge();}
