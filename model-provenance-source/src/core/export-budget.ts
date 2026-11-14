import type {Document} from './types';
/** This product currently hands a bounded Blob to the browser. No streaming-save claim. */
export const BLOB_EXPORT_CAP=16*1024*1024;
export const BLOB_EXPORT_MESSAGE='Ekspor Blob dibatasi 16 MiB payload. Pilih subset berkas lengkap yang lebih kecil melalui keputusan berkas, atau unduh checkpoint. Tidak ada ZIP parsial yang disamarkan sebagai lengkap.';
export function sourceExportBytes(documents:Document[]){return documents.reduce((n,d)=>n+(d.sourceByteLength??d.bytes.length),0);}
export function assertExportBudget(size:number,cap=BLOB_EXPORT_CAP){if(!Number.isSafeInteger(size)||size<0||size>cap)throw new Error(BLOB_EXPORT_MESSAGE);}
