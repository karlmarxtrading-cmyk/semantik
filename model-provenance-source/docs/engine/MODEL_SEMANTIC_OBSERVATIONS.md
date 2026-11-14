# Temuan semantik model mentah — bukan sertifikasi manusia

60/60 fixture PRD selesai dengan EOS pada ONNX QInt8 per-channel dua arah. Ini uji **engine-only**, belum memakai planner, pelindung rumus/placeholder, glossary dan QA aplikasi. Status semantik keseluruhan tetap `NOT_REVIEWED`; tabel di bawah mencatat temuan analitis AI spesifik yang terlihat pada output, bukan adjudikasi dua penelaah manusia.

| Fixture | Gejala pada hasil aktual | Dampak |
|---|---|---|
| SEM-FX-014 | Kalimat perintah menjelaskan kesalahan hilang | Tugas soal tidak utuh |
| SEM-FX-035 | `nonnegative` hilang dari domain bilangan | Solusi/domain dapat berubah |
| SEM-FX-037 | `if and only if` menjadi `jika` | Hubungan perlu-cukup berubah |
| SEM-FX-041 | `excluding 1` menjadi `termasuk 1` | Batas interval salah |
| SEM-FX-034 | Statistical `mean` menjadi `arti` | Istilah akademik salah konteks |
| SEM-FX-043 | `weighted mean` menjadi `rata-rata berat` dan klausa berikut salah | Makna metode statistik berubah |
| SEM-FX-055 | `right angle` menjadi `sudut kanan` | Konsep sudut siku-siku tidak tersampaikan |
| SEM-FX-007/029/040 | Operator atau formula Unicode rusak | Invariant matematika gagal bila tidak dilindungi |
| SEM-FX-024/054 | Placeholder berubah | Integritas interpolasi gagal bila tidak dilindungi |
| SEM-FX-015/044 | Pangkat satuan diubah/hilang | Satuan atau representasi tidak terjaga |

Pelindung rentang dapat menangani literal formula/placeholder, tetapi tidak otomatis memperbaiki hilangnya negasi/domain/jenis tugas. Glossary yang berarah dan konteks akademik dapat membantu istilah tertentu, tetapi tidak boleh digunakan untuk hardcode keluaran fixture atau menyatakan seluruh makna telah benar. QA harus memblokir critical/major unresolved, memungkinkan perbaikan manual dengan jejak revisi, dan membedakan AUTO_QA_PASS dari HUMAN_REVIEWED.

Laporan keluaran lengkap yang menjadi dasar temuan: `ENGINE_SEED_INFERENCE_RESULTS.json`. Set fixture ini adalah development/regression seed yang sudah diketahui, bukan blind acceptance 400+400. Kelulusan graf/runtime/parity bobot tidak menutup gerbang semantic benchmark PRD.
