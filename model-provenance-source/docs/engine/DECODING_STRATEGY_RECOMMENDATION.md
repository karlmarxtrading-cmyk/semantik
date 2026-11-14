# Perbandingan strategi decoding dan pengendalian risiko

## Cakupan bukti

`DECODING_STRATEGY_COMPARISON.json` memuat enam fixture yang telah diketahui bermasalah dan empat kasus dari sumber asli, lengkap dengan input/output aktual, token, runtime, alasan selesai, konfigurasi, serta hash manifest. FP32 memakai formula Marian asli (epsilon 1e-6 dan posisi sinusoidal native). Beam 6 memakai normalisasi panjang 1; QInt8 greedy memakai artefak browser final yang tidak diubah oleh penelitian ini.

Semua ini adalah diagnosis pengembangan yang sudah melihat sumber masalah, bukan blind acceptance atau penilaian manusia independen. Tabel berikut adalah pemeriksaan analitis AI atas batas makna yang eksplisit pada sumber.

| Fixture | FP32 greedy | FP32 beam 6 | QInt8 greedy | Temuan utama |
|---|---|---|---|---|
| FX014 | Instruksi menjelaskan hilang | Instruksi menjelaskan hilang | Instruksi menjelaskan hilang | Memperlebar beam tidak memulihkan tugas kedua |
| FX034 | `mean` menjadi `arti` | `mean` menjadi `arti` | `mean` menjadi `arti` | Salah memilih makna istilah statistik |
| FX035 | `nonnegative` hilang | `nonnegatif` dipertahankan | `nonnegative` hilang | Beam 6 memperbaiki kasus ini |
| FX037 | `if and only if` menjadi `jika` | Sama | Sama | Syarat perlu-cukup berubah |
| FX041 | `excluding 1` benar menjadi `tidak termasuk 1` | Salah menjadi `termasuk 1` | Salah menjadi `termasuk 1` | Beam 6 juga dapat memperburuk hasil |
| FX055 | `right angle` menjadi `sudut kanan` | Sama | Sama | Istilah geometri tidak tepat |

Kesimpulan terbatas: beam 6 memperbaiki satu dari enam masalah yang dipilih, tetapi tidak menyelesaikan lima lainnya; ia bahkan memperburuk FX041 dibanding FP32 greedy. Tidak ada dasar untuk menyebut beam 6 sebagai perbaikan semantik umum.

## Konteks sumber asli

Pada `MATH SD.txt` Unit 01 Q1, kalimat sumber menanyakan benda dihitung **tepat sekali**. Keluaran terisolasi semua mode hanya menyebut *exactly*, tanpa makna sekali. Beam 6 memperbaiki pilihan kata *calculated* menjadi *counted*, tetapi tidak memulihkan syarat tepat-sekali. Menambahkan jawaban langsung lengkap dan satu paragraf penjelasan lengkap (105 token sumber) tetap tidak menyelesaikan syarat itu dan menghasilkan kekeliruan tambahan. Ini adalah konteks terpilih yang dibatasi; seluruh unit asli lebih panjang dan tidak diklaim sudah diterjemahkan.

Pada `questions/comprehensive math/dynanca - 1.json`, pertanyaan pertama dan konteks lengkap question/options/answer/explanation/hint diuji. Menerjemahkan representasi JSON utuh sebagai teks menyebabkan kerusakan bentuk, rumus, dan isi pada ketiga mode. Kasus ini merupakan kontrol negatif untuk menegaskan bahwa adapter MT tidak boleh menerima serialized JSON lengkap. Uji tambahan `STRUCTURED_CONTEXT_AND_SENTENCE_PROBE.json` memisahkan persoalan itu dengan memberi hanya prosa question/explanation/hint, tanpa key atau struktur JSON.

Probe prosa tanpa key JSON (124 token sumber) tetap merusak literal LaTeX dan angka ketika belum dilindungi. Sebaliknya, instruksi tersendiri `Jelaskan kesalahannya.` diterjemahkan menjadi `Explain the error.`; kalimat tanya terakhir dari MCQ asli juga tidak lagi hilang ketika dikirim tersendiri. Ini bukti kecil bahwa pemisahan kalimat yang sadar struktur mengatasi sebagian omission lintas-kalimat, bukan bahwa konteks atau semua kesalahan sudah selesai.

Model MT ini tidak mempunyai kanal konteks read-only terpisah. Menambahkan konteks ke input berarti meminta mesin menerjemahkan konteks itu juga. Jangan kemudian memotong hasil berdasarkan tebakan atau mengaku target hanya satu field. Tampilkan konteks lengkap kepada reviewer; kirim hanya rentang translatable yang terencana kepada adapter.

## Rekomendasi default saat ini

**Pertahankan QInt8 greedy untuk build browser yang sudah diuji, dengan label keluaran draf dan pemeriksaan risiko yang memblokir kasus critical/major unresolved.** Ini rekomendasi baseline implementasi yang teruji, bukan klaim bahwa greedy memiliki mutu semantik terbaik. Jangan mengganti default menjadi beam 6 hanya berdasarkan nama konfigurasi penerbit: eksperimen menunjukkan hasilnya tidak monoton membaik, dan QInt8 beam 6 di browser belum diuji.

Sebelum keputusan default rilis, bandingkan kedua strategi pada corpus penerimaan yang benar-benar terpisah, dengan strata matematika/penjelasan/konteks dan penelaahan bilingual yang diminta PRD. Jika native beam 6 ditawarkan, identitas decoding dan invalidasi cache/TM harus berubah; report dan model fingerprint harus memuat pilihan itu. Jangan menutup gerbang mutu hanya karena semua inferensi berakhir dengan EOS.

## Aturan risiko konservatif tanpa hardcode fixture

Aturan berikut berlaku pada pola bahasa/konsep umum, tidak mengenali ID fixture, tidak menyimpan jawaban contoh dan tidak membandingkan string output dengan satu jawaban emas. Aturan ini mendeteksi risiko atau ketidaksesuaian tertentu; keberhasilan checker bukan sertifikat kesetaraan seluruh makna.

| Kategori | Dasar umum | Keputusan aman |
|---|---|---|
| Domain bertanda | `nonnegative`, `nonpositive`, `positive`, `negative`, `real`, `integer`; padanan Indonesia dan bentuk operator setara | Bila konsep eksplisit sumber tidak muncul pada target, beri temuan major dan minta perbaikan/review. Pengecualian/parafrasa memerlukan alasan, bukan penghapusan flag diam-diam. |
| Hubungan logis | `if and only if` / `iff` / `jika dan hanya jika` / operator biconditional | Bedakan dari kondisi satu arah. Kehadiran kata `if` atau `jika` saja tidak cukup. |
| Inklusi batas | Predikat include/exclude terkait nilai batas tertentu dan bracket interval | Bandingkan peran setiap batas, bukan multiset angka. `including 0` dan `excluding 1` tidak boleh tertukar atau sama-sama termasuk. Bila parsing ambigu, wajib review. |
| Tugas soal | Kata kerja imperatif/perintah seperti explain, prove, justify, compare, determine; jelaskan, buktikan, bandingkan, tentukan | Catat unit tugas pada tiap kalimat. Jika tugas sumber hilang dalam pasangan target, major. Gunakan beberapa padanan/parafrasa; jangan menganggap jumlah kalimat saja bukti cukup. |
| Istilah domain | Glossary yang secara eksplisit berprofile matematika/statistika, misalnya `right angle`, `weighted mean`, statistical `mean` | Tangani konsep/frasa, bukan replace kata global. `mean` sebagai verba di luar konteks statistik tidak boleh dipaksakan menjadi rata-rata. |
| Kardinalitas tepat | `exactly once`, `tepat sekali`, satu-satu, semua/setiap, at least/at most | Pastikan kuantor, cakupan, dan syarat frekuensi tetap terwakili. `exactly` saja tidak membuktikan `exactly once`. |
| Literal teknis | Rumus, nomor, operator, placeholder, key, label opsi dan answer key | Lindungi sebelum inferensi, validasi identitas/jumlah/posisi sesuai role sesudahnya; jangan berusaha memulihkan literal hilang dengan menambahkannya sembarang di akhir target. |

Pembatasan kalimat yang sadar struktur juga mengurangi hilangnya instruksi kedua seperti FX014: buat segmen tersendiri untuk kalimat perintah dan pertahankan pemetaan segmen→source span. Jangan memecah dalam desimal, singkatan, formula, placeholder, grapheme atau code fence. Uji instruksi yang dipisahkan ada di laporan probe. Perbaikan segmentasi ini tidak menyelesaikan perubahan domain atau istilah di dalam satu kalimat, sehingga checker dan review tetap diperlukan.

Aturan berisiko tinggi sebaiknya tetap membuka jalur perbaikan target dan resolusi temuan dengan audit trail. Jangan memblokir semua teks sebagai pengganti QA; kalimat sederhana yang tidak mengandung risiko tersebut dapat melanjutkan auto-QA struktural, dengan status yang tetap berbeda dari HUMAN_REVIEWED.
