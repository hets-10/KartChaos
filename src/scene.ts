import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {Race,wrap,type PlayerConfig} from './game';
import {getTrack} from './tracks';
import {Particles} from './effects';
import {buildWorld,type WorldVisuals} from './world';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {surfaceTexture} from './art-materials';
import {bodyPanel,finishKart} from './kart-art';
const UP=new THREE.Vector3(0,1,0);
export class IslandScene {
 portraits:THREE.Sprite[]=[];photoSources:(string|undefined)[]=[];flags:THREE.Object3D[]=[];fanArms:THREE.Object3D[]=[];disposed=false;
 reducedMotion=false;particles!:Particles;lastEffect=0;trailTimer=0;track=getTrack('sunset');world!:WorldVisuals;environmentTarget!:THREE.WebGLRenderTarget;paintMaterials=new Map<string,THREE.MeshPhysicalMaterial>();
 renderer:THREE.WebGLRenderer;scene=new THREE.Scene();cameras=[new THREE.PerspectiveCamera(65,1,.1,1800),new THREE.PerspectiveCamera(65,1,.1,1800)];curve:THREE.CatmullRomCurve3;karts:THREE.Group[]=[];wheels:THREE.Mesh[][]=[];shields:THREE.Mesh[]=[];flames:THREE.Mesh[]=[];sparks:THREE.Mesh[][]=[];boxes:THREE.Group[]=[];hazards=new Map<number,THREE.Mesh>();width=1;height=1;elapsed=0;cameraReady=false;resizeObserver:ResizeObserver;materials=new Map<string,THREE.MeshStandardMaterial>();
 constructor(public host:HTMLDivElement,public race:Race,configs:PlayerConfig[]){
 this.track=getTrack(race.trackId);
 this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(this.track.sky);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;host.appendChild(this.renderer.domElement);this.scene.fog=new THREE.Fog(this.track.id==='aurora'?'#58638e':'#b9d9de',550,1400);
 const night=this.track.id==='aurora';
 this.scene.add(new THREE.HemisphereLight(night?'#bccbff':'#e5f3ff',night?'#48516d':'#847657',night?1.35:1.8));const sun=new THREE.DirectionalLight(night?'#bdcdff':'#ffe4bb',night?1.8:3.1);sun.position.set(-160,240,-120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-310;sun.shadow.camera.right=310;sun.shadow.camera.top=310;sun.shadow.camera.bottom=-310;sun.shadow.camera.far=900;sun.shadow.bias=-.00015;sun.shadow.normalBias=.18;this.scene.add(sun);
 sun.intensity=night?1.8:2.7;this.scene.children.forEach(o=>{if(o instanceof THREE.HemisphereLight)o.intensity=night?1.2:1.05;});
 const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environmentTarget=pmrem.fromScene(room,.04);this.scene.environment=this.environmentTarget.texture;this.scene.environmentIntensity=night?.3:.38;room.dispose();pmrem.dispose();
 this.curve=new THREE.CatmullRomCurve3(this.track.points.map(p=>new THREE.Vector3(...p)),true,'catmullrom',.38);
 this.buildIsland();this.particles=new Particles(this.scene);configs.forEach((c,i)=>this.makeKart(c.color,i));this.setColors(configs);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
 }
 mat(color:string,emissive=false){const key=color+emissive;if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true,...(emissive?{emissive:color,emissiveIntensity:.8}:{})}));return this.materials.get(key)!;}
 paint(color:string){if(!this.paintMaterials.has(color))this.paintMaterials.set(color,new THREE.MeshPhysicalMaterial({color,roughness:.3,metalness:.25,clearcoat:1,clearcoatRoughness:.18}));return this.paintMaterials.get(color)!;}
 mesh(geometry:THREE.BufferGeometry,color:string,parent:THREE.Object3D=this.scene,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,this.mat(color));m.position.set(x,y,z);parent.add(m);return m;}
 point(distance:number,lane=0){const t=wrap(distance,(this.race?.length??1160))/(this.race?.length??1160),p=this.curve.getPointAt(t),tangent=this.curve.getTangentAt(t).normalize(),right=new THREE.Vector3().crossVectors(tangent,UP).normalize();return {p:p.addScaledVector(right,lane),tangent,right};}
 ribbon(inner:number,outer:number,color:string,height=0){
  const positions:number[]=[],indices:number[]=[],uv:number[]=[];
  for(let i=0;i<=600;i++){
   for(const lane of [inner,outer]){const {p}=this.point(i/600*this.track.length,lane);positions.push(p.x,p.y+height,p.z);uv.push(lane/4,i/600*this.track.length/4);}
   if(i<600){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color,roughness:.95,side:THREE.DoubleSide});
  if(inner===-9&&outer===9){const map=surfaceTexture(Math.min(8,this.renderer.capabilities.getMaxAnisotropy()),'asphalt');material.map=map;material.bumpMap=map;material.bumpScale=.012;material.color.set(this.track.id==='aurora'?'#58677f':'#56616a');}
  this.scene.add(new THREE.Mesh(geometry,material));
 }
 buildIsland(){
 this.world=buildWorld(this);
 this.ribbon(-13,13,this.track.id==='aurora'?'#b3cbd8':'#b6ae96',-.12);this.ribbon(-9,9,this.track.road);this.ribbon(-9,-8.5,'#fff3d6',.03);this.ribbon(8.5,9,'#fff3d6',.03);
 const curbGeometry=new RoundedBoxGeometry(.9,.28,4.4,2,.08),dashGeo=new THREE.BoxGeometry(.18,.04,3);
 for(let i=0;i<250;i++){for(const lane of [-10,10]){const {p,tangent}=this.point(i/250*(this.race?.length??1160),lane);const m=this.mesh(curbGeometry,i%2?'#fff4db':this.track.accent,this.scene,p.x,p.y+.2,p.z);m.rotation.y=Math.atan2(tangent.x,tangent.z);}if(i%3===0){const {p,tangent}=this.point(i/250*(this.race?.length??1160));const m=this.mesh(dashGeo,'#b3bfbd',this.scene,p.x,p.y+.06,p.z);m.rotation.y=Math.atan2(tangent.x,tangent.z);}}
 const padGeo=new THREE.BoxGeometry(11,.08,2.2);for(const ratio of [.22,.64]){const {p,tangent}=this.point((this.race?.length??1160)*ratio);const pad=this.mesh(padGeo,'#d8ed83',this.scene,p.x,p.y+.1,p.z);pad.rotation.y=Math.atan2(tangent.x,tangent.z);}
 const start=new THREE.Group(),{p,tangent}=this.point(0);start.position.copy(p);start.rotation.y=Math.atan2(tangent.x,tangent.z);this.scene.add(start);
 for(let x=0;x<12;x++)for(let z=0;z<3;z++)this.mesh(new THREE.BoxGeometry(1.5,.06,1.3),(x+z)%2?'#fff9e6':'#253747',start,x*1.5-8.25,.06,z*1.3);
 for(const x of [-12,12])this.mesh(new THREE.BoxGeometry(1.3,12,1.3),'#f4eee0',start,x,6,0);this.mesh(new THREE.BoxGeometry(26,2.6,1.4),'#ff7356',start,0,12,0);
 const startLightGeo=new THREE.SphereGeometry(.34,10,8);for(const x of [-2.2,0,2.2]){const light=this.mesh(startLightGeo,'#ff6748',start,x,10.8,.18);light.material=this.mat('#ff6748',true);}
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#ff7356';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#fff9e6';ctx.font='900 76px sans-serif';ctx.textAlign='center';ctx.fillText('KART CHAOS',512,92);const sign=new THREE.Mesh(new THREE.PlaneGeometry(23,2.8),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),side:THREE.DoubleSide}));sign.position.set(0,12,-.76);start.add(sign);
 this.batchStatic();
 const itemCanvas=document.createElement('canvas');itemCanvas.width=itemCanvas.height=128;const itemCtx=itemCanvas.getContext('2d')!;
 itemCtx.fillStyle='#173f49';itemCtx.fillRect(0,0,128,128);itemCtx.strokeStyle='#e5eac0';itemCtx.lineWidth=5;itemCtx.strokeRect(10,10,108,108);itemCtx.fillStyle='#f3e9b2';itemCtx.font='italic 900 92px Arial';itemCtx.textAlign='center';itemCtx.fillText('?',62,99);
 const itemMap=new THREE.CanvasTexture(itemCanvas);itemMap.colorSpace=THREE.SRGBColorSpace;
 const itemFace=new THREE.MeshStandardMaterial({map:itemMap,roughness:.25,metalness:.2,emissive:'#567d77',emissiveMap:itemMap,emissiveIntensity:.45});
 const itemShell=new THREE.MeshPhysicalMaterial({color:'#9ee1d6',roughness:.2,metalness:.3,clearcoat:1});
 for(let i=0;i<8;i++){
  const group=new THREE.Group();const cube=new THREE.Mesh(new RoundedBoxGeometry(2.3,2.3,2.3,3,.16),itemShell);group.add(cube);
  for(let side=0;side<4;side++){const face=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),itemFace);face.rotation.y=side*Math.PI/2;face.position.set(Math.sin(face.rotation.y)*1.16,0,Math.cos(face.rotation.y)*1.16);group.add(face);}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.65,.045,6,32),this.mat('#a8f0de',true));ring.rotation.x=Math.PI/2;ring.position.y=-1.4;group.add(ring);this.scene.add(group);this.boxes.push(group);
 }
 }
 batchStatic(){
 this.scene.updateMatrixWorld(true);const batches=new Map<THREE.Material,THREE.BufferGeometry[]>(),originals:THREE.Mesh[]=[];
 this.scene.traverse(o=>{if(o instanceof THREE.Mesh&&!o.userData.dynamic&&!Array.isArray(o.material)){const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);const list=batches.get(o.material)??[];list.push(g);batches.set(o.material,list);originals.push(o);}});
 originals.forEach(o=>o.removeFromParent());const disposed=new Set<THREE.BufferGeometry>();originals.forEach(o=>{if(!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}});
 for(const [material,geometries] of batches){const merged=mergeGeometries(geometries,false);if(merged){const batch=new THREE.Mesh(merged,material);batch.receiveShadow=material instanceof THREE.MeshStandardMaterial;batch.castShadow=[...this.materials.values()].includes(material as THREE.MeshStandardMaterial);this.scene.add(batch);}geometries.forEach(g=>g.dispose());}
 }
 makeKart(color:string,id:number){
 const group=new THREE.Group();this.scene.add(group);this.karts.push(group);
 const body=(w:number,h:number,d:number,x:number,y:number,z:number)=>{
  const m=this.mesh(h>.3&&w>1?bodyPanel(w,h,d):new RoundedBoxGeometry(w,h,d,3,.1),color,group,x,y,z);m.name='paint';return m;
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
 const visor=this.mesh(new THREE.SphereGeometry(.645,20,10,0,Math.PI,Math.PI*.34,Math.PI*.27),'#163c4d',group,0,2.19,-.08);visor.name='driver-visor';
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
 }this.wheels.push(wheels);finishKart(group,wheels,Math.min(8,this.renderer.capabilities.getMaxAnisotropy()));
 const shield=new THREE.Mesh(new THREE.SphereGeometry(2.4,16,12),new THREE.MeshBasicMaterial({color:'#7aeeff',transparent:true,opacity:.22,wireframe:true}));shield.position.y=1;group.add(shield);this.shields.push(shield);
 const flame=this.mesh(new THREE.ConeGeometry(.5,2,8),'#ffcb57',group,0,.65,-2.3);flame.rotation.x=-Math.PI/2;flame.material=this.mat('#ffb94b',true);this.flames.push(flame);
 const sparks:THREE.Mesh[]=[];for(let j=0;j<12;j++){const s=this.mesh(new THREE.IcosahedronGeometry(.15),j%2?'#b9eaff':'#ffcf5a',group);s.material=this.mat(j%2?'#b9eaff':'#ffcf5a',true);sparks.push(s);}this.sparks.push(sparks);
 }
 setColors(configs:PlayerConfig[]){this.karts.forEach((g,i)=>{
  const source=this.race.mode==='solo'&&i===1?undefined:configs[i].photo;
  g.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='paint')o.material=this.paint(configs[i].color);if(o instanceof THREE.Mesh&&o.name==='driver-visor')o.visible=!source;});
  if(this.photoSources[i]===source)return;this.photoSources[i]=source;
  const prior=this.portraits[i];if(prior){prior.removeFromParent();prior.material.map?.dispose();prior.material.dispose();delete this.portraits[i];}
  if(!source)return;
  const img=new Image();img.onload=()=>{
   if(this.disposed||this.photoSources[i]!==source)return;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
   ctx.fillStyle='#fff4d9';ctx.beginPath();ctx.arc(128,128,127,0,Math.PI*2);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(128,128,121,0,Math.PI*2);ctx.clip();ctx.drawImage(img,7,7,242,242);ctx.restore();
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:false,depthTest:false,depthWrite:false,toneMapped:false}));sprite.renderOrder=20;sprite.position.set(0,2.2,-.78);sprite.scale.set(1.95,1.95,1);g.add(sprite);this.portraits[i]=sprite;
  };img.src=source;
 });}
 resize(){this.width=this.host.clientWidth;this.height=this.host.clientHeight;this.renderer.setSize(this.width,this.height);this.cameras.forEach(c=>{c.aspect=this.width/(this.height/(this.race.split?2:1));c.updateProjectionMatrix();});}
 render(dt:number,menu=false){const animated=this.race.phase==='racing';if(animated||menu)this.elapsed+=dt;const t=this.elapsed;
 this.world.update(t,this.reducedMotion);
 this.flags.forEach((flag,i)=>{flag.rotation.z=this.reducedMotion?0:Math.sin(t*2.4+i*.8)*.06;});
 this.fanArms.forEach((arm)=>{arm.rotation.z=Number(arm.userData.baseRotationZ)+(this.reducedMotion?0:Math.sin(t*3.1+Number(arm.userData.phase))*.16);});
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
 dispose(){this.disposed=true;this.world.dispose();this.portraits.forEach(p=>{p.material.map?.dispose();p.material.dispose();});this.resizeObserver.disconnect();this.particles.dispose();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();this.scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});this.materials.forEach(m=>materials.add(m));this.paintMaterials.forEach(m=>materials.add(m));geometries.forEach(g=>g.dispose());materials.forEach(m=>{Object.values(m).forEach(value=>{if(value instanceof THREE.Texture)textures.add(value);});m.dispose();});textures.forEach(t=>t.dispose());this.environmentTarget.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
