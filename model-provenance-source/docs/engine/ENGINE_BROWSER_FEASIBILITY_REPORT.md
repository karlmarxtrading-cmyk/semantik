# Kelayakan mesin browser

## Kesimpulan

Paket model asli berformat Marian NPZ tidak langsung dapat dimuat oleh browser. Jalur port yang mempertahankan bobot asli telah **diimplementasikan dan dieksekusi**: PyTorch CPU → ONNX opset 17 → runtime ONNX, dengan koreksi eksplisit terhadap dua perbedaan formula antara Marian native dan converter Hugging Face. Dua pasangan model tersedia sebagai aset statis; arah balik berasal dari model resmi pelengkap, bukan disimpulkan dari bobot ID→EN.

Pengujian dalam direktori ini memakai ONNX Runtime CPU Python. Pengujian browser WASM, lifecycle worker, pengiriman model, CSP, cache/offline, memory/performance perangkat dan integrasi ZIP merupakan tanggung jawab suite aplikasi dan **tidak disimpulkan dari keberhasilan CPU Python**.

## Bukti yang ada

- Semua tensor asli terinventarisasi, finite, dibaca tanpa pickle; jumlah 72.248.331 parameter float32 per model.
- Graf encoder/decoder lulus `onnx.checker.check_model` dan menghasilkan inferensi nyata dua arah.
- Delapan kalimat pengembangan (empat per arah): perbandingan token antara FP32 PyTorch dan ONNX, serta antara FP32 dan kuantisasi, direkam dalam dua laporan parity.
- Perbandingan tambahan FP32 beam 6 dengan 20 keluaran native penerbit per arah: ID→EN 18/20 identik; EN→ID 20/20 identik. Ketidakidentikan tidak disembunyikan. Ini regresi terhadap hasil yang diterbitkan, bukan run baru Marian C++ atau bukti kesetaraan untuk seluruh domain.
- 60 fixture PRD dijalankan sebagai input model mentah; tidak ada hardcoding berdasarkan ID, keluaran contoh, atau negative control. Penilaian semantik masih NOT_REVIEWED.

## Kuantisasi dan baseline

Kandidat awal QUInt8 per-tensor menyebabkan perbedaan aspek/istilah pada kalimat pengembangan. Kandidat final QInt8 per-channel mengurangi perbedaan dalam set kecil tersebut. Set yang dipakai memilih kuantisasi adalah **set pengembangan**, tidak boleh dihitung sebagai blind acceptance. `quantization-comparison.json` dan historical logs mengabadikan perbedaannya.

Graph FP32 disimpan terpisah di `fp32/` untuk verifikasi. Keluaran browser memakai bobot int8 dan tetap membutuhkan evaluasi semantik independen, terutama matematika/negasi/kuantor/aspek. Model asli sendiri menghasilkan terjemahan tidak memadai pada beberapa teks akademik; keberhasilan port tidak menutup gerbang mutu produk.

## Kontrak browser

Pakai `onnxruntime-web` dengan WASM yang dipin dan disajikan dari origin aplikasi. Engine dapat dijalankan dalam Web Worker tanpa API penerjemah eksternal. NPM tokenizer yang diperiksa: `@sctg/sentencepiece-js` 1.3.3 (Apache-2.0). Gunakan source tokenizer dari model yang dipilih dan pemetaan piece→ID Marian; jangan gunakan ID SentencePiece secara langsung.

Model satu arah memerlukan dua graph; unduh hanya arah yang dipilih atas tindakan pengguna, tampilkan byte sesungguhnya, verifikasi hash, lalu baru tandai siap. Hash seluruh file hasil ada pada manifest per model. Jika host membatasi ukuran file, transport boleh memakai shard yang digabung **persis kembali** berdasarkan offset/size/hash; pembagian transport bukan pemotongan struktur weights secara arbitrer. Jangan menyatakan model parsial siap.

Gunakan concurrency awal 1, batasi token ke rentang yang diuji, dan hentikan output dengan alasan EOS/length/cancelled yang benar. Decoder baseline mengulang prefix penuh; belum memakai KV cache. Keterbatasan itu memengaruhi latency teks panjang. Penghentian paling kuat dapat memakai terminasi worker, diikuti prepare ulang. Klaim abort/streaming/offline harus mengikuti pengujian adapter aktual.

## Reproduksi

Python pengembangan dan versi transitif direkam pada `CONVERSION_DEPENDENCIES.json`; paket tepat pada `requirements-conversion-lock.txt`. Script utama `convert_models.py` membutuhkan direktori model asli `source/` (ID→EN) dan `source-en-id/` (pelengkap EN→ID), serta converter resmi yang dipin di `upstream/`.

Perintah yang benar-benar dijalankan:

```sh
python convert_models.py --pair both
python compare_publisher_reference.py
python run_engine_fixture_seed.py
```

Perintah memakai interpreter venv terisolasi dan input terverifikasi. `convert_models.py` memeriksa graph, menjalankan parity dan membuat manifest SHA-256; manifest tidak memuat hash dirinya sendiri. Jangan memakai ulang graph dari `historical-*` sebagai rilis terbaru. Native formula sumber, hash converter dan perubahan eksplisit tercatat dalam `SOURCE_TO_CONVERSION_PROVENANCE.json`.

## Gerbang yang tetap terbuka

Penerimaan semantik corpus 400+400, penelaah bilingual manusia dan adjudikasi, bukti browser/perangkat/resource, parity luas pada batas/teks panjang, protected-span preservation melalui pipeline aplikasi, serta pemulihan/cache model. Hasil ini memungkinkan implementasi berjalan, tetapi sendirian tidak memberi status production-ready.
