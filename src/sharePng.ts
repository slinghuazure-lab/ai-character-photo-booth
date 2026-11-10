import {createClient} from '@supabase/supabase-js';

import {sharingConfigured,linkLifetime,demoSharing} from './shareConfig';
const project=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
let client:ReturnType<typeof createClient>|undefined;

export async function sharePng(blobUrl:string,id:string,signal:AbortSignal){
  const response=await fetch(blobUrl,{signal});
  if(!response.ok)throw new Error('Photo unavailable');
  const png=await response.blob();
  if(png.type!=='image/png')throw new Error('Expected PNG');
  if(demoSharing){
    const uploaded=await fetch(import.meta.env.BASE_URL+'__share/'+id,{method:'POST',body:png,signal});
    if(!uploaded.ok)throw new Error('Local simulation failed');
    return new URL((await uploaded.json()).url,location.origin).href;
  }
  if(!sharingConfigured)throw new Error('Missing sharing configuration');
  client??=createClient(project,key,{auth:{persistSession:false,detectSessionInUrl:false}});
  const existing=await client.auth.getSession();
  if(existing.error)throw existing.error;
  const session=existing.data.session??(await client.auth.signInAnonymously()).data.session;
  if(!session)throw new Error('Anonymous sign-in failed');
  const object=session.user.id+'/'+id+'.png';
  const bucket=client.storage.from('booth-photos');

  signal.throwIfAborted();
  const uploaded=await bucket.upload(object,png,{contentType:'image/png',upsert:false,cacheControl:'0'});
  // A retry after the upload succeeded (or its response was lost) uses the same immutable object.
  if(uploaded.error && !['409','Duplicate','ResourceAlreadyExists'].includes(String(uploaded.error.statusCode))
    && !('code' in uploaded.error && ['Duplicate','ResourceAlreadyExists'].includes(String(uploaded.error.code))))throw uploaded.error;
  signal.throwIfAborted();
  const signed=await bucket.createSignedUrl(object,linkLifetime,{download:'NTUB-1920x1080.png'});
  if(signed.error)throw signed.error;
  return signed.data.signedUrl;
}
