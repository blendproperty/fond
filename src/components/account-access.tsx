'use client';
import {useState} from 'react';
import {ArrowRight,ShieldCheck,Coffee,KeyRound} from 'lucide-react';
import styles from './customer-account.module.css';
type Challenge={challenge:string;channel:'email'|'sms';destination:string;deliveryFailed?:boolean};
export function AccountAccess({onSignedIn}:{onSignedIn:()=>Promise<void>}){
 const [mode,setMode]=useState<'login'|'signup'|'reset'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState(''),[challenge,setChallenge]=useState<Challenge|null>(null),[resetToken,setResetToken]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 function changeMode(next:typeof mode){setMode(next);setPassword('');setConfirm('');setCode('');setChallenge(null);setResetToken('');setError('');setMessage('');}
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   if(mode==='reset'&&resetToken&&password!==confirm)throw new Error('Your new passwords do not match.');
   const url=mode==='reset'?'/api/auth/password-reset':'/api/auth/'+mode;
   const isConfirm=!!challenge||!!resetToken;
   const body=challenge?{challenge:challenge.challenge,code}:resetToken?{challenge:resetToken,code,password}:{email,password};
   const response=await fetch(url,{method:isConfirm?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await response.json();
   if(!response.ok)throw new Error(result.message??'Please try again.');
   if(mode==='reset'){
    if(resetToken){changeMode('login');setMessage(result.message);}else{setResetToken(result.challenge);setMessage(result.message);}
   }else if(result.twoFactorRequired){setChallenge(result);setPassword('');setCode('');}
   else{setPassword('');setCode('');setChallenge(null);await onSignedIn();}
  }catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Please try again.');}finally{setBusy(false);}
 }
 const title=challenge?'Check your sign-in code':mode==='reset'?'Reset your password':mode==='login'?'Sign in':'Create an account';
 return <section className={styles.card+' '+styles.auth} aria-label="Account access">
  <span className={styles.icon}>{mode==='reset'?<KeyRound size={27}/>:challenge||mode==='signup'?<ShieldCheck size={27}/>:<Coffee size={27}/>}</span>
  <p className={styles.eyebrow}>{challenge?'A LITTLE EXTRA PROTECTION':mode==='reset'?'LET’S GET YOU BACK IN':mode==='login'?'WELCOME BACK':'PULL UP A CHAIR'}</p><h2>{title}</h2>
  <p>{challenge?challenge.deliveryFailed?'We could not deliver your code. Use a saved recovery code, or go back and try again later.':`Enter the code sent by ${challenge.channel==='sms'?'SMS':'email'} to ${challenge.destination}. It expires in 10 minutes.`:mode==='reset'?'Use the email address on your FOND account. We’ll send a six-digit code to help you choose a new password.':mode==='login'?'Your favourites and coffee rewards are just a sign-in away.':'A free account for your orders, your coffee card and a little extra to look forward to.'}</p>
  <form className={styles.form} onSubmit={submit}>
   {!challenge&&!resetToken&&<label className={styles.field}>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="email" placeholder="you@example.com"/></label>}
   {(challenge||resetToken)&&<label className={styles.field}>{challenge?'Sign-in or recovery code':'Password reset code'}<input value={code} onChange={e=>setCode(e.target.value.trim())} required autoComplete="one-time-code" maxLength={challenge?16:6} inputMode={challenge?'text':'numeric'} pattern={challenge?'([0-9]{6}|[a-fA-F0-9]{16})':'[0-9]{6}'} autoFocus/></label>}
   {!challenge&&(mode!=='reset'||resetToken)&&<label className={styles.field}>{resetToken?'New password':'Password'}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></label>}
   {!!resetToken&&<label className={styles.field}>Confirm new password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password"/></label>}
   {mode==='signup'&&<p className={styles.hint}>Choose at least 8 characters. We'll help you verify your email next.</p>}
   {mode==='signup'&&<p className={styles.hint}>Read our <a href="/hub/terms" target="_blank" rel="noopener noreferrer">Terms and conditions (opens a new tab)</a> and <a href="/hub/privacy" target="_blank" rel="noopener noreferrer">Privacy policy (opens a new tab)</a> before creating your account.</p>}
   {challenge&&<p className={styles.hint}>You can also use one of the recovery codes you saved when enabling two-factor sign-in.</p>}
   {error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}
   <button className={styles.primary} type="submit" disabled={busy}>{busy?'Please wait…':challenge?'Verify and sign in':mode==='reset'?resetToken?'Save new password':'Send reset code':mode==='login'?'Sign in':'Create account'}<ArrowRight size={17}/></button>
  </form>
  {mode==='login'&&!challenge&&<button className={styles.textButton+' '+styles.forgot} disabled={busy} onClick={()=>changeMode('reset')}>Forgot password?</button>}
  <div className={styles.switchMode}>
   {!challenge&&mode!=='reset'&&<span>{mode==='login'?'First time at FOND?':'Already part of the FOND family?'}</span>}
   <button className={styles.secondary} disabled={busy} type="button" onClick={()=>changeMode(!challenge&&mode==='login'?'signup':'login')}>{challenge||mode==='reset'?'Back to sign in':mode==='login'?'Create an account':'Already have an account?'}</button>
   {!!resetToken&&<button className={styles.textButton} disabled={busy} onClick={()=>{setResetToken('');setCode('');setError('');setMessage('');}}>Request another reset code</button>}
  </div><p className={styles.hint}>Use your customer email and password. Your staff/admin login is separate.</p>
 </section>;
}
