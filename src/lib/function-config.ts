export const FUNCTION_CUISINES = ['Buffet','Seated dinner','Canapés','Family style','Picnic','Braai'] as const;
export const FUNCTION_ENQUIRY_CONTEXTS={'fond-space':'A gathering in the FOND dining space','padel-team-day':'A gathering with padel arranged separately'} as const;
export function saToday(){return new Date(Date.now()+2*3600000).toISOString().slice(0,10);}
export function validFunctionDate(value:unknown):value is string {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const time=Date.parse(value+'T12:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value&&value>=saToday()&&time<Date.now()+2*366*86400000;}
