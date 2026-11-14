# Titik kelanjutan CP19

Lanjutkan dari build `cp19-6ed0d134e1770b27`, bukan dari CP17 atau aplikasi lama. Source, model, fixture, dan bukti ada dalam paket ini. Status **NOT PRODUCTION READY**; persetujuan manusia 0. Situs aktif tidak diganti.

1. Mulai dengan `evidence/cp19/RELEASE_ACCEPTANCE_CP19.json` dan `SEMANTIC_QA_PER_ID.json`. Reproduksi CP19-A-010 (hilangnya finite/hingga), A-012 (klaim katalis), A-008 (relasi observed actions), dan A-016 (demand ekonomi). Temuan acceptance ini belum diperbaiki. Korpus tersebut harus menjadi regresi bila dipakai untuk tuning; siapkan holdout baru untuk penerimaan berikutnya.
2. Evaluasi mesin/decoder/konteks yang mempertahankan relasi ilmiah, dengan lisensi, native tokenizer parity, memori browser, dan distribusi shard. Evaluasi 170 keluaran pada `CP19_ENGINE_RESEARCH_EVIDENCE.zip` sudah menolak kandidat pengganti yang diuji. Jangan mengulangi eksperimen sama tanpa hipotesis baru.
3. Lengkapi matematika yang masih belum terbukti: akar dengan garis cakupan, cases/sistem, penomoran persamaan, limit/sigma kompleks, formula tabel/inline geometri, dan matematika scan. Jangan menebak; tetap sertakan citra sumber dan label unverified. Delapan rumus audit dan kontrol yang sudah lulus harus tetap lulus.
4. Jalankan hosting staging privat yang menyajikan byte utuh dan menerapkan `_headers`. Tutup uji CSP/MIME/cache/offline/update/rollback. Preview saat ini mengubah HTML sehingga SW menolak integritas; jangan mengubah pemeriksaan hash.
5. Kualifikasi perangkat fisik minimum, BFCache, batas beban PDF, storage penuh, total memori termasuk WASM, dan interaksi ketika memori rendah. Tes fault injection lokal tidak menggantikan perangkat nyata.
6. Minta dua reviewer bilingual independen dan adjudicator mengisi `review-bilingual/`; bahan sudah tersedia. Tidak ada persetujuan yang dapat disimpulkan dari penilaian AI.
7. Setiap perubahan aplikasi membuat sourceHash baru. Jalankan kembali regresi yang terdampak, inferensi PDF, ekspor baru, dan browser terhadap build akhir yang sama. Simpan checkpoint baru; jangan menimpa baseline atau evidence lama.

Artefak final memiliki manifest/checksum. `dist/qa/` hanya harness lokal dan tidak boleh dikemas ke deploy. Raster Node memiliki keterbatasan font; contoh final berasal dari Chrome dan telah diperiksa. Laporan historis tidak boleh dipromosikan sebagai bukti build baru.
