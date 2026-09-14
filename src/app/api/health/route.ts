import { getDb } from '@/lib/db';

export function GET() {
  try {
    getDb().prepare('SELECT 1').get();
    return Response.json({status:'ok',application:'fond',mode:'ordering',liveOrdering:true,payments:'in-person'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({status:'unavailable',application:'fond'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
