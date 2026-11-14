from pathlib import Path
import json, re
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics, ttfonts
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'output'; OUT.mkdir(exist_ok=True)
DEST=OUT/'LAPORAN_AUDIT_CP18_PDF_KE_MARKDOWN.pdf'
FONT=Path('/usr/share/fonts/truetype/dejavu')
pdfmetrics.registerFont(TTFont('AuditSans',str(FONT/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('AuditBold',str(FONT/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('AuditMono',str(FONT/'DejaVuSansMono.ttf')))
pdfmetrics.registerFontFamily('AuditSans',normal='AuditSans',bold='AuditBold',italic='AuditSans',boldItalic='AuditBold')
# Produce correct PDF ToUnicode entries for any non-BMP characters in quotations.
_cmap=ttfonts.makeToUnicodeCMap
def unicode_cmap(*a,**kw):
    return re.sub(r'<([0-9A-Fa-f]{5,6})>',lambda m:'<'+chr(int(m[1],16)).encode('utf-16-be').hex().upper()+'>',_cmap(*a,**kw))
ttfonts.makeToUnicodeCMap=unicode_cmap

INK=colors.HexColor('#20362f'); GREEN=colors.HexColor('#204c40'); MUTED=colors.HexColor('#5b6d66')
LINE=colors.HexColor('#d5ded7'); PALE=colors.HexColor('#edf3ee'); RED=colors.HexColor('#8b332a')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle('TitleAudit',fontName='AuditBold',fontSize=25,leading=31,textColor=INK,spaceAfter=15))
styles.add(ParagraphStyle('SubtitleAudit',fontName='AuditSans',fontSize=12,leading=18,textColor=MUTED,spaceAfter=15))
styles.add(ParagraphStyle('H1Audit',fontName='AuditBold',fontSize=18,leading=24,textColor=GREEN,spaceAfter=13))
styles.add(ParagraphStyle('H2Audit',fontName='AuditBold',fontSize=11.3,leading=16,textColor=GREEN,spaceBefore=12,spaceAfter=7))
styles.add(ParagraphStyle('BodyAudit',fontName='AuditSans',fontSize=9.4,leading=14,textColor=INK,spaceAfter=8))
styles.add(ParagraphStyle('SmallAudit',fontName='AuditSans',fontSize=7.9,leading=11.5,textColor=MUTED,spaceAfter=6))
styles.add(ParagraphStyle('CellAudit',fontName='AuditSans',fontSize=8.4,leading=12,textColor=INK))
styles.add(ParagraphStyle('HeadCellAudit',fontName='AuditBold',fontSize=8.4,leading=12,textColor=colors.white))
styles.add(ParagraphStyle('CodeAudit',fontName='AuditMono',fontSize=8,leading=12,textColor=INK,backColor=PALE,borderPadding=9,spaceBefore=4,spaceAfter=11,wordWrap='CJK'))
styles.add(ParagraphStyle('LabelAudit',fontName='AuditBold',fontSize=8.4,leading=12,textColor=MUTED,spaceAfter=12))
story=[]
def p(s,style='BodyAudit'):
    story.append(Paragraph(s,styles[style]))
def h(s):p(s,'H2Audit')
def code(s):p(escape(s).replace('\n','<br/>'),'CodeAudit')
def title(n,s):
    if story:story.append(PageBreak())
    p(f'AUDIT CP18  /  {n:02d}','LabelAudit');p(s,'H1Audit')
def table(headers,rows,widths):
    cells=[[Paragraph(escape(str(x)),styles['HeadCellAudit']) for x in headers]]
    cells += [[Paragraph(str(x),styles['CellAudit']) for x in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,0),.6,GREEN),('LINEBELOW',(0,-1),(-1,-1),.5,LINE)]))
    story.append(t);story.append(Spacer(1,9))
def note(s):p(s,'SmallAudit')
W=511

title(1,'Keputusan: belum layak untuk target produk Anda')
p('SEMANTIK SETARA CP18','TitleAudit')
p('Audit menyeluruh arsip deployment<br/>12 November 2026 · Rilis cp18-7a8e787a497535f5','SubtitleAudit')
p('<b>Target:</b> unggah PDF jurnal ilmiah, tekan Terjemahkan, lalu unduh satu file .md. Mendukung Inggris-Indonesia dan Indonesia-Inggris, dengan matematika yang utuh dan rapi. Lazy interaction dipertahankan.')
p('<b>Putusan:</b> CP18 telah memperkuat integritas dan penyimpanan, tetapi belum memenuhi mutu hasil yang diperlukan. Empat penghalang utama telah dibuktikan: struktur rumus hilang saat ekstraksi; notasi turunan rusak saat penerjemahan; makna ilmiah keliru tanpa peringatan; dan Markdown tunggal masih menulis matematika sebagai teks literal.')
table(['Kebutuhan Anda','Hasil audit'],[
 ('PDF sebagai satu-satunya masukan','Terpenuhi pada jalur input yang diperiksa. Tidak ada fitur unggah JSON pada UI.'),
 ('Terjemahan dua arah','Kedua model berjalan; mutu ilmiah dua arah belum memenuhi target.'),
 ('Unggah - tekan - unduh','Jalur utama tersedia. Tinjauan per blok tidak diwajibkan oleh tombol unduh; UI dan penanganan kegagalan masih berpusat pada peninjauan/koreksi.'),
 ('Matematika rapi dan setara','Belum terpenuhi. Kegagalan terjadi pada ekstraksi, perlindungan notasi, dan ekspor.'),
 ('Satu Markdown yang siap dibaca','File dapat dibuat, tetapi formula berbentuk code fence dan aset visual berada di jalur ZIP.'),
 ('Lazy interaction','Arsitektur dan harness mendukung: hanya shell ringan disiapkan awal; model dipanggil saat diperlukan.'),
 ('Kesiapan produksi yang terbukti','Belum: temuan hasil masih terbuka; bukti browser/hosting aktual dan acceptance jurnal belum tersedia.')
],[154,W-154])
p('<b>Prioritas:</b> 4 temuan P1, 4 temuan P2, dan 1 temuan P3. P1 berarti penghalang langsung penerimaan produk, bukan skala kerentanan keamanan. Audit ini tidak memberikan persentase kesiapan atau akurasi yang tidak terukur.')
note('Source asli tidak diubah. Seluruh 297 hash diperiksa kembali setelah pengujian dan tetap sama. Rincian temuan dan reproduksi tersedia dalam paket bukti pendamping.')

title(2,'Apa yang benar-benar diperiksa')
p('Arsip: <b>SEMANTIK_SETARA_CP18_CANDIDATE_NOT_PRODUCTION_READY(1).zip</b>. Ukuran 223.289.243 byte; 297 file; 252.014.956 byte setelah ekstraksi. Pemeriksaan CRC arsip tidak menemukan kerusakan.')
code('SHA-256 arsip\n32743e819993a011c5ff4f34de90292a\n76c29d9963f1258542be5382965df2dc')
note('SHA di atas ditampilkan pada dua baris untuk keterbacaan; nilai lengkap tanpa pemisah ada di file_inventory.json.')
table(['Kelompok','File','Metode pemeriksaan'],[
 ('Root deployment',3,'index.html, _headers, Service Worker.'),
 ('Root rilis',4,'Build/manifest/notice/icon dan keterkaitan lokasi aset.'),
 ('Aplikasi',11,'Alur input, ekstraksi, layout, semantic spans, terjemahan, ekspor, storage, offline, CSS, dan worker layout.'),
 ('Engine terkompilasi',1,'Jalur adapter dan patch cache; inferensi aktual; manifest tertanam.'),
 ('Runtime',2,'Identitas, ukuran/hash, pemuatan runtime model.'),
 ('Vendor',214,'Inventaris, versi relevan, integritas aset, batas integrasi; parser PDF aktual dijalankan.'),
 ('Lisensi',32,'Keberadaan, provenance, konsistensi notice dengan komponen aktual.'),
 ('Model',30,'Dua arah; shard transport/decoded, rekonstruksi berkas, manifest, inferensi aktual.')
],[110,40,W-150])
h('Bukti integritas')
p('<b>231/231</b> entri offline dan <b>232/232</b> entri Service Worker cocok ukuran/SHA-256. <b>28/28</b> shard transport, <b>28/28</b> shard setelah decode, dan <b>16/16</b> berkas logis model cocok. Data OCR Inggris/Indonesia cocok terhadap hash transport dan decode. Manifest model dalam worker sama dengan manifest di disk.')
h('Bukti perilaku')
p('Empat PDF sintetis nyata digunakan: satu halaman matematika, satu halaman campuran digital/raster, serta dua dokumen prosa akademik EN dan ID. Dilakukan 34 kasus model terarah, 12 uji validator terpisah, dan 13 assertions harness integritas/cache. Dua PDF prosa diproses sampai Markdown baru, masing-masing 13 blok.')
note('Audit seluruh file berarti inventaris dan verifikasi seluruh arsip serta telaah jalur aplikasi yang relevan. Ini bukan klaim pembacaan manual setiap instruksi biner/vendor, audit formal, atau benchmark seluruh jenis jurnal.')

title(3,'F01 / P1 - Struktur rumus hilang saat PDF dibaca')
p('PDF sumber dirender dan diperiksa secara visual. Parser PDF.js 6.2.108 dari ZIP kemudian dijalankan bersama normalizeItems, analyzeLayout, dan exporter asli CP18. Hasil berikut muncul sebelum model penerjemah dilibatkan.')
table(['Yang terlihat pada PDF','Ekstraksi CP18 aktual'],[
 ('y = x<super>2</super>','<font name="AuditMono">y = x 2</font>'),
 ('z = a<sub>i</sub>','<font name="AuditMono">z = a i</font>'),
 ('f(x) = (x + 1)/(x - 1), ditulis dengan garis pecahan','Tiga blok terpisah: <font name="AuditMono">x + 1</font>, <font name="AuditMono">f(x) =</font>, <font name="AuditMono">x − 1</font>.'),
 ('Integral dari 0 sampai 1 atas x<super>2</super> dx = 1/3','<font name="AuditMono">∫0 x dx = 3</font>; angka lain menjadi <font name="AuditMono">2 1</font>; batas atas 1 menyatu dengan judul sebelumnya.'),
 ('Matriks A berisi baris (1, 2) dan (3, 4), dengan kurung matriks','Blok <font name="AuditMono">1 2</font>, <font name="AuditMono">A =</font>, <font name="AuditMono">3 4</font>. Kurung berupa garis vektor tidak masuk teks.')
],[220,W-220])
h('Mengapa ini terjadi')
p('PDF menyimpan posisi dan bentuk visual. CP18 mengelompokkan item lalu meratakannya menjadi string. Posisi masih tersimpan untuk pelacakan sumber, tetapi tidak dibangun menjadi hubungan pangkat, indeks, pembilang/penyebut, batas integral, atau sel matriks. Garis pecahan dan kurung matriks dapat berupa gambar vektor, sehingga memang tidak ada dalam daftar item teks.')
p('Pada fixture ini, 34 item teks menghasilkan 22 blok. Item yang terlacak tidak sama dengan struktur matematika yang dipertahankan. Sebuah blok berstatus preserved dapat mempertahankan rumus yang sudah salah sejak ekstraksi.')
h('Penguatan yang diperlukan')
p('Deteksi wilayah matematika lengkap, gabungkan informasi geometri teks dan unsur visual, lalu bentuk representasi ekspresi yang dapat diverifikasi. Pisahkan prosa dari rumus sebelum penerjemahan. Rumus yang belum berhasil direkonstruksi tidak boleh otomatis diperlakukan sebagai ekspresi yang telah utuh.')
p('Verifikasi harus mencakup pangkat/subskrip, pecahan bertingkat, akar, integral/sigma dengan batas, matriks, persamaan berbaris, nomor persamaan, dan matematika di dalam kalimat maupun tabel. Perbaikan mesin bahasa saja tidak dapat mengembalikan geometri yang sudah dibuang.')
note('Lokasi: app/pdf-reader.js:77-94; app/layout.js:18-29,91-111,247-266. Bukti: pdf_math/mathematics_fixture.pdf; math_node_extraction.json; MATHEMATICS_ACTUAL_SOURCE_EXPORT.md. Uji Node memakai parser aktual dengan shim API standar; bukan uji OCR atau browser.')

title(4,'F02-F03 / P1 - Notasi dan makna dapat rusak tanpa tanda')
h('Notasi turunan: kesalahan model aktual')
p('Masukan yang sudah benar pun dapat rusak. Contoh EN-ID berikut berjalan dengan bobot ONNX yang disertakan CP18:')
code('Given f(x)=x², the derivative is f′(x)=2x.\n→ Mengingat f(x)=x², turunan adalah fåx)=2x.')
p('Hasil tersebut memiliki <b>status translated, issues kosong</b>. Pada PDF prosa ID yang baru dibuat, kalimat “Diberikan f(x)=x², turunannya adalah f′(x)=2x.” menjadi “Given f(x)=x², the derivative is f-told)=2x.”, juga tanpa peringatan.')
p('Kontrol apostrophe ASCII, Unicode prime, dan double prime ikut gagal. Kontrol fungsi biasa f(x)=2x dan formula ber-delimiter $...$ berhasil pada kasus uji. Pengidentifikasi fungsi tidak mencakup suffix prime; validator membandingkan hanya span yang sudah dikenali. Kekosongan issues tidak berarti seluruh notasi telah diperiksa.')
note('Lokasi: semantic-spans.js:7,112-122; translation.js:65-67,267. Bukti: engine/notation-model-results.json, validator-results.json, browser/prose_pipeline_results.json.')
h('Makna ilmiah: keluaran aktual yang belum layak')
table(['Sumber / konteks','Keluaran aktual','Masalah'],[
 ('The trial failed to demonstrate non-inferiority.','Pengadilan gagal menunjukkan non-inferiority.','trial dalam konteks penelitian berubah menjadi pengadilan.'),
 ('Paragraf ID: paparan partikulat halus dan rawat inap','exposure to delicate party and intrusive care','Istilah inti dan makna paparan/luaran hilang.'),
 ('Tidak ada bilangan riil yang memenuhi kedua syarat.','No real number satisfies second condition.','Kedua syarat berubah menjadi syarat kedua; cakupan logika berbeda.'),
 ('The upper confidence limit exceeded the non-inferiority margin.','Batas kepercayaan diri atas melebihi batas non-inferiority.','confidence dalam statistik berubah menjadi kepercayaan diri.')
],[169,183,W-352])
p('Keempat contoh tersebut lolos sebagai translated dengan issues kosong dalam uji model. Ini bukan sekadar gaya bahasa yang kurang enak: istilah dan pernyataan ilmiahnya berubah. Semua hasil memang menyimpan semanticVerified:false; implementasi tidak mengklaim verifikasi makna manusia, tetapi mutu ini belum memenuhi target pengguna.')
note('Bukti: engine/real-model-results.json. Ini kasus terarah, bukan estimasi tingkat kesalahan pada populasi jurnal. Mesin aktual adalah OPUS-MT 2019-12-18 yang dikonversi/kuantisasi; umur model sendiri bukan bukti kegagalan, sedangkan keluaran di atas merupakan bukti langsung.')

title(5,'Bukti baru: dua PDF diproses sampai Markdown')
p('Untuk memastikan masalah muncul pada berkas akhir, dua PDF prosa sintetis dibuat dan diperiksa tampilannya. Jalur yang dijalankan: parser PDF.js aktual → normalisasi/layout CP18 → deteksi bahasa dan pemilihan blok → model aktual → exporter Markdown CP18. Tidak ada koreksi manual atas hasilnya.')
table(['Input / arah','Status proses','Ringkasan blok'],[
 ('academic_prose_en.pdf<br/>EN → ID','complete','13 total; 13 translated; 0 rejected/failed/pending.'),
 ('academic_prose_id.pdf<br/>ID → EN','complete','13 total; 12 translated; 1 preserved; 0 rejected/failed/pending.')
],[205,89,W-294])
p('Hitungan translated di atas mengikuti kategori aplikasi; beberapa blok memiliki peringatan review. Deteksi dokumen mengenali EN dan ID dengan benar. Satu paragraf pengantar Inggris pada fixture ID dipertahankan karena sudah dalam bahasa tujuan. Hasil ini menunjukkan rute dua arah berjalan, bukan bahwa semua terjemahannya benar.')
h('Cuplikan hasil PDF EN → ID')
code('The trial failed to demonstrate non-inferiority.\n→ Pengadilan gagal menunjukkan non-inferiority.\n\nGiven f(x)=x², the derivative is f′(x)=2x.\n→ Mengingat f(x)=x², turunan adalah fåx)=2x.')
h('Cuplikan hasil PDF ID → EN')
code('Kami meneliti hubungan antara paparan partikulat halus dan rawat inap.\n→ We\'re researching the relationship between exposure to the delicate and intrusive.\n\nDiberikan f(x)=x², turunannya adalah f′(x)=2x.\n→ Given f(x)=x², the derivative is f-told)=2x.')
h('Makna status selesai')
p('Aplikasi secara jujur menyebut “pemrosesan selesai; perlu peninjauan ilmiah” pada Markdown. Namun, selesai melewati seluruh blok tetap tidak membuktikan hasil siap dipakai. Perbaikan produk perlu menyasar mutu ekstraksi dan makna, serta pemeriksaan internal yang mengukur hal tersebut. Mengubah label complete atau menghapus peringatan tidak memperbaiki hasil.')
note('Bukti: browser/FRESH_TRANSLATION_en-id.md; FRESH_TRANSLATION_id-en.md; prose_pipeline_results.json; prose_pipeline.mjs. Node bridge memakai byte model asli dan perubahan transport/path saja. UI, OCR, canvas capture aplikasi, checkpoint, dan klik unduh browser tidak diuji oleh jalur ini.')

title(6,'F04 / P1 - Markdown belum memenuhi kontrak matematika')
p('Exporter CP18 memilih representasi literal secara sengaja. Blok formula ditulis sebagai code fence berlabel text. LaTeX yang sudah memiliki delimiter pun ditempatkan di dalam backticks. Ini menjaga teks dari interpretasi Markdown, tetapi membuat matematika tidak ditampilkan sebagai persamaan oleh renderer matematika biasa.')
h('Contoh serializer aktual')
code('Masukan:\nThe estimator is $\\hat\\beta=(X^TX)^{-1}X^Ty$.\n\nKeluaran CP18:\nThe estimator is ` $\\hat\\beta=(X^TX)^{-1}X^Ty$ `.')
p('Jalur unduh .md memakai withAssets=false. Citra rumus, potongan tabel, dan citra halaman disertakan pada jalur ZIP. Untuk elemen gambar, Markdown tunggal dapat meminta pembaca membuka PDF asli atau paket ZIP. Dengan kontrak produk Anda, pengguna tidak boleh memerlukan ZIP tambahan agar rumus utama dapat dipahami.')
h('Format hasil yang seharusnya ditetapkan')
p('Pilih satu kontrak Markdown matematika, misalnya $...$ untuk inline dan $$...$$ untuk display, dengan struktur LaTeX yang benar-benar berhasil direkonstruksi. Tetapkan renderer yang didukung dan uji pada renderer itu. Dokumentasi GitHub, misalnya, mendukung LaTeX di Markdown melalui MathJax [W3]. Dukungan ini tidak berarti semua pembaca Markdown mendukung matematika atau gambar tertanam dengan cara yang sama.')
code('Contoh target setelah verifikasi struktur:\n$$\nf(x)=\\frac{x+1}{x-1}\n$$\n\nTurunannya adalah $f^{\\prime}(x)=2x$.')
p('Membungkus hasil teks datar “x + 1 / x − 1” dengan tanda dolar belum cukup. Pembilang/penyebut harus ditentukan dari PDF sebelum serialisasi. Begitu juga pangkat, indeks, batas, dan urutan sel matriks.')
h('Satu file tetap memerlukan batas format yang jelas')
p('Jika ilustrasi penelitian juga wajib tersedia dalam satu file, pilih dan uji cara penyematannya pada viewer yang didukung; jangan mengasumsikan data URI atau HTML diterima semua renderer. Untuk rumus, target utama adalah notasi LaTeX tervalidasi dalam .md. Informasi debug/provenance boleh tersimpan internal atau pada unduhan opsional, tanpa menjadi syarat membaca hasil utama.')
note('Lokasi: export.js:27-38,51-70,87-115,203-209. Bukti: pdf_math/math_node_extraction.json dan keluaran Markdown baru. Kesimpulan ini adalah ketidaksesuaian desain dengan kebutuhan terbaru, bukan tuduhan bahwa exporter menyembunyikan keterbatasannya.')

title(7,'F05 / P2 - Pemeriksaan perlu tepat, alur tetap sederhana')
h('Guard dapat melewatkan perubahan penting')
p('Uji validator terpisah menunjukkan perubahan berikut tidak menghasilkan peringatan struktur maupun semanticWarnings. Ini mutasi buatan untuk menguji perlindungan, <b>bukan klaim model membuat seluruh kesalahan ini</b>.')
table(['Mutasi uji','Mengapa penting'],[
 ('10 μL → 10 nL','Awalan satuan berubah; nilai numerik yang sama tidak menjamin besaran sama.'),
 ('10 eV → 10 keV','Skala energi berubah meskipun angka 10 tetap.'),
 ('10 Gy → 10 Sv','Nama satuan dan besaran tidak dipertahankan.'),
 ('z̄ → z','Aksen yang memberi makna rata-rata hilang.'),
 ('Sistolik/diastolik 120/80 → 80/120','Sekumpulan angka sama, relasinya berbeda.'),
 ('reduced mortality → meningkatkan mortalitas','Arah efek berbalik, sedangkan angka tetap.')
],[202,W-202])
h('Guard juga dapat menolak hubungan angka yang tetap benar')
p('Pada inferensi aktual, “Treatment A reduced mortality by 10%, whereas treatment B increased mortality by 20%” menghasilkan kandidat yang mempertahankan A/B, 10%/20%, dan arah menurun/meningkat. Kandidat ditolak karena kata “Pengobatan” tidak termasuk sinonim kelompok yang dikenali. Aplikasi mengembalikan kalimat Inggris dan meminta pengguna mencoba ulang atau meninjau.')
p('Penguatan perlu mengukur dua sisi: perubahan makna yang lolos dan hasil yang layak tetapi ditolak. Menambah pemeriksaan tanpa kalibrasi dapat memperbesar pekerjaan manual konsumen. Gunakan kasus negatif serta kontrol benar pada tiap aturan, termasuk istilah yang memang punya banyak arti.')
h('Alur UI saat ini: ada jalur tiga langkah, tetapi fokusnya masih peninjauan')
p('Tidak ada kewajiban menandai setiap blok sudah ditinjau sebelum mengunduh. Tombol unduh aktif ketika proses tidak sibuk dan setidaknya satu bagian dihitung selesai. Pengaturan layout, glosarium, ekstraksi tanpa terjemahan, dan koreksi sumber juga opsional. Namun ruang tinjau, editor per blok, serta empat pilihan ekspor menjadi pusat hasil. Pesan kegagalan masih meminta pengguna melanjutkan/koreksi.')
note('Lokasi: semantic-spans.js:65; main.js:202-205,411-414; index.html:43-65. Bukti: engine/validator-results.json, real-model-results.json, browser/ui_contract_and_scope.json. Penilaian UI berdasarkan kode, bukan interaksi browser yang berhasil.')

title(8,'Desain produk yang sesuai: tiga langkah konsumen')
table(['Yang dilihat pengguna','Pekerjaan otomatis di dalam aplikasi'],[
 ('1. Unggah/pilih PDF','Validasi PDF, kenali bahasa, pilih arah lawan sebagai default yang masuk akal. Pengguna dapat mengganti EN → ID atau ID → EN dalam kontrol sederhana.'),
 ('2. Tekan Terjemahkan','Jalankan pembacaan, OCR bila relevan, rekonstruksi matematika, terjemahan, pemeriksaan, dan pemulihan otomatis terbatas. Tampilkan satu progres yang jelas.'),
 ('3. Unduh .md','Sajikan tombol utama “Unduh hasil .md” setelah hasil memenuhi kriteria yang ditetapkan. Nama berkas mengikuti judul/nama PDF dan arah bahasa.')
],[172,W-172])
h('Pertahankan lazy interaction')
p('Shell awal cukup memuat antarmuka ringan. Reader dimuat ketika PDF dipilih; OCR hanya untuk wilayah yang memerlukannya; model hanya untuk arah yang dipakai; exporter disiapkan ketika diperlukan. Unduhan model awal merupakan tahap otomatis pada progres, tanpa menambah tombol persiapan wajib. Pekerjaan berat dijalankan di worker agar UI tetap dapat merespons dan dibatalkan.')
h('Pemeriksaan ilmiah berada di dalam mesin')
p('Pisahkan prosa yang diterjemahkan dari rumus, identitas, angka, satuan, sitasi, serta hubungan penting. Bandingkan struktur dan keterikatan angka terhadap kelompok/variabel; gunakan konteks untuk istilah dan kalimat. Jika pemeriksaan gagal, coba jalur alternatif secara otomatis dengan batas waktu/biaya/perangkat yang jelas. Jangan berulang kali menjalankan kandidat deterministik yang sama tanpa perubahan strategi.')
p('Apabila suatu dokumen memang di luar kemampuan yang telah diuji, tunjukkan kegagalan yang singkat dan jujur pada alur yang sama. Produk tidak boleh mengganti bagian penting dengan sumber lalu mengiklankannya sebagai terjemahan ilmiah lengkap. Unduhan hasil sebagian dapat tetap tersedia sebagai pilihan sekunder dengan status jelas.')
h('Sederhanakan hasil utama')
p('Setelah selesai, tampilkan nama dokumen, arah bahasa, ringkasan singkat keberhasilan, dan tombol .md. Detail diagnostik, perbandingan sumber, glosarium, koreksi, ekspor bilingual, dan paket arsip dapat diletakkan pada detail opsional. Konsumen tidak perlu memahami istilah checkpoint, model shard, protected marker, atau laporan QA untuk menyelesaikan pekerjaan.')
h('Pilihan mesin harus diuji terhadap hasil')
p('Pertahankan janji pemrosesan lokal dan privasi yang sekarang ada. Evaluasi perbaikan atau penggantian model berdasarkan korpus jurnal dua arah, kelengkapan, makna, matematika, serta batas waktu/memori perangkat sasaran. Daftar glosarium membantu istilah tertentu, tetapi contoh “kedua syarat” menunjukkan perlunya pemahaman relasi kalimat. Semua ini merupakan pekerjaan penguatan mesin, bukan penambahan alur konsumen.')

title(9,'Fondasi yang baik dan penguatan operasional')
h('Perbaikan CP18 yang perlu dipertahankan')
p('Aset memakai URL rilis dan hash. Harness fungsi SW aktual menolak byte yang berubah, memulihkan cache korup, dan tetap memakai unduhan terverifikasi saat cache ditolak/penuh. Instalasi SW mengambil hanya tujuh komponen shell. Worker model memiliki mode sesi saat cache gagal. Duplikasi ONNX WASM besar sebelumnya tidak lagi ada.')
p('Kode juga memperlihatkan koreksi sumber yang dipertahankan saat invalidasi, status simpan/dirty yang lebih jujur, jobId/writeEpoch dan relock setelah BFCache, AbortSignal pada ekspor, serta pembersihan DOM/canvas saat dokumen dihapus. Perbaikan lifecycle ini dinilai dari jalur kode; belum semuanya diuji dalam browser aktual.')
p('Perencanaan OCR halaman campuran kini menandai semua 10 wilayah raster pada fixture dengan 57,007% area gambar. Batas aset menolak 136 MiB gabungan aset checkpoint/baru. Ini membuktikan deteksi/accounting kasus tersebut, bukan akurasi OCR atau batas puncak memori.')
h('F06 / P2 - Aturan cache HTTP perlu dipisahkan')
p('_headers menetapkan max-age=0 pada /* dan max-age=31536000 pada /r/*. Menurut aturan resmi Cloudflare, header ganda dari pola yang sama-sama cocok digabung dengan koma [W1]. Konfigurasi tersebut menghasilkan dua nilai max-age pada aset rilis. Pisahkan aturan shell/SW dan aset rilis, lalu periksa respons host target. Ini inferensi konfigurasi, bukan pengamatan HTTP produksi.')
h('F07 / P2 - Bobot identik terunduh ulang lintas rilis')
p('Key cache model memakai URL /r/&lt;rilis&gt;/..., bukan hash isi. Harness loader aktual memperoleh dua fetch untuk byte/hash yang sama pada dua prefix rilis. Besar transport model sekitar 104 MB EN-ID dan 107 MB ID-EN. Gunakan fingerprint/hash terverifikasi untuk reuse lintas rilis dan bersihkan cache rilis tidak aktif, sambil mempertahankan rilis yang sedang dipakai tab dan kemampuan rollback.')
h('F08 / P2 - Paket pembuktian produksi masih perlu tersedia')
p('ZIP deployment tidak memuat recipe/lockfile build, script patch engine, suite acceptance jurnal, atau laporan parity yang dirujuk manifest. Paket source/build/QA terpisah diperlukan untuk menilai reproducibility; file pengembangan tidak perlu ditambahkan ke unduhan awal konsumen. Ketiadaan di ZIP ini tidak membuktikan paket tersebut tidak ada di tempat lain.')
h('F09 / P3 - Catatan versi belum sinkron')
p('MODEL_NOTICE masih menyebut PDF.js 5.6.205 dan /licenses/. Library/worker aktual sudah 6.2.108; versi ini tercantum sebagai patch pada advisory yang relevan [W2]. Perbarui notice dan lokasi atribusi. Versi patch tersebut bukan sertifikat bebas semua kerentanan.')
note('Bukti: integrity/findings.json; runtime_integrity_probe.json; header_rule_analysis.json; integrity_checks.json. Dari 13 assertions harness, 12 memverifikasi perlindungan/perilaku baik dan satu membuktikan unduh ulang lintas rilis.')

title(10,'Syarat rilis yang konkret dan dapat diuji')
p('Kesiapan produksi harus dinilai untuk ruang lingkup PDF, bahasa, perangkat, dan renderer yang ditetapkan. Tidak ada dasar untuk menjanjikan akurasi universal 100% pada semua jurnal. Kriteria berikut adalah target penerimaan yang direkomendasikan, bukan klaim telah lulus.')
table(['Gerbang','Bukti minimum yang diperlukan','CP18 saat audit'],[
 ('G1 / Input & alur','PDF-only; alur utama unggah-tekan-unduh tanpa editor/glosarium/review wajib.','Jalur tersedia; UI perlu disederhanakan; browser belum disahkan.'),
 ('G2 / Kelengkapan PDF','Korpus digital/scan/campuran, dua kolom, tabel, footnote, sitasi; tidak ada bagian penting terlewat tanpa tanda.','Deteksi campuran membaik; akurasi OCR dan cakupan luas belum terbukti.'),
 ('G3 / Matematika','Semua regresi pangkat, indeks, pecahan, integral, matriks, prime, aksen, nomor persamaan lolos secara struktur dan rendering.','Gagal pada contoh aktual.'),
 ('G4 / Makna dua arah','Korpus jurnal terpisah dari contoh pengembangan; referensi/adjudikasi penilai yang kompeten; nilai kesalahan kritis, istilah, negasi, kuantor, relasi.','Gagal pada contoh aktual; tidak ada benchmark penerimaan.'),
 ('G5 / Markdown akhir','File dibuka pada renderer yang ditetapkan; rumus tampil benar; struktur artikel/tabel/sitasi tertib; tidak membutuhkan ZIP untuk rumus utama.','Gagal pada desain dan keluaran saat ini.'),
 ('G6 / Browser & sumber daya','Browser/perangkat sasaran, cancel/resume, quota, tab bersaing, BFCache, offline/update, batas file/halaman.','Sebagian kode/harness baik; browser aktual belum diuji.'),
 ('G7 / Deployment & build','Build ulang dari sumber terkunci, parity konversi model, header/MIME/shard HTTP, hash rilis, rollback.','Integritas internal lulus; bukti lain belum tersedia.'),
 ('G8 / Lazy operation','Tidak mengunduh model/PDF/OCR saat idle; arah yang dipakai saja; reuse model lintas rilis; pembersihan otomatis.','Shell lazy lulus harness; reuse lintas rilis perlu perbaikan.')
],[93,275,W-368])
h('Urutan pengerjaan yang disarankan')
p('<b>Pertama:</b> selesaikan F01-F04 sebagai satu rangkaian hasil: pembacaan matematika, perlindungan notasi, mutu bahasa, dan serialisasi .md. <b>Kedua:</b> kalibrasi guard dan pemulihan internal sehingga alur normal tidak bergantung pada koreksi pengguna. <b>Ketiga:</b> sederhanakan layar hasil dan rapikan cache/build. <b>Terakhir:</b> jalankan gerbang browser/hosting serta korpus penerimaan pada artefak rilis yang sama.')
note('Nol perubahan kritis pada suite regresi yang disepakati adalah kriteria terbatas yang dapat diuji. Hasil tersebut tetap tidak menjamin nol kesalahan pada seluruh PDF yang belum pernah diuji. Evaluasi semantik independen belum dilakukan oleh audit ini.')

title(11,'Peta kode, batas audit, dan rujukan')
table(['File / kelompok','Tanggung jawab yang diperiksa'],[
 ('main.js / storage.js','Pemilihan file, alur translate/download, status, penyimpanan, koreksi, writer epoch, resume, penghapusan.'),
 ('pdf-reader.js / layout.js / layout.worker.js','Parsing/OCR plan, normalisasi koordinat, urutan blok, klasifikasi, item coverage, asset budget, worker layout.'),
 ('translation.js / semantic-spans.js','Deteksi bahasa, segmentasi, perlindungan istilah/notasi, kandidat, audit angka/relasi, rejection/retry, tabel.'),
 ('export.js','Markdown tunggal, bilingual/sumber/ZIP, literal escaping, aset, QA/ledger, pembatalan.'),
 ('offline.js / build-info.js','Persiapan offline eksplisit, verifikasi manifest, identitas rilis/model.'),
 ('styles.css / index.html / manifest / icon','Struktur antarmuka, input PDF, kontrol opsional, ekspor, responsive CSS, fokus keyboard dan reduced motion secara statis.'),
 ('sw.js / _headers / worker / vendor / model','Rilis/cache, integritas dan security headers, runtime/parser aktual, provenance/model shards dan lisensi.')
],[202,W-202])
h('Batas yang material')
p('Chromium terpasang tetapi lingkungan menolak socket process singleton sebelum aplikasi dimuat. Karena itu tidak ada klaim lolos UI desktop/mobile, klik unduh, BFCache, IndexedDB quota, atau offline browser end-to-end. Ini keterbatasan lingkungan audit, bukan bukti website crash. Tidak ada URL deployment target yang diuji; tidak ada publikasi eksternal.')
p('PDF fixture merupakan contoh sintetis terkontrol, bukan jurnal asli pengguna atau korpus akurasi luas. Pengujian parser di Node memakai shim API standar; jembatan inferensi mengubah transport/paths dan diagnostik, bukan bobot model. Deteksi OCR diuji, pengenalan OCR tidak. Semua source asli tetap tidak berubah.')
h('Rujukan resmi yang diverifikasi')
note('[W1] Cloudflare Pages, Headers. https://developers.cloudflare.com/pages/configuration/headers/ (diakses 12 November 2026). Aturan yang cocok digabung; nilai header ganda dipisahkan koma.')
note('[W2] Mozilla PDF.js, GHSA-hq66-cqwq-w95j / CVE-2026-16633. https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j (diakses 12 November 2026). Versi patch yang dicantumkan: 6.2.108.')
note('[W3] GitHub Docs, Writing mathematical expressions. https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions (diakses 12 November 2026). LaTeX/MathJax pada Markdown yang didukung.')
note('Bukti terperinci dan cara reproduksi: paket pendamping, evidence/README_BUKTI.txt. Model/vendor tidak diduplikasi; gunakan ZIP CP18 dengan identitas pada halaman 2.')

def page_canvas(c,doc):
    c.saveState();w,h=doc.pagesize
    c.setStrokeColor(LINE);c.line(42,38,w-42,38)
    c.setFont('AuditSans',7.2);c.setFillColor(MUTED)
    c.drawString(42,25,'SEMANTIK SETARA CP18  |  Audit independen  |  12 November 2026')
    c.drawRightString(w-42,25,str(doc.page));c.restoreState()

doc=SimpleDocTemplate(str(DEST),pagesize=(595.28,841.89),leftMargin=42,rightMargin=42,topMargin=43,bottomMargin=51,title='Audit CP18 - PDF ke Markdown ilmiah',author='Independent technical audit',subject='PDF-only scientific EN-ID and ID-EN translation, mathematics, production readiness')
doc.build(story,onFirstPage=page_canvas,onLaterPages=page_canvas)
print(DEST)
