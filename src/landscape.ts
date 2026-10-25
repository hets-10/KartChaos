import * as THREE from 'three';
import type {Track,TrackId} from './tracks';
export type Biome='coast'|'forest'|'mesa'|'oasis'|'snow'|'crystal';
export const biomeRoutes:Record<TrackId,Biome[]>={sunset:['coast','forest','mesa'],canyon:['mesa','oasis','crystal'],aurora:['snow','forest','crystal']};
export const biomeColors:Record<Biome,string>={coast:'#d7bc81',forest:'#58916b',mesa:'#b77d56',oasis:'#819b62',snow:'#d3e1e9',crystal:'#787b9b'};
export function createLandscape(track:Track,curve:THREE.CatmullRomCurve3){
 const count=640,samples=Array.from({length:count},(_,i)=>curve.getPointAt(i/count));
 return (x:number,z:number)=>{
  let nearest=Infinity,index=0,fraction=0,roadBed=Infinity;
  // Project onto segments instead of nearest vertices, preserving smoothly changing road elevation.
  for(let i=0;i<count;i++){
   const a=samples[i],b=samples[(i+1)%count],dx=b.x-a.x,dz=b.z-a.z;
   const f=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
   const d=(a.x+dx*f-x)**2+(a.z+dz*f-z)**2;
   if(d<14*14)roadBed=Math.min(roadBed,THREE.MathUtils.lerp(a.y,b.y,f)-.5);
   if(d<nearest){nearest=d;index=i;fraction=f;}
  }
  const distance=Math.sqrt(nearest),t=((index+fraction)/count)%1,zone=t*3;
  const roadY=THREE.MathUtils.lerp(samples[index].y,samples[(index+1)%count].y,fraction);
  const blend=THREE.MathUtils.smoothstep(distance,16,72),radial=Math.hypot(x,z);
  const hills=3+Math.sin(x*.022)*Math.cos(z*.031)*5+Math.sin(x*.061+z*.027)*1.3;
  // Shore falloff is gated by distance to the road so elevated sections retain their embankments.
  const coast=THREE.MathUtils.smoothstep(radial,235,305)*THREE.MathUtils.smoothstep(distance,24,65);
  const y=Math.min(roadBed,THREE.MathUtils.lerp(roadY-.45,hills,blend)*(1-coast)-17*coast);
  return {y,distance,t,zone,biome:biomeRoutes[track.id][Math.floor(zone)%3]};
 };
}
export type Landscape=ReturnType<typeof createLandscape>;

export function terrainGeometry(ground:Landscape,track:Track){
 const geo=new THREE.PlaneGeometry(660,660,190,190);geo.rotateX(-Math.PI/2);
 const positions=geo.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),g=ground(x,z);positions.setY(i,g.y);
  const biome=biomeColors[g.biome],sector=Math.floor(g.zone),fade=THREE.MathUtils.smoothstep(g.zone-sector,.77,1);
  const color=new THREE.Color(biome).lerp(new THREE.Color(biomeColors[biomeRoutes[track.id][(sector+1)%3]]),fade);
  // Sandy verges blend into vegetation, with small-scale variation handled by the material.
  const verge=1-THREE.MathUtils.smoothstep(g.distance,12,19);
  color.lerp(new THREE.Color(g.biome==='snow'?'#e2e5df':'#c5b58e'),verge*.7);
  color.multiplyScalar(.94+Math.sin(x*.049)*Math.cos(z*.051)*.06);colors.push(color.r,color.g,color.b);
 }
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}

/** A continuous sculpted horizon, with ridgelines, valleys and sloping foothills. */
export function mountainGeometry(night:boolean,canyon:boolean){
 const positions:number[]=[],colors:number[]=[],indices:number[]=[];const slices=256,rings=25;
 for(let ring=0;ring<rings;ring++)for(let i=0;i<=slices;i++){
  const a=i/slices*Math.PI*2,r=310+ring/(rings-1)*440;
  const ridge=40+Math.sin(a*5+.7)*19+Math.cos(a*9)*15+Math.sin(a*17)*7;
  const envelope=Math.sin(ring/(rings-1)*Math.PI);
  const detail=Math.sin(r*.08+a*25)*5+Math.cos(r*.13-a*39)*3+Math.sin(r*.25+a*67)*1.5;
  const y=-17+Math.pow(envelope,1.5)*(ridge*(night?2.1:canyon?1.7:1.1)+detail);
  positions.push(Math.cos(a)*r,y,Math.sin(a)*r);
  const col=new THREE.Color(night?'#607c9b':canyon?'#b68468':'#72988b');
  if(night&&y>68+Math.sin(a*11)*8)col.lerp(new THREE.Color('#dceaf0'),.85);
  else col.multiplyScalar(.86+ring/(rings-1)*.14+Math.sin(y*(canyon?.6:.17))*(canyon?.07:.025));
  colors.push(col.r,col.g,col.b);
  if(ring<rings-1&&i<slices){const p=ring*(slices+1)+i;indices.push(p,p+1,p+slices+1,p+1,p+slices+2,p+slices+1);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
