import {audit,sha256,POLICY,type Job,type Document,type Segment} from './types';
import {contextForSegment} from './context';
import {protectedSpans} from './protection';
import {editSegment} from './revisions';
export type DraftProposal={jobId:string;jobRevision:number;segmentId:string;revision:number;sourceHash:string;targetHash:string;candidateId:string;candidateRevision:number;candidateStatus:string;candidateHash:string;key:string;text:string};
const approved=(s:Segment)=>s.status==='HUMAN_REVIEWED'||s.status==='AUTO_QA_PASS';
export async function reuseKey(job:Job,d:Document,s:Segment){return sha256(JSON.stringify({source:s.source,direction:job.direction,profile:d.profile,parser:d.parserVersion,role:s.role,protected:protectedSpans(s.source),context:contextForSegment(d,s),glossary:job.glossaryRevision,domain:job.domain||'',style:POLICY,engine:s.engine||job.fingerprint||'manual'}));}
export async function proposeDraft(job:Job,d:Document,s:Segment,candidate:Segment):Promise<DraftProposal>{
 if(candidate===s||candidate.target===undefined||candidate.status==='HUMAN_REVIEWED'||!d.segments.includes(candidate)||!d.segments.includes(s))throw new Error('Draf lokal yang cocok tidak tersedia.');
 const key=await reuseKey(job,d,s);if(key!==await reuseKey(job,d,candidate))throw new Error('Konteks, role, kebijakan, atau model draf berbeda.');
 return {jobId:job.id,jobRevision:job.revision,segmentId:s.id,revision:s.revision,sourceHash:await sha256(s.source),targetHash:await sha256(s.target??''),candidateId:candidate.id,candidateRevision:candidate.revision,candidateStatus:candidate.status,candidateHash:await sha256(candidate.target),key,text:candidate.target};
}
export async function applyDraft(job:Job,d:Document,s:Segment,p:DraftProposal,explicitOverwrite=false){
 const candidate=d.segments.find(x=>x.id===p.candidateId);if(!candidate)throw new Error('Draf berubah. Buat pratinjau baru.');
 const fresh=await proposeDraft(job,d,s,candidate);
 if(JSON.stringify(fresh)!==JSON.stringify(p)||job.id!==p.jobId||job.revision!==p.jobRevision)throw new Error('Revisi berubah. Buat pratinjau draf baru.');
 if(approved(s)&&!explicitOverwrite)throw new Error('Draf tidak boleh menimpa hasil disetujui tanpa konfirmasi revisi ini.');
 editSegment(job,d,s,p.text);s.engine=candidate.engine; // editSegment re-runs QA and clears human approval.
 audit(job,'LOCAL_DRAFT_REUSE',JSON.stringify({candidateId:p.candidateId,candidateStatus:p.candidateStatus,target:s.id,sourceHash:p.sourceHash,candidateHash:p.candidateHash,explicitOverwrite}));
}
