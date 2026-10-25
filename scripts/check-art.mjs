import {readFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../src/art-assets.ts',import.meta.url),'utf8');
const files=[...source.matchAll(/'([^']+\.glb)'/g)].map(m=>m[1]);
assert(files.length>0,'No art manifest found');
for(const file of files){
 const path=join('public/art',file),bytes=readFileSync(path);
 assert.equal(bytes.readUInt32LE(0),0x46546c67,file+': invalid GLB magic');
 assert.equal(bytes.readUInt32LE(4),2,file+': unsupported glTF version');
 assert.equal(bytes.readUInt32LE(8),bytes.length,file+': incomplete GLB');
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 for(const item of [...(json.images??[]),...(json.buffers??[])]){
  if(item.uri&&!item.uri.startsWith('data:'))assert(existsSync(join(dirname(path),item.uri)),file+' is missing '+item.uri);
 }
 for(const mesh of json.meshes??[])for(const primitive of mesh.primitives){
  assert(json.accessors[primitive.attributes.POSITION].count>0,file+': empty mesh');
 }
}
console.log(`Art checks passed: ${files.length} GLBs and their external dependencies.`);
