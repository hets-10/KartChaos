import * as THREE from 'three';

export function surfaceTexture(anisotropy:number,kind:'asphalt'|'ground'|'rubber'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
 const pixels=ctx.createImageData(256,256);let seed=491;
 for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=seed/4294967296;const base=kind==='asphalt'?180:kind==='rubber'?110:204;const v=base+n*(kind==='ground'?45:kind==='asphalt'?24:55);pixels.data.set([v,v,v,255],i);}
 ctx.putImageData(pixels,0,0);
 if(kind==='rubber'){ctx.strokeStyle='#a2a2a2';ctx.lineWidth=7;for(let y=-20;y<280;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y+30);ctx.lineTo(256,y);ctx.stroke();}}
 const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function skyMaterial(night:boolean,canyon:boolean,time:{value:number}){
 return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{time,zenith:{value:new THREE.Color(night?'#111c43':canyon?'#588fae':'#3a97c6')},horizon:{value:new THREE.Color(night?'#9a86ae':canyon?'#f9d2a4':'#d9f1ef')},night:{value:night?1:0}},vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
  uniform float time,night;uniform vec3 zenith,horizon;varying vec3 direction;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
  void main(){
   vec3 d=normalize(direction);float altitude=max(d.y,0.0);
   vec3 color=mix(horizon,zenith,pow(smoothstep(-.08,.85,d.y),.55));
   vec3 sunDirection=normalize(vec3(-.7,.38,-.55));float sun=dot(d,sunDirection);
   color+=vec3(1.0,.69,.34)*pow(max(sun,0.0),24.0)*.18*(1.0-night);
   color=mix(color,vec3(1.0,.94,.77),smoothstep(.9985,.9994,sun)*(1.0-night));
   vec2 uv=d.xz/max(d.y,.07)*1.4+vec2(time*.003,0.0);
   float clouds=noise(uv)+noise(uv*2.03)*.45+noise(uv*4.1)*.18;
   float mask=smoothstep(.85,1.12,clouds)*smoothstep(.04,.18,d.y)*(1.0-smoothstep(.6,.9,d.y));
   color=mix(color,mix(vec3(.98,.96,.88),vec3(.29,.35,.53),night),mask*.85);
   if(night>.5){
    float a=atan(d.z,d.x);float curtain=sin(a*3.0+time*.04)*.065+sin(a*7.0-time*.035)*.02+.31;
    float aurora=exp(-pow((d.y-curtain)*24.0,2.0));
    float second=exp(-pow((d.y-curtain-.12-sin(a*4.0)*.02)*31.0,2.0));
    float folds=.65+.35*sin(a*95.0+sin(a*12.0)*2.0+time*.08);
    color+=mix(vec3(.06,.43,.33),vec3(.31,.1,.48),sin(a*2.0)*.5+.5)*(aurora+second*.45)*folds*.8;
    vec2 star=floor(vec2(a*120.0,d.y*350.0));float dots=step(.997,hash(star));
    color+=dots*smoothstep(.1,.3,d.y)*.55;
    float moon=dot(d,normalize(vec3(.6,.4,-.7)));color=mix(color,vec3(.9,.96,1.0),smoothstep(.9991,.9995,moon));
   }
   gl_FragColor=vec4(color,1.0);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
}

export function waterMaterial(night:boolean,time:{value:number}){
 const material=new THREE.MeshPhysicalMaterial({color:night?'#245073':'#218f9e',roughness:.25,metalness:.25,clearcoat:.7,clearcoatRoughness:.22});
 material.onBeforeCompile=shader=>{
  shader.uniforms.waterTime=time;
  shader.vertexShader='varying vec3 waterPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nwaterPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='uniform float waterTime;varying vec3 waterPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec2 wave=vec2(sin(waterPosition.x*.16+waterPosition.z*.11+waterTime*.65),cos(waterPosition.z*.19-waterTime*.5));
   normal=normalize(normal+vec3(wave.x*.09,wave.y*.09,0.0));`);
 };
 material.customProgramCacheKey=()=> 'kart-ocean-v1';return material;
}

export function signTexture(title:string,subtitle:string,accent='#f27957'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#173d46';ctx.fillRect(0,0,1024,384);ctx.fillStyle=accent;ctx.fillRect(0,0,18,384);ctx.fillRect(0,0,1024,12);
 ctx.fillStyle='#f5efd9';ctx.font='bold 22px Arial';ctx.fillText('K C   /   I N D E P E N D E N T   R A C I N G   C L U B',48,58);
 ctx.font='italic 900 86px Arial';ctx.fillText(title,44,190,900);ctx.font='bold 28px Arial';ctx.fillStyle=accent;ctx.fillText(subtitle,48,260,900);
 ctx.strokeStyle='#496168';ctx.beginPath();ctx.moveTo(48,302);ctx.lineTo(975,302);ctx.stroke();
 ctx.fillStyle='#e9edc9';ctx.font='bold 18px Arial';ctx.fillText('FIND YOUR LINE.   /   MAKE SOME TROUBLE.',48,343);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;return map;
}
