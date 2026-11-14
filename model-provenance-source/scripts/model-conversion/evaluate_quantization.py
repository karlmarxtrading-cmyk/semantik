from pathlib import Path
import json,numpy as np
from onnxruntime.quantization import quantize_dynamic,QuantType
from transformers import MarianTokenizer
from convert_models import BASE,session,run_ort
allresults=[]
for pair in ['id-en','en-id']:
 out=BASE/'q8-per-channel'/pair;out.mkdir(parents=True,exist_ok=True)
 for name in ['encoder','decoder']:
  p=out/f'{name}_q8.onnx'
  if not p.exists():quantize_dynamic(BASE/'fp32'/pair/f'{name}.onnx',p,weight_type=QuantType.QInt8,op_types_to_quantize=['MatMul','Gather'],per_channel=True)
 tok=MarianTokenizer.from_pretrained(BASE/'browser-model'/pair,local_files_only=True,clean_up_tokenization_spaces=False)
 enc=session(out/'encoder_q8.onnx');dec=session(out/'decoder_q8.onnx')
 rows=json.loads((BASE/f'parity-{pair}.json').read_text())['results']
 for row in rows:
  x=tok(row['source'],return_tensors='np');ids,sec=run_ort(enc,dec,x['input_ids'],x['attention_mask'],tok.pad_token_id)
  result={'pair':pair,'source':row['source'],'candidate':'qint8_per_channel_gather_matmul','ids':ids,'output':tok.decode(ids,skip_special_tokens=True),'fp32_equal':ids==row['onnx_fp32_ids'],'seconds':sec}
  allresults.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
 del enc,dec
(BASE/'quantization-comparison.json').write_text(json.dumps(allresults,ensure_ascii=False,indent=2))
