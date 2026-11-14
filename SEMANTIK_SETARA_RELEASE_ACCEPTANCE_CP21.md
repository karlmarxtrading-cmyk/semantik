# SEMANTIK SETARA CP21 — RELEASE ACCEPTANCE

**Keputusan: NOT PRODUCTION READY.** Kandidat teknis tersedia; jangan rilis untuk konsumen sebagai penerjemah ilmiah yang telah lolos penerimaan.

Rilis: `cp21-ba83aed6acb74963`, versi `0.21.0`.
SHA-256 source aplikasi: `ba83aed6acb74963914e9e41e1c97e38b7830a0ebe042434bb325eb9d9607f25`.
Identitas otoritatif ada di `evidence/cp21/build/BUILD_MANIFEST.json`; checksum arsip diserahkan dalam `CHECKSUMS_CP21.json`.

## Hasil implementasi

- Baseline CP20 dipulihkan dari ZIP dengan SHA-256 `94cd0832c1163b0a01cdd99409c0efbf3eb52e4788eb66ddd8d291550d0d3bfa`; 14.747 berkas manifest terverifikasi. Tidak memulai ulang dari CP19.
- Riwayat quota/cache kini dibatasi per dokumen. Pergantian/penghapusan dokumen mereset riwayat itu; resume memuat riwayat milik dokumen tersebut. Status offline global tetap terpisah.
- Perlindungan istilah ilmiah dan frasa bersifat komposisional: morfologi kepemilikan `-nya`, istilah kimia/statistik/matematika/ekonomi, label perlakuan, serta keterkaitan pembatas pada nomina.
- Pemulihan penerjemahan menambah batas klausa `without/tanpa` dan `distinguish … from …` secara terbatas, tanpa mengubah teks sumber dan dengan pemeriksaan hasil gabungan. Tidak ada jawaban korpus atau kalimat lengkap yang di-hardcode; penolakan aman tetap dipertahankan.
- Kandidat deploy mempertahankan namespace CP19 dan CP20 untuk tab lama. Model, kontrak PDF-only/local-first/ID–EN, satu Markdown, dan lazy interaction dipertahankan.

## Bukti yang lulus

| Gerbang | Hasil dan batas bukti |
|---|---|
| Regresi | 32 kelompok suite lama direkonsiliasi dengan pengujian ulang yang terdampak; 2 suite CP21 tambahan PASS. Kegagalan awal beserta penyebabnya tetap disimpan. |
| Mesin nyata, kasus lama | 70/70 menghasilkan terjemahan, 179 panggilan inferensi, 0 cache hits. Setelah koreksi alias label, 70 target diperiksa ulang dan 2 kasus terdampak benar-benar diinferensikan lagi pada deploy final. Ini bukan 70 persetujuan semantik. |
| Perbaikan H008/H015 | Keduanya menghasilkan terjemahan melalui model asli; sumber dan keluaran tersimpan. Penolakan lama tidak disembunyikan. |
| Kandidat statis | 8 pemeriksaan PASS; 899 berkas, total 756.267.690 byte, aset terbesar 15.344.608 byte. Tidak membuktikan header/CSP Cloudflare aktual. |
| Browser Inggris→Indonesia | Unggah PDF nyata 3 halaman → 9 blok diterjemahkan → satu Markdown 2.309 byte. |
| Browser Indonesia→Inggris | Unggah PDF nyata 3 halaman → 6 blok diterjemahkan + 3 metadata yang sudah berbahasa target dipertahankan → satu Markdown 2.269 byte. |
| Pemulihan browser | Markdown sebelum dan sesudah reload/resume identik byte demi byte. Peringatan quota dokumen lama tidak mencemari dokumen baru. |
| Label penutup | Routing metadata CP20 dipertahankan; uji browser ID→EN final mempertahankan ketiga label dengan ID benar, tanpa penolakan. Bukti 1.500 halaman sebelumnya tetap tersedia. |

## Gerbang yang belum lulus

| Gerbang | Status | Bukti/alasan |
|---|---|---|
| Semantik korpus baru final | **FAIL** | 12 kasus setelah freeze: 11 terjemahan, 1 penolakan aman. Review AI enam dimensi menemukan 7 kritis, 1 mayor, 2 minor, 1 memadai, 1 tidak tuntas. Human approvals = 0. |
| Dua belas temuan kritis CP20 | **REVIEW REQUIRED** | Istilah/relasi yang ditargetkan membaik; kalimat representativitas F06-en-id tetap tidak jelas. Perbaikan istilah tidak dijadikan klaim seluruh paragraf sempurna. Lihat `semantics/PRIOR_12_REVIEW.json`. |
| Terjemahan penuh PDF besar | **NOT_RUN pada CP21 final** | Tidak mengulang inferensi 1.500 halaman ketika gerbang semantik masih gagal. Hasil parsial lama tidak berubah menjadi kelulusan. Buku asli 1.062 halaman sebelumnya hanya membuktikan parser 2.159.653 karakter, dengan 646 halaman konten belum lengkap. |
| Rumus/tabel bertingkat/OCR ilmiah penuh | **NOT_RUN untuk kualifikasi lengkap** | Regresi struktur dan PDF nyata relevan lulus; cakupan ilmiah kompleks dan review domain masih terbuka. Preservasi gambar bukan bukti rekonstruksi LaTeX. |
| Cloudflare Pages privat aktual | **BLOCKED** | Tidak ada binding akun/proyek Pages yang diotorisasi di workspace atau konektor Pages. Tidak membuat publikasi alternatif atau mengubah DNS. |
| Offline/update/rollback browser | **BLOCKED** | Preview melaporkan aplikasi offline belum aktif dan meminta HTTPS. Tidak menghapus pemeriksaan integritas. Sepuluh tes Node VM untuk cache/SW lulus tetapi tidak menggantikan browser/hosting nyata. |
| Laptop fisik 8 GB, kill/sleep | **BLOCKED** | Perangkat/operator fisik tidak tersedia. Node/cloud browser bukan bukti RAM total perangkat minimum. |
| Review independen | **BLOCKED** | Dua reviewer bilingual/domain dan adjudikasi belum tersedia. |

Contoh kegagalan final: operasi *averaging* hilang (F05); *postponement* menjadi “Penonton” (F06); selisih dua perkiraan menjadi “second difference” (F07). Ini **kegagalan teknis mesin/strategi**, bukan sekadar hambatan akses eksternal. Menambah glosarium dari jawaban holdout terus-menerus tidak membuktikan generalisasi.

Korpus baru pertama juga disimpan di `qualification-v1/`: antara lain subsidy→suap dan peluang bersyarat→opportunity of parole. Korpus itu tidak dipakai ulang sebagai korpus baru final. Alternatif mesin yang sudah diuji CP20 tetap tersedia di `evidence/cp20/semantics/alternatives/`; konfigurasi M2M100 yang sudah gagal tidak diunduh/diuji ulang tanpa alasan baru.

## Berkas dan kelanjutan

`SEMANTIK_SETARA_FINAL_SOURCE_CP21.zip` adalah source lengkap, model/runtime lokal, tes, bukti lama, dan bukti baru. `SEMANTIK_SETARA_FINAL_CLOUDFLARE_DEPLOY_CP21.zip` berisi kandidat statis yang dibangun dan diverifikasi, **bukan rilis produksi yang disetujui**. `SEMANTIK_SETARA_FINAL_QA_EVIDENCE_CP21.zip` memuat bukti baru dan rujukan historis relevan. Paket ringkas/checkpoint berisi delta, ledger, manifest, dan rujukan baseline terverifikasi agar pengguna tidak perlu mengunduh ulang model besar.

Ikuti `SEMANTIK_SETARA_CHECKPOINT_CONTINUE_CP21.md`. Tidak ada kredensial, API key, atau token akun yang dimasukkan. Hash/CRC arsip diperiksa setelah pengemasan; daftar checksum terpisah menghindari ketergantungan hash pada dirinya sendiri.
