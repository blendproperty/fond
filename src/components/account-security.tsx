'use client';
import {useEffect,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import styles from './customer-account.module.css';
type Security={enabled:boolean;channel:'email'|'sms'|null;destination:string|null;emailAvailable:boolean;smsAvailable:boolean};
type Challenge={challenge:string;channel:'email'|'sms';destination:string;deliveryFailed?:boolean};
export function AccountSecurity({emailVerified}:{emailVerified:boolean}){
 const [security,setSecurity]=useState<Security|null>(null),[channel,setChannel]=useState<'email'|'sms'>('email'),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[challenge,setChallenge]=useState<Challenge|null>(null),[recovery,setRecovery]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){try{const r=await fetch('/api/account/security',{cache:'no-store'});if(!r.ok)throw new Error('Could not load account security. Please try again.');setSecurity(await r.json());setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{load();},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!security)return;setBusy(true);setError('');setMessage('');
  try{
   const action=security.enabled?'disable':'enable',body=challenge?{action,challenge:challenge.challenge,code}:{action,password,channel,phone};
   const r=await fetch('/api/account/security',{method:challenge?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.message??'Could not update account security.');
   setPassword('');setCode('');
   if(challenge){setSecurity(d.security);setRecovery(d.recoveryCodes??[]);setChallenge(null);setMessage(d.security.enabled?'Two-factor sign-in is on. Other devices have been signed out.':'Two-factor sign-in is off. Other devices have been signed out.');}
   else setChallenge(d);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <details className={styles.card+' '+styles.security} id="account-security"><summary><ShieldCheck size={21}/><span>Account security<small>Optional two-factor sign-in · {security?security.enabled?'On':'Off':'Settings'}</small></span></summary>
  <div className={styles.securityBody}><h2>Protect your account</h2><p>Add a code after your password when signing in. Choose email or a verified mobile number for SMS.</p>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {!security?<button className={styles.secondary} onClick={load}>Reload security settings</button>:<>
   {security.enabled&&<p><strong>Two-factor sign-in is on</strong><br/>Codes go by {security.channel==='sms'?'SMS':'email'} to {security.destination}. To change method or mobile number, turn it off using your current code, then set it up again.</p>}
   {!emailVerified&&!security.enabled?<p className={styles.hint}>Verify your email above before setting up two-factor sign-in.</p>:recovery.length?<div className={styles.recovery}><h3>Save your recovery codes</h3><p>Keep these somewhere private, outside this phone. Each works once if you cannot receive a sign-in code. They are shown only now.</p><ul>{recovery.map(c=><li key={c}><code>{c}</code></li>)}</ul><button className={styles.secondary} onClick={()=>setRecovery([])}>I’ve saved my recovery codes</button></div>:<form className={styles.form} onSubmit={submit}>
    {!challenge&&!security.enabled&&<fieldset className={styles.methods}><legend>Send my sign-in codes by</legend><label><input type="radio" name="security-method" checked={channel==='email'} onChange={()=>setChannel('email')} disabled={!security.emailAvailable}/> Email {!security.emailAvailable&&'(temporarily unavailable)'}</label><label><input type="radio" name="security-method" checked={channel==='sms'} onChange={()=>setChannel('sms')} disabled={!security.smsAvailable}/> SMS {!security.smsAvailable&&'(temporarily unavailable)'}</label></fieldset>}
    {!challenge&&!security.enabled&&channel==='sms'&&<label className={styles.field}>Mobile number<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+27 82 123 4567" maxLength={25} required/><small>We’ll verify this number with a code before enabling SMS sign-in. This does not change your order or marketing preferences.</small></label>}
    {!challenge?<label className={styles.field}>Current password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required maxLength={128}/></label>:<><p>{challenge.deliveryFailed?'Code delivery is unavailable. Enter a saved recovery code to continue.':`Enter the code sent to ${challenge.destination}. It expires in 10 minutes.`}</p><label className={styles.field}>{security.enabled?'Security or recovery code':'Setup code'}<input value={code} onChange={e=>setCode(e.target.value.trim())} required autoComplete="one-time-code" maxLength={security.enabled?16:6} pattern={security.enabled?'([0-9]{6}|[a-fA-F0-9]{16})':'[0-9]{6}'}/></label></>}
    <button className={styles.primary} disabled={busy||(!security.enabled&&!challenge&&(channel==='sms'?!security.smsAvailable:!security.emailAvailable))}>{busy?'Please wait…':challenge?security.enabled?'Confirm turn off':'Verify and enable':security.enabled?'Turn off two-factor sign-in':'Send setup code'}</button>
    {challenge&&<button type="button" className={styles.secondary} disabled={busy} onClick={()=>{setChallenge(null);setCode('');setPassword('');setError('');}}>Cancel and start again</button>}
   </form>}
  </>}{message&&<p role="status" className={styles.success}>{message}</p>}
  <p className={styles.hint}>Only enable this when you can receive codes. A password reset keeps your two-factor protection. Guest ordering remains available without an account.</p></div>
 </details>;
}
