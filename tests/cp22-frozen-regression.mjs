import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {repo,root,build,Translator,cleanupBridge} from './cp20-semantic-runtime.mjs';
const dir=path.join(repo,'evidence/cp22/acceptance-freeze2'),kind=process.argv[2]||'NEW';
const freeze=JSON.parse(await fs.readFile(path.join(dir,'FREEZE.json'))),corpus=JSON.parse(await fs.readFile(path.join(dir,kind+'_CORPUS.json')));
for(const [p,h] of Object.entries(freeze.files))if(createHash('sha256').update(await fs.readFile(path.join(repo,p))).digest('hex')!==h)throw Error('Changed after freeze: '+p);
if(corpus.freezeSourceHash!==freeze.build.sourceHash)throw Error('Corpus/freeze mismatch');
const report={status:'RUNNING',freeze,corpusMethod:corpus.method,build,root,method:'Actual local ONNX/WASM final deploy bytes in Node worker bridge; not browser or human semantic proof',rows:[]};const tr=new Translator(),start=performance.now();
try{for(const direction of ['en-id','id-en']){const engine=await tr.prepare(direction);for(const row of corpus.cases.filter(x=>x.direction===direction)){
 const t=performance.now(),result=await tr.translate(row.source);report.rows.push({...row,...result,ms:performance.now()-t,actualEngine:engine});await fs.writeFile(path.join(dir,kind+'_INFERENCE.json'),JSON.stringify(report,null,2)+'\n');console.log(row.id,result.outcome,Math.round(performance.now()-t));
}}report.status='COMPLETED_EXECUTION_NOT_SEMANTIC_APPROVAL';report.totalMs=performance.now()-start;report.counts={cases:report.rows.length,translated:report.rows.filter(x=>x.outcome==='translated').length,rejected:report.rows.filter(x=>x.outcome==='rejected').length,failed:report.rows.filter(x=>x.outcome==='failed').length,inferenceCalls:report.rows.reduce((n,x)=>n+(x.metrics?.inferenceCalls||0),0),cacheHits:report.rows.reduce((n,x)=>n+(x.metrics?.cacheHits||0),0)};await fs.writeFile(path.join(dir,kind+'_INFERENCE.json'),JSON.stringify(report,null,2)+'\n');console.log(report.counts);
}finally{await tr.dispose();await cleanupBridge();}
