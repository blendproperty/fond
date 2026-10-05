'use client';
import {useEffect,useRef,useState} from 'react';

export function CoffeeRewardScanner({onScanned}:{onScanned:(code:string)=>void}){
 const [camera,setCamera]=useState(false),[message,setMessage]=useState('');
 const video=useRef<HTMLVideoElement>(null),callback=useRef(onScanned);callback.current=onScanned;
 useEffect(()=>{
  if(!camera)return;
  let stopped=false,stream:MediaStream|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  (async()=>{try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera unavailable. Use an external QR scanner or enter the code below.');
   const {default:decode}=await import('jsqr');
   if(stopped)return;
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'}},audio:false});
   if(stopped){stream.getTracks().forEach(track=>track.stop());return;}
   const player=video.current!;player.srcObject=stream;await player.play();
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
   if(!context)throw new Error('Camera preview unavailable. Please try again.');
   const scan=()=>{
    if(stopped)return;
    if(player.readyState>=2&&player.videoWidth){
     const scale=Math.min(1,720/player.videoWidth);canvas.width=Math.round(player.videoWidth*scale);canvas.height=Math.round(player.videoHeight*scale);
     context.drawImage(player,0,0,canvas.width,canvas.height);
     const pixels=context.getImageData(0,0,canvas.width,canvas.height),result=decode(pixels.data,canvas.width,canvas.height);
     if(result){
      const code=result.data.trim().toUpperCase();
      if(/^COFFEE-[A-F0-9]{20}$/.test(code)){callback.current(code);setCamera(false);setMessage('Coffee reward scanned.');return;}
      setMessage('This is not a free-coffee QR. Ask the customer to open their free coffee and show its QR code.');
     }
    }
    timer=setTimeout(scan,250);
   };scan();
  }catch(e){if(!stopped){setCamera(false);setMessage(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera access was blocked. Allow camera access for this site, then try again.':e instanceof Error?e.message:'Could not start the camera. Please try again.');}}})();
  return()=>{stopped=true;if(timer)clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());};
 },[camera]);
 return <div className="coffee-reward-scanner"><button type="button" className="primary" onClick={()=>{setMessage('');setCamera(!camera);}}>{camera?'Stop reward camera':'Scan coffee reward'}</button>{camera&&<><video ref={video} muted playsInline aria-label="Coffee reward camera"/><p>Hold the customer’s free-coffee QR in front of the screen-facing camera.</p></>}{message&&<p role="status">{message}</p>}</div>;
}
