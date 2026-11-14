#!/usr/bin/env python3
"""Local static server that applies the project's Cloudflare _headers rules.

Development/QA only. Production artifacts are static and need no Python server.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse, fnmatch, json, threading, time, re

parser=argparse.ArgumentParser()
parser.add_argument('--root',default=str(Path(__file__).resolve().parents[1]))
parser.add_argument('--port',type=int,default=8765)
parser.add_argument('--host',default='127.0.0.1')
parser.add_argument('--log',default='')
args=parser.parse_args(); root=Path(args.root).resolve(); lock=threading.Lock()

def policy(path):
    result={'Cache-Control':'no-cache'}; active=False
    f=root/'_headers'
    if not f.exists(): return result
    for raw in f.read_text().splitlines():
        if not raw.strip() or raw.lstrip().startswith('#'): continue
        if not raw[0].isspace(): active=fnmatch.fnmatchcase(path,raw.strip())
        elif active and ':' in raw:
            name,value=raw.strip().split(':',1);result[name]=value.strip()
    return result

class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,
      '.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8',
      '.wasm':'application/wasm','.json':'application/json; charset=utf-8',
      '.webmanifest':'application/manifest+json','.pdf':'application/pdf','.gz':'application/octet-stream'}
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(root),**kw)
    def send_header(self,keyword,value):
        overrides=policy(unquote(urlsplit(self.path).path))
        if keyword in overrides and not getattr(self,'_applying_policy',False): return
        super().send_header(keyword,value)
    def end_headers(self):
        self._applying_policy=True
        for name,value in policy(unquote(urlsplit(self.path).path)).items(): super().send_header(name,value)
        self._applying_policy=False;super().end_headers()
    def do_POST(self):
        # Test-only fixture reports, never included in the static deployment.
        match=re.fullmatch(r'/__test-report/([a-z0-9-]{1,50})',urlsplit(self.path).path)
        if not match:
            self.send_error(405,'Static app does not accept document uploads');return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<2 or length>8*1024*1024:raise ValueError('Report size outside test limits')
            report=json.loads(self.rfile.read(length))
            if not isinstance(report,dict):raise ValueError('Report must be an object')
            folder=root/'evidence';folder.mkdir(exist_ok=True)
            with lock:(folder/f'browser-{match.group(1)}.json').write_text(json.dumps(report,indent=2)+'\n')
            data=json.dumps({'saved':True,'suite':match.group(1)}).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        except (ValueError,OSError) as e:self.send_error(400,str(e))
    def do_PUT(self): self.send_error(405,'Static app does not accept document uploads')
    def log_message(self,fmt,*values):
        if args.log:
            with lock:
                with open(args.log,'a') as f:
                    f.write(json.dumps({'time':time.time(),'path':self.path,'message':fmt%values})+'\n')

server=ThreadingHTTPServer((args.host,args.port),Handler)
print(json.dumps({'serving':str(root),'url':f'http://{args.host}:{args.port}'}),flush=True)
server.serve_forever()
