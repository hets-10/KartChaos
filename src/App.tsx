import {useEffect,useRef,useState} from 'react';
import {Race,ITEMS,lessons,neutral,timeText,type Phase,type PlayerConfig,type Mode,type Difficulty} from './game';
import {IslandScene} from './scene';
import {AudioEngine} from './audio';
import {CameraTracker} from './camera';
import {getTrack,tracks,type TrackId} from './tracks';
import {KeyboardInput,loadPlayers,loadPreferences,saveStored,keyLabel} from './preferences';
import {DriverPhoto} from './DriverPhoto';
import {Settings} from './Settings';
import {Results} from './Results';
import {KartArt,CircuitArt,ItemArt} from './Art';
import {CircuitShelf,CircuitBrief,ControlLegend,paintNames} from './RacePresentation';
import './graphics.css';
const colors=['#ff6748','#40dfd0','#b693f6','#ffcf5b','#f47bb6','#63a9ff'];
const modeInfo:{id:Mode;title:string;detail:string}[]=[
 {id:'solo',title:'Solo race',detail:'You vs. an AI rival'},
 {id:'versus',title:'Two players',detail:'Local split screen'},
 {id:'practice',title:'Practice',detail:'Empty track · unlimited items'},
 {id:'tutorial',title:'Driving school',detail:'Learn by doing'},
];
function TrackShape({id}:{id:TrackId}){const track=getTrack(id);return <svg viewBox="-210 -210 420 420" aria-hidden="true"><polygon points={track.points.map(p=>p[0]+','+p[2]).join(' ')} fill="none" stroke="currentColor" strokeWidth="12" strokeLinejoin="round"/><circle cx={track.points[0][0]} cy={track.points[0][2]} r="14" fill="currentColor"/></svg>;}
function RaceMap({race,scene,colors}:{race:Race;scene:IslandScene|null;colors:string[]}){if(!scene)return null;const points=Array.from({length:101},(_,i)=>{const p=scene.point(i/100*race.length).p;return p.x+','+p.z;}).join(' ');return <svg className="minimap" viewBox="-220 -220 440 440" aria-label="Race progress map"><polyline points={points} fill="none" stroke="#ffffffaa" strokeWidth="8"/>{race.activeKarts.map(k=>{const p=scene.point(k.distance).p;return <g key={k.id}><circle cx={p.x} cy={p.z} r="19" fill={colors[k.id]} stroke="white" strokeWidth="4"/><text x={p.x} y={p.z+7} textAnchor="middle" fill="#112638" fontSize="24" fontWeight="900">{k.id+1}</text></g>;})}</svg>;}
export default function App(){
 const [photoPlayer,setPhotoPlayer]=useState<number|null>(null);
 const [photoQueue,setPhotoQueue]=useState<number[]>([]);
 const [configs,setConfigs]=useState<PlayerConfig[]>(loadPlayers),[prefs,setPrefs]=useState(loadPreferences);
 const [mode,setMode]=useState<Mode>('solo'),[trackId,setTrackId]=useState<TrackId>('sunset'),[difficulty,setDifficulty]=useState<Difficulty>('normal'),[laps,setLaps]=useState(3),[chaos,setChaos]=useState(false);
 const [phase,setPhase]=useState<Phase>('menu'),[,refresh]=useState(0),[modal,setModal]=useState<'help'|'settings'|null>(null),[renderError,setRenderError]=useState('');
 const [announcement,setAnnouncement]=useState('');
 const [loadingWorld,setLoadingWorld]=useState(false),[worldError,setWorldError]=useState('');
 const loadingWorldRef=useRef(false);
 const raceRef=useRef(new Race()),audioRef=useRef(new AudioEngine()),trackerRef=useRef(new CameraTracker()),keyboardRef=useRef(new KeyboardInput());
 const race=raceRef.current,tracker=trackerRef.current,keyboard=keyboardRef.current;
 const configRef=useRef(configs),prefsRef=useRef(prefs),modalRef=useRef(modal);configRef.current=configs;prefsRef.current=prefs;modalRef.current=modal;
 const host=useRef<HTMLDivElement>(null),preview=useRef<HTMLCanvasElement>(null),pip=useRef<HTMLCanvasElement>(null),sceneRef=useRef<IslandScene|null>(null);
 const changePhase=(p:Phase)=>{race.phase=p;setPhase(p);};
 const name=(id:number)=>race.mode==='solo'&&id===1?'Circuit Bot':configs[id].name.trim()||'Player '+(id+1);
 const openSettings=()=>{audioRef.current.start();race.pause();setPhase(race.phase);keyboard.clear();setModal('settings');};
 useEffect(()=>{
  try{sceneRef.current=new IslandScene(host.current!,race,configRef.current);}catch(e){setRenderError('Could not start 3D rendering. Enable hardware acceleration and reload. '+String(e));return;}
  let frame=0,last=performance.now(),uiTime=0,accumulator=0;
  const animate=(now:number)=>{
   const dt=Math.min(.05,(now-last)/1000);last=now;tracker.tick(now);accumulator+=dt;
   if(accumulator>=1/60){
    const inputs=configRef.current.map((c,i)=>c.mode==='keyboard'?keyboard.sample(prefsRef.current.keys[i]):tracker.controls.getInput(i,now));
    while(accumulator>=1/60){race.step(1/60,inputs);accumulator-=1/60;}keyboard.consumed();
   }
   race.events.splice(0).forEach(e=>{audioRef.current.play(e);const line=({count:'GET READY',go:'GO!',boost:'BOOST!',pickup:'POWERUP!',launch:'CHAOS!',hit:'OOF!',lap:'FINAL LAP!',win:'YOU WIN!'} as Record<string,string>)[e];if(line){setAnnouncement(line);window.setTimeout(()=>setAnnouncement(current=>current===line?'':current),e==='win'?2200:900);}});
   const active=race.activeKarts;audioRef.current.update(active.reduce((n,k)=>n+k.speed,0)/active.length,race.phase==='racing',active.some(k=>k.drifting),active.some(k=>k.boost>0));
   if(sceneRef.current){sceneRef.current.reducedMotion=prefsRef.current.reducedMotion;if(!['menu','setup'].includes(race.phase))sceneRef.current.render(dt,race.phase==='calibration');}
   if(preview.current)tracker.draw(preview.current);if(pip.current)tracker.draw(pip.current);
   if(now-uiTime>80){uiTime=now;refresh(n=>n+1);setPhase(race.phase);}frame=requestAnimationFrame(animate);
  };frame=requestAnimationFrame(animate);
  const down=(e:KeyboardEvent)=>{
   if(e.defaultPrevented||modalRef.current)return;
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
   if(e.target instanceof HTMLButtonElement&&['Enter','Space'].includes(e.code))return;
   if(e.code==='Escape'&&!e.repeat){e.preventDefault();keyboard.clear();if(race.phase==='paused')race.resume();else race.pause();setPhase(race.phase);return;}
   const isBound=prefsRef.current.keys.slice(0,race.split?2:1).some(row=>Object.values(row).includes(e.code));
   if(isBound&&['racing','countdown'].includes(race.phase))e.preventDefault();
   keyboard.down(e.code,e.repeat);
  };
  const up=(e:KeyboardEvent)=>keyboard.up(e.code);
  const blur=()=>{keyboard.clear();race.pause();setPhase(race.phase);};
  const visibility=()=>{if(document.hidden)blur();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);tracker.stop();sceneRef.current?.dispose();audioRef.current.dispose();};
 },[]);
 useEffect(()=>{sceneRef.current?.setColors(configs);saveStored('kart-chaos-players',configs.map(({photo,...p})=>p));},[configs]);
 useEffect(()=>{audioRef.current.setVolume(prefs.volume);tracker.sensitivity=prefs.sensitivity;saveStored('kart-chaos-settings',prefs);},[prefs]);
 const updatePlayer=(i:number,patch:Partial<PlayerConfig>)=>setConfigs(c=>c.map((p,j)=>i===j?{...p,...patch}:p));
 const startRace=async()=>{
  if(loadingWorldRef.current)return;
  loadingWorldRef.current=true;setLoadingWorld(true);setWorldError('');
  keyboard.clear();audioRef.current.start();race.chaos=chaos;race.reset({mode,trackId,difficulty,laps});
  const startingPhase=race.phase;race.phase='setup';setPhase('setup');
  try{
   if(sceneRef.current?.track.id!==trackId||sceneRef.current?.world.error){sceneRef.current?.dispose();sceneRef.current=new IslandScene(host.current!,race,configs);}
   const scene=sceneRef.current!;await scene.world.ready;
   if(scene.disposed)return;
   if(scene.world.error)throw new Error(scene.world.error);
   await scene.renderer.compileAsync(scene.scene,scene.cameras[0]);
   if(scene.disposed)return;
   scene.setColors(configs);scene.cameraReady=false;scene.lastEffect=0;scene.particles.particles.forEach(p=>p.life=0);
   (document.activeElement as HTMLElement|null)?.blur();race.phase=startingPhase;setPhase(startingPhase);
  }catch(error){setWorldError(error instanceof Error?error.message:'Could not load the circuit. Please retry.');}
  finally{loadingWorldRef.current=false;setLoadingWorld(false);}
 };
 const cameraSlots=configs.map((c,i)=>c.mode==='camera'&&(i===0||mode==='versus')?i:-1).filter(i=>i>=0);
 const beginCameraCalibration=()=>{changePhase('calibration');tracker.controls.singlePlayer=mode!=='versus';tracker.controls.begin();void tracker.start();};
 const setupContinue=()=>{
  const needsPhoto=cameraSlots.filter(i=>!configs[i].photo);
  if(needsPhoto.length){setPhotoQueue(needsPhoto);setPhotoPlayer(needsPhoto[0]);return;}
  if(cameraSlots.length){beginCameraCalibration();}
  else{tracker.stop();startRace();}
 };
 useEffect(()=>{
  if(phase!=='calibration')return;
  const timer=window.setInterval(()=>{
   const controls=tracker.controls,previousStage=controls.stage,previousCount=controls.startIn;
   const ready=controls.advanceCalibration(cameraSlots,performance.now(),!document.hidden&&document.hasFocus()&&tracker.ready&&!tracker.error);
   if(controls.stage!==previousStage)audioRef.current.play('lesson');
   if(controls.startIn!==null&&controls.startIn>0&&controls.startIn!==previousCount)audioRef.current.play('count');
   if(ready)startRace();
   else refresh(n=>n+1);
  },100);
  return()=>window.clearInterval(timer);
 },[phase,mode,trackId,difficulty,chaos,configs]);
 const goMenu=()=>{tracker.stop();changePhase('menu');keyboard.clear();setModal(null);};
 const chooseMode=(m:Mode)=>{setMode(m);changePhase('setup');audioRef.current.start();};
 const resume=()=>{keyboard.clear();race.resume();setPhase(race.phase);};
 const keyHint=(i:number)=>{const k=prefs.keys[i];return keyLabel(k.left)+' / '+keyLabel(k.right)+' steer · '+keyLabel(k.drift)+' drift · '+keyLabel(k.boost)+' jump · '+keyLabel(k.item)+' item';};
 const cameraDirection=(i:number)=>{const value=tracker.controls.inputs[i].steer;return Math.abs(value)<.08?'CENTERED':value<0?'LEAN LEFT':'LEAN RIGHT';};
 const racing=['countdown','racing','paused','results'].includes(phase);
 const displayed=race.split?race.karts:[race.karts[0]];
 const lesson=lessons[race.lesson];
 return <main className={['phase-'+phase,prefs.reducedMotion?'reduced-motion':'',prefs.highContrast?'high-contrast':'',racing&&!race.split?'single-view':''].join(' ')}>
  <div ref={host} className="world"/>
  {(loadingWorld||worldError)&&<div className="world-loading" role={worldError?'alert':'status'} aria-live="polite"><div className="world-loading-card"><span className="world-loading-kicker">KART CHAOS / THE GRAND TOUR</span><h2>{worldError?'One more pit stop.':'Opening the circuit.'}</h2><p>{worldError||'Planting the palms. Polishing the paint. Almost on the grid.'}</p>{worldError?<button className="primary" onClick={startRace}>RETRY CIRCUIT ↗</button>:<div className="world-loading-line"/>}<span className="world-loading-route">{getTrack(trackId).name.toUpperCase()}</span></div></div>}
  {renderError&&<div className="fatal" role="alert">{renderError}</div>}
  {['menu','setup','calibration'].includes(phase)&&<div className="menu-shade"/>}
  {phase==='menu'&&<div className="menu-screen">
   <header><span className="brand"><span className="brand-mark">KC</span> INDEPENDENT RACING CLUB</span><button className="menu-settings" onClick={openSettings} aria-label="Settings">⚙ <span>SETTINGS</span></button></header>
   <div className="title-layout">
    <section className="hero"><div className="eyebrow">NO BRAKES. GOOD COMPANY.</div><h1 aria-label="Kart Chaos"><span>KART</span><em>CHAOS<span className="title-star">✳</span></em></h1><p className="tagline">Small karts. Big rivalries.</p><p className="intro">Pick a circuit. Find your line. Cause a little trouble.</p>
     <button className="primary play" onClick={()=>chooseMode('solo')}><span><small>01 / GET ON THE GRID</small>LET’S RACE</span><b>↗</b></button>
     <div className="menu-secondary"><button onClick={()=>chooseMode('practice')}><span>02</span> Free practice <b>↗</b></button><button onClick={()=>chooseMode('tutorial')}><span>03</span> Driving school <b>↗</b></button></div>
    </section>
    <aside className="title-art"><div className="orbit-type">THE ALL-BODY GRAND PRIX</div><div className="hero-disc"><span>01</span></div><div className="hero-kart"><KartArt color={configs[0].color} photo={configs[0].photo}/></div><span className="art-sticker">LEAN INTO<br/><b>THE CHAOS.</b><i>↗</i></span><div className="hero-caption"><span>YOUR RIDE. YOUR RULES.</span><span>BODY / KEYBOARD</span></div></aside>
   </div>
   <CircuitShelf choose={id=>{setTrackId(id);chooseMode('solo');}}/>
   <div className="menu-utility"><button onClick={()=>chooseMode('versus')}>Bring a rival <span>Two-player split screen ↗</span></button><button onClick={()=>setModal('help')}>First time here? <span>Learn the moves ↗</span></button></div>
   <footer><span><i className="live-dot"/> LOCAL PLAY · NO LOBBY REQUIRED</span><span>MOVE YOUR BODY. OR JUST YOUR FINGERS.</span><span>KC / RACE CLUB</span></footer>
  </div>}
  {phase==='setup'&&<section className={'panel setup setup-v2 '+(mode==='versus'?'setup-versus':'')}>
   <div className="setup-heading"><div><div className="eyebrow">KART CHAOS / RACE HQ</div><h2>Make some trouble.</h2></div><span className="garage-stamp">RACE<br/>DAY<span>↗</span></span></div>
   <div className="mode-grid" aria-label="Game mode">{modeInfo.map((m,i)=><button key={m.id} aria-pressed={mode===m.id} className={mode===m.id?'selected':''} onClick={()=>setMode(m.id)}><span className="mode-number">0{i+1}</span><div><strong>{m.title}</strong><span>{m.detail}</span></div><b>↗</b></button>)}</div>
   <div className="race-builder">
    <section className="circuit-picker"><div className="section-label"><span>01 / PICK YOUR PLAYGROUND</span><span>3 CIRCUITS</span></div>
     <div key={trackId} className={'circuit-poster circuit-'+trackId}><CircuitArt id={trackId}/><span className="poster-number">0{tracks.findIndex(t=>t.id===trackId)+1}</span><div className="poster-title"><span>{trackId==='sunset'?'COASTAL CLUB':trackId==='canyon'?'DESERT DIVISION':'AFTER HOURS'}</span><h3>{getTrack(trackId).name}</h3><p>{getTrack(trackId).subtitle}</p></div><div className="circuit-map"><TrackShape id={trackId}/></div></div>
     <div className="track-grid" aria-label="Choose a circuit">{tracks.map((t,i)=><button key={t.id} aria-pressed={trackId===t.id} className={'track-card '+(trackId===t.id?'selected':'')} style={{'--track':t.accent} as React.CSSProperties} onClick={()=>setTrackId(t.id)}><span>0{i+1}</span><div><strong>{t.name}</strong><small>{t.difficulty.split(' · ')[0]}</small></div></button>)}</div>
     <div className="circuit-spec"><span><b>{getTrack(trackId).length.toLocaleString()}</b> METRES</span><span><b>{mode==='practice'||mode==='tutorial'?'∞':String(laps).padStart(2,'0')}</b> LAPS</span><span><b>{mode==='versus'?'02':mode==='solo'?'01 + AI':'01'}</b> RACERS</span></div>
     {mode!=='practice'&&mode!=='tutorial'&&<div className="lap-picker" aria-label="Choose number of laps"><div><span>RACE DISTANCE</span><small>How long is this one?</small></div><div className="lap-options">{[1,3,5].map(option=><button key={option} aria-pressed={laps===option} className={laps===option?'selected':''} onClick={()=>setLaps(option)}><strong>{option}</strong><small>{option===1?'SPRINT':option===3?'CLUB STANDARD':'ENDURANCE'}</small></button>)}</div></div>}
     <CircuitBrief id={trackId}/>
    </section>
    <section className="garage"><div className="section-label"><span>02 / MAKE IT YOURS</span><span>THE GARAGE</span></div>
     <div className={'player-grid '+(mode!=='versus'?'one-player':'')}>{configs.slice(0,mode==='versus'?2:1).map((p,i)=><article className="player-card" key={i} style={{'--player':p.color} as React.CSSProperties}><div className="player-label">RACER 0{i+1}<span>{mode==='versus'?(i===0?'TOP SCREEN':'BOTTOM SCREEN'):'FULL SCREEN'}</span></div><div className="garage-kart"><span className="garage-number">0{i+1}</span><KartArt color={p.color} number={i+1} photo={p.photo}/><span className="kart-model">THE TROUBLEMAKER / CLUB SPEC</span></div><div className="swatches" role="group" aria-label={'Player '+(i+1)+' kart color'}>{colors.map(color=><button key={color} style={{background:color}} className={p.color===color?'selected':''} aria-label={paintNames[colors.indexOf(color)]} title={paintNames[colors.indexOf(color)]} aria-pressed={p.color===color} onClick={()=>updatePlayer(i,{color})}/>)}</div><div className="setup-fields"><label>Racer name<input maxLength={18} value={p.name} onChange={e=>updatePlayer(i,{name:e.target.value})}/></label><label>Control mode<select value={p.mode} onChange={e=>updatePlayer(i,{mode:e.target.value as PlayerConfig['mode']})}><option value="keyboard">Keyboard</option><option value="camera">Body tracking · webcam</option></select></label></div>
      <div className="driver-license"><div><small>DRIVER LICENSE</small><strong>{p.photo?'That’s you on the grid.':'Your face. Your racer.'}</strong></div><button onClick={()=>{tracker.stop();setPhotoPlayer(i);}}>{p.photo?'Retake photo':'Add your face ↗'}</button>{p.photo&&<button aria-label={'Remove Player '+(i+1)+' photo'} onClick={()=>updatePlayer(i,{photo:undefined})}>Remove</button>}</div><div className="paint-caption"><span>FACTORY PAINT</span><strong>{paintNames[colors.indexOf(p.color)]??'Custom finish'}</strong></div><ControlLegend player={p} keys={prefs.keys[i]}/><p className={'control-hint '+(p.mode==='camera'?'camera-hint':'')}>{p.mode==='keyboard'?keyHint(i):mode==='versus'?'Stand in the '+(i===0?'left':'right')+' half of the mirrored preview.':'Stand centered with your whole body visible.'}</p>
      <div className="input-test"><span>STEER TEST</span><meter aria-label={'Player '+(i+1)+' steering'} min="-1" max="1" value={p.mode==='keyboard'?keyboard.sample(prefs.keys[i]).steer:tracker.controls.inputs[i].steer}/></div>
     </article>)}</div>
     {mode==='solo'&&<div className="rival-setup"><div><span className="pill">MEET YOUR MATCH</span><h3>Circuit Bot <span>↗</span></h3></div><label>AI difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}><option value="easy">Easy · warm-up</option><option value="normal">Normal · brings the heat</option><option value="hard">Hard · no mercy</option></select></label></div>}
     {mode==='practice'&&<p className="mode-note">All the track. None of the pressure. Unlimited laps and refilling power-ups.</p>}
     {mode==='tutorial'&&<p className="mode-note">Find your feet in four hands-on lessons. Steer, drift, jump, then cause chaos.</p>}
    </section>
   </div>
   <div className="panel-bottom"><button className="text-button" onClick={goMenu}>← Back</button>{mode!=='tutorial'&&<label className="toggle"><input type="checkbox" checked={chaos} onChange={e=>setChaos(e.target.checked)}/> Chaos mode</label>}<button className="controls-link" onClick={openSettings}>Controls & accessibility</button><button className="primary" onClick={setupContinue}>{cameraSlots.length?'CALIBRATE CAMERA':mode==='tutorial'?'START LESSONS':'START YOUR ENGINES'} ↗</button></div>
  </section>}
  {phase==='calibration'&&<section className="panel calibration"><div className="eyebrow">FIND YOUR GROOVE</div><h2>{tracker.controls.stage==='standing'?'Stand tall. Feet in frame.':tracker.controls.stage==='leaning'?'Lean left. Then lean right.':'All set. Stay in frame.'}</h2><p>{tracker.controls.stage==='standing'?'Step back until your whole body is visible, then hold still for about two seconds.':tracker.controls.stage==='leaning'?'Keep your hips centered and lean comfortably both ways.':'Return to your natural driving stance. The race will start automatically.'} {mode==='versus'?'Stay in your marked zones.':'Stand in the center of the camera.'}</p><div className="hands-free-status" role="status" aria-live="polite"><strong>{tracker.controls.stage==='ready'?(tracker.controls.startIn===null?'Waiting for everyone to be in frame…':'Starting automatically in '+tracker.controls.startIn+'…'):'HANDS-FREE SETUP'}</strong><span>{tracker.controls.stage==='ready'?'Stay visible for the full countdown.':'No more buttons. Each step continues automatically.'}</span></div><canvas ref={preview} width={800} height={450} className="camera-preview"/>
   <div className="calibration-status">{configs.slice(0,mode==='versus'?2:1).map((p,i)=><div key={i}><strong>{p.name||'Player '+(i+1)}</strong><span>{p.mode==='keyboard'?'Keyboard ready':Math.round(tracker.controls.confidence[i]*100)+'% confidence · '+(tracker.controls.stage==='standing'?Math.min(100,tracker.controls.samples[i].length*2)+'% calibrated':(tracker.controls.leanLeft[i]>.2?'✓':'○')+' left · '+(tracker.controls.leanRight[i]>.2?'✓':'○')+' right')}</span>{p.mode==='camera'&&<b className="camera-direction">{cameraDirection(i)}</b>}<meter aria-label={'Player '+(i+1)+' lean'} min="-1" max="1" value={tracker.controls.inputs[i].steer}/></div>)}</div>
   <p className={tracker.error?'error':'camera-message'} role="status">{tracker.error||tracker.status} · {Math.round(tracker.fps)} tracking FPS</p><div className="panel-bottom"><button className="text-button" onClick={()=>{tracker.stop();changePhase('setup');}}>← Change controls</button>{tracker.error&&<button onClick={()=>void tracker.start()}>Retry camera</button>}<button onClick={()=>{tracker.controls.begin();keyboard.clear();refresh(n=>n+1);}}>Restart calibration</button></div>
  </section>}
  {racing&&<>
   {race.split&&<div className="split-line"><span>KART CHAOS <b>×</b> {getTrack(race.trackId).name.toUpperCase()}</span></div>}
   {displayed.map((k,i)=><section key={i} className={'hud hud-'+i+' '+(k.boost>0?'hud-boost ':'')+(k.impact>0?'hud-hit':'')} style={{'--player':configs[i].color} as React.CSSProperties}>
    <div className="hud-top"><div className="racer">{configs[i].photo&&<img className="hud-portrait" src={configs[i].photo} alt="Your driver portrait"/>}<span className="position">{race.freePlay?'∞':race.rank(k)}{!race.freePlay&&<small>{race.rank(k)===1?'ST':'ND'}</small>}</span><div><span className="hud-label">{race.freePlay?race.mode.toUpperCase():'PLAYER '+(i+1)}</span><strong>{name(i)}</strong></div></div><div className="lap"><span className="hud-label">LAP</span><strong>{race.freePlay?k.lap:Math.min(race.laps,k.lap)}<small>/ {race.freePlay?'∞':race.laps}</small></strong></div><div className="race-clock">{timeText(k.finish??race.time)}</div></div>
    <div className="hud-bottom"><div className="speed"><strong>{Math.round(k.speed*3.6)}</strong><span>KM/H</span></div><div className="boost-gauge"><span>{k.boost>0?'TURBO ACTIVE':k.drifting?'DRIFT · '+(k.charge>2?'LEVEL 3':k.charge>1?'LEVEL 2':'LEVEL 1'):'LEAN TO CHARGE'}</span><div><i style={{width:(k.boost>0?100:k.charge/3*100)+'%'}}/></div><small>{k.cooldown>0?'Boost cooldown '+k.cooldown.toFixed(1)+'s':'Hands up for boost'}</small></div><div className={'item-slot '+(k.item?'has-item ':'')+(k.eventTime>0&&k.event.endsWith('!')?'item-flash':'')}><span><ItemArt item={k.item}/></span><div><small>{k.item?'SQUAT TO USE':race.freePlay?'REFILLING…':'FIND AN ITEM BOX'}</small><strong>{k.item??'Empty'}</strong></div><kbd>{configs[i].mode==='camera'?'SQUAT':keyLabel(prefs.keys[i].item)}</kbd></div></div>
    {configs[i].mode==='camera'&&<div className="camera-feedback"><span>{cameraDirection(i)}</span><i style={{transform:`scaleX(${Math.max(.08,Math.abs(tracker.controls.inputs[i].steer))})`,marginLeft:tracker.controls.inputs[i].steer<0?'auto':undefined,marginRight:tracker.controls.inputs[i].steer>0?'auto':undefined}}/></div>}{k.eventTime>0&&<div className="race-event">{k.event}</div>}{k.shield>0&&<div className="status-badges">◇ SHIELD · {k.shield.toFixed(1)}s</div>}{k.slow>0&&<div className="status-badges danger">ϟ SLOWED · {k.slow.toFixed(1)}s</div>}
    {k.finish!==null&&<div className="finished-badge">FINISHED · {timeText(k.finish)}<small>{race.winner===i?'You took the crown!':'Nice race!'} {race.karts.some(p=>p.finish===null)?'Waiting for the rival…':''}</small></div>}
    {configs[i].mode==='camera'&&(!tracker.controls.inputs[i].tracked||performance.now()-tracker.controls.lastSeen[i]>350)&&<div className="tracking-warning">Tracking lost — return to your camera position. Kart slowing safely.</div>}
   </section>)}
   <RaceMap race={race} scene={sceneRef.current} colors={configs.map(c=>c.color)}/>
   <button className="pause-button" aria-label="Pause race" disabled={phase==='results'} onClick={()=>{keyboard.clear();race.pause();setPhase(race.phase);}}>Ⅱ</button>
   {race.mode==='solo'&&<aside className="rival-hud"><span className="pill">{difficulty.toUpperCase()} AI</span><strong>Circuit Bot · {race.rank(race.karts[1])===1?'1st':'2nd'}</strong><span>{race.karts[1].finish!==null?'FINISHED':Math.abs(race.karts[1].distance-race.karts[0].distance).toFixed(0)+' m '+(race.karts[1].distance>race.karts[0].distance?'ahead':'behind')}</span></aside>}
   {prefs.showPip&&tracker.stream&&<canvas ref={pip} width={320} height={180} className="pip"/>}
   {race.mode==='practice'&&phase==='racing'&&<aside className="practice-tools"><div><span className="pill">UNLIMITED ITEMS</span><span>Choose one. Use it. It refills.</span></div><div className="practice-items">{ITEMS.map(item=><button aria-pressed={race.practiceItem===item} key={item} onClick={e=>{race.selectPracticeItem(item);keyboard.clear();e.currentTarget.blur();}}><ItemArt item={item}/> {item}</button>)}</div><button onClick={()=>{race.finishPractice();setPhase(race.phase);}}>End practice</button></aside>}
   {race.mode==='tutorial'&&phase==='racing'&&<aside className="lesson-panel" aria-live="polite"><div className="lesson-progress">{lessons.slice(0,4).map((_,i)=><i className={race.lesson>=i?'done':''} key={i}/>)}</div><span className="pill">{race.lesson===4?'GRADUATED':'LESSON '+(race.lesson+1)+' / 4'}</span><h3>{lesson.title}</h3><p>{lesson.body}</p><p className="lesson-controls">{configs[0].mode==='camera'?['Lean torso left, then right.','Squat + lean gently, then stand.','A small hop. Keep shoulders and hips visible.','Extend an arm in a deliberate throwing motion.','You’re ready!'][race.lesson]:[keyLabel(prefs.keys[0].left)+' then '+keyLabel(prefs.keys[0].right),keyLabel(prefs.keys[0].drift)+' + '+keyLabel(prefs.keys[0].left)+' or '+keyLabel(prefs.keys[0].right)+' · then release drift',keyLabel(prefs.keys[0].boost),keyLabel(prefs.keys[0].item),'All four moves complete.'][race.lesson]}</p>{race.lesson===0&&<small>{race.lessonLeft>.25?'✓':'○'} Left · {race.lessonRight>.25?'✓':'○'} Right</small>}{race.lesson===4&&<button className="primary" onClick={()=>{race.finishPractice();setPhase(race.phase);}}>FINISH LESSONS ↗</button>}</aside>}
  </>}
  {phase==='countdown'&&<div className="countdown countdown-hit" key={Math.ceil(race.countdown)}>{Math.max(1,Math.min(3,Math.ceil(race.countdown)))}<small>{race.mode==='tutorial'?'MOVE YOUR BODY · LEARN THE LINE':'ENGINES HOT · HOLD YOUR LINE'}</small></div>}
  {phase==='racing'&&race.time<.8&&<div className="countdown go-hit">GO!<small>MAKE SOME TROUBLE</small></div>}
  {announcement&&phase==='racing'&&<div className="announcer" role="status" aria-live="polite">{announcement}</div>}
  {phase==='paused'&&<div className="overlay"><section className="panel pause-panel" role="dialog" aria-modal="true" aria-label="Race paused"><div className="eyebrow">TAKE A BREATHER</div><h2>Chaos, paused.</h2><button className="primary" onClick={resume}>BACK TO THE RACE ↗</button><button onClick={openSettings}>Settings & controls</button>{cameraSlots.length>0&&<button onClick={()=>{tracker.controls.begin();changePhase('calibration');void tracker.start();}}>Recalibrate & restart</button>}<button onClick={()=>{tracker.stop();setConfigs(c=>c.map(p=>({...p,mode:'keyboard'})));resume();}}>Use keyboard controls</button><button onClick={startRace}>Restart session</button>{race.freePlay&&<button onClick={()=>{race.finishPractice();setPhase(race.phase);}}>End session</button>}<button className="text-button" onClick={goMenu}>Return to menu</button><p>Escape also pauses and resumes.</p></section></div>}
  {phase==='results'&&<Results race={race} configs={configs} name={name} restart={startRace} menu={goMenu}/>}
  {modal==='settings'&&<Settings value={prefs} onChange={setPrefs} onClose={()=>{keyboard.clear();setModal(null);}}/>}
  {photoPlayer!==null&&<DriverPhoto key={photoPlayer} name={configs[photoPlayer].name||'Player '+(photoPlayer+1)} onClose={()=>{setPhotoPlayer(null);setPhotoQueue([]);}} onSave={photo=>{const current=photoPlayer;const required=photoQueue.length>0;updatePlayer(current,{photo});const rest=photoQueue.slice(1);if(rest.length){setPhotoQueue(rest);setPhotoPlayer(rest[0]);}else{setPhotoQueue([]);setPhotoPlayer(null);if(required&&phase==='setup')beginCameraCalibration();}}}/>}
  {modal==='help'&&<div className="overlay modal-layer"><section className="panel modal" role="dialog" aria-modal="true" aria-labelledby="help-title"><button className="close" aria-label="Close help" onClick={()=>setModal(null)}>×</button><div className="eyebrow">A LITTLE FRIENDLY COMPETITION</div><h2 id="help-title">Move it. Win it.</h2><div className="how-grid"><article><b>↔</b><h3>Steer your line</h3><p>Acceleration and road heading are assisted. Lean to dodge attacks and pick up item boxes.</p></article><article><b>⌄</b><h3>Squat to drift</h3><p>Squat while leaning. Hold until sparks charge, then stand to release your boost.</p></article><article><b>↑</b><h3>Jump for turbo</h3><p>A small hop gives a short boost. Stay fully visible and wait for the cooldown.</p></article><article><b>↗</b><h3>Throw an item</h3><p>Collect a box, then extend an arm with a deliberate throwing motion.</p></article></div><div className="keyboard-reference">{configs.map((_,i)=><p key={i}><strong>Player {i+1}</strong>{keyHint(i)}</p>)}<p>Escape pauses. Keys can be remapped in Settings.</p></div><p className="fine-print">Shields block one attack. After a hit, you get brief protection from another attack. Trailing racers have better odds of recovery items.</p><button className="primary" onClick={()=>{setModal(null);chooseMode('tutorial');}}>TRY THE HANDS-ON TUTORIAL ↗</button></section></div>}
 </main>;
}
