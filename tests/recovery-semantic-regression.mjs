import fs from 'node:fs/promises';
import path from 'node:path';
import {repo,build,Translator,cleanupBridge} from './cp20-semantic-runtime.mjs';
const out=path.join(repo,'evidence/recovery/semantics');await fs.mkdir(out,{recursive:true});
const read=async p=>JSON.parse(await fs.readFile(path.join(repo,p),'utf8'));
const v4=await read('evidence/cp20/semantics/V4_FRESH_ACCEPTANCE.json');
const old=await read('evidence/cp20/semantics/HOLDOUT_INFERENCE_FINAL_SOURCE.json');
const long=await fs.readFile(path.join(repo,'evidence/cp20/qa/real-inference-final-1668/LONG_OUTPUT_AI_REVIEW.md'),'utf8');
const longSources=[...long.matchAll(/\*\*Sumber\*\*\s*\n\n([\s\S]*?)\n\n\*\*Keluaran aktual\*\*/g)].map(m=>m[1].trim());
const cases=[...v4.rows.map(r=>({id:r.id,direction:r.direction,source:r.source,baseline:{text:r.text,outcome:r.outcome},kind:'known-v4-regression'})),...old.rows.map(r=>({id:r.id,direction:r.direction,source:r.source,baseline:{text:r.text,outcome:r.outcome},kind:'known-historical-regression'})),...longSources.map((source,i)=>({id:'LONG-PROSE-'+String(i+1).padStart(2,'0'),direction:'id-en',source,kind:'known-long-output-regression'}))];
await fs.writeFile(path.join(out,'REGRESSION_CORPUS.json'),JSON.stringify({method:'Known cases now used for development; not blind acceptance. No corpus-ID-specific product paths.',cases},null,2)+'\n');
const report={sourceBinding:build,method:'Actual ONNX/WASM through adapter in NodeWorker; no browser or independent human approval claimed',humanApprovals:0,started:new Date().toISOString(),rows:[]};
const tr=new Translator();try{for(const direction of ['en-id','id-en']){await tr.prepare(direction);for(const c of cases.filter(c=>c.direction===direction)){const start=performance.now();const result=await tr.translate(c.source);report.rows.push({...c,...result,ms:Math.round(performance.now()-start)});console.log(c.id,result.outcome,result.text);await fs.writeFile(path.join(out,'REGRESSION_INFERENCE.json'),JSON.stringify(report,null,2)+'\n');}}}finally{await tr.dispose();await cleanupBridge();}
report.completed=new Date().toISOString();report.counts=Object.fromEntries(['translated','rejected','failed','preserved'].map(status=>[status,report.rows.filter(r=>r.outcome===status).length]));await fs.writeFile(path.join(out,'REGRESSION_INFERENCE.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.counts));
