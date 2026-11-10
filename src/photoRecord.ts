export type ShareStatus='local'|'shared'|'failed';
export interface PhotoRecord {
  id:string;
  capturedAt:number;
  people:number;
  shareStatus:ShareStatus;
}

export function newPhotoRecord(people:number,capturedAt=Date.now()):PhotoRecord{
  return {id:crypto.randomUUID(),capturedAt,people,shareStatus:'local'};
}

export function isPhotoRecord(value:unknown):value is PhotoRecord{
  if(!value || typeof value!=='object')return false;
  const r=value as Partial<PhotoRecord>;
  return typeof r.id==='string' && /^[a-f\d-]{36}$/i.test(r.id) &&
    typeof r.capturedAt==='number' && Number.isSafeInteger(r.capturedAt) && r.capturedAt>0 &&
    typeof r.people==='number' && Number.isInteger(r.people) && r.people>=0 && r.people<=32767 &&
    (r.shareStatus==='local' || r.shareStatus==='shared' || r.shareStatus==='failed');
}
