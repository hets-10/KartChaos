import * as THREE from 'three';
type Particle={position:THREE.Vector3;velocity:THREE.Vector3;life:number;maxLife:number;color:THREE.Color};
/** One draw call per viewport, fixed pool, no allocations per particle update. */
export class Particles {
  particles:Particle[]=Array.from({length:180},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),life:0,maxLife:1,color:new THREE.Color()}));
  positions=new Float32Array(540);colors=new Float32Array(540);cursor=0;
  geometry=new THREE.BufferGeometry();material:THREE.PointsMaterial;points:THREE.Points;
  constructor(scene:THREE.Scene){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d')!;
    const g=ctx.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,32,32);
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3));this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3));
    this.material=new THREE.PointsMaterial({size:1.4,map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending});
    this.points=new THREE.Points(this.geometry,this.material);this.points.frustumCulled=false;scene.add(this.points);
  }
  emit(origin:THREE.Vector3,color:string,count:number,speed=2,life=.7){for(let i=0;i<count;i++){const p=this.particles[this.cursor++%this.particles.length];p.position.copy(origin);p.velocity.set((Math.random()-.5)*speed,Math.random()*speed*.7+.3,(Math.random()-.5)*speed);p.life=p.maxLife=life;p.color.set(color);}}
  update(dt:number){this.particles.forEach((p,i)=>{p.life=Math.max(0,p.life-dt);if(p.life){p.position.addScaledVector(p.velocity,dt);p.velocity.y-=dt;}
    this.positions.set(p.life?[p.position.x,p.position.y,p.position.z]:[0,-10000,0],i*3);const fade=p.life/p.maxLife;this.colors.set([p.color.r*fade,p.color.g*fade,p.color.b*fade],i*3);
  });this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.color.needsUpdate=true;}
  dispose(){this.geometry.dispose();this.material.map?.dispose();this.material.dispose();}
}
