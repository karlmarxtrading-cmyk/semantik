#!/usr/bin/env python3
"""Static deployment gates. Does not claim runtime or translation correctness."""
from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,sys,argparse

p=argparse.ArgumentParser();p.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));p.add_argument('--output',default='')
a=p.parse_args();root=Path(a.root).resolve();checks=[]
def check(name,ok,detail=''):checks.append({'check':name,'pass':bool(ok),'detail':detail})
excluded={'tests','scripts','evidence','docs','.git','node_modules'}
files=[f for f in root.rglob('*') if f.is_file() and not any(x in excluded for x in f.relative_to(root).parts)]
large=[{'path':str(f.relative_to(root)),'bytes':f.stat().st_size} for f in files if f.stat().st_size>25*1024*1024]
check('All deployable files at most 25 MiB',not large,large)
check('Deployable files at most 20000',len(files)<=20000,len(files))
for name in ['index.html','sw.js','_headers']:
    check('Required file '+name,(root/name).is_file())

class HTML(HTMLParser):
    def __init__(self):super().__init__();self.file_inputs=[];self.refs=[];self.inline_scripts=0;self._script=False
    def handle_starttag(self,tag,attributes):
        d=dict(attributes)
        if tag=='input' and d.get('type')=='file':self.file_inputs.append(d)
        if tag=='script':
            self._script=True
            if d.get('src'):self.refs.append(d['src'])
            else:self.inline_scripts+=1
        if tag=='link' and d.get('rel') in ['stylesheet','manifest','icon']:self.refs.append(d.get('href',''))
html=HTML()
if (root/'index.html').exists():
    html.feed((root/'index.html').read_text())
    check('At least one explicit PDF file input',len(html.file_inputs)>0,html.file_inputs)
    check('Every file input accepts only PDF',all(set(x.get('accept','').lower().split(','))<= {'application/pdf','.pdf'} and x.get('accept') for x in html.file_inputs),html.file_inputs)
    check('No inline script requiring unsafe-inline',html.inline_scripts==0,html.inline_scripts)
    for ref in html.refs:
        check('HTML local dependency '+ref,not ref.startswith(('http:','https:','//')) and (root/ref.lstrip('/').split('?')[0]).is_file())

if (root/'_headers').exists():
    h=(root/'_headers').read_text()
    check('CSP restricts network connections to self',"connect-src 'self'" in h and 'connect-src *' not in h)
    check('CSP blocks active embedded objects',"object-src 'none'" in h)
    check('No CSP unsafe-eval',"'unsafe-eval'" not in h)
    check('Content sniffing disabled','X-Content-Type-Options: nosniff' in h)
if (root/'sw.js').exists():
    sw=(root/'sw.js').read_text()
    check('Service worker source does not contain old JSON upload bundle','index-za6MzwHY.js' not in sw and 'archive.worker-Drm6jGJ4.js' not in sw)

check('Old non-PDF application bundle removed',not (root/'assets/index-za6MzwHY.js').exists())
check('Old archive upload worker removed',not (root/'assets/archive.worker-Drm6jGJ4.js').exists())
check('Both local language model manifests retained',all((root/'models'/d/'manifest.json').exists() for d in ['en-id','id-en']))
check('Model attribution retained',(root/'MODEL_NOTICE.txt').is_file())
result={'scope':'Static deployability and explicit input surface only; runtime tests required separately',
    'pass':all(x['pass'] for x in checks),'checks':len(checks),'failed':[x for x in checks if not x['pass']],
    'deployableFiles':len(files),'deployableBytes':sum(x.stat().st_size for x in files),'details':checks}
if a.output:Path(a.output).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='details'},indent=2))
sys.exit(0 if result['pass'] else 1)
