import {analyzeLayout, itemsFromTsv} from './layout.js';

export const PDF_LIMITS = Object.freeze({maxBytes: 100 * 1024 * 1024, maxPages: 300,
  maxCanvasPixels: 6_000_000, maxAssetsBytes: 128 * 1024 * 1024,
  maxTextItemsPerPage: 20_000, maxTextCharsPerPage: 250_000, maxTextCharsTotal: 2_000_000});
const VENDOR = new URL('../vendor/', import.meta.url);
let pdfLibrary;
const aborted = () => new DOMException('Pemrosesan dibatalkan.', 'AbortError');
function check(signal) { if (signal?.aborted) throw aborted(); }
function notify(callback, value) { if (typeof callback === 'function') callback(value); }
function guard(promise, signal, stop = () => {}) {
  check(signal);
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    const abort = () => { stop(); reject(aborted()); };
    signal.addEventListener('abort', abort, {once: true});
    promise.then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => {
      signal.removeEventListener('abort', abort); reject(error);
    });
  });
}

/** Validate the actual bytes as well as the selected file's type and name. */
export async function validatePdf(file, {signal} = {}) {
  check(signal);
  if (!(file instanceof Blob) || typeof file.name !== 'string') throw new Error('Pilih satu berkas PDF dari perangkat Anda.');
  if (!/\.pdf$/i.test(file.name)) throw new Error('Hanya dokumen PDF (.pdf) yang dapat dibuka.');
  if (file.type && !['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(file.type.toLowerCase())) {
    throw new Error('Jenis berkas tidak sesuai PDF. Pilih dokumen PDF asli.');
  }
  if (!file.size) throw new Error('Berkas PDF kosong.');
  if (file.size > PDF_LIMITS.maxBytes) throw new Error('PDF melebihi batas 100 MiB. Pisahkan dokumen menjadi beberapa PDF yang lebih kecil.');
  const bytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  check(signal);
  const header = new TextDecoder('latin1').decode(bytes);
  // PDF readers allow their header in the first 1024 bytes. Only whitespace or
  // a byte-order mark may precede it here, avoiding renamed JSON/HTML input.
  if (!/^(?:\s|\u00EF\u00BB\u00BF)*%PDF-\d\.\d\b/.test(header)) throw new Error('Isi berkas bukan PDF yang valid; mengganti ekstensi berkas tidak cukup.');
  return true;
}

async function library() {
  if (!pdfLibrary) {
    pdfLibrary = import(new URL('pdfjs/pdf.min.mjs', VENDOR).href).then(lib => {
      lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.min.mjs', VENDOR).href;
      return lib;
    }).catch(error => { pdfLibrary = undefined; throw error; });
  }
  return pdfLibrary;
}

function canvasBlob(canvas, type = 'image/jpeg', quality = 0.9) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Gambar halaman tidak dapat disimpan.')), type, quality));
}

function normalizeItems(content, viewport, pdfjs) {
  const items = [];
  for (let index = 0; index < content.items.length; index++) {
    const item = content.items[index];
    if (typeof item.str !== 'string' || !item.str.trim()) continue;
    const tx = pdfjs.Util.transform(viewport.transform, item.transform);
    const angle = Math.atan2(tx[1], tx[0]);
    const fontSize = Math.max(1, Math.hypot(tx[2], tx[3]));
    const style = content.styles[item.fontName] || {};
    const ascent = Number.isFinite(style.ascent) ? style.ascent : 0.8;
    const baseline = tx[5];
    items.push({text: item.str, x: tx[4], y: baseline - fontSize * ascent,
      baseline, width: Math.max(0, item.width * viewport.scale), height: fontSize,
      fontSize, bold: /bold|black|demi|heavy/i.test(style.fontFamily || item.fontName),
      fontName: item.fontName, direction: item.dir, sourceIndex: index,
      rotated: Math.abs(angle) > 0.04, endOfLine: item.hasEOL});
  }
  return items;
}

function textLimit(message) {
  const error = new Error(message);
  error.code = 'PDF_TEXT_LIMIT';
  return error;
}

function checkTextBudget(items, pageNumber, previousCharacters, field = 'text') {
  const suffix = ' Halaman yang sudah selesai tetap tersedia. Pisahkan PDF atau proses rentang halaman yang lebih pendek.';
  if (items.length > PDF_LIMITS.maxTextItemsPerPage) {
    throw textLimit(`Halaman ${pageNumber} melebihi batas 20.000 elemen teks.` + suffix);
  }
  let characters = 0;
  for (const item of items) {
    characters += typeof item[field] === 'string' ? item[field].length : 0;
    if (characters > PDF_LIMITS.maxTextCharsPerPage) {
      throw textLimit(`Halaman ${pageNumber} melebihi batas 250.000 karakter teks.` + suffix);
    }
  }
  if (previousCharacters + characters > PDF_LIMITS.maxTextCharsTotal) {
    throw textLimit('Dokumen melebihi batas 2.000.000 karakter teks.' + suffix);
  }
  return characters;
}

async function imageCoverage(page, viewport, pdfjs, signal) {
  const operators = await guard(page.getOperatorList(), signal);
  const stack = [];
  let matrix = [1, 0, 0, 1, 0, 0], area = 0, count = 0;
  const {OPS, Util} = pdfjs;
  const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);
  for (let i = 0; i < operators.fnArray.length; i++) {
    const op = operators.fnArray[i], args = operators.argsArray[i];
    if (op === OPS.save) stack.push([...matrix]);
    else if (op === OPS.restore) matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (op === OPS.transform) matrix = Util.transform(matrix, args);
    else if (imageOps.has(op)) {
      count++;
      const m = Util.transform(viewport.transform, matrix);
      area += Math.abs(m[0] * m[3] - m[1] * m[2]);
    }
  }
  return {count, ratio: Math.min(1, area / (viewport.width * viewport.height))};
}

export async function openPdf(file, {signal, onProgress, onPassword} = {}) {
  await validatePdf(file, {signal});
  notify(onProgress, {stage: 'open', progress: 0, label: 'Membuka PDF di perangkat Anda…'});
  const pdfjs = await guard(library(), signal);
  const bytes = new Uint8Array(await guard(file.arrayBuffer(), signal));
  check(signal);
  const task = pdfjs.getDocument({data: bytes, isEvalSupported: false,
    cMapUrl: new URL('pdfjs/cmaps/', VENDOR).href, cMapPacked: true,
    standardFontDataUrl: new URL('pdfjs/standard_fonts/', VENDOR).href,
    wasmUrl: new URL('pdfjs/wasm/', VENDOR).href, iccUrl: new URL('pdfjs/iccs/', VENDOR).href,
    useWorkerFetch: true, useSystemFonts: false, disableFontFace: false,
    stopAtErrors: false, enableXfa: false, maxImageSize: -1,
    canvasMaxAreaInBytes: PDF_LIMITS.maxCanvasPixels * 4});
  let rejectPassword;
  const passwordFailure = new Promise((_, reject) => { rejectPassword = reject; });
  const cancelPassword = () => {
    rejectPassword(new Error('Pembukaan PDF yang dilindungi kata sandi dibatalkan.'));
    task.destroy().catch(() => {});
  };
  task.onPassword = async (updatePassword, reason) => {
    if (!onPassword) { cancelPassword(); return; }
    try {
      const password = await onPassword(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD ? 'incorrect' : 'required');
      if (password === null || password === undefined || signal?.aborted) cancelPassword();
      else updatePassword(String(password));
    } catch { cancelPassword(); }
  };
  let pdf;
  try { pdf = await guard(Promise.race([task.promise, passwordFailure]), signal, () => task.destroy()); }
  catch (error) {
    try { await task.destroy(); } catch {}
    if (signal?.aborted) throw aborted();
    if (/password|destroyed/i.test(String(error))) throw new Error('PDF memerlukan kata sandi atau pembukaannya dibatalkan.');
    throw new Error(`PDF tidak dapat dibuka: ${error.message || error}`);
  }
  if (pdf.numPages > PDF_LIMITS.maxPages) {
    await task.destroy();
    throw new Error('PDF melebihi 300 halaman. Pisahkan dokumen menjadi beberapa PDF untuk menjaga memori perangkat.');
  }
  let metadata = {};
  try {
    const data = await pdf.getMetadata();
    metadata = {title: String(data.info?.Title || ''), author: String(data.info?.Author || ''),
      subject: String(data.info?.Subject || ''), producer: String(data.info?.Producer || ''),
      creationDate: String(data.info?.CreationDate || ''), language: String(data.info?.Language || '')};
  } catch {}
  let destroyed = false, extracting = false, activeRender = null, ocrWorker = null, ocrPromise = null, currentOcrLanguage = '';
  let currentOcrProgress;
  const assertOpen = () => { if (destroyed) throw new Error('Dokumen sudah ditutup. Pilih kembali PDF.'); };
  const stopOCR = () => {
    const worker = ocrWorker;
    ocrWorker = null; currentOcrLanguage = '';
    if (worker) worker.terminate().catch(() => {});
    const pending = ocrPromise;
    ocrPromise = null;
    if (pending) pending.then(w => w.terminate()).catch(() => {});
  };
  async function getOCR(language, ocrSignal, progress) {
    assertOpen(); check(ocrSignal);
    if (!['eng', 'ind', 'eng+ind', 'ind+eng'].includes(language)) language = 'eng+ind';
    currentOcrProgress = progress;
    if (ocrWorker && currentOcrLanguage === language) return ocrWorker;
    stopOCR();
    const tesseractModule = await guard(import(new URL('ocr/tesseract.esm.min.js', VENDOR).href), ocrSignal);
    const {createWorker} = tesseractModule.default || tesseractModule;
    const options = {workerPath: new URL('ocr/worker.min.js', VENDOR).href,
      corePath: new URL('ocr/', VENDOR).href, langPath: new URL('ocr/', VENDOR).href,
      gzip: true, cacheMethod: 'none', workerBlobURL: false,
      logger: entry => notify(currentOcrProgress, {stage: 'ocr', progress: entry.progress || 0, label: 'Membaca halaman scan…', detail: entry.status})};
    const pending = createWorker(language, 1, options, {preserve_interword_spaces: '1'});
    ocrPromise = pending;
    const result = await guard(pending, ocrSignal, stopOCR);
    if (destroyed || ocrSignal?.aborted || ocrPromise !== pending) { await result.terminate(); throw aborted(); }
    ocrPromise = null; ocrWorker = result; currentOcrLanguage = language;
    await result.setParameters({tessedit_pageseg_mode: '3', preserve_interword_spaces: '1', user_defined_dpi: '200'});
    return result;
  }

  async function renderPage(pageNumber, canvas, {scale = 1.6, signal: renderSignal} = {}) {
    assertOpen(); check(renderSignal);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages) throw new Error('Nomor halaman tidak valid.');
    const page = await guard(pdf.getPage(pageNumber), renderSignal);
    const base = page.getViewport({scale: 1});
    const safeScale = Math.min(Math.max(0.2, scale), Math.sqrt(PDF_LIMITS.maxCanvasPixels / (base.width * base.height)));
    const viewport = page.getViewport({scale: safeScale});
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext('2d', {alpha: false});
    const render = page.render({canvasContext: context, viewport,
      annotationMode: pdfjs.AnnotationMode.DISABLE, background: 'rgb(255,255,255)'});
    activeRender = render;
    try { await guard(render.promise, renderSignal, () => render.cancel()); }
    finally { if (activeRender === render) activeRender = null; }
    check(renderSignal);
    return {width: base.width, height: base.height, scale: safeScale, canvas};
  }

  async function extract({signal: extractSignal, onProgress: progress, ocrLanguage = 'eng+ind', layout = 'auto',
    onPage, startPage = 1, endPage = pdf.numPages, initialReferenceSection = false, initialTextCharacters = 0} = {}) {
    assertOpen(); check(extractSignal);
    if (extracting) throw new Error('Pembacaan PDF ini masih berlangsung.');
    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage > pdf.numPages || startPage > endPage) throw new Error('Rentang halaman tidak valid.');
    if (!Number.isSafeInteger(initialTextCharacters) || initialTextCharacters < 0 || initialTextCharacters > PDF_LIMITS.maxTextCharsTotal) {
      throw new Error('Jumlah karakter checkpoint tidak valid. Buka ulang PDF untuk memulai pembacaan baru.');
    }
    extracting = true;
    const pages = [], blocks = [], assets = [], warnings = [];
    let assetsBytes = 0, referenceSection = Boolean(initialReferenceSection), totalTextCharacters = initialTextCharacters;
    const count = endPage - startPage + 1;
    const cancel = () => { activeRender?.cancel(); stopOCR(); };
    extractSignal?.addEventListener('abort', cancel, {once: true});
    try {
      for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
        assertOpen(); check(extractSignal);
        const report = extra => notify(progress, {stage: 'extract', page: pageNumber, total: pdf.numPages,
          done: pageNumber - startPage, progress: (pageNumber - startPage) / count,
          label: `Membaca halaman ${pageNumber} dari ${pdf.numPages}…`, ...extra});
        report({});
        const page = await guard(pdf.getPage(pageNumber), extractSignal);
        const viewport = page.getViewport({scale: 1});
        const pageWarnings = [];
        let items = [], source = 'pdf-text', ocrConfidence = null;
        try {
          const content = await guard(page.getTextContent({includeMarkedContent: false, disableNormalization: false}), extractSignal);
          checkTextBudget(content.items, pageNumber, totalTextCharacters, 'str');
          items = normalizeItems(content, viewport, pdfjs);
        } catch (error) {
          if (extractSignal?.aborted) throw aborted();
          if (error.code === 'PDF_TEXT_LIMIT') throw error;
          pageWarnings.push('Ekstraksi teks PDF gagal; halaman akan dibaca dengan OCR.');
        }
        const visibleText = items.map(i => i.text).join(' ');
        const textCharacters = (visibleText.match(/[\p{L}\p{N}]/gu) || []).length;
        const replacementRatio = (visibleText.match(/\uFFFD/g) || []).length / Math.max(1, visibleText.length);
        let images = {count: 0, ratio: 0};
        try { images = await imageCoverage(page, viewport, pdfjs, extractSignal); }
        catch { if (extractSignal?.aborted) throw aborted(); }
        const useOCR = textCharacters < 24 || replacementRatio > 0.15 || (textCharacters < 400 && images.ratio > 0.45);
        const canvas = document.createElement('canvas');
        let rendered;
        try {
          rendered = await renderPage(pageNumber, canvas, {scale: useOCR ? 2.6 : 1.8, signal: extractSignal});
          if (useOCR) {
            source = 'ocr';
            try {
              const worker = await getOCR(ocrLanguage, extractSignal, info => report(info));
              const result = await guard(worker.recognize(canvas, {}, {text: true, tsv: true, blocks: false}), extractSignal, stopOCR);
              check(extractSignal);
              const ocrItems = itemsFromTsv(result.data.tsv, rendered.scale);
              ocrConfidence = result.data.confidence;
              if (ocrItems.length) {
                if (items.length && replacementRatio <= 0.15) {
                  // Mixed pages often have a digital header over a scanned
                  // body. Keep exact digital strings where their boxes cover
                  // OCR words, and only add the newly recognized image text.
                  const digital = items;
                  let nextIndex = Math.max(...digital.map(i => i.sourceIndex)) + 1;
                  const added = ocrItems.filter(word => !digital.some(item => {
                    const cx = word.x + word.width / 2, cy = word.y + word.height / 2;
                    return cx >= item.x - 2 && cx <= item.x + item.width + 2
                      && cy >= item.y - 3 && cy <= item.y + item.height + 3;
                  })).map(word => ({...word, sourceIndex: nextIndex++}));
                  items = [...digital, ...added];
                } else items = ocrItems;
              }
              else pageWarnings.push('OCR tidak menemukan teks yang dapat dibaca. Gambar halaman tetap disertakan.');
              if (ocrConfidence < 75) pageWarnings.push(`Kepercayaan OCR ${Math.round(ocrConfidence)}%; periksa isi terhadap gambar halaman.`);
            } catch (error) {
              if (extractSignal?.aborted) throw aborted();
              pageWarnings.push(`OCR tidak berhasil: ${String(error.message || error).slice(0, 180)}. Gambar halaman tetap disertakan.`);
              source = items.length ? 'pdf-text' : 'image';
              stopOCR();
            }
          }
          const sourceTextCharacters = checkTextBudget(items, pageNumber, totalTextCharacters);
          totalTextCharacters += sourceTextCharacters;
          const analyzed = analyzeLayout(items, {pageNumber, width: viewport.width, height: viewport.height,
            layout, source, referenceSection});
          referenceSection = analyzed.referenceSection;
          pageWarnings.push(...analyzed.warnings);
          if (images.count) pageWarnings.push('Gambar asli dipertahankan dalam citra halaman; teks dan label di dalam gambar perlu diperiksa.');
          const pageImagePath = `assets/halaman-${String(pageNumber).padStart(4, '0')}.jpg`;
          const imageBlob = await canvasBlob(canvas);
          assetsBytes += imageBlob.size;
          if (assetsBytes > PDF_LIMITS.maxAssetsBytes) throw new Error('Gambar sumber melebihi batas memori 128 MiB. Proses rentang halaman yang lebih pendek.');
          assets.push({path: pageImagePath, blob: imageBlob, page: pageNumber, kind: 'page'});
          for (const block of analyzed.blocks) {
            block.pageImagePath = pageImagePath;
            if (source === 'ocr' && Number.isFinite(ocrConfidence) && ocrConfidence < 75) {
              block.issues.push(`Kepercayaan OCR halaman ${Math.round(ocrConfidence)}%; periksa teks terhadap gambar sumber.`);
              block.confidence = Math.min(block.confidence, ocrConfidence / 100);
            }
            if (block.rotated && ['formula', 'table'].includes(block.type)) block.assetPath = pageImagePath;
            if (!block.rotated && ['formula', 'table'].includes(block.type)) {
              const [x, y, w, h] = block.bbox;
              const crop = document.createElement('canvas');
              const padding = 5, s = rendered.scale;
              const sx = Math.max(0, (x - padding) * s), sy = Math.max(0, (y - padding) * s);
              const sw = Math.min(canvas.width - sx, (w + padding * 2) * s), sh = Math.min(canvas.height - sy, (h + padding * 2) * s);
              if (sw > 0 && sh > 0) {
                crop.width = Math.ceil(sw); crop.height = Math.ceil(sh);
                crop.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
                const blob = await canvasBlob(crop, 'image/png');
                block.assetPath = `assets/${block.id}.png`;
                assetsBytes += blob.size;
                if (assetsBytes > PDF_LIMITS.maxAssetsBytes) throw new Error('Aset sumber melebihi batas memori 128 MiB. Proses rentang halaman yang lebih pendek.');
                assets.push({path: block.assetPath, blob, page: pageNumber, kind: block.type});
              }
              crop.width = 0; crop.height = 0;
            }
          }
          if (!analyzed.blocks.length) {
            analyzed.blocks.push({id: `p${String(pageNumber).padStart(4, '0')}-image`, page: pageNumber,
              type: 'image', text: '', translatable: false, bbox: [0, 0, viewport.width, viewport.height],
              confidence: 0, source: 'image', sourceItemIds: [], pageImagePath, assetPath: pageImagePath,
              issues: ['Halaman disimpan sebagai gambar. Tidak ada teks yang dapat diterjemahkan dengan andal.']});
          }
          const record = {number: pageNumber, width: viewport.width, height: viewport.height,
            source, columnCount: analyzed.columnCount, blocks: analyzed.blocks, imagePath: pageImagePath,
            imageBlob, warnings: pageWarnings, ocrConfidence,
            sourceItemCount: analyzed.sourceItemCount, coveredItemCount: analyzed.coveredItemCount,
            referenceSection, sourceTextCharacters};
          pages.push(record); blocks.push(...record.blocks);
          for (const warning of pageWarnings) warnings.push(`Halaman ${pageNumber}: ${warning}`);
          if (onPage) await onPage(record, assets.filter(asset => asset.page === pageNumber));
          report({done: pageNumber - startPage + 1, progress: (pageNumber - startPage + 1) / count});
        } finally {
          canvas.width = 0; canvas.height = 0;
          page.cleanup();
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      return {schemaVersion: 1, fileName: file.name, fileSize: file.size, numPages: pdf.numPages,
        processedRange: [startPage, endPage], metadata, pages, blocks, assets, warnings,
        sourceItemCount: pages.reduce((n, p) => n + p.sourceItemCount, 0),
        coveredItemCount: pages.reduce((n, p) => n + p.coveredItemCount, 0),
        sourceTextCharacters: totalTextCharacters,
        createdAt: new Date().toISOString()};
    } finally {
      extracting = false;
      extractSignal?.removeEventListener('abort', cancel);
      stopOCR();
    }
  }

  notify(onProgress, {stage: 'open', progress: 1, label: `${pdf.numPages} halaman siap dibaca.`});
  return {numPages: pdf.numPages, metadata, fileName: file.name, extract, renderPage,
    async destroy() { if (destroyed) return; destroyed = true; activeRender?.cancel(); stopOCR(); await task.destroy(); }};
}
