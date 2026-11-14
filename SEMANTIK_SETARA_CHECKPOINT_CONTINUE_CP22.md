# SEMANTIK SETARA — titik kelanjutan CP22

Status: **NOT PRODUCTION READY**. Source aktif: `cp21/app/` dalam working copy ini, rilis `cp22-f995042b7da24e42` (0.22.0). Otoritas: instruksi pemilik terbaru → dokumen ini → `evidence/cp22/LEDGER.json` → `evidence/cp22/acceptance-freeze2/FREEZE.json`.

## Memulihkan CP22 dari paket

1. Pulihkan CP21 seperti biasa (`RESTORE_CP21_HANDOFF.py --restore-source`).
2. Ekstrak `SEMANTIK_SETARA_CP22_DELTA.zip` ke folder yang sama, lalu jalankan
   `python3 APPLY_CP22_DELTA.py CLAUDE_CP21_WORK/cp21` — script memeriksa hash setiap berkas delta, menerapkannya, dan memastikan sourceHash = `f995042b…`.
3. `python3 scripts/build-with-history.py --evidence-dir evidence/cp22/build-rebuilt` (buat folder induk output dahulu bila memakai `--output` di luar pohon). Hasilnya identik byte-per-byte dengan `evidence/cp22/build-final/BUILD_MANIFEST.json` (terbukti: rebuild independen 1.200/1.200 identik).
4. QA: `npm --prefix tools ci --ignore-scripts`, lalu dengan **Node ≥ 24** (PDF.js 6 memerlukan `Promise.try`): `python3 scripts/run-regressions.py --include-cp22 --out <folder-baru>`. Jalankan di salinan QA, bukan di atas bukti lama.

## Jangan diulang tanpa alasan baru

- Regresi 35 suite pada source final sudah lulus; diferensial CP21 vs CP22 identik.
- Korpus `evidence/cp22/acceptance/NEW_CORPUS.json` (16) dan final 12 CP21 kini **sudah terlihat**: hanya regresi. Penerimaan berikutnya memerlukan freeze baru + korpus baru yang ditulis sesudahnya, idealnya oleh pihak lain.
- Pendekatan yang sudah dicoba dan ditolak (bukti di LEDGER): menolak setiap celah tak terverifikasi (17 penolakan baru pada dev, termasuk terjemahan benar); pemaksaan istilah terisolasi tanpa filter morfologi (merusak homograf: rose→mawar, pengambilan→fetch).

## Pekerjaan teknis berikutnya (berdasarkan bukti kegagalan baru)

1. **Diatesis EN→ID**: kalimat aktif lampau EN ("The catalyst shortened…", "The vaccine reduced…") kerap menjadi *di-* + subjek pelaku. Deteksi pada target ID: subjek nomina + verba *di-* + objek langsung tanpa *oleh* yang sesuai sumber aktif. Bandingkan dengan `voiceGaps` yang kini hanya untuk sumber ID.
2. **Konektor logis**: *therefore/sebaliknya/conversely/namun* diperlakukan sebagai kata fungsi oleh detektor; buat pemeriksaan pasangan konektor kelas tertutup (bukan stoplist).
3. **Polisemi istilah pendek** (*gaya gesek*, *menceng*, *real value*): detektor sudah memberi catatan; perbaikan otomatis sengaja tidak dilakukan untuk akar pendek. Opsi aman: frasa bigram dua-bukti sebagai istilah perbaikan bila terverifikasi balik.
4. **Kapasitas model** (keputusan pemilik): kelas kesalahan relasi memerlukan model yang lebih kuat atau beam/n-best di worker. Beam search tanpa KV-cache melipatgandakan waktu ~beam×. Model besar alternatif perlu dicek lisensinya (mis. NLLB-200 berlisensi CC-BY-NC — tidak sesuai penggunaan komersial) dan kelayakan memori laptop 8 GB. M2M100 sudah pernah gagal di CP20; jangan diulang tanpa alasan baru.
5. **Biaya**: verifikasi ≈2,2× waktu dan memuat dua model. Untuk dokumen >2 juta karakter perlu diukur di perangkat nyata; pertimbangkan verifikasi hanya untuk blok prosa (bukan label/metadata).

## Hambatan eksternal (tidak dapat diselesaikan di sesi ini)

- Akun/proyek Cloudflare Pages terotorisasi untuk staging privat (header/CSP/MIME/Range, offline, update saat tab aktif, dua tab, rollback). Dengan 1.200 berkas, unggah harus via Wrangler (batas 20.000), bukan drag-and-drop (batas 1.000) — atau pemilik memutuskan mengurangi retensi namespace.
- Laptop fisik RAM 8 GB dengan akses operator (process kill, sleep/wake, memori/waktu nyata).
- Dua reviewer bilingual/domain independen + adjudikator.
- PDF asli *Light and Matter* (85.937.593 byte, SHA `43bc4835…`) untuk uji buku; URL/hash ada di `tests/fixtures/cp20-authentic/MANIFEST.json`.
- Smoke browser CP22 (worker kedua) belum dijalankan; dapat dilakukan di browser lokal mana pun dengan `dist/` yang disajikan via HTTPS/localhost.
