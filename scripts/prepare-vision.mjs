import { cp } from 'node:fs/promises';
await cp(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url),
         new URL('../public/wasm/', import.meta.url), { recursive: true });
