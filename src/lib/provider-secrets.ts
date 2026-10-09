import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {getDb} from './db';
import {audit} from './management';

export type ProviderName='yoco-secret'|'yoco-webhook'|'yoco-pos-key'|'email-api'|'staff-shared-code'|'twilio-auth-token'|'meta-access-token'|'meta-app-secret'|'meta-webhook-verify'|'whatchimp-api-token';
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
 if(name==='whatchimp-api-token'&&(!/^\d+\|[A-Za-z0-9_-]{20,200}$/.test(value)))throw new Error('Enter a valid WhatChimp API key.');
 if(name==='yoco-pos-key'&&(value.length<20||/\s/.test(value)||/^sk_(live|test)_/.test(value)))throw new Error('Use a Yoco personal application API key with business/orders:read, not the online checkout secret.');
 if(!value||value.length>(name==='yoco-pos-key'?8192:1000)||name==='yoco-secret'&&!/^sk_(live|test)_/.test(value)||name==='yoco-webhook'&&!value.startsWith('whsec_')||name==='email-api'&&!value.startsWith('re_')||name==='staff-shared-code'&&!/^[A-Za-z0-9._-]{6,64}$/.test(value)||name==='twilio-auth-token'&&!/^[a-f0-9]{32}$/i.test(value)||name==='meta-access-token'&&value.length<40||name==='meta-app-secret'&&!/^[a-f0-9]{32,64}$/i.test(value)||name==='meta-webhook-verify'&&!/^[A-Za-z0-9._-]{24,128}$/.test(value))throw new Error('Enter a valid credential or staff code.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',vaultKey(),iv);cipher.setAAD(Buffer.from(name));const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 getDb().prepare('INSERT INTO provider_secrets VALUES (?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET iv=excluded.iv,tag=excluded.tag,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').run(name,iv,cipher.getAuthTag(),ciphertext,new Date().toISOString());audit(actor,'provider-credential-replaced',name);
 if(name==='yoco-pos-key'){
  getDb().prepare('UPDATE counter_reward_settings SET enabled=0,revision=revision+1 WHERE id=1').run();
  getDb().prepare("UPDATE app_documents SET value=json_set(value,'$.enabled',json('false'),'$.eftMappingVerified',json('false')),updated_at=? WHERE key='yoco-pos'").run(new Date().toISOString());
  getDb().prepare("UPDATE yoco_pos_sync_state SET lease=NULL,next_run=0,error=NULL,issues_json='[]' WHERE id=1").run();
 }
}
