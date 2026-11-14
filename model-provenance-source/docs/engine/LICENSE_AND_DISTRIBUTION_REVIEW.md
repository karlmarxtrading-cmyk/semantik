# Lisensi dan distribusi mesin

## Model

Sumber terkuat untuk paket yang benar-benar diperoleh ialah berkas `LICENSE` di masing-masing ZIP OPUS. Keduanya menyatakan Creative Commons Attribution 4.0 International (CC BY 4.0). Salinan identik disertakan sebagai `browser-model/{id-en,en-id}/LICENSE` bersama `ORIGINAL_MODEL_README.md`.

Atribusi yang harus dibawa dalam distribusi: **OPUS-MT / Language Technology Research Group, University of Helsinki**, pasangan bahasa dan rilis 2019-12-18, tautan asal masing-masing paket, tautan lisensi, serta keterangan perubahan: konversi NPZ Marian ke ONNX, penyesuaian konvensi PAD dan kuantisasi per-channel int8. Tidak ada klaim dukungan/endorsement penerbit.

CC BY 4.0 mengizinkan berbagi dan adaptasi, termasuk komersial, dengan atribusi dan penandaan perubahan; simpan pemberitahuan yang disertakan. Rujukan primer: https://creativecommons.org/licenses/by/4.0/ dan LICENSE internal. Ini adalah catatan rekayasa distribusi berdasarkan berkas aktual, bukan penilaian hukum terhadap semua dataset pembentuk OPUS.

**Perbedaan metadata:** kartu model Hugging Face `Helsinki-NLP/opus-mt-en-id` menampilkan Apache-2.0, sedangkan arsip OPUS yang benar-benar diunduh berisi CC BY 4.0. Distribusi ini mengikuti LICENSE arsip; jangan menyalin label Apache dari template kartu dan menghapus atribusi model.

ID→EN berasal dari lampiran pengguna; EN→ID merupakan model resmi pelengkap yang diunduh saat implementasi. Bukti asal dan SHA-256 ada dalam `SOURCE_TO_CONVERSION_PROVENANCE.json` serta `MODEL_FILE_INVENTORY.json`.

## Kode/runtime

Converter Hugging Face Transformers 4.44.2 berada di bawah Apache-2.0; header asli dipertahankan dalam `upstream/convert_marian_to_pytorch.py`. Script `convert_models.py` memanggil converter tersebut. ONNX/ONNX Runtime dan SentencePiece adalah dependensi terpisah; lisensi paket yang benar-benar digunakan dicatat pada `CONVERSION_DEPENDENCIES.json`. Distribusi browser harus menyertakan NOTICE/lisensi npm runtime yang dipin oleh aplikasi (ONNX Runtime Web, SentencePiece WASM, dan dependensi transitif).

Konversi memakai PyTorch CPU/Transformers/ONNX hanya saat pembangunan dan verifikasi. Server Python atau PyTorch tidak diperlukan untuk menjalankan situs statis hasilnya. Jangan membundel `.venv` sebagai runtime website.

## Data uji eksternal

Berkas `.test.txt` penerbit diunduh hanya untuk perbandingan 20 hasil awal per arah. Laporan perbandingan yang dapat dibagikan menyimpan indeks dan hash, bukan mendistribusikan ulang keseluruhan corpus pihak ketiga. Dataset soal pengguna dan fixture PRD memiliki provenance terpisah; lisensi model tidak otomatis melisensikan ulang dataset tersebut.

## Keputusan paket

Sertakan model ONNX/tokenizer/manifes/lisensi, script konversi, lock dependensi dan bukti. Hindari memasukkan cache pip, `.venv`, bobot eksperimen historis, atau corpus referensi eksternal penuh dalam paket publik. Bobot FP32 besar yang tidak dibundel tetap dapat dibangun ulang dari input terverifikasi. Jangan mengklaim bahwa kuantisasi tidak mengubah nilai bobot: ia adalah turunan numerik dengan jejak pengujian sendiri.
