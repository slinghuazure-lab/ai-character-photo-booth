export type Resolution = 'auto' | '640' | '1280' | '1920';
export type CameraDevice = { deviceId: string; label: string };
export type CameraSettings = { deviceId: string; resolution: Resolution; mirror: boolean };
export type CameraInfo = { width:number; height:number; deviceId:string; frameRate:number | null };
const sizes: Record<Exclude<Resolution,'auto'>,[number,number]> = { '640':[640,480], '1280':[1280,720], '1920':[1920,1080] };
export function cameraSupported():boolean { return !!navigator.mediaDevices?.getUserMedia; }
export async function listCameras():Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d=>d.kind==='videoinput').map(d=>({deviceId:d.deviceId,label:d.label}));
}
export async function startCamera(settings:CameraSettings):Promise<MediaStream> {
  const desired = settings.resolution==='auto' ? {width:{ideal:1280},height:{ideal:720}} : {width:{ideal:sizes[settings.resolution][0]},height:{ideal:sizes[settings.resolution][1]}};
  const video:MediaTrackConstraints = { ...desired, ...(settings.deviceId ? {deviceId:{exact:settings.deviceId}} : {facingMode:{ideal:'user'}}) };
  return navigator.mediaDevices.getUserMedia({audio:false,video});
}
export function stopCamera(stream:MediaStream|null):void { stream?.getTracks().forEach(track=>track.stop()); }
export function getCameraInfo(stream:MediaStream|null):CameraInfo|null {
  const settings = stream?.getVideoTracks()[0]?.getSettings();
  if (!settings) return null;
  return {width:settings.width||0,height:settings.height||0,deviceId:settings.deviceId||'',frameRate:settings.frameRate??null};
}
export function cameraErrorMessage(error:unknown):'permissionDenied'|'unavailable'|'insecure'|'cameraError' {
  if (!window.isSecureContext) return 'insecure';
  const name = error instanceof DOMException ? error.name : '';
  if (name==='NotAllowedError'||name==='PermissionDeniedError'||name==='SecurityError') return 'permissionDenied';
  if (['NotFoundError','NotReadableError','OverconstrainedError','AbortError'].includes(name)) return 'unavailable';
  return 'cameraError';
}
