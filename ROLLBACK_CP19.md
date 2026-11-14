# Rollback CP19 — prosedur, belum dieksekusi pada hosting

Simpan deployment sebelumnya dan hash artefaknya. CP18 yang diverifikasi sebagai baseline memiliki SHA-256 `32743e819993a011c5ff4f34de90292a76c29d9963f1258542be5382965df2dc`, ukuran 223.289.243 byte, 297 file.

1. Sebelum pengujian update/rollback, unduh hasil pekerjaan dan simpan PDF sumber. Jangan menghapus IndexedDB atau cache pengguna secara otomatis.
2. Pada staging terotorisasi dan profil browser pengujian terpisah, promosikan kembali deployment sebelumnya melalui kontrol rollback hosting. Jangan melakukan rollback situs aktif tanpa izin owner.
3. Pertahankan aset rilis lama selama masih ada sesi aktif. CP19 tidak menghapus cache lintas rilis secara agresif; model memakai hash konten dan diverifikasi saat dibaca.
4. Muat ulang dan periksa identitas rilis, hash shell, model, hasil contoh, serta akses offline. Jangan memaksa pengambilalihan service worker saat pekerjaan pengguna masih berjalan.
5. Jangan mengasumsikan CP18 dapat melanjutkan seluruh metadata matematika CP19. Kompatibilitas downgrade checkpoint pengguna belum dikualifikasi. Kembali ke CP19 untuk melanjutkan pekerjaan CP19 bila baseline lama tidak mendukungnya.

Simpan bukti rollback terpisah. Dokumen ini menyiapkan tindakan; bukan klaim rollback telah berhasil. Checkpoint source CP19 lengkap tersedia dalam `SEMANTIK_SETARA_CP19_SOURCE_AND_QA.zip` dan tidak bergantung pada sesi sementara.
