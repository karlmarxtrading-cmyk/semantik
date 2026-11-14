import {Translator,auditTranslation,detectLanguage,splitForTranslation} from '../app/translation.js';
const status=document.querySelector('#status'),results=document.querySelector('#results'),summary=document.querySelector('#summary');
const report={kind:'real-browser-inference',suiteVersion:'academic-phrases-v2',startedAt:new Date().toISOString(),userAgent:navigator.userAgent,checks:[],samples:[],errors:[]};
function record(name,pass,detail){report.checks.push({name,pass,detail});const article=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('pre');h.textContent=`${pass?'PASS':'FAIL'} — ${name}`;p.textContent=typeof detail==='string'?detail:JSON.stringify(detail,null,2);article.append(h,p);results.append(article);}
function assert(name,value,detail){record(name,!!value,detail);}
function update(s){status.textContent=s;}
let engine;
try{
 engine=new Translator();
 await new Promise(r=>setTimeout(r,200));
 const early=performance.getEntriesByType('resource').filter(e=>/\/models\/|\/runtime\/|engine\.worker/.test(e.name));
 assert('Lazy import and constructor',engine.worker===null&&early.length===0,{workerCreated:!!engine.worker,earlyHeavyRequests:early.map(x=>x.name)});
 for(const direction of ['en-id','id-en']){
  update(`Memasang model ${direction}…`);
  const info=await engine.prepare(direction,{onProgress:p=>{if(p.total)update(`Model ${direction}: ${Math.round(p.done/p.total*100)}% — ${p.label||''}`);}});
  record(`Prepare ${direction}`,true,info);
  const samples=direction==='en-id'?[
   {text:'This study investigates the relationship between economic growth and education.'},
   {text:'The study included 120 participants. The result was significant (p < 0.05).'},
   {text:'The temperature was 37 °C and the dose was 10 mg. Smith et al. (2024) reported no improvement.'},
   {text:'The results are described in https://example.org/paper and DOI:10.1234/science.2024.01.'},
   {text:'Machine learning improves the prediction of academic performance.',glossary:[{source:'machine learning',target:'pembelajaran mesin'}]},
   {text:'Abstract'},
   {text:'The sample mean was 12.5.',expected:['rata-rata sampel']},
   {text:'The SAMPLE MEAN was 12.5.',expected:['rata-rata sampel']},
   {text:'The standard deviation was 2.5 and the standard error was 0.5.',expected:['simpangan baku','galat baku']},
   {text:'The sample size was 120 and the confidence interval was 10.2 to 14.8.',expected:['ukuran sampel','interval kepercayaan']},
   {text:'The null hypothesis was rejected. The result was statistically significant.',expected:['hipotesis nol','signifikan secara statistik']},
   {text:'Linear regression estimated the effect size.',expected:['regresi linear','ukuran efek']},
   {text:'The sample mean was 12.5.',glossary:[{source:'sample mean',target:'rerata sampel'}],expected:['rerata sampel'],forbidden:['rata-rata sampel']}
  ]:[
   {text:'Penelitian ini menganalisis hubungan antara pertumbuhan ekonomi dan pendidikan.'},
   {text:'Penelitian ini melibatkan 120 peserta. Hasil penelitian menunjukkan perbedaan signifikan.'},
   {text:'Suhu sampel adalah 37 °C dan dosisnya 10 mg.'},
   {text:'Pembelajaran mesin meningkatkan prediksi kinerja akademik.',glossary:[{source:'Pembelajaran mesin',target:'Machine learning'}]},
   {text:'Abstrak'},
   {text:'Rata-rata sampel adalah 12.5.',expected:['sample mean']},
   {text:'Simpangan baku adalah 2.5 dan galat baku adalah 0.5.',expected:['standard deviation','standard error']},
   {text:'Ukuran sampel adalah 120 dan interval kepercayaan adalah 10.2 hingga 14.8.',expected:['sample size','confidence interval']},
   {text:'Hipotesis nol ditolak. Hasilnya signifikan secara statistik.',expected:['null hypothesis','statistically significant']},
   {text:'Regresi linear mengestimasi ukuran efek.',expected:['linear regression','effect size'],checkEstimationVerb:true},
   {text:'Rata-rata sampel adalah 12.5.',glossary:[{source:'rata-rata sampel',target:'empirical mean'}],expected:['empirical mean'],forbidden:['sample mean']}
  ];
  for(let i=0;i<samples.length;i++){
   const {text,glossary,expected,forbidden,checkEstimationVerb}=samples[i];update(`Inferensi ${direction}, sampel ${i+1}/${samples.length}…`);
   const start=performance.now();const result=await engine.translate(text,{glossary});
   const item={direction,source:text,target:result.text,status:result.status,issues:result.issues,sourcePreserved:!!result.sourcePreserved,semanticVerified:result.semanticVerified,ms:Math.round(performance.now()-start)};
   report.samples.push(item);
   const valid=!result.sourcePreserved&&result.text.trim()!==text.trim()&&auditTranslation(text,result.text).length===0;
   assert(`Inference ${direction} ${i+1}`,valid,item);
   if(glossary)assert(`Glossary ${direction}`,result.text.toLowerCase().includes(glossary[0].target.toLowerCase()),item);
   if(expected)assert(`Academic phrases ${direction} ${i+1}`,expected.every(term=>result.text.toLowerCase().includes(term))&&!(forbidden||[]).some(term=>result.text.toLowerCase().includes(term)),{...item,expected,forbidden});
   if(checkEstimationVerb)assert('Known estimation-verb mismatch requires review',!/\bcustomiz(?:e|es|ed|ing)\b/i.test(result.text)||(result.status==='review'&&result.issues.some(x=>x.includes('verba estimasi'))),item);
  }
 }
 assert('Altered number is rejected by audit',auditTranslation('n=120','n=121').length>0);
 const long='The results show that '+('education and economic growth are related, '.repeat(40))+'with p < 0.05 and DOI:10.1234/abc.';
 assert('Segmentation is lossless',splitForTranslation(long).join('')===long);
 assert('Language detection',detectLanguage('The study examines the effect of education on the economy.')==='en'&&detectLanguage('Penelitian ini menjelaskan hubungan antara pendidikan dan pertumbuhan ekonomi.')==='id');
 const controller=new AbortController();const pending=engine.translate('This study investigates the relationship between economic growth and education.',{signal:controller.signal});controller.abort();let aborted=false;try{await pending;}catch(e){aborted=e.name==='AbortError';}
 assert('In-flight cancel terminates worker',aborted&&engine.worker===null);
 update('Memeriksa model cache tanpa akses jaringan model…');
 const cachedWorker=new Worker(new URL('./engine-offline.worker.js',import.meta.url),{type:'module'});
 const waits=new Map();let n=0;
 const ready=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Timeout offline worker')),30000);
  cachedWorker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};
  cachedWorker.onmessage=({data})=>{
   if(data.ready){clearTimeout(timer);resolve();return;}
   const p=waits.get(data.id);if(!p)return;
   if(data.error){waits.delete(data.id);p.reject(Error(data.error));}else if(data.result!==undefined){waits.delete(data.id);p.resolve(data.result);}
  };
 });
 const send=(action,payload)=>new Promise((resolve,reject)=>{const id=++n;waits.set(id,{resolve,reject});cachedWorker.postMessage({id,action,payload});});
 try{
  await ready;
  for(const direction of ['en-id','id-en']){await send('prepare',direction);const text=direction==='en-id'?'This study included 120 participants.':'Penelitian ini melibatkan 120 peserta.';const r=await send('translate',{direction,sourceText:text});assert(`Cached model inference ${direction} with model network blocked`,r.finishReason==='complete'&&r.targetText!==text&&auditTranslation(text,r.targetText).length===0,{source:text,target:r.targetText,note:'Model download blocked; full shell/runtime offline tested separately.'});}
 }finally{cachedWorker.terminate();}
}catch(error){report.errors.push({name:error.name,message:error.message,stack:error.stack});record('Harness execution',false,error.stack||error.message);}finally{await engine?.dispose();}
report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;report.complete=true;
summary.textContent=JSON.stringify({complete:true,passed:report.passed,failed:report.failed,errors:report.errors},null,2);
update(`Selesai: ${report.passed} PASS, ${report.failed} FAIL`);document.body.dataset.result=report.failed?'fail':'pass';
try{const res=await fetch('/__test-report/engine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!res.ok)throw Error(`HTTP ${res.status}`);summary.textContent+='\nLaporan tersimpan.';}catch(error){summary.textContent+=`\nLaporan belum tersimpan: ${error.message}`;const pre=document.createElement('pre');pre.textContent=JSON.stringify(report,null,2);results.append(pre);}
