import type {Language} from './i18n';
import type {CameraSettings,Resolution} from './camera';
export type ExhibitSettings = CameraSettings & {schemaVersion:1; language:Language; showDebug:boolean};
const KEY='photo-booth-p0-1-settings';
export const defaults:ExhibitSettings={schemaVersion:1,language:'zh-TW',deviceId:'',resolution:'auto',mirror:true,showDebug:true};
export function loadSettings():ExhibitSettings {
  try {const data=JSON.parse(localStorage.getItem(KEY)||'null'); return validateSettings(data) || defaults;} catch {return defaults;}
}
export function validateSettings(value:unknown):ExhibitSettings|null {
  if(!value||typeof value!=='object')return null;
  const x=value as Record<string,unknown>;
  if(x.schemaVersion!==1||!['zh-TW','en','ja','ko','th'].includes(String(x.language))||!['auto','640','1280','1920'].includes(String(x.resolution))||typeof x.deviceId!=='string'||typeof x.mirror!=='boolean'||typeof x.showDebug!=='boolean')return null;
  return {schemaVersion:1,language:x.language as Language,deviceId:x.deviceId,resolution:x.resolution as Resolution,mirror:x.mirror,showDebug:x.showDebug};
}
export function saveSettings(value:ExhibitSettings):void {try{localStorage.setItem(KEY,JSON.stringify(value));}catch{/* Storage may be disabled. */}}
