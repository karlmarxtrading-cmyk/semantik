# Titik kelanjutan yang aman

1. Verifikasi EMERGENCY_RECOVERY_RECEIPT.json dan checkpoint ZIP.
2. Ekstrak source archive di dalam checkpoint ke folder baseline; jangan menimpa artefak asli.
3. Buat working copy terpisah. Mulai dari app/app/translation.js, claim-guards.js, tokenizer.js dan long-document.js sesuai bukti.
4. Perbaiki penanganan metadata yang sudah berbahasa target secara umum; jangan gunakan pengecualian berdasarkan ID fixture atau menghapus pemeriksaan.
5. Kasus semantik v4 yang kini terlihat menjadi regresi. Bekukan perubahan, lalu gunakan korpus penerimaan baru; review AI dilabeli AI.
6. Gunakan uji pendek, seluruh 1.500 metadata yang telah diekstrak, dan rekonsiliasi ekspor tanpa mengulang inferensi 1.500 halaman. Ulangi run panjang hanya bila perubahan pipeline membutuhkan bukti baru dengan alasan tertulis.
7. Simpan hasil pada tahap penting. Status produksi tetap false sampai seluruh gerbang terpenuhi.
