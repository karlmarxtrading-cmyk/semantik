import * as reader from '/app/pdf-reader.js';
const status=document.getElementById('status'), output=document.getElementById('results'),button=document.getElementById('run');
let running=false;
function assert(condition,message){if(!condition)throw new Error(message);}
async function suite(){
  if(running)return;running=true;button.disabled=true;performance.clearResourceTimings();const results=[],errors=[];
  const started=new Date().toISOString();
  async function test(name,fn){
    status.textContent='Running: '+name;const start=performance.now();
    try{results.push({name,pass:true,detail:await fn(),ms:Math.round(performance.now()-start)});}
    catch(error){results.push({name,pass:false,error:String(error),ms:Math.round(performance.now()-start)});}
    output.textContent=JSON.stringify(results,null,2);
    await fetch('/__test-report/pdf-reader',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({status:'RUNNING',started,results,errors})}).catch(()=>{});
  }
  async function loadFile(name){const bytes=await(await fetch('/tests/fixtures/'+name)).arrayBuffer();return new File([bytes],name,{type:'application/pdf'});}
  async function read(name,options={}){
    const file=await loadFile(name),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),120000);
    let session;
    try{
      session=await reader.openPdf(file,{signal:controller.signal,onPassword:()=>options.cancelPassword?null:'journal-test-password'});
      const extracted=await session.extract({signal:controller.signal,ocrLanguage:options.ocrLanguage||'eng+ind',layout:'auto'});
      return {numPages:session.numPages,metadata:session.metadata,
        text:extracted.blocks.map(b=>b.text).join('\n'),warnings:extracted.warnings,
        pages:extracted.pages.map(p=>({number:p.number,source:p.source,columnCount:p.columnCount,
          sourceItemCount:p.sourceItemCount,coveredItemCount:p.coveredItemCount,warnings:p.warnings,
          blocks:p.blocks.map(b=>({id:b.id,type:b.type,text:b.text,issues:b.issues,translatable:b.translatable,assetPath:b.assetPath}))})),
        assets:extracted.assets.map(a=>({path:a.path,bytes:a.blob.size,type:a.blob.type}))};
    }finally{clearTimeout(timer);await session?.destroy();}
  }
  try{
    const manifest=await(await fetch('/tests/fixtures/manifest.json')).json();
    for(const name of ['input.json','input.txt','json-masquerading.pdf','corrupt.pdf']){
      await test('Reject '+name,async()=>{let error='';try{await read(name);}catch(e){error=String(e);}assert(error,'Invalid input accepted');return{error};});
    }
    await test('Reject empty PDF file',async()=>{let error='';try{await reader.validatePdf(new File([],'empty.pdf',{type:'application/pdf'}));}catch(e){error=String(e);}assert(error,'Empty file accepted');return{error};});
    await test('Reject PDF larger than 100 MiB',async()=>{
      const megabyte=new Uint8Array(1024*1024);const large=new File(Array(101).fill(megabyte),'large.pdf',{type:'application/pdf'});
      let error='';try{await reader.validatePdf(large);}catch(e){error=String(e);}assert(/100 MiB/.test(error),'Size limit not enforced');return{error};
    });
    await test('Pre-aborted input stops immediately',async()=>{
      const c=new AbortController();c.abort();let name='';try{await reader.openPdf(new File(['%PDF-1.7'],'aborted.pdf',{type:'application/pdf'}),{signal:c.signal});}catch(e){name=e.name;}assert(name==='AbortError','Expected AbortError');return{name};
    });
    await test('Cancel extraction after a completed page preserves callback and stops',async()=>{
      const session=await reader.openPdf(await loadFile('mixed.pdf'));const c=new AbortController();const pages=[];let error='';
      try{await session.extract({signal:c.signal,onPage:record=>{pages.push(record.number);c.abort();}});}catch(e){error=e.name;}finally{await session.destroy();}
      assert(error==='AbortError','Extraction did not stop with AbortError');assert(pages.length===1&&pages[0]===1,'Completed page callback was not preserved');return{error,completedPages:pages};
    });
    await test('Oversized page text stops before layout and keeps completed page callbacks',async()=>{
      const session=await reader.openPdf(await loadFile('text-limit.pdf'));const pages=[];let error;
      try{await session.extract({onPage:page=>pages.push(page.number)});}catch(e){error=e;}finally{await session.destroy();}
      assert(error?.code==='PDF_TEXT_LIMIT','Text complexity limit did not reject oversized source text');
      assert(pages.length===1&&pages[0]===1,'Previously completed page was lost or oversized page was accepted');
      return{error:String(error),code:error.code,completedPages:pages};
    });
    await test('Resumed total text budget is enforced before layout',async()=>{
      const session=await reader.openPdf(await loadFile('digital-en.pdf'));let error;
      try{await session.extract({initialTextCharacters:reader.PDF_LIMITS.maxTextCharsTotal-1});}catch(e){error=e;}finally{await session.destroy();}
      assert(error?.code==='PDF_TEXT_LIMIT'&&String(error).includes('2.000.000'),'Checkpoint total text budget was ignored');
      return{error:String(error),code:error.code};
    });
    await test('Reference-section state survives a page checkpoint and running header',async()=>{
      const session=await reader.openPdf(await loadFile('references-continuation.pdf'));
      try{
        const first=await session.extract({endPage:1}),last=first.pages.at(-1);
        assert(last.referenceSection===true,'Checkpoint omitted reference-section state');
        const resumed=await session.extract({startPage:2,initialReferenceSection:last.referenceSection,initialTextCharacters:last.sourceTextCharacters});
        const reference=resumed.blocks.find(b=>b.text.includes('Jones, B.'));
        assert(reference?.type==='reference'&&reference.translatable===false,'Resumed bibliography became translatable prose');
        assert(resumed.pages[0].referenceSection===true,'Running header incorrectly ended reference section');
        return{checkpoint:last.referenceSection,referenceText:reference.text,sourceTextCharacters:resumed.sourceTextCharacters};
      }finally{await session.destroy();}
    });
    for(const name of ['digital-en.pdf','digital-id.pdf','two-column.pdf','academic-structures.pdf','rotated.pdf','unsafe-strings.pdf']){
      await test('Extract '+name,async()=>{
        const result=await read(name);assert(result.pages.length===manifest[name].pages,'Page count differs');
        for(const token of manifest[name].contains||[])assert(result.text.includes(token),'Missing source token '+token);
        for(const p of result.pages)assert(p.sourceItemCount===p.coveredItemCount,'Source items missing');
        assert(result.assets.some(a=>a.type==='image/jpeg'&&a.bytes>0),'Original page image missing');
        let previous=-1;for(const token of manifest[name].order||[]){const at=result.text.indexOf(token);assert(at>previous,'Wrong reading order at '+token);previous=at;}
        if(name==='academic-structures.pdf'){
          const blocks=result.pages.flatMap(p=>p.blocks),formula=blocks.find(b=>b.type==='formula'),table=blocks.find(b=>b.type==='table');
          assert(formula&&formula.text.includes('mc²')&&formula.translatable===false,'Equation was not protected as a formula block');
          assert(formula.assetPath&&result.assets.some(a=>a.path===formula.assetPath&&a.bytes>0),'Formula source image missing');
          assert(table&&table.text.includes('Control')&&table.text.includes('Treatment')&&table.translatable===false,'Table rows were not preserved as one table');
          assert(table.assetPath&&result.assets.some(a=>a.path===table.assetPath&&a.bytes>0),'Table source image missing');
        }
        if(name==='rotated.pdf'){
          assert(result.text.indexOf('Rotated Article')<result.text.indexOf('This rotated page'),'Rotated source order was reversed');
          assert(result.pages.flatMap(p=>p.blocks).some(b=>b.issues.some(i=>i.includes('berotasi'))),'Rotation uncertainty was hidden');
        }
        return result;
      });
    }
    await test('No OCR requests for digital-only fixtures',async()=>{
      const requests=performance.getEntriesByType('resource').filter(r=>r.name.includes('/vendor/ocr/'));
      assert(!requests.length,'Digital fixtures loaded OCR');return{ocrRequests:requests.map(r=>r.name)};
    });
    await test('Reject page count above 300',async()=>{let error='';try{await read('page-limit-301.pdf');}catch(e){error=String(e);}assert(/300/.test(error),'Page limit missing');return{error};});
    await test('Password-protected PDF opens with correct password',async()=>{const d=await read('password-protected.pdf');assert(d.text.includes('120'),'Decrypted content missing');return d;});
    await test('Incorrect password can be retried',async()=>{
      const prompts=[];let session;
      try{session=await reader.openPdf(await loadFile('password-protected.pdf'),{onPassword:reason=>{prompts.push(reason);return prompts.length===1?'incorrect-password':'journal-test-password';}});assert(prompts.join(',')==='required,incorrect','Retry reason not surfaced');assert(session.numPages===1,'Retried document did not open');return{prompts};}
      finally{await session?.destroy();}
    });
    await test('Password cancellation rejects promptly',async()=>{let error='';const at=performance.now();try{await read('password-protected.pdf',{cancelPassword:true});}catch(e){error=String(e);}assert(error,'Cancel did not reject');assert(performance.now()-at<10000,'Password cancel exceeded 10 seconds');return{error};});
    for(const name of ['scan-en.pdf','scan-id.pdf','mixed.pdf']){
      await test('OCR '+name,async()=>{
        const d=await read(name);for(const token of manifest[name].contains||[])assert(d.text.includes(token),'OCR missing token '+token);
        assert(d.pages.some(p=>p.source==='ocr'),'OCR path was not used');
        if(name==='mixed.pdf')assert(d.pages[0].source==='pdf-text'&&d.pages[1].source==='ocr','Mixed page routing incorrect');
        return d;
      });
    }
    await test('Blank page has image fallback and explicit issue',async()=>{const d=await read('empty.pdf');assert(d.pages[0].blocks.some(b=>b.type==='image'&&b.issues.length),'Blank page reported as valid text');return d;});
    await test('No third-party runtime requests',async()=>{
      const thirdparty=performance.getEntriesByType('resource').filter(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin);
      assert(!thirdparty.length,JSON.stringify(thirdparty.map(r=>r.name)));return{resourceCount:performance.getEntriesByType('resource').length};
    });
    await test('PDF input payload did not execute',async()=>{assert(!window.__PDF_XSS,'PDF text executed');});
  }catch(e){errors.push(String(e));}
  const passed=results.filter(r=>r.pass).length,report={status:errors.length||passed!==results.length?'FAIL':'PASS',
    started,completed:new Date().toISOString(),userAgent:navigator.userAgent,passed,total:results.length,results,errors,
    resources:performance.getEntriesByType('resource').map(r=>({url:r.name,initiatorType:r.initiatorType,transferSize:r.transferSize}))};
  status.textContent=report.status+': '+passed+'/'+results.length;output.textContent=JSON.stringify(report,null,2);
  window.__PDF_QA_REPORT=report;
  try{const response=await fetch('/__test-report/pdf-reader',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});if(!response.ok)throw new Error('HTTP '+response.status);}
  catch(e){status.textContent+=' (report save failed: '+String(e)+')';}
  running=false;button.disabled=false;
}
button.addEventListener('click',suite);suite();
