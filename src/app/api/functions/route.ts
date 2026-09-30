import {after} from 'next/server';
import {validRequestOrigin} from '@/lib/request-origin';
import {HubError} from '@/lib/hub-store';
import {bookedFunctionDates,submitFunction,notifyFunction} from '@/lib/function-store';
const headers={'Cache-Control':'no-store'};
export function GET(){return Response.json({bookedDates:bookedFunctionDates()},{headers});}
export async function POST(request:Request){if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});try{const raw=await request.text();if(raw.length>10000)return Response.json({message:'Request too large.'},{status:413,headers});const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new HubError('Enter your function details.');const id=submitFunction(body,request.headers.get('Idempotency-Key')??'');after(()=>notifyFunction(id));return Response.json({id,status:'pending'},{status:201,headers});}catch(e){return Response.json({message:e instanceof HubError?e.message:'Unable to save. Please try again.'},{status:e instanceof HubError?400:503,headers});}}
