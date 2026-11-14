"""Attach current reproducible evidence; no automatic browser/human PASS promotion."""
from pathlib import Path
import json,csv,hashlib,datetime,collections
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'evidence/acceptance'
p=BASE/'FINDING_CLOSURE_LEDGER_CP18.json'
d=json.loads(p.read_text());by={x['id']:x for x in d['findings']}
def evidence(path,scope):
 f=ROOT/path
 assert f.exists(),path
 return {'path':path,'scope':scope,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
def add(rid,files):
 target=by[rid];old={x['path']:x for x in target.get('tests',[])}
 for f,scope in files:old[f]=evidence(f,scope)
 target['tests']=list(old.values())
semantic=[('evidence/acceptance/REAL_JOURNAL_REVISED_INFERENCE.json','ACTUAL_LOCAL_MODEL_NODE_WASM'),('evidence/acceptance/G7_REAL_JOURNAL_COMPARISON_AI_NOT_HUMAN.json','AI_SCREENING_NOT_HUMAN_APPROVAL')]
for rid in ['TR-04','OUT-02','OUT-04','OUT-08']:add(rid,semantic)
by['TR-04'].update(status='IN_PROGRESS',afterResult='Fresh frozen real-journal evaluation160:147 translated,13 explicit safe rejections; AI screening identifies22 critical cases,15 without automatic warnings. Human approvals0. G7 fails observed scientific quality and remains unreviewed by humans.',closureLimit='Node/WASM inference is not PDF/browser export acceptance. All160 retained; source extraction defects separately marked. Two independent human reviewers and adjudicator pending; no accuracy percentage certified.')
by['OUT-04'].update(status='IN_PROGRESS',afterResult='Known opaque identifiers fixed in development controls. Fresh held-out scientific output still changes definition label (iii) to (ii) and function G(A) to G wayA); general structural identity gap remains.',closureLimit='See JOURNAL-06-S12/S13. Further generalized changes require preserving first evaluation and marking corpus development-exposed; fresh independent evaluation needed.')
by['OUT-02']['closureLimit']='Known set/union/solution development cases repaired; fresh journal corpus still has incorrect scientific terms. See TR-04 and exact G7 rows; no general scientific quality claim.'
final=ROOT/'evidence/acceptance/FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json'
if final.exists():
 add('TR-04',[(str(final.relative_to(ROOT)),'ACTUAL_CURRENT_MODEL_AND_AI_SCREENING_NOT_HUMAN')])
 by['TR-04'].update(afterResult='First frozen160 evaluation preserved (147 translated,13 safe rejections,22 AI-critical findings). After generalized structural fixes, actual current-source20 exposed negative probes still show19 AI-critical meaning defects and1 major term defect;12 critical cases have no automatic warning. Human approvals0. G7 FAIL on current source.',closureLimit='First32 and160 corpora are now development-exposed. The latest20 are negative probes, not a fresh holdout or certified accuracy estimate. PDF/browser exports and two independent human reviewers plus adjudicator remain distinct acceptance evidence.')
 add('OUT-04',[('evidence/translation/journal-identities-model.json','ACTUAL_LOCAL_MODEL_SPECIFIC_STRUCTURAL_INVARIANTS')])
 by['OUT-04'].update(status='FIXED_UNVERIFIED',afterResult='Original opaque IDs and newly found Roman labels/balanced function notation fixed by generalized span rules. Ten current-source actual-model controls preserve required identities, including (iii)/(iv), G(A), and scoped Nanger granti. Whole-sentence scientific quality remains failed under TR-04.',closureLimit='Specific structural invariants verified locally; final-browser artifact integration remains separate. Arbitrary named-entity/scientific meaning accuracy is not guaranteed by these guards.')

replay=ROOT/'evidence/acceptance/JOURNAL_REPLAY_HTML_VALIDATION.json'
if replay.exists():
 for rid in ['OUT-06','OUT-07','OUT-08']:
  add(rid,[('evidence/acceptance/JOURNAL_REPLAY_EXPORT_REPORT.json','FRESH_PRODUCTION_SERIALIZER_REPLAY_OF_ACTUAL_MODEL_OUTPUTS'),('evidence/acceptance/JOURNAL_REPLAY_HTML_VALIDATION.json','ACTUAL_MARKDOWN_HTML_RENDER_AND_ZIP_INTEGRITY')])
 add('OUT-07',[('evidence/acceptance/JOURNAL_REPLAY_HTML_BEFORE_MARKDOWN_FIX.json','ACTUAL_BEFORE_FAILURE'),('evidence/lifecycle/markdown-visible-regression.json','INDEPENDENT_SERIALIZER_REGRESSIONS')])
 by['OUT-07']['afterResult']='Fresh actual-output replay found six visible-text failures on literal hyphen/ordered labels. Generalized escaping fixed them without changing expectations;640 visible-text checks now PASS,160 exact source/target provenance pairs and8ZIP CRC/internal SHA256 PASS. Eighteen independent Markdown rendering regressions also pass.'
 by['OUT-07']['closureLimit']='Replay serializes actual first160 outputs and authentic PDFs through current export module; it is not fresh PDF extraction/inference or browser E2E. Source/target scientific defects are retained visibly rather than corrected by serializer.'
for rid in ['LIFE-01','LIFE-02','OUT-07','OUT-08']:
 f=ROOT/'evidence/lifecycle/table-edit-integration-after.json'
 if f.exists():add(rid,[(str(f.relative_to(ROOT)),'ACTUAL_MAIN_STORAGE_EXPORT_LOCAL_INTEGRATION')])

for rid in ['LIFE-03','LIFE-07','OPT-01']:
 add(rid,[('evidence/cache/regression.tap','LOCAL_CACHE_AND_SW_HARNESS')])
 by[rid]['status']='FIXED_UNVERIFIED'
by['LIFE-03'].update(changedFiles=['sw.js','scripts/sw-template.js','app/offline.js','scripts/build.py'],afterResult='Version namespaces and digest checks tested in local SW/cache harness. Root observed preview index.html byte injection: SW installation correctly refuses mismatched shell.',closureLimit='Final byte-preserving origin update/offline browser acceptance remains blocked by preview HTML transformation; local harness is not deployment proof.')
by['LIFE-07'].update(changedFiles=['assets/engine.worker-4c3dcfee.js','scripts/engine-cache-fragment.js'],afterResult='Cache denial/quota permits temporary in-memory session fallback in local harness; preliminary real Chrome prepares both directions with persistent cache.',closureLimit='Native browser quota-exhaustion behavior and final browser evidence required; VM denial is explicitly simulated.')
add('OPT-01',[('evidence/cache/dedup.json','ACTUAL_BYTE_DEDUPLICATION')])
by['OPT-01'].update(changedFiles=['runtime/','vendor/','scripts/build.py'],afterResult='Duplicate byte-identical WASM removed and runtime linkage recorded; preliminary browser engine preparation works.',closureLimit='Final build/runtime evidence and final package hashes pending.')
dep=ROOT/'evidence/dependency-audit.json'
if not dep.exists():dep=ROOT/'evidence/cache/dependency-audit.json'
if dep.exists():
 add('DEP-01',[(str(dep.relative_to(ROOT)),'DEPENDENCY_PIN_AND_AUDIT')])
 by['DEP-01'].update(status='FIXED_UNVERIFIED',changedFiles=['vendor/pdfjs/','tools/package-lock.json'],afterResult='PDF.js updated to6.2.108 with parser and worker matched; production reader test evidence uses this version.',closureLimit='Final served MIME/headers and hosting behavior not established by dependency audit alone.')
for f in ['evidence/provenance/RECOVERY_PROVENANCE.json','evidence/provenance/CP16_TO_CP17_WORKER_REPRODUCTION.json','evidence/provenance/MODEL_PARITY_LINKAGE.json']:
 add('OPS-01',[(f,'ACTUAL_ARCHIVE_PROVENANCE_AND_HASH_LINKAGE')])
by['OPS-01'].update(status='FIXED_UNVERIFIED',afterResult='Recovered99 canonical provenance files from verified CP16 nested chain;30 actual CP17 model files match CP16 bytes; replayed CSP worker patch is exact;16 conversion-output manifests linked. Historical parity4 inputs/direction retained as historical.',closureLimit='Original NPZ weights absent; no fresh weight conversion or historical Vite build claimed. Current static build and hosting final evidence remain separate.')
for rid in ['LIFE-01','LIFE-02','LIFE-04','LIFE-05','LIFE-06','TR-03','OUT-05','OUT-06','OUT-07','OUT-08']:
 for t in by[rid].get('tests',[]):
  f=ROOT/t['path']
  if f.exists():t['sha256']=hashlib.sha256(f.read_bytes()).hexdigest()
d['updatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
d['scientificGate']='FAIL_OBSERVED_CRITICAL_ERRORS_AND_HUMAN_REVIEW_PENDING'
d['statusCounts']=dict(collections.Counter(x['status']for x in d['findings']))
p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
with (BASE/'FINDING_CLOSURE_LEDGER_CP18.csv').open('w',newline='',encoding='utf-8-sig')as f:
 keys=['id','category','priority','title','status','gates','changedFiles','afterResult','closureLimit','tests']
 w=csv.DictWriter(f,fieldnames=keys);w.writeheader();w.writerows({k:json.dumps(x.get(k),ensure_ascii=False)if isinstance(x.get(k),(list,dict))else x.get(k)for k in keys}for x in d['findings'])
print(json.dumps(d['statusCounts']))
