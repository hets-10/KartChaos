import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {surfaceTexture} from './art-materials';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** A lofted body panel: tapered ends, rolled shoulders and a domed top. */
export function bodyPanel(width:number,height:number,length:number){
 const positions:number[]=[],indices:number[]=[],uv:number[]=[];
 const sections=[[-.5,.62,.6],[-.46,.9,.85],[-.3,1,1],[.2,.96,.95],[.42,.75,.7],[.5,.48,.4]];
 const profile=[[-1,-.3],[-1,.05],[-.82,.42],[-.45,.5],[.45,.5],[.82,.42],[1,.05],[1,-.3],[.7,-.5],[-.7,-.5]];
 for(let j=0;j<sections.length;j++){
  const [z,w,h]=sections[j];
  for(let i=0;i<profile.length;i++){const [x,y]=profile[i];positions.push(x*width*.5*w,y*height*h,z*length);uv.push(i/profile.length,j/(sections.length-1));}
 }
 for(let j=0;j<sections.length-1;j++)for(let i=0;i<profile.length;i++){
  const a=j*profile.length+i,b=j*profile.length+(i+1)%profile.length,c=a+profile.length,d=b+profile.length;indices.push(a,c,b,b,c,d);
 }
 for(const end of [0,sections.length-1])for(let i=1;i<profile.length-1;i++){const a=end*profile.length;end===0?indices.push(a,a+i,a+i+1):indices.push(a,a+i+1,a+i);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

export function finishKart(group:THREE.Group,wheels:THREE.Mesh[],anisotropy:number){
 const alloy=new THREE.MeshStandardMaterial({color:'#bdc8c7',metalness:.85,roughness:.24});
 const carbon=new THREE.MeshStandardMaterial({color:'#142631',metalness:.2,roughness:.65});
 const red=new THREE.MeshStandardMaterial({color:'#f8734f',emissive:'#d43720',emissiveIntensity:.4,roughness:.3});
 const tread=surfaceTexture(anisotropy,'rubber');tread.repeat.set(3,1);
 const rubber=new THREE.MeshStandardMaterial({color:'#323d42',map:tread,bumpMap:tread,bumpScale:.018,roughness:.94});
 function add(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 // Engine cooling fins, a rear radiator and paired lights live inside the original kart envelope.
 add(new RoundedBoxGeometry(1.1,.45,.6,3,.07),carbon,group,0,.9,-1.24);
 for(let i=0;i<7;i++)add(new THREE.BoxGeometry(1.02,.025,.6),alloy,group,0,.73+i*.055,-1.24);
 for(const x of [-.86,.86])add(new RoundedBoxGeometry(.32,.12,.06,3,.03),red,group,x,.91,-1.48);
 for(const side of [-1,1]){
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.35,.48,1.25),new THREE.Vector3(side*.85,.46,.6),new THREE.Vector3(side*.95,.46,-.7),new THREE.Vector3(side*.5,.48,-1.3)]);
  add(new THREE.TubeGeometry(path,12,.065,7,false),alloy,group,0,0,0);
  const intake=add(new RoundedBoxGeometry(.32,.28,.65,2,.05),carbon,group,side*.86,.85,-.25);
  for(let j=0;j<4;j++)add(new THREE.BoxGeometry(.34,.025,.035),alloy,intake,0,.12,-.23+j*.14);
 }
 for(const wheel of wheels){
  wheel.material=rubber;
  for(const side of [-1,1]){
   const rim=add(new THREE.TorusGeometry(.29,.045,8,24),alloy,wheel,0,side*.255,0);rim.rotation.x=Math.PI/2;
   for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const spoke=add(new RoundedBoxGeometry(.07,.025,.44,2,.02),alloy,wheel,0,side*.26,0);spoke.rotation.y=a;}
   const sidewall=add(new THREE.TorusGeometry(.45,.018,5,28),carbon,wheel,0,side*.25,0);sidewall.rotation.x=Math.PI/2;
  }
 }
 group.traverse(o=>{if(o instanceof THREE.Mesh){o.receiveShadow=true;if(o.name==='driver-visor')o.material=new THREE.MeshPhysicalMaterial({color:'#233f53',roughness:.12,metalness:.6,clearcoat:1});}});
 // Combine the stationary details, while keeping the wheels and photo visor independently movable.
 group.updateMatrixWorld(true);
 function mergeParts(parent:THREE.Object3D,excluded:THREE.Object3D[]){
  const inverse=parent.matrixWorld.clone().invert(),buckets=new Map<string,{material:THREE.Material;name:string;parts:THREE.BufferGeometry[]}>(),originals:THREE.Mesh[]=[];
  function visit(object:THREE.Object3D){
   if(excluded.includes(object)||object.name==='driver-visor')return;
   if(object instanceof THREE.Mesh&&object!==parent&&!Array.isArray(object.material)){
    const geo=(object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone()).applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    if(!geo.getAttribute('uv'))geo.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count*2),2));
    const key=object.material.uuid+':'+object.name,bucket=buckets.get(key)??{material:object.material,name:object.name,parts:[] as THREE.BufferGeometry[]};bucket.parts.push(geo);buckets.set(key,bucket);originals.push(object);
   }
   object.children.forEach(visit);
  }
  parent.children.forEach(visit);
  for(const bucket of buckets.values()){const geo=mergeGeometries(bucket.parts);if(geo){const mesh=new THREE.Mesh(geo,bucket.material);mesh.name=bucket.name;mesh.receiveShadow=true;parent.add(mesh);}bucket.parts.forEach(p=>p.dispose());}
  const geometries=new Set(originals.map(o=>o.geometry));originals.forEach(o=>o.removeFromParent());geometries.forEach(g=>g.dispose());
 }
 wheels.forEach(w=>mergeParts(w,[]));mergeParts(group,wheels);
}
