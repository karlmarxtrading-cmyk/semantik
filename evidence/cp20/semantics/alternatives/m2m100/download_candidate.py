from pathlib import Path
import urllib.request,json,hashlib,time,concurrent.futures
root=Path(__file__).resolve().parent;meta=json.loads((root/'repository-metadata.json').read_text());rev=meta['sha'];target=root/'model'
want=['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx','tokenizer.json','tokenizer_config.json','config.json','generation_config.json','special_tokens_map.json']
entries=[x for x in meta['siblings'] if x['rfilename'] in want]
def get(e):
 name=e['rfilename'];p=target/name;p.parent.mkdir(parents=True,exist_ok=True);part=p.with_suffix(p.suffix+'.part');start=time.monotonic();row={'path':name,'revision':rev,'expectedBytes':e['size']}
 try:
  url='https://huggingface.co/Xenova/m2m100_418M/resolve/'+rev+'/'+name
  h=hashlib.sha256();n=0
  with urllib.request.urlopen(url,timeout=40) as response,part.open('wb') as f:
   row['httpStatus']=response.status
   while chunk:=response.read(1024*1024):f.write(chunk);h.update(chunk);n+=len(chunk)
  row.update(bytes=n,sha256=h.hexdigest(),seconds=round(time.monotonic()-start,2))
  if n!=e['size']:raise ValueError('byte mismatch')
  if e.get('lfs',{}).get('sha256') and h.hexdigest()!=e['lfs']['sha256']:raise ValueError('SHA-256 mismatch')
  part.rename(p);row['status']='PASS'
 except Exception as ex:row.update(status='BLOCKED',errorType=type(ex).__name__,error=str(ex)[:220],seconds=round(time.monotonic()-start,2))
 print(json.dumps(row),flush=True);return row
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:rows=list(ex.map(get,entries))
(root/'DOWNLOAD_EVIDENCE.json').write_text(json.dumps({'model':'Xenova/m2m100_418M','revision':rev,'rows':rows,'allVerified':all(x['status']=='PASS' for x in rows)},indent=2))
