import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {rmSync} from 'node:fs';
import {getDb,resetDbForTests} from '../src/lib/db';
import {settings} from '../src/lib/management';

test('managed hosts adopt the approved kitchen and Food Truck closes once and preserve later admin edits',()=>{
  const path=join(tmpdir(),`fond-kitchen-hours-${randomUUID()}.sqlite`);
  const priorPath=process.env.FOND_DB_PATH,priorHost=process.env.FOND_HOST,priorUrl=process.env.FOND_PUBLIC_URL;
  try{
    process.env.FOND_DB_PATH=path;delete process.env.FOND_HOST;delete process.env.FOND_PUBLIC_URL;resetDbForTests();
    const initial=getDb();
    initial.prepare('INSERT INTO app_documents VALUES (?,?,?)').run('trading',JSON.stringify({closingTime:'17:00',enforceHours:false}),new Date().toISOString());

    resetDbForTests();process.env.FOND_HOST='fond.mid-point.co.za';
    const migrated=getDb(),live=settings();
    assert.equal(live.closingTime,'18:30');assert.equal(live.foodTruckClosingTime,'15:30');assert.equal(live.enforceHours,true);
    assert.ok(migrated.prepare('SELECT 1 FROM app_documents WHERE key=?').get('kitchen-hours-2026-09-28-v1'));
    assert.ok(migrated.prepare('SELECT 1 FROM app_documents WHERE key=?').get('food-truck-hours-2026-09-28-v1'));
    assert.equal((migrated.prepare("SELECT count(*) n FROM admin_change_versions WHERE actor='release:kitchen-hours-2026-09-28' AND entity_id='trading'").get() as {n:number}).n,1);
    assert.equal((migrated.prepare("SELECT count(*) n FROM admin_change_versions WHERE actor='release:food-truck-hours-2026-09-28' AND entity_id='trading'").get() as {n:number}).n,1);

    migrated.prepare('UPDATE app_documents SET value=?,updated_at=? WHERE key=?').run(JSON.stringify({closingTime:'19:00',foodTruckClosingTime:'16:00',enforceHours:true}),new Date().toISOString(),'trading');
    resetDbForTests();
    assert.equal(settings().closingTime,'19:00');assert.equal(settings().foodTruckClosingTime,'16:00');
    assert.equal((getDb().prepare("SELECT count(*) n FROM admin_change_versions WHERE actor='release:kitchen-hours-2026-09-28'").get() as {n:number}).n,1);
    assert.equal((getDb().prepare("SELECT count(*) n FROM admin_change_versions WHERE actor='release:food-truck-hours-2026-09-28'").get() as {n:number}).n,1);
  }finally{
    resetDbForTests();
    if(priorPath==null)delete process.env.FOND_DB_PATH;else process.env.FOND_DB_PATH=priorPath;
    if(priorHost==null)delete process.env.FOND_HOST;else process.env.FOND_HOST=priorHost;
    if(priorUrl==null)delete process.env.FOND_PUBLIC_URL;else process.env.FOND_PUBLIC_URL=priorUrl;
    rmSync(path,{force:true});rmSync(path+'-wal',{force:true});rmSync(path+'-shm',{force:true});
  }
});
