/* Markdown is serialized as text; no source HTML is executed or exported raw. */
const FILES = {source:'JURNAL_ASLI.md',translation:'JURNAL_TERJEMAHAN.md',bilingual:'JURNAL_BILINGUAL.md'};
const issues = block => [...new Set((block.issues || []).map(x=>typeof x==='string'?x:String(x.message || x.code || 'Perlu ditinjau.')))];
const originalText = block => typeof block.originalText==='string'?block.originalText:block.text;
const hasSourceCorrection = block => typeof block.originalText==='string' && block.originalText!==block.text;
const hasTarget = block => typeof block.target==='string' && (block.target.trim().length>0 || !String(block.text ?? '').trim());
function escapeMarkdownText(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/([\\`*_{}\[\]()#!|~])/g,'\\$1');
}
function inlineLiteral(text) {
  let fence='`';while(text.includes(fence))fence+='`';
  return fence+' '+text+' '+fence;
}
export function markdownText(value) {
  const text=String(value ?? '');let output='',offset=0;
  // Preserve recognized inline notation as literal code, without claiming LaTeX reconstruction.
  const formula=/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$(?!\$)[^$\r\n]+?\$(?!\$)/gu;
  for(const match of text.matchAll(formula)){
    output+=escapeMarkdownText(text.slice(offset,match.index))+(match[0].includes('\n')?'\n\n'+verbatim(match[0])+'\n\n':inlineLiteral(match[0]));offset=match.index+match[0].length;
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
  if(block.type==='formula'||block.type==='table') {
    let value=(hasSourceCorrection(block)&&text===block.text?'> Teks sumber dikoreksi pengguna; citra tetap berasal dari PDF asli.\n\n':'')+verbatim(text);
    if(withAssets&&safePath(block.assetPath))value+=`\n\n![${block.type==='formula'?'Rumus':'Tabel'} pada PDF asli, halaman ${block.page}](${block.assetPath})`;
    else value+=`\n\n> Representasi visual ${block.type==='formula'?'rumus':'tabel'} tersedia pada PDF sumber atau paket ZIP lengkap.`;
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
  if(hasSourceCorrection(block))lines.push('Terjemahan menggunakan sumber yang dikoreksi pengguna'+(block.sourceEditedAt?' pada '+block.sourceEditedAt:'')+'.');
  if(!hasTarget(block))lines.push('BELUM DITERJEMAHKAN: teks sumber dipertahankan.');
  else if(block.sourcePreserved)lines.push('KANDIDAT DITOLAK: teks sumber dipertahankan untuk koreksi.');
  else if(block.status==='preserved')lines.push('Sumber dipertahankan (elemen ilmiah, referensi, atau bahasa sudah sesuai).');
  if(block.userReviewed)lines.push('Ditandai telah ditinjau oleh pengguna; tanda ini bukan verifikasi otomatis.');
  if(block.editedAt)lines.push('Hasil diedit pengguna.');
  if(issues(block).length)lines.push(...issues(block));
  return lines.length?lines.map(line=>`> ${markdownText(line)}`).join('\n')+'\n\n':'';
}
export function createMarkdown(job,kind,{withAssets=false}={}) {
  if(!Object.hasOwn(FILES,kind))throw new Error('Format dokumen tidak dikenal.');
  const doc=validatedDocument(job);
  const done=doc.blocks.filter(b=>hasTarget(b)).length;
  const title=kind==='source'?'Jurnal — Ekstraksi Sumber':kind==='translation'?'Jurnal — Terjemahan':'Jurnal — Sumber & Terjemahan';
  const out=[`# ${title}`,'',`**Berkas sumber:** ${oneLine(job.file?.name || doc.fileName)}`,`**Halaman:** ${doc.numPages}`,`**Bahasa:** ${oneLine(doc.sourceLanguage || job.config?.source || 'belum ditetapkan')} → ${oneLine(doc.targetLanguage || job.config?.target || 'belum ditetapkan')}`,
    `**Status:** ${job.status==='complete'&&done===doc.blocks.length&&doc.pages.length===doc.numPages?'Pemrosesan selesai; perlu peninjauan ilmiah':'HASIL SEMENTARA — pemrosesan belum selesai'} (${done}/${doc.blocks.length} bagian diproses).`,
    '**Metode:** ekstraksi PDF/OCR dan terjemahan mesin lokal. Tidak ada klaim verifikasi semantik menyeluruh.',''];
  if(doc.metadata?.title)out.push(`**Judul metadata PDF:** ${oneLine(doc.metadata.title)}`,'');
  if(doc.metadata?.author)out.push(`**Penulis metadata PDF:** ${oneLine(doc.metadata.author)}`,'');
  out.push(withAssets?(job.file instanceof Blob?'PDF asli dan aset visual yang tersedia disertakan dalam paket ini.':'Aset visual yang tersedia disertakan; PDF asli tidak tersedia dalam pekerjaan ini.'):'Dokumen Markdown ini memuat teks. Unduh paket ZIP lengkap untuk menyertakan citra halaman dan aset visual.','');
  for(const page of doc.pages) {
    out.push(`## Halaman ${page.number}`,'');
    if(page.source==='ocr')out.push('> Teks halaman ini melibatkan OCR. Periksa ejaan, simbol, dan angka terhadap sumber.','');
    for(const block of doc.blocks.filter(b=>b.page===page.number)){
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
  const doc=validatedDocument(job),blocks=doc.blocks,done=blocks.filter(b=>hasTarget(b)).length;
  const withIssues=blocks.filter(b=>issues(b).length || !hasTarget(b) || b.sourcePreserved || hasSourceCorrection(b));
  const rows=[ '# CATATAN PEMERIKSAAN JURNAL','',`Berkas: ${oneLine(job.file?.name || doc.fileName)}`,'',
    `- Status pekerjaan: ${oneLine(job.status)}.`,
    `- Halaman terdata: ${doc.pages.length}/${doc.numPages}.`,
    `- Bagian sumber: ${blocks.length}.`, `- Bagian diproses: ${done}.`,
    `- Bagian dengan catatan atau belum diproses: ${withIssues.length}.`,
    `- Bagian dengan koreksi sumber oleh pengguna: ${blocks.filter(hasSourceCorrection).length}.`,
    `- Item teks ekstraksi yang terlacak: ${doc.coveredItemCount ?? '?'} / ${doc.sourceItemCount ?? '?'}.`,
    '- Verifikasi semantik manusia: TIDAK DILAKUKAN OLEH APLIKASI.',
    '- Pemeriksaan otomatis menilai beberapa invariansi struktur, angka, dan identitas ilmiah. Lulus pemeriksaan tidak membuktikan semua makna ilmiah benar.',
    '- Tabel dan persamaan tidak dipaksakan menjadi LaTeX. Representasi sumber dipertahankan ketika rekonstruksi tidak andal.',
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
async function hash(blob){const bytes=await blob.arrayBuffer();return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function zipLibrary(){await import('../vendor/export/jszip.min.js');if(!globalThis.JSZip)throw new Error('Penyusun ZIP tidak dapat dimuat.');return globalThis.JSZip;}
export async function createZip(job,onProgress=()=>{}) {
  const doc=validatedDocument(job);
  if(!(job.file instanceof Blob)||!job.file.size)throw new Error('PDF sumber tidak tersedia. Buka kembali PDF sebelum membuat paket lengkap.');
  const header=new TextDecoder('latin1').decode(await job.file.slice(0,1024).arrayBuffer());
  if(!/^(?:\s|\u00EF\u00BB\u00BF)*%PDF-\d\.\d\b/.test(header))throw new Error('Berkas sumber bukan PDF yang valid.');
  const assets=doc.assets || [];
  const available=new Set();
  for(const asset of assets){if(!safePath(asset.path)||!(asset.blob instanceof Blob)||available.has(asset.path))throw new Error('Aset ekspor tidak valid atau berulang.');available.add(asset.path);}
  for(const item of [...doc.pages,...doc.blocks])for(const key of ['imagePath','assetPath','pageImagePath'])if(item[key]&&(!safePath(item[key])||!available.has(item[key])))throw new Error('Referensi aset visual hilang atau tidak valid.');
  const JSZip=await zipLibrary();const zip=new JSZip();const total=assets.reduce((n,a)=>n+(a.blob?.size||0),0)+(job.file?.size||0);
  if(total>260*1024*1024)throw new Error('Paket terlalu besar untuk disusun dengan aman di browser. Gunakan dokumen yang lebih pendek.');
  const hashes=[];const seen=new Set();
  async function add(path,blob){if(seen.has(path))throw new Error('Nama aset ekspor berulang.');seen.add(path);zip.file(path,blob);hashes.push(`${await hash(blob)}  ${path}`);}
  for(const kind of Object.keys(FILES))await add(FILES[kind],new Blob([createMarkdown(job,kind,{withAssets:true})],{type:'text/markdown;charset=utf-8'}));
  await add('LAPORAN_QA.md',new Blob([createQaReport(job)],{type:'text/markdown;charset=utf-8'}));
  await add('LEDGER_BAGIAN.csv',new Blob(['\uFEFF'+createLedger(job)],{type:'text/csv;charset=utf-8'}));
  if(job.file)await add('JURNAL_SUMBER.pdf',job.file);
  for(let i=0;i<assets.length;i++){
    const asset=assets[i];if(!safePath(asset.path)||!(asset.blob instanceof Blob))throw new Error('Aset ekspor tidak valid.');
    await add(asset.path,asset.blob);onProgress(i/Math.max(1,assets.length)*50);
  }
  zip.file('SHA256SUMS.txt',hashes.join('\n')+'\n');
  zip.file('BACA_DULU.txt','SEMANTIK SETARA — HASIL JURNAL PDF\n\nBuka JURNAL_TERJEMAHAN.md atau JURNAL_BILINGUAL.md dengan editor Markdown.\nPertahankan folder assets di sebelah dokumen agar gambar terbaca.\nJURNAL_SUMBER.pdf adalah PDF asli; kata sandi PDF tidak disimpan.\nLAPORAN_QA.md dan LEDGER_BAGIAN.csv menjelaskan bagian yang belum diproses atau perlu diperiksa.\nSHA256SUMS.txt memuat hash seluruh dokumen/aset utama.\nPaket tidak dapat diimpor kembali ke aplikasi; aplikasi hanya menerima PDF. Progres dilanjutkan dari penyimpanan browser yang sama.\nTerjemahan mesin memerlukan tinjauan ilmiah.\n');
  return zip.generateAsync({type:'blob',mimeType:'application/zip',compression:'STORE',streamFiles:true},metadata=>onProgress(50+metadata.percent/2));
}
export async function exportDocument(job,kind,onProgress=()=>{}) {
  const blob=kind==='zip'?await createZip(job,onProgress):new Blob([createMarkdown(job,kind)],{type:'text/markdown;charset=utf-8'});
  const filename=kind==='zip'?'JURNAL_HASIL_LENGKAP.zip':FILES[kind];
  if(!filename)throw new Error('Format unduhan tidak dikenal.');
  const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;
  document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  return {blob,filename};
}
