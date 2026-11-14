const runButton=document.getElementById('run'),status=document.getElementById('status'),output=document.getElementById('results');
let running=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function assert(condition,message){if(!condition)throw new Error(message);}
async function waitFor(check,{timeout=20000,label='condition'}={}){
  const end=performance.now()+timeout;
  while(performance.now()<end){const result=await check();if(result)return result;await pause(100);}
  throw new Error('Timed out waiting for '+label);
}
runButton.addEventListener('click',()=>{
  if(running)return;
  const app=window.open('','semantik-ui-qa','popup,width=1280,height=940');
  if(!app){status.textContent='BLOCKED: allow the application popup, then run again.';return;}
  const previousDocument=app.document;app.location.href='/?qa-ui='+Date.now();
  running=true;runButton.disabled=true;run(app,previousDocument);
});
async function run(app,initialDocument){
  const results=[],errors=[],downloads=[];const started=new Date().toISOString();
  let doc,selectedName='digital-en.pdf';
  const $=id=>doc.getElementById(id);
  async function report(final=false){
    const passed=results.filter(r=>r.pass).length;
    const data={status:final?(errors.length||passed!==results.length?'FAIL':'PASS'):'RUNNING',
      started,completed:final?new Date().toISOString():null,userAgent:navigator.userAgent,passed,total:results.length,results,errors,
      downloads:downloads.map(d=>({filename:d.filename,bytes:d.blob?.size,type:d.blob?.type,error:d.error}))};
    output.textContent=JSON.stringify(data,null,2);window.__UI_QA_REPORT=data;
    await fetch('/__test-report/ui',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).catch(e=>{status.textContent+=' Report save failed: '+e;});
    return data;
  }
  async function test(name,action,{critical=false}={}){
    status.textContent='Running: '+name;const start=performance.now();
    try{const detail=await action();results.push({name,pass:true,ms:Math.round(performance.now()-start),detail});}
    catch(e){results.push({name,pass:false,ms:Math.round(performance.now()-start),error:String(e)});if(critical){await report();throw e;}}
    await report();
  }
  async function attach(previousDocument){
    await waitFor(()=>!app.closed&&app.location.origin===location.origin&&app.document!==previousDocument&&app.document.readyState==='complete'&&app.document.getElementById('pdf-input'),{label:'application document'});
    doc=app.document;
    app.addEventListener('error',event=>errors.push(String(event.message||event.error)));
    app.addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
    // Observe real browser download Blobs. Fetching a blob: URL would violate
    // the production connect-src 'self' policy; no application hook is used.
    const generatedBlobs=new Map(),createObjectURL=app.URL.createObjectURL.bind(app.URL);
    app.URL.createObjectURL=blob=>{const url=createObjectURL(blob);generatedBlobs.set(url,blob);return url;};
    doc.addEventListener('click',event=>{
      const anchor=event.target?.closest?.('a[download]');if(!anchor)return;
      event.preventDefault();const entry={filename:anchor.download};downloads.push(entry);
      const blob=generatedBlobs.get(anchor.href);
      entry.promise=Promise.resolve().then(()=>{if(!blob)throw new Error('Actual download Blob was not observed');entry.blob=blob;return blob;}).catch(e=>{entry.error=String(e);throw e;});
    },true);
    await pause(400);
  }
  async function idle(label='application idle',timeout=20000){
    await waitFor(()=>!doc.body.classList.contains('busy'),{label,timeout});await pause(80);
  }
  async function inject(name,type='application/pdf'){
    const bytes=await(await fetch('/tests/fixtures/'+name)).arrayBuffer();
    const transfer=new app.DataTransfer();transfer.items.add(new app.File([bytes],name,{type}));
    $('pdf-input').files=transfer.files;$('pdf-input').dispatchEvent(new app.Event('change',{bubbles:true}));
    await pause(100);
  }
  async function confirmYes(){
    await waitFor(()=>$('confirm-dialog')?.open,{label:'confirmation dialog'});
    $('confirm-dialog').querySelector('button[value=yes]').click();
  }
  async function translate(){
    $('translate-button').click();
    await waitFor(()=>{
      if(!doc.body.classList.contains('busy')&&$('notice').classList.contains('error'))throw new Error($('notice').textContent);
      return !doc.body.classList.contains('busy')&&$('result-status').textContent.startsWith('Selesai');
    },{timeout:600000,label:'real local translation completion'});
  }
  async function download(button,filename){
    const before=downloads.length;$(button).click();
    const record=await waitFor(()=>downloads.slice(before).find(d=>d.filename===filename),{timeout:120000,label:filename+' download'});
    await record.promise;await idle('download completion',120000);return record;
  }
  try{
    await attach(initialDocument);
    await test('Public input accepts PDF only',async()=>{
      const inputs=[...doc.querySelectorAll('input[type=file]')];assert(inputs.length===1,'Unexpected upload input count');
      assert(inputs[0].accept==='.pdf,application/pdf','Input accepts a non-PDF format');return{accept:inputs[0].accept};
    });
    await test('Cold app window does not request heavy modules',async()=>{
      const heavy=app.performance.getEntriesByType('resource').filter(r=>/\/(?:models|runtime|vendor\/(?:pdfjs|ocr))\/|engine\.worker/.test(r.name));
      assert(!heavy.length,'Heavy files requested before interaction: '+heavy.map(r=>r.name).join(', '));return{resources:app.performance.getEntriesByType('resource').map(r=>r.name)};
    });
    await test('Clear prior synthetic checkpoint through public controls',async()=>{
      $('clear-document').click();await pause(150);if($('confirm-dialog').open)$('confirm-dialog').querySelector('button[value=yes]').click();
      await waitFor(()=>/Dokumen dan progres sudah dihapus/.test($('notice').textContent)&&!doc.body.classList.contains('busy'),{label:'checkpoint deletion confirmation'});
      await idle();assert($('file-card').hidden&&$('resume-banner').hidden,'Prior checkpoint still active');assert(!$('notice').classList.contains('error'),$('notice').textContent);
    },{critical:true});
    await test('JSON file is rejected by the application',async()=>{
      await inject('input.json','application/json');await waitFor(()=>$('notice').classList.contains('error'),{label:'JSON rejection'});
      assert($('file-card').hidden&&$('translate-button').disabled,'JSON became an active document');return{message:$('notice').textContent};
    });
    await test('A renamed JSON PDF is rejected by byte validation',async()=>{
      await inject('json-masquerading.pdf');await waitFor(()=>!doc.body.classList.contains('busy')&&$('notice').classList.contains('error')&&/Isi berkas bukan PDF|bukan PDF yang valid/.test($('notice').textContent),{label:'fake PDF byte-validation rejection'});
      await idle('fake PDF validation settled');
      assert($('file-card').hidden,'Fake PDF became an active document');return{message:$('notice').textContent};
    });
    await test('Select the English fixture PDF',async()=>{
      await inject(selectedName);await waitFor(()=>$('file-name').textContent===selectedName&&!$('translate-button').disabled,{label:'PDF ready'});
      assert(!$('file-card').hidden,'Selected PDF not displayed');return{file:$('file-name').textContent,meta:$('file-meta').textContent};
    },{critical:true});
    await test('Extract source without starting the translation engine',async()=>{
      $('advanced').open=true;$('extract-button').click();
      await waitFor(()=>!$('results').hidden&&!doc.body.classList.contains('busy'),{timeout:120000,label:'source extraction'});
      const texts=[...doc.querySelectorAll('#block-list .source-text')].map(e=>e.textContent).join('\n');
      assert(texts.includes('120')&&texts.includes('10.1234/example.2024.001'),'Source text or DOI missing');
      const heavy=app.performance.getEntriesByType('resource').filter(r=>/\/models\/|engine\.worker/.test(r.name));
      assert(!heavy.length,'Model loaded before translation action');return{summary:$('result-summary').textContent};
    },{critical:true});
    await test('Translate the fixture through the actual local worker',async()=>{
      await translate();const rows=[...doc.querySelectorAll('#block-list .block-row')];
      const translated=rows.map(row=>({source:row.querySelector('.source-text').textContent,target:row.querySelector('.block-target').value}));
      assert(translated.some(x=>x.target&&x.source!==x.target),'Every target equals its source');
      const all=translated.map(x=>x.target).join('\n');for(const value of ['120','2024','12.5','10.2','14.8','0.031','10.1234/example.2024.001'])assert(all.includes(value),'Protected value missing: '+value);
      assert(/pendidikan|penelitian|pertumbuhan/i.test(all),'Indonesian translation not observed');
      assert(/rata-rata sampel/i.test(all),'Academic phrase sample mean was not preserved as rata-rata sampel');
      return{summary:$('result-summary').textContent,translated};
    },{critical:true});
    let editedId,editedText;
    await test('Immediate export includes the latest target edit',async()=>{
      const row=doc.querySelector('#block-list .block-row'),target=row.querySelector('.block-target');editedId=row.dataset.blockId;
      editedText=target.value+' Catatan uji editorial.';target.value=editedText;target.dispatchEvent(new app.Event('input',{bubbles:true}));
      const record=await download('download-translation','JURNAL_TERJEMAHAN.md');const text=await record.blob.text();
      assert(text.includes('Catatan uji editorial.'),'Export lost the most recent edit');return{filename:record.filename,bytes:record.blob.size,editedId};
    },{critical:true});
    await test('Reload and resume preserves the edited translation',async()=>{
      const previousDocument=doc;app.location.reload();await attach(previousDocument);
      await waitFor(()=>!$('resume-banner').hidden,{label:'saved checkpoint banner'});$('resume-button').click();
      await waitFor(()=>!$('results').hidden&&!doc.body.classList.contains('busy'),{timeout:120000,label:'checkpoint restored'});
      const value=doc.querySelector(`[data-block-id="${editedId}"] .block-target`).value;assert(value===editedText,'Edited target changed after resume');
      assert($('file-name').textContent===selectedName,'Restored source filename differs');return{summary:$('result-summary').textContent,editedTarget:value};
    },{critical:true});
    await test('Cleared target becomes pending and can be translated again',async()=>{
      const target=doc.querySelector(`[data-block-id="${editedId}"] .block-target`);
      target.value='';target.dispatchEvent(new app.Event('input',{bubbles:true}));target.dispatchEvent(new app.Event('change',{bubbles:true}));
      await waitFor(()=>doc.querySelector(`[data-block-id="${editedId}"] .block-state`).textContent==='Belum diterjemahkan'&&$('result-status').textContent==='Hasil sementara',{label:'empty target marked pending'});
      await translate();assert(doc.querySelector(`[data-block-id="${editedId}"] .block-target`).value.trim(),'Resume retained an empty target');
      const restored=doc.querySelector(`[data-block-id="${editedId}"] .block-target`);restored.value=editedText;restored.dispatchEvent(new app.Event('input',{bubbles:true}));
      const record=await download('download-translation','JURNAL_TERJEMAHAN.md');assert((await record.blob.text()).includes('Catatan uji editorial.'),'Restored manual edit was not saved');
      return{editedId,summary:$('result-summary').textContent};
    },{critical:true});
    await test('Source-only action preserves existing translated results',async()=>{
      const before=doc.querySelector(`[data-block-id="${editedId}"] .block-target`).value;
      $('target-language').value='en';$('extract-button').click();await pause(200);
      assert(!$('confirm-dialog').open,'Source-only action incorrectly demanded language-change confirmation');
      assert(doc.querySelector(`[data-block-id="${editedId}"] .block-target`).value===before,'Source-only action erased target');
      assert($('result-status').textContent.startsWith('Selesai'),'Source-only action changed completion status');$('target-language').value='id';
    });
    let correctedId,originalSource;
    await test('Source correction invalidates only its own translation',async()=>{
      const rows=[...doc.querySelectorAll('#block-list .block-row')],row=rows.find(r=>r.dataset.blockId!==editedId&&r.querySelector('.source-editor'));
      assert(row,'No second editable source block');correctedId=row.dataset.blockId;originalSource=row.querySelector('.source-text').textContent;
      row.querySelector('.source-correction').open=true;row.querySelector('.source-editor').value=originalSource+' The source text was checked.';
      row.querySelector('.source-correction button').click();await idle('source correction saved');
      const corrected=doc.querySelector(`[data-block-id="${correctedId}"]`);
      assert(corrected.querySelector('.block-target').value==='','Corrected block retained its obsolete target');
      assert(corrected.querySelector('.source-original .source-text').textContent===originalSource,'Original extraction was overwritten');
      assert(doc.querySelector(`[data-block-id="${editedId}"] .block-target`).value===editedText,'Unrelated edited translation was reset');return{correctedId,originalSource};
    },{critical:true});
    await test('Resume translates only the invalidated source block',async()=>{
      await translate();assert(doc.querySelector(`[data-block-id="${correctedId}"] .block-target`).value.trim(),'Corrected source was not translated');
      assert(doc.querySelector(`[data-block-id="${editedId}"] .block-target`).value===editedText,'Resume overwrote the separate manual edit');
      return{summary:$('result-summary').textContent};
    },{critical:true});
    await test('Source Markdown retains the original extracted source',async()=>{
      const record=await download('download-source','JURNAL_ASLI.md'),text=await record.blob.text();
      assert(text.includes(originalSource),'Original source missing from source export');assert(!text.includes('The source text was checked.'),'Source export replaced original with correction');return{bytes:record.blob.size};
    });
    await test('Bilingual Markdown includes the edited translation',async()=>{
      const record=await download('download-bilingual','JURNAL_BILINGUAL.md'),text=await record.blob.text();
      assert(text.includes('Catatan uji editorial.'),'Bilingual output lost manual edit');assert(text.includes('120'),'Bilingual output lost protected statistics');return{bytes:record.blob.size};
    });
    await test('ZIP download is a genuine archive',async()=>{
      const record=await download('download-zip','JURNAL_HASIL_LENGKAP.zip'),bytes=new Uint8Array(await record.blob.slice(0,4).arrayBuffer());
      assert(bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4,'ZIP signature invalid');assert(record.blob.size>10000,'Archive unexpectedly small');return{bytes:record.blob.size,signature:[...bytes]};
    });
    await test('English abstract translates inside a mostly Indonesian PDF',async()=>{
      await inject('bilingual-text.pdf');await confirmYes();
      await waitFor(()=>$('file-name').textContent==='bilingual-text.pdf'&&!$('translate-button').disabled,{label:'mixed-language PDF selected'});
      await translate();const rows=[...doc.querySelectorAll('#block-list .block-row')];
      const english=rows.find(r=>r.querySelector('.source-text').textContent.includes('This study examines education and health.'));
      const indonesian=rows.find(r=>r.querySelector('.source-text').textContent.startsWith('Penelitian ini dilakukan'));
      assert(english&&indonesian,'Mixed-language fixture blocks missing');
      const source=english.querySelector('.source-text').textContent,target=english.querySelector('.block-target').value;
      assert(target!==source&&/rata-rata sampel/i.test(target)&&target.includes('12.5'),'English abstract was incorrectly preserved or mistranslated');
      assert(indonesian.querySelector('.block-target').value===indonesian.querySelector('.source-text').textContent,'Indonesian body was unnecessarily translated');
      const heading=rows.find(r=>r.querySelector('.source-text').textContent==='Abstract');
      assert(heading?.querySelector('.block-target').value==='Abstrak','English abstract heading was left untranslated');
      return{englishSource:source,englishTarget:target,indonesianPreserved:true,abstractHeading:'Abstrak'};
    },{critical:true});
    await test('Prepare offline assets through the public control',async()=>{
      $('offline-button').click();await waitFor(()=>!doc.body.classList.contains('busy')&&/telah disimpan untuk offline/.test($('offline-status').textContent),{timeout:600000,label:'offline cache preparation'});
      const names=await app.caches.keys();const inventories=[];
      for(const name of names){const cache=await app.caches.open(name);const keys=await cache.keys();inventories.push({name,entries:keys.length,paths:keys.map(k=>new URL(k.url).pathname)});}
      const paths=inventories.flatMap(i=>i.paths);assert(paths.some(p=>/vendor\/pdfjs\/pdf.min.mjs/.test(p)),'PDF library not cached');assert(paths.some(p=>/vendor\/ocr\/.*traineddata/.test(p)),'OCR languages not cached');assert(names.includes('semantik-model-v1'),'Model cache missing');
      return{message:$('offline-status').textContent,inventories,scope:'Cache preparation only; this check does not emulate network disconnection'};
    });
    await test('Application window makes no third-party resource requests',async()=>{
      const thirdparty=app.performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin);
      assert(!thirdparty.length,thirdparty.map(r=>r.name).join(', '));return{observedWindowResources:app.performance.getEntriesByType('resource').length};
    });
  }catch(e){errors.push(String(e));}
  const final=await report(true);status.textContent=final.status+': '+final.passed+'/'+final.total;running=false;runButton.disabled=false;
}
