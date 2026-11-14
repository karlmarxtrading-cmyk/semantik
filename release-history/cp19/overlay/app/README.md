# Semantik Setara CP19

Status rilis: **NOT PRODUCTION READY**. Build `cp19-6ed0d134e1770b27`, versi `0.19.0`.

Aplikasi tetap menerjemahkan PDF secara lokal Indonesia ↔ Inggris. Alur utama: pilih PDF, tekan Terjemahkan, unduh satu Markdown. Model, PDF reader, OCR, dan exporter dimuat ketika diperlukan. Tidak ada API penerjemahan eksternal atau input dokumen JSON/TXT/ZIP.

`app/` adalah source aplikasi aktif dan aset model yang benar-benar dipakai. `dist/` dihasilkan oleh build; hanya manifest build yang boleh menjadi isi ZIP deploy. `baseline/`, `model-provenance-source/`, dan `previous-source-qa/` mempertahankan provenance serta tes historis, bukan aplikasi alternatif. Source TypeScript lama pada provenance bukan target build aplikasi CP19.

## Build dan uji

Jalankan dari akar paket source yang berisi folder `cp19/`. Pertahankan susunan ini karena fixture audit dan kontrol matematika berada di luar `work/`.

```bash
npm --prefix cp19/work/tools ci
python cp19/work/scripts/build.py
python cp19/work/scripts/run-regressions.py
node cp19/work/tests/cp19-geometry.mjs
node cp19/work/tests/cp19-real-pipeline.mjs
node cp19/work/tests/cp19-domain-holdout.mjs
node cp19/work/tests/cp19-independent-acceptance.mjs
python cp19/work/scripts/verify-models-and-headers.py
python cp19/work/scripts/verify-final.py
python cp19/work/scripts/evaluate-cp19.py
```

Python 3.12 dan Node 22+ digunakan dalam lingkungan pekerjaan; versi tepat dicatat di `evidence/cp19/ENVIRONMENT.json`. Build statis tidak membutuhkan npm atau jaringan: semua aset runtime/model sudah tersedia. npm diperlukan untuk harness PDF, Canvas, fake IndexedDB, dan renderer QA. Lockfile mengikat versi dependensi. Tidak ada proyek TypeScript aktif; pemeriksaan sintaks dilakukan pada JavaScript aplikasi.

Perubahan engine mengikuti `patch-engine.py` lalu `patch-engine-literals.py`, kemudian build dan seluruh regresi. Jangan menjalankan patch historis pada aplikasi aktif tanpa memahami baseline yang dipakai.

Untuk browser, sajikan `dist/` melalui hosting statis tepercaya. `stage-qa.py` menambahkan harness lokal di `dist/qa/`; direktori ini tidak termasuk manifest dan **dilarang masuk ZIP deploy**. Gunakan browser nyata untuk memilih PDF fixture, mengunduh hasil, memeriksa render, reload, pembatalan, dan konflik dua tab. Network/offline/header harus diuji pada origin yang mempertahankan byte file dan menerapkan `_headers`.

## Bukti dan keterbatasan

Baca `RELEASE_ACCEPTANCE_CP19.md`, `evidence/cp19/RELEASE_ACCEPTANCE_CP19.json`, `evidence/cp19/SEMANTIC_QA_PER_ID.json`, dan `NEXT_ACTIONS.md`. Sebagian keluaran model masih salah makna; guard otomatis tidak membuktikan kesetaraan semantik. Persetujuan reviewer manusia: 0.

`evidence/cp19/browser/` berisi unduhan Chrome aktual. Raster dari harness Node memiliki keterbatasan font dan tidak digunakan sebagai bukti visual atau contoh final; contoh final berasal dari browser. File dalam `pre-final`, `before-final-correction`, dan berakhiran `PRE_FINAL` adalah riwayat, bukan kelulusan build terakhir.

Source CP18, checkpoint Stage 1/2, dan situs aktif tidak ditimpa. Skrip pelaporan/pengemasan CP18 yang diwarisi tetap tersimpan sebagai riwayat; entry point CP19 ialah `evaluate-cp19.py` dan `package-cp19.py`.
