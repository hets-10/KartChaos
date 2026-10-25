import {CircuitArt,KartArt} from './Art';
import {tracks,type TrackId} from './tracks';
import {keyLabel,type Preferences} from './preferences';
import {timeText,type Race,type PlayerConfig} from './game';

export const paintNames=['Hot coral','Lagoon','Lilac','Sunflower','Bubblegum','Electric blue'];
const briefing:Record<TrackId,{title:string;tip:string;style:string}>={
 sunset:{title:'Find your rhythm.',tip:'Use the wide bends to charge a drift. Release as the road opens up.',style:'FLOWING BENDS'},
 canyon:{title:'Make every corner count.',tip:'Keep your steering gentle through the switchbacks. Save turbo for the exits.',style:'TIGHT SWITCHBACKS'},
 aurora:{title:'Leave a little light behind.',tip:'Build speed on the long straights. Keep a shield ready when your rival gets close.',style:'BOOST STRAIGHTS'},
};
export function CircuitBrief({id}:{id:TrackId}){const b=briefing[id];return <div className="circuit-brief"><span className="brief-mark" aria-hidden="true">↗</span><div><small>TRACK NOTES / {b.style}</small><h4>{b.title}</h4><p>{b.tip}</p></div></div>;}
export function CircuitShelf({choose}:{choose:(id:TrackId)=>void}){return <section className="circuit-shelf" aria-label="Explore circuits"><div className="shelf-heading"><span>THREE CIRCUITS. PICK YOUR NEXT STORY.</span><span>THE CLUB TOUR / 01—03</span></div><div className="shelf-cards">{tracks.map((t,i)=><button key={t.id} onClick={()=>choose(t.id)} className={'shelf-card shelf-'+t.id}><CircuitArt id={t.id}/><span className="shelf-index">0{i+1}</span><div><small>{briefing[t.id].style}</small><strong>{t.name}</strong><span>{t.length.toLocaleString()} m <i/> {t.difficulty.split(' · ')[0]}<b aria-hidden="true">↗</b></span></div></button>)}</div></section>;}
export function ControlLegend({player,keys}:{player:PlayerConfig;keys:Preferences['keys'][number]}){
 const camera=player.mode==='camera';
 return <div className="control-legend" aria-label="Driving controls">{[
  ['Steer',camera?'LEAN':keyLabel(keys.left)+' / '+keyLabel(keys.right)],
  ['Drift + steer',camera?'SQUAT':keyLabel(keys.drift)],
  ['Jump boost',camera?'JUMP':keyLabel(keys.boost)],
  ['Item',camera?'THROW':keyLabel(keys.item)],
 ].map(([action,key])=><span key={action}><kbd>{key}</kbd><small>{action}</small></span>)}</div>;
}
export function FinishPodium({race,configs,name}:{race:Race;configs:PlayerConfig[];name:(id:number)=>string}){
 const racers=[...race.activeKarts].sort((a,b)=>race.rank(a)-race.rank(b));
 return <div className={'finish-podium '+(race.freePlay?'finish-solo':'')}>{racers.map((k,index)=><article className={'podium-racer '+(index===0?'podium-first':'')} key={k.id} style={{'--podium-paint':configs[k.id].color} as React.CSSProperties}><span className="podium-place">{race.freePlay?'✓':String(index+1).padStart(2,'0')}</span><div className="podium-kart"><KartArt color={configs[k.id].color} number={k.id+1} photo={race.mode==='solo'&&k.id===1?undefined:configs[k.id].photo}/></div><div className="podium-plinth"><span>{race.freePlay?'SESSION COMPLETE':index===0?'CIRCUIT CHAMPION':'WORTH A REMATCH'}</span><strong>{name(k.id)}</strong><div><b>{timeText(k.finish??race.time)}</b><small>{race.freePlay?k.lapTimes.length+' laps completed':index===0?'Winning time':'+'+((k.finish??race.time)-(racers[0].finish??race.time)).toFixed(2)+'s'}</small></div></div></article>)}</div>;
}
