import {getTrack,type TrackId} from './tracks';
export const ITEMS=['Rocket','Banana','Shield','Turbo','Lightning'] as const;
export type Item=typeof ITEMS[number];
export type Phase='menu'|'setup'|'calibration'|'countdown'|'racing'|'paused'|'results';
export type Mode='versus'|'solo'|'practice'|'tutorial';
export type Difficulty='easy'|'normal'|'hard';
export type Input={steer:number;drift:boolean;boost:boolean;item:boolean;tracked:boolean};
export const neutral=():Input=>({steer:0,drift:false,boost:false,item:false,tracked:true});
export type PlayerConfig={name:string;color:string;mode:'keyboard'|'camera';photo?:string};
export const defaults:PlayerConfig[]=[{name:'Player 1',color:'#ff6748',mode:'keyboard'},{name:'Player 2',color:'#40dfd0',mode:'keyboard'}];
export const TRACK_LENGTH=1160,ROAD_HALF=9;
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const smooth=(v:number,target:number,dt:number,rate=10)=>v+(target-v)*(1-Math.exp(-rate*dt));
export const wrap=(v:number,n:number)=>((v%n)+n)%n;
export const timeText=(t:number|null)=>t===null?'—':Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0');
export type Kart={id:number;distance:number;lane:number;velocity:number;steer:number;speed:number;lap:number;nextCheckpoint:number;lapStart:number;lapTimes:number[];finish:number|null;item:Item|null;boost:number;charge:number;drifting:boolean;spin:number;shield:number;slow:number;cooldown:number;itemCooldown:number;wasBoost:boolean;wasItem:boolean;maxSpeed:number;jumps:number;driftBoosts:number;itemsUsed:number;hits:number;aggression:number;hop:number;event:string;eventTime:number;invulnerable:number;impact:number;collisionCooldown:number;collisions:number;hitsLanded:number;blocks:number;pickups:number;offroadTime:number;boostTime:number;driftTime:number;speedIntegral:number;leadTime:number;itemCounts:Record<Item,number>};
export type Hazard={id:number;kind:'rocket'|'banana';distance:number;lane:number;owner:number;life:number};
export type Pickup={distance:number;lane:number;ready:number};
export type GameEvent='count'|'go'|'boost'|'drift'|'pickup'|'launch'|'hit'|'lap'|'win'|'bump'|'block'|'lesson';
export type Effect={id:number;type:'hit'|'boost'|'pickup'|'bump'|'block';distance:number;lane:number};
export const makeKart=(id:number):Kart=>({id,distance:0,lane:id===0?-3:3,velocity:0,steer:0,speed:0,lap:1,nextCheckpoint:1,lapStart:0,lapTimes:[],finish:null,item:null,boost:0,charge:0,drifting:false,spin:0,shield:0,slow:0,cooldown:0,itemCooldown:0,wasBoost:false,wasItem:false,maxSpeed:0,jumps:0,driftBoosts:0,itemsUsed:0,hits:0,aggression:0,hop:0,event:'',eventTime:0,invulnerable:0,impact:0,collisionCooldown:0,collisions:0,hitsLanded:0,blocks:0,pickups:0,offroadTime:0,boostTime:0,driftTime:0,speedIntegral:0,leadTime:0,itemCounts:{Rocket:0,Banana:0,Shield:0,Turbo:0,Lightning:0}});
export function advanceCheckpoints(k:Kart,previous:number,now:number,time:number,length=TRACK_LENGTH,laps=3):boolean {
 let finished=false;
 while(k.nextCheckpoint<=laps*4&&previous<k.nextCheckpoint*length/4&&now>=k.nextCheckpoint*length/4){
  if(k.nextCheckpoint%4===0){k.lapTimes.push(time-k.lapStart);k.lapStart=time;k.lap++;if(k.lap>laps){k.finish=time;finished=true;}}
  k.nextCheckpoint++;
 }
 return finished;
}
// Weighted recovery items for trailing racers; no hidden physics bonuses.
export function chooseItem(gap:number,random=Math.random):Item {
 const weights=gap>25?[3,1,2,5,2]:gap< -25?[2,5,5,2,1]:[4,3,3,4,1];
 let roll=clamp(random(),0,.999999)*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<ITEMS.length;i++){roll-=weights[i];if(roll<0)return ITEMS[i];}return 'Turbo';
}
export const lessons=[
 {title:'Find your racing line',body:'Steer left, then right. Acceleration and road heading are automatic.'},
 {title:'Charge a drift',body:'Hold drift while steering gently for one second. Release drift to fire the boost.'},
 {title:'A little extra lift',body:'Activate a jump boost. The cooldown tells you when another is ready.'},
 {title:'Throw some chaos',body:'Use the Turbo in your item slot. Practice items refill after use.'},
 {title:'Ready for a rival',body:'You have steered, drifted, jumped, and used an item. Take those moves into a solo race.'},
];
export class Race {
 phase:Phase='menu';resumePhase:'racing'|'countdown'='racing';karts=[makeKart(0),makeKart(1)];
 mode:Mode='versus';difficulty:Difficulty='normal';trackId:TrackId='sunset';time=0;countdown=3.6;chaos=false;winner:number|null=null;
 hazards:Hazard[]=[];sequence=0;events:GameEvent[]=[];effects:Effect[]=[];pickups:Pickup[]=[];lastCount=4;
 practiceItem:Item='Turbo';lesson=0;lessonLeft=0;lessonRight=0;lessonBaseline=0;lessonStarted=0;
 aiTimer=0;aiTarget=3;aiLastJump=-10;aiLastItem=-10;
 constructor(public random:()=>number=Math.random){}
 get length(){return getTrack(this.trackId).length;}
 get freePlay(){return this.mode==='practice'||this.mode==='tutorial';}
 get activeKarts(){return this.freePlay?this.karts.slice(0,1):this.karts;}
 get split(){return this.mode==='versus';}
 reset(options?:{mode?:Mode;trackId?:TrackId;difficulty?:Difficulty}){
  if(options)Object.assign(this,options);
  this.karts=[makeKart(0),makeKart(1)];this.time=0;this.countdown=3.1;this.winner=null;this.hazards=[];this.effects=[];this.lastCount=4;this.events=[];this.sequence=0;
  this.pickups=Array.from({length:8},(_,i)=>({distance:this.length*(.085+i*.115),lane:i%2?-3:3,ready:0}));
  this.lesson=0;this.lessonLeft=0;this.lessonRight=0;this.lessonBaseline=0;this.lessonStarted=0;this.aiTimer=0;this.aiLastJump=-10;this.aiLastItem=-10;
  if(this.freePlay){this.karts[0].lane=0;this.karts[0].item=this.practiceItem;}this.phase='countdown';
 }
 pause(){if(this.phase==='racing'||this.phase==='countdown'){this.resumePhase=this.phase;this.phase='paused';}}
 resume(){if(this.phase==='paused')this.phase=this.resumePhase;}
 finishPractice(){if(this.freePlay&&['racing','paused'].includes(this.phase))this.phase='results';}
 selectPracticeItem(item:Item){this.practiceItem=item;if(this.freePlay)this.karts[0].item=item;}
 effect(type:Effect['type'],k:Kart){this.effects.push({id:++this.sequence,type,distance:k.distance,lane:k.lane});if(this.effects.length>32)this.effects.shift();}
 emit(e:GameEvent,k?:Kart,message?:string){this.events.push(e);if(k&&message){k.event=message;k.eventTime=2;}if(k&&['hit','boost','pickup','bump','block'].includes(e))this.effect(e as Effect['type'],k);}
 hit(k:Kart,attacker?:Kart,lightning=false){
  if(k.finish!==null||k.invulnerable>0)return false;
  if(k.shield>0){k.shield=0;k.blocks++;k.invulnerable=.8;this.emit('block',k,'SHIELD BLOCK!');return false;}
  if(k.spin>0)return false;k.invulnerable=2.4;k.impact=.55;k.hits++;if(attacker)attacker.hitsLanded++;
  if(lightning){k.slow=2.5;this.emit('hit',k,'ZAPPED!');}else{k.spin=1.05;k.speed*=.45;this.emit('hit',k,'SPIN OUT!');}return true;
 }
 activate(k:Kart){
  if(!k.item||k.itemCooldown>0||k.finish!==null)return;
  const item=k.item;k.item=null;k.itemsUsed++;k.itemCounts[item]++;k.itemCooldown=this.freePlay?.65:2.5;
  this.emit('launch',k,item.toUpperCase()+'!');const other=this.karts[1-k.id];
  if(item==='Turbo'){k.boost=4;this.emit('boost',k,'TURBO!');}
  if(item==='Shield')k.shield=9;
  if(item==='Lightning'){if(!this.freePlay)this.hit(other,k,true);else this.emit('hit',k,'LIGHTNING · NO TARGET');}
  if(item==='Rocket'||item==='Banana')this.hazards.push({id:++this.sequence,kind:item==='Rocket'?'rocket':'banana',distance:k.distance+(item==='Rocket'?6:-5),lane:k.lane,owner:k.id,life:item==='Rocket'?7:18});
 }
 ai(dt:number):Input {
  const k=this.karts[1],other=this.karts[0];this.aiTimer-=dt;
  if(this.aiTimer<=0){
   this.aiTimer={easy:.45,normal:.22,hard:.1}[this.difficulty];const look={easy:45,normal:85,hard:120}[this.difficulty];let target=Math.sin(this.time*.3)*2;
   const boxes=this.pickups.filter(b=>b.ready<=this.time).map(b=>({...b,ahead:wrap(b.distance-k.distance,this.length)})).filter(b=>b.ahead<look).sort((a,b)=>a.ahead-b.ahead);
   if(!k.item&&boxes.length)target=boxes[0].lane;
   if(this.difficulty!=='easy')for(const h of this.hazards)if(h.owner!==1&&wrap(h.distance-k.distance,this.length)<look*.5&&Math.abs(h.lane-target)<3)target=h.lane>0?-5:5;
   if(Math.abs(other.distance-k.distance)<6&&Math.abs(other.lane-target)<2.5)target=other.lane>0?-4:4;this.aiTarget=target;
  }
  const cycle=this.time%7,drift=this.difficulty!=='easy'&&cycle>2&&cycle<3.4&&Math.abs(k.lane)<6&&k.speed>15;
  const target=clamp(this.aiTarget+(drift?Math.sin((cycle-2)*2.2)*3:0),-6,6),steer=clamp((target-k.lane)*.2-k.velocity*.07,-.8,.8);
  const boost=k.cooldown===0&&this.time-this.aiLastJump>({easy:12,normal:7,hard:4.2}[this.difficulty])&&!drift;if(boost)this.aiLastJump=this.time;
  const ahead=wrap(other.distance-k.distance,this.length),useful=k.item==='Rocket'?ahead<260:k.item==='Banana'?wrap(k.distance-other.distance,this.length)<180:true;
  const item=!!k.item&&useful&&k.itemCooldown===0&&this.time-this.aiLastItem>({easy:6,normal:3.5,hard:2.7}[this.difficulty]);if(item)this.aiLastItem=this.time;
  return {steer,drift,boost,item,tracked:true};
 }
 updateLesson(dt:number,input:Input){
  if(this.mode!=='tutorial'||!input.tracked)return;const k=this.karts[0];let advance=false;
  if(this.lesson===0){if(input.steer<-.25)this.lessonLeft+=dt;if(input.steer>.25)this.lessonRight+=dt;advance=this.lessonLeft>.25&&this.lessonRight>.25;}
  if(this.lesson===1)advance=k.driftBoosts>this.lessonBaseline;if(this.lesson===2)advance=k.jumps>this.lessonBaseline;if(this.lesson===3)advance=k.itemsUsed>this.lessonBaseline;
  if(advance){this.lesson++;this.lessonStarted=this.time;this.lessonBaseline=this.lesson===1?k.driftBoosts:this.lesson===2?k.jumps:k.itemsUsed;this.emit('lesson',k,'NICE MOVE!');if(this.lesson===3)this.selectPracticeItem('Turbo');}
 }
 step(dt:number,inputs:Input[]){
  if(this.phase==='countdown'){this.countdown-=dt;const n=Math.min(3,Math.ceil(this.countdown));if(n!==this.lastCount){this.lastCount=n;this.emit(n<=0?'go':'count');}if(this.countdown<=0)this.phase='racing';return;}
  if(this.phase!=='racing')return;this.time+=dt;
  const actual=inputs.slice();if(this.mode==='solo')actual[1]=this.ai(dt);
  for(const k of this.activeKarts){
   if(k.finish!==null){k.speed=smooth(k.speed,0,dt);continue;}const input=actual[k.id]??neutral(),steer=input.tracked?clamp(input.steer,-1,1):0;
   for(const key of ['boost','spin','shield','slow','cooldown','itemCooldown','eventTime','hop','invulnerable','impact','collisionCooldown'] as const)k[key]=Math.max(0,k[key]-dt);
   if(this.freePlay&&!k.item&&k.itemCooldown===0)k.item=this.practiceItem;
   k.steer=smooth(k.steer,k.spin>0?0:steer,dt,9);k.aggression+=Math.abs(k.steer)*dt;
   if(input.boost&&!k.wasBoost&&k.cooldown===0&&input.tracked){k.boost=Math.max(k.boost,.9);k.cooldown=2.2;k.hop=.65;k.jumps++;this.emit('boost',k,'JUMP BOOST!');}k.wasBoost=input.boost;
   if(input.item&&!k.wasItem&&input.tracked)this.activate(k);k.wasItem=input.item;
   const drifting=input.tracked&&input.drift&&Math.abs(k.steer)>.16&&k.speed>8&&k.spin===0;
   if(drifting){k.charge=Math.min(3,k.charge+dt);k.driftTime+=dt;if(!k.drifting)this.emit('drift');}
   else if(k.drifting){if(k.charge>.55){k.boost=Math.max(k.boost,.6+k.charge*.65);k.driftBoosts++;this.emit('boost',k,k.charge>2?'ULTRA DRIFT!':'DRIFT BOOST!');}k.charge=0;}k.drifting=drifting;
   const offroad=Math.abs(k.lane)>ROAD_HALF,baseSpeed=this.mode==='tutorial'?18:this.chaos?35:28;
   const target=baseSpeed*(k.boost>0?1.65:1)*(offroad?.48:1)*(k.slow>0?.55:1)*(k.spin>0?.3:1)*(input.tracked?1:.3);
   k.speed=smooth(k.speed,target,dt,k.speed<target?1.15:3.5);k.velocity=smooth(k.velocity,k.steer*(drifting?15:10)*(.4+k.speed/45),dt,drifting?3:6);
   k.lane+=k.velocity*dt;if(Math.abs(k.lane)>13){k.lane=clamp(k.lane,-13,13);k.velocity*=-.55;if(k.collisionCooldown===0){k.speed*=.7;k.collisionCooldown=.65;k.impact=.35;k.collisions++;this.emit('bump',k,'BARRIER BUMP');}}
   if(offroad)k.offroadTime+=dt;if(k.boost>0)k.boostTime+=dt;k.speedIntegral+=k.speed*3.6*dt;if(!this.freePlay&&this.rank(k)===1)k.leadTime+=dt;
   const previous=k.distance;k.distance+=k.speed*dt;k.maxSpeed=Math.max(k.maxSpeed,k.speed*3.6);const oldLap=k.lap;
   if(advanceCheckpoints(k,previous,k.distance,this.time,this.length,this.freePlay?Infinity:3)){if(this.winner===null){this.winner=k.id;this.emit('win',k,'FINISH!');}}
   else if(k.lap!==oldLap)this.emit('lap',k,this.freePlay?'LAP COMPLETE!':'LAP '+k.lap+'!');
   if(!this.freePlay)for(const box of this.pickups){const gap=Math.abs(wrap(k.distance-box.distance+this.length/2,this.length)-this.length/2);if(box.ready<=this.time&&!k.item&&gap<3.3&&Math.abs(k.lane-box.lane)<2.8){k.item=chooseItem(this.karts[1-k.id].distance-k.distance,this.random);k.pickups++;box.ready=this.time+(this.chaos?3:6);this.emit('pickup',k,k.item+' collected');}}
  }
  if(!this.freePlay){const [a,b]=this.karts,gap=Math.abs(wrap(a.distance-b.distance+this.length/2,this.length)-this.length/2);
   if(a.finish===null&&b.finish===null&&gap<3.4&&Math.abs(a.lane-b.lane)<2.2){const direction=a.lane<=b.lane?-1:1;a.lane+=direction*dt*7;b.lane-=direction*dt*7;if(a.collisionCooldown===0&&b.collisionCooldown===0){for(const k of [a,b]){k.speed*=.88;k.collisionCooldown=.7;k.impact=.3;k.collisions++;}this.emit('bump',a,'KART CONTACT');this.effect('bump',b);}}
  }
  for(const h of this.hazards){h.life-=dt;const target=this.karts[1-h.owner];if(h.kind==='rocket'){h.distance+=65*dt;if(!this.freePlay)h.lane=smooth(h.lane,target.lane,dt,1.5);}const d=Math.abs(wrap(h.distance-target.distance+this.length/2,this.length)-this.length/2);if(!this.freePlay&&d<3&&Math.abs(h.lane-target.lane)<2.5){this.hit(target,this.karts[h.owner]);h.life=0;}}
  this.hazards=this.hazards.filter(h=>h.life>0);this.updateLesson(dt,actual[0]??neutral());
  if(!this.freePlay&&this.karts.every(k=>k.finish!==null))this.phase='results';
 }
 rank(k:Kart){if(this.freePlay)return 1;const other=this.karts[1-k.id];if(k.finish!==null)return other.finish===null||k.finish<other.finish||(k.finish===other.finish&&k.id<other.id)?1:2;return other.finish!==null||(other.distance>k.distance||(other.distance===k.distance&&other.id<k.id))?2:1;}
}
