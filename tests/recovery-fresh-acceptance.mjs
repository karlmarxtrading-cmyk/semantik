// New acceptance corpus is authored only after a recorded product freeze.
// References are retained for review; they are never passed to the translator.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {repo,root,build,Translator,cleanupBridge} from './cp20-semantic-runtime.mjs';
const folder=path.join(repo,'evidence/recovery/acceptance');
const freeze=JSON.parse(await fs.readFile(path.join(folder,'FREEZE.json')));
const corpus=JSON.parse(await fs.readFile(path.join(folder,'CORPUS.json')));
for(const [p,h] of Object.entries(freeze.files)){const actual=createHash('sha256').update(await fs.readFile(path.join(repo,p))).digest('hex');if(actual!==h)throw Error('Product changed after recovery freeze: '+p);}
if(corpus.freezeSourceHash!==freeze.build.sourceHash)throw Error('Corpus/freeze identity mismatch');
const report={status:'RUNNING',freeze,corpusMethod:corpus.method,sourceBinding:build,executionRoot:root,humanApprovals:0,method:'Actual local ONNX/WASM through Node Worker bridge, using final deploy namespace. Not browser proof or human adjudication.',rows:[]};
const tr=new Translator();const started=performance.now();
try{
 for(const direction of ['en-id','id-en']){
  const prep=performance.now();const engine=await tr.prepare(direction);report[direction+'PreparationMs']=performance.now()-prep;
  for(const row of corpus.cases.filter(x=>x.direction===direction)){
   const before=performance.now(),result=await tr.translate(row.source);
   report.rows.push({...row,...result,ms:performance.now()-before,actualEngine:engine});
   await fs.writeFile(path.join(folder,'INFERENCE.json'),JSON.stringify(report,null,2)+'\n');
   console.log(row.id,result.outcome,Math.round(report.rows.at(-1).ms)+'ms');
  }
 }
 report.status='COMPLETED_EXECUTION_NOT_SEMANTIC_APPROVAL';report.totalMs=performance.now()-started;
 report.counts={cases:report.rows.length,translated:report.rows.filter(x=>x.outcome==='translated').length,rejected:report.rows.filter(x=>x.outcome==='rejected').length,failed:report.rows.filter(x=>x.outcome==='failed').length,inferenceCalls:report.rows.reduce((n,x)=>n+(x.metrics?.inferenceCalls||0),0),cacheHits:report.rows.reduce((n,x)=>n+(x.metrics?.cacheHits||0),0)};
 await fs.writeFile(path.join(folder,'INFERENCE.json'),JSON.stringify(report,null,2)+'\n');
}finally{await tr.dispose();await cleanupBridge();}
console.log(JSON.stringify(report.counts));
