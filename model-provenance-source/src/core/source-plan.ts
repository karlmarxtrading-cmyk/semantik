import type {Job,Document} from './types';
export function sourcePlan(documents:Document[]){return documents.map(d=>({path:d.path,hash:d.hash,directory:!!d.directory}));}
export function validateSourcePlan(job:Job){
 if(!job.sourcePlan) return; // v0.1 checkpoints acquire a plan only after source validation on restore/load.
 if(job.sourcePlan.length!==job.documents.length)throw new Error('Immutable source plan: jumlah berkas berbeda');
 const expected=new Map(job.sourcePlan.map(x=>[x.path,x]));
 if(expected.size!==job.sourcePlan.length)throw new Error('Immutable source plan: path duplikat');
 for(const d of job.documents){const p=expected.get(d.path);if(!p||p.hash!==d.hash||p.directory!==!!d.directory)throw new Error('Immutable source plan berubah: '+d.path);expected.delete(d.path);}
 if(expected.size)throw new Error('Immutable source plan: berkas hilang');
}
