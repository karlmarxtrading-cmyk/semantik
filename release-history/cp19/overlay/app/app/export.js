import {inlineMathSpans,formulaLatex} from './markdown-math.js';
import {BUILD_INFO} from './build-info.js';
import {markRepeatedMetadata} from './layout.js';
/* Markdown is serialized as text; no source HTML is executed or exported raw. */
const FILES = {source:'JURNAL_ASLI.md',translation:'JURNAL_TERJEMAHAN.md',bilingual:'JURNAL_BILINGUAL.md'};
const issues = block => [...new Set((block.issues || []).map(x=>typeof x==='string'?x:String(x.message || x.code || 'Perlu ditinjau.')))];
const originalText = block => typeof block.originalText==='string'?block.originalText:block.text;
const hasSourceCorrection = block => typeof block.originalText==='string' && block.originalText!==block.text;
const hasTarget = block => typeof block.target==='string' && (block.target.trim().length>0 || !String(block.text ?? '').trim());
export function summarizeBlocks(blocks){
  const counts={total:blocks.length,translated:0,preserved:0,rejected:0,failed:0,pending:0};
  for(const b of blocks){if(!hasTarget(b))counts.pending++;else if(b.outcome==='failed')counts.failed++;else if(b.outcome==='rejected'||b.sourcePreserved)counts.rejected++;else if(b.status==='preserved')counts.preserved++;else counts.translated++;}
  return counts;
}
const friendlyIssue=message=>/PROTECTED_MARKER|\bstack\b|\bat .*\.(?:js|mjs)|^Error:/i.test(message)?'Kandidat gagal pemeriksaan; sumber tetap tersedia. Coba ulang atau periksa bagian ini; diagnosis teknis ada pada laporan QA.':message;
function escapeMarkdownText(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/([\\`$*_{}\[\]()#!|~])/g,'\\$1')
    // PDF prose is literal text, not author-supplied Markdown. Escape block
    // syntax at every physical line start (also protects setext/HR markers).
    .replace(/^([ ]{0,3})([-+])/gm,'$1\\$2')
    .replace(/^([ ]{0,3})(\d{1,9})\.(?=[ \t]|$)/gm,'$1$2\\.')
    .replace(/^([ ]{0,3})=(?=[= \t]*$)/gm,'$1\\=')
    // Entity-encode indentation so Markdown cannot reinterpret literal prose
    // as code and expose the protective backslashes as visible characters.
    .replace(/^[ \t]+/gm,prefix=>prefix.replace(/ /g,'&#32;').replace(/\t/g,'&#9;'));
}
function inlineLiteral(text) {
  let fence='`';while(text.includes(fence))fence+='`';
  return fence+' '+text+' '+fence;
}
export function markdownText(value) {
  const text=String(value ?? '');let output='',offset=0;
  for(const span of inlineMathSpans(text)){
    if(span.start<offset)continue;
    output+=escapeMarkdownText(text.slice(offset,span.start))+(span.display?'\n\n$$\n'+span.latex+'\n$$\n\n':'$'+span.latex+'$');offset=span.end;
  }
  return output+escapeMarkdownText(text.slice(offset));
}
const oneLine = text => escapeMarkdownText(String(text ?? '').replace(/[\r\n]+/g,' '));
const safePath = path => typeof path==='string' && path.length<=180 && /^assets\/[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpe?g|webp)$/i.test(path);
function validatedDocument(job) {
  const doc=job?.document;
  if(!Array.isArray(doc?.blocks)||!Array.isArray(doc?.pages)||!doc.pages.length)throw new Error('Dokumen belum diekstraksi.');
  if(!Number.isInteger(doc.numPages)||doc.numPages<1)throw new Error('Jumlah halaman dokumen tidak valid.');
  const pages=new Set();
  for(const page of doc.pages){if(!Number.isInteger(page.number)||page.number<1||page.number>doc.numPages||pages.has(page.number))throw new Error('Identitas halaman dokumen tidak valid.');pages.add(page.number);}
  for(const block of doc.blocks)if(!pages.has(block.page))throw new Error('Bagian dokumen tidak memiliki halaman sumber yang valid.');
  return doc;
}
function verbatim(text) {
  let fence='```';while(String(text).includes(fence))fence+='`';
  return `${fence}text\n${text || ''}\n${fence}`;
}
function blockText(block,text,withAssets) {
  if(block.type==='table' && Array.isArray(block.rows) && !hasSourceCorrection(block) && !block.tableTextEdited && !(text===block.target&&(block.status==='edited'||block.editedAt)) && (text===block.text||text===originalText(block)||text===block.target&&Array.isArray(block.translatedRows))){
    const rows=text===block.target&&Array.isArray(block.translatedRows)?block.translatedRows:block.rows;
    const width=Math.max(1,...rows.map(row=>row.length));
    const rowText=row=>'| '+Array.from({length:width},(_,i)=>markdownText(String(row[i]??'').replace(/[\r\n]+/g,' ')).replace(/\|/g,'&#124;')).join(' | ')+' |';
    return [rowText(rows[0]||[]),'| '+Array(width).fill('---').join(' | ')+' |',...rows.slice(1).map(rowText)].join('\n')+(withAssets&&safePath(block.assetPath)?`\n\n![Tabel sumber, halaman ${block.page}](${block.assetPath})`:'');
  }
  if(block.type==='formula'){
    const formula=formulaLatex(block,text);
    if(formula)return '$$\n'+formula.latex+'\n$$';
    return '> RUMUS BELUM TERVERIFIKASI — representasi sumber dipertahankan; tidak ada rekonstruksi yang ditebak.\n\n'+markdownText(text)+(withAssets&&safePath(block.assetPath||block.pageImagePath)?`\n\n![Rumus sumber, halaman ${block.page}](${block.assetPath||block.pageImagePath})`:'\n\n> Citra tidak tersedia dalam pekerjaan ini; gunakan PDF sumber.');
  }
  if(block.type==='table') {
    let value=(hasSourceCorrection(block)&&text===block.text?'> Teks sumber dikoreksi pengguna; citra tetap berasal dari PDF asli.\n\n':'')+verbatim(text);
    if(withAssets&&safePath(block.assetPath))value+=`\n\n![${block.type==='formula'?'Rumus':'Tabel'} pada PDF asli, halaman ${block.page}](${block.assetPath})`;
    
    return value;
  }
  if(block.type==='image')return withAssets&&safePath(block.assetPath || block.pageImagePath)
    ?`![Elemen visual sumber, halaman ${block.page}](${block.assetPath || block.pageImagePath})`
    :`> Elemen visual sumber pada halaman ${block.page}. Gunakan PDF asli atau paket ZIP lengkap untuk melihatnya.`;
  if(block.type==='heading')return `### ${oneLine(text)}`;
  return markdownText(text);
}
function sectionStatus(block,kind) {
  if(kind==='source')return hasSourceCorrection(block)?'> Bagian ini memiliki koreksi sumber oleh pengguna'+(block.sourceEditedAt?' pada '+oneLine(block.sourceEditedAt):'')+'. Dokumen ini mempertahankan ekstraksi asli; sumber terkoreksi ditampilkan dalam dokumen bilingual.\n\n':'';
  const lines=[];
  if(block.resultBuild?.release&&block.resultBuild.release!==BUILD_INFO.release)lines.push('Hasil ini dipulihkan dari rilis '+block.resultBuild.release+'; bukan inferensi baru pada rilis eksportir.');
  if(hasSourceCorrection(block))lines.push('Terjemahan menggunakan sumber yang dikoreksi pengguna'+(block.sourceEditedAt?' pada '+block.sourceEditedAt:'')+'.');
  if(!hasTarget(block))lines.push('BELUM DITERJEMAHKAN: teks sumber dipertahankan.');
  else if(block.outcome==='failed')lines.push('PEMROSESAN GAGAL: teks sumber dipertahankan. Gunakan Lanjutkan untuk mencoba ulang.');
  else if(block.sourcePreserved)lines.push('KANDIDAT DITOLAK: teks sumber dipertahankan. Coba ulang atau koreksi bagian ini.');
  
  if(block.userReviewed)lines.push('Ditandai telah ditinjau oleh pengguna; tanda ini bukan verifikasi otomatis.');
  if(block.editedAt)lines.push('Hasil diedit pengguna.');
  if(issues(block).length)lines.push(...[...new Set(issues(block).map(friendlyIssue))]);
  return lines.length?lines.map(line=>`> ${markdownText(line)}`).join('\n')+'\n\n':'';
}
export function createMarkdown(job,kind,{withAssets=false}={}) {
  if(!Object.hasOwn(FILES,kind))throw new Error('Format dokumen tidak dikenal.');
  const doc=markRepeatedMetadata(validatedDocument(job));
  const counts=summarizeBlocks(doc.blocks), done=counts.translated+counts.preserved;
  const documentTitle=doc.metadata?.title?.trim()||String(job.file?.name||doc.fileName||'Jurnal').replace(/\.pdf$/i,'');
  const title=oneLine(documentTitle)+' — '+(kind==='source'?'Ekstraksi Sumber':kind==='translation'?'Terjemahan':'Sumber & Terjemahan');
  const out=[`# ${title}`,'',`**Berkas sumber:** ${oneLine(job.file?.name || doc.fileName)}`,`**Halaman:** ${doc.numPages}`,`**Bahasa:** ${oneLine(doc.sourceLanguage || job.config?.source || 'belum ditetapkan')} → ${oneLine(doc.targetLanguage || job.config?.target || 'belum ditetapkan')}`,
    `**Status:** ${job.status==='complete'&&done===doc.blocks.length&&doc.pages.length===doc.numPages?'Pemrosesan selesai; perlu peninjauan ilmiah':'HASIL SEMENTARA — pemrosesan belum selesai'} `,
    `**Bagian:** ${counts.translated} diterjemahkan; ${counts.preserved} dipertahankan sengaja; ${counts.rejected} ditolak; ${counts.failed} gagal; ${counts.pending} belum diproses. Total ${counts.total}.`,
    `**Rilis eksportir:** ${oneLine((job.build||BUILD_INFO).release)} · ${oneLine((job.build||BUILD_INFO).version)}.`,
    '**Metode:** ekstraksi PDF/OCR dan terjemahan mesin lokal. Tidak ada klaim verifikasi semantik menyeluruh.',''];
  if(job.sourceSha256)out.push(`**SHA-256 PDF sumber:** ${oneLine(job.sourceSha256)}`,'');
  if(doc.metadata?.title)out.push(`**Judul metadata PDF:** ${oneLine(doc.metadata.title)}`,'');
  if(doc.metadata?.author)out.push(`**Penulis metadata PDF:** ${oneLine(doc.metadata.author)}`,'');
  out.push(withAssets?(job.file instanceof Blob?'PDF asli dan aset visual yang tersedia disertakan dalam paket ini.':'Aset visual yang tersedia disertakan; PDF asli tidak tersedia dalam pekerjaan ini.'):'Ekspor teks internal; gunakan unduhan Markdown utama untuk menyertakan gambar sumber dalam satu berkas.','');
  for(const page of doc.pages) {
    out.push(`## Halaman ${page.number}`,'');
    if(page.source==='ocr'||page.source==='mixed')out.push('> Teks halaman ini melibatkan OCR. Periksa ejaan, simbol, dan angka terhadap sumber.','');
    for(const block of doc.blocks.filter(b=>b.page===page.number)){
      if(kind!=='source'&&block.runningMetadata&&!block.runningMetadata.firstOccurrence)continue;
      if(kind!=='source'&&block.runningMetadata)out.push(`> Metadata tepi halaman berulang pada halaman ${block.runningMetadata.pages.join(', ')}; ditampilkan sekali. Semua kemunculan tetap ada pada sumber dan provenance.`,'');
      out.push(`<!-- bagian: ${String(block.id).replace(/[^A-Za-z0-9_-]/g,'')} | halaman: ${block.page} -->`,'');
      if(kind==='bilingual') {
        if(hasSourceCorrection(block))out.push('**Ekstraksi asli sebelum koreksi**','',blockText(block,originalText(block),withAssets),'','**Sumber setelah koreksi pengguna**','',blockText(block,block.text,withAssets),'');
        else out.push('**Sumber**','',blockText(block,block.text,withAssets),'');
        out.push('**Terjemahan / hasil**','',sectionStatus(block,kind)+blockText(block,hasTarget(block)?block.target:block.text,withAssets),'');
      } else out.push(sectionStatus(block,kind)+blockText(block,kind==='source'?originalText(block):hasTarget(block)?block.target:block.text,withAssets),'');
    }
    if(withAssets&&safePath(page.imagePath))out.push(`#### Citra sumber — halaman ${page.number}`,'',`![Halaman sumber ${page.number}](${page.imagePath})`,'');
  }
  if(doc.warnings?.length)out.push('## Catatan pembacaan','',...[...new Set(doc.warnings)].map(x=>`- ${markdownText(typeof x==='string'?x:x.message || 'Perlu ditinjau.')}`),'');
  out.push('---','','Dibuat dengan Semantik Setara — Academic PDF Translator. Teks sumber, hasil mesin, dan koreksi pengguna dipisahkan secara eksplisit.','');
  return out.join('\n');
}
export function createQaReport(job) {
  const doc=validatedDocument(job),blocks=doc.blocks,counts=summarizeBlocks(blocks),done=counts.translated+counts.preserved;
  const withIssues=blocks.filter(b=>issues(b).length || !hasTarget(b) || b.sourcePreserved || hasSourceCorrection(b));
  const rows=[ '# CATATAN PEMERIKSAAN JURNAL','',`Berkas: ${oneLine(job.file?.name || doc.fileName)}`,'',
    `- Status pekerjaan: ${oneLine(job.status)}.`,
    `- Halaman terdata: ${doc.pages.length}/${doc.numPages}.`,
    `- Bagian sumber: ${blocks.length}.`, `- Diterjemahkan: ${counts.translated}; dipertahankan sengaja: ${counts.preserved}; ditolak: ${counts.rejected}; gagal: ${counts.failed}; belum diproses: ${counts.pending}.`,
    `- Rilis: ${oneLine((job.build||BUILD_INFO).release)}; hash source build: ${oneLine((job.build||BUILD_INFO).sourceHash)}.`,
    `- SHA-256 PDF sumber: ${oneLine(job.sourceSha256||'belum dihitung')}.`,
    `- Bagian dengan catatan atau belum diproses: ${withIssues.length}.`,
    `- Bagian dengan koreksi sumber oleh pengguna: ${blocks.filter(hasSourceCorrection).length}.`,
    `- Item teks ekstraksi yang terlacak: ${doc.coveredItemCount ?? '?'} / ${doc.sourceItemCount ?? '?'}.`,
    '- Verifikasi semantik manusia: TIDAK DILAKUKAN OLEH APLIKASI.',
    '- Pemeriksaan otomatis menilai beberapa invariansi struktur, angka, dan identitas ilmiah. Lulus pemeriksaan tidak membuktikan semua makna ilmiah benar.',
    '- Struktur rumus yang didukung diekspor sebagai LaTeX; struktur yang tidak andal diberi label belum terverifikasi dan citra sumber.',
    '- Citra halaman yang berhasil dibaca disertakan dalam paket ZIP. PDF asli memungkinkan pemeriksaan ulang bagian visual dan susunan.','',
    '## Pemeriksaan per bagian',''];
  for(const b of blocks){
    rows.push(`### ${oneLine(b.id)} — halaman ${b.page}`,'',
      `- Jenis: ${oneLine(b.type)}.`, `- Status: ${oneLine(hasTarget(b)?b.status || 'diproses':'belum diproses')}.`,
      `- Sumber dipertahankan setelah penolakan kandidat: ${b.sourcePreserved?'ya':'tidak'}.`,
      `- Tinjauan manual ditandai pengguna: ${b.userReviewed?'ya':'belum'}.`);
    if(hasSourceCorrection(b))rows.push('- Sumber dikoreksi pengguna; ekstraksi asli tetap tersimpan dan disertakan dalam JURNAL_ASLI.md serta dokumen bilingual.');
    if(b.sourceEditedAt)rows.push(`- Waktu koreksi sumber: ${oneLine(b.sourceEditedAt)}.`);
    if(b.editedAt)rows.push(`- Diedit pengguna: ${oneLine(b.editedAt)}.`);
    rows.push(...issues(b).map(x=>`- Catatan: ${markdownText(x)}`));
    if(b.diagnostics?.length)rows.push('- Diagnosis teknis (bukan isi terjemahan):',verbatim(JSON.stringify(b.diagnostics,null,2)));
    if(b.outcome)rows.push(`- Kategori hasil: ${oneLine(b.outcome)}; dapat dicoba ulang: ${b.retryable?'ya':'tidak'}.`);
    if(!hasTarget(b))rows.push('- Bagian ini belum diterjemahkan; ekspor menggunakan teks sumber dengan label eksplisit.');
    rows.push('');
  }
  if(doc.warnings?.length)rows.push('## Catatan halaman','',...doc.warnings.map(x=>`- ${markdownText(typeof x==='string'?x:x.message)}`),'');
  return rows.join('\n');
}
function csvCell(value){const text=String(value ?? '');return '"'+(/^[\t\r\n]|^[\s\uFEFF]*[=+@-]/u.test(text)?"'":'')+text.replaceAll('"','""')+'"';}
export function createLedger(job) {
  validatedDocument(job);
  return [['id','halaman','jenis','sumber','bbox','status','item_sumber','catatan','ditinjau_pengguna','diubah_pengguna','sumber_dikoreksi','waktu_koreksi_sumber'],
    ...job.document.blocks.map(b=>[b.id,b.page,b.type,b.source,(b.bbox||[]).join(' '),hasTarget(b)?b.status||'diproses':'belum diproses',(b.sourceItemIds||[]).join(' '),issues(b).join(' | '),Boolean(b.userReviewed),b.editedAt||'',hasSourceCorrection(b),b.sourceEditedAt||''])]
    .map(row=>row.map(csvCell).join(',')).join('\r\n');
}
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Ekspor dibatalkan.','AbortError');};
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
  if(!/^(?:\s|\u00EF\u00BB\u00BF)*%PDF-\d\.\d\b/.test(header))throw new Error('Berkas sumber bukan PDF yang valid.');
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
  await add('LEDGER_BAGIAN.csv',new Blob(['\uFEFF'+createLedger(job)],{type:'text/csv;charset=utf-8'}));
  await add('JURNAL_SUMBER.pdf',job.file);
  const metadata={schemaVersion:2,build:job.build,sourceSha256:job.sourceSha256,configuration:job.config,counts:summarizeBlocks(doc.blocks),semanticVerified:false,humanApproval:false,generatedAt:new Date().toISOString()};
  await add('EXPORT_METADATA.json',new Blob([JSON.stringify(metadata,null,2)],{type:'application/json'}));
  await add('PROVENANCE.json',new Blob([JSON.stringify({metadata,pages:doc.pages.map(({blocks,...page})=>page),blocks:doc.blocks,recoveredCorrections:doc.recoveredCorrections||[],revisionHistory:doc.revisionHistory||[]},null,2)],{type:'application/json'}));
  for(let i=0;i<assets.length;i++){await add(assets[i].path,assets[i].blob);onProgress(i/Math.max(1,assets.length)*50);}
  zip.file('SHA256SUMS.txt',hashes.join('\n')+'\n');
  zip.file('BACA_DULU.txt','SEMANTIK SETARA — HASIL JURNAL PDF\n\nBuka JURNAL_TERJEMAHAN.md atau JURNAL_BILINGUAL.md dengan editor Markdown.\nPertahankan folder assets di sebelah dokumen agar gambar terbaca.\nJURNAL_SUMBER.pdf adalah PDF asli; kata sandi PDF tidak disimpan.\nRumus dengan struktur yang didukung memakai LaTeX. Rumus lain diberi label belum terverifikasi dan citra sumber.\nLAPORAN_QA.md dan LEDGER_BAGIAN.csv menjelaskan bagian gagal, ditolak, atau perlu diperiksa.\nEXPORT_METADATA.json memuat identitas build/model/sumber dan konfigurasi. PROVENANCE.json mempertahankan sumber, koreksi, hasil, identitas, dan diagnosis.\nSHA256SUMS.txt memuat hash dokumen/aset utama.\nPaket tidak dapat diimpor kembali sebagai dokumen; aplikasi hanya menerima PDF. Progres dilanjutkan dari penyimpanan browser yang sama.\nTerjemahan mesin memerlukan tinjauan ilmiah.\n');
  return generateZip(zip,onProgress,signal);
}
export async function exportDocument(job,kind,onProgress=()=>{},{signal}={}) {
  aborted(signal);job={...job,build:job.build||BUILD_INFO};
  if(kind!=='zip'&&job.file instanceof Blob)job.sourceSha256=await hash(job.file,signal);
  const blob=kind==='zip'?await createZip(job,onProgress,{signal}):new Blob([await createStandaloneMarkdown(job,kind,{signal})],{type:'text/markdown;charset=utf-8'});
  aborted(signal);const filename=kind==='zip'?'JURNAL_HASIL_LENGKAP.zip':kind==='translation'?markdownFilename(job):FILES[kind];
  if(!filename)throw new Error('Format unduhan tidak dikenal.');
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  try{aborted(signal);document.body.append(anchor);anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  return {blob,filename,url};
}

export function markdownFilename(job){
  const base=String(job.file?.name||job.document?.fileName||'JURNAL').replace(/\.pdf$/i,'').replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(0,100)||'JURNAL';
  const source=job.document?.sourceLanguage||job.config?.source||'SOURCE',target=job.document?.targetLanguage||job.config?.target||'TARGET';
  const c=summarizeBlocks(job.document.blocks),partial=job.status!=='complete'||c.rejected||c.failed||c.pending;
  return `${base}_${source.toUpperCase()}_TO_${target.toUpperCase()}${partial?'_PARTIAL':''}.md`;
}
export async function createStandaloneMarkdown(job,kind='translation',{signal}={}){
  aborted(signal);let markdown=createMarkdown(job,kind,{withAssets:true});
  markdown=markdown.replace(/PDF asli dan aset visual yang tersedia disertakan dalam paket ini\.|Aset visual yang tersedia disertakan; PDF asli tidak tersedia dalam pekerjaan ini\./,'Gambar sumber tertanam dalam berkas ini. Renderer yang diuji: Marked + KaTeX, mendukung gambar data URI. PDF asli tidak ditanamkan.');
  const assets=new Map();let bytes=0;
  for(const asset of job.document.assets||[]){
    if(!safePath(asset.path)||!(asset.blob instanceof Blob)||assets.has(asset.path))throw new Error('Aset Markdown tidak valid atau berulang.');
    bytes+=asset.blob.size;if(bytes>128*1024*1024)throw new Error('Aset Markdown melebihi batas 128 MiB.');assets.set(asset.path,asset.blob);
  }
  const paths=[...new Set([...markdown.matchAll(/!\[[^\]\n]*\]\((assets\/[A-Za-z0-9_.-]+)\)/g)].map(m=>m[1]))];
  for(const path of paths){
    aborted(signal);const blob=assets.get(path);if(!blob)throw new Error('Gambar sumber tidak tersedia untuk Markdown mandiri.');
    const data=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<data.length;i+=32768)binary+=String.fromCharCode(...data.subarray(i,i+32768));
    const mime=/\.png$/i.test(path)?'image/png':/\.webp$/i.test(path)?'image/webp':'image/jpeg';
    const url='data:'+mime+';base64,'+btoa(binary);markdown=markdown.split(']('+path+')').join(']('+url+')');await yieldTask();
  }
  aborted(signal);return markdown;
}
