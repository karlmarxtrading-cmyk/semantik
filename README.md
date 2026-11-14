# SEMANTIK SETARA

Penerjemah PDF akademik **Indonesia ↔ Inggris** yang berjalan lokal di browser (model ONNX, PDF.js, OCR Tesseract), di-host sebagai situs statis Cloudflare Pages, dengan satu keluaran Markdown.

> **Status: NOT PRODUCTION READY.** Repository ini siap untuk GitHub; website-nya belum layak produksi.
> Rilis: `cp22-f995042b7da24e42` (0.22.0) · sourceHash `f995042b7da24e42815c423af35da260ded94a6e7a6bfde6a4c54d68018d0752`.
> Mulai baca: `SEMANTIK_SETARA_RELEASE_ACCEPTANCE_CP22.md`, lalu `SEMANTIK_SETARA_CHECKPOINT_CONTINUE_CP22.md`.

## Status gerbang singkat (detail di dokumen acceptance)

| Gerbang | Status |
|---|---|
| Regresi 35 suite (Node 24.22.1) | PASS |
| Build deterministik + namespace CP19/CP20/CP21 dipertahankan | PASS |
| Verifikasi statis deploy | FAIL — 1.200 berkas > batas 1.000 unggah *drag-and-drop*; perlu Wrangler/Git integration |
| Penerimaan semantik korpus baru | FAIL — 6 kritis dari 16; persetujuan manusia 0 |
| Browser CP22, dokumen >2 juta karakter, formula/tabel/OCR | NOT_RUN |
| Staging Cloudflare, laptop fisik 8 GB, reviewer independen | BLOCKED |

## Struktur

| Path | Isi |
|---|---|
| `app/` | **Source website aktif.** `index.html`, `app/*.js` (UI, parser PDF, OCR, layout, matematika, terjemahan, `coverage.js`, penyimpanan/checkpoint/pemulihan, exporter Markdown, service worker/offline), `assets/` (worker inferensi), `models/` (bobot OPUS-MT ID↔EN q8, terpecah ≤16 MB), `runtime/` (ONNX Runtime), `vendor/` (PDF.js, Tesseract, KaTeX, dll.), `licenses/`. |
| `scripts/` | `build-with-history.py` (entry point build rilis), `build.py`, `sw-template.js`, `verify-final.py`, `run-regressions.py`, `verify-repository.py`. |
| `release-history/` | Manifest + overlay untuk merekonstruksi namespace immutable CP19, CP20, CP21 agar tab lama tetap berfungsi. |
| `tests/` | Suite Node (regresi, semantik, offline, unit cakupan CP22) dan fixture PDF. |
| `tools/` | `package.json` + `package-lock.json` untuk dependensi QA (bukan dependensi runtime website). |
| `evidence/` | Bukti CP19–CP22: ledger, acceptance, freeze, inferensi, regresi. `evidence/cp22/LEDGER.json` = ledger CP22. |
| `deploy/` | Contoh konfigurasi Wrangler (placeholder). |
| `model-provenance-source/`, `baseline/`, `previous-source-qa/`, `instructions/`, `audit/`, `research-math/`, `review-bilingual/` | Riwayat dan provenance. Bukan entry point. |

## Mulai cepat

Persyaratan: Python ≥ 3.11 (diuji 3.13), Node **24.22.1** untuk suite QA (PDF.js 6 butuh `Promise.try`). Build tidak memerlukan jaringan.

```bash
python3 scripts/verify-repository.py                 # integritas checkout + sourceHash
python3 scripts/build-with-history.py --evidence-dir evidence/reproduced/build   # -> dist/
python3 scripts/verify-repository.py --dist dist     # dist identik byte dengan build beku CP22
```

Suite regresi **menulis ulang berkas bukti lama** di `evidence/` (perilaku harness CP19–CP21). Jalankan di salinan terpisah, bukan di checkout utama:

```bash
git worktree add ../semantik-qa HEAD && cd ../semantik-qa
npm --prefix tools ci --ignore-scripts               # dependensi QA dari lockfile
python3 scripts/build-with-history.py --evidence-dir evidence/reproduced/build
python3 scripts/run-regressions.py --include-cp22 --out evidence/reproduced/regressions
```

Bila terlanjur dijalankan di checkout utama: `git restore evidence/` lalu `python3 scripts/verify-repository.py`.

Lihat `DEVELOPMENT.md` untuk alur kerja dan `DEPLOY_CLOUDFLARE_CP22.md` untuk deploy. Push ke GitHub: `GITHUB_PUSH_GUIDE.md`. Push ke GitHub **bukan** deploy Cloudflare.

## Prinsip produk yang dipertahankan

PDF-only, local-first, satu keluaran Markdown, interaksi lazy, tanpa server penerjemahan atau API berbayar, tanpa unggah data pengguna. Model dan runtime dimuat ketika dibutuhkan.
