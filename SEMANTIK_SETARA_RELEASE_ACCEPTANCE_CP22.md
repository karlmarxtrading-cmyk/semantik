# SEMANTIK SETARA — Release acceptance CP22 (kelanjutan Claude dari CP21)

**Status: NOT PRODUCTION READY.** Rilis kandidat: `cp22-f995042b7da24e42`, versi 0.22.0, sourceHash `f995042b7da24e42815c423af35da260ded94a6e7a6bfde6a4c54d68018d0752`. Bobot model, tokenizer dan worker inferensi tidak berubah (fingerprint ID→EN `eb4722ce…`, EN→ID `31dbb62b…`; decoder greedy 128/256 token).

Baseline: `cp21-ba83aed6acb74963`, dipulihkan dengan `RESTORE_CP21_HANDOFF.py` resmi (semua PASS) dan identik dengan pemulihan manual. Bukti: `evidence/cp22/LEDGER.json`.

## Gerbang

| Gerbang | Status | Bukti | Keterangan |
|---|---|---|---|
| Pemulihan baseline CP21 | PASS | `evidence/cp22/LEDGER.json` (restoration) | SHA paket, 14.878 anggota source, 899 anggota deploy, deploy gabungan `3055e4c8…`. |
| Regresi suite (35) | PASS | `evidence/cp22/regressions/cp22-final-node24/` | 35/35 pada kode final dengan Node 24.22.1 (versi QA tercatat). Pada Node 22, 6 suite PDF.js gagal `Promise.try` baik di CP21 maupun CP22 (`regressions/cp21-baseline`, `cp22-dev9`, `DIFFERENTIAL_SUMMARY.json`). |
| Unit cakupan konsep | PASS | `tests/cp22-coverage-unit.mjs` | 13 kontrol + over-merging + degradasi verifier + status offline gabungan. |
| Build deterministik + retensi namespace | PASS | `evidence/cp22/build-final/` | Rebuild independen identik 1.200/1.200 berkas. Namespace CP19, CP20, CP21 direkonstruksi dan diverifikasi identitasnya (`RETAINED_RECONSTRUCTION.json`, `release-history/cp21/`). |
| Verifikasi statis deploy | **FAIL (1 dari 8)** | `evidence/cp22/build-final/FINAL_STATIC_VERIFICATION.json` | 1.200 berkas > batas 1.000 berkas unggah *drag-and-drop* dashboard. Batas Wrangler direct upload 20.000 berkas, 25 MiB per berkas (aset terbesar 15,3 MB). Keputusan pemilik: unggah via Wrangler, atau kurangi retensi namespace. Kriteria tidak diubah. |
| Kontrol offline/SW (Node VM) | PASS | `evidence/cp22/release-final/` | 10/10. Bukan kualifikasi browser offline. |
| Browser online CP22 (UI nyata) | NOT_RUN | — | `translation.js` berubah (worker kedua untuk verifikasi). Bukti browser CP21 tidak mencakup kode ini. Perlu smoke PDF dua arah di browser. |
| Warning per dokumen / restore / unduhan identik | PASS (diwarisi) | `evidence/cp21/browser/` | `main.js`, `storage.js`, `export.js` tidak berubah. |
| Penerimaan semantik (korpus baru pasca-freeze) | **FAIL** | `evidence/cp22/acceptance/{FREEZE,NEW_CORPUS,NEW_INFERENCE,AI_REVIEW}.json` | 16 kasus: 6 kritis, 3 mayor, 3 minor, 3 memadai, 1 penolakan aman. Persetujuan manusia 0. |
| Terjemahan penuh dokumen >2 juta karakter | NOT_RUN | — | Tidak berguna selama gerbang semantik gagal; PDF buku asli tetap MISSING. Waktu inferensi CP22 ≈2,2× CP21. |
| Formula kompleks / tabel bertingkat / OCR ilmiah | NOT_RUN | — | Modul terkait tidak berubah; regresi struktural lulus. Kualifikasi domain tetap terbuka. |
| Staging Cloudflare aktual | BLOCKED | — | Tidak ada akun/proyek Cloudflare terotorisasi. |
| Offline/update/rollback browser HTTPS | BLOCKED | — | Butuh staging HTTPS nyata. |
| Laptop fisik 8 GB, kill/sleep-wake | BLOCKED | — | Tidak ada akses perangkat. Catatan: CP22 memuat dua model (≈2× memori model). |
| Dua reviewer bilingual independen + adjudikasi | BLOCKED | — | Tidak tersedia; review AI bukan pengganti. |

## Apa yang berubah dan apa yang terbukti

**Perubahan kode** (lihat `evidence/cp22/LEDGER.json` dan diff terhadap CP21):
- `app/app/coverage.js` (baru): verifikasi cakupan konsep. Target diterjemahkan balik dengan model arah sebaliknya dan dibandingkan per kalimat dalam bahasa sumber; sebuah kata hanya dianggap hilang bila gagal dua bukti independen: back-translation **dan** terjemahan istilah/frasa terisolasi pada kalimat target sejajar. Ditambah deteksi inversi diatesis Indonesia (me-/di-).
- `app/app/translation.js`: verifier lokal (worker kedua), perbaikan terbatas maksimal 2 putaran hanya untuk kata yang morfologinya jelas dan istilahnya lolos verifikasi balik; kandidat perbaikan diterima hanya bila lolos semua guard struktural, celah berkurang, dan tidak ada celah baru. Celah sisa menjadi catatan terlihat di Markdown. Negasi leksikal analitik (excludes ↔ *tidak termasuk*), `p-value`, morfologi *-nya* pada ketidakpastian, kapitalisasi istilah di tengah kalimat. Bila verifier tidak dapat dimuat, terjemahan berlanjut dengan catatan eksplisit.
- `app/app/academic-phrases.js`: aturan kelas tertutup (homograf verba setelah auxiliary; *matter(s)* sebagai verba; *kedua* kolektif setelah nomina relasional) dan derivasi nominal glosarium.
- Builder: identitas 0.22.0, retensi CP19/CP20/CP21.

**Tujuh kritis final CP21** (data yang sudah terlihat; dev, bukan penerimaan; `evidence/cp22/DEV10_FINAL12.json`, dikonfirmasi pada byte deploy final di `acceptance-freeze2/FINAL12_INFERENCE.json`): F01, F04, F05, F06, F07, F11, F12 kini memiliki target yang konsepnya terjaga menurut pembacaan AI internal, dengan sisa masalah tata bahasa (mis. "If observation interdependent"). F02 tetap penolakan aman: model tidak memiliki padanan yang dapat diverifikasi untuk *excludes*. F09 kapitalisasi diperbaiki; F03 dan F10 tidak berubah.

**Generalisasi — hasil negatif yang harus dibaca:** pada korpus baru pasca-freeze, kode CP21 asli menghasilkan target yang **identik** untuk 16/16 kasus (`acceptance/CP21_BASELINE_SAME_CORPUS.json`). Mekanisme perbaikan tidak terpicu pada data baru. Yang menggeneralisasi hanya deteksi: catatan terlihat muncul pada 2 dari 6 kesalahan kritis (H01, H02) dan juga pada beberapa terjemahan yang benar (positif palsu). Kesalahan kritis baru didominasi kesalahan relasi/gramatikal: diatesis *di-* yang salah pada EN→ID (G04, G07), konektor logis (*Sebaliknya* → "Instead", *therefore* hilang), dan istilah polisemi pendek (*gaya gesek*, *menceng*).

Kesimpulan teknis: model OPUS-MT ID↔EN 2019 (Marian ukuran base, q8) merupakan batas utama. Guard dan perbaikan leksikal dapat mendeteksi kehilangan konsep, tetapi tidak dapat menjamin relasi dan diatesis yang benar. Lihat `SEMANTIK_SETARA_CHECKPOINT_CONTINUE_CP22.md` untuk opsi berikutnya.
