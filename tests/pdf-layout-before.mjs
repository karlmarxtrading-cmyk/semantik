import {analyzeLayout} from './baseline/app/layout.js';
import fs from 'node:fs/promises';
const records=[];
for(const count of [1000,5000,20000]){
 const items=Array.from({length:count},(_,i)=>({text:'x',x:i*0.02,y:100,baseline:101,width:0.01,height:1,fontSize:1,sourceIndex:i}));
 const start=performance.now();const layout=analyzeLayout(items,{width:595,height:842});
 records.push({count,ms:Math.round(performance.now()-start),blocks:layout.blocks.length,coveredItems:layout.coveredItemCount});
}
const r={testKind:'Pure production layout module with adversarial but allowed normalized items; no malicious PDF decoding claim',location:'app/layout.js:62',records};console.log(JSON.stringify(r,null,2));
