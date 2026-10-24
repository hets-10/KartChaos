import {clamp,neutral,smooth,type Input} from './game';
export type Landmark={x:number;y:number;z?:number;visibility?:number};
export type Pose=Landmark[];
export type Baseline={lean:number;hipY:number;shoulderY:number;leg:number;torso:number;range:number};
export const midpoint=(p:Pose,a:number,b:number)=>({x:(p[a].x+p[b].x)/2,y:(p[a].y+p[b].y)/2});
export function metrics(p:Pose){const s=midpoint(p,11,12),h=midpoint(p,23,24),a=midpoint(p,27,28);return {x:1-h.x,lean:Math.atan2(h.x-s.x,h.y-s.y),hipY:h.y,shoulderY:s.y,leg:a.y-h.y,torso:Math.max(.05,h.y-s.y)};}
export function reliable(p:Pose){return [11,12,23,24,25,26,27,28].every(i=>p[i]&&(p[i].visibility??0)>.55);}
export function assignPoses(poses:Pose[],previous:(number|null)[]):(Pose|null)[]{
 const valid=poses.filter(reliable),out:(Pose|null)[]=[null,null];
 // The mirrored left/right zones prevent an occluded person being assigned to the missing slot.
 for(let slot=0;slot<2;slot++){const candidates=valid.filter(p=>{const x=metrics(p).x;return slot===0?x<.52:x>.48;}).filter(p=>!out.includes(p));const target=previous[slot]??(slot===0?.25:.75);candidates.sort((a,b)=>Math.abs(metrics(a).x-target)-Math.abs(metrics(b).x-target));if(candidates[0]&&Math.abs(metrics(candidates[0]).x-target)<.28)out[slot]=candidates[0];}
 return out;
}
export class PoseControls {
 inputs=[neutral(),neutral()];poses:(Pose|null)[]=[null,null];positions:(number|null)[]=[null,null];baseline:(Baseline|null)[]=[null,null];samples:Baseline[][]=[[],[]];stage:'idle'|'standing'|'leaning'|'ready'='idle';lastSeen=[0,0];previousWrists:number[][]=[[],[]];lastJump=[0,0];lastThrow=[0,0];previousHip=[0,0];previousTime=0;confidence=[0,0];ranges=[.2,.2];leanLeft=[0,0];leanRight=[0,0];
 begin(){this.stage='standing';this.samples=[[],[]];this.baseline=[null,null];this.ranges=[.2,.2];this.leanLeft=[0,0];this.leanRight=[0,0];}
 update(poses:Pose[],now:number,sensitivity:number){const dt=clamp((now-this.previousTime)/1000,.01,.15);this.previousTime=now;this.poses=assignPoses(poses,this.positions);
 this.poses.forEach((pose,i)=>{if(!pose){this.inputs[i]={...neutral(),tracked:false};this.confidence[i]=0;this.previousWrists[i]=[];this.previousHip[i]=0;return;}const m=metrics(pose);this.positions[i]=m.x;this.lastSeen[i]=now;this.confidence[i]=[11,12,23,24,25,26,27,28].reduce((sum,n)=>sum+(pose[n].visibility??0),0)/8;
 if(this.stage==='standing'&&this.samples[i].length<50){this.samples[i].push({...m,range:.3});if(this.samples[i].length===50){const rows=this.samples[i];this.baseline[i]={lean:0,hipY:0,shoulderY:0,leg:0,torso:0,range:.3};for(const key of ['lean','hipY','shoulderY','leg','torso'] as const)this.baseline[i]![key]=rows.reduce((sum,r)=>sum+r[key],0)/rows.length;}}
 const base=this.baseline[i];if(!base){this.inputs[i]={...neutral(),tracked:false};return;}
 if(this.stage==='leaning'){this.leanLeft[i]=Math.max(this.leanLeft[i],base.lean-m.lean);this.leanRight[i]=Math.max(this.leanRight[i],m.lean-base.lean);this.ranges[i]=Math.max(this.ranges[i],Math.abs(m.lean-base.lean));base.range=clamp(this.ranges[i],.2,.65);}
 const lean=m.lean-base.lean,raw=clamp(lean/base.range*sensitivity,-1,1),steer=Math.abs(raw)<.09?0:Math.sign(raw)*(Math.abs(raw)-.09)/.91;
 const squat=(m.leg<base.leg*.77&&m.hipY>base.hipY+base.torso*.12);
 const rising=this.previousHip[i]?(this.previousHip[i]-m.hipY)/dt:0;
 const jump=m.hipY<base.hipY-base.torso*.18&&m.shoulderY<base.shoulderY-base.torso*.15&&rising>base.torso*.5&&now-this.lastJump[i]>2200;
 if(jump)this.lastJump[i]=now;this.previousHip[i]=m.hipY;
 let throwing=false;const wrists:number[]=[];
 for(const [arm,[shoulder,elbow,wrist]] of [[11,13,15],[12,14,16]].entries()){const s=pose[shoulder],e=pose[elbow],w=pose[wrist];const x=(w.x-s.x)/m.torso,y=(w.y-s.y)/m.torso;wrists.push(x,y);if((w.visibility??0)<.65||(e.visibility??0)<.65)continue;const a={x:s.x-e.x,y:s.y-e.y},b={x:w.x-e.x,y:w.y-e.y};const cosine=(a.x*b.x+a.y*b.y)/(Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y)+1e-6);const old=this.previousWrists[i];const velocity=old.length?Math.hypot(x-old[arm*2],y-old[arm*2+1])/dt:0;if(cosine<-.7&&Math.hypot(x,y)>1.05&&velocity>3.8&&now-this.lastThrow[i]>1500)throwing=true;}
 if(throwing)this.lastThrow[i]=now;this.previousWrists[i]=wrists;this.inputs[i]={steer:smooth(this.inputs[i].steer,steer,dt,12),drift:squat,boost:jump,item:throwing,tracked:true};
 });}
 getInput(i:number,now:number){if(now-this.lastSeen[i]>350)return {...neutral(),tracked:false};const input={...this.inputs[i]};this.inputs[i].boost=false;this.inputs[i].item=false;return input;}
}
