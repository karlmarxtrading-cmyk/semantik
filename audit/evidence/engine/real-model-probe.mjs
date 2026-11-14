import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker as NodeWorker } from 'node:worker_threads';
import { createHash } from 'node:crypto';

const out = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(out, '../../source');
const release = path.join(site, 'r/7a8e787a497535f5');
const { Translator, auditTranslation, semanticWarnings, detectLanguage } = await import(pathToFileURL(path.join(release,'app/translation.js')));
let bundle = await fs.readFile(path.join(release,'assets/engine.worker-4c3dcfee.js'),'utf8');
const originalSha256 = createHash('sha256').update(bundle).digest('hex');
const replacements = [
  ['N.wasm.wasmPaths=`/r/7a8e787a497535f5/runtime/`', 'N.wasm.wasmPaths='+JSON.stringify(pathToFileURL(path.join(release,'runtime')+'/').href)],
  ['t.exports={}})),kn=', 't.exports={createRequire:__createRequire}})),kn='],
  ['error:String(e),', 'error:String(e.stack||e),']
];
for (const [from,to] of replacements) {
  if (!bundle.includes(from)) throw Error('Bridge expected fragment missing: '+from);
  bundle=bundle.replace(from,to);
}
const prelude=`
import fs from 'node:fs/promises';
import path from 'node:path';
import {parentPort} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {createRequire as __createRequire} from 'node:module';
globalThis.self=globalThis;
globalThis.location={href:'https://local.invalid/r/7a8e787a497535f5/assets/engine.worker-4c3dcfee.js',origin:'https://local.invalid'};
const stores=new Map();
globalThis.caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);const key=r=>typeof r==='string'?r:r.url;return {async match(r){return store.get(key(r))?.clone()},async put(r,v){store.set(key(r),v.clone())},async delete(r){return store.delete(key(r))},async keys(){return [...store.keys()].map(k=>new Request(k))}}}};
globalThis.fetch=async (input)=>{const raw=typeof input==='string'?input:input.url;const u=new URL(raw,'https://local.invalid/');if(!['https://local.invalid','null'].includes(u.origin))throw Error('Nonlocal fetch blocked: '+u.origin);const target=u.protocol==='file:'?fileURLToPath(u):path.join(${JSON.stringify(site)},decodeURIComponent(u.pathname));const bytes=await fs.readFile(target);return new Response(bytes,{status:200,headers:{'Content-Type':target.endsWith('.wasm')?'application/wasm':'application/octet-stream'}});};
globalThis.postMessage=data=>parentPort.postMessage(data);
`;
const workerFile = path.join(out,'worker-bridge.generated.mjs');
await fs.writeFile(workerFile, prelude+bundle+'\nparentPort.on("message",data=>self.onmessage({data}));\n');
class BrowserWorkerBridge {
  constructor(){this.worker=new NodeWorker(pathToFileURL(workerFile));this.worker.on('message',data=>this.onmessage?.({data}));this.worker.on('error',error=>this.onerror?.({message:error.stack||String(error)}));}
  postMessage(data){this.worker.postMessage(data)}
  terminate(){return this.worker.terminate()}
}
globalThis.Worker=BrowserWorkerBridge;

const baseCases=[
 ['en-id','cp17-capital-heading','CLIMATE CHANGE'],
 ['en-id','cp17-empty-set','No real number satisfies the inequality. Solution set: ∅'],
 ['en-id','cp17-italic-formula','|𝑥−4| < 1'],
 ['en-id','cp17-id','ID: absolute-value-inequalities~challenge~07'],
 ['en-id','capital-new-heading','ELASTIC NET REGULARIZATION'],
 ['en-id','causal-restraint','The intervention was associated with lower mortality, but this observational study does not establish causality.'],
 ['en-id','noninferiority','The trial failed to demonstrate non-inferiority.'],
 ['en-id','evidence-absence','Absence of evidence is not evidence of absence.'],
 ['en-id','confidence-margin','The upper confidence limit exceeded the non-inferiority margin.'],
 ['en-id','adjustment','After adjustment for age and sex, the association was no longer statistically significant.'],
 ['en-id','micromolar-nanomolar','Bacterial growth was inhibited at 10 μM, whereas no inhibition was observed at 10 nM.'],
 ['en-id','entity-values','Treatment A reduced mortality by 10%, whereas treatment B increased mortality by 20%.'],
 ['en-id','relative-risk','The risk was twice as high in smokers as in nonsmokers.'],
 ['en-id','confounding','We could not rule out residual confounding.'],
 ['en-id','functional-notation','Given f(x)=x², the derivative is f′(x)=2x.'],
 ['en-id','taxon-without-cue','Escherichia coli was cultured under anaerobic conditions.'],
 ['en-id','formula-prose','For all x ∈ ℝ, if x > 0 then f(x) = ln(x).'],
 ['en-id','scientific-abstract','We investigated whether exposure to fine particulate matter was associated with hospital admission. The analysis included 240 participants followed for 12 months. Although the adjusted risk ratio was 1.20, the confidence interval included the null value. These findings do not establish a causal relationship and should be interpreted cautiously.'],
 ['id-en','cp17-regression','Regresi linear mengestimasi ukuran efek.'],
 ['id-en','cp17-heading','KAJIAN PUSTAKA'],
 ['id-en','causal-restraint','Intervensi ini berhubungan dengan mortalitas yang lebih rendah, tetapi penelitian observasional ini tidak membuktikan hubungan sebab akibat.'],
 ['id-en','noninferiority','Uji klinis ini gagal menunjukkan noninferioritas.'],
 ['id-en','evidence-absence','Tidak adanya bukti bukanlah bukti ketiadaan.'],
 ['id-en','adjustment','Setelah disesuaikan untuk usia dan jenis kelamin, hubungan tersebut tidak lagi signifikan secara statistik.'],
 ['id-en','entity-values','Perlakuan A menurunkan mortalitas sebesar 10%, sedangkan perlakuan B meningkatkan mortalitas sebesar 20%.'],
 ['id-en','confounding','Kami tidak dapat menyingkirkan kemungkinan perancuan residual.'],
 ['id-en','mathematical-prose','Himpunan penyelesaian pertidaksamaan tersebut adalah ∅. Tidak ada bilangan riil yang memenuhi kedua syarat.'],
 ['id-en','scientific-abstract','Penelitian ini menilai hubungan antara paparan partikulat halus dan rawat inap. Analisis mencakup 240 peserta yang diikuti selama 12 bulan. Meskipun rasio risiko yang disesuaikan adalah 1.20, interval kepercayaan mencakup nilai nol. Temuan ini tidak membuktikan hubungan sebab akibat dan harus ditafsirkan secara hati-hati.']
];
const notationCases=[
 ['en-id','ascii-apostrophe',"Given f(x)=x², the derivative is f'(x)=2x."],
 ['en-id','unicode-prime-spaced','Given f(x)=x², the derivative is f′(x) = 2x.'],
 ['en-id','unicode-prime-math-italic','Given 𝑓(𝑥)=𝑥², the derivative is 𝑓′(𝑥)=2𝑥.'],
 ['en-id','unicode-prime-latex-delimited','Given $f(x)=x²$, the derivative is $f′(x)=2x$.'],
 ['en-id','plain-function-control','The function f(x)=2x is linear.'],
 ['en-id','double-prime','The second derivative is f″(x)=2.']
];
const notation = process.argv.includes('--notation');
const cases=notation?notationCases:baseCases;
const resultName=notation?'notation-model-results.json':'real-model-results.json';
const report={mode:'Actual bundled ONNX inference through browser-worker Node transport bridge; no browser lifecycle or PDF extraction claim.',originalWorkerSha256:originalSha256,bridgeOnlyChanges:replacements.map(x=>x[0]),cases:[]};
const translator = new Translator();
try {
 for(const direction of [...new Set(cases.map(c=>c[0]))]){
  const start=performance.now();const engine=await translator.prepare(direction);console.log('PREPARED',direction,Math.round(performance.now()-start),'ms');
  report[direction]={engine,prepareMs:performance.now()-start};
  for(const [dir,id,source] of cases.filter(c=>c[0]===direction)){
   const t=performance.now();const result=await translator.translate(source);const row={direction:dir,id,source,result,elapsedMs:performance.now()-t};report.cases.push(row);console.log(JSON.stringify(row));
   await fs.writeFile(path.join(out,resultName),JSON.stringify(report,null,2));
  }
 }
} finally {await translator.dispose();await fs.rm(workerFile,{force:true});}
