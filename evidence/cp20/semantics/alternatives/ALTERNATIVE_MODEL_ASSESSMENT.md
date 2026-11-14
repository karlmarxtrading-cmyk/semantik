# CP20 — Uji model pengganti secara terisolasi

**Belum ada pengganti yang layak dipasang dari bukti ini.** M2M100 benar-benar diunduh, diverifikasi, dan dijalankan lokal. Hasilnya tetap mengubah konsep ilmiah pada banyak contoh, termasuk setelah pemisahan kalimat disamakan dengan adapter produksi. Bobot model produk CP20 tidak diubah. Ini penilaian konfigurasi yang diuji, bukan kesimpulan tentang semua kemungkinan decoding atau fine-tuning model tersebut.

## Inferensi yang benar-benar dijalankan

Kandidat `Xenova/m2m100_418M`, revisi tetap `9c374f0b7aca709787cea97b047bfbbd1559d177`, menggunakan encoder/decoder ONNX q8, Transformers.js 3.8.1 dan ONNX Runtime Node 1.21.0 CPU. Sumber asli [facebook/m2m100_418M](https://huggingface.co/facebook/m2m100_418M) mencantumkan MIT serta dukungan Inggris dan Indonesia. [Repositori konversi](https://huggingface.co/Xenova/m2m100_418M) menyatakan kompatibilitas ONNX/Transformers.js.

Unduhan langsung HTTPS berhasil tanpa bypass atau eskalasi: tujuh aset, **639.977.588 byte**, termasuk dua bobot ONNX **631.984.548 byte**. Ukuran semua berkas cocok metadata revisi; SHA-256 kedua bobot cocok metadata LFS; SHA semua berkas tersimpan. Lihat `m2m100/DOWNLOAD_EVIDENCE.json` dan `repository-metadata.json`. Kegagalan awal hanya instalasi CUDA opsional; pilihan resmi versi runtime terpasang `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` memungkinkan runtime CPU. Tidak ada klaim bahwa jaringan memblokir seluruh model alternatif.

| Pengujian lokal | Kasus | Persiapan dingin | Total penerjemahan | Waktu per 200 karakter | Peak RSS proses |
|---|---:|---:|---:|---:|---:|
| Paragraf mentah | 30 | 7.876 ms | 184.647 ms | 5.815 ms | 2.429.149.184 byte |
| Segmentasi kalimat produksi | 14 | 6.391 ms | 95.859 ms | 6.309 ms | 2.268.745.728 byte |

Per-200-karakter dihitung total waktu dibagi total karakter lalu dikali 200; tidak memasukkan persiapan. RSS berasal dari `process.resourceUsage().maxRSS`, mencakup proses native Node, bukan RAM browser/WASM dan bukan ukuran unduhan. Mesin dipakai bersama pekerjaan lain; angka bukan perbandingan kecepatan hardware terkontrol. Tidak ada pengujian Android/iOS, browser kandidat, WebGPU, atau offline browser persisten yang diklaim.

Decoding dinyatakan eksplisit: greedy, `num_beams:1`, `do_sample:false`, `max_new_tokens:256`, thread CPU intra/inter-op 1. Default model menyebut beam 5, tetapi implementasi generasi Transformers.js 3.8.1 yang dipakai belum menerapkan beam search tersebut. Tidak ada klaim keluaran beam search, parity dengan PyTorch, atau hasil optimal model.

## Perbandingan kualitas yang lebih adil

Uji 30 paragraf mentah menghilangkan beberapa kalimat terakhir. Karena produk memisahkan kalimat, percobaan kedua menggunakan **fungsi `splitForTranslation` produksi yang dibekukan**, pada 14 kasus yang sudah dikenal dalam lima domain dan kedua arah. Ini pengembangan komparatif, bukan korpus baru yang belum terlihat. Model kandidat menerima teks mentah per segmen; istilah terlindung dan guard penolakan produk belum dipasang ke kandidat. Dengan demikian jumlah target kandidat bukan jumlah terjemahan yang lolos validasi.

Baseline memakai target yang terbukti identik dengan build final `cp20-1668833ad37c9dd8` melalui `FINAL_DIST_SEMANTIC_BINDING.json`. Dari 14 kasus tersebut, baseline menghasilkan 9 target dan menolak 5; reviewer AI menandai 5 target kritis. Kandidat menghasilkan teks pada semua 14 dan reviewer AI menandai 11 kritis. Angka ini tidak digabung menjadi skor akurasi atau bukti keunggulan populasi; penilaian terpisah per enam dimensi dan pasangan teks lengkap ada pada `ALTERNATIVE_COMPARISON_AI.json`. Persetujuan manusia **0**.

| Contoh | Observasi kandidat setelah segmentasi |
|---|---|
| H001/H016 matematika | Differentiable menjadi dapat dibedakan/can be lowered; need not menjadi should not. |
| H003/H018 himpunan | Nonempty/finite tidak diterjemahkan tepat; set up to the unpull dan end mengganti konsep matematika. |
| H004/H019 kimia | Pelarutan/larutan menjadi penyelesaian; penguapan menjadi sweetening. |
| H008/H023 statistik | Kalimat akhir tidak lagi hilang, tetapi penyebut/pembilang menjadi name/manufacturer atau frasa tanpa hubungan statistik. |
| H009/H024 statistik | Mean/median menjadi medium/media; konsistensi identitas statistik hilang. |
| H025 ekonomi | Supply and demand serta relative sensitivity lebih tepat daripada baseline, tetapi economic burden masih janggal. Perbaikan lokal belum cukup untuk penggantian. |
| H015/H030 prosa | Keluaran membawa sebagian besar hubungan yang baseline tolak; masih ada istilah janggal. Guard tidak diterapkan pada kandidat. |

## Kandidat lain dan batas kelayakan

Sumber primer diperiksa pada 13 November 2026. Tidak ada skor kualitas buatan untuk kandidat yang tidak dijalankan.

| Kandidat | Bukti primer dan batas dalam pekerjaan ini |
|---|---|
| [NLLB-200 distilled 600M](https://huggingface.co/facebook/nllb-200-distilled-600M) | CC-BY-NC-4.0. Kartu resmi memposisikan riset dan secara eksplisit tidak merilisnya untuk produksi, terjemahan dokumen, atau domain khusus; dilatih sampai 512 token. Tidak dijalankan atau diintegrasikan. Pembatas penggunaan dan kebutuhan evaluasi berbeda membuatnya bukan pengganti default produk ini. |
| [MADLAD400 3B](https://huggingface.co/google/madlad400-3b-mt) | Apache-2.0, arsitektur T5. Kartu menyebut GGUF q4 sekitar 1,65 GB versus bobot asli 11,8 GB, dan belum dinilai untuk produksi. Ukuran tersebut pernyataan kartu, bukan ukuran unduhan yang kami ukur. Aset/browser runtime kandidat belum diverifikasi di sesi ini; tidak diunduh/dijalankan. Memerlukan integrasi/conversion/parity dan pengujian sumber daya tersendiri. |
| [TranslateGemma 4B](https://huggingface.co/google/translategemma-4b-it) | Lisensi Gemma; akses berkas membutuhkan akun dan persetujuan ketentuan. Tidak menerima ketentuan atau mencoba mirror untuk melewati akses. Runtime browser offline belum dibuktikan di sini; tidak ada benchmark lokal atau estimasi mutu yang diklaim. |

Dokumentasi [ONNX Runtime Web untuk model besar](https://onnxruntime.ai/docs/tutorials/web/large-models.html) menjelaskan batas buffer, protobuf, memori WASM 32-bit dan caching. Batas platform tersebut bukan pengukuran RAM kandidat. M2M100 yang telah berjalan masih memerlukan sekitar 640 MB aset sebelum runtime/cache overhead; itu menambah tekanan penyimpanan nyata pada produk yang sedang diuji. Baseline manifest CP20 mencatat total aset model terkompresi dua arah 210.442.669 byte dan hasil dekompresi 267.111.078 byte; model dimuat sesuai arah. Tidak menyamakan ukuran disk dengan RAM.

## Reproduksi dan isi paket

`m2m100/` dalam bukti berisi skrip, metadata revisi, package lock, log kecil dan hasil; **tidak memuat bobot eksperimen, node_modules, atau tarball runtime**. Untuk reproduksi dari akar source CP20:

```sh
mkdir -p experiments/m2m100
cp evidence/cp20/semantics/alternatives/m2m100/* experiments/m2m100/
cd experiments/m2m100
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci --no-audit --no-fund
python download_candidate.py
node benchmark.mjs
node benchmark-segmented.mjs
```

Skrip memakai fetch lokal setelah aset diperoleh dan mematikan pemuatan model remote. `benchmark-segmented.mjs` mengimpor segmenter produk dan membaca korpus lama dari pohon source CP20. Hasil lama dapat ditimpa dalam direktori eksperimen saat reproduksi; salinan bukti asli tetap terpisah. Percobaan ini tidak menambahkan aset atau dependensi ke app/dist.
