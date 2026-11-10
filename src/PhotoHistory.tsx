import {useEffect,useState} from 'react';
import type {Language} from './i18n';

import {readRecords,retryRecords,historyChanged as changed} from './photoHistoryStore';
import {demoSharing,sharingConfigured} from './shareConfig';
const labels={
 'zh-TW':{title:'本機拍照紀錄',empty:'尚無正式合照紀錄',time:'拍攝時間',people:'人數',status:'分享狀態',local:'未分享',shared:'已產生分享連結',failed:'分享失敗',error:'本機紀錄無法讀取或寫入',demo:'僅模擬',count:'筆',cloud:'雲端',pending:'待同步',synced:'已同步',retry:'重試同步',download:'下載'},
 en:{title:'Local photo history',empty:'No group photos yet',time:'Capture time',people:'People',status:'Sharing',local:'Not shared',shared:'Share link created',failed:'Sharing failed',error:'Local history could not be read or saved',demo:'Demo only',count:'records',cloud:'Cloud',pending:'Pending',synced:'Synced',retry:'Retry sync',download:'Download'},
 ja:{title:'端末の撮影履歴',empty:'撮影履歴はありません',time:'撮影日時',people:'人数',status:'共有状況',local:'未共有',shared:'共有リンク作成済み',failed:'共有失敗',error:'履歴を読み込みまたは保存できません',demo:'テストのみ',count:'件',cloud:'クラウド',pending:'同期待ち',synced:'同期済み',retry:'再同期',download:'ダウンロード'}
};
export default function PhotoHistory({language}:{language:Language}){
  const [open,setOpen]=useState(false),[rows,setRows]=useState<ReturnType<typeof readRecords>>([]),[error,setError]=useState(false);
  useEffect(()=>{
    const fail=()=>setError(true);
    const refresh=()=>{if(open)try{setRows(readRecords());}catch{fail();}};
    const crossTab=(e:StorageEvent)=>{if(e.key===null||e.key.startsWith('booth-photo-'))refresh();};
    refresh();
    window.addEventListener(changed,refresh);window.addEventListener(changed+'-error',fail);window.addEventListener('storage',crossTab);
    return ()=>{window.removeEventListener(changed,refresh);window.removeEventListener(changed+'-error',fail);window.removeEventListener('storage',crossTab);};
  },[open]);
  useEffect(()=>{
    retryRecords();window.addEventListener('online',retryRecords);
    return ()=>window.removeEventListener('online',retryRecords);
  },[]);
  function downloadHistory(format:'csv'|'json'){
    const entries=rows.map(row=>({
      id:row.id,
      capturedAt:new Date(row.capturedAt).toISOString(),
      people:row.people,
      shareStatus:row.shareStatus,
      syncStatus:demoSharing?'demo':row.synced?'synced':'pending'
    }));
    const columns=['id','capturedAt','people','shareStatus','syncStatus'] as const;
    const content=format==='json'?JSON.stringify(entries,null,2):
      '\uFEFF'+[columns.join(','),...entries.map(entry=>columns.map(key=>entry[key]).join(','))].join('\r\n');
    const type=format==='json'?'application/json':'text/csv;charset=utf-8';
    const url=URL.createObjectURL(new Blob([content],{type}));
    const link=document.createElement('a');
    link.href=url;
    link.download='booth-photo-history-'+new Date().toISOString().replace(/:/g,'-')+'.'+format;
    link.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const t=labels[language];
  return <details className="panel photo-history" onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary>{t.title}</summary>
    {error&&<p role="status">{t.error}</p>}
    {open&&(rows.length?<><p>{rows.length} {t.count}</p>
    <button className="subtle-button" onClick={()=>downloadHistory('csv')}>{t.download} CSV</button>{' '}
    <button className="subtle-button" onClick={()=>downloadHistory('json')}>{t.download} JSON</button>
    {!demoSharing&&sharingConfigured&&rows.some(r=>!r.synced)&&<button className="subtle-button" onClick={retryRecords}>{t.retry}</button>}<table><thead><tr><th>{t.time}</th><th>{t.people}</th><th>{t.status}</th><th>{t.cloud}</th></tr></thead>
    <tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.capturedAt).toLocaleString(language)}</td><td>{r.people}</td><td>{t[r.shareStatus]}</td><td>{demoSharing?t.demo:r.synced?t.synced:t.pending}</td></tr>)}</tbody></table></>:<p>{t.empty}</p>)}
  </details>;
}
