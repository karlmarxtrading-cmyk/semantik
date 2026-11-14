// Development corpus only. Existing holdouts become regressions once consulted.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {repo,build,Translator,cleanupBridge} from './cp20-semantic-runtime.mjs';
const folder=path.join(repo,'evidence/cp21/semantics');await fs.mkdir(folder,{recursive:true});
const corpus=JSON.parse(await fs.readFile(path.join(repo,'evidence/recovery/acceptance/CORPUS.json'))).cases;
const review=JSON.parse(await fs.readFile(path.join(repo,'evidence/recovery/semantics/RECOVERY_SEMANTIC_REVIEW.json')));
const old=JSON.parse(await fs.readFile(path.join(repo,'evidence/recovery/semantics/RECONCILED_KNOWN_REGRESSION.json'))).rows;
let cases=[...corpus,...review.findings.map(x=>({...x,...old.find(y=>y.id===x.id)})).filter(x=>x.direction)];
if(process.env.CP21_ONLY)cases=cases.filter(x=>process.env.CP21_ONLY.split(',').includes(x.id));
const report={status:'RUNNING',method:'Actual local ONNX/WASM via Node Worker bridge; development only; no semantic approval implied',build:{...build,phrasesSHA256:createHash('sha256').update(await fs.readFile(path.join(repo,'app/app/academic-phrases.js'))).digest('hex')},rows:[]};
const tr=new Translator();
try{for(const direction of ['en-id','id-en']){const engine=await tr.prepare(direction);for(const row of cases.filter(x=>x.direction===direction)){
const start=performance.now();const result=await tr.translate(row.source);report.rows.push({id:row.id,direction,source:row.source,...result,ms:performance.now()-start,actualEngine:engine});
await fs.writeFile(path.join(folder,process.env.CP21_REPORT||'DEVELOPMENT_1.json'),JSON.stringify(report,null,2)+'\n');console.log(row.id,result.outcome,Math.round(performance.now()-start));
}}report.status='COMPLETED_EXECUTION_NOT_SEMANTIC_APPROVAL';report.counts={cases:report.rows.length,translated:report.rows.filter(x=>x.outcome==='translated').length,rejected:report.rows.filter(x=>x.outcome==='rejected').length,failed:report.rows.filter(x=>x.outcome==='failed').length};
await fs.writeFile(path.join(folder,process.env.CP21_REPORT||'DEVELOPMENT_1.json'),JSON.stringify(report,null,2)+'\n');console.log(report.counts);
}finally{await tr.dispose();await cleanupBridge();}
