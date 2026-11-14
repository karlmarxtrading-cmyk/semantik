# Mengunggah ke GitHub dengan Git Bash (Windows)

Ganti `<USER>` dan `<REPO>` dengan milik Anda. Repository ini ≈425 MB dan tidak memerlukan Git LFS (berkas terbesar ≈15 MB, di bawah batas GitHub 100 MiB).

## 0. Ekstrak dan periksa

1. Ekstrak `SEMANTIK_SETARA_CP22_GITHUB_READY.zip`, misalnya ke `C:\proyek\`. Hasilnya folder `semantik-setara`.
2. Buka **Git Bash** di folder itu:

```bash
cd /c/proyek/semantik-setara
python scripts/verify-repository.py      # harus "allPass": true
```

(Di Windows perintahnya bisa `python` atau `py -3`.)

`.gitattributes` berisi `* -text`, sehingga Git tidak mengubah akhir baris; byte tetap sama dengan yang diverifikasi.

## 1a. Repository GitHub baru dan kosong

Buat repository kosong di GitHub (**tanpa** README, .gitignore, atau license), lalu:

```bash
git init -b main
git config user.name  "Nama Anda"        # bila belum diset global
git config user.email "email@contoh.com"
git config http.postBuffer 524288000     # membantu push pertama yang besar
git add -A
git status --short | head                # pastikan dist/ dan node_modules/ tidak ikut
git commit -m "CP22: source SEMANTIK SETARA (NOT PRODUCTION READY)"
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```

## 1b. Repository GitHub yang sudah punya riwayat

Jangan memakai force push. Gabungkan sebagai commit baru di atas riwayat yang ada:

```bash
cd /c/proyek
git clone https://github.com/<USER>/<REPO>.git repo-lama
cd repo-lama
git checkout -b cp22-source
# Salin isi semantik-setara ke sini (termasuk berkas tersembunyi), menimpa berkas yang sama nama:
cp -a /c/proyek/semantik-setara/. .
python scripts/verify-repository.py      # berkas lama yang tidak ada di manifest akan dilaporkan sebagai "extra"
git add -A
git commit -m "CP22: source SEMANTIK SETARA (NOT PRODUCTION READY)"
git push -u origin cp22-source
```

Lalu buka Pull Request `cp22-source → main` di GitHub dan tinjau. Bila `verify-repository.py` melaporkan berkas "extra" dari riwayat lama, putuskan sendiri apakah berkas itu dihapus (`git rm <path>`) atau dipertahankan; jangan dihapus otomatis.

## 2. Verifikasi setelah push

```bash
cd /c/proyek
git clone https://github.com/<USER>/<REPO>.git cek-clone
cd cek-clone
python scripts/verify-repository.py
```

Hasil `allPass: true` berarti isi GitHub identik dengan paket CP22, termasuk bobot model.

## Bila push gagal

- `RPC failed` / koneksi terputus: ulangi `git push`; periksa koneksi; `http.postBuffer` di atas sudah diset.
- `rejected (fetch first)`: remote sudah punya commit. Ikuti bagian 1b, bukan force push.
- Autentikasi: gunakan Git Credential Manager (bawaan Git for Windows) atau personal access token; jangan menyimpan token di dalam repository.

Push berhasil **tidak** berarti website ter-deploy. Untuk Cloudflare, lihat `DEPLOY_CLOUDFLARE_CP22.md`.
