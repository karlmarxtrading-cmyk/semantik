"""Compare converted FP32 beam6 with first 20 publisher native decoder outputs.
Stores hashes, not third-party corpus text. This is a narrow published-output regression,
not a run of the Marian C++ binary in this environment.
"""
from pathlib import Path
import json,hashlib,numpy as np,torch
from convert_models import BASE,load_converter
from sacremoses import MosesPunctNormalizer

def h(text):return hashlib.sha256(text.encode()).hexdigest()
allreports=[]
for pair in ['id-en','en-id']:
 state=load_converter().OpusState(BASE/'conversion-input'/pair);model=state.load_marian_model().eval()
 for mod in model.modules():
  if isinstance(mod,torch.nn.LayerNorm):mod.eps=1e-6
 half=model.config.d_model//2
 inc=np.float32(np.log(np.float32(10000))/np.float32(half-1))
 phase=np.arange(512,dtype=np.float32)[:,None]*np.exp(np.arange(half,dtype=np.float32)[None,:]*-inc)
 pe=torch.from_numpy(np.concatenate([np.sin(phase),np.cos(phase)],axis=1).astype(np.float32))
 with torch.no_grad():
  model.model.encoder.embed_positions.weight.copy_(pe);model.model.decoder.embed_positions.weight.copy_(pe)
 reference=BASE/'upstream'/f'{pair}-native-reference.txt';lines=reference.read_text().splitlines();rows=[]
 norm=MosesPunctNormalizer(lang=pair.split('-')[0])
 for index in range(20):
  source,gold,published=lines[index*4:index*4+3];published=published.strip()
  normalized=norm.normalize(source)
  x=state.tokenizer(normalized,return_tensors='pt')
  with torch.no_grad():out=model.generate(**x,num_beams=6,length_penalty=1.0,max_new_tokens=128,forced_eos_token_id=None,use_cache=True)
  output=state.tokenizer.decode(out[0],skip_special_tokens=True,clean_up_tokenization_spaces=False)
  rows.append({'publisher_record_index':index,'sourceSha256':h(source),'publisherOutputSha256':h(published),'convertedOutputSha256':h(output),'exact':output==published,'source_tokens':len(x.input_ids[0]),'output_tokens':len(out[0])})
  print(pair,index,output==published,flush=True)
 report={'direction':pair,'scope':'First20 published native outputs, not native C++ re-execution; beam6, normalized punctuation; exact lexical comparisons, not semantic equivalence','referenceFileSha256':hashlib.sha256(reference.read_bytes()).hexdigest(),'referenceURL':f'https://object.pouta.csc.fi/OPUS-MT-models/{pair}/opus-2019-12-18.test.txt','count':len(rows),'exact_matches':sum(r['exact'] for r in rows),'results':rows}
 allreports.append(report);del model,state
(BASE/'PUBLISHED_NATIVE_OUTPUT_PARITY.json').write_text(json.dumps(allreports,indent=2))
