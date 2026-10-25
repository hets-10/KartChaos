import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const assetFiles={
 oak:'woodland/CommonTree_1.glb',oakWide:'woodland/CommonTree_3.glb',oakYoung:'woodland/CommonTree_5.glb',
 pine:'woodland/Pine_1.glb',pineWide:'woodland/Pine_3.glb',pineYoung:'woodland/Pine_5.glb',
 bush:'woodland/Bush_Common_Flowers.glb',fern:'woodland/Fern_1.glb',grass:'woodland/Grass_Wispy_Short.glb',
 rock:'woodland/Rock_Medium_1.glb',rockWide:'woodland/Rock_Medium_3.glb',deadTree:'woodland/DeadTree_2.glb',
 palm:'coastal/palm-detailed-bend.glb',palmTall:'coastal/palm-detailed-straight.glb',
 seaRock:'coastal/rocks-a.glb',seaRockB:'coastal/rocks-b.glb',seaRockC:'coastal/rocks-c.glb',
 fence:'coastal/structure-fence.glb',boat:'coastal/boat-row-large.glb',ship:'coastal/ship-small.glb',
 tower:'coastal/tower-complete-small.glb',barrel:'coastal/barrel.glb',
 cottage:'village/building-type-a.glb',villa:'village/building-type-c.glb',lodge:'village/building-type-h.glb',hotel:'village/building-type-l.glb',
 cactus:'nature/cactus_tall.glb',flower:'nature/flower_yellowB.glb',flowerPurple:'nature/flower_purpleB.glb',
} as const;
export type AssetName=keyof typeof assetFiles;
export type Placement={name:AssetName;x:number;y:number;z:number;height:number;rotation:number;tint?:string;stretch?:number};
type Part={geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial};
type Model={parts:Part[];radius:number};

// Only bytes are cached across races. Each scene owns its GPU resources and can dispose them safely.
const bytes=new Map<string,Promise<ArrayBuffer>>();
export class ArtAssets{
 private manager=new THREE.LoadingManager();
 private loader=new GLTFLoader(this.manager);
 private failedResource='';
 private models=new Map<AssetName,Model>();
 private materials=new Set<THREE.Material>();
 private textures=new Set<THREE.Texture>();
 private geometries=new Set<THREE.BufferGeometry>();
 private dead=false;
 readonly wind={value:0};
 constructor(private scene:THREE.Scene,private anisotropy:number){this.manager.onError=url=>{this.failedResource=url;};}
 async load(names:AssetName[]){
  await Promise.all([...new Set(names)].map(async name=>{
   const url='/art/'+assetFiles[name];
   if(!bytes.has(url))bytes.set(url,fetch(url).then(r=>{if(!r.ok)throw Error(`Could not load ${name}`);return r.arrayBuffer();}).catch(e=>{bytes.delete(url);throw e;}));
   const gltf=await this.loader.parseAsync((await bytes.get(url)!).slice(0),url.slice(0,url.lastIndexOf('/')+1));
   gltf.scene.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   const height=Math.max(size.y,.001),normalization=new THREE.Matrix4().makeScale(1/height,1/height,1/height).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
   const parts:Part[]=[];
   gltf.scene.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const geometry=object.geometry.clone().applyMatrix4(normalization.clone().multiply(object.matrixWorld));
    this.geometries.add(geometry);object.geometry.dispose();
    const material=object.material as THREE.MeshStandardMaterial;
    material.roughness=.84;material.metalness=0;material.envMapIntensity=.35;
    material.shadowSide=THREE.DoubleSide;
    for(const value of Object.values(material))if(value instanceof THREE.Texture){value.anisotropy=this.anisotropy;this.textures.add(value);}
    // Vertex colors in the source carry authored crevice shading; retain them.
    if(/Leaves|Leaf|Grass|Flowers/i.test(material.name)){
     material.alphaTest=.35;material.alphaToCoverage=true;
     material.onBeforeCompile=shader=>{
      shader.uniforms.artTime=this.wind;
      shader.vertexShader='uniform float artTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
       float phase = 0.0;
       #ifdef USE_INSTANCING
        phase = instanceMatrix[3].x * .13 + instanceMatrix[3].z * .11;
       #endif
       float bend = pow(max(position.y, 0.0), 1.7);
       transformed.x += sin(artTime * 1.3 + phase + position.y * 3.0) * .018 * bend;
       transformed.z += cos(artTime + phase + position.x * 4.0) * .009 * bend;`);
     };
     material.customProgramCacheKey=()=> 'kart-foliage-wind-v1';
    }
    this.materials.add(material);parts.push({geometry,material});
   });
   this.models.set(name,{parts,radius:Math.hypot(size.x,size.z)/height/2});
   if(this.dead)this.dispose();
  }));
  if(this.failedResource)throw new Error('Missing scenery resource: '+this.failedResource);
 }
 radius(name:AssetName,height:number){return (this.models.get(name)?.radius??1)*height;}
 place(placements:Placement[]){
  if(this.dead)return;
  // Spatial cells let the GPU skip clusters behind the camera rather than drawing a whole island.
  const buckets=new Map<string,Placement[]>();
  for(const p of placements){const key=`${p.name}:${Math.floor(p.x/140)}:${Math.floor(p.z/140)}`;const list=buckets.get(key)??[];list.push(p);buckets.set(key,list);}
  const transform=new THREE.Object3D();
  for(const list of buckets.values()){
   const model=this.models.get(list[0].name);if(!model)continue;
   for(const part of model.parts){
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,list.length);
    mesh.name='asset:'+list[0].name;mesh.userData.dynamic=true;mesh.castShadow=!['grass','fern','flower','flowerPurple'].includes(list[0].name);mesh.receiveShadow=true;
    list.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.rotation,0);transform.scale.set(p.height*(p.stretch??1),p.height,p.height);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,new THREE.Color(p.tint??'#ffffff'));});
    mesh.computeBoundingSphere();this.scene.add(mesh);
   }
  }
 }
 dispose(){this.dead=true;this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());this.geometries.clear();this.materials.clear();this.textures.clear();this.models.clear();}
}
