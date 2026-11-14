import type {Document} from './types';
export function recordIntegrityErrors(doc:Document){
 const errors:string[]=[];
 const options=doc.segments.filter(s=>s.selected&&s.target!==undefined&&/\/options\/\d+\/text$/.test(s.pointer||''));
 const normalize=(s:string)=>s.normalize('NFC').toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();
 for(let i=0;i<options.length;i++)for(let j=i+1;j<options.length;j++){
  const a=options[i],b=options[j];
  if(a.unitId===b.unitId&&normalize(a.source)!==normalize(b.source)&&normalize(a.target!)===normalize(b.target!))errors.push(`${doc.path}: opsi berbeda menjadi identik (${a.pointer}, ${b.pointer}). Periksa setiap distractor.`);
 }
 return errors;
}
