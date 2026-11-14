/* Local document checkpoints. No document data leaves IndexedDB. */
const DATABASE = 'semantik-pdf-checkpoint-v1';
let opening;
function database() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      for (const name of ['meta', 'source', 'blocks', 'pages']) request.result.createObjectStore(name, { keyPath: 'id' });
    };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); opening = null; }; resolve(request.result); };
    request.onerror = () => { opening = null; reject(request.error); };
    request.onblocked = () => { opening = null; reject(new Error('Tutup tab lama agar penyimpanan lokal dapat diperbarui.')); };
  });
  return opening;
}
async function transaction(names, mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode); let value;
    tx.oncomplete = () => resolve(value); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Penyimpanan dibatalkan.'));
    try { action(tx, result => { value = result; }); } catch (error) { tx.abort(); reject(error); }
  });
}
export async function getCheckpointInfo() {
  return transaction(['meta'], 'readonly', (tx, result) => { tx.objectStore('meta').get('current').onsuccess = e => result(e.target.result || null); });
}
export async function createCheckpoint(file, meta) {
  return transaction(['meta', 'source', 'blocks', 'pages'], 'readwrite', tx => {
    for (const name of ['meta', 'source', 'blocks', 'pages']) tx.objectStore(name).clear();
    tx.objectStore('meta').put({ ...meta, id: 'current', filename: file.name, size: file.size, updatedAt: new Date().toISOString() });
    tx.objectStore('source').put({ id: 'current', file, document: null });
  });
}
export async function saveCheckpointMeta(meta) {
  return transaction(['meta'], 'readwrite', tx => { tx.objectStore('meta').put({ ...meta, id: 'current', updatedAt: new Date().toISOString() }); });
}
export async function saveExtractedPage(page, assets) {
  return transaction(['pages'], 'readwrite', tx => tx.objectStore('pages').put({ id: page.number, page, assets }));
}
/** Atomically invalidate an older extraction before beginning or resuming one. */
export async function beginExtraction(meta, reusablePages = []) {
  return transaction(['meta', 'source', 'blocks', 'pages'], 'readwrite', tx => {
    tx.objectStore('meta').put({ ...meta, id: 'current', updatedAt: new Date().toISOString() });
    const source = tx.objectStore('source');
    source.get('current').onsuccess = event => {
      if (event.target.result) source.put({ ...event.target.result, document: null });
    };
    tx.objectStore('blocks').clear();
    const pages = tx.objectStore('pages'); pages.clear();
    for (const record of reusablePages) pages.put(record);
  });
}
export async function saveExtraction(document) {
  return transaction(['source', 'pages'], 'readwrite', tx => {
    const store = tx.objectStore('source');
    store.get('current').onsuccess = e => { if (e.target.result) store.put({ ...e.target.result, document }); };
    tx.objectStore('pages').clear();
  });
}
export async function saveBlock(block) {
  return transaction(['blocks'], 'readwrite', tx => tx.objectStore('blocks').put(block));
}
export async function clearTranslations() {
  return transaction(['blocks'], 'readwrite', tx => tx.objectStore('blocks').clear());
}
export async function loadCheckpoint() {
  return transaction(['meta', 'source', 'blocks', 'pages'], 'readonly', (tx, result) => {
    const output = {};
    tx.objectStore('meta').get('current').onsuccess = e => { output.meta = e.target.result; result(output); };
    tx.objectStore('source').get('current').onsuccess = e => { Object.assign(output, e.target.result); result(output); };
    tx.objectStore('blocks').getAll().onsuccess = e => { output.savedBlocks = e.target.result; result(output); };
    tx.objectStore('pages').getAll().onsuccess = e => { output.savedPages = e.target.result; result(output); };
  });
}
export async function deleteCheckpoint() {
  return transaction(['meta', 'source', 'blocks', 'pages'], 'readwrite', tx => {
    for (const name of ['meta', 'source', 'blocks', 'pages']) tx.objectStore(name).clear();
  });
}
