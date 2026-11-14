# Pemulihan SEMANTIK SETARA CP19 — source aktual CP20

**Status akhir: NOT PRODUCTION READY.** Tanggal laporan: 13 November 2026 (Asia/Bangkok). Timestamp mesin dalam bukti dipertahankan dalam UTC sesuai rekaman runtime.

Penyelamatan berhasil dari paket CP20 yang benar-benar telah tersimpan. Workspace sementara sesi lama sudah tidak tersedia. Source CP20 tidak diturunkan kembali menjadi CP19; nama enam keluaran mengikuti permintaan pemilik. Tidak ada klaim pemulihan perubahan yang belum pernah tersimpan. Tidak ada situs publik yang diubah.

## Jawaban pemeriksaan pemulihan

| Pemeriksaan | Hasil nyata |
|---|---|
| Workspace lama | Tidak tersedia pada awal sesi; baseline dipulihkan dari ZIP tersimpan dan dipisahkan dari salinan kerja. |
| Uji Node 1.500 halaman | Tersedia: RESULTS, OUTCOME_BREAKDOWN, log, dan Markdown; seluruh artefak penting dicocokkan SHA-256. |
| Markdown 1.500 halaman dapat dibaca | Ya. Node 1.008.350 byte; browser 1.008.613 byte. Masing-masing 1.500 halaman/4.500 blok. Keduanya hasil historis parsial. |
| 1.500 label ditolak | Tersedia. Footer asli berbentuk CP20P0001 END sampai CP20P1500 END. Penyebab ditemukan dan perbaikan terarah diuji. |
| Pemeriksaan semantik lama | Tersedia, termasuk fresh-v4 dan tinjauan keluaran panjang. Tetap dipertahankan sebagai bukti historis. |
| Bukti browser lama | Unduhan 1.500 halaman sudah selesai dan tersimpan. Setelah browser dibuka, ditemukan pula checkpoint terpisah fixture vektor 3 halaman/9 blok; JSON, MD, dan paket ZIP-nya diekspor sebelum penggantian dokumen. |
| Source berbeda dari CP19 | Ya. Paket terakhir adalah CP20, bukan source CP19 awal. SourceHash dan inventaris awal ada dalam RECOVERY_INITIAL_VERIFICATION.json. |
| Perubahan sebelum putus terselamatkan | Seluruh 14.598 file source pada paket CP20 terakhir lolos manifest. Perubahan di luar paket tersimpan tidak dapat dipastikan. |
| Proses lama masih berjalan | Tidak ada proses pekerjaan lama yang dapat dilanjutkan. Bukti selesai dipakai kembali; proses berat 1.500 halaman tidak diulang. |

Catatan koreksi setelah checkpoint awal: daftar `missing` pada RECOVERY_INITIAL_VERIFICATION.json menyebut state browser tidak tersedia dari workspace. Pembukaan browser kemudian menemukan checkpoint vektor kecil yang masih hidup. OLD_BROWSER_RECOVERY_RECEIPT.json adalah addendum fakta yang lebih baru; tidak membuktikan pemulihan seluruh profil/browser lama atau job 1.500 halaman yang masih berjalan.

## Checkpoint keselamatan yang diserahkan lebih dahulu

- Nama: SEMANTIK_SETARA_CP19_EMERGENCY_RECOVERY_CHECKPOINT.zip
- Ukuran: **266.254.525 byte**.
- SHA-256: **5b6fd62092f614db550e493984db37a186b824b9c279962b67586ff117de1e98**.
- 25 entri luar; 20 salinan bukti penting; 14.598 file source terverifikasi di ZIP sumber bersarang.
- Integritas ZIP, hash entri luar, dan seluruh hash source bersarang: **PASS**.
- Checkpoint ini tetap utuh. Ia menyimpan keadaan sebelum perbaikan baru, bukan build final pemulihan. Source ZIP asli disimpan tanpa kompresi ulang agar tidak menggandakan pemrosesan bobot besar.

Checkpoint kemajuan tambahan juga tersimpan: 217.235 byte; SHA-256 758b515d514adaea360527a4771dcedd37f8d1ae1f15bb24b8066cd69665f304. Ini delta sementara, bukan pengganti source final mandiri.

## Identitas kandidat final

- Rilis: **cp20-2e4d8ef18eb32385**, versi 0.20.0.
- SourceHash: **2e4d8ef18eb323855ec23d4f3e16bb1ccd50604065c7afb1e84ff5331f521e79**.
- Ruleset: `cp20-recovery-context-and-metadata-v5`.
- Model ID→EN: eb4722cead56364538c05a99f6a08a65a7a6bb8ac7e6a49b9ce4adf0858889db.
- Model EN→ID: 31dbb62b5506e7302e182d7a85d5cae0e1263ca8acdf7bbb21f416c892a5c9d6.
- Deploy berisi 599 aset dari manifest, 504.159.126 byte sebelum kompresi. Namespace CP19 yang diperlukan untuk tab lama tetap disertakan. Tidak ada folder QA, dependensi tes, token, atau konfigurasi preview di deploy.

Enam modul aplikasi ditambah/diubah: metadata-language, long-document, main, translation, semantic-spans, claim-guards. Parser, exporter, storage, model dan runtime tetap sama. Seluruh file `evidence/cp20/` dibandingkan dengan baseline dan tidak berubah. Bukti baru ada di `evidence/recovery/`. Build d02ef81 adalah tahap pengembangan dan tidak dikemas sebagai kandidat final.

## Perbaikan yang benar-benar dilakukan

1. **Label penutup:** classifier terbatas untuk label + pengenal/angka membedakan metadata pendek dari prosa. Label yang sudah berbahasa target dipertahankan dengan status `preserved` dan alasan `already-target-metadata`, bukan dihitung sebagai terjemahan. Prosa, satuan, rumus, label ambigu dan negasi tetap melewati jalur pemeriksaan biasa. Tidak ada pengenal fixture CP20 yang dihardcode. Semua pemeriksaan unchanged-language tetap aktif.
2. **Semantik terarah:** perlindungan istilah dalam konteks dan pemeriksaan klaim diperbaiki untuk population mean, sampling, kalibrasi, harga, konsentrasi, rubric, reviewer, identitas eksperimen/perhitungan, dan beberapa cakupan matematika. Predikat pasif pencatatan yang sebelumnya tertutup placeholder dikembalikan agar model melihat morfologinya; tidak ada jawaban satu paragraf yang dimasukkan secara hardcode.
3. **Negasi/kuantor:** nonempty, incomplete, unchanging dan none ditangani dengan kontrol positif/negatif; ekuivalensi kuantor hanya untuk konteks extent yang terbatas.
4. **Penolakan deterministik:** kandidat yang sama tidak dijalankan ulang tanpa batas; kegagalan tersebut tetap rejected dan tidak dilabeli retryable.
5. **Pengujian:** harness lifecycle menautkan classifier produksi yang nyata. Satu kontrol lama yang keliru menolak pasangan kalimat setara diganti dengan target yang benar-benar berlawanan makna; assertion penolakan tidak dihapus. Rinciannya pada TEST_CONTRACT_NOTES.md.

## Verifikasi baru dan batasnya

| Bukti | Hasil | Batas klaim |
|---|---|---|
| Regresi lengkap | 32/32 kelompok lulus; 15/15 pemeriksaan sintaks lulus; source stabil selama tes | Campuran tes terkontrol, parsing PDF nyata, storage, exporter, fault injection; bukan persetujuan semantik. |
| Klasifikasi metadata | 55 kontrol independen lulus; 1.500 footer Node + 1.500 footer browser historis dikenali benar | Replay classifier, bukan 3.000 inferensi baru. |
| Routing legacy | Dua arah lulus, termasuk prosa sengaja ditolak dan sumber tetap tersimpan | Translator/DOM/storage doubles dinyatakan secara eksplisit. |
| Adapter | 16 kontrol dan kontrol retry deterministik lulus | Skenario terarah, bukan jaminan semua teks. |
| Regresi semantik yang diketahui | Rekonsiliasi 48 translated / 2 rejected | 50 inferensi nyata tahap pengembangan + 3 rerun terdampak pada source final. 47 hasil lama mempertahankan hash eksekusi asal; bukan 50 eksekusi baru pada byte final. |
| Korpus penerimaan baru | 20/20 menghasilkan target; 42 permintaan inferensi; 0 cache hit | Sepuluh pasangan konsep dua arah, lima domain; dibuat setelah freeze. Review AI: 12 critical, 4 major, 3 minor, 1 adequate. **FAIL**. Manusia: 0. |
| Browser ID→EN | PDF 3 halaman: 6 translated + 3 preserved; 12 permintaan, 0 cache hit; unduhan 2.269 byte | Sembilan ID blok dan seluruh halaman cocok. Tidak membuktikan prosa benar. |
| Browser EN→ID | PDF 3 halaman: 9 translated; 15 permintaan, 0 cache hit; unduhan 2.309 byte | Seluruh halaman/ID cocok. |
| Muat ulang browser | Hasil dipulihkan dan dapat diunduh lagi; badan teks dan ID identik | File tidak identik byte karena catatan cache lama muncul setelah restore; diff disertakan. |
| Lazy interaction & lebar 390 px | Lulus: tidak memuat komponen berat saat idle; tanpa overflow horizontal | Simulasi viewport cloud Chrome, bukan perangkat seluler fisik. |
| Paket deploy statis | 8/8 pemeriksaan lulus; seluruh 599 aset cocok SHA-256 | Bukan pengujian deployment Cloudflare yang nyata. |
| Preview byte/header | FAIL: HTML respons berbeda dari paket | Lingkungan preview menyisipkan konten. Jangan melemahkan hash SW untuk menutupi perbedaan ini. |

## Bukti kapasitas yang dipakai kembali

Uji historis Node dan browser 1.500 halaman sudah memproses 4.500 blok, dengan 3.000 translated dan 1.500 rejected. Masing-masing mencatat 7.650 permintaan inferensi dan 0 cache hit. Angka permintaan bukan jumlah forward pass ONNX. Hasil tetap parsial dan mengandung temuan makna. Browser historis sekitar 44 menit 46 detik termasuk jeda/pemulihan; Node sekitar 37 menit, RSS sampel sekitar 1,27 GB. Node RSS bukan total RAM browser.

Bukti historis browser 1.001 halaman EN→ID, parser buku autentik 1.062 halaman/>2 juta karakter, serta uji quota tetap tersedia dengan identitas build aslinya. Parsing buku tidak sama dengan terjemahan lengkap. Bukti buku tersebut masih memiliki 646 halaman dengan cakupan belum lengkap. Bukti-bukti ini tidak dinaikkan menjadi kelulusan end-to-end build pemulihan baru.

Tidak ada uji penuh 1.500 halaman baru. Alasan teknis pengujian yang dipilih: perubahan label diverifikasi pada seluruh label tersimpan, lalu jalur konsumen dan model nyata diuji pada tiga halaman asli per arah. Ini menghemat pengulangan proses berat sambil memisahkan cakupan bukti dengan jujur.

## Penghalang produksi yang masih nyata

- **FAIL semantik teknis:** contoh baru menerjemahkan dilution sebagai distributing/expand, inverse menjadi terbalik, inferior goods menjadi kebaikan, confounding menjadi role, serta kehilangan equilibrium constant. Guard yang lolos belum cukup untuk menjamin proposisi. Berkas AI_REVIEW.json memuat sumber, target aktual, enam dimensi dan alasan setiap penilaian.
- **Regresi lama belum seluruhnya selesai:** H026 salah hubungan modifier; H023 identitas treatment A tidak andal; H007/A10 kehilangan qualifier; H008/H015 tetap ditolak dan sumber dipertahankan. Tinjauan terperinci memuat 14 temuan/item review. Menambah istilah tidak otomatis memperbaiki relasi antarklausa.
- **Metadata warning lintas dokumen:** peringatan/cache history dari job lama ikut tersimpan pada dokumen baru dan muncul saat restore. Tidak ada bukti kegagalan quota baru pada uji tiga halaman; peringatan harus diberi cakupan sesi/dokumen yang benar.
- **Kualifikasi belum lengkap:** OCR/rumus ilmiah kompleks, terjemahan buku autentik panjang sampai unduhan, total RAM browser pada laptop fisik 8 GB, sleep/process-kill, serta staging Cloudflare, offline dua arah dan update/rollback nyata belum lulus seluruhnya.

Karena itu ZIP deploy adalah kandidat yang dapat diperiksa, **bukan rilis produksi yang disetujui**. Proyek tetap PDF-only, pemrosesan lokal ID↔EN, satu Markdown, static Cloudflare, dan lazy interaction. Tidak ditambahkan backend, akun, API berbayar atau klaim manusia palsu. Perbandingan model alternatif dari pekerjaan sebelumnya dipertahankan; model tidak diganti tanpa bukti kelulusan baru.

## Isi serah terima

1. Emergency checkpoint: keadaan source dan bukti yang diselamatkan sebelum perbaikan.
2. Recovered source: source CP20 terbaru beserta perubahan pemulihan, model/runtime, lockfile, skrip, fixture, bukti historis dan baru, serta manifest setiap file.
3. Deploy candidate: hanya 599 aset build yang telah diverifikasi.
4. Recovery report: dokumen ini.
5. QA evidence: bukti aktual, laporan, keluaran Markdown lama dan baru, serta manifest; tanpa menggandakan bobot model aplikasi.
6. Continuation: langkah lanjutan yang merujuk langsung pada source dan bukti final.

Ukuran, SHA-256, jumlah entri dan hasil integritas setiap ZIP final dicatat pada ARTIFACT_MANIFEST_RECOVERY.json. Manifest source/QA di dalam ZIP mencatat hash setiap file dan mengecualikan dirinya sendiri untuk menghindari hash sirkular. Pemeriksaan nama kredensial dan pola rahasia berisiko tinggi dilakukan tanpa menampilkan nilai sensitif. Ini bukan sertifikasi keamanan menyeluruh.
