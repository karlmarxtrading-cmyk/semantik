# Release acceptance CP20

**CHECKPOINT_NOT_PRODUCTION_READY — `productionReady:false`.**

Build: `cp20-8c643bea6962471f` · versi `0.20.0`.
SHA-256 masukan build (bukan ZIP): `8c643bea6962471f6c96b9dd01b3075dde11d6fd8e046b67098e58bccd7bde86`.

Pekerjaan nyata telah mengubah pipeline, penyimpanan, ekspor, struktur, guard bahasa, offline dan UI. Penerimaan produksi belum tercapai: kesalahan ilmiah kritis masih teramati. Hosting/perangkat/review manusia bukan satu-satunya penghalang. Situs publik tidak diubah.

## Keputusan gerbang

| Gerbang | Status | Dasar keputusan |
|---|---|---|
| Kapasitas dokumen panjang | **FAIL** | Parser aktual dan ekspor sumber lulus untuk 300/301/1000/1001/1500 halaman; bukti inferensi dan unduhan aktual dicatat per output. Unduhan browser 1.001 dan 1.500 halaman selesai dengan ID lengkap; hasil 1.500 halaman tetap parsial. Buku asli 85,9 MB/1.062 halaman gagal disimpan di browser ini (QuotaExceededError), sehingga kualifikasi buku kaya dan perangkat minimum belum lulus. |
| Kelengkapan ekstraksi dan cakupan terjemahan | **FAIL** | Seluruh ID sumber dapat direkonsiliasi pada fixture yang diuji, tetapi bagian rejected dan klausa ilmiah yang hilang belum memenuhi penerimaan terjemahan lengkap. Cakupan item PDF tidak membuktikan kelengkapan makna. |
| Mutu semantik dua arah | **FAIL** | Korpus baru v4: 9 target berstatus translated, 1 tidak tuntas, 4 target mengandung kesalahan kritis menurut review AI. Nol persetujuan manusia. Ambang nol kesalahan kritis tidak tercapai. |
| Matematika, tabel, gambar dan OCR | **NOT_RUN** | Kontrol digital, tabel sederhana, raster/vector, akar dengan geometri eksplisit dan OCR kecil memiliki bukti. Formula kompleks, cases, tabel rumus gabungan, OCR LaTeX dan scan panjang belum dikualifikasi. Fallback gambar tidak dihitung sebagai LaTeX benar. |
| Markdown lengkap dan dapat dipakai | **FAIL** | Ekspor bertahap, heading/list, gambar deduplikat dan penanda parsial telah diuji. Keluaran dengan rejected atau kesalahan makna tetap gagal sebagai terjemahan ilmiah tuntas. Kompatibilitas dibatasi renderer QA Marked/KaTeX dan hasil browser yang tercatat. |
| Memori, durasi dan perangkat | **NOT_RUN** | Waktu dan RSS proses Node atau JS heap browser dilaporkan sesuai alatnya. Tidak ada pengukuran total RAM browser+worker+WASM+Canvas atau uji laptop fisik 8 GB. Tidak ada klaim kemampuan ponsel dari viewport 390 px. |
| Penyimpanan, pemulihan dan keselamatan hasil | **NOT_RUN** | Commit atomik, lazy restore, stale writer, gagal kuota, penyelamatan dan retry tunggal diuji. Jeda/reload/dua tab, keyboard, BFCache serta tutup/buka tab nyata memiliki bukti; satu pemulihan kuota otomatis melanjutkan sampai 1.001 halaman. OS process kill dan sleep/wake perangkat fisik belum diuji. |
| Offline, update, rollback dan hosting | **BLOCKED** | Identitas manifest/lisensi/SW diperbaiki; 11 kontrol offline dan build/header simulations lulus. Preview menambah 1.212 byte HTML sehingga validasi integritas menolak SW; bukan uji Cloudflare. Byte-exact staging, jaringan terputus/reload dan update/rollback aktual belum tersedia. |
| Kemudahan penggunaan dan lazy operation | **NOT_RUN** | Alur PDF → terjemahkan → satu MD, font bantuan 14 px, viewport 390 px dan tidak memuat model saat idle telah diuji. Jeda/lanjut dengan keyboard, BFCache dan tutup/buka tab memiliki bukti aktual. Zoom, perangkat fisik dan seluruh skenario kegagalan panjang belum lengkap; lihat observasi UI final. |
| Reproducible build, model/aset dan dokumentasi | **PASS** | Build canonical beserta namespace CP19, hash model/aset, batas ukuran file dan rebuild byte-identical telah diverifikasi; keputusan PASS dibatasi integritas/reproduksi, bukan mutu terjemahan. |

## Bukti dan batas

Regresi: 32/32 suite; 14 pemeriksaan sintaks. Hash dan lingkup eksekusi ada dalam JSON; kontrol terisolasi tidak dianggap uji browser atau ketepatan ilmiah.

Korpus v4 baru terdiri dari 10 paragraf, lima domain, kedua arah. Sembilan berstatus translated, satu rejected; review AI menemukan empat target dengan kesalahan kritis. Enam dimensi dinilai terpisah. Kolom penilaian manusia dibiarkan kosong. Kasus penerimaan lama yang dipakai mengembangkan perbaikan disimpan sebagai regresi/historis.

Parser aktual melewati 300/301/1.000/1.001/1.500 halaman. Fixture rich 1.001 menghasilkan 2.486.906 karakter dan 13.013 ID paragraf yang dapat direkonsiliasi ke ekspor sumber. Ini tidak dengan sendirinya membuktikan semua karakter diterjemahkan atau semua kelas buku didukung. Fixture stress sintetis memakai template lintas domain, variasi angka dan ID; derajat pengulangan serta unique input/cache/inference harus dibaca pada laporan run.

Tambahan dokumen asli: buku fisika Light and Matter, Benjamin Crowell, 1.062 halaman, 85.937.593 byte. Parser final membaca seluruh halaman dan 2.159.653 karakter, memproses 56.757.057 byte aset dengan satu record halaman aktif. Waktu 183,75 detik; kernel maximum RSS proses Node 824.803.328 byte. Namun 646 halaman bertanda cakupan belum lengkap dan 849 memiliki peringatan; OCR Node dan 1.420 geometri rumus belum terverifikasi. Ini PASS kapasitas traversal/digital-item accounting, bukan kelulusan seluruh isi, OCR, matematika, ekspor buku atau terjemahan. PDF asli tidak dikemas; fetcher, SHA-256, sumber resmi, lisensi dan bukti disediakan.

Hasil unduhan browser, ukuran, SHA-256, jumlah halaman/blok/ID dan render diperinci di `evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json`. Hasil Node, doubles, dan browser dipisahkan. Angka JS heap bukan total RAM; RSS Node bukan RAM laptop pengguna.

Browser 1.001 halaman: 3.003 blok translated, 5.005 permintaan inferensi selesai, 0 cache hit; unduhan awal 400.286 byte, 21 menit 44 detik termasuk jeda/reload. Inferensi dilakukan pada build1668; pemulihan dan ekspor final8c sebesar 703.589 byte menyertakan provenance build lama. Browser 1.500 halaman pada final8c: 4.500 blok, 3.000 translated dan 1.500 rejected, 7.650 permintaan inferensi, 0 cache hit; unduhan 1.008.613 byte, 44 menit 46 detik termasuk BFCache, tutup/buka tab dan tes bersamaan. Semua halaman/blok unik cocok, tetapi hasil tetap parsial dan tidak lolos semantik. uniqueInputs pada metrik dokumen merupakan penjumlahan per blok, bukan deduplikasi global; Node mencatat global unique masked inputs secara terpisah.

Buku asli di browser: jumlah 1.062 halaman dikenali, tetapi penyimpanan 85.937.593 byte ditolak dengan QuotaExceededError dan terjemahan panjang diblokir sebelum sumber tersimpan. Ini kegagalan kapasitas dalam lingkungan browser yang diuji; bukan batas universal atau bukti perangkat fisik.

Contoh konsumen tambahan: enam rumus hasil unduhan dirender KaTeX tanpa kesalahan sintaks; tiga gambar data URI hasil unduhan dimuat di browser dengan dimensi 1.101 × 1.425. Bukti visual, Markdown asli dan render HTML disertakan. Ini membuktikan preservasi/render pada contoh tersebut, bukan ketepatan seluruh istilah atau semua editor Markdown.

## Perubahan utama

- Pipeline per halaman menyimpan sumber terlebih dahulu, kemudian hasil dengan transaksi atomik, provenance, lazy restore, dan penguncian penulis. PDF sumber tidak ditulis ulang setiap blok.
- Ekspor Markdown memakai sink bertahap, rekonsiliasi cakupan, deduplikasi gambar, hierarki judul/list, dan label parsial/unsaved yang jujur.
- Batas References tidak lagi menelan bab baru; visual penting tetap disertakan. Geometri rumus yang tidak pasti tetap memiliki fallback dan penanda.
- Terminologi kontekstual, guard klaim, identitas opaque dan tindakan retry dibenahi. Penghasil target tetap tidak memenuhi ambang semantik penerimaan.
- Manifest offline mengikuti identitas build; notice/lisensi diperbolehkan dengan hash yang benar. Verifikasi integritas tidak dilonggarkan untuk preview.
- Teks bantuan diperbesar, progres/jeda/lanjut diperjelas dan pemulihan kuota memprioritaskan dokumen dengan menghapus hanya cache model publik yang dikenali. Model yang sudah dimuat tetap berjalan; kesiapan offline direset.

## Batas implementasi dan kualifikasi

Batas protektif: PDF 100 MiB, hingga 2.000 halaman di kode, 250.000 karakter/halaman, 128 MiB aset/halaman, 100 juta karakter kumulatif jalur streaming. Angka ini bukan janji perangkat. ZIP tambahan tetap opsional dan dibatasi 64 halaman/64 MiB; ekspor utama adalah satu MD. Target laptop fisik 64-bit/RAM 8 GB/Chrome–Edge belum dikualifikasi.

Kemampuan rekonstruksi formula kompleks, tabel lintas halaman, OCR matematika dan scan panjang belum dibuktikan. Gambar sumber tidak dihitung sebagai keberhasilan LaTeX. Penerimaan makna membutuhkan perbaikan teknis lebih lanjut sebelum review manusia bisa menutup gerbang.

## Artefak dan kelanjutan

Paket deploy hanya memuat berkas dalam manifest; source/QA menyertakan model/runtime aktif, lockfile, skrip dan bukti. `ARTIFACT_MANIFEST_CP20.json` yang diserahkan terpisah mencatat ukuran byte dan SHA-256 ZIP sesudah pengemasan. Bobot model alternatif yang tidak dipakai tidak menggembungkan deploy/source; provenance, downloader pinned dan hasil eksperimennya dipertahankan.

Mulai dari `AUDIT_CLOSURE_CP20.md/.json`, `VERIFICATION_REMAINING_CP20.md`, dan `DEPLOY_UPDATE_ROLLBACK_CP20.md`. Jangan kembali ke baseline atau mengulang eksperimen yang telah ditolak tanpa alasan baru. Perlu akses staging privat yang byte-exact, perangkat fisik, dan reviewer bilingual; kebutuhan tersebut terpisah dari cacat teknis yang masih terbuka.
