# Peta mesin sumber — OPUS-MT ID–EN

## Temuan aktual

Arsip `SEMANTIK YANG SETARA.zip` memuat satu paket model `opus-2019-12-18.zip`. README internal menautkan direktori `OPUS-MT-models/id-en`, sehingga paket yang diunggah **hanya Indonesia → Inggris**. Tidak ada model arah balik, runtime browser, ONNX, HTML, atau aplikasi frontend di paket model ini.

| Berkas asli | Peran yang diperiksa |
|---|---|
| `README.md` | Identitas transformer-align, OPUS, arah id-en, referensi model dan benchmark penerbit |
| `opus.spm32k-spm32k.transformer-align.model1.npz.best-perplexity.npz` | 255 entri NPZ: 254 tensor float32 dan konfigurasi tertanam `special:model.yml` |
| `opus.spm32k-spm32k.vocab.yml` | 54.795 token Marian bersama; EOS=0, UNK=1 |
| `source.spm`, `target.spm` | Model SentencePiece sumber dan target; ID SentencePiece berbeda dari ID kosakata Marian |
| `decoder.yml` | Beam 6, normalisasi skor 1, word penalty 0, minibatch 1 |
| `preprocess.sh`, `postprocess.sh` | Pipeline native Moses + SentencePiece dan dekode penanda spasi; dibaca, tidak dieksekusi |
| `*.train1.log`, `*.valid1.log` | Jejak pelatihan dan validasi, bukan bukti inferensi dalam aplikasi baru |
| `source.tcmodel` | Berkas kosong, tidak dibutuhkan oleh pipeline SentencePiece yang tercatat |
| `LICENSE` | Creative Commons Attribution 4.0 International |

Hash, ukuran, dan kategori setiap berkas ada di `MODEL_FILE_INVENTORY.json`. Konfigurasi asli ada di `original-config-id-en.json`; metadata semua tensor ada di `weights_metadata.json`. Pemindaian `allow_pickle=False` dan `isfinite` tersimpan dalam `tensor-validation.json`. Kedua model memiliki 72.248.331 nilai float32 (288.993.324 byte tensor), seluruhnya finite.

## Arsitektur dari bobot dan kode Marian asli

Enam lapis encoder dan enam lapis decoder, dimensi 512, delapan head × 64, FFN 2.048 dengan swish, embedding sumber/target/output terikat, postprocess dropout–add–normalize dan tanpa preprocess. Saat inferensi dropout mati. Matriks NPZ memakai orientasi `x @ W`; converter Hugging Face mentransposisikan matriks linear dan meratakan bias. Keluaran memakai `hidden @ Wemb.T + decoder_ff_logit_out_b`.

Kode asli pada commit `2111c28` menetapkan epsilon layer norm **1e-6** dan posisi sinusoidal dengan penyebut **(d_model/2 − 1)**. Implementasi Marian dalam Transformers 4.44.2 memakai default layer norm 1e-5 dan penyebut d_model/2. Keduanya dikoreksi secara eksplisit dalam `convert_models.py`; bobot yang dipelajari tidak dilatih ulang. Baris PAD nol ditambahkan pada ID 54.795 sesuai konvensi converter; PAD dilarang menjadi keluaran.

Rujukan kode primer yang diunduh dan hash-nya: `SOURCE_TO_CONVERSION_PROVENANCE.json`. Bukti formula: `upstream/marian_transformer.h` fungsi `layerNorm`, `addPositionalEmbeddings`, dan `Attention`; `upstream/src_graph_node_initializers.cpp` fungsi `sinusoidalPositionEmbeddings`.

## Model pelengkap arah balik

Untuk memenuhi arah Inggris → Indonesia tanpa mengganti model asli, model OPUS resmi pasangan `en-id`, rilis `2019-12-18`, diunduh dari URL yang tercantum di README Helsinki-NLP. Model pelengkap ini **bukan isi lampiran pengguna**. Asal, ukuran dan SHA-256 terpisah tercatat pada manifest/provenance. LICENSE internalnya juga CC BY 4.0. Keduanya menggunakan adapter ONNX yang sama, tetapi identitas dan pemilihan arah tetap terpisah.

## Alur konversi dan integrasi

NPZ asli → converter Marian resmi yang dipin → koreksi formula native → graf FP32 PyTorch → ONNX opset 17 → kuantisasi dinamis QInt8 per-channel untuk MatMul/Gather → loader browser. Berkas hasil tersedia di `browser-model/id-en/` dan `browser-model/en-id/`.

Kontrak encoder: `input_ids:int64[B,S]`, `attention_mask:int64[B,S]` → `last_hidden_state:float[B,S,512]`.

Kontrak decoder: `input_ids:int64[B,T]`, `encoder_hidden_states:float[B,S,512]`, `encoder_attention_mask:int64[B,S]` → `logits:float[B,54796]` untuk token terakhir. Decoder awal menerima `[54795]`; berhenti hanya pada EOS 0 atau alasan penghentian eksplisit. Posisi graf maksimum 512. Input/output cap aplikasi wajib ≤ batas itu. Inferensi baseline greedy, berbeda dari beam 6 pada decoder penerbit; perubahan ini dinyatakan dalam manifest.

Tokenisasi browser harus mengambil **pieces** SentencePiece sumber, memetakan string piece lewat `vocab.json`, lalu menambahkan EOS. Jangan langsung mengirim ID SentencePiece ke model. Keluaran ID Marian dipetakan kembali ke piece dari kosakata Marian; detokenisasi sesuai SentencePiece tanpa menganggap ID Marian sama dengan ID tokenizer.

## Hasil dan batas bukti

`parity-id-en.json` dan `parity-en-id.json` adalah uji konversi pada empat kalimat pengembangan per arah. `PUBLISHED_NATIVE_OUTPUT_PARITY.json` membandingkan 20 keluaran asli yang diterbitkan per arah menggunakan FP32 beam 6; ini bukan eksekusi ulang binary Marian native. `ENGINE_SEED_INFERENCE_RESULTS.json` adalah keluaran model mentah pada 60 fixture PRD; tanpa pelindung struktur, tanpa QA aplikasi dan tanpa penilaian manusia. Uji tersebut tidak membuktikan kesetaraan semantik seluruh corpus atau release readiness.
