# CP20 — Penilaian mutu semantik dua arah

**Status: FAIL.** Temuan ini adalah keterbatasan teknis mesin/guard, bukan hanya ketiadaan persetujuan manusia.

Korpus historis v2 berisi 30 teks baru setelah pembekuan aturan v2, meliputi matematika, kimia, statistik, ekonomi, dan prosa akademik. 23 hasil berstatus mesin translated; 7 hasil tidak tuntas dan mempertahankan sumber. Penelaahan AI menandai 9 hasil terjemahan dengan perubahan kritis. Angka ini bukan akurasi populasi.

Penulis korpus dan penilai ini adalah AI. Penilaian AI kedua oleh agen utama mengonfirmasi sedikitnya lima contoh kritis yang disebut dalam JSON. Persetujuan manusia: **0**. Nilai per dimensi 0–2 mengikuti rubrik yang dibekukan sebelumnya; hasil tanpa terjemahan diberi nilai kosong, bukan angka kelulusan.

| ID | Arah | Status mesin | Kesalahan kritis | Catatan |
|---|---|---|---|---|
| CP20-H-001 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Isi matematika terjaga; sintaks "fungsi menjadi dapat diturunkan" dan "titik akhir" kurang alami. |
| CP20-H-002 | en-id | translated | YA | Syarat hypotheses hold berubah menjadi hipotesis masih kuat: pemenuhan syarat tidak setara dengan kekuatan hipotesis. |
| CP20-H-003 | en-id | translated | YA | Nonempty finite set berubah menjadi elemen tunggal; ordering menjadi pesanan/pemesanan. Klaim matematika berubah. |
| CP20-H-004 | en-id | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Arah perubahan pada klaim ilmiah berubah. |
| CP20-H-005 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Recovered dalam eksperimen diterjemahkan ditemukan; konteks penggunaan ulang membantu tetapi istilah perolehan kembali lebih tepat. |
| CP20-H-006 | en-id | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Periksa negasi: bentuk negatif mungkin berubah. |
| CP20-H-007 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Relasi ketidakpastian dan larangan menafsirkan interval sebagai seluruh pengamatan terjaga; quantities menjadi jumlah kurang tepat. |
| CP20-H-008 | en-id | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Periksa negasi: bentuk negatif mungkin berubah. Periksa kuantor: cakupan pernyataan mungkin berubah. |
| CP20-H-009 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Rata-rata, median, data tetap disertakan, dan lampiran terjaga. Tata bahasa "Analisis yang digunakan" kurang lancar. |
| CP20-H-010 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Beban pajak dan respons relatif penawaran-permintaan terjaga; responsi/pasokan kurang baku secara ekonomi. |
| CP20-H-011 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Perbedaan perubahan permintaan dan pergerakan kuantitas serta risiko membalik penjelasan terjaga. |
| CP20-H-012 | en-id | translated | YA | Account balance berubah menjadi keseimbangan pada akun, kehilangan makna saldo keuangan. |
| CP20-H-013 | en-id | translated | YA | Interview schedule sebagai instrumen/pedoman pertanyaan menjadi jadwal waktu; does not certify menjadi tidak menyatakan, lebih lemah. |
| CP20-H-014 | en-id | translated | Tidak ditemukan dalam penilaian AI ini | Akses peralatan, kebutuhan bukti tambahan untuk generalisasi, dan urutan pembahasan dipertahankan. |
| CP20-H-015 | en-id | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Periksa negasi: bentuk negatif mungkin berubah. |
| CP20-H-016 | id-en | translated | YA | Di seluruh interval menjadi at all intervals, mengubah cakupan pada satu interval menjadi semua interval. |
| CP20-H-017 | id-en | translated | YA | Perubahan di seluruh interval menjadi at all intervals; cakupan interval berubah walaupun syarat hipotesis sudah terjaga. |
| CP20-H-018 | id-en | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Pembatas hingga/tak hingga pada konsep matematika hilang atau berubah. Periksa negasi: bentuk negatif mungkin berubah. |
| CP20-H-019 | id-en | translated | YA | Melarutkan gula menjadi Solving sugar, istilah proses kimia salah. |
| CP20-H-020 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | Klaim bahan tidak hilang belum dibuktikan dan kebutuhan pembandingan massa tetap ada; Returning alone kurang jelas untuk recovery. |
| CP20-H-021 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | 6 mmol, 2 L awal, penambahan 2 L, penurunan konsentrasi, jumlah garam, dan syarat tidak tumpah terjaga; grammar lemah. |
| CP20-H-022 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | Sample fetching procedure kurang tepat untuk sampling procedure; larangan menyamakan interval dengan semua pengamatan tetap ada. |
| CP20-H-023 | id-en | translated | YA | Penyebut menjadi mention. A treatment juga ambigu antara label kelompok A dan artikel bahasa Inggris; angka 7/11 tetap ada. |
| CP20-H-024 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | Hubungan ekstrem-rata-rata, alasan median, data tidak dihapus, serta lampiran terjaga; bentuk Analyze dan frasa appendix articles kurang lancar. |
| CP20-H-025 | id-en | translated | YA | Beban ekonomi menjadi cost of the economy; kepekaan relatif menjadi relativeity, penawaran menjadi offer. Penjelasan insidensi pajak rusak. |
| CP20-H-026 | id-en | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Periksa negasi leksikal: makna sifat atau perubahan mungkin berbalik. |
| CP20-H-027 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | Tabungan nominal, harga, daya beli dan saldo dibedakan dengan benar; beberapa preposisi hilang. |
| CP20-H-028 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | Pedoman wawancara dalam lampiran serta tidak menjamin pemahaman seragam terjaga; responder kurang tepat dibanding respondent. |
| CP20-H-029 | id-en | translated | Tidak ditemukan dalam penilaian AI ini | Generalisasi dan akses terjaga. Sukarelawan jamak ke person tunggal serta penulis ke author mempersempit bentuk tanpa perubahan pokok klaim. |
| CP20-H-030 | id-en | rejected | Tidak dinilai—sumber | Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. Periksa negasi: bentuk negatif mungkin berubah. |

## Batas evaluasi

Korpus pertama 40 kasus dinyatakan gagal, disimpan utuh dalam `first-holdout-failed/`, dan secara eksplisit dipromosikan menjadi regresi pengembangan untuk perbaikan konsep. Ia tidak digunakan sebagai korpus independen final. Korpus v2 berisi 30 teks berbeda. Setelah pembekuan v2, metadata pemulihan guard serta perlindungan atom identifier diperbaiki karena cacat integrasi. Pada v4, negasi unsupported/tidak didukung dan predikat barisan terpisah diperbaiki secara mekanis. Korpus baru sepuluh kasus v4 dinilai terpisah dalam V4_SEMANTIC_REVIEW.md. Korpus lama yang sama dijalankan ulang untuk pembandingan target dan ikatan build final; tidak disebut korpus baru yang belum terlihat. Bukti perubahan metadata terdapat di `RECOVERY_METADATA_PARITY.json`, uji identifier nyata di `IDENTIFIER_INFERENCE.json`, dan pembandingan final di `FINAL_DIST_SEMANTIC_BINDING.json`.

Peringatan guard juga mempunyai false positive pada none/tidak ada, incomplete/tidak lengkap, nonempty/tidak kosong, dan unchanging/tidak berubah. Penolakan mempertahankan sumber, tetapi menghalangi ketuntasan terjemahan. Ini tetap pekerjaan teknis terbuka.

Bobot ONNX tidak diganti. Perbaikan berupa konteks istilah dan validasi hubungan konsep; keduanya tidak mengatasi seluruh keterbatasan penerjemahan bebas, tata bahasa, konteks antarkalimat, atau penalaran ilmiah. Model/strategi yang lebih baik perlu dibuktikan pada korpus baru dan tidak dapat digantikan dengan klaim kelulusan guard.

## Review manusia

`HUMAN_REVIEW_BILINGUAL.csv` berisi sumber, hasil, referensi buatan AI, dan kolom reviewer kosong. Diperlukan reviewer bilingual/domain yang nyata; belum ada persetujuan/adjudikasi yang diklaim. Review manusia tidak dengan sendirinya memperbaiki kegagalan teknis yang sudah terbukti.
