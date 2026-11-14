# Pemulihan final 13 November 2026

**NOT PRODUCTION READY — cp20-2e4d8ef18eb32385.** Mulai dari `SEMANTIK_SETARA_CP19_RECOVERY_REPORT.md` dan `SEMANTIK_SETARA_CP19_CONTINUATION.md`. Dokumen CP19/CP20 lain di bawah ini adalah riwayat sebelum pemulihan; bukti baru ada di `evidence/recovery/`.

---

# Kelanjutan CP20

Mulai dari source CP20 dan `RELEASE_ACCEPTANCE_CP20.json`, bukan baseline lama. Baca `AUDIT_CLOSURE_CP20.json` dan `VERIFICATION_REMAINING_CP20.md`; keduanya menunjukkan pekerjaan yang belum lulus beserta langkah reproduksi.

Prioritas teknis utama adalah mutu mesin ilmiah dua arah. Gunakan kasus gagal v4 sebagai regresi dan korpus baru setelah perubahan dibekukan. Jangan menambal keluaran per ID atau menganggap guard numerik sebagai verifikasi semantik. Laporan pembanding model menyimpan eksperimen yang benar-benar dijalankan.

Pertahankan pipeline per halaman, checkpoint atomik, lazy restore, stream Markdown, integritas manifest, dan pemisahan riwayat. Perubahan memerlukan pengujian yang terdampak serta binding ke build baru. Review manusia atau izin staging tidak memperbaiki kesalahan terjemahan yang sudah teramati.
