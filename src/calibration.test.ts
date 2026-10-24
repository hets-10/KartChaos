import {describe,it,expect} from 'vitest';
import {PoseControls,type Pose} from './pose';

function pose(x=.5,lean=0):Pose{
 const p=Array.from({length:33},()=>({x,y:.5,visibility:.99}));
 for(const [a,b,y,w] of [[11,12,.35,.06],[23,24,.55,.04],[25,26,.73,.04],[27,28,.93,.04]]){
  p[a]={x:x-w-(a===11?lean:0),y,visibility:.99};p[b]={x:x+w-(a===11?lean:0),y,visibility:.99};
 }return p;
}
function setup(slots=[0]){
 const c=new PoseControls();c.singlePlayer=slots.length===1&&slots[0]===0;c.begin();let now=1000;
 const tick=(poses:Pose[],active=true)=>{now+=100;c.update(poses,now,1);return c.advanceCalibration(slots,now,active);};
 const people=(lean=0)=>c.singlePlayer?[pose(.5,lean)]:[pose(.75,lean),pose(.25,lean)];
 const calibrate=()=>{for(let i=0;i<50;i++)tick(people());tick(people(-.06));tick(people(.06));};
 return {c,tick,people,calibrate,now:()=>now};
}
describe('hands-free camera start',()=>{
 it('advances both calibration steps and starts once after three seconds without clicks',()=>{
  const s=setup();for(let i=0;i<49;i++)s.tick(s.people());expect(s.c.stage).toBe('standing');
  s.tick(s.people());expect(s.c.stage).toBe('leaning');s.tick(s.people(-.06));expect(s.c.stage).toBe('leaning');
  s.tick(s.people(.06));expect(s.c.stage).toBe('ready');expect(s.c.startIn).toBe(3);
  for(let i=0;i<29;i++)expect(s.tick(s.people())).toBe(false);
  expect(s.tick(s.people())).toBe(true);expect(s.tick(s.people())).toBe(false);
 });
 it('restarts the full countdown after someone walks out of frame',()=>{
  const s=setup();s.calibrate();for(let i=0;i<20;i++)s.tick(s.people());expect(s.c.startIn).toBe(1);
  expect(s.tick([])).toBe(false);expect(s.c.startIn).toBeNull();s.tick(s.people());expect(s.c.startIn).toBe(3);
  for(let i=0;i<29;i++)expect(s.tick(s.people())).toBe(false);expect(s.tick(s.people())).toBe(true);
 });
 it('requires both camera racers and ignores unused keyboard slots',()=>{
  const s=setup([0,1]);s.calibrate();expect(s.c.startIn).toBe(3);
  s.tick([pose(.75)]);expect(s.c.startIn).toBeNull();s.tick(s.people());expect(s.c.startIn).toBe(3);
  const mixed=setup([1]);for(let i=0;i<50;i++)mixed.tick([pose(.25)]);
  mixed.tick([pose(.25,-.06)]);mixed.tick([pose(.25,.06)]);expect(mixed.c.startIn).toBe(3);
  for(let i=0;i<29;i++)expect(mixed.tick([pose(.25)])).toBe(false);expect(mixed.tick([pose(.25)])).toBe(true);
 });
 it('never starts on stale frames or catches up after a suspended tab',()=>{
  const s=setup();s.calibrate();expect(s.c.advanceCalibration([0],s.now()+400)).toBe(false);expect(s.c.startIn).toBeNull();
  s.tick(s.people());expect(s.c.startIn).toBe(3);
  const later=s.now()+10000;s.c.update(s.people(),later,1);
  expect(s.c.advanceCalibration([0],later)).toBe(false);expect(s.c.startIn).toBe(3);
 });
 it('waits when unfocused, hidden or unavailable and clears progress on recalibration',()=>{
  const s=setup();s.calibrate();for(let i=0;i<35;i++)expect(s.tick(s.people(),false)).toBe(false);
  expect(s.c.startIn).toBeNull();s.tick(s.people());expect(s.c.startIn).toBe(3);
  s.c.begin();expect(s.c.startIn).toBeNull();expect(s.c.stage).toBe('standing');expect(s.c.baseline).toEqual([null,null]);
  expect(s.c.advanceCalibration([],s.now())).toBe(false);s.calibrate();expect(s.c.startIn).toBe(3);
 });
});
