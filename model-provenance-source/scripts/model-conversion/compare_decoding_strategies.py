"""Follow-up: raw engine decoding comparison; does not alter browser assets."""
from pathlib import Path
from zipfile import ZipFile
import json,re,hashlib,time,gc
import numpy as np
import torch
from convert_models import BASE,load_converter,session,run_ort

def sha(data):return hashlib.sha256(data).hexdigest()

def native_model(pair):
 state=load_converter().OpusState(BASE/'conversion-input'/pair)
 model=state.load_marian_model().eval()
 for mod in model.modules():
  if isinstance(mod,torch.nn.LayerNorm):mod.eps=1e-6
 half=model.config.d_model//2;inc=np.float32(np.log(np.float32(10000))/np.float32(half-1))
 phase=np.arange(512,dtype=np.float32)[:,None]*np.exp(np.arange(half,dtype=np.float32)[None,:]*(-inc))
 pe=torch.from_numpy(np.concatenate([np.sin(phase),np.cos(phase)],axis=1).astype(np.float32))
 with torch.no_grad():
  model.model.encoder.embed_positions.weight.copy_(pe);model.model.decoder.embed_positions.weight.copy_(pe)
 return state.tokenizer,model

fixture_path=BASE.parent.parent/'spec'/'FIXTURE_SEMANTIK_ID_EN.json'
fixtures=json.loads(fixture_path.read_text())['cases']
selected={'SEM-FX-014','SEM-FX-034','SEM-FX-035','SEM-FX-037','SEM-FX-041','SEM-FX-055'}
cases=[{'id':r['id'],'pair':r['direction'],'source':r['source'],'source_path':fixture_path.name,'scope':'severe_semantic_development_fixture','constraints':r['criticalConstraints']} for r in fixtures if r['id'] in selected]
original=BASE.parent.parent/'original'/'SEMANTIK YANG SETARA'
txt=(original/'MATH SD.txt').read_text()
q1=re.search(r'(?m)^Q1\. (.+)$',txt).group(1)
direct=re.search(r'(?s)answer:\s*### Q1\s*\*\*Jawaban langsung:\*\*\s*(.*?)\s*\*\*Penjelasan dan penalaran:',txt).group(1)
explanation=re.search(r'(?s)explanation:\s*### Penjelasan Q1\s*(.*?)\n\n',txt).group(1)
cases+=[{'id':'ORIGINAL-TXT-Q1-ISOLATED','pair':'id-en','source':q1,'source_path':'MATH SD.txt Unit01 Q1','scope':'original_complete_question'},{'id':'ORIGINAL-TXT-Q1-CONTEXT','pair':'id-en','source':q1+'\n\n'+direct+'\n\n'+explanation,'source_path':'MATH SD.txt Unit01 Q1 + complete direct answer + first complete explanation paragraph','scope':'original_complete_question_with_bounded_context','note':'This is NOT the whole multi-question unit; the full unit exceeds the model context. Context is translated as text and cannot be silently stripped from output.'}]
with ZipFile(original/'questions.zip') as z:
 name='questions/comprehensive math/dynanca - 1.json';data=z.read(name);record=json.loads(data)['questions'][0]
 cases += [{'id':'ORIGINAL-JSON-Q1-ISOLATED','pair':'en-id','source':record['question'],'source_path':name+'#/questions/0/question','scope':'original_complete_question'}, {'id':'ORIGINAL-JSON-Q1-CONTEXT','pair':'en-id','source':json.dumps({k:record[k] for k in ['question','options','answer','explanation','hint']},ensure_ascii=False,indent=2),'source_path':name+'#/questions/0','scope':'original_complete_question_options_answer_explanation_hint','note':'Raw whole-record translation only diagnoses model context behavior; it is NOT a lossless JSON workflow and must not be used for file reconstruction.'}]
results=[]
for pair in ['id-en','en-id']:
 tokenizer,model=native_model(pair);p=BASE/'browser-model'/pair;enc=session(p/'encoder_q8.onnx');dec=session(p/'decoder_q8.onnx')
 for case in cases:
  if case['pair']!=pair:continue
  x=tokenizer(case['source'],return_tensors='pt',truncation=False);n=len(x.input_ids[0]);result={**case,'source_sha256':sha(case['source'].encode()),'source_tokens':n,'outputs':{},'semantic_status':'AI_REVIEW_PENDING_HUMAN_REVIEW'}
  if n>512:result['status']='BLOCKED_CONTEXT_LIMIT';results.append(result);continue
  for beam in [1,6]:
   start=time.monotonic()
   with torch.inference_mode():
    out=model.generate(**x,num_beams=beam,length_penalty=1.0,max_new_tokens=511,forced_eos_token_id=None,use_cache=True,early_stopping=False)
   ids=out[0].tolist();result['outputs'][f'fp32_beam{beam}']={'text':tokenizer.decode(ids,skip_special_tokens=True,clean_up_tokenization_spaces=False),'token_ids':ids,'finish_reason':'eos' if ids[-1]==0 else 'length','seconds':time.monotonic()-start}
  ids,seconds=run_ort(enc,dec,x.input_ids.numpy(),x.attention_mask.numpy(),tokenizer.pad_token_id,maxnew=511)
  result['outputs']['q8_greedy']={'text':tokenizer.decode(ids,skip_special_tokens=True,clean_up_tokenization_spaces=False),'token_ids':ids,'finish_reason':'eos' if ids[-1]==0 else 'length','seconds':seconds}
  result['status']='INFERRED';results.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
 del enc,dec,model,tokenizer;gc.collect()
report={'schemaVersion':1,'scope':'Development diagnostics on six severe fixtures and four original-source cases. No semantic certification; no browser artifact mutation.','decode_settings':{'fp32_beam6':'beam6,length_penalty1,early_stopping_false,max_new_tokens511,forced_eos_none','q8_greedy':'beam1,max_new_tokens511,pad_forbidden'},'fixture_sha256':sha(fixture_path.read_bytes()),'model_manifest_sha256':{pair:sha((BASE/'browser-model'/pair/'manifest.json').read_bytes()) for pair in ['id-en','en-id']},'count':len(results),'results':results}
(BASE/'DECODING_STRATEGY_COMPARISON.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
