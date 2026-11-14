# Verifikasi repository CP22 (paket GitHub-ready)

**Repository GitHub-ready ≠ website production ready.** Status website tetap **NOT PRODUCTION READY** (lihat `SEMANTIK_SETARA_RELEASE_ACCEPTANCE_CP22.md`).

Identitas: rilis `cp22-f995042b7da24e42`, versi 0.22.0, sourceHash `f995042b7da24e42815c423af35da260ded94a6e7a6bfde6a4c54d68018d0752`; model ID→EN `eb4722cead56364538c05a99f6a08a65a7a6bb8ac7e6a49b9ce4adf0858889db`, EN→ID `31dbb62b5506e7302e182d7a85d5cae0e1263ca8acdf7bbb21f416c892a5c9d6`.

Asal isi: working copy CP22 yang sudah terverifikasi (CP21 dipulihkan dengan `RESTORE_CP21_HANDOFF.py` + perubahan CP22). Delta tidak diterapkan ulang. `dist/` dan `node_modules/` tidak disertakan (dapat dibangun ulang). README root era CP20 dipindah ke `instructions/historical-cp20/README_ROOT_CP20_RECOVERY.md`. Permission dinormalisasi; byte tidak berubah.

Aset besar: **tidak ada yang dikecualikan.** Seluruh bobot model, runtime ONNX, OCR, dan vendor ada di `app/`. Berkas terbesar 15.344.608 byte; tidak perlu Git LFS.

## Hasil pada ekstraksi bersih ZIP

| Pemeriksaan | Hasil |
|---|---|
| Keamanan ZIP (path absolut/`..`, symlink) | PASS |
| `scripts/verify-repository.py` (ukuran + SHA-256 tiap berkas, sourceHash, ≥50 MiB, `.gitattributes`) | PASS |
| `npm --prefix tools ci --ignore-scripts` dari lockfile (Node 24.22.1) | PASS |
| `build-with-history.py` → 1.200 berkas identik byte dengan `evidence/cp22/build-final/BUILD_MANIFEST.json` | PASS |
| `run-regressions.py --include-cp22` (Node 24.22.1) | PASS 35/35 |
| `tests/cp22-coverage-unit.mjs` | PASS |
| `verify-final.py` | 7/8 — FAIL tetap: 1.200 berkas > batas 1.000 unggah *drag-and-drop* |
| Inferensi nyata 12 kasus final pada byte deploy hasil build bersih | PASS — identik dengan `acceptance-freeze2/FINAL12_INFERENCE.json` |
| `git init` + `git add -A` + commit; tidak ada berkas >50 MiB; `dist/`, `node_modules/` terabaikan | PASS (lihat laporan serah terima) |
| Pemindaian kredensial | PASS — pola yang cocok hanya data base64 di WASM/HTML |

Temuan: suite regresi lama menulis ulang berkas bukti yang terlacak di `evidence/`. Jalankan suite di salinan QA (`git worktree`) atau `git restore evidence/` sesudahnya; `verify-repository.py` mendeteksinya.

Suite dan inferensi di atas dijalankan pada ekstraksi bersih dari ZIP versi pertama. ZIP final hanya menambah/memperbarui dokumentasi (`README.md`, `DEVELOPMENT.md`, berkas ini), `evidence/cp22/LEDGER.json`, dan `REPOSITORY_MANIFEST_CP22.json`; sourceHash dan semua berkas lain identik, dan build ulang dari ZIP final juga diverifikasi identik.

Belum dijalankan / terhambat (tidak berubah dari CP22): smoke browser CP22, terjemahan dokumen >2 juta karakter, kualifikasi formula/tabel/OCR (NOT_RUN); staging Cloudflare, offline/update/rollback HTTPS, laptop fisik 8 GB, reviewer bilingual independen (BLOCKED).
