import { after } from 'next/server';
import { hubActor } from '@/lib/hub-auth';
import { validRequestOrigin } from '@/lib/request-origin';
import { HubError, serviceOf, listEvents, listRequests, saveEvent, updateRequest, bookingUrl, saveBookingUrl, notifyHubRequest } from '@/lib/hub-store';
const headers = {'Cache-Control':'no-store'};
export async function GET(request: Request) {
  const who = await hubActor(); if (!who) return Response.json({message:'Sign in with your Hub team account.'},{status:401,headers});
  const service = new URL(request.url).searchParams.get('service');
  if (!service) return Response.json({services:who.services},{headers});
  if (!who.services.includes(service as 'gym'|'padel')) return Response.json({message:'Access denied.'},{status:403,headers});
  const selected = serviceOf(service);
  return Response.json({services:who.services,events:listEvents(selected,false),requests:listRequests(selected,who.actor),bookingUrl:bookingUrl(selected),emailEnabled:process.env.MIDPOINT_HUB_EMAIL_ENABLED==='true'},{headers});
}
export async function POST(request: Request) {
  const who = await hubActor(); if (!who) return Response.json({message:'Sign in required.'},{status:401,headers});
  if (!validRequestOrigin(request)) return Response.json({message:'Invalid origin.'},{status:403,headers});
  try {
    const raw = await request.text(); if (raw.length > 12000) throw new HubError('Request too large.');
    const body = JSON.parse(raw), service = serviceOf(body.service);
    if (!who.services.includes(service)) return Response.json({message:'Access denied.'},{status:403,headers});
    if (body.action === 'event') saveEvent(service,body,who.actor);
    else if (body.action === 'status') updateRequest(service,String(body.id),body.status,who.actor);
    else if (body.action === 'booking') saveBookingUrl(service,body.url,who.actor);
    else if (body.action === 'retry') { const rows = listRequests(service,who.actor); if (!rows.some(r=>r.id===body.id)) throw new HubError('Request not found.'); after(()=>notifyHubRequest(String(body.id))); }
    else throw new HubError('Choose an action.');
    return Response.json({ok:true},{headers});
  } catch (e) { return Response.json({message:e instanceof HubError?e.message:'Unable to save. Please try again.'},{status:400,headers}); }
}
