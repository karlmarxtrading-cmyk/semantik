import {CHECKER} from './quality';
import type {Job} from './types';
export function invalidateOldQa(job:Job){
 if(job.qaPolicyVersion===CHECKER)return false;
 for(const d of job.documents){if(d.payload&&!d.hydrated){d.payload.readyAuto=false;d.payload.readyHuman=false;d.payload.counts.qa=0;d.payload.counts.human=0;}for(const s of d.segments)if(s.target!==undefined){s.status='NEEDS_REVIEW';s.reviewer=undefined;s.reviewHash=undefined;}}
 job.qaPolicyVersion=CHECKER;return true;
}
