"""Finalize the closure ledger after browser evidence has been saved."""
from pathlib import Path
import json
r=Path(__file__).resolve().parent.parent
read=lambda p:json.loads((r/p).read_text())
d=read('AUDIT_CLOSURE_CP20.json');build=read('evidence/build/BUILD_MANIFEST.json')['build']
downloads=read('evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json')
full1001=[x for x in downloads['outputs'] if x['pages']==1001]
full1500=[x for x in downloads['outputs'] if x['pages']==1500]
assert full1001 and full1500, 'Save actual browser downloads and reconciliation first'
d['documentStatus']='FINAL_CHECKPOINT_NOT_PRODUCTION_READY';d['build']=build
d.pop('candidateBuildAtDraft',None);d['pendingFinalization']=[]
d['browserLongResults']={'1001':full1001,'1500':full1500,'semanticApproval':False}
d.pop('browserLongPending',None)
for old,new in [('releaseVerificationAtDraft','releaseVerification'),('regressionVerificationAtDraft','regressionVerification'),('semanticAcceptanceAtDraft','semanticAcceptance')]:
 if old in d:d[new]=d.pop(old)
by={x['id']:x for x in d['findings']}
by['AUD-01'].update(status='PASS',closure='CLOSED_FOR_DEMONSTRATED_CAPACITY_SCOPE',implementation='IMPLEMENTED_AND_VERIFIED_FOR_RECORDED_FIXTURES',remaining='Broad book/scan/layout/device qualification and scientific meaning remain open in other gates. Synthetic long fixtures repeat ten conceptual templates; no universal 1500-page promise. 1001 inference occurred on1668, final8c restored/exported it with explicit component/output-parity binding; 1500 consumer inference/export occurred on8c. Rejected blocks remain visibly partial.')
by['AUD-01']['tests'] += ['Actual browser1001 and1500 PDF→local inference→single downloaded Markdown, complete page/block IDs; semantic completion evaluated separately']
by['AUD-01']['evidence'] += ['evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json','evidence/cp20/browser/final-1668/BROWSER_1001_COMPLETE.json','evidence/cp20/qa/LONG_1668_FINAL_COMPONENT_BINDING.json']
by['AUD-02']['remaining']='Fresh v4 ten cases:9translated,1rejected,4critical targets by AI review; zero human approvals. Technical semantic failure remains. Larger M2M100 experiment did not demonstrate a replacement advantage; pipeline differences and limitations are documented.'
by['AUD-02']['evidence'] += ['evidence/cp20/semantics/FINAL_COMPONENT_PARITY_BINDING.json','evidence/cp20/semantics/alternatives/ALTERNATIVE_MODEL_ASSESSMENT.md']
by['AUD-04']['evidence'] += ['evidence/cp20/qa/authentic-parser/SUMMARY.json','evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json']
by['AUD-04']['status']='FAIL'
by['AUD-04']['evidence'] += ['evidence/cp20/browser/final-8c643/AUTHENTIC_BOOK_PREFLIGHT.json']
by['AUD-04']['remaining']='Actual browser could not persist85.9MB authentic source: QuotaExceededError; translation correctly blocked until source saved. No universal cap inferred. Authentic1062-page85.9MB source traversal exceeds2Mchars and processes56.8MBassets with one active page. Browser persistent storage and full translated export of that richly illustrated book remain unqualified;646pages have incomplete content flags in Node. No whole-browser RAM/device qualification.'
by['AUD-08']['evidence'] += ['evidence/cp20/qa/authentic-parser/SUMMARY.json','evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json','evidence/cp20/qa/QA_SUMMARY.json']
by['AUD-12']['tests'] += ['Final8c actual keyboard pause/resume, tab-close/reopen, paused BFCache return, and1500-page processing; browser zoom shortcut did not change viewport, so zoom is NOT_RUN']
by['AUD-12']['evidence'] += ['evidence/cp20/browser/final-8c643/LIFECYCLE_OBSERVATIONS.json','evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json']
by['AUD-12']['remaining']='Initial390px layout and14px help passed; actual controls/long lifecycle evidence exists. Physical small-device, complete accessibility/usability, zoom and sleep/wake/process-kill qualification remain open.'
extra={x['id']:x for x in d['additionalFindings']}
extra['CP20-N06']['status']='PASS'
extra['CP20-N06']['evidence'] += ['evidence/cp20/browser/final-1668/BROWSER_1001_COMPLETE.json','evidence/cp20/browser/final-1668/LIFECYCLE_OBSERVATIONS.json']
extra['CP20-N06']['remaining']='Observed automatic recovery at page252 removed5 public-model entries, retried once and continued to1001. This does not guarantee sufficient storage for every input/device; honest failure and rescue remain required.'
for id in ['CP20-N12','CP20-N13']:
 extra[id]['evidence'] += ['evidence/cp20/browser/final-8c643/LIFECYCLE_OBSERVATIONS.json']
if 'CP20-N14' not in extra:
 d['additionalFindings'].append({'id':'CP20-N14','priority':'P2','finding':'Already-English short metadata is rejected during ID→EN document processing','status':'FAIL','implementation':'OBSERVED_NOT_PATCHED_TO_FIXTURE','cause':'Short mixed-language trace footer falls back to document source language; unchanged target is then rejected by the language guard.','files':['app/app/long-document.js','app/app/translation.js'],'changes':'No fixture-specific output or END-word exception inserted. Original text and clear rejected/partial markers remain.','tests':['Actual Node and browser1500-ID synthetic document with distinct opaque IDs and English footer labels'],'evidence':['evidence/cp20/qa/real-inference-final-1668/capacity-1500-id-RESULTS.json','evidence/cp20/browser/DOWNLOAD_RECONCILIATION.json'],'remaining':'Develop and independently evaluate generic mixed-language/metadata handling. Do not count these rejected blocks as successful translations or conflate them with the separate scientific prose errors.'})
if 'CP20-N15' not in extra:
 d['additionalFindings'].append({'id':'CP20-N15','priority':'P1','finding':'Authentic85.9MB PDF cannot be persisted in this cloud browser','status':'FAIL','implementation':'OBSERVED_WITH_SAFE_REFUSAL','cause':'Actual IndexedDB source write raises QuotaExceededError; exact remaining storage/per-device ceiling not established.','files':['app/app/main.js','app/app/storage.js','app/app/long-document.js'],'changes':'Existing failure state retains unsaved indication and blocks long processing until source checkpoint is safe. No bypass or false success added.','tests':['Actual filechooser recognized1062pages; source persistence failed; Translate refused unsafe continuation.'],'evidence':['evidence/cp20/browser/final-8c643/AUTHENTIC_BOOK_PREFLIGHT.json'],'remaining':'Qualify sufficient persistent quota on target devices and richer books. Safe failure is verified but capacity success for this book is not; do not imply a universal64MB/85MB cap.'})
d['globalOpenGates']=['Scientific semantic quality: FAIL','Authentic85.9MB source persistence in current browser: FAIL; safe refusal observed','Broad authentic book translation, complex OCR/math/table/content coverage: NOT_RUN or incomplete','Physical minimum-device RAM/performance, sleep/wake/process kill and zoom: NOT_RUN','Actual byte-exact hosting/offline/update/rollback: BLOCKED','Human review:0 approvals; does not cure technical failures']
for row in d['findings']+d['additionalFindings']:
 for p in row.get('evidence',[]):assert (r/p).exists(), (row['id'],p)
(r/'AUDIT_CLOSURE_CP20.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
lines=['# Ledger penutupan CP20','',f"Build `{build['release']}`. **CHECKPOINT_NOT_PRODUCTION_READY.**",'',
'PASS menutup cacat dalam lingkup bukti yang dinyatakan; tidak berarti seluruh produk lulus. FAIL adalah kegagalan yang teramati. NOT_RUN berarti kualifikasi belum lengkap; BLOCKED membutuhkan lingkungan/akses yang belum tersedia.','',
'| ID | Temuan | Status |','|---|---|---|']
for row in d['findings']+d['additionalFindings']:lines.append(f"| {row['id']} | {row['finding']} | **{row['status']}** |")
for row in d['findings']+d['additionalFindings']:
 lines+=['',f"## {row['id']} — {row['finding']}",'',f"**{row['status']}** · {row.get('implementation','Lingkup tertera pada bukti')}",'']
 for key,label in [('cause','Penyebab'),('changes','Perubahan'),('remaining','Batas atau pekerjaan tersisa')]:
  if row.get(key):lines += [f"**{label}:** {row[key]}",'']
 for key,label in [('files','Berkas'),('tests','Pengujian'),('evidence','Bukti')]:
  if row.get(key):lines += [f"**{label}:**",'']+[f"- {x}" for x in row[key]]+['']
lines += ['## Gerbang yang tetap terbuka','']+['- '+x for x in d['globalOpenGates']]+['','Angka translated bukan skor akurasi. Run Node, kontrol/doubles, browser dan perangkat fisik dibedakan. Riwayat build dan binding komponen tidak disebut sebagai inferensi ulang.','']
(r/'AUDIT_CLOSURE_CP20.md').write_text('\n'.join(lines))
print(json.dumps({'build':build['release'],'audits':len(d['findings']),'additional':len(d['additionalFindings']),'productionReady':False}))
