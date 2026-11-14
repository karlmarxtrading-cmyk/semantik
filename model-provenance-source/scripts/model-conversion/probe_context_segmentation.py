from pathlib import Path
from zipfile import ZipFile
import json,hashlib
from transformers import MarianTokenizer
from convert_models import BASE,session,run_ort
p=BASE.parent.parent/'original'/'SEMANTIK YANG SETARA'/'questions.zip'
with ZipFile(p) as z:r=json.loads(z.read('questions/comprehensive math/dynanca - 1.json'))['questions'][0]
cases=[('id-en','instruction-alone','Jelaskan kesalahannya.'),('en-id','original-question-last-sentence','How many counters are on the tray altogether?'),('en-id','original-json-plain-prose-context','\n\n'.join(r[k] for k in ['question','explanation','hint']))]
rows=[]
for pair in ['id-en','en-id']:
 p=BASE/'browser-model'/pair;tok=MarianTokenizer.from_pretrained(p,local_files_only=True,clean_up_tokenization_spaces=False);enc=session(p/'encoder_q8.onnx');dec=session(p/'decoder_q8.onnx')
 for direction,case,source in cases:
  if direction!=pair:continue
  x=tok(source,return_tensors='np');ids,seconds=run_ort(enc,dec,x['input_ids'],x['attention_mask'],tok.pad_token_id,maxnew=511)
  row={'pair':pair,'case':case,'source':source,'source_sha256':hashlib.sha256(source.encode()).hexdigest(),'source_tokens':len(x['input_ids'][0]),'output':tok.decode(ids,skip_special_tokens=True,clean_up_tokenization_spaces=False),'finish_reason':'eos' if ids[-1]==0 else 'length','seconds':seconds};rows.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
 del enc,dec
(BASE/'STRUCTURED_CONTEXT_AND_SENTENCE_PROBE.json').write_text(json.dumps({'scope':'Engine-only diagnostic; source JSON prose fields joined without keys; no app protection. Isolated instruction is a development mitigation probe, not hidden fixture answer reuse.','results':rows},ensure_ascii=False,indent=2))
