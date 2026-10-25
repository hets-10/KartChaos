import * as THREE from 'three';
import type {IslandScene} from './scene';

type Biome='coast'|'forest'|'mesa'|'oasis'|'snow'|'crystal';
const routes:Record<string,Biome[]>={sunset:['coast','forest','mesa'],canyon:['mesa','oasis','crystal'],aurora:['snow','forest','crystal']};
const colors:Record<Biome,string>={coast:'#d9b978',forest:'#42876a',mesa:'#b86b47',oasis:'#7a9d59',snow:'#c8dfe8',crystal:'#606890'};

/** A continuous landscape shared by scenery placement and the visible ground mesh. */
export function buildWorld(world:IslandScene){
 const {scene,track}=world,night=track.id==='aurora';
 const samples=Array.from({length:640},(_,i)=>world.point(i/640*track.length).p);
 const route=routes[track.id];
 function ground(x:number,z:number){
  let best=Infinity,index=0;
  for(let i=0;i<samples.length;i++){const p=samples[i],d=(p.x-x)**2+(p.z-z)**2;if(d<best){best=d;index=i;}}
  const distance=Math.sqrt(best),t=index/samples.length,zone=t*3,biome=route[Math.floor(zone)%3];
  const fade=THREE.MathUtils.smoothstep(distance,13,65);
  const hills=5+Math.sin(x*.027)*Math.cos(z*.033)*5;
  const coast=THREE.MathUtils.smoothstep(Math.hypot(x,z),235,320);
  const y=THREE.MathUtils.lerp(samples[index].y-.65,hills,fade)*(1-coast)-18*coast;
  return {y,distance,biome,zone,t};
 }
 // Smoothly blended ground color makes the transitions gradual rather than hard wedges.
 const terrain=new THREE.PlaneGeometry(700,700,150,150);terrain.rotateX(-Math.PI/2);
 const positions=terrain.getAttribute('position'),rgb:number[]=[];
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),g=ground(x,z);positions.setY(i,g.y);
  const sector=Math.floor(g.zone),blend=THREE.MathUtils.smoothstep(g.zone-sector,.75,1);
  const color=new THREE.Color(colors[g.biome]).lerp(new THREE.Color(colors[route[(sector+1)%3]]),blend);
  color.multiplyScalar(.94+.06*Math.sin(x*.08)*Math.cos(z*.07));rgb.push(color.r,color.g,color.b);
 }
 terrain.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));terrain.computeVertexNormals();
 const land=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));scene.add(land);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(3400,3400),new THREE.MeshStandardMaterial({color:night?'#183956':'#259eae',roughness:.32,metalness:.25}));water.rotation.x=-Math.PI/2;water.position.y=-14;scene.add(water);
 // A real gradient sky and unlit clouds avoid the old dark, floating-rock cloud silhouettes.
 const skyCanvas=document.createElement('canvas');skyCanvas.width=16;skyCanvas.height=256;const ctx=skyCanvas.getContext('2d')!;
 const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,night?'#101a3e':'#287fb1');gradient.addColorStop(.55,night?'#434d81':'#93d8df');gradient.addColorStop(1,night?'#ad8ead':'#ffe0ad');ctx.fillStyle=gradient;ctx.fillRect(0,0,16,256);
 const skyMap=new THREE.CanvasTexture(skyCanvas);skyMap.colorSpace=THREE.SRGBColorSpace;
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1400,32,24),new THREE.MeshBasicMaterial({map:skyMap,side:THREE.BackSide,depthWrite:false,fog:false}));sky.userData.dynamic=true;scene.add(sky);
 const cloudMat=new THREE.MeshBasicMaterial({color:night?'#7985b5':'#fff1da',fog:false});
 const cloudGeo=new THREE.SphereGeometry(1,12,8);
 for(let i=0;i<15;i++){
  const a=i*2.399,r=550+(i%3)*85;
  for(let j=0;j<4;j++){const cloud=new THREE.Mesh(cloudGeo,cloudMat);cloud.position.set(Math.cos(a)*r+j*15,110+(i%4)*20+(j%2)*5,Math.sin(a)*r);cloud.scale.set(23,7+j%2*4,13);scene.add(cloud);}
 }
 // Broad, translucent aurora curtains give the night route its own sky silhouette.
 if(night){
  for(let band=0;band<3;band++){
   const vertices:number[]=[],indices:number[]=[];
   for(let i=0;i<=80;i++){
    const angle=-2+i/80*3.5,r=700+band*55;
    const y=190+band*38+Math.sin(i*.11+band)*32;
    vertices.push(Math.cos(angle)*r,y,Math.sin(angle)*r,Math.cos(angle)*r,y+25+Math.sin(i*.18)*12,Math.sin(angle)*r);
    if(i<80){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
   const ribbon=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:band===1?'#ab79e5':'#55d9c5',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false,fog:false,blending:THREE.AdditiveBlending}));
   ribbon.userData.dynamic=true;scene.add(ribbon);
  }
 }
 const sun=new THREE.Mesh(new THREE.SphereGeometry(night?20:30,24,16),new THREE.MeshBasicMaterial({color:night?'#e8eeff':'#fff0b0',fog:false}));sun.position.set(440,150,-510);scene.add(sun);
 // Geometry is shared, and the scene's static batching merges repeated scenery by material.
 const rockGeo=new THREE.DodecahedronGeometry(1,0),trunkGeo=new THREE.CylinderGeometry(.35,.65,1,7),leafGeo=new THREE.SphereGeometry(1,9,7),coneGeo=new THREE.ConeGeometry(1,1,7),boxGeo=new THREE.BoxGeometry(1,1,1);
 function shape(geo:THREE.BufferGeometry,color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=world.mesh(geo,color,scene,x,y,z);m.scale.set(sx,sy,sz);return m;}
 function tree(x:number,z:number,seed:number,pine=false){
  const y=ground(x,z).y,h=7+(seed%4)*1.2;
  shape(trunkGeo,'#745247',x,y+h*.4,z,1,h*.8,1);
  if(pine){for(let k=0;k<3;k++)shape(coneGeo,night?'#3a737b':'#235e53',x,y+h*.55+k*2.5,z,4-k*.8,6,4-k*.8);}
  else{shape(leafGeo,seed%2?'#36805d':'#59a16a',x,y+h,z,4.5,3.6,4.5);shape(leafGeo,'#72b476',x+2,y+h+1.4,z,3,2.4,3);}
 }
 // Rejection against the ENTIRE road keeps large props out of adjacent switchbacks too.
 for(let i=0;i<260;i++){
  const t=(i*.61803398875)%1,lane=(i%2?1:-1)*(22+(i*17%72));const p=world.point(t*track.length,lane).p,g=ground(p.x,p.z);
  if(g.distance<19||Math.hypot(p.x,p.z)>276)continue;
  if(g.biome==='forest'||g.biome==='snow'){tree(p.x,p.z,i,g.biome==='snow');if(g.biome==='snow'&&i%3===0)shape(rockGeo,'#eff4f2',p.x+3,g.y+1,p.z,3,1.7,2);}
  else if(g.biome==='mesa'){
   const h=8+i%5*3;shape(new THREE.CylinderGeometry(3,5,h,7),'#a75840',p.x,g.y+h/2,p.z,1,1,1);shape(new THREE.CylinderGeometry(3.6,3.8,1.4,7),'#e5a16a',p.x,g.y+h-1.5,p.z,1,1,1);
  }else if(g.biome==='crystal'){
   for(let j=0;j<3;j++){const h=5+(i+j)%5*2;const c=shape(coneGeo,j%2?'#91d6df':'#998ed3',p.x+j*1.7,g.y+h/2,p.z+j,h*.2,h,h*.2);c.rotation.z=(j-1)*.15;}
  }else if(g.biome==='oasis'){tree(p.x,p.z,i);shape(rockGeo,'#d8b47c',p.x+3,g.y+1.2,p.z,3,2,3);}
  else{shape(rockGeo,i%2?'#c4aa80':'#809b95',p.x,g.y+1,p.z,3+i%3,2,3);}
 }
 // Large layered landforms live beyond the circuit, giving every bend a readable backdrop.
 for(let i=0;i<28;i++){
  const a=i/28*Math.PI*2,r=340+(i%3)*40,x=Math.cos(a)*r,z=Math.sin(a)*r,g=ground(x,z),h=30+(i*13%55);
  const color=g.biome==='mesa'?'#ad715b':night?'#536d8a':'#568d87';
  shape(rockGeo,color,x,-8+h*.35,z,32,h*.7,32).rotation.y=a;
  if(night)shape(coneGeo,'#c5dfeb',x,h*.9-8,z,15,h*.3,15);
 }
 // Three distinct landmarks per lap: lighthouse, stone arch, or crystal gateway.
 for(let sector=0;sector<3;sector++){
  const t=(sector+.42)/3,p=world.point(t*track.length,38).p,g=ground(p.x,p.z);
  if(g.distance<24)continue;
  if(route[sector]==='coast'){
   shape(new THREE.CylinderGeometry(2.3,3.7,24,12),'#f3e5c7',p.x,g.y+12,p.z,1,1,1);
   shape(new THREE.CylinderGeometry(2.7,2.9,4,12),'#da644d',p.x,g.y+17,p.z,1,1,1);
   shape(new THREE.CylinderGeometry(3.5,3.5,1,12),'#243f50',p.x,g.y+24,p.z,1,1,1);
   shape(new THREE.CylinderGeometry(2,2,3,12),'#a8e1e1',p.x,g.y+26,p.z,1,1,1);
   shape(coneGeo,'#d8664a',p.x,g.y+29,p.z,4,3,4);
  }else{
   const color=route[sector]==='crystal'?'#9d9cdb':route[sector]==='snow'?'#c9e0e4':'#be8b65';
   for(const offset of [-9,9])shape(rockGeo,color,p.x+offset,g.y+9,p.z,5,12,5);
   shape(boxGeo,color,p.x,g.y+18,p.z,24,4,6);
  }
 }
 // Spectators have legs and feet planted on the same terrain as the road.
 const skin=['#e6b68c','#ae7557','#f1cfac'],shirts=['#ed7156','#70bac7','#d4df7d','#b59ad2'];
 for(let cluster=0;cluster<14;cluster++)for(let j=0;j<6;j++){
  const p=world.point((cluster+.3)/14*track.length+(j-2.5)*1.7,cluster%2?17:-17).p,g=ground(p.x,p.z);if(g.distance<14)continue;
  const y=g.y;for(const offset of [-.18,.18])shape(boxGeo,'#334956',p.x+offset,y+.45,p.z,.22,.9,.3);
  shape(boxGeo,shirts[(cluster+j)%4],p.x,y+1.2,p.z,.72,.8,.43);
  shape(leafGeo,skin[j%3],p.x,y+1.92,p.z,.36,.4,.35);
  for(const side of [-1,1]){const arm=shape(boxGeo,skin[j%3],p.x+side*.48,y+1.55,p.z,.2,.75,.22);arm.rotation.z=side*.65;}
 }
 // Short ground-cover clusters fill near-field space without hiding the road.
 for(let i=0;i<360;i++){
  const p=world.point((i*.381966)%1*track.length,(i%2?1:-1)*(15+i%24)).p,g=ground(p.x,p.z);if(g.distance<14)continue;
  if(g.biome==='forest'||g.biome==='oasis')shape(leafGeo,i%3?'#447d59':'#e9bd72',p.x,g.y+.35,p.z,.7,.5,.7);
  else if(g.biome==='snow')shape(rockGeo,'#e1eced',p.x,g.y+.2,p.z,1,.4,.8);
 }
}
