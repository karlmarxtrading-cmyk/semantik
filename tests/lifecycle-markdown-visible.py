from pathlib import Path
from html.parser import HTMLParser
import json,re
class Visible(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.parts=[]
 def handle_data(self,text):self.parts.append(text)
 def handle_starttag(self,tag,attrs):
  if tag in ['p','pre','br','li','h1','h2','h3','h4','h5','h6','tr','td','th']:self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ['p','pre','li','h1','h2','h3','h4','h5','h6','tr','td','th']:self.parts.append('\n')
def normal(s):return re.sub(r'\s+',' ',s).strip()
p=Path(__file__).resolve().parents[1]/'evidence/lifecycle/markdown-visible-render-cases.json';data=json.loads(p.read_text());results=[]
for row in data['rows']:
 parser=Visible();parser.feed(row['html']);actual=normal(''.join(parser.parts));expected=normal(row['source']);assert actual==expected,(row['id'],expected,actual);results.append({'id':row['id'],'expected':expected,'actual':actual,'result':'PASS'})
report={'exportSha256':data['sourceSha256'],'cases':len(results),'method':'Python stdlib HTMLParser text extraction; only whitespace normalization, no punctuation removal or expected-text changes','results':results,'generatedTableStillStructured':data['generatedTableStillStructured']};p.with_name('markdown-visible-regression.json').write_text(json.dumps(report,indent=2)+'\n');print(f'{len(results)} exact visible source comparisons PASS')
