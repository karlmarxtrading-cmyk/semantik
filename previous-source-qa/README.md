# SEMANTIK SETARA — Academic PDF Translator (CP17)

Revisi CP16 menjadi aplikasi statis dengan **PDF sebagai satu-satunya input dokumen**. Ekstraksi, OCR, dan penerjemahan Indonesia–Inggris berjalan di browser. Tidak ada akun, backend pemrosesan jurnal, API penerjemahan eksternal, atau fitur impor JSON/ZIP/TXT.

## Cara menggunakan

1. Buka website melalui HTTPS atau localhost.
2. Pilih satu jurnal PDF dan bahasa tujuan.
3. Klik **Terjemahkan jurnal**. Model arah bahasa yang diperlukan diunduh hanya ketika diperlukan dan disimpan di perangkat.
4. Periksa teks sumber, hasil, dan gambar halaman. Bagian bertanda perlu ditinjau dapat diedit.
5. Unduh Markdown atau **Paket lengkap ZIP**. Paket lengkap menyertakan PDF asli, citra halaman, aset formula/tabel, teks sumber, terjemahan, bilingual, ledger bagian, laporan QA, dan hash SHA-256.

Opsi pembacaan, bahasa sumber, susunan satu/dua kolom, dan glosarium tersedia pada **Sesuaikan pembacaan**. Glosarium berupa pasangan istilah yang diketik, bukan unggahan berkas. Fitur **Ekstrak PDF tanpa menerjemahkan** tidak menyiapkan model penerjemah.

## Deploy Cloudflare Pages

Paket `SEMANTIK_SETARA_CP17_PDF_ONLY_CLOUDFLARE_PAGES.zip` berisi folder deploy langsung. Ekstrak ZIP, lalu unggah **isi folder yang memuat `index.html`** ke proyek Pages. Tidak perlu npm install, proses build, API key, Worker backend, database, atau layanan OCR eksternal.

File/folder yang berada pada akar deploy:

```text
index.html
app/
assets/
vendor/
models/
runtime/
licenses/
_headers
sw.js
offline-assets.json
manifest.webmanifest
icon.svg
MODEL_NOTICE.txt
```

Jangan menggabungkan bundle aplikasi lama, `archive.worker-*`, atau service worker CP16 ke folder revisi. Model dan runtime yang disertakan sudah cocok dengan adapter CP17. `_headers` diperlukan untuk CSP dan MIME. Situs diasumsikan di akar domain, bukan subdirektori.

Jika mengganti deployment CP16 yang sudah memakai service worker, tutup semua tab website lama lalu buka lagi setelah deployment selesai. Service worker baru tidak mengambil alih pekerjaan yang masih berjalan. Model yang sama dapat dipakai dari cache karena hash manifest tetap diperiksa.

## Offline dan lazy interaction

- Saat halaman awal dibuka, hanya kerangka aplikasi ringan dimuat. PDF.js, OCR, worker penerjemah, ONNX runtime, dan model tidak diprefetch oleh service worker.
- PDF.js dimuat setelah memilih PDF.
- OCR dimuat hanya ketika halaman membutuhkan pembacaan gambar.
- Model penerjemah disiapkan ketika pengguna menerjemahkan atau secara eksplisit memilih persiapan offline.
- **Siapkan offline untuk bahasa tujuan ini** menyimpan pembaca PDF, aset OCR, komponen aplikasi, dan model satu arah. Ulangi dengan bahasa tujuan lain bila kedua arah dibutuhkan saat offline.
- Browser dapat menghapus data ketika ruang sempit. Unduh hasil akhir; cache browser bukan arsip permanen.

## Integritas ilmiah

Setiap blok mempunyai ID, halaman, kotak posisi, tipe, dan rujukan item sumber. Setiap halaman disertai citra sumber. Tabel, formula, dan referensi dipertahankan; aplikasi tidak menebak LaTeX dari citra. Citra halaman mempertahankan gambar dan diagram yang tidak direkonstruksi secara terpisah.

Glosarium bawaan mengunci sembilan frasa akademik yang tidak ambigu (termasuk sample mean/rata-rata sampel, standard deviation/simpangan baku, dan confidence interval/interval kepercayaan); istilah pengguna mendapat prioritas. Adapter memeriksa angka, satuan, ekspresi statistik, rumus terproteksi, URL, DOI, dan identitas sitasi. Kandidat yang merusak literal ditolak, teks sumber dipertahankan, dan statusnya **perlu ditinjau**. Hasil yang belum diproses tetap berlabel sementara saat diekspor. Tanda tinjauan pengguna tidak menghapus catatan otomatis dari laporan.

Pemeriksaan otomatis bukan bukti kesetaraan semantik menyeluruh. Model lokal tetap dapat memilih istilah atau struktur kalimat yang keliru. Sebagai contoh yang teramati pada pengujian, lingkup negasi dapat bergeser meskipun angka benar. Gunakan editor, glosarium, teks sumber, dan citra halaman untuk peninjauan ilmiah.

## Batas operasional

- Satu PDF setiap pekerjaan; maksimal 100 MiB dan 300 halaman.
- Canvas per halaman dibatasi 6 juta piksel; kumpulan aset gambar dibatasi 128 MiB.
- Analisis teks dibatasi 20.000 item / 250.000 karakter per halaman dan 2.000.000 karakter per dokumen, termasuk checkpoint. Pelanggaran dihentikan secara eksplisit, tanpa mengklaim bagian yang dilewati sudah selesai.
- PDF terlindungi dapat dibuka dengan kata sandi yang diketahui pengguna; kata sandi tidak disimpan.
- PDF rusak, berkas yang hanya diganti ekstensi menjadi `.pdf`, dan input non-PDF ditolak.
- Susunan otomatis bersifat heuristik. Layout kompleks, teks berotasi, superskrip/subskrip, tabel, dan OCR perlu dibandingkan dengan gambar sumber.
- Browser modern memerlukan JavaScript, Web Workers, WebAssembly/SIMD, Web Crypto, DecompressionStream, IndexedDB, dan Cache Storage. Gunakan HTTPS/localhost. WebGPU tidak diwajibkan.
- Runtime model memakai WASM satu thread. Kecepatan dan kapasitas memori bergantung perangkat; perangkat berdaya rendah dapat memerlukan PDF yang lebih pendek.

## Pengembangan dan pengujian

Kode produk yang dapat diedit berada di `app/`. Worker model CP16 tetap berupa bundle; patch kompatibilitas CSP dicatat dalam bukti QA. Seluruh byte model/tokenizer asli dipertahankan.

Paket `SEMANTIK_SETARA_CP17_SOURCE_QA.zip` berisi kode aplikasi, skrip, fixture sintetis, dan bukti pengujian. Ekstrak di folder deploy yang sama untuk menjalankan pengujian lokal. `tests/` dan `scripts/test-server.py` hanya alat pengembangan; tidak dimasukkan ke paket deploy.

```bash
python scripts/build-offline.py
python tests/check-release.py
python tests/verify-models.py
python scripts/test-server.py --port 8765
```

Buka harness di `/tests/pdf-browser.html`, `/tests/engine-browser.html`, `/tests/export-browser.html`, dan `/tests/ui-browser.html`. Laporan browser mencatat hasil pengujian nyata; uji helper yang memakai worker tiruan dibedakan dari inferensi nyata. Jangan menjalankan server QA di internet: endpoint laporan memang khusus fixture lokal.

Setelah mengubah kode atau vendor, jalankan `scripts/build-offline.py` untuk memperbarui hash aset dan service worker. Jangan menyatakan rilis baru tervalidasi berdasarkan bukti CP17 yang kode atau modelnya sudah diubah.

## Dependensi dan lisensi

- PDF.js 5.6.205 — Mozilla, Apache-2.0.
- Tesseract.js/core 7.0.0 dan tessdata_fast eng/ind — OCR lokal; lisensi dan provenance ada di `licenses/`.
- ONNX Runtime Web 1.23.2 dan SentencePiece — runtime model CP16, dengan wrapper CSP direvisi tanpa `unsafe-eval`.
- OPUS-MT 2019-12-18 ID–EN dan EN–ID — lisensi distribusi arsip **CC BY 4.0**, sesuai berkas sumber; lihat `MODEL_NOTICE.txt`. Jangan menggantinya dengan dugaan lisensi model lain.
- JSZip 3.10.1 — ekspor ZIP lokal, lisensi MIT disertakan.

Dokumentasi teknis utama: https://mozilla.github.io/pdf.js/examples/ ; https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md ; https://developers.cloudflare.com/pages/platform/limits/ .
