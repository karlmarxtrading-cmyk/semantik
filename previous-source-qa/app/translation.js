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
  ['linear regression','regresi linear']
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
  const sourceScientific=count(academicSpans(source).map(s=>s.value)),targetScientific=count(academicSpans(target).map(s=>s.value));
  if(!equalCounts(sourceScientific,targetScientific))issues.push('Satuan, ekspresi statistik, identitas sitasi, atau notasi ilmiah berubah.');
  if(/<ss(?:lit|term)\d+\/>/.test(target)||/<unk>/.test(target))issues.push('Terdapat penanda model yang belum terpulihkan.');
  return [...new Set(issues)];
}

function academicSpans(text) {
  const spans=[];
  const academicPhraseRanges=[...text.matchAll(new RegExp(ACADEMIC_TERM_PATTERN,'giu'))].map(m=>({start:m.index,end:m.index+m[0].length}));
  const add=(pattern,accept=()=>true)=>{ for(const m of text.matchAll(pattern)){if(!accept(m[0],m.index))continue;const start=m.index,end=start+m[0].length;if(!spans.some(s=>start<s.end&&end>s.start))spans.push({start,end,value:m[0]});} };
  add(/`+[^`]*`+/gu);
  add(/\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|(?<!\\)\$[^$\r\n]+\$/gu);
  add(/https?:\/\/[^\s<>]+|(?:doi\s*:\s*)?10\.\d{4,9}\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/giu);
  add(/\[(?:\d+[a-z]?(?:\s*[,;–−-]\s*\d+[a-z]?)*)\]/giu);
  // Author-year citations: retain identity, punctuation and year verbatim.
  add(/\((?:[\p{Lu}][\p{L}'’-]+(?:\s+(?:[\p{Lu}][\p{L}'’-]+|et\s+al\.|and|&))*\s*,?\s*(?:18|19|20)\d{2}[a-z]?(?:\s*;\s*)?)+\)/gu);
  add(/\b[\p{Lu}][\p{L}'’-]+(?:\s+et\s+al\.)?\s*\((?:18|19|20)\d{2}[a-z]?\)/gu);
  add(/(?<!\p{L})(?:p|P|n|N|t|F|r|R|z|Z|df|α|β|χ²|η²|R²)\s*(?:=|<|>|≤|≥|≈)\s*[-−+]?\d+(?:[.,]\d+)*(?:\s*[×x]\s*10\s*\^?[-−+]?\d+)?%?/gu);
  add(/(?<!\p{L})[-−+]?\d+(?:[.,]\d+)*(?:\s*±\s*\d+(?:[.,]\d+)*)?(?:\s*[×x]\s*10\s*\^?[-−+]?\d+)?\s*(?:μg|µg|mg|kg|g|μm|µm|mm|cm|km|m|mL|ml|L|l|nm|mol|mmol|μmol|µmol|s|ms|Hz|kHz|MHz|GHz|Pa|kPa|MPa|J|kJ|W|kW|V|mV|°C|°F|K)(?:[²³]|\^[-−]?\d+)?(?:\/(?:mL|ml|L|l|kg|g|m|s|mol)(?:[²³]|\^[-−]?\d+)?)?(?!\p{L})/gu);
  add(/\b\d+(?:[.,]\d+)*%\s*(?:CI|CrI)\s*[:=]?\s*(?:\[[^\]\n]{1,70}\]|\([^\)\n]{1,70}\))?/gu);
  add(/\b(?:[A-Z][a-z]?\d*){2,}(?:[+-])?\b/gu, (value,start)=>!Object.hasOwn(HEADINGS['en-id'],value.toLowerCase())&&!Object.hasOwn(HEADINGS['id-en'],value.toLowerCase())&&!academicPhraseRanges.some(range=>start>=range.start&&start+value.length<=range.end));
  return spans.sort((a,b)=>a.start-b.start);
}

function maskScientific(text, glossary, direction) {
  const spans=academicSpans(text).map(s=>({...s,replacement:s.value,kind:'lit'}));
  const userTerms=normalizeGlossary(glossary);
  const defaultTerms=ACADEMIC_TERMS.map(([en,id])=>direction==='id-en'?[id,en]:[en,id]);
  // User spans are claimed first, even when a default phrase is longer.
  for(const {terms,isDefault} of [{terms:userTerms,isDefault:false},{terms:defaultTerms,isDefault:true}]){
    for(const [source,target] of [...terms].sort((a,b)=>b[0].length-a[0].length)){
      const re=new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(source)}(?![\\p{L}\\p{N}_])`,'giu');
      for(const m of text.matchAll(re)){
        const start=m.index,end=start+m[0].length;
        if(spans.some(s=>start<s.end&&end>s.start))continue;
        const replacement=isDefault&&/\p{Lu}/u.test(m[0][0])?target[0].toUpperCase()+target.slice(1):target;
        spans.push({start,end,value:m[0],replacement,kind:'term'});
      }
    }
  }
  spans.sort((a,b)=>a.start-b.start);
  let prefix='ss';while(text.includes(`<${prefix}`))prefix+='x';
  let masked='',pos=0;const markers=[];
  spans.forEach((s,i)=>{const marker=`<${prefix}${s.kind}${i}/>`;masked+=text.slice(pos,s.start)+marker;markers.push({...s,marker});pos=s.end;});
  masked+=text.slice(pos);
  return {masked,markers,prefix};
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
function semanticWarnings(source,target,direction){
  const issues=[];
  const srcNeg=direction==='en-id'?/\b(?:not|never|without|neither|cannot|no)\b/i:/\b(?:tidak|bukan|tanpa|belum|jangan)\b/i;
  const trgNeg=direction==='en-id'?/\b(?:tidak|bukan|tanpa|belum|jangan)\b/i:/\b(?:not|never|without|neither|cannot|no)\b/i;
  if(srcNeg.test(source)!==trgNeg.test(target))issues.push('Periksa negasi: bentuk negatif mungkin berubah.');
  if(direction==='en-id'&&/\b(?:reported|found|observed|showed|demonstrated)\s+no\b/i.test(source)&&/\btidak\s+(?:melaporkan|menemukan|mengamati|menunjukkan|mendemonstrasikan)\b/i.test(target))issues.push('Periksa lingkup negasi: tidak ada hasil berbeda makna dengan tidak melaporkan hasil.');
  if(direction==='id-en'&&/\bmengestimasi\b/i.test(source)&&/\bcustomiz(?:e|es|ed|ing)\b/i.test(target))issues.push('Periksa verba estimasi: mengestimasi tidak setara dengan customize; koreksi hasil terhadap sumber.');
  const a=textWords(source).length,b=textWords(target).length;
  if(a>12&&(b<a*0.35||b>a*3))issues.push('Panjang hasil tidak sebanding dengan sumber; periksa kelengkapan makna.');
  if(a>3&&source.trim().toLowerCase()===target.trim().toLowerCase())issues.push('Teks belum berubah bahasa; periksa apakah terjemahan diperlukan.');
  const detected=detectLanguage(target),expected=direction==='en-id'?'id':'en';
  if(b>12&&detected!=='unknown'&&detected!==expected)issues.push('Bahasa hasil mungkin belum sesuai tujuan.');
  return issues;
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
  async translate(text,{signal,onProgress,glossary}={}){
    if(typeof text!=='string')throw TypeError('Sumber harus berupa teks.');
    if(text.length>100000)throw Error('Satu blok melebihi 100.000 karakter.');
    if(!this.engine||!this.direction)throw Error('Model belum siap.');
    if(this.busy)throw Error('Mesin sedang memproses blok lain.');
    throwIfAborted(signal);
    const glossaryEntries=normalizeGlossary(glossary);
    if(!text.trim())return {text,status:'translated',issues:[],engine:this.engine,semanticVerified:false};
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
        const protection=maskScientific(body,glossaryEntries,direction);
        try{
          const result=await this._request('translate',{sourceText:protection.masked,direction},{signal,onProgress});
          if(result.finishReason!=='complete')throw Error('Model mencapai batas keluaran sebelum selesai.');
          const restored=restoreScientific(result.targetText,protection);
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
          throw error;
        }
      };
      for(let i=0;i<segments.length;i++){results.push(await run(segments[i]));onProgress?.({phase:'segments',done:i+1,total:segments.length});}
      const target=results.join(''),structural=auditTranslation(text,target);
      if(structural.length)throw Error(structural.join(' '));
      return {text:target,status:issues.length?'review':'translated',issues:[...new Set(issues)],engine,inputTokens:tokensIn,outputTokens:tokensOut,semanticVerified:false};
    }catch(error){
      if(error.name==='AbortError')throw error;
      return {text,status:'review',issues:[`Terjemahan ditolak; teks sumber dipertahankan. ${error.message}`],engine,sourcePreserved:true,semanticVerified:false};
    }finally{if(this.epoch===epoch)this.busy=false;}
  }
  cancel(){this._fail(abortError());this.busy=false;}
  async dispose(){this.cancel();}
}
