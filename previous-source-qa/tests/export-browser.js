import {createMarkdown,createQaReport,createLedger,createZip,markdownText} from '../app/export.js';
import {validatePdf} from '../app/pdf-reader.js';
const status=document.querySelector('#status'),results=document.querySelector('#results'),summary=document.querySelector('#summary');
const report={kind:'real-browser-export',startedAt:new Date().toISOString(),userAgent:navigator.userAgent,checks:[],errors:[]};
const record=(name,pass,detail)=>{report.checks.push({name,pass:!!pass,detail});const article=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('pre');h.textContent=`${pass?'PASS':'FAIL'} — ${name}`;p.textContent=typeof detail==='string'?detail:JSON.stringify(detail,null,2);article.append(h,p);results.append(article);};
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
const reject=async(name,fn)=>{let error;try{await fn();}catch(e){error=e;}record(name,!!error,error?.message||'Unexpected success');};
function canvasBlob(){const c=document.createElement('canvas');c.width=240;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#123c35';ctx.font='20px sans-serif';ctx.fillText('E = mc²   n = 120',10,55);return new Promise(resolve=>c.toBlob(resolve,'image/png'));}
function cloneJob(job){return {...job,document:{...job.document,pages:job.document.pages.map(x=>({...x})),blocks:job.document.blocks.map(x=>({...x})),assets:job.document.assets.map(x=>({...x}))}};}
try{
 record('ZIP library remains lazy before export',typeof globalThis.JSZip==='undefined'&&!performance.getEntriesByType('resource').some(r=>r.name.includes('/vendor/export/')),performance.getEntriesByType('resource').map(x=>x.name));
 const pdfBytes=await (await fetch('/tests/fixtures/digital-en.pdf')).arrayBuffer();
 const file=new File([pdfBytes],'../../journal<script>alert(1)</script>.pdf',{type:'application/pdf'}),image=await canvasBlob();
 const block=(id,type,text,extra={})=>({id,page:1,type,text,source:'digital',bbox:[10,20,230,80],sourceItemIds:[id],issues:[],...extra});
 const formula='E = mc^2\n\\alpha_i = 0.05\n```\ncode fence inside source';
 const table='Group | n | Mean\nControl | 120 | 5.4';
 const job={status:'complete',file,config:{source:'en',target:'id'},document:{fileName:file.name,numPages:1,sourceLanguage:'en',targetLanguage:'id',metadata:{title:'<img src=x onerror="alert(1)"> [link](javascript:alert(1))',author:'Smith & Jones'},sourceItemCount:9,coveredItemCount:9,warnings:['Synthetic fixture only'],pages:[{number:1,source:'digital',imagePath:'assets/page-0001.png'}],assets:[{path:'assets/page-0001.png',blob:image},{path:'assets/formula.png',blob:image},{path:'assets/table.png',blob:image},{path:'assets/figure.png',blob:image}],blocks:[
  block('p1b1','heading','Source heading',{target:'Judul terjemahan',status:'translated'}),
  block('p1b2','paragraph','Originalsentinel with 120 participants.',{target:'Translationsentinel dengan 120 peserta.',status:'translated'}),
  block('p1b3','formula',formula,{target:formula,status:'preserved',assetPath:'assets/formula.png'}),
  block('p1b4','table',table,{target:table,status:'preserved',assetPath:'assets/table.png'}),
  block('p1b5','image','',{target:'',status:'preserved',assetPath:'assets/figure.png'}),
  block('p1b6','reference','Smith (2024). DOI:10.1234/test.2024',{target:'Smith (2024). DOI:10.1234/test.2024',status:'preserved'}),
  block('p1b7','paragraph','<script>window.__exportUnsafe=1</script> [link](javascript:alert(1))',{target:'<script>window.__exportUnsafe=1</script> [tautan](javascript:alert(1))',status:'review',issues:['<img onerror=alert(1)>']}),
  block('p1b8','paragraph','Unfinishedsentinel kept in source.'),
  block('p1b9','paragraph','Emptytargetsentinel kept in source.',{target:'',status:'translated'})
 ]}};
 const source=createMarkdown(job,'source'),translation=createMarkdown(job,'translation'),bilingual=createMarkdown(job,'bilingual');
 record('Source export excludes translated content',source.includes('Originalsentinel')&&!source.includes('Translationsentinel'));
 record('Translation export excludes translated block source',translation.includes('Translationsentinel')&&!translation.includes('Originalsentinel'));
 record('Bilingual export contains explicit source and target',bilingual.includes('**Sumber**')&&bilingual.includes('**Terjemahan / hasil**')&&bilingual.includes('Originalsentinel')&&bilingual.includes('Translationsentinel'));
 record('Incomplete job cannot be labeled complete',translation.includes('HASIL SEMENTARA')&&!translation.includes('**Status:** Pemrosesan selesai'));
 record('Missing target is labeled and retained',translation.includes('BELUM DITERJEMAHKAN')&&translation.includes('Unfinishedsentinel'));
 record('Empty target is labeled and source retained',translation.includes('Emptytargetsentinel')&&translation.match(/BELUM DITERJEMAHKAN/g).length===2);
 record('Formula and table bytes remain literal',translation.includes(formula)&&translation.includes(table)&&translation.includes('````text'));
 record('Single Markdown gives visual-asset fallback notice',translation.includes('Representasi visual rumus tersedia')&&translation.includes('Elemen visual sumber pada halaman'));
 const inline=markdownText('Notation $\\alpha_i^2$ and \\(x_i < 5\\).');
 record('Inline notation preserves backslash and underscore',inline.includes('` $\\alpha_i^2$ `')&&inline.includes('` \\(x_i < 5\\) `'),inline);
 const display='$$\n\\alpha_i^2 = \\frac{1}{2}\n$$';record('Multiline display notation remains literal',markdownText('Equation '+display).includes(display)&&markdownText(display).includes('```text'));
 record('Raw HTML is escaped in prose and metadata',!source.includes('<script>')&&!source.includes('<img ')&&source.includes('&lt;script&gt;')&&source.includes('&lt;img '));
 record('Markdown links cannot become active injected links',source.includes('\\[link\\]\\(javascript:')&&!source.includes('[link](javascript:'));
 record('No injected script runs',typeof window.__exportUnsafe==='undefined');
 const qa=createQaReport(job);
 record('QA explicitly disclaims semantic verification',qa.includes('TIDAK DILAKUKAN OLEH APLIKASI')&&qa.includes('tidak membuktikan semua makna ilmiah benar'));
 record('QA counts empty and missing targets as unfinished',qa.includes('Bagian diproses: 7.')&&(qa.match(/Bagian ini belum diterjemahkan/g)||[]).length===2);
 const corrected=cloneJob(job);const cb=corrected.document.blocks[1];cb.originalText=cb.text;cb.text='Correctedsourcesentinel with 120 participants.';cb.target='Correctedtargetsentinel dengan 120 peserta.';cb.sourceEditedAt='2026-11-12T00:00:00.000Z';
 const originalMd=createMarkdown(corrected,'source'),correctedBi=createMarkdown(corrected,'bilingual'),correctedQa=createQaReport(corrected),correctedLedger=createLedger(corrected);
 record('Original Markdown preserves immutable OCR extraction',originalMd.includes('Originalsentinel')&&!originalMd.includes('Correctedsourcesentinel')&&!originalMd.includes('Correctedtargetsentinel'));
 record('Original Markdown records that source correction exists',originalMd.includes('mempertahankan ekstraksi asli')&&originalMd.includes(cb.sourceEditedAt));
 record('Bilingual separates original, corrected source, and target',correctedBi.includes('Originalsentinel')&&correctedBi.includes('Correctedsourcesentinel')&&correctedBi.includes('Correctedtargetsentinel')&&correctedBi.includes('Ekstraksi asli sebelum koreksi')&&correctedBi.includes('Sumber setelah koreksi pengguna'));
 record('QA and ledger retain source correction timestamp',correctedQa.includes('koreksi sumber oleh pengguna: 1')&&correctedQa.includes(cb.sourceEditedAt)&&correctedLedger.includes('waktu_koreksi_sumber')&&correctedLedger.includes(cb.sourceEditedAt));
 const correctedFormula=cloneJob(job);const fb=correctedFormula.document.blocks[2];fb.originalText=fb.text;fb.text='E = mc^2\n\\alpha_i = 0.005';fb.target=fb.text;fb.sourceEditedAt=cb.sourceEditedAt;
 const formulaBi=createMarkdown(correctedFormula,'bilingual',{withAssets:true});record('Corrected formula text is distinct from original PDF image',formulaBi.includes('Teks sumber dikoreksi pengguna; citra tetap berasal dari PDF asli')&&formulaBi.includes('Rumus pada PDF asli')&&formulaBi.includes(formula)&&formulaBi.includes(fb.text));
 const csvJob=cloneJob(job);const dangerous=['=1+1','+SUM(A1)','-1+2','@SUM(A1)','  =1+1','\t=1+1','\r=1+1','\n=1+1'];csvJob.document.blocks=dangerous.map((id,i)=>block(id,'paragraph','Safe',{target:'Aman',status:'translated'}));
 const csv=createLedger(csvJob);record('CSV formula prefixes including whitespace are neutralized',dangerous.every(x=>csv.includes('"\''+x+'"')),csv);
 status.textContent='Menyusun dan membuka ZIP nyata…';const progress=[];const archive=await createZip(job,x=>progress.push(x));
 const bytes=new Uint8Array(await archive.arrayBuffer());record('ZIP has PK signature',bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4,{bytes:bytes.length,type:archive.type});
 record('ZIP progress reaches 100%',progress.at(-1)===100,{last:progress.at(-1)});
 const zip=await globalThis.JSZip.loadAsync(bytes,{checkCRC32:true});const files=Object.keys(zip.files).filter(p=>!zip.files[p].dir).sort();
 const expected=['JURNAL_ASLI.md','JURNAL_TERJEMAHAN.md','JURNAL_BILINGUAL.md','LAPORAN_QA.md','LEDGER_BAGIAN.csv','JURNAL_SUMBER.pdf','SHA256SUMS.txt','BACA_DULU.txt','assets/page-0001.png','assets/formula.png','assets/table.png','assets/figure.png'].sort();
 record('ZIP file tree is exact',JSON.stringify(files)===JSON.stringify(expected),files);
 const original=await zip.file('JURNAL_SUMBER.pdf').async('uint8array');record('Original PDF bytes and SHA-256 are identical',await digest(original)===await digest(pdfBytes),{expected:await digest(pdfBytes),actual:await digest(original)});
 const hashes=await zip.file('SHA256SUMS.txt').async('string');let hashValid=true;const hashResults=[];
 for(const line of hashes.trim().split('\n')){const [expectedHash,name]=line.split('  ');const actual=await digest(await zip.file(name).async('uint8array'));const valid=expectedHash===actual;hashValid&&=valid;hashResults.push({name,valid});}
 record('All main document and asset hashes verify',hashValid&&hashResults.length===10,hashResults);
 const zipTranslation=await zip.file('JURNAL_TERJEMAHAN.md').async('string');const links=[...zipTranslation.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map(m=>m[1]);record('All Markdown image links resolve in ZIP',links.length>=4&&links.every(p=>zip.file(p)),links);
 const zippedCsv=await zip.file('LEDGER_BAGIAN.csv').async('uint8array');record('CSV UTF-8 BOM is present',zippedCsv[0]===239&&zippedCsv[1]===187&&zippedCsv[2]===191);
 record('ZIP filename never uses hostile source filename',!files.some(p=>p.includes('..')||p.includes('<')||p.includes('script')));
 const readme=await zip.file('BACA_DULU.txt').async('string');record('Export package does not promise JSON/ZIP reimport',readme.includes('hanya menerima PDF')&&readme.includes('tidak dapat diimpor kembali'));
 for(const attack of ['../outside.png','assets/../outside.png','assets/..','/assets/a.png','assets/a.html','assets/%2e%2e.png','assets/a\\b.png']){const bad=cloneJob(job);bad.document.assets.push({path:attack,blob:image});await reject(`Reject asset path ${attack}`,()=>createZip(bad));}
 const duplicate=cloneJob(job);duplicate.document.assets.push({...duplicate.document.assets[0]});await reject('Reject duplicate asset paths',()=>createZip(duplicate));
 const missing=cloneJob(job);missing.document.assets=missing.document.assets.filter(x=>x.path!=='assets/formula.png');await reject('Reject missing referenced visual asset',()=>createZip(missing));
 const noPdf=cloneJob(job);noPdf.file=null;await reject('Reject ZIP without original PDF',()=>createZip(noPdf));
 const jsonPdf=cloneJob(job);jsonPdf.file=new File(['{"text":"%PDF-1.7"}'],'fake.pdf',{type:'application/pdf'});await reject('Reject JSON pretending to be export source PDF',()=>createZip(jsonPdf));
 const badPage=cloneJob(job);badPage.document.blocks[0].page=2;await reject('Reject orphan block instead of dropping it',()=>createZip(badPage));
 await reject('Public PDF validator rejects JSON import',()=>validatePdf(new File(['{"text":"test"}'],'input.json',{type:'application/json'})));
 await reject('Public PDF validator rejects renamed JSON',()=>validatePdf(new File(['{"text":"test"}'],'input.pdf',{type:'application/pdf'})));
 record('Export contains no JSON user document',files.every(p=>!p.endsWith('.json')));
}catch(error){report.errors.push({name:error.name,message:error.message,stack:error.stack});record('Harness execution',false,error.stack||error.message);}
report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(x=>x.pass).length;report.failed=report.checks.filter(x=>!x.pass).length;report.complete=true;
summary.textContent=JSON.stringify({complete:true,passed:report.passed,failed:report.failed,errors:report.errors},null,2);status.textContent=`Selesai: ${report.passed} PASS, ${report.failed} FAIL`;document.body.dataset.result=report.failed?'fail':'pass';
try{const response=await fetch('/__test-report/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw Error(`HTTP ${response.status}`);summary.textContent+='\nLaporan tersimpan.';}catch(error){summary.textContent+=`\nLaporan belum tersimpan: ${error.message}`;const pre=document.createElement('pre');pre.textContent=JSON.stringify(report,null,2);results.append(pre);}
