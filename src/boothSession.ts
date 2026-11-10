import {createClient} from '@supabase/supabase-js';
import {sharingConfigured} from './shareConfig';
type BoothDatabase={public:{Tables:Record<never,never>;Views:Record<never,never>;Functions:{
  record_booth_photo:{Args:{p_id:string;p_taken:string;p_people:number;p_status:string;p_revision:number};Returns:undefined}
}}};
let client:ReturnType<typeof createClient<BoothDatabase>>|undefined;
let signingIn:Promise<string>|undefined;

export async function boothSession(){
  if(!sharingConfigured)throw new Error('Missing Supabase configuration');
  client??=createClient<BoothDatabase>(import.meta.env.VITE_SUPABASE_URL.trim(),import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.trim(),{
    auth:{persistSession:true,storageKey:'ntub-booth-auth-v1',detectSessionInUrl:false}
  });
  const db=client;
  async function authenticate(){
    const existing=await db.auth.getSession();
    if(existing.error)throw existing.error;
    if(existing.data.session)return existing.data.session.user.id;
    const result=await db.auth.signInAnonymously();
    if(result.error || !result.data.user)throw result.error??new Error('Anonymous sign-in failed');
    return result.data.user.id;
  }
  signingIn??=authenticate().finally(()=>{signingIn=undefined;});
  return {db,userId:await signingIn};
}
