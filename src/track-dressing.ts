import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {IslandScene} from './scene';
import type {Landscape} from './landscape';
import {signTexture} from './art-materials';

export function dressCircuit(world:IslandScene,ground:Landscape){
 const night=world.track.id==='aurora';
 const material=(color:string,metalness=0,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const dark=material('#24434b',.5,.35),ivory=material('#eae6d5'),coral=material(world.track.accent),metal=material('#9caeab',.7,.3);
 const glow=new THREE.MeshStandardMaterial({color:'#d6f6ee',emissive:night?'#66dac5':'#fff0c2',emissiveIntensity:night?2:.3});
 const flagCanvas=document.createElement('canvas');flagCanvas.width=128;flagCanvas.height=256;const flagContext=flagCanvas.getContext('2d')!;
 flagContext.fillStyle='#f1e8cc';flagContext.fillRect(0,0,128,256);flagContext.fillStyle='#22434b';flagContext.font='italic 900 62px Arial';flagContext.textAlign='center';flagContext.fillText('K',64,102);flagContext.fillText('C',64,162);
 for(let row=0;row<2;row++)for(let col=0;col<8;col++)if((row+col)%2===0)flagContext.fillRect(col*16,214+row*16,16,16);
 const flagMap=new THREE.CanvasTexture(flagCanvas);flagMap.colorSpace=THREE.SRGBColorSpace;
 const flagMaterials=['#ef805e','#d9db99'].map(color=>new THREE.MeshStandardMaterial({color,map:flagMap,side:THREE.DoubleSide,roughness:.95}));
 const root=new THREE.Group();root.name='circuit-detail';world.scene.add(root);
 function add(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const post=new RoundedBoxGeometry(.3,2.5,.3,2,.07),rail=new RoundedBoxGeometry(4.8,.28,.24,2,.08);
 // Rails follow the tangent along the road, never extending across the driving line.
 for(let i=0;i<240;i++)for(const side of [-1,1]){
  if(i%10>5)continue;
  const {p,tangent}=world.point(i/240*world.track.length,side*13.8),g=ground(p.x,p.z);if(g.distance<13)continue;
  const group=new THREE.Group();group.position.set(p.x,g.y,p.z);group.rotation.y=Math.atan2(tangent.x,tangent.z);root.add(group);
  add(post,ivory,group,0,1.25);for(const y of [.95,1.8])add(rail,i%5===0?coral:dark,group,0,y).rotation.y=Math.PI/2;
 }
 // Hand-built curved lamp profiles and hanging race pennants provide an inhabited circuit scale.
 for(let i=0;i<30;i++){
  const {p,tangent}=world.point((i+.25)/30*world.track.length,i%2?16:-16),g=ground(p.x,p.z);if(g.distance<14)continue;
  const group=new THREE.Group();group.position.set(p.x,g.y,p.z);group.rotation.y=Math.atan2(tangent.x,tangent.z);root.add(group);
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,5.5,0),new THREE.Vector3(.5,6.5,0),new THREE.Vector3(1.9,6.5,0)]);
  add(new THREE.TubeGeometry(path,18,.1,6,false),dark,group);
  add(new RoundedBoxGeometry(1.3,.2,.65,2,.1),metal,group,1.6,6.5);
  add(new THREE.PlaneGeometry(1,.48),glow,group,1.6,6.37).rotation.x=Math.PI/2;
  const flagGeo=new THREE.PlaneGeometry(1.1,2.4,6,8);flagGeo.translate(.7,-1.1,0);
  const flagMat=flagMaterials[i%2];
  const flag=add(flagGeo,flagMat,group,.25,5.5,0);flag.userData.dynamic=true;world.flags.push(flag);
 }
 const labels=world.track.id==='sunset'?['SALTWATER CLUB','CEDAR GROVE','COPPER RIDGE']:world.track.id==='canyon'?['RED ROCK PASS','PALM SPRINGS','AMETHYST HOLLOW']:['FROSTLINE','NIGHT GARDEN','PRISM VALLEY'];
 for(let i=0;i<3;i++){
  const {p,tangent}=world.point((i+.08)/3*world.track.length,22),g=ground(p.x,p.z);if(g.distance<19)continue;
  const group=new THREE.Group();group.position.set(p.x,g.y,p.z);group.rotation.y=Math.atan2(tangent.x,tangent.z)+Math.PI;root.add(group);
  for(const x of [-3.6,3.6])add(new RoundedBoxGeometry(.22,5,.22,2,.04),dark,group,x,2.5);
  add(new RoundedBoxGeometry(9,3.5,.35,3,.18),ivory,group,0,4.7);
  const sign=add(new THREE.PlaneGeometry(8.7,3.26),new THREE.MeshStandardMaterial({map:signTexture(labels[i],`SECTOR 0${i+1}   /   ${world.track.name.toUpperCase()}`,world.track.accent),roughness:.85}),group,0,4.7,.19);sign.material.side=THREE.DoubleSide;
 }
 // A shaped trackside grand-tour pavilion: pitched canopy, exposed ribs, deck and counters.
 const {p,tangent}=world.point(world.track.length*.035,-30),g=ground(p.x,p.z);
 if(g.distance>25){
  const pavilion=new THREE.Group();pavilion.position.set(p.x,g.y,p.z);pavilion.rotation.y=Math.atan2(tangent.x,tangent.z);root.add(pavilion);
  add(new RoundedBoxGeometry(13,.5,7,2,.15),ivory,pavilion,0,.25);
  for(const x of [-5.5,0,5.5])for(const z of [-2.7,2.7])add(new RoundedBoxGeometry(.16,5,.16,2,.04),dark,pavilion,x,2.5,z);
  const roof=new THREE.Shape();roof.moveTo(-3.8,0);roof.lineTo(0,2);roof.lineTo(3.8,0);roof.lineTo(3.8,-.18);roof.lineTo(0,1.78);roof.lineTo(-3.8,-.18);roof.closePath();
  const canopy=add(new THREE.ExtrudeGeometry(roof,{depth:14,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.06}),coral,pavilion,-7,5,0);canopy.rotation.y=Math.PI/2;
  for(const x of [-4,0,4])add(new RoundedBoxGeometry(2.7,1.5,1.3,3,.12),dark,pavilion,x,1,0);
 }
 // Friendly sculpted spectator silhouettes: soft clothing, shoes, hair, faces and raised arms.
 const head=new THREE.SphereGeometry(.3,12,8),body=new THREE.CapsuleGeometry(.28,.42,3,8),limb=new THREE.CapsuleGeometry(.09,.5,3,6),shoe=new RoundedBoxGeometry(.22,.15,.38,2,.06);
 const skins=['#e6b68c','#97613f','#f1d1ab'].map(c=>material(c)),shirts=['#e37958','#63abb8','#d4d98f','#a097bc'].map(c=>material(c));
 const pants=material('#29465c'),hair=material('#42352d');
 for(let c=0;c<12;c++)for(let j=0;j<5;j++){
  const {p,tangent}=world.point((c+.07)/12*world.track.length+j*1.2,c%2?18:-18),g=ground(p.x,p.z);if(g.distance<16)continue;
  const person=new THREE.Group();person.position.set(p.x,g.y,p.z);person.rotation.y=Math.atan2(tangent.x,tangent.z)+(c%2?-Math.PI/2:Math.PI/2);person.scale.setScalar(.9+(j%3)*.08);root.add(person);
  for(const x of [-.16,.16]){add(limb,pants,person,x,.43);add(shoe,dark,person,x,.08,.08);}
  add(body,shirts[(c+j)%4],person,0,1.02);add(head,skins[j%3],person,0,1.65);add(new THREE.SphereGeometry(.305,10,6,0,Math.PI*2,0,Math.PI*.48),hair,person,0,1.7);
  for(const x of [-.1,.1])add(new THREE.SphereGeometry(.032,5,4),dark,person,x,1.68,.28);
  for(const side of [-1,1]){const arm=add(limb,skins[j%3],person,side*.4,1.28);arm.rotation.z=side*(j%2?.9:1.9);if(j===2){arm.userData.dynamic=true;arm.userData.baseRotationZ=arm.rotation.z;arm.userData.phase=c;world.fanArms.push(arm);}}
 }
 // Keep static authored detail in a few material/attribute-compatible batches.
 root.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();const originals:THREE.Mesh[]=[];
 root.traverse(o=>{if(o instanceof THREE.Mesh&&!o.userData.dynamic){if((o.material as THREE.MeshStandardMaterial).map)return;const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);geo.deleteAttribute('uv');const list=batches.get(o.material as THREE.Material)??[];list.push(geo);batches.set(o.material as THREE.Material,list);originals.push(o);}});
 for(const [mat,geos]of batches){const geometry=mergeGeometries(geos);if(geometry){const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.dynamic=true;world.scene.add(mesh);}geos.forEach(g=>g.dispose());}
 const shared=new Set<THREE.BufferGeometry>();originals.forEach(o=>{shared.add(o.geometry);o.removeFromParent();});shared.forEach(g=>g.dispose());
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.userData.dynamic=true;});
}
