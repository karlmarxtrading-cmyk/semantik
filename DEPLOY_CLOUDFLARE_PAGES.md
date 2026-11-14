# Deploy kandidat CP19

**Status: NOT PRODUCTION READY.** Paket ini disediakan untuk staging dan kualifikasi. Situs aktif belum diubah.

Satu langkah unggah: pada proyek **staging Cloudflare Pages yang telah dilindungi sesuai kebijakan owner**, pilih Direct Upload lalu unggah `SEMANTIK_SETARA_CP19_PDF_TRANSLATOR_DEPLOY.zip`. Jangan mengganti deployment aktif atau membuat staging terbuka tanpa otorisasi owner.

ZIP memiliki `index.html`, `_headers`, `sw.js`, dan `r/6ed0d134e1770b27/` di akar. Jangan meratakan folder `r/`: jalur rilis mengikat source, runtime, model, dan cache. Paket berisi 300 file; aset terbesar 15.344.608 byte. Tidak ada source, node_modules, tes, evidence, atau ZIP historis di dalamnya.

Sebelum unggah, cocokkan SHA-256 ZIP dengan `SHA256SUMS.txt`. Setelah staging tersedia, lakukan uji berikut terhadap URL staging yang sebenarnya:

1. Hash respons `/index.html` harus sama dengan manifest; jangan memakai layanan yang menyisipkan HTML ke file build.
2. Periksa CSP, `nosniff`, MIME JavaScript/WASM, model `Content-Encoding: identity`, `Range: bytes=0-31`, serta satu kebijakan Cache-Control yang sesuai pada shell/SW/aset rilis.
3. Jalankan tiga contoh PDF pada source QA: arah EN→ID, ID→EN, dan matematika. Unduh MD baru, render dengan viewer yang diuji, lalu cocokkan rumus dan citra sumber.
4. Siapkan aset offline dan model untuk arah yang dibutuhkan, putuskan koneksi melalui alat browser yang sah, lalu reload dan proses PDF digital/scan. Uji update dari rilis sebelumnya, cache model identik, dua tab, serta pemulihan.
5. Jalankan rollback pada staging dengan profil pengujian terpisah. Catat URL, waktu, build, respons HTTP, screenshot, hash unduhan, dan hasil per gerbang.

Preview yang dipakai saat implementasi menambahkan 1.212 byte pada HTML dan tidak menerapkan `_headers`. Service worker menolak hash tersebut. Ini bukan bukti offline atau konfigurasi Cloudflare telah lulus. **Jangan melemahkan verifikasi integritas untuk menutup kegagalan itu.**

Batas platform yang dirujuk: https://developers.cloudflare.com/pages/platform/limits/ dan https://developers.cloudflare.com/pages/get-started/direct-upload/ . Aturan header: https://developers.cloudflare.com/pages/configuration/headers/ . Verifikasi kembali batas akun/proyek saat deployment.
