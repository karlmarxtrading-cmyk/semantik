"""Replace CP16 SentencePiece dynamic embind wrappers with equivalent closures.
No model/tokenizer data or translation algorithm changes. Fails on unknown input.
"""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
p=root/'assets/engine.worker-4c3dcfee.js'
s=p.read_text()
if 'function fn(humanName,argTypes,classType,invoker,fnPtr,isAsync)' in s:
 print('CSP closure patch already applied.');raise SystemExit(0)
before=hashlib.sha256(p.read_bytes()).hexdigest()
a=s.index('function fn(e,t,n,r,i,a){var o=t.length;')
b=s.index('var pn=',a)
old_fn=s[a:b]
new_fn='''function fn(humanName,argTypes,classType,invoker,fnPtr,isAsync){
  if(argTypes.length<2)Y(`argTypes array size mismatch! Must at least get return value and 'this' types!`);
  const isClass=argTypes[1]!==null&&classType!==null;
  const needsDestructors=ln(argTypes);
  const returnsValue=argTypes[0].name!==`void`;
  return Ft(humanName,function(...args){
    const destructors=needsDestructors?[]:null;
    const wired=[];const callArgs=[fnPtr];let thisWired,thisConverted=false,rv;
    try{
      if(isClass){thisWired=argTypes[1].toWireType(destructors,this);thisConverted=true;callArgs.push(thisWired);}
      for(let j=2;j<argTypes.length;j++){const value=argTypes[j].toWireType(destructors,args[j-2]);wired.push(value);callArgs.push(value);}
      rv=invoker(...callArgs);
    }finally{
      if(needsDestructors)cn(destructors);
      else{
        if(thisConverted&&argTypes[1].destructorFunction!==null)argTypes[1].destructorFunction(thisWired);
        for(let j=0;j<wired.length;j++)if(argTypes[j+2].destructorFunction!==null)argTypes[j+2].destructorFunction(wired[j]);
      }
    }
    if(returnsValue)return argTypes[0].fromWireType(rv);
  });
}'''
s=s[:a]+new_fn+s[b:]
a=s.index('er=(e,t,n)=>{var r=$n(e,t),i=r.shift();')
b=s.index(',tr=(e,t)=>',a)
old_er=s[a:b]
new_er='''er=(count,typePtr,kind)=>{
  const argumentTypes=$n(count,typePtr),returnType=argumentTypes.shift();
  const caller=function(obj,func,destructorsRef,argsPtr){
    const args=[];let offset=0;
    for(const type of argumentTypes){args.push(type.readValueFromPointer(argsPtr+offset));offset+=type.argPackAdvance;}
    const value=kind===1?Reflect.construct(func,args):Reflect.apply(func,obj,args);
    if(!returnType.isVoid)return Jn(returnType,destructorsRef,value);
  };
  return Qn(Ft(`methodCaller<(${argumentTypes.map(type=>type.name).join(`, `)}) => ${returnType.name}>`,caller));
}'''
s=s[:a]+new_er+s[b:]
if 'un(Function' in s:raise RuntimeError('Dynamic constructor remains')
p.write_text(s)
report={'purpose':'CSP compatibility for bundled SentencePiece embind','original_sha256':before,'revised_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'replacements':['fn: invoker wrapper generated with Function -> static closure','er: method caller generated with Function -> static closure'],'models_changed':False,'unsafe_eval_required':False,'original_fn':old_fn,'original_er':old_er}
(root/'evidence/engine-csp-patch.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['original_fn','original_er']},indent=2))
