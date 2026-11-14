import * as checkpoint from './storage.js';

const $ = id => document.getElementById(id);
const state = {file: null, pdf: null, document: null, busy: false, controller: null, translator: null,
  page: 1, previewPage: 1, previewController: null, saveEnabled: true, savedInfo: null, status: 'empty',
  config: null, signature: '', releaseLock: null, previewQueue: Promise.resolve(), saveQueue: Promise.resolve(), runId: 0,
  transitioning: false, pendingEdits: new Set(), partialPages: []};
const editRevisions = new WeakMap();
const TYPES = {heading:'Judul',paragraph:'Paragraf',table:'Tabel',formula:'Rumus',reference:'Referensi',caption:'Keterangan gambar',image:'Gambar',footnote:'Catatan kaki'};
const readonlyTypes = new Set(['formula', 'table', 'reference', 'image']);
const escapedError = error => String(error?.message || error).replace(/^Error:\s*/, '');
const issuesOf = value => (value || []).map(x => typeof x === 'string' ? x : String(x.message || x.code || 'Perlu diperiksa.'));
const unique = list => [...new Set(list.filter(Boolean))];
const node = (tag, className = '', text = '') => { const e = document.createElement(tag); if (className) e.className = className; e.textContent = text; return e; };
const isReviewed = block => Boolean(block.userReviewed);
const needsReview = block => !isReviewed(block) && (block.status === 'review' || (block.issues?.length || 0) > 0 || !Object.hasOwn(block, 'target'));
const hasTarget = block => Object.hasOwn(block, 'target') && typeof block.target === 'string' && (!block.text?.trim() || Boolean(block.target.trim()));
function notice(text, kind = '') { $('notice').textContent = text; $('notice').className = `notice ${kind}`; $('notice').hidden = !text; }
function bytes(value) { return value >= 1024*1024 ? `${(value / 1024 / 1024).toFixed(1)} MiB` : `${Math.ceil(value / 1024)} KiB`; }
function stats() {
  const blocks = state.document?.blocks || [];
  return {total: blocks.length, done: blocks.filter(hasTarget).length, review: blocks.filter(needsReview).length,
    translated: blocks.filter(b => ['translated', 'edited'].includes(b.status)).length, preserved: blocks.filter(b => b.status === 'preserved').length};
}
function meta() { return {filename: state.file?.name, size: state.file?.size, numPages: state.pdf?.numPages || state.document?.numPages,
  status: state.status, config: state.config, signature: state.signature, page: state.page, progress: stats(), revision: 'CP17',
  documentInfo: state.document ? {sourceLanguage: state.document.sourceLanguage, targetLanguage: state.document.targetLanguage, warnings: state.document.warnings} : null}; }
async function save(action) {
  if (!state.saveEnabled) return;
  const saving = state.saveQueue.then(action);
  state.saveQueue = saving.catch(error => {
    state.saveEnabled = false;
    notice('Penyimpanan progres lokal tidak tersedia. Anda masih dapat bekerja dan mengunduh hasil sebelum menutup tab.');
    console.warn('Local checkpoint unavailable:', error?.name || 'storage error');
  });
  await state.saveQueue;
}
async function flushEdits() {
  while (state.pendingEdits.size) await Promise.allSettled([...state.pendingEdits]);
  await state.saveQueue;
}
function connectPageBlocks(doc) {
  const blocks = new Map(doc.blocks.map(block => [block.id, block]));
  for (const page of doc.pages || []) page.blocks = (page.blocks || []).map(block => blocks.get(block.id) || block);
}
function editBlock(block, value, doc) {
  const revision = (editRevisions.get(block) || 0) + 1; editRevisions.set(block, revision);
  block.target = value; block.status = 'edited'; block.editedAt = new Date().toISOString();
  if (!value.trim() && block.text?.trim()) state.status = 'paused';
  block.userReviewed = false; block.semanticVerified = false; block.sourcePreserved = false;
  block.issues = unique([...issuesOf(block.sourceIssues), 'Perubahan Anda menunggu pemeriksaan otomatis.']);
  updateExportButtons();
  let pending;
  pending = (async () => {
    const {auditTranslation} = await import('./translation.js');
    if (doc !== state.document || editRevisions.get(block) !== revision) return;
    block.issues = unique([...issuesOf(block.sourceIssues), ...issuesOf(auditTranslation(block.text || '', value))]);
    if (!value.trim() && block.text?.trim()) block.issues.push('Hasil terjemahan kosong.');
    await save(() => checkpoint.saveBlock(block));
    if (doc === state.document) await save(() => checkpoint.saveCheckpointMeta(meta()));
  })().catch(error => {
    if (doc === state.document && editRevisions.get(block) === revision) {
      block.issues = unique([...issuesOf(block.sourceIssues), 'Perubahan belum dapat diperiksa otomatis.']);
      notice(`Perubahan tetap tersedia di layar. Pemeriksaan belum selesai: ${escapedError(error)}`, 'error');
    }
  }).finally(() => state.pendingEdits.delete(pending));
  state.pendingEdits.add(pending);
}
async function correctSource(block, value, doc) {
  if (state.busy || state.transitioning || doc !== state.document) return;
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
    for (const key of ['target','status','editedAt','userReviewed','reviewedAt','engine']) delete block[key];
    block.semanticVerified = false; block.sourcePreserved = false;
    block.sourceIssues = unique([...issuesOf(block.sourceIssues), 'Teks sumber dikoreksi oleh pengguna; cocokkan dengan halaman PDF asli.']);
    block.issues = [...block.sourceIssues]; state.status = 'paused';
    await save(() => checkpoint.saveBlock(block)); await save(() => checkpoint.saveCheckpointMeta(meta()));
    notice('Koreksi sumber disimpan. Lanjutkan penerjemahan untuk memperbarui bagian ini; hasil bagian lain tetap tersedia.', 'success');
  } finally { state.transitioning = false; setBusy(false); renderResults(); }
}
async function acquireDocumentLock() {
  if (state.releaseLock) return true;
  if (!navigator.locks) { state.saveEnabled = false; notice('Browser ini tidak mendukung penguncian tab. Progres hanya bertahan selama tab terbuka; unduh hasil sebelum menutupnya.'); return true; }
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
  $('target-language').value = config.target || 'id'; $('source-language').value = config.source || 'auto';
  $('layout-mode').value = config.layout === 'columns' ? 'two' : config.layout || 'auto';
  $('glossary').value = (config.glossary || []).map(x => `${x.source} = ${x.target}`).join('\n');
}
function setBusy(value) {
  state.busy = value; document.body.classList.toggle('busy', value);
  for (const id of ['pdf-input','target-language','source-language','layout-mode','glossary','remove-file','resume-button','discard-button','offline-button','clear-models','clear-document']) $(id).disabled = value;
  $('translate-button').disabled = value || !state.file;
  $('extract-button').disabled = value || !state.file;
  $('cancel-button').disabled = !value;
  if (!value) $('translate-button').firstElementChild.textContent = stats().done ? 'Lanjutkan / terjemahkan ulang' : 'Terjemahkan jurnal';
  for (const e of $('block-list').querySelectorAll('textarea,button')) e.disabled = value;
  updateExportButtons();
}
function updateExportButtons() {
  const available = Boolean(state.document?.blocks?.length);
  for (const id of ['download-source','download-zip']) $(id).disabled = state.busy || !available;
  for (const id of ['download-translation','download-bilingual']) $(id).disabled = state.busy || !stats().done;
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
  $('file-meta').textContent = `${bytes(state.file.size)}${state.pdf ? ` · ${state.pdf.numPages} halaman` : ''} · ${state.saveEnabled ? 'Progres disimpan lokal' : 'Sesi lokal sementara'}`;
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
    state.config = config; state.savedInfo = null; state.partialPages = [];
    $('results').hidden = true; $('resume-banner').hidden = true; $('source-preview').open = false; $('progress-panel').hidden = true;
    await save(() => checkpoint.createCheckpoint(file, meta())); displayFile();
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
    const saved = await checkpoint.loadCheckpoint();
    if (!saved.file || !saved.meta) throw new Error('Progres tidak ditemukan. Silakan pilih PDF kembali.');
    state.pdf = await openSession(saved.file, state.controller.signal); state.file = saved.file;
    state.document = saved.document || null; state.config = saved.meta.config; state.signature = saved.meta.signature || '';
    state.status = saved.meta.status || 'selected'; state.page = saved.meta.page || 1; state.previewPage = 1;
    if (state.document) {
      if (saved.meta.documentInfo) Object.assign(state.document, saved.meta.documentInfo);
      const savedBlocks = new Map((saved.savedBlocks || []).map(b => [b.id,b]));
      state.document.blocks = state.document.blocks.map(b => savedBlocks.get(b.id) || b);
      connectPageBlocks(state.document);
    }
    state.partialPages = saved.savedPages || [];
    fillConfig(state.config); $('resume-banner').hidden = true; $('progress-panel').hidden = true; displayFile(); renderResults();
    notice('Progres dipulihkan. Anda dapat meninjau hasil atau melanjutkan penerjemahan.', 'success');
  } catch (error) { notice(escapedError(error),'error'); if (!state.file) releaseDocumentLock(); }
  finally { state.controller = null; setBusy(false); }
}
async function extract(config, signal) {
  if (state.document && state.config?.layout === config.layout) return;
  state.status = 'extracting'; state.document = null; state.config = config;
  const partial = state.partialPages?.filter(p => p.page?.number) || [];
  let startPage = 1;
  const ordered = [...partial].sort((a,b)=>a.page.number-b.page.number);
  while (ordered[startPage-1]?.page.number === startPage) startPage++;
  const reusable = ordered.slice(0,startPage-1);
  const savedPages = [];
  state.signature = '';
  await save(() => checkpoint.beginExtraction(meta(), reusable));
  const extracted = startPage <= state.pdf.numPages ? await state.pdf.extract({signal, layout:config.layout, ocrLanguage:'eng+ind', startPage,
    initialReferenceSection: Boolean(reusable.at(-1)?.page?.referenceSection),
    initialTextCharacters: reusable.reduce((sum, record) => sum + (record.page.sourceTextCharacters || 0), 0),
    onProgress: p => progress(p.stage === 'ocr' ? 'MEMBACA HASIL SCAN' : 'MEMBACA DOKUMEN', p.label || 'Menyusun halaman…', (p.page - 1) / state.pdf.numPages * 100, `Halaman ${p.page || startPage} dari ${state.pdf.numPages}. Teks dan gambar halaman disimpan bersama.`),
    onPage: async (page, assets) => { savedPages.push({id:page.number,page,assets}); state.partialPages = [...reusable,...savedPages]; await save(() => checkpoint.saveExtractedPage(page,assets)); }
  }) : {fileName:state.file.name,metadata:state.pdf.metadata,numPages:state.pdf.numPages,pages:[],blocks:[],assets:[],warnings:[]};
  if (signal.aborted) throw new DOMException('Dibatalkan','AbortError');
  if (reusable.length) {
    extracted.pages.unshift(...reusable.map(p=>p.page)); extracted.blocks.unshift(...reusable.flatMap(p=>p.page.blocks || []));
    extracted.assets.unshift(...reusable.flatMap(p=>p.assets || [])); extracted.warnings.unshift(...reusable.flatMap(p=>p.page.warnings || []));
  }
  extracted.sourceItemCount = extracted.pages.reduce((n,p)=>n+(p.sourceItemCount || 0),0);
  extracted.coveredItemCount = extracted.pages.reduce((n,p)=>n+(p.coveredItemCount || 0),0);
  extracted.blocks = extracted.blocks.map(b => ({...b, originalText: b.originalText ?? b.text, sourceIssues: issuesOf(b.issues), issues: issuesOf(b.issues)}));
  connectPageBlocks(extracted);
  state.document = extracted; state.partialPages = []; state.status = 'extracted';
  await save(()=>checkpoint.saveExtraction(extracted)); await save(()=>checkpoint.clearTranslations()); await save(()=>checkpoint.saveCheckpointMeta(meta()));
  state.page = 1; renderResults();
}
async function run(translate) {
  if (state.busy || state.transitioning || !state.file || !state.pdf) return;
  state.transitioning = true;
  try { await runNow(translate); } finally { state.transitioning = false; }
}
async function runNow(translate) {
  if (state.busy || !state.file || !state.pdf) return;
  let config;
  try { config = readConfig(); } catch(error) { notice(escapedError(error),'error'); $('advanced').open = true; return; }
  if (!translate && state.document && state.config?.layout === config.layout) {
    notice('Ekstraksi sumber sudah tersedia. Hasil terjemahan dan koreksi Anda tetap tersimpan.', 'success');
    renderResults(); return;
  }
  const signature = JSON.stringify(config);
  if (stats().done && signature !== state.signature && !await confirmAction('Arah bahasa atau pengaturan berubah. Hasil terjemahan dan koreksi saat ini akan diganti. Unduh hasil terlebih dahulu jika masih diperlukan.','Terjemahkan dengan pengaturan baru?')) return;
  notice(''); setBusy(true); state.controller = new AbortController(); const signal = state.controller.signal;
  const runId = ++state.runId;
  try {
    await flushEdits();
    if (state.config?.layout !== config.layout) { state.partialPages = []; state.document = null; }
    await extract(config, signal);
    if (!translate) { state.status = 'extracted'; notice('Ekstraksi selesai. Anda dapat membaca sumber, memeriksa susunannya, atau menerjemahkannya.', 'success'); return; }
    const module = await import('./translation.js');
    if (signature !== state.signature) {
      for (const block of state.document.blocks) { delete block.target; delete block.status; delete block.userReviewed; delete block.editedAt; block.issues = issuesOf(block.sourceIssues); }
      await save(()=>checkpoint.clearTranslations());
    }
    state.config = config; state.signature = signature;
    const sample = state.document.blocks.filter(b=>b.translatable !== false && !readonlyTypes.has(b.type)).map(b=>b.text).join(' ').slice(0,16000);
    const language = config.source === 'auto' ? module.detectLanguage(sample) : config.source;
    if (language === 'unknown' && sample.trim()) {
      $('advanced').open = true; $('source-language').focus();
      throw new Error('Bahasa sumber belum dapat dikenali dengan cukup jelas. Pilih English atau Bahasa Indonesia pada “Sesuaikan pembacaan”, lalu lanjutkan.');
    }
    state.document.sourceLanguage = language; state.document.targetLanguage = config.target;
    state.status = 'translating'; await save(()=>checkpoint.saveCheckpointMeta(meta()));
    const opposite = config.target === 'id' ? 'en' : 'id';
    const direction = `${opposite}-${config.target}`;
    const blockLanguage = block => {
      const detected = module.detectLanguage(block.text || '');
      const words = (block.text || '').split(/\s+/).length;
      if (block.type === 'heading' && detected !== 'unknown') return detected;
      if (detected === config.target && words >= 12) return config.target;
      if (config.source === 'auto' && detected !== 'unknown' && words >= 6) return detected;
      return language;
    };
    const detectedLanguages = new Set(state.document.blocks.filter(b=>b.translatable!==false).map(blockLanguage).filter(x=>x!=='unknown'));
    if (detectedLanguages.size > 1) state.document.warnings = unique([...issuesOf(state.document.warnings), 'Dokumen memuat bahasa Indonesia dan Inggris. Bagian yang sudah sesuai bahasa tujuan dipertahankan; periksa judul atau frasa pendek yang belum dapat dikenali.']);
    const needsEngine = state.document.blocks.some(b=>!hasTarget(b)&&b.translatable!==false&&!readonlyTypes.has(b.type)&&b.text?.trim()&&blockLanguage(b)!==config.target);
    if (needsEngine) {
      state.translator ||= new module.Translator();
      progress('MENYIAPKAN BAHASA', 'Menyiapkan mesin di perangkat…', undefined, 'Model diunduh hanya bila salinannya belum tersedia. Isi PDF tetap di perangkat.');
      await state.translator.prepare(direction, {signal,onProgress:p=> {
        const loaded = p.done || p.loaded || 0, total = p.total || 0;
        progress('MENYIAPKAN BAHASA','Menyiapkan mesin di perangkat…', total ? loaded/total*100 : undefined, total ? `${bytes(loaded)} / ${bytes(total)} · ${p.label || 'Model bahasa'}` : p.label || 'Menyiapkan runtime lokal…');
      }});
    }
    const blocks = state.document.blocks;
    for (let i=0;i<blocks.length;i++) {
      if (signal.aborted || state.runId !== runId) throw new DOMException('Dibatalkan','AbortError');
      const block = blocks[i]; if (hasTarget(block)) continue;
      progress('MENERJEMAHKAN JURNAL', `Bagian ${i+1} dari ${blocks.length}`, i/Math.max(1,blocks.length)*100, `Halaman ${block.page} · ${TYPES[block.type] || 'Teks'}. Selesai ${stats().done} bagian.`);
      let result;
      if (block.translatable === false || readonlyTypes.has(block.type) || !block.text?.trim()) result = {text:block.text || '',status:'preserved',issues:[]};
      else if (blockLanguage(block) === config.target) result = {text:block.text,status:'preserved',issues:[]};
      else result = await state.translator.translate(block.text,{signal,glossary:config.glossary,onProgress:p=>{
        if (signal.aborted) return;
        const detail = p.label || (p.tokens ? `${p.tokens} token` : 'Memproses kalimat…');
        $('progress-detail').textContent = `Halaman ${block.page} · Bagian ${i+1}/${blocks.length} · ${detail}`;
      }});
      if (signal.aborted) throw new DOMException('Dibatalkan','AbortError');
      delete block.editedAt; delete block.userReviewed; delete block.reviewedAt;
      block.target = result.text; block.status = result.status; block.issues = unique([...issuesOf(block.sourceIssues),...issuesOf(result.issues)]);
      block.engine = result.engine || null; block.sourcePreserved = Boolean(result.sourcePreserved); block.semanticVerified = false;
      if (block.issues.length && block.status === 'translated') block.status = 'review';
      await save(()=>checkpoint.saveBlock(block)); await save(()=>checkpoint.saveCheckpointMeta(meta()));
      if (block.page === state.page) renderResults();
    }
    state.status = 'complete';
    progress('PEMROSESAN SELESAI','Jurnal siap ditinjau.',100,`${stats().done} bagian terdata. ${stats().review} bagian bertanda untuk diperiksa.`);
    notice(stats().review ? 'Pemrosesan selesai. Periksa bagian bertanda; teks sumber dan gambar halaman tersedia untuk membantu peninjauan.' : 'Pemrosesan selesai. Baca ulang terjemahan, lalu unduh format yang Anda perlukan.', 'success');
  } catch(error) {
    if (error.name === 'AbortError' || signal.aborted) {
      state.status = 'paused'; progress('DIHENTIKAN','Progres dapat dilanjutkan.',stats().total ? stats().done/stats().total*100 : 0,`${stats().done} bagian selesai. Klik “Lanjutkan / terjemahkan ulang” untuk melanjutkan.`);
      notice('Pemrosesan dihentikan. Bagian yang sudah selesai tetap tersedia.');
    } else { state.status = 'paused'; notice(escapedError(error),'error'); progress('PERLU PERHATIAN','Pemrosesan belum selesai.',undefined,'Hasil yang sudah terbentuk tetap tersedia. Perbaiki kendala, lalu lanjutkan.'); }
  } finally {
    state.config = config; state.controller = null;
    await save(()=>checkpoint.saveCheckpointMeta(meta())); setBusy(false); renderResults();
    if (!translate && state.document) $('progress-panel').hidden = true;
  }
}
function renderResults() {
  const doc = state.document;
  if (!doc?.blocks?.length) { $('results').hidden = true; updateExportButtons(); return; }
  $('results').hidden = false; const s = stats();
  const maxPage = doc.numPages || doc.pages.length;
  state.page = Math.max(1,Math.min(maxPage,state.page));
  if ($('result-page').options.length !== maxPage) {
    $('result-page').replaceChildren(...Array.from({length:maxPage},(_,i)=>{const e=node('option','',String(i+1));e.value=String(i+1);return e;}));
  }
  $('result-page').value=String(state.page);
  $('result-summary').textContent=`${maxPage} halaman · ${s.total} bagian · ${s.done} diproses · ${s.review} perlu ditinjau`;
  $('result-status').textContent=state.status==='complete'?'Selesai · tinjau hasil':state.status==='extracted'?'Ekstraksi sumber':'Hasil sementara';
  $('result-status').classList.toggle('review',Boolean(s.review));
  const warnings=unique(issuesOf(doc.warnings));
  $('qa-summary').textContent=s.review||warnings.length?`${s.review} bagian bertanda; ${warnings.length} catatan pembacaan halaman. Rumus, tabel, dan referensi tertentu dipertahankan dari sumber. ${warnings.slice(0,2).join(' ')}${warnings.length>2?' Catatan lengkap tersedia dalam laporan QA di paket ZIP.':''}`:'Pemeriksaan struktur tidak menemukan peringatan pada bagian yang telah diproses. Makna ilmiah tetap perlu ditinjau oleh pembaca.';
  $('qa-summary').classList.toggle('attention',Boolean(s.review||warnings.length));
  $('result-status').classList.toggle('review',Boolean(s.review||warnings.length));
  const list=$('block-list');list.replaceChildren();
  let visible=0;
  for(const block of doc.blocks.filter(b=>b.page===state.page)) {
    if($('review-only').checked&&!needsReview(block))continue;
    visible++;
    const row=node('article','block-row');row.dataset.blockId=block.id;
    const header=node('div','block-header');
    header.append(node('span','block-type',`${TYPES[block.type]||'Teks'} · ${block.id}`));
    let label=!hasTarget(block)?'Belum diterjemahkan':isReviewed(block)?'Ditinjau oleh Anda':block.status==='preserved'?'Sumber dipertahankan':needsReview(block)?'Perlu ditinjau':block.editedAt?'Diedit oleh Anda':'Terjemahan mesin';
    header.append(node('span',`block-state${needsReview(block)?' review':''}`,label));
    const columns=node('div','block-columns');
    columns.append(node('p','source-text',block.text||'Elemen visual. Lihat halaman asli.'));
    const target=node('textarea','block-target');target.value=hasTarget(block)?block.target:'';target.placeholder='Hasil terjemahan akan muncul di sini.';
    target.setAttribute('aria-label',`Hasil terjemahan ${block.id}`);target.rows=Math.min(18,Math.max(4,Math.ceil(Math.max(block.text?.length||0,block.target?.length||0)/62)));target.disabled=state.busy;
    target.addEventListener('input',()=>{
      if (state.busy || doc !== state.document) return;
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
      const review=node('button','text-button',isReviewed(block)?'Batalkan tanda tinjauan':'Tandai sudah ditinjau');review.disabled=state.busy;
      review.onclick=async()=>{block.userReviewed=!block.userReviewed;block.reviewedAt=block.userReviewed?new Date().toISOString():null;await save(()=>checkpoint.saveBlock(block));renderResults();};actions.append(review);
    }
    row.append(actions);list.append(row);
    if (block.text?.trim()) {
      const sourceEditor = node('details','source-correction');
      sourceEditor.append(node('summary','text-button','Koreksi teks sumber'));
      const label = node('label','field-label',`Teks sumber ${block.id}`);
      const input = node('textarea','source-editor'); input.id=`source-edit-${block.id}`;label.htmlFor=input.id;
      input.value=block.text;input.rows=Math.min(12,Math.max(3,Math.ceil(block.text.length/75)));input.maxLength=20000;input.disabled=state.busy;
      const help=node('p','field-hint','Perbaiki hasil pembacaan PDF atau OCR sesuai halaman asli. Hanya terjemahan bagian ini yang akan diulang.');
      const apply=node('button','button secondary small','Simpan koreksi sumber');apply.disabled=state.busy;
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
function resultPage(number){state.page=Math.max(1,Math.min(state.document?.numPages||1,number));renderResults();save(()=>checkpoint.saveCheckpointMeta(meta()));}
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
  if(state.busy||state.transitioning||!state.document)return;
  setBusy(true);notice('');
  try{
    await flushEdits();
    const {exportDocument}=await import('./export.js');
    await exportDocument({document:state.document,file:state.file,status:state.status,config:state.config},kind,p=>progress('MENYIMPAN HASIL','Menyusun berkas unduhan…',p));
    notice(kind==='zip'?'Paket lengkap dibuat. Simpan unduhan untuk menyimpan dokumen, aset halaman, dan catatan pemeriksaan.':'Dokumen Markdown dibuat. Untuk menyertakan gambar halaman dan aset visual, unduh paket lengkap ZIP.','success');
  }catch(error){notice(`Unduhan gagal: ${escapedError(error)}`,'error');}
  finally{setBusy(false);$('progress-panel').hidden=true;renderResults();}
}
async function clearDocument(){
  if(state.busy||state.transitioning)return;
  state.transitioning=true;
  try{await clearDocumentNow();}finally{state.transitioning=false;}
}
async function clearDocumentNow(){
  if((state.file||state.savedInfo)&&!await confirmAction('PDF dan progres terakhir akan dihapus dari browser ini. Berkas yang sudah Anda unduh tetap tersedia.','Hapus dokumen & progres?'))return;
  if(!state.releaseLock&&!await acquireDocumentLock()){notice('Tutup dokumen di tab lain sebelum menghapus progres.','error');return;}
  setBusy(true);
  try{
    await flushEdits();await checkpoint.deleteCheckpoint();
    state.previewController?.abort();await state.previewQueue.catch(()=>{});await state.pdf?.destroy().catch(()=>{});state.translator?.cancel();
    Object.assign(state,{file:null,pdf:null,document:null,savedInfo:null,status:'empty',signature:'',partialPages:[],saveEnabled:true});
    releaseDocumentLock();$('file-card').hidden=true;$('source-preview').hidden=true;$('results').hidden=true;$('resume-banner').hidden=true;$('progress-panel').hidden=true;$('pdf-input').value='';
    notice('Dokumen dan progres sudah dihapus dari browser ini.','success');
  }catch(error){notice(`Dokumen dan progres belum dapat dihapus: ${escapedError(error)}`,'error');}
  finally{setBusy(false);}
}
async function prepareOffline(){
  if(state.busy||state.transitioning)return;
  if(!('serviceWorker'in navigator)){notice('Browser ini belum mendukung penggunaan offline aplikasi.','error');return;}
  setBusy(true);state.controller=new AbortController();const signal=state.controller.signal;
  try{
    const {prepareOfflineAssets,waitForOfflineWorker}=await import('./offline.js');
    const registration=await waitForOfflineWorker(signal);
    await prepareOfflineAssets({signal,onProgress:p=>progress('MENYIAPKAN OFFLINE','Menyimpan pembaca PDF dan OCR…',p.done/p.total*100,`${p.done} dari ${p.total} komponen`)});
    const {Translator}=await import('./translation.js');state.translator ||= new Translator();
    const direction=$('target-language').value==='id'?'en-id':'id-en';
    await state.translator.prepare(direction,{signal,onProgress:p=>progress('MENYIAPKAN OFFLINE','Menyimpan model bahasa…',p.total?p.done/p.total*100:undefined,p.label||'Model lokal')});
    const persisted=await navigator.storage?.persist?.().catch(()=>false);
    $('offline-status').textContent=`Pembaca PDF, OCR, dan arah ${direction==='en-id'?'English → Indonesia':'Indonesia → English'} telah disimpan untuk offline.${persisted?' Penyimpanan persisten diizinkan browser.':' Unduh hasil Anda; cache tetap dapat dihapus oleh browser.'}${registration.waiting?' Pembaruan aplikasi menunggu: tutup semua tab website ini, lalu buka kembali sebelum bekerja offline.':''}`;
    notice('Persiapan offline selesai untuk arah bahasa yang dipilih. Buka kembali alamat website yang sama untuk menggunakannya.','success');
  }catch(error){notice(signal.aborted?'Persiapan offline dihentikan. Komponen yang sudah tersimpan dapat dipakai kembali.':`Persiapan offline belum selesai: ${escapedError(error)}`,signal.aborted?'':'error');}
  finally{state.controller=null;setBusy(false);$('progress-panel').hidden=true;}
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
window.addEventListener('beforeunload',event=>{if(state.busy||state.pendingEdits.size){event.preventDefault();event.returnValue='';}});
window.addEventListener('pagehide',()=>{state.controller?.abort();state.translator?.cancel();releaseDocumentLock();});
if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('/sw.js',{type:'classic'}).catch(()=>{$('offline-status').textContent='Pemasangan offline belum berhasil. Gunakan HTTPS atau localhost, lalu muat ulang.';});
checkpoint.getCheckpointInfo().then(info=>{if(state.file||state.busy||state.transitioning)return;state.savedInfo=info;if(info){$('resume-banner').hidden=false;$('resume-description').textContent=`${info.filename} · ${info.progress?.done||0} bagian diproses · ${new Date(info.updatedAt).toLocaleString('id-ID')}`;}}).catch(()=>{state.saveEnabled=false;});
if(!window.isSecureContext||typeof Worker==='undefined'||typeof WebAssembly==='undefined'||typeof DecompressionStream==='undefined')notice('Gunakan browser modern melalui HTTPS atau localhost agar pembaca PDF, model lokal, dan penyimpanan offline dapat berjalan.','error');
