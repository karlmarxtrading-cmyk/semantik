from pathlib import Path
import hashlib,json,re,sys,os
r=Path(__file__).resolve().parent.parent;d=r/'dist';m=json.loads((r/os.environ.get('CP21_BUILD_MANIFEST','evidence/build/BUILD_MANIFEST.json')).read_text());sha=lambda b:hashlib.sha256(b).hexdigest();checks=[]
def check(name,ok,detail):checks.append({'name':name,'pass':bool(ok),'detail':detail})
expected={x['path']:x for x in m['files']};actual={p.relative_to(d).as_posix():p for p in d.rglob('*') if p.is_file() and not p.is_relative_to(d/'qa')}
check('Deploy inventory matches manifest',set(expected)==set(actual),{'files':len(actual),'extra':sorted(set(actual)-set(expected)),'missing':sorted(set(expected)-set(actual))})
mis=[]
for n,p in actual.items():
 if n not in expected or p.stat().st_size!=expected[n]['bytes'] or sha(p.read_bytes())!=expected[n]['sha256']:mis.append(n)
check('All actual deploy SHA256 bytes',not mis,mis)
check('Cloudflare individual asset limit25MiB and dashboard1000files',len(actual)<=1000 and all(p.stat().st_size<=25*1024**2 for p in actual.values()),{'files':len(actual),'maxBytes':max(p.stat().st_size for p in actual.values()),'documentation':['https://developers.cloudflare.com/pages/platform/limits/','https://developers.cloudflare.com/pages/get-started/direct-upload/']})
forbidden=[n for n in actual if any(x in n.split('/') for x in ['src','node_modules','tests','evidence','qa']) or n.endswith('.zip')]
check('No test/source/evidence/archive inside deploy',not forbidden,forbidden)
refs=[]
for n,p in actual.items():
 if p.suffix not in ['.js','.mjs','.html','.css']:continue
 text=p.read_text()
 for spec in re.findall(r'''(?:from\s*|import\s*\(?)['"]([^'"]+)['"]''',text):
  if spec.startswith(('.', '/')) and not any(x in spec for x in ['*','?','#']):
   target=(d/spec.lstrip('/')) if spec.startswith('/') else p.parent/spec
   if not target.exists():refs.append({'file':n,'reference':spec})
check('Resolvable literal ESM imports',not refs,refs)
headers=(d/'_headers').read_text();check('Expected CSP/privacy/MIME configuration present',all(x in headers for x in ["connect-src 'self'","object-src 'none'","form-action 'none'",'application/wasm','nosniff','Content-Encoding: identity']) and "'unsafe-eval'" not in headers,'Configuration only; actual hosting headers are a separate gate. wasm-unsafe-eval is narrowly required for WASM.')
apptext='\n'.join(p.read_text() for p in (r/'app/app').glob('*.js'));check('No remote upload API in app modules',not re.search(r'(?:sendBeacon|WebSocket)\s*\(',apptext) and not re.search(r'''fetch\s*\(\s*['"]https?://''',apptext),'Static app-module scan only; vendor/model runtime and observed browser resource requests reported separately. This is not a penetration test.')
check('PDF-only input control','accept="application/pdf,.pdf"' in (d/'index.html').read_text() or 'accept=".pdf,application/pdf"' in (d/'index.html').read_text(),'Upload control format plus runtime validation covered in lifecycle/PDF suites.')
report={'build':m['build'],'checks':checks,'allPass':all(x['pass'] for x in checks),'limitations':['Hash verification is integrity, not scientific accuracy.','npm audit tool lock and inherited engine lock have separate reports; no full security certification.','Cloudflare staging, CSP enforcement and rollback not executed.']}
p=r/os.environ.get('CP21_STATIC_REPORT','evidence/build/FINAL_STATIC_VERIFICATION.json');p.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));sys.exit(not report['allPass'])
