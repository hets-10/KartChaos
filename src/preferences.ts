import {neutral,type Input,type PlayerConfig,defaults} from './game';
export const actions=['left','right','drift','boost','item'] as const;
export type Action=typeof actions[number];
export type Bindings=Record<Action,string>[];
export const defaultBindings=():Bindings=>[
  {left:'KeyA',right:'KeyD',drift:'KeyS',boost:'KeyW',item:'Space'},
  {left:'ArrowLeft',right:'ArrowRight',drift:'ArrowDown',boost:'ArrowUp',item:'Enter'},
];
export type Preferences={volume:number;sensitivity:number;showPip:boolean;reducedMotion:boolean;highContrast:boolean;keys:Bindings};
export function readStored(key:string):unknown {try{return JSON.parse(localStorage.getItem(key)??'null');}catch{return null;}}
export function saveStored(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Storage may be disabled; play remains available. */}}
export const keyLabel=(code:string)=>({Space:'Space',ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Enter:'Enter'}[code]??code.replace(/^Key|^Digit|^Numpad/,''));
export function bindingError(keys:Bindings,player:number,action:Action,code:string){
  if(!/^(Key[A-Z]|Digit[0-9]|Arrow(Left|Right|Up|Down)|Space|Enter|Shift(Left|Right)|Control(Left|Right)|Numpad[0-9])$/.test(code))return 'Use a letter, number, arrow, Space, Enter, Shift, or Control. Escape is reserved for pause.';
  for(let i=0;i<keys.length;i++)for(const a of actions)if(!(i===player&&a===action)&&keys[i][a]===code)return `${keyLabel(code)} is already assigned to Player ${i+1} ${a}.`;
  return '';
}
export function loadPreferences():Preferences {
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const p:Preferences={volume:.25,sensitivity:1,showPip:true,reducedMotion:reduced,highContrast:false,keys:defaultBindings()};
  const raw=readStored('kart-chaos-settings');if(!raw||typeof raw!=='object')return p;
  const r=raw as Partial<Preferences>;
  for(const k of ['showPip','reducedMotion','highContrast'] as const)if(typeof r[k]==='boolean')p[k]=r[k];
  if(typeof r.volume==='number'&&Number.isFinite(r.volume))p.volume=Math.max(0,Math.min(1,r.volume));
  if(typeof r.sensitivity==='number'&&Number.isFinite(r.sensitivity))p.sensitivity=Math.max(.5,Math.min(2,r.sensitivity));
  if(Array.isArray(r.keys)&&r.keys.length===2&&r.keys.every(row=>row&&actions.every(a=>typeof row[a]==='string'))){
    const keys=r.keys as Bindings;if(keys.every((row,i)=>actions.every(a=>!bindingError(keys,i,a,row[a]))))p.keys=keys;
  }
  return p;
}
export function loadPlayers():PlayerConfig[]{const r=readStored('kart-chaos-players');return Array.isArray(r)&&r.length===2&&r.every(p=>p&&typeof p.name==='string'&&/^#[0-9a-f]{6}$/i.test(p.color)&&['keyboard','camera'].includes(p.mode))?r:defaults.map(p=>({...p}));}
export class KeyboardInput {
  held=new Set<string>();pressed=new Set<string>();
  down(code:string,repeat=false){if(!repeat)this.pressed.add(code);this.held.add(code);}
  up(code:string){this.held.delete(code);}
  sample(bindings:Record<Action,string>):Input{return {...neutral(),steer:Number(this.held.has(bindings.right))-Number(this.held.has(bindings.left)),drift:this.held.has(bindings.drift),boost:this.held.has(bindings.boost)||this.pressed.has(bindings.boost),item:this.held.has(bindings.item)||this.pressed.has(bindings.item)};}
  consumed(){this.pressed.clear();}
  clear(){this.held.clear();this.pressed.clear();}
}
