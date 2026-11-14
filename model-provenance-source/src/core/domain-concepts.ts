import {protectedSpans} from './protection';
import type {Direction} from './types';
/** Domain terms are bound to source context; opaque math/code is never rewritten.
 * These rules identify translation risks, not mathematical truth or human approval. */
export function conceptProse(text:string){let s=text;for(const p of protectedSpans(text).sort((a,b)=>b.start-a.start))s=s.slice(0,p.start)+' '.repeat(p.end-p.start)+s.slice(p.end);return s;}
export function domainPairs(source:string,context=source):[string,string][]{
 const s=conceptProse(source),c=conceptProse(context);const pairs:[string,string][]=[
 ['pasangan satu-satu','one-to-one correspondence'],['pemasangan satu-satu','one-to-one matching'],['korespondensi satu-satu','one-to-one correspondence'],
 ['sebuah segi enam','a hexagon'],['segi enam','hexagon'],['segi enam','hexagons'],
 ['pernyataan majemuk','compound statement'],['pernyataan majemuk','compound statements'],
 ['luas daerah di bawah kurva','area under the curve'],['luas daerah di bawah kurva','area under a curve'],['luas daerah di antara kurva','area between curves'],['luas daerah di antara kurva','area between the curves'],
 ['menjadi dua kali lipat','becomes twice as large']
 ];
 const logic=/\b(?:statements?|propositions?|implications?|conditional|logic|if|then|pernyataan|implikasi|konvers)\b/i.test(c);
 if(logic){pairs.push(['konvers dari','the converse of'],['konvers dari','converse of'],['konvers','the converse'],['konversnya','its converse']);
  // Truth words in prose are translated, not evaluated. Formula/code spans stay opaque.
  pairs.push(['benar','true'],['salah','false']);
 }
 const quantitative=/\b(?:number|amount|population|quantity|length|width|height|value|volume|mass|count|calls|jumlah|populasi|panjang|nilai)\b/i.test(c);
 if(quantitative&&!/\b(?:tennis|badminton|tournament|doubles match)\b/i.test(c)){
  if(/\b(?:number|amount|population|quantity|length|width|height|value|volume|mass|count)\b[^.!?]{0,70}\bdoubles\b/i.test(s))pairs.push(['menjadi dua kali lipat','doubles']);
 }
 if(/\b(?:ratio|proportion|rasio|perbandingan)\b/i.test(c)&&!/\b(?:stock|stocks|equity|dividend|shareholders?|earnings|saham)\b/i.test(c))pairs.push(['bagian','share'],['bagian','shares'],['bagian yang sama besar','equal parts']);
 return pairs;
}
export function domainConceptFindings(source:string,target:string,direction:Direction){
 const s=conceptProse(source),t=conceptProse(target);const findings:{category:string;reason:string}[]=[];
 const checks:[RegExp,RegExp,string][]=[
 [/\b(?:pasangan|pemasangan|korespondensi) satu-satu\b/i,/\bone[- ]to[- ]one (?:correspondence|matching|pairing)\b/i,'ONE_TO_ONE_CORRESPONDENCE'],
 [/\b(?:segi enam|heksagon)\b/i,/\bhexagons?\b/i,'HEXAGON_TERM'],
 [/\bpernyataan majemuk\b/i,/\bcompound statements?\b/i,'COMPOUND_STATEMENT'],
 [/\bluas(?: daerah)? di bawah (?:suatu |sebuah )?kurva\b/i,/\barea under (?:the |a )?curve\b/i,'AREA_MEASURE'],
 [/\bluas(?: daerah)? di antara (?:dua |kedua )?kurva\b/i,/\barea between (?:the |two )?curves\b/i,'AREA_MEASURE']
 ];
 if(/\b(?:statements?|propositions?|implications?|conditional|logic|if|then|pernyataan|implikasi|konvers)\b/i.test(s))checks.push([/\bkonvers(?:nya)?\b/i,/\b(?:the converse|converse of|its converse)\b/i,'LOGICAL_CONVERSE'],[/\bbenar\b/i,/\btrue\b/i,'LOGICAL_TRUE'],[/\bsalah\b/i,/\bfalse\b/i,'LOGICAL_FALSE']);
 if(domainPairs(source).some(p=>p[1]==='doubles'))checks.push([/\b(?:dua kali lipat|dua kali (?:lebih besar|semula)|dikali(?:kan)? dua)\b/i,/\bdoubles\b/i,'MULTIPLICATIVE_GROWTH']);
 if(domainPairs(source).some(p=>p[1]==='shares')){
  checks.push([/\b(?:bagian|jatah)\b/i,/\bshares?\b/i,'RATIO_SHARE']);
  if(direction==='en-id'&&/\bshares?\b/i.test(s)&&/\bsaham\b/i.test(t))findings.push({category:'RATIO_FINANCIAL_FALSE_SENSE',reason:'Bagian pembagian rasio berubah menjadi saham. Periksa konteks penerima, besaran dan satuan.'});
 }
 for(const [id,en,category]of checks){const sr=direction==='id-en'?id:en,tr=direction==='id-en'?en:id;if(sr.test(s)&&!tr.test(t))findings.push({category,reason:'Konsep matematis sumber belum ditemukan secara setara pada target. Perlu pemeriksaan makna; bukan persetujuan manusia.'});}
 return findings;
}
