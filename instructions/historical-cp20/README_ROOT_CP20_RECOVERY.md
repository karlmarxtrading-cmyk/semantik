# Pemulihan final 13 November 2026

**NOT PRODUCTION READY — cp20-2e4d8ef18eb32385.** Mulai dari `SEMANTIK_SETARA_CP19_RECOVERY_REPORT.md` dan `SEMANTIK_SETARA_CP19_CONTINUATION.md`. Dokumen CP19/CP20 lain di bawah ini adalah riwayat sebelum pemulihan; bukti baru ada di `evidence/recovery/`.

---

# Semantik Setara CP20

**CHECKPOINT_NOT_PRODUCTION_READY.** Source aktif adalah `app/`. Baca `RELEASE_ACCEPTANCE_CP20.md` dan `.json` untuk keputusan gerbang serta identitas build yang dikemas. Tidak ada situs publik yang diubah.

Aplikasi tetap statis, hanya menerima PDF, menerjemahkan Indonesia ↔ Inggris lokal, dan menghasilkan satu Markdown. Model, parser, OCR dan exporter dimuat ketika dibutuhkan. Backend, akun dan API penerjemahan berbayar tidak ditambahkan.

## Membangun ulang

Dari folder `cp20/` dalam paket source:

```bash
python3 scripts/build-with-history.py
npm --prefix tools ci
python3 scripts/run-regressions.py --include-cp20 --out evidence/reproduced/regressions
python3 scripts/verify-final.py
```

Build tidak membutuhkan jaringan atau npm: model/runtime yang dipakai sudah disertakan. npm hanya untuk dependensi QA dari lockfile. Lingkungan QA aktual tercatat di `evidence/cp20/qa/ENVIRONMENT.json`.

`build-with-history.py` menghasilkan rilis CP20 dan mempertahankan aset immutable CP19 agar tab lama tidak kehilangan berkasnya. Jangan memakai skrip build historis sebagai entry point rilis ini. Ikuti `DEPLOY_UPDATE_ROLLBACK_CP20.md`; hanya isi manifest build yang boleh masuk deploy.

## Menelusuri hasil

- `AUDIT_CLOSURE_CP20.md` / `.json`: seluruh AUD-01–12 dan cacat tambahan, status implementasi dan penerimaan dipisahkan.
- `evidence/cp20/`: pengujian CP20; subfolder historis diberi nama jelas. Binding hash menjelaskan bukti yang sah untuk build terakhir.
- `VERIFICATION_REMAINING_CP20.md`: langkah konkret untuk gerbang yang belum lulus.
- `QUALIFICATION_PLAN_CP20.md`: sasaran perangkat dan kualifikasi yang ditetapkan sebelum pengujian.
- `tests/fixtures/cp20-capacity/`: PDF stress dengan ID terlacak. Variasi numerik/template tidak sama dengan buku ilmiah yang seluruh bahasanya beragam.
- `evidence/cp20/semantics/alternatives/`: skrip, provenance, lockfile dan hasil pembanding model yang tidak dipromosikan. Bobot eksperimen besar harus diperoleh ulang lewat downloader berpinned; bukan dependensi aplikasi.

Dokumen CP19, `previous-source-qa/`, `baseline/`, dan `model-provenance-source/` adalah riwayat/provenance. Jangan menggunakannya untuk mengganti source CP20 atau mengklaim kelulusan baru. `instructions/historical-cp19/` menyimpan README dan arahan lama yang telah digantikan.

Skrip `stage-cp20-browser.py` menambahkan kontrol QA ke `dist/qa/`. Folder itu, namespace uji sementara dan dependensi development tidak dikemas dalam ZIP deploy. Source lengkap memuat manifest SHA-256 setiap berkas; daftar paket dan checksum tersedia dalam `ARTIFACT_MANIFEST_CP20.json` yang diserahkan terpisah.

## Batas keputusan penerimaan

Angka `translated` berarti mesin menghasilkan target yang diterima guard, bukan bukti bahwa makna benar. Review AI baru menemukan kesalahan ilmiah kritis; persetujuan manusia tetap 0. Keterbatasan hosting/perangkat bukan satu-satunya penghalang produksi. Sumber dan penanda parsial dipertahankan ketika bagian belum tuntas.
