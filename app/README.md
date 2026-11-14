# Semantik Setara CP20

Status: **CHECKPOINT_NOT_PRODUCTION_READY** sampai semua gerbang pada `../RELEASE_ACCEPTANCE_CP20.json` lulus. Source aktif adalah folder `app/` pada akar CP20; bagian `app/app/` berisi modul aplikasi.

Input konsumen hanya PDF. Alur utama: pilih PDF → terjemahkan lokal Indonesia ↔ Inggris → unduh satu Markdown. Model/PDF/OCR dimuat ketika diperlukan. Tidak perlu akun, API key, layanan berbayar, atau pemecahan PDF manual.

## Reproduksi dari akar folder cp20

```bash
npm --prefix tools ci
python3 scripts/build-with-history.py
python3 scripts/run-regressions.py
node --experimental-vm-modules tests/cp20-offline-release.mjs dist evidence/cp20/release
node tests/cp20-structure.mjs
node tests/cp20-math-qualification.mjs
node tests/cp20-math-real-pdf.mjs
python3 scripts/verify-models-and-headers.py
python3 scripts/verify-final.py
```

`build-with-history.py` merekonstruksi namespace CP19 dari overlay terverifikasi lalu membangun CP20 dengan namespace lama tetap tersedia. Ini menjaga aset yang belum dimuat oleh tab CP19 aktif. Build tidak memerlukan npm/jaringan; npm hanya untuk QA. Jangan menjalankan skrip patch/pengemasan CP19 historis pada aplikasi aktif.

Baca `../DEPLOY_UPDATE_ROLLBACK_CP20.md`, `../QUALIFICATION_PLAN_CP20.md`, dan acceptance final. Metadata build aktual berada pada `../evidence/build/BUILD_MANIFEST.json`. Aset model, runtime, lisensi, dan provenance dipertahankan.

Bukti CP20 berada di `../evidence/cp20/`; folder CP19 dan previous-source-qa adalah riwayat. Kelulusan parser, guard otomatis, atau tes sintetis bukan kelulusan semantik/browser/perangkat fisik. Semua review semantik yang dibuat dalam sesi ini berlabel AI.

Untuk QA browser, `python3 scripts/stage-cp20-browser.py` menambahkan `dist/qa/` di luar manifest rilis. Folder itu dilarang masuk ZIP deploy. Hosting penerimaan harus menyajikan byte HTML utuh dan menerapkan `_headers`; jangan mengendurkan hash untuk mengatasi injeksi preview.
