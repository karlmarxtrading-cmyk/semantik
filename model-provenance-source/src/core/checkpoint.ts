import {checkpointReviver,validateCheckpointMetadata,validateCheckpointSegment} from './checkpoint-validation';
import {resolveBilingualBindings} from './bilingual';
import {validateOutputEncoding} from './encoding-policy';
import {Job,Document,sha256,VERSION} from './types';
import {sourcePlan,validateSourcePlan} from './source-plan';
import {buildZip,sourceArchiveEntries,checkPathSet,LIMITS} from './archive';
import {serializeJob,validateJobShape} from './storage';
import {hydrateDocument,parkDocument} from './document-store';
import {parseDocument,isLockedSegment} from './parser';
import {recheck,CHECKER} from './quality';
import {ZipReader,ZipWriter,BlobReader,BlobWriter,Uint8ArrayReader,Uint8ArrayWriter} from '@zip.js/zip.js';
const encode=(x:unknown)=>new TextEncoder().encode(JSON.stringify(x,(_k,v)=>v instanceof Uint8Array?{__bytes:Array.from(v)}:v));
const decode=(b:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b),checkpointReviver);
export async function exportCheckpoint(job:Job,options:{includeSources?:boolean}={}):Promise<Uint8Array|Blob>{
 validateJobShape(job);const snapshot=structuredClone(job);snapshot.schemaVersion=2;if(!snapshot.sourcePlan)snapshot.sourcePlan=sourcePlan(snapshot.documents);validateSourcePlan(snapshot);
 if(options.includeSources!==false&&!snapshot.documents.some(d=>d.payload)){
  const bytes=new TextEncoder().encode(serializeJob(snapshot)),manifest=encode({artifactKind:'translation-checkpoint',schemaVersion:1,sha256:await sha256(bytes),containsSourcePayloads:true,appVersion:VERSION});
  return buildZip([{path:'manifest.json',bytes:manifest},{path:'workspace.json',bytes}]);
 }
 const writer=new ZipWriter(new BlobWriter('application/zip'));const entries:{path:string;hash:string;bytes:number}[]=[];
 try{
  for(let i=0;i<snapshot.documents.length;i++){
   const document={...await hydrateDocument(snapshot.documents[i])};delete document.payload;delete document.hydrated;
   const saved=options.includeSources===false?withoutSource(document):document;
   const bytes=encode(saved),path=`documents/${String(i).padStart(6,'0')}.json`;
   if(bytes.length>64*1024*1024)throw new Error('Payload checkpoint satu dokumen melampaui 64 MiB');
   entries.push({path,hash:await sha256(bytes),bytes:bytes.length});await writer.add(path,new Uint8ArrayReader(bytes));
  }
  const metadata={...snapshot,documents:[]};const workspace=encode(metadata);await writer.add('workspace.json',new Uint8ArrayReader(workspace));
  const manifest=encode({artifactKind:'translation-checkpoint',schemaVersion:options.includeSources===false?3:2,appVersion:VERSION,containsSourcePayloads:options.includeSources!==false,workspaceHash:await sha256(workspace),documents:entries});await writer.add('manifest.json',new Uint8ArrayReader(manifest));
  const blob=await writer.close();if(blob.size>256*1024*1024)throw new Error('Checkpoint melampaui batas unduhan 256 MiB');return blob;
 }catch(e){try{await writer.close()}catch{}throw e;}
}
export async function revalidateDocument(old:Document,job:Job):Promise<Document>{
 if(!(old.bytes instanceof Uint8Array)||old.bytes.length>LIMITS.file||await sha256(old.bytes)!==old.hash)throw new Error(`Payload sumber rusak: ${old.path}`);
 if(typeof old.id!=='string'||typeof old.path!=='string'||typeof old.mappingConfirmed!=='boolean'||!['translate','passthrough','exclude'].includes(old.disposition))throw new Error('Metadata dokumen checkpoint tidak valid');
 if(old.path.endsWith('/'))return {id:old.id,path:old.path,bytes:old.bytes,hash:old.hash,encoding:'utf-8',bom:false,text:'',errors:[],directory:true,segments:[],profile:'DIRECTORY',mappingConfirmed:true,disposition:old.disposition==='exclude'?'exclude':'passthrough'};
 if(!/\.(txt|json)$/i.test(old.path))return {id:old.id,path:old.path,bytes:old.bytes,hash:old.hash,encoding:'utf-8',bom:false,text:'',errors:[],directory:false,profile:'UNSUPPORTED',segments:[],mappingConfirmed:old.mappingConfirmed,disposition:old.disposition};
 const fresh=await parseDocument(old.path,old.bytes,{legacyJsonStrings:old.parserVersion!=='parser-v2'});if(fresh.errors.length)throw new Error(fresh.errors.join('; '));
 if(!Array.isArray(old.segments))throw new Error('Daftar segmen checkpoint rusak');
 for(const prior of old.segments)validateCheckpointSegment(prior);
 const priorSegments=new Map(old.segments.map(s=>[s.id,s]));if(priorSegments.size!==old.segments.length)throw new Error('Pemetaan checkpoint berbeda');const freshIds=new Set(fresh.segments.map(s=>s.id));if(old.segments.some(s=>!freshIds.has(s.id)))throw new Error('Pemetaan checkpoint berbeda: segmen lama tidak dapat dibuang');const added=fresh.segments.filter(s=>!priorSegments.has(s.id));if(added.length&&(!job.versionLock||job.versionLock.appVersion===VERSION))throw new Error('Pemetaan checkpoint berbeda');
 for(const s of fresh.segments){const prior=priorSegments.get(s.id);if(!prior)continue;if(prior.selected&&isLockedSegment(fresh,s))throw new Error('Checkpoint memilih field MCQ terkunci: '+s.pointer);s.selected=prior.selected;s.modelReviews=prior.modelReviews?.map(r=>({...r,authority:'IMPORTED_UNVERIFIED'}));s.importedReviews=[...(prior.importedReviews||[]),{revision:prior.revision,target:prior.target,status:prior.status,findings:structuredClone(prior.findings),reviewer:prior.reviewer,reviewHash:prior.reviewHash,qaPolicyVersion:prior.qaPolicyVersion,authority:'UNTRUSTED_CHECKPOINT_HISTORY'}];
  if(prior.target!==undefined){if(typeof prior.target!=='string'||prior.target.length>100000||!Number.isSafeInteger(prior.revision))throw new Error('Target/revisi checkpoint tidak valid');s.target=prior.target;s.history=prior.history.length?structuredClone(prior.history):[{text:s.target,time:new Date().toISOString(),provenance:'checkpoint-import'}];s.historyAt=prior.history.length?prior.historyAt:0;s.revision=prior.revision+1;s.engine=prior.engine;recheck(s,job.direction,job.glossary,job.domain);}
 }
 if(old.headingPolicy&&!['LITERAL_STRUCTURE','LOCALIZED_DISPLAY_HEADINGS'].includes(old.headingPolicy))throw new Error('Policy heading checkpoint tidak didukung');
 fresh.bilingualBindings=old.bilingualBindings?.map(p=>({...p,approvedText:undefined,approvedRevision:undefined}));resolveBilingualBindings(fresh);
 validateOutputEncoding(old.outputEncoding);fresh.outputEncoding=old.outputEncoding;
 fresh.headingPolicy=old.headingPolicy;fresh.displayHeadingLanguage=old.displayHeadingLanguage;
 if(fresh.headingPolicy==='LOCALIZED_DISPLAY_HEADINGS'&&!['id','en'].includes(fresh.displayHeadingLanguage||''))throw new Error('Bahasa heading checkpoint tidak valid');
 fresh.mappingConfirmed=old.mappingConfirmed===true&&!added.length;if(added.length)fresh.warnings=[...(old.warnings||[]),`Parser menemukan ${added.length} span baru. Konfirmasi pemetaan ulang sebelum inferensi/ekspor. Hasil lama tetap tersedia.`];fresh.disposition=['translate','passthrough','exclude'].includes(old.disposition)?old.disposition:'translate';return fresh;
}
export async function restoreCheckpoint(blob:Blob,source?:Blob):Promise<Job>{
 if(blob.size>256*1024*1024)throw new Error('Checkpoint melebihi 256 MiB');
 const reader=new ZipReader(new BlobReader(blob),{checkSignature:true});
 try{
  const entries=await reader.getEntries();if(entries.length>2502)throw new Error('Terlalu banyak entri checkpoint');checkPathSet(entries.map(e=>e.filename));for(const e of entries){const mode=(e as any).unixMode??((e.externalFileAttributes>>>16)&0xffff);if((mode&0xf000)===0xa000||!['manifest.json','workspace.json'].includes(e.filename)&&!/^documents\/\d{6}\.json$/.test(e.filename)||e.encrypted||![0,8].includes(e.compressionMethod)||(e as any).diskNumberStart)throw new Error('Entri checkpoint tidak didukung: '+e.filename);}
  const read=async(path:string,cap:number)=>{const e=entries.find(e=>e.filename===path);if(!e||!('getData'in e)||e.directory||e.encrypted||e.uncompressedSize>cap)throw new Error('Entri checkpoint tidak valid: '+path);let count=0;const chunks:Uint8Array[]=[];await e.getData(new WritableStream<Uint8Array>({write(c){count+=c.length;if(count>cap)throw new Error('Batas inflate checkpoint');chunks.push(c);}}),{checkSignature:true});const bytes=new Uint8Array(count);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;};
  const manifest=decode(await read('manifest.json',2*1024*1024));
  if(manifest.artifactKind!=='translation-checkpoint'||![1,2,3].includes(manifest.schemaVersion)||!['0.1.0','0.2.0','0.3.0','0.4.0','0.5.0','0.6.0','0.7.0','0.8.0','0.9.0','0.10.0','0.10.1'].includes(manifest.appVersion)||manifest.containsSourcePayloads!==(manifest.schemaVersion!==3))throw new Error('Versi atau kontrak checkpoint tidak valid');
  if(manifest.schemaVersion===3&&!source)throw new Error('SOURCE_ZIP_REQUIRED: pilih ulang ZIP sumber asli');
  let job:Job;
  if(manifest.schemaVersion===1){
   if(entries.length!==2)throw new Error('Isi checkpoint tidak sesuai kontrak');const bytes=await read('workspace.json',256*1024*1024);if(await sha256(bytes)!==manifest.sha256)throw new Error('Versi atau hash checkpoint tidak valid');job=decode(bytes);validateJobShape(job);validateCheckpointMetadata(job);if(!job.versionLock)job.versionLock={appVersion:manifest.appVersion,modelFingerprint:job.fingerprint};validateSourcePlan(job);checkPathSet(job.documents.map(d=>d.path));for(let i=0;i<job.documents.length;i++)job.documents[i]=await revalidateDocument(job.documents[i],job);
  }else{
   if(!Array.isArray(manifest.documents)||manifest.documents.length>2500||entries.length!==manifest.documents.length+2)throw new Error('Manifest dokumen checkpoint tidak valid');
   const bytes=await read('workspace.json',4*1024*1024);if(await sha256(bytes)!==manifest.workspaceHash)throw new Error('Hash workspace checkpoint tidak valid');job=decode(bytes);validateJobShape(job);validateCheckpointMetadata(job);if(!job.versionLock)job.versionLock={appVersion:manifest.appVersion,modelFingerprint:job.fingerprint};if(job.documents.length)throw new Error('Workspace v2 harus berupa indeks tanpa payload');let expanded=0;
   for(let i=0;i<manifest.documents.length;i++){const item=manifest.documents[i];if(item.path!==`documents/${String(i).padStart(6,'0')}.json`||!Number.isSafeInteger(item.bytes)||item.bytes<0)throw new Error('Path/ukuran dokumen checkpoint tidak valid');expanded+=item.bytes;if(expanded>1024*1024*1024)throw new Error('Payload checkpoint melebihi 1 GiB');const payload=await read(item.path,64*1024*1024);if(payload.length!==item.bytes||await sha256(payload)!==item.hash)throw new Error('Hash dokumen checkpoint tidak cocok');const old=decode(payload);if(manifest.schemaVersion===3){if('bytes'in old||'text'in old||'payload'in old)throw new Error('Kontrak checkpoint tanpa sumber tidak valid');job.documents.push(old);}else await addRestoredDocument(job,await revalidateDocument(old,job));}
   if(manifest.schemaVersion===3){
    checkPathSet(job.documents.map(d=>d.path));validateSourcePlan(job);if(!job.sourcePlan)throw new Error('Plan sumber checkpoint tidak valid');
    const originals=new Map(job.documents.map(d=>[d.path,d]));const restored=new Map<string,Document>();
    for await(const entry of sourceArchiveEntries(source!)){
     const old=originals.get(entry.path);if(!old||!!old.directory!==entry.directory||await sha256(entry.bytes)!==old.hash)throw new Error('ZIP sumber tidak cocok: '+entry.path);
     const document=await revalidateDocument({...old,bytes:entry.bytes},job);const parked=typeof navigator!=='undefined'&&typeof navigator.storage?.getDirectory==='function'?await parkDocument(document):document;
     restored.set(entry.path,parked);originals.delete(entry.path);
    }
    if(originals.size)throw new Error('ZIP sumber tidak lengkap: '+[...originals.keys()][0]);
    job.documents=job.documents.map(d=>restored.get(d.path)!);if(job.documents.reduce((n,d)=>n+d.segments.length,0)>LIMITS.segments)throw new Error('Pemulihan besar memerlukan OPFS; workspace aktif belum diganti');
   }
   checkPathSet(job.documents.map(d=>d.path));validateSourcePlan(job);
  }
  if(!job.versionLock)job.versionLock={appVersion:manifest.appVersion,modelFingerprint:job.fingerprint};if(!job.sourcePlan)job.sourcePlan=sourcePlan(job.documents);job.schemaVersion=2;job.qaPolicyVersion=CHECKER;job.state='PAUSED';job.revision++;job.log.push({time:new Date().toISOString(),action:'RESTORE',detail:'Source/plan diurai ulang. Approval dan pengecualian QA eksternal direset; hash internal bukan bukti otoritas reviewer.'});return job;
 }finally{await reader.close();}
}

function withoutSource(d:Document){
 const {bytes,text,payload,hydrated,...metadata}=d;
 return {...metadata,segments:d.segments.map(s=>{const {source,context,jsonContainer,...state}=s;return state;})};
}
async function addRestoredDocument(job:Job,document:Document){
 if(typeof navigator!=='undefined'&&typeof navigator.storage?.getDirectory==='function')job.documents.push(await parkDocument(document));
 else{job.documents.push(document);if(job.documents.reduce((n,d)=>n+d.segments.length,0)>LIMITS.segments)throw new Error('Pemulihan besar memerlukan OPFS; workspace aktif belum diganti');}
}
/** This hint chooses the UI flow only. restoreCheckpoint still validates every payload and hash. */
export async function checkpointNeedsSource(blob:Blob):Promise<boolean>{
 if(blob.size>256*1024*1024)throw new Error('Checkpoint melebihi 256 MiB');
 const reader=new ZipReader(new BlobReader(blob),{checkSignature:true});
 try{const entries=await reader.getEntries();if(entries.length>2502)throw new Error('Terlalu banyak entri checkpoint');checkPathSet(entries.map(e=>e.filename));const e=entries.find(e=>e.filename==='manifest.json');if(!e||!('getData'in e)||e.directory||e.encrypted||e.uncompressedSize>2*1024*1024)throw new Error('Manifest checkpoint tidak valid');let count=0;const parts:Uint8Array[]=[];await e.getData(new WritableStream<Uint8Array>({write(b){count+=b.length;if(count>2*1024*1024)throw new Error('Manifest checkpoint tidak valid');parts.push(b);}}),{checkSignature:true});const bytes=new Uint8Array(count);let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}const m=decode(bytes);return m.artifactKind==='translation-checkpoint'&&m.schemaVersion===3&&m.containsSourcePayloads===false;
 }finally{await reader.close();}
}
