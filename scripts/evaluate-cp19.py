from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parent.parent;p=r/'evidence/cp19'
build=json.loads((r/'evidence/build/BUILD_MANIFEST.json').read_text())['build']
a=json.loads((p/'RELEASE_ACCEPTANCE_CP19.json').read_text())
checks=[]
def check(name,value,detail=None):checks.append({'name':name,'pass':bool(value),'detail':detail})
check('Eight gates and nine findings retained',[x['id'] for x in a['gates']]==[f'G{i}' for i in range(1,9)] and [x['id'] for x in a['findings']]==[f'F{i:02}' for i in range(1,10)])
for f in ['fresh/PIPELINE_RESULTS.json','DOMAIN_HOLDOUT.json','INDEPENDENT_ACCEPTANCE.json','MODEL_AND_HEADERS.json','REPRODUCIBLE_BUILD.json','browser/browser-final.json','browser/hosting-final.json']:
 d=json.loads((p/f).read_text());check('Build identity: '+f,d['build']==build)
d=json.loads((r/'evidence/final-regression/RESULTS.json').read_text());check('Final regressions',d['build']==build and len(d['tests'])==21 and all(x['exitCode']==0 for x in d['tests']) and all(x['pass'] for x in d['syntax']))
for f in ['MODEL_AND_HEADERS.json','REPRODUCIBLE_BUILD.json']:
 d=json.loads((p/f).read_text());check('Actual verification: '+f,d.get('allPass',d.get('pass')))
d=json.loads((p/'INDEPENDENT_ACCEPTANCE.json').read_text());check('Separate acceptance has18 actual results',len(d['rows'])==18 and all(x.get('engine') and x.get('humanVerdict')=='PENDING' for x in d['rows']))
check('Human approvals not fabricated',a['humanApprovals']==0)
check('Live site not overwritten',a['deploymentPerformed'] is False and a['liveSiteModified'] is False)
ready=all(x['status']=='PASS' for x in a['gates']) and a['humanApprovals']>0
check('Readiness reported honestly',not ready and a['status']=='NOT_PRODUCTION_READY')
report={'build':build,'integrityOfReport':all(x['pass'] for x in checks),'productionReady':ready,'status':a['status'],'checks':checks,'blockingGates':[{'id':x['id'],'status':x['status']} for x in a['gates'] if x['status'] not in ['PASS','PASS_BOUNDED']]}
(p/'RELEASE_EVALUATOR.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));assert report['integrityOfReport']
