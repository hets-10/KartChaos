import {expect,it} from 'vitest';
import * as THREE from 'three';
import {createLandscape} from './landscape';
import {tracks} from './tracks';
import {bodyPanel} from './kart-art';

for(const track of tracks)it(`${track.id}: terrain stays below the existing road across every elevation change`,()=>{
 const curve=new THREE.CatmullRomCurve3(track.points.map(p=>new THREE.Vector3(...p)),true,'catmullrom',.38),ground=createLandscape(track,curve);
 for(let i=0;i<256;i++){
  const t=i/256,p=curve.getPointAt(t),tangent=curve.getTangentAt(t),right=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(0,1,0)).normalize();
  for(const lane of [-9,0,9]){
   const point=p.clone().addScaledVector(right,lane),g=ground(point.x,point.z);
   expect(g.y).toBeLessThan(p.y-.2);expect(g.y).toBeGreaterThan(p.y-3.5);
  }
 }
});

it('lofted kart panels stay inside the original body dimensions',()=>{
 for(const [w,h,d] of [[2.1,.45,2.9],[1.55,.48,1.35]]){
  const geo=bodyPanel(w,h,d);geo.computeBoundingBox();const size=geo.boundingBox!.getSize(new THREE.Vector3());
  expect(size.x).toBeLessThanOrEqual(w+.00001);expect(size.y).toBeLessThanOrEqual(h+.00001);expect(size.z).toBeLessThanOrEqual(d+.00001);
  for(const v of geo.getAttribute('normal').array)expect(Number.isFinite(v)).toBe(true);
  geo.dispose();
 }
});
