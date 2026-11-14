import {bilingualReady} from './bilingual';
import {sha256,type Document} from './types';
import {coverage} from './quality';

const DIRECTORY='semantik-document-payloads-v1';
const serialize=(d:Document)=>JSON.stringify(d,(_k,v)=>v instanceof Uint8Array?{__bytes:Array.from(v)}:v);
const deserialize=(s:string):Document=>JSON.parse(s,(_k,v)=>v&&typeof v==='object'&&Array.isArray(v.__bytes)?new Uint8Array(v.__bytes):v);
export const isParked=(d:Document)=>!!d.payload&&!d.hydrated;
export async function parkDocument(doc:Document):Promise<Document>{
 if(isParked(doc)||doc.directory)return doc;
 const copy={...doc,id:'immutable-document-payload'};delete copy.payload;delete copy.hydrated;
 const text=serialize(copy),hash=await sha256(text),root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(DIRECTORY,{create:true});
 const file=await dir.getFileHandle(hash+'.json',{create:true}),writer=await file.createWritable();
 try{await writer.write(text);await writer.close();}catch(e){try{await writer.abort()}catch{}throw e;}
 if(await sha256(await(await file.getFile()).text())!==hash)throw new Error('Hash payload dokumen tidak cocok');
 const selected=doc.segments.filter(s=>s.selected);
 const clean=bilingualReady(doc)&&selected.every(s=>s.target!==undefined&&!s.findings.some(f=>['critical','major'].includes(f.severity)&&!f.resolved));
 return {...doc,bytes:new Uint8Array(),text:'',segments:[],hydrated:false,sourceByteLength:doc.bytes.length,payload:{hash,counts:coverage([doc]),readyAuto:clean&&selected.every(s=>['AUTO_QA_PASS','HUMAN_REVIEWED'].includes(s.status)),readyHuman:clean&&selected.every(s=>s.status==='HUMAN_REVIEWED')}};
}
export async function hydrateDocument(summary:Document):Promise<Document>{
 if(!isParked(summary))return summary;
 const root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(DIRECTORY),file=await dir.getFileHandle(summary.payload!.hash+'.json');
 const text=await(await file.getFile()).text();
 if(await sha256(text)!==summary.payload!.hash)throw new Error('Payload dokumen rusak: '+summary.path);
 const d=deserialize(text);for(const s of d.segments)if(s.status==='RUNNING'){s.status='NOT_STARTED';s.attemptId=undefined;}
 if(d.path!==summary.path||d.hash!==summary.hash||await sha256(d.bytes)!==summary.hash)throw new Error('Sumber payload berbeda: '+summary.path);
 return {...d,id:summary.id,mappingConfirmed:summary.mappingConfirmed,disposition:summary.disposition,headingPolicy:summary.headingPolicy,displayHeadingLanguage:summary.displayHeadingLanguage,payload:summary.payload,hydrated:true};
}
export async function deleteDocumentPayloads(){const root=await navigator.storage.getDirectory();try{await root.removeEntry(DIRECTORY,{recursive:true});}catch(e){if((e as DOMException).name!=='NotFoundError')throw e;}}

export async function pruneOldPayloads(keep:string[],candidates:string[]){if(!candidates.length)return;const allowed=new Set(keep),root=await navigator.storage.getDirectory(),dir=await root.getDirectoryHandle(DIRECTORY);for(const hash of new Set(candidates))if(!allowed.has(hash)&&/^[a-f0-9]{64}$/.test(hash))try{await dir.removeEntry(hash+'.json');}catch(e){if((e as DOMException).name!=='NotFoundError')throw e;}}
