"""Record explicit AI-only dimension assessment of frozen v4 new acceptance."""
from pathlib import Path
import json,csv,hashlib
root=Path(__file__).resolve().parents[1]/'evidence/cp20/semantics'
r=json.loads((root/'V4_FRESH_ACCEPTANCE.json').read_text());binding=json.loads((root/'V4_FINAL_DIST_SEMANTIC_BINDING.json').read_text())
notes={
1:([2,2,2,1,2,2],False,'Relasi dapat diturunkan/kontinu, syarat konvers, dan pembatas bukti grafik dipertahankan; sintaks kurang alami.'),
2:([1,2,1,1,2,1],False,'Pemanasan menjadi pemanas dan boiled menjadi direbus kurang tepat; urutan berhenti sebelum mendidih dan penjelasan kausal kontribusi pemanas tetap dapat dipahami.'),
3:([0,2,0,1,2,1],True,'Population mean menjadi populasi berarti, sehingga besaran rata-rata populasi hilang. Negasi kesimpulan tentang pencatatan keliru masih ada.'),
5:([2,2,2,1,2,2],False,'Instrumentasi laboratorium, urutan kalibrasi, pengurangan galat, serta batas pembuktian penjelasan terjaga; sintaks pengukuran kesalahan kurang alami.'),
6:([2,2,2,1,2,2],False,'Relasi matematika terjaga; susunan Function differentiable dan not by itself evidence tidak alami.'),
7:([1,2,1,1,2,1],False,'Pemanasan diterjemahkan warming, pemanas menjadi heating, dan tense lemah; kontribusi energi pemanas, urutan mendidih, serta larangan atribusi hanya ke katalis tetap ada.'),
8:([0,1,0,1,2,1],True,'Population mean menjadi average population yang ambigu, sampling procedure menjadi fetching procedure. Kalimat kedua berubah menjadi tautologi misrecorded observation is being recorded, merusak klaim tentang bukti pencatatan keliru.'),
9:([0,0,1,1,2,1],True,'Harga barang substitusi hilang: When substitution goods go up menyatakan barang naik, bukan harganya. Hubungan substitusi vs komplemen masih ada.'),
10:([0,2,0,1,2,0],True,'Kalibrasi pada klaim pengurangan kesalahan menjadi kata tidak bermakna Calicacy; istilah calibration benar pada kalimat berikutnya sehingga identitas operasi ilmiah tidak konsisten.')}
dims=['meaning','completeness','terminology','fluency','numbersNotation','consistency'];rows=[]
for x in r['rows']:
 n=int(x['id'].split('-')[-1]);row={'id':x['id'],'domain':x['domain'],'direction':x['direction'],'source':x['source'],'target':x['text'],'referenceAI':x['reference'],'outcome':x['outcome'],'humanReview':'PENDING','reviewerType':'AI author/reviewer; not independent human adjudication'}
 if x['outcome']!='translated':row.update(scores={d:None for d in dims},criticalTranslatedError=False,completeTranslation=False,reviewNote='Tidak ada target diterima; sumber dipertahankan setelah guard menolak. Ini kegagalan ketuntasan, bukan terjemahan yang benar.')
 else:
  scores,critical,note=notes[n];row.update(scores=dict(zip(dims,scores)),criticalTranslatedError=critical,completeTranslation=True,reviewNote=note)
 rows.append(row)
summary={'status':'FAIL','build':binding['build'],'bindingStatus':binding['status'],'ruleset':r['freeze']['ruleset'],'corpusOrigin':'Ten newly authored paragraphs after v4 mechanical rule freeze; five domains in both directions; no rules were tuned on these results. Final dist rerun is parity, not another blind set.','humanApprovals':0,'reviewType':'AI-only dimension assessment; author is reviewer; no population accuracy claimed','machineTranslated':sum(x['outcome']=='translated' for x in rows),'incompleteTargets':sum(not x['completeTranslation'] for x in rows),'observedCriticalTranslatedErrors':sum(x['criticalTranslatedError'] for x in rows),'rubric':r['freeze']['rubric'],'corpusSHA256':hashlib.sha256(json.dumps([{'id':x['id'],'source':x['source'],'reference':x['reference']} for x in r['rows']],sort_keys=True,ensure_ascii=False).encode()).hexdigest(),'rows':rows}
(root/'V4_SEMANTIC_REVIEW_AI.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False))
with (root/'V4_HUMAN_REVIEW_BILINGUAL.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['id','domain','direction','source','target','reference_ai_authored','machine_outcome',*dims,'critical_error','reviewer_name','reviewer_type','decision','notes'])
 for x in r['rows']:w.writerow([x['id'],x['domain'],x['direction'],x['source'],x['text'],x['reference'],x['outcome'],*(['']*11)])
lines=['# CP20 v4 — acceptance semantik baru','',f"**FAIL** pada build `{binding['build']['release']}`. Sepuluh paragraf baru setelah pembekuan v4 mencakup lima domain dan kedua arah. Sembilan menghasilkan target, satu mempertahankan sumber karena ditolak. Review AI menemukan empat target dengan perubahan kritis. Ini kegagalan teknis yang sudah terlihat; ketiadaan reviewer manusia bukan satu-satunya alasan gagal.",'','Rubrik enam dimensi dibekukan sebelum korpus ini. Penulis korpus dan reviewer adalah AI; persetujuan manusia **0**. Angka sampel ini bukan estimasi akurasi populasi. Model/rules tidak disesuaikan dari hasil korpus ini. Eksekusi ulang final-dist hanya membuktikan ikatan build dan kesamaan hasil.','','| ID | Arah | Mesin | Kritis pada target | Catatan |','|---|---|---|---|---|']
for x in rows:lines.append(f"| {x['id']} | {x['direction']} | {x['outcome']} | {'YA' if x['criticalTranslatedError'] else 'Tidak ada target' if not x['completeTranslation'] else 'Tidak ditemukan oleh review AI ini'} | {x['reviewNote']} |")
lines+=['','`V4_FINAL_DIST_SEMANTIC_BINDING.json` membuktikan semua 10 target/status/retry/metrik sama persis dengan run source v4 dan hash modul cocok dengan manifest final. PASS pada binding bukan PASS semantik. Korpus lama 30 kasus tetap disimpan sebagai sejarah/regresi parity, dengan sembilan kesalahan kritis dan tujuh penolakan.','', '`V4_HUMAN_REVIEW_BILINGUAL.csv` berisi sumber/target/referensi AI dan kolom penilaian manusia kosong. Semua enam dimensi dinilai terpisah dalam JSON; target yang tidak dihasilkan diberi nilai kosong. Tidak ada adjudikasi manusia yang diklaim.']
(root/'V4_SEMANTIC_REVIEW.md').write_text('\n'.join(lines)+'\n');print({k:summary[k] for k in ['status','bindingStatus','humanApprovals','machineTranslated','incompleteTargets','observedCriticalTranslatedErrors']})
