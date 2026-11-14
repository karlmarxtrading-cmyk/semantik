"""Bind previously executed inference to final unchanged components; never claims a rerun."""
from pathlib import Path
import json,hashlib,re,datetime,sys
repo=Path(__file__).resolve().parents[1];evidence=repo/'evidence/cp20/semantics';manifestPath=repo/'evidence/build/BUILD_MANIFEST.json'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads(manifestPath.read_text());finalBuild=manifest['build'];finalRoot=repo/'dist'/finalBuild['base'].strip('/');declared={x['path']:x for x in manifest['files']}
oldBinding=json.loads((evidence/'V4_FINAL_DIST_SEMANTIC_BINDING.json').read_text());oldBuild=oldBinding['build'];actual=json.loads((evidence/'V4_FRESH_ACCEPTANCE.json').read_text());oldRoot=Path(actual['identity']['sourceRoot']);historical=json.loads((evidence/'HOLDOUT_INFERENCE.json').read_text());identifiers=json.loads((evidence/'IDENTIFIER_INFERENCE.json').read_text())
assert oldBuild['release']=='cp20-1668833ad37c9dd8', 'Actual execution provenance unexpectedly changed'
assert finalBuild['release']!=oldBuild['release'], 'This script binds a later build, not same build'
assert all(x['identity']==actual['identity'] for x in [historical,identifiers]), 'Actual runs have mixed execution identities'
checks=[]
def check(name,mode='exact',executedHash=None):
 old=oldRoot/name;new=finalRoot/name;oldData=old.read_bytes();newData=new.read_bytes();oldHash=sha(old);newHash=sha(new);key=str(new.relative_to(repo/'dist'));entry=declared.get(key,{})
 if mode=='release-base-only':
  a=oldData.replace(oldBuild['base'].encode(),b'/r/__RELEASE_BASE__/');b=newData.replace(finalBuild['base'].encode(),b'/r/__RELEASE_BASE__/');same=a==b
 else:same=oldData==newData
 row={'path':name,'mode':mode,'executedBuildSHA256':oldHash,'finalBuildSHA256':newHash,'bytesFinal':len(newData),'componentsEqual':same,'finalManifestMatches':entry.get('sha256')==newHash and entry.get('bytes')==len(newData)}
 if mode=='release-base-only':row.update(executedBaseOccurrences=oldData.count(oldBuild['base'].encode()),finalBaseOccurrences=newData.count(finalBuild['base'].encode()),normalizedSHA256=hashlib.sha256(a).hexdigest())
 if executedHash:row['matchesRecordedExecutionHash']=oldHash==executedHash
 checks.append(row)
for name,key in [('translation.js','adapterSHA256'),('claim-guards.js','rulesSHA256'),('semantic-spans.js','spansSHA256')]:check('app/'+name,executedHash=actual['identity'][key])
check('assets/engine.worker-4c3dcfee.js','release-base-only',actual['identity']['workerSHA256'])
for sub in ['runtime','models']:
 oldFiles={str(p.relative_to(oldRoot)) for p in (oldRoot/sub).rglob('*') if p.is_file()};newFiles={str(p.relative_to(finalRoot)) for p in (finalRoot/sub).rglob('*') if p.is_file()};assert oldFiles==newFiles,'File inventory differs: '+sub
 for name in sorted(newFiles):
  if name.endswith('/manifest.json'):
   oldManifestHash=next(x['manifestSHA256'] for x in oldBinding['modelManifestChecks'] if x['direction']==name.split('/')[1]);check(name,'release-base-only',oldManifestHash)
  else:check(name)
info=json.loads(re.search(r'Object.freeze\((.*)\);',(finalRoot/'app/build-info.js').read_text()).group(1));modelFingerprintParity=oldBuild['modelHashes']==finalBuild['modelHashes'] and all(json.loads((finalRoot/'models'/d/'manifest.json').read_text())['fingerprint']==h for d,h in finalBuild['modelHashes'].items())
ok=all(x['componentsEqual'] and x['finalManifestMatches'] and x.get('matchesRecordedExecutionHash',True) for x in checks) and modelFingerprintParity and info==finalBuild
reviews={'historical30':json.loads((evidence/'SEMANTIC_REVIEW_AI.json').read_text()),'freshV4Ten':json.loads((evidence/'V4_SEMANTIC_REVIEW_AI.json').read_text())}
report={'status':'PASS' if ok else 'FAIL','method':'Component parity only. Actual inference remains executed on cp20-1668833ad37c9dd8. No final-build re-execution is claimed. Three semantic modules, runtime payloads and model payloads are byte-identical. Worker and model manifests are compared after replacing only the known immutable release base URL, with both raw hashes recorded.','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'finalBuild':finalBuild,'actualInferenceBuild':oldBuild,'inferenceExecutedOnFinalBuild':False,'finalBuildManifestSHA256':sha(manifestPath),'recordedActualBuildManifestSHA256':oldBinding['buildManifestSHA256'],'modelFingerprintsEqual':modelFingerprintParity,'checkCount':len(checks),'checks':checks,'unchangedSemanticAcceptance':{'status':'FAIL','historical30':{'translated':reviews['historical30']['acceptedTargets'],'rejected':reviews['historical30']['incompleteTargets'],'criticalTranslatedErrorsAI':reviews['historical30']['observedCriticalTranslatedErrors']},'freshV4Ten':{'translated':reviews['freshV4Ten']['machineTranslated'],'rejected':reviews['freshV4Ten']['incompleteTargets'],'criticalTranslatedErrorsAI':reviews['freshV4Ten']['observedCriticalTranslatedErrors']},'humanApprovals':0,'reviewType':'AI-only, no population accuracy claim'},'executionEvidence':{n:sha(evidence/n) for n in ['HOLDOUT_INFERENCE.json','V4_FRESH_ACCEPTANCE.json','IDENTIFIER_INFERENCE.json','FINAL_DIST_SEMANTIC_BINDING.json','V4_FINAL_DIST_SEMANTIC_BINDING.json','IDENTIFIER_FINAL_BINDING.json','SEMANTIC_REVIEW_AI.json','V4_SEMANTIC_REVIEW_AI.json']}}
(evidence/'FINAL_COMPONENT_PARITY_BINDING.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k] for k in ['status','finalBuild','actualInferenceBuild','inferenceExecutedOnFinalBuild','checkCount','unchangedSemanticAcceptance']},indent=2))
if not ok:sys.exit(1)
