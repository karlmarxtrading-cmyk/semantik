# Reproduksi terarah

Jalankan dari root source kerja yang memiliki model lokal terverifikasi dan dependensi terpasang. Simpan salinan bukti lama sebelum menjalankan harness yang menulis nama hasil tetap.

```sh
node tests/recovery-semantic-guards.mjs
node tests/recovery-semantic-regression.mjs
node tests/recovery-semantic-affected.mjs
node tests/recovery-semantic-reconcile.mjs
```

Harness regresi menjalankan 50 kasus yang sudah diketahui; setiap kasus langsung ditulis ke laporan. Harness affected hanya menjalankan H015/H017/H030. Reconcile membaca hasil iteration 3 yang dipertahankan dan affected; ia tidak melakukan inferensi. Urutan perintah di atas menjelaskan kemampuan harness, bukan instruksi untuk mengulang semua inferensi bila bukti yang ada tetap valid. Untuk sesi ini, iteration 3 tetap memakai SHA pra-perubahan terakhir dan affected memakai SHA final, sebagaimana dilaporkan.

Jangan menjalankan ulang suite 1.500 halaman untuk memeriksa perubahan istilah tiga kasus. Jangan menggunakan hasil guard sebagai pengganti tinjauan semantik atau penerimaan baru.
