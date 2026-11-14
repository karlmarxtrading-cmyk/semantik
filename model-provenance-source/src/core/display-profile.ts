import type {Document} from './types';
export type HeadingPolicy='LITERAL_STRUCTURE'|'LOCALIZED_DISPLAY_HEADINGS';
export const DISPLAY_PROFILE_VERSION='txt-display-headings-v1';
const labels=[['Kasus','Case'],['Istilah yang dipakai','Terms used'],['Pertanyaan','Questions'],['Kriteria Evaluasi Jawaban','Answer Evaluation Criteria'],['Rujukan','References']] as const;
export function isStructuralHeading(line:string){return /^###\s+(?:Kasus|Case|Istilah yang dipakai|Terms used|Pertanyaan|Questions|Kriteria Evaluasi Jawaban|Answer Evaluation Criteria|Rujukan|References|Q\d+|(?:Penjelasan|Explanation) Q\d+)\s*$/.test(line);}
export function displayHeadingPatches(doc:Document){
 const patches:{start:number;end:number;text:string}[]=[];
 if(!doc.headingPolicy||doc.headingPolicy==='LITERAL_STRUCTURE')return patches;
 if(doc.headingPolicy!=='LOCALIZED_DISPLAY_HEADINGS'||!doc.profile.startsWith('TXT-')||!['id','en'].includes(doc.displayHeadingLanguage||''))throw new Error('Profil heading tidak didukung');
 let fence='';
 for(const match of doc.text.matchAll(/[^\r\n]+(?:\r\n|\r|\n|$)|(?:\r\n|\r|\n)/g)){
  const line=match[0].replace(/[\r\n]+$/,''),f=/^\s*(`{3,}|~{3,})/.exec(line);
  if(f){if(!fence)fence=f[1][0];else if(fence===f[1][0])fence='';continue;}if(fence)continue;
  const h=/^(###\s+)(.*?)(\s*)$/.exec(line);if(!h)continue;
  const pair=labels.find(p=>p.includes(h[2] as never));
  if(pair){const target=pair[doc.displayHeadingLanguage==='en'?1:0];if(target!==h[2])patches.push({start:match.index!+h[1].length,end:match.index!+h[1].length+h[2].length,text:target});}
  const explanation=/^(Penjelasan|Explanation)(?=\s+Q\d+(?:\.|\s*$))/.exec(h[2]);
  if(explanation){const target=doc.displayHeadingLanguage==='en'?'Explanation':'Penjelasan';if(target!==explanation[1])patches.push({start:match.index!+h[1].length,end:match.index!+h[1].length+explanation[1].length,text:target});}
 }
 return patches;
}
export function escapeTableCell(text:string){
 if(/[\r\n]/.test(text))throw new Error('Target menambahkan baris pada sel tabel');
 let out='',slashes=0;
 for(const c of text){if(c==='|'&&slashes%2===0)out+='\\';out+=c;slashes=c==='\\'?slashes+1:0;}
 return out;
}
