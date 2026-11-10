import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {localSharing} from './scripts/localSharing';

export default defineConfig(({mode})=>({
  plugins:[react(),...(mode==='share-demo'?[localSharing()]:[])],
  base:'/ai-character-photo-booth/',
}));
