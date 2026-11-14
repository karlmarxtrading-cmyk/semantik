import {domainConceptFindings} from './domain-concepts';
import {Finding,Segment,Direction,GlossaryEntry,EngineTask,EngineResult} from './types';
import {glossaryForScope,normalizeTerm} from './glossary';
import {taskIntegrityFindings} from './task-integrity';
import {preservationErrors,prosePresent} from './protection';
import {semanticFidelityFindings} from './semantic-fidelity';
export const CHECKER='deterministic-and-risk-rules-v14-contextual-concepts';
export function acceptEnvelope(task:EngineTask,result:EngineResult,engineFingerprint:string){return ['jobId','segmentId','attemptId','revision','direction','sourceText','contextBefore','contextAfter','role','glossaryRevision'].every(k=>task[k as keyof EngineTask]===result[k as keyof EngineResult])&&result.engineFingerprint===engineFingerprint&&result.finishReason==='complete';}
export function quality(source:string,target:string,direction:Direction,role:string,glossary:GlossaryEntry[]=[],domain=''):Finding[]{const f:Finding[]=[];const add=(layer:string,severity:Finding['severity'],category:string,reason:string)=>f.push({id:`${category}-${f.length}`,layer,severity,category,reason,checker:CHECKER});
 if(!target.trim()&&source.trim())add('Q1','critical','EMPTY_OUTPUT','Target kosong');for(const e of preservationErrors(source,target,{tableCell:role==='table'}))add('Q2','critical','PROTECTED_LITERAL',e);
 if(JSON.stringify(source.match(/\r\n|\r|\n/g)||[])!==JSON.stringify(target.match(/\r\n|\r|\n/g)||[]))add('Q2','critical','NEWLINE_CHANGED','Jumlah/jenis newline berubah; batas paragraf sumber harus dipertahankan');if(role==='table'&&/[\r\n]/.test(target))add('Q2','critical','TABLE_CHANGED','Target mengubah batas sel tabel');
 if(source.trim()===target.trim()&&prosePresent(source))add('Q3','major','UNCHANGED_PROSE','Prosa tidak berubah; periksa bahasa atau tandai pengecualian dengan alasan');
 for(const m of source.matchAll(/\*\*([^*\r\n]+)\*\*|__([^_\r\n]+)__/g))if(prosePresent(m[1]||m[2])&&target.includes(m[0]))add('Q3','major','UNCHANGED_PROSE_ISLAND','Prosa di dalam penekanan tetap identik. Periksa kata yang belum diterjemahkan; istilah/nama yang sengaja dipertahankan memerlukan alasan.');
 for(const reason of taskIntegrityFindings(source,target,role))add('Q4','major','TASK_VIOLATION',reason);
 for(const finding of semanticFidelityFindings(source,target,direction))add('Q4','major',finding.category,finding.reason);
 for(const finding of domainConceptFindings(source,target,direction))add('Q4','major',finding.category,finding.reason);
 const a=source.toLowerCase(),b=target.toLowerCase();
 const numberSystemID=/\bsistem bilangan\b/,numberSystemEN=/\bnumber systems?\b/;
 if((direction==='id-en'?numberSystemID:numberSystemEN).test(a)&&!(direction==='id-en'?numberSystemEN:numberSystemID).test(b))add('Q4','major','NUMBER_SYSTEM_CONCEPT','Konsep sistem bilangan tidak ditemukan pada target. Periksa perubahan menjadi nomor sistem atau istilah yang tertinggal.');
 const finiteID=/\b(?:kumpulan|himpunan|koleksi) (?:berhingga|hingga|terbatas)\b/,finiteEN=/\bfinite (?:collections?|sets?)\b/;
 if((direction==='id-en'?finiteID:finiteEN).test(a)&&!(direction==='id-en'?finiteEN:finiteID).test(b))add('Q4','major','FINITE_COLLECTION_CONCEPT','Sifat berhingga pada kumpulan tidak ditemukan pada target. Periksa domain dan kelengkapan terjemahan.');
 const placeID=/\bnilai tempat(?!\s+(?:wisata|tinggal|parkir)\b)/,placeEN=/\b(?:place[- ]values?(?!\s+(?:on|upon)\b)|positional values?)\b/;
 if((direction==='id-en'?placeID:placeEN).test(a)&&!(direction==='id-en'?placeEN:placeID).test(b))add('Q4','major','PLACE_VALUE_CONCEPT','Istilah nilai tempat/positional value tidak ditemukan pada target. Periksa relasi posisi digit; nilai suatu lokasi atau tingkat gedung bukan konsep matematika yang sama.');
 if(direction==='id-en'&&/(?:^|[.!?]\s+)membandingkan\b[^.!?]*\bmelatih pemahaman\b/.test(a)&&!(/\b(?:compar(?:ing|ison)|by comparing)\b/.test(b)&&/\b(?:develops?|trains?|strengthens?|builds?|improves?|enhances?|helps?|cultivates?|fosters?)\b/.test(b)))add('Q4','major','PEDAGOGICAL_CAUSAL_RELATION','Pernyataan bahwa kegiatan membandingkan melatih pemahaman kehilangan hubungan kegiatannya dengan hasil belajar. Periksa perubahan menjadi instruksi atau penghilangan predikat.');
 const mathematical=/\\\(|\\\[|\d|\b(?:multiply|multiplication|divide|remainder|equation|perkalian|pembagian|persamaan)\b/i.test(source);
 if(direction==='en-id'&&mathematical&&/\bdivision\b/.test(a)&&/\bdivisi(?:nya)?\b/.test(b))add('Q4','major','MATHEMATICAL_FALSE_COGNATE','Division dalam konteks matematika tampak diterjemahkan sebagai divisi organisasi. Periksa makna pembagian; jangan menyetujui hanya karena angka tetap.');
 if(/(?:^|[.!?]\s+)(?:it|they|this|that)\b/i.test(source)||/(?:^|[.!?]\s+)(?:ia|dia|mereka|ini|itu)\b/i.test(source))add('Q4','major','ANAPHORA_CONTEXT_REVIEW','Kalimat memakai rujukan kata ganti. Bandingkan pelaku dan objek dengan konteks lengkap; mesin per kalimat tidak membuktikan bahwa rujukan tetap setara.');

 // Multiple negations can lose one clause while retaining another. Presence alone is insufficient.
 const negation=(text:string,language:'id'|'en')=>(text.match(language==='id'?/\b(?:bilangan cacah|tidak(?:\s+(?:pernah|ada|bisa|dapat|boleh))?|bukan|tanpa|belum|jangan|nonnegatif|nonnol)\b/gi:/\b(?:not|no|never|nothing|without|neither|cannot|unable|unchanged|nonnegative|nonzero)\b|n['’]t/gi)||[]).length;
 const sourceNegations=negation(source,direction==='id-en'?'id':'en'),targetNegations=negation(target,direction==='id-en'?'en':'id');
 if(sourceNegations>0&&targetNegations>sourceNegations)add('Q4','major','NEGATION_COVERAGE','Target menambah klausa negasi. Periksa cakupan setiap syarat sebelum persetujuan.');
 if(sourceNegations>=2&&targetNegations<sourceNegations)add('Q4','major','NEGATION_COVERAGE','Jumlah klausa negasi berkurang. Bandingkan setiap syarat; keberadaan satu kata negasi tidak membuktikan semua klausa tetap.');
 if(direction==='en-id'&&mathematical){
  const falseTerms:[RegExp,RegExp][]=[[/\bplane\b/,/\bpesawat\b/],[/\blines?\b/,/\bbaris\b/],[/\bcommon difference\b/,/\bperbedaan umum\b/],[/\bcomplete (?:the )?square\b/,/\balun-alun\b/],[/\b(?:arithmetic sequence|first term|nth term)\b/,/\bistilah\b/],[/\b(?:odd primes?|odd numbers?)\b/,/\baneh\b/],[/\b(?:is even|are even|and even|even (?:number|integer|function|prime))\b/,/\bbahkan\b/]];
  for(const [src,dst]of falseTerms)if(src.test(a)&&dst.test(b))add('Q4','major','MATHEMATICAL_TERM_REVIEW','Istilah matematika tampak berubah menjadi makna umum. Bandingkan istilah dengan konteks sumber; hasil belum disetujui.');
 }

 const pairs:[RegExp,RegExp,string][]=[[/\b(?:tidak|bukan|tanpa|belum|jangan)\b/,/\b(?:no|not|never|nothing|without|neither|non\w*|cannot|unable|insufficient|unchanged|uncounted)\b|n't/,'negasi'],[/\b(?:semua|setiap|seluruh)\b/,/\b(?:all|every|each|any|whole|entire)\b/,'kuantor universal'],[/\b(?:paling sedikit|setidaknya|sekurang-kurangnya|paling tidak)\b/,/\bat least\b/,'batas inklusif minimum'],[/\b(?:paling banyak|maksimal)\b/,/\bat most\b/,'batas inklusif maksimum'],[/\btanpa pengembalian\b/,/\bwithout replacement\b/,'pengambilan tanpa pengembalian'],[/\b(?:bilangan (?:real|riil)|solusi (?:real|riil)|x (?:real|riil))\b/,/\breal\b/,'domain real'],[/\b(?:bilangan bulat)\b/,/\binteger/,'domain bilangan bulat'],[/\b(?:buktikan|membuktikan|bukti|pembuktian|tunjukkan|menunjukkan|ditunjukkan)\b/,/\b(?:prove|proof|show|shows)\b/,'jenis tugas pembuktian'],[/\b(?:mungkin|dapat|bisa|bisakah|dapatkah)\b/,/\b(?:may|might|can|cannot|could|possible|able|unable)\b/,'modalitas'],[/\b(?:bulatkan|dibulatkan|pembulatan)\b/,/\b(?:round(?:ed|ing)?\s+(?:to|off|the|this|your)|rounding)\b/,'pembulatan']];
 for(const [id,en,label] of pairs){const sr=direction==='id-en'?id:en,tr=direction==='id-en'?en:id;if(sr.test(a)&&!tr.test(b))add('Q4','major','SEMANTIC_RISK',`Periksa ${label}: penanda sumber belum terdeteksi pada target. Pemeriksaan ini heuristik, bukan putusan makna.`);}

 const concepts:[RegExp,RegExp,string][]=[[/\b(?:hasil akhir|jawaban akhir)\b/,/\bfinal (?:result|answer)\b/,'pembulatan/hasil akhir'],
 [/\bjika dan hanya jika\b/,/\bif and only if\b/,'ekuivalensi dua arah'],
 [/\bhanya jika\b/,/\bonly if\b/,'syarat perlu'],
 [/\btidak negatif\b|\bnonnegatif\b/,/\bnonnegative\b|\bnon-negative\b|\bnot negative\b/,'domain tidak negatif'],
 [/\b(?:dengan pengembalian)\b/,/\bwith replacement\b/,'pengambilan dengan pengembalian'],
 [/\b(?:sudut siku-siku)\b/,/\bright angle\b/,'sudut siku-siku'],
 [/\brata-rata tertimbang\b/,/\bweighted mean\b|\bweighted average\b/,'rata-rata tertimbang'],
 [/\b(?:rata-rata)\b/,/\bmean\b|\baverage\b/,'rata-rata statistik'],
 [/\b(?:tepat satu|tepat dua|tepat sekali)\b/,/\bexactly (?:one|two|once)\b/,'jumlah tepat'],
 [/\b(?:tidak mencakup|tidak termasuk|mengecualikan)\b/,/\bexclud(?:e|es|ing)\b|\bnot includ(?:e|ed|ing)\b/,'batas yang dikecualikan'],
 [/\b(?:harga yang sudah turun|harga setelah diskon)\b/,/\b(?:reduced price|discounted price)\b/,'basis harga setelah penurunan'],
 [/\bjelaskan\b/,/\bexplain\b/,'instruksi menjelaskan'],
 [/\bbandingkan\b/,/\bcompare\b/,'instruksi membandingkan'],
 [/\b(?:belum cukup|tidak cukup|tidak mencukupi)\b/,/\b(?:not enough|insufficient)\b/,'kecukupan informasi'],
 [/\b(?:tidak boleh|dilarang)\b/,/\bmust not\b|\bmustn't\b/,'larangan modal'],
 [/\b(?:tidak setiap|tidak semua)\b/,/\bnot (?:every|all)\b/,'negasi sebagian kuantor']];
 for(const [id,en,label] of concepts){const sr=direction==='id-en'?id:en,tr=direction==='id-en'?en:id;if(sr.test(a)&&!tr.test(b))add('Q4','major','CONCEPT_RISK',`Periksa ${label}: ungkapan target tidak ditemukan. Ini pemeriksaan berbasis aturan dan dapat membutuhkan keputusan false positive.`);}
 const relationTokens=(text:string)=>text.match(/(?:[−-]?\d+(?:[.,/]\d+)*(?:%|[²³])?|\b(?:mm|cm|km|m)(?:²|³)?(?!\w))/g)||[];
 const nums=relationTokens(source),numsTarget=relationTokens(target);
 if(nums.length>1&&nums.length===numsTarget.length&&nums.join('|')!==numsTarget.join('|'))add('Q4','major','QUANTITY_RELATION_ORDER','Urutan besaran/unit berubah. Periksa entitas penerima, cakupan negasi, dan relasi setiap besaran; multiset angka tidak cukup.');
 const names=[...new Set(source.match(/\b[A-Z][a-z]{1,}\b/g)||[])].filter(name=>new RegExp('\\b'+name+'\\b').test(target));
 if(names.length>=2){
  const attachments=(text:string)=>{const occurrences=names.flatMap(name=>[...text.matchAll(new RegExp('\\b'+name+'\\b','g'))].map(m=>({name,index:m.index!}))).sort((a,b)=>a.index-b.index);return new Map(occurrences.map((n,i)=>[n.name,relationTokens(text.slice(n.index+n.name.length,occurrences[i+1]?.index??text.length))[0]]));};
  const sourceLinks=attachments(source),targetLinks=attachments(target);
  if(names.some(name=>sourceLinks.get(name)!==undefined&&targetLinks.get(name)!==undefined&&sourceLinks.get(name)!==targetLinks.get(name)))add('Q4','major','ENTITY_QUANTITY_RELATION','Keterikatan nama dan besaran berubah meskipun daftar angka sama. Periksa subjek/penerima setiap besaran; susunan kalimat alternatif mungkin memerlukan keputusan penelaah.');
 }

 const scopeConcepts:[RegExp,string][]=[[/\b(?:weighted mean|weighted average|rata-rata tertimbang)\b/gi,'weighted'],[/\b(?:exact|eksak)\b/gi,'exact'],[/\b(?:approximation|estimate|perkiraan|pendekatan)\b/gi,'approximate']];
 const signatures=(text:string)=>scopeConcepts.flatMap(([pattern,concept])=>[...text.matchAll(pattern)].map(m=>({i:m.index,concept}))).sort((x,y)=>x.i-y.i).map(x=>x.concept).join('|');
 const ss=signatures(a),ts=signatures(b);if(ss&&ts&&ss!==ts)add('Q4','major','CONCEPT_RELATION_ORDER','Urutan konsep eksak/pendekatan/tertimbang berubah. Periksa keterikatan nilai dan scope penyangkalan.');
 if(/\b(?:weighted mean|rata-rata tertimbang)\b/.test(a)&&/\b(?:not|bukan)\b/.test(a)){
 const pos=(t:string)=>{const c=t.search(/\b(?:weighted mean|rata-rata tertimbang)\b/),n=t.search(/\b(?:not|bukan)\b/);return c>=0&&n>=0?c<n:null;};if(pos(a)!==null&&pos(b)!==null&&pos(a)!==pos(b))add('Q4','major','NEGATION_SCOPE','Scope penyangkalan terhadap rata-rata tertimbang berubah.');}
 if(/\b(?:necessary|sufficient|perlu|diperlukan|cukup)\b/.test(a)&&/\b(?:not|tidak|bukan)\b/.test(a))add('Q4','major','LOGICAL_SCOPE_REVIEW','Pernyataan perlu/cukup dengan negasi membutuhkan pemeriksaan arah implikasi dan scope secara eksplisit.');
 const idNounDemonstrative=/\p{L}+[ -]+(?:ini|itu)\b/u,enNounDemonstrative=/\b(?:this|that|these|those)\s+(?!(?:is|are|was|were|has|have|can|must)\b)\p{L}+(?:\s+\p{L}+){0,2}\s+(?:is|are|was|were|has|have|can|must)\b/u;
 if(direction==='id-en'&&idNounDemonstrative.test(a)&&/\b(?:it|they|he|she)(?:['’]s|\s+(?:is|are|has|have|must|will|can))\b/.test(b)&&! /(?:^|[.!?]\s+)(?:this|that|these|those|the)\s+(?!(?:is|are|was|were)\b)\p{L}+/u.test(b)||direction==='en-id'&&enNounDemonstrative.test(a)&&/\b(?:ia|dia|mereka|ini|itu)\s+(?:adalah|memiliki|harus|dapat|berwarna)\b/.test(b)&&!idNounDemonstrative.test(b))add('Q4','major','DEMONSTRATIVE_REFERENCE_REVIEW','Sumber menyebut objek dengan penunjuk ini/itu/this/that, sedangkan target memakai kata ganti tanpa nomina yang jelas. Periksa apakah objek atau rujukan hilang; pengecualian memerlukan konteks dan alasan.');
 if(direction==='id-en'&&/\b(?:ia|dia)\b/.test(a)&&/\b(?:he|she|his|her)\b/.test(b))add('Q4','major','GENDER_ADDITION','Sumber tidak menyebut gender; target menetapkan gender');
 if(/\b(?:kami|kita|we|our)\b/.test(a))add('Q4','warning','REFERENCE_SCOPE','Periksa cakupan kami/kita/we dengan konteks dokumen');
 if(source.length>80&&target.length<source.length*.35)add('Q4','major','POSSIBLE_OMISSION','Target jauh lebih pendek; periksa bagian yang hilang');
 const graphemes=(text:string)=>Array.from(new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)).length;
 if(graphemes(target)>graphemes(source))add('Q3','warning','TARGET_LENGTH_WARNING','Target lebih panjang dalam grapheme; periksa batas editorial tanpa menghapus makna, domain, atau negasi.');
 for(const g of glossaryForScope(glossary,direction,role,domain)){if(normalizeTerm(source).includes(normalizeTerm(g.source))&&!normalizeTerm(target).includes(normalizeTerm(g.target)))add('Q3','major','GLOSSARY',`Istilah proyek belum ditemukan: ${g.source} → ${g.target}`);}
 return f;
}
export function recheck(seg:Segment,direction:Direction,glossary:GlossaryEntry[],domain=''){seg.qaPolicyVersion=CHECKER;seg.findings=quality(seg.source,seg.target??'',direction,seg.role,glossary,domain);seg.status=seg.findings.some(f=>['critical','major'].includes(f.severity)&&!f.resolved)?'NEEDS_REVIEW':'AUTO_QA_PASS';seg.reviewer=undefined;seg.reviewHash=undefined;}
export function coverage(documents:{segments:Segment[];disposition:string;payload?:{counts:{total:number;translated:number;qa:number;human:number;blocked:number}};hydrated?:boolean}[]){
 const result={total:0,translated:0,qa:0,human:0,blocked:0};
 for(const d of documents.filter(d=>d.disposition==='translate')){
  if(d.payload&&!d.hydrated){for(const key of Object.keys(result) as (keyof typeof result)[])result[key]+=d.payload.counts[key];continue;}
  for(const s of d.segments.filter(s=>s.selected)){result.total++;if(s.target!==undefined)result.translated++;if(['AUTO_QA_PASS','HUMAN_REVIEWED'].includes(s.status))result.qa++;if(s.status==='HUMAN_REVIEWED')result.human++;if(['NEEDS_REVIEW','FAILED'].includes(s.status))result.blocked++;}
 }
 return result;
}
