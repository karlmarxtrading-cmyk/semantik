# Kelanjutan presisi — SEMANTIK SETARA hasil pemulihan

**NOT PRODUCTION READY.** Gunakan source CP20 di dalam `SEMANTIK_SETARA_CP19_RECOVERED_SOURCE.zip`. Nama CP19 adalah nama serah terima yang diminta; jangan kembali ke source CP19 lama.

## Titik mulai

- Rilis aplikasi: `cp20-2e4d8ef18eb32385`, versi 0.20.0.
- SourceHash: `2e4d8ef18eb323855ec23d4f3e16bb1ccd50604065c7afb1e84ff5331f521e79`.
- Baca `SEMANTIK_SETARA_CP19_RECOVERY_REPORT.md`, `evidence/recovery/acceptance/AI_REVIEW.json`, `evidence/recovery/semantics/RECOVERY_SEMANTIC_REVIEW.json`, lalu hanya modul yang terkait temuan.
- Checkpoint awal SHA: `5b6fd62092f614db550e493984db37a186b824b9c279962b67586ff117de1e98`. Baseline tetap tersedia sebagai ZIP sumber bersarang di checkpoint ini. Semua artefak final mempunyai hash pada ARTIFACT_MANIFEST_RECOVERY.json yang diserahkan terpisah.
- Jangan mengulang pemulihan, inventaris penuh, audit historis atau uji 1.500 halaman tanpa alasan teknis baru.

## Pekerjaan tersisa, urut prioritas

1. **Makna ilmiah.** Ubah 20 kasus penerimaan baru menjadi regresi yang sudah terlihat. Perbaiki strategi model/penanganan frasa dan hubungan klausa, bukan hanya daftar istilah. Fokus dilution, matrix inverse, equilibrium constant/yield, random assignment/confounding, quantities versus economic agents, dan fixed-parameter interpretation. Tangani H026 attachment, H023 label A/B, H007/A10 qualifier, H008/H015 omission. Source lengkap harus tetap dapat diunduh bila ditolak. Jangan hardcode paragraf/kasus atau melonggarkan kriteria agar tes hijau.
2. **Warning setelah restore.** Telusuri state.offlineCacheWarning, storageRecoveries, storageFailures pada `main.js` saat mengganti dokumen. Bukti: `evidence/recovery/browser/RESTORE_EXPORT.diff` dan checkpoint JSON lama/baru. Bedakan kondisi cache tingkat sesi dari kejadian quota milik dokumen. Tambahkan regresi old-job quota → new PDF → reload; jangan menghapus peringatan yang memang masih benar secara global. Body/ID keluaran saat ini sudah identik.
3. **Freeze baru setelah perbaikan.** Catat hash source/model; jalankan regresi terdampak, lalu korpus baru yang belum dipakai mengubah aturan. Nilai makna, kelengkapan, istilah, fluency, angka/notasi dan konsistensi. Label AI/human harus jelas. Guard acceptance bukan semantic approval.
4. **Kualifikasi panjang terarah.** Pakai bukti 1.000–1.500 halaman tersimpan. Baru lakukan proses besar baru bila perubahan pipeline/model atau gap penerimaan memerlukannya. Simpan per halaman, log kemajuan, input unik/cache, peak-memory methodology dan keluaran parsial. Jangan menganggap OCR fallback gambar sebagai rumus LaTeX yang benar. Buku autentik >2 juta karakter masih perlu end-to-end translation dan rekonsiliasi, bukan hanya parsing.
5. **Hosting/perangkat.** Ikuti `VERIFICATION_REMAINING_CP20.md` dan `DEPLOY_UPDATE_ROLLBACK_CP20.md` untuk staging Cloudflare yang diotorisasi, offline dua arah/OCR, namespace lama, rollback, laptop 8 GB, sleep/process-kill. Preview ini menambahkan HTML sehingga hash berbeda; jangan mengubah integritas SW untuk meluluskan preview.

## Perintah yang tersedia

Jalankan dari folder `cp20/` hasil ekstraksi. Node runtime yang dipakai: v24.22.1. Dependensi QA berpinned di `tools/package-lock.json`; source build tidak memerlukan unduhan bobot.

```bash
python3 scripts/build-with-history.py
python3 scripts/verify-final.py
npm --prefix tools ci --ignore-scripts --no-audit --no-fund
```

Regresi terarah berikut sudah lulus; ulangi hanya setelah perubahan relevan. Jalankan pada salinan QA terpisah atau simpan output baru agar tidak menimpa bukti historis:

```bash
node tests/recovery-metadata-language.mjs
node --experimental-vm-modules tests/recovery-legacy-metadata.mjs
node tests/cp20-recovery-adapter.mjs
node tests/recovery-deterministic-retry.mjs
python3 scripts/run-regressions.py --include-cp20 --out evidence/reproduced/regressions
```

Periksa kebutuhan flag/harness pada masing-masing tes sebelum eksekusi. Tes inferensi nyata: `tests/recovery-fresh-acceptance.mjs`, `tests/cp20-semantic-runtime.mjs`, dan tes milik regresi semantik. Harness acceptance saat ini mengunci delapan SHA file terhadap FREEZE.json; buat freeze baru di lokasi bukti baru setelah source berubah, jangan mengganti identitas bukti lama.

`stage-cp20-browser.py` hanya menambah QA harness ke `dist/qa/`; folder itu tidak boleh masuk deploy. Untuk managed preview gunakan mekanisme preview yang didukung lingkungan. Jangan memasukkan konfigurasi preview atau kredensial ke source/deploy. Konsumen memilih PDF, menerjemahkan lokal, lalu mengunduh MD dari tombol UI; pengunduhan harus benar-benar disimpan dan dibaca kembali.

## Bukti yang tidak boleh diulang atau diklaim ulang

- Node 1.500: `evidence/cp20/qa/real-inference-final-1668/capacity-1500-id-NODE_PARTIAL_TRANSLATION.md`.
- Browser 1.500: `evidence/cp20/browser/final-8c643/BROWSER_1500_ID_TO_EN.md`.
- Footer 1.500 dari dua keluaran: `evidence/recovery/metadata/*_1500_METADATA_REPLAY.json`.
- Browser baru: `evidence/recovery/browser/BROWSER_3_ID_TO_EN.md`, `BROWSER_3_EN_TO_ID.md`, dan JSON pendamping.
- 32 kelompok regresi final: `evidence/recovery/full-regression/RESULTS.json`; keluaran berbeda dari baseline berada pada `generated/`.
- 20 kasus penerimaan baru: `evidence/recovery/acceptance/`. Ini sekarang korpus yang telah terlihat, tidak lagi boleh disebut buta untuk iterasi berikutnya.

Setiap tahap berikutnya: tulis perubahan dan bukti nyata → verifikasi → simpan checkpoint permanen → perbarui ledger → lanjut. Jika terputus, serahkan yang sudah ada dengan status akurat. Jangan mengubah productionReady sampai kegagalan teknis dan gerbang penerimaan benar-benar ditutup.
