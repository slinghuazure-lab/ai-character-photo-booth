import { gzipSync } from 'node:zlib';
import { cp, readFile, writeFile } from 'node:fs/promises';
await cp(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url),
         new URL('../public/wasm/', import.meta.url), { recursive: true });

const owl = new URL('../public/models/NTUB_Doctoral_Owl_v15R5_10_Actions.glb', import.meta.url);
await writeFile(new URL(owl.href + '.gz'), gzipSync(await readFile(owl), {level: 9}));
