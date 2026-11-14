import {glossaryAffectsSegment} from './glossary';
import {hydrateDocument,parkDocument,isParked} from './document-store';
import {recheck} from './quality';
import type {Job,GlossaryEntry,Segment} from './types';
export type GlossaryImpact={index:number;path:string;count:number};
export async function planGlossaryUpdate(job:Job,rows:GlossaryEntry[],domain:string){
 const oldEntries=job.glossary,oldDomain=job.domain||'',revision=job.revision,glossaryRevision=job.glossaryRevision;
 const affected=(s:Segment)=>s.target!==undefined&&glossaryAffectsSegment(s.source,s.role,job.direction,oldEntries,rows,oldDomain,domain);
 const impacted:GlossaryImpact[]=[];
 for(let index=0;index<job.documents.length;index++){const d=await hydrateDocument(job.documents[index]);const count=d.segments.filter(affected).length;if(count)impacted.push({index,path:d.path,count});}
 return {rows,domain,revision,glossaryRevision,affected,impacted,count:impacted.reduce((n,x)=>n+x.count,0)};
}
export async function applyGlossaryUpdate(job:Job,plan:Awaited<ReturnType<typeof planGlossaryUpdate>>){
 if(job.revision!==plan.revision||job.glossaryRevision!==plan.glossaryRevision)throw new Error('Pratinjau glosarium sudah kedaluwarsa. Buka kembali pratinjau.');
 // Prepare changed payloads first. A failed write leaves the original ledger and glossary usable.
 const changed:Job['documents']=[];
 for(const entry of plan.impacted){const original=job.documents[entry.index],d=structuredClone(await hydrateDocument(original));for(const s of d.segments)if(plan.affected(s))recheck(s,job.direction,plan.rows,plan.domain);changed.push(isParked(original)?await parkDocument(d):d);}
 plan.impacted.forEach((entry,i)=>job.documents[entry.index]=changed[i]);
 job.domain=plan.domain;job.glossary=plan.rows;job.glossaryRevision++;
}
