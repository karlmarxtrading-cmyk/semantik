"""CP18 literal scanner patch, applied after patch-engine.py; retains genuine math guards."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
p=root/'app/assets/engine.worker-4c3dcfee.js'
s=p.read_text();before=hashlib.sha256(p.read_bytes()).hexdigest()
helper='''function cp18AdjacentMath(text,start,end,spans){const before=text.slice(0,start).match(/[=<>≤≥≠+×÷−^]\\s*$/),after=text.slice(end).match(/^\\s*[=<>≤≥≠+×÷−^]/);const free=index=>!spans.some(span=>index>=span.start&&index<span.end);return Boolean(before&&free(before.index)||after&&free(end+after[0].length-1))}'''
old1=r'/[=<>≤≥≠+×÷−^]\s*$/.test(e.slice(0,i))||/^\s*[=<>≤≥≠+×÷−^]/.test(e.slice(a))'
old2=r'/[=<>≤≥≠+×÷−^]\s*$/.test(s)||/^\s*[=<>≤≥≠+×÷−^]/.test(c)'
if 'function cp18AdjacentMath' not in s:
 assert s.count(old1)==1 and s.count(old2)==1, 'Unexpected scanner input; do not patch guessed locations'
 s=s.replace('function f(e,t=',helper+'function f(e,t=',1).replace(old1,'cp18AdjacentMath(e,i,a,r)').replace(old2,'cp18AdjacentMath(e,a,o,r)')
if '|cp18-marker-boundaries-v1' not in s:
 needle='ordered-xml-literals-v11-dash-separators-math-phrases-v12-contextual-concepts|preserve-v2'
 assert s.count(needle)==1
 s=s.replace(needle,needle+'|cp18-marker-boundaries-v1')
p.write_text(s)
print(json.dumps({'file':str(p),'before':before,'after':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':'Ignore comparison-like angle brackets already claimed as HTML/literal spans when classifying adjacent prose letters; genuine unclaimed operators still guard variables.'}))
