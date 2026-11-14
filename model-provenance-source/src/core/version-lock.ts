import {VERSION,audit,type Job} from './types';
export type VersionLock={appVersion:string;modelFingerprint?:string};
export function versionChange(job:Job,modelFingerprint?:string){
 const lock=job.versionLock;
 return (!!lock&&lock.appVersion!==VERSION)||!!(job.fingerprint&&modelFingerprint&&job.fingerprint!==modelFingerprint)||!!(lock?.modelFingerprint&&modelFingerprint&&lock.modelFingerprint!==modelFingerprint);
}
export function requireVersion(job:Job,modelFingerprint?:string){
 if(versionChange(job,modelFingerprint))throw new Error('Versi proyek terkunci. Unduh checkpoint lalu migrasikan pada titik aman sebelum melanjutkan.');
 if(!job.versionLock)job.versionLock={appVersion:VERSION,modelFingerprint:job.fingerprint};
}
export function lockModel(job:Job,fingerprint:string){requireVersion(job,fingerprint);job.fingerprint=fingerprint;job.versionLock!.modelFingerprint=fingerprint;}
export function migrateVersion(job:Job,backup:{jobId:string;revision:number},running:boolean){
 if(running||job.state==='TRANSLATING'||backup.jobId!==job.id||backup.revision!==job.revision)throw new Error('Migrasi memerlukan checkpoint revisi aktif pada titik aman.');
 // Preserve all candidates and history; cached QA and approvals are invalidated, never upgraded.
 for(const d of job.documents){if(d.payload){d.payload.readyAuto=false;d.payload.readyHuman=false;d.payload.counts.qa=0;d.payload.counts.human=0;}for(const s of d.segments)if(s.target!==undefined){s.status='NEEDS_REVIEW';s.reviewer=undefined;s.reviewHash=undefined;s.qaPolicyVersion=undefined;s.findings=[];}}
 const previous=job.versionLock;job.versionLock={appVersion:VERSION};job.fingerprint=undefined;job.qaPolicyVersion=undefined;job.state='PAUSED';audit(job,'EXPLICIT_VERSION_MIGRATION',JSON.stringify({previous,next:job.versionLock,backupRevision:backup.revision}));
}
