# Panduan pengembangan

## Aturan yang menjaga bukti tetap sah

1. **Source aktif hanya `app/`** dan builder `scripts/build-with-history.py`. Folder riwayat tidak boleh dipakai sebagai pengganti.
2. Setiap perubahan di `app/`, `scripts/build.py` atau `scripts/sw-template.js` mengubah sourceHash dan nama namespace rilis. Hasil penerimaan lama tidak berlaku untuk source baru.
3. Jangan menjalankan harness yang menulis bukti di atas berkas `evidence/` lama. Tulis ke folder baru (mis. `evidence/reproduced/…` yang di-*ignore*, atau `evidence/cp23/…` bila memang akan dipromosikan).
4. Penerimaan semantik: freeze dulu (hash source/model/decoder), **lalu** buat korpus baru. Korpus yang sudah dilihat hanya regresi. Persetujuan produksi memerlukan dua reviewer bilingual independen.
5. Jangan menonaktifkan guard, mengubah definisi PASS, atau mengganti output dengan source tanpa penanda.

## Build

```bash
python3 scripts/build-with-history.py --evidence-dir evidence/reproduced/build
```

- Selalu pakai `--evidence-dir`: default builder (`evidence/build/`) berisi bukti lama dan akan tertimpa.
- Output default `dist/` (diabaikan Git). Dengan `--output <dir>` di luar repo, buat folder induknya lebih dulu.
- Builder merekonstruksi namespace CP19, CP20, CP21 dari `release-history/<cp>/manifest.json` (berkas `shared` diambil dari pohon saat ini, berkas `overlay` dari folder overlay) dan memverifikasi sourceHash masing-masing. Bila Anda mengubah berkas yang berstatus `shared` di manifest lama, simpan versi lamanya sebagai overlay; builder akan berhenti bila identitas lama tidak cocok.
- Build deterministik: dua build dari source yang sama identik byte-per-byte.

## Uji

Suite regresi dan harness inferensi **menulis ulang berkas di `evidence/`** (termasuk bukti CP19–CP22). Jalankan selalu di salinan QA terpisah, misalnya `git worktree add ../semantik-qa HEAD`, lalu `git restore evidence/` bila terlanjur dijalankan di checkout utama. `scripts/verify-repository.py` mendeteksi perubahan semacam ini.

```bash
npm --prefix tools ci --ignore-scripts
# Node 24.22.1 (lihat .node-version). Pada Node 22, 6 suite PDF.js gagal "Promise.try is not a function".
python3 scripts/run-regressions.py --include-cp22 --out evidence/reproduced/regressions
node tests/cp22-coverage-unit.mjs
```

Inferensi semantik nyata (lambat; memakai bobot lokal): `tests/cp22-final-inference.mjs` dan `tests/cp22-frozen-regression.mjs` membaca `FREEZE.json` dan korpus dari `evidence/cp22/acceptance*/` serta menolak berjalan bila hash freeze tidak cocok. Setel `CP20_SEMANTIC_ROOT=dist/r/<namespace>` untuk menguji byte deploy.

## Pemeriksaan cakupan konsep (CP22)

`app/app/coverage.js` + `Translator._conceptCheck` di `app/app/translation.js`. Model arah sebaliknya dimuat sebagai worker kedua untuk terjemahan balik. Perbaikan otomatis terbatas 2 putaran; celah sisa menjadi catatan terlihat di Markdown. Biaya ≈2,2× waktu inferensi dan dua model di memori. Detail, keterbatasan, dan pendekatan yang ditolak: `evidence/cp22/LEDGER.json`.

## Pekerjaan berikutnya

Lihat `SEMANTIK_SETARA_CHECKPOINT_CONTINUE_CP22.md` (diatesis EN→ID, konektor logis, polisemi istilah pendek, kapasitas model, biaya dokumen panjang, hambatan eksternal).
