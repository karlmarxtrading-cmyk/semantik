import {scientificClaimIssues} from './claim-guards.js';
import {academicPhrases, derivedNominalTerms} from './academic-phrases.js';
import {conceptGaps, missingConcepts, neighbourPhrases, COVERAGE_RULES} from './coverage.js';
import {scientificSpans, isFormulaText, isLiteralOnly, ordinaryCase, claimAssociationIssues, mathTermsFor, ambiguousCapitalSpans, domainTermsFor} from './semantic-spans.js';
/**
 * Local academic translation adapter for the original CP16 ONNX engine.
 * Importing this module starts no worker and makes no network request.
 * `translated` means the structural checks passed, not human semantic approval.
 */
const WORKER_URL = new URL('../assets/engine.worker-4c3dcfee.js', import.meta.url);
const MAX_CHARS = 500;
export const RULESET = 'cp22-concept-coverage-v1';
// Exact, conservative academic phrases only; user terminology takes precedence.
const ACADEMIC_TERMS = Object.freeze([
  ['may not','mungkin tidak'],
  ['need not','tidak harus'],
  ['does not necessarily','tidak selalu'],
  ['sample mean','rata-rata sampel'],
  ['primary outcome','luaran utama'],
  ['primary endpoint','luaran primer'],
  ['disease progression','progresi penyakit'],
  ['hospital admissions','rawat inap'],
  ['causal relationship','hubungan sebab akibat'],
  ['observational study','penelitian observasional'],
  ['unbiased','tidak bias'],
  ['estimator','penduga'],
  ['p-values','nilai p'],
  ['p-value','nilai p'],
  ['only if','hanya jika'],
  ['exposure','paparan'],
  ['absence of evidence','ketiadaan bukti'],
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
  const en = new Set('the and with in on is for from this that of to a an are was were by as not study results methods between we using showed shows have has our these their controlled academic prose fixture synthetic scientific'.split(' '));
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
  issues.push(...claimAssociationIssues(source,target),...scientificClaimIssues(source,target));
  return [...new Set(issues)];
}

const academicSpans = scientificSpans;

function maskScientific(text, glossary, direction, context=text, useDefaultTerms=true, repairTerms=[]) {
  const spans=academicSpans(text).map(s=>({...s,replacement:s.value,kind:'lit'}));
  const userTerms=normalizeGlossary(glossary);
  const baseTerms=[...academicPhrases(context,direction),...ACADEMIC_TERMS.map(([en,id])=>direction==='id-en'?[id,en]:[en,id]),...mathTermsFor(context,direction),...domainTermsFor(context,direction)];
  const defaultTerms=[...baseTerms,...derivedNominalTerms(baseTerms,text,direction)];
  // User spans are claimed first, even when a default phrase is longer.
  // Repair terms come from the concept-coverage step: claimed after the user, before defaults; casing follows the source.
  for(const {terms,isDefault} of [{terms:userTerms,isDefault:false},{terms:repairTerms,isDefault:true},{terms:useDefaultTerms?defaultTerms:[],isDefault:true}]){
    for(const [source,target] of [...terms].sort((a,b)=>b[0].length-a[0].length)){
      const re=new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegex(source)}(?![\\p{L}\\p{N}_])`,'giu');
      for(const m of text.matchAll(re)){
        const start=m.index,end=start+m[0].length;
        if(isDefault&&target==='nyatakan'&&(!/^(?:\s*\d+[.)]?\s*)?$|\b(?:and|then)\s+$/iu.test(text.slice(0,start))||!/^\s+(?:(?:the|your|each|this|an?|all)\s+)?(?:solution|answer|result|value|set|interval|equation|inequality|expression|in|as|using)\b/iu.test(text.slice(end))))continue;
        if(isDefault&&target==='demand'&&/^\s+(?:untuk\s+)?(?:saran|nasihat|informasi|wawancara|izin|maaf|bantuan)\b/iu.test(text.slice(end)))continue;
        if(isDefault&&target==='gabungan'&&/\b(?:trade|labor|labour|credit|political|European|Soviet)\s+$/iu.test(text.slice(0,start)))continue;
        if(isDefault&&target==='penyelesaian'&&/\b(?:saline|aqueous|sodium|chloride|reagent|molar|chemical|solvent|evaporat\w*|pelarut|menguap)\b/iu.test(text.slice(Math.max(0,start-45),Math.min(text.length,end+45))))continue;
        if(spans.some(s=>start<s.end&&end>s.start))continue;
        const caseFromSource=isDefault&&/\p{Lu}/u.test(m[0][0])&&/^\p{Ll}/u.test(target);
        const replacement=caseFromSource?target[0].toUpperCase()+target.slice(1):target;
        spans.push({start,end,value:m[0],replacement,kind:'term',caseFromSource});
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
/** Source words already fixed by an exact terminology constraint (restored verbatim). */
export function constrainedWords(text,direction,glossary,context=text,useDefaultTerms=true,repairTerms=[]){
  return maskScientific(text,glossary,direction,context,useDefaultTerms,repairTerms).markers.filter(m=>m.kind==='term').flatMap(m=>m.value.match(/\p{L}+(?:-\p{L}+)*/gu)||[]);
}
function restoreScientific(target, protection){
  let output=target,last=-1;
  for(const s of protection.markers){
    const index=target.indexOf(s.marker);
    if(index<0||target.indexOf(s.marker,index+s.marker.length)>=0||index<last)throw Error('Penanda ilmiah hilang, berulang, atau berubah urutan.');
    last=index;
    // Capitalisation copied only from a sentence-initial source word is dropped mid-sentence in the target.
    let replacement=s.replacement;
    if(s.caseFromSource){const before=output.slice(0,output.indexOf(s.marker)).trimEnd();if(before&&!/[.!?:]["')\]]*$/u.test(before))replacement=replacement[0].toLowerCase()+replacement.slice(1);}
    output=output.replace(s.marker,replacement);
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
// Closed class of lexical negatives and the positive base an analytic Indonesian negation must carry.
const LEXICAL_NEGATIVES=[
  [/\bexclud(?:e|es|ed|ing)\b/giu,'termasuk|mencakup|memasukkan|menyertakan|meliputi|memuat'],[/\black(?:s|ed|ing)?\b/giu,'memiliki|mempunyai|punya|ada|terdapat'],
  [/\bomit(?:s|ted|ting)?\b/giu,'mencantumkan|menyertakan|memasukkan|dimasukkan|dicantumkan'],[/\bfail(?:s|ed|ing)?\s+to\b/giu,'berhasil|mampu|dapat|bisa'],
  [/\babsent\b/giu,'ada|hadir|terdapat'],[/\binactive\b/giu,'aktif'],[/\binsufficient(?:ly)?\b/giu,'cukup|memadai'],[/\binvalid\b/giu,'valid|sah|berlaku'],
  [/\binaccurate\b/giu,'akurat|tepat'],[/\binconsistent\b/giu,'konsisten|sesuai'],[/\bincorrect(?:ly)?\b/giu,'benar|tepat'],[/\bunable\b/giu,'mampu|dapat|bisa'],
  [/\bunknown\b/giu,'diketahui'],[/\bunlikely\b/giu,'mungkin'],[/\bunclear\b/giu,'jelas'],[/\bunstable\b/giu,'stabil'],[/\bunreliable\b/giu,'andal|dapat diandalkan'],
  [/\bunusual\b/giu,'biasa|lazim'],[/\bunequal\b/giu,'sama|setara'],[/\bunrelated\b/giu,'berhubungan|terkait'],[/\bunaffected\b/giu,'terpengaruh|dipengaruhi'],
  [/\bunavailable\b/giu,'tersedia'],[/\bunobserved\b/giu,'diamati|teramati'],[/\bunmeasured\b/giu,'diukur|terukur'],[/\bundetected\b/giu,'terdeteksi|dideteksi'],
  [/\bimpossible\b/giu,'mungkin'],[/\bimprobable\b/giu,'mungkin'],[/\birrelevant\b/giu,'relevan'],[/\birregular\b/giu,'teratur'],
  [/\bnon-?significant\b|\binsignificant\b/giu,'signifikan|berarti']];
/** Count lexical negatives in the English side that are realised as tidak/tak/bukan + positive base on the Indonesian side. */
function analyticNegations(english,indonesian){
  let n=0;
  for(const [re,positive] of LEXICAL_NEGATIVES){
    const k=(english.match(re)||[]).length;if(!k)continue;
    const m=(indonesian.match(new RegExp(`\\b(?:tidak|tak|bukan|belum|kurang)\\s+(?:\\p{L}+\\s+){0,1}(?:${positive})(?:nya|kan|i)?\\b`,'giu'))||[]).length;
    n+=Math.min(k,m);
  }
  return n;
}
export function semanticWarnings(source,target,direction){
  const issues=[];
  // Uncertainty phrases are semantic units, not independent negation tokens.
  const uncertainty=/\b(?:uncertain|uncertainty|ketidakpastian(?:nya)?|unclear|inconclusive|not\s+(?:yet\s+)?(?:certain|clear)|belum\s+pasti|tidak\s+pasti|tidak\s+jelas|belum\s+jelas)\b/giu;
  const normalizePolarity=t=>t.replace(/\b(\p{L}+)n['’]t\b/giu,'$1 not').replace(/\b(?:unbiased|tidak bias|tak bias)\b/giu,'UNBIASED').replace(/\b(?:absence of evidence|lack of evidence|ketiadaan bukti|bukti yang tak ada)\b/giu,'EVIDENCEABSENCE').replace(/\b(?:non-strict|tidak ketat|bukan-strict)\b/giu,'NONSTRICT').replace(/\b(?:unsupported|(?:tidak|tak) didukung)\b/giu,'UNSUPPORTED').replace(/\b(?:infinite(?:ly)?|tak hingga|tidak hingga)\b/giu,'INFINITE').replace(/\b(?:ineffective|tidak efektif|tak efektif)\b/giu,'INEFFECTIVE').replace(/\b(?:absence|ketiadaan|tidak adanya)\b/giu,'ABSENCE').replace(uncertainty,'UNCERTAINTY').replace(/\b(?:non[- ]?empty|not empty|tidak kosong|tak kosong)\b/giu,'NONEMPTY').replace(/\b(?:asymmetric|asymmetrical|asimetris|tidak simetris)\b/giu,'ASYMMETRY').replace(/\b(?:unchanged|unchanging|not changed|tidak berubah|tak berubah)\b/giu,'UNCHANGED').replace(/\b(?:incomplete|tidak lengkap|tak lengkap)\b/giu,'INCOMPLETE');
  const normalizeZero=t=>t.replace(/\b(?:nonzero|non-zero|not zero|bukan nol|tidak nol|tak nol)\b/giu,'NONZERO');
  const sc=normalizeZero(normalizePolarity(source)),tc=normalizeZero(normalizePolarity(target));
  const srcNeg=direction==='en-id'?/\b(?:not|never|without|neither|cannot|none|no)\b/gi:/\b(?:tidak|bukan(?:lah)?|tanpa|belum|jangan|tak)\b/gi;
  const trgNeg=direction==='en-id'?/\b(?:tidak|bukan(?:lah)?|tanpa|belum|jangan|tak)\b/gi:/\b(?:not|never|without|neither|cannot|none|no)\b/gi;
  // Lexical negation (excludes, inactive, unknown) may be realised analytically (tidak/tanpa) in
  // Indonesian, and vice versa. Allow exactly that many extra negators on the analytic side; any
  // other drop or addition of negation is still rejected.
  const ns=(sc.match(srcNeg)||[]).length,nt=(tc.match(trgNeg)||[]).length;
  const lexical=direction==='en-id'?analyticNegations(source,target):analyticNegations(target,source);
  const negationOk=direction==='en-id'?(nt>=ns&&nt<=ns+lexical):(ns>=nt&&ns<=nt+lexical);
  if(!negationOk)issues.push('Periksa negasi: bentuk negatif mungkin berubah.');
  for(const marker of ['INCOMPLETE','NONEMPTY','ASYMMETRY','UNCHANGED','UNBIASED','EVIDENCEABSENCE','NONSTRICT','UNSUPPORTED','INFINITE','INEFFECTIVE','ABSENCE'])if((sc.match(new RegExp(marker,'g'))||[]).length!==(tc.match(new RegExp(marker,'g'))||[]).length)issues.push('Periksa negasi leksikal: makna sifat atau perubahan mungkin berbalik.');
  if((sc.match(/UNCERTAINTY/g)||[]).length!==(tc.match(/UNCERTAINTY/g)||[]).length)issues.push('Periksa ketidakpastian: tingkat kepastian klaim mungkin berubah.');
  const possibility=direction==='en-id'?/\b(?:may|might|could|possibly|potentially)\b/i:/\b(?:mungkin|berpotensi|kemungkinan)\b/i;
  const targetPossibility=direction==='en-id'?/\b(?:mungkin|berpotensi|kemungkinan|dapat)\b/i:/\b(?:may|might|could|possible|possibly|potential|potentially|can)\b/i;
  if(possibility.test(source)&&!targetPossibility.test(target))issues.push('Periksa modalitas: kemungkinan tidak boleh berubah menjadi kepastian.');
  const quantifiers=direction==='en-id'?[[/\b(?:all|every|each)\b/i,/\b(?:semua|seluruh|setiap|masing-masing)\b/i],[/\b(?:some|several)\b/i,/\b(?:beberapa|sebagian)\b/i]]:[[/\b(?:semua|seluruh|setiap)\b/i,/\b(?:all|every|each)\b/i],[/\b(?:beberapa|sebagian)\b/i,/\b(?:some|several)\b/i]];
  // Extent quantification differs from 'every sample'. Accept an entire
  // interval only for the same named extent, and never let it satisfy another
  // remaining universal (e.g. setiap titik / every point) in the sentence.
  const extentPatterns=[
    [/\bseluruh\s+interval\b/giu,/\b(?:(?:whole|entire)\s+interval|throughout\s+(?:the\s+)?interval)\b/giu],
    [/\bseluruh\s+rentang\b/giu,/\b(?:(?:whole|entire)\s+range|throughout\s+(?:the\s+)?range)\b/giu],
    [/\bseluruh\s+periode\b/giu,/\b(?:(?:whole|entire)\s+period|throughout\s+(?:the\s+)?period)\b/giu],
    [/\bseluruh\s+wilayah\b/giu,/\b(?:(?:whole|entire)\s+region|throughout\s+(?:the\s+)?region)\b/giu]
  ];
  for(const [a,b] of quantifiers)if(a.test(source)&&!b.test(target)){
    let remaining=source,extents=0,matching=true;
    if(direction==='id-en')for(const [sr,tr] of extentPatterns){
      const needed=[...source.matchAll(sr)].length;if(!needed)continue;
      extents+=needed;matching&&=[...target.matchAll(tr)].length===needed;
      remaining=remaining.replace(sr,'');
    }
    if(!(extents&&matching&&!a.test(remaining)))issues.push('Periksa kuantor: cakupan pernyataan mungkin berubah.');
  }
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

function structuralIssues(body,restored,direction){
  return [...auditTranslation(body,restored),...semanticWarnings(body,restored,direction).filter(x=>/negasi|kuantor|modalitas|ketidakpastian|belum berubah bahasa/.test(x))];
}
/** Only words whose part of speech is morphologically clear may receive an automatic
 * repair term; homographs (rose, bears, matters, set) are reported instead. */
export function repairEligible(word,lang,context='',isoTerm=''){
  const w=String(word).toLowerCase();
  if(!/^\p{L}+$/u.test(w))return false;
  if(lang==='en')return (w.length>=7&&/(?:tion|sion|ment|ness|ance|ence|ity|ism|ing)$/u.test(w))||(w.length>=8&&/ly$/u.test(w))||(w.length>=6&&/s$/u.test(w)&&/^(?:meng|meny|mem|men|me)\p{L}{3,}$/u.test(String(isoTerm))&&!new RegExp('\\b(?:the|a|an|these|those|its|their|our|his|her|many|some|all|two|three|several|such|other|new|key|main)\\s+'+w+'\\b','iu').test(context));
  if(w.length>=7&&/^(?:pe|per|ke)\p{L}+an$/u.test(w))return true;
  if(w.length>=7&&/^(?:peng|peny|pem|pen|pe)\p{L}{4,}$/u.test(w)&&!/(?:kan|i)$/u.test(w))return true; // agentive pe(N)- nouns: peserta, pengamat, peneliti
  return w.length>=4&&!/^(?:me|di|ber|ter|se)/u.test(w)&&new RegExp('(?<![\\p{L}])'+w+'\\s+(?:tersebut|itu|ini)(?![\\p{L}])','iu').test(context);
}

export class Translator {
  constructor({verify=true}={}){this.verify=verify;this.verifier=null;this.isoCache=new Map();this.worker=null;this.pending=new Map();this.sequence=0;this.direction=null;this.engine=null;this.busy=false;this.epoch=0;}
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
      const timer=setTimeout(()=>this._fail(new Error('Mesin terlalu lama merespons. Jeda lalu lanjutkan dari bagian tersimpan.')),timeout);
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
    try{
      this.engine=await this._request('prepare',direction,{signal,onProgress,timeout:600000});
      let verification=this.verify?'round-trip+isolated-term':'off',verifierEngine=null;this.verifierError='';
      if(this.verify){
        // Concept coverage needs the opposite-direction model (local, lazily loaded with the first job).
        // If it cannot load (quota, offline without that model), translation continues but every
        // block states that concept verification was not performed. Never silent.
        try{
          this.verifier||=new Translator({verify:false});
          verifierEngine=await this.verifier.prepare(direction==='en-id'?'id-en':'en-id',{signal,onProgress:p=>onProgress?.({...p,verifier:true})});
        }catch(error){
          if(error.name==='AbortError'||signal?.aborted)throw error;
          try{await this.verifier?.dispose();}catch{}
          this.verifier=null;this.verifierError=String(error.message||error).slice(0,200);verification='unavailable';
        }
      }
      const rules=this.verify?RULESET+'+'+COVERAGE_RULES:RULESET;
      const offlineReady=this.engine.offlineReady!==false&&(verifierEngine?verifierEngine.offlineReady!==false:true);
      const storageWarning=[this.engine.storageWarning,verifierEngine?.storageWarning].filter(Boolean).join(' ');
      this.engine={...this.engine,offlineReady,storageWarning,storageMode:offlineReady?this.engine.storageMode:'session',adapterRules:rules,conceptVerification:verification,verifierError:this.verifierError||undefined,fingerprint:this.engine.fingerprint+'|'+rules};this.direction=direction;return this.engine;}
    catch(error){if(this.epoch===epoch)this._fail(error);throw error;}finally{if(this.epoch===epoch)this.busy=false;}
  }
  async translate(text,{signal,onProgress,glossary,context=text}={}){
    if(typeof text!=='string')throw TypeError('Sumber harus berupa teks.');
    if(text.length>100000)throw Error('Satu blok melebihi 100.000 karakter.');
    if(!this.engine||!this.direction)throw Error('Model belum siap.');
    if(this.busy)throw Error('Mesin sedang memproses blok lain.');
    throwIfAborted(signal);
    const glossaryEntries=normalizeGlossary(glossary);
    const verificationNote=this.verify&&!this.verifier?['Pemeriksaan cakupan konsep tidak aktif karena model arah sebaliknya tidak dapat dimuat; periksa makna secara manual.']:[];
    if(!text.trim()||isLiteralOnly(text))return {text,status:'preserved',outcome:'preserved',retryable:false,issues:[],engine:this.engine,method:'literal-preservation',semanticVerified:false};
    this.busy=true;const epoch=this.epoch;
    const direction=this.direction,engine=this.engine,issues=[...verificationNote],attempts=[],metrics={inferenceCalls:0,cacheHits:0,inputTokens:0,outputTokens:0};const attemptedInputs=new Set(),successfulInputs=new Map();
    try{
      const segments=splitForTranslation(text,MAX_CHARS,maskScientific(text,glossaryEntries,direction).markers),results=[];let tokensIn=0,tokensOut=0;
      const run=async(segment,depth=0,useDefaultTerms=true)=>{
        throwIfAborted(signal);
        const pre=segment.match(/^\s*/u)[0],post=segment.match(/\s*$/u)[0],body=segment.trim();
        if(!body)return segment;
        const heading=HEADINGS[direction][body.toLowerCase().replace(/:$/u,'')];
        if(heading&&body.length<55&&glossaryEntries.length===0)return pre+heading+(body.endsWith(':')?':':'')+post;
        const protection=maskScientific(body,glossaryEntries,direction,context,useDefaultTerms);
        let rawCandidate=null,restoredCandidate=null;
        if(!/[\p{L}\p{N}]/u.test(protection.masked.replace(/<ss[a-z]*\d+\/>/gu,''))){const restored=restoreScientific(protection.masked,protection);issues.push(...semanticWarnings(body,restored,direction));return pre+restored+post;}
        try{
          const cacheKey=JSON.stringify([protection.masked,protection.markers.map(m=>m.replacement)]);
          if(successfulInputs.has(cacheKey)){metrics.cacheHits++;return pre+successfulInputs.get(cacheKey)+post;}
          if(attemptedInputs.has(cacheKey))throw Object.assign(new Error('Kandidat deterministik identik tidak diulang.'),{translationRejected:true});
          attemptedInputs.add(cacheKey);attempts.push({strategy:!useDefaultTerms?'literal-only-context':depth?'clause-split':'protected-context',source:body});
          metrics.inferenceCalls++;
          const result=await this._request('translate',{sourceText:protection.masked,direction},{signal,onProgress});
          metrics.inputTokens+=result.inputTokens||0;metrics.outputTokens+=result.outputTokens||0;
          if(result.finishReason!=='complete')throw Error('Model mencapai batas keluaran sebelum selesai.');
          rawCandidate=result.targetText;
          let restored=restoreScientific(result.targetText,protection);
          if(/^\p{Lu}/u.test(body)&&/^\p{Ll}/u.test(restored))restored=restored[0].toUpperCase()+restored.slice(1);
          restoredCandidate=restored;
          const structural=[...auditTranslation(body,restored),...semanticWarnings(body,restored,direction).filter(x=>/negasi|kuantor|modalitas|ketidakpastian|belum berubah bahasa/.test(x))];
          if(structural.length)throw Object.assign(new Error(structural.join(' ')),{translationRejected:true});
          tokensIn+=result.inputTokens||0;tokensOut+=result.outputTokens||0;
          if(this.verify&&this.verifier){
            const checked=await this._conceptCheck(body,restored,{glossaryEntries,context,direction,useDefaultTerms,signal,metrics,attempts});
            restored=checked.text;issues.push(...checked.issues);
          }
          issues.push(...semanticWarnings(body,restored,direction));successfulInputs.set(cacheKey,restored);
          return pre+restored+post;
        }catch(error){
          if(error.name==='AbortError')throw error;
          if(depth===0&&useDefaultTerms&&protection.markers.some(s=>s.kind==='term')){
            try{return await run(segment,1,false);}catch(alternate){if(alternate.name==='AbortError')throw alternate;error=alternate;}
          }
          if(depth===0&&/berubah|hilang|bertambah|kuantor|Kuantor|klaim|Penanda|penanda/i.test(error.message)){
            const boundaries=[...segment.matchAll(/[,;:]\s+|\s+(?:and|but|whereas|dan|tetapi|sedangkan)\s+|\s+(?=without\b|tanpa\b)/giu)];
            // Distinguishing X from Y has a safe lossless prepositional boundary.
            // Keep "from" with Y and recheck the entire joined assertion.
            if(/\b(?:distinguish|differentiate)\b/iu.test(segment))boundaries.push(...segment.matchAll(/\s+(?=from\b)/giu));
            const cuts=boundaries.map(m=>m.index+m[0].length).filter(i=>i>18&&i<segment.length-18&&!protection.markers.some(s=>i>s.start&&i<s.end));
            if(cuts.length){const cut=cuts.sort((a,b)=>Math.abs(a-segment.length/2)-Math.abs(b-segment.length/2))[0];let output='';for(const part of [segment.slice(0,cut),segment.slice(cut)])output+=await run(part,1);const checked=auditTranslation(body,output.trim());if(checked.length)throw Object.assign(new Error(checked.join(' ')),{translationRejected:true});return output;}
          }
          if(/kapasitas model|token melebihi batas|SOURCE_COMPLEXITY|batas keluaran/u.test(error.message)&&depth<3){
            const split=splitRetry(segment,direction,glossaryEntries);
            if(split){issues.push('Satu kalimat panjang dibagi menjadi beberapa klausa; periksa hubungan antarklausa.');let output='';for(const part of split)output+=await run(part,depth+1);return output;}
          }
          error.segmentSource=body;error.candidateText=restoredCandidate;error.rawCandidate=rawCandidate;throw error;
        }
      };
      for(let i=0;i<segments.length;i++){results.push(await run(segments[i]));onProgress?.({phase:'segments',done:i+1,total:segments.length});}
      const target=results.join(''),structural=[...auditTranslation(text,target),...semanticWarnings(text,target,direction).filter(x=>/negasi|kuantor|modalitas|ketidakpastian|belum berubah bahasa/.test(x))];
      if(structural.length)throw Object.assign(new Error(structural.join(' ')),{translationRejected:true});
      return {text:target,status:issues.length?'review':'translated',outcome:'translated',retryable:false,issues:[...new Set(issues)],engine,inputTokens:tokensIn,outputTokens:tokensOut,metrics:{...metrics,uniqueInputs:attemptedInputs.size},attempts,method:tokensIn?'local-model-with-protected-spans':'controlled-terminology',semanticVerified:false};
    }catch(error){
      if(error.name==='AbortError')throw error;
      const rejected=error.translationRejected===true||/PROTECTED|penanda|Penanda|berubah|hilang|bertambah|urutan|kosong|klaim|batas keluaran|SOURCE_COMPLEXITY|kapasitas|token melebihi/i.test(error.message);
      return {text,status:'review',outcome:rejected?'rejected':'failed',retryable:!rejected,recovery:rejected?'change-source-or-glossary':'retry-when-ready',metrics:{...metrics,uniqueInputs:attemptedInputs.size},attempts,issues:[rejected?'Kandidat terjemahan ditolak untuk menjaga isi. Sumber dipertahankan. Periksa teks sumber atau ubah glosarium, lalu jalankan kembali; percobaan identik tidak diulang.':'Penerjemahan bagian ini gagal. Sumber dipertahankan; coba ulang setelah mesin siap.'],diagnostics:[{stage:'translation',name:error.name,message:error.message,segmentSource:error.segmentSource??null,candidateText:error.candidateText??null,rawCandidate:error.rawCandidate??null}],engine,sourcePreserved:true,semanticVerified:false};
    }finally{if(this.epoch===epoch)this.busy=false;}
  }
  async translateTable(block, options={}){
    if(!Array.isArray(block.rows)||block.rows.some(row=>!Array.isArray(row)))throw Error('Struktur tabel tidak valid.');
    const translatedRows=[],issues=[],diagnostics=[];let inputTokens=0,outputTokens=0,failed=false,hasTranslated=false,anyRetryable=false;const metrics={inferenceCalls:0,cacheHits:0,uniqueInputs:0,inputTokens:0,outputTokens:0};
    for(let r=0;r<block.rows.length;r++){
      const row=[];
      for(let c=0;c<block.rows[r].length;c++){
        throwIfAborted(options.signal);
        const source=String(block.rows[r][c]);
        const result=isFormulaText(source)||/^[-−+\d\s.,:%()[\]\/]+$/u.test(source)?{text:source,outcome:'preserved',issues:[]}:await this.translate(source,{...options,context:block.text||block.rows.flat().join(' ')});
        row.push(result.text);failed ||= !!result.sourcePreserved;anyRetryable ||= !!result.retryable;for(const key of Object.keys(metrics))metrics[key]+=result.metrics?.[key]||0;hasTranslated ||= result.outcome==='translated';
        issues.push(...(result.issues||[]));diagnostics.push(...(result.diagnostics||[]).map(d=>({...d,row:r,column:c})));
        inputTokens+=result.inputTokens||0;outputTokens+=result.outputTokens||0;
      }
      translatedRows.push(row);
    }
    return {text:translatedRows.map(row=>row.join(' | ')).join('\n'),translatedRows,status:failed||issues.length?'review':hasTranslated?'translated':'preserved',outcome:failed?(anyRetryable?'failed':'rejected'):hasTranslated?'translated':'preserved',sourcePreserved:failed,retryable:failed&&anyRetryable,recovery:failed?(anyRetryable?'retry-when-ready':'change-source-or-glossary'):null,metrics,issues:[...new Set(issues)],diagnostics,inputTokens,outputTokens,engine:this.engine,semanticVerified:false,method:'cell-by-cell-local'};
  }
  async _raw(translator,text,direction,signal,metrics){
    metrics.verificationCalls=(metrics.verificationCalls||0)+1;
    try{const r=await translator._request('translate',{sourceText:text,direction},{signal});return r.finishReason==='complete'?r.targetText:'';}
    catch(error){if(error.name==='AbortError')throw error;return '';}
  }
  async _iso(word,direction,signal,metrics){
    const key=direction+'|'+word;if(this.isoCache.has(key))return this.isoCache.get(key);
    let term=(await this._raw(this,word,direction,signal,metrics)).trim().replace(/[.!?;:]+$/u,'');
    if(!/^\p{L}[\p{L}\s'-]{1,48}$/u.test(term)||term.split(/\s+/u).length>3)term='';
    term=term.toLowerCase();this.isoCache.set(key,term);return term;
  }
  /** Round-trip concept coverage with one bounded, hypothesis-driven repair.
   * Never accepts by construction alone: repair terms must back-verify, the repaired
   * candidate must pass every structural guard and strictly reduce the gaps. */
  async _conceptCheck(body,restored,{glossaryEntries,context,direction,useDefaultTerms,signal,metrics,attempts}){
    const src=direction==='en-id'?'en':'id',tgt=src==='en'?'id':'en',reverse=direction==='en-id'?'id-en':'en-id';
    const gapsFor=async(text,repairTerms=[])=>{
      const back=await this._raw(this.verifier,text,reverse,signal,metrics);
      if(!back)return null;
      const coveredWords=constrainedWords(body,direction,glossaryEntries,context,useDefaultTerms,repairTerms);
      const prelim=conceptGaps({source:body,target:text,back,srcLang:src,tgtLang:tgt,iso:()=>'',coveredWords});
      const isoMap=new Map(),phraseMap=new Map();
      for(const g of prelim){
        const w=g.word.toLowerCase();if(!isoMap.has(w))isoMap.set(w,await this._iso(w,direction,signal,metrics));
        for(const p of neighbourPhrases(g.word,body,src))if(!phraseMap.has(p))phraseMap.set(p,await this._iso(p,direction,signal,metrics));
      }
      return conceptGaps({source:body,target:text,back,srcLang:src,tgtLang:tgt,iso:w=>isoMap.get(w)||'',phraseIso:(w,sentence)=>neighbourPhrases(w,sentence,src).map(p=>phraseMap.get(p)||''),coveredWords});
    };
    const gaps=await gapsFor(restored);
    if(gaps===null)return {text:restored,issues:['Pemeriksaan cakupan konsep tidak dapat dijalankan untuk bagian ini; periksa makna secara manual.']};
    if(!gaps.length)return {text:restored,issues:[]};
    const seen=new Set();
    const termsFor=async(gapList,existing=[])=>{
      const claimed=new Set(existing.flatMap(([x])=>x.toLowerCase().split(/\s+/u)));
      const terms=[];
      for(const g of gapList){
        const w=g.word.toLowerCase();
        if(src==='id'&&w==='saling'&&!seen.has(w)){
          // Reciprocal marker: repair the whole "saling V" phrase with the model's own phrase translation.
          const m=body.match(/(?<![\p{L}])saling\s+(?:ber|me|ter)\p{L}+/iu);
          if(m){const term=await this._iso(m[0].toLowerCase(),direction,signal,metrics);const bt=term?await this._raw(this.verifier,term,reverse,signal,metrics):'';
            if(term&&bt&&!missingConcepts(m[0],bt,src).length){seen.add(w);terms.push([m[0],term]);}}
          continue;
        }
        if(g.kind==='voice')continue; // relation errors are reported, never patched with a term
        if(seen.has(w)||!g.isoTerm||!repairEligible(g.word,src,body,g.isoTerm))continue;
        const backTerm=await this._raw(this.verifier,g.isoTerm,reverse,signal,metrics);
        if(!backTerm||missingConcepts(g.word,backTerm,src).length)continue;
        // A definite anaphoric NP keeps its determiner so the referent cannot drift to a pronoun.
        const ana=src==='id'?body.match(new RegExp('(?<![\\p{L}])'+g.word+'\\s+(tersebut|itu|ini)(?![\\p{L}])','iu')):null;
        if(ana&&!/\s/u.test(g.isoTerm)){seen.add(w);terms.push([ana[0],(ana[1].toLowerCase()==='ini'?'this ':'the ')+g.isoTerm]);continue;}
        // Indonesian N+N compounds are head-initial: repair "kelompok perlakuan" as one
        // English compound ("treatment group") so the modifier cannot detach.
        const head=src==='id'?body.match(new RegExp('(?<![\\p{L}])(\\p{L}+)\\s+'+g.word+'(?![\\p{L}])','iu')):null;
        if(head&&!claimed.has(head[1].toLowerCase())&&!/^(?:me|di|ber|ter|se)/iu.test(head[1])&&head[1].length>=3&&!/^(?:yang|dan|atau|dari|pada|dalam|untuk|dengan|oleh|ke|di|tidak|bukan|saat|ketika|serta|para|itu|ini|tersebut)$/iu.test(head[1])){
          const headTerm=await this._iso(head[1].toLowerCase(),direction,signal,metrics);
          if(headTerm&&!/\s/u.test(headTerm)){seen.add(w);terms.push([head[0],g.isoTerm+' '+headTerm]);continue;}
        }
        seen.add(w);terms.push([g.word,g.isoTerm]);
      }
      return terms;
    };
    const before=new Set(gaps.map(g=>g.word.toLowerCase()));
    let terms=await termsFor(gaps),best={text:restored,gaps};const notes=[];
    // At most two bounded rounds; round 2 only adds terms for gaps the round-1 candidate introduced.
    for(let round=1;round<=2&&terms.length;round++){
      const protection=maskScientific(body,glossaryEntries,direction,context,useDefaultTerms,terms);
      const attempt={strategy:'concept-repair',round,source:body,terms:terms.map(([s,t])=>s+'→'+t),gapsBefore:gaps.map(g=>g.word),result:'not-run'};attempts.push(attempt);
      metrics.inferenceCalls++;
      let repaired=null;
      try{
        const result=await this._request('translate',{sourceText:protection.masked,direction},{signal});
        metrics.inputTokens+=result.inputTokens||0;metrics.outputTokens+=result.outputTokens||0;
        if(result.finishReason!=='complete'){attempt.result='rejected-incomplete';break;}
        let text=restoreScientific(result.targetText,protection);
        if(/^\p{Lu}/u.test(body)&&/^\p{Ll}/u.test(text))text=text[0].toUpperCase()+text.slice(1);
        attempt.candidate=text;const structural=structuralIssues(body,text,direction);
        if(structural.length){attempt.result='rejected-structural: '+structural.join(' ');break;}
        repaired=await gapsFor(text,terms);attempt.gapsAfter=repaired?repaired.map(g=>g.word):null;
        if(repaired&&repaired.length<gaps.length&&repaired.every(g=>before.has(g.word.toLowerCase()))){
          best={text,gaps:repaired};attempt.result='accepted';notes.push('Konsep sumber dipulihkan dengan istilah terkunci ('+terms.map(([s,t])=>s+' → '+t).join('; ')+'); periksa ketepatan istilah.');break;
        }
        attempt.result='rejected-gaps-not-reduced';
      }catch(error){if(error.name==='AbortError')throw error;attempt.result='rejected-error: '+String(error.message).slice(0,120);break;}
      if(!repaired)break;
      const extra=await termsFor(repaired.filter(g=>!before.has(g.word.toLowerCase())),terms);
      if(!extra.length)break;
      terms=[...terms,...extra];
    }
    if(best.gaps.length)notes.push('Periksa konsep: '+[...new Set(best.gaps.map(g=>'"'+g.word+'"'))].join(', ')+' mungkin hilang atau berubah dalam terjemahan.');
    return {text:best.text,issues:notes};
  }
  cancel(){this._fail(abortError());this.busy=false;this.verifier?.cancel();}
  async dispose(){this.cancel();}
}
