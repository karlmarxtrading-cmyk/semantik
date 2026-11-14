/* CP20: one-page producer/consumer. Storage commit is awaited before advancing.
 * No complete text/raster array is retained by this module. */
export const STREAM_PAGE_THRESHOLD = 64;
export const zeroCounts = () => ({total:0,translated:0,preserved:0,rejected:0,failed:0,pending:0,review:0,done:0,attempted:0});
const targetPresent=b=>typeof b.target==='string'&&(!b.text?.trim()||Boolean(b.target.trim()));
export function countBlocks(blocks=[]){
  const counts=zeroCounts();counts.total=blocks.length;
  for(const b of blocks){
    if(!targetPresent(b))counts.pending++;
    else if(b.outcome==='failed')counts.failed++;
    else if(b.outcome==='rejected'||b.sourcePreserved)counts.rejected++;
    else if(b.status==='preserved')counts.preserved++;
    else counts.translated++;
    if(!b.userReviewed&&(b.status==='review'||b.issues?.length||!Object.hasOwn(b,'target')))counts.review++;
  }
  counts.done=counts.translated+counts.preserved;counts.attempted=counts.total-counts.pending;return counts;
}
export function replaceCounts(total,prior,next){
  const result={};for(const key of Object.keys(zeroCounts()))result[key]=(total?.[key]||0)-(prior?.[key]||0)+(next?.[key]||0);
  return result;
}
export function streamSummary(doc){
  const out={...doc,pages:[],blocks:[],assets:[]};delete out.visibleCounts;return out;
}
const aborted=()=>new DOMException('Dibatalkan','AbortError');
const check=signal=>{if(signal?.aborted)throw aborted();};
const uniq=list=>[...new Set(list.filter(Boolean))];
const preservedTypes=new Set(['formula','reference','image']);
function invalidate(block){
  if(block.editedAt||block.userReviewed)block.previousUserResult={target:block.target,status:block.status,reviewedAt:block.reviewedAt,editedAt:block.editedAt,resultBuild:block.resultBuild};
  for(const key of ['target','status','outcome','retryable','engine','diagnostics','translatedRows','editedAt','userReviewed','reviewedAt'])delete block[key];
  block.sourcePreserved=false;block.semanticVerified=false;block.issues=[...(block.sourceIssues||[])];
}
export async function streamPreflight({file,pdf,storage=navigator.storage}={}){
  const estimate=await storage?.estimate?.().catch(()=>null);
  const available=estimate&&Number.isFinite(estimate.quota)?Math.max(0,estimate.quota-(estimate.usage||0)):null;
  // A reserve is a preflight lower bound, not a promise that a scanned book fits.
  const reserve=32*1024*1024;
  if(available!==null&&available<reserve)throw new Error(`Ruang browser tersisa ${Math.floor(available/1024/1024)} MiB. Sediakan setidaknya 32 MiB ruang kerja lalu lanjutkan; halaman tersimpan tetap dapat diunduh.`);
  const persistent=await storage?.persist?.().catch(()=>false);
  return {numPages:pdf.numPages,pdfBytes:file.size,availableBytes:available,persistent:Boolean(persistent),sourceSha256:pdf.sourceSha256,checkedAt:new Date().toISOString(),minimumWorkingReserveBytes:reserve};
}
/** Callbacks are responsible for an atomic page+summary+job-meta transaction.
 * loadPage overlays edits; commit never resolves successfully on storage failure. */
export async function processLongDocument({pdf,file,document:prior,config,translate,translationModule,build,signal,loadPage,commit,onVisible,onProgress,onTranslator,translator:providedTranslator}){
  const started=performance.now();
  const signature=JSON.stringify(config);
  const provenance={sourceSha256:pdf.sourceSha256,configSignature:signature,ruleset:translationModule?.RULESET||'source-only',release:build.release};
  const doc=prior?.streaming?prior:{schemaVersion:2,streaming:true,fileName:file.name,fileSize:file.size,numPages:pdf.numPages,metadata:pdf.metadata,sourceSha256:pdf.sourceSha256,createdAt:new Date().toISOString(),committedPageCount:0,counts:zeroCounts(),sourceItemCount:0,coveredItemCount:0,sourceTextCharacters:0,assetsBytes:0,warnings:[],metrics:{inferenceCalls:0,cacheHits:0,uniqueInputs:0,inputTokens:0,outputTokens:0,extractionMs:0,inferenceMs:0,commitMs:0}};
  if(doc.sourceSha256!==pdf.sourceSha256)throw new Error('Identitas PDF berbeda dari checkpoint. Pilih PDF yang sesuai atau mulai pekerjaan baru.');
  let previousConfig={};try{previousConfig=JSON.parse(doc.streamProvenance?.configSignature||'{}');}catch{}
  const resetAutoLanguage=config.source==='auto'&&previousConfig.source!=='auto';
  doc.streamProvenance=provenance;doc.metrics||={};
  let translator=providedTranslator,referenceSection=false,sourceLanguage=resetAutoLanguage?undefined:doc.sourceLanguage,targetLanguage=doc.targetLanguage;
  const readyDirections=new Set();
  let finalCounts=zeroCounts();
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
    check(signal);
    let record=await loadPage(pageNumber);check(signal);
    const oldCounts=record?.page?.summary||zeroCounts();
    const previousRecord=record;
    const needsExtraction=!record||record.page.extractionLayout!==config.layout;
    if(needsExtraction){
      const before=performance.now();
      const extracted=await pdf.extract({signal,startPage:pageNumber,endPage:pageNumber,bounded:true,includePageImages:false,retainOCR:true,initialReferenceSection:referenceSection,initialTextCharacters:(doc.sourceTextCharacters||0)-(previousRecord?.page?.sourceTextCharacters||0),layout:config.layout,ocrLanguage:'eng+ind',onProgress:p=>onProgress?.({...p,stage:p.stage==='ocr'?'ocr':'extract',committed:doc.committedPageCount,total:pdf.numPages})});
      check(signal);doc.metrics.extractionMs=(doc.metrics.extractionMs||0)+performance.now()-before;
      const page=extracted.pages[0];
      page.blocks=page.blocks.map(b=>({...b,originalText:b.originalText??b.text,sourceIssues:[...(b.issues||[])],issues:[...(b.issues||[])]}));
      page.extractionLayout=config.layout;
      page.coverageIncomplete=page.coverageStatus==='incomplete'||page.blocks.some(b=>b.type==='image')||(page.sourceItemCount||0)>(page.coveredItemCount||0);
      page.mathUncertain=page.blocks.some(b=>b.type==='formula'&&b.math?.verified!==true);
      doc.coverageIncompletePages=(doc.coverageIncompletePages||0)+Number(page.coverageIncomplete)-Number(Boolean(previousRecord?.page?.coverageIncomplete));
      doc.mathUncertainPages=(doc.mathUncertainPages||0)+Number(page.mathUncertain)-Number(Boolean(previousRecord?.page?.mathUncertain));
      doc.warnings=[...(doc.offlineCacheWarning?[doc.offlineCacheWarning]:[]),...(doc.coverageIncompletePages?[`${doc.coverageIncompletePages} halaman memiliki cakupan pembacaan belum lengkap; sumber visual dipertahankan.`]:[]),...(doc.mathUncertainPages?[`${doc.mathUncertainPages} halaman memiliki rumus belum terverifikasi; gambar bukan rekonstruksi LaTeX yang tuntas.`]:[])];
      if(previousRecord){
        const used=new Set();
        for(const old of previousRecord.page.blocks.filter(b=>b.sourceEditedAt||(b.originalText!==undefined&&b.originalText!==b.text))){
          const candidates=page.blocks.filter(b=>!used.has(b.id)&&(b.originalText??b.text)===(old.originalText??old.text));
          const match=candidates.length===1?candidates[0]:candidates.find(b=>Array.isArray(old.sourceItemIds)&&JSON.stringify(b.sourceItemIds)===JSON.stringify(old.sourceItemIds));
          if(!match)throw new Error(`Koreksi sumber halaman ${pageNumber} belum dapat dicocokkan dengan susunan baru. Halaman lama tetap tersimpan; gunakan susunan sebelumnya atau unduh sebelum membaca ulang.`);
          used.add(match.id);match.text=old.text;match.originalText=old.originalText??old.text;match.sourceEditedAt=old.sourceEditedAt;
          match.sourceIssues=uniq([...(match.sourceIssues||[]),...(old.sourceIssues||[])]);match.issues=[...match.sourceIssues];
          if(old.type==='table'||old.tableTextEdited){match.originalRows=structuredClone(old.originalRows||old.rows||[]);delete match.rows;match.tableTextEdited=true;match.translatable=true;}
        }
        page.previousLayoutUserResults=previousRecord.page.blocks.filter(b=>b.editedAt||b.userReviewed||b.sourceEditedAt).map(b=>structuredClone(b));
      }
      record={id:pageNumber,page,assets:extracted.assets};
      doc.sourceItemCount+=(page.sourceItemCount||0)-(previousRecord?.page?.sourceItemCount||0);doc.coveredItemCount+=(page.coveredItemCount||0)-(previousRecord?.page?.coveredItemCount||0);doc.sourceTextCharacters+=(page.sourceTextCharacters||0)-(previousRecord?.page?.sourceTextCharacters||0);doc.assetsBytes+=extracted.assets.reduce((n,a)=>n+a.blob.size,0)-(previousRecord?.assets||[]).reduce((n,a)=>n+a.blob.size,0);
      doc.counts=replaceCounts(doc.counts,oldCounts,countBlocks(page.blocks));doc.committedPageCount=Math.max(doc.committedPageCount,pageNumber);
      page.summary=countBlocks(page.blocks);page.provenance={...provenance,ruleset:'source-only'};
      // Commit extracted source before model preparation/inference can fail.
      doc.blocks=page.blocks;doc.pages=[page];doc.assets=record.assets;doc.visibleCounts={...page.summary};
      onVisible?.(doc,record);await commitRecord(record);check(signal);
    }
    const page=record.page;referenceSection=Boolean(page.referenceSection);
    const priorCounts=page.summary||countBlocks(page.blocks);
    if(translate){
      const module=translationModule;
      const sample=page.blocks.filter(b=>b.translatable!==false&&!preservedTypes.has(b.type)).map(b=>b.text||'').join(' ').slice(0,16000);
      if(config.source!=='auto')sourceLanguage=config.source;
      else if(!sourceLanguage||sourceLanguage==='unknown')sourceLanguage=module.detectLanguage(sample);
      if(sourceLanguage==='unknown'&&sample.trim())throw new Error('Bahasa sumber belum dikenali. Pilih English atau Bahasa Indonesia pada pengaturan lalu lanjutkan; sumber halaman sudah tersimpan.');
      targetLanguage=config.target==='auto'?(sourceLanguage==='id'?'en':'id'):config.target;
      doc.sourceLanguage=sourceLanguage;doc.targetLanguage=targetLanguage;
      const changed=page.provenance?.configSignature!==signature||page.provenance?.ruleset!==provenance.ruleset||page.provenance?.release!==provenance.release;
      if(changed)for(const block of page.blocks)invalidate(block);
      doc.counts=replaceCounts(doc.counts,priorCounts,countBlocks(page.blocks));
      page.summary=countBlocks(page.blocks);page.provenance={...provenance};
      doc.blocks=page.blocks;doc.pages=[page];doc.assets=record.assets;doc.visibleCounts={...page.summary};
      onVisible?.(doc,record);await commitRecord(record);
      for(let i=0;i<page.blocks.length;i++){
        check(signal);const block=page.blocks[i];
        const retry=!block.userReviewed&&block.status!=='edited'&&block.retryable!==false&&(block.retryable||block.sourcePreserved||['failed','rejected'].includes(block.outcome));
        if(targetPresent(block)&&!retry)continue;
        let language=module.detectLanguage(block.text||'');
        const words=(block.text||'').split(/\s+/).length;
        if(!(block.type==='heading'&&language!=='unknown')&&!(language===targetLanguage&&words>=12)&&!(config.source==='auto'&&language!=='unknown'&&words>=4))language=sourceLanguage;
        const preserve=block.translatable===false||preservedTypes.has(block.type)||!block.text?.trim()||language===targetLanguage;
        let result;
        if(preserve){result=block.type==='image'?{text:block.text||'',status:'review',outcome:'failed',sourcePreserved:true,retryable:false,issues:['Bagian visual belum terbaca sebagai teks; belum dihitung sebagai terjemahan tuntas.']}:{text:block.text||'',status:'preserved',issues:[]};block.preservationReason=block.type==='reference'?'bibliography':preservedTypes.has(block.type)?block.type:language===targetLanguage?'already-target-language':!block.text?.trim()?'non-text':'declared-nontranslatable';}
        else{
          const direction=`${targetLanguage==='id'?'en':'id'}-${targetLanguage}`;
          translator||=new module.Translator();onTranslator?.(translator);
          if(!readyDirections.has(direction)){onProgress?.({stage:'model',page:pageNumber,total:pdf.numPages,committed:doc.committedPageCount,label:'Menyiapkan mesin bahasa lokal…'});await translator.prepare(direction,{signal,onProgress:p=>onProgress?.({...p,stage:'model',page:pageNumber,totalPages:pdf.numPages,committed:doc.committedPageCount})});readyDirections.add(direction);}
          const before=performance.now();
          result=await(block.type==='table'&&Array.isArray(block.rows)?translator.translateTable(block,{signal,glossary:config.glossary}):translator.translate(block.text,{signal,glossary:config.glossary}));
          doc.metrics.inferenceMs=(doc.metrics.inferenceMs||0)+performance.now()-before;
          for(const key of ['inferenceCalls','cacheHits','uniqueInputs','inputTokens','outputTokens'])doc.metrics[key]=(doc.metrics[key]||0)+(Number(result.metrics?.[key])||0);
        }
        check(signal);
        const previous=page.summary;
        Object.assign(block,{resultBuild:build,target:result.text,status:result.status,issues:uniq([...(block.sourceIssues||[]),...(result.issues||[])]),outcome:result.outcome||(result.status==='preserved'?'preserved':result.sourcePreserved?'rejected':'translated'),retryable:Boolean(result.retryable),diagnostics:result.diagnostics||[],engine:result.engine||null,sourcePreserved:Boolean(result.sourcePreserved),semanticVerified:false,recovery:result.recovery||null,metrics:result.metrics||null});
        if(result.translatedRows)block.translatedRows=result.translatedRows;else delete block.translatedRows;
        if(block.issues.length&&block.status==='translated')block.status='review';
        page.summary=countBlocks(page.blocks);doc.counts=replaceCounts(doc.counts,previous,page.summary);doc.visibleCounts={...page.summary};
        onVisible?.(doc,record);await commitRecord(record);
        const elapsed=performance.now()-started,processed=pageNumber-1+(i+1)/Math.max(1,page.blocks.length);
        onProgress?.({stage:'translate',page:pageNumber,total:pdf.numPages,block:i+1,blocks:page.blocks.length,committed:doc.committedPageCount,done:doc.counts.done,etaMs:processed?elapsed/processed*(pdf.numPages-processed):null,label:`Halaman ${pageNumber} · bagian ${i+1}/${page.blocks.length}`});
      }
    }
    finalCounts=replaceCounts(finalCounts,zeroCounts(),countBlocks(page.blocks));
    doc.blocks=page.blocks;doc.pages=[page];doc.assets=record.assets;doc.visibleCounts=countBlocks(page.blocks);
    onVisible?.(doc,record);onProgress?.({stage:'page-complete',page:pageNumber,total:pdf.numPages,committed:doc.committedPageCount,done:doc.counts.done});
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  doc.counts=finalCounts;doc.visibleCounts=countBlocks(doc.blocks);doc.metrics.totalRunMs=performance.now()-started;doc.extractionComplete=doc.committedPageCount===doc.numPages&&!doc.coverageIncompletePages;
  return {document:doc,translator};
  async function commitRecord(record){
    const before=performance.now();await commit(record,streamSummary(doc));doc.savedPageCount=doc.committedPageCount;doc.metrics.commitMs=(doc.metrics.commitMs||0)+performance.now()-before;
  }
}

/** Reclaim only verified public-model cache entries after a quota failure.
 * Deleting cached Responses never terminates the prepared inference worker.
 * Unknown entries and every other namespace are deliberately untouched. */
export async function releaseModelCacheForCheckpoint({cacheStorage=globalThis.caches,translator}={}){
  if(!cacheStorage?.keys||!cacheStorage?.open)return {removedEntries:0,skippedEntries:0};
  const name='semantik-model-v1';
  if(!(await cacheStorage.keys()).includes(name))return {removedEntries:0,skippedEntries:0};
  const cache=await cacheStorage.open(name);let removedEntries=0,skippedEntries=0;
  for(const request of await cache.keys()){
    let path;try{path=new URL(typeof request==='string'?request:request.url,'https://local.invalid').pathname;}catch{skippedEntries++;continue;}
    const model=/^\/__semantik_models__\/sha256\/[a-f0-9]{64}$/.test(path)||/^\/(?:r\/[a-f0-9]{16}\/)?models\//.test(path)||path==='/__semantik_cache_probe__';
    if(!model){skippedEntries++;continue;}
    if(await cache.delete(request))removedEntries++;
  }
  const warning='Ruang browser diprioritaskan untuk dokumen dan hasil Anda. Salinan model unduhan telah dihapus; mesin yang sudah dimuat tetap berjalan pada sesi ini. Offline belum siap. Setelah menutup tab, hubungkan jaringan untuk memuat model kembali.';
  if(removedEntries&&translator?.engine)translator.engine={...translator.engine,offlineReady:false,storageMode:'session',storageWarning:warning};
  return {removedEntries,skippedEntries,offlineReady:removedEntries?false:undefined,warning:removedEntries?warning:undefined};
}
