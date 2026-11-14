/* Actual Chromium integration tests. A launch failure is recorded as BLOCKED. */
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '..');
const runtimeRequire = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'package.json')) : require;
const {chromium} = runtimeRequire('playwright');
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:8765';
const evidence = path.join(root,'evidence','reader-browser.json');
const results = [], requests = [], errors = [];
let browser;
function save(status, extra={}) {
  fs.mkdirSync(path.dirname(evidence),{recursive:true});
  fs.writeFileSync(evidence,JSON.stringify({status,scope:'Actual browser PDF import, OCR and input rejection',
    results,requests,errors,...extra},null,2)+'\n');
}
async function test(name, run) {
  const start=Date.now();
  try { const detail=await run();results.push({name,pass:true,ms:Date.now()-start,detail}); }
  catch(e) { results.push({name,pass:false,ms:Date.now()-start,error:String(e)}); }
}
function assert(condition,message){if(!condition)throw new Error(message);}
(async()=>{
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
      args:['--no-sandbox','--disable-dev-shm-usage']});
  } catch(e) {
    save('BLOCKED',{blocker:'Chromium launch failed in the execution environment',error:String(e)});
    console.error('BLOCKED: '+String(e));process.exitCode=2;return;
  }
  const context=await browser.newContext();const page=await context.newPage();
  page.on('request',r=>requests.push({method:r.method(),url:r.url(),hasBody:!!r.postData()}));
  page.on('pageerror',e=>errors.push(String(e)));
  page.setDefaultTimeout(20000);
  await page.goto(origin+'/index.html');
  await page.waitForTimeout(500);
  await test('Cold page does not load PDF, OCR, engine or model weights',async()=>{
    const heavy=requests.filter(r=>/\/(?:models|runtime|vendor\/(?:pdfjs|ocr))\/|engine\.worker/.test(r.url));
    assert(!heavy.length,JSON.stringify(heavy));return {requestsBeforeInteraction:requests.length};
  });
  await page.evaluate(async()=>{window.reader=await import('/app/pdf-reader.js');});
  async function readFixture(name,options={}){
    return await page.evaluate(async({name,options})=>{
      const data=await (await fetch('/tests/fixtures/'+name)).arrayBuffer();
      const f=new File([data],name,{type:'application/pdf'});
      const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),90000);
      let session;
      try {
        session=await window.reader.openPdf(f,{signal:timeout.signal,
          onPassword:()=>options.cancelPassword?null:'journal-test-password'});
        const result=await session.extract({signal:timeout.signal,ocrLanguage:'eng+ind',layout:'auto'});
        return {numPages:session.numPages,metadata:session.metadata,
          pages:result.pages.map(p=>({number:p.number,source:p.source,columnCount:p.columnCount,
            blocks:p.blocks.map(b=>({id:b.id,type:b.type,text:b.text,sourceItemIds:b.sourceItemIds,issues:b.issues})),
            sourceItemCount:p.sourceItemCount,coveredItemCount:p.coveredItemCount,warnings:p.warnings})),
          text:result.blocks.map(b=>b.text).join('\n'),warnings:result.warnings,
          assets:result.assets.map(a=>({path:a.path,bytes:a.blob.size,type:a.blob.type}))};
      }finally{clearTimeout(timer);await session?.destroy();}
    },{name,options});
  }
  for(const name of ['input.json','input.txt','json-masquerading.pdf','corrupt.pdf']){
    await test('Reject '+name,async()=>{
      let rejected=false;let error='';try{await readFixture(name);}catch(e){rejected=true;error=String(e);}
      assert(rejected,'Non-PDF or corrupt input was accepted');return {error};
    });
  }
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'tests','fixtures','manifest.json')));
  for(const name of ['digital-en.pdf','digital-id.pdf','two-column.pdf','academic-structures.pdf','rotated.pdf','unsafe-strings.pdf']){
    await test('Extract '+name,async()=>{
      const d=await readFixture(name);
      assert(d.pages.length===manifest[name].pages,'Unexpected page count');
      for(const token of manifest[name].contains||[])assert(d.text.includes(token),'Missing token: '+token);
      for(const p of d.pages)assert(p.sourceItemCount===p.coveredItemCount,'Uncovered source items');
      assert(d.assets.some(a=>a.type==='image/jpeg'&&a.bytes>0),'Original page image missing');
      if(manifest[name].order){let last=-1;for(const s of manifest[name].order){let at=d.text.indexOf(s);assert(at>last,'Wrong column order at '+s);last=at;}}
      return d;
    });
  }
  await test('Digital PDFs do not trigger OCR download',async()=>{
    assert(!requests.some(r=>/\/vendor\/ocr\//.test(r.url)),'OCR loaded for digital-only samples');
  });
  await test('Reject 301-page document before extraction',async()=>{
    let error='';try{await readFixture('page-limit-301.pdf');}catch(e){error=String(e);}
    assert(/300/.test(error),'Page limit was not enforced');return {error};
  });
  await test('Open password-protected PDF',async()=>{
    const d=await readFixture('password-protected.pdf');assert(d.text.includes('120'),'Decrypted content missing');return d;
  });
  await test('Cancel password prompt',async()=>{
    let error='';try{await readFixture('password-protected.pdf',{cancelPassword:true});}catch(e){error=String(e);}
    assert(error,'Password cancellation did not reject');return {error};
  });
  await test('Pre-aborted import cancels before parsing',async()=>{
    const result=await page.evaluate(async()=>{
      const c=new AbortController();c.abort();try{await window.reader.openPdf(new File(['%PDF-1.7'],'test.pdf',{type:'application/pdf'}),{signal:c.signal});return null;}catch(e){return e.name;}
    });assert(result==='AbortError','Expected AbortError, got '+result);
  });
  for(const name of ['scan-en.pdf','scan-id.pdf','mixed.pdf']){
    await test('OCR '+name,async()=>{
      const d=await readFixture(name);
      for(const token of manifest[name].contains)assert(d.text.includes(token),'OCR missing '+token);
      assert(d.pages.some(p=>p.source==='ocr'),'OCR was not performed');
      if(name==='mixed.pdf')assert(d.pages[0].source==='pdf-text'&&d.pages[1].source==='ocr','Mixed page routing wrong');
      return d;
    });
  }
  await test('Blank page is preserved with an explicit issue',async()=>{
    const d=await readFixture('empty.pdf');assert(d.pages[0].blocks.some(b=>b.type==='image'&&b.issues.length),'Blank page silently reported as text');return d;
  });
  await test('No external connections or document upload requests',async()=>{
    const bad=requests.filter(r=>r.method!=='GET'||r.hasBody||!r.url.startsWith(origin+'/'));
    assert(!bad.length,JSON.stringify(bad));return {requestCount:requests.length};
  });
  await test('No executed PDF HTML payload',async()=>{
    assert(!(await page.evaluate(()=>window.__PDF_XSS)),'PDF text executed as JavaScript');
  });
  await browser.close();
  save(results.every(x=>x.pass)?'PASS':'FAIL',{passed:results.filter(x=>x.pass).length,total:results.length});
  console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length,
    failed:results.filter(x=>!x.pass)},null,2));
  if(results.some(x=>!x.pass))process.exitCode=1;
})().catch(async e=>{errors.push(String(e));save('FAIL');await browser?.close();console.error(e);process.exitCode=1;});
