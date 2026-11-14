# CP20 — Implementasi terjemahan dan batas bukti

Status AUD-02: **perbaikan nyata, gerbang mutu tetap FAIL**. Status AUD-10: **cacat kontrak pemulihan deterministik diperbaiki dan unit diuji**; pemeriksaan alur UI oleh integrator tetap terpisah.

## Perubahan kode

- `app/app/semantic-spans.js`: konteks matematika (himpunan/subgrup hingga, barisan monoton terbatas, konvergensi, diferensial/kontinuitas/konvers); kimia (solution berdasarkan pelarut, katalis, laju reaksi, pengenceran, reaksi antara); ekonomi (demand dengan pembatas konteks saran/informasi); penerbitan (appendix/lampiran dengan pengecualian konteks anatomi); penelitian (generalisasi, sampel, populasi). Yang dibatasi adalah konsep/istilah, bukan keluaran utuh contoh.
- `app/app/claim-guards.js`: invariansi konsep dan pembatas hingga/tak hingga, larutan, demand, konvergensi, katalis tidak habis bereaksi, diferensial/kontinuitas, generalisasi, lampiran, serta modalitas negatif. Guard ini tidak membuktikan kesetaraan semua kalimat.
- `app/app/translation.js`: normalisasi negasi leksikal tertentu, terminologi modalitas, kapital awal kalimat, identitas `RULESET`, metrik permintaan worker/cache per blok, tipe penolakan deterministik, dan instruksi pemulihan yang menuntut perubahan sumber/glosarium. Tabel mengagregasi metrik dan hanya ditandai retryable bila ada kegagalan transient; penolakan deterministik tidak lagi mengajak mencoba ulang identik.

`RULESET = cp20-context-terminology-meaning-guards-v4-mechanical`. Fingerprint mesin menyertakan identitas adapter. Identitas build/source tetap diperlukan untuk perubahan lain. Bobot model dan engine ONNX/WASM asli tidak diubah.

## Pengujian

- `node tests/cp20-semantic-guards.mjs`: 51 kontrol lulus (validator, konteks istilah, retry/cache dengan stub yang dinyatakan eksplisit).
- `node tests/translation-regression.mjs`: 77 kontrol lulus.
- `node tests/translation-scientific-identities.mjs`: 51 kontrol lulus.
- `node tests/cp20-semantic-development.mjs`: model aktual terhadap 38 kasus audit/acceptance CP19 yang kini menjadi regresi pengembangan.
- `node tests/cp20-semantic-first-holdout.mjs`: korpus pertama 40 kasus sekarang merupakan regresi pengembangan. Bukti gagal sebelum perbaikan v2 disimpan di `first-holdout-failed/` beserta source asli.
- `node tests/cp20-semantic-holdout.mjs`: 30 kasus baru setelah pembekuan semantik v2; 5 domain, kedua arah, prosa panjang. Keluaran aktual dicatat tanpa penggantian jawaban oleh harness.
- `RECOVERY_METADATA_PARITY.json`: seluruh 30 target persis identik sebelum/sesudah perbaikan metadata; hanya CP20-H-026 berubah failed/retryable menjadi rejected/nonretryable. Perubahan ini tidak dilabeli korpus baru.

Bridge Node hanya mengganti transport Worker, fetch berkas lokal, dan cache in-memory. Ia tidak membuktikan browser UI, offline persisten, perangkat fisik, atau total RAM. `metrics.inferenceCalls` menghitung permintaan penerjemahan ke worker (termasuk percobaan gagal), bukan jumlah forward pass ONNX. `inputTokens/outputTokens` berasal dari respons mentah yang berhasil; cache hit hanya cache dalam blok adapter. Inference asli berjalan, tetapi angka ini tidak boleh dipakai sebagai hitungan semua kernel/forward pass model.

## Gerbang semantik

Korpus historis v2 yang dijalankan ulang sebagai parity menghasilkan 23 target berstatus `translated`, 7 sumber dipertahankan karena penolakan. Penelaahan AI enam dimensi menandai 9 hasil terjemahan dengan perubahan kritis. **Tidak ada klaim akurasi populasi atau persetujuan manusia.** Agen AI utama mengonfirmasi secara terpisah beberapa kegagalan kritis. Baca `SEMANTIC_REVIEW.md` dan `SEMANTIC_REVIEW_AI.json`.

Kegagalan termasuk nonempty→single-element, ketentuan hipotesis dipenuhi→hipotesis masih kuat, saldo rekening→keseimbangan, pelarutan→solving, penyebut→mention, serta beban ekonomi/penawaran. Guard juga mempunyai false positive pada sejumlah negasi leksikal dan konstruksi kuantor; sumber tetap aman, tetapi target tidak tuntas. Ini adalah pekerjaan teknis terbuka, bukan hambatan yang selesai hanya dengan reviewer manusia.

Model produk tidak diganti. M2M100 q8 benar-benar diunduh, diverifikasi, lalu diuji secara terisolasi: 30 paragraf mentah dan 14 kasus dengan segmentasi produksi. Kandidat tetap merusak konsep matematika/kimia/statistik dan tidak membuktikan keunggulan untuk penggantian. Lihat `alternatives/ALTERNATIVE_MODEL_ASSESSMENT.md` untuk teks aktual, ukuran, memori, waktu, lisensi, dan batas perbandingan. Kegagalan semantik ini menghalangi productionReady:true.

`HUMAN_REVIEW_BILINGUAL.csv` menyediakan sumber, target, referensi buatan AI dan kolom penilaian/reviewer kosong. Reviewer bilingual/domain dan adjudikasi nyata belum dilakukan.

## Koreksi integrasi identifier

Uji kapasitas aktual menemukan bahwa kalimat yang hanya berisi identifier dengan underscore ditolak sebelum prosa berikutnya diproses. Perlindungan atom identifier umum (huruf/angka/underscore/tanda hubung) diperbaiki tanpa aturan prefix fixture. END/AKHIR dan kata batas umum diperlakukan sebagai prosa yang dapat diterjemahkan. Sembilan inferensi nyata, meliputi reproduksi yang gagal dan bentuk identifier lain dalam kedua arah, lulus menghasilkan target. Snapshot sebelumnya disimpan pada `pre-identifier-fix/`. Perbaikan ini menaikkan RULESET menjadi v3-identifiers dan memerlukan build baru; korpus semantik lama dipakai untuk parity, bukan diklaim baru.

## V4 mekanis dan acceptance baru

Negasi leksikal unsupported/tidak didukung dinormalisasi secara simetris dengan penjagaan pembalikan tetap aktif. Predikat bounded/monotone yang terpisah dari sequence kini mengaktifkan konteks matematika; larangan memakai arti matematis pada konteks nonmatematika tetap diuji. Empat regresi nyata menghasilkan target; ini bukti perbaikan mekanis, bukan kelulusan mutu keseluruhan. Snapshot v3 disimpan di `pre-v4-mechanical/`.

Setelah aturan v4 dibekukan, sepuluh paragraf baru lima domain/kedua arah menghasilkan sembilan target dan satu penolakan. Review enam dimensi AI menemukan empat perubahan kritis: rata-rata populasi, klaim pencatatan keliru, harga barang substitusi yang hilang, dan kalibrasi menjadi Calicacy. Tidak ada penyesuaian aturan dari hasil ini. `V4_SEMANTIC_REVIEW.md`, `V4_SEMANTIC_REVIEW_AI.json`, dan `V4_HUMAN_REVIEW_BILINGUAL.csv` menyimpan temuan dan kolom reviewer manusia kosong. Persetujuan manusia **0**; semantik **FAIL**.

## Ikatan build final

Inferensi final menggunakan `cp20-1668833ad37c9dd8` (source SHA-256 `1668833ad37c9dd8ce8859f583a4c3bde606ddbf29785e15c0ca3bbaa79401fd`). Seluruh 30 target historis dan 10 target acceptance v4, status, retry serta metrik sama persis dengan run source pembanding masing-masing; modul semantik byte-identik dengan source dan cocok manifest deploy. Sembilan probe identifier juga berhasil pada build yang sama. Lihat `FINAL_DIST_SEMANTIC_BINDING.json`, `V4_FINAL_DIST_SEMANTIC_BINDING.json`, dan `IDENTIFIER_FINAL_BINDING.json`. Kelulusan ikatan build tidak mengubah gerbang semantik **FAIL** dan persetujuan manusia **0**.

## Ikatan komponen ke rilis kemasan terakhir

Rilis kemasan terakhir adalah `cp20-8c643bea6962471f`; inferensi di atas **tetap benar-benar dijalankan pada `cp20-1668833ad37c9dd8`**. Tidak ada inferensi ulang yang diklaim untuk hash baru. `FINAL_COMPONENT_PARITY_BINDING.json` mencatat 36 pemeriksaan: tiga modul semantik, seluruh payload model, dan runtime byte-identik; worker serta manifest model hanya berbeda pada URL dasar rilis immutable. Hash mentah kedua versi, hash setelah normalisasi URL yang terbatas, dan kecocokan manifest final dicatat eksplisit. Identitas kedua model juga sama. Perubahan ETA/riwayat pemulihan pada app utama tidak diuji oleh bukti semantik ini.

Binding komponen **PASS** mempertahankan temuan semantik sebelumnya: korpus historis 30 memiliki 9 kesalahan kritis/7 penolakan, korpus baru v4 10 memiliki 4 kesalahan kritis/1 penolakan, penilaian AI saja dan persetujuan manusia **0**. Ini tidak mengubah keputusan semantik **FAIL**.
