import {build} from 'esbuild';
import {cp,mkdir} from 'node:fs/promises';
await mkdir('public/wasm',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/wasm',{recursive:true});
// Classic workers support MediaPipe's importScripts WASM loader in both dev and production.
await build({entryPoints:['src/vision.worker.ts'],outfile:'public/vision-worker.js',bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true});
