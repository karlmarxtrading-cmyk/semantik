# Perbaikan metadata pendek pada pemulihan CP20

**PASS dalam lingkup klasifikasi/routing yang diuji; produk tetap NOT PRODUCTION READY.**

## Penyebab yang teramati

Sumber footer aktual adalah `CP20P0001 END` sampai `CP20P1500 END`. Bahasa prosa tidak dapat dikenali dari dua token tanpa kata fungsi yang cukup. Pipeline kemudian menggunakan bahasa dokumen Indonesia, meminta arah ID→EN, dan guard dengan benar menolak kandidat yang tidak berubah bahasa. Semua 1.500 penolakan memiliki pola ini menurut bukti tersimpan.

## Perubahan

`app/app/metadata-language.js` mengenali grammar terbatas yang seluruh tokennya terdiri atas label EN atau ID yang dikenal dan pengenal alfanumerik/nomor. Label bahasa campuran, prosa bebas, negasi tambahan, satuan seperti `20mg`, operator rumus, markup, dan teks panjang menghasilkan `unknown` serta tetap mengikuti jalur biasa. Kode tidak memuat ID atau keluaran fixture CP20.

`long-document.js` mempertahankan label yang sudah berada dalam bahasa target dengan alasan `already-target-metadata`. Statusnya `preserved`, bukan `translated`; sumber, nomor halaman, ID blok dan item sumber tetap sama. Reason lama dihapus ketika hasil diinvalidasi atau blok kembali diterjemahkan. Root mengintegrasikan helper yang sama ke jalur nonstream `main.js` secara terpisah.

Pemeriksaan unchanged-language untuk terjemahan langsung/prosa tetap aktif. Ini bukan pelemahan guard atau verifikasi semantik otomatis. Label dari bahasa sumber yang berbeda tetap harus diterjemahkan melalui mesin.

## Bukti

- `RESULTS.json`: 55 kasus independen; 3.000 observasi footer tersimpan (1.500 Node dan 1.500 browser); dua kontrol pipeline/ekspor pendek, kedua arah.
- `NODE_1500_METADATA_REPLAY.json` dan `BROWSER_1500_METADATA_REPLAY.json`: setiap halaman/ID/sumber yang dibaca dari MD historis, serta keputusan routing baru. MD historis tidak diubah.
- `CONTROL_id_en.md` dan `CONTROL_en_id.md`: ekspor kontrol pendek dengan translator terkontrol. Prosa yang sengaja ditolak tetap memiliki status dan penanda parsial; tidak dinaikkan menjadi selesai.
- Perintah: `node tests/recovery-metadata-language.mjs`.

Tidak ada ekstraksi atau inferensi PDF 1.500 halaman baru. Tidak ada klaim bahwa prosa lama kini benar atau bahwa seluruh terjemahan lama selesai. Tes kontrol memakai pipeline dan exporter aktual dengan translator double; penerimaan mesin/browser adalah bukti terpisah. Hasil dapat direproduksi dalam kurang dari satu detik pada runtime yang diuji.
