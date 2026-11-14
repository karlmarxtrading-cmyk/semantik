from pathlib import Path
p=Path('cp18/app/app/main.js');s=p.read_text()
s=s.replace("import * as checkpoint from './storage.js';", "import * as checkpoint from './storage.js';\nimport {BUILD_INFO} from './build-info.js';")
s=s.replace("transitioning: false, pendingEdits: new Set(), partialPages: []", "transitioning: false, pendingEdits: new Set(), partialPages: [], token: null, dirty: false, pendingSaves: 0, readOnly: false, recovering: false")
s=s.replace("new Set(['formula', 'table', 'reference', 'image'])", "new Set(['formula', 'reference', 'image'])")
s=s.replace("function notice(text, kind = '') { $('notice').textContent = text;", "function notice(text, kind = '') { if(state.dirty && kind !== 'error'){text='Perubahan belum tersimpan di browser. Unduh hasil sebelum menutup tab, atau coba simpan kembali. '+text;kind='';} $('notice').textContent = text;")
a=s.index('function stats()');b=s.index('async function flushEdits()',a)
s=s[:a]+'''const retryable = block => !block.userReviewed && block.status!=='edited' && (block.retryable || block.sourcePreserved || ['failed','rejected'].includes(block.outcome));
const completed = block => hasTarget(block) && !retryable(block);
function stats() {
  const blocks=state.document?.blocks||[], counts={total:blocks.length,translated:0,preserved:0,rejected:0,failed:0,pending:0,review:0};
  for(const b of blocks){
    if(!hasTarget(b))counts.pending++;
    else if(b.outcome==='failed')counts.failed++;
    else if(b.outcome==='rejected'||b.sourcePreserved)counts.rejected++;
    else if(b.status==='preserved')counts.preserved++;
    else counts.translated++;
    if(needsReview(b))counts.review++;
  }
  counts.done=counts.translated+counts.preserved;counts.attempted=counts.total-counts.pending;return counts;
}
function meta() { return {filename: state.file?.name, size: state.file?.size, numPages: state.pdf?.numPages || state.document?.numPages,
  status: state.status, config: state.config, signature: state.signature, page: state.page, progress: stats(), revision: BUILD_INFO.release, build:BUILD_INFO,
  documentInfo: state.document ? {sourceLanguage: state.document.sourceLanguage, targetLanguage: state.document.targetLanguage, warnings: state.document.warnings} : null}; }
function refreshSaveStatus(){displayFile();const button=$('retry-save');if(button){button.hidden=!state.dirty;button.disabled=state.busy||state.recovering||state.readOnly;}}
async function save(action) {
  if (!state.saveEnabled || state.readOnly || state.recovering) {state.dirty=true;refreshSaveStatus();return false;}
  state.dirty=true;state.pendingSaves++;
  let succeeded=false;
  const saving=state.saveQueue.then(async()=>{
    if(!state.saveEnabled||state.readOnly||state.recovering)return;
    await action();succeeded=true;
  });
  state.saveQueue=saving.catch(error=>{
    state.saveEnabled=false;
    if(error?.name==='InvalidStateError')state.readOnly=true;
    notice('Penyimpanan progres lokal gagal. Hasil layar tetap tersedia; unduh sebelum menutup tab. Coba simpan kembali setelah ruang atau akses penyimpanan pulih.','error');
    console.warn('Local checkpoint unavailable:',error?.name||'storage error');
  }).finally(()=>{state.pendingSaves--;if(succeeded&&state.saveEnabled&&!state.pendingSaves)state.dirty=false;refreshSaveStatus();});
  await state.saveQueue;return succeeded;
}
async function retrySave(){
  if(state.busy||state.transitioning||state.readOnly||!state.file)return;
  state.transitioning=true;setBusy(true);
  try{
    await flushEdits();
    if(!await acquireDocumentLock())throw new Error('Tutup bacaan di tab lain sebelum mencoba menyimpan kembali.');
    if(!state.token){state.token=await checkpoint.createCheckpoint(state.file,meta());}
    await checkpoint.saveSnapshot({document:state.document,partialPages:state.partialPages,meta:meta()},state.token);
    state.saveEnabled=true;state.dirty=false;notice('Seluruh progres layar berhasil disimpan kembali.','success');
  }catch(error){state.saveEnabled=false;state.dirty=true;notice(`Progres belum tersimpan: ${escapedError(error)}`,'error');}
  finally{state.transitioning=false;setBusy(false);refreshSaveStatus();}
}
''' + s[b:]
s=s.replace("function editBlock(block, value, doc) {", "function editBlock(block, value, doc) {\n  if(state.readOnly||state.recovering||doc!==state.document)return;\n  state.dirty=true;refreshSaveStatus();")
s=s.replace("block.userReviewed = false; block.semanticVerified = false; block.sourcePreserved = false;", "block.userReviewed = false; block.semanticVerified = false; block.sourcePreserved = false; block.outcome='translated'; block.retryable=false;")
s=s.replace("state.busy || state.transitioning || doc !== state.document", "state.busy || state.transitioning || state.readOnly || state.recovering || doc !== state.document")
s=s.replace("for (const key of ['target','status','editedAt','userReviewed','reviewedAt','engine'])", "for (const key of ['target','status','editedAt','userReviewed','reviewedAt','engine','outcome','retryable','diagnostics','translatedRows'])")
s=s.replace("await save(() => checkpoint.saveBlock(block));", "await save(() => checkpoint.saveBlock(block,state.token));")
s=s.replace("await save(()=>checkpoint.saveBlock(block));", "await save(()=>checkpoint.saveBlock(block,state.token));")
s=s.replace("checkpoint.saveCheckpointMeta(meta())", "checkpoint.saveCheckpointMeta(meta(),state.token)")
s=s.replace("if (!navigator.locks) { state.saveEnabled = false;", "if (!navigator.locks) { state.saveEnabled = false;state.dirty=true;")
s=s.replace("for (const e of $('block-list').querySelectorAll('textarea,button')) e.disabled = value;", "for (const e of $('block-list').querySelectorAll('textarea,button')) e.disabled = value||state.readOnly||state.recovering;\n  refreshSaveStatus();")
s=s.replace("${state.saveEnabled ? 'Progres disimpan lokal' : 'Sesi lokal sementara'}", "${state.readOnly?'Salinan hanya baca — pekerjaan berubah':state.dirty?'BELUM TERSIMPAN — unduh sebelum menutup tab':state.saveEnabled?'Progres disimpan lokal':'Sesi lokal sementara'}")
s=s.replace("await save(() => checkpoint.createCheckpoint(file, meta()));", "state.readOnly=false;state.token=null;state.saveEnabled=Boolean(navigator.locks);await save(async()=>{state.token=await checkpoint.createCheckpoint(file,meta());});")
s=s.replace("state.document = saved.document || null;", "state.token=await checkpoint.claimCheckpoint(saved.meta);state.readOnly=false;state.dirty=false;state.saveEnabled=true;\n    state.document = saved.document || null;")
s=s.replace("checkpoint.beginExtraction(meta(), reusable)", "checkpoint.beginExtraction(meta(), reusable,state.token)")
s=s.replace("checkpoint.saveExtractedPage(page,assets)", "checkpoint.saveExtractedPage(page,assets,state.token)")
s=s.replace("initialTextCharacters: reusable.reduce", "initialAssets: reusable.flatMap(p=>p.assets||[]),\n    initialTextCharacters: reusable.reduce")
s=s.replace("extracted.sourceItemCount =", "const {validateAssetBudget}=await import('./pdf-reader.js');validateAssetBudget(extracted.assets);\n  extracted.sourceItemCount =")
s=s.replace("checkpoint.saveExtraction(extracted)", "checkpoint.saveExtraction(extracted,state.token)")
s=s.replace("await save(()=>checkpoint.clearTranslations()); await save(()=>checkpoint.saveCheckpointMeta(meta(),state.token));", "await save(()=>checkpoint.clearTranslations(extracted,meta(),state.token));")
s=s.replace("if (state.busy || state.transitioning || !state.file || !state.pdf) return;", "if (state.busy || state.transitioning || state.readOnly || state.recovering || !state.file || !state.pdf) return;")
s=s.replace("if (state.busy || !state.file || !state.pdf) return;", "if (state.busy || state.readOnly || state.recovering || !state.file || !state.pdf) return;")
s=s.replace("Hasil terjemahan dan koreksi saat ini akan diganti.", "Hasil mesin akan diperbarui; koreksi sumber tetap disimpan. Tinjauan dan edit target lama akan dibatalkan.")
s=s.replace("for (const block of state.document.blocks) { delete block.target; delete block.status; delete block.userReviewed; delete block.editedAt; block.issues = issuesOf(block.sourceIssues); }\n      await save(()=>checkpoint.clearTranslations());", "for(const block of state.document.blocks){for(const key of ['target','status','userReviewed','reviewedAt','editedAt','outcome','retryable','diagnostics','engine','translatedRows'])delete block[key];block.sourcePreserved=false;block.semanticVerified=false;block.issues=issuesOf(block.sourceIssues);}\n      state.config=config;state.signature=signature;\n      await save(()=>checkpoint.clearTranslations(state.document,meta(),state.token));")
s=s.replace("!hasTarget(b)&&b.translatable", "!completed(b)&&b.translatable")
s=s.replace("if (hasTarget(block)) continue;", "if (completed(block)) continue;")
s=s.replace("else result = await state.translator.translate(block.text,{", "else result = await (block.type==='table'&&Array.isArray(block.rows)?state.translator.translateTable.bind(state.translator,block):state.translator.translate.bind(state.translator,block.text))({")
s=s.replace("block.engine = result.engine || null;", "block.outcome=result.outcome||(result.status==='preserved'?'preserved':result.sourcePreserved?'rejected':'translated');block.retryable=Boolean(result.retryable);block.diagnostics=result.diagnostics||[];\n      if(result.translatedRows)block.translatedRows=result.translatedRows;\n      block.engine = result.engine || null;")
s=s.replace("state.status = 'complete';\n    progress", "state.status = stats().rejected||stats().failed||stats().pending?'needs-attention':'complete';\n    progress")
s=s.replace("`${stats().done} bagian terdata. ${stats().review} bagian bertanda untuk diperiksa.`", "`${stats().translated} diterjemahkan · ${stats().preserved} dipertahankan · ${stats().rejected} ditolak · ${stats().failed} gagal · ${stats().pending} belum diproses. ${stats().review} perlu ditinjau.`")
s=s.replace("'Pemrosesan selesai. Periksa bagian bertanda; teks sumber dan gambar halaman tersedia untuk membantu peninjauan.'", "'Periksa bagian bertanda. Gunakan Lanjutkan untuk mencoba ulang bagian gagal atau ditolak; edit dan tinjauan Anda tetap tersedia.'")
s=s.replace("${s.done} diproses · ${s.review} perlu ditinjau", "${s.translated} diterjemahkan · ${s.preserved} dipertahankan · ${s.rejected} ditolak · ${s.failed} gagal · ${s.pending} belum diproses · ${s.review} perlu ditinjau")
s=s.replace("Rumus, tabel, dan referensi tertentu dipertahankan dari sumber.", "Rumus dan referensi tertentu dipertahankan dari sumber; prosa tabel diterjemahkan per sel.")
s=s.replace("let label=!hasTarget(block)?'Belum diterjemahkan':", "let label=block.outcome==='failed'?'Gagal — dapat dicoba ulang':block.sourcePreserved?'Kandidat ditolak — sumber dipertahankan':!hasTarget(block)?'Belum diterjemahkan':")
s=s.replace("target.disabled=state.busy;", "target.disabled=state.busy||state.readOnly||state.recovering;")
s=s.replace("if (state.busy || doc !== state.document) return;", "if (state.busy || state.readOnly || state.recovering || doc !== state.document) return;")
s=s.replace("original.disabled=state.busy;", "original.disabled=state.busy;")
s=s.replace("review.disabled=state.busy;", "review.disabled=state.busy||state.readOnly||state.recovering;")
s=s.replace("review.onclick=async()=>{block.userReviewed", "review.onclick=async()=>{if(state.readOnly||state.recovering)return;block.userReviewed")
s=s.replace("input.disabled=state.busy;", "input.disabled=state.busy||state.readOnly||state.recovering;")
s=s.replace("apply.disabled=state.busy;", "apply.disabled=state.busy||state.readOnly||state.recovering;")
s=s.replace("setBusy(true);notice('');\n  try{\n    await flushEdits();", "setBusy(true);notice('');state.controller=new AbortController();const signal=state.controller.signal;\n  try{\n    await flushEdits();")
s=s.replace("config:state.config},kind,p=>progress('MENYIMPAN HASIL','Menyusun berkas unduhan…',p));", "config:state.config,build:BUILD_INFO},kind,p=>progress('MENYIMPAN HASIL','Menyusun berkas unduhan…',p),{signal});")
s=s.replace("}catch(error){notice(`Unduhan gagal: ${escapedError(error)}`,'error');}\n  finally{setBusy(false);", "}catch(error){notice(signal.aborted?'Ekspor dihentikan; tidak ada unduhan yang diluncurkan.':`Unduhan gagal: ${escapedError(error)}`,signal.aborted?'':'error');}\n  finally{state.controller=null;setBusy(false);")
s=s.replace("await flushEdits();await checkpoint.deleteCheckpoint();", "await flushEdits();\n    if(!state.token){const info=await checkpoint.getCheckpointInfo();if(info)state.token=await checkpoint.claimCheckpoint(info);}\n    if(state.token)await checkpoint.deleteCheckpoint(state.token);")
s=s.replace("partialPages:[],saveEnabled:true", "partialPages:[],saveEnabled:true,token:null,dirty:false,readOnly:false,recovering:false,config:null,translator:null")
s=s.replace("releaseDocumentLock();$('file-card').hidden=true;", "releaseDocumentLock();$('block-list').replaceChildren();$('result-page').replaceChildren();\n    for(const id of ['file-name','file-meta','result-summary','qa-summary','resume-description','preview-label','preview-status','progress-title','progress-detail'])$(id).textContent='';\n    $('pdf-canvas').width=0;$('pdf-canvas').height=0;$('pdf-password').value='';$('glossary').value='';$('source-preview').open=false;\n    $('file-card').hidden=true;")
s=s.replace("if(state.busy||state.pendingEdits.size)", "if(state.busy||state.pendingEdits.size||state.dirty)")
s=s.replace("window.addEventListener('pagehide',()=>{state.controller?.abort();state.translator?.cancel();releaseDocumentLock();});", """window.addEventListener('pagehide',()=>{state.recovering=true;state.controller?.abort();state.previewController?.abort();state.translator?.cancel();releaseDocumentLock();});
window.addEventListener('pageshow',async event=>{
  if(!event.persisted)return;
  state.recovering=true;setBusy(false);
  try{
    if(!state.file){state.recovering=false;return;}
    await flushEdits();
    if(!await acquireDocumentLock())throw new Error('Pekerjaan sedang digunakan di tab lain. Salinan ini hanya dapat ditinjau atau diunduh.');
    if(state.token)state.token=await checkpoint.claimCheckpoint(state.token);
    state.recovering=false;state.readOnly=false;
    notice('Kepemilikan pekerjaan diperiksa kembali. Hasil yang belum tersimpan tetap perlu disimpan atau diunduh.');
  }catch(error){state.readOnly=true;state.saveEnabled=false;state.dirty=true;releaseDocumentLock();notice(escapedError(error),'error');}
  finally{state.recovering=false;setBusy(false);renderResults();}
});
const retrySaveButton=node('button','button secondary small','Coba simpan progres kembali');retrySaveButton.id='retry-save';retrySaveButton.hidden=true;retrySaveButton.onclick=retrySave;$('file-card').append(retrySaveButton);""")
p.write_text(s)
