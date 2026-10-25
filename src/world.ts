import * as THREE from 'three';
import type {IslandScene} from './scene';
import {ArtAssets,type AssetName,type Placement} from './art-assets';
import {createLandscape,mountainGeometry,terrainGeometry} from './landscape';
import {skyMaterial,surfaceTexture,waterMaterial} from './art-materials';
import {dressCircuit} from './track-dressing';

export type WorldVisuals={ready:Promise<void>;error:string|null;update:(time:number,reducedMotion:boolean)=>void;dispose:()=>void};

/** Presentation only: this never modifies race state, the centerline, or collision data. */
export function buildWorld(world:IslandScene):WorldVisuals{
 const {scene,track}=world,night=track.id==='aurora',ground=createLandscape(track,world.curve);
 const anisotropy=Math.min(8,world.renderer.capabilities.getMaxAnisotropy());
 const assets=new ArtAssets(scene,anisotropy),time={value:0};let disposed=false;
 const groundMap=surfaceTexture(anisotropy,'ground');groundMap.repeat.set(100,100);
 const land=new THREE.Mesh(terrainGeometry(ground,track),new THREE.MeshStandardMaterial({vertexColors:true,map:groundMap,bumpMap:groundMap,bumpScale:.12,roughness:.98}));
 land.name='sculpted-terrain';land.receiveShadow=true;land.userData.dynamic=true;scene.add(land);
 const mountains=new THREE.Mesh(mountainGeometry(night,track.id==='canyon'),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));
 mountains.name='continuous-mountain-horizon';mountains.userData.dynamic=true;scene.add(mountains);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),waterMaterial(night,time));water.rotation.x=-Math.PI/2;water.position.y=-13;water.userData.dynamic=true;scene.add(water);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1400,32,24),skyMaterial(night,track.id==='canyon',time));sky.userData.dynamic=true;sky.renderOrder=-10;scene.add(sky);
 dressCircuit(world,ground);

 // Long prismatic quartz bodies with beveled tips, rather than cone silhouettes.
 const crystalVertices:number[]=[],crystalIndices:number[]=[];
 for(const [height,radius,offset]of [[0,.8,0],[.2,1,0],[3.5,.86,.15],[4.7,0,.4]])for(let i=0;i<6;i++){const a=i/6*Math.PI*2;crystalVertices.push(Math.cos(a)*radius+offset,height,Math.sin(a)*radius);}
 for(let ring=0;ring<3;ring++)for(let i=0;i<6;i++){const a=ring*6+i,b=ring*6+(i+1)%6;crystalIndices.push(a,a+6,b);if(ring<2)crystalIndices.push(b,a+6,b+6);}
 const indexedCrystal=new THREE.BufferGeometry();indexedCrystal.setAttribute('position',new THREE.Float32BufferAttribute(crystalVertices,3));indexedCrystal.setIndex(crystalIndices);const crystalGeo=indexedCrystal.toNonIndexed();crystalGeo.computeVertexNormals();indexedCrystal.dispose();
 const crystals=[new THREE.MeshPhysicalMaterial({color:'#88ccda',metalness:.15,roughness:.22,clearcoat:1,emissive:'#1e5264',emissiveIntensity:night?.7:.12}),new THREE.MeshPhysicalMaterial({color:'#ad9ed2',metalness:.1,roughness:.24,clearcoat:1,emissive:'#543d77',emissiveIntensity:night?.5:.08})];
 for(let i=0;i<20;i++){
  const p=world.point((.7+i*.012)*track.length,(i%2?1:-1)*(24+i%4*7)).p,g=ground(p.x,p.z);if(g.distance<21)continue;
  for(let j=0;j<3;j++){const c=new THREE.Mesh(crystalGeo,crystals[(i+j)%2]);c.position.set(p.x+j*1.6,g.y-.4,p.z+j*.8);c.scale.setScalar(.6+(i+j)%4*.25);c.rotation.z=(j-1)*.18;c.rotation.y=i;c.castShadow=true;c.receiveShadow=true;c.userData.dynamic=true;scene.add(c);}
 }
 const names:AssetName[]=['rock','rockWide','bush','grass','fern','flower','flowerPurple','cottage','villa','lodge','hotel','barrel','oak','oakWide','oakYoung','pine','pineWide','pineYoung','palm','palmTall','seaRock','seaRockB','seaRockC','cactus','deadTree','tower','boat','ship','fence'];
 const visuals:WorldVisuals={error:null,ready:Promise.resolve(),update(t,reduced){time.value=reduced?0:t;assets.wind.value=reduced?0:t;},dispose(){disposed=true;assets.dispose();}};
 visuals.ready=assets.load(names).then(()=>{
  if(disposed)return;
  const placements:Placement[]=[];
  const occupied:{x:number;z:number;radius:number}[]=[];
  function place(name:AssetName,x:number,z:number,height:number,rotation:number,tint?:string,stretch=1,large=false){
   const g=ground(x,z),radius=assets.radius(name,height)*Math.max(1,stretch);
   if(g.distance<14+radius||g.y<-10||Math.hypot(x,z)>292)return false;
   if(large&&occupied.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+radius+1))return false;
   placements.push({name,x,y:g.y-.08,z,height,rotation,tint,stretch});
   if(large)occupied.push({x,z,radius});return true;
  }
  // Place architecture first so vegetation respects village footprints.
  for(let i=0;i<15;i++){
   const t=Math.floor(i/5)/3+.04+(i%5)*.016,{p,tangent}=world.point(t*track.length,(i%2?1:-1)*(32+(i%3)*5)),g=ground(p.x,p.z);
   if(g.biome==='crystal')continue;
   const name:AssetName=g.biome==='mesa'?'tower':g.biome==='snow'?'lodge':i%3===0?'hotel':i%2?'cottage':'villa';
   if(g.biome==='mesa'&&i%2)continue;
   place(name,p.x,p.z,5.5+i%3*1.2,Math.atan2(tangent.x,tangent.z)+(i%2?Math.PI/2:-Math.PI/2),night?'#c0d0e1':g.biome==='mesa'?'#e0ba91':'#fff5e5',1,true);
  }
  const beacon=world.point(track.length*.12,46).p;place('tower',beacon.x,beacon.z,24,.2,night?'#b1c8e8':'#ffedca',1,true);
  for(let i=0;i<440;i++){
   const t=(i*.61803398875)%1,lane=(i%2?1:-1)*(23+(i*17%91)),p=world.point(t*track.length,lane).p,g=ground(p.x,p.z);
   const rotation=i*2.399,height=8+i%5*1.5;
   let name:AssetName=g.biome==='coast'||g.biome==='oasis'?(i%2?'palm':'palmTall'):g.biome==='snow'?(['pine','pineWide','pineYoung'] as const)[i%3]:g.biome==='mesa'?(i%4===0?'deadTree':i%3?'rock':'cactus'):g.biome==='crystal'?(i%3?'pineYoung':'rockWide'):(['oak','oakWide','oakYoung'] as const)[i%3];
   if(Math.abs(lane)>60){if(name.startsWith('oak'))name='oakYoung';if(name.startsWith('pine'))name='pineYoung';}
   const h=name==='cactus'?3.5:name==='deadTree'?7:height;
   const tint=g.biome==='mesa'?'#e3b088':g.biome==='snow'?'#d2e4ed':g.biome==='crystal'?'#a6b8da':i%3?'#ffffff':'#e6eabb';
   place(name,p.x,p.z,h,rotation,tint,1,true);
  }
  // Textured outcrops build canyon walls and tie their bases into the soil.
  for(let i=0;i<110;i++){
   const p=world.point((i*.381966)%1*track.length,(i%2?1:-1)*(22+i%8*8)).p,g=ground(p.x,p.z);
   const isMesa=g.biome==='mesa';
   place(i%2?'rock':'rockWide',p.x,p.z,isMesa?10+i%5*3:2+i%4,i*1.9,isMesa?'#dca27b':g.biome==='snow'?'#d8e5e9':'#dce2cd',isMesa?1.1:1,true);
  }
  // Understory, flowers and grass form a layered edge along the road shoulder.
  for(let i=0;i<920;i++){
   const p=world.point((i*.38196601125)%1*track.length,(i%2?1:-1)*(15+(i*7%35))).p,g=ground(p.x,p.z);
   const name:AssetName=g.biome==='snow'?(i%7?'rock':'pineYoung'):g.biome==='mesa'?(i%8?'grass':'cactus'):i%9===0?'bush':i%5===0?'fern':i%7===0?(i%2?'flower':'flowerPurple'):'grass';
   const height=name==='bush'?2.1:name==='cactus'?1.3:name==='pineYoung'?2.5:name==='rock'?.35+.15*(i%3):.65+(i%4)*.19;
   if(occupied.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<o.radius*.6))continue;
   place(name,p.x,p.z,height,i*2.4,g.biome==='mesa'?'#e0bd83':g.biome==='snow'?'#e4f0fa':night?'#9fbbce':'#ebf0c7');
  }
  // Planted borders and small groves create deliberate compositions beside the circuit.
  for(let i=0;i<230;i++)for(const side of [-1,1]){
   const p=world.point(i/230*track.length,side*(17+(i%3)*.7)).p,g=ground(p.x,p.z);
   if(g.biome==='forest'||g.biome==='oasis')place(i%4?'bush':'fern',p.x,p.z,i%4?1.2+(i%3)*.25:1.1,i*.8,night?'#a5c6d4':'#e7f0d4');
   else if(g.biome==='coast'&&i%6===0){const palm=world.point(i/230*track.length,side*24).p;place(i%2?'palm':'palmTall',palm.x,palm.z,10+i%3,side*.5,'#f1efca',1,true);}
  }
  if(track.id==='sunset'){placements.push({name:'ship',x:260,y:-12.8,z:-220,height:25,rotation:-.7,tint:'#fff3d7'});placements.push({name:'boat',x:-270,y:-12.8,z:220,height:4,rotation:.8});}
  for(let i=0;i<8;i++){const p=world.point((.02+i*.003)*track.length,-20).p;place('barrel',p.x,p.z,1.3,i*.6);}
  assets.place(placements);world.renderer.shadowMap.needsUpdate=true;
 }).catch(error=>{if(!disposed){visuals.error='Scenery could not load. Check the connection and retry.';console.error('Kart Chaos scenery:',error);}});
 return visuals;
}
