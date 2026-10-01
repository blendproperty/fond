import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
export const BLEND_DELIVERY_ENTRY='Blend Property Group | OnPoint Building · 2 Loerie';
const MARKER='blend-delivery-directory-2026-10-01-v1';

// Apply the requested addition once to persisted directories as well as defaults.
// An administrator can subsequently remove or change it without it reappearing.
export function migrateBlendDeliveryDirectory(db:DatabaseSync){
  db.exec('BEGIN IMMEDIATE');
  try{
    if(!db.prepare('SELECT 1 FROM app_documents WHERE key=?').get(MARKER)){
      const row=db.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}|undefined;
      const before=row?JSON.parse(row.value):null;
      const locations=before?.deliveryLocations;
      const now=new Date().toISOString(),actor='release:blend-delivery-directory-2026-10-01';
      if(Array.isArray(locations)&&!locations.includes(BLEND_DELIVERY_ENTRY)){
        const after={...before,deliveryLocations:[...locations,BLEND_DELIVERY_ENTRY]};
        db.prepare('UPDATE app_documents SET value=?,updated_at=? WHERE key=?').run(JSON.stringify(after),now,'trading');
        db.prepare('INSERT INTO admin_change_versions (id,actor,area,entity_id,action,before_json,after_json,reversible,rolled_back_by,rolled_back_at,created_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?)').run(randomUUID(),actor,'document','trading','update',JSON.stringify(before),JSON.stringify(after),1,now);
        db.prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,'save','trading',now);
      }
      db.prepare('INSERT INTO app_documents VALUES (?,?,?)').run(MARKER,JSON.stringify('applied'),now);
    }
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
