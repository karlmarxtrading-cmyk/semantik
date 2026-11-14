# Laporan QA rilis CP17 — penerjemah jurnal PDF

## Kesimpulan teknis

Revisi CP17 telah menjalani pengujian pembaca PDF, OCR lokal, penerjemahan dua arah, ekspor, dan alur antarmuka dengan fixture sintetis. Laporan browser akhir mencatat **28/28 pemeriksaan pembaca PDF, 51/51 pemeriksaan mesin penerjemah, 46/46 pemeriksaan ekspor, dan 20/20 pemeriksaan alur pengguna lulus**.

Angka tersebut menyatakan hasil skenario yang dijalankan. Angka tersebut **bukan persentase kebenaran seluruh terjemahan ilmiah**, bukan pengesahan semua jenis PDF, dan bukan bukti keberhasilan deployment Cloudflare langsung. Bukti tiap lapisan dijelaskan terpisah agar pemeriksaan ukuran/hash tidak disamakan dengan penilaian makna.

## Sumber dan lingkungan bukti

Baseline CP16 dan perubahan implementasi dicatat dalam [CHANGELOG_CP17.md](CHANGELOG_CP17.md). Cara penggunaan, dependensi, batas operasional, dan penyiapan paket dijelaskan dalam [README.md](../README.md).

Uji browser nyata dijalankan melalui **Chromium/Chrome 156 pada Linux x86_64**, sesuai `userAgent` yang direkam. Mesin penerjemah menggunakan model CP16 dan ONNX Runtime Web/WASM satu thread. Tidak diperlukan API penerjemahan eksternal untuk inferensi.

Timestamp laporan disimpan dalam UTC. Pengujian akhir mesin selesai pada `2026-11-11T19:45:40Z` dan alur pengguna selesai pada `2026-11-11T19:45:49Z`; presisi lengkap tersedia dalam berkas JSON masing-masing.

## Matriks hasil

| Lapisan | Hasil | Cakupan dan sumber bukti |
| --- | --- | --- |
| Pembaca PDF dalam browser | 28/28 lulus | Digital EN/ID, dua kolom, tabel/rumus beserta aset visual, rotasi, scan/OCR EN/ID, halaman campuran, password/retry/cancel, input palsu/rusak, batas ukuran/halaman, penghentian dan keterlacakan sumber. [browser-pdf-reader.json](../evidence/browser-pdf-reader.json) |
| Mesin lokal dalam browser | 51/51 lulus | Inferensi model nyata dua arah, proteksi literal ilmiah, glosarium bawaan dan override pengguna, heading, penandaan kandidat bermasalah, serta lifecycle mesin. [browser-engine.json](../evidence/browser-engine.json) |
| Ekspor dalam browser | 46/46 lulus | Markdown sumber/terjemahan/bilingual, keluaran parsial, target kosong, provenance koreksi sumber, ZIP/aset/hash, serta penanganan markup dan formula CSV berbahaya. [browser-export.json](../evidence/browser-export.json) |
| Alur pengguna sebenarnya | 20/20 lulus | Pemilihan PDF, ekstraksi, inferensi nyata, edit langsung lalu ekspor, reload/resume, target kosong lalu dilanjutkan, koreksi sumber per blok, empat unduhan, dokumen bilingual, persiapan cache offline dan resource jendela aplikasi. [browser-ui.json](../evidence/browser-ui.json) |
| Integritas model | 144/144 lulus | Ukuran/hash transport, ukuran/hash hasil dekompresi, dan hash berkas model utuh. [model-integrity.json](../evidence/model-integrity.json) |
| Unit helper/lifecycle | 37/37 lulus | Segmentasi, deteksi bahasa, pemeriksaan literal, glosarium dan lifecycle. Bagian yang memakai `FakeWorker` dinyatakan eksplisit dan tidak dihitung sebagai inferensi browser. [engine-unit-results.json](../evidence/engine-unit-results.json) |
| Unit layout | 8/8 lulus | Urutan kolom, tabel numerik, baseline kolom berbeda, notasi ilmiah, TSV OCR, superskrip, rotasi dan cakupan input besar yang masih dibatasi. [layout-unit.json](../evidence/layout-unit.json) |
| Adapter model dalam Node | 11/11 lulus | Model nyata melalui bridge worker dan transport filesystem; merupakan bukti tambahan yang berbeda dari browser. [engine-node-adapter.json](../evidence/engine-node-adapter.json) |
| Pemeriksaan statis paket | 21/21 lulus | Aset yang diperiksa tidak melebihi 25 MiB, referensi lokal tersedia, input eksplisit hanya PDF, bundle impor lama tidak ada, serta pemeriksaan terpilih terhadap header keamanan. [release-static.json](../evidence/release-static.json) |

Laporan percobaan Chromium melalui CLI yang berstatus `BLOCKED` merupakan catatan pembatasan lingkungan eksekusi sebelumnya. Status itu tidak diubah menjadi lulus; pengujian browser sebenarnya dibuktikan oleh laporan `browser-*.json` di atas.

## Perilaku yang dibuktikan

**PDF menjadi satu-satunya input dokumen.** JSON dan berkas JSON yang sekadar diganti ekstensi menjadi `.pdf` ditolak. Berkas JSON internal untuk konfigurasi, vocabulary, dan manifest tetap digunakan sebagai dependensi aplikasi. ZIP merupakan format keluaran.

**Lazy interaction berlaku pada alur yang diuji.** Halaman awal tidak meminta modul berat dari jendela aplikasi. Ekstraksi sumber tidak memulai model penerjemah. Pemeriksaan mesin juga mencatat impor/konstruksi yang belum membuat worker. OCR dipanggil untuk halaman yang memerlukannya.

**Dokumen ilmiah tetap dapat ditelusuri.** Item sumber mempunyai rujukan blok/halaman; citra halaman disertakan. Tabel dan rumus yang dipertahankan secara visual tidak diklaim telah menjadi tabel semantik atau LaTeX yang sempurna. Fixture memeriksa urutan kolom, angka/statistik, DOI, formula, dan pemeliharaan aset visual.

**Edit dan progres tidak hilang pada skenario pemulihan.** Edit terakhir masuk ke unduhan yang langsung diminta, kemudian tetap sama setelah reload dan resume. Koreksi sumber menyimpan ekstraksi awal, membatalkan target hanya untuk blok yang dikoreksi, dan mempertahankan edit blok lain. Target kosong kembali menjadi pekerjaan tertunda.

**Bahasa campuran ditangani pada fixture yang diuji.** Abstrak Inggris di dalam dokumen yang mayoritas berbahasa Indonesia diterjemahkan ke Indonesia, sedangkan tubuh teks Indonesia dipertahankan. Heading `Abstract` menjadi `Abstrak`. Frasa *sample mean* yang sebelumnya keliru diterjemahkan telah dikunci menjadi *rata-rata sampel*; glosarium pengguna tetap mendapat prioritas.

**Keluaran merupakan artefak sebenarnya.** Uji antarmuka membaca Blob yang benar-benar dihasilkan oleh tautan unduhan, tanpa mengganti mesin atau pembuat ekspor dengan tiruan. Uji ekspor tersendiri memeriksa isi dan pengaman paket, bukan hanya nama ekstensi.

## Offline dan cakupan jaringan

Tombol persiapan offline berhasil menyimpan pembaca PDF, OCR, komponen aplikasi, dan model arah bahasa yang dipilih. Inventaris cache tercatat dalam laporan UI. Uji mesin terpisah berhasil menjalankan inferensi kedua arah dengan unduhan model diblokir.

Dalam pemeriksaan operasional tambahan, proses server lokal dihentikan melalui Ctrl+C hingga kembali ke prompt terminal. Sesudah itu, reload alamat aplikasi tetap menampilkan kerangka lengkap dan tombol **Lanjutkan** berhasil memulihkan PDF serta tujuh blok hasil bilingual dari checkpoint lokal. Observasi tersebut dicatat dalam [browser-offline-observed.json](../evidence/browser-offline-observed.json).

Pemeriksaan ini membuktikan reload aplikasi dan pemulihan checkpoint saat origin tidak tersedia; bukan pemutusan seluruh koneksi jaringan perangkat. Percobaan memilih PDF scan baru untuk menguji OCR dan ekspor dengan server berhenti terhalang timeout lingkungan browser, lalu sesi browser berakhir. Jalur gabungan OCR → terjemahan → ekspor pada kondisi server berhenti tersebut **tidak dinyatakan lulus**. OCR nyata, inferensi cache, dan ekspor telah lulus suite masing-masing, dengan lingkup yang berbeda.

Pemeriksaan resource tidak menemukan tujuan pihak ketiga pada lingkup yang direkam. Endpoint `__test-report` pada server pengembangan menerima hasil fixture sintetis untuk QA; endpoint dan harness tersebut tidak menjadi bagian paket deploy dan bukan fitur unggah dokumen produksi.

## Batas interpretasi dan penerimaan

Fixture berisi PDF sintetis yang dapat direproduksi. Belum dilakukan penilaian manusia terhadap korpus jurnal nyata milik pengguna, uji lintas browser/perangkat, atau deployment dan pengamatan langsung pada domain Cloudflare produksi.

Angka yang tetap sama dan blok yang lengkap belum membuktikan makna kalimat setara. Pada sampel nyata mesin, perbedaan lingkup negasi ditemukan dan diberi status perlu ditinjau. Penandaan pola yang diketahui tidak menjamin seluruh kesalahan semantik terdeteksi. Pengguna perlu membandingkan istilah, metode, hasil, kesimpulan, tabel, dan rumus dengan sumber sebelum memakai terjemahan untuk penelitian.

Nama, ukuran, hash ZIP final, dan inventaris rilis harus diambil dari receipt/manifest paket akhir. Laporan ini tidak menggantikan pemeriksaan integritas paket dan tidak boleh dipakai untuk menyatakan versi kode atau model yang telah diubah sebagai versi yang sudah diuji.

## Reproduksi

Gabungkan paket source/QA dengan isi paket deploy sebagaimana dijelaskan dalam README. Jalankan server QA hanya secara lokal, kemudian buka harness yang sesuai:

- `tests/pdf-browser.html`
- `tests/engine-browser.html`
- `tests/export-browser.html`
- `tests/ui-browser.html`

Generator dan manifest fixture berada di `tests/`; langkah pemeriksaan model dan paket tersedia pada `tests/README.md`. Sesudah kode/vendor berubah, bangun ulang manifest offline dan jalankan kembali gate yang terdampak. Gunakan laporan berstatus selesai; hasil parsial `RUNNING` bukan hasil lulus akhir.
