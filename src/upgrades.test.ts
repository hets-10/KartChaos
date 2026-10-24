import {describe,it,expect} from 'vitest';
import {Race,neutral,chooseItem,advanceCheckpoints,makeKart,ITEMS,type Difficulty} from './game';
import {tracks} from './tracks';
import {KeyboardInput,bindingError,defaultBindings} from './preferences';
const run=(r:Race,seconds:number,steer=0,drift=false)=>{for(let i=0;i<seconds*60;i++)r.step(1/60,[{...neutral(),steer,drift},neutral()]);};
describe('solo racing',()=>{
  for(const track of tracks)for(const difficulty of ['easy','normal','hard'] as Difficulty[])it(`${difficulty} AI races all three laps on ${track.name}`,()=>{
    const r=new Race(()=>.65);r.reset({mode:'solo',trackId:track.id,difficulty});r.phase='racing';run(r,240);
    const ai=r.karts[1];expect(r.phase).toBe('results');expect(ai.lapTimes).toHaveLength(3);expect(ai.finish).toBeLessThan(210);expect(ai.jumps).toBeGreaterThan(2);expect(ai.itemsUsed).toBeGreaterThan(0);expect(ai.pickups).toBeGreaterThan(0);expect(Math.abs(ai.lane)).toBeLessThan(9);expect(ai.offroadTime).toBeLessThan(3);
    if(difficulty!=='easy')expect(ai.driftBoosts).toBeGreaterThan(0);
  });
  it('AI cannot consume human input or exceed the common speed ceiling',()=>{const r=new Race();r.reset({mode:'solo'});r.phase='racing';run(r,25);expect(r.karts[0].jumps).toBe(0);expect(r.karts[1].jumps).toBeGreaterThan(0);expect(r.karts[1].maxSpeed).toBeLessThanOrEqual(28*1.65*3.6);});
});
describe('practice and tutorial',()=>{
  it('practice runs beyond three laps with one active kart and no opponent attacks',()=>{const r=new Race();r.reset({mode:'practice'});r.phase='racing';run(r,170);expect(r.karts[0].lap).toBeGreaterThan(3);expect(r.phase).toBe('racing');expect(r.activeKarts).toHaveLength(1);expect(r.karts[1].distance).toBe(0);r.selectPracticeItem('Lightning');r.activate(r.karts[0]);expect(r.karts[1].slow).toBe(0);r.finishPractice();expect(r.phase).toBe('results');});
  it('practice items refill, respect cooldowns, and reset with the session',()=>{const r=new Race();r.reset({mode:'practice'});r.phase='racing';r.selectPracticeItem('Rocket');r.activate(r.karts[0]);expect(r.karts[0].item).toBeNull();r.activate(r.karts[0]);expect(r.karts[0].itemsUsed).toBe(1);run(r,.8);expect(r.karts[0].item).toBe('Rocket');r.activate(r.karts[0]);expect(r.karts[0].itemCounts.Rocket).toBe(2);r.reset();expect(r.hazards).toHaveLength(0);expect(r.karts[0].itemsUsed).toBe(0);expect(r.karts[0].lapTimes).toEqual([]);});
  it('requires each tutorial move in sequence and can finish',()=>{const r=new Race();r.reset({mode:'tutorial'});r.phase='racing';run(r,2);expect(r.lesson).toBe(0);run(r,.4,-1);run(r,.4,1);expect(r.lesson).toBe(1);run(r,1.5,.25,true);run(r,.2);expect(r.lesson).toBe(2);r.step(1/60,[{...neutral(),boost:true}]);expect(r.lesson).toBe(3);r.step(1/60,[{...neutral(),item:true}]);expect(r.lesson).toBe(4);r.finishPractice();expect(r.phase).toBe('results');});
  it('rejects missing tracking as a tutorial move',()=>{const r=new Race();r.reset({mode:'tutorial'});r.phase='racing';for(let i=0;i<120;i++)r.step(1/60,[{...neutral(),steer:i<60?-1:1,tracked:false}]);expect(r.lesson).toBe(0);});
});
describe('fair item combat and statistics',()=>{
  it('gives trailing racers more turbo without excluding any item',()=>{const count=(gap:number)=>{const values=Array.from({length:150},(_,i)=>chooseItem(gap,()=>i/150));return {turbo:values.filter(v=>v==='Turbo').length,unique:new Set(values)};};expect(count(100).turbo).toBeGreaterThan(count(-100).turbo);expect(count(100).unique.size).toBe(5);expect(count(-100).unique.size).toBe(5);});
  it('blocks repeated attacks and credits the attacker only once',()=>{const r=new Race(),[a,b]=r.karts;r.hit(b,a);r.hit(b,a,true);expect(b.hits).toBe(1);expect(a.hitsLanded).toBe(1);expect(b.slow).toBe(0);b.invulnerable=0;b.spin=0;r.hit(b,a,true);expect(a.hitsLanded).toBe(2);expect(b.slow).toBe(2.5);});
  it('consumes shield and records a block rather than damage',()=>{const r=new Race(),[a,b]=r.karts;b.shield=3;r.hit(b,a,true);expect(b.blocks).toBe(1);expect(b.shield).toBe(0);expect(b.hits).toBe(0);expect(a.hitsLanded).toBe(0);});
  it('records every item by type and prevents cooldown spam',()=>{const r=new Race();for(const item of ITEMS){const k=r.karts[0];k.item=item;k.itemCooldown=0;r.activate(k);k.item=item;r.activate(k);expect(k.itemCounts[item]).toBe(1);}expect(r.karts[0].itemsUsed).toBe(5);});
  it('records offroad, boosted and drift time without pause inflation',()=>{const r=new Race();r.reset();r.phase='racing';r.karts[0].lane=10;r.karts[0].boost=2;run(r,1);expect(r.karts[0].offroadTime).toBeCloseTo(1);expect(r.karts[0].boostTime).toBeCloseTo(1);const integral=r.karts[0].speedIntegral;r.pause();run(r,5);expect(r.karts[0].speedIntegral).toBe(integral);});
  it('uses each circuit length for checkpoints and finish time',()=>{for(const track of tracks){const k=makeKart(0);for(let i=1;i<=12;i++)advanceCheckpoints(k,(i-1)*track.length/4,i*track.length/4,10*i,track.length);expect(k.finish).toBe(120);expect(k.lapTimes).toEqual([40,40,40]);}});
});
describe('remappable keyboard',()=>{
  it('captures a press released between simulation frames exactly once',()=>{const k=new KeyboardInput(),bindings=defaultBindings()[0];k.down('KeyW');k.up('KeyW');expect(k.sample(bindings).boost).toBe(true);k.consumed();expect(k.sample(bindings).boost).toBe(false);});
  it('uses custom keys and clears held state on pause/focus loss',()=>{const k=new KeyboardInput(),bindings={...defaultBindings()[0],right:'KeyL'};k.down('KeyD');expect(k.sample(bindings).steer).toBe(0);k.down('KeyL');expect(k.sample(bindings).steer).toBe(1);k.clear();expect(k.sample(bindings)).toEqual(neutral());});
  it('rejects cross-player conflicts and reserved navigation keys',()=>{expect(bindingError(defaultBindings(),0,'boost','Enter')).toContain('Player 2');expect(bindingError(defaultBindings(),0,'boost','Escape')).toContain('reserved');expect(bindingError(defaultBindings(),0,'boost','Tab')).not.toBe('');expect(bindingError(defaultBindings(),0,'boost','KeyF')).toBe('');});
});
