import type {GlossaryEntry,Direction} from './types';
export const normalizeTerm=(text:string)=>text.normalize('NFKC').trim().toLocaleLowerCase('en');
export function parseGlossary(text:string,direction:Direction):GlossaryEntry[]{
 const rows=text.split(/\r?\n/).filter(line=>line.trim()).map(line=>{
  const fields=line.split('\t');if(fields.length>4)throw new Error('Glosarium memiliki lebih dari empat kolom');
  const [source,target,role='',domain='']=fields.map(x=>x.trim());
  if(!source||!target)throw new Error('Setiap entri memerlukan sumber dan target, dipisahkan TAB');
  return {source,target,role,domain,direction};
 });
 if(rows.length>1000)throw new Error('Maksimal 1.000 entri glosarium');
 const seen=new Map<string,string>();
 for(const g of rows){const key=JSON.stringify([direction,normalizeTerm(g.source),normalizeTerm(g.role),normalizeTerm(g.domain)]),target=normalizeTerm(g.target);
  if(seen.has(key)&&seen.get(key)!==target)throw new Error('Entri glosarium berkonflik: '+g.source);seen.set(key,target);
 }
 return rows;
}
export function glossaryForScope(entries:GlossaryEntry[],direction:Direction,role:string,domain=''){
 return entries.filter(g=>g.direction===direction&&(!g.role||normalizeTerm(g.role)===normalizeTerm(role))&&(!g.domain||normalizeTerm(g.domain)===normalizeTerm(domain)));
}
export function glossaryAffectsSegment(source:string,role:string,direction:Direction,oldEntries:GlossaryEntry[],newEntries:GlossaryEntry[],oldDomain='',newDomain=''){
 const relevant=(entries:GlossaryEntry[],domain:string)=>glossaryForScope(entries,direction,role,domain).filter(g=>normalizeTerm(source).includes(normalizeTerm(g.source))).map(g=>JSON.stringify([normalizeTerm(g.source),normalizeTerm(g.target)])).sort();
 return JSON.stringify(relevant(oldEntries,oldDomain))!==JSON.stringify(relevant(newEntries,newDomain));
}
