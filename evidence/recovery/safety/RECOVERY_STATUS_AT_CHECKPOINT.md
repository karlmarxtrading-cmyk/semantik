# Penyelamatan darurat — CP19 sebagai nama target, CP20 sebagai isi aktual

**NOT PRODUCTION READY.** Workspace sementara lama tidak tersedia. Pemulihan berasal dari paket CP20 yang benar-benar disimpan, bukan dari dugaan isi memori. Seluruh 14.598 berkas source yang tercatat telah dicocokkan ukuran dan SHA-256; ZIP source, deploy dan bukti lolos CRC.

Baseline terselamatkan: cp20-8c643bea6962471f. Kode aktif berbeda dari CP19; contoh hash per modul tersedia di RECOVERY_INITIAL_VERIFICATION.json. Tidak ada rollback ke CP19.

Node 1.500 halaman: satu MD aktual tersedia, 3.000 translated/1.500 rejected; laporan pemetaan footer dan review AI tersedia. Browser 1.500 halaman ternyata sudah selesai pada build final sebelum sesi ini: unduhan 1.008.613 byte tersedia, seluruh 1.500 halaman/4.500 blok tercatat, tanpa klaim bahwa maknanya benar. Bukti telah dibaca dan diverifikasi.

Tidak dapat dipulihkan dari workspace: proses lama, dependensi sementara, profil/IndexedDB browser lama, atau perubahan yang tidak pernah disimpan. Tidak ada proses lama yang terlihat di runtime sekarang. Tidak ada uji berat dijalankan ulang sebelum checkpoint ini.

Arsip ini memuat ZIP source asli tanpa kompresi ulang, manifest lengkapnya, serta salinan cepat 20 bukti penting. Source lengkap di dalam ZIP tersebut mencakup model/runtime, tes, ledger dan seluruh hasil tersimpan. Deploy asli dipertahankan terpisah dengan hash; tidak digandakan di dalam checkpoint agar model tidak disalin dua kali.

Sesudah checkpoint disimpan permanen: buat salinan kerja terpisah, investigasi bahasa metadata pendek dan temuan semantik, jalankan tes terarah, ikat perubahan ke build baru dan pertahankan bukti 1.500 halaman sebagai historis. Jangan menyatakan run lama sebagai inferensi ulang source baru.
