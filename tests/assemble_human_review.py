"""Join actual frozen inference outputs for human review; AI observations are not approvals."""
from pathlib import Path
import json,csv,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'evidence/acceptance'
corpus=json.loads((BASE/'G7_HOLDOUT_CORPUS.json').read_text())
baseline=json.loads((ROOT/'evidence/translation/holdout-baseline.json').read_text())
revised=json.loads((ROOT/'evidence/translation/holdout-revised.json').read_text())
assert baseline['corpusSha256']==revised['corpusSha256']==hashlib.sha256((BASE/'G7_HOLDOUT_CORPUS.json').read_bytes()).hexdigest()
b={x['id']:x for x in baseline['output']};r={x['id']:x for x in revised['output']}
notes={
'HOLDOUT-MATH-EN-01':('MAJOR_TERMINOLOGY','Residual English disjoint; solution-set term improved.'),
'HOLDOUT-MATH-EN-02':('CRITICAL_TERMINOLOGY','Mathematical union rendered serikat, despite correct protected symbols.'),
'HOLDOUT-STAT-EN-01':('SAFE_REJECTION','Faithful source fallback is explicit; no completed translation. Needs diagnosis/retry.'),
'HOLDOUT-STAT-EN-03':('FALSE_WARNING_CANDIDATE','asymmetric/tidak simetris is a faithful equivalence; negative-word warning appears noisy.'),
'HOLDOUT-STAT-EN-04':('MAJOR_SCOPE','rather than/ daripada translation may blur exclusion of causal interpretation; human review required.'),
'HOLDOUT-BIO-EN-01':('FLUENCY','Protected μM fixed; word order reagen konsentrasi and min 15 needs editing.'),
'HOLDOUT-BIO-EN-03':('TERMINOLOGY','establish clinical effectiveness rendered membangun efektivitas, rather than evidential establish.'),
'HOLDOUT-BIO-EN-04':('CRITICAL_TERMINOLOGY','Chemical solution rendered solusi; assay rendered agasyar. Scientific term failure unflagged.'),
'HOLDOUT-ENV-EN-02':('MAJOR_MODALITY','certain outcome rendered hasil tertentu (specific outcome), potentially losing certainty meaning.'),
'HOLDOUT-ENV-EN-04':('SAFE_REJECTION','Identifier retained but complete sentence falls back to English; no completed translation.'),
'HOLDOUT-MATH-ID-01':('MAJOR_NEGATION_SCOPE','does not include both may mean not both instead of excluding either boundary; human review required.'),
'HOLDOUT-MATH-ID-02':('FLUENCY','Notation retained but applies ... to the convention is awkward.'),
'HOLDOUT-MATH-ID-03':('MAJOR_RELATION','kedua interval (the two intervals) rendered second interval; semantic relation degraded.'),
'HOLDOUT-STAT-ID-01':('SAFE_REJECTION','Source retained with explicit rejection; no completed English translation.'),
'HOLDOUT-STAT-ID-02':('FALSE_WARNING_CANDIDATE','uncertainty present in both; warning appears noisy. Fluency also needs editing.'),
'HOLDOUT-STAT-ID-04':('CRITICAL_TERMINOLOGY','diestimasi (estimated) rendered authenticated; wrong scientific operation unflagged.'),
'HOLDOUT-BIO-ID-01':('CRITICAL_TERMINOLOGY','Larutan (chemical solution) rendered Prohibition; reagen remains untranslated.'),
'HOLDOUT-BIO-ID-04':('FALSE_WARNING_CANDIDATE','kemungkinan/possible retained; modality warning appears noisy.'),
'HOLDOUT-ENV-ID-04':('FALSE_WARNING_CANDIDATE','Ketidakpastian/uncertainty retained; warning appears noisy.')}
rows=[]
for d in corpus['documents']:
 for s in d['segments']:
    rid=s['id'];severity,note=notes.get(rid,('NO_AI_ISSUE_NOT_HUMAN_PASS','No specific defect recorded in this limited AI review. Not human approval.'))
    rows.append({'id':rid,'documentId':d['documentId'],'direction':d['direction'],'domain':d['domain'],'source':s['source'],
                 'aiReference':s['aiReference'],'baselineOutput':b[rid]['text'],'cp18Output':r[rid]['text'],
                 'baselineStatus':b[rid]['status'],'cp18Status':r[rid]['status'],'cp18Outcome':r[rid].get('outcome'),
                 'cp18Warnings':r[rid]['issues'],'aiFindingSeverity':severity,'aiFinding':note,
                 'reviewerA':None,'reviewerB':None,'adjudicator':None,'humanReference':None,'humanDecision':'UNREVIEWED'})
report={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'corpusSha256':revised['corpusSha256'],
        'method':'Actual Node/WASM outputs joined by frozen permanent ID; qualitative observations by AI, not independent human ratings.',
        'references':'AI-authored suggestions only; humanReference null until reviewer supplies it.',
        'sourceIdentities':{'baseline':baseline['identities'],'cp18':revised['identities']},
        'summary':{'segments':len(rows),'safeRejections':sum(x['cp18Outcome']=='rejected' for x in rows),
                   'translatedWithWarnings':sum(x['cp18Outcome']=='translated' and x['cp18Status']=='review' for x in rows),
                   'aiFlaggedCriticalTermCases':sum(x['aiFindingSeverity']=='CRITICAL_TERMINOLOGY' for x in rows),
                   'humanApprovals':0,'scientificGate':'FAIL_OBSERVED_ERRORS_AND_HUMAN_REVIEW_PENDING'},
        'rows':rows,
        'limitations':['This is a32-segment synthetic pilot, not general accuracy.','Rows without AI findings are not semantic PASS.','No human reviewer identity or approval has been fabricated.','If fixes use these outputs, preserve this evaluation and mark the corpus development-exposed; use a fresh independent holdout.']}
(BASE/'G7_SYNTHETIC_COMPARISON_AI_NOT_HUMAN.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
with (BASE/'HUMAN_REVIEW_ACTUAL_OUTPUTS.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows({**x,'cp18Warnings':json.dumps(x['cp18Warnings'],ensure_ascii=False)} for x in rows)
(BASE/'HUMAN_REVIEW_INSTRUCTIONS.txt').write_text('''CP18 — independent bilingual scientific review\n\nNo human review has occurred. AI observations and AI references are suggestions only.\n1. Two independent bilingual reviewers with domain competence inspect source PDFs/text and blinded model outputs.\n2. Record identity, qualification, date, segment ID, critical/major/minor error, reasoning and corrected reference.\n3. Evaluate literals, quantities attached to claims, polarity/modality, scientific terms, omissions/additions and fluency separately.\n4. An independent adjudicator resolves disagreements. Preserve both original decisions.\n5. Apply G7_PREDECLARED_RUBRIC.json without changing thresholds after observing results.\n6. A rejected candidate is safe fallback, not a successful translation. A warning is neither automatic failure nor human approval.\n7. No row may be human-approved by an AI agent or script. HumanReference remains empty until supplied.\n8. Review the actual exported document and source page together; these model-only results do not establish PDF extraction coverage or browser behavior.\n\nThe historical user worksheet PDF is unavailable. Synthetic fixtures are explicitly labeled and never represented as that PDF.\n''')
print(json.dumps(report['summary']))
