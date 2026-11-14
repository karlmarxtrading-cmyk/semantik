"""Apply explicitly AI-authored per-case review notes. No automated accuracy claim."""
from pathlib import Path
import json,csv,statistics,hashlib
root=Path(__file__).resolve().parents[1]/'evidence/cp20/semantics'
r=json.loads((root/'HOLDOUT_INFERENCE.json').read_text())
# Six ordered dimensions: meaning, completeness, terminology, fluency, numbers/notation, consistency.
notes={
1:([2,2,2,1,2,2],False,'Isi matematika terjaga; sintaks "fungsi menjadi dapat diturunkan" dan "titik akhir" kurang alami.'),
2:([0,2,1,1,2,1],True,'Syarat hypotheses hold berubah menjadi hipotesis masih kuat: pemenuhan syarat tidak setara dengan kekuatan hipotesis.'),
3:([0,1,0,1,2,1],True,'Nonempty finite set berubah menjadi elemen tunggal; ordering menjadi pesanan/pemesanan. Klaim matematika berubah.'),
5:([1,2,1,1,2,1],False,'Recovered dalam eksperimen diterjemahkan ditemukan; konteks penggunaan ulang membantu tetapi istilah perolehan kembali lebih tepat.'),
7:([2,2,1,1,2,2],False,'Relasi ketidakpastian dan larangan menafsirkan interval sebagai seluruh pengamatan terjaga; quantities menjadi jumlah kurang tepat.'),
9:([2,2,2,1,2,2],False,'Rata-rata, median, data tetap disertakan, dan lampiran terjaga. Tata bahasa "Analisis yang digunakan" kurang lancar.'),
10:([2,2,1,1,2,2],False,'Beban pajak dan respons relatif penawaran-permintaan terjaga; responsi/pasokan kurang baku secara ekonomi.'),
11:([2,2,2,1,2,2],False,'Perbedaan perubahan permintaan dan pergerakan kuantitas serta risiko membalik penjelasan terjaga.'),
12:([0,2,0,1,2,1],True,'Account balance berubah menjadi keseimbangan pada akun, kehilangan makna saldo keuangan.'),
13:([1,2,0,1,2,1],True,'Interview schedule sebagai instrumen/pedoman pertanyaan menjadi jadwal waktu; does not certify menjadi tidak menyatakan, lebih lemah.'),
14:([2,2,2,2,2,2],False,'Akses peralatan, kebutuhan bukti tambahan untuk generalisasi, dan urutan pembahasan dipertahankan.'),
16:([1,2,1,1,2,1],True,'Di seluruh interval menjadi at all intervals, mengubah cakupan pada satu interval menjadi semua interval.'),
17:([1,2,1,1,2,1],True,'Perubahan di seluruh interval menjadi at all intervals; cakupan interval berubah walaupun syarat hipotesis sudah terjaga.'),
19:([0,2,0,1,2,1],True,'Melarutkan gula menjadi Solving sugar, istilah proses kimia salah.'),
20:([1,2,1,1,2,2],False,'Klaim bahan tidak hilang belum dibuktikan dan kebutuhan pembandingan massa tetap ada; Returning alone kurang jelas untuk recovery.'),
21:([2,2,2,1,2,2],False,'6 mmol, 2 L awal, penambahan 2 L, penurunan konsentrasi, jumlah garam, dan syarat tidak tumpah terjaga; grammar lemah.'),
22:([1,2,1,1,2,1],False,'Sample fetching procedure kurang tepat untuk sampling procedure; larangan menyamakan interval dengan semua pengamatan tetap ada.'),
23:([0,1,0,1,1,1],True,'Penyebut menjadi mention. A treatment juga ambigu antara label kelompok A dan artikel bahasa Inggris; angka 7/11 tetap ada.'),
24:([2,2,2,1,2,2],False,'Hubungan ekstrem-rata-rata, alasan median, data tidak dihapus, serta lampiran terjaga; bentuk Analyze dan frasa appendix articles kurang lancar.'),
25:([0,1,0,1,2,1],True,'Beban ekonomi menjadi cost of the economy; kepekaan relatif menjadi relativeity, penawaran menjadi offer. Penjelasan insidensi pajak rusak.'),
27:([2,2,2,1,2,2],False,'Tabungan nominal, harga, daya beli dan saldo dibedakan dengan benar; beberapa preposisi hilang.'),
28:([2,2,1,1,2,2],False,'Pedoman wawancara dalam lampiran serta tidak menjamin pemahaman seragam terjaga; responder kurang tepat dibanding respondent.'),
29:([2,1,2,1,2,1],False,'Generalisasi dan akses terjaga. Sukarelawan jamak ke person tunggal serta penulis ke author mempersempit bentuk tanpa perubahan pokok klaim.'),
}
dimensions=['meaning','completeness','terminology','fluency','numbersNotation','consistency']
review=[]
for row in r['rows']:
 n=int(row['id'].split('-')[-1]);a={'id':row['id'],'domain':row['domain'],'direction':row['direction'],'source':row['source'],'target':row['text'],'outcome':row['outcome'],'reviewerType':'AI-author review; root AI independently inspected cited critical cases; NOT human review','humanReview':'PENDING'}
 if row['outcome']!='translated':
  a.update({'scores':{d:None for d in dimensions},'criticalTranslatedError':False,'completeTranslation':False,'reviewNote':'Tidak ada terjemahan diterima; sumber dipertahankan. Tidak dinilai sebagai terjemahan benar. '+row.get('diagnostics',[{}])[0].get('message','')})
 else:
  scores,critical,note=notes[n];a.update({'scores':dict(zip(dimensions,scores)),'criticalTranslatedError':critical,'completeTranslation':True,'reviewNote':note})
 review.append(a)
summary={'status':'FAIL','build':json.loads((root/'FINAL_DIST_SEMANTIC_BINDING.json').read_text())['build'],'humanApprovals':0,'meaningReview':'AI assessment with separate dimensions; not independent human adjudication and not a population accuracy score.','acceptedTargets':sum(x['outcome']=='translated' for x in review),'incompleteTargets':sum(not x['completeTranslation'] for x in review),'observedCriticalTranslatedErrors':sum(x['criticalTranslatedError'] for x in review),'timing':{d:{'cases':len(a:=[x for x in r['rows'] if x['direction']==d]),'meanChars':round(statistics.mean(len(x['source']) for x in a),1),'medianMs':statistics.median(x['ms'] for x in a),'meanMs':round(statistics.mean(x['ms'] for x in a),1)} for d in ['en-id','id-en']},'inferenceMetricsBoundary':'metrics.inferenceCalls counts worker translation requests including failed requests, not ONNX forward passes. Input/output tokens count raw successful responses; cacheHits counts adapter within-block result reuse. No cross-block translation cache used by this run.','rootIndependentAIConfirmed':['CP20-H-002','CP20-H-003','CP20-H-019','CP20-H-023','CP20-H-025'],'rows':review}
(root/'SEMANTIC_REVIEW_AI.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False))
with (root/'HUMAN_REVIEW_BILINGUAL.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['id','domain','direction','source','target','reference_ai_authored','machine_outcome',*dimensions,'critical_error','reviewer_name','reviewer_type','decision','notes'])
 for row in r['rows']:w.writerow([row['id'],row['domain'],row['direction'],row['source'],row['text'],row['reference'],row['outcome'],*(['']*11)])
lines=['# CP20 — Penilaian mutu semantik dua arah','', '**Status: FAIL.** Temuan ini adalah keterbatasan teknis mesin/guard, bukan hanya ketiadaan persetujuan manusia.','',f"Korpus historis v2 berisi {len(review)} teks baru setelah pembekuan aturan v2, meliputi matematika, kimia, statistik, ekonomi, dan prosa akademik. {summary['acceptedTargets']} hasil berstatus mesin translated; {summary['incompleteTargets']} hasil tidak tuntas dan mempertahankan sumber. Penelaahan AI menandai {summary['observedCriticalTranslatedErrors']} hasil terjemahan dengan perubahan kritis. Angka ini bukan akurasi populasi.",'','Penulis korpus dan penilai ini adalah AI. Penilaian AI kedua oleh agen utama mengonfirmasi sedikitnya lima contoh kritis yang disebut dalam JSON. Persetujuan manusia: **0**. Nilai per dimensi 0–2 mengikuti rubrik yang dibekukan sebelumnya; hasil tanpa terjemahan diberi nilai kosong, bukan angka kelulusan.','','| ID | Arah | Status mesin | Kesalahan kritis | Catatan |','|---|---|---|---|---|']
for x in review:lines.append(f"| {x['id']} | {x['direction']} | {x['outcome']} | {'YA' if x['criticalTranslatedError'] else 'Tidak dinilai—sumber' if not x['completeTranslation'] else 'Tidak ditemukan dalam penilaian AI ini'} | {x['reviewNote'].replace('|','/')} |")
lines+=['','## Batas evaluasi','','Korpus pertama 40 kasus dinyatakan gagal, disimpan utuh dalam `first-holdout-failed/`, dan secara eksplisit dipromosikan menjadi regresi pengembangan untuk perbaikan konsep. Ia tidak digunakan sebagai korpus independen final. Korpus v2 berisi 30 teks berbeda. Setelah pembekuan v2, metadata pemulihan guard serta perlindungan atom identifier diperbaiki karena cacat integrasi. Pada v4, negasi unsupported/tidak didukung dan predikat barisan terpisah diperbaiki secara mekanis. Korpus baru sepuluh kasus v4 dinilai terpisah dalam V4_SEMANTIC_REVIEW.md. Korpus lama yang sama dijalankan ulang untuk pembandingan target dan ikatan build final; tidak disebut korpus baru yang belum terlihat. Bukti perubahan metadata terdapat di `RECOVERY_METADATA_PARITY.json`, uji identifier nyata di `IDENTIFIER_INFERENCE.json`, dan pembandingan final di `FINAL_DIST_SEMANTIC_BINDING.json`.','', 'Peringatan guard juga mempunyai false positive pada none/tidak ada, incomplete/tidak lengkap, nonempty/tidak kosong, dan unchanging/tidak berubah. Penolakan mempertahankan sumber, tetapi menghalangi ketuntasan terjemahan. Ini tetap pekerjaan teknis terbuka.','', 'Bobot ONNX tidak diganti. Perbaikan berupa konteks istilah dan validasi hubungan konsep; keduanya tidak mengatasi seluruh keterbatasan penerjemahan bebas, tata bahasa, konteks antarkalimat, atau penalaran ilmiah. Model/strategi yang lebih baik perlu dibuktikan pada korpus baru dan tidak dapat digantikan dengan klaim kelulusan guard.','','## Review manusia','','`HUMAN_REVIEW_BILINGUAL.csv` berisi sumber, hasil, referensi buatan AI, dan kolom reviewer kosong. Diperlukan reviewer bilingual/domain yang nyata; belum ada persetujuan/adjudikasi yang diklaim. Review manusia tidak dengan sendirinya memperbaiki kegagalan teknis yang sudah terbukti.']
(root/'SEMANTIC_REVIEW.md').write_text('\n'.join(lines)+'\n')
print({k:v for k,v in summary.items() if k not in ['rows','timing']})
