# Status semantik rilis kemasan final

Rilis kemasan: **cp20-8c643bea6962471f**. Gerbang semantik: **FAIL**.

Inferensi aktual dilaksanakan pada **cp20-1668833ad37c9dd8**. Pemeriksaan `FINAL_COMPONENT_PARITY_BINDING.json` membuktikan komponen semantik/model/runtime yang sama pada manifest akhir melalui 36 pemeriksaan. Modul semantik, payload model dan runtime identik byte; worker serta manifest model dibandingkan setelah hanya URL dasar rilis immutable dinormalisasi, dengan hash mentah tetap dicatat. **Tidak ada klaim inferensi ulang pada rilis kemasan akhir.**

| Bukti eksekusi aktual | Target diterjemahkan | Sumber ditahan/ditolak | Kesalahan kritis pada target menurut AI |
|---|---:|---:|---:|
| Korpus historis v2, 30 kasus | 23 | 7 | 9 |
| Acceptance baru sesudah freeze v4, 10 kasus | 9 | 1 | 4 |

Sembilan probe identifier juga berhasil pada rilis eksekusi yang sama. Nilai ini adalah observasi pada korpus yang tercatat, bukan akurasi populasi. Persetujuan manusia **0**. Review enam dimensi dan formulir manusia tersedia dalam `SEMANTIC_REVIEW_AI.json`, `V4_SEMANTIC_REVIEW_AI.json`, `HUMAN_REVIEW_BILINGUAL.csv`, dan `V4_HUMAN_REVIEW_BILINGUAL.csv`.

Perubahan ETA/riwayat pemulihan pada rilis akhir berada di luar cakupan bukti semantik. Penilaian M2M100 terisolasi tetap tidak menunjukkan alasan untuk mengganti model produk; lihat `alternatives/ALTERNATIVE_MODEL_ASSESSMENT.md`.
