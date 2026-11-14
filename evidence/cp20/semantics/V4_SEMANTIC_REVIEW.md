# CP20 v4 — acceptance semantik baru

**FAIL** pada build `cp20-1668833ad37c9dd8`. Sepuluh paragraf baru setelah pembekuan v4 mencakup lima domain dan kedua arah. Sembilan menghasilkan target, satu mempertahankan sumber karena ditolak. Review AI menemukan empat target dengan perubahan kritis. Ini kegagalan teknis yang sudah terlihat; ketiadaan reviewer manusia bukan satu-satunya alasan gagal.

Rubrik enam dimensi dibekukan sebelum korpus ini. Penulis korpus dan reviewer adalah AI; persetujuan manusia **0**. Angka sampel ini bukan estimasi akurasi populasi. Model/rules tidak disesuaikan dari hasil korpus ini. Eksekusi ulang final-dist hanya membuktikan ikatan build dan kesamaan hasil.

| ID | Arah | Mesin | Kritis pada target | Catatan |
|---|---|---|---|---|
| CP20-V4-A-01 | en-id | translated | Tidak ditemukan oleh review AI ini | Relasi dapat diturunkan/kontinu, syarat konvers, dan pembatas bukti grafik dipertahankan; sintaks kurang alami. |
| CP20-V4-A-02 | en-id | translated | Tidak ditemukan oleh review AI ini | Pemanasan menjadi pemanas dan boiled menjadi direbus kurang tepat; urutan berhenti sebelum mendidih dan penjelasan kausal kontribusi pemanas tetap dapat dipahami. |
| CP20-V4-A-03 | en-id | translated | YA | Population mean menjadi populasi berarti, sehingga besaran rata-rata populasi hilang. Negasi kesimpulan tentang pencatatan keliru masih ada. |
| CP20-V4-A-04 | en-id | rejected | Tidak ada target | Tidak ada target diterima; sumber dipertahankan setelah guard menolak. Ini kegagalan ketuntasan, bukan terjemahan yang benar. |
| CP20-V4-A-05 | en-id | translated | Tidak ditemukan oleh review AI ini | Instrumentasi laboratorium, urutan kalibrasi, pengurangan galat, serta batas pembuktian penjelasan terjaga; sintaks pengukuran kesalahan kurang alami. |
| CP20-V4-A-06 | id-en | translated | Tidak ditemukan oleh review AI ini | Relasi matematika terjaga; susunan Function differentiable dan not by itself evidence tidak alami. |
| CP20-V4-A-07 | id-en | translated | Tidak ditemukan oleh review AI ini | Pemanasan diterjemahkan warming, pemanas menjadi heating, dan tense lemah; kontribusi energi pemanas, urutan mendidih, serta larangan atribusi hanya ke katalis tetap ada. |
| CP20-V4-A-08 | id-en | translated | YA | Population mean menjadi average population yang ambigu, sampling procedure menjadi fetching procedure. Kalimat kedua berubah menjadi tautologi misrecorded observation is being recorded, merusak klaim tentang bukti pencatatan keliru. |
| CP20-V4-A-09 | id-en | translated | YA | Harga barang substitusi hilang: When substitution goods go up menyatakan barang naik, bukan harganya. Hubungan substitusi vs komplemen masih ada. |
| CP20-V4-A-10 | id-en | translated | YA | Kalibrasi pada klaim pengurangan kesalahan menjadi kata tidak bermakna Calicacy; istilah calibration benar pada kalimat berikutnya sehingga identitas operasi ilmiah tidak konsisten. |

`V4_FINAL_DIST_SEMANTIC_BINDING.json` membuktikan semua 10 target/status/retry/metrik sama persis dengan run source v4 dan hash modul cocok dengan manifest final. PASS pada binding bukan PASS semantik. Korpus lama 30 kasus tetap disimpan sebagai sejarah/regresi parity, dengan sembilan kesalahan kritis dan tujuh penolakan.

`V4_HUMAN_REVIEW_BILINGUAL.csv` berisi sumber/target/referensi AI dan kolom penilaian manusia kosong. Semua enam dimensi dinilai terpisah dalam JSON; target yang tidak dihasilkan diberi nilai kosong. Tidak ada adjudikasi manusia yang diklaim.

Rilis kemasan kemudian berubah menjadi `cp20-8c643bea6962471f` untuk ETA/riwayat penyimpanan. `FINAL_COMPONENT_PARITY_BINDING.json` mengikat komponen semantik/model/runtime yang sama ke manifest baru; tidak mengklaim inferensi ulang. Identitas eksekusi dan seluruh hasil review di atas tetap `cp20-1668833ad37c9dd8`.
