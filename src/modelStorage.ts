export interface SavedAsset{file:Blob;name:string;hash:string;names:string[]}
async function access(mode:IDBTransactionMode,request:(store:IDBObjectStore)=>IDBRequest):Promise<SavedAsset|null>{
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('ntub-character-model',1);
    open.onupgradeneeded=()=>open.result.createObjectStore('models');
    open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const db=open.result,tx=db.transaction('models',mode);
      const op=request(tx.objectStore('models'));
      tx.oncomplete=()=>{db.close();resolve(op.result??null);};
      tx.onabort=()=>{db.close();reject(tx.error);};
    };
  });
}
export const readAsset=()=>access('readonly',s=>s.get('active'));
export const saveAsset=(v:SavedAsset|null)=>access('readwrite',s=>v?s.put(v,'active'):s.delete('active'));
