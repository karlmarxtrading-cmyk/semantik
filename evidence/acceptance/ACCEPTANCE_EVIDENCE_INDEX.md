# CP18 — indeks bukti penerimaan

**Status ilmiah: FAIL pada modul terbaru yang diuji. Persetujuan manusia: 0.**

Ini adalah bukti implementasi dan pengujian yang dapat diperiksa, bukan persetujuan produksi. Status browser, hosting, dan paket akhir ditentukan pada laporan integrasi utama.

## Bukti aktual

| Berkas | Cakupan dan hasil |
|---|---|
| `INTAKE_INTEGRITY.json` | Receipt bukti dan model diverifikasi dari byte aktual. Pemeriksaan 496 partisi matematika pada Markdown historis adalah baseline, bukan hasil CP18 baru. |
| `G7_REAL_JOURNAL_CORPUS.json` | Delapan PDF jurnal berlisensi terbuka, 160 segmen, 80 per arah. PDF, halaman, teks ekstraksi, hash, asal, dan lisensi dicatat. |
| `REAL_JOURNAL_BASELINE_INFERENCE.json` | Inferensi nyata 160 segmen melalui model CP17 di Node/WASM. |
| `REAL_JOURNAL_REVISED_INFERENCE.json` | Inferensi nyata pertama CP18: 147 hasil terjemahan dan 13 penolakan dengan sumber tetap utuh. Ini bukan 147 persetujuan semantik. |
| `G7_REAL_JOURNAL_COMPARISON_AI_NOT_HUMAN.json` | Penyaringan AI seluruh 160 pasangan menemukan 22 kasus kritis pada versi pertama; 15 di antaranya tanpa peringatan otomatis. Angka ini bukan penilaian manusia atau akurasi tersertifikasi. |
| `G7_REAL_JOURNAL_EXPOSURE.json` | Setelah hasil pertama dipakai untuk perbaikan struktural, 160 segmen ini menjadi data pengembangan. Hasil pertama tetap disimpan. |
| `FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json` | Inferensi nyata tambahan pada modul final: 20 probe negatif yang sudah terekspos, 19 cacat makna kritis masih teramati dan satu cacat istilah. Dua label/fungsi dan identitas takson yang diperbaiki dicatat terpisah. |
| `JOURNAL_REPLAY_EXPORT_REPORT.json` | Delapan ZIP baru dibuat memakai serializer produksi dan hasil nyata 160 segmen pertama, dengan PDF asli, ID, provenance, hash modul, serta hitungan penolakan. Ini adalah replay ekspor, bukan ekstraksi/inferensi/browser baru. |
| `JOURNAL_REPLAY_HTML_VALIDATION.json` | Seluruh 640 pemeriksaan teks tampak PASS; 160 pasangan provenance tepat; CRC dan hash internal delapan ZIP PASS. Hanya whitespace dinormalisasi dalam pembandingan HTML. |
| `JOURNAL_REPLAY_HTML_BEFORE_MARKDOWN_FIX.json` | Enam kegagalan asli pada daftar literal Markdown dipertahankan. Kode diperbaiki, pengujian yang sama kemudian lulus. |
| `FINDING_CLOSURE_LEDGER_CP18.json` | Semua 18 temuan produk dan delapan tema hasil beserta bukti, batas klaim, dan status. Finalisasi browser/build tetap dilakukan pada integrasi utama. |

## Paket reviewer manusia

Berikan `REAL_JOURNAL_BLINDED_REVIEWER_A.csv` dan `REAL_JOURNAL_BLINDED_REVIEWER_B.csv` kepada dua reviewer bilingual ilmiah yang independen. Jangan berikan `REAL_JOURNAL_BLINDING_KEY_OWNER_ONLY.json` atau hasil penyaringan AI sebelum penilaian awal. Gunakan `REAL_JOURNAL_REVIEW_INSTRUCTIONS.txt`, PDF sumber, dan ambang tetap pada `G7_PREDECLARED_RUBRIC.json`. Adjudicator menyelesaikan perbedaan tanpa menghapus keputusan awal.

Kolom identitas, kualifikasi, tanggal, referensi manusia, dan persetujuan sengaja belum diisi. Sebagian teks referensi memiliki OCR atau simbol matematika yang belum lengkap; reviewer harus memeriksa halaman PDF. Seluruh baris yang bermasalah tetap berada pada inventaris. Dua segmen dalam PDF jurnal kelima berasal dari artikel bersebelahan yang terdapat pada halaman terakhir; keterbatasan ini dinyatakan per ID.

## Batas bukti

Model dijalankan secara lokal melalui jembatan Node/WASM dengan transport berkas dan cache RAM. Tidak ada API terjemahan eksternal. Inferensi ini tidak membuktikan UI, offline browser, kuota perangkat, coverage ekstraksi final, atau deployment. Laporan parser PDF produksi berada di `../pdf/`; laporan browser akhir disediakan oleh integrasi utama. Worksheet historis pengguna tetap tidak tersedia; fixture sintetis diberi label dan tidak dianggap sebagai PDF pengguna.

Perubahan makna ilmiah yang masih nyata harus diperbaiki pada model/pipeline dan diuji pada korpus baru yang belum digunakan untuk tuning. Review manusia belum dapat dijadikan satu-satunya alasan penundaan: kegagalan semantik internal masih ada pada modul terbaru.

## Reproduksi terarah

- `tests/acceptance_intake.py`: integritas input dan baseline matematika.
- `tests/acceptance-inference-resumable.mjs`: inferensi nyata dengan checkpoint per segmen dan pemeriksaan kesamaan hash sebelum resume.
- `tests/assemble_final_quality_confirmation.py`: menyatukan probe terbaru dengan penilaian AI yang dipisahkan dari persetujuan manusia.
- `tests/export_journal_replay.mjs` lalu `tests/validate_journal_replay.py`: ekspor baru dan pemeriksaan ketat hasil render/provenance.

Jangan menimpa hasil pertama atau memperlakukan pengujian ulang atas korpus terekspos sebagai held-out baru. Paket sebelum perbaikan serializer ada di `journal-replay-exports-before-markdown-fix/`; hasil setelah perbaikan ada di `journal-replay-exports/`.
