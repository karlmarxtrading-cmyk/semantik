from pathlib import Path
import json,hashlib,time,numpy as np
from transformers import MarianTokenizer
from convert_models import session,run_ort
base=Path(__file__).resolve().parent
source=base.parent.parent/'spec'/'FIXTURE_SEMANTIK_ID_EN.json'
fixture=json.loads(source.read_text());rows=[]
for pair in ['id-en','en-id']:
 p=base/'browser-model'/pair
 tok=MarianTokenizer.from_pretrained(p,clean_up_tokenization_spaces=False,local_files_only=True)
 enc=session(p/'encoder_q8.onnx');dec=session(p/'decoder_q8.onnx')
 for case in fixture['cases']:
  if case['direction']!=pair:continue
  x=tok(case['source'],return_tensors='np');ids,seconds=run_ort(enc,dec,x['input_ids'],x['attention_mask'],tok.pad_token_id,maxnew=192)
  result={'id':case['id'],'direction':pair,'source':case['source'],'output':tok.decode(ids,skip_special_tokens=True,clean_up_tokenization_spaces=False),'source_tokens':len(x['input_ids'][0]),'output_tokens':len(ids)-1,'finish_reason':'eos' if ids[-1]==0 else 'length','seconds':seconds,'engine':'original-id-en' if pair=='id-en' else 'official-complementary-en-id','precision':'q8','semantic_result':'NOT_REVIEWED','humanReviewStatus':'NOT_REVIEWED'}
  rows.append(result);print(case['id'],result['output'],flush=True)
 del enc,dec
out={'schemaVersion':1,'scope':'Engine-only raw inference, NO protection/planner/app QA. Not equivalent to app end-to-end tests. Semantic result NOT_REVIEWED; source XML/ICU/math can be corrupted by raw MT.','fixtureSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'modelManifests':{pair:hashlib.sha256((base/'browser-model'/pair/'manifest.json').read_bytes()).hexdigest() for pair in ['id-en','en-id']},'runtime':'onnxruntime1.20.1 CPU','decode':'greedy max_new_tokens192','count':len(rows),'results':sorted(rows,key=lambda r:r['id'])}
(base/'ENGINE_SEED_INFERENCE_RESULTS.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
