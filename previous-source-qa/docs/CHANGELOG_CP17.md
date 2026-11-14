# Perubahan CP16 → CP17 PDF-only

Tanggal rilis: 12 November 2026. Timestamp pengujian dicatat dalam UTC.

## Baseline

Sumber: `SEMANTIK_SETARA_CP16_CANDIDATE_CLOUDFLARE_PAGES_NOT_PRODUCTION_READY.zip`.

- Ukuran sumber: 213.639.222 byte.
- SHA-256 sumber: `f85d32d734f107643b69eb52792441d3c09e7761dd620754ea12724fd5b041cf`.
- Isi: 62 berkas build, 235.785.863 byte sebelum kompresi.
- Baseline tidak menyediakan kode proyek sumber maupun modul pembaca PDF. Mesin penerjemah, model, shard, tokenizer, dan runtime yang tersedia digunakan kembali.

## Keputusan instruksi

Perintah terbaru pengguna menetapkan hanya PDF sebagai input. Karena itu, perintah lama dalam Markdown untuk mempertahankan seluruh fitur sebelumnya tidak mempertahankan alur impor JSON/ZIP/TXT. Format keluaran Markdown/ZIP tetap berlaku. Berkas JSON internal milik konfigurasi, vocabulary, dan manifest model diperlukan dan dipertahankan.

Arsitektur mengikuti keputusan akhir Markdown: proses lokal di browser, tidak ada API penerjemahan eksternal, tidak mengirim isi jurnal ke server. Docling/Marker/GROBID tidak ditambahkan sebagai backend.

## Penghapusan fitur

- Bundle antarmuka lama yang berpusat pada dokumen terstruktur dihapus dari paket deploy.
- Archive/import worker CP16 tidak dimasukkan.
- Tidak ada input JSON, TXT, ZIP, pemilih mode impor lama, atau endpoint impor dokumen non-PDF.
- Service worker lama yang memprefetch runtime besar diganti dengan kerangka ringan dan cache ketika diperlukan.

## Implementasi baru

- Antarmuka PDF saja, responsif, dengan pengaturan lanjutan tertutup secara default.
- PDF.js lokal dan analisis layout per halaman.
- OCR Inggris/Indonesia lokal dengan Tesseract dan tiga varian kemampuan WASM.
- ID bagian, kotak posisi, asal halaman, cakupan item teks, dan citra halaman sumber.
- Penanganan heading, paragraf, kolom, formula, tabel, sitasi, referensi, dan PDF berotasi.
- Adapter mesin lama dengan proteksi ilmiah, pemeriksaan literal, glosarium, segmentasi tanpa pemotongan, pembatalan worker, dan penolakan kandidat bermasalah.
- Editor hasil serta koreksi sumber OCR dengan penyimpanan ekstraksi awal yang tidak ditimpa.
- Checkpoint halaman dan hasil per blok, penguncian antar-tab, serta pemulihan hasil edit.
- Ekspor Markdown sumber/terjemahan/bilingual dan ZIP lengkap dengan PDF asli, aset, QA, ledger, dan hash.
- Persiapan offline eksplisit, integritas aset aplikasi, penggunaan model cache tervalidasi hash.

## Perbaikan yang dibuktikan oleh pengujian

- Tokenizer SentencePiece CP16 memakai dua konstruktor Function yang ditolak CSP. Worker direvisi menggunakan closure setara tanpa melonggarkan CSP; nama worker diubah untuk mencegah cache immutable lama.
- Tesseract ESM menyediakan API melalui default export; pemanggilan OCR disesuaikan setelah uji browser mendeteksi kegagalan.
- Formula berukuran besar tidak diklasifikasikan sebagai heading biasa.
- Tabel dengan jarak baris besar tidak disalahartikan sebagai kolom prosa.
- Heading sesudah layout dua kolom berada setelah kedua kolom selesai dibaca.
- Halaman berotasi mempertahankan urutan sumber dan mempunyai tanda pemeriksaan.
- Pembatalan dialog password tidak meninggalkan promise pembukaan yang menggantung.
- Batas canvas diterapkan pada hasil render; gambar scan sumber tidak dibuang karena ukurannya melewati batas canvas.
- Resume mempertahankan status bagian referensi dan anggaran karakter dari halaman yang sudah selesai.
- Pergantian PDF dan perubahan layout menghapus checkpoint parsial yang sudah tidak sesuai secara atomik.
- Edit terbaru ditunggu sebelum ekspor atau penggantian dokumen; hasil kosong tidak dianggap terjemahan selesai.
- Bahasa dokumen campuran ditangani per blok; prosa yang sudah sesuai bahasa tujuan dipertahankan.
- Salah terjemah sample mean yang ditemukan pada uji alur nyata ditangani dengan glosarium frasa akademik; override pengguna tetap diprioritaskan. Verba yang terbukti bergeser makna pada sampel evaluasi diberi tanda pemeriksaan.
- CSV formula injection, markup aktif, traversal aset, aset yang hilang, dan ZIP tanpa PDF sumber ditolak/dinetralisasi.

## Pemisahan paket

Paket deploy berisi aplikasi dan dependensi yang diperlukan pengguna. Paket source/QA berisi skrip, fixture sintetis, laporan, dan kode aplikasi yang dapat dibaca; model/vendor besar tidak diduplikasi. Ekstrak source/QA di folder deploy yang sama untuk mereproduksi tes. Jangan mengunggah server atau harness QA sebagai backend produksi.

## Batas pembuktian

Pengujian teknis memakai fixture sintetis dan Chromium Linux. Tidak ada klaim semua PDF dunia, semua perangkat/browser, atau seluruh makna ilmiah telah disahkan. Tidak ada penilaian manusia terhadap korpus jurnal nyata milik pengguna. Angka lulus tes harus dibaca per cakupan yang tercatat di bukti, bukan sebagai persentase kebenaran terjemahan.
