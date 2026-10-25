import {useEffect,useRef,useState} from 'react';

/** A separate, short-lived camera session; no frames are uploaded or persisted. */
export function DriverPhoto({name,onSave,onClose}:{name:string;onSave:(photo:string)=>void;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),dialog=useRef<HTMLElement>(null),stream=useRef<MediaStream|null>(null);
 const [photo,setPhoto]=useState(''),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{const prior=document.activeElement as HTMLElement|null;dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>prior?.focus();},[]);
 useEffect(()=>{
  let cancelled=false;setReady(false);setError('');
  const start=async()=>{try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs localhost or a secure HTTPS connection.');
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:720},height:{ideal:720}},audio:false});
   if(cancelled){media.getTracks().forEach(t=>t.stop());return;}
   stream.current=media;if(video.current){video.current.srcObject=media;await video.current.play();}
  }catch(e){if(!cancelled)setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera permission was blocked. Allow the camera in your browser, then retry — or keep your helmet.':e instanceof DOMException&&e.name==='NotFoundError'?'No camera found. Connect a webcam and retry, or keep your helmet.':e instanceof Error?e.message:'Could not open the camera. Please retry.');}};
  void start();return()=>{cancelled=true;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;};
 },[attempt]);
 const capture=()=>{const v=video.current;if(!v||!v.videoWidth||v.readyState<2)return;const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');if(!ctx)return;const side=Math.min(v.videoWidth,v.videoHeight);ctx.translate(256,0);ctx.scale(-1,1);ctx.drawImage(v,(v.videoWidth-side)/2,(v.videoHeight-side)/2,side,side,0,0,256,256);setPhoto(c.toDataURL('image/jpeg',.9));stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;setReady(false);};
 return <div className="overlay modal-layer"><section ref={dialog} className="panel modal driver-photo" role="dialog" aria-modal="true" aria-labelledby="photo-title" onKeyDown={e=>{
  if(e.key==='Escape'){e.stopPropagation();onClose();}
  if(e.key==='Tab'){const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }}><button className="close" aria-label="Close driver photo" onClick={onClose}>×</button><div className="eyebrow">DRIVER LICENSE / {name}</div><h2 id="photo-title">Put yourself in it.</h2><p>{photo?'Looking race ready. Keep it or take another.':'Move close and center your face inside the circle.'}</p>
 <div className="photo-booth">{photo?<img src={photo} alt="Your driver photo preview"/>:<video ref={video} muted playsInline onLoadedData={()=>setReady(true)}/>}<div className="photo-guide" aria-hidden="true"/><span>{photo?'READY FOR THE GRID':'LOOK THIS WAY ↗'}</span></div>
 <p role="status" className={error?'error':'fine-print'}>{error||(!photo&&!ready?'Opening camera…':'Your photo stays on this device and clears when you reload.')}</p>
 <div className="photo-actions">{photo?<><button onClick={()=>{setPhoto('');setAttempt(n=>n+1);}}>Retake</button><button className="primary" onClick={()=>onSave(photo)}>USE THIS FACE ↗</button></>:<>{error?<button onClick={()=>setAttempt(n=>n+1)}>Retry camera</button>:<button className="primary" disabled={!ready} onClick={capture}>TAKE PHOTO ↗</button>}<button onClick={onClose}>Keep my helmet</button></>}</div></section></div>;
}
