/* Local document checkpoints. Every mutation verifies document + writer generation. */
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
    const tx = db.transaction(names, mode); let value, failure;
    const fail = error => { failure = error; try { tx.abort(); } catch {} };
    tx.oncomplete = () => resolve(value); tx.onerror = () => reject(failure || tx.error); tx.onabort = () => reject(failure || tx.error || new Error('Penyimpanan dibatalkan.'));
    try { action(tx, result => { value = result; }, fail); } catch (error) { fail(error); }
  });
}
const identity = meta => ({jobId:meta.jobId,writeEpoch:meta.writeEpoch});
const stamp = meta => ({...meta,id:'current',updatedAt:new Date().toISOString()});
const stale = () => new DOMException('Pekerjaan telah dibuka atau diganti di tab lain. Muat ulang untuk memulihkan versi yang tersimpan; unduh hasil layar ini sebelum menutupnya.','InvalidStateError');
function guarded(names, token, action) {
  return transaction([...new Set(['meta',...names])], 'readwrite', (tx,result,fail) => {
    tx.objectStore('meta').get('current').onsuccess = event => {
      const current=event.target.result;
      if(!token?.jobId || !current || current.jobId!==token.jobId || current.writeEpoch!==token.writeEpoch){fail(stale());return;}
      try { action(tx,current,result); } catch(error) { fail(error); }
    };
  });
}
export async function getCheckpointInfo() {
  return transaction(['meta'], 'readonly', (tx, result) => { tx.objectStore('meta').get('current').onsuccess = e => result(e.target.result || null); });
}
export async function createCheckpoint(file, meta) {
  return transaction(['meta', 'source', 'blocks', 'pages'], 'readwrite', (tx,result) => {
    for (const name of ['meta', 'source', 'blocks', 'pages']) tx.objectStore(name).clear();
    const next=stamp({...meta,jobId:crypto.randomUUID(),writeEpoch:1,filename:file.name,size:file.size});
    tx.objectStore('meta').put(next);tx.objectStore('source').put({id:'current',file,document:null});result(identity(next));
  });
}
/** Claim under Web Lock; legacy CP17 checkpoints acquire an identity without rewriting content. */
export async function claimCheckpoint(expected) {
  return transaction(['meta'],'readwrite',(tx,result,fail)=>{
    tx.objectStore('meta').get('current').onsuccess=event=>{
      const current=event.target.result;
      const matches=current && (expected?.jobId ? current.jobId===expected.jobId && current.writeEpoch===expected.writeEpoch : !current.jobId && expected?.updatedAt===current.updatedAt && expected?.filename===current.filename);
      if(!matches){fail(stale());return;}
      const next=stamp({...current,jobId:current.jobId||crypto.randomUUID(),writeEpoch:(current.writeEpoch||0)+1});
      tx.objectStore('meta').put(next);result(identity(next));
    };
  });
}
export async function saveCheckpointMeta(meta, token) {
  return guarded([],token,(tx,current)=>tx.objectStore('meta').put(stamp({...meta,...identity(current),...(current.streamDocument&&meta.streaming!==false?{streamDocument:current.streamDocument}:{})})));
}
export async function saveExtractedPage(page, assets, token) {
  return guarded(['pages'],token,tx=>tx.objectStore('pages').put({id:page.number,page,assets}));
}
export async function beginExtraction(meta, reusablePages = [], token, prior = null) {
  return guarded(['source','blocks','pages'],token,(tx,current)=>{
    tx.objectStore('meta').put(stamp({...meta,...identity(current)}));
    const source=tx.objectStore('source');source.get('current').onsuccess=e=>{if(e.target.result)source.put({...e.target.result,document:null,prior:prior||e.target.result.prior||null});};
    tx.objectStore('blocks').clear();const pages=tx.objectStore('pages');pages.clear();for(const record of reusablePages)pages.put(record);
  });
}
export async function saveExtraction(document, token) {
  return guarded(['source','pages'],token,tx=>{
    const source=tx.objectStore('source');source.get('current').onsuccess=e=>{if(e.target.result)source.put({...e.target.result,document,prior:null});};tx.objectStore('pages').clear();
  });
}
export async function saveBlock(block, token) { return guarded(['blocks'],token,tx=>tx.objectStore('blocks').put(block)); }
/** Atomic invalidation keeps corrected source/provenance and replaces only translated fields. */
export async function clearTranslations(document, meta, token) {
  return guarded(['source','blocks'],token,(tx,current)=>{
    const source=tx.objectStore('source');source.get('current').onsuccess=e=>{if(e.target.result)source.put({...e.target.result,document});};
    const blocks=tx.objectStore('blocks');blocks.clear();for(const block of document.blocks)blocks.put(block);
    tx.objectStore('meta').put(stamp({...meta,...identity(current)}));
  });
}
/** Recovery after quota/denial: one transaction stores the complete current in-memory state. */
export async function saveSnapshot({document,partialPages,meta,prior=null},token) {
  return guarded(['source','blocks','pages'],token,(tx,current)=>{
    const source=tx.objectStore('source');source.get('current').onsuccess=e=>{if(e.target.result)source.put({...e.target.result,document,prior});};
    const blocks=tx.objectStore('blocks');blocks.clear();for(const block of document?.blocks||[])blocks.put(block);
    const pages=tx.objectStore('pages');pages.clear();for(const record of partialPages||[])pages.put(record);
    tx.objectStore('meta').put(stamp({...meta,...identity(current)}));
  });
}
export async function loadCheckpoint({lazy = false} = {}) {
  return transaction(['meta','source','blocks','pages'],'readonly',(tx,result)=>{
    const output={};let sourceRecord;
    const merge=()=>{if(sourceRecord)Object.assign(output,sourceRecord);if(output.meta?.streamDocument)output.document=output.meta.streamDocument;result(output);};
    tx.objectStore('meta').get('current').onsuccess=e=>{output.meta=e.target.result;merge();};
    tx.objectStore('source').get('current').onsuccess=e=>{sourceRecord=e.target.result;merge();};
    if (!lazy) {
      tx.objectStore('blocks').getAll().onsuccess=e=>{output.savedBlocks=e.target.result;result(output);};
      tx.objectStore('pages').getAll().onsuccess=e=>{output.savedPages=e.target.result;result(output);};
    }
  });
}
export async function deleteCheckpoint(token) {
  return guarded(['source','blocks','pages'],token,tx=>{for(const name of ['meta','source','blocks','pages'])tx.objectStore(name).clear();});
}

/** CP20: streaming documents keep only summaries in source. Page + metadata commit
 * is atomic. Awaiting this promise is the producer's backpressure boundary. */
export async function commitPage(record, document, meta, token) {
  if (!Number.isInteger(record?.page?.number) || record.page.number < 1 || !Array.isArray(record.page.blocks) || !Array.isArray(record.assets)) throw new Error('Checkpoint halaman tidak valid.');
  return guarded(['pages','blocks'], token, (tx,current) => {
    if (current.sourceSha256 && document.sourceSha256 !== current.sourceSha256) throw stale();
    const id=record.page.number;
    const summary={...document,streaming:true,pages:[],blocks:[],assets:[]};
    delete summary.visibleCounts;
    tx.objectStore('pages').put({...record,id});
    // All overrides have been folded into this new page. They must not shadow
    // freshly invalidated results after a configuration/model change.
    for (const block of record.page.blocks) tx.objectStore('blocks').delete(block.id);
    // The source File is immutable. Rewriting its Blob reference on every
    // block causes unnecessary IDB work; keep the small summary with metadata.
    tx.objectStore('meta').put(stamp({...meta,...identity(current),streaming:true,sourceSha256:document.sourceSha256,streamDocument:summary}));
  });
}
export async function saveStreamSummary(document, meta, token) {
  return guarded([],token,(tx,current)=>{
    const summary={...document,streaming:true,pages:[],blocks:[],assets:[]};delete summary.visibleCounts;
    tx.objectStore('meta').put(stamp({...meta,...identity(current),streaming:true,sourceSha256:document.sourceSha256,streamDocument:summary}));
  });
}
/** Reads one committed page and its edits; never getAll() across a document. */
export async function loadPage(number, token = null) {
  return transaction(['meta','pages','blocks'],'readonly',(tx,result,fail)=>{
    tx.objectStore('meta').get('current').onsuccess=e=>{
      const current=e.target.result;
      if(token && (!current || current.jobId!==token.jobId || current.writeEpoch!==token.writeEpoch)){fail(stale());return;}
      tx.objectStore('pages').get(number).onsuccess=event=>{
        const record=event.target.result;
        if(!record){result(null);return;}
        const blocks=record.page.blocks||[];let remaining=blocks.length;
        if(!remaining){result(record);return;}
        blocks.forEach((block,index)=>{
          tx.objectStore('blocks').get(block.id).onsuccess=edit=>{
            if(edit.target.result)blocks[index]=edit.target.result;
            if(--remaining===0)result(record);
          };
        });
      };
    };
  });
}
export async function* iteratePages(token, {endPage = Infinity, signal} = {}) {
  for(let number=1;number<=endPage;number++){
    if(signal?.aborted)throw new DOMException('Dibatalkan','AbortError');
    const record=await loadPage(number,token);
    if(!record)break;
    yield record;
  }
}
