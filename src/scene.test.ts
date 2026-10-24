import {expect,it} from 'vitest';
import * as THREE from 'three';
import {IslandScene} from './scene';
it('positive lane movement projects right in the chase camera',()=>{
 const scene=Object.create(IslandScene.prototype) as IslandScene;
 scene.curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,100),new THREE.Vector3(100,0,100),new THREE.Vector3(100,0,0)],true);
 const {p,tangent}=scene.point(10);const camera=new THREE.PerspectiveCamera(65,2,.1,500);camera.position.copy(p).addScaledVector(tangent,-11);camera.position.y+=6.5;camera.lookAt(p.clone().addScaledVector(tangent,11));camera.updateMatrixWorld();
 const center=scene.point(10,0).p.project(camera),right=scene.point(10,3).p.project(camera),left=scene.point(10,-3).p.project(camera);
 expect(right.x).toBeGreaterThan(center.x);expect(left.x).toBeLessThan(center.x);
});
