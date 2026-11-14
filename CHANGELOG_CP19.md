# Perubahan CP19

Build `cp19-6ed0d134e1770b27` · **NOT PRODUCTION READY**.

- Menambahkan rekonstruksi matematika berbasis posisi teks dan vektor PDF: pangkat, indeks, pecahan bertingkat, batas integral, matriks, fungsi, himpunan, dan relasi. Setiap hasil membawa AST serta identitas elemen sumber. Bentuk yang tidak pasti tetap berlabel tidak terverifikasi.
- Melindungi prime, double prime, aksen, Unicode matematika, unit/prefiks, dan identitas ilmiah. Menambahkan guard arah perubahan, relasi nilai terhadap kelompok, kedua/both, only if, konteks klinis, istilah ilmiah, serta cakupan interval terhadap efek nol.
- Menambahkan percobaan alternatif yang terbatas dengan proteksi literal tetap aktif. Kandidat deterministik yang sama tidak diulang terus; sumber yang dipertahankan karena penolakan tidak dihitung sebagai terjemahan berhasil.
- Mengubah keluaran utama menjadi satu `.md`: LaTeX inline/display, citra sumber data URI, status parsial, dan kegagalan eksplisit bila aset wajib hilang. Memperbaiki batas formula inline agar operand serta tanda kurung tidak terpotong.
- Menyederhanakan alur PDF → terjemahkan → unduh. Arah lawan otomatis menjadi default; review dan ekspor tambahan bersifat opsional. Hasil yang dipulihkan mempertahankan identitas build asal.
- Memisahkan kebijakan cache shell, service worker, dan aset rilis. Bobot identik memakai kunci hash konten yang divalidasi; sesi aktif dan cache rollback tidak dihapus agresif.
- Memperbarui pemberitahuan PDF.js 6.2.108, dokumentasi, serta toolchain renderer KaTeX 0.19.1. Audit dependensi tooling terkunci melaporkan 0 kerentanan.
- Menambahkan regresi dan menghasilkan bukti baru dari PDF, inferensi lokal nyata, browser, unduhan, dan render. Model alternatif dibandingkan dalam 170 evaluasi nyata; hasilnya tidak membenarkan penggantian model yang ada.

Masih terbuka: kesalahan makna pada acceptance terpisah, cakupan matematika kompleks, kualifikasi perangkat/batas beban, review manusia, serta hosting/offline/update/rollback nyata. Lihat laporan penerimaan; changelog ini bukan persetujuan produksi.
