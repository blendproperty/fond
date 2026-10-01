import {hubDb,HubError} from './hub-store';
import {audit} from './management';
import {GYM_DAYS,emptyGymHours,type GymHoursRow} from './gym-hours';
function db(){const db=hubDb();db.exec("CREATE TABLE IF NOT EXISTS gym_hours (id INTEGER PRIMARY KEY CHECK(id=1), schedule TEXT NOT NULL)");return db;}
export function gymHours():GymHoursRow[]{const row=db().prepare('SELECT schedule FROM gym_hours WHERE id=1').get() as {schedule:string}|undefined;return row?JSON.parse(row.schedule):emptyGymHours();}
export function saveGymHours(service:string,value:unknown,actor:string){
 if(service!=='gym')throw new HubError('Opening hours are for the Gym team.');
 if(!Array.isArray(value)||value.length!==GYM_DAYS.length)throw new HubError('Include every day and public holidays.');
 const schedule=value.map((raw,i)=>{if(!raw||raw.day!==GYM_DAYS[i]||!['unconfirmed','open','closed'].includes(raw.status))throw new HubError('Choose a valid day and status.');
 if(raw.status==='open'&&(!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.opens)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.closes)||raw.closes<=raw.opens))throw new HubError('Closing time must be after opening time.');
 return {day:GYM_DAYS[i],status:raw.status,opens:raw.status==='open'?raw.opens:'',closes:raw.status==='open'?raw.closes:''};});
 db().prepare('INSERT INTO gym_hours (id,schedule) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET schedule=excluded.schedule').run(JSON.stringify(schedule));audit(actor,'gym-opening-hours-updated','gym');
}
