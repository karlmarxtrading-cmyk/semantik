"""Current-source negative probes, explicitly exposed development evidence."""
from pathlib import Path
import json,hashlib,datetime,csv
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'evidence/acceptance'
old=json.loads((BASE/'G7_REAL_JOURNAL_COMPARISON_AI_NOT_HUMAN.json').read_text())
new=json.loads((BASE/'FINAL_CRITICAL_DEVELOPMENT_INFERENCE.json').read_text())
negative=json.loads((ROOT/'evidence/translation/current-quality-negative-probes.json').read_text())
identities=json.loads((ROOT/'evidence/translation/journal-identities-model.json').read_text())
oldBy={r['id']:r for r in old['rows']}
assert new['complete'] and new['completedSegments']==17
for p,h in negative['identities'].items():assert new['identities'][p]==h
for p,h in identities['identities'].items():assert new['identities'][p]==h
for p,h in new['identities'].items():assert hashlib.sha256((ROOT/'app'/p).read_bytes()).hexdigest()==h
rows=[]
for r in new['output']+negative['output']:
 previous=oldBy[r['id']]
 assert r['source']==previous['source']
 if r['id']!='JOURNAL-04-S16':
  assert r['text']==previous['cp18Output'],'Changed output requires fresh screening, not inherited notes'
  severity=previous['aiFindingSeverity'];note=previous['aiFinding']
 else:
  assert 'Nanger granti'in r['text'] and 'eland'in r['text']
  severity='MAJOR_TERMINOLOGY_AFTER_IDENTITY_FIX'
  note='Latin binomial Nanger granti and eland now preserved; browsers as a herbivore feeding category remains peramban (web browsers). Specific identity fix passes, full lexical meaning does not.'
 rows.append({'id':r['id'],'direction':r['direction'],'source':r['source'],'target':r['text'],
              'outcome':r['outcome'],'status':r['status'],'warnings':r.get('issues',[]),
              'aiFindingSeverity':severity,'aiFinding':note,'humanDecision':'UNREVIEWED'})
critical=[r for r in rows if r['aiFindingSeverity'].startswith('CRITICAL')]
summary={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'status':'FAIL_OBSERVED_ON_CURRENT_SOURCE','method':'Actual local model;20 exposed real-journal negative probes (17 in acceptance runner,3 in translation runner), AI screening against exact source strings. Not a new holdout, not browser/PDF pipeline, not human approval.',
         'currentSourceIdentities':new['identities'],
         'summary':{'latestSourceNegativeProbes':20,'criticalMeaningDefectsStillObserved':len(critical),
                    'criticalCasesWithoutAutomaticWarning':sum(not r['warnings']for r in critical),
                    'majorTermDefectAfterTaxonIdentityFix':1,'humanApprovals':0},
         'fixedStructuralScope':{'evidence':'evidence/translation/journal-identities-model.json','tests':len(identities['output']),
              'pass':identities['pass'],'scope':'Exact Roman labels, balanced function notation and context-bounded taxonomic identities; these controls do not establish whole-sentence scientific quality.'},
         'scientificGate':'FAIL','humanReview':'UNREVIEWED',
         'remainingWork':['Improve semantic equivalence and scientific terminology in the local model/pipeline, including entity identity, list completeness, comparison polarity and variable-to-claim relationships.',
                          'Evaluate fixes on a new undisclosed frozen corpus; original32 and original160 are now exposed development sets.',
                          'Two independent bilingual scientific reviewers plus adjudicator must confirm source transcription and final outputs.'],
         'inputHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in [BASE/'FINAL_CRITICAL_DEVELOPMENT_INFERENCE.json',ROOT/'evidence/translation/current-quality-negative-probes.json',ROOT/'evidence/translation/journal-identities-model.json']},
         'rows':rows}
(BASE/'FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
with (BASE/'FINAL_SOURCE_NEGATIVE_PROBES_REVIEW.csv').open('w',newline='',encoding='utf-8-sig')as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows({**r,'warnings':json.dumps(r['warnings'],ensure_ascii=False)}for r in rows)
print(json.dumps(summary['summary'],indent=2))
