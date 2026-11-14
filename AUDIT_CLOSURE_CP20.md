# Ledger penutupan CP20

Build `cp20-8c643bea6962471f`. **CHECKPOINT_NOT_PRODUCTION_READY.**

PASS menutup cacat dalam lingkup bukti yang dinyatakan; tidak berarti seluruh produk lulus. FAIL adalah kegagalan yang teramati. NOT_RUN berarti kualifikasi belum lengkap; BLOCKED membutuhkan lingkungan/akses yang belum tersedia.

| ID | Temuan | Status |
|---|---|---|
| AUD-01 | PDF >300 halaman ditolak | **PASS** |
| AUD-02 | Kesalahan makna/istilah lolos guard | **FAIL** |
| AUD-03 | Bab setelah referensi tidak diterjemahkan | **PASS** |
| AUD-04 | Batas karakter/aset dan penampungan dokumen penuh | **FAIL** |
| AUD-05 | Ekstraksi parsial belum tersedia bagi exporter | **PASS** |
| AUD-06 | Persiapan offline menolak manifest CP19 | **BLOCKED** |
| AUD-07 | Citra penuh/dobel memperbesar MD | **PASS** |
| AUD-08 | Makna, matematika/OCR, beban dan hosting belum dikualifikasi penuh | **FAIL** |
| AUD-09 | Heading/list belum menjaga struktur buku | **PASS** |
| AUD-10 | Ajakan retry tidak sesuai predicate rejected | **PASS** |
| AUD-11 | Notice/lisensi ditolak service worker | **PASS** |
| AUD-12 | Teks bantuan kecil; UX panjang belum dikualifikasi | **NOT_RUN** |
| CP20-N01 | Identifier-only fragment menolak seluruh paragraf sebelum prosa inferensi | **PASS** |
| CP20-N02 | Halaman jarang gagal mengenali judul asing lalu references bocor | **PASS** |
| CP20-N03 | Running journal header mengakhiri references padahal sitasi berlanjut | **PASS** |
| CP20-N04 | OCR label berhasil tetapi gambar/diagram penting hilang dari Markdown | **PASS** |
| CP20-N05 | Cakupan OCR/rumus belum pasti dapat disebut complete dan warning halaman hilang | **PASS** |
| CP20-N06 | Quota browser nyata gagal walau estimate menampilkan ruang; source Blob ditulis ulang berlebihan | **PASS** |
| CP20-N07 | Halaman volatile berisiko tertimpa saat navigasi atau resume sesudah gagal simpan | **PASS** |
| CP20-N08 | Ekspor penyelamatan menyebut halaman volatile sudah tersimpan | **PASS** |
| CP20-N09 | Bahasa forced→auto mempertahankan deteksi lama pada resume | **PASS** |
| CP20-N10 | Update menghilangkan lazy module namespace rilis lama untuk tab aktif | **PASS** |
| CP20-N11 | Kurva/brace/nomor persamaan ambigu berpotensi dianggap struktur rumus verified | **PASS** |
| CP20-N12 | ETA sesudah resume terlalu pendek karena halaman replay dihitung sebagai kerja baru | **PASS** |
| CP20-N13 | Riwayat kegagalan/pemulihan simpan hilang sesudah reload lalu save | **PASS** |
| CP20-N14 | Already-English short metadata is rejected during ID→EN document processing | **FAIL** |
| CP20-N15 | Authentic85.9MB PDF cannot be persisted in this cloud browser | **FAIL** |

## AUD-01 — PDF >300 halaman ditolak

**PASS** · IMPLEMENTED_AND_VERIFIED_FOR_RECORDED_FIXTURES

**Penyebab:** CP19 menolak jumlah halaman >300 sebelum ekstraksi; penampungan seluruh dokumen menghalangi kenaikan batas yang aman.

**Perubahan:** Pembaca membatasi sampai 2.000 halaman/100 MiB dengan pengaman per halaman. Alur baru bekerja satu halaman: ekstrak, commit atomik, terjemahkan, commit, lepas. Resume dan ekspor memakai pembacaan halaman bertahap.

**Batas atau pekerjaan tersisa:** Broad book/scan/layout/device qualification and scientific meaning remain open in other gates. Synthetic long fixtures repeat ten conceptual templates; no universal 1500-page promise. 1001 inference occurred on1668, final8c restored/exported it with explicit component/output-parity binding; 1500 consumer inference/export occurred on8c. Rejected blocks remain visibly partial.

**Berkas:**

- app/app/pdf-reader.js
- app/app/long-document.js
- app/app/main.js
- app/app/storage.js
- app/app/export.js

**Pengujian:**

- Parser PDF.js aktual pada 300/301/1000/1001/1500 halaman dan rich 1001 halaman
- Ekspor sumber satu Markdown per fixture; bukan terjemahan
- Pipeline terkontrol 1500 halaman unik; bukan bukti inferensi
- Actual browser1001 and1500 PDF→local inference→single downloaded Markdown, complete page/block IDs; semantic completion evaluated separately

**Bukti:**

- evidence/cp20/qa/capacity-parser-final/RESULTS.json
- evidence/cp20/qa/capacity-export-8c-final/RESULTS.json
- evidence/cp20/qa/CAPACITY_FINAL_BUILD_BINDING.json
- evidence/cp20/pipeline/controlled-results.json
- evidence/cp20/qa/LONG_1668_FINAL_COMPONENT_BINDING.json
- evidence/cp20/release/ETA_HISTORY_FINAL_BINDING.json
- evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json
- evidence/cp20/browser/final-1668/BROWSER_1001_COMPLETE.json
- evidence/cp20/qa/LONG_1668_FINAL_COMPONENT_BINDING.json


## AUD-02 — Kesalahan makna/istilah lolos guard

**FAIL** · PARTIAL_TECHNICAL_REPAIR

**Penyebab:** Model lokal dan guard lama tidak menjaga seluruh hubungan, istilah dan pembatas ilmiah; status translated disalahartikan bila dianggap bukti mutu.

**Perubahan:** Terminologi berbasis konteks, penjagaan finite/hingga, negasi/modalitas, larutan, demand, convergence, katalis, identitas teknis dan aturan pemulihan diperbaiki. Identitas RULESET/fingerprint diperbarui. Bobot model tidak diganti tanpa kualifikasi.

**Batas atau pekerjaan tersisa:** Fresh v4 ten cases:9translated,1rejected,4critical targets by AI review; zero human approvals. Technical semantic failure remains. Larger M2M100 experiment did not demonstrate a replacement advantage; pipeline differences and limitations are documented.

**Berkas:**

- app/app/translation.js
- app/app/semantic-spans.js
- app/app/claim-guards.js

**Pengujian:**

- Kontrol istilah dan guard; regresi ilmiah bawaan
- Inferensi model asli kedua arah; acceptance v4 baru setelah pembekuan mekanis
- Penilaian AI dibedakan dari review manusia

**Bukti:**

- evidence/cp20/semantics/guards.json
- evidence/cp20/semantics/V4_MECHANICAL_INFERENCE.json
- evidence/cp20/semantics/V4_FRESH_ACCEPTANCE.json
- evidence/cp20/semantics/IMPLEMENTATION_AND_STATUS.md
- evidence/cp20/semantics/V4_SEMANTIC_REVIEW_AI.json
- evidence/cp20/semantics/V4_FINAL_DIST_SEMANTIC_BINDING.json
- evidence/cp20/semantics/FINAL_COMPONENT_PARITY_BINDING.json
- evidence/cp20/semantics/V4_HUMAN_REVIEW_BILINGUAL.csv
- evidence/cp20/semantics/alternatives/ALTERNATIVE_MODEL_ASSESSMENT.md
- evidence/cp20/semantics/FINAL_COMPONENT_PARITY_BINDING.json
- evidence/cp20/semantics/alternatives/ALTERNATIVE_MODEL_ASSESSMENT.md


## AUD-03 — Bab setelah referensi tidak diterjemahkan

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Reset References memakai daftar judul khusus. Perbaikan awal juga menemukan font median halaman jarang dan running header yang keliru.

**Perubahan:** Batas judul struktural tidak bergantung daftar kata. Font badan diperkirakan berbobot karakter agar halaman jarang tetap terbaca. Heading kecil di tepi yang langsung diikuti sitasi mempertahankan bibliografi. Blok referensi memiliki preservationReason.

**Batas atau pekerjaan tersisa:** PASS menutup cacat yang direproduksi; tidak membuktikan seluruh tata letak buku atau OCR. Ikatan hash modul terhadap build final tetap wajib.

**Berkas:**

- app/app/layout.js

**Pengujian:**

- PDF audit asli: bab sesudah References
- PDF baru lima halaman: judul asing, bibliografi tengah buku, continuation dan list
- Fixture warisan references-continuation; sparse heading tanpa sinyal bold

**Bukti:**

- evidence/cp20/qa/reference-real-parser.json
- evidence/cp20/structure/RESULTS.json
- evidence/cp20/structure/inherited-reader-console.json


## AUD-04 — Batas karakter/aset dan penampungan dokumen penuh

**FAIL** · IMPLEMENTED_AND_PARTLY_QUALIFIED

**Penyebab:** CP19 menyimpan teks, Blob, raster, hasil restore dan string ekspor seluruh dokumen; batas 2 juta karakter/128 MiB aset menjadi penghalang.

**Perubahan:** Page queue satu aktif, commit halaman atomik, lazy load metadata/halaman, invalidasi provenance per halaman, pelepasan payload, dan output OPFS bertahap. Blob fallback 32 MiB untuk kemampuan tanpa OPFS dibatasi eksplisit. Batas per halaman dipertahankan; tidak menghapus seluruh pengaman.

**Batas atau pekerjaan tersisa:** Actual browser could not persist85.9MB authentic source: QuotaExceededError; translation correctly blocked until source saved. No universal cap inferred. Authentic1062-page85.9MB source traversal exceeds2Mchars and processes56.8MBassets with one active page. Browser persistent storage and full translated export of that richly illustrated book remain unqualified;646pages have incomplete content flags in Node. No whole-browser RAM/device qualification.

**Berkas:**

- app/app/long-document.js
- app/app/storage.js
- app/app/pdf-reader.js
- app/app/main.js
- app/app/export.js

**Pengujian:**

- Pipeline terkontrol >2 juta karakter/1500 halaman
- Parser rich 1001 halaman melewati 2 juta karakter lalu source-only MD
- Atomicity/stale writer/config invalidation dan OPFS boundary
- Uji ukuran input terpisah

**Bukti:**

- evidence/cp20/pipeline/controlled-results.json
- evidence/cp20/qa/capacity-parser-final/RESULTS.json
- evidence/cp20/qa/capacity-export-8c-final/RESULTS.json
- evidence/cp20/qa/byte-limit.json
- evidence/cp20/structure/RESULTS.json
- evidence/cp20/qa/authentic-parser/SUMMARY.json
- evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json
- evidence/cp20/browser/final-8c643/AUTHENTIC_BOOK_PREFLIGHT.json


## AUD-05 — Ekstraksi parsial belum tersedia bagi exporter

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Halaman committed hanya berada di partialPages sementara state.document null; UI/eksportir tidak dapat menjangkau sumber yang sudah berhasil diekstrak.

**Perubahan:** Hasil sumber tersedia segera setelah commit. Kegagalan ekstraksi/model menyisakan prefix yang dapat dilihat dan diekspor. Kegagalan simpan mempertahankan tepat satu halaman belum tersimpan; ekspor menyertakannya dengan label jujur, dan retry menyimpan halaman tersebut.

**Batas atau pekerjaan tersisa:** Cacat keterjangkauan hasil parsial tertutup pada regresi. Seluruh matriks tutup paksa, sleep/wake fisik, BFCache dan browser final masih perlu laporan terpisah; evidence browser pra-perbaikan bukan kelulusan final.

**Berkas:**

- app/app/main.js
- app/app/long-document.js
- app/app/storage.js
- app/app/export.js

**Pengujian:**

- Kegagalan ekstraksi setelah halaman sukses; source recovery
- Quota rollback, stale writer, storage denial, dan page overlay
- Ekspor parsial mengecek urutan/ID/count dan menolak kehilangan halaman

**Bukti:**

- evidence/cp20/pipeline/controlled-results.json
- evidence/cp20/math/INDEPENDENT_PIPELINE_REVIEW.json
- evidence/cp20/structure/RESULTS.json
- evidence/cp20/pipeline/quota-recovery-results.json


## AUD-06 — Persiapan offline menolak manifest CP19

**BLOCKED** · IMPLEMENTED_CONTROLLED_TEST_PASS

**Penyebab:** offline.js menerima namespace CP18 hard-coded sementara manifest CP19 berbeda. Preview juga mengubah byte HTML sehingga validasi integritas yang benar menolaknya.

**Perubahan:** Identitas manifest diturunkan dari BUILD_INFO aktual; release/version/source/base/model/cache/ukuran/hash/jalur diverifikasi sebelum cache berubah. Byte tidak cocok tetap gagal tertutup.

**Batas atau pekerjaan tersisa:** Bug identitas telah diperbaiki. Browser offline-reload-PDF/scan-inference, update pekerjaan aktif dan rollback hosting final belum dibuktikan. Preview diketahui menyisipkan HTML; Cloudflare yang menyajikan byte/header utuh belum tersedia sebagai kelulusan. Tidak ada pelemahan integritas.

**Berkas:**

- app/app/offline.js
- scripts/build.py
- scripts/sw-template.js

**Pengujian:**

- Manifest build aktual dan 12 mutasi rusak
- Persiapan seluruh aset aktual, cache ulang, abort/quota, korupsi cache dan jaringan berubah
- Node VM memakai Cache/fetch/lifecycle doubles; bukan offline browser

**Bukti:**

- evidence/cp20/release/OFFLINE_RELEASE_REGRESSION.json
- evidence/cp20/release/FINAL_BINDING.json
- evidence/cp20/browser/pre-storage-fix/BROWSER_EVIDENCE.json


## AUD-07 — Citra penuh/dobel memperbesar MD

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Citra sumber penuh ditanam untuk tiap halaman dan aset identik muncul berulang pada blok/fallback halaman.

**Perubahan:** Gambar memakai satu definisi referensi Markdown per SHA-256 isi; payload identik tidak ditanam ulang walau path berbeda. Bukti halaman digital biasa opsional. Embedded raster/vector dan fallback penting ditandai preserveVisualSource sehingga tidak hilang ketika OCR label berhasil.

**Batas atau pekerjaan tersisa:** Batas klaim: sebagian gambar penting tetap memakai raster satu halaman bila crop individual belum andal. Kompatibilitas data URI diuji pada renderer yang dinyatakan, bukan semua editor. Beban aset besar/perangkat termasuk AUD-04/08.

**Berkas:**

- app/app/export.js
- app/app/pdf-reader.js

**Pengujian:**

- Deduplikasi path/isi dan rendering Marked/KaTeX
- Required image dengan opsi page evidence mati
- PDF nyata tiga halaman: batang terisi, kurva dan shading; visual sumber diverifikasi

**Bukti:**

- evidence/cp20/structure/RESULTS.json
- evidence/cp20/math/VECTOR_PRESERVATION.json
- evidence/cp20/math/VECTOR_FIGURES_SOURCE.md


## AUD-08 — Makna, matematika/OCR, beban dan hosting belum dikualifikasi penuh

**FAIL** · PARTIAL_TECHNICAL_REPAIR

**Penyebab:** Gerbang mutu, matematika/OCR, beban/perangkat dan hosting tidak mempunyai bukti lengkap; beberapa kemampuan benar-benar masih gagal atau di luar rekonstruksi andal.

**Perubahan:** Akar digital terisolasi direkonstruksi hanya dengan overbar unik; kurva/brace, label persamaan ambigu dan OCR tidak boleh menjadi LaTeX verified. Source visual dan penanda cakupan/rumus tidak pasti dipertahankan serta mencegah status selesai.

**Batas atau pekerjaan tersisa:** Akar kompleks/indexed, cases/sistem, matematika scan, formula merged/multilevel table, pembacaan kompleks, perangkat fisik, total RAM dan hosting final belum memenuhi gerbang. Fallback gambar bukan rekonstruksi LaTeX yang sukses. Review manusia belum tersedia.

**Berkas:**

- app/app/math-geometry.js
- app/app/pdf-reader.js
- app/app/long-document.js
- app/app/export.js
- tests/cp20-math-qualification.mjs

**Pengujian:**

- Delapan persamaan audit dan mutasi geometri
- Kontrol PDF/KaTeX nyata untuk akar, brace dan label ambigu
- Lifecycle incomplete OCR dan visual vector-only
- Semantik v4 tetap menunjukkan kesalahan kritis

**Bukti:**

- evidence/cp20/math/QUALIFICATION.json
- evidence/cp20/math/REAL_PDF_CONTROL.json
- evidence/cp20/math/INDEPENDENT_PIPELINE_REVIEW.json
- evidence/cp20/math/VECTOR_PRESERVATION.json
- evidence/cp20/semantics/V4_FRESH_ACCEPTANCE.json
- evidence/cp20/semantics/V4_SEMANTIC_REVIEW_AI.json
- evidence/cp20/semantics/FINAL_COMPONENT_PARITY_BINDING.json
- evidence/cp20/qa/authentic-parser/SUMMARY.json
- evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json
- evidence/cp20/qa/QA_SUMMARY.json


## AUD-09 — Heading/list belum menjaga struktur buku

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Exporter meratakan judul menjadi ### dan memakai nomor halaman sebagai struktur utama; list literal di-escape tanpa model list.

**Perubahan:** Heading level dipertahankan di bawah judul dokumen. Nomor halaman menjadi komentar provenance. Ordered/bullet lists mempunyai schema list eksplisit, continuation dan serialisasi aman. HTML sumber tetap di-escape.

**Batas atau pekerjaan tersisa:** Cacat yang direproduksi tertutup. Hierarki arbitrer, footnote kompleks, merged table dan paragraf lintas halaman tidak otomatis dianggap sempurna; kualifikasi jenis dokumen tetap terbuka pada AUD-08.

**Berkas:**

- app/app/layout.js
- app/app/export.js

**Pengujian:**

- Level heading 1/2 menghasilkan hierarki berbeda
- List bernomor/bullet dan continuation item tercakup
- Marked membentuk list yang benar; source HTML tidak dieksekusi

**Bukti:**

- evidence/cp20/structure/RESULTS.json
- evidence/cp20/qa/reference-real-parser.json


## AUD-10 — Ajakan retry tidak sesuai predicate rejected

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Penolakan deterministik tidak retryable tetapi pesan meminta mengulang tindakan identik.

**Perubahan:** Penolakan deterministik meminta perubahan sumber/glosarium atau koreksi hasil; transient failure tetap dapat diulang. Retry/table/cache memakai metadata outcome yang konsisten. Pesan ekspor mengikuti tindakan yang tersedia.

**Batas atau pekerjaan tersisa:** PASS adalah kontrak deterministik dan pesan, bukan jaminan kandidat retry berikutnya benar. Pemeriksaan tindakan UI final dilaporkan terpisah.

**Berkas:**

- app/app/translation.js
- app/app/export.js
- app/app/main.js

**Pengujian:**

- Kontrol deterministic rejection/transient retry/cache
- Parity hasil model sebelum/sesudah metadata pemulihan
- Tabel mengagregasi retryability tanpa false success

**Bukti:**

- evidence/cp20/semantics/guards.json
- evidence/cp20/semantics/RECOVERY_METADATA_PARITY.json
- evidence/cp20/structure/RESULTS.json


## AUD-11 — Notice/lisensi ditolak service worker

**PASS** · IMPLEMENTED_CONTROLLED_TEST_PASS

**Penyebab:** MODEL_NOTICE dan licenses dikemas tetapi tidak menjadi anggota RECORDS sehingga service worker menolak jalur yang sebenarnya sah.

**Perubahan:** Notice dan semua lisensi masuk inventory hash/ukuran dan disajikan oleh service worker dengan integritas yang sama. Jalur asing tetap ditolak.

**Batas atau pekerjaan tersisa:** Cacat inventory/handler tertutup pada exact generated bytes. Browser/hosting final tetap bagian AUD-06/08; ini bukan audit legal lisensi.

**Berkas:**

- scripts/build.py
- scripts/sw-template.js

**Pengujian:**

- Worker hasil build menyajikan 33 dokumen notice/lisensi setelah jaringan pada boundary uji dihapus
- Korupsi hash dan unknown path tetap ditolak

**Bukti:**

- evidence/cp20/release/OFFLINE_RELEASE_REGRESSION.json
- evidence/cp20/release/FINAL_BINDING.json


## AUD-12 — Teks bantuan kecil; UX panjang belum dikualifikasi

**NOT_RUN** · IMPLEMENTED_AND_PARTLY_QUALIFIED

**Penyebab:** Label/help 8–11 px dan progres panjang tidak cukup membedakan pekerjaan, hasil aman tersimpan, bagian belum selesai serta pemulihan.

**Perubahan:** Teks bantuan/kontrol utama diperbesar, target sentuh/focus dijaga, progres tahap/halaman/tersimpan dan estimasi berdasarkan laju aktual ditambahkan. Status needs-attention, quota, offline dan unsaved dibedakan. Koreksi final mengecualikan replay halaman cache dan halaman resume sebagian dari sampel ETA; estimasi memakai delapan halaman kerja penuh terakhir setelah sedikitnya tiga sampel.

**Batas atau pekerjaan tersisa:** Initial390px layout and14px help passed; actual controls/long lifecycle evidence exists. Physical small-device, complete accessibility/usability, zoom and sleep/wake/process-kill qualification remain open.

**Berkas:**

- app/app/styles.css
- app/index.html
- app/app/main.js
- app/app/long-document.js

**Pengujian:**

- Smoke Chrome pra-perbaikan: viewport 390px tanpa heavy idle resources dan bantuan 14px
- Regresi lifecycle progress/pause/recovery
- Browser final, keyboard/zoom dan pekerjaan panjang sedang diverifikasi oleh integrator
- Final8c actual keyboard pause/resume, tab-close/reopen, paused BFCache return, and1500-page processing; browser zoom shortcut did not change viewport, so zoom is NOT_RUN

**Bukti:**

- evidence/cp20/browser/pre-storage-fix/BROWSER_EVIDENCE.json
- evidence/cp20/pipeline/lifecycle-regression.log
- evidence/cp20/pipeline/IMPLEMENTATION_NOTES.md
- evidence/cp20/pipeline/eta-resume-results.json
- evidence/cp20/release/ETA_HISTORY_FINAL_BINDING.json
- evidence/cp20/browser/final-8c643/LIFECYCLE_OBSERVATIONS.json
- evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json


## CP20-N01 — Identifier-only fragment menolak seluruh paragraf sebelum prosa inferensi

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Atom huruf/angka/underscore/tanda hubung tidak dilindungi konsisten.

**Perubahan:** Identitas teknis umum dilindungi tanpa prefix fixture khusus; END/AKHIR tetap diperlakukan sebagai prosa bila tepat.

**Batas atau pekerjaan tersisa:** Binding paling baru diperbarui integrator; run gagal sebelum fix tetap historis.

**Berkas:**

- app/app/semantic-spans.js
- app/app/translation.js

**Pengujian:**

- Inferensi identifier dua arah dan regresi guard

**Bukti:**

- evidence/cp20/semantics/IDENTIFIER_INFERENCE.json
- evidence/cp20/semantics/IDENTIFIER_FINAL_BINDING.json


## CP20-N02 — Halaman jarang gagal mengenali judul asing lalu references bocor

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Upper median item-count memilih font judul18pt sebagai body karena hanya ada dua item; font subset tidak menyimpan nama bold.

**Perubahan:** Body font berbobot karakter; heading tidak membutuhkan nama font bold.

**Berkas:**

- app/app/layout.js

**Pengujian:**

- Sparse unknown title/no-bold
- PDF tengah buku nyata

**Bukti:**

- evidence/cp20/structure/RESULTS.json
- evidence/cp20/qa/reference-real-parser.json


## CP20-N03 — Running journal header mengakhiri references padahal sitasi berlanjut

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Setiap heading terdeteksi dianggap bab baru.

**Perubahan:** Heading margin kecil yang langsung diikuti sitasi mempertahankan state; judul asing diikuti prosa tetap menutupnya.

**Berkas:**

- app/app/layout.js

**Pengujian:**

- references-continuation.pdf warisan dan kontrol heading/prose

**Bukti:**

- evidence/cp20/structure/inherited-reader-console.json
- evidence/cp20/structure/RESULTS.json


## CP20-N04 — OCR label berhasil tetapi gambar/diagram penting hilang dari Markdown

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Tidak ada blok image ketika OCR berhasil; default tanpa citra halaman melewati aset sumber. Vector-only figure tidak dihitung sebagai raster.

**Perubahan:** preserveVisualSource mencakup visual raster/vector termasuk fill/shading; serializer selalu menyertakan aset wajib dan deduplikasi.

**Berkas:**

- app/app/pdf-reader.js
- app/app/export.js

**Pengujian:**

- OCR-success essential visual control
- PDF vector-only tiga halaman dan Marked

**Bukti:**

- evidence/cp20/structure/RESULTS.json
- evidence/cp20/math/VECTOR_PRESERVATION.json


## CP20-N05 — Cakupan OCR/rumus belum pasti dapat disebut complete dan warning halaman hilang

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Counter hanya menghitung target blok; page warnings tidak ikut ekspor stream.

**Perubahan:** Counter coverageIncompletePages/mathUncertainPages; image unread gagal, needs-attention; warning per halaman diekspor dan complete diverifikasi.

**Berkas:**

- app/app/long-document.js
- app/app/main.js
- app/app/pdf-reader.js
- app/app/export.js

**Pengujian:**

- Incomplete OCR/math lifecycle
- Exporter rejects inconsistent complete counts

**Bukti:**

- evidence/cp20/pipeline/controlled-results.json
- evidence/cp20/math/INDEPENDENT_PIPELINE_REVIEW.json
- evidence/cp20/structure/RESULTS.json


## CP20-N06 — Quota browser nyata gagal walau estimate menampilkan ruang; source Blob ditulis ulang berlebihan

**PASS** · IMPLEMENTED_PENDING_FINAL_QUALIFICATION

**Penyebab:** Estimate bukan jaminan write. Cache model publik dan rewrite source meningkatkan pressure origin.

**Perubahan:** Simpan source sekali; commit ringkasan/meta tanpa rewrite Blob. Pada QuotaExceededError hapus hanya cache model publik terverifikasi namespace/key, pertahankan worker/data, retry atomik sekali, tandai offline belum siap.

**Batas atau pekerjaan tersisa:** Observed automatic recovery at page252 removed5 public-model entries, retried once and continued to1001. This does not guarantee sufficient storage for every input/device; honest failure and rescue remain required.

**Berkas:**

- app/app/storage.js
- app/app/main.js
- app/app/long-document.js
- app/app/translation.js

**Pengujian:**

- Atomic write rollback
- Tujuh recovery controls namespace/non-quota/retry-once
- Probe Chrome sebelum perbaikan dan recovery manual

**Bukti:**

- evidence/cp20/pipeline/quota-recovery-results.json
- evidence/cp20/browser/storage-pressure/PROBE_BEFORE_CACHE_RELEASE.json
- evidence/cp20/pipeline/IMPLEMENTATION_NOTES.md
- evidence/cp20/browser/final-1668/BROWSER_1001_COMPLETE.json
- evidence/cp20/browser/final-1668/LIFECYCLE_OBSERVATIONS.json


## CP20-N07 — Halaman volatile berisiko tertimpa saat navigasi atau resume sesudah gagal simpan

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Commit gagal meninggalkan state aktif berbeda dari record yang durable.

**Perubahan:** Pertahankan satu unsavedPage, blokir navigasi berisiko, pakai overlay saat ekspor dan simpan overlay saat retry.

**Batas atau pekerjaan tersisa:** Kelengkapan browser final ditentukan evidence integrator, bukan hanya doubles.

**Berkas:**

- app/app/main.js
- app/app/long-document.js

**Pengujian:**

- Quota/storage denial lifecycle dan retained active page

**Bukti:**

- evidence/cp20/math/INDEPENDENT_PIPELINE_REVIEW.json
- evidence/cp20/pipeline/controlled-results.json


## CP20-N08 — Ekspor penyelamatan menyebut halaman volatile sudah tersimpan

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** committedPageCount dipakai sebagai jumlah tersedia dan dianggap seluruhnya durable.

**Perubahan:** unsavedPages eksplisit; header memisahkan tersedia dan durable latest version, menandai partial dan memperingatkan sebelum reload.

**Berkas:**

- app/app/export.js
- app/app/main.js

**Pengujian:**

- Quota-rescue header/count/invalid-unsaved-ID regression

**Bukti:**

- evidence/cp20/structure/RESULTS.json
- evidence/cp20/structure/FINAL_SOURCE_BINDING.json


## CP20-N09 — Bahasa forced→auto mempertahankan deteksi lama pada resume

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Metadata deteksi source lama bertahan ketika konfigurasi berubah.

**Perubahan:** Bersihkan deteksi yang tidak sesuai provenance dan deteksi ulang dari halaman yang diperlukan; invalidasi hasil mesin lazily sambil menjaga koreksi.

**Berkas:**

- app/app/long-document.js
- app/app/main.js

**Pengujian:**

- Forced-to-auto actual pipeline controlled lifecycle

**Bukti:**

- evidence/cp20/math/INDEPENDENT_PIPELINE_REVIEW.json
- evidence/cp20/pipeline/controlled-results.json


## CP20-N10 — Update menghilangkan lazy module namespace rilis lama untuk tab aktif

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Deploy hanya memuat namespace rilis baru sementara tab lama masih perlu lazy imports.

**Perubahan:** Retain immutable CP19 dengan inventory/hash/collision guard; worker tidak memaksa skipWaiting atau membuang cache lama.

**Batas atau pekerjaan tersisa:** Active-job browser update/rollback Cloudflare tetap BLOCKED/NOT_RUN terpisah; bukan reverse checkpoint migration.

**Berkas:**

- scripts/build.py
- scripts/build-with-history.py
- scripts/sw-template.js

**Pengujian:**

- Prior worker + retained lazy modules control
- Reproducible build current+retained assets

**Bukti:**

- evidence/cp20/release/OFFLINE_RELEASE_REGRESSION.json
- evidence/cp20/release/REPRODUCIBLE_BUILD.json


## CP20-N11 — Kurva/brace/nomor persamaan ambigu berpotensi dianggap struktur rumus verified

**PASS** · IMPLEMENTED_AND_REGRESSION_TESTED

**Penyebab:** Legacy curve kehilangan titik awal/kontrol; label persamaan terpisah bisa dibaca faktor; OCR bisa menyerupai glyph digital.

**Perubahan:** Provenance kurva lengkap, ambiguous label/brace unverified, OCR dikecualikan dari rekonstruksi digital; akar hanya dengan overbar unik.

**Batas atau pekerjaan tersisa:** Complex/indexed roots, cases dan scan tetap belum qualified; PASS pada false-verification defect yang diuji saja.

**Berkas:**

- app/app/math-geometry.js

**Pengujian:**

- 25 geometry controls
- 5 actual-PDF controls

**Bukti:**

- evidence/cp20/math/QUALIFICATION.json
- evidence/cp20/math/REAL_PDF_CONTROL.json


## CP20-N12 — ETA sesudah resume terlalu pendek karena halaman replay dihitung sebagai kerja baru

**PASS** · IMPLEMENTED_CONTROLLED_TEST_PASS

**Penyebab:** Durasi run dibagi posisi halaman absolut, termasuk halaman tersimpan yang hanya dibaca ulang.

**Perubahan:** Hitung ETA dari delapan halaman kerja penuh terakhir dalam run saat ini; mulai setelah tiga sampel. Replay halaman lengkap dan resume halaman sebagian tidak masuk throughput.

**Batas atau pekerjaan tersisa:** Parity hanya bukti terkontrol pada batas yang dinyatakan. Run browser 1668 tetap1668; full run pada final 8c tidak boleh disimpulkan dari parity.

**Berkas:**

- app/app/long-document.js

**Pengujian:**

- Cached replay exclusion, partial-resume exclusion, bounded sample dan before/after exact non-ETA record/write/request/progress parity
- Lima kontrol patch ETA/history lulus dan hash source cocok build final

**Bukti:**

- evidence/cp20/pipeline/eta-resume-results.json
- evidence/cp20/pipeline/ETA_HISTORY_CHANGELOG.md
- evidence/cp20/pipeline/ETA_HISTORY_PATCH.diff
- evidence/cp20/release/ETA_HISTORY_FINAL_BINDING.json
- evidence/cp20/browser/final-8c643/LIFECYCLE_OBSERVATIONS.json


## CP20-N13 — Riwayat kegagalan/pemulihan simpan hilang sesudah reload lalu save

**PASS** · IMPLEMENTED_CONTROLLED_TEST_PASS

**Penyebab:** storageRecoveries/storageFailures tidak dipulihkan dari metadata; save berikutnya dapat menimpa history dengan array kosong.

**Perubahan:** Restore lima event terakhir kedua daftar dari metadata, mempertahankan warning offline dan batas history.

**Batas atau pekerjaan tersisa:** Parity hanya bukti terkontrol pada batas yang dinyatakan. Run browser 1668 tetap1668; full run pada final 8c tidak boleh disimpulkan dari parity.

**Berkas:**

- app/app/main.js

**Pengujian:**

- Actual main dengan DOM/storage boundary memulihkan history; parity pipeline mengunci isi/tindakan selain ETA
- Lima kontrol patch ETA/history lulus dan hash source cocok build final

**Bukti:**

- evidence/cp20/pipeline/eta-resume-results.json
- evidence/cp20/pipeline/ETA_HISTORY_CHANGELOG.md
- evidence/cp20/pipeline/ETA_HISTORY_PATCH.diff
- evidence/cp20/release/ETA_HISTORY_FINAL_BINDING.json
- evidence/cp20/browser/final-8c643/LIFECYCLE_OBSERVATIONS.json


## CP20-N14 — Already-English short metadata is rejected during ID→EN document processing

**FAIL** · OBSERVED_NOT_PATCHED_TO_FIXTURE

**Penyebab:** Short mixed-language trace footer falls back to document source language; unchanged target is then rejected by the language guard.

**Perubahan:** No fixture-specific output or END-word exception inserted. Original text and clear rejected/partial markers remain.

**Batas atau pekerjaan tersisa:** Develop and independently evaluate generic mixed-language/metadata handling. Do not count these rejected blocks as successful translations or conflate them with the separate scientific prose errors.

**Berkas:**

- app/app/long-document.js
- app/app/translation.js

**Pengujian:**

- Actual Node and browser1500-ID synthetic document with distinct opaque IDs and English footer labels

**Bukti:**

- evidence/cp20/qa/real-inference-final-1668/capacity-1500-id-RESULTS.json
- evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json


## CP20-N15 — Authentic85.9MB PDF cannot be persisted in this cloud browser

**FAIL** · OBSERVED_WITH_SAFE_REFUSAL

**Penyebab:** Actual IndexedDB source write raises QuotaExceededError; exact remaining storage/per-device ceiling not established.

**Perubahan:** Existing failure state retains unsaved indication and blocks long processing until source checkpoint is safe. No bypass or false success added.

**Batas atau pekerjaan tersisa:** Qualify sufficient persistent quota on target devices and richer books. Safe failure is verified but capacity success for this book is not; do not imply a universal64MB/85MB cap.

**Berkas:**

- app/app/main.js
- app/app/storage.js
- app/app/long-document.js

**Pengujian:**

- Actual filechooser recognized1062pages; source persistence failed; Translate refused unsafe continuation.

**Bukti:**

- evidence/cp20/browser/final-8c643/AUTHENTIC_BOOK_PREFLIGHT.json

## Gerbang yang tetap terbuka

- Scientific semantic quality: FAIL
- Authentic85.9MB source persistence in current browser: FAIL; safe refusal observed
- Broad authentic book translation, complex OCR/math/table/content coverage: NOT_RUN or incomplete
- Physical minimum-device RAM/performance, sleep/wake/process kill and zoom: NOT_RUN
- Actual byte-exact hosting/offline/update/rollback: BLOCKED
- Human review:0 approvals; does not cure technical failures

Angka translated bukan skor akurasi. Run Node, kontrol/doubles, browser dan perangkat fisik dibedakan. Riwayat build dan binding komponen tidak disebut sebagai inferensi ulang.
