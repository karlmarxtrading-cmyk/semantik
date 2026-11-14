"""Bind final-dist semantic evidence to the packaged build and compare source-run targets."""
from pathlib import Path
import json,hashlib,re,sys,collections
repo=Path(__file__).resolve().parents[1]
root=repo/'evidence/cp20/semantics'
run=json.loads((root/'V4_FRESH_ACCEPTANCE.json').read_text());prior=json.loads((root/'V4_FRESH_ACCEPTANCE_SOURCE.json').read_text())
release=Path(run['identity']['sourceRoot']).resolve()
if not release.is_relative_to((repo/'dist').resolve()):raise RuntimeError('Semantic evidence did not use final dist')
info=json.loads(re.search(r'Object.freeze\((.*)\);', (release/'app/build-info.js').read_text()).group(1))
manifest=json.loads((repo/'evidence/build/BUILD_MANIFEST.json').read_text());declared={x['path']:x for x in manifest['files']}
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
module_checks=[]
for name,key in [('translation.js','adapterSHA256'),('claim-guards.js','rulesSHA256'),('semantic-spans.js','spansSHA256')]:
 p=release/'app'/name;rel=str(p.relative_to(repo/'dist'));h=sha(p)
 module_checks.append({'path':rel,'sha256':h,'bytes':p.stat().st_size,'matchesInferenceIdentity':h==run['identity'][key],'matchesManifest':h==declared[rel]['sha256'] and p.stat().st_size==declared[rel]['bytes'],'sourceByteIdentical':p.read_bytes()==(repo/'app/app'/name).read_bytes()})
worker=release/'assets/engine.worker-4c3dcfee.js';rel=str(worker.relative_to(repo/'dist'));wh=sha(worker)
worker_check={'path':rel,'sha256':wh,'matchesInferenceIdentity':wh==run['identity']['workerSHA256'],'matchesManifest':wh==declared[rel]['sha256'] and worker.stat().st_size==declared[rel]['bytes']}
model_checks=[]
for direction in ['en-id','id-en']:
 p=release/'models'/direction/'manifest.json';m=json.loads(p.read_text());model_checks.append({'direction':direction,'manifestSHA256':sha(p),'fingerprint':m['fingerprint'],'matchesBuildIdentity':m['fingerprint']==info['modelHashes'][direction]})
changes=[]
for a,b in zip(prior['rows'],run['rows']):
 diff={k:{'sourceRun':a.get(k),'finalDistRun':b.get(k)} for k in ['source','text','outcome','retryable','recovery','metrics'] if a.get(k)!=b.get(k)}
 if diff:changes.append({'id':a['id'],'differences':diff})
parity=len(prior['rows'])==len(run['rows'])==10 and not changes
passed=all(all(x[k] for k in ['matchesInferenceIdentity','matchesManifest','sourceByteIdentical']) for x in module_checks) and all(worker_check[k] for k in ['matchesInferenceIdentity','matchesManifest']) and all(x['matchesBuildIdentity'] for x in model_checks) and info==manifest['build'] and parity
report={'status':'PASS' if passed else 'FAIL','semanticAcceptance':'FAIL','meaning':'PASS binds actual inference to final build and confirms parity; it is NOT semantic quality acceptance.','build':info,'buildManifestSHA256':sha(repo/'evidence/build/BUILD_MANIFEST.json'),'moduleChecks':module_checks,'workerCheck':worker_check,'modelManifestChecks':model_checks,'sourceRunFinalDistParity':{'pass':parity,'comparedCases':len(run['rows']),'fields':['source','text','outcome','retryable','recovery','metrics'],'differences':changes},'finalOutcomes':dict(collections.Counter(x['outcome'] for x in run['rows'])),'humanApprovals':0,'reviewType':'AI-only; not human-adjudicated','runtimeBoundary':'Actual local ONNX/WASM through Node Worker bridge with local file fetch and in-memory cache; not browser or physical-device evidence.'}
(root/'V4_FINAL_DIST_SEMANTIC_BINDING.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'bindingStatus':report['status'],'semanticAcceptance':report['semanticAcceptance'],'release':info['release'],'parity':parity,'outcomes':report['finalOutcomes'],'humanApprovals':0,'differences':changes},indent=2))
if not passed:sys.exit(1)
