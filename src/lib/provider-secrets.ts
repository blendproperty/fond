import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {getDb} from './db';
import {audit} from './management';

export type ProviderName='yoco-secret'|'yoco-webhook'|'email-api'|'staff-shared-code'|'twilio-auth-token'|'meta-access-token'|'meta-app-secret'|'meta-webhook-verify';
export function vaultKey(){
 const value=process.env.FOND_CREDENTIALS_KEY;
 if(!value||!/^[a-f0-9]{64}$/i.test(value))throw new Error('A server credential encryption key must be configured first.');
 return Buffer.from(value,'hex');
}
export function providerSecret(name:ProviderName){
 const row=getDb().prepare('SELECT iv,tag,ciphertext FROM provider_secrets WHERE name=?').get(name) as {iv:Uint8Array;tag:Uint8Array;ciphertext:Uint8Array}|undefined;
 if(!row)return null;
 const cipher=createDecipheriv('aes-256-gcm',vaultKey(),Buffer.from(row.iv));cipher.setAAD(Buffer.from(name));cipher.setAuthTag(Buffer.from(row.tag));
 return Buffer.concat([cipher.update(Buffer.from(row.ciphertext)),cipher.final()]).toString('utf8');
}
export function providerSecretStatus(name:ProviderName){return !!getDb().prepare('SELECT 1 FROM provider_secrets WHERE name=?').get(name);}
export function saveProviderSecret(name:ProviderName,value:string,actor:string){
 if(!value||value.length>1000||name==='yoco-secret'&&!/^sk_(live|test)_/.test(value)||name==='yoco-webhook'&&!value.startsWith('whsec_')||name==='email-api'&&!value.startsWith('re_')||name==='staff-shared-code'&&!/^[A-Za-z0-9._-]{6,64}$/.test(value)||name==='twilio-auth-token'&&!/^[a-f0-9]{32}$/i.test(value)||name==='meta-access-token'&&value.length<40||name==='meta-app-secret'&&!/^[a-f0-9]{32,64}$/i.test(value)||name==='meta-webhook-verify'&&!/^[A-Za-z0-9._-]{24,128}$/.test(value))throw new Error('Enter a valid credential or staff code.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',vaultKey(),iv);cipher.setAAD(Buffer.from(name));const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 getDb().prepare('INSERT INTO provider_secrets VALUES (?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET iv=excluded.iv,tag=excluded.tag,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').run(name,iv,cipher.getAuthTag(),ciphertext,new Date().toISOString());audit(actor,'provider-credential-replaced',name);
}
