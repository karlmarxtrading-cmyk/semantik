export type CheckerIdentity={kind:'rules'|'model';fingerprint:string};
/** Operational independence only; no model result is a human decision. Unknown fingerprints fail closed. */
export function reviewIdentity(generator:string|undefined,checker:CheckerIdentity){
 if(checker.kind==='rules')return {kind:'AUTOMATED_RULES',label:'Pemeriksaan aturan otomatis',human:false,independentModel:false,checkerFingerprint:checker.fingerprint};
 const generatorModel=generator?.split('|')[0].trim(),checkerModel=checker.fingerprint.split('|')[0].trim();
 const known=!!generatorModel&&!!checkerModel,same=generatorModel===checkerModel;
 return {kind:!known?'MODEL_REVIEW_UNVERIFIED':same?'MODEL_SELF_REVIEW':'OTHER_MODEL_REVIEW',label:!known?'Identitas pemeriksa model belum terverifikasi':same?'Self-review model':'Pemeriksa model berbeda — bukan manusia',human:false,independentModel:known&&!same,checkerFingerprint:checker.fingerprint};
}
