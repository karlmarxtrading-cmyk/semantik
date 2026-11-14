# Deploy, update, rollback, dan pemulihan CP20

Dokumen ini menjelaskan prosedur untuk artefak CP20. Keputusan produksi mengikuti `RELEASE_ACCEPTANCE_CP20.md`; prosedur ini sendiri bukan bukti bahwa hosting, perangkat, atau mutu terjemahan sudah lulus.

## Build yang dapat direproduksi

Dari akar source CP20:

```bash
python3 scripts/build-with-history.py
python3 scripts/verify-final.py
node --experimental-vm-modules tests/cp20-offline-release.mjs
```

`build-with-history.py` memverifikasi hash seluruh sumber CP19 yang diperlukan, merekonstruksi rilis CP19 dengan builder asli, memeriksa identitas persis `cp19-6ed0d134e1770b27`, lalu membangun CP20 dan mempertahankan namespace aset CP19. Semua berkas yang diperlukan ada di source; unduhan model atau jaringan tidak diperlukan. `release-history/cp19/` adalah kode historis untuk rekonstruksi, bukan source aplikasi aktif. Model/runtime yang tidak berubah dipakai bersama berdasarkan hash; overlay hanya menambah sekitar 307 KB.

Keluaran ada di `dist/`; identitas source dan semua ukuran/hash aset berada di `evidence/build/BUILD_MANIFEST.json`. Bukti rekonstruksi CP19 ada di `evidence/build/RETAINED_RECONSTRUCTION.json`. Tanggal file dan path mesin tidak dipakai dalam identitas build. Untuk memeriksa reproduksibilitas, jalankan perintah build dua kali ke direktori keluaran berbeda dengan `--output` dan `--evidence-dir`, lalu bandingkan seluruh daftar path, ukuran, dan SHA-256; jangan hanya membandingkan jumlah file.

Builder ringan `python3 scripts/build.py` menghasilkan satu namespace CP20. Untuk pembaruan situs yang telah memiliki pekerjaan aktif, gunakan builder dengan history atau `--retain-from DIREKTORI_DEPLOY_SEBELUMNYA`. Jangan mengunggah paket satu namespace di atas rilis lama saat masih ada pekerjaan aktif: modul lama yang belum pernah dimuat dapat hilang dari server.

## Deploy Cloudflare Pages

1. Gunakan paket deploy yang sudah diverifikasi. Isinya harus langsung `index.html`, `_headers`, `sw.js`, dan `r/`, tanpa direktori pembungkus tambahan, QA, atau `node_modules`.
2. Pertahankan kedua namespace `r/` yang dikemas. File CP19 yang dipertahankan diperlukan oleh tab CP19 aktif; halaman utama dan service worker rilis baru tetap CP20.
3. Unggah ke staging privat/terotorisasi terlebih dahulu. Jika memakai integrasi Git, tetapkan direktori output `dist` dan perintah build `python3 scripts/build-with-history.py`. Tidak ada build npm untuk source aplikasi statis; dependensi QA berbeda.
4. Setelah hosting, cocokkan byte dan SHA-256 `/index.html`, `/sw.js`, manifest offline, modul, dan shard model dengan `BUILD_MANIFEST.json`. Hosting yang menyisipkan skrip/HTML akan ditolak oleh verifikasi integritas; jangan mematikan pemeriksaan agar lolos.
5. Periksa header HTTP aktual: CSP, `nosniff`, WASM MIME, cache shell `no-cache`, dan cache namespace immutable. `_headers` di ZIP bukan bukti bahwa header sudah diterapkan hosting.
6. Jalankan alur konsumen, unduhan MD, offline, pembaruan saat pekerjaan aktif, dan rollback pada alamat staging yang sama. Catat URL, waktu, rilis, browser/perangkat, hasil, serta bukti.

Batas aset individual Cloudflare Pages yang didokumentasikan adalah 25 MiB. Builder mempertahankan shard model di bawah batas itu. Jumlah halaman PDF pengguna tidak terkait batas aset hosting karena PDF diproses lokal.

## Offline

Pilih PDF dan proses terlebih dahulu sehingga arah bahasa dikenali. Gunakan tindakan **Siapkan offline**. Parser PDF, OCR, dokumentasi, dan runtime diverifikasi satu per satu terhadap manifest rilis; model arah bahasa terpilih dipersiapkan melalui cache model dengan verifikasi terpisah. Jika memerlukan kedua arah bahasa, persiapkan masing-masing arah. Kata “offline siap” tidak berarti seluruh dokumen pernah ditinjau manusia.

Uji setelah persiapan: putus jaringan, muat ulang alamat yang sama, kemudian buka PDF digital dan scan serta jalankan inferensi. Kegagalan cache/kuota, pembatalan, atau ketidakcocokan hash harus tetap menghasilkan kegagalan persiapan. Cache yang sudah valid dapat dilanjutkan tanpa diunduh ulang. Persetujuan persistensi browser tidak menjamin data tidak pernah dihapus; unduh hasil penting.

## Pembaruan dengan pekerjaan aktif

Service worker tidak memanggil `skipWaiting()`. Versi baru memasang shell ringan, lalu menunggu klien lama selesai sesuai lifecycle browser. Jangan memaksa aktivasi lewat DevTools ketika pekerjaan sedang berjalan. Tab lama tetap memakai kode dan cache lama; namespace CP19 yang ikut deploy menjaga lazy import lama tersedia. Model/cache lama tidak dihapus otomatis saat aktivasi.

Selesaikan atau jeda pekerjaan, pastikan checkpoint tersimpan, dan unduh hasil parsial bila diperlukan. Tutup seluruh tab situs, lalu buka lagi untuk memakai rilis baru. Identitas build/model/aturan pada checkpoint harus diperiksa aplikasi saat melanjutkan; hasil dari konfigurasi berbeda tidak boleh dianggap hasil mesin yang identik. Uji browser aktual tetap diperlukan untuk memastikan urutan install/wait/activate dan pemulihan sesuai kontrak.

## Rollback

Simpan paket deploy sebelumnya dan seluruh bukti penerimaannya sebelum update. Rollback menggunakan artefak lama yang persis, bukan mengganti string versi pada source baru. Tab CP20 aktif harus dijeda dan hasil diunduh sebelum seluruh tab ditutup. Jangan menghapus IndexedDB atau Cache Storage untuk memaksa rollback karena tindakan itu membuang hasil lokal.

Jika tab CP20 harus tetap aktif selama rollback, paket rollback juga perlu mempertahankan namespace CP20 utuh: gunakan salinan paket lama, tambahkan direktori immutable CP20 `r/<hash>` dari paket CP20 yang diverifikasi, tanpa menimpa shell atau `sw.js` lama. Verifikasi hash aset terhadap manifest CP20 sebelum mengunggah. Kode CP19 tidak dinyatakan mampu membaca skema checkpoint CP20; untuk kembali ke CP19, unduh hasil CP20 dan buka ulang PDF sumber sebagai pekerjaan baru bila migrasi balik belum dibuktikan.

Rollback actual hosting dan pembacaan checkpoint antarrilis belum dibuktikan hanya oleh tes Cache/Fetch Node. Beri status `NOT_RUN` atau `BLOCKED` sampai dijalankan pada lingkungan yang sesuai.

## Pemulihan gangguan

Jangan hapus data browser ketika penyimpanan, jaringan, atau proses terganggu. Muat ulang alamat yang sama, tinjau checkpoint, lalu gunakan lanjut atau unduhan parsial. Hasil parsial harus menyatakan halaman/blok selesai dan belum selesai. Jika ruang habis, unduh bagian yang sudah aman sebelum membersihkan pekerjaan/model. Lisensi dan notice CP20 tersedia melalui jalur hash rilis dan ikut diverifikasi; kegagalan integritas tetap menolak byte yang berubah.

## Acuan teknis

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/): batas 25 MiB per aset, diakses 13 November 2026.
- [MDN — Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers): lifecycle worker waiting/activation dan klien aktif.
- [MDN — skipWaiting](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting): aktivasi segera dapat mengganti worker klien yang masih aktif; CP20 tidak memakainya.
