"""Exact provenance plus normalized visible-text checks; errors remain errors."""
from pathlib import Path
import json,zipfile,hashlib,re,html.parser,sys,datetime
BASE=Path(__file__).resolve().parents[1]/'evidence/acceptance'
report=json.loads((BASE/'JOURNAL_REPLAY_EXPORT_REPORT.json').read_text())
corpus=json.loads((BASE/'G7_REAL_JOURNAL_CORPUS.json').read_text())
inf=json.loads((BASE/'REAL_JOURNAL_REVISED_INFERENCE.json').read_text())
out={x['id']:x for x in inf['output']};docs={d['documentId']:d for d in corpus['documents']}
class Text(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.out=[];self.hide=0
 def handle_starttag(self,tag,attrs):
  if tag in ['style','script']:self.hide+=1
 def handle_endtag(self,tag):
  if tag in ['style','script']:self.hide-=1
 def handle_data(self,data):
  if not self.hide:self.out.append(data)
def norm(t):return re.sub(r'\s+',' ',t).strip()
checks=[];pairs=0;failures=[]
for rec in report['records']:
 f=BASE/'journal-replay-exports'/rec['zip'];assert hashlib.sha256(f.read_bytes()).hexdigest()==rec['sha256']
 with zipfile.ZipFile(f)as z:
  assert z.testzip()is None
  meta=json.loads(z.read('EXPORT_METADATA.json'));prov=json.loads(z.read('PROVENANCE.json'));assert len(prov['blocks'])==20
  assert meta['counts']==rec['counts']
  for row in prov['blocks']:
   assert row['target']==out[row['id']]['text'];assert row['text']==out[row['id']]['source'];pairs+=1
 for art in rec['artifacts']:
  h=(BASE/'journal-replay-exports'/art['html']).read_text();parser=Text();parser.feed(h);visible=norm(' '.join(parser.out))
  assert '<script'not in h.lower()
  wanted=['source']if art['kind']=='ASLI'else['text']if art['kind']=='TERJEMAHAN'else['source','text']
  for s in docs[rec['documentId']]['segments']:
   for key in wanted:
    val=norm(out[s['id']][key]);ok=val in visible
    check={'id':s['id'],'kind':art['kind'],'textField':key,'result':'EXACT_VISIBLE_TEXT_PRESENT'if ok else'FAIL_VISIBLE_TEXT_CHANGED'}
    checks.append(check)
    if not ok:failures.append({**check,'expectedNormalized':val,'artifact':art['html']})
result={'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'method':'Python ZIP CRC32 and SHA256; HTMLParser visible-text comparison against all actual source/target strings after production Markdown serializer and marked render. Only whitespace is normalized. Static render/parse only, no browser screenshot claim.',
 'exportReportSha256':hashlib.sha256((BASE/'JOURNAL_REPLAY_EXPORT_REPORT.json').read_bytes()).hexdigest(),
 'exportModuleHashes':report['exportModuleHashes'],'zipFiles':8,'zipCRC':'PASS','provenancePairsExact':pairs,
 'visibleTextChecks':len(checks),'allVisibleTextChecks':'FAIL'if failures else'PASS',
 'sourceSegments':160,'targetSegments':160,'humanApprovals':0,'failures':failures,'checks':checks}
(BASE/'JOURNAL_REPLAY_HTML_VALIDATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({k:v for k,v in result.items()if k not in ['checks','exportModuleHashes']},ensure_ascii=False,indent=2))
sys.exit(bool(failures))
