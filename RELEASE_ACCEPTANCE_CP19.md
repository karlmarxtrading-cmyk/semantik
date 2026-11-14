# Penerimaan CP19 — NOT PRODUCTION READY

Build `cp19-6ed0d134e1770b27`, versi `0.19.0`.

SHA-256 source: `6ed0d134e1770b2742b0c4c54e3a156bf1822443adea84e4de4ba0cd96308913`.

Implementasi CP19 telah dibangun, diuji, dan dikemas dari CP18 yang diverifikasi. Baseline serta checkpoint sebelumnya tidak ditimpa. Situs aktif tidak diganti. **Kandidat ini belum memenuhi semua gerbang produksi.**

## Keputusan gerbang

| Gerbang | Status | Hasil dan batas |
|---|---|---|
| G1 — Input dan alur | PASS terbatas pada alur yang diuji | Chrome menjalankan pilih PDF → terjemahkan otomatis → unduh satu MD dalam kedua arah. Non-PDF ditolak. Editor dan glosarium tidak wajib. |
| G2 — Pembacaan PDF | PARTIAL | Delapan kelas fixture, PDF rusak, dan jurnal berlisensi 49 halaman diuji. Seluruh layout kompleks, footnote, batas 100 MiB/300 halaman, dan perangkat minimum belum dikualifikasi. |
| G3 — Matematika | PARTIAL | Delapan persamaan audit direkonstruksi dan dirender; 27 regresi geometri lulus. Cakupan akar kompleks, sistem/cases, nomor persamaan, formula tabel dan scan belum lengkap. |
| G4 — Makna dua arah | FAIL | Inferensi kedua arah berjalan. Acceptance terpisah masih menunjukkan perubahan makna yang lolos guard, terutama CP19-A-010 dan A-012. Persetujuan manusia 0. |
| G5 — Markdown | PASS terbatas pada keluaran yang diuji | Tiga unduhan MD Chrome dirender dengan Marked 17.0.1 dan KaTeX 0.19.1. Rumus dan gambar mandiri, tidak ada aset lokal hilang atau stack trace. Contoh matematika tetap berlabel parsial karena satu penolakan. |
| G6 — Browser dan ketahanan | PARTIAL | Normal, password/rusak, cancel–reload–resume, konflik dua tab, jurnal 49 halaman, dan ekspor aktual diuji. BFCache, offline terputus, perangkat fisik low-memory, serta batas beban belum dikualifikasi. |
| G7 — Build dan hosting | BLOCKED_HOSTING | Build ulang identik; hash seluruh aset dan model lulus. Preview mengubah HTML dan tidak menerapkan `_headers`; pengujian Cloudflare, CSP, offline, update, dan rollback belum lulus. |
| G8 — Lazy operation | PARTIAL | Saat idle tidak ada model/PDF/OCR/runtime pada frame konsumen. Cache model menurut hash lulus tes terkontrol. Update/offline aktual dan respons pada perangkat minimum masih terbuka. |

PASS terbatas tidak berarti akurasi universal atau dukungan perangkat di luar pengujian. Status mesin yang rinci ada dalam `RELEASE_ACCEPTANCE_CP19.json`.

## Hasil aktual pada build yang sama

- **21 rangkaian regresi lulus**, dan 13 modul JavaScript lulus pemeriksaan sintaks. Di dalamnya terdapat 45 guard/regresi baru, 9 tes Markdown, 4 tes cache model, 77 regresi adapter, serta 51 pemeriksaan identitas ilmiah. Subtes tersebut tidak boleh dijumlahkan lagi dengan jumlah suite.
- **27 regresi geometri lulus**: delapan persamaan PDF audit, kontrol PDF independen, serta mutasi garis pecahan, kurva, rotasi, dan simbol tidak dikenal.
- Pipeline final menjalankan PDF.js, model WASM/ONNX lokal, exporter, dan renderer nyata. PDF matematika: 9 diterjemahkan, 8 dipertahankan, 1 ditolak. PDF Inggris: 13 diterjemahkan. PDF Indonesia: 11 diterjemahkan dan 2 judul/keterangan yang sudah berbahasa Inggris dipertahankan. Kontrol matematika: 2 diterjemahkan dan 7 dipertahankan.
- Browser Chrome menghasilkan **3 unduhan Markdown mandiri** serta **4 ZIP opsional**. CRC dan seluruh hash internal keempat ZIP cocok. Renderer memuat 12 ekspresi pada contoh matematika, termasuk 8 persamaan display utama; masing-masing contoh prosa memuat 3 ekspresi. Setiap MD memiliki satu citra sumber tertanam yang diperiksa.
- Harness browser mencatat 19 operasi: 16 uji fungsional berhasil dan 3 diagnostik berhasil merekam keadaan. Flag `pass` pada diagnostik tidak berarti header atau offline lulus; kegagalannya tercatat terpisah di `hosting-final.json`.
- Jurnal berlisensi 49 halaman dibaca/OCR dalam **83,349 detik** pada browser uji: 917 blok dan 163.144 karakter. Ini bukan terjemahan seluruh jurnal atau pengakuan akurasi OCR 100%.
- Build ulang menghasilkan **300 aset identik**, total 252.056.025 byte sebelum ZIP; aset terbesar 15.344.608 byte. **16 berkas model** beserta seluruh shard terkompresi dan hasil dekompresinya cocok ukuran serta SHA-256.
- Audit lockfile tooling melaporkan 0 kerentanan. Cakupannya dependensi QA terkunci, bukan sertifikasi keamanan seluruh vendor atau model.

## Kegagalan yang masih menghalangi produksi

1. **Kualitas ilmiah model.** Pada acceptance terpisah, CP19-A-010 kehilangan batas *finite/hingga*; A-012 merusak klaim katalis; A-008 mengubah relasi *observed actions*; A-016 memakai *requests* untuk *demand* ekonomi. Kelulusan guard pada 17 dari 18 kasus bukan skor akurasi. Pipeline menolak satu kasus dan mempertahankan sumber dengan label yang benar.
2. **Cakupan matematika.** Struktur yang belum didukung secara andal masih memerlukan implementasi dan pengujian lebih lanjut. Citra sumber serta label tidak terverifikasi adalah fallback yang jujur, bukan penyelesaian seluruh G3.
3. **Hosting/offline.** Preview menyisipkan 1.212 byte ke HTML. SHA-256 tidak cocok dan service worker menolaknya. Jangan melemahkan verifikasi. Diperlukan staging privat yang menyajikan byte build utuh dan menerapkan header Cloudflare.
4. **Perangkat dan beban.** BFCache, batas PDF maksimum, CPU, total memori termasuk WASM, serta perangkat fisik minimum belum dikualifikasi. JS heap tidak sama dengan RAM total. Fault injection Node tidak menggantikan bukti perangkat nyata.
5. **Review manusia.** Dua reviewer bilingual independen dan adjudicator belum memberikan penilaian. Form dan pasangan sumber–hasil disediakan. Persetujuan manusia tetap **0**.

## Ledger temuan audit

| Temuan | Status | Implementasi dan evidence |
|---|---|---|
| F01 | PARTIAL | `math-geometry.js` dan `pdf-reader.js`: geometri, AST, provenance, serta fallback. Lihat `geometry/regression-results.json` dan screenshot browser. Cakupan luas G3 masih terbuka. |
| F02 | Cacat yang dikenal ditutup | `semantic-spans.js`: prime, aksen, unit, Unicode, identitas. Guard dan hasil ekspor baru diuji; belum menjamin setiap notasi yang belum dikenal. |
| F03 | PARTIAL | Guard konteks, terminologi, dan strategi alternatif. 170 evaluasi engine alternatif nyata tidak mendukung penggantian model. Makna pada holdout masih gagal. |
| F04 | Cacat yang dikenal ditutup | `export.js` dan `markdown-math.js`: LaTeX, gambar data URI, batas persamaan inline, status parsial, kegagalan jika gambar hilang. Tiga unduhan Chrome dirender. |
| F05 | PARTIAL | Guard relasi/kuantor/negasi/istilah, retry terbatas, cache kalimat sukses. Kesalahan semantik yang belum tercakup masih lolos. |
| F06 | Source diperbaiki; hosting terbuka | Kebijakan Cache-Control dipisah. Lima path tidak bertumpuk dalam simulasi; respons Cloudflare aktual belum tersedia. |
| F07 | PARTIAL | Model menggunakan hash konten dengan validasi dan migrasi cache. Empat tes terkontrol lulus; update/offline/rollback browser masih terbuka. |
| F08 | Build statis lulus; konversi model belum diulang | Source, lockfile, patch, model, manifest, dan resep tersedia. Dua build identik. Parity model adalah evidence historis, dengan batas yang dipertahankan; NPZ asli tidak tersedia. |
| F09 | Dokumentasi aktif diperbarui | README CP19, PDF.js 6.2.108, lokasi lisensi relatif rilis, versi renderer, instruksi build, serta status aktual diselaraskan. Dokumen historis tetap diberi konteks. |

Ledger JSON per temuan tersedia di `evidence/cp19/FINDINGS_CLOSURE_LEDGER.json`.

## Pemisahan bukti

Bukti terkini berada dalam `evidence/cp19/` dan `evidence/final-regression/RESULTS.json`. Folder `before-final-correction`, `pre-final-pipeline`, `browser/pre-final`, serta file `PRE_FINAL` adalah riwayat dan tidak digunakan sebagai kelulusan build akhir.

Harness Node benar-benar menjalankan model dan parser, tetapi bridge Canvas tidak memuat font identik dengan browser. Raster Node tidak dipakai untuk contoh final atau bukti visual. **Ketiga `SAMPLE_*.md` berasal dari unduhan Chrome**, termasuk raster yang diperiksa. Fixture sintetis diberi label dan tidak diklaim sebagai PDF historis pengguna.

`DOMAIN_HOLDOUT.json` awalnya terpisah, kemudian menjadi regresi setelah temuannya dipakai memperkuat guard. `INDEPENDENT_ACCEPTANCE.json` berisi 18 kasus baru yang tidak dipakai mengubah aturan final. Keduanya buatan AI dan bukan korpus gold standard manusia. Catatan AI tidak dihitung sebagai persetujuan bilingual.

Source model, bobot, dan situs privat dipertahankan. `NEXT_ACTIONS.md` menjelaskan titik kelanjutan yang tepat, termasuk pekerjaan teknis yang masih belum selesai; bukan hanya dependensi eksternal.
