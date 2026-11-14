// Finite, explicit fractions only; isolated ordinals and ambiguous "half"/"quarter"
// are deliberately excluded. Never infer a missing denominator or repair source.
const id=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh'];
const en=['','one','two','three','four','five','six','seven','eight','nine','ten'];
const ordinal=['','','half','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
export const wordFractionPairs:[string,string,string][]=[];
for(let denominator=2;denominator<=10;denominator++)for(let numerator=1;numerator<=10;numerator++){
 const ending=numerator===1?ordinal[denominator]:denominator===2?'halves':ordinal[denominator]+'s';
 wordFractionPairs.push([`${id[numerator]} per ${id[denominator]}`,`${en[numerator]}-${ending}`,`${numerator}/${denominator}`]);
}
export function wordFractionSignature(prose:string){
 const result:{at:number;value:string}[]=[];
 for(const [id,en,value]of wordFractionPairs)for(const phrase of [id,en])for(const m of prose.matchAll(new RegExp('\\b'+phrase.replace('-','[- ]')+'\\b','gi')))result.push({at:m.index!,value});
 return result.sort((a,b)=>a.at-b.at).map(x=>x.value);
}
