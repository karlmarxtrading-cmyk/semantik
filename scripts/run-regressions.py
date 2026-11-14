"""Run deterministic, real-PDF and export regressions; actual inference is separate."""
from pathlib import Path
import subprocess,json,hashlib,time,sys,argparse,os
r=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--out',default='evidence/cp20/qa/regressions');parser.add_argument('--label',default='CP20 source regression');parser.add_argument('--include-cp20',action='store_true');parser.add_argument('--include-cp21',action='store_true');parser.add_argument('--include-cp22',action='store_true');args=parser.parse_args()
out=r/args.out;out.mkdir(parents=True,exist_ok=True)
source_before={str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((r/'app').rglob('*')) if p.is_file() and ('vendor' not in p.parts and 'models' not in p.parts)}
names=['cp19-guards.mjs','cp19-model-cache.mjs','cp19-markdown.mjs','cache.test.mjs','lifecycle-regression.mjs','lifecycle-storage.mjs','lifecycle-export.mjs','lifecycle-table-integration.mjs','lifecycle-manual-resume.mjs','lifecycle-markdown-visible.mjs','lifecycle-markdown-visible.py','translation-regression.mjs','translation-scientific-identities.mjs','translation-engine-literals.mjs','translation-before-after.mjs','pdf-layout.mjs','pdf-layout-inherited.mjs','pdf-real-parser.mjs','pdf-inherited-reader.mjs','pdf-extract-boundaries.mjs','pdf-budget-after.mjs']
if args.include_cp22:args.include_cp21=True
if args.include_cp20 or args.include_cp21:
 names+=['cp19-geometry.mjs','cp20-semantic-guards.mjs','cp20-pipeline.mjs','cp20-pipeline-quota-recovery.mjs','cp20-pipeline-eta.mjs','cp20-structure.mjs','cp20-math-qualification.mjs','cp20-math-real-pdf.mjs','cp20-math-review-lifecycle.mjs','cp20-offline-release.mjs','cp20-capacity-references.mjs']
if args.include_cp21:
 names=[('cp21-offline-release.mjs' if x=='cp20-offline-release.mjs' else x) for x in names]+['cp21-document-warning.mjs','cp21-semantic-controls.mjs']
if args.include_cp22:
 names=[('cp22-offline-release.mjs' if x=='cp21-offline-release.mjs' else x) for x in names]+['cp22-coverage-unit.mjs']
rows=[]
for name in names:
 cmd=([sys.executable,str(r/'tests'/name)] if name.endswith('.py') else ['node','--experimental-vm-modules',str(r/'tests'/name)]);start=time.monotonic()
 with (out/(name+'.log')).open('w') as f:p=subprocess.run(cmd,cwd=r.parent,stdout=f,stderr=subprocess.STDOUT)
 rows.append({'test':name,'command':cmd,'exitCode':p.returncode,'seconds':round(time.monotonic()-start,3),'log':str((out/(name+'.log')).relative_to(r))})
 print(name,p.returncode,flush=True)
syntax=[]
for p in sorted((r/'app/app').glob('*.js')):
 x=subprocess.run(['node','--check',str(p)],capture_output=True,text=True);syntax.append({'file':str(p.relative_to(r)),'pass':x.returncode==0,'error':x.stderr if x.returncode else None})
source_after={str(p.relative_to(r)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((r/'app').rglob('*')) if p.is_file() and ('vendor' not in p.parts and 'models' not in p.parts)}
report={'label':args.label,'sourceBefore':source_before,'sourceAfter':source_after,'sourceStableDuringRun':source_before==source_after,'buildReferenceOnly':json.loads((r/os.environ.get('CP21_BUILD_MANIFEST','evidence/cp21/build/BUILD_MANIFEST.json' if args.include_cp21 else 'evidence/build/BUILD_MANIFEST.json')).read_text())['build'],'tests':rows,'syntax':syntax,'method':'Actual Node execution; individual evidence distinguishes deterministic mutations, controlled faults, actual PDF parsing and exports. No browser, model inference or human judgement inferred.'}
(out/'RESULTS.json').write_text(json.dumps(report,indent=2)+'\n')
sys.exit(int(any(x['exitCode'] for x in rows) or any(not x['pass'] for x in syntax)))
