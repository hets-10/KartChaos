import type {GameEvent} from './game';
export class AudioEngine {
 ctx:AudioContext|null=null;master:GainNode|null=null;engine:OscillatorNode|null=null;engineGain:GainNode|null=null;skidGain:GainNode|null=null;boostGain:GainNode|null=null;musicGain:GainNode|null=null;musicTimer:number|null=null;musicStep=0;volume=.25;
 start(){try{if(!this.ctx){
  this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.master.gain.value=this.volume;
  this.engine=this.ctx.createOscillator();this.engine.type='sawtooth';this.engineGain=this.ctx.createGain();this.engineGain.gain.value=0;
  const low=this.ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=350;this.engine.connect(low);low.connect(this.engineGain);this.engineGain.connect(this.master);this.engine.start();
  const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const noise=this.ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
  const skid=this.ctx.createBiquadFilter();skid.type='bandpass';skid.frequency.value=1500;skid.Q.value=.7;this.skidGain=this.ctx.createGain();this.skidGain.gain.value=0;noise.connect(skid);skid.connect(this.skidGain);this.skidGain.connect(this.master);
  const boost=this.ctx.createBiquadFilter();boost.type='lowpass';boost.frequency.value=900;this.boostGain=this.ctx.createGain();this.boostGain.gain.value=0;noise.connect(boost);boost.connect(this.boostGain);this.boostGain.connect(this.master);noise.start();
  this.musicGain=this.ctx.createGain();this.musicGain.gain.value=.035;this.musicGain.connect(this.master);
  this.musicTimer=window.setInterval(()=>this.playMusicNote(),360);
 }void this.ctx.resume();}catch{/* Audio is optional. */}}
 setVolume(v:number){this.volume=v;if(this.master)this.master.gain.value=v;}
 playMusicNote(){if(!this.ctx||!this.musicGain)return;const notes=[220,277.18,329.63,440,329.63,277.18];const t=this.ctx.currentTime;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='triangle';osc.frequency.value=notes[this.musicStep++%notes.length];gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.12,t+.03);gain.gain.exponentialRampToValueAtTime(.001,t+.3);osc.connect(gain);gain.connect(this.musicGain);osc.start(t);osc.stop(t+.32);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 update(speed:number,active:boolean,drifting=false,boosting=false){if(this.ctx&&this.engine&&this.engineGain){
  const t=this.ctx.currentTime;this.engine.frequency.setTargetAtTime(40+speed*2,t,.1);this.engineGain.gain.setTargetAtTime(active?.03:0,t,.1);
  this.skidGain?.gain.setTargetAtTime(active&&drifting?.07:0,t,.1);this.boostGain?.gain.setTargetAtTime(active&&boosting?.1:0,t,.1);
 }}
 play(event:GameEvent){if(!this.ctx||!this.master)return;
  const frequencies:Record<GameEvent,number[]>={count:[440],go:[880,1100],boost:[200,400,800],drift:[140,180],pickup:[600,900,1200],launch:[600,200],hit:[90,50],bump:[75,45],block:[1000,1400],lesson:[660,880],lap:[660,880,1100],win:[523,659,784,1046]};
  frequencies[event].forEach((f,i)=>{const osc=this.ctx!.createOscillator(),gain=this.ctx!.createGain(),t=this.ctx!.currentTime+i*.09;osc.type=event==='hit'||event==='bump'?'sawtooth':'triangle';osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(Math.max(30,f*.65),t+.18);gain.gain.setValueAtTime(.1,t);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.connect(gain);gain.connect(this.master!);osc.start(t);osc.stop(t+.22);osc.onended=()=>{osc.disconnect();gain.disconnect();};});
 }
 dispose(){if(this.musicTimer!==null)window.clearInterval(this.musicTimer);this.musicTimer=null;void this.ctx?.close();}
}
