BUKTI AUDIT INDEPENDEN SEMANTIK SETARA CP18
Tanggal: 12 November 2026

Keputusan: belum layak dirilis sebagai penerjemah jurnal ilmiah satu langkah
dengan hasil Markdown dan matematika yang siap digunakan. Perbaikan integritas
dan lifecycle nyata, tetapi struktur matematika, makna terjemahan, dan format
Markdown masih memiliki kegagalan yang direproduksi.

ARTEFAK YANG DIAUDIT
SEMANTIK_SETARA_CP18_CANDIDATE_NOT_PRODUCTION_READY(1).zip
223289243 bytes; 297 file; 252014956 bytes setelah ekstraksi.
SHA-256: 32743e819993a011c5ff4f34de90292a76c29d9963f1258542be5382965df2dc
Release: cp18-7a8e787a497535f5; versi aplikasi: 0.18.0.

PRINSIP PENILAIAN
Alur konsumen yang diminta: pilih/unggah PDF -> tekan Terjemahkan -> unduh satu .md.
Bahasa: Inggris-Indonesia dan Indonesia-Inggris. Pertahankan lazy interaction.
Tinjauan manual per blok tidak boleh dijadikan syarat normal untuk menyelesaikan
produk. Pemeriksaan internal tetap perlu. Status selesai memproses bukan bukti
kesetaraan makna ilmiah.

ISI PAKET
file_inventory.json: ukuran dan SHA-256 untuk seluruh 297 file asli.
consolidated_findings.json: sembilan temuan prioritas beserta ruang lingkup.
browser/ui_contract_and_scope.json: inspeksi alur UI dan batas uji browser.
browser/academic_prose_en.pdf dan academic_prose_id.pdf: input sintetis terkontrol.
browser/FRESH_TRANSLATION_en-id.md dan FRESH_TRANSLATION_id-en.md: Markdown baru
  hasil parser, layout, model aktual, dan exporter CP18.
browser/prose_pipeline_results.json: sumber/blok, hasil, status, dan masalah.
browser/prose_pipeline.mjs: reproduksi core pipeline di Node; bukan browser E2E.
pdf_math/: PDF matematika dan halaman campuran digital/raster, hasil parser,
  Markdown aktual, normalisasi item, dan skrip reproduksi.
engine/: 34 kasus model aktual (28 kasus terarah + 6 kontrol notasi), 12 uji guard
  terpisah, log, skrip, dan temuan.
integrity/: pemeriksaan hash, rekonstruksi shard, manifest, kebijakan cache,
  dan 13 assertions fungsi aktual dengan transport/cache terkontrol.
source_excerpts.txt: potongan kode sumber bernomor baris yang dirujuk laporan.
EVIDENCE_MANIFEST.json: hash isi paket bukti ini, di luar manifest itu sendiri.

CARA MEMBACA HASIL
1. Empat P1 merupakan penghalang langsung kebutuhan produk: ekstraksi matematika,
   kerusakan notasi saat terjemahan, makna ilmiah keliru, dan exporter .md literal.
2. Empat P2 mencakup false positive guard, cache HTTP, cache model lintas rilis,
   serta bukti build/acceptance yang belum tersedia pada ZIP deployment.
3. Satu P3 adalah dokumentasi versi/lokasi lisensi yang belum konsisten.
4. PASS pada reproduksi unduh ulang model berarti perilakunya berhasil dibuktikan,
   bukan berarti perilaku itu diterima sebagai kriteria rilis.
5. Perubahan unit buatan dalam validator-results.json bukan semuanya keluaran model.
6. Semua PDF fixture sintetis dan dibuat untuk audit; bukan jurnal terbit atau
   panduan kesehatan. Hasil ini tidak menghasilkan persentase akurasi jurnal.

REPRODUKSI
Ekstrak paket bukti sehingga folder evidence berada di dalam folder audit_cp18.
Ekstrak ZIP CP18 asli ke folder audit_cp18/source (index.html di dalam source).
Jangan mengekstrak input tidak tepercaya tanpa pemeriksaan path traversal.
Gunakan Node modern yang menyediakan Web APIs, Python 3, reportlab, Poppler,
dan @napi-rs/canvas. Set CODEX_PRIMARY_RUNTIME_NODE_MODULES ke direktori node_modules
yang berisi @napi-rs/canvas jika menjalankan di luar lingkungan audit.

Perintah dari folder induk audit_cp18:
  python3 audit_cp18/evidence/integrity/verify_files.py
  node audit_cp18/evidence/integrity/runtime_integrity_probe.mjs
  node audit_cp18/evidence/engine/real-model-probe.mjs
  node audit_cp18/evidence/engine/real-model-probe.mjs --notation
  node audit_cp18/evidence/engine/validator-probe.mjs
  node audit_cp18/evidence/pdf_math/extract_math_node.mjs
  node audit_cp18/evidence/browser/prose_pipeline.mjs

Skrip create_prose_fixtures.py dan make_math_fixture.py tersedia untuk merekonstruksi
input, tetapi PDF input yang dipakai audit sudah disertakan. Dependensi lingkungan
harus tersedia; paket bukti tidak menyertakan ulang model 200 MB atau vendor asli.

BATAS PEMBUKTIAN
- Browser Chromium lokal gagal saat membuat socket process singleton sebelum
  aplikasi dibuka. Tidak ada bukti UI desktop/mobile, download click, BFCache,
  IndexedDB quota, atau offline browser end-to-end yang berhasil dalam audit ini.
- Node bridge memakai byte model dan adapter aktual. Perubahan worker jembatan
  terbatas pada transport/paths, createRequire Node, dan pesan diagnosis.
- Parser memakai PDF.js aktual dengan shim API standar yang belum tersedia di
  Node dan canvas classes; source aplikasi/bundled PDF.js tidak dimodifikasi.
- Jalur inti PDF -> layout -> translator -> Markdown tidak menjalankan OCR,
  canvas capture aplikasi, checkpoint UI, atau click unduh browser.
- Deteksi wilayah OCR pada PDF campuran terbukti; akurasi pengenalan OCR tidak
  diukur. Tidak ada jurnal sumber pengguna baru dalam lampiran CP18 ini.
- Header Cloudflare dianalisis dari konfigurasi dan dokumentasi resmi, bukan
  hasil HTTP pada domain produksi. Tidak ada deployment eksternal dilakukan.
- Tidak adanya recipe/QA dalam ZIP deployment bukan bukti bahwa repositori atau
  paket source/QA terpisah tidak ada.
- Seluruh 297 hash source dibandingkan kembali setelah pengujian: tidak berubah.

SUMBER RESMI YANG DIPERIKSA
Cloudflare Pages headers:
https://developers.cloudflare.com/pages/configuration/headers/
Mozilla PDF.js advisory (versi patch 6.2.108):
https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j
GitHub Markdown math rendering:
https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions
