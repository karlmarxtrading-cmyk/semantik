# Lanjutkan CP21 dari hasil nyata ini

**Status: NOT PRODUCTION READY.** Source aktif adalah CP21; CP20 hanya baseline pemulihan. Lihat release/hash aktual di `evidence/cp21/build/BUILD_MANIFEST.json` dan keputusan di `SEMANTIK_SETARA_RELEASE_ACCEPTANCE_CP21.md`.

## Berkas yang dipilih

Untuk membawa pekerjaan ke sesi berikutnya, cukup gunakan **paket ringkas CP21**. Paket itu memuat perubahan source lengkap, tes baru, bukti baru, ledger dan manifest; model/runtime yang tidak berubah dirujuk melalui baseline yang sudah tersimpan. Bila ingin semua data tanpa ketergantungan baseline, gunakan `SEMANTIK_SETARA_FINAL_SOURCE_CP21.zip`. Kandidat deploy diperlukan ketika menguji hosting, bukan untuk melanjutkan editing.

Baseline yang dirujuk:
- Nama lama: `SEMANTIK_SETARA_CP19_RECOVERED_SOURCE.zip`; isinya CP20, bukan source CP19 aktif.
- Ukuran: 266.111.225 byte.
- SHA-256: `94cd0832c1163b0a01cdd99409c0efbf3eb52e4788eb66ddd8d291550d0d3bfa`.
- ID: `libfile_fde3_f-8556e57959008191b024d7fe37c83c89_6a790e7c218c81918b962131f5a46ccd`.
- [Baseline tersimpan](https://chatgpt.com/library?file_id=libfile_fde3_f-8556e57959008191b024d7fe37c83c89_6a790e7c218c81918b962131f5a46ccd&account_id=personal).

Pemulihan paket ringkas: verifikasi hash baseline, ekstrak folder `cp20/` ke **salinan kerja baru**, lalu timpa salinan itu dengan isi `delta/`. Tidak ada penghapusan berkas yang dibutuhkan. Pertahankan ZIP baseline utuh. Verifikasi setiap hash pada `MANIFEST.json`. Metadata rujukan juga tersedia di `SUMBER_LENGKAP.json`. Jangan meminta pengguna mengunggah ulang baseline selama akses berkas tersebut tersedia.

## Titik kerja berikutnya

1. Baca `evidence/cp21/LEDGER.json`, `acceptance/AI_REVIEW.json`, `semantics/PRIOR_12_REVIEW.json`, dan `REGRESSION_RECONCILIATION.json`. Ini adalah pemeriksaan bukti, bukan perintah mengaudit ulang seluruh proyek.
2. Pekerjaan teknis utama: kegagalan generalisasi mesin. Final F01/F04/F05/F06/F07/F11/F12 kritis; F02 masih ditolak. Korpus `qualification-v1/NEW_*` juga memiliki kegagalan semantik nyata. Seluruhnya kini korpus pengembangan/regresi, bukan holdout baru.
3. Jangan mengklaim seluruh 70 kasus lama lolos semantik hanya karena terjemahan tersedia. H008/H015 kini berhasil diproses, label A/B dan qualifier membaik, tetapi F06-en-id representativitas dan kefasihan sejumlah paragraf masih perlu diselesaikan. Perbaikan berikutnya perlu hipotesis mesin/decoding/struktur yang dapat digeneralisasi, bukan jawaban kalimat korpus.
4. Model alternatif yang sudah dicoba, batas lisensi/perangkat, dan alasan penolakan ada di `evidence/cp20/semantics/alternatives/ALTERNATIVE_MODEL_ASSESSMENT.md`. Jangan mengulangi konfigurasi M2M100 yang telah gagal tanpa perubahan teknis. Jangan mengganti model dengan API eksternal atau model berlisensi tidak sesuai kontrak.
5. Setelah perubahan nyata: uji reproducer terkecil, regresi terdampak, bekukan kode baru, lalu tulis korpus baru setelah freeze. Nilai enam dimensi pada hasil mesin asli. Freeze lama tetap utuh; jangan menonaktifkan verifikasi hash.

Bug riwayat quota sudah diperbaiki di `app/app/main.js` pada select/resume/clear. Bukti VM: `lifecycle/WARNING_SCOPE.json`; bukti browser: `browser/BROWSER_DOWNLOADS.json`. Jangan mengerjakan ulang perbaikan ini tanpa regresi nyata. Metadata penutup ada pada modul CP20 yang dipertahankan; inferensi panjang lama dan replay metadata tetap bukti historis, bukan kelulusan penerjemahan besar CP21.

## Reproduksi hanya bila diperlukan

Source penuh tidak memerlukan jaringan untuk build. Untuk tes pengembang, dependensi terkunci tersedia melalui `tools/package-lock.json`:

```bash
npm --prefix tools ci --ignore-scripts --no-audit --no-fund
python3 scripts/build-with-history.py --evidence-dir evidence/cp21/build
CP21_BUILD_MANIFEST=evidence/cp21/build/BUILD_MANIFEST.json CP21_STATIC_REPORT=evidence/cp21/build/FINAL_STATIC_VERIFICATION.json python3 scripts/verify-final.py
```

Jalankan suite yang menulis bukti pada **salinan QA terpisah**, agar bukti historis tidak tertimpa. Bila menyalin, jangan mengecualikan semua direktori bernama `dist`: KaTeX memerlukan `tools/node_modules/katex/dist`.

```bash
python3 scripts/run-regressions.py --include-cp21 --out evidence/cp21/regressions-next
node --experimental-vm-modules tests/cp21-document-warning.mjs
node tests/cp21-semantic-controls.mjs
```

`tests/cp21-final-inference.mjs` menerima `NEW`, `KNOWN`, atau `AFFECTED`; deployment root diberikan melalui `CP20_SEMANTIC_ROOT` (nama variabel historis). Script memverifikasi freeze sebelum inferensi dan menyimpan JSON setiap kasus. Jangan menjalankan korpus lama sebagai penerimaan baru. Uji 70 lama dan 12 baru yang final sudah tersedia; tidak perlu diulang pada byte yang sama.

Build CP21 mempertahankan namespace CP19+CP20 melalui manifest/overlay `release-history/`. Jangan menghapusnya demi mengecilkan deploy tanpa kebijakan transisi tab lama yang diuji. Model besar tidak diduplikasi dalam source history; deploy memang memuat namespace lama.

## Kualifikasi yang masih terbuka

- Cloudflare Pages privat aktual: perlu akun/proyek staging yang diotorisasi. Jangan mengganti dengan Sites atau publikasi publik. `_headers`, CSP, MIME, hash, update/rollback dan inferensi offline harus diamati di hosting itu.
- Preview browser final berhasil untuk unggah/terjemah/unduh dan reload; persiapan offline gagal karena aplikasi offline belum aktif. Ini tidak membuktikan offline produksi.
- Laptop fisik RAM 8 GB, process kill, sleep/wake dan memori total browser belum diuji.
- Terjemahan penuh buku ilmiah >2 juta karakter, OCR ilmiah, formula kompleks/tabel bertingkat dan review domain belum tuntas. Parser-only dan gambar fallback tidak menutup gerbang itu.
- Dua reviewer bilingual/domain independen dan adjudikasi belum tersedia; persetujuan manusia tetap 0.

Pertahankan PDF-only, local-first, Indonesia–Inggris, static Cloudflare Pages, satu Markdown, dan lazy interaction. Simpan checkpoint fase sebelum pekerjaan panjang. Checksum dan manifest diverifikasi dari berkas nyata, bukan disalin dari laporan sebelumnya.
