export const demoSharing=import.meta.env.DEV && import.meta.env.MODE==='share-demo';
export const linkLifetime=3600;
export const sharingConfigured=Boolean(import.meta.env.VITE_SUPABASE_URL?.trim().startsWith('https://') &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim().startsWith('sb_publishable_'));
