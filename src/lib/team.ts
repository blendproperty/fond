import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { getDb } from './db';
import { audit } from './management';
import { verifyMemberTwoFactor } from './two-factor';
type Member={id:string;name:string;username:string;role:'super-admin'|'owner'|'manager'|'staff';active:number;password_hash:string};
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function teamSession(token:string|undefined|null) {
  if(!token?.startsWith('team_'))return null;
  return getDb().prepare('SELECT m.id,m.name,m.username,m.role FROM team_sessions s JOIN team_members m ON s.member_id=m.id WHERE s.token_hash=? AND s.expires_at>? AND m.active=1').get(digest(token),new Date().toISOString()) as Omit<Member,'active'|'password_hash'>|undefined ?? null;
}
export function revokeSession(token:string|undefined){if(token)getDb().prepare('DELETE FROM team_sessions WHERE token_hash=?').run(digest(token));}
export function loginAllowed(key:string){
  const db=getDb(),now=Date.now();
  db.prepare('DELETE FROM login_attempts WHERE expires_at<?').run(now);
  const row=db.prepare('SELECT count FROM login_attempts WHERE key=?').get(digest(key)) as {count:number}|undefined;
  return !row||row.count<15;
}
export function recordLoginFailure(key:string){
  const db=getDb(),now=Date.now();
  db.prepare('INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(digest(key),now+15*60000);
}
export function clearLoginFailures(key:string){getDb().prepare('DELETE FROM login_attempts WHERE key=?').run(digest(key));}
export function loginMember(username:string,password:string,twoFactorCode?:string) {
  const member=getDb().prepare('SELECT * FROM team_members WHERE username=? AND active=1').get(username.trim().toLowerCase()) as Member|undefined;
  if(!member)return null;
  const [salt,hash]=member.password_hash.split(':');
  const actual=scryptSync(password,salt,64),expected=Buffer.from(hash,'hex');
  if(expected.length!==actual.length||!timingSafeEqual(actual,expected))return null;
  if(member.role!=='staff'&&!verifyMemberTwoFactor(member.id,twoFactorCode))return null;
  const token='team_'+randomBytes(32).toString('hex');
  getDb().prepare('INSERT INTO team_sessions VALUES (?,?,?)').run(digest(token),member.id,new Date(Date.now()+12*3600000).toISOString());
  return {token,role:member.role};
}
export function listTeam(){return getDb().prepare('SELECT id,name,username,role,active,created_at FROM team_members ORDER BY name').all();}
export function saveMember(input:{id?:string;name:string;username:string;role:string;active:boolean;password?:string},actor:string){
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>100||typeof input.username!=='string'||!/^[a-zA-Z0-9._@-]{3,100}$/.test(input.username)||!['super-admin','owner','manager','staff'].includes(input.role)||typeof input.active!=='boolean')throw new Error('Provide name, unique username and valid role.');
  if(['super-admin','owner'].includes(input.role)&&actor!=='shared-admin'&&!actor.startsWith('super:'))throw new Error('Super admin access required.');
  const db=getDb();const prior=input.id?db.prepare('SELECT * FROM team_members WHERE id=?').get(input.id) as Member|undefined:undefined;
  if(input.id&&!prior)throw new Error('Team member not found.');
  if((actor===`team:${input.id}`||actor===`super:${input.id}`)&&(!input.active||input.role!==prior?.role))throw new Error('You cannot remove your own access.');
  let hash=prior?.password_hash;
  if(input.password){
    if(input.password.length<12||input.password.length>128)throw new Error('Use a password of 12–128 characters.');
    const salt=randomBytes(16).toString('hex');hash=salt+':'+scryptSync(input.password,salt,64).toString('hex');
  }
  if(!hash)throw new Error('A password is required for a new member.');
  const id=input.id??randomUUID();
  db.prepare('INSERT INTO team_members VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,username=excluded.username,password_hash=excluded.password_hash,role=excluded.role,active=excluded.active').run(id,input.name.trim(),input.username.toLowerCase(),hash,input.role,input.active?1:0,new Date().toISOString());
  db.prepare('DELETE FROM team_sessions WHERE member_id=?').run(id);
  audit(actor,'team-update',id);return id;
}
