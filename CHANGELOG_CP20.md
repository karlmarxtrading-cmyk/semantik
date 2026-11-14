# CP20 — perubahan dari CP19

**CHECKPOINT_NOT_PRODUCTION_READY.** Build aplikasi `cp20-8c643bea6962471f` (0.20.0). Seluruh perubahan berikut nyata; kelulusan terbatas pada bukti masing-masing, bukan jaminan terjemahan ilmiah.

- Pipeline PDF menjadi ekstraksi–checkpoint sumber–inferensi–commit per halaman, dengan data aktif terbatas, transaksi atomik, penyimpanan satu PDF sumber, lazy restore, provenance dan penguncian penulis.
- Ekspor satu Markdown bertahap melalui OPFS dengan fallback terbatas, rekonsiliasi halaman/blok, penyelamatan parsial dan hasil belum tersimpan, hierarki heading/list, serta deduplikasi aset.
- Batas References diperbaiki ketika bab baru dimulai. Figur raster/vektor dan fallback rumus tetap dipertahankan; ketidakpastian matematika tidak disembunyikan.
- Istilah kontekstual dan guard klaim/angka/negasi/ID diperbaiki; hasil deterministik yang ditolak tidak lagi menawarkan retry yang tidak berguna. Evaluasi baru tetap menemukan kesalahan kritis, sehingga perbaikan ini tidak menutup mutu semantik umum.
- Identitas manifest offline, lisensi/notice dan cache sesuai build. Namespace CP19 dipertahankan untuk impor tab lama. Integritas byte tetap ketat; preview yang menyisipkan HTML ditolak sesuai desain.
- Kuota dokumen dipulihkan sekali dengan menghapus hanya entri model publik yang dikenali, mempertahankan progres dan mesin sesi, serta mereset kesiapan offline. Pemulihan otomatis teramati pada run browser 1.001 halaman.
- Font bantuan 14 px, kontrol 44 px, progres/jeda/lanjut dan estimasi dari halaman baru nyata; traversal cache dan sisa halaman parsial tidak menghasilkan estimasi kecepatan palsu.

32 suite regresi dan 14 pemeriksaan sintaks lulus pada source final. Build kanonik dapat direproduksi byte-identical; manifest deploy mengikat 598 berkas. Bukti historis tidak dipromosikan menjadi eksekusi final: run inferensi 1.001 halaman pada build1668 diikat dengan hash komponen dan uji parity perubahan ETA; run browser 1.500 halaman memakai build8c final. Detail aktual selalu mengikuti `RELEASE_ACCEPTANCE_CP20.json` dan rekonsiliasi unduhan.

Yang tetap terbuka: kesalahan terjemahan ilmiah; metadata pendek yang sudah berbahasa Inggris ditolak dalam dokumen ID→EN; kualifikasi terjemahan penuh buku alami >2 juta karakter, rumus/OCR kompleks, memori perangkat fisik, sleep/wake, penghentian proses, zoom, dan offline/update/rollback pada hosting byte-exact. Buku asli 85,9 MB gagal disimpan di browser pengujian karena kuota; aplikasi menolak melanjutkan sebelum sumber aman tersimpan. Tidak ada persetujuan reviewer manusia atau rilis situs publik.
