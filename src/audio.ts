import type {GameEvent} from './game';
export class AudioEngine {
  ctx:AudioContext|null=null;master:GainNode|null=null;engine:OscillatorNode|null=null;engineGain:GainNode|null=null;volume=.25;
  start(){try{if(!this.ctx){this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.master.gain.value=this.volume;this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;this.engine.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();}void this.ctx.resume();}catch{/* Audio is optional. */}}
  setVolume(v:number){this.volume=v;if(this.master)this.master.gain.value=v;}
  update(speed:number,active:boolean){if(this.ctx&&this.engine&&this.engineGain){this.engine.frequency.setTargetAtTime(40+speed*2,this.ctx.currentTime,.1);this.engineGain.gain.setTargetAtTime(active?.025:0,this.ctx.currentTime,.1);}}
  play(event:GameEvent){if(!this.ctx||!this.master)return;const frequencies:Record<GameEvent,number[]>={count:[440],go:[880,1100],boost:[200,400,800],drift:[140,180],pickup:[600,900,1200],launch:[600,200],hit:[90,50],lap:[660,880,1100],win:[523,659,784,1046]};frequencies[event].forEach((f,i)=>{const osc=this.ctx!.createOscillator(),gain=this.ctx!.createGain(),t=this.ctx!.currentTime+i*.09;osc.type=event==='hit'?'sawtooth':'triangle';osc.frequency.setValueAtTime(f,t);gain.gain.setValueAtTime(.12,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(gain);gain.connect(this.master!);osc.start(t);osc.stop(t+.22);});}
  dispose(){void this.ctx?.close();}
}
