import type {Direction} from './types';
import {protectedSpans} from './protection';
import {wordFractionSignature,wordFractionPairs} from './word-fractions';

// These are conservative review triggers, never a semantic certificate or a repair.
// Opaque formula/code/URLs are already checked byte-for-byte by Q2.
export function visibleProse(text:string,lowerCase=true){
 for(const p of [...protectedSpans(text)].reverse())if(['formula','code','url','html','placeholder','link-destination'].includes(p.kind))text=text.slice(0,p.start)+' '.repeat(p.end-p.start)+text.slice(p.end);
 return lowerCase?text.toLowerCase():text;
}
const exactNumbers:Record<string,string>={satu:'1',one:'1',dua:'2',two:'2',tiga:'3',three:'3',empat:'4',four:'4',lima:'5',five:'5',enam:'6',six:'6',tujuh:'7',seven:'7',delapan:'8',eight:'8',sembilan:'9',nine:'9',sepuluh:'10',ten:'10'};
const exactCounts=(text:string)=>[...text.matchAll(/\b(?:tepat|exactly|precisely)\s+(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/g)].map(m=>exactNumbers[m[1]]??m[1]).sort();
export function semanticFidelityFindings(source:string,target:string,direction:Direction){
 const a=visibleProse(source),b=visibleProse(target),findings:{category:string;reason:string}[]=[];
 const add=(category:string,reason:string)=>findings.push({category,reason});
 // A limited lexical coverage check, not a proof of entailment. One/a/sebuah
 // are deliberately excluded because article and cardinal uses overlap.
 const quantityWords:Record<string,string>={dua:'2',two:'2',both:'2',kedua:'2',keduanya:'2',tiga:'3',three:'3',empat:'4',four:'4',lima:'5',five:'5',enam:'6',six:'6',tujuh:'7',seven:'7',delapan:'8',eight:'8',sembilan:'9',nine:'9',sepuluh:'10',ten:'10'};
 const quantities=(s:string)=>{
  // Fractions have their own numerator/denominator comparison below. Remove
  // both language spellings here so "eighths" and "per delapan" are equivalent.
  for(const [id,en]of wordFractionPairs)for(const phrase of [id,en])s=s.replace(new RegExp('\\b'+phrase.replace('-','[- ]')+'\\b','gi'),' ');
  return (s.match(/\b(?:dua|two|both|kedua|keduanya|tiga|three|empat|four|lima|five|enam|six|tujuh|seven|delapan|eight|sembilan|nine|sepuluh|ten)\b/g)||[]).map(w=>quantityWords[w]).sort();
 };
 if(JSON.stringify(quantities(a))!==JSON.stringify(quantities(b)))add('WORD_QUANTITY_COVERAGE_REVIEW','Cakupan bilangan yang ditulis dengan kata berubah. Periksa jumlah, satuan kelompok, dan kemungkinan parafrasa; temuan ini membutuhkan review konteks.');
 const entities:[RegExp,RegExp][]=[[/\b(?:stoples|guci)(?:nya)?\b/,/\bjars?\b/],[/\bkucing(?:nya)?\b/,/\bcats?\b/],[/\b(?:hewan|binatang) (?:peliharaan|piaraan)(?:nya)?\b/,/\bpets?\b/]];
 for(const [id,en] of entities){const src=direction==='id-en'?id:en,dst=direction==='id-en'?en:id;if(src.test(a)&&!dst.test(b))add('ENTITY_COVERAGE_REVIEW','Objek yang disebut dalam sumber tidak terdeteksi dalam target. Periksa penghilangan, parafrasa, dan kesinambungan rujukan.');}
 if(direction==='en-id'&&/\bjars?\b/.test(a)&&!/\bbottles?\b/.test(a)&&/\bbotol(?:nya)?\b/.test(b))add('ENTITY_COVERAGE_REVIEW','Jar diterjemahkan sebagai botol. Periksa identitas wadah dan konsistensi rujukan antarkalimat.');
 if(direction==='id-en'&&/\bpengayaan\b/.test(a)&&/\b(?:latihan|penurunan|materi|belajar)\b/.test(a)&&/\bplug[- ]?ins?\b/.test(b))add('MATHEMATICAL_TERM_REVIEW','Pengayaan pembelajaran berubah menjadi istilah perangkat lunak. Periksa makna pedagogis dalam konteks sumber.');
 // Restricted relative clauses can disappear while all nouns and negations
 // remain present elsewhere. Never mistake lexical presence for entailment.
 if(direction==='en-id'&&/\b(?:those|these|the)\s+(?:specific\s+)?\w+(?:\s+\w+){0,2}\s+(?:that|which)\s+(?:are|is)\b/.test(a))add('RELATIVE_CLAUSE_SCOPE_REVIEW','Sumber memuat klausa pembatas yang menentukan himpunan/subjek. Cocokkan klausa tersebut secara eksplisit; cakupan kata dan negasi saja belum membuktikan kesetaraan.');
 if(direction==='id-en'&&/\b(?:suku|sukunya)\b/.test(a)&&/\b(?:bilangan|persamaan|barisan|distributif|jumlah)\b/.test(a)&&/\btribes?\b/.test(b))add('MATHEMATICAL_TERM_REVIEW','Suku matematika diterjemahkan sebagai tribe. Periksa konteks ekspresi atau barisan.');
 const fractionsA=wordFractionSignature(a),fractionsB=wordFractionSignature(b);
 if(JSON.stringify(fractionsA)!==JSON.stringify(fractionsB))add('WORD_FRACTION_CHANGE','Pecahan yang ditulis dengan kata berubah, hilang, bertambah, atau berpindah urutan. Cocokkan pembilang dan penyebut.');
 const sentenceCount=(s:string)=>[...new Intl.Segmenter(direction==='id-en'?'id':'en',{granularity:'sentence'}).segment(s)].filter(x=>/\p{L}{2}/u.test(x.segment)).length;
 if(sentenceCount(visibleProse(source,false))>sentenceCount(visibleProse(target,false)))add('SENTENCE_COVERAGE_REVIEW','Jumlah kalimat prosa berkurang. Penggabungan mungkin sah, tetapi kelengkapan setiap proposisi harus diperiksa dalam konteks.');
 const parentheticalCount=(s:string)=>[...s.matchAll(/\([^()]*\p{L}{2}[^()]*\)/gu)].filter(m=>(m[0].match(/\p{L}{2,}/gu)||[]).length>=2).length;
 if(parentheticalCount(a)>parentheticalCount(b))add('PARENTHETICAL_COVERAGE_REVIEW','Keterangan dalam tanda kurung tidak lagi terdeteksi. Periksa apakah seluruh maknanya tetap ada dalam target.');
 const obligation:[RegExp,RegExp][]=[[/\b(?:tidak (?:harus|wajib|perlu)|tak perlu)\b/,/\b(?:need not|needn't|do(?:es)? not (?:have|need) to|don['’]t (?:have|need) to|doesn['’]t (?:have|need) to|not required to|not necessary to)\b/]];
 for(const [id,en]of obligation){const src=direction==='id-en'?id:en,dst=direction==='id-en'?en:id;if(src.test(a)&&!dst.test(b))add('MODAL_SCOPE_CHANGE','Tidak wajib/perlu berbeda dari larangan. Periksa scope modal; must not/tidak boleh tidak menggantikan need not/tidak harus.');}
 const sa=exactCounts(a),sb=exactCounts(b);
 if((sa.length||sb.length)&&JSON.stringify(sa)!==JSON.stringify(sb))add('EXACT_CARDINALITY','Jumlah tepat yang ditulis dengan kata/angka berubah, hilang, atau bertambah. Cocokkan setiap kuantor dalam konteks.');
 const negatives=(s:string)=>(s.match(/\b(?:bilangan cacah|not|no|never|without|neither|cannot|unable|unchanged|nonnegative|nonzero|tidak|bukan|tanpa|belum|jangan|nonnegatif|nonnol)\b|n['’]t/g)||[]).length;
 if(!negatives(a)&&negatives(b))add('ADDED_NEGATION','Target mengandung negasi yang tidak terdeteksi pada prosa sumber. Periksa makna; ini penanda review, bukan putusan otomatis.');
 if(direction==='en-id'){
  if(/(?:^|[.!?]\s+)square\s+/.test(a)&&/\bsquare\b/.test(b))add('MATHEMATICAL_TERM_REVIEW','Instruksi square belum diterjemahkan; periksa operasi mengkuadratkan dalam konteks.');
  const terms:[RegExp,RegExp][]=[[/\b(?:square (?:both sides|the expression|the sum)|squar(?:e|ing|es) (?:the input|the single entry)|(?:radical,|then|and) square\b)/,/\b(?:persegi|menginjak|squares)\b|\bkuadrat\s+(?:kedua sisi|input)\b/],[/\bperimeter\b/,/\b(?:pertahanan(?:nya)?|perimeter)\b/],[/\brecurrence\b/,/\bkursi\b/],[/\b(?:multiply|multiplies|multiplying)\b/,/\bmultipl(?:y|ies|ying)\b/],[/\b(?:bases are equal|base two)\b/,/\bbasa\b/]];
  for(const [s,t]of terms)if(s.test(a)&&t.test(b))add('MATHEMATICAL_TERM_REVIEW','Istilah/operasi matematika berubah menjadi makna umum atau belum diterjemahkan. Bandingkan tindakan, objek, dan konteks.');
 }else{
  const terms:[RegExp,RegExp][]=[[/\bbasis dua\b/,/\bsecond base\b/],[/\bbilangan cacah\b/,/\bnumber number\b/],[/\bmembaginya\b/,/\bsharing\b/]];
  for(const [s,t]of terms)if(s.test(a)&&t.test(b))add('MATHEMATICAL_TERM_REVIEW','Istilah matematika tampak berubah menjadi makna umum. Periksa istilah pada sumber lengkap.');
 }
 return findings;
}
