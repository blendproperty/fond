import { after } from 'next/server';
import { validRequestOrigin } from '@/lib/request-origin';
import { HubError, submitHubRequest, notifyHubRequest } from '@/lib/hub-store';
const headers = {'Cache-Control':'no-store'};
export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return Response.json({message:'Invalid origin.'},{status:403,headers});
  try {
    const raw = await request.text(); if (raw.length > 10000) return Response.json({message:'Request too large.'},{status:413,headers});
    const input = JSON.parse(raw); if (!input || typeof input !== 'object') throw new HubError('Enter your request details.');
    const id = submitHubRequest(input, request.headers.get('Idempotency-Key') ?? '');
    after(() => notifyHubRequest(id)); return Response.json({id},{status:201,headers});
  } catch (e) { return Response.json({message:e instanceof HubError ? e.message : 'Your request could not be saved. Please try again or contact the team.'},{status:e instanceof HubError ? 400 : 503,headers}); }
}
