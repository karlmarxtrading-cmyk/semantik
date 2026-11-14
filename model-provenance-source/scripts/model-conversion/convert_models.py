#!/usr/bin/env python3
"""Convert original OPUS Marian NPZ weights to browser ONNX; never fetch a substitute.
Requires isolated pinned requirements-conversion.txt. Writes reproducible artifacts + parity evidence.
"""
from pathlib import Path
import argparse, importlib.util, json, hashlib, shutil, time, gc, sys, warnings
import numpy as np
import torch
import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

BASE=Path(__file__).resolve().parent
torch.set_num_threads(2)

def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  while b:=f.read(1048576):h.update(b)
 return h.hexdigest()

def load_converter():
 path=BASE/'upstream'/'convert_marian_to_pytorch.py'
 spec=importlib.util.spec_from_file_location('official_marian_converter',path)
 module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 return module

class Encoder(torch.nn.Module):
 def __init__(self,model):super().__init__();self.encoder=model.model.encoder
 def forward(self,input_ids,attention_mask):
  return self.encoder(input_ids=input_ids,attention_mask=attention_mask,return_dict=False)[0]

class Decoder(torch.nn.Module):
 def __init__(self,model):super().__init__();self.decoder=model.model.decoder;self.lm=model.lm_head;self.register_buffer('bias',model.final_logits_bias.detach())
 def forward(self,input_ids,encoder_hidden_states,encoder_attention_mask):
  result=self.decoder(input_ids=input_ids,encoder_hidden_states=encoder_hidden_states,encoder_attention_mask=encoder_attention_mask,use_cache=False,return_dict=False)[0]
  return self.lm(result[:,-1,:])+self.bias

def run_ort(enc,dec,ids,mask,pad,maxnew=128):
 start=time.monotonic();hidden=enc.run(None,{'input_ids':ids,'attention_mask':mask})[0]
 generated=[pad]
 for step in range(maxnew):
  logits=dec.run(None,{'input_ids':np.array([generated],dtype=np.int64),'encoder_hidden_states':hidden,'encoder_attention_mask':mask})[0]
  logits[:,pad]=-np.inf
  token=int(logits[0].argmax());generated.append(token)
  if token==0:break
 return generated,time.monotonic()-start

def session(path):
 opts=ort.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
 return ort.InferenceSession(str(path),sess_options=opts,providers=['CPUExecutionProvider'])

def convert(pair):
 original=BASE/('source' if pair=='id-en' else 'source-en-id')
 work=BASE/'conversion-input'/pair;work.mkdir(parents=True,exist_ok=True)
 # immutable original extraction: create conversion work copies; linker preserves bytes, converter adds files only.
 for p in original.iterdir():
  if p.is_file() and not (work/p.name).exists():shutil.copyfile(p,work/p.name)
 converter=load_converter();state=converter.OpusState(work)
 model=state.load_marian_model().eval()
 model.config._attn_implementation='eager';model.config.use_cache=False
 for mod in model.modules():
  if isinstance(mod,torch.nn.LayerNorm):mod.eps=1e-6
 # Exact Marian v1.8.2 sinusoidal positions: log(10000)/(half_dim-1), not HF's half_dim.
 half=model.config.d_model//2
 inc=np.float32(np.log(np.float32(10000.0))/np.float32(half-1))
 positions=np.arange(model.config.max_position_embeddings,dtype=np.float32)[:,None]
 phase=positions*np.exp(np.arange(half,dtype=np.float32)[None,:]*(-inc))
 pe=np.concatenate([np.sin(phase),np.cos(phase)],axis=1).astype(np.float32)
 with torch.no_grad():
  model.model.encoder.embed_positions.weight.copy_(torch.from_numpy(pe))
  model.model.decoder.embed_positions.weight.copy_(torch.from_numpy(pe))
 tokenizer=state.tokenizer
 out=BASE/'browser-model'/pair;out.mkdir(parents=True,exist_ok=True)
 temp=BASE/'fp32'/pair;temp.mkdir(parents=True,exist_ok=True)
 tokenizer.save_pretrained(out)
 model.config.save_pretrained(out)
 shutil.copyfile(original/'LICENSE',out/'LICENSE')
 shutil.copyfile(original/'README.md',out/'ORIGINAL_MODEL_README.md')
 inputs=tokenizer('Saya sedang membaca buku.' if pair=='id-en' else 'I am reading a book.',return_tensors='pt')
 encoder=Encoder(model).eval();decoder=Decoder(model).eval()
 with torch.no_grad():hidden=encoder(inputs.input_ids,inputs.attention_mask)
 decoder_ids=torch.tensor([[state.pad_token_id,6,7]],dtype=torch.long)
 if not (temp/'encoder.onnx').exists():
  print(pair,'export encoder',flush=True)
  torch.onnx.export(encoder,(inputs.input_ids,inputs.attention_mask),str(temp/'encoder.onnx'),input_names=['input_ids','attention_mask'],output_names=['last_hidden_state'],dynamic_axes={'input_ids':{0:'batch',1:'source_length'},'attention_mask':{0:'batch',1:'source_length'},'last_hidden_state':{0:'batch',1:'source_length'}},opset_version=17,do_constant_folding=True)
 if not (temp/'decoder.onnx').exists():
  print(pair,'export decoder',flush=True)
  torch.onnx.export(decoder,(decoder_ids,hidden,inputs.attention_mask),str(temp/'decoder.onnx'),input_names=['input_ids','encoder_hidden_states','encoder_attention_mask'],output_names=['logits'],dynamic_axes={'input_ids':{0:'batch',1:'target_length'},'encoder_hidden_states':{0:'batch',1:'source_length'},'encoder_attention_mask':{0:'batch',1:'source_length'},'logits':{0:'batch'}},opset_version=17,do_constant_folding=True)
 for name in ['encoder','decoder']:
  onnx.checker.check_model(str(temp/f'{name}.onnx'))
  qfile=out/f'{name}_q8.onnx'
  if not qfile.exists():
   print(pair,'quantizing',name,flush=True)
   quantize_dynamic(temp/f'{name}.onnx',qfile,weight_type=QuantType.QInt8,op_types_to_quantize=['MatMul','Gather'],per_channel=True)
  onnx.checker.check_model(str(qfile))
 model.eval();encoder.eval();decoder.eval()
 print(pair,'parity start',flush=True)
 enc=session(temp/'encoder.onnx');dec=session(temp/'decoder.onnx')
 qenc=session(out/'encoder_q8.onnx');qdec=session(out/'decoder_q8.onnx')
 examples=['Saya sedang membaca buku.','Tentukan semua bilangan bulat yang memenuhi syarat tersebut.','Tidak semua siswa membawa dua buku.','Jika hujan turun, pertandingan akan ditunda.'] if pair=='id-en' else ['I am reading a book.','Find all integers that satisfy the condition.','Not every student brought two books.','If it rains, the match will be postponed.']
 results=[]
 for text in examples:
  x=tokenizer(text,return_tensors='pt');ids=x.input_ids.numpy();mask=x.attention_mask.numpy()
  with torch.no_grad():
   ht=encoder(x.input_ids,x.attention_mask).numpy()
   logits=decoder(torch.tensor([[state.pad_token_id]]),torch.from_numpy(ht),x.attention_mask).numpy()
   nativeids=model.generate(**x,num_beams=1,max_new_tokens=128,forced_eos_token_id=None,use_cache=True)[0].tolist()
  ho=enc.run(None,{'input_ids':ids,'attention_mask':mask})[0]
  lo=dec.run(None,{'input_ids':np.array([[state.pad_token_id]],dtype=np.int64),'encoder_hidden_states':ho,'encoder_attention_mask':mask})[0]
  ortids,ortsec=run_ort(enc,dec,ids,mask,state.pad_token_id)
  qids,qsec=run_ort(qenc,qdec,ids,mask,state.pad_token_id)
  row={'source':text,'input_ids':ids[0].tolist(),'source_pieces':tokenizer.spm_source.encode(text,out_type=str),'pytorch_greedy_ids':nativeids,'onnx_fp32_ids':ortids,'onnx_q8_ids':qids,'pytorch_output':tokenizer.decode(nativeids,skip_special_tokens=True),'onnx_fp32_output':tokenizer.decode(ortids,skip_special_tokens=True),'onnx_q8_output':tokenizer.decode(qids,skip_special_tokens=True),'encoder_max_abs_error':float(np.abs(ht-ho).max()),'first_logits_max_abs_error':float(np.abs(logits-lo).max()),'fp32_token_parity':nativeids==ortids,'q8_token_parity':nativeids==qids,'onnx_fp32_seconds':ortsec,'onnx_q8_seconds':qsec}
  results.append(row);print(pair,json.dumps(row,ensure_ascii=False),flush=True)
 evidence={'pair':pair,'reference':'PyTorch graph converted from supplied/native OPUS weights; not execution of Marian C++ binary','layer_norm_epsilon':1e-6,'beam_width':1,'publisher_decoder_beam_width':6,'torch':torch.__version__,'onnx':onnx.__version__,'onnxruntime':ort.__version__,'results':results,'fp32_all_token_parity':all(r['fp32_token_parity'] for r in results),'q8_all_token_parity':all(r['q8_token_parity'] for r in results)}
 (BASE/f'parity-{pair}.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
 assets=[]
 for p in sorted(out.iterdir()):
  if p.is_file() and p.name!='manifest.json':assets.append({'path':p.name,'size':p.stat().st_size,'sha256':sha(p)})
 manifest={'schemaVersion':1,'id':f'opus-{pair}-2019-12-18-onnx-q8-per-channel','direction':pair,'source':'uploaded original archive' if pair=='id-en' else 'official complementary OPUS archive (separate from user supplied source)','sourceArchiveSha256':sha(BASE.parent.parent/'original'/'SEMANTIK YANG SETARA'/'opus-2019-12-18.zip') if pair=='id-en' else sha(BASE/'en-id-original.zip'),'weightsSha256':sha(next(original.glob('*.npz'))),'runtime':'onnxruntime-web/WASM','format':'ONNX opset17 per-channel signed int8 weight quantization','vocabSize':state.pad_token_id+1,'padTokenId':state.pad_token_id,'eosTokenId':0,'unkTokenId':1,'maxInputTokens':512,'maxOutputTokens':512,'inferenceDefault':'greedy','sourceDecoderBeamSize':6,'layerNormEpsilon':1e-6,'positionFormula':'Marian v1.8.2: sin/cos(position * exp(-i*log(10000)/(d_model/2-1)))','license':'CC-BY-4.0 (archive LICENSE)','files':assets,'parityReport':f'parity-{pair}.json'}
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2))
 # Original normalization equivalent requires Moses punctuation rules; engine adapter must not silently normalize source file bytes.
 print(pair,'DONE',sum(r['size'] for r in assets),flush=True)
 del enc,dec,qenc,qdec,encoder,decoder,model,state;gc.collect()
 return manifest

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--pair',choices=['id-en','en-id','both'],default='both');args=ap.parse_args()
 for pair in (['id-en','en-id'] if args.pair=='both' else [args.pair]):convert(pair)
