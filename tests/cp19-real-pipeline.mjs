import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {root,repo,build,Translator,cleanupBridge} from './cp19-runtime.mjs';
import {renderMarkdown} from './markdown-renderer.mjs';
const {detectLanguage}=await import(pathToFileURL(path.join(root,'app/translation.js')));
const {openPdf}=await import(pathToFileURL(path.join(root,'app/pdf-reader.js')));
const {createStandaloneMarkdown,summarizeBlocks}=await import(pathToFileURL(path.join(root,'app/export.js')));
const translator=new Translator(),out=path.join(repo,'evidence/cp19/fresh');await fs.mkdir(out,{recursive:true});
const report={build,method:'Final dist: actual PDF.js and native Canvas boundary -> geometry -> actual bundled WASM/ONNX via Node Worker transport bridge -> standalone Markdown -> actual Marked/KaTeX. Not browser, OCR or human approval.',started:new Date().toISOString(),documents:[]};
const inputs=[['mathematics','../audit/evidence/pdf_math/mathematics_fixture.pdf','en-id'],['en-to-id','../audit/evidence/browser/academic_prose_en.pdf','en-id'],['id-to-en','../audit/evidence/browser/academic_prose_id.pdf','id-en'],['independent-math','../research-math/independent-controls.pdf','en-id']];
try{
 for(const [id,relative,direction] of inputs){
  const input=await fs.readFile(path.join(repo,relative)),file=new File([input],id+'.pdf',{type:'application/pdf'});let reader;const start=performance.now();
  try{
   const engineWorker=globalThis.Worker;delete globalThis.Worker;reader=await openPdf(file);const doc=await reader.extract();globalThis.Worker=engineWorker;assert.equal(doc.sourceItemCount,doc.coveredItemCount);
   const results=[];await translator.prepare(direction);
   for(const block of doc.blocks){
    const detected=detectLanguage(block.text||''),words=(block.text||'').split(/\s+/).length,alreadyTarget=detected===direction.split('-')[1]&&(block.type==='heading'||words>=4);
    const result=block.translatable===false||alreadyTarget?{text:block.text,status:'preserved',outcome:'preserved',issues:[]}:block.type==='table'?await translator.translateTable(block):await translator.translate(block.text);
    Object.assign(block,{target:result.text,status:result.status,outcome:result.outcome,sourcePreserved:Boolean(result.sourcePreserved),retryable:Boolean(result.retryable),issues:[...(block.issues||[]),...(result.issues||[])],diagnostics:result.diagnostics||[]});if(result.translatedRows)block.translatedRows=result.translatedRows;
    results.push({id:block.id,type:block.type,source:block.text,...result});
   }
   const [source,target]=direction.split('-');doc.sourceLanguage=source;doc.targetLanguage=target;const counts=summarizeBlocks(doc.blocks),job={file,document:doc,config:{source,target},build,status:counts.rejected||counts.failed||counts.pending?'needs-attention':'complete'};
   const markdown=await createStandaloneMarkdown(job),rendered=renderMarkdown(markdown);
   await fs.writeFile(path.join(out,id+'.md'),markdown);await fs.writeFile(path.join(out,id+'.html'),rendered.html);
   const math=doc.blocks.filter(b=>b.math).map(b=>b.math);
   const row={id,inputSHA256:createHash('sha256').update(input).digest('hex'),status:job.status,counts,math,renderedFormulas:rendered.formulas,ms:Math.round(performance.now()-start),peakProcessRSS:process.resourceUsage().maxRSS*1024,results,markdownSHA256:createHash('sha256').update(markdown).digest('hex')};
   report.documents.push(row);console.log(JSON.stringify({id,counts,math:math.length,formulas:rendered.formulas.length,ms:row.ms}));
  }catch(e){report.documents.push({id,error:e.stack});console.error(id,e);}finally{await reader?.destroy();}
  await fs.writeFile(path.join(out,'PIPELINE_RESULTS.json'),JSON.stringify(report,null,2));
 }
}finally{await translator.dispose();await cleanupBridge();}
await fs.mkdir(path.join(out,'renderer'),{recursive:true});
await fs.copyFile(path.join(repo,'tools/node_modules/katex/dist/katex.min.css'),path.join(out,'renderer/katex.min.css'));
await fs.cp(path.join(repo,'tools/node_modules/katex/dist/fonts'),path.join(out,'renderer/fonts'),{recursive:true});
await fs.writeFile(path.join(out,'renderer/reader.css'),'body{font:16px/1.65 system-ui;background:#f5f5ee;color:#19352c;margin:0}main{max-width:900px;margin:30px auto;padding:28px;background:white}img{max-width:100%;height:auto}table{border-collapse:collapse}td,th{padding:8px;border:1px solid #9baba3}blockquote{border-left:4px solid #ad8735;padding-left:16px}.katex-display{overflow-x:auto;padding:12px 0}');
if(report.documents.some(x=>x.error))process.exitCode=1;
