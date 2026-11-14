import {audit,sha256,type Job,type Document,type Segment,type EngineTask,type EngineResult} from './types';
import {acceptEnvelope,recheck} from './quality';
import {preservationErrors} from './protection';
export const segmentLocation=(d:Document,s:Segment)=>`${d.path} · ${s.pointer||s.unitId||s.role} · [${s.start}, ${s.end})`;
function relatedQA(job:Job,d:Document,s:Segment){recheck(s,job.direction,job.glossary,job.domain);if(s.group)for(const other of d.segments)if(other!==s&&other.unitId===s.unitId&&other.target!==undefined)recheck(other,job.direction,job.glossary,job.domain);}
export function editSegment(job:Job,d:Document,s:Segment,text:string){
 const errors=preservationErrors(s.source,text,{tableCell:s.role==='table'});if(errors.length)throw new Error(`${segmentLocation(d,s)}: ${errors.join('; ')}. Target tersimpan tetap aman. Pulihkan literal sumber lalu simpan ulang.`);
 s.target=text;s.history=s.history.slice(0,s.historyAt+1);s.history.push({text,time:new Date().toISOString(),provenance:'manual-edit'});s.historyAt=s.history.length-1;s.revision++;s.attemptId=undefined;relatedQA(job,d,s);audit(job,'EDIT',s.id);
}
export function undoSegment(job:Job,d:Document,s:Segment,delta:number){const index=s.historyAt+delta;if(!Number.isSafeInteger(index)||index<0||index>=s.history.length)return false;s.historyAt=index;s.target=s.history[index].text;s.revision++;s.attemptId=undefined;relatedQA(job,d,s);audit(job,delta<0?'UNDO':'REDO',s.id);return true;}
/** The UI uses this exact boundary before persistence; stale responses cannot mutate any project. */
export function applyTranslationResult(job:Job,s:Segment,task:EngineTask,result:EngineResult,fingerprint:string){
 if(job.id!==task.jobId||s.id!==task.segmentId||s.attemptId!==task.attemptId||s.revision!==task.revision||job.direction!==task.direction||job.glossaryRevision!==task.glossaryRevision||s.source!==task.sourceText||!job.documents.some(d=>d.segments.includes(s)))return false;
 if(!acceptEnvelope(task,result,fingerprint)||typeof result.targetText!=='string'||result.targetText.length>100000)throw new Error('Hasil tidak lengkap atau identitas respons berubah');
 s.target=result.targetText;s.revision++;s.history=s.history.slice(0,s.historyAt+1);s.history.push({text:s.target,time:new Date().toISOString(),provenance:result.engineFingerprint});s.historyAt=s.history.length-1;s.engine=result.engineFingerprint;recheck(s,job.direction,job.glossary,job.domain);audit(job,'TRANSLATION_COMMITTED',s.id);return true;
}
export async function resolveFalsePositive(job:Job,s:Segment,findingId:string,reason:string){
 const f=s.findings.find(f=>f.id===findingId);if(!f||['Q1','Q2'].includes(f.layer))throw new Error('Temuan integritas harus diperbaiki, tidak dapat dikecualikan.');
 if(reason.trim().length<12)throw new Error('Tuliskan alasan spesifik minimal 12 karakter.');
 const revision=s.revision,source=s.source,target=s.target;const sourceHash=await sha256(source),targetHash=await sha256(target??'');
 if(s.revision!==revision||s.source!==source||s.target!==target||!s.findings.includes(f))throw new Error('Revisi berubah sebelum keputusan QA disimpan.');
 f.resolved=reason.trim();f.decision={revision,sourceHash,targetHash,time:new Date().toISOString(),checker:f.checker};
 s.status=s.findings.some(x=>['critical','major'].includes(x.severity)&&!x.resolved)?'NEEDS_REVIEW':'AUTO_QA_PASS';s.reviewer=undefined;s.reviewHash=undefined;
 audit(job,'FALSE_POSITIVE',JSON.stringify({segmentId:s.id,findingId:f.id,reason:f.resolved,...f.decision}));
}
