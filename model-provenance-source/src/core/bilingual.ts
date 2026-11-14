import {audit, type Document, type Job, type Segment} from './types';
import {isLockedSegment} from './parser';
import {prosePresent} from './protection';

export type BilingualBinding = {sourceId:string;targetId:string;sourceHash:string;approvedText?:string;approvedRevision?:number};
function lockedBilingualField(doc:Document,s:Segment) {
  const role=s.role.replace(/[_-]/g,'').toLowerCase();
  return isLockedSegment(doc,s)||['recordid','questionid','itemid','uuid','guid','schema','schemaversion','type','category','answerkey','key','enum'].includes(role)||/\/(?:metadata|meta|_meta)\//i.test(s.pointer||'')||!!s.source.trim()&&!prosePresent(s.source);
}
export function bilingualFields(doc:Document) {
  return doc.segments.filter(s=>s.json && !s.jsonContainer && !lockedBilingualField(doc,s));
}
export function resolveBilingualBindings(doc:Document):Map<string,Segment> {
  const result=new Map<string,Segment>(),used=new Set<string>();
  if(doc.bilingualBindings!==undefined&&!Array.isArray(doc.bilingualBindings))throw new Error('Pemetaan bilingual tidak valid');
  for(const pair of doc.bilingualBindings||[]) {
    const source=doc.segments.find(s=>s.id===pair.sourceId),target=doc.segments.find(s=>s.id===pair.targetId);
    if(!source||!target||source===target||pair.sourceHash!==doc.hash||used.has(source.id)||used.has(target.id)||!source.selected||target.selected||!source.json||!target.json||source.jsonContainer||target.jsonContainer||lockedBilingualField(doc,source)||lockedBilingualField(doc,target)||!source.source.trim())throw new Error('Pemetaan bilingual bertabrakan atau memilih field tidak valid');
    for(const s of [source,target])if(s.occurrences.length!==1||s.occurrences[0].start!==s.start||s.occurrences[0].end!==s.end||JSON.parse(doc.text.slice(s.start,s.end))!==s.source)throw new Error('Field bilingual tidak cocok sumber immutable');
    used.add(source.id);used.add(target.id);result.set(source.id,target);
  }
  return result;
}
export function bilingualReady(doc:Document) {
  try {resolveBilingualBindings(doc);}catch{return false;}
  return (doc.bilingualBindings||[]).every(pair=>{const s=doc.segments.find(s=>s.id===pair.sourceId)!;return s.target!==undefined&&pair.approvedText===s.target&&pair.approvedRevision===s.revision;});
}
export function bindBilingual(job:Job,doc:Document,sourceId:string,targetId:string) {
  if(!job.documents.includes(doc)||doc.disposition!=='translate'||doc.errors.length)throw new Error('Berkas tidak siap untuk pemetaan bilingual');
  const source=doc.segments.find(s=>s.id===sourceId),target=doc.segments.find(s=>s.id===targetId);
  if(!source||!target)throw new Error('Pilih dua field teks yang berbeda');
  const selected=[source.selected,target.selected],prior=doc.bilingualBindings;
  source.selected=true;target.selected=false;
  doc.bilingualBindings=[...(prior||[]),{sourceId,targetId,sourceHash:doc.hash}];
  try{resolveBilingualBindings(doc);}catch(e){source.selected=selected[0];target.selected=selected[1];doc.bilingualBindings=prior;throw e;}
  doc.mappingConfirmed=false;
  audit(job,'BILINGUAL_BIND',JSON.stringify({path:doc.path,source:source.pointer,target:target.pointer,overwriteApproved:false}));
}
export function unbindBilingual(job:Job,doc:Document,sourceId:string) {
  const pair=doc.bilingualBindings?.find(p=>p.sourceId===sourceId);if(!pair)return;
  doc.bilingualBindings=doc.bilingualBindings!.filter(p=>p!==pair);
  for(const s of doc.segments)if(s.id===pair.sourceId||s.id===pair.targetId)s.selected=false;
  doc.mappingConfirmed=false;audit(job,'BILINGUAL_UNBIND',doc.path+' '+sourceId);
}
export function approveBilingualOverwrite(job:Job,doc:Document,sourceId:string,expectedText:string,expectedRevision:number) {
  resolveBilingualBindings(doc);
  const pair=doc.bilingualBindings?.find(p=>p.sourceId===sourceId),s=doc.segments.find(s=>s.id===sourceId);
  if(!pair||!s||s.target===undefined||s.target!==expectedText||s.revision!==expectedRevision)throw new Error('Target berubah setelah pratinjau; periksa ulang sebelum overwrite');
  pair.approvedText=s.target;pair.approvedRevision=s.revision;
  audit(job,'BILINGUAL_OVERWRITE_CONSENT',JSON.stringify({path:doc.path,source:s.pointer,target:doc.segments.find(x=>x.id===pair.targetId)?.pointer,revision:s.revision}));
}
