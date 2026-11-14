import {audit,sha256,uid,type Job,type Segment,type EngineTask,type EngineResult} from './types';
import {acceptEnvelope} from './quality';
import {preservationErrors} from './protection';
import {reviewIdentity} from './review-identity';

/** A second local NMT inference, not a semantic judge or independent assessment. */
export const MODEL_REVIEW_METHOD='same-direction-retranslation-v1';
export const MODEL_REVIEW_LIMIT=20;
export type ModelReviewTask=EngineTask&{candidateText:string;generatorFingerprint?:string};
export type ModelReviewResult=EngineResult&{candidateText:string;generatorFingerprint?:string;reviewMethod:typeof MODEL_REVIEW_METHOD};
export type ModelReviewRecord={method:typeof MODEL_REVIEW_METHOD;revision:number;sourceHash:string;targetHash:string;alternativeHash:string;alternativeText:string;checkerFingerprint:string;generatorFingerprint?:string;identity:ReturnType<typeof reviewIdentity>;comparison:'IDENTICAL'|'DIFFERENT';time:string;authority:'LOCAL_MODEL_EXECUTION'|'IMPORTED_UNVERIFIED'};

export function modelReviewTask(job:Job,s:Segment,context:string):ModelReviewTask{
 if(s.target===undefined)throw new Error('Target diperlukan untuk diagnostik model.');
 if((s.modelReviews?.length||0)>=MODEL_REVIEW_LIMIT)throw new Error('Batas 20 catatan diagnostik segmen tercapai. Simpan checkpoint; riwayat tidak dihapus.');
 const generatorFingerprint=s.history[s.historyAt]?.provenance===s.engine?s.engine:undefined;
 return {jobId:job.id,segmentId:s.id,attemptId:uid(),revision:s.revision,direction:job.direction,sourceText:s.source,contextBefore:context,contextAfter:'',role:s.role,glossaryRevision:job.glossaryRevision,candidateText:s.target,generatorFingerprint};
}
function unchanged(job:Job,s:Segment,t:ModelReviewTask){
 return job.id===t.jobId&&s.id===t.segmentId&&s.revision===t.revision&&s.source===t.sourceText&&s.target===t.candidateText&&job.direction===t.direction&&job.glossaryRevision===t.glossaryRevision&&job.documents.some(d=>d.segments.includes(s));
}
export async function applyModelReview(job:Job,s:Segment,task:ModelReviewTask,result:ModelReviewResult,expectedFingerprint:string,isCurrent=()=>true){
 if(!isCurrent()||!unchanged(job,s,task)||job.fingerprint&&job.fingerprint!==expectedFingerprint)return false;
 if((s.modelReviews?.length||0)>=MODEL_REVIEW_LIMIT)throw new Error('Batas catatan diagnostik segmen tercapai.');
 if(!acceptEnvelope(task,result,expectedFingerprint)||result.reviewMethod!==MODEL_REVIEW_METHOD||result.candidateText!==task.candidateText||result.generatorFingerprint!==task.generatorFingerprint||typeof result.targetText!=='string'||result.targetText.length>100000||preservationErrors(s.source,result.targetText,{tableCell:s.role==='table'}).length)throw new Error('Respons diagnostik model tidak valid atau tidak lengkap.');
 const [sourceHash,targetHash,alternativeHash]=await Promise.all([sha256(s.source),sha256(task.candidateText),sha256(result.targetText)]);
 if(!isCurrent()||!unchanged(job,s,task)||job.fingerprint&&job.fingerprint!==expectedFingerprint)return false;
 if((s.modelReviews?.length||0)>=MODEL_REVIEW_LIMIT)throw new Error('Batas catatan diagnostik segmen tercapai.');
 const record:ModelReviewRecord={method:MODEL_REVIEW_METHOD,revision:s.revision,sourceHash,targetHash,alternativeHash,alternativeText:result.targetText,checkerFingerprint:result.engineFingerprint,generatorFingerprint:task.generatorFingerprint,identity:reviewIdentity(task.generatorFingerprint,{kind:'model',fingerprint:result.engineFingerprint}),comparison:task.candidateText===result.targetText?'IDENTICAL':'DIFFERENT',time:new Date().toISOString(),authority:'LOCAL_MODEL_EXECUTION'};
 s.modelReviews=[...(s.modelReviews||[]),record];
 // Never overwrite target, status, existing findings, or a human decision. A
 // deterministic match inherits the model's errors; a difference may be valid paraphrase.
 audit(job,'MODEL_DIAGNOSTIC',JSON.stringify({segmentId:s.id,revision:s.revision,sourceHash,targetHash,alternativeHash,checkerFingerprint:record.checkerFingerprint,kind:record.identity.kind,comparison:record.comparison,human:false}));
 return true;
}
export function validModelReview(x:unknown):x is ModelReviewRecord{
 if(!x||typeof x!=='object')return false;const r=x as ModelReviewRecord;
 const str=(v:unknown,max=100000)=>typeof v==='string'&&v.length<=max;
 if(r.method!==MODEL_REVIEW_METHOD||!Number.isSafeInteger(r.revision)||r.revision<0||![r.sourceHash,r.targetHash,r.alternativeHash].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x))||!str(r.alternativeText)||!str(r.checkerFingerprint,10000)||r.generatorFingerprint!==undefined&&!str(r.generatorFingerprint,10000)||!str(r.time,100)||!['IDENTICAL','DIFFERENT'].includes(r.comparison)||!['LOCAL_MODEL_EXECUTION','IMPORTED_UNVERIFIED'].includes(r.authority))return false;
 const expected=reviewIdentity(r.generatorFingerprint,{kind:'model',fingerprint:r.checkerFingerprint});
 return !!r.identity&&Object.keys(r.identity).length===Object.keys(expected).length&&Object.entries(expected).every(([k,v])=>(r.identity as unknown as Record<string,unknown>)[k]===v);
}
