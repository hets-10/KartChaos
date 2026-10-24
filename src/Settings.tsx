import {useEffect,useRef,useState} from 'react';
import {actions,bindingError,defaultBindings,keyLabel,type Preferences,type Action} from './preferences';
type Props={value:Preferences;onChange:(value:Preferences)=>void;onClose:()=>void};
export function Settings({value,onChange,onClose}:Props){
  const [capture,setCapture]=useState<{player:number;action:Action}|null>(null),[error,setError]=useState('');
  const root=useRef<HTMLElement>(null);
  useEffect(()=>{const prior=document.activeElement as HTMLElement|null;root.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>prior?.focus();},[]);
  useEffect(()=>{if(!capture)return;const handler=(e:KeyboardEvent)=>{e.preventDefault();e.stopImmediatePropagation();if(e.code==='Escape'){setCapture(null);setError('');return;}
    const error=bindingError(value.keys,capture.player,capture.action,e.code);setError(error);if(error)return;
    onChange({...value,keys:value.keys.map((row,i)=>i===capture.player?{...row,[capture.action]:e.code}:row)});setCapture(null);
  };window.addEventListener('keydown',handler,true);return()=>window.removeEventListener('keydown',handler,true);},[capture,value,onChange]);
  const change=(patch:Partial<Preferences>)=>onChange({...value,...patch});
  return <div className="overlay modal-layer"><section ref={root} role="dialog" aria-modal="true" aria-labelledby="settings-title" className="panel modal settings-panel" onKeyDown={e=>{
    if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'){const elements=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button,input,select')).filter(el=>!el.hasAttribute('disabled'));const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }}><button className="close" aria-label="Close settings" onClick={onClose}>×</button><div className="eyebrow">MAKE IT YOURS</div><h2 id="settings-title">Your kind of chaos.</h2>
    <label className="setting">Sound volume <span>{Math.round(value.volume*100)}%</span><input type="range" min="0" max="1" step=".01" value={value.volume} onChange={e=>change({volume:+e.target.value})}/></label>
    <button onClick={()=>change({volume:value.volume?0:.25})}>{value.volume?'Mute sound':'Unmute sound'}</button>
    <label className="setting">Body steering sensitivity <span>{value.sensitivity.toFixed(1)}×</span><input type="range" min=".5" max="2" step=".1" value={value.sensitivity} onChange={e=>change({sensitivity:+e.target.value})}/></label>
    <div className="accessibility-grid"><label className="toggle"><input type="checkbox" checked={value.reducedMotion} onChange={e=>change({reducedMotion:e.target.checked})}/> Reduced motion</label><label className="toggle"><input type="checkbox" checked={value.highContrast} onChange={e=>change({highContrast:e.target.checked})}/> High contrast HUD</label><label className="toggle"><input type="checkbox" checked={value.showPip} onChange={e=>change({showPip:e.target.checked})}/> Show camera preview</label></div>
    <p className="fine-print">Reduced motion removes camera shake, boost zoom, spinning and decorative animation, and reduces particles. Gameplay stays the same.</p>
    <h3>Make the keyboard yours</h3><p className="fine-print">Choose an action, then press its new key. Bindings are shared across modes and saved on this browser.</p>
    <div className="binding-grid">{value.keys.map((row,i)=><div key={i}><strong>Player {i+1}</strong>{actions.map(action=><div className="binding-row" key={action}><span>{action==='boost'?'Jump boost':action}</span><button aria-label={`Remap Player ${i+1} ${action}`} className={capture?.player===i&&capture.action===action?'listening':''} onClick={()=>{setError('');setCapture({player:i,action});}}>{capture?.player===i&&capture.action===action?'Press a key…':keyLabel(row[action])}</button></div>)}</div>)}</div>
    <p role="status" className={error?'error':'fine-print'}>{error|| (capture?'Listening… Escape cancels.':'Escape always pauses the race. Duplicate bindings are blocked.')}</p><button onClick={()=>{change({keys:defaultBindings()});setCapture(null);setError('');}}>Restore default keys</button>
    <p className="fine-print">Camera frames stay on this computer. Use a full-body view and good lighting.</p>
  </section></div>;
}
