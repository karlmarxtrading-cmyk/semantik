from pathlib import Path
import json,hashlib,collections,csv,datetime
r=Path(__file__).resolve().parent.parent;sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda p:json.loads((r/p).read_text())
build=read('evidence/build/BUILD_MANIFEST.json')['build'];ledger=read('evidence/acceptance/FINDING_CLOSURE_LEDGER_CP18.json')
verified={'LIFE-01','LIFE-02','PDF-01','PDF-02','TR-01','TR-02','TR-03','TR-05','OUT-01','OUT-02','OUT-03','OUT-04','OUT-05','OUT-06','OUT-07'}
limits={
'LIFE-03':'Release-pinned byte validation passes controlled V1/V2 tests. Actual install/offline/update/rollback is not proven because preview modifies HTML.',
'LIFE-04':'Two-tab lock and stale-write guards tested. A real BFCache-eligible navigation across competing jobs remains unverified.',
'LIFE-05':'Actual ZIP cancellation is regression-tested with controlled abort. Consumer large-export cancellation and process memory release have no complete browser measurement.',
'LIFE-06':'Cleanup passes exact-main/DOM lifecycle regression. Final browser document-removal and canvas inspection not independently recorded.',
'LIFE-07':'Cache denial/quota fallback tested with fault injection; persistent cache works in Chrome. Native quota exhaustion/end-to-end offline recovery remain unverified.',
'PDF-03':'Indexed cancellable worker and dense fixture tests pass. Declared minimum physical hardware and total decoder heap bounds are not verified.',
'TR-04':'Final-module actual inference still has critical scientific meaning defects. Human scientific approvals are absent; no model replacement qualified.',
'DEP-01':'PDF.js6.2.108 library/worker/assets match and PDF fixtures pass. Actual deployment CSP enforcement remains unverified.',
'OPS-01':'Fresh static assembly is byte reproducible; recovered model recipes and historical parity are linked. Original NPZ source/full historical compiler rebuild and external CI deployment not rerun.',
'OPT-01':'Duplicate WASM removed, both model directions run in final Chrome. Full offline preparation is blocked by preview HTML mismatch.',
'OUT-08':'All findings, exports and negative evidence are linked. Original historical worksheet PDF is absent and broad scientific/hosting/device gates remain open.'}
newrefs=['evidence/browser/CP18_BROWSER_EVIDENCE.json','evidence/browser/BROWSER_E2E_CP18.json','evidence/browser/FRESH_EXPORT_VERIFICATION.json','evidence/final-regression/RESULTS.json']
for row in ledger['findings']:
 row['technicalFixStatus']='PARTIAL_QUALITY_FAILURE' if row['id']=='TR-04' else 'IMPLEMENTED_AND_TESTED'
 row['status']='VERIFIED' if row['id'] in verified else 'FAIL' if row['id']=='TR-04' else 'FIXED_UNVERIFIED'
 row['verificationScope']='Exact source tests plus actual browser where linked; no universal semantic, physical-device or hosting approval inferred.'
 row['closureLimit']=limits.get(row['id'],'Known audit defect is verified on labeled fixtures and applicable actual code/browser evidence. Scientific quality and full release gates remain separate; historical user worksheet PDF unavailable.')
 row['finalBuild']=build['release']
 for t in row.get('tests',[]):
  p=r/t.get('path','')
  if p.is_file():t['sha256']=sha(p)
 row['integrationEvidence']=[{'path':p,'sha256':sha(r/p)} for p in newrefs]
ledger['allowedStatuses']=sorted(set(ledger['allowedStatuses']+['FAIL']))
ledger['finalStatusCounts']=dict(collections.Counter(x['status']for x in ledger['findings']))
ledger['finalBuild']=build;ledger['productionReady']=False
(r/'evidence/acceptance/FINDING_CLOSURE_LEDGER_CP18.json').write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
with (r/'evidence/acceptance/FINDING_CLOSURE_LEDGER_CP18.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=['id','category','title','status','technicalFixStatus','closureLimit']);w.writeheader();w.writerows({k:row.get(k)for k in w.fieldnames}for row in ledger['findings'])
gates=[
 ('G1','PARTIAL','Corrections, transaction failure, cancellation, table edits and retry covered by59 local checks and browser save/reload. Real BFCache and large-export cancellation/removal browser evidence incomplete.',['evidence/lifecycle/SUMMARY.md','evidence/lifecycle/manual-target-resume-rerun.json','evidence/browser/FRESH_EXPORT_VERIFICATION.json']),
 ('G2','PARTIAL','Eight required PDF fixture classes plus corrupt rejection tested; eight lawful journals149pages parsed locally and49page journal read/OCR in Chrome. Minimum-device and complete hostile-decoder memory qualification absent.',['evidence/pdf/PDF_FINDINGS_CP18.json','evidence/browser/BROWSER_E2E_CP18.json']),
 ('G3','FAIL','Both actual model directions and known structural controls pass. Scientific critical acceptance still fails; literal validation cannot certify meaning.',['evidence/translation/IMPLEMENTATION_REPORT.json','evidence/acceptance/FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json']),
 ('G4','PARTIAL','Actual Chrome UI and final four PDF-to-ZIP flows, edit/reload, two tabs, bounded keyboard and responsive viewport verified. Full browser/device/accessibility and BFCache acceptance incomplete.',['evidence/browser/CP18_BROWSER_EVIDENCE.json','evidence/browser/BROWSER_E2E_CP18.md']),
 ('G5','BLOCKED_ENVIRONMENT','Cold lazy load and controlled cache tests pass. Preview adds1212HTMLbytes so integrity refuses SW install; fresh digital/scan workflows after origin disconnect, update and hosting rollback unproven.',['evidence/browser/CP18_BROWSER_EVIDENCE.json','evidence/final-regression/cache.test.mjs.log']),
 ('G6','PARTIAL','Clean297-file deployment, per-file hashes, model integrity, package limits, dependency audits and independent reproducible static build pass. Actual Cloudflare CSP/MIME/headers/deployment/rollback not performed.',['evidence/build/FINAL_STATIC_VERIFICATION.json','evidence/build/REPRODUCIBLE_BUILD.json','evidence/SECURITY_SCOPE_CP18.md']),
 ('G7','FAIL','Actual final-source targeted20 negative probes retain19 AI-critical meaning defects and1 major lexical defect; these selected probes are not an accuracy estimate. Human approvals0. Alternative local models tested but none qualified.',['evidence/acceptance/FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json','evidence/translation/LOCAL_ENGINE_OPTIONS.json','evidence/acceptance/HUMAN_REVIEW_INSTRUCTIONS.txt'])]
report={'schemaVersion':1,'release':'Semantik Setara CP18 0.18.0','evaluatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'decision':'NOT_PRODUCTION_READY','productionReady':False,'build':build,
 'baseline':{'archive':'SEMANTIK_SETARA_CP17_PDF_ONLY_CLOUDFLARE_PAGES.zip','bytes':226055980,'files':293,'sha256':'02e31d4195b72377b9fed94f130ffa84d6ec9ec5d5ab2b6fcc1c52c109d4d623','crc':'PASS','preserved':True},
 'productBounds':{'input':'PDF_ONLY','processing':'LOCAL','externalTranslationAPI':False,'lazyLoading':True,'historicalWorksheetPdfAvailable':False},
 'support':{'validatedBrowser':'Chrome156 Linux x86_64 local preview; reported9logical threads and8GB deviceMemory','responsive':'390px iframe and desktop viewport; not physical mobile','unverified':['Safari/Firefox','minimum physical device','full WCAG/screen reader','native quota exhaustion','eligible BFCache','offline origin disconnect','Cloudflare deployment and rollback']},
 'mandatoryGates':[{'id':i,'required':True,'status':s,'reason':reason,'evidence':[{'path':p,'sha256':sha(r/p)}for p in paths]}for i,s,reason,paths in gates],
 'findings':{'product':18,'outputThemes':8,'statusCounts':ledger['finalStatusCounts'],'ledger':'evidence/acceptance/FINDING_CLOSURE_LEDGER_CP18.json'},
 'regression':{'commandRuns':len(read('evidence/final-regression/RESULTS.json')['tests']),'allExitZero':all(x['exitCode']==0 for x in read('evidence/final-regression/RESULTS.json')['tests']),'scope':'Deterministic regression success is not scientific quality acceptance.'},
 'scientific':{'firstRealCorpus':{'documents':8,'segments':160,'perDirection':80,'domains':4,'status':'Initially held out; exposed after fixes, now development data. Original results retained.'},'currentNegativeProbeSummary':read('evidence/acceptance/FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json')['summary'],'humanApprovals':0,'humanReviewMaterials':'evidence/acceptance/','newIndependentHoldoutRequired':True},
 'deployment':{'performed':False,'activeSiteUnchanged':True,'ownerApprovalForReplacement':False,'instructions':'DEPLOY_AND_ROLLBACK_CP18.md'},
 'artifacts':{'deploy':'SEMANTIK_SETARA_CP18_CANDIDATE_NOT_PRODUCTION_READY.zip','sourceEvidence':'SEMANTIK_SETARA_CP18_SOURCE_AND_EVIDENCE.zip','checksums':'SHA256SUMS_CP18.txt'},
 'nextActions':'NEXT_ACTIONS.json'}
(r/'RELEASE_ACCEPTANCE_CP18.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'decision':report['decision'],'findingCounts':ledger['finalStatusCounts'],'gates':[(g['id'],g['status'])for g in report['mandatoryGates']]},indent=2))
