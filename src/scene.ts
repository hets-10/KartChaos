import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Race,wrap,type PlayerConfig} from './game';
import {getTrack} from './tracks';
import {Particles} from './effects';
const UP=new THREE.Vector3(0,1,0);
export class IslandScene {
 portraits:THREE.Sprite[]=[];photoSources:(string|undefined)[]=[];disposed=false;
 reducedMotion=false;particles!:Particles;lastEffect=0;trailTimer=0;track=getTrack('sunset');
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();cameras=[new THREE.PerspectiveCamera(65,1,.1,1800),new THREE.PerspectiveCamera(65,1,.1,1800)];curve:THREE.CatmullRomCurve3;karts:THREE.Group[]=[];wheels:THREE.Mesh[][]=[];shields:THREE.Mesh[]=[];flames:THREE.Mesh[]=[];sparks:THREE.Mesh[][]=[];boxes:THREE.Group[]=[];hazards=new Map<number,THREE.Mesh>();width=1;height=1;elapsed=0;cameraReady=false;resizeObserver:ResizeObserver;materials=new Map<string,THREE.MeshStandardMaterial>();
 constructor(public host:HTMLDivElement,public race:Race,configs:PlayerConfig[]){
 this.track=getTrack(race.trackId);
 this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.setClearColor(this.track.sky);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;host.appendChild(this.renderer.domElement);this.scene.fog=new THREE.Fog(this.track.sky,220,700);
 this.scene.add(new THREE.HemisphereLight('#fff6d5','#487a6c',1.8));const sun=new THREE.DirectionalLight('#fff2ca',2.5);sun.position.set(100,180,50);this.scene.add(sun);
 this.curve=new THREE.CatmullRomCurve3(this.track.points.map(p=>new THREE.Vector3(...p)),true,'catmullrom',.38);
 this.buildIsland();this.particles=new Particles(this.scene);configs.forEach((c,i)=>this.makeKart(c.color,i));this.setColors(configs);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
 }
 mat(color:string,emissive=false){const key=color+emissive;if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true,...(emissive?{emissive:color,emissiveIntensity:.8}:{})}));return this.materials.get(key)!;}
 mesh(geometry:THREE.BufferGeometry,color:string,parent:THREE.Object3D=this.scene,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,this.mat(color));m.position.set(x,y,z);parent.add(m);return m;}
 point(distance:number,lane=0){const t=wrap(distance,(this.race?.length??1160))/(this.race?.length??1160),p=this.curve.getPointAt(t),tangent=this.curve.getTangentAt(t).normalize(),right=new THREE.Vector3().crossVectors(tangent,UP).normalize();return {p:p.addScaledVector(right,lane),tangent,right};}
 ribbon(inner:number,outer:number,color:string,height=0){const positions:number[]=[],indices:number[]=[];for(let i=0;i<=600;i++){for(const lane of [inner,outer]){const {p}=this.point(i/600*(this.race?.length??1160),lane);positions.push(p.x,p.y+height,p.z);}if(i<600){let a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();const m=this.mesh(g,color);m.material=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide});}
 buildIsland(){
 this.mesh(new THREE.CylinderGeometry(258,285,18,48),this.track.sand,this.scene,0,-11,0);this.mesh(new THREE.CylinderGeometry(243,257,8,48),this.track.ground,this.scene,0,-1,0);const water=this.mesh(new THREE.PlaneGeometry(4000,4000),this.track.water,this.scene,0,-20,0);water.rotation.x=-Math.PI/2;
 this.ribbon(-13,13,'#dec697',-.12);this.ribbon(-9,9,this.track.road);this.ribbon(-9,-8.5,'#fff3d6',.03);this.ribbon(8.5,9,'#fff3d6',.03);
 const curbGeometry=new THREE.BoxGeometry(.9,.45,4.4),dashGeo=new THREE.BoxGeometry(.18,.04,3);
 for(let i=0;i<250;i++){for(const lane of [-10,10]){const {p,tangent}=this.point(i/250*(this.race?.length??1160),lane);const m=this.mesh(curbGeometry,i%2?'#fff4db':this.track.accent,this.scene,p.x,p.y+.2,p.z);m.rotation.y=Math.atan2(tangent.x,tangent.z);}if(i%3===0){const {p,tangent}=this.point(i/250*(this.race?.length??1160));const m=this.mesh(dashGeo,'#b3bfbd',this.scene,p.x,p.y+.06,p.z);m.rotation.y=Math.atan2(tangent.x,tangent.z);}}
 // Deterministic, reusable low-poly palms, rocks, and spectator umbrellas.
 const trunkGeo=new THREE.CylinderGeometry(.5,.8,8,5),leafGeo=new THREE.ConeGeometry(this.track.id==='aurora'?3.5:5,this.track.id==='aurora'?6:2.5,5),rockGeo=new THREE.DodecahedronGeometry(this.track.id==='canyon'?4.5:2.5),umbrellaGeo=new THREE.ConeGeometry(4,2,8);
 for(let i=0;i<115;i++){const distance=(i*.618033%1)*(this.race?.length??1160),lane=(i%2?1:-1)*(22+(i*13%36));const {p}=this.point(distance,lane);p.y=3;if(i%4===0||this.track.id==='canyon'){const rock=this.mesh(rockGeo,this.track.id==='canyon'?'#9d554b':'#a2b8b0',this.scene,p.x,p.y,p.z);rock.scale.set(1,1+i%3*.4,1.4);}else{this.mesh(trunkGeo,'#b47a4b',this.scene,p.x,p.y+4,p.z);const leaf=this.mesh(leafGeo,i%2?'#328d67':'#4ca86e',this.scene,p.x,p.y+8,p.z);leaf.rotation.y=i;this.mesh(leafGeo,'#68b86b',this.scene,p.x,p.y+9.8,p.z).scale.setScalar(.75);}}
 for(let i=0;i<14;i++){const {p}=this.point(35+i*5,26);this.mesh(umbrellaGeo,['#ff8263','#f6cd65','#9a8bdf'][i%3],this.scene,p.x,8,p.z);this.mesh(new THREE.CylinderGeometry(.12,.12,5,5),'#fff4db',this.scene,p.x,4.5,p.z);}
 for(let i=0;i<24;i++){const {p,tangent}=this.point(i/24*(this.race?.length??1160),15);const pole=this.mesh(new THREE.BoxGeometry(.3,4,.3),'#fff4db',this.scene,p.x,p.y+2,p.z);const sign=this.mesh(new THREE.BoxGeometry(3,1.8,.25),'#f6ce61',this.scene,p.x,p.y+4,p.z);sign.rotation.y=Math.atan2(tangent.x,tangent.z);const arrow=this.mesh(new THREE.ConeGeometry(.6,1.5,3),'#354557',sign,0,0,.2);arrow.rotation.z=-Math.PI/2;pole.name='direction';}
 const start=new THREE.Group(),{p,tangent}=this.point(0);start.position.copy(p);start.rotation.y=Math.atan2(tangent.x,tangent.z);this.scene.add(start);
 for(let x=0;x<12;x++)for(let z=0;z<3;z++)this.mesh(new THREE.BoxGeometry(1.5,.06,1.3),(x+z)%2?'#fff9e6':'#253747',start,x*1.5-8.25,.06,z*1.3);
 for(const x of [-12,12])this.mesh(new THREE.BoxGeometry(1.3,12,1.3),'#f4eee0',start,x,6,0);this.mesh(new THREE.BoxGeometry(26,2.6,1.4),'#ff7356',start,0,12,0);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#ff7356';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff9e6';ctx.font='900 76px sans-serif';ctx.textAlign='center';ctx.fillText('KART CHAOS',512,92);const sign=new THREE.Mesh(new THREE.PlaneGeometry(23,2.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));sign.position.set(0,12,-.76);start.add(sign);
 if(this.track.id==='aurora'){for(let i=0;i<80;i++){this.mesh(new THREE.IcosahedronGeometry(.6),'#d7f6ff',this.scene,Math.sin(i*7)*400,110+(i*17%100),Math.cos(i*9)*400);}}
 this.batchStatic();
 for(let i=0;i<8;i++){const group=new THREE.Group();const cube=this.mesh(new THREE.BoxGeometry(2.3,2.3,2.3),'#f9cf64',group);cube.material=this.mat('#f9cf64',true);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry),new THREE.LineBasicMaterial({color:'#ffffff'}));cube.add(edge);this.mesh(new THREE.OctahedronGeometry(.65),'#fff8dc',group,0,2,0);this.scene.add(group);this.boxes.push(group);}
 }
 batchStatic(){
 this.scene.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>(),originals:THREE.Mesh[]=[];
 this.scene.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);const list=batches.get(o.material)??[];list.push(g);batches.set(o.material,list);originals.push(o);}});
 originals.forEach(o=>o.removeFromParent());const disposed=new Set<THREE.BufferGeometry>();originals.forEach(o=>{if(!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}});
 for(const [material,geometries] of batches){const merged=mergeGeometries(geometries,false);if(merged)this.scene.add(new THREE.Mesh(merged,material));geometries.forEach(g=>g.dispose());}
 }
 makeKart(color:string,id:number){
 const group=new THREE.Group();this.scene.add(group);this.karts.push(group);
 const body=(w:number,h:number,d:number,x:number,y:number,z:number)=>{
  const m=this.mesh(new RoundedBoxGeometry(w,h,d,2,.12),color,group,x,y,z);m.name='paint';return m;
 };
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.75,24),new THREE.MeshBasicMaterial({color:'#0c2635',transparent:true,opacity:.24,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.08;shadow.scale.set(.9,1.35,1);group.add(shadow);
 this.mesh(new RoundedBoxGeometry(2.15,.25,3.35,2,.1),'#16313b',group,0,.55,0);
 body(2.1,.45,2.9,0,.82,0);
 const hood=body(1.55,.48,1.35,0,1.01,1.05);hood.rotation.x=-.12;
 this.mesh(new THREE.BoxGeometry(.22,.035,1.25),'#fff2d4',hood,-.32,.25,0);
 this.mesh(new RoundedBoxGeometry(2.55,.25,.35,2,.08),'#c4dcd2',group,0,.65,1.85);
 this.mesh(new RoundedBoxGeometry(1.05,.85,.9,2,.16),'#183843',group,0,1.28,-.35);
 for(const x of [-.7,.7])this.mesh(new THREE.BoxGeometry(.12,.65,.16),'#173641',group,x,1.1,-1.35);
 const wing=body(2.65,.17,.58,0,1.46,-1.4);wing.rotation.x=.08;
 this.mesh(new THREE.BoxGeometry(.2,.02,.58),'#fff2d4',wing,-.35,.095,0);
 for(const x of [-1.24,1.24])body(.1,.35,.61,x,1.5,-1.4);
 this.mesh(new RoundedBoxGeometry(.8,.8,.65,2,.18),'#fff2d4',group,0,1.55,-.08);
 const helmet=this.mesh(new THREE.SphereGeometry(.63,20,14),color,group,0,2.19,-.08);helmet.name='paint';
 this.mesh(new THREE.SphereGeometry(.645,20,10,0,Math.PI,Math.PI*.34,Math.PI*.27),'#163c4d',group,0,2.19,-.08);
 this.mesh(new RoundedBoxGeometry(.16,.06,.74,2,.025),'#fff2d4',group,-.18,2.77,-.05);
 const steering=this.mesh(new THREE.TorusGeometry(.35,.055,6,16),'#17343d',group,0,1.55,.66);steering.rotation.x=-.5;
 for(const x of [-.4,.4]){
  const arm=this.mesh(new THREE.CapsuleGeometry(.14,.47,3,8),'#fff2d4',group,x,1.54,.35);arm.rotation.x=-.85;
  this.mesh(new THREE.SphereGeometry(.16,8,6),'#17343d',group,x*.78,1.53,.65);
  const exhaust=this.mesh(new THREE.CylinderGeometry(.15,.15,.65,10),'#aac5c3',group,x,.59,-1.82);exhaust.rotation.x=Math.PI/2;
 }
 const numberCanvas=document.createElement('canvas');numberCanvas.width=128;numberCanvas.height=128;
 const ctx=numberCanvas.getContext('2d')!;ctx.fillStyle='#fff2d4';ctx.beginPath();ctx.arc(64,64,54,0,Math.PI*2);ctx.fill();ctx.fillStyle='#173b40';ctx.font='italic 900 74px Arial';ctx.textAlign='center';ctx.fillText(String(id+1).padStart(2,'0'),62,91);
 const number=new THREE.Mesh(new THREE.PlaneGeometry(.6,.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(numberCanvas),transparent:true,depthWrite:false}));number.rotation.x=-Math.PI/2;number.position.set(.29,1.28,1.12);group.add(number);
 const wheels:THREE.Mesh[]=[];
 for(const x of [-1.18,1.18])for(const z of [-1.03,1.08]){
  const w=this.mesh(new THREE.CylinderGeometry(.55,.55,.48,16),'#142933',group,x,.59,z);w.rotation.z=Math.PI/2;
  const hub=this.mesh(new THREE.CylinderGeometry(.27,.27,.5,12),'#9ab8b5',w);
  this.mesh(new THREE.CylinderGeometry(.1,.1,.53,8),'#183843',hub);
  wheels.push(w);
 }this.wheels.push(wheels);
 const shield=new THREE.Mesh(new THREE.SphereGeometry(2.4,16,12),new THREE.MeshBasicMaterial({color:'#7aeeff',transparent:true,opacity:.22,wireframe:true}));shield.position.y=1;group.add(shield);this.shields.push(shield);
 const flame=this.mesh(new THREE.ConeGeometry(.5,2,8),'#ffcb57',group,0,.65,-2.3);flame.rotation.x=-Math.PI/2;flame.material=this.mat('#ffb94b',true);this.flames.push(flame);
 const sparks:THREE.Mesh[]=[];for(let j=0;j<12;j++){const s=this.mesh(new THREE.IcosahedronGeometry(.15),j%2?'#b9eaff':'#ffcf5a',group);s.material=this.mat(j%2?'#b9eaff':'#ffcf5a',true);sparks.push(s);}this.sparks.push(sparks);
 }
 setColors(configs:PlayerConfig[]){this.karts.forEach((g,i)=>{
  g.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='paint')o.material=this.mat(configs[i].color);});
  const source=this.race.mode==='solo'&&i===1?undefined:configs[i].photo;
  if(this.photoSources[i]===source)return;this.photoSources[i]=source;
  const prior=this.portraits[i];if(prior){prior.removeFromParent();prior.material.map?.dispose();prior.material.dispose();delete this.portraits[i];}
  if(!source)return;
  const img=new Image();img.onload=()=>{
   if(this.disposed||this.photoSources[i]!==source)return;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
   ctx.fillStyle='#fff4d9';ctx.beginPath();ctx.arc(128,128,128,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(128,128,118,0,Math.PI*2);ctx.clip();ctx.drawImage(img,10,10,236,236);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));sprite.position.set(0,2.75,-.08);sprite.scale.set(1.7,1.7,1);g.add(sprite);this.portraits[i]=sprite;
  };img.src=source;
 });}
 resize(){this.width=this.host.clientWidth;this.height=this.host.clientHeight;this.renderer.setSize(this.width,this.height);this.cameras.forEach(c=>{c.aspect=this.width/(this.height/(this.race.split?2:1));c.updateProjectionMatrix();});}
 render(dt:number,menu=false){const animated=this.race.phase==='racing';if(animated||menu)this.elapsed+=dt;const t=this.elapsed;
 this.trailTimer+=dt;const trail=this.trailTimer>.045;if(trail)this.trailTimer=0;
 for(const effect of this.race.effects)if(effect.id>this.lastEffect){const {p}=this.point(effect.distance,effect.lane);p.y+=1;this.particles.emit(p,effect.type==='hit'?'#ff7356':effect.type==='boost'?'#74eaff':'#ffcf69',this.reducedMotion?4:22,effect.type==='hit'?12:6,.8);this.lastEffect=effect.id;}
 this.particles.update(animated?dt:0);
 this.karts.forEach((g,i)=>{const k=this.race.karts[i];g.visible=i===0||!this.race.freePlay;const {p,tangent}=this.point(k.distance,k.lane);g.position.copy(p);g.position.y+=this.reducedMotion?0:Math.sin(t*15)*.035*(k.speed/28)+Math.sin(Math.min(1,k.hop/.65)*Math.PI)*1.8;g.rotation.set(0,Math.atan2(tangent.x,tangent.z)+(k.spin>0?(this.reducedMotion?0:k.spin*15):k.steer*(k.drifting?.4:.12)),this.reducedMotion?0:-k.steer*.08);this.wheels[i].forEach(w=>w.rotation.x-=animated?k.speed*dt*1.8:0);this.shields[i].visible=k.shield>0;this.flames[i].visible=k.boost>0;this.flames[i].scale.setScalar(this.reducedMotion?1:.8+Math.sin(t*40)*.25);this.sparks[i].forEach((s,j)=>{s.visible=!this.reducedMotion&&(k.drifting||k.boost>0);s.position.set((j%2?1:-1)*(1.1+(t*3+j*.3)%1),.3+Math.sin(t*7+j)*.2,-1.2-(t*8+j*.4)%4);s.scale.setScalar(k.charge>2?1.6:1);});
 if(trail&&animated&&g.visible){const tail=p.clone().addScaledVector(tangent,-2.5);tail.y+=.6;if(k.drifting)this.particles.emit(tail,k.charge>2?'#cd8aff':'#b9c4cf',this.reducedMotion?1:3,2,1.2);if(k.boost>0)this.particles.emit(tail,'#64dfff',this.reducedMotion?1:4,1,.6);}
 const camera=this.cameras[i];camera.aspect=this.width/(this.height/(this.race.split?2:1));const desired=p.clone().addScaledVector(tangent,-11);desired.y+=6.5;if(!this.reducedMotion&&k.impact>0){desired.x+=Math.sin(t*90)*k.impact*.5;desired.y+=Math.cos(t*70)*k.impact*.3;}camera.position.lerp(desired,this.cameraReady?1-Math.exp(-dt*6):1);const look=p.clone().addScaledVector(tangent,11);look.y+=1.4;camera.lookAt(look);camera.fov=65+(!this.reducedMotion&&k.boost>0?8:0);camera.updateProjectionMatrix();});this.cameraReady=true;
 this.boxes.forEach((b,i)=>{const box=this.race.pickups[i]??{distance:100+i*140,lane:i%2?-3:3,ready:0};b.visible=!this.race.freePlay&&box.ready<=this.race.time;const {p}=this.point(box.distance,box.lane);b.position.copy(p);b.position.y+=2.1+(this.reducedMotion?0:Math.sin(t*2+i)*.35);b.rotation.y=this.reducedMotion?0:t;});
 const alive=new Set(this.race.hazards.map(h=>h.id));for(const [id,m] of this.hazards)if(!alive.has(id)){this.scene.remove(m);m.geometry.dispose();this.hazards.delete(id);}
 for(const h of this.race.hazards){let m=this.hazards.get(h.id);if(!m){m=this.mesh(h.kind==='rocket'?new THREE.ConeGeometry(.5,2,8):new THREE.TorusGeometry(.6,.2,6,10,Math.PI),h.kind==='rocket'?'#ff624d':'#ffdf54');this.hazards.set(h.id,m);}const {p,tangent}=this.point(h.distance,h.lane);m.position.copy(p);m.position.y+=h.kind==='rocket'?1.5:.4;m.rotation.set(h.kind==='rocket'?Math.PI/2:0,Math.atan2(tangent.x,tangent.z),0);}
 this.renderer.setScissorTest(true);
 if(menu){const camera=this.cameras[0];camera.aspect=this.width/this.height;camera.updateProjectionMatrix();camera.position.set(Math.sin(this.reducedMotion?.6:t*.045)*240,165,Math.cos(this.reducedMotion?.6:t*.045)*240);camera.lookAt(0,0,0);this.renderer.setViewport(0,0,this.width,this.height);this.renderer.setScissor(0,0,this.width,this.height);this.renderer.render(this.scene,camera);camera.aspect=this.width/(this.height/2);}else{const views=this.race.split?2:1;for(let i=0;i<views;i++){const viewHeight=i===0&&views===2?Math.ceil(this.height/2):Math.floor(this.height/views),y=i===0&&views===2?Math.floor(this.height/2):0;this.renderer.setViewport(0,y,this.width,viewHeight);this.renderer.setScissor(0,y,this.width,viewHeight);this.renderer.render(this.scene,this.cameras[i]);}}
 }
 dispose(){this.disposed=true;this.portraits.forEach(p=>{p.material.map?.dispose();p.material.dispose();});this.resizeObserver.disconnect();this.particles.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>{if('map'in m)(m.map as THREE.Texture|null)?.dispose();m.dispose();});this.renderer.dispose();this.renderer.domElement.remove();}
}
