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
const friendlyIssue=message=>/PROTECTED_MARKER|\bstack\b|\bat .*\.(?:js|mjs)|^Error:/i.test(message)?'Kandidat gagal pemeriksaan; sumber tetap tersedia. Periksa atau koreksi bagian ini; diagnosis teknis ada pada laporan QA.':message;
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
  if(block.type==='heading')return `${'#'.repeat(Math.min(6, Math.max(2, (Number(block.level)||2)+1)))} ${oneLine(text)}`;
  if(block.type==='list-item' && block.list){
    const clean=String(text??'').replace(/^[ \t]*(?:[-+*•◦▪‣]|\d{1,9}[.)])\s+/, '');
    const marker=block.list.ordered?`${Math.max(1,Number(block.list.start)||1)}.`:'-';
    return `${marker} ${markdownText(clean).replace(/\n/g,'\n  ')}`;
  }
  return markdownText(text);
}
function sectionStatus(block,kind) {
  if(kind==='source')return hasSourceCorrection(block)?'> Bagian ini memiliki koreksi sumber oleh pengguna'+(block.sourceEditedAt?' pada '+oneLine(block.sourceEditedAt):'')+'. Dokumen ini mempertahankan ekstraksi asli; sumber terkoreksi ditampilkan dalam dokumen bilingual.\n\n':'';
  const lines=[];
  if(block.resultBuild?.release&&block.resultBuild.release!==BUILD_INFO.release)lines.push('Hasil ini dipulihkan dari rilis '+block.resultBuild.release+'; bukan inferensi baru pada rilis eksportir.');
  if(hasSourceCorrection(block))lines.push('Terjemahan menggunakan sumber yang dikoreksi pengguna'+(block.sourceEditedAt?' pada '+block.sourceEditedAt:'')+'.');
  if(!hasTarget(block))lines.push('BELUM DITERJEMAHKAN: teks sumber dipertahankan.');
  else if(block.outcome==='failed')lines.push('PEMROSESAN GAGAL: teks sumber dipertahankan. Gunakan Lanjutkan untuk mencoba ulang.');
  else if(block.sourcePreserved)lines.push('KANDIDAT DITOLAK: teks sumber dipertahankan. Koreksi sumber, glosarium, atau hasil bagian ini sebelum memproses ulang.');
  
  if(block.userReviewed)lines.push('Ditandai telah ditinjau oleh pengguna; tanda ini bukan verifikasi otomatis.');
  if(block.editedAt)lines.push('Hasil diedit pengguna.');
  if(issues(block).length)lines.push(...[...new Set(issues(block).map(friendlyIssue))]);
  return lines.length?lines.map(line=>`> ${markdownText(line)}`).join('\n')+'\n\n':'';
}
function serializePage(page,blocks,kind,{withAssets=false,includePageSources=false}={}) {
  const out=[];
    out.push(`<!-- halaman: ${page.number} -->`,'');
    if(page.source==='ocr'||page.source==='mixed')out.push('> Teks halaman ini melibatkan OCR. Periksa ejaan, simbol, dan angka terhadap sumber.','');
    if(page.coverageIncomplete||page.coverageStatus==='incomplete')out.push('> CAKUPAN HALAMAN BELUM LENGKAP: sebagian isi visual atau teks belum dapat dipastikan. PDF/citra sumber tetap diperlukan.','');
    if(page.mathUncertain)out.push('> MATEMATIKA BELUM TERVERIFIKASI: citra sumber dipertahankan; ini bukan rekonstruksi LaTeX yang telah terbukti.','');
    for(const warning of [...new Set(page.warnings||[])])out.push('> '+markdownText(friendlyIssue(typeof warning==='string'?warning:warning.message||'Perlu ditinjau.')),'');
    for(const block of blocks){
      if(kind!=='source'&&block.runningMetadata&&!block.runningMetadata.firstOccurrence)continue;
      if(kind!=='source'&&block.runningMetadata)out.push(`> Metadata tepi halaman berulang pada halaman ${block.runningMetadata.pages.join(', ')}; ditampilkan sekali. Semua kemunculan tetap ada pada sumber dan provenance.`,'');
      if(block.type==='list-item'&&block.list&&kind!=='bilingual'){
        const content=blockText(block,kind==='source'?originalText(block):hasTarget(block)?block.target:block.text,withAssets);
        const indent=' '.repeat((/^\d+\. /.exec(content)?.[0].length)||2);
        out.push(content,indent+`<!-- bagian: ${String(block.id).replace(/[^A-Za-z0-9_-]/g,'')} | halaman: ${block.page} -->`);
        const status=sectionStatus(block,kind).trim();if(status)out.push('',...status.split('\n').map(line=>indent+line));
        continue;
      }
      out.push(`<!-- bagian: ${String(block.id).replace(/[^A-Za-z0-9_-]/g,'')} | halaman: ${block.page} -->`,'');
      if(kind==='bilingual') {
        if(hasSourceCorrection(block))out.push('**Ekstraksi asli sebelum koreksi**','',blockText(block,originalText(block),withAssets),'','**Sumber setelah koreksi pengguna**','',blockText(block,block.text,withAssets),'');
        else out.push('**Sumber**','',blockText(block,block.text,withAssets),'');
        out.push('**Terjemahan / hasil**','',sectionStatus(block,kind)+blockText(block,hasTarget(block)?block.target:block.text,withAssets),'');
      } else out.push(sectionStatus(block,kind)+blockText(block,kind==='source'?originalText(block):hasTarget(block)?block.target:block.text,withAssets),'');
    }
    if(withAssets&&(includePageSources||page.preserveVisualSource)&&safePath(page.imagePath)&&!out.some(line=>String(line).includes(']('+page.imagePath+')'))) out.push(`#### Citra sumber — halaman ${page.number}`,'',`![Halaman sumber ${page.number}](${page.imagePath})`,'');

  return out.join('\n');
}
export function createMarkdown(job,kind,{withAssets=false,includePageSources=false}={}) {
  if(!Object.hasOwn(FILES,kind))throw new Error('Format dokumen tidak dikenal.');
  const doc=markRepeatedMetadata(validatedDocument(job));
  const counts=summarizeBlocks(doc.blocks), done=counts.translated+counts.preserved;
  const documentTitle=doc.metadata?.title?.trim()||String(job.file?.name||doc.fileName||'Jurnal').replace(/\.pdf$/i,'');
  const title=oneLine(documentTitle)+' — '+(kind==='source'?'Ekstraksi Sumber':kind==='translation'?'Terjemahan':'Sumber & Terjemahan');
  const out=[`# ${title}`,'',`**Berkas sumber:** ${oneLine(job.file?.name || doc.fileName)}`,`**Halaman:** ${doc.numPages}`,`**Bahasa:** ${oneLine(doc.sourceLanguage || job.config?.source || 'belum ditetapkan')} → ${oneLine(doc.targetLanguage || job.config?.target || 'belum ditetapkan')}`,
    `**Status:** ${job.status==='complete'&&done===doc.blocks.length&&doc.pages.length===doc.numPages&&!doc.coverageIncompletePages&&!doc.mathUncertainPages&&!doc.pages.some(page=>page.coverageIncomplete||page.coverageStatus==='incomplete'||page.mathUncertain)?'Pemrosesan selesai; perlu peninjauan ilmiah':'HASIL SEMENTARA — pemrosesan belum selesai'} `,
    `**Bagian:** ${counts.translated} diterjemahkan; ${counts.preserved} dipertahankan sengaja; ${counts.rejected} ditolak; ${counts.failed} gagal; ${counts.pending} belum diproses. Total ${counts.total}.`,
    `**Rilis eksportir:** ${oneLine((job.build||BUILD_INFO).release)} · ${oneLine((job.build||BUILD_INFO).version)}.`,
    '**Metode:** ekstraksi PDF/OCR dan terjemahan mesin lokal. Tidak ada klaim verifikasi semantik menyeluruh.',''];
  if(job.sourceSha256)out.push(`**SHA-256 PDF sumber:** ${oneLine(job.sourceSha256)}`,'');
  if(doc.metadata?.title)out.push(`**Judul metadata PDF:** ${oneLine(doc.metadata.title)}`,'');
  if(doc.metadata?.author)out.push(`**Penulis metadata PDF:** ${oneLine(doc.metadata.author)}`,'');
  out.push(withAssets?(job.file instanceof Blob?'PDF asli dan aset visual yang tersedia disertakan dalam paket ini.':'Aset visual yang tersedia disertakan; PDF asli tidak tersedia dalam pekerjaan ini.'):'Ekspor teks internal; gunakan unduhan Markdown utama untuk menyertakan gambar sumber dalam satu berkas.','');
  const byPage=new Map();for(const block of doc.blocks){if(!byPage.has(block.page))byPage.set(block.page,[]);byPage.get(block.page).push(block);}
  for(const page of doc.pages)out.push(serializePage(page,byPage.get(page.number)||[],kind,{withAssets,includePageSources}),'');
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
  for(const kind of Object.keys(FILES))await add(FILES[kind],new Blob([createMarkdown(job,kind,{withAssets:true,includePageSources:true})],{type:'text/markdown;charset=utf-8'}));
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
export async function createStandaloneMarkdown(job,kind='translation',{signal,includePageSources=false}={}){
  aborted(signal);let markdown=createMarkdown(job,kind,{withAssets:true,includePageSources});
  markdown=markdown.replace(/PDF asli dan aset visual yang tersedia disertakan dalam paket ini\.|Aset visual yang tersedia disertakan; PDF asli tidak tersedia dalam pekerjaan ini\./,'Gambar penting tertanam sekali per isi unik dalam berkas ini. Renderer yang diuji: Marked + KaTeX, mendukung gambar data URI. PDF asli tidak ditanamkan.');
  const assets=new Map();let bytes=0;
  for(const asset of job.document.assets||[]){
    if(!safePath(asset.path)||!(asset.blob instanceof Blob)||assets.has(asset.path))throw new Error('Aset Markdown tidak valid atau berulang.');
    bytes+=asset.blob.size;if(bytes>128*1024*1024)throw new Error('Aset Markdown melebihi batas 128 MiB pada jalur dokumen kecil.');assets.set(asset.path,asset.blob);
  }
  const catalog=new Map(),references=[];
  markdown=await embedPageAssets(markdown,assets,catalog,async value=>references.push(value),signal);
  aborted(signal);return markdown+'\n'+references.join('\n');
}

// Reference definitions carry each distinct image payload only once. The map
// retains hashes/labels, never previous rasters or base64 strings.
async function embedPageAssets(markdown,assets,catalog,writeDefinition,signal) {
  const paths=[...new Set([...markdown.matchAll(/!\[[^\]\n]*\]\((assets\/[A-Za-z0-9_.-]+)\)/g)].map(m=>m[1]))];
  for(const path of paths){
    aborted(signal);const blob=assets.get(path);if(!blob)throw new Error('Gambar sumber tidak tersedia untuk Markdown mandiri.');
    const digest=await hash(blob,signal);
    let label=catalog.get(digest);
    if(!label){
      label='ss-image-'+digest;catalog.set(digest,label);
      const data=new Uint8Array(await blob.arrayBuffer());let binary='';
      for(let i=0;i<data.length;i+=32768)binary+=String.fromCharCode(...data.subarray(i,i+32768));
      const mime=/\.png$/i.test(path)?'image/png':/\.webp$/i.test(path)?'image/webp':'image/jpeg';
      await writeDefinition(`[${label}]: data:${mime};base64,${btoa(binary)}\n\n`);
    }
    markdown=markdown.split(']('+path+')').join(']['+label+']');
    await yieldTask();
  }
  return markdown;
}

/** One output sink, bounded text chunks. OPFS retains output outside JS heap.
 * The 32 MiB fallback bounds RAM when persistent file writing is unavailable. */
async function markdownSink({signal,fallbackMaxBytes=32*1024*1024}={}) {
  aborted(signal);
  let root=null;
  // A denied/unsupported file-system capability can still export a small
  // rescue result through the bounded Blob path. Mid-write failures abort.
  if(globalThis.navigator?.storage?.getDirectory){try{root=await navigator.storage.getDirectory();}catch(error){if(!['SecurityError','NotAllowedError','NotSupportedError'].includes(error?.name))throw error;}}
  let handle,writer,name,bytes=0,parts=[];
  if(root){name='semantik-export-'+crypto.randomUUID()+'.md';handle=await root.getFileHandle(name,{create:true});try{writer=await handle.createWritable();}catch(error){await root.removeEntry(name).catch(()=>{});throw error;}}
  const cleanup=async()=>{parts.length=0;if(root&&name)await root.removeEntry(name).catch(()=>{});};
  return {
    mode:writer?'opfs':'bounded-blob',
    get bytes(){return bytes;},
    async write(text){aborted(signal);const part=new Blob([text],{type:'text/markdown;charset=utf-8'});bytes+=part.size;
      if(writer)await writer.write(part);
      else{if(bytes>fallbackMaxBytes)throw new Error('Ekspor memerlukan penulisan berkas lokal bertahap. Browser ini tidak menyediakan akses penyimpanan tersebut; hasil yang sudah tersimpan tetap aman. Buka di browser dengan penyimpanan berkas lokal untuk menyusun satu Markdown besar.');parts.push(part);}
    },
    async finish(){aborted(signal);if(writer){await writer.close();writer=null;const file=await handle.getFile();Object.defineProperty(file,'exportCleanup',{value:cleanup});return file;}const blob=new Blob(parts,{type:'text/markdown;charset=utf-8'});parts.length=0;return blob;},
    async abort(){if(writer)await writer.abort().catch(()=>{});writer=null;await cleanup();}
  };
}

/** Export committed page records in order. Only one page, one image and its
 * encoded payload are active at once; no all-document string or asset array.
 * This is a file-producing function; caller owns the actual download gesture. */
export async function createStreamingMarkdown({document:doc,pages,kind='translation',status='paused',config={},file,build=BUILD_INFO,sourceSha256,includePageSources=false,unsavedPages=[],signal,onProgress=()=>{},fallbackMaxBytes}={}) {
  if(!Object.hasOwn(FILES,kind))throw new Error('Format dokumen tidak dikenal.');
  if(!Number.isInteger(doc?.numPages)||doc.numPages<1||!pages?.[Symbol.asyncIterator])throw new Error('Metadata atau pembaca halaman ekspor tidak valid.');
  const committed=doc.committedPageCount;
  if(!Number.isInteger(committed)||committed<1||committed>doc.numPages)throw new Error('Belum ada halaman tersimpan yang dapat diekspor.');
  if(!Array.isArray(unsavedPages)||unsavedPages.some(number=>!Number.isInteger(number)||number<1||number>committed))throw new Error('Identitas halaman yang belum tersimpan tidak valid.');
  const unsaved=[...new Set(unsavedPages)].sort((a,b)=>a-b),durablePages=committed-unsaved.length;
  const declared=doc.counts,counts={total:0,translated:0,preserved:0,rejected:0,failed:0,pending:0};
  const declaredDone=declared&&declared.total===declared.translated+declared.preserved;
  const complete=status==='complete'&&committed===doc.numPages&&declaredDone&&!doc.coverageIncompletePages&&!doc.mathUncertainPages&&!unsaved.length;
  const source=doc.sourceLanguage||config.source||'belum ditetapkan',target=doc.targetLanguage||config.target||'belum ditetapkan';
  const title=doc.metadata?.title?.trim()||String(file?.name||doc.fileName||'Jurnal').replace(/\.pdf$/i,'');
  const sink=await markdownSink({signal,fallbackMaxBytes}),catalog=new Map();
  let lastPage=0,pageCount=0,assetReferences=0,maxActivePages=0,coverageIncompletePages=0,mathUncertainPages=0;
  try{
    await sink.write([`# ${oneLine(title)} — ${kind==='source'?'Ekstraksi Sumber':kind==='bilingual'?'Sumber & Terjemahan':'Terjemahan'}`,'',
      `**Berkas sumber:** ${oneLine(file?.name||doc.fileName||'PDF')}`,
      `**Halaman tersedia dalam unduhan:** ${committed}/${doc.numPages}`,
      `**Halaman tersimpan di browser (versi yang diekspor):** ${durablePages}/${doc.numPages}`,
      unsaved.length?`> Perubahan halaman ${unsaved.join(', ')} tersedia dalam unduhan ini tetapi belum tersimpan di browser. Simpan unduhan ini sebelum menutup atau memuat ulang halaman aplikasi.`:'',
      `**Bahasa:** ${oneLine(source)} → ${oneLine(target)}`,
      `**Status:** ${complete?'Pemrosesan selesai; perlu peninjauan ilmiah':'HASIL SEMENTARA — pemrosesan belum selesai'}`,
      `**Rilis eksportir:** ${oneLine(build.release)} · ${oneLine(build.version)}.`,
      sourceSha256?`**SHA-256 PDF sumber:** ${oneLine(sourceSha256)}`:'',
      '**Metode:** ekstraksi PDF/OCR dan terjemahan mesin lokal. Tidak ada klaim verifikasi semantik menyeluruh.',
      'Gambar penting ditanam sekali per isi unik. Citra halaman penuh disertakan hanya bila dipilih atau diperlukan sebagai fallback. Renderer yang diuji: Marked + KaTeX; gambar data URI harus diizinkan.',
      '',complete?'':`> Ekspor penyelamatan: ${committed} halaman tersedia disertakan; ${durablePages} halaman memiliki versi terbaru tersimpan di browser${unsaved.length?` dan ${unsaved.length} halaman memuat perubahan yang belum tersimpan`:''}. Sisa ${doc.numPages-committed} halaman belum tersedia. Bagian yang belum diterjemahkan diberi penanda.`,
      '',''].filter(x=>x!=='').join('\n\n')+'\n\n');
    for await(const record of pages){
      aborted(signal);maxActivePages=Math.max(maxActivePages,1);
      const page=record?.page,blocks=page?.blocks;
      if(!page||!Array.isArray(blocks)||!Number.isInteger(page.number)||page.number!==lastPage+1||page.number>doc.numPages)throw new Error('Urutan atau cakupan halaman tersimpan tidak utuh; ekspor dihentikan agar tidak kehilangan halaman.');
      const ids=new Set();
      for(const block of blocks){
        if(block.page!==page.number||typeof block.id!=='string'||!/^p\d+-(?:b\d+|image|math-[A-Za-z0-9_-]+)$/.test(block.id)||Number(/^p(\d+)-/.exec(block.id)?.[1])!==page.number||ids.has(block.id))throw new Error('Identitas bagian tersimpan tidak valid atau berulang.');
        ids.add(block.id);
      }
      if(page.coverageIncomplete||page.coverageStatus==='incomplete')coverageIncompletePages++;
      if(page.mathUncertain)mathUncertainPages++;
      const current=summarizeBlocks(blocks);for(const key of Object.keys(counts))counts[key]+=current[key];
      const assets=new Map();
      for(const asset of record.assets||[]){if(!safePath(asset.path)||!(asset.blob instanceof Blob)||assets.has(asset.path))throw new Error('Aset halaman tidak valid atau berulang.');assets.set(asset.path,asset.blob);}
      let markdown=serializePage(page,blocks,kind,{withAssets:true,includePageSources});
      assetReferences+=[...markdown.matchAll(/!\[[^\]\n]*\]\(assets\//g)].length;
      // Definitions may precede references in CommonMark; they remain at most
      // one asset large and need not be held until the entire document ends.
      markdown=await embedPageAssets(markdown,assets,catalog,text=>sink.write(text),signal);
      await sink.write(markdown+'\n\n');
      assets.clear();lastPage=page.number;pageCount++;
      onProgress({stage:'export',pages:pageCount,total:committed,bytes:sink.bytes,uniqueAssets:catalog.size});
      await yieldTask();
    }
    if(pageCount!==committed)throw new Error('Jumlah halaman ekspor berbeda dari checkpoint tersimpan.');
    if(declared&&Object.keys(counts).some(key=>Number(declared[key])!==counts[key]))throw new Error('Jumlah bagian ekspor berbeda dari checkpoint tersimpan.');
    if(complete&&(counts.pending||counts.rejected||counts.failed||pageCount!==doc.numPages||coverageIncompletePages||mathUncertainPages))throw new Error('Checkpoint lengkap tidak cocok dengan isi aktual. Hasil belum dapat disebut selesai.');
    await sink.write(['---','','**Rekonsiliasi hasil:**',`- Halaman: ${pageCount}/${doc.numPages}; urutan 1–${lastPage} terverifikasi.`,
      `- Bagian: ${counts.translated} diterjemahkan; ${counts.preserved} dipertahankan sengaja; ${counts.rejected} ditolak; ${counts.failed} gagal; ${counts.pending} belum diproses. Total ${counts.total}.`,
      `- Gambar: ${catalog.size} isi unik untuk ${assetReferences} referensi.`,
      `- Halaman dengan cakupan belum lengkap: ${coverageIncompletePages}; matematika belum terverifikasi: ${mathUncertainPages}.`,
      '- Setiap bagian memiliki ID sumber dan nomor halaman. Verifikasi ini menilai cakupan, bukan kesetaraan makna.',
      '- Tinjauan manusia: tidak dilakukan oleh aplikasi.',''].join('\n'));
    if(doc.warnings?.length)await sink.write('\n## Catatan pembacaan\n\n'+[...new Set(doc.warnings)].map(x=>'- '+markdownText(typeof x==='string'?x:x.message||'Perlu ditinjau.')).join('\n')+'\n');
    const blob=await sink.finish();
    Object.defineProperty(blob,'exportStats',{value:{pages:pageCount,blocks:counts.total,counts,uniqueAssets:catalog.size,assetReferences,bytes:blob.size,sink:sink.mode,maxActivePages,coverageIncompletePages,mathUncertainPages,unsavedPages:unsaved,durablePages,partial:!complete}});
    return blob;
  }catch(error){await sink.abort();throw error;}
}
