export const GYM_DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Public holidays'] as const;
export type GymHoursRow={day:string;status:'unconfirmed'|'open'|'closed';opens:string;closes:string};
export const emptyGymHours=():GymHoursRow[]=>GYM_DAYS.map(day=>({day,status:'unconfirmed',opens:'',closes:''}));
