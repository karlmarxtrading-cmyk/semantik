/** QA-only table contract. Never ship in the deploy artifact. No scientific symbol is removed. */
export const serializeTableRows=rows=>rows.map(row=>row.join(' | ')).join('\n');
const numericInventory=text=>(String(text).match(/[-−+]?\d+(?:[.,]\d+)*(?:[eE][-+]?\d+)?/gu)||[]).sort();
export function auditTranslatedTable(block,result,auditTranslation){
  const issues=[];
  if(!Array.isArray(block.rows)||block.rows.some(row=>!Array.isArray(row)))return ['Invalid source matrix'];
  if(!Array.isArray(result.translatedRows)||result.translatedRows.length!==block.rows.length)return ['Row count changed'];
  for(let r=0;r<block.rows.length;r++){
    if(!Array.isArray(result.translatedRows[r])||result.translatedRows[r].length!==block.rows[r].length){issues.push('Cell count changed at row '+r);continue;}
    for(let c=0;c<block.rows[r].length;c++)issues.push(...auditTranslation(block.rows[r][c],result.translatedRows[r][c]).map(x=>'cell '+r+','+c+': '+x));
  }
  if(issues.length)return issues;
  const sourceSerialized=serializeTableRows(block.rows),targetSerialized=serializeTableRows(result.translatedRows);
  issues.push(...auditTranslation(sourceSerialized,targetSerialized).map(x=>'global aligned table: '+x));
  if(result.text!==targetSerialized)issues.push('Displayed target text differs from cell matrix');
  if(JSON.stringify(numericInventory(sourceSerialized))!==JSON.stringify(numericInventory(targetSerialized)))issues.push('Global numeric inventory changed');
  if(typeof block.text==='string'&&JSON.stringify(numericInventory(block.text))!==JSON.stringify(numericInventory(sourceSerialized)))issues.push('Source matrix lost numeric values from extracted text');
  return issues;
}
