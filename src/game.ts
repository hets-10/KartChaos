export type Item = 'Rocket' | 'Banana' | 'Shield' | 'Turbo' | 'Lightning';
export type Phase = 'menu' | 'setup' | 'calibration' | 'countdown' | 'racing' | 'paused' | 'results';
export type Input = { steer:number; drift:boolean; boost:boolean; item:boolean; tracked:boolean };
export const neutral = ():Input => ({steer:0,drift:false,boost:false,item:false,tracked:true});
export type PlayerConfig = {name:string;color:string;mode:'keyboard'|'camera'};
export const defaults:PlayerConfig[] = [{name:'Player 1',color:'#ff6748',mode:'keyboard'},{name:'Player 2',color:'#40dfd0',mode:'keyboard'}];
export const TRACK_LENGTH = 1160;
export const ROAD_HALF = 9;
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const smooth=(v:number,target:number,dt:number,rate=10)=>v+(target-v)*(1-Math.exp(-rate*dt));
export const wrap=(v:number,n:number)=>((v%n)+n)%n;
export type Kart = {id:number;distance:number;lane:number;velocity:number;steer:number;speed:number;lap:number;nextCheckpoint:number;lapStart:number;lapTimes:number[];finish:number|null;item:Item|null;boost:number;charge:number;drifting:boolean;spin:number;shield:number;slow:number;cooldown:number;itemCooldown:number;wasBoost:boolean;wasItem:boolean;maxSpeed:number;jumps:number;driftBoosts:number;itemsUsed:number;hits:number;aggression:number;hop:number;event:string;eventTime:number};
export type Hazard = {id:number;kind:'rocket'|'banana';distance:number;lane:number;owner:number;life:number};
export type Pickup = {distance:number;lane:number;ready:number};
export type GameEvent = 'count'|'go'|'boost'|'drift'|'pickup'|'launch'|'hit'|'lap'|'win';
export function makeKart(id:number):Kart {return {id,distance:0,lane:id===0?-3:3,velocity:0,steer:0,speed:0,lap:1,nextCheckpoint:1,lapStart:0,lapTimes:[],finish:null,item:null,boost:0,charge:0,drifting:false,spin:0,shield:0,slow:0,cooldown:0,itemCooldown:0,wasBoost:false,wasItem:false,maxSpeed:0,jumps:0,driftBoosts:0,itemsUsed:0,hits:0,aggression:0,hop:0,event:'',eventTime:0};}
export function advanceCheckpoints(k:Kart,previous:number,now:number,time:number):boolean {
  let finished=false;
  while(k.nextCheckpoint<=12 && previous<k.nextCheckpoint*TRACK_LENGTH/4 && now>=k.nextCheckpoint*TRACK_LENGTH/4){
    if(k.nextCheckpoint%4===0){k.lapTimes.push(time-k.lapStart);k.lapStart=time;k.lap++;if(k.lap>3){k.finish=time;finished=true;}}
    k.nextCheckpoint++;
  }
  return finished;
}
export class Race {
  phase:Phase='menu';resumePhase:'racing'|'countdown'='racing';karts=[makeKart(0),makeKart(1)];time=0;countdown=3.6;chaos=false;winner:number|null=null;hazards:Hazard[]=[];sequence=0;events:GameEvent[]=[];
  pickups:Pickup[]=[];lastCount=4;
  reset(){this.karts=[makeKart(0),makeKart(1)];this.time=0;this.countdown=3.6;this.winner=null;this.hazards=[];this.lastCount=4;this.pickups=Array.from({length:8},(_,i)=>({distance:100+i*140,lane:i%2?-3:3,ready:0}));this.phase='countdown';this.events=[];}
  pause(){if(this.phase==='racing'||this.phase==='countdown'){this.resumePhase=this.phase;this.phase='paused';}}
  resume(){if(this.phase==='paused')this.phase=this.resumePhase;}
  emit(e:GameEvent,k?:Kart,message?:string){this.events.push(e);if(k&&message){k.event=message;k.eventTime=2;}}
  hit(k:Kart){if(k.finish!==null)return;if(k.shield>0){k.shield=0;this.emit('hit',k,'SHIELD BLOCK!');return;}if(k.spin>0)return;k.spin=1.25;k.speed*=.35;k.hits++;this.emit('hit',k,'SPIN OUT!');}
  activate(k:Kart){if(!k.item||k.itemCooldown>0)return;const item=k.item;k.item=null;k.itemsUsed++;k.itemCooldown=1.5;this.emit('launch',k,item.toUpperCase()+'!');const other=this.karts[1-k.id];
    if(item==='Turbo'){k.boost=4;this.emit('boost');}
    if(item==='Shield')k.shield=9;
    if(item==='Lightning'){if(other.shield>0)other.shield=0;else{other.slow=3;other.hits++;other.event='ZAPPED!';other.eventTime=2;}}
    if(item==='Rocket'||item==='Banana')this.hazards.push({id:++this.sequence,kind:item==='Rocket'?'rocket':'banana',distance:k.distance+(item==='Rocket'?6:-5),lane:k.lane,owner:k.id,life:item==='Rocket'?8:20});
  }
  step(dt:number,inputs:Input[]){
    if(this.phase==='countdown'){this.countdown-=dt;const n=Math.min(3,Math.ceil(this.countdown));if(n!==this.lastCount){this.lastCount=n;this.emit(n<=0?'go':'count');}if(this.countdown<=0)this.phase='racing';return;}
    if(this.phase!=='racing')return;
    this.time+=dt;
    for(const k of this.karts){if(k.finish!==null){k.speed=smooth(k.speed,0,dt);continue;}const input=inputs[k.id]??neutral();const steer=input.tracked?input.steer:0;
      for(const key of ['boost','spin','shield','slow','cooldown','itemCooldown','eventTime','hop'] as const)k[key]=Math.max(0,k[key]-dt);
      k.steer=smooth(k.steer,k.spin>0?0:steer,dt,9);k.aggression+=Math.abs(k.steer)*dt;
      if(input.boost&&!k.wasBoost&&k.cooldown===0&&input.tracked){k.boost=Math.max(k.boost,.9);k.cooldown=2.2;k.hop=.65;k.jumps++;this.emit('boost',k,'JUMP BOOST!');}k.wasBoost=input.boost;
      if(input.item&&!k.wasItem&&input.tracked)this.activate(k);k.wasItem=input.item;
      const drifting=input.tracked&&input.drift&&Math.abs(k.steer)>.16&&k.speed>8&&k.spin===0;
      if(drifting){k.charge=Math.min(3,k.charge+dt);if(!k.drifting)this.emit('drift');}
      else if(k.drifting){if(k.charge>.55){k.boost=Math.max(k.boost,.6+k.charge*.65);k.driftBoosts++;this.emit('boost',k,k.charge>2?'ULTRA DRIFT!':'DRIFT BOOST!');}k.charge=0;}k.drifting=drifting;
      const offroad=Math.abs(k.lane)>ROAD_HALF;
      const target=(this.chaos?35:28)*(k.boost>0?1.65:1)*(offroad?.48:1)*(k.slow>0?.45:1)*(k.spin>0?.25:1)*(input.tracked?1:.3);
      k.speed=smooth(k.speed,target,dt,k.speed<target?1.15:3.5);k.velocity=smooth(k.velocity,k.steer*(drifting?15:10)*(0.4+k.speed/45),dt,drifting?3:6);
      k.lane+=k.velocity*dt;if(Math.abs(k.lane)>13){k.lane=clamp(k.lane,-13,13);k.velocity*=-.45;k.speed*=.75;}
      const previous=k.distance;k.distance+=k.speed*dt;k.maxSpeed=Math.max(k.maxSpeed,k.speed*3.6);
      const oldLap=k.lap;if(advanceCheckpoints(k,previous,k.distance,this.time)){if(this.winner===null){this.winner=k.id;this.emit('win',k,'FINISH!');}}else if(k.lap!==oldLap)this.emit('lap',k,'LAP '+k.lap+'!');
      for(const box of this.pickups){const gap=Math.abs(wrap(k.distance-box.distance+TRACK_LENGTH/2,TRACK_LENGTH)-TRACK_LENGTH/2);if(box.ready<=this.time&&!k.item&&gap<3.3&&Math.abs(k.lane-box.lane)<2.8){k.item=(['Rocket','Banana','Shield','Turbo','Lightning'] as Item[])[Math.floor(Math.random()*5)];box.ready=this.time+(this.chaos?3:7);this.emit('pickup',k,k.item+' collected');}}
    }
    const [a,b]=this.karts;const gap=Math.abs(wrap(a.distance-b.distance+TRACK_LENGTH/2,TRACK_LENGTH)-TRACK_LENGTH/2);
    if(a.finish===null&&b.finish===null&&gap<3.4&&Math.abs(a.lane-b.lane)<2.2){const direction=a.lane<=b.lane?-1:1;a.lane+=direction*dt*7;b.lane-=direction*dt*7;a.speed*=Math.pow(.9,dt*5);b.speed*=Math.pow(.9,dt*5);}
    for(const h of this.hazards){h.life-=dt;const target=this.karts[1-h.owner];if(h.kind==='rocket'){h.distance+=65*dt;h.lane=smooth(h.lane,target.lane,dt,2);}const d=Math.abs(wrap(h.distance-target.distance+TRACK_LENGTH/2,TRACK_LENGTH)-TRACK_LENGTH/2);if(d<3&&Math.abs(h.lane-target.lane)<2.5){this.hit(target);h.life=0;}}
    this.hazards=this.hazards.filter(h=>h.life>0);
    if(this.karts.every(k=>k.finish!==null))this.phase='results';
  }
  rank(k:Kart){const other=this.karts[1-k.id];if(k.finish!==null)return other.finish===null||k.finish<other.finish||(k.finish===other.finish&&k.id<other.id)?1:2;return other.finish!==null||(other.distance>k.distance||(other.distance===k.distance&&other.id<k.id))?2:1;}
}
export const timeText=(t:number|null)=>t===null?'—':`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
