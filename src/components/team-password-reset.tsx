'use client';
import {useState} from 'react';
export function TeamPasswordReset({onBack}:{onBack:(message?:string)=>void}){
 const [challenge,setChallenge]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setError('');
  try{
   if(challenge&&data.password!==data.confirm)throw new Error('Your new passwords do not match.');
   const r=await fetch('/api/team/password-reset',{method:challenge?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(challenge?{challenge,code:data.code,password:data.password}:{username:data.username})}),b=await r.json();
   if(!r.ok)throw new Error(b.message);if(challenge)onBack(b.message);else{setChallenge(b.challenge);setMessage(b.message);}
  }catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Please try again.');}finally{setBusy(false);}
 }
 return <form className="team-login" onSubmit={submit}><h1>Reset your team password.</h1><p>Enter your team username. We’ll email a six-digit code to your verified recovery email.</p>{!challenge?<label>Team username<input name="username" autoComplete="username" required minLength={3} maxLength={100}/></label>:<><label>Password reset code<input name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6}/></label><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label></>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<button disabled={busy}>{busy?'Please wait…':challenge?'Save new password':'Send reset code'}</button><p className="team-recovery-hint">Your code expires in 10 minutes. Authenticator protection stays on. If you haven’t verified a recovery email, ask an owner or administrator to reset your password. Once signed in, set it up under Recovery email.</p>{challenge&&<button className="team-text-button" type="button" disabled={busy} onClick={()=>{setChallenge('');setMessage('');setError('');}}>Request another reset code</button>}<button className="team-text-button" type="button" disabled={busy} onClick={()=>onBack()}>Back to sign in</button></form>;
}
