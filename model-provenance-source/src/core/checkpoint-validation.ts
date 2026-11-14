import {validModelReview,MODEL_REVIEW_LIMIT} from './model-review';
import {type Job,type Segment,type Finding} from './types';
const text=(x:unknown,max=100000)=>typeof x==='string'&&x.length<=max;
const integer=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
const statuses=['NOT_STARTED','RUNNING','DRAFT','NEEDS_REVIEW','AUTO_QA_PASS','HUMAN_REVIEWED','FAILED'];
const validFinding=(f:Finding)=>f&&text(f.id)&&text(f.layer)&&['critical','major','minor','warning'].includes(f.severity)&&text(f.category)&&text(f.reason)&&text(f.checker)&&(f.resolved===undefined||text(f.resolved));
export function checkpointReviver(key:string,value:any){
 if(['__proto__','constructor','prototype'].includes(key))throw new Error('Key metadata checkpoint tidak aman');
 if(value&&typeof value==='object'&&Object.hasOwn(value,'__bytes')){
  if(Object.keys(value).length!==1||!Array.isArray(value.__bytes)||!value.__bytes.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=255))throw new Error('Byte checkpoint tidak valid');
  return new Uint8Array(value.__bytes);
 }
 return value;
}
export function validateCheckpointMetadata(job:Job){
 if(!text(job.id,1000)||!text(job.name,10000)||!text(job.createdAt,100)||!integer(job.revision)||!integer(job.glossaryRevision)||typeof job.requireHuman!=='boolean'||!text(job.state,100)||(job.fingerprint!==undefined&&!text(job.fingerprint,10000)))throw new Error('Metadata proyek rusak');
 if(job.versionLock&&(!text(job.versionLock.appVersion,100)||!['0.1.0','0.2.0','0.3.0','0.4.0','0.5.0','0.6.0','0.7.0','0.8.0','0.9.0','0.10.0','0.10.1'].includes(job.versionLock.appVersion)||job.versionLock.modelFingerprint!==undefined&&!text(job.versionLock.modelFingerprint,10000)))throw new Error('Kunci versi checkpoint tidak valid');
 for(const g of job.glossary)if(!g||!text(g.source)||!text(g.target)||!text(g.role)||!text(g.domain)||!['id-en','en-id'].includes(g.direction))throw new Error('Glosarium checkpoint tidak valid');
 for(const l of job.log)if(!l||!text(l.time,100)||!text(l.action,1000)||!text(l.detail))throw new Error('Log checkpoint tidak valid');
 if(job.sourcePlan&&(!Array.isArray(job.sourcePlan)||job.sourcePlan.some(p=>!p||!text(p.path,10000)||!/^[a-f0-9]{64}$/.test(p.hash)||typeof p.directory!=='boolean')))throw new Error('Plan sumber checkpoint tidak valid');
}
export function validateCheckpointSegment(s:Segment){
 if(s?.modelReviews!==undefined&&(!Array.isArray(s.modelReviews)||s.modelReviews.length>MODEL_REVIEW_LIMIT||!s.modelReviews.every(validModelReview)))throw new Error('Diagnostik model checkpoint tidak valid');
 if(!s||!text(s.id,1000)||typeof s.selected!=='boolean'||!integer(s.revision)||!statuses.includes(s.status)||!Array.isArray(s.history)||s.history.length>10000||!Number.isSafeInteger(s.historyAt)||s.historyAt< -1||s.historyAt>=s.history.length||!Array.isArray(s.findings)||!s.findings.every(validFinding))throw new Error('State segmen checkpoint tidak valid');
 if(s.target!==undefined&&!text(s.target)||s.engine!==undefined&&!text(s.engine,10000)||s.reviewer!==undefined&&!text(s.reviewer)||s.reviewHash!==undefined&&!text(s.reviewHash,1000))throw new Error('Provenance checkpoint tidak valid');
 for(const h of s.history)if(!h||!text(h.text)||!text(h.time,100)||!text(h.provenance,10000))throw new Error('Riwayat checkpoint tidak valid');
 if(s.history.length&&(s.historyAt<0||s.history[s.historyAt].text!==s.target))throw new Error('Target dan riwayat checkpoint berbeda');
 if(s.importedReviews!==undefined&&(!Array.isArray(s.importedReviews)||s.importedReviews.length>1000||s.importedReviews.some(r=>!r||r.authority!=='UNTRUSTED_CHECKPOINT_HISTORY'||!integer(r.revision)||!statuses.includes(r.status)||r.target!==undefined&&!text(r.target)||!Array.isArray(r.findings)||!r.findings.every(validFinding)||r.reviewer!==undefined&&!text(r.reviewer)||r.reviewHash!==undefined&&!text(r.reviewHash,1000))))throw new Error('Riwayat QA checkpoint tidak valid');
}
