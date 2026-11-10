import {isPhotoRecord,type PhotoRecord} from './photoRecord';
import {demoSharing,sharingConfigured} from './shareConfig';

const scope=demoSharing?'demo-':'';
const prefix='booth-photo-'+scope+'record-v1/';
const ack='booth-photo-'+scope+'ack-v1/';
export const historyChanged='booth-photo-record-change';
type Entry=PhotoRecord & {revision:number};
type HistoryRow=Entry & {synced:boolean};
const pending=new Set<string>();
let active=false;

function getRecord(id:string):Entry|null{
  let raw;
  try{raw=JSON.parse(localStorage.getItem(prefix+id)??'null');}catch{return null;}
  if(!isPhotoRecord(raw)||raw.id!==id)return null;
  const revision=Number((raw as Entry).revision);
  return {...raw,revision:Number.isSafeInteger(revision)&&revision>0?revision:1};
}
export function readRecords():HistoryRow[]{
  const rows:HistoryRow[]=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key?.startsWith(prefix))continue;
    const row=getRecord(key.slice(prefix.length));
    if(row)rows.push({...row,synced:Number(localStorage.getItem(ack+row.id))>=row.revision});
  }
  return rows.sort((a,b)=>b.capturedAt-a.capturedAt);
}
export function writeRecord(record:PhotoRecord){
  try{
    const current=getRecord(record.id);
    const revision=(current?.revision??0)+1;
    localStorage.setItem(prefix+record.id,JSON.stringify({...record,revision}));
    window.dispatchEvent(new Event(historyChanged));
    pending.add(record.id);void flush();
  }catch{window.dispatchEvent(new Event(historyChanged+'-error'));}
}
async function flush(){
  if(active||!pending.size||demoSharing||!sharingConfigured||!navigator.onLine)return;
  active=true;
  try{
    const {boothSession}=await import('./boothSession');
    const {db}=await boothSession();
    while(pending.size){
      const id=pending.values().next().value!;
      const r=getRecord(id);
      if(!r){pending.delete(id);continue;}
      const result=await db.rpc('record_booth_photo',{p_id:id,p_taken:new Date(r.capturedAt).toISOString(),
        p_people:r.people,p_status:r.shareStatus,p_revision:r.revision});
      if(result.error)throw result.error;
      localStorage.setItem(ack+id,String(r.revision));
      if(getRecord(id)?.revision===r.revision)pending.delete(id);
      window.dispatchEvent(new Event(historyChanged));
    }
  }catch{window.dispatchEvent(new Event(historyChanged+'-pending'));}
  finally{active=false;}
}
export function retryRecords(){
  try{for(const r of readRecords())if(!r.synced)pending.add(r.id);void flush();}
  catch{window.dispatchEvent(new Event(historyChanged+'-error'));}
}
