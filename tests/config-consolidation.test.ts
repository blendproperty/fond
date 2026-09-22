import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const sourceKey = '11'.repeat(32), targetKey = '22'.repeat(32);
function schema(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE menu_items(id TEXT PRIMARY KEY,name TEXT,description TEXT,category TEXT,price_cents INTEGER,diet_json TEXT,symbol TEXT,sort_order INTEGER,available INTEGER,is_special INTEGER,special_label TEXT,special_price_cents INTEGER,modifiers_json TEXT,prep_minutes INTEGER,updated_at TEXT);
    CREATE TABLE promotion_images(id TEXT PRIMARY KEY,mime TEXT,bytes BLOB,created_at TEXT);
    CREATE TABLE app_documents(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);
    CREATE TABLE provider_secrets(name TEXT PRIMARY KEY,iv BLOB,tag BLOB,ciphertext BLOB,updated_at TEXT);
    CREATE TABLE team_members(id TEXT PRIMARY KEY,name TEXT,username TEXT UNIQUE,password_hash TEXT,role TEXT,active INTEGER,created_at TEXT);
    CREATE TABLE team_two_factor(member_id TEXT PRIMARY KEY,iv BLOB,tag BLOB,ciphertext BLOB,active INTEGER,recovery_json TEXT,updated_at TEXT);
    CREATE TABLE admin_events(id TEXT PRIMARY KEY,actor TEXT,action TEXT,target TEXT,created_at TEXT);
  `);
  return db;
}
function seal(keyHex: string, aad: string, value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}
function open(db: DatabaseSync, keyHex: string, name: string) {
  const row = db.prepare('SELECT iv,tag,ciphertext FROM provider_secrets WHERE name=?').get(name) as {iv:Uint8Array;tag:Uint8Array;ciphertext:Uint8Array};
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.from(row.iv));
  cipher.setAAD(Buffer.from(name)); cipher.setAuthTag(Buffer.from(row.tag));
  return Buffer.concat([cipher.update(Buffer.from(row.ciphertext)), cipher.final()]).toString('utf8');
}

test('operational consolidation copies configuration and preserves production safety', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fond-config-'));
  try {
    const sourcePath = join(dir, 'source.sqlite'), targetPath = join(dir, 'target.sqlite');
    const source = schema(sourcePath), target = schema(targetPath), now = new Date().toISOString();
    const docs = {
      trading:{orderingEnabled:true,collectionEnabled:true,deliveryEnabled:true,enforceHours:false,openingTime:'07:00',closingTime:'17:00',openDays:[1,2,3,4,5],maxActiveOrders:100,newOrderMinutes:5,paymentConfirmationMinutes:10,yocoEntryMinutes:5,preparationMinutes:20,readyDeliveryMinutes:10,readyCollectionMinutes:10,preparationWeightPercent:7,allowTestPayments:true,deliveryArea:'Midpoint Hub',collectionSlots:['As soon as possible'],closedMessage:'Closed',contactPhone:'',whatsappEnabled:true,smsEnabled:true,onlinePaymentsEnabled:true},
      'twilio-sms-config':{accountSid:`AC${'a'.repeat(32)}`,sender:'+27600928520'},
      'twilio-config':{mode:'sandbox',accountSid:`AC${'a'.repeat(32)}`,sender:'+14155238886',acceptedContentSid:'',readyContentSid:''},
      'email-from':'orders@fond.mid-point.co.za',
      'content-published':{headline:'Live menu',intro:'',announcement:'',promotions:[]},
      'message-templates-published':{sms:{accepted:'Accepted {{reference}}',readyCollection:'Ready {{reference}}',readyDelivery:'Delivery {{reference}}'}},
    };
    for (const [key,value] of Object.entries(docs)) source.prepare('INSERT INTO app_documents VALUES(?,?,?)').run(key,JSON.stringify(value),now);
    source.prepare('INSERT INTO menu_items VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('meal-1','Meal','Fresh','Plates',12000,'[]','🍽️',1,1,0,null,null,'[]',10,now);
    source.prepare('INSERT INTO promotion_images VALUES(?,?,?,?)').run('image-1','image/png',Buffer.from('image'),now);
    source.prepare('INSERT INTO team_members VALUES(?,?,?,?,?,?,?)').run('staff-1','Staff','staff','salt:hash','staff',1,now);
    for (const [name,value] of [['email-api','re_test_key'],['twilio-auth-token','a'.repeat(32)],['yoco-secret','sk_test_stage']]) {
      const encrypted=seal(sourceKey,name,value); source.prepare('INSERT INTO provider_secrets VALUES(?,?,?,?,?)').run(name,encrypted.iv,encrypted.tag,encrypted.ciphertext,now);
    }
    const productionAdmin = ['admin-1','Brett','brettd','salt:production','super-admin',1,now] as const;
    target.prepare('INSERT INTO team_members VALUES(?,?,?,?,?,?,?)').run(...productionAdmin);
    const productionYoco = seal(targetKey,'yoco-secret','sk_test_production');
    target.prepare('INSERT INTO provider_secrets VALUES(?,?,?,?,?)').run('yoco-secret',productionYoco.iv,productionYoco.tag,productionYoco.ciphertext,now);
    source.close(); target.close();

    const exported = spawnSync(process.execPath,[join(root,'scripts/export-operational-config.mjs')],{env:{...process.env,FOND_DB_PATH:sourcePath,FOND_CREDENTIALS_KEY:sourceKey},encoding:'utf8'});
    assert.equal(exported.status,0,exported.stderr);
    const imported = spawnSync(process.execPath,[join(root,'scripts/import-operational-config.mjs')],{env:{...process.env,FOND_DB_PATH:targetPath,FOND_CREDENTIALS_KEY:targetKey,FOND_PUBLIC_URL:'https://fond.mid-point.co.za',FOND_IMPORT_TARGET:'production'},input:exported.stdout,encoding:'utf8'});
    assert.equal(imported.status,0,imported.stderr);
    const result=JSON.parse(imported.stdout);
    assert.deepEqual(result.productionSafety,{onlinePaymentsEnabled:false,smsEnabled:true,whatsappEnabled:false,sandboxPaymentsDisabled:true});

    const verified = new DatabaseSync(targetPath);
    assert.equal((verified.prepare('SELECT count(*) n FROM menu_items').get() as {n:number}).n,1);
    assert.equal((verified.prepare('SELECT count(*) n FROM promotion_images').get() as {n:number}).n,1);
    assert.equal((verified.prepare('SELECT count(*) n FROM team_members').get() as {n:number}).n,2);
    assert.equal((verified.prepare('SELECT password_hash FROM team_members WHERE username=?').get('brettd') as {password_hash:string}).password_hash,'salt:production');
    assert.equal(open(verified,targetKey,'email-api'),'re_test_key');
    assert.equal(open(verified,targetKey,'twilio-auth-token'),'a'.repeat(32));
    assert.equal(open(verified,targetKey,'yoco-secret'),'sk_test_production');
    const trading=JSON.parse((verified.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}).value);
    assert.equal(trading.smsEnabled,true); assert.equal(trading.whatsappEnabled,false); assert.equal(trading.onlinePaymentsEnabled,false); assert.equal(trading.allowTestPayments,false);
    assert.equal((verified.prepare('SELECT count(*) n FROM app_documents WHERE key=?').get('twilio-config') as {n:number}).n,0);
    verified.close();
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
