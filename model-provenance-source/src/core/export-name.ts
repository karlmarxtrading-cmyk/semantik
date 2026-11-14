import type {Job} from './types';
export function exportFilename(job:Job,mode:'full'|'partial'|'draft',fileCount:number){
 const name=job.name.replace(/\.zip$/i,'').replace(/[^\p{L}\p{N}_.-]+/gu,'_')||'semantik';
 const planned=job.documents.filter(d=>!d.directory&&d.disposition!=='exclude').length;
 // A hydrated document can retain an older payload reference while its mapping
 // changes. Summary counts are authoritative only for parked documents.
 const hasTranslation=job.documents.some(d=>!d.directory&&d.disposition==='translate'&&(d.payload&&!d.hydrated?d.payload.counts.total>0:d.segments.some(s=>s.selected)));
 const status=mode==='draft'?'DRAFT':mode==='partial'?`PARTIAL_${fileCount}_of_${planned}`:!hasTranslation?'PASSTHROUGH':job.requireHuman?'HUMAN_REVIEWED':'AUTO_QA';
 return `${name}__${job.direction}__${status}.zip`;
}
