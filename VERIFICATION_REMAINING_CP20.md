# CP20 — verifikasi yang masih harus ditutup

Panduan ini menyiapkan pekerjaan berikutnya; **bukan laporan kelulusan**. Keputusan terakhir dan identitas paket mengikuti `RELEASE_ACCEPTANCE_CP20.md/.json` serta `evidence/build/BUILD_MANIFEST.json`. Jangan mengulang gerbang yang sudah lulus pada byte final yang sama tanpa alasan perubahan atau risiko baru. Bukti historis, `pre-*`, run parsial, dan keluaran `SOURCE_ONLY` tidak menggantikan bukti penerimaan.

## 1. Pisahkan penyebab gerbang terbuka

| Gerbang | Jenis pekerjaan yang tersisa | Bukti yang diperlukan untuk menutupnya |
|---|---|---|
| Kesetaraan makna ilmiah | **FAIL teknis**: model/strategi/guard masih menghasilkan istilah atau relasi salah dan penolakan yang membuat terjemahan tidak tuntas | Perbaikan nyata, regresi, pembekuan baru, korpus penerimaan baru, lalu penilaian enam dimensi dengan nol kesalahan kritis pada korpus tersebut |
| Review bilingual/domain independen | **BLOCKED** sampai reviewer nyata tersedia; persetujuan saat ini tidak boleh diasumsikan | Dua penilaian independen dan adjudikasi ketidaksepakatan, terikat sumber/target/build yang dinilai |
| Laptop fisik minimum dan gangguan perangkat | **BLOCKED** bila perangkat/operator tidak tersedia; **NOT_RUN** untuk skenario yang belum dijalankan | Rekaman pengujian pada laptop 64-bit dengan RAM fisik 8 GB dan Chrome/Edge stabil, termasuk memori, durasi, sleep/wake, dan penghentian proses |
| Cloudflare privat, offline, update, rollback | **BLOCKED** bila akses staging belum tersedia; tidak diselesaikan oleh preview terkelola | Byte/header Cloudflare aktual, jaringan terputus, inferensi/OCR setelah reload, lifecycle update aktif, dan rollback teramati |
| Lebih dari dua juta karakter, terjemahan sampai unduhan | **NOT_RUN** bila baru parser/ekspor sumber yang selesai | PDF kaya diproses oleh model aktual sampai satu MD diunduh; seluruh ID direkonsiliasi dan inferensi unik/cache dicatat |
| Rumus kompleks, tabel bertingkat, dan OCR ilmiah | **FAIL/NOT_RUN sesuai kasus**, pekerjaan teknis dan kualifikasi | Sumber, hasil, rendering, ketidakpastian, dan penilaian domain per kasus; fallback gambar tidak dihitung sebagai rekonstruksi LaTeX |

Persetujuan manusia atau akses hosting **tidak memperbaiki FAIL teknis semantik**. Jangan mengubah `productionReady` hanya karena reviewer tersedia atau deployment berhasil. Kasus gagal yang digunakan memperbaiki aturan menjadi regresi pengembangan; bukan lagi korpus buta.

## 2. Bekukan identitas sebelum pengujian berikutnya

Jalankan dari akar source CP20 pada salinan kerja. Pertahankan paket dan bukti sebelumnya. Dependensi pengembangan diperlukan hanya oleh pelaksana QA; konsumen tetap memakai browser tanpa instalasi.

```bash
npm ci --prefix tools --ignore-scripts
python3 scripts/build-with-history.py
python3 scripts/verify-final.py
python3 scripts/run-regressions.py --include-cp20 --out evidence/cp20/qa/verification-next
node --experimental-vm-modules tests/cp20-offline-release.mjs
node tests/cp20-math-vector-preservation.mjs
```

`run-regressions.py` memuat beberapa tes yang menulis lokasi bukti tetap. Karena itu gunakan salinan kerja untuk run baru. Tes Node/VM/Cache doubles tetap dilabeli sesuai cakupannya. Gerbang browser dan perangkat tidak berubah menjadi PASS karena perintah di atas lulus.

Catat `release`, `version`, `sourceHash`, `modelHashes`, SHA-256 ZIP, semua modul yang diuji, waktu mulai/selesai, browser, OS, CPU, RAM fisik, kuota/usage, dan nama operator. Baca nilai aktual dari manifest; jangan menyalin contoh hash lama. Jika source/model berubah, buat build baru dan jalankan ulang bukti yang terdampak. Jika hanya dokumen berubah, jelaskan mengapa byte aplikasi tidak berubah.

## 3. Laptop fisik 8 GB dan pemulihan gangguan

Kontrak awal tetap seperti `QUALIFICATION_PLAN_CP20.md`: laptop 64-bit, RAM fisik 8 GB, Chrome/Edge stabil dengan IndexedDB, Web Locks, WASM, dan OPFS. Catat versi browser/OS lengkap serta ruang disk aktual. Pengujian desktop 390 px hanya menguji layout; tidak membuktikan ponsel mampu memproses buku panjang.

Gunakan profil browser khusus pengujian dengan data yang dapat dibuang, alamat staging yang sama, dan fixture sintetis berikut. Jangan menghapus data pekerjaan pengguna untuk mensimulasikan kuota.

| Skenario | Langkah | Syarat hasil |
|---|---|---|
| Jeda/lanjut | Mulai `tests/fixtures/cp20-capacity/capacity-1001-en.pdf`; jeda setelah beberapa halaman committed; unduh parsial; lanjut | Semua ID yang tersimpan tetap ada; tidak ada terjemahan sukses yang diulang tanpa invalidasi sah |
| Reload/tutup tab | Setelah koreksi satu sumber dan satu target, tunggu indikator tersimpan; reload, lalu tutup/buka tab | Teks koreksi, status, ID, dan provenance tetap sama; halaman aktif dimuat secara terbatas |
| Process kill | Catat halaman/blok committed terakhir dan waktu; hentikan proses browser saat inferensi berikutnya aktif; buka ulang | Semua transaksi committed pulih; hanya unit yang belum committed boleh diulang; hasil parsial dapat diunduh |
| Sleep/wake | Saat ekstraksi dan, pada run terpisah, saat inferensi aktif, tidurkan laptop lalu bangunkan | Tidak ada penulis stale/dua proses; status jelas; lanjut atau pemulihan berhasil tanpa kehilangan committed data |
| BFCache | Saat pekerjaan dijeda, navigasi ke halaman lain lalu Back; rekam `pageshow.persisted` | Uji BFCache hanya dinilai bila `persisted:true`; kepemilikan diperiksa ulang. Jika tidak masuk BFCache, catat NOT_RUN, bukan PASS |
| Dua tab | Tab A memegang pekerjaan; tab B mencoba membuka/resume; lalu lepaskan A dan ulangi | Satu penulis aktif; token/generasi lama tidak dapat membaca/menimpa pekerjaan baru |
| Kuota/izin ditolak | Di profil khusus, gunakan tekanan penyimpanan terkendali; uji saat commit inferensi dan saat menyimpan edit pengguna | Pesan belum tersimpan tetap terlihat; navigasi tidak membuang edit; unduhan memakai hasil layar yang masih tersedia; retry baru menandai tersimpan setelah commit sukses |

Regresi pendukung yang sudah tersedia:

```bash
node --experimental-vm-modules tests/cp20-pipeline.mjs
node --experimental-vm-modules tests/cp20-pipeline-quota-recovery.mjs
node --experimental-vm-modules tests/cp20-math-review-lifecycle.mjs
```

Ketiganya tidak menggantikan percobaan perangkat di tabel. Jangan memakai tombol QA `cache-pressure` sebagai bukti pemulihan konsumen: tombol itu menghapus cache model untuk diagnosis dan bukan alur produk normal.

Ukur model cold/warm terpisah. Simpan durasi ekstraksi, OCR, persiapan model, inferensi, penyimpanan, ekspor, dan total. Rekam proses browser, renderer, worker/WASM, Canvas/Blob, dan GPU sejauh alat OS/browser dapat mengukurnya. Tuliskan metode agregasi agar shared memory tidak dijumlahkan dua kali. JS heap dan Node RSS tidak boleh dinamai total RAM browser. Catat interval sampling dan kemungkinan puncak singkat terlewat.

## 4. Cloudflare privat dengan byte utuh

Ikuti `DEPLOY_UPDATE_ROLLBACK_CP20.md`. Yang dibutuhkan dari luar adalah satu staging Cloudflare Pages privat yang terotorisasi, akses deploy/rollback yang sah, dan akses pengujian operator. Jangan mengganti situs publik atau membuat biaya baru. Jika kontrol akses menolak, catat BLOCKED dan minta akses spesifik; jangan melemahkan proteksi atau integritas.

1. Unggah `dist/` hasil `build-with-history.py`, termasuk namespace CP19 yang dipertahankan. Jangan menambahkan injeksi HTML, analytics, atau transformasi yang mengubah byte terdaftar.
2. Gunakan profil/klien baru yang belum dikendalikan service worker situs itu untuk memeriksa respons server aktual. Respons dari cache SW saja tidak membuktikan hosting.
3. Cocokkan ukuran dan SHA-256 seluruh aset yang terdaftar di `BUILD_MANIFEST.json`, termasuk HTML, SW, manifest, notice/lisensi, runtime, dan shard model. `_headers` adalah konfigurasi hosting, bukan aset yang wajib dapat diunduh. Respons 401/403, halaman login, atau HTML pengganti harus dicatat sebagai kegagalan akses, bukan file cocok.
4. Catat header aktual untuk `/`, `/index.html`, `/sw.js`, modul JavaScript, WASM, manifest, dan shard model: CSP, `X-Content-Type-Options`, `Content-Type`, `Cache-Control`, serta `Content-Encoding`. Cocokkan kebijakannya dengan `_headers`; shell berubah harus dapat diperbarui, namespace hash bersifat immutable.
5. Jalankan pilih PDF → terjemahkan → unduh melalui UI konsumen. Simpan unduhan asli dan hash; jangan menggantinya dengan string yang dibuat harness.

Untuk QA browser opsional:

```bash
python3 scripts/stage-cp20-browser.py
```

Script ini menambahkan `dist/qa/` di luar manifest produk. Pakai hanya pada staging QA privat; bukalah `/qa/cp20-browser.html`. Tombol diagnostic mencatat browser/runtime, lazy resources, dan beberapa respons byte/header; itu **bukan** verifikasi semua aset. Tombol checkpoint merekonsiliasi halaman/blok aktual; unduh JSON buktinya. Buang tambahan QA dengan membangun kembali artefak resmi sebelum pengemasan final. Jangan memasukkan QA/dependensi pengembangan ke ZIP deploy.

### Offline aktual

Persiapkan offline kedua arah melalui UI, dengan parser/OCR/runtime dan model berhasil diverifikasi. Putus jaringan pada perangkat, muat ulang alamat yang sama, lalu proses `digital-en.pdf`, `digital-id.pdf`, `scan.pdf`, dan `mixed-digital-500-scan.pdf` di `tests/fixtures/`. Uji arah yang sesuai serta unduh hasil. Catat request gagal/sukses, controller SW, identitas cache, bukti jaringan terputus, dan model hash. Keberhasilan membaca teks digital tidak membuktikan OCR atau inferensi offline.

Uji pembatalan persiapan, ruang tidak cukup, dan byte cache rusak pada profil khusus. Perilaku yang diharapkan adalah kegagalan eksplisit tanpa label “offline siap” palsu; jangan menghapus assertion hash. `tests/cp20-offline-release.mjs` menyediakan kontrol negatif Node, tetapi penerimaan ini membutuhkan browser dan jaringan aktual.

### Update dan rollback aktual

Dengan pekerjaan pada rilis lama aktif, deploy CP20 plus namespace lama. Pastikan tab lama masih dapat melakukan lazy import yang belum pernah digunakan dan dapat menyimpan/mengekspor. Rekam install → waiting → activate; jangan memanggil `skipWaiting()` untuk mempercepat tes. Setelah jeda dan penyimpanan sah, tutup semua tab situs, buka kembali, dan periksa invalidasi aturan/model serta pemulihan.

Rollback memakai artefak sebelumnya yang persis. Jika tab CP20 masih aktif, paket rollback harus mempertahankan namespace CP20 agar impor lama tetap tersedia. Jangan membersihkan IndexedDB/cache untuk memperoleh hasil tes bersih. Migrasi balik CP20→CP19 tidak dinyatakan didukung: bila belum dibuktikan, unduh hasil CP20, pertahankan sumber, dan catat gerbang migrasi balik tetap terbuka. Simpan URL deployment, waktu peristiwa, hash shell/aset sebelum-sesudah, state worker/klien, dan hasil checkpoint sebagai bukti.

## 5. Kapasitas kaya lebih dari dua juta karakter sampai unduhan

Gunakan `tests/fixtures/cp20-capacity/capacity-1001-en-rich.pdf` dan manifest pendamping `.json`: 1.001 halaman, 2.525.945 karakter generator, 13.013 paragraf ber-ID. Itu korpus sintetis lintas domain dengan template yang berulang; bukan buku alami atau korpus mutu manusia. Ukur jumlah karakter **hasil ekstraksi aktual** secara terpisah dari karakter generator.

Lakukan pada build final dan perangkat yang dicatat: pilih PDF, terjemahkan dengan model nyata, selesaikan, unduh satu MD aktual, buka dengan Marked 17.0.1 + KaTeX 0.19.1, lalu rekonsiliasi. Jalankan juga kelas 300/301/1.000/1.001/1.500 sesuai keputusan penerimaan yang masih terbuka. Fixture 1.500 halaman berbahasa Indonesia ada di `capacity-1500-id.pdf`; kedua arah wajib memiliki bukti.

Kontrol Node model aktual untuk fixture **satu paragraf per halaman**:

```bash
node tests/cp20-capacity-real-inference.mjs capacity-1001-en.pdf capacity-1500-id.pdf
```

Harness ini memakai fake-indexeddb dan menyimpan berkas melalui Node; tidak menghasilkan bukti unduhan browser. Ia mempunyai assertion trace count satu paragraf per halaman. Jangan menjalankannya pada fixture `-rich` lalu menganggap kegagalan assertion sebagai kegagalan produk, atau melemahkan assertion: bila diadaptasi, ambil jumlah/daftar ID yang benar dari manifest fixture dan tetap wajib cocok seluruhnya.

Verifikasi awal cakupan unduhan kaya, dari akar source, setelah mengganti `actual-rich-download.md` dengan nama unduhan aktual:

```bash
python3 - actual-rich-download.md <<'PY'
import hashlib,json,pathlib,re,sys
manifest=json.loads(pathlib.Path('tests/fixtures/cp20-capacity/capacity-1001-en-rich.json').read_text())
raw=pathlib.Path(sys.argv[1]).read_bytes()
text=raw.decode('utf-8').replace('\\_', '_')
expected={bid for p in manifest['pages'] for bid in p['blockIds']}
observed=set(re.findall(r'CP20B\d{4}_\d{2}',text))
pages=[int(x) for x in re.findall(r'<!-- halaman: (\d+) -->',text)]
assert observed==expected, {'missing':sorted(expected-observed),'unexpected':sorted(observed-expected)}
assert pages==list(range(1,manifest['fixture']['pages']+1)), 'halaman hilang, ganda, atau tidak berurutan'
print(json.dumps({'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
 'pages':len(pages),'uniqueTraceIDs':len(observed),'coverageOnly':True},indent=2))
PY
```

Cocoknya ID **belum membuktikan terjemahan tuntas**: sumber yang dipertahankan juga memiliki ID. Cocokkan laporan checkpoint dengan isi MD: translated, preserved dengan alasan sah, rejected, failed, pending, coverageIncompletePages, mathUncertainPages, duplikasi block ID, dan peringatan. `rejected/failed/pending` pada prosa wajib tidak boleh dihapus dari penyebut. Simpan jumlah segmen sumber unik, input model unik, permintaan inferensi, cache hit, dan hasil yang benar-benar menjalani inferensi; request worker bukan jumlah forward pass ONNX.

## 6. Perbaikan semantik dan review manusia

Mulai dari `evidence/cp20/semantics/SEMANTIC_REVIEW.md`, `SEMANTIC_REVIEW_AI.json`, `V4_FRESH_ACCEPTANCE.json`, dan `FROZEN_RULES_AND_RUBRIC.json`. Periksa juga binding build final sebelum mengutip hasil lama. Korpus dan penilaian yang ada buatan AI. `translated` tidak berarti benar secara ilmiah.

Kegagalan yang sudah terlihat harus menjadi tes regresi sebelum perubahan model/strategi. Bandingkan kandidat pada makna, kelengkapan, terminologi, kelancaran, angka/notasi, dan konsistensi; catat ukuran model, hash/asal, lisensi, RAM, waktu cold/warm, dan konsekuensi offline. Jangan hardcode jawaban lengkap contoh atau mengganti model tanpa provenance. Setelah pilihan teknis dibekukan, buat korpus baru kedua arah pada matematika, kimia, statistik, ekonomi, dan prosa akademik panjang. Angka, negasi, kuantor, syarat perlu/cukup, dan sebab-akibat harus diuji secara khusus.

Script yang tersedia untuk reproduksi/regresi:

```bash
node tests/cp20-semantic-guards.mjs
node tests/cp20-semantic-identifiers.mjs
node tests/cp20-semantic-v4-mechanical.mjs
node tests/cp20-semantic-v4-acceptance.mjs
```

Script terakhir memeriksa freeze dan memakai korpus yang kini sudah terlihat. Pada iterasi berikutnya, hasilnya hanya regresi/parity, bukan acceptance buta baru. Jika hash freeze tidak cocok, jangan menghapus penjaga tersebut; arsipkan freeze lama dan buat protokol pembekuan baru yang benar.

Paket review awal: `evidence/cp20/semantics/V4_HUMAN_REVIEW_BILINGUAL.csv`, sumber-target dalam `V4_FRESH_ACCEPTANCE.json`, dan rubrik enam dimensi pada freeze. Siapkan salinan formulir untuk korpus baru setelah perbaikan; jangan menimpa bukti lama. Dua reviewer bilingual/domain mengisi secara independen, dengan identitas dan tanggal nyata; adjudicator menyelesaikan konflik. Rekam ID, arah, domain, source/output hash, keenam skor, critical error, alasan, bagian sumber/target terkait, serta keputusan adjudikasi. Referensi buatan AI bukan gold standard. Persetujuan reviewer tidak dapat mengubah keluaran gagal menjadi benar tanpa perbaikan atau keputusan terbatas yang dinyatakan jelas.

## 7. Rumus, tabel, gambar, dan OCR yang belum dikualifikasi

Regresi pendukung:

```bash
node tests/cp20-math-qualification.mjs
node tests/cp20-math-real-pdf.mjs
node tests/cp20-math-vector-preservation.mjs
node tests/cp20-structure.mjs
node tests/pdf-real-parser.mjs
```

Fixture tersedia: `tests/fixtures/mathematics.pdf`, `table-two-column.pdf`, `scan.pdf`, `mixed-digital-500-scan.pdf`, `rotated.pdf`, `password.pdf`, `corrupt.pdf`, serta `evidence/cp20/math/CP20_MATH_CONTROL.pdf` dan `CP20_VECTOR_ONLY_FIGURES.pdf`. Dukungan akar sederhana dan preservasi figur vektor yang sudah diuji bukan dukungan semua rumus.

Tambahkan fixture independen dan berlisensi untuk akar bersarang/berindeks, cases/sistem, nomor persamaan, formula dalam sel, merged cells/header bertingkat, catatan kaki/caption, dua kolom, dan scan dengan simbol kecil/rotasi. Simpan per kasus: PDF+hash, halaman/bbox, urutan baca yang diharapkan, ID item, LaTeX/sel hasil, citra fallback, status ketidakpastian, rendering hasil, dan penilaian domain. Untuk OCR catat teks sumber yang diperiksa manusia, kesalahan simbol/angka, wilayah tidak terbaca, dan bagaimana status tersebut mencegah label terjemahan tuntas. Citra fallback yang berhasil tersimpan membuktikan penyelamatan sumber; tidak membuktikan rekonstruksi LaTeX atau terjemahan gambar.

## 8. Format penutupan bukti

Untuk setiap gerbang, simpan satu record dengan `gateId`, `status` (PASS/FAIL/NOT_RUN/BLOCKED), `reason`, identitas build/model/input/output, langkah reproduksi, lingkungan, waktu, metrik, observasi, keterbatasan metode, dan path evidence. `BLOCKED` harus menyebut akses/perangkat/orang spesifik yang belum tersedia. `FAIL` harus menyebut observasi yang salah dan pekerjaan teknis berikutnya. `NOT_RUN` berarti belum diuji; jangan memasukkan log persiapan sebagai kelulusan.

Setelah semua gerbang wajib benar-benar lulus pada artefak yang dikemas, perbarui acceptance dan ledger. Sampai itu terjadi, pertahankan status **CHECKPOINT_NOT_PRODUCTION_READY**.

## 9. Tambahan korpus ilmiah asli: batas bukti parser

`tests/fixtures/cp20-authentic/MANIFEST.json` mengidentifikasi *Light and Matter* karya Benjamin Crowell, revisi 7 Mei 2020: PDF asli dengan 1.062 halaman, 85.937.593 byte, SHA256 `43bc4835b63fe4dca599fe14982596b54a261e4d01af9c23a48070ca88bde105`. Situs resmi penulis menautkan edisi ini. Lisensi yang tertulis pada PDF adalah CC BY-SA 3.0 dengan pengecualian foto/gambar pada kredit; metadata arsip menyebut 4.0, sehingga manifest mengikuti teks lisensi pada byte yang diuji. PDF asli disimpan hanya di scratch di luar pohon paket; paket memuat provenance, hash, dan fetcher, bukan seluruh buku.

```bash
python scripts/fetch-cp20-authentic.py --output ../experiments/cp20-authentic
node --max-old-space-size=768 tests/cp20-authentic-parser.mjs ../experiments/cp20-authentic/light-and-matter.pdf
```

`evidence/cp20/qa/authentic-parser/RESULTS.json` memisahkan kelulusan kapasitas parser dari kelengkapan konten. Run sumber asli menyelesaikan 1.062 halaman, 2.159.653 karakter, dan pencatatan 88.633 item digital; bukan inferensi atau penerjemahan penuh. Ada 646 halaman dengan wilayah OCR belum lengkap dan 849 halaman berperingatan. OCR browser tidak tersedia dalam harness Node; kesalahan `self is not defined` tetap tercatat, sehingga kelengkapan isi tidak boleh dinyatakan lulus. Rasio struktur terdeteksi atau dukungan geometri tidak menggantikan penilaian rumus/tabel manusia.

Korpus ini menambah variasi nyata dan layout penerbit asli di atas fixture kapasitas sintetik. Tindak lanjut tetap memerlukan browser dan model aktual, OCR ilmiah, pemulihan tugas, penyimpanan/ekspor, laptop fisik minimum, dan review bilingual/domain. Untuk buku asli tidak ada ID `CP20B...` buatan: gunakan hash PDF, nomor halaman, pemetaan ID blok hasil ekstraksi, dan review ground-truth sampel yang dipilih sebelum run; jangan memakai assertion satu ID per halaman dari harness sintetik. Jangan mengubah gerbang penerjemahan lebih dari dua juta karakter menjadi PASS hanya karena parser asli ini selesai.
