# Ringkasan bukti QA CP20

Build paket: `cp20-8c643bea6962471f`. **Belum production ready.** Bukti ini membedakan kapasitas teknis, status terjemahan, dan mutu makna.

| Pemeriksaan | Hasil | Batas bukti |
|---|---|---|
| Integritas unggahan | PASS: 1185 record manifest, 3 ZIP tanpa CRC error | Identitas source, bukan mutu produk |
| Regresi final | PASS: 32 suite, 14 modul sintaks | Source stabil; subtes tidak dijumlahkan lagi |
| Kapasitas parser | PASS: 300, 301, 1.000, 1.001, 1.500 halaman; tambahan 1.001 kaya teks | Parser nyata dengan Canvas native, bukan browser |
| Batas karakter lama | PASS: 2,486,906 karakter diekstrak; 13,013 ID paragraf utuh | Belum inferensi penuh untuk dokumen kaya teks |
| Rekonsiliasi teks sumber | PASS: 5,103 halaman cocok seluruh teks dan urutan | Hanya spasi dinormalisasi; dibandingkan ground truth ber-SHA asli |
| Byte masukan | PASS: PDF tepat 100 MiB dibuka/diekstrak; +1 byte ditolak | Stream inert memisahkan ukuran berkas dari volume gambar |
| Markdown sumber | PASS: enam keluaran penuh, render Marked, rekonsiliasi halaman/ID | Ekstraksi sumber, bukan terjemahan selesai |
| Makna terjemahan | FAIL: kesalahan kritis masih ditemukan dalam tinjauan AI | Persetujuan manusia 0; bukan skor akurasi populasi |

## Inferensi aktual melalui Node

| Kasus | Build eksekusi | Halaman | Diterjemahkan / ditolak | Ukuran MD | Waktu keseluruhan |
|---|---|---:|---:|---:|---:|
| capacity-1001-en.pdf | `cp20-4694bad623ed9b19` | 1001 | 2803 / 200 | 458,521 byte | 1214.02 detik |
| capacity-1500-id.pdf | `cp20-1668833ad37c9dd8` | 1500 | 3000 / 1500 | 1,008,350 byte | 2227.43 detik |

Kedua keluaran tetap berlabel parsial. Kasus 1.001 halaman berasal dari build historis 4694. Kasus 1.500 halaman memakai 1668; kesetaraan komponen dan pengujian patch ETA mengikat bukti kapasitas/mesin yang relevan ke build final. Ini bukan pengujian ulang seluruh antarmuka final.

Pada kasus 1.500 halaman, prosa: 1500 diterjemahkan dan 0 ditolak; footer jejak berbahasa Inggris: 1500 ditolak sebagai keluaran tidak berubah bahasa. Penolakan metadata ini dipisahkan dari kesalahan semantik prosa.

### Panggilan mesin dan memori

- capacity-1001-en.pdf: 4,705 panggilan mesin aktual; 3,003 input blok mentah unik; 1,020 input mesin setelah proteksi unik; 3,685 permintaan bertopeng berulang; cache hit kalimat 0. Puncak RSS Node tersampel 1,306,447,872 byte.
- capacity-1500-id.pdf: 7,650 panggilan mesin aktual; 4,500 input blok mentah unik; 1,523 input mesin setelah proteksi unik; 6,127 permintaan bertopeng berulang; cache hit kalimat 0. Puncak RSS Node tersampel 1,266,671,616 byte.

RSS tersebut bukan RAM browser atau kualifikasi perangkat fisik. Pengujian Node memakai worker nyata dan fake-indexeddb; penyimpanan browser, UI, dan unduhan aktual harus mengacu pada bukti browser terpisah milik laporan rilis.

Fixture panjang sintetis ini memakai 10 pola paragraf bidang ilmu yang berulang dengan ID/nilai unik; bukan buku alami atau korpus semantik buta. Status diterjemahkan tidak berarti makna sudah benar. Tinjauan AI pasca-observasi pada 10 paragraf awal keluaran 1.500 halaman masih menemukan 4 kesalahan kritis; persetujuan ahli/manusia tetap 0.

Inferensi penuh dokumen kaya teks di atas 2 juta karakter, serta penerimaan terjemahan/unduhan penuh terpisah untuk 300, 301, dan 1.000 halaman, belum dijalankan oleh bukti QA ini. Uji perangkat fisik minimum, sleep/wake, dan total RAM browser juga belum dijalankan.

## Bukti utama

- `regressions-8c-final/RESULTS.json`
- `CAPACITY_FINAL_BUILD_BINDING.json`
- `CAPACITY_FULL_TEXT_RECONCILIATION.json`
- `LONG_1668_FINAL_COMPONENT_BINDING.json`
- `capacity-parser-final/RESULTS.json`
- `capacity-export-8c-final/RESULTS.json`
- `real-inference-4694-historical/capacity-1001-en-RESULTS.json`
- `real-inference-final-1668/capacity-1500-id-RESULTS.json`
- `real-inference-final-1668/capacity-1500-id-OUTCOME_BREAKDOWN.json`
- `real-inference-final-1668/capacity-1500-id-MARKDOWN_RENDER.json`
- `real-inference-final-1668/LONG_OUTPUT_AI_REVIEW.md`

## Bukti browser yang selesai setelah run Node

| Dokumen | Eksekusi browser | Hasil unduhan | Durasi total termasuk gangguan disengaja |
|---|---|---|---|
| 1.001 halaman EN→ID | 3.003 translated; 5.005 panggilan mesin; 0 cache hit | 400.286 byte pada build1668; ekspor ulang final8c 703.589 byte dengan provenance | 21 menit 44 detik |
| 1.500 halaman ID→EN | 3.000 translated; 1.500 rejected; 7.650 panggilan mesin; 0 cache hit | 1.008.613 byte pada final8c; tetap parsial | 44 menit 46 detik |

Seluruh ID halaman dan blok unduhan tersebut cocok dan tidak ganda. Bukti `../browser/DOWNLOAD_RECONCILIATION.json` serta `../browser/LONG_RUN_SUMMARY.json` memuat hash, ukuran, lingkup, dan metrik asli. uniqueInputs yang dijumlahkan per blok di browser tidak boleh dinamai global unique inputs. Semua hitungan translated tetap bukan penilaian makna. Jeda, reload, BFCache, keyboard, tutup/buka tab dan konflik dua tab diuji nyata; OS process kill/sleep/zoom belum dikualifikasi.

Enam formula dari unduhan matematika berhasil dirender KaTeX. Tiga gambar data URI pada unduhan figur termuat di Chrome; gambar sumber tetap berbahasa asli dan tidak diklaim sebagai terjemahan gambar. Kualitas caption/istilah tetap bermasalah.

Buku asli Light and Matter: parser Node final melewati 1.062 halaman/2.159.653 karakter, dengan peringatan OCR/math yang masih terbuka. Browser mengenali 1.062 halaman, tetapi tidak dapat menyimpan sumber 85.937.593 byte (QuotaExceededError) dan menolak melanjutkan tanpa checkpoint aman. Ini kegagalan kapasitas nyata pada browser pengujian, bukan batas byte universal.
