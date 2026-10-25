import {useId} from 'react';
import type {Item} from './game';
import {getTrack,type TrackId} from './tracks';

/** Original vector artwork: shared by the title screen, garage and race HUD. */
export function KartArt({color='#ff6748',number=1,photo}:{color?:string;number?:number;photo?:string}){
 const id=useId().replace(/:/g,'');
 return <svg className="kart-art" viewBox="0 0 600 420" aria-hidden="true">
  <defs><clipPath id={id+'face'}><ellipse cx="260" cy="149" rx="49" ry="49"/></clipPath><linearGradient id={id+'paint'} x2=".2" y2="1"><stop stopColor="#fff" stopOpacity=".55"/><stop offset=".5" stopColor={color}/><stop offset="1" stopColor="#10282c" stopOpacity=".5"/></linearGradient><linearGradient id={id+'visor'} x2="1" y2="1"><stop stopColor="#9af8e6"/><stop offset=".35" stopColor="#244f61"/><stop offset="1" stopColor="#081f2b"/></linearGradient></defs>
  <ellipse cx="308" cy="350" rx="222" ry="28" fill="#09282e" opacity=".16"/>
  <g stroke="#102e35" strokeWidth="6" strokeLinejoin="round">
   <path d="m117 174 181-48 73 24-178 52z" fill={color}/><path d="m117 174 76 28v20l-76-26z" fill="#183a42"/><path d="m157 202 8 38m155-72 9 36" fill="none" strokeWidth="12"/>
   <g fill="#10252f"><path d="M113 228c-30-12-55 7-55 42v26c0 29 25 42 48 32 21-9 28-35 26-60z"/><path d="M409 218c-28-12-47 7-47 38v22c0 30 22 42 46 33s32-35 30-60z"/></g>
   <path d="m103 258 209-64 164 89-202 80-170-66z" fill="#183a42"/>
   <path d="m121 227 186-50 126 76-166 69-143-42z" fill={color}/><path d="m121 227 186-50 126 76-166 69-143-42z" fill={'url(#'+id+'paint)'}/>
   <path d="m188 231 63-20 88 45-58 24z" fill="#14343c"/>
   <path d="m190 232 2-53 39-14 53 26 2 71-45-20z" fill="#153a44"/>
   <path d="m210 236 3-44 33-10 35 28 43 49-33 16-38-32z" fill="#fff4d9"/>
   <path d="m267 220 42 12 24 26m-103-46 24 29 26 10" fill="none" stroke="#fff4d9" strokeWidth="18"/>
   <ellipse cx="316" cy="251" rx="24" ry="10" transform="rotate(26 316 251)" fill="none" strokeWidth="8"/>
   <path d="M203 168c-9-40 7-72 42-76 37-5 70 24 69 62l-7 26-51 22-42-15z" fill={color}/>
   <path d="M203 168c-9-40 7-72 42-76 37-5 70 24 69 62l-7 26-51 22-42-15z" fill={'url(#'+id+'paint)'}/>
   <path d="m235 99 22-5 24 89-24 9z" fill="#fff3d2" stroke="none"/>
   <path d="M220 144c25 3 65-3 92-13l-1 33c-22 13-55 21-85 16z" fill={'url(#'+id+'visor)'}/><path d="m234 151 37-4" fill="none" stroke="#b5fff0" strokeWidth="4"/>
   {photo&&<g stroke="none"><ellipse cx="260" cy="149" rx="53" ry="53" fill="#fff4d9"/><image href={photo} x="211" y="100" width="98" height="98" clipPath={'url(#'+id+'face)'}/></g>}
   <path d="m288 277 57-30 128 35 20 35-171 60-52-35z" fill={color}/><path d="m288 277 57-30 128 35 20 35-171 60-52-35z" fill={'url(#'+id+'paint)'}/>
   <path d="m357 253 26 7-58 103-27-7z" fill="#fff4d9" stroke="none"/>
   <path d="m286 327 43 18 169-56 20 21-185 69-58-22z" fill="#c6ded7"/>
   <path d="m337 346 145-49" stroke="#fff8e8" strokeWidth="5"/>
   <g fill="#132a34"><path d="M189 292c-31-12-54 5-55 39v20c0 29 25 45 51 34 23-9 30-37 28-63z"/><path d="M463 265c-28-10-48 9-49 40v22c0 26 23 39 47 29 22-9 28-34 25-61z"/></g>
   <g fill="#7e9c9c" strokeWidth="5"><ellipse cx="169" cy="343" rx="15" ry="25" transform="rotate(10 169 343)"/><ellipse cx="443" cy="315" rx="14" ry="24" transform="rotate(10 443 315)"/></g>
   <g stroke="#476069" strokeWidth="3"><path d="m185 304 16 5m-12 5 15 5m-12 5 15 5m173-51 13 5m-10 5 13 5m-11 5 13 5"/></g>
  </g>
  <text x="391" y="308" fill="#102e35" fontFamily="Arial Black, sans-serif" fontWeight="900" fontStyle="italic" fontSize="32" transform="rotate(-18 391 308)">{String(number).padStart(2,'0')}</text>
  <path d="m71 202-34 8m47 2-55 17m70-5-37 12" stroke={color} strokeWidth="7" strokeLinecap="round"/>
 </svg>;
}

export function CircuitArt({id}:{id:TrackId}){
 const unique=useId().replace(/:/g,'');const track=getTrack(id),night=id==='aurora',canyon=id==='canyon';
 return <svg className="circuit-art" viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><linearGradient id={unique} x2="0" y2="1"><stop stopColor={night?'#293e62':canyon?'#f19d72':'#bce9db'}/><stop offset="1" stopColor={night?'#b09fca':'#fff0c9'}/></linearGradient></defs>
  <path fill={'url(#'+unique+')'} d="M0 0h600v360H0z"/><circle cx="460" cy="77" r="42" fill={night?'#f4e9cf':'#fff3c5'}/>
  {night&&<><path d="M0 85Q160-50 320 90T650 60L650 125Q410 170 280 105T0 145" fill="#6ee9cb" opacity=".4"/><path d="m32 55 2 2m170-28 2 2m135 30 2 2m198-20 2 2" stroke="white" strokeWidth="3"/></>}
  <path d="m0 202 74-90 65 47 89-85 82 107 70-66 94 75 68-61 58 58v173H0z" fill={night?'#667e9d':canyon?'#ae5c45':'#5d9c87'}/>
  <path d="m0 240 115-65 98 58 120-68 108 60 159-47v182H0z" fill={night?'#b2d5d3':canyon?'#d99260':'#8ac8a4'}/>
  <path d="M-30 351c108-104 231-50 294-88 107-63-80-87 12-108 54-13 159 2 164 29 6 32-51 50-4 62 47 13 102-7 193-3" fill="none" stroke={night?'#ecf4e2':'#ffe8bc'} strokeWidth="61"/>
  <path d="M-30 351c108-104 231-50 294-88 107-63-80-87 12-108 54-13 159 2 164 29 6 32-51 50-4 62 47 13 102-7 193-3" fill="none" stroke="#e36b50" strokeWidth="48" strokeDasharray="12 13"/>
  <path d="M-30 351c108-104 231-50 294-88 107-63-80-87 12-108 54-13 159 2 164 29 6 32-51 50-4 62 47 13 102-7 193-3" fill="none" stroke="#28464d" strokeWidth="39"/>
  <path d="M-30 351c108-104 231-50 294-88 107-63-80-87 12-108 54-13 159 2 164 29 6 32-51 50-4 62 47 13 102-7 193-3" fill="none" stroke="#fff3cc" strokeWidth="2" strokeDasharray="13 14"/>
  {canyon?<g fill="#ab5942"><path d="m60 249 9-98 29-4 13 102zm40-11 15-118 25 9 9 110zm395-13 6-90 36-7 16 111z"/><path d="m47 182 62 3m-2-26 36 4m355 1 43-1" stroke="#f0bc83" strokeWidth="7"/></g>:night?<g fill="#345a67">{[70,115,485,520].map((x,i)=><path key={x} d={`M${x} ${170+i%2*25}l-23 58h14l-22 28h61l-22-28h14z`}/>)}</g>:<g stroke="#244e46" strokeWidth="9" fill="#337863"><path d="M92 264q20-53 5-100m410 52q-13-40 2-80" fill="none"/><path d="M98 168q-42-42-69 2 43-9 69-2-6-51 34-54-19 31-34 54 41-34 64 1-35-7-64-1zm412-29q-35-30-52 1 27-4 52-1-3-40 26-40-16 21-26 40 30-24 47 4-24-6-47-4z" strokeWidth="3"/></g>}
  <g transform="translate(220 174)" fill="#fff1ce"><path d="M0 55V0h74v55h-6V8H6v47z"/><path d="M6 0h62v14H6z" fill="#183b41"/><path d="M7 0h8v7h8v7h8V7h8V0h8v7h8v7h8V7h5" fill="none" stroke="#fff1ce" strokeWidth="6"/></g>
  <path d="M0 338h600v22H0z" fill={track.accent} opacity=".35"/>
 </svg>;
}

export function ItemArt({item}:{item:Item|null}){
 return <svg className="item-art" viewBox="0 0 64 64" aria-hidden="true"><g stroke="#17343d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
  {item==='Rocket'?<><path d="m25 39-10 10 1-14 12-10m11 14-10 10 14-1 10-12" fill="#ec7455"/><path d="M22 35C29 17 42 9 54 9c0 15-8 28-25 35z" fill="#f8edcf"/><path d="m41 12 10 10"/><circle cx="39" cy="25" r="6" fill="#59c7bd"/><path d="m21 44-7 9 10-3" fill="#ffc65b"/></>:item==='Banana'?<><path d="M35 10c7 22-1 34-24 36 12 13 31 7 38-5 5-9 2-21-7-29z" fill="#ffce5c"/><path d="m35 10 3-5 7 2-3 7m-9 9c2 13-4 21-14 24" fill="none"/></>:item==='Shield'?<><path d="m32 7 21 8v18c0 13-21 25-21 25S11 46 11 33V15z" fill="#70d6cb"/><path d="m32 16 12 5v11c0 6-12 15-12 15z" fill="#e5fff0" stroke="none"/><path d="m18 31 8 7 16-17" fill="none"/></>:item==='Turbo'?<><path d="m14 48 3-27 22-9 12 30-22 11z" fill="#ef7758"/><path d="m18 21 22-8-3-7-22 8z" fill="#d7ebe1"/><path d="m33 22-13 15 10-2-3 11 14-18-11 3z" fill="#ffdc7d" strokeWidth="2"/><path d="m9 27-5 2m4 9-5 2" stroke="#ffcb61"/></>:item==='Lightning'?<path d="M36 4 11 36h18l-3 24 28-36H35z" fill="#ffcd5c"/>:<><path d="m32 5 24 14v27L32 59 8 45V19z" fill="#92bbb5"/><path d="m8 19 24 14 24-14M32 33v26" fill="none"/><text x="29" y="31" fill="#fff4d9" stroke="none" fontSize="24" fontWeight="900">?</text></>}
 </g></svg>;
}
