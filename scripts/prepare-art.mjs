// Repackage the CC0 Standard download from https://quaternius.com/packs/stylizednaturemegakit.html.
// Run: node scripts/prepare-art.mjs <extracted-pack-directory>
// Geometry is unchanged; shared external textures avoid embedding the same image in every GLB.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const source=process.argv[2];
if(!source)throw Error('Pass the extracted Stylized Nature MegaKit Standard directory.');
const target='public/art/woodland';
fs.mkdirSync(target,{recursive:true});
const names=['CommonTree_1','CommonTree_3','CommonTree_5','Pine_1','Pine_3','Pine_5','Bush_Common_Flowers','Fern_1','Grass_Wispy_Short','Rock_Medium_1','Rock_Medium_3','DeadTree_2'];
const images=new Set();
for(const name of names){
 const json=JSON.parse(fs.readFileSync(path.join(source,'glTF',name+'.gltf')));
 const binary=fs.readFileSync(path.join(source,'glTF',json.buffers[0].uri));
 delete json.buffers[0].uri;
 for(const image of json.images??[]){images.add(image.uri);if(/Bark|Rocks/.test(image.uri)){image.uri=image.uri.replace('.png','.jpg');image.mimeType='image/jpeg';}}
 const text=Buffer.from(JSON.stringify(json));
 const jsonChunk=Buffer.alloc(Math.ceil(text.length/4)*4,32);text.copy(jsonChunk);
 const binChunk=Buffer.alloc(Math.ceil(binary.length/4)*4);binary.copy(binChunk);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonChunk.length+binChunk.length,8);header.writeUInt32LE(jsonChunk.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(binChunk.length,0);binHeader.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(path.join(target,name+'.glb'),Buffer.concat([header,jsonChunk,binHeader,binChunk]));
}
for(const image of images){
 const opaque=/Bark|Rocks/.test(image),destination=path.join(target,opaque?image.replace('.png','.jpg'):image);
 // This one-time offline preparation uses macOS's image resampler. Runtime needs no tools.
 execFileSync('sips',[...(opaque?['-s','format','jpeg','-s','formatOptions','85']:[]),'-Z',opaque?'1024':'512',path.join(source,'glTF',image),'--out',destination],{stdio:'ignore'});
}
fs.copyFileSync(path.join(source,'License_Standard.txt'),path.join(target,'License.txt'));
console.log(`Prepared ${names.length} GLBs and ${images.size} shared textures.`);
