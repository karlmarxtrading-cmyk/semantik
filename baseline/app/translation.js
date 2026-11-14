import {scientificSpans, isFormulaText, isLiteralOnly, ordinaryCase, claimAssociationIssues, mathTermsFor, ambiguousCapitalSpans, domainTermsFor} from './semantic-spans.js';
/**
 * Local academic translation adapter for the original CP16 ONNX engine.
 * Importing this module starts no worker and makes no network request.
 * `translated` means the structural checks passed, not human semantic approval.
 */
const WORKER_URL = new URL('../assets/engine.worker-4c3dcfee.js', import.meta.url);
const MAX_CHARS = 500;
// Exact, conservative academic phrases only; user terminology takes precedence.
const ACADEMIC_TERMS = Object.freeze([
  ['sample mean','rata-rata sampel'],
  ['standard deviation','simpangan baku'],
  ['standard error','galat baku'],
  ['sample size','ukuran sampel'],
  ['confidence interval','interval kepercayaan'],
  ['statistically significant','signifikan secara statistik'],
  ['null hypothesis','hipotesis nol'],
  ['effect size','ukuran efek'],
  ['linear regression','regresi linear'],
  ['literature review','kajian pustaka'],
  ['climate change','perubahan iklim'],
  ['statistically significant difference','perbedaan yang signifikan secara statistik']
]);
const ACADEMIC_TERM_PATTERN = `(?<![\\p{L}\\p{N}_])(?:${ACADEMIC_TERMS.flat().map(escapeRegex).join('|')})(?![\\p{L}\\p{N}_])`;
const NUMBERS = /(?<![\p{L}\p{N}_])[-−+]?\d+(?:[.,]\d+)*(?:[eE][-+]?\d+)?(?:%|[²³])?/gu;
const DOI = /(?:https?:\/\/(?:dx\.)?doi\.org\/|doi\s*:\s*)?10\.\d{4,9}\/[^\s<>]+/giu;
const HEADINGS = {
  'en-id': {abstract:'Abstrak',introduction:'Pendahuluan',background:'Latar Belakang',methods:'Metode',methodology:'Metodologi',results:'Hasil',discussion:'Pembahasan',conclusion:'Kesimpulan',conclusions:'Kesimpulan',references:'Daftar Pustaka',acknowledgments:'Ucapan Terima Kasih',acknowledgements:'Ucapan Terima Kasih',keywords:'Kata Kunci','materials and methods':'Bahan dan Metode','results and discussion':'Hasil dan Pembahasan','conflict of interest':'Konflik Kepentingan','funding':'Pendanaan'},
  'id-en': {abstrak:'Abstract',pendahuluan:'Introduction','latar belakang':'Background',metode:'Methods',metodologi:'Methodology',hasil:'Results',pembahasan:'Discussion',kesimpulan:'Conclusion','daftar pustaka':'References','ucapan terima kasih':'Acknowledgments','kata kunci':'Keywords','bahan dan metode':'Materials and Methods','hasil dan pembahasan':'Results and Discussion','konflik kepentingan':'Conflict of Interest',pendanaan:'Funding'}
};

function abortError() { return new DOMException('Pemrosesan dibatalkan.', 'AbortError'); }
function throwIfAborted(signal) { if (signal?.aborted) throw abortError(); }
function count(values) { const map = new Map(); for (const v of values) map.set(v, (map.get(v) || 0) + 1); return map; }
function equalCounts(a, b) { return a.size === b.size && [...a].every(([v,n]) => b.get(v) === n); }
function tokens(text, pattern) { return [...text.matchAll(pattern)].map(m => m[0]); }
function withoutDOI(text) { return text.replace(DOI, ' '); }
function textWords(text) { return text.match(/\p{L}+/gu) || []; }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Conservative heuristic. A user can always override the source language. */
export function detectLanguage(text) {
  const heading = String(text).trim().replace(/^\d+(?:\.\d+)*\.?\s+/, '').toLowerCase();
  if (Object.hasOwn(HEADINGS['en-id'], heading)) return 'en';
  if (Object.hasOwn(HEADINGS['id-en'], heading)) return 'id';
  const words = String(text).toLowerCase().match(/\p{L}+/gu) || [];
  const id = new Set('yang dan dengan dalam pada adalah untuk dari ini itu bahwa terhadap penelitian hasil metode antara oleh sebagai tidak suatu dapat kami juga telah tersebut berdasarkan menggunakan menunjukkan'.split(' '));
  const en = new Set('the and with in on is for from this that of to a an are was were by as not study results methods between we using showed shows have has our these their'.split(' '));
  let i=0,e=0; for(const w of words.slice(0,1800)){ if(id.has(w))i++; if(en.has(w))e++; }
  if(Math.max(i,e)<2 || Math.abs(i-e)<2) return 'unknown';
  return i>e ? 'id' : 'en';
}

/** Structural invariants only. Returns human-readable problems; never claims semantic equivalence. */
export function auditTranslation(source, target) {
  const issues=[];
  if(typeof source!=='string'||typeof target!=='string')return ['Teks sumber atau hasil tidak valid.'];
  if(source.trim()&&!target.trim())issues.push('Hasil terjemahan kosong.');
  const sn=count(tokens(withoutDOI(source),NUMBERS)),tn=count(tokens(withoutDOI(target),NUMBERS));
  if(!equalCounts(sn,tn))issues.push('Angka atau nilai statistik berubah, hilang, atau bertambah.');
  if(!equalCounts(count(tokens(source,DOI)),count(tokens(target,DOI))))issues.push('DOI berubah, hilang, atau bertambah.');
  for(const re of [/https?:\/\/[^\s<>]+/giu, /\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|(?<!\\)\$[^$\r\n]+\$/gu, /\[(?:\d+[a-z]?(?:\s*[,;–−-]\s*\d+[a-z]?)*)\]/giu]){
    if(!equalCounts(count(tokens(source,re)),count(tokens(target,re))))issues.push('Rumus, tautan, atau sitasi terlindungi berubah.');
  }
  const sourceSpans=academicSpans(source);
  const sourceScientific=count(sourceSpans.map(s=>s.value)),targetScientific=count(academicSpans(target,{taxa:sourceSpans.filter(s=>s.kind==='taxon').map(s=>s.value)}).map(s=>s.value));
  if(!equalCounts(sourceScientific,targetScientific))issues.push('Satuan, ekspresi statistik, identitas sitasi, atau notasi ilmiah berubah.');
  if(/<ss(?:lit|term)\d+\/>/.test(target)||/<unk>/.test(target))issues.push('Terdapat penanda model yang belum terpulihkan.');
  issues.push(...claimAssociationIssues(source,target));
  return [...new Set(issues)];
}

const academicSpans = scientificSpans;

function maskScientific(text, glossary, direction, context=text) {
  const spans=academicSpans(text).map(s=>({...s,replacement:s.value,kind:'lit'}));
  const userTerms=normalizeGlossary(glossary);
  const defaultTerms=[...ACADEMIC_TERMS.map(([en,id])=>direction==='id-en'?[id,en]:[en,id]),...mathTermsFor(context,direction),...domainTermsFor(context,direction)];
  // User spans are claimed first, even when a default phrase is longer.
  for(const {terms,isDefault} of [{terms:userTerms,isDefault:false},{terms:defaultTerms,isDefault:true}]){
    for(const [source,target] of [...terms].sort((a,b)=>b[0].length-a[0].length)){
      const re=new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(source)}(?![\\p{L}\\p{N}_])`,'giu');
      for(const m of text.matchAll(re)){
        const start=m.index,end=start+m[0].length;
        if(isDefault&&target==='nyatakan'&&(!/^(?:\s*\d+[.)]?\s*)?$|\b(?:and|then)\s+$/iu.test(text.slice(0,start))||!/^\s+(?:(?:the|your|each|this|an?|all)\s+)?(?:solution|answer|result|value|set|interval|equation|inequality|expression|in|as|using)\b/iu.test(text.slice(end))))continue;
        if(isDefault&&target==='gabungan'&&/\b(?:trade|labor|labour|credit|political|European|Soviet)\s+$/iu.test(text.slice(0,start)))continue;
        if(isDefault&&target==='penyelesaian'&&/\b(?:saline|aqueous|sodium|chloride|reagent|molar|chemical)\b/iu.test(text.slice(Math.max(0,start-45),Math.min(text.length,end+45))))continue;
        if(spans.some(s=>start<s.end&&end>s.start))continue;
        const replacement=isDefault&&/\p{Lu}/u.test(m[0][0])?target[0].toUpperCase()+target.slice(1):target;
        spans.push({start,end,value:m[0],replacement,kind:'term'});
      }
    }
  }
  for(const span of ambiguousCapitalSpans(text))if(!spans.some(s=>span.start<s.end&&span.end>s.start))spans.push({...span,replacement:span.value,kind:'lit'});
  spans.sort((a,b)=>a.start-b.start);
  let prefix='ss';while(text.includes(`<${prefix}`))prefix+='x';
  let masked='',pos=0;const markers=[];
  spans.forEach((s,i)=>{const marker=`<${prefix}${s.kind}${i}/>`;masked+=text.slice(pos,s.start)+marker;markers.push({...s,marker});pos=s.end;});
  masked+=text.slice(pos);
  return {masked:ordinaryCase(masked),markers,prefix};
}
function restoreScientific(target, protection){
  let output=target,last=-1;
  for(const s of protection.markers){
    const index=target.indexOf(s.marker);
    if(index<0||target.indexOf(s.marker,index+s.marker.length)>=0||index<last)throw Error('Penanda ilmiah hilang, berulang, atau berubah urutan.');
    last=index;output=output.replace(s.marker,s.replacement);
  }
  if(output.includes(`<${protection.prefix}`))throw Error('Penanda ilmiah tidak dapat dipulihkan.');
  return output;
}
function normalizeGlossary(glossary){
  if(!glossary)return [];
  let entries=Array.isArray(glossary)?glossary.map(x=>Array.isArray(x)?x:[x.source,x.target]):Object.entries(glossary);
  if(entries.length>200)throw Error('Glosarium dibatasi 200 istilah.');
  return entries.map(([s,t])=>{
    if(typeof s!=='string'||typeof t!=='string'||!s.trim()||!t.trim()||s.length>160||t.length>200)throw Error('Setiap istilah glosarium harus berisi sumber dan terjemahan yang valid.');
    if(/[<>\r\n]/u.test(s+t))throw Error('Glosarium tidak boleh berisi markup atau baris baru.');
    if(!equalCounts(count(tokens(s,NUMBERS)),count(tokens(t,NUMBERS))))throw Error('Glosarium tidak boleh mengubah angka.');
    return [s.trim(),t.trim()];
  });
}

/** Lossless sentence/clause segmentation. Segments joined together equal the input. */
export function splitForTranslation(text, maxChars=MAX_CHARS, protectedRanges=[]){
  if(typeof text!=='string')throw TypeError('Sumber harus berupa teks.');
  if(!text)return [];
  if(!Number.isInteger(maxChars)||maxChars<80)throw RangeError('Batas segmen minimal 80 karakter.');
  const spans=[...academicSpans(text),...protectedRanges];
  const safe=i=>!spans.some(s=>i>s.start&&i<s.end);
  const boundaries=new Set([0,text.length]);
  if(typeof Intl.Segmenter==='function'){
    for(const s of new Intl.Segmenter('en',{granularity:'sentence'}).segment(text))if(safe(s.index+s.segment.length))boundaries.add(s.index+s.segment.length);
  }else{for(const m of text.matchAll(/[.!?](?:["')\]]*)\s+/gu))if(safe(m.index+m[0].length))boundaries.add(m.index+m[0].length);}
  for(const m of text.matchAll(/\n+/gu))if(safe(m.index+m[0].length))boundaries.add(m.index+m[0].length);
  const sorted=[...boundaries].sort((a,b)=>a-b),result=[];
  for(let k=0;k<sorted.length-1;k++){
    let start=sorted[k],end=sorted[k+1];
    while(end-start>maxChars){
      const slice=text.slice(start,Math.min(start+maxChars,end));
      const candidates=[...slice.matchAll(/[,;:]\s+|\s+(?:and|but|whereas|while|dan|tetapi|sedangkan|yang)\s+|\s+/giu)].map(m=>start+m.index+m[0].length).filter(i=>i>start+Math.min(60,maxChars/3)&&safe(i));
      const cut=candidates.at(-1);if(!cut)break;
      result.push(text.slice(start,cut));start=cut;
    }
    if(start<end)result.push(text.slice(start,end));
  }
  return result;
}
function splitRetry(text,direction,glossary){
  const spans=maskScientific(text,glossary,direction).markers,mid=text.length/2;
  const boundaries=[...text.matchAll(/[,;:]\s+|\s+/gu)].map(m=>m.index+m[0].length).filter(i=>i>30&&i<text.length-30&&!spans.some(s=>i>s.start&&i<s.end));
  boundaries.sort((a,b)=>Math.abs(a-mid)-Math.abs(b-mid));
  if(!boundaries.length)return null;
  return [text.slice(0,boundaries[0]),text.slice(boundaries[0])];
}
export function semanticWarnings(source,target,direction){
  const issues=[];
  // Uncertainty phrases are semantic units, not independent negation tokens.
  const uncertainty=/\b(?:uncertain|uncertainty|ketidakpastian|unclear|inconclusive|not\s+(?:yet\s+)?(?:certain|clear)|belum\s+pasti|tidak\s+pasti|tidak\s+jelas|belum\s+jelas)\b/giu;
  const normalizePolarity=t=>t.replace(/\b(\p{L}+)n['’]t\b/giu,'$1 not').replace(uncertainty,'UNCERTAINTY').replace(/\b(?:asymmetric|asymmetrical|asimetris|tidak simetris)\b/giu,'ASYMMETRY').replace(/\b(?:unchanged|not changed|tidak berubah|tak berubah)\b/giu,'UNCHANGED');
  const sc=normalizePolarity(source),tc=normalizePolarity(target);
  const srcNeg=direction==='en-id'?/\b(?:not|never|without|neither|cannot|no)\b/gi:/\b(?:tidak|bukan|tanpa|belum|jangan|tak)\b/gi;
  const trgNeg=direction==='en-id'?/\b(?:tidak|bukan|tanpa|belum|jangan|tak)\b/gi:/\b(?:not|never|without|neither|cannot|no)\b/gi;
  if((sc.match(srcNeg)||[]).length!==(tc.match(trgNeg)||[]).length)issues.push('Periksa negasi: bentuk negatif mungkin berubah.');
  for(const marker of ['ASYMMETRY','UNCHANGED'])if((sc.match(new RegExp(marker,'g'))||[]).length!==(tc.match(new RegExp(marker,'g'))||[]).length)issues.push('Periksa negasi leksikal: makna sifat atau perubahan mungkin berbalik.');
  if((sc.match(/UNCERTAINTY/g)||[]).length!==(tc.match(/UNCERTAINTY/g)||[]).length)issues.push('Periksa ketidakpastian: tingkat kepastian klaim mungkin berubah.');
  const possibility=direction==='en-id'?/\b(?:may|might|could|possibly|potentially)\b/i:/\b(?:mungkin|berpotensi|kemungkinan)\b/i;
  const targetPossibility=direction==='en-id'?/\b(?:mungkin|berpotensi|kemungkinan|dapat)\b/i:/\b(?:may|might|could|possible|possibly|potential|potentially|can)\b/i;
  if(possibility.test(source)&&!targetPossibility.test(target))issues.push('Periksa modalitas: kemungkinan tidak boleh berubah menjadi kepastian.');
  const quantifiers=direction==='en-id'?[[/\b(?:all|every|each)\b/i,/\b(?:semua|seluruh|setiap|masing-masing)\b/i],[/\b(?:some|several)\b/i,/\b(?:beberapa|sebagian)\b/i]]:[[/\b(?:semua|seluruh|setiap)\b/i,/\b(?:all|every|each)\b/i],[/\b(?:beberapa|sebagian)\b/i,/\b(?:some|several)\b/i]];
  for(const [a,b] of quantifiers)if(a.test(source)&&!b.test(target))issues.push('Periksa kuantor: cakupan pernyataan mungkin berubah.');
  if(direction==='en-id'&&/\b(?:reported|found|observed|showed|demonstrated)\s+no\b/i.test(source)&&/\btidak\s+(?:melaporkan|menemukan|mengamati|menunjukkan|mendemonstrasikan)\b/i.test(target))issues.push('Periksa lingkup negasi: tidak ada hasil berbeda makna dengan tidak melaporkan hasil.');
  if(direction==='id-en'&&/\bmengestimasi\b/i.test(source)&&/\bcustomiz(?:e|es|ed|ing)\b/i.test(target))issues.push('Periksa verba estimasi: mengestimasi tidak setara dengan customize; koreksi hasil terhadap sumber.');
  if(ambiguousCapitalSpans(source).some(s=>target.includes(s.value)))issues.push('Teks kapital belum dapat dibedakan dari singkatan; periksa istilah atau berikan glosarium.');
  const a=textWords(source).length,b=textWords(target).length;
  if(a>12&&(b<a*0.35||b>a*3))issues.push('Panjang hasil tidak sebanding dengan sumber; periksa kelengkapan makna.');
  if(a>=2&&source.trim().toLowerCase()===target.trim().toLowerCase()&&!isLiteralOnly(source))issues.push('Teks belum berubah bahasa; periksa apakah terjemahan diperlukan.');
  const detected=detectLanguage(target),expected=direction==='en-id'?'id':'en';
  if(b>12&&detected!=='unknown'&&detected!==expected)issues.push('Bahasa hasil mungkin belum sesuai tujuan.');
  return [...new Set(issues)];
}

export class Translator {
  constructor(){this.worker=null;this.pending=new Map();this.sequence=0;this.direction=null;this.engine=null;this.busy=false;this.epoch=0;}
  _start(){
    if(this.worker)return;
    this.worker=new Worker(WORKER_URL,{type:'module',name:'semantik-pdf-translation'});
    const worker=this.worker;
    this.worker.onmessage=({data})=>{
      if(this.worker!==worker)return;
      const p=this.pending.get(data.id);if(!p)return;
      if(data.progress){p.onProgress?.({phase:'model',...data.progress});return;}
      if(data.tokenProgress){p.onProgress?.({phase:'translation',tokens:data.tokenProgress});return;}
      this.pending.delete(data.id);p.cleanup();
      if(data.error)p.reject(new Error(data.error));else p.resolve(data.result);
    };
    this.worker.onerror=event=>{if(this.worker===worker)this._fail(new Error(event.message||'Mesin penerjemah lokal berhenti.'));};
    this.worker.onmessageerror=()=>{if(this.worker===worker)this._fail(new Error('Respons mesin penerjemah tidak dapat dibaca.'));};
  }
  _fail(error){
    this.epoch++;this.worker?.terminate();this.worker=null;this.direction=null;this.engine=null;this.busy=false;
    for(const p of this.pending.values()){p.cleanup();p.reject(error);}this.pending.clear();
  }
  _request(action,payload,{signal,onProgress,timeout=300000}={}){
    throwIfAborted(signal);this._start();const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const abort=()=>this.cancel();
      const timer=setTimeout(()=>this._fail(new Error('Mesin terlalu lama merespons. Coba lagi dengan dokumen lebih pendek.')),timeout);
      const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
      signal?.addEventListener('abort',abort,{once:true});
      this.pending.set(id,{resolve,reject,cleanup,onProgress});
      try{this.worker.postMessage({id,action,payload});}catch(error){this.pending.delete(id);cleanup();reject(error);}
    });
  }
  async prepare(direction,{onProgress,signal}={}){
    if(!['id-en','en-id'].includes(direction))throw Error('Arah bahasa harus Indonesia–Inggris atau Inggris–Indonesia.');
    throwIfAborted(signal);
    if(this.busy)throw Error('Mesin sedang memproses.');
    if(this.direction===direction&&this.engine)return this.engine;
    this.busy=true;const epoch=this.epoch;
    try{this.engine=await this._request('prepare',direction,{signal,onProgress,timeout:600000});this.direction=direction;return this.engine;}
    catch(error){if(this.epoch===epoch)this._fail(error);throw error;}finally{if(this.epoch===epoch)this.busy=false;}
  }
  async translate(text,{signal,onProgress,glossary,context=text}={}){
    if(typeof text!=='string')throw TypeError('Sumber harus berupa teks.');
    if(text.length>100000)throw Error('Satu blok melebihi 100.000 karakter.');
    if(!this.engine||!this.direction)throw Error('Model belum siap.');
    if(this.busy)throw Error('Mesin sedang memproses blok lain.');
    throwIfAborted(signal);
    const glossaryEntries=normalizeGlossary(glossary);
    if(!text.trim()||isLiteralOnly(text))return {text,status:'preserved',outcome:'preserved',retryable:false,issues:[],engine:this.engine,method:'literal-preservation',semanticVerified:false};
    this.busy=true;const epoch=this.epoch;
    const direction=this.direction,engine=this.engine,issues=[];
    try{
      const segments=splitForTranslation(text,MAX_CHARS,maskScientific(text,glossaryEntries,direction).markers),results=[];let tokensIn=0,tokensOut=0;
      const run=async(segment,depth=0)=>{
        throwIfAborted(signal);
        const pre=segment.match(/^\s*/u)[0],post=segment.match(/\s*$/u)[0],body=segment.trim();
        if(!body)return segment;
        const heading=HEADINGS[direction][body.toLowerCase().replace(/:$/u,'')];
        if(heading&&body.length<55&&glossaryEntries.length===0)return pre+heading+(body.endsWith(':')?':':'')+post;
        const protection=maskScientific(body,glossaryEntries,direction,context);
        let rawCandidate=null,restoredCandidate=null;
        if(!/[\p{L}\p{N}]/u.test(protection.masked.replace(/<ss[a-z]*\d+\/>/gu,''))){const restored=restoreScientific(protection.masked,protection);issues.push(...semanticWarnings(body,restored,direction));return pre+restored+post;}
        try{
          const result=await this._request('translate',{sourceText:protection.masked,direction},{signal,onProgress});
          if(result.finishReason!=='complete')throw Error('Model mencapai batas keluaran sebelum selesai.');
          rawCandidate=result.targetText;
          const restored=restoreScientific(result.targetText,protection);restoredCandidate=restored;
          const structural=auditTranslation(body,restored);
          if(structural.length)throw Error(structural.join(' '));
          tokensIn+=result.inputTokens||0;tokensOut+=result.outputTokens||0;
          issues.push(...semanticWarnings(body,restored,direction));
          return pre+restored+post;
        }catch(error){
          if(error.name==='AbortError')throw error;
          if(/kapasitas model|token melebihi batas|SOURCE_COMPLEXITY|batas keluaran/u.test(error.message)&&depth<3){
            const split=splitRetry(segment,direction,glossaryEntries);
            if(split){issues.push('Satu kalimat panjang dibagi menjadi beberapa klausa; periksa hubungan antarklausa.');let output='';for(const part of split)output+=await run(part,depth+1);return output;}
          }
          error.segmentSource=body;error.candidateText=restoredCandidate;error.rawCandidate=rawCandidate;throw error;
        }
      };
      for(let i=0;i<segments.length;i++){results.push(await run(segments[i]));onProgress?.({phase:'segments',done:i+1,total:segments.length});}
      const target=results.join(''),structural=auditTranslation(text,target);
      if(structural.length)throw Error(structural.join(' '));
      return {text:target,status:issues.length?'review':'translated',outcome:'translated',retryable:false,issues:[...new Set(issues)],engine,inputTokens:tokensIn,outputTokens:tokensOut,method:tokensIn?'local-model-with-protected-spans':'controlled-terminology',semanticVerified:false};
    }catch(error){
      if(error.name==='AbortError')throw error;
      const rejected=/PROTECTED|penanda|Penanda|berubah|hilang|bertambah|urutan|kosong|klaim|batas keluaran|SOURCE_COMPLEXITY|kapasitas|token melebihi/i.test(error.message);
      return {text,status:'review',outcome:rejected?'rejected':'failed',retryable:true,issues:[rejected?'Kandidat terjemahan ditolak untuk menjaga isi. Sumber dipertahankan; coba ulang atau tinjau bagian ini.':'Penerjemahan bagian ini gagal. Sumber dipertahankan; coba ulang setelah mesin siap.'],diagnostics:[{stage:'translation',name:error.name,message:error.message,segmentSource:error.segmentSource??null,candidateText:error.candidateText??null,rawCandidate:error.rawCandidate??null}],engine,sourcePreserved:true,semanticVerified:false};
    }finally{if(this.epoch===epoch)this.busy=false;}
  }
  async translateTable(block, options={}){
    if(!Array.isArray(block.rows)||block.rows.some(row=>!Array.isArray(row)))throw Error('Struktur tabel tidak valid.');
    const translatedRows=[],issues=[],diagnostics=[];let inputTokens=0,outputTokens=0,failed=false,hasTranslated=false;
    for(let r=0;r<block.rows.length;r++){
      const row=[];
      for(let c=0;c<block.rows[r].length;c++){
        throwIfAborted(options.signal);
        const source=String(block.rows[r][c]);
        const result=isFormulaText(source)||/^[-−+\d\s.,:%()[\]\/]+$/u.test(source)?{text:source,outcome:'preserved',issues:[]}:await this.translate(source,{...options,context:block.text||block.rows.flat().join(' ')});
        row.push(result.text);failed ||= !!result.sourcePreserved;hasTranslated ||= result.outcome==='translated';
        issues.push(...(result.issues||[]));diagnostics.push(...(result.diagnostics||[]).map(d=>({...d,row:r,column:c})));
        inputTokens+=result.inputTokens||0;outputTokens+=result.outputTokens||0;
      }
      translatedRows.push(row);
    }
    return {text:translatedRows.map(row=>row.join(' | ')).join('\n'),translatedRows,status:failed||issues.length?'review':hasTranslated?'translated':'preserved',outcome:failed?'rejected':hasTranslated?'translated':'preserved',sourcePreserved:failed,retryable:failed,issues:[...new Set(issues)],diagnostics,inputTokens,outputTokens,engine:this.engine,semanticVerified:false,method:'cell-by-cell-local'};
  }
  cancel(){this._fail(abortError());this.busy=false;}
  async dispose(){this.cancel();}
}
