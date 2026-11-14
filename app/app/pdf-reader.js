import {analyzeLayoutAsync, itemsFromTsv} from './layout.js';
import {extractMathVectors,reconstructMath} from './math-geometry.js';

export const PDF_LIMITS = Object.freeze({maxBytes: 100 * 1024 * 1024, maxPages: 2000,
  maxCanvasPixels: 6_000_000, maxAssetsBytes: 128 * 1024 * 1024,
  maxDeclaredImagePixels: 24_000_000, maxOperatorsPerPage: 200_000, stageTimeoutMs: 60_000,
  maxTextItemsPerPage: 20_000, maxTextCharsPerPage: 250_000, maxTextCharsTotal: 2_000_000, maxStreamTextCharsTotal: 100_000_000});
const VENDOR = new URL('../vendor/', import.meta.url);
let pdfLibrary;
const aborted = () => new DOMException('Pemrosesan dibatalkan.', 'AbortError');
function check(signal) { if (signal?.aborted) throw aborted(); }
function notify(callback, value) { if (typeof callback === 'function') callback(value); }
function guard(promise, signal, stop = () => {}, timeoutMs = PDF_LIMITS.stageTimeoutMs) {
  check(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); fn(value); };
    const halt = () => { try { const result = stop(); result?.catch?.(() => {}); } catch {} };
    const abort = () => { halt(); finish(reject, aborted()); };
    const timer = setTimeout(() => { halt(); const error = new Error(`Tahap PDF melebihi batas ${Math.round(timeoutMs / 1000)} detik. Halaman yang tersimpan tetap dapat dipulihkan.`); error.code = 'PDF_STAGE_TIMEOUT'; finish(reject, error); }, timeoutMs);
    signal?.addEventListener('abort', abort, {once: true});
    Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
  });
}

/** Account unique checkpoint and new assets by stable path. This is a stored
 * asset-byte ceiling, not a claim about peak parser/canvas/browser heap. */
export function validateAssetBudget(assets = []) {
  if (!Array.isArray(assets)) throw new Error('Aset checkpoint tidak valid.');
  const sizes = new Map();
  let total = 0;
  for (const asset of assets) {
    if (!asset || typeof asset.path !== 'string' || !/^assets\/[A-Za-z0-9._-]+\.(?:jpg|png)$/i.test(asset.path)
      || !Number.isSafeInteger(asset.blob?.size) || asset.blob.size < 0) throw new Error('Aset checkpoint tidak valid.');
    if (sizes.has(asset.path)) {
      if (sizes.get(asset.path) !== asset.blob.size) throw new Error('Aset checkpoint memiliki path ganda dengan ukuran berbeda.');
      continue;
    }
    sizes.set(asset.path, asset.blob.size); total += asset.blob.size;
    if (total > PDF_LIMITS.maxAssetsBytes) { const error = new Error('Total aset sumber melebihi 128 MiB, termasuk halaman sebelum pemulihan. Proses rentang halaman yang lebih pendek.'); error.code = 'PDF_ASSET_LIMIT'; throw error; }
  }
  return total;
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
  if (file.size > PDF_LIMITS.maxBytes) throw new Error('PDF melebihi batas masukan 100 MiB pada build ini. Berkas tidak diubah dan progres sebelumnya tetap tersedia.');
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

export function normalizeItems(content, viewport, pdfjs) {
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
    items.push({text: item.str, source: 'pdf-text', x: tx[4], y: baseline - fontSize * ascent,
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

function checkTextBudget(items, pageNumber, previousCharacters, field = 'text', bounded = false) {
  const suffix = ' Halaman yang sudah tersimpan tetap dapat ditinjau dan diunduh. Periksa halaman bermasalah sebelum melanjutkan.';
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
  const totalLimit = bounded ? PDF_LIMITS.maxStreamTextCharsTotal : PDF_LIMITS.maxTextCharsTotal;
  if (previousCharacters + characters > totalLimit) {
    throw textLimit(`Dokumen melebihi batas ${totalLimit.toLocaleString('id-ID')} karakter teks.` + suffix);
  }
  return characters;
}

export async function imageCoverage(page, viewport, pdfjs, signal, stop = () => {}) {
  const operators = await guard(page.getOperatorList(), signal, stop);
  if (operators.fnArray.length > PDF_LIMITS.maxOperatorsPerPage) {
    const error = new Error('Halaman melebihi batas 200.000 operasi grafis. Pisahkan PDF atau rasterisasi halaman di perangkat Anda.'); error.code = 'PDF_OPERATOR_LIMIT'; throw error;
  }
  const stack = [], regions = [];
  let matrix = [1, 0, 0, 1, 0, 0], area = 0, vectorGraphics = 0;
  const {OPS, Util} = pdfjs;
  const imageOps = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);
  for (let i = 0; i < operators.fnArray.length; i++) {
    if (i % 2048 === 0) { check(signal); await new Promise(resolve => setTimeout(resolve, 0)); }
    const op = operators.fnArray[i], args = operators.argsArray[i];
    if(op===OPS.constructPath||op===OPS.shadingFill)vectorGraphics++;
    if (op === OPS.save) stack.push([...matrix]);
    else if (op === OPS.restore) matrix = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (op === OPS.transform) matrix = Util.transform(matrix, args);
    else if (imageOps.has(op)) {
      const imageWidth = op === OPS.paintImageXObject ? args?.[1] : args?.[0]?.width;
      const imageHeight = op === OPS.paintImageXObject ? args?.[2] : args?.[0]?.height;
      if (Number.isFinite(imageWidth) && Number.isFinite(imageHeight) && imageWidth * imageHeight > PDF_LIMITS.maxDeclaredImagePixels) {
        const error = new Error('Gambar PDF melebihi batas dukungan 24 megapiksel. Kecilkan gambar atau pisahkan PDF sebelum mencoba lagi.');
        error.code = 'PDF_IMAGE_LIMIT'; throw error;
      }
      const m = Util.transform(viewport.transform, matrix);
      const xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]];
      const ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
      const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys));
      const w = Math.max(0, Math.min(viewport.width, Math.max(...xs)) - x);
      const h = Math.max(0, Math.min(viewport.height, Math.max(...ys)) - y);
      if (w && h) { area += w * h; regions.push({bbox: [x, y, w, h], operatorIndex: i}); }
    }
  }
  return {count: regions.length, vectorGraphics, ratio: Math.min(1, area / (viewport.width * viewport.height)), regions,mathVectors:extractMathVectors(operators,viewport,OPS)};
}

export function ocrPlan(items, images, viewport, {forceOCR = false} = {}) {
  const text = items.map(i => i.text).join(' ');
  const textCharacters = (text.match(/[\p{L}\p{N}]/gu) || []).length;
  const replacementRatio = (text.match(/\uFFFD/g) || []).length / Math.max(1, text.length);
  const fullPage = forceOCR || textCharacters < 24 || replacementRatio > 0.15;
  // OCR even when a digital header is long: digital character count does not
  // establish that image-only scientific results have been read.
  const regions = (images.regions || []).map((r, i) => ({...r, id: `image-${i + 1}`,
    status: r.bbox[2] * r.bbox[3] >= viewport.width * viewport.height * 0.01 ? 'ocr-required' : 'unresolved-small-region'}));
  return {fullPage, useOCR: fullPage || regions.some(r => r.status === 'ocr-required'), replacementRatio,
    regions, textCharacters};
}

/** Keep exact digital strings; add OCR words only outside digital coverage.
 * A bucket index avoids the former OCR words × all digital items scan. */
export function mergeOcrItems(digital, recognized, offset = [0, 0]) {
  const cell = 64, buckets = new Map(), broad = [];
  const key = (x, y) => `${x}:${y}`;
  for (const item of digital) {
    const left = Math.floor((item.x - 2) / cell), right = Math.floor((item.x + item.width + 2) / cell);
    const top = Math.floor((item.y - 3) / cell), bottom = Math.floor((item.y + item.height + 3) / cell);
    if ((right - left + 1) * (bottom - top + 1) > 256) { broad.push(item); continue; }
    for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) {
      const k = key(x, y); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(item);
    }
  }
  let nextIndex = digital.reduce((n, i) => Math.max(n, i.sourceIndex), -1) + 1;
  const added = [];
  for (const original of recognized) {
    const word = {...original, x: original.x + offset[0], y: original.y + offset[1],
      baseline: original.baseline + offset[1], source: 'ocr'};
    const cx = word.x + word.width / 2, cy = word.y + word.height / 2;
    const candidates = [...(buckets.get(key(Math.floor(cx / cell), Math.floor(cy / cell))) || []), ...broad];
    if (!candidates.some(item => cx >= item.x - 2 && cx <= item.x + item.width + 2 && cy >= item.y - 3 && cy <= item.y + item.height + 3)) {
      added.push({...word, sourceIndex: nextIndex++});
    }
  }
  return [...digital, ...added];
}

export async function openPdf(file, {signal, onProgress, onPassword} = {}) {
  await validatePdf(file, {signal});
  notify(onProgress, {stage: 'open', progress: 0, label: 'Membuka PDF di perangkat Anda…'});
  const pdfjs = await guard(library(), signal);
  const bytes = new Uint8Array(await guard(file.arrayBuffer(), signal));
  check(signal);
  const sourceSha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const task = pdfjs.getDocument({data: bytes, isEvalSupported: false,
    cMapUrl: new URL('pdfjs/cmaps/', VENDOR).href, cMapPacked: true,
    standardFontDataUrl: new URL('pdfjs/standard_fonts/', VENDOR).href,
    wasmUrl: new URL('pdfjs/wasm/', VENDOR).href, iccUrl: new URL('pdfjs/iccs/', VENDOR).href,
    useWorkerFetch: true, useSystemFonts: false, disableFontFace: false,
    // PDF.js can silently omit oversized images even with stopAtErrors. Keep
    // decoding intact and reject declared dimensions from its operator list.
    // This checks supported image size; it is NOT a predecode/heap ceiling.
    stopAtErrors: true, enableXfa: false, maxImageSize: -1,
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
    throw new Error(`PDF melebihi batas pemeriksaan ${PDF_LIMITS.maxPages} halaman. Progres sebelumnya tetap tersedia; dukungan kapasitas mengikuti hasil kualifikasi perangkat.`);
  }
  let metadata = {};
  try {
    const data = await guard(pdf.getMetadata(), signal, () => task.destroy());
    metadata = {title: String(data.info?.Title || ''), author: String(data.info?.Author || ''),
      subject: String(data.info?.Subject || ''), producer: String(data.info?.Producer || ''),
      creationDate: String(data.info?.CreationDate || ''), language: String(data.info?.Language || '')};
  } catch (error) { if (signal?.aborted || error.code === 'PDF_STAGE_TIMEOUT') { await task.destroy(); throw error; } }
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
    const page = await guard(pdf.getPage(pageNumber), renderSignal, () => task.destroy());
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
    onPage, startPage = 1, endPage = pdf.numPages, initialReferenceSection = false, initialTextCharacters = 0, initialAssets = [], forceOCR = false, bounded = false, includePageImages = true, retainOCR = false} = {}) {
    assertOpen(); check(extractSignal);
    if (extracting) throw new Error('Pembacaan PDF ini masih berlangsung.');
    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage > pdf.numPages || startPage > endPage) throw new Error('Rentang halaman tidak valid.');
    if (!Number.isSafeInteger(initialTextCharacters) || initialTextCharacters < 0 || initialTextCharacters > (bounded ? PDF_LIMITS.maxStreamTextCharsTotal : PDF_LIMITS.maxTextCharsTotal)) {
      throw new Error('Jumlah karakter checkpoint tidak valid. Buka ulang PDF untuk memulai pembacaan baru.');
    }
    const initialAssetsBytes = validateAssetBudget(initialAssets);
    extracting = true;
    const pages = [], blocks = [], assets = [], warnings = [];
    let assetsBytes = initialAssetsBytes, referenceSection = Boolean(initialReferenceSection), totalTextCharacters = initialTextCharacters;
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
        const page = await guard(pdf.getPage(pageNumber), extractSignal, () => task.destroy());
        const viewport = page.getViewport({scale: 1});
        const pageWarnings = [];
        let items = [], source = 'pdf-text', ocrConfidence = null;
        try {
          const content = await guard(page.getTextContent({includeMarkedContent: false, disableNormalization: false}), extractSignal, () => task.destroy());
          checkTextBudget(content.items, pageNumber, totalTextCharacters, 'str', bounded);
          items = normalizeItems(content, viewport, pdfjs);
        } catch (error) {
          if (extractSignal?.aborted) throw aborted();
          if (['PDF_TEXT_LIMIT', 'PDF_STAGE_TIMEOUT'].includes(error.code)) throw error;
          pageWarnings.push('Ekstraksi teks PDF gagal; halaman akan dibaca dengan OCR.');
        }
        const visibleText = items.map(i => i.text).join(' ');
        const textCharacters = (visibleText.match(/[\p{L}\p{N}]/gu) || []).length;
        const replacementRatio = (visibleText.match(/\uFFFD/g) || []).length / Math.max(1, visibleText.length);
        let images = {count: 0, ratio: 0, regions: []};
        try { images = await imageCoverage(page, viewport, pdfjs, extractSignal, () => task.destroy()); }
        catch (error) {
          if (extractSignal?.aborted) throw aborted();
          if (['PDF_STAGE_TIMEOUT', 'PDF_OPERATOR_LIMIT', 'PDF_IMAGE_LIMIT'].includes(error.code)) throw error;
          const failure = new Error(/maximum allowed size/i.test(String(error))
            ? 'Gambar PDF melebihi batas decoder 24 megapiksel. Kecilkan gambar atau pisahkan PDF sebelum mencoba lagi.'
            : 'Grafis halaman PDF tidak dapat dibaca dengan utuh. Halaman sebelumnya tetap tersimpan; periksa atau perbaiki PDF sebelum melanjutkan.');
          failure.code = /maximum allowed size/i.test(String(error)) ? 'PDF_IMAGE_LIMIT' : 'PDF_GRAPHICS_FAILED';
          failure.cause = error; throw failure;
        }
        const plan = ocrPlan(items, images, viewport, {forceOCR});
        const useOCR = plan.useOCR;
        const coverageRegions = plan.regions;
        if (images.inspectionFailed) coverageRegions.push({id: 'uninspected-page', bbox: [0, 0, viewport.width, viewport.height], status: 'unresolved-inspection'});
        const canvas = document.createElement('canvas');
        let rendered;
        try {
          rendered = await renderPage(pageNumber, canvas, {scale: useOCR ? 2.6 : 1.8, signal: extractSignal});
          if (useOCR) {
            try {
              const worker = await getOCR(ocrLanguage, extractSignal, info => report(info));
              const targets = plan.fullPage ? [{bbox: [0, 0, viewport.width, viewport.height], id: 'full-page', status: 'ocr-required'}]
                : coverageRegions.filter(region => region.status === 'ocr-required');
              const confidences = [];
              for (const region of targets) {
                check(extractSignal);
                const [x, y, w, h] = region.bbox, scale = rendered.scale;
                const crop = document.createElement('canvas');
                crop.width = Math.max(1, Math.ceil(w * scale)); crop.height = Math.max(1, Math.ceil(h * scale));
                try {
                  crop.getContext('2d').drawImage(canvas, x * scale, y * scale, w * scale, h * scale, 0, 0, crop.width, crop.height);
                  const result = await guard(worker.recognize(crop, {}, {text: true, tsv: true, blocks: false}), extractSignal, stopOCR, 120_000);
                  check(extractSignal);
                  const ocrItems = itemsFromTsv(result.data.tsv, scale);
                  confidences.push(result.data.confidence);
                  if (ocrItems.length) {
                    const retained = plan.replacementRatio <= 0.15 ? items : [];
                    items = mergeOcrItems(retained, ocrItems, [x, y]);
                    region.status = 'ocr-read-needs-review'; region.recognizedWords = ocrItems.length;
                  } else {
                    region.status = 'unresolved-no-text';
                    pageWarnings.push('Wilayah gambar belum tercakup: OCR tidak menemukan teks. Bandingkan dengan citra halaman.');
                  }
                } finally { crop.width = 0; crop.height = 0; }
              }
              if (plan.fullPage) {
                for (const region of coverageRegions) { region.status = targets[0].status; region.ocrScope = 'full-page'; }
                if (!coverageRegions.length) coverageRegions.push(...targets);
              }
              ocrConfidence = Math.min(...confidences.filter(Number.isFinite));
              if (!Number.isFinite(ocrConfidence)) ocrConfidence = null;
              source = items.some(item => item.source === 'ocr') ? (items.some(item => item.source !== 'ocr') ? 'mixed' : 'ocr') : 'pdf-text';
              if (ocrConfidence !== null && ocrConfidence < 75) pageWarnings.push(`Kepercayaan OCR ${Math.round(ocrConfidence)}%; periksa isi terhadap gambar halaman.`);
            } catch (error) {
              if (extractSignal?.aborted) throw aborted();
              for (const region of coverageRegions) if (region.status === 'ocr-required') region.status = 'unresolved-ocr-failed';
              if (!coverageRegions.length) coverageRegions.push({id: 'full-page', bbox: [0, 0, viewport.width, viewport.height], status: 'unresolved-ocr-failed'});
              pageWarnings.push(`Cakupan belum lengkap: OCR tidak berhasil. ${String(error.message || error).slice(0, 150)}. Gambar halaman tetap tersedia.`);
              source = items.length ? 'pdf-text' : 'image'; stopOCR();
            }
          }
          if (coverageRegions.some(r => r.status.startsWith('unresolved'))) pageWarnings.push('Halaman memiliki wilayah gambar yang belum tercakup teks. Periksa PDF asli sebelum memakai terjemahan.');
          const sourceTextCharacters = checkTextBudget(items, pageNumber, totalTextCharacters, 'text', bounded);
          totalTextCharacters += sourceTextCharacters;
          const math=reconstructMath(items.filter(i=>i.source!=='ocr'),images.mathVectors||{segments:[]},{pageNumber});
          const consumed=new Set(math.consumedItemIds);
          const analyzed = await analyzeLayoutAsync(items.filter(i=>i.source==='ocr'||!consumed.has(i.sourceIndex)), {pageNumber, width: viewport.width, height: viewport.height,
            layout, source, referenceSection}, {signal: extractSignal});
          analyzed.blocks.push(...math.regions.map(r=>({id:r.id,page:pageNumber,type:'formula',text:r.sourceText,originalText:r.sourceText,translatable:false,bbox:r.bbox,confidence:r.verified?0.95:0,source:'pdf-geometry',sourceItemIds:r.sourceItemIds,math:r,issues:r.verified?[]:['Rumus belum terverifikasi; citra sumber dipertahankan.']})));
          // Preserve layout's full-width headers/tables and column order. Math is
          // inserted only into the matching column; never globally re-sort prose.
          const formulas=analyzed.blocks.splice(analyzed.blocks.length-math.regions.length,math.regions.length);
          for(const formula of formulas.sort((a,b)=>a.bbox[1]-b.bbox[1]||a.bbox[0]-b.bbox[0])){
            const cut=analyzed.columnCut,col=b=>cut==null?0:b.bbox[0]<cut?0:1;
            let at=analyzed.blocks.findIndex(b=>col(b)===col(formula)&&b.bbox[1]>formula.bbox[1]);
            if(at<0){const positions=analyzed.blocks.map((b,i)=>col(b)===col(formula)?i:-1).filter(i=>i>=0);at=positions.length?positions.at(-1)+1:analyzed.blocks.length;}
            analyzed.blocks.splice(at,0,formula);
          }
          analyzed.sourceItemCount=items.length;analyzed.coveredItemCount+=consumed.size;
          if(math.warnings.length)pageWarnings.push('Sebagian struktur matematika belum terverifikasi; citra PDF dipertahankan dalam hasil.');
          referenceSection = analyzed.referenceSection;
          pageWarnings.push(...analyzed.warnings);
          if (images.count) pageWarnings.push('Gambar asli dipertahankan dalam citra halaman; teks dan label di dalam gambar perlu diperiksa.');
          const retainImage = includePageImages || useOCR || images.count > 0 || images.vectorGraphics > 0 || analyzed.blocks.some(b=>['formula','table'].includes(b.type)) || !analyzed.blocks.length;
          const pageImagePath = retainImage ? `assets/halaman-${String(pageNumber).padStart(4, '0')}.jpg` : null;
          const imageBlob = retainImage ? await guard(canvasBlob(canvas), extractSignal) : null;
          if (retainImage) {
            const pageAsset = {path: pageImagePath, blob: imageBlob, page: pageNumber, kind: 'page'};
            assetsBytes = validateAssetBudget([...initialAssets, ...assets, pageAsset]);
            assets.push(pageAsset);
          }
          for (const block of analyzed.blocks) {
            block.pageImagePath = pageImagePath;
            if (['ocr', 'mixed'].includes(source) && Number.isFinite(ocrConfidence) && ocrConfidence < 75) {
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
                const blob = await guard(canvasBlob(crop, 'image/png'), extractSignal);
                block.assetPath = `assets/${block.id}.png`;
                const cropAsset = {path: block.assetPath, blob, page: pageNumber, kind: block.type};
                assetsBytes = validateAssetBudget([...initialAssets, ...assets, cropAsset]);
                assets.push(cropAsset);
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
          if(coverageRegions.some(r=>r.status.startsWith('unresolved'))&&!analyzed.blocks.some(b=>b.type==='image')){
            analyzed.blocks.push({id:`p${String(pageNumber).padStart(4,'0')}-image`,page:pageNumber,type:'image',text:'',translatable:false,bbox:[0,0,viewport.width,viewport.height],confidence:0,source:'image',sourceItemIds:[],pageImagePath,assetPath:pageImagePath,issues:['Cakupan halaman belum lengkap. Citra sumber dipertahankan; bagian yang belum terbaca tidak dihitung sebagai terjemahan tuntas.']});
          }
          const record = {number: pageNumber, width: viewport.width, height: viewport.height,
            source, columnCount: analyzed.columnCount, blocks: analyzed.blocks, imagePath: pageImagePath, preserveVisualSource: images.count > 0 || images.vectorGraphics > 0,
            imageBlob, warnings: pageWarnings, ocrConfidence, coverageRegions,mathEvidence:{regions:math.regions,vectorEvidence:math.vectorEvidence},
            coverageStatus: coverageRegions.some(r => r.status.startsWith('unresolved')) ? 'incomplete' : coverageRegions.length ? 'ocr-needs-review' : 'digital-text',
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
        sourceTextCharacters: totalTextCharacters, assetsBytes,
        createdAt: new Date().toISOString()};
    } finally {
      extracting = false;
      extractSignal?.removeEventListener('abort', cancel);
      if (!retainOCR) stopOCR();
    }
  }

  notify(onProgress, {stage: 'open', progress: 1, label: `${pdf.numPages} halaman siap dibaca.`});
  return {numPages: pdf.numPages, metadata, fileName: file.name, sourceSha256, extract, renderPage,
    async destroy() { if (destroyed) return; destroyed = true; activeRender?.cancel(); stopOCR(); await task.destroy(); }};
}
