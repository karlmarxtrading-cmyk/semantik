"""Fail-closed release evaluator. Exit1 is expected while mandatory gates remain open."""
from pathlib import Path
import json,hashlib,sys
r=Path(__file__).resolve().parent.parent;j=json.loads((r/'RELEASE_ACCEPTANCE_CP18.json').read_text());fail=[]
for gate in j['mandatoryGates']:
 if gate['required'] and gate['status']!='PASS':fail.append(gate['id']+': '+gate['status'])
 for ref in gate['evidence']:
  p=r/ref['path']
  if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=ref['sha256']:fail.append('Missing or changed evidence: '+ref['path'])
quality=json.loads((r/'evidence/acceptance/FINAL_SOURCE_SCIENTIFIC_QUALITY_CONFIRMATION.json').read_text())
if quality['summary']['criticalMeaningDefectsStillObserved']:fail.append('Current actual model outputs retain critical meaning defects')
if j['scientific']['humanApprovals']<2:fail.append('Two independent human reviews and adjudication are not complete')
manifest=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())
for f in manifest['files']:
 p=r/'dist'/f['path']
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:fail.append('Dist mismatch: '+f['path'])
for test in json.loads((r/'evidence/final-regression/RESULTS.json').read_text())['tests']:
 if test['exitCode']:fail.append('Regression failed: '+test['test'])
result={'productionReady':not fail,'decision':'PRODUCTION_READY' if not fail else 'NOT_PRODUCTION_READY','reasons':fail,'build':manifest['build'],'exitCode':int(bool(fail))}
(r/'evidence/RELEASE_EVALUATOR_RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));sys.exit(bool(fail))
