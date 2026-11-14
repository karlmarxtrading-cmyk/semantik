// Reuse completed parser capacity evidence only when the exact tested modules
// are byte-identical in the packaged release. Does not re-label inference/hosting.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const repo=path.resolve(import.meta.dirname,'..'),manifest=JSON.parse(await fs.readFile(path.join(repo,'evidence/build/BUILD_MANIFEST.json'))),root=path.join(repo,'dist',manifest.build.base);
const rows=[];
for(const [name,rel,key] of [['capacity-parser','evidence/cp20/qa/capacity-parser-final/RESULTS.json','sourceAfter'],['input-byte-limit','evidence/cp20/qa/byte-limit.json','sourceHashes'],['references-real-parser','evidence/cp20/qa/reference-real-parser.json','sourceHashes']]){
 const report=JSON.parse(await fs.readFile(path.join(repo,rel))),expected=report[key],modules=[];
 for(const [file,sha256]of Object.entries(expected)){const actual=createHash('sha256').update(await fs.readFile(path.join(root,'app',file))).digest('hex');modules.push({file,testedSha256:sha256,packagedSha256:actual,pass:sha256===actual});}
 const originalPassed=name==='capacity-parser'?report.sourceStable&&report.rows.every(r=>r.status==='PASS'):name==='input-byte-limit'?report.status==='PASS':report.rows.every(r=>r.status==='PASS');
 rows.push({name,evidence:rel,status:originalPassed&&modules.every(x=>x.pass)?'PASS':'FAIL',originalPassed,modules});
}
const result={build:manifest.build,method:'Unchanged-module evidence reuse. All source bytes touched by each declared parser test must match the current packaged release. This is not a new browser, translation, storage, or semantic test.',rows};await fs.writeFile(path.join(repo,'evidence/cp20/qa/CAPACITY_FINAL_BUILD_BINDING.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(rows.some(r=>r.status==='FAIL'))process.exitCode=1;
