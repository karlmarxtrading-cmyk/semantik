import {audit, type Document, type Job} from './types';

export type OutputEncoding = 'PRESERVE' | 'UTF8_NO_BOM' | 'UTF8_BOM';
export function validateOutputEncoding(value: unknown): asserts value is OutputEncoding | undefined {
  if (value !== undefined && !['PRESERVE', 'UTF8_NO_BOM', 'UTF8_BOM'].includes(value as string)) {
    throw new Error('Kebijakan encoding keluaran tidak valid');
  }
}
export function outputEncoding(doc: Document) {
  validateOutputEncoding(doc.outputEncoding);
  return !doc.outputEncoding || doc.outputEncoding === 'PRESERVE'
    ? {encoding: doc.encoding, bom: doc.bom}
    : {encoding: 'utf-8' as const, bom: doc.outputEncoding === 'UTF8_BOM'};
}
export function setOutputEncoding(job: Job, doc: Document, policy: OutputEncoding) {
  validateOutputEncoding(policy);
  if (!job.documents.includes(doc) || doc.errors.length || doc.disposition !== 'translate' || !/^(TXT-|JSON-)/.test(doc.profile)) {
    throw new Error('Kebijakan encoding hanya berlaku pada berkas teks valid yang dipilih untuk diterjemahkan');
  }
  const previous = doc.outputEncoding || 'PRESERVE';
  doc.outputEncoding = policy;
  audit(job, 'ENCODING_POLICY', JSON.stringify({path: doc.path, from: previous, to: policy, sourceEncoding: doc.encoding, sourceBOM: doc.bom}));
}
