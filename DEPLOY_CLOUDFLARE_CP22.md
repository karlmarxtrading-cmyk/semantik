# Deploy ke Cloudflare Pages (CP22)

> Status website: **NOT PRODUCTION READY.** Deploy di bawah ini untuk **staging/preview privat**. Jangan mengganti website publik tanpa keputusan pemilik. Push ke GitHub tidak sama dengan deploy berhasil; verifikasi selalu dilakukan pada URL deployment yang nyata.

## Fakta output

- Folder output: `dist/` (hasil `scripts/build-with-history.py`).
- 1.200 berkas: `index.html`, `_headers`, `sw.js` di root, plus namespace immutable `r/6ed0d134e1770b27` (CP19), `r/2e4d8ef18eb32385` (CP20), `r/ba83aed6acb74963` (CP21), `r/f995042b7da24e42` (CP22). Namespace lama dipertahankan agar tab yang masih terbuka tidak kehilangan aset; jangan dihapus tanpa keputusan pemilik.
- Berkas terbesar ≈15,3 MB (pecahan model).
- Batas Cloudflare Pages yang tercatat saat CP22 (cek ulang dokumentasi resmi sebelum deploy): unggah *drag-and-drop* dashboard 1.000 berkas; Wrangler direct upload 20.000 berkas; 25 MiB per berkas. Karena itu **drag-and-drop tidak bisa dipakai** untuk build ini. `verify-final.py` tetap mencatat FAIL untuk kriteria dashboard lama; kriteria itu tidak diubah.

## Opsi A — Wrangler direct upload (dari komputer Anda)

```bash
python3 scripts/build-with-history.py --evidence-dir evidence/reproduced/build
python3 scripts/verify-repository.py --dist dist
npx wrangler login
# Preview/staging: gunakan branch non-produksi
npx wrangler pages deploy dist --project-name=<PAGES_PROJECT_NAME> --branch=staging
```

`<PAGES_PROJECT_NAME>` adalah placeholder; ganti dengan proyek Pages Anda. Contoh konfigurasi: `deploy/wrangler.pages.example.toml`.

## Opsi B — Integrasi GitHub di Cloudflare Pages

Pengaturan proyek:

| Setelan | Nilai |
|---|---|
| Production branch | pilih branch yang memang untuk produksi; gunakan branch lain untuk preview |
| Build command | `python3 scripts/build-with-history.py --evidence-dir evidence/reproduced/build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Versi Python | `.python-version` (3.13) |

Build tidak memerlukan `npm install`; `tools/package.json` hanya untuk QA dan tidak berada di root.

## Setelah deploy (wajib sebelum klaim apa pun)

Ikuti `QUALIFICATION_PLAN_CP20.md` dan `DEPLOY_UPDATE_ROLLBACK_CP20.md`: periksa header/CSP/MIME/Range, PDF dua arah di browser, model dan OCR setelah reload, offline dengan jaringan diputus, update saat tab aktif, dua tab, dan rollback. Catat hasilnya sebagai bukti baru; jangan mengubah status gerbang tanpa bukti itu.
