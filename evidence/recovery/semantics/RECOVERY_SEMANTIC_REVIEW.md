# Tinjauan semantik pemulihan CP19/CP20

**Status: NOT PRODUCTION READY.** Perbaikan istilah dan penjagaan klaim mengatasi beberapa temuan konkret, tetapi keluaran yang diterima oleh guard masih mengandung penghilangan makna dan kesalahan hubungan. Penolakan aman berarti sumber dipertahankan, bukan terjemahan selesai.

Tinjauan ini dibuat oleh AI; tidak ada persetujuan manusia. Korpus lama telah dipakai untuk pengembangan. Hasilnya adalah regresi kasus yang diketahui, bukan penerimaan independen, pengukuran akurasi populasi, atau uji ulang 1.500 halaman.

## Bukti dan batas pengujian

- `DEVELOPMENT_ITERATION_3.json`: 50 kasus inferensi ONNX/WASM nyata dengan SHA modul saat eksekusi; 48 diterjemahkan dan 2 ditolak pada tahap tersebut.
- Setelah dua perubahan terbatas (istilah/peran reviewer dan penerimaan bentuk tunggal hypothesis/condition), `AFFECTED_ONLY_INFERENCE.json` menjalankan ulang 3 kasus terdampak pada source final: H015 ditolak; H017 dan H030 diterjemahkan.
- `RECONCILED_KNOWN_REGRESSION.json`: gabungan hasil terbaru adalah **48 translated, 2 rejected, 0 failed**. H008 dan H015 mempertahankan sumber. Ini **bukan 50 eksekusi baru pada byte final**. Sebanyak 47 keluaran terdahulu tetap memiliki SHA eksekusi asli dan lolos pemeriksaan guard final; sumbernya tidak memuat istilah reviewer yang baru.
- `GUARD_TESTS.json`: **35 kontrol positif/negatif lulus pada source final**, termasuk angka, label eksperimen, peran reviewer, negasi nonempty/none, dan pasangan makna yang harus ditolak/diterima. Ini kontrol terarah, bukan bukti umum kesetaraan.
- `SCIENTIFIC_IDENTITIES_51.json`: 51 kontrol identitas ilmiah lulus sebelum dua perubahan terakhir. Suite source final lengkap dilaporkan terpisah oleh proses integrasi; laporan ini tidak memindahkan tanggal/identitas eksekusi lama.
- `FINAL_CHANGE_IMPACT_BINDING.json` beserta dua diff dan `pre-final-role-fix/` mencatat tepat dua perubahan terakhir. Byte sebelum perubahan direkonstruksi dengan membalik kedua perubahan lalu dicocokkan dengan SHA freeze yang sudah ada; ini bukan klaim artefak inferensi baru.

## Perubahan generik yang diamati

| Area | Kasus bukti | Hasil terbatas |
|---|---|---|
| Population mean / sampling procedure | V4 A03, A08; LONG-PROSE-05 | Istilah statistik dipertahankan; bukan rata-rata biasa atau prosedur yang bergeser. |
| Incorrectly recorded observation | V4 A08 | Keluaran aktual: an observation is wrongly recorded. Predikat pasif tetap terlihat oleh model; hanya nomina dikendalikan. |
| Substitute price | V4 A04, A09 | Subjek harga dan kenaikan harga muncul; guard memeriksa relasi harga, bukan sekadar keberadaan kata price. |
| Calibration identity | V4 A05, A10 | Nomina kalibrasi tidak lagi bergeser menjadi subjek orang/objek lain. A10 masih menghilangkan proposed. |
| Concentration / numbered labels | LONG-PROSE-02, 03, 10 | Dependensi konsentrasi, experiment 32 dan calculation 81 dipertahankan oleh aturan umum angka/label. |
| Rubric / uncertainty | LONG-PROSE-07, 08 | Rubric dan measurement uncertainty muncul dalam konteks penilaian/pengukuran. |
| Financial, instrument, math concepts | H002, H003, H012, H013, H016, H017, H019, H023, H025 | Perbaikan kontekstual istilah dan cakupan; bukan bukti kesetaraan setiap kalimat. |
| Reviewer role | H015, H030 | Peran reviewer tidak boleh berubah menjadi penginjil. H015 masih ditolak karena penghilangan peristiwa. |

Tidak ada cabang berdasarkan ID fixture atau paragraf jawaban penuh. Perlindungan memakai istilah/fragmen generik dalam konteks domain. Perlindungan predikat `dicatat secara keliru` sengaja dilepas karena menutupi morfologi pasif dari model dan menghasilkan klausa tanpa auxiliary. Model sekarang melihat predikat tersebut, sementara guard tetap menolak kehilangan makna pencatatan pasif. Tidak ada penambahan model atau klaim inferensi manusia.

## Temuan yang tetap terbuka

| Kasus | Status temuan | Penjelasan |
|---|---|---|
| CP20-H-008 | INCOMPLETE_SAFE_REJECTION | Model output lost the relation between fair comparison, participants and each treatment, with repeated words and changed negative/quantifier structure. The complete source is preserved; this is not a successful translation. |
| CP20-H-015 | INCOMPLETE_SAFE_REJECTION | The reviewer role is now protected, but the model still loses the event in the evidence proposition. The complete source is preserved; this is not a successful translation. |
| CP20-H-026 | UNRESOLVED_CRITICAL_ATTACHMENT | Unchanging modifies quantity demanded in the output instead of modifying the demand curve. Retained terms and a negative-polarity marker are insufficient to prove correct attachment. |
| CP20-H-023 | UNRESOLVED_LABEL_IDENTITY | Treatment A becomes A treatment, where A is read as an English article, while treatment B remains explicit. Numbers and denominator/numerator survive, but treatment identity is not reliably preserved. |
| CP20-H-007 | UNRESOLVED_QUALIFIER_OMISSION | The assumed sampling procedure loses assumed; a condition on the statistical interpretation is omitted. |
| CP20-V4-A-10 | UNRESOLVED_QUALIFIER_OMISSION | Calibration identity and measurement error are repaired, but penjelasan yang diajukan becomes explanations without proposed. |
| CP20-H-011 | UNRESOLVED_RELATION_WORDING | Quantity demanded is present, but the output wording makes it appear to modify a curve, and the unchanged demand-curve relation is unclear. |
| CP20-H-013 | UNRESOLVED_PROCEDURAL_CLAUSE | Interview schedule and certification disclaimer are repaired, but The lampiran dokumen prosedur does not form a reliable translation of the appendix documents the procedure. |
| CP20-V4-A-02 | REVIEW_REQUIRED_PROCESS_BOUNDARY | The solvent boiled becomes pelarut direbus, shifting spontaneous boiling to being boiled. Timing and energy-transfer clauses survive, but this scientific process wording needs correction or acceptance review. |
| CP20-H-005 | REVIEW_REQUIRED_RECOVERY_MEANING | Catalyst was recovered becomes katalis itu ditemukan (found). The recovery/reuse claim requires domain review. |
| CP20-H-020 | REVIEW_REQUIRED_RECOVERY_MEANING | Perolehan kembali saja becomes Returning alone, leaving the chemical recovery concept unclear. |
| LONG-PROSE-10 | REVIEW_REQUIRED_ASSUMPTION_SCOPE | Dengan asumsi yang dinyatakan becomes Assuming that; the reference to explicitly stated assumptions is weakened. |
| CP20-H-029 | REVIEW_REQUIRED_SCOPE_AND_FLUENCY | Generalization to orang tanpa akses becomes a person without access. Indonesian number is not explicit here, so this is a scope/fluency review item, not an asserted definite plural-loss error. |
| CP20-H-030 | REVIEW_REQUIRED_ABSENCE_SCOPE | Reviewer and event concepts survive; a recorded event absence remains awkward and needs review for modifier scope. |

Teks sumber dan keluaran aktual setiap temuan tersimpan pada `RECOVERY_SEMANTIC_REVIEW.json`. Masalah tata bahasa juga tersebar dalam keluaran yang mempertahankan proposisi utama. Tidak ada skor “100% benar” yang diturunkan dari jumlah guard lulus.

## Identitas source final

- `translation.js`: `bde419ef53888c6102e14e7f1afad2a894648cbe01c3dcf476c40f622195494e`
- `claim-guards.js`: `f07e48fe222f2ac60d54884be71454bb235622d9c90f8d8580417342b24c65b6`
- `semantic-spans.js`: `14e73d44a846d86ec95a8305e2aa40e0930525ba5fbe63735193688f1043618e`

## Langkah kelanjutan

1. Pertahankan source final dan bukti lama. Jangan menamai ulang regresi yang diketahui sebagai acceptance baru.
2. Jalankan penerimaan terpisah yang dibekukan setelah aturan final; catat SHA source, model, korpus dan setiap keluaran. Hasil tersebut dilaporkan oleh proses integrasi.
3. Prioritaskan hubungan modifier pada kurva permintaan, label perlakuan A, qualifier assumed/proposed, serta kelengkapan klausa dokumentasi. Perlindungan kata saja tidak cukup; perbaikan harus menjaga hubungan antarfrasa.
4. Selama masih ada penolakan, penghilangan qualifier atau hubungan salah, tampilkan status parsial dan sumber yang dipertahankan. Jangan menaikkan status produksi hanya karena build atau kontrol struktural berhasil.
5. Pengujian browser, metadata penutup dan skala dokumen ditangani bukti lain. Tidak ada pengujian 1.500 halaman tambahan di pekerjaan semantik ini.
