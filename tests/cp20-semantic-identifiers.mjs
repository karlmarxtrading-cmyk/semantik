import fs from 'node:fs/promises';import path from 'node:path';import {repo,build,Translator,cleanupBridge} from './cp20-semantic-runtime.mjs';
const cases=[
 ['en-id','GENE_01. We read journals.'],
 ['en-id','TRIAL7_A03. The research team measured 18 samples before the intervention. The comparison group received no treatment. This observation alone does not establish a causal relationship.'],
 ['en-id','OBS0002 END'],
 ['en-id','DATA-2026-07. The solution was heated until the solvent evaporated.'],
 ['id-en','sample_42. Peneliti membaca jurnal.'],
 ['id-en','LAB9R07_01. Setiap himpunan hingga memiliki sejumlah elemen yang terbatas.'],
 ['id-en','OBS0003 AKHIR'],
 ['en-id','CP20B0001_00. The research team measured 18 samples before the intervention. The comparison group received no treatment. This observation alone does not establish a causal relationship.'],
 ['en-id','CP20P0001 END']
];const report={identity:build,method:'Actual local ONNX/WASM identifier-boundary integration probes; diverse generic laboratory syntax plus original failed capacity fixture replication. Not semantic quality acceptance.',rows:[]};const tr=new Translator();
try{for(const direction of ['en-id','id-en']){await tr.prepare(direction);for(const [d,source] of cases){if(d!==direction)continue;const result=await tr.translate(source);report.rows.push({source,direction,...result});console.log(d,source,'=>',result.outcome,result.text,result.issues);}}}finally{await tr.dispose();await cleanupBridge();}
await fs.writeFile(path.join(repo,'evidence/cp20/semantics/IDENTIFIER_INFERENCE.json'),JSON.stringify(report,null,2));
if(report.rows.some(r=>r.outcome!=='translated'))process.exitCode=1;
