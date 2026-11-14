import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const source=await fs.readFile(new URL('../app/assets/engine.worker-4c3dcfee.js',import.meta.url),'utf8');
const baseline=await fs.readFile(new URL('../baseline/assets/engine.worker-4c3dcfee.js',import.meta.url),'utf8');
function scanner(s){const context=vm.createContext({Intl});vm.runInContext(s.slice(s.indexOf('function d(e)'),s.indexOf('function m(e)'))+';globalThis.protect=f;globalThis.check=p;',context);return context;}
const before=scanner(baseline),after=scanner(source),checks=[];
function test(name,fn){try{fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:String(e.stack)});}}
for(const text of ['A <ssterm0/> was prepared.','a <sslit0/> was prepared.','<sslit0/> a result'])test('marker is not comparison: '+text,()=>{assert.equal(after.protect(text).filter(s=>s.kind==='variable').length,0);});
for(const [source,target] of [['x<y','x<z'],['x < y','z < y'],['A < B','A > B'],['x = 1','y = 1'],['x > 1','x < 1'],['|x|','|y|']])test('real mutation retained: '+source,()=>assert.ok(after.check(source,target).length));
for(const s of ['x<y','x < y','A < B','x = 1','x > 1','|x|'])test('unchanged math '+s,()=>assert.equal(after.check(s,s).length,0));
const report={testedAt:new Date().toISOString(),method:'Exact extracted worker functions; synthetic validator mutations, not model inference',engineSha256:createHash('sha256').update(source).digest('hex'),beforeArtificialVariables:before.protect('A <ssterm0/> was prepared.').filter(s=>s.kind==='variable'),afterArtificialVariables:after.protect('A <ssterm0/> was prepared.').filter(s=>s.kind==='variable'),checks,pass:checks.every(c=>c.pass)};
await fs.writeFile(new URL('../evidence/translation/engine-literals.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
