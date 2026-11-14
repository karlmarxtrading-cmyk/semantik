import fs from 'node:fs/promises';import path from 'node:path';
import {repo,build,Translator,cleanupBridge} from './cp19-runtime.mjs';
// New constructed evaluation cases written after the CP19 patch freeze. These
// are AI-authored controls, not independent human-reviewed journal translations.
const pairs=[
 ['mathematics','Every finite subgroup has an identity element.','Setiap subgrup hingga mempunyai elemen identitas.'],
 ['physics','The net force is zero although the object is moving.','Gaya total bernilai nol meskipun benda sedang bergerak.'],
 ['chemistry','The catalyst changes the reaction rate but is not consumed.','Katalis mengubah laju reaksi tetapi tidak habis bereaksi.'],
 ['biology','These cells divide without producing identical daughter cells.','Sel-sel ini membelah tanpa menghasilkan sel anak yang identik.'],
 ['medicine','The symptoms improved, but the risk of relapse remained.','Gejala membaik, tetapi risiko kekambuhan tetap ada.'],
 ['statistics','A smaller sample does not guarantee a larger standard error.','Sampel yang lebih kecil tidak menjamin galat baku yang lebih besar.'],
 ['economics','Demand fell after the price increased.','Permintaan turun setelah harga meningkat.'],
 ['social-science','The interview records describe perceptions rather than observed actions.','Catatan wawancara menggambarkan persepsi alih-alih tindakan yang diamati.'],
 ['research-methods','The analysis excluded participants who withdrew before follow-up.','Analisis tidak menyertakan peserta yang mengundurkan diri sebelum tindak lanjut.']
];
const report={build,method:'Actual final-dist local WASM/ONNX; Actual final-dist inference on eighteen new AI-authored acceptance sentences, separated from development/first holdout. No code changes based on these outputs; no independent human approval.',humanApproval:false,rows:[]};const tr=new Translator();
try{for(const direction of ['en-id','id-en']){await tr.prepare(direction);for(const [domain,en,id] of pairs){const source=direction==='en-id'?en:id,reference=direction==='en-id'?id:en,start=performance.now();const result=await tr.translate(source);report.rows.push({id:'CP19-A-'+String(report.rows.length+1).padStart(3,'0'),domain,direction,source,reference,...result,ms:Math.round(performance.now()-start),humanVerdict:'PENDING'});console.log(domain,direction,result.outcome);await fs.writeFile(path.join(repo,'evidence/cp19/INDEPENDENT_ACCEPTANCE.json'),JSON.stringify(report,null,2));}}}finally{await tr.dispose();await cleanupBridge();}
