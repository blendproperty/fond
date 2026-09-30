import {cookies} from 'next/headers';
import {teamSession} from './team';
import {ADMIN_COOKIE,adminRole} from './admin-auth';
import {HUB_COOKIE} from './hub-auth';
import {STAFF_COOKIE} from './staff-auth';
export function teamAreas(role:string){return {fond:['manager','owner','super-admin'].includes(role),gym:['gym','owner','super-admin'].includes(role),padel:['padel','owner','super-admin'].includes(role),functions:['functions','owner','super-admin'].includes(role),staff:['staff','manager','owner','super-admin'].includes(role)};}
export async function teamIdentity(){const c=await cookies();for(const key of [HUB_COOKIE,ADMIN_COOKIE,STAFF_COOKIE]){const member=teamSession(c.get(key)?.value);if(member)return {name:member.name,role:member.role,areas:teamAreas(member.role)};}const role=adminRole(c.get(ADMIN_COOKIE)?.value);return role?{name:'Administrator',role,areas:teamAreas(role)}:null;}
