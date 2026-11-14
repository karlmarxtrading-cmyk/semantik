# CP20 — rencana kualifikasi sebelum penerimaan

Tanggal: 13 November 2026. Kandidat pengembangan, productionReady:false sampai semua gerbang wajib terbukti.

Target produk tetap satu PDF Indonesia ↔ Inggris menjadi satu Markdown, lokal, tanpa akun/API, dengan pembacaan dan terjemahan bertahap. Target penerimaan panjang: 300, 301, 1.000, 1.001 dan 1.500 halaman; tidak diturunkan untuk mempermudah kelulusan.

## Lingkungan dan batas yang akan diuji

- Browser aktual tersedia: Chrome cloud Linux melalui pratinjau terkelola; versi, CPU yang dilaporkan browser, estimasi kuota, dan dukungan API dicatat saat eksekusi. Ini bukan laptop atau ponsel fisik.
- Target perangkat fisik yang harus dikualifikasi sebelum janji produk: laptop 64-bit, RAM fisik 8 GB, browser Chrome/Edge stabil yang mendukung IndexedDB, Web Locks, WASM, dan OPFS. Belum ada hasil pada perangkat ini. Viewport 390 px hanya uji tata letak.
- Batas input protektif: 100 MiB; target implementasi hingga 2.000 halaman, dengan penerimaan wajib 1.001/1.500. Angka implementasi bukan bukti kapasitas.
- Kelas PDF: digital satu kolom, dua kolom, tabel, rumus, gambar, scan, campuran, rotasi, password, dan rusak. Bukti scan panjang dan layout kompleks tidak diturunkan menjadi PASS hanya karena fixture kecil lulus.
- Ukuran, jumlah halaman, karakter, volume aset, serta layout diuji terpisah. Fixture kaya 1.001 halaman memuat lebih dari dua juta karakter. Fixture panjang memiliki ID halaman/blok; cache/inferensi dihitung terpisah.
- Renderer Markdown tujuan QA: Marked 17.0.1 + KaTeX 0.19.1. Kompatibilitas semua editor tidak diasumsikan.

## Gerbang dan aturan bukti

| Gerbang | Bukti wajib |
|---|---|
| Kapasitas | PDF nyata dibaca; 1.001/1.500 selesai diterjemahkan dan MD diunduh; rekonsiliasi seluruh ID |
| Makna | Dua arah, lima domain, korpus baru setelah pembekuan; nilai makna, kelengkapan, istilah, kelancaran, notasi, konsistensi terpisah; nol kesalahan kritis pada korpus penerimaan |
| Struktur ilmiah | References tidak bocor; hierarki/list benar; tabel/gambar/rumus/OCR diberi hasil dan batas yang eksplisit |
| Pemulihan | Transaksi per halaman, penulis stale, dua tab, jeda/reload, kuota gagal, unduhan semua hasil committed |
| Memori | Data aktif dibatasi; JS heap, RSS proses Node, dan RAM browser total dibedakan; belum ada angka total tanpa alat yang mengukur |
| Offline/hosting | Manifest final, hash/header aktual, putus jaringan/reload, update saat job aktif, rollback pada Cloudflare |
| UI | Keyboard, viewport kecil, keterbacaan, progres, tindakan pemulihan; tanpa model saat idle |
| Reproduksi | Build ulang identik, semua model/aset terverifikasi, ZIP terikat manifest final |

Status yang digunakan: PASS, FAIL, NOT_RUN, BLOCKED. Assertion terkontrol, parser/model Node nyata, dan browser nyata diberi label cakupan masing-masing. Review AI tidak menggantikan persetujuan manusia. File historis CP19 bukan bukti CP20.
