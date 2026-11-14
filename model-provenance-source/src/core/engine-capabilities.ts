import type {Direction} from './types';
export type EngineCapabilities={directions:Direction[];mode:'browser-local';worker:boolean;wasm:boolean;remote:false};
export function probeCapabilities(models:Record<string,unknown>,runtime={worker:typeof Worker!=='undefined',wasm:typeof WebAssembly!=='undefined'}):EngineCapabilities{
 return {directions:(['id-en','en-id'] as Direction[]).filter(d=>Object.hasOwn(models,d)&&!!models[d]),mode:'browser-local',...runtime,remote:false};
}
export function directionAvailability(caps:EngineCapabilities,direction:Direction){
 const reason=!caps.directions.includes(direction)?'Arah ini tidak disediakan adapter. Tidak ada pivot bahasa.':!caps.worker?'Browser tidak mendukung Web Worker. Impor dan inferensi tidak tersedia.':!caps.wasm?'Browser tidak mendukung WebAssembly; mesin lokal tidak tersedia.':'';
 return {direction,available:!reason,reason};
}
export function requireDirection(caps:EngineCapabilities,direction:Direction){const state=directionAvailability(caps,direction);if(!state.available)throw new Error(state.reason);}
