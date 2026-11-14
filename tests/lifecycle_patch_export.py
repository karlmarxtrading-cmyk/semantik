from pathlib import Path
p=Path('cp18/app/app/export.js');s=p.read_text()
s="import {BUILD_INFO} from './build-info.js';\n"+s
s=s.replace("function escapeMarkdownText(value)", "export function summarizeBlocks(blocks){\n  const counts={total:blocks.length,translated:0,preserved:0,rejected:0,failed:0,pending:0};\n  for(const b of blocks){if(!hasTarget(b))counts.pending++;else if(b.outcome==='failed')counts.failed++;else if(b.outcome==='rejected'||b.sourcePreserved)counts.rejected++;else if(b.status==='preserved')counts.preserved++;else counts.translated++;}\n  return counts;\n}\nconst friendlyIssue=message=>/PROTECTED_MARKER|\\bstack\\b|\\bat .*\\.(?:js|mjs)|^Error:/i.test(message)?'Kandidat gagal pemeriksaan; sumber tetap tersedia. Coba ulang atau periksa bagian ini; diagnosis teknis ada pada laporan QA.':message;\nfunction escapeMarkdownText(value)")
s=s.replace("function blockText(block,text,withAssets) {\n  if(block.type==='formula'||block.type==='table') {", """function blockText(block,text,withAssets) {
  if(block.type==='table' && Array.isArray(block.rows) && !hasSourceCorrection(block)){
    const rows=text===block.target&&Array.isArray(block.translatedRows)?block.translatedRows:block.rows;
    const width=Math.max(1,...rows.map(row=>row.length));
    const rowText=row=>'| '+Array.from({length:width},(_,i)=>oneLine(row[i]??'')).join(' | ')+' |';
    return [rowText(rows[0]||[]),'| '+Array(width).fill('---').join(' | ')+' |',...rows.slice(1).map(rowText)].join('\\n')+(withAssets&&safePath(block.assetPath)?`\\n\\n![Tabel sumber, halaman ${block.page}](${block.assetPath})`:'');
  }
  if(block.type==='formula'||block.type==='table') {""")
s=s.replace("else value+=`\\n\\n> Representasi visual ${block.type==='formula'?'rumus':'tabel'} tersedia pada PDF sumber atau paket ZIP lengkap.`;", "")
s=s.replace("else if(block.sourcePreserved)lines.push('KANDIDAT DITOLAK: teks sumber dipertahankan untuk koreksi.');", "else if(block.outcome==='failed')lines.push('PEMROSESAN GAGAL: teks sumber dipertahankan. Gunakan Lanjutkan untuk mencoba ulang.');\n  else if(block.sourcePreserved)lines.push('KANDIDAT DITOLAK: teks sumber dipertahankan. Coba ulang atau koreksi bagian ini.');")
s=s.replace("else if(block.status==='preserved')lines.push('Sumber dipertahankan (elemen ilmiah, referensi, atau bahasa sudah sesuai).');", "")
s=s.replace("if(issues(block).length)lines.push(...issues(block));", "if(issues(block).length)lines.push(...[...new Set(issues(block).map(friendlyIssue))]);")
s=s.replace("const done=doc.blocks.filter(b=>hasTarget(b)).length;\n  const title=kind==='source'?'Jurnal — Ekstraksi Sumber':kind==='translation'?'Jurnal — Terjemahan':'Jurnal — Sumber & Terjemahan';", "const counts=summarizeBlocks(doc.blocks), done=counts.translated+counts.preserved;\n  const documentTitle=doc.metadata?.title?.trim()||String(job.file?.name||doc.fileName||'Jurnal').replace(/\\.pdf$/i,'');\n  const title=oneLine(documentTitle)+' — '+(kind==='source'?'Ekstraksi Sumber':kind==='translation'?'Terjemahan':'Sumber & Terjemahan');")
s=s.replace("(${done}/${doc.blocks.length} bagian diproses).`,", "`,\n    `**Bagian:** ${counts.translated} diterjemahkan; ${counts.preserved} dipertahankan sengaja; ${counts.rejected} ditolak; ${counts.failed} gagal; ${counts.pending} belum diproses. Total ${counts.total}.`,\n    `**Rilis:** ${oneLine((job.build||BUILD_INFO).release)} · ${oneLine((job.build||BUILD_INFO).version)}.`,")
s=s.replace("if(doc.metadata?.title)out.push", "if(job.sourceSha256)out.push(`**SHA-256 PDF sumber:** ${oneLine(job.sourceSha256)}`,'');\n  if(doc.metadata?.title)out.push")
s=s.replace("const doc=validatedDocument(job),blocks=doc.blocks,done=blocks.filter(b=>hasTarget(b)).length;", "const doc=validatedDocument(job),blocks=doc.blocks,counts=summarizeBlocks(blocks),done=counts.translated+counts.preserved;")
s=s.replace("`- Bagian sumber: ${blocks.length}.`, `- Bagian diproses: ${done}.`,", "`- Bagian sumber: ${blocks.length}.`, `- Diterjemahkan: ${counts.translated}; dipertahankan sengaja: ${counts.preserved}; ditolak: ${counts.rejected}; gagal: ${counts.failed}; belum diproses: ${counts.pending}.`,\n    `- Rilis: ${oneLine((job.build||BUILD_INFO).release)}; hash source build: ${oneLine((job.build||BUILD_INFO).sourceHash)}.`,\n    `- SHA-256 PDF sumber: ${oneLine(job.sourceSha256||'belum dihitung')}.`,")
s=s.replace("rows.push(...issues(b).map(x=>`- Catatan: ${markdownText(x)}`));", "rows.push(...issues(b).map(x=>`- Catatan: ${markdownText(x)}`));\n    if(b.diagnostics?.length)rows.push('- Diagnosis teknis (bukan isi terjemahan):',verbatim(JSON.stringify(b.diagnostics,null,2)));\n    if(b.outcome)rows.push(`- Kategori hasil: ${oneLine(b.outcome)}; dapat dicoba ulang: ${b.retryable?'ya':'tidak'}.`);")
a=s.index('async function hash(')
s=s[:a]+'''const aborted=signal=>{if(signal?.aborted)throw new DOMException('Ekspor dibatalkan.','AbortError');};
const yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0));
async function hash(blob,signal){aborted(signal);const bytes=await blob.arrayBuffer();aborted(signal);const result=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');aborted(signal);return result;}
async function zipLibrary(){await import('../vendor/export/jszip.min.js');if(!globalThis.JSZip)throw new Error('Penyusun ZIP tidak dapat dimuat.');return globalThis.JSZip;}
function generateZip(zip,onProgress,signal){
  aborted(signal);
  return new Promise((resolve,reject)=>{
    const chunks=[];let settled=false;
    const stream=zip.generateInternalStream({type:'uint8array',compression:'STORE',streamFiles:true});
    const cleanup=()=>signal?.removeEventListener('abort',cancel);
    const cancel=()=>{if(settled)return;settled=true;stream.pause();chunks.length=0;cleanup();reject(new DOMException('Ekspor dibatalkan.','AbortError'));};
    signal?.addEventListener('abort',cancel,{once:true});
    stream.on('data',(chunk,metadata)=>{if(settled)return;chunks.push(chunk);onProgress(50+metadata.percent/2);if(signal?.aborted)cancel();});
    stream.on('error',error=>{if(settled)return;settled=true;chunks.length=0;cleanup();reject(error);});
    stream.on('end',()=>{if(settled)return;settled=true;cleanup();resolve(new Blob(chunks,{type:'application/zip'}));chunks.length=0;});
    if(signal?.aborted)cancel();else stream.resume();
  });
}
export async function createZip(job,onProgress=()=>{},{signal}={}) {
  const doc=validatedDocument(job);aborted(signal);
  if(!(job.file instanceof Blob)||!job.file.size)throw new Error('PDF sumber tidak tersedia. Buka kembali PDF sebelum membuat paket lengkap.');
  const header=new TextDecoder('latin1').decode(await job.file.slice(0,1024).arrayBuffer());aborted(signal);
  if(!/^(?:\\s|\\u00EF\\u00BB\\u00BF)*%PDF-\\d\\.\\d\\b/.test(header))throw new Error('Berkas sumber bukan PDF yang valid.');
  const assets=doc.assets||[],available=new Set();let assetBytes=0;
  for(const asset of assets){if(!safePath(asset.path)||!(asset.blob instanceof Blob)||available.has(asset.path))throw new Error('Aset ekspor tidak valid atau berulang.');available.add(asset.path);assetBytes+=asset.blob.size;}
  if(assetBytes>128*1024*1024)throw new Error('Aset dokumen melebihi batas 128 MiB. Gunakan PDF yang lebih pendek; progres tetap tersedia.');
  for(const item of [...doc.pages,...doc.blocks])for(const key of ['imagePath','assetPath','pageImagePath'])if(item[key]&&(!safePath(item[key])||!available.has(item[key])))throw new Error('Referensi aset visual hilang atau tidak valid.');
  const JSZip=await zipLibrary();aborted(signal);const zip=new JSZip();const total=assetBytes+job.file.size;
  if(total>260*1024*1024)throw new Error('Paket terlalu besar untuk disusun dengan aman di browser. Gunakan dokumen yang lebih pendek.');
  job={...job,build:job.build||BUILD_INFO,sourceSha256:await hash(job.file,signal)};
  const hashes=[],seen=new Set();
  async function add(path,blob){aborted(signal);if(seen.has(path))throw new Error('Nama aset ekspor berulang.');seen.add(path);zip.file(path,blob);hashes.push(`${await hash(blob,signal)}  ${path}`);await yieldTask();aborted(signal);}
  for(const kind of Object.keys(FILES))await add(FILES[kind],new Blob([createMarkdown(job,kind,{withAssets:true})],{type:'text/markdown;charset=utf-8'}));
  await add('LAPORAN_QA.md',new Blob([createQaReport(job)],{type:'text/markdown;charset=utf-8'}));
  await add('LEDGER_BAGIAN.csv',new Blob(['\\uFEFF'+createLedger(job)],{type:'text/csv;charset=utf-8'}));
  await add('JURNAL_SUMBER.pdf',job.file);
  const metadata={schemaVersion:2,build:job.build,sourceSha256:job.sourceSha256,configuration:job.config,counts:summarizeBlocks(doc.blocks),semanticVerified:false,humanApproval:false,generatedAt:new Date().toISOString()};
  await add('EXPORT_METADATA.json',new Blob([JSON.stringify(metadata,null,2)],{type:'application/json'}));
  await add('PROVENANCE.json',new Blob([JSON.stringify({metadata,pages:doc.pages.map(({blocks,...page})=>page),blocks:doc.blocks,recoveredCorrections:doc.recoveredCorrections||[]},null,2)],{type:'application/json'}));
  for(let i=0;i<assets.length;i++){await add(assets[i].path,assets[i].blob);onProgress(i/Math.max(1,assets.length)*50);}
  zip.file('SHA256SUMS.txt',hashes.join('\\n')+'\\n');
  zip.file('BACA_DULU.txt','SEMANTIK SETARA — HASIL JURNAL PDF\\n\\nBuka JURNAL_TERJEMAHAN.md atau JURNAL_BILINGUAL.md dengan editor Markdown.\\nPertahankan folder assets di sebelah dokumen agar gambar terbaca.\\nJURNAL_SUMBER.pdf adalah PDF asli; kata sandi PDF tidak disimpan.\\nRumus dipertahankan sebagai teks literal; ini bukan rekonstruksi LaTeX.\\nLAPORAN_QA.md dan LEDGER_BAGIAN.csv menjelaskan bagian gagal, ditolak, atau perlu diperiksa.\\nEXPORT_METADATA.json memuat identitas build/model/sumber dan konfigurasi. PROVENANCE.json mempertahankan sumber, koreksi, hasil, identitas, dan diagnosis.\\nSHA256SUMS.txt memuat hash dokumen/aset utama.\\nPaket tidak dapat diimpor kembali sebagai dokumen; aplikasi hanya menerima PDF. Progres dilanjutkan dari penyimpanan browser yang sama.\\nTerjemahan mesin memerlukan tinjauan ilmiah.\\n');
  return generateZip(zip,onProgress,signal);
}
export async function exportDocument(job,kind,onProgress=()=>{},{signal}={}) {
  aborted(signal);job={...job,build:job.build||BUILD_INFO};
  if(kind!=='zip'&&job.file instanceof Blob)job.sourceSha256=await hash(job.file,signal);
  const blob=kind==='zip'?await createZip(job,onProgress,{signal}):new Blob([createMarkdown(job,kind)],{type:'text/markdown;charset=utf-8'});
  aborted(signal);const filename=kind==='zip'?'JURNAL_HASIL_LENGKAP.zip':FILES[kind];
  if(!filename)throw new Error('Format unduhan tidak dikenal.');
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  try{aborted(signal);document.body.append(anchor);anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  return {blob,filename};
}
'''
p.write_text(s)
