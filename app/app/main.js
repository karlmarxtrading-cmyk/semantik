import * as checkpoint from './storage.js';
import {BUILD_INFO} from './build-info.js';
import {detectMetadataLanguage} from './metadata-language.js';
import {STREAM_PAGE_THRESHOLD,countBlocks,replaceCounts,zeroCounts,streamSummary,streamPreflight,processLongDocument,releaseModelCacheForCheckpoint} from './long-document.js';

const $ = id => document.getElementById(id);
const state = {file: null, pdf: null, document: null, busy: false, controller: null, translator: null,
  page: 1, previewPage: 1, previewController: null, saveEnabled: true, savedInfo: null, status: 'empty',
  config: null, signature: '', releaseLock: null, previewQueue: Promise.resolve(), saveQueue: Promise.resolve(), runId: 0,
  transitioning: false, pendingEdits: new Set(), partialPages: [], token: null, prior:null, dirty: false, pendingSaves: 0, exportUrls:new Set(), readOnly: false, recovering: false};
const editRevisions = new WeakMap();
const TYPES = {heading:'Judul',paragraph:'Paragraf',table:'Tabel',formula:'Rumus',reference:'Referensi',caption:'Keterangan gambar',image:'Gambar',footnote:'Catatan kaki'};
const readonlyTypes = new Set(['formula', 'reference', 'image']);
const escapedError = error => String(error?.message || error).replace(/^Error:\s*/, '');
const issuesOf = value => (value || []).map(x => typeof x === 'string' ? x : String(x.message || x.code || 'Perlu diperiksa.'));
const unique = list => [...new Set(list.filter(Boolean))];
const node = (tag, className = '', text = '') => { const e = document.createElement(tag); if (className) e.className = className; e.textContent = text; return e; };
const isReviewed = block => Boolean(block.userReviewed);
const needsReview = block => !isReviewed(block) && (block.status === 'review' || (block.issues?.length || 0) > 0 || !Object.hasOwn(block, 'target'));
const hasTarget = block => Object.hasOwn(block, 'target') && typeof block.target === 'string' && (!block.text?.trim() || Boolean(block.target.trim()));
function notice(text, kind = '') { if(state.dirty && kind !== 'error'){text='Perubahan belum tersimpan di browser. Unduh hasil sebelum menutup tab, atau coba simpan kembali. '+text;kind='';} $('notice').textContent = text; $('notice').className = `notice ${kind}`; $('notice').hidden = !text; }
function bytes(value) { return value >= 1024*1024 ? `${(value / 1024 / 1024).toFixed(1)} MiB` : `${Math.ceil(value / 1024)} KiB`; }
const retryable = block => !block.userReviewed && block.status!=='edited' && block.retryable!==false && (block.retryable || block.sourcePreserved || ['failed','rejected'].includes(block.outcome));
const completed = block => hasTarget(block) && !retryable(block);
function stats() {
  if(state.document?.streaming)return replaceCounts(state.document.counts,state.document.visibleCounts,countBlocks(state.document.blocks));
  const blocks=(state.document||state.prior?.document)?.blocks||[], counts={total:blocks.length,translated:0,preserved:0,rejected:0,failed:0,pending:0,review:0};
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
  streaming:Boolean(state.document?.streaming),sourceSha256:state.pdf?.sourceSha256,committedPageCount:state.document?.committedPageCount, status: state.status, config: state.config, signature: state.signature, page: state.page, progress: stats(), revision: BUILD_INFO.release, build:BUILD_INFO,
  offlineCacheWarning:state.offlineCacheWarning||null,storageRecoveries:(state.storageRecoveries||[]).slice(-5),storageFailures:(state.storageFailures||[]).slice(-5),documentInfo: state.document ? {sourceLanguage: state.document.sourceLanguage, targetLanguage: state.document.targetLanguage, warnings: state.document.warnings} : null}; }
function refreshSaveStatus(){displayFile();const button=$('retry-save');if(button){button.hidden=!state.dirty;button.disabled=state.busy||state.recovering||state.readOnly;}}
async function save(action) {
  if (!state.saveEnabled || state.readOnly || state.recovering) {if(state.document?.streaming&&!state.readOnly&&!state.recovering&&state.document.pages[0])state.unsavedPage={id:state.document.pages[0].number,page:state.document.pages[0],assets:state.document.assets||[]};state.dirty=true;refreshSaveStatus();return false;}
  state.dirty=true;state.pendingSaves++;
  let succeeded=false;
  const saving=state.saveQueue.then(async()=>{
    if(!state.saveEnabled||state.readOnly||state.recovering)return;
    try{await action();}
    catch(error){
      if(error?.name!=='QuotaExceededError'||!state.saveEnabled||state.readOnly||state.recovering)throw error;
      // The failed IDB transaction has rolled back. Only re-downloadable model
      // Responses may be evicted; retry this exact atomic mutation once.
      let released;
      try{released=await releaseModelCacheForCheckpoint({cacheStorage:globalThis.caches,translator:state.translator});}catch{throw error;}
      if(!released.removedEntries)throw error;
      state.offlineCacheWarning=released.warning;
      const recovery={cause:'QuotaExceededError',removedModelEntries:released.removedEntries,retryCount:1,succeeded:false,page:state.page,at:new Date().toISOString()};state.storageRecoveries=[...(state.storageRecoveries||[]),recovery].slice(-5);
      if(state.document){state.document.offlineCacheWarning=released.warning;state.document.warnings=unique([...issuesOf(state.document.warnings),released.warning]);}
      $('offline-status').textContent=released.warning;
      notice('Ruang model unduhan dibebaskan untuk menyimpan dokumen. Mesin tetap berjalan pada sesi ini; offline belum siap.');
      // Let quota bookkeeping settle after Cache API deletions. Never loop.
      await new Promise(resolve=>setTimeout(resolve,100));
      if(!state.saveEnabled||state.readOnly||state.recovering)throw error;
      await action();recovery.succeeded=true;
    }
    succeeded=true;
  });
  state.saveQueue=saving.catch(error=>{
    state.saveEnabled=false;
    if(error?.name==='InvalidStateError')state.readOnly=true;
    const diagnostic={name:String(error?.name||'StorageError'),message:String(error?.message||error).slice(0,500),page:state.page,stage:state.status,at:new Date().toISOString()};
    state.storageFailures=[...(state.storageFailures||[]),diagnostic].slice(-5);
    const reason=diagnostic.name==='QuotaExceededError'?'Browser menolak penulisan karena kuota penyimpanan (QuotaExceededError).':diagnostic.name==='SecurityError'?'Akses penyimpanan ditolak oleh browser (SecurityError).':diagnostic.name==='InvalidStateError'?'Kepemilikan checkpoint berubah (InvalidStateError).':`Penyimpanan lokal gagal (${diagnostic.name}).`;
    notice(`${reason} Hasil layar tetap tersedia; unduh sebelum menutup tab. Coba simpan kembali setelah kendala penyimpanan pulih.`,'error');
    console.warn('Local checkpoint unavailable:',JSON.stringify(diagnostic));
  }).finally(()=>{state.pendingSaves--;if(succeeded&&state.saveEnabled&&!state.pendingSaves)state.dirty=false;refreshSaveStatus();});
  await state.saveQueue;return succeeded;
}
async function retrySave(){
  if(state.busy||state.transitioning||state.readOnly||!state.file)return;
  state.transitioning=true;setBusy(true);
  try{
    await flushEdits();
    if(!navigator.locks)throw new Error('Penyimpanan aman memerlukan penguncian tab. Unduh hasil dan gunakan browser yang mendukung Web Locks.');
    if(!await acquireDocumentLock())throw new Error('Tutup bacaan di tab lain sebelum mencoba menyimpan kembali.');
    if(!state.token){state.token=await checkpoint.createCheckpoint(state.file,meta());}
    if(state.document?.streaming){state.document.counts=stats();if(state.unsavedPage){state.unsavedPage.page.summary=countBlocks(state.unsavedPage.page.blocks);await checkpoint.commitPage(state.unsavedPage,streamSummary(state.document),meta(),state.token);}await persistBlock(null);await checkpoint.saveStreamSummary(streamSummary(state.document),meta(),state.token);}else await checkpoint.saveSnapshot({document:state.document,partialPages:state.partialPages,meta:meta(),prior:state.prior},state.token);
    state.unsavedPage=null;if(state.document?.streaming)state.document.savedPageCount=state.document.committedPageCount;state.saveEnabled=true;state.dirty=false;notice('Seluruh progres layar berhasil disimpan kembali.','success');
  }catch(error){state.saveEnabled=false;state.dirty=true;notice(`Progres belum tersimpan: ${escapedError(error)}`,'error');}
  finally{state.transitioning=false;setBusy(false);refreshSaveStatus();}
}
async function persistBlock(block) {
  if(!state.document?.streaming)return checkpoint.saveBlock(block,state.token);
  const doc=state.document,page=doc.pages[0];
  if(!page)return checkpoint.saveStreamSummary(streamSummary(doc),meta(),state.token);
  doc.counts=stats();page.summary=countBlocks(page.blocks);doc.visibleCounts={...page.summary};
  const record={id:page.number,page,assets:doc.assets||[]};state.unsavedPage=record;
  await checkpoint.commitPage(record,streamSummary(doc),meta(),state.token);
  if(state.unsavedPage===record)state.unsavedPage=null;
}
async function flushEdits() {
  while (state.pendingEdits.size) await Promise.allSettled([...state.pendingEdits]);
  await state.saveQueue;
}
function repairStoredTable(block){
  if(block.type!=='table')return false;
  let changed=false;
  if((block.editedAt||block.status==='edited')&&Array.isArray(block.translatedRows)){delete block.translatedRows;changed=true;}
  const sourceCorrected=block.sourceEditedAt||(typeof block.originalText==='string'&&block.originalText!==block.text);
  if(sourceCorrected&&Array.isArray(block.rows)){
    if(!Array.isArray(block.originalRows))block.originalRows=structuredClone(block.rows);
    if(!block.originalCellBboxes&&block.cellBboxes)block.originalCellBboxes=structuredClone(block.cellBboxes);
    delete block.rows;delete block.translatedRows;block.tableTextEdited=true;block.translatable=true;changed=true;
    if(hasTarget(block)&&!block.editedAt&&!block.userReviewed){
      block.invalidatedTableResult={target:block.target,status:block.status,engine:block.engine,reason:'Source correction was not represented by stored cell rows.'};
      for(const key of ['target','status','outcome','retryable','engine','diagnostics'])delete block[key];block.sourcePreserved=false;block.semanticVerified=false;
    }
    block.sourceIssues=unique([...issuesOf(block.sourceIssues),'Koreksi tabel dipulihkan sebagai teks utuh; susunan sel sumber lama tidak digunakan untuk menerjemahkan koreksi.']);
    block.issues=unique([...issuesOf(block.issues),...block.sourceIssues]);
  }
  return changed;
}
function connectPageBlocks(doc) {
  const blocks = new Map(doc.blocks.map(block => [block.id, block]));
  for (const page of doc.pages || []) page.blocks = (page.blocks || []).map(block => blocks.get(block.id) || block);
}
function editBlock(block, value, doc) {
  if(state.readOnly||state.recovering||doc!==state.document)return;
  state.dirty=true;refreshSaveStatus();
  const revision = (editRevisions.get(block) || 0) + 1; editRevisions.set(block, revision);
  block.target = value; block.status = 'edited'; block.editedAt = new Date().toISOString();
  if(block.type==='table')delete block.translatedRows;
  const editIssues=block.type==='table'?['Tabel hasil diedit sebagai teks; susunan sel perlu dicocokkan dengan tabel sumber.']:[];
  if (!value.trim() && block.text?.trim()) state.status = 'paused';
  block.userReviewed = false; block.semanticVerified = false; block.sourcePreserved = false; block.outcome='translated'; block.retryable=false;
  block.issues = unique([...issuesOf(block.sourceIssues),...editIssues, 'Perubahan Anda menunggu pemeriksaan otomatis.']);
  updateExportButtons();
  let pending;
  pending = (async () => {
    const {auditTranslation} = await import('./translation.js');
    if (doc !== state.document || editRevisions.get(block) !== revision) return;
    block.issues = unique([...issuesOf(block.sourceIssues),...editIssues, ...issuesOf(auditTranslation(block.text || '', value))]);
    if (!value.trim() && block.text?.trim()) block.issues.push('Hasil terjemahan kosong.');
    await save(() => persistBlock(block));
    if (doc === state.document) await save(() => checkpoint.saveCheckpointMeta(meta(),state.token));
  })().catch(error => {
    if (doc === state.document && editRevisions.get(block) === revision) {
      block.issues = unique([...issuesOf(block.sourceIssues), 'Perubahan belum dapat diperiksa otomatis.']);
      notice(`Perubahan tetap tersedia di layar. Pemeriksaan belum selesai: ${escapedError(error)}`, 'error');
    }
  }).finally(() => state.pendingEdits.delete(pending));
  state.pendingEdits.add(pending);
}
async function correctSource(block, value, doc) {
  if (state.busy || state.transitioning || state.readOnly || state.recovering || doc !== state.document) return;
  const text = value.trim();
  if (!text) { notice('Koreksi sumber tidak boleh kosong. Cocokkan teks dengan halaman PDF asli.', 'error'); return; }
  if (text.length > 20000) { notice('Satu koreksi sumber dibatasi 20.000 karakter.', 'error'); return; }
  if (text === block.text) return;
  state.transitioning = true; setBusy(true);
  try {
    await flushEdits();
    if (doc !== state.document) return;
    editRevisions.set(block, (editRevisions.get(block) || 0) + 1);
    if (!Object.hasOwn(block, 'originalText')) block.originalText = block.text;
    block.text = text; block.sourceEditedAt = new Date().toISOString();
    if(block.type==='table'){
      if(!Array.isArray(block.originalRows)&&Array.isArray(block.rows))block.originalRows=structuredClone(block.rows);
      if(!block.originalCellBboxes&&block.cellBboxes)block.originalCellBboxes=structuredClone(block.cellBboxes);
      delete block.rows;delete block.translatedRows;block.tableTextEdited=true;block.translatable=true;
    }
    for (const key of ['target','status','editedAt','userReviewed','reviewedAt','engine','outcome','retryable','diagnostics','translatedRows']) delete block[key];
    block.semanticVerified = false; block.sourcePreserved = false;
    block.sourceIssues = unique([...issuesOf(block.sourceIssues), 'Teks sumber dikoreksi oleh pengguna; cocokkan dengan halaman PDF asli.',...(block.tableTextEdited?['Koreksi tabel digunakan sebagai teks utuh; susunan sel asli tetap pada provenance dan citra PDF, bukan hasil koreksi.']:[])]);
    block.issues = [...block.sourceIssues]; state.status = 'paused';
    const sourceSaved=await save(() => persistBlock(block));const metaSaved=await save(() => checkpoint.saveCheckpointMeta(meta(),state.token));
    notice(sourceSaved&&metaSaved?'Koreksi sumber disimpan. Lanjutkan penerjemahan untuk memperbarui bagian ini; hasil bagian lain tetap tersedia.':'Koreksi sumber hanya tersedia di layar. Coba simpan kembali atau unduh paket lengkap sebelum menutup tab.',sourceSaved&&metaSaved?'success':'error');
  } finally { state.transitioning = false; setBusy(false); renderResults(); }
}
async function acquireDocumentLock() {
  if (state.releaseLock) return true;
  if (!navigator.locks) { state.saveEnabled = false;state.dirty=true; notice('Browser ini tidak mendukung penguncian tab. Progres hanya bertahan selama tab terbuka; unduh hasil sebelum menutupnya.'); return true; }
  return new Promise((resolve, reject) => {
    navigator.locks.request('semantik-pdf-document-v1', {ifAvailable: true}, async lock => {
      if (!lock) { resolve(false); return; }
      const held = new Promise(release => { state.releaseLock = release; });
      resolve(true); await held;
    }).catch(reject);
  });
}
function releaseDocumentLock() { state.releaseLock?.(); state.releaseLock = null; }
async function confirmAction(message, title = 'Ganti bacaan?') {
  $('confirm-title').textContent = title; $('confirm-message').textContent = message;
  const dialog = $('confirm-dialog'); dialog.returnValue = ''; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), {once:true}));
}
async function password(reason) {
  const dialog = $('password-dialog');
  $('password-message').textContent = reason === 'incorrect' ? 'Kata sandi belum cocok. Silakan coba kembali.' : 'Masukkan kata sandi untuk membaca dokumen di perangkat Anda. Kata sandi tidak disimpan.';
  $('pdf-password').value = ''; dialog.returnValue = ''; dialog.showModal(); $('pdf-password').focus();
  return new Promise(resolve => dialog.addEventListener('close', () => {
    const value = dialog.returnValue === 'open' ? $('pdf-password').value : null;
    $('pdf-password').value = ''; resolve(value);
  }, {once:true}));
}
function readConfig() {
  const entries = $('glossary').value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (entries.length > 100) throw new Error('Glosarium dibatasi 100 pasangan istilah.');
  const seen = new Set();
  const glossary = entries.map((line, index) => {
    const match = line.match(/^(.+?)\s*=\s*(.+)$/);
    if (!match || !match[1].trim() || !match[2].trim()) throw new Error(`Format glosarium baris ${index + 1}: tulis istilah sumber = terjemahan.`);
    const source = match[1].trim(), target = match[2].trim();
    if (source.length > 120 || target.length > 120) throw new Error(`Istilah pada baris ${index + 1} terlalu panjang (maksimal 120 karakter).`);
    if (seen.has(source.toLocaleLowerCase())) throw new Error(`Istilah glosarium berulang: ${source}`);
    seen.add(source.toLocaleLowerCase()); return {source,target};
  });
  return {target: $('target-language').value, source: $('source-language').value,
    layout: $('layout-mode').value === 'two' ? 'columns' : $('layout-mode').value, glossary};
}
function fillConfig(config) {
  if (!config) return;
  $('target-language').value = config.targetMode || config.target || 'auto'; $('source-language').value = config.source || 'auto';
  $('layout-mode').value = config.layout === 'columns' ? 'two' : config.layout || 'auto';
  $('glossary').value = (config.glossary || []).map(x => `${x.source} = ${x.target}`).join('\n');
}
function setBusy(value) {
  state.busy = value; document.body.classList.toggle('busy', value);
  for (const id of ['pdf-input','target-language','source-language','layout-mode','glossary','remove-file','resume-button','discard-button','offline-button','clear-models','clear-document']) $(id).disabled = value;
  $('translate-button').disabled = value || !state.file;
  $('extract-button').disabled = value || !state.file;
  $('cancel-button').disabled = !value;
  if (!value) $('translate-button').firstElementChild.textContent = stats().done ? 'Lanjutkan / terjemahkan ulang' : 'Terjemahkan';
  for (const e of $('block-list').querySelectorAll('textarea,button')) e.disabled = value||state.readOnly||state.recovering;
  refreshSaveStatus();
  updateExportButtons();
}
function updateExportButtons() {
  const available = Boolean((state.document||state.prior?.document)?.blocks?.length);
  for (const id of ['download-source','download-zip']) $(id).disabled = state.busy || !available;
  if(state.document?.streaming)$('download-zip').disabled=state.busy||!available||state.document.committedPageCount>STREAM_PAGE_THRESHOLD;
  const summary=stats();
  for (const id of ['download-translation','download-bilingual']) $(id).disabled = state.busy || !summary.done;
  $('download-translation').textContent=state.status==='complete'&&!summary.rejected&&!summary.failed&&!summary.pending?'Unduh hasil .md':'Unduh hasil parsial .md';
}
function progress(stage, title, value, detail = '') {
  $('progress-panel').hidden = false; $('progress-stage').textContent = stage;
  $('progress-title').textContent = title; $('progress-detail').textContent = detail;
  if (Number.isFinite(value)) $('job-progress').value = Math.min(100,Math.max(0,value));
  else $('job-progress').removeAttribute('value');
}
function connection() { $('connection-label').textContent = navigator.onLine ? 'Online' : 'Offline'; }
function displayFile() {
  const shown = Boolean(state.file); $('file-card').hidden = !shown; $('source-preview').hidden = !shown || !state.pdf;
  if (!shown) return;
  $('file-name').textContent = state.file.name;
  $('file-meta').textContent = `${bytes(state.file.size)}${state.pdf ? ` · ${state.pdf.numPages} halaman` : ''} · ${state.readOnly?'Salinan hanya baca — pekerjaan berubah':state.dirty?'BELUM TERSIMPAN — unduh sebelum menutup tab':state.saveEnabled?'Progres disimpan lokal':'Sesi lokal sementara'}`;
  $('preview-total').textContent = `/ ${state.pdf?.numPages || '?'}`;
  $('preview-page').max = String(state.pdf?.numPages || 1);
}
async function openSession(file, signal) {
  const {openPdf} = await import('./pdf-reader.js');
  return openPdf(file, {signal, onPassword: password, onProgress: p => progress('MEMBACA PDF', p.label || 'Membuka dokumen…', undefined, 'File diproses di perangkat Anda.')});
}
async function selectFile(file) {
  if (!file || state.busy || state.transitioning) return;
  state.transitioning = true;
  try { await selectFileNow(file); } finally { state.transitioning = false; }
}
async function selectFileNow(file) {
  if (!file || state.busy) return;
  if (!/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 100*1024*1024) {
    notice(file.size > 100*1024*1024 ? 'PDF melebihi batas 100 MiB.' : 'Pilih satu dokumen PDF asli (.pdf). Format lain tidak dapat dibaca.', 'error'); $('pdf-input').value = ''; return;
  }
  if ((state.file || state.savedInfo) && !await confirmAction('PDF baru akan mengganti progres terakhir di browser ini. Unduh hasil yang ingin Anda simpan terlebih dahulu.')) { $('pdf-input').value = ''; return; }
  if (!await acquireDocumentLock()) { notice('Dokumen sedang terbuka di tab lain. Tutup bacaan di tab tersebut sebelum membuka PDF di sini.', 'error'); return; }
  notice(''); setBusy(true); state.controller = new AbortController();
  let next;
  try {
    const config = readConfig();
    next = await openSession(file, state.controller.signal);
    await flushEdits(); state.previewController?.abort(); await state.previewQueue.catch(() => {});
    await state.pdf?.destroy(); state.translator?.cancel();
    state.file = file; state.pdf = next; state.document = null; state.status = 'selected'; state.signature = ''; state.page = state.previewPage = 1;
    state.config = config; state.savedInfo = null; state.partialPages = [];state.prior=null;state.unsavedPage=null;
    // Quota events belong to this document. The separate offline-status UI
    // remains unchanged until offline readiness is actually requalified.
    state.offlineCacheWarning=null;state.storageRecoveries=[];state.storageFailures=[];
    $('results').hidden = true; $('resume-banner').hidden = true; $('source-preview').open = false; $('progress-panel').hidden = true;
    state.readOnly=false;state.token=null;state.saveEnabled=Boolean(navigator.locks);await save(async()=>{state.token=await checkpoint.createCheckpoint(file,meta());}); displayFile();
  } catch (error) {
    if (next && next !== state.pdf) await next.destroy();
    $('progress-panel').hidden = true;
    notice(error.name === 'AbortError' ? 'Pembukaan PDF dihentikan.' : escapedError(error), error.name === 'AbortError' ? '' : 'error');
    if (!state.file) releaseDocumentLock();
  } finally { state.controller = null; $('pdf-input').value = ''; setBusy(false); }
}
async function resume() {
  if (state.busy || state.transitioning) return;
  state.transitioning = true;
  try { await resumeNow(); } finally { state.transitioning = false; }
}
async function resumeNow() {
  if (state.busy) return;
  if (!await acquireDocumentLock()) { notice('Progres sedang dibuka di tab lain. Tutup tab tersebut lalu coba kembali.', 'error'); return; }
  setBusy(true); state.controller = new AbortController(); notice('');
  try {
    let saved = await checkpoint.loadCheckpoint({lazy:true});
    if(!saved.meta?.streaming)saved=await checkpoint.loadCheckpoint();
    if (!saved.file || !saved.meta) throw new Error('Progres tidak ditemukan. Silakan pilih PDF kembali.');
    state.pdf = await openSession(saved.file, state.controller.signal); state.file = saved.file;
    state.token=navigator.locks?await checkpoint.claimCheckpoint(saved.meta):null;state.readOnly=false;state.saveEnabled=Boolean(navigator.locks);state.dirty=!state.saveEnabled;state.prior=saved.prior||null;
    state.document = saved.document || null; state.config = saved.meta.config; state.signature = saved.meta.signature || '';
    state.status = saved.meta.status || 'selected'; state.page = saved.meta.page || 1; state.previewPage = 1;
    state.offlineCacheWarning=saved.meta.offlineCacheWarning||null;
    state.storageRecoveries=(saved.meta.storageRecoveries||[]).slice(-5);state.storageFailures=(saved.meta.storageFailures||[]).slice(-5);
    if(state.document?.streaming){
      if(state.pdf.sourceSha256!==state.document.sourceSha256)throw new Error('Identitas PDF pada checkpoint tidak cocok.');
      state.document.counts=saved.meta.progress||state.document.counts;
      state.page=Math.min(state.page,state.document.committedPageCount||1);
      const record=await checkpoint.loadPage(state.page,state.token);
      state.document.pages=record?[record.page]:[];state.document.blocks=record?.page?.blocks||[];state.document.assets=record?.assets||[];state.document.visibleCounts=countBlocks(state.document.blocks);
    } else if (state.document) {
      if (saved.meta.documentInfo) Object.assign(state.document, saved.meta.documentInfo);
      const savedBlocks = new Map((saved.savedBlocks || []).map(b => [b.id,b]));
      state.document.blocks = state.document.blocks.map(b => {const restored=savedBlocks.get(b.id)||b;if(hasTarget(restored)&&!restored.resultBuild)restored.resultBuild=saved.meta.build||{release:saved.meta.revision||'unknown'};return restored;});
      const repaired=state.document.blocks.map(repairStoredTable).some(Boolean);
      if(repaired){if(state.document.blocks.some(b=>!hasTarget(b)))state.status='paused';await save(()=>checkpoint.saveSnapshot({document:state.document,partialPages:saved.savedPages||[],meta:meta(),prior:state.prior},state.token));}
      connectPageBlocks(state.document);const {markRepeatedMetadata}=await import('./layout.js');markRepeatedMetadata(state.document);
    }
    state.partialPages = saved.savedPages || [];
    if(!state.document&&state.partialPages.length){const pages=state.partialPages.map(record=>record.page);state.document={schemaVersion:1,fileName:state.file.name,numPages:state.pdf.numPages,metadata:state.pdf.metadata,pages,blocks:pages.flatMap(page=>page.blocks),assets:state.partialPages.flatMap(record=>record.assets||[]),warnings:['Ekstraksi parsial; halaman berikutnya belum selesai.'],extractionComplete:false,committedPageCount:pages.length};}
    if(saved.meta.offlineCacheWarning){state.offlineCacheWarning=saved.meta.offlineCacheWarning;$('offline-status').textContent=state.offlineCacheWarning;if(state.document){state.document.offlineCacheWarning=state.offlineCacheWarning;state.document.warnings=unique([...issuesOf(state.document.warnings),state.offlineCacheWarning]);}}
    fillConfig(state.config); $('resume-banner').hidden = true; $('progress-panel').hidden = true; displayFile(); renderResults();
    notice('Progres dipulihkan. Anda dapat meninjau hasil atau melanjutkan penerjemahan.', 'success');
  } catch (error) { notice(escapedError(error),'error'); if (!state.file) releaseDocumentLock(); }
  finally { state.controller = null; setBusy(false); }
}
async function extract(config, signal) {
  if (state.document && state.document.extractionComplete!==false && state.config?.layout === config.layout) return;
  state.status = 'extracting'; state.document = null; state.config = config;
  const partial = state.partialPages?.filter(p => p.page?.number) || [];
  let startPage = 1;
  const ordered = [...partial].sort((a,b)=>a.page.number-b.page.number);
  while (ordered[startPage-1]?.page.number === startPage) startPage++;
  const reusable = ordered.slice(0,startPage-1);
  const savedPages = [];
  state.signature = '';
  await save(() => checkpoint.beginExtraction(meta(), reusable,state.token,state.prior));
  const extracted = startPage <= state.pdf.numPages ? await state.pdf.extract({signal, layout:config.layout, ocrLanguage:'eng+ind', startPage,
    initialReferenceSection: Boolean(reusable.at(-1)?.page?.referenceSection),
    initialAssets: reusable.flatMap(p=>p.assets||[]),
    initialTextCharacters: reusable.reduce((sum, record) => sum + (record.page.sourceTextCharacters || 0), 0),
    onProgress: p => progress(p.stage === 'ocr' ? 'MEMBACA HASIL SCAN' : 'MEMBACA DOKUMEN', p.label || 'Menyusun halaman…', (p.page - 1) / state.pdf.numPages * 100, `Halaman ${p.page || startPage} dari ${state.pdf.numPages}. Teks dan gambar halaman disimpan bersama.`),
    onPage: async (page, assets) => { savedPages.push({id:page.number,page,assets}); state.partialPages = [...reusable,...savedPages]; await save(() => checkpoint.saveExtractedPage(page,assets,state.token));
      // A later extraction error must not hide already committed pages.
      const pages=state.partialPages.map(record=>record.page);
      state.document={schemaVersion:1,fileName:state.file.name,fileSize:state.file.size,numPages:state.pdf.numPages,metadata:state.pdf.metadata,pages,blocks:pages.flatMap(p=>p.blocks),assets:state.partialPages.flatMap(record=>record.assets),warnings:['Ekstraksi parsial; halaman berikutnya belum selesai.'],extractionComplete:false,committedPageCount:pages.length};
    }
  }) : {fileName:state.file.name,metadata:state.pdf.metadata,numPages:state.pdf.numPages,pages:[],blocks:[],assets:[],warnings:[]};
  if (signal.aborted) throw new DOMException('Dibatalkan','AbortError');
  if (reusable.length) {
    extracted.pages.unshift(...reusable.map(p=>p.page)); extracted.blocks.unshift(...reusable.flatMap(p=>p.page.blocks || []));
    extracted.assets.unshift(...reusable.flatMap(p=>p.assets || [])); extracted.warnings.unshift(...reusable.flatMap(p=>p.page.warnings || []));
  }
  const {validateAssetBudget}=await import('./pdf-reader.js');validateAssetBudget(extracted.assets);
  extracted.sourceItemCount = extracted.pages.reduce((n,p)=>n+(p.sourceItemCount || 0),0);
  extracted.coveredItemCount = extracted.pages.reduce((n,p)=>n+(p.coveredItemCount || 0),0);
  extracted.blocks = extracted.blocks.map(b => ({...b, originalText: b.originalText ?? b.text, sourceIssues: issuesOf(b.issues), issues: issuesOf(b.issues)}));
  if(state.prior?.document){
    const previous=state.prior.document, corrected=previous.blocks.filter(b=>b.sourceEditedAt||b.originalText!==undefined&&b.originalText!==b.text);
    const used=new Set(),mapped=[];
    for(const old of corrected){const candidates=extracted.blocks.filter(b=>!used.has(b.id)&&b.page===old.page&&(b.originalText??b.text)===(old.originalText??old.text));let match=candidates.length===1?candidates[0]:(Array.isArray(old.sourceItemIds)?candidates.find(b=>JSON.stringify(b.sourceItemIds)===JSON.stringify(old.sourceItemIds)):null);if(!match){
        const prior=state.prior;state.document=prior.document;state.config=prior.config;state.signature=prior.signature;state.prior=null;state.partialPages=[];fillConfig(state.config);
        await save(()=>checkpoint.saveSnapshot({document:state.document,partialPages:[],meta:meta()},state.token));
        const error=new Error('Susunan baru belum dapat dicocokkan dengan koreksi sumber. Hasil dan koreksi sebelumnya dipertahankan. Unduh paket sebelum memilih ulang PDF untuk membaca dengan susunan berbeda.');error.restoreConfig=true;throw error;
      }used.add(match.id);mapped.push([match,old]);}
    for(const [block,old]of mapped){block.text=old.text;block.originalText=old.originalText??old.text;block.sourceEditedAt=old.sourceEditedAt;if(old.tableTextEdited||old.type==='table'){block.originalRows=structuredClone(old.originalRows||old.rows||block.rows||[]);if(old.originalCellBboxes||old.cellBboxes)block.originalCellBboxes=structuredClone(old.originalCellBboxes||old.cellBboxes);delete block.rows;delete block.translatedRows;block.tableTextEdited=true;block.translatable=true;}block.sourceIssues=unique([...issuesOf(block.sourceIssues),...issuesOf(old.sourceIssues)]);block.issues=[...block.sourceIssues];}
    extracted.revisionHistory=[...(previous.revisionHistory||[]),{reason:'layout-change',config:state.prior.config,blocks:previous.blocks.filter(b=>b.editedAt||b.userReviewed||b.sourceEditedAt)}];
  }
  connectPageBlocks(extracted);
  const {markRepeatedMetadata}=await import('./layout.js');markRepeatedMetadata(extracted);
  extracted.extractionComplete=true;state.document = extracted;state.prior=null; state.partialPages = []; state.status = 'extracted';
  await save(()=>checkpoint.saveExtraction(extracted,state.token)); await save(()=>checkpoint.clearTranslations(extracted,meta(),state.token));
  state.page = 1; renderResults();
}
async function run(translate) {
  if (state.busy || state.transitioning || state.readOnly || state.recovering || !state.file || !state.pdf) return;
  state.transitioning = true;
  try { await runNow(translate); } finally { state.transitioning = false; }
}
async function runNow(translate) {
  if(state.document?.streaming||(!state.document&&(state.pdf?.numPages>STREAM_PAGE_THRESHOLD||(state.pdf?.sourceSha256&&state.token&&state.saveEnabled))))return runStream(translate);
  if (state.busy || state.readOnly || state.recovering || !state.file || !state.pdf) return;
  let config;
  try { config = readConfig(); } catch(error) { notice(escapedError(error),'error'); $('advanced').open = true; return; }
  if (!translate && state.document && state.document.extractionComplete!==false && state.config?.layout === config.layout) {
    notice('Ekstraksi sumber sudah tersedia. Hasil terjemahan dan koreksi Anda tetap tersedia.', 'success');
    renderResults(); return;
  }
  const signature = JSON.stringify(config);
  if (stats().done && signature !== state.signature && !await confirmAction('Arah bahasa atau pengaturan berubah. Hasil mesin akan diperbarui; koreksi sumber tetap disimpan. Tinjauan dan edit target lama dipindahkan ke riwayat dalam paket lengkap. Unduh hasil terlebih dahulu jika masih diperlukan.','Terjemahkan dengan pengaturan baru?')) return;
  notice(''); setBusy(true); state.controller = new AbortController(); const signal = state.controller.signal;
  const runId = ++state.runId;
  try {
    await flushEdits();
    if(state.config?.layout!==config.layout){state.partialPages=[];if(state.document)state.prior={document:state.document,config:state.config,signature:state.signature};state.document=null;}
    await extract(config, signal);
    if (!translate) { state.status = 'extracted'; notice('Ekstraksi selesai. Anda dapat membaca sumber, memeriksa susunannya, atau menerjemahkannya.', 'success'); return; }
    const module = await import('./translation.js');
    if (signature !== state.signature) {
      const userResults=state.document.blocks.filter(b=>b.editedAt||b.userReviewed).map(b=>structuredClone(b));
      if(userResults.length)state.document.revisionHistory=[...(state.document.revisionHistory||[]),{reason:'translation-config-change',config:state.config,blocks:userResults}];
      for(const block of state.document.blocks){for(const key of ['target','status','userReviewed','reviewedAt','editedAt','outcome','retryable','diagnostics','engine','translatedRows','preservationReason'])delete block[key];block.sourcePreserved=false;block.semanticVerified=false;block.issues=issuesOf(block.sourceIssues);}
      state.config=config;state.signature=signature;
      await save(()=>checkpoint.clearTranslations(state.document,meta(),state.token));
    }
    state.config = config; state.signature = signature;
    const sample = state.document.blocks.filter(b=>b.translatable !== false && !readonlyTypes.has(b.type)).map(b=>b.text).join(' ').slice(0,16000);
    const language = config.source === 'auto' ? module.detectLanguage(sample) : config.source;
    if (language === 'unknown' && sample.trim()) {
      $('advanced').open = true; $('source-language').focus();
      throw new Error('Bahasa sumber belum dapat dikenali dengan cukup jelas. Pilih English atau Bahasa Indonesia pada “Sesuaikan pembacaan”, lalu lanjutkan.');
    }
    if(config.target==='auto')config={...config,targetMode:'auto',target:language==='id'?'en':'id'};
    state.config=config;
    state.document.sourceLanguage = language; state.document.targetLanguage = config.target;
    state.status = 'translating'; await save(()=>checkpoint.saveCheckpointMeta(meta(),state.token));
    const opposite = config.target === 'id' ? 'en' : 'id';
    const direction = `${opposite}-${config.target}`;
    const blockLanguage = block => {
      const metadata = detectMetadataLanguage(block.text || '');
      if (metadata === config.target) return metadata;
      const detected = module.detectLanguage(block.text || '');
      const words = (block.text || '').split(/\s+/).length;
      if (block.type === 'heading' && detected !== 'unknown') return detected;
      if (detected === config.target && words >= 12) return config.target;
      if (config.source === 'auto' && detected !== 'unknown' && words >= 4) return detected;
      return language;
    };
    const detectedLanguages = new Set(state.document.blocks.filter(b=>b.translatable!==false).map(blockLanguage).filter(x=>x!=='unknown'));
    if (detectedLanguages.size > 1) state.document.warnings = unique([...issuesOf(state.document.warnings), 'Dokumen memuat bahasa Indonesia dan Inggris. Bagian yang sudah sesuai bahasa tujuan dipertahankan; periksa judul atau frasa pendek yang belum dapat dikenali.']);
    const needsEngine = state.document.blocks.some(b=>!completed(b)&&b.translatable!==false&&!readonlyTypes.has(b.type)&&b.text?.trim()&&blockLanguage(b)!==config.target);
    if (needsEngine) {
      state.translator ||= new module.Translator();
      progress('MENYIAPKAN BAHASA', 'Menyiapkan mesin di perangkat…', undefined, 'Model diunduh hanya bila salinannya belum tersedia. Isi PDF tetap di perangkat.');
      const prepared=await state.translator.prepare(direction, {signal,onProgress:p=> {
        const loaded = p.done || p.loaded || 0, total = p.total || 0;
        progress('MENYIAPKAN BAHASA','Menyiapkan mesin di perangkat…', total ? loaded/total*100 : undefined, total ? `${bytes(loaded)} / ${bytes(total)} · menyiapkan bahasa` : 'Menyiapkan mesin lokal…');
      }});
      if(prepared?.offlineReady===false){$('offline-status').textContent=prepared.storageWarning||'Model hanya tersedia selama sesi ini; offline belum siap. Hapus model arah lain atau kosongkan penyimpanan lalu siapkan offline kembali.';notice($('offline-status').textContent);}
    }
    const blocks = state.document.blocks;
    for (let i=0;i<blocks.length;i++) {
      if (signal.aborted || state.runId !== runId) throw new DOMException('Dibatalkan','AbortError');
      const block = blocks[i]; if (completed(block)) continue;
      progress('MENERJEMAHKAN JURNAL', `Bagian ${i+1} dari ${blocks.length}`, i/Math.max(1,blocks.length)*100, `Halaman ${block.page} · ${TYPES[block.type] || 'Teks'}. Selesai ${stats().done} bagian.`);
      let result;
      delete block.preservationReason;
      if (block.translatable === false || readonlyTypes.has(block.type) || !block.text?.trim()) {
        result = {text:block.text || '',status:'preserved',issues:[]};
        block.preservationReason = readonlyTypes.has(block.type) ? block.type : !block.text?.trim() ? 'non-text' : 'declared-nontranslatable';
      }
      else if (blockLanguage(block) === config.target) {
        result = {text:block.text,status:'preserved',issues:[]};
        block.preservationReason = detectMetadataLanguage(block.text) === config.target ? 'already-target-metadata' : 'already-target-language';
      }
      else result = await (block.type==='table'&&Array.isArray(block.rows)?state.translator.translateTable.bind(state.translator,block):state.translator.translate.bind(state.translator,block.text))({signal,glossary:config.glossary,onProgress:p=>{
        if (signal.aborted) return;
        const detail = p.label || (p.tokens ? `${p.tokens} token` : 'Memproses kalimat…');
        $('progress-detail').textContent = `Halaman ${block.page} · Bagian ${i+1}/${blocks.length} · ${detail}`;
      }});
      if (signal.aborted) throw new DOMException('Dibatalkan','AbortError');
      delete block.editedAt; delete block.userReviewed; delete block.reviewedAt;
      block.resultBuild=BUILD_INFO;block.target = result.text; block.status = result.status; block.issues = unique([...issuesOf(block.sourceIssues),...issuesOf(result.issues)]);
      block.outcome=result.outcome||(result.status==='preserved'?'preserved':result.sourcePreserved?'rejected':'translated');block.retryable=Boolean(result.retryable);block.diagnostics=result.diagnostics||[];
      if(result.translatedRows)block.translatedRows=result.translatedRows;else delete block.translatedRows;
      block.engine = result.engine || null; block.sourcePreserved = Boolean(result.sourcePreserved); block.semanticVerified = false;
      if (block.issues.length && block.status === 'translated') block.status = 'review';
      await save(()=>persistBlock(block)); await save(()=>checkpoint.saveCheckpointMeta(meta(),state.token));
      if (block.page === state.page) renderResults();
    }
    state.status = stats().rejected||stats().failed||stats().pending?'needs-attention':'complete';
    progress('PEMROSESAN SELESAI','Jurnal siap ditinjau.',100,`${stats().translated} diterjemahkan · ${stats().preserved} dipertahankan · ${stats().rejected} ditolak · ${stats().failed} gagal · ${stats().pending} belum diproses. ${stats().review} perlu ditinjau.`);
    notice(stats().review ? 'Sebagian kandidat belum memenuhi pemeriksaan. Hasil parsial diberi label; sumber dan progres tetap tersimpan.' : 'Pemrosesan selesai. Baca ulang terjemahan, lalu unduh format yang Anda perlukan.', 'success');
  } catch(error) {
    if(state.runId!==runId)return;
    if(error.restoreConfig)config=state.config;
    if (error.name === 'AbortError' || signal.aborted) {
      state.status = 'paused'; progress('DIHENTIKAN','Progres dapat dilanjutkan.',stats().total ? stats().done/stats().total*100 : 0,`${stats().done} bagian selesai. Klik “Lanjutkan / terjemahkan ulang” untuk melanjutkan.`);
      notice('Pemrosesan dihentikan. Bagian yang sudah selesai tetap tersedia.');
    } else { state.status = 'paused'; notice(escapedError(error),'error'); progress('PERLU PERHATIAN','Pemrosesan belum selesai.',undefined,'Hasil yang sudah terbentuk tetap tersedia. Perbaiki kendala, lalu lanjutkan.'); }
  } finally {
    if(state.runId===runId){
    state.config = config; state.controller = null;
    await save(()=>checkpoint.saveCheckpointMeta(meta(),state.token)); setBusy(false); renderResults();
    if (!translate && state.document) $('progress-panel').hidden = true;
    }
  }
}
async function runStream(translate){
  if(state.busy||state.readOnly||state.recovering||!state.file||!state.pdf)return;
  let config;
  try{config=readConfig();}catch(error){notice(escapedError(error),'error');return;}
  const signature=JSON.stringify(config);
  if(stats().done&&signature!==state.signature&&!await confirmAction('Pengaturan berubah. Hasil mesin akan diperbarui per halaman; koreksi sumber dipertahankan dan edit target lama dicatat pada riwayat bagian. Unduh hasil terlebih dahulu bila diperlukan.','Perbarui terjemahan?'))return;
  if(!navigator.locks||!state.token||!state.saveEnabled){notice('Dokumen panjang memerlukan penyimpanan lokal dan penguncian tab. Pulihkan izin atau ruang penyimpanan, lalu coba simpan kembali sebelum melanjutkan.','error');return;}
  notice('');setBusy(true);state.controller=new AbortController();const signal=state.controller.signal,operationId=++state.runId;
  try{
    await flushEdits();
    progress('MEMERIKSA PERANGKAT','Memeriksa ruang perangkat…',undefined,`${state.pdf.numPages} halaman · satu halaman diproses dan disimpan setiap langkah.`);
    const preflight=await streamPreflight({file:state.file,pdf:state.pdf});
    state.config=config;state.signature=signature;state.status=translate?'translating':'extracting';
    const module=translate?await import('./translation.js'):null;
    const result=await processLongDocument({pdf:state.pdf,file:state.file,document:state.document,config,translate,translationModule:module,build:BUILD_INFO,signal,translator:state.translator,
      loadPage:number=>checkpoint.loadPage(number,state.token),
      onTranslator:translator=>{state.translator=translator;},
      onVisible:(doc,record)=>{preflight.sampledPage=record.page.number;preflight.scanIndication=record.page.source==='ocr'?'scan':record.page.source==='mixed'?'mixed':'digital-or-unknown';doc.preflight=preflight;state.document=doc;state.page=record.page.number;},
      commit:async(record,summary)=>{
        summary.preflight=preflight;summary.savedPageCount=summary.committedPageCount;
        const succeeded=await save(()=>checkpoint.commitPage(record,summary,meta(),state.token));
        if(!succeeded){state.unsavedPage=record;const reason=state.storageFailures?.at(-1)?.name||'StorageError';throw new Error(`Penyimpanan halaman ditolak browser (${reason}). Pemrosesan dijeda agar hasil sebelumnya aman. Unduh hasil yang tersedia atau pulihkan penyimpanan lalu coba simpan kembali.`);}
        state.unsavedPage=null;
      },
      onProgress:p=>{
        if(signal.aborted||state.runId!==operationId)return;
        const total=p.totalPages||p.total||state.pdf.numPages;
        const percent=p.stage==='model'?undefined:((p.page||1)-1)/state.pdf.numPages*100;
        const safe=state.document?.savedPageCount||0;
        const eta=Number.isFinite(p.etaMs)?` · perkiraan tersisa ${Math.ceil(p.etaMs/60000)} menit`:'';
        progress(p.stage==='ocr'?'MEMBACA SCAN':p.stage==='model'?'MENYIAPKAN BAHASA':p.stage==='extract'?'MEMBACA PDF':'MENERJEMAHKAN',p.label||`Halaman ${p.page||1} dari ${state.pdf.numPages}`,percent,`${safe} halaman aman tersimpan · ${stats().done} bagian selesai${eta}`);
        if(p.stage==='page-complete')renderResults();
      }});
    state.document=result.document;state.translator=result.translator||state.translator;
    state.status=translate?(stats().pending||stats().rejected||stats().failed||state.document.coverageIncompletePages||state.document.mathUncertainPages?'needs-attention':'complete'):'extracted';
    await save(()=>checkpoint.saveStreamSummary(streamSummary(state.document),meta(),state.token));
    progress('PEMROSESAN SELESAI',`${state.document.committedPageCount} halaman tersedia`,100,`${stats().translated} diterjemahkan · ${stats().preserved} dipertahankan · ${stats().pending+stats().rejected+stats().failed} belum tuntas.`);
    notice(translate?'Pemrosesan halaman selesai. Unduh satu Markdown; bagian yang belum memenuhi pemeriksaan tetap ditandai.':'Seluruh sumber tersimpan. Anda dapat mengunduh satu Markdown sumber atau mulai menerjemahkan.','success');
  }catch(error){
    if(operationId!==state.runId)return;
    state.status='paused';
    notice(signal.aborted?'Pemrosesan dijeda. Halaman yang sudah tersimpan dapat ditinjau dan diunduh.':escapedError(error),signal.aborted?'':'error');
    progress('DIJEDA','Hasil yang tersedia tetap dapat diunduh.',undefined,`${state.document?.savedPageCount||0} halaman aman tersimpan. Lanjutkan setelah kendala selesai.`);
  }finally{
    if(operationId===state.runId){state.controller=null;await save(()=>state.document?.streaming?checkpoint.saveStreamSummary(streamSummary(state.document),meta(),state.token):checkpoint.saveCheckpointMeta(meta(),state.token));setBusy(false);renderResults();}
  }
}
function renderResults() {
  const doc = state.document||state.prior?.document;
  if (!doc?.blocks?.length) { $('results').hidden = true; updateExportButtons(); return; }
  $('results').hidden = false; const s = stats();
  const maxPage = doc.streaming ? (doc.committedPageCount||1) : (doc.numPages || doc.pages.length);
  state.page = Math.max(1,Math.min(maxPage,state.page));
  if ($('result-page').options.length !== maxPage) {
    $('result-page').replaceChildren(...Array.from({length:maxPage},(_,i)=>{const e=node('option','',String(i+1));e.value=String(i+1);return e;}));
  }
  $('result-page').value=String(state.page);
  $('result-summary').textContent=`${maxPage} halaman · ${s.total} bagian · ${s.translated} diterjemahkan · ${s.preserved} dipertahankan · ${s.rejected} ditolak · ${s.failed} gagal · ${s.pending} belum diproses · ${s.review} perlu ditinjau`;
  $('result-status').textContent=state.status==='complete'?'Pemrosesan selesai':state.status==='extracted'?'Ekstraksi sumber':'Hasil sementara';
  $('result-status').classList.toggle('review',Boolean(s.review));
  const warnings=unique(issuesOf(doc.warnings));
  $('qa-summary').textContent=s.review||warnings.length?`${s.review} bagian bertanda; ${warnings.length} catatan pembacaan halaman. Rumus dan referensi tertentu dipertahankan dari sumber; prosa tabel diterjemahkan per sel. ${warnings.slice(0,2).join(' ')}${warnings.length>2?' Catatan lengkap tersedia dalam laporan QA di paket ZIP.':''}`:'Pemeriksaan struktur tidak menemukan peringatan pada bagian yang telah diproses. Makna ilmiah tetap perlu ditinjau oleh pembaca.';
  $('qa-summary').classList.toggle('attention',Boolean(s.review||warnings.length));
  $('result-status').classList.toggle('review',Boolean(s.review||warnings.length));
  const list=$('block-list');list.replaceChildren();
  let visible=0;
  for(const block of doc.blocks.filter(b=>b.page===state.page)) {
    if($('review-only').checked&&!needsReview(block))continue;
    visible++;
    const repeated=block.runningMetadata&&!block.runningMetadata.firstOccurrence;
    const row=node(repeated?'details':'article','block-row');row.dataset.blockId=block.id;if(repeated)row.append(node('summary','text-button','Metadata tepi halaman berulang — buka untuk memeriksa sumber'));
    const header=node('div','block-header');
    header.append(node('span','block-type',`${TYPES[block.type]||'Teks'} · ${block.id}`));
    let label=block.outcome==='failed'?'Gagal — dapat dicoba ulang':block.sourcePreserved?'Kandidat ditolak — sumber dipertahankan':!hasTarget(block)?'Belum diterjemahkan':isReviewed(block)?'Ditinjau oleh Anda':block.status==='preserved'?'Sumber dipertahankan':needsReview(block)?'Perlu ditinjau':block.editedAt?'Diedit oleh Anda':'Terjemahan mesin';
    header.append(node('span',`block-state${needsReview(block)?' review':''}`,label));
    const columns=node('div','block-columns');
    columns.append(node('p','source-text',block.text||'Elemen visual. Lihat halaman asli.'));
    const target=node('textarea','block-target');target.value=hasTarget(block)?block.target:'';target.placeholder='Hasil terjemahan akan muncul di sini.';
    target.setAttribute('aria-label',`Hasil terjemahan ${block.id}`);target.rows=Math.min(18,Math.max(4,Math.ceil(Math.max(block.text?.length||0,block.target?.length||0)/62)));target.disabled=state.busy||state.readOnly||state.recovering||doc!==state.document;
    target.addEventListener('input',()=>{
      if (state.busy || state.readOnly || state.recovering || doc !== state.document) return;
      editBlock(block,target.value,doc); header.lastElementChild.textContent='Diedit oleh Anda';
    });
    target.addEventListener('change',async()=>{
      if (doc !== state.document) return;
      if (!hasTarget(block) || block.target !== target.value) editBlock(block,target.value,doc);
      await flushEdits();
      if (doc === state.document && !state.busy && !document.activeElement?.classList.contains('block-target')) renderResults();
    });
    columns.append(target);row.append(header,columns);
    if(block.issues?.length)row.append(node('p','block-issues',unique(issuesOf(block.issues)).join(' · ')));
    const actions=node('div','block-actions');
    const original=node('button','text-button','Lihat halaman sumber');original.disabled=state.busy;original.onclick=()=>showPreview(block.page);actions.append(original);
    if(hasTarget(block)){
      const review=node('button','text-button',isReviewed(block)?'Batalkan tanda tinjauan':'Tandai sudah ditinjau');review.disabled=state.busy||state.readOnly||state.recovering||doc!==state.document;
      review.onclick=async()=>{if(state.readOnly||state.recovering)return;block.userReviewed=!block.userReviewed;block.reviewedAt=block.userReviewed?new Date().toISOString():null;await save(()=>persistBlock(block));renderResults();};actions.append(review);
    }
    row.append(actions);list.append(row);
    if (block.text?.trim()) {
      const sourceEditor = node('details','source-correction');
      sourceEditor.append(node('summary','text-button','Koreksi teks sumber'));
      const label = node('label','field-label',`Teks sumber ${block.id}`);
      const input = node('textarea','source-editor'); input.id=`source-edit-${block.id}`;label.htmlFor=input.id;
      input.value=block.text;input.rows=Math.min(12,Math.max(3,Math.ceil(block.text.length/75)));input.maxLength=20000;input.disabled=state.busy||state.readOnly||state.recovering||doc!==state.document;
      const help=node('p','field-hint','Perbaiki hasil pembacaan PDF atau OCR sesuai halaman asli. Hanya terjemahan bagian ini yang akan diulang.');
      const apply=node('button','button secondary small','Simpan koreksi sumber');apply.disabled=state.busy||state.readOnly||state.recovering||doc!==state.document;
      apply.onclick=()=>correctSource(block,input.value,doc);
      sourceEditor.append(label,input,help,apply);row.append(sourceEditor);
    }
    if (block.sourceEditedAt && Object.hasOwn(block,'originalText')) {
      const originalText=node('details','source-original');originalText.append(node('summary','text-button','Lihat teks ekstraksi awal'),node('p','source-text',block.originalText));row.append(originalText);
    }
  }
  $('empty-results').hidden=visible>0;
  $('page-info').textContent=`Halaman ${state.page} dari ${maxPage} · ${visible} bagian ditampilkan`;
  for(const id of ['result-prev','result-prev-bottom'])$(id).disabled=state.page<=1;
  for(const id of ['result-next','result-next-bottom'])$(id).disabled=state.page>=maxPage;
  updateExportButtons();
}
async function resultPage(number){
  if(state.busy||state.transitioning)return;
  if(state.unsavedPage){if(number!==state.unsavedPage.page.number)notice('Halaman ini belum tersimpan. Unduh hasil atau coba simpan progres kembali sebelum berpindah halaman.','error');else renderResults();return;}
  await flushEdits();
  const doc=state.document;
  if(doc?.streaming){
    doc.counts=stats();state.page=Math.max(1,Math.min(doc.committedPageCount||1,number));
    const record=await checkpoint.loadPage(state.page,state.token);
    doc.pages=record?[record.page]:[];doc.blocks=record?.page?.blocks||[];doc.assets=record?.assets||[];doc.visibleCounts=countBlocks(doc.blocks);
  }else state.page=Math.max(1,Math.min(doc?.numPages||1,number));
  renderResults();save(()=>checkpoint.saveCheckpointMeta(meta(),state.token));
}
async function showPreview(number=state.previewPage){
  if(!state.pdf||state.busy||state.transitioning)return;
  state.previewPage=Math.max(1,Math.min(state.pdf.numPages,number));
  $('source-preview').hidden=false;$('source-preview').open=true;$('preview-page').value=String(state.previewPage);
  $('preview-label').textContent=`Halaman ${state.previewPage} dari ${state.pdf.numPages}`;
  $('preview-prev').disabled=state.previewPage<=1;$('preview-next').disabled=state.previewPage>=state.pdf.numPages;
  state.previewController?.abort();const controller=new AbortController();state.previewController=controller;
  const requested=state.previewPage;
  state.previewQueue=state.previewQueue.catch(()=>{}).then(async()=>{
    if(controller.signal.aborted)return;
    $('preview-status').textContent='Menampilkan halaman…';
    try{await state.pdf.renderPage(requested,$('pdf-canvas'),{scale:1.5,signal:controller.signal});if(!controller.signal.aborted)$('preview-status').textContent='Halaman sumber; teks, tabel, dan rumus dapat dibandingkan dengan hasil.';}
    catch(error){if(error.name!=='AbortError'&&!controller.signal.aborted)$('preview-status').textContent=escapedError(error);}
  });
  await state.previewQueue;
}
async function download(kind){
  if(state.busy||state.transitioning||!(state.document||state.prior?.document))return;
  setBusy(true);notice('');state.controller=new AbortController();const signal=state.controller.signal,operationId=++state.runId;
  try{
    await flushEdits();
    let exportDoc=state.document||state.prior?.document;
    if(state.document?.streaming&&kind==='zip'){
      if(state.document.committedPageCount>STREAM_PAGE_THRESHOLD)throw new Error('Paket ZIP dokumen panjang belum tersedia. Unduh satu Markdown sumber, hasil, atau dua bahasa.');
      exportDoc={...streamSummary(state.document),streaming:false,pages:[],blocks:[],assets:[]};let used=0;
      for(let n=1;n<=state.document.committedPageCount;n++){const record=state.unsavedPage?.page.number===n?state.unsavedPage:await checkpoint.loadPage(n,state.token);if(!record)throw new Error(`Halaman ${n} belum tersedia.`);used+=(record.assets||[]).reduce((sum,a)=>sum+a.blob.size,0)+(record.page.sourceTextCharacters||0)*4;if(used>64*1024*1024)throw new Error('Paket bukti melampaui batas memori 64 MiB. Unduh satu Markdown bertahap untuk menyimpan hasil lengkap.');exportDoc.pages.push(record.page);exportDoc.blocks.push(...record.page.blocks);exportDoc.assets.push(...record.assets);}
    }
    if(state.document?.streaming&&kind!=='zip'){
      const {createStreamingMarkdown}=await import('./export.js');
      state.document.counts=stats();
      const blob=await createStreamingMarkdown({document:streamSummary(state.document),pages:(async function*(){for(let n=1;n<=state.document.committedPageCount;n++){if(signal.aborted)throw new DOMException('Dibatalkan','AbortError');const record=state.unsavedPage?.page.number===n?state.unsavedPage:await checkpoint.loadPage(n,state.token);if(!record)throw new Error(`Halaman ${n} belum tersedia.`);yield record;}})(),kind,status:state.status,config:state.config,file:state.file,build:BUILD_INFO,sourceSha256:state.document.sourceSha256,unsavedPages:state.unsavedPage?[state.unsavedPage.page.number]:[],signal,onProgress:p=>progress('MENYIMPAN HASIL','Menyusun satu Markdown…',typeof p==='number'?p:undefined)});
      if(signal.aborted||operationId!==state.runId){await blob.exportCleanup?.();return;}
      const url=URL.createObjectURL(blob);state.exportUrls.add(url);
      const link=node('a');link.href=url;link.download=`${state.file.name.replace(/\.pdf$/i,'').replace(/[^\p{L}\p{N}._-]+/gu,'_')}-${kind}.md`;document.body.append(link);link.click();link.remove();
      setTimeout(()=>{URL.revokeObjectURL(url);state.exportUrls.delete(url);blob.exportCleanup?.().catch(()=>{});},60000);
      notice(`Satu Markdown dibuat dari ${state.document.committedPageCount} halaman tersedia${state.document.committedPageCount<state.document.numPages?' — hasil masih parsial':''}.`,'success');return;
    }
    const {exportDocument}=await import('./export.js');
    const exported=await exportDocument({document:exportDoc,file:state.file,status:state.status,config:state.document?state.config:state.prior.config,build:BUILD_INFO},kind,p=>{if(operationId===state.runId&&!signal.aborted)progress('MENYIMPAN HASIL','Menyusun berkas unduhan…',p);},{signal});if(operationId!==state.runId||signal.aborted)return;if(exported.url)state.exportUrls.add(exported.url);
    notice(kind==='zip'?'Paket lengkap dibuat. Simpan unduhan untuk menyimpan dokumen, aset halaman, dan catatan pemeriksaan.':'Markdown mandiri dibuat; gambar sumber tertanam di dalam berkas. Rumus yang belum pasti tetap berlabel.','success');
  }catch(error){if(operationId!==state.runId)return;notice(signal.aborted?'Ekspor dihentikan; tidak ada unduhan yang diluncurkan.':`Unduhan gagal: ${escapedError(error)}`,signal.aborted?'':'error');}
  finally{if(operationId===state.runId){state.controller=null;setBusy(false);$('progress-panel').hidden=true;renderResults();}}
}
async function clearDocument(){
  if(state.busy||state.transitioning)return;
  state.transitioning=true;
  try{await clearDocumentNow();}finally{state.transitioning=false;}
}
async function clearDocumentNow(){
  if(state.readOnly&&state.file){notice('Salinan ini tidak lagi memiliki checkpoint. Unduh hasilnya, lalu muat ulang untuk membuka pekerjaan aktif; checkpoint tab lain tidak dihapus.','error');return;}
  if((state.file||state.savedInfo)&&!await confirmAction('PDF dan progres terakhir akan dihapus dari browser ini. Berkas yang sudah Anda unduh tetap tersedia.','Hapus dokumen & progres?'))return;
  if(!state.releaseLock&&!await acquireDocumentLock()){notice('Tutup dokumen di tab lain sebelum menghapus progres.','error');return;}
  setBusy(true);
  try{
    await flushEdits();
    if(!state.token){const info=await checkpoint.getCheckpointInfo();if(info)state.token=await checkpoint.claimCheckpoint(info);}
    if(state.token)await checkpoint.deleteCheckpoint(state.token);
    state.previewController?.abort();await state.previewQueue.catch(()=>{});await state.pdf?.destroy().catch(()=>{});state.translator?.cancel();
    Object.assign(state,{file:null,pdf:null,document:null,savedInfo:null,status:'empty',signature:'',partialPages:[],saveEnabled:true,token:null,dirty:false,readOnly:false,recovering:false,config:null,translator:null,prior:null,unsavedPage:null,offlineCacheWarning:null,storageRecoveries:[],storageFailures:[]});
    for(const url of state.exportUrls)URL.revokeObjectURL(url);state.exportUrls.clear();
    releaseDocumentLock();$('block-list').replaceChildren();$('result-page').replaceChildren();
    for(const id of ['file-name','file-meta','result-summary','qa-summary','resume-description','preview-label','preview-status','progress-title','progress-detail'])$(id).textContent='';
    $('pdf-canvas').width=0;$('pdf-canvas').height=0;$('pdf-password').value='';$('glossary').value='';$('source-preview').open=false;
    $('file-card').hidden=true;$('source-preview').hidden=true;$('results').hidden=true;$('resume-banner').hidden=true;$('progress-panel').hidden=true;$('pdf-input').value='';
    notice('Dokumen dan progres sudah dihapus dari browser ini.','success');
  }catch(error){notice(`Dokumen dan progres belum dapat dihapus: ${escapedError(error)}`,'error');}
  finally{setBusy(false);}
}
async function prepareOffline(){
  if(state.busy||state.transitioning)return;
  if(!('serviceWorker'in navigator)){notice('Browser ini belum mendukung penggunaan offline aplikasi.','error');return;}
  setBusy(true);state.controller=new AbortController();const signal=state.controller.signal,operationId=++state.runId;
  try{
    const {prepareOfflineAssets,waitForOfflineWorker}=await import('./offline.js');
    const registration=await waitForOfflineWorker(signal);if(signal.aborted||operationId!==state.runId)throw new DOMException('Dibatalkan','AbortError');
    await prepareOfflineAssets({signal,onProgress:p=>{if(operationId===state.runId&&!signal.aborted)progress('MENYIAPKAN OFFLINE','Menyimpan pembaca PDF dan OCR…',p.done/p.total*100,`${p.done} dari ${p.total} komponen`);}});
    if(signal.aborted||operationId!==state.runId)throw new DOMException('Dibatalkan','AbortError');
    const {Translator}=await import('./translation.js');state.translator ||= new Translator();
    const selected=$('target-language').value;const target=selected==='auto'?state.document?.targetLanguage:selected;if(!target)throw new Error('Pilih dan terjemahkan PDF terlebih dahulu agar bahasa offline dikenali.');const direction=target==='id'?'en-id':'id-en';
    const prepared=await state.translator.prepare(direction,{signal,onProgress:p=>progress('MENYIAPKAN OFFLINE','Menyimpan model bahasa…',p.total?p.done/p.total*100:undefined,p.label||'Model lokal')});
    if(signal.aborted||operationId!==state.runId)throw new DOMException('Dibatalkan','AbortError');
    if(prepared?.offlineReady===false)throw new Error(prepared.storageWarning||'Model berjalan dalam sesi sementara; persiapan offline belum berhasil.');
    const persisted=await navigator.storage?.persist?.().catch(()=>false);
    if(signal.aborted||operationId!==state.runId)throw new DOMException('Dibatalkan','AbortError');
    $('offline-status').textContent=`Pembaca PDF, OCR, dan arah ${direction==='en-id'?'English → Indonesia':'Indonesia → English'} telah disimpan untuk offline.${persisted?' Penyimpanan persisten diizinkan browser.':' Unduh hasil Anda; cache tetap dapat dihapus oleh browser.'}${registration.waiting?' Pembaruan aplikasi menunggu: tutup semua tab website ini, lalu buka kembali sebelum bekerja offline.':''}`;
    if(state.offlineCacheWarning){const previous=state.offlineCacheWarning;state.offlineCacheWarning=null;if(state.document){state.document.offlineCacheWarning=null;state.document.warnings=issuesOf(state.document.warnings).filter(w=>w!==previous);await save(()=>state.document.streaming?checkpoint.saveStreamSummary(streamSummary(state.document),meta(),state.token):checkpoint.saveCheckpointMeta(meta(),state.token));}}
    notice('Persiapan offline selesai untuk arah bahasa yang dipilih. Buka kembali alamat website yang sama untuk menggunakannya.','success');
  }catch(error){if(operationId!==state.runId)return;notice(signal.aborted?'Persiapan offline dihentikan. Komponen yang sudah tersimpan dapat dipakai kembali.':`Persiapan offline belum selesai: ${escapedError(error)}`,signal.aborted?'':'error');}
  finally{if(operationId===state.runId){state.controller=null;setBusy(false);$('progress-panel').hidden=true;}}
}
$('pdf-input').addEventListener('change',event=>selectFile(event.target.files?.[0]));
for(const type of ['dragenter','dragover'])$('drop-zone').addEventListener(type,event=>{event.preventDefault();if(!state.busy)$('drop-zone').classList.add('dragover');});
for(const type of ['dragleave','drop'])$('drop-zone').addEventListener(type,event=>{event.preventDefault();$('drop-zone').classList.remove('dragover');});
$('drop-zone').addEventListener('drop',event=>{if(state.busy)return;const files=[...(event.dataTransfer?.files||[])];if(files.length!==1){notice('Pilih satu jurnal PDF setiap kali.','error');return;}selectFile(files[0]);});
window.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();});
window.addEventListener('drop',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();});
$('translate-button').onclick=()=>run(true);$('extract-button').onclick=()=>run(false);
$('cancel-button').onclick=()=>{state.controller?.abort();state.translator?.cancel();$('cancel-button').disabled=true;};
$('resume-button').onclick=resume;$('discard-button').onclick=clearDocument;$('remove-file').onclick=clearDocument;$('clear-document').onclick=clearDocument;
$('preview-prev').onclick=()=>showPreview(state.previewPage-1);$('preview-next').onclick=()=>showPreview(state.previewPage+1);
$('preview-page').onchange=()=>showPreview(Number($('preview-page').value)||1);
$('source-preview').addEventListener('toggle',()=>{if($('source-preview').open&&state.pdf)showPreview(state.previewPage);});
$('view-source').onclick=()=>showPreview(state.page);
for(const id of ['result-prev','result-prev-bottom'])$(id).onclick=()=>resultPage(state.page-1);
for(const id of ['result-next','result-next-bottom'])$(id).onclick=()=>resultPage(state.page+1);
$('result-page').onchange=()=>resultPage(Number($('result-page').value));$('review-only').onchange=renderResults;
for(const [id,kind] of [['download-source','source'],['download-translation','translation'],['download-bilingual','bilingual'],['download-zip','zip']])$(id).onclick=()=>download(kind);
$('offline-button').onclick=prepareOffline;
$('clear-models').onclick=async()=>{
  if(state.busy||state.transitioning)return;state.transitioning=true;
  try{
    if(!await confirmAction('Model bahasa akan diunduh kembali saat diperlukan. Dokumen dan progres tidak ikut dihapus.','Hapus model lokal?'))return;
    state.translator?.cancel();await caches.delete('semantik-model-v1');
    $('offline-status').textContent='Model lokal dihapus. Persiapkan kembali arah bahasa untuk bekerja offline.';notice('Model bahasa lokal sudah dihapus.','success');
  }catch(error){notice(`Model lokal belum dapat dihapus: ${escapedError(error)}`,'error');}
  finally{state.transitioning=false;}
};
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
window.addEventListener('beforeunload',event=>{if(state.busy||state.pendingEdits.size||state.dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>{state.recovering=true;state.runId++;if(state.busy)state.status='paused';state.controller?.abort();state.previewController?.abort();state.translator?.cancel();releaseDocumentLock();});
window.addEventListener('pageshow',async event=>{
  if(!event.persisted)return;
  state.recovering=true;state.controller=null;setBusy(false);
  try{
    if(!state.file){state.recovering=false;return;}
    await flushEdits();
    if(!navigator.locks)throw new Error('Penyimpanan aman memerlukan penguncian tab. Unduh hasil dan gunakan browser yang mendukung Web Locks.');
    if(!await acquireDocumentLock())throw new Error('Pekerjaan sedang digunakan di tab lain. Salinan ini hanya dapat ditinjau atau diunduh.');
    if(!state.token)throw new Error('Identitas penyimpanan sesi ini belum tersedia. Unduh hasil layar, lalu muat ulang untuk melanjutkan pekerjaan yang tersimpan.');
    state.token=await checkpoint.claimCheckpoint(state.token);
    state.recovering=false;state.readOnly=false;
    notice('Kepemilikan pekerjaan diperiksa kembali. Hasil yang belum tersimpan tetap perlu disimpan atau diunduh.');
  }catch(error){state.readOnly=true;state.saveEnabled=false;state.dirty=true;releaseDocumentLock();notice(escapedError(error),'error');}
  finally{state.recovering=false;setBusy(false);renderResults();}
});
const retrySaveButton=node('button','button secondary small','Coba simpan progres kembali');retrySaveButton.id='retry-save';retrySaveButton.hidden=true;retrySaveButton.onclick=retrySave;$('file-card').append(retrySaveButton);
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('/sw.js',{type:'classic'}).catch(()=>{$('offline-status').textContent='Pemasangan offline belum berhasil. Gunakan HTTPS atau localhost, lalu muat ulang.';});
checkpoint.getCheckpointInfo().then(info=>{if(state.file||state.busy||state.transitioning)return;state.savedInfo=info;if(info){$('resume-banner').hidden=false;$('resume-description').textContent=`${info.filename} · ${info.progress?.done||0} bagian diproses · ${new Date(info.updatedAt).toLocaleString('id-ID')}`;}}).catch(()=>{state.saveEnabled=false;});
if(!window.isSecureContext||typeof Worker==='undefined'||typeof WebAssembly==='undefined'||typeof DecompressionStream==='undefined')notice('Gunakan browser modern melalui HTTPS atau localhost agar pembaca PDF, model lokal, dan penyimpanan offline dapat berjalan.','error');
